import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CYBERVERSE - one Vite project, two pages:
// - index.html: the 3D experience (the engine is code-split and only loaded there);
// - recruiter/index.html: Recruiter Mode (plain DOM, never imports the engine).
// tools/* are dev-only pages and are not part of the production build.
const hasPhoto = fs.existsSync(new URL('./public/assets/profile/photo.jpg', import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: { __HAS_PHOTO__: JSON.stringify(hasPhoto) },
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rolldownOptions: { input: { main: 'index.html', recruiter: 'recruiter/index.html' } },
  },
});
