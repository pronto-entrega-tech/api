import { createCity } from '@test/examples/city';
import { currentMonth, nextMonth } from '@test/examples/common';
import {
  createdInvoice,
  createdMarket,
  createdMarket2,
  createdPayout,
  createInvoices,
  createMarket,
  createMarket2,
  createMarketSub,
} from '@test/examples/market';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { AlreadyExistError } from '~/common/errors/already-exist';
import { NotFoundError } from '~/common/errors/not-found';
import { omit } from '~/common/functions/omit';
import { UpdatePayoutDto } from '~/markets/dto/update-payout';
import { InvoiceStatus } from '~/payments/constants/invoice-status';

const { market_id, city } = createMarket;
const { bank_account, ...marketWithoutBA } = createMarket;
const { id: sub_id } = createMarketSub;
const { month } = createInvoices;
const { id: invoice_id } = createInvoices.marketsAmount[0];
const fullInvoiceId = { invoice_id, month };

const repoCases = createRepoCases('markets', ['cities']);

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe.only('Create and not Aprove', () => {
    const market = omit(createdMarket, 'business_hours');

    it('throw Not Found, by findOne', async () => {
      await setupApp();

      await repo.markets.create(createMarket);

      const promise = repo.markets.findOne(market_id);
      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });

    it('return market, by findNotApproved', async () => {
      await setupApp();

      await repo.markets.create(createMarket);

      const res = await repo.markets.findNotApproved();
      expect(res).toMatchObject([market]);
    });
  });

  describe('Create and Aprove', () => {
    it('save market', async () => {
      await setupApp();

      await repo.markets.create(createMarket);
      await repo.markets.approve(market_id);

      const res = await repo.markets.findOne(market_id);
      expect(res).toMatchObject(createdMarket);
    });
  });

  describe('Find Many', () => {
    const { market_id: market_id2 } = createMarket2;

    it('return one', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.approve(market_id);

      const res = await repo.markets.findMany(city);

      expect(res).toMatchObject([createdMarket]);
    });

    it('return two', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.approve(market_id);
      await repo.markets.create(createMarket2);
      await repo.markets.approve(market_id2);

      const res = await repo.markets.findMany(city);

      expect(res).toMatchObject([createdMarket, createdMarket2]);
    });

    it('return empty list', async () => {
      const res = await repo.markets.findMany(city);

      expect(res).toEqual([]);
    });

    it('return one, given justIds flag', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.approve(market_id);

      const res = await repo.markets.findMany(city, { justIds: true });

      expect(res).toMatchObject([market_id]);
    });

    it('return two, given justIds flag', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.approve(market_id);
      await repo.markets.create(createMarket2);
      await repo.markets.approve(market_id2);

      const res = await repo.markets.findMany(city, { justIds: true });

      expect(res).toMatchObject([market_id, market_id2]);
    });

    it('return empty list, given justIds flag', async () => {
      const res = await repo.markets.findMany(city, { justIds: true });

      expect(res).toEqual([]);
    });
  });

  describe('Has bank account', () => {
    it('return true', async () => {
      await setupApp();
      await repo.markets.create(createMarket);

      const res = await repo.markets.hasBankAccount(market_id);

      expect(res).toEqual(true);
    });

    it('return false', async () => {
      await setupApp();
      await repo.markets.create(marketWithoutBA);

      const res = await repo.markets.hasBankAccount(market_id);

      expect(res).toEqual(false);
    });
  });

  describe('Create bank account', () => {
    it('save created', async () => {
      await setupApp();
      await repo.markets.create(marketWithoutBA);

      await repo.markets.createBankAccount(market_id, bank_account);

      const res = await repo.markets.findPrivate(market_id);
      expect(res.bank_account).toMatchObject(bank_account);
    });

    it('throw Already Exist, given exist', async () => {
      await setupApp();
      await repo.markets.create(createMarket);

      const promise = repo.markets.createBankAccount(market_id, bank_account);

      await expect(promise).rejects.toBeInstanceOf(AlreadyExistError);
    });
  });

  describe('Update bank account', () => {
    const bank_number = 'newNumber';

    it('save update', async () => {
      await setupApp();
      await repo.markets.create(createMarket);

      await repo.markets.updateBankAccount(market_id, { bank_number });

      const res = await repo.markets.findPrivate(market_id);
      expect(res.bank_account).toMatchObject({ ...bank_account, bank_number });
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.markets.updateBankAccount(market_id, {
        bank_number,
      });

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Create Sub', () => {
    it('save created', async () => {
      await setupApp();
      await repo.markets.create(createMarket);

      await repo.markets.subs.create(market_id, createMarketSub);

      const res = await repo.markets.subs.findOne(market_id, sub_id);
      expect(res).toMatchObject(createMarketSub);
    });
  });

  describe('Find market id from sub', () => {
    it('return market id', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.subs.create(market_id, createMarketSub);

      const res = await repo.markets.subs.findMarketId(sub_id);

      expect(res).toEqual(market_id);
    });
  });

  describe('Find many subs', () => {
    const createMarketSub2 = { ...createMarketSub, id: 'marketSubId2' };

    it('return one market-sub', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.subs.create(market_id, createMarketSub);

      const res = await repo.markets.subs.findMany(market_id);

      expect(res).toMatchObject([createMarketSub]);
    });

    it('return two market-subs', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.subs.create(market_id, createMarketSub);
      await repo.markets.subs.create(market_id, createMarketSub2);

      const res = await repo.markets.subs.findMany(market_id);

      expect(res).toMatchObject([createMarketSub, createMarketSub2]);
    });

    it('return empty list', async () => {
      const res = await repo.markets.subs.findMany(market_id);

      expect(res).toEqual([]);
    });
  });

  describe('Update Sub', () => {
    const update = { name: 'New name' };

    it('save update', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.subs.create(market_id, createMarketSub);

      await repo.markets.subs.update(market_id, sub_id, update);

      const res = await repo.markets.subs.findOne(market_id, sub_id);
      expect(res).toMatchObject({ ...createMarketSub, ...update });
    });
  });

  describe('Delete Sub', () => {
    it('throw Not Found, after deleted', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.subs.create(market_id, createMarketSub);

      await repo.markets.subs.delete(market_id, sub_id);

      const promise = repo.markets.subs.findOne(market_id, sub_id);
      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Create Invoices', () => {
    it('save created', async () => {
      await setupApp();
      await repo.markets.create(createMarket);

      await repo.markets.invoices.createMany(createInvoices);

      const res = await repo.markets.invoices.findOne(fullInvoiceId);
      expect(res).toMatchObject(createdInvoice);
    });
  });

  describe('Update Invoice', () => {
    const status = InvoiceStatus.Pending;

    it('save update', async () => {
      await setupApp();
      await repo.markets.create(createMarket);
      await repo.markets.invoices.createMany(createInvoices);

      await repo.markets.invoices.update(fullInvoiceId, { status });

      const res = await repo.markets.invoices.findOne(fullInvoiceId);
      expect(res).toMatchObject({ ...createdInvoice, status });
    });
  });

  describe('Update Payouts', () => {
    const update: UpdatePayoutDto = {
      is_paid: true,
      paid_at: currentMonth,
      payment_id: 'paymentId',
    };

    it('save update', async () => {
      await setupApp();
      await repo.markets.create(createMarket);

      await repo.markets.payouts.update(market_id, currentMonth, update);

      const res = await repo.markets.payouts.findOne(market_id, currentMonth);
      expect(res).toMatchObject({ ...createdPayout, ...update });
    });
  });

  async function setupApp() {
    await repo.cities.create(createCity);
    await repo.markets.payouts.createMany(currentMonth);
    await repo.markets.payouts.createMany(nextMonth);
  }
});
