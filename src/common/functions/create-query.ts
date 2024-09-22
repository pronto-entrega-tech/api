import { Prisma } from "@prisma/client";
import { fail } from "assert";
import { isArray } from "class-validator";

type TableName = keyof typeof Prisma.ModelName;

type Enumerable<T> = T | T[];

type Falsy = undefined | null | false | "" | 0;

export type BaseQuery = {
  table: TableName;
  select?: Enumerable<Prisma.Sql | Falsy>;
  leftJoin?: Enumerable<Prisma.Sql | Falsy>;
  innerJoin?: Enumerable<Prisma.Sql | Falsy>;
  where?: Enumerable<Prisma.Sql | Falsy>;
  orderBy?: Enumerable<Prisma.Sql | Falsy>;
  groupBy?: Enumerable<Prisma.Sql | Falsy>;
};

export type CreateQuery = Omit<BaseQuery, "table" | "select"> &
  (
    | {
        table: TableName;
        select: Enumerable<Prisma.Sql>;
        baseQuery?: undefined;
      }
    | {
        baseQuery: BaseQuery;
        table?: undefined;
        select?: Enumerable<Prisma.Sql>;
      }
  );

export const createQuery = (params: CreateQuery) => {
  const { baseQuery: baseParams } = params;
  {
    const sqlArr = [
      buildSelect(),
      buildLeftJoin(),
      buildInnerJoin(),
      buildWhere(),
      buildOrderBy(),
      buildGroupBy(),
    ];
    return Prisma.join(sqlArr, " ");
  }

  function buildSelect() {
    const selects = Prisma.join(getParam("select"));
    const table = Prisma.raw(
      baseParams?.table ?? params.table ?? fail("table must be defined"),
    );

    return Prisma.sql`SELECT ${selects} FROM ${table}`;
  }

  function buildLeftJoin() {
    const params = getParam("leftJoin");
    if (!params.length) return Prisma.empty;

    const SQLs = params.map((sql) => Prisma.sql`LEFT JOIN ${sql}`);
    return Prisma.join(SQLs, " ");
  }

  function buildInnerJoin() {
    const params = getParam("innerJoin");
    if (!params.length) return Prisma.empty;

    const SQLs = params.map((sql) => Prisma.sql`INNER JOIN ${sql}`);
    return Prisma.join(SQLs, " ");
  }

  function buildWhere() {
    const params = getParam("where");
    if (!params.length) return Prisma.empty;

    return Prisma.sql`WHERE ${Prisma.join(params, " AND ")}`;
  }

  function buildOrderBy() {
    const params = getParam("orderBy");
    if (!params.length) return Prisma.empty;

    return Prisma.sql`ORDER BY ${Prisma.join(params, " AND ")}`;
  }

  function buildGroupBy() {
    const params = getParam("groupBy");
    if (!params.length) return Prisma.empty;

    return Prisma.sql`GROUP BY ${Prisma.join(params, " AND ")}`;
  }

  function getParam(param: keyof Omit<CreateQuery, "table">) {
    return [
      ...toSqlArray(baseParams?.[param]),
      ...toSqlArray(params[param]),
    ].filter(Boolean);
  }

  function toSqlArray(value: unknown) {
    return value ? (isArray<unknown>(value) ? value : [value]) : [];
  }
};
