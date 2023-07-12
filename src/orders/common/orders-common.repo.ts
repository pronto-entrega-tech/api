import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { prisma } from '~/common/prisma/prisma.service';
import { FullOrderId } from '../dto/full-order-id.dto';

export namespace OrdersCommonRepo {
  export async function confirmTokenData({ order_id, market_id }: FullOrderId) {
    return prisma.orders
      .findUniqueOrThrow({
        select: { market_order_id: true },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound('Order'));
  }

  export async function marketSupportInAppPayment(market_id: string) {
    const m = await prisma.market
      .findUniqueOrThrow({
        select: {
          pix_key: true,
          pix_key_type: true,
          bank_account: { select: { market_id: true } },
        },
        where: { market_id },
      })
      .catch(prismaNotFound('Market'));

    return !!(m.bank_account || (m.pix_key && m.pix_key_type));
  }

  export async function customerDocument(customer_id: string) {
    return prisma.customer
      .findUniqueOrThrow({
        select: { document: true },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
  }
}
