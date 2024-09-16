import { beforeEach, afterEach } from "vitest";
import { second } from "~/common/constants/time";
import { PrismaService } from "~/common/prisma/prisma.service";
import { dbAnnihilator, AnnihilateDb } from "./db-annihilator";

const prisma = new PrismaService();

export function setupTestDb() {
  let annihilate: AnnihilateDb;

  beforeEach(async () => {
    await prisma.onModuleInit();

    annihilate = dbAnnihilator(prisma);
  });

  afterEach(() => annihilate(), 10 * second);
}
