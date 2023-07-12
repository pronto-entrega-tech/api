import { createOTP } from '@test/examples/otp';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { Role } from '~/auth/constants/roles';
import { NotFoundError } from '~/common/errors/not-found';

const role = createOTP.role as Role;
const { otp_id } = createOTP;
const expiredOTP = { ...createOTP, expires_in: new Date() };

const repoCases = createRepoCases('otp');

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe('Create', () => {
    it('return otp', async () => {
      const res = await repo.otp.create(createOTP);

      expect(res).toMatchObject(createOTP);
    });
  });

  describe('Find one', () => {
    it('return otp', async () => {
      await repo.otp.create(createOTP);

      const res = await repo.otp.findOne(otp_id, role);

      expect(res).toMatchObject(createOTP);
    });

    it('return expired otp, given includeExpired flag', async () => {
      await repo.otp.create(expiredOTP);

      const res = await repo.otp.findOne(otp_id, role, {
        includeExpired: true,
      });

      expect(res).toMatchObject(expiredOTP);
    });

    it('return null, given is expired', async () => {
      await repo.otp.create(expiredOTP);

      const res = await repo.otp.findOne(otp_id, role);

      expect(res).toBeNull();
    });

    it('return null, given not exist', async () => {
      const res = await repo.otp.findOne(otp_id, role);

      expect(res).toBeNull();
    });
  });

  describe('Delete', () => {
    it('return deleted', async () => {
      await repo.otp.create(createOTP);

      const res = await repo.otp.delete(otp_id);

      expect(res).toMatchObject(createOTP);
    });

    it('delete', async () => {
      await repo.otp.create(createOTP);

      await repo.otp.delete(otp_id);

      const otp = await repo.otp.findOne(otp_id, role);
      expect(otp).toBeNull();
    });

    it('throw Not Found, given not exist', async () => {
      const promise = repo.otp.delete(otp_id);

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Delete expired', () => {
    it('delete expired', async () => {
      await repo.otp.create(expiredOTP);

      await repo.otp.deleteExpired();

      const otp = await repo.otp.findOne(otp_id, role);
      expect(otp).toBeNull();
    });
  });
});
