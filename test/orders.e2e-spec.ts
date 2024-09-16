import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { fail } from "assert";
import { AppModule } from "~/app.module";
import { Role } from "~/auth/constants/roles";
import { SessionsService } from "~/auth/sessions/sessions.service";
import { Month } from "~/common/functions/month";
import { PrismaService } from "~/common/prisma/prisma.service";
import {
  OrderPublicAction,
  OrderStatus,
} from "~/orders/constants/order-status";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { ItemsRepository } from "~/repositories/items/items.repository";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { ProductsRepository } from "~/repositories/products/products.repository";
import { createCustomer } from "./examples/customer";
import { saveItem } from "./examples/item";
import { createMarket, createdMarket } from "./examples/market";
import { createOrder, saveOrder } from "./examples/order";
import { createCategory, createProduct } from "./examples/product";
import { initApp } from "./functions/init-app";
import { dbAnnihilator, AnnihilateDb } from "./functions/db-annihilator";
import { beforeAll, afterEach, afterAll, test, expect } from "vitest";
import { second } from "~/common/constants/time";

let app: NestFastifyApplication;
let customer_access_token: string;
let market_access_token: string;
let prisma: PrismaService;
let annihilate: AnnihilateDb;
let productsRepo: ProductsRepository;
let marketsRepo: MarketsRepository;
let itemsRepo: ItemsRepository;
let customersRepo: CustomersRepository;
const { customer_id } = createCustomer;
const { market_id } = createMarket;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = await initApp(module);

  prisma = module.get(PrismaService);

  annihilate = dbAnnihilator(prisma);

  productsRepo = module.get(ProductsRepository);
  marketsRepo = module.get(MarketsRepository);
  itemsRepo = module.get(ItemsRepository);
  customersRepo = module.get(CustomersRepository);

  const sessions = module.get(SessionsService);
  customer_access_token = await sessions.genToken({
    sub: customer_id,
    role: Role.Customer,
  });
  market_access_token = await sessions.genToken({
    sub: market_id,
    role: Role.Market,
  });
});

afterEach(() => annihilate(), 10 * second);

afterAll(() => app?.close());

test("Customer make a order", async () => {
  await setupApp();
  const { order_id, confirmation_token } = await createOrderFn();

  await marketUpdateStatus(order_id, OrderPublicAction.Approve);
  await customerCheckStatus(order_id, OrderStatus.Processing);

  await marketUpdateStatus(order_id, OrderPublicAction.Delivery);
  await customerCheckStatus(order_id, OrderStatus.DeliveryPending);

  await marketUpdateStatus(
    order_id,
    OrderPublicAction.Complete,
    confirmation_token,
  );
  await customerCheckStatus(order_id, OrderStatus.Completing);

  await marketCheckPayout();

  await createInvoices();
  await marketCheckInvoice();
});

async function createOrderFn() {
  const res = await app.inject({
    method: "POST",
    url: `/orders`,
    headers: authHeader(customer_access_token),
    payload: createOrder,
  });

  expect(res.statusCode).toEqual(201);
  return res.json();
}

async function marketUpdateStatus(
  order_id: string,
  action: OrderPublicAction,
  confirmation_token?: string,
) {
  const res = await app.inject({
    method: "PATCH",
    url: `/orders/market/${order_id}`,
    headers: authHeader(market_access_token),
    payload: { action, confirmation_token },
  });

  if (res.statusCode !== 200) fail(res.body);
}

async function customerCheckStatus(order_id: string, status: OrderStatus) {
  const res = await app.inject({
    method: "GET",
    url: `/orders/${market_id}/${order_id}`,
    headers: authHeader(customer_access_token),
  });

  expect(res.json()).toMatchObject({ status });
}

async function marketCheckPayout() {
  const res = await app.inject({
    method: "GET",
    url: `/markets/payouts`,
    headers: authHeader(market_access_token),
  });

  expect(res.json()).toMatchObject({ amount: "0" });
}

async function createInvoices() {
  await marketsRepo.invoices.createMany({
    month: Month.getCurrent(),
    marketsAmount: [{ market_id, amount: saveOrder.market_amount }],
  });
}

async function marketCheckInvoice() {
  const res = await app.inject({
    method: "GET",
    url: `/markets/invoices`,
    headers: authHeader(market_access_token),
  });

  expect(res.json()).toMatchObject([{ amount: `${saveOrder.market_amount}` }]);
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function setupApp() {
  await productsRepo.createCategory(createCategory);
  await productsRepo.create(createProduct);
  await marketsRepo.payouts.createMany(Month.getCurrent());
  await marketsRepo.payouts.createMany(Month.getNext());
  await marketsRepo.create(createdMarket);
  await marketsRepo.approve(market_id);
  await itemsRepo.create(saveItem);
  await customersRepo.create(createCustomer);
}
