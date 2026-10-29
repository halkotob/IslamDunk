// ================================================= v9.11: THE GUEST PLAYS IN REAL TIME
// Play-test: "still some lag". Measured on a simulated 80 ms round trip, the guest waited for the host before seeing
// its own ball leave the hands (170 ms), its timing grade, a layup (150 ms), a dunk, a crossover or a pass (200 ms).
// Now the guest plays its own actions on its own screen the moment the button goes down, and the host takes the
// guest's decisions, so both screens agree:
//   * shots: the guest picks the shot (jumper, floater, fadeaway, putback...) and its release height, shows the
//     label, and judges the timing on its own meter (GREEN / GOOD / EARLY / LATE right away). The host uses the
//     guest's shot type and timing grade. The ball leaves the hands at once on the guest's screen.
//   * layups on MOVE, dunks (the dunk style and length come from the guest), crossovers, passes: started on the
//     guest at once, the same kind on the host.
//   * the ball in flight after the guest's shot or pass: the guest sees it from its own release; the host's flight
//     (it starts one trip later) is shown that much further along, and the gap closes over the flight, so the ball
//     meets the rim or the receiver exactly when the host says it does. Make or miss and blocks stay the host's.
//   * once the guest's action is over on its screen, the host's (later) copy of it isn't shown a second time.
// The host stays in charge of everything else: other players, contact, blocks, steals, makes and misses, the score.
Net.predV2 = true;
const GP = { n: 0, ia: null, act: null, hold: null, off: null, ball: null, mv: null, mvHold: null, pass: null, pops: {}, rg: null, re: 0, aT0: 0, mvT: 0 };
const gpMe = () => M.players && M.players.find(p => p.human === 1);
const gpOn = () => Net.role === 'guest' && Game.screen === 'netplay' && !Net.reconnecting && !Net.noPredict && !Net.noPredV2 && !M.balls;
const gpWait = () => ((Net.rtt || 120) + (Net.rdelay || 60) + 300) / 1000;   // how long the host's copy can take to show up
function gpIntent(k, a, b) { GP.n++; GP.ia = [GP.n, k, a == null ? 0 : a, b == null ? 0 : b]; GP.iaT = nowMs(); }
function gpPop(p, txt, col, dy) { if (!txt) return; GP.pops[txt] = nowMs(); FX.pop(p.x, p.y + (dy || 132), p.z, txt, col || '#ffffff'); }
// run a sim function on the guest's copy of the ball and keep only the launch it computes
const GP_BALL = ['owner', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'state', 'shot', 'pass', 'lastTouch', 'spin', 'fire'];
function gpLaunch(fn) {
  const sv = {}; for (const k of GP_BALL) sv[k] = ball[k];
  let out = null;
  try { fn(); if (!ball.owner) out = { x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz }; } catch (e) {}
  for (const k of GP_BALL) ball[k] = sv[k];
  return out;
}
const gpAt = (L, t) => ({ x: L.x + L.vx * t, y: Math.max(BALL_R, L.y + L.vy * t - 0.5 * grav() * t * t), z: L.z + L.vz * t });

// ---------------------------------------------------------------- guest: start actions on the press
function gpShot(me, kind, lk) {
  const sig = !lk && kind === sigKind(me.def), H = attackHoop(me.team);
  me.jumpVy = sig ? (SIG_JUMP[kind] || JUMP_VY) : (TYPE_JUMP[kind] || JUMP_VY);
  me.shotType = sig ? null : kind; me.sigShot = sig ? kind : null; me.layKind = lk || null; me.layV = null;
  const A = { k: 'shot', kind, lay: !!lk, t: 0, st: 'windup', st_t: 0, y: 0, yv: 0, x: me.x, z: me.z, vx: (me.vx || 0) * 0.2, vz: (me.vz || 0) * 0.2, fvx: 0, fvz: 0, rel: false, ok: false };
  if (lk) {
    const keep = [me.fadeVx, me.fadeVz, me.layAuto, me.layRel, me.fakeOK];
    layPrep(me); A.fvx = me.fadeVx || 0; A.fvz = me.fadeVz || 0; A.relAt = apexT(me) * (lk === 'bank' ? 0.88 : 0.95);
    [me.fadeVx, me.fadeVz, me.layAuto, me.layRel, me.fakeOK] = keep;
    gpIntent('lay', lk, Math.round(A.relAt * 1000) / 1000);
    gpPop(me, LAY_LABEL[lk]); if (lk === 'reverse') GP.pops.REVERSE = nowMs();
  } else {
    if (kind === 'fade' || kind === 'bake') { const D = hoopDir(me); A.fvx = -D.fx * 115; A.fvz = -D.fz * 40; }
    gpIntent('shot', kind);
    if (!['jumper', 'layup', 'pullup'].includes(kind)) gpPop(me, sig ? '★ ' + SIG_NAMES[kind] : MOVE_LABEL[kind], sig ? '#ffd76a' : '#ffffff');
  }
  me.face = sgn(H.x - me.x) || me.face;
  GP.act = A; GP.hold = null; GP.off = null; GP.rg = null;
}
function gpDunk(me) {
  const h = attackHoop(me.team), d = dxz(me, h);
  const types = d > 180 ? ['360', 'windmill', 'tomahawk'] : d > 100 ? ['tomahawk', 'windmill', 'twohand'] : ['twohand', 'tomahawk'];
  const type = pick(types), baseD = clamp(0.6 + d / 450, 0.62, 1.15);
  const D = baseD * (type === 'windmill' ? 1.08 : type === '360' ? 1.12 : type === 'twohand' ? 0.94 : 1);
  const a = { type, D, s: 0, sx: me.x, sz: me.z, tx: h.x + h.dir * 20, tz: h.z + (me.z - h.z) * 0.12, peak: 64 + (D - 0.7) * 30 + (type === '360' ? 8 : 0), hoop: h, tried: new Set() };
  gpIntent('dunk', type, Math.round(D * 1000) / 1000);
  me.face = sgn(h.x - me.x) || me.face; SFX.squeak();
  GP.act = { k: 'dunk', a, t: 0, ok: false }; GP.hold = null; GP.off = null;
}
function gpRelease(me, A) {
  A.rel = true;
  if (!A.lay) {                                                            // the timing grade, on our own meter
    const ap = apexT(me), e = A.st_t - ap, win = shotWindow(me);
    const tier = win > 0 && Math.abs(e) <= win ? 'green' : win > 0 && Math.abs(e) <= win * 3 ? 'good' : 'off';
    GP.rg = tier; GP.re = Math.round(e * 1000) / 1000; GP.iaT = nowMs();
    if (tier === 'green') {
      gpPop(me, 'GREEN', '#57e389', 126); SFX.green(); SFX.cheer(0.3, 0.1);
      const hm = handsMid(me); FX.burst(hm.x, hm.y + 8, hm.z, REDUCED_MOTION ? 1 : 3, 'spark', ['#57e389', '#d9ffe6']); me.greenFlash = 0.45;
    } else if (tier === 'good') gpPop(me, 'GOOD', '#ffd84d', 122);
    else gpPop(me, e < 0 ? 'EARLY' : 'LATE', '#ff6b6b', 122);
  }
  const L = gpLaunch(() => launchShot(me, attackHoop(me.team), true, 2));
  if (L) { const h = attackHoop(me.team); GP.ball = { ph: 'local', t0: nowMs(), L, kind: 'shot', tx: h.x, tz: h.z }; }
}
function gpMove(me, m) {
  GP.mvT = nowMs();
  gpPop(me, MOVE_LABEL[m.kind]);
  if (m.kind === 'cross' || m.kind === 'btb') { GP.mv = { type: m.kind === 'btb' ? 'btb' : 'xover', t: 0, dur: 0.3, from: me.dh, to: me.dh === 'n' ? 'f' : 'n' }; GP.mvHold = null; SFX.squeak(); }
}
function gpPass(me) {
  const to = me.mate; if (!to || to.state === 'down') return;
  const L = gpLaunch(() => passAuto(me));
  if (!L) return;
  GP.ball = { ph: 'local', t0: nowMs(), L, kind: 'pass', to }; GP.pass = { t: 0 };
}
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    const r = _hc.apply(this, arguments);
    if (pad !== 0 || !gpOn()) return r;
    const me = gpMe(); if (!me) return r;
    const A = GP.act, now = nowMs();
    if (A && A.k === 'shot' && !A.lay && !A.rel && !c.bHeld) {
      if (A.st === 'windup') { GP.act = null; me.state = 'free'; me.y = 0; }   // a tap: pump fake (the host plays it)
      else gpRelease(me, A);
    }
    if (c.b) GP.rg = null;
    if (GP.act || Pred.act) return r;
    const mine = ball.owner === me, ground = me.state === 'free' && me.y < 1;
    me.cmd.mx = c.mx; me.cmd.mz = c.mz; me.cmd.turbo = c.turbo;
    if (c.a && mine) GP.aT0 = now;
    if (!c.aHeld && GP.aT0) { const held = now - GP.aT0; GP.aT0 = 0; if (mine && ground && held < PASS_HOLD * 1000 && !c.x) gpPass(me); }
    if (!mine || !ground || me.postUp || M.phase !== 'live') return r;
    if (c.b) {
      if (canDunk(me)) gpDunk(me);
      else if (!(c.turbo && me._sigR)) gpShot(me, classifyShot(me));     // (a signature move with turbo: the host plays it)
    } else if (c.x && !(me.fire && c.turbo)) {
      if (layupOK(me, c)) { const k = layupKind(me); if (k === 'euro') gpIntent('lay', 'euro', 0); else gpShot(me, k === 'reverse' ? 'reverse' : 'layup', k); }
      else if (Math.hypot(c.mx, c.mz) >= 0.3 && now - GP.mvT > 450) { const m = classifyMove(me, c.mx, c.mz); gpIntent('mv', m.kind, m.side); gpMove(me, m); }
    }
    return r;
  };
  // the guest's decisions travel with its input
  const _sp = Net.setP;
  Net.setP = function (patch) {
    if (this.role === 'guest' && patch && patch.in && GP.ia && nowMs() - GP.iaT < 1000) { patch.in.ia = GP.ia; if (GP.rg) { patch.in.rg = GP.rg; patch.in.re = GP.re; } }   // for a second (in case one is lost), then off the wire
    return _sp.call(this, patch);
  };
}

// ---------------------------------------------------------------- guest: each frame
const GP_FAM = { shot: ['windup', 'shoot', 'post'], dunk: ['dunk'] };
function gpFlags(me) {                                    // what the host knows about our player that the snapshot doesn't carry
  const f = (Net.lastS && Net.lastS.gf) | 0, at = b => (f & b ? M.time : null);   // bits, so it's a few bytes and rarely changes
  me.orebT = at(1); me.fakeBit = !!(f & 2); me.fakeT = at(2); me.ggRecv = at(4); me.stepT = at(8);
  me.postUp = f & 16 ? (me.postUp || {}) : null; me._sigR = !!(f & 32);
}
function gpActFrame(me, rdt) {
  const hs = me.state, hx = me.x, hz = me.z, hy = me.y, A = GP.act;
  if (A) {
    A.t += rdt;
    if (GP_FAM[A.k].includes(hs)) A.ok = true;
    let done = false;
    if (A.k === 'shot') {
      if (A.st === 'windup') {
        A.st_t += rdt; const k = Math.min(1, rdt * 6); A.vx -= A.vx * k; A.vz -= A.vz * k;
        if (A.st_t >= 0.1) { A.st = 'shoot'; A.st_t = 0; A.yv = me.jumpVy || JUMP_VY; if (A.fvx || A.fvz) { A.vx = A.fvx; A.vz = A.fvz; } }
      } else {
        A.st_t += rdt; A.yv -= grav() * rdt; const f = Math.pow(0.985, rdt * 60); A.vx *= f; A.vz *= f; A.y += A.yv * rdt;
        if (A.lay && !A.rel && A.st_t >= A.relAt) gpRelease(me, A);
        if (A.y <= 0) { A.y = 0; if (!A.rel) gpRelease(me, A); done = true; }
      }
      A.x = clamp(A.x + A.vx * rdt, -20, COURT.L + 20); A.z = clamp(A.z + A.vz * rdt, 20, COURT.D - 20);
      me.x = A.x; me.z = A.z; me.y = A.y; me.vx = A.vx; me.vz = A.vz;
      me.state = A.st === 'windup' ? 'windup' : A.rel ? 'post' : 'shoot'; me.st_t = A.st_t; me.layAuto = A.lay; me.face = sgn(attackHoop(me.team).x - me.x) || me.face;
    } else {
      const a = A.a; a.s += rdt / a.D; const q = dunkPath(a, a.s);
      me.x = q.x; me.z = q.z; me.y = q.y; me.state = 'dunk'; me.act = a; me.st_t = A.t; me.vx = me.vz = 0;
      const su = clamp((a.s - 0.14) / 0.52, 0, 1); me.spin = a.type === '360' ? su * Math.PI * 2 : a.type === 'windmill' ? Math.sin(su * Math.PI) * 0.2 : 0;
      if (a.s >= 1) { done = true; me.spin = 0; }
    }
    if (!A.ok && A.t > gpWait()) { GP.act = null; GP.off = { x: me.x - hx, z: me.z - hz, y: me.y - hy }; me.x = hx; me.z = hz; me.y = hy; return; }   // the host never played it
    if (done) { me.layAuto = false; GP.act = null; GP.hold = { k: A.k, t: 0, x: me.x, z: me.z, y: me.y, seen: A.ok }; }
    animate(me, rdt);
    return;
  }
  const Hd = GP.hold;
  if (Hd) {                                                   // ours is over; the host's copy is still playing: don't show it twice
    Hd.t += rdt; const busy = GP_FAM[Hd.k].includes(hs); if (busy) Hd.seen = true;
    if ((busy || (Hd.k === 'shot' && hy > 1) || (!Hd.seen && Hd.t < gpWait())) && Hd.t < 1.6) {   // until the host's copy has come and gone (and is back on the floor)
      me.x = Hd.x; me.z = Hd.z;
      if (Hd.k === 'dunk') { Hd.y = lerp(Hd.y, 42, Math.min(1, rdt * 10)); me.y = Hd.y; me.state = 'hang'; } else { me.y = 0; me.state = 'free'; }
      animate(me, rdt);
      return;
    }
    GP.hold = null; GP.off = { x: Hd.x - hx, z: Hd.z - hz, y: (Hd.k === 'dunk' ? Hd.y : 0) - hy };
  }
  if (GP.off) {                                              // then ease into the host's view (~100 ms)
    const k = Math.exp(-rdt / 0.05), O = GP.off; O.x *= k; O.z *= k; O.y *= k;
    me.x += O.x; me.z += O.z; me.y = Math.max(0, me.y + O.y);
    if (Math.abs(O.x) + Math.abs(O.z) + Math.abs(O.y) < 0.5) GP.off = null;
  }
}
function gpMoveFrame(me, rdt) {
  const V = GP.mv;
  if (V) { V.t += rdt; if (V.t >= V.dur) { GP.mv = null; me.dh = V.to; me.move = null; GP.mvHold = { dh: V.to, t: 0 }; } else { me.move = V; me.dh = V.from; } return; }
  const Hd = GP.mvHold;
  if (Hd) { Hd.t += rdt; if (me.move && Hd.t < 0.8) { me.move = null; me.dh = Hd.dh; } else if (!me.move || Hd.t >= 0.8) GP.mvHold = null; }
  const P = GP.pass;
  if (P) { P.t += rdt; if (P.t < 0.2) { me.state = 'pass'; me.st_t = P.t; animate(me, rdt); } else if (P.t < 0.7) { if (me.state === 'pass') me.state = 'free'; } else GP.pass = null; }   // our pass pose, then not the host's copy
}
function gpBallFrame(me, rdt) {
  const B = GP.ball, now = nowMs();
  if (B) {
    const tau = (now - B.t0) / 1000;
    let q = null;
    if (B.ph === 'local') {
      if (ball.owner === me) {                               // the host hasn't let go yet (in what we're shown): our own launch
        if (tau > Math.min(1.6, gpWait() + 0.3)) { GP.ball = null; gpBallOff(gpAt(B.L, tau)); return; }   // never let go on the host (or a new possession): the host's view
        q = gpAt(B.L, tau); ball.owner = null; ball.state = B.kind;
      } else {
        const bl = ball.nl;
        if (ball.owner || !bl || !(ball.state === 'shot' || ball.state === 'pass')) { GP.ball = null; gpBallOff(gpAt(B.L, tau)); return; }   // stolen, blocked...: the host's view
        // the host's launch has reached us: draw its exact flight from our own release, a little slower, so it gets
        // to the rim (or the board, or the receiver) just as the host's does
        const H = { x: bl[0], y: bl[1], z: bl[2], vx: bl[3], vy: bl[4], vz: bl[5] }, hsp = Math.hypot(H.vx, H.vz) || 1, h = attackHoop(me.team);
        let T = B.kind === 'pass' ? Math.hypot(B.to.x - H.x, B.to.z - H.z) / hsp : Math.hypot(h.x - H.x, h.z - H.z) / hsp;
        if (B.kind === 'shot' && H.vx * h.dir < -1) { const tb = (H.x - (h.bbx + h.dir * BALL_R)) / (-H.vx); if (tb > 0) T = Math.min(T, tb); }   // off the glass: up to the board
        const ql = gpAt(B.L, tau), qh = gpAt(H, tau);
        Object.assign(B, { ph: 'host', H, T: Math.max(0.1, T), d0: tau, ts: now, rate: Math.max(0.25, 1 - tau / Math.max(0.1, T)), off: { x: ql.x - qh.x, y: ql.y - qh.y, z: ql.z - qh.z } });
      }
    }
    if (B.ph === 'host') {
      const sT = B.d0 + (now - B.ts) / 1000 * B.rate;
      if (ball.owner || !(ball.state === 'shot' || ball.state === 'pass') || sT >= B.T) { GP.ball = null; gpBallOff(gpAt(B.H, Math.min(sT, B.T))); return; }
      const k = Math.exp(-rdt / 0.06), O = B.off; O.x *= k; O.y *= k; O.z *= k;
      const p = gpAt(B.H, sT); q = { x: p.x + O.x, y: p.y + O.y, z: p.z + O.z };
    }
    if (q) { ball.x = q.x; ball.y = Math.max(BALL_R, q.y); ball.z = q.z; }
    return;
  }
  const O = GP.bOff;                                         // after: ease from where we drew it into the host's ball
  if (O) { if (ball.owner) { GP.bOff = null; return; } const k = Math.exp(-rdt / 0.07); O.x *= k; O.y *= k; O.z *= k; ball.x += O.x; ball.y = Math.max(BALL_R, ball.y + O.y); ball.z += O.z; if (Math.abs(O.x) + Math.abs(O.y) + Math.abs(O.z) < 0.5) GP.bOff = null; }
}
function gpBallOff(q) { if (ball.owner) return; GP.bOff = { x: q.x - ball.x, y: q.y - ball.y, z: q.z - ball.z }; ball.x = q.x; ball.y = Math.max(BALL_R, q.y); ball.z = q.z; }
{
  const _gf = Net.guestFrame;
  Net.guestFrame = function (rdt) {
    const r = _gf.apply(this, arguments);
    const me = gpMe();
    if (!me || !gpOn()) { GP.act = GP.hold = GP.off = GP.ball = GP.bOff = GP.mv = GP.mvHold = GP.pass = null; return r; }
    gpFlags(me); gpActFrame(me, rdt); gpMoveFrame(me, rdt); gpBallFrame(me, rdt);
    return r;
  };
  // the host's copy of a label or grade we already showed isn't shown again
  const _ae = Net.applyEv;
  Net.applyEv = function (e) {
    if (this.role === 'guest' && e && e[1] === 'f' && e[2] === 'pop') { const t = GP.pops[e[6]]; if (t && nowMs() - t < 1500) { delete GP.pops[e[6]]; return; } }
    return _ae.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- host: take the guest's decisions
function gpTake(p, k) {
  if (Net.role !== 'host' || !p || p.human !== 1 || !M.online) return null;
  const I = Net.gIntent; return I && I.k === k && M.time - I.at < 1.2 ? I : null;
}
function hostApplyRel(p, R) {                    // the guest's release: judged on the guest's own meter
  const ap = apexT(p), win = shotWindow(p);
  if (R.rg && win > 0) {
    const sg = (+R.re || 0) < 0 ? -1 : 1;
    p.st_t = R.rg === 'green' ? ap : R.rg === 'good' ? ap + sg * win * 2 : ap + sg * Math.max(win * 3.3, Math.abs(+R.re || 0));
  } else if (R.rt > 0 && R.rt <= p.st_t + 0.35 && R.rt >= p.st_t - 0.35) p.st_t = R.rt;
}
{
  const _rc = Net.remoteCmd;
  Net.remoteCmd = function (c) {
    const g = this.guestPeer && this.peers().find(p => p.peer === this.guestPeer), i = (g && g.presence && g.presence.in) || {};
    if (Array.isArray(i.ia) && (i.ia[0] | 0) > (this.lastIa || 0)) { this.lastIa = i.ia[0] | 0; this.gIntent = { k: i.ia[1], a: i.ia[2], b: +i.ia[3] || 0, at: M.time }; }   // before the press is read (layups are decided in there)
    const before = this.lastRc || 0, r = _rc.apply(this, arguments);
    if ((this.lastRc || 0) > before && this.pendRel && i.rg) { this.pendRel.rg = i.rg; this.pendRel.re = +i.re || 0; }
    return r;
  };
  const _cd = canDunk;
  canDunk = function (p) { const I = gpTake(p, 'dunk') || gpTake(p, 'shot'); if (I && ball.owner === p && p.state === 'free') return I.k === 'dunk'; return _cd.apply(this, arguments); };
  const _sd = startDunk;
  startDunk = function (p, opts) {
    const I = opts && opts.alley ? null : gpTake(p, 'dunk');
    const r = _sd.apply(this, arguments);
    if (I && p.act && p.state === 'dunk' && ['twohand', 'tomahawk', 'windmill', '360'].includes(I.a) && I.b > 0.3) {
      p.act.type = I.a; p.act.D = I.b; p.act.peak = 64 + (I.b - 0.7) * 30 + (I.a === '360' ? 8 : 0); Net.gIntent = null;
    }
    return r;
  };
  const _cs = classifyShot;
  classifyShot = function (p) { const I = gpTake(p, 'shot'); if (I && MOVE_LABEL[I.a] && I.a !== 'euro') { Net.gIntent = null; return I.a; } return _cs.apply(this, arguments); };
  const _lo = layupOK;
  layupOK = function (p, c) { if (gpTake(p, 'lay')) return ball.owner === p && p.state === 'free' && p.y <= 1 && M.phase === 'live' && !M.mini; return _lo.apply(this, arguments); };
  const _lk = layupKind;
  layupKind = function (p) { const I = gpTake(p, 'lay'); if (I && (LAY_LABEL[I.a] || I.a === 'euro')) return I.a; return _lk.apply(this, arguments); };
  const _sl = startLayup;
  startLayup = function (p, kind) { const I = gpTake(p, 'lay'); const r = _sl.apply(this, arguments); if (I) { if (I.b > 0.1 && p.layAuto) p.layRel = I.b; Net.gIntent = null; } return r; };
  const _cm = classifyMove;
  classifyMove = function (p, mx, mz) { const I = gpTake(p, 'mv'); if (I && MOVE_INFO[I.a]) { Net.gIntent = null; return { kind: I.a, side: I.b || 1 }; } return _cm.apply(this, arguments); };
  // the launch of every shot and pass (after every rule that shapes it: bank shots, bounce passes), for the guest
  const rec = () => { if (!ball.owner && (ball.state === 'shot' || ball.state === 'pass')) Net.blaunch = [((Net.blaunch && Net.blaunch[0]) || 0) + 1, r1(ball.x), r1(ball.y), r1(ball.z), r1(ball.vx), r1(ball.vy), r1(ball.vz)]; };
  for (const fn of ['launchShot', 'doPass', 'lobPass']) {
    const f = globalThis[fn]; if (typeof f !== 'function') continue;
    const w = function () { const r = f.apply(this, arguments); if (Net.role === 'host') rec(); return r; };
    if (fn === 'launchShot') launchShot = w; else if (fn === 'doPass') doPass = w; else lobPass = w;
  }
  // what the guest's copy of its own player needs for its decisions (rebound, pump fake, give-and-go, step-back,
  // post-up, signature ready), as times the guest can compare with its clock
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    if (s && s.mid != null && M.players) {
      const g = M.players.find(p => p.human === 1);
      if (g) {
        const rec = (v, w) => v != null && M.time - v < w, f = (rec(g.orebT, 0.8) ? 1 : 0) | (g.fakeBit && rec(g.fakeT, 0.9) ? 2 : 0) | (rec(g.ggRecv, 1.4) ? 4 : 0) | (rec(g.stepT, 0.6) ? 8 : 0) | (g.postUp ? 16 : 0) | (typeof sigReady === 'function' && sigReady(g) ? 32 : 0);
        if (f) s.gf = f;
      }
    }
    return s;
  };
}
