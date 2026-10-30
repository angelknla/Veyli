import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', '.next-e2e', '.next-build', 'coverage'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['app/**', 'components/**', 'features/**', 'lib/**'],
      exclude: ['**/*.test.*'],
    },
  },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
});
