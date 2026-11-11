// ================================================= v9.19.1: THE BALL STAYS IN HIS HANDS
// The cause (tools/ball-hands.mjs measured it, the changelog has the numbers): within one step the sim could change
// a player's facing after animate() had already placed his hands and the ball. The step-back's "face the basket the
// whole way" (v9.16.2, sim/v9161-anim.js) runs after the step: when the stick is held away from the basket, the
// step turns him to the stick, the hands and the ball are placed on that side, then he's turned back to the basket
// and drawn that way, so the ball sat on the far side of his head, about 50-60 units from the hand, for the whole
// step-back and the shot that follows it within half a second. (A spin was a second, smaller case: the hands used
// the raw cos of the spin, the body the renderer's 0.2 floor; animation.js now shares faceK().)
// The fix: when a player's facing (or spin) changes after his hands were placed, the hands and the held ball are
// placed again from the same joints, the same step (after his update, and again at the end of the whole step: a
// catch or a pass can turn him later in it). The holder's ball is attached again at the end of every step too: a
// catch, a rebound or an alley-oop gives him the ball after his own update, so it hung where it was caught a frame. The facing, the joints, timing and shot results are unchanged.
// Also: a two-hand hold (landing, a steal, getting up, the drop step's gather, a pick-up, a windup's first frame) sat midway between the
// hands; when the hands are far apart that was out of both, so it's held in the nearer hand instead.
function rehand(p, dt, always) {
  if (!p.hands || !p.j) return;
  const turned = p.face !== p._handsFace || (p.spin || 0) !== p._handsSpin;
  if (turned) placeHands(p);
  if (always && !turned && ball.vd && ball.vdP === p) return;   // (a styled tomahawk: the sim's ball stays on the Classic pose and is drawn shifted by ball.vd)
  if ((turned || always) && (ball.owner === p || p.fakeHold)) { const rot = ball.rot; attachBall(p, dt); ball.rot = rot; }   // (the ball's spin was already advanced this step)
}
{
  const _up = updatePlayer;
  updatePlayer = function (p, dt) {
    const r = _up.apply(this, arguments); rehand(p, dt); return r;
  };
  const _um = updateMatch;
  updateMatch = function (dt) { const r = _um.apply(this, arguments); if (M && M.players) for (const p of M.players) rehand(p, dt, ball.owner === p); return r; };   // (the holder's ball, always: a catch, a rebound or an alley-oop hands it over after his update)
  // the two-hand hold, when the hands are apart: in the nearer hand (not in a dribble, a shot, a dunk or a pass: those place it themselves)
  const TWO = new Set(['land', 'steal', 'getup', 'jump', 'down', 'catch', 'windup']);   // (a windup's first frame: the hands are still apart from the dribble)
  const _ab = attachBall;
  attachBall = function (p, dt) {
    const r = _ab.apply(this, arguments);
    if (ball.owner !== p) return r;
    const gather = TWO.has(p.state) || ((p.state === 'free' || p.state === 'fake') && ((p.mv && p.mv.kind === 'drop') || ANIM_PICKED(p)));
    if (!gather) return r;
    const A = p.hands.n, B = p.hands.f, d = H => Math.hypot(ball.x - H.x, ball.y - H.y, ball.z - H.z);
    if (Math.min(d(A), d(B)) <= BALL_R + 5) return r;   // (touching a hand: a two-hand hold is fine)
    const hd = d(A) <= d(B) ? A : B;
    ball.x = hd.x + p.face * 2; ball.y = Math.max(BALL_R, hd.y + 4); ball.z = hd.z; ball.behind = hd === B;
    return r;
  };
}
