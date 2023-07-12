/* eslint-disable @typescript-eslint/no-var-requires */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../tsconfig');
const baseConfig = require('../jest.config');

/** @type {import('ts-jest').InitialOptionsTsJest} */
module.exports = {
  ...baseConfig,
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../src/',
  }),
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
};
