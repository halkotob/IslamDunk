// node tools/cpu-clock-report.mjs [--page dist/web/index.html] [--games 200] [--diffs veryeasy,easy,medium,hard] [--json out.json]
//                                  [--fmt first21:120] [--eval 'Object.assign(CPU_SC, { patient: 12 })'] [--workers 2]
// v9.6.3: CPU-vs-CPU numbers per difficulty, for the shot clock work. Seeded games (seed = game index), the Settings
// format (2 halves of 2:00 unless --fmt is given as format:len, e.g. first21:120), teams rotating through the
// built-in masjids. Per team per game: shot clock violations, field goal attempts (jump shots) and makes, dunks,
// points, turnovers, possessions, and shot quality = the shooter's make chance x points at release (shotProbability,
// which draws no random numbers, so measuring changes nothing).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), N = +arg('--games', 200);
const DIFFS = arg('--diffs', 'veryeasy,easy,medium,hard').split(','), FMT = arg('--fmt', ''), WORKERS = +arg('--workers', 2), EVAL = arg('--eval', '');   // --eval: JS run in the page first (e.g. a CPU_SC variant)
const SEED = `(() => { let s = 1; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = rnd; window.__seed = n => { s = n | 0; }; })();`;

const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
const browser = await chromium.launch();

async function worker(jobs, out) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await ctx.addInitScript(SEED);
  const p = await ctx.newPage(); await p.goto(`http://127.0.0.1:${srv.address().port}/`);
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  if (EVAL) await p.evaluate(EVAL);
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0; SETTINGS.sound = false;
    const T = window.__cpuT = { viol: [0, 0], ev: [0, 0], evN: [0, 0] };
    const _v = shotClockViolation; shotClockViolation = function () { if (M.possTeam >= 0) T.viol[M.possTeam]++; else if (ball.owner) T.viol[ball.owner.team]++; return _v.apply(this, arguments); };
    const _r = releaseShot; releaseShot = function (p) { if (ball.owner === p && M.phase !== 'ft') { const h = attackHoop(p.team); T.ev[p.team] += shotProbability(p, p.x, p.z) * (isThree(p.x, p.z, h) ? 3 : 2); T.evN[p.team]++; } return _r.apply(this, arguments); };
  });
  for (const [diff, g] of jobs) {
    const r = await p.evaluate(([diff, g, fmt]) => {
      const T = window.__cpuT; T.viol = [0, 0]; T.ev = [0, 0]; T.evN = [0, 0];
      SETTINGS.difficulty = diff; window.__seed(1000 + g * 7919);
      const a = g % TEAMS.length, b = (g * 3 + 1) % TEAMS.length === a ? (a + 1) % TEAMS.length : (g * 3 + 1) % TEAMS.length;
      const o = { humans: [] }; if (fmt) { const [f, len] = fmt.split(':'); o.fmt = { format: f, len: +len || 120 }; }
      newMatch(TEAMS[a], TEAMS[b], o); Game.screen = 'title';
      let poss = [0, 0], last = -1, n = 0;
      for (; n < 60 * 60 * 30 && M.phase !== 'over'; n++) {
        updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title';
        if (ball.owner && ball.owner.team !== last) { last = ball.owner.team; poss[last]++; }
      }
      const team = t => M.teams[t].players.reduce((s, p) => { for (const k of ['pts', 'fga', 'fgm', 'tpa', 'tpm', 'dnk', 'tov', 'fta', 'ftm']) s[k] = (s[k] || 0) + (p.stats[k] || 0); return s; }, {});
      return { diff, g, steps: n, over: M.phase === 'over', sc: M.fmt.sc, teams: [0, 1].map(t => Object.assign(team(t), { score: M.teams[t].score, viol: T.viol[t], ev: T.evN[t] ? T.ev[t] / T.evN[t] : 0, evN: T.evN[t], poss: poss[t] })) };
    }, [diff, g, FMT]);
    out.push(r);
  }
  await ctx.close();
}
const jobs = []; for (const d of DIFFS) for (let g = 0; g < N; g++) jobs.push([d, g]);
const out = [], per = Math.ceil(jobs.length / WORKERS), t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(jobs.slice(w * per, (w + 1) * per), out)));
await browser.close(); srv.close();
const sum = {};
for (const d of DIFFS) {
  const R = out.filter(r => r.diff === d), tm = R.flatMap(r => r.teams), n = tm.length, avg = k => tm.reduce((s, t) => s + (t[k] || 0), 0) / n;
  const shots = tm.reduce((s, t) => s + t.evN, 0);
  sum[d] = { games: R.length, unfinished: R.filter(r => !r.over).length, sc: R[0] && R[0].sc, violPerTeam: +avg('viol').toFixed(3), pts: +avg('score').toFixed(2), fga: +avg('fga').toFixed(2),
    fgPct: +(tm.reduce((s, t) => s + t.fgm, 0) / Math.max(1, tm.reduce((s, t) => s + t.fga, 0)) * 100).toFixed(1), threesA: +avg('tpa').toFixed(2), dunks: +avg('dnk').toFixed(2), tov: +avg('tov').toFixed(2), poss: +avg('poss').toFixed(2),
    shotQuality: +(tm.reduce((s, t) => s + t.ev * t.evN, 0) / Math.max(1, shots)).toFixed(3) };
}
console.log(JSON.stringify(sum, null, 1)); console.log(`${out.length} games in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const J = arg('--json', null); if (J) fs.writeFileSync(J, JSON.stringify({ sum, games: out }, null, 1));
