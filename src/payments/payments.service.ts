import { InjectQueue } from "@nestjs/bull";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { fail } from "assert";
import { Queue } from "bull";
import { plainToInstance } from "class-transformer";
import { QueueName } from "~/common/constants/queue-names";
import { Asaas } from "./asaas/asaas.types";
import { ConfirmInvoiceJobDto } from "./dto/confirm-invoice.dto";
import {
  fromInvoiceExternalId,
  fromOrderExternalId,
  getTypeFromExternalRef,
} from "./functions/external-id";
import { InvoicesService } from "./invoices.service";
import { OrderUpdaterService } from "./order-updater/order-updater.service";
import { PayoutsService } from "./payouts.service";

@Injectable()
export class PaymentsService {
  constructor(
    public readonly payouts: PayoutsService,
    public readonly invoices: InvoicesService,

    private readonly orderUpdater: OrderUpdaterService,
    @InjectQueue(QueueName.ConfirmInvoice)
    private readonly confirmInvoiceQueue: Queue<ConfirmInvoiceJobDto>,
  ) {}
  private readonly ASAAS_WH_SECRET = () =>
    process.env.ASAAS_WH_SECRET ?? fail("ASAAS_WH_SECRET must be defined");

  async handleWebhook(body: Asaas.WebHookBody, token: string) {
    if (token !== this.ASAAS_WH_SECRET()) throw new UnauthorizedException();

    await this.handleEvent(body);

    return { received: true };
  }

  private handleEvent({ event, payment }: Asaas.WebHookBody) {
    switch (event) {
      case "PAYMENT_RECEIVED":
        return this.confirmPayment(payment);
    }
  }

  private confirmPayment(payment: Asaas.WebHookBody["payment"]) {
    const [eventType] = getTypeFromExternalRef(payment.externalReference);

    switch (eventType) {
      case "order":
        return this.confirmOrderPayment(payment);
      case "invoice":
        return this.confirmInvoicePayment(payment);
    }
  }

  private async confirmInvoicePayment(payment: Asaas.WebHookBody["payment"]) {
    const billingType = payment.billingType;
    if (billingType !== "PIX" && billingType !== "BOLETO") return;

    const { invoice_id, month } = fromInvoiceExternalId(
      payment.externalReference,
    );

    const dto = plainToInstance(ConfirmInvoiceJobDto, {
      fullInvoiceId: { invoice_id, month },
    });
    await this.confirmInvoiceQueue.add(dto);
  }

  private async confirmOrderPayment(payment: Asaas.WebHookBody["payment"]) {
    const billingType = payment.billingType;
    if (billingType !== "PIX") return;

    const { order_id, market_id } = fromOrderExternalId(
      payment.externalReference,
    );

    await this.orderUpdater.confirmPayment({
      fullOrderId: { order_id: BigInt(order_id), market_id },
    });
  }
}
