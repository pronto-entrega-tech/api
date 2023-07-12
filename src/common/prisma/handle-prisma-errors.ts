import { PrismaClientKnownRequestError as PrismaRequestError } from '@prisma/client/runtime';
import { EntityName } from '../constants/entities-names';
import { AlreadyExistError } from '../errors/already-exist';
import { NotFoundError } from '../errors/not-found';

export const createNullEmailFilter = (fn: (withSame?: string[]) => any) => {
  return <T = any>(email: string | null, res: T) => {
    if (!email) throw fn();
    return { email, ...res };
  };
};

const captureStackTrace = (error: Error, fn: any) => {
  Error.captureStackTrace(error, fn);
  return error;
};

export const prismaAlreadyExist = (prefix: EntityName) => {
  return prismaError('P2002', '', (withSame) =>
    captureStackTrace(
      new AlreadyExistError(prefix, withSame),
      prismaAlreadyExist,
    ),
  );
};

export const prismaNotFound = (prefix: EntityName) => {
  return prismaError('P2025', 'NotFoundError', () =>
    captureStackTrace(new NotFoundError(prefix), prismaNotFound),
  );
};

const prismaError = (
  errCode: string,
  errName: string,
  fn: (withSame?: string[]) => any,
) => {
  return (err: PrismaRequestError): never => {
    if (err.code === errCode || (errName && err.name === errName))
      throw fn(err.meta?.target as string[]);

    throw err;
  };
};
