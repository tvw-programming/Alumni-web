import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'smoke.tsx',
    outDir: 'dist-smoke',
    rollupOptions: { output: { format: 'esm' } },
  },
});
