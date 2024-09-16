import { Prisma } from '@prisma/client';

export function marketPriceToAppPrice(
  marketPrice: Prisma.Decimal,
  markup: Prisma.Decimal,
) {
  return marketPrice.times(markup.dividedBy(100).plus(1)).toDP(2);
}
