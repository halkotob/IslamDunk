// ================================================= v7: CAMERA PRESETS + DEPTH AIDS
// Device-side view settings (no save change): camera preset and depth-aid level.
const View = {
  key: 'islamdunk.view', camera: 0, depth: 1, magnet: 1,
  load() { try { const o = JSON.parse(localStorage.getItem(this.key) || '{}'); if (o.camera >= 0 && o.camera < CAM_PRESETS.length) this.camera = o.camera; if (o.depth >= 0 && o.depth <= 2) this.depth = o.depth; if (o.magnet >= 0 && o.magnet <= 2) this.magnet = o.magnet; } catch (e) {} },
  save() { try { localStorage.setItem(this.key, JSON.stringify({ camera: this.camera, depth: this.depth, magnet: this.magnet })); } catch (e) {} }
};
// Each preset is a parameter set for the existing broadcast camera (fitPlayers stays authoritative).
const CAM_PRESETS = [
  { name: 'Broadcast', zoom: 1, look: 1, punch: 1, persp: 0.24, minZ: 1.0, follow: 'ball' },
  { name: 'Broadcast Wide', zoom: 0.8, look: 0.55, punch: 0.5, persp: 0.22, minZ: 0.82, follow: 'ball' },
  { name: 'Tele', zoom: 1.16, look: 0.6, punch: 1, persp: 0.32, minZ: 1.05, follow: 'ball' },
  { name: 'Player Lock', zoom: 1.06, look: 0.35, punch: 0.8, persp: 0.24, minZ: 1.0, follow: 'me' }
];
View.load();
function camPreset() { return CAM_PRESETS[View.camera] || CAM_PRESETS[0]; }
function camFollow(CP) {
  const b = ball.owner || ball;
  if (CP.follow !== 'me') return b;
  const me = M.players && M.players.find(p => p.human === (Net.role === 'guest' ? 1 : 0)); if (!me) return b;
  return { x: lerp(me.x, b.x, 0.3), z: lerp(me.z, b.z, 0.3), y: 0, vx: me.vx };    // your player, with a soft blend toward the ball
}
function cycleCamera(d = 1, announce = true) {
  View.camera = (View.camera + d + CAM_PRESETS.length) % CAM_PRESETS.length; View.save();
  if (announce && M.players && M.players.length) FX.pop(cam.fx || W / 2, 260, 350, 'CAMERA: ' + camPreset().name.toUpperCase(), '#ffffff');
  SFX.blip && SFX.blip();
}
{
  const _gu = gameUpdate;
  gameUpdate = function (dt) {
    if ((Game.screen === 'play' || Game.screen === 'netplay') && !Game.paused && Input.pressed.KeyC && !M.gym && !M.practice) cycleCamera(1, true);
    return _gu(dt);
  };
}
// ---- floor-space drawing helpers (rings follow the court's perspective)
const _ringPts = Array.from({ length: 32 }, (_, i) => [Math.cos(i / 32 * Math.PI * 2), Math.sin(i / 32 * Math.PI * 2)]);
function floorRing(g, x, z, r, col, a, lw = 1.5, dash = null) {
  g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; if (dash) g.setLineDash(dash);
  g.beginPath(); _ringPts.forEach(([c, s], i) => { const [px, py] = P(x + c * r, 0, z + s * r); if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.closePath(); g.stroke(); g.restore();
}
function floorLine(g, x0, z0, x1, z1, col, a, lw = 1.5) { const [a0, b0] = P(x0, 0, z0), [a1, b1] = P(x1, 0, z1); g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(a0, b0); g.lineTo(a1, b1); g.stroke(); g.restore(); }
function dropLine(g, x, y, z, a) { const [x0, y0] = P(x, y, z), [x1, y1] = P(x, 0, z); g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore(); }
// ---- the depth aids (Subtle: anchors, ball marker, contextual rings. Full: + permanent rings, same-depth line, grading)
function drawDepthAids(g, actors) {
  const full = View.depth === 2, me = actors.find(p => p.human === (Net.role === 'guest' ? 1 : 0));
  const pulse = REDUCED_MOTION ? 1 : 0.75 + 0.25 * Math.sin(Game.t * 12);
  // airborne players: drop line from the feet to their ring
  for (const p of actors) if (p.y > 12) dropLine(g, p.x, p.y, p.z, 0.4);
  // ball in the air: crisp ground marker + drop line
  const balls = M.balls ? M.balls : [ball];
  for (const b of balls) {
    if (b.owner || b.x < -500 || b.y < 22) continue;
    const [mx, my] = P(b.x, 0, b.z), k = depthK(b.z);
    g.save(); g.fillStyle = 'rgba(255,170,90,0.85)'; g.beginPath(); g.ellipse(mx, my, 2.6 * k, 1.2 * k, 0, 0, Math.PI * 2); g.fill(); g.restore();
    floorRing(g, b.x, b.z, 7, '#ffb36b', 0.75, 1.2); dropLine(g, b.x, b.y, b.z, 0.35);
  }
  if (!me || M.phase !== 'live' && M.phase !== 'ft') return;
  const bo = ball.owner, onD = bo && bo.team !== me.team;
  // shooter gathering / rising: block (30, 42 for a swipe) and contest (60, 110) rings
  const sh = M.players.find(p => p.team !== me.team && (p.state === 'windup' || p.state === 'shoot' || (p.state === 'dunk' && p.act && p.act.s < 0.5)));
  if (sh) {
    const d = dxz(me, sh), br = me.cmd.turbo && me.turboOK && me.turboOK() ? 42 : 30, inB = d <= br + 28, inC = d <= 60 + 28;   // ~28 = body contact distance
    floorRing(g, sh.x, sh.z, 110, '#9fb3c8', 0.25, 1, [4, 6]);
    floorRing(g, sh.x, sh.z, 60 + 28, inC ? '#ffcf6a' : '#9fb3c8', inC ? 0.7 : 0.35, 1.4);
    floorRing(g, sh.x, sh.z, br + 28, inB ? '#57e389' : '#ffffff', inB ? 0.95 * pulse : 0.45, inB ? 2.4 : 1.4);
    if (inB) { const [lx, ly] = P(sh.x, 0, sh.z + br + 34); g.save(); g.fillStyle = '#57e389'; g.font = `10px ${FONT}`; g.textAlign = 'center'; g.fillText('IN RANGE', lx, ly + 12); g.restore(); }
  }
  // contact range around you on defense: steal reach (54), shove reach (48) while sprinting
  if (onD) {
    const d = dxz(me, bo), near = d < 130;
    if (near || full) {
      const sprint = me.cmd.turbo && me.turboOK && me.turboOK(), r = sprint ? 48 : 54, inR = d <= r;
      floorRing(g, me.x, me.z, r, inR ? (sprint ? '#ff9a6b' : '#57e389') : '#ffffff', inR ? 0.85 : 0.3, inR ? 2 : 1.2);
      if (inR) floorRing(g, bo.x, bo.z, 22, sprint ? '#ff9a6b' : '#57e389', 0.85, 2);      // the target, highlighted
    }
    // charge / bump line in front of a driving handler
    const sp = Math.hypot(bo.vx || 0, bo.vz || 0), hp = attackHoop(bo.team);
    if (sp > 215 && dxz(me, hp) < dxz(bo, hp) && d < 160) {
      const ux = bo.vx / sp, uz = bo.vz / sp, cx = bo.x + ux * 32, cz = bo.z + uz * 32, set = (me.setT || 0) >= 0.35 || (me.v7 && me.v7.plant > 0);
      floorLine(g, cx - uz * 22, cz + ux * 22, cx + uz * 22, cz - ux * 22, set ? '#8fe3ff' : '#ffffff', set ? 0.9 : 0.4, set ? 2.4 : 1.4);
    }
    // Full: same-depth line from you to the man you're guarding, colored by distance
    if (full) { const col = d <= 54 ? '#57e389' : d <= 110 ? '#ffcf6a' : null; if (col) floorLine(g, me.x, me.z, bo.x, bo.z, col, 0.6, 1.4); }
  }
  // rim zone during shots and dunks: where chase-downs and tip-ins live
  const shot = ball.shot && ball.shot.hoop, dk = M.players.find(p => p.state === 'dunk');
  const hz = shot ? ball.shot.hoop : dk ? attackHoop(dk.team) : null;
  if (hz) floorRing(g, hz.x - hz.dir * 0, hz.z, 170, '#ffffff', 0.18, 1, [6, 8]);
  // block timing: you're in the air and the ball is passing within reach of your hands
  if (me.state === 'jump' && (ball.shot || ball.state === 'shot')) {
    const hd = Math.hypot(ball.x - me.x, ball.y - (me.y + 110), ball.z - me.z);
    if (hd < 48) { floorRing(g, me.x, me.z, 30, '#57e389', 0.95 * pulse, 2.6); floorRing(g, ball.x, ball.z, 12, '#57e389', 0.95 * pulse, 2.2); }
  }
}
// human-controlled rings read a little brighter
{
  const _dtr2 = drawTeamRing;
  drawTeamRing = function (g, p) {
    _dtr2(g, p);
    if (p.human >= 0 && !(Net.role === 'host' && p.human === 1) && p.y < 60) floorRing(g, p.x, p.z, 25, '#ffffff', 0.35, 1.2);
  };
}


