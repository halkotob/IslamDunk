// ------------------------------------------------------------- fouls (shared)
function foulsOn() { return M.phase === 'live' && !M.practice && !M.attract && !M.mini; }
function addFoul(p) { M.teamFouls[p.team]++; p.stats.pf = (p.stats.pf || 0) + 1; }
// stop play and send `victim` to the line for n free throws (n = 1 is an and-one)
function foulShots(by, victim, n, title, sub) {
  SFX.whistle(); FX.callout(title, '#ffd76a', sub, true);
  if (ball.owner) { const o = ball.owner; ball.owner = null; ball.state = 'loose'; o.move = null; }
  ball.shot = null; ball.pass = null; M.pendingEnd = false;
  for (const q of M.players) { q.mv = null; q.postUp = null; q.passHold = null; }
  M.phase = 'ft'; M.ft = { shooter: victim, team: victim.team, n, i: 0, stage: 'pause', t: 0, made: 0, res: null };
}
// non-shooting foul out of the bonus: the fouled team keeps it where it was
function sideOut(victim, title, sub) {
  SFX.whistle(); FX.callout(title, '#ffd76a', sub, true);
  if (ball.owner) { const o = ball.owner; ball.owner = null; o.move = null; }
  ball.state = 'loose'; ball.shot = null; ball.pass = null; ball.vx = ball.vz = 0; ball.vy = 0; ball.grabLock = 5;
  for (const q of M.players) { q.mv = null; q.postUp = null; q.passHold = null; }
  M.sideOut = { team: victim.team, p: victim, x: victim.x, z: victim.z, sc: Math.max(M.shotClock, 14) };
  M.phase = 'dead'; M.deadT = 0.9; M.nextInbound = victim.team;
}
function nonShootingFoul(by, victim, title) {
  addFoul(by); compAdd(by, -4);
  const sub = 'ON ' + by.def.name.toUpperCase() + (teamFouls(by.team) >= BONUS_AT ? '  •  BONUS' : '');
  if (teamFouls(by.team) >= BONUS_AT) foulShots(by, victim, 2, title, sub);
  else sideOut(victim, title, sub);
}
{
  const _ib = inbound;
  inbound = function (team) {
    const s = M.sideOut;
    if (s && s.team === team && s.p) {
      M.sideOut = null; M.camCut = true;
      const H = hoopDir(s.p);
      place(s.p, clamp(s.x, 40, COURT.L - 40), clamp(s.z, 40, COURT.D - 40)); s.p.face = sgn(H.h.x - s.p.x) || 1;
      Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0 });
      M.possTeam = -1; giveBall(s.p, 'inbound'); M.phase = 'live'; if (M.fmt.sc > 0) M.shotClock = s.sc;
      return;
    }
    if (M.frontIn && M.frontIn.team === team) { const f = M.frontIn; M.frontIn = null; frontcourtSetup(team, f.play); return; }
    M.sideOut = null; _ib(team);
  };
}

// ------------------------------------------------------------- steals + reach-ins
{
  const _ts = trySteal;
  trySteal = function (p) {
    const h = ball.owner;
    if (foulsOn() && p.cd.steal <= 0 && h && h.team !== p.team && dxz(p, h) < 54 && h.y < 10 && !h.move && !ballExposed(p, h)) {
      // reaching across his body (the ball is on the far side): a reach-in foul risk
      const rate = (defLevel() < 0.7 ? 0.1 : defLevel() < 1.6 ? 0.16 : 0.22) * (p.stance ? 0.6 : 1);
      if (chance(rate)) { p.cd.steal = 0.5; p.state = 'steal'; p.st_t = 0; p.face = sgn(h.x - p.x); nonShootingFoul(p, h, 'REACH-IN!'); return; }
    }
    const was = p.st.stl;
    if (p.stance && h && ballExposed(p, h)) p.st.stl = (was || 5) + 1.5;   // in stance you read the dribble hand better
    _ts(p);
    p.st.stl = was;
  };
}

// ------------------------------------------------------------- shoves, intentional fouls
function intentionalOK(p) {
  if (!foulsOn() || M.fmt.first21) return false;
  const bo = ball.owner, me = M.teams[p.team].score, them = M.teams[1 - p.team].score;
  if (p.human < 0 && ((M.intF || [0, 0])[p.team] >= 3 || M.clock > 30 || them - me > 6)) return false;
  return M.quarter >= M.fmt.periods && M.clock <= 40 && them - me >= 1 && them - me <= 8 && bo && bo.team !== p.team && dxz(bo, p) < 52;
}
{
  const _sh = tryShove;
  tryShove = function (p) {
    if (p.cd.shove > 0) return;
    if (intentionalOK(p)) {                                         // fouling on purpose: a grab, not a shove; stops the clock
      const t = ball.owner; p.cd.shove = 1.0; p.state = 'shove'; p.st_t = 0; p.face = sgn(t.x - p.x);
      M.intF = M.intF || [0, 0]; M.intF[p.team]++;
      addFoul(p); foulShots(p, t, 2, 'FOUL ON PURPOSE', 'STOPS THE CLOCK  •  2 SHOTS'); return;
    }
    _sh(p);
  };
  const _cf = callFoul;
  callFoul = function (p, tgt) { p.hardFouls = (p.hardFouls || 0) + 1; compAdd(p, -6); _cf(p, tgt); FX.callout('HARD FOUL!', '#ffd76a', 'ON ' + p.def.name.toUpperCase() + '  •  WATCH THE ADAB', true); };
}

// ------------------------------------------------------------- stance
function stanceStep(p, dt) {
  const bo = ball.owner, onD = bo ? bo.team !== p.team : !!(ball.pass && ball.pass.from.team !== p.team);
  const ground = p.state === 'free' && p.y < 1;
  if (p.human >= 0) p.stance = ground && !!p.cmd.stanceHeld && (onD || !!ball.shot || ball.state === 'loose' || (p.v7 && p.v7.plant > 0)) && bo !== p;   // v7: PASS held (or a planted charge)
  else p.stance = ground && onD && !!bo && p.ai.plan && p.ai.plan.type === 'guardBall' && dxz(p, bo) < 95 && !p.cmd.turbo;
  p.boxing = (p.stance && (!!ball.shot || ball.state === 'loose')) || (p.human < 0 && p.ai.plan && p.ai.plan.type === 'box');
  if (p.human >= 0 && p.boxing && !bo) {                              // box-out: stay attached between your man and the rim
    const h = ball.shot ? ball.shot.hoop : defendHoop(p.team);
    let man = null, md = 90; for (const o of p.opps) { const d = dxz(o, p); if (d < md && o.y < 5) { md = d; man = o; } }
    if (man && dxz(man, h) < 280) {
      const L = dxz(man, h) || 1, tx = man.x + (h.x - man.x) / L * 26, tz = man.z + (h.z - man.z) / L * 26, dx = tx - p.x, dz = tz - p.z, D = Math.hypot(dx, dz);
      if (D > 4) { p.cmd.mx = clamp(dx / D * Math.min(1, D / 30), -1, 1); p.cmd.mz = clamp(dz / D * Math.min(1, D / 30), -1, 1); }
      p.cmd.face = sgn(man.x - p.x) || p.face;
    }
  }
  if (p.human >= 0 && p.stance && bo && onD && dxz(p, bo) < 150) {   // mirror assist: drift to the spot between the handler and the rim
    const h = defendHoop(p.team), ux = h.x - bo.x, uz = h.z - bo.z, L = Math.hypot(ux, uz) || 1;
    const tx = bo.x + ux / L * 38, tz = bo.z + uz / L * 38, dx = tx - p.x, dz = tz - p.z, D = Math.hypot(dx, dz);
    if (D > 6) { p.cmd.mx = clamp(p.cmd.mx + dx / D * 0.35 * Math.min(1, D / 40), -1, 1); p.cmd.mz = clamp(p.cmd.mz + dz / D * 0.35 * Math.min(1, D / 40), -1, 1); }
    p.cmd.face = sgn(bo.x - p.x) || p.face;
  }
  if (p.sealT > 0) p.sealT -= dt;
}
{
  const _spd = Player.prototype.speed;
  Player.prototype.speed = function () { let s = _spd.call(this); if (this.stance) s *= this.boxing && !ball.owner ? 0.95 : 0.84; if (this.postUp) s *= 0.4; if (this.state === 'fake') s *= 0.5; return s; };
}

// ------------------------------------------------------------- swipe + chase-down blocks
function startSwipe(p) {
  if (p.cd.jump > 0 || p.y > 0) return;
  startJump(p); if (p.state !== 'jump') return;
  p.swipe = true; if (!p.fire) p.turbo = Math.max(0, p.turbo - 15);
  const bo = ball.owner || (ball.shot && ball.shot.shooter); p.chaseOK = !!(bo && bo.team !== p.team && chaseGeom(p, bo, attackHoop(bo.team)));   // read at takeoff
  const tgt = ball.owner || ball, dx = tgt.x - p.x, dz = tgt.z - p.z, L = Math.hypot(dx, dz) || 1;
  p.vx += dx / L * 170; p.vz += dz / L * 110;                     // lunge at the ball
}
function chaseGeom(o, sh, h) {                                       // defender running a shooter down from behind at the rim
  if (!sh || dxz(sh, h) > 170 || dxz(o, sh) > 110 || dxz(o, h) < dxz(sh, h) - 4) return false;
  const ax = h.x - sh.x, az = h.z - sh.z, A = Math.hypot(ax, az) || 1, bx = o.x - sh.x, bz = o.z - sh.z, B = Math.hypot(bx, bz) || 1;
  if ((ax * bx + az * bz) / (A * B) > -0.2) return false;            // trailing behind him, not beside him
  const ov = Math.hypot(o.vx || 0, o.vz || 0);
  return ov > 120 && ((o.vx || 0) * ax + (o.vz || 0) * az) / (ov * A) > 0.3;
}
function humanIn(...ps) { return ps.some(q => q && q.human >= 0); }
checkBlockJump = function (o) {
  if (ball.state !== 'shot' || !ball.shot || ball.shot.dunk || ball.shot.team === o.team || ball.shot.t > 0.45 || ball.shot.tried.has(o)) return;
  const R = o.swipe ? 42 : 30;
  if (Math.hypot(ball.x - (o.x + o.face * 6), ball.y - (o.y + 104), ball.z - o.z) >= R) return;
  ball.shot.tried.add(o);
  const sh = ball.shot.shooter, h = ball.shot.hoop;
  const lane = sh ? clamp((dxz(sh, h) - dxz(o, h) + 20) / 100, 0, 1) : 0;
  const height = sh ? clamp((o.y - sh.y) / 140, -0.08, 0.12) : 0;
  const chase = o.swipe && (o.chaseOK || chaseGeom(o, sh, h));
  let pr = 0.08 + o.st.def * 0.027 + lane * 0.16 + height + (o.swipe ? 0.05 : 0) + (chase ? 0.18 : 0);
  if (o.swipe && sh && dxz(o, sh) < 22 && !chase && foulsOn() && chance(0.3)) {     // swiped through the body: shooting foul
    if (!ball.shot.foul) { ball.shot.foul = { by: o, pts: ball.shot.pts }; if (humanIn(o, sh)) popOnce(sh, 'contact', 'CONTACT', '#ffd76a'); }
    return;
  }
  if (chance(clamp(pr, 0.05, 0.58))) { if (chase) pinBlock(o, sh, h); else blockBall(o, sh); }
};
function dunkContest(o, p) {                                         // called from dunkUpdate for each airborne defender at the ball
  const h = p.act.hoop, chase = o.swipe && (o.chaseOK || chaseGeom(o, p, h));
  let pr = 0.12 + o.st.def * 0.03 - p.st.dnk * 0.02 + (o.swipe ? 0.05 : 0) + (chase ? 0.2 : 0);
  if (chance(clamp(pr, 0.03, 0.55))) { if (chase) pinBlock(o, p, h); else blockBall(o, p); return true; }
  if (foulsOn() && dxz(o, p) < 30 && chance(o.swipe ? 0.25 : 0.04)) p.act.foulBy = o;          // contact on the way up
  return false;
}
function pinBlock(o, victim, h) {
  blockBall(o, victim);
  ball.x = h.bbx + h.dir * (BALL_R + 1); ball.y = RIM_Y + 46; ball.z = clamp(ball.z, h.z - 38, h.z + 38);
  ball.vx = ball.vz = ball.vy = 0; ball.state = 'loose';
  M.pin = { t: 0.34, team: o.team, h };
  FX.callout('PINNED!', '#8fe3ff', 'CHASE-DOWN OFF THE GLASS', true); FX.slowmo(0.35, 0.5); SFX.board(); h.vy -= 30;
  if (isMine(o)) { Ach.unlock('pinned'); M.cPin = true; }
  compAdd(o, 4);
}
{
  const _ub = updateBall;
  updateBall = function (dt) {
    if (M.pin && M.pin.t > 0 && !ball.owner) {                      // the ball sticks to the glass for a beat
      M.pin.t -= dt; ball.vx = ball.vy = ball.vz = 0; ball.px = ball.x; ball.py = ball.y; ball.pz = ball.z;
      if (M.pin.t <= 0) { ball.vy = -40; ball.vx = M.pin.h.dir * 70; M.pinGrab = { team: M.pin.team, until: M.time + 0.6 }; M.pin = null; }
      return;
    }
    const sh = ball.shot, before = ball.state;
    _ub(dt);
    // a fouled shot that misses: free throws (2, or 3 on a three)
    if (sh && sh.foul && !sh.resolved && before === 'shot' && ball.state === 'loose' && foulsOn()) {
      sh.resolved = true; const by = sh.foul.by; addFoul(by);
      foulShots(by, sh.shooter, sh.pts === 3 ? 3 : 2, 'SHOOTING FOUL', 'ON ' + by.def.name.toUpperCase() + '  •  ' + (sh.pts === 3 ? 3 : 2) + ' SHOTS');
    }
  };
}

// ------------------------------------------------------------- rebounds: box-outs, putbacks, tip-ins
function boxStep(dt) {
  if (M.mini || M.attract && !M.players.length) return;
  const shot = ball.shot, h = shot ? shot.hoop : (M.lastShot && M.time - M.lastShot.t < 1.6 ? M.lastShot.hoop : null);
  if (!h || ball.owner) return;
  for (const a of M.players) {
    if (!a.boxing || a.y > 1 || a.state === 'down' || dxz(a, h) > 240) continue;
    for (const b of a.opps) {
      if (b.y > 1 || b.state === 'down' || dxz(a, b) > 36 || dxz(a, h) >= dxz(b, h)) continue;
      const push = clamp(strOf(a) - strOf(b) + 2.5, 0.3, 6) * 36 * dt, L = dxz(b, h) || 1, ux = (b.x - h.x) / L, uz = (b.z - h.z) / L;
      const inward = -((b.vx || 0) * ux + (b.vz || 0) * uz);                    // sealed: he can't run through the boxer
      if (inward > 0) { b.vx += ux * inward; b.vz += uz * inward; }
      const ain = (a.vx || 0) * -ux + (a.vz || 0) * -uz; if (ain > 0) { a.vx += ux * ain * 0.6; a.vz += uz * ain * 0.6; }
      b.x += ux * push; b.z = clamp(b.z + uz * push, 8, COURT.D - 8); b.sealT = 0.4;
      if ((!shot || !shot.boxPop) && humanIn(a, b)) { if (shot) shot.boxPop = true; popOnce(a, 'box', 'BOXED OUT', '#8fe3ff', 2); }
    }
  }
}
checkGrab = function () {
  if (ball.grabLock > 0) return;
  let best = null, bd = 1e9;
  const pg = M.pinGrab && M.time < M.pinGrab.until ? M.pinGrab.team : -1;
  for (const p of M.players) {
    if (p.state === 'down' || p.state === 'dunk' || p.state === 'hang' || p.state === 'getup') continue;
    if (pg >= 0 && p.team !== pg) continue;
    const top = p.y + (p.state === 'jump' ? 112 : 74), d = Math.hypot(ball.x - p.x, ball.z - p.z);
    let reach = (ball.y < 40 && p.y < 5 ? 34 : 26) + (st7(p, 'hus') - 5) * 1.2;
    if (p.boxing) reach += 5; if (p.sealT > 0) reach -= 9; if (p.state === 'dive') reach += 30;
    if (d < reach && ball.y - BALL_R < top && ball.y > p.y - 4 && d < bd) { bd = d; best = p; }
  }
  if (best) giveBall(best, 'loose');
};
function tipStep(p) {                                                // offensive player in the air at the rim: tip it back in
  if (p.state !== 'jump' || ball.owner || ball.state !== 'loose' || M.mini || !M.lastShot || M.lastShot.team !== p.team || M.time - M.lastShot.t > 2.5) return;
  const h = attackHoop(p.team), hd = handsMid(p);
  if (Math.hypot(ball.x - hd.x, ball.y - hd.y - 10, ball.z - hd.z) > 28 || Math.hypot(ball.x - h.x, ball.z - h.z) > 80 || ball.y < RIM_Y - 30 || p.tipped) return;
  p.tipped = true; ball.owner = p;
  p.stats.fga++; const make = chance(clamp(0.38 + (p.st.dnk - 5) * 0.03 + (p.st.sht - 5) * 0.02, 0.15, 0.7));
  launchShot(p, h, make, 2); ball.shot.tip = true; ball.shot.type = 'tip';
  FX.pop(p.x, p.y + 140, p.z, 'TIP!', '#ffffff'); SFX.swipe(); logMove(p, 'tip');
}

// ------------------------------------------------------------- contact on drives
function bumpStep(dt) {
  if (!liveGame()) return;
  const h = ball.owner; if (!h || h.y > 1 || (h.state !== 'free' && h.state !== 'windup')) return;
  const sp = Math.hypot(h.vx, h.vz); if (sp < 200 || (h.bumpCd || 0) > M.time) return;
  const hp = attackHoop(h.team);
  for (const o of h.opps) {
    if (o.state !== 'free' || o.y > 1 || dxz(o, h) > 31) continue;
    const tx = o.x - h.x, tz = o.z - h.z, d = Math.hypot(tx, tz) || 1, headOn = (h.vx * tx + h.vz * tz) / (sp * d);
    if (headOn < 0.72 || dxz(o, hp) > dxz(h, hp) + 5) continue;
    h.bumpCd = M.time + 1.2;
    if (!humanIn(h, o) && chance(0.5)) return;
    const ov = Math.hypot(o.vx || 0, o.vz || 0), into = ov > 1 ? ((o.vx || 0) * -tx + (o.vz || 0) * -tz) / (ov * d) : 0;
    if (ov > 110 && into > 0.5 && !o.stance && chance(0.4)) {          // still moving into him: blocking foul
      compAdd(o, -3);
      if (h.state === 'windup') { addFoul(o); foulShots(o, h, 2, 'BLOCKING FOUL', 'ON ' + o.def.name.toUpperCase() + '  •  2 SHOTS'); }
      else nonShootingFoul(o, h, 'BLOCKING FOUL');
      return;
    }
    const s = strOf(h) + sp / 125 - strOf(o) - (o.stance ? 1.5 : 0) - (o.setT > 0.2 ? 0.8 : 0);
    if (s > 1.5) { o.stumble = Math.max(o.stumble || 0, 0.35); o.x += tx / d * 18; o.z = clamp(o.z + tz / d * 18, 8, COURT.D - 8); h.vx *= 0.75; h.vz *= 0.75; if (humanIn(h, o)) popOnce(o, 'bump', 'BUMPED', '#ffffff'); }
    else if (s < -1) { const side = sgn(-tz * h.vx + tx * h.vz) || 1; const vx = h.vx, vz = h.vz; h.vx = (vx * 0.3 - vz * 0.5 * side) * 0.6; h.vz = (vz * 0.3 + vx * 0.5 * side) * 0.6; h.stumble = Math.max(h.stumble || 0, 0.15); if (humanIn(h, o)) popOnce(h, 'bump', 'KNOCKED OFF HIS LINE', '#ffd76a'); }
    else { h.vx *= 0.6; h.vz *= 0.6; o.vx *= 0.5; o.vz *= 0.5; if (humanIn(h, o)) popOnce(h, 'bump', 'CONTACT', '#ffffff'); }
    SFX.thud && SFX.thud(0.4); FX.dust((h.x + o.x) / 2, (h.z + o.z) / 2, 2); react(h, 'fist', 0.4);
    return;
  }
}
// contact on a jump shot or layup: maybe a shooting foul (an and-one if it falls)
function shotContact(p) {
  if (!foulsOn() || M.phase === 'ft') return null;
  let by = null, rate = 0;
  for (const o of p.opps) {
    if (o.state === 'down' || dxz(o, p) > 22) continue;
    const ov = Math.hypot(o.vx || 0, o.vz || 0), into = ov > 1 ? ((o.vx || 0) * (p.x - o.x) + (o.vz || 0) * (p.z - o.z)) / (ov * (dxz(o, p) || 1)) : 0;
    let r = o.swipe ? 0.32 : o.y > 15 ? (ov > 110 && into > 0.5 ? 0.12 : 0.02) : (ov > 140 && into > 0.5 ? 0.14 : 0.015);   // straight up: verticality
    if (r > rate) { rate = r; by = o; }
  }
  return by && chance(rate) ? by : null;
}
{
  const _rs = releaseShot;
  releaseShot = function (p) {
    if (ball.owner !== p) { _rs(p); return; }
    const by = shotContact(p), od = nearestOppDist(p.x, p.z, p.team);
    if (by) { p.contactK = clamp(0.62 + (strOf(p) - strOf(by)) * 0.03, 0.48, 0.78); if (humanIn(p, by)) popOnce(p, 'contact', 'CONTACT', '#ffd76a'); }
    const type = p.sigShot || p.shotType;
    _rs(p);
    p.contactK = null; p.shotType = null;
    if (ball.shot && ball.shot.shooter === p) {
      if (by) ball.shot.foul = { by, pts: ball.shot.pts };
      ball.shot.od = od; ball.shot.type = type;
      M.lastShot = { team: p.team, t: M.time, hoop: ball.shot.hoop };
      if (ball.shot.green) compAdd(p, 2); else if (od < 35 && !LAYUP_TYPES.has(type)) compAdd(p, -3);
    }
  };
  const _sl = slam;
  slam = function (p, a) {
    const t0 = M.time;
    _sl(p, a);
    if (!ball.shot || ball.shot.shooter !== p) return;
    M.lastShot = { team: p.team, t: M.time, hoop: a.hoop };
    const poster = M.lastPoster && M.lastPoster.p === p && M.lastPoster.t === t0;
    let victim = null, vd = 60;
    for (const o of p.opps) { const d = dxz(o, p); if (o.y > 30 && o.state === 'jump' && d < vd) { vd = d; victim = o; } }
    if (poster && victim) {                                          // posterized: he goes down like he got shoved
      const nx = (victim.x - p.x) / (vd || 1), nz = (victim.z - p.z) / (vd || 1);
      knockDown(victim, nx || p.face, nz); victim.vx = (nx || p.face) * 260; victim.vz = nz * 260;
      FX.burst((p.x + victim.x) / 2, victim.y + 80, (p.z + victim.z) / 2, 8, 'star', ['#ffe38a', '#ffffff']); SFX.thud && SFX.thud(1);
      FX.shake(4, 0.25); compAdd(victim, -4);
      if (!a.foulBy && chance(0.3)) a.foulBy = victim;
    } else if (victim && vd < 30 && !a.foulBy && chance(0.06)) a.foulBy = victim;
    if (a.foulBy && !M.practice && !M.attract && !M.mini) ball.shot.foul = { by: a.foulBy, pts: 2 };
  };
}
{
  const _os = onScore;
  onScore = function (h) {
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null, ft = M.phase === 'ft';
    _os(h);
    if (ft || !sh || M.mini || M.practice) return;
    const shooter = sh.shooter;
    if (shooter && shooter.team === (M.halfCourt ? sh.team : h === hoops[1] ? 0 : 1)) {
      compAdd(shooter, (sh.od || 0) > 70 ? 6 : 3);
      const lp = ball.lastPasser; if (lp && lp.team === shooter.team && lp !== shooter) compAdd(lp, 4);
      if (M.scenario) scenScore(sh, shooter);
    }
    if (sh.foul && !sh.resolved && !M.attract && M.phase === 'dead') {       // and-one
      sh.resolved = true; addFoul(sh.foul.by);
      if (isMine(shooter)) { Ach.unlock('and_one'); M.cAndOne = true; }
      compAdd(shooter, 4);
      foulShots(sh.foul.by, shooter, 1, 'AND ONE!', 'FOUL ON ' + sh.foul.by.def.name.toUpperCase() + '  •  1 SHOT');
    }
  };
  const _bb = blockBall;
  blockBall = function (o, victim) {
    const sh = ball.shot; _bb(o, victim); compAdd(o, 5); compAdd(victim, -2);
    if (sh && sh.foul && !sh.resolved && foulsOn()) { sh.resolved = true; const by = sh.foul.by; addFoul(by); foulShots(by, sh.shooter, sh.pts === 3 ? 3 : 2, 'SHOOTING FOUL', 'ON ' + by.def.name.toUpperCase() + '  •  ' + (sh.pts === 3 ? 3 : 2) + ' SHOTS'); }
  };
  const _gb = giveBall;
  giveBall = function (p, how) {
    const prev = ball.owner || (ball.pass && ball.pass.from), fromShot = !!ball.shot || (M.lastShot && M.time - M.lastShot.t < 2);
    _gb(p, how);
    if (how === 'steal' && prev && prev.team !== p.team) { compAdd(prev, -8); compAdd(p, 5); prev.tov = (prev.tov || 0) + 1; }
    if (how === 'loose' && fromShot && M.lastShot && M.lastShot.team === p.team && dxz(p, attackHoop(p.team)) < 200) { p.orebT = M.time; compAdd(p, 2); }
    if (how === 'loose' && M.lastShot && M.lastShot.team !== p.team) M.lastShot = null;
    p.tipped = false;
    if (M.scenario) scenPossession(p);
  };
  const _ch = AchEvents.charge;
  AchEvents.charge = function (o) { compAdd(o, 5); if (ball.owner && ball.owner.team !== o.team) { compAdd(ball.owner, -8); ball.owner.tov = (ball.owner.tov || 0) + 1; } return _ch.apply(this, arguments); };
  const _scv = shotClockViolation;
  shotClockViolation = function () { if (ball.owner) { compAdd(ball.owner, -6); ball.owner.tov = (ball.owner.tov || 0) + 1; } _scv(); };
}

// ------------------------------------------------------------- dig deep: dives
function digDeep() { return !!M.fmt && !M.fmt.first21 && (M.quarter >= M.fmt.periods && M.clock <= 60 || !!M.scenario); }
function startDive(p) {
  const dx = ball.x - p.x, dz = ball.z - p.z, L = Math.hypot(dx, dz) || 1;
  p.state = 'dive'; p.st_t = 0; p.vx = dx / L * 430; p.vz = dz / L * 430; p.move = null;
  if (!p.fire) p.turbo = Math.max(0, p.turbo - 30); p.fat = clamp((p.fat || 0) + 0.3, 0, 1);
  FX.pop(p.x, p.y + 130, p.z, 'DIVES FOR IT!', '#ffd76a'); SFX.squeak();
}
function diveStep(p, dt) {
  if (p.state !== 'dive') return;
  p.vx *= 0.93; p.vz *= 0.93; p.y = Math.max(0, 14 * Math.sin(Math.PI * clamp(p.st_t / 0.4, 0, 1)));
  if (!ball.owner && ball.state === 'loose' && Math.hypot(ball.x - p.x, ball.z - p.z) < 56 && ball.y < 90 && ball.grabLock <= 0) { giveBall(p, 'loose'); compAdd(p, 4); FX.callout('HUSTLE!', '#ffd76a', p.def.name.toUpperCase()); }
  if (p.st_t > 0.42) { p.y = 0; if (ball.owner === p) { p.state = 'getup'; p.st_t = 0; } else { p.state = 'down'; p.st_t = 0.55; p.fallDir = sgn(p.vx) || 1; } }
}

// ------------------------------------------------------------- per-player hooks
function preStep(p, dt) {
  const c = p.cmd;
  if (p.comp == null) p.comp = 50; else p.comp += (50 - p.comp) * 0.004 * dt;
  stanceStep(p, dt);
  if (p.human >= 0 && p.state === 'free') {
    // dig deep: turbo + pass near a loose ball in the final minute
    if (c.a && c.turbo && p.turbo > 20 && digDeep() && !ball.owner && ball.state === 'loose' && Math.hypot(ball.x - p.x, ball.z - p.z) < 120 && ball.y < 70) { c.a = false; startDive(p); return; }
    // MOVE with no direction: tap = hesitation, hold near the paint = post up
    const xh = p.xHold;
    if (xh) {
      if (ball.owner !== p) p.xHold = null;
      else if (c.xHeld) { xh.t += dt; if (xh.t >= 0.2 && !p.postUp && postEligible(p)) { p.xHold = null; enterPost(p); } }
      else { p.xHold = null; if (xh.t < 0.3 && !p.postUp) startDribbleMove(p, 'hesi', 1); }
    }
    passHoldStep(p, dt);
  }
}
function postStep2(p, dt) {
  moveStep(p, dt); postStep(p, dt); fakeStep(p); diveStep(p, dt); tipStep(p);
  if (p.state !== 'jump') { p.swipe = false; if (p.state === 'free') p.tipped = false; }
}
{
  const _upl = updatePlayer;
  updatePlayer = function (p, dt) {
    preStep(p, dt);
    if (p.state === 'dive') {                                       // a dive is its own little flight
      p.st_t += dt; p.x += p.vx * dt; p.z += p.vz * dt; p.x = clamp(p.x, -20, COURT.L + 20); p.z = clamp(p.z, 20, COURT.D - 20);
      diveStep(p, dt); p.hist.push({ x: p.x, z: p.z, vx: p.vx, vz: p.vz }); if (p.hist.length > 40) p.hist.shift(); animate(p, dt); return;
    }
    if (p.state === 'windup' && p.human === 1 && Net.role === 'host' && p.st_t === 0) Net.pendRel = null;
    if (p.state === 'windup' && p.human >= 0 && p.fakeOK && M.phase !== 'ft' && p.st_t + dt < (p.windT || 0.13) && !p.cmd.bHeld && ball.owner === p) {
      p.fakeOK = false; startFake(p); p.shotType = null; p.sigShot = null; p.fadeVx = p.fadeVz = 0;   // tap SHOOT: pump fake
    }
    if (p.state !== 'windup') p.fakeOK = false;
    if (p.state === 'windup' && p.human >= 0 && p.st_t + dt >= 0.1 && p.st_t + dt < (p.windT || 0.1)) { p.st_t += dt; p.vx *= 0.5; p.vz *= 0.5; animate(p, dt); return; }   // a few ms longer gather for humans (tap = fake)
    _upl(p, dt);
    postStep2(p, dt);
  };
}
{
  const _cp = collidePlayers;
  collidePlayers = function () { _cp(); if (M.mini) return; screenStep(); boxStep(STEP); bumpStep(STEP); };
}
