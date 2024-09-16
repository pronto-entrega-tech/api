import { addDays } from "date-fns";
import { Month } from "~/common/functions/month";
import { CardData, PayOrderDto } from "~/payments/dto/pay-order.dto";
import { Asaas } from "../asaas/asaas.types";
import { InAppPaymentMethod } from "../constants/payment-methods";
import { getOrderExternalId } from "./external-id";

type PayCommonParams = {
  value: number;
  customer: string;
  split: Asaas.CreatePayment["split"];
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
      value: +calcPaymentAmount(),
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

  function calcPaymentAmount() {
    const { customer_debit: over_total, total } = dto;

    return !over_total ? total : total.plus(over_total);
  }

  function splitConfig(): Asaas.CreatePayment["split"] {
    const olderDebit = getOlderDebit();

    return [
      {
        walletId: dto.marketRecipientId,
        fixedValue: +dto.market_amount,
      },
      ...(olderDebit ? [olderDebit] : []),
    ];
  }

  function getOlderDebit() {
    const { debitMarketRecipientId, customer_debit: older_debit } = dto;
    if (!debitMarketRecipientId || !older_debit) return;

    return {
      walletId: debitMarketRecipientId,
      fixedValue: +older_debit,
    };
  }

  function card(
    commonParams: PayCommonParams,
    payData: CardData,
  ): Asaas.CreatePayment {
    return {
      ...commonParams,
      billingType: "CREDIT_CARD",
      creditCardToken: payData.card_token,
      remoteIp: payData.ip,
    };
  }

  function pix(commonParams: PayCommonParams): Asaas.CreatePayment {
    return {
      ...commonParams,
      billingType: "PIX",
    };
  }
}
