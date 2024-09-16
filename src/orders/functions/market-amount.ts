import { Prisma } from "@prisma/client";
import { PRONTO_FEE, PRONTO_FEE_IN_APP } from "~/common/constants/app-fee";

export function getMarketAmount(
  amount: Prisma.Decimal,
  fee: Prisma.Decimal,
  inApp: boolean,
) {
  const marketPercent = 100 - (inApp ? PRONTO_FEE_IN_APP : PRONTO_FEE);

  const subAmount = amount.dividedBy(100).times(marketPercent);

  return subAmount.plus(fee).toDP(2);
}
