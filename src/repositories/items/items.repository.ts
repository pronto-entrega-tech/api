import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isArray } from 'class-validator';
import { ItemFeedFilter } from '~/common/dto/filter.dto';
import { NotFoundError } from '~/common/errors/not-found';
import { BaseQuery } from '~/common/functions/create-query';
import { createQuery } from '~/common/functions/create-query';
import { pick } from '~/common/functions/pick';
import { omit } from '~/common/functions/omit';
import {
  prismaAlreadyExist,
  prismaNotFound,
} from '~/common/prisma/handle-prisma-errors';
import { PrismaService } from '~/common/prisma/prisma.service';
import { SaveItemDto, SaveKitDto } from '~/items/dto/create.dto';
import { ItemFeed, ItemMarketFeed, ItemOneFeed } from '~/items/dto/feed.dto';
import { FullItemId } from '~/items/dto/full-item-id.dto';
import { UpdateItemDto, UpdateKitDto } from '~/items/dto/update.dto';
import { getProductName } from '~/items/functions/product-name';
import { fail } from 'assert';
const { sql } = Prisma;

export type ActivityExtra = {
  item_name: string;
  market_id: string;
  market_sub_id?: string;
  product_code: bigint | null | undefined;
};

const marketSelectSql = sql`
item.item_id,
item.city_slug,
item.market_price as price,
item.stock,
item.unit_weight,
item.discount_type,
item.discount_value_1,
item.discount_value_2,
item.discount_max_per_client,
json_build_object(
  'code', products.code,
  'name', products.name,
  'brand', products.brand,
  'quantity', products.quantity
) AS product`;

const queryBase = (city: string, { marketSelect = false } = {}): BaseQuery => ({
  table: 'item',
  select: marketSelect
    ? marketSelectSql
    : sql`
item.item_id,
item.city_slug,
item.prod_id,
item.market_id,
coalesce(item.kit_name, products.name) as name,
products.brand,
coalesce(item.kit_quantity, products.quantity) AS quantity,
round(item.market_price * (1 + market.markup / 100), 2) AS price,
item.unit_weight,
item.is_kit,
coalesce(products.images_names, ARRAY[item.kit_image_name], ARRAY[]::text[]) as images_names,
item.discount_type,
CASE WHEN item.discount_type = 'DISCOUNT_VALUE'
  THEN round(item.discount_value_1 * (1 + market.markup / 100), 2)
  ELSE item.discount_value_1
END discount_value_1,
item.discount_value_2,
item.discount_max_per_client`,
  leftJoin: [
    sql`products ON item.prod_id = products.prod_id`,
    sql`market ON item.market_id = market.market_id`,
  ],
  where: sql`item.city_slug = ${city}`,
});

const queryBase2 = (city: string): BaseQuery => ({
  table: 'products',
  select: marketSelectSql,
  leftJoin: [
    sql`item ON products.prod_id = item.prod_id AND item.city_slug = ${city}`,
  ],
});

const getDiscountValues = (dto: any) =>
  pick(
    dto,
    'discount_type',
    'discount_value_1',
    'discount_value_2',
    'discount_max_per_client',
  );

export namespace ItemsRepository {
  export type ItemById = Awaited<
    ReturnType<ItemsRepository['findByIds']>
  >[number];
}

@Injectable()
export class ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: SaveItemDto) {
    const { name, brand, quantity, market_sub_id, ..._dto } = dto;
    const { city_slug, market_id, prod_id } = dto;

    const validData = Prisma.validator<Prisma.itemCreateManyInput>();
    const validActivity =
      Prisma.validator<Prisma.item_activityUncheckedCreateWithoutItemInput>();

    const { activities, ...item } = await this.prisma.item
      .create({
        include: { activities: true },
        data: {
          ...validData({
            ...omit(_dto, 'code'),
            /* kit_name: `${name} ${brand}`,
            kit_quantity: quantity, */
            city_slug,
            market_id,
            prod_id,
          }),
          activities: {
            create: validActivity({
              market_id,
              market_sub_id,
              action: 'CREATE',
              product_code: dto.code,
              item_name: getProductName({ name, brand, quantity }),
              new_price: dto.market_price,
              new_stock: dto.stock,
              new_unit_weight: dto.unit_weight,
              new_discount: getDiscountValues(dto),
            }),
          },
        },
      })
      .catch(prismaAlreadyExist('Item'));

    return { ...item, activity: activities[0] ?? fail() };
  }

  async createKit(dto: SaveKitDto) {
    const { market_sub_id, details, ..._dto } = dto;
    const { market_id } = dto;

    const validData = Prisma.validator<Prisma.itemCreateManyInput>();
    const validActivity =
      Prisma.validator<Prisma.item_activityUncheckedCreateWithoutItemInput>();

    return this.prisma.item.create({
      data: {
        ...validData({ ..._dto, is_kit: true }),
        details: { createMany: { data: details } },
        activities: {
          create: validActivity({
            market_id,
            market_sub_id,
            action: 'CREATE',
            item_name: dto.kit_name,
            new_price: dto.market_price,
            new_stock: dto.stock,
            new_unit_weight: dto.unit_weight,
            new_details: details.map((v) => ({
              ...v,
              prod_id: `${v.prod_id}`,
            })),
            new_discount: getDiscountValues(dto),
          }),
        },
      },
    });
  }

  async exist(
    market_id: string,
    city_slug: string,
    { prod_id, kit_name }: { prod_id?: bigint; kit_name?: string },
  ) {
    return !!(await this.prisma.item.count({
      where: { market_id, city_slug, prod_id, kit_name },
    }));
  }

  async findMany(
    city_slug: string,
    market?: string | string[],
    filter?: Pick<ItemFeedFilter, 'ids' | 'query' | 'categories'>,
  ) {
    const { ids, query, categories } = filter ?? {};

    const marketWhere = isArray(market)
      ? sql`market.market_id = ANY(${market})`
      : sql`market.market_id = ${market}`;

    const sqlQuery = createQuery({
      baseQuery: queryBase(city_slug),
      orderBy: sql`random()`,
      where: [
        market && marketWhere,
        ids && sql`item_id = ANY(${ids})`,
        categories && sql`category_id = ANY(${categories})`,
        query && sql`products.ts @@ plainto_tsquery('portuguese', ${query})`,
      ],
    });

    return this.prisma.$queryRaw<ItemFeed[]>(sqlQuery);
  }

  async findOne({ city_slug, item_id }: FullItemId) {
    const subQuery = createQuery({
      table: 'item_details',
      select: sql`
        item_id,
        json_agg(json_build_object(
          'name', CONCAT(p.name,' ',p.brand,' ',p.quantity),
          'quantity', item_details.quantity
        )) AS details
      `,
      leftJoin: sql`products p on item_details.prod_id = p.prod_id`,
      groupBy: sql`item_details.item_id`,
    });
    const query = createQuery({
      baseQuery: queryBase(city_slug),
      select: sql`coalesce(details,'[]'::json) as details`,
      leftJoin: sql`(${subQuery}) de USING (item_id)`,
      where: sql`item.item_id = ${item_id}`,
    });

    const [item] = await this.prisma.$queryRaw<ItemOneFeed[]>(query);
    if (!item) throw new NotFoundError('Item');

    return item;
  }

  async marketFindMany(market_id: string) {
    const m = await this.prisma.market.findUnique({
      select: { city_slug: true },
      where: { market_id },
    });
    if (!m?.city_slug) return [];

    const sqlQuery = createQuery({
      baseQuery: queryBase(m.city_slug, { marketSelect: true }),
      where: sql`market.market_id = ${market_id}`,
    });

    return this.prisma.$queryRaw<ItemMarketFeed[]>(sqlQuery);
  }

  async marketFindOneQuery(market_id: string, query: string) {
    const m = await this.prisma.market.findUnique({
      select: { city_slug: true },
      where: { market_id },
    });
    if (!m?.city_slug) return [];

    const isCode = query && /^\d+$/g.test(query);

    const sqlQuery = createQuery({
      baseQuery: queryBase2(m.city_slug),
      where: isCode
        ? sql`products.code = ${query}::bigint`
        : sql`products.ts @@ plainto_tsquery('portuguese', ${query})`,
    });

    return this.prisma.$queryRaw<ItemMarketFeed[]>(sqlQuery);
  }

  async marketFindOne({ item_id, city_slug }: FullItemId, market_id: string) {
    return this.prisma.item
      .findFirstOrThrow({
        select: { is_kit: true, kit_name: true, product: true },
        where: { item_id, city_slug, market_id },
      })
      .catch(prismaNotFound('Item'));
  }

  async findByIds(itemIds: string[], market_id: string) {
    const { city_slug } = await this.prisma.market
      .findFirstOrThrow({ select: { city_slug: true }, where: { market_id } })
      .catch(prismaNotFound('Market'));

    return this.prisma.item.findMany({
      select: {
        item_id: true,
        prod_id: true,
        market_price: true,
        is_kit: true,
        market: { select: { markup: true } },
        details: { select: { prod_id: true, quantity: true } },
        discount_type: true,
        discount_value_1: true,
        discount_value_2: true,
        discount_max_per_client: true,
      },
      where: { city_slug, item_id: { in: itemIds } },
    });
  }

  async update(
    { item_id, city_slug }: FullItemId,
    dto: UpdateItemDto,
    { product_code, item_name, market_id, market_sub_id }: ActivityExtra,
  ) {
    const validData = Prisma.validator<Prisma.itemUncheckedUpdateManyInput>();

    const [item, activity] = await this.prisma
      .$transaction([
        this.prisma.item.update({
          data: validData(dto),
          where: { item_id_city_slug: { item_id, city_slug } },
        }),
        this.prisma.item_activity.create({
          data: {
            market_id,
            market_sub_id,
            action: 'UPDATE',
            product_code,
            item_name,
            new_price: dto.market_price,
            new_stock: dto.stock,
            new_unit_weight: dto.unit_weight,
            new_discount: getDiscountValues(dto),
          },
        }),
      ])
      .catch(prismaNotFound('Item'));

    return { ...item, activity };
  }

  async updateKit(
    { item_id, city_slug }: FullItemId,
    dto: UpdateKitDto,
    { product_code, item_name, market_id, market_sub_id }: ActivityExtra,
  ) {
    const { details, ..._dto } = dto;

    const validData = Prisma.validator<Prisma.itemUncheckedUpdateManyInput>();
    const validDetails =
      Prisma.validator<Prisma.item_detailsUncheckedCreateWithoutItemInput[]>();

    const [item, activity] = await this.prisma
      .$transaction([
        this.prisma.item.update({
          data: {
            ...validData(_dto),
            details: details && {
              deleteMany: { item_id },
              create: validDetails(details),
            },
          },
          where: { item_id_city_slug: { item_id, city_slug } },
        }),
        this.prisma.item_activity.create({
          data: {
            market_id,
            market_sub_id,
            action: 'UPDATE',
            product_code,
            item_name: item_name ?? 'Sem nome',
            new_price: dto.market_price,
            new_stock: dto.stock,
            new_unit_weight: dto.unit_weight,
            new_details: details as any,
            new_discount: getDiscountValues(dto),
          },
        }),
      ])
      .catch(prismaNotFound('Item'));

    return { ...item, activity };
  }

  async delete(
    { item_id, city_slug }: FullItemId,
    { product_code, item_name, market_id, market_sub_id }: ActivityExtra,
  ) {
    const [, item] = await this.prisma
      .$transaction([
        this.prisma.item_activity.updateMany({
          data: { item_id: null, city_slug: null },
          where: { item_id, city_slug },
        }),
        this.prisma.item.delete({
          include: { details: true },
          where: { item_id_city_slug: { item_id, city_slug } },
        }),
        this.prisma.item_activity.create({
          data: {
            market_id,
            market_sub_id,
            action: 'DELETE',
            item_name,
            product_code,
          },
        }),
      ])
      .catch(prismaNotFound('Item'));

    return item;
  }

  async findActivities(
    market_id: string,
    { fullId, query }: { fullId?: FullItemId; query?: string },
  ) {
    const isCode = query && /^\d+$/g.test(query);

    const sqlQuery = createQuery({
      table: 'item_activity',
      select: sql`*`,
      where: [
        sql`market_id = ${market_id}`,
        fullId &&
          sql`item_id = ${fullId.item_id} && city_slug = ${fullId.city_slug}`,
        query &&
          (isCode
            ? sql`product_code = ${query}::bigint`
            : sql`to_tsvector('portuguese', item_name) @@ plainto_tsquery('portuguese', ${query})`),
      ],
      orderBy: sql`occurred_at DESC`,
    });

    return this.prisma.$queryRaw<ItemMarketFeed[]>(sqlQuery);
  }
}
