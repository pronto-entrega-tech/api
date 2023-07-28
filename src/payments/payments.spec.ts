import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime';
import { describe, beforeEach, it, expect } from 'vitest';
import { lastMonth, currentMonth, nextMonth } from '@test/examples/common';
import { createCustomer } from '@test/examples/customer';
import { createAsaasAccount, createMarket } from '@test/examples/market';
import { saveOrder, createOrder, createPayment } from '@test/examples/order';
import { day } from '@test/functions/day-of';
import { FakeBullModule } from '~/common/bull/fake-bull.module';
import { QueueName } from '~/common/constants/queue-names';
import { Month } from '~/common/functions/month';
import { FakeMutexModule } from '~/common/mutex/fake-mutex.module';
import { OrderStatus } from '~/orders/constants/order-status';
import { SaveOrderDto } from '~/orders/dto/create.dto';
import { OrdersStatusService } from '~/orders/orders-status.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { InMemoryRepositoriesModule } from '~/repositories/in-memory-repositories.module';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { PaymentAccountsService } from './accounts/payment-accounts.service';
import { AsaasService } from './asaas/asaas.service';
import { FakeAsaasModule } from './asaas/fake-asaas.module';
import { CancelOrderService } from './cancel-order.service';
import { PaymentCardsService } from './cards/payment-cards.service';
import { CompleteOrderService } from './complete-order.service';
import { ConfirmOrderPaymentService } from './confirm-order-payment.service';
import { InvoiceStatus } from './constants/invoice-status';
import { InAppPaymentMethod, PaymentMethod } from './constants/payment-methods';
import { InvoicesStatusService } from './invoices-status.service';
import { InvoicesService } from './invoices.service';
import { OrderUpdaterService } from './order-updater/order-updater.service';
import { PayOrderService } from './pay-order.service';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { ProcessInvoiceService } from './process-invoice.service';
import { fail } from 'assert';

class FakePaymentAccounts {
  createCustomerPayer = () => ({ id: 'customerPayerId' });
  createRecipient = () => ({ id: 'recipientId' });
}

let payments: PaymentsService;
let payOrder: PayOrderService;
let confirmOrderPay: ConfirmOrderPaymentService;
let completeOrder: CompleteOrderService;
let cancelOrder: CancelOrderService;
let processInvoice: ProcessInvoiceService;
let asaas: AsaasService;
let ordersRepo: OrdersRepository;
let marketsRepo: MarketsRepository;
let customersRepo: CustomersRepository;

const { walletId: recipientId, apiKey: recipientKey } = createAsaasAccount;
const { payment_id } = createPayment;
const { customer_id } = createCustomer;
const { market_id } = createMarket;
const fullOrderId = { order_id: createOrder.order_id, market_id };
const fullInvoiceId = { invoice_id: 1n, month: lastMonth };

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [
      InMemoryRepositoriesModule,
      FakeAsaasModule,
      FakeMutexModule,
      FakeBullModule.registerQueue(
        { name: QueueName.ProcessInvoice },
        { name: QueueName.ConfirmInvoice },
      ),
    ],
    providers: [
      PaymentsService,
      InvoicesService,
      PayoutsService,
      PayOrderService,
      CompleteOrderService,
      ConfirmOrderPaymentService,
      CancelOrderService,
      ProcessInvoiceService,
      PaymentCardsService,
      OrdersStatusService,
      InvoicesStatusService,
      { provide: PaymentAccountsService, useClass: FakePaymentAccounts },
      { provide: OrderUpdaterService, useValue: null },
    ],
  }).compile();

  payments = module.get(PaymentsService);
  payOrder = module.get(PayOrderService);
  confirmOrderPay = module.get(ConfirmOrderPaymentService);
  completeOrder = module.get(CompleteOrderService);
  cancelOrder = module.get(CancelOrderService);
  processInvoice = module.get(ProcessInvoiceService);
  asaas = module.get(AsaasService);
  ordersRepo = module.get(OrdersRepository);
  marketsRepo = module.get(MarketsRepository);
  customersRepo = module.get(CustomersRepository);
});

describe('Pay Order', () => {
  it('change status to Approval Pending, given Payment Card', async () => {
    const order = await givenPaymentProcessingOrder();

    await payOrder.exec({
      ...order,
      card_token: 'cardToken',
      payment_method: InAppPaymentMethod.Card,
    });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.ApprovalPending);
  });

  it('change status to Require Action, given Pix', async () => {
    const order = await givenPaymentProcessingOrder();

    await payOrder.exec({
      ...order,
      payment_method: InAppPaymentMethod.Pix,
    });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.PaymentRequireAction);
  });

  it('add pix data, given Pix', async () => {
    const order = await givenPaymentProcessingOrder();

    await payOrder.exec({
      ...order,
      payment_method: InAppPaymentMethod.Pix,
    });

    const newOrder = await ordersRepo.findOne(fullOrderId);
    expect(newOrder.pix_code).toBeDefined();
    expect(newOrder.pix_expires_at).toBeDefined();
  });

  it('create a payment, given Payment Card', async () => {
    const order = await givenPaymentProcessingOrder();

    await payOrder.exec({
      ...order,
      card_token: 'cardToken',
      payment_method: InAppPaymentMethod.Card,
    });

    const paymentId = await ordersRepo.findPaymentId(fullOrderId);
    const payment = await asaas.payments.find(paymentId ?? fail());
    expect(payment).toMatchObject({
      value: +order.total,
      status: 'CONFIRMED',
      billingType: 'CREDIT_CARD',
    });
  });

  it('create a payment, given Pix', async () => {
    const order = await givenPaymentProcessingOrder();

    await payOrder.exec({
      ...order,
      payment_method: InAppPaymentMethod.Pix,
    });

    const paymentId = await ordersRepo.findPaymentId(fullOrderId);
    const payment = await asaas.payments.find(paymentId ?? fail());
    expect(payment).toMatchObject({
      value: +order.total,
      status: 'PENDING',
      billingType: 'PIX',
    });
  });

  it('add customer debit to payment', async () => {
    const order = await givenCustomerMarketOrder({
      ...saveOrder,
      paid_in_app: true,
      status: OrderStatus.PaymentProcessing,
      customer_debit: 1,
      debit_market_id: market_id,
    });

    await payOrder.exec({
      ...order,
      card_token: 'cardToken',
      payment_method: InAppPaymentMethod.Card,
    });

    const paymentId = await ordersRepo.findPaymentId(fullOrderId);
    const payment = await asaas.payments.find(paymentId ?? fail());
    expect(payment).toMatchObject({
      value: +order.total.plus(order.customer_debit),
      status: 'CONFIRMED',
      billingType: 'CREDIT_CARD',
    });
  });

  it('be able to change from Pix to Payment Card', async () => {
    const order = await givenPaymentProcessingOrder();
    await payOrder.exec({
      ...order,
      payment_method: InAppPaymentMethod.Pix,
    });

    ordersRepo.update(fullOrderId, { status: OrderStatus.PaymentProcessing });
    await payOrder.exec({
      ...order,
      card_token: 'cardToken',
      payment_method: InAppPaymentMethod.Card,
    });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.ApprovalPending);
  });

  it('change status to Payment Failed, given Invalid Card', async () => {
    const order = await givenPaymentProcessingOrder();

    await payOrder.exec({
      ...order,
      card_token: 'invalidCard',
      payment_method: InAppPaymentMethod.Card,
    });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.PaymentFailed);
  });

  it('not throw, given non Payment Processing status', async () => {
    const order = {
      ...saveOrder,
      fullOrderId,
      payment_method: InAppPaymentMethod.Pix,
      status: OrderStatus.Canceled,
    } as const;
    await ordersRepo.create(saveOrder);

    const promise = payOrder.exec(order);

    await expect(promise).resolves.toBeUndefined();
  });

  async function givenCustomerMarketOrder<T extends SaveOrderDto>(order: T) {
    await marketsRepo.create(createMarket);
    await customersRepo.create(createCustomer);
    await ordersRepo.create(order);

    return { fullOrderId, ...order };
  }

  async function givenPaymentProcessingOrder() {
    await marketsRepo.create(createMarket);
    await customersRepo.create(createCustomer);

    const order = {
      ...saveOrder,
      paid_in_app: true,
      status: OrderStatus.PaymentProcessing,
    };
    await ordersRepo.create(order);

    return { fullOrderId, ...order };
  }
});

describe('Confirm Order Payment', () => {
  it('change status to Approval Pending', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.PaymentRequireAction,
    });

    await confirmOrderPay.exec({ fullOrderId });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.ApprovalPending);
  });
});

describe('Complete Order', () => {
  it('change status to Completed', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completing,
    });

    await completeOrder.exec({ fullOrderId });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.Completed);
  });

  it('update customer credit', async () => {
    await givenCustomerMarket();
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completing,
      missing_items: [{ order_item_id: 1n, quantity: -1 }],
    });

    await completeOrder.exec({ fullOrderId });

    const customer = await customersRepo.findOne(createCustomer.customer_id);
    const order = await ordersRepo.findOne(fullOrderId);
    expect(`${order.customer_debit}`).toEqual('-10');
    expect(`${customer.debit}`).toEqual('-10');
  });

  it('total transfer to market, given sufficient customer credit', async () => {
    await givenCustomerMarket();
    await ordersRepo.create({
      ...saveOrder,
      order_id: 2n,
      status: OrderStatus.Completed,
      customer_debit: 15,
    });
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completing,
      missing_items: [{ order_item_id: 1n, quantity: -1 }],
    });

    await completeOrder.exec({ fullOrderId });

    const [transfer] = await findTransfers();
    expect(transfer.value).toEqual(10);
  });

  it('parcial transfer to market, given insufficient customer credit', async () => {
    await givenCustomerMarket();
    await ordersRepo.create({
      ...saveOrder,
      order_id: 2n,
      status: OrderStatus.Completed,
      customer_debit: 5,
    });
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completing,
      missing_items: [{ order_item_id: 1n, quantity: -1 }],
    });

    await completeOrder.exec({ fullOrderId });

    const [transfer] = await findTransfers();
    expect(transfer.value).toEqual(5);
  });

  it('transfer from market, given positive order credit', async () => {
    await givenCustomerMarket();
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completing,
      missing_items: [{ order_item_id: 1n, quantity: 1 }],
    });

    await completeOrder.exec({ fullOrderId });

    const [transfer] = await findTransfers(recipientKey);
    expect(transfer.value).toEqual(10);
  });

  it('not throw, given non Completing status', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completed,
    });

    const promise = completeOrder.exec({ fullOrderId });

    await expect(promise).resolves.toBeUndefined();
  });

  async function givenCustomerMarket() {
    await customersRepo.create(createCustomer);
    await marketsRepo.create(createMarket);
    await asaas.accounts.create(createAsaasAccount);
    await marketsRepo.updateRecipient(market_id, {
      id: recipientId,
      key: recipientKey,
    });
  }

  async function findTransfers(recipientKey?: string) {
    const { data: transfers } = await asaas.transfers.find(
      Month.shortDate(currentMonth),
      Month.shortDate(nextMonth),
      recipientKey,
    );
    return transfers;
  }
});

describe('Cancel Order', () => {
  it('change status to Canceled', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Canceling,
      payment_id,
    });
    await asaas.payments.create(createPayment);

    await cancelOrder.exec({ fullOrderId });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.Canceled);
  });

  it('change payment status to Refunded', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Canceling,
      payment_id,
    });
    await asaas.payments.create(createPayment);

    await cancelOrder.exec({ fullOrderId });

    const payment = await asaas.payments.find(payment_id);
    expect(payment.status).toEqual('REFUNDED');
  });

  it('update credit on customer', async () => {
    await customersRepo.create(createCustomer);
    await ordersRepo.create({
      ...saveOrder,
      order_id: 2n,
      status: OrderStatus.Completed,
      customer_debit: 3,
    });
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Canceling,
      debit_amount: 10,
      debit_market_id: market_id,
      payment_id,
    });
    await asaas.payments.create(createPayment);

    await cancelOrder.exec({ fullOrderId });

    const customer = await customersRepo.findOne(customer_id);
    expect(`${customer.debit}`).toEqual('3');
  });

  it('not throw, given non Canceling status', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.Completed,
    });

    const promise = cancelOrder.exec({ fullOrderId });

    await expect(promise).resolves.toBeUndefined();
  });
});

describe('Invoices Setup', () => {
  it('create invoices', async () => {
    await marketsRepo.create({ ...createMarket, now: lastMonth });
    await ordersRepo.create({
      ...saveOrder,
      paid_in_app: false,
      created_at: lastMonth,
      finished_at: lastMonth,
      status: OrderStatus.Completed,
      total: new Decimal(100),
    });

    await setupInvoicesOn(currentMonth);

    const exist = await marketsRepo.invoices.exist(lastMonth);
    expect(exist).toEqual(true);

    const [invoice] = await marketsRepo.invoices.findByMarket(market_id);
    expect(invoice).toMatchObject({
      status: InvoiceStatus.Processing,
      amount: new Decimal(12),
    });
  });

  async function setupInvoicesOn(date: Date) {
    return payments.invoices.setup(date);
  }
});

describe('Invoice Process', () => {
  it('change status to Pending', async () => {
    await createProcessingOrder();

    await processInvoice.exec({
      fullInvoiceId,
      market_id,
      amount: new Decimal(10),
    });

    const status = await marketsRepo.invoices.status(fullInvoiceId);
    expect(status).toEqual(InvoiceStatus.Pending);
  });

  it('create a payment', async () => {
    await createProcessingOrder();

    await processInvoice.exec({
      fullInvoiceId,
      market_id,
      amount: new Decimal(10),
    });

    const { payment_id } = await marketsRepo.invoices.findOne(fullInvoiceId);
    const payment = await asaas.payments.find(payment_id ?? fail());
    expect(payment.status).toEqual('PENDING');
    expect(payment.value).toEqual(10);
  });

  async function createProcessingOrder() {
    await marketsRepo.create(createMarket);
    await marketsRepo.updatePayerId(market_id, 'payerId');
    await marketsRepo.invoices.createMany({
      month: lastMonth,
      marketsAmount: [{ market_id, amount: new Decimal(10) }],
    });
    await marketsRepo.invoices.update(fullInvoiceId, {
      status: InvoiceStatus.Processing,
    });
  }
});

describe('Invoice Confirm', () => {
  it('change status to Paid', async () => {
    await marketsRepo.invoices.createMany({
      month: lastMonth,
      marketsAmount: [{ market_id, amount: new Decimal(10) }],
    });
    await marketsRepo.invoices.update(fullInvoiceId, {
      status: InvoiceStatus.Pending,
    });

    await payments.invoices.confirm({ fullInvoiceId });

    const status = await marketsRepo.invoices.status(fullInvoiceId);
    expect(status).toEqual(InvoiceStatus.Paid);
  });
});

describe('Payouts Setup', () => {
  it('create pending payouts', async () => {
    await createMonthOldMarket();

    await setupPayoutsOn(day(25).of(currentMonth));

    const pendingPayouts = await marketsRepo.payouts.findPending(nextMonth);
    expect(pendingPayouts.length).toEqual(1);
  });

  async function setupPayoutsOn(date: Date) {
    return payments.payouts.setup(date);
  }
});

describe('Payouts Make', () => {
  it('clear pending payouts', async () => {
    await createPendingPayouts();

    await makePayoutsOn(currentMonth);

    const pendingPayouts = await marketsRepo.payouts.findPending(lastMonth);
    expect(pendingPayouts.length).toEqual(0);
  });

  it('change to paid', async () => {
    await createPendingPayouts();

    await makePayoutsOn(currentMonth);

    const payout = await marketsRepo.payouts.findOne(market_id, lastMonth);
    expect(payout).toMatchObject({
      is_paid: true,
      amount: new Decimal(17),
    });
  });

  it('create a transfer', async () => {
    await createPendingPayouts();

    await makePayoutsOn(currentMonth);

    const transfers = await asaas.transfers.find(
      Month.shortDate(currentMonth),
      Month.shortDate(nextMonth),
      recipientKey,
    );
    const [transfer] = transfers.data;
    expect(transfer).toMatchObject({
      status: 'DONE',
      value: 17,
    });
  });

  async function createPendingPayouts() {
    await createMonthOldMarket();

    const recipient = await asaas.accounts.create(createAsaasAccount);
    await marketsRepo.updateRecipient(market_id, {
      id: recipient.walletId,
      key: recipient.apiKey,
    });

    const _saveOrder = {
      ...saveOrder,
      paid_in_app: true,
      market_amount: new Decimal(8.5),
      status: OrderStatus.Completed,
    };
    await ordersRepo.create({
      ..._saveOrder,
      created_at: lastMonth,
      finished_at: lastMonth,
      payment_method: PaymentMethod.Pix,
    });
    await ordersRepo.create({
      ..._saveOrder,
      order_id: 2n,
      created_at: Month.previous(lastMonth),
      finished_at: Month.previous(lastMonth),
      payment_method: PaymentMethod.Card,
    });
    await marketsRepo.payouts.increase(market_id, lastMonth, 17);

    const pendingPayouts = await marketsRepo.payouts.findPending(lastMonth);

    expect(pendingPayouts.length).toEqual(1);
  }

  async function makePayoutsOn(date: Date) {
    return payments.payouts.makeMany(date);
  }
});

async function createMonthOldMarket() {
  await marketsRepo.create({
    ...createMarket,
    now: lastMonth,
  });
}
