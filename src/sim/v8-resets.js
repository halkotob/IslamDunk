
// ================================================= v8.1: RESETS
// Full court: after a basket or a dead-ball inbound the offense gets its own half. The defense
// runs back past half court (nobody can steal, shove or pick off a pass in there) and picks the
// ball up at the line. The space ends when the ball crosses half court, is shot or turned over,
// or after 8 seconds.
// Half court: every restart is a check-up at the top of the key. Everyone walks to his spot, the
// defender checks the ball, then it's live. The game and shot clocks wait.
const BC_MAX = 8, CHECK_MAX = 2.6, CHECK_BEAT = 0.55;
function bcMid() { return COURT.L / 2; }
function inBackcourt(x, team) { const h = defendHoop(team); return (x - bcMid()) * (h.x - bcMid()) > 0; }   // on the side of the hoop this team defends
function bcStart(team) {
  if (M.halfCourt || M.practice || M.mini || M.attract && !PossLog.force) return;
  M.bc = { team, t: 0, popped: false };
}
function bcStep(dt) {
  const B = M.bc; if (!B) return;
  B.t += dt;
  const o = ball.owner;
  const over = B.t > BC_MAX || ball.state === 'shot' || (o && o.team !== B.team) || (M.phase === 'live' && ball.state === 'loose' && !M.inb) || (o && o.team === B.team && !inBackcourt(o.x, B.team) && M.phase === 'live');
  if (over || M.phase === 'ft' || M.phase === 'over' || M.phase === 'break') M.bc = null;
}
function retreating(p) { return !!(M.bc && p.team !== M.bc.team && inBackcourt(p.x + (defendHoop(M.bc.team).x > bcMid() ? 30 : -30), M.bc.team)); }   // until 30 past the line
function retreatCmd(p) {
  // v8.4: the CPU defense waits at a pick-up spot just over half court (across from its man) for the
  // whole protected spell; you run back until you're over the line. Both slow into the spot: full
  // speed right up to it used to overshoot and flip direction every frame (the half-court "spaz")
  const c = p.cmd, team = M.bc.team, D = M.teams[1 - team].players, i = D.indexOf(p);
  const side = defendHoop(team).x > bcMid() ? -1 : 1, man = M.teams[team].players[(M.assign[1 - team] || [])[i]] || ball.owner;
  const tx = bcMid() + side * (55 + i * 30), tz = clamp(man ? man.z : 350, 90, COURT.D - 90);
  zeroCmd(c);
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d > 8) { const k = Math.min(1, d / 45); c.mx = dx / d * k; c.mz = dz / d * k; c.turbo = d > 220 && p.turbo > 30; }
  const ref = ball.owner || ball; c.face = sgn(ref.x - p.x) || p.face;
  if (p.human >= 0 && !M.bc.popped && !M.attract) { M.bc.popped = true; FX.pop(p.x, p.y + 140, p.z, 'GET BACK', '#8fe3ff'); }
  return true;
}
function bcHolds(p) { return !!(M.bc && p.team !== M.bc.team && (p.human < 0 || retreating(p))); }
// ---- half-court check-up
function checkStart(team) {
  const h = hoops[1], d = h.dir, O = M.teams[team].players, D = M.teams[1 - team].players, bo = ball.owner;
  if (!bo) return;
  const top = { x: h.x + d * 390, z: 350 }, ux = h.x - top.x, uz = h.z - top.z, L = Math.hypot(ux, uz) || 1;
  const mate = O.find(q => q !== bo), dOn = D.slice().sort((a, b) => dxz(a, bo) - dxz(b, bo))[0], dOff = D.find(q => q !== dOn);
  const side = mate && mate.z < 350 ? -1 : 1, wing = { x: h.x + d * 255, z: 350 + side * 200 };
  const S = new Map();
  S.set(bo, top);
  if (dOn) S.set(dOn, { x: top.x + ux / L * 56, z: top.z + uz / L * 56 });
  if (mate) S.set(mate, wing);
  if (dOff && mate) { const wx = h.x - wing.x, wz = h.z - wing.z, W2 = Math.hypot(wx, wz) || 1; S.set(dOff, { x: wing.x + wx / W2 * 60, z: wing.z + wz / W2 * 60 }); }
  M.check = { team, S, t: 0, stage: 'walk', bo };
  M.phase = 'dead'; M.deadT = 99; M.nextInbound = null; M.mustClear = [false, false];
  ball.grabLock = 9;
}
function checkStep(dt) {
  const K = M.check; if (!K) return;
  K.t += dt;
  if (K.bo !== ball.owner) { checkLive(); return; }
  if (K.stage === 'walk') {
    let far = 0; for (const [q, s] of K.S) far = Math.max(far, Math.hypot(q.x - s.x, q.z - s.z));
    if (far < 14 || K.t > CHECK_MAX) { K.stage = 'check'; K.tc = K.t; if (!M.attract) { FX.pop(K.bo.x, K.bo.y + 140, K.bo.z, 'CHECK', '#ffd76a'); SFX.bounce && SFX.bounce(0.3); } }
  } else if (K.t - K.tc > CHECK_BEAT) checkLive();
}
function checkLive() {
  const K = M.check; M.check = null;
  M.phase = 'live'; M.deadT = 0; ball.grabLock = 0;
  if (K && K.bo && ball.owner === K.bo && !M.attract) FX.pop(K.bo.x, K.bo.y + 140, K.bo.z, 'BALL IN', '#9dffb0');
}
function checkCmd(p) {
  const K = M.check, c = p.cmd, s = K.S.get(p); zeroCmd(c);
  if (s) { const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz); if (d > 5) { const k = Math.min(1, d / 50); c.mx = dx / d * k; c.mz = dz / d * k; c.turbo = d > 160; } }
  const h = hoops[1]; c.face = p.team === K.team ? sgn(h.x - p.x) || p.face : sgn(K.bo.x - p.x) || p.face;
  return true;
}
// ---- hooks
{
  const _ic = inbCmd;
  inbCmd = function (p) {
    if (M.check) return checkCmd(p);
    if (M.inb) { if (bcHolds(p)) return retreatCmd(p); return _ic.apply(this, arguments); }
    if (bcHolds(p)) return retreatCmd(p);
    return false;
  };
  const _ib = inbound;
  inbound = function (team) {
    const side = !!M.sideOut, hc = M.halfCourt && !M.mini;
    const pos = hc && M.players.map(q => [q.x, q.z]);                   // v8.3: half court, nobody teleports
    const r = _ib.apply(this, arguments);
    if (hc) {
      M.players.forEach((q, i) => { if (pos[i][0] == null) return; q.x = clamp(pos[i][0], 30, COURT.L - 30); q.z = clamp(pos[i][1], 30, COURT.D - 30); q.vx = q.vz = 0; q.hist.length = 0; });
      checkStart(team);                                                // everyone walks to his spot from where he was
    }
    else if (!side) bcStart(team);
    return r;
  };
  const _is = inbStep;
  inbStep = function (dt) { const had = !!M.inb; const r = _is.apply(this, arguments); if (!had && M.inb) bcStart(M.inb.team); return r; };
  const _um = updateMatch;
  updateMatch = function (dt) {
    if (M.mini) return _um.apply(this, arguments);
    if (M.check) checkStep(dt);
    const r = _um.apply(this, arguments);
    bcStep(dt);
    return r;
  };
  // nobody in the protected half can take the ball
  const _pl = passLaneCheck;
  passLaneCheck = function (pa) {
    if (!M.bc || pa.from.team !== M.bc.team) return _pl.apply(this, arguments);
    const out = M.players.filter(o => o.team !== pa.from.team && retreating(o));
    pa.lane = pa.lane || new Set(); for (const o of out) pa.lane.add(o);
    return _pl.apply(this, arguments);
  };
  const _ts = trySteal;
  trySteal = function (p) { if (M.bc && retreating(p)) return; return _ts.apply(this, arguments); };
}

// ---- v8.2: side-outs in your own half get the same space (a reach-in or foul back there used to
// restart with the defender standing on you)
{
  const _ib2 = inbound;
  inbound = function (team) {
    const s = M.sideOut && M.sideOut.team === team ? M.sideOut : null;
    const r = _ib2.apply(this, arguments);
    if (s && !M.halfCourt && ball.owner && ball.owner.team === team && inBackcourt(ball.owner.x, team)) bcStart(team);
    return r;
  };
}
// ---- v8.2: watchdog. Whatever happens, the ball never sits dead, stuck or off the floor for a
// possession: a dead ball always restarts, a stalled check-up or inbound goes live, a ball out of
// reach (behind a wall, under the stands) goes to the team that didn't touch it last, and a ball
// nobody can pick up is freed.
const WD = { dead: 0, loose: 0, out: 0 };
function watchdog(dt) {
  if (M.mini || M.practice && M.practice.kind !== '1v1' || M.phase === 'over' || M.phase === 'break' || M.phase === 'tip' || Game.trivia || Net.role === 'guest' || (typeof KOTC !== 'undefined' && KOTC.on && (KOTC.done || KOTC.overT > 0))) { WD.dead = WD.loose = WD.out = 0; return; }
  // stuck restarts
  if (M.phase === 'dead' && !M.check) WD.dead += dt; else WD.dead = 0;
  if (WD.dead > 6) { WD.dead = 0; M.inb = null; M.check = null; ball.grabLock = 0; inbound(M.nextInbound != null ? M.nextInbound : (M.possTeam >= 0 ? M.possTeam : 0)); return; }
  if (M.check && M.check.t > 5) checkLive();
  if (M.inb && M.inb.t > 5) { const I = M.inb; M.inb = null; ball.grabLock = 0; if (!ball.owner) giveBall(I.p, 'inbound'); M.phase = 'live'; M.shotClock = scReset(); }
  if (M.phase !== 'live') { WD.loose = WD.out = 0; return; }
  // off the floor
  const off = ball.x < -40 || ball.x > COURT.L + 40 || ball.z < 0 || ball.z > COURT.D + 6 || ball.y < -4 || !isFinite(ball.x + ball.y + ball.z);
  if (off && !ball.owner && ball.state !== 'shot') WD.out += dt; else WD.out = 0;
  if (WD.out > 0.6) {
    WD.out = 0;
    const lt = ball.lastTouch, team = lt ? 1 - lt.team : (M.possTeam >= 0 ? 1 - M.possTeam : 0), T = M.teams[team].players;
    const sx = clamp(isFinite(ball.x) ? ball.x : COURT.L / 2, 60, COURT.L - 60), sz = clamp(isFinite(ball.z) ? ball.z : 350, 30, COURT.D - 30);
    const p = T.slice().sort((a, b) => Math.hypot(a.x - sx, a.z - sz) - Math.hypot(b.x - sx, b.z - sz))[0];
    Object.assign(ball, { x: sx, y: 40, z: sz, vx: 0, vy: 0, vz: 0, state: 'loose', shot: null, pass: null, grabLock: 0 });
    FX.callout('OUT OF BOUNDS', '#ffffff', M.teamDefs[team].name.toUpperCase() + ' BALL');
    M.sideOut = { team, p, x: sx, z: sz, sc: Math.max(M.shotClock, Math.min(SC_MIN_RESET, M.fmt.sc || SC_MIN_RESET)) };
    M.phase = 'dead'; M.deadT = 0.9; M.nextInbound = team;
    return;
  }
  // loose and nobody can get it (locked, or resting where no one goes)
  if (!ball.owner && ball.state === 'loose') WD.loose += dt; else WD.loose = 0;
  if (WD.loose > 1.5 && ball.grabLock > 0.2) ball.grabLock = 0;
  if (WD.loose > 5) {
    WD.loose = 0;
    const p = M.players.filter(q => q.state === 'free').sort((a, b) => Math.hypot(a.x - ball.x, a.z - ball.z) - Math.hypot(b.x - ball.x, b.z - ball.z))[0];
    if (p) { ball.x = clamp(ball.x, 30, COURT.L - 30); ball.z = clamp(ball.z, 30, COURT.D - 30); giveBall(p, 'loose'); }
  }
}
{
  const _um2 = updateMatch;
  updateMatch = function (dt) { const r = _um2.apply(this, arguments); if (!M.mini) watchdog(dt); return r; };
}

// v8.4: a human defender who has run back can't walk into the protected half again: a soft wall at
// the line (no bouncing, he just stops there)
{
  const _cp2 = collidePlayers;
  collidePlayers = function () {
    const r = _cp2.apply(this, arguments);
    if (M.bc) {
      const side = defendHoop(M.bc.team).x > bcMid() ? -1 : 1, lim = bcMid() + side * 10;
      for (const q of M.players) if (q.team !== M.bc.team && q.human >= 0 && !retreating(q) && (q.x - lim) * side < 0) { q.x = lim; if ((q.vx || 0) * side < 0) q.vx = 0; }
    }
    return r;
  };
}
