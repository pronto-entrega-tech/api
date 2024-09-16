import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { QueueName } from "~/common/constants/queue-names";
import { AsaasService } from "../asaas/asaas.service";
import { UpdateCustomerPayerDto } from "../dto/update-customer-payer.dto";

@Processor(QueueName.UpdateCustomerPayer)
export class UpdateCustomerPayerConsumer {
  constructor(private readonly asaas: AsaasService) {}

  @Process()
  async exec(job: Job<UpdateCustomerPayerDto>) {
    const { payer_id, document } = job.data;

    await this.asaas.customers.update(payer_id, { cpfCnpj: document });
  }
}
