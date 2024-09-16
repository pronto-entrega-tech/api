import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueueName } from "~/common/constants/queue-names";
import { ConfirmInvoiceJobDto } from "../dto/confirm-invoice.dto";
import { InvoicesService } from "../invoices.service";

@Processor(QueueName.ConfirmInvoice)
export class ConfirmInvoiceConsumer {
  constructor(private readonly invoices: InvoicesService) {}

  @Process()
  async exec(job: Job) {
    const dto = plainToInstance(ConfirmInvoiceJobDto, job.data);
    await validateOrReject(dto);

    await this.invoices.confirm(dto);
  }
}
