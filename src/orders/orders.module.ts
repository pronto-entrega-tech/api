import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { OrderUpdaterModule } from "~/payments/order-updater/order-updater.module";
import { OrdersStatusService } from "./orders-status.service";
import {
  OrderMarketController,
  OrderCustomerAndMarketController,
  OrdersCustomerController,
} from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderUpdateGateway } from "./order-update.gateway";
import { OrdersGateway } from "./orders.gateway";
import CreateOrderController from "./create-order/create-order.controller";

@Module({
  imports: [
    OrderUpdaterModule,
    JwtModule.register({
      secret: process.env.TOKEN_SECRET,
    }),
  ],
  controllers: [
    OrdersCustomerController,
    OrderCustomerAndMarketController,
    OrderMarketController,
    CreateOrderController,
  ],
  providers: [
    OrdersService,
    OrdersStatusService,
    OrdersGateway,
    OrderUpdateGateway,
  ],
})
export class OrdersModule {}
