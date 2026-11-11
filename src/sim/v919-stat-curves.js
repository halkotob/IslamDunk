// ================================================= v9.19.0: STATS SCALE PROPERLY
// Measured with tools/stat-report.mjs (the numbers are in the changelog). A 5 is where it was; the ends moved:
//   Speed     a 10 sprints 20% faster than a 5 (was 28%), a 1 25% slower (was 23%). Glow and on fire together add
//             at most 10% (they stacked to 21%), so a 10 glowing on fire is 1.32x a 5's sprint (was 1.56x).
//   Shooting  one curve f for the shot odds and for a green release: a 1 is 0.45 of a 5, a 10 is 1.35 of a 5.
//             A green jumper from range (past 200 units from the rim) is no longer 95% at any rating: open it's
//             0.555 x f (1: 25%, 5: 56%, 10: 75%), lightly and heavily contested in the same ratios as before. Close
//             (inside 120) a green release is as before; in between it blends. Free throws are unchanged.
//             No jumper from range goes in more than 75% of the time, whatever is on (glow, on fire, a signature
//             move, trailing). The timing window still grows with the rating, more gently (1: 0.88, 5: 1, 10: 1.15).
//   Dunking   the range a dunk can start from: a 5 is as before; each point is 6 units, from -24 (a 1) to +30 at
//             most (a 10). Signature dunks need the rating: the windmill needs Dunking 6, the 360 needs 7 (below
//             that the same dunk is a tomahawk or a two-hander; the timing and the result don't change).
//   Moves     the crossover needs Ball handling 3 and the behind-the-back 5, where Ball handling is the average of
//             Speed and Passing (a new career player has 4). Below it the move isn't offered: your input makes a
//             hesitation instead (a behind-the-back a crossover, if you have that), and the CPU doesn't use it.
//             Signature moves keep the rating they need now. The move ids are unchanged.
// Every rating is still a number from 1 to 10 (fractions too: the CPU's teams are around 4.6 to 7.5).
const STAT_CURVE = { shtLo: 0.1375, shtHi: 0.07, spdLo: 0.0625, spdHi: 0.04, green: 0.555, cap: 0.75, far: 200, near: 120,
  boostCap: 1.10, dnkPt: 6, dnkLo: -24, dnkHi: 30, windmill: 6, 'dunk360': 7, cross: 3, btb: 5 };
function statF(v) { v = v == null ? 5 : v; return v <= 5 ? 1 - (5 - v) * STAT_CURVE.shtLo : 1 + (v - 5) * STAT_CURVE.shtHi; }
function handleOf(p) { const s = (p && p.st) || {}; return ((s.spd == null ? 5 : s.spd) + (s.pas == null ? 5 : s.pas)) / 2; }
function moveAllowed(p, kind) {
  if (kind === 'cross') return handleOf(p) >= STAT_CURVE.cross;
  if (kind === 'btb') return handleOf(p) >= STAT_CURVE.btb;
  return true;
}
// how far from the rim a shot is a jumper "from range" (0 close .. 1 far)
function rangeK(p) { const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.z - h.z); return clamp((d - STAT_CURVE.near) / (STAT_CURVE.far - STAT_CURVE.near), 0, 1); }

spdBase = v => 230 * (v == null || v >= 5 ? 1 + ((v == null ? 5 : v) - 5) * STAT_CURVE.spdHi : 1 - (5 - v) * STAT_CURVE.spdLo);
shtK = v => 0.93 * statF(v);
winK = v => { v = v == null ? 5 : v; return 0.85 + v * 0.03; };
dnkRange = v => 15 + clamp(((v == null ? 5 : v) - 5) * STAT_CURVE.dnkPt, STAT_CURVE.dnkLo, STAT_CURVE.dnkHi);
{
  const old = greenOdds;
  greenOdds = function (p, od, air) {
    const was = old.apply(this, arguments);
    if (M.phase === 'ft') return was;
    const k = rangeK(p); if (k <= 0) return was;
    const open = Math.min(STAT_CURVE.cap, STAT_CURVE.green * statF(p.st.sht)), now = open * was / 0.95;
    return lerp(was, now, k);
  };
  shotFinal = function (p, prob) { return M.phase !== 'ft' && rangeK(p) >= 1 ? Math.min(prob, STAT_CURVE.cap) : prob; };
}
// ---- speed: glow and on fire together add at most 10%
{
  const _spd = Player.prototype.speed;
  Player.prototype.speed = function () {
    const s = _spd.apply(this, arguments), g = this.boost > 0 ? 1.15 : 1, f = this.fire ? 1.06 : 1;
    return g * f > STAT_CURVE.boostCap ? s / (g * f) * STAT_CURVE.boostCap : s;
  };
}
// ---- signature dunks need the rating (the look and the name only: timing and result are the dunk's own)
{
  const _sd = startDunk;
  startDunk = function (p, opts) {
    const r = _sd.apply(this, arguments), a = p.act;
    if (!a || p.state !== 'dunk' || a.alley || (opts && opts.alley)) return r;
    const dn = (p.st && p.st.dnk != null) ? p.st.dnk : 5;
    if ((a.type === '360' && dn < STAT_CURVE.dunk360) || (a.type === 'windmill' && dn < STAT_CURVE.windmill)) a.type = dn >= 4 ? 'tomahawk' : 'twohand';
    return r;
  };
}
// ---- moves that need ball handling
{
  const _sdm = startDribbleMove;
  startDribbleMove = function (p, kind, side) {
    if (moveAllowed(p, kind)) return _sdm.apply(this, arguments);
    if (!p || p.human < 0) return false;                                   // the CPU doesn't use it
    const alt = kind === 'btb' && moveAllowed(p, 'cross') ? 'cross' : 'hesi';
    return _sdm.call(this, p, alt, side);
  };
  const _sm = startMove;                                                   // the automatic crossover on a sharp turn
  startMove = function (p, type) {
    if (type === 'btb' && !moveAllowed(p, 'btb')) type = 'cross';
    if (type === 'cross' && !moveAllowed(p, 'cross')) return;
    return _sm.call(this, p, type);
  };
}
