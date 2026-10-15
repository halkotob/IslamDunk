// npm run defense:report  (builds first; or: node scripts/defense-report.mjs [--games 8] [--page dist/web/index.html] [--seed 5000])
//
// Plays N seeded CPU-vs-CPU games (2v2, 4 x 60 s quarters, 8 team pairings, cycled) in headless Chromium
// and prints, per game and in total: field goal attempts, blocks, blocks as a percent of attempts, steals,
// turnovers and fouls. Same seeds -> same games, so two builds can be compared like for like.
// Build first (npm run build:web); --page points at any built index.html (e.g. an older release).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const GAMES = Math.max(1, +arg('--games', 8) | 0), SEED = +arg('--seed', 5000) | 0;
if (!fs.existsSync(PAGE)) { console.error(`No build at ${PAGE}. Run npm run build:web first.`); process.exit(1); }

const srv = await new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const file = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u);
    fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res(s));
});
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; })();`);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/`);
await page.waitForFunction(() => typeof Game !== 'undefined' && typeof newMatch === 'function' && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });

const rows = await page.evaluate(({ GAMES, SEED }) => {
  const out = [];
  for (let g = 0; g < GAMES; g++) {
    window.__seed(SEED + g * 7919);
    const a = g % 8, b = (g + 3) % 8;
    newMatch(TEAMS[a], TEAMS[b], { humans: [], fmt: { format: 'quarters', len: 60 } });
    let n = 0; for (; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; }
    const sum = k => M.players.reduce((t, p) => t + (p.stats[k] || 0), 0);
    const hasTov = M.players.every(p => p.stats.tov != null);
    out.push({ game: `${TEAMS[a].name.replace('Masjid ', '')} v ${TEAMS[b].name.replace('Masjid ', '')}`, score: M.teams[0].score + '-' + M.teams[1].score,
      fga: sum('fga'), blk: sum('blk'), stl: sum('stl'), tov: hasTov ? sum('tov') : null, pf: sum('pf'), finished: M.phase === 'over' });
  }
  return out;
}, { GAMES, SEED });
await browser.close(); srv.close();

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
const pad = (s, n) => String(s).padStart(n);
console.log(`Defense report: ${GAMES} seeded CPU-vs-CPU games, 2v2, 4 x 60 s  (${path.relative(ROOT, PAGE)}, seed ${SEED})\n`);
console.log(`${'game'.padEnd(26)}${pad('score', 8)}${pad('FGA', 6)}${pad('BLK', 6)}${pad('BLK%', 8)}${pad('STL', 6)}${pad('TOV', 6)}${pad('PF', 5)}`);
const T = { fga: 0, blk: 0, stl: 0, tov: 0, pf: 0 }; let tovKnown = true;
for (const r of rows) {
  for (const k in T) T[k] += r[k] || 0; if (r.tov == null) tovKnown = false;
  console.log(`${r.game.padEnd(26)}${pad(r.score, 8)}${pad(r.fga, 6)}${pad(r.blk, 6)}${pad(pct(r.blk, r.fga), 8)}${pad(r.stl, 6)}${pad(r.tov == null ? 'n/a' : r.tov, 6)}${pad(r.pf, 5)}${r.finished ? '' : '  (did not finish)'}`);
}
const per = k => (T[k] / rows.length).toFixed(1);
console.log(`${'TOTAL'.padEnd(26)}${pad('', 8)}${pad(T.fga, 6)}${pad(T.blk, 6)}${pad(pct(T.blk, T.fga), 8)}${pad(T.stl, 6)}${pad(tovKnown ? T.tov : 'n/a', 6)}${pad(T.pf, 5)}`);
console.log(`${'PER GAME'.padEnd(26)}${pad('', 8)}${pad(per('fga'), 6)}${pad(per('blk'), 6)}${pad('', 8)}${pad(per('stl'), 6)}${pad(tovKnown ? per('tov') : 'n/a', 6)}${pad(per('pf'), 5)}`);
if (errs.length) { console.error('\nPage errors:\n' + errs.join('\n')); process.exit(1); }
