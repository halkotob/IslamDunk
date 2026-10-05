let VL = null;                 // layers of the venue in use (null = classic arena or practice gym)
let SHADOW = { dx: 0, sx: 1, a: 1 };
function setVenue(v, tA, tB, reuse) {
  M.venue = v || null;
  if (!v || v.kind === 'classic') { VL = null; SHADOW = { dx: 0, sx: 1, a: 1 }; SFX.setCrowdLevel(v ? 1 : 1); return; }
  VL = reuse && reuse.spec === v ? reuse : buildVenueLayers(v, tA, tB);
  courtCv = VL.floor; SHADOW = VL.shadow;
  SFX.setCrowdLevel(v.level != null ? v.level : v.kind === 'arena' ? ARENAS[v.tier].level : v.kind === 'gym' ? ({ home: 0.3, S: 0.32, M: 0.5, L: 0.6 })[v.size] : 0.35);
}
function layerCanvas(w, h, paint) { const c = makeCanvas(w, h), g = c.getContext('2d'); paint(g); return c; }
function buildVenueLayers(v, tA, tB, opts = {}) {
  const host = venueHost(v, tA, tB), L = { spec: v, host, tA, tB }, rs = opts.rs || cacheRS(); L.rs = rs;
  const R = seededRng(hash32(v.id + host.name + (v.time || '')));
  L.shadow = v.kind === 'outdoor' ? ({ afternoon: { dx: 7, sx: 1.15, a: 1 }, sunset: { dx: 28, sx: 1.9, a: 0.9 }, night: { dx: 0, sx: 1.05, a: 1.25 } })[v.time] : { dx: 0, sx: 1, a: 1 };
  if (v.kind === 'outdoor') buildOutdoorLayers(L, v, host, R, rs);
  L.bg = hiCanvas(BGW, FLOOR_TOP, rs, g => { paintBg(g, v, host, R); paintVenueIdentity(g, v, host); });
  L.floor = buildVenueFloor(v, host, tA, tB, rs);
  L.near = hiCanvas(BGW, NEAR_H, Math.min(rs, 1.5), g => paintNear(g, v, host, R));
  L.crowd = buildCrowdMembers(v, R);
  L.bigCrowd = L.crowd.length > 60;                                   // small crowds are drawn live (sharper, cheap)
  if (L.bigCrowd) L.crowdCv = hiCanvas(BGW, FLOOR_TOP, rs, g => { for (const m of L.crowd) drawCrowdMember(g, m, m.x, m.y, 0, 0); });
  if (v.kind === 'arena' || (v.kind === 'outdoor' && v.time === 'night')) L.vignette = layerCanvas(512, 288, g => {
    const gr = g.createRadialGradient(256, 170, 60, 256, 170, 330); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, v.kind === 'arena' ? 'rgba(0,0,10,0.45)' : 'rgba(0,5,20,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
  });
  L.snow = v.backdrop === 'snow' ? Array.from({ length: 70 }, () => ({ x: R() * 1400, y: R() * H, s: 1 + R() * 2, v: 20 + R() * 30 })) : null;
  return L;
}
// ------------------------------------------------------------- BACKDROPS
function skyGrad(g, time, h) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  const c = { afternoon: ['#5fa8dc', '#cfe8f5'], sunset: ['#2e2b62', '#f08a4b', '#f6c26b'], night: ['#060b1e', '#1b2748'] }[time] || ['#5fa8dc', '#cfe8f5'];
  c.forEach((col, i) => gr.addColorStop(i / (c.length - 1), col)); return gr;
}
function pine(g, x, y, s, night, dark) { g.fillStyle = night ? '#0e1a1a' : dark ? '#2f5a3a' : '#2c5a44'; g.beginPath(); g.moveTo(x, y - 46 * s); g.lineTo(x + 14 * s, y); g.lineTo(x - 14 * s, y); g.fill(); if (!dark && !night) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(x, y - 46 * s); g.lineTo(x + 6 * s, y - 30 * s); g.lineTo(x - 6 * s, y - 30 * s); g.fill(); } }
function palm(g, x, y, s, night) {
  g.strokeStyle = night ? '#141418' : '#6b4a2b'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6 * s, y - 30 * s, x + 2 * s, y - 56 * s); g.stroke();
  g.fillStyle = night ? '#111a16' : '#2f7a3a';
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; g.beginPath(); g.ellipse(x + 2 * s + Math.cos(a) * 14 * s, y - 56 * s + Math.sin(a) * 6 * s + 4 * s, 16 * s, 4 * s, a, 0, Math.PI * 2); g.fill(); }
}
// ------------------------------------------------------ WALLS / STANDS
function paintBg(g, v, host, R) {
  const X = wx => wx - BG_X0, W2 = BGW, T = FLOOR_TOP;
  if (v.kind === 'gym' && v.size === 'home') {             // the real Al-Amanah gym, with its upgrades
    const cx = cam.x, sx = FX.sx, sy = FX.sy, w = W; cam.x = BG_X0; FX.sx = 0; FX.sy = 0; W = BGW;
    try { drawGymBack(g, 0, gymUp()); } finally { cam.x = cx; FX.sx = sx; FX.sy = sy; W = w; }
    return;
  }
  if (v.kind === 'gym') {
    const low = v.size === 'S', ceil = low ? 58 : 34;
    g.fillStyle = low ? '#d9d6cc' : '#474d56'; g.fillRect(0, 0, W2, ceil);
    if (low) { g.strokeStyle = 'rgba(0,0,0,0.08)'; for (let x = 0; x < W2; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ceil); g.stroke(); } for (let y = 0; y < ceil; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W2, y); g.stroke(); } }
    else { g.strokeStyle = '#353a42'; g.lineWidth = 2; for (let x = 0; x < W2; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 35, ceil); g.lineTo(x + 70, 0); g.stroke(); } }
    for (let x = 60; x < W2; x += 190) lightFixture(g, x + 45, low ? 44 : 22, 84, 1);
    g.fillStyle = low ? '#e6dcc8' : v.size === 'M' ? '#d4ccb8' : '#dcd6c8'; g.fillRect(0, ceil, W2, T - ceil);
    g.strokeStyle = 'rgba(110,90,60,0.14)'; g.lineWidth = 1;
    for (let y = ceil; y < T; y += 13) { g.beginPath(); g.moveTo(0, y); g.lineTo(W2, y); g.stroke(); }
    g.fillStyle = host.c1; g.fillRect(0, low ? 118 : 98, W2, low ? 6 : 8); g.fillStyle = host.c2; g.fillRect(0, (low ? 118 : 98) + (low ? 6 : 8), W2, 2);
    if (low) {                                              // multipurpose room: windows, posters, stacked tables
      for (let x = 40; x < W2; x += 240) { g.fillStyle = '#9fc2d8'; g.fillRect(x, 70, 70, 34); g.strokeStyle = '#f4f1e8'; g.lineWidth = 4; g.strokeRect(x, 70, 70, 34); }
      for (const tx of [X(-60), X(1380)]) for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#9a8f7c' : '#8a806d'; g.fillRect(tx + i * 6, T - 60 + i * 2, 40, 5); }
    }
    if (v.size !== 'S') {                                   // pull-out bleachers
      const rows = v.size === 'M' ? 3 : 5, x0 = X(120), x1 = X(1200);
      for (let r = 0; r < rows; r++) { const y = T - 10 - r * 16; g.fillStyle = r % 2 ? '#a57a4a' : '#b8885a'; g.fillRect(x0 + r * 10, y - 4, x1 - x0 - r * 20, 6); g.fillStyle = '#6b4a2b'; g.fillRect(x0 + r * 10, y + 2, x1 - x0 - r * 20, 3); }
      g.fillStyle = '#7b8794'; for (let x = x0; x < x1; x += 120) g.fillRect(x, T - 10 - rows * 16, 3, rows * 16);
    }
    if (v.size === 'L') {                                   // community center: hanging banners
      for (let i = 0; i < 8; i++) { const x = X(60 + i * 180); g.fillStyle = i % 2 ? host.c1 : host.c2; g.fillRect(x, 36, 34, 48); g.beginPath(); g.moveTo(x, 84); g.lineTo(x + 17, 96); g.lineTo(x + 34, 84); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; star8(g, x + 17, 58, 8); g.fill(); }
    }
    // host crest and welcome banner
    for (const cx of [X(260), X(1060)]) {
      const bw = 270, bx = cx - bw / 2, by = low ? 76 : 50;
      g.fillStyle = host.c1; roundRect(g, bx, by, bw, 24, 6); g.fill(); g.strokeStyle = host.c2; g.lineWidth = 2; g.stroke();
      g.fillStyle = host.c2; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText('WELCOME TO ' + host.name.toUpperCase(), cx, by + 17);
      drawCrest(g, bx - 22, by + 12, 14, host);
    }
    g.fillStyle = '#4a4a4a'; g.fillRect(0, T - 7, W2, 7);
  } else if (v.kind === 'outdoor') {
    // chain-link fence along the far sideline, light poles
    const fy = 124, night = v.time === 'night';
    g.strokeStyle = night ? 'rgba(170,180,195,0.28)' : 'rgba(120,130,140,0.32)'; g.lineWidth = 0.9;
    for (let x = -T; x < W2; x += 9) { g.beginPath(); g.moveTo(x, fy); g.lineTo(x + (T - fy), T); g.moveTo(x + (T - fy), fy); g.lineTo(x, T); g.stroke(); }
    g.fillStyle = night ? 'rgba(106,116,130,0.8)' : 'rgba(138,147,156,0.85)'; g.fillRect(0, fy - 2, W2, 3); for (let x = 20; x < W2; x += 160) g.fillRect(x, fy - 2, 3, T - fy + 2);
    for (const wx of [-60, 1380]) {
      const x = X(wx); g.fillStyle = '#4a5058'; g.fillRect(x - 3, 4, 6, T); g.fillStyle = '#6a7078'; g.fillRect(x - 22, 4, 44, 10);
      if (night) { const gr = g.createRadialGradient(x, 14, 2, x, 14, 90); gr.addColorStop(0, 'rgba(255,248,210,0.9)'); gr.addColorStop(1, 'rgba(255,248,210,0)'); g.fillStyle = gr; g.fillRect(x - 90, 0, 180, 110); }
    }
    if (v.backdrop === 'snow') { g.fillStyle = night ? '#3a4a62' : '#f4f8fc'; g.beginPath(); g.moveTo(0, T); for (let x = 0; x <= W2; x += 40) g.lineTo(x, T - 6 - 5 * Math.abs(Math.sin(x * 0.03))); g.lineTo(W2, T); g.fill(); }
  } else {                                                  // arenas: roof, tiers of seats, ribbon boards, banners
    const A = ARENAS[v.tier], rows = A.rows;
    g.fillStyle = '#0a0d16'; g.fillRect(0, 0, W2, T);
    g.strokeStyle = 'rgba(120,130,150,0.25)'; g.lineWidth = 1.5; for (let x = 0; x < W2; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 26); g.lineTo(x + 80, 0); g.stroke(); }
    if (v.tier === 'grand') { g.strokeStyle = 'rgba(242,207,107,0.5)'; g.lineWidth = 2; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(W2 / 2, 120, 200 + k * 140, 110, 0, Math.PI, Math.PI * 2); g.stroke(); } }
    for (let x = 40; x < W2; x += 160) { g.fillStyle = 'rgba(255,255,240,0.9)'; g.fillRect(x, 4, 24, 5); }
    const top = 40, rowH = (T - 18 - top) / rows;
    for (let r = 0; r < rows; r++) { const y = top + r * rowH; g.fillStyle = r % 2 ? lerpColor(A.c1, '#000000', 0.45) : lerpColor(A.c1, '#000000', 0.3); g.fillRect(0, y, W2, rowH); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y + rowH - 2, W2, 2); g.fillStyle = 'rgba(227,215,181,0.12)'; g.fillRect(0, y, W2, 0.7); }
    g.fillStyle = 'rgba(0,0,0,0.5)'; for (let x = 0; x < W2; x += 230) g.fillRect(x, top, 10, T - top - 18);            // aisles
    // ribbon LED board at the front of the stands
    g.fillStyle = '#05070c'; g.fillRect(0, T - 18, W2, 14);
    g.fillStyle = A.c2; g.font = `10px ${FONT}`; g.textAlign = 'left';
    { const txt = A.banner + '  \u2022  ' + A.name.toUpperCase() + '  \u2022  ', tw = g.measureText(txt).width; for (let x = 10; x < W2; x += tw) g.fillText(txt, x, T - 8); }
    // banners / flags hanging from the roof
    if (v.tier === 'intl' || v.tier === 'grand') {
      const cols = [['#c0392b', '#fff', '#27ae60'], ['#1e5a4a', '#fff', '#1e5a4a'], ['#2e86de', '#f1c40f', '#2e86de'], ['#111', '#e8c35a', '#111'], ['#8e2b3a', '#fff', '#8e2b3a'], ['#27ae60', '#fff', '#c0392b']];
      for (let i = 0; i < 14; i++) { const x = 30 + i * 118, c = cols[i % cols.length]; for (let k = 0; k < 3; k++) { g.fillStyle = c[k]; g.fillRect(x, 12 + k * 7, 34, 7); } }
    } else for (let i = 0; i < 10; i++) { const x = 40 + i * 160; g.fillStyle = i % 2 ? A.c1 : A.c2; g.fillRect(x, 10, 26, 26); g.fillStyle = i % 2 ? A.c2 : A.c1; star8(g, x + 13, 23, 7); g.fill(); }
  }
}
function paintNear(g, v, host, R) {
  const W2 = BGW;
  if (v.kind === 'outdoor') {
    g.fillStyle = v.backdrop === 'snow' ? '#dfe8f0' : v.backdrop === 'desert' ? '#d6b27a' : '#4f7a3a'; g.fillRect(0, 0, W2, NEAR_H);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 160; i++) g.fillRect(R() * W2, R() * NEAR_H, 2, 2);
  } else if (v.kind === 'arena') {
    const A = ARENAS[v.tier];
    g.fillStyle = '#0a0d16'; g.fillRect(0, 0, W2, NEAR_H); g.fillStyle = '#05070c'; g.fillRect(0, 0, W2, 18);
    g.fillStyle = A.c2; g.font = `10px ${FONT}`; g.textAlign = 'left'; { const txt = A.banner + '   \u2022   ', tw = g.measureText(txt).width; for (let x = 10; x < W2; x += tw) g.fillText(txt, x, 12); }
    for (let r = 0; r < 3; r++) { g.fillStyle = r % 2 ? lerpColor(A.c1, '#000000', 0.5) : lerpColor(A.c1, '#000000', 0.35); g.fillRect(0, 22 + r * 24, W2, 24); }
  } else {
    const grd = g.createLinearGradient(0, 0, 0, NEAR_H); grd.addColorStop(0, '#b8915c'); grd.addColorStop(1, '#3a2c1e'); g.fillStyle = grd; g.fillRect(0, 0, W2, NEAR_H);
  }
}
// ----------------------------------------------------------------- FLOORS
function drawCourtLines(g, X, Z, col, keyL, keyR, keyAlpha = 0.82) {
  for (const [x0, c] of [[0, keyL], [1054, keyR]]) { g.globalAlpha = keyAlpha; g.fillStyle = c; g.fillRect(X(x0), Z(238), 266, Z(224)); g.globalAlpha = 1; }
  g.strokeStyle = col; g.lineWidth = 2.4;
  g.strokeRect(X(0), Z(26), COURT.L, Z(648));
  g.beginPath(); g.moveTo(X(660), Z(26)); g.lineTo(X(660), Z(674)); g.stroke();
  g.beginPath(); g.ellipse(X(660), Z(350), 84, 84 * ZS, 0, 0, Math.PI * 2); g.stroke();
  for (const h of hoops) {
    const bx = h.dir > 0 ? 0 : COURT.L, kx = h.dir > 0 ? 266 : 1054;
    g.strokeRect(X(Math.min(bx, kx)), Z(238), 266, Z(224));
    g.beginPath(); g.ellipse(X(kx), Z(350), 84, 84 * ZS, 0, 0, Math.PI * 2); g.stroke();
    const a = Math.asin(300 / THREE_R), cx = h.x + h.dir * Math.cos(a) * THREE_R;
    g.beginPath(); if (h.dir > 0) g.ellipse(X(h.x), Z(h.z), THREE_R, THREE_R * ZS, 0, -a, a); else g.ellipse(X(h.x), Z(h.z), THREE_R, THREE_R * ZS, 0, Math.PI - a, Math.PI + a); g.stroke();
    g.beginPath(); g.moveTo(X(bx), Z(50)); g.lineTo(X(cx), Z(50)); g.moveTo(X(bx), Z(650)); g.lineTo(X(cx), Z(650)); g.stroke();
  }
}
function floorCrest(g, x, y, r, T) { g.save(); g.translate(x, y); g.scale(1, ZS * 1.05); drawCrest(g, 0, 0, r, T); g.restore(); }
// Static venue accents are painted once into each existing offscreen layer.
function paintVenueIdentity(g, v, host) {
  g.save();
  const X = x => x - BG_X0, community = v.kind === 'gym', outdoor = v.kind === 'outdoor';
  if (community) {
    const small = v.size === 'S' || v.size === 'home';
    for (let i = 0; i < 2; i++) {
      const x = X(i ? 1370 : -50), y = small ? 76 : 70;
      g.fillStyle = '#795b3c'; g.fillRect(x - 34, y - 3, 68, 68); g.fillStyle = '#e9d5a7'; g.fillRect(x - 31, y, 62, 62);
      g.fillStyle = host.c1; g.textAlign = 'center'; g.font = `8px ${FONT}`; g.fillText('COMMUNITY', x, y + 13); g.fillText('LEAGUE NIGHT', x, y + 24);
      g.strokeStyle = 'rgba(100,70,35,0.28)'; g.lineWidth = 1; for (let r = 0; r < 3; r++) { g.beginPath(); g.moveTo(x - 23, y + 35 + r * 7); g.lineTo(x + 23, y + 35 + r * 7); g.stroke(); }
    }
    // Warm wall sconces frame a community sports hall, not a sacred interior.
    for (let x = X(0); x <= X(COURT.L); x += 660) { g.globalAlpha = 0.18; g.drawImage(lanternGlow(), x - 30, 64, 60, 60); g.globalAlpha = 1; g.fillStyle = '#c7a66a'; g.fillRect(x - 3, 87, 6, 10); }
  } else if (outdoor) {
    g.strokeStyle = '#b6a07a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 120); g.quadraticCurveTo(BGW / 2, 136, BGW, 120); g.stroke();
    for (let x = 60, i = 0; x < BGW; x += 100, i++) { const y = 120 + Math.sin(x / BGW * Math.PI) * 8; g.fillStyle = i % 2 ? host.c1 : host.c2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y); g.lineTo(x + 9, y + 18); g.closePath(); g.fill(); }
  } else {
    const A = ARENAS[v.tier], premium = v.tier === 'intl' || v.tier === 'grand';
    g.strokeStyle = premium ? 'rgba(234,204,137,0.38)' : 'rgba(166,192,217,0.18)'; g.lineWidth = premium ? 1.7 : 1;
    for (let x = 0; x < BGW; x += 230) { g.beginPath(); g.moveTo(x + 14, 39); g.quadraticCurveTo(x + 18, 17, x + 115, 3); g.quadraticCurveTo(x + 212, 17, x + 216, 39); g.stroke(); }
    if (premium) for (let x = 115; x < BGW; x += 230) { g.globalAlpha = 0.16; g.drawImage(lanternGlow(), x - 32, -20, 64, 64); g.globalAlpha = 1; g.fillStyle = A.c2; star8(g, x, 16, 4); g.fill(); }
  }
  g.restore();
}
function finishCourtMaterial(g, X, Z, v, tA, tB, R) {
  const tile = v.kind === 'gym' && v.size === 'S', outdoor = v.kind === 'outdoor';
  g.save(); g.beginPath(); g.rect(X(0), Z(2), COURT.L, Z(COURT.D - 4)); g.clip();
  // Fine, matte variation: no bright varnish band or enlarged reflections.
  g.lineWidth = 0.55; g.strokeStyle = outdoor ? 'rgba(235,238,229,0.035)' : 'rgba(72,41,21,0.045)'; g.beginPath();
  for (let i = 0; i < (tile ? 90 : 180); i++) { const x = R() * COURT.L, z = 30 + R() * 640, len = tile ? 3 : 12 + R() * 48; g.moveTo(X(x), Z(z)); g.lineTo(X(x + len), Z(z + (R() - 0.5) * 1.3)); }
  g.stroke();
  if (tile) { g.strokeStyle = 'rgba(80,70,50,0.09)'; g.beginPath(); for (let x = 0; x < COURT.L; x += 40) { g.moveTo(X(x), Z(0)); g.lineTo(X(x), Z(COURT.D)); } for (let z = 0; z < COURT.D; z += 40) { g.moveTo(X(0), Z(z)); g.lineTo(X(COURT.L), Z(z)); } g.stroke(); }
  // Team inlays outside the playable boundary leave the ball's path uncluttered.
  for (let i = 0; i < 2; i++) { const T = i ? tB : tA; g.globalAlpha = outdoor ? 0.5 : 0.72; g.fillStyle = T.c1; g.fillRect(X(i * 660 + 16), Z(9), 628, Z(6)); g.fillRect(X(i * 660 + 16), Z(685), 628, Z(6)); g.fillStyle = T.c2; g.fillRect(X(i * 660 + 16), Z(16), 628, Z(1.5)); }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(35,27,18,0.10)'; g.lineWidth = 0.8; g.strokeRect(X(2), Z(28), COURT.L - 4, Z(644));
  // Sparse paint nicks never interrupt a complete boundary or scoring arc.
  g.fillStyle = 'rgba(90,67,42,0.16)'; for (let i = 0; i < (outdoor || tile ? 36 : 16); i++) { const x = 30 + R() * 1260; g.fillRect(X(x), Z(i % 2 ? 674 : 26), 0.8 + R() * 2, 0.6); }
  if (!outdoor) { const r = v.kind === 'arena' || v.kind === 'classic' ? 119 : 76; g.strokeStyle = v.kind === 'arena' ? 'rgba(216,191,130,0.28)' : 'rgba(83,62,35,0.12)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(X(660), Z(350), r, r * ZS, 0, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}
function buildVenueFloor(v, host, tA, tB, rs = 1) {
  const cw = COURT.L + 240, ch = Math.ceil(COURT.D * ZS) + 4, cv = makeCanvas(Math.ceil(cw * rs), Math.ceil(ch * rs)), g = cv.getContext('2d');
  g.scale(rs, rs); cv.rs = rs;
  const X = x => x + 120, Z = z => z * ZS, R = seededRng(hash32('floor' + v.id + host.name));
  const planks = (a, b, step = 16) => {
    const grd = g.createLinearGradient(0, 0, 0, ch); grd.addColorStop(0, a); grd.addColorStop(1, b); g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
    for (let z = 0, i = 0; z < COURT.D; z += step, i++) { g.fillStyle = i % 3 ? 'rgba(110,60,20,0.06)' : 'rgba(255,235,200,0.06)'; g.fillRect(0, Z(z), cw, Z(step)); g.fillStyle = 'rgba(80,40,10,0.2)'; g.fillRect(0, Z(z), cw, 0.8); for (let x = (i * 137) % 260; x < cw; x += 260) g.fillRect(x, Z(z), 1.5, Z(step)); }
  };
  if (v.kind === 'gym') {
    const home = v.size === 'home', U = gymUp(), fresh = home ? U.floor : v.size !== 'S';
    if (v.size === 'S') {                                // vinyl tile floor
      g.fillStyle = '#cfc4ae'; g.fillRect(0, 0, cw, ch);
      for (let x = 0; x < cw; x += 40) for (let z = 0; z < COURT.D; z += 40) if (((x + z) / 40) % 2) { g.fillStyle = 'rgba(120,100,70,0.12)'; g.fillRect(x, Z(z), 40, Z(40)); }
    } else planks(fresh ? '#c98e52' : '#c49c68', fresh ? '#e6b173' : '#dfbb86');
    if (!fresh || v.size === 'S') {                      // faint ghost lines from other sports
      g.strokeStyle = 'rgba(225,190,50,0.14)'; g.lineWidth = 1.6; g.strokeRect(X(200), Z(110), 920, Z(480));
      g.strokeStyle = 'rgba(40,130,80,0.12)'; g.strokeRect(X(360), Z(200), 600, Z(300));
    }
    floorWear(g, X, Z, R, fresh ? 0.5 : 1);
    if (fresh) bakeFloorLights(g, X, Z, cw, ch, true);
    const kc = home ? '#2c6e8f' : host.c1;
    drawCourtLines(g, X, Z, 'rgba(255,255,255,0.88)', kc, kc, home && !U.floor ? 0.55 : 0.75);
    if (home ? U.floor : true) floorCrest(g, X(660), Z(350), home ? 70 : 60, home ? MINI_TEAM : host);
  } else if (v.kind === 'outdoor') {
    const surf = v.surface, snow = v.backdrop === 'snow';
    g.fillStyle = '#3d4248'; g.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 2500; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; g.fillRect(R() * cw, R() * ch, 1.5, 1.5); }
    if (surf !== 'asphalt') { g.fillStyle = surf === 'green' ? '#3c7a55' : '#2f5f8f'; g.fillRect(X(0), Z(26), COURT.L, Z(648)); }
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 0.9;          // a few hairline cracks (matte surface)
    for (let i = 0; i < 8; i++) { let x = R() * cw, y = R() * ch; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += R() * 26 - 13; y += R() * 6 - 3; g.lineTo(x, y); } g.stroke(); }
    drawCourtLines(g, X, Z, surf === 'asphalt' ? 'rgba(250,250,240,0.8)' : 'rgba(255,255,255,0.9)', surf === 'asphalt' ? host.c1 : '#b8322d', surf === 'asphalt' ? host.c1 : '#b8322d', 0.7);
    floorCrest(g, X(660), Z(350), 44, host);
    if (snow) { g.fillStyle = 'rgba(245,250,255,0.9)'; for (let i = 0; i < 40; i++) { const edge = R() < 0.5; g.beginPath(); g.ellipse(edge ? R() * cw : (R() < 0.5 ? R() * 110 : cw - R() * 110), edge ? (R() < 0.5 ? R() * Z(22) : ch - R() * Z(22)) : R() * ch, 20 + R() * 40, 4 + R() * 5, 0, 0, Math.PI * 2); g.fill(); } }
  } else {
    const A = ARENAS[v.tier];
    g.fillStyle = '#0c0f16'; g.fillRect(0, 0, cw, ch);
    planks(A.wood[0], A.wood[1], 14); g.fillStyle = '#0c0f16'; g.fillRect(0, 0, X(0), ch); g.fillRect(X(COURT.L), 0, cw, ch);
    bakeFloorLights(g, X, Z, cw, ch, false);
    drawCourtLines(g, X, Z, 'rgba(255,255,255,0.95)', A.key, A.key, 0.9);
    // center logo
    g.save(); g.translate(X(660), Z(350)); g.scale(1, ZS);
    g.fillStyle = A.c1; g.beginPath(); g.arc(0, 0, 110, 0, Math.PI * 2); g.fill(); g.strokeStyle = A.c2; g.lineWidth = 4; g.stroke();
    g.fillStyle = A.c2; star8(g, 0, 0, 64, 1, 1, Math.PI / 8); g.fill(); g.fillStyle = A.c1; star8(g, 0, 0, 40); g.fill();
    g.fillStyle = A.c2; g.font = `18px ${FONT}`; g.textAlign = 'center'; g.fillText(v.tier === 'college' ? 'N' : '\u2605', 0, 7);
    g.restore();
    g.save(); g.font = `${A.banner.length > 22 ? 24 : 30}px ${FONT}`; g.textAlign = 'center'; g.globalAlpha = 0.45;
    for (const x of [330, 990]) { g.save(); g.translate(X(x), Z(610)); g.scale(1, 0.45); g.fillStyle = A.c2; g.fillText(A.banner, 0, 0); g.restore(); }
    g.restore();
  }
  finishCourtMaterial(g, X, Z, v, tA, tB, R);
  return cv;
}
// ----------------------------------------------------------------- CROWD
// Members are laid out in bg-layer coordinates (x = world x - BG_X0).
function buildCrowdMembers(v, R) {
  const out = [], add = (x, y, kind, s, extra) => out.push(Object.assign({ x, y, kind, s, seed: Math.floor(R() * 1e9), ph: R() * 6, phone: R() < 0.1 }, extra || {}));
  const n = v.crowd, X = wx => wx - BG_X0, T = FLOOR_TOP;
  const nearKids = (k) => { for (let i = 0; i < k; i++) add(X(80 + R() * 1160), NEAR_Y + 40 + R() * 26, 'back', 1.15 + R() * 0.2, { near: true }); };
  if (v.kind === 'gym' && (v.size === 'S' || v.size === 'home')) {
    const k = Math.min(n, 30), chairs = Math.ceil(k * 0.6);
    for (let i = 0; i < chairs; i++) add(X(110 + (i / Math.max(1, chairs - 1)) * 1100 + R() * 14), T - 4, R() < 0.35 ? 'uncle' : 'chair', 1.15);
    for (let i = 0; i < k - chairs; i++) add(X(80 + R() * 1160), T - 1, 'stand', 1.18 + R() * 0.1);
  } else if (v.kind === 'gym') {
    const rows = v.size === 'M' ? 3 : 5, seats = rows * 60, k = Math.min(n, seats), fill = k / seats;
    for (let r = rows - 1; r >= 0; r--) for (let i = 0; i < 60; i++) if (R() < fill) add(X(130 + i * 18 + r * 5 + R() * 6), T - 12 - r * 16, 'seat', 1.2 + (rows - r) * 0.02);
    for (let i = 0; i < 6; i++) add(X(60 + R() * 1200), T - 1, 'stand', 1.18);
  } else if (v.kind === 'outdoor') {
    const k = Math.min(n, 30);
    // fans gather near the baselines and on a bench, leaving the view open
    for (let i = 0; i < k * 0.45; i++) { const side = R() < 0.5; add(X(side ? -60 + R() * 200 : 1180 + R() * 200), T - 1, 'stand', 1.1 + R() * 0.12); }
    for (let i = 0; i < k * 0.35; i++) { const side = R() < 0.5; add(X(side ? 160 + i * 26 : 980 + i * 26), T - 4, R() < 0.3 ? 'uncle' : 'chair', 1.08); }
  } else {
    const A = ARENAS[v.tier], rows = A.rows, top = 40, rowH = (T - 18 - top) / rows, fill = v.fill != null ? v.fill : A.fill;
    for (let r = 0; r < rows; r++) for (let x = 5; x < BGW; x += 9.5 - r * 0.2) if (R() < Math.min(1, fill * 1.08) && (x % 230) > 12) add(x + R() * 3, top + r * rowH + rowH - 2 + R() * 2, 'seat', 0.6 + r * 0.04);
  }
  return out;
}
const CROWD_TOPS = ['#1e7a4c', '#2b3a55', '#7a1f2b', '#f4f4ef', '#c26a1d', '#5f7a5a', '#6b3fa0', '#dddddd', '#3a3a3a', '#1f6fb2'];
function drawCrowdMember(g, m, x, y, bounce, ex = 0, groan = 0) {
  if (m.kind === 'seat') return M.venue && M.venue.kind === 'arena' ? drawArenaFan(g, m, x, y, bounce, ex, groan) : drawBleacherFan(g, m, x, y, bounce, ex, groan);
  drawFanFigure(g, m, x, y, bounce, ex, groan);
}
function drawBleacherFan(g, m, x, y, bounce, ex, groan = 0) {        // seated in bleachers: full upper body, stands when excited
  const mm = Object.assign(m, {}), stand = ex > 0.5 && ((m.ph * 3) % 1) < ex;
  drawFanFigure(g, stand ? Object.assign({}, m, { kind: 'stand', s: m.s * 0.62 }) : Object.assign({}, m, { kind: 'stand', s: m.s * 0.62 }), x, y + (stand ? 0 : 10 * m.s), bounce, stand ? ex : 0, groan);
}
// ------------------------------------------------------------- PER FRAME
function drawVenueBack(g, t) {
  const L = VL, v = L.spec;
  if (v.kind === 'outdoor') drawOutdoorBack(g, t, L, v);
  blit(g, L.bg, BG_X0 - cam.x + FX.sx, FX.sy);
  if (v.kind === 'outdoor') drawFenceFlag(g, t, L.host);
  // crowd: cached when calm, animated when the building gets loud
  // crowd reaction scales with crowd size: small crowds clap and stand, big ones erupt
  const hype = FX.hypeV, sizeK = clamp(v.crowd / 150, 0.45, 1), ex = hype * sizeK * (REDUCED_MOTION ? 0.25 : 1), groan = FX.groanV * sizeK;
  if (!L.bigCrowd || groan > 0.25) {                              // big crowds are drawn live only for the brief groan
    for (const m of L.crowd) {
      const x = m.x + BG_X0 - cam.x + FX.sx; if (x < -60 || x > W + 60) continue;
      drawCrowdMember(g, m, x, m.y + FX.sy, Math.abs(Math.sin(t * 7 + m.ph)) * ex * 3 * m.s, ex, groan);
    }
  } else if (hype < 0.05) blit(g, L.crowdCv, BG_X0 - cam.x + FX.sx, FX.sy);
  else {                                                         // big crowds: rows split into chunks bouncing on staggered beats
    const rs = L.crowdCv.rs, top = v.kind === 'arena' ? 40 - (FLOOR_TOP - 58) / ARENAS[v.tier].rows : 0, rows = v.kind === 'arena' ? ARENAS[v.tier].rows + 1 : 6;
    const rowH = (FLOOR_TOP - top) / rows, chunk = 140, ox = BG_X0 - cam.x + FX.sx;
    for (let r = 0; r < rows; r++) for (let c = 0; c * chunk < BGW; c++) {
      const x0 = c * chunk, sxs = x0 + ox; if (sxs > W + 20 || sxs + chunk < -20) continue;
      const wave = FX.event && FX.event.major && FX.event.until > Game.t ? Math.max(0, Math.sin(t * 4 - c * 0.65 - r * 0.18)) : 0;
      const b = (Math.abs(Math.sin(t * 6 + r * 1.7 + c * 2.3)) * 2.5 + wave * 3) * ex, y0 = Math.max(0, top + r * rowH - 6);
      g.drawImage(L.crowdCv, x0 * rs, y0 * rs, chunk * rs, (rowH + 6) * rs, sxs, y0 - b + FX.sy, chunk, rowH + 6);
    }
  }
  if (v.kind === 'arena') { g.fillStyle = 'rgba(0,0,12,0.3)'; g.fillRect(-2000, -2000, 6000, 2000 + FLOOR_TOP + FX.sy); }      // stands sit in shadow; the court is spotlit
  if (v.kind === 'arena' && !REDUCED_MOTION) for (const f of FX.flashes) {
    g.save(); g.globalAlpha = Math.max(0, 1 - f.t / 0.12) * 0.7; g.fillStyle = '#fff6dc'; g.fillRect(f.x - 2, f.y - 0.5, 4, 1); g.fillRect(f.x - 0.5, f.y - 2, 1, 4); g.restore();
  }
  if (v.kind === 'arena' && !L.preview && FX.event && FX.event.until > Game.t) {
    g.fillStyle = '#102126'; g.fillRect(0, FLOOR_TOP - 18, W, 14); g.fillStyle = FX.event.color; g.textAlign = 'center'; g.font = `9px ${FONT}`;
    const offset = ((BG_X0 - cam.x) % 280 + 280) % 280;
    for (let x = offset - 280; x < W + 280; x += 280) g.fillText(FX.event.label, x + 140, FLOOR_TOP - 8);
  }
  if (v.kind === 'arena' || (v.kind === 'gym' && v.size === 'L')) for (const wx of [250, 1070]) drawJumbotron(g, v, t, wx);
  if (v.kind === 'arena' && (v.tier === 'intl' || v.tier === 'grand')) {       // sweeping spotlights
    g.save(); g.globalCompositeOperation = 'lighter';
    const major = FX.event && FX.event.major && FX.event.until > Game.t;
    const sweep = REDUCED_MOTION || !major ? 0 : t * 0.32, glow = major ? 0.065 : 0.025;
    // Beams finish at the back boundary; the ball and shot meter stay unobscured.
    for (let i = 0; i < 3; i++) { const a = Math.sin(sweep + i * 2.1) * 0.35, x0 = W * (0.2 + i * 0.3); g.fillStyle = `rgba(255,240,200,${glow})`; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + Math.tan(a) * 250 - 60, FLOOR_TOP); g.lineTo(x0 + Math.tan(a) * 250 + 60, FLOOR_TOP); g.closePath(); g.fill(); }
    if (hype > 0.2 && !REDUCED_MOTION) { g.globalAlpha = hype * 0.09; g.fillStyle = '#f6d987'; g.fillRect(0, FLOOR_TOP - 4, W, 2); }
    g.restore();
  }
}
function drawJumbotron(g, v, t, wx = 660) {
  const big = v.kind === 'arena', w = big ? (v.tier === 'grand' ? 230 : v.tier === 'regional' ? 150 : 190) : 130, h = big ? (v.tier === 'grand' ? 62 : 48) : 36;
  const x = wx - cam.x + FX.sx - w / 2, y = big ? 6 : 20;
  if (big) { g.fillStyle = '#2a2f38'; g.fillRect(x + w / 2 - 2, 0, 4, y); }
  g.fillStyle = '#0b0e14'; roundRect(g, x, y, w, h, 6); g.fill(); g.strokeStyle = '#3a404a'; g.lineWidth = 2; g.stroke();
  // previews (venue select, pre-game) show the upcoming matchup instead of whatever runs in the background
  const pre = M.gym || !M.teams || !isFinite(M.clock) || VL.preview;
  const event = big && !pre && FX.event && FX.event.until > Game.t ? FX.event : null, midY = event ? y + h - 24 : y + h * 0.66;
  const A = pre ? { def: VL.tA, score: 0 } : M.teams[0], B = pre ? { def: VL.tB, score: 0 } : M.teams[1];
  g.textAlign = 'center'; g.fillStyle = '#f2cf6b'; g.font = `${big ? 10 : 8}px ${FONT}`;
  g.fillText(A.def.short, x + w * 0.22, y + h * 0.3); g.fillText(B.def.short, x + w * 0.78, y + h * 0.3);
  drawCrest(g, x + w * 0.22, midY, big ? 9 : 7, A.def); drawCrest(g, x + w * 0.78, midY, big ? 9 : 7, B.def);   // crests, not a second score
  g.fillStyle = pre ? '#fff' : '#ff4d3d'; g.font = `${big ? 11 : 9}px ${FONT}`; g.fillText(pre ? 'TONIGHT' : '\u25CF LIVE', x + w / 2, midY);
  if (event) { g.fillStyle = '#15262c'; g.fillRect(x + 3, y + h - 12, w - 6, 10); g.fillStyle = event.color; g.font = `8px ${FONT}`; g.fillText(event.label, x + w / 2, y + h - 4, w - 12); }
  else if (v.tier === 'grand') { g.fillStyle = '#f2cf6b'; g.font = `8px ${FONT}`; g.fillText('WORLD UMMAH CUP FINAL', x + w / 2, y + h - 4); }
  if (event && event.major) { g.save(); g.globalAlpha = REDUCED_MOTION ? 0.4 : 0.45 + Math.sin(t * 3) * 0.12; g.strokeStyle = event.color; g.lineWidth = 1; g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.restore(); }
}
function drawVenueNear(g) {
  const L = VL, v = L.spec;
  blit(g, L.near, BG_X0 - cam.x + FX.sx, NEAR_Y + FX.sy);
}
function drawVenueOverlay(g, t) {
  const L = VL, v = L.spec;
  if (v.kind === 'gym') { g.fillStyle = 'rgba(255,232,180,0.07)'; g.fillRect(-2000, -2000, 6000, 6000); }      // warm fluorescent cast
  if (v.kind === 'outdoor') {
    if (v.time === 'sunset') { g.fillStyle = 'rgba(255,140,60,0.10)'; g.fillRect(-2000, -2000, 6000, 6000); }
    if (v.time === 'night') { g.fillStyle = 'rgba(10,20,60,0.18)'; g.fillRect(-2000, -2000, 6000, 6000); }
    if (L.snow) { g.fillStyle = 'rgba(255,255,255,0.85)'; for (const f of L.snow) { const y = (f.y + t * f.v) % H, x = (f.x + Math.sin(t + f.y) * 12 - cam.x * 0.2 + 1400) % 1400 - 200; g.fillRect(x, y, f.s, f.s); } }
  }
  if (L.vignette) { const hw = W / (2 * cam.zoom), hh = H / (2 * cam.zoom); g.drawImage(L.vignette, W / 2 - hw, cam.fy - hh, hw * 2, hh * 2); }
}
// ------------------------------------------------------------- HOOP STYLES
function drawPoleHoopBack(g, h) {
  drawStanchion(g, h, '#555', '#777', true);
  const dy = h.dy * 0.4, corner = (zc, yc) => { const [x, y] = P(h.bbx, yc + dy, h.z + zc); return [x - zc * 0.42 * h.dir, y]; };
  const c = [corner(-46, RIM_Y - 12), corner(46, RIM_Y - 12), corner(46, RIM_Y + 56), corner(-46, RIM_Y + 56)];
  g.fillStyle = '#cfd4d9'; g.strokeStyle = '#8a9098'; g.lineWidth = 3; g.beginPath(); c.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); g.stroke();
  const s = [corner(-16, RIM_Y + 2), corner(16, RIM_Y + 2), corner(16, RIM_Y + 26), corner(-16, RIM_Y + 26)];
  g.strokeStyle = '#d24a2a'; g.lineWidth = 2; g.beginPath(); s.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.stroke();
  const [rx, ry] = P(h.x, RIM_Y + h.dy, h.z);
  g.strokeStyle = '#b23c16'; g.lineWidth = 3; g.beginPath(); g.ellipse(rx, ry, RIM_R + 1, (RIM_R + 1) * 0.5, 0, Math.PI, Math.PI * 2); g.stroke();
}

// ---------------------------------------------------------- THUMBNAILS
// Render a venue's static layers into a small canvas (for venue select and
// the career pre-game screen). Layers are built, drawn, then released.
const _thumbs = {};
function composeVenue(g, L, camX, t) {
  const cx = cam.x, sx = FX.sx, sy = FX.sy, hv = FX.hypeV, vl = VL, mt = M.teams;
  cam.x = camX; FX.sx = 0; FX.sy = 0; FX.hypeV = 0; VL = L; L.preview = true;
  try {
    withPlane(g, K_BACK, FLOOR_TOP, () => drawVenueBack(g, t)); drawFloorWarped(g, L.floor); withPlane(g, K_NEAR, NEAR_Y, () => drawVenueNear(g)); if (L.spec.kind === 'gym') drawEndWalls(g);
    for (const h of hoops) { if (L.spec.kind === 'gym') drawGymHoopBack(g, h, L.spec.size === 'home' ? gymUp() : { hoops: 1 }); else if (L.spec.kind === 'outdoor') drawPoleHoopBack(g, h); else drawHoopBack(g, h); drawHoopFront(g, h, { hoops: 1 }); }
    drawVenueOverlay(g, t);
  } finally { L.preview = false; cam.x = cx; FX.sx = sx; FX.sy = sy; FX.hypeV = hv; VL = vl; }
}
function venueThumb(v, tA, tB) {
  if (v.kind === 'outdoor') v = Object.assign({}, v, { time: v.time || 'sunset', surface: v.surface || 'asphalt' });   // thumbnails show golden hour
  const key = v.id + '|' + (v.time || '') + '|' + (v.surface || '') + '|' + (tB ? tB.name : '');
  if (_thumbs[key]) return _thumbs[key];
  const c = makeCanvas(320, 180), g = c.getContext('2d');
  const rw = W; W = 960;
  try {
    g.scale(320 / 960, 180 / 540);
    if (v.kind === 'classic') { const cx = cam.x; cam.x = 180; withPlane(g, K_BACK, FLOOR_TOP, () => drawArena(g, 0)); if (courtCv && !VL) drawFloorWarped(g, courtCv); withPlane(g, K_NEAR, NEAR_Y, () => drawNearSide(g)); cam.x = cx; }
    else { const L = buildVenueLayers(v, tA || MINI_TEAM, tB || TEAMS[1], { rs: 1 }); const z0 = cam.zoom, fy0 = cam.fy; cam.zoom = 1; cam.fy = H / 2; composeVenue(g, L, 180, 0); cam.zoom = z0; cam.fy = fy0; }
  } finally { W = rw; }
  return (_thumbs[key] = c);
}

// ------------------------------------------------------- VENUE SELECT
// After team select in Quick Play and online hosting.
function venueOptions() { return [...VENUE_LIST.filter(v => v.id !== 'home' || careerReach() >= 0), { id: 'random', kind: 'random', name: 'Random' }]; }
function openVenueSelect(next) { Game.venueNext = next; Game.screen = 'venue'; Game.idx = Game.venueIdx || 0; }
function chooseVenue(i) {
  const opts = venueOptions(), o = opts[i];
  if (!o) return;
  if (o.kind !== 'random' && venueLocked(o)) { toast(lockText(o)); SFX.bad(); return; }
  Game.venueIdx = i;
  const pool = opts.filter(v => v.kind !== 'random' && !venueLocked(v));
  const base = o.kind === 'random' ? pick(pool) : o;
  const v = makeVenue(base, base.kind === 'outdoor' ? { backdrop: base.backdrop } : {});
  if (o.kind === 'random') v.random = true;
  SFX.blip(); Game.venueNext(v);
}
function venueUpdate() {
  const n = venueOptions().length, cols = 6;
  if (menuHit('left')) Game.idx = (Game.idx + n - 1) % n;
  if (menuHit('right')) Game.idx = (Game.idx + 1) % n;
  if (menuHit('up')) Game.idx = (Game.idx - cols + n) % n;
  if (menuHit('down')) Game.idx = (Game.idx + cols) % n;
  if (menuHit('ok')) chooseVenue(Game.idx);
  else if (menuHit('back')) { Game.screen = 'select'; }
}
function drawVenueSelect(g) {
  dim(g, 0.75);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.fillText('Choose a venue', W / 2, 44);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Venues change the look and the crowd. The court and gameplay are the same everywhere.', W / 2, 66);
  const opts = venueOptions(), tB = Game.sel ? TEAMS[Game.sel.b] : TEAMS[1], tA = Game.sel ? TEAMS[Game.sel.a] : TEAMS[0];
  opts.forEach((v, i) => {
    const col = i % 6, row = Math.floor(i / 6), w = 146, h = 82, x = 18 + col * 156, y = 80 + row * 108, on = i === Game.idx, locked = v.kind !== 'random' && venueLocked(v);
    if (hovering(x, y, w, h + 30)) Game.idx = i;
    const a = tween('venue:' + i, on ? 1 : 0, 14);
    if (v.kind === 'random') { g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, x, y, w, h, 8); g.fill(); g.fillStyle = GOLD; g.font = `38px ${FONT}`; g.fillText('?', x + w / 2, y + 56); }
    else { g.save(); roundRect(g, x, y, w, h, 8); g.clip(); g.drawImage(venueThumb(v, tA, tB), x, y, w, h); if (locked) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y, w, h); } g.restore(); }
    g.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.15)'; g.lineWidth = on ? 3 : 1; roundRect(g, x - a * 2, y - a * 2, w + a * 4, h + a * 4, 9); g.stroke();
    if (locked) { drawLock(g, x + w / 2, y + h / 2 - 10); g.fillStyle = '#fff'; g.font = `9px ${BODY}`; g.fillText(fitText(g, lockText(v), w - 8), x + w / 2, y + h / 2 + 20); }
    g.fillStyle = on ? GOLD : '#fff'; g.font = `11px ${on ? FONT : BODY}`; g.fillText(fitText(g, v.kind === 'random' ? 'Random' : v.name, w + 6), x + w / 2, y + h + 15);
    addRect(x, y, w, h + 20, () => { if (Game.idx === i) chooseVenue(i); Game.idx = i; });
  });
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Arrows to choose, Enter to play, Esc to go back', W / 2, 530);
}
function drawLock(g, x, y) {
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 8, 8, Math.PI, 0); g.stroke();
  g.fillStyle = '#fff'; roundRect(g, x - 12, y - 8, 24, 18, 4); g.fill(); g.fillStyle = '#333'; g.fillRect(x - 1.5, y - 2, 3, 7);
}
// ----------------------------------------------------------- INTRO SHOT
// A short camera sweep across the venue with its name before tip-off.
function startVenueIntro(v) {
  if (!v || M.attract || Net.role) return;
  M.introT = 1.8; M.introName = v.name ? venueDisplayName(v, venueHost(v, M.teamDefs[0], M.teamDefs[1])) : '';
  FX.callout(M.introName.toUpperCase(), '#ffffff', v.kind === 'arena' ? (v.final ? 'THE FINAL' : 'TONIGHT') : v.kind === 'outdoor' ? v.time.toUpperCase() : 'HOME OF ' + venueHost(v, M.teamDefs[0], M.teamDefs[1]).short, true);
}
function introTick(rdt) {
  M.introT -= rdt;
  // wide establishing sweep from one end of the venue, settling into the broadcast framing
  const k = 1 - clamp(M.introT / 1.8, 0, 1), e = k * k * (3 - 2 * k);
  cam.zoom = lerp(1.08, baseZoom() - 0.08, e); cam.fx = lerp(W / (2 * cam.zoom) - 100, 660, e); cam.fy = lerp(H / 2, FLOOR_TOP + 350 * ZS - 60, e);
  [cam.fx, cam.fy] = camClamp(cam.fx, cam.fy, cam.zoom); [cam.fx, cam.fy, cam.zoom] = fitPlayers(cam.fx, cam.fy, cam.zoom); cam.x = cam.fx - W / 2;
  cam.ix = cam.x; cam.iz = cam.zoom; cam.ify = cam.fy;
  if (menuHit('ok') || menuHit('back')) M.introT = 0;
}

