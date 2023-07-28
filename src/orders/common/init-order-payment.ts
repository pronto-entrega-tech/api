import { orders } from '@prisma/client';
import { fail } from 'assert';
import { QueueName } from '~/common/constants/queue-names';
import { createQueueNamed } from '~/common/queue/create-queue';
import {
  PaymentMethod,
  InAppPaymentMethod,
} from '~/payments/constants/payment-methods';
import { UpdateOrder } from '~/payments/constants/update-order';
import { CancelOrderDto } from '~/payments/dto/cancel-order.dto';
import { CompleteOrderDto } from '~/payments/dto/complete-order.dto';
import { ConfirmOrderPaymentDto } from '~/payments/dto/confirm-order-payment.dto';
import { PayOrderBaseDto } from '~/payments/dto/pay-order.dto';

const UpdateOrderQueue = createQueueNamed<UpdateOrder>()(
  QueueName.UpdateOrder,
  {
    [UpdateOrder.Pay]: PayOrderBaseDto,
    [UpdateOrder.ConfirmPayment]: ConfirmOrderPaymentDto,
    [UpdateOrder.Complete]: CompleteOrderDto,
    [UpdateOrder.Cancel]: CancelOrderDto,
  },
);

export async function queueOrderPayment(order: orders) {
  await UpdateOrderQueue.add(
    UpdateOrder.Pay,
    {
      fullOrderId: {
        order_id: order.order_id,
        market_id: order.market_id,
      },
      customer_id: order.customer_id,
      total: order.total,
      market_amount: order.market_amount,
      customer_debit: order.customer_debit ?? undefined,
      ...(await getValidPayment()),
    },
    { jobId: `${order.order_id}`, removeOnComplete: true },
  );

  async function getValidPayment() {
    const { payment_method: method, ip, card_token } = order;

    switch (method as PaymentMethod) {
      case PaymentMethod.Card:
        return {
          payment_method: InAppPaymentMethod.Card as const,
          remoteIp: ip ?? fail(),
          card_token: card_token ?? fail(),
        };

      case PaymentMethod.Pix:
        return {
          payment_method: InAppPaymentMethod.Pix as const,
        };

      case PaymentMethod.Cash:
        return fail();
    }
  }
}
