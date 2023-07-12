import { Injectable } from '@nestjs/common';
import { customer, customer_address, customer_card } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import cuid from 'cuid';
import { AlreadyExistError } from '~/common/errors/already-exist';
import { NotFoundError } from '~/common/errors/not-found';
import { TestPropertyError } from '~/common/errors/test-property';
import { SaveCardDto } from '~/customers/dto/create-card.dto';
import { SaveCustomerDto } from '~/customers/dto/create.dto';
import { UpdateCustomerDto } from '~/customers/dto/update.dto';
import { UpdateCardDto } from '~/customers/dto/update-card.dto';

@Injectable()
export class InMemoryCustomersRepository {
  private readonly customers = [] as customer[];
  private readonly addresses = new Map<string, customer_address[]>();

  readonly cards = new InMemoryCustomerCardsRepository();

  async create(dto: SaveCustomerDto) {
    if (!dto.customer_id) throw new TestPropertyError('customer_id');

    if (this.customers.find((c) => c.email === dto.email))
      throw new AlreadyExistError('Customer', ['email']);

    const { created_at, customer_id, provider, ..._dto } = dto;
    this.customers.push({
      document: null,
      phone: null,
      asaas_id: null,
      debit: null,
      ..._dto,
      customer_id,
      created_at: created_at ?? new Date(),
      social_provider: provider ?? null,
    });
    return this.customers.at(-1) as customer;
  }

  async exist(customer_id: string) {
    const i = this.customers.findIndex(
      (c) => c.customer_id === customer_id && c.email !== null,
    );
    return i >= 0;
  }

  async findId(email) {
    const customer = this.customers.find((c) => c.email === email);
    return customer?.customer_id;
  }

  async findPayerId(customer_id: string) {
    const customer = this.customers.find((c) => c.customer_id === customer_id);
    if (!customer) throw new NotFoundError('Customer');

    return customer.asaas_id ?? undefined;
  }

  async findOne(customer_id: string) {
    const customer = this.customers.find(
      (c) => c.customer_id === customer_id && c.email,
    );
    if (!customer) throw new NotFoundError('Customer');

    return { ...customer, addresses: this.addresses.get(customer_id) ?? [] };
  }

  async update(customer_id: string, dto: UpdateCustomerDto) {
    const i = this.customers.findIndex((c) => c.customer_id === customer_id);
    if (i < 0) throw new NotFoundError('Customer');

    const customer = { ...this.customers[i], ...dto };
    this.customers[i] = customer;

    return customer;
  }

  async updatePayerId(customer_id: string, payer_id: string) {
    const i = this.customers.findIndex((c) => c.customer_id === customer_id);
    if (i < 0) throw new NotFoundError('Customer');

    return (this.customers[i] = { ...this.customers[i], asaas_id: payer_id });
  }

  async updateDebit(customer_id: string, debit: Decimal.Value) {
    const i = this.customers.findIndex((c) => c.customer_id === customer_id);
    if (i < 0) throw new NotFoundError('Customer');

    return (this.customers[i] = {
      ...this.customers[i],
      debit: new Decimal(debit),
    });
  }

  async delete(customer_id: string) {
    const i = this.customers.findIndex((c) => c.customer_id === customer_id);
    if (i < 0) throw new NotFoundError('Customer');

    this.addresses.delete(customer_id);

    const customer = {
      ...this.customers[i],
      name: '[Apagado]',
      email: null,
      document: null,
      phone: null,
    };
    this.customers[i] = customer;

    return { ...customer, addresses: [] };
  }
}

class InMemoryCustomerCardsRepository {
  private readonly cards = [] as customer_card[];

  async create(dto: SaveCardDto) {
    this.cards.push({ nickname: null, ...dto, id: dto.id ?? cuid() });
    return this.cards.at(-1);
  }

  async findMany(customer_id: string) {
    return this.cards.filter((c) => c.customer_id === customer_id);
  }

  async update(customer_id: string, card_id: string, dto: UpdateCardDto) {
    const i = this.cards.findIndex(
      (c) => c.id === card_id && c.customer_id === customer_id,
    );
    if (i < 0) throw new NotFoundError('Card');

    return (this.cards[i] = { ...this.cards[i], ...dto });
  }

  async delete(customer_id: string, card_id: string) {
    const i = this.cards.findIndex(
      (c) => c.id === card_id && c.customer_id === customer_id,
    );
    if (i < 0) throw new NotFoundError('Card');

    return this.cards.splice(i, 1)[0];
  }
}
