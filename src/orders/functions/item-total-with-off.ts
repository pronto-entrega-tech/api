import { Decimal } from '@prisma/client/runtime';
import { fail } from 'assert';
import { DiscountType } from '~/items/constants/discount-type';
import { ItemsRepository } from '~/repositories/items/items.repository';
import { OrderItemDto } from '../dto/create.dto';

type ItemWithPrice = Pick<
  ItemsRepository.ItemById,
  | 'discount_type'
  | 'discount_value_1'
  | 'discount_value_2'
  | 'discount_max_per_client'
  | 'item_id'
> &
  Pick<OrderItemDto, 'price'>;

export function getItemTotalWithOff(item: ItemWithPrice, quantity: number) {
  {
    return item.discount_type === DiscountType.OneFree
      ? getWithOneOrMoreFree()
      : getWithDiscountPercentOrValue();
  }

  function getWithOneOrMoreFree() {
    const minQuantity = +(item.discount_value_1 ?? missingValue1Fail());

    if (quantity < minQuantity) return item.price.times(quantity);

    const freeNumber = item.discount_value_2 ?? 1;
    const freeQuantity = max(freeNumber * Math.trunc(quantity / minQuantity));

    return item.price.times(quantity - freeQuantity);
  }

  function getWithDiscountPercentOrValue() {
    if (item.discount_type === DiscountType.DiscountPercentOnSecond) {
      const minQuantity = item.discount_value_2 ?? 2;

      if (quantity < minQuantity) return item.price.times(quantity);
    }

    const price = (() => {
      if (
        item.discount_type === DiscountType.DiscountPercent ||
        item.discount_type === DiscountType.DiscountPercentOnSecond
      ) {
        const one = new Decimal(1);
        const off = item.discount_value_1 ?? missingValue1Fail();

        const newPricePercent = one.minus(off.dividedBy(100));

        return item.price.times(newPricePercent).toDP(2);
      } else if (item.discount_type === DiscountType.DiscountValue) {
        return item.discount_value_1 ?? missingValue1Fail();
      } else {
        return item.price;
      }
    })();

    if (!item.discount_max_per_client) return price.times(quantity);

    const quantityWithOff = max(quantity);

    const totalWithoutOff = item.price.times(quantity - quantityWithOff);
    const totalWithOff = price.times(quantityWithOff);

    return totalWithoutOff.plus(totalWithOff);
  }

  function max(v: number) {
    const maxQuantity = item.discount_max_per_client ?? Infinity;
    return v < maxQuantity ? v : maxQuantity;
  }

  function missingValue1Fail() {
    return fail(`Missing discount_value_1 on item ${item.item_id}`);
  }
}
