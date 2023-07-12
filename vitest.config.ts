import { InlineConfig } from 'vitest';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const integrationConfig: InlineConfig = {
  testTimeout: 30000,
};

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    dir: 'src',
    globals: true,
    setupFiles: 'test/setup.ts',
    ...(mode === 'integration' && integrationConfig),
  },
}));
