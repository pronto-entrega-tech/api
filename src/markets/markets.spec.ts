import { Test } from '@nestjs/testing';
import { createMarket } from '@test/examples/market';
import { expectObject } from '@test/functions/expect-object';
import { SessionsModule } from '~/auth/sessions/sessions.module';
import { PaymentAccountsService } from '~/payments/accounts/payment-accounts.service';
import { InMemoryRepositoriesModule } from '~/repositories/in-memory-repositories.module';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { MarketCreateRes } from '~/responses/market.res';
import { MarketsService } from './markets.service';
import { vi, beforeEach, describe, expect, it } from 'vitest';

class FakePaymentAccounts {
  initCreatePayer = vi.fn();
  initCreateRecipient = vi.fn();
}

let markets: MarketsService;
let marketsRepo: MarketsRepository;
let paymentAccounts: PaymentAccountsService;
const { market_id } = createMarket;

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [InMemoryRepositoriesModule, SessionsModule],
    providers: [
      MarketsService,
      { provide: PaymentAccountsService, useClass: FakePaymentAccounts },
    ],
  }).compile();

  markets = module.get(MarketsService);
  marketsRepo = module.get(MarketsRepository);
  paymentAccounts = module.get(PaymentAccountsService);
});

describe('Create', () => {
  it('return is valid', async () => {
    const res = await markets.create(createMarket.email, createMarket);

    await expectObject(res).toBe(MarketCreateRes);
  });

  it('call initCreatePayer and initCreateRecipient', async () => {
    await markets.create(createMarket.email, createMarket);

    expect(paymentAccounts.initCreatePayer).toBeCalled();
    expect(paymentAccounts.initCreateRecipient).toBeCalled();
  });

  it('not call initCreateRecipient, if bank account is undefined', async () => {
    await markets.create(createMarket.email, {
      ...createMarket,
      bank_account: undefined,
    });

    expect(paymentAccounts.initCreateRecipient).not.toBeCalled();
  });
});

describe('Create Bank Account', () => {
  it('call initCreateRecipient', async () => {
    await marketsRepo.create({ ...createMarket, bank_account: undefined });
    await marketsRepo.approve(market_id);

    await markets.createBankAccount(market_id, createMarket.bank_account);

    expect(paymentAccounts.initCreateRecipient).toBeCalled();
  });
});
