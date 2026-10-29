// ================================================= v8.6: PLAY: TRANSITION, MOVES, DUNKS, BLOCKS, TAUNTS
// * Transition: after a steal or a rebound the CPU teammate leaks out and runs a lane; the handler
//   (CPU or you) can hit him ahead. Passes ahead are quicker. Both teams do it.
// * Skill moves: crossovers dip and reach, behind-the-back swings, spins tuck, hesitations rise and
//   burst. A defender who bites on a good move can lose his footing, and once in a while (rare) he
//   goes down: ankles broken.
// * Dribbling (new stat, 1-10): faster, sharper moves, more broken ankles, safer handle vs steals.
//   Built-in players get it from their speed, steals and passing; career players train it.
// * Tomahawk: cocked back behind the head, knee up, thrown down (fast-break dunks lean on it).
// * Alley-oops off the glass: hold Turbo while throwing a lob to a cutting teammate, or self-lob
//   off the glass on an open run at the rim (Turbo + MOVE). The CPU does it now and then.
// * Blocked and missed dunks fly: no more easy put-backs from the rim's shadow.
// * Swats: a full arm swing on blocks, and the blocker gets a moment after.
// * Celebrations and taunts: after a block, a big dunk or a clutch bucket you have 3 seconds:
//   tap MOVE (H) to taunt. Taunts unlock in Options → Profile (sujood, du'a, takbir and more).
function driOf(p) {
  const s = (p && p.st) || {};
  return s.dri != null ? s.dri : clamp(Math.round((s.spd || 5) * 0.5 + (s.stl || 5) * 0.2 + (s.pas != null ? s.pas : 5) * 0.3), 1, 10);
}
// ---------------------------------------------------------------- transition
function transActive(team) {
  const T = M.trans; if (!T || T.team !== team || M.time - T.t > 4.5 || M.halfCourt || M.mini || M.practice || M.phase !== 'live') return false;
  const bo = ball.owner || (ball.pass && ball.pass.from);
  return !bo || bo.team === team;
}
{
  const _gb = giveBall;
  giveBall = function (p, how) {
    const prev = M.possTeam;
    const r = _gb.apply(this, arguments);
    if (p && how !== 'inbound' && p.team !== prev && M.phase === 'live' && !M.halfCourt && !M.mini && !M.practice && !M.attract) M.trans = { team: p.team, t: M.time, how: how || 'reb', passed: false };
    else if (p && how === 'inbound') M.trans = null;
    return r;
  };
  // off the ball: run the lane ahead of the handler
  const _tob = Brain.prototype.thinkOffBall;
  Brain.prototype.thinkOffBall = function () {
    _tob.apply(this, arguments);
    const p = this.p, bo = ball.owner;
    if (p.human >= 0 || !bo || bo.team !== p.team || !transActive(p.team) || this.plan.type === 'receive') return;
    const h = attackHoop(p.team), ahead = dxz(bo, h) - dxz(p, h);
    if (dxz(p, h) < 140) return;
    const laneZ = bo.z < h.z ? h.z + 150 : h.z - 150;
    this.plan = { type: 'go', x: h.x + h.dir * (ahead > 200 ? 90 : 170), z: clamp(laneZ, 90, COURT.D - 90), turbo: true, leak: true };
    this.t = Math.min(this.t, 0.25);
  };
  // the handler: hit the runner ahead when the lane is clear
  const _th = Brain.prototype.thinkHandler;
  Brain.prototype.thinkHandler = function () {
    _th.apply(this, arguments);
    const p = this.p, mate = p.mate;
    if (!transActive(p.team) || !mate || mate.state !== 'free' || (M.halfCourt && M.mustClear && M.mustClear[p.team])) return;
    const h = attackHoop(p.team), ahead = dxz(p, h) - dxz(mate, h);
    if (ahead > 110 && passRisk(p, mate) < 0.38 && laneOpen(mate, h) > 35 && !chance(aiCfg(p.team).noise * 0.6)) { this.plan = { type: 'pass', to: mate, ahead: true }; return; }
    // nobody to hit: push the pace; once in a while, a breakaway lob off the glass to himself
    const d = dxz(p, h);
    if (p.fire && d < 330 && d > 150 && laneOpen(p, h) > 90 && (p.x - h.x) * h.dir > 60 && chance(0.06)) { this.plan = { type: 'selfoop' }; return; }   // v9.9: on fire only
    if (this.plan.type === 'probe' || this.plan.type === 'shoot') this.plan = { type: 'drive' };
  };
  const _bu = Brain.prototype.update;
  Brain.prototype.update = function (dt) {
    const r = _bu.apply(this, arguments), p = this.p;
    if (this.plan.type === 'selfoop' && ball.owner === p && p.state === 'free') { if (selfOopOK(p)) selfOop(p); else this.plan = { type: 'drive' }; }
    return r;
  };
  // passes ahead are quicker, and they're called out
  const _dp = doPass;
  doPass = function (p, to, alley) {
    const aheadPass = to && transActive(p.team) && dxz(to, attackHoop(p.team)) + 90 < dxz(p, attackHoop(p.team));
    const old = p.st.pas; if (aheadPass) p.st.pas = (old == null ? 5 : old) + 3;
    try { _dp.apply(this, arguments); } finally { if (aheadPass) p.st.pas = old; }
    if (aheadPass && ball.pass && M.trans) { M.trans.passed = true; ball.pass.ahead = true; if (p.human >= 0 || to.human >= 0) FX.pop(p.x, p.y + 132, p.z, 'HIT AHEAD', '#bfffcf'); }
  };
  const _os = onScore;
  onScore = function (h) {
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null, T = M.trans;
    const r = _os.apply(this, arguments);
    if (sh && T && T.passed && sh.team === T.team && M.time - T.t < 5 && !M.mini) { FX.callout('FAST BREAK!', '#bfffcf', 'OFF THE OUTLET', false); SFX.cheer(1.1, 0.1); M.trans = null; }
    return r;
  };
}
// ---------------------------------------------------------------- skill moves and broken ankles
{
  const _sm = startDribbleMove;
  startDribbleMove = function (p, kind, side) {
    const ok = _sm.apply(this, arguments);
    if (ok && p.mv) {
      const k = driOf(p), f = 1.12 - k * 0.024;                        // dribbling 10: 12% quicker; 3: 5% slower
      p.mv.dur *= f; p.mv.k *= 0.88 + k * 0.024;
      if (p.move) p.move.dur = Math.max(0.2, p.move.dur * f);
      if (!p.fire) p.turbo = Math.min(100, p.turbo + (k - 5) * 0.6);
    }
    return ok;
  };
  const _ra = resolveAnkles;
  resolveAnkles = function (p) {
    const spd = p.st.spd, before = new Map(p.opps.map(o => [o, (o.shook || 0) + (o.stumble || 0)]));
    p.st.spd = Math.round((spd + driOf(p) * 2) / 3);                   // the handle matters more than raw speed
    try { _ra.apply(this, arguments); } finally { p.st.spd = spd; }
    const mv = p.mv; if (!mv) return;
    for (const o of p.opps) {
      if ((o.shook || 0) + (o.stumble || 0) <= before.get(o) + 0.01 || o.state !== 'free') continue;   // he didn't bite
      if ((M.ankleT || -99) > M.time - 18) continue;                    // rare: not twice in a row
      let pf = 0.06 + (driOf(p) - (o.st.def || 5)) * 0.012 + (p.combo || 0) * 0.025 + (mv.sig ? 0.03 : 0) + (mv.kind === 'hesi' || mv.kind === 'stepback' ? 0.015 : 0);
      if (o.human >= 0) pf *= 0.5;
      if (chance(clamp(pf, 0.012, 0.14))) { ankleFall(o, p); break; }
    }
  };
}
function ankleFall(o, p) {
  M.ankleT = M.time;
  o.state = 'down'; o.st_t = 0.3; o.vx *= 0.2; o.vz *= 0.2; o.move = null; o.act = null; o.shook = 0; o.stumble = 0;
  o.fallDir = -o.face || -sgn(p.x - o.x); o.ankle = M.time;
  o.expr = { k: 'shock', t: 1.2 }; o.sq = -0.5;
  FX.dust(o.x, o.z, 3); FX.slowmo(0.35, 0.55); FX.hitstop(2);
  FX.callout('ANKLES BROKEN!', '#ffd76a', p.def.name.toUpperCase(), true); SFX.cheer(1.6, 0.1); FX.hype && FX.hype(1);
  p.stats.ank = (p.stats.ank || 0) + 1; compAdd(p, 3);
}
// ---------------------------------------------------------------- dunks: tomahawk, missed and blocked dunks
{
  const _sd = startDunk;
  startDunk = function (p, opts) {
    _sd.apply(this, arguments);
    const a = p.act; if (!a || p.state !== 'dunk' || (opts && opts.alley)) return;
    const d = dxz(p, a.hoop), fast = Math.hypot(p.vx || 0, p.vz || 0) > 180 || (M.trans && M.trans.team === p.team);
    if (fast && d > 110 && a.type === 'twohand' && chance(0.3)) { a.type = 'tomahawk'; a.big = a.big || d > 150; }   // fast breaks favour the tomahawk
  };
  const _sl = slam;
  slam = function (p, a) {
    const willMiss = a.miss && ball.owner === p;
    const r = _sl.apply(this, arguments);
    const h = a.hoop;
    if (willMiss && ball.state === 'loose') {
      // off the back iron hard: long, random caroms, rarely a tip-in
      if (chance(0.22)) Object.assign(ball, { vx: -h.dir * rand(60, 150), vz: rand(220, 340) * (chance(0.5) ? 1 : -1), vy: rand(300, 420) });
      else Object.assign(ball, { vx: h.dir * rand(210, 420), vz: rand(-280, 280), vy: rand(320, 480) });
      ball.grabLock = 0.35;
    } else if (a.didSlam && a.type === 'tomahawk' && a.big) FX.pop(h.x, RIM_Y + 70, h.z, 'TOMAHAWK!', '#ffd76a');
    return r;
  };
  const _bb = blockBall;
  blockBall = function (o, victim) {
    const dunking = !!(victim && victim.state === 'dunk');
    _bb.apply(this, arguments);
    if (M.pin) return;
    const h = victim ? attackHoop(victim.team) : attackHoop(1 - o.team), k = dunking ? 1.15 : 1;
    if (chance(0.15)) Object.assign(ball, { vx: h.dir * rand(80, 180), vz: (chance(0.5) ? 1 : -1) * rand(360, 460), vy: rand(150, 260) });   // swatted toward the sideline
    else { const far = chance(0.65), sp = (far ? rand(240, 420) : rand(110, 220)) * k; Object.assign(ball, { vx: h.dir * sp + rand(-60, 60), vz: rand(-300, 300) * (far ? 1 : 0.6), vy: rand(120, 300) * k }); }
    ball.grabLock = 0.25;
    o.swat = { t0: M.time }; o.celebAfter = M.time;
    tauntOpen(o, 'block');
  };
}
// ---------------------------------------------------------------- alley-oops off the glass
const GLASS_DEAD = 25;
function glassOf(h, z) { return { x: h.bbx + h.dir * (BALL_R + 1), y: RIM_Y + 46, z: clamp(z, h.z - 30, h.z + 30) }; }
function glassify(T, to) {
  const pa = ball.pass, h = attackHoop(to.team), G = glassOf(h, lerp(ball.z, h.z, 0.6)), T1 = T * 0.52;
  ball.vx = (G.x - ball.x) / T1; ball.vz = (G.z - ball.z) / T1; ball.vy = (G.y - ball.y + 0.5 * grav() * T1 * T1) / T1;
  pa.glass = { G, T1, hit: false, h };
}
{
  const _ta = throwAlley;
  throwAlley = function (p, to) {
    // v8.6.3: off the glass only to a teammate trailing the play (farther from this hoop than the passer, by
    // more than GLASS_DEAD so it doesn't flicker); a teammate ahead gets the normal lob, Turbo or not
    const h0 = attackHoop(to.team), behind = dxz(to, h0) > dxz(p, h0) + GLASS_DEAD;
    _ta.apply(this, arguments);
    const want = behind && (p.human >= 0 ? !!(p.cmd.turbo && p.turboOK()) : chance(0.1));
    if (want && ball.pass && ball.pass.alley && dxz(p, attackHoop(to.team)) > 140) { glassify(ball.pass.T, to); if (p.human >= 0 || to.human >= 0) FX.pop(p.x, p.y + 132, p.z, 'OFF THE GLASS', '#ffd76a'); }
  };
  const _pf = updatePassFlight;
  updatePassFlight = function (dt) {
    const pa = ball.pass, gl = pa && pa.glass;
    if (!gl || gl.hit) return _pf.apply(this, arguments);
    pa.t += dt;
    if (pa.t >= gl.T1) {
      const to = pa.to, rest = Math.max(0.12, pa.T - gl.T1);
      Object.assign(ball, { x: gl.G.x, y: gl.G.y, z: gl.G.z });
      let tx = gl.h.x, ty = RIM_Y + 40, tz = gl.h.z;
      if (to && to.state === 'dunk' && to.act) { const q = dunkPath(to.act, Math.min(1, to.act.s + rest / to.act.D)); tx = q.x + to.face * 16; ty = q.y + 100; tz = q.z; }
      ball.vx = (tx - ball.x) / rest; ball.vz = (tz - ball.z) / rest; ball.vy = (ty - ball.y + 0.5 * grav() * rest * rest) / rest;
      gl.hit = true; SFX.board && SFX.board(); gl.h.vy -= 25; FX.burst(gl.G.x, gl.G.y, gl.G.z, 3, 'spark', ['#ffffff', '#ffd76a']);
    }
  };
}
function selfOopOK(p) {
  const h = attackHoop(p.team), d = dxz(p, h);
  if (ball.owner !== p || p.state !== 'free' || d < 120 || d > 340 || (p.x - h.x) * h.dir < 40 || p.y > 1) return false;
  const sp = Math.hypot(p.vx || 0, p.vz || 0), ap = sp > 1 ? ((p.vx || 0) * (h.x - p.x) + (p.vz || 0) * (h.z - p.z)) / (sp * d) : 0;
  return sp > 120 && ap > 0.4;
}
function selfOop(p) {
  const h = attackHoop(p.team), d = dxz(p, h), hand = handsMid(p), D = clamp(0.88 + d / 900, 0.88, 1.18);
  releaseForPass(p, hand); p.passKind = 'alley';
  startDunk(p, { alley: true, D });
  const T = 0.62 * D;
  ball.pass = { from: p, to: p, t: 0, T, alley: true, kind: 'alley', bounced: false, tried: new Set(), self: true };
  glassify(T, p);
  M.alleyT[p.team] = M.time;
  FX.pop(p.x, p.y + 140, p.z, 'SELF-OOP!', '#ffd76a'); SFX.swipe();
}
{
  // you: Turbo + MOVE on an open run at the rim (set in humanCmd below)
  const _up = updatePlayer;
  updatePlayer = function (p, dt) {
    if (p.wantOop) { p.wantOop = false; if (selfOopOK(p)) selfOop(p); }
    return _up.apply(this, arguments);
  };
  // a self-oop catch is no assist
  const _cp = catchPass;
  catchPass = function (to, pa) { _cp.apply(this, arguments); if (pa && pa.self) { ball.lastPasser = null; } };
}
// ---------------------------------------------------------------- poses: moves, tomahawk, swats, taunts
const TAUNTS = [
  { id: 'sky', name: 'Point to the sky', pop: 'ALHAMDULILLAH', lv: 1 },
  { id: 'dua', name: 'Du’a, hands raised', pop: 'DU’A', lv: 3 },
  { id: 'flex', name: 'Flex', pop: 'STRONG BELIEVER', lv: 5 },
  { id: 'wag', name: 'Finger wag', pop: 'NOT IN HERE', lv: 7 },
  { id: 'sujood', name: 'Sujood of thanks', pop: 'SUJOOD OF THANKS', lv: 9, dead: true },
  { id: 'chest', name: 'Chest pound', pop: 'HEART OF A LION', lv: 12 },
  { id: 'brush', name: 'Brush it off', pop: 'BRUSH IT OFF', lv: 15 },
  { id: 'takbir', name: 'Takbir', pop: 'ALLAHU AKBAR', lv: 18 },
  { id: 'small', name: 'Too small', pop: 'TOO SMALL', lv: 21 },
  { id: 'roof', name: 'Raise the roof', pop: 'MASJID IS LIVE', lv: 24 }
];
for (const t of TAUNTS) if (t.lv > 1) REWARDS.push({ lv: t.lv, kind: 'taunt', id: t.id, name: 'Taunt: ' + t.name });
KIND_TXT.taunt = 'Taunt';
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments), s = p.state;
    // dribble moves
    const mv = p.mv;
    if (mv && ball.owner === p && (s === 'free' || s === 'fake')) {
      const u = clamp(mv.t / mv.dur, 0, 1), k = Math.sin(Math.PI * u);
      if (mv.kind === 'cross' || mv.kind === 'btb') {
        t.nk += 0.5 * k; t.fk += 0.5 * k; t.nh += 0.3 * k; t.fh += 0.3 * k; t.lean += 0.2 * k;
        const to = p.move ? p.move.to : p.dh, from = p.move ? p.move.from : p.dh;
        t[to + 's'] = lerp(t[to + 's'], 0.65, k); t[to + 'e'] = lerp(t[to + 'e'], 0.25, k);
        if (mv.kind === 'btb' && u < 0.6) { t[from + 's'] = -0.55; t[from + 'e'] = 0.4; }
        t.K = 1700;
      } else if (mv.kind === 'spin') Object.assign(t, { ns: 0.9, fs: 0.9, ne: 1.7, fe: 1.7, lean: 0.25, nk: 0.9, fk: 0.7, K: 1600 });
      else if (mv.kind === 'hesi') { if (u < 0.4) Object.assign(t, { lean: -0.06, nk: 0.25, fk: 0.25, nh: 0.05, fh: 0.0, K: 1400 }); else Object.assign(t, { lean: 0.42, nk: 1.0, fk: 0.5, nh: 0.7, fh: -0.3, K: 1700 }); }
      else if (mv.kind === 'stepback') Object.assign(t, { lean: -0.28, nk: 0.9, fk: 0.35, nh: 0.3, fh: -0.4, K: 1500 });
      else if (mv.kind === 'drop') Object.assign(t, { lean: 0.32, nk: 1.1, fk: 0.8, nh: 0.7, fh: 0.4, K: 1500 });
    }
    // tomahawk: cocked behind the head, knee up, back arched; then thrown down
    if (s === 'dunk' && p.act && p.act.type === 'tomahawk') {
      const u = p.act.s;
      if (u >= 0.12 && u < 0.56) Object.assign(t, { ns: 3.75, ne: 2.35, fs: 1.3, fe: 0.7, lean: -0.2, nh: 1.45, nk: 2.0, fh: -0.1, fk: 0.5, K: 1500, D: 34 });
      else if (u >= 0.56 && u < 0.8) Object.assign(t, { ns: 1.9, ne: 0.15, fs: 1.6, fe: 0.5, lean: 0.34, nh: 0.9, nk: 1.2, fh: 0.2, fk: 0.6, K: 2600, D: 40 });
    }
    // swat: the blocking arm sweeps through
    if (p.swat && M.time - p.swat.t0 < 0.32 && p.y > 0) {
      const u = (M.time - p.swat.t0) / 0.3;
      Object.assign(t, { ns: lerp(3.35, 1.3, Math.min(1, u * 1.4)), ne: 0.08, fs: 2.5, fe: 0.3, lean: 0.18 + 0.2 * u, K: 2800, D: 40 });
    }
    // after a block, the blocker has a moment (finger wag), unless he taunts
    if (p.celebAfter && !p.taunt && M.time - p.celebAfter < 1.3 && s === 'free' && ball.owner !== p && p.y <= 0 && M.time - p.celebAfter > 0.35)
      Object.assign(t, { ns: 2.45, ne: 0.2 + Math.sin(M.time * 18) * 0.28 });
    // taunts
    const tn = p.taunt;
    if (tn && M.time - tn.t0 < tn.dur && ball.owner !== p) {
      const a = M.time - tn.t0, w = Math.sin(a * 16);
      switch (tn.k) {
        case 'sky': Object.assign(t, { ns: 3.15, ne: 0.05, fs: 0.3, fe: 0.4, lean: -0.05 }); break;
        case 'dua': Object.assign(t, { ns: 1.25, fs: 1.25, ne: 1.5, fe: 1.5, lean: 0.06, nk: 0.25, fk: 0.25 }); break;
        case 'flex': Object.assign(t, { ns: 1.57, fs: 1.57, ne: 2.35 + w * 0.12, fe: 2.35 + w * 0.12, lean: 0.12, nk: 0.5, fk: 0.5 }); break;
        case 'wag': Object.assign(t, { ns: 2.5, ne: 0.2 + w * 0.3, fs: 0.3, fe: 0.4 }); break;
        case 'sujood': Object.assign(t, { nk: 2.2, fk: 2.2, nh: 1.6, fh: 1.6, lean: 1.15, ns: 1.4, fs: 1.4, ne: 0.4, fe: 0.4 }); break;
        case 'chest': Object.assign(t, { ns: 0.8, ne: 2.5 + Math.abs(w) * 0.35, fs: 0.3, fe: 0.5, lean: -0.08 }); break;
        case 'brush': Object.assign(t, { fs: 0.9, fe: 2.6 + w * 0.35, ns: 0.3, ne: 0.4, lean: 0.02 }); break;
        case 'takbir': Object.assign(t, { ns: 2.25, fs: 2.25, ne: 2.45, fe: 2.45, lean: -0.04 }); break;
        case 'small': Object.assign(t, { ns: 0.75, ne: 0.1, fs: 0.3, fe: 0.4, lean: 0.35, nk: 0.8, fk: 0.8, nh: 0.5, fh: 0.5 }); break;
        case 'roof': Object.assign(t, { ns: 3.0, fs: 3.0, ne: 1.3 + w * 0.5, fe: 1.3 + w * 0.5, nk: 0.4 + Math.abs(w) * 0.3, fk: 0.4 + Math.abs(w) * 0.3 }); break;
      }
      t.K = Math.max(t.K, 1200);
    }
    return t;
  };
  // ankle falls land on the backside, a little less flat than a knockdown
  const _an = animate;
  animate = function (p, dt) {
    _an.apply(this, arguments);
    if (p.state === 'down' && p.ankle && M.time - p.ankle < 1.6) p.rot = lerp(p.rot, p.fallDir * 0.95, Math.min(1, dt * 12));
    else if (p.ankle && p.state !== 'down' && p.state !== 'getup') p.ankle = 0;
  };
  // taunting slows you down; swats leave a trail
  const spDesc = Player.prototype.speed;
  Player.prototype.speed = function () { const s = spDesc.apply(this, arguments); return this.taunt && M.time - this.taunt.t0 < this.taunt.dur ? s * 0.35 : s; };
  const _up = updatePlayer;
  updatePlayer = function (p, dt) {
    const r = _up.apply(this, arguments);
    if (p.swat && M.time - p.swat.t0 < 0.26 && onScreen(p.x)) { const hd = p.hands.n; FX.spark(hd.x, hd.y, hd.z, '#e8f7ff'); }
    if (p.mv && ball.owner === p && (p.mv.kind === 'cross' || p.mv.kind === 'btb') && onScreen(p.x) && chance(0.6)) FX.spark(ball.x, ball.y, ball.z, 'rgba(255,255,255,0.7)');
    return r;
  };
}
// ---------------------------------------------------------------- the taunt window
function tauntOpen(p, why) {
  if (!p || M.attract || M.practice || M.mini) return;
  M.taunt = { p, until: M.time + 3, why, used: false, deadOK: why === 'score' };
  if (p.human < 0 && chance(why === 'block' ? 0.25 : 0.3)) setTimeout(() => { if (M.taunt && M.taunt.p === p && !M.taunt.used) doTaunt(p, pick(['sky', 'flex', 'wag', 'chest', 'takbir', 'dua'])); }, 500 + Math.random() * 500);
}
function myTaunt() { const t = (Profile.load().equip || {}).taunt || 'sky'; return Profile.has('taunt', t) || t === 'sky' ? t : 'sky'; }
function doTaunt(p, id) {
  const T = M.taunt; if (!T || T.p !== p || T.used || M.time > T.until) return;
  let def = TAUNTS.find(x => x.id === id) || TAUNTS[0];
  if (def.dead && M.phase === 'live' && !T.deadOK) def = TAUNTS[0];                 // sujood only after a basket, never with the ball live
  T.used = true;
  p.taunt = { k: def.id, t0: M.time, dur: def.id === 'sujood' ? 1.9 : 1.3 }; p.celebAfter = 0;
  FX.pop(p.x, p.y + 150, p.z, def.pop, '#ffd76a'); SFX.cheer(0.9, 0.08); FX.hype && FX.hype(1);
}
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    const r = _hc.apply(this, arguments);
    if (Net.role === 'guest') return r;                                   // the host judges these for an online guest
    const T = M.taunt;
    if (T && !T.used && M.time <= T.until && T.p && T.p.human === pad && c.x && ball.owner !== T.p && !M.mini) { doTaunt(T.p, myTaunt()); c.x = false; c.xHeld = false; }
    // Turbo + MOVE on an open run straight at the rim: lob it off the glass to yourself (v9.9: on fire only)
    const bo = ball.owner;
    if (c.x && c.turbo && bo && bo.human === pad && bo.fire && !M.mini && selfOopOK(bo) && laneOpen(bo, attackHoop(bo.team)) > 90) { bo.wantOop = true; c.x = false; c.xHeld = false; }
    return r;
  };
  // big dunks and clutch buckets open the window too, and get a celebration
  const _os = onScore;
  onScore = function (h) {
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null;
    const r = _os.apply(this, arguments);
    if (!sh || !sh.shooter || M.mini || M.attract || M.practice) return r;
    const p = sh.shooter, clutch = typeof clutchTime === 'function' && clutchTime() && !M.kotc;
    if (clutch) { react(p, 'armsUp', 1.4); if (p.mate) react(p.mate, 'fist', 1.2); FX.callout('CLUTCH!', '#ffd76a', p.def.name.toUpperCase(), true); }
    if ((sh.dunk && (sh.big || M.lastPoster && M.lastPoster.p === p && M.time - M.lastPoster.t < 1)) || clutch || (sh.green && sh.pts === 3)) tauntOpen(p, 'score');
    return r;
  };
  const _nm = newMatch; newMatch = function () { M.taunt = null; M.trans = null; return _nm.apply(this, arguments); };
  // the prompt over your player
  const _r = render;
  render = function (g) {
    _r(g);
    const T = M.taunt;
    if (!T || T.used || M.time > T.until || !T.p || T.p.human < 0 || T.p.human !== (Net.role === 'guest' ? 1 : 0) || (Game.screen !== 'play' && Game.screen !== 'netplay') || Game.paused) return;
    const p = T.p, [x, y] = P(p.x, p.y + 150, p.z), a = clamp((T.until - M.time) / 0.4, 0, 1);
    g.globalAlpha = a; g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, x - 52, y - 14, 104, 24, 12); g.fill();
    g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText((Input.touchMode ? 'MOVE' : 'H') + ': TAUNT', x, y + 3);
    g.fillStyle = 'rgba(232,195,90,0.9)'; g.fillRect(x - 40, y + 6, 80 * clamp((T.until - M.time) / 3, 0, 1), 2); g.globalAlpha = 1;
  };
  // online: the guest sees taunts the host ran
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    if (s && s.mid != null && M.players) { const tn = M.players.map(p => (p.taunt && M.time - p.taunt.t0 < p.taunt.dur ? TAUNTS.findIndex(x => x.id === p.taunt.k) : -1)); if (tn.some(v => v >= 0)) s.tn = tn; }
    return s;
  };
  const _gf = Net.guestFrame;
  Net.guestFrame = function () {
    const r = _gf.apply(this, arguments), last = this.snaps && this.snaps[this.snaps.length - 1], tn = last && last.s && last.s.tn;
    if (M.players) M.players.forEach((p, i) => { const k = tn ? tn[i] : -1; if (k >= 0 && (!p.taunt || p.taunt.k !== TAUNTS[k].id || M.time - p.taunt.t0 > p.taunt.dur)) { if (!p.taunt || p.taunt.k !== TAUNTS[k].id) p.taunt = { k: TAUNTS[k].id, t0: M.time, dur: TAUNTS[k].id === 'sujood' ? 1.9 : 1.3 }; } });
    return r;
  };
}
// ---------------------------------------------------------------- the dribbling stat in menus and the career
STAT_ROWS.splice(STAT_ROWS.findIndex(r => r[0] === 'pas') + 1, 0, ['dri', 'Dribbling']);
{
  const _pd = playerDef;
  playerDef = function () { const d = _pd.apply(this, arguments); if (C && C.lv) d.stats.dri = C.lv.dri || 4; return d; };
  const _lc = loadCareer;
  loadCareer = function () { const r = _lc.apply(this, arguments); if (r && C && C.lv && C.lv.dri == null) C.lv.dri = 4; return r; };
  const _fc = freshCareer;
  freshCareer = function () { const c = _fc.apply(this, arguments); if (c.lv && c.lv.dri == null) c.lv.dri = 4; return c; };
  if (typeof CS_STATS !== 'undefined') CS_STATS.splice(CS_STATS.findIndex(r => r[0] === 'pas') + 1, 0, ['dri', 'Dribbling']);
  // the steal battle: a tight handle keeps the ball
  const _ts = trySteal;
  trySteal = function (p) {
    const h = ball.owner; if (!h || h.team === p.team) return _ts.apply(this, arguments);
    const spd = h.st.spd; h.st.spd = clamp(Math.round(spd + (driOf(h) - 5) * 0.8), 1, 12);
    try { return _ts.apply(this, arguments); } finally { h.st.spd = spd; }
  };
}
// ---------------------------------------------------------------- the taunt choice in the profile
{
  const _pr = profileRows;
  profileRows = function () {
    const R = _pr.apply(this, arguments), d = Profile.load(), E = d.equip;
    if (!E.taunt) E.taunt = 'sky';
    const list = TAUNTS.filter(t => t.id === 'sky' || Profile.has('taunt', t.id));
    const at = R.findIndex(r => r.start);
    R.splice(at < 0 ? R.length - 1 : at, 0, { label: 'Taunt', get: () => (TAUNTS.find(t => t.id === E.taunt) || TAUNTS[0]).name,
      step: dd => { const i = list.findIndex(t => t.id === E.taunt); E.taunt = list[((i < 0 ? 0 : i) + dd + list.length) % list.length].id; Profile.save(); } });
    for (const r of R) if (r.get) { const g0 = r.get; r.get = () => String(g0()).replace('  (earn more by levelling up)', ''); }   // the long hint overlapped the labels
    return R;
  };
}
// ---------------------------------------------------------------- recovering on defense
// Better handles beat defenders more often now, so a defender holding DEFEND who gets beaten gets a
// short recovery burst (stronger with a good defense rating) to get back in front.
{
  const _gs = guardStep;
  guardStep = function (p, dt) {
    const D = p.v8, m = D && D.man, h = defendHoop(p.team);
    p.recover = !!(D && D.held && m && m === ball.owner && dxz(m, h) + 20 < dxz(p, h) && dxz(p, m) < 140);
    return _gs.apply(this, arguments);
  };
  const sp = Player.prototype.speed;
  Player.prototype.speed = function () { const s = sp.apply(this, arguments); return this.recover && this.v8 && this.v8.held ? s * (1.04 + ((this.st.def || 5) - 5) * 0.01) : s; };
}
