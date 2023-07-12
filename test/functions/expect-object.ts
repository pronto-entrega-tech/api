import { plainToInstance } from 'class-transformer';
import { ValidationError } from 'class-validator';
import { isArray, ValidateNested, validateOrReject } from 'class-validator';

/* function multiExpects(...fns: (() => void)[]) {
  const errs = fns.reduce((_, fn) => {
    try {
      fn();
      return _;
    } catch (err) {
      return [..._, err.message ?? err];
    }
  }, [] as Error[]);
  if (errs.length) {
    const err = new Error(errs.join('\n\n'));
    Error.captureStackTrace(err, multiExpects);
    throw err;
  }
} */

class Array {
  @ValidateNested()
  array: any;
}

export function expectObject(obj: any) {
  function handle(errs: ValidationError[]) {
    const a = JSON.stringify(errs, null, '  ').replace(/"/g, '');
    console.log(a);

    const reducer = (errors: string[], err: ValidationError) =>
      errors.concat(
        Object.values(err.constraints ?? {}).map(
          (msg) => `${msg}, but has ${typeof err.value}`,
        ),
      );

    const reduceArr = (errors: string[], err: ValidationError) =>
      errors
        .concat(err.children?.reduce(reducer, [] as string[]) ?? [])
        .concat('');

    const errors =
      errs[0].property === 'array' &&
      errs[0].children &&
      errs[0].children[0].children
        ? errs[0].children.reduce(reduceArr, [] as string[])
        : errs.reduce(reducer, [] as string[]);

    const received = JSON.stringify(obj, null, '  ').replace(/"/g, '');
    const error = new Error(
      `Errors:\n  ${errors.join('\n  ')}\n\nReceived: ${received}`,
    );
    Error.captureStackTrace(error, toBe);
    throw error;
  }

  async function toBe(cls: any) {
    const instance = plainToInstance(cls, obj);
    isArray(instance)
      ? await validateOrReject(
          plainToInstance(Array, { array: instance }),
        ).catch(handle)
      : await validateOrReject(instance).catch(handle);
  }
  return { toBe };
}
