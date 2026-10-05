// ================================================= v7.6: PUMP FAKE PICKS UP THE DRIBBLE
// A pump fake ends your dribble. You can pivot, shoot, go up for a layup/dunk or pass; walking off
// your pivot spot or any dribble move is a DOUBLE DRIBBLE (turnover). A dashed ring marks the pivot.
// CPU handlers never walk into it: they stay on the pivot and shoot or pass within about a second.
const PIVOT_R = 34;
function pickedUp(p) { return !!(p.pick && ball.owner === p); }
function doubleDribble(p) {
  if (!p.pick || M.phase !== 'live') return;
  p.pick = null; SFX.whistle(); FX.callout('DOUBLE DRIBBLE!', '#ff7070', 'TURNOVER');
  FX.pop(p.x, p.y + 132, p.z, 'DOUBLE DRIBBLE', '#ff9a8a');
  p.streak = 0; fumble(p); ball.vx = ball.vz = 0; ball.grabLock = 5;
  M.phase = 'dead'; M.deadT = 0.9; M.nextInbound = 1 - p.team;
}
{
  const _sf = startFake;
  startFake = function (p) {
    _sf(p);
    if (ball.owner !== p || M.mini || p.fakeKind === 'pass') return;
    if (!p.pick) { p.pick = { x: p.x, z: p.z, t: M.time }; FX.pop(p.x, p.y + 150, p.z, 'PICKED UP', '#ffd76a'); }
  };
  const _sdm = startDribbleMove;
  startDribbleMove = function (p) { if (pickedUp(p)) { if (p.human >= 0) doubleDribble(p); return true; } return _sdm.apply(this, arguments); };
  const _sc = startCross;
  startCross = function (p) { if (pickedUp(p)) { if (p.human >= 0) doubleDribble(p); return true; } return _sc.apply(this, arguments); };
  const _ts = trySignature;
  trySignature = function (p) { if (pickedUp(p)) { if (p.human >= 0) doubleDribble(p); return true; } return _ts.apply(this, arguments); };
  const _up = updatePlayer;
  updatePlayer = function (p, dt) {
    if (p.pick && ball.owner !== p) p.pick = null;                        // shot, pass, steal, turnover: the pick-up is over
    const pk = p.pick;
    if (pk && p.human < 0) {                                              // CPU: stay on the pivot, then shoot or pass
      p.cmd.mx = p.cmd.mz = 0; p.cmd.x = false; p.cmd.s = false;
      if (p.state === 'free' && M.time - pk.t > 0.9 && M.phase === 'live') {
        if (p.mate && p.mate.state === 'free' && dxz(p.mate, attackHoop(p.team)) < dxz(p, attackHoop(p.team)) && chance(0.5)) doPass(p, p.mate, false);
        else startShot(p);
      }
    }
    _up(p, dt);
    if (!pk || ball.owner !== p) return;
    const d = Math.hypot(p.x - pk.x, p.z - pk.z);
    if (d <= PIVOT_R) return;
    if (p.human >= 0 && p.state === 'free' && Math.hypot(p.cmd.mx || 0, p.cmd.mz || 0) > 0.3) doubleDribble(p);
    else if (p.state === 'free' || p.state === 'fake') { const k = PIVOT_R / d; p.x = pk.x + (p.x - pk.x) * k; p.z = pk.z + (p.z - pk.z) * k; }   // momentum: slide to the edge, not off it
  };
  // the pivot ring (any depth-aid setting, including Off: it's a rule, not an aid)
  const _drf = drawReflections;
  drawReflections = function (g, actors) {
    _drf(g, actors);
    const p = ball.owner; if (!p || !p.pick || !actors.includes(p)) return;
    floorRing(g, p.pick.x, p.pick.z, PIVOT_R, '#ffd76a', 0.85, 2, [5, 4]);
  };
}

