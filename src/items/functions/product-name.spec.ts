import { getProductName } from './product-name';
import { format } from 'util';

const from = (i: Parameters<typeof getProductName>[0]) => ({
  to: (o: { name: string }) => {
    const assert = () => {
      const res = getProductName(i);

      expect(+res).toEqual(o.name);
    };
    return [format('%o => %o', i, o), assert] as const;
  },
});

const nil = null; // Just to make the indentation nice

describe(getProductName.name, () => {
  it(...from({ name: 'A', brand: 'B', quantity: 'C' }).to({ name: 'A B C' }));
  it(...from({ name: 'A', brand: 'B', quantity: nil }).to({ name: 'A B' }));
  it(...from({ name: 'A', brand: nil, quantity: 'C' }).to({ name: 'A C' }));
  it(...from({ name: 'A', brand: nil, quantity: nil }).to({ name: 'A' }));
});
