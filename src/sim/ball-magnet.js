// ================================================= v7.4: BALL MAGNET (human players only)
// A subtle pull toward the ball at the right moments, blended into the stick the way the mirror
// assist is. It only helps when you're already heading for the ball (or idle right next to it),
// pulls mostly along depth (the axis that's hard to read), and stops while you're being boxed out.
//   loose ball / rebound: toward where the ball comes down to grabbable height
//   shooter rising nearby (you're defending): toward the shooter's depth line; in the air, a small drift
const MAGNET_K = [0, 0.22, 0.38], MAG_R = 180, MAG_IDLE = 40, MAG_XK = 0.4, MAG_AIR = 25, MAG_GRAB_Y = 65;
function magnetLevel() { return Net.role === 'guest' ? (M.magnetLvl != null ? M.magnetLvl : 1) : View.magnet; }
function ballLanding() {                                       // where a loose ball comes down to grabbable height
  if (ball.owner || ball.state !== 'loose') return null;
  if (ball.y <= MAG_GRAB_Y) return { x: ball.x, z: ball.z };
  const G = grav(), vy = ball.vy || 0, t = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * (ball.y - MAG_GRAB_Y)))) / G;
  return { x: clamp(ball.x + (ball.vx || 0) * t, 0, COURT.L), z: clamp(ball.z + (ball.vz || 0) * t, 0, COURT.D) };
}
function magnetTarget(p, px, pz) {
  const land = ballLanding(); if (land) return land;
  const sh = M.players.find(o => o.team !== p.team && (o.state === 'windup' || o.state === 'shoot') && Math.hypot(o.x - px, o.z - pz) < 110);
  if (sh) return { x: px + clamp(sh.x - px, -20, 20), z: sh.z, contest: true };   // the shooter's depth line, not into his body
  return null;
}
// pure: the stick after the assist (also used by the guest's movement prediction)
function magnetCmd(p, mx, mz, px = p.x, pz = p.z) {
  const L = MAGNET_K[magnetLevel()] || 0;
  if (!L || p.human < 0 || !M.players || M.practice && M.practice.kind !== '1v1' || M.mini) return [mx, mz];
  const T = magnetTarget(p, px, pz); if (!T) return [mx, mz];
  const dx = T.x - px, dz = T.z - pz, d = Math.hypot(dx, dz); if (d > MAG_R || d < 4) return [mx, mz];
  if (M.players.some(o => o.team !== p.team && o.boxing && Math.hypot(o.x - px, o.z - pz) < 40)) return [mx, mz];   // box-out beats the magnet
  const m = Math.hypot(mx, mz), ux = dx / d, uz = dz / d;
  if (m > 0.2) { if ((mx * ux + mz * uz) / m < 0.2) return [mx, mz]; }          // only when already heading for it
  else if (d > MAG_IDLE) return [mx, mz];
  const k = L * (0.5 + 0.5 * (1 - d / MAG_R)), sp = Math.max(m, 0.85);   // full near the ball, half at the edge of the radius
  return [clamp(mx + (ux * sp - mx) * k * MAG_XK, -1, 1), clamp(mz + (uz * sp - mz) * k, -1, 1)];
}
{
  const _ps = preStep;
  preStep = function (p, dt) {
    _ps(p, dt);
    if (p.human < 0 || Net.role === 'guest') return;                         // the host simulates the guest's player too
    if (p.state === 'free' && p.y < 1) { const c = p.cmd, r = magnetCmd(p, c.mx, c.mz); c.mx = r[0]; c.mz = r[1]; }
    else if (p.state === 'jump' && ball.state === 'shot' && ball.shot && ball.shot.team !== p.team) {   // in the air: drift toward the ball's path
      const L = MAGNET_K[magnetLevel()] || 0, dx = ball.x - p.x, dz = ball.z - p.z, d = Math.hypot(dx, dz);
      if (L && d > 2 && d < 120) { const v = Math.min(d / dt, MAG_AIR * L / MAGNET_K[2]); p.x += dx / d * v * dt * MAG_XK; p.z += dz / d * v * dt; }
    }
  };
  // visuals (Depth aids Subtle/Full): landing marker for loose balls, and your ring pulses when the ball is grabbable
  const _dda = drawDepthAids;
  drawDepthAids = function (g, actors) {
    _dda(g, actors);
    const land = ballLanding();
    if (land && ball.y > MAG_GRAB_Y) { floorRing(g, land.x, land.z, 14, '#ffd76a', 0.75, 1.6, [3, 3]); floorRing(g, land.x, land.z, 4, '#ffd76a', 0.85, 2); }
    const me = actors.find(p => p.human === (Net.role === 'guest' ? 1 : 0)); if (!me || ball.owner) return;
    const reach = (ball.y < 40 && me.y < 5 ? 34 : 26) + (st7(me, 'hus') - 5) * 1.2, top = me.y + (me.state === 'jump' ? 112 : 74);
    if (ball.state === 'loose' && ball.grabLock <= 0 && Math.hypot(ball.x - me.x, ball.z - me.z) < reach + 6 && ball.y < top) {
      const pulse = REDUCED_MOTION ? 1 : 0.7 + 0.3 * Math.sin(Game.t * 14);
      floorRing(g, me.x, me.z, 28, '#9dffb0', 0.9 * pulse, 2.4);
    }
  };
}

