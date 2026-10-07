// Renders the app icons from the game's own logo code (src/render/logo.js) into assets/icons.
//   npm run build:web && node scripts/make-icons.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const html = fs.readFileSync(path.join(ROOT, 'dist/web/index.html'), 'utf8');
const b = await chromium.launch(); const p = await b.newPage();
await p.route('**/*', r => r.request().url().startsWith('http://icons.local/') ? r.fulfill({ status: 200, contentType: 'text/html', body: html }) : r.abort());
await p.goto('http://icons.local/'); await p.waitForFunction(() => typeof drawLogoIcon === 'function');
const icons = await p.evaluate(() => {
  const mk = (size, fn) => { const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size); return c.toDataURL('image/png'); };
  return {
    'icon-512.png': mk(512, (g, s) => drawLogoIcon(g, s / 2, s / 2, s)),
    'icon-192.png': mk(192, (g, s) => drawLogoIcon(g, s / 2, s / 2, s)),
    'apple-touch-icon.png': mk(180, (g, s) => drawLogoIconFull(g, s)),
    'icon-maskable-512.png': mk(512, (g, s) => drawLogoIconFull(g, s, 0.8))       // inside the 80% safe zone
  };
});
for (const [name, url] of Object.entries(icons)) { fs.writeFileSync(path.join(ROOT, 'assets/icons', name), Buffer.from(url.split(',')[1], 'base64')); console.log('wrote assets/icons/' + name); }
await b.close();
