import { Test } from '@nestjs/testing';
import {
  createCustomer,
  deletedCustomer,
  foundCustomer,
  updateCustomer,
  updatedCustomer,
} from '@test/examples/customer';
import {
  createPaymentCard,
  savePaymentCard,
} from '@test/examples/payment-card';
import { expectObject } from '@test/functions/expect-object';
import { SessionsModule } from '~/auth/sessions/sessions.module';
import { AlreadyExistError } from '~/common/errors/already-exist';
import { NotFoundError } from '~/common/errors/not-found';
import { PaymentAccountsService } from '~/payments/accounts/payment-accounts.service';
import { FakeAsaasModule } from '~/payments/asaas/fake-asaas.module';
import { PaymentCardsService } from '~/payments/cards/payment-cards.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { InMemoryRepositoriesModule } from '~/repositories/in-memory-repositories.module';
import { AccessTokenAndSessionRes } from '~/responses/auth.res';
import {
  CustomerCardRes,
  CustomerDeleteRes,
  CustomerFindRes,
  CustomerUpdateRes,
} from '~/responses/customer.res';
import { CustomerCardsService } from './customer-cards.service';
import { CustomersService } from './customers.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakePaymentAccounts {
  initCreateCustomerPayer = vi.fn();
  createCustomerPayer = () => ({ payer_id: 'payerId' });
}

let customers: CustomersService;
let paymentAccounts: PaymentAccountsService;
let customersRepo: CustomersRepository;

const { customer_id, email } = createCustomer;
const { id: card_id } = savePaymentCard;

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [InMemoryRepositoriesModule, FakeAsaasModule, SessionsModule],
    providers: [
      CustomersService,
      CustomerCardsService,
      PaymentCardsService,
      { provide: PaymentAccountsService, useClass: FakePaymentAccounts },
    ],
  }).compile();

  customers = module.get(CustomersService);
  paymentAccounts = module.get(PaymentAccountsService);
  customersRepo = module.get(CustomersRepository);
});

describe('Create', () => {
  it('return is valid', async () => {
    const res = await customers.create(email, createCustomer);

    await expectObject(res).toBe(AccessTokenAndSessionRes);
  });

  it('call initCreateCustomerPayer', async () => {
    await customers.create(email, createCustomer);

    expect(paymentAccounts.initCreateCustomerPayer).toBeCalled();
  });

  it('throw Already Exist, given customer with same email exist', async () => {
    await customers.create(email, createCustomer);

    const promise = customers.create(email, createCustomer);

    await expect(promise).rejects.toEqual(
      new AlreadyExistError('Customer', ['email']),
    );
  });
});

describe('Find', () => {
  it('return is valid', async () => {
    customersRepo.create(createCustomer);

    const res = await customers.find(customer_id);

    await expectObject(res).toBe(CustomerFindRes);
    expect(res).toMatchObject(foundCustomer);
  });

  it("throw Not Found, given customer don't exist", async () => {
    const promise = customers.find(customer_id);

    await expect(promise).rejects.toEqual(new NotFoundError('Customer'));
  });
});

describe('Update', () => {
  it('return is valid', async () => {
    customersRepo.create(createCustomer);

    const res = await customers.update(customer_id, updateCustomer);

    await expectObject(res).toBe(CustomerUpdateRes);
    expect(res).toEqual(updatedCustomer);
  });

  it("throw Not Found, given customer don't exist", async () => {
    const promise = customers.update(customer_id, updateCustomer);

    await expect(promise).rejects.toEqual(new NotFoundError('Customer'));
  });
});

describe('Delete', () => {
  it('return is valid', async () => {
    customersRepo.create(createCustomer);

    const res = await customers.delete(customer_id);

    await expectObject(res).toBe(CustomerDeleteRes);
    expect(res).toEqual(deletedCustomer);
  });

  it("throw Not Found, given customer don't exist", async () => {
    const promise = customers.delete(customer_id);

    await expect(promise).rejects.toEqual(new NotFoundError('Customer'));
  });
});

describe('Create Card', () => {
  it('return is valid, given saved payerId', async () => {
    customersRepo.create(createCustomer);
    customersRepo.updatePayerId(customer_id, 'payerId');

    const res = await customers.cards.create(customer_id, createPaymentCard);

    await expectObject(res).toBe(CustomerCardRes);
  });

  it('return is valid, without saved payerId', async () => {
    customersRepo.create(createCustomer);

    const res = await customers.cards.create(customer_id, createPaymentCard);

    await expectObject(res).toBe(CustomerCardRes);
  });
});

describe('Find Cards', () => {
  const savePaymentCard2 = { ...savePaymentCard, id: 'cardId2' };

  it('return one card', async () => {
    customersRepo.create(createCustomer);
    customersRepo.cards.create(savePaymentCard);

    const res = await customers.cards.findMany(customer_id);

    await expectObject(res).toBe(CustomerCardRes);
    expect(res).toEqual([savePaymentCard]);
  });

  it('return two cards', async () => {
    customersRepo.create(createCustomer);
    customersRepo.cards.create(savePaymentCard);
    customersRepo.cards.create(savePaymentCard2);

    const res = await customers.cards.findMany(customer_id);

    await expectObject(res).toBe(CustomerCardRes);
    expect(res).toEqual([savePaymentCard, savePaymentCard2]);
  });

  it('return empty list', async () => {
    customersRepo.create(createCustomer);

    const res = await customers.cards.findMany(customer_id);

    expect(res).toEqual([]);
  });
});

describe('Update Card', () => {
  it('return is valid', async () => {
    customersRepo.create(createCustomer);
    customersRepo.cards.create(savePaymentCard);

    const res = await customers.cards.update(customer_id, savePaymentCard.id, {
      nickname: 'New nickname',
    });

    await expectObject(res).toBe(CustomerCardRes);
    expect(res).toEqual({ ...savePaymentCard, nickname: 'New nickname' });
  });

  it("throw Not Found, given card don't exist", async () => {
    const promise = customers.cards.update(
      customer_id,
      savePaymentCard.asaas_id,
      { nickname: 'New nickname' },
    );

    await expect(promise).rejects.toEqual(new NotFoundError('Card'));
  });
});

describe('Delete Card', () => {
  it('return is valid', async () => {
    customersRepo.create(createCustomer);
    customersRepo.cards.create(savePaymentCard);

    const res = await customers.cards.delete(customer_id, card_id);

    await expectObject(res).toBe(CustomerCardRes);
    expect(res).toEqual(savePaymentCard);
  });

  it("throw Not Found, given card don't exist", async () => {
    const promise = customers.cards.delete(customer_id, card_id);

    await expect(promise).rejects.toEqual(new NotFoundError('Card'));
  });
});
