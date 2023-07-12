import { createValidator } from './create-validator';
import { Decimal } from '@prisma/client/runtime';
import { ValidationOptions } from 'class-validator';

export const DecimalMinMax = (
  minimum: number,
  maximum: number,
  validationOptions?: ValidationOptions,
) =>
  createValidator(
    (value: Decimal) =>
      Decimal.isDecimal(value) &&
      value.greaterThanOrEqualTo(minimum) &&
      value.lessThanOrEqualTo(maximum),
    `$property must be minimum ${minimum} and maximum ${maximum}`,
  )(validationOptions);
