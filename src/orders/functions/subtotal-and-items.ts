import { Decimal } from '@prisma/client/runtime';
import { fail } from 'assert';
import { pick } from '~/common/functions/pick';
import { DiscountType } from '~/items/constants/discount-type';
import { marketPriceToAppPrice } from '~/payments/functions/market-price-to-app-price';

import { CreateOrderPreDto, OrderItemDto } from '../dto/create.dto';
import { getItemTotalWithOff } from './item-total-with-off';

export function getSubtotalAndOrderItems({
  client,
  server,
}: CreateOrderPreDto) {
  const orderItems = [] as OrderItemDto[];

  const subtotal = client.items.reduce((subtotal, { item_id, quantity }) => {
    const item = server.items.find((v) => v.item_id === item_id);
    if (!item) throw new Error('item_ids are not equal');

    const price = marketPriceToAppPrice(item.market_price, item.market.markup);
    orderItems.push({
      price,
      quantity,
      ...pick(item, 'prod_id', 'is_kit', 'details'),
    });

    const discountValue = item.discount_type === DiscountType.DiscountValue && {
      discount_value_1: marketPriceToAppPrice(
        item.discount_value_1 ??
          fail(`discount_value_1 undefined, item_id ${item.item_id}`),
        item.market.markup,
      ),
    };
    const itemWithPrice = {
      ...item,
      price,
      ...(discountValue || {}),
    };
    return subtotal.plus(getItemTotalWithOff(itemWithPrice, quantity).toDP(2));
  }, new Decimal(0));

  return {
    subtotal,
    orderItems,
  };
}
