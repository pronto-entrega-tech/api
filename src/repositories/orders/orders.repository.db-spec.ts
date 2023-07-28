import { currentMonth, nextMonth } from '@test/examples/common';
import { createCustomer } from '@test/examples/customer';
import { saveItem } from '@test/examples/item';
import { createMarket } from '@test/examples/market';
import {
  createOrder,
  createReview,
  createdReview,
  saveOrder,
} from '@test/examples/order';
import { createCategory, createProduct } from '@test/examples/product';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { NotFoundError } from '~/common/errors/not-found';
import { OrderStatus } from '~/orders/constants/order-status';

const { order_id, market_id } = createOrder;
const fullOrderId = { order_id, market_id };

const repoCases = createRepoCases('orders', [
  'customers',
  'items',
  'markets',
  'products',
  'cities',
]);

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe('Create', () => {
    it('return a order id', async () => {
      await setupApp();

      const order = await repo.orders.create(saveOrder);

      expect(order).toMatchObject({ order_id });
    });
  });

  describe('Find one', () => {
    it('return one', async () => {
      await setupApp();
      await repo.orders.create(saveOrder);

      const order = await repo.orders.findOne(fullOrderId);

      expect(order).toMatchObject({ order_id });
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.orders.findOne(fullOrderId);

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Update', () => {
    const newStatus = OrderStatus.Completed;

    it('save update', async () => {
      await setupApp();
      await repo.orders.create(saveOrder);

      await repo.orders.update(fullOrderId, { status: newStatus });

      const order = await repo.orders.findOne(fullOrderId);
      expect(order).toMatchObject({ status: newStatus });
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.orders.update(fullOrderId, {});

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Create review', () => {
    it('save review', async () => {
      await setupApp();
      await repo.orders.create(saveOrder);

      await repo.orders.createReview(fullOrderId, createReview);

      const res = await repo.orders.findOneWithItemsAndReview(fullOrderId);
      expect(res.review).toMatchObject(createdReview);
    });
  });

  describe('Has review', () => {
    it('return true', async () => {
      await setupApp();
      await repo.orders.create(saveOrder);
      await repo.orders.createReview(fullOrderId, createReview);

      const res = await repo.orders.hasReview(fullOrderId);

      expect(res).toEqual(true);
    });

    it('return false', async () => {
      const res = await repo.orders.hasReview(fullOrderId);

      expect(res).toEqual(false);
    });
  });

  describe('Update review', () => {
    const response = 'Review response';

    it('save update', async () => {
      await setupApp();
      await repo.orders.create(saveOrder);
      await repo.orders.createReview(fullOrderId, createReview);

      await repo.orders.updateReview(fullOrderId, { response });

      const res = await repo.orders.findOneWithItemsAndReview(fullOrderId);
      expect(res.review).toMatchObject({ ...createdReview, response });
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.orders.updateReview(fullOrderId, { response });

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  async function setupApp() {
    await repo.products.createCategory(createCategory);
    await repo.products.create(createProduct);
    await repo.markets.payouts.createMany(currentMonth);
    await repo.markets.payouts.createMany(nextMonth);
    await repo.markets.create(createMarket);
    await repo.items.create(saveItem);
    await repo.customers.create(createCustomer);
  }
});
