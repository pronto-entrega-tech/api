import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Queue } from "bull";
import { QueueName } from "~/common/constants/queue-names";
import {
  CreateCustomerPayerDto,
  CustomerPayerReturnDto,
} from "../dto/create-customer-payer.dto";
import { CreatePayerDto, PayerReturnDto } from "../dto/create-payer.dto";
import {
  CreateRecipientDto,
  RecipientReturnDto,
} from "../dto/create-recipient.dto";
import { UpdateCustomerPayerDto } from "../dto/update-customer-payer.dto";

@Injectable()
export class PaymentAccountsService {
  constructor(
    @InjectQueue(QueueName.CreatePayer)
    private readonly createPayerQueue: Queue<CreatePayerDto>,
    @InjectQueue(QueueName.CreateRecipient)
    private readonly createRecipientQueue: Queue<CreateRecipientDto>,
    @InjectQueue(QueueName.CreateCustomerPayer)
    private readonly createCustomerPayerQueue: Queue<CreateCustomerPayerDto>,
    @InjectQueue(QueueName.UpdateCustomerPayer)
    private readonly updateCustomerPayerQueue: Queue<UpdateCustomerPayerDto>,
  ) {}

  initCreatePayer(market_id: string) {
    return this.createPayerQueue.add({ market_id }, { jobId: market_id });
  }

  initCreateRecipient(market_id: string) {
    return this.createRecipientQueue.add({ market_id }, { jobId: market_id });
  }

  initCreateCustomerPayer(dto: CreateCustomerPayerDto) {
    return this.createCustomerPayerQueue.add(dto, { jobId: dto.customer_id });
  }

  initUpdateCustomerPayer(dto: UpdateCustomerPayerDto) {
    return this.updateCustomerPayerQueue.add(dto, {
      jobId: dto.payer_id,
      removeOnComplete: true,
    });
  }

  async createPayer(market_id: string) {
    const job = await this.initCreatePayer(market_id);

    return job.finished() as Promise<PayerReturnDto>;
  }

  async createRecipient(market_id: string) {
    const job = await this.initCreateRecipient(market_id);

    return job.finished() as Promise<RecipientReturnDto>;
  }

  async createCustomerPayer(dto: CreateCustomerPayerDto) {
    const job = await this.initCreateCustomerPayer(dto);

    return job.finished() as Promise<CustomerPayerReturnDto>;
  }

  async updateCustomerPayer(dto: UpdateCustomerPayerDto) {
    const job = await this.initUpdateCustomerPayer(dto);

    await job.finished();
  }
}
