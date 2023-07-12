import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '~/payments/constants/payment-methods';
import { CreateOrderDto } from '../dto/create.dto';
import { OrdersCommonRepo as Repo } from './orders-common.repo';

export async function validateInAppPayment(
  dto: Pick<
    CreateOrderDto,
    'customer_id' | 'market_id' | 'card_id' | 'payment_method'
  >,
) {
  await Promise.all([
    validateMarketInAppPaymentSupport(dto.market_id),
    validatePaymentMethod(dto),
  ]);
}

async function validateMarketInAppPaymentSupport(market_id: string) {
  const has = await Repo.marketSupportInAppPayment(market_id);

  if (!has)
    throw new BadRequestException(
      "This market don't support the payment method chosen",
    );
}

async function validatePaymentMethod(
  dto: Pick<CreateOrderDto, 'customer_id' | 'card_id' | 'payment_method'>,
) {
  const { payment_method: method, customer_id, card_id } = dto;

  switch (method) {
    case PaymentMethod.Card:
      return validateCardId();

    case PaymentMethod.Pix:
      return validateCustomerDocument();

    case PaymentMethod.Cash:
      throw new BadRequestException(
        "payment_method CASH can't be used when paid_in_app is true",
      );
  }

  function validateCardId() {
    if (!card_id)
      throw new BadRequestException(
        'card_id must be provided, when payment_method is CARD and paid_in_app is true',
      );
  }

  async function validateCustomerDocument() {
    const { document } = await Repo.customerDocument(customer_id);

    if (!document)
      throw new BadRequestException(
        'customer must have document, when payment_method is PIX and paid_in_app is true',
      );
  }
}
