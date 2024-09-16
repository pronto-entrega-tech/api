import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import assert from "assert";
import { AlreadyExistError } from "~/common/errors/already-exist";
import { Month } from "~/common/functions/month";
import { omit } from "~/common/functions/omit";
import { pick } from "~/common/functions/pick";
import { PaymentMethod } from "~/payments/constants/payment-methods";
import { OrderUpdaterService } from "~/payments/order-updater/order-updater.service";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { OrdersRepository } from "~/repositories/orders/orders.repository";
import {
  OrderAction,
  OrderPublicAction,
  OrderStatus,
} from "./constants/order-status";
import { reviewCreationMaxDays } from "./constants/review-max-day";
import { CancelOrderDto } from "./dto/cancel.dto";
import { FindManyOrdersDto } from "./dto/find-many.dto";
import { FullOrderId } from "./dto/full-order-id.dto";
import { RetryOrderPaymentDto } from "./dto/retry-payment.dto";
import {
  CreateConfirmationTokenDto,
  OrderMissingItem,
  UpdateOrderDto,
} from "./dto/update.dto";
import { CreateReviewDto, RespondReviewDto } from "./dto/review.dto";
import { OrdersStatusService } from "./orders-status.service";
import { getCardTokenAndPaymentDescription } from "./functions/card-token-and-payment-description";
import { differenceInDays } from "date-fns";
import { confirmationToken } from "./common/confirmation-token";
import { validateInAppPayment } from "./common/validate-in-app-payment";

export type ConfirmationTokenPayload = {
  iss: "ProntoEntrega";
  sub: string;
  type: "confirm_delivery";
  market_order_id: bigint;
  items?: OrderMissingItem[];
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly jwt: JwtService,
    private readonly ordersStatus: OrdersStatusService,
    private readonly orderUpdater: OrderUpdaterService,
    private readonly ordersRepo: OrdersRepository,
    private readonly customersRepo: CustomersRepository,
  ) {}

  async retryPayment(dto: RetryOrderPaymentDto) {
    const updateDto = await this.retryPaymentDto(dto);

    const newOrder = await this.ordersStatus.update(
      dto,
      OrderAction.ProcessPayment,
      updateDto,
    );

    await this.orderUpdater.pay(newOrder);
  }

  private async retryPaymentDto(dto: RetryOrderPaymentDto) {
    const order = await this.ordersRepo.retryPaymentData(dto);
    const [, card] = await Promise.all([
      validateInAppPayment({ ...order, ...dto }),
      dto.card_id
        ? this.customersRepo.cards.findOne(dto.customer_id, dto.card_id)
        : undefined,
    ]);

    return {
      ...pick(dto, "payment_method", "ip"),
      ...getCardTokenAndPaymentDescription(dto, card),
    };
  }

  async findMany(
    id: { customer_id: string } | { market_id: string },
    dto?: FindManyOrdersDto,
  ) {
    return "customer_id" in id
      ? this.ordersRepo.customerFindMany(id.customer_id, dto)
      : this.ordersRepo.marketFindMany(id.market_id, dto);
  }

  async customerFindOne(ids: FullOrderId & { customer_id: string }) {
    return this.ordersRepo.customerFindOne(ids);
  }

  async status(fullId: FullOrderId) {
    return this.ordersRepo.status(fullId);
  }

  async manyStatus(market_id: string, order_ids: bigint[]) {
    return this.ordersRepo.manyStatus(market_id, order_ids);
  }

  async createReview(dto: CreateReviewDto) {
    await this.validateReviewCreation(dto);

    return this.ordersRepo.createReview(dto);
  }

  private async validateReviewCreation(dto: CreateReviewDto) {
    const order = await this.ordersRepo.reviewCreationData(dto);

    if (
      order.status !== OrderStatus.Completed &&
      order.status !== OrderStatus.Completing
    )
      throw new ConflictException("Order isn't completed");

    if (orderAgeDays() > reviewCreationMaxDays)
      throw new ConflictException(
        `Order is over ${reviewCreationMaxDays} days`,
      );

    if (order.hasReview) throw new AlreadyExistError("Review");

    function orderAgeDays() {
      assert(
        order.finished_at,
        `finished_at undefined, order_id: ${dto.order_id}`,
      );
      return differenceInDays(new Date(), order.finished_at);
    }
  }

  async createConfirmationToken(dto: CreateConfirmationTokenDto) {
    const [, , serverData] = await Promise.all([
      this.ordersRepo.validateCustomerOwnership(dto),
      this.validateMissingItems(dto),
      this.ordersRepo.confirmTokenData(dto),
    ]);

    return { token: confirmationToken({ ...dto, ...serverData }) };
  }

  private async validateMissingItems(dto: CreateConfirmationTokenDto) {
    if (!dto.missing_items) return;

    const items = await this.ordersRepo.findItems(dto);

    const exceptions = dto.missing_items
      .map(({ order_item_id, quantity }, i) => {
        const item = items.find((item) => item.id === order_item_id);

        if (!item)
          return `missing_items.${i} must exist in items of this order`;

        if (quantity.greaterThan(item.quantity))
          return `missing_items.${i}.quantity must not be greater than quantity in items of this order`;
      })
      .filter(Boolean);

    if (exceptions.length) throw new ConflictException(exceptions);
  }

  async update(dto: UpdateOrderDto) {
    const { action, ...fullOrderId } = omit(dto, "confirmation_token");

    const extra = await this.completingData(dto);
    await this.ordersStatus.update(fullOrderId, action, extra);

    switch (action) {
      case OrderPublicAction.Complete:
        return this.orderUpdater.complete({ fullOrderId });
      case OrderPublicAction.Cancel:
        return this.orderUpdater.cancel({ fullOrderId });
    }
  }

  private async completingData(dto: UpdateOrderDto) {
    if (dto.action !== OrderPublicAction.Complete) return;

    const [order, missing_items] = await Promise.all([
      this.ordersRepo.confirmData(dto),
      this.validateConfirmationToken(dto),
    ]);

    const now = new Date();
    const base = {
      finished_at: now,
      missing_items,
    };
    return order.paid_in_app
      ? {
          ...base,
          increasePayout: true as const,
          payoutMonth:
            order.payment_method === PaymentMethod.Card
              ? Month.next(now)
              : Month.from(now),
        }
      : base;
  }

  private async validateConfirmationToken({
    order_id,
    confirmation_token: token,
  }: UpdateOrderDto) {
    if (!token)
      throw new BadRequestException(
        "confirmationToken must be defined to complete order",
      );

    const { sub, type, items } = await this.jwt
      .verifyAsync<ConfirmationTokenPayload>(token)
      .catch(() => {
        throw new UnauthorizedException();
      });

    if (type !== "confirm_delivery" || sub !== `${order_id}`)
      throw new UnauthorizedException();

    return items;
  }

  async customerCancel(dto: CancelOrderDto) {
    const { customer_id } = dto;
    const fullOrderId = pick(dto, "market_id", "order_id");

    const order = await this.ordersStatus.customerUpdate(
      customer_id,
      fullOrderId,
      OrderAction.Cancel,
      { cancel_reason: dto.reason, cancel_message: dto.message },
    );

    await this.orderUpdater.cancel({ fullOrderId });

    return order;
  }

  async respondReview(dto: RespondReviewDto) {
    return this.ordersRepo.updateReview(dto);
  }
}
