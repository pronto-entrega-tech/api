import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { QueueName } from '~/common/constants/queue-names';
import { PaymentAccountsModule } from './accounts/payment-accounts.module';
import { AsaasModule } from './asaas/asaas.module';
import { InvoicesStatusService } from './invoices-status.service';
import { InvoicesService } from './invoices.service';
import { OrderUpdaterModule } from './order-updater/order-updater.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { ProcessInvoiceService } from './process-invoice.service';
import { ConfirmInvoiceConsumer } from './processors/confirm-invoice.processor';
import { ProcessInvoiceConsumer } from './processors/process-invoice.processor';

@Module({
  imports: [
    AsaasModule,
    OrderUpdaterModule,
    PaymentAccountsModule,
    BullModule.registerQueue(
      { name: QueueName.ProcessInvoice },
      { name: QueueName.ConfirmInvoice },
    ),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    InvoicesService,
    PayoutsService,
    ProcessInvoiceService,
    InvoicesStatusService,
    ProcessInvoiceConsumer,
    ConfirmInvoiceConsumer,
  ],
})
export class PaymentsModule {}
