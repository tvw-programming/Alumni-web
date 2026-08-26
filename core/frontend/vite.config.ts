import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep the heavy vendor libraries out of the app chunk so a code change
        // does not invalidate the whole bundle for returning users.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui/x-data-grid') || id.includes('@mui/x-tree-view')) return 'mui-x';
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui';
          if (
            id.includes('react-markdown') ||
            id.includes('remark') ||
            id.includes('react-syntax-highlighter') ||
            id.includes('refractor')
          ) {
            return 'markdown';
          }
          return 'vendor';
        },
      },
    },
  },
});
