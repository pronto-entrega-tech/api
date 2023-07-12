import { describe, it, expect } from 'vitest';
import { getOneCustomerDebit } from './customer-debit';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { Decimal } from '@prisma/client/runtime';

type CreditLog = OrdersRepository.CreditLog;
type Output = ReturnType<typeof getOneCustomerDebit>;

const market_id = 'market_id';
const debit_market_id = market_id;

const base = {
  market_id,
  customer_debit: null,
  credit_used: null,
  debit_market_id: null,
  debit_amount: null,
};

const from = (i: Partial<CreditLog>[]) => ({
  to: (o: Output) => {
    const res = getOneCustomerDebit(i.map((v) => ({ ...base, ...v })));

    expect(res).toEqual(o);
  },
});

describe(`${getOneCustomerDebit.name} (Debit)`, () => {
  it('given debit, will pay more', () =>
    from([{ customer_debit: new Decimal(-10) }]).to({
      debit_market_id,
      debit_amount: new Decimal(10),
    }));

  it('given payed debit, will not pay more', () =>
    from([
      { customer_debit: new Decimal(-10) },
      { debit_market_id, debit_amount: new Decimal(10) },
    ]).to(undefined));

  it('given it payed debit that not exist, will not pay more', () =>
    from([{ debit_market_id, debit_amount: new Decimal(10) }]).to(undefined));
});

describe(`${getOneCustomerDebit.name} (Credit)`, () => {
  it('given credit, will not pay more', () =>
    from([{ customer_debit: new Decimal(10) }]).to(undefined));

  it('given used credit, will not pay more', () =>
    from([
      { customer_debit: new Decimal(10) },
      { credit_used: new Decimal(10) },
    ]).to(undefined));

  it('given more credit used than it has, will pay more', () =>
    from([
      { customer_debit: new Decimal(10) },
      { credit_used: new Decimal(11) },
    ]).to({
      debit_market_id,
      debit_amount: new Decimal(1),
    }));
});

describe(`${getOneCustomerDebit.name} (Credit & Debit)`, () => {
  it('given more credit than debit, will not pay more', () =>
    from([
      { customer_debit: new Decimal(10) },
      { customer_debit: new Decimal(-5) },
    ]).to(undefined));

  it('given less credit than debit, will pay more', () =>
    from([
      { customer_debit: new Decimal(10) },
      { customer_debit: new Decimal(-15) },
    ]).to({ debit_market_id, debit_amount: new Decimal(5) }));
});
