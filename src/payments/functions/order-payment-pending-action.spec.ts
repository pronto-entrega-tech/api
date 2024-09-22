import { describe, expect, it } from "vitest";
import { PaymentExample } from "@test/examples/payment";
import { createEffect } from "~/common/functions/effect";
import { orderPaymentPendingAction } from "./order-payment-pending-action";
import { OrderAction } from "~/orders/constants/order-status";
import {
  InAppPaymentMethod,
  PaymentMethod,
} from "../constants/payment-methods";

const { id: payment_id } = PaymentExample.paymentObject;

const cardPaymentReceived: (typeof PaymentExample)["paymentObject"] = {
  ...PaymentExample.paymentObject,
  status: "RECEIVED",
};

const cardPaymentOverdue: (typeof PaymentExample)["paymentObject"] = {
  ...PaymentExample.paymentObject,
  status: "OVERDUE",
};

const pixPaymentPending: (typeof PaymentExample)["paymentObject"] = {
  ...PaymentExample.paymentObject,
  billingType: "PIX",
};

const getPix = () => Promise.resolve(PaymentExample.pix);

describe(orderPaymentPendingAction.name, () => {
  it("return Create given payment don't exist", async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      payments: [],
      getPix,
    });

    expect(res).toEqual(createEffect("createPayment"));
  });

  it("return UpdateOrder given a payment exist", async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      payments: [cardPaymentReceived],
      getPix,
    });

    expect(res).toEqual(
      createEffect("updateOrder", {
        payment_id,
        action: OrderAction.Complete,
        payment_method: PaymentMethod.Card,
      }),
    );
  });

  it("return RecreatePayment given payment is overdue", async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      payments: [cardPaymentOverdue],
      getPix,
    });

    expect(res).toEqual(createEffect("recreatePayment", payment_id));
  });

  it("return updateOrder given pix payment is pending and order payment method is pix", async () => {
    const res = await orderPaymentPendingAction({
      ...PaymentExample.payOrderDto,
      payment_method: InAppPaymentMethod.Pix,
      payments: [pixPaymentPending],
      getPix,
    });

    expect(res).toEqual(
      createEffect("updateOrder", {
        action: OrderAction.QuasiConfirmPayment,
        payment_id: payment_id,
        extra: PaymentExample.pix,
      }),
    );
  });
});
