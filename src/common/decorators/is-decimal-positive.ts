import { createValidator } from './create-validator';
import { Prisma } from '@prisma/client';

const isDecimalPositive = (value: Prisma.Decimal) =>
  Prisma.Decimal.isDecimal(value) && value.isPositive();

export const IsDecimalPositive = createValidator(
  isDecimalPositive,
  '$property must be a positive decimal',
);
