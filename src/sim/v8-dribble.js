
// ================================================= v8.2: DRIBBLE OPTION (Settings → Dribble)
// Classic (default): the ball bounces once per step, which reads frantic at speed (6+ a second).
// Stride: NBA Jam rhythm. One bounce per stride (every other step), so the ball stays locked to the
// feet at every speed: about 2 a second standing, 2.5 jogging, 3 to 4 at a full sprint. Sprinting
// pushes the ball out in front on a lower bounce. Only the look and the bounce sound change;
// steals, moves and everything else read the same hands.
SETTINGS.dribble = 'classic';
(() => { try { if (localStorage.getItem('islamdunk.dribble') === 'stride') SETTINGS.dribble = 'stride'; } catch (e) {} })();
const DRIB_STAND = 2.1;                                   // bounces a second standing still
{
  const _dp = dribblePhase;
  dribblePhase = function (p, dt, sp, holding) {
    if (SETTINGS.dribble !== 'stride') return _dp(p, dt, sp, holding);
    // running: half the leg cycle's rate (one bounce per two steps); standing: a steady pound.
    // The two blend, so starting and stopping never jumps the ball.
    const run = clamp((sp - 15) / 60, 0, 1), legHz = (sp > 15 ? Math.max(7, sp * 0.068) : 0) / (2 * Math.PI);
    p.bph = ((p.bph || 0) + dt * lerp(DRIB_STAND, Math.max(DRIB_STAND, legHz), run)) % 1;
    return p.bph;
  };
  const _ab = attachBall;
  attachBall = function (p) {
    _ab.apply(this, arguments);
    if (SETTINGS.dribble !== 'stride' || p.move || !GROUND_STATES.includes(p.state) || p.state === 'windup' || p.state === 'pass' || p.state === 'fake') return;
    const sp = Math.hypot(p.vx || 0, p.vz || 0), push = clamp((sp - 180) / 200, 0, 1);
    ball.x += p.face * 9 * push;                                                     // out in front at speed
    ball.y = BALL_R + (ball.y - BALL_R) * (1 - 0.18 * push);                         // and a little lower
  };
  const i = SET_ITEMS.findIndex(s => s.label === 'Team control');
  SET_ITEMS.splice(i + 1, 0, { label: 'Dribble', get: () => SETTINGS.dribble === 'stride' ? 'Stride (NBA Jam pace)' : 'Classic', step: () => { SETTINGS.dribble = SETTINGS.dribble === 'stride' ? 'classic' : 'stride'; try { localStorage.setItem('islamdunk.dribble', SETTINGS.dribble); } catch (e) {} } });
}
