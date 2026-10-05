// Islam Dunk build config. See tools/vite-plugin-islamdunk.js for how src/ becomes the game page.
//   npm run dev              local dev server with live reload (web)
//   npm run dev:electron     dev server for the Electron renderer (adds the save bridge)
//   npm run build:web        dist/web/       single-file web build (GitHub Pages, claude.ai)
//   npm run build:electron   dist/electron/  renderer for the desktop app, then packaged by electron-builder
import { defineConfig } from 'vite';
import islamDunk, { EMPTY_ENTRY } from './tools/vite-plugin-islamdunk.js';

export default defineConfig(({ mode }) => {
  const target = mode === 'electron' ? 'electron' : 'web';
  return {
    root: '.',
    base: './',
    publicDir: 'assets',                 // icons + web manifest, copied as-is
    plugins: [islamDunk({ target })],
    server: { port: 5173, open: false },
    build: {
      outDir: target === 'electron' ? 'dist/electron' : 'dist/web',
      emptyOutDir: true,
      minify: false,                     // ship the same readable script as always
      modulePreload: false,
      rollupOptions: { input: EMPTY_ENTRY, onwarn(w, warn) { if (w.code !== 'EMPTY_BUNDLE') warn(w); } },
    },
  };
});
