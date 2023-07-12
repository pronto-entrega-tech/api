import { InjectQueue } from '@nestjs/bull';
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { orders } from '@prisma/client';
import { fail } from 'assert';
import { Queue } from 'bull';
import { LockedAction } from '~/common/constants/locked-actions';
import { QueueName } from '~/common/constants/queue-names';
import { MutexService } from '~/common/mutex/mutex.service';
import { OrderStatus } from '~/orders/constants/order-status';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import {
  InAppPaymentMethod,
  PaymentMethod,
} from '../constants/payment-methods';
import { UpdateOrder } from '../constants/update-order';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { ConfirmOrderPaymentDto } from '../dto/confirm-order-payment.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderUpdaterService implements OnApplicationBootstrap {
  constructor(
    private readonly mutex: MutexService,
    private readonly ordersRepo: OrdersRepository,
    @InjectQueue(QueueName.UpdateOrder)
    private readonly updateOrderQueue: Queue<UpdateOrderDto>,
  ) {}
  private readonly logger = new Logger(OrderUpdaterService.name);

  onApplicationBootstrap() {
    this.checkPaymentProcessing();
    this.checkCompleting();
    this.checkCanceling();
  }

  @Cron('0 * * * *')
  async checkPaymentProcessing() {
    const orders = await this.ordersRepo.findByStatus(
      OrderStatus.PaymentProcessing,
    );

    for (const order of orders) {
      this.pay(order).catch((err) => this.logger.error(err));
    }
  }

  @Cron('0 * * * *')
  async checkCompleting() {
    const orders = await this.ordersRepo.findByStatus(OrderStatus.Completing);

    for (const { order_id, market_id } of orders) {
      this.complete({ fullOrderId: { order_id, market_id } }).catch((err) =>
        this.logger.error(err),
      );
    }
  }

  @Cron('0 * * * *')
  async checkCanceling() {
    const orders = await this.ordersRepo.findByStatus(OrderStatus.Canceling);

    for (const { order_id, market_id } of orders) {
      this.cancel({ fullOrderId: { order_id, market_id } }).catch((err) =>
        this.logger.error(err),
      );
    }
  }

  async pay(order: orders) {
    await this.updateOrderQueue.add(
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
        ...(await this.getValidPayment(order)),
      },
      { jobId: `${order.order_id}`, removeOnComplete: true },
    );
  }

  confirmPayment(dto: ConfirmOrderPaymentDto) {
    return this.mutex.exec(LockedAction.UpdateOrder, this.orderJobId(dto), () =>
      this.nonAtomicConfirmPayment(dto),
    );
  }

  private async nonAtomicConfirmPayment(dto: ConfirmOrderPaymentDto) {
    const job = await this.updateOrderQueue.getJob(this.orderJobId(dto));
    if (job?.name === UpdateOrder.Pay) await job.remove();

    await this.updateOrderQueue.add(UpdateOrder.ConfirmPayment, dto, {
      jobId: this.orderJobId(dto),
      removeOnComplete: true,
    });
  }

  complete(dto: ConfirmOrderPaymentDto) {
    return this.mutex.exec(LockedAction.UpdateOrder, this.orderJobId(dto), () =>
      this.nonAtomicComplete(dto),
    );
  }

  private async nonAtomicComplete(dto: ConfirmOrderPaymentDto) {
    const job = await this.updateOrderQueue.getJob(this.orderJobId(dto));
    if (job && job.name !== UpdateOrder.Cancel) await job.remove();

    await this.updateOrderQueue.add(UpdateOrder.Complete, dto, {
      jobId: this.orderJobId(dto),
      removeOnComplete: true,
    });
  }

  cancel(dto: CancelOrderDto) {
    return this.mutex.exec(LockedAction.UpdateOrder, this.orderJobId(dto), () =>
      this.nonAtomicCancel(dto),
    );
  }

  private async nonAtomicCancel(dto: CancelOrderDto) {
    const job = await this.updateOrderQueue.getJob(this.orderJobId(dto));
    if (job && job.name !== UpdateOrder.Complete) await job.remove();

    await this.updateOrderQueue.add(UpdateOrder.Cancel, dto, {
      jobId: this.orderJobId(dto),
      removeOnComplete: true,
    });
  }

  async getValidPayment(order: orders) {
    const { payment_method: method, ip } = order;

    switch (method) {
      case PaymentMethod.Card:
        return {
          payment_method: InAppPaymentMethod.Card as const,
          remoteIp: ip ?? fail(),
          card_token: order.card_token ?? fail(),
        };

      case PaymentMethod.Pix:
        return {
          payment_method: InAppPaymentMethod.Pix as const,
        };

      case PaymentMethod.Cash:
        return fail();
    }
  }

  private orderJobId(dto: { fullOrderId: FullOrderId }) {
    return `${dto.fullOrderId.order_id}`;
  }
}
