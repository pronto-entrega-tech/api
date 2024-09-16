import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prismaNotFound } from "~/common/prisma/handle-prisma-errors";
import { PrismaService } from "~/common/prisma/prisma.service";
import { OrderStatus } from "~/orders/constants/order-status";
import { FindManyOrdersDto } from "~/orders/dto/find-many.dto";
import { FullOrderId } from "~/orders/dto/full-order-id.dto";
import { UpdateOrderPaymentDto } from "~/orders/dto/update.dto";
import { CreateReviewDto, RespondReviewDto } from "~/orders/dto/review.dto";
import { PaymentMethod } from "~/payments/constants/payment-methods";
import { day } from "~/common/constants/time";

// BEWARE!
//
// Do     fn({ order_id, market_id }: FullOrderId)
// Don't  fn(fullOrderId: FullOrderId)
//
// Prisma will throw a error if you pass a object with extra values
// that can't be handle, use destruction to prevent this

export namespace OrdersRepository {
  export type CompleteData = Awaited<
    ReturnType<OrdersRepository["completeData"]>
  >;
  export type CancelData = Awaited<ReturnType<OrdersRepository["cancelData"]>>;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async customerFindMany(
    customer_id: string,
    { after_id }: FindManyOrdersDto = {},
  ) {
    return this.prisma.orders.findMany({
      select: {
        order_id: true,
        market_id: true,
        market_order_id: true,
        market: { select: { thumbhash: true, name: true } },
        status: true,
        is_scheduled: true,
        delivery_min_time: true,
        delivery_max_time: true,
        finished_at: true,
        review: { select: { rating: true } },
      },
      where: {
        customer_id,
        order_id: { lt: after_id },
      },
      orderBy: { order_id: "desc" },
      /* take: 10, */
    });
  }

  async marketFindMany(
    market_id: string,
    { after_id }: FindManyOrdersDto = {},
  ) {
    return this.prisma.orders.findMany({
      select: {
        order_id: true,
        market_id: true,
        market_order_id: true,
        customer_id: true,
        customer: { select: { name: true } },
        status: true,
        is_scheduled: true,
        delivery_min_time: true,
        delivery_max_time: true,
        created_at: true,
        finished_at: true,
        delivery_fee: true,
        total: true,
        paid_in_app: true,
        payment_description: true,
        payment_change: true,
        address_street: true,
        address_number: true,
        address_district: true,
        address_complement: true,
        items: {
          select: {
            is_kit: true,
            quantity: true,
            price: true,
            product: {
              select: {
                code: true,
                thumbhash: true,
                name: true,
                brand: true,
                quantity: true,
              },
            },
            details: {
              select: {
                quantity: true,
                product: { select: { thumbhash: true, name: true } },
              },
            },
            missing: { select: { quantity: true } },
          },
        },
      },
      where: {
        market_id,
        order_id: { lt: after_id },
        status: {
          in: [
            OrderStatus.ApprovalPending,
            OrderStatus.Processing,
            OrderStatus.DeliveryPending,
          ],
        },
      },
      orderBy: { order_id: "desc" },
      /* take: 10, */
    });
  }

  async findOne({ order_id, market_id }: FullOrderId) {
    return this.prisma.orders
      .findUniqueOrThrow({
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
  }

  async customerFindOne({
    order_id,
    market_id,
    customer_id,
  }: FullOrderId & { customer_id?: string }) {
    return this.prisma.orders
      .findFirstOrThrow({
        include: {
          market: { select: { thumbhash: true, name: true } },
          items: {
            select: {
              is_kit: true,
              quantity: true,
              price: true,
              product: { select: { name: true, brand: true, quantity: true } },
              details: {
                select: { quantity: true, product: { select: { name: true } } },
              },
              missing: { select: { quantity: true } },
            },
          },
          review: {
            select: {
              customer: { select: { name: true } },
              rating: true,
              message: true,
              complaint: true,
              response: true,
            },
          },
        },
        where: { order_id, market_id, customer_id },
      })
      .catch(prismaNotFound("Order"));
  }

  async findByStatus(status: OrderStatus) {
    return this.prisma.orders.findMany({
      where: { status },
    });
  }

  async findCompleted(filter: {
    from: Date;
    to: Date;
    paid_in_app: boolean;
    market_id?: string;
    customer_id?: string;
    paymentMethods?: PaymentMethod[];
  }) {
    return this.prisma.orders.findMany({
      where: {
        status: OrderStatus.Completed,
        finished_at: { gte: filter.from, lt: filter.to },
        payment_method: { in: filter.paymentMethods },
        paid_in_app: filter.paid_in_app,
        customer_id: filter.customer_id,
        market_id: filter.market_id,
      },
    });
  }

  async findItems({ order_id, market_id }: FullOrderId) {
    return this.prisma.order_item.findMany({
      select: {
        id: true,
        quantity: true,
      },
      where: { order_id, market_id },
    });
  }

  async validateCustomerOwnership({
    order_id,
    market_id,
    customer_id,
  }: FullOrderId & { customer_id: string }) {
    await this.prisma.orders
      .findFirstOrThrow({
        select: {},
        where: { order_id, market_id, customer_id },
      })
      .catch(prismaNotFound("Order"));
  }

  async customerId({ order_id, market_id }: FullOrderId) {
    const order = await this.prisma.orders
      .findUniqueOrThrow({
        select: { customer_id: true },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
    return order.customer_id;
  }

  async lastMarketOrderId(market_id: string) {
    const lastOrder = await this.prisma.orders.findFirst({
      select: { market_order_id: true },
      where: { market_id },
      orderBy: { market_order_id: "desc" },
    });
    return lastOrder?.market_order_id ?? 0n;
  }

  async retryPaymentData({
    order_id,
    market_id,
    customer_id,
  }: FullOrderId & { customer_id: string }) {
    return this.prisma.orders
      .findFirstOrThrow({
        select: { paid_in_app: true },
        where: { order_id, market_id, customer_id },
      })
      .catch(prismaNotFound("Order"));
  }

  async chatMsgData({
    order_id,
    market_id,
    customer_id,
  }: FullOrderId & { customer_id?: string }) {
    return this.prisma.orders
      .findFirstOrThrow({
        select: { customer_id: true, market_order_id: true },
        where: { order_id, market_id, customer_id },
      })
      .catch(prismaNotFound("Order"));
  }

  async reviewCreationData({
    order_id,
    market_id,
    customer_id,
  }: FullOrderId & { customer_id: string }) {
    const { review, ...rest } = await this.prisma.orders
      .findFirstOrThrow({
        select: {
          status: true,
          finished_at: true,
          review: { select: { order_id: true } },
        },
        where: { order_id, market_id, customer_id },
      })
      .catch(prismaNotFound("Order"));

    return { ...rest, hasReview: !!review };
  }

  async confirmTokenData({ order_id, market_id }: FullOrderId) {
    return this.prisma.orders
      .findUniqueOrThrow({
        select: { market_order_id: true },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
  }

  async confirmData({ order_id, market_id }: FullOrderId) {
    return this.prisma.orders
      .findUniqueOrThrow({
        select: { payment_method: true, paid_in_app: true },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
  }

  async completeData({ order_id, market_id }: FullOrderId) {
    return this.prisma.orders
      .findUniqueOrThrow({
        select: {
          status: true,
          customer_id: true,
          missing_items: {
            select: { quantity: true, order_item: { select: { price: true } } },
          },
        },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
  }

  async cancelData({ order_id, market_id }: FullOrderId) {
    return this.prisma.orders
      .findUniqueOrThrow({
        select: {
          status: true,
          payment_id: true,
          paid_in_app: true,
          customer_id: true,
          debit_amount: true,
        },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
  }

  async status({ order_id, market_id }: FullOrderId) {
    const { status } = await this.prisma.orders
      .findUniqueOrThrow({
        select: { status: true },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));
    return status as OrderStatus;
  }

  async manyStatus(market_id: string, order_ids: bigint[]) {
    return this.prisma.orders.findMany({
      select: { order_id: true, status: true },
      where: { market_id, order_id: { in: order_ids } },
      orderBy: { order_id: "desc" },
    });
  }

  async customerFindStatus(
    customer_id: string,
    { order_id, market_id }: FullOrderId,
  ) {
    const { status } = await this.prisma.orders
      .findFirstOrThrow({
        select: { status: true },
        where: { customer_id, order_id, market_id },
      })
      .catch(prismaNotFound("Order"));
    return status;
  }

  async update(
    { order_id, market_id }: FullOrderId,
    {
      missing_items,
      increasePayout,
      payoutMonth,
      ...dto
    }: UpdateOrderPaymentDto,
  ) {
    const validMissingItems =
      Prisma.validator<
        Prisma.order_missing_itemUncheckedCreateWithoutOrdersInput[]
      >();

    const updateOrder = () =>
      this.prisma.orders.update({
        data: {
          ...Prisma.validator<Prisma.ordersUncheckedUpdateManyInput>()(dto),
          ...(missing_items && {
            deleteMany: { order_id },
            create: validMissingItems(missing_items),
          }),
        },
        where: { order_id_market_id: { order_id, market_id } },
      });

    if (!increasePayout) return updateOrder().catch(prismaNotFound("Order"));

    const { market_amount } = await this.prisma.orders
      .findUniqueOrThrow({
        select: { market_amount: true },
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Order"));

    const updatePayout = this.prisma.market_payout.update({
      data: { amount: { increment: market_amount } },
      where: {
        market_id_month: {
          market_id: market_id,
          month: payoutMonth,
        },
      },
    });

    const [res] = await this.prisma.$transaction([updateOrder(), updatePayout]);

    return res;
  }

  async createReview(dto: CreateReviewDto) {
    return this.prisma.$transaction(async (prisma) => {
      const review = await prisma.review.create({
        data: Prisma.validator<Prisma.reviewCreateManyInput>()(dto),
        select: {
          rating: true,
          complaint: true,
          message: true,
          response: true,
        },
      });
      const rating = await this.rating(dto.market_id, prisma);

      await prisma.market.update({
        data: {
          rating: rating.average,
          reviews_count_lately: rating.count,
          reviews_count_total: { increment: 1 },
        },
        where: { market_id: dto.market_id },
      });
      return review;
    });
  }

  async rating(
    market_id: string,
    prisma: Prisma.TransactionClient = this.prisma,
  ) {
    const last90Days = new Date(Date.now() - 90 * day);

    const res = await prisma.review.aggregate({
      _count: true,
      _avg: { rating: true },
      where: { market_id, created_at: { gt: last90Days } },
    });
    const floatRating = res._avg.rating ?? 0;

    return { average: +floatRating.toFixed(1), count: res._count };
  }

  async updateReview({ order_id, market_id, ...dto }: RespondReviewDto) {
    return this.prisma.review
      .update({
        data: Prisma.validator<Prisma.reviewUncheckedUpdateManyInput>()(dto),
        where: { order_id_market_id: { order_id, market_id } },
      })
      .catch(prismaNotFound("Review"));
  }
}
