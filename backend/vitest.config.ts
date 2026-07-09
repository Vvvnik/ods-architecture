import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/performance/**/*.bench.ts'],
  testTimeout: 300_000,
  hookTimeout: 300_000,
    fileParallelism: false,
  },
});
