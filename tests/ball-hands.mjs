// v9.19.1 the ball stays in his hands (tests/run.mjs registers them; fast tier):
//   ball-hands   every frame a player holds the ball, drawn on the canvas: the gap from the ball to the nearer drawn hand
//                (tools/ball-hands-lib.mjs; a dribble counts only sideways, a hand-to-hand move isn't held mid-move).
//                Scripted plays as you, in a match facing each way (desktop) and in the gym (phone size): stance,
//                dribbling, step-back, crossover, behind-the-back, spin, hesitation, the drop step, a catch, a pass, a
//                shot after each, layups (roll, bank, reverse, euro), a drive, a free throw; then 40 s of a seeded CPU game (dunks, layups, rebounds, steals).
//                0 frames more than 20 units from a hand
//                And the report's case: move left (away from the hoop), stop, turn and shoot toward it, and shoot out of
//                a step-back with the stick still held away: every windup frame within 20 units of a hand, facing each way
import { BALL_HANDS_JS } from '../tools/ball-hands-lib.mjs';
const PHONE = { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
// the in-page plays: returns the measured rows
const PLAYS = `(async ({ gym, team, tag, cpu }) => {
  const rows = [], B = window.__bh, keyB = (BINDS[0].b || [])[0];
  window.requestAnimationFrame = () => 0;
  const step = (n, t) => { for (let i = 0; i < n; i++) { snapPrev(); updateMatch(STEP); B.frame++; Input.pressed = {}; Input.released = {}; updateCamera(STEP); if (ball.owner) { const r = B.measure(t); if (r) rows.push(r); } } };
  const stick = (ax, az) => { Input.stick.ax = ax; Input.stick.az = az; };
  const shoot = t => { Input.down[keyB] = true; Input.pressed[keyB] = true; step(20, t); Input.down[keyB] = false; Input.released[keyB] = true; step(36, t); };
  if (cpu) {
    window.__seed(901); newMatch(TEAMS[3], TEAMS[6], { humans: [], fmt: { format: 'quarters', len: 45 } }); Game.screen = 'play'; M.introT = 0; for (const q of M.players) q.hifzUsed = true;
    for (let n = 0; n < 60 * 40; n++) { snapPrev(); updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; B.frame++; if (ball.owner && n % 2 === 0) { updateCamera(STEP); const r = B.measure(tag); if (r) rows.push(r); } }
    return rows;
  }
  window.__seed(77); Input.down = {}; Input.pressed = {}; Input.released = {}; stick(0, 0);
  if (gym) { C = freshCareer(); C.name = 'Gym'; C.bracket = makeBracket(0); C.seen.intro = true; saveCareer(); enterGym(); }
  else { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0; for (let i = 0; i < 600 && M.phase !== 'live'; i++) snapPrev(); updateMatch(STEP); }
  const me = M.players.find(q => q.human === 0); for (const q of M.players) { q.hifzUsed = true; if (q !== me) q._frozen = true; }
  const _u = Brain.prototype.update; Brain.prototype.update = function () { if (this.p._frozen) { const c = this.p.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = c.bHeld = false; return; } return _u.apply(this, arguments); };
  const h = () => attackHoop(me.team);
  const give = () => { giveBall(me); place(me, h().x + h().dir * 330, h().z + 30); me.state = 'free'; M.phase = 'live'; M.clock = 500; M.shotClock = 24; me.st = Object.assign({}, me.st, { spd: 7, pas: 7, dnk: 7 }); };
  // the report's case: move away from the hoop, stop, shoot; and a step-back with the stick still held away
  for (const t of [0, 6]) { give(); stick(-h().dir, 0); step(30, tag + ' move away'); stick(0, 0); step(t, tag + ' stop'); shoot(tag + ' shoot after moving away'); }
  // and straight out of a step-back or a spin with the stick still held away, at a few moments in and after the move
  for (const kind of ['stepback', 'spin']) for (const at of [8, 14, 20, 28]) { give(); stick(-h().dir, 0); step(4, tag); startDribbleMove(me, kind, 1); step(at, tag + ' ' + kind + ' held'); shoot(tag + ' shoot out of a held step-back'); stick(0, 0); step(20, tag); }
  // each move, then a shot
  for (const kind of ['cross', 'btb', 'spin', 'hesi', 'stepback', 'drop']) { give(); stick(h().dir, 0); step(8, tag); startDribbleMove(me, kind, 1); step(26, tag + ' ' + kind); stick(0, 0); shoot(tag + ' shoot after ' + kind); }
  // layups: roll, bank, reverse, euro (the ball eases from the gather into the shooting hand)
  for (const [kind, dx, dz] of [['roll', 120, 0], ['bank', 110, 70], ['reverse', 10, 40], ['euro', 185, 10]]) { give(); place(me, h().x + h().dir * dx, h().z + dz); startLayup(me, kind); step(70, tag + ' layup ' + kind); }
  // stance, dribbling both ways, a drive to the rim, a catch, a pass
  give(); step(40, tag + ' stance'); for (const d of [-1, 1]) { stick(d, 0); step(40, tag + ' dribble'); } stick(0, 0);
  give(); place(me, h().x + h().dir * 250, h().z); stick(-h().dir, 0); Input.down.ShiftLeft = true; step(70, tag + ' drive'); Input.down.ShiftLeft = false; stick(0, 0); step(30, tag);
  if (me.mate) { me.mate._frozen = true; giveBall(me.mate); me.mate.state = 'free'; doPass(me.mate, me); step(50, tag + ' catch'); shoot(tag + ' catch and shoot'); give(); doPass(me, me.mate); step(24, tag + ' pass'); }
  if (!gym && typeof foulShots === 'function') { foulShots(me.opps[0], me, 1, 'FOUL'); for (let i = 0; i < 300 && M.phase === 'ft'; i++) { step(1, tag + ' free throw'); if (ball.owner === me && i % 40 === 20) { Input.down[keyB] = true; Input.pressed[keyB] = true; step(20, tag + ' free throw'); Input.down[keyB] = false; Input.released[keyB] = true; } } }
  stick(0, 0); Input.down = {};
  return rows;
})`;
export function ballHandsTests({ newContext, open }) {
  const T = {};
  // a plain page (the tool's own setup: the runner's page hooks draw extra things the probe would count)
  const runIn = async (browser, base, device, args, errs) => {
    const ctx = await browser.newContext(device || { viewport: { width: 1280, height: 720 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
    await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} })();`);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(args.tag + ': ' + e.message));
    await p.goto(base + '/?nowelcome=1'); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 }); await p.waitForTimeout(600);
    await p.evaluate(BALL_HANDS_JS);
    const rows = await p.evaluate(`${PLAYS}(${JSON.stringify(args)})`);
    await ctx.close(); return rows;
  };
  T['ball-hands'] = async ({ browser, base }) => {
    const errs = [], runs = [[null, { gym: false, team: 0, tag: 'match, facing right' }], [null, { gym: false, team: 1, tag: 'match, facing left' }],
      [PHONE, { gym: true, team: 0, tag: 'gym, phone' }], [PHONE, { cpu: true, tag: 'CPU game, phone' }]];
    const rows = [];
    for (let i = 0; i < runs.length; i += 2) for (const r of await Promise.all(runs.slice(i, i + 2).map(([d, a]) => runIn(browser, base, d, a, errs)))) rows.push(...r);   // (two pages at a time)
    const bad = rows.filter(r => r.gap > 20), poses = new Set(rows.map(r => r.pose.split('/')[0])), faces = new Set(rows.map(r => r.face));
    const worst = rows.reduce((a, r) => r.gap > a.gap ? r : a, { gap: 0 });
    // the report's case: moving away from the hoop, stopping and shooting, or shooting out of a step-back with the stick held away; each facing
    const rep = {}; for (const [f, k] of [[1, 'right'], [-1, 'left']]) { const w = rows.filter(r => r.st === 'windup' && r.face === f && / (shoot after moving away|shoot out of a held step-back)$/.test(r.where)); rep[k] = { n: w.length, over: w.filter(r => r.gap > 20).length, worst: Math.max(0, ...w.map(r => r.gap)) }; }
    const ok = rows.length > 2000 && !bad.length && faces.size === 2 && Object.values(rep).every(o => o.n > 20 && o.over === 0)
      && ['stance', 'dribble-run', 'windup:jumper', 'shoot:jumper', 'mv:stepback', 'move:cross', 'move:btb', 'mv:drop', 'dunk', 'pass', 'shoot:lay-'].every(k => [...poses].some(x => x.startsWith(k))) && !errs.length;
    const by = {}; for (const r of bad) by[r.pose] = (by[r.pose] || 0) + 1;
    return { ok, detail: [`${rows.length} held frames, ${bad.length} more than 20 units from a hand; worst ${worst.gap} (${worst.pose || '-'}, ${worst.where || ''})`,
      `the report's case, windup frames facing right / left: ${JSON.stringify(rep)}`, `poses: ${[...poses].sort().join(', ')}`, bad.length ? 'over: ' + JSON.stringify(by) : '', ...errs] };
  };
  return T;
}
