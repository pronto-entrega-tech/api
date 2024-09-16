import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { QueueName } from "~/common/constants/queue-names";
import { AsaasModule } from "../asaas/asaas.module";
import { CreateCustomerPayerConsumer } from "../processors/create-customer-payer.processor";
import { CreatePayerConsumer } from "../processors/create-payer.processor";
import { CreateRecipientConsumer } from "../processors/create-recipient.processor";
import { UpdateCustomerPayerConsumer } from "../processors/update-customer-payer.processor";
import { PaymentAccountsService } from "./payment-accounts.service";

@Module({
  imports: [
    AsaasModule,
    BullModule.registerQueue(
      { name: QueueName.CreatePayer },
      { name: QueueName.CreateRecipient },
      { name: QueueName.CreateCustomerPayer },
      { name: QueueName.UpdateCustomerPayer },
    ),
  ],
  providers: [
    PaymentAccountsService,
    CreatePayerConsumer,
    CreateRecipientConsumer,
    CreateCustomerPayerConsumer,
    UpdateCustomerPayerConsumer,
  ],
  exports: [PaymentAccountsService],
})
export class PaymentAccountsModule {}
