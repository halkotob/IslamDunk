// v9.16 CPU style tests: dribble moves and dunks follow each CPU player's ratings (src/sim/v916-cpu-handle.js).
//   cpu-handle   (1) handle ordering: with fixed seeds, a better handler decides to make a move more often (same spot,
//                    same defender); (2) no CPU player starts more than 2 moves in a row (seeded games, every
//                    difficulty); (3) a sharpshooter with an open look behind the arc shoots, with no move first;
//                    (4) mini-games and online guests on the snapshot netcode are untouched (the old flat move rate decides
//                    there); in a rollback match both phones run the CPU, this code included, the same way (rb-* tests); dunk types
//                    follow the dunker (the best dunkers throw windmills and 360s, poor dunkers keep it to two hands and, for a rim
//                    runner, tomahawks)
//   cpu-league   (5) a seeded CPU-vs-CPU run at each difficulty keeps the league averages of the build before 9.16
//                    (tests/fixtures/cpu-style-baseline.json, 60 games each). The targets are points per possession
//                    within ±0.05, seconds per possession no longer, turnovers within ±2 points; a run of this length
//                    can't see that finely (10 games swing turnovers by 3-4 points on the same build), so the test
//                    allows the target plus three standard errors of the difference (from the game-to-game spread),
//                    and catches real shifts. The
//                    exact check is the 60-game comparison in the 9.16.0 changelog (tools in tests/perf/loop-report.mjs).
//   node tests/cpu-style.mjs --baseline <page.html> [games]   writes the fixture from a build (the one before the change)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FIX = path.join(ROOT, 'tests/fixtures/cpu-style-baseline.json');
export const LEAGUE_GAMES = 16;
// in the page: n seeded CPU-vs-CPU games (2 halves of 2:00, the default) at a difficulty -> league averages
export const LEAGUE = `async ([diff, n]) => {
  const seed = k => { let s = k >>> 0 || 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  PossLog.force = true; SETTINGS.difficulty = diff; const games = [];
  for (let g = 0; g < n; g++) {
    seed(9150 + g * 7919);
    const a = g % 8, b = (g * 3 + 1) % 8 === a ? (a + 1) % 8 : (g * 3 + 1) % 8;
    newMatch(TEAMS[a], TEAMS[b], { humans: [], fmt: { format: 'halves', len: 120 } });
    for (let i = 0; i < 60 * 900 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); }
    if (PossLog.done) { games.push(PossLog.done); PossLog.done = null; }
  }
  let poss = 0, pts = 0, secs = 0, tov = 0; const finals = [], per = [];
  for (const g of games) { finals.push(g.final.join('-')); let n = 0, a = 0, b = 0, t = 0; for (const c of g.poss) { n++; a += c.pts; b += c.secs; if (c.end === 'turnover') t++; } poss += n; pts += a; secs += b; tov += t; per.push([a / n, b / n, 100 * t / n]); }
  // game to game spread (possessions in one game hang together, so this is the honest error)
  const sd = i => { const m = per.reduce((x, r) => x + r[i], 0) / per.length; return Math.sqrt(per.reduce((x, r) => x + (r[i] - m) ** 2, 0) / Math.max(1, per.length - 1)); };
  return { diff, games: games.length, poss, ptsPerPoss: +(pts / poss).toFixed(3), secs: +(secs / poss).toFixed(2), tovPct: +(100 * tov / poss).toFixed(1), gameSd: [sd(0), sd(1), sd(2)].map(x => +x.toFixed(3)), finals };
}`;
const DIFFS = ['veryeasy', 'easy', 'medium', 'hard'];

export function cpuStyleTests({ newContext, open }) {
  const T = {};
  T['cpu-handle'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base, errs, 'cpu'), detail = [], bad = [];
    const r = await p.evaluate(() => {
      const out = {};
      // (1) the same handler at the same spot with a defender 40 px away, with two different handles: how often he decides on a move
      const decide = (spd, secs) => {
        __seed(4242); SETTINGS.difficulty = 'hard';
        newMatch(TEAMS[3], TEAMS[0], { humans: [] }); M.introT = 0; M.phase = 'live';
        const h = M.teams[0].players.find(q => cpuArch(q) !== 'sharpshooter') || M.teams[0].players[1];
        h.st.spd = spd; h._hnd = null; const d = h.opps[0], H = attackHoop(h.team);
        M.cmdHook = q => { if (q === h) return false; zeroCmd(q.cmd); return true; };
        let n = 0;
        for (let i = 0; i < secs * 60; i++) {
          giveBall(h, 'test'); h.state = 'free'; h.mv = null; h.cd.mv = 0; h.cd.cross = 0; h.postUp = null;
          h.x = H.x + H.dir * 330; h.z = 350; d.x = h.x - H.dir * 40; d.z = 350; d.state = 'free';
          h.ai.update(STEP); if (h.cmd.x) { n++; h._mvStart = M.time; h.mvEnd = M.time - 1; }
          M.time += STEP; M.shotClock = 20;
        }
        M.cmdHook = null; return { handle: +cpuHandle(h).toFixed(1), n };
      };
      out.low = decide(5, 120); out.high = decide(9, 120);
      // (3) a sharpshooter, wide open behind the arc: shoots, no move first
      __seed(77); SETTINGS.difficulty = 'hard';
      newMatch(TEAMS[2], TEAMS[5], { humans: [] }); M.introT = 0; M.phase = 'live';
      const s = M.teams[0].players.find(q => cpuArch(q) === 'sharpshooter'), H = attackHoop(s.team);
      M.cmdHook = q => { if (q === s) return false; zeroCmd(q.cmd); if (q === s.opps[0]) { q.x = s.x - H.dir * 47; q.z = s.z; q.vx = q.vz = 0; } return true; };   // (his man held 47 px off every frame)
      // his man sags 47 px off (close enough for a move, far enough to be open); the other defender is far away
      const pin = () => { s.opps[0].x = s.x - H.dir * 47; s.opps[0].z = s.z; s.opps[1].x = H.x + H.dir * 120; s.opps[1].z = 120; };
      s.mate.x = H.x + H.dir * 200; s.mate.z = 600;
      s.st.sht = 10; s._tnd = null; giveBall(s, 'test'); s.state = 'free'; s.x = H.x + H.dir * 335; s.z = 350; pin(); s.ai.plan = { type: 'idle', ctx: '' }; s.ai.t = 0;
      const open0 = cpuShootFirst(s, nearestOppDist(s.x, s.z, s.team)), three0 = isThree(s.x, s.z, H);
      const R = Math.random; let moved = false, shot = false;
      M.shotClock = 7;   // late enough in the possession that a good look is worth taking
      for (let i = 0; i < 240 && !shot; i++) { updateMatch(STEP); if (s.mv) moved = true; if (ball.state === 'shot' || s.state === 'windup' || s.state === 'shoot') shot = true; else pin(); }
      out.shooter = { name: s.def.name, three: three0, shot, moved, open: open0 };
      M.cmdHook = null;
      // (4) mini-games and online guests: the flat move rate decides (no 0.9 s spacing, nothing cleared)
      const flatDecides = setup => {
        __seed(5); SETTINGS.difficulty = 'hard';
        newMatch(TEAMS[1], TEAMS[4], { humans: [] }); M.introT = 0; M.phase = 'live';
        const h = M.teams[0].players[0], d = h.opps[0], HH = attackHoop(h.team);
        const restore = setup();
        const R = Math.random; Math.random = () => 0;      // chance() always yes
        giveBall(h, 'test'); h.state = 'free'; h.cd.cross = 0; h.cd.mv = 0; h.x = HH.x + HH.dir * 330; h.z = 350; d.x = h.x - HH.dir * 40; d.z = 350;
        h._mvStart = M.time;                                // a move just now: the 9.16 code would wait 0.9 s
        h.ai.update(STEP); const x = h.cmd.x; Math.random = R; restore(); return x;
      };
      out.mini = flatDecides(() => { const m = M.mini; M.mini = { kind: 'test' }; return () => { M.mini = m; }; });
      out.guest = flatDecides(() => { const r = Net.role; Net.role = 'guest'; return () => { Net.role = r; }; });
      out.normal = flatDecides(() => () => {});
      // dunk types by the dunker (CPU dunks from mid range, many times)
      const types = (dnk, spd) => {
        __seed(31); newMatch(TEAMS[0], TEAMS[1], { humans: [] }); M.introT = 0; M.phase = 'live';
        const q = M.teams[0].players[1], HH = attackHoop(q.team), c = {}; q.st.dnk = dnk; q.st.spd = spd;
        for (let i = 0; i < 200; i++) { giveBall(q, 'test'); q.state = 'free'; q.x = HH.x + HH.dir * 140; q.z = HH.z; q.vx = q.vz = 0; startDunk(q, {}); c[q.act.type] = (c[q.act.type] || 0) + 1; q.state = 'free'; q.act = null; }
        return c;
      };
      out.dunkHigh = types(10, 9); out.dunkLow = types(4, 5);
      return out;
    });
    // (2) seeded games at every difficulty: never three moves in a row
    const runs = await p.evaluate(async () => {
      const out = [];
      const _s = startDribbleMove; let third = 0, moves = 0;
      startDribbleMove = function (q) { const ok = _s.apply(this, arguments); if (ok && q.human < 0 && !M.mini) { moves++; if (q.combo >= 2) third++; } return ok; };
      for (const diff of ['veryeasy', 'easy', 'medium', 'hard']) { SETTINGS.difficulty = diff; __seed(900 + diff.length); newMatch(TEAMS[3], TEAMS[7], { humans: [], fmt: { format: 'halves', len: 120 } }); for (let i = 0; i < 60 * 600 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); } out.push(diff); }
      startDribbleMove = _s;
      return { third, moves, diffs: out.join(',') };
    });
    await ctx.close();
    detail.push(`(1) decides on a move in 120 s at the same spot, Hard: handle ${r.low.handle}: ${r.low.n}, handle ${r.high.handle}: ${r.high.n} (${(r.high.n / Math.max(1, r.low.n)).toFixed(2)}x)`);
    if (!(r.high.n > r.low.n * 1.5)) bad.push('(1) the better handler does not make clearly more moves');
    detail.push(`(2) ${runs.moves} CPU moves in 4 seeded games (${runs.diffs}): ${runs.third} third moves in a row`);
    if (runs.third || runs.moves < 20) bad.push('(2) a CPU player started a third move in a row (or too few moves to tell)');
    detail.push(`(3) ${r.shooter.name} (Shooting 10), behind the arc (${r.shooter.three}), his man 47 px off, a good look (${r.shooter.open}): shot ${r.shooter.shot}, moved first ${r.shooter.moved}`);
    if (!r.shooter.three || !r.shooter.open || !r.shooter.shot || r.shooter.moved) bad.push('(3) the open sharpshooter did not shoot first');
    detail.push(`(4) the flat move rate decides in a mini-game: ${r.mini}, as an online guest: ${r.guest}; in a match the 9.16 spacing holds it back: ${!r.normal}`);
    if (!r.mini || !r.guest || r.normal) bad.push('(4) mini-games or online guests are affected (or the match is not)');
    const flashy = c => ['360', 'windmill'].reduce((a, k) => a + (c[k] || 0), 0) / 200, plain = c => (c.twohand || 0) / 200;   // (tomahawks are a rim runner's own, at any Dunking)
    detail.push(`dunk types from mid range: Dunking 10 / Speed 9 ${JSON.stringify(r.dunkHigh)} (windmill or 360 ${Math.round(100 * flashy(r.dunkHigh))}%), Dunking 4 / Speed 5 ${JSON.stringify(r.dunkLow)} (windmill or 360 ${Math.round(100 * flashy(r.dunkLow))}%, two hands ${Math.round(100 * plain(r.dunkLow))}%)`);
    if (!(flashy(r.dunkHigh) > 0.4 && plain(r.dunkHigh) < 0.1 && flashy(r.dunkLow) < 0.05 && plain(r.dunkLow) > 0.4 && !r.dunkLow['360'])) bad.push('dunk types do not follow the dunker');
    return { ok: !bad.length && !errs.length, detail: [...detail, ...bad, ...errs] };
  };
  T['cpu-league'] = async ({ browser, base }) => {
    const B = JSON.parse(fs.readFileSync(FIX, 'utf8')), detail = [], bad = [];
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base, errs, 'league');
    detail.push(`baseline: ${B.version}, ${B.games} games per difficulty; this run: ${LEAGUE_GAMES} seeded games per difficulty`);
    for (const diff of DIFFS) {
      const a = await p.evaluate(`(${LEAGUE})(${JSON.stringify([diff, LEAGUE_GAMES])})`), b = B.rows[diff];
      // the target plus three standard errors of the difference (an alarm, not a measurement), from the game-to-game spread of this run (the baseline's
      // own error is the same spread over its larger number of games)
      const m2 = i => 3 * a.gameSd[i] * Math.sqrt(1 / a.games + 1 / b.games);
      const mP = 0.05 + m2(0), mS = m2(1), mT = 2 + m2(2);
      const okP = Math.abs(a.ptsPerPoss - b.ptsPerPoss) <= mP, okS = a.secs <= b.secs + mS, okT = Math.abs(a.tovPct - b.tovPct) <= mT;
      detail.push(`${diff}: pts/poss ${a.ptsPerPoss} (was ${b.ptsPerPoss}, ±${mP.toFixed(2)}) ${okP ? 'ok' : 'BAD'}; secs/poss ${a.secs} (was ${b.secs}, +${mS.toFixed(2)}) ${okS ? 'ok' : 'BAD'}; turnovers ${a.tovPct}% (was ${b.tovPct}%, ±${mT.toFixed(1)}) ${okT ? 'ok' : 'BAD'}`);
      if (!okP || !okS || !okT) bad.push(diff + ': league averages moved');
    }
    await ctx.close();
    return { ok: !bad.length && !errs.length, detail: [...detail, ...bad, ...errs] };
  };
  return T;
}

// the baseline from a build: node tests/cpu-style.mjs --baseline <page.html>
if (process.argv[1] && process.argv[1].endsWith('cpu-style.mjs') && process.argv.includes('--baseline')) {
  const { chromium } = await import('playwright');
  const page = path.resolve(process.argv[process.argv.indexOf('--baseline') + 1]), NG = +process.argv[process.argv.indexOf('--baseline') + 2] || 60;
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(page)); }).listen(0);
  const b = await chromium.launch(), ctx = await b.newContext(); await ctx.route(/fonts\.(googleapis|gstatic)\.com|firebasejs/, r => r.abort());
  const p = await ctx.newPage(); p.setDefaultTimeout(0);
  await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
  const rows = {}, version = await p.evaluate(() => VERSION);
  for (const d of DIFFS) { rows[d] = await p.evaluate(`(${LEAGUE.replace('9150', '7150')})(${JSON.stringify([d, NG])})`); delete rows[d].finals; console.log(JSON.stringify(rows[d])); }   // (other seeds than the test's)
  fs.writeFileSync(FIX, JSON.stringify({ version, games: NG, rows }, null, 1) + '\n');
  await b.close(); srv.close();
}
