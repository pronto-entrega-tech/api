import { customer_card } from '@prisma/client';
import { capitalize } from '~/common/functions/capitalize';
import { PaymentMethod } from '~/payments/constants/payment-methods';
import { CreateOrderDto } from '../dto/create.dto';

export function getCardTokenAndPaymentDescription(
  dto: Pick<CreateOrderDto, 'card_id' | 'payment_method'>,
  card?: customer_card,
) {
  const cardBrand = getFormattedCardBrand();
  const payment_description = {
    [PaymentMethod.Cash]: 'Dinheiro',
    [PaymentMethod.Pix]: 'Pix',
    [PaymentMethod.Card]: `Crédito ${cardBrand} •••• ${card?.last4}`,
  }[dto.payment_method];

  return { card_token: card?.asaas_id, payment_description };

  function getFormattedCardBrand() {
    return capitalize((card?.brand ?? '').replace('UNKNOWN', 'Desconhecido'));
  }
}
