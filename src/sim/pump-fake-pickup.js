// ================================================= v7.6: PUMP FAKE PICKS UP THE DRIBBLE
// A pump fake ends your dribble. You can turn, pivot, shoot, go up for a layup/dunk or pass. A dashed ring
// marks the pivot.
// v8.6.3: no double dribbles (the NBA Jam way). Dribble moves (crossover, signature, hesitation) are simply
// ignored while the dribble is picked up, and walking off the pivot slides you to the ring's edge instead of
// costing the ball. The pick-up ends when you shoot or pass, or lose the ball.
// CPU handlers stay on the pivot and shoot or pass within about a second.
const PIVOT_R = 34;
function pickedUp(p) { return !!(p.pick && ball.owner === p); }
{
  const _sf = startFake;
  startFake = function (p) {
    _sf(p);
    if (ball.owner !== p || M.mini || p.fakeKind === 'pass') return;
    if (!p.pick) { p.pick = { x: p.x, z: p.z, t: M.time }; FX.pop(p.x, p.y + 150, p.z, 'PICKED UP', '#ffd76a'); }
  };
  const _sdm = startDribbleMove;
  startDribbleMove = function (p) { if (pickedUp(p)) { return true; } return _sdm.apply(this, arguments); };
  const _sc = startCross;
  startCross = function (p) { if (pickedUp(p)) { return true; } return _sc.apply(this, arguments); };
  const _ts = trySignature;
  trySignature = function (p) { if (pickedUp(p)) { return true; } return _ts.apply(this, arguments); };
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
    if (p.state === 'free' || p.state === 'fake') { const k = PIVOT_R / d; p.x = pk.x + (p.x - pk.x) * k; p.z = pk.z + (p.z - pk.z) * k; }   // anyone, any input: held to the ring's edge
  };
  // online (v8.6.3): the host runs the rule; the guest gets the pivot so it can draw the ring
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments), o = ball.owner;
    if (s && s.mid != null && M.players && o && o.pick) s.pk = [M.players.indexOf(o), Math.round(o.pick.x), Math.round(o.pick.z)];
    return s;
  };
  const _gf = Net.guestFrame;
  Net.guestFrame = function () {
    const r = _gf.apply(this, arguments), last = this.snaps && this.snaps[this.snaps.length - 1], pk = last && last.s ? last.s.pk : null;
    if (M.players) M.players.forEach((p, i) => { p.pick = pk && pk[0] === i ? (p.pick && p.pick.x === pk[1] && p.pick.z === pk[2] ? p.pick : { x: pk[1], z: pk[2], t: M.time }) : null; });
    return r;
  };
  // the pivot ring (any depth-aid setting, including Off: it's a rule, not an aid)
  const _drf = drawReflections;
  drawReflections = function (g, actors) {
    _drf(g, actors);
    const p = ball.owner; if (!p || !p.pick || !actors.includes(p)) return;
    floorRing(g, p.pick.x, p.pick.z, PIVOT_R, '#ffd76a', 0.85, 2, [5, 4]);
  };
}

