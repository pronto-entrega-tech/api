import { Decimal } from '@prisma/client/runtime';
import { Type } from 'class-transformer';
import TransformToDecimal from '~/common/decorators/to-decimal';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';
import { InAppPaymentMethod } from '~/payments/constants/payment-methods';

export class PayOrderBaseDto {
  @Type(() => FullOrderId)
  readonly fullOrderId: FullOrderId;

  readonly customer_id: string;

  @TransformToDecimal()
  readonly total: Decimal;

  @TransformToDecimal()
  readonly market_amount: Decimal.Value;

  readonly payment_method: InAppPaymentMethod;

  @TransformToDecimal()
  readonly customer_debit?: Decimal.Value;

  readonly debit_market_id?: string;
}

export class CardData {
  readonly payment_method: InAppPaymentMethod.Card;
  readonly card_token: string;
  readonly ip: string;
}

export class PixData {
  readonly payment_method: InAppPaymentMethod.Pix;
}

export type PayOrderDto = PayOrderBaseDto & (CardData | PixData);
