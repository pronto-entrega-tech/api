import { Prisma } from '@prisma/client';
import { expect, describe, it } from 'vitest';
import { DiscountType } from '~/items/constants/discount-type';
import { getItemTotalWithOff } from './item-total-with-off';

type Item = Parameters<typeof getItemTotalWithOff>[0];

const itemBase: Item = {
  price: new Prisma.Decimal(10),
  discount_type: null,
  discount_value_1: null,
  discount_value_2: null,
  discount_max_per_client: null,
  item_id: 'itemId',
};

const quantity = 10;

const assert = ({
  result,
  ...itemDiscount
}: { result: number } & Partial<Item>) => {
  const res = getItemTotalWithOff({ ...itemBase, ...itemDiscount }, quantity);

  expect(+res).toEqual(result);
};

describe(getItemTotalWithOff.name, () => {
  it('without discount', () =>
    assert({
      result: 100,
    }));
  it('with DiscountPercent', () =>
    assert({
      discount_type: DiscountType.DiscountPercent,
      discount_value_1: new Prisma.Decimal(10),
      result: 90,
    }));
  it('with DiscountPercent, maximum 5', () =>
    assert({
      discount_type: DiscountType.DiscountPercent,
      discount_value_1: new Prisma.Decimal(10),
      discount_max_per_client: 5,
      result: 95,
    }));
  it('with DiscountPercentOnSecond, sufficient minimum', () =>
    assert({
      discount_type: DiscountType.DiscountPercentOnSecond,
      discount_value_1: new Prisma.Decimal(10),
      result: 90,
    }));
  it('with DiscountPercentOnSecond, insufficient minimum', () =>
    assert({
      discount_type: DiscountType.DiscountPercentOnSecond,
      discount_value_1: new Prisma.Decimal(10),
      discount_value_2: 11,
      result: 100,
    }));
  it('with DiscountPercentOnSecond, sufficient minimum, maximum 5', () =>
    assert({
      discount_type: DiscountType.DiscountPercentOnSecond,
      discount_value_1: new Prisma.Decimal(10),
      discount_max_per_client: 5,
      result: 95,
    }));
  it('with DiscountValue', () =>
    assert({
      discount_type: DiscountType.DiscountValue,
      discount_value_1: new Prisma.Decimal(5),
      result: 50,
    }));
  it('with DiscountValue, maximum 5', () =>
    assert({
      discount_type: DiscountType.DiscountValue,
      discount_value_1: new Prisma.Decimal(5),
      discount_max_per_client: 5,
      result: 75,
    }));
  it('with OneFree, sufficient minimum', () =>
    assert({
      discount_type: DiscountType.OneFree,
      discount_value_1: new Prisma.Decimal(10),
      result: 90,
    }));
  it('with OneFree, insufficient minimum', () =>
    assert({
      discount_type: DiscountType.OneFree,
      discount_value_1: new Prisma.Decimal(11),
      result: 100,
    }));
  it('with OneFree, 2 times the minimum', () =>
    assert({
      discount_type: DiscountType.OneFree,
      discount_value_1: new Prisma.Decimal(5),
      result: 80,
    }));
  it('with OneFree, 2 free', () =>
    assert({
      discount_type: DiscountType.OneFree,
      discount_value_1: new Prisma.Decimal(10),
      discount_value_2: 2,
      result: 80,
    }));
  it('with OneFree, 2 times the minimum, maximum 1', () =>
    assert({
      discount_type: DiscountType.OneFree,
      discount_value_1: new Prisma.Decimal(5),
      discount_max_per_client: 1,
      result: 90,
    }));
});
