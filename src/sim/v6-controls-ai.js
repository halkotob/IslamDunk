// ------------------------------------------------------------- input → actions
freeLogic = function (p) {
  const c = p.cmd;
  if (ball.owner === p) {
    if (p.human >= 0) {
      if (c.s && callScreen(p)) return;
      if (c.x && !p.xHold) {
        if (Math.hypot(c.mx, c.mz) >= 0.3) { const m = classifyMove(p, c.mx, c.mz); if (startDribbleMove(p, m.kind, m.side)) return; }
        else if (!p.postUp) { p.xHold = { t: 0 }; return; }
      }
    } else {
      if (c.x && aiMove(p)) return;
      if (c.s && trySignature(p, true)) return;
    }
    if (c.b) {
      p.passHold = null;
      if (canDunk(p) && !p.postUp) { startDunk(p, {}); return; }
      const h = attackHoop(p.team), d = dxz(p, h);
      if (p.human >= 0 && d > 150 && d < 270 && !p.postUp) {
        const speed = Math.hypot(p.vx || 0, p.vz || 0), label = !(c.turbo && p.turboOK()) ? 'TURBO TO DUNK' : speed < 115 ? 'BUILD A RUN-UP' : 'DRIVE AT THE RIM';
        if (c.turbo) FX.pop(p.x, 132, p.z, label, '#ffd76a');
      }
      const k = classifyShot(p);
      if (k === 'euro') { startEuro(p); return; }
      applyShotType(p, k); p.postUp = null; p.fakeOK = p.human >= 0;
      startShot(p);
      return;
    }
    if (c.a) {
      if (p.human >= 0) { startPassInput(p); return; }
      const mate = c.passTo || p.mate; doPass(p, mate, c.alley === null ? autoAlley(p, mate) : c.alley);
    }
    return;
  }
  const h = ball.owner;
  if (h && h.team === p.team) {
    if (c.a && p.human >= 0 && h.human < 0) {
      h.ai.request = { type: 'pass', to: p };
      if (M.time - (p.ggT == null ? -9 : p.ggT) < 2.6) { h.ai.request.gg = true; p.ggPending = M.time; }   // give-and-go: call it right back
    }
    if (c.b) {
      if (p.human >= 0 && h.human < 0 && dxz(p, attackHoop(p.team)) < 300) h.ai.request = { type: 'alley', to: p };
      else startJump(p);
    }
  } else {
    if (c.a) { if (c.turbo && p.turboOK()) tryShove(p); else trySteal(p); }
    if (c.b) { if (p.human >= 0 ? c.turbo && p.turboOK() : c.swipeNow && p.turboOK()) startSwipe(p); else startJump(p); }   // CPU swipes only on a read chase-down
  }
};
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    _hc(pad, c);
    const b = BINDS[pad], d = Input.down, rel = k => b[k].some(x => Input.released[x]);
    c.xHeld = b.x.some(k => d[k]); c.aHeld = b.a.some(k => d[k]); c.aRel = rel('a'); c.sHeld = b.s.some(k => d[k]);
  };
  const _zc = zeroCmd;
  zeroCmd = function (c) { _zc(c); c.xHeld = false; c.aHeld = false; c.aRel = false; c.sHeld = false; };
}

// ------------------------------------------------------------- AI: moves, fakes, posts, chase-downs, late game
function aiMove(p) {
  const H = hoopDir(p), def = nearestOpp(p); if (!def) return false;
  const pl = p.ai.plan || {}, sig = sigKind(p.def), inFront = dxz(def, H.h) < H.d && dxz(def, p) < 80;
  const w = { cross: 3, btb: 1.4, hesi: 1.2, spin: 0, stepback: 0 };
  if (inFront && (pl.type === 'drive' || pl.type === 'dunk' || pl.type === 'probe')) w.spin = 2.2;
  if (H.d > 220 && H.d < 380) w.stepback = 1.6;
  if (w[sig] != null) w[sig] += 2.2;
  for (const k in w) if (beingRead(p, k)) w[k] *= 0.3;
  let tot = 0; for (const k in w) tot += w[k];
  let r = Math.random() * tot, kind = 'cross'; for (const k in w) { r -= w[k]; if (r <= 0) { kind = k; break; } }
  const side = sgn((p.x - def.x) * H.px + (p.z - def.z) * H.pz) || 1;
  return startDribbleMove(p, kind, side);
}
{
  const BP = Brain.prototype, _up = BP.update, _ex = BP.exec, _think = BP.think, _toff = BP.thinkOffBall;
  BP.think = function () { _think.call(this); this.faked = false; };
  BP.update = function (dt) {
    const p = this.p, fire = this.jumpAt > 0 && M.time >= this.jumpAt;
    _up.call(this, dt);
    const c = p.cmd; c.xHeld = false; c.aHeld = false; c.aRel = false;
    c.swipeNow = !!(fire && this.swipe && c.b);
    if (fire) this.swipe = false;
  };
  BP.thinkOffBall = function () {
    _toff.call(this);
    const p = this.p;
    if (p.human < 0 && M.time - (p.lastPassOut == null ? -9 : p.lastPassOut) < 1.4 && this.plan.type !== 'receive' && chance(0.55)) this.plan = { type: 'cut', u: 1 };   // pass and cut
    if (M.play && M.play.team === p.team && M.time - M.play.t0 < 7) {
      const bo = ball.owner;
      if (M.play.kind === 'iso' && bo && bo !== p) { const h = attackHoop(p.team); this.plan = { type: 'spot', x: h.x + h.dir * 70, z: bo.z < h.z ? 640 : 60, u: 1 }; }
    }
  };
  BP.exec = function (dt) {
    const p = this.p, c = p.cmd, pl = this.plan, cfg = this.cfg();
    // screen called (or set on its own): after the pick, roll to the rim or pop to the arc
    if (pl.type === 'screen' && M.time - (pl.t0 || 0) > (pl.called ? 2.0 : 1.4)) {
      const bo = ball.owner, both = bo && p.opps.every(o => dxz(o, bo) < 130);
      if (both || (p.screenHit && M.time - p.screenHit < 1.2)) { this.plan = { type: 'cut', u: 1, ctx: pl.ctx }; popOnce(p, 'roll', 'ROLLS', '#ffffff'); }
      else { const s = this.bestSpot(false); if (s) { this.plan = { type: 'spot', x: s.x, z: s.z, u: 1, ctx: pl.ctx }; popOnce(p, 'roll', 'POPS', '#ffffff'); } }
      this.t = 0.8;
    }
    // give-and-go play: hit the cutter right back
    if (M.play && M.play.kind === 'gg' && ball.owner === p && p.state === 'free') {
      const cut = p.mate, h = attackHoop(p.team);
      if (cut && cut.human >= 0 && p.holdT > 0.25) { const L = dxz(cut, h) || 1, v = ((h.x - cut.x) * (cut.vx || 0) + (h.z - cut.z) * (cut.vz || 0)) / L; if (v > 120) { c.a = true; c.passTo = cut; c.alley = false; cut.ggPending = M.time; return; } }
    }
    // pump fake before a contested jumper
    if (pl.type === 'shoot' && p.state === 'free' && ball.owner === p && !this.faked) {
      const def = nearestOpp(p);
      if (def && dxz(def, p) < 60 && def.y < 1 && chance(cfg.fake != null ? cfg.fake : 0.3)) { this.faked = true; startFake(p); return; }
      this.faked = true;
    }
    // post up: strong players back down near the paint
    if (pl.type === 'probe' && ball.owner === p && p.state === 'free' && !p.postUp && postEligible(p) && strOf(p) >= 5.5 && chance(dt * 0.6)) { enterPost(p); p.postUp.cpu = rand(0.9, 1.6); }
    if (p.postUp && ball.owner === p) {
      const h = attackHoop(p.team); this.moveTo(h.x + h.dir * 20, h.z, false, 0.6);
      if (p.postUp.cpu <= 0 && p.state === 'free') { p.postUp = null; c.b = true; c.mx = c.mz = 0; }
      return;
    }
    _ex.call(this, dt);
    // late game: foul on purpose when trailing
    if (pl.type === 'guardBall' && intentionalOK(p) && p.state === 'free' && chance(dt * 1.8)) { c.turbo = true; c.a = true; }
    // dig deep: dive on a loose ball in the final minute
    if (pl.type === 'chase' && digDeep() && p.state === 'free' && !ball.owner && ball.y < 60 && p.turbo > 25 && Math.hypot(ball.x - p.x, ball.z - p.z) < 100 && chance(0.05)) startDive(p);
  };
}
{
  // chase-downs: a beaten defender trailing a layup or dunk swipes with turbo
  const _nd = notifyDunk;
  notifyDunk = function (dk) {
    _nd(dk);
    const h = dk.act.hoop;
    for (const o of dk.opps) if (o.human < 0 && o.state === 'free' && chaseGeom(o, dk, h) && o.turbo > 20 && chance(0.7 + defLevel() * 0.1)) { o.ai.swipe = true; if (!(o.ai.jumpAt > 0)) o.ai.jumpAt = M.time + 0.18; }
  };
  const _nsh = notifyShot;
  notifyShot = function (sh) {
    _nsh(sh);
    const h = attackHoop(sh.team);
    if (dxz(sh, h) < 170) for (const o of sh.opps) if (o.human < 0 && chaseGeom(o, sh, h) && o.turbo > 20 && chance(0.6)) { o.ai.swipe = true; if (!(o.ai.jumpAt > 0)) o.ai.jumpAt = M.time + 0.22; }
  };
}

// ------------------------------------------------------------- timeouts + set plays
const PLAYS = [['pnr', 'Pick and roll', 'Your partner sets a screen, then rolls or pops'], ['gg', 'Give and go', 'Pass to your partner and cut: he hits you right back'],
  ['iso', 'Isolation', 'Your partner clears to the far corner'], ['run', 'Just advance the ball', 'Frontcourt inbound, no set play']];
function timeoutTeam() { const me = M.players && M.players.find(p => p.human === 0); return me ? me.team : -1; }
function canCallTimeout(team) {
  if (team < 0 || !M.timeouts || M.online || M.mini || M.practice || M.attract || Net.role) return false;
  if (M.timeouts[team] <= 0 || M.phase === 'ft' || M.phase === 'over' || M.phase === 'break' || M.phase === 'tip' || M.phase === 'timeout') return false;
  if (M.phase === 'live') return !!ball.owner && ball.owner.team === team && ball.owner.state === 'free';
  return M.phase === 'dead' && M.nextInbound === team && !M.pendingEnd;
}
function callTimeout(team, human) {
  M.timeouts[team]--; M.phase = 'timeout'; M.toT = 0; M.toTeam = team; M.toHuman = human; M.toSel = 0;
  if (ball.owner) { ball.owner.move = null; ball.owner.mv = null; }
  for (const q of M.players) { q.passHold = null; q.postUp = null; q.xHold = null; }
  SFX.whistle(); FX.callout('TIMEOUT', '#ffffff', M.teamDefs[team].name.toUpperCase() + '  •  ' + M.timeouts[team] + ' LEFT', true);
}
function frontcourtSetup(team, play) {
  const h = attackHoop(team), T = M.teams[team].players, D = M.teams[1 - team].players;
  const hm = T.find(p => p.human >= 0) || T.slice().sort((a, b) => (b.st.spd + (b.st.pas || 5)) - (a.st.spd + (a.st.pas || 5)))[0], mate = T.find(p => p !== hm);
  const side = chance(0.5) ? 1 : -1;
  M.camCut = true;
  place(hm, h.x + h.dir * 430, h.z + side * 230);
  if (mate) {
    if (play === 'pnr') place(mate, h.x + h.dir * 360, h.z + side * 140);
    else if (play === 'iso') place(mate, h.x + h.dir * 60, h.z - side * 290);
    else place(mate, h.x + h.dir * 320, h.z - side * 220);
  }
  D.forEach((d, i) => { const m = i === 0 ? hm : mate || hm, ux = h.x - m.x, uz = h.z - m.z, L = Math.hypot(ux, uz) || 1; place(d, m.x + ux / L * 55, m.z + uz / L * 55); });
  for (const p of T) { p.turbo = Math.min(100, p.turbo + 30); p.fat = Math.max(0, (p.fat || 0) - 0.35); }
  Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0 });
  M.possTeam = -1; giveBall(hm, 'inbound'); M.phase = 'live';
  if (M.fmt.sc > 0) M.shotClock = Math.max(M.shotClock, 14);
  M.play = play && play !== 'run' ? { kind: play, team, t0: M.time } : null;
  if (play && play !== 'run') FX.callout(PLAYS.find(x => x[0] === play)[1].toUpperCase(), '#ffd76a', 'SET PLAY');
  if (play === 'pnr' && mate && mate.human < 0) { const tgt = D[0]; mate.ai.plan = { type: 'screen', target: tgt, u: 1, t0: M.time, called: true, ctx: 'off' }; mate.ai.t = 2.2; }
}
function endTimeout(play) { M.phase = 'dead'; M.deadT = 0.05; M.nextInbound = M.toTeam; M.frontIn = { team: M.toTeam, play }; M.sideOut = null; M.toHuman = false; }
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    if (M.phase === 'timeout') {
      M.toT += dt;
      if (!M.toHuman && M.toT > 1.6) endTimeout(pick(['pnr', 'gg', 'iso', 'run']));
      updateCamera(dt); FX.update(dt); return;
    }
    _um(dt);
    // CPU timeout: trailing by 1-3 late with the ball
    if (M.phase === 'live' && M.timeouts && !M.attract && !M.practice && !M.mini && !M.online && M.fmt && !M.fmt.first21 && M.quarter >= M.fmt.periods && M.clock <= 24 && M.clock > 4 && ball.owner) {
      const t = ball.owner.team, diff = M.teams[1 - t].score - M.teams[t].score;
      if (!M.teams[t].players.some(p => p.human >= 0) && diff >= 1 && diff <= 3 && M.timeouts[t] > 0 && !(M.cpuTO || [])[t]) { M.cpuTO = M.cpuTO || []; M.cpuTO[t] = true; callTimeout(t, false); }
    }
  };
  const _nm = newMatch;
  newMatch = function (tA, tB, opts = {}) {
    M.scenario = null; M.play = null; M.intF = [0, 0]; M.sideOut = null; M.frontIn = null; M.pin = null; M.pinGrab = null; M.lastShot = null; M.cpuTO = null;
    M.cRoad = false; M.cBuzzer = false; M.cPin = false; M.cAndOne = false;
    _nm(tA, tB, opts);
    M.timeouts = [2, 2];
    for (const p of M.players) p.comp = 50;
  };
}

