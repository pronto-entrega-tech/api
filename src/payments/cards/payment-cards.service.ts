import { Injectable } from '@nestjs/common';
import { CreateCardDto } from '~/customers/dto/create-card.dto';
import { AsaasService } from '../asaas/asaas.service';

@Injectable()
export class PaymentCardsService {
  constructor(private readonly asaas: AsaasService) {}

  async create(payerId: string, card: CreateCardDto) {
    const cardToken = await this.asaas.tokenizeCard({
      customer: payerId,
      creditCardNumber: card.number,
      creditCardHolderName: card.holderName,
      creditCardExpiryMonth: card.expiryMonth,
      creditCardExpiryYear: card.expiryYear,
      creditCardCcv: card.cvv,
    });

    return {
      asaas_id: cardToken.creditCardToken,
      brand: cardToken.creditCardBrand,
      last4: cardToken.creditCardNumber,
    };
  }
}
