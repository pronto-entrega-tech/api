import { IsEnum, IsOptional, Length } from "class-validator";
import { CancelReason } from "../constants/cancel-reasons";
import { FullOrderId } from "./full-order-id.dto";

export class CancelOrderBody {
  @IsOptional()
  @IsEnum(CancelReason)
  readonly reason?: CancelReason;

  @IsOptional()
  @Length(1, 1000)
  readonly message?: string;
}

export type CancelOrderDto = CancelOrderBody &
  FullOrderId & { customer_id: string };
