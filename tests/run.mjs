// Islam Dunk regression suite (headless Chromium via Playwright).
//
//   npm test                         builds dist/web, then the fast tier (the runner at the end of this file)
//   npm run test:full                every test (CI: .github/workflows/test.yml)
//   node tests/run.mjs [--page dist/web/index.html] [--ref path/to/reference/index.html] [--only name,prefix-*,tag] [--full] [--workers N] [--list]
//
// Tests:
//   cpu-parity   seeded CPU-vs-CPU games (2v2 timed, first-to, half court, 1 on 1). With --ref, the same
//                seeds must give exactly the same scores and box scores in both builds.
//   controls     scripted human input after a pump fake: a crossover is ignored (no turnover), he can't move at all
//                (the stick only turns him), shoot and pass still work (v8.6.3: no double dribbles; v8.6.4: no walking)
//   half-court   lobby-driven half-court / points-target games run to completion
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
//   online-loop  loopback transport: lobby, 7 game types (HORSE with the HAQ word, Around the World, King of the Court), back to lobby, direct (P2P) link + fallback,
//                v8.6.1: a Noor power-up pick on the host and on the guest (host authoritative, effect mirrored)
//                v8.6.3: the guest sees a hot spot's +2 value and the pick-up pivot; v8.6.5: a default game is 2 halves on both
//   online-room  claude.ai room adapter (faked locally): lobby -> game -> lobby
//   online-fb    Firebase adapter (fake SDK): lobby -> game -> lobby
//   noor         v8.6.1 Noor power-ups: choice of 3 (least recently used), each of the 6 applies and expires,
//                a wrong answer gives nothing, Barakah Run stacking; turnovers by cause and the TOV column
//   mobile       iPhone landscape/portrait layout, touch controls, the Hikmah challenge (fits; a tap on the right answer gives a power-up), no errors
//                plus the v8.6.2 phone text audit (tests/phone-audit.mjs) at iPhone landscape and 667x300
//   v867         v8.6.7: seeded inbounds never go back to the inbounder; turbo colour and card fade flip at most once a
//                second while sprinting; Sh. Saleem's 2-line limit and Leave buttons; who can earn Noor offline
//                (online-loop: the guest earns Noor on a team whose hafiz is the host's player, and on one where he is)
//   gamepad      v8.7.0: scripted pads: title -> Quick Play -> game -> pause -> quit, stick / sprint / shoot / pass,
//                two pads for two players, hot-plug, trivia and a Noor card, the on-screen picker, rumble, keyboard
//   clip         v8.7.1: a seeded game's best play exported as a video (MediaRecorder): video Blob, 4-8 s, state untouched;
//                refused during a live match; falls back to the still image without MediaRecorder
//   hub-layout   v9.6.2: the career hub at 5 sizes x 10 cases (v9.22: the story hub): no text on text, no panel on panel,
//                no text outside its container, 12 px gutters, no small text on phones (tests/hub-layout.mjs)
//   story-*      v9.22: the career story by bot (tests/story-setup.js): Chapter 0 end to end, reloads at every scene, the
//                Journal, the hub's four entries, the cast's standout stats, old saves start a new career
//   shot-clock   v9.6.3: 14 s in every format and period length (first to 21 too), the title demo and career; a violation
//                turns the ball over; resets on a steal and a rebound; side-outs keep at least 8; Barakah Run texts; the
//                online guest shows the host's clock
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
//   league-*     v9.7.0: real league games, isolation, formats, boards, time, calibration, layout (tests/league.mjs)
//   rb-*         v9.14: rollback netcode: determinism across pages and engines (tests/rollback.mjs)
//   anim-moves, anim-retired   v9.16.1 the reviewed animations, the retired items (tests/anim-fix.mjs)
//   anim-framerate  v9.29.3 the joint springs hold at 60, 40, 30, 20 and 12 fps (the real frame time some callers animate with)
//   cpu-handle, cpu-league   v9.16 CPU dribble moves and dunks by ratings; league averages unchanged (tests/cpu-style.mjs)
//   sfx-variants, crowd-tiers, sound-list, studio-coverage   v9.13 (tests/audio.mjs)
//   studio, studio-anim, studio-csv, studio-excluded   v9.2.1-9.2.2 Review Studio (tests/studio.mjs; npm test builds dist/review first)
//   v93          v9.3.0: a team's own court (editor rows, first on the venue screen, built gym and park floors, share
//                codes, career away games, online lobby), 3 on 3 third-player picks, your players as mini game
//                opponents (HORSE, Lightning and King of the Court line-ups), Teams & Players: right no longer duplicates
//   v98          v9.8.0: play-test review: foul/timeout restarts walk and check, blocks by position and Defense, difficulty scales
//                the CPU defense, story choices fit and Skip, layup poses, menu help, 3 mini games
//   v95          v9.5.0: a tournament (bracket, a real game to the post-game screen, knocked out, played out, saved), a
//                league (schedule, standings, final, leaders), the Quick Play entries, colorblind-safe kits, larger
//                text on a computer, automatic shot release, Settings → Accessibility, the top plays reel, My clips
// Every test fails on any uncaught page error.
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { FAKE_FIREBASE_APP, FAKE_FIREBASE_DB, FAKE_FIREBASE_AUTH, FAKE_ROOM_INIT } from './fakes.js';
import { PHONES, auditPhone, MIN_CSS_PX, tapReport, MIN_TAP } from './phone-audit.mjs';
import { TOMAHAWK_REC } from './tomahawk-rec.mjs';
import { CAREER_HELPERS } from './career-setup.js';
import { FAKE_PAD_INIT } from './fake-pad.js';
import { STUDIO_TESTS } from './studio.mjs';
import { STUDIO_PHONE_TESTS } from './studio-phone.mjs';
import { leagueTests } from './league.mjs';
import { netTests } from './net.mjs';
import { rollbackTests } from './rollback.mjs';
import { rbSameTests } from './rb-same.mjs';
import { saveSafeTests } from './save-safe.mjs';
import { firstMatchTests } from './first-match.mjs';
import { sfxMomentsTests } from './sfx-moments.mjs';
import { rbSafetyTests } from './rb-safety.mjs';
import { phoneTapTextTests } from './phone-tap-text.mjs';
import { holdTapTests } from './hold-tap.mjs';
import { navTests } from './nav-919.mjs';
import { noShoveTests } from './no-shove.mjs';
import { statCurveTests } from './stat-curves.mjs';
import { ballHandsTests } from './ball-hands.mjs';
import { difficultyTests } from './difficulty.mjs';
import { lobbyTests } from './lobby.mjs';
import { v921Tests } from './v921.mjs';
import { audioTests } from './audio.mjs';
import { cpuStyleTests } from './cpu-style.mjs';
import { animFixTests } from './anim-fix.mjs';
import { storyTests } from './story.mjs';
import { hubTests } from './hub-layout.mjs';
import { replayTests } from './replays.mjs';

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
  // (v9.17.3: the one-time "Add to Home Screen" note counts as seen, so it isn't in screenshots; save-full clears it)
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('islamdunk.persistNote')) localStorage.setItem('islamdunk.persistNote', '1'); } catch (e) {} });
  await ctx.route(/islamdunk-ice\.[^/]*workers\.dev/, r => r.abort());                   // the live TURN Worker: fails at once (STUN only), like no relay; net-ice uses ?ice= fakes
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE_FIREBASE_APP }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-database\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE_FIREBASE_DB }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-auth\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE_FIREBASE_AUTH }));
  if (!opts.rb) await ctx.addInitScript('window.ISLAMDUNK_RB = false;');   // v9.14: the snapshot netcode (v9.30.0: every mode is on rollback on a direct link), unless a test asks for rollback
  if (opts.seed) await ctx.addInitScript(SEED_INIT);
  if (opts.room) await ctx.addInitScript(FAKE_ROOM_INIT);
  if (opts.pad) await ctx.addInitScript(FAKE_PAD_INIT);
  return ctx;
}
async function open(ctx, url, errs, tag) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${tag}: ${e.message}` + (process.env.STACK ? "\n" + e.stack : "")));
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

// v9.6.3: the 14-second shot clock, everywhere
T['shot-clock'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'shot-clock');
  const r = await p.evaluate(() => {
    const out = {};
    // every format and period length, the default game, the title demo, scenarios, career, online lobby defaults
    const fm = []; for (const format of ['quarters', 'halves', 'first21']) for (const len of [30, 45, 60, 120]) { newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format, len } }); fm.push(format + len + ':' + M.fmt.sc + '/' + Math.round(M.shotClock)); }
    out.formats = fm;
    for (const len of PERIOD_OPTS) { SETTINGS.periodLen = len; newMatch(TEAMS[0], TEAMS[1], { humans: [] }); fm.push('settings' + len + ':' + M.fmt.sc); } SETTINGS.periodLen = 120;
    newMatch(TEAMS[0], TEAMS[1], { humans: [], attract: true }); out.attract = M.fmt.sc;
    newMatch(TEAMS[0], TEAMS[1], { humans: [], career: true }); out.career = M.fmt.sc;
    out.periodTxt = PERIOD_OPTS.map(periodTxt).join('|');
    out.noClock = { practice: (newMatch(TEAMS[0], TEAMS[1], { humans: [], practice: 'ft' }), M.practice ? 'practice' : '?'), kotc: makeFmt({ fmt: { format: 'first21', target: 3, sc: 0 } }).sc };
    // a violation turns the ball over
    const live = () => { newMatch(TEAMS[0], TEAMS[1], { humans: [] }); for (let i = 0; i < 600 && M.phase !== 'live'; i++) updateMatch(STEP); const a = M.players[0]; M.phase = 'live'; ball.shot = null; ball.pass = null; M.possTeam = -1; giveBall(a, 'inbound'); a.state = 'free'; return a; };
    { const a = live(), sc0 = M.shotClock, t0 = a.stats.tov || 0; M.shotClock = 0.02; for (const q of M.players) q.ai.t = 9;
      let n = 0; for (; n < 60 * 4 && !(ball.owner && ball.owner.team === 1 && M.phase === 'live'); n++) updateMatch(STEP);
      out.violation = { startedAt: sc0, ballTo: ball.owner ? ball.owner.team : null, tov: (a.stats.tov || 0) - t0, newClock: Math.round(M.shotClock) }; }
    // resets: a change of possession (steal) and a rebound off the rim (offensive)
    { const a = live(); M.shotClock = 5; const b = M.players.find(q => q.team === 1); giveBall(b, 'steal'); out.resetSteal = M.shotClock;
      const c = live(); M.shotClock = 3; ball.shot = { hoop: attackHoop(c.team), team: c.team, pts: 2, shooter: c }; ball.owner = null; ball.state = 'loose';
      giveBall(c.mate, 'reb'); out.resetReb = M.shotClock; }
    // a side-out keeps the clock, but never under 8
    { live(); M.shotClock = 3; const sc = Math.max(M.shotClock, Math.min(SC_MIN_RESET, M.fmt.sc || SC_MIN_RESET)); out.sideOutMin = sc; }
    // Barakah Run: Fast Break is 10 s for both teams; Set the Pace: 14 - 2 per rank, min 8
    { const vows = (typeof RUN_VOWS !== 'undefined' ? RUN_VOWS : []).map(v => v.desc).join('|'); out.fastBreakText = /10-second/.test(vows);
      out.paceText = RUN_POWERS.map(u => u.desc || '').join('|').includes('min 8');
      const pace = rank => { const keep = [Run.active, Run.upgrades]; live(); Run.active = true; Run.upgrades = { clock: rank }; M.barakah = true; M.possTeam = 0; giveBall(M.players.find(q => q.team === 1), 'steal'); const v = Math.round(M.shotClock); M.barakah = false; [Run.active, Run.upgrades] = keep; return v; };
      out.pace = [0, 1, 2, 3].map(pace).join('/'); }
    return out;
  });
  // online: the guest takes the host's clock (host-authoritative)
  const host = await open(ctx, base + '/', errs, 'shot-clock host'), guest = await open(ctx, base + '/', errs, 'shot-clock guest');
  const snap = await host.evaluate(() => { Net.role = 'host'; Net.mid = 7; Net.mode = 'vs'; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); M.online = true; Game.screen = 'play';
    for (let i = 0; i < 1200 && !(M.phase === 'live' && ball.owner && M.shotClock < 12); i++) updateMatch(STEP); return Net.snapshot(); });
  const g = await guest.evaluate(s => { Net.role = 'guest'; Net.snaps = [{ t: nowMs() - 2000, s }, { t: nowMs() - 1990, s }]; Net.guestFrame(STEP); return { sc: M.fmt.sc, shotClock: M.shotClock }; }, snap);
  await ctx.close();
  const all14 = r.formats.every(f => f.endsWith(':14/14') || f.endsWith(':14'));
  const ok = all14 && r.attract === 14 && r.career === 14 && !/shot clock/.test(r.periodTxt) && r.noClock.kotc === 0
    && r.violation.ballTo === 1 && r.violation.tov === 1 && r.violation.newClock === 14 && r.resetSteal === 14 && r.resetReb === 14 && r.sideOutMin === 8
    && r.fastBreakText && r.paceText && r.pace === '14/12/10/8' && g.sc === 14 && Math.abs(g.shotClock - snap.m[2]) < 1e-9 && snap.fx && snap.fx.sc === 14 && !errs.length;
  return { ok, detail: [JSON.stringify(r), 'online guest: ' + JSON.stringify(g) + ' host clock ' + (snap.m && snap.m[2]), ...errs] };
};

// v9.29.3: the joint springs hold at any frame rate. The online guest, the guest's predicted player and the career
// walks animate with the real frame time; at 40 fps and below the running pose's springs blew up (joints at 1e32
// radians within 3 s: players drawn as a scramble of limbs). A longer step is now split into 1/60 s steps, and a
// 1/60 s step is the same single step as before (the match, rollback checksums and the tomahawk fixture unchanged).
T['anim-framerate'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'anim-framerate');
  const r = await p.evaluate(() => {
    const worst = {}, poses = {
      run: q => { q.state = 'free'; q.vx = 300; q.vz = 0; q.cmd.turbo = true; },
      jog: q => { q.state = 'free'; q.vx = 160; q.vz = 60; q.cmd.turbo = false; },
      defend: q => { q.state = 'free'; q.vx = 120; q.vz = 0; q.cmd.def = true; },
      land: q => { q.state = 'land'; q.vx = 0; q.vz = 0; },
      steal: q => { q.state = 'steal'; q.vx = 80; q.vz = 0; }
    };
    for (const [name, set] of Object.entries(poses)) for (const fps of [60, 40, 30, 20, 12]) {
      newMatch(TEAMS[0], TEAMS[1], { humans: [] });
      const q = M.players[1]; q.y = 0; let w = 0;
      for (let i = 0; i < fps * 3; i++) { set(q); animate(q, 1 / fps); for (const k of JOINTS) w = Math.max(w, Math.abs(q.j[k].a)); if (!Number.isFinite(q.j.lean.a)) w = Infinity; }
      worst[name + '@' + fps] = +w.toFixed(2);
    }
    // a 1/60 s step is exactly the old single step
    const J = {}, L = {}, T = { K: 1500, D: 65 }; for (const k of JOINTS) { J[k] = { a: 0.3, v: -1.2 }; L[k] = { a: 0.3, v: -1.2 }; T[k] = 1.1; }
    springJoints(J, T, STEP); for (const k of JOINTS) { const j = L[k]; j.v += ((T[k] - j.a) * T.K - j.v * T.D) * STEP; j.a += j.v * STEP; }
    const same = JOINTS.every(k => J[k].a === L[k].a && J[k].v === L[k].v);
    // nothing moves on a zero, negative or missing step
    const z = { a: 0.5, v: 2 }, Z = Object.fromEntries(JOINTS.map(k => [k, Object.assign({}, z)]));
    springJoints(Z, T, -0.02); springJoints(Z, T, NaN); springJoints(Z, T, 0);
    const still = JOINTS.every(k => Z[k].a === 0.5 && Z[k].v === 2);
    return { worst, same, still };
  });
  await ctx.close();
  const big = Object.entries(r.worst).filter(([, v]) => !(v < 4));
  const ok = !big.length && r.same && r.still && !errs.length;
  return { ok, detail: ['largest joint angle (radians) by pose @ fps: ' + JSON.stringify(r.worst), 'over 4: ' + JSON.stringify(big), '1/60 s step unchanged: ' + r.same + ', no movement on a 0 / negative / NaN step: ' + r.still, ...errs] };
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
    for (let n = 0; n < 60 * 6 && M.phase !== 'live'; n++) updateMatch(STEP);   // v9.8: everyone walks to the spot, then the check
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
    // (ci-health: up to 1,200 s of game time, was 400: 100 seeded CPU games of HAQ took 127 s at the median, 255 s at the
    // 90th, 412 s at the longest, and 2 ran past 400, so about 1 run in 50 failed here with nothing wrong: run 45)
    const hm = M.mini; for (let n = 0; n < 60 * 1200 && !hm.done; n++) miniStep(STEP);
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
    // (v9.19.0: more than 18 in a frame, was 14: a player pushed off the baseline wall moves 14-17, in 4 of 20 seeds on 9.18 too; a teleport is hundreds)
    let jumps = 0; const prev = new Map();
    for (let i = 0; i < 60 * 90; i++) { updateMatch(STEP); for (const q of M.players) { const a = prev.get(q); if (a && Math.hypot(q.x - a[0], q.z - a[1]) > 18 && q.state !== 'dunk') jumps++; prev.set(q, [q.x, q.z]); } }
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
    // (v9.22: the rookie checklist, badges, weekly goals, the niyyah and its lessons left the career with the story)
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
    Gym.result = null; startMini('atw', 'ilyas'); M.mini.done = true; M.mini.doneT = 0; M.mini.winner = 1;
    for (let n = 0; n < 200 && !Gym.result; n++) gymUpdate(STEP);
    out.atwGym = Gym.result && Gym.result.kind === 'atw';
    // a project you can use: the water cooler
    Gym.result = null; C.up.fountain = 1; enterGym(); M.players[0].turbo = 10; useGymProp(GYM_PROPS[0]);
    for (let n = 0; n < 60 * 3; n++) gymUpdate(STEP);
    out.cooler = !Gym.prop && M.players[0].turbo === 100;
    return out;
  });
  for (const s of ['hub', 'journal']) { await p.evaluate(sc => { Game.screen = sc; }, s); await sleep(300); }
  await p.evaluate(() => { openMusalla(); }); await sleep(300);
  await p.evaluate(() => { Object.assign(C.up, { minaret: 1, dome: 1, garden: 2, parking: 1 }); Game.screen = 'masjid'; Game.masjidView = 'ext'; ExtFx.id = 'fount'; ExtFx.t = 0; }); await sleep(400);
  await ctx.close();
  const R = r.routines || {};
  const ok = R.mikan === 'mikan' && R.slides === 'slides' && R.passing === 'passing' && R.cond === 'cond' && r.atwGym && r.cooler && !errs.length;
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
    // career league (v9.24: the story's own masjids, so a custom team sits it out): never your side; your player keeps his earned stats
    goTitle(); loadCareer(SAVE_AUTO);
    const T = stageTeams(0); out.league = T.length >= 8 && T.every(t => !t || t.name !== 'Masjid Al-Fajr') && amanahTeam().players.every(q => q.name !== 'Bilal') && playerDef().stats.spd < 10;
    // review mode: scenes, a mark, export
    C = null; out.scenes = rvScenes().length > 20;
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
  const ok = Object.entries(r).every(([k, v]) => k === 'top' || v === true) && r.top === 'Career,Quick Play,Online,Teams & Players,Settings,Review' && !errs.length;
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
    // (v9.16.1: up to three tries: a CPU dunk misses about 1 in 10 on Medium, 54 of 60 seeds score on 9.16.0 and 9.16.1)
    out.oopScored = false; let a, h;
    for (let tr = 0; tr < 3 && !out.oopScored; tr++) {
      newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'first21', target: 99, len: 600 } }); M.phase = 'live';
      a = M.players[0]; h = attackHoop(a.team); M.players.slice(2).forEach(q => place(q, h.x - h.dir * 600, 100));
      place(a, h.x + h.dir * 260, h.z); giveBall(a, 'inbound'); a.vx = -h.dir * 250; a.vz = 0;
      if (!tr) out.oopOK = selfOopOK(a); selfOop(a); if (!tr) out.glass = !!(ball.pass && ball.pass.glass);
      const s0 = M.teams[0].score; for (let i = 0; i < 150; i++) updateMatch(STEP); out.oopScored = M.teams[0].score > s0;
    }
    // ankles, swats and taunts run without errors
    ankleFall(M.players[2], a); a.taunt = null; tauntOpen(a, 'block'); doTaunt(a, 'sujood'); out.noSujoodLive = a.taunt && a.taunt.k === 'sky';
    for (let i = 0; i < 90; i++) updateMatch(STEP);
    out.dri = STAT_ROWS.some(r => r[0] === 'dri') && CS_STATS.some(r => r[0] === 'dri') && driOf({ st: { spd: 10, stl: 10, pas: 10 } }) === 10;
    out.taunts = REWARDS.filter(x => x.kind === 'taunt').length === TAUNTS.filter(t => !t.retired).length - 1;   // (v9.16.1: two taunts retired)
    // King of the Court: no corner stalls, the winner has the ball
    startKotc({ roster: ['saleem', 'nasser', 'khalil', 'hamid'], humans: {} });
    const hh = hoops[1], ct = new Map(); let stuck = 0, sam = 0, firsts = [], lastG = KOTC.games;
    for (let n = 0; n < 60 * 500 && !KOTC.done; n++) { if (KOTC.spect && KOTC.overT <= 0 && n % 3000 === 2999) kotcSkip(); updateMatch(STEP);
      if (KOTC.games !== lastG) { lastG = KOTC.games; firsts.push(M.possTeam === 0 || (M.inb && M.inb.team === 0) || (M.check && M.check.team === 0)); }
      if (KOTC.overT > 0) continue;
      for (const q of M.players) { const inC = (q.x - hh.x) * hh.dir < 140 && Math.abs(q.z - hh.z) > 200, t = inC ? (ct.get(q) || 0) + STEP : 0; ct.set(q, t); sam++; if (t > 2.5) stuck++; } }
    out.kotcCorners = stuck / sam < 0.005; out.kotcWinnerBall = firsts.length > 0 && firsts.every(Boolean); KOTC.on = false;
    // v9.8: 7 Up and custom games were removed; the mini games list is Lightning, HORSE, King of the Court
    out.minis = MINI_GAMES.map(x => x[0]).join() === 'lightning,horse,kotc' && !LOBBY_GAMES.some(g => ['atw', 'sevenup', 'custom'].includes(g.id));
    return out;
  });
  await p.evaluate(() => { goTitle(); openMinis(); }); await sleep(300);
  await p.evaluate(() => { Game.screen = 'profile'; }); await sleep(300);
  await ctx.close();
  const ok = Object.values(r).every(v => v === true) && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v9.3: your own court, 3 on 3 third-player picks, your players in mini games, Teams & Players keys
T['v93'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v93');
  const r = await p.evaluate(() => {
    window.__seed(93); const out = {}, d = csLoad();
    const pa = csNewPlayer(); pa.name = 'Yaqub'; pa.stats.sht = 10; const pb = csNewPlayer(); pb.name = 'Idris'; d.players.push(pa, pb);
    const t = csNewTeam(); t.name = 'Masjid Test'; t.venue = 'own'; t.court = { b: 0, w: 4, p: 0, m: 2, n: 1 }; t.roster = [{ k: 'p', id: pa.id }, { k: 'p', id: pb.id }]; d.teams.push(t); csSave();
    const ti = teamPool().findIndex(x => x.custom === t.id), T = teamAt(ti);
    out.spec = !!T.court && T.court.key === t.c1 && T.home === 'own_' + t.id;
    // editor rows: the court settings show up for "Your own court"
    CSUI.tab = 0; openCSEdit(t); out.rows = csEditRows().some(x => x.label.trim() === 'Floor'); csEditDone();
    // venue screen: the team's court first; choosing it starts the match there
    startSelect('1p'); Game.sel.a = ti; Game.sel.b = 1; let got = null; openVenueSelect(v => { got = v; });
    out.first = venueOptions()[0].id === 'own_' + t.id; chooseVenue(0);
    out.chosen = !!(got && got.court && got.host === 0);
    newMatch(T, TEAMS[1], { humans: [], venue: got }); out.built = !!(VL && VL.spec.court && VL.floor);
    for (const b of [1, 2]) { t.court.b = b; csSave(); const v = ctVenue(teamAt(ti), 1); newMatch(TEAMS[1], teamAt(ti), { humans: [], venue: v }); for (let i = 0; i < 30; i++) updateMatch(STEP); }
    out.kinds = VL.spec.kind === 'outdoor';
    // codes keep the court; the career plays away games on it; the online lobby can pick it
    const n0 = d.teams.length; out.code = !!csImport(csShareCode('team', t)).ok && d.teams[n0].venue === 'own' && d.teams[n0].court.w === 4;
    out.career = !!careerVenue(0, 1, null, teamAt(ti)).court && !careerVenue(0, 0, null, teamAt(ti)).court;
    Lobby.opts(); Lobby.o.game = 'vs'; Lobby.o.a = ti; Lobby.o.venue = 'own:a'; out.lobby = !!Lobby.venue().court && Lobby.rows().find(x => x.label === 'Venue').get().includes('own court');
    // 3 on 3: pick the third players
    goTitle(); startSelect('1p'); Game.sel.three = true; Game.sel.a = 0; Game.sel.b = 1; selectOK(); selectOK(); out.pick3 = Game.screen === 'pick3';
    const ch = p3Choices(TEAMS[0]), ki = ch.findIndex(x => x && x.k === 'p' && x.id === pa.id); P3.pick[0] = ch[ki]; P3.pick[1] = null; p3Done();
    out.back = Game.screen === 'select' && Game.sel.step === 2; selectOK();
    let v3 = null; Game.venueNext = v => { v3 = v; }; chooseVenue(0); startMatchFromSelect(v3);
    out.three = M.three && M.teamDefs[0].players[2].name === 'Yaqub' && M.teamDefs[1].players.length === 3;
    // mini games: your player as the HORSE opponent, and "My players" line-ups
    goTitle(); MiniMenu.kind = 'horse'; openMinis(); const orow = minisRows().find(x => x.label === 'Opponent'); for (let i = 0; i < 12 && MiniMenu.opp !== 'cs:' + pa.id; i++) orow.step(1);
    startQuickMini(); out.horse = M.players[1].def.name === 'Yaqub';
    for (let n = 0; n < 60 * 20; n++) miniStep(STEP);
    goTitle(); MiniMenu.kind = 'lightning'; MiniMenu.lineup = 2; openMinis(); out.lineupRow = minisRows().some(x => x.label === 'Opponents');
    startQuickMini(); const ids = M.miniIds.slice(1); out.lightning = ids.includes('cs:' + pa.id) && ids.includes('cs:' + pb.id) && MINI_OPPS.every(o => !o[0].startsWith('cs:'));
    for (let n = 0; n < 60 * 20; n++) miniStep(STEP);
    goTitle(); MiniMenu.kind = 'kotc'; startQuickMini(); out.kotc = KOTC.roster.includes('cs:' + pa.id); KOTC.on = false;
    MiniMenu.lineup = 0; goTitle();
    return out;
  });
  // Teams & Players: right switches tabs and no longer duplicates; U duplicates
  await p.evaluate(() => { goTitle(); openCS(0); CSUI.idx = 1; }); await sleep(200);
  const n0 = await p.evaluate(() => csLoad().teams.length);
  await p.keyboard.press('KeyD'); await sleep(200);
  r.noDup = await p.evaluate(n => csLoad().teams.length === n && CSUI.tab === 1, n0);
  await p.evaluate(() => { CSUI.tab = 0; CSUI.idx = 1; }); await p.keyboard.press('KeyU'); await sleep(200);
  r.dup = await p.evaluate(n => csLoad().teams.length === n + 1, n0);
  // the new screens draw
  await p.evaluate(() => { CSUI.tab = 0; openCSEdit(csLoad().teams[0]); }); await sleep(300);
  await p.evaluate(() => { goTitle(); startSelect('1p'); Game.sel.three = true; Game.sel.a = 0; Game.sel.b = 1; selectOK(); selectOK(); }); await sleep(300);
  await p.evaluate(() => { const ti = teamPool().findIndex(x => x.court); goTitle(); startSelect('1p'); Game.sel.a = ti; Game.sel.b = 1; openVenueSelect(() => {}); }); await sleep(400);
  await ctx.close();
  const ok = Object.values(r).every(v => v === true) && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v9.5: tournament and league (brackets, standings, finals, saves), top plays reel, My clips, accessibility
T['v95'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v95');
  const r = await p.evaluate(() => {
    window.__seed(95); const out = {};
    const result = win => { M.teams[0].score = win ? 21 : 12; M.teams[1].score = win ? 15 : 21; finishMatch(); finalContinue(); };
    // a whole tournament: win the first game, then lose
    goTitle(); openSeries('tour'); SER.setup.size = 8; serStart();
    let d = SER.d; out.bracket = Game.screen === 'series' && d.rounds[0].length === 4 && !!serNext(d);
    serPlay(); out.playing = Game.screen === 'play' && !!M.series && M.teamDefs[0].name === serTeam(d.keys[0]).name; result(true);
    d = SER.d; out.round2 = Game.screen === 'series' && d.rounds.length === 2 && d.rounds[0].every(g => g.w >= 0) && !!serNext(d);
    serPlay(); result(false); d = SER.d;                         // knocked out: the rest plays out and a champion is crowned
    out.tourDone = !serNext(d) && d.done && d.champ > 0 && d.rounds.length === 3 && d.rounds[2][0].w === d.champ && Object.keys(d.stats).length > 0;
    out.saved = !!serLoad('tour') && serLoad('tour').done;
    // one tournament game played for real, start to the post-game screen
    serDrop('tour'); openSeries('tour'); SER.setup.size = 4; serStart(); serPlay();
    for (let n = 0; n < 60 * 60 * 12 && M.phase !== 'over'; n++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); }
    out.realGame = M.phase === 'over' && SER.d.rounds[0].every(g => g.w >= 0);
    finalContinue(); out.backToHub = Game.screen === 'series';
    // a league: everyone once, the final, standings and leaders
    openSeries('league'); SER.setup.size = 6; serStart(); d = SER.d;
    out.schedule = d.days.length === 5 && d.days.every(day => day.length === 3);
    for (let k = 0; k < 20 && !d.done; k++) { if (serNext(d)) { serPlay(); result(k % 3 !== 2); } else serMain(); d = SER.d; }
    const S = serStandings(d);
    out.leagueDone = d.done && !!d.final && d.final.w >= 0 && S.reduce((a, s) => a + s.w, 0) === 15 && S[0].w >= S[5].w;
    out.leaders = Object.values(d.stats).filter(s => s.gp > 0).length >= 12;
    // the menu shows "continue" while one is saved
    serDrop('league'); openSeries('league'); serStart();
    const qp = TITLE_MENU().find(e => e.label === 'Quick Play'), pg = qp.sub.find(e => e.label === 'Play a game');
    out.menu = pg.sub.some(e => e.label === 'League (continue)') && pg.sub.some(e => /^Tournament/.test(e.label));
    // accessibility
    SETTINGS.cbSafe = true; newMatch(TEAMS[0], TEAMS[1], { humans: [] });
    out.cb = M.teams[0].def.c1 === CB_KITS[0].c1 && M.teams[1].players[0].T.c1 === CB_KITS[1].c1; SETTINGS.cbSafe = false;
    const g = canvas.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = '8px sans-serif'; Input.touchMode = false;
    SETTINGS.textSize = 0; const w0 = g.measureText('Hello there').width; SETTINGS.textSize = 2; const w2 = g.measureText('Hello there').width; g.restore();
    out.text = w2 > w0 * 1.5;
    SETTINGS.autoShot = true; SETTINGS.casual = false; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); M.phase = 'live';
    const me = M.players.find(q => q.human === 0); giveBall(me, 'inbound'); me.state = 'shoot'; me.st_t = 0.05; humanCmd(0, me.cmd); const held = me.cmd.bHeld;
    me.st_t = 0.9; humanCmd(0, me.cmd); out.autoShot = held === true && me.cmd.bHeld === false; SETTINGS.autoShot = false;
    const gi = SET_GROUPS.findIndex(x => x.name === 'Accessibility');
    out.settings = gi >= 0 && setGroupItems(gi).map(x => x.label).join() === 'Shot release,Hold or tap,Text size,Team colors,Reduced motion,Camera shake,Flashes';   // (v9.17.8: Hold or tap after Shot release)
    // a CPU game for highlights
    window.__seed(7); newMatch(TEAMS[2], TEAMS[5], { humans: [], fmt: { format: 'quarters', len: 120 } });
    for (let n = 0; n < 60 * 60 * 14 && M.phase !== 'over'; n++) { if (Game.screen === 'halftime') Game.screen = 'title'; updateMatch(STEP); }
    out.hl = (M.highlights || []).length >= 2;
    Game.screen = 'final'; Game.finalTab = 0; reelStart(); out.reel = REEL.on && REEL.n >= 2;
    return out;
  });
  await p.waitForFunction(() => REEL.i >= 1 || !REEL.on, null, { timeout: 15000 }).catch(() => {});   // (v9.19.0: up to 15 s, was a fixed 4.5: the first highlight's length depends on the seeded game, and a busy machine runs slower)
  r.reelMoves = await p.evaluate(() => REEL.i >= 1 || !REEL.on);
  // My clips: keep one, list it, delete it
  r.clips = await p.evaluate(async () => {
    await mycTx('readwrite', s => { s.put({ id: 'test', at: Date.now(), name: 'test.webm', type: 'video/webm', blob: new Blob(['x'], { type: 'video/webm' }), poster: '', label: 'Big dunk', teams: ['A', 'B'], score: [21, 18] }); });
    const until = async f => { for (let t = 0; t < 30 && !f(); t++) await new Promise(r => setTimeout(r, 100)); };   // (v9.19.0: IndexedDB took over 300 ms on a busy machine)
    openMyClips(); await until(() => (MYC.list || []).length === 1); const one = (MYC.list || []).length === 1;
    mycDelete(MYC.list[0]); mycDelete(MYC.list[0]); await until(() => (MYC.list || []).length === 0);
    const menu = TITLE_MENU().find(e => e.label === 'Settings').sub.find(e => e.label === 'Extras').sub.some(e => e.label === 'My clips');
    return one && MYC.list.length === 0 && menu;
  });
  // the screens draw (with large text too)
  await p.evaluate(() => { SETTINGS.textSize = 2; openSeries('league'); SER.tab = 0; }); await sleep(300);
  await p.evaluate(() => { SER.tab = 1; }); await sleep(300); await p.evaluate(() => { SER.tab = 2; }); await sleep(300);
  await p.evaluate(() => { serDrop('tour'); openSeries('tour'); }); await sleep(300);
  await p.evaluate(() => { serStart(); }); await sleep(300);
  await p.evaluate(() => { openMyClips(); }); await sleep(300);
  await p.evaluate(() => { goTitle(); Game.screen = 'settings'; Game.setGroup = SET_GROUPS.findIndex(x => x.name === 'Accessibility'); Game.idx = 0; SETTINGS.textSize = 0; }); await sleep(300);
  await ctx.close();
  const ok = Object.values(r).every(v => v === true) && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v9.8: play-test review fixes: foul and timeout restarts walk and check, blocks/steals by position, difficulty scales
// the CPU defense, niyyah on big games only, story choices fit and can be skipped, layup poses, menu help
T['v98'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v98');
  const r = await p.evaluate(() => {
    window.__seed(98); const out = {};
    const live = () => { for (let n = 0; n < 60 * 4 && M.phase !== 'live'; n++) updateMatch(STEP); };
    // a reach-in: the fouled player walks to the spot, CHECK, then BALL IN; nothing is live in between
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'halves', len: 120 } }); live();
    let h = ball.owner || M.players[0]; if (!ball.owner) giveBall(h, 'inbound');
    const d = M.players.find(q => q.team !== h.team), sx = h.x, sz = h.z;
    place(d, h.x + 200, h.z); nonShootingFoul(d, h, 'REACH-IN!');
    let sawCheck = false, liveEarly = false, walked = 0, t = 0;
    for (let n = 0; n < 60 * 8 && !(sawCheck && M.phase === 'live'); n++) { updateMatch(STEP); t += STEP; if (M.check && M.check.full) { sawCheck = true; walked = Math.max(walked, ...[...M.check.S.keys()].map(q => Math.hypot(q.vx, q.vz))); } else if (!sawCheck && M.phase === 'live' && t > 0.2 && t < 0.85) liveEarly = true; }
    out.foulCheck = sawCheck && !liveEarly && M.phase === 'live' && walked > 20 && ball.owner === h;
    // a timeout: walk into the set play, then the check
    newMatch(TEAMS[2], TEAMS[3], { humans: [], fmt: { format: 'halves', len: 120 } }); live();
    if (!ball.owner) giveBall(M.players[0], 'inbound');
    const tm = ball.owner.team; callTimeout(tm, false); endTimeout('pnr');
    sawCheck = false; for (let n = 0; n < 60 * 8 && !(sawCheck && M.phase === 'live'); n++) { updateMatch(STEP); if (M.check && M.check.full) sawCheck = true; }
    out.timeoutCheck = sawCheck && M.phase === 'live' && !!ball.owner && ball.owner.team === tm;
    // blocks: Defense matters when you're in the lane early; steals: an exposed ball is a real chance
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'halves', len: 120 } }); live();
    const sh = M.players[0], o = M.players[2], hp = attackHoop(0), tries = def => { let b = 0; for (let i = 0; i < 400; i++) {
      place(sh, hp.x - hp.dir * 200, hp.z); place(o, hp.x - hp.dir * 150, hp.z); o.st.def = def; o.face = -hp.dir; o.y = 60; o.swipe = false;
      ball.state = 'shot'; ball.shot = { t: 0.15, tried: new Set(), shooter: sh, hoop: hp, team: 0, pts: 2 }; ball.x = o.x + o.face * 6; ball.y = o.y + 104; ball.z = o.z;
      const was = blockBall; let hit = false; blockBall = () => { hit = true; }; try { checkBlockJump(o); } finally { blockBall = was; } if (hit) b++; } return b / 400; };
    const b3 = tries(3), b10 = tries(10); out.blocks = b10 > b3 + 0.2 && b10 > 0.45 && b3 < 0.4;
    out.defK = defK(M.players[2]) === 1 && DIFF.veryeasy.dk < DIFF.easy.dk && DIFF.easy.dk < DIFF.medium.dk && DIFF.medium.dk < DIFF.hard.dk;
    // (v9.22: the niyyah question before games left the career with the story)
    if (!C) { C = freshCareer(); C.name = 'T'; C.bracket = makeBracket(0); }
    // story: four long choices fit their buttons; Skip ends the scene
    let done = false; playStory([['saleem', 'Hello.'], ['choice', [['Just let me play today.', [['saleem', 'Ok.']]], ['Make the extra pass. Get my brothers involved.', [['saleem', 'Ok.']]], ['Defend every possession like it matters.', [['saleem', 'Ok.']]], ['Knock down my free throws when it counts.', [['saleem', 'Ok.']]]]]], () => { done = true; }, 'Test');
    Game.story.i = 1; storySkip(Game.story); out.skip = done;
    // menus: the highlighted title entry is explained; mini games are the three keepers
    goTitle(); out.help = !!titleMenuHelp(TITLE_MENU());
    out.minis = MINI_GAMES.map(x => x[0]).join() === 'lightning,horse,kotc';
    // layups: a layup shot gets a layup pose
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); live(); const me = M.players[0]; giveBall(me, 'inbound'); M.players.slice(1).forEach((q, i) => place(q, me.x + 400 + i * 50, 100 + i * 150));
    me.shotType = 'layup'; me.sigShot = null; me.state = 'shoot'; me.layV = null; const pt = poseTargets(me, 0);
    out.layup = me.layV === 'roll' && pt.ns > 2.9 && pt.ne < 0.2;
    return out;
  });
  // the story bar with four long choices draws without errors, and the Skip button is on screen
  await p.evaluate(() => { playStory([['choice', [['Just let me play today.', []], ['Make the extra pass. Get my brothers involved.', []], ['Defend every possession like it matters.', []], ['Knock down my free throws when it counts.', []]]]], () => goTitle(), 'Before the game'); }); await sleep(500);
  await ctx.close();
  const ok = Object.values(r).every(v => v === true) && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

T['v99'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'v99');
  const r = await p.evaluate(() => {
    window.__seed(99); const out = {};
    const live = () => { for (let n = 0; n < 60 * 4 && M.phase !== 'live'; n++) updateMatch(STEP); };
    const B = Object.assign({}, BINDS[0], { t: ['ShiftLeft'] }), key = (k, on) => B[k].forEach(x => { Input.down[x] = on; });   // turbo is Shift
    const press = k => B[k].forEach(x => { Input.pressed[x] = true; }), clearP = () => { for (const k in Input.pressed) Input.pressed[k] = false; };
    let me, hp;
    const setup = (ax, az, fire) => {
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); live(); me = M.players[0]; hp = attackHoop(0);
      giveBall(me, 'inbound'); M.players.slice(1).forEach((q, i) => place(q, hp.x + hp.dir * 700, 60 + i * 120));
      place(me, hp.x + hp.dir * ax, hp.z + az); me.vx = me.vz = 0; me.fire = !!fire; me.fireT = 40; M.phase = 'live';
    };
    // hold the stick at the rim and tap MOVE (optionally with turbo); watch what happens
    const drive = (keys, frames = 150, btn = 'x') => {
      const res = { kinds: new Set(), types: new Set(), shot: false, dunk: false, oop: false, glass: false, made: false, s0: M.teams[0].score };
      const dx = hp.x - me.x, dz = hp.z - me.z;
      key('right', dx > 1); key('left', dx < -1); key('down', dz > 20); key('up', dz < -20); keys.forEach(k => key(k, true));
      for (let n = 0; n < frames; n++) {
        if (n === 1) press(btn); if (btn === 'b') key('b', n < 25);
        updateMatch(STEP); clearP();
        if (me.layKind) res.kinds.add(me.layKind); if (me.shotType) res.types.add(me.shotType);
        if (me.state === 'dunk') res.dunk = true; if (ball.state === 'shot') res.shot = true;
        if (ball.pass && ball.pass.self) res.oop = true;
        if (ball.state === 'shot' && Math.abs(ball.x - (hp.bbx + hp.dir * BALL_R)) < 6 && Math.abs(ball.z - hp.z) < 46) res.glass = true;
      }
      ['right', 'left', 'up', 'down', 't', 'b'].forEach(k => key(k, false));
      res.made = M.teams[0].score > res.s0; res.kinds = [...res.kinds].join(); res.types = [...res.types].join(); return res;
    };
    setup(120, 0); out.roll = drive([]);
    setup(70, 120); out.bank = drive([]);
    setup(-10, 60); out.reverse = drive([]);
    setup(210, 0); out.euro = drive([]);
    setup(120, 0); M.players[2].x = hp.x + hp.dir * 70; M.players[2].z = hp.z; out.jelly = drive([]);
    const run = () => { me.vx = -hp.dir * 220; };                                  // already driving at the rim
    setup(230, 0); run(); out.oopCold = drive(['t'], 20);
    setup(230, 0, true); run(); out.oopFire = drive(['t'], 20);
    setup(90, 0); out.dunk = drive([], 60, 'b');
    setup(130, 0); run(); me.st.dnk = 1; out.floater = drive([], 90, 'b');
    // bank layups that go in drop off the glass: over many tries most of them touch the board
    let g = 0, mk = 0; for (let i = 0; i < 30; i++) { setup(70 + (i % 3) * 15, (i % 2 ? 1 : -1) * 115); const d = drive([]); if (d.made) { mk++; if (d.glass) g++; } }
    out.bankMakes = mk; out.bankGlass = g;
    // make rates: open layups mostly go in, a defender on the hip takes a lot off (no automatic GREEN)
    const rate = def => { let m = 0; for (let i = 0; i < 200; i++) {   // (v9.16.1: 200 tries, was 40: with the Stride dribble the seeded 40 came out 0.85 / 0.85, 200 give 0.91 / 0.70)
      setup(120, (i % 5 - 2) * 10); if (def) place(M.players[2], hp.x + hp.dir * 125, hp.z + 22); const d = drive([]); if (d.made) m++; } return m / 200; };
    out.openRate = rate(false); out.guardedRate = rate(true); out.greens = M.players[0].stats.grn || 0;
    return out;
  });
  await ctx.close();
  const lay = (o, k, t) => o.kinds === k && o.types === t && o.shot && !o.dunk && !o.oop;
  const ok = lay(r.roll, 'roll', 'layup') && lay(r.bank, 'bank', 'layup') && r.bank.glass && lay(r.reverse, 'reverse', 'reverse') && lay(r.euro, 'euro', 'euro') && lay(r.jelly, 'jelly', 'layup')
    && !r.oopCold.oop && r.oopCold.kinds === 'euro' && r.oopFire.oop && r.dunk.dunk && !r.dunk.kinds && r.floater.types === 'floater' && !r.floater.kinds
    && r.bankMakes >= 15 && r.bankGlass >= r.bankMakes * 0.8 && r.openRate >= 0.7 && r.guardedRate < r.openRate - 0.1 && !r.greens && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v8.6.1: power-ups (v9.19.0: one at random for a correct answer, no picker; each of the 6 applies and expires,
// wrong answer gives nothing, Barakah Run stacking) and turnovers (TOV column, each counted cause)
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
    // (a) v9.19.0: a correct answer gives one power-up at once (no picker), at random among those that can apply;
    // the reveal names it before it's given
    const correct = me => { openTrivia(me); answerTrivia(Game.trivia.order.indexOf(0)); const named = Game.trivia.gift; let picker = false;
      for (let i = 0; i < 130 && Game.trivia; i++) { triviaUpdate(1 / 60); if (Game.trivia && (Game.trivia.pick || Game.trivia.pickView)) picker = true; }
      const on = M.players.filter(q => noorActive(q)).length; return { named, got: noorFxOf(me) || (me.mate && me.mate.boost > 0 ? 'ukhuwwah' : null), on, picker, closed: !Game.trivia }; };
    let me = setup(); const gotN = {}; out.one = true;
    for (let k = 0; k < 60; k++) { me.nfx = null; me.boost = 0; if (me.mate) { me.mate.nfx = null; me.mate.boost = 0; } const c = correct(me); gotN[c.got] = (gotN[c.got] || 0) + 1; if (c.on !== 1 || c.picker || !c.closed || c.named !== c.got) out.one = false; }
    out.seen = Object.keys(gotN).sort().join(",");
    // Ukhuwwah needs a teammate without an effect
    let ukh = 0; for (let k = 0; k < 40; k++) { me.nfx = null; me.boost = 0; me.mate.nfx = null; me.mate.boost = 12; if (noorGift(me) === 'ukhuwwah') ukh++; } out.ukhBlocked = ukh === 0;
    me.mate.boost = 0; me.nfx = null; me.boost = 0;
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
  const ok = r.one && r.seen === 'himmah,noor,quwwah,sabr,ukhuwwah,yaqazah' && r.ukhBlocked
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
  return { ok, detail: [`a right answer: one power-up, no picker ${r.one}; given over 60 answers: ${r.seen}; Ukhuwwah never with a glowing teammate ${r.ukhBlocked}`, 'effects ' + JSON.stringify(r.fx), 'wrong answer ' + JSON.stringify(r.wrong), 'replay ' + JSON.stringify(r.replay), 'Barakah Run ' + JSON.stringify(r.run), 'turnovers ' + JSON.stringify(r.tov), ...errs] };
};

async function onlineFlow(browser, base, { query = '', room = false, games = ['vs'], dropP2P = false, custom = false, noor = false }) {
  const errs = [], ctx = await newContext(browser, { room });
  const H = await open(ctx, base + '/' + query, errs, 'host'), G = await open(ctx, base + '/' + query, errs, 'guest');
  const log = [];
  const avail = await H.evaluate(() => [Net.avail, Net.transport]);
  log.push('transport: ' + avail.join(' '));
  if (avail[0] !== 'yes') { await ctx.close(); return { ok: false, detail: log.concat(errs) }; }
  const idle = avail[1] === 'firebase' ? await H.evaluate(() => window.__fbOnline) : false;   // v9.9.1: no database connection until a room is opened
  const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
  await G.evaluate(c => Lobby.join(c), code);
  await G.waitForFunction(() => Lobby.isIn(), null, { timeout: 10000 }).catch(() => {});
  let ok = await G.evaluate(() => Lobby.isIn()) && await H.evaluate(() => !!Net.guestPeer);   // (v9.20.0: the lobby starts in its gym)
  log.push('guest in lobby: ' + ok);
  if (avail[1] === 'firebase') {                  // v9.9.1: both signed in anonymously, each writes only rooms/<code>/peers/<its user id>
    const a = await Promise.all([H, G].map(pg => pg.evaluate(() => { const T = (typeof P2P !== 'undefined' && P2P.base) || Net.room; return { authed: !!T.authed, me: T.me, node: T.meRef && T.meRef.path, busy: Net.room.busy }; })));
    const fine = a.every(x => x.authed && x.busy === false && /^u/.test(x.me) && x.node === 'rooms/' + code + '/peers/' + x.me) && a[0].me !== a[1].me;
    log.push('signed in: ' + fine + ' (' + a.map(x => x.node).join(', ') + ')'); ok = ok && fine;
    const on = await H.evaluate(() => window.__fbOnline); log.push(`connected only in a room: before ${idle}, after ${on}`); ok = ok && idle === false && on === true;
  }
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
    await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {});
    // (ci-health) if the host still can't start, why (run 55: King of the Court stayed in the lobby on both phones)
    const cant = await H.evaluate(() => Lobby.canStart() ? null : { guest: !!Net.guestPeer, ph: Lobby.ph, ready: Lobby.guestReady(), version: Lobby.versionOK(), pres: (({ v, pv, rdy }) => ({ v, pv, rdy }))(Lobby.guestPres() || {}), picks: typeof Lobby.picksDone === 'function' ? Lobby.picksDone() : null, gScreen: null });
    if (cant) { cant.gScreen = await G.evaluate(() => [Game.screen, Lobby.ph, Lobby.isIn()].join('/')); log.push(`${game}: the host could not start after 20 s: ${JSON.stringify(cant)}`); }
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
    if (noor && game === games[0]) {              // v9.19.0: one power-up for a correct answer, chosen by the host; the guest sees the same one
      await H.evaluate(() => { M.introT = 0; const me = M.players.find(q => q.human === 0); openTrivia(me); answerTrivia(Game.trivia.order.indexOf(0)); Game.trivia.res = 1.7; });
      await H.waitForFunction(() => !Game.trivia, null, { timeout: 5000 }).catch(() => {});
      const hostGot = await H.evaluate(() => { const q = M.players.find(x => x.human === 0); return noorFxOf(q) || (q.mate && q.mate.boost > 0 ? 'ukhuwwah' : null); });
      await sleep(1200);
      const hostSeen = await G.evaluate(() => { const q = M.players.find(x => x.human === 0); return q ? noorFxOf(q) || (q.mate && q.mate.boost > 0 ? 'ukhuwwah' : null) : null; });
      await H.evaluate(() => { for (const q of M.players) { q.nfx = null; q.boost = 0; } const g = M.players.find(q => q.human === 1); openTrivia(g); });
      await G.waitForFunction(() => Game.trivia && Game.trivia.remoteView, null, { timeout: 5000 }).catch(() => {});
      await G.evaluate(() => Net.guestAnswer(Game.trivia.order.indexOf(0)));
      await G.waitForFunction(() => Game.trivia && Game.trivia.remoteView && Game.trivia.gift, null, { timeout: 8000 }).catch(() => {});
      const guestNamed = await G.evaluate(() => Game.trivia && Game.trivia.gift);
      await H.waitForFunction(() => { const g = M.players.find(q => q.human === 1); return !Game.trivia && g && (noorActive(g) || (g.mate && g.mate.boost > 0)); }, null, { timeout: 8000 }).catch(() => {});
      const onHost = await H.evaluate(() => { const g = M.players.find(q => q.human === 1); return noorFxOf(g) || (g.mate && g.mate.boost > 0 ? 'ukhuwwah' : null); });
      await sleep(1200);
      const onGuest = await G.evaluate(() => { const g = M.players.find(q => q.human === 1); return noorFxOf(g) || (g.mate && g.mate.boost > 0 ? 'ukhuwwah' : null); });
      const picker = await G.evaluate(() => !!(Game.trivia && (Game.trivia.pick || Game.trivia.pickView)));
      const good = !!hostGot && hostSeen === hostGot && !!onHost && guestNamed === onHost && onGuest === onHost && !picker;
      log.push(`power-up: the host's correct answer gave ${hostGot} (guest sees ${hostSeen}); the guest's gave ${onHost} (named on the guest's reveal: ${guestNamed}; guest sees ${onGuest})`);
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
      const fxOf = () => { const g = M.players.find(q => q.human === 1); return !g ? null : noorActive(g) ? noorFxOf(g) : g.mate && g.mate.boost > 0 ? 'ukhuwwah' : null; };
      await H.waitForFunction(fxOf, null, { timeout: 8000 }).catch(() => {});
      const onHost = await H.evaluate(fxOf);
      await sleep(1200);
      const onGuest = await G.evaluate(fxOf);
      log.push(`guest power-up on ${team} (guest is ${team === 'NOOR' ? 'not the hafiz' : 'the hafiz'}): guest meter ${meter}, asked ${asked}, host gave ${onHost} (no picker), guest sees ${onGuest}`);
      ok = ok && meter >= 50 && asked && !!onHost && onGuest === onHost;
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
    await G.waitForFunction(() => Lobby.isIn(), null, { timeout: 8000 }).catch(() => {});
    const back = await G.evaluate(() => Game.screen);
    log.push(`${game}: guest ${st.screen} (${st.players} players, ${st.snaps} snapshots buffered), host ${hs.screen}${word ? ', guest sees ' + word : ''}; back to ${back}`);
    ok = ok && good && back === 'lobby';
  }
  await ctx.close();
  return { ok: ok && !errs.length, detail: log.concat(errs) };
}
// v9.11: what the guest sees, and how late, under a simulated connection (no direct link, so the delay applies).
// Each action is pressed on the guest page; the guest's own frames are logged; delays are from the press.
async function lagRun(browser, base, lat, jit) {
  const out = {};
  const errs = [], ctx = await newContext(browser, {});
  const q = `/?net=loop&lat=${lat}&jit=${jit}&room=lag${lat}&p2p=0`;
  const H = await open(ctx, base + q, errs, 'host'), G = await open(ctx, base + q, errs, 'guest');
  const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
  await G.evaluate(c => Lobby.join(c), code);
  await G.waitForFunction(() => Lobby.isIn(), null, { timeout: 10000 }).catch(() => {});
  await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Net.mode = 'vs'; Lobby.changed(); });
  await G.evaluate(() => Lobby.setReady(1)); await sleep(600);
  await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
  await G.waitForFunction(() => Game.screen === 'netplay' && M.players && M.players.length > 0, null, { timeout: 10000 }).catch(() => {});
  await sleep(1500);
  // guest instrumentation: every frame, and every pop shown
  await G.evaluate(() => {
    window.__lg = []; window.__pops = [];
    const _gf = Net.guestFrame; Net.guestFrame = function () { const r = _gf.apply(this, arguments); const me = M.players && M.players.find(p => p.human === 1);
      if (me) window.__lg.push({ gb: GP.ball ? GP.ball.ph + (GP.ball.ph === 'host' ? Math.round((nowMs() - GP.ball.ts)) + '/' + Math.round(GP.ball.T * 1000) : '') : GP.bOff ? 'boff' : '-', ph: (GP.act ? 'A' : GP.hold ? 'H' + (GP.hold.seen ? 's' : '') : GP.off ? 'O' : '-'), t: Date.now(), st: me.state, x: me.x, z: me.z, y: me.y, own: ball.owner === me, by: ball.y, bx: ball.x, mv: !!me.move, st_t: me.st_t }); if (window.__lg.length > 4000) window.__lg.shift(); return r; };
    const _pop = FX.pop; FX.pop = function (x, y, z, txt) { window.__pops.push({ t: Date.now(), txt }); return _pop.apply(this, arguments); };
  });
  await Promise.all([H, G].map(pg => pg.evaluate(() => { Replay.schedule = () => {}; })));   // no instant replays (they pause play)
  await H.evaluate(() => { window.__hp = []; const _pop = FX.pop; FX.pop = function (x, y, z, txt) { window.__hp.push({ t: Date.now(), txt }); return _pop.apply(this, arguments); }; });
  const B = (k, on) => G.evaluate(([k, on]) => { for (const x of BINDS[0][k]) { Input.down[x] = on; if (on) Input.pressed[x] = true; else Input.released[x] = true; } return Date.now(); }, [k, on]);
  const SH = on => G.evaluate(on => { Input.down.ShiftLeft = on; }, on);
  // host: set a scene (guest with the ball at a spot, everyone else frozen far away)
  const scene = (ax, az, fire) => H.evaluate(([ax, az, fire]) => {
    M.introT = 0; M.check = null; M.phase = 'live'; M.shotClock = 24; M.clock = 100; M.nextInbound = null; M.deadT = 0; M.sideOut = null; M.frontIn = null; M.inb = null; M.pendingEnd = false; Game.trivia = null; for (const q of M.players) { q.hifz = 0; q.buf = null; } Net.pendRel = null; Net.gIntent = null;   // (no Noor trivia: it pauses input)
    const g = M.players.find(p => p.human === 1), h = attackHoop(g.team);
    M.cmdHook = q => (q.human === 1 ? false : (zeroCmd(q.cmd), true));
    M.players.forEach((q, i) => { if (q !== g) { place(q, h.x + h.dir * 900, 80 + i * 90); q.state = 'free'; } });
    place(g, h.x + h.dir * ax, h.z + az); g.vx = g.vz = 0; g.state = 'free'; g.fire = !!fire; g.fireT = fire ? 40 : 0; g.turbo = 100;
    giveBall(g, 'inbound'); ball.state = 'held';
    return [h.x > g.x ? 'right' : 'left'];
  }, [ax, az, fire]);
  const mark = () => G.evaluate(() => Date.now());
  const guard = () => G.evaluate(() => { const me = M.players.find(p => p.human === 1); return [me.state, Math.round(me.y), ball.owner === me, ball.state, M.phase, !!GP.act, !!GP.hold, !!Pred.act, !!me.postUp, Math.round(dxz(me, attackHoop(me.team))), Game.trivia ? 'TRIVIA' : '', Game.paused ? 'PAUSED' : ''].join(','); });
  out.dbg = [];
  const hguard = () => H.evaluate(() => { const g = M.players.find(p => p.human === 1); return [g.state, Math.round(g.y), ball.owner === g, ball.state, M.phase, g.shotType, g.sigShot, Net.gIntent && Net.gIntent.k, !!Net.pendRel, Replay.active ? 'replay' : '', Game.screen, g.buf ? JSON.stringify(g.buf) : '', Game.trivia ? 'TRIVIA' : '', Game.paused ? 'PAUSED' : ''].join(','); });
  const log = () => G.evaluate(() => window.__lg.slice());
  const first = (L, t0, f) => { const e = L.find(e => e.t >= t0 && f(e)); return e ? e.t - t0 : null; };
  // 1. movement
  let [dir] = await scene(400, 0); await sleep(500);
  let L0 = await log(); const x0 = L0[L0.length - 1].x;
  let t0 = await B(dir, true); await sleep(400); await B(dir, false);
  out.move = first(await log(), t0, e => Math.abs(e.x - x0) > 1.5);
  // 2. jump shot: press, hold to near the top, release
  [dir] = await scene(260, 0); await sleep(500);
  // the guest's grade is the host's grade: on time, a little early, way early, late
  const grades = [];
  for (const [i, off] of [0, -0.07, -0.2, 0.09].entries()) {
    [dir] = await scene(260, (i - 1.5) * 30); await sleep(500);
    const gd = await guard(); t0 = await B('b', true);
    await G.waitForFunction(off => { const me = M.players.find(p => p.human === 1); return me.state === 'shoot' && me.st_t >= apexT(me) + off; }, off, { timeout: 3000, polling: 'raf' }).catch(() => {});
    const t1 = await B('b', false);
    await sleep(1600);
    const L = await log();
    if (i === 0) { out.shotStart = first(L, t0, e => e.st === 'windup' || e.st === 'shoot'); out.ballLeaves = first(L, t1, e => !e.own); }
    const F = L.filter(e => e.t >= t1 && e.t <= t1 + 850);   let jump = 0;   // the flight, up to the rim
    for (let k = 1; k < F.length; k++) jump = Math.max(jump, Math.hypot(F[k].bx - F[k - 1].bx, F[k].by - F[k - 1].by) / Math.max(1, (F[k].t - F[k - 1].t) / 16.7));   // per 60 Hz frame (a slow frame moves the ball further)
    let hops = 0, up = false; for (const e of L.filter(e => e.t >= t0)) { if (e.y > 3 && !up) { hops++; up = true; } else if (e.y < 1) up = false; }
    const gp = (await G.evaluate(() => window.__pops.slice())).filter(p => p.t >= t1 - 30 && /^(GREEN|GOOD|EARLY|LATE)$/.test(p.txt));
    const hp = (await H.evaluate(() => window.__hp.slice())).filter(p => p.t >= t0 && /^(GREEN|GOOD|EARLY|LATE)$/.test(p.txt));
    if (hops > 1) out.dbg.push('hops ' + off + ': ' + L.filter(e => e.t >= t0).map(e => Math.round(e.t - t0) + ' ' + Math.round(e.y) + ' ' + e.st + ' ' + e.ph).filter((x, k, A) => k === 0 || x.split(' ').slice(1).join() !== A[k - 1].split(' ').slice(1).join()).join(' | '));
    if (!gp.length) out.dbg.push('shot ' + off + ': ' + gd + ' | host ' + (await hguard()));
    grades.push({ g: gp.map(p => p.txt).join('/'), h: hp.map(p => p.txt).join('/'), shown: gp.length ? gp[0].t - t1 : null, ballStep: Math.round(jump), hops });
    await H.evaluate(() => { window.__hp.length = 0; });
  }
  out.grades = grades;
  // the shot type: a drive at the rim without a dunk is a floater on both screens
  [dir] = await scene(230, 0); await H.evaluate(() => { const g = M.players.find(p => p.human === 1); g.st.dnk = 1; }); await sleep(400);
  await B(dir, true); await sleep(350); await B('b', true); await sleep(80);
  const gk = await G.evaluate(() => { const me = M.players.find(p => p.human === 1); return me.shotType || me.sigShot; });
  await H.waitForFunction(() => { const g = M.players.find(p => p.human === 1); return g.state === 'windup' || g.state === 'shoot'; }, null, { timeout: 1500, polling: 'raf' }).catch(() => {});
  const hk = await H.evaluate(() => { const g = M.players.find(p => p.human === 1); return g.shotType || g.sigShot; }); if (!hk) out.dbg.push('kind: host ' + (await hguard()));
  await B('b', false); await B(dir, false); await sleep(1400);
  out.kind = gk + '/' + hk;
  // 3. layup on Move
  [dir] = await scene(110, 0); await sleep(500);
  const dbgL = await G.evaluate(() => { const me = M.players.find(p => p.human === 1); return [me.state, Math.round(me.y), ball.owner === me, M.phase, !!GP.act, !!GP.hold, !!Pred.act, !!me.postUp, Math.round(dxz(me, attackHoop(me.team)))].join(','); });
  await B(dir, true); t0 = await B('x', true); await sleep(60); await B('x', false); await sleep(900); await B(dir, false);
  let L = await log(); out.layupStart = first(L, t0, e => e.st === 'windup' || e.st === 'shoot'); out.layupBall = first(L, t0, e => !e.own); if (out.layupStart == null || out.layupStart > 35) out.dbg.push('layup: ' + dbgL + ' | host ' + (await hguard()));
  // 4. dunk: sprint + shoot at the rim
  [dir] = await scene(150, 0); await sleep(500);
  await SH(true); await B(dir, true); await sleep(200);
  t0 = await B('b', true); await sleep(80); await B('b', false); await sleep(900); await B(dir, false); await SH(false);
  L = await log(); out.dunkStart = first(L, t0, e => e.st === 'dunk' || e.st === 'hang' || e.y > 10); if (out.dunkStart == null) out.dbg.push('dunk: host ' + (await hguard()));
  // 5. crossover (Move with the stick sideways, far from the rim)
  [dir] = await scene(500, 0); await sleep(500);
  const gx = await guard(); await B('up', true); t0 = await B('x', true); await sleep(60); await B('x', false); await sleep(600); await B('up', false);
  L = await log(); out.cross = first(L, t0, e => e.mv); if (out.cross == null) out.dbg.push('cross: ' + gx);
  // 6. pass (tap)
  [dir] = await scene(400, 0); await H.evaluate(() => { const g = M.players.find(p => p.human === 1), m = g.mate; place(m, g.x, g.z + 120); }); await sleep(500);
  const ga = await guard(); await B('a', true); await sleep(60); t0 = await B('a', false); await sleep(700);
  L = await log(); out.pass = first(L, t0, e => !e.own); if (out.pass == null) out.dbg.push('pass: ' + ga);
  await ctx.close();
  return { out, errs };
}
T['online-lag'] = async ({ browser, base }) => {
  const detail = []; let ok = true;
  // a press shows on the guest's own screen within two frames (35 ms), whatever the connection; the timing grade the
  // guest sees is the one the host scores; one jump per shot; the ball's flight has no jumps
  for (const [lat, jit] of [[40, 10], [90, 25], [150, 40]]) {
    const { out, errs } = await lagRun(browser, base, lat, jit);
    detail.push(`one-way ${lat}±${jit} ms: ` + JSON.stringify(out)); detail.push(...errs);
    const fast = v => v != null && v <= 35;
    ok = ok && !errs.length && out.move != null && out.move <= 50 && fast(out.shotStart) && fast(out.ballLeaves) && fast(out.layupStart) && fast(out.dunkStart) && fast(out.cross) && fast(out.pass)
      && out.grades.every(g => g.g && g.g === g.h && fast(g.shown) && g.hops === 1 && g.ballStep <= 16) && /^(\w+)\/\1$/.test(out.kind);
  }
  return { ok, detail };
};

// v9.11: Barakah Run duos keep going after a win (online it went back to the lobby after one game), and the CPU gets
// tougher each game; a loss ends the run. Local duos the same way.
T['duo-run'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, {}), q = '/?net=loop&lat=30&jit=5&room=duo';
  const H = await open(ctx, base + q, errs, 'host'), G = await open(ctx, base + q, errs, 'guest');
  const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
  await G.evaluate(c => Lobby.join(c), code);
  await G.waitForFunction(() => Lobby.isIn(), null, { timeout: 10000 }).catch(() => {});
  await H.evaluate(() => { const o = Lobby.opts(); o.game = 'brun'; Net.mode = 'brun'; Lobby.changed(); });
  await G.evaluate(() => Lobby.setReady(1)); await sleep(600);
  await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
  await G.waitForFunction(() => Game.screen === 'netplay' && M.players && M.players.length > 2, null, { timeout: 10000 }).catch(() => {});
  const rounds = [];
  const finish = win => H.evaluate(win => { Replay.schedule = () => {}; M.introT = 0; M.teams[0].score = win ? 30 : 0; M.teams[1].score = win ? 0 : 30; M.clock = 0.05; M.phase = 'live'; }, win);
  for (let r = 0; r < 3; r++) {
    await sleep(800); await finish(true);
    await H.waitForFunction(() => M.phase === 'over', null, { timeout: 8000 }).catch(() => {});
    await sleep(300);
    const st = await H.evaluate(() => { finalContinue(); const opp = M.teams[1].players; return { scr: Game.screen, active: Run.active, wins: Run.wins, turn: Run.turn, lvl: Run.levelNow }; });
    await G.waitForFunction(() => Game.brun && Game.brun.scr === 'runchoice', null, { timeout: 5000 }).catch(() => {});
    const gsee = await G.evaluate(() => Game.brun && Game.brun.scr);
    if (st.turn === 1) await G.evaluate(() => { Net.rp = (Net.rp || 0) + 1; Net.rpI = 0; });   // the guest's pick
    else await H.evaluate(() => pickRunPower(0));
    await H.waitForFunction(() => Game.screen === 'play', null, { timeout: 5000 }).catch(() => {});
    await G.waitForFunction(() => Game.screen === 'netplay' && !(Game.brun && Game.brun.scr), null, { timeout: 5000 }).catch(() => {});
    const nx = await H.evaluate(() => ({ scr: Game.screen, round: M.barakahRound, online: !!M.online }));
    rounds.push(Object.assign(st, { guestSaw: gsee, next: nx.scr, round: nx.round, online: nx.online }));
  }
  // a loss ends it, on both screens
  await sleep(800); await finish(false);
  await H.waitForFunction(() => M.phase === 'over', null, { timeout: 8000 }).catch(() => {});
  await sleep(300);
  const end = await H.evaluate(() => { finalContinue(); return { scr: Game.screen, active: Run.active, wins: Run.wins }; });
  await G.waitForFunction(() => Game.brun && Game.brun.scr === 'runend', null, { timeout: 5000 }).catch(() => {});
  const gend = await G.evaluate(() => Game.brun && Game.brun.scr);
  await ctx.close();
  // local duos
  const ctx2 = await newContext(browser, { seed: true }), P = await open(ctx2, base + '/', errs, 'local');
  const local = await P.evaluate(() => {
    window.__seed(7); Replay.schedule = () => {}; const out = [];
    openBarakah(); runHomeSelect(1);
    for (let g = 0; g < 3; g++) {
      for (let i = 0; i < 120; i++) updateMatch(STEP);
      M.teams[0].score = 30; M.teams[1].score = 0; M.clock = 0.05;
      for (let i = 0; i < 600 && M.phase !== 'over'; i++) updateMatch(STEP);
      finalContinue(); out.push(Game.screen + ':' + Run.wins); if (Game.screen === 'runchoice') pickRunPower(0);
    }
    return { steps: out, round: M.barakahRound, active: Run.active };
  });
  await ctx2.close();
  const ok = rounds.every((r, i) => r.scr === 'runchoice' && r.active && r.wins === i + 1 && r.guestSaw === 'runchoice' && r.next === 'play' && r.round === i + 2 && r.online)
    && rounds[0].lvl < rounds[1].lvl && rounds[1].lvl < rounds[2].lvl && end.scr === 'runend' && !end.active && end.wins === 3 && gend === 'runend'
    && local.steps.join() === 'runchoice:1,runchoice:2,runchoice:3' && local.round === 4 && local.active && !errs.length;
  return { ok, detail: ['online: ' + JSON.stringify(rounds), 'loss: ' + JSON.stringify(end) + ' guest ' + gend, 'local: ' + JSON.stringify(local), ...errs] };
};

// v9.11: CPU players play to their ratings and play style: shooters take threes, rim runners attack the rim, pass-first
// players move the ball, stoppers block and steal more (CPU vs CPU, by style)
T['cpu-variety'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'cpu-variety');
  const r = await p.evaluate(() => {
    const by = {}, add = (q, k, v) => { const a = cpuArch(q), A = by[a] || (by[a] = { n: 0, fga: 0, tpa: 0, dnk: 0, pass: 0, stl: 0, blk: 0, faced: 0 }); A[k] += v; };
    const _dp = doPass; doPass = function (q) { q._np = (q._np || 0) + 1; return _dp.apply(this, arguments); };
    const _lp = lobPass; lobPass = function (q) { q._np = (q._np || 0) + 1; return _lp.apply(this, arguments); };
    const _ts = trySteal; trySteal = function (q) { if (q.human < 0) q._ns = (q._ns || 0) + 1; return _ts.apply(this, arguments); };
    const _ns = notifyShot; notifyShot = function (sh) { const r = _ns.apply(this, arguments); for (const o of sh.opps) { if (o.human < 0) o._nf = (o._nf || 0) + 1; if (o.human < 0 && o.ai && o.ai.jumpAt > 0) o._nb = (o._nb || 0) + 1; } return r; };
    // v9.31.0: on the rosters before the quick play tiers (p.base, src/data/team-tiers.js). This compares archetypes, and
    // with the tiers each archetype's numbers also depend on how strong its players' teams are (lockdown 42.9 contest v
    // playmaker 49; Powerhouse rim runners at shooting 8 take more threes, rim runners 0.09 of their shots, which is
    // intended: a better shooter shoots more).
    const tiered = TEAMS.map(T => T.players.map(p => p.stats));
    for (const T of TEAMS) for (const p of T.players) if (p.base) p.stats = Object.assign({}, p.base);
    for (let g = 0; g < 16; g++) {
      window.__seed(500 + g * 7919);
      const a = g % TEAMS.length, b = (g * 3 + 1) % TEAMS.length === a ? (a + 1) % TEAMS.length : (g * 3 + 1) % TEAMS.length;
      newMatch(TEAMS[a], TEAMS[b], { humans: [], fmt: { format: 'halves', len: 120 } });
      for (let n = 0; n < 60 * 60 * 12 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; }
      for (const q of M.players) { const s = q.stats; add(q, 'n', 1); add(q, 'fga', s.fga); add(q, 'tpa', s.tpa || 0); add(q, 'dnk', s.dnk || 0); add(q, 'pass', q._np || 0); add(q, 'stl', q._ns || 0); add(q, 'blk', q._nb || 0); add(q, 'faced', q._nf || 0); }
    }
    doPass = _dp; lobPass = _lp; trySteal = _ts; notifyShot = _ns; TEAMS.forEach((T, i) => T.players.forEach((p, k) => { p.stats = tiered[i][k]; }));
    const o = {}; for (const [k, A] of Object.entries(by)) o[k] = { n: A.n, three: +(A.tpa / Math.max(1, A.fga)).toFixed(2), rim: +(A.dnk / Math.max(1, A.fga)).toFixed(2), pass: +(A.pass / A.n).toFixed(1), reach: +(A.stl / A.n).toFixed(1), contest: +(100 * A.blk / Math.max(1, A.faced)).toFixed(1) };   // steal tries a game; shot contests per 100 shots he defended (v9.16.1: a rate, so it doesn't follow how often his man shoots)
    return o;
  });
  await ctx.close();
  const S = r.sharpshooter, R = r.rimrunner, P = r.playmaker, L = r.lockdown;
  const ok = !!(S && R && P && L) && S.three > 0.45 && R.three < 0.08 && R.rim > S.rim + 0.3 && P.pass > R.pass + 2 && P.pass > S.pass + 2
    && L.reach > S.reach * 1.2 && L.reach > R.reach * 1.2 && L.contest > P.contest * 1.1 && R.contest > S.contest && !errs.length;
  return { ok, detail: [JSON.stringify(r), ...errs] };
};

// v9.12: the play-test review. Arrow keys move a solo player (the tutorial says so); abandoning a Barakah run asks first;
// an offline match pauses when the window loses focus; a controller keeps its player when another disconnects; a
// label that would land on the big callout becomes its subtitle; vow card headings stay inside their cards.
T['v912'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true, pad: true }), p = await open(ctx, base + '/', errs, 'v912');
  const out = {};
  // 1. arrows in the tutorial
  await p.evaluate(() => { startTutorial(); });
  await sleep(400);
  const x0 = await p.evaluate(() => tutMe().x);
  await p.evaluate(() => { Input.down.ArrowRight = true; }); await sleep(500); await p.evaluate(() => { Input.down.ArrowRight = false; });
  out.arrows = (await p.evaluate(() => tutMe().x)) - x0 > 40;
  await p.evaluate(() => tutEnd());
  // 2. abandoning a run asks first, Keep playing is the default
  out.run = await p.evaluate(() => {
    openBarakah(); runHomeSelect(0); runPickVow(0);
    const at = Game.screen; Input.pressed.Escape = true; gameUpdate(STEP); Input.endFrame && Input.endFrame();
    const asked = !!Game.confirm && Game.screen === at && Run.active, def = Game.confirm && Game.confirm.sel === 0;
    Input.pressed.Enter = true; gameUpdate(STEP); Input.endFrame && Input.endFrame();
    const kept = !Game.confirm && Run.active && Game.screen === 'runmap';
    BACK.runmap(); confirmPick(1);
    return { asked, def, kept, ended: !Run.active && Game.screen === 'runend' };
  });
  // 3. losing focus pauses an offline match, and the clock stops
  out.blur = await p.evaluate(async () => {
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
    await new Promise(r => setTimeout(r, 300));
    dispatchEvent(new Event('blur'));
    const c0 = M.clock; await new Promise(r => setTimeout(r, 600));
    const ok = Game.paused && M.clock === c0;
    const items = pauseItems().map(x => x[0]);
    return { paused: ok, help: items.includes('How to play') && items.some(t => /^Settings/.test(t)) };
  });
  // the pause menu: leaving asks; How to play comes back to the paused match
  out.pause = await p.evaluate(() => {
    const it = pauseItems(), leave = it.find(x => /^Quit$/.test(x[0])); leave[1]();
    const asked = !!Game.confirm; confirmPick(0);
    const how = it.find(x => x[0] === 'How to play'); how[1](); const inHow = Game.screen === 'howto';
    goTitle(); return { asked, back: inHow && Game.screen === 'play' && Game.paused && !!M.players };
  });
  // 4. two players on two pads: pad 1 drops, pad 2 stays player 2; pad 1 comes back as player 1
  out.pads = await p.evaluate(async () => {
    const w = () => new Promise(r => setTimeout(r, 120));
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] }); Game.screen = 'play'; Game.paused = false;
    window.__padPlug(0, true); window.__padPlug(1, true); await w(); Pad.poll(STEP); await w();
    const s0 = Pad.slots.slice();
    window.__padPlug(0, false); await w(); Pad.poll(STEP);
    const pausedOnLoss = Game.paused, lost = Pad.lost.slice();
    Game.paused = false;
    window.__padSet(1, { A: true }); Pad.poll(STEP); const p2still = !!Input.down.Numpad2 && !Input.down.KeyK; window.__padSet(1, {}); Pad.poll(STEP);
    window.__padPlug(0, true); await w(); Pad.poll(STEP);
    return { s0, lost, pausedOnLoss, p2still, back: Pad.slots[0] === 0 && Pad.slots[1] === 1 && !Pad.lost.length };
  });
  // 5. a label over the callout becomes its subtitle
  out.callout = await p.evaluate(async () => {
    newMatch(TEAMS[0], TEAMS[1], { humans: [] }); Game.screen = 'play'; Game.paused = false; FX.reset();
    FX.callout('TABARAKALLAH!', '#ffd76a', 'HAMMERED HOME'); FX.calls[0].t = 0.1;
    // a world point that lands in the middle of the callout: search for one
    const h = hoops[1], fr = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    FX.pop(cam.x, 100, h.z, 'TOMAHAWK!', '#ffd76a'); const q = FX.pops[0]; Game.paused = true; await fr();
    for (let i = 0; i < 40 && FX.pops.includes(q) && q.t < 5 && q._r && FX._cr; i++) {           // walk it onto the callout
      const R = q._r, C = FX._cr, dy = ((C.t + C.b) / 2 - (R.t + R.b) / 2), dx = ((C.l + C.r) / 2 - (R.l + R.r) / 2);
      q.y -= dy * 0.3; q.x += dx * 0.3; q.t = 0.1; FX.calls[0].t = 0.1; await fr();
    }
    return { sub: FX.calls[0] && FX.calls[0].sub, popLeft: FX.pops.filter(q => q.t < 5).length };
  });
  // 6. vow cards at the largest text size: every heading and line stays inside its card
  out.cards = await p.evaluate(() => {
    SETTINGS.textSize = 2; openBarakah(); runHomeSelect(0);
    const g = ctx, panels = [], texts = [], _p = panel, _ft = g.fillText;
    panel = function (g2, x, y, w, h) { panels.push({ x, y, w, h }); return _p.apply(this, arguments); };
    g.fillText = function (t, x, y) { const m = g.measureText(t), al = g.textAlign; const l = al === 'center' ? x - m.width / 2 : al === 'right' ? x - m.width : x; texts.push({ t, l, r: l + m.width, y }); return _ft.apply(this, arguments); };
    try { render(g); } finally { panel = _p; g.fillText = _ft; }
    SETTINGS.textSize = 0;
    const cards = panels.filter(P => P.h >= 200 && P.w <= 300);
    const bad = [];
    for (const T of texts) { const c = cards.find(P => T.y > P.y && T.y < P.y + P.h && T.l < P.x + P.w && T.r > P.x); if (c && (T.l < c.x + 4 || T.r > c.x + c.w - 4)) bad.push(T.t); }
    return { cards: cards.length, bad };
  });
  // 7. the layup lesson, the tutorial's way into a match, button hints, settings groups and descriptions
  out.m2 = await p.evaluate(async () => {
    const fr = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = { welcome: !!Game.confirm };
    startTutorial(); const li = TUT_STEPS.findIndex(s => s.title === 'Layup'); tutGo(li);
    const me = tutMe(), h = attackHoop(0);
    for (let k = 0; k < 240 && !TUT.s.layup && TUT.i === li; k++) {                         // drive at the rim, press Move toward it
      Input.down.KeyD = h.x > me.x; Input.down.KeyA = h.x < me.x; Input.down.KeyW = h.z < me.z - 20; Input.down.KeyS = h.z > me.z + 20;
      const tap = dxz(me, h) < 200 && k % 20 === 0; Input.down.KeyH = tap; if (tap) Input.pressed.KeyH = true; await fr();
    }
    for (const k of ['KeyD', 'KeyA', 'KeyW', 'KeyS', 'KeyH']) Input.down[k] = false;
    r.layup = TUT.s.layup || TUT.i > li;
    tutGo(TUT_STEPS.length - 1); const labels = [], _b = uiButton;
    uiButton = function (g, x, y, w, hh, label) { labels.push(label); return _b.apply(this, arguments); };
    try { render(ctx); } finally { uiButton = _b; }
    r.final = labels; tutEnd();
    // hints: a player holding the ball near the rim with Move toward it
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0; M.phase = 'live';
    const p = M.players.find(q => q.human === 0), hh = attackHoop(0); place(p, hh.x + hh.dir * 150, hh.z); giveBall(p, 'inbound'); p.state = 'free';
    p.cmd = { mx: hh.dir < 0 ? 1 : -1, mz: 0 }; const said = [], _ts = textSprite;
    textSprite = function (t) { said.push(t); return _ts.apply(this, arguments); };
    try { drawHot(ctx); SETTINGS.hints = false; drawHot(ctx); SETTINGS.hints = true; } finally { textSprite = _ts; }
    r.hints = said;
    // settings: the Sound group and a description for the selected setting
    goTitle(); Game.screen = 'settings'; const names = SET_GROUPS.map(g => g.name || g.title || g.label);
    r.groups = names; const txt = [], _ft = ctx.fillText;
    ctx.fillText = function (t) { txt.push(String(t)); return _ft.apply(this, arguments); };
    try { render(ctx); } finally { ctx.fillText = _ft; }
    r.desc = txt.some(t => t.length > 40);
    goTitle();
    return r;
  });
  // 8. the miss breakdown, the layup-intent log, and fairness: mirrored spots, either team trailing
  out.m3 = await p.evaluate(() => {
    const r = {};
    newMatch(TEAMS[0], TEAMS[0], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0; M.phase = 'live';
    const me = M.players.find(q => q.human === 0), h = attackHoop(0);
    SETTINGS.missWhy = true; place(me, h.x + h.dir * 300, h.z); giveBall(me, 'inbound'); me.state = 'shoot'; me.st_t = 0.01;
    const _rand = Math.random; Math.random = () => 0.999;                                    // a sure miss
    try { releaseShot(me); } finally { Math.random = _rand; }
    r.why = ball.shot && ball.shot.why; for (let k = 0; k < 400 && ball.state === 'shot'; k++) updateMatch(STEP); updateMatch(STEP);
    r.shown = MissWhy.show && MissWhy.show.txt;
    SETTINGS.missWhy = false; MissWhy.show = null;
    // intent: a layup and a skill move near the rim are counted
    PossLog.begin(); place(me, h.x + h.dir * 160, h.z); giveBall(me, 'inbound'); me.state = 'free'; me.cmd = { mx: -h.dir, mz: 0 };
    startLayup(me, 'layup'); place(me, h.x + h.dir * 160, h.z); giveBall(me, 'inbound'); me.state = 'free'; startDribbleMove(me, 'cross');
    r.intent = Object.assign({}, PossLog.game.intent); PossLog.game = null;
    // fairness: the same player, mirrored across half court, has the same odds; trailing helps either team the same
    const a = M.players.find(q => q.team === 0), b = M.players.find(q => q.team === 1);
    for (const q of M.players) place(q, 660, -900);
    const ha = attackHoop(0), hb = attackHoop(1), st = a.st; b.st = st;
    const pa = shotProbability(a, ha.x + ha.dir * 260, ha.z + 80, 200), pb = shotProbability(b, hb.x + hb.dir * 260, hb.z + 80, 200);
    r.mirror = [pa, pb];
    SETTINGS.rubber = true; M.phase = 'live'; M.teams[0].score = 0; M.teams[1].score = 10; const t0 = trailing(0), t1 = trailing(1);
    M.teams[0].score = 10; M.teams[1].score = 0; r.trail = [t0, t1, trailing(0), trailing(1)];
    goTitle(); return r;
  });
  await ctx.close();
  const ok = out.arrows && out.run.asked && out.run.def && out.run.kept && out.run.ended && out.blur.paused && out.blur.help && out.pause.asked && out.pause.back
    && out.pads.s0.join() === '0,1' && out.pads.lost.join() === '0' && out.pads.pausedOnLoss && out.pads.p2still && out.pads.back
    && /TOMAHAWK/.test(out.callout.sub || '') && out.callout.popLeft === 0 && out.cards.cards >= 3 && !out.cards.bad.length && !errs.length
    && !out.m2.welcome && out.m2.layup && out.m2.final.includes('Play a match') && out.m2.hints.length === 1 && /LAYUP/.test(out.m2.hints[0]) && out.m2.groups.some(n => /Sound/.test(n)) && out.m2.desc
    && /Release: (early|late|good|perfect)/.test(out.m3.why || '') && out.m3.shown === out.m3.why && out.m3.intent.lay === 1 && out.m3.intent.layStraight === 1 && out.m3.intent.skillNear === 1
    && Math.abs(out.m3.mirror[0] - out.m3.mirror[1]) < 1e-9 && out.m3.trail.join() === 'true,false,false,true';
  return { ok, detail: [JSON.stringify(out), ...errs] };
};

T['online-loop'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&lat=40&jit=10&room=t', games: ['vs', 'one', 'co', 'co', 'lightning', 'horse', 'kotc'], dropP2P: true, noor: true });
T['online-room'] = ({ browser, base }) => onlineFlow(browser, base, { room: true, games: ['vs', 'one'] });
T['online-fb'] = ({ browser, base }) => onlineFlow(browser, base, { games: ['vs', 'co'] });
T['online-custom'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&lat=30&jit=5&room=c', games: ['vs', 'co', 'one'], custom: true });
T['online-server'] = ({ browser, base }) => onlineFlow(browser, base, { query: '?net=loop&p2p=0&lat=60&jit=15&room=srv', games: ['vs', 'one', 'co', 'lightning', 'horse', 'kotc'], noor: true });   // v9.10: every game on the server path (compact snapshots)

T['mobile'] = async ({ browser, base, tier }) => {
  const detail = []; let ok = true;
  for (const [name, dev] of [['iPhone 13 landscape', devices['iPhone 13 landscape']], ['iPhone 13 portrait', devices['iPhone 13']]]) {
    const errs = [], ctx = await newContext(browser, { device: dev }), p = await open(ctx, base + '/', errs, name);
    await p.evaluate(() => { Input.touchMode = true; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; });
    await sleep(1200);
    const r = await p.evaluate(() => { const c = canvas.getBoundingClientRect(); return { fits: c.right <= innerWidth + 1 && c.bottom <= innerHeight + 1 && c.width > 100, touch: TouchUI.shown, rotateCard: getComputedStyle(document.getElementById('rotate')).display }; });
    // v9.19.0: the Hikmah challenge on a phone: a real tap on the right answer, and the power-up comes at once (no picker)
    await p.evaluate(() => { const me = M.players[0]; for (const q of M.players) { q.nfx = null; q.boost = 0; } openTrivia(me); });
    await sleep(300);
    const right = await p.evaluate(() => { const c = canvas.getBoundingClientRect(), sx = c.width / W, sy = c.height / H, i = Game.trivia.order.indexOf(0);
      const q = Game.rects.filter(q => q.w === 560 && q.h === 40)[i]; return q ? { x: c.left + (q.x + q.w / 2) * sx, y: c.top + (q.y + q.h / 2) * sy, inside: q.x >= 0 && q.x + q.w <= W && q.y >= 0 && q.y + q.h <= H } : null; });
    r.answerFits = !!right && right.inside;
    if (right && !name.includes('portrait')) { await p.touchscreen.tap(right.x, right.y);
      await p.waitForFunction(() => !Game.trivia, null, { timeout: 10000 }).catch(() => {});   // (the reveal closes after 1.8 s of game time)
      r.given = await p.evaluate(() => { const me = M.players[0]; return !Game.trivia && (noorActive(me) || (me.mate && me.mate.boost > 0)); }); }
    const good = r.fits && r.touch && r.answerFits && (name.includes('portrait') || r.given) && !errs.length && (name.includes('portrait') ? r.rotateCard !== 'none' : r.rotateCard === 'none');
    ok = ok && good; detail.push(`${name}: ${JSON.stringify(r)} ${errs.join('; ')}`);
    await ctx.close();
  }
  // v8.6.2: phone text audit. Every screen (career save loaded, a match started) on iPhone landscape and 667x300:
  // no text past the canvas edge, nothing under MIN_CSS_PX on screen, touch buttons clear of the scoreboard, no page errors.
  // The in-match HUD is saved to docs/review/img for each size.
  // (v9.17.2: the full tier only. It takes about 95 s a phone size on 2 cores, and a busy CPU catches a moving
  // popup past the edge; the fast tier keeps the layout, touch and Noor checks above)
  if (tier === 'fast') detail.push('phone text audit: full tier only (npm run test:full)');
  else for (const [dn, dev] of PHONES) {
    const tag = dn.startsWith('iPhone') ? 'iphone' : '667x300';
    const { out, errs } = await auditPhone(browser, base, dev, { targets: true, shots: s => s === 'match HUD' ? path.join(ROOT, 'docs/review/img', `phone-hud-${tag}.png`) : null });
    const bad = out.flatMap(s => s.found);
    // v9.17.7 (X1): every control's tap area is at least MIN_TAP CSS px on its short side, or held in by its neighbours
    const tr = tapReport(out), tn = out.reduce((n, s) => n + (s.tg ? s.tg.targets.length : 0), 0);
    ok = ok && !bad.length && !errs.length && !tr.problems.length;
    detail.push(`${dn}: tap areas: ${tn} controls, ${tr.problems.length} problems; under ${MIN_TAP} px: ${tr.exceptions.spacing.length} held in by row or key spacing, ${tr.exceptions.play.length} on screens played with the joystick, ${tr.exceptions.twice.length} drawn twice`);
    for (const t of tr.problems.slice(0, 20)) detail.push(`   ${t.screen}: "${t.label}" tap area ${t.area.join('x')} (drawn ${t.drawn.join('x')})`);
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
    out.game = { over: M.phase === 'over', halftime, quarters: qMax, label2, shotClockRan: minSc < 13, winner: M.teams[0].score !== M.teams[1].score };
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
  const ok = r.settings === 'halves/120/2 Halves/halves' && r.fmt === 'halves/2/120/14/60' && r.label && r.breakText === 'HALFTIME'
    && g.over && g.halftime === 1 && g.label2 === '2ND HALF' && g.shotClockRan && g.winner && (g.quarters === 2 || g.quarters > 2)
    && r.ot.startsWith('3/OVERTIME/') && r.career === 'halves/2' && r.careerQ === 'quarters/4' && r.practice === 'quarters/4' && r.explicit === 'quarters/4/60/14' && r.picked === 'quarters/4/QUARTER 1' && !errs.length;
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
    // the Dunk lab: under Settings → Extras (Options until 9.17.9); each dunk slams and he's back on the line; nothing is earned
    const ex = TITLE_MENU().find(e => e.label === 'Settings').sub.find(e => e.label === 'Extras');
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
  // (v9.16.1: the pose a second after landing ('rest') is left out: the 8.6.4 recording caught the dunker's arms-up
  // celebration, a reaction retired in 9.16.1. The dunk itself, frame by frame, must still match exactly.)
  const noRest = o => Object.assign({}, o, { rest: null }), c = runs.classic, same = JSON.stringify(noRest(c)) === JSON.stringify(noRest(ref));
  const styles = ['smooth', 'power', 'float'].map(st => { const x = runs[st]; return { st, ok: x.finite && x.dunkFrames === c.dunkFrames && x.slamAt === c.slamAt && x.backToFree && JSON.stringify(x.rest) === JSON.stringify(c.rest), differs: JSON.stringify(x.frames) !== JSON.stringify(c.frames) }; });
  const L = extra.lab;
  const ok = extra.defaultStyle === 'float' && extra.sameGames && same && styles.every(s => s.ok && s.differs) && Object.values(extra.replay).every(Boolean)
    && L.inMenu && L.dunks.every(Boolean) && L.noAch && L.cycled === 'float' && L.off && !errs.length;   // (v9.16.1: Float is the only tomahawk left: the lab stays on it)
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
      let R = draw(); sh.leaveOffice = !R.some(q => q.w >= 120 && q.h >= 30 && q.x > W / 2 && q.y > H - 80);   // (v9.17.9: no Leave office button; the corner pill, drawn over every screen, is the one way back: nav-census checks it)
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
  await press('A'); out.asked = await ev(() => !!Game.confirm);                  // v9.12: leaving asks first (Keep playing selected)
  await press('RIGHT'); await press('A'); out.quit = await ev(() => Game.screen === 'title' && !Game.paused);
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
  // the Hikmah challenge with the pad
  await ev(() => { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } }); Game.screen = 'play'; Game.paused = false; M.introT = 0; });
  await p.waitForFunction(() => M.phase === 'live', null, { timeout: 15000 }).catch(() => {});
  await ev(() => { const me = M.players.find(q => q.human === 0); openTrivia(me); Game.trivia.sel = Game.trivia.order.indexOf(0); });
  await sleep(200);
  const tv0 = await ev(() => ({ open: !!Game.trivia, sel: Game.trivia && Game.trivia.sel, right: Game.trivia && Game.trivia.order.indexOf(0) }));
  await press('A');                                                       // (v9.19.0: the right answer gives a power-up at once; no card to pick)
  await p.waitForFunction(() => !Game.trivia, null, { timeout: 8000 }).catch(() => {});
  out.trivia = { asked: tv0.open, noor: await ev(() => { const me = M.players.find(q => q.human === 0); return noorActive(me) ? noorFxOf(me) : me.mate && me.mate.boost > 0 ? 'ukhuwwah' : null; }) };
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
  out.setting = await ev(() => setGroupItems(SET_GROUPS.findIndex(g => /^Sound/.test(g.name))).some(s => s.label === 'Controller vibration'));
  // keyboard still works with a pad connected
  await ev(() => { goTitle(); Game.screen = 'title'; const m = menuState('title'); m.sub = -1; m.path = []; m.idx = 0; });
  await p.keyboard.press('ArrowDown'); await sleep(150);
  out.keyboard = await ev(() => menuState('title').idx === 1 && Input.lastDev === 'kb');
  await ctx.close();
  const ok = out.menu.inGame && out.menu.dev === 'pad' && out.paused && out.asked && out.quit
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

// v9.0.1: career games follow the Settings format (2 halves of 2:00 by default)
T['career-format'] = async ({ browser, base }) => {
  const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'career-format');
  await p.evaluate(CAREER_HELPERS);
  const r = await p.evaluate(() => {
    const play = (format, seed) => {
      window.__seed(seed); SETTINGS.format = format; window.__cFresh();
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


Object.assign(T, leagueTests({ newContext, open }));   // v9.7.0 the league (tests/league.mjs)   // v9.6.2 career hub fixtures (tests/hub-layout.mjs)
Object.assign(T, netTests({ newContext, open }));   // v9.10 online latency (tests/net.mjs)
Object.assign(T, rollbackTests({ newContext, open }));   // v9.14 rollback netcode (tests/rollback.mjs)
Object.assign(T, rbSameTests({ newContext, open }));    // v9.17.1 both phones play the same game (tests/rb-same.mjs)
Object.assign(T, saveSafeTests({ newContext, open }));  // v9.17.3 a career can't be lost (tests/save-safe.mjs)
Object.assign(T, firstMatchTests({ newContext, open }));  // v9.17.4 the first match is friendly (tests/first-match.mjs)
Object.assign(T, sfxMomentsTests({ newContext, open }));  // v9.17.5 a sound for every moment (tests/sfx-moments.mjs)
Object.assign(T, rbSafetyTests({ newContext, open }));   // v9.17.6 a dropped link comes back, hostile packets are dropped (tests/rb-safety.mjs)
Object.assign(T, phoneTapTextTests({ newContext, open }));   // v9.17.7 phone tap areas and text size (tests/phone-tap-text.mjs)
Object.assign(T, holdTapTests({ newContext, open }));   // v9.17.8 Defend and Sprint as hold or tap (tests/hold-tap.mjs)
Object.assign(T, navTests({ newContext, open }));   // v9.17.9 one way back, leave words, the gamepad hint (tests/nav-919.mjs)
Object.assign(T, noShoveTests({ newContext, open }));   // v9.17.10 the shove is removed (tests/no-shove.mjs)
Object.assign(T, statCurveTests({ newContext, open }));   // v9.19.0 stat curves, move needs, the Hikmah challenge (tests/stat-curves.mjs)
Object.assign(T, ballHandsTests({ newContext, open }));   // v9.19.1 the ball stays in his hands (tests/ball-hands.mjs)
Object.assign(T, difficultyTests({ newContext, open }));
Object.assign(T, lobbyTests({ newContext, open }));
Object.assign(T, v921Tests({ newContext, open }));   // v9.21.0 two dunks, the CPU's defense, no wall at half court (tests/v921.mjs)   // v9.20.0 the online lobby: the gym, team select, the post-game menu (tests/lobby.mjs)   // v9.19.2 career difficulty: starting stats, the first three games, the ladder (tests/difficulty.mjs)
Object.assign(T, storyTests({ newContext, open }));   // v9.22 the career story (tests/story.mjs)
Object.assign(T, hubTests({ newContext, open }));   // v9.6.2 the career hub's layout (v9.22: the story hub; tests/hub-layout.mjs)
Object.assign(T, animFixTests({ newContext, open }));   // v9.16.1 animation fixes and retirements (tests/anim-fix.mjs)
Object.assign(T, cpuStyleTests({ newContext, open }));   // v9.16 CPU moves and dunks by ratings (tests/cpu-style.mjs)
Object.assign(T, audioTests({ newContext, open }));   // v9.13 sound variants, crowd tiers, the sound list, Studio coverage (tests/audio.mjs)
Object.assign(T, replayTests({ newContext, open }));   // v9.33.0 save any play, My plays, share (tests/replays.mjs)
Object.assign(T, STUDIO_TESTS);   // the Review Studio (tests/studio.mjs)
Object.assign(T, STUDIO_PHONE_TESTS);   // v9.21.1 the Studio on a phone (tests/studio-phone.mjs)

// ------------------------------------------------------------------ runner
// v9.17.2: two tiers and parallel workers.
//   npm test               the fast tier: every test but the HEAVY ones (mobile without its phone text audit)
//   npm run test:full      every test, the phone audit at both sizes (CI runs this on every push)
//   --only a,b             names, prefixes or globs (online-*, rb-*), or an area tag (online, phone, cpu, career, studio);
//                          --only runs what it names whatever the tier
//   --release              also the RELEASE tests (online-lag), run by hand before a release
//   --list                 print what would run, and stop
//   --workers N            parallel workers, each with its own browser (default: cores - 1, at least 2, at most 4)
// SERIAL tests check frame rates or real-time networking, so they run alone after the parallel batch.
const FULL = process.argv.includes('--full');
const HEAVY = new Set([
  // the brief's list
  'online-lag', 'online-loop', 'online-server', 'defense', 'cpu-variety', 'tomahawk',
  'first-three', 'ladder',   // v9.19.2: a few hundred bot games each
  'lobby-flow', 'lobby-layout', 'dunk-new-online',   // v9.20.0: two phones through the lobby, two short games; team select drawn 14 ways
  // over 13 s each when run alone on the 2-core container (v9.17.1 times), so the fast tier fits 3 minutes there
  'league-calibration', 'lag-profiles', 'studio', 'cpu-league', 'hub-layout', 'career-run', 'world-robust', 'world-visual',
  'league-formats', 'league-determinism', 'league-layout', 'league-time', 'cpu-handle', 'v863', 'career-intro', 'v867',
  'gamepad', 'phase5', 'career', 'v95', 'v99',
  // the online tests that have to run alone (SERIAL), except rb-one, rb-fun and rb-freeze
  'rb-lag', 'rb-same', 'rb-determinism', 'rb-flow', 'rb-rollback', 'rb-taunt', 'rb-online', 'rb-resync', 'rb-settings',
  'rb-touch', 'rb-plays', 'rb-slow', 'rb-lightning', 'rb-horse', 'rb-brun', 'rb-kotc', 'rb-sounds', 'rb-linkdrop', 'rb-hostile', 'phone-text-size', 'rb-holdtap', 'nav-census', 'fouls-kept', 'net-rate', 'net-modes', 'net-version', 'net-report', 'online-fb', 'online-room', 'online-custom']);
// alone, after the parallel batch: frame-rate and speed checks, and the rollback and real-time online tests, which a
// busy CPU makes desync (9.17.2 on 2 workers: rb-settings, rb-touch and rb-one each repaired 1-3 desyncs they don't alone)
const SERIAL = new Set(['rb-slow', 'rb-lag', 'rb-freeze', 'lag-profiles', 'online-lag', 'league-time', 'net-rate',
  'online-loop', 'online-server', 'online-fb', 'online-room', 'online-custom', 'net-modes', 'net-version', 'net-report', 'lobby-flow', 'dunk-new-online']);
const isSerial = n => SERIAL.has(n) || n.startsWith('rb-');
// v9.17.6: run by hand before a release (--only, or --release), not by test:full on every push. online-lag counts exact
// frames under random jitter and misses 1 run in 10 on 9.15.0 and now alike (30 runs each), with no desync; until that's
// pinned down it would fail CI on pushes that broke nothing
const RELEASE = new Set(['online-lag']);
const RELEASE_RUN = process.argv.includes('--release');
const TAGS = {
  online: n => /^(online-|net-|rb-|lag-)/.test(n),
  phone: n => /^(mobile|gamepad|adaptive-res|world-pad|rb-touch)$/.test(n) || /phone|touch/.test(n),
  cpu: n => /^(cpu-|defense$|v863$|tomahawk$|league-calibration$)/.test(n),
  career: n => /^(career|story-|league-|save-|shot-clock$)/.test(n),
  studio: n => /^studio/.test(n)
};
const glob = p => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
const pick = (n, q) => TAGS[q] ? TAGS[q](n) : /[*?]/.test(q) ? glob(q).test(n) : n === q || (q.endsWith('-') && n.startsWith(q));
const all = Object.keys(T);
const unknown = ONLY.filter(q => !all.some(n => pick(n, q)));
if (unknown.length) { console.log(`--only: no test matches ${unknown.join(', ')}`); process.exit(2); }
const names = ONLY.length ? all.filter(n => ONLY.some(q => pick(n, q))) : all.filter(n => (FULL || !HEAVY.has(n)) && (RELEASE_RUN || !RELEASE.has(n)));
const TIER = FULL ? 'full' : 'fast';
if (process.argv.includes('--list')) { console.log(names.map(n => n + (HEAVY.has(n) ? '  (full tier)' : '') + (isSerial(n) ? '  (alone)' : '')).join('\n') + `\n${names.length} tests`); process.exit(0); }
const cores = (await import('node:os')).cpus().length;
const WORKERS = Math.max(1, +arg('--workers', 0) || Math.min(4, Math.max(2, cores - 1)));
// the longest first (times from the last run, tests/output/test-times.json), so a long test doesn't start last
const TIMES_FILE = path.join(ROOT, 'tests/output/test-times.json');
let past = {}; try { past = JSON.parse(fs.readFileSync(TIMES_FILE, 'utf8')); } catch (e) {}
// (ci-health) --times FILE: the times to order and split by (CI passes the committed tests/ci/test-times.json, so every
// job splits the same way)
const TIMES_IN = arg('--times', null); let plan = past;
if (TIMES_IN) { try { plan = JSON.parse(fs.readFileSync(path.resolve(ROOT, TIMES_IN), 'utf8')); } catch (e) { console.log(`--times: can't read ${TIMES_IN}`); process.exit(2); } }
const byTime = L => L.slice().sort((a, b) => (plan[b] || 10) - (plan[a] || 10) || (a < b ? -1 : 1));
let par = byTime(names.filter(n => !isSerial(n))), ser = byTime(names.filter(n => isSerial(n)));
// (ci-health) --shard K/N: only the K-th of N groups of the parallel tests; --serial K/N: only the K-th of N groups of the
// SERIAL tests (still one at a time). The groups are filled longest first, each test into the group with the least
// time so far, so they come out about even and every test is in exactly one group. CI runs each group as its own job.
const groupOf = (L, spec, flag) => {
  const m = /^(\d+)\/(\d+)$/.exec(spec || ''); if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.log(`${flag}: give K/N, e.g. ${flag} 2/4`); process.exit(2); }
  const k = +m[1] - 1, n = +m[2], load = new Array(n).fill(0), out = Array.from({ length: n }, () => []);
  for (const t of L) { let j = 0; for (let i = 1; i < n; i++) if (load[i] < load[j]) j = i; out[j].push(t); load[j] += plan[t] || 10; }
  return out[k];
};
const SHARD = arg('--shard', null), SSHARD = arg('--serial', null);
if (SHARD || SSHARD) { par = SHARD ? groupOf(par, SHARD, '--shard') : []; ser = SSHARD ? groupOf(ser, SSHARD, '--serial') : []; }
const ran = [...par, ...ser];
if (process.argv.includes('--dry')) { console.log(ran.map(n => `${n} ${plan[n] || 10}`).join('\n')); process.exit(0); }   // (what this group would run, with its planned times)

const { srv, base } = await serve();
console.log(`Testing ${path.relative(ROOT, PAGE)}${REF ? ' against reference ' + REF : ''}: ${TIER} tier, ${ran.length} tests${SHARD || SSHARD ? ` (of ${names.length}: ${SHARD ? 'shard ' + SHARD : ''}${SHARD && SSHARD ? ', ' : ''}${SSHARD ? 'serial ' + SSHARD : ''})` : ''} (${par.length} on ${WORKERS} workers, then ${ser.length} alone)\n`);
const T0 = Date.now(), took = {}, results = {};
let failed = 0;
// (v9.17.6, Q9) an online test whose only failure is a desync the game put right (r.desyncOnly: it says so itself) runs
// once more, and the first try is printed in full under a RETRIED line; any other failure, or a second one, fails
const retried = [];
async function runOne(n, browser) {
  const t0 = Date.now();
  const once = async () => { try { return await T[n]({ browser, base, tier: TIER }); } catch (e) { return { ok: false, detail: [String(e && e.stack || e)] }; } };
  let r = await once();
  if (r && !r.ok && r.desyncOnly) {
    const first = r; r = await once(); retried.push(n);
    r = Object.assign({}, r, { detail: [...((r && r.detail) || []), `RETRIED: the first try failed only on a desync the game put right (${first.desyncOnly}); it was:`, ...(first.detail || []).map(d => '  ' + d)] });
    console.log(`!!! RETRIED ${n}: a repaired desync on the first try (${first.desyncOnly}); second try ${r.ok ? 'passed' : 'failed'}`);
  }
  if (!r || !r.ok) failed++;
  took[n] = (Date.now() - t0) / 1000; results[n] = !!(r && r.ok);
  // one block a test, printed when it finishes
  console.log([`${r && r.ok ? 'PASS' : 'FAIL'}  ${n}  (${took[n].toFixed(1)} s)`, ...((r && r.detail) || []).map(d => '      ' + d)].join('\n'));
}
async function worker(queue) {
  const browser = await chromium.launch();
  try { for (let n; (n = queue.shift()) != null;) await runOne(n, browser); } finally { await browser.close(); }
}
const queue = par.slice();
await Promise.all(Array.from({ length: Math.min(WORKERS, queue.length) }, () => worker(queue)));
if (ser.length) await worker(ser.slice());
srv.close();
const wall = (Date.now() - T0) / 1000;
try { fs.mkdirSync(path.dirname(TIMES_FILE), { recursive: true }); fs.writeFileSync(TIMES_FILE, JSON.stringify(Object.assign(past, took), null, 1)); } catch (e) {}
// (ci-health) what this job ran, for the CI summary: names, times, results, the job's wall time
try { fs.writeFileSync(path.join(ROOT, 'tests/output/ran.json'), JSON.stringify({ shard: SHARD, serial: SSHARD, tier: TIER, wall: (Date.now() - T0) / 1000, took, results }, null, 1)); } catch (e) {}
const slow = Object.entries(took).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(`\nSlowest: ${slow.map(([n, t]) => `${n} ${t.toFixed(0)} s`).join(', ')}`);
console.log(`Total: ${wall.toFixed(0)} s wall, ${Object.values(took).reduce((a, b) => a + b, 0).toFixed(0)} s of tests, ${WORKERS} workers, ${TIER} tier`);
if (TIER === 'fast' && !ONLY.length && wall > 180) console.log(`WARNING: the fast tier took ${(wall / 60).toFixed(1)} min (target: 3). Move the slowest into HEAVY in tests/run.mjs.`);
if (retried.length) console.log(`\n!!! RETRIED after a repaired desync: ${retried.join(', ')} (see RETRIED in their details)`);
console.log(`\n${ran.length - failed}/${ran.length} passed`);
process.exit(failed ? 1 : 0);
