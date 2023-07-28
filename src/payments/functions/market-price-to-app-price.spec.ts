import { Decimal } from '@prisma/client/runtime';
import { format } from 'util';
import { marketPriceToAppPrice } from './market-price-to-app-price';
import { describe, expect, it } from 'vitest';

const from = (i: { marketPrice: number; markup: number }) => ({
  to: (o: { appPrice: number }) => {
    const assert = () => {
      const res = marketPriceToAppPrice(
        new Decimal(i.marketPrice),
        new Decimal(i.markup),
      );

      expect(+res).toEqual(o.appPrice);
    };
    return [format('%o => %o', i, o), assert] as const;
  },
});

describe(marketPriceToAppPrice.name, () => {
  it(...from({ marketPrice: 100, markup: 0 }).to({ appPrice: 100 }));
  it(...from({ marketPrice: 100, markup: 10 }).to({ appPrice: 110 }));
  it(...from({ marketPrice: 100.04, markup: 10 }).to({ appPrice: 110.04 }));
  it(...from({ marketPrice: 100.05, markup: 10 }).to({ appPrice: 110.06 }));
});
