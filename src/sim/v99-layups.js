// ================================================= v9.9: LAYUPS ON MOVE
// Layups were hard to get on purpose: SHOOT near the rim is a dunk, and the layup zone was a thin ring outside dunk
// range. Now:
//   * MOVE toward the basket with the ball (stick at the rim, inside about the free-throw line) is a layup. The kind
//     comes from where you are:
//       - under or behind the rim: a REVERSE layup, finishing on the far side;
//       - from the wing (a steep angle to the rim): OFF THE GLASS, banked in;
//       - straight on: a FINGER ROLL; with a defender right in your path: a JELLY (one-hand finesse scoop);
//       - from farther out (past about 165): a EURO STEP into the layup.
//     Layups release on their own near the top of the jump (no timing), and you glide toward the rim while you rise.
//   * SHOOT is unchanged for dunks. When you can't dunk, SHOOT near the rim is a short floater, not a layup.
//     Putbacks and up-and-unders (after a pump fake) stay on SHOOT.
//   * The self alley-oop (Turbo + MOVE on an open run) is now for when you're on fire only.
//   * CPU layups use the same kinds (so they bank from the wings too).
const LAY_LABEL = { roll: 'FINGER ROLL', jelly: 'JELLY', bank: 'OFF THE GLASS', reverse: 'REVERSE LAYUP' };
function layupKind(p) {
  const H = hoopDir(p), h = H.h, d = H.d;
  if ((p.x - h.x) * h.dir < 25) return 'reverse';
  if (d > 165) return 'euro';
  const inPath = (p.opps || []).some(o => { const dx = o.x - p.x, dz = o.z - p.z, along = dx * H.fx + dz * H.fz; return along > 0 && along < 80 && Math.abs(dx * H.px + dz * H.pz) < 34; });
  if (inPath) return 'jelly';
  if (Math.abs(p.z - h.z) > Math.max(55, d * 0.5)) return 'bank';
  return 'roll';
}
function layupOK(p, c) {
  if (ball.owner !== p || p.state !== 'free' || p.postUp || p.y > 1 || M.phase !== 'live' || M.mini) return false;
  const H = hoopDir(p); if (H.d > 240) return false;
  const mL = Math.hypot(c.mx || 0, c.mz || 0); if (mL < 0.3) return false;
  return ((c.mx || 0) * H.fx + (c.mz || 0) * H.fz) / mL > 0.3;
}
// the glide: where the layup goes up toward, and how fast to get there during the jump
function layPrep(p) {
  const H = hoopDir(p), h = H.h, k = p.layKind;
  p.fakeOK = false; p.layAuto = true;
  p.layRel = apexT(p) * (k === 'bank' ? 0.88 : 0.95) + gauss() * 0.02;
  let tx, tz;
  if (k === 'reverse') { tx = h.x + h.dir * 6; tz = h.z - (sgn(p.z - h.z) || 1) * 34; }          // under the rim to the far side
  else { const r = Math.min(H.d, 52); tx = h.x - H.fx * r; tz = h.z - H.fz * r; }                 // up toward a spot in front of the rim
  const air = Math.max(0.3, apexT(p) * 1.6), dx = tx - p.x, dz = tz - p.z, L = Math.hypot(dx, dz), v = Math.min(L / air, 260);
  if (L > 1) { p.fadeVx = dx / L * v; p.fadeVz = dz / L * v; }
  p.face = sgn(h.x - p.x) || p.face;
}
function startLayup(p, kind) {
  p.layKind = kind; p.sigShot = null; p.passHold = null; p.postUp = null;
  if (kind === 'euro') { p.layPend = true; startEuro(p); return; }
  p._layGo = true;
  try { applyShotType(p, kind === 'reverse' ? 'reverse' : 'layup'); startShot(p); } finally { p._layGo = false; }
  if (p.state === 'windup') { layPrep(p); if (LAY_LABEL[kind] && !M.attract) FX.pop(p.x, p.y + 132, p.z, LAY_LABEL[kind], '#ffffff'); }
}
{
  // SHOOT no longer makes a layup for you (MOVE does): near the rim without a dunk it's a floater
  const _cs = classifyShot;
  classifyShot = function (p) {
    const k = _cs.apply(this, arguments);
    if (p.human >= 0 && !p._layGo && (k === 'layup' || k === 'reverse' || k === 'euro' || k === 'gg')) return 'floater';
    return k;
  };
  const _ss = startShot;
  startShot = function (p) {
    const r = _ss.apply(this, arguments);
    if (p.layPend) { p.layPend = false; if (p.state === 'windup') layPrep(p); }                     // the euro step's finish
    else if (p.human < 0 && !p.layKind && (p.shotType === 'layup' || p.shotType === 'reverse')) p.layKind = p.shotType === 'reverse' ? 'reverse' : layupKind(p);
    return r;
  };
  // MOVE toward the rim: a layup (Turbo + MOVE on fire stays the self-oop, handled in v86-play)
  const take = (p, c) => {
    if (!p) return;
    if (p.layAuto && (p.state === 'windup' || p.state === 'shoot')) { c.bHeld = true; return; }
    if (c.x && !(p.fire && c.turbo) && layupOK(p, c)) { p.wantLay = layupKind(p); c.x = false; c.xHeld = false; }
  };
  const _hc = humanCmd;
  humanCmd = function (pad, c) { const r = _hc.apply(this, arguments); if (M.players && Net.role !== 'guest') take(M.players.find(q => q.human === pad), c); return r; };   // (an online guest's layups: v911-predict.js)
  const _rc = Net.remoteCmd;
  Net.remoteCmd = function (c) { const r = _rc.apply(this, arguments); if (M.players) take(M.players.find(q => q.human === 1), c); return r; };
  const _up = updatePlayer;
  updatePlayer = function (p, dt) {
    if (p.wantLay) { const k = p.wantLay; p.wantLay = null; if (ball.owner === p && p.state === 'free') startLayup(p, k); }
    const r = _up.apply(this, arguments);
    if (p.layAuto) {
      if (p.state === 'shoot' && ball.owner === p && p.st_t >= p.layRel) releaseShot(p);
      if (!['windup', 'shoot', 'sig'].includes(p.state)) p.layAuto = false;
    }
    if (p.layKind && !p.layAuto && p.state !== 'post' && p.state !== 'sig' && p.state !== 'windup' && p.state !== 'shoot') p.layKind = null;
    return r;
  };
  // a MOVE euro step finishes as a layup, not a dunk (SHOOT is the dunk button)
  const _cd = canDunk;
  canDunk = function (p) { return p && p.layPend ? false : _cd.apply(this, arguments); };
  // off the glass: a made bank layup is aimed at the board so it drops in off it
  const _ls = launchShot;
  launchShot = function (p, h, make, pts) {
    const r = _ls.apply(this, arguments);
    if (p.layKind !== 'bank' || !make) return r;
    const s1 = (ball.x - (h.bbx + h.dir * BALL_R)) * h.dir, s2 = Math.abs(h.x - h.bbx) - BALL_R;
    if (s1 < 20) return r;
    const T = 0.5 + Math.hypot(h.x - ball.x, h.z - ball.z) / 700, v = (s1 + s2 / 0.55) / T;
    ball.vx = -h.dir * v; ball.vz = (h.z - ball.z) / T; ball.vy = (RIM_Y + 2 - ball.y + 0.5 * grav() * T * T) / T;
    return r;
  };
}
// MOVE layups release themselves, so they aren't a timing shot (no GREEN, no EARLY/LATE): the make chance comes from
// finishing (Shooting and Dunking), the kind of layup, and how close the defense is (Defense and difficulty count)
const LAY_K = { roll: 1, bank: 1.02, reverse: 0.95, euro: 0.97, jelly: 0.96 };
function layupProb(p) {
  const fin = ((p.st.sht || 5) + (p.st.dnk || 5)) / 2;
  let pr = (0.78 + fin * 0.018) * (LAY_K[p.layKind] || 1);
  const od = nearestOppDist(p.x, p.z, p.team) + (p.layKind === 'euro' ? 18 : p.layKind === 'jelly' ? 10 : 0);
  pr *= od < 25 ? 0.55 : od < 60 ? 0.55 + (od - 25) / 35 * 0.25 : od < 110 ? 0.8 + (od - 60) / 50 * 0.2 : 1;
  let best = null, bd = 1e9; for (const o of p.opps || []) { const d = dxz(o, p); if (d < bd) { bd = d; best = o; } }
  if (best && bd < 120) pr *= 1 + (1 - defK(best)) * 0.3 * clamp((120 - bd) / 80, 0, 1);
  return clamp(pr, 0.05, 0.95);
}
{
  const _sw = shotWindow;
  shotWindow = function (p) { return p && p._layR ? 0 : _sw.apply(this, arguments); };
  const _sp = shotProbability;
  shotProbability = function (p) { return p && p._layR ? layupProb(p) / 1.06 : _sp.apply(this, arguments); };   // (the release divides back out its small off-timing bonus)
  const _rs = releaseShot;
  releaseShot = function (p) {
    if (!p || !p.layAuto || ball.owner !== p) return _rs.apply(this, arguments);
    const pop = FX.pop, note = typeof coachNote === 'function' ? coachNote : null;
    FX.pop = function (x, y, z, txt) { if (txt === 'EARLY' || txt === 'LATE') return; return pop.apply(this, arguments); };
    if (note) coachNote = () => {};
    p._layR = true;
    try { return _rs.apply(this, arguments); } finally { p._layR = false; FX.pop = pop; if (note) coachNote = note; }
  };
}
// the finish is one-handed: the ball moves from the gather (both hands) up into the shooting hand, over a moment
{
  const _ab = attachBall;
  attachBall = function (p) {
    const r = _ab.apply(this, arguments);
    if (p.state !== 'shoot' || ball.owner !== p || !p.layV || p.layV === 'putback') return r;
    const hd = p.hands.n, m = handsMid(p), k = clamp(p.st_t / 0.14, 0, 1), e = k * k * (3 - 2 * k);
    ball.x = lerp(ball.x, hd.x + p.face * 2, e); ball.y = Math.max(BALL_R, lerp(ball.y, hd.y + 6, e)); ball.z = lerp(ball.z, hd.z + 2, e);
    return r;
  };
}
// touch: the MOVE button says LAYUP (or OOP on fire while sprinting) when that's what it would do
{
  const _tu = TouchUI.update;
  TouchUI.update = function () {
    const r = _tu.apply(this, arguments);
    if (!this.shown || !this.btns || !this.btns.cross || !M.players) return r;
    const me = M.players.find(p => p.human === 0); if (!me || ball.owner !== me || me.postUp) return r;
    const c = me.cmd || {}, t = me.fire && c.turbo && selfOopOK(me) ? 'OOP' : layupOK(me, c) ? 'LAYUP' : 'MOVE';
    if (this.v99last !== t || this.btns.cross.firstChild.textContent !== t) { this.v99last = t; this.btns.cross.firstChild.textContent = t; }
    return r;
  };
}
