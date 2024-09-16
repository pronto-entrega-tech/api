import { Module } from "@nestjs/common";
import { SessionsModule } from "~/auth/sessions/sessions.module";
import { PaymentAccountsModule } from "~/payments/accounts/payment-accounts.module";
import { PaymentCardsModule } from "~/payments/cards/payment-cards.module";
import { CustomerAddressesService } from "./customer-addresses.service";
import { CustomerCardsService } from "./customer-cards.service";
import {
  CustomersController,
  CustomersPrivateController,
} from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [SessionsModule, PaymentAccountsModule, PaymentCardsModule],
  controllers: [CustomersController, CustomersPrivateController],
  providers: [CustomersService, CustomerAddressesService, CustomerCardsService],
})
export class CustomersModule {}
