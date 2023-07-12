import { IsString } from 'class-validator';
import TransformToBigInt from '~/common/decorators/to-bigint';

export class FullOrderId {
  @TransformToBigInt()
  readonly order_id: bigint;

  @IsString()
  readonly market_id: string;
}
