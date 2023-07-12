import { Decimal } from '@prisma/client/runtime';
import { PRONTO_FEE } from '../../common/constants/app-fee';

export function getAppAmount(total: Decimal) {
  return total.times(PRONTO_FEE).dividedBy(100).toDP(2);
}
