import { Decimal } from '@prisma/client/runtime';
import { createValidator } from './create-validator';

const isDecimalObject = (value: any) => Decimal.isDecimal(value);

export const IsDecimalObject = createValidator(
  isDecimalObject,
  '$property must be a Decimal object',
);
