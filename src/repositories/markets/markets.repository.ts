import { Injectable } from "@nestjs/common";
import { Prisma, business_hour, market, open_flip } from "@prisma/client";
import { MarketFilter } from "~/common/dto/filter.dto";
import { NotFoundError } from "~/common/errors/not-found";
import { Month } from "~/common/functions/month";
import { createQuery } from "~/common/functions/create-query";
import {
  createNullEmailFilter,
  prismaAlreadyExist,
  prismaNotFound,
} from "~/common/prisma/handle-prisma-errors";
import { PrismaService } from "~/common/prisma/prisma.service";
import { CreateBankAccountDto, SaveMarketDto } from "~/markets/dto/create.dto";
import {
  UpdateBankAccountDto,
  UpdateMarketDto,
} from "~/markets/dto/update.dto";
import { InvoicesRepository } from "./invoices/invoices.repository";
import { PayoutsRepository } from "./payouts/payouts.repository";
import { MarketSubsRepository } from "./subs/market-subs.repository";
import { pick } from "~/common/functions/pick";
import { orderBy } from "~/common/constants/order-by";
import {
  DeleteOpenFlipDto,
  CreateOpenFlipDto,
} from "~/markets/dto/open-flip.dto";
import { fail } from "assert";
import { BrasilApi } from "~/common/brasil-api/brasil-api";
const { sql } = Prisma;

const filterNullEmail = createNullEmailFilter(
  () => new NotFoundError("Market")
);

const publicFields = Prisma.validator<Prisma.marketSelect>()({
  market_id: true,
  thumbhash: true,
  name: true,
  city_slug: true,
  type: true,
  order_min: true,
  delivery_fee: true,
  min_time: true,
  max_time: true,
  schedule_mins_interval: true,
  schedule_max_days: true,
  rating: true,
  reviews_count_lately: true,
  reviews_count_total: true,
  info: true,
  document: true,
  address_street: true,
  address_number: true,
  address_district: true,
  address_city: true,
  address_state: true,
  address_complement: true,
  address_latitude: true,
  address_longitude: true,
});
const publicJoins = Prisma.validator<Prisma.marketSelect>()({
  payments_accepted: true,
  business_hours: true,
  special_days: true,
  open_flips: true,
});

const publicSelect = { ...publicFields, ...publicJoins };

type MarketFeed = Pick<
  market,
  | "market_id"
  | "city_slug"
  | "name"
  | "rating"
  | "min_time"
  | "max_time"
  | "delivery_fee"
> & { business_hours: business_hour };
const feedFields = pick(
  publicFields,
  "market_id",
  "thumbhash",
  "city_slug",
  "name",
  "rating",
  "min_time",
  "max_time",
  "delivery_fee",
  "address_latitude",
  "address_longitude"
);
const feedJoins = pick(publicJoins, "business_hours");
const feedSelectSql = Prisma.raw(
  [
    ...Object.keys(feedFields),
    ...Object.keys(feedJoins).map((v) => `coalesce(${v},'[]'::json) as ${v}`),
  ].join(", ")
);

export namespace MarketsRepository {
  export type OrderCreationData = Awaited<
    ReturnType<MarketsRepository["orderCreationData"]>
  >;
  export type DocumentData = Awaited<
    ReturnType<MarketsRepository["documentData"]>
  >;

  export type IdentificationData = Awaited<
    ReturnType<MarketsRepository["identificationData"]>
  >;
}

@Injectable()
export class MarketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  readonly subs = new MarketSubsRepository(this.prisma);
  readonly invoices = new InvoicesRepository(this.prisma);
  readonly payouts = new PayoutsRepository(this.prisma);

  async create(dto: SaveMarketDto) {
    const { now, bank_account, business_hours, ..._dto } = dto;
    const currentMonth = Month.from(now ?? new Date());
    const nextMonth = Month.next(currentMonth);

    Prisma.validator<Prisma.marketUncheckedCreateInput>()(_dto);
    const { market_id } = await this.prisma.market.create({
      data: {
        created_at: now,
        ..._dto,
        bank_account: { create: bank_account },
        business_hours: { create: business_hours },
        payouts: {
          create: [{ month: currentMonth }, { month: nextMonth }],
        },
      },
    });

    return market_id;
  }

  async update(market_id: string, dto: UpdateMarketDto) {
    const { business_hours, special_days, ..._dto } = dto;

    Prisma.validator<Prisma.marketUncheckedUpdateInput>()(_dto);
    return this.prisma.market
      .update({
        data: {
          ..._dto,
          business_hours: business_hours && {
            deleteMany: { market_id },
            create: business_hours,
          },
          special_days: special_days && {
            deleteMany: { market_id },
            create: special_days,
          },
        },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
  }

  async updateThumbhash(market_id: string, thumbhash: string) {
    return this.prisma.market
      .update({
        data: { thumbhash },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
  }

  async delete(market_id: string) {
    const deleteAll = { deleteMany: { market_id } };

    const [market] = await this.prisma
      .$transaction([
        this.prisma.market.update({
          data: {
            email: null,
            items: deleteAll,
            business_hours: deleteAll,
            special_days: deleteAll,
            sessions: { deleteMany: { user_id: market_id } },
          },
          where: { market_id },
        }),
        ...this.partitionDropper(this.prisma, market_id, [
          "item_activity",
          "review",
        ]),
      ])
      .catch(prismaNotFound("Market"));

    return market;
  }

  async checkIfExist(market_id: string) {
    await this.prisma.market
      .findUniqueOrThrow({
        select: { market_id: true },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
  }

  async findNotApproved() {
    return this.prisma.market.findMany({
      where: { approved: false },
    });
  }

  async approve(market_id: string) {
    await this.prisma.$transaction(async (prisma) => {
      const { city_slug } = await prisma.market
        .update({
          data: { approved: true },
          where: { market_id },
        })
        .catch(prismaNotFound("Market"));

      await this.createPartitions(prisma, market_id, [
        "orders",
        "order_item",
        "order_missing_item",
        "item_activity",
        "review",
      ]);
      await this.createPartitions(prisma, city_slug, ["item"]);
    });
  }

  findMany(
    city: string,
    filter: MarketFilter & { justIds?: false }
  ): Promise<MarketFeed[]>;
  findMany(
    city: string,
    filter: MarketFilter & { justIds: true }
  ): Promise<string[]>;
  async findMany(city: string, filter: MarketFilter & { justIds?: boolean }) {
    const { justIds, latLong, distance, query, order_by } = filter;
    const distanceInMeters = distance * 1000;
    const coords = (() => {
      if (!latLong) return undefined;

      const [lat, lng] = latLong.split(",");
      return { lat: +(lat ?? fail()), lng: +(lng ?? fail()) };
    })();

    const sqlQuery = createQuery({
      table: "market",
      select: justIds ? sql`market.market_id` : feedSelectSql,
      leftJoin: !justIds && [
        sql`(SELECT market_id, json_agg(json_build_object('days', days, 'open_time', open_time, 'close_time', close_time)) AS business_hours FROM business_hour h GROUP BY h.market_id) h USING (market_id)`,
        sql`(SELECT market_id, json_agg(json_build_object('date', date, 'reason_code', reason_code, 'reason_name', reason_name, 'open_time', open_time, 'close_time', close_time)) AS special_days FROM special_day s GROUP BY s.market_id) s USING (market_id)`,
      ],
      where: [
        sql`approved = true`,
        sql`in_debt = false`,
        sql`email IS NOT NULL`,
        sql`city_slug = ${city}`,
        coords &&
          sql`ST_DWithin(ST_POINT(${coords.lng}, ${coords.lat}), location::geography, ${distanceInMeters}::int, false)`,
        query &&
          sql`to_tsvector('portuguese', name) @@ plainto_tsquery('portuguese', ${query})`,
      ],
      orderBy:
        order_by !== orderBy.Default &&
        {
          [orderBy.Rating]: sql`rating`,
          [orderBy.Distance]: sql`min_time + max_time / 1000`,
          [orderBy.DeliveryTime]:
            coords && sql`ST_POINT(${coords.lng}, ${coords.lat}) <-> location`,
        }[order_by],
    });

    const res = await this.prisma.$queryRaw<MarketFeed[]>(sqlQuery);

    return justIds ? res.map((v) => v.market_id) : res;
  }

  async findOne(market_id: string) {
    return this.prisma.market
      .findFirstOrThrow({
        select: publicSelect,
        where: {
          market_id,
          approved: true,
          in_debt: false,
          email: { not: null },
        },
      })
      .catch(prismaNotFound("Market"));
  }

  async findProfile(market_id: string) {
    return this.prisma.market
      .findFirstOrThrow({
        select: {
          market_id: true,
          thumbhash: true,
          name: true,
          document: true,
          pix_key: true,
          pix_key_type: true,
          payments_accepted: true,
          order_min: true,
          delivery_fee: true,
          min_time: true,
          max_time: true,
          markup: true,
          business_hours: true,
          special_days: true,
          open_flips: true,
        },
        where: {
          market_id,
          email: { not: null },
        },
      })
      .catch(prismaNotFound("Market"));
  }

  async findReviews(market_id: string) {
    return this.prisma.market
      .findFirstOrThrow({
        select: {
          rating: true,
          reviews_count_lately: true,
          reviews_count_total: true,
          reviews: {
            select: {
              order_id: true,
              customer: { select: { name: true } },
              created_at: true,
              rating: true,
              complaint: true,
              message: true,
              response: true,
            },
            orderBy: { created_at: "desc" },
          },
        },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
  }

  async identificationData(market_id: string) {
    const { email, ...res } = await this.prisma.market
      .findFirstOrThrow({
        select: {
          name: true,
          email: true,
          document: true,
        },
        where: { market_id, email: { not: null } },
      })
      .catch(prismaNotFound("Market"));
    return filterNullEmail(email, res);
  }

  async documentData(document: string) {
    const data = await BrasilApi.cnpj(document);

    return {
      legalName: data.razao_social,
      phone: `${data.ddd_telefone_1}`.replace(/\D/g, ""),
      address: {
        street: data.logradouro,
        number: data.numero,
        district: data.bairro,
        city: data.municipio,
        state: data.uf,
        complement: data.complemento,
        postalCode: `${data.cep}`,
      },
    };
  }

  async orderCreationData(market_id: string) {
    return this.prisma.market
      .findFirstOrThrow({
        select: {
          delivery_fee: true,
          min_time: true,
          max_time: true,
        },
        where: {
          market_id,
          approved: true,
          in_debt: false,
          email: { not: null },
        },
      })
      .catch(prismaNotFound("Market"));
  }

  async findId(email: string) {
    const market = await this.prisma.market.findUnique({
      select: { market_id: true },
      where: { email },
    });
    return market?.market_id;
  }

  async findPayerId(market_id: string) {
    const market = await this.prisma.market
      .findUniqueOrThrow({
        select: { asaas_customer_id: true },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
    return market.asaas_customer_id;
  }

  async findRecipientId(market_id: string) {
    const account = await this.prisma.market
      .findUniqueOrThrow({
        select: { asaas_account_id: true },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
    return account.asaas_account_id;
  }

  async findRecipientKey(market_id: string) {
    const account = await this.prisma.market
      .findUniqueOrThrow({
        select: { asaas_account_key: true },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
    return account.asaas_account_key;
  }

  async updatePayerId(market_id: string, payer_id: string) {
    return this.prisma.market
      .update({
        data: { asaas_customer_id: payer_id },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
  }

  async updateRecipient(
    market_id: string,
    recipient: { id: string; key: string }
  ) {
    return this.prisma.market
      .update({
        data: {
          asaas_account_id: recipient.id,
          asaas_account_key: recipient.key,
        },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));
  }

  async hasInAppPaymentSupport(market_id: string) {
    const m = await this.prisma.market
      .findUniqueOrThrow({
        select: {
          pix_key: true,
          pix_key_type: true,
          bank_account: { select: { market_id: true } },
        },
        where: { market_id },
      })
      .catch(prismaNotFound("Market"));

    return !!(m.bank_account || (m.pix_key && m.pix_key_type));
  }

  async createOpenFlip(market_id: string, dto: CreateOpenFlipDto) {
    const validData = Prisma.validator<Prisma.open_flipUncheckedCreateInput>();

    return this.prisma.open_flip
      .create({ data: validData({ market_id, ...dto }) })
      .catch(prismaNotFound("Market"));
  }

  async deleteOpenFlip(market_id: string, dto: DeleteOpenFlipDto) {
    const validWhere = Prisma.validator<Partial<open_flip>>();

    return this.prisma.open_flip.deleteMany({
      where: validWhere({ market_id, ...dto }),
    });
  }

  async createBankAccount(market_id: string, dto: CreateBankAccountDto) {
    const validData =
      Prisma.validator<Prisma.bank_accountUncheckedCreateInput>();

    return this.prisma.bank_account
      .create({ data: validData({ market_id, ...dto }) })
      .catch(prismaAlreadyExist("Bank account"));
  }

  async updateBankAccount(market_id: string, dto: UpdateBankAccountDto) {
    const validData =
      Prisma.validator<Prisma.bank_accountUncheckedUpdateInput>();

    return this.prisma.bank_account
      .update({
        data: validData(dto),
        where: { market_id },
      })
      .catch(prismaNotFound("Bank account"));
  }

  /**
   * `SQL Injection Attack Risk!`
   * Don't pass user input here.
   */
  private async createPartitions(
    prisma: Prisma.TransactionClient,
    id: string,
    tables: (keyof typeof Prisma.ModelName)[]
  ) {
    // run in sequence to avoid deadlock
    for (const table of tables) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${table}_${id}" PARTITION OF ${table} FOR VALUES IN ('${id}')`
      );
    }
  }

  /**
   * `SQL Injection Attack Risk!`
   * Don't pass user input here.
   */
  private partitionDropper(
    prisma: Prisma.TransactionClient,
    id: string,
    tables: (keyof typeof Prisma.ModelName)[]
  ) {
    return tables.map((table) => {
      return prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}_${id}"`);
    });
  }
}
