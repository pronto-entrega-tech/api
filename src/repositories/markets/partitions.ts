import { Prisma } from "@prisma/client";
import { PrismaService } from "~/common/prisma/prisma.service";

export class Partitions {
  constructor(private readonly prisma: PrismaService) {}

  async exist(table: Prisma.ModelName, month: Date) {
    const y = month.getUTCFullYear();
    const m = month.getUTCMonth() + 1;

    const tableName = `${table}_${y}_${m}`;

    const [res] = await this.prisma.$queryRaw<
      [{ exists: boolean }]
    >`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ${tableName} AND table_schema = 'public')`;
    return res.exists;
  }

  createMonthly(month: Date, table: Prisma.ModelName) {
    const y = month.getUTCFullYear();
    const m = month.getUTCMonth() + 1;
    const date = month.toISOString().slice(0, 10);

    return this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "${table}_${y}_${m}" PARTITION OF ${table} FOR VALUES IN ('${date}')`,
    );
  }
}
