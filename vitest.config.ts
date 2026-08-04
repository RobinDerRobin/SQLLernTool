import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/editor/domEditor.{ts,test.ts}', 'jsdom'],
      ['src/editor/domEditor.test.ts', 'jsdom'],
      ['src/persistence/**', 'jsdom'],
      ['src/ui/**', 'jsdom'],
      ['src/theme/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
