import { payment_method, customer_card } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumberString,
  IsOptional,
  IsPositive,
  Length,
  Max,
  ValidateNested,
} from 'class-validator';
import { IsDecimalPositive } from '~/common/decorators/is-decimal-positive';
import TransformToDecimal from '~/common/decorators/to-decimal';
import { PaymentMethod } from '~/payments/constants/payment-methods';
import { ItemsRepository } from '~/repositories/items/items.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { OrdersService } from '../orders.service';

export class CreateOrderBody {
  @Length(1, 256)
  readonly market_id: string;

  @Length(1, 256)
  readonly address_street: string;

  @IsNumberString()
  readonly address_number: string;

  @Length(1, 256)
  readonly address_district: string;

  @Length(1, 256)
  readonly address_city: string;

  @Length(1, 256)
  readonly address_state: string;

  @IsOptional()
  @Length(1, 256)
  readonly address_complement?: string;

  @IsLatitude()
  readonly address_latitude: number;

  @IsLongitude()
  readonly address_longitude: number;

  @IsBoolean()
  readonly is_scheduled: boolean;

  @IsBoolean()
  readonly paid_in_app: boolean;

  @IsEnum(payment_method)
  readonly payment_method: PaymentMethod;

  @IsOptional()
  @IsNumberString()
  readonly payment_change?: string;

  @IsOptional()
  @Length(1, 256)
  readonly card_id?: string;

  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItem)
  readonly items: CreateOrderItem[];

  @TransformToDecimal()
  @IsDecimalPositive()
  readonly client_total: Decimal;
}

export class CreateOrderItem {
  @Length(1, 256)
  readonly item_id: string;

  @IsPositive()
  @Max(99)
  readonly quantity: number;
}

export type CreateOrderDto = CreateOrderBody & {
  readonly customer_id: string;
  readonly ip: string;
};

export type CreateOrderPreDto = {
  client: CreateOrderDto;
  server: {
    market: MarketsRepository.OrderCreationData;
    items: ItemsRepository.ItemById[];
    creditLogs?: OrdersRepository.CreditLog[];
    card?: customer_card;
    lastMarketOrderId: bigint;
  };
};

export type SaveOrderDto = Awaited<
  ReturnType<OrdersService['createOrderDto']>
> & { order_id?: bigint };

export class OrderItemDto {
  readonly prod_id: bigint | null;
  readonly quantity: Decimal.Value;
  readonly price: Decimal;
  readonly is_kit: boolean;
  readonly details?: OrderItemDetailsDto[];
}

export class OrderItemDetailsDto {
  readonly prod_id: bigint;
  readonly quantity: Decimal.Value;
}
