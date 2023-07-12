import { INestApplication, OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { fail } from 'assert';
import { execSync } from 'child_process';
import { isDevOrTest } from '../constants/is-dev';

const config = Prisma.validator<Prisma.PrismaClientOptions>()({
  log: [{ emit: 'event', level: 'query' }],
});

type PrismaOptions = typeof config & { datasources?: { db: { url: string } } };

const createUrl = (instance?: string) => {
  const DATABASE_URL =
    process.env.DATABASE_URL ?? fail('DATABASE_URL must be defined');

  if (!instance) return DATABASE_URL;

  return DATABASE_URL.replace(/(?<=\/\/.*\/).*?(?=\?|$)/, `db_${instance}`);
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaOptions, 'query', false>
  implements OnModuleInit
{
  /* constructor() {
    const url = createUrl(process.env.JEST_WORKER_ID);

    super({ ...config, datasources: { db: { url } } });
  } */

  async onModuleInit() {
    // if (isDevOrTest) this.devSetup();

    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      // if (isDevOrTest) this.teardown();

      await app.close();
    });
  }

  async truncate(tablesNames: string[]) {
    const tables = this.tablesSql(tablesNames);
    if (!tables) return;

    await this.$executeRawUnsafe(
      `TRUNCATE ${tables} RESTART IDENTITY CASCADE`,
    ).catch(console.error);
  }

  async dropPartitions(tablesNames: string[]) {
    const tables = this.tablesSql(tablesNames);
    if (!tables) return;

    await this.$executeRawUnsafe(`DROP TABLE ${tables} CASCADE`).catch(
      console.error,
    );
  }

  private tablesSql(tablesNames: string[]) {
    return tablesNames.map((tableName) => `"public"."${tableName}"`).join();
  }

  private devSetup() {
    console.log('Creating containers');
    execSync('yarn docker:up');

    console.log('Running migrations');
    // execSync('yarn migrate:dev');
    execSync('npx prisma db push');
  }

  private teardown() {
    console.log('Destroying containers');
    execSync('yarn docker:down');
  }
}

export const prisma = new PrismaService();
