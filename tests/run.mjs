// Islam Dunk regression suite (headless Chromium via Playwright).
//
//   npm test                         builds dist/web, then tests it
//   node tests/run.mjs [--page dist/web/index.html] [--ref path/to/reference/index.html] [--only name,name]
//
// Tests:
//   cpu-parity   seeded CPU-vs-CPU games (2v2 timed, first-to, half court, 1 on 1). With --ref, the same
//                seeds must give exactly the same scores and box scores in both builds.
//   controls     scripted human input: pump fake -> double dribble rules, legal pivot and shot
//   half-court   lobby-driven half-court / points-target games run to completion
//   career       new career -> 3 matches -> post-game -> save written
//   feel         v7.9 rules: holding sprint gets at least the CPU's sprint time (same stamina rule), nobody
//                walks through the end walls, a loose ball bounces off them, side-outs start with room
//   minis        Lightning rules (threes first, in order, own rebounds, on deck shoots once the ball ahead
//                is in the air, last two can't skip the three), HORSE word/timer options
//   defense      v8.1: hold DEFEND guards the ball, contested dunks miss, no steals off a restart in
//                your own half, half-court check-ups, whole-team control (off by default)
//   phase3       mini-game menu taps start games, Stride dribble pace, Casual controls (auto release, auto
//                guard), the tutorial runs to the end, the ball watchdog recovers a lost ball
//   phase4       half-court restarts don't teleport, Around the World and King of the Court play out,
//                profile XP and unlocks, Barakah Run 2.0 (vow, map, the final), 3 on 3 beta
//   career-intro creator (Start career) -> walk to Saleem outside the masjid -> up the path -> gym -> meet
//                all five brothers -> hub; body builds sum to zero; CPU stages have 2/3/2 strength tiers
//   online-loop  loopback transport: lobby, 7 game types (HORSE with the HAQ word, Around the World, King of the Court), back to lobby, direct (P2P) link + fallback,
//                v8.6.1: a Noor power-up pick on the host and on the guest (host authoritative, effect mirrored)
//   online-room  claude.ai room adapter (faked locally): lobby -> game -> lobby
//   online-fb    Firebase adapter (fake SDK): lobby -> game -> lobby
//   noor         v8.6.1 Noor power-ups: choice of 3 (least recently used), each of the 6 applies and expires,
//                a wrong answer gives nothing, Barakah Run stacking; turnovers by cause and the TOV column
//   mobile       iPhone landscape/portrait layout, touch controls, the Noor choice screen (fits; tap picks), no errors
// Every test fails on any uncaught page error.
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { FAKE_FIREBASE_APP, FAKE_FIREBASE_DB, FAKE_ROOM_INIT } from './fakes.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const REF = arg('--ref', null) ? path.resolve(arg('--ref')) : null;
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const ASSETS = path.join(ROOT, 'assets');

// ---- tiny static server: "/" = the page under test, "/ref/" = the reference page, assets alongside
function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      let file = null;
      if (u === '/' || u === '/index.html') file = PAGE;
      else if (REF && (u === '/ref/' || u === '/ref/index.html')) file = REF;
      else { const rel = u.replace(/^\/ref\//, '/'); file = path.join(ASSETS, rel); }
      fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
    }).listen(0, '127.0.0.1', () => res({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

// Deterministic random for parity runs (re-seeded by each test before it simulates).
const SEED_INIT = `(() => { let s = 1; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = rnd; window.__seed = n => { s = n | 0; }; })();`;

async function newContext(browser, opts = {}) {
  const ctx = await browser.newContext(opts.device || { viewport: { width: 1280, height: 720 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());                       // system font, no network
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE_FIREBASE_APP }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-database\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE_FIREBASE_DB }));
  if (opts.seed) await ctx.addInitScript(SEED_INIT);
  if (opts.room) await ctx.addInitScript(FAKE_ROOM_INIT);
  return ctx;
}
async function open(ctx, url, errs, tag) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  await p.goto(url); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 15000 });
  return p;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ tests
const T = {};

T['cpu-parity'] = async ({ browser, base }) => {
  const run = async url => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, url, errs, 'cpu');
    const out = await p.evaluate(() => {
      const res = [];
      const sim = (label, setup) => {
        window.__seed(1000 + res.length * 7919);
        setup();
        let n = 0; for (; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; }
        const box = M.players.map(p => [p.stats.pts, p.stats.reb, p.stats.ast, p.stats.stl, p.stats.blk, p.stats.fgm, p.stats.fga].join('/')).join(' ');
        res.push({ label, score: M.teams[0].score + '-' + M.teams[1].score, steps: n, box });
      };
      sim('2v2 quarters 60s', () => newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 60 } }));
      sim('2v2 halves 45s', () => newMatch(TEAMS[2], TEAMS[5], { humans: [], fmt: { format: 'halves', len: 45 } }));
      sim('2v2 first to 21', () => newMatch(TEAMS[3], TEAMS[6], { humans: [], fmt: { format: 'first21', len: 120 } }));
      sim('1v1 first to 11', () => newMatch(soloTeam(TEAMS[4], 0), soloTeam(TEAMS[7], 1), { humans: [], fmt: { format: 'first21', len: 120, target: 11 } }));
      sim('2v2 half court to 11', () => { const o = Lobby.opts(); Object.assign(o, { court: 'half', format: 'first21', target: 11 }); Net.role = 'host'; Lobby.apply(); newMatch(TEAMS[1], TEAMS[2], { humans: [] }); Lobby.restore(); Net.role = null; });
      for (let i = 0; i < 6; i++) sim('2v2 quick ' + i, () => newMatch(TEAMS[i % 8], TEAMS[(i + 3) % 8], { humans: [], fmt: { format: 'quarters', len: 30 } }));
      return res;
    });
    await ctx.close();
    return { out, errs };
  };
  const a = await run(base + '/');
  const lines = a.out.map(r => `${r.label}: ${r.score} (${r.steps} steps)`);
  if (a.errs.length) return { ok: false, detail: a.errs };
  if (!REF) return { ok: a.out.every(r => r.steps > 0), detail: lines.concat('(no --ref given: outcomes recorded, not compared)') };
  const b = await run(base + '/ref/');
  const same = JSON.stringify(a.out) === JSON.stringify(b.out) && !b.errs.length;
  return { ok: same, detail: same ? lines.concat(`identical to reference across ${a.out.length} seeded games (scores + full box scores)`) : ['DIFFERS from reference', ...lines, '--- ref', ...b.out.map(r => `${r.label}: ${r.score} (${r.steps})`), ...b.errs] };
};

T['controls'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'controls');
  const r = await p.evaluate(() => {
    const out = {}, calls = []; const _c = FX.callout.bind(FX); FX.callout = (t, ...a) => { calls.push(t); return _c(t, ...a); };
    const scenario = after => {
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] });
      for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
      const me = M.players[0]; M.phase = 'live'; ball.shot = null; giveBall(me, 'inbound'); place(me, 900, 350); me.state = 'free';
      for (const q of M.players) if (q !== me) place(q, 200, 640);       // rules only: no defender can steal mid-scenario
      let t = 0; calls.length = 0;
      M.cmdHook = q => { if (q !== me) { zeroCmd(q.cmd); return true; } const c = q.cmd; for (const k of ['a', 'b', 'x', 's', 'turbo', 'bHeld', 'aHeld', 'xHeld']) c[k] = false; c.mx = c.mz = 0; c.face = 0; c.passTo = null; c.alley = null;
        t += STEP; if (t < 0.05) return true; if (!me.pick && t < 0.5 && me.state === 'free') { startFake(me); return true; } if (t > 0.5) after(c, t); return true; };
      for (let i = 0; i < 150; i++) updateMatch(STEP);
      M.cmdHook = null;
      for (let i = 0; i < 300 && !ball.owner && (M.inb || M.phase === 'dead'); i++) updateMatch(STEP);   // let a turnover inbound finish
      return { dd: calls.includes('DOUBLE DRIBBLE!'), owner: ball.owner ? ball.owner.team : null };
    };
    out.walkOff = scenario(c => { c.mx = 1; });
    out.crossover = scenario((c, t) => { if (t < 0.55) c.x = true; });
    out.pivot = scenario(c => { c.mz = 0.2; });
    out.shot = scenario((c, t) => { c.bHeld = t < 0.9; c.b = t < 0.52; });
    return out;
  });
  await ctx.close();
  const ok = r.walkOff.dd && r.walkOff.owner === 1 && r.crossover.dd && !r.pivot.dd && r.pivot.owner === 0 && !r.shot.dd && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['half-court'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'half');
  const r = await p.evaluate(() => {
    const out = [];
    for (const [solo, court, target] of [[false, 'half', 11], [true, 'half', 7], [false, 'full', 7]]) {
      Object.assign(Lobby.opts(), { court, format: 'first21', target }); Net.role = 'host'; Lobby.apply();
      newMatch(solo ? soloTeam(TEAMS[0], 0) : TEAMS[0], solo ? soloTeam(TEAMS[1], 0) : TEAMS[1], { humans: [] });
      let n = 0; for (; n < 60 * 60 * 10 && M.phase !== 'over'; n++) updateMatch(STEP);
      out.push({ court, target, half: M.halfCourt, over: M.phase === 'over', top: Math.max(M.teams[0].score, M.teams[1].score), label: periodLabel(1) });
      Lobby.restore(); Net.role = null;
    }
    return out;
  });
  await ctx.close();
  const ok = r.every(x => x.over && x.top >= x.target && x.half === (x.court === 'half') && x.label === 'FIRST TO ' + x.target) && !errs.length;
  return { ok, detail: [...r.map(x => JSON.stringify(x)), ...errs] };
};

T['career'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'career');
  const r = await p.evaluate(() => {
    const out = [];
    C = freshCareer(); if (!C.bracket) C.bracket = makeBracket(C.stage); saveCareer();
    for (let g = 0; g < 3; g++) {
      startCareerMatch();
      let n = 0; for (; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; }
      const over = M.phase === 'over', score = M.teams[0].score + '-' + M.teams[1].score;
      careerAfterMatch();
      out.push({ g, over, score, screen: Game.screen, played: C.gamesPlayed, rec: C.wins + '-' + C.losses });
      Game.screen = 'title';
    }
    const saved = readSave(SAVE_AUTO);
    return { out, saved: !!saved, savedGames: saved && saved.gamesPlayed };
  });
  // render a few career screens to catch drawing errors
  for (const s of ['hub', 'postgame', 'cbracket']) { await p.evaluate(sc => { try { Game.screen = sc; } catch (e) {} }, s); await sleep(400); }
  await ctx.close();
  const ok = r.out.every((x, i) => x.over && x.screen === 'postgame' && x.played === i + 1) && r.saved && r.savedGames === 3 && !errs.length;
  return { ok, detail: [...r.out.map(x => JSON.stringify(x)), 'save written: ' + r.saved, ...errs] };
};

T['feel'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'feel');
  const r = await p.evaluate(() => {
    const out = {};
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 600 } });
    let spr = 0, frames = 0, outside = 0, ballOut = 0;
    for (let i = 0; i < 60 * 90; i++) {
      updateMatch(STEP); if (M.phase !== 'live') continue;
      for (const q of M.players) { frames++; if (q.cmd.turbo && q.turboOK() && Math.hypot(q.vx, q.vz) > 40) spr++; if (q.x < 0 || q.x > COURT.L) outside++; }
      if (!ball.owner && (ball.x < -10 || ball.x > COURT.L + 10)) ballOut++;
    }
    out.cpuSprint = +(spr / frames).toFixed(3); out.outside = outside; out.ballOut = ballOut;
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } });
    for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
    const me = M.players[0]; let hs = 0, dir = 1;
    M.cmdHook = q => { if (q !== me) return false; zeroCmd(q.cmd); if (me.x > 1200) dir = -1; if (me.x < 150) dir = 1; q.cmd.mx = dir; q.cmd.turbo = true; return true; };
    for (let i = 0; i < 60 * 60; i++) { updateMatch(STEP); if (me.cmd.turbo && me.turboOK() && Math.hypot(me.vx, me.vz) > 40) hs++; }
    out.holdSprint = +(hs / 3600).toFixed(3); M.cmdHook = null;
    ball.owner = null; ball.state = 'loose'; Object.assign(ball, { x: 200, y: 60, z: 500, vx: -900, vy: 100, vz: 500 });
    let worst = 0; for (let i = 0; i < 120; i++) { updateMatch(STEP); worst = Math.max(worst, -ball.x); } out.ballWorst = Math.round(worst);
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 600 } });
    for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
    const v = M.players[0], d = M.players[2]; place(v, 600, 300); place(d, 620, 305); giveBall(v, 'inbound');
    sideOut(v, 'REACH-IN!', ''); M.deadT = 0; updateMatch(STEP);
    out.sideOutGap = Math.round(Math.min(...M.players.filter(q => q.team !== v.team).map(q => dxz(q, v)))); out.sideOutBall = ball.owner === v;
    return out;
  });
  await ctx.close();
  const ok = r.holdSprint >= r.cpuSprint * 0.9 && r.outside === 0 && r.ballOut === 0 && r.ballWorst <= 10 && r.sideOutGap >= 90 && r.sideOutBall && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['minis'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'minis');
  const r = await p.evaluate(() => {
    const out = { games: 0, done: 0, firstShots: 0, notThree: 0, outOfOrder: 0, wrongGrab: 0 }, h = hoops[1];
    // Lightning, CPU only: every first shot is a three from behind the arc, the second in line never
    // shoots before the first, and only the shooter can pick up his own rebound
    for (let g = 0; g < 6; g++) {
      setupMini('lightning', { humans: [] }); const mg = M.mini, seen = new Set(); out.games++;
      for (let n = 0; n < 60 * 300 && !mg.done; n++) {
        const before = new Set(mg.taken), act = mg.active.slice();
        miniStep(STEP);
        for (const st of M.balls) {
          if (st.state === 'shot' && st.shot && !seen.has(st.shot)) {
            seen.add(st.shot); const s = st.shot.shooter, si = M.players.indexOf(s);
            if (!before.has(si)) { out.firstShots++; if (Math.hypot(s.x - h.x, s.z - h.z) < THREE_R) out.notThree++; if (act[1] === si && !before.has(act[0])) out.outOfOrder++; }
          }
          if (st.owner && st.kShooter && st.owner !== st.kShooter) out.wrongGrab++;
        }
      }
      if (mg.done) out.done++;
    }
    // Lightning, human second in line: shooting before the front of the line is blocked
    setupMini('lightning', { humans: [{ team: 0, slot: 0, pad: 0 }] });
    const mg = M.mini; mg.active = [1, 0]; mg.queue = [2, 3, 4]; mg.give(0, 1); mg.give(1, 0);
    M.players.forEach((q, i) => { const sp = mg.spotFor(i); place(q, sp.x, sp.z); });
    mg.wait[1] = 99; const me = M.players[0];
    M.cmdHook = null; const _hc = humanCmd; humanCmd = (pad, c) => { zeroCmd(c); c.b = true; c.bHeld = true; };
    for (let n = 0; n < 60; n++) miniStep(STEP);
    humanCmd = _hc;
    out.blocked = !!mg.blocked && !mg.taken.has(0) && ballStateOf(me).owner === me;
    // Lightning, human on deck: you can shoot the moment the ball ahead is in the air (not when it lands)
    setupMini('lightning', { humans: [{ team: 0, slot: 0, pad: 0 }] });
    { const mg = M.mini; mg.active = [1, 0]; mg.queue = [2, 3, 4]; mg.give(0, 1); mg.give(1, 0);
      M.players.forEach((q, i) => { const sp = mg.spotFor(i); place(q, sp.x, sp.z); }); mg.wait[1] = 0.1;
      let rel = -1, mine = -1; const _hc = humanCmd;
      humanCmd = (pad, c) => { zeroCmd(c); if (mg.taken.has(1) && mine < 0) { c.b = true; c.bHeld = true; } };
      for (let n = 0; n < 240 && mine < 0; n++) { miniStep(STEP); if (rel < 0 && mg.taken.has(1)) rel = M.time; if (mine < 0 && (M.players[0].state === 'windup' || M.players[0].state === 'shoot')) mine = M.time; }   // you're up into your shot
      humanCmd = _hc;
      const front = M.balls.find(b => b.kShooter === M.players[1]);
      out.onDeck = rel >= 0 && mine >= 0 ? +(mine - rel).toFixed(2) : -1;
    }
    // Lightning, last two, a human who sprints at the rim and dunks: every knockout still needs a three first
    { let illegal = 0, kos = 0;
      for (let g = 0; g < 10; g++) {
        setupMini('lightning', { roster: ['you', 'saleem'], humans: [{ team: 0, slot: 0, pad: 0 }] });
        const mg = M.mini, h = hoops[1], me = M.players[0], first = {}, seen = new Set(); let act = mg.active.slice(), hold = 0;
        const _hc = humanCmd;
        humanCmd = (pad, c) => { zeroCmd(c); const st = ballStateOf(me);
          if (st && st.owner === me) { const d = dxz(me, h); if (d > 150) { c.mx = (h.x - me.x) / d; c.mz = (h.z - me.z) / d; c.turbo = true; }
            if (hold > 0) { hold += STEP; c.bHeld = hold < 0.45; if (hold > 0.5) hold = 0; } else { c.b = true; c.bHeld = true; c.turbo = true; hold = 0.01; } }
          else if (st && st.state === 'loose') { const d = Math.hypot(st.x - me.x, st.z - me.z) || 1; c.mx = (st.x - me.x) / d; c.mz = (st.z - me.z) / d; } };
        const _ko = mg.knockOut.bind(mg); mg.knockOut = (o, by) => { kos++; if (!(first[by] >= THREE_R)) illegal++; return _ko(o, by); };
        for (let n = 0; n < 60 * 200 && !mg.done; n++) {
          miniStep(STEP);
          for (const i of mg.active) if (!act.includes(i)) delete first[i];
          act = mg.active.slice();
          for (const st of M.balls) if (st.state === 'shot' && st.shot && !seen.has(st.shot)) { seen.add(st.shot); const s = st.shot.shooter, i = M.players.indexOf(s); if (first[i] == null) first[i] = Math.hypot(s.x - h.x, s.z - h.z); }
        }
        humanCmd = _hc;
      }
      out.lastTwo = { kos, illegal };
    }
    // HORSE: word and timer options
    setupMini('horse', { roster: ['you', 'saleem'], humans: [], word: 'HAQ', timer: 6 });
    out.horse = M.mini.word + '/' + M.mini.timerLen;
    const hm = M.mini; for (let n = 0; n < 60 * 400 && !hm.done; n++) miniStep(STEP);
    out.horseDone = hm.done && Math.max(...hm.letters) === 3;
    return out;
  });
  await ctx.close();
  const ok = r.done === r.games && r.firstShots > 20 && !r.notThree && !r.outOfOrder && !r.wrongGrab && r.blocked && r.onDeck >= 0 && r.onDeck < 0.6 && r.lastTwo.kos >= 5 && !r.lastTwo.illegal && r.horse === 'HAQ/6' && r.horseDone && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['defense'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'defense');
  const r = await p.evaluate(() => {
    const out = {}; SETTINGS.difficulty = 'medium';
    // hold DEFEND: you lock onto the ball, stay between him and the rim, and keep pace. v8.6.1: averaged over
    // 5 seeded 90-second games (one game is a single trajectory; any balance change reroutes it)
    const G = { held: 0, onBall: 0, between: 0, dist: 0, near: 0 }, SEEDS = [4242, 11, 22, 33, 44];
    for (const sd of SEEDS) {
      window.__seed(sd);
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } });
      for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
      const me = M.players.find(q => q.human === 0);
      M.cmdHook = q => { if (q !== me) return false; zeroCmd(q.cmd); if (ball.owner && ball.owner.team !== me.team) q.cmd.xHeld = true; else if (ball.owner === me) q.cmd.a = true; return true; };
      for (let i = 0; i < 60 * 90; i++) { updateMatch(STEP); const D = me.v8; if (!D || !D.held || !D.man) continue; G.held++;
        if (D.man === ball.owner && M.phase === 'live' && !M.bc && !transActive(ball.owner.team)) { G.onBall++; const h = defendHoop(me.team); if (dxz(me, h) < dxz(D.man, h)) G.between++; if (dxz(D.man, h) < 450) { G.dist += dxz(me, D.man); G.near++; } } }
      M.cmdHook = null;
    }
    out.guard = { held: Math.round(G.held / SEEDS.length), onBall: Math.round(G.onBall / SEEDS.length), between: +(G.between / Math.max(1, G.onBall)).toFixed(2), dist: Math.round(G.dist / Math.max(1, G.near)), seeds: SEEDS.length };
    window.__seed(4242);                                              // deterministic: the dunk and inbound numbers are odds
    // contested dunks: open take-offs go in, a set defender at the rim makes it a coin flip at best
    const dunks = setD => { let made = 0, n = 0;
      for (let k = 0; k < 120; k++) {
        newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 600 } }); M.phase = 'live';
        const s = M.players[0], h = attackHoop(0); place(s, h.x - h.dir * 90, h.z); giveBall(s, 'inbound');
        M.players.forEach(q => { if (q !== s) place(q, 200, 640); });
        if (setD) { const d = M.players.find(q => q.team === 1); place(d, h.x - h.dir * 30, h.z); d.setT = 1; d.stance = true; }
        s.state = 'free'; startDunk(s, {}); n++;
        const before = M.teams[0].score; for (let i = 0; i < 120; i++) updateMatch(STEP); if (M.teams[0].score > before) made++;
      }
      return made / n; };
    out.openDunk = dunks(false); out.contestedDunk = dunks(true);
    // full court: the defense can't take the ball in your own half off a restart (the metric also counts
    // losses just after crossing half court, so allow a little)
    PossLog.force = true; const games = [];
    for (let g = 0; g < 2; g++) { newMatch(TEAMS[g], TEAMS[g + 2], { humans: [], fmt: { format: 'quarters', len: 60 } });
      for (let i = 0; i < 60 * 400 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); }
      if (PossLog.done) { games.push(PossLog.done); PossLog.done = null; } }
    out.lostOnInbound = possSummary(games).lostOnInbound; out.games = games.length;
    // half court: every restart is a check-up that ends live
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'first21', len: 120 } }); M.halfCourt = true; formation(0); inbound(0);
    let checks = 0, live = 0, was = false;
    for (let i = 0; i < 60 * 120; i++) { updateMatch(STEP); if (M.check && !was) checks++; if (!M.check && was && M.phase === 'live') live++; was = !!M.check; }
    out.checks = checks; out.checksLive = live;
    // whole-team control: off by default; on, you always have the ball on offense
    out.ctlDefault = SETTINGS.teamCtl === false || localStorage.getItem('islamdunk.teamctl') === '1';
    SETTINGS.teamCtl = true; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } });
    let off = 0, mine = 0; for (let i = 0; i < 60 * 60; i++) { updateMatch(STEP); if (M.phase === 'live' && ball.owner && ball.owner.team === 0) { off++; if (ball.owner.human === 0) mine++; } }
    SETTINGS.teamCtl = false; out.ctl = +(mine / Math.max(1, off)).toFixed(2); out.humans = M.players.filter(q => q.human >= 0).length;
    return out;
  });
  await ctx.close();
  const g = r.guard;
  const ok = g.onBall > 600 && g.between >= 0.75 && g.dist < 90 && r.openDunk >= 0.9 && r.contestedDunk <= 0.75 && parseInt(r.lostOnInbound) <= 2 && r.games === 2
    && r.checks >= 3 && r.checksLive >= r.checks - 1 && r.ctlDefault && r.ctl >= 0.95 && r.humans === 1 && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['phase3'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'phase3');
  const r = await p.evaluate(() => {
    window.__seed(777); const out = {};
    // mini games menu: one tap changes a setting, one tap on Start starts the game
    openMinis('horse'); render(document.querySelector('canvas').getContext('2d'));
    const R = minisRows(), tapRow = label => { const i = R.findIndex(x => x.label === label); const rr = Game.rects.filter(x => x.w === 460)[i]; rr.fn(); };
    const w0 = MiniOpts.word; tapRow('Word'); out.wordTap = MiniOpts.word !== w0;
    render(document.querySelector('canvas').getContext('2d')); Game.rects.filter(x => x.w === 460)[minisRows().findIndex(x => x.start)].fn();
    out.miniStarted = Game.screen === 'play' && !!M.mini && M.mini.kind === 'horse';
    goTitle();
    // stride dribble: fewer bounces than classic at a jog
    const bounces = mode => { SETTINGS.dribble = mode; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } });
      for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
      const me = M.players[0]; giveBall(me, 'inbound'); place(me, 200, 350); M.players.forEach(q => { if (q !== me) place(q, 1300, 640); });
      M.cmdHook = q => { zeroCmd(q.cmd); if (q === me) q.cmd.mx = 1; return true; }; let b = 0, prev = me.dp;
      for (let i = 0; i < 120; i++) { updateMatch(STEP); if (prev < 0.5 && me.dp >= 0.5) b++; prev = me.dp; } M.cmdHook = null; return b / 2; };
    out.classicBps = bounces('classic'); out.strideBps = bounces('stride'); SETTINGS.dribble = 'classic';
    // casual: a tap shoots with an automatic release; leaving the stick alone on defense guards
    SETTINGS.casual = true;
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } });
    for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
    const me = M.players[0]; M.phase = 'live'; M.bc = null; giveBall(me, 'inbound'); place(me, 1000, 300); M.players.forEach(q => { if (q !== me) place(q, 200, 640); });
    let k = 0; const _hc0 = Input.pressed; M.cmdHook = q => q !== me ? (zeroCmd(q.cmd), true) : false;
    const hk = Input.down; Input.pressed = { KeyK: true }; Input.down = { KeyK: true }; updateMatch(STEP); Input.pressed = {}; Input.down = {};
    for (let i = 0; i < 90 && !(ball.state === 'shot'); i++) updateMatch(STEP);
    out.casualShot = ball.state === 'shot';
    M.cmdHook = null; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } });
    for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
    const me2 = M.players[0], o = me2.opps[0]; M.phase = 'live'; M.bc = null; giveBall(o, 'inbound'); place(o, 800, 350); place(me2, 1000, 350);
    let held = 0; for (let i = 0; i < 60; i++) { updateMatch(STEP); if (me2.v8 && me2.v8.held) held++; }
    out.casualGuard = held > 40; SETTINGS.casual = false;
    // the tutorial runs start to finish (each step skipped) and ends back at the title
    startTutorial(); let steps = 0;
    for (let i = 0; i < TUT_STEPS.length - 1; i++) { for (let f = 0; f < 30; f++) updateMatch(STEP); tutGo(TUT.i + 1); steps++; }
    out.tutFinal = !!TUT_STEPS[TUT.i].final && TUT.on; tutEnd(); out.tutEnded = !TUT.on && Game.screen === 'title';
    // watchdog: a loose ball nobody is allowed to pick up (stuck lock) is freed and the game goes on
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 600 } });
    for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
    M.phase = 'live'; M.bc = null; ball.owner = null; Object.assign(ball, { state: 'loose', x: 600, y: 12, z: 350, vx: 0, vy: 0, vz: 0, grabLock: 99, lastTouch: M.players[0] });
    let back = false; for (let i = 0; i < 480; i++) { if (ball.grabLock > 0.4 && i < 60) ball.grabLock = 99; updateMatch(STEP); if (ball.owner && M.phase === 'live') { back = true; break; } }
    out.watchdog = back;
    return out;
  });
  await ctx.close();
  const ok = r.wordTap && r.miniStarted && r.strideBps < r.classicBps && r.strideBps >= 1.8 && r.strideBps <= 3.5 && r.casualShot && r.casualGuard && r.tutFinal && r.tutEnded && r.watchdog && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['phase4'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'phase4');
  const r = await p.evaluate(() => {
    window.__seed(99); const out = {};
    // half court restarts: nobody teleports into the check-up
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'first21', len: 120 } }); M.halfCourt = true; M.mustClear = [false, false]; formation(0); inbound(0);
    let jumps = 0; const prev = new Map();
    for (let i = 0; i < 60 * 90; i++) { updateMatch(STEP); for (const q of M.players) { const a = prev.get(q); if (a && Math.hypot(q.x - a[0], q.z - a[1]) > 14 && q.state !== 'dunk') jumps++; prev.set(q, [q.x, q.z]); } }
    out.hcJumps = jumps;
    // Around the World, CPU vs CPU, plays to a winner
    setupMini('atw', { roster: ['saleem', 'khalil'], humans: [] }); { const mg = M.mini; for (let n = 0; n < 60 * 400 && !mg.done; n++) miniStep(STEP); out.atw = mg.done && mg.winner != null && mg.pos[mg.winner] === ATW_N; }
    // King of the Court, all CPU, crowns somebody
    startKotc({ roster: ['saleem', 'nasser', 'khalil'], humans: {} }); { let n = 0; for (; n < 60 * 900 && !KOTC.done; n++) { if (KOTC.spect && KOTC.overT <= 0 && n % 600 === 599) kotcSkip(); updateMatch(STEP); } out.kotc = KOTC.done && !!KOTC.champ; out.kotcOnes = Math.max(...M.teams.map(t => t.score)) <= KOTC_TO + 1; KOTC.on = false; }
    // profile: a mini game pays XP
    localStorage.removeItem('islamdunk.profile'); Profile.d = null;
    setupMini('atw', { roster: ['you', 'saleem'], humans: [{ team: 0, slot: 0, pad: 0 }] }); M.mini.done = true; M.mini.winner = 0; updateMatch(STEP);
    out.xp = Profile.load().xp; Profile.d.xp = 5000; out.lv = Profile.level().n; out.unlocked = Profile.has('ball', 'night') && !Profile.has('ball', 'gold');
    // Barakah Run 2.0: vow, the map, and the final
    goTitle(); Run.duo = null; startBarakah(); out.vowScreen = Game.screen === 'runvow'; runPickVow(1);
    let guard = 0;
    while (Run.active && guard++ < 60) {
      if (Game.screen === 'runmap') { const i = Math.max(0, Run.choicesV2.findIndex(x => x === 'game' || x === 'elite' || x === 'boss')); runChooseNode(i); if (Game.screen === 'play') { M.teams[0].score = 30; M.teams[1].score = 10; M.winner = 0; barakahContinue(); } }
      else if (Game.screen === 'runchoice') pickRunPower(0); else break;
    }
    out.runChamp = Run.champion && Game.screen === 'runend';
    // 3 on 3 beta
    Game.threeNext = true; newMatch(TEAMS[2], TEAMS[5], { humans: [], fmt: { format: 'quarters', len: 30 } });
    for (let i = 0; i < 60 * 200 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); }
    out.three = M.three && M.players.length === 6 && M.assign[0].length === 3 && M.phase === 'over';
    Game.threeNext = false; newMatch(TEAMS[2], TEAMS[5], { humans: [] }); out.twoAfter = !M.three && M.players.length === 4;
    return out;
  });
  await ctx.close();
  const ok = r.hcJumps === 0 && r.atw && r.kotc && r.kotcOnes && r.xp >= 60 && r.lv > 10 && r.unlocked && r.vowScreen && r.runChamp && r.three && r.twoAfter && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['phase5'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'phase5');
  const r = await p.evaluate(() => {
    window.__seed(5); const out = {};
    C = freshCareer(); C.name = 'Yusuf'; C.bracket = makeBracket(0); saveCareer(); careerHub();
    // goals: rookie pays once, badges are earned (never bought), a week is 3 games
    const bp0 = C.bp; rookieDo('masjid'); rookieDo('masjid'); out.rookie = C.bp - bp0 === 40;
    badgeAdd('lungs', 5); out.notYet = !hasBadge('lungs'); badgeAdd('lungs'); out.badge = hasBadge('lungs');
    // niyyah before a game, kept, opens the first lesson
    Game.screen = 'pregame'; startCareerMatch(); out.asked = Game.screen === 'story';
    while (storyLine(Game.story)[0] !== 'choice') { Game.story.t = 99; storyNext(Game.story); }
    storyChoose(Game.story, 1); out.picked = !!C.niyyah;
    for (let i = 0; i < 20 && Game.screen === 'story'; i++) { Game.story.t = 99; storyNext(Game.story); }
    out.played = Game.screen === 'play' && M.career;
    C.niyyah = 'pass'; M.players.find(q => q.human === 0).stats.ast = 5;
    for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; }
    careerAfterMatch(); out.kept = C.niyyahKept === 1 && C.lessons === 1 && (sheikhSituation() || {}).key === 'lesson0';
    for (let g = 0; g < 2; g++) { startCareerMatch(); for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; } careerAfterMatch(); }
    out.week = cg().week.n === 2;
    // gym routines run and pay
    enterGym(); const res = {};
    for (const k of ['mikan', 'slides', 'passing', 'cond']) {
      Gym.result = null; startDrill(k);
      for (let n = 0; n < 60 * 4; n++) {
        gymUpdate(STEP);
        const d = Gym.drill; if (!d) break;
        if (k === 'passing' && d.open > 0.1 && ball.owner === M.players[0]) doPass(M.players[0], M.players[1], false);
        if (k === 'cond' && n % 20 === 0) { d.started = true; place(M.players[0], COND_LINES[Math.min(d.idx, COND_LINES.length - 1)], 350); }
      }
      if (Gym.drill) Gym.drill.left = 0;
      for (let n = 0; n < 240 && !Gym.result; n++) gymUpdate(STEP);
      res[k] = Gym.result ? Gym.result.kind : null;
    }
    out.routines = res;
    Gym.result = null; startMini('atw', 'khalil'); M.mini.done = true; M.mini.doneT = 0; M.mini.winner = 1;
    for (let n = 0; n < 200 && !Gym.result; n++) gymUpdate(STEP);
    out.atwGym = Gym.result && Gym.result.kind === 'atw';
    // a project you can use: the water cooler
    Gym.result = null; C.up.fountain = 1; enterGym(); M.players[0].turbo = 10; useGymProp(GYM_PROPS[0]);
    for (let n = 0; n < 60 * 3; n++) gymUpdate(STEP);
    out.cooler = !Gym.prop && M.players[0].turbo === 100;
    // musalla: new lines, then heard
    C.wins = Math.max(1, C.wins); const before = newsFor('khalil').length; TALK.khalil.options[0][1](); out.news = before > 0 && newsFor('khalil').length === before - 1;
    // end of season ceremony, once
    C.done = true; careerHub(); out.awards = Game.screen === 'story' && /awards/.test(Game.story.title); careerHub(); out.awardsOnce = Game.screen === 'hub';
    return out;
  });
  for (const s of ['hub', 'cgoals', 'journal']) { await p.evaluate(sc => { Game.screen = sc; }, s); await sleep(300); }
  await p.evaluate(() => { openMusalla(); }); await sleep(300);
  await p.evaluate(() => { Object.assign(C.up, { minaret: 1, dome: 1, garden: 2, parking: 1 }); Game.screen = 'masjid'; Game.masjidView = 'ext'; ExtFx.id = 'fount'; ExtFx.t = 0; }); await sleep(400);
  await ctx.close();
  const R = r.routines || {};
  const ok = r.rookie && r.notYet && r.badge && r.asked && r.picked && r.played && r.kept && r.week && R.mikan === 'mikan' && R.slides === 'slides' && R.passing === 'passing' && R.cond === 'cond' && r.atwGym && r.cooler && r.news && r.awards && r.awardsOnce && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['phase6'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?review=1', errs, 'phase6');
  const r = await p.evaluate(() => {
    window.__seed(6); const out = {};
    // menus: every list is short, groups nest
    const depth = (L, d = 0) => Math.max(L.length, ...L.filter(e => e.sub).map(e => depth(e.sub, d + 1)));
    const TM = TITLE_MENU(); out.top = TM.map(e => e.label).join(',');
    out.short = depth(TM.filter(e => e.label !== 'Review')) <= 6;
    const qp = TM.find(e => e.label === 'Quick Play'); menuActivate('title', TM, TM.indexOf(qp)); menuActivate('title', TM, qp.sub.findIndex(e => e.label === 'Play a game'));
    out.nested = menuState('title').path.length === 2; closeSub('title'); closeSub('title'); out.closed = menuState('title').sub === -1;
    out.settings = SET_GROUPS.map((g, i) => setGroupItems(i).length).every(n => n > 0 && n <= 6) && SET_GROUPS.reduce((a, g, i) => a + setGroupItems(i).length, 0) === SET_ITEMS.length - 1;
    // career card: the career player shows up in Quick Play
    C = freshCareer(); C.name = 'Yusuf'; C.bracket = makeBracket(0); C.lv.spd = 7; saveCareer(); C = null;
    const you = teamPool().find(t => t.custom === 'career'); out.card = !!you && you.players[1].name === 'Yusuf' && you.players[1].stats.spd >= 7;
    // creator: sandbox player and team, share code round trip
    const d = csLoad(), pl = csNewPlayer(); pl.name = 'Bilal'; for (const [k] of CS_STATS) pl.stats[k] = 10; d.players.push(pl);
    const tm = csNewTeam(); tm.name = 'Masjid Al-Fajr'; tm.short = 'FAJR'; tm.roster = [{ k: 'career' }, { k: 'p', id: pl.id }]; d.teams.push(tm); d.league = [tm.id]; csSave();
    const code = csShareCode('team', tm), bad = csImport(code.slice(0, -6)), good = csImport(code), pc = csImport(csShareCode('player', pl));
    out.share = !!bad.err && !!good.ok && !!pc.ok && csLoad().teams.length === 2 && csLoad().teams[1].roster[1].def.stats.spd === 10;
    out.clean = csClean('shit team', 'X') === 'X' && csClean('Hassan', 'X') === 'Hassan';
    // a custom team plays a full game
    const ti = teamPool().findIndex(t => t.custom === tm.id);
    startSelect('1p'); Object.assign(Game.sel, { a: ti, b: 0, step: 2, ctrl: 0 }); startMatchFromSelect(null);
    out.custom = M.teamDefs[0].name === 'Masjid Al-Fajr' && M.players.some(q => q.def.name === 'Bilal');
    for (let n = 0; n < 60 * 60 * 30 && M.phase !== 'over'; n++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); }
    out.over = M.phase === 'over';
    // career league: your team is an opponent, never your side; your player keeps his earned stats
    goTitle(); loadCareer(SAVE_AUTO);
    const T = stageTeams(0); out.league = T.some(t => t && t.name === 'Masjid Al-Fajr') && amanahTeam().players.every(q => q.name !== 'Bilal') && playerDef().stats.spd < 10;
    // review mode: scenes, a mark, export
    C = null; out.scenes = rvScenes().length > 40;
    rvMark('That was a... strategic loss.', 'cut'); rvLoad().feel[0] = { r: 4 }; rvExport();
    out.export = /strategic loss.*cut/.test(RV.lastExport) && /feel/.test(RV.lastExport);
    rvExit(); out.noSave = (readSave(SAVE_AUTO) || {}).name === 'Yusuf';
    return out;
  });
  for (const s of ['cslist', 'csedit', 'review']) {
    await p.evaluate(sc => { if (sc === 'csedit') { CSUI.tab = 1; openCSEdit(csLoad().players[0]); } else if (sc === 'cslist') openCS(0); else { Game.screen = 'review'; } }, s); await sleep(300);
  }
  await p.evaluate(() => { Game.screen = 'settings'; Game.setGroup = 1; }); await sleep(300);
  await ctx.close();
  const ok = Object.entries(r).every(([k, v]) => k === 'top' || v === true) && r.top === 'Career,Quick Play,Online,Teams & Players,Options,Review' && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['v86'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v86');
  const r = await p.evaluate(() => {
    window.__seed(86); const out = {};
    // transition: CPU teams run the lane and hit the runner ahead
    let ahead = 0, toma = 0;
    for (let g = 0; g < 2; g++) {
      newMatch(TEAMS[g], TEAMS[g + 4], { humans: [], fmt: { format: 'quarters', len: 90 } });
      for (let n = 0; n < 60 * 60 * 10 && M.phase !== 'over'; n++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP);
        if (ball.pass && ball.pass.ahead && !ball.pass._c) { ball.pass._c = 1; ahead++; }
        for (const q of M.players) if (q.state === 'dunk' && q.act && q.act.type === 'tomahawk' && !q.act._c) { q.act._c = 1; toma++; } }
    }
    out.ahead = ahead >= 4; out.toma = toma >= 1;
    // a self-oop off the glass, and a teammate's lob off the glass
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'first21', target: 99, len: 600 } }); M.phase = 'live';
    const [a, b] = M.players, h = attackHoop(a.team); M.players.slice(2).forEach(q => place(q, h.x - h.dir * 600, 100));
    place(a, h.x + h.dir * 260, h.z); giveBall(a, 'inbound'); a.vx = -h.dir * 250; a.vz = 0;
    out.oopOK = selfOopOK(a); selfOop(a); out.glass = !!(ball.pass && ball.pass.glass);
    const s0 = M.teams[0].score; for (let i = 0; i < 150; i++) updateMatch(STEP); out.oopScored = M.teams[0].score > s0;
    // ankles, swats and taunts run without errors
    ankleFall(M.players[2], a); a.taunt = null; tauntOpen(a, 'block'); doTaunt(a, 'sujood'); out.noSujoodLive = a.taunt && a.taunt.k === 'sky';
    for (let i = 0; i < 90; i++) updateMatch(STEP);
    out.dri = STAT_ROWS.some(r => r[0] === 'dri') && CS_STATS.some(r => r[0] === 'dri') && driOf({ st: { spd: 10, stl: 10, pas: 10 } }) === 10;
    out.taunts = REWARDS.filter(x => x.kind === 'taunt').length === TAUNTS.length - 1;
    // King of the Court: no corner stalls, the winner has the ball
    startKotc({ roster: ['saleem', 'nasser', 'khalil', 'hamid'], humans: {} });
    const hh = hoops[1], ct = new Map(); let stuck = 0, sam = 0, firsts = [], lastG = KOTC.games;
    for (let n = 0; n < 60 * 500 && !KOTC.done; n++) { if (KOTC.spect && KOTC.overT <= 0 && n % 3000 === 2999) kotcSkip(); updateMatch(STEP);
      if (KOTC.games !== lastG) { lastG = KOTC.games; firsts.push(M.possTeam === 0 || (M.inb && M.inb.team === 0) || (M.check && M.check.team === 0)); }
      if (KOTC.overT > 0) continue;
      for (const q of M.players) { const inC = (q.x - hh.x) * hh.dir < 140 && Math.abs(q.z - hh.z) > 200, t = inC ? (ct.get(q) || 0) + STEP : 0; ct.set(q, t); sam++; if (t > 2.5) stuck++; } }
    out.kotcCorners = stuck / sam < 0.005; out.kotcWinnerBall = firsts.length > 0 && firsts.every(Boolean); KOTC.on = false;
    // 7 Up and every custom preset play to a winner; codes round-trip
    out.minis = MR_PRESETS.every(set => { setupMini('custom', { set, rules: set.r, roster: ['saleem', 'nasser', 'khalil'].slice(0, set.r.players), humans: [] }); const mg = M.mini; for (let n = 0; n < 60 * 900 && !mg.done; n++) miniStep(STEP); return mg.done && mg.winner != null; });
    out.code = !!mrImport(mrCode(MR_PRESETS[1])).ok && !!mrImport('ID1-zzz-abc').err;
    return out;
  });
  await p.evaluate(() => { goTitle(); MiniMenu.kind = 'custom'; openMinis(); }); await sleep(300);
  await p.evaluate(() => openRoom()); await sleep(300);
  await p.evaluate(() => { Game.screen = 'profile'; }); await sleep(300);
  await ctx.close();
  const ok = Object.values(r).every(v => v === true) && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['career-intro'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'career-intro');
  const st = () => p.evaluate(() => ({ scr: Game.screen, scene: typeof INTRO !== 'undefined' && INTRO ? INTRO.scene : null, x: INTRO && Math.round(INTRO.x || 0), talk: INTRO && INTRO.talk ? INTRO.talk.lines[INTRO.talk.i][0] : null, met: INTRO && INTRO.met ? Object.keys(INTRO.met).length : 0 }));
  const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await sleep(380); } };
  const checks = await p.evaluate(() => {
    let zero = true, maxAbs = 0;
    for (const h of [0, 1, 2]) for (const b of [0, 1, 2]) for (const s of [null, ...PLAY_STYLES]) { const m = bodyMods(h, b, s === 'classic' ? null : s), v = Object.values(m); if (v.reduce((a, x) => a + x, 0)) zero = false; maxAbs = Math.max(maxAbs, ...v.map(Math.abs), 0); }
    C = freshCareer(); C.seed = 4242;
    const tiers = [0, 1, 2, 3].map(st => { const T = stageTeams(st).slice(1), c = { '-1': 0, '0': 0, '1': 0 }; T.forEach(t => c[t.tier]++); return c; });
    const bodies = stageTeams(0).slice(2).every(t => t.players.every(p => p.bh != null && p.bw != null));
    return { zero, maxAbs, tiers, bodies };
  });
  // creator -> Tab to the Start career button -> Enter
  await p.evaluate(() => { C = freshCareer(); C.name = 'Test'; Game.creator = { idx: 0, isNew: true }; setupPractice('free'); Game.screen = 'creator'; });
  await sleep(300); await press('Tab'); await press('Enter');
  const s0 = await st();
  await p.keyboard.down('KeyD'); for (let i = 0; i < 50 && !(await st()).talk; i++) await sleep(100); await p.keyboard.up('KeyD');
  const greeted = (await st()).talk;
  for (let i = 0; i < 6 && (await st()).talk; i++) await press('Enter');
  await sleep(1200);
  for (let i = 0; i < 80; i++) {
    const s = await st(); if (s.scr !== 'introout') break;
    const k = Math.abs(s.x - 420) > 12 ? (s.x < 420 ? 'KeyD' : 'KeyA') : 'KeyW';
    await p.keyboard.down(k); await sleep(k === 'KeyW' ? 200 : 120); await p.keyboard.up(k);
  }
  await sleep(1800); const s1 = await st();
  for (let i = 0; i < 4 && (await st()).talk; i++) await press('Enter');
  for (const id of ['khalil', 'nasser', 'mahmoud', 'tariq', 'siddiq']) {
    await p.evaluate(id => { const s = INTRO_CAST[id], me = M.players[0]; me.x = s.x + (s.x > 900 ? -70 : 70); me.z = s.z; }, id);
    await sleep(350); await press('KeyE');
    for (let k = 0; k < 4 && (await st()).talk; k++) await press('Enter');
  }
  const s2 = await st();
  for (let k = 0; k < 3 && (await st()).talk; k++) await press('Enter');
  await p.evaluate(() => { const me = M.players[0]; me.x = INTRO_SALEEM.x - 70; me.z = INTRO_SALEEM.z; }); await sleep(350);
  await press('KeyE'); for (let k = 0; k < 4 && (await st()).talk; k++) await press('Enter');
  await sleep(1600);
  const end = await p.evaluate(() => ({ scr: Game.screen, seen: C.seen.intro && C.seen.meetNew, saved: !!readSave(SAVE_AUTO) }));
  await ctx.close();
  const tiersOk = checks.tiers.every(c => c['-1'] === 2 && c['0'] === 3 && c['1'] === 2);
  const ok = checks.zero && checks.maxAbs <= 3 && tiersOk && checks.bodies && s0.scr === 'introout' && greeted === 'saleem' && s1.scr === 'gym' && s1.scene === 'gym' && s2.met === 5 && end.scr === 'hub' && end.seen && end.saved && !errs.length;
  return { ok, detail: [JSON.stringify(checks), 'start: ' + JSON.stringify(s0), 'greeted by ' + greeted, 'gym: ' + JSON.stringify(s1), 'met: ' + JSON.stringify(s2), 'end: ' + JSON.stringify(end), ...errs] };
};

// v8.6.1: Noor power-ups (choice of 3, each of the 6 applies and expires, wrong answer gives nothing,
// least-recently-used rotation, Barakah Run stacking) and turnovers (TOV column, each counted cause)
T['noor'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'noor');
  const r = await p.evaluate(() => {
    const out = {};
    const setup = () => {
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0;
      for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
      M.phase = 'live'; M.clock = 500;
      M.cmdHook = q => { zeroCmd(q.cmd); return true; };            // nobody moves: rules only
      const me = M.players[0], h = attackHoop(0); place(me, h.x + h.dir * 250, h.z); me.state = 'free';
      for (const q of M.players) if (q !== me) place(q, q.team === 0 ? 120 : COURT.L - 120, q.slot ? 640 : 60);
      return me;
    };
    const steps = s => { for (let i = 0; i < Math.round(s * 60); i++) { M.shotClock = 24; updateMatch(STEP); } };
    const correct = me => { openTrivia(me); answerTrivia(Game.trivia.order.indexOf(0)); for (let i = 0; i < 130 && !(Game.trivia && Game.trivia.pick); i++) triviaUpdate(1 / 60); return Game.trivia && Game.trivia.pick; };
    // (a) a correct answer opens a 3-effect choice; the next one shows the 3 least recently used
    let me = setup();
    const pk = correct(me);
    out.choice = pk ? pk.opts.join(',') : null;
    noorChoose(Game.trivia, 1);                                          // sabr
    out.picked = noorFxOf(me);
    me.nfx = null; const pk2 = correct(me); out.next = pk2 ? pk2.opts.join(',') : null; noorChoose(Game.trivia, 0); me.nfx = null; me.boost = 0;
    // each of the 6: applies, then expires
    const fx = {};
    me = setup(); const w0 = shotWindow(me);
    applyNoorFx(me, 'noor'); fx.noor = { on: me.boost > 0, glow12: me.boost === 12 }; steps(12.2); fx.noor.off = !noorActive(me);
    me = setup(); applyNoorFx(me, 'sabr'); fx.sabr = { on: noorFxOf(me) === 'sabr', wider: +(shotWindow(me) / w0).toFixed(3) };
    for (let k = 0; k < 3; k++) { giveBall(me, 'inbound'); me.state = 'shoot'; me.st_t = apexT(me); releaseShot(me); ball.owner = null; ball.state = 'loose'; ball.shot = null; me.state = 'free'; }
    steps(0.05); fx.sabr.offAfter3Shots = !noorActive(me);
    me = setup(); applyNoorFx(me, 'sabr'); steps(30.2); fx.sabr.offAfter30s = !noorActive(me);
    const grabAt = (on) => {                                              // a loose ball just beyond normal reach
      me = setup(); if (on) applyNoorFx(me, 'himmah');
      const d = 26 + (st7(me, 'hus') - 5) * 1.2 + 6;
      Object.assign(ball, { owner: null, state: 'loose', shot: null, pass: null, grabLock: 0, x: me.x + d, y: 50, z: me.z, vx: 0, vy: 0, vz: 0 });
      checkGrab(); return ball.owner === me;
    };
    fx.himmah = { reachesWith: grabAt(true), reachesWithout: grabAt(false) };
    me = setup(); applyNoorFx(me, 'himmah'); steps(15.2); fx.himmah.off = !noorActive(me);
    const regen = on => { me = setup(); if (on) applyNoorFx(me, 'quwwah'); const full = me.turbo; me.turbo = 20; me.winded = false; me._qt = 20; steps(1); return { full, gain: me.turbo - 20 }; };
    const q1 = regen(true), q0 = regen(false);
    fx.quwwah = { refillsNow: q1.full === 100, regenRatio: +(q1.gain / Math.max(0.01, q0.gain)).toFixed(2) };
    me = setup(); applyNoorFx(me, 'quwwah'); steps(10.2); fx.quwwah.off = !noorActive(me);
    me = setup(); applyNoorFx(me, 'yaqazah'); const opp = me.opps[0]; giveBall(opp, 'inbound'); place(opp, me.x + 40, me.z); opp.state = 'free'; me.cd.steal = 0;
    const pf0 = M.players.reduce((t, q) => t + (q.stats.pf || 0), 0);
    trySteal(me);
    fx.yaqazah = { clean: ball.owner === me, noFoul: M.players.reduce((t, q) => t + (q.stats.pf || 0), 0) === pf0 && M.phase === 'live', used: !noorActive(me), oppTov: opp.stats.tov };
    me = setup(); applyNoorFx(me, 'yaqazah'); steps(20.2); fx.yaqazah.off = !noorActive(me);
    me = setup(); applyNoorFx(me, 'ukhuwwah'); fx.ukhuwwah = { mateGlows: me.mate.boost === 12, pickerFree: !noorActive(me) }; steps(12.2); fx.ukhuwwah.off = !noorActive(me.mate);
    // one effect at a time: the meter waits
    me = setup(); me.def.huffath = true; applyNoorFx(me, 'himmah'); addHifz(me, 50); fx.meterWaits = me.hifz === 0;
    out.fx = fx;
    // replays: the effect travels in the frame's flag bits (fire/boost bits unchanged)
    me = setup(); applyNoorFx(me, 'himmah'); me.fire = true; const fr = Replay.frame(); me.nfx = null; me.fire = false;
    Replay.active = { frames: [fr], t: 0, dur: 1 }; const undo = Replay.apply(fr);
    out.replay = { fx: noorFxOf(me), fire: me.fire }; undo(); Replay.active = null; out.replay.after = noorFxOf(me);
    // (b) a wrong answer gives nothing
    me = setup(); openTrivia(me); answerTrivia((Game.trivia.order.indexOf(0) + 1) % 4); for (let i = 0; i < 130; i++) if (Game.trivia) triviaUpdate(1 / 60);
    out.wrong = { closed: !Game.trivia, nothing: !noorActive(me) && me.boost === 0 };
    // Barakah Run: the effects stack sensibly with green, recharge, fire and shield
    me = setup(); const base0 = shotWindow(me);
    Run.active = true; M.barakah = true; Run.upgrades = { green: 3, recharge: 3, fire: 3, shield: 1 }; Run.shieldUsed = false;
    const wGreen = shotWindow(me); applyNoorFx(me, 'sabr'); const wBoth = shotWindow(me);
    const bq = (on) => { me.nfx = null; if (on) applyNoorFx(me, 'quwwah'); me.turbo = 20; me._qt = 20; steps(1); return me.turbo - 20; };
    const gq = bq(true), gr = bq(false);
    me.nfx = null; me.fire = true; me.fireT = 5; applyNoorFx(me, 'noor'); steps(1);
    out.run = { green: +(wGreen / base0).toFixed(3), greenPlusSabr: +(wBoth / base0).toFixed(3), quwwahVsRecharge: +(gq / Math.max(0.01, gr)).toFixed(2), turboCapped: me.turbo <= 100, fireAndNoor: me.fire && me.boost > 0, shieldKept: !Run.shieldUsed };
    Run.active = false; M.barakah = false; Run.upgrades = {};
    // (d) turnovers: each cause counted, and the TOV column in the box scores
    me = setup(); const o = me.opps[0], tv = {};
    giveBall(o, 'inbound'); place(o, me.x + 40, me.z); giveBall(me, 'steal'); tv.steal = o.stats.tov;
    giveBall(o, 'inbound'); M.possTeam = o.team; shotClockViolation(); tv.shotClock = o.stats.tov - tv.steal;
    M.phase = 'live'; giveBall(me, 'inbound'); me.pick = { x: me.x, z: me.z, t: M.time }; doubleDribble(me); tv.doubleDribble = me.stats.tov;
    M.phase = 'live'; M.sideOut = null; ball.owner = null; Object.assign(ball, { state: 'loose', x: -300, y: 20, z: 300, shot: null, pass: null, lastTouch: me }); M.possTeam = me.team; watchdog(0.7); tv.outOfBounds = me.stats.tov - tv.doubleDribble;
    const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const g = cv.getContext('2d'), seen = []; const ft = g.fillText.bind(g); g.fillText = (t, ...a) => { seen.push(String(t)); return ft(t, ...a); };
    drawBoxScore(g, 150); tv.boxHasTOV = seen.includes('TOV'); tv.boxRowTov = boxRow(me).tov === me.stats.tov;
    out.tov = tv;
    M.cmdHook = null;
    return out;
  });
  await ctx.close();
  const f = r.fx;
  const ok = r.choice === 'noor,sabr,quwwah' && r.picked === 'sabr' && r.next === 'noor,quwwah,himmah'
    && f.noor.on && f.noor.glow12 && f.noor.off
    && f.sabr.on && f.sabr.wider > 1.2 && f.sabr.wider < 1.3 && f.sabr.offAfter3Shots && f.sabr.offAfter30s
    && f.himmah.reachesWith && !f.himmah.reachesWithout && f.himmah.off
    && f.quwwah.refillsNow && f.quwwah.regenRatio > 1.7 && f.quwwah.regenRatio < 2.3 && f.quwwah.off
    && f.yaqazah.clean && f.yaqazah.noFoul && f.yaqazah.used && f.yaqazah.oppTov === 1 && f.yaqazah.off
    && f.ukhuwwah.mateGlows && f.ukhuwwah.pickerFree && f.ukhuwwah.off && f.meterWaits
    && r.wrong.closed && r.wrong.nothing && r.replay.fx === 'himmah' && r.replay.fire === true && r.replay.after === null
    && r.run.green > 1.2 && r.run.greenPlusSabr <= 1.401 && r.run.greenPlusSabr > r.run.green && r.run.quwwahVsRecharge > 1.7 && r.run.turboCapped && r.run.fireAndNoor && r.run.shieldKept
    && r.tov.steal === 1 && r.tov.shotClock === 1 && r.tov.doubleDribble === 1 && r.tov.outOfBounds === 1 && r.tov.boxHasTOV && r.tov.boxRowTov
    && !errs.length;
  return { ok, detail: [`choice ${r.choice} -> picked ${r.picked}; next choice ${r.next}`, 'effects ' + JSON.stringify(r.fx), 'wrong answer ' + JSON.stringify(r.wrong), 'replay ' + JSON.stringify(r.replay), 'Barakah Run ' + JSON.stringify(r.run), 'turnovers ' + JSON.stringify(r.tov), ...errs] };
};

async function onlineFlow(browser, base, { query = '', room = false, games = ['vs'], dropP2P = false, custom = false, noor = false }) {
  const errs = [], ctx = await newContext(browser, { room });
  const H = await open(ctx, base + '/' + query, errs, 'host'), G = await open(ctx, base + '/' + query, errs, 'guest');
  const log = [];
  const avail = await H.evaluate(() => [Net.avail, Net.transport]);
  log.push('transport: ' + avail.join(' '));
  if (avail[0] !== 'yes') { await ctx.close(); return { ok: false, detail: log.concat(errs) }; }
  const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
  await G.evaluate(c => Lobby.join(c), code);
  await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 10000 }).catch(() => {});
  let ok = (await G.evaluate(() => Game.screen)) === 'lobby' && await H.evaluate(() => !!Net.guestPeer);
  log.push('guest in lobby: ' + ok);
  await sleep(3500);
  const p2p = await H.evaluate(() => (typeof P2P !== 'undefined' ? P2P.open : null));
  log.push('direct (P2P) link: ' + p2p);
  if (custom) {                                   // a team only the host has (kept in memory, not in shared storage)
    await H.evaluate(() => { const d = csLoad(), p = csNewPlayer(); p.name = 'Zayd'; p.stats.spd = 10; d.players.push(p); const t = csNewTeam(); t.name = 'Masjid Test Host'; t.short = 'THOST'; t.roster = [{ k: 'p', id: p.id }, { k: 'cast', id: 'khalil' }]; d.teams.push(t); CS.rev++; });
  }
  for (const game of games) {
    if (custom) await H.evaluate(() => { const o = Lobby.opts(); o.a = teamCount() - 1; Lobby.changed(); });
    await H.evaluate(g => { const o = Lobby.opts(); o.game = g; if (g === 'horse') { o.word = 'HAQ'; o.timer = 6; } Net.mode = g; Lobby.changed(); }, game);
    await G.evaluate(() => Lobby.setReady(1)); await sleep(800);
    await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => Game.screen === 'netplay' && M.players && M.players.length > 0, null, { timeout: 10000 }).catch(() => {});
    await sleep(2500);
    const st = await G.evaluate(() => ({ screen: Game.screen, players: M.players.length, snaps: Net.snaps.length }));
    const hs = await H.evaluate(() => ({ screen: Game.screen, players: M.players.length }));
    const word = game === 'horse' ? await G.evaluate(() => M.mini && M.mini.word + '/' + M.mini.timerLen) : null;
    const cust = custom ? await G.evaluate(() => [M.teamDefs[0].name, M.players.map(q => q.def.name).join('/')]) : null;
    if (cust) log.push(`${game}: guest sees ${cust[0]} (${cust[1]})`);
    const good = st.screen === 'netplay' && st.players === hs.players && st.players >= 2 && hs.screen === 'play' && (game !== 'horse' || word === 'HAQ/6') && (!cust || (cust[0] === 'Masjid Test Host' && cust[1].includes('Zayd')));
    if (noor && game === games[0]) {              // v8.6.1: a Noor pick on each side; the host stays authoritative
      await H.evaluate(() => { M.introT = 0; const me = M.players.find(q => q.human === 0); openTrivia(me); answerTrivia(Game.trivia.order.indexOf(0)); Game.trivia.res = 1.7; });
      await H.waitForFunction(() => Game.trivia && Game.trivia.pick, null, { timeout: 5000 }).catch(() => {});
      const hostPick = await H.evaluate(() => { const tv = Game.trivia; if (!tv || !tv.pick) return null; const id = tv.pick.opts[1]; noorChoose(tv, 1); return id; });
      await sleep(1200);
      const hostSeen = await G.evaluate(() => { const q = M.players.find(x => x.human === 0); return q ? noorFxOf(q) : null; });
      await H.evaluate(() => { const g = M.players.find(q => q.human === 1); openTrivia(g); });
      await G.waitForFunction(() => Game.trivia && Game.trivia.remoteView, null, { timeout: 5000 }).catch(() => {});
      await G.evaluate(() => Net.guestAnswer(Game.trivia.order.indexOf(0)));
      await G.waitForFunction(() => Game.trivia && Game.trivia.pickView, null, { timeout: 8000 }).catch(() => {});
      const guestOpts = await G.evaluate(() => Game.trivia && Game.trivia.pickView ? Game.trivia.pickView.opts.slice() : null);
      await G.evaluate(() => Net.guestPick(2));
      await H.waitForFunction(() => { const g = M.players.find(q => q.human === 1); return !Game.trivia && g && noorActive(g); }, null, { timeout: 8000 }).catch(() => {});
      const onHost = await H.evaluate(() => noorFxOf(M.players.find(q => q.human === 1)));
      await sleep(1200);
      const onGuest = await G.evaluate(() => noorFxOf(M.players.find(q => q.human === 1)));
      const good = hostPick === 'sabr' && hostSeen === 'sabr' && guestOpts && guestOpts.length === 3 && onHost === guestOpts[2] && onGuest === onHost;
      log.push(`noor: host picked ${hostPick} (guest sees ${hostSeen}); guest offered ${guestOpts && guestOpts.join(',')}, picked card 3 -> host applied ${onHost}, guest sees ${onGuest}`);
      ok = ok && good;
    }
    if (dropP2P && game === games[0] && p2p) {
      await H.evaluate(() => P2P.close('test')); await sleep(2500);
      const after = await G.evaluate(() => ({ screen: Game.screen, gap: Math.round(nowMs() - Net.lastSnapAt) }));
      log.push(`after dropping the direct link: guest ${after.screen}, last snapshot ${after.gap} ms ago`);
      ok = ok && after.screen === 'netplay' && after.gap < 1500;
    }
    await H.evaluate(() => Lobby.back());
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 8000 }).catch(() => {});
    const back = await G.evaluate(() => Game.screen);
    log.push(`${game}: guest ${st.screen} (${st.players} players, ${st.snaps} snapshots buffered), host ${hs.screen}${word ? ', guest sees ' + word : ''}; back to ${back}`);
    ok = ok && good && back === 'lobby';
  }
  await ctx.close();
  return { ok: ok && !errs.length, detail: log.concat(errs) };
}
T['online-loop'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&lat=40&jit=10&room=t', games: ['vs', 'one', 'co', 'lightning', 'horse', 'atw', 'kotc', 'sevenup', 'custom'], dropP2P: true, noor: true });
T['online-room'] = ({ browser, base }) => onlineFlow(browser, base, { room: true, games: ['vs', 'one'] });
T['online-fb'] = ({ browser, base }) => onlineFlow(browser, base, { games: ['vs', 'co'] });
T['online-custom'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&lat=30&jit=5&room=c', games: ['vs', 'co', 'one'], custom: true });

T['mobile'] = async ({ browser, base }) => {
  const detail = []; let ok = true;
  for (const [name, dev] of [['iPhone 13 landscape', devices['iPhone 13 landscape']], ['iPhone 13 portrait', devices['iPhone 13']]]) {
    const errs = [], ctx = await newContext(browser, { device: dev }), p = await open(ctx, base + '/', errs, name);
    await p.evaluate(() => { Input.touchMode = true; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; });
    await sleep(1200);
    const r = await p.evaluate(() => { const c = canvas.getBoundingClientRect(); return { fits: c.right <= innerWidth + 1 && c.bottom <= innerHeight + 1 && c.width > 100, touch: TouchUI.shown, rotateCard: getComputedStyle(document.getElementById('rotate')).display }; });
    // v8.6.1: the Noor choice screen fits the screen; in landscape a real tap on a card picks it
    await p.evaluate(() => { const me = M.players[0]; openTrivia(me); answerTrivia(Game.trivia.order.indexOf(0)); Game.trivia.res = 1.7; });
    await p.waitForFunction(() => Game.trivia && Game.trivia.pick, null, { timeout: 5000 }).catch(() => {});
    await sleep(300);
    const cards = await p.evaluate(() => { const c = canvas.getBoundingClientRect(), sx = c.width / W, sy = c.height / H;
      return Game.rects.filter(q => q.w === 200 && q.h === 252).map(q => ({ x: c.left + (q.x + q.w / 2) * sx, y: c.top + (q.y + q.h / 2) * sy, inside: q.x >= 0 && q.x + q.w <= W && q.y >= 0 && q.y + q.h <= H })); });
    r.choiceCards = cards.length; r.choiceFits = cards.length === 3 && cards.every(q => q.inside);
    if (!name.includes('portrait') && cards.length === 3) {
      const want = await p.evaluate(() => Game.trivia.pick.opts[2]);
      await p.touchscreen.tap(cards[2].x, cards[2].y); await sleep(300);
      r.tapPicked = await p.evaluate(w => !Game.trivia && (noorFxOf(M.players[0]) === w || (w === 'ukhuwwah' && M.players[0].mate.boost > 0)), want);
    }
    const good = r.fits && r.touch && r.choiceFits && (name.includes('portrait') || r.tapPicked) && !errs.length && (name.includes('portrait') ? r.rotateCard !== 'none' : r.rotateCard === 'none');
    ok = ok && good; detail.push(`${name}: ${JSON.stringify(r)} ${errs.join('; ')}`);
    await ctx.close();
  }
  return { ok, detail };
};

T['adaptive-res'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { device: { viewport: { width: 1200, height: 724 }, deviceScaleFactor: 2 } }), p = await open(ctx, base + '/', errs, 'res');
  const r = await p.evaluate(() => {
    const reset = () => Object.assign(RES, { mode: 'auto', lvl: 0, scale: 1, cad: [], play: [], best: Infinity, lastChange: -1e9, probe: null, block: {}, evalAt: 0 }) && resize();
    let now = 0;
    const feed = (secs, dtFn, playing = true) => { const end = now + secs * 1000; let i = 0; while (now < end) { const dt = dtFn(i++); now += dt; RES.sample(dt, now, playing); } return RES.lvl; };
    const out = {};
    // 60 Hz device: idle menus, then a heavy stretch (30% of frames late), then smooth again
    reset(); now = 0;
    feed(3, () => 16.7, false);
    out.hz60_best = Math.round(RES.best * 10) / 10;
    out.hz60_heavy_3s = feed(3, i => (i % 10 < 3 ? 34 : 16.7));
    out.hz60_heavy_9s = feed(6, i => (i % 10 < 3 ? 34 : 16.7));
    out.backing_at_min = canvas.width + 'x' + canvas.height + ' (dpr ' + Math.round(dpr * 100) / 100 + ')';
    out.hz60_recover_30s = feed(30, () => 16.7);
    out.backing_after = canvas.width + 'x' + canvas.height;
    // 30 fps-locked phone (iOS Low Power Mode): steady 33.3 ms everywhere must not trigger a step down
    reset(); now = 0;
    feed(3, () => 33.3, false); out.lock30_steady_20s = feed(20, () => 33.3);
    // ...but a locked phone that drops to ~20 fps does step down
    out.lock30_struggling_6s = feed(6, i => (i % 4 === 0 ? 33.3 : 50));
    // anti-flicker: a step up that brings drops straight back is undone and that level is skipped
    reset(); now = 0;
    feed(3, () => 16.7, false); feed(3, i => (i % 10 < 3 ? 34 : 16.7));
    const down = RES.lvl; feed(7, () => 16.7); const upped = RES.lvl;
    feed(2.5, i => (i % 10 < 3 ? 34 : 16.7)); const after = RES.lvl;
    feed(10, () => 16.7); out.flicker = { down, upped, after, heldWithin30s: RES.lvl };
    // Full mode never adapts
    reset(); RES.mode = 'full'; now = 0; feed(3, () => 16.7, false); out.full_heavy = feed(10, i => (i % 2 ? 40 : 16.7));
    reset(); RES.mode = 'auto';
    return out;
  });
  await ctx.close();
  const ok = r.hz60_heavy_3s === 1 && r.hz60_heavy_9s === 3 && r.hz60_recover_30s === 0 && r.backing_after === '2400x1350' && r.lock30_steady_20s === 0 && r.lock30_struggling_6s >= 1
    && r.flicker.down === 1 && r.flicker.upped === 0 && r.flicker.after === 1 && r.flicker.heldWithin30s === 1 && r.full_heavy === 0 && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// ------------------------------------------------------------------ runner
const { srv, base } = await serve();
const browser = await chromium.launch();
const names = Object.keys(T).filter(n => !ONLY.length || ONLY.includes(n));
let failed = 0;
console.log(`Testing ${path.relative(ROOT, PAGE)}${REF ? ' against reference ' + REF : ''}\n`);
for (const n of names) {
  const t0 = Date.now();
  let r; try { r = await T[n]({ browser, base }); } catch (e) { r = { ok: false, detail: [String(e && e.stack || e)] }; }
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${n}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  for (const d of r.detail || []) console.log('      ' + d);
}
await browser.close(); srv.close();
console.log(`\n${names.length - failed}/${names.length} passed`);
process.exit(failed ? 1 : 0);
