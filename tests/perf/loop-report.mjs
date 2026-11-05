// Gameplay loop report: possessions, scoring and shot mix for CPU vs CPU and four scripted
// "human" styles (idle, sprint-and-dunk, catch-and-shoot, catch-and-shoot + hold DEFEND) vs the
// CPU at every difficulty.
//   npm run build:web && node tests/perf/loop-report.mjs [games per row, default 3] [--cpu-only] [--json out.json] [--page dist/web/index.html]
// Prints a table; the possession logger it reads is src/sim/poss-log.js.
// v9.16: a per-player table for the CPU-vs-CPU rows: his handle (cpuHandle, or the same formula on older builds), shots by
// type (three / mid / close / dunk, % of his shots), dribble moves per 100 of his team's possessions by type, the share
// of his finishes inside 150 px that are dunks (the rest are layups and other close shots), assists and turnovers per 100 team possessions.
// v9.16.3: signature moves (the Skills button) per 100 team possessions, and a team-average line per difficulty.
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const N = +(argv.find(a => /^\d+$/.test(a)) || 3), CPU_ONLY = argv.includes('--cpu-only'), JSON_OUT = opt('--json'), PAGE = path.resolve(ROOT, opt('--page') || 'dist/web/index.html');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(PAGE)); }).listen(0);
const b = await chromium.launch(), ctx = await b.newContext();
await ctx.route(/fonts\.(googleapis|gstatic)\.com|firebasejs/, r => r.abort());
const p = await ctx.newPage(); p.setDefaultTimeout(0);
await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
  const r = await p.evaluate(([N, CPU_ONLY]) => {
    PossLog.force = true;
    // ---- per player (CPU players): moves, shots, rim finishes; summed over the games of a row
    const handleOf = q => typeof cpuHandle === 'function' ? cpuHandle(q) : (() => { const s = q.st, v = k => (s[k] == null ? 5 : s[k]); return Math.max(1, Math.min(10, 5 + (v('spd') - 6.5) * 1.2 + (v('pas') - 5) * 0.6 + (cpuArch(q) === 'playmaker' ? 1.2 : 0))); })();
    let PL = null;
    const rec = q => { const k = q.def.name + '|' + M.teamDefs[q.team].name; return PL[k] || (PL[k] = { name: q.def.name, team: M.teamDefs[q.team].name, arch: cpuArch(q), handle: +handleOf(q).toFixed(1), poss: 0, mv: {}, moves: 0, shots: { three: 0, mid: 0, close: 0, dunk: 0 }, layup: 0, ast: 0, tov: 0, dunkTypes: {}, chain3: 0, sig: 0 }); };
    const cpuQ = q => PL && q && q.human < 0 && !M.mini;
    const _sdm = startDribbleMove;
    startDribbleMove = function (q, kind) { const ok = _sdm.apply(this, arguments); if (ok && cpuQ(q)) { const r = rec(q); r.mv[kind] = (r.mv[kind] || 0) + 1; r.moves++; if (q.combo >= 2) r.chain3++; } return ok; };
    const _lsg = logSig;   // a signature move (the Skills button; the CPU calls it in cpuSkill)
    logSig = function (q) { if (cpuQ(q)) rec(q).sig++; return _lsg.apply(this, arguments); };
    const _as = PossLog.addShot.bind(PossLog);
    PossLog.addShot = function (sh, h, pts, dunk) { if (cpuQ(sh) && pts > 1 && this.game) { const d = Math.hypot(sh.x - h.x, sh.z - h.z), r = rec(sh); r.shots[dunk ? 'dunk' : pts === 3 ? 'three' : d < 150 ? 'close' : 'mid']++; } return _as(sh, h, pts, dunk); };
    const _ast = applyShotType;
    applyShotType = function (q, k) { if (cpuQ(q) && LAYUP_TYPES.has(k)) rec(q).layup++; return _ast.apply(this, arguments); };
    const _sdk = startDunk;
    startDunk = function (q) { const r = _sdk.apply(this, arguments); if (cpuQ(q) && q.act && q.state === 'dunk') { const R = rec(q); R.dunkTypes[q.act.type] = (R.dunkTypes[q.act.type] || 0) + 1; } return r; };
    const endGame = g => { if (!PL || !g) return; const poss = [0, 0]; for (const c of g.poss) poss[c.team]++; for (const q of M.players) if (q.human < 0) { const r = rec(q); r.poss += poss[q.team]; r.ast += q.stats.ast || 0; r.tov += q.stats.tov || 0; } };
    const players = () => Object.values(PL).map(r => { const P = Math.max(1, r.poss) / 100, S = Math.max(1, r.shots.three + r.shots.mid + r.shots.close + r.shots.dunk), rim = r.shots.dunk + r.layup;
      return { name: r.name, team: r.team, arch: r.arch, handle: r.handle, poss: r.poss, shots: S, three: Math.round(100 * r.shots.three / S), mid: Math.round(100 * r.shots.mid / S), close: Math.round(100 * r.shots.close / S), dunk: Math.round(100 * r.shots.dunk / S),
        movesPer100: +(r.moves / P).toFixed(1), mv: Object.fromEntries(Object.entries(r.mv).map(([k, v]) => [k, +(v / P).toFixed(1)])), dunkOfRim: r.shots.dunk + r.shots.close ? Math.round(100 * r.shots.dunk / (r.shots.dunk + r.shots.close)) : 0, astPer100: +(r.ast / P).toFixed(1), tovPer100: +(r.tov / P).toFixed(1), dunkTypes: r.dunkTypes, chain3: r.chain3, sigPer100: +(r.sig / P).toFixed(1) }; });
    const bots = {
      idle: () => true,
      rusher: (me, c, st) => {           // sprint at the rim, shoot (dunk) when close; chase and swipe on D
        const h = attackHoop(me.team);
        if (ball.owner === me) { const d = Math.hypot(h.x - me.x, h.z - me.z); c.mx = (h.x - me.x) / d; c.mz = (h.z - me.z) / d; c.turbo = me.turbo > 15;
          if (d < 150) { c.turbo = true; if (!st.held) { c.b = true; c.bHeld = true; st.held = 0.01; } } }
        else if (ball.owner && ball.owner.team !== me.team) { const o = ball.owner, d = Math.hypot(o.x - me.x, o.z - me.z); c.mx = (o.x - me.x) / (d || 1); c.mz = (o.z - me.z) / (d || 1); if (d < 50 && Math.random() < 0.04) c.a = true; }
        else if (!ball.owner && ball.state !== 'shot') { const d = Math.hypot(ball.x - me.x, ball.z - me.z); c.mx = (ball.x - me.x) / (d || 1); c.mz = (ball.z - me.z) / (d || 1); }
        else { const tx = h.x - Math.sign(h.x - 700) * 220, d = Math.hypot(tx - me.x, 200 - me.z); if (d > 30) { c.mx = (tx - me.x) / d; c.mz = (200 - me.z) / d; } }
        if (st.held) { st.held += STEP; c.bHeld = st.held < 0.42; if (st.held > 0.6 || ball.owner !== me && ball.state !== 'shot') st.held = 0; }
        return true;
      },
      shooter: (me, c, st) => {          // catch and shoot from where you are (release ~ at the top)
        const h = attackHoop(me.team);
        if (ball.owner === me && !st.held) { st.wait = (st.wait || 0) + STEP; if (st.wait > 0.4) { c.b = true; c.bHeld = true; st.held = 0.01; st.wait = 0; } }
        else if (ball.owner && ball.owner.team !== me.team) { const o = ball.owner, d = Math.hypot(o.x - me.x, o.z - me.z); c.mx = (o.x - me.x) / (d || 1); c.mz = (o.z - me.z) / (d || 1); if (d < 50 && Math.random() < 0.03) c.a = true; }
        else if (!ball.owner && ball.state !== 'shot') { const d = Math.hypot(ball.x - me.x, ball.z - me.z); c.mx = (ball.x - me.x) / (d || 1); c.mz = (ball.z - me.z) / (d || 1); }
        else if (ball.owner !== me) { const tx = h.x - Math.sign(h.x - 700) * 260, d = Math.hypot(tx - me.x, 230 - me.z); if (d > 30) { c.mx = (tx - me.x) / d; c.mz = (230 - me.z) / d; } }
        if (st.held) { st.held += STEP; c.bHeld = st.held < Math.max(0.2, apexT(me) || 0.4); if (st.held > 0.9) st.held = 0; }
        return true;
      }
    };
    bots.guard = (me, c, st) => {        // catch-and-shoot on offense, hold DEFEND on defense
      if (ball.owner && ball.owner.team !== me.team) { zeroCmd(c); c.xHeld = true; return true; }
      return bots.shooter(me, c, st);
    };
    const play = (bot, diff, n) => {
      SETTINGS.difficulty = diff; const games = [];
      for (let g = 0; g < n; g++) {
        const a = g % 8, b = (g * 3 + 1) % 8 === a ? (a + 1) % 8 : (g * 3 + 1) % 8;
        newMatch(TEAMS[a], TEAMS[b], { humans: bot ? [{ team: 0, slot: 0, pad: 0 }] : [], fmt: { format: 'quarters', len: 120 } });
        const me = bot && M.players.find(q => q.human === 0), st = {};
        M.cmdHook = bot ? q => { if (q !== me) return false; zeroCmd(q.cmd); return bots[bot](me, q.cmd, st); } : null;
        for (let i = 0; i < 60 * 900 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; if (M.phase === 'break' && M.breakT <= 0) {} updateMatch(STEP); }
        M.cmdHook = null; if (PossLog.done) { endGame(PossLog.done); games.push(PossLog.done); PossLog.done = null; }
      }
      return games;
    };
    const out = {};
    for (const diff of ['veryeasy', 'easy', 'medium', 'hard']) {
      PL = {}; const cpu = play(null, diff, N);
      out['cpu-vs-cpu ' + diff] = possSummary(cpu); out['cpu-vs-cpu ' + diff].players = players(); out['cpu-vs-cpu ' + diff].finals = cpu.map(g => g.final.join('-')); PL = null;
      if (CPU_ONLY) continue;
      for (const bot of ['idle', 'rusher', 'shooter', 'guard']) {
        const gs = play(bot, diff, N);
        out[bot + ' ' + diff] = { you: possSummary(gs, (g, t) => t === 0), cpu: possSummary(gs, (g, t) => t === 1), finals: gs.map(g => g.final.join('-')).join(' ') };
      }
    }
    return out;
  }, [N, CPU_ONLY]);
const row = (k, s) => console.log(k.padEnd(26), String(s.ptsPerPoss).padEnd(5), s.scoredOn.padStart(4), s.turnovers.padStart(4), s.lostOnInbound.padStart(4), s.fg.padStart(4), String(s.avgSecs).padStart(5), ' ', Object.entries(s.byType).map(([a, v]) => a + ' ' + v.share + '/' + v.fg).join(', '));
console.log('row'.padEnd(26), 'pts/p', 'scor', '  TO', 'inbL', '  FG', ' secs', '  shot mix share/FG');
for (const [k, v] of Object.entries(r)) { if (v.you) { row(k + ' you', v.you); row(k + ' cpu', v.cpu); console.log(' '.repeat(26), 'finals', v.finals); } else row(k, v); }
// per player (CPU vs CPU rows)
for (const [k, v] of Object.entries(r)) {
  if (!v.players) continue;
  const close = v.finals.filter(f => { const [a, b] = f.split('-').map(Number); return Math.abs(a - b) <= 4; }).length;
  console.log(`\n${k}: per player (${v.games} games; final scores within 4 points in ${close} of ${v.finals.length})`);
  console.log('player'.padEnd(26), 'style'.padEnd(13), 'hndl', 'shots', ' 3PT  mid  cls  dnk', ' moves/100p (by type)'.padEnd(46), 'dnk/rim', 'ast/100', 'tov/100', 'chains of 3+', 'sig/100p');
  for (const q of v.players.sort((a, b) => a.team.localeCompare(b.team) || b.handle - a.handle))
    console.log((q.name + ' (' + q.team.replace('Masjid ', '') + ')').padEnd(26).slice(0, 26), q.arch.padEnd(13), String(q.handle).padStart(4), String(q.shots).padStart(5), [q.three, q.mid, q.close, q.dunk].map(x => String(x).padStart(4)).join(' '),
      (' ' + q.movesPer100 + ' (' + Object.entries(q.mv).map(([a, b]) => a + ' ' + b).join(', ') + ')').padEnd(46), String(q.dunkOfRim + '%').padStart(7), String(q.astPer100).padStart(7), String(q.tovPer100).padStart(7), String(q.chain3).padStart(5), String(q.sigPer100).padStart(8));
  // team averages (weighted by possessions): dribble moves and signature moves per 100 possessions per player, and the
  // best handler's moves over his teammate's
  const W = v.players.reduce((a, q) => a + q.poss, 0) || 1, avg = k => +(v.players.reduce((a, q) => a + q[k] * q.poss, 0) / W).toFixed(1);
  const teams = {}; for (const q of v.players) (teams[q.team] = teams[q.team] || []).push(q);
  const ratios = Object.values(teams).filter(t => t.length === 2).map(t => { t.sort((a, b) => b.handle - a.handle); return t[0].movesPer100 / Math.max(0.5, t[1].movesPer100); });
  const med = ratios.sort((a, b) => a - b)[ratios.length >> 1];
  console.log(`  average: dribble moves ${avg('movesPer100')} per 100 possessions, signature moves ${avg('sigPer100')}, best handler / teammate ${med == null ? '-' : med.toFixed(2)}x (median of teams)`);
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(r, null, 1));
await b.close(); srv.close();
