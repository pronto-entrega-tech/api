import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { QueueName } from "~/common/constants/queue-names";
import { OrderUpdateGateway } from "~/orders/order-update.gateway";
import { OrdersStatusService } from "~/orders/orders-status.service";
import { PaymentAccountsModule } from "../accounts/payment-accounts.module";
import { AsaasModule } from "../asaas/asaas.module";
import { CancelOrderService } from "../cancel-order.service";
import { CompleteOrderService } from "../complete-order.service";
import { ConfirmOrderPaymentService } from "../confirm-order-payment.service";
import { PayOrderService } from "../pay-order.service";
import { UpdateOrderConsumer } from "../processors/update-order.processor";
import { OrderUpdaterService } from "./order-updater.service";

@Module({
  imports: [
    AsaasModule,
    PaymentAccountsModule,
    BullModule.registerQueue({ name: QueueName.UpdateOrder }),
  ],
  providers: [
    OrderUpdaterService,
    PayOrderService,
    ConfirmOrderPaymentService,
    CompleteOrderService,
    CancelOrderService,
    OrdersStatusService,
    UpdateOrderConsumer,
    OrderUpdateGateway,
  ],
  exports: [OrderUpdaterService],
})
export class OrderUpdaterModule {}
