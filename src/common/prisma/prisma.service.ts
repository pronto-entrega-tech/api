import { INestApplication, OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const config = Prisma.validator<Prisma.PrismaClientOptions>()({
  log: [{ emit: 'event', level: 'query' }],
});

@Injectable()
export class PrismaService
  extends PrismaClient<typeof config, 'query', false>
  implements OnModuleInit
{
  constructor() {
    super({ ...config });
  }

  async onModuleInit() {
    // if (isDevOrTest) await this.devSetup();

    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      // if (isDevOrTest) await this.teardown();

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

  // private async devSetup() {
  //   console.log('Creating containers');
  //   await exec('pnpm docker:up');

  //   console.log('Running migrations');
  //   await exec('pnpm prisma db execute --file prisma/schema.sql');
  // }

  // private async teardown() {
  //   console.log('Destroying containers');
  //   await exec('pnpm docker:down');
  // }
}
