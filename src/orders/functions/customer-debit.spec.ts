import { describe, it, expect } from "vitest";
import { OneCustomerDebit } from "./customer-debit";
import { Prisma } from "@prisma/client";

type Output = ReturnType<typeof OneCustomerDebit.calc>;

const market_id = "market_id";
const debit_market_id = market_id;

const base = {
  market_id,
  customer_debit: null,
  credit_used: null,
  debit_market_id: null,
  debit_amount: null,
};

const from = (i: Partial<OneCustomerDebit.CreditLogs[number]>[]) => ({
  to: (o: Output) => {
    const res = OneCustomerDebit.calc(i.map((v) => ({ ...base, ...v })));

    expect(res).toEqual(o);
  },
});

describe(`OneCustomerDebit (Debit)`, () => {
  it("given debit, will pay more", () =>
    from([{ customer_debit: new Prisma.Decimal(-10) }]).to({
      debit_market_id,
      debit_amount: new Prisma.Decimal(10),
    }));

  it("given payed debit, will not pay more", () =>
    from([
      { customer_debit: new Prisma.Decimal(-10) },
      { debit_market_id, debit_amount: new Prisma.Decimal(10) },
    ]).to(undefined));

  it("given it payed debit that not exist, will not pay more", () =>
    from([{ debit_market_id, debit_amount: new Prisma.Decimal(10) }]).to(
      undefined,
    ));
});

describe(`OneCustomerDebit (Credit)`, () => {
  it("given credit, will not pay more", () =>
    from([{ customer_debit: new Prisma.Decimal(10) }]).to(undefined));

  it("given used credit, will not pay more", () =>
    from([
      { customer_debit: new Prisma.Decimal(10) },
      { credit_used: new Prisma.Decimal(10) },
    ]).to(undefined));

  it("given more credit used than it has, will pay more", () =>
    from([
      { customer_debit: new Prisma.Decimal(10) },
      { credit_used: new Prisma.Decimal(11) },
    ]).to({
      debit_market_id,
      debit_amount: new Prisma.Decimal(1),
    }));
});

describe(`OneCustomerDebit (Credit & Debit)`, () => {
  it("given more credit than debit, will not pay more", () =>
    from([
      { customer_debit: new Prisma.Decimal(10) },
      { customer_debit: new Prisma.Decimal(-5) },
    ]).to(undefined));

  it("given less credit than debit, will pay more", () =>
    from([
      { customer_debit: new Prisma.Decimal(10) },
      { customer_debit: new Prisma.Decimal(-15) },
    ]).to({ debit_market_id, debit_amount: new Prisma.Decimal(5) }));
});
