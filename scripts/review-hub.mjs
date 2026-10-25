// npm run review:hub  (builds first; or: node scripts/review-hub.mjs [--page dist/web/index.html] [--out dir] [--cases a,b])
// v9.6.2: screenshots of the career hub at the five review sizes (tests/hub-setup.js), every case or the ones named.
// Default output: docs/review/img/hub-<size>-<case>.png
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { CAL_HELPERS } from '../tests/calendar-setup.js';
import { HUB_HELPERS, HUB_SIZES, HUB_CASES } from '../tests/hub-setup.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), OUT = path.resolve(ROOT, arg('--out', 'docs/review/img'));
const ONLY = (arg('--cases', '') || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
const browser = await chromium.launch(), errs = [];
for (const [sz, dev] of HUB_SIZES) {
  const ctx = await browser.newContext(dev); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(sz + ': ' + e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/`);
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  await p.evaluate(([a, b, touch]) => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} (0, eval)(a); (0, eval)(b); Input.touchMode = touch; }, [CAL_HELPERS, HUB_HELPERS, !!dev.hasTouch]);
  for (const [name, o] of HUB_CASES) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    await p.evaluate(o => window.__hubCase(o), o); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(OUT, `hub-${sz}-${name}.png`) });
  }
  await ctx.close();
}
await browser.close(); srv.close();
console.log('wrote hub screenshots to', path.relative(ROOT, OUT) || '.'); if (errs.length) { console.error(errs.join('\n')); process.exitCode = 1; }
