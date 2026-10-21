// Islam Dunk regression suite (headless Chromium via Playwright).
//
//   npm test                         builds dist/web, then tests it
//   node tests/run.mjs [--page dist/web/index.html] [--ref path/to/reference/index.html] [--only name,name]
//
// Tests:
//   cpu-parity   seeded CPU-vs-CPU games (2v2 timed, first-to, half court, 1 on 1). With --ref, the same
//                seeds must give exactly the same scores and box scores in both builds.
//   controls     scripted human input after a pump fake: a crossover is ignored (no turnover), he can't move at all
//                (the stick only turns him), shoot and pass still work (v8.6.3: no double dribbles; v8.6.4: no walking)
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
//                v8.6.3: the guest sees a hot spot's +2 value and the pick-up pivot; v8.6.5: a default game is 2 halves on both
//   online-room  claude.ai room adapter (faked locally): lobby -> game -> lobby
//   online-fb    Firebase adapter (fake SDK): lobby -> game -> lobby
//   noor         v8.6.1 Noor power-ups: choice of 3 (least recently used), each of the 6 applies and expires,
//                a wrong answer gives nothing, Barakah Run stacking; turnovers by cause and the TOV column
//   mobile       iPhone landscape/portrait layout, touch controls, the Noor choice screen (fits; tap picks), no errors
//                plus the v8.6.2 phone text audit (tests/phone-audit.mjs) at iPhone landscape and 667x300
//   v867         v8.6.7: seeded inbounds never go back to the inbounder; turbo colour and card fade flip at most once a
//                second while sprinting; Sh. Saleem's 2-line limit and Leave buttons; who can earn Noor offline
//                (online-loop: the guest earns Noor on a team whose hafiz is the host's player, and on one where he is)
//   gamepad      v8.7.0: scripted pads: title -> Quick Play -> game -> pause -> quit, stick / sprint / shoot / pass,
//                two pads for two players, hot-plug, trivia and a Noor card, the on-screen picker, rumble, keyboard
//   clip         v8.7.1: a seeded game's best play exported as a video (MediaRecorder): video Blob, 4-8 s, state untouched;
//                refused during a live match; falls back to the still image without MediaRecorder
//   calendar     v9.0: the career calendar model (month lengths, weekdays, Jumu'ah, Ramadan, the Eids, year rollover), stage
//                schedules (every round a day, Wed/Sat only, never a Friday or two games a day, breaks, re-entry after the
//                break), Continue skips empty days, saves from v5 (knockout), v6 (group stage), finished and season-over
//                careers load with a sensible calendar, Settings → Career calendar Off, activity counters
//   career-run   v9.0: a full career by bot: new career -> creator -> intro -> hub -> Continue, every game played (CPU-vs-CPU,
//                the human's team forced to win) through all four stages and into a new season; the date only moves
//                forward and the hub's strip always shows 4 days
//   world-flow   v9.2 neighbourhood: a free day starts at home; Go out, the store and the masjid once a day, each visit moves
//                the time of day on, night only home, End the day, Skip the day, after a game the next morning at home,
//                Jumu'ah highlight, short leavable talks (a different set the next day), the store (Halal Bucks, cosmetic,
//                owned/worn, creator rows), the mirror, saves (old saves start at home), calendar Off, sign text size
//   world-walk   v9.2 walk bot: reachability over the walkable mask, walks to every portal, NPC and use point (stuck, off the
//                floor, through a prop), feet on the ground line, depth order, camera inside the drawn world
//   world-robust v9.2 rapid presses and taps in every scene, leaving mid-talk (Esc, Leave), tab away/back, resizes, phone
//                rotation, no page errors; night frame time per scene with the game's own loop
//   world-save   v9.2 save in every scene and time of day, reload, same place; the hub comes back; old saves start at home
//   world-visual v9.2 visual regression: every view x time of day x 3 sizes against docs/review/img/world-*.png
//   world-pad    v9.2 the stick walks, A talks, B leaves, Start opens the menu
//   formats      v8.6.5: the default game is 2 halves of 2:00 (label, halftime, end, shot clock, overtime); career and
//                practice keeps 4 quarters (v9.0.1: career follows the Settings format); explicit formats and a picked 4 quarters are unchanged
//   career-format v9.0.1: career games follow Settings: the default is 2 halves (1ST HALF, one halftime, ends, same rewards as
//                4 quarters for the same result), 4 quarters and First to 21 picked in Settings work too
//   tomahawk     v8.6.5: Classic matches the 8.6.4 recording (tests/fixtures/tomahawk-classic.json); smooth, power,
//                float: same dunk length and slam frame, finite, back to the normal pose; replays; the Dunk lab
//   v863         hot spots spawn only on the attacking half of a team holding the ball live, +1/+2 follows the
//                shooter (dunks and mini-game spots unchanged); CPU uses a live spot (at most every other
//                possession), closes out on it, and is unchanged with no spot; late game (trailing gets a shot
//                up, leading uses the shot clock); off the glass only to a trailing teammate
// Every test fails on any uncaught page error.
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { FAKE_FIREBASE_APP, FAKE_FIREBASE_DB, FAKE_ROOM_INIT } from './fakes.js';
import { PHONES, auditPhone, MIN_CSS_PX } from './phone-audit.mjs';
import { TOMAHAWK_REC } from './tomahawk-rec.mjs';
import { FAKE_PAD_INIT } from './fake-pad.js';
import { CAL_HELPERS } from './calendar-setup.js';
import { WORLD_HELPERS, WORLD_VIEWS, WORLD_TODS } from './world-setup.js';
import { PHONES as WORLD_PHONES } from './phone-audit.mjs';

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
  if (opts.pad) await ctx.addInitScript(FAKE_PAD_INIT);
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
    // v8.6.3: after a pump fake (picked up), nothing costs the ball: no double dribble
    const scenario = after => {
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] });
      for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
      const me = M.players[0], mate = me.mate; M.phase = 'live'; ball.shot = null; giveBall(me, 'inbound'); place(me, 900, 350); me.state = 'free';
      for (const q of M.players) if (q !== me && q !== mate) place(q, 200, 640);   // rules only: no defender can steal mid-scenario
      place(mate, 1010, 220);
      let t = 0, pivot = null, maxOff = 0, passed = false, moves = 0; calls.length = 0;
      const fga0 = me.stats.fga; me.face0 = me.face;
      M.cmdHook = q => { if (q !== me) { zeroCmd(q.cmd); return true; } const c = q.cmd; for (const k of ['a', 'b', 'x', 's', 'turbo', 'bHeld', 'aHeld', 'xHeld']) c[k] = false; c.mx = c.mz = 0; c.face = 0; c.passTo = null; c.alley = null;
        t += STEP; if (t < 0.05) return true; if (!me.pick && t < 0.5 && me.state === 'free') { startFake(me); return true; } if (t > 0.5) after(c, t, me); return true; };
      for (let i = 0; i < 150; i++) {
        updateMatch(STEP);
        if (me.pick) { pivot = pivot || { x: me.pick.x, z: me.pick.z }; maxOff = Math.max(maxOff, Math.hypot(me.x - pivot.x, me.z - pivot.z)); }
        if (me.mv) moves++;
        if (ball.state === 'pass' && ball.pass && ball.pass.from === me) passed = true;
      }
      M.cmdHook = null;
      return { dd: calls.includes('DOUBLE DRIBBLE!'), owner: ball.owner ? ball.owner.team : null, tov: me.stats.tov || 0, held: !!me.pick && ball.owner === me,
        maxOff: Math.round(maxOff), turned: me.face !== me.face0, moves, shot: me.stats.fga > fga0 || ball.state === 'shot', passed };
    };
    out.crossover = scenario((c, t) => { if (t < 0.55) c.x = true; c.mx = t < 0.55 ? 1 : 0; });
    out.walkOff = scenario(c => { c.mx = 1; c.turbo = true; });
    out.pivot = scenario((c, t, me) => { c.mx = -me.face0; c.mz = 0.2; });
    out.shot = scenario((c, t) => { c.bHeld = t < 0.9; c.b = t < 0.52; });
    out.pass = scenario((c, t, me) => { if (t < 0.56) { c.a = true; c.passTo = me.mate; } });
    out.noDoubleDribbleFn = typeof doubleDribble === 'undefined';
    return out;
  });
  await ctx.close();
  const clean = x => !x.dd && x.tov === 0;
  const ok = clean(r.crossover) && r.crossover.owner === 0 && r.crossover.held && r.crossover.moves === 0
    && clean(r.walkOff) && r.walkOff.owner === 0 && r.walkOff.held && r.walkOff.maxOff <= 1
    && clean(r.pivot) && r.pivot.owner === 0 && r.pivot.maxOff <= 1 && r.pivot.turned
    && clean(r.shot) && r.shot.shot && clean(r.pass) && r.pass.passed && r.noDoubleDribbleFn && !errs.length;
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
    // 300 s of steps for 120 s of game clock: free throws, timeouts and late-game fouls add dead time (8.6.2 already went past 200 s now and then)
    for (let i = 0; i < 60 * 300 && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); }
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
    // v8.6.2: the three touch-button settings (Button size, Button opacity, Left-handed) show only on touch devices;
    // on touch the Controls & camera group has 8 rows (the phone audit checks that screen fits); v9.0: Game has 7 on desktop (Career calendar)
    const grp = () => SET_GROUPS.map((g, i) => setGroupItems(i).length), tm0 = Input.touchMode;
    const desk = grp(); Input.touchMode = true; const touch = grp(); Input.touchMode = tm0;
    out.settings = desk.every(n => n > 0 && n <= 7) && desk.reduce((a, n) => a + n, 0) === SET_ITEMS.filter(s => !s.touch).length - 1
      && touch.every(n => n > 0 && n <= 8) && touch.reduce((a, n) => a + n, 0) === SET_ITEMS.length - 1;
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
    M.phase = 'live'; giveBall(me, 'inbound'); me.pick = { x: me.x, z: me.z, t: M.time }; startCross(me); tv.pickedUpCross = me.stats.tov;   // v8.6.3: no double dribble, no turnover
    M.phase = 'live'; M.sideOut = null; ball.owner = null; Object.assign(ball, { state: 'loose', x: -300, y: 20, z: 300, shot: null, pass: null, lastTouch: me }); M.possTeam = me.team; watchdog(0.7); tv.outOfBounds = me.stats.tov - tv.pickedUpCross;
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
    && r.tov.steal === 1 && r.tov.shotClock === 1 && r.tov.pickedUpCross === 0 && r.tov.outOfBounds === 1 && r.tov.boxHasTOV && r.tov.boxRowTov
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
  for (const [gi, game] of games.entries()) {
    if (custom) await H.evaluate(() => { const o = Lobby.opts(); o.a = teamCount() - 1; Lobby.changed(); });
    const coN = games.slice(0, gi + 1).filter(x => x === 'co').length;   // v8.6.7: 1st co game on NOOR (hafiz on slot 0), 2nd on TAQWA (hafiz on slot 1)
    await H.evaluate(([g, coN, fixTeam]) => { const o = Lobby.opts(); o.game = g; if (g === 'horse') { o.word = 'HAQ'; o.timer = 6; } if (g === 'co' && fixTeam) { o.a = coN === 1 ? 0 : 1; o.b = 4; } Net.mode = g; Lobby.changed(); }, [game, coN, noor && !custom]);
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
    if (game === 'vs' && !custom && !query.includes('room=c')) {   // v8.6.5: a default hosted game is 2 halves, and the guest sees the same
      const hf = await H.evaluate(() => [M.fmt.format, M.fmt.periods, M.fmt.len, periodLabel(1)].join('/')), gf = await G.evaluate(() => [M.fmt.format, M.fmt.periods, M.fmt.len, periodLabel(1)].join('/'));
      log.push(`format: host ${hf}, guest ${gf}`); ok = ok && hf === 'halves/2/120/1ST HALF' && gf === hf;
    }
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
    if (noor && !custom && game === 'co') {        // v8.6.7: online, the guest earns Noor too (host authoritative), whoever his team's hafiz is
      const team = await H.evaluate(() => M.teams[0].def.short);
      const steals = n => H.evaluate(n => { M.introT = 0; M.cmdHook = q => { zeroCmd(q.cmd); return true; }; const g = M.players.find(q => q.human === 1);
        for (let i = 0; i < n; i++) { M.phase = 'live'; giveBall(g.opps[0], 'inbound'); giveBall(g, 'steal'); } }, n);   // each steal: +25
      await H.evaluate(() => { const g = M.players.find(q => q.human === 1); g.hifz = 0; g.hifzUsed = false; });
      await steals(2); await sleep(700);
      const meter = await G.evaluate(() => { const g = M.players.find(q => q.human === 1); return g ? Math.round(g.hifz) : -1; });   // the guest sees his meter fill
      await steals(2); await H.evaluate(() => { M.cmdHook = null; });
      await G.waitForFunction(() => Game.trivia && Game.trivia.remoteView, null, { timeout: 8000 }).catch(() => {});
      const asked = await G.evaluate(() => !!(Game.trivia && Game.trivia.remoteView));
      if (asked) await G.evaluate(() => Net.guestAnswer(Game.trivia.order.indexOf(0)));
      await G.waitForFunction(() => Game.trivia && Game.trivia.pickView, null, { timeout: 8000 }).catch(() => {});
      const offered = await G.evaluate(() => !!(Game.trivia && Game.trivia.pickView));
      if (offered) await G.evaluate(() => Net.guestPick(0));
      await H.waitForFunction(() => { const g = M.players.find(q => q.human === 1); return !Game.trivia && g && noorActive(g); }, null, { timeout: 8000 }).catch(() => {});
      const onHost = await H.evaluate(() => { const g = M.players.find(q => q.human === 1); return g && noorActive(g) ? noorFxOf(g) : null; });
      await sleep(1200);
      const onGuest = await G.evaluate(() => { const g = M.players.find(q => q.human === 1); return g && noorActive(g) ? noorFxOf(g) : null; });
      log.push(`guest Noor on ${team} (guest is ${team === 'NOOR' ? 'not the hafiz' : 'the hafiz'}): guest meter ${meter}, asked ${asked}, 3 cards ${offered}, host applied ${onHost}, guest sees ${onGuest}`);
      ok = ok && meter >= 50 && asked && offered && !!onHost && onGuest === onHost;
    }
    if (noor && game === games[0]) {              // v8.6.3: the guest sees a hot spot's value (+2) and the pick-up pivot
      await H.evaluate(() => { M.cmdHook = q => { zeroCmd(q.cmd); return true; }; const g = M.players.find(q => q.human === 1), h = attackHoop(g.team);
        M.phase = 'live'; giveBall(g, 'steal'); M.possTeam = g.team; M.inb = null; g.pick = { x: g.x, z: g.z, t: M.time };
        M.hot = { x: COURT.L - (h.x + h.dir * 260), z: 350, t: 9, m: 1, v: 1 }; });
      await sleep(900);
      const host = await H.evaluate(() => ({ v: M.hot && M.hot.v, pick: !!M.players.find(q => q.human === 1).pick }));
      const guest = await G.evaluate(() => { const g = M.players.find(q => q.human === 1); return { v: M.hot && M.hot.v, m: M.hot && M.hot.m, pick: !!(g && g.pick) }; });
      await H.evaluate(() => { M.cmdHook = null; M.hot = null; for (const q of M.players) q.pick = null; });
      log.push(`hot spot +2 and pick-up: host ${JSON.stringify(host)}, guest ${JSON.stringify(guest)}`);
      ok = ok && host.v === 2 && guest.v === 2 && guest.m === 1 && host.pick && guest.pick;
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
T['online-loop'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&lat=40&jit=10&room=t', games: ['vs', 'one', 'co', 'co', 'lightning', 'horse', 'atw', 'kotc', 'sevenup', 'custom'], dropP2P: true, noor: true });
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
      return Game.rects.filter(q => q.w === 200 && q.h >= 252).map(q => ({ x: c.left + (q.x + q.w / 2) * sx, y: c.top + (q.y + q.h / 2) * sy, inside: q.x >= 0 && q.x + q.w <= W && q.y >= 0 && q.y + q.h <= H })); });
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
  // v8.6.2: phone text audit. Every screen (career save loaded, a match started) on iPhone landscape and 667x300:
  // no text past the canvas edge, nothing under MIN_CSS_PX on screen, touch buttons clear of the scoreboard, no page errors.
  // The in-match HUD is saved to docs/review/img for each size.
  for (const [dn, dev] of PHONES) {
    const tag = dn.startsWith('iPhone') ? 'iphone' : '667x300';
    const { out, errs } = await auditPhone(browser, base, dev, { shots: s => s === 'match HUD' ? path.join(ROOT, 'docs/review/img', `phone-hud-${tag}.png`) : null });
    const bad = out.flatMap(s => s.found);
    ok = ok && !bad.length && !errs.length;
    detail.push(`${dn}: ${out.length} screens, min text ${MIN_CSS_PX} CSS px: ${bad.length} problems, ${errs.length} page errors`);
    for (const f of bad.slice(0, 40)) detail.push(`   ${f.screen}: ${f.kind === 'small' ? `text ${f.css}px "${f.text}"` : f.kind === 'overflow' ? `past the edge [${f.left}, ${f.right}] of ${f.width}: "${f.text}"` : f.text}`);
    for (const e of errs) detail.push('   pageerror ' + e);
  }
  return { ok, detail };
};

// v8.6.3: hot spots (where they appear, +1/+2, the guest sees the value), CPU spot awareness, the CPU's
// game clock, and the off-the-glass rule
T['v863'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v863');
  const r = await p.evaluate(() => {
    const out = {}, half = x => x < COURT.L / 2 ? 0 : 1;
    const cpuGame = (i, len = 60) => { newMatch(TEAMS[i % 8], TEAMS[(i + 3) % 8], { humans: [], fmt: { format: 'quarters', len } }); for (let n = 0; n < 2000 && M.phase !== 'live'; n++) updateMatch(STEP); };
    // (1) where spots appear: only with a team holding the ball live, on its attacking half, off the sidelines
    { let n = 0, bad = 0, prev = null; const why = [];
      for (let g = 0; g < 3; g++) { window.__seed(300 + g); cpuGame(g, 90);
        for (let k = 0; k < 60 * 60 * 8 && M.phase !== 'over'; k++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title';
          if (M.hot && M.hot !== prev && M.hot.m) { n++; const o = ball.owner, s = M.hot;
            const okk = o && M.possTeam === o.team && half(s.x) === half(attackHoop(o.team).x) && s.z >= 60 && s.z <= COURT.D - 60 && Math.abs(s.x - COURT.L / 2) >= 20;
            if (!okk) { bad++; why.push([o ? o.team : -1, M.possTeam, Math.round(s.x), Math.round(s.z)]); } }
          prev = M.hot; } }
      out.spawn = { n, bad, why: why.slice(0, 3) }; }
    // a dead ball: no spawn until someone has it live
    { cpuGame(1); M.hot = null; M.hotCd = 0; M.phase = 'live'; ball.owner = null; ball.state = 'loose'; M.possTeam = -1; updateHot(STEP); out.deadNoSpawn = M.hot === null;
      giveBall(M.players[0], 'steal'); M.possTeam = M.players[0].team; M.inb = null; updateHot(STEP); out.liveSpawns = !!(M.hot && M.hot.m); }
    // (2) value follows the shooter: +1 on his attacking half, +2 from his own back half; mini-game spots stay +1; dunks get nothing
    { cpuGame(2); const a = M.players[0], h = attackHoop(a.team);
      M.hot = { x: h.x + h.dir * 260, z: 350, t: 9, m: 1, v: 1 }; place(a, M.hot.x, M.hot.z); const front = hotValue(a);
      M.hot = { x: COURT.L - (h.x + h.dir * 260), z: 350, t: 9, m: 1, v: 1 }; place(a, M.hot.x, M.hot.z); const backV = hotValue(a);
      M.hot = { x: COURT.L - (h.x + h.dir * 260), z: 350, t: 9 }; const mini = hotValue(a);
      const score = (hot, dunk) => { const t = a.team, s0 = M.teams[t].score; M.phase = 'live'; ball.shot = { hoop: h, team: t, pts: 2, hot, dunk, shooter: a }; onScore(h); return M.teams[t].score - s0; };
      out.value = { front, back: backV, mini, made2plus2: score(2, false), dunkNoBonus: score(2, true) };
      M.hot = { x: COURT.L - (h.x + h.dir * 260), z: 350, t: 9, m: 1, v: 1 }; giveBall(a, 'steal'); M.phase = 'live'; updateHot(STEP); out.value.label = M.hot && M.hot.v; }
    // (3) CPU on a live spot: shoots from it more often; with no spot, its choices don't change at all
    { const trial = (hot, spot) => { let shoots = 0; const plans = [];
        for (let i = 0; i < 60; i++) { window.__seed(900 + i); cpuGame(i); const a = M.players[0], h = attackHoop(a.team);
          for (const q of M.players) if (q !== a) place(q, h.x - h.dir * 300, 640);
          place(a.opps[0], h.x + h.dir * 110, 300); place(a.opps[1], h.x + h.dir * 90, 420); place(a.mate, h.x + h.dir * 300, 560);
          giveBall(a, 'steal'); M.trans = null; M.possTeam = a.team; M.inb = null; place(a, h.x + h.dir * 250, 230); a.state = 'free'; M.shotClock = 18; a.holdT = 0.6;
          M.hot = spot ? { x: a.x, z: a.z, t: 9, m: 1, v: 1 } : null; M.hotAI = null; CPU863.hot = hot;
          a.ai.thinkHandler(); plans.push(a.ai.plan.type); if (a.ai.plan.type === 'shoot') shoots++; }
        CPU863.hot = true; return { shoots, plans: plans.join(',') }; };
      const on = trial(true, true), off = trial(false, true), noSpotOn = trial(true, false), noSpotOff = trial(false, false);
      out.cpuHot = { shootsWithSpot: on.shoots, shootsIgnoringSpot: off.shoots, noSpotSame: noSpotOn.plans === noSpotOff.plans };
      // never two possessions in a row
      M.hotAI = null; let prevOn = false, twice = 0, used = 0; for (let k = 0; k < 200; k++) { M.possN = k; const u = hotUse(0); if (u && prevOn) twice++; if (u) used++; prevOn = u; }
      out.cpuHot.twiceInARow = twice; out.cpuHot.useShare = used / 200; }
    // (4) defence closes out harder on a man standing on a live spot
    { const run = hot => { window.__seed(77); cpuGame(3); const a = M.players[0], h = attackHoop(a.team), d = a.opps[0];
        giveBall(a, 'steal'); M.possTeam = a.team; M.inb = null; place(a, h.x + h.dir * 250, 250); a.state = 'free'; place(d, h.x + h.dir * 380, 250); place(a.mate, h.x + h.dir * 200, 600); place(a.opps[1], h.x + h.dir * 160, 560);
        M.hot = { x: a.x, z: a.z, t: 9, m: 1, v: 1 }; CPU863.hot = hot; M.cmdHook = q => { if (q === a) { zeroCmd(q.cmd); return true; } return false; };
        for (let k = 0; k < 30; k++) updateMatch(STEP); M.cmdHook = null; CPU863.hot = true; return Math.round(Math.min(...a.opps.map(o => dxz(o, a)))); };
      out.closeout = { withSpot: run(true), without: run(false) }; }
    // (5) game clock: trailing by 2 with 10 s left gets a shot up; tied still gets one up; leading uses the clock
    { const scen = (N, clock, diff) => { let up = 0; const at = [], used = [];
        for (let i = 0; i < N; i++) { window.__seed(4000 + i * 31); cpuGame(i);
          const t = i % 2, h = attackHoop(t), dir = h.x > COURT.L / 2 ? 1 : -1, O = M.teams[t].players, D = M.teams[1 - t].players;
          M.quarter = M.fmt.periods; M.clock = clock; M.teams[t].score = 20 + diff; M.teams[1 - t].score = 20;
          place(O[0], COURT.L / 2 - dir * 40, 300); place(O[1], COURT.L / 2 + dir * 120, 520); place(D[0], COURT.L / 2 + dir * 90, 310); place(D[1], COURT.L / 2 + dir * 220, 470);
          for (const q of M.players) { q.state = 'free'; q.pick = null; } ball.shot = null; ball.pass = null; giveBall(O[0], 'inbound'); M.phase = 'live'; M.shotClock = scReset();
          const f0 = O.reduce((a, q) => a + q.stats.fga, 0);
          for (let n = 0; n < 60 * 60 && M.phase !== 'over' && M.quarter === M.fmt.periods; n++) { const c0 = M.clock, s0 = M.shotClock; updateMatch(STEP);
            if (O.reduce((a, q) => a + q.stats.fga, 0) > f0) { if (c0 > 0) { up++; at.push(c0); used.push(scReset() - s0); } break; }
            if (M.clock <= 0 && !M.pendingEnd) break; } }
        const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
        return { N, up, clockAtShot: avg(at), shotClockUsed: avg(used) }; };
      out.late = { trail2: scen(20, 10, -2), tied: scen(12, 10, 0), lead4: scen(12, 40, 4) }; }
    // (6) off the glass only to a teammate trailing the passer
    { const glass = (ahead, human, N) => { let n = 0;
        for (let i = 0; i < N; i++) { cpuGame(4); const a = M.players[0], m = a.mate, h = attackHoop(a.team);
          a.human = human ? 0 : -1; a.cmd.turbo = true; a.turbo = 80; giveBall(a, 'steal'); M.possTeam = a.team;
          place(a, h.x + h.dir * 250, 330); place(m, h.x + h.dir * (ahead ? 120 : 330), 380);
          throwAlley(a, m); if (ball.pass && ball.pass.glass) n++; a.human = -1; }
        return n; };
      out.glass = { humanAhead: glass(true, true, 5), humanBehind: glass(false, true, 5), cpuAhead: glass(true, false, 300), cpuBehind: glass(false, false, 300) }; }
    return out;
  });
  await ctx.close();
  const v = r.value, L = r.late, G = r.glass, c = r.cpuHot;
  const ok = r.spawn.n > 10 && r.spawn.bad === 0 && r.deadNoSpawn && r.liveSpawns
    && v.front === 1 && v.back === 2 && v.mini === 1 && v.made2plus2 === 4 && v.dunkNoBonus === 2 && v.label === 2
    && c.shootsWithSpot > c.shootsIgnoringSpot && c.noSpotSame && c.twiceInARow === 0 && c.useShare > 0.2 && c.useShare <= 0.5
    && r.closeout.withSpot < r.closeout.without
    && L.trail2.up >= 19 && L.tied.up >= 11 && L.lead4.shotClockUsed >= 6   // leading late: at least 6 of the 15-second shot clock (about 2 before 8.6.3)
    && G.humanAhead === 0 && G.humanBehind === 5 && G.cpuAhead === 0 && G.cpuBehind > 10 && G.cpuBehind < 60
    && !errs.length;
  return { ok, detail: ['spots ' + JSON.stringify(r.spawn) + ` dead ball: ${r.deadNoSpawn ? 'waits' : 'SPAWNED'}, then ${r.liveSpawns ? 'spawns' : 'none'}`, 'value ' + JSON.stringify(v),
    'CPU spot awareness ' + JSON.stringify(c), 'closeout distance ' + JSON.stringify(r.closeout), 'late game ' + JSON.stringify(L), 'off the glass ' + JSON.stringify(G), ...errs] };
};

// v8.6.5: the default game is 2 halves of 2:00; practice keeps 4 quarters (v9.0.1: career follows Settings); explicit formats unchanged
T['formats'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'formats');
  const r = await p.evaluate(() => {
    const out = {};
    out.settings = [SETTINGS.format, SETTINGS.periodLen, SET_ITEMS.find(s => s.label === 'Format').get(), Lobby.defaults().format].join('/');
    // a new default game: label, halftime, end, shot clock
    window.__seed(77); newMatch(TEAMS[0], TEAMS[1], { humans: [] });
    const F = M.fmt; out.fmt = [F.format, F.periods, F.len, F.sc, F.ot].join('/');
    const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const g = cv.getContext('2d'), seen = []; const ft = g.fillText.bind(g); g.fillText = (t, ...a) => { seen.push(String(t)); return ft(t, ...a); };
    drawHUD(g); out.label = seen.includes('1ST HALF');
    let halftime = 0, minSc = 99, qMax = 1, n = 0, label2 = null;
    for (; n < 60 * 60 * 12 && M.phase !== 'over'; n++) {
      updateMatch(STEP); if (M.phase === 'live') minSc = Math.min(minSc, M.shotClock);
      if (Game.screen === 'halftime') { halftime++; Game.screen = 'title'; }
      if (M.breakText === 'HALFTIME' && M.phase === 'break') out.breakText = 'HALFTIME';
      if (M.quarter === 2 && !label2) label2 = periodLabel(2);
      qMax = Math.max(qMax, M.quarter);
    }
    out.game = { over: M.phase === 'over', halftime, quarters: qMax, label2, shotClockRan: minSc < 23, winner: M.teams[0].score !== M.teams[1].score };
    // overtime: tied at the end of the second half
    window.__seed(78); newMatch(TEAMS[2], TEAMS[3], { humans: [] }); for (let i = 0; i < 2000 && M.phase !== 'live'; i++) updateMatch(STEP);
    M.quarter = 2; M.clock = 0.5; M.teams[0].score = M.teams[1].score = 30; ball.shot = null;
    let k = 0; for (; k < 60 * 30 && M.quarter < 3; k++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; }
    for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
    out.ot = [M.quarter, periodLabel(M.quarter), Math.round(M.clock), M.fmt.sc].join('/');
    // practice keeps 4 quarters; career follows Settings (v9.0.1); explicit formats are untouched
    newMatch(TEAMS[0], TEAMS[1], { humans: [], career: true }); out.career = M.fmt.format + '/' + M.fmt.periods;
    SETTINGS.format = 'quarters'; newMatch(TEAMS[0], TEAMS[1], { humans: [], career: true }); out.careerQ = M.fmt.format + '/' + M.fmt.periods; SETTINGS.format = 'halves';
    newMatch(TEAMS[0], TEAMS[1], { humans: [], practice: 'ft' }); out.practice = M.fmt.format + '/' + M.fmt.periods;
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 60 } }); out.explicit = [M.fmt.format, M.fmt.periods, M.fmt.len, M.fmt.sc].join('/');
    SETTINGS.format = 'quarters'; newMatch(TEAMS[0], TEAMS[1], { humans: [] }); out.picked = [M.fmt.format, M.fmt.periods, periodLabel(1)].join('/'); SETTINGS.format = 'halves';
    return out;
  });
  await ctx.close();
  const g = r.game;
  const ok = r.settings === 'halves/120/2 Halves/halves' && r.fmt === 'halves/2/120/24/60' && r.label && r.breakText === 'HALFTIME'
    && g.over && g.halftime === 1 && g.label2 === '2ND HALF' && g.shotClockRan && g.winner && (g.quarters === 2 || g.quarters > 2)
    && r.ot.startsWith('3/OVERTIME/') && r.career === 'halves/2' && r.careerQ === 'quarters/4' && r.practice === 'quarters/4' && r.explicit === 'quarters/4/60/15' && r.picked === 'quarters/4/QUARTER 1' && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v8.6.5: tomahawk styles. Classic matches the recording made from 8.6.4 exactly; every style runs the same dunk
// (same length, slam on the same frame), stays finite, and lands back in the normal pose. Replays carry the pose.
T['tomahawk'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'tomahawk');
  const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/tomahawk-classic.json'), 'utf8'));
  const runs = {};
  for (const st of ['classic', 'smooth', 'power', 'float']) runs[st] = await p.evaluate(`${TOMAHAWK_REC}(${JSON.stringify(st)})`);
  const extra = await p.evaluate(() => {
    const out = { replay: {}, lab: {}, defaultStyle: SETTINGS.tomahawk };
    for (const st of ['smooth', 'power', 'float']) {                  // the replay buffer holds exactly the pose that was drawn
      SETTINGS.tomahawk = st; window.__seed(5); newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 60 } });
      for (let n = 0; n < 2000 && M.phase !== 'live'; n++) updateMatch(STEP);
      const q = M.players[0]; giveBall(q, 'steal'); place(q, attackHoop(q.team).x + attackHoop(q.team).dir * 140, 350); q.state = 'free';
      M.cmdHook = x => { zeroCmd(x.cmd); return true; }; startDunk(q, { D: 0.9 }); q.act.type = 'tomahawk';
      let same = 0, n = 0; while (q.state === 'dunk' && n < 300) { updateMatch(STEP); n++; const f = Replay.buf[Replay.buf.length - 1].ps[0]; if (JOINTS.every((k, i) => f[7 + i] === q.j[k].a)) same++; }
      M.cmdHook = null; out.replay[st] = same === n && n > 30;
    }
    SETTINGS.tomahawk = 'classic';
    // the Dunk lab: under Options → Extras; each dunk slams and he's back on the line; nothing is earned
    const ex = TITLE_MENU().find(e => e.label === 'Options').sub.find(e => e.label === 'Extras');
    out.lab.inMenu = !!ex.sub.find(e => e.label === 'Dunk lab');
    const a0 = JSON.stringify(Ach.load());
    startDunkLab(); for (let i = 0; i < 20; i++) updateMatch(STEP);
    const me = dlMe(), h = attackHoop(me.team), res = [];
    for (const st of ['classic', 'smooth', 'power', 'float']) { SETTINGS.tomahawk = st; dlDunk(); let slam = false; for (let i = 0; i < 200; i++) { updateMatch(STEP); if (me.act && me.act.slammed) slam = true; } res.push(slam && Math.round(dxz(me, h)) === 170 && ball.owner === me); }
    out.lab.dunks = res; out.lab.noAch = JSON.stringify(Ach.load()) === a0; out.lab.style = SETTINGS.tomahawk;
    setTomahawk(1); out.lab.cycled = SETTINGS.tomahawk;
    goTitle(); out.lab.off = !DL.on && FX.scale === 1; SETTINGS.tomahawk = 'classic';
    return out;
  });
  // cosmetic only: the same seeded game, box scores and all, whatever the style (a fresh page each: games carry state)
  extra.games = [];
  for (const st of ['classic', 'smooth', 'power', 'float']) {
    const q = await open(ctx, base + '/', errs, 'tomahawk-' + st);
    extra.games.push(await q.evaluate(st => { SETTINGS.tomahawk = st; window.__seed(2024); newMatch(TEAMS[1], TEAMS[4], { humans: [], fmt: { format: 'quarters', len: 30 } });
      let dunks = 0; for (let n = 0; n < 60 * 60 * 12 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; if (M.players.some(x => x.state === 'dunk' && x.act && x.act.type === 'tomahawk' && x.act.s < 0.02)) dunks++; }
      return M.teams[0].score + '-' + M.teams[1].score + ' ' + M.players.map(x => [x.stats.pts, x.stats.fgm, x.stats.fga, x.stats.blk, x.stats.dnk].join('/')).join(' ') + ' (tomahawk frames ' + dunks + ')'; }, st));
    await q.close();
  }
  extra.sameGames = extra.games.every(x => x === extra.games[0]);
  await ctx.close();
  const c = runs.classic, same = JSON.stringify(c) === JSON.stringify(ref);
  const styles = ['smooth', 'power', 'float'].map(st => { const x = runs[st]; return { st, ok: x.finite && x.dunkFrames === c.dunkFrames && x.slamAt === c.slamAt && x.backToFree && JSON.stringify(x.rest) === JSON.stringify(c.rest), differs: JSON.stringify(x.frames) !== JSON.stringify(c.frames) }; });
  const L = extra.lab;
  const ok = extra.defaultStyle === 'float' && extra.sameGames && same && styles.every(s => s.ok && s.differs) && Object.values(extra.replay).every(Boolean)
    && L.inMenu && L.dunks.every(Boolean) && L.noAch && L.cycled === 'classic' && L.off && !errs.length;
  return { ok, detail: [`classic identical to the 8.6.4 recording: ${same} (dunk ${c.dunkFrames} frames, slam on frame ${c.slamAt})`,
    'styles ' + JSON.stringify(styles), 'replay keeps the pose ' + JSON.stringify(extra.replay), 'dunk lab ' + JSON.stringify(L), 'default style ' + extra.defaultStyle, 'same seeded game in every style: ' + extra.sameGames + ' (' + extra.games[0] + ')', ...errs] };
};

// v8.6.7: inbound passes never go back to the inbounder; the turbo bar and card fade don't flicker; Sh. Saleem's
// talk limit and Leave buttons; who can earn Noor offline
T['v867'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v867');
  const r = await p.evaluate(() => {
    const out = {};
    // (1) seeded inbounds: CPU vs CPU, and one human on each side; who owns the ball first after the pass
    { const res = { passes: 0, back: 0, toReceiver: 0, other: 0, unresolved: 0, loose: 0 };
      const run = (humans, i) => {
        window.__seed(7000 + i * 7919); newMatch(TEAMS[i % 8], TEAMS[(i + 3) % 8], { humans, fmt: { format: 'quarters', len: 45 } });
        let w = null, seen = 0;
        for (let n = 0; n < 60 * 60 * 6 && M.phase !== 'over' && seen < 12; n++) {
          updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title';
          const I = M.inb;
          if (I && I.stage === 'loose' && w && w.I === I && !w.loose) { w.loose = true; res.loose++; }
          if (I && I.stage === 'pass' && (!w || w.I !== I)) { if (w && !w.done) res.unresolved++; w = { I, p: I.p, r: I.r, t: 0 }; res.passes++; seen++; }
          if (w && !w.done) { w.t += STEP;
            if (ball.owner && ball.state !== 'pass') { w.done = true; if (ball.owner === w.p) res.back++; else if (ball.owner === w.r) res.toReceiver++; else res.other++; }
            else if (w.t > 4) { w.done = true; res.unresolved++; } }
        }
      };
      for (let i = 0; i < 14; i++) run([], i);
      for (let i = 0; i < 6; i++) run([{ team: 0, slot: 0, pad: 0 }], 100 + i);
      for (let i = 0; i < 6; i++) run([{ team: 1, slot: 0, pad: 0 }], 200 + i);
      out.inbound = res; }
    // (2) 14 s of scripted sprinting with direction changes: the turbo colour and the card's fade
    { window.__seed(31); Input.touchMode = false;
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } });
      for (let n = 0; n < 2000 && M.phase !== 'live'; n++) updateMatch(STEP);
      Game.screen = 'play'; M.introT = 0;
      const me = M.players[0]; place(me, 300, 600); let t = 0;
      const legs = [[1, 0.25], [-1, -0.4], [-0.3, 1], [0.8, -0.2], [-1, 0], [0.2, -1], [1, 0.6], [-0.7, -0.5]];
      M.cmdHook = q => { if (q !== me) return false; const c = q.cmd; zeroCmd(c); const L = legs[Math.floor(t / 0.35) % legs.length]; c.mx = L[0]; c.mz = L[1];
        if (me.z > 660) c.mz = -0.6; if (me.z < 420) c.mz = 0.6; if (me.x < 120) c.mx = 1; if (me.x > 1100) c.mx = -1; c.turbo = true; return true; };
      const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const g = cv.getContext('2d');
      const _m = meter, _rr = roundRect; let col = null, alpha = null;
      meter = function (gg, x, y, w, h, f, c) { if (gg === g && w === 150 && h === 8) col = c; return _m.apply(this, arguments); };
      roundRect = function (gg, x, y, w, h) { if (gg === g && w === 224 && alpha == null) alpha = gg.globalAlpha; return _rr.apply(this, arguments); };
      const bright = c => { let m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (m) { const n = parseInt(m[1], 16); return ((n >> 16) + ((n >> 8) & 255)) / 2; } m = /rgb\((\d+),(\d+),/.exec(c || ''); return m ? (+m[1] + +m[2]) / 2 : 0; };
      let cf = 0, af = 0, pc = null, pa = null;
      const frame = () => { col = null; alpha = null; drawHUD(g); const c = bright(col) > 176 ? 1 : 0, a = alpha < 0.675 ? 1 : 0; if (pc != null && c !== pc) cf++; if (pa != null && a !== pa) af++; pc = c; pa = a; };
      for (let n = 0; n < 60 * 14; n++) { t += STEP; updateMatch(STEP); Game.rdt = STEP; me.turbo = Math.max(me.turbo, 30); me.winded = false; frame(); }
      out.turbo = { colourFlipsPerSec: +(cf / 14).toFixed(2), alphaFlipsPerSec: +(af / 14).toFixed(2) };
      // the card still fades when someone stays behind it, eased (not in one frame), and comes back
      const _hb = hudBehind; let behind = true; hudBehind = () => behind;
      const al = []; for (let n = 0; n < 60; n++) { col = null; alpha = null; drawHUD(g); al.push(alpha); }
      behind = false; for (let n = 0; n < 60; n++) { col = null; alpha = null; drawHUD(g); al.push(alpha); }
      hudBehind = _hb; meter = _m; roundRect = _rr; M.cmdHook = null;
      out.fade = { faded: +al[59].toFixed(2), eased: al.slice(0, 60).some(a => a > 0.4 && a < 0.95), back: +al[119].toFixed(2) }; }
    // (3) Sh. Saleem: 2 free lines a visit, no full-screen tap target, Another / Leave buttons, a reply ends the talk
    { C = freshCareer(); C.name = 'Abdullah'; if (!C.bracket) C.bracket = makeBracket(C.stage); C.gamesPlayed = 0;
      Game.screen = 'office'; openOffice(); const of = () => Game.office, sh = {};
      const draw = () => { Game.rects = []; const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; drawOffice(cv.getContext('2d')); return Game.rects.slice(); };
      let R = draw(); sh.leaveOffice = R.some(q => q.w >= 120 && q.h >= 30 && q.x > W / 2 && q.y > H - 80);
      officeAct(1); sh.first = of().panel === 'talk' && of().lines === 1;
      R = draw(); sh.noFullScreen = !R.some(q => q.w >= W * 0.9 && q.h >= H * 0.6);
      sh.buttons = R.filter(q => q.y > 470).length;                       // Another + Leave
      const press = () => { R = draw(); const b = R.filter(q => q.y > 470).sort((a, b) => a.x - b.x)[0]; b.fn(); };
      press(); sh.second = of().lines === 2 && of().panel === 'talk';
      R = draw(); sh.afterTwoButtons = R.filter(q => q.y > 470).length;    // only Leave
      R.filter(q => q.y > 470)[0].fn(); sh.leaveClosed = of().panel === null;
      officeAct(1); sh.done = of().line === 'Sh. Saleem has nothing more for now.' && of().lines === 2;
      of().panel = null;
      startSheikhTalk({ key: 'test', ep: () => 'x', open: () => ['One thing.'], choices: [['A', ['Reply.']], ['B', ['Reply.']]] });
      convoAdvance(); convoChoose(0); convoAdvance(); sh.replyCloses = of().panel === null;
      leaveOffice(); openOffice(); officeAct(1); sh.resetOnEnter = of().lines === 1 && of().line !== 'Sh. Saleem has nothing more for now.';
      out.sheikh = sh; }
    // (4) Noor: solo and local play keep the hafiz rule; online, any human player
    { newMatch(TEAMS[0], TEAMS[4], { humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }], fmt: { format: 'quarters', len: 120 } });
      const [a, b] = M.teams[0].players, nz = { localHafiz: canNoor(a), localOther: canNoor(b) };
      M.online = true; nz.onlineOther = canNoor(b); nz.onlineCpu = canNoor(M.teams[1].players.find(q => !q.def.huffath)); M.online = false;
      out.noor = nz; }
    return out;
  });
  await ctx.close();
  const I = r.inbound, T = r.turbo, S = r.sheikh, N = r.noor;
  const ok = I.passes >= 100 && I.back === 0 && T.colourFlipsPerSec <= 1 && T.alphaFlipsPerSec <= 1 && r.fade.faded < 0.4 && r.fade.eased && r.fade.back > 0.99
    && S.leaveOffice && S.first && S.noFullScreen && S.buttons === 2 && S.second && S.afterTwoButtons === 1 && S.leaveClosed && S.done && S.replyCloses && S.resetOnEnter
    && N.localHafiz && !N.localOther && N.onlineOther && !N.onlineCpu && !errs.length;
  return { ok, detail: ['inbounds ' + JSON.stringify(I), 'turbo ' + JSON.stringify(T) + ' card fade ' + JSON.stringify(r.fade), 'Sh. Saleem ' + JSON.stringify(S), 'Noor ' + JSON.stringify(N), ...errs] };
};

// v8.7.0: gamepads, through a scripted navigator.getGamepads(): menus (title -> Quick Play -> a game -> pause ->
// quit), moving, sprinting, shooting and passing, two pads for two players, hot-plug, trivia and a Noor card,
// the on-screen picker, rumble and its setting
T['gamepad'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { pad: true }), p = await open(ctx, base + '/', errs, 'pad');
  const out = {}, ev = f => p.evaluate(f), set = (i, s) => p.evaluate(([i, s]) => window.__padSet(i, s), [i, s]);
  const press = async (b, i = 0, ms = 90) => { await set(i, { [b]: true }); await sleep(ms); await set(i, {}); await sleep(110); };
  await ev(() => { window.__padPlug(0, true); goTitle(); Game.screen = 'title'; });
  await sleep(300);
  // menus: title -> Quick Play -> Play a game -> 1 player -> confirm until the game starts
  const path = [];
  await press('DOWN'); path.push(await ev(() => TITLE_MENU()[menuState('title').idx].label));
  for (let k = 0; k < 14 && (await ev(() => Game.screen)) !== 'play'; k++) { await press('A'); path.push(await ev(() => Game.screen)); }
  out.menu = { path: path.join(' > '), inGame: (await ev(() => Game.screen)) === 'play', dev: await ev(() => Input.lastDev) };
  await ev(() => { M.introT = 0; });
  await sleep(400);
  await press('START'); out.paused = await ev(() => Game.paused);
  for (let k = 0; k < 6 && !(await ev(() => /Quit|Leave/.test(pauseItems()[Game.idx % pauseItems().length][0]))); k++) await press('DOWN');
  await press('A'); out.quit = await ev(() => Game.screen === 'title' && !Game.paused);
  // gameplay: one human; the stick moves him (analog), B sprints, A shoots, X passes
  await ev(() => { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } }); Game.screen = 'play'; Game.paused = false; M.introT = 0; });
  await p.waitForFunction(() => M.phase === 'live', null, { timeout: 15000 }).catch(() => {});
  await ev(() => { const me = M.players.find(q => q.human === 0); for (const q of M.players) if (q !== me) place(q, 200, 640); M.phase = 'live'; ball.shot = null; giveBall(me, 'inbound'); place(me, 500, 350); me.state = 'free'; window.__x0 = me.x; me.turbo = 100; });
  await set(0, { axes: [0.5, 0] }); await sleep(500);
  out.walk = await ev(() => { const me = M.players.find(q => q.human === 0); return { moved: Math.round(me.x - window.__x0), speed: Math.round(Math.hypot(me.vx, me.vz)), turbo: me.cmd.turbo }; });
  await set(0, { axes: [1, 0], B: true }); await sleep(500);
  out.sprint = await ev(() => { const me = M.players.find(q => q.human === 0); return { turbo: me.cmd.turbo, speed: Math.round(Math.hypot(me.vx, me.vz)), drained: me.turbo < 100 }; });
  await set(0, {}); await sleep(300);
  await ev(() => { const me = M.players.find(q => q.human === 0); place(me, attackHoop(me.team).x + attackHoop(me.team).dir * 260, 350); me.state = 'free'; giveBall(me, 'inbound'); window.__fga = me.stats.fga; });
  await set(0, { A: true }); await sleep(380); await set(0, {}); await sleep(700);
  out.shot = await ev(() => { const me = M.players.find(q => q.human === 0); return me.stats.fga > window.__fga; });
  await ev(() => { const me = M.players.find(q => q.human === 0); ball.shot = null; M.phase = 'live'; place(me, 600, 350); place(me.mate, 760, 420); me.state = 'free'; giveBall(me, 'inbound'); window.__passed = false; });
  await press('X');
  await sleep(150); out.pass = await ev(() => { const me = M.players.find(q => q.human === 0); return ball.owner === me.mate || (ball.state === 'pass' && ball.pass && ball.pass.from === me); });
  // two pads, two players (co-op)
  await ev(() => { window.__padPlug(1, true); newMatch(TEAMS[2], TEAMS[3], { humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }], fmt: { format: 'quarters', len: 120 } }); Game.screen = 'play'; Game.paused = false; M.introT = 0; });
  await p.waitForFunction(() => M.phase === 'live', null, { timeout: 15000 }).catch(() => {});
  await ev(() => { const [a, b] = M.teams[0].players; for (const q of M.players) { q.state = 'free'; } place(a, 400, 250); place(b, 400, 500); window.__ab = [a.x, b.x]; });
  await set(1, { axes: [1, 0] }); await sleep(450);
  out.two = await ev(() => { const [a, b] = M.teams[0].players; return { p1: Math.round(a.x - window.__ab[0]), p2: Math.round(b.x - window.__ab[1]) }; });
  await set(1, {});
  // hot-plug mid-match: pull pad 2 out and back in, pull pad 1 out and back in
  await ev(() => window.__padPlug(1, false)); await sleep(250); await ev(() => window.__padPlug(1, true)); await sleep(250);
  await ev(() => window.__padPlug(0, false)); await sleep(250); await ev(() => window.__padPlug(0, true)); await sleep(250);
  out.plug = await ev(() => ({ order: Pad.order.length, screen: Game.screen }));
  await ev(() => window.__padPlug(1, false));
  // trivia and a Noor card, with the pad
  await ev(() => { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } }); Game.screen = 'play'; Game.paused = false; M.introT = 0; });
  await p.waitForFunction(() => M.phase === 'live', null, { timeout: 15000 }).catch(() => {});
  await ev(() => { const me = M.players.find(q => q.human === 0); openTrivia(me); Game.trivia.sel = Game.trivia.order.indexOf(0); });
  await sleep(200);
  const tv0 = await ev(() => ({ open: !!Game.trivia, sel: Game.trivia && Game.trivia.sel, right: Game.trivia && Game.trivia.order.indexOf(0) }));
  await press('A');
  await p.waitForFunction(() => Game.trivia && Game.trivia.pick, null, { timeout: 6000 }).catch(() => {});
  await press('RIGHT'); await press('A');
  await p.waitForFunction(() => !Game.trivia, null, { timeout: 6000 }).catch(() => {});
  out.trivia = { asked: tv0.open, noor: await ev(() => { const me = M.players.find(q => q.human === 0); return noorActive(me) ? noorFxOf(me) : null; }) };
  // the on-screen picker on a text-entry screen: it opens by itself, moves, taps, B leaves
  await ev(() => { Net.typed = ''; Game.screen = 'joincode'; });
  await sleep(250); await press('RIGHT'); await press('A');
  out.picker = await ev(() => ({ on: Pad.cursor.on, typed: Net.typed }));
  await press('B'); out.pickerLeave = await ev(() => Game.screen);
  // rumble on a dunk, and not with the setting off
  const dunk = () => ev(() => { goTitle(); newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } }); for (let n = 0; n < 2000 && M.phase !== 'live'; n++) updateMatch(STEP);
    const me = M.players.find(q => q.human === 0), h = attackHoop(me.team); giveBall(me, 'steal'); place(me, h.x + h.dir * 120, h.z); startDunk(me, {}); M.cmdHook = q => { zeroCmd(q.cmd); return true; };
    window.__rumble.length = 0; for (let n = 0; n < 120; n++) updateMatch(STEP); M.cmdHook = null; return window.__rumble.length; });
  out.rumble = await dunk();
  await ev(() => { SETTINGS.vibration = false; }); out.rumbleOff = await dunk(); await ev(() => { SETTINGS.vibration = true; });
  out.setting = await ev(() => setGroupItems(SET_GROUPS.findIndex(g => g.name === 'Sound & display')).some(s => s.label === 'Controller vibration'));
  // keyboard still works with a pad connected
  await ev(() => { goTitle(); Game.screen = 'title'; const m = menuState('title'); m.sub = -1; m.path = []; m.idx = 0; });
  await p.keyboard.press('ArrowDown'); await sleep(150);
  out.keyboard = await ev(() => menuState('title').idx === 1 && Input.lastDev === 'kb');
  await ctx.close();
  const ok = out.menu.inGame && out.menu.dev === 'pad' && out.paused && out.quit
    && out.walk.moved > 30 && !out.walk.turbo && out.sprint.turbo && out.sprint.drained && out.sprint.speed > out.walk.speed && out.shot && out.pass
    && out.two.p2 > 30 && Math.abs(out.two.p1) < 10 && out.plug.order === 2 && out.trivia.asked && !!out.trivia.noor
    && out.picker.on && out.picker.typed.length === 1 && out.pickerLeave !== 'joincode' && out.rumble > 0 && out.rumbleOff === 0 && out.setting && out.keyboard && !errs.length;
  return { ok, detail: [JSON.stringify(out), ...errs] };
};

// v8.7.1: share a clip as a video. A seeded CPU game's best play, recorded with MediaRecorder: a non-empty video Blob,
// 4-8 s long, no page errors, the match state untouched; a live match refuses; without MediaRecorder it falls back
// to the still image
T['clip'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'clip');
  const state = () => p.evaluate(() => JSON.stringify({ s: M.teams.map(t => [t.score, t.qs]), p: M.players.map(q => [q.x, q.y, q.z, q.state, q.stats, JOINTS.map(k => q.j[k].a)]),
    b: [ball.x, ball.y, ball.z, ball.state, ball.owner ? M.players.indexOf(ball.owner) : -1], c: [cam.x, cam.fy, cam.zoom], q: M.quarter, cl: M.clock, ph: M.phase, t: M.time, h: M.highlights.length, venue: !!VL, court: !!courtCv }));
  const r = {};
  r.live = await p.evaluate(() => { window.__seed(42); newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 30 } }); Game.screen = 'play';
    for (let n = 0; n < 60 * 60 && !M.highlights.length; n++) updateMatch(STEP);
    ShareCard.clips = M.highlights.slice(); ShareCard.index = 0; const refused = !startClipVideo(); Game.screen = 'title'; return refused && ClipVid.state !== 'rec'; });
  await p.evaluate(() => { for (let n = 0; n < 60 * 60 * 10 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; } Game.screen = 'final'; openClipShare(M.highlights); });
  const before = await state();
  r.types = await p.evaluate(() => CLIP_TYPES.filter(t => MediaRecorder.isTypeSupported(t)));
  r.started = await p.evaluate(() => startClipVideo());
  await p.waitForFunction(() => ClipVid.state === 'done' || ClipVid.state === 'fallback', null, { timeout: 30000 }).catch(() => {});
  Object.assign(r, await p.evaluate(async () => {
    const out = { state: ClipVid.state, type: ClipVid.blob && ClipVid.blob.type, size: ClipVid.blob ? ClipVid.blob.size : 0, name: ClipVid.name };
    if (ClipVid.url) { const v = document.createElement('video'); v.muted = true; v.src = ClipVid.url; await new Promise(r => { v.onloadedmetadata = r; setTimeout(r, 5000); });
      let d = v.duration; if (!isFinite(d)) { v.currentTime = 1e9; await new Promise(r => { v.ontimeupdate = r; setTimeout(r, 5000); }); d = v.duration; } out.duration = +(+d).toFixed(2); }
    return out; }));
  r.untouched = (await state()) === before;
  await p.evaluate(() => cancelClipVideo()); r.back = await p.evaluate(() => Game.screen);
  await ctx.close();
  // no MediaRecorder: the still image, no errors
  const e2 = [], c2 = await newContext(browser, { seed: true }); await c2.addInitScript('delete window.MediaRecorder;');
  const q = await open(c2, base + '/', e2, 'clip-fallback');
  r.fallback = await q.evaluate(() => { window.__seed(42); newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 30 } });
    for (let n = 0; n < 60 * 60 * 10 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; } Game.screen = 'final'; openClipShare(M.highlights);
    const started = startClipVideo(); return { started, state: ClipVid.state, card: !!ShareCard.card, screen: Game.screen, msg: ClipVid.msg }; });
  await sleep(300); await c2.close(); errs.push(...e2);
  const ok = r.live && r.started && r.state === 'done' && /^video\//.test(r.type || '') && r.size > 10000 && r.duration >= 4 && r.duration <= 8 && r.untouched && r.back === 'shareclip'
    && !r.fallback.started && r.fallback.state === 'fallback' && r.fallback.card && r.fallback.screen === 'clipvideo' && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v9.0: the career calendar (model, schedules, Continue, saves, the setting)
T['calendar'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'calendar');
  await p.evaluate(CAL_HELPERS);
  const r = await p.evaluate(() => {
    window.__seed(9); const o = {};
    // ---- model
    o.lengths = CAL_LEN.join(',') === '30,29,30,29,30,29,30,29,30,29,30,29' && CAL_YEAR === 354 && CAL_MONTHS.length === 12 && CAL_MONTHS[8] === 'Ramadan';
    let rt = true, wd = true, ram = true, fri = true, eids = [];
    for (let d = 0; d < 3 * 354; d++) {
      const t = calDate(d); if (calDayOf(t.y, t.m, t.day) !== d || t.day < 1 || t.day > CAL_LEN[t.m]) rt = false;
      if (calWd(d + 1) !== (calWd(d) + 1) % 7 || calWd(d + 7) !== calWd(d)) wd = false;
      if (calIsRamadan(d) !== (t.m === 8)) ram = false;
      const h = calHoliday(d); if (h) eids.push(t.y + ':' + t.m + ':' + t.day + ':' + h.name);
    }
    o.roundTrip = rt; o.weekdays = wd && calWd(0) === 0 && CAL_WEEKDAYS[calWd(5)] === 'Friday'; o.ramadanMonth9 = ram;
    o.eids = eids.join('|') === '1:9:1:Eid al-Fitr|1:11:10:Eid al-Adha|2:9:1:Eid al-Fitr|2:11:10:Eid al-Adha|3:9:1:Eid al-Fitr|3:11:10:Eid al-Adha';
    o.rollover = JSON.stringify(calDate(353)) === JSON.stringify({ y: 1, m: 11, day: 29, wd: calWd(353) }) && calDate(354).y === 2 && calDate(354).m === 0 && calDate(354).day === 1;
    window.__calFresh();
    for (let d = 0; d < 354; d++) { const D = calDay(d); if (D.fri !== (calWd(d) === 5) || (D.fri && !D.games.length && !D.holiday && D.type !== 'jumuah') || (D.overlay === 'ramadan') !== calIsRamadan(d)) fri = false; }
    o.jumuahFridays = fri;
    // ---- schedules: every slot a day, in order, Wed/Sat only (final Saturday), never a Friday or an Eid
    let sch = true;
    for (let st = 0; st < 4; st++) for (let S = 0; S < 400; S += 3) for (const fmt of ['pool', 'ko']) {
      const s = buildSchedule(st, S, { fmt }), n = fmt === 'pool' ? 5 : 3;
      if (s.days.length !== n || s.keys.length !== n) sch = false;
      s.days.forEach((d, i) => { const w = calWd(d); if ((w !== 3 && w !== 6) || calHoliday(d) || (i && d <= s.days[i - 1]) || d < S) sch = false; });
      if (calWd(s.days[n - 1]) !== 6) sch = false;
    }
    o.schedules = sch;
    const run = calTypicalRun(); o.breaks = run.every((s, i) => !i || s.days[0] - run[i - 1].days[4] >= CAL_CFG.brk + 1);
    o.typical = run.map(s => STAGES[s.st].name + ' m' + (calDate(s.days[0]).m + 1) + '-m' + (calDate(s.days[4]).m + 1));
    o.typicalOk = o.typical.join(',') === 'Local m3-m5,State m6-m8,National m9-m11,World m12-m1' && calIsRamadan(run[2].days[0]);
    // ---- Continue: skips empty days, stops on Jumu'ah, runs the pregame flow on a game day
    window.__calFresh(); const d0 = C.cal.d, D0 = calDay(d0);
    const items = HUB_MENU(); o.hubItems = items.map(e => e.label + (e.badge ? '[' + e.badge + ']' : '')).join(',');
    calContinue(); const d1 = C.cal.d, t1 = calDay(d1).type, s1 = Game.screen;
    if (Game.screen === 'world') { Game.worldSuppress = true; careerHub(); } calContinue(); const d2 = C.cal.d, s2 = Game.screen;
    o.cont = { d0: calText(d0), d1: calText(d1), t1, s1, d2: calText(d2), s2 };
    o.continueOk = d1 > d0 + 1 && t1 === 'jumuah' && (s1 === 'world' && World.scene === 'home') &&   // v9.2: a non-game day starts at home
      calDay(d2).type === 'game' && d2 === calGameDay() && ['scout', 'story'].includes(s2);
    careerHub(); calContinue(); o.noSkip = C.cal.d === d2;   // a game day isn't passed by Continue...
    careerHub(); calNextDay(); o.noSkipNext = C.cal.d === d2 && ['scout', 'story'].includes(Game.screen);   // ...or by Next day
    // ---- a whole stage: one game per day, on its day, Wed/Sat; then a break; the next stage's days
    window.__calFresh(); window.__calPlayTo(1, 0);
    const L = C.cal.log; o.logDays = L.map(x => CAL_WD[calWd(x.d)] + ' ' + calDate(x.d).day);
    o.stageGames = L.length === 5 && new Set(L.map(x => x.d)).size === 5 && L.every(x => [3, 6].includes(calWd(x.d))) && L.every((x, i) => !i || x.d > L[i - 1].d);
    o.afterFinal = C.cal.d === L[4].d + 1 && C.cal.sched.st === 1 && C.cal.sched.days[0] >= L[4].d + 1 + CAL_CFG.brk && !C.cal.sched.entry;
    // ---- out in the group stage: the re-entry is scheduled after the break, and played on its day
    window.__calFresh();
    const lose = () => { const gd = calGameDay(); calSetDay(gd); startCareerMatch(); M.teams[0].score = 10; M.teams[1].score = 30; M.winner = 1; M.phase = 'over'; careerAfterMatch(); return gd; };
    lose(); lose(); const last = lose();
    const rs = C.cal.sched; o.out = { out: !!C.bracket.out, entry: rs.entry, gap: rs.days[0] - last, today: C.cal.d - last };
    let k = 0; careerHub(); while ((Game.screen === 'hub' || Game.screen === 'world') && k++ < 20) { if (Game.screen === 'world') { Game.worldSuppress = true; careerHub(); } calContinue(); }
    o.retry = C.bracket.out === false && C.retries === 1 && C.cal.d === rs.days[0] && !C.cal.sched.entry && calSlot() === 0 && ['scout', 'story'].includes(Game.screen);
    o.outOk = o.out.out && o.out.entry && o.out.gap >= CAL_CFG.brk + 1 && o.out.today === 1;
    // ---- counters for "activities done today" (unlimited; recorded)
    window.__calFresh(); C.bp = 5000; buyStat(0); buyStat(1); const lv = C.cal.done.levels; calNextDay(); o.counters = lv === 2 && !C.cal.done.levels;
    // ---- saves
    // v5 era: no sv, a knockout bracket after its quarterfinal, State stage
    const v5 = { v: 1, seed: 777, name: 'Old', look: freshCareer().look, stage: 1, bp: 50, hb: 80, lv: { sht: 5, spd: 5, dnk: 4, def: 4, sta: 4, pas: 4 }, trophies: [0], wins: 5, losses: 0, up: {}, seen: { intro: true, stage0: true, stage1: true }, done: false, divChamps: {},
      bracket: { round: 1, out: false, rounds: [[{ a: 0, b: 5, sa: 30, sb: 22, w: 0 }, { a: 2, b: 3, sa: 20, sb: 25, w: 3 }, { a: 4, b: 6, sa: 28, sb: 18, w: 4 }, { a: 7, b: 1, sa: 21, sb: 30, w: 1 }], [{ a: 0, b: 3, sa: null, sb: null, w: null }, { a: 4, b: 1, sa: null, sb: null, w: null }]] } };
    localStorage.setItem(SAVE_SLOT, JSON.stringify(v5)); C = null; loadCareer(SAVE_SLOT);
    const c5 = C.cal; o.v5 = { sv: C.sv, d: calText(c5.d) + ' Y' + calDate(c5.d).y, fmt: c5.sched.fmt, slot: calSlot(), next: calText(calGameDay()), log: c5.log.map(x => calText(x.d) + ' ' + (x.w ? 'W' : 'L') + ' ' + x.r) };
    o.v5ok = C.sv === 4 && c5.sched.fmt === 'ko' && calSlot() === 1 && c5.log.length === 1 && c5.log[0].w === 1 && c5.log[0].d < c5.d && calGameDay() >= c5.d && calDate(c5.d).m >= 4 && calDate(c5.d).m <= 7;
    window.__calWin(); o.v5play = C.cal.log.length === 2 && C.bracket.round === 2 && calSlot() === 2 && calGameDay() > C.cal.log[1].d;
    // v6 era: sv 3, group stage in progress (National, after group game 1)
    window.__calFresh(); window.__calPlayTo(2, 1); delete C.cal; C.sv = 3; saveCareer(SAVE_SLOT); C = null; loadCareer(SAVE_SLOT);
    o.v6 = { d: calText(C.cal.d), slot: calSlot(), next: calText(calGameDay()), log: C.cal.log.map(x => calText(x.d) + ' ' + x.r) };
    o.v6ok = C.sv === 4 && C.cal.sched.fmt === 'pool' && calSlot() === 1 && C.cal.log.length === 1 && C.cal.log[0].d < C.cal.d && calGameDay() >= C.cal.d && calIsRamadan(calGameDay()) === calIsRamadan(calTypicalRun()[2].days[1]);
    // finished career (World champions): the next thing is the Cup again after a break
    window.__calFresh(); window.__calPlayTo(3, 4); window.__calWin(); const doneOk1 = C.done && C.bracket.champ;
    delete C.cal; C.sv = 3; saveCareer(SAVE_SLOT); C = null; loadCareer(SAVE_SLOT);
    o.doneOk = doneOk1 && C.cal.sched.entry && C.cal.sched.st === 3 && calGameDay() > C.cal.d && HUB_MENU().some(e => e.label === 'Continue') && HUB_MENU()[0].label.startsWith('Start Season');
    // season over (lost a semifinal): no schedule until the new season, which starts after a break
    window.__calFresh(); window.__calPlayTo(0, 3); const sf = calGameDay(); calSetDay(sf); startCareerMatch(); M.teams[0].score = 10; M.teams[1].score = 30; M.winner = 1; M.phase = 'over'; careerAfterMatch();
    const so = !!C.seasonOver && C.cal.sched === null && C.cal.d === sf + 1;
    delete C.cal; saveCareer(SAVE_SLOT); C = null; loadCareer(SAVE_SLOT);
    const soLoad = !!C.seasonOver && C.cal.sched === null && typeof C.cal.d === 'number';
    const dBefore = C.cal.d; startNewSeason(false);
    o.seasonOver = so && soLoad && C.season === 2 && C.cal.sched.st === 0 && C.cal.sched.days[0] > dBefore && calGameDay() === C.cal.sched.days[0];
    // the current format round-trips
    window.__calFresh(); window.__calPlayTo(0, 2); saveCareer(SAVE_SLOT); const before = JSON.stringify(C.cal); C = null; loadCareer(SAVE_SLOT); o.roundTripSave = JSON.stringify(C.cal) === before;
    // ---- out of step (the dev panel moves the stage, review mode changes the season): the next game is re-anchored on today
    window.__calState('game'); const dA = C.cal.d; C.season = 2; calEnsure(); const sameDay = calGameDay() === dA && calDay(dA).type === 'game';
    C.stage = 2; C.bracket = makeBracket(2); calEnsure(); const gap = calGameDay() - C.cal.d;
    o.reanchor = sameDay && C.cal.sched.st === 2 && gap >= 0 && gap <= 6 && C.cal.d === dA;
    // ---- Settings → Game → Career calendar Off: the old hub, no strip; the date still moves to the game's day
    o.setting = setGroupItems(0).some(s => s.label === 'Career calendar');
    window.__calFresh(); SETTINGS.calendar = false; const off = HUB_MENU().map(e => e.label);
    Game.screen = 'hub'; CalUI.n = 0; render(ctx); const stripOff = CalUI.n;
    const dOff = C.cal.d; hubSelect(0);
    o.off = off[0] === 'Play next game' && off.includes('Bracket') && !off.includes('Schedule') && stripOff === 0 && C.cal.d === calGameDay() && C.cal.d > dOff;
    SETTINGS.calendar = true; careerHub(); CalUI.n = 0; render(ctx); o.stripOn = CalUI.n === 4;
    return o;
  });
  // render the month view on a few months (drawing errors)
  await p.evaluate(() => { window.__calState('ramadan'); openCalendar(); }); await sleep(300);
  for (const k of ['KeyE', 'KeyE', 'ArrowRight', 'ArrowDown', 'KeyQ', 'Escape']) { await p.keyboard.press(k); await sleep(120); }
  const back = await p.evaluate(() => Game.screen);
  await ctx.close();
  const ok = Object.entries(r).every(([k, v]) => typeof v !== 'boolean' || v) && back === 'hub' && !errs.length;
  return { ok, detail: [...Object.entries(r).map(([k, v]) => k + ': ' + JSON.stringify(v)), 'month view keys, Esc back to: ' + back, ...errs] };
};

// v9.0: a full career by bot, Continue only
T['career-run'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'career-run');
  const r = await p.evaluate(() => {
    window.__seed(90);
    const out = { games: [], back: 0, strip: [], screens: {}, steps: 0 };
    C = freshCareer(); C.name = 'Bot'; Game.creator = { idx: 0, isNew: true }; setupPractice('free'); Game.screen = 'creator';
    creatorDone(); out.intro = Game.screen; introSkip(); out.hub = Game.screen;
    let lastD = C.cal.d, season2 = 0;
    const playGame = () => {                                                   // the match itself (after any pregame dialogue)
      for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; }
      if (M.teams[0].score <= M.teams[1].score) M.teams[0].score = M.teams[1].score + 2;   // the human's team is forced to win
      M.winner = 0; M.phase = 'over';
      const d = C.cal.d, st = C.stage; careerAfterMatch();
      out.games.push({ s: C.season, st, d, wd: CAL_WD[calWd(d)], date: calText(d) + ' Y' + calDate(d).y });
    };
    try { for (let step = 0; step < 900; step++) {
      out.steps = step; const s = Game.screen; out.screens[s] = (out.screens[s] || 0) + 1;
      if (C.cal.d < lastD) out.back++; lastD = C.cal.d;
      if (s === 'hub') {
        CalUI.n = 0; render(ctx); out.strip.push(CalUI.n);
        if (C.season === 2 && out.games.some(g => g.s === 2)) break;              // into the new season: done
        const items = HUB_MENU();
        if (C.done && C.season === 1) { const ns = items.find(e => /^Start Season/.test(e.label)); ns.act(); continue; }
        const c = items.find(e => e.label === 'Continue'); if (!c) { out.noContinue = items.map(e => e.label); break; }
        c.act();
      } else if (s === 'story') Game.story.then();
      else if (s === 'scout') Game.screen = 'pregame';
      else if (s === 'pregame') startCareerMatch();                               // may open the niyyah dialogue first
      else if (s === 'play' && M.career) playGame();
      else if (s === 'postgame') postgameContinue();
      else if (s === 'csummary') summaryClose();
      else if (s === 'newseason') { startNewSeason(false); season2++; }
      else careerHub();
    } } catch (e) { out.err = String(e && e.stack || e).slice(0, 300) + ' | screen ' + Game.screen + ' stage ' + C.stage + ' M.careerStage ' + M.careerStage + ' games ' + out.games.length; }
    out.done1 = C.season === 2; out.d = calText(C.cal.d) + ' Y' + calDate(C.cal.d).y; out.trophies = C.titles.filter(t => t.s === 1).length;
    out.byStage = [0, 1, 2, 3].map(st => { const G = out.games.filter(g => g.s === 1 && g.st === st); return G.length ? STAGES[st].name + ': ' + G[0].date + ' .. ' + G[G.length - 1].date + ' (' + G.length + ')' : ''; });
    return out;
  });
  await ctx.close();
  const s1 = r.games.filter(g => g.s === 1), s2 = r.games.filter(g => g.s === 2);
  const ok = r.intro === 'introout' && r.hub === 'hub' && s1.length === 20 && r.trophies === 4 && s2.length >= 1 && r.back === 0
    && r.strip.length > 20 && r.strip.every(n => n === 4) && r.games.every(g => g.wd === 'Wed' || g.wd === 'Sat') && new Set(r.games.map(g => g.d)).size === r.games.length && !r.noContinue && !r.err && !errs.length;
  return { ok, detail: [r.err || '', `games: season 1 ${s1.length}, season 2 ${s2.length}; titles ${r.trophies}; hub visits ${r.strip.length}, strip always 4: ${r.strip.every(n => n === 4)}; date went back: ${r.back}`,
    ...r.byStage, 'season 2 first game: ' + (s2[0] && s2[0].date), 'last day: ' + r.d, 'screens: ' + JSON.stringify(r.screens), r.noContinue ? 'no Continue: ' + r.noContinue : '', ...errs].filter(Boolean) };
};

// v9.0.1: career games follow the Settings format (2 halves of 2:00 by default)
T['career-format'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'career-format');
  await p.evaluate(CAL_HELPERS);
  const r = await p.evaluate(() => {
    const play = (format, seed) => {
      window.__seed(seed); SETTINGS.format = format; window.__calFresh();
      startCareerMatch(); for (let i = 0; i < 6 && Game.screen === 'story'; i++) Game.story.then();
      const o = { screen: Game.screen, career: M.career, fmt: M.fmt.format + '/' + M.fmt.periods + '/' + M.fmt.len };
      const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const g = cv.getContext('2d'), seen = [], ft = g.fillText.bind(g); g.fillText = (t, ...a) => { seen.push(String(t)); return ft(t, ...a); };
      drawHUD(g); o.label = seen.find(t => /HALF|QUARTER|FIRST TO/.test(t)) || null;
      const me = M.players.find(q => q.human === 0); if (format === 'first21') me.human = -1;   // no shot clock: an idle human would hold the ball, so the CPU plays him
      let halftime = 0, qMax = 1, labels = new Set();
      for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') { halftime++; Game.screen = 'play'; resumeFromHalf(); } qMax = Math.max(qMax, M.quarter); labels.add(periodLabel(M.quarter)); }
      o.over = M.phase === 'over'; o.halftime = halftime; o.periods = qMax; o.labels = [...labels].join(',');
      o.score = M.teams[0].score + '-' + M.teams[1].score;
      // rewards don't depend on the format: the same result scores the same under the other format
      me.human = 0;
      const won = M.winner === 0, ctxR = { round: 0, rival: false, salah: false, stage: 0, roundName: 'Group game 1' }, a = JSON.stringify(careerRewards(won, false, ctxR));
      const keep = M.fmt; M.fmt = makeFmt({ fmt: { format: format === 'halves' ? 'quarters' : 'halves', len: 120 } }); const b = JSON.stringify(careerRewards(won, false, ctxR)); M.fmt = keep;
      o.sameRewards = a === b;
      const g0 = C.gamesPlayed; careerAfterMatch(); o.recorded = C.gamesPlayed === g0 + 1 && Game.screen === 'postgame' && !!Game.post && Game.post.rw.bpTotal > 0;
      return o;
    };
    const out = { halves: play('halves', 31), quarters: play('quarters', 32), first21: play('first21', 33) };
    SETTINGS.format = 'halves';
    return out;
  });
  await ctx.close();
  const H = r.halves, Q = r.quarters, F = r.first21;
  const ok = H.screen === 'play' && H.career && H.fmt === 'halves/2/120' && H.label === '1ST HALF' && H.halftime === 1 && H.over && H.periods >= 2 && H.labels.startsWith('1ST HALF,2ND HALF') && H.sameRewards && H.recorded
    && Q.fmt === 'quarters/4/120' && Q.label === 'QUARTER 1' && Q.halftime === 1 && Q.over && Q.periods >= 4 && Q.sameRewards && Q.recorded
    && F.fmt.startsWith('first21/1') && F.over && F.halftime === 0 && F.recorded && !errs.length;
  return { ok, detail: Object.entries(r).map(([k, v]) => k + ': ' + JSON.stringify(v)).concat(errs) };
};

// v9.2: the neighbourhood: the day's flow, the store, talking, look items, saves, the setting
T['world-flow'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'world-flow');
  await p.evaluate(WORLD_HELPERS);
  const r = await p.evaluate(() => {
    window.__seed(92); const o = {}, step = n => { for (let i = 0; i < n; i++) careerUpdate(1 / 60); for (let i = 0; i < 120 && Game.screen === 'world' && World.fadeDir; i++) careerUpdate(1 / 60); }, press = k => { Input.pressed[k] = true; careerUpdate(1 / 60); Input.pressed = {}; };
    const where = () => Game.screen === 'world' ? World.scene + '/' + worldLoc().tod : Game.screen;
    const portal = id => World.def.portals.find(q => q.id === id), use = id => World.def.uses.find(q => q.id === id);
    // a free day starts at home in the morning, with Go out and Skip the day on screen
    window.__worldDay(); worldStartDay(); step(30);
    o.start = where() === 'home/0' && worldButtons().map(b => b.label).join() === 'Skip the day,Go out';
    // G goes out; the store (once a day) moves the time on when you leave it
    press('KeyG'); step(30); o.out = where() === 'street/0';
    portal('store').act(); step(30); o.store = where() === 'store/0' && !!worldLoc().vis.store && C.cal.done.visit_store === 1;
    portal('out').act(); step(30); o.afterStore = where() === 'street/1' && worldStoreOk() === 'You went to the store today';
    // the masjid: the door goes into the hub (inside the masjid); Go outside comes back out, an hour on
    portal('masjid').act(); step(30); portal('door').act(); step(30);
    const hub = HUB_MENU().map(e => e.label); o.hub = Game.screen === 'hub' && hub[0] === 'Continue' && hub[1] === 'Go outside';
    hub && HUB_MENU().find(e => e.label === 'Go outside').act(); step(30);
    o.outside = where() === 'masjidfront/2' && worldMasjidOk() !== true;
    // home at dusk: night; at night only home is open
    portal('street').act(); step(30); portal('home').act(); step(30);
    o.night = where() === 'home/3' && worldStoreOk() !== true && worldNightOk() !== true;
    // End the day at the bed: tomorrow, home, morning, nothing visited
    const d0 = C.cal.d; use('bed').act(); step(30);
    o.endDay = C.cal.d === d0 + 1 && where() === 'home/0' && !worldLoc().vis.store;
    // Skip the day: jumps like Continue (a game day goes to the pregame)
    let k = 0; while (Game.screen === 'world' && k++ < 12) { press('KeyN'); step(30); }
    o.skipToGame = ['scout', 'story', 'pregame'].includes(Game.screen) && calGameToday();
    // after the game: the next morning at home
    careerHub(); for (let i = 0; i < 6 && Game.screen === 'story'; i++) Game.story.then();
    if (Game.screen === 'hub') calContinue();
    for (let i = 0; i < 6 && Game.screen === 'story'; i++) Game.story.then();
    if (Game.screen === 'scout') Game.screen = 'pregame';
    if (Game.screen === 'pregame') startCareerMatch(); for (let i = 0; i < 6 && Game.screen === 'story'; i++) Game.story.then();
    M.teams[0].score = 30; M.teams[1].score = 20; M.winner = 0; M.phase = 'over'; careerAfterMatch(); postgameContinue();
    for (let i = 0; i < 12 && Game.screen === 'story'; i++) Game.story.then();
    o.wake = where() === 'home/0' && !calGameToday();
    // Jumu'ah: the way to the masjid is highlighted
    let fri = C.cal.d; while (calWd(fri) !== 5) fri++; calSetDay(fri); worldStartDay(); step(20);
    o.jumuah = World.bannerT > 0 && /Jumu/.test(World.banner); press('KeyG'); step(30); o.beacon = !!portal('masjid').beacon();
    // talking: short, leavable, a different set the next day
    worldEnter('street', { x: 1000, d: 0.32, face: -1 }, { noFade: true }); step(2);
    const yusuf = World.npcs.find(q => q.id === 'yusuf'); worldTalkTo(yusuf); const L1 = JSON.stringify(World.talk.lines);
    o.talkShort = World.talk.lines.length <= 2; press('Escape'); o.leftTalk = !World.talk && Game.screen === 'world';
    worldTalkTo(yusuf); const nl = World.talk.lines.length; for (let i = 0; i < nl; i++) { step(20); press('KeyE'); } press('KeyE'); step(5); o.talkEnds = !World.talk;   // the extra press doesn't reopen it
    calSetDay(C.cal.d + 1); worldEnter('street', { x: 1000, d: 0.32, face: -1 }, { noFade: true }); worldTalkTo(World.npcs.find(q => q.id === 'yusuf'));
    o.nextDayDiffers = JSON.stringify(World.talk.lines) !== L1; worldLeaveTalk();
    // the store: cosmetic only, Halal Bucks, owned and worn shown; creator rows only offer what you own
    worldEnter('store', 'door', { noFade: true }); worldOpenShop(true);
    const lv = JSON.stringify(C.lv), it = STORE_ITEMS.find(x => x.id === 'band_green'); C.hb = 50; storeBuy(it); o.poor = !storeOwned(it.id) && C.hb === 50 && /more Halal Bucks/.test(World.shop.msg);
    C.hb = 500; storeBuy(it); o.bought = storeOwned(it.id) && C.hb === 440 && C.look.band === 2 && JSON.stringify(C.lv) === lv;
    const bi = CREATOR_ROWS.findIndex(q => q.key === 'band'); C.look.band = 0; creatorStep(bi, 1); o.rowOwned = C.look.band === 2;   // white isn't owned: skipped
    const shoe = STORE_ITEMS.find(x => x.id === 'shoe_gold'); o.locked = swatchLocked('shoe', shoe.idx); storeBuy(shoe); o.unlocked = !swatchLocked('shoe', shoe.idx) && C.look.shoes === shoe.idx;
    o.items = STORE_ITEMS.length >= 6 && STORE_ITEMS.length <= 8 && STORE_ITEMS.every(x => x.price > 0 && ['shoe', 'kufi', 'band', 'bottle'].includes(x.kind));
    press('Escape'); o.shopLeft = !World.shop;
    // the mirror opens the look editor and comes back to the same spot
    worldEnter('home', 'mirror', { noFade: true }); const mx = World.x; use('mirror').act(); o.mirror = Game.screen === 'creator';
    careerHub(); o.mirrorBack = Game.screen === 'world' && World.scene === 'home' && World.x === mx;
    // an old save (no location) loads and starts at home; a saved location comes back
    worldEnter('street', { x: 1500, d: 0.5, face: 1 }, { noFade: true }); worldSaveLoc(); const keep = JSON.stringify(C.cal.loc);
    delete C.cal.loc; saveCareer(); C = null; loadCareer(SAVE_AUTO); careerHub(); o.oldSave = where() === 'home/0';
    C.cal.loc = JSON.parse(keep); saveCareer(); C = null; loadCareer(SAVE_AUTO); careerHub(); o.resume = where() === 'street/0' && Math.round(World.x) === 1500;
    // text baked into scenes (signs) is big enough for the smallest phone: >= 19.8 game px (11 CSS px at 667x300),
    // with every masjid upgrade at its top level and at every time of day
    const keepUp = C.up; C.up = {}; for (const pj of PROJECTS.masjid) C.up[pj.key] = pj.tiers.length;
    World.signText.clear();
    for (const id in WORLD_SCENES) for (let tod = 0; tod < 4; tod++) { World.cache = null; worldCache(WORLD_SCENES[id], tod); }
    C.up = keepUp; World.cache = null;
    o.signs = [...World.signText.entries()].map(([t, px]) => t + ' ' + px).join(' | ');
    o.signText = World.signText.size >= 6 && [...World.signText.values()].every(px => px >= 19.8);
    // calendar Off: the old hub, no walking
    SETTINGS.calendar = false; window.__calFresh(); careerHub(); o.off = Game.screen === 'hub' && !HUB_MENU().some(e => e.label === 'Go outside');
    Game.worldWake = C; careerHub(); o.offWake = Game.screen === 'hub'; SETTINGS.calendar = true;
    return o;
  });
  await ctx.close();
  const ok = Object.entries(r).every(([k, v]) => k === 'signs' || v === true) && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v9.2: the walk bot. In every scene: a reachability check over the walkable mask, then it walks (real stick
// input through the game's update) to every portal, NPC and interaction point and checks the prompt appears.
// Fails if it gets stuck, stands somewhere not walkable, steps through a prop, or can't reach a target; checks
// feet on the ground line (pixels), depth order every frame it draws, the camera inside the drawn world, and
// records the average update and draw time per scene.
T['world-walk'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'world-walk');
  await p.evaluate(WORLD_HELPERS);
  const r = await p.evaluate(() => {
    window.__seed(7); window.__worldDay(); worldStartDay(); World.perf = {};
    const out = { scenes: {}, problems: [] }, bad = m => { if (out.problems.length < 30) out.problems.push(m); };
    for (const id of ['home', 'street', 'masjidfront', 'store']) {
      const def = WORLD_SCENES[id]; worldLoc().tod = 1; worldEnter(id, 'start', { noFade: true });
      const res = out.scenes[id] = { cells: 0, reach: 0, targets: 0, reached: 0, frames: 0, maxStep: 0, depthOk: true, feet: [], cam: true };
      // ---- the grid: walkable cells (static NPCs count as obstacles), flood fill from the spawn
      let x0 = 1e9, x1 = -1e9; for (const P of def.walk) for (const [x] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      const DX = 6, DD = 0.01, nx = Math.ceil((x1 - x0) / DX) + 1, nd = 101, idx = (i, j) => j * nx + i;
      const still = World.npcs.filter(o => !(o.n.path && o.n.path.length > 1));
      const free = new Uint8Array(nx * nd);
      for (let j = 0; j < nd; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * DX, d = j * DD; if (wWalkable(def, x, d, false) && !still.some(o => !o.ghost && ((x - o.x) / 30) ** 2 + ((d - o.d) / 0.085) ** 2 < 1.3)) { free[idx(i, j)] = 1; res.cells++; } }
      const cellOf = (x, d) => [Math.round((x - x0) / DX), Math.round(d / DD)];
      const bfs = (si, sj) => { const prev = new Int32Array(nx * nd).fill(-2), q = [idx(si, sj)]; prev[q[0]] = -1;
        for (let h = 0; h < q.length; h++) { const c = q[h], i = c % nx, j = (c - i) / nx; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= nd) continue; const k = idx(ii, jj); if (!free[k] || prev[k] !== -2) continue; prev[k] = c; q.push(k); } }
        return prev; };
      let [si, sj] = cellOf(World.x, World.d); if (!free[idx(si, sj)]) bad(id + ': the spawn is not walkable');
      let prev = bfs(si, sj); for (let k = 0; k < free.length; k++) if (free[k] && prev[k] !== -2) res.reach++;
      if (res.reach !== res.cells) bad(id + ': ' + (res.cells - res.reach) + ' walkable cells cannot be reached from the spawn');
      // ---- walk to each target
      const targets = worldTargets().slice();
      for (const q of targets) {
        res.targets++;
        const [tx, td] = wTargetPos(q), rx = (q.rx || WORLD_REACH.x) * 0.8, rd = (q.rd || WORLD_REACH.d) * 0.8;
        [si, sj] = cellOf(World.x, World.d); prev = bfs(si, sj);
        let goal = -1, gs = 1e9;
        for (let k = 0; k < free.length; k++) { if (prev[k] === -2) continue; const i = k % nx, j = (k - i) / nx, x = x0 + i * DX, d = j * DD; if (Math.abs(x - tx) < rx && Math.abs(d - td) < rd) { const sc = Math.abs(x - tx) / rx + Math.abs(d - td) / rd; if (sc < gs) { gs = sc; goal = k; } } }
        const name = q.id || (q.n && q.n.id);
        if (goal < 0) { bad(id + ': no reachable spot next to ' + name); continue; }
        let path = []; for (let c = goal; c >= 0; c = prev[c]) path.unshift(c);
        let wi = 0, stuck = 0, best = 1e9, lx = World.x, ld = World.d, replans = 0;
        // re-plan with the moving NPCs where they are now (and the target, if it walks)
        const replan = () => { const fr = new Uint8Array(free); for (const o of World.npcs) if (o.n.path && o.n.path.length > 1 && o !== q) { const ci = Math.round((o.x - x0) / DX), cj = Math.round(o.d / DD); for (let j = Math.max(0, cj - 11); j <= Math.min(nd - 1, cj + 11); j++) for (let i = Math.max(0, ci - 7); i <= Math.min(nx - 1, ci + 7); i++) { const x = x0 + i * DX, d = j * DD; if (((x - o.x) / 34) ** 2 + ((d - o.d) / 0.1) ** 2 < 1) fr[idx(i, j)] = 0; } }
          const [ti, tj] = wTargetPos(q); [si, sj] = cellOf(World.x, World.d); const keep = free.slice(); free.set(fr); const pv = bfs(si, sj); free.set(keep);
          let gg = -1, bs = 1e9; for (let k = 0; k < fr.length; k++) { if (pv[k] === -2) continue; const i = k % nx, j = (k - i) / nx, x = x0 + i * DX, d = j * DD; if (Math.abs(x - ti) < rx && Math.abs(d - tj) < rd) { const sc = Math.abs(x - ti) / rx + Math.abs(d - tj) / rd; if (sc < bs) { bs = sc; gg = k; } } }
          if (gg >= 0) { path = []; for (let c = gg; c >= 0; c = pv[c]) path.unshift(c); wi = 0; } replans++; };
        for (let f = 0; f < 6000 && wi < path.length; f++) {
          if (f > 2 && World.near === q && q.n) break;                     // next to a (moving) person: arrived
          if (f && f % 45 === 0 && World.npcs.some(o => o.n.path && o.n.path.length > 1)) replan();
          const c = path[Math.min(path.length - 1, wi)], i = c % nx, j = (c - i) / nx, wx = x0 + i * DX, wd = j * DD;
          const ddx = wx - World.x, ddd = wd - World.d;
          if (Math.abs(ddx) < 4 && Math.abs(ddd) < 0.013) { wi += 3; if (wi >= path.length && wi - 3 < path.length - 1) wi = path.length - 1; stuck = 0; best = 1e9; continue; }
          Input.padAxis[0] = { ax: clamp(ddx / 14, -1, 1), az: clamp(ddd / 0.025, -1, 1) };
          careerUpdate(1 / 60); res.frames++;
          if (Game.screen !== 'world' || World.scene !== id) { bad(id + ': left the scene while walking to ' + name); break; }
          const st = Math.hypot(World.x - lx, (World.d - ld) * 300); res.maxStep = Math.max(res.maxStep, st);
          if (Math.abs(World.x - lx) > 4.5 || Math.abs(World.d - ld) > 0.016) bad(id + ': moved too far in one frame');
          if (!wOnFloor(def, World.x, World.d) || wPropHit(def, World.x, World.d, 0, 0)) bad(id + ': stood off the floor or inside a prop at ' + Math.round(World.x) + ',' + World.d.toFixed(2));
          if (wPropHit(def, (World.x + lx) / 2, (World.d + ld) / 2, 0, 0)) bad(id + ': stepped through a prop');
          lx = World.x; ld = World.d;
          if (f % 6 === 0) { worldDraw(ctx); for (let k = 1; k < World.drawn.length; k++) if (World.drawn[k] < World.drawn[k - 1] - 1e-9) res.depthOk = false;
            const vw = World.vw, m = WORLD_MARGIN; if (World.camX < -m || World.camX + vw > def.w + m || (def.w >= vw && (World.camX < -0.5 || World.camX > def.w - vw + 0.5))) res.cam = false; }
          const dist = Math.abs(ddx) + Math.abs(ddd) * 300; if (dist < best - 0.5) { best = dist; stuck = 0; } else if (++stuck > 240) { bad(id + ': stuck on the way to ' + name + ' at ' + Math.round(World.x) + ',' + World.d.toFixed(2)); break; }
        }
        Input.padAxis[0] = { ax: 0, az: 0 }; careerUpdate(1 / 60); careerUpdate(1 / 60);
        res.per = (res.per || '') + name + ':' + (res.frames - (res.f0 || 0)) + ' '; res.f0 = res.frames;
        if (World.near === q) res.reached++; else bad(id + ': no prompt next to ' + name + ' (near: ' + (World.near && (World.near.id || World.near.n.id)) + ')');
      }
      // ---- feet on the ground line: draw each person alone and find the lowest solid pixel (shadows are faint)
      const cv = document.createElement('canvas'); cv.width = 400; cv.height = 400; const g = cv.getContext('2d');
      for (const who of [{ id: 'you', p: World.me, pose: 'stand', k: 1 }, ...World.npcs.map(o => ({ id: o.id, p: o.p, pose: o.n.pose || 'stand', k: o.k }))]) {
        g.clearRect(0, 0, 400, 400); const s = wScale(def, 0.5) * who.k; musFigure(g, who.p, 200, 300, s, who.pose);
        const D = g.getImageData(0, 0, 400, 400).data; let low = -1; for (let y = 399; y >= 0 && low < 0; y--) for (let x = 0; x < 400; x++) if (D[(y * 400 + x) * 4 + 3] > 200) { low = y; break; }
        res.feet.push(who.id + ':' + (low - 300)); if (low - 300 < -1 || low - 300 > 5 * s) bad(id + ': ' + who.id + ' floats or sinks: lowest solid pixel ' + (low - 300) + ' px from the ground line (allowed -1 .. ' + (5 * s).toFixed(1) + ')');
      }
      if (!res.depthOk) bad(id + ': depth order broken'); if (!res.cam) bad(id + ': the camera showed past the drawn world');
    }
    out.perf = worldPerfReport();
    return out;
  });
  await ctx.close();
  const S = r.scenes, ok = !r.problems.length && Object.values(S).every(x => x.targets === x.reached && x.reach === x.cells) && !errs.length;
  return { ok, detail: [...Object.entries(S).map(([k, v]) => `${k}: ${v.cells} walkable cells, ${v.reach} reachable; ${v.reached}/${v.targets} targets reached in ${v.frames} frames; max step ${v.maxStep.toFixed(1)}; feet ${v.feet.join(' ')}; frames per target ${v.per}`),
    ...r.problems, ...errs] };
};

// v9.2: no page errors under abuse: rapid repeated presses in every scene (keyboard and taps), leaving
// mid-conversation (Esc and the Leave button), tabbing away and back, resizing, rotating a phone; then the
// average frame time per scene with the game's own loop (update + draw CPU time, and the frame interval)
T['world-robust'] = async ({ browser, base }) => {
  const detail = []; let ok = true;
  for (const [dn, dev] of [['desktop', { viewport: { width: 1280, height: 720 } }], ['phone', Object.assign({}, WORLD_PHONES[0][1])]]) {
    const errs = [], ctx = await newContext(browser, { device: dev, seed: true }), p = await open(ctx, base + '/', errs, 'world-robust ' + dn);
    await p.evaluate(WORLD_HELPERS); if (dn === 'phone') await p.evaluate(() => { Input.touchMode = true; });
    const state = () => p.evaluate(() => ({ s: Game.screen, w: Game.screen === 'world' ? World.scene : null, talk: !!World.talk, fade: World.fadeDir }));
    await p.evaluate(() => { window.__worldDay(); worldStartDay(); });
    const keys = ['KeyE', 'Enter', 'KeyK', 'Space', 'Escape', 'KeyG', 'KeyN', 'ArrowLeft', 'ArrowRight', 'KeyD', 'KeyA', 'KeyW', 'KeyS', 'Escape', 'Escape'];
    const seen = new Set();
    for (const sc of ['home', 'street', 'masjidfront', 'store']) {
      await p.evaluate(sc => { if (!C || !C.cal) window.__worldDay(); if (Game.screen !== 'world') { Game.worldSuppress = true; careerHub(); } World.menu = World.shop = World.talk = null; worldEnter(sc, 'start', { noFade: true }); }, sc);
      for (let i = 0; i < 60; i++) { await p.keyboard.press(keys[(i * 7 + sc.length) % keys.length], { delay: 0 }); if (i % 9 === 0) await sleep(30); }
      // taps anywhere on the canvas (touch on the phone)
      const box = await p.evaluate(() => { const c = canvas.getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; });
      for (let i = 0; i < 12; i++) { const x = box.x + box.w * ((i * 37) % 100) / 100, y = box.y + box.h * ((i * 53) % 100) / 100; if (dn === 'phone') await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); }
      seen.add(JSON.stringify(await state()));
    }
    // leaving mid-conversation: Esc, then the Leave button (a click/tap on its rect)
    const talk = await p.evaluate(() => { Game.worldSuppress = true; careerHub(); worldLoc().tod = 1; worldEnter('street', { x: 1000, d: 0.32, face: -1 }, { noFade: true }); World.menu = null; worldTalkTo(World.npcs.find(q => q.id === 'yusuf')); return !!World.talk; });
    await sleep(100); await p.keyboard.press('Escape'); await sleep(100); const escLeft = !(await state()).talk;
    await p.evaluate(() => worldTalkTo(World.npcs.find(q => q.id === 'yusuf'))); await sleep(150);
    const leave = await p.evaluate(() => { const c = canvas.getBoundingClientRect(), k = c.height / H, ox = Math.round((W - 960) / 2); const r = Game.rects.filter(q => q.w === 112 && q.h === 34).pop(); return r && { x: c.left + (r.x) * k + r.w * k / 2, y: c.top + r.y * k + r.h * k / 2 }; });
    if (leave) { if (dn === 'phone') await p.touchscreen.tap(leave.x, leave.y); else await p.mouse.click(leave.x, leave.y); }
    await sleep(120); const btnLeft = !(await state()).talk;
    // tab away and back, resize, rotate
    const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront(); await sleep(400); await p.bringToFront(); await other.close();
    await p.evaluate(() => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    const sizes = dn === 'phone' ? [[342, 750], [750, 342], [667, 300], [750, 342]] : [[1024, 640], [1600, 900], [800, 600], [1280, 720]];
    for (const [w, h] of sizes) { await p.setViewportSize({ width: w, height: h }); await p.keyboard.down('KeyD'); await sleep(250); await p.keyboard.up('KeyD'); }
    const end = await state();
    // frame time per scene at night (the heaviest: the tint and the lights), with the game's own loop
    const perf = {};
    for (const sc of ['home', 'street', 'masjidfront', 'store']) {
      await p.evaluate(sc => { World.menu = World.shop = World.talk = null; worldLoc().tod = 3; worldEnter(sc, 'start', { noFade: true }); World.perf = {}; window.__fr = []; let last = performance.now(); const tick = t => { window.__fr.push(t - last); last = t; if (window.__fr.length < 120) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, sc);
      await sleep(2200);
      perf[sc] = await p.evaluate(() => { const f = window.__fr.slice(10), r = worldPerfReport()[World.scene] || {}; return { cpu: +((r.update || 0) + (r.draw || 0)).toFixed(2), frame: +(f.reduce((a, x) => a + x, 0) / Math.max(1, f.length)).toFixed(1) }; });
    }
    await ctx.close();
    const good = talk && escLeft && btnLeft && !!leave && ['world', 'hub', 'scout', 'story', 'pregame', 'creator'].includes(end.s) && !errs.length;
    ok = ok && good;
    detail.push(`${dn}: mashed keys and taps in 4 scenes (states ${[...seen].length}), Esc leaves a talk ${escLeft}, Leave button ${btnLeft}, tab away/back + ${sizes.length} resizes ok, end ${JSON.stringify(end)}`);
    detail.push(`${dn}: night frame time per scene (ms, CPU update+draw / frame interval): ${JSON.stringify(perf)}`);
    for (const e of errs) detail.push('   pageerror ' + e);
  }
  return { ok, detail };
};

// v9.2: save in every scene and time of day, reload, arrive in the same place; the hub comes back as the hub
T['world-save'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'world-save');
  await p.evaluate(WORLD_HELPERS);
  const r = await p.evaluate(() => {
    const out = [], fails = [];
    for (const sc of ['home', 'street', 'masjidfront', 'store']) for (let tod = 0; tod < 4; tod++) {
      window.__worldDay(); worldStartDay(); const L = worldLoc(); L.tod = tod; L.vis.store = tod > 1 ? 1 : 0;
      const def = WORLD_SCENES[sc], sp = def.spots.start; worldEnter(sc, { x: sp[0] + 37, d: Math.min(0.9, sp[1] + 0.13), face: -1 }, { noFade: true });
      if (!wWalkable(def, World.x, World.d)) worldEnter(sc, 'start', { noFade: true });
      const want = { sc, x: Math.round(World.x), d: Math.round(World.d * 1000) / 1000, tod, store: L.vis.store, day: C.cal.d };
      worldSaveLoc(); C = null; World.scene = null; Game.screen = 'title';
      loadCareer(SAVE_AUTO); careerHub();
      const got = { sc: Game.screen === 'world' ? World.scene : Game.screen, x: Math.round(World.x), d: Math.round(World.d * 1000) / 1000, tod: worldLoc().tod, store: worldLoc().vis.store || 0, day: C.cal.d };
      const same = JSON.stringify(want) === JSON.stringify(got); if (!same) fails.push(JSON.stringify(want) + ' -> ' + JSON.stringify(got));
      out.push(sc + '/' + tod + (same ? ' ok' : ' MOVED'));
    }
    // inside the masjid (the hub): comes back to the hub
    window.__worldDay(); worldStartDay(); worldEnter('masjidfront', 'door', { noFade: true }); WORLD_SCENES.masjidfront.portals[0].act(); for (let i = 0; i < 60; i++) careerUpdate(1 / 60);
    const inHub = Game.screen === 'hub'; saveCareer(); C = null; loadCareer(SAVE_AUTO); careerHub(); const hubBack = inHub && Game.screen === 'hub';
    // a save from before 9.2 (no location) starts at home
    delete C.cal.loc; saveCareer(); C = null; loadCareer(SAVE_AUTO); careerHub(); const oldHome = Game.screen === 'world' && World.scene === 'home' && worldLoc().tod === 0;
    return { out, fails, hubBack, oldHome };
  });
  await ctx.close();
  const ok = !r.fails.length && r.out.length === 16 && r.hubBack && r.oldHome && !errs.length;
  return { ok, detail: [r.out.join(', '), 'hub comes back as the hub: ' + r.hubBack, 'old save starts at home: ' + r.oldHome, ...r.fails, ...errs] };
};

// v9.2: visual regression. Every view at every time of day on desktop and both phone sizes, rendered as a frozen
// deterministic frame and compared with the committed baseline (docs/review/img/world-*.png, made by
// npm run review:world). A pixel differs when any channel is off by more than 10/255; the test fails when more
// than 0.2% of a frame's pixels differ (frames are exact on the same machine; the slack is for anti-aliasing), or a baseline is missing (an unreviewed change: look at it, then
// re-run npm run review:world to accept it).
const WORLD_DIFF = { channel: 10, share: 0.002 };
T['world-visual'] = async ({ browser, base }) => {
  const detail = []; let ok = true, frames = 0, worst = { share: 0 };
  const devs = [['desktop', { viewport: { width: 1280, height: 720 } }], ['iphone', { viewport: { width: 750, height: 342 }, isMobile: true, hasTouch: true }], ['667x300', { viewport: { width: 667, height: 300 }, isMobile: true, hasTouch: true }]];
  for (const [dn, dev] of devs) {
    const errs = [], ctx = await newContext(browser, { device: dev, seed: true }), p = await open(ctx, base + '/', errs, 'world-visual ' + dn);
    await p.evaluate(WORLD_HELPERS); await p.evaluate(t => { Input.touchMode = t; }, dn !== 'desktop');
    for (const [view] of WORLD_VIEWS) for (let tod = 0; tod < 4; tod++) {
      const file = path.join(ROOT, 'docs/review/img', `world-${view}-${WORLD_TODS[tod]}-${dn}.png`);
      await p.evaluate(([v, t]) => window.__worldPhoto(v, t), [view, tod]); await sleep(260);
      const shot = await p.screenshot(); frames++;
      if (!fs.existsSync(file)) { ok = false; detail.push(`MISSING baseline ${path.basename(file)}`); continue; }
      const d = await p.evaluate(async ([a, b, ch]) => {
        const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
        const [A, B] = await Promise.all([load(a), load(b)]); if (A.width !== B.width || A.height !== B.height) return { size: [A.width, A.height, B.width, B.height] };
        const c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const g = c.getContext('2d');
        g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) > ch || Math.abs(da[i + 1] - db[i + 1]) > ch || Math.abs(da[i + 2] - db[i + 2]) > ch) n++;
        return { share: n / (da.length / 4) };
      }, [shot.toString('base64'), fs.readFileSync(file).toString('base64'), WORLD_DIFF.channel]);
      if (d.size || d.share > WORLD_DIFF.share) { ok = false; detail.push(`CHANGED ${path.basename(file)}: ${d.size ? 'size ' + d.size : (d.share * 100).toFixed(2) + '% of pixels differ'}`); }
      if (d.share > worst.share) worst = { share: d.share, file: path.basename(file) };
    }
    for (const e of errs) { ok = false; detail.push('pageerror ' + e); }
    await ctx.close();
  }
  detail.unshift(`${frames} frames compared, threshold: a channel off by > ${WORLD_DIFF.channel}, at most ${WORLD_DIFF.share * 100}% of pixels; largest difference ${(worst.share * 100).toFixed(3)}% (${worst.file || '-'})`);
  return { ok, detail };
};

// v9.2: the neighbourhood with a gamepad: the stick walks, A talks and advances, B leaves, Start opens the menu
T['world-pad'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true, pad: true }), p = await open(ctx, base + '/', errs, 'world-pad');
  await p.evaluate(WORLD_HELPERS);
  await p.evaluate(() => { window.__padPlug(0, true); window.__worldDay(); worldLoc().tod = 1; worldEnter('street', { x: 840, d: 0.3, face: 1 }, { noFade: true }); });
  const st = () => p.evaluate(() => ({ x: Math.round(World.x), talk: !!World.talk, menu: !!World.menu, near: World.near && (World.near.id || (World.near.n && World.near.n.id)), screen: Game.screen }));
  const s0 = await st();
  await p.evaluate(() => window.__padSet(0, { axes: [1, 0] })); await sleep(700); await p.evaluate(() => window.__padSet(0, {}));
  const s1 = await st();
  await p.evaluate(() => { worldEnter('street', { x: 1000, d: 0.3, face: -1 }, { noFade: true }); }); await sleep(200);
  const press = async b => { await p.evaluate(b => window.__padSet(0, { [b]: true }), b); await sleep(120); await p.evaluate(() => window.__padSet(0, {})); await sleep(350); };
  const near = (await st()).near; await press('A'); const talking = (await st()).talk; await press('B'); const left = !(await st()).talk;
  await press('START'); const menu = (await st()).menu; await press('B'); const closed = !(await st()).menu;
  await ctx.close();
  const ok = s1.x > s0.x + 60 && near === 'yusuf' && talking && left && menu && closed && !errs.length;
  return { ok, detail: [`stick walked ${s0.x} -> ${s1.x}; next to ${near}; A talks ${talking}; B leaves ${left}; Start menu ${menu}, B closes ${closed}`, ...errs] };
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
