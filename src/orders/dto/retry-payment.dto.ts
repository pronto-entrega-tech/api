import { IsEnum, IsOptional, Length } from "class-validator";
import {
  InAppPaymentMethod,
  PaymentMethod,
} from "~/payments/constants/payment-methods";
import { FullOrderId } from "./full-order-id.dto";

export class RetryOrderPaymentBody {
  @IsEnum(InAppPaymentMethod)
  readonly payment_method: PaymentMethod;

  @IsOptional()
  @Length(1, 256)
  readonly card_id?: string;
}

export type RetryOrderPaymentDto = RetryOrderPaymentBody &
  FullOrderId & { customer_id: string; ip: string };
