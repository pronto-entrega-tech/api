import { createValidator } from './create-validator';
import { Decimal } from '@prisma/client/runtime';
import { ValidationOptions } from 'class-validator';

export const DecimalSize = (
  precision: number,
  scale: number,
  validationOptions?: ValidationOptions,
) =>
  createValidator(
    (value: Decimal) =>
      Decimal.isDecimal(value) &&
      value.truncated().toString().length <= precision - scale &&
      value.decimalPlaces() <= scale,
    `$property must have precision ${precision} and scale ${scale}`,
  )(validationOptions);
