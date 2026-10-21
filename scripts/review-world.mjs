// npm run review:world  (builds first; or: node scripts/review-world.mjs [--page dist/web/index.html] [--out docs/review/img] [--no-gallery])
//
// v9.2 neighbourhood screenshots: every view (tests/world-setup.js WORLD_VIEWS) at the four times of day, on desktop
// (1280x720) and both phone sizes from the phone audit, as frozen deterministic frames (seeded, World.photo).
//   <out>/world-<view>-<tod>-<device>.png    (1x CSS pixels: the same files are the visual-regression baselines)
//   docs/review/gallery.html                 gets a "Neighbourhood" section linking every one
// The visual regression test (tests/run.mjs 'world-visual') compares fresh frames against these files.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WORLD_HELPERS, WORLD_VIEWS, WORLD_TODS } from '../tests/world-setup.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), OUT = path.resolve(ROOT, arg('--out', 'docs/review/img'));
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
if (!fs.existsSync(PAGE)) { console.error(`No build at ${PAGE}. Run npm run build:web first.`); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
export const WORLD_DEVICES = [['desktop', { viewport: { width: 1280, height: 720 } }], ['iphone', { viewport: { width: 750, height: 342 }, isMobile: true, hasTouch: true }], ['667x300', { viewport: { width: 667, height: 300 }, isMobile: true, hasTouch: true }]];
const SEED = `(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; })();`;
const srv = await new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const file = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u);
    fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res(s));
});
const browser = await chromium.launch(), errs = [], sleep = ms => new Promise(r => setTimeout(r, ms)), shots = [];
for (const [dn, dev] of WORLD_DEVICES) {
  if (ONLY.length && !ONLY.includes(dn)) continue;
  const ctx = await browser.newContext(dev);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(dn + ': ' + e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  await page.evaluate(WORLD_HELPERS);
  await page.evaluate(t => { Input.touchMode = t; }, dn !== 'desktop');
  for (const [view] of WORLD_VIEWS) for (let tod = 0; tod < 4; tod++) {
    await page.evaluate(([v, t]) => window.__worldPhoto(v, t), [view, tod]); await sleep(260);
    const file = path.join(OUT, `world-${view}-${WORLD_TODS[tod]}-${dn}.png`);
    await page.screenshot({ path: file }); shots.push({ view, tod: WORLD_TODS[tod], dn, file: path.basename(file) });
  }
  await ctx.close();
  console.log(dn + ': ' + WORLD_VIEWS.length * 4 + ' frames');
}
await browser.close(); srv.close();
// the gallery: one section, a row per view, the four times of day side by side, a tab per device
if (!process.argv.includes('--no-gallery') && OUT === path.join(ROOT, 'docs/review/img')) {
  const G = path.join(ROOT, 'docs/review/gallery.html'); let html = fs.readFileSync(G, 'utf8');
  const start = '<!-- world:start -->', end = '<!-- world:end -->';
  html = html.replace(new RegExp(start + '[\\s\\S]*?' + end), '');
  let sec = `${start}\n<h2 id="neighbourhood">Neighbourhood (v9.2): every scene at the four times of day</h2><p>Frozen frames, the same files the visual regression test compares against. Desktop 1280x720, iPhone landscape 750x342, small phone 667x300 (CSS pixels).</p>\n`;
  for (const [dn] of WORLD_DEVICES) {
    sec += `<h3 id="world-${dn}">${dn}</h3>\n`;
    for (const [view] of WORLD_VIEWS) sec += `<div class="g">` + WORLD_TODS.map(t => `<figure><a href="img/world-${view}-${t}-${dn}.png"><img src="img/world-${view}-${t}-${dn}.png" loading="lazy" alt=""></a><figcaption>${view} · ${t}</figcaption></figure>`).join('') + `</div>\n`;
  }
  sec += `<p><a href="#neighbourhood">Top of the neighbourhood</a> · ${WORLD_DEVICES.map(([d]) => `<a href="#world-${d}">${d}</a>`).join(' · ')}</p>\n${end}`;
  html = html.replace('</body></html>', sec + '</body></html>');
  if (!/href="#neighbourhood"/.test(html.split(start)[0])) html = html.replace('<p>Every court', '<p><a href="#neighbourhood">Neighbourhood scenes (v9.2)</a></p><p>Every court');
  fs.writeFileSync(G, html); console.log('gallery updated');
}
if (errs.length) console.log('page errors:', errs);
process.exit(errs.length ? 1 : 0);
