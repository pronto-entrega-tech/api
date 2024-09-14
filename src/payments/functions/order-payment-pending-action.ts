import { Logger } from '@nestjs/common';
import { fail } from 'assert';
import { createEffect } from '~/common/functions/effect';
import { OrderAction } from '~/orders/constants/order-status';
import { PayOrderDto } from '~/payments/dto/pay-order.dto';
import { Asaas } from '../asaas/asaas.types';
import { InAppPaymentMethod } from '../constants/payment-methods';

export type OrderPayUpdate = {
  action: OrderAction;
  payment_id?: string;
  payment_method?: InAppPaymentMethod;
  extra?: {
    pix_code: string;
    pix_expires_at: Date;
  };
};

const logger = new Logger(orderPaymentPendingAction.name);

export async function orderPaymentPendingAction(
  dto: PayOrderDto & {
    payments: Pick<Asaas.PaymentObject, 'status' | 'id' | 'billingType'>[];
    getPix: (paymentId: string) => Promise<OrderPayUpdate['extra']>;
  },
) {
  {
    const { fullOrderId, payment_method } = dto;

    if (dto.payments.length > 1)
      logger.error(`Order ${fullOrderId.order_id} has more that one payment`);

    const [payment] = dto.payments;
    if (!payment) return createEffect('createPayment');

    if (payment.status === 'OVERDUE')
      return createEffect('recreatePayment', payment.id);

    if (payment.status === 'PENDING') {
      if (payment_method === InAppPaymentMethod.Pix)
        return createEffect('updateOrder', <OrderPayUpdate>{
          action: OrderAction.QuasiConfirmPayment,
          payment_id: payment.id,
          extra: await dto.getPix(payment.id),
        });

      return createEffect('recreatePayment', payment.id);
    }

    return createEffect('updateOrder', <OrderPayUpdate>{
      action: OrderAction.Complete,
      payment_id: payment.id,
      payment_method: billingTypeToPaymentMethod(payment.billingType),
    });
  }

  function billingTypeToPaymentMethod(billingType: Asaas.BillingType) {
    switch (billingType) {
      case 'CREDIT_CARD':
        return InAppPaymentMethod.Card;
      case 'PIX':
        return InAppPaymentMethod.Pix;
      case 'BOLETO':
        return fail();
    }
  }
}
