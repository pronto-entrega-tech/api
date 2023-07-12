/* eslint-disable @typescript-eslint/no-var-requires */
import { Provider, Type } from '@nestjs/common';
import { sync as glob } from 'glob';

const path = (dirname: string, suffix: string) =>
  `${dirname}/use-cases/**/*.${suffix}.@(j|t)s`;

function get<T>(suffix: string, paths: string[]) {
  const doubleArray = paths.map(async (path) => {
    const m = require(path);

    return Object.entries(m)
      .filter(([name]) => name.endsWith(suffix))
      .map(([, v]) => v as T);
  });

  return doubleArray.flat();
}

export function importUseCases(dirname: string) {
  const controllersPaths = glob(path(dirname, 'controller'));
  const servicesPaths = glob(path(dirname, 'service'));

  return {
    controller: get<Type<any>>('Controller', controllersPaths),
    services: get<Provider<any>>('Service', servicesPaths),
  };
}
