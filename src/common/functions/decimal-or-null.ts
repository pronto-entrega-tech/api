import { Prisma } from '@prisma/client';

export const decimalOrNull = (value?: Prisma.Decimal.Value) =>
  value ? new Prisma.Decimal(value) : null;
