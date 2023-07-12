import { Prisma } from '@prisma/client';
import { Month } from '~/common/functions/month';
import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { PrismaService } from '~/common/prisma/prisma.service';
import { FullInvoiceId } from '~/markets/dto/full-invoice-id';
import { CreateInvoices, UpdateInvoice } from '~/markets/dto/invoice';
import { InvoiceStatus } from '~/payments/constants/invoice-status';
import { Partitions } from '../partitions';

const idMonth = ({ invoice_id, month }: FullInvoiceId) => ({
  id: invoice_id,
  month,
});

export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly partitions = new Partitions(this.prisma);

  async createMany(dto: CreateInvoices) {
    const { marketsAmount, month } = dto;

    const invoices = marketsAmount.map((v) =>
      Prisma.validator<Prisma.market_invoiceCreateManyInput>()({
        ...v,
        month,
      }),
    );

    const lastYear = Month.previous(month);

    await this.prisma.$transaction([
      this.createInvoicePartition(month),
      this.prisma.market_invoice.createMany({ data: invoices }),
      this.dropInvoicePartition(lastYear),
    ]);
  }

  async exist(month: Date) {
    const table = Prisma.ModelName.market_invoice;
    return this.partitions.exist(table, month);
  }

  async findByMarket(market_id: string) {
    return this.prisma.market_invoice.findMany({
      where: { market_id },
    });
  }

  async findProcessing(month: Date) {
    return this.prisma.market_invoice.findMany({
      where: { month, status: InvoiceStatus.Processing },
    });
  }

  async findOne(fullId: FullInvoiceId) {
    return this.prisma.market_invoice
      .findUniqueOrThrow({
        where: { id_month: idMonth(fullId) },
      })
      .catch(prismaNotFound('Invoice'));
  }

  async status(fullId: FullInvoiceId) {
    const invoice = await this.prisma.market_invoice
      .findUniqueOrThrow({
        select: { status: true },
        where: { id_month: idMonth(fullId) },
      })
      .catch(prismaNotFound('Invoice'));

    return invoice.status;
  }

  async update(fullId: FullInvoiceId, dto: UpdateInvoice) {
    return this.prisma.market_invoice.update({
      data: dto,
      where: { id_month: idMonth(fullId) },
    });
  }

  async complete(fullId: FullInvoiceId, payment_id?: string) {
    return this.prisma.market_invoice.update({
      data: {
        payment_id,
        status: InvoiceStatus.Paid,
        paid_at: new Date(),
        boleto_code: null,
        boleto_pdf_url: null,
        boleto_expires_at: null,
        pix_code: null,
        pix_expires_at: null,
      },
      where: { id_month: idMonth(fullId) },
    });
  }

  private createInvoicePartition(month: Date) {
    return this.partitions.createMonthly(
      month,
      Prisma.ModelName.market_invoice,
    );
  }

  private dropInvoicePartition(lastYear: Date) {
    const y = lastYear.getUTCFullYear();
    const m = lastYear.getUTCMonth() + 1;

    const table = Prisma.ModelName.market_invoice;
    return this.prisma.$executeRawUnsafe(
      `DROP TABLE IF EXISTS ${table}_${y}_${m}`,
    );
  }
}
