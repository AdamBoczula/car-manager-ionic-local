/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ mode }) => ({
  plugins: [
    angular({
      tsconfig: './tsconfig.spec.json',
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['./src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
}));
