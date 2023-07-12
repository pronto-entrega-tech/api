import { Injectable, Logger } from '@nestjs/common';
import { Month } from '~/common/functions/month';
import { FullInvoiceId } from '~/markets/dto/full-invoice-id';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { PaymentAccountsService } from './accounts/payment-accounts.service';
import { AsaasService } from './asaas/asaas.service';
import { Asaas } from './asaas/asaas.types';
import { InvoiceAction } from './constants/invoice-status';
import { ProcessInvoiceDto } from './dto/process-invoice.dto';
import { InvoicesStatusService } from './invoices-status.service';

type PaymentExtra = {
  boleto_code?: string;
  boleto_pdf_url?: string;
  boleto_expires_at?: Date;
  pix_code?: string;
  pix_expires_at?: Date;
};

@Injectable()
export class ProcessInvoiceService {
  constructor(
    private readonly asaas: AsaasService,
    private readonly invoicesStatus: InvoicesStatusService,
    private readonly paymentAccounts: PaymentAccountsService,
    private readonly marketsRepo: MarketsRepository,
  ) {}
  private readonly logger = new Logger(ProcessInvoiceService.name);

  async exec(dto: ProcessInvoiceDto) {
    const successful = await this.checkExistingPayments(dto);
    if (successful) return;

    const { payment_id, extra } = await this.createPayment(dto);

    await this.confirmProcessing(dto, payment_id, extra);
  }

  private async checkExistingPayments(dto: ProcessInvoiceDto) {
    const { fullInvoiceId: fullId } = dto;

    const payments = await this.findByInvoice(fullId);

    if (payments.length > 1)
      this.logger.error(
        `Invoice ${fullId.invoice_id} has more that one payment`,
      );

    const [payment] = payments;
    if (!payment) return false;

    if (payment.status === 'OVERDUE') {
      await this.asaas.payments.delete(payment.id);
      return false;
    }

    if (payment.status === 'PENDING') {
      const extra = await this.paymentExtra(payment);

      await this.confirmProcessing(dto, payment.id, extra);
      return true;
    }

    await this.confirmPayment(dto, payment.id);
    return true;
  }

  private async createPayment(dto: ProcessInvoiceDto) {
    const { fullInvoiceId: fullId, amount, market_id } = dto;

    const monthYear = fullId.month.toLocaleDateString('BR').slice(3);

    const params: Asaas.CreatePayment = {
      billingType: 'BOLETO', // 'BOLETO' === (BOLETO && PIX)
      description: `Fatura ProntoEntrega ${monthYear}`,
      dueDate: Month.shortDate(Month.getNext()),
      value: +amount,
      customer: await this.payerId(market_id),
      externalReference: this.externalId(fullId),
    };
    const payment = await this.asaas.payments.create(params);

    return { payment_id: payment.id, extra: await this.paymentExtra(payment) };
  }

  private async confirmProcessing(
    dto: ProcessInvoiceDto,
    payment_id: string,
    extra: PaymentExtra,
  ) {
    const { fullInvoiceId: fullId } = dto;

    await this.invoicesStatus.update(
      fullId,
      InvoiceAction.ConfirmProcessing,
      (status) =>
        this.marketsRepo.invoices.update(fullId, {
          status,
          payment_id,
          ...extra,
        }),
    );
  }

  private async confirmPayment(dto: ProcessInvoiceDto, payment_id: string) {
    const { fullInvoiceId: fullId } = dto;

    await this.invoicesStatus.update(fullId, InvoiceAction.ConfirmPayment, () =>
      this.marketsRepo.invoices.complete(fullId, payment_id),
    );
  }

  private async paymentExtra(
    payment: Asaas.PaymentObject,
  ): Promise<PaymentExtra> {
    return {
      ...(await this.pix(payment)),
      ...(await this.boleto(payment)),
    };
  }

  private async pix(payment: Asaas.PaymentObject): Promise<PaymentExtra> {
    const pix = await this.asaas.payments.findPix(payment.id);

    return {
      pix_code: pix.payload,
      pix_expires_at: new Date(pix.expirationDate),
    };
  }

  private async boleto(payment: Asaas.PaymentObject): Promise<PaymentExtra> {
    const boleto = await this.asaas.payments.findBoleto(payment.id);

    return {
      boleto_code: boleto.identificationField,
      boleto_pdf_url: payment.bankSlipUrl,
      boleto_expires_at: new Date(payment.dueDate),
    };
  }

  private async payerId(market_id: string) {
    const payerId = await this.marketsRepo.findPayerId(market_id);
    if (payerId) return payerId;

    const { payer_id } = await this.paymentAccounts.createPayer(market_id);
    return payer_id;
  }

  private async findByInvoice(fullId: FullInvoiceId) {
    const externalId = this.externalId(fullId);

    const payment = await this.asaas.payments.findByExternalId(externalId);
    return payment.data;
  }

  private externalId({ invoice_id, month }: FullInvoiceId) {
    const monthYear = month.toISOString().slice(0, 7);
    return `invoice_${invoice_id}_${monthYear}`;
  }
}
