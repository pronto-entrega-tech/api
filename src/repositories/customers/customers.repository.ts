import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime';
import { NotFoundError } from '~/common/errors/not-found';
import {
  createNullEmailFilter,
  prismaAlreadyExist,
  prismaNotFound,
} from '~/common/prisma/handle-prisma-errors';
import { PrismaService } from '~/common/prisma/prisma.service';
import { SaveCardDto } from '~/customers/dto/create-card.dto';
import { SaveCustomerDto } from '~/customers/dto/create.dto';
import { UpdateCustomerDto } from '~/customers/dto/update.dto';
import { UpdateCardDto } from '~/customers/dto/update-card.dto';
import { CreateAddressDto } from '~/customers/dto/create-address.dto';
import { UpdateAddressDto } from '~/customers/dto/update-address.dto';
import { Prisma } from '@prisma/client';

const filterNullEmail = createNullEmailFilter(
  () => new NotFoundError('Customer'),
);

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  readonly addresses = new CustomerAddressesRepository(this.prisma);
  readonly cards = new CustomerCardsRepository(this.prisma);

  async create(dto: SaveCustomerDto) {
    const { provider, ..._dto } = dto;

    const validData = Prisma.validator<Prisma.customerCreateManyInput>();

    return this.prisma.$transaction(async (prisma) => {
      const { customer_id } = await prisma.customer
        .create({
          data: validData({ ..._dto, social_provider: provider }),
        })
        .catch(prismaAlreadyExist('Customer'));

      await this.createPartitions(prisma, customer_id, ['chat_message']);

      return { customer_id };
    });
  }

  async exist(customer_id: string) {
    const customer = await this.prisma.customer.findUnique({
      select: { email: true },
      where: { customer_id },
    });
    return !!customer?.email;
  }

  async findId(email: string) {
    const customer = await this.prisma.customer.findUnique({
      select: { customer_id: true },
      where: { email },
    });
    return customer?.customer_id;
  }

  async findPayerId(customer_id: string) {
    const customer = await this.prisma.customer
      .findUniqueOrThrow({
        select: { asaas_id: true },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
    return customer.asaas_id ?? undefined;
  }

  async findOne(customer_id: string) {
    const { email, ...res } = await this.prisma.customer
      .findUniqueOrThrow({
        select: {
          name: true,
          email: true,
          document: true,
          phone: true,
          debit: true,
        },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
    return filterNullEmail(email, res);
  }

  async update(customer_id: string, dto: UpdateCustomerDto) {
    const validData =
      Prisma.validator<Prisma.customerUncheckedUpdateManyInput>();

    return this.prisma.customer
      .update({
        data: validData(dto),
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
  }

  async updatePayerId(customer_id: string, payer_id: string) {
    await this.prisma.customer
      .update({
        data: { asaas_id: payer_id },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
  }

  async updateDebit(customer_id: string, debit: Decimal.Value) {
    await this.prisma.customer
      .update({
        data: { debit },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
  }

  async delete(customer_id: string) {
    return this.prisma.customer
      .update({
        data: {
          name: '[Apagado]',
          email: null,
          document: null,
          phone: null,
          addresses: { deleteMany: { customer_id } },
          cards: { deleteMany: { customer_id } },
          sessions: { deleteMany: { user_id: customer_id } },
        },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
  }

  /**
   * `SQL Injection Attack Risk!`
   * Don't pass user input here.
   */
  private async createPartitions(
    prisma: Prisma.TransactionClient,
    id: string,
    tables: (keyof typeof Prisma.ModelName)[],
  ) {
    // run in sequence to avoid deadlock
    for (const table of tables) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${table}_${id}" PARTITION OF ${table} FOR VALUES IN ('${id}')`,
      );
    }
  }
}

class CustomerAddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(customer_id: string, dto: CreateAddressDto) {
    const validData =
      Prisma.validator<Prisma.customer_addressCreateManyInput>();

    return this.prisma.customer_address
      .create({ data: validData({ customer_id, ...dto }) })
      .catch(prismaAlreadyExist('Address'));
  }

  async findMany(customer_id: string) {
    return this.prisma.customer_address.findMany({
      where: { customer_id },
    });
  }

  async update(customer_id: string, address_id: string, dto: UpdateAddressDto) {
    const validData =
      Prisma.validator<Prisma.customer_addressUncheckedUpdateManyInput>();

    return this.prisma.customer_address
      .update({
        data: validData(dto),
        where: { id_customer_id: { id: address_id, customer_id } },
      })
      .catch(prismaNotFound('Address'));
  }

  async delete(customer_id: string, address_id: string) {
    return this.prisma.customer_address
      .delete({
        where: { id_customer_id: { id: address_id, customer_id } },
      })
      .catch(prismaNotFound('Address'));
  }
}

class CustomerCardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: SaveCardDto) {
    const validData = Prisma.validator<Prisma.customer_cardCreateManyInput>();

    return this.prisma.customer_card
      .create({ data: validData(dto) })
      .catch(prismaAlreadyExist('Card'));
  }

  async findMany(customer_id: string) {
    return this.prisma.customer_card.findMany({
      where: { customer_id },
    });
  }

  async findOne(customer_id: string, card_id: string) {
    return this.prisma.customer_card
      .findUniqueOrThrow({
        where: { id_customer_id: { id: card_id, customer_id } },
      })
      .catch(prismaNotFound('Card'));
  }

  async update(customer_id: string, card_id: string, dto: UpdateCardDto) {
    const validData =
      Prisma.validator<Prisma.customer_cardUncheckedUpdateManyInput>();

    return this.prisma.customer_card
      .update({
        data: validData(dto),
        where: { id_customer_id: { id: card_id, customer_id } },
      })
      .catch(prismaNotFound('Card'));
  }

  async delete(customer_id: string, card_id: string) {
    return this.prisma.customer_card
      .delete({
        where: { id_customer_id: { id: card_id, customer_id } },
      })
      .catch(prismaNotFound('Card'));
  }
}
