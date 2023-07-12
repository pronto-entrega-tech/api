import { Decimal } from '@prisma/client/runtime';
import { PRONTO_FEE, PRONTO_FEE_IN_APP } from '~/common/constants/app-fee';

export function getMarketAmount(amount: Decimal, fee: Decimal, inApp: boolean) {
  const marketPercent = 100 - (inApp ? PRONTO_FEE_IN_APP : PRONTO_FEE);

  const subAmount = amount.dividedBy(100).times(marketPercent);

  return subAmount.plus(fee).toDP(2);
}
