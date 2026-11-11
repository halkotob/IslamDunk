// node tools/stat-report.mjs [--page dist/web/index.html] [--shots 300] [--h2h 40] [--econ 3] [--only speed,shots,dunk,h2h,econ]
//
// v9.19.0: what each stat really does, measured in the built game (every layer that wraps speed, shooting and dunks):
//   speed  Player.speed() at spd 1/3/5/7/10: jogging, sprinting, with the ball; and the boosts on top (glow, on fire)
//   shots  real shots in the sim by a CPU shooter at Medium (its release timing), nobody within 400 units:
//          open mid-range (300 from the rim) and open three (just past the arc), at sht 1/3/5/7/10, and 10 with the glow
//   dunk   the farthest a dunk starts from, walking and sprinting, at dnk 1/3/5/7/10; which signature dunks are offered
//   h2h    seeded CPU-vs-CPU games, a team of all-10 players against a team of all-5 players: wins of the 10s
//   econ   whole careers played by the CPU in your player's place (Medium), spending Barakah Points on the main stat
//          (shooting) as soon as it can: BP and Halal Bucks per game and per stage, the game each shooting level is
//          bought, the game the first cosmetic and the whole store list are affordable
// Same seeds, same numbers: two builds can be compared like for like (--page points at any built index.html).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const SHOTS = +arg('--shots', 300) | 0, H2H = +arg('--h2h', 40) | 0, ECON = +arg('--econ', 3) | 0;
const ONLY = (arg('--only', 'speed,shots,dunk,h2h,econ')).split(',');   // (also: abl, which rating carries a 10)
const JSON_OUT = arg('--json', null);
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
await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {} })();`);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/?nowelcome=1`);
await page.waitForFunction(() => typeof Game !== 'undefined' && typeof newMatch === 'function', null, { timeout: 20000 });
const ver = await page.evaluate(() => VERSION);
const LV = [1, 3, 5, 7, 10];
const out = { version: ver };
const pct = x => (x * 100).toFixed(0) + '%';
const rel = (a, b) => (a / b * 100).toFixed(0) + '%';

// a quiet match: everyone but the measured player frozen, far away
const SETUP = `
  window.__q = () => {
    window.__seed(4242); SETTINGS.difficulty = 'medium';
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0; Game.trivia = null;
    for (let i = 0; i < 600 && M.phase !== 'live'; i++) updateMatch(STEP);
    for (const q of M.players) { q.hifzUsed = true; q.hifz = 0; }
    if (!window.__frz) { window.__frz = 1; const _u = Brain.prototype.update; Brain.prototype.update = function () { if (this.p._frozen) { const c = this.p.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = c.bHeld = false; return; } return _u.apply(this, arguments); }; }
    const p = M.players[0]; for (const q of M.players) if (q !== p) { q._frozen = true; place(q, q.team === p.team ? 200 : COURT.L - 200, 40); }
    return p;
  };
  window.__set = (p, st) => { p.st = Object.assign({}, p.def.stats, st); p._hnd = null; };
  window.__calm = p => { p.fire = false; p.boost = 0; p.nfx = null; p.fat = 0; p.turbo = 100; p.winded = false; p.streak = 0; p.hot = 0; p.comp = 50; M.hot = null; M.teams.forEach(t => { t.streak = 0; }); for (const q of M.players) { q.fire = false; q.streak = 0; } };
`;
await page.evaluate(SETUP);

if (ONLY.includes('speed')) {
  out.speed = await page.evaluate(LV => {
    const p = window.__q(), r = {};
    const sp = (lvl, o) => { window.__set(p, { spd: lvl }); window.__calm(p); giveBall(M.players[2]); p.cmd.turbo = !!o.turbo; if (o.ball) giveBall(p); if (o.fire) p.fire = true; if (o.glow) p.boost = 10; p.state = 'free'; const s = p.speed(); p.cmd.turbo = false; return Math.round(s); };
    for (const l of LV) r[l] = { jog: sp(l, {}), sprint: sp(l, { turbo: true }), ball: sp(l, { ball: true }), ballSprint: sp(l, { ball: true, turbo: true }), glowSprint: sp(l, { turbo: true, glow: true }), fireSprint: sp(l, { turbo: true, fire: true }), both: sp(l, { turbo: true, fire: true, glow: true }) };
    return { r, court: COURT.L };
  }, LV);
  const S = out.speed.r, five = S[5];
  console.log(`\nSPEED (game units a second; the court is ${out.speed.court} long)   v${ver}`);
  console.log('stat   jog  sprint  ball  ball+sprint  sprint+glow  sprint+fire   vs 5 (sprint)');
  for (const l of LV) { const s = S[l]; console.log(`${String(l).padStart(4)} ${String(s.jog).padStart(5)} ${String(s.sprint).padStart(7)} ${String(s.ball).padStart(5)} ${String(s.ballSprint).padStart(12)} ${String(s.glowSprint).padStart(12)} ${String(s.fireSprint).padStart(12)}   ${rel(s.sprint, five.sprint)}`); }
  console.log(`court lengths a second sprinting: 1 ${(S[1].sprint / out.speed.court).toFixed(2)}, 5 ${(five.sprint / out.speed.court).toFixed(2)}, 10 ${(S[10].sprint / out.speed.court).toFixed(2)}, 10 glowing and on fire ${(S[10].both / out.speed.court).toFixed(2)}`);
}

if (ONLY.includes('shots')) {
  out.shots = await page.evaluate(({ LV, N }) => {
    const p = window.__q(), r = {};
    const run = (lvl, dist, glow) => {
      window.__set(p, { sht: lvl }); let made = 0, att = 0, green = 0, ev = 0, evn = 0;
      window.__seed(9000 + lvl * 7919 + dist * 31 + (glow ? 5 : 0));   // one seed a run: reseeding every shot with near seeds biased the draws
      for (let i = 0; i < N; i++) {
        window.__calm(p); M.phase = 'live'; M.clock = 500; M.shotClock = 24; M.quarter = 1;
        const h = attackHoop(p.team); giveBall(p); place(p, h.x + h.dir * dist, h.z); p.state = 'free'; p.vx = p.vz = 0; p.face = -h.dir; p.y = 0;
        if (glow) p.boost = 10;
        if (typeof shotFinal === 'function') { const _sf = shotFinal; shotFinal = function (q, pr) { const o = _sf.apply(this, arguments); if (q === p) { ev += clamp(o, 0.02, 0.97); evn++; shotFinal = _sf; } return o; }; }   // the make chance itself (the draw adds noise)
        let first = null; const _ls = launchShot; launchShot = function (q, hh, mk) { if (q === p && first == null) first = !!mk; return _ls.apply(this, arguments); };   // the first shot's own result (not a putback)
        startShot(p);
        try { for (let k = 0; k < 200 && first == null; k++) updateMatch(STEP); } finally { launchShot = _ls; }
        if (first != null) { att++; made += first ? 1 : 0; }
      }
      return { made, att, pct: evn ? ev / evn : att ? made / att : 0, drawn: att ? made / att : 0 };   // (builds before 9.19.0 have no shotFinal: the drawn makes)
    };
    for (const l of LV) r[l] = { mid: run(l, 300), three: run(l, THREE_R + 25) };
    r['10g'] = { mid: run(10, 300, true), three: run(10, THREE_R + 25, true) };
    return r;
  }, { LV, N: SHOTS });
  const R = out.shots;
  console.log(`\nOPEN SHOTS (a CPU shooter at Medium, its own release timing, ${SHOTS} shots each)`);
  console.log('stat     mid-range   vs 5      three   vs 5');
  for (const l of [...LV, '10g']) { const s = R[l]; console.log(`${String(l === '10g' ? '10+glow' : l).padStart(7)} ${pct(s.mid.pct).padStart(10)} ${rel(s.mid.pct, R[5].mid.pct).padStart(6)} ${pct(s.three.pct).padStart(10)} ${rel(s.three.pct, R[5].three.pct).padStart(6)}`); }
  const windows = await page.evaluate(LV => { const p = window.__q(); p.human = 0; const h = attackHoop(p.team); const o = {}; for (const l of LV) { window.__set(p, { sht: l }); window.__calm(p); place(p, h.x + h.dir * 300, h.z); o[l] = Math.round(shotWindow(p) * 1000); } p.human = -1; return o; }, LV);
  out.windows = windows;
  console.log('green window for you (Medium, open mid-range), ms either side of the apex: ' + LV.map(l => l + ': ' + windows[l]).join(', '));
}

if (ONLY.includes('dunk')) {
  out.dunk = await page.evaluate(LV => {
    const p = window.__q(), r = {};
    const far = (lvl, turbo, glow) => {
      window.__set(p, { dnk: lvl }); const h = attackHoop(p.team); let best = 0;
      for (let d = 60; d <= 420; d += 5) { window.__calm(p); if (glow) p.boost = 10; giveBall(p); place(p, h.x + h.dir * d, h.z); p.state = 'free'; p.cmd.turbo = turbo; p.vx = -h.dir * p.speed(); p.vz = 0; if (canDunk(p)) best = d; }
      p.cmd.turbo = false; return best;
    };
    for (const l of LV) r[l] = { walk: far(l, false), sprint: far(l, true), glowSprint: far(l, true, true) };
    r.sig = {}; for (const l of LV) { window.__set(p, { dnk: l }); r.sig[l] = typeof cpuSigDunk === 'function' ? cpuSigDunk(p) : null; }
    return r;
  }, LV);
  const D = out.dunk;
  console.log('\nDUNK RANGE (farthest start, game units from the rim; nobody in the lane)');
  console.log('stat   walking  sprinting  sprint+glow   CPU signature dunk');
  for (const l of LV) console.log(`${String(l).padStart(4)} ${String(D[l].walk).padStart(9)} ${String(D[l].sprint).padStart(10)} ${String(D[l].glowSprint).padStart(12)}   ${D.sig[l] || '-'}`);
}

if (ONLY.includes('h2h')) {
  // three ways a 10 meets 5s (CPU vs CPU, Medium, 4 x 60 s, seeded; the 10s alternate sides):
  //   solo  1 on 1: a 10 against a 5     one  2 on 2: a 10 and a 5 against two 5s     team  2 on 2: two 10s against two 5s
  out.h2h = await page.evaluate(N => {
    const keys = ['spd', 'sht', 'dnk', 'def', 'pas', 'stl', 'hus', 'clu', 'sta'], R = {};
    for (const mode of ['solo', 'one', 'team']) {
      let w = 0, pts = [0, 0];
      for (let g = 0; g < N; g++) {
        window.__seed(7000 + g * 7919); SETTINGS.difficulty = 'medium';
        const a = g % 2 ? 0 : 1; let A = TEAMS[g % 8], B = TEAMS[(g + 3) % 8];
        if (mode === 'solo') { A = soloTeam(A, 0); B = soloTeam(B, 0); }
        newMatch(A, B, { humans: [], fmt: { format: 'quarters', len: 60 } });
        for (const q of M.players) { const v = q.team === a && (mode !== 'one' || q.slot === 0) ? 10 : 5; q.st = Object.fromEntries(keys.map(k => [k, v])); q._hnd = null; q.hifzUsed = true; }
        for (let n = 0; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; }
        if (M.teams[a].score > M.teams[1 - a].score) w++; pts[0] += M.teams[a].score; pts[1] += M.teams[1 - a].score;
      }
      R[mode] = { games: N, w, pts10: pts[0] / N, pts5: pts[1] / N };
    }
    return R;
  }, H2H);
  console.log(`\nA 10 AGAINST 5s (CPU vs CPU, Medium, 4 x 60 s, ${H2H} games each; every rating 10 or 5)`);
  for (const [k, H] of Object.entries(out.h2h)) console.log(`${{ solo: '1 on 1, a 10 v a 5     ', one: '2 on 2, a 10 + a 5 v 5s', team: '2 on 2, two 10s v two 5s' }[k]}: the 10s win ${H.w} (${pct(H.w / H.games)}), ${H.pts10.toFixed(1)} to ${H.pts5.toFixed(1)} a game`);
}

if (ONLY.includes('abl')) {
  // which rating carries a 10: 2 on 2, one player with a single rating at 10 (everything else 5) against 5s
  out.abl = await page.evaluate(N => {
    const keys = ['spd', 'sht', 'dnk', 'def', 'pas', 'stl', 'hus', 'clu', 'sta'], R = {};
    for (const hi of ['none', ...keys]) {
      let w = 0, m = 0;
      for (let g = 0; g < N; g++) {
        window.__seed(7000 + g * 7919); SETTINGS.difficulty = 'medium';
        const a = g % 2 ? 0 : 1;
        newMatch(TEAMS[g % 8], TEAMS[(g + 3) % 8], { humans: [], fmt: { format: 'quarters', len: 60 } });
        for (const q of M.players) { q.st = Object.fromEntries(keys.map(k => [k, q.team === a && q.slot === 0 && k === hi ? 10 : 5])); q._hnd = null; q.hifzUsed = true; }
        for (let n = 0; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; }
        if (M.teams[a].score > M.teams[1 - a].score) w++; m += M.teams[a].score - M.teams[1 - a].score;
      }
      R[hi] = { w, m: m / N };
    }
    return R;
  }, H2H);
  console.log(`\nONE RATING AT 10 (2 on 2, that player's team against 5s, ${H2H} games each): wins and the average margin`);
  for (const [k, r] of Object.entries(out.abl)) console.log(`${k.padEnd(5)} ${String(r.w).padStart(3)} won, ${r.m >= 0 ? '+' : ''}${r.m.toFixed(1)} a game`);
}

if (ONLY.includes('econ')) {
  // scripted careers: every game ends with a typical line for your player (12 points, 4 rebounds, 3 assists, 1 steal,
  // 1 block, no fouls) and is won with the given chance (--win, several values). Each stage's real bracket and calendar.
  // Barakah Points go to the main stat (shooting) as soon as they can; Halal Bucks are only counted.
  const WINS = (arg('--win', '1,0.7')).split(',').map(Number);
  out.econ = await page.evaluate(({ WINS, N }) => {
    const res = [];
    for (const wr of WINS) for (const mode of ['all', 'half']) for (let r = 0; r < N; r++) {
      window.__seed(31337 + r * 101); SETTINGS.difficulty = 'medium'; let rs = 777 + r * 13; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
      C = freshCareer(); C.name = 'Econ'; C.bracket = makeBracket(0); C.seen.intro = true;
      const prices = (typeof STORE_ITEMS !== 'undefined' ? STORE_ITEMS : []).filter(x => x.price > 0).map(x => x.price).concat(ALL_PROJECTS.flatMap(pj => pj.tiers.map(t => t[1]))).sort((a, b) => a - b);
      const total = prices.reduce((a, b) => a + b, 0), games = [], buys = {}; let hbAll = 0, firstAt = null, allAt = null, pool = 0;
      for (let g = 0; g < 240 && !C.done; g++) {
        if (C.seasonOver) startNewSeason(false);
        if (C.bracket.out || C.bracket.champ) { C.retries = (C.retries || 0) + 1; C.bracket = makeBracket(C.stage); }
        C.seen['stage' + C.stage] = true;
        const st = C.stage, bp0 = C.bp, hb0 = C.hb;
        calEnsure(); if (calGameDay() != null && !calGameToday()) calSetDay(calGameDay());
        if (!Game.cv) prepCareerVenue(); Game.screen = 'pregame'; startCareerMatch();
        for (let k = 0; k < 12 && Game.screen !== 'play'; k++) { if (Game.screen === 'story' && Game.story) Game.story.then(); else { if (!Game.cv) prepCareerVenue(); Game.screen = 'pregame'; startCareerMatch(); } }
        const me = M.career && M.players.find(q => q.human === 0); if (!me) { res.push({ wr, err: 'no match at game ' + g }); break; }
        const won = rnd() < wr;
        Object.assign(me.stats, { pts: 12, reb: 4, ast: 3, stl: 1, blk: 1, pf: 0, fgm: 5, fga: 11 });
        M.teams[0].score = won ? 34 : 28; M.teams[1].score = won ? 28 : 34; M.winner = won ? 0 : 1; M.phase = 'over';
        careerAfterMatch();
        for (let k = 0; k < 6 && Game.screen === 'postgame'; k++) postgameContinue();
        for (let k = 0; k < 30 && Game.screen === 'story' && Game.story; k++) Game.story.then();
        C.bp += drillBP(30, st);                                       // one practice drill a game day (30 points before the stage and v9.19.0 scaling)
        const bp = C.bp - bp0, hb = C.hb - hb0; hbAll += Math.max(0, hb); games.push({ st, won, bp, hb });
        // 'all': every point on the main stat (the fastest it can go); 'half': all of it until a 7, then half (the rest on other stats)
        pool += mode === 'all' || (C.lv.sht || 4) < 7 ? bp : bp / 2;
        while ((C.lv.sht || 4) < 10 && pool >= statCost(C.lv.sht || 4)) { pool -= statCost(C.lv.sht); C.lv.sht++; buys[C.lv.sht] = { g: games.length, st: C.stage }; }
        if (firstAt == null && hbAll >= prices[0]) firstAt = games.length;
        if (allAt == null && hbAll >= total) allAt = { g: games.length, st: C.stage };
        Game.worldSuppress = true; careerHub(); Game.hubJum = null;
      }
      const drill = drillBP(10, 0);
      res.push({ wr, mode, games, buys, firstAt, allAt, prices: { n: prices.length, cheapest: prices[0], total }, done: !!C.done, seasons: C.season || 1, drill });
    }
    return res;
  }, { WINS, N: Math.max(1, ECON) });
  const NAME = s => ['Local', 'State', 'National', 'World'][s] || s;
  console.log(`\nECONOMY (scripted careers: a typical line every game, 12 pts 4 reb 3 ast 1 stl 1 blk no fouls, and one drill a game day; shooting from 4)`);
  for (const R of out.econ) {
    if (R.err) { console.log(`win ${R.wr}: ${R.err}`); continue; }
    const per = [0, 1, 2, 3].map(s => { const G = R.games.filter(x => x.st === s); return G.length ? `${NAME(s)} ${G.length} games: ${(G.reduce((a, x) => a + x.bp, 0) / G.length).toFixed(0)} BP, ${(G.reduce((a, x) => a + x.hb, 0) / G.length).toFixed(0)} HB a game` : null; }).filter(Boolean);
    console.log(`won ${Math.round(R.wr * 100)}% of games, ${R.mode === 'all' ? 'every BP on shooting' : 'all BP on shooting to 7, then half'}: ${R.games.length} games, ${R.seasons} season(s), ${R.done ? 'World champions' : 'not finished'}. ${per.join('; ')}`);
    console.log(`  shooting: ${Object.entries(R.buys).map(([l, b]) => l + ' after game ' + b.g + ' (' + NAME(b.st) + ')').join(', ')}`);
    console.log(`  Halal Bucks: ${R.prices.n} things to buy (store and projects), cheapest ${R.prices.cheapest}, all ${R.prices.total}; the first after game ${R.firstAt}; all ${R.allAt ? 'after game ' + R.allAt.g + ' (' + NAME(R.allAt.st) + ')' : 'not by the end of the career'}`);
  }
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
if (errs.length) console.log('\npage errors:\n' + [...new Set(errs)].slice(0, 5).join('\n'));
await browser.close(); srv.close();
