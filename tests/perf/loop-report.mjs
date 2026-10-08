// Gameplay loop report: possessions, scoring and shot mix for CPU vs CPU and three scripted
// "human" styles (idle, sprint-and-dunk, catch-and-shoot) vs the CPU at every difficulty.
//   npm run build:web && node tests/perf/loop-report.mjs [games per row, default 3]
// Prints a table; the possession logger it reads is src/sim/poss-log.js.
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const N = +(process.argv[2] || 3);
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(path.join(ROOT, 'dist/web/index.html'))); }).listen(8791);
const b = await chromium.launch(), ctx = await b.newContext();
await ctx.route(/fonts\.(googleapis|gstatic)\.com|firebasejs/, r => r.abort());
const p = await ctx.newPage(); p.setDefaultTimeout(0);
await p.goto('http://127.0.0.1:8791/'); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
  const r = await p.evaluate(N => {
    PossLog.force = true;
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
    const play = (bot, diff, n) => {
      SETTINGS.difficulty = diff; const games = [];
      for (let g = 0; g < n; g++) {
        const a = g % 8, b = (g * 3 + 1) % 8 === a ? (a + 1) % 8 : (g * 3 + 1) % 8;
        newMatch(TEAMS[a], TEAMS[b], { humans: bot ? [{ team: 0, slot: 0, pad: 0 }] : [], fmt: { format: 'quarters', len: 120 } });
        const me = bot && M.players.find(q => q.human === 0), st = {};
        M.cmdHook = bot ? q => { if (q !== me) return false; zeroCmd(q.cmd); return bots[bot](me, q.cmd, st); } : null;
        for (let i = 0; i < 60 * 900 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; if (M.phase === 'break' && M.breakT <= 0) {} updateMatch(STEP); }
        M.cmdHook = null; if (PossLog.done) { games.push(PossLog.done); PossLog.done = null; }
      }
      return games;
    };
    const out = {};
    for (const diff of ['veryeasy', 'easy', 'medium', 'hard']) {
      const cpu = play(null, diff, N);
      out['cpu-vs-cpu ' + diff] = possSummary(cpu);
      for (const bot of ['idle', 'rusher', 'shooter']) {
        const gs = play(bot, diff, N);
        out[bot + ' ' + diff] = { you: possSummary(gs, (g, t) => t === 0), cpu: possSummary(gs, (g, t) => t === 1), finals: gs.map(g => g.final.join('-')).join(' ') };
      }
    }
    return out;
  }, N);
const row = (k, s) => console.log(k.padEnd(26), String(s.ptsPerPoss).padEnd(5), s.scoredOn.padStart(4), s.turnovers.padStart(4), s.lostOnInbound.padStart(4), s.fg.padStart(4), String(s.avgSecs).padStart(5), ' ', Object.entries(s.byType).map(([a, v]) => a + ' ' + v.share + '/' + v.fg).join(', '));
console.log('row'.padEnd(26), 'pts/p', 'scor', '  TO', 'inbL', '  FG', ' secs', '  shot mix share/FG');
for (const [k, v] of Object.entries(r)) { if (v.you) { row(k + ' you', v.you); row(k + ' cpu', v.cpu); console.log(' '.repeat(26), 'finals', v.finals); } else row(k, v); }
await b.close(); srv.close();
