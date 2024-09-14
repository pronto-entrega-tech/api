/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, expect, describe, it, afterEach } from 'vitest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createCustomer } from '@test/examples/customer';
import { saveItem } from '@test/examples/item';
import { createdMarket } from '@test/examples/market';
import {
  saveOrder,
  createOrder,
  retryOrderPayment,
  createReview,
  createdReview,
} from '@test/examples/order';
import { FakeMutexModule } from '~/common/mutex/fake-mutex.module';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { RepositoriesModule } from '~/repositories/repositories.module';
import { ItemsRepository } from '~/repositories/items/items.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { OrderPublicAction, OrderStatus } from './constants/order-status';
import { OrdersStatusService } from './orders-status.service';
import { ConfirmationTokenPayload } from './orders.service';
import { OrdersService } from './orders.service';
import { AnnihilateDb, dbAnnihilator } from '@test/functions/db-annihilator';
import { PrismaService } from '~/common/prisma/prisma.service';
import { second } from '~/common/constants/time';

let orders: OrdersService;
let jwt: JwtService;
let ordersRepo: OrdersRepository;
let marketsRepo: MarketsRepository;
let itemsRepo: ItemsRepository;
let customersRepo: CustomersRepository;
let annihilate: AnnihilateDb;
const { customer_id } = createCustomer;
const { market_id } = createdMarket;
const { order_id } = createOrder;
const fullOrderId = { order_id, market_id };

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [
      RepositoriesModule,
      FakeMutexModule,
      JwtModule.register({ secret: 'secret' }),
    ],
    providers: [
      OrdersService,
      OrdersStatusService,
      /* { provide: OrderUpdaterService, useClass: class {} }, */
    ],
  }).compile();

  orders = module.get(OrdersService);
  jwt = module.get(JwtService);
  ordersRepo = module.get(OrdersRepository);
  marketsRepo = module.get(MarketsRepository);
  itemsRepo = module.get(ItemsRepository);
  customersRepo = module.get(CustomersRepository);

  annihilate = dbAnnihilator(module.get(PrismaService));
});

afterEach(() => annihilate(), 10 * second);

describe('Create', () => {
  it('save order and return order id and confirmation token', async () => {
    await marketsRepo.create(createdMarket);
    await marketsRepo.approve(market_id);
    await itemsRepo.create(saveItem);
    await customersRepo.create(createCustomer);

    const order = await orders.create(createOrder);

    expect(order).toMatchObject({
      order_id,
      confirmation_token: expect.any(String),
    });
    await verifyConfirmationToken(order.confirmation_token);
    await expect(() => ordersRepo.findOne(order)).resolves.toReturn();
  });
});

describe('Retry Payment', () => {
  it('change status to Processing Payment', async () => {
    await marketsRepo.create(createdMarket);
    await ordersRepo.create({
      ...saveOrder,
      paid_in_app: true,
      status: OrderStatus.PaymentFailed,
    });

    await orders.retryPayment(retryOrderPayment);

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.PaymentProcessing);
  });
});

describe('Find many', () => {
  it('return orders list, by customer', async () => {
    await ordersRepo.create(saveOrder);
    await ordersRepo.create({ ...saveOrder, customer_id: 'anotherCustomer' });

    const ordersList = await orders.findMany({ customer_id });

    expect(ordersList).toHaveLength(1);
  });

  it('return orders list, by market', async () => {
    await ordersRepo.create(saveOrder);
    await ordersRepo.create({ ...saveOrder, market_id: 'anotherMarket' });

    const ordersList = await orders.findMany({ market_id });

    expect(ordersList).toHaveLength(1);
  });
});

describe('Find one', () => {
  it('return the order, by customer', async () => {
    await ordersRepo.create(saveOrder);
    const order = await orders.customerFindOne({ customer_id, ...fullOrderId });
    expect(order).toBeDefined();
  });
});

describe('Create confirmation token', () => {
  it('return the valid token', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.DeliveryPending,
    });

    const { token } = await orders.createConfirmationToken({
      customer_id,
      ...fullOrderId,
    });

    await verifyConfirmationToken(token);
  });
});

describe('Update', () => {
  it('change status', async () => {
    await ordersRepo.create({
      ...saveOrder,
      status: OrderStatus.ApprovalPending,
    });

    await orders.update({ ...fullOrderId, action: OrderPublicAction.Approve });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.Processing);
  });
});

describe('Customer cancel', () => {
  it('change status to Canceling', async () => {
    await ordersRepo.create(saveOrder);

    await orders.customerCancel({ customer_id, ...fullOrderId });

    const status = await ordersRepo.status(fullOrderId);
    expect(status).toEqual(OrderStatus.Canceling);
  });
});

describe('Create review', () => {
  it('save review', async () => {
    await ordersRepo.create({ ...saveOrder, status: OrderStatus.Completed });

    await orders.createReview(createReview);

    const { review } = await ordersRepo.customerFindOne(fullOrderId);
    expect(review).toMatchObject(createdReview);
  });
});

describe('Respond review', () => {
  const response = 'Review response';

  it('change review market response', async () => {
    await ordersRepo.create(saveOrder);
    await ordersRepo.createReview(createReview);

    await orders.respondReview({ ...fullOrderId, response });

    const { review } = await ordersRepo.customerFindOne(fullOrderId);
    expect(review).toMatchObject({ response });
  });
});

async function verifyConfirmationToken(token: string) {
  const payload = await jwt.verifyAsync<ConfirmationTokenPayload>(token);
  expect(payload).toMatchObject({
    iss: 'ProntoEntrega',
    sub: `${order_id}`,
    type: 'confirm_delivery',
  });
}
