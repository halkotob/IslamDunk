// ================================================= v9.16.1: MOVES, SHOTS AND TAUNTS THAT LOOK LIKE WHAT THEY'RE CALLED
// The first reviewer pass (55 animations, Content/religious reviewer, build 9.16.0) marked 12 for a fix. Each one
// keeps its id, its cost and its cooldown (the CPU, the tutorial and online use the ids); what changes is how it looks,
// plus the few rules the reviewer asked for (the hop step picks up the dribble; a picked-up ball stays in the hands).
//   cross     the ball crosses in front of the body, low, from one hand to the other, hips and shoulders with it; going
//             from the near hand to the far one it goes between the legs instead (the hand/side logic, not chance)
//   btb       0.44 s (was 0.36): the ball wraps around the back, the first hand pushes it behind, the other reaches back for it
//   hesi      a rise-up as if to shoot (knees dip, shoulders and the guide hand come up) with the dribble alive, then the burst
//   stepback  a real step back: plant, push off the front foot, travel back about 50 units (58 with the stick held forward: 40+ net), land gathering the ball high
//   drop      now a hop step: gather, hop into the paint, land on both feet with the ball picked up (it stays picked up)
//   pickup    after a pump fake (or a hop step) the ball stays in both hands until the shot or the pass: no dribble frames
//   floater   a one-arm teardrop; hook: one arm over the top with the body turned sideways; up and under: rise and pump,
//             step through to the other side, finish there (the odds are worked out from where he planted)
//   windmill  turns the other way; taunt "Too small": one hand, held lower; nod: only the head moves, and "YES, YES" shows
// Movement in the step-back and the hop step is gameplay the reviewer asked for; shot odds, costs and cooldowns are unchanged.
MOVE_INFO.btb.dur = 0.44; MOVE_INFO.stepback.dur = 0.3;
MOVE_LABEL.drop = 'HOP STEP';
const ANIM916 = { stepBack: 58, hopFwd: 55, hopUp: 16 };
const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
{
  // ---- starting a move: which crossover, the behind-the-back's longer hand switch, where a step-back started
  const _sdm = startDribbleMove;
  startDribbleMove = function (p, kind) {
    const before = p.mv, ok = _sdm.apply(this, arguments), mv = p.mv;
    if (!ok || !mv || mv === before) return ok;
    if (kind === 'cross') { mv.style = p.move && p.move.from === 'n' ? 'legs' : 'cross'; if (p.move) p.move.style = mv.style; }
    if (kind === 'btb' && p.move) p.move.dur = 0.4;
    mv.x0 = p.x; mv.z0 = p.z;
    return ok;
  };
  // ---- the step-back and the hop step travel on their own curve (the stick doesn't add to it)
  const _ms = moveStep;
  moveStep = function (p, dt) {
    const mv = p.mv;
    if (!mv || (mv.kind !== 'stepback' && mv.kind !== 'drop')) return _ms.apply(this, arguments);
    if (ball.owner !== p || (p.state !== 'free' && p.state !== 'fake')) { p.mv = null; p.spin = 0; p.mvEnd = M.time; p.hopY = 0; return; }
    const u0 = clamp(mv.t / mv.dur, 0, 1); mv.t += dt; const u = clamp(mv.t / mv.dur, 0, 1), H = hoopDir(p);
    p.vx = 0; p.vz = 0;
    if (mv.kind === 'stepback') {                          // plant (0-0.25), push off (0.25-0.8), land (0.8-1)
      const d = (smooth01((u - 0.25) / 0.55) - smooth01((u0 - 0.25) / 0.55)) * ANIM916.stepBack * mv.k;
      p.x -= H.fx * d; p.z = clamp(p.z - H.fz * d, 8, COURT.D - 8);
    } else {                                               // gather (0-0.2), the hop (0.2-0.75), land on both feet
      const s1 = smooth01((u - 0.2) / 0.55), s0 = smooth01((u0 - 0.2) / 0.55), d = (s1 - s0) * ANIM916.hopFwd, lat = (s1 - s0) * 14 * mv.side;
      p.x += H.fx * d + H.px * lat; p.z = clamp(p.z + H.fz * d + H.pz * lat, 8, COURT.D - 8);
      p.hopY = u > 0.2 && u < 0.75 ? Math.sin(Math.PI * (u - 0.2) / 0.55) * ANIM916.hopUp : 0;
    }
    if (!mv.resolved && u > 0.4) { mv.resolved = true; resolveAnkles(p); }
    if (u >= 1) {
      p.mv = null; p.spin = 0; p.mvEnd = M.time; p.hopY = 0;
      if (mv.kind === 'stepback') p.stepT = M.time;
      else if (!M.mini && !p.pick) { p.pick = { x: p.x, z: p.z, t: M.time }; p.postUp = null; }   // the hop step picks up the dribble
    }
  };
  // ---- the up and under steps through to the other side; its odds are the ones from where he planted
  const _rs = releaseShot;
  releaseShot = function (p) {
    const uu = p.uu;
    if (!uu || ball.owner !== p) return _rs.apply(this, arguments);
    const x = p.x, z = p.z; p.x = uu.x; p.z = uu.z;
    try { return _rs.apply(this, arguments); } finally { p.x = x; p.z = z; p.uu = null; }
  };
  const _up = updatePlayer;
  updatePlayer = function (p, dt) {
    const r = _up.apply(this, arguments);
    const kind = p.sigShot || p.shotType;
    if (kind === 'upunder' && p.state === 'shoot' && ball.owner === p) {
      const h = attackHoop(p.team);
      if (!p.uu) { const side = p.z >= h.z ? -1 : 1; p.uu = { x: p.x, z: p.z, ex: h.x + h.dir * 18, ez: h.z + side * 26 }; }
      const ap = Math.max(0.15, typeof apexT === 'function' ? apexT(p) : 0.35), s = smooth01(p.st_t / ap), U = p.uu;
      const L = Math.hypot(U.ex - U.x, U.ez - U.z), k = L > 60 ? 60 / L : 1;
      p.x = U.x + (U.ex - U.x) * k * s; p.z = U.z + (U.ez - U.z) * k * s; p.vx = p.vz = 0;
    } else if (p.uu && (p.state !== 'shoot' || ball.owner !== p)) p.uu = null;
    return r;
  };
}
// ---- poses
const ANIM_PICKED = p => !!(p.pick && ball.owner === p && (p.state === 'free' || p.state === 'fake'));
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments), s = p.state, mv = p.mv, holding = ball.owner === p;
    if (mv && holding && (s === 'free' || s === 'fake')) {
      const u = clamp(mv.t / mv.dur, 0, 1), k = Math.sin(Math.PI * u);
      const from = p.move ? p.move.from : p.dh, to = p.move ? p.move.to : p.dh, q = p.move ? clamp(p.move.t / p.move.dur, 0, 1) : 1;
      if (mv.kind === 'cross' && mv.style === 'legs') {   // between the legs: split stance, the ball under the hips
        Object.assign(t, { nh: 0.25 + 0.55 * k, nk: 0.35 + 0.5 * k, fh: 0.1 - 0.55 * k, fk: 0.3 + 0.45 * k, lean: 0.14 + 0.24 * k, K: 1800, D: 40 });
        if (q < 0.5) { t[from + 's'] = 0.35; t[from + 'e'] = 0.2; t[to + 's'] = 0.45; t[to + 'e'] = 0.3; }
        else { t[to + 's'] = 0.5; t[to + 'e'] = 0.3; t[from + 's'] = 0.95; t[from + 'e'] = 1.0; }
      } else if (mv.kind === 'cross') {                    // crossover: shoulders over the ball, it crosses low in front
        Object.assign(t, { nk: 0.35 + 0.55 * k, fk: 0.35 + 0.5 * k, nh: 0.3 + 0.3 * k, fh: 0.2 + 0.3 * k, lean: 0.12 + 0.28 * k, K: 1800, D: 40 });
        if (q < 0.5) { t[from + 's'] = 0.85; t[from + 'e'] = 0.55; t[to + 's'] = 0.75; t[to + 'e'] = 0.3; }
        else { t[to + 's'] = 0.6; t[to + 'e'] = 0.3; t[from + 's'] = 1.0; t[from + 'e'] = 1.2; }
      } else if (mv.kind === 'btb') {                      // behind the back: one hand pushes it behind, the other reaches back
        Object.assign(t, { nk: 0.3 + 0.4 * k, fk: 0.3 + 0.4 * k, nh: 0.25 + 0.25 * k, fh: 0.2 + 0.25 * k, lean: 0.1 + 0.15 * k, K: 1800, D: 40 });
        if (q < 0.45) { t[from + 's'] = lerp(0.3, -0.75, q / 0.45); t[from + 'e'] = 0.45; t[to + 's'] = 0.8; t[to + 'e'] = 1.0; }
        else if (q < 0.75) { t[from + 's'] = -0.55; t[from + 'e'] = 0.6; t[to + 's'] = lerp(0.4, -0.5, (q - 0.45) / 0.3); t[to + 'e'] = 0.35; }
        else { t[to + 's'] = lerp(-0.5, 0.55, (q - 0.75) / 0.25); t[to + 'e'] = 0.3; t[from + 's'] = 0.9; t[from + 'e'] = 0.9; }
      } else if (mv.kind === 'hesi') {                     // the rise-up: dip, shoulders and the guide hand up, dribble alive
        const o = p.dh === 'n' ? 'f' : 'n';
        if (u < 0.15) Object.assign(t, { nk: 0.9, fk: 0.8, nh: 0.55, fh: 0.45, lean: 0.2, K: 1600 });
        else if (u < 0.45) Object.assign(t, { nk: 0.15, fk: 0.2, nh: 0.05, fh: 0.0, lean: -0.08, K: 1500 });
        else Object.assign(t, { lean: 0.45, nk: 1.0, fk: 0.5, nh: 0.7, fh: -0.3, K: 1800 });
        if (u >= 0.1 && u < 0.45) { t[o + 's'] = 2.15; t[o + 'e'] = 1.5; t[p.dh + 's'] = 1.25; t[p.dh + 'e'] = 1.1; }
      } else if (mv.kind === 'stepback') {                 // plant, push off the front foot, land gathering it high
        if (u < 0.25) Object.assign(t, { nh: 0.6, nk: 0.45, fh: -0.25, fk: 0.5, lean: 0.18, K: 1800 });
        else if (u < 0.8) Object.assign(t, { nh: 0.1, nk: 0.15, fh: -0.55, fk: 0.35, lean: -0.18, K: 2000 });
        else Object.assign(t, { nh: 0.45, nk: 0.85, fh: 0.35, fk: 0.8, lean: 0.05, K: 1800 });
        if (u >= 0.7) { const o = p.dh === 'n' ? 'f' : 'n'; t[p.dh + 's'] = 0.9; t[p.dh + 'e'] = 0.9; t[o + 's'] = 0.95; t[o + 'e'] = 1.1; }
      } else if (mv.kind === 'drop') {                     // the hop step: gather, hop, land on both feet
        if (u < 0.2) Object.assign(t, { nk: 1.0, fk: 1.0, nh: 0.7, fh: 0.7, lean: 0.35, ns: 0.75, ne: 1.0, fs: 0.8, fe: 1.05, K: 1800 });
        else if (u < 0.75) Object.assign(t, { nh: 0.9, nk: 1.4, fh: 0.7, fk: 1.5, lean: 0.25, ns: 0.85, ne: 1.15, fs: 0.9, fe: 1.2, K: 1800 });
        else Object.assign(t, { nh: 0.75, fh: 0.75, nk: 1.25, fk: 1.25, lean: 0.3, ns: 0.9, ne: 1.2, fs: 0.95, fe: 1.25, K: 2000 });
      }
    } else if (holding && ANIM_PICKED(p) && s === 'free') {   // picked up: both hands on the ball, triple threat
      Object.assign(t, { ns: 0.8, ne: 1.15, fs: 0.85, fe: 1.2, nk: 0.45, fk: 0.4, nh: 0.35, fh: 0.3, lean: 0.18, K: Math.max(t.K, 900) });
    }
    // shots: by the shot type, signature or not
    const kind = p.sigShot || p.shotType;
    if ((s === 'shoot' || s === 'windup') && holding) {
      if (kind === 'floater' && s === 'shoot') Object.assign(t, { ns: 2.55, ne: 0.3, fs: 0.8, fe: 0.4, nh: 1.15, nk: 1.4, fh: -0.1, fk: 0.15, lean: 0.1, K: 1100 });
      else if (kind === 'hook') {
        if (s === 'windup') Object.assign(t, { ns: 1.3, ne: 0.3, fs: 1.5, fe: 0.2, lean: -0.1, nk: 0.6, fk: 0.5 });
        else Object.assign(t, { ns: 3.25, ne: 0.08, fs: 1.55, fe: 0.12, lean: -0.28, nh: 0.9, nk: 1.3, fh: -0.05, fk: 0.1, K: 1200 });
      } else if (kind === 'upunder') {
        if (s === 'windup') Object.assign(t, { ns: 2.5, fs: 2.4, ne: 0.6, fe: 0.6, nk: 0.1, fk: 0.1, nh: 0.05, fh: 0, lean: -0.04, K: 1500 });   // up: the pump
        else {
          const a = clamp(p.st_t / Math.max(0.15, apexT(p)), 0, 1);
          if (a < 0.45) Object.assign(t, { ns: 1.15, ne: 1.4, fs: 1.2, fe: 1.4, nh: 1.0, nk: 0.9, fh: -0.4, fk: 0.5, lean: 0.3, K: 1500 });   // under: step through, ball tucked
          else Object.assign(t, { ns: 2.9, ne: 0.3, fs: 0.9, fe: 1.0, nh: 0.9, nk: 1.2, fh: -0.1, fk: 0.2, lean: -0.15, K: 1300 });             // finish on the other side
        }
      }
    }
    // the windmill goes round the other way
    if (s === 'dunk' && p.act && p.act.type === 'windmill' && t.direct != null) {
      const w = clamp((p.act.s - 0.12) / 0.66, 0, 1); t.direct = 0.4 - w * (Math.PI * 2 - 1.9);
    }
    // "Too small": one hand, held lower
    const tn = p.taunt;
    if (tn && tn.k === 'small' && M.time - tn.t0 < tn.dur && !holding) Object.assign(t, { ns: 0.55, ne: 0.0, fs: -0.2, fe: 0.15 });   // (the other arm back at his side)
    return t;
  };
  // ---- the windmill ends overhead from behind: bring the shoulder angle back into range; the nod moves the head only
  const _an = animate;
  animate = function (p, dt) {
    const picked = ANIM_PICKED(p), b = SFX.bounce;
    if (picked) SFX.bounce = () => {};                     // no dribble sound with the ball held
    try { _an.apply(this, arguments); } finally { if (picked) SFX.bounce = b; }
    const a = p.act, direct = p.state === 'dunk' && a && a.type === 'windmill' && a.s >= 0.12 && a.s < 0.78;
    if (!direct && p.j.ns.a < -1.6) p.j.ns.a += Math.PI * 2;
    const r = p.react;
    p.headTilt = r && r.type === 'nod' && M.time <= r.until ? Math.max(0, Math.sin((r.until - M.time) * 16)) * 0.5 * clamp((r.until - M.time) * 4, 0, 1) : 0;
  };
  // ---- where the ball is: the crossover, between the legs, behind the back, gathers, picked up, one-hand shots
  const _ab = attachBall;
  attachBall = function (p, dt) {
    _ab.apply(this, arguments);
    const s = p.state, mv = p.mv, f = p.face;
    if ((s === 'free' || s === 'fake') && ANIM_PICKED(p) && !mv) {
      const m = handsMid(p); ball.x = m.x + f * 4; ball.y = Math.max(BALL_R, m.y + 2); ball.z = m.z + 2; ball.behind = false;
    } else if (mv && (s === 'free' || s === 'fake') && p.move && (mv.kind === 'cross' || mv.kind === 'btb')) {
      const q = clamp(p.move.t / p.move.dur, 0, 1), A = p.hands[p.move.from], B = p.hands[p.move.to], zs = p.move.to === 'n' ? 1 : -1;
      if (mv.kind === 'btb') {                              // around the back at the hips, a bounce on the other side, up into the hand
        const bk = { x: p.x - f * 13, y: 34, z: p.z }, bo = { x: p.x - f * 4, y: BALL_R, z: p.z + zs * 9 };
        let x, y, z;
        if (q < 0.45) { const k = q / 0.45; x = lerp(A.x, bk.x, k); y = lerp(A.y - 4, bk.y, k); z = lerp(A.z, bk.z, k); }
        else if (q < 0.75) { const k = (q - 0.45) / 0.3; x = lerp(bk.x, bo.x, k); y = lerp(bk.y, bo.y, k * k); z = lerp(bk.z, bo.z, k); }
        else { const k = (q - 0.75) / 0.25; x = lerp(bo.x, B.x, k); y = lerp(bo.y, B.y - 4, k); z = lerp(bo.z, B.z, k); }
        ball.x = x; ball.y = Math.max(BALL_R, y); ball.z = z; ball.behind = q < 0.75;
      } else {                                              // across the front (or under the hips), one bounce in the middle
        const legs = mv.style === 'legs', mid = { x: p.x + f * (legs ? 4 : 22), z: p.z };
        const k = q < 0.5 ? q * 2 : (q - 0.5) * 2, S = q < 0.5 ? A : B;
        const sz = S.z + (q < 0.5 ? -zs : zs) * 5;           // (the hands sit 6 either side; the ball swings wider so the switch reads)
        ball.x = q < 0.5 ? lerp(S.x, mid.x, k) : lerp(mid.x, S.x, k); ball.z = q < 0.5 ? lerp(sz, mid.z, k) : lerp(mid.z, sz, k);
        ball.y = Math.max(BALL_R, BALL_R + (S.y - 4 - BALL_R) * Math.abs(Math.cos(Math.PI * q)));
        ball.behind = legs ? false : (q < 0.4 ? p.move.from === 'f' : q > 0.6 ? p.move.to === 'f' : false);
      }
    } else if (mv && mv.kind === 'drop' && (s === 'free' || s === 'fake') && mv.t / mv.dur >= 0.15) {
      const m = handsMid(p); ball.x = m.x + f * 4; ball.y = m.y + 2; ball.z = m.z + 2; ball.behind = false;
    } else if (mv && mv.kind === 'stepback' && (s === 'free' || s === 'fake') && mv.t / mv.dur >= 0.75) {
      const hd = p.hands[p.dh]; ball.x = hd.x + f * 3; ball.y = Math.max(BALL_R, hd.y + 4); ball.z = hd.z; ball.behind = false;
    } else if ((s === 'shoot' || s === 'windup') && ball.owner === p) {
      const kind = p.sigShot || p.shotType;
      if ((kind === 'floater' && s === 'shoot') || (kind === 'hook' && s === 'shoot') || (kind === 'upunder' && s === 'shoot' && clamp(p.st_t / Math.max(0.15, apexT(p)), 0, 1) >= 0.45)) {
        const hd = p.hands.n; ball.x = hd.x + f * 2; ball.y = hd.y + 6; ball.z = hd.z; ball.behind = false;
      }
    }
    if (p.hopY && ball.owner === p) ball.y += p.hopY;
  };
}
// ---- drawing: the hop's height, the hook's sideways turn
{
  const _dp = drawPlayer;
  drawPlayer = function (g, p) {
    const hy = p.hopY || 0, kind = p.sigShot || p.shotType, turn = kind === 'hook' && (p.state === 'shoot' || p.state === 'windup') && ball.owner === p && !p.spin;
    if (!hy && !turn) return _dp.apply(this, arguments);
    const y = p.y, sp = p.spin; p.y += hy; if (turn) p.spin = p.state === 'shoot' ? 0.85 : 0.5;
    try { return _dp.apply(this, arguments); } finally { p.y = y; p.spin = sp; }
  };
}
// ---- the nod: "YES, YES" over his head while he nods (drawn with him, so it shows wherever he's drawn)
{
  const _dp = drawPlayer;
  drawPlayer = function (g, p) {
    const r = _dp.apply(this, arguments), n = p.react;
    if (n && n.type === 'nod' && M.time <= n.until && !p._refl) {
      const [x, y] = P(p.x, p.y + 128, p.z), a = clamp((n.until - M.time) * 5, 0, 1);
      g.save(); g.globalAlpha *= a; g.font = `13px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText('YES, YES', x, y); g.fillStyle = '#ffffff'; g.fillText('YES, YES', x, y); g.restore();
    }
    return r;
  };
}

// ================================================= v9.16.1: RETIRED (the reviewer's Delete): unreachable, old saves load
// Dribble "Classic": Stride is the dribble (Standing stays); a saved Classic becomes Stride, and the setting goes.
SETTINGS.dribble = 'stride';
(() => { try { if (localStorage.getItem('islamdunk.dribble') !== 'stride') localStorage.setItem('islamdunk.dribble', 'stride'); } catch (e) {} })();
{ const i = SET_ITEMS.findIndex(s => s.label === 'Dribble'); if (i >= 0) SET_ITEMS.splice(i, 1); }
// Tomahawk Classic, Smooth and Power: Float is the tomahawk (the base dunk code stays: Float is built on it)
const TOMAHAWK_KEPT = ['float'];
SETTINGS.tomahawk = 'float';
(() => { try { const v = localStorage.getItem('islamdunk.tomahawk'); if (v && !TOMAHAWK_KEPT.includes(v)) localStorage.setItem('islamdunk.tomahawk', 'float'); } catch (e) {} })();
{ const i = SET_ITEMS.findIndex(s => s.label === 'Tomahawk style'); if (i >= 0) SET_ITEMS.splice(i, 1); }
setTomahawk = function () { SETTINGS.tomahawk = 'float'; try { localStorage.setItem('islamdunk.tomahawk', 'float'); } catch (e) {} };
// Taunts "Sujood of thanks" and "Brush it off": not unlocked, not in the picker; a saved or online one becomes the default.
// (The entries stay in TAUNTS: online play sends a taunt by its place in the list.)
for (const t of TAUNTS) if (t.id === 'sujood' || t.id === 'brush') t.retired = true;
for (let i = REWARDS.length - 1; i >= 0; i--) { const r = REWARDS[i]; if (r.kind === 'taunt' && (TAUNTS.find(t => t.id === r.id) || {}).retired) REWARDS.splice(i, 1); }
{
  const _mt = myTaunt;
  myTaunt = function () { const id = _mt.apply(this, arguments), t = TAUNTS.find(x => x.id === id); return t && !t.retired ? id : 'sky'; };
  const _dt = doTaunt;
  doTaunt = function (p, id) { const t = TAUNTS.find(x => x.id === id); return _dt.call(this, p, t && !t.retired ? id : 'sky'); };
  const _pr = profileRows;
  profileRows = function () {
    const R = _pr.apply(this, arguments), d = Profile.load(), E = d.equip || {};
    if (E.taunt && (TAUNTS.find(t => t.id === E.taunt) || {}).retired) { E.taunt = 'sky'; Profile.save(); }
    const row = R.find(r => r.label === 'Taunt');
    if (row) { const list = TAUNTS.filter(t => !t.retired && (t.id === 'sky' || Profile.has('taunt', t.id))); row.step = dd => { const i = list.findIndex(t => t.id === E.taunt); E.taunt = list[((i < 0 ? 0 : i) + dd + list.length) % list.length].id; Profile.save(); }; }
    return R;
  };
  const _gf = Net.guestFrame;                               // an older host sending a retired taunt: shown as the default
  Net.guestFrame = function () { const r = _gf.apply(this, arguments); if (M.players) for (const p of M.players) if (p.taunt && (TAUNTS.find(t => t.id === p.taunt.k) || {}).retired) p.taunt.k = 'sky'; return r; };
}
// Community Center Gym: out of the menus and the random picks (data/venues.js: retired, venueListed); the id stays valid
// for old saves and schedules, and career away games that drew it are in a masjid gym instead.
// Reactions "Arms up" and "Fist pump": the calls are gone (clutch buckets, contact, big dunks, scoring runs, blocks).
