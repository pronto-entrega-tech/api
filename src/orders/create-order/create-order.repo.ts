import { Prisma } from '@prisma/client';
import { NotFoundError } from '~/common/errors/not-found';
import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { prisma } from '~/common/prisma/prisma.service';
import { SaveOrderDto, CreateOrderDto as ClientData } from './create-order.dto';

export namespace CreateOrderRepo {
  export async function save({ items, ...data }: SaveOrderDto) {
    const orderItems = items.map(({ details, ...args }) =>
      Prisma.validator<Prisma.order_itemUncheckedCreateWithoutOrdersInput>()({
        details: { create: details },
        ...args,
      }),
    );

    return prisma.orders.create({
      data: {
        ...Prisma.validator<Prisma.ordersCreateManyInput>()(data),
        items: { create: orderItems },
      },
    });
  }

  export async function findCustomerCard(
    { customer_id }: ClientData,
    card_id: NonNullable<ClientData['card_id']>,
  ) {
    return prisma.customer_card
      .findUniqueOrThrow({
        where: { id_customer_id: { id: card_id, customer_id } },
      })
      .catch(prismaNotFound('Card'));
  }

  export async function findItems({
    market_id,
    items: clientItems,
  }: ClientData) {
    const itemsIds = clientItems.map((v) => v.item_id);

    const { city_slug } = await prisma.market
      .findUniqueOrThrow({ select: { city_slug: true }, where: { market_id } })
      .catch(prismaNotFound('Market'));

    const items = await prisma.item.findMany({
      select: {
        item_id: true,
        prod_id: true,
        market_price: true,
        is_kit: true,
        market: { select: { markup: true } },
        details: { select: { prod_id: true, quantity: true } },
        discount_type: true,
        discount_value_1: true,
        discount_value_2: true,
        discount_max_per_client: true,
      },
      where: { city_slug, item_id: { in: itemsIds } },
    });
    if (items.length !== itemsIds.length) throw new NotFoundError('Product(s)');

    return items;
  }

  export async function findMarket({ market_id }: ClientData) {
    return prisma.market
      .findFirstOrThrow({
        select: {
          delivery_fee: true,
          min_time: true,
          max_time: true,
        },
        where: {
          market_id,
          approved: true,
          in_debt: false,
          email: { not: null },
        },
      })
      .catch(prismaNotFound('Market'));
  }

  export async function lastMarketOrderId({ market_id }: ClientData) {
    const lastOrder = await prisma.orders.findFirst({
      select: { market_order_id: true },
      where: { market_id },
      orderBy: { market_order_id: 'desc' },
    });
    return lastOrder?.market_order_id ?? 0n;
  }
}
