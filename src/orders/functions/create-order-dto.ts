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
  const { extra } = dto;
  const { delivery_fee, min_time, max_time } = extra.market;

  const { subtotal, orderItems } = getSubtotalAndOrderItems(dto);

  return {
    ...omit(dto, 'extra', 'card_id', 'client_total'),
    delivery_fee,
    items: orderItems,
    total: getValidatedTotal(),
    status: getInitialStatus(),
    market_amount: getMarketAmount(subtotal, delivery_fee, dto.paid_in_app),
    delivery_min_time: getDeliveryTime(min_time),
    delivery_max_time: getDeliveryTime(max_time),
    market_order_id: extra.lastMarketOrderId + 1n,
    ...getCardTokenAndPaymentDescription(dto, extra.card),
    ...(extra.creditLogs ? getOneCustomerDebit(extra.creditLogs) : {}),
  };

  function getValidatedTotal() {
    const total = subtotal.plus(delivery_fee).toDP(2);

    if (!total.isPositive())
      throw new BadRequestException("Total isn't positive");

    if (!total.equals(dto.client_total))
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Client total don't equals server total",
        total: +total,
      });

    return total;
  }

  function getInitialStatus() {
    return dto.paid_in_app
      ? OrderStatus.PaymentProcessing
      : OrderStatus.ApprovalPending;
  }

  function getDeliveryTime(minutes: Decimal) {
    return addMinutes(new Date(), +minutes);
  }
}
