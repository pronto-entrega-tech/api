import { describe, expect, it } from 'vitest';
import { PaymentExample } from '@test/examples/payment';
import { createDecision } from '~/common/functions/decision';
import { orderPaymentPendingAction } from './order-payment-pending-action';
import { OrderAction, OrderStatus } from '~/orders/constants/order-status';
import {
  InAppPaymentMethod,
  PaymentMethod,
} from '../constants/payment-methods';

const { id: payment_id } = PaymentExample.paymentObject;

const cardPaymentPending = PaymentExample.paymentObject;

const cardPaymentReceived: typeof PaymentExample['paymentObject'] = {
  ...PaymentExample.paymentObject,
  status: 'RECEIVED',
};

const cardPaymentOverdue: typeof PaymentExample['paymentObject'] = {
  ...PaymentExample.paymentObject,
  status: 'OVERDUE',
};

const pixPaymentPending: typeof PaymentExample['paymentObject'] = {
  ...PaymentExample.paymentObject,
  billingType: 'PIX',
};

const getPix = async () => PaymentExample.pix;

describe(orderPaymentPendingAction.name, () => {
  it("return Create given payment don't exist", async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      getExistingPayments: async () => [],
      getPix,
    });

    expect(res).toEqual(createDecision('createPayment'));
  });

  it('return UpdateOrder given a payment exist', async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      getExistingPayments: async () => [cardPaymentReceived],
      getPix,
    });

    expect(res).toEqual(
      createDecision('updateOrder', {
        payment_id,
        action: OrderAction.Complete,
        payment_method: PaymentMethod.Card,
      }),
    );
  });

  it('return RecreatePayment given payment is overdue', async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      getExistingPayments: async () => [cardPaymentOverdue],
      getPix,
    });

    expect(res).toEqual(createDecision('recreatePayment', payment_id));
  });

  it('return updateOrder given pix payment is pending and order payment method is pix', async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      payment_method: InAppPaymentMethod.Pix,
      getExistingPayments: async () => [pixPaymentPending],
      getPix,
    });

    expect(res).toEqual(
      createDecision('updateOrder', {
        action: OrderAction.QuasiConfirmPayment,
        payment_id: payment_id,
        extra: PaymentExample.pix,
      }),
    );
  });

  it('return None on status other than PaymentProcessing', async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      status: OrderStatus.PaymentFailed,
      getExistingPayments: async () => [cardPaymentPending],
      getPix,
    });

    expect(res).toEqual(createDecision('none'));
  });
});
