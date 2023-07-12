import { Prisma } from '@prisma/client';
import { NotFoundError } from '~/common/errors/not-found';
import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { prisma } from '~/common/prisma/prisma.service';
import { OrderStatus } from '../constants/order-status';
import { SaveOrderDto } from './create-order.dto';

export namespace CreateOrderRepo {
  export async function save(dto: SaveOrderDto) {
    const { items, ...data } = dto;

    const orderItems = items.map(({ details, ...args }) =>
      Prisma.validator<Prisma.order_itemUncheckedCreateWithoutOrdersInput>()({
        details: { create: details },
        ...args,
      }),
    );

    const validDate = Prisma.validator<Prisma.ordersCreateManyInput>();

    return prisma.orders.create({
      data: {
        ...validDate(data),
        items: { create: orderItems },
      },
    });
  }

  export async function customerExist(customer_id: string) {
    const customer = await prisma.customer.findUnique({
      select: { email: true },
      where: { customer_id },
    });
    return !!customer?.email;
  }

  export async function findCustomerCard(customer_id: string, card_id: string) {
    return prisma.customer_card
      .findUniqueOrThrow({
        where: { id_customer_id: { id: card_id, customer_id } },
      })
      .catch(prismaNotFound('Card'));
  }

  export async function findCreditLogs(customer_id: string) {
    return prisma.orders.findMany({
      select: {
        market_id: true,
        customer_debit: true,
        credit_used: true,
        debit_market_id: true,
        debit_amount: true,
      },
      where: {
        customer_id,
        OR: [
          {
            customer_debit: { not: null },
            status: OrderStatus.Completed,
          },
          {
            debit_amount: { not: null },
            status: { not: OrderStatus.Canceled },
          },
        ],
      },
    });
  }

  export async function findItems(itemsIds: string[], market_id: string) {
    const { city_slug } = await prisma.market
      .findFirstOrThrow({ select: { city_slug: true }, where: { market_id } })
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

  export async function orderCreationData(market_id: string) {
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

  export async function lastMarketOrderId(market_id: string) {
    const lastOrder = await prisma.orders.findFirst({
      select: { market_order_id: true },
      where: { market_id },
      orderBy: { market_order_id: 'desc' },
    });
    return lastOrder?.market_order_id ?? 0n;
  }
}
