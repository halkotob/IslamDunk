// ======================================================= DEPTH + CAMERA (v3.5)
// Visual only. The court is the same in game units; the projection now adds a
// gentle perspective (far sideline narrower, players scaled by depth) and a
// broadcast camera zooms in and follows play. Gameplay never reads any of this.
let PERSP = 0.24;                                   // v4.8: stronger near/far scale for depth readability
function depthK(z) { return 1 + PERSP * (z - COURT.D / 2) / COURT.D; }          // far 0.88 .. near 1.12
let K_BACK = depthK(0), K_NEAR = depthK(COURT.D);
function setPersp(v) { if (PERSP === v) return; PERSP = v; K_BACK = depthK(0); K_NEAR = depthK(COURT.D); }
// Floor canvases are flat; draw them as horizontal strips, each at its depth scale.
function drawFloorWarped(g, cv, rs = cv.rs || 1) {
  const cw = cv.width / rs, ch = cv.height / rs, n = 56, x0 = -120;
  for (let i = 0; i < n; i++) {
    const r0 = i * ch / n, r1 = (i + 1) * ch / n, k = depthK(((r0 + r1) / 2) / ZS);
    const dx = W / 2 + (x0 - cam.x - W / 2) * k + FX.sx;
    g.drawImage(cv, 0, r0 * rs, cv.width, (r1 - r0) * rs, dx, FLOOR_TOP + r0 + FX.sy, cw * k, r1 - r0 + 0.6);
  }
}
// Draw something that lives on the back wall plane (z = 0) or the near side.
function withPlane(g, k, yPivot, fn) {
  g.save(); g.translate(W / 2 + FX.sx, yPivot + FX.sy); g.scale(k, k); g.translate(-W / 2 - FX.sx, -yPivot - FX.sy);
  try { fn(); } finally { g.restore(); }
}
// ------------------------------------------------------------ CAMERA
Object.assign(cam, { zoom: 1, fx: 660, fy: H / 2, punch: 0 });
function broadcastOn() { return !M.gym && !(Game.screen === 'gym'); }
function baseZoom() {
  const cssH = canvas ? parseFloat(canvas.style.height) || H : H;
  return cssH < 480 ? 1.72 : 1.52;                         // phones (landscape, ~390px tall) zoom further
}
const CAM_TOP = 10, CAM_BOTTOM = FLOOR_TOP + Math.ceil(COURT.D * ZS) + 40;     // no dead band below the court
function camClamp(fx, fy, z) {
  const hw = W / (2 * z), hh = H / (2 * z);
  return [clamp(fx, -100 + hw, COURT.L + 100 - hw), CAM_TOP + hh > CAM_BOTTOM - hh ? (CAM_TOP + CAM_BOTTOM) / 2 : clamp(fy, CAM_TOP + hh, CAM_BOTTOM - hh)];
}
function updateBroadcastCam(dt, snap) {
  if (M.camCut) { M.camCut = false; snap = true; }
  const CP = camPreset(); setPersp(CP.persp);
  const f = camFollow(CP), own = ball.owner;
  const dir = M.possTeam >= 0 ? attackHoop(M.possTeam).dir : 0;
  const vx = own ? own.vx || 0 : ball.vx || 0;
  // look-ahead in the direction of play
  let tx = f.x + (dir * 70 + clamp(vx * 0.22, -110, 110)) * CP.look;
  // zoom: base, wider on fast breaks / spread floor, punch-in on dunks and blocks
  let z = (baseZoom() - (VL && VL.spec.kind === 'outdoor' ? 0.1 : 0)) * CP.zoom;
  // Give airborne signature plays and live defensive contact a measured
  // broadcast push. Player-fit below remains authoritative, so nobody is cut off.
  let actionPush = 0;
  for (const p of M.players) {
    if (p.state === 'dunk' && p.act && (p.act.big || p.act.alley)) actionPush = Math.max(actionPush, 0.035 * Math.sin(Math.PI * clamp(p.act.s, 0, 1)));
  }
  z += actionPush * (REDUCED_MOTION ? 0.35 : 1) * CP.punch;
  const xs = M.players.map(p => p.x), spread = Math.max(...xs) - Math.min(...xs);
  if (spread > 460) z -= Math.min(0.2, (spread - 460) / 300 * 0.2);
  if (Math.abs(vx) > 230 && M.phase === 'live') z -= 0.1;
  const half = M.players.length && M.players.every(p => sgn(p.x - 660) === sgn(xs[0] - 660));
  if (half) { z = Math.min(z, W / 610); tx = lerp(tx, attackHoop(M.possTeam >= 0 ? M.possTeam : 0).x - dir * 250, 0.35); }   // keep the half-court set readable
  if (M.phase !== 'live' && M.phase !== 'tip') z -= 0.08;
  cam.punch = Math.max(0, cam.punch - dt * 1.6);
  z += 0.06 * Math.sin(Math.min(1, cam.punch) * Math.PI / 2) * CP.punch;     // a slight push-in, not a snap
  z = Math.max(CP.minZ, z);
  let ty = FLOOR_TOP + f.z * ZS - 60 - (f.y || 0) * 0.35;
  if (!own && ball.state === 'shot' && ball.shot && ball.shot.hoop) {
    const h = ball.shot.hoop; tx = lerp(tx, h.x, 0.24); ty = lerp(ty, FLOOR_TOP + h.z * ZS - RIM_Y * 0.65, 0.18);
  }
  if (cam.make) {                                   // made shot: ~6.5% ease toward the hoop, 350 ms in, smooth ease out
    const m = cam.make; m.t += dt;
    const ez = u => u * u * (3 - 2 * u), env = m.t < 0.35 ? ez(m.t / 0.35) : m.t < 0.55 ? 1 : m.t < 1.15 ? 1 - ez((m.t - 0.55) / 0.6) : 0;
    const a = env * m.amp;
    if (m.t >= 1.15 || !a && m.t > 0.4) cam.make = null;
    else { z *= 1 + 0.065 * a; m.mul = Math.max(m.mul || 1, 1 + 0.065 * a); tx = lerp(tx, m.h.x - m.h.dir * 90, 0.3 * a); ty = lerp(ty, FLOOR_TOP + m.h.z * ZS - RIM_Y * 0.6, 0.25 * a); m.want = z; }
  }
  [tx, ty] = camClamp(tx, ty, z);
  [tx, ty, z] = fitPlayers(tx, ty, z, true);                    // targets include everyone, and where they're heading
  // players' velocities, smoothed for the look-ahead (a sudden stop or cut doesn't jerk the frame)
  for (const p of M.players) { const k = snap ? 1 : Math.min(1, dt * 7); p._cvx = (p._cvx || 0) + ((p.vx || 0) - (p._cvx || 0)) * k; p._cvz = (p._cvz || 0) + ((p.vz || 0) - (p._cvz || 0)) * k; }
  // 1) desired framing: eased toward the target, then the padded look-ahead fit applied to it
  const D = cam.des || (cam.des = { fx: cam.fx, fy: cam.fy, z: cam.zoom });
  if (snap) { D.fx = tx; D.fy = ty; D.z = z; }
  else {
    D.z += (z - D.z) * Math.min(1, dt * (z < D.z ? 1.8 : 0.8));   // calm: out steadily, in slowly
    D.fx += (tx - D.fx) * Math.min(1, dt * 1.6);
    D.fy += (ty - D.fy) * Math.min(1, dt * 1.5);
  }
  [D.fx, D.fy] = camClamp(D.fx, D.fy, D.z);
  [D.fx, D.fy, D.z] = fitPlayers(D.fx, D.fy, D.z, true);
  if (cam.make && cam.make.want) cam.make.held = Math.max(cam.make.held || 0, 1 - D.z / Math.max(D.z, z));   // how much the player-fit held the ease back
  // 2) the camera follows the desired framing on a critically damped spring (~200 ms, no overshoot),
  //    so when the fit tightens or loosens the camera accelerates into it instead of snapping
  const V = cam.vel || (cam.vel = { fx: 0, fy: 0, z: 0 });
  if (snap || cam.legacyFit) { cam.fx = D.fx; cam.fy = D.fy; cam.zoom = D.z; V.fx = V.fy = V.z = 0; }
  else {
    const w = 22;
    for (const [k, c] of [['fx', 'fx'], ['fy', 'fy'], ['z', 'zoom']]) {
      V[k] += (w * w * (D[k] - cam[c]) - 2 * w * V[k]) * dt;
      cam[c] += V[k] * dt;
    }
  }
  // 3) safety net: an instant clamp with minimal padding, only if someone is about to leave the frame
  const [hfx, hfy, hz] = fitPlayers(cam.fx, cam.fy, cam.zoom, false, [10, 12, 10]);
  if (Math.abs(hfx - cam.fx) + Math.abs(hfy - cam.fy) > 0.5 || Math.abs(hz - cam.zoom) > 0.002) cam.hardHits = (cam.hardHits || 0) + 1;
  cam.fx = hfx; cam.fy = hfy; cam.zoom = hz;
  cam.x = cam.fx - W / 2;
  if (snap) { cam.ix = cam.x; cam.iz = cam.zoom; cam.ify = cam.fy; }
}
function camPunch() { cam.punch = REDUCED_MOTION ? 0.35 : 1; }
// logical scene point -> screen point (for HUD things anchored to the world)
// End walls behind the baselines in gyms, drawn in perspective.
function drawEndWalls(g) {
  const fill = M.gym || (VL && VL.spec.size === 'home') ? '#cfc5ae' : VL && VL.spec.size === 'S' ? '#e0d6c2' : '#cfc8b6';
  for (const [wx, side] of [[-15, -1], [1335, 1]]) {
    if (M.gym && side < 0) continue;
    const [fx, fy] = P(wx, 0, 0), [nx, ny] = P(wx, 0, COURT.D + 260), [tx, ty] = P(wx, 400, 0);
    const far = side > 0 ? 4000 : -4000;
    g.fillStyle = fill; g.beginPath(); g.moveTo(tx, ty - 400); g.lineTo(fx, fy); g.lineTo(nx, ny); g.lineTo(nx + far, ny); g.lineTo(tx + far, ty - 400); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 5; g.beginPath(); g.moveTo(tx, ty - 400); g.lineTo(fx, fy); g.lineTo(nx, ny); g.stroke();
    g.fillStyle = 'rgba(80,60,40,0.18)'; g.beginPath(); g.moveTo(fx, fy); g.lineTo(nx, ny); g.lineTo(nx + side * 30, ny); g.lineTo(fx + side * 10, fy); g.fill();   // baseboard
  }
}

// ============================================================ HOOP STANCHION
// Padded base on the floor behind the baseline, a padded post, and an arm that
// carries the backboard. Built from projected points so it sits in perspective.
function drawBox(g, x0, x1, z0, z1, h, top, front, side) {
  const q = (x, y, z) => P(x, y, z), poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); };
  poly([q(x0, h, z0), q(x1, h, z0), q(x1, h, z1), q(x0, h, z1)], top);
  poly([q(x0, 0, z1), q(x1, 0, z1), q(x1, h, z1), q(x0, h, z1)], front);
  const sx = Math.abs(x0 - 660) < Math.abs(x1 - 660) ? x0 : x1;                 // the face toward center court
  poly([q(sx, 0, z0), q(sx, 0, z1), q(sx, h, z1), q(sx, h, z0)], side);
}
function drawStanchion(g, h, pad, trim, outdoor) {
  const bx = h.x - h.dir * 92, x0 = bx - 22, x1 = bx + 22;
  if (!outdoor) {
    drawBox(g, x0, x1, h.z - 34, h.z + 34, 30, shade(pad, 0.08), shade(pad, -0.18), shade(pad, -0.05));
    const [a, b] = P(x0, 30, h.z + 34), [c] = P(x1, 30, h.z + 34); g.fillStyle = trim; g.fillRect(a, b - 1, c - a, 3);
  } else { const [sx, sy] = P(bx, 0, h.z); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(sx, sy, 12, 4, 0, 0, Math.PI * 2); g.fill(); }
  const base = P(bx, outdoor ? 0 : 30, h.z), top = P(bx, RIM_Y + 76, h.z), arm = P(h.bbx - h.dir * 3, RIM_Y + 36, h.z);
  g.lineCap = 'round';
  g.strokeStyle = '#2b3038'; g.lineWidth = outdoor ? 7 : 9; g.beginPath(); g.moveTo(...base); g.lineTo(...top); g.lineTo(...arm); g.stroke();
  g.strokeStyle = '#4a525e'; g.lineWidth = outdoor ? 3 : 4; g.beginPath(); g.moveTo(...base); g.lineTo(...top); g.lineTo(...arm); g.stroke();
  if (!outdoor) { const pb = P(bx, 30, h.z), pt = P(bx, 120, h.z); g.strokeStyle = pad; g.lineWidth = 14; g.lineCap = 'butt'; g.beginPath(); g.moveTo(...pb); g.lineTo(...pt); g.stroke(); g.strokeStyle = trim; g.lineWidth = 14; g.beginPath(); g.moveTo(pt[0], pt[1] + 3); g.lineTo(...pt); g.stroke(); }
  if (!outdoor) {
    const pb = P(bx, 34, h.z), pt = P(bx, 116, h.z);
    g.strokeStyle = 'rgba(255,244,218,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pb[0] - 5, pb[1]); g.lineTo(pt[0] - 5, pt[1]); g.stroke();
    g.strokeStyle = 'rgba(8,18,24,0.25)'; g.beginPath(); for (let i = 1; i < 4; i++) { const y = lerp(pb[1], pt[1], i / 4); g.moveTo(pb[0] - 5, y); g.lineTo(pb[0] + 5, y); } g.stroke();
    g.fillStyle = trim; g.beginPath(); g.arc(pt[0], pt[1] + 17, 2.5, 0, Math.PI * 2); g.fill();
  }
  // brace from post to the back of the board
  const b2 = P(h.bbx - h.dir * 3, RIM_Y + 6, h.z); g.strokeStyle = '#3a414b'; g.lineWidth = 3; g.beginPath(); g.moveTo(...P(bx, RIM_Y + 20, h.z)); g.lineTo(...b2); g.stroke();
}
// ============================================================ FLOOR FINISH
function glossyFloor() { return M.gym ? !!gymUp().floor : VL ? VL.spec.kind !== 'outdoor' : true; }
function drawReflections(g, actors) {
  if (!glossyFloor()) return;
  const a0 = VL && VL.spec.kind === 'arena' ? 0.16 : 0.12;
  for (const p of actors) {
    const [, fy] = P(p.x, 0, p.z);
    if (p.y > 140) continue;
    g.save(); g.globalAlpha = a0 * clamp(1 - p.y / 140, 0, 1); g.translate(0, fy); g.scale(1, -0.45); g.translate(0, -fy);
    p._refl = true; try { withPlayerBall(p, () => drawPlayer(g, p)); } finally { p._refl = false; g.restore(); }
  }
}
// light pools from ceiling fixtures, baked into glossy floor canvases
function bakeFloorLights(g, X, Z, cw, ch, warm) {
  for (let x = 90; x < COURT.L; x += 190) {
    const gr = g.createRadialGradient(X(x), Z(140), 2, X(x), Z(140), 90);
    gr.addColorStop(0, warm ? 'rgba(255,245,215,0.065)' : 'rgba(255,255,255,0.055)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(X(x), Z(140)); g.scale(0.5, 1.6); g.translate(-X(x), -Z(140)); g.fillStyle = gr; g.fillRect(X(x) - 90, Z(140) - 90, 180, 180); g.restore();
  }
  const sh = g.createLinearGradient(0, 0, 0, ch); sh.addColorStop(0, 'rgba(255,255,255,0.025)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, cw, ch);
}
// worn hardwood: soft lighter patches where play happens and faint scuffs (no debris)
function floorWear(g, X, Z, R, amt = 1) {
  for (const [x, z, r] of [[190, 350, 150], [1130, 350, 150], [660, 350, 110], [420, 200, 90], [900, 500, 90], [300, 520, 80], [1040, 180, 80]]) {
    const gr = g.createRadialGradient(X(x), Z(z), 4, X(x), Z(z), r);
    gr.addColorStop(0, `rgba(255,238,205,${0.1 * amt})`); gr.addColorStop(1, 'rgba(255,238,205,0)');
    g.save(); g.translate(X(x), Z(z)); g.scale(1, ZS * 1.3); g.translate(-X(x), -Z(z)); g.fillStyle = gr; g.fillRect(X(x) - r, Z(z) - r, r * 2, r * 2); g.restore();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = X(R() * COURT.L), y = Z(40 + R() * 620), l = 6 + R() * 16, a = R() * Math.PI;
    g.strokeStyle = `rgba(60,35,15,${(0.04 + R() * 0.05) * amt})`; g.lineWidth = 0.8 + R() * 0.8;
    g.beginPath(); g.arc(x, y, l, a, a + 0.5 + R() * 0.6); g.stroke();
  }
}
// ============================================================ LIGHTING
let _vig = null;
function screenVignette(g, strength) {
  if (!_vig || _vig.w !== W) {
    const c = makeCanvas(480, 270), v = c.getContext('2d'), gr = v.createRadialGradient(240, 150, 90, 240, 135, 300);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); v.fillStyle = gr; v.fillRect(0, 0, 480, 270); _vig = { c, w: W };
  }
  g.globalAlpha = strength; g.drawImage(_vig.c, 0, 0, W, H); g.globalAlpha = 1;
}

