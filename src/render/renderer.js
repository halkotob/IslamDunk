// ==================================================================== FX
const FX = {
  parts: [], pops: [], calls: [], shakeA: 0, sx: 0, sy: 0, slowT: 0, scale: 1, flashA: 0, hypeV: 0, flashes: [],
  reset() { this.parts = []; this.pops = []; this.calls = []; this.event = null; this.shakeA = 0; this.shakeT = 0; this.stopF = 0; this.slowT = 0; this.scale = 1; this.hypeV = 0; this.flashes = []; },
  shake(a) { this.shakeA = Math.max(this.shakeA, a * (REDUCED_MOTION ? 0.35 : 1)); },
  slowmo(t, s) { this.slowT = t * (REDUCED_MOTION ? 0.65 : 1); this.scale = REDUCED_MOTION ? lerp(1, s, 0.5) : s; },
  hype(a) { if (VL && M.venue) a *= Math.min(1.1, 0.35 + SFX.crowdLevel * 0.65); this.hypeV = Math.max(this.hypeV, a); this.flashA = Math.max(this.flashA, 0.15 * a); },
  // Callouts show one at a time: a new one waits for (and hurries) the current
  // one, duplicates are merged, and priority callouts replace it immediately.
  callout(text, color = '#ffd76a', sub = '', pri = false) {
    color = readableCallColor(color);             // never dark or invalid against the dark outline
    if (M.attract) return;
    const c = { text, color, sub, t: -0.07, life: pri ? 1.7 : 1.2 }, cur = this.calls[0];   // appears ~4 frames after the hit
    if (!cur) { this.calls = [c]; return; }
    if (cur.text === text && cur.sub === sub) { cur.t = Math.min(cur.t, 0.3); return; }
    if (pri) { this.calls = [c]; return; }
    if (cur.t > 0.6) cur.life = Math.min(cur.life, cur.t + 0.25);
    this.calls = [cur, c];
  },
  pop(x, y, z, text, color) { this.pops.push({ x, y, z, text, color, t: 0 }); },
  add(o) { if (this.parts.length < 500) this.parts.push(o); },
  cue(type, x, y, z, major = false) {
    const style = PLAY_CUES[type]; if (!style) return;
    // At most eight brief contact glyphs; no persistent screen overlay.
    let n = 0; for (const p of this.parts) if (p.kind === 'cue') n++;
    if (n < 8) this.add({ kind: 'cue', type, x, y, z, vx: 0, vy: 0, vz: 0, rot: 0, vr: 0, t: 0, life: major ? 0.55 : 0.32, major });
    if (major || type === 'green' || type === 'block') this.event = { label: style.label, color: style.color, until: Game.t + (major ? 2.2 : 1.2), major };
  },
  burst(x, y, z, n, kind, colors) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(60, kind === 'confetti' ? 260 : 340);
      this.add({ x, y, z, vx: Math.cos(a) * s, vy: rand(80, 380), vz: Math.sin(a) * s * 0.6, life: rand(0.6, 1.3), t: 0, size: rand(2, 4.5), color: pick(colors), kind, rot: rand(0, 6), vr: rand(-12, 12) });
    }
  },
  spark(x, y, z, color, kind = 'spark') { this.add({ x, y, z, vx: rand(-20, 20), vy: rand(30, 90), vz: 0, life: rand(0.4, 0.8), t: 0, size: rand(1.5, 3), color, kind, rot: 0, vr: 0 }); },
  fire(x, y, z) { this.add({ x, y, z, vx: rand(-15, 15), vy: rand(60, 140), vz: 0, life: rand(0.3, 0.55), t: 0, size: rand(4, 8), color: '#ff8a2a', kind: 'fire', rot: 0, vr: 0 }); },
  dust(x, z, n) { for (let i = 0; i < n; i++) this.add({ x, y: 3, z, vx: rand(-60, 60), vy: rand(10, 40), vz: rand(-30, 30), life: 0.45, t: 0, size: rand(3, 6), color: 'rgba(230,210,180,', kind: 'dust', rot: 0, vr: 0 }); },
  // sim-time effects (slowed by slow-mo)
  update(dt) {
    for (const p of this.parts) {
      p.t += dt;
      if (p.kind === 'ring' || p.kind === 'cue') continue;
      if (p.kind === 'fire' || p.kind === 'star') { p.vy *= 0.97; }
      else if (p.kind === 'confetti') { p.vy -= 420 * dt; p.vx *= 0.97; p.vz *= 0.97; }
      else if (p.kind === 'dust') { p.vx *= 0.9; p.vz *= 0.9; }
      else p.vy -= 700 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      if (p.y < 0 && p.kind !== 'fire') { p.y = 0; p.vy *= -0.3; }
    }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const p of this.pops) { p.t += dt; p.y += 45 * dt; }
    this.pops = this.pops.filter(p => p.t < 1.1);
    if (ball.fire && !ball.owner && ball.state !== 'held') for (let i = 0; i < 2; i++) this.fire(ball.x + rand(-4, 4), ball.y, ball.z);
  },
  // real-time effects
  updateReal(rdt) {
    if (this.slowT > 0) { this.slowT -= rdt; if (this.slowT <= 0) this.scale = 1; }
    shakeTick(rdt);
    this.flashA = Math.max(0, this.flashA - rdt * 0.6);
    this.hypeV = Math.max(0, this.hypeV - rdt * 0.35);
    const c0 = this.calls[0];
    if (c0) { c0.t += rdt; if (c0.t >= c0.life) this.calls.shift(); }
    if (this.hypeV > 0.65 && !REDUCED_MOTION && chance(Math.min(1, rdt * this.hypeV * (VL && VL.spec.kind === 'arena' ? 7 : 1.5)))) {
      if (VL) { const m = pick(VL.crowd); if (m && !m.near) this.flashes.push({ x: m.x + BG_X0 - cam.x, y: m.y - 18 * m.s, t: 0 }); }   // phone/camera flashes from real fans
      else this.flashes.push({ x: rand(0, W), y: rand(80, 170), t: 0 });
    }
    for (const f of this.flashes) f.t += rdt;
    this.flashes = this.flashes.filter(f => f.t < 0.12);
  }
};

// ============================================================== RENDERER
const FONT = '"Lilita One","Arial Black","Segoe UI Black",Impact,sans-serif';   // v7.6: chunky arcade display face (falls back offline)
const BODY = '"Trebuchet MS","Segoe UI",Verdana,sans-serif';
const GOLD = '#e8c35a', TEAL = '#0e4a45', LAPIS = '#1c3f7a', IVORY = '#f6ecd2', NIGHT = '#0b1330';
let courtCv = null, crowd = [];
function P(x, y, z) { const k = depthK(z); return [W / 2 + (x - cam.x - W / 2) * k + FX.sx, FLOOR_TOP + z * ZS - y * k + FX.sy]; }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * (1 + amt)), 0, 255); g = clamp(Math.round(g * (1 + amt)), 0, 255); b = clamp(Math.round(b * (1 + amt)), 0, 255);
  return `rgb(${r},${g},${b})`;
}
function star8(g, cx, cy, R, rx = 1, ry = 1, rot = 0) {   // khatam: two overlapping squares
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = rot + i * Math.PI / 8, r = i % 2 === 0 ? R : R * 0.7654;
    const x = cx + Math.cos(a) * r * rx, y = cy + Math.sin(a) * r * ry;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

// --------------------------------------------------------------- COURT
function buildCourt(tA, tB) {
  const cw = COURT.L + 240, ch = Math.ceil(COURT.D * ZS) + 4;
  const rs = cacheRS(); courtCv = makeCanvas(Math.ceil(cw * rs), Math.ceil(ch * rs)); courtCv.rs = rs; const g = courtCv.getContext('2d'); g.scale(rs, rs);
  const X = x => x + 120, Z = z => z * ZS;
  // apron tiles
  g.fillStyle = '#123837'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = 'rgba(232,195,90,0.12)';
  for (let x = 6; x < cw; x += 34) for (let z = 16; z < COURT.D; z += 70) { star8(g, x + ((z / 70) % 2) * 17, Z(z), 7, 1, ZS * 1.6); g.fill(); }
  // maple floor
  const grd = g.createLinearGradient(0, 0, 0, Z(COURT.D));
  grd.addColorStop(0, '#b77a45'); grd.addColorStop(1, '#dca565');
  g.fillStyle = grd; g.fillRect(X(0), 0, COURT.L, Z(COURT.D));
  for (let z = 0, i = 0; z < COURT.D; z += 16, i++) {
    g.fillStyle = i % 3 ? 'rgba(110,60,20,0.06)' : 'rgba(255,235,200,0.06)'; g.fillRect(X(0), Z(z), COURT.L, Z(16));
    g.fillStyle = 'rgba(80,40,10,0.22)'; g.fillRect(X(0), Z(z), COURT.L, 0.8);
    for (let x = (i * 137) % 260; x < COURT.L; x += 260) g.fillRect(X(x), Z(z), 1.5, Z(16));
  }
  // painted keys with lattice
  const key = (h, col, x0, x1) => {
    g.fillStyle = col; g.globalAlpha = 0.82; g.fillRect(X(x0), Z(238), x1 - x0, Z(224)); g.globalAlpha = 1;
    g.save(); g.beginPath(); g.rect(X(x0), Z(238), x1 - x0, Z(224)); g.clip();
    g.strokeStyle = 'rgba(255,230,160,0.18)'; g.lineWidth = 1;
    for (let k = -300; k < 600; k += 28) { g.beginPath(); g.moveTo(X(x0 + k), Z(238)); g.lineTo(X(x0 + k + 224), Z(462)); g.stroke(); g.beginPath(); g.moveTo(X(x0 + k + 224), Z(238)); g.lineTo(X(x0 + k), Z(462)); g.stroke(); }
    g.restore();
  };
  key(hoops[0], tA.c1, 0, 266); key(hoops[1], tB.c1, 1054, 1320);
  bakeFloorLights(g, X, Z, cw, ch, true);
  // team names painted in each half
  g.save(); g.font = `64px ${FONT}`; g.textAlign = 'center'; g.globalAlpha = 0.16;
  [[tA, 420], [tB, 900]].forEach(([T, x]) => { g.save(); g.translate(X(x), Z(585)); g.scale(1, 0.5); g.fillStyle = T.c1; g.fillText(T.short, 0, 0); g.restore(); });
  g.restore();
  // lines
  g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 2.4;
  g.strokeRect(X(0), Z(26), COURT.L, Z(648));
  g.beginPath(); g.moveTo(X(660), Z(26)); g.lineTo(X(660), Z(674)); g.stroke();
  for (const h of hoops) {
    const bx = h.dir > 0 ? 0 : COURT.L, kx = h.dir > 0 ? 266 : 1054;
    g.strokeRect(X(Math.min(bx, kx)), Z(238), 266, Z(224));
    g.beginPath(); g.ellipse(X(kx), Z(350), 84, 84 * ZS, 0, 0, Math.PI * 2); g.stroke();
    const a = Math.asin(300 / THREE_R), cx = h.x + h.dir * Math.cos(a) * THREE_R;
    g.beginPath();
    if (h.dir > 0) g.ellipse(X(h.x), Z(h.z), THREE_R, THREE_R * ZS, 0, -a, a);
    else g.ellipse(X(h.x), Z(h.z), THREE_R, THREE_R * ZS, 0, Math.PI - a, Math.PI + a);
    g.stroke();
    g.beginPath(); g.moveTo(X(bx), Z(50)); g.lineTo(X(cx), Z(50)); g.moveTo(X(bx), Z(650)); g.lineTo(X(cx), Z(650)); g.stroke();
    g.beginPath(); g.ellipse(X(h.x), Z(h.z), 52, 52 * ZS, 0, h.dir > 0 ? -Math.PI / 2 : Math.PI / 2, h.dir > 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
  }
  // center medallion: 8-point khatam with rosette ring
  const cx = X(660), cy = Z(350);
  g.fillStyle = TEAL; g.beginPath(); g.ellipse(cx, cy, 112, 112 * ZS, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.ellipse(cx, cy, 100, 100 * ZS, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = GOLD;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; star8(g, cx + Math.cos(a) * 106, cy + Math.sin(a) * 106 * ZS, 5, 1, ZS * 1.3); g.fill(); }
  star8(g, cx, cy, 86, 1, ZS, Math.PI / 8); g.fillStyle = '#f0d27a'; g.fill(); g.strokeStyle = '#7a5a14'; g.lineWidth = 1.5; g.stroke();
  star8(g, cx, cy, 58, 1, ZS, 0); g.fillStyle = LAPIS; g.fill(); g.strokeStyle = GOLD; g.stroke();
  for (let i = 0; i < 8; i++) {   // interlace strands
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58 * ZS); g.lineTo(cx + Math.cos(a + Math.PI * 0.75) * 58, cy + Math.sin(a + Math.PI * 0.75) * 58 * ZS);
    g.strokeStyle = 'rgba(240,210,122,0.55)'; g.lineWidth = 1.2; g.stroke();
  }
  star8(g, cx, cy, 22, 1, ZS, Math.PI / 8); g.fillStyle = GOLD; g.fill();
  // arabesque trim along the sidelines: gold vine with leaves and small stars
  for (const zc of [13, 687]) {
    g.fillStyle = '#0f4a3c'; g.fillRect(X(0), Z(zc - 13), COURT.L, Z(26));
    g.strokeStyle = GOLD; g.lineWidth = 1.2; g.beginPath();
    for (let x = 0; x <= COURT.L; x += 3) { const z = zc + Math.sin(x / 22) * 7; x ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)); }
    g.stroke();
    g.fillStyle = '#d9b24c';
    for (let x = 11; x < COURT.L; x += 22 * Math.PI) {
      for (const s of [1, -1]) { const xx = x + (s > 0 ? 0 : 22 * Math.PI / 2), z = zc + Math.sin(xx / 22) * 7; g.beginPath(); g.ellipse(X(xx + 5), Z(z - s * 4), 5, 2.2 * ZS * 2, s * 0.6, 0, Math.PI * 2); g.fill(); }
    }
    for (let x = 0; x < COURT.L; x += 22 * Math.PI) { star8(g, X(x), Z(zc), 4, 1, ZS * 1.6); g.fill(); }
  }
  finishCourtMaterial(g, X, Z, { kind: 'classic' }, tA, tB, seededRng(460));
}

// ---------------------------------------------------------------- CROWD
let crowdCv = null;
function buildCrowd(tA, tB) {
  crowd = [];
  const skins = ['#f1c9a5', '#d9a57a', '#b07850', '#8d5a3b', '#6f4630', '#e0b48a'];
  for (let r = 0; r < 5; r++) for (let x = -120; x < 1500; x += 13 + r) {
    const fans = M.career && C ? 0.12 + masjidLevel() * 0.035 : null;
    const T = fans != null ? (chance(fans) ? tA : chance(0.5) ? tB : { c1: pick(['#6b5a4a', '#3a3a3a', '#8a8a8a']), c2: '#dddddd' }) : x + rand(-200, 200) < 700 ? tA : tB, head = pick([0, 0, 1, 1, 2]);
    crowd.push({ x: x + rand(-3, 3), r, skin: pick(skins), top: chance(0.6) ? T.c1 : pick(['#dddddd', '#3a3a3a', '#6b5a4a', T.c2]),
      head, hc: head === 1 ? pick([T.c1, T.c2, '#2d2d4a', '#5a2d3a', '#e8e0d0', '#1e5a4a']) : head === 2 ? '#f4f4f4' : '#1a1410', ph: rand(0, 6) });
  }
  // pre-render the resting crowd once; it's only redrawn live while cheering
  const crs = Math.min(2, cacheRS()); crowdCv = makeCanvas(Math.ceil(1760 * crs), Math.ceil(100 * crs)); crowdCv.lw = 1760; crowdCv.lh = 100; const cg = crowdCv.getContext('2d'); cg.scale(crs, crs);
  for (const m of crowd) drawFan(cg, m.x + 120, 18 + m.r * 17, m, 0.72 + m.r * 0.07);
}
function drawFan(g, sx, by, m, sc) {
  g.fillStyle = m.top; g.fillRect(sx - 5 * sc, by + 4 * sc, 10 * sc, 9 * sc);
  if (m.head === 1) { g.fillStyle = m.hc; g.beginPath(); g.arc(sx, by, 5.3 * sc, 0, Math.PI * 2); g.fill(); g.fillRect(sx - 5.3 * sc, by, 10.6 * sc, 5 * sc); g.fillStyle = m.skin; g.beginPath(); g.arc(sx, by + 0.8 * sc, 3 * sc, 0, Math.PI * 2); g.fill(); }
  else { g.fillStyle = m.skin; g.beginPath(); g.arc(sx, by, 4.3 * sc, 0, Math.PI * 2); g.fill(); g.fillStyle = m.hc; g.beginPath(); g.arc(sx, by - 1 * sc, 4.4 * sc, Math.PI, 0); g.fill(); }
}
function drawArena(g, t) {
  const night = M.double;
  const sky = g.createLinearGradient(0, 0, 0, FLOOR_TOP);
  sky.addColorStop(0, night ? '#050818' : '#101a30'); sky.addColorStop(1, night ? '#16163a' : '#20304a');
  g.fillStyle = sky; g.fillRect(0, 0, W, FLOOR_TOP + 2);
  if (night) {                     // Laylatul Qadr: stars and a crescent above the arches
    for (let i = 0; i < 60; i++) { const x = (i * 97.3 - cam.x * 0.2) % W, y = (i * 53.7) % 60 + 4; g.fillStyle = `rgba(255,248,220,${0.4 + 0.4 * Math.sin(t * 2 + i)})`; g.fillRect((x + W) % W, y, 1.6, 1.6); }
    const mx = 820 - cam.x * 0.1; g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(mx, 30, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#060a1c'; g.beginPath(); g.arc(mx + 7, 26, 14, 0, Math.PI * 2); g.fill();
  }
  // arcade of pointed arches (parallax 0.5)
  const ox = -(cam.x * 0.5) % 90;
  for (let x = ox - 90; x < W + 90; x += 90) {
    g.fillStyle = night ? 'rgba(20,30,70,0.18)' : '#1a3346';
    g.beginPath(); g.moveTo(x + 10, 96); g.lineTo(x + 10, 52);
    g.quadraticCurveTo(x + 12, 30, x + 45, 18); g.quadraticCurveTo(x + 78, 30, x + 80, 52); g.lineTo(x + 80, 96); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(232,195,90,0.55)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(232,195,90,0.25)'; star8(g, x + 45, 58, 8); g.fill();
    g.strokeStyle = 'rgba(255,244,210,0.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 17, 88); g.quadraticCurveTo(x + 45, 44, x + 73, 88); g.stroke();
  }
  // lanterns (fanous)
  const lx = -(cam.x * 0.55) % 180;
  for (let x = lx - 180; x < W + 180; x += 180) {
    const y = 40 + Math.sin(t * 1.3 + x) * 1.5;
    g.drawImage(lanternGlow(), x - 30, y - 30, 60, 60);
    g.strokeStyle = 'rgba(232,195,90,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - 10); g.stroke();
    g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 6, y - 4); g.lineTo(x + 5, y + 8); g.lineTo(x - 5, y + 8); g.lineTo(x - 6, y - 4); g.closePath(); g.fill();
    g.fillStyle = '#8a5a14'; g.fillRect(x - 6, y + 8, 12, 2);
  }
  // stands
  for (let r = 0; r < 5; r++) {
    const y = 96 + r * 17; g.fillStyle = r % 2 ? '#1b2432' : '#222d3d'; g.fillRect(0, y, W, 17);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, y + 14, W, 3);
    g.fillStyle = 'rgba(232,195,90,0.18)'; g.fillRect(0, y, W, 1);
  }
  const hype = FX.hypeV;
  if (hype < 0.05 && crowdCv) blit(g, crowdCv, -120 - cam.x * 0.8, 90);
  else if (crowdCv) {                                   // rows split into chunks bouncing on staggered beats (cached image, cheap)
    const rs = crowdCv.width / crowdCv.lw, ox = -120 - cam.x * 0.8, chunk = 120;
    for (let r = 0; r < 6; r++) for (let c = 0; c * chunk < crowdCv.lw; c++) {
      const sx = ox + c * chunk; if (sx > W + 20 || sx + chunk < -20) continue;
      const y0 = Math.max(0, r * 17 - 2), bnc = Math.abs(Math.sin(t * 9 + r * 1.3 + c * 2.1)) * hype * 5;
      g.drawImage(crowdCv, c * chunk * rs, y0 * rs, chunk * rs, 22 * rs, sx, 90 + y0 - bnc, chunk, 22);
    }
  }
  for (const f of FX.flashes) { g.fillStyle = `rgba(255,255,255,${1 - f.t / 0.12})`; g.beginPath(); g.arc(f.x, f.y, 3, 0, Math.PI * 2); g.fill(); }
  // courtside ledge
  g.fillStyle = '#0c1f24'; g.fillRect(0, FLOOR_TOP - 6, W, 6);
  g.fillStyle = GOLD; g.fillRect(0, FLOOR_TOP - 6, W, 1);
}
function drawNearSide(g) {
  const y0 = FLOOR_TOP + COURT.D * ZS;
  const grd = g.createLinearGradient(0, y0, 0, H); grd.addColorStop(0, '#12302e'); grd.addColorStop(1, '#081716');
  g.fillStyle = grd; g.fillRect(0, y0, W, H - y0);
  g.fillStyle = GOLD; g.fillRect(0, y0, W, 1.5);
  const ox = -(cam.x) % 40;
  g.fillStyle = 'rgba(232,195,90,0.18)';
  for (let x = ox - 40; x < W + 40; x += 40) { star8(g, x, y0 + 16, 7, 1, 0.6); g.fill(); }
}

// ------------------------------------------------------------ PLAYERS
function limb(g, pts, w, col) {
  g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = '#1a1210'; g.lineWidth = w + 3; g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
// ------------------------------------------------------ CACHED SPRITES
// Gradients that used to be rebuilt every frame are pre-rendered once.
const Sprites = {};
function sprite(key, w, h, paint) {
  if (Sprites[key]) return Sprites[key];
  const c = makeCanvas(w, h), g = c.getContext('2d'); paint(g, w, h); return (Sprites[key] = c);
}
function radialSprite(key, rgb, a0) {
  return sprite(key, 128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
    gr.addColorStop(0, `rgba(${rgb},${a0})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
}
const shadowSprite = () => radialSprite('shadow', '20,10,0', 0.55);
const boostGlow = () => radialSprite('boost', '255,226,120', 0.5);
const fireGlow = () => radialSprite('fire', '255,120,40', 0.5);
const ballFireGlow = () => radialSprite('ballfire', '255,150,50', 0.85);
const lanternGlow = () => radialSprite('lantern', '255,200,110', 0.55);
const ballSprite = () => sprite('ball', 40, 40, g => {
  const gr = g.createRadialGradient(15, 15, 2, 20, 20, 18);
  gr.addColorStop(0, '#ffc070'); gr.addColorStop(0.6, '#e7822e'); gr.addColorStop(1, '#b4521a');
  g.fillStyle = gr; g.beginPath(); g.arc(20, 20, 17.5, 0, Math.PI * 2); g.fill();
});
function drawShadow(g, x, y, z, rx) {
  rx *= depthK(z);
  const [px, sy] = P(x, 0, z), k = clamp(1 - y / 240, 0.3, 1), S = SHADOW, sx = px + S.dx * (0.4 + 0.6 * k), w = rx * 2.5 * k * S.sx;   // venue light direction
  g.globalAlpha = Math.min(1, (0.25 + 0.75 * k) * S.a);
  g.drawImage(shadowSprite(), sx - w / 2, sy - rx * 0.42 * k, w, rx * 0.84 * k);
  if (y < 18) { g.fillStyle = `rgba(18,12,10,${0.2 * (1 - y / 18)})`; g.beginPath(); g.ellipse(px, sy + 1, rx * 0.72, Math.max(1.2, rx * 0.16), 0, 0, Math.PI * 2); g.fill(); }   // contact shadow right under the feet
  g.globalAlpha = 1;
}

// Sprite-style figure drawn in groups. Each group strokes one thin dark
// outline under all its parts, fills them, then adds a darker cel-shade band
// on the side away from the court lights (back and underside).
const OUTLINE = '#1a1210';
function segPath(g, s) {
  g.beginPath();
  if (s.t === 'l') { g.moveTo(s.p[0], s.p[1]); for (let i = 2; i < s.p.length; i += 2) g.lineTo(s.p[i], s.p[i + 1]); }
  else if (s.t === 'c') g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  else if (s.t === 'e' || s.t === 's') g.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
  else { g.moveTo(s.p[0], s.p[1]); for (let i = 2; i < s.p.length; i += 2) g.lineTo(s.p[i], s.p[i + 1]); g.closePath(); }
}
function drawGroup(g, segs, f) {
  for (const s of segs) {               // thin outlines
    if (s.t === 'l') { segPath(g, s); g.strokeStyle = OUTLINE; g.lineWidth = s.w + 3; g.stroke(); }
    else if (s.t === 'c') { g.beginPath(); g.arc(s.x, s.y, s.r + 1.5, 0, Math.PI * 2); g.fillStyle = OUTLINE; g.fill(); }
    else if (s.t === 'e' || s.t === 's') { g.beginPath(); g.ellipse(s.x, s.y, s.rx + 1.5, s.ry + 1.5, 0, 0, Math.PI * 2); g.fillStyle = OUTLINE; g.fill(); }
    else { segPath(g, s); g.strokeStyle = OUTLINE; g.lineWidth = 3; g.stroke(); }
  }
  for (const s of segs) {               // base fills + cel shade
    if (s.t === 'l') {
      segPath(g, s); g.strokeStyle = s.c; g.lineWidth = s.w; g.stroke();
      if (s.sh) { g.save(); g.translate(-f * s.w * 0.2, s.w * 0.12); segPath(g, s); g.strokeStyle = s.sh; g.lineWidth = s.w * 0.45; g.stroke(); g.restore(); }
    } else if (s.t === 's') {             // sneaker: upper, white sole, toe highlight
      segPath(g, s); g.fillStyle = s.c; g.fill();
      g.save(); segPath(g, s); g.clip(); g.fillStyle = '#f7f7f2'; g.fillRect(s.x - s.rx - 1, s.y + s.ry * 0.25, s.rx * 2 + 2, s.ry);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(s.x + f * s.rx * 0.15 - 2, s.y - s.ry * 0.55, 4, 1.4); g.restore();
    } else {
      segPath(g, s); g.fillStyle = s.c; g.fill();
      if (s.sh) { g.save(); segPath(g, s); g.clip(); g.fillStyle = s.sh; g.fill(); g.translate(f * (s.lx || 4), -(s.ly || 2.5)); segPath(g, s); g.fillStyle = s.c; g.fill(); g.restore(); }
    }
  }
}
function drawPlayer(g, p) {
  const T = p.T, def = p.def, lk = def.look, [bx, by] = P(p.x, p.y, p.z);
  const sc = p.spin ? Math.cos(p.spin) : 1, fs = p.face * (Math.abs(sc) < 0.2 ? 0.2 * sgn(sc) : sc), f = sgn(fs);
  const sq = p.sq || 0, sw = (lk ? BUILD_W[lk.build] : 1) * (1 - sq * 0.06), sh = (lk ? HEIGHT_S[lk.height] : 1) * (1 + sq * 0.08);
  const uncle = !!(M.fun && M.fun.uncle && !M.gym && p.team !== 9);
  const thobe = p.outfit === 'thobe', robe = uncle ? T.c1 : lk ? (lk.teamMatch ? T.c1 : THOBES_ALL[lk.thobe]) : (def.thobe || '#f4f4ef'), hemK = (lk ? lk.thobeLen % 2 : 0) && !uncle ? 0.5 : 0.82;
  const trim = lk && !uncle && (lk.thobeLen >= 2 || lk.teamMatch) ? (lk.teamMatch ? T.c2 : '#c9a24a') : null;   // trimmed thobes / team colors
  const shoe = lk ? SNEAKERS[lk.shoes] : '#e8ecf0', hair = lk ? HAIRS[lk.hair] : def.hair;
  const cap = lk ? CAPKEYS[lk.cap] : def.hat, capCol = lk ? (lk.teamMatch && lk.cap ? T.c2 : CAPCOLS_ALL[lk.capColor]) : (def.capColor || '#f7f7f2');
  const beard = lk ? lk.beard : def.beardStyle != null ? def.beardStyle : def.sheikh || def.elder ? 3 : 2;
  const beardLen = lk ? lk.beardLen : def.elder ? 2 : def.sheikh ? 1 : 0;
  const top = thobe ? robe : T.c1, skin = def.skin, dim = c => shade(c, -0.22), cel = c => shade(c, -0.16);
  const J = p.j, hipH = p.hipH, lean = J.lean.a, cl = p.cloth || { x: 0, y: 0 };
  const L = (lx, ly) => [lx * fs, -ly];
  const leg = (h, k) => { const kx = Math.sin(h) * 22, ky = hipH - Math.cos(h) * 22; return [kx, ky, kx + Math.sin(h - k) * 22, ky - Math.cos(h - k) * 22]; };
  const shX = Math.sin(lean) * 30, shY = hipH + Math.cos(lean) * 30;
  const arm = (s, e) => { const ex = shX + Math.sin(s) * 16, ey = shY - Math.cos(s) * 16; return [ex, ey, ex + Math.sin(s + e) * 15, ey - Math.cos(s + e) * 15]; };
  const hx = shX + Math.sin(lean) * 13, hy = shY + Math.cos(lean) * 13 + 2;
  const heldBall = ball.owner === p;
  const legSegs = (side, far) => {
    const [kx, ky, fx, fy] = leg(J[side + 'h'].a, J[side + 'k'].a), c = x => far ? dim(x) : x, out = [];
    const at = k => L(lerp(kx, fx, k), lerp(ky, fy, k));
    const [sx, sy] = L(fx + 3.5, fy + 1);
    if (uncle) { out.push({ t: 'e', x: sx, y: sy + 1.5, rx: 7.5, ry: 2, c: c('#5a4632') }); out.push({ t: 'e', x: sx, y: sy - 0.5, rx: 6, ry: 2.6, c: c(skin) }); }   // slides
    else out.push({ t: 's', x: sx, y: sy, rx: 8.4, ry: 4.3, c: c(shoe) });
    if (thobe) {
      const hem = L(lerp(kx, fx, hemK) + cl.x * 0.6, lerp(ky, fy, hemK) + cl.y * 0.5);
      out.push({ t: 'l', p: [...at(Math.max(hemK, 0.72)), ...L(fx, fy + 1)], w: 7.2, c: c('#f4f4f4') });
      if (hemK < 0.7) out.push({ t: 'l', p: [...at(hemK), ...at(0.74)], w: 7.2, c: c(skin), sh: far ? null : cel(skin) });
      out.push({ t: 'l', p: [...L(0, hipH), ...L(kx, ky), ...hem], w: 14, c: c(robe), sh: cel(c(robe)) });
      if (trim) out.push({ t: 'l', p: [hem[0] - 6.5, hem[1] - 2.5, hem[0] + 6.5, hem[1] - 2.5], w: 2.6, c: c(trim) });   // trim band across the hem
    } else {
      out.push({ t: 'l', p: [...at(0.62), ...L(fx, fy + 1)], w: 7.2, c: c('#f4f4f4') });
      out.push({ t: 'l', p: [...at(0.3), ...at(0.64)], w: 7.4, c: c(skin), sh: far ? null : cel(skin) });
      out.push({ t: 'l', p: [...L(0, hipH), ...L(kx, ky), ...at(0.32)], w: 13, c: c(T.c1), sh: cel(c(T.c1)) });   // long shorts past the knee
    }
    return out;
  };
  const armSegs = (side, far) => {
    const [ex, ey, hx2, hy2] = arm(J[side + 's'].a, J[side + 'e'].a), c = x => far ? dim(x) : x, out = [];
    if (thobe) {
      const ex2 = lerp(ex, hx2, 0.78), ey2 = lerp(ey, hy2, 0.78);
      out.push({ t: 'l', p: [...L(shX, shY), ...L(ex, ey), ...L(ex2, ey2), ...L(ex2 + cl.x * 0.45 - 1, ey2 - 1.5 + cl.y * 0.3)], w: 9, c: c(top), sh: cel(c(top)) });   // sleeve flares and trails
    } else {
      out.push({ t: 'l', p: [...L(ex, ey), ...L(hx2, hy2)], w: 6.8, c: c(skin), sh: far ? null : cel(skin) });
      out.push({ t: 'l', p: [...L(shX, shY), ...L(ex, ey)], w: 9.6, c: c(top), sh: cel(c(top)) });
    }
    const [a, b] = L(hx2, hy2); out.push({ t: 'c', x: a, y: b, r: 4.5, c: c(skin) });
    return out;
  };
  const dk = depthK(p.z), br = 1 + 0.02 * Math.sin(Game.t * 11 + p.x * 0.01) * clamp(((p.fat || 0) - 0.45) / 0.55, 0, 1);   // breathing hard
  const begin = () => { g.save(); g.translate(bx, by); if (Math.abs(p.rot) > 0.01) g.rotate(p.rot); g.scale(sw * dk * (2 - br), sh * dk * br); g.lineCap = 'round'; g.lineJoin = 'round'; };
  if (!p._refl && (p.boost > 0 || p.fire)) {
    const cyy = by - (hipH + 12) * sh, a = 0.75 + 0.25 * Math.sin(M.time * 12);
    g.globalAlpha = a; g.drawImage(p.boost > 0 ? boostGlow() : fireGlow(), bx - 50, cyy - 72, 100, 144); g.globalAlpha = 1;
  }
  if (heldBall && ball.behind) drawBall(g);
  begin();
  const torso = { t: 'p', c: top, sh: cel(top), lx: 5, ly: 1.5, p: [...L(-8.8, hipH + 1), ...L(8.8, hipH + 1), ...L(shX + 10.5, shY + 1), ...L(shX + 4.5, shY + 6), ...L(shX - 5.5, shY + 6), ...L(shX - 11, shY)] };
  const body = [...legSegs('f', true), ...armSegs('f', true), torso];
  if (thobe) {
    const [nkx, nky, nfx, nfy] = leg(J.nh.a, J.nk.a), [fkx, fky, ffx, ffy] = leg(J.fh.a, J.fk.a);
    const n2 = L(lerp(nkx, nfx, hemK), lerp(nky, nfy, hemK)), f2 = L(lerp(fkx, ffx, hemK), lerp(fky, ffy, hemK));
    const sway = cl.x * f, yb = Math.max(n2[1], f2[1]) - cl.y * 0.6, xa = Math.max(n2[0], f2[0]) + 3 + sway, xb = Math.min(n2[0], f2[0]) - 3 + sway;
    body.push({ t: 'p', c: robe, sh: cel(robe), lx: 4, ly: 1, p: [...L(-8, hipH + 4), ...L(8, hipH + 4), xa, yb, lerp(xa, xb, 0.5), yb + 1.5, xb, yb] });
  }
  drawGroup(g, body, f);
  // The existing cel shading and cloth sway carry fabric form without extra seams.
  if (!thobe) {
    g.strokeStyle = T.c2; g.lineWidth = 2.2; g.beginPath(); g.moveTo(...L(-6.5, hipH + 3)); g.lineTo(...L(shX - 8, shY)); g.stroke();   // side piping
    g.beginPath(); g.moveTo(...L(shX + 3, shY + 3.5)); g.quadraticCurveTo(...L(shX + 6, shY - 1), ...L(shX + 8.5, shY + 0.5)); g.stroke();   // collar
    const [nx, ny] = L(shX * 0.5 + 1.5, (hipH + shY) / 2 + 1);
    if (!p._refl) { g.save(); g.scale(1 / sw, 1 / sh); drawTextSprite(g, textSprite(String(def.num), 11, T.c2, shade(T.c1, -0.5), 2.4), nx * sw, ny * sh + 4); g.restore(); }   // no mirrored text in reflections (slow, unreadable)
  }
  drawGroup(g, legSegs('n', false), f);
  // head: profile with nose, cel shade on the back of the head
  const [HX, HY] = L(hx, hy);
  const bigHead = M.fun && M.fun.bigHead && !M.gym, hs = 1.15 * (bigHead ? 1.7 : 1);   // arcade head (+15%)
  g.save(); g.translate(HX, HY + 8); g.scale(hs, hs); g.translate(-HX, -HY - 8);
  drawGroup(g, [{ t: 'c', x: HX + 8.6 * f, y: HY + 0.8, r: 2.1, c: skin }, { t: 'p', c: skin, sh: cel(skin), lx: 3, ly: 2.5, p: circlePts(HX, HY, 9.5) }], f);
  drawBeard(g, HX, HY, f, beard, beardLen, hair);
  drawFace(g, HX, HY, f, p.expr ? p.expr.k : null, hair, def.glasses);
  drawCap(g, HX, HY, f, cap === 'kufiEmb' || cap === 'kufiStripe' ? 'kufi' : cap, capCol, hair); drawCapPattern(g, HX, HY, f, cap, capCol);
  g.restore();
  drawGroup(g, armSegs('n', false), f);
  g.restore();
  if (heldBall && !ball.behind) drawBall(g);
  if (p.human >= 0 && !M.attract && !p.noMarker && !p._refl && M.phase === 'live' && !M.practice && ball.owner === p && sigAvailable(p)) drawSkillCue(g, p);
  if (p.human >= 0 && !M.attract && !p.noMarker && !p._refl) {
    const [tx, ty] = P(p.x, p.y + 118 * sh, p.z), col = p.human === 0 ? '#ff5a5a' : '#46a8ff';
    g.fillStyle = col; g.beginPath(); g.moveTo(tx - 6, ty); g.lineTo(tx + 6, ty); g.lineTo(tx, ty + 7); g.fill();
    const mine = (Net.role === 'host' && p.human === 0) || (Net.role === 'guest' && p.human === 1);
    drawTextSprite(g, textSprite(mine || M.career || M.gym ? 'YOU' : Net.role ? 'FRIEND' : 'P' + (p.human + 1), 11, col, 'rgba(0,0,0,0)', 0), tx, ty - 3);
    if (p.state === 'windup' || p.state === 'shoot') {
      // Shot meter: fills toward the release point (jump apex); the green zone
      // is drawn at its real size for this shot (rating, distance, difficulty),
      // with the wider GOOD band around it.
      const ap = apexT(p), span = ap * 2, Hm = 48, k = p.state === 'windup' ? 0 : clamp(p.st_t / span, 0, 1), mx = tx + 24, my = ty + 64;
      const win = shotWindow(p), cy = my - Hm * (ap / span);
      g.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(g, mx - 1, my - Hm - 1, 10, Hm + 2, 4); g.fill();
      if (win > 0) {
        const gh = Hm * (win * 3 / span), gg = Hm * (win / span);
        g.fillStyle = 'rgba(255,216,77,0.45)'; g.fillRect(mx, cy - gh, 8, gh * 2);
        g.fillStyle = '#57e389'; g.fillRect(mx, cy - Math.max(1.5, gg), 8, Math.max(3, gg * 2));
      }
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(mx, my - Hm * k, 8, Hm * k);
      g.fillStyle = '#fff'; roundRect(g, mx - 3, my - Hm * k - 1.5, 14, 3, 1.5); g.fill();
    }
  }
}
function circlePts(x, y, r) { const pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } return pts; }
// Five beard silhouettes: stubble, short boxed, and full beards in round,
// medium-pointed and long-pointed shapes (full beards get a moustache).
function drawBeard(g, HX, HY, f, style, len, col) {
  if (!style) return;
  if (style === 4) { g.fillStyle = col; g.beginPath(); g.moveTo(HX + 2 * f, HY + 5); g.quadraticCurveTo(HX + 5 * f, HY + 12 + len * 2, HX + 8.5 * f, HY + 5.5); g.quadraticCurveTo(HX + 5 * f, HY + 7.5, HX + 2 * f, HY + 5); g.fill(); g.fillRect(HX + 3.5 * f - (f < 0 ? 5 : 0), HY + 2.2, 5, 1.4); return; }   // goatee
  if (style === 5) { g.strokeStyle = col; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(HX - 6 * f, HY - 2); g.quadraticCurveTo(HX - 4 * f, HY + 9, HX + 3 * f, HY + 10); g.quadraticCurveTo(HX + 7.5 * f, HY + 9, HX + 8.5 * f, HY + 5); g.stroke(); return; }   // chinstrap
  g.fillStyle = col; g.beginPath();
  if (style === 1) {
    g.globalAlpha = 0.38; g.moveTo(HX - 5.5 * f, HY + 1); g.quadraticCurveTo(HX, HY + 10.5, HX + 8.5 * f, HY + 4); g.lineTo(HX + 8 * f, HY + 2.5); g.quadraticCurveTo(HX + 1 * f, HY + 6.5, HX - 5.5 * f, HY + 1);
    g.fill(); g.globalAlpha = 1; return;
  }
  if (style === 2) { g.moveTo(HX - 6 * f, HY); g.lineTo(HX - 5 * f, HY + 6); g.quadraticCurveTo(HX + 1 * f, HY + 11.5, HX + 8.5 * f, HY + 7.5); g.lineTo(HX + 9 * f, HY + 3.5); g.quadraticCurveTo(HX + 2 * f, HY + 6.5, HX - 6 * f, HY); }
  else {
    const tip = [12, 15.5, 20][len] || 15.5, point = len > 0;
    g.moveTo(HX - 6.5 * f, HY - 1); g.lineTo(HX - 6 * f, HY + 6);
    if (point) { g.quadraticCurveTo(HX - 2 * f, HY + tip - 2, HX + 3.5 * f, HY + tip); g.quadraticCurveTo(HX + 7 * f, HY + tip - 5, HX + 9.5 * f, HY + 5); }
    else g.bezierCurveTo(HX - 4 * f, HY + tip + 1, HX + 8 * f, HY + tip, HX + 9.5 * f, HY + 5);
    g.lineTo(HX + 9.2 * f, HY + 3); g.quadraticCurveTo(HX + 2 * f, HY + 6.5, HX - 6.5 * f, HY - 1);
  }
  g.closePath(); g.fill();
  g.strokeStyle = shade(col === '#161616' || col === '#1c1c1c' ? '#3a3a3a' : col, -0.35); g.lineWidth = 1; g.stroke();
  if (style === 3) { g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); g.moveTo(HX + 6 * f, HY + 3.4); g.quadraticCurveTo(HX + 8 * f, HY + 2.6, HX + 10 * f, HY + 3.6); g.stroke(); }
}
// Faces: a simple neutral eye and brow (no expressions), sized to read on phones.
function drawFace(g, HX, HY, f, expr, hair, glasses) {
  const ex = HX + 4.8 * f, ey = HY - 1.2;
  const fierce = expr === 'fierce', shocked = expr === 'shock', joyful = expr === 'joy';
  g.fillStyle = '#1a120c'; g.beginPath(); g.ellipse(ex, ey, shocked ? 1.55 : 1.35, shocked ? 2.2 : 1.9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(ex + 0.45 * f, ey - 0.6, 0.45, 0, Math.PI * 2); g.fill();
  g.strokeStyle = shade(hair || '#1a1410', -0.2); g.lineWidth = 1.5; g.lineCap = 'round';
  g.beginPath();
  if (fierce) { g.moveTo(ex - 2.2 * f, ey - 4.1); g.lineTo(ex + 2.3 * f, ey - 2.9); }
  else { g.moveTo(ex - 2.2 * f, ey - 3.6); g.lineTo(ex + 2.3 * f, ey - (shocked ? 4.4 : 3.9)); }
  g.stroke();
  if (joyful || fierce || shocked) {
    g.strokeStyle = '#3b2017'; g.lineWidth = joyful ? 1.1 : 1.4; g.beginPath();
    if (joyful) g.arc(HX + 4 * f, HY + 3.2, 2.3, 0.15, Math.PI - 0.15);
    else if (shocked) g.arc(HX + 4 * f, HY + 5.1, 1.6, 0, Math.PI * 2);
    else { g.moveTo(HX + 2 * f, HY + 4.5); g.lineTo(HX + 6.3 * f, HY + 3.8); }
    g.stroke();
  }
  if (!glasses) return;
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.1; g.beginPath(); g.arc(ex, ey, 2.9, 0, Math.PI * 2); g.moveTo(ex - 2.8 * f, ey - 0.3); g.lineTo(HX - 4 * f, HY - 2.5); g.stroke();
}
function drawCap(g, HX, HY, f, cap, col, hair) {
  g.strokeStyle = OUTLINE; g.lineWidth = 1.6;
  if (cap === 'kufi' || cap === 'crochet') {
    // rounded dome that sits back on the head, with a clean band at the rim
    g.fillStyle = col; g.beginPath(); g.moveTo(HX - 9.6 * f, HY - 3); g.bezierCurveTo(HX - 9.6 * f, HY - 13.5, HX + 8.4 * f, HY - 13.5, HX + 8.4 * f, HY - 3.6); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = shade(col, col === '#1c1c1c' ? 1.4 : -0.22); g.lineWidth = 1.2; g.beginPath(); g.moveTo(HX - 9.2 * f, HY - 4.8); g.lineTo(HX + 8.1 * f, HY - 5.2); g.stroke();
    if (cap === 'crochet') { g.fillStyle = shade(col, col === '#1c1c1c' ? 1.8 : -0.3); for (let r = 0; r < 2; r++) for (let i = -3; i <= 3; i++) { if (r && Math.abs(i) > 2) continue; g.beginPath(); g.arc(HX - 0.6 * f + i * 2.5, HY - 7.4 - r * 2.6, 0.7, 0, Math.PI * 2); g.fill(); } }
  } else if (cap === 'topi') {
    g.fillStyle = col; g.beginPath(); g.moveTo(HX - 9.5 * f, HY - 3.8); g.lineTo(HX - 9 * f, HY - 14); g.quadraticCurveTo(HX, HY - 15.2, HX + 9 * f, HY - 14); g.lineTo(HX + 9.5 * f, HY - 3.8); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(HX - 9.3 * f, HY - 6.8); g.lineTo(HX + 9.3 * f, HY - 6.8); g.moveTo(HX - 9.1 * f, HY - 9); g.lineTo(HX + 9.1 * f, HY - 9); g.stroke();
  } else if (cap === 'imama') {
    g.fillStyle = col; g.beginPath(); g.ellipse(HX - 1 * f, HY - 6.2, 11.2, 8, 0, Math.PI * 1.02, -0.02); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(HX - 9.5 * f, HY - 8.5); g.quadraticCurveTo(HX, HY - 12.5, HX + 8.5 * f, HY - 10.5); g.moveTo(HX - 10.5 * f, HY - 5); g.quadraticCurveTo(HX, HY - 8, HX + 9.5 * f, HY - 6.5); g.stroke();
    g.fillStyle = col; g.strokeStyle = OUTLINE; g.lineWidth = 1.4; g.beginPath(); g.moveTo(HX - 10 * f, HY - 6); g.lineTo(HX - 14 * f, HY + 5); g.lineTo(HX - 10.5 * f, HY + 5.5); g.lineTo(HX - 8 * f, HY - 3); g.closePath(); g.fill(); g.stroke();
  } else {
    g.fillStyle = hair; g.beginPath(); g.moveTo(HX + 7.5 * f, HY - 5.5); g.quadraticCurveTo(HX + 2 * f, HY - 12, HX - 6 * f, HY - 8.5); g.quadraticCurveTo(HX - 11 * f, HY - 4, HX - 7 * f, HY + 3); g.quadraticCurveTo(HX - 5 * f, HY - 3, HX + 1 * f, HY - 5.5); g.closePath(); g.fill();
  }
}

// ---------------------------------------------------------------- BALL
function drawBall(g) {
  const f = ballFeel();
  drawBallAt(g, ball.x, ball.y, ball.z, ball.rot, ball.fire, f);
}
function drawBallAt(g, x, y, z, rot, fire, feel) {
  const [sx, sy] = P(x, y, z), r = (BALL_R + 0.5) * depthK(z);
  // weight: a short squash on the catch (-) and stretch along the flight on release (+)
  const q = feel ? feel.k : 0, sq = Math.abs(q) > 0.02;
  if (sq) { g.save(); g.translate(sx, sy); g.rotate(q > 0 ? feel.ang : 0); g.scale(1 + 0.05 * Math.abs(q), 1 - 0.045 * Math.abs(q)); g.rotate(q > 0 ? -feel.ang : 0); g.translate(-sx, -sy); }
  if (fire) g.drawImage(ballFireGlow(), sx - 24, sy - 24, 48, 48);
  g.drawImage(ballSprite(), sx - r - 0.5, sy - r - 0.5, r * 2 + 1, r * 2 + 1);
  g.save(); g.translate(sx, sy); g.rotate(rot);
  g.strokeStyle = '#3a1a08'; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
  g.beginPath(); g.arc(-r * 1.1, 0, r * 0.75, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r * 1.1, 0, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
  g.fillStyle = 'rgba(255,238,195,0.42)'; g.beginPath(); g.ellipse(-r * 0.28, -r * 0.38, r * 0.19, r * 0.1, -0.45, 0, Math.PI * 2); g.fill();
  g.restore();
  g.strokeStyle = '#3a1a08'; g.lineWidth = 1.4; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
  if (sq) g.restore();
}
// ---------------------------------------------------------------- HOOPS
function hoopTeam(h) { return M.teamDefs[h.idx]; }
function drawHoopBack(g, h) {
  if (VL && !M.gym) { const v = VL.spec; if (v.kind === 'gym') return drawGymHoopBack(g, h, v.size === 'home' ? gymUp() : { hoops: 1 }); if (v.kind === 'outdoor') return drawPoleHoopBack(g, h); }
  if (M.gym) { drawGymHoopBack(g, h); return; }
  const T = hoopTeam(h), A = VL && VL.spec.kind === 'arena' ? ARENAS[VL.spec.tier] : null;
  drawStanchion(g, h, A ? A.c1 : shade(T.c1, -0.05), A ? A.c2 : T.c2, false);
  // glass backboard (drawn slightly turned toward the camera)
  const dy = h.dy * 0.4, corner = (zc, yc) => { const [x, y] = P(h.bbx, yc + dy, h.z + zc); return [x - zc * 0.42 * h.dir, y]; };
  const c = [corner(-46, RIM_Y - 12), corner(46, RIM_Y - 12), corner(46, RIM_Y + 56), corner(-46, RIM_Y + 56)];
  const glass = g.createLinearGradient(c[0][0], c[0][1], c[2][0], c[2][1]);
  glass.addColorStop(0, 'rgba(230,244,255,0.45)'); glass.addColorStop(0.48, 'rgba(134,184,214,0.16)'); glass.addColorStop(1, 'rgba(20,50,78,0.3)');
  g.fillStyle = glass; g.strokeStyle = '#f4f7fb'; g.lineWidth = 3;
  g.beginPath(); c.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); g.stroke();
  g.save(); g.globalAlpha = 0.65; g.strokeStyle = '#ffffff'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(...c[0]); g.lineTo(...c[1]); g.lineTo(...c[2]); g.stroke(); g.restore();
  const s = [corner(-16, RIM_Y + 2), corner(16, RIM_Y + 2), corner(16, RIM_Y + 26), corner(-16, RIM_Y + 26)];
  g.lineWidth = 2; g.beginPath(); s.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.stroke();
  // rim back half
  const [rx, ry] = P(h.x, RIM_Y + h.dy, h.z);
  g.strokeStyle = '#b23c16'; g.lineWidth = 3; g.beginPath(); g.ellipse(rx, ry, RIM_R + 1, (RIM_R + 1) * 0.5, 0, Math.PI, Math.PI * 2); g.stroke();
}
function drawHoopFront(g, h, U) {
  const oldNet = M.gym && !(U || gymUp()).hoops;
  // Board pad, lower metal lip and fasteners; shared by glass and community boards.
  const b0 = P(h.bbx, RIM_Y - 12 + h.dy * 0.4, h.z - 46), b1 = P(h.bbx, RIM_Y - 12 + h.dy * 0.4, h.z + 46);
  b0[0] += 46 * 0.42 * h.dir; b1[0] -= 46 * 0.42 * h.dir;
  g.strokeStyle = '#233c48'; g.lineWidth = 5; g.beginPath(); g.moveTo(...b0); g.lineTo(...b1); g.stroke();
  g.strokeStyle = '#9eb8bb'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(b0[0], b0[1] - 2); g.lineTo(b1[0], b1[1] - 2); g.stroke();
  for (let side = 0; side < 2; side++) {
    g.strokeStyle = oldNet ? 'rgba(190,180,160,0.8)' : side ? 'rgba(255,248,224,0.9)' : 'rgba(161,183,190,0.6)'; g.lineWidth = side ? 1.15 : 0.9; g.beginPath();
    for (const l of h.links) { if (!l.draw || (oldNet && (l.a % 5 === 2) && l.a > 40)) continue; const A = h.pts[l.a], B = h.pts[l.b]; if ((A.z + B.z >= h.z * 2 ? 1 : 0) !== side) continue; g.moveTo(...P(A.x, A.y, A.z)); g.lineTo(...P(B.x, B.y, B.z)); }
    g.stroke();
  }
  const [rx, ry] = P(h.x, RIM_Y + h.dy, h.z);
  g.strokeStyle = '#e2572b'; g.lineWidth = 3.2; g.beginPath(); g.ellipse(rx, ry, RIM_R + 1, (RIM_R + 1) * 0.5, 0, 0, Math.PI); g.stroke();
  g.strokeStyle = 'rgba(110,30,12,0.68)'; g.lineWidth = 1.25; g.beginPath(); g.ellipse(rx, ry + 1.6, RIM_R, RIM_R * 0.5, 0, 0, Math.PI); g.stroke();
  g.strokeStyle = '#ffb76d'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(rx, ry - 0.7, RIM_R, RIM_R * 0.5, 0, 0.28, 1.35); g.stroke();
}
// ---------------------------------------------------------------- CREST
function drawCrest(g, x, y, r, T) {
  g.save(); g.translate(x, y);
  g.fillStyle = T.c1; g.strokeStyle = T.c2; g.lineWidth = Math.max(1.5, r * 0.12);
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = T.c2; const k = r / 20;
  if (T.crest === 'dome') { g.beginPath(); g.arc(0, 2 * k, 9 * k, Math.PI, 0); g.fill(); g.fillRect(-10 * k, 2 * k, 20 * k, 7 * k); g.fillRect(-1 * k, -13 * k, 2 * k, 6 * k); }
  else if (T.crest === 'crescent') { g.beginPath(); g.arc(-1 * k, 0, 11 * k, 0, Math.PI * 2); g.fill(); g.fillStyle = T.c1; g.beginPath(); g.arc(4 * k, -2 * k, 9.5 * k, 0, Math.PI * 2); g.fill(); g.fillStyle = T.c2; star8(g, 9 * k, -4 * k, 3 * k); g.fill(); }
  else if (T.crest === 'star') { star8(g, 0, 0, 12 * k); g.fill(); g.fillStyle = T.c1; g.beginPath(); g.arc(0, 0, 4 * k, 0, Math.PI * 2); g.fill(); }
  else if (T.crest === 'arch') { g.beginPath(); g.moveTo(-9 * k, 11 * k); g.lineTo(-9 * k, 0); g.quadraticCurveTo(-8 * k, -9 * k, 0, -13 * k); g.quadraticCurveTo(8 * k, -9 * k, 9 * k, 0); g.lineTo(9 * k, 11 * k); g.closePath(); g.fill(); g.fillStyle = T.c1; g.fillRect(-4 * k, 1 * k, 8 * k, 10 * k); }
  else { g.fillRect(-3 * k, -8 * k, 6 * k, 19 * k); g.beginPath(); g.moveTo(-5 * k, -8 * k); g.lineTo(0, -15 * k); g.lineTo(5 * k, -8 * k); g.fill(); g.fillRect(-5 * k, -2 * k, 10 * k, 2 * k); }
  g.restore();
}

// ---------------------------------------------------------------- SCENE
function drawScene(g, t) {
  withPlane(g, K_BACK, FLOOR_TOP, () => { if (M.gym) drawGymBack(g, t); else if (VL) drawVenueBack(g, t); else drawArena(g, t); });
  if (courtCv) drawFloorWarped(g, courtCv);
  withPlane(g, K_NEAR, NEAR_Y, () => { if (M.gym) drawGymNear(g); else if (VL) drawVenueNear(g); else drawNearSide(g); });
  if (broadcastOn() && cam.zoom < 1.2) {                // wide shots: the ground continues below the near side
    const v = VL && VL.spec; g.fillStyle = !v ? '#081716' : v.kind === 'outdoor' ? (v.backdrop === 'snow' ? '#dfe8f0' : v.backdrop === 'desert' ? '#d6b27a' : '#4f7a3a') : v.kind === 'arena' ? '#0a0d16' : '#3a2c1e';
    g.fillRect(-3000, NEAR_Y + NEAR_H - 12, 7000, 3000);
  }
  if (M.gym || (VL && VL.spec.kind === 'gym')) drawEndWalls(g);
  // career menus reuse the gym as a backdrop without the practice player
  drawHot(g);
  const menuBg = M.gym && Game.screen !== 'gym' && CAREER_SCREENS.has(Game.screen);
  const actors = menuBg ? [] : M.players, showBall = !menuBg;
  drawReflections(g, actors);
  M._coach = actors;
  for (const p of actors) drawShadow(g, p.x, p.y, p.z, 18);
  if (View.depth && (!M.gym || M.practice)) for (const p of actors) drawTeamRing(g, p);   // team-colored floor rings: who is where, at a glance
  if (View.depth && showBall) drawDepthAids(g, actors);
  if (M.balls) { if (showBall) for (const st of M.balls) if (!st.owner && st.x > -500) drawShadow(g, st.x, st.y, st.z, 8); }
  else if (!ball.owner && showBall) drawShadow(g, ball.x, ball.y, ball.z, 8);
  // Contact glyphs sit behind the ball, hoop and players, never over their silhouettes.
  for (const q of FX.parts) if (q.kind === 'cue') drawPlayCue(g, q);
  const E = [];
  for (const h of hoops) { if (M.gym && h.idx === 0) continue; E.push({ z: h.z - 30, f: () => drawHoopBack(g, h) }); E.push({ z: h.z + 12, f: () => drawHoopFront(g, h) }); }
  if (M.drawExtras) M.drawExtras(E, g);
  if (M.gym && !gymUp().lights) E.push({ z: 1e9, f: () => { g.fillStyle = 'rgba(40,50,25,0.08)'; g.fillRect(0, 0, W, H); } });
  if (actors.length && View.depth === 2) E.push({ z: 1e9 + 1, f: () => drawDepthHaze(g) });   // grading: Full only
  for (const p of actors) E.push({ z: p.z + (p.state === 'dunk' || p.state === 'hang' ? 20 : 0), f: () => withPlayerBall(p, () => drawPlayer(g, p)) });
  if (M.balls) { if (showBall) for (const st of M.balls) if (!st.owner && st.x > -500) E.push({ z: st.z + 1, f: () => withBall(st, () => drawBall(g)) }); }
  else if (!ball.owner && showBall) E.push({ z: ball.z + 1, f: () => drawBall(g) });
  E.sort((a, b) => a.z - b.z).forEach(e => e.f());
  for (const p of M._coach || []) if (p.coach) drawCoach(g, p);
  if (VL && !M.gym) drawVenueOverlay(g, t);           // venue lighting, weather, vignette
  // particles
  for (const q of FX.parts) {
    if (q.kind === 'cue') continue;
    const [sx, sy] = P(q.x, q.y, q.z), k = 1 - q.t / q.life;
    if (q.kind === 'ring') { const r = (q.size + (1 - k) * 42) * depthK(q.z); g.save(); g.globalAlpha = k * 0.72; g.strokeStyle = q.color; g.lineWidth = Math.max(1, 3 * k); g.beginPath(); g.ellipse(sx, sy, r, r * ZS, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
    else if (q.kind === 'fire') { g.fillStyle = `rgba(255,${120 + 100 * k | 0},40,${k * 0.8})`; g.beginPath(); g.arc(sx, sy, q.size * k + 1, 0, Math.PI * 2); g.fill(); }
    else if (q.kind === 'dust') { g.fillStyle = q.color + (0.35 * k) + ')'; g.beginPath(); g.ellipse(sx, sy, q.size * (2 - k), q.size * 0.5, 0, 0, Math.PI * 2); g.fill(); }
    else if (q.kind === 'confetti') { g.save(); g.translate(sx, sy); g.rotate(q.rot); g.fillStyle = q.color; g.globalAlpha = Math.min(1, k * 2); g.fillRect(-q.size, -q.size * 0.5, q.size * 2, q.size); g.restore(); }
    else { g.fillStyle = q.color; g.globalAlpha = k; if (q.kind === 'star') { star8(g, sx, sy, q.size + 1); g.fill(); } else g.fillRect(sx - q.size / 2, sy - q.size / 2, q.size, q.size); g.globalAlpha = 1; }
  }
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (const q of FX.pops) {
    const [sx, sy] = P(q.x, q.y, q.z); g.globalAlpha = clamp(1.6 - q.t * 1.5, 0, 1);
    { const k = 1 / Math.max(1, (broadcastOn() ? cam.zoom : 1) * 0.85); g.save(); g.translate(sx, sy); g.scale(k, k); drawTextSprite(g, textSprite(q.text, 17, q.color, '#1a1210', 3.5), 0, 0); g.restore(); }
    g.globalAlpha = 1;
  }
  if (FX.flashA > 0) { g.fillStyle = `rgba(255,245,210,${FX.flashA * 0.25})`; g.fillRect(-2000, -2000, 6000, 6000); }   // barely-there warmth, no white flash
}

// ------------------------------------------------------------------ HUD
function fmtClock(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
function drawCalloutsOnly(g) {
  for (const c of FX.calls.slice(0, 1)) {
    if (c.t < 0) continue;
    // gentle ease-in (no bounce), fade out
    const t = c.t, e = Math.min(1, t / 0.14), s = 0.9 + 0.1 * (1 - Math.pow(1 - e, 3));
    const a = Math.min(e * 1.4, t > c.life - 0.25 ? (c.life - t) / 0.25 : 1);
    const cx = W / 2, cy = Math.round(H * 0.2);                   // always centered, upper third
    g.save(); g.globalAlpha = clamp(a, 0, 1); g.translate(cx, cy); g.scale(s, s);
    drawTextSprite(g, textSprite(c.text, 36, c.color, '#140c06', 7), 0, 0);
    if (c.sub) drawTextSprite(g, textSprite(c.sub, 17, '#ffffff', '#140c06', 4.5), 0, 26);
    g.restore();
  }
}
function fitText(g, t, w) { if (g.measureText(t).width <= w) return t; while (t.length > 3 && g.measureText(t + '\u2026').width > w) t = t.slice(0, -1); return t + '\u2026'; }
function meter(g, x, y, w, h, k, col) {
  g.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(g, x, y, w, h, h / 2); g.fill();
  if (k > 0.01) { g.fillStyle = col; roundRect(g, x, y, Math.max(h, w * clamp(k, 0, 1)), h, h / 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)'; roundRect(g, x + 2, y + 1, Math.max(0, w * clamp(k, 0, 1) - 4), Math.max(1, h * 0.3), h * 0.15); g.fill(); }
}
// Scoreboard: team blocks (accent, crest, name, score) around a clock block,
// shot clock pill below; turbo/hifz meters as rounded bars in compact cards.
function drawHUD(g) {
  if (M.mini) { drawMiniHUD(g); drawCalloutsOnly(g); if (Input.touchMode && !TouchUI.shown && !M.attract) drawTouch(g); return; }
  // compact scoreboard in the top-left corner, clear of jumbotrons, scenery and wall signs (bigger on phones)
  const hk = baseZoom() > 1.6 ? 1.25 : 1; g.save(); g.scale(hk, hk);
  const [A, B] = M.teams, x0 = 10, top = 8, bw = 318, bh = 40;
  g.fillStyle = 'rgba(8,14,22,0.82)'; roundRect(g, x0, top, bw, bh, 11); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.stroke();
  for (const [i, T] of [[0, A], [1, B]]) {
    const bx = i ? x0 + bw - 116 : x0 + 6;
    g.fillStyle = T.def.c1; roundRect(g, i ? x0 + bw - 9 : x0 + 5, top + 8, 4, bh - 16, 2); g.fill();
    drawCrest(g, i ? bx + 94 : bx + 20, top + bh / 2, 10, T.def);
    g.textAlign = i ? 'right' : 'left'; g.fillStyle = 'rgba(246,236,210,0.85)'; g.font = `10px ${FONT}`; g.fillText(T.def.short, i ? bx + 78 : bx + 36, top + 17);
    g.fillStyle = '#fff'; g.font = `20px ${FONT}`; g.fillText(String(T.score), i ? bx + 78 : bx + 36, top + 35);
    if (M.possTeam === i) { g.fillStyle = GOLD; g.beginPath(); g.arc(i ? bx + 50 : bx + 64, top + 29, 3, 0, Math.PI * 2); g.fill(); }
  }
  const cx = x0 + bw / 2;
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(cx - 42, top + 8, 1, bh - 16); g.fillRect(cx + 42, top + 8, 1, bh - 16);
  g.textAlign = 'center'; g.fillStyle = '#f2cf6b'; g.font = `9px ${FONT}`; g.fillText(periodLabel(M.quarter), cx, top + 16);
  g.fillStyle = '#ffffff'; g.font = `16px ${FONT}`; g.fillText(M.fmt.first21 ? 'TO ' + (M.fmt.target || 21) : fmtClock(M.clock), cx, top + 33);
  if (!M.practice && M.fmt.sc > 0) {
    const sc = Math.ceil(Math.max(0, M.shotClock)), hot = sc <= 5 && ball.owner;
    g.fillStyle = hot ? '#d62a2a' : 'rgba(8,14,22,0.82)'; roundRect(g, x0 + bw + 6, top + 9, 34, 22, 11); g.fill();
    g.strokeStyle = hot ? '#ff8a8a' : 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = hot ? '#ffffff' : '#ffd0c0'; g.font = `12px ${FONT}`; g.fillText(String(sc), x0 + bw + 23, top + 24);
  }
  for (const i of [0, 1]) {                                   // team fouls + bonus: shown only once they matter
    const tf = teamFouls(i), bonus = inBonus(i); if (tf < 3 && !bonus) continue;   // bonus = this team shoots free throws on every foul
    const txt = bonus ? (tf >= 3 ? 'BONUS \u2022 FOULS ' + tf : 'BONUS') : 'FOULS ' + tf;
    g.font = `9px ${FONT}`; const w = g.measureText(txt).width + 16, bx = i ? x0 + bw - w - 6 : x0 + 6;
    g.fillStyle = bonus ? 'rgba(242,207,107,0.92)' : 'rgba(8,14,22,0.78)'; roundRect(g, bx, top + bh + 3, w, 15, 7); g.fill();
    g.fillStyle = bonus ? NIGHT : '#cfd8e3'; g.textAlign = 'center'; g.fillText(txt, bx + w / 2, top + bh + 14);
  }
  if (M.double) { g.fillStyle = 'rgba(40,30,90,0.9)'; roundRect(g, x0, top + bh + 4, 156, 18, 9); g.fill(); g.fillStyle = '#ffe38a'; g.font = `10px ${FONT}`; g.fillText('LAYLATUL QADR \u00d7 2', x0 + 78, top + bh + 17); }
  g.restore();
  if (M.ft) drawFtBanner(g);
  // player cards
  let slot = 0;
  g.save(); g.translate(0, H); g.scale(hk, hk); g.translate(0, -H);
  for (const p of M.players) {
    if (p.human < 0 || M.attract) continue;
    // card rows: name (+ status) / TURBO label + bar / NOOR label + bar: nothing shares a line
    const noor = p.def.huffath, ch = noor ? 66 : 54, tui = TouchUI.shown && !TouchUI.portrait;   // v6: + poise row
    const x = tui ? W / hk - 236 - 8 : 12 + slot * 236, y = tui ? H - H / hk + 50 + slot * (ch + 6) : H - ch - 8; slot++;   // touch landscape: cards top-right, clear of the stick (in the scaled HUD space)
    g.fillStyle = 'rgba(8,14,22,0.82)'; roundRect(g, x, y, 224, ch, 11); g.fill();
    g.fillStyle = p.human === 0 ? '#ff7a7a' : '#6ab8ff'; roundRect(g, x + 8, y + 8, 4, ch - 16, 2); g.fill();
    g.font = `12px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(fitText(g, p.def.name.toUpperCase(), 120), x + 20, y + 17);
    if (p.fire) { g.fillStyle = '#ff8a2a'; g.textAlign = 'right'; g.font = `10px ${FONT}`; g.fillText('ON FIRE', x + 214, y + 17); }
    else if (p.boost > 0) { g.fillStyle = '#ffe38a'; g.textAlign = 'right'; g.font = `10px ${FONT}`; g.fillText('NOOR ACTIVE', x + 214, y + 17); }
    else if ((p.fat || 0) > 0.7) { g.fillStyle = '#ffb08a'; g.textAlign = 'right'; g.font = `10px ${FONT}`; g.fillText('WINDED', x + 214, y + 17); }
    else { const badge=isMine(p)&&selectedRunBadge(); if(badge){g.fillStyle=badge.color;g.textAlign='right';g.font=`8px ${FONT}`;g.fillText(fitText(g,badge.name.toUpperCase(),72),x+214,y+17);} }
    g.fillStyle = '#9fb3c8'; g.font = `9px ${FONT}`; g.textAlign = 'left'; g.fillText('TURBO', x + 20, y + 32);
    const sprinting = p.cmd.turbo && Math.hypot(p.vx || 0, p.vz || 0) > 60 && p.turboOK && p.turboOK();
    if (sprinting) { g.save(); g.shadowColor = '#8fe3ff'; g.shadowBlur = 10; g.fillStyle = 'rgba(143,227,255,0.35)'; roundRect(g, x + 61, y + 22, 156, 14, 7); g.fill(); g.restore(); }   // v7: sprint glow
    meter(g, x + 64, y + 25, 150, 8, p.fire ? 1 : p.turbo / 100, p.fire ? '#ff8a2a' : sprinting ? '#bff0ff' : '#4fc3ff');
    if (noor) { g.fillStyle = '#9fb3c8'; g.fillText('NOOR', x + 20, y + 45); meter(g, x + 64, y + 39, 150, 6, p.boost > 0 ? p.boost / 12 : p.hifz / 100, p.boost > 0 ? '#ffe38a' : '#57d68d'); }
    drawCompRow(g, p, x, y + ch - 16, y);
  }
  g.restore();
  drawCalloutsOnly(g);
  if (M.phase === 'break' && (Game.screen === 'play' || Game.screen === 'netplay') && M.breakText !== 'HALFTIME') banner(g, M.breakText, '');
  if (Input.touchMode && !TouchUI.shown && !M.attract) drawTouch(g);
}
function banner(g, a, b) {
  g.fillStyle = 'rgba(8,16,24,0.8)'; g.fillRect(-400, H / 2 - 48, W + 800, 96);
  g.fillStyle = GOLD; g.fillRect(-400, H / 2 - 48, W + 800, 2); g.fillRect(-400, H / 2 + 46, W + 800, 2);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `40px ${FONT}`; g.fillText(a, W / 2, H / 2 + (b ? 2 : 14));
  if (b) { g.font = `16px ${BODY}`; g.fillStyle = IVORY; g.fillText(b, W / 2, H / 2 + 30); }
}
function drawTouch(g) {
  for (const b of TOUCH_BTNS) {
    g.fillStyle = Input.down[b.key] ? 'rgba(232,195,90,0.55)' : 'rgba(255,255,255,0.14)';
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#fff'; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText(b.label, b.x, b.y + 4);
  }
  const s = Input.stick;
  if (s.id != null) {
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.beginPath(); g.arc(s.ox, s.oy, 50, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(s.ox + s.ax * 50, s.oy + s.az * 50, 20, 0, Math.PI * 2); g.fill();
  }
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

