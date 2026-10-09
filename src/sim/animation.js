// ============================================================ ANIMATION
// Joint angles are 0 = limb pointing down, positive = rotating forward.
// Each joint is a damped spring toward a pose target; slight under-damping
// gives natural anticipation and follow-through.
function poseTargets(p, sp) {
  const t = { nh: 0.05, nk: 0.2, fh: -0.05, fk: 0.2, ns: 0.2, ne: 0.35, fs: 0.1, fe: 0.4, lean: 0.06, K: 420, D: 28 };
  const s = p.state, holding = ball.owner === p || p.fakeHold, ph = p.phase;
  if (s === 'free' || s === 'steal' || s === 'shove' || s === 'pass' || s === 'land' || s === 'getup') {
    if (p.fakeIdle) { t.lean += Math.sin(M.time * 2.2 + p.def.num) * 0.035; t.ns += Math.sin(M.time * 2.2) * 0.05; }
    if (sp > 15) {
      const run = clamp(sp / 230, 0, 1.25);
      t.nh = Math.sin(ph) * 0.75 * run; t.fh = -t.nh;
      t.nk = 0.25 + Math.max(0, Math.cos(ph)) * 1.2 * run; t.fk = 0.25 + Math.max(0, -Math.cos(ph)) * 1.2 * run;
      t.ns = -Math.sin(ph) * 0.7 * run; t.fs = -t.ns; t.ne = 1.45; t.fe = 1.45;
      t.lean = 0.12 + 0.1 * run + (p.cmd.turbo ? 0.1 : 0); t.K = 1500; t.D = 65;
    }
    const bo = ball.owner;
    if (!holding && bo && bo.team !== p.team && dxz(p, bo) < 160) {   // defensive stance
      t.nk += 0.5; t.fk += 0.5; t.nh += 0.3; t.fh += 0.3; t.ns = 1.25; t.fs = 1.05; t.ne = 0.25; t.fe = 0.3; t.lean += 0.15;
    }
    if (holding) {
      const d = p.move ? (p.move.t / p.move.dur < 0.5 ? p.move.from : p.move.to) : p.dh, o = d === 'n' ? 'f' : 'n';
      t[d + 's'] = 0.45 + 0.18 * Math.cos(p.dp * Math.PI * 2); t[d + 'e'] = 0.3;
      t[o + 's'] = 0.95; t[o + 'e'] = 0.9;
    }
    if (s === 'land') { t.nk = 1.2; t.fk = 1.0; t.nh = 0.6; t.fh = 0.5; t.lean = 0.3; t.K = 700; }
    if (s === 'pass') {
      const kind = p.passKind || 'chest';
      if (kind === 'bounce') { t.ns = 1.35; t.fs = 1.1; t.ne = 0.35; t.fe = 0.65; t.lean = 0.38; t.nk = 0.82; t.fk = 0.58; }
      else if (kind === 'lead') { t.ns = 1.7; t.fs = 0.45; t.ne = 0.15; t.fe = 1.15; t.lean = 0.28; t.nh = 0.4; }
      else if (kind === 'alley') { t.ns = 2.5; t.fs = 2.15; t.ne = 0.35; t.fe = 0.45; t.lean = 0.16; }
      else { t.ns = 0.9; t.fs = 0.9; t.ne = 1.7; t.fe = 1.7; t.lean = 0.2; }
      t.K = 1400;
    }
    if (s === 'steal') { t.ns = 1.45; t.ne = 0.05; t.lean = 0.45; t.nk = 0.9; t.nh = 0.7; t.K = 1300; }
    if (s === 'shove') { t.ns = 1.55; t.fs = 1.55; t.ne = 0; t.fe = 0.05; t.lean = 0.45; t.nh = 0.6; t.fh = -0.3; t.nk = 0.7; t.K = 1500; }
    if (p.celebrate > 0 && !holding && s === 'free') { t.ns = 3.0; t.ne = 0.3; }
    if (!holding && (s === 'free' || s === 'land')) reactPose(p, t);          // body language (blocks, dunks, turnovers, nods)
  } else if (s === 'sig') {
    const k = p.sig ? p.sig.kind : '', tt = p.st_t;
    if (k === 'stepback') Object.assign(t, { nk: 0.9, fk: 0.4, nh: 0.2, fh: -0.5, lean: -0.2, ns: 1.0, fs: 0.9, ne: 1.5, fe: 1.5, K: 1200 });
    else if (k === 'bake') Object.assign(t, { nk: 0.9 + Math.sin(tt * 34) * 0.3, fk: 0.9 - Math.sin(tt * 34) * 0.3, nh: 0.5, fh: 0.5, lean: 0.25 + Math.sin(tt * 34) * 0.22, ns: 0.8, fs: 1.2, ne: 1.1, fe: 0.8, K: 1500 });
    else if (k === 'euro') { const first = tt < 0.2; Object.assign(t, { nh: first ? 1.1 : -0.6, fh: first ? -0.6 : 1.1, nk: first ? 0.6 : 1.3, fk: first ? 1.3 : 0.6, lean: 0.3, ns: 1.0, fs: 0.9, ne: 1.5, fe: 1.5, K: 1500 }); }   // long gather steps, ball protected
    else Object.assign(t, { nk: 1.0, fk: 1.0, nh: 0.6, fh: 0.2, lean: 0.35, ns: 1.3, fs: 1.5, ne: 1.6, fe: 1.6, K: 1400 });
  } else if (s === 'windup') {
    Object.assign(t, { nk: 1.4, fk: 1.3, nh: 0.75, fh: 0.65, lean: 0.35, ns: 1.1, fs: 1.0, ne: 1.7, fe: 1.7, K: 900 });
  } else if (s === 'shoot') {
    Object.assign(t, { nk: 0.25, fk: 0.5, nh: 0.1, fh: -0.1, ns: 2.55, fs: 2.45, ne: 1.95, fe: 2.0, lean: -0.05, K: 700 });
    if (p.sigShot === 'hook') Object.assign(t, { ns: 3.2, ne: 0.15, fs: 1.4, fe: 0.4, lean: -0.3, nk: 0.9, fk: 0.2 });   // sky hook: one arm over the top
    else if (p.sigShot === 'bake' || p.sigShot === 'stepback') t.lean = -0.22;                                      // fadeaway
    else if (p.sigShot === 'fade') Object.assign(t, { lean: -0.34, nk: 0.15, fk: 0.7, fh: -0.35 });                  // leaning away, one knee up
    else if (p.sigShot === 'floater') Object.assign(t, { ns: 2.9, ne: 0.55, fs: 1.5, fe: 1.1, lean: 0.08, nk: 1.1, fk: 0.2, nh: 0.9, fh: -0.1 });   // one-hand push, knee drive
    else if (p.sigShot === 'euro') Object.assign(t, { ns: 3.0, ne: 0.4, fs: 1.2, fe: 0.7, lean: 0.12, nk: 1.2, fk: 0.2, nh: 1.0, fh: -0.2 });      // layup off the second step
  } else if (s === 'post') {
    Object.assign(t, { nk: 0.3, fk: 0.5, nh: 0.1, fh: -0.1, ns: 2.95, ne: 0.1, fs: 2.6, fe: 0.6, lean: -0.05, K: 1100, D: 30 });
  } else if (s === 'jump') {
    Object.assign(t, { ns: 3.05, fs: 2.95, ne: 0.1, fe: 0.15, nk: 0.7, fk: 0.4, nh: 0.35, fh: 0.1, K: 900 });
    if (holding) { t.ns = 1.9; t.fs = 1.8; t.ne = 1.0; t.fe = 1.0; }
  } else if (s === 'hang') {
    Object.assign(t, { ns: 3.1, fs: 3.0, ne: 0.15, fe: 0.2, nk: 0.4 + Math.sin(p.st_t * 20) * 0.3, fk: 0.3, nh: 0.15, fh: -0.1, K: 900 });
  } else if (s === 'down') {
    Object.assign(t, { ns: 2.0, ne: 0.4, fs: 1.2, fe: 0.5, nh: 0.4, fh: 0.1, nk: 0.3, fk: 0.2, K: 500 });
  } else if (s === 'dunk') {
    const a = p.act, u = a.s;
    Object.assign(t, { nk: 1.5, fk: 0.4, nh: 1.0, fh: -0.2, lean: 0.1, K: 1100, D: 34 });
    if (u < 0.12) Object.assign(t, { nk: 1.1, fk: 1.1, nh: 0.6, fh: 0.6, ns: 1.0, fs: 1.0, ne: 1.4, fe: 1.4, lean: 0.3 });
    else if (u < 0.78) {
      if (a.type === 'tomahawk') Object.assign(t, { ns: 3.65, ne: 1.5, fs: 2.4, fe: 0.4 });
      else if (a.type === 'windmill') Object.assign(t, { ne: 0.05, fs: 2.3, fe: 0.4, direct: 0.4 + ((u - 0.12) / 0.66) * (Math.PI * 2 + 1.9) });
      else if (a.type === '360') Object.assign(t, { ns: 2.7, fs: 2.7, ne: 1.4, fe: 1.4 });
      else Object.assign(t, { ns: 3.3, fs: 3.3, ne: 1.1, fe: 1.1 });
    } else Object.assign(t, { ns: 2.2, fs: a.type === 'tomahawk' || a.type === 'windmill' ? 2.0 : 2.2, ne: 0.15, fe: 0.15, nk: 0.8, fk: 0.8, nh: 0.3, fh: 0.2 });
  }
  return t;
}
function animate(p, dt) {
  const sp = Math.hypot(p.vx, p.vz), holding = ball.owner === p;
  if (p.lastState === 'pass' && p.state !== 'pass') p.passKind = null;
  // presentation state (runs on host and guest alike, driven by state changes)
  if (p.state !== p.lastState) {
    const st = p.state;
    if (st === 'land') p.sq = -1;                                   // squash on landing
    else if (st === 'shoot' || st === 'jump' || st === 'dunk') p.sq = 1;   // stretch on takeoff
    if (st === 'hang') p.expr = { k: 'fierce', t: 1.4 };
    else if (st === 'down') p.expr = { k: 'shock', t: 1.2 };
    p.lastState = st;
  }
  p.sq = (p.sq || 0) * Math.exp(-dt * 9);
  if (p.expr) { p.expr.t -= dt; if (p.expr.t <= 0) p.expr = null; }
  if (!p.expr && p.celebrate > 0) p.expr = { k: 'joy', t: 0.6 };
  // thobe hem/sleeves: a spring that trails the body's forward motion
  const cl = p.cloth || (p.cloth = { x: 0, v: 0, y: 0, vy: 0 });
  const tx = clamp(-p.vx * p.face * 0.018, -6, 6), ty = clamp(p.vy * 0.004, -3, 3);
  cl.v += ((tx - cl.x) * 90 - cl.v * 9) * dt; cl.x += cl.v * dt;
  cl.vy += ((ty - cl.y) * 90 - cl.vy * 9) * dt; cl.y += cl.vy * dt;
  if (p.y <= 0.01 && GROUND_STATES.includes(p.state)) {
    const rate = sp > 15 ? Math.max(7, sp * 0.068) : (holding || p.fakeHold) ? 7.5 : 0;
    const prevDp = p.dp;
    p.phase += dt * rate;
    p.dp = dribblePhase(p, dt, sp, holding);
    if (holding && !p.move && prevDp < 0.5 && p.dp >= 0.5) { if (onScreen(p.x)) SFX.bounce(0.3); }
    if (sp > 260 && prevDp < 0.5 && p.dp >= 0.5 && chance(0.4)) FX.dust(p.x, p.z, 1);
  }
  if (p.move) {
    p.move.t += dt;
    if (p.move.t >= p.move.dur) { p.dh = p.move.to; p.move = null; p.phase = Math.round(p.phase / Math.PI) * Math.PI; p.dp = 0; }
  }
  const T = poseTargets(p, sp);
  for (const k of JOINTS) {
    const j = p.j[k];
    j.v += ((T[k] - j.a) * T.K - j.v * T.D) * dt; j.a += j.v * dt;
  }
  if (T.direct != null) { p.j.ns.a = T.direct; p.j.ns.v = 0; }
  else if (p.j.ns.a > 5) p.j.ns.a -= Math.PI * 2;   // unwrap after windmill
  // body rotation for knockdowns
  const rt = p.state === 'down' ? p.fallDir * 1.45 : -(p.leanX || 0) * 0.14;   // crossover lean
  p.rot += (rt - p.rot) * Math.min(1, dt * (p.state === 'down' ? 10 : 6));
  // forward kinematics -> hand positions in world space
  const J = p.j;
  const legY = (h, k) => 22 * Math.cos(h) + 22 * Math.cos(h - k);
  p.hipH = Math.max(legY(J.nh.a, J.nk.a), legY(J.fh.a, J.fk.a), 20);
  const lean = J.lean.a, shX = Math.sin(lean) * 30, shY = p.hipH + Math.cos(lean) * 30;
  const fs = p.face * (p.spin ? Math.cos(p.spin) : 1);
  for (const side of ['n', 'f']) {
    const s = J[side + 's'].a, e = J[side + 'e'].a;
    const ex = shX + Math.sin(s) * 16, ey = shY - Math.cos(s) * 16;
    const hx = ex + Math.sin(s + e) * 15, hy = ey - Math.cos(s + e) * 15;
    const h = p.hands[side]; h.x = p.x + hx * fs; h.y = p.y + hy; h.z = p.z + (side === 'n' ? 6 : -6);
  }
  if (holding) attachBall(p, dt);
}
// dribble phase 0..1 (0 = in the hand, 0.5 = on the floor). Classic: one bounce per step.
// (v8.2 adds a "Stride" option in Settings; see sim/v8-dribble.js)
let dribblePhase = (p) => (p.phase / Math.PI) % 1;
// Where the ball sits while owned: dribble synced to footsteps, crossovers, holds
function attachBall(p) {
  let bx, by, bz, behind = false;
  if (GROUND_STATES.includes(p.state) && p.state !== 'windup' && p.state !== 'pass' && p.state !== 'fake') {
    if (p.move) {
      const u = p.move.t / p.move.dur, A = p.hands[p.move.from], B = p.hands[p.move.to];
      const fx = p.x + p.face * (p.move.type === 'btb' ? -12 : 16), fz = p.z;
      const k = u < 0.5 ? u * 2 : (u - 0.5) * 2, S = u < 0.5 ? A : B;
      bx = u < 0.5 ? lerp(S.x, fx, k) : lerp(fx, S.x, k); bz = u < 0.5 ? lerp(S.z, fz, k) : lerp(fz, S.z, k);
      by = BALL_R + (S.y - 4 - BALL_R) * Math.abs(Math.cos(Math.PI * u));
      behind = p.move.type === 'btb';
      if (u >= 0.5 && p.move.bounced !== true) { p.move.bounced = true; if (onScreen(p.x)) SFX.bounce(0.3); }
    } else {
      const hd = p.hands[p.dh], top = hd.y - 4;
      const fast = p.cmd.turbo && p.turboOK(), stride = Math.abs(Math.cos(Math.PI * p.dp));
      by = BALL_R + (top - BALL_R) * (fast ? stride * 0.72 : stride);
      bx = hd.x + p.face * 2.5; bz = hd.z + (p.dh === 'n' ? 2 : -2); behind = p.dh === 'f';
    }
  } else if (p.state === 'dunk' && (p.act.type === 'tomahawk' || p.act.type === 'windmill') && p.act.s > 0.12) {
    const hd = p.hands.n; bx = hd.x; by = hd.y + 4; bz = hd.z;
  } else {
    const m = handsMid(p); bx = m.x + p.face * 3; by = m.y + (p.state === 'shoot' ? 7 : 2); bz = m.z + 3;
  }
  ball.x = bx; ball.y = Math.max(BALL_R, by); ball.z = bz; ball.behind = behind;
  ball.rot += (p.move ? 0.3 : 0.08) * p.face;
}

