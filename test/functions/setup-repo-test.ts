import { PrismaService } from '~/common/prisma/prisma.service';
import { AdminRepository } from '~/repositories/admin/admin.repository';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { ItemsRepository } from '~/repositories/items/items.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { OTPRepository } from '~/repositories/otp/otp.repository';
import { ProductsRepository } from '~/repositories/products/products.repository';
import { SessionsRepository } from '~/repositories/sessions/sessions.repository';
import { dbAnnihilator, AnnihilateDb } from './db-annihilator';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

vi.mock('@nestjs/common', () => ({
  Injectable: vi.fn(),
}));
vi.mock('@nestjs/swagger', () => ({
  ApiProperty: vi.fn(),
}));
vi.mock('@nestjs/axios', () => ({
  HttpService: vi.fn(),
}));

const repos = {
  admin: [AdminRepository, InMemoryAdminRepository],
  cities: [CitiesRepository, InMemoryCitiesRepository],
  customers: [CustomersRepository, InMemoryCustomersRepository],
  items: [ItemsRepository, InMemoryItemsRepository],
  markets: [MarketsRepository, InMemoryMarketsRepository],
  orders: [OrdersRepository, InMemoryOrdersRepository],
  otp: [OTPRepository, InMemoryOTPRepository],
  products: [ProductsRepository, InMemoryProductsRepository],
  sessions: [SessionsRepository, InMemorySessionsRepository],
} as const;

type RepoName = keyof typeof repos;
type Class = new (...args: any) => any;

export const createRepoCases = <
  T extends RepoName,
  T2 extends Exclude<RepoName, T>[] = [],
>(
  main: T,
  extras?: T2,
) => {
  const [DbRepo, InMemoryRepo] = repos[main];

  const repoNames = [main, ...(extras ?? [])];
  const dbRepos = repoNames.map(toNameAndRepo(0));
  const inMemoryRepos = repoNames.map(toNameAndRepo(1));

  return [
    [InMemoryRepo['name'], () => inMemorySetup(inMemoryRepos)],
    [DbRepo['name'], () => dbSetup(main, dbRepos)],
  ] as [
    string,
    () => { [x in T | T2[number]]: InstanceType<typeof repos[x][0]> },
  ][];
};

const toNameAndRepo = (v: number) => (name: string) => ({
  name,
  Repo: repos[name][v],
});

const inMemorySetup = (repos: { name: string; Repo: Class }[]) => {
  const v = {};

  beforeEach(() =>
    repos.forEach(({ name, Repo }) => {
      v[name] = new Repo();
    }),
  );

  return v;
};

const dbSetup = (main: string, repos: { name: string; Repo: Class }[]) => {
  const v = {};
  let prisma: PrismaService;
  let annihilate: AnnihilateDb;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    annihilate = dbAnnihilator(prisma);

    repos.forEach(({ name, Repo }) => {
      v[name] = new Repo(prisma);
    });
  }, 10 * 1000);

  beforeEach(() => prisma.truncate([main]));

  /* afterEach(async () => {
  }, 10 * 1000); */

  afterAll(async () => {
    await annihilate();
    await prisma.$disconnect();
  }, 10 * 1000);

  return v;
};
