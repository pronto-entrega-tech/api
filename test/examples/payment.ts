import { OrderStatus } from '~/orders/constants/order-status';
import { Asaas } from '~/payments/asaas/asaas.types';
import { InAppPaymentMethod } from '~/payments/constants/payment-methods';
import { OrderPayUpdate } from '~/payments/functions/order-payment-pending-action';
import { createMarket } from './market';
import { createOrder, saveOrder } from './order';

const fullOrderId = {
  order_id: createOrder.order_id,
  market_id: createMarket.market_id,
};

const payOrderDto = {
  customer_id: createOrder.customer_id,
  total: saveOrder.total,
  market_amount: saveOrder.market_amount,
  fullOrderId,
  ip: 'ip',
  card_token: 'cardToken',
  payment_method: InAppPaymentMethod.Card,
  status: OrderStatus.PaymentProcessing,
};

const paymentObject: Pick<
  Asaas.PaymentObject,
  'status' | 'id' | 'billingType'
> = {
  status: 'PENDING',
  id: 'paymentId',
  billingType: 'CREDIT_CARD',
};

const pix: OrderPayUpdate['extra'] = {
  pix_code: 'pixCode',
  pix_expires_at: new Date(),
};

export const PaymentExample = {
  payOrderDto,
  paymentObject,
  pix,
};
