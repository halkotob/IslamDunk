// ====================================================== MASJID PROJECTS
// Halal Bucks build up Masjid Al-Amanah. All projects are cosmetic: masjid
// projects grow the community, gym projects change how the practice gym looks.
// No project changes stats or gameplay (see econSelfCheck).
const PROJECTS = {
  masjid: [
    { key: 'carpet', view: 'int', tiers: [['New carpet', 300, 'Fresh green carpet with straight saff lines. No more guessing where the row is.'],
      ['Premium carpet', 900, 'Deep red carpet woven with a prayer arch for every place in the row.']] },
    { key: 'musalla', view: 'ext', tiers: [['Expand the musalla', 800, 'Open up the old storage room. More rows for Jumu\u2019ah and more families visiting.'],
      ['Grand musalla', 2500, 'A high ceiling, columns, and room for the whole community on Eid.']] },
    { key: 'chandelier', view: 'int', tiers: [['Chandelier', 600, 'A brass chandelier to replace the office lights.'], ['Crystal chandeliers', 1600, 'Three crystal chandeliers that glow through the windows at night.']] },
    { key: 'mihrab', view: 'int', tiers: [['Tiled mihrab', 700, 'A tiled mihrab niche facing the qiblah.'], ['Carved minbar', 1200, 'A carved wooden minbar for the Jumu\u2019ah khutbah.']] },
    { key: 'callig', view: 'int', tiers: [['Calligraphy panels', 500, 'Two calligraphy panels beside the mihrab.'], ['Calligraphy frieze', 1400, 'A frieze across the qiblah wall and the outside of the masjid.']] },
    { key: 'dome', view: 'ext', tiers: [['Dome', 2500, 'A green and gold dome over the musalla.']] },
    { key: 'minaret', view: 'ext', tiers: [['Minaret', 2000, 'A minaret the neighborhood can see from the main road.']] },
    { key: 'garden', view: 'ext', tiers: [['Trees and garden', 400, 'Trees, hedges and flower beds where there used to be patchy grass.'], ['Fountain courtyard', 1200, 'A courtyard with a fountain where families gather after salah.']] },
    { key: 'parking', view: 'ext', tiers: [['Paved lot', 500, 'Paved and striped. The uncles finally stop double parking.'], ['Expanded lot', 1500, 'A second lot for Jumu\u2019ah and Eid crowds.']] }
  ],
  gym: [
    { key: 'hoops', view: 'gym', tiers: [['New hoop and net', 250, 'Glass backboard and a fresh net. The left rim stays bent, for history.', null]] },
    { key: 'floor', view: 'gym', tiers: [['Refinished floor', 600, 'Sanded and sealed, clean lines, and the Al-Amanah logo at center court.', null]] },
    { key: 'lights', view: 'gym', tiers: [['LED lighting', 350, 'Bright, steady panels. No more flickering tube over the free throw line.', null]] },
    { key: 'bleachers', view: 'gym', tiers: [['Bleachers', 700, 'Seats so the community can watch practice.', null]] },
    { key: 'scoreboard', view: 'gym', tiers: [['Scoreboard', 500, 'A real scoreboard for practice games.', null]] },
    { key: 'trophy', view: 'gym', tiers: [['Trophy case', 400, 'A glass case that shows every tournament you win.', null]] },
    { key: 'fountain', view: 'gym', tiers: [['Water fountain', 200, 'Cold water between drills.', null]] }
  ]
};
const ALL_PROJECTS = [...PROJECTS.masjid, ...PROJECTS.gym];
function upOf(U, k) { return U[k] || 0; }
function masjidLevel(U = C.up) { return PROJECTS.masjid.reduce((s, p) => s + upOf(U, p.key), 0); }   // 0..16, drives the community size
// Halal Bucks projects are purely cosmetic: no gameplay bonuses.
function buyProject(p) {
  const lvl = upOf(C.up, p.key); if (lvl >= p.tiers.length) return;
  const cost = p.tiers[lvl][1];
  if (C.hb < cost) { SFX.bad(); return; }
  C.hb -= cost; C.up[p.key] = lvl + 1; SFX.good(); SFX.cheer(0.5);
  if (p.view === 'gym') buildGymFloor();
  saveCareer();
}

// ------------------------------------------------------ PEOPLE (static)
// Seen from behind, standing in rows or sitting; never animated at prayer.
function drawMusalli(g, x, y, s, R, sitting) {
  const thobes = ['#f7f7f2', '#ddd4c2', '#9aa7b3', '#2b3a55', '#4a3b2a', '#5f7a5a', '#e8e0d0'], skins = SKINS;
  const body = thobes[Math.floor(R() * thobes.length)], cap = R();
  const bh = (sitting ? 20 : 40) * s, bw = 20 * s;
  g.fillStyle = body; roundRect(g, x - bw / 2, y - bh, bw, bh, 6 * s); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = skins[Math.floor(R() * skins.length)]; g.beginPath(); g.arc(x, y - bh - 7 * s, 7 * s, 0, Math.PI * 2); g.fill();
  g.fillStyle = cap < 0.5 ? '#f7f7f2' : cap < 0.7 ? '#1c1c1c' : cap < 0.85 ? '#2f4f7f' : HAIRS[Math.floor(R() * 3)];
  g.beginPath(); g.arc(x, y - bh - 8 * s, 7 * s, Math.PI, 0); g.fill();
}
function drawPerson(g, x, y, s, R) {    // community member outside, front view
  const kind = R(), skin = SKINS[Math.floor(R() * SKINS.length)];
  const col = ['#f7f7f2', '#2b3a55', '#5f7a5a', '#7d5a6b', '#4a3b2a', '#9c2f6e', '#1e5a4a', '#c26a1d'][Math.floor(R() * 8)];
  const kid = kind > 0.8, h = (kid ? 22 : 34) * s;
  g.fillStyle = col; roundRect(g, x - 6 * s, y - h, 12 * s, h, 4 * s); g.fill();
  g.fillStyle = skin; g.beginPath(); g.arc(x, y - h - 5 * s, 5 * s, 0, Math.PI * 2); g.fill();
  if (kind < 0.4) { g.fillStyle = ['#2d2d4a', '#7a1f2b', '#e8e0d0', '#1e5a4a', '#c9a24a'][Math.floor(R() * 5)]; g.beginPath(); g.arc(x, y - h - 5 * s, 6.2 * s, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.fillRect(x - 6.2 * s, y - h - 5 * s, 12.4 * s, 6 * s); g.fillStyle = skin; g.beginPath(); g.arc(x, y - h - 4 * s, 3.4 * s, 0, Math.PI * 2); g.fill(); }
  else if (kind < 0.75) { g.fillStyle = '#f7f7f2'; g.beginPath(); g.arc(x, y - h - 6 * s, 5 * s, Math.PI, 0); g.fill(); }
}
// Community in the gym: along the near side, standing or on bleachers
function drawGymSpectators(g, U, y0) {
  if (!C) return;
  const lvl = masjidLevel(U), R = seededRng(7);
  const n = U.bleachers ? Math.min(26, 5 + lvl * 1.4) : Math.min(8, 1 + Math.floor(lvl / 2));
  if (U.bleachers) {
    for (let r = 0; r < 3; r++) { g.fillStyle = r % 2 ? '#8a9098' : '#9aa0a8'; g.fillRect(0, y0 + 22 + r * 24, W, 7); }
  }
  for (let i = 0; i < n; i++) {
    const wx = 420 + ((i * 97) % 900), row = U.bleachers ? i % 3 : 0;
    const x = wx - cam.x * (U.bleachers ? 1 : 1) + FX.sx, y = y0 + (U.bleachers ? 40 + row * 24 : 70) + Math.sin(Game.t * 2 + i) * 0.6;
    if (x < -20 || x > W + 20) continue;
    drawMusalli(g, x, y + (U.bleachers ? 0 : 20), U.bleachers ? 0.9 : 1.1, R, U.bleachers);
  }
}

// ------------------------------------------------------- MASJID OUTSIDE
function sceneBox(g, x, y, w, h, fn) { g.save(); g.translate(x, y); g.scale(w / W, h / H); g.beginPath(); g.rect(0, 0, W, H); g.clip(); fn(); g.restore(); }
function drawExterior(g, U, t) {
  const lvl = masjidLevel(U), R = seededRng(11);
  const sky = g.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#7fb8e0'); sky.addColorStop(1, '#e9f3fa');
  g.fillStyle = sky; g.fillRect(0, 0, W, 420);
  g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [cx, cy, r] of [[140, 80, 26], [175, 72, 32], [210, 84, 22], [700, 60, 22], [735, 54, 28]]) { g.beginPath(); g.arc(cx + Math.sin(t * 0.05) * 10, cy, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#b9c7cf'; for (let i = 0; i < 14; i++) { const bx = i * 72, bh = 40 + ((i * 37) % 60); g.fillRect(bx, 400 - bh, 64, bh); }
  // lawn and sidewalk
  g.fillStyle = upOf(U, 'garden') ? '#5f9e45' : '#9aa56a'; g.fillRect(0, 392, W, 70);
  if (!upOf(U, 'garden')) { g.fillStyle = '#a8906a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(80 + i * 105, 420 + (i % 3) * 12, 30, 7, 0, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = '#c9c4ba'; g.fillRect(0, 462, W, 16); g.fillStyle = '#4b4f55'; g.fillRect(0, 478, W, 62);
  g.fillStyle = '#e8e2d4'; for (let x = 20; x < W; x += 80) g.fillRect(x, 508, 40, 4);
  // parking: gravel, paved, then a second lot
  const pk = upOf(U, 'parking'), lots = pk === 2 ? [[20, 250], [740, 200]] : [[20, pk ? 250 : 190]];
  const cap = lots.reduce((s, l) => s + Math.floor(l[1] / 44) * 2, 0), cars = Math.min(cap, 2 + Math.round(lvl * 1.2));
  const carCols = ['#c0392b', '#e8ecf0', '#2c3e50', '#7f8c8d', '#2e86de', '#16a085', '#f1c40f', '#8e44ad', '#1c1c1c'];
  let placed = 0;
  for (const [lx, lw] of lots) {
    g.fillStyle = pk ? '#55595f' : '#b5aa98'; g.fillRect(lx, 380, lw, 84);
    if (pk) { g.strokeStyle = '#f4f4ef'; g.lineWidth = 2; for (let x = lx + 4; x <= lx + lw; x += 44) { g.beginPath(); g.moveTo(x, 382); g.lineTo(x, 418); g.moveTo(x, 426); g.lineTo(x, 462); g.stroke(); } }
    for (let r = 0; r < 2; r++) for (let x = lx + 8; x + 36 <= lx + lw && placed < cars; x += 44) {
      const cy = 400 + r * 44, col = carCols[Math.floor(R() * carCols.length)]; placed++;
      g.fillStyle = col; roundRect(g, x, cy - 10, 34, 18, 5); g.fill(); g.fillStyle = 'rgba(160,200,230,0.8)'; g.fillRect(x + 8, cy - 7, 18, 6);
      g.fillStyle = '#1c1c1c'; g.fillRect(x + 3, cy + 7, 8, 3); g.fillRect(x + 23, cy + 7, 8, 3);
    }
  }
  // the building grows with the musalla
  const ms = upOf(U, 'musalla'), bw = [240, 330, 420][ms], bh = [130, 150, 175][ms], x0 = pk === 2 ? 320 : 300, top = 392 - bh;
  const wall = ms ? '#efe3c6' : '#b8735a';
  if (upOf(U, 'minaret')) {
    const mx = x0 + bw + 26;
    g.fillStyle = '#efe3c6'; g.fillRect(mx, 392 - 250, 30, 250); g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.strokeRect(mx, 392 - 250, 30, 250);
    g.fillStyle = '#1e7a4c'; g.fillRect(mx - 6, 392 - 200, 42, 8); g.fillRect(mx - 6, 392 - 120, 42, 6);
    g.beginPath(); g.moveTo(mx - 4, 392 - 250); g.lineTo(mx + 15, 392 - 292); g.lineTo(mx + 34, 392 - 250); g.closePath(); g.fillStyle = '#1e7a4c'; g.fill();
    crescent(g, mx + 15, 392 - 302, 6, '#e8c35a');
    g.fillStyle = '#2c3e50'; for (let y = 392 - 236; y < 392 - 130; y += 30) g.fillRect(mx + 11, y, 8, 14);
  }
  g.fillStyle = wall; g.fillRect(x0, top, bw, bh);
  g.fillStyle = ms ? '#1e7a4c' : '#6b4a3a'; g.fillRect(x0 - 6, top - 8, bw + 12, 10);
  if (!ms) { g.strokeStyle = 'rgba(80,40,20,0.25)'; g.lineWidth = 1; for (let y = top + 8; y < 392; y += 8) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + bw, y); g.stroke(); } }
  if (upOf(U, 'dome')) {
    const cx = x0 + bw / 2, r = bw * 0.24;
    g.fillStyle = '#efe3c6'; g.fillRect(cx - r - 6, top - 26, r * 2 + 12, 20);
    const dg = g.createLinearGradient(cx - r, 0, cx + r, 0); dg.addColorStop(0, '#16603c'); dg.addColorStop(0.5, '#2e9a64'); dg.addColorStop(1, '#16603c');
    g.fillStyle = dg; g.beginPath(); g.moveTo(cx - r, top - 26); g.quadraticCurveTo(cx - r, top - 26 - r * 1.3, cx, top - 26 - r * 1.35); g.quadraticCurveTo(cx + r, top - 26 - r * 1.3, cx + r, top - 26); g.closePath(); g.fill();
    g.strokeStyle = '#e8c35a'; g.lineWidth = 2; g.stroke();
    crescent(g, cx, top - 36 - r * 1.35, 7, '#e8c35a');
  }
  // windows: arched once renovated, warm when chandeliers are in
  const glow = upOf(U, 'chandelier'), nw = [3, 4, 5][ms];
  for (let i = 0; i < nw; i++) {
    const wx = x0 + (bw / (nw + 1)) * (i + 1) - 12, wy = top + 30;
    g.fillStyle = glow ? (glow > 1 ? '#ffe39a' : '#f5d98a') : '#8fa9ba';
    if (ms) { g.beginPath(); g.moveTo(wx, wy + 50); g.lineTo(wx, wy + 14); g.quadraticCurveTo(wx + 12, wy - 6, wx + 24, wy + 14); g.lineTo(wx + 24, wy + 50); g.closePath(); g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.stroke(); }
    else { g.fillRect(wx, wy + 6, 24, 36); g.strokeStyle = '#f4f4ef'; g.lineWidth = 2; g.strokeRect(wx, wy + 6, 24, 36); }
  }
  // door and sign
  const dx = x0 + bw / 2 - 20;
  g.fillStyle = ms ? '#6b4a2b' : '#5a5f66';
  if (ms) { g.beginPath(); g.moveTo(dx, 392); g.lineTo(dx, 350); g.quadraticCurveTo(dx + 20, 322, dx + 40, 350); g.lineTo(dx + 40, 392); g.closePath(); g.fill(); }
  else g.fillRect(dx, 344, 40, 48);
  if (upOf(U, 'callig') >= 2) {
    g.fillStyle = '#1e5a4a'; g.fillRect(x0 + 10, top + 6, bw - 20, 20);
    g.fillStyle = '#f2cf6b'; g.font = `15px ${AR_FONT}`; g.textAlign = 'center'; g.fillText('\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0640\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650', x0 + bw / 2, top + 21);
  }
  const sgx = drawExterior.signX || x0 + bw / 2;     // the career intro moves the sign beside its path
  g.fillStyle = '#1e5a4a'; g.fillRect(sgx - 90, 432, 180, 26); g.fillStyle = '#6b4a2b'; g.fillRect(sgx - 4, 458, 8, 6);
  g.fillStyle = '#f2cf6b'; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText('MASJID AL-AMANAH', sgx, 450);
  // landscaping
  const gd = upOf(U, 'garden');
  if (gd) {
    for (const tx of [x0 - 18, x0 + bw + (upOf(U, 'minaret') ? 76 : 20), 900, 60]) tree(g, tx, 392, 1);
    g.fillStyle = '#3f7d34'; g.fillRect(x0 - 10, 380, bw + 20, 12);
    g.fillStyle = '#e46a8a'; for (let x = x0; x < x0 + bw; x += 14) { g.beginPath(); g.arc(x, 378, 3, 0, Math.PI * 2); g.fill(); }
  }
  if (gd >= 2) {
    const fx = pk === 2 ? 640 : 820, fy = 430;
    g.fillStyle = '#d9d0bb'; g.beginPath(); g.ellipse(fx, fy, 60, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7ec8e8'; g.beginPath(); g.ellipse(fx, fy - 2, 50, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d9d0bb'; g.fillRect(fx - 5, fy - 30, 10, 28);
    g.strokeStyle = 'rgba(160,215,240,0.9)'; g.lineWidth = 2;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(fx, fy - 30); g.quadraticCurveTo(fx + s * 20, fy - 46 - Math.sin(t * 6) * 2, fx + s * 34, fy - 6); g.stroke(); }
  }
  // community members around the building
  const people = Math.min(34, 3 + Math.round(lvl * 1.9));
  for (let i = 0; i < people; i++) {
    const px = 30 + ((i * 131 + 57) % 900), py = 470 + ((i * 7) % 3) * 4 + (px > x0 && px < x0 + bw ? 0 : 0);
    drawPerson(g, px, py, 0.9 + ((i * 13) % 3) * 0.08, R);
  }
}
function crescent(g, x, y, r, col) {
  g.save(); g.beginPath(); g.rect(x - 3 * r, y - 3 * r, 6 * r, 6 * r); g.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2); g.clip('evenodd');
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.restore();
}
function tree(g, x, y, s) {
  g.fillStyle = '#6b4a2b'; g.fillRect(x - 4 * s, y - 40 * s, 8 * s, 40 * s);
  g.fillStyle = '#2f7a3a'; for (const [dx, dy, r] of [[0, -58, 22], [-16, -46, 16], [16, -46, 16]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); }
}

// ------------------------------------------------------- MUSALLA INSIDE
// mode: 'visit' (a few people sitting) or 'salah' (rows standing, still).
function drawMusalla(g, U, mode, t) {
  const lvl = masjidLevel(U), ms = upOf(U, 'musalla'), R = seededRng(23);
  const bx0 = [280, 200, 110][ms], bx1 = W - bx0, by0 = [120, 96, 60][ms], by1 = 300;
  // ceiling, side walls, back (qiblah) wall
  g.fillStyle = ms ? '#f4ecd8' : '#e2dccd'; g.fillRect(0, 0, W, H);
  g.fillStyle = ms ? '#e9dfc4' : '#d4ccba';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(bx0, by0); g.lineTo(bx0, by1); g.lineTo(0, H); g.fill();
  g.beginPath(); g.moveTo(W, 0); g.lineTo(bx1, by0); g.lineTo(bx1, by1); g.lineTo(W, H); g.fill();
  g.fillStyle = ms ? '#fbf5e6' : '#ebe5d6'; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  g.fillStyle = '#f7f1e3'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(bx1, by0); g.lineTo(bx0, by0); g.fill();
  // side windows once the room is renovated
  if (ms) for (const side of [-1, 1]) for (let i = 0; i < ms + 1; i++) {
    const k = 0.25 + i * 0.28, wx = side < 0 ? lerp(0, bx0, k) : lerp(W, bx1, k), wy0 = lerp(40, by0 + 20, k), wy1 = lerp(330, by1 - 60, k);
    g.fillStyle = 'rgba(180,215,235,0.8)'; g.fillRect(wx - 10 * (1 - k * 0.6), wy0, 20 * (1 - k * 0.6), wy1 - wy0);
  }
  if (ms >= 2) { g.fillStyle = '#e4d6b4'; for (const x of [bx0 + 70, bx1 - 90]) { g.fillRect(x, by0, 20, by1 - by0); } for (const x of [180, W - 200]) g.fillRect(x, 60, 26, 380); }
  // carpet with prayer rows
  const cp = upOf(U, 'carpet');
  musallaCarpet(g, bx0, bx1, by1, cp);
  const rowY = k => lerp(by1, H, k * k);
  // mihrab and minbar
  const mh = upOf(U, 'mihrab'), cx = W / 2, mw = 70, mTop = by0 + 36;
  musallaMihrab(g, cx, mTop, by1, mw, mh);
  if (mh >= 2) {
    const mx = cx + mw / 2 + 18;
    g.fillStyle = '#7a4f2a'; g.beginPath(); g.moveTo(mx, by1); g.lineTo(mx + 70, by1); g.lineTo(mx + 70, by1 - 90); g.lineTo(mx + 58, by1 - 90); g.lineTo(mx, by1 - 20); g.closePath(); g.fill();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#5e3c1f'; for (let i = 0; i < 5; i++) g.fillRect(mx + 6 + i * 11, by1 - 18 - i * 14, 12, 4);
    g.fillStyle = '#7a4f2a'; g.fillRect(mx + 56, by1 - 128, 16, 38); g.beginPath(); g.moveTo(mx + 54, by1 - 128); g.lineTo(mx + 64, by1 - 146); g.lineTo(mx + 74, by1 - 128); g.fill();
  }
  // calligraphy
  const cl = upOf(U, 'callig');
  if (cl) for (const [x, txt] of [[cx - 150, '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650'], [cx + 150, '\u0671\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0644\u0650\u0644\u0651\u064e\u0647\u0650']]) {
    g.fillStyle = '#1e5a4a'; g.beginPath(); g.arc(x, by0 + 90, 38, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#f2cf6b'; g.font = `17px ${AR_FONT}`; g.textAlign = 'center'; g.fillText(txt, x, by0 + 96);
  }
  if (cl >= 2) {   // Quran 4:103: prayer is prescribed for the believers at fixed times
    g.fillStyle = '#1e5a4a'; g.fillRect(bx0 + 10, by0 + 8, bx1 - bx0 - 20, 26);
    g.fillStyle = '#f2cf6b'; g.font = `17px ${AR_FONT}`; g.textAlign = 'center';
    g.fillText('\u0625\u0650\u0646\u0651\u064e \u0671\u0644\u0635\u0651\u064e\u0644\u064e\u0648\u0670\u0629\u064e \u0643\u064e\u0627\u0646\u064e\u062a\u0652 \u0639\u064e\u0644\u064e\u0649 \u0671\u0644\u0652\u0645\u064f\u0624\u0652\u0645\u0650\u0646\u0650\u064a\u0646\u064e \u0643\u0650\u062a\u064e\u0640\u0670\u0628\u064b\u0627 \u0645\u0651\u064e\u0648\u0652\u0642\u064f\u0648\u062a\u064b\u0627', cx, by0 + 27);
  }
  // chandeliers
  const ch = upOf(U, 'chandelier');
  const chand = (x, y, big) => {
    g.strokeStyle = '#8a6d2c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - 14); g.stroke();
    const gl = g.createRadialGradient(x, y, 4, x, y, big ? 110 : 70); gl.addColorStop(0, 'rgba(255,230,160,0.55)'); gl.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y, big ? 110 : 70, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, big ? 44 : 30, big ? 10 : 7, 0, 0, Math.PI * 2); g.stroke();
    const n = big ? 10 : 6;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, px = x + Math.cos(a) * (big ? 44 : 30), py = y + Math.sin(a) * (big ? 10 : 7); g.fillStyle = '#fff5d6'; g.beginPath(); g.arc(px, py - 4, 3, 0, Math.PI * 2); g.fill(); if (big) { g.fillStyle = 'rgba(220,240,255,0.8)'; g.fillRect(px - 1, py + 2, 2, 8 + Math.sin(t * 3 + i) * 1.5); } }
  };
  if (ch === 1) chand(cx, by0 - 6, false);
  if (ch >= 2) { chand(cx, by0 - 4, true); chand(cx - 250, by0 * 0.8, false); chand(cx + 250, by0 * 0.8, false); }
  musallaDetails(g, bx0, bx1, by0, by1, t);
  // people: rows standing still for salah, or a few sitting when visiting
  const rows = [2, 3, 4][ms], perRow = [8, 11, 14][ms];
  const total = mode === 'salah' ? Math.min(rows * perRow, 5 + lvl * 3) : 0;   // talk scene: no seated extras (they read as stray figures by the cast)
  let k = 0;
  for (let r = 0; r < rows && k < total; r++) {
    const y = mode === 'salah' ? rowY((r + 1.2) / (rows + 1.6)) + 30 : by1 + 14 + r * 8, s = mode === 'salah' ? 0.8 + ((y - by1) / (H - by1)) * 1.4 : 0.72;   // visitors sit at the back, behind the people you talk to
    const xl = lerp(bx0, 0, (y - by1) / (H - by1)) + 30, xr = lerp(bx1, W, (y - by1) / (H - by1)) - 30;
    for (let i = 0; i < perRow && k < total; i++) {
      if (mode !== 'salah' && R() < 0.55) continue;
      const x = mode === 'salah' ? lerp(xl, xr, (i + 0.5) / perRow) : lerp(xl, xr, R());
      drawMusalli(g, x, y, s, R, mode !== 'salah'); k++;
    }
  }
}

// ------------------------------------------------------------ SCREENS
function drawGymScene(g, U, t) {
  const cx = cam.x; cam.x = 420;
  drawGymBack(g, t, U); g.drawImage(gymFloorFor(U), -120 - cam.x, FLOOR_TOP); drawGymNear(g, U);
  drawGymHoopBack(g, hoops[1], U); drawHoopFront(g, hoops[1], U);
  cam.x = cx;
}
function drawPreview(g, p, U, x, y, w, h) {
  sceneBox(g, x, y, w, h, () => {
    if (p.view === 'ext') drawExterior(g, U, Game.t);
    else if (p.view === 'int') drawMusalla(g, U, 'visit', Game.t);
    else drawGymScene(g, U, Game.t);
  });
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
}
function shopItems() { return PROJECTS[Game.shopTab || 'masjid']; }
function shopUpdate() {
  const items = shopItems(), n = items.length;
  if (menuHit('left') || menuHit('right')) { Game.shopTab = Game.shopTab === 'gym' ? 'masjid' : 'gym'; Game.idx = 0; SFX.blip(); return; }
  if (menuHit('up')) { Game.idx = (Game.idx + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { Game.idx = (Game.idx + 1) % n; SFX.blip(); }
  if (menuHit('ok')) buyProject(items[Game.idx]);
  if (menuHit('back')) careerHub();
}
function drawShop(g) {
  const tab = Game.shopTab || 'masjid', items = shopItems(), sel = items[Math.min(Game.idx, items.length - 1)];
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Masjid projects', 104, 34);
  g.fillStyle = '#9dffb0'; g.font = `16px ${FONT}`; g.textAlign = 'right'; g.fillText(C.hb + ' Halal Bucks', W - 30, 42);
  ['masjid', 'gym'].forEach((t, i) => {
    const x = 30 + i * 150, on = tab === t;
    g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, x, 56, 140, 30, 15); g.fill();
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText(t === 'masjid' ? 'Masjid' : 'Gym', x + 70, 76);
    addRect(x, 56, 140, 30, () => { Game.shopTab = t; Game.idx = 0; });
  });
  items.forEach((p, i) => {
    const y = 98 + i * 42, lvl = upOf(C.up, p.key), done = lvl >= p.tiers.length, tier = p.tiers[Math.min(lvl, p.tiers.length - 1)], on = p === sel;
    g.fillStyle = on ? 'rgba(232,195,90,0.2)' : 'rgba(8,16,24,0.78)'; roundRect(g, 30, y, 330, 36, 8); g.fill();
    g.textAlign = 'left'; g.fillStyle = done ? '#9fb3c8' : '#fff'; g.font = `13px ${on ? FONT : BODY}`; g.fillText(done ? p.tiers[p.tiers.length - 1][0] : tier[0], 44, y + 23);
    g.textAlign = 'right'; g.font = `12px ${FONT}`;
    if (done) { g.fillStyle = '#9dffb0'; g.fillText('Built', 348, y + 23); }
    else { g.fillStyle = C.hb >= tier[1] ? '#9dffb0' : '#6d7a8c'; g.fillText(String(tier[1]), 348, y + 23); }
    if (p.tiers.length > 1) for (let k = 0; k < p.tiers.length; k++) { g.fillStyle = k < lvl ? GOLD : 'rgba(255,255,255,0.2)'; g.beginPath(); g.arc(290 + k * 10, y + 18, 3, 0, Math.PI * 2); g.fill(); }
    addRect(30, y, 330, 36, () => { if (Game.idx === i) buyProject(p); Game.idx = i; });
  });
  // detail with before/after preview
  const lvl = upOf(C.up, sel.key), done = lvl >= sel.tiers.length;
  panel(g, 376, 98, 554, 420, true);
  const after = Object.assign({}, C.up, { [sel.key]: Math.min(sel.tiers.length, lvl + 1) });
  if (done) {
    drawPreview(g, sel, C.up, 396, 136, 514, 290);
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('BUILT', 653, 128);
  } else {
    drawPreview(g, sel, C.up, 396, 136, 250, 141); drawPreview(g, sel, after, 660, 136, 250, 141);
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('BEFORE', 521, 128); g.fillStyle = GOLD; g.fillText('AFTER', 785, 128);
  }
  const tier = sel.tiers[Math.min(lvl, sel.tiers.length - 1)];
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(tier[0], 396, done ? 452 : 306);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapTextLeft(g, tier[2], 396, done ? 476 : 330, 510, 20);
  if (sel.view === 'gym') { g.fillStyle = '#9fb3c8'; g.font = `13px ${FONT}`; g.fillText('Cosmetic: changes how the gym looks, not how you play.', 396, done ? 500 : 376); }
  else if (!done) { g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Grows the community: more musallis, cars and visitors.', 396, 376); }
  if (!done) {
    const can = C.hb >= tier[1];
    g.fillStyle = can ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, 396, 402, 240, 42, 21); g.fill();
    g.textAlign = 'center'; g.fillStyle = can ? NIGHT : '#9fb3c8'; g.font = `15px ${FONT}`; g.fillText(can ? 'Build for ' + tier[1] + ' Halal Bucks' : 'Need ' + (tier[1] - C.hb) + ' more', 516, 429);
    addRect(396, 402, 240, 42, () => buyProject(sel));
  }
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('\u2190 \u2192 switch tabs, \u2191 \u2193 choose, Enter to build, Esc for the hub', 396, 506);
}
function drawMasjidView(g) {
  const inside = Game.masjidView === 'int';
  if (inside) drawMusalla(g, C.up, 'visit', Game.t); else drawExterior(g, C.up, Game.t);
  g.fillStyle = 'rgba(8,16,24,0.8)'; roundRect(g, 96, 8, 380, 60, 12); g.fill();
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `20px ${FONT}`; g.fillText('Masjid Al-Amanah', 112, 34);
  const lvl = masjidLevel(), jumuah = 40 + lvl * 22;
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('About ' + jumuah + ' musallis at Jumu\u2019ah, ' + (8 + lvl * 4) + ' families in the community', 112, 56);
  ['Outside', 'Musalla'].forEach((t, i) => {
    const x = W - 320 + i * 150, on = (i === 1) === inside;
    g.fillStyle = on ? GOLD : 'rgba(8,16,24,0.8)'; roundRect(g, x, 16, 140, 32, 16); g.fill();
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText(t, x + 70, 37);
    addRect(x, 16, 140, 32, () => { Game.masjidView = i ? 'int' : 'ext'; });
  });
  g.fillStyle = 'rgba(8,16,24,0.75)'; roundRect(g, W / 2 - 190, H - 42, 380, 30, 15); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `13px ${BODY}`; g.fillText('\u2190 \u2192 switch view, Enter for projects, Esc for the hub', W / 2, H - 22);
}
function masjidUpdate() {
  if (menuHit('left') || menuHit('right')) { Game.masjidView = Game.masjidView === 'int' ? 'ext' : 'int'; SFX.blip(); }
  if (menuHit('ok')) { Game.screen = 'shop'; Game.idx = 0; }
  if (menuHit('back')) careerHub();
}

