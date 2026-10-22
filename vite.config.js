// Islam Dunk build config. See tools/vite-plugin-islamdunk.js for how src/ becomes the game page.
//   npm run dev              local dev server with live reload (web)
//   npm run dev:electron     dev server for the Electron renderer (adds the save bridge)
//   npm run build:web        dist/web/       single-file web build (GitHub Pages, claude.ai)
//   npm run build:electron   dist/electron/  renderer for the desktop app, then packaged by electron-builder
//   npm run build:review     dist/review/    the Review Studio (see review mode below; not part of the game)
import { defineConfig } from 'vite';
import islamDunk, { EMPTY_ENTRY } from './tools/vite-plugin-islamdunk.js';
import reviewStudio from './tools/vite-plugin-review.js';

export default defineConfig(({ mode }) => {
  // the Review Studio (review.html + src/review-studio/): its own mode and output, never in the game builds
  //   npm run review:studio    dev server at http://localhost:5174/review.html
  //   npm run build:review     dist/review/ (static: review.html, game.html, review-data.json, assets)
  if (mode === 'review') return {
    root: '.', base: './', publicDir: 'assets',
    plugins: [reviewStudio()],
    server: { port: 5174, open: false },
    build: { outDir: 'dist/review', emptyOutDir: true, minify: false, modulePreload: false, rollupOptions: { input: { review: 'review.html' } } },
  };
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
