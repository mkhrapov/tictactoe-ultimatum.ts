// defineConfig comes from vitest/config rather than vite: from Vitest 4 on, that
// is what types the `test` block below.
import { defineConfig } from 'vitest/config';

// Relative asset URLs so the built site can be dropped into any directory,
// including a GitHub Pages project path, without rebuilding.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
