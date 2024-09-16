import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueueName } from "~/common/constants/queue-names";
import { CancelOrderService } from "../cancel-order.service";
import { CompleteOrderService } from "../complete-order.service";
import { ConfirmOrderPaymentService } from "../confirm-order-payment.service";
import { UpdateOrder } from "../constants/update-order";
import { CancelOrderDto } from "../dto/cancel-order.dto";
import { CompleteOrderDto } from "../dto/complete-order.dto";
import { ConfirmOrderPaymentDto } from "../dto/confirm-order-payment.dto";
import { PayOrderDto } from "../dto/pay-order.dto";
import { PayOrderBaseDto } from "../dto/pay-order.dto";
import { PayOrderService } from "../pay-order.service";

@Processor(QueueName.UpdateOrder)
export class UpdateOrderConsumer {
  constructor(
    private readonly payOrder: PayOrderService,
    private readonly confirmOrderPayment: ConfirmOrderPaymentService,
    private readonly completeOrderService: CompleteOrderService,
    private readonly cancelOrder: CancelOrderService,
  ) {}

  @Process(UpdateOrder.Pay)
  async pay(job: Job<PayOrderBaseDto>) {
    const dto = plainToInstance(PayOrderBaseDto, job.data) as PayOrderDto;
    await validateOrReject(dto);

    return this.payOrder.exec(dto);
  }

  @Process(UpdateOrder.ConfirmPayment)
  async confirmPayment(job: Job<ConfirmOrderPaymentDto>) {
    const dto = plainToInstance(ConfirmOrderPaymentDto, job.data);
    await validateOrReject(dto);

    return this.confirmOrderPayment.exec(dto);
  }

  @Process(UpdateOrder.Complete)
  async complete(job: Job<CompleteOrderDto>) {
    const dto = plainToInstance(CompleteOrderDto, job.data);
    await validateOrReject(dto);

    return this.completeOrderService.exec(dto);
  }

  @Process(UpdateOrder.Cancel)
  async cancel(job: Job<CancelOrderDto>) {
    const dto = plainToInstance(CancelOrderDto, job.data);
    await validateOrReject(dto);

    return this.cancelOrder.exec(dto);
  }
}
