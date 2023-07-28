import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import assert from 'assert';
import { AlreadyExistError } from '~/common/errors/already-exist';
import { Month } from '~/common/functions/month';
import { omit } from '~/common/functions/omit';
import { pick } from '~/common/functions/pick';
import { PaymentMethod } from '~/payments/constants/payment-methods';
import { OrderUpdaterService } from '~/payments/order-updater/order-updater.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { ItemsRepository } from '~/repositories/items/items.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import {
  OrderAction,
  OrderPublicAction,
  OrderStatus,
} from './constants/order-status';
import { reviewCreationMaxDays } from './constants/review-max-day';
import { CancelOrderDto } from './dto/cancel.dto';
import { CreateOrderDto } from './dto/create.dto';
import { FindManyOrdersDto } from './dto/find-many.dto';
import { FullOrderId } from './dto/full-order-id.dto';
import { RetryOrderPaymentDto } from './dto/retry-payment.dto';
import {
  CreateConfirmationTokenDto,
  OrderMissingItem,
  UpdateOrderDto,
} from './dto/update.dto';
import { CreateReviewDto, RespondReviewDto } from './dto/review.dto';
import { OrdersStatusService } from './orders-status.service';
import { getCardTokenAndPaymentDescription } from './functions/card-token-and-payment-description';
import { differenceInDays } from 'date-fns';
import { createOrderDto } from './functions/create-order-dto';

export type ConfirmationTokenPayload = {
  iss: 'ProntoEntrega';
  sub: string;
  type: 'confirm_delivery';
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
    private readonly itemsRepo: ItemsRepository,
    private readonly customersRepo: CustomersRepository,
    private readonly marketsRepo: MarketsRepository,
  ) {}

  async create(dto: CreateOrderDto) {
    const orderDto = await this.createOrderDto(dto);

    const order = await this.ordersRepo.create(orderDto);

    if (dto.paid_in_app) await this.orderUpdater.pay(order);

    return {
      ...order,
      confirmation_token: await this.confirmationToken(order),
    };
  }

  private async createOrderDto(dto: CreateOrderDto) {
    const [, card, creditLogs, items, market, lastMarketOrderId] =
      await Promise.all([
        this.validateOrderCreation(dto),
        this.getCustomerCard(dto),
        this.getCreditLogs(dto),
        this.getItems(dto),
        this.marketsRepo.orderCreationData(dto.market_id),
        this.ordersRepo.lastMarketOrderId(dto.market_id),
      ]);

    return createOrderDto({
      client: dto,
      server: { market, items, card, creditLogs, lastMarketOrderId },
    });
  }

  private async validateOrderCreation(dto: CreateOrderDto) {
    const paidInAppValidations = dto.paid_in_app && [
      this.validateInAppPayment(dto),
    ];

    await Promise.all([
      this.validateCustomerExist(dto.customer_id),
      ...(paidInAppValidations || []),
    ]);
  }

  private async getCreditLogs(dto: CreateOrderDto) {
    return dto.paid_in_app
      ? this.ordersRepo.findCreditLogs(dto.customer_id)
      : undefined;
  }

  private async getCustomerCard(
    dto: Pick<CreateOrderDto, 'customer_id' | 'card_id' | 'payment_method'>,
  ) {
    return dto.card_id
      ? this.customersRepo.cards.findOne(dto.customer_id, dto.card_id)
      : undefined;
  }

  private async getItems(dto: CreateOrderDto) {
    const itemsIds = dto.items.map((v) => v.item_id);
    const items = await this.itemsRepo.findByIds(itemsIds, dto.market_id);
    if (items.length !== itemsIds.length)
      throw new BadRequestException("Product(s) don't exist");

    return items;
  }

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
      this.validateInAppPayment({ ...order, ...dto }),
      this.getCustomerCard(dto),
    ]);

    return {
      ...pick(dto, 'payment_method', 'ip'),
      ...getCardTokenAndPaymentDescription(dto, card),
    };
  }

  private async validateInAppPayment(
    dto: Pick<
      CreateOrderDto,
      'market_id' | 'customer_id' | 'card_id' | 'payment_method'
    >,
  ) {
    await Promise.all([
      this.validateMarketInAppPaymentSupport(dto.market_id),
      this.validatePayment(dto),
    ]);
  }

  async findMany(
    id: { customer_id: string } | { market_id: string },
    dto?: FindManyOrdersDto,
  ) {
    return 'customer_id' in id
      ? this.ordersRepo.customerFindMany(id.customer_id, dto)
      : this.ordersRepo.marketFindMany(id.market_id, dto);
  }

  async customerFindOne(ids: FullOrderId & { customer_id: string }) {
    return this.ordersRepo.findOneWithItemsAndReview(ids);
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

    if (order.hasReview) throw new AlreadyExistError('Review');

    function orderAgeDays() {
      assert(
        order.finished_at,
        `finished_at undefined, order_id: ${dto.order_id}`,
      );
      return differenceInDays(new Date(), order.finished_at);
    }
  }

  async createConfirmationToken(dto: CreateConfirmationTokenDto) {
    const [, , token] = await Promise.all([
      this.ordersRepo.validateCustomerOwnership(dto),
      this.validateMissingItems(dto),
      this.confirmationToken(dto),
    ]);

    return { token };
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

  private async confirmationToken(dto: CreateConfirmationTokenDto) {
    const payload: ConfirmationTokenPayload = {
      iss: 'ProntoEntrega',
      sub: `${dto.order_id}`,
      type: 'confirm_delivery',
      items: dto.missing_items,
      ...(await this.ordersRepo.confirmTokenData(dto)),
    };
    return this.jwt.signAsync(payload, { expiresIn: '1d' });
  }

  async update(dto: UpdateOrderDto) {
    const { action, ...fullOrderId } = omit(dto, 'confirmation_token');

    await this.ordersStatus.update(
      fullOrderId,
      action,
      await this.completingData(dto),
    );

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
      finished_at: new Date(now),
      missing_items,
    };
    return order.paid_in_app
      ? {
          ...base,
          increasePayout: true,
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
        'confirmationToken must be defined to complete order',
      );

    const payload = await this.jwt.verifyAsync(token).catch(() => {
      throw new UnauthorizedException();
    });
    const { sub, type, items } = payload as ConfirmationTokenPayload;

    if (type !== 'confirm_delivery' || sub !== `${order_id}`)
      throw new UnauthorizedException();

    return items;
  }

  async customerCancel(dto: CancelOrderDto) {
    const { customer_id } = dto;
    const fullOrderId = pick(dto, 'market_id', 'order_id');

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

  private async validateCustomerExist(customer_id: string) {
    const exist = await this.customersRepo.exist(customer_id);

    if (!exist) throw new UnauthorizedException();
  }

  private async validateMarketInAppPaymentSupport(market_id: string) {
    const has = await this.marketsRepo.hasInAppPaymentSupport(market_id);

    if (!has)
      throw new BadRequestException(
        "This market don't support the payment method chosen",
      );
  }

  private async validatePayment(
    dto: Pick<
      CreateOrderDto,
      'customer_id' | 'market_id' | 'card_id' | 'payment_method'
    >,
  ) {
    const { payment_method: method, customer_id, card_id } = dto;

    const validateCardId = () => {
      if (!card_id)
        throw new BadRequestException(
          'card_id must be provided, when payment_method is CARD and paid_in_app is true',
        );
    };

    const checkCustomerDocument = async () => {
      const { document } = await this.customersRepo.findOne(customer_id);

      if (!document)
        throw new BadRequestException(
          'customer must have document, when payment_method is PIX and paid_in_app is true',
        );
    };

    switch (method) {
      case PaymentMethod.Card:
        return validateCardId();

      case PaymentMethod.Pix:
        return checkCustomerDocument();

      case PaymentMethod.Cash:
        throw new BadRequestException(
          "payment_method CASH can't be used when paid_in_app is true",
        );
    }
  }
}
