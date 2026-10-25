import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  envDir: '..',
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/main.css';
          }
          return 'assets/[name].[ext]';
        },
      },
    },
  },
  server: {
    proxy: {
      '/v1': 'http://localhost:8787',
      '/assets/logo.png': 'http://localhost:8787',
      '/assets/favicon.png': 'http://localhost:8787',
      '/assets/favicon.svg': 'http://localhost:8787',
      '/favicon.ico': 'http://localhost:8787',
      '/healthz': 'http://localhost:8787',
    },
  },
});
