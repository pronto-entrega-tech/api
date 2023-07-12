import { createAdmin } from '@test/examples/admin';
import { createRepoCases } from '@test/functions/setup-repo-test';

const { admin_id, email } = createAdmin;

const repoCases = createRepoCases('admin');

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe('Create', () => {
    it('return created', async () => {
      const res = await repo.admin.create(createAdmin);

      expect(res).toEqual(createAdmin);
    });
  });

  describe('Exist', () => {
    it('return true', async () => {
      await repo.admin.create(createAdmin);

      const exist = await repo.admin.exist(email);

      expect(exist).toEqual(true);
    });

    it('return false', async () => {
      const exist = await repo.admin.exist(email);

      expect(exist).toEqual(false);
    });
  });

  describe('Find id', () => {
    it('return id', async () => {
      await repo.admin.create(createAdmin);

      const id = await repo.admin.findId(email);

      expect(id).toEqual(admin_id);
    });

    it('return undefined', async () => {
      const id = await repo.admin.findId(email);

      expect(id).toBeUndefined();
    });
  });
});
