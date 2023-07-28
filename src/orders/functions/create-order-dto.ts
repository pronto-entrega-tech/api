import { BadRequestException, HttpStatus } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime';
import { addMinutes } from 'date-fns';
import { omit } from '~/common/functions/omit';
import { OrderStatus } from '../constants/order-status';
import { CreateOrderPreDto } from '../dto/create.dto';
import { getCardTokenAndPaymentDescription } from './card-token-and-payment-description';
import { getOneCustomerDebit } from './customer-debit';
import { getMarketAmount } from './market-amount';
import { getSubtotalAndOrderItems } from './subtotal-and-items';

export function createOrderDto(dto: CreateOrderPreDto) {
  const { client, server } = dto;
  const { delivery_fee } = server.market;

  const { subtotal, orderItems } = getSubtotalAndOrderItems(dto);

  return {
    ...omit(client, 'card_id', 'client_total'),
    delivery_fee,
    items: orderItems,
    total: getValidatedTotal(),
    status: getInitialStatus(),
    market_amount: getMarketAmount(subtotal, delivery_fee, client.paid_in_app),
    delivery_min_time: getDeliveryTime(server.market.min_time),
    delivery_max_time: getDeliveryTime(server.market.max_time),
    market_order_id: server.lastMarketOrderId + 1n,
    ...getCardTokenAndPaymentDescription(client, server.card),
    ...(server.creditLogs ? getOneCustomerDebit(server.creditLogs) : {}),
  };

  function getValidatedTotal() {
    const total = subtotal.plus(delivery_fee).toDP(2);

    if (!total.isPositive())
      throw new BadRequestException("Total isn't positive");

    if (!total.equals(client.client_total))
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Client total don't equals server total",
        total: +total,
      });

    return total;
  }

  function getInitialStatus() {
    return client.paid_in_app
      ? OrderStatus.PaymentProcessing
      : OrderStatus.ApprovalPending;
  }

  function getDeliveryTime(minutes: Decimal) {
    return addMinutes(new Date(), +minutes);
  }
}
