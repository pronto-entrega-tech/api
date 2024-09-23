import { Prisma } from "@prisma/client";
import { fail } from "assert";
import { DiscountType } from "~/items/constants/discount-type";
import { ItemsRepository } from "~/repositories/items/items.repository";
import { OrderItemDto } from "../create-order/create-order.dto";
import { match, P } from "ts-pattern";

type ItemWithPrice = Pick<
  ItemsRepository.ItemById,
  | "discount_type"
  | "discount_value_1"
  | "discount_value_2"
  | "discount_max_per_client"
  | "item_id"
> &
  Pick<OrderItemDto, "price">;

export function getItemTotalWithOff(item: ItemWithPrice, quantity: number) {
  {
    return item.discount_type === DiscountType.OneFree
      ? getWithOneOrMoreFree()
      : getWithDiscountPercentOrValue(item.discount_type);
  }

  function getWithOneOrMoreFree() {
    const minQuantity = +(item.discount_value_1 ?? missingValue1Fail());

    if (quantity < minQuantity) return item.price.times(quantity);

    const freeNumber = item.discount_value_2 ?? 1;
    const freeQuantity = Math.min(
      freeNumber * Math.trunc(quantity / minQuantity),
      item.discount_max_per_client ?? Infinity,
    );

    return item.price.times(quantity - freeQuantity);
  }

  function getWithDiscountPercentOrValue(
    discount_type:
      | "DISCOUNT_VALUE"
      | "DISCOUNT_PERCENT"
      | "DISCOUNT_PERCENT_ON_SECOND"
      | null,
  ) {
    if (item.discount_type === DiscountType.DiscountPercentOnSecond) {
      const minQuantity = item.discount_value_2 ?? 2;

      if (quantity < minQuantity) return item.price.times(quantity);
    }

    const price = match(discount_type)
      .with(P.union("DISCOUNT_PERCENT", "DISCOUNT_PERCENT_ON_SECOND"), () => {
        const one = new Prisma.Decimal(1);
        const off = item.discount_value_1 ?? missingValue1Fail();

        const newPricePercent = one.minus(off.dividedBy(100));

        return item.price.times(newPricePercent).toDP(2);
      })
      .with(
        "DISCOUNT_VALUE",
        () => item.discount_value_1 ?? missingValue1Fail(),
      )
      .with(null, () => item.price)
      .exhaustive();

    const _quantityWithOff = match(discount_type)
      .with(
        "DISCOUNT_PERCENT_ON_SECOND",
        () => quantity - ((item.discount_value_2 ?? 2) - 1),
      )
      .with(P.union("DISCOUNT_PERCENT", "DISCOUNT_VALUE", null), () => quantity)
      .exhaustive();

    const quantityWithOff = Math.min(
      _quantityWithOff,
      item.discount_max_per_client ?? Infinity,
    );

    const totalWithoutOff = item.price.times(quantity - quantityWithOff);
    const totalWithOff = price.times(quantityWithOff);

    return totalWithoutOff.plus(totalWithOff);
  }

  function missingValue1Fail() {
    return fail(`Missing discount_value_1 on item ${item.item_id}`);
  }
}
