import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      // Peer dependencies are not bundled — the consuming app provides them.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/material/*',
        '@mui/icons-material',
        '@mui/icons-material/*',
        '@emotion/react',
        '@emotion/styled',
      ],
      output: {
        // Preserve the package structure for tree-shaking.
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    sourcemap: true,
    // Target modern browsers — the app already uses ES2022.
    target: 'es2022',
  },
});
