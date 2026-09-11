import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Alumni web app.
 *
 * The shared components are vendored as *source* under
 * `vendor/react-components/src`, not consumed as a built package: that library
 * is private and publishes no dist. That has one consequence worth stating
 * plainly, because it is the thing that breaks first for anyone wiring this up
 * again —
 *
 *   those components import each other through the library's own `@/` alias
 *   (`@/utils/errorLogger`, `@/types/formSystem`, …). Resolving `@ui` alone
 *   gets you a module that immediately fails to resolve its own imports. Both
 *   aliases have to exist here, and `@` has to point at the *library's* src.
 *
 * So this app addresses its own code as `~/` and leaves `@/` to mean what the
 * library already means by it. tsconfig.json repeats the same three entries;
 * the two files have to agree or the editor and the build will disagree.
 */
/**
 * Where the vendored library source lives.
 *
 * It sits inside the repository so Node resolves its bare imports
 * (`@mui/material`, `ag-grid-react`, ...) by walking up to this project's
 * node_modules, exactly as the app's own source does.
 */
const library = fileURLToPath(new URL('./vendor/react-components/src', import.meta.url));

/** Inlined at build time; the vendored library's error logger reads it. */
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '@ui': library,
      '@': library,
    },
    /*
     * One React, one MUI, one emotion. The vendored library shares this
     * project's node_modules, but dedupe keeps a second copy from being pulled
     * in transitively: two copies of React render nothing, and two emotion
     * caches break the theme with no error at all. Only direct dependencies
     * belong here — dedupe looks the name up in this project's root
     * node_modules, and naming a transitive package makes its subpath imports
     * unresolvable.
     */
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 5174,
    proxy: {
      // The gateway. In compose this is http://alumni-api:8080; on a host it is
      // whatever `go run ./cmd/server` listens on.
      '/api': { target: process.env.VITE_API_TARGET ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
