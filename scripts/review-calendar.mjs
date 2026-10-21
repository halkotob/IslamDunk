// npm run review:calendar  (builds first; or: node scripts/review-calendar.mjs [--page dist/web/index.html] [--out docs/review/img])
//
// v9.0 career calendar screenshots for review, on desktop (1280x720) and both phone sizes from the phone audit
// (iPhone 13 landscape and 667x300), in five states: a game day, Jumu'ah, Ramadan, Eid and a stage break.
//   <out>/calendar-strip-<device>.png        the hub's strip (top of the hub) in the five states, one row each
//   <out>/calendar-month-<state>-<device>.png the month view in each state
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PHONES } from '../tests/phone-audit.mjs';
import { CAL_HELPERS, CAL_STATES } from '../tests/calendar-setup.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), OUT = path.resolve(ROOT, arg('--out', 'docs/review/img'));
if (!fs.existsSync(PAGE)) { console.error(`No build at ${PAGE}. Run npm run build:web first.`); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const srv = await new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const file = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u);
    fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res(s));
});
const DEVICES = [['desktop', { viewport: { width: 1280, height: 720 } }], ['iphone', PHONES[0][1]], ['667x300', PHONES[1][1]]];
const browser = await chromium.launch(), errs = [], sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [dn, dev] of DEVICES) {
  const ctx = await browser.newContext(dev);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(dn + ': ' + e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  await page.evaluate(CAL_HELPERS);
  await page.evaluate(t => { Input.touchMode = t; }, dn !== 'desktop');
  const strips = [];
  for (const st of CAL_STATES) {
    const label = await page.evaluate(s => window.__calState(s), st); await sleep(700);
    // the strip: its rectangle on screen (from the canvas transform), plus a margin
    const box = await page.evaluate(() => { const S = calStripGeom(), c = canvas.getBoundingClientRect(), k = c.height / H, x0 = (S.x + Math.round((W - 960) / 2)) * k + c.left, y0 = c.top + S.y * k;
      return { x: Math.max(0, x0 - 300 * k), y: Math.max(0, y0 - 12 * k), width: Math.min(c.right, x0 + (4 * S.w + 3 * S.gap + 70) * k) - Math.max(0, x0 - 300 * k), height: (S.h + 26) * k }; });
    strips.push({ label: st + ': ' + label, png: (await page.screenshot({ clip: box })).toString('base64') });
    await page.evaluate(() => openCalendar()); await sleep(600);
    const file = path.join(OUT, `calendar-month-${st}-${dn}.png`); await page.screenshot({ path: file }); console.log('wrote', path.relative(ROOT, file), '  ' + label);
  }
  // one sheet with the five strips
  const sheet = await page.evaluate(async rows => {
    const imgs = await Promise.all(rows.map(r => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + r.png; })));
    const w = Math.max(...imgs.map(i => i.width)), lh = 34, c = document.createElement('canvas'); c.width = w; c.height = imgs.reduce((a, i) => a + i.height + lh, 0);
    const g = c.getContext('2d'); g.fillStyle = '#0b1320'; g.fillRect(0, 0, c.width, c.height); let y = 0;
    imgs.forEach((im, k) => { g.fillStyle = '#f2cf6b'; g.font = 'bold 20px sans-serif'; g.fillText(rows[k].label, 10, y + 24); g.drawImage(im, 0, y + lh); y += im.height + lh; });
    return c.toDataURL('image/png');
  }, strips);
  const sf = path.join(OUT, `calendar-strip-${dn}.png`); fs.writeFileSync(sf, Buffer.from(sheet.split(',')[1], 'base64')); console.log('wrote', path.relative(ROOT, sf));
  await ctx.close();
}
if (errs.length) console.log('page errors:', errs);
await browser.close(); srv.close();
process.exit(errs.length ? 1 : 0);
