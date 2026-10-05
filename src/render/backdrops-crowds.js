// ================================================ OUTDOOR BACKDROPS (v3.5)
// Each backdrop is built from parallax layers (sky, distant, mid-ground; the
// fence is the near layer) painted once in daylight colors, then graded for
// the time of day: golden-hour warmth or night, with atmospheric haze on
// distant layers and lights that switch on at night. Ambient life (clouds,
// birds, water shimmer, boats, flags, twinkling lights) is animated per frame.
// All buildings are original designs inspired by regional styles.
const SKYLINES = { bosphorus: 'Bosphorus Court', andalus: 'Andalus Court', atlas: 'Atlas Court', isfahan: 'Isfahan Court', nile: 'Nile Court', tropics: 'Tropics Court' };
Object.assign(BACKDROP_NAMES, SKYLINES);
const ALL_BACKDROPS = [...BACKDROPS, ...Object.keys(SKYLINES)];
VENUE_LIST.splice(VENUE_LIST.findIndex(v => v.kind === 'arena'), 0, ...Object.keys(SKYLINES).map(b => ({ id: 'out_' + b, kind: 'outdoor', backdrop: b, name: SKYLINES[b] })));
const LAYER_PF = { sky: 0.03, dist: 0.12, mid: 0.3 };
const HORIZON = 146;
function cacheRS() {
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  return clamp((window.devicePixelRatio || 1) * 1.55, 1, coarse ? 2 : 2.5);
}
function hiCanvas(w, h, rs, paint) { const c = makeCanvas(Math.ceil(w * rs), Math.ceil(h * rs)), g = c.getContext('2d'); g.scale(rs, rs); c.rs = rs; c.lw = w; c.lh = h; paint(g); return c; }
function blit(g, cv, x, y) { g.drawImage(cv, x, y, cv.lw || cv.width, cv.lh || cv.height); }
function layerX(cv, pf) { return W / 2 - cv.lw / 2 - (cam.x - (660 - W / 2)) * pf + FX.sx * pf; }
const SKY = {
  afternoon: { top: '#4d97d6', mid: '#8cc3ea', hor: '#dbeef7', haze: 'rgba(214,234,246,', sun: '#fff9e0' },
  sunset: { top: '#27305e', mid: '#c56a6a', hor: '#ffc27a', haze: 'rgba(255,190,130,', sun: '#ffd28a' },
  night: { top: '#050a1c', mid: '#0f1a38', hor: '#27325a', haze: 'rgba(40,52,90,', sun: '#fff3c4' }
};
// ---------------------------------------------------------------- painters
function smoothRidge(g, w, base, amp, f1, f2, seed, fill) {
  g.fillStyle = fill; g.beginPath(); g.moveTo(0, HORIZON + 40);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(x * f1 + seed) + 0.15 * Math.sin(x * f2 + seed * 2.3)));
  g.lineTo(w, HORIZON + 40); g.closePath(); g.fill();
}
function snowCaps(g, w, base, amp, f1, f2, seed, line) {
  g.save(); g.beginPath(); g.moveTo(0, 0);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(x * f1 + seed) + 0.15 * Math.sin(x * f2 + seed * 2.3)));
  g.lineTo(w, 0); g.closePath();
  g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = base - amp * (0.55 + 0.3 * Math.sin(x * f1 + seed) + 0.15 * Math.sin(x * f2 + seed * 2.3)); x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.lineTo(w, line); g.lineTo(0, line); g.closePath(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, 0, w, line); g.restore();
}
function vgrad(g, y0, y1, a, b) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function dome(g, cx, base, r, col, hi, finial = true, onion = false) {
  g.fillStyle = col; g.beginPath();
  if (onion) { g.moveTo(cx - r, base); g.bezierCurveTo(cx - r * 1.25, base - r * 0.9, cx - r * 0.2, base - r * 1.2, cx, base - r * 1.55); g.bezierCurveTo(cx + r * 0.2, base - r * 1.2, cx + r * 1.25, base - r * 0.9, cx + r, base); }
  else g.arc(cx, base, r, Math.PI, 0);
  g.closePath(); g.fill();
  if (hi) { g.fillStyle = hi; g.beginPath(); g.ellipse(cx - r * 0.35, base - r * 0.6, r * 0.18, r * 0.35, -0.5, 0, Math.PI * 2); g.fill(); }
  if (finial) { const ty = base - (onion ? r * 1.55 : r); g.strokeStyle = '#c9a24a'; g.lineWidth = Math.max(1, r * 0.06); g.beginPath(); g.moveTo(cx, ty); g.lineTo(cx, ty - r * 0.35); g.stroke(); crescent(g, cx, ty - r * 0.42, Math.max(2, r * 0.1), '#e8c35a'); }
}
function pencilMinaret(g, x, base, h, w, col, cap, balconies, L) {
  g.fillStyle = col; g.fillRect(x - w / 2, base - h, w, h);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + w * 0.15, base - h, w * 0.35, h);
  for (let i = 1; i <= balconies; i++) { const y = base - h * (0.45 + i * 0.18); g.fillStyle = col; g.fillRect(x - w * 0.95, y, w * 1.9, Math.max(2, w * 0.35)); if (L) L.push({ x, y: y + 1, r: w * 1.1, c: 'rgba(255,220,140,' }); }
  g.fillStyle = cap; g.beginPath(); g.moveTo(x - w * 0.6, base - h); g.lineTo(x, base - h - w * 3.2); g.lineTo(x + w * 0.6, base - h); g.closePath(); g.fill();
  crescent(g, x, base - h - w * 3.5, Math.max(1.5, w * 0.35), '#e8c35a');
}
function squareMinaret(g, x, base, h, w, col, carve, L) {
  g.fillStyle = col; g.fillRect(x - w / 2, base - h, w, h);
  g.strokeStyle = carve; g.lineWidth = 1;
  for (let y = base - h + 10; y < base - h * 0.35; y += w * 0.55) for (let k = 0; k < 3; k++) { const cx = x - w * 0.3 + k * w * 0.3; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + w * 0.12, y + w * 0.22); g.lineTo(cx, y + w * 0.44); g.lineTo(cx - w * 0.12, y + w * 0.22); g.closePath(); g.stroke(); }
  g.fillStyle = carve; g.fillRect(x - w / 2, base - h, w, 3);
  for (let k = 0; k < 5; k++) g.fillRect(x - w / 2 + k * w / 4.5, base - h - 5, w / 9, 5);
  g.fillStyle = col; g.fillRect(x - w * 0.22, base - h - 22, w * 0.44, 18); dome(g, x, base - h - 22, w * 0.22, carve, null, true);
  if (L) L.push({ x, y: base - h * 0.55, r: 5, c: 'rgba(255,210,140,' });
}
function cypress(g, x, base, h, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, base - h / 2, h * 0.12, h / 2, 0, 0, Math.PI * 2); g.fill(); }
function bush(g, x, base, r, col) { g.fillStyle = col; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + (k - 1) * r * 0.7, base - r * (k === 1 ? 1.1 : 0.8), r * (k === 1 ? 1 : 0.8), 0, Math.PI * 2); g.fill(); } }
function towers(g, x0, x1, base, hMin, hMax, cols, R, L, glass) {
  for (let x = x0; x < x1;) {
    const bw = 18 + R() * 30, bh = hMin + R() * (hMax - hMin), c = cols[Math.floor(R() * cols.length)];
    g.fillStyle = c; g.fillRect(x, base - bh, bw, bh + 4);
    if (glass) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + bw * 0.6, base - bh, bw * 0.4, bh); }
    if (R() < 0.25) { g.fillRect(x + bw / 2 - 1, base - bh - 10 - R() * 12, 2, 22); }
    for (let yy = base - bh + 5; yy < base - 4; yy += 7) for (let xx = x + 3; xx < x + bw - 3; xx += 6) if (R() < 0.35) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(xx, yy, 2.5, 3); if (L && R() < 0.5) L.push({ x: xx + 1, y: yy + 1.5, r: 1.6, c: 'rgba(255,225,150,' }); }
    x += bw + 2 + R() * 8;
  }
}
function homeMasjid(g, x, base, host, snow, L) {
  const wall = '#efe3c6', trim = host.c1;
  g.fillStyle = wall; g.fillRect(x, base - 46, 170, 46);
  g.fillStyle = shade(wall, -0.1); g.fillRect(x, base - 8, 170, 8);
  dome(g, x + 85, base - 46, 34, lerpColor(trim, '#ffffff', 0.15), 'rgba(255,255,255,0.3)');
  g.fillStyle = wall; g.fillRect(x + 186, base - 130, 16, 130); g.fillStyle = trim; g.fillRect(x + 182, base - 100, 24, 5);
  g.beginPath(); g.moveTo(x + 184, base - 130); g.lineTo(x + 194, base - 152); g.lineTo(x + 204, base - 130); g.fill(); crescent(g, x + 194, base - 158, 4, '#e8c35a');
  for (let i = 0; i < 4; i++) { const wx = x + 16 + i * 40; g.fillStyle = '#6d8aa0'; g.beginPath(); g.moveTo(wx, base - 10); g.lineTo(wx, base - 28); g.quadraticCurveTo(wx + 7, base - 38, wx + 14, base - 28); g.lineTo(wx + 14, base - 10); g.fill(); if (L) L.push({ x: wx + 7, y: base - 22, r: 6, c: 'rgba(255,215,140,' }); }
  if (snow) { g.fillStyle = '#fbfdff'; g.beginPath(); g.arc(x + 85, base - 46, 34, Math.PI * 1.15, Math.PI * 1.85); g.lineTo(x + 85, base - 70); g.fill(); g.fillRect(x - 2, base - 50, 174, 5); }
}
function waterBand(g, w, y0, y1, day, R) {
  g.fillStyle = vgrad(g, y0, y1, day[0], day[1]); g.fillRect(0, y0, w, y1 - y0);
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1;
  for (let y = y0 + 4; y < y1; y += 5) { g.beginPath(); for (let x = R() * 30; x < w; x += 40 + R() * 40) { g.moveTo(x, y); g.lineTo(x + 8 + R() * 14, y); } g.stroke(); }
}
function gradeLayer(g, w, h, time, haze) {
  const S = SKY[time];
  g.save(); g.globalCompositeOperation = 'source-atop';
  if (haze) { g.fillStyle = vgrad(g, 0, h, S.haze + (haze * 0.6) + ')', S.haze + haze + ')'); g.fillRect(0, 0, w, h); }
  if (time === 'sunset') { g.fillStyle = 'rgba(255,130,70,0.22)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(70,25,50,0.12)'; g.fillRect(0, 0, w, h); }
  if (time === 'night') { g.fillStyle = 'rgba(8,14,34,0.74)'; g.fillRect(0, 0, w, h); }
  g.restore();
}
function drawLights(g, list, time, boost = 1) {
  if (time !== 'night' && time !== 'sunset') return;
  const k = time === 'night' ? 1 : 0.35;
  for (const l of list) { const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 2.6); gr.addColorStop(0, l.c + (0.95 * k * boost) + ')'); gr.addColorStop(1, l.c + '0)'); g.fillStyle = gr; g.fillRect(l.x - l.r * 2.6, l.y - l.r * 2.6, l.r * 5.2, l.r * 5.2); }
}
// Paint one backdrop's distant and mid layers. Returns ambient config.
function paintBackdrop(b, dist, mid, W1, W2, host, R, time, snow) {
  const Ld = [], Lm = [], amb = { water: null, boats: [], glint: null, birds: true };
  const c = W2 / 2, H0 = HORIZON;
  const D = dist, Mg = mid;
  if (b === 'mountains' || b === 'snow') {
    smoothRidge(D, W1, H0 - 8, 70, 0.006, 0.017, 1.3, b === 'snow' ? '#9fb3c9' : '#8aa0b8'); snowCaps(D, W1, H0 - 8, 70, 0.006, 0.017, 1.3, H0 - 52);
    smoothRidge(D, W1, H0 + 4, 44, 0.009, 0.023, 4.1, b === 'snow' ? '#7f95ad' : '#667f98'); if (b === 'snow') snowCaps(D, W1, H0 + 4, 44, 0.009, 0.023, 4.1, H0 - 18);
    Mg.fillStyle = b === 'snow' ? '#eef4fa' : '#5c7a4a'; Mg.fillRect(0, H0 + 8, W2, 40);
    for (let x = 10; x < W2; x += 26 + R() * 30) { if (Math.abs(x - c + 40) < 150) continue; const s = 0.7 + R() * 0.6; pine(Mg, x, H0 + 14, s, false, b !== 'snow'); }
    homeMasjid(Mg, c - 150, H0 + 12, host, b === 'snow', Lm);
  } else if (b === 'city') {
    towers(D, 0, W1, H0 + 4, 40, 118, ['#a9b8c8', '#9fb0c2', '#b5c3d1', '#8ea2b8'], R, Ld, true);
    towers(Mg, 0, W2, H0 + 10, 20, 64, ['#7d8fa3', '#6f8398', '#8898aa'], R, Lm, false);
    Mg.fillStyle = '#6b8a5a'; for (let x = 20; x < W2; x += 60) bush(Mg, x, H0 + 14, 9, '#5f8a4a');
    homeMasjid(Mg, c - 150, H0 + 12, host, false, Lm);
  } else if (b === 'desert') {
    D.fillStyle = vgrad(D, H0 - 30, H0 + 30, '#eac48a', '#d9a86a'); D.beginPath(); D.moveTo(0, H0 + 30); for (let x = 0; x <= W1; x += 10) D.lineTo(x, H0 - 10 - 18 * Math.sin(x * 0.005) - 8 * Math.sin(x * 0.019)); D.lineTo(W1, H0 + 30); D.fill();
    Mg.fillStyle = vgrad(Mg, H0 - 10, H0 + 30, '#e3b271', '#cf9656'); Mg.beginPath(); Mg.moveTo(0, H0 + 30); for (let x = 0; x <= W2; x += 10) Mg.lineTo(x, H0 + 2 - 10 * Math.sin(x * 0.008 + 2)); Mg.lineTo(W2, H0 + 30); Mg.fill();
    for (let x = 30; x < W2; x += 110 + R() * 90) if (Math.abs(x - c + 40) > 170) palm(Mg, x, H0 + 12, 0.9 + R() * 0.4, false);
    homeMasjid(Mg, c - 150, H0 + 12, host, false, Lm);
  } else if (b === 'coast') {
    D.fillStyle = '#7fa0a0'; D.beginPath(); D.moveTo(0, H0); D.lineTo(0, H0 - 50); D.quadraticCurveTo(160, H0 - 70, 300, H0); D.fill();
    waterBand(Mg, W2, H0 - 6, H0 + 20, ['#3f86b8', '#5aa0c8'], R); amb.water = { y0: H0 - 4, y1: H0 + 18, pf: LAYER_PF.mid };
    Mg.fillStyle = '#ecd8a8'; Mg.fillRect(0, H0 + 18, W2, 30);
    for (let x = 40; x < W2; x += 170 + R() * 80) if (Math.abs(x - c + 40) > 170) palm(Mg, x, H0 + 22, 0.9, false);
    homeMasjid(Mg, c - 150, H0 + 22, host, false, Lm);
    amb.boats.push({ x: c + 260, y: H0 + 2, v: 5, kind: 'sail' });
  } else if (b === 'bosphorus') {
    // far shore: hills with houses and the grand masjid across the water
    D.fillStyle = '#8ea0a8'; D.beginPath(); D.moveTo(0, H0); for (let x = 0; x <= W1; x += 10) D.lineTo(x, H0 - 22 - 10 * Math.sin(x * 0.01)); D.lineTo(W1, H0); D.fill();
    for (let x = 0; x < W1; x += 9) if (R() < 0.6) { D.fillStyle = ['#c9b8a0', '#d8cbb4', '#b9a58e'][Math.floor(R() * 3)]; const hh = 5 + R() * 8, y = H0 - 14 - 10 * Math.sin(x * 0.01); D.fillRect(x, y - hh, 7, hh + 4); if (R() < 0.5) Ld.push({ x: x + 3, y: y - hh / 2, r: 1.8, c: 'rgba(255,220,150,' }); }
    const mx = W1 / 2 - 40, mb = H0 - 16, stone = '#cfc6b6', lead = '#8b9aa3';
    D.fillStyle = stone; D.fillRect(mx - 110, mb - 36, 220, 36);
    dome(D, mx - 70, mb - 36, 22, lead, null, false); dome(D, mx + 70, mb - 36, 22, lead, null, false);                    // half-dome cascade
    dome(D, mx - 40, mb - 48, 28, lead, null, false); dome(D, mx + 40, mb - 48, 28, lead, null, false);
    D.fillStyle = stone; D.fillRect(mx - 44, mb - 70, 88, 24); dome(D, mx, mb - 70, 44, lead, 'rgba(255,255,255,0.18)');
    for (let k = -3; k <= 3; k++) if (k) dome(D, mx + k * 14, mb - 70, 3.5, lead, null, false);
    for (const k of [-1, 1]) { dome(D, mx + k * 98, mb - 36, 9, lead, null, false); }
    for (const [dx, hh] of [[-130, 120], [-112, 104], [112, 104], [130, 120]]) pencilMinaret(D, mx + dx, mb, hh, 5, stone, lead, 2, Ld);
    waterBand(Mg, W2, H0 - 10, H0 + 26, ['#2f6f9a', '#4d8db4'], R); amb.water = { y0: H0 - 8, y1: H0 + 24, pf: LAYER_PF.mid };
    Mg.fillStyle = '#7b8f6a'; Mg.fillRect(0, H0 + 24, W2, 30); for (let x = 20; x < W2; x += 70) bush(Mg, x, H0 + 30, 8, '#5d7a4c');
    amb.boats.push({ x: c - 300, y: H0 + 4, v: 9, kind: 'ferry' }, { x: c + 200, y: H0 + 14, v: -6, kind: 'ferry' });
  } else if (b === 'andalus') {
    smoothRidge(D, W1, H0 - 18, 50, 0.007, 0.02, 2.2, '#8a9bb5'); smoothRidge(D, W1, H0 - 4, 30, 0.011, 0.03, 5.1, '#7688a2');
    const wall = '#d9a66a', x0 = c - 330, x1 = c + 250;
    Mg.fillStyle = wall; Mg.fillRect(x0, H0 - 44, x1 - x0, 60);
    for (let x = x0; x < x1; x += 14) Mg.fillRect(x, H0 - 52, 8, 8);                                                    // crenellations
    for (let x = x0 + 30; x < x1 - 30; x += 46) {                                                                     // horseshoe arches, striped voussoirs
      const ax = x + 18, ay = H0 - 8, r = 14;
      for (let k = 0; k < 12; k++) { const a0 = Math.PI * (1.2 - k * 0.12) , a1 = a0 - Math.PI * 0.12; Mg.fillStyle = k % 2 ? '#b03a2e' : '#f3e8d2'; Mg.beginPath(); Mg.arc(ax, ay, r + 6, -a0 + Math.PI * 2, -a1 + Math.PI * 2); Mg.arc(ax, ay, r, -a1 + Math.PI * 2, -a0 + Math.PI * 2, true); Mg.closePath(); Mg.fill(); }
      Mg.fillStyle = '#3a2a22'; Mg.beginPath(); Mg.arc(ax, ay, r, Math.PI * 0.85, Math.PI * 2.15); Mg.lineTo(ax + r * 0.9, H0 + 16); Mg.lineTo(ax - r * 0.9, H0 + 16); Mg.closePath(); Mg.fill();
      Lm.push({ x: ax, y: ay, r: 8, c: 'rgba(255,200,120,' });
    }
    Mg.fillStyle = wall; Mg.fillRect(c + 190, H0 - 110, 34, 126); for (let k = 0; k < 4; k++) Mg.fillRect(c + 188 + k * 10, H0 - 118, 6, 8);
    for (let x = 10; x < W2; x += 44 + R() * 40) if (x < x0 - 10 || x > x1 + 10) cypress(Mg, x, H0 + 18, 70 + R() * 40, '#2c4a32');
    Mg.fillStyle = '#9a8a5a'; Mg.fillRect(0, H0 + 16, W2, 30);
  } else if (b === 'atlas') {
    smoothRidge(D, W1, H0 - 26, 78, 0.005, 0.015, 0.7, '#a58f86'); snowCaps(D, W1, H0 - 26, 78, 0.005, 0.015, 0.7, H0 - 78);
    const terra = '#c8683e';
    Mg.fillStyle = terra; Mg.fillRect(0, H0 - 22, W2, 44);
    for (let x = 0; x < W2; x += 12) Mg.fillRect(x, H0 - 28, 7, 6);
    Mg.fillStyle = shade(terra, -0.15); for (let x = 30; x < W2; x += 90) { Mg.beginPath(); Mg.moveTo(x, H0 + 10); Mg.lineTo(x, H0 - 4); Mg.quadraticCurveTo(x + 9, H0 - 18, x + 18, H0 - 4); Mg.lineTo(x + 18, H0 + 10); Mg.fill(); Lm.push({ x: x + 9, y: H0 - 2, r: 7, c: 'rgba(255,190,110,' }); }
    squareMinaret(Mg, c - 60, H0 + 10, 150, 34, '#e0a36e', '#8a4a2a', Lm);
    for (let x = 20; x < W2; x += 120 + R() * 60) if (Math.abs(x - c + 60) > 90) palm(Mg, x, H0 + 20, 1 + R() * 0.3, false);
    Mg.fillStyle = '#b89060'; Mg.fillRect(0, H0 + 18, W2, 30);
  } else if (b === 'isfahan') {
    D.fillStyle = '#c9b89a'; D.beginPath(); D.moveTo(0, H0); for (let x = 0; x <= W1; x += 10) D.lineTo(x, H0 - 14 - 8 * Math.sin(x * 0.008)); D.lineTo(W1, H0); D.fill();
    const mx = c - 40, base = H0 + 2, sand = '#e6d3ac', tile = '#1f8a9a', deep = '#1b4f8a';
    Mg.fillStyle = sand; Mg.fillRect(mx - 200, base - 40, 400, 40);
    for (let x = mx - 196; x < mx + 196; x += 22) { Mg.fillStyle = deep; Mg.beginPath(); Mg.moveTo(x + 4, base - 6); Mg.lineTo(x + 4, base - 24); Mg.quadraticCurveTo(x + 11, base - 34, x + 18, base - 24); Mg.lineTo(x + 18, base - 6); Mg.fill(); }
    // iwan gateway with tile frame
    Mg.fillStyle = sand; Mg.fillRect(mx - 52, base - 120, 104, 120);
    Mg.fillStyle = tile; Mg.fillRect(mx - 52, base - 120, 104, 8); Mg.fillRect(mx - 52, base - 120, 8, 120); Mg.fillRect(mx + 44, base - 120, 8, 120);
    Mg.fillStyle = deep; Mg.beginPath(); Mg.moveTo(mx - 30, base); Mg.lineTo(mx - 30, base - 70); Mg.quadraticCurveTo(mx - 30, base - 100, mx, base - 108); Mg.quadraticCurveTo(mx + 30, base - 100, mx + 30, base - 70); Mg.lineTo(mx + 30, base); Mg.fill();
    Mg.fillStyle = 'rgba(242,207,107,0.6)'; for (let k = 0; k < 6; k++) { Mg.beginPath(); Mg.arc(mx, base - 70, 22 - k * 3, Math.PI, 0); Mg.strokeStyle = k % 2 ? '#e8c35a' : '#6fd0dc'; Mg.lineWidth = 1.2; Mg.stroke(); }
    Lm.push({ x: mx, y: base - 50, r: 14, c: 'rgba(255,210,140,' });
    // turquoise dome on a drum, patterned
    Mg.fillStyle = sand; Mg.fillRect(mx + 70, base - 86, 84, 46);
    dome(Mg, mx + 112, base - 86, 42, tile, 'rgba(255,255,255,0.25)');
    Mg.strokeStyle = 'rgba(242,207,107,0.7)'; Mg.lineWidth = 1; for (let k = 1; k < 6; k++) { Mg.beginPath(); Mg.arc(mx + 112, base - 86, 42 - k * 7, Math.PI, 0); Mg.stroke(); }
    for (const dx of [-80, 190]) pencilMinaret(Mg, mx + dx, base, 128, 8, tile, deep, 2, Lm);
    // long reflecting pool
    Mg.fillStyle = '#e8dcc2'; Mg.fillRect(0, base, W2, 40);
    Mg.fillStyle = vgrad(Mg, base + 6, base + 34, '#3f8fa8', '#64aec2'); Mg.fillRect(mx - 220, base + 6, 440, 26);
    Mg.save(); Mg.beginPath(); Mg.rect(mx - 220, base + 6, 440, 26); Mg.clip(); Mg.globalAlpha = 0.3; Mg.translate(0, base * 2 + 12); Mg.scale(1, -1);
    dome(Mg, mx + 112, base - 86 + 60, 42, tile, null, false); Mg.fillStyle = sand; Mg.fillRect(mx - 52, base - 60, 104, 60); Mg.restore();
    amb.water = { y0: base + 8, y1: base + 30, pf: LAYER_PF.mid, x0: mx - 220 - W2 / 2, x1: mx + 220 - W2 / 2 };
    amb.glint = { x: mx + 112 - W2 / 2, y: base - 110, r: 42 };
  } else if (b === 'nile') {
    for (let x = 0; x < W1; x += 38 + R() * 30) {                                                                    // many minarets and domes in golden haze
      const k = R(); D.fillStyle = '#c8b28a';
      if (k < 0.45) pencilMinaret(D, x, H0, 50 + R() * 50, 4 + R() * 2, '#c8b28a', '#b8a078', 1, Ld);
      else if (k < 0.8) { D.fillRect(x - 16, H0 - 22, 32, 22); dome(D, x, H0 - 22, 14 + R() * 8, '#bba27a', null, true); }
      else { D.fillRect(x - 12, H0 - 30 - R() * 20, 24, 60); }
    }
    waterBand(Mg, W2, H0 - 2, H0 + 26, ['#4f7f8a', '#6c98a0'], R); amb.water = { y0: H0, y1: H0 + 24, pf: LAYER_PF.mid };
    Mg.fillStyle = '#8a9a5a'; Mg.fillRect(0, H0 + 24, W2, 30);
    for (let x = 30; x < W2; x += 130 + R() * 70) palm(Mg, x, H0 + 30, 0.9, false);
    amb.boats.push({ x: c - 200, y: H0 + 8, v: 4, kind: 'felucca' }, { x: c + 240, y: H0 + 16, v: -3, kind: 'felucca' }, { x: c + 520, y: H0 + 6, v: 3.5, kind: 'felucca' });
  } else if (b === 'tropics') {
    towers(D, 0, W1, H0 - 2, 50, 130, ['#8fb2c6', '#9cc0d4', '#7fa3b8', '#a8c6d6'], R, Ld, true);
    waterBand(Mg, W2, H0 - 4, H0 + 22, ['#3f8a8c', '#5aa6a2'], R); amb.water = { y0: H0 - 2, y1: H0 + 20, pf: LAYER_PF.mid };
    const mx = c - 70, base = H0 - 2;
    Mg.fillStyle = '#f2e6d8'; Mg.fillRect(mx - 80, base - 34, 160, 34);
    for (let k = 0; k < 6; k++) { Mg.fillStyle = '#c98a9a'; Mg.beginPath(); Mg.moveTo(mx - 70 + k * 26, base - 4); Mg.lineTo(mx - 70 + k * 26, base - 22); Mg.quadraticCurveTo(mx - 62 + k * 26, base - 32, mx - 54 + k * 26, base - 22); Mg.lineTo(mx - 54 + k * 26, base - 4); Mg.fill(); Lm.push({ x: mx - 62 + k * 26, y: base - 16, r: 6, c: 'rgba(255,200,170,' }); }
    Mg.fillStyle = '#f2e6d8'; Mg.fillRect(mx - 28, base - 58, 56, 24);
    dome(Mg, mx, base - 58, 34, '#d98fa0', 'rgba(255,255,255,0.3)', true, true);                                   // rose-pink dome
    pencilMinaret(Mg, mx + 118, base, 124, 9, '#f2e6d8', '#d98fa0', 3, Lm);
    Mg.fillStyle = '#3f7a4a'; Mg.fillRect(0, H0 + 20, W2, 30);
    for (let x = 10; x < W2; x += 40 + R() * 40) { if (Math.abs(x - mx - 20) < 150) continue; R() < 0.5 ? palm(Mg, x, H0 + 26, 0.9 + R() * 0.3, false) : bush(Mg, x, H0 + 26, 10 + R() * 6, R() < 0.5 ? '#2f7a3a' : '#3f8a4a'); }
  }
  return { Ld, Lm, amb };
}
// ------------------------------------------------------ build + draw
function buildOutdoorLayers(L, v, host, R, rs) {
  const time = v.time, S = SKY[time], b = v.backdrop, W1 = 2100 + 1500 * LAYER_PF.dist, W2 = 2300 + 1500 * LAYER_PF.mid, W0 = 2100;
  L.sky = hiCanvas(W0, FLOOR_TOP, Math.min(rs, 1.5), g => {
    g.fillStyle = vgrad(g, 0, HORIZON + 10, S.top, S.hor); g.fillRect(0, 0, W0, FLOOR_TOP);
    const mg = g.createLinearGradient(0, 0, 0, HORIZON); mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(0.6, S.mid + '55'); mg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mg; g.fillRect(0, 0, W0, HORIZON);
    if (time === 'night') { const R2 = seededRng(9); for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,248,225,${0.25 + R2() * 0.6})`; g.fillRect(R2() * W0, R2() * HORIZON * 0.75, 1.3, 1.3); } crescent(g, W0 / 2 + 260, 42, 13, '#fff3c4'); }
    else { const sx = time === 'sunset' ? W0 / 2 + 170 : W0 / 2 + 330, sy = time === 'sunset' ? HORIZON - 14 : 34, gl = g.createRadialGradient(sx, sy, 4, sx, sy, time === 'sunset' ? 150 : 90);
      gl.addColorStop(0, time === 'sunset' ? 'rgba(255,220,150,0.9)' : 'rgba(255,255,235,0.8)'); gl.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gl; g.fillRect(sx - 160, sy - 160, 320, 320);
      g.fillStyle = S.sun; g.beginPath(); g.arc(sx, sy, time === 'sunset' ? 22 : 15, 0, Math.PI * 2); g.fill(); }
  });
  let res;
  L.dist = hiCanvas(W1, FLOOR_TOP, rs, gd => {
    L.mid = hiCanvas(W2, FLOOR_TOP, rs, gm => { res = paintBackdrop(b, gd, gm, W1, W2, host, R, time, b === 'snow'); gradeLayer(gm, W2, FLOOR_TOP, time, time === 'night' ? 0 : 0.12); drawLights(gm, res.Lm, time); });
    gradeLayer(gd, W1, FLOOR_TOP, time, time === 'night' ? 0.15 : 0.38); drawLights(gd, res.Ld, time, 0.8);
  });
  L.amb = res.amb; L.twinkle = time === 'night' ? res.Lm.concat(res.Ld).filter((_, i) => i % 3 === 0).slice(0, 30) : [];
  L.clouds = Array.from({ length: 5 }, (_, i) => ({ x: R() * W0, y: 18 + R() * 60, s: 0.6 + R() * 0.8, v: 3 + R() * 5 }));
  L.birds = null; L.birdT = 3 + R() * 6;
}
let _cloudSprite = null;
function cloudSprite() {
  if (_cloudSprite) return _cloudSprite;
  return (_cloudSprite = hiCanvas(160, 60, 1.5, g => { for (const [x, y, r] of [[40, 38, 22], [70, 28, 28], [104, 34, 24], [128, 40, 16], [84, 42, 22]]) { const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }));
}
function drawOutdoorBack(g, t, L, v) {
  const time = v.time, S = SKY[time];
  const Z = (broadcastOn() ? cam.zoom : 1) * (cam.clutchZ || 1), visTop = (broadcastOn() ? cam.fy : H / 2) - H / (2 * Z);
  const kS = clamp((FLOOR_TOP - Math.max(0, visTop) + 8) / (FLOOR_TOP + 8), 0.42, 1);
  g.fillStyle = S.top; g.fillRect(-3000, -3000, 8000, 3000 + FLOOR_TOP);
  g.save(); g.translate(W / 2, FLOOR_TOP); g.scale(kS, kS); g.translate(-W / 2, -FLOOR_TOP);
  g.fillStyle = S.top; g.fillRect(-3000, -3000, 8000, 3000);
  blit(g, L.sky, layerX(L.sky, LAYER_PF.sky), FX.sy * 0.1);
  // clouds drift slowly
  const cs = cloudSprite(), ca = time === 'night' ? 0.12 : time === 'sunset' ? 0.55 : 0.75;
  g.globalAlpha = ca;
  for (const c of L.clouds) { const x = ((c.x + t * c.v) % (L.sky.lw + 300)) - 150 + layerX(L.sky, LAYER_PF.sky); g.drawImage(cs, x, c.y, 160 * c.s, 60 * c.s * 0.8); }
  g.globalAlpha = 1;
  if (time === 'sunset') { g.fillStyle = 'rgba(255,170,110,0.12)'; g.fillRect(-200, 0, W + 400, HORIZON); }
  // birds cross now and then
  if (!L.birds && (L.birdT -= Game.rdt || 0.016) <= 0) L.birds = { x: -60, y: 40 + Math.random() * 50, n: 3 + rint(4), v: 60 + Math.random() * 30, dir: 1 };
  if (L.birds) {
    const B = L.birds; B.x += B.v * (Game.rdt || 0.016);
    g.strokeStyle = time === 'night' ? 'rgba(200,210,230,0.5)' : 'rgba(40,40,50,0.7)'; g.lineWidth = 1.3;
    for (let i = 0; i < B.n; i++) { const bx = B.x - i * 14, by = B.y + (i % 2) * 6 + Math.sin(t * 3 + i) * 2, w = 4 + Math.sin(t * 10 + i) * 2; g.beginPath(); g.moveTo(bx - 5, by - w * 0.5); g.quadraticCurveTo(bx - 2, by - w, bx, by); g.quadraticCurveTo(bx + 2, by - w, bx + 5, by - w * 0.5); g.stroke(); }
    if (B.x > W + 120) { L.birds = null; L.birdT = 8 + Math.random() * 10; }
  }
  const dx = layerX(L.dist, LAYER_PF.dist), mx = layerX(L.mid, LAYER_PF.mid);
  blit(g, L.dist, dx, FX.sy * 0.3);
  if (L.twinkle.length) for (let i = 0; i < L.twinkle.length; i += 2) { const l = L.twinkle[i], a = 0.4 + 0.4 * Math.sin(t * 2.3 + i * 1.7); g.fillStyle = `rgba(255,230,160,${a})`; g.fillRect(dx + l.x - 1, l.y - 1, 2, 2); }
  blit(g, L.mid, mx, FX.sy * 0.6);
  const A = L.amb;
  if (A.water) {                                                           // water shimmer
    const x0 = A.x0 != null ? mx + L.mid.lw / 2 + A.x0 : -200, x1 = A.x1 != null ? mx + L.mid.lw / 2 + A.x1 : W + 200;
    g.fillStyle = time === 'night' ? 'rgba(255,220,160,0.35)' : 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 26; i++) { const k = (i * 0.618) % 1, x = x0 + ((k * (x1 - x0) + t * 8 * (i % 2 ? 1 : -1)) % (x1 - x0) + (x1 - x0)) % (x1 - x0), y = A.y0 + ((i * 0.37) % 1) * (A.y1 - A.y0), a = Math.max(0, Math.sin(t * 2 + i * 2.1)); if (a < 0.2) continue; g.globalAlpha = a; g.fillRect(x, y, 6 + (i % 3) * 3, 1.2); }
    g.globalAlpha = 1;
  }
  for (const bt of A.boats) {                                              // ferries and sails drift across
    const span = L.mid.lw, x = mx + ((bt.x + t * bt.v) % span + span) % span, y = bt.y;
    const dark = time === 'night';
    if (bt.kind === 'ferry') { g.fillStyle = dark ? '#1a2230' : '#f2f2ee'; g.fillRect(x - 16, y - 7, 32, 7); g.fillStyle = dark ? '#2a3448' : '#34495e'; g.fillRect(x - 10, y - 12, 20, 5); g.fillStyle = '#c0392b'; g.fillRect(x - 2, y - 16, 4, 4); if (dark) { g.fillStyle = 'rgba(255,220,150,0.9)'; for (let k = -12; k < 14; k += 5) g.fillRect(x + k, y - 5, 2, 2); } }
    else { g.fillStyle = dark ? '#1a1a22' : '#5a3a22'; g.fillRect(x - 10, y - 3, 20, 3); g.fillStyle = dark ? 'rgba(200,200,210,0.5)' : '#fbf6ea'; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x, y - (bt.kind === 'felucca' ? 26 : 20)); g.lineTo(x + (bt.kind === 'felucca' ? 14 : 10), y - 4); g.closePath(); g.fill(); }
  }
  if (A.glint && time !== 'night') { const gx = mx + L.mid.lw / 2 + A.glint.x + Math.sin(t * 0.5) * A.glint.r * 0.6, gy = A.glint.y + Math.cos(t * 0.5) * 8, gr = g.createRadialGradient(gx, gy, 0, gx, gy, 9); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(gx - 9, gy - 9, 18, 18); }
  g.restore();
}
// flag by the fence in the host's colors, waving
function drawFenceFlag(g, t, host) {
  const [px, py] = [80 - cam.x + FX.sx, FLOOR_TOP + FX.sy];
  g.strokeStyle = '#6a7078'; g.lineWidth = 3; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - 118); g.stroke();
  g.fillStyle = host.c1; g.beginPath(); g.moveTo(px, py - 116);
  for (let k = 0; k <= 8; k++) g.lineTo(px + k * 5, py - 116 + Math.sin(t * 4 + k * 0.7) * 2.5 * (k / 8));
  for (let k = 8; k >= 0; k--) g.lineTo(px + k * 5, py - 94 + Math.sin(t * 4 + k * 0.7) * 2.5 * (k / 8));
  g.closePath(); g.fill(); g.fillStyle = host.c2; g.fillRect(px + 2, py - 107, 34, 3);
}

// ================================================================= CROWDS (v3.5)
// Full-figure fans for gyms and outdoor courts (standing, or seated on folding
// chairs), and varied arena fans (sizes, poses, signs, flags). `ex` (0..1) is
// excitement: fans stand, jump and throw their arms up on big plays.
const FAN_CLOTHES = ['#f7f7f2', '#2b3a55', '#5f7a5a', '#7d5a6b', '#4a3b2a', '#9c2f6e', '#1e5a4a', '#c26a1d', '#34495e', '#d9d4c7', '#6b3fa0', '#1f6fb2'];
function fanLook(m) {
  if (m.look) return m.look;
  const R = seededRng(m.seed), kid = R() < (m.kind === 'uncle' ? 0 : 0.18), hijab = !kid && R() < 0.3, thobe = !hijab && R() < 0.35;
  return (m.look = { R, kid, hijab, thobe, skin: SKINS[Math.floor(R() * SKINS.length)], top: FAN_CLOTHES[Math.floor(R() * FAN_CLOTHES.length)], pants: ['#2d2d38', '#3a3f4a', '#5a4632', '#23303f'][Math.floor(R() * 4)],
    head: hijab ? ['#2d2d4a', '#7a1f2b', '#e8e0d0', '#1e5a4a', '#c9a24a', '#5a3a6a'][Math.floor(R() * 6)] : R() < 0.45 ? (m.kind === 'uncle' ? '#f7f7f2' : ['#f7f7f2', '#2b2b2b', '#e8e0d0'][Math.floor(R() * 3)]) : null,
    beard: !kid && !hijab && R() < (m.kind === 'uncle' ? 1 : 0.5), grey: m.kind === 'uncle' || R() < 0.15, shoes: ['#f2f2f2', '#2a2a2a', '#8a5a3a'][Math.floor(R() * 3)] });
}
function drawFanFigure(g, m, x, y, bounce, ex, groan = 0) {
  const L = fanLook(m), s = m.s * (L.kid ? 0.72 : 1), seated = (m.kind === 'chair' || m.kind === 'uncle') && ex < 0.5;
  const up = ex > 0.45 && ((m.ph * 7) % 1) < ex;                          // arms up when excited
  const onHead = !up && groan > 0.25 && ((m.ph * 3.7) % 1) < groan;          // hands on head after a bad miss
  const jump = ex > 0.6 && !seated ? Math.abs(Math.sin(Game.t * 8 + m.ph)) * 5 * ex * s : 0;
  const O = 'rgba(20,14,10,0.85)';
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (m.kind === 'chair' || m.kind === 'uncle') {                          // folding chair (always there)
    g.strokeStyle = '#6d7782'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x - 8 * s, y); g.lineTo(x - 6 * s, y - 16 * s); g.lineTo(x + 7 * s, y - 16 * s); g.lineTo(x + 8 * s, y); g.moveTo(x + 6 * s, y - 16 * s); g.lineTo(x + 6 * s, y - 34 * s); g.stroke();
    g.fillStyle = '#7b8794'; g.fillRect(x - 8 * s, y - 18 * s, 16 * s, 3 * s); g.fillRect(x + 3 * s, y - 36 * s, 6 * s, 14 * s);
  }
  y -= bounce + jump;
  let hipY, shY, headY;
  if (seated) {
    hipY = y - 18 * s; shY = hipY - 20 * s; headY = shY - 8 * s;
    g.strokeStyle = O; g.lineWidth = 7.5 * s; g.beginPath(); g.moveTo(x - 3 * s, hipY); g.lineTo(x - 3 * s, y - 2 * s); g.moveTo(x + 3 * s, hipY); g.lineTo(x + 3 * s, y - 2 * s); g.stroke();
    g.strokeStyle = L.thobe ? L.top : L.pants; g.lineWidth = 5.5 * s; g.beginPath(); g.moveTo(x - 3 * s, hipY); g.lineTo(x - 3 * s, y - 2 * s); g.moveTo(x + 3 * s, hipY); g.lineTo(x + 3 * s, y - 2 * s); g.stroke();
  } else {
    hipY = y - 26 * s; shY = hipY - 22 * s; headY = shY - 8 * s;
    g.strokeStyle = O; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x - 3 * s, hipY); g.lineTo(x - 4 * s, y - 2 * s); g.moveTo(x + 3 * s, hipY); g.lineTo(x + 4 * s, y - 2 * s); g.stroke();
    g.strokeStyle = L.pants; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x - 3 * s, hipY); g.lineTo(x - 4 * s, y - 2 * s); g.moveTo(x + 3 * s, hipY); g.lineTo(x + 4 * s, y - 2 * s); g.stroke();
  }
  g.fillStyle = L.shoes; g.beginPath(); g.ellipse(x - 4.5 * s, y - 1.5 * s, 3.4 * s, 1.8 * s, 0, 0, Math.PI * 2); g.ellipse(x + 4.5 * s, y - 1.5 * s, 3.4 * s, 1.8 * s, 0, 0, Math.PI * 2); g.fill();
  // body (thobe / abaya reach the ankles when standing)
  const bodyBottom = (L.thobe || L.hijab) && !seated ? y - 5 * s : hipY + 3 * s;
  g.fillStyle = O; roundRect(g, x - 8 * s, shY - 1 * s, 16 * s, bodyBottom - shY + 2 * s, 5 * s); g.fill();
  g.fillStyle = L.hijab ? L.head : L.top; roundRect(g, x - 7 * s, shY, 14 * s, bodyBottom - shY, 4.5 * s); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.12)'; roundRect(g, x + 1.5 * s, shY, 5.5 * s, bodyBottom - shY, 3 * s); g.fill();
  // arms
  const armC = L.hijab ? L.head : L.top;
  const arm = (side) => { const sx = x + side * 6.5 * s, sy = shY + 3 * s; const ex2 = onHead ? x + side * 5 * s : up ? sx + side * 4 * s : sx + side * 2 * s, ey2 = onHead ? headY - 3 * s : up ? sy - 20 * s : sy + 16 * s;
    const mx = onHead ? sx + side * 7 * s : (sx + ex2) / 2, my = onHead ? sy - 9 * s : (sy + ey2) / 2;
    g.strokeStyle = O; g.lineWidth = 5.6 * s; g.beginPath(); g.moveTo(sx, sy); g.lineTo(mx, my); g.lineTo(ex2, ey2); g.stroke(); g.strokeStyle = armC; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(sx, sy); g.lineTo(mx, my); g.lineTo(ex2, ey2); g.stroke();
    g.fillStyle = L.skin; g.beginPath(); g.arc(ex2, ey2, 2.2 * s, 0, Math.PI * 2); g.fill(); };
  arm(-1); arm(1);
  // head
  g.fillStyle = O; g.beginPath(); g.arc(x, headY - 1 * s, 6.6 * s, 0, Math.PI * 2); g.fill();
  if (L.hijab) { g.fillStyle = L.head; g.beginPath(); g.arc(x, headY - 1 * s, 6.1 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = L.skin; g.beginPath(); g.ellipse(x, headY, 3.6 * s, 4.2 * s, 0, 0, Math.PI * 2); g.fill(); }
  else {
    g.fillStyle = L.skin; g.beginPath(); g.arc(x, headY - 1 * s, 5.6 * s, 0, Math.PI * 2); g.fill();
    if (L.beard) { g.fillStyle = L.grey ? '#dcdcdc' : '#2a1d14'; g.beginPath(); g.arc(x, headY + 0.5 * s, 5.4 * s, 0.1, Math.PI - 0.1); g.fill(); }
    if (L.head) { g.fillStyle = L.head; g.beginPath(); g.arc(x, headY - 2 * s, 5.8 * s, Math.PI, 0); g.fill(); }
    else { g.fillStyle = L.grey ? '#bdbdbd' : '#1a1410'; g.beginPath(); g.arc(x, headY - 2.4 * s, 5.6 * s, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
  }
  if (m.phone && !up) { g.fillStyle = '#111'; g.fillRect(x + 5 * s, shY - 2 * s, 4.5 * s, 7 * s); g.fillStyle = 'rgba(170,220,255,0.95)'; g.fillRect(x + 5.7 * s, shY - 1.3 * s, 3.1 * s, 5.4 * s); }
}
// arena fan: head + shoulders, with size/pose variety, signs and flags
function drawArenaFan(g, m, x, y, bounce, ex, groan = 0) {
  const R = seededRng(m.seed), s = m.s * (0.85 + R() * 0.3), top = CROWD_TOPS[Math.floor(R() * CROWD_TOPS.length)], skin = SKINS[Math.floor(R() * 8)], hd = R(), extra = R();
  y -= bounce;
  const up = ex > 0.4 && ((m.ph * 5) % 1) < ex * 0.8;
  if (!up && groan > 0.25 && ((m.ph * 3.7) % 1) < groan) { g.strokeStyle = top; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(x - 4 * s, y - 8 * s); g.lineTo(x - 6 * s, y - 15 * s); g.lineTo(x - 3 * s, y - 16 * s); g.moveTo(x + 4 * s, y - 8 * s); g.lineTo(x + 6 * s, y - 15 * s); g.lineTo(x + 3 * s, y - 16 * s); g.stroke(); }
  else if (up || extra < 0.06) { g.strokeStyle = top; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(x - 4 * s, y - 8 * s); g.lineTo(x - 7 * s, y - 20 * s); g.moveTo(x + 4 * s, y - 8 * s); g.lineTo(x + 7 * s, y - 20 * s); g.stroke(); }
  g.fillStyle = top; g.fillRect(x - 5 * s, y - 9 * s, 10 * s, 9 * s);
  g.fillStyle = hd < 0.3 ? ['#2d2d4a', '#e8e0d0', '#1e5a4a', '#7a1f2b'][Math.floor(R() * 4)] : skin; g.beginPath(); g.arc(x, y - 13 * s, 4.4 * s, 0, Math.PI * 2); g.fill();
  if (hd < 0.3) { g.fillStyle = skin; g.beginPath(); g.arc(x, y - 12.5 * s, 2.6 * s, 0, Math.PI * 2); g.fill(); }
  else if (hd < 0.55) { g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(x, y - 14 * s, 4.5 * s, Math.PI, 0); g.fill(); }
  else { g.fillStyle = '#1a1410'; g.beginPath(); g.arc(x, y - 14 * s, 4.5 * s, Math.PI, 0); g.fill(); }
  if (extra > 0.965) {                                                    // hand-made sign
    g.fillStyle = extra > 0.985 ? '#fff' : ['#f2cf6b', '#9dffb0', '#ffd0c0'][Math.floor(R() * 3)]; g.fillRect(x - 9 * s, y - 32 * s, 18 * s, 11 * s);
    g.strokeStyle = 'rgba(30,30,40,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 6 * s, y - 28 * s); g.lineTo(x + 6 * s, y - 28 * s); g.moveTo(x - 5 * s, y - 24 * s); g.lineTo(x + 4 * s, y - 24 * s); g.stroke();
  } else if (extra > 0.94) {                                              // small flag on a stick, colors vary
    const c = [['#1e5a4a', '#fff'], ['#c0392b', '#fff'], ['#2e86de', '#f1c40f'], ['#111', '#e8c35a']][Math.floor(R() * 4)];
    g.strokeStyle = '#ddd'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 3 * s, y - 10 * s); g.lineTo(x + 3 * s, y - 30 * s); g.stroke();
    const wv = Math.sin(Game.t * 5 + m.ph) * 1.5; g.fillStyle = c[0]; g.fillRect(x + 3 * s, y - 30 * s + wv * 0.3, 11 * s, 4 * s); g.fillStyle = c[1]; g.fillRect(x + 3 * s, y - 26 * s + wv * 0.3, 11 * s, 3 * s);
  }
}

