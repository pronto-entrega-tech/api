import { Type } from 'class-transformer';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';

export class CancelOrderDto {
  @Type(() => FullOrderId)
  readonly fullOrderId: FullOrderId;
}
