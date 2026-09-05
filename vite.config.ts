import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tauriConfig = JSON.parse(readFileSync(new URL('./src-tauri/tauri.conf.json', import.meta.url), 'utf8'));

function plantumlAssets(): Plugin {
  // TeaVM loads these built-in packs by fixed relative names.
  const assets = ['openiconic.js', 'emoji.js'].map((name) => ({
    name, source: readFileSync(new URL(`./node_modules/@plantuml/core/${name}`, import.meta.url)),
  }));
  let building = false;
  return {
    name: 'plantuml-builtin-assets',
    configResolved(config) { building = config.command === 'build'; },
    buildStart() {
      if (building) {
        for (const asset of assets) this.emitFile({ type: 'asset', fileName: asset.name, source: asset.source });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const asset = assets.find((asset) => request.url?.split('?')[0] === `/${asset.name}`);
        if (!asset) return next();
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.end(asset.source);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), plantumlAssets()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        plantuml: fileURLToPath(new URL('./plantuml.html', import.meta.url)),
      },
    },
  },
  preview: { headers: { 'Content-Security-Policy': tauriConfig.app.security.csp } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
