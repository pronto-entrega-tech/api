import { Decimal } from '@prisma/client/runtime';
import {
  createCustomer,
  createdCustomer,
  deletedCustomer,
  foundCustomer,
  updateCustomer,
  updatedCustomer,
} from '@test/examples/customer';
import { savePaymentCard } from '@test/examples/payment-card';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { NotFoundError } from '~/common/errors/not-found';

const { customer_id, email } = createCustomer;
const { id: card_id } = savePaymentCard;
const payer_id = 'payerId';

const repoCases = createRepoCases('customers');

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe('Create', () => {
    it('return created', async () => {
      const res = await repo.customers.create(createCustomer);

      expect(res).toMatchObject(createdCustomer);
    });
  });

  describe('Exist', () => {
    it('return true', async () => {
      await repo.customers.create(createCustomer);

      const exist = await repo.customers.exist(customer_id);

      expect(exist).toEqual(true);
    });

    it('return false', async () => {
      const exist = await repo.customers.exist(customer_id);

      expect(exist).toEqual(false);
    });
  });

  describe('Find id', () => {
    it('return id', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.findId(email);

      expect(res).toEqual(customer_id);
    });

    it('return undefined', async () => {
      const res = await repo.customers.findId(email);

      expect(res).toBeUndefined();
    });
  });

  describe('Find payer id', () => {
    it('return payer id', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.updatePayerId(customer_id, payer_id);

      const res = await repo.customers.findPayerId(customer_id);

      expect(res).toEqual(payer_id);
    });

    it('return undefined', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.findPayerId(customer_id);

      expect(res).toBeUndefined();
    });
  });

  describe('Find one', () => {
    it('return one', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.findOne(customer_id);

      expect(res).toMatchObject(foundCustomer);
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.customers.findOne(customer_id);

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Update', () => {
    it('return updated', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.update(customer_id, updateCustomer);

      expect(res).toMatchObject(updatedCustomer);
    });

    it('update', async () => {
      await repo.customers.create(createCustomer);

      await repo.customers.update(customer_id, updateCustomer);

      const customer = await repo.customers.findOne(customer_id);
      expect(customer).toMatchObject({ ...foundCustomer, ...updateCustomer });
    });
  });

  describe('Update payer id', () => {
    it('update', async () => {
      await repo.customers.create(createCustomer);

      await repo.customers.updatePayerId(customer_id, payer_id);

      const payerId = await repo.customers.findPayerId(customer_id);
      expect(payerId).toEqual(payer_id);
    });
  });

  describe('Update debit', () => {
    it('update', async () => {
      await repo.customers.create(createCustomer);

      await repo.customers.updateDebit(customer_id, 10);

      const { debit } = await repo.customers.findOne(customer_id);
      expect(debit).toEqual(new Decimal(10));
    });
  });

  describe('Delete', () => {
    it('return deleted', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.delete(customer_id);

      expect(res).toMatchObject(deletedCustomer);
    });

    it('delete', async () => {
      await repo.customers.create(createCustomer);

      await repo.customers.delete(customer_id);

      const promise = repo.customers.findOne(customer_id);
      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Create Card', () => {
    it('return created', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.cards.create(savePaymentCard);

      expect(res).toMatchObject(savePaymentCard);
    });
  });

  describe('Find cards', () => {
    const savePaymentCard2 = { ...savePaymentCard, id: 'cardId2' };

    it('return one', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.cards.create(savePaymentCard);

      const res = await repo.customers.cards.findMany(customer_id);

      expect(res).toMatchObject([savePaymentCard]);
    });

    it('return two', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.cards.create(savePaymentCard);
      await repo.customers.cards.create(savePaymentCard2);

      const res = await repo.customers.cards.findMany(customer_id);

      expect(res).toMatchObject([savePaymentCard, savePaymentCard2]);
    });

    it('return empty list', async () => {
      await repo.customers.create(createCustomer);

      const res = await repo.customers.cards.findMany(customer_id);

      expect(res).toEqual([]);
    });
  });

  describe('Update Card', () => {
    const nickname = 'newNickname';
    it('return updated', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.cards.create(savePaymentCard);

      const res = await repo.customers.cards.update(customer_id, card_id, {
        nickname,
      });

      expect(res).toMatchObject({ ...savePaymentCard, nickname });
    });

    it('update', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.cards.create(savePaymentCard);

      await repo.customers.cards.update(customer_id, card_id, { nickname });

      const [card] = await repo.customers.cards.findMany(customer_id);
      expect(card).toMatchObject({ ...savePaymentCard, nickname });
    });
  });

  describe('Delete Card', () => {
    it('return deleted', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.cards.create(savePaymentCard);

      const res = await repo.customers.cards.delete(customer_id, card_id);

      expect(res).toMatchObject(savePaymentCard);
    });

    it('delete', async () => {
      await repo.customers.create(createCustomer);
      await repo.customers.cards.create(savePaymentCard);

      await repo.customers.cards.delete(customer_id, card_id);

      const [card] = await repo.customers.cards.findMany(customer_id);
      expect(card).toBeUndefined();
    });
  });
});
