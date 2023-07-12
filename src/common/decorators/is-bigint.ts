import { createValidator } from './create-validator';

const isBigInt = (value: any) => typeof value === 'bigint';

export const IsBigInt = createValidator(isBigInt, '$property must be a bigint');
