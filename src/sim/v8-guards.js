
// ================================================= v8.4: BALL STATE GUARDS
// A ball can never be "in the air as a shot" without its shot, or "a pass" without its pass. That
// mismatch (a foul whistled while the ball was in flight cleared the shot but left the state) made
// the ball update throw every frame: the clock and players kept running while the ball sat frozen
// where it was and nobody could pick it up. Any such ball is now a loose ball, and if anything in
// a match step ever throws, the step repairs the ball and the game carries on instead of stalling.
const BallGuard = { fixes: 0, errors: 0, last: '' };
function ballSane() {
  if (ball.state === 'shot' && !ball.shot) { ball.state = 'loose'; BallGuard.fixes++; BallGuard.last = 'shot without shot'; }
  if (ball.state === 'pass' && !ball.pass) { ball.state = 'loose'; BallGuard.fixes++; BallGuard.last = 'pass without pass'; }
  if (ball.owner && !M.players.includes(ball.owner) && !M.balls) { ball.owner = null; ball.state = 'loose'; BallGuard.fixes++; BallGuard.last = 'owner not in game'; }
  if (!isFinite(ball.x + ball.y + ball.z + ball.vx + ball.vy + ball.vz)) { Object.assign(ball, { x: COURT.L / 2, y: 60, z: COURT.D / 2, vx: 0, vy: 0, vz: 0, state: 'loose', shot: null, pass: null, owner: null }); BallGuard.fixes++; BallGuard.last = 'NaN ball'; }
}
{
  const _ub = updateBall;
  updateBall = function () { if (!M.balls) ballSane(); return _ub.apply(this, arguments); };
  const _fs = foulShots;
  foulShots = function () { const r = _fs.apply(this, arguments); if (ball.state === 'shot' || ball.state === 'pass') ball.state = 'loose'; return r; };
  const _um = updateMatch;
  updateMatch = function (dt) {
    try { return _um.apply(this, arguments); }
    catch (e) {
      BallGuard.errors++; if (BallGuard.errors < 5) console.error('match step recovered:', e);
      if (!M.mini) { ballSane(); if (ball.state !== 'held' && ball.state !== 'loose' && ball.state !== 'scored') ball.state = 'loose'; ball.grabLock = 0; }
    }
  };
}
// The root of the "ball off screen, nobody can get it, shot clock runs out" glitch: restart state
// (a smooth inbound in progress, a protected backcourt, a check-up, a side-out, a pinned ball)
// outlived the match it belonged to. A game that ended mid-inbound (common in Barakah Run, where the
// buzzer ends the game) handed the next game's first inbound to a player from the previous game.
// Every new match now starts clean.
{
  const _nm = newMatch;
  newMatch = function () {
    M.inb = null; M.bc = null; M.check = null; M.sideOut = null; M.frontIn = null; M.pin = null; M.pinGrab = null; M.ctl = null; M.nextInbound = null;
    ball.owner = null; ball.shot = null; ball.pass = null;
    return _nm.apply(this, arguments);
  };
}
