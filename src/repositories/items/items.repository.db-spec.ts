import { createCity } from '@test/examples/city';
import { currentMonth, nextMonth } from '@test/examples/common';
import {
  saveItem,
  createdItem,
  itemFeed,
  activityExtra,
  updateItem,
} from '@test/examples/item';
import { createMarket } from '@test/examples/market';
import { createCategory, createProduct } from '@test/examples/product';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { NotFoundError } from '~/common/errors/not-found';
import { omit } from '~/common/functions/omit';
import { pick } from '~/common/functions/pick';

const { city, prod_id } = saveItem;
/* const fullItemId = { item_id, city }; */
const { market_id } = createMarket;
/* const item_id2 = 'itemId2'; */
const saveItem2 = { ...saveItem /* , item_id: item_id2 */ };

const repoCases = createRepoCases('items', ['cities', 'products', 'markets']);

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  beforeAll(async () => {
    await repo.cities.create(createCity);
    await repo.products.createCategory(createCategory);
    await repo.products.create(createProduct);
    await repo.markets.payouts.createMany(currentMonth);
    await repo.markets.payouts.createMany(nextMonth);
    await repo.markets.create(createMarket);
  }, 10 * 1000);

  describe('Without items', () => {
    it('findMany, return empty list', async () => {
      const res = await repo.items.findMany(city, market_id);

      expect(res).toEqual([]);
    });

    it('exist, return false', async () => {
      const res = await repo.items.exist(market_id, city, { prod_id });

      expect(res).toEqual(false);
    });
  });

  describe('With items', () => {
    describe('Create', () => {
      it('return created', async () => {
        const res = await repo.items.create(saveItem);

        expect(res).toMatchObject(createdItem);
      });

      it('create activity', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const activities = await repo.items.findActivities(market_id);
        expect(activities.find((a) => a.item_id === item_id)).toMatchObject({
          action: 'CREATE',
          item_id,
          city,
        });
      });
    });

    describe('Exist', () => {
      it('return true', async () => {
        await repo.items.create(saveItem);

        const res = await repo.items.exist(market_id, city, { prod_id });

        expect(res).toEqual(true);
      });
    });

    describe('Find many', () => {
      const _feedMany = omit(itemFeed, 'details', 'price' /* , 'item_id' */);
      const feedMany = (item_id: string) =>
        expect.objectContaining({ item_id, ..._feedMany });

      it('return one item', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const res = await repo.items.findMany(city, market_id);

        expect(res.filter((i) => [item_id].includes(i.item_id))).toMatchObject([
          feedMany(item_id),
        ]);
      });

      it('return two items', async () => {
        const { item_id } = await repo.items.create(saveItem);
        const { item_id: item_id2 } = await repo.items.create(saveItem2);

        const res = await repo.items.findMany(city, market_id);

        expect(
          res.filter((i) => [item_id, item_id2].includes(i.item_id)),
        ).toEqual(
          expect.arrayContaining([feedMany(item_id), feedMany(item_id2)]),
        );
      });
    });

    describe('Find one', () => {
      it('return item', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const res = await repo.items.findOne({ item_id, city_slug: city });

        expect(res).toMatchObject(itemFeed);
      });

      it('throw Not Found, given not exist', async () => {
        const promise = repo.items.findOne({ item_id: '', city_slug: city });

        await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    describe('Market find one', () => {
      const item = {
        ...pick(createdItem, 'is_kit', 'kit_name'),
        product: expect.any(Object),
      };

      it('return item', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const res = await repo.items.marketFindOne(
          { item_id, city_slug: city },
          market_id,
        );

        expect(res).toMatchObject(item);
      });

      it('throw Not Found, given not exist', async () => {
        const promise = repo.items.marketFindOne(
          { item_id: '', city_slug: city },
          market_id,
        );

        await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    describe('Find by ids', () => {
      const item = {
        ...pick(createdItem /* , 'item_id' */, 'prod_id', 'is_kit'),
        market: { markup: createMarket.markup },
        details: [],
      };

      it('return one item', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const res = await repo.items.findByIds([item_id], city);

        expect(res.filter((i) => [item_id].includes(i.item_id))).toMatchObject([
          item,
        ]);
      });

      it('return two items', async () => {
        const { item_id } = await repo.items.create(saveItem);
        const { item_id: item_id2 } = await repo.items.create(saveItem2);
        const item2 = { ...item, item_id: item_id2 };

        const res = await repo.items.findByIds([item_id, item_id2], city);

        expect(
          res.filter((i) => [item_id, item_id2].includes(i.item_id)),
        ).toMatchObject([item, item2]);
      });

      it('return empty list', async () => {
        await repo.items.create(saveItem);

        const res = await repo.items.findByIds([], city);

        expect(res).toEqual([]);
      });
    });

    describe('Update', () => {
      it('return updated', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const res = await repo.items.update(
          { item_id, city_slug: city },
          updateItem,
          activityExtra,
        );

        expect(res).toEqual({ item_id, ...createdItem, ...updateItem });
      });

      it('throw Not Found, given not exist', async () => {
        const promise = repo.items.update(
          { item_id: '', city_slug: city },
          updateItem,
          activityExtra,
        );

        await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    describe('Delete', () => {
      it('return deleted', async () => {
        const { item_id } = await repo.items.create(saveItem);

        const res = await repo.items.delete(
          { item_id, city_slug: city },
          activityExtra,
        );

        expect(res).toMatchObject(createdItem);
      });

      it('delete', async () => {
        const { item_id } = await repo.items.create(saveItem);

        await repo.items.delete({ item_id, city_slug: city }, activityExtra);

        const promise = repo.items.findOne({ item_id, city_slug: city });
        await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      });

      it('throw Not Found, given not exist', async () => {
        const promise = repo.items.delete(
          { item_id: '', city_slug: city },
          activityExtra,
        );

        await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      });
    });
  });
});
