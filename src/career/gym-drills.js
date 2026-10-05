// ============================================================ MASJID GYM
// A multipurpose masjid gym drawn in the same oblique projection as the
// arena, so the normal player/ball/hoop systems run inside it (half court).
const AR_FONT = '"Amiri","Scheherazade New","Noto Naskh Arabic","Geeza Pro","Al Nile","Times New Roman",serif';

const _gymFloors = {};
function gymUp() { return (C && C.up) || {}; }
function buildGymFloor() { courtCv = gymFloorFor(gymUp()); }
function gymFloorFor(U) {
  const key = U.floor ? 'new' : 'old';
  if (_gymFloors[key]) return _gymFloors[key];
  const cw = COURT.L + 240, ch = Math.ceil(COURT.D * ZS) + 4;
  const rs = cacheRS(), cv = _gymFloors[key] = makeCanvas(Math.ceil(cw * rs), Math.ceil(ch * rs)), g = cv.getContext('2d'); g.scale(rs, rs); cv.rs = rs;
  if (U.floor) { drawNewGymFloor(g, cw, ch); return cv; }
  const X = x => x + 120, Z = z => z * ZS;
  const grd = g.createLinearGradient(0, 0, 0, ch); grd.addColorStop(0, '#c49c68'); grd.addColorStop(1, '#dfbb86');
  g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
  for (let z = 0, i = 0; z < COURT.D; z += 18, i++) {
    g.fillStyle = i % 3 ? 'rgba(110,70,30,0.05)' : 'rgba(255,240,210,0.07)'; g.fillRect(0, Z(z), cw, Z(18));
    g.fillStyle = 'rgba(90,55,20,0.18)'; g.fillRect(0, Z(z), cw, 0.8);
  }
  // old volleyball (yellow) and badminton (green) lines from other programs...
  g.lineWidth = 1.6; g.strokeStyle = 'rgba(225,190,50,0.15)';
  g.strokeRect(X(620), Z(110), 620, Z(480)); g.beginPath(); g.moveTo(X(930), Z(110)); g.lineTo(X(930), Z(590)); g.stroke();
  g.strokeStyle = 'rgba(40,130,80,0.13)'; g.strokeRect(X(700), Z(200), 470, Z(300));
  g.beginPath(); g.moveTo(X(935), Z(200)); g.lineTo(X(935), Z(500)); g.moveTo(X(700), Z(350)); g.lineTo(X(1170), Z(350)); g.stroke();
  // ...partly painted over with patches that never quite matched
  floorWear(g, X, Z, seededRng(77), 1);
  // current half-court basketball lines
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(X(560), Z(26)); g.lineTo(X(1320), Z(26)); g.lineTo(X(1320), Z(674)); g.lineTo(X(560), Z(674)); g.stroke();
  g.beginPath(); g.moveTo(X(660), Z(26)); g.lineTo(X(660), Z(674)); g.stroke();
  g.beginPath(); g.ellipse(X(660), Z(350), 84, 84 * ZS, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.fillStyle = 'rgba(44,110,143,0.55)'; g.fillRect(X(1054), Z(238), 266, Z(224)); g.strokeRect(X(1054), Z(238), 266, Z(224));
  g.beginPath(); g.ellipse(X(1054), Z(350), 84, 84 * ZS, 0, 0, Math.PI * 2); g.stroke();
  const a = Math.asin(300 / THREE_R), h = hoops[1];
  g.beginPath(); g.ellipse(X(h.x), Z(h.z), THREE_R, THREE_R * ZS, 0, Math.PI - a, Math.PI + a); g.stroke();
  const cx = h.x - Math.cos(a) * THREE_R;
  g.beginPath(); g.moveTo(X(1320), Z(50)); g.lineTo(X(cx), Z(50)); g.moveTo(X(1320), Z(650)); g.lineTo(X(cx), Z(650)); g.stroke();
  // scuffs
  const R = seededRng(99);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(60,40,20,${0.05 + R() * 0.08})`; g.beginPath(); g.ellipse(X(500 + R() * 820), Z(40 + R() * 620), 3 + R() * 9, 1 + R() * 2, R() * 3, 0, Math.PI * 2); g.fill(); }
  return cv;
}
// Refinished floor: glossy maple, clean lines, Al-Amanah logo at center court
function drawNewGymFloor(g, cw, ch) {
  const X = x => x + 120, Z = z => z * ZS;
  const grd = g.createLinearGradient(0, 0, 0, ch); grd.addColorStop(0, '#c98e52'); grd.addColorStop(1, '#e6b173');
  g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
  for (let z = 0, i = 0; z < COURT.D; z += 14, i++) {
    g.fillStyle = i % 2 ? 'rgba(120,70,25,0.06)' : 'rgba(255,240,210,0.08)'; g.fillRect(0, Z(z), cw, Z(14));
    g.fillStyle = 'rgba(90,50,15,0.2)'; g.fillRect(0, Z(z), cw, 0.8);
  }
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, Z(120), cw, Z(60));   // gloss
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(X(560), Z(26)); g.lineTo(X(1320), Z(26)); g.lineTo(X(1320), Z(674)); g.lineTo(X(560), Z(674)); g.stroke();
  g.beginPath(); g.moveTo(X(660), Z(26)); g.lineTo(X(660), Z(674)); g.stroke();
  g.fillStyle = '#2c6e8f'; g.fillRect(X(1054), Z(238), 266, Z(224)); g.strokeRect(X(1054), Z(238), 266, Z(224));
  g.beginPath(); g.ellipse(X(1054), Z(350), 84, 84 * ZS, 0, 0, Math.PI * 2); g.stroke();
  const a = Math.asin(300 / THREE_R), h = hoops[1];
  g.beginPath(); g.ellipse(X(h.x), Z(h.z), THREE_R, THREE_R * ZS, 0, Math.PI - a, Math.PI + a); g.stroke();
  const cx = h.x - Math.cos(a) * THREE_R;
  g.beginPath(); g.moveTo(X(1320), Z(50)); g.lineTo(X(cx), Z(50)); g.moveTo(X(1320), Z(650)); g.lineTo(X(cx), Z(650)); g.stroke();
  // center logo: arch crest ringed in gold with the masjid's name
  const lx = X(660), ly = Z(350);
  g.fillStyle = '#2c6e8f'; g.beginPath(); g.ellipse(lx, ly, 96, 96 * ZS, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2cf6b'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#f2cf6b'; star8(g, lx, ly, 52, 1, ZS, Math.PI / 8); g.fill();
  g.fillStyle = '#2c6e8f'; g.beginPath(); g.moveTo(lx - 18, ly + 14); g.lineTo(lx - 18, ly - 2); g.quadraticCurveTo(lx - 16, ly - 14, lx, ly - 18); g.quadraticCurveTo(lx + 16, ly - 14, lx + 18, ly - 2); g.lineTo(lx + 18, ly + 14); g.closePath(); g.fill();
  g.save(); g.translate(lx, ly + 28); g.scale(1, 0.5); g.fillStyle = '#f2cf6b'; g.font = `22px ${FONT}`; g.textAlign = 'center'; g.fillText('AL-AMANAH', 0, 0); g.restore();
}
function drawGymBack(g, t, U = gymUp()) {
  const X = wx => wx - cam.x + FX.sx, Y = y => y + FX.sy, base = FLOOR_TOP - 7;
  g.fillStyle = '#4d535b'; g.fillRect(0, 0, W, Y(30));
  g.strokeStyle = '#3a3f46'; g.lineWidth = 2;
  for (let wx = 300; wx < 1500; wx += 60) { g.beginPath(); g.moveTo(X(wx), 0); g.lineTo(X(wx) + 10, Y(30)); g.stroke(); }
  // painted cinder-block wall with an accent stripe
  g.fillStyle = '#d9d0bb'; g.fillRect(0, Y(30), W, FLOOR_TOP - 30);
  g.strokeStyle = 'rgba(120,100,70,0.16)'; g.lineWidth = 1;
  for (let y = 30, r = 0; y < FLOOR_TOP; y += 13, r++) {
    g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke();
    for (let wx = 300 + (r % 2) * 20; wx < 1500; wx += 40) { g.beginPath(); g.moveTo(X(wx), Y(y)); g.lineTo(X(wx), Y(y + 13)); g.stroke(); }
  }
  g.fillStyle = '#2c6e8f'; g.fillRect(0, Y(98), W, 6); g.fillStyle = '#f2cf6b'; g.fillRect(0, Y(104), W, 2);
  { const cg = g.createLinearGradient(0, 0, 0, Y(16)); cg.addColorStop(0, '#4a4c52'); cg.addColorStop(1, '#7c7b76'); g.fillStyle = cg; g.fillRect(0, 0, W, Y(16)); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, Y(16) - 2, W, 2); }   // ceiling in shadow; the fixtures hang from it
  if (U.lights) {                      // LED panels: bright and steady
    for (let wx = 430; wx < 1500; wx += 170) {
      const x = X(wx), gl = g.createLinearGradient(0, Y(16), 0, Y(170)); gl.addColorStop(0, 'rgba(255,255,250,0.35)'); gl.addColorStop(1, 'rgba(255,255,250,0)');
      g.fillStyle = gl; g.beginPath(); g.moveTo(x - 60, Y(16)); g.lineTo(x + 60, Y(16)); g.lineTo(x + 120, Y(170)); g.lineTo(x - 120, Y(170)); g.fill();   // light falls from above the frame
    }
  } else for (let wx = 430; wx < 1500; wx += 170) {   // old fluorescent tubes (one flickers)
    const x = X(wx), flick = wx === 770 && ((t * 9) | 0) % 29 === 0 ? 0.3 : 1;
    const gl = g.createLinearGradient(0, Y(16), 0, Y(140)); gl.addColorStop(0, `rgba(235,245,255,${0.22 * flick})`); gl.addColorStop(1, 'rgba(235,245,255,0)');
    g.fillStyle = gl; g.beginPath(); g.moveTo(x - 44, Y(16)); g.lineTo(x + 44, Y(16)); g.lineTo(x + 90, Y(140)); g.lineTo(x - 90, Y(140)); g.fill();
  }
  // exit door and shoe racks
  let x = X(410);
  g.fillStyle = '#8c9ba6'; g.fillRect(x, Y(62), 60, base - 62); g.strokeStyle = '#5f6d77'; g.lineWidth = 2; g.strokeRect(x, Y(62), 60, base - 62);
  g.beginPath(); g.moveTo(x + 30, Y(62)); g.lineTo(x + 30, Y(base)); g.moveTo(x + 6, Y(120)); g.lineTo(x + 26, Y(120)); g.moveTo(x + 34, Y(120)); g.lineTo(x + 54, Y(120)); g.stroke();
  g.fillStyle = '#f4f4ef'; g.fillRect(x + 14, Y(46), 32, 11); g.fillStyle = '#c0392b'; g.font = `8px ${FONT}`; g.textAlign = 'center'; g.fillText('EXIT', x + 30, Y(55));
  x = X(482);
  g.fillStyle = '#8b6a45';
  for (const sy of [124, 144, 164]) g.fillRect(x, Y(sy), 76, 4);
  g.fillRect(x, Y(118), 4, base - 118); g.fillRect(x + 72, Y(118), 4, base - 118);
  const shoeCols = ['#1c1c1c', '#e8ecf0', '#8a5a2b', '#2e86de', '#c0392b', '#5a5a5a', '#e8ecf0', '#1c1c1c', '#f1c40f', '#6b4423'];
  let k = 0;
  for (const sy of [124, 144, 164]) for (let i = 0; i < 4; i++) { g.fillStyle = shoeCols[k++ % shoeCols.length]; g.beginPath(); g.ellipse(x + 12 + i * 17, Y(sy - 3), 6, 3, 0, 0, Math.PI * 2); g.fill(); }
  // accordion partition with the opening to the musalla
  const p0 = X(575), p1 = X(770), o0 = X(705), o1 = X(752);
  for (let px = p0, i = 0; px < p1; px += 8, i++) { if (px + 8 > o0 && px < o1) continue; g.fillStyle = i % 2 ? '#cdbb96' : '#b9a680'; g.fillRect(px, Y(34), 8, base - 34); }
  g.fillStyle = '#7d8790'; g.fillRect(p0, Y(32), p1 - p0, 4);
  g.fillStyle = '#efe3c6'; g.fillRect(o0, Y(40), o1 - o0, base - 40);
  g.fillStyle = '#2f6e4f'; g.fillRect(o0, Y(120), o1 - o0, base - 120);
  g.fillStyle = 'rgba(255,255,255,0.18)'; for (let yy = 126; yy < base; yy += 10) g.fillRect(o0, Y(yy), o1 - o0, 2);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(o0 + 12, Y(118)); g.lineTo(o0 + 12, Y(76)); g.quadraticCurveTo(o0 + 23, Y(60), o1 - 12, Y(76)); g.lineTo(o1 - 12, Y(118)); g.stroke();
  g.fillStyle = '#1e5a4a'; g.fillRect(o0 - 6, Y(38), o1 - o0 + 12, 12); g.fillStyle = '#f2cf6b'; g.font = `11px ${AR_FONT}`; g.fillText('\u0645\u0635\u0644\u0649', (o0 + o1) / 2, Y(48));
  // folding tables leaning on the wall
  // sheikh's office door (wood, with a nameplate)
  x = X(778);
  g.fillStyle = '#7a4f2a'; g.fillRect(x, Y(80), 44, base - 80); g.strokeStyle = '#4a2e16'; g.lineWidth = 2; g.strokeRect(x, Y(80), 44, base - 80);
  g.strokeStyle = 'rgba(40,20,5,0.4)'; g.lineWidth = 1; g.strokeRect(x + 6, Y(88), 32, 36); g.strokeRect(x + 6, Y(130), 32, base - 138);
  g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(x + 36, Y(128), 2.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2e6c8'; g.fillRect(x + 4, Y(68), 36, 10); g.fillStyle = '#4a2e16'; g.font = `6px ${FONT}`; g.textAlign = 'center'; g.fillText('SH. SALEEM', x + 22, Y(75));
  x = X(834);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#9a8f7c' : '#8a806d'; g.beginPath(); g.moveTo(x + i * 7, Y(base)); g.lineTo(x + 18 + i * 7, Y(96 + i * 2)); g.lineTo(x + 24 + i * 7, Y(96 + i * 2)); g.lineTo(x + 8 + i * 7, Y(base)); g.fill(); }
  // two stacks of folding chairs
  for (const sx of [X(894), X(930)]) for (let i = 0; i < 12; i++) {
    const y = Y(base - 18 - i * 5.5); g.fillStyle = '#7b8794'; g.fillRect(sx, y, 30, 4); g.fillStyle = '#65717d'; g.fillRect(sx + 24, y - 12, 5, 12);
  }
  // whiteboard with event flyers and a drawn play
  x = X(990); const wy = Y(56);
  g.fillStyle = '#b8bec6'; g.fillRect(x - 4, wy - 4, 158, 78); g.fillStyle = '#fbfbf8'; g.fillRect(x, wy, 150, 70);
  const flyer = (fx, fy, col, l1, l2) => { g.fillStyle = col; g.fillRect(fx, fy, 34, 42); g.fillStyle = '#333'; g.font = `6px ${BODY}`; g.textAlign = 'left'; g.fillText(l1, fx + 3, fy + 12); g.fillText(l2, fx + 3, fy + 21); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(fx + 3, fy + 28, 26, 1.5); g.fillRect(fx + 3, fy + 33, 20, 1.5); };
  flyer(x + 4, wy + 6, '#ffe38a', 'Youth halaqa', 'Fri after Isha'); flyer(x + 42, wy + 10, '#9dd6ff', 'Bake sale', 'Sun 1pm');
  g.strokeStyle = '#2e5aa8'; g.lineWidth = 1.2; g.font = `9px ${BODY}`; g.fillStyle = '#2e5aa8'; g.fillText('O', x + 90, wy + 22); g.fillText('O', x + 118, wy + 44);
  g.fillStyle = '#c0392b'; g.fillText('X', x + 100, wy + 30); g.fillText('X', x + 128, wy + 52);
  g.beginPath(); g.moveTo(x + 94, wy + 24); g.quadraticCurveTo(x + 110, wy + 50, x + 132, wy + 60); g.stroke();
  g.fillStyle = '#1c1c1c'; g.font = `7px ${BODY}`; g.fillText('BOX OUT!!', x + 84, wy + 64);
  if (U.scoreboard) {
    x = X(840);
    g.fillStyle = '#16181c'; g.fillRect(x, Y(36), 150, 44); g.strokeStyle = '#6d747c'; g.lineWidth = 2; g.strokeRect(x, Y(36), 150, 44);
    g.font = `8px ${FONT}`; g.fillStyle = '#f2cf6b'; g.textAlign = 'center'; g.fillText('AMANAH', x + 30, Y(47)); g.fillText('GUEST', x + 120, Y(47));
    g.fillStyle = '#ff4d3d'; g.font = `16px ${FONT}`; g.fillText(Game.screen === 'gym' && Gym.drill && Gym.drill.kind === 'v1' ? String(M.teams[0].score).padStart(2, '0') : '00', x + 30, Y(70));
    g.fillText(Game.screen === 'gym' && Gym.drill && Gym.drill.kind === 'v1' ? String(M.teams[1].score).padStart(2, '0') : '00', x + 120, Y(70));
    g.fillStyle = '#ffd24d'; g.font = `12px ${FONT}`; g.fillText('12:00', x + 75, Y(66));
  }
  if (U.fountain) {
    x = X(1148);
    g.fillStyle = '#b8bec6'; g.fillRect(x, Y(128), 26, base - 128); g.fillStyle = '#d9dde2'; g.fillRect(x - 3, Y(124), 32, 8);
    g.fillStyle = '#7a8088'; g.fillRect(x + 11, Y(118), 4, 7); g.fillStyle = '#9dd6ff'; g.fillRect(x + 8, Y(126), 10, 2);
  }
  if (U.trophy) {
    x = X(1180);
    g.fillStyle = '#6b4a2b'; g.fillRect(x, Y(92), 60, base - 92); g.fillStyle = 'rgba(200,230,255,0.35)'; g.fillRect(x + 4, Y(96), 52, base - 104);
    g.fillStyle = '#6b4a2b'; for (const sy of [122, 148]) g.fillRect(x + 4, Y(sy), 52, 3);
    const tr = C && C.titles && C.titles.length ? C.titles : ((C && C.trophies) || []).map(st => ({ s: 1, st }));   // v6: engraved by season
    tr.slice(-4).forEach((t, i) => {
      const tx = x + 16 + (i % 2) * 26, ty = Y(i < 2 ? 119 : 145);
      g.fillStyle = ['#c8a050', '#d9dde2', '#e8c35a', '#f2d36b'][t.st] || '#e8c35a'; g.beginPath(); g.moveTo(tx - 6, ty - 14); g.lineTo(tx + 6, ty - 14); g.lineTo(tx + 3, ty - 6); g.lineTo(tx - 3, ty - 6); g.fill();
      g.fillRect(tx - 1, ty - 6, 2, 4); g.fillRect(tx - 5, ty - 2, 10, 2);
      g.fillStyle = '#fff'; g.font = `5px ${FONT}`; g.textAlign = 'center'; g.fillText('S' + t.s + ' ' + STAGES[t.st].name.slice(0, 3).toUpperCase(), tx, ty + 5);
    });
    if (tr.length > 4) { g.fillStyle = '#f2cf6b'; g.font = `5px ${FONT}`; g.textAlign = 'center'; g.fillText('+' + (tr.length - 4) + ' MORE', x + 30, Y(100)); }
    if (!tr.length) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = `6px ${BODY}`; g.textAlign = 'center'; g.fillText('Your trophies', x + 30, Y(114)); g.fillText('go here', x + 30, Y(122)); }
  }
  // rolled prayer rugs piled in the corner
  const rugCols = ['#7a1f2b', '#1e5a4a', '#2b3a55', '#8a5a2b', '#5a2d6b', '#9c3b2b'];
  let ri = 0;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) {
    const rx = X(1256) + i * 15 + row * 7.5, ry = Y(base - 7 - row * 13);
    g.fillStyle = rugCols[ri++ % rugCols.length]; g.beginPath(); g.arc(rx, ry, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f2cf6b'; g.lineWidth = 1; g.beginPath(); g.arc(rx, ry, 4, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(rx, ry, 1.5, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = '#4a4a4a'; g.fillRect(0, Y(base), W, 7);
}
function drawGymNear(g, U = gymUp()) {
  const y0 = FLOOR_TOP + COURT.D * ZS + FX.sy;
  const grd = g.createLinearGradient(0, y0, 0, H); grd.addColorStop(0, '#b8915c'); grd.addColorStop(1, '#3a2c1e');
  g.fillStyle = grd; g.fillRect(0, y0, W, H - y0);
  drawGymSpectators(g, U, y0);
  // end wall the hoop is mounted on

}
function drawGymHoopBack(g, h, U = gymUp()) {
  const dy = h.dy * 0.4, corner = (zc, yc) => { const [x, y] = P(h.bbx, yc + dy, h.z + zc); return [x - zc * 0.42 * h.dir, y]; };
  // wall bracket
  g.strokeStyle = '#6d747c'; g.lineWidth = 4;
  for (const [zc, yc] of [[-30, RIM_Y + 50], [30, RIM_Y + 50], [0, RIM_Y - 6]]) { const a = corner(zc, yc), b = P(h.dir > 0 ? -15 : 1335, yc + 8, h.z + zc * 0.6); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  const c = [corner(-46, RIM_Y - 12), corner(46, RIM_Y - 12), corner(46, RIM_Y + 56), corner(-46, RIM_Y + 56)];
  g.fillStyle = U.hoops ? 'rgba(200,230,255,0.3)' : '#e9e4d6'; g.strokeStyle = U.hoops ? '#f4f7fb' : '#9aa0a8'; g.lineWidth = 3;
  g.beginPath(); c.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); g.stroke();
  if (!U.hoops) { g.fillStyle = 'rgba(140,100,60,0.35)'; const q = corner(30, RIM_Y - 4); g.fillRect(q[0] - 4, q[1] - 6, 6, 8); }
  const s = [corner(-16, RIM_Y + 2), corner(16, RIM_Y + 2), corner(16, RIM_Y + 26), corner(-16, RIM_Y + 26)];
  g.strokeStyle = '#d24a2a'; g.lineWidth = 2; g.beginPath(); s.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.stroke();
  const [rx, ry] = P(h.x, RIM_Y + h.dy, h.z);
  g.strokeStyle = '#b23c16'; g.lineWidth = 3; g.beginPath(); g.ellipse(rx, ry, RIM_R + 1, (RIM_R + 1) * 0.5, 0, Math.PI, Math.PI * 2); g.stroke();
}

// ================================================================ DRILLS
const DRILL_KEYS = ['ft', 'three', 'cones', 'v1'];
const DRILLS = {
  ft: { name: 'Free throws', desc: '10 shots from the line' },
  three: { name: 'Three-point challenge', desc: '5 racks in 60 seconds, the last ball of each rack counts double' },
  cones: { name: 'Cone dribble', desc: 'Dribble to each cone in order, fastest time wins' },
  v1: { name: '1v1 vs Nasser', desc: 'Half court to 11. After a change of possession, take it past the arc' }
};
const CONES = [{ x: 920, z: 180 }, { x: 1040, z: 290 }, { x: 920, z: 400 }, { x: 1040, z: 510 }, { x: 1160, z: 600 }, { x: 1180, z: 420 }, { x: 1090, z: 300 }];
const THREE_SPOTS = [-1.12, -0.56, 0, 0.56, 1.12].map(a => ({ x: hoops[1].x - Math.cos(a) * 338, z: clamp(350 + Math.sin(a) * 338, 45, 655) }));
const PRAY_SPOT = { x: 728, z: 36 };
const Gym = { drill: null, overlay: null, walk: null, fade: null, result: null, toast: '', toastT: 0 };
function gymToast(s, t = 3) { Gym.toast = s; Gym.toastT = t; }
function zeroCmd(c) { c.mx = 0; c.mz = 0; c.turbo = false; c.a = false; c.b = false; c.bHeld = false; c.bRel = false; c.x = false; c.s = false; c.passTo = null; c.alley = null; c.face = 0; }

function setupPractice(kind) {
  const team = amanahTeam();
  const tA = Object.assign({}, team, { players: [playerDef()] });
  const tB = kind === 'v1' ? { name: 'Nasser', short: 'NASSER', c1: '#5f7a5a', c2: '#f3e6c4', crest: 'star', players: [Object.assign({}, CAST.nasser)] } : Object.assign({}, team, { players: [] });
  newMatch(tA, tB, { humans: [{ team: 0, slot: 0, pad: 0 }], practice: kind === 'v1' ? '1v1' : kind, aiCfg: [DIFF.medium, DIFF.medium] });
  M.cmdHook = gymCmd; M.drawExtras = gymExtras; M.phase = 'live';
  const me = M.players[0];
  place(me, 880, 350); me.face = 1; M.possTeam = -1; giveBall(me, 'inbound');
  if (kind === 'v1') place(M.players[1], 1050, 350);
  cam.x = 1380 - W;
}
function gymCmd(p) {
  if (p.human < 0) return false;
  const c = p.cmd;
  if (Gym.walk) {                     // walking to the musalla
    const sp = Gym.walk.spot || PRAY_SPOT, dx = sp.x - p.x, dz = sp.z - p.z, d = Math.hypot(dx, dz);
    zeroCmd(c);
    if (d > 12 && Gym.walk.t < 6) { const k = Gym.walk.to ? 0.9 : 0.6; c.mx = dx / d * k; c.mz = dz / d * k; }
    else { const to = Gym.walk.to; Gym.walk = null; Gym.fade = { phase: 'out', t: 0, to }; }
    return true;
  }
  if (Gym.overlay || Gym.fade || Gym.result || Game.screen !== 'gym') { zeroCmd(c); return true; }
  humanCmd(0, c);
  const d = Gym.drill;
  if (d && (d.kind === 'ft' || d.kind === 'three')) { c.mx = 0; c.mz = 0; c.turbo = false; c.a = false; c.face = 1; }
  else if (d && d.kind === 'cones') { c.b = false; c.a = false; }
  else if (!d) c.a = false;
  return true;
}
function startDrill(kind) {
  setupPractice(kind);
  const d = Gym.drill = { kind, shots: 0, made: 0, score: 0, phase: 'ready', t: 0, time: 0, idx: 0, started: false };
  if (kind === 'ft') d.total = 10;
  if (kind === 'three') { d.total = 15; d.left = 60; }
  if (kind === 'cones') { place(M.players[0], 820, 350); M.possTeam = -1; giveBall(M.players[0], 'inbound'); }
  if (kind === 'v1') gymToast('First to 11. After a change of possession, take it past the arc.', 4);
  SFX.blip();
}
function practiceScore(h) {
  h.kick(ball.shot && ball.shot.touched ? 'rimin' : 'swish', 1.1, ball.x - h.x, ball.z - h.z);
  const d = Gym.drill;
  if (d && d.phase === 'flight') d.madeNow = true;
  FX.pop(h.x, RIM_Y + 40, h.z, d && d.kind === 'three' && d.money ? '+2' : 'SWISH', '#f2cf6b');
  ball.state = 'scored'; ball.shot = null;
}
function practiceGameOver(team) { if (Gym.drill) { Gym.drill.winner = team; Gym.drill.endT = 1.4; } }
function drillUpdate(dt) {
  const d = Gym.drill; if (!d || Gym.result) return;
  if (d.mini) { if (M.mini && M.mini.done && (M.mini.doneT || 0) > 1.5) finishMini(); return; }
  const me = M.players[0];
  if (d.kind === 'ft' || d.kind === 'three') {
    if (d.kind === 'three') { d.left -= dt; if (d.left <= 0 && d.phase !== 'flight') { d.left = 0; finishDrill(); return; } }
    const spot = d.kind === 'ft' ? { x: 1054, z: 350 } : THREE_SPOTS[Math.min(4, Math.floor(d.shots / 3))];
    if (d.phase === 'ready') {
      if (ball.owner !== me && me.state === 'free' && ball.state !== 'shot') { place(me, spot.x, spot.z); me.face = 1; M.possTeam = -1; giveBall(me, 'inbound'); }
      if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me) { d.phase = 'flight'; d.t = 0; d.madeNow = false; d.money = d.kind === 'three' && d.shots % 3 === 2; }
    } else if (d.phase === 'flight') {
      d.t += dt;
      if ((d.madeNow && d.t > 0.4) || (ball.state === 'loose' && (ball.y < 30 || d.t > 2.2)) || d.t > 3) {
        d.shots++; if (d.madeNow) { d.made++; d.score += d.money ? 2 : 1; }
        d.phase = 'wait'; d.t = 0;
      }
    } else if ((d.t += dt) > 0.3) { if (d.shots >= d.total) finishDrill(); else d.phase = 'ready'; }
  } else if (d.kind === 'cones') {
    if (!d.started && Math.hypot(me.vx, me.vz) > 20) d.started = true;
    if (d.started) d.time += dt;
    if (dxz(me, CONES[d.idx]) < 36) { d.idx++; SFX.blip(); if (d.idx >= CONES.length) finishDrill(); }
  } else if (d.kind === 'v1' && d.endT != null) { d.endT -= dt; if (d.endT <= 0) finishDrill(); }
}
function finishDrill() {
  const d = Gym.drill; if (!d) return;
  let bp = 0, line = '', best = false;
  if (d.kind === 'ft') { bp = d.made * 3 + (d.made >= 8 ? 10 : 0); line = d.made + ' of 10 made'; if (d.made > C.best.ft) { C.best.ft = d.made; best = true; } }
  else if (d.kind === 'three') { bp = d.score * 2; line = d.score + ' points out of 20'; if (d.score > C.best.three) { C.best.three = d.score; best = true; } }
  else if (d.kind === 'cones') { bp = clamp(Math.round(80 - d.time * 3.5), 10, 55); line = d.time.toFixed(1) + ' seconds'; if (!C.best.cones || d.time < C.best.cones) { C.best.cones = +d.time.toFixed(1); best = true; } }
  else {
    const you = M.teams[0].score, him = M.teams[1].score, won = d.winner === 0;
    bp = won ? 40 + you : 12 + Math.round(you / 2); line = (won ? 'You beat Nasser ' : 'Nasser won ') + Math.max(you, him) + ' to ' + Math.min(you, him);
    if (won) { C.best.v1++; best = true; }
  }
  // v5.0: stage-scaled BP, a bonus for a new personal best, a little HB (more for a best or a win)
  bp = drillBP(bp); const pb = best && d.kind !== 'v1' ? drillBP(ECON.bpPB) : 0, hb = practiceHB(best);
  bankPractice(bp + pb, hb);
  Gym.result = { title: DRILLS[d.kind].name, line, bp: bp + pb, pb, hb, best, kind: d.kind };
  if (best && d.kind !== 'v1') { FX.callout('NEW BEST!', '#9dffb0', line.toUpperCase()); SFX.best(); }
  Gym.drill = null;
}

// Practice earnings go to the save and to this stage's log; counts toward "time in the gym".
function bankPractice(bp, hb) {
  C.bp += bp; C.hb += hb; const L = slog(C.stage); L.bp += bp; L.hb += hb;
  C.drillsSince = (C.drillsSince || 0) + (hb ? 1 : 0);    // salah passes hb 0: it isn't a drill
  saveCareer();
}

