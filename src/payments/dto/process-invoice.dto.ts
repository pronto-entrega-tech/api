import { Decimal } from '@prisma/client/runtime';
import { Type } from 'class-transformer';
import TransformToDecimal from '~/common/decorators/to-decimal';
import { FullInvoiceId } from '~/markets/dto/full-invoice-id';

export class ProcessInvoiceDto {
  @Type(() => FullInvoiceId)
  readonly fullInvoiceId: FullInvoiceId;

  readonly market_id: string;

  @TransformToDecimal()
  readonly amount: Decimal;
}
