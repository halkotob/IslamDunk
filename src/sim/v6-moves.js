// ================================================= v6.0: GAMEPLAY DEPTH
// Same six buttons, more basketball. The stick direction (relative to the hoop
// and your defender) decides which move comes out:
//   MOVE button (H)  + direction: crossover, behind-the-back, spin, step-back;
//                      no direction: hesitation; hold near the paint: post up
//   SHOOT (K)        tap = pump fake, hold = shot; the shot type comes from the
//                      situation (layup, euro, reverse, floater, fadeaway,
//                      pull-up, step-back, hook, putback)
//   PASS (J)         tap = chest pass, hold = lob, turbo = bounce pass,
//                      hold then tap SHOOT = pass fake; call it back = give-and-go
//   SKILL (I)        with the ball: call a screen from your partner
// Defense: hold MOVE = stance (mirror the handler, hands up), turbo + BLOCK =
// swipe block / chase-down (pins it on the glass from behind), steals read the
// dribble hand (reach across the body and it's a foul), box out by holding stance.
// Contact: bumps on drives, blocking fouls, and-ones, posterize knockdowns,
// post-up battles; the shove stays as a hard foul. Late game: composure under
// pressure, dives for loose balls, timeouts with set plays, fouling on purpose.
// Every player can use every move; a play style's signature version is stronger.

NS.push('fake', 'dive');                                   // appended only (online snapshots + replays)
GROUND_STATES.push('fake');

// ------------------------------------------------------------- helpers
function strOf(p) {                                        // strength for contact battles (1..10)
  const d = p.def || {}, s = p.st || {};
  let v = 5 + ((s.dnk || 5) - 5) * 0.35 + ((s.def || 5) - 5) * 0.25;
  if (d.look) v += ((d.look.build == null ? 1 : d.look.build) - 1) * 1.6 + ((d.look.height == null ? 1 : d.look.height) - 1) * 0.6;
  else if (d.bw != null) v += (d.bw - 1) * 1.6 + ((d.bh == null ? 1 : d.bh) - 1) * 0.6;          // career CPU bodies
  if (d.elder) v -= 1; if (d.arch === 'rimrunner' || d.arch === 'lockdown') v += 0.6;
  return clamp(v, 1, 10);
}
function hoopDir(p) { const h = attackHoop(p.team), fx = h.x - p.x, fz = h.z - p.z, F = Math.hypot(fx, fz) || 1; return { h, fx: fx / F, fz: fz / F, px: -fz / F, pz: fx / F, d: F }; }
function liveGame() { return M.phase === 'live' && !M.practice && !M.attract && !M.mini; }
function popOnce(p, key, txt, col, cd = 1.2) { p.popT = p.popT || {}; if ((p.popT[key] || -9) + cd > M.time) return; p.popT[key] = M.time; FX.pop(p.x, p.y + 140, p.z, txt, col); }

// ------------------------------------------------------------- defensive memory
// Repeat the same move or shot and the CPU defense starts sitting on it, on every
// difficulty (Easy needs more repeats). Mixing it up is the skill.
const MOVE_LABEL = { cross: 'CROSSOVER', btb: 'BEHIND THE BACK', spin: 'SPIN', hesi: 'HESITATION', stepback: 'STEP-BACK', drop: 'DROP STEP', fake: 'PUMP FAKE',
  euro: 'EURO STEP', fade: 'FADEAWAY', floater: 'FLOATER', hook: 'HOOK', bake: 'SHEIKH AND BAKE', layup: 'LAYUP', reverse: 'REVERSE', pullup: 'PULL-UP', jumper: 'JUMPER', putback: 'PUTBACK', upunder: 'UP AND UNDER', gg: 'GIVE AND GO' };
function defLevel() { return M.career && M.careerL != null ? M.careerL : ({ veryeasy: -1, easy: 0, medium: 1, hard: 2 }[SETTINGS.difficulty] || 1); }
function readN() { const L = defLevel(); return L < 0.7 ? 5 : L < 1.6 ? 4 : 3; }
function logMove(p, k) {
  if (!M.time && M.time !== 0) return;
  const L = p.mvLog = (p.mvLog || []).filter(e => M.time - e.t < 35); L.push({ t: M.time, k });
  p.reads = p.reads || {};
  if (p.human >= 0 && !M.practice && !M.mini && aiReads(p) && L.filter(e => e.k === k).length >= readN() && !(p.reads[k] > M.time) && !['jumper', 'layup', 'pullup'].includes(k)) {
    p.reads[k] = M.time + 25; p.mvLog = L.filter(e => e.k !== k);
    FX.pop(p.x, p.y + 150, p.z, 'DEFENSE IS READING THE ' + (MOVE_LABEL[k] || k.toUpperCase()), '#8fe3ff');
  }
}
logSig = logMove;
aiReads = function (p) { return !!(p.opps && p.opps.some(o => o.human < 0)); };
beingRead = function (p, k) { return !!(p.reads && p.reads[k] > M.time) && aiReads(p); };

// ------------------------------------------------------------- composure + pressure
// Composure (0-100, starts at 50) rises with good decisions and falls with bad
// ones. Under pressure (clutch time, road games, big stages, rivals, scenarios)
// it widens or shrinks your green window. Clutch is earned during the game.
function compAdd(p, n) { if (!p || M.practice || M.attract || M.mini) return; p.comp = clamp((p.comp == null ? 50 : p.comp) + n, 0, 100); }
function pressureOf(p) {
  if (!M.fmt || !M.teams || M.practice || M.attract || M.mini) return 0;
  let P = 0;
  const margin = Math.abs(M.teams[0].score - M.teams[1].score);
  const late = M.fmt.first21 ? Math.max(M.teams[0].score, M.teams[1].score) >= Math.round((M.fmt.target || 21) * 0.72) : M.quarter >= M.fmt.periods && M.clock <= 120;
  if (clutchTime()) P += 0.6; else if (late && margin <= 8) P += 0.25;
  if (M.career && p.team === 0) { if (M.cRoad) P += 0.12; P += 0.05 * (M.careerStage || 0); if (M.careerOpp === 1) P += 0.1; }
  if (M.scenario) P += 0.3;
  if (M.teams[1 - p.team].score - M.teams[p.team].score >= 8) P += 0.1;
  if (M.phase === 'ft') P += 0.1;
  return clamp(P, 0, 1);
}
function compK(p) { return clamp(1 + pressureOf(p) * ((p.comp == null ? 50 : p.comp) - 50) / 100 * 0.9, 0.72, 1.3); }

// ------------------------------------------------------------- dribble moves
const MOVE_INFO = {
  cross: { dur: 0.34, cost: 6, ank: 0.22 }, btb: { dur: 0.36, cost: 7, ank: 0.2 }, spin: { dur: 0.42, cost: 10, ank: 0.26 },
  hesi: { dur: 0.46, cost: 4, ank: 0.18 }, stepback: { dur: 0.24, cost: 8, ank: 0.16 }, drop: { dur: 0.38, cost: 8, ank: 0.26 }
};
function classifyMove(p, mx, mz) {
  const L = Math.hypot(mx, mz), H = hoopDir(p);
  if (L < 0.3) return { kind: 'hesi', side: 1 };
  const ux = mx / L, uz = mz / L, a = ux * H.fx + uz * H.fz, side = sgn(ux * H.px + uz * H.pz) || 1;
  if (p.postUp) return { kind: 'drop', side };
  if (a < -0.75) return { kind: 'stepback', side };
  if (a < -0.2) return { kind: 'btb', side };
  const def = nearestOpp(p);
  if (a > 0.6 && def && dxz(def, p) < 80 && dxz(def, H.h) < H.d) return { kind: 'spin', side: sgn((p.x - def.x) * H.px + (p.z - def.z) * H.pz) || side };
  return { kind: 'cross', side };
}
function startDribbleMove(p, kind, side = 1) {
  if (ball.owner !== p || p.state !== 'free' || (p.cd.mv || 0) > 0 || p.mv) return false;
  const I = MOVE_INFO[kind]; if (!I) return false;
  p.combo = M.time - (p.mvEnd == null ? -9 : p.mvEnd) < 0.75 ? (p.combo || 0) + 1 : 0;
  const cost = I.cost + p.combo * 2, weak = !p.fire && p.turbo < cost * 0.5;
  if (!p.fire) p.turbo = Math.max(0, p.turbo - cost);
  p.fat = clamp((p.fat || 0) + 0.04 + p.combo * 0.02, 0, 1);
  const sig = sigKind(p.def) === kind;
  p.mv = { kind, side, t: 0, dur: I.dur, k: (weak ? 0.6 : 1) * (sig ? 1.2 : 1), sig, resolved: false };
  p.cd.mv = 0.42; p.cd.cross = Math.max(p.cd.cross || 0, 0.42);
  if (kind === 'postUp') p.postUp = null;
  if (kind === 'drop') p.postUp = null;
  if (kind === 'cross' || kind === 'btb') { p.move = { type: kind === 'btb' ? 'btb' : 'xover', t: 0, dur: 0.3, from: p.dh, to: p.dh === 'n' ? 'f' : 'n' }; }
  SFX.squeak(); logMove(p, kind);
  if (p.human >= 0) FX.pop(p.x, p.y + 132, p.z, (sig ? '★ ' : '') + MOVE_LABEL[kind] + (p.combo >= 2 ? '  x' + (p.combo + 1) : ''), sig ? '#ffd76a' : '#ffffff');
  if (p.combo >= 2 && isMine(p)) Ach.unlock('combo_3');
  return true;
}
function resolveAnkles(p) {
  const mv = p.mv, I = MOVE_INFO[mv.kind], H = hoopDir(p), read = beingRead(p, mv.kind);
  for (const o of p.opps) {
    if (o.state !== 'free' || o.y > 2 || dxz(o, p) > 80) continue;
    const ov = Math.hypot(o.vx || 0, o.vz || 0);
    let lean;
    if (mv.kind === 'hesi') lean = clamp(ov / 220, 0, 1);
    else if (mv.kind === 'stepback') lean = clamp(((o.vx || 0) * (p.x - o.x) + (o.vz || 0) * (p.z - o.z)) / ((dxz(o, p) || 1) * 200), -1, 1);
    else lean = clamp(-((o.vx || 0) * H.px * mv.side + (o.vz || 0) * H.pz * mv.side) / 200, -1, 1);
    let pr = I.ank + (p.st.spd - o.st.def) * 0.03 + lean * 0.25 + p.combo * 0.05 + (o.fat || 0) * 0.1 - (o.stance ? 0.12 : 0) + (mv.sig ? 0.1 : 0);
    if (read) pr *= 0.25;
    if (chance(clamp(pr, 0.03, 0.65))) {
      if (mv.kind === 'hesi' || mv.kind === 'spin' || mv.kind === 'drop') o.stumble = Math.max(o.stumble || 0, mv.kind === 'hesi' ? 0.32 : 0.42);
      else { o.shook = 0.35 + (p.combo ? 0.12 : 0); o.shookDir = mv.kind === 'stepback' ? { x: H.fx, z: H.fz } : { x: -H.px * mv.side, z: -H.pz * mv.side }; }
      AchEvents.ankles(p); compAdd(p, 2);
      if (p.combo >= 1 || mv.sig) FX.callout(p.combo >= 2 ? 'ANKLES!' : 'CROSSED UP!', '#ffffff', MOVE_LABEL[mv.kind]);
    } else if (read && o.human < 0) popOnce(o, 'read', 'READ IT', '#8fe3ff');
  }
}
function moveStep(p, dt) {
  const mv = p.mv; if (!mv) return;
  if (ball.owner !== p || (p.state !== 'free' && p.state !== 'fake')) { p.mv = null; p.spin = 0; p.mvEnd = M.time; return; }
  mv.t += dt; const u = clamp(mv.t / mv.dur, 0, 1), k = Math.sin(Math.PI * u) * mv.k, H = hoopDir(p);
  let lat = 0, fwd = 0;
  if (mv.kind === 'cross') { lat = 175; fwd = 70; }
  else if (mv.kind === 'btb') { lat = 155; fwd = 15; }
  else if (mv.kind === 'spin' || mv.kind === 'drop') { lat = 110; fwd = 250; p.spin = u * Math.PI * 2 * (mv.kind === 'drop' ? 0.5 : 1); }
  else if (mv.kind === 'stepback') { fwd = -300 * (u < 0.7 ? 1 : 0.3); }
  else if (mv.kind === 'hesi') { if (u < 0.4) { p.vx *= 0.82; p.vz *= 0.82; } else fwd = 240 * Math.sin(Math.PI * (u - 0.4) / 0.6) * mv.k; }
  const kk = mv.kind === 'hesi' ? 1 : k;
  p.x += (H.px * mv.side * lat + H.fx * fwd) * kk * dt; p.z = clamp(p.z + (H.pz * mv.side * lat + H.fz * fwd) * kk * dt, 8, COURT.D - 8);
  if (mv.kind === 'cross' || mv.kind === 'btb') p.leanX = mv.side * k;
  if (!mv.resolved && u > 0.4) { mv.resolved = true; resolveAnkles(p); }
  if (u >= 1) { p.mv = null; p.spin = 0; p.mvEnd = M.time; if (mv.kind === 'stepback') p.stepT = M.time; }
}

// ------------------------------------------------------------- post-ups
function postEligible(p) { const H = hoopDir(p), o = nearestOpp(p); return H.d > 60 && H.d < 240 && o && dxz(o, p) < 80; }
function enterPost(p) { p.postUp = { t: 0 }; p.mv = null; FX.pop(p.x, p.y + 132, p.z, 'POST UP', '#ffffff'); SFX.squeak(); logMove(p, 'post'); }
function postStep(p, dt) {
  const pu = p.postUp; if (!pu) return;
  const c = p.cmd, H = hoopDir(p);
  const holding = p.human >= 0 ? c.xHeld : (pu.cpu > 0);
  if (ball.owner !== p || p.state !== 'free' || !holding || pu.t > 4.5) { p.postUp = null; return; }
  pu.t += dt; if (pu.cpu > 0) pu.cpu -= dt;
  p.face = -sgn(H.h.x - p.x) || p.face;                          // back to the basket
  const o = nearestOpp(p);
  const toward = Math.hypot(c.mx, c.mz) > 0.3 ? (c.mx * H.fx + c.mz * H.fz) / Math.hypot(c.mx, c.mz) : (p.human < 0 ? 0.8 : 0);
  if (o && dxz(o, p) < 36 && dxz(o, H.h) < H.d && toward > 0.3) {     // backing him down: strength decides who gives ground
    const diff = strOf(p) - strOf(o) + 1 + (c.turbo && p.turboOK() ? 1.2 : 0) - (o.stance ? 0.8 : 0);
    const push = clamp(diff, -2, 4) * 6 * dt;
    if (push > 0) { o.x += H.fx * push; o.z = clamp(o.z + H.fz * push, 8, COURT.D - 8); }
    p.x += H.fx * Math.max(0, push) * 0.9; p.z = clamp(p.z + H.fz * Math.max(0, push) * 0.9, 8, COURT.D - 8);
    if (c.turbo && p.turboOK() && !p.fire) p.turbo = Math.max(0, p.turbo - 12 * dt);
    if ((pu.bumpT = (pu.bumpT || 0) - dt) <= 0) { pu.bumpT = 0.55; SFX.thud && SFX.thud(0.25); FX.dust(o.x, o.z, 1); }
  }
}

// ------------------------------------------------------------- shots
const TYPE_JUMP = { layup: 330, reverse: 330, upunder: 320, putback: 300, floater: 250, hook: 300, fade: JUMP_VY * 1.12, euro: 270, gg: 330 };
const TYPE_SPACE = { fade: 16, floater: 7, euro: 11, stepback: 10, hook: 14, reverse: 12, upunder: 18, putback: 4, pullup: -8, gg: 14, bake: 18 };
const SIG_SPACE = { fade: 26, floater: 10, euro: 18, stepback: 16, hook: 22, bake: 24 };
const TYPE_WIN = { layup: 1.5, reverse: 1.35, upunder: 1.45, putback: 1.3, gg: 1.5, hook: 1.15, floater: 1.1, fade: 0.95, pullup: 0.88, euro: 1.3 };
const LAYUP_TYPES = new Set(['layup', 'reverse', 'upunder', 'putback', 'gg', 'euro']);
function classifyShot(p) {
  const c = p.cmd, H = hoopDir(p), d = H.d, sp = Math.hypot(p.vx || 0, p.vz || 0), mL = Math.hypot(c.mx || 0, c.mz || 0);
  const appr = sp > 1 ? ((p.vx || 0) * H.fx + (p.vz || 0) * H.fz) / sp : 0;
  const stick = mL > 0.3 ? (c.mx * H.fx + c.mz * H.fz) / mL : 0, lat = mL > 0.3 ? Math.abs(c.mx * H.px + c.mz * H.pz) / mL : 0;
  let k;
  if (p.orebT && M.time - p.orebT < 0.8 && d < 150) k = 'putback';
  else if (p.postUp) k = stick < -0.4 ? 'fade' : 'hook';
  else if (d < 165 && ((appr > 0.35 && sp > 110) || d < 95)) {
    const behind = (p.x - H.h.x) * H.h.dir < 30 && Math.abs(p.z - H.h.z) > 22;
    if (p.ggRecv && M.time - p.ggRecv < 1.4) k = 'gg';
    else if (p.fakeBit && M.time - (p.fakeT || -9) < 0.9) k = 'upunder';
    else if (behind) k = 'reverse';
    else if (lat > 0.7 && d > 70 && p.human >= 0) k = 'euro';
    else k = 'layup';
  }
  else if (d < 270 && appr > 0.5 && sp > 140 && !c.turbo) k = 'floater';
  else if (stick < -0.5 && d > 110 && d < 340) k = 'fade';
  else if (p.stepT && M.time - p.stepT < 0.6) k = 'stepback';
  else if (sp > 150) k = 'pullup';
  else k = 'jumper';
  const sk = sigKind(p.def);
  if (sk === 'bake' && p.fakeT && M.time - p.fakeT < 0.9 && (k === 'fade' || k === 'jumper' || k === 'pullup')) k = 'bake';
  return k;
}
function applyShotType(p, k) {
  if (k === sigKind(p.def)) { p.sigShot = k; p.shotType = null; } else { p.shotType = k; }
  if (k === 'fade' || k === 'bake') { const H = hoopDir(p); p.fadeVx = -H.fx * 115; p.fadeVz = -H.fz * 40; }
  logMove(p, k);
  if (p.human >= 0 && !['jumper', 'layup', 'pullup'].includes(k)) FX.pop(p.x, p.y + 132, p.z, (p.sigShot ? '★ ' + SIG_NAMES[k] : MOVE_LABEL[k]), p.sigShot ? '#ffd76a' : '#ffffff');
  if (k === 'gg') FX.callout('GIVE AND GO!', '#bfffcf', p.def.name.toUpperCase());
}
function startEuro(p) {
  const H = hoopDir(p), def = nearestOpp(p);
  p.sig = { kind: 'euro', t: 0, def, side: def ? (sgn((p.x - def.x) * H.px + (p.z - def.z) * H.pz) || 1) : 1 };
  p.state = 'sig'; p.st_t = 0; p.face = sgn(H.h.x - p.x);
  p.move = { type: 'xover', t: 0, dur: 0.3, from: p.dh, to: p.dh === 'n' ? 'f' : 'n' };
  logMove(p, 'euro'); FX.pop(p.x, p.y + 132, p.z, sigKind(p.def) === 'euro' ? '★ EURO STEP' : 'EURO STEP', sigKind(p.def) === 'euro' ? '#ffd76a' : '#ffffff'); SFX.squeak();
}
{
  const _ss = startShot;
  startShot = function (p) {
    if (p.sigShot && p.sigShot !== sigKind(p.def)) { p.shotType = p.sigShot; p.sigShot = null; }   // any move, non-signature version
    _ss(p);
    if (p.state === 'windup' && p.human >= 0) p.windT = M.phase === 'ft' ? 0.1 : 0.13;
    if (p.shotType && TYPE_JUMP[p.shotType]) p.jumpVy = TYPE_JUMP[p.shotType];
    if (p.human < 0) p.ai.relT = apexT(p) + gauss() * aiCfg(p.team).relErr * (2 - compK(p));
  };
  const _sw = shotWindow;
  shotWindow = function (p, x = p.x, z = p.z) { return _sw(p, x, z) * (p.human >= 0 ? compK(p) : 1) * (TYPE_WIN[p.shotType] || 1); };
  sigContestBonus = function (p) { if (p.sigShot) return beingRead(p, p.sigShot) ? 0 : (SIG_SPACE[p.sigShot] || 0); if (p.shotType) return beingRead(p, p.shotType) ? 0 : (TYPE_SPACE[p.shotType] || 0); return 0; };
}

// ------------------------------------------------------------- pump fake
function startFake(p) {
  p.state = 'fake'; p.st_t = 0; p.fakeT = M.time; p.fakeBit = false; p.vx *= 0.3; p.vz *= 0.3;
  logMove(p, 'fake'); SFX.squeak();
  const read = beingRead(p, 'fake'), base = defLevel() < 0.7 ? 0.55 : defLevel() < 1.6 ? 0.4 : 0.28;
  for (const o of p.opps) {
    if (o.state !== 'free' || o.y > 1 || dxz(o, p) > 130) continue;
    if (o.human >= 0) continue;                                   // a human defender bites on his own
    if (chance(base * (read ? 0.25 : 1) * (o.stance ? 0.8 : 1) * (dxz(o, p) < 70 ? 1 : 0.55))) { o.ai.jumpAt = -1; startJump(o); o.bitT = M.time; p.fakeBit = true; if (humanIn(p, o)) popOnce(o, 'bit', 'BIT ON THE FAKE', '#ffffff'); }
  }
}
function fakeStep(p) {
  if (p.state !== 'fake') return;
  if (p.fakeKind !== 'pass') for (const o of p.opps) if (o.state === 'jump' && dxz(o, p) < 130 && !p.fakeBit && o.st_t < 0.15) { p.fakeBit = true; }   // human defender left his feet
  if (p.st_t > 0.3) { p.state = 'free'; p.st_t = 0; p.fakeKind = null; }
}

// ------------------------------------------------------------- passing
function pairChemK(a, b) { return M.career && C && a && b && a.team === 0 && b.team === 0 ? chemOf(C.partner) / 100 : 0; }
{
  const _dp = doPass;
  doPass = function (p, to, alley) {
    if (!to || to.state === 'down') return;
    const k = pairChemK(p, to), old = p.st.pas;
    if (k) p.st.pas = (old == null ? 5 : old) + 3 * k;          // chemistry: quicker passes between partners
    _dp(p, to, alley);
    if (k) p.st.pas = old;
    if (ball.pass) { ball.pass.chemK = k; ball.pass.gg = !!to.ggPending && M.time - to.ggPending < 2.6; }
    p.lastPassOut = M.time; if (p.human >= 0 && to.human < 0) p.ggT = M.time;
  };
  const _cp = catchPass;
  catchPass = function (to, pa) { _cp(to, pa); if (pa.gg) { to.ggRecv = M.time; to.ggPending = null; popOnce(to, 'gg', 'GIVE AND GO', '#bfffcf'); } };
}
function lobPass(p, to) {
  const hand = handsMid(p), d = Math.hypot(to.x - hand.x, to.z - hand.z), T = 0.36 + d / 950;
  const tx = to.x + (to.vx || 0) * T, tz = to.z + (to.vz || 0) * T, ty = to.y + 70;
  p.passKind = 'lob'; releaseForPass(p, hand);
  ball.vx = (tx - ball.x) / T; ball.vz = (tz - ball.z) / T; ball.vy = (ty - ball.y + 0.5 * grav() * T * T) / T;
  ball.pass = { from: p, to, t: 0, T, alley: false, kind: 'lob', lob: true, bounced: false, tried: new Set(), chemK: pairChemK(p, to), gg: false };
  p.face = sgn(to.x - p.x) || p.face; p.lastPassOut = M.time; if (to.human < 0) p.ggT = M.time;
}
function startPassInput(p) {
  const c = p.cmd, mate = c.passTo || p.mate; if (!mate || mate.state === 'down') return;
  if (autoAlley(p, mate)) { doPass(p, mate, true); return; }
  if (c.turbo && p.turboOK()) { p.forcePass = 'bounce'; doPass(p, mate, false); p.forcePass = null; return; }
  p.passHold = { t: 0, to: mate };
}
function passHoldStep(p, dt) {
  const ph = p.passHold; if (!ph) return;
  const c = p.cmd;
  if (ball.owner !== p || p.state !== 'free' || ph.to.state === 'down') { p.passHold = null; return; }
  ph.t += dt;
  if (c.b) { p.passHold = null; c.b = false; startPassFake(p, ph.to); return; }   // hold PASS, tap SHOOT: pass fake
  if (!c.aHeld || ph.t > 0.55) { p.passHold = null; if (ph.t < 0.2) doPass(p, ph.to, false); else lobPass(p, ph.to); }
}
function startPassFake(p, to) {
  if (!to) return;                                   // nobody to fake to (1 on 1)
  p.state = 'fake'; p.fakeKind = 'pass'; p.st_t = 0; logMove(p, 'pfake'); FX.pop(p.x, p.y + 132, p.z, 'PASS FAKE', '#ffffff'); SFX.swipe();
  for (const o of p.opps) {
    if (o.human >= 0 || o.state !== 'free') continue;
    const s = segDist(o.x, o.z, p.x, p.z, to.x, to.z);
    if (s.d < 90 && s.t > 0 && s.t < 1 && chance(beingRead(p, 'pfake') ? 0.15 : 0.5)) { o.shook = 0.4; const L = Math.hypot(to.x - p.x, to.z - p.z) || 1; o.shookDir = { x: (to.x - p.x) / L, z: (to.z - p.z) / L }; popOnce(o, 'bitp', 'BIT', '#ffffff'); }
  }
}

// ------------------------------------------------------------- screens
function callScreen(p) {
  const mate = p.mate; if (!mate || (p.cd.scr || 0) > 0) return false;
  p.cd.scr = 3;
  if (mate.human >= 0) { FX.pop(mate.x, mate.y + 140, mate.z, 'SET A SCREEN!', '#ffd76a'); return true; }
  const tgt = p.opps.find(o => o.ai && o.ai.plan && o.ai.plan.man === p) || nearestOpp(p);
  if (!tgt) return false;
  mate.ai.plan = { type: 'screen', target: tgt, u: 1, t0: M.time, called: true, ctx: 'off' }; mate.ai.t = 2.2;
  FX.pop(mate.x, mate.y + 140, mate.z, 'SCREEN!', '#ffd76a'); SFX.blip();
  return true;
}
function screenStep() {
  if (!liveGame() && !(M.practice && M.practice.kind === '1v1')) return;
  for (const s of M.players) {
    if (ball.owner === s || s.state !== 'free' || s.y > 1) continue;
    if (!ball.owner || ball.owner.team !== s.team) continue;
    if (Math.hypot(s.vx || 0, s.vz || 0) > 70) continue;           // a moving screen is just a collision
    for (const o of s.opps) {
      const d = dxz(o, s), ov = Math.hypot(o.vx || 0, o.vz || 0);
      if (d > 30 || ov < 80 || o.state !== 'free' || (o.scrCd || 0) > M.time) continue;
      if (((o.vx || 0) * (s.x - o.x) + (o.vz || 0) * (s.z - o.z)) < 0.3 * ov * d) continue;
      o.scrCd = M.time + 0.9;
      const k = 1 + 0.5 * pairChemK(s, ball.owner), fight = o.stance && o.cmd.turbo && o.turboOK();
      if (fight) { o.vx *= 0.6; o.vz *= 0.6; if (!o.fire) o.turbo = Math.max(0, o.turbo - 15); popOnce(o, 'scr', 'FOUGHT THROUGH', '#8fe3ff'); }
      else {
        o.vx *= 0.2; o.vz *= 0.2; o.stumble = Math.max(o.stumble || 0, (0.22 + clamp(strOf(s) - strOf(o), -2, 3) * 0.03) * k);
        if (humanIn(o, s, ball.owner)) popOnce(o, 'scr', 'SCREENED', '#8fe3ff'); s.screenHit = M.time; SFX.thud && SFX.thud(0.35);
      }
    }
  }
}
