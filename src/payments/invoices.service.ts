import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { market_invoice, orders } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Queue } from 'bull';
import { QueueName } from '~/common/constants/queue-names';
import { Month } from '~/common/functions/month';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { InvoiceAction } from './constants/invoice-status';
import { payDay } from './constants/pay-day';
import { ConfirmInvoiceJobDto } from './dto/confirm-invoice.dto';
import { ProcessInvoiceDto } from './dto/process-invoice.dto';
import { getAppAmount } from './functions/app-amount';
import { InvoicesStatusService } from './invoices-status.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesStatus: InvoicesStatusService,
    private readonly marketsRepo: MarketsRepository,
    private readonly ordersRepo: OrdersRepository,
    @InjectQueue(QueueName.ProcessInvoice)
    private readonly processInvoiceQueue: Queue<ProcessInvoiceDto>,
  ) {}

  async confirm({ fullInvoiceId }: ConfirmInvoiceJobDto) {
    await this.invoicesStatus.update(
      fullInvoiceId,
      InvoiceAction.ConfirmPayment,
      () => this.marketsRepo.invoices.complete(fullInvoiceId),
    );
  }

  @Cron(`0 0 ${payDay}-${payDay + 7} * * *`)
  async setup(now = new Date()) {
    const lastMonth = Month.previous(now);

    const exist = await this.marketsRepo.invoices.exist(lastMonth);
    if (!exist) await this.createMany(lastMonth);

    const invoices = await this.marketsRepo.invoices.findProcessing(lastMonth);

    await Promise.allSettled(invoices.map((i) => this.initProcessInvoice(i)));
  }

  private async createMany(lastMonth: Date) {
    const currentMonth = Month.next(lastMonth);
    const orders = await this.ordersRepo.findCompleted({
      from: lastMonth,
      to: currentMonth,
      paid_in_app: false,
    });

    await this.marketsRepo.invoices.createMany({
      month: lastMonth,
      marketsAmount: this.getMarketsAmount(orders),
    });
  }

  private getMarketsAmount(orders: orders[]) {
    const amounts = new Map<string, Prisma.Decimal>();

    orders.forEach(({ market_id, total }) => {
      const currentAmount = amounts.get(market_id) ?? 0;
      const newAmount = getAppAmount(total).plus(currentAmount);

      amounts.set(market_id, newAmount);
    });

    return [...amounts.entries()].map(([market_id, amount]) => ({
      market_id,
      amount,
    }));
  }

  private async initProcessInvoice(invoice: market_invoice) {
    const { market_id, amount, month } = invoice;

    await this.processInvoiceQueue.add(
      {
        fullInvoiceId: { invoice_id: invoice.id, month },
        market_id,
        amount,
      },
      { jobId: `${invoice.id}`, removeOnComplete: true },
    );
  }
}
