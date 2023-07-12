import { beforeEach, afterEach } from 'vitest';
import { second } from '~/common/constants/time';
import { prisma } from '~/common/prisma/prisma.service';
import { dbAnnihilator, AnnihilateDb } from './db-annihilator';

export function setupTestDb() {
  let annihilate: AnnihilateDb;

  beforeEach(async () => {
    await prisma.onModuleInit();

    annihilate = dbAnnihilator(prisma);
  });

  afterEach(() => annihilate(), 10 * second);
}
