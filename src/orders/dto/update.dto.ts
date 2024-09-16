import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsJWT,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { DecimalSize } from '~/common/decorators/decimal-size';
import TransformToBigInt from '~/common/decorators/to-bigint';
import TransformToDecimal from '~/common/decorators/to-decimal';
import { OrderPublicAction, OrderStatus } from '../constants/order-status';
import { FullOrderId } from './full-order-id.dto';

export class UpdateOrderBody {
  @IsEnum(OrderPublicAction)
  readonly action: OrderPublicAction;

  @IsOptional()
  @IsJWT()
  readonly confirmation_token?: string;
}

export type UpdateOrderDto = UpdateOrderBody & FullOrderId;

export class CreateConfirmationTokenBody {
  @IsOptional()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderMissingItem)
  readonly missing_items?: OrderMissingItem[];
}

export type CreateConfirmationTokenDto = CreateConfirmationTokenBody &
  FullOrderId & { customer_id: string };

export class OrderMissingItem {
  @TransformToBigInt()
  readonly order_item_id: bigint;

  @TransformToDecimal()
  @DecimalSize(5, 3)
  readonly quantity: Prisma.Decimal;
}

type UpdateOrderExtra = Pick<
  Prisma.ordersUncheckedUpdateInput,
  | 'customer_debit'
  | 'ip'
  | 'payment_id'
  | 'payment_description'
  | 'payment_method'
  | 'card_token'
  | 'pix_code'
  | 'pix_expires_at'
  | 'cancel_reason'
  | 'cancel_message'
  | 'finished_at'
>;

export type UpdateOrderPaymentDto = UpdateOrderExtra & {
  status?: OrderStatus;
  missing_items?: OrderMissingItem[];
} & (CompletingOrder | NonCompletingOrder);

export type UpdateOrderExtraDto = UpdateOrderExtra & {
  missing_items?: OrderMissingItem[];
} & (CompletingOrder | NonCompletingOrder);

type CompletingOrder = {
  increasePayout: true;
  payoutMonth: Date;
};

type NonCompletingOrder = {
  increasePayout?: false;
  payoutMonth?: undefined;
};
