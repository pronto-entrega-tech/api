import { Injectable } from '@nestjs/common';
import { orders } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { fail } from 'assert';
import { arrayNotEmpty } from 'class-validator';
import { pick } from '~/common/functions/pick';
import { OrderAction, OrderStatus } from '~/orders/constants/order-status';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';
import { getCustomerCredit } from '~/orders/functions/customer-debit';
import { OrdersStatusService } from '~/orders/orders-status.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { AsaasService } from './asaas/asaas.service';
import { Asaas } from './asaas/asaas.types';
import { appRecipientKey } from './constants/app-recipient-key';
import { CompleteOrderDto } from './dto/complete-order.dto';

type OrderWithMissingItems = orders & {
  missing_items: {
    quantity: Decimal;
    order_item: {
      price: Decimal;
    };
  }[];
};

@Injectable()
export class CompleteOrderService {
  constructor(
    private readonly asaas: AsaasService,
    private readonly ordersStatus: OrdersStatusService,
    private readonly ordersRepo: OrdersRepository,
    private readonly marketsRepo: MarketsRepository,
    private readonly customersRepo: CustomersRepository,
  ) {}

  async exec({ fullOrderId }: CompleteOrderDto) {
    const order = await this.ordersRepo.findOneWithMissingItems(fullOrderId);

    if (order.status === OrderStatus.Completing)
      await this.start(order, fullOrderId);
  }

  private async start(order: OrderWithMissingItems, fullOrderId: FullOrderId) {
    if (arrayNotEmpty(order.missing_items)) await this.missingItems(order);

    await this.markAsCompleted(fullOrderId);
  }

  private async missingItems(order: OrderWithMissingItems) {
    const orderCredit = this.genOrderCredit(order);

    const fullOrderId = pick(order, 'order_id', 'market_id');
    await this.ordersRepo.update(fullOrderId, { customer_debit: orderCredit });

    const { customer_id } = order;
    const currentCredit = await this.getCustomerCredit(customer_id);

    await this.customersRepo.updateDebit(
      customer_id,
      currentCredit.plus(orderCredit),
    );

    await this.checkAndTransfer(currentCredit, orderCredit, order);
  }

  private async checkAndTransfer(
    currentCredit: Decimal,
    orderCredit: Decimal,
    order: OrderWithMissingItems,
  ) {
    const customerHasCredit = currentCredit.isPositive();
    const orderIsInDebt = orderCredit.isNegative();
    const orderIsGivingCredit = orderCredit.isPositive();

    if (orderIsInDebt && customerHasCredit)
      await this.transferToMarker(order, orderCredit, currentCredit);
    else if (orderIsGivingCredit)
      await this.transferFromMarket(order, orderCredit);
  }

  private genOrderCredit(order: OrderWithMissingItems) {
    return order.missing_items.reduce(
      (credit, { order_item: { price }, quantity }) =>
        credit.plus(price.times(quantity)),
      new Decimal(0),
    );
  }

  private async transferFromMarket(
    { market_id }: OrderWithMissingItems,
    orderCredit: Decimal,
  ) {
    const key = await this.marketsRepo.findRecipientKey(market_id);
    const params: Asaas.CreateTransfer = {
      value: +orderCredit,
      walletId: appRecipientKey,
    };
    await this.asaas.transfers.create(params, key ?? fail());
  }

  private async transferToMarker(
    { market_id }: OrderWithMissingItems,
    orderCredit: Decimal,
    currentCredit: Decimal,
  ) {
    const orderDebitValue = orderCredit.negated();

    const transferValue = currentCredit.lessThan(orderDebitValue)
      ? currentCredit
      : orderDebitValue;

    await this.asaas.transfers.create({
      value: +transferValue,
      walletId: (await this.marketsRepo.findRecipientId(market_id)) ?? fail(),
    });
  }

  private async getCustomerCredit(customer_id: string) {
    const creditLogs = await this.ordersRepo.findCreditLogs(customer_id);
    return getCustomerCredit(creditLogs);
  }

  private async markAsCompleted(fullOrderId: FullOrderId) {
    await this.ordersStatus.update(fullOrderId, OrderAction.MarkAsCompleted);
  }
}
