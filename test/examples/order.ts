import { Prisma } from "@prisma/client";
import { omit } from "~/common/functions/omit";
import { OrderStatus } from "~/orders/constants/order-status";
import {
  CreateOrderDto,
  SaveOrderDto,
} from "~/orders/create-order/create-order.dto";
import { RetryOrderPaymentDto } from "~/orders/dto/retry-payment.dto";
import { CreateReviewDto } from "~/orders/dto/review.dto";
import { Asaas } from "~/payments/asaas/asaas.types";
import { PaymentMethod } from "~/payments/constants/payment-methods";
import { createCustomer, createdCustomer } from "./customer";
import { saveItem } from "./item";
import { createMarket } from "./market";

export const createOrder = Prisma.validator<
  CreateOrderDto & { order_id: bigint }
>()({
  order_id: 1n,
  market_id: createMarket.market_id,
  customer_id: createCustomer.customer_id,
  is_scheduled: false,
  paid_in_app: false,
  payment_method: PaymentMethod.Card,
  items: [{ item_id: saveItem.item_id, quantity: 1 }],
  address_street: "Street",
  address_number: "123",
  address_district: "District",
  address_city: "City",
  address_state: "State",
  address_complement: "Complement",
  address_latitude: 0,
  address_longitude: 0,
  ip: "ip",
  client_total: new Prisma.Decimal(10),
});

export const saveOrder = Prisma.validator<SaveOrderDto>()({
  ...omit(createOrder, "order_id", "client_total"),
  payment_method: createOrder.payment_method,
  market_order_id: 1n,
  customer_id: createdCustomer.customer_id,
  items: [
    {
      prod_id: 1n,
      quantity: 1,
      price: new Prisma.Decimal(10),
      is_kit: false,
    },
  ],
  card_token: "card_token",
  payment_description: "Cartão de Crédito",
  status: OrderStatus.ApprovalPending,
  total: new Prisma.Decimal(10),
  delivery_fee: new Prisma.Decimal(0),
  market_amount: new Prisma.Decimal(8.8),
  delivery_min_time: new Date("2000-01-01"),
  delivery_max_time: new Date("2000-01-01"),

  /* created_at: new Date('2000-01-01'), */
});

export const retryOrderPayment: RetryOrderPaymentDto = {
  customer_id: createOrder.customer_id,
  order_id: createOrder.order_id,
  market_id: createOrder.market_id,
  payment_method: PaymentMethod.Card,
  card_id: "cardId",
  ip: createOrder.ip,
};

export const createReview: CreateReviewDto = {
  customer_id: createOrder.customer_id,
  order_id: createOrder.order_id,
  market_id: createOrder.market_id,
  rating: 5,
  message: "Review message",
};

export const createdReview = {
  ...omit(createReview, "customer_id"),
};

export const createPayment: Asaas.CreatePayment & { payment_id: string } = {
  payment_id: "paymentId",
  customer: "cus_000004802657",
  billingType: "CREDIT_CARD",
  creditCardToken: "240e1ec2-7ca1-4a75-8f61-c387c48c515f",
  value: 10,
  dueDate: "2000-01-01",
};
