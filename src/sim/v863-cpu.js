// ================================================= v8.6.3: CPU HOT SPOTS + GAME CLOCK
// Two additions to the CPU brain. Both only ever add options or sharpen choices; neither applies to a
// human player or changes anything outside its own window.
//
// HOT SPOTS (only while a match spot is live; with no spot, nothing here runs and no random number is drawn)
//   - Offence: a CPU handler standing on the spot, not tightly guarded, adds the bonus (+1 or +2) times
//     his make chance to that shot's expected points. Within 1.5x the radius he steps onto it first.
//     A better look (open dunk, open three, the pass) still wins the utility contest.
//   - A free CPU teammate may drift to a front-half spot instead of a plain spacing spot, only when the
//     spot is worth at least as much to him, never next to the handler, and never camps (1.5 s, then on).
//   - Defence: the defender on a man standing on a live spot closes out tighter, with turbo.
//   - Not every time: the CPU uses a spot on at most about one possession in two (never two in a row,
//     and a 70% roll otherwise), so it stays unpredictable.
//
// GAME CLOCK (CPU-only teams; the last period, or the last 30 s of any period; nowhere else)
//   - urgent: trailing in the last 24 s: no set play, push the pace, take the first good shot (less dribbling
//     around; the bar for a shot is unchanged); trailing by 3+ with under 20 s, look for a three. Trailing with
//     25-48 s left: less dribbling around.
//   - tied in the last 24 s: the same as urgent. Holding for a last shot at 4-6 s was measured and lost games
//     (tied with the ball and 12 s left: 74% wins before, 57% holding; 150 seeded games each), because more
//     possessions favour the team with the ball here. So the CPU doesn't hold; it plays for the first good shot.
//   - Measured head to head against the 8.6.2 CPU (1,400 seeded games starting -3..+3 with 8-45 s left in the
//     last period): 62% wins before, 66% after. Lowering the bar for a shot late was tried and dropped: it lost
//     games (trailing by 1 with 8 s left: 50% before, 30% with it).
//   - 2-for-1: the last 30 s of an earlier period: push the pace and attack sooner, to get one more possession.
//   - protect: leading in the last 48 s: use the shot clock (shoot when it is under ~6 s), no lobs, no
//     risky passes; if the game clock runs out first, simply keep the ball.
//   - horn: from 2.4 s the best shot available now (no dribbling around); under 1.2 s, whoever has the ball
//     shoots from where he is (unless the team is leading in the last period).
// Existing late-game behaviour (intentional fouls, CPU timeouts) is untouched.

// ---- possession counter (shared by both parts)
{
  const _gb = giveBall;
  giveBall = function (p, how) {
    const r = _gb.apply(this, arguments);
    if (p && p.team !== M.possLast) { M.possLast = p.team; M.possN = (M.possN || 0) + 1; }
    return r;
  };
  const _nm = newMatch;
  newMatch = function () { M.possN = 0; M.possLast = -1; M.hotAI = null; return _nm.apply(this, arguments); };
}
const CPU863 = { hot: true, late: true, only: -1, push: true, noPlay: true };   // switches for tests and measurements (only: one team uses them)
const cpuTeam = t => !!(M.teams && M.teams[t] && M.teams[t].players.every(q => q.human < 0)) && (CPU863.only < 0 || CPU863.only === t);

// ---------------------------------------------------------------- hot spots
function hotLive() { return !!(CPU863.hot && M.hot && M.hot.m && M.hot.t > 0.6 && M.phase === 'live' && !M.mini && !M.practice); }
function hotUse(team) {                     // decided once per possession, and only while a spot is live
  const A = M.hotAI || (M.hotAI = { n: -1, on: false, last: [false, false] });
  if (A.n !== M.possN) { A.n = M.possN; A.on = !A.last[team] && chance(0.7); A.last[team] = A.on; }
  return A.on;
}
{
  const BP = Brain.prototype;
  const _ch = BP.choose;
  BP.choose = function (opts) {
    const k = this._adj;
    if (k) for (const o of opts) if (k[o.type]) o.u += typeof k[o.type] === 'function' ? k[o.type](o) : k[o.type];
    return _ch.call(this, opts);
  };
  const _th = BP.thinkHandler;
  BP.thinkHandler = function () {
    const p = this.p, late = lateMode(p.team), adj = {};
    let hot = 0, step = null;
    if (p.human < 0 && hotLive() && !(late && late.mode !== 'two4one')) {
      const s = M.hot, d = Math.hypot(p.x - s.x, p.z - s.z), open = nearestOppDist(p.x, p.z, p.team) > 55;
      if (open && d < HOT_R * 1.5 && hotUse(p.team)) {
        if (hotHit(p)) { hot = hotValue(p); const pr = shotProbability(p, p.x, p.z); adj.shoot = pr * hot; }
        else if (hotSpotValue(p.team) === 1 && chance(0.6)) step = { x: s.x, z: s.z };
      }
    }
    if (late) lateAdjust(this, late, adj);
    this._adj = Object.keys(adj).length ? adj : null;
    try { _th.apply(this, arguments); } finally { this._adj = null; }
    if (step && this.plan.type === 'probe') { this.plan = { type: 'probe', target: step, hot: true }; this.t = Math.min(this.t, 0.25); }
    if (late) lateOverride(this, late);
  };
  const _tob = BP.thinkOffBall;
  BP.thinkOffBall = function () {
    _tob.apply(this, arguments);
    const p = this.p, bo = ball.owner;
    if (p.human >= 0 || this.plan.type !== 'spot' || !bo || bo.team !== p.team || bo === p || !hotLive() || hotSpotValue(p.team) !== 1) return;
    const s = M.hot, h = attackHoop(p.team);
    if (Math.hypot(s.x - bo.x, s.z - bo.z) < 140) return;                       // spacing: never next to the handler
    const v = p._hotV || (p._hotV = {});
    if (v.spot === s && v.done) return;                                          // already had his look from there
    if (v.spot !== s) { v.spot = s; v.at = null; v.done = false; }
    if (Math.hypot(p.x - s.x, p.z - s.z) < 20) { if (v.at == null) v.at = M.time; if (M.time - v.at > 1.5) { v.done = true; return; } }
    const ev = (x, z, b) => shotProbability(p, x, z, nearestOppDist(x, z, p.team)) * ((isThree(x, z, h) ? 3 : 2) + b);
    if (ev(s.x, s.z, 1) < ev(this.plan.x, this.plan.z, 0) || !hotUse(p.team)) return;   // the plain spot is better
    this.plan = { type: 'spot', x: s.x, z: s.z, u: this.plan.u, hot: true };
  };
  const _ex = BP.exec;
  BP.exec = function (dt) {
    const p = this.p, pl = this.plan, late = ball.owner === p && p.human < 0 ? lateMode(p.team) : null;
    if (late && late.mode === 'protect' && late.keep) { p._noPost = true; if (p.postUp) p.postUp = null; } else p._noPost = false;
    const r = _ex.apply(this, arguments), c = p.cmd;
    if (late && CPU863.push && (late.mode === 'urgent' || late.mode === 'two4one') && p.state === 'free' && dxz(p, attackHoop(p.team)) > COURT.L / 2 && p.turbo > 12) c.turbo = true;   // push the pace
    // defence: close out hard on a man standing on a live spot
    if (p.human < 0 && (pl.type === 'guardBall' || pl.type === 'deny') && pl.man && hotLive() && p.state === 'free') {
      const m = pl.man, s = M.hot;
      if (Math.hypot(m.x - s.x, m.z - s.z) < HOT_R * 1.2 && m.team !== p.team && (ball.owner === m || (ball.owner && ball.owner.team === m.team))) {
        const h = defendHoop(p.team), ux = h.x - m.x, uz = h.z - m.z, L = Math.hypot(ux, uz) || 1;
        const steal = c.a;
        this.moveTo(m.x + ux / L * 24, m.z + uz / L * 24, dxz(p, m) > 60);
        c.face = sgn(m.x - p.x); c.a = steal;
      }
    }
    return r;
  };
  const _pe = postEligible;
  postEligible = function (p) { return !p._noPost && _pe.apply(this, arguments); };
}

// ---------------------------------------------------------------- game clock
function lateMode(team, anyPhase) {
  if (!CPU863.late || !M.fmt || M.fmt.first21 || !isFinite(M.clock) || (M.phase !== 'live' && !anyPhase) || M.mini || M.practice || M.attract || !cpuTeam(team)) return null;
  const last = M.quarter >= M.fmt.periods, T = M.clock;
  if (!last && T > 30) return null;
  const diff = M.teams[team].score - M.teams[1 - team].score, sc = M.fmt.sc > 0 ? M.shotClock : 99;
  if (T <= 2.4) return last && diff > 0 ? { mode: 'protect', keep: true } : T <= 1.2 ? { mode: 'horn' } : { mode: 'urgent', now: true };
  if (last && diff > 0) return T <= 48 ? { mode: 'protect', keep: T < sc || sc > 6.5 } : null;
  if (last && diff < 0) return T <= 24 ? { mode: 'urgent', three: -diff >= 3 && T < 20 } : T <= 48 ? { mode: 'hurry' } : null;
  if (last && T <= 24) return { mode: 'urgent' };                    // tied: play to win now (no holding; see the note at the top)
  if (!last && T <= 30) return { mode: 'two4one' };
  return null;
}
// utility nudges, applied inside choose() (before the difficulty noise)
function lateAdjust(brain, L, adj) {
  const p = brain.p, h = attackHoop(p.team), three = isThree(p.x, p.z, h);
  const add = (k, v) => { const o = adj[k]; adj[k] = o == null ? v : typeof o === 'function' ? (x => o(x) + v) : o + v; };
  if (L.mode === 'urgent') {                                        // the first good look: less dribbling around, the same bar for a shot
    // (lowering the bar for a shot was measured and lost games: trailing by 1 with 8 s left it won 30% against 50% before)
    const T = M.clock;
    add('probe', L.now ? -1 : T <= 8 ? -0.25 : -0.1);               // under 2.4 s: no more dribbling around
    if (L.three) { if (three) add('shoot', 0.6); else { add('shoot', -0.3); add('dunk', -0.3); add('probe', 0.6); } }
  } else if (L.mode === 'hurry' || L.mode === 'two4one') add('probe', -0.15);   // don't dawdle; the shot bar is unchanged
  else if (L.mode === 'protect' && !L.keep) { add('alley', -0.6); add('pass', o => -1.2 * passRisk(p, o.to)); add('shoot', three ? -0.15 : 0); }
}
// plan overrides after the normal choice
function lateOverride(brain, L) {
  const p = brain.p, h = attackHoop(p.team);
  if (L.mode === 'horn') {                                          // get it up before the horn
    if (p.state !== 'free') return;
    brain.plan = dxz(p, h) < 140 && canDunk(p) ? { type: 'dunk' } : { type: 'shoot' };
    brain.t = Math.min(brain.t, 0.05); return;
  }
  if (L.mode === 'protect' && L.keep) {                              // keep the ball: dribble to the open side of the arc
    if (brain.plan.type === 'pass' && passRisk(p, brain.plan.to) < 0.15 && dxz(brain.plan.to, h) > 200) return;   // a safe swing pass is fine
    brain.plan = { type: 'probe', target: safeSpot(p), hold: true };
    brain.t = Math.min(brain.t, 0.3); return;
  }
  if (L.mode === 'urgent' && L.three && brain.plan.type === 'probe' && !isThree(p.x, p.z, h)) brain.plan = { type: 'probe', target: threeSpot(p) };
}
function safeSpot(p) {
  const h = attackHoop(p.team); let best = null, bu = -1e9;
  for (const s of offSpots(h)) {
    if (Math.hypot(s.x - h.x, s.z - h.z) < 250) continue;          // outside, away from help
    const u = Math.min(nearestOppDist(s.x, s.z, p.team), 220) - Math.hypot(s.x - p.x, s.z - p.z) * 0.25;
    if (u > bu) { bu = u; best = s; }
  }
  return best || { x: p.x, z: p.z };
}
function threeSpot(p) {
  const h = attackHoop(p.team); let best = null, bu = -1e9;
  for (const s of offSpots(h)) {
    if (!isThree(s.x, s.z, h)) continue;
    const u = Math.min(nearestOppDist(s.x, s.z, p.team), 160) - Math.hypot(s.x - p.x, s.z - p.z) * 0.4;
    if (u > bu) { bu = u; best = s; }
  }
  return best || { x: p.x, z: p.z };
}
{
  // a CPU timeout late with the game on the line: no set play, just get the ball in and attack
  const _et = endTimeout;
  endTimeout = function (play) {
    const L = !M.toHuman && M.toTeam != null ? lateMode(M.toTeam, true) : null;
    return _et.call(this, CPU863.noPlay && L && (L.mode === 'urgent' || L.mode === 'horn') ? 'run' : play);
  };
}
