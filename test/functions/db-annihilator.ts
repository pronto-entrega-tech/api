import { PrismaService } from "~/common/prisma/prisma.service";

export type AnnihilateDb = ReturnType<typeof dbAnnihilator>;

export const dbAnnihilator = (prisma: PrismaService) => {
  const calledTables = new Set<string>();
  const createdPartitions = new Set<string>();

  prisma.$on("query", ({ query }) => {
    if (query.startsWith("INSERT"))
      log(query, calledTables, /(?<=INSERT INTO "public".").*?(?=")/g);

    if (query.startsWith("CREATE TABLE"))
      log(query, createdPartitions, /(?<=.").*?(?=" PARTITION)/g);
  });

  return async () => {
    await prisma.truncate([...calledTables]);
    calledTables.clear();

    await prisma.dropPartitions([...createdPartitions]);
    createdPartitions.clear();
  };
};

const log = (query: string, set: Set<string>, regex: RegExp) => {
  const matches = query.match(regex);

  matches?.forEach((v) => set.add(v));
};
