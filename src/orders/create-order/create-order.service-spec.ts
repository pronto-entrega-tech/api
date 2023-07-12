import { expect, it } from 'vitest';
import { createCustomer as customerExample } from '@test/examples/customer';
import { saveItem as itemExample } from '@test/examples/item';
import { createdMarket as marketExample } from '@test/examples/market';
import { createOrder as orderCreationExample } from '@test/examples/order';
import { setupTestDb } from '@test/functions/setup-test-db';
import { createOrder } from './create-order';

let MarketsRepo: any;
let ItemsRepo: any;
let CustomersRepo: any;

const { market_id } = marketExample;
const { order_id } = orderCreationExample;

setupTestDb();

it('save order and return order id and confirmation token', async () => {
  await MarketsRepo.save(marketExample);
  await MarketsRepo.approve(market_id);
  await ItemsRepo.save(itemExample);
  await CustomersRepo.save(customerExample);

  const order = await createOrder(orderCreationExample);

  expect(order).toMatchObject({
    order_id,
    confirmation_token: expect.any(String),
  });
});
