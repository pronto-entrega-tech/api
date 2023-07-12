import { Test } from '@nestjs/testing';
import { createItem, saveItem, updateItem } from '@test/examples/item';
import { createMarket, createMarketSub } from '@test/examples/market';
import {
  createCategory,
  createProduct,
  createProduct2,
} from '@test/examples/product';
import { AlreadyExistError } from '~/common/errors/already-exist';
import { NotFoundError } from '~/common/errors/not-found';
import { RepositoriesModule } from '~/repositories/repositories.module';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { ItemsService } from './items.service';
import { AnnihilateDb, dbAnnihilator } from '@test/functions/db-annihilator';
import { PrismaService } from '~/common/prisma/prisma.service';
import { createCity } from '@test/examples/city';
import { currentMonth, nextMonth } from '@test/examples/common';
import { Decimal } from '@prisma/client/runtime';
import { ProductsService } from '~/products/products.service';
import { CitiesService } from '~/cities/cities.service';

let items: ItemsService;
let prisma: PrismaService;
let annihilate: AnnihilateDb;
const { city } = saveItem;
const { market_id } = createMarket;
const { id: market_sub_id } = createMarketSub;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [RepositoriesModule],
    providers: [ItemsService, ProductsService, CitiesService],
  }).compile();

  items = module.get(ItemsService);

  prisma = module.get(PrismaService);
  annihilate = dbAnnihilator(prisma);

  const cities = module.get(CitiesService);
  const products = module.get(ProductsService);
  const marketsRepo = module.get(MarketsRepository);

  await cities.create(createCity);
  await products.createCategory(createCategory);
  await products.create(createProduct);
  await products.create(createProduct2);
  await marketsRepo.payouts.createMany(currentMonth);
  await marketsRepo.payouts.createMany(nextMonth);
  await marketsRepo.create(createMarket);
  await marketsRepo.approve(market_id);
  await marketsRepo.subs.create(market_id, createMarketSub);
});

beforeEach(() => prisma.truncate(['item']));

afterAll(() => annihilate(), 10 * 1000);

describe('Create', () => {
  it('save item', async () => {
    const { item_id } = await items.create({ market_id }, createItem);

    const item = await items.findOne({ item_id, city_slug: city });
    expect(item).toBeDefined();
  });

  it('create activity', async () => {
    const { item_id } = await items.create({ market_id }, createItem);

    const activities = await items.findActivities(market_id, {
      item_id,
      city_slug: city,
    });
    expect(activities).toMatchObject([{ action: 'CREATE', item_id, city }]);
  });

  it('throw Already Exist, given a item with same product code exist', async () => {
    await items.create({ market_id }, createItem);

    const promise = items.create({ market_id }, createItem);

    await expect(promise).rejects.toBeInstanceOf(AlreadyExistError);
  });
});

describe('Sub Create', () => {
  it('save item', async () => {
    const { item_id } = await items.subCreate(market_sub_id, createItem);

    const item = await items.findOne({ item_id, city_slug: city });
    expect(item).toBeDefined();
  });

  it('create activity', async () => {
    const { item_id } = await items.subCreate(market_sub_id, createItem);

    const activities = await items.findActivities(market_id, {
      item_id,
      city_slug: city,
    });
    expect(activities).toMatchObject([{ action: 'CREATE', item_id, city }]);
  });

  it('throw Already Exist, given a item with same product code exist', async () => {
    await items.create({ market_id }, createItem);

    const promise = items.subCreate(market_sub_id, createItem);

    await expect(promise).rejects.toBeInstanceOf(AlreadyExistError);
  });
});

describe('Find many', () => {
  const createItem2 = { ...createItem, code: 2n };
  const feedMany = (item_id: string) => expect.objectContaining({ item_id });

  it('return one item', async () => {
    const { item_id } = await items.create({ market_id }, createItem);

    const res = await items.feed(city, { market_id });

    expect(res).toMatchObject([feedMany(item_id)]);
  });

  it('return two items', async () => {
    const { item_id: id1 } = await items.create({ market_id }, createItem);
    const { item_id: id2 } = await items.create({ market_id }, createItem2);

    const res = await items.feed(city, { market_id });

    expect(res).toEqual(expect.arrayContaining([feedMany(id1), feedMany(id2)]));
  });
});

describe('Find one', () => {
  it('return item', async () => {
    const { item_id } = await items.create({ market_id }, createItem);

    const item = await items.findOne({ item_id, city_slug: city });

    expect(item).toBeDefined();
  });

  it('throw Not Found, given not exist', async () => {
    const promise = items.findOne({ item_id: '', city_slug: city });

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('Update', () => {
  it('update', async () => {
    const { item_id } = await items.create({ market_id }, createItem);

    await items.update(
      { market_id },
      { item_id, city_slug: city },
      { unit_weight: new Decimal(0.5) },
    );

    const item = await items.findOne({ item_id, city_slug: city });
    expect(item).toMatchObject({ unit_weight: '0.500' });
  });

  it('throw Not Found, given not exist', async () => {
    const promise = items.update(
      { market_id },
      { item_id: '', city_slug: city },
      updateItem,
    );

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('Delete', () => {
  it('delete', async () => {
    const { item_id } = await items.create({ market_id }, createItem);

    await items.delete({ market_id }, { item_id, city_slug: city });

    const promise = items.findOne({ item_id, city_slug: city });
    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throw Not Found, given not exist', async () => {
    const promise = items.delete(
      { market_id },
      { item_id: '', city_slug: city },
    );

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
  });
});
