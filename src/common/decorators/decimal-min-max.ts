import { createValidator } from "./create-validator";
import { Prisma } from "@prisma/client";
import { ValidationOptions } from "class-validator";

export const DecimalMinMax = (
  minimum: number,
  maximum: number,
  validationOptions?: ValidationOptions,
) =>
  createValidator(
    (value: Prisma.Decimal) =>
      Prisma.Decimal.isDecimal(value) &&
      value.greaterThanOrEqualTo(minimum) &&
      value.lessThanOrEqualTo(maximum),
    `$property must be minimum ${minimum} and maximum ${maximum}`,
  )(validationOptions);
