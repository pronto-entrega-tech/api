import { createValidator } from './create-validator';
import { Decimal } from '@prisma/client/runtime';

const isDecimalNonNegative = (value: Decimal) =>
  Decimal.isDecimal(value) && !value.isNegative();

export const IsDecimalNonNegative = createValidator(
  isDecimalNonNegative,
  '$property must be a positive decimal',
);
