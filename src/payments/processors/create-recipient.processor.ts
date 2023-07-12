import { Process, Processor } from '@nestjs/bull';
import { fail } from 'assert';
import { Job } from 'bull';
import { QueueName } from '~/common/constants/queue-names';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { AsaasService } from '../asaas/asaas.service';
import {
  CreateRecipientDto,
  RecipientReturnDto,
} from '../dto/create-recipient.dto';

@Processor(QueueName.CreateRecipient)
export class CreateRecipientConsumer {
  constructor(
    private readonly asaas: AsaasService,
    private readonly marketsRepo: MarketsRepository,
  ) {}

  @Process()
  async create(job: Job<CreateRecipientDto>): Promise<RecipientReturnDto> {
    const { market_id } = job.data;
    const market = await this.marketsRepo.identificationData(market_id);
    const document = await this.marketsRepo.documentData(market.document);

    const recipient = await this.createRecipient(market, document);

    await this.marketsRepo.updateRecipient(market_id, recipient);

    return recipient;
  }

  private async createRecipient(
    market: MarketsRepository.IdentificationData,
    documentData: MarketsRepository.DocumentData,
  ) {
    const page = await this.asaas.accounts.findByEmail(market.email);
    const recipient = page.data.at(0);
    if (recipient) return { id: recipient.walletId, key: recipient.apiKey };

    const account = await this.asaas.accounts.create({
      email: market.email,
      cpfCnpj: market.document,
      name: documentData.legalName,
      phone: documentData.phone,
      postalCode: documentData.address.postalCode,
      addressNumber: documentData.address.number,
      companyType: this.companyType(documentData.legalName),
    });

    return { id: account.walletId, key: account.apiKey };
  }

  private companyType(name: string) {
    const abbreviation = name.split(' ').at(-1) ?? '';

    const companyType = (
      {
        MEI: 'MEI',
        LTDA: 'LIMITED',
        EIRELI: 'INDIVIDUAL',
        SA: 'ASSOCIATION',
      } as const
    )[abbreviation];

    return companyType ?? fail(`Unhandled companyType: ${companyType}`);
  }
}
