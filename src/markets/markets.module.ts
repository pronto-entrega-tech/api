import { Module } from '@nestjs/common';
import { SessionsModule } from '~/auth/sessions/sessions.module';
import { LocationModule } from '~/location/location.module';
import { PaymentAccountsModule } from '~/payments/accounts/payment-accounts.module';
import {
  MarketSubsController,
  MarketSubsPrivateController,
} from './market-subs.controller';
import {
  MarketsController,
  MarketsPrivateController,
} from './markets.controller';
import { MarketsService } from './markets.service';

@Module({
  imports: [SessionsModule, PaymentAccountsModule, LocationModule],
  controllers: [
    MarketsController,
    MarketsPrivateController,
    MarketSubsController,
    MarketSubsPrivateController,
  ],
  providers: [MarketsService],
})
export class MarketsModule {}
