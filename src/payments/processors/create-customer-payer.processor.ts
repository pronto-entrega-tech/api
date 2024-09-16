import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { QueueName } from "~/common/constants/queue-names";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { AsaasService } from "../asaas/asaas.service";
import {
  CreateCustomerPayerDto,
  CustomerPayerReturnDto,
} from "../dto/create-customer-payer.dto";
import { getCustomerExternalId } from "../functions/external-id";

@Processor(QueueName.CreateCustomerPayer)
export class CreateCustomerPayerConsumer {
  constructor(
    private readonly asaas: AsaasService,
    private readonly customersRepo: CustomersRepository,
  ) {}

  @Process()
  async create(
    job: Job<CreateCustomerPayerDto>,
  ): Promise<CustomerPayerReturnDto> {
    const { customer_id } = job.data;

    const payer = await this.createPayer(job.data);

    await this.customersRepo.updatePayerId(customer_id, payer.id);

    return payer;
  }

  private async createPayer(dto: CreateCustomerPayerDto) {
    const { customer_id, name, email, document } = dto;

    const page = await this.asaas.customers.findByExternalId(
      getCustomerExternalId(customer_id),
    );
    const payer = page.data.at(0);
    if (payer) return { id: payer.id };

    const newPayer = await this.asaas.customers.create({
      name,
      email,
      cpfCnpj: document,
      notificationDisabled: true,
      groupName: "customer",
      externalReference: getCustomerExternalId(customer_id),
    });

    return { id: newPayer.id };
  }
}
