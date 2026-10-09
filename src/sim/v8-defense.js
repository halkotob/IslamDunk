
// ================================================= v8.1: THE DEFENSE BUTTON
// On defense the MOVE button (H / Numpad 0 / touch) is DEFEND, and L (Numpad 3 for player 2) is a
// dedicated DEFEND key. It replaces the old hold-PASS stance:
//   hold DEFEND  you lock onto your man (the ball handler if you're the closer defender, else the
//                other one) and the game moves you: between him and the rim, an arm's length off
//                the ball, a step further off the ball. You keep pace with him, so he can't simply
//                run past you; a dribble move or a screen still can. Running a quick man costs
//                stamina, like sprinting. Moving the stick while you hold adds a lean.
//                Feet set in his path = a charge when he drives into you.
//                On a shot or loose ball, holding DEFEND boxes out.
//   hold PASS    call the double team (was on MOVE)
// Tap PASS (steal), SHOOT (jump, block, contest) and sprint + PASS (shove) are unchanged.
const DEF_KEYS = [['KeyL'], ['Numpad3', 'Slash']];
const GUARD_ON = 36, GUARD_OFF_MIN = 46, GUARD_OFF_MAX = 120;
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    _hc.apply(this, arguments);
    const k = DEF_KEYS[pad] || [];
    if (k.some(x => Input.down[x])) c.xHeld = true;
    if (k.some(x => Input.pressed[x])) c.x = true;
  };
}
function defCtx(p) {
  const bo = ball.owner;
  if (bo) return bo === p ? 'ball' : bo.team === p.team ? 'off' : 'def';
  if (ball.pass) return ball.pass.from.team === p.team ? 'off' : 'def';
  return 'reb';
}
// the man you guard: the ball (or the pass target) if you're the closer of the two defenders
function guardPick(p) {
  const bm = ball.owner && ball.owner.team !== p.team ? ball.owner : ball.pass && ball.pass.to && ball.pass.to.team !== p.team ? ball.pass.to : null;
  if (!bm) { let best = null, bd = 1e9; for (const o of p.opps) { const d = dxz(o, p); if (d < bd) { bd = d; best = o; } } return best; }
  const mate = p.mate, h = defendHoop(p.team), cur = p.v8 && p.v8.man, other = p.opps.find(o => o !== bm) || bm;
  if (!mate || mate.state === 'down') return bm;
  // your partner already has the ball covered (on him, between him and the rim) and you're away: take the other man
  if (dxz(mate, bm) < 70 && dxz(mate, h) < dxz(bm, h) && dxz(p, bm) > 130) return other;
  // a pass to the man your partner is on: stay with yours unless you're clearly closer (no scramble on every pass)
  if (cur && cur !== bm && cur.team !== p.team && dxz(mate, bm) + 40 < dxz(p, bm)) return cur;
  return bm;
}
// your CPU partner takes whoever you aren't guarding
{
  const _td = Brain.prototype.thinkDefense;
  Brain.prototype.thinkDefense = function () {
    _td.apply(this, arguments);
    const p = this.p, hum = p.mate && p.mate.human >= 0 ? p.mate : null, G = hum && hum.v8;
    if (!G || !G.held || !G.man || !this.plan || !this.plan.man || this.plan.man !== G.man) return;
    const other = p.opps.find(o => o !== G.man); if (!other) return;
    this.plan = ball.owner === other ? { type: 'guardBall', man: other } : { type: 'deny', man: other };
  };
}
{
  const _v7 = v7Input;
  v7Input = function (p, dt) {
    const c = p.cmd, ctx = defCtx(p), D = p.v8 || (p.v8 = {});
    D.held = (ctx === 'def' || ctx === 'reb') && !!c.xHeld;
    if (ctx === 'def' || ctx === 'reb') { c.x = false; c.xHeld = false; }      // MOVE belongs to DEFEND here: no plant, no MOVE-held double
    _v7.apply(this, arguments);
    const V = p.v7 || {};
    c.stanceHeld = D.held;                                                     // stance and box-out now come from DEFEND
    // hold PASS on defense: double team (tap is still a steal)
    const dbl = !!(V.a && V.a.ctx === 'def' && c.aHeld && V.a.t >= DOUBLE_HOLD);
    if (dbl !== !!D.dbl) { doubleTeam(p, dbl); D.dbl = dbl; }
  };
}
function guardStep(p, dt) {
  const D = p.v8; if (!D) return;
  if (!D.held || defCtx(p) !== 'def' || p.state !== 'free' || p.y > 1) { D.man = null; D.pickT = 0; D.inPos = false; D.boost = false; return; }
  if (!D.man || D.man.team === p.team || D.man.state === 'down' || (D.pickT = (D.pickT || 0) - dt) <= 0) { D.man = guardPick(p); D.pickT = 0.35; }   // follows the ball as it moves
  const m = D.man; if (!m) return;
  const c = p.cmd, h = defendHoop(p.team), bo = ball.owner, onBall = m === bo;
  // you react a few frames behind him (less with a good defense rating)
  const lag = Math.round(clamp(5 - (st7(p, 'def') - 5) * 0.6, 2, 8)), r = m.hist[m.hist.length - 1 - lag] || m;
  const hd = Math.hypot(h.x - r.x, h.z - r.z) || 1, gap = onBall ? GUARD_ON + Math.max(0, hd - 430) * 0.25 : clamp(hd * 0.28, GUARD_OFF_MIN, GUARD_OFF_MAX);
  let tx = r.x + (h.x - r.x) / hd * gap, tz = r.z + (h.z - r.z) / hd * gap;
  if (!onBall) { const ref = bo || ball; tx += (ref.x - tx) * 0.15; tz += (ref.z - tz) * 0.15; }   // shade toward the ball
  const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
  c.turbo = false;
  const base = p.speed(), manSp = Math.hypot(m.vx || 0, m.vz || 0);
  const K = clamp(0.97 + (st7(p, 'def') - st7(m, 'spd')) * 0.02, 0.9, 1.06);
  let vmax = Math.max(base, (onBall ? manSp * K : manSp) + (dist > 70 ? 60 : 0));
  vmax = Math.min(vmax, base / (p.stance ? 0.84 : 1) * 1.5);                      // never faster than a full sprint
  D.boost = vmax > base * 1.05;
  if (D.boost) { if (p.turbo < 6 || p.winded) { vmax = base; D.boost = false; } else p.turbo = Math.max(0, p.turbo - 26 * dt); }
  const want = Math.min(vmax, dist / 0.09), lean = 0.35 * base;
  let vx = dist > 1 ? dx / dist * want : 0, vz = dist > 1 ? dz / dist * want : 0;
  vx += c.mx * lean; vz += c.mz * lean;                                          // the stick leans you (cheat a side)
  c.mx = vx / base; c.mz = vz / base;
  c.face = sgn(m.x - p.x) || p.face;
  D.inPos = dist < 26 && dxz(p, h) < dxz(m, h);
}
{
  const _ps = preStep;
  preStep = function (p, dt) { _ps.apply(this, arguments); if (p.human >= 0) guardStep(p, dt); };
}
// charges: a guard in position who isn't moving into the driver has legal guarding position, even
// while sliding with him (the old rule only counted a defender standing still)
{
  const _cc = chargeCheck;
  chargeCheck = function (dt) {
    const h = ball.owner, saved = [];
    if (h && h.state === 'free') for (const o of h.opps) {
      if (!o.v8 || !o.v8.inPos) continue;
      const tx = h.x - o.x, tz = h.z - o.z, d = Math.hypot(tx, tz) || 1, into = ((o.vx || 0) * tx + (o.vz || 0) * tz) / d;
      if (into < 30 && Math.hypot(o.vx || 0, o.vz || 0) < 120) { saved.push([o, o.vx, o.vz]); o.vx = 0; o.vz = 0; }       // counts as set for the check
    }
    try { return _cc.apply(this, arguments); } finally { for (const [o, vx, vz] of saved) { o.vx = vx; o.vz = vz; } }
  };
}

// ---- contested dunks. A dunk used to go in every time unless a defender happened to be in the
// air at the ball. Now the take-off reads the defense: a body set in your path or a man at the rim
// makes it a contest, and a contested dunk can be stuffed or rattle out. From range you can't take
// off through a defender standing in your lane; beat him first (or pull up).
function dunkContestOf(p, h) {
  let best = 0, by = null;
  for (const o of p.opps) {
    if (o.state === 'down' || o.state === 'getup' || o.state === 'dunk' || (o.stumble || 0) > 0.1) continue;
    const s = segDist(o.x, o.z, p.x, p.z, h.x, h.z);
    let c = s.t > 0.05 && s.d < 46 ? (1 - s.d / 46) : 0;                              // in the way
    const rd = dxz(o, h); if (rd < 72) c = Math.max(c, 0.8 * (1 - rd / 72));           // protecting the rim
    const od = dxz(o, p); if (od < 70) c = Math.max(c, 0.45 * (1 - od / 70));           // right on him (trailing or beside)
    if (!c) continue;
    const set = (o.v8 && o.v8.inPos) || o.stance || (o.setT || 0) > 0.2 || o.y > 20 ? 1 : 0.6;
    c *= set * clamp(1 + (st7(o, 'def') - st7(p, 'dnk')) * 0.06, 0.6, 1.4);
    if (c > best) { best = c; by = o; }
  }
  return { c: Math.min(1, best), by };
}
function laneBlocked(p, h) {
  for (const o of p.opps) {
    if (o.state !== 'free' || o.y > 1 || (o.stumble || 0) > 0.1) continue;
    const s = segDist(o.x, o.z, p.x, p.z, h.x, h.z);
    if (s.t > 0.08 && s.t < 0.92 && s.d < 30) return o;
  }
  return null;
}
{
  const _cd = canDunk;
  canDunk = function (p) {
    if (!_cd.apply(this, arguments)) return false;
    if (M.mini || M.practice) return true;
    const h = attackHoop(p.team), d = dxz(p, h), turbo = p.cmd.turbo && p.turboOK();
    const R = (turbo ? 195 : 115) + (p.fire ? 40 : 0) + (p.boost > 0 ? 20 : 0) + st7(p, 'dnk') * 3;   // runway was 250 + : take-offs from the arc
    if (d >= R) return false;
    return d <= 120 || !laneBlocked(p, h);
  };
  const _sd = startDunk;
  startDunk = function (p, opts) {
    _sd.apply(this, arguments);
    const a = p.act; if (!a || p.state !== 'dunk' || M.mini || M.practice) return;
    const k = dunkContestOf(p, a.hoop);
    a.contest = k.c; a.contestBy = k.by;
    a.miss = chance(clamp(k.c * 0.62 - (st7(p, 'dnk') - 5) * 0.02, 0, 0.68));
    if (ball.owner === p || opts.alley) PossLog.addShot(p, a.hoop, 2, true);
    const o = k.by;                                                                   // the contest jump
    if (o && k.c > 0.25 && o.state === 'free' && o.y < 1 && dxz(o, p) < 120) {
      if (o.human >= 0 ? o.v8 && o.v8.held : chance(0.35 + 0.5 * (aiCfg(o.team).antic || 0))) startJump(o);
    }
  };
  const _sl = slam;
  slam = function (p, a) {
    if (!a.miss || ball.owner !== p) return _sl.apply(this, arguments);
    const h = a.hoop, by = a.contestBy;                                               // rattled out
    ball.owner = null; ball.pass = null; ball.shot = null;
    Object.assign(ball, { x: h.x - h.dir * 6, z: h.z + rand(-8, 8), y: RIM_Y + 8, vx: -h.dir * rand(140, 240), vz: rand(-140, 140), vy: rand(260, 380), state: 'loose', grabLock: 0.2, lastTouch: p });
    h.dy = -5; h.vy -= 140; a.didSlam = false;
    SFX.clank(1.3); FX.shake && FX.shake(2, 0.15);
    FX.callout(by ? 'DENIED AT THE RIM!' : 'OFF THE RIM!', '#8fe3ff', by ? by.def.name.toUpperCase() + ' CONTESTS' : '', true);
    M.lastShot = { team: p.team, t: M.time, hoop: h };
    if (by) compAdd(by, 3);
  };
}

// ---- difficulty moves the CPU's finishing, not just its timing: on lower settings the CPU misses
// more of everything it shoots (scaled from the difficulty's release error, so career levels blend)
function cpuMakeK(p) { const e = (aiCfg(p.team) || DIFF.medium).relErr; return clamp(1.04 - e, 0.75, 1.04); }
{
  const _rs = releaseShot;
  releaseShot = function (p) {
    if (M.mini || M.practice || p.human >= 0 || ball.owner !== p) return _rs.apply(this, arguments);
    const ck = p.contactK; p.contactK = (ck || 1) * cpuMakeK(p);
    try { return _rs.apply(this, arguments); } finally { p.contactK = ck; }
  };
  const _sd = startDunk;
  startDunk = function (p, opts) {
    _sd.apply(this, arguments);
    const a = p.act; if (!a || p.state !== 'dunk' || M.mini || M.practice || p.human >= 0 || a.miss) return;
    a.miss = chance((1.04 - cpuMakeK(p)) * 0.9);
  };
}
