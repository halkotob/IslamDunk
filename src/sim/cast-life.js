// ================================================= v9.17: THE CAST COMES TO LIFE (CD4 stances, CD5 faces, CD2 celebrations)
// Driven by the cast data in src/data/cast.js. Everything here is posture and faces: joint targets and p.expr,
// stepped with the match on its own clock (M.time), so both phones in an online match draw the same thing. No rule,
// timing or AI decision changes.
//   Stances: between plays, standing still without the ball and not guarding the ball handler.
//   Faces: disappointed for a second after his own miss and when his team loses; focused at the free-throw line.
//   Celebrations: his own signature after a made basket, a dunk or a win (the owners chose no sujood in the cast's
//   celebrations); Takbir only standing still, otherwise the arm-raised celebration. Your own player
//   keeps the celebration you equipped (Options → Profile) offline; in an online match everyone uses his cast
//   celebration, so the two phones match (the equipped one is read from each device's own profile).
const CAST_STANCES = {
  upright: (t) => { t.lean = -0.02; t.nk = 0.14; t.fk = 0.14; t.ns = 0.12; t.fs = 0.08; },
  still: (t) => { t.lean = 0; t.nk = 0.12; t.fk = 0.12; t.ns = 0.08; t.fs = 0.06; t.ne = 0.25; t.fe = 0.3; },
  bouncy: (t, p) => { const b = 0.16 + 0.12 * Math.sin(M.time * 7.5 + p.def.num); t.nk += b; t.fk += b; t.nh += b * 0.45; t.fh += b * 0.45; },
  light: (t, p) => { const b = 0.08 * Math.sin(M.time * 5 + p.def.num); t.nk += 0.1 + b; t.fk += 0.1 - b; },
  low: (t) => { t.nk += 0.45; t.fk += 0.45; t.nh += 0.25; t.fh += 0.25; t.lean += 0.12; t.ns = 0.7; t.fs = 0.6; t.ne = 0.3; t.fe = 0.35; },
  forward: (t) => { t.lean += 0.18; t.nk += 0.22; t.fk += 0.22; t.nh += 0.12; t.fh += 0.12; },
  relaxed: (t, p) => { t.lean = 0.02; t.nk = 0.16; t.fk = 0.2; t.fs = -0.3; t.fe = 1.75; t.lean += 0.015 * Math.sin(M.time * 2 + p.def.num); },   // a hand on his hip
  knees: (t) => { t.lean = 0.55; t.nk = 0.75; t.fk = 0.7; t.nh = 0.6; t.fh = 0.55; t.ns = 0.9; t.fs = 0.85; t.ne = 0.15; t.fe = 0.2; },   // hands on knees
  behind: (t) => { t.lean = -0.03; t.nk = 0.12; t.fk = 0.12; t.ns = -0.42; t.fs = -0.38; t.ne = 0.35; t.fe = 0.35; }                      // hands behind his back
};
// full arm and body targets for each celebration, from a neutral stand (so nothing from another pose leaks in)
// (angles are absolute: 0 = straight down, positive = forward; a forearm points at shoulder + elbow)
const CAST_CELES = {
  heart:  { ns: 0.55, ne: 3.5, fs: 0.1, fe: 0.4, lean: -0.02 },                       // palm flat on his chest
  fist:   { ns: 1.3, ne: 1.6, fs: 0.1, fe: 0.4, lean: -0.03, nk: 0.45, fk: 0.45 },     // fist up beside his shoulder, knees bent
  both:   { ns: 3.0, fs: 3.0, ne: 0.2, fe: 0.2, lean: -0.04 },
  salute: { ns: 1.9, ne: 1.9, fs: 0.1, fe: 0.4, lean: -0.05 },                         // fingertips at his brow
  sky:    { ns: 3.15, ne: 0.05, fs: 0.3, fe: 0.4, lean: -0.05 },                       // one finger to the sky
  takbir: { ns: 2.25, fs: 2.25, ne: 2.45, fe: 2.45, lean: -0.04, nk: 0.15, fk: 0.15 }  // hands raised beside his ears
};
function castCele(p, sp) {
  let c = p.def && p.def.cele; if (!c || !CAST_CELES[c]) return null;
  if (c === 'takbir' && sp > 15) c = 'sky';                                   // takbir: standing, not running
  return CAST_CELES[c];
}
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments), d = p.def;
    if (!d || p.state !== 'free') return t;
    const holding = ball.owner === p || p.fakeHold;
    if (holding) return t;
    const mine = !M.rb && p.human === (typeof Net !== 'undefined' && Net.role === 'guest' ? 1 : 0);
    if (p.celebrate > 0) {
      if (mine) return t;                                                     // offline: the celebration you equipped
      const C = castCele(p, sp); if (C) { Object.assign(t, C); t.K = Math.max(t.K, 900); }
      return t;
    }
    const tn = p.taunt; if (tn && M.time - tn.t0 < tn.dur) return t;
    if (p.react && M.time <= p.react.until && p.react.type !== 'nod') return t;   // (a nod moves the head only: the stance stays)
    if (!d.stance || sp > 15) return t;
    const bo = ball.owner; if (bo && bo.team !== p.team && dxz(p, bo) < 160) return t;   // guarding: the defensive stance wins
    const S = CAST_STANCES[d.stance]; if (S) S(t, p);
    return t;
  };
}
// faces: a missed shot, a loss, the free-throw line
{
  const _os = onScore;
  onScore = function (h) { if (ball.shot) ball.shot._made = true; return _os.apply(this, arguments); };
  const _um = updateMatch;
  updateMatch = function () {
    const before = ball.shot, wasOver = M.phase === 'over';
    const r = _um.apply(this, arguments);
    if (!M.players) return r;
    if (before && before !== ball.shot && !before._made && before.shooter && !before.dunk && M.phase !== 'over') {
      const s = before.shooter; if (!s.expr || s.expr.k === 'joy') s.expr = { k: 'sad', t: 1.0 };
    }
    if (M.ft && M.ft.shooter && M.phase !== 'over') { const s = M.ft.shooter; if (!s.expr || s.expr.k === 'focus') s.expr = { k: 'focus', t: 0.15 }; }
    if (!wasOver && M.phase === 'over' && M.winner != null && !M.practice) {
      for (const q of M.players) {
        if (q.team === M.winner) { q._castWin = true; q.celebrate = Math.max(q.celebrate || 0, 2.4); }
        else q.expr = { k: 'sad', t: 2.0 };
      }
    }
    return r;
  };
}
// headbands for the cast (the creator's headband code reads the player's look only)
{
  let cur = null;
  const _dp = drawPlayer;
  drawPlayer = function (g, p) { cur = p; try { return _dp.apply(this, arguments); } finally { cur = null; } };
  const _dcp = drawCapPattern;
  drawCapPattern = function (g, HX, HY, f, cap, col) {
    const r = _dcp.apply(this, arguments), d = cur && cur.def, b = d && !d.look && d.band && typeof BAND_COLS !== 'undefined' ? BAND_COLS[d.band] : null;
    if (b && cap === 'hair') {
      g.strokeStyle = OUTLINE; g.lineWidth = 3.6; g.beginPath(); g.moveTo(HX - 9.6 * f, HY - 6.4); g.quadraticCurveTo(HX, HY - 9.0, HX + 8.6 * f, HY - 7.6); g.stroke();
      g.strokeStyle = b; g.lineWidth = 2.4; g.stroke();
    }
    return r;
  };
}
