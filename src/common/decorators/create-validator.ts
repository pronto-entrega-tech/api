import {
  ValidationOptions,
  ValidatorConstraintInterface,
} from 'class-validator';
import { buildMessage, ValidateBy } from 'class-validator';

export const createValidator =
  (fn: ValidatorConstraintInterface['validate'], defaultMessage: string) =>
  (validationOptions?: ValidationOptions) =>
    ValidateBy(
      {
        name: fn.name,
        validator: {
          validate: fn,
          defaultMessage: buildMessage(
            (eachPrefix) => eachPrefix + defaultMessage,
            validationOptions,
          ),
        },
      },
      validationOptions,
    );
