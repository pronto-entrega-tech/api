import { Injectable } from '@nestjs/common';
import { OrderAction } from '~/orders/constants/order-status';
import { FullOrderId } from '~/orders/dto/full-order-id.dto';
import { OrdersStatusService } from '~/orders/orders-status.service';
import { PayOrderDto } from '~/payments/dto/pay-order.dto';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { PaymentAccountsService } from './accounts/payment-accounts.service';
import { AsaasService } from './asaas/asaas.service';
import { InAppPaymentMethod } from './constants/payment-methods';
import { createPayParams } from './functions/create-pay-params';
import {
  fromCustomerExternalId,
  getOrderExternalId,
} from './functions/external-id';
import {
  orderPaymentPendingAction,
  OrderPayUpdate,
} from './functions/order-payment-pending-action';

@Injectable()
export class PayOrderService {
  constructor(
    private readonly asaas: AsaasService,
    private readonly ordersStatus: OrdersStatusService,
    private readonly paymentAccounts: PaymentAccountsService,
    private readonly ordersRepo: OrdersRepository,
    private readonly customersRepo: CustomersRepository,
    private readonly marketsRepo: MarketsRepository,
  ) {}

  async exec(dto: PayOrderDto) {
    const { action, data } = await this.orderPaymentPendingAction(dto);

    switch (action) {
      case 'createPayment':
        return this.createPayment(dto);
      case 'recreatePayment':
        await this.asaas.payments.delete(data);
        return this.createPayment(dto);
      case 'updateOrder':
        return this.updateOrder(dto.fullOrderId, data);
    }
  }

  private async createPayment(dto: PayOrderDto) {
    const update = await this.createPaymentOnAsaas(dto);

    await this.updateOrder(dto.fullOrderId, update);
  }

  private async createPaymentOnAsaas(dto: PayOrderDto) {
    try {
      const params = await this.createPayParams(dto);

      if (dto.payment_method === InAppPaymentMethod.Pix)
        this.ensurePayerHasDocument(params.customer);

      const payment = await this.asaas.payments.create(params);

      switch (dto.payment_method) {
        case InAppPaymentMethod.Card:
          return {
            action: OrderAction.ConfirmPayment,
            payment_id: payment.id,
          };
        case InAppPaymentMethod.Pix:
          return {
            action: OrderAction.QuasiConfirmPayment,
            payment_id: payment.id,
            extra: await this.getPix(payment.id),
          };
      }
    } catch (err) {
      if (this.asaas.errors.isInvalidCard(err))
        return {
          action: OrderAction.FailPayment,
        };

      throw err;
    }
  }

  private updateOrder(
    fullOrderId: FullOrderId,
    { payment_id, action, payment_method, extra }: OrderPayUpdate,
  ) {
    return this.ordersStatus.update(fullOrderId, action, {
      payment_id,
      payment_method,
      pix_code: null,
      pix_expires_at: null,
      ...extra,
    });
  }

  private async ensurePayerHasDocument(payer_id: string) {
    const payer = await this.asaas.customers.find(payer_id);
    if (payer.cpfCnpj) return;

    const customer_id = fromCustomerExternalId(payer.externalReference);

    const { document } = await this.customersRepo.findOne(customer_id);
    if (!document)
      throw new Error(`Customer ${customer_id} don't have document`);

    await this.paymentAccounts.updateCustomerPayer({
      payer_id,
      document,
    });
  }

  private async getPix(paymentId: string) {
    const pix = await this.asaas.payments.findPix(paymentId);

    return {
      pix_code: pix.payload,
      pix_expires_at: new Date(pix.expirationDate),
    };
  }

  private async orderPaymentPendingAction(dto: PayOrderDto) {
    const status = await this.ordersRepo.status(dto.fullOrderId);

    return orderPaymentPendingAction({
      ...dto,
      status,
      getPix: (id) => this.getPix(id),
      getExistingPayments: async () => {
        const { data } = await this.asaas.payments.findByExternalId(
          getOrderExternalId(dto.fullOrderId),
        );
        return data;
      },
    });
  }

  private async createPayParams(dto: PayOrderDto) {
    const getCustomerPayerId = async () => {
      const { customer_id } = dto;
      const payerId = await this.customersRepo.findPayerId(customer_id);
      if (payerId) return payerId;

      const customer = await this.customersRepo.findOne(customer_id);
      const payer = await this.paymentAccounts.createCustomerPayer({
        customer_id,
        name: customer.name,
        email: customer.email,
        document: customer.document ?? undefined,
      });
      return payer.id;
    };

    const getRecipientId = async (market_id: string) => {
      const recipientId = await this.marketsRepo.findRecipientId(market_id);
      if (recipientId) return recipientId;

      const has = await this.marketsRepo.hasInAppPaymentSupport(market_id);
      if (!has) throw new Error(`Market ${market_id} don't have bank account`);

      const recipient = await this.paymentAccounts.createRecipient(market_id);
      return recipient.id;
    };

    return createPayParams({
      ...dto,
      customerPayerId: await getCustomerPayerId(),
      marketRecipientId: await getRecipientId(dto.fullOrderId.market_id),
      debitMarketRecipientId:
        dto.debit_market_id && (await getRecipientId(dto.debit_market_id)),
    });
  }
}
