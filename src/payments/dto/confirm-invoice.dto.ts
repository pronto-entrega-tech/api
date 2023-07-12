import { Type } from 'class-transformer';
import { FullInvoiceId } from '~/markets/dto/full-invoice-id';

export class ConfirmInvoiceJobDto {
  @Type(() => FullInvoiceId)
  readonly fullInvoiceId: FullInvoiceId;
}
