import { Prisma } from '@prisma/client';
import { createValidator } from './create-validator';

const isDecimalObject = (value: any) => Prisma.Decimal.isDecimal(value);

export const IsDecimalObject = createValidator(
  isDecimalObject,
  '$property must be a Decimal object',
);
