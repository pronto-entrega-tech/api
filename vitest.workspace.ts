import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.mts',
    test: {
      name: 'unit',
      include: ['src/**/*.spec.ts'],
      setupFiles: ['test/setup.ts', 'test/setupMocks.ts'],
      isolate: false,
    },
  },
  {
    extends: './vitest.config.mts',
    test: {
      name: 'e2e',
      include: ['test/**/*.e2e-spec.ts'],
      setupFiles: 'test/setup.ts',
      testTimeout: 30000,
    },
  },
]);
