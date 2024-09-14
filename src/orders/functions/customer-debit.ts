import { Decimal } from '@prisma/client/runtime';
import { prisma } from '~/common/prisma/prisma.service';
import { OrderStatus } from '../constants/order-status';
import { Prisma } from '@prisma/client';

export namespace CustomerBalance {
  export function readDB(customer_id: string) {
    return baseFindCreditLogs(customer_id, {
      debit_amount: true,
      customer_debit: true,
    });
  }

  export type CreditLogs = Awaited<ReturnType<typeof readDB>>;

  export function calc(creditLogs: CreditLogs) {
    return creditLogs.reduce(
      (current, v) =>
        current.plus(v.customer_debit ?? 0).plus(v.debit_amount ?? 0),
      new Decimal(0),
    );
  }
}

export namespace OneCustomerDebit {
  export function readDB(customer_id: string) {
    return baseFindCreditLogs(customer_id, {
      market_id: true,
      customer_debit: true,
      credit_used: true,
      debit_market_id: true,
      debit_amount: true,
    });
  }

  export type CreditLogs = Awaited<ReturnType<typeof readDB>>;

  /**
   * Return the first found of all customer debits per market.
   */
  export function calc(creditLogs: CreditLogs) {
    const credits = getCreditsPerMarket(creditLogs);
    const debit = findFirstDebit(credits);

    if (!debit) return;

    const [debit_market_id, debit_amount] = debit;
    return {
      debit_market_id,
      debit_amount: debit_amount?.negated(),
    };
  }

  function getCreditsPerMarket(creditLogs: CreditLogs) {
    const totalCredits = new Map<string, Decimal>();

    creditLogs.forEach((v) => {
      addCredit();
      addDebitIfHas();

      function addCredit() {
        const credit = totalCredits.get(v.market_id) ?? new Decimal(0);
        totalCredits.set(
          v.market_id,
          credit.plus(v.customer_debit ?? 0).minus(v.credit_used ?? 0),
        );
      }

      function addDebitIfHas() {
        if (v.debit_market_id && v.debit_amount) {
          const debit = totalCredits.get(v.debit_market_id) ?? new Decimal(0);
          totalCredits.set(v.debit_market_id, debit.plus(v.debit_amount));
        }
      }
    });

    return totalCredits;
  }

  function findFirstDebit(credits: Map<string, Decimal>) {
    for (const credit of credits) {
      const [, amount] = credit;
      if (amount.isNegative()) return credit;
    }
  }
}

async function baseFindCreditLogs<T extends Prisma.ordersSelect>(
  customer_id: string,
  select: T,
) {
  return prisma.orders.findMany({
    select,
    where: {
      customer_id,
      OR: [
        {
          customer_debit: { not: null },
          status: OrderStatus.Completed,
        },
        {
          debit_amount: { not: null },
          status: { not: OrderStatus.Canceled },
        },
      ],
    },
  });
}
