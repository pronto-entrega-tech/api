import { createValidator } from "./create-validator";
import { Prisma } from "@prisma/client";
import { ValidationOptions } from "class-validator";

export const DecimalSize = (
  precision: number,
  scale: number,
  validationOptions?: ValidationOptions,
) =>
  createValidator(
    (value: Prisma.Decimal) =>
      Prisma.Decimal.isDecimal(value) &&
      value.truncated().toString().length <= precision - scale &&
      value.decimalPlaces() <= scale,
    `$property must have precision ${precision} and scale ${scale}`,
  )(validationOptions);
