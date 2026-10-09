
// ================================================= v8.2: SKILL MOVES THAT READ + GAME REACTIONS
// Moves: each dribble move gets its own body language (a low, wide crossover; a pause-then-burst
// hesitation; a step-back that leans away; arms out on the spin), a dust kick off the plant foot,
// and a short trail behind the ball, so you can tell what happened at a glance.
// Reactions: the game calls out what's happening in it: scoring runs ("8-0 RUN"), lead changes and
// ties late, comebacks, and a "LOCKDOWN" when your team gets three stops in a row.
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments), mv = p.mv;
    if (!mv || p.state !== 'free') return t;
    const u = clamp(mv.t / mv.dur, 0, 1), arc = Math.sin(Math.PI * u);
    switch (mv.kind) {
      case 'cross': case 'btb': t.nk += 0.45 * arc; t.fk += 0.45 * arc; t.nh += 0.25 * arc; t.lean += 0.18 * arc; break;
      case 'hesi': if (u < 0.5) { t.lean -= 0.08; t.nk = 0.15; t.fk = 0.15; } else { t.lean += 0.3 * arc + 0.1; t.nk += 0.5; } break;
      case 'stepback': t.lean -= 0.3 * arc; t.nk += 0.55 * arc; t.fk += 0.35 * arc; t.nh -= 0.3 * arc; break;
      case 'spin': t.ns = Math.max(t.ns, 1.1); t.fs = Math.max(t.fs, 1.1); t.lean += 0.1; t.nk += 0.3 * arc; t.fk += 0.3 * arc; break;
      case 'drop': t.nk += 0.6 * arc; t.fk += 0.4 * arc; t.lean += 0.22 * arc; break;
    }
    return t;
  };
  const _sm = startDribbleMove;
  startDribbleMove = function (p, kind) {
    const ok = _sm.apply(this, arguments);
    if (ok && onScreen(p.x)) { FX.dust(p.x, p.z, kind === 'spin' || kind === 'stepback' ? 3 : 2); p.trail = []; }
    return ok;
  };
}
// ball trail while a move is on
const BallTrail = { pts: [], owner: null };
{
  const _db = drawBall;
  drawBall = function (g) {
    const o = ball.owner, on = o && (o.mv || o.move) && !M.mini;
    if (on) { BallTrail.pts.push([ball.x, ball.y, ball.z]); if (BallTrail.pts.length > 7) BallTrail.pts.shift(); }
    else if (BallTrail.pts.length) BallTrail.pts.shift();
    if (BallTrail.pts.length > 1 && !REDUCED_MOTION) {
      g.save(); g.lineCap = 'round';
      for (let i = 1; i < BallTrail.pts.length; i++) {
        const a = BallTrail.pts[i - 1], b = BallTrail.pts[i], [ax, ay] = P(a[0], a[1], a[2]), [bx, by] = P(b[0], b[1], b[2]), k = i / BallTrail.pts.length;
        g.strokeStyle = `rgba(255,214,140,${0.35 * k})`; g.lineWidth = (BALL_R * 1.6) * k * depthK(b[2]);
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      }
      g.restore();
    }
    return _db.apply(this, arguments);
  };
}
// ---- game reactions
const React8 = { run: [0, 0], lead: 0, stops: [0, 0], lastPoss: -1, scores: [0, 0], tied: 0, said: 0 };
function react8Reset() { Object.assign(React8, { run: [0, 0], lead: 0, stops: [0, 0], lastPoss: -1, scores: [0, 0], said: 0 }); }
function react8Say(t, c, sub) { if (M.time - React8.said < 2.5) return; React8.said = M.time; FX.callout(t, c, sub); }
function react8Step() {
  if (!M.teams || M.mini || M.practice || M.attract || M.phase === 'over' || (typeof TUT !== 'undefined' && TUT.on)) return;
  const R = React8, s = [M.teams[0].score, M.teams[1].score];
  if (M.time < 0.5) { react8Reset(); R.scores = s.slice(); return; }
  for (const t of [0, 1]) {
    const d = s[t] - R.scores[t]; if (d <= 0) continue;
    R.run[t] += d; R.run[1 - t] = 0; R.stops[1 - t] = 0;
    const lead = Math.sign(s[0] - s[1]), late = !M.fmt.first21 && M.quarter >= M.fmt.periods && M.clock < 40;
    if (R.run[t] >= 8 && R.run[t] - d < 8) react8Say(R.run[t] + '-0 RUN!', '#ffd76a', M.teamDefs[t].name.toUpperCase() + ' ROLLING');
    else if (lead !== 0 && R.lead !== 0 && lead !== R.lead) react8Say('LEAD CHANGE!', '#8fe3ff', M.teamDefs[t].name.toUpperCase() + ' IN FRONT');
    else if (lead === 0 && late) react8Say('ALL TIED UP', '#ffffff', 'ANYBODY’S GAME');
    if (lead !== 0) R.lead = lead;
  }
  R.scores = s.slice();
  // stops: a possession for the other team that ended without points
  const pt = M.possTeam; if (pt < 0) return;                          // between possessions (an inbound)
  if (R.lastPoss >= 0 && pt !== R.lastPoss) {
    const def = pt, off = R.lastPoss;
    if (R.lastOffScore === s[off]) {
      R.stops[def]++;
      const humanD = M.teams[def].players.some(q => q.human >= 0);
      if (R.stops[def] === 3 && humanD) react8Say('LOCKDOWN!', '#8fe3ff', 'THREE STOPS IN A ROW');
    }
  }
  if (pt !== R.lastPoss) { R.lastPoss = pt; R.lastOffScore = pt >= 0 ? s[pt] : 0; }
}
{
  const _um = updateMatch;
  updateMatch = function (dt) { const r = _um.apply(this, arguments); react8Step(); return r; };
}
