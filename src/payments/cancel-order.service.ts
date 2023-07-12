import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime';
import { OrderAction, OrderStatus } from '~/orders/constants/order-status';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';
import { getCustomerCredit } from '~/orders/functions/customer-debit';
import { OrdersStatusService } from '~/orders/orders-status.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { AsaasService } from './asaas/asaas.service';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly asaas: AsaasService,
    private readonly ordersStatus: OrdersStatusService,
    private readonly ordersRepo: OrdersRepository,
    private readonly customersRepo: CustomersRepository,
  ) {}

  async exec({ fullOrderId }: CancelOrderDto) {
    const currentStatus = await this.ordersRepo.status(fullOrderId);

    if (currentStatus === OrderStatus.Canceling) await this.start(fullOrderId);
  }

  private async start(fullOrderId: FullOrderId) {
    const { payment_id, paid_in_app } = await this.ordersRepo.cancelData(
      fullOrderId,
    );
    if (paid_in_app) await this.cancelPayment(fullOrderId, payment_id);

    await this.checkAndUpdateCustomerCredit(fullOrderId);

    await this.markAsCanceled(fullOrderId);
  }

  private async cancelPayment(
    fullOrderId: FullOrderId,
    paymentId: string | null,
  ) {
    if (!paymentId)
      throw new Error(`Order ${fullOrderId.order_id} don't have payment id`);

    try {
      await this.asaas.payments.refund(paymentId);
    } catch {
      await this.asaas.payments.delete(paymentId);
    }
  }

  private async checkAndUpdateCustomerCredit(fullOrderId: FullOrderId) {
    const order = await this.ordersRepo.findOne(fullOrderId);
    const { customer_id, debit_amount } = order;

    if (debit_amount)
      await this.updateCustomerCredit(customer_id, debit_amount);
  }

  private async updateCustomerCredit(
    customer_id: string,
    debit_amount: Decimal | null,
  ) {
    const creditLogs = await this.ordersRepo.findCreditLogs(customer_id);
    const currentCredit = getCustomerCredit(creditLogs);

    await this.customersRepo.updateDebit(
      customer_id,
      currentCredit.minus(debit_amount ?? 0),
    );
  }

  private async markAsCanceled(fullOrderId: FullOrderId) {
    await this.ordersStatus.update(fullOrderId, OrderAction.MarkAsCanceled, {
      finished_at: new Date(),
    });
  }
}
