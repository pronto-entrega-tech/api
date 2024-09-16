import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { envPath } from "./common/functions/env-path";
import { MutexModule } from "./common/mutex/mutex.module";
import { CustomersModule } from "./customers/customers.module";
import { ItemsModule } from "./items/items.module";
import { LocationModule } from "./location/location.module";
import { MarketsModule } from "./markets/markets.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { ProductsModule } from "./products/products.module";
import { RepositoriesModule } from "./repositories/repositories.module";
import { ChatsModule } from "./chats/chats.module";
import {
  ControllerInjector,
  GuardInjector,
  ConsoleLoggerInjector,
  ScheduleInjector,
  OpenTelemetryModule,
} from "@amplication/opentelemetry-nestjs";
import { RepositoryInjector } from "./common/monitoring/repository.injector";
import { Tracing } from "@amplication/opentelemetry-nestjs";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { FastifyMulterModule } from "@nest-lab/fastify-multer";

Tracing.init({
  serviceName: "api",
  spanProcessor: new BatchSpanProcessor(new ZipkinExporter()),
});

@Module({
  imports: [
    OpenTelemetryModule.forRoot([
      ControllerInjector,
      RepositoryInjector,
      GuardInjector,
      ConsoleLoggerInjector,
      ScheduleInjector,
    ]),
    ConfigModule.forRoot({ envFilePath: envPath() }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({}),
    MutexModule,
    FastifyMulterModule,
    RepositoriesModule,
    AuthModule,
    ProductsModule,
    ItemsModule,
    MarketsModule,
    CustomersModule,
    OrdersModule,
    PaymentsModule,
    LocationModule,
    ChatsModule,
  ],
})
export class AppModule {}
