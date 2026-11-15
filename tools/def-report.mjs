// node tools/def-report.mjs [--page dist/web/index.html] [--n 16] [--diffs easy,medium,hard] [--json out.json]
// v9.21.0 how the CPU defends against a person: the mixed-play bot (tools/diff-bot.mjs) in your slot, with a CPU
// teammate, against a CPU team, Quick Play's dials for each difficulty, the masjids' own ratings, 2 halves of 2:00.
// The same seeds every run, so two builds compare like for like. Per difficulty:
//   CPU wins      the CPU team's win rate
//   pts           points a game, your team and the CPU's
//   drives        the bot's drives (it decides to drive with the ball in its frontcourt) and how many of those
//                 possessions scored
//   beaten        possessions in which the ball handler got past the defender who was between him and the rim
//                 (he is closer to the rim than every defender, inside 450 of it): your team's, then the CPU's
//   TO            turnovers a game (a possession lost without a shot), and how many in the team's own backcourt (yours: how
//                 many of those the bot lost himself; the rest his CPU teammate)
//   press         (9.21.0) the share of the time the CPU's defense is pressing in your backcourt
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DIFF_JS } from './diff-bot.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PRE = arg('--pre', null), PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), N = +arg('--n', 16), DIFFS = arg('--diffs', 'easy,medium,hard').split(','), JSON_OUT = arg('--json', null);
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(PAGE)); }).listen(0);
const b = await chromium.launch();
const pages = [];
for (let i = 0; i < 2; i++) {
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {} })();`);
  const p = await ctx.newPage(); p.__e = []; p.on('pageerror', e => p.__e.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/?nowelcome=1`);
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; }); await p.evaluate(DIFF_JS); await p.evaluate(DEF_JS()); if (PRE) await p.evaluate(PRE); pages.push(p);   // (--pre: code to run first, for experiments)
}
function DEF_JS() {
  return `(() => { const D = window.__dr;
  D.defGame = (diff, g) => {
    window.__seed(7000 + g * 7919 + diff.length * 131); SETTINGS.difficulty = diff;
    const a = g % 8, bb = (g * 3 + 1) % 8 === a ? (a + 1) % 8 : (g * 3 + 1) % 8;
    newMatch(TEAMS[a], TEAMS[bb], { humans: [{ team: 0, slot: 1, pad: 0 }], aiCfg: [DIFF[diff], DIFF[diff]], fmt: { format: 'halves', len: 120 } });
    Game.screen = 'play'; M.introT = 0; for (const q of M.players) q.hifzUsed = true;
    const me = M.players.find(q => q.human === 0), st = {};
    const rimOf = t => attackHoop(t), R = { drives: 0, driveScored: 0, poss: [0, 0], beaten: [0, 0], to: [0, 0], bcTo: [0, 0], bcToBot: 0, pressT: 0, bcT: 0 };
    let cur = -1, P = null;
    const endPoss = (gainedBy) => { if (!P) return; if (!P.shot && !P.scored && gainedBy != null && gainedBy !== P.team) { R.to[P.team]++; if (P.bcLoss) { R.bcTo[P.team]++; if (P.bot) R.bcToBot++; } } if (P.drive && P.scored) R.driveScored++; if (P.beaten) R.beaten[P.team]++; };
    M.cmdHook = q => { if (q !== me) return false; return D.bot(me, q.cmd, st); };
    const score0 = [0, 0];
    try {
      for (let i = 0; i < 60 * 60 * 12 && M.phase !== 'over'; i++) {
        if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; if (Game.screen !== 'play') Game.screen = 'play';
        updateMatch(STEP);
        const o = ball.owner;
        if (o && o.team !== cur) { endPoss(o.team); cur = o.team; R.poss[cur]++; P = { team: cur, shot: false, scored: false, ahead: false, beaten: false, drive: false, bcLoss: false }; }
        if (P) {
          for (let t = 0; t < 2; t++) if (M.teams[t].score > score0[t]) { score0[t] = M.teams[t].score; if (t === P.team) P.scored = true; }
          if (ball.state === 'shot' && ball.shot && ball.shot.team === P.team) P.shot = true;
          if (o && o.team === P.team) {
            const h = rimOf(o.team), dh = Math.hypot(h.x - o.x, h.z - o.z), defs = o.opps.filter(q => q.state !== 'down');
            const ahead = defs.some(q => Math.hypot(h.x - q.x, h.z - q.z) < dh - 10);
            if (ahead) P.ahead = true;
            if (P.ahead && !ahead && dh < 450 && defs.every(q => Math.hypot(h.x - q.x, h.z - q.z) > dh + 15)) P.beaten = true;
            P.bcLoss = typeof inBackcourt === 'function' ? inBackcourt(o.x, o.team) : false; P.bot = o === me;
            if (o.team === me.team && P.bcLoss) R.bcT += STEP;
            if (o === me && st.plan === 'drive' && !P.drive && dh < 470) { P.drive = true; R.drives++; }
          }
          if (P.team === me.team && P.bcLoss && typeof cpuPressK === 'function' && cpuPressK(1 - me.team) > 0.5) R.pressT += STEP;
        }
      }
      endPoss(null);
    } finally { M.cmdHook = null; }
    const sum = (t, k) => M.players.filter(q => q.team === t).reduce((a, q) => a + ((q.stats && q.stats[k]) || 0), 0);
    return Object.assign(R, { over: M.phase === 'over', us: M.teams[me.team].score, them: M.teams[1 - me.team].score, fga: [sum(0, 'fga'), sum(1, 'fga')], fgm: [sum(0, 'fgm'), sum(1, 'fgm')], tpa: [sum(0, 'tpa'), sum(1, 'tpa')], meFga: me.stats.fga || 0, meFgm: me.stats.fgm || 0 });
  };
})()`;
}
const out = {};
for (const d of DIFFS) {
  const jobs = Array.from({ length: N }, (_, g) => g), res = []; let next = 0;
  await Promise.all(pages.map(async p => { while (next < jobs.length) { const g = jobs[next++]; res.push(await p.evaluate(([d, g]) => window.__dr.defGame(d, g), [d, g])); } }));
  const S = k => res.reduce((a, r) => a + (Array.isArray(r[k]) ? 0 : r[k]), 0), S2 = (k, i) => res.reduce((a, r) => a + r[k][i], 0), n = res.length;
  const row = { games: n, cpuWin: res.filter(r => r.them > r.us).length / n, ptsUs: S('us') / n, ptsCpu: S('them') / n, drives: S('drives'), driveScored: S('driveScored'),
    beatenUs: S2('beaten', 0) / Math.max(1, S2('poss', 0)), beatenCpu: S2('beaten', 1) / Math.max(1, S2('poss', 1)), toUs: S2('to', 0) / n, toCpu: S2('to', 1) / n, bcToUs: S2('bcTo', 0) / n, bcToCpu: S2('bcTo', 1) / n, bcToBot: S('bcToBot') / n,
    press: S('pressT') / Math.max(1e-6, S('bcT')), possUs: S2('poss', 0) / n, possCpu: S2('poss', 1) / n, fgUs: S2('fgm', 0) / Math.max(1, S2('fga', 0)), fgCpu: S2('fgm', 1) / Math.max(1, S2('fga', 1)), fgaUs: S2('fga', 0) / n, fgaCpu: S2('fga', 1) / n, botFg: S('meFgm') / Math.max(1, S('meFga')), botFga: S('meFga') / n };
  out[d] = row;
  const pc = x => Math.round(100 * x) + '%', f1 = x => x.toFixed(1);
  console.log(`${d.padEnd(8)} CPU wins ${pc(row.cpuWin)} | pts ${f1(row.ptsUs)} - ${f1(row.ptsCpu)} | drives ${row.drives}, scored ${pc(row.driveScored / Math.max(1, row.drives))} | beaten you ${pc(row.beatenUs)} / CPU ${pc(row.beatenCpu)} of possessions | TO a game you ${f1(row.toUs)} (backcourt ${f1(row.bcToUs)}, the bot ${f1(row.bcToBot)}) / CPU ${f1(row.toCpu)} (backcourt ${f1(row.bcToCpu)}) | press ${pc(row.press)} of your backcourt time`);
  console.log(`         possessions ${f1(row.possUs)} / ${f1(row.possCpu)} | FGA ${f1(row.fgaUs)} (${pc(row.fgUs)}) / ${f1(row.fgaCpu)} (${pc(row.fgCpu)}) | the bot ${f1(row.botFga)} shots a game at ${pc(row.botFg)}`);
}
if (PRE) { const dumps = await Promise.all(pages.map(p => p.evaluate(() => window.__dump ? window.__dump() : null))); if (dumps.some(Boolean)) console.log('dump:', JSON.stringify(dumps)); }   // (--pre may define window.__dump)
const errs = [...new Set(pages.flatMap(p => p.__e))]; if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
await b.close(); srv.close();
