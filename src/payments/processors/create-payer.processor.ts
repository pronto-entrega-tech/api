import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { QueueName } from "~/common/constants/queue-names";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { AsaasService } from "../asaas/asaas.service";
import { CreatePayerDto, PayerReturnDto } from "../dto/create-payer.dto";
import { getMarketExternalId } from "../functions/external-id";

@Processor(QueueName.CreatePayer)
export class CreatePayerConsumer {
  constructor(
    private readonly asaas: AsaasService,
    private readonly marketsRepo: MarketsRepository,
  ) {}

  @Process()
  async create(job: Job<CreatePayerDto>): Promise<PayerReturnDto> {
    const { market_id } = job.data;

    const payer_id = await this.payerId(market_id);

    await this.marketsRepo.updatePayerId(market_id, payer_id);

    return { payer_id };
  }

  private async payerId(market_id: string) {
    const market = await this.marketsRepo.identificationData(market_id);

    const page = await this.asaas.customers.findByExternalId(
      getMarketExternalId(market_id),
    );
    const payer = page.data.at(0);
    if (payer) return payer.id;

    const { id: payer_id } = await this.asaas.customers.create({
      name: market.name,
      email: market.email,
      cpfCnpj: market.document,
      notificationDisabled: true,
      groupName: "market",
      externalReference: getMarketExternalId(market_id),
    });

    return payer_id;
  }
}
