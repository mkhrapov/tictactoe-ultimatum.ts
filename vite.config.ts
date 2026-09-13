import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * The entry page is named after the app rather than index.html, because the host
 * this is deployed to does not serve pages by that name.
 */
const ENTRY = 'tictactoe-ultimatum.html';

/**
 * Serves the entry page at / while developing and previewing. Without it both
 * servers answer the root with a 404, since there is no index.html to fall back
 * on; deployment is unaffected either way.
 */
function serveEntryAtRoot(): Plugin {
  const rewriteRoot: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url === '/' || req.url?.startsWith('/?')) {
      req.url = `/${ENTRY}${req.url.slice(1)}`;
    }
    next();
  };

  return {
    name: 'serve-entry-at-root',
    configureServer(server) {
      server.middlewares.use(rewriteRoot);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteRoot);
    },
  };
}

// Relative asset URLs so the built site can be dropped into any directory of any
// static host, at a domain root or in a subdirectory, without rebuilding.
export default defineConfig({
  base: './',
  plugins: [serveEntryAtRoot()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: ENTRY,
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
