import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
// `vitest/config`'s defineConfig is a superset of Vite's — it keeps the app
// and its tests on one resolver, one alias table and one plugin list, so a
// test can never pass against a module graph the build does not produce.
import { defineConfig } from 'vitest/config';

import { runTestsPlugin } from './src/test/runTestsPlugin';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string };

const appRoot = fileURLToPath(new URL('.', import.meta.url));
// packages/ui lives at idol/packages/ui, which is two levels up from frontend/react
const uiPackageRoot = fileURLToPath(new URL('../../packages/ui', import.meta.url));

export default defineConfig({
  // runTestsPlugin is `apply: 'serve'` — it adds the dev-only endpoint behind
  // the admin console's "Run unit tests" button and is absent from builds.
  plugins: [react(), runTestsPlugin()],
  define: {
    // App version, surfaced in the public footer.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    /*
     * `packages/ui` is a workspace package with its own `node_modules`, so React,
     * MUI and emotion can each resolve twice — once for the app, once for the
     * package. Two Reacts render nothing at all; two emotion caches break the
     * theme context silently, which is worse. Deduping pins one copy of each.
     *
     * Only *direct* dependencies belong here. `dedupe` resolves the name from
     * this project's root `node_modules`, and pnpm's strict layout only links
     * declared dependencies there — so listing a transitive package such as
     * `@mui/system` makes every one of its subpath imports unresolvable
     * (`@mui/system/useMediaQuery`), which fails the build and, in dev, yields
     * a blank page with no error at all. Deduping `@mui/material` already
     * gives `@mui/system` a single copy.
     */
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    proxy: {
      // Mirrors nginx.conf's `/api/` proxy_pass so `pnpm dev` talks to the
      // same Go Fiber API, on the same relative path, as the dockerized
      // build — see api/goApiClient.ts. Target the api container's
      // loopback-published port (see docker-compose.yaml's API_HOST_PORT).
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
    // Allow the @idol-ui/react workspace package source files to be served.
    // import.meta.glob in registry.ts resolves paths relative to packages/ui/src/.
    fs: {
      allow: [appRoot, uiPackageRoot],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // No `globals: true`: importing describe/it/expect explicitly keeps the
    // type-aware ESLint rules working in test files without widening
    // tsconfig's `types` for the whole app.
    globals: false,
    restoreMocks: true,
    // `default` keeps normal terminal output; the second reporter writes
    // public/test-report.json, which the admin console's Unit tests tab reads.
    reporters: ['default', './src/test/logReporter.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx', 'src/test/**'],
    },
    server: {
      // Allow vitest's dev server to access files in the workspace package.
      fs: {
        allow: [appRoot, uiPackageRoot],
      },
      deps: {
        inline: [/^@idol-ui/],
      },
    },
  },
});
