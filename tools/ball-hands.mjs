// node tools/ball-hands.mjs [--page dist/web/index.html] [--games 4] [--json out.json]
//
// v9.19.1: is the held ball in a hand, as drawn? Every frame a player holds the ball, the game is drawn once and the
// tool records where the hands (the 4.5 circles at the end of each arm) and the ball land on the canvas, then the
// gap from the ball's centre to the nearer hand, in game units (canvas units / the depth scale). With each frame:
// the state and pose, the sim's facing (p.face), the facing drawn (p.face x cos(spin) as drawn, after every
// wrapper), the last move, frames since the facing changed, and where (gym / match, desktop / phone).
// Runs: seeded CPU games (all the moves the CPU makes), then scripted human plays in a match and in the gym: move
// left / right, stop, shoot (the report's case), step-back, crossover, behind-the-back, catch and shoot, a pass, a
// free throw. Prints the frames over 20 units grouped by those fields.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const GAMES = +arg('--games', 4) | 0, JSON_OUT = arg('--json', null), LIMIT = +arg('--limit', 20);
if (!fs.existsSync(PAGE)) { console.error(`No build at ${PAGE}. Run npm run build:web first.`); process.exit(1); }
const srv = await new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const file = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u);
    fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res(s));
});
import { BALL_HANDS_JS } from './ball-hands-lib.mjs';

const browser = await chromium.launch();
const out = { version: null, rows: [] };
for (const where of ['desktop', 'phone']) {
  const ctxB = await browser.newContext(where === 'phone' ? { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  await ctxB.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctxB.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} })();`);
  const errs = [];
  // a fresh page for each part (the CPU games, then the scripted plays): nothing carries over from one to the other
  const fresh = async () => { const pg = await ctxB.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(`http://127.0.0.1:${srv.address().port}/?nowelcome=1`);
    await pg.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
    await pg.waitForTimeout(800); await pg.evaluate(() => { window.requestAnimationFrame = () => 0; }); await pg.evaluate(BALL_HANDS_JS); return pg; };
  let page = await fresh();
  out.version = await page.evaluate(() => VERSION);
  // CPU games
  const cpu = await page.evaluate(({ G, where }) => {
    const rows = [];
    for (let g = 0; g < G; g++) {
      window.__seed(500 + g * 97); SETTINGS.difficulty = ['easy', 'medium', 'hard', 'medium'][g % 4];
      newMatch(TEAMS[g % 8], TEAMS[(g + 2) % 8], { humans: [], fmt: { format: 'quarters', len: 45 } }); Game.screen = 'play'; M.introT = 0;
      for (const q of M.players) q.hifzUsed = true;
      for (let n = 0; n < 60 * 60 * 6 && M.phase !== 'over'; n++) {
        snapPrev(); updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; window.__bh.frame++;
        if (ball.owner && n % 2 === 0) { if (typeof updateCamera === 'function') updateCamera(STEP); const r = window.__bh.measure(where + ' match, CPU'); if (r) rows.push(r); }
      }
    }
    return rows;
  }, { G: GAMES, where });
  out.rows.push(...cpu);
  await page.close(); page = await fresh();
  // scripted human plays, in a match and in the gym
  const human = await page.evaluate(({ where }) => {
    const rows = [], B = window.__bh, keyB = (BINDS[0].b || [])[0];
    const step = (n, tag, every = 1) => { for (let i = 0; i < n; i++) { snapPrev(); updateMatch(STEP); B.frame++; Input.pressed = {}; Input.released = {}; if (typeof updateCamera === 'function') updateCamera(STEP); if (ball.owner && i % every === 0) { const r = B.measure(tag); if (r) rows.push(r); } } };
    const stick = (ax, az) => { Input.stick.ax = ax; Input.stick.az = az; };
    const shoot = (tag, hold = 22) => { Input.down[keyB] = true; Input.pressed[keyB] = true; step(hold, tag); Input.down[keyB] = false; Input.released[keyB] = true; step(40, tag); };
    const setUp = (gym, team = 0) => {
      window.__seed(77); Input.down = {}; Input.pressed = {}; Input.released = {}; stick(0, 0);
      if (gym) { C = freshCareer(); C.name = 'Gym'; C.bracket = makeBracket(0); C.seen.intro = true; saveCareer(); enterGym(); }
      else { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0; for (let i = 0; i < 600 && M.phase !== 'live'; i++) snapPrev(); updateMatch(STEP); }
      const me = M.players.find(q => q.human === 0); for (const q of M.players) { q.hifzUsed = true; if (q !== me) q._frozen = true; }
      if (!window.__frzB) { window.__frzB = 1; const _u = Brain.prototype.update; Brain.prototype.update = function () { if (this.p._frozen) { const c = this.p.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = c.bHeld = false; return; } return _u.apply(this, arguments); }; }
      return me;
    };
    const give = (me, x) => { const h = attackHoop(me.team); giveBall(me); place(me, x != null ? x : h.x + h.dir * 330, h.z + 30); me.state = 'free'; M.phase = 'live'; M.clock = 500; M.shotClock = 24; };
    for (const [gym, team] of [[false, 0], [false, 1], [true, 0]]) {   // (team 1 attacks the other hoop: the other facing)
      const tag = where + (gym ? ' gym' : ' match') + ', you';
      let me = setUp(gym, team); if (!me) continue; const h = () => attackHoop(me.team);
      const away = () => -h().dir, toward = () => h().dir;   // h.dir points from the rim into the court
      // the report's case: move left (away from the hoop when it's on your right), stop, turn, shoot
      for (const dir of [-1, 1]) for (const stopF of [0, 4, 12]) { give(me); stick(dir, 0); step(36, tag + ' move ' + (dir < 0 ? 'left' : 'right')); stick(0, 0); step(stopF, tag); shoot(tag + ' shoot after moving ' + (dir < 0 ? 'left' : 'right')); step(30, tag); }
      // standing shot, both sides of the court
      for (const dz of [-60, 60]) { give(me); place(me, me.x, h().z + dz); shoot(tag + ' standing'); step(30, tag); }
      // the report's case: a step-back with the stick still held away from the hoop, and the shot right after it
      for (const dz of [0, 50]) { give(me); place(me, me.x, h().z + dz); stick(h().dir, 0); step(6, tag + ' pull back'); me.st = Object.assign({}, me.st, { spd: 7, pas: 7 }); startDribbleMove(me, 'stepback', 1); step(14, tag + ' stepback held'); shoot(tag + ' shoot out of a held step-back'); stick(0, 0); step(30, tag); }
      // step-back, crossover, behind-the-back then shoot
      for (const kind of ['stepback', 'cross', 'btb', 'spin', 'hesi']) for (const dir of [-1, 1]) { give(me); stick(dir, 0); step(10, tag); me.st = Object.assign({}, me.st, { spd: 7, pas: 7 }); startDribbleMove(me, kind, dir); step(30, tag + ' ' + kind); stick(0, 0); shoot(tag + ' shoot after ' + kind); step(30, tag); }
      // a catch then shoot
      if (me.mate) { give(me.mate); me.mate.state = 'free'; doPass(me.mate, me); step(50, tag + ' catch'); shoot(tag + ' catch and shoot'); step(30, tag); }
      // a pass
      if (me.mate) { give(me); me.mate._frozen = true; doPass(me, me.mate); step(30, tag + ' pass'); }
      // layups: roll, bank, reverse, euro
      for (const [kind, dx, dz] of [['roll', 120, 0], ['bank', 110, 70], ['reverse', 10, 40], ['euro', 185, 10]]) { give(); place(me, h().x + h().dir * dx, h().z + dz); startLayup(me, kind); step(70, tag + ' layup ' + kind); }
      // dribbling in place and running, both ways
      give(me); step(60, tag + ' stance'); for (const dir of [-1, 1]) { stick(dir, 0); step(60, tag + ' dribble'); } stick(0, 0); step(20, tag);
      // a dunk and a layup run
      give(me, h().x + h().dir * 260); stick(-h().dir, 0); Input.down.ShiftLeft = true; step(80, tag + ' drive'); Input.down.ShiftLeft = false; stick(0, 0); step(40, tag);
    }
    // a free throw
    { const me = setUp(false); if (me && typeof foulShots === 'function') { foulShots(me.opps[0], me, 2, 'FOUL'); for (let i = 0; i < 400 && M.phase === 'ft'; i++) { step(1, where + ' match, you free throw'); if (ball.owner === me && i % 40 === 20) { Input.down[keyB] = true; Input.pressed[keyB] = true; step(22, where + ' match, you free throw'); Input.down[keyB] = false; Input.released[keyB] = true; } } } }
    stick(0, 0); Input.down = {};
    return rows;
  }, { where });
  out.rows.push(...human);
  if (errs.length) console.log(where + ' page errors: ' + [...new Set(errs)].slice(0, 4).join(' | '));
  await ctxB.close();
}
await browser.close(); srv.close();
const R = out.rows, bad = R.filter(r => r.gap > LIMIT);
console.log(`\nBALL IN HAND (v${out.version}): ${R.length} held frames drawn, ${bad.length} more than ${LIMIT} units from the nearer hand; worst ${Math.max(0, ...R.map(r => r.gap)).toFixed(1)}`);
const group = (rows, f) => { const m = {}; for (const r of rows) { const k = f(r); (m[k] = m[k] || []).push(r); } return Object.entries(m).sort((a, b) => b[1].length - a[1].length); };
const show = (title, f) => { console.log('\n' + title); for (const [k, rs] of group(R, f)) { const b = rs.filter(r => r.gap > LIMIT); console.log(`  ${k.padEnd(34)} ${String(rs.length).padStart(6)} frames, ${String(b.length).padStart(5)} over (${(b.length / rs.length * 100).toFixed(0)}%), worst ${Math.max(...rs.map(r => r.gap)).toFixed(1)}`); } };
show('by pose', r => r.pose);
show('by sim facing vs drawn facing', r => `face ${r.face > 0 ? 'right' : 'left'}, drawn ${r.drawnF > 0 ? 'right' : 'left'}${r.spin ? ', spinning' : ''}`);
show('by frames since the facing changed', r => r.since === 0 ? 'same frame' : r.since < 6 ? '1-5 frames' : r.since < 30 ? '6-29' : '30+');
show('by last move', r => r.last);
show('by where', r => r.where.replace(/ (move|shoot|standing|catch|pass|stance|dribble|drive|stepback|cross|btb|spin|hesi).*$/, ''));
if (bad.length) { console.log('\nworst frames:'); for (const r of bad.sort((a, b) => b.gap - a.gap).slice(0, 12)) console.log('  ' + JSON.stringify(r)); }
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out));
