import { Decimal } from '@prisma/client/runtime';

export const decimalOrNull = (value?: Decimal.Value) =>
  value ? new Decimal(value) : null;
