import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { envPath } from './common/functions/env-path';
import { MutexModule } from './common/mutex/mutex.module';
import { CustomersModule } from './customers/customers.module';
import { ItemsModule } from './items/items.module';
import { LocationModule } from './location/location.module';
import { MarketsModule } from './markets/markets.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { RepositoriesModule } from './repositories/repositories.module';
import {
  ControllerInjector,
  GuardInjector,
  LoggerInjector,
  ScheduleInjector,
  OpenTelemetryModule,
} from '@metinseylan/nestjs-opentelemetry';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { RepositoryInjector } from './common/monitoring/repository.injector';
import { ChatsModule } from './chats/chats.module';

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'api',
      }),
      traceAutoInjectors: [
        ControllerInjector,
        RepositoryInjector,
        GuardInjector,
        LoggerInjector,
        ScheduleInjector,
      ],
      spanProcessor: new SimpleSpanProcessor(new ZipkinExporter()),
    }),
    ConfigModule.forRoot({ envFilePath: envPath() }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({}),
    MutexModule,
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
