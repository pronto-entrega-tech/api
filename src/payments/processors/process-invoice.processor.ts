import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueueName } from "~/common/constants/queue-names";
import { ProcessInvoiceDto } from "../dto/process-invoice.dto";
import { ProcessInvoiceService } from "../process-invoice.service";

@Processor(QueueName.ProcessInvoice)
export class ProcessInvoiceConsumer {
  constructor(private readonly processInvoice: ProcessInvoiceService) {}

  @Process({ concurrency: 10 })
  async exec(job: Job) {
    const dto = plainToInstance(ProcessInvoiceDto, job.data);
    await validateOrReject(dto);

    return this.processInvoice.exec(dto);
  }
}
