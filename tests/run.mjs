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
//   minis        Lightning rules (threes first, in order, own rebounds), HORSE word/timer options
//   career-intro creator (Start career) -> walk to Saleem outside the masjid -> up the path -> gym -> meet
//                all five brothers -> hub; body builds sum to zero; CPU stages have 2/3/2 strength tiers
//   online-loop  loopback transport: lobby, 5 game types (HORSE with the HAQ word), back to lobby, direct (P2P) link + fallback
//   online-room  claude.ai room adapter (faked locally): lobby -> game -> lobby
//   online-fb    Firebase adapter (fake SDK): lobby -> game -> lobby
//   mobile       iPhone landscape/portrait layout, touch controls, no errors
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
    // HORSE: word and timer options
    setupMini('horse', { roster: ['you', 'saleem'], humans: [], word: 'HAQ', timer: 6 });
    out.horse = M.mini.word + '/' + M.mini.timerLen;
    const hm = M.mini; for (let n = 0; n < 60 * 400 && !hm.done; n++) miniStep(STEP);
    out.horseDone = hm.done && Math.max(...hm.letters) === 3;
    return out;
  });
  await ctx.close();
  const ok = r.done === r.games && r.firstShots > 20 && !r.notThree && !r.outOfOrder && !r.wrongGrab && r.blocked && r.horse === 'HAQ/6' && r.horseDone && !errs.length;
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

async function onlineFlow(browser, base, { query = '', room = false, games = ['vs'], dropP2P = false }) {
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
  for (const game of games) {
    await H.evaluate(g => { const o = Lobby.opts(); o.game = g; if (g === 'horse') { o.word = 'HAQ'; o.timer = 6; } Net.mode = g; Lobby.changed(); }, game);
    await G.evaluate(() => Lobby.setReady(1)); await sleep(800);
    await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => Game.screen === 'netplay' && M.players && M.players.length > 0, null, { timeout: 10000 }).catch(() => {});
    await sleep(2500);
    const st = await G.evaluate(() => ({ screen: Game.screen, players: M.players.length, snaps: Net.snaps.length }));
    const hs = await H.evaluate(() => ({ screen: Game.screen, players: M.players.length }));
    const word = game === 'horse' ? await G.evaluate(() => M.mini && M.mini.word + '/' + M.mini.timerLen) : null;
    const good = st.screen === 'netplay' && st.players === hs.players && st.players >= 2 && hs.screen === 'play' && (game !== 'horse' || word === 'HAQ/6');
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
T['online-loop'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&lat=40&jit=10&room=t', games: ['vs', 'one', 'co', 'lightning', 'horse'], dropP2P: true });
T['online-room'] = ({ browser, base }) => onlineFlow(browser, base, { room: true, games: ['vs', 'one'] });
T['online-fb'] = ({ browser, base }) => onlineFlow(browser, base, { games: ['vs', 'co'] });

T['mobile'] = async ({ browser, base }) => {
  const detail = []; let ok = true;
  for (const [name, dev] of [['iPhone 13 landscape', devices['iPhone 13 landscape']], ['iPhone 13 portrait', devices['iPhone 13']]]) {
    const errs = [], ctx = await newContext(browser, { device: dev }), p = await open(ctx, base + '/', errs, name);
    await p.evaluate(() => { Input.touchMode = true; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; });
    await sleep(1200);
    const r = await p.evaluate(() => { const c = canvas.getBoundingClientRect(); return { fits: c.right <= innerWidth + 1 && c.bottom <= innerHeight + 1 && c.width > 100, touch: TouchUI.shown, rotateCard: getComputedStyle(document.getElementById('rotate')).display }; });
    const good = r.fits && r.touch && !errs.length && (name.includes('portrait') ? r.rotateCard !== 'none' : r.rotateCard === 'none');
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
