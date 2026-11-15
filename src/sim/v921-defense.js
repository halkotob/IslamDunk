// ================================================= v9.21.0: CPU DEFENSE THAT READS THE GAME, NO WALL AT HALF COURT
// 1. The half-court wall is gone. v8-resets.js kept the scoring team's defense behind half court for up to 8 s after a
//    basket (no steals or pass pick-offs there, and a human defender was stopped at the line). Now nobody is held:
//    bcStart starts nothing. During the inbound itself (the pass in from under the basket) a human defender is placed
//    by the inbound for at most INB_HOLD seconds, then he's free to go and pressure the ball anywhere.
// 2. The CPU's default shell. Until the ball handler is in his frontcourt: one defender picks him up just inside half
//    court (in front of him, between him and the rim), the other stays back near the rim, across from his man. In the
//    frontcourt: man to man with a sag. The on-ball defender gives the handler a cushion the farther he is from the
//    rim (he can't simply blow by), and the off-ball defender sits halfway between his man and the rim (never two on
//    the three-point line).
// 3. Threes. THREE_READ looks at the offense's last 8 shots: when a quarter of them or more are threes the defense
//    starts to close out, fully from half of them. The defender of the man who took the most of those threes closes
//    out higher (on the ball: up on him; off the ball: denying him); the other one stays back. The read changes
//    slowly (time constant tau), so it blends; nothing flips from one frame to the next.
// 4. The press. In a close game late (PRESS: within 6 points, the last third of the game; first-to-21: the leader past
//    two thirds of the target) the CPU picks the ball handler up in his backcourt, and its second defender plays the
//    passing lane at half court. It eases in and out over ~1.5 s. Otherwise it drops back as above.
// Everything here lives in M.d921 (the rollback saves and replays it) and runs in the simulation, so online stays in
// step. Half-court games (M.halfCourt) keep their check-ups; there's no backcourt there, so only the sag applies.
const INB_HOLD = 1.0;
const THREE_READ = { shots: 8, lo: 0.25, hi: 0.5, tau: 4 };
const PRESS = { margin: 6, lastFrac: 1 / 3, tau: 1.5 };
const SHELL = { pickup: 60, back: 0.32, backMax: 230, sagOff: 0.5, sagOffHot: 0.2, cushionAt: 230, cushionK: 0.3, cushionMax: 90, onTight: 34, stopperK: 6 };
// ---- 1. the wall
bcStart = function () {};
{
  const _ic = inbCmd;
  inbCmd = function (p) {
    if (M.inb && !M.check && p.human >= 0 && p.team !== M.inb.team && M.inb.t > INB_HOLD) return false;   // free after the beat
    return _ic.apply(this, arguments);
  };
}
// ---- state: the shots log, the read and the press, per defending team
function d921() { return M.d921 || (M.d921 = { log: [[], []], k3: [0, 0], press: [0, 0], shooter: [-1, -1], inShot: false }); }
// the offense's three-point read: 0 .. 1 (the defending team's view of team o)
function threeHeat(o) { return M.d921 ? M.d921.k3[o] : 0; }
// the press weight of defending team t, 0 .. 1
function cpuPressK(t) { return M.d921 ? M.d921.press[t] : 0; }
function gameProgress() {
  const F = M.fmt || {};
  if (F.first21) return Math.max(M.teams[0].score, M.teams[1].score) / (F.target || 21);
  const N = F.periods || 2, L = F.len || 120;
  if (M.quarter > N) return 1;
  return clamp(((M.quarter - 1) * L + (L - (isFinite(M.clock) ? M.clock : L))) / (N * L), 0, 1);
}
function pressWanted() {
  if (M.halfCourt || M.practice || M.mini || !M.teams) return false;
  return Math.abs(M.teams[0].score - M.teams[1].score) <= PRESS.margin && gameProgress() >= 1 - PRESS.lastFrac;
}
function d921Step(dt) {
  if (M.mini || M.practice || !M.teams) return;
  const S = d921();
  // a new shot: log it for its team (three or not, and who)
  // (a flag, not a reference to the shot: the rollback copies objects, so a reference wouldn't survive a replay)
  const inShot = ball.state === 'shot' && !!ball.shot;
  if (inShot && !S.inShot) {
    const sh = ball.shot, t = sh.team;
    if (t === 0 || t === 1) { const L = S.log[t]; L.push([sh.pts === 3 ? 1 : 0, sh.shooter ? M.players.indexOf(sh.shooter) : -1]); if (L.length > THREE_READ.shots) L.shift(); }
  }
  S.inShot = inShot;
  for (let t = 0; t < 2; t++) {
    const L = S.log[t], n = L.length, threes = L.filter(x => x[0]).length;
    const raw = n >= 4 ? clamp((threes / THREE_READ.shots - THREE_READ.lo) / (THREE_READ.hi - THREE_READ.lo), 0, 1) : 0;
    S.k3[t] += (raw * raw * (3 - 2 * raw) - S.k3[t]) * Math.min(1, dt / THREE_READ.tau);
    const by = {}; for (const [th, i] of L) if (th && i >= 0) by[i] = (by[i] || 0) + 1;
    let best = -1, bn = 0; for (const i in by) if (by[i] > bn) { bn = by[i]; best = +i; }
    S.shooter[t] = best;
    // the defending team t presses the other team when the game is close late
    const want = pressWanted() ? 1 : 0;
    S.press[t] += (want - S.press[t]) * Math.min(1, dt / PRESS.tau);
  }
}
{
  const _um = updateMatch;
  updateMatch = function (dt) { const r = _um.apply(this, arguments); if (!M.mini) d921Step(dt); return r; };
  // a new match starts with a clean read
  const _nm = newMatch;
  newMatch = function () { const r = _nm.apply(this, arguments); M.d921 = null; return r; };
}
// ---- 2-4. where a CPU defender stands
// the share of the new half-court shell a defender plays, by his difficulty's anticipation dial (Very easy and Easy 0:
// SHELL_W.lo, Medium 0.5, Hard 0.9 and up: 1). Easier CPUs also press less hard (PRESS_W) and pick the handler up deeper in their own half.
const SHELL_W = { lo: 0, k: 0.6 };
// how hard each difficulty presses (Very easy and Easy don't, Medium 0.55, Hard 1) and how high it picks up
const PRESS_W = { lo: 0, k: 1.1 }, PICKUP_FAR = 200;
function pressWeight(p) { const c = p.ai && p.ai.cfg ? p.ai.cfg() : null; return clamp(PRESS_W.lo + ((c && c.antic) || 0) * PRESS_W.k, 0, 1); }
function shellWeight(p) { const c = p.ai && p.ai.cfg ? p.ai.cfg() : null; return clamp(SHELL_W.lo + ((c && c.antic) || 0) * SHELL_W.k, SHELL_W.lo, 1); }
// returns the target spot for a CPU defender with a guardBall / deny plan, or null to keep the old one
function d921Spot(p, pl) {
  const bo = ball.owner;
  if (!bo || bo.team === p.team || M.mini || M.practice || p.state !== 'free') return null;
  const h = defendHoop(p.team), m = pl.man || bo; if (!m) return null;
  if (bo.state === 'dunk' || m.state === 'dunk' || bo.state === 'windup' || bo.state === 'shoot') return null;   // contests and rim protection: the old logic
  if (typeof hotLive === 'function' && hotLive() && M.hot && Math.hypot(m.x - M.hot.x, m.z - M.hot.z) < HOT_R * 1.2) return null;   // the hot spot's own close-out
  const o = bo.team, S = d921(), K3 = S.k3[o], hot = S.shooter[o] >= 0 ? M.players[S.shooter[o]] : null, Pw = S.press[p.team] * pressWeight(p);
  const toward = (q, k) => { const ux = h.x - q.x, uz = h.z - q.z; return { x: q.x + ux * k, z: q.z + uz * k }; };   // k of the way from q to the rim
  const atGap = (q, gap) => { const ux = h.x - q.x, uz = h.z - q.z, L = Math.hypot(ux, uz) || 1; return { x: q.x + ux / L * Math.min(gap, L - 10), z: q.z + uz / L * Math.min(gap, L - 10) }; };
  const back = !M.halfCourt && typeof inBackcourt === 'function' && inBackcourt(bo.x, o);   // the handler is still in his backcourt
  const mid = COURT.L / 2, ourSide = sgn(h.x - mid) || 1;
  const onBall = pl.type === 'guardBall';
  // where he sees them: the CPU's perception lag (ai.js perceive), as the old guarding used. Not the true spot, or an
  // Easy defender would react instantly to every move
  const cfg = p.ai && p.ai.cfg ? p.ai.cfg() : null, B = cfg ? perceive(bo, cfg) : bo, Mn = m === bo ? B : cfg ? perceive(m, cfg) : m;
  if (cfg && cfg.shell === 0) return null;   // Very easy keeps the old guarding (DIFF.veryeasy.shell: the career ladder's first rung)
  let spot;
  if (back) {
    if (onBall) {
      // pick him up just inside half court, in front of him; pressing: on him wherever he is
      const pu = lerp(PICKUP_FAR, SHELL.pickup, shellWeight(p)), pick = atGap(B, 40); pick.x = ourSide > 0 ? Math.max(pick.x, mid + pu) : Math.min(pick.x, mid - pu);
      pick.z = lerp(pick.z, h.z, 0.15);
      const tight = atGap(B, SHELL.onTight);
      spot = { x: lerp(pick.x, tight.x, Pw), z: lerp(pick.z, tight.z, Pw) };
    } else {
      // the back man: near the rim, across from his man; pressing: up to the passing lane at half court
      const bk = toward(Mn, 1 - SHELL.back), d = Math.hypot(bk.x - h.x, bk.z - h.z);
      if (d > SHELL.backMax) { bk.x = h.x + (bk.x - h.x) / d * SHELL.backMax; bk.z = h.z + (bk.z - h.z) / d * SHELL.backMax; }
      const lane = { x: lerp(B.x, Mn.x, 0.55), z: lerp(B.z, Mn.z, 0.55) }; lane.x = ourSide > 0 ? Math.max(lane.x, mid - 40) : Math.min(lane.x, mid + 40);
      spot = { x: lerp(bk.x, lane.x, Pw * 0.85), z: lerp(bk.z, lane.z, Pw * 0.85) };
    }
  } else {
    const closeOut = hot === m ? K3 : K3 * 0.25;                    // the three-point shooter's defender closes out; the other stays back
    const W = shellWeight(p);                                        // how much of the new shell this difficulty plays (Easy less)
    if (onBall) {
      const hd = Math.hypot(h.x - B.x, h.z - B.z);
      const cushion = clamp(SHELL.onTight + (hd - SHELL.cushionAt) * SHELL.cushionK, SHELL.onTight, SHELL.cushionMax);
      const tightGap = SHELL.onTight + Math.max(0, hd - 420) * 0.3 - (typeof cpuPress === 'function' ? cpuPress(p) : 0);   // (the old gap)
      const cush = Math.max(tightGap, cushion - (typeof cpuPress === 'function' ? cpuPress(p) : 0) * SHELL.stopperK);   // a stopper (lockdown style, high Defense) gives less cushion
      spot = atGap(B, lerp(tightGap, lerp(cush, tightGap, closeOut), W));
    } else {
      const hd = Math.hypot(h.x - Mn.x, h.z - Mn.z), old = clamp(hd * 0.3, 25, 130) / (hd || 1);   // (the old sag)
      const f = lerp(old, lerp(SHELL.sagOff, SHELL.sagOffHot, closeOut), W);
      spot = toward(Mn, f);
      const ref = B; spot.x += (ref.x - spot.x) * 0.1; spot.z += (ref.z - spot.z) * 0.1;   // shade toward the ball
    }
  }
  return spot;
}
{
  const BP = Brain.prototype, _ex = BP.exec;
  BP.exec = function (dt) {
    const r = _ex.apply(this, arguments), p = this.p, pl = this.plan;
    if (p.human >= 0 || !pl || (pl.type !== 'guardBall' && pl.type !== 'deny')) return r;
    const s = d921Spot(p, pl); if (!s) return r;
    const c = p.cmd, steal = c.a, jump = c.b;
    c.mx = c.mz = 0;
    const far = Math.hypot(s.x - p.x, s.z - p.z);
    this.moveTo(clamp(s.x, 20, COURT.L - 20), clamp(s.z, 30, COURT.D - 30), far > 160);
    const ref = ball.owner || ball; c.face = sgn(ref.x - p.x) || p.face; c.a = steal; c.b = jump;
    return r;
  };
}
