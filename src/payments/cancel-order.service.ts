import { Injectable } from '@nestjs/common';
import { OrderAction, OrderStatus } from '~/orders/constants/order-status';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';
import { CustomerBalance } from '~/orders/functions/customer-debit';
import { OrdersStatusService } from '~/orders/orders-status.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { AsaasService } from './asaas/asaas.service';
import { CancelOrderDto as ClientData } from './dto/cancel-order.dto';

type ServerData = OrdersRepository.CancelData;

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly asaas: AsaasService,
    private readonly ordersStatus: OrdersStatusService,
    private readonly ordersRepo: OrdersRepository,
    private readonly customersRepo: CustomersRepository,
  ) {}

  async exec({ fullOrderId: id }: ClientData) {
    const order = await this.ordersRepo.cancelData(id);

    if (order.status !== OrderStatus.Canceling) return;

    await Promise.all([
      order.paid_in_app && this.cancelPayment(id, order),
      order.debit_amount && this.updateCustomerCredit(order),
    ]);

    await this.markAsCanceled(id);
  }

  private async cancelPayment(id: FullOrderId, order: ServerData) {
    if (!order.payment_id)
      throw new Error(`Order ${id.order_id} don't have payment id`);

    await this.asaas.payments.refund(order.payment_id);
  }

  private async updateCustomerCredit(order: ServerData) {
    const creditLogs = await CustomerBalance.readDB(order.customer_id);
    const currentBalance = CustomerBalance.calc(creditLogs);

    await this.customersRepo.updateBalance(
      order.customer_id,
      currentBalance.minus(order.debit_amount ?? 0),
    );
  }

  private async markAsCanceled(id: FullOrderId) {
    await this.ordersStatus.update(id, OrderAction.MarkAsCanceled, {
      finished_at: new Date(),
    });
  }
}
