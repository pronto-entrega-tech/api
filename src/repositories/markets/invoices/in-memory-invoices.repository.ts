import { market_invoice } from '@prisma/client';
import { NotFoundError } from '~/common/errors/not-found';
import { FullInvoiceId } from '~/markets/dto/full-invoice-id';
import { CreateInvoices, UpdateInvoice } from '~/markets/dto/invoice';
import { InvoiceStatus } from '~/payments/constants/invoice-status';

export class InMemoryInvoicesRepository {
  private readonly invoices = [] as market_invoice[];

  async createMany(dto: CreateInvoices) {
    dto.marketsAmount.map((v) => {
      this.invoices.push({
        id: BigInt(this.invoices.length + 1),
        ...v,
        month: dto.month,
        status: InvoiceStatus.Processing,
        payment_id: null,
        paid_at: null,
        boleto_code: null,
        boleto_pdf_url: null,
        boleto_expires_at: null,
        pix_code: null,
        pix_expires_at: null,
      });
    });
  }

  async findByMarket(market_id: string) {
    return this.invoices.filter((i) => i.market_id === market_id);
  }

  async findProcessing(month: Date) {
    return this.invoices.filter(
      (i) => +i.month === +month && i.status === InvoiceStatus.Processing,
    );
  }

  async exist(month: Date) {
    return !!this.invoices.find((i) => +i.month === +month);
  }

  async findOne({ invoice_id }: FullInvoiceId) {
    const invoice = this.invoices.find((i) => i.id === invoice_id);
    if (!invoice) throw new NotFoundError('Invoice');

    return invoice;
  }

  async status({ invoice_id }: FullInvoiceId) {
    const invoice = this.invoices.find((i) => i.id === invoice_id);
    if (!invoice) throw new NotFoundError('Invoice');

    return invoice.status;
  }

  async update({ invoice_id, month }: FullInvoiceId, dto: UpdateInvoice) {
    const i = this.invoices.findIndex(
      (v) => v.id === invoice_id && +v.month === +month,
    );
    if (i < 0) throw new NotFoundError('Invoice');

    this.invoices[i] = {
      ...this.invoices[i],
      ...dto,
    };
    return this.invoices[i];
  }

  async complete({ invoice_id, month }: FullInvoiceId, payment_id?: string) {
    const i = this.invoices.findIndex(
      (v) => v.id === invoice_id && +v.month === +month,
    );
    if (i < 0) throw new NotFoundError('Invoice');

    this.invoices[i] = {
      ...this.invoices[i],
      status: InvoiceStatus.Paid,
      payment_id: payment_id ?? null,
      paid_at: new Date(),
      boleto_code: null,
      boleto_pdf_url: null,
      boleto_expires_at: null,
      pix_code: null,
      pix_expires_at: null,
    };
    return this.invoices[i];
  }
}
