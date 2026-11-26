// ================================================= v9.33 (refine 6): BLOCKS REACH FOR THE BALL, in every mode
// (docs/career-overhaul/REFINE-PLAN.md, release 6)
// - The reach: a block jump against a shot in the air (or a shooter rising) lunges toward the ball: a short sideways
//   move in the first part of the jump, capped, from any side (in front, beside, behind). The CPU's blocks use the
//   same rule. Lockdown (the career's archetype perk) reaches a little farther.
// - The chance (replaces v98-review.js's): the hand reaches toward the ball, not just the way you face. It rises with how
//   close the hand gets and how early the jump meets the ball. In front of the shooter, early, is still the good
//   block; from the side or behind, a close hand now has a real (small) chance; far off rarely lands. A near miss says
//   FINGERTIPS.
const BLOCK_REACH = {
  t: 0.18,            // how long the lunge lasts (s)
  v: 150,             // lunge speed at Defense 0 (px/s)...
  vDef: 7,            // ...plus this per point of Defense
  lockV: 30,          // Lockdown's extra speed
  lockR: 6,           // and extra hand reach (px)
  range: 230,         // the ball (or the shooter) must be this close to start a lunge
  stop: 14,           // stop short of the ball: the hand, not the body, goes to it
  body: 30            // and stay this far from the shooter
};
function blockLockdown(o) { return typeof perkOf === 'function' && perkOf(o) === 'lockdown'; }
// where to reach: the ball in flight, or the shooter's release point while he rises
function blockTarget(o) {
  if (ball.state === 'shot' && ball.shot && !ball.shot.dunk && ball.shot.team !== o.team && ball.shot.t <= 0.45) return { x: ball.x, z: ball.z };
  const sh = (o.opps || []).find(q => q.state === 'windup' || q.state === 'shoot');
  if (sh) { const h = attackHoop(sh.team), d = dxz(sh, h) || 1; return { x: sh.x + (h.x - sh.x) / d * 10, z: sh.z + (h.z - sh.z) / d * 10 }; }
  return null;
}
{
  const _sj = startJump;
  startJump = function (p) {
    const was = p.state; const r = _sj.apply(this, arguments);
    if (p.state !== 'jump' || was === 'jump') return r;
    const T = blockTarget(p); if (!T) return r;
    const dx = T.x - p.x, dz = T.z - p.z, d = Math.hypot(dx, dz);
    if (d > BLOCK_REACH.range || d < BLOCK_REACH.stop + 1) return r;
    const v = Math.min((d - BLOCK_REACH.stop) / BLOCK_REACH.t, BLOCK_REACH.v + (p.st.def || 5) * BLOCK_REACH.vDef + (blockLockdown(p) ? BLOCK_REACH.lockV : 0));
    let k = 1; const sh = ball.shot && ball.shot.shooter || (p.opps || []).find(q => q.state === 'windup' || q.state === 'shoot');
    if (sh) for (; k > 0.05; k -= 0.1) { const ex = p.x + dx / d * v * k * BLOCK_REACH.t, ez = p.z + dz / d * v * k * BLOCK_REACH.t; if (Math.hypot(ex - sh.x, ez - sh.z) >= BLOCK_REACH.body || Math.hypot(p.x - sh.x, p.z - sh.z) < BLOCK_REACH.body) break; }
    p.reach = { vx: dx / d * v * k, vz: dz / d * v * k, t: BLOCK_REACH.t };          // (never into the shooter's body: that's a foul, not a block)
    if (Math.abs(dx) > 4) p.face = sgn(dx);
    return r;
  };
  const _um = updateMatch;
  updateMatch = function (dt) {
    const r = _um.apply(this, arguments);
    for (const p of M.players || []) {
      const R = p.reach; if (!R) continue;
      if (p.state !== 'jump' || R.t <= 0) { p.reach = null; continue; }
      const k = Math.min(dt, R.t); R.t -= dt;
      p.x += R.vx * k; p.z += R.vz * k;
    }
    return r;
  };
}
checkBlockJump = function (o) {
  if (ball.state !== 'shot' || !ball.shot || ball.shot.dunk || ball.shot.team === o.team || ball.shot.t > 0.45 || ball.shot.tried.has(o)) return;
  const C0 = blockChance(o); if (!C0) return;
  ball.shot.tried.add(o);
  const sh = ball.shot.shooter, h = ball.shot.hoop;
  if (o.swipe && sh && dxz(o, sh) < 22 && !C0.chase && foulsOn() && chance(0.3)) {     // swiped through the body: shooting foul
    if (!ball.shot.foul) { ball.shot.foul = { by: o, pts: ball.shot.pts }; if (humanIn(o, sh)) popOnce(sh, 'contact', 'CONTACT', '#ffd76a'); }
    return;
  }
  if (chance(C0.p)) { if (C0.chase) pinBlock(o, sh, h); else blockBall(o, sh); return; }
  if (o.human >= 0) popOnce(o, 'blk', C0.close > 0.55 ? 'FINGERTIPS' : !C0.early ? 'LATE' : C0.lane < 0.5 ? 'NO ANGLE' : 'JUST MISSED', C0.close > 0.55 ? '#ffd76a' : '#9fb3c8', 0.8);
};
// the block chance for o's hand against the ball right now (null: out of reach)
function blockChance(o) {
  if (!ball.shot) return null;
  const def = o.st.def || 5, R = (o.swipe ? 38 : 26) + def * 1.0 + (blockLockdown(o) ? BLOCK_REACH.lockR : 0);
  const hx = o.x + (sgn(ball.x - o.x) || o.face) * 6;                          // the hand reaches toward the ball
  const d = Math.hypot(ball.x - hx, ball.y - (o.y + 104), ball.z - o.z);
  if (d >= R) return null;
  const sh = ball.shot.shooter, h = ball.shot.hoop, close = clamp(1 - d / R, 0, 1);
  const lane = sh ? clamp((dxz(sh, h) - dxz(o, h) + 20) / 100, 0, 1) : 0;
  const height = sh ? clamp((o.y - sh.y) / 140, -0.08, 0.12) : 0;
  const chase = !!(o.swipe && (o.chaseOK || chaseGeom(o, sh, h)));
  const early = ball.shot.t <= 0.3, good = lane >= 0.5 && early;
  const pr = good ? clamp(0.12 + def * 0.045 + height, 0.15, 0.7)      // (in front, early: as v9.8, Defense decides)
    : clamp((0.02 + def * 0.012 + lane * 0.06 + height + (o.swipe ? 0.04 : 0)) * (0.5 + 0.5 * close) + close * (early ? 0.24 : 0.12), 0.02, 0.32);   // (a far-off hand rarely lands)
  return { p: clamp((pr + (chase ? 0.18 : 0)) * defK(o), 0.03, 0.95), close, lane, early, chase };
}
