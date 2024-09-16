import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '~/payments/constants/payment-methods';
import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { prisma } from '~/common/prisma/prisma';
import { CreateOrderDto } from '../create-order/create-order.dto';

type Dto = Pick<
  CreateOrderDto,
  'market_id' | 'payment_method' | 'customer_id' | 'card_id'
>;

export async function validateInAppPayment(dto: Dto) {
  await Promise.all([
    validateMarketInAppPaymentSupport(dto),
    validatePaymentMethod(dto),
  ]);
}

async function validateMarketInAppPaymentSupport({ market_id }: Dto) {
  const m = await DB.readMarket(market_id);

  if (!(m.bank_account || (m.pix_key && m.pix_key_type)))
    throw new BadRequestException(
      "This market don't support the payment method chosen",
    );
}

async function validatePaymentMethod({
  payment_method: method,
  customer_id,
  card_id,
}: Dto) {
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
    const { document } = await DB.readCustomer(customer_id);

    if (!document)
      throw new BadRequestException(
        'customer must have document, when payment_method is PIX and paid_in_app is true',
      );
  }
}

namespace DB {
  export async function readMarket(market_id: string) {
    return prisma.market
      .findUniqueOrThrow({
        select: {
          pix_key: true,
          pix_key_type: true,
          bank_account: { select: { market_id: true } },
        },
        where: { market_id },
      })
      .catch(prismaNotFound('Market'));
  }

  export async function readCustomer(customer_id: string) {
    return prisma.customer
      .findUniqueOrThrow({
        select: { document: true },
        where: { customer_id },
      })
      .catch(prismaNotFound('Customer'));
  }
}
