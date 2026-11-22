import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CYBERVERSE - single Vite project.
// - index.html: the 3D experience (engine is code-split and only loaded there).
// - tools/*: dev-only pages (kit viewer), never part of the production build.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rolldownOptions: { input: { main: 'index.html' } },
  },
});
