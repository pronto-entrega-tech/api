import { PrismaService } from '~/common/prisma/prisma.service';
import { AdminRepository } from '~/repositories/admin/admin.repository';
import { InMemoryAdminRepository } from '~/repositories/admin/in-memory-admin.repository';
import { CitiesRepository } from '~/repositories/cities/cities.repository';
import { InMemoryCitiesRepository } from '~/repositories/cities/in-memory-cities.repository';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { InMemoryCustomersRepository } from '~/repositories/customers/in-memory-customers.repository';
import { InMemoryItemsRepository } from '~/repositories/items/in-memory-items.repository';
import { ItemsRepository } from '~/repositories/items/items.repository';
import { InMemoryMarketsRepository } from '~/repositories/markets/in-memory-markets.repository';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { InMemoryOrdersRepository } from '~/repositories/orders/in-memory-orders.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { InMemoryOTPRepository } from '~/repositories/otp/in-memory-otp.repository';
import { OTPRepository } from '~/repositories/otp/otp.repository';
import { InMemoryProductsRepository } from '~/repositories/products/in-memory-products.repository';
import { ProductsRepository } from '~/repositories/products/products.repository';
import { InMemorySessionsRepository } from '~/repositories/sessions/in-memory-sessions.repository';
import { SessionsRepository } from '~/repositories/sessions/sessions.repository';
import { dbAnnihilator, AnnihilateDb } from './db-annihilator';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

jest.mock('@nestjs/common', () => ({
  Injectable: jest.fn(),
}));
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: jest.fn(),
}));
jest.mock('@nestjs/axios', () => ({
  HttpService: jest.fn(),
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
