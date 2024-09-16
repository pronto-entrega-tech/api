import { Type } from "class-transformer";
import { FullOrderId } from "~/orders/dto/full-order-id.dto";

export class CompleteOrderDto {
  @Type(() => FullOrderId)
  readonly fullOrderId: FullOrderId;
}
