import { Prisma } from '@prisma/client';
import { format } from 'util';
import { describe, it, expect } from 'vitest';
import { getMarketAmount } from './market-amount';

const from = (i: { total: number; fee: number; inApp: boolean }) => ({
  to: (o: { marketAmount: number }) => {
    const assert = () => {
      const res = getMarketAmount(
        new Prisma.Decimal(i.total),
        new Prisma.Decimal(i.fee),
        i.inApp,
      );

      expect(+res).toEqual(o.marketAmount);
    };
    return [format('%o => %o', i, o), assert] as const;
  },
});

describe(getMarketAmount.name, () => {
  it(...from({ total: 100, fee: 0, inApp: false }).to({ marketAmount: 88 }));
  it(...from({ total: 100, fee: 10, inApp: false }).to({ marketAmount: 98 }));
  it(...from({ total: 100, fee: 0, inApp: true }).to({ marketAmount: 85 }));
  it(...from({ total: 100, fee: 10, inApp: true }).to({ marketAmount: 95 }));
});
