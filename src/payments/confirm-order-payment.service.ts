import { Injectable } from '@nestjs/common';
import { OrderAction } from '~/orders/constants/order-status';
import { OrdersStatusService } from '~/orders/orders-status.service';
import { ConfirmOrderPaymentDto } from '~/payments/dto/confirm-order-payment.dto';

@Injectable()
export class ConfirmOrderPaymentService {
  constructor(private readonly ordersStatus: OrdersStatusService) {}

  async exec(dto: ConfirmOrderPaymentDto) {
    const { fullOrderId } = dto;

    await this.ordersStatus.update(fullOrderId, OrderAction.ConfirmPayment);
  }
}
