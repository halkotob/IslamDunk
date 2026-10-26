// npm run review:league  (builds first; or: node scripts/review-league.mjs [--page dist/web/index.html] [--out dir] [--days 5] [--sizes 1280x720,844x390])
// v9.7.0: screenshots of the league screens (tests/league-setup.js LEAGUE_CASES) at the review sizes (tests/hub-setup.js).
// One page plays a seeded career's first `days` game days for real; every size then loads that same career.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { CAL_HELPERS } from '../tests/calendar-setup.js';
import { LEAGUE_HELPERS, LEAGUE_CASES } from '../tests/league-setup.js';
import { HUB_SIZES } from '../tests/hub-setup.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), OUT = path.resolve(ROOT, arg('--out', 'docs/review/img'));
const SIZES = (arg('--sizes', '') || '').split(',').filter(Boolean), DAYS = +arg('--days', 5);
fs.mkdirSync(OUT, { recursive: true });
const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
const base = `http://127.0.0.1:${srv.address().port}/`, browser = await chromium.launch(), errs = [];
const ready = p => p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
const b0 = await browser.newPage(); await b0.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await b0.goto(base); await ready(b0);
await b0.evaluate(([a, b]) => { (0, eval)(a); (0, eval)(b); }, [CAL_HELPERS, LEAGUE_HELPERS]);
const built = await b0.evaluate(d => { window.requestAnimationFrame = () => 0; return window.__lgBuild(d, 'real'); }, DAYS);
const json = await b0.evaluate(() => window.__lgDump()), other = await b0.evaluate(() => { const e = lgBoard('stage', 'ppg').find(x => !lgMinesFor().includes(x.p.pid)); return e && e.p.pid; });
await b0.close(); console.log('built', JSON.stringify(built));
for (const [sz, dev] of HUB_SIZES) {
  if (SIZES.length && !SIZES.includes(sz)) continue;
  const ctx = await browser.newContext(dev); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(sz + ': ' + e.message)); await p.goto(base); await ready(p);
  await p.evaluate(([a, b, j, touch]) => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} (0, eval)(a); (0, eval)(b); LEAGUE.mode = 'fallback'; Input.touchMode = touch; window.__lgLoad(j); }, [CAL_HELPERS, LEAGUE_HELPERS, json, !!dev.hasTouch]);
  for (const [name, o] of LEAGUE_CASES) {
    await p.evaluate(([o, other]) => window.__lgOpen(o.view, Object.assign({}, o, { pid: o.pid === null ? other : o.pid })), [o, other]); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, `league-${sz}-${name}.png`) });
  }
  await ctx.close();
}
await browser.close(); srv.close();
console.log('wrote league screenshots to', path.relative(ROOT, OUT) || '.'); if (errs.length) { console.error(errs.join('\n')); process.exitCode = 1; }
