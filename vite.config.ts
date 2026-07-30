import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Strip the local-only _backup_originals folder from the deploy output.
        // `.gitignore` stops git tracking, but Vite copies everything under
        // public/ into dist/ — so the 25 MiB originals would otherwise hang a
        // Cloudflare Pages deploy on its 25 MiB per-file limit.
        name: 'strip-backup-from-dist',
        // Belt-and-suspenders: try endBundle first (after all output written),
        // and closeBundle again in case the build was interrupted.
        endBundle() {
          const dir = path.resolve(__dirname, 'dist/music/_backup_originals');
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, {recursive: true, force: true});
            console.log('✓ Stripped public/music/_backup_originals/ from dist/');
          } else {
            console.log('· No _backup_originals/ in dist/ (clean build)');
          }
        },
        closeBundle() {
          const dir = path.resolve(__dirname, 'dist/music/_backup_originals');
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, {recursive: true, force: true});
            console.log('✓ Stripped public/music/_backup_originals/ from dist/ (closeBundle)');
          }
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
