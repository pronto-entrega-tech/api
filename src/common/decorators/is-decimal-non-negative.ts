import { createValidator } from './create-validator';
import { Prisma } from '@prisma/client';

const isDecimalNonNegative = (value: Prisma.Decimal) =>
  Prisma.Decimal.isDecimal(value) && !value.isNegative();

export const IsDecimalNonNegative = createValidator(
  isDecimalNonNegative,
  '$property must be a positive decimal',
);
