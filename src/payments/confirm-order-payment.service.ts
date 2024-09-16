import { Injectable } from "@nestjs/common";
import { OrderAction } from "~/orders/constants/order-status";
import { OrdersStatusService } from "~/orders/orders-status.service";
import { ConfirmOrderPaymentDto as ClientData } from "~/payments/dto/confirm-order-payment.dto";

@Injectable()
export class ConfirmOrderPaymentService {
  constructor(private readonly ordersStatus: OrdersStatusService) {}

  async exec({ fullOrderId: id }: ClientData) {
    await this.ordersStatus.update(id, OrderAction.ConfirmPayment);
  }
}
