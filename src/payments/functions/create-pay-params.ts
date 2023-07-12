import { addDays } from 'date-fns';
import { Month } from '~/common/functions/month';
import { CardData, PayOrderDto } from '~/payments/dto/pay-order.dto';
import { Asaas } from '../asaas/asaas.types';
import { InAppPaymentMethod } from '../constants/payment-methods';
import { getOrderExternalId } from './external-id';

type PayCommonParams = {
  value: number;
  customer: string;
  split: Asaas.CreatePayment['split'];
  dueDate: string;
  externalReference: string;
};

export async function createPayParams(
  dto: PayOrderDto & {
    customerPayerId: string;
    marketRecipientId: string;
    debitMarketRecipientId?: string;
  },
) {
  {
    const commonParams: PayCommonParams = {
      customer: dto.customerPayerId,
      value: +calculePaymentAmount(),
      split: splitConfig(),
      dueDate: Month.shortDate(addDays(new Date(), 30)),
      externalReference: getOrderExternalId(dto.fullOrderId),
    };

    switch (dto.payment_method) {
      case InAppPaymentMethod.Card:
        return card(commonParams, dto);
      case InAppPaymentMethod.Pix:
        return pix(commonParams);
    }
  }

  function calculePaymentAmount() {
    const { customer_debit, total } = dto;

    return !customer_debit ? total : total.plus(customer_debit);
  }

  function splitConfig(): Asaas.CreatePayment['split'] {
    const debit = getDebit();

    return [
      {
        walletId: dto.marketRecipientId,
        fixedValue: +dto.market_amount,
      },
      ...(debit ? [debit] : []),
    ];
  }

  function getDebit() {
    const { debitMarketRecipientId, customer_debit } = dto;
    if (!debitMarketRecipientId || !customer_debit) return;

    return {
      walletId: debitMarketRecipientId,
      fixedValue: +customer_debit,
    };
  }

  function card(
    commonParams: PayCommonParams,
    payData: CardData,
  ): Asaas.CreatePayment {
    return {
      ...commonParams,
      billingType: 'CREDIT_CARD',
      creditCardToken: payData.card_token,
      remoteIp: payData.ip,
    };
  }

  function pix(commonParams: PayCommonParams): Asaas.CreatePayment {
    return {
      ...commonParams,
      billingType: 'PIX',
    };
  }
}
