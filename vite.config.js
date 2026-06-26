import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Source unique de vérité pour la version : package.json
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Exposé à l'app : remplacé au build par la version de package.json
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Base URL - utilise '/' en local, '/hospifinance/' pour GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/hospifinance/' : '/',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Sépare les gros vendors en chunks dédiés (cache navigateur + chargement //)
        manualChunks: {
          recharts: ['recharts'],
          xlsx: ['xlsx'],
          pdf: ['jspdf'],
        },
      },
    },
  },
});
