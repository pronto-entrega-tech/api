import { createSession } from '@test/examples/auth';
import { createCustomer } from '@test/examples/customer';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { Role } from '~/auth/constants/roles';
import { NotFoundError } from '~/common/errors/not-found';

const role = Role.Customer;
const { session_id } = createSession;
const expiredSession = { ...createSession, expires_in: new Date() };

const repoCases = createRepoCases('sessions', ['customers']);

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe('Create', () => {
    it('return session', async () => {
      await repo.customers.create(createCustomer);
      const res = await repo.sessions.create(role, createSession);

      expect(res).toMatchObject(createSession);
    });
  });

  describe('Find one', () => {
    it('return created', async () => {
      await repo.customers.create(createCustomer);
      await repo.sessions.create(role, createSession);

      const res = await repo.sessions.findOne(role, session_id);

      expect(res).toMatchObject(createSession);
    });

    it('return expired session, given includeExpired flag', async () => {
      await repo.customers.create(createCustomer);
      await repo.sessions.create(role, expiredSession);

      const res = await repo.sessions.findOne(role, session_id, {
        includeExpired: true,
      });

      expect(res).toMatchObject(expiredSession);
    });

    it('return null, given is expired', async () => {
      await repo.customers.create(createCustomer);
      await repo.sessions.create(role, expiredSession);

      const res = await repo.sessions.findOne(role, session_id);

      expect(res).toBeNull();
    });

    it('return null, given not exist', async () => {
      const res = await repo.sessions.findOne(role, session_id);

      expect(res).toBeNull();
    });
  });

  describe('Delete', () => {
    it('return deleted', async () => {
      await repo.customers.create(createCustomer);
      await repo.sessions.create(role, createSession);

      const res = await repo.sessions.delete(role, session_id);

      expect(res).toEqual(createSession);
    });

    it('delete', async () => {
      await repo.customers.create(createCustomer);
      await repo.sessions.create(role, createSession);

      await repo.sessions.delete(role, session_id);

      const res = await repo.sessions.findOne(role, session_id);
      expect(res).toBeNull();
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.sessions.delete(role, session_id);

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Delete expired', () => {
    it('delete expired', async () => {
      await repo.customers.create(createCustomer);
      await repo.sessions.create(role, expiredSession);

      await repo.sessions.deleteExpired();

      const res = await repo.sessions.findOne(role, session_id, {
        includeExpired: true,
      });
      expect(res).toBeNull();
    });
  });
});
