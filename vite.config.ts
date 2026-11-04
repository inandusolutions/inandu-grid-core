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
  },
});
