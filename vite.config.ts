import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: mode === 'pos' ? 5174 : 5173,

  },
  build: {
    // Use a proper string for outDir
    outDir: 'D:/Prod-build',
  },
}));
