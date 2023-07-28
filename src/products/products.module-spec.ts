import { Test } from '@nestjs/testing';
import { createCategory, createProduct } from '@test/examples/product';
import { AnnihilateDb, dbAnnihilator } from '@test/functions/db-annihilator';
import { pick } from '~/common/functions/pick';
import { PrismaService } from '~/common/prisma/prisma.service';
import { RepositoriesModule } from '~/repositories/repositories.module';
import { ProductsService } from './products.service';
import { afterAll, beforeEach, it, expect } from 'vitest';

let products: ProductsService;
let prisma: PrismaService;
let annihilate: AnnihilateDb;
const { code } = createProduct;
const foundProduct = pick(createProduct, 'name', 'brand');

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [RepositoriesModule],
    providers: [ProductsService],
  }).compile();

  products = module.get(ProductsService);

  prisma = module.get(PrismaService);
  annihilate = dbAnnihilator(prisma);
});

afterAll(() => annihilate(), 10 * 1000);

it('create and find', async () => {
  await products.createCategory(createCategory);

  await products.create(createProduct);

  const product = await products.findOneByCode(code);
  expect(product).toEqual(foundProduct);
});
