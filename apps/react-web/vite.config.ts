import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Alumni web app.
 *
 * The shared components are consumed as *source*, not as a built package:
 * `libraries/archive/react-components/frontend/react` is private and publishes no dist.
 * That has one consequence worth stating plainly, because it is the thing that
 * breaks first for anyone wiring this up again —
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
 * Where the library's source lives.
 *
 * Overridable because the container puts it somewhere the checkout does not.
 * Node resolves a bare import like `@mui/material` by walking up from the
 * importing file, so library source mounted outside the app directory finds no
 * node_modules above it and fails on its own dependencies. The image therefore
 * mounts it at /app/.library and sets this variable; on a Mac checkout the
 * relative path is already correct.
 */
const library =
  process.env.ALUMNI_LIB_SRC ??
  fileURLToPath(new URL('../../libraries/archive/react-components/frontend/react/src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '@ui': library,
      '@': library,
    },
    /*
     * One React, one MUI, one emotion. The library resolves its dependencies
     * from its own node_modules and this app from its own; two copies of React
     * render nothing, and two emotion caches break the theme with no error at
     * all. Only direct dependencies belong here — dedupe looks the name up in
     * this project's root node_modules, and naming a transitive package makes
     * its subpath imports unresolvable.
     */
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 5174, // 5173 is the core run monitor; both run during development.
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
