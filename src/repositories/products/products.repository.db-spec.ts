import {
  createCategory,
  createProduct,
  createProduct2,
} from '@test/examples/product';
import { createRepoCases } from '@test/functions/setup-repo-test';
import { pick } from '~/common/functions/pick';

const { prod_id, code } = createProduct;

const repoCases = createRepoCases('products');

describe.each(repoCases)('%s', (_name, setup) => {
  const repo = setup();

  describe('Create category', () => {
    it('return category', async () => {
      const res = await repo.products.createCategory(createCategory);

      expect(res).toMatchObject(createCategory);
    });
  });

  describe('Create', () => {
    it('return product', async () => {
      await repo.products.createCategory(createCategory);
      const product = await repo.products.create(createProduct);

      expect(product).toMatchObject(createProduct);
    });
  });

  describe('Find one', () => {
    it('return product', async () => {
      await repo.products.createCategory(createCategory);
      await repo.products.create(createProduct);

      const product = await repo.products.findOneByCode(code);

      expect(product).toMatchObject(
        pick(createProduct, 'brand', 'name', 'prod_id'),
      );
    });

    it('return null', async () => {
      const product = await repo.products.findOneByCode(code);

      expect(product).toBeNull();
    });
  });

  describe('Find many', () => {
    const { prod_id: prod_id2, code: prod_code2 } = createProduct2;

    it('return one product', async () => {
      await repo.products.createCategory(createCategory);
      await repo.products.create(createProduct);
      await repo.products.create(createProduct2);

      const res = await repo.products.findIdsByCodes([code]);

      expect(res).toMatchObject([prod_id]);
    });

    it('return two products', async () => {
      await repo.products.createCategory(createCategory);
      await repo.products.create(createProduct);
      await repo.products.create(createProduct2);

      const res = await repo.products.findIdsByCodes([code, prod_code2]);

      expect(res).toMatchObject([prod_id, prod_id2]);
    });

    it('return empty list', async () => {
      await repo.products.createCategory(createCategory);
      await repo.products.create(createProduct);
      await repo.products.create(createProduct2);

      const res = await repo.products.findIdsByCodes([]);

      expect(res).toEqual([]);
    });
  });
});
