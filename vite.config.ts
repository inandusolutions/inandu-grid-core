/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'], exclude: ['src/**/*.test.*', 'src/**/*.spec.*'] })],
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: 'inandu-grid-core',
    },
    rollupOptions: {
      external: ['jspdf'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Measured 2026-11-19: statements 97.8, branches 94.1, functions 100, lines 97.9.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
      reporter: ['text-summary', 'text'],
      // A few points under what is measured today: a drop fails CI, normal change does not. Raise them when coverage rises.
      thresholds: { statements: 94, branches: 91, functions: 97, lines: 94 },
    },
  },
});
