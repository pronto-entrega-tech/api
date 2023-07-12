import { createValidator } from './create-validator';
import { Decimal } from '@prisma/client/runtime';

const isDecimalPositive = (value: Decimal) =>
  Decimal.isDecimal(value) && value.isPositive();

export const IsDecimalPositive = createValidator(
  isDecimalPositive,
  '$property must be a positive decimal',
);
