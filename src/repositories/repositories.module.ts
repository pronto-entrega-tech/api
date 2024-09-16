import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "~/common/prisma/prisma.module";
import { AdminRepository } from "./admin/admin.repository";
import { ChatsRepository } from "./chats/chats.repository";
import { CustomersRepository } from "./customers/customers.repository";
import { ItemsRepository } from "./items/items.repository";
import { MarketsRepository } from "./markets/markets.repository";
import { OrdersRepository } from "./orders/orders.repository";
import { OTPRepository } from "./otp/otp.repository";
import { ProductsRepository } from "./products/products.repository";
import { SessionsRepository } from "./sessions/sessions.repository";

const providers = [
  AdminRepository,
  ChatsRepository,
  CustomersRepository,
  ItemsRepository,
  MarketsRepository,
  OrdersRepository,
  OTPRepository,
  ProductsRepository,
  SessionsRepository,
];

@Global()
@Module({
  imports: [PrismaModule],
  providers,
  exports: providers,
})
export class RepositoriesModule {}
