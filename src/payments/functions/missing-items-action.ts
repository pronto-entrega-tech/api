import { Prisma } from '@prisma/client';
import { CustomerBalance } from '~/orders/functions/customer-debit';
import { createEffect } from '~/common/functions/effect';
import { OrdersRepository } from '~/repositories/orders/orders.repository';

type ServerData = OrdersRepository.CompleteData;
type CreditLogs = CustomerBalance.CreditLogs;

export function missingItemsAction(order: ServerData, creditLogs: CreditLogs) {
  const orderOverTotal = calcOrderOverTotal(order);
  const customerBalance = CustomerBalance.calc(creditLogs);

  const orderHasDebt = orderOverTotal.isNegative();
  const orderHasCredit = orderOverTotal.isPositive();
  const customerHasCredit = customerBalance.isPositive();

  return {
    orderOverTotal,
    customerBalance: customerBalance.plus(orderOverTotal),
    effect: (() => {
      if (orderHasDebt && customerHasCredit) {
        const orderDebit = orderOverTotal.negated();

        const transferValue = customerBalance.lessThan(orderDebit)
          ? +customerBalance
          : +orderDebit;

        return createEffect('transferToMarket', { transferValue });
      } else if (orderHasCredit) {
        const transferValue = +orderOverTotal;

        return createEffect('transferFromMarket', { transferValue });
      } else {
        return createEffect('none');
      }
    })(),
  };
}

function calcOrderOverTotal(order: ServerData) {
  return order.missing_items.reduce(
    (overTotal, { order_item: { price }, quantity }) =>
      overTotal.plus(price.times(quantity)),
    new Prisma.Decimal(0),
  );
}
