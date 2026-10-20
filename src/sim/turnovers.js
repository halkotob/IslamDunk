// ================================================= v8.6.1: TURNOVERS (stats.tov)
// A turnover is charged to the player who lost the ball:
//   - a steal against you (from your hands, or your pass picked off)
//   - a shot-clock violation (the holder, or the last offensive player to touch it)
//   - an out-of-bounds the offense caused (last touch was the team in possession)
// (v8.6.3: double dribbles are gone from the game, so they no longer appear here.)
// Charges are not counted here (offensive fouls), matching the v8.6.1 brief; the older composure
// counter p.tov is left as it was.
function addTov(p) { if (p && p.stats) p.stats.tov = (p.stats.tov || 0) + 1; }
{
  const _gb = giveBall;
  giveBall = function (p, how) {
    const prev = how === 'steal' ? (ball.owner || (ball.pass && ball.pass.from)) : null;
    const r = _gb.apply(this, arguments);
    if (prev && p && prev.team !== p.team) addTov(prev);
    return r;
  };
  // a steal that knocks the ball loose (not a clean take) still costs the handler the ball
  const _ts = trySteal;
  trySteal = function (p) {
    const h = ball.owner, s0 = p.stats.stl;
    const r = _ts.apply(this, arguments);
    if (h && h.team !== p.team && p.stats.stl > s0 && ball.owner !== p) addTov(h);
    return r;
  };
  const _scv = shotClockViolation;
  shotClockViolation = function () {
    const lt = ball.lastTouch, o = ball.owner || (lt && lt.team === M.possTeam ? lt : null);
    addTov(o);
    return _scv.apply(this, arguments);
  };
  const _wd = watchdog;
  watchdog = function () {
    const lt = ball.lastTouch, poss = M.possTeam, so = M.sideOut;
    const r = _wd.apply(this, arguments);
    if (M.sideOut && M.sideOut !== so && lt && lt.team === poss && M.sideOut.team !== lt.team) addTov(lt);
    return r;
  };
}
