import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['renderer/tests/**/*.test.js'],
    setupFiles: ['renderer/tests/test-setup.js'],
  },
});
