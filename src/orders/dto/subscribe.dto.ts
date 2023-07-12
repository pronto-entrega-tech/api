import TransformToBigInt from '~/common/decorators/to-bigint';

export class SubscribeOrdersDto {
  @TransformToBigInt()
  readonly order_id: bigint;

  readonly market_id: string;
}
