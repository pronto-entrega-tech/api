import { Decimal } from '@prisma/client/runtime';

export function marketPriceToAppPrice(marketPrice: Decimal, markup: Decimal) {
  return marketPrice.times(markup.dividedBy(100).plus(1)).toDP(2);
}
