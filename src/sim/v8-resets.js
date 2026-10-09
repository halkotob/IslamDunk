
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
  const c = p.cmd, team = M.bc.team, a = attackHoop(team), D = M.teams[1 - team].players, i = D.indexOf(p);
  const sp = [{ x: a.x + a.dir * 330, z: 300 }, { x: a.x + a.dir * 300, z: 440 }][i] || { x: bcMid(), z: 350 };
  const mx = bcMid() - (defendHoop(team).x > bcMid() ? 40 : -40);                     // just over half court
  const tx = Math.abs(sp.x - bcMid()) < Math.abs(mx - bcMid()) ? mx : sp.x, tz = sp.z;
  zeroCmd(c);
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
  c.mx = dx / d; c.mz = dz / d; c.turbo = d > 200 && p.turbo > 30; c.face = sgn(dx) || p.face;
  if (p.human >= 0 && !M.bc.popped && !M.attract) { M.bc.popped = true; FX.pop(p.x, p.y + 140, p.z, 'GET BACK', '#8fe3ff'); }
  return true;
}
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
    if (M.inb) { if (retreating(p)) return retreatCmd(p); return _ic.apply(this, arguments); }
    if (M.bc && retreating(p)) return retreatCmd(p);
    return false;
  };
  const _ib = inbound;
  inbound = function (team) {
    const side = !!M.sideOut;
    const r = _ib.apply(this, arguments);
    if (M.halfCourt && !M.mini) checkStart(team);
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
