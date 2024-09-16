import { Prisma } from '@prisma/client';
import { format } from 'util';
import { getAppAmount } from './app-amount';
import { describe, expect, it } from 'vitest';

const from = (i: { total: number }) => ({
  to: (o: { appAmount: number }) => {
    const assert = () => {
      const res = getAppAmount(new Prisma.Decimal(i.total));

      expect(+res).toEqual(o.appAmount);
    };
    return [format('%o => %o', i, o), assert] as const;
  },
});

describe(getAppAmount.name, () => {
  it(...from({ total: 100 }).to({ appAmount: 12 }));
  it(...from({ total: 10 }).to({ appAmount: 1.2 }));
  it(...from({ total: 10.6 }).to({ appAmount: 1.27 }));
  it(...from({ total: 10.4 }).to({ appAmount: 1.25 }));
});
