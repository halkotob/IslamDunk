// ================================================= v9.8: PLAY-TEST REVIEW FIXES (feel checklist)
//   * Restarts. A foul side-out and a set play out of a timeout used to hand the ball over in place and go live the
//     same frame. Now everyone walks from where they stood to their spots (the fouled player to the spot of the
//     foul with the ball; the set play's formation after a timeout), the ball is checked ("CHECK"), then "BALL IN".
//     The shot clock and game clock wait. Half court already worked this way.
//   * Blocks. A jump that meets the ball early in its flight from in front of the shooter (between him and the
//     rim) is a good block chance, and Defense is what makes it likely: 25% at Defense 3, 57% at 10 (it was a roll
//     capped at 30% for everyone, so Defense stopped mattering above 7). From the side or behind it stays a long shot. The hand reaches a little farther
//     with Defense. A missed block says why: LATE or NO ANGLE.
//   * Dunk contests weigh Defense against Dunking more (a set rim protector stops more dunks).
//   * Steals depend on position (players.js trySteal): an exposed ball shows a gold ring under it when you're close
//     enough to reach it.
//   * Difficulty scales the CPU's defense too (DIFF.dk: blocks, steals, contests), not just its offense.
// ---------------------------------------------------------------- restarts after fouls and timeouts
{
  const _ib = inbound;
  inbound = function (team) {
    const full = !M.halfCourt && !M.mini && !M.practice;
    const side = M.sideOut && M.sideOut.team === team && M.sideOut.p, front = M.frontIn && M.frontIn.team === team;
    if (!full || !(side || front)) return _ib.apply(this, arguments);
    const pos = M.players.map(q => [q.x, q.z]);
    const r = _ib.apply(this, arguments);
    const bo = ball.owner; if (!bo || M.phase !== 'live') return r;
    const S = new Map();
    M.players.forEach((q, i) => { S.set(q, { x: q.x, z: q.z }); q.x = clamp(pos[i][0], 30, COURT.L - 30); q.z = clamp(pos[i][1], 30, COURT.D - 30); q.vx = q.vz = 0; if (q.hist) q.hist.length = 0; });
    M.camCut = false;
    M.check = { team, S, t: 0, stage: 'walk', bo, full: true };
    M.phase = 'dead'; M.deadT = 99; M.nextInbound = null; ball.grabLock = 9;
    return r;
  };
  const _cc = checkCmd;
  checkCmd = function (p) {
    const r = _cc.apply(this, arguments), K = M.check;
    if (K && K.full) { const h = attackHoop(K.team); p.cmd.face = p.team === K.team ? sgn(h.x - p.x) || p.face : sgn(K.bo.x - p.x) || p.face; }
    return r;
  };
  const _cl = checkLive;
  checkLive = function () { const K = M.check, r = _cl.apply(this, arguments); if (K && K.full && M.play) M.play.t0 = M.time; return r; };   // a set play starts when the ball is in
}

// ---------------------------------------------------------------- blocks
checkBlockJump = function (o) {
  if (ball.state !== 'shot' || !ball.shot || ball.shot.dunk || ball.shot.team === o.team || ball.shot.t > 0.45 || ball.shot.tried.has(o)) return;
  const def = o.st.def || 5, R = (o.swipe ? 38 : 26) + def * 1.0;
  if (Math.hypot(ball.x - (o.x + o.face * 6), ball.y - (o.y + 104), ball.z - o.z) >= R) return;
  ball.shot.tried.add(o);
  const sh = ball.shot.shooter, h = ball.shot.hoop;
  const lane = sh ? clamp((dxz(sh, h) - dxz(o, h) + 20) / 100, 0, 1) : 0;
  const height = sh ? clamp((o.y - sh.y) / 140, -0.08, 0.12) : 0;
  const chase = o.swipe && (o.chaseOK || chaseGeom(o, sh, h));
  if (o.swipe && sh && dxz(o, sh) < 22 && !chase && foulsOn() && chance(0.3)) {     // swiped through the body: shooting foul
    if (!ball.shot.foul) { ball.shot.foul = { by: o, pts: ball.shot.pts }; if (humanIn(o, sh)) popOnce(sh, 'contact', 'CONTACT', '#ffd76a'); }
    return;
  }
  const early = ball.shot.t <= 0.3, good = lane >= 0.5 && early;
  const pr = good ? clamp(0.12 + def * 0.045 + height, 0.15, 0.7) : clamp(0.02 + def * 0.01 + lane * 0.06 + height + (o.swipe ? 0.04 : 0), 0.02, 0.2);
  if (chance(clamp((pr + (chase ? 0.18 : 0)) * defK(o), 0.03, 0.95))) { if (chase) pinBlock(o, sh, h); else blockBall(o, sh); return; }
  if (o.human >= 0) popOnce(o, 'blk', !early ? 'LATE' : lane < 0.5 ? 'NO ANGLE' : 'JUST MISSED', '#9fb3c8', 0.8);
};
dunkContest = function (o, p) {
  const h = p.act.hoop, chase = o.swipe && (o.chaseOK || chaseGeom(o, p, h));
  const set = dxz(o, h) < dxz(p, h);                                          // between him and the rim
  let pr = 0.02 + ((o.st.def || 5) - (p.st.dnk || 5)) * 0.04 + (set ? 0.1 : 0) + (o.swipe ? 0.05 : 0) + (chase ? 0.2 : 0);
  if (chance(clamp(pr * defK(o), 0.03, 0.5))) { if (chase) pinBlock(o, p, h); else blockBall(o, p); return true; }
  if (foulsOn() && dxz(o, p) < 30 && chance(o.swipe ? 0.25 : 0.04)) p.act.foulBy = o;
  if (o.human >= 0) popOnce(o, 'blk', set ? 'CONTESTED' : 'NO ANGLE', '#9fb3c8', 0.8);
  return false;
};

// ---------------------------------------------------------------- contests scale with difficulty
{
  const _sp = shotProbability;
  shotProbability = function (p, x, z) {
    const pr = _sp.apply(this, arguments);
    if (!p || !p._rel) return pr;                                                 // only the real roll at release (AI shot choices are unchanged)
    let best = null, bd = 1e9; for (const o of p.opps || []) { const d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; best = o; } }
    if (!best || bd > 120) return pr;
    const close = clamp((120 - bd) / 80, 0, 1);
    return pr * (1 + (1 - defK(best)) * 0.3 * close);
  };
}

{
  const _rs = releaseShot;
  releaseShot = function (p) { if (p) p._rel = true; try { return _rs.apply(this, arguments); } finally { if (p) p._rel = false; } };
}
// ---------------------------------------------------------------- steal cue: a gold ring under an exposed ball
{
  const _dh = drawHot;
  drawHot = function (g) {
    _dh.apply(this, arguments);
    const h = ball.owner; if (!h || !M.players || M.phase !== 'live' || M.mini || M.gym || h.y > 10) return;
    const me = M.players.find(q => q.human >= 0 && q.team !== h.team && dxz(q, h) < 60 && ballExposed(q, h) && (Net.role !== 'guest' || q.human === 1));
    if (!me) return;
    const [x, y] = P(ball.x, 0, ball.z), a = 0.55 + 0.25 * Math.sin(Game.t * 10);
    g.save(); g.globalAlpha = a; g.strokeStyle = '#ffd76a'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 15, 15 * ZS, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  };
}
// Very easy: the CPU's own shots fall a little less too, so it is clearly easier than Easy (it measured almost the same)
{
  const _mk = cpuMakeK;
  cpuMakeK = function (p) { const k = _mk.apply(this, arguments); return (aiCfg(p.team) || DIFF.medium) === DIFF.veryeasy ? k * 0.9 : k; };
}

// ---------------------------------------------------------------- layups get their own animations
// Shots were already classified (layup, reverse, up and under, putback, euro, floater), but only signature moves had
// a pose, so every layup looked like a jump shot. Now: a gather step in the windup, then
//   finger roll: the ball carried up on a straight arm, knee driving (the normal layup);
//   jelly: a one-hand finesse scoop around the defender, body leaning in (a layup with a defender close);
//   reverse (arm up on the far side of the rim), up and under (low scoop) and putback (both hands up);
// and the follow-through holds the finish for a moment.
const LAY_POSE = {
  gather: { nk: 1.5, fk: 0.35, nh: 1.15, fh: -0.15, ns: 1.4, fs: 1.2, ne: 1.3, fe: 1.3, lean: 0.25, K: 750 },
  // v9.9: softer springs (smoother), and each finish reads differently
  roll: { ns: 3.1, ne: 0.08, fs: 1.0, fe: 1.1, nk: 1.7, fk: 0.15, nh: 1.3, fh: -0.2, lean: 0.08, K: 620 },        // tall: arm straight up, knee high
  bank: { ns: 2.55, ne: 0.3, fs: 1.6, fe: 0.9, nk: 1.45, fk: 0.3, nh: 1.1, fh: -0.1, lean: 0.24, K: 620 },        // arm reaching forward at the glass
  jelly: { ns: 2.1, ne: 0.1, fs: 1.9, fe: 0.5, nk: 1.1, fk: 0.6, nh: 0.85, fh: 0.15, lean: 0.4, K: 600 },          // wide one-hand scoop, body leaning in
  reverse: { ns: 3.15, ne: 0.7, fs: 0.8, fe: 1.4, nk: 1.35, fk: 0.35, nh: 1.0, fh: -0.25, lean: -0.22, K: 620 },  // leaning back, wrist flipping it behind
  euro: { ns: 2.8, ne: 0.25, fs: 1.3, fe: 1.0, nk: 1.25, fk: 0.9, nh: 0.95, fh: 0.35, lean: 0.3, K: 600 },         // long last step, legs split
  upunder: { ns: 2.6, ne: 0.45, fs: 1.4, fe: 1.1, nk: 1.2, fk: 0.6, nh: 0.8, fh: 0.2, lean: 0.28, K: 900 },
  putback: { ns: 3.2, fs: 3.1, ne: 0.2, fe: 0.2, nk: 0.5, fk: 0.4, nh: 0.3, fh: 0.1, lean: 0.05, K: 1000 }
};
function layVariant(p) {
  if (p.layKind) return p.layKind;                                              // v9.9: MOVE layups know their kind
  const k = p.sigShot ? null : p.shotType;
  if (k === 'layup' || k === 'gg') return (p.opps || []).some(o => dxz(o, p) < 75) ? 'jelly' : 'roll';
  if (k === 'reverse' || k === 'upunder' || k === 'putback') return k;
  return null;
}
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments), s = p.state;
    if (s === 'windup' || s === 'shoot') {
      if (s === 'windup' || !p.layV) p.layV = layVariant(p);
      if (p.layV) Object.assign(t, s === 'windup' ? LAY_POSE.gather : LAY_POSE[p.layV]);
    } else if (s === 'post' && p.layV && p.st_t < 0.35) Object.assign(t, LAY_POSE[p.layV], { nk: 0.6, fk: 0.4, nh: 0.3, fh: 0.1, K: 700 });
    else if (s !== 'post') p.layV = null;
    return t;
  };
  const _ss = startShot;
  startShot = function (p) { p.layV = null; const r = _ss.apply(this, arguments); return r; };
  const _rs = releaseShot;
  releaseShot = function (p) {
    const v = p.layV || layVariant(p); p.layV = v;
    if (v && p.human >= 0 && !M.mini && !p.layKind && (v === 'roll' || v === 'jelly')) popOnce(p, 'lay', v === 'roll' ? 'FINGER ROLL' : 'JELLY', '#fff', 0.6);
    return _rs.apply(this, arguments);
  };
}
