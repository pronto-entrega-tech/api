import { Decimal } from '@prisma/client/runtime';
import { OrdersRepository } from '~/repositories/orders/orders.repository';

type CreditLog = OrdersRepository.CreditLog;

export function getCustomerCredit(creditLogs: CreditLog[]) {
  return creditLogs.reduce(
    (current, v) =>
      current.plus(v.customer_debit ?? 0).plus(v.debit_amount ?? 0),
    new Decimal(0),
  );
}

/**
 * Return the first found, of all debits per market.
 */
export function getOneCustomerDebit(creditLogs: CreditLog[]) {
  const credits = getCreditsPerMarket(creditLogs);

  const debit = [...credits].find(([, amount]) => amount.isNegative());
  if (!debit) return;

  const [debit_market_id, debit_amount] = debit;

  return {
    debit_market_id,
    debit_amount: debit_amount?.negated(),
  };
}

function getCreditsPerMarket(creditLogs: CreditLog[]) {
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
