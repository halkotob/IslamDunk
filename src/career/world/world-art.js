// ================================================= v9.2: THE NEIGHBOURHOOD — shared drawing (see docs/art-style.md)
// Flat fills, one darker cel tone on the side away from the light (light from the upper left), a 2 px outline in
// OUTLINE on silhouettes and 1 px on inner details, at the scale of the thing being drawn. Time of day never
// changes these colours directly: the engine lays a multiply tint over the finished scene and adds lights on top.
// What a time of day does change here: the sky, what windows show (sky by day, a warm lamp at dusk and night) and
// the length and direction of cast shadows.
const WP = {
  wall: '#efe3c6', wallB: '#e3d3b0', brick: '#b8735a', brickB: '#9d5e48', siding: '#c9d6dc', sidingB: '#aebfc7', sage: '#b9c9a3', sageB: '#9fb287',
  roof: '#6b4a3a', roofB: '#55392c', slate: '#4f5f73', slateB: '#3e4c5e', trim: '#f6f1e6', door: '#6b4a2b', doorB: '#55391f', doorG: '#1e5a4a',
  grass: '#86b45f', grassB: '#6c9a49', hedge: '#4f8a3c', hedgeB: '#3d7030', walk: '#d8d1c3', walkB: '#c4bcac', curb: '#b1aa9c', road: '#4b4f55', lane: '#e8e2d4',
  bark: '#6b4a2b', leaf: '#4f9a4a', leafB: '#3c7f3a', leafL: '#6db35c', gold: '#e8c35a', green: '#1e7a4c', greenB: '#16603c', teal: '#2c6e8f', cream: '#f6efe0',
  metal: '#7b8794', metalB: '#5d6773', wood: '#a0703f', woodB: '#7f552c', floor: '#c8a27a', floorB: '#b08a63', rug: '#8e2b3a', rugB: '#6f1f2b'
};
const wO = () => OUTLINE;
function wBox(g, x, y, w, h, fill, lw = 2) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (lw) { g.strokeStyle = wO(); g.lineWidth = lw; g.strokeRect(x, y, w, h); } }
function wRound(g, x, y, w, h, r, fill, lw = 2) { g.fillStyle = fill; roundRect(g, x, y, w, h, r); g.fill(); if (lw) { g.strokeStyle = wO(); g.lineWidth = lw; g.stroke(); } }
function wPoly(g, pts, fill, lw = 2) { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); if (lw) { g.strokeStyle = wO(); g.lineWidth = lw; g.stroke(); } }
function wLine(g, x0, y0, x1, y1, col, lw = 1) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
// a cast shadow on the ground under something w wide (time of day: direction, length, strength)
function wShadow(g, T, x, y, w, h = 0) {
  const sh = T.sh, len = (8 + h * 0.18) * sh.len;
  g.fillStyle = `rgba(20,14,30,${sh.a})`; g.beginPath(); g.ellipse(x + sh.dx * len, y + 1, w / 2 + len * 0.6, Math.max(3, w * 0.09), 0, 0, Math.PI * 2); g.fill();
}

// ---------------------------------------------------------------- sky
function wSky(g, T, tod, x0, x1, y1) {
  const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, T.sky[0]); gr.addColorStop(1, T.sky[1]);
  g.fillStyle = gr; g.fillRect(x0, 0, x1 - x0, y1);
  const R = seededRng(97);
  if (tod === 3) {                                                 // stars and a crescent moon
    for (let i = 0; i < 160; i++) { const sx = x0 + R() * (x1 - x0), sy = R() * y1 * 0.8, r = R() < 0.15 ? 1.4 : 0.8; g.fillStyle = `rgba(255,250,230,${0.4 + R() * 0.5})`; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill(); }
    for (let mx = x0 + 380; mx < x1; mx += 2600) crescent(g, mx, 64, 15, '#f4ecc8');
    return;
  }
  if (tod === 2) {                                                 // a low sun behind the rooftops
    for (let sx = x0 + 760; sx < x1; sx += 2600) { const sg = g.createRadialGradient(sx, y1 - 30, 4, sx, y1 - 30, 140); sg.addColorStop(0, 'rgba(255,214,140,0.95)'); sg.addColorStop(0.18, 'rgba(255,190,120,0.6)'); sg.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = sg; g.fillRect(sx - 140, y1 - 170, 280, 170); }
  } else for (let sx = x0 + (tod ? 1300 : 300); sx < x1; sx += 2600) { g.fillStyle = 'rgba(255,248,214,0.9)'; g.beginPath(); g.arc(sx, tod ? 54 : 92, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,248,214,0.25)'; g.beginPath(); g.arc(sx, tod ? 54 : 92, 34, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = tod === 2 ? 'rgba(255,214,190,0.75)' : 'rgba(255,255,255,0.86)';
  for (let cx = x0 + 120; cx < x1; cx += 330 + R() * 220) { const cy = 40 + R() * 70, s = 0.7 + R() * 0.6; for (const [dx, dy, r] of [[0, 0, 24], [26, -8, 30], [54, 2, 22], [30, 8, 22]]) { g.beginPath(); g.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); g.fill(); } }
}

// ---------------------------------------------------------------- windows, doors, houses
// glass shows the sky by day; at dusk and night a warm lamp is on behind it (lit), or it reads dark
function wGlass(T, tod, lit) {
  if (tod >= 2 && lit) return tod === 3 ? '#ffd27a' : '#ffdf9a';
  return tod === 3 ? '#1d2b4f' : tod === 2 ? '#c99a86' : '#a9d3ec';
}
function wWindow(g, T, tod, x, y, w, h, o = {}) {
  const glass = wGlass(T, tod, o.lit !== false);
  if (o.arch) { g.fillStyle = glass; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.5); g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); g.strokeStyle = o.frame || WP.trim; g.lineWidth = 3; g.stroke(); g.strokeStyle = wO(); g.lineWidth = 1; g.stroke(); return; }
  wBox(g, x - 3, y - 3, w + 6, h + 6, o.frame || WP.trim, 1);
  g.fillStyle = glass; g.fillRect(x, y, w, h);
  if (tod < 2) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.35, y + h); g.closePath(); g.fill(); }
  if (o.curtain) { g.fillStyle = o.curtain; g.fillRect(x, y, w * 0.18, h); g.fillRect(x + w * 0.82, y, w * 0.18, h); }
  g.strokeStyle = o.frame || WP.trim; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  if (o.sill !== false) wBox(g, x - 7, y + h + 2, w + 14, 5, o.frame || WP.trim, 1);
}
function wWindowGlow(g, x, y, w, h, a = 1) {                      // for the glow layer
  const cx = x + w / 2, cy = y + h / 2, r = Math.max(w, h) * 1.25;
  const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r); gr.addColorStop(0, `rgba(255,200,110,${0.42 * a})`); gr.addColorStop(1, 'rgba(255,170,80,0)');
  g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
}
function wDoor(g, x, base, w, h, col = WP.door, o = {}) {
  wBox(g, x - 5, base - h - 5, w + 10, h + 5, o.frame || WP.trim, 1);
  wBox(g, x, base - h, w, h, col, 2);
  g.fillStyle = shade(col, -0.16); g.fillRect(x + w * 0.62, base - h + 2, w * 0.36, h - 2);
  g.strokeStyle = shade(col, -0.3); g.lineWidth = 1; g.strokeRect(x + 7, base - h + 8, w - 14, h * 0.38); g.strokeRect(x + 7, base - h * 0.52, w - 14, h * 0.42);
  g.fillStyle = WP.gold; g.beginPath(); g.arc(x + w - 9, base - h * 0.48, 2.6, 0, Math.PI * 2); g.fill();
  if (o.plaque) wRound(g, x + w / 2 - 9, base - h - 17, 18, 10, 3, WP.gold, 1);                  // a house-number plaque
}
// a house front: wall, roof, door, windows, steps, a little lawn strip in front
function wHouse(g, T, tod, x, base, o) {
  const w = o.w, h = o.h, wall = o.wall || WP.wall, wallB = o.wallB || shade(wall, -0.12), roof = o.roof || WP.roof;
  wBox(g, x, base - h, w, h, wall, 2);
  g.fillStyle = wallB; g.fillRect(x + w - 16, base - h + 1, 15, h - 1);                       // cel side
  if (o.siding) { g.strokeStyle = shade(wall, -0.09); g.lineWidth = 1; for (let y = base - h + 12; y < base; y += 12) { g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + w - 1, y); g.stroke(); } }
  if (o.brick) { g.strokeStyle = shade(wall, -0.14); g.lineWidth = 1; for (let y = base - h + 9, r = 0; y < base; y += 9, r++) { g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + w - 1, y); g.stroke(); for (let bx = x + (r % 2) * 14; bx < x + w; bx += 28) { g.beginPath(); g.moveTo(bx, y - 9); g.lineTo(bx, y); g.stroke(); } } }
  // roof: a gable or a flat parapet
  if (o.flat) { wBox(g, x - 8, base - h - 16, w + 16, 16, roof, 2); }
  else { const rh = o.rh || 70; wPoly(g, [x - 16, base - h + 2, x + w / 2, base - h - rh, x + w + 16, base - h + 2], roof, 2); wPoly(g, [x + w / 2, base - h - rh, x + w + 16, base - h + 2, x + w / 2 + 10, base - h + 2], shade(roof, -0.14), 0);
    g.strokeStyle = wO(); g.lineWidth = 2; g.beginPath(); g.moveTo(x - 16, base - h + 2); g.lineTo(x + w / 2, base - h - rh); g.lineTo(x + w + 16, base - h + 2); g.stroke();
    if (o.gableWin) wWindow(g, T, tod, x + w / 2 - 14, base - h - rh * 0.55, 28, 26, { lit: o.lit, sill: false }); }
  for (const [wx, wy, ww, wh] of o.windows || []) wWindow(g, T, tod, x + wx, base - h + wy, ww, wh, { lit: o.lit, curtain: o.curtain });
  if (o.door) { const [dx, dw, dh] = o.door; wDoor(g, x + dx, base - 8, dw, dh, o.doorCol, { plaque: true });
    wBox(g, x + dx - 10, base - 8, dw + 20, 8, WP.walkB, 1); }                                    // the step
}
function wHouseGlow(g, x, base, o) { for (const [wx, wy, ww, wh] of o.windows || []) wWindowGlow(g, x + wx, base - o.h + wy, ww, wh); }

// ---------------------------------------------------------------- nature and street furniture
function wTree(g, T, x, base, s = 1, o = {}) {
  wShadow(g, T, x, base, 70 * s, 160 * s);
  wBox(g, x - 7 * s, base - 92 * s, 14 * s, 92 * s, WP.bark, 2 * s);
  g.fillStyle = shade(WP.bark, -0.18); g.fillRect(x + 1 * s, base - 91 * s, 5 * s, 90 * s);
  const blobs = [[-30, -118, 34], [24, -124, 36], [-4, -150, 40], [-38, -150, 26], [34, -156, 26]];
  g.strokeStyle = wO(); g.lineWidth = 2 * s;
  for (const [bx, by, r] of blobs) { g.beginPath(); g.arc(x + bx * s, base + by * s, r * s, 0, Math.PI * 2); g.stroke(); }
  for (const [bx, by, r] of blobs) { g.fillStyle = o.leaf || WP.leaf; g.beginPath(); g.arc(x + bx * s, base + by * s, r * s - 1, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = o.leafB || WP.leafB; for (const [bx, by, r] of blobs) { g.beginPath(); g.arc(x + (bx + r * 0.35) * s, base + (by + r * 0.3) * s, r * 0.62 * s, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = WP.leafL; for (const [bx, by, r] of blobs.slice(0, 3)) { g.beginPath(); g.arc(x + (bx - r * 0.3) * s, base + (by - r * 0.35) * s, r * 0.32 * s, 0, Math.PI * 2); g.fill(); }
}
function wBush(g, x, base, w, h, col = WP.hedge) {
  wRound(g, x, base - h, w, h, Math.min(h / 2, 14), col, 2);
  g.fillStyle = shade(col, -0.14); g.fillRect(x + 3, base - h * 0.42, w - 6, h * 0.42 - 2);
  g.fillStyle = shade(col, 0.12); for (let i = 0; i < w / 18; i++) { g.beginPath(); g.arc(x + 10 + i * 18, base - h + 7, 4, 0, Math.PI * 2); g.fill(); }
}
function wFence(g, x0, x1, base, h = 46, col = WP.trim) {
  wBox(g, x0, base - h * 0.72, x1 - x0, 6, col, 1); wBox(g, x0, base - h * 0.3, x1 - x0, 6, col, 1);
  for (let x = x0; x <= x1 - 8; x += 16) wPoly(g, [x, base, x, base - h + 6, x + 4, base - h, x + 8, base - h + 6, x + 8, base], col, 1);
}
function wGate(g, x, base, w, h) {                               // a closed iron gate between two brick posts
  wBox(g, x - 18, base - h - 20, 18, h + 20, WP.brick, 2); wBox(g, x + w, base - h - 20, 18, h + 20, WP.brick, 2);
  wBox(g, x - 21, base - h - 26, 24, 7, WP.trim, 1); wBox(g, x + w - 3, base - h - 26, 24, 7, WP.trim, 1);
  g.strokeStyle = '#2b2f36'; g.lineWidth = 3; g.strokeRect(x, base - h, w, h);
  g.lineWidth = 2; for (let bx = x + 10; bx < x + w; bx += 12) { g.beginPath(); g.moveTo(bx, base - h); g.lineTo(bx, base); g.stroke(); }
  g.beginPath(); g.moveTo(x, base - h * 0.5); g.lineTo(x + w, base - h * 0.5); g.stroke();
  g.fillStyle = '#2b2f36'; g.fillRect(x + w / 2 - 5, base - h * 0.5 - 6, 10, 12);                  // the latch, shut
}
function wMailbox(g, T, x, base, col = WP.teal) {
  wShadow(g, T, x, base, 26, 50);
  wBox(g, x - 3, base - 46, 6, 46, WP.woodB, 1);
  wRound(g, x - 13, base - 64, 26, 20, 8, col, 2); g.fillStyle = shade(col, -0.18); g.fillRect(x + 4, base - 62, 8, 16);
  g.fillStyle = '#c0392b'; g.fillRect(x + 11, base - 74, 3, 14); g.fillRect(x + 11, base - 74, 9, 5);
}
function wHydrant(g, T, x, base) {
  wShadow(g, T, x, base, 22, 30);
  wRound(g, x - 9, base - 30, 18, 30, 4, '#c0392b', 2); wRound(g, x - 12, base - 34, 24, 7, 3, '#c0392b', 2);
  wRound(g, x - 15, base - 21, 30, 7, 3, '#a93226', 1); wRound(g, x - 6, base - 40, 12, 7, 4, '#a93226', 1);
}
function wLampPost(g, T, x, base, h = 230) {
  wShadow(g, T, x, base, 26, h);
  wBox(g, x - 4, base - h, 8, h, '#3b4048', 2); wBox(g, x - 8, base - 14, 16, 14, '#3b4048', 2);
  wLine(g, x, base - h + 2, x + 28, base - h + 2, '#3b4048', 5);
  wRound(g, x + 18, base - h, 24, 12, 4, '#3b4048', 2);
  g.fillStyle = '#e9e4d0'; g.fillRect(x + 21, base - h + 10, 18, 4);
}
function wLampGlow(g, x, base, h = 230, a = 1) {                  // the streetlight's pool of light (glow layer)
  const lx = x + 30, ly = base - h + 14;
  let gr = g.createRadialGradient(lx, ly, 2, lx, ly, 80); gr.addColorStop(0, `rgba(255,226,150,${0.9 * a})`); gr.addColorStop(1, 'rgba(255,200,110,0)');
  g.fillStyle = gr; g.fillRect(lx - 80, ly - 80, 160, 160);
  g.save(); g.translate(lx, base + 6); g.scale(1, 0.22); gr = g.createRadialGradient(0, 0, 4, 0, 0, 120); gr.addColorStop(0, `rgba(255,214,140,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(-120, -120, 240, 240); g.restore();
}
function wBench(g, T, x, base, w = 120) {
  wShadow(g, T, x, base, w, 40);
  for (const lx of [x - w / 2 + 12, x + w / 2 - 18]) wBox(g, lx, base - 26, 6, 26, '#3b4048', 1);
  wBox(g, x - w / 2, base - 30, w, 7, WP.wood, 2);                                               // seat
  for (const lx of [x - w / 2 + 14, x + w / 2 - 16]) wBox(g, lx, base - 62, 5, 32, '#3b4048', 1);
  wBox(g, x - w / 2 + 4, base - 60, w - 8, 7, WP.wood, 2); wBox(g, x - w / 2 + 4, base - 48, w - 8, 7, WP.wood, 2);   // back slats
}
function wCar(g, T, x, base, col, f = 1) {                       // a parked car seen from the side
  wShadow(g, T, x, base, 190, 60);
  const p = (dx, dy) => [x + dx * f, base + dy];
  g.fillStyle = col; g.beginPath(); g.moveTo(...p(-92, -14)); g.lineTo(...p(-90, -38)); g.lineTo(...p(-52, -42)); g.lineTo(...p(-28, -66)); g.lineTo(...p(38, -66)); g.lineTo(...p(62, -42)); g.lineTo(...p(92, -38)); g.lineTo(...p(94, -14)); g.closePath(); g.fill();
  g.strokeStyle = wO(); g.lineWidth = 2; g.stroke();
  g.fillStyle = shade(col, -0.16); g.beginPath(); g.moveTo(...p(-92, -22)); g.lineTo(...p(94, -22)); g.lineTo(...p(94, -14)); g.lineTo(...p(-92, -14)); g.closePath(); g.fill();
  g.fillStyle = '#a9d3ec'; g.beginPath(); g.moveTo(...p(-44, -44)); g.lineTo(...p(-24, -62)); g.lineTo(...p(2, -62)); g.lineTo(...p(2, -44)); g.closePath(); g.fill(); g.strokeStyle = wO(); g.lineWidth = 1; g.stroke();
  g.beginPath(); g.moveTo(...p(8, -44)); g.lineTo(...p(8, -62)); g.lineTo(...p(34, -62)); g.lineTo(...p(54, -44)); g.closePath(); g.fill(); g.stroke();
  for (const wx of [-58, 58]) { const [cx, cy] = p(wx, -12); g.fillStyle = '#22252a'; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffe9a8'; const [hx, hy] = p(90, -34); g.fillRect(hx - (f > 0 ? 4 : 0), hy, 4, 6);
}
function wCrate(g, T, x, base, fruit) {
  wShadow(g, T, x, base, 54, 30);
  wBox(g, x - 26, base - 26, 52, 26, WP.wood, 2); wLine(g, x - 26, base - 13, x + 26, base - 13, WP.woodB, 1);
  for (let i = 0; i < 6; i++) { g.fillStyle = fruit; g.beginPath(); g.arc(x - 19 + i * 7.6, base - 28 - (i % 2) * 3, 5.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = wO(); g.lineWidth = 1; g.stroke(); }
}
