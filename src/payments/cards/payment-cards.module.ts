import { Module } from '@nestjs/common';
import { AsaasModule } from '../asaas/asaas.module';
import { OrderUpdaterModule } from '../order-updater/order-updater.module';
import { PaymentCardsService } from './payment-cards.service';

@Module({
  imports: [AsaasModule, OrderUpdaterModule],
  providers: [PaymentCardsService],
  exports: [PaymentCardsService],
})
export class PaymentCardsModule {}
