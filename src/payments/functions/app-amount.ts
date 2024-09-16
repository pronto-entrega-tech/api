import { Prisma } from "@prisma/client";
import { PRONTO_FEE } from "../../common/constants/app-fee";

export function getAppAmount(total: Prisma.Decimal) {
  return total.times(PRONTO_FEE).dividedBy(100).toDP(2);
}
