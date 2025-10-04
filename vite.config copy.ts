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
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem')),
    },
  },
  build: {
    outDir: mode === 'pos' ? 'dist-pos' : 'C:/Users/Gerald/Downloads/nginx-1.28.0/nginx-1.28.0/html',
  },
}));