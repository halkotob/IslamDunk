// ================================================= v9.2: THE NEIGHBOURHOOD — scenes
// Four scenes: home (interior), the street, the masjid front, the corner store (interior).
// Coordinates: x is world px; d is depth on the floor (0 = back, 1 = front); ground.y0/y1 give the screen y of the
// back and front of the floor and ground.s0/s1 the character scale there (a figure is ~104 px tall at scale 1).
// Props draw around their own base point (0, 0) at scale 1 and are cached at their depth's scale.

// ---------------------------------------------------------------- people
const WORLD_NPC_LOOK = {
  yusuf: { name: 'Uncle Yusuf', skin: '#9a6440', hat: 'topi', capColor: '#f7f7f2', hair: '#d8d8d8', thobe: '#8a7a62', beardStyle: 3, elder: true, glasses: true },
  bilal: { name: 'Bilal', skin: '#c68a5a', hat: 'hair', hair: '#161616', thobe: '#2e86de', beardStyle: 0 },
  sami: { name: 'Sami', skin: '#e6b894', hat: 'kufi', capColor: '#1c1c1c', hair: '#3b2412', thobe: '#e67e22', beardStyle: 0 },
  daniel: { name: 'Mr. Daniel', skin: '#f3d2b3', hat: 'hair', hair: '#8a6a3a', thobe: '#5d7a8c', beardStyle: 1 },
  hamza: { name: 'Hamza', skin: '#7b4a2e', hat: 'hair', hair: '#161616', thobe: '#3b3b3b', beardStyle: 2 },
  karim: { name: 'Abu Karim', skin: '#b98059', hat: 'kufi', capColor: '#f7f7f2', hair: '#8a8a8a', thobe: '#e9e2d0', beardStyle: 3, elder: true },
  idris: { name: 'Br. Idris', skin: '#5e3a24', hat: 'crochet', capColor: '#1e7a4c', hair: '#3b3b3b', thobe: '#9aa7b3', beardStyle: 3 }
};
// one set of lines per day, chosen so consecutive days differ; every set is one or two lines
const WORLD_LINES = {
  yusuf: [[['you', 'Assalamu alaikum, Uncle Yusuf.'], ['yusuf', 'Wa alaikum assalam, beta. Sit, the bench has room.']],
    [['yusuf', 'Is it game week? The whole street is talking about Al-Amanah.']],
    [['yusuf', 'I walk to the corner and back every day. The doctor says it’s good. The bench agrees.']]],
  bilal: [[['bilal', 'Can you dunk? Show us next time!']], [['bilal', 'Sami keeps traveling. Tell him it counts.']], [['bilal', 'We’re practicing for the youth league.']]],
  sami: [[['sami', 'I’m going to play for Al-Amanah when I’m big.']], [['sami', 'We found the ball in the bushes. It’s still good.']], [['sami', 'Bilal says he’s faster. He isn’t.']]],
  daniel: [[['daniel', 'Hey, neighbour! How’s the season going?']], [['daniel', 'Your masjid’s garden looks great this year.']], [['daniel', 'If you ever need a ladder for those banners, just knock.']]],
  hamza: [[['hamza', 'Salaam! One more lap, then I’m done.']], [['hamza', 'See you at the gym, in sha Allah.']], [['hamza', 'My knees say rest day. I said one more lap.']]],
  idris: [[['idris', 'The flowers by the door came up well this year, alhamdulillah.']], [['idris', 'Shoes on the rack inside, please. The carpet thanks you.']], [['idris', 'I fixed the door hinge. It still squeaks, but politely.']]]
};
function wNpc(id, x, d, o = {}) { const L = WORLD_NPC_LOOK[id]; return Object.assign({ id, name: L.name, look: L, x, d, lines: WORLD_LINES[id] }, o); }

// ---------------------------------------------------------------- shared floor helpers
function wFloorWood(g, x0, x1, y0, y1) {
  g.fillStyle = WP.floor; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = WP.floorB; g.lineWidth = 1;
  for (let y = y0 + 14, r = 0; y < y1; y += 16 + r * 1.5, r++) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); for (let x = x0 + ((r * 97) % 140); x < x1; x += 140) { g.beginPath(); g.moveTo(x, y - 16 - r * 1.5); g.lineTo(x, y); g.stroke(); } }
}
// a rug lying on the floor: a trapezoid (narrower at the back), a border and a fringe
function wRugFlat(g, cx, cy, w, h, col, border) {
  const t = w * 0.06, pts = [cx - w / 2 + t, cy - h / 2, cx + w / 2 - t, cy - h / 2, cx + w / 2, cy + h / 2, cx - w / 2, cy + h / 2];
  wPoly(g, pts, col, 2);
  g.strokeStyle = border; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - w / 2 + t + 12, cy - h / 2 + 7); g.lineTo(cx + w / 2 - t - 12, cy - h / 2 + 7); g.lineTo(cx + w / 2 - 14, cy + h / 2 - 7); g.lineTo(cx - w / 2 + 14, cy + h / 2 - 7); g.closePath(); g.stroke();
  g.strokeStyle = shade(col, 0.25); g.lineWidth = 1; for (let x = cx - w / 2 + 4; x < cx + w / 2 - 2; x += 6) { g.beginPath(); g.moveTo(x, cy + h / 2); g.lineTo(x, cy + h / 2 + 4); g.stroke(); }
}
function wWallBase(g, x0, x1, top, base, col, skirt) {
  g.fillStyle = col; g.fillRect(x0, top, x1 - x0, base - top);
  g.fillStyle = shade(col, -0.06); g.fillRect(x0, base - 70, x1 - x0, 70);                       // lower wall a shade darker
  wBox(g, x0, base - 72, x1 - x0, 5, WP.trim, 1);                                                // chair rail
  g.fillStyle = skirt || WP.woodB; g.fillRect(x0, base - 12, x1 - x0, 12); wLine(g, x0, base - 12, x1, base - 12, wO(), 1);
}

// ================================================================ HOME
worldDefine({
  id: 'home', name: 'Home', w: 1400, interior: true, dSpeed: 1,
  ground: { y0: 402, y1: 506, s0: 1.12, s1: 1.26 },
  walk: [[[70, 0], [1350, 0], [1350, 1], [70, 1]]],
  spots: { start: [1010, 0.45, 1], wake: [1010, 0.45, 1], door: [150, 0.2, 1], mirror: [1290, 0.38, -1] },
  layers: {
    base: { draw(g, T, tod) {
      // living room (left), bedroom (right) along one back wall
      wWallBase(g, -WORLD_MARGIN, 790, 0, 402, '#efe3c6');
      wWallBase(g, 790, 1400 + WORLD_MARGIN, 0, 402, '#d8e3cf');
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(-WORLD_MARGIN, 0, 1400 + 2 * WORLD_MARGIN, 26);   // ceiling shadow
      wBox(g, 776, 0, 28, 402, '#e3d3b0', 2);                                                        // the corner between the rooms
      wFloorWood(g, -WORLD_MARGIN, 1400 + WORLD_MARGIN, 402, H);
      // front door
      wDoor(g, 92, 394, 74, 172, WP.doorG);
      wBox(g, 82, 394, 94, 8, WP.walkB, 1);
      // living-room window and a framed geometric pattern
      wWindow(g, T, tod, 268, 150, 120, 110, { curtain: '#c9a24a', lit: false });
      wBox(g, 470, 140, 110, 86, WP.woodB, 2); g.fillStyle = '#f6efe0'; g.fillRect(478, 148, 94, 70);
      g.strokeStyle = WP.green; g.lineWidth = 1.5; star8(g, 525, 183, 24); g.stroke(); star8(g, 525, 183, 12); g.stroke();
      // the prayer corner: a rug on the floor and a low shelf with books and a plant (decorative)
      wBox(g, 640, 268, 104, 10, WP.wood, 2); for (let i = 0; i < 6; i++) wBox(g, 648 + i * 11, 238, 9, 30, ['#7a1f2b', '#1e5a4a', '#2c6e8f', '#6b4a2b', '#c9a24a', '#5f7a5a'][i], 1);
      wRound(g, 720, 244, 18, 24, 3, '#b8735a', 1); g.fillStyle = WP.leaf; for (const [px, py] of [[729, 236], [722, 230], [736, 229]]) { g.beginPath(); g.ellipse(px, py, 6, 10, 0.4, 0, Math.PI * 2); g.fill(); }
      g.save(); g.translate(690, 438); g.scale(1, 0.32);
      wRound(g, -58, -66, 116, 132, 8, WP.rug, 2); g.strokeStyle = WP.gold; g.lineWidth = 3; roundRect(g, -48, -56, 96, 112, 6); g.stroke();
      g.fillStyle = WP.rugB; g.beginPath(); g.moveTo(-30, -40); g.lineTo(0, -56); g.lineTo(30, -40); g.lineTo(30, 46); g.lineTo(-30, 46); g.closePath(); g.fill();
      g.restore();
      // living-room rug
      wRugFlat(g, 420, 452, 290, 62, '#2c6e8f', '#f2cf6b');
      // bedroom window and a rug
      wWindow(g, T, tod, 930, 150, 110, 104, { curtain: '#5f7a5a', lit: false });
      wRugFlat(g, 1080, 456, 230, 54, '#c9a24a', '#7a1f2b');
    } },
    glow: { draw(g, T, tod) {                                                                         // lamps on at dusk and night
      for (const [x, y] of [[236, 214], [1218, 300]]) { const gr = g.createRadialGradient(x, y, 4, x, y, 170); gr.addColorStop(0, 'rgba(255,206,130,0.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(x - 170, y - 170, 340, 340); }
    } }
  },
  props: [
    { id: 'lamp', x: 236, d: 0.02, box: [50, 200], foot: [-14, 14, -0.04, 0.04], draw(g, T) {
      wShadow(g, T, 0, 0, 34, 160); wBox(g, -3, -170, 6, 170, '#3b4048', 1); wRound(g, -14, -6, 28, 6, 3, '#3b4048', 1);
      wPoly(g, [-22, -160, 22, -160, 14, -196, -14, -196], '#f2e2b8', 2); } },
    { id: 'sofa', x: 430, d: 0.06, box: [250, 110], foot: [-118, 118, -0.06, 0.1], draw(g, T) {
      wShadow(g, T, 0, 0, 240, 60);
      wRound(g, -118, -86, 236, 50, 12, '#7d5a6b', 2); g.fillStyle = shade('#7d5a6b', -0.12); g.fillRect(-114, -52, 228, 12);
      wRound(g, -122, -46, 244, 34, 8, '#8d6a7b', 2); for (const sx of [-128, 104]) wRound(g, sx, -66, 24, 56, 10, '#7d5a6b', 2);
      for (const lx of [-104, 96]) wBox(g, lx, -12, 8, 12, WP.woodB, 1);
      for (const cx of [-64, 0, 64]) wRound(g, cx - 28, -76, 56, 30, 9, '#9a7a8a', 1); } },
    { id: 'table', x: 430, d: 0.52, box: [150, 60], foot: [-62, 62, -0.08, 0.06], draw(g, T) {
      wShadow(g, T, 0, 0, 130, 30); wRound(g, -66, -34, 132, 12, 4, WP.wood, 2); for (const lx of [-56, 50]) wBox(g, lx, -22, 6, 22, WP.woodB, 1);
      wRound(g, -18, -46, 18, 12, 3, '#f6f1e6', 1); g.fillStyle = '#b5652b'; g.fillRect(-15, -44, 12, 4);                                // a cup of chai
      wBox(g, 12, -40, 34, 6, '#2c6e8f', 1); } },                                                                                    // a book
    { id: 'divider', x: 790, d: 0.16, box: [90, 250], foot: [-38, 38, -0.2, 0.08], draw(g, T) {         // a bookcase between the rooms
      wShadow(g, T, 0, 0, 80, 220);
      wBox(g, -40, -240, 80, 240, WP.wood, 2); g.fillStyle = WP.woodB; g.fillRect(16, -238, 22, 236);
      for (let r = 0; r < 4; r++) { wBox(g, -34, -228 + r * 56, 66, 48, '#5a3d24', 1); for (let i = 0; i < 6; i++) wBox(g, -30 + i * 10, -222 + r * 56 + (i % 3) * 3, 8, 42 - (i % 3) * 3, ['#7a1f2b', '#1e5a4a', '#2c6e8f', '#c9a24a', '#f6f1e6', '#5f7a5a'][(i + r) % 6], 1); } } },
    { id: 'bed', x: 1120, d: 0.1, box: [300, 130], foot: [-140, 140, -0.1, 0.12], draw(g, T) {
      wShadow(g, T, 0, 0, 290, 50);
      wBox(g, -146, -118, 18, 118, WP.woodB, 2);                                                         // headboard
      wRound(g, -138, -56, 286, 40, 6, '#f6f1e6', 2); wRound(g, -60, -62, 208, 46, 8, '#2c6e8f', 2);   // mattress, blanket
      g.fillStyle = shade('#2c6e8f', -0.14); g.fillRect(-58, -26, 204, 8);
      wRound(g, -128, -78, 62, 24, 10, '#ffffff', 2);                                                    // pillow
      wBox(g, -138, -18, 286, 14, WP.wood, 2); for (const lx of [-136, 140]) wBox(g, lx, -6, 8, 6, WP.woodB, 1); } },
    { id: 'nightlamp', x: 1218, d: 0.0, box: [60, 120], foot: [-22, 22, -0.03, 0.04], draw(g, T) {
      wShadow(g, T, 0, 0, 40, 60); wBox(g, -22, -54, 44, 54, WP.wood, 2); wLine(g, -20, -30, 20, -30, WP.woodB, 1);
      wBox(g, -2, -86, 4, 32, '#3b4048', 1); wPoly(g, [-15, -84, 15, -84, 10, -104, -10, -104], '#f2e2b8', 2); } },
    { id: 'wardrobe', x: 1310, d: 0.0, box: [120, 260], foot: [-54, 54, -0.04, 0.06], draw(g, T) {
      wShadow(g, T, 0, 0, 110, 230);
      wBox(g, -54, -244, 108, 244, WP.wood, 2); g.fillStyle = WP.woodB; g.fillRect(30, -242, 22, 240);
      wLine(g, 0, -240, 0, -6, wO(), 1);
      g.fillStyle = '#cfe3ee'; g.fillRect(-46, -224, 40, 150); g.strokeStyle = wO(); g.lineWidth = 1; g.strokeRect(-46, -224, 40, 150);   // the mirror
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(-40, -90); g.lineTo(-20, -220); g.lineTo(-12, -220); g.lineTo(-32, -90); g.closePath(); g.fill();
      for (const hx of [-6, 6]) wRound(g, hx - 2, -140, 4, 16, 2, WP.gold, 1); } }
  ],
  portals: [{ id: 'out', x: 130, d: 0.06, rx: 70, label: 'Go out', act: () => worldGoOut() }],
  uses: [
    { id: 'bed', x: 1120, d: 0.34, rx: 140, label: () => 'End the day', act: () => worldEndDay() },
    { id: 'mirror', x: 1300, d: 0.18, rx: 60, label: 'Change your look', act: () => worldOpenLook() }
  ],
  npcs: [],
  hint: () => 'W A S D to walk  •  E to use  •  G go out  •  N skip the day'
});

// ================================================================ STREET
const STREET_HOUSES = [
  { x: 228, w: 300, h: 196, wall: WP.siding, wallB: WP.sidingB, roof: WP.slate, siding: true, door: [130, 56, 128], doorCol: WP.doorG, windows: [[28, 44, 66, 62], [206, 44, 66, 62]], gableWin: true, curtain: '#c9a24a' },
  { x: 600, w: 290, h: 186, wall: WP.wall, roof: WP.roof, door: [40, 54, 126], windows: [[132, 40, 60, 60], [210, 40, 60, 60]], curtain: '#7d5a6b' },
  { x: 1100, w: 300, h: 200, wall: WP.sage, wallB: WP.sageB, roof: WP.roofB, siding: true, door: [210, 56, 128], windows: [[30, 46, 70, 62], [120, 46, 70, 62]], gableWin: true, curtain: '#e8ecf0' },
  { x: 1960, w: 290, h: 190, wall: WP.brick, wallB: WP.brickB, roof: WP.slate, brick: true, door: [118, 54, 126], windows: [[20, 46, 62, 60], [204, 46, 62, 60]], curtain: '#c9a24a' }
];
const STREET_BASE = 344;
function wStoreFront(g, T, tod) {                                  // the Corner Market
  const x = 1480, w = 400, h = 214, b = STREET_BASE;
  wHouse(g, T, tod, x, b, { w, h, wall: '#c98a5a', wallB: '#b07448', brick: true, flat: true, roof: '#5a3d24' });
  wBox(g, x + 30, b - h + 22, w - 60, 40, WP.green, 2);
  g.fillStyle = '#f6efe0'; g.font = `bold 24px ${FONT}`; g.textAlign = 'center'; g.fillText('CORNER MARKET', x + w / 2, b - h + 51);
  // the big windows and the door
  for (const wx of [x + 26, x + 262]) { wBox(g, wx - 4, b - 122, 120, 104, '#3b2a1c', 2); g.fillStyle = wGlass(T, tod, true); g.fillRect(wx, b - 118, 112, 96);
    if (tod < 2) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(wx + 16, b - 22); g.lineTo(wx + 60, b - 118); g.lineTo(wx + 84, b - 118); g.lineTo(wx + 40, b - 22); g.closePath(); g.fill(); }
    for (let i = 0; i < 4; i++) { g.fillStyle = ['#e74c3c', '#f1c40f', '#27ae60', '#e67e22'][i]; g.beginPath(); g.arc(wx + 18 + i * 25, b - 30, 9, 0, Math.PI * 2); g.fill(); } }
  wDoor(g, x + 170, b - 8, 60, 134, '#3b2a1c', { frame: '#e8e2d4' });
  g.fillStyle = wGlass(T, tod, true); g.fillRect(x + 178, b - 134, 44, 70);
  wBox(g, x + 160, b - 8, 80, 8, WP.walkB, 1);
  // a striped awning
  const ay = b - 150; for (let i = 0; i < 10; i++) wPoly(g, [x + 10 + i * 38, ay, x + 48 + i * 38, ay, x + 52 + i * 38, ay + 30, x + 6 + i * 38, ay + 30], i % 2 ? '#f6efe0' : WP.green, 1);
  g.strokeStyle = wO(); g.lineWidth = 2; g.strokeRect(x + 6, ay, 388, 30);
  // OPEN sign (CLOSED at night)
  wLine(g, x + 56, b - 118, x + 66, b - 108, '#3b2a1c', 1); wLine(g, x + 110, b - 118, x + 100, b - 108, '#3b2a1c', 1);   // hanging in the window
  wRound(g, x + 34, b - 108, 98, 28, 6, tod === 3 ? '#5a5f66' : '#c0392b', 1); g.fillStyle = '#fff'; g.font = `bold 20px ${FONT}`; g.fillText(tod === 3 ? 'CLOSED' : 'OPEN', x + 83, b - 87);
}
function wStreetMasjid(g, T, tod) {                                 // the masjid at the end of the street, set back behind its wall
  const U = (C && C.up) || {}, ms = Math.min(2, upOf(U, 'musalla')), x0 = 2380, bw = [300, 330, 360][ms], bh = [170, 186, 200][ms], b = STREET_BASE - 6, top = b - bh;
  const wall = ms ? WP.wall : WP.brick;
  if (upOf(U, 'minaret')) { const mx = x0 + bw + 20; wBox(g, mx, b - 300, 30, 300, WP.wall, 2); wBox(g, mx - 6, b - 240, 42, 8, WP.green, 1); wPoly(g, [mx - 4, b - 300, mx + 15, b - 344, mx + 34, b - 300], WP.green, 2); crescent(g, mx + 15, b - 354, 6, WP.gold); }
  wBox(g, x0, top, bw, bh, wall, 2); g.fillStyle = shade(wall, -0.12); g.fillRect(x0 + bw - 16, top + 1, 15, bh - 1);
  wBox(g, x0 - 8, top - 10, bw + 16, 12, ms ? WP.green : WP.roofB, 2);
  if (upOf(U, 'dome')) { const cx = x0 + bw / 2, r = bw * 0.24; wBox(g, cx - r - 6, top - 32, r * 2 + 12, 22, WP.wall, 2);
    const dg = g.createLinearGradient(cx - r, 0, cx + r, 0); dg.addColorStop(0, '#16603c'); dg.addColorStop(0.5, '#2e9a64'); dg.addColorStop(1, '#16603c');
    g.fillStyle = dg; g.beginPath(); g.moveTo(cx - r, top - 32); g.quadraticCurveTo(cx - r, top - 32 - r * 1.3, cx, top - 32 - r * 1.35); g.quadraticCurveTo(cx + r, top - 32 - r * 1.3, cx + r, top - 32); g.closePath(); g.fill(); g.strokeStyle = wO(); g.lineWidth = 2; g.stroke();
    crescent(g, cx, top - 42 - r * 1.35, 7, WP.gold); }
  const nw = 4; for (let i = 0; i < nw; i++) { const wx = x0 + (bw / (nw + 1)) * (i + 1) - 14; wWindow(g, T, tod, wx, top + 40, 28, 64, { arch: !!ms, lit: true }); }
  const dx = x0 + bw / 2 - 26; wDoor(g, dx, b, 52, 110, WP.door);
  // the wall along the street with its open gateway (the path goes in)
  const gx = 2512, gw = 60;
  for (const [a, z] of [[2310, gx], [gx + gw, 2780]]) { wBox(g, a, b + 8 - 38, z - a, 38, WP.cream, 2); wBox(g, a - 4, b + 8 - 44, z - a + 8, 7, WP.green, 1); }
  for (const px of [gx - 16, gx + gw]) { wBox(g, px, b + 8 - 70, 16, 70, WP.cream, 2); wBox(g, px - 3, b + 8 - 76, 22, 7, WP.green, 1); }
  wBox(g, 2596, b - 104, 196, 40, WP.doorG, 2); g.fillStyle = WP.gold; g.font = `bold 20px ${FONT}`; g.textAlign = 'center'; g.fillText('AL-AMANAH', 2694, b - 77);
  g.fillStyle = WP.walk; g.beginPath(); g.moveTo(gx, b + 8); g.lineTo(gx + gw, b + 8); g.lineTo(gx + gw + 14, 380); g.lineTo(gx - 14, 380); g.closePath(); g.fill();
}
worldDefine({
  id: 'street', name: 'The street', w: 2900, dSpeed: 1,
  ground: { y0: 384, y1: 474, s0: 0.96, s1: 1.1 },
  walk: [[[150, 0], [2770, 0], [2770, 1], [150, 1]]],
  spots: { start: [380, 0.12, 1], home: [380, 0.1, 1], store: [1680, 0.1, 1], masjidgate: [2540, 0.12, -1] },
  sig: () => { const U = (C && C.up) || {}; return [upOf(U, 'musalla'), upOf(U, 'dome'), upOf(U, 'minaret')].join(); },
  layers: {
    far: { par: 0.35, draw(g, T, tod) {
      const x0 = -WORLD_MARGIN, x1 = 2900 * 0.35 + 1500 + WORLD_MARGIN;
      wSky(g, T, tod, x0, x1, 360);
      const R = seededRng(5), far = tod === 3 ? '#1c2742' : tod === 2 ? '#8a6f86' : '#a9bccb', far2 = tod === 3 ? '#16203a' : tod === 2 ? '#7a6078' : '#97aebf';
      for (let x = x0; x < x1; x += 70 + R() * 50) { const h = 40 + R() * 70, w = 60 + R() * 50; g.fillStyle = far; g.fillRect(x, 330 - h, w, h + 40); if (R() < 0.5) { g.beginPath(); g.moveTo(x - 6, 330 - h); g.lineTo(x + w / 2, 330 - h - 26); g.lineTo(x + w + 6, 330 - h); g.fill(); } }
      for (let x = x0; x < x1; x += 50 + R() * 60) { g.fillStyle = far2; g.beginPath(); g.arc(x, 316 - R() * 20, 24 + R() * 18, 0, Math.PI * 2); g.fill(); }
      if (tod >= 2) { g.fillStyle = tod === 3 ? 'rgba(255,214,140,0.85)' : 'rgba(255,214,140,0.6)'; for (let i = 0; i < 70; i++) g.fillRect(x0 + R() * (x1 - x0), 250 + R() * 70, 4, 5); }
    } },
    base: { draw(g, T, tod) {
      const b = STREET_BASE, X0 = -WORLD_MARGIN, X1 = 2900 + WORLD_MARGIN;
      // front lawns, the sidewalk, the curb and the road
      g.fillStyle = WP.grass; g.fillRect(X0, b - 18, X1 - X0, 380 - b + 18);
      g.fillStyle = WP.grassB; for (let x = X0; x < X1; x += 9) g.fillRect(x, b + 16 + ((x * 7) % 9), 2, 5);
      g.fillStyle = WP.walk; g.fillRect(X0, 378, X1 - X0, 110);
      g.strokeStyle = WP.walkB; g.lineWidth = 1.5; for (let x = X0; x < X1; x += 74) { g.beginPath(); g.moveTo(x, 378); g.lineTo(x - 10, 488); g.stroke(); }
      wLine(g, X0, 378, X1, 378, shade(WP.walkB, -0.1), 2);
      wBox(g, X0, 488, X1 - X0, 10, WP.curb, 0); wLine(g, X0, 488, X1, 488, wO(), 1.5);
      g.fillStyle = WP.road; g.fillRect(X0, 498, X1 - X0, H - 498);
      g.fillStyle = WP.lane; for (let x = X0; x < X1; x += 90) g.fillRect(x, 530, 46, 4);
      // the houses, their paths and hedges
      for (const o of STREET_HOUSES) {
        const dx = o.x + o.door[0] + o.door[1] / 2; g.fillStyle = WP.walk; g.beginPath(); g.moveTo(dx - 30, b); g.lineTo(dx + 30, b); g.lineTo(dx + 38, 378); g.lineTo(dx - 38, 378); g.closePath(); g.fill();
        wHouse(g, T, tod, o.x, b, Object.assign({ lit: true }, o));
        wBush(g, o.x - 34, b + 4, 44, 26); wBush(g, o.x + o.w - 8, b + 4, 46, 28);
      }
      wFence(g, 896, 1080, b + 4, 40);
      wStoreFront(g, T, tod);
      wFence(g, 1884, 1950, b + 4, 40);
      wFence(g, 2262, 2300, b + 4, 40);
      wStreetMasjid(g, T, tod);
      // the closed gates at both ends of the walk
      wGate(g, 64, 488, 70, 150); wGate(g, 2796, 488, 70, 150);
      g.fillStyle = WP.hedge; g.fillRect(X0, b - 40, 64 - X0 - 18, 60); g.fillRect(2884, b - 40, X1 - 2884, 60);
    } },
    glow: { draw(g, T, tod) {
      for (const o of STREET_HOUSES) wHouseGlow(g, o.x, STREET_BASE, o);
      for (const wx of [1506, 1742]) wWindowGlow(g, wx, STREET_BASE - 118, 112, 96, 1.2);
      for (const lx of [880, 1580, 2260]) wLampGlow(g, lx, 486, 232, tod === 3 ? 1 : 0.8);
      for (let i = 0; i < 4; i++) wWindowGlow(g, 2380 + 66 * (i + 1) - 14, STREET_BASE - 150, 28, 64, 0.9);
    } }
  },
  props: [
    { id: 'tree1', x: 560, d: 0.97, box: [150, 210], foot: [-10, 10, -0.03, 0.03], draw(g, T) { wTree(g, T, 0, 0, 1); } },
    { id: 'tree2', x: 1240, d: 0.97, box: [150, 210], foot: [-10, 10, -0.03, 0.03], draw(g, T) { wTree(g, T, 0, 0, 0.94, { leaf: '#5aa04d' }); } },
    { id: 'tree3', x: 2120, d: 0.97, box: [150, 210], foot: [-10, 10, -0.03, 0.03], draw(g, T) { wTree(g, T, 0, 0, 1.04); } },
    { id: 'lamp1', x: 880, d: 0.99, box: [110, 250], foot: [-8, 8, -0.025, 0.025], draw(g, T) { wLampPost(g, T, 0, 0, 232); } },
    { id: 'lamp2', x: 1580, d: 0.99, box: [110, 250], foot: [-8, 8, -0.025, 0.025], draw(g, T) { wLampPost(g, T, 0, 0, 232); } },
    { id: 'lamp3', x: 2260, d: 0.99, box: [110, 250], foot: [-8, 8, -0.025, 0.025], draw(g, T) { wLampPost(g, T, 0, 0, 232); } },
    { id: 'bench', x: 1010, d: 0.05, box: [140, 80], foot: [-60, 60, -0.06, 0.05], draw(g, T) { wBench(g, T, 0, 0, 124); } },
    { id: 'mail1', x: 452, d: 0.02, box: [40, 80], foot: [-12, 12, -0.03, 0.03], draw(g, T) { wMailbox(g, T, 0, 0, WP.teal); } },
    { id: 'mail2', x: 1076, d: 0.02, box: [40, 80], foot: [-12, 12, -0.03, 0.03], draw(g, T) { wMailbox(g, T, 0, 0, '#7a1f2b'); } },
    { id: 'hydrant', x: 1440, d: 0.92, box: [40, 50], foot: [-11, 11, -0.03, 0.03], draw(g, T) { wHydrant(g, T, 0, 0); } },
    { id: 'crate1', x: 1530, d: 0.04, box: [60, 44], foot: [-26, 26, -0.04, 0.04], draw(g, T) { wCrate(g, T, 0, 0, '#e74c3c'); } },
    { id: 'crate2', x: 1832, d: 0.04, box: [60, 44], foot: [-26, 26, -0.04, 0.04], draw(g, T) { wCrate(g, T, 0, 0, '#f1c40f'); } },
    { id: 'car1', x: 700, d: 1.42, box: [200, 80], draw(g, T) { wCar(g, T, 0, 0, '#c0392b', 1); } },
    { id: 'car2', x: 2050, d: 1.42, box: [200, 80], draw(g, T) { wCar(g, T, 0, 0, '#2c6e8f', -1); } }
  ],
  portals: [
    { id: 'home', x: 386, d: 0.0, rx: 52, label: 'Go home', act: () => worldGoHome() },
    { id: 'store', x: 1680, d: 0.0, rx: 52, label: 'Go into the store', ok: () => worldStoreOk(), act: () => worldEnterStore() },
    { id: 'masjid', x: 2542, d: 0.0, rx: 52, label: 'Walk up to the masjid', ok: () => worldNightOk(), act: () => worldGo('masjidfront', 'gate'), beacon: () => worldJumuahBeacon() }
  ],
  npcs: [
    wNpc('yusuf', 1000, 0.09, { pose: 'bench', ghost: true, face: 1, faceYou: true }),
    wNpc('daniel', 760, 0.12, { face: -1, faceYou: true }),
    wNpc('bilal', 1180, 0.5, { kid: true, ball: true, face: 1, path: [[1180, 0.5], [1210, 0.42]], wait: 2.6, speed: 30 }),
    wNpc('sami', 1350, 0.55, { kid: true, ball: true, face: -1, path: [[1350, 0.55], [1320, 0.62]], wait: 3.1, speed: 30 }),
    wNpc('hamza', 2000, 0.72, { face: 1, kit: { c1: '#3b3b3b', c2: '#f2cf6b' }, path: [[2000, 0.72], [2680, 0.72]], wait: 1.2, speed: 70 })
  ]
});

// ================================================================ MASJID FRONT
function wMasjidFacade(g, T, tod) {
  const U = (C && C.up) || {}, ms = Math.min(2, upOf(U, 'musalla')), bw = [460, 540, 620][ms], bh = [214, 236, 256][ms], cx = 750, x0 = cx - bw / 2, b = 360, top = b - bh;
  const wall = ms ? WP.wall : WP.brick;
  if (upOf(U, 'minaret')) { const mx = x0 + bw + 40; wBox(g, mx, b - 360, 40, 360, WP.wall, 2); g.fillStyle = WP.wallB; g.fillRect(mx + 26, b - 358, 13, 356);
    wBox(g, mx - 8, b - 290, 56, 10, WP.green, 2); wBox(g, mx - 8, b - 180, 56, 8, WP.green, 1);
    wPoly(g, [mx - 6, b - 360, mx + 20, b - 414, mx + 46, b - 360], WP.green, 2); crescent(g, mx + 20, b - 426, 8, WP.gold);
    for (let y = b - 340; y < b - 200; y += 40) wBox(g, mx + 14, y, 12, 20, '#2c3e50', 1); }
  wBox(g, x0, top, bw, bh, wall, 2); g.fillStyle = shade(wall, -0.12); g.fillRect(x0 + bw - 22, top + 1, 21, bh - 1);
  if (!ms) { g.strokeStyle = shade(wall, -0.14); g.lineWidth = 1; for (let y = top + 10; y < b; y += 10) { g.beginPath(); g.moveTo(x0 + 1, y); g.lineTo(x0 + bw - 1, y); g.stroke(); } }
  wBox(g, x0 - 10, top - 14, bw + 20, 16, ms ? WP.green : WP.roofB, 2);
  if (upOf(U, 'dome')) { const r = bw * 0.22; wBox(g, cx - r - 8, top - 44, r * 2 + 16, 30, WP.wall, 2);
    const dg = g.createLinearGradient(cx - r, 0, cx + r, 0); dg.addColorStop(0, '#16603c'); dg.addColorStop(0.5, '#2e9a64'); dg.addColorStop(1, '#16603c');
    g.fillStyle = dg; g.beginPath(); g.moveTo(cx - r, top - 44); g.quadraticCurveTo(cx - r, top - 44 - r * 1.3, cx, top - 44 - r * 1.35); g.quadraticCurveTo(cx + r, top - 44 - r * 1.3, cx + r, top - 44); g.closePath(); g.fill(); g.strokeStyle = wO(); g.lineWidth = 2; g.stroke();
    crescent(g, cx, top - 56 - r * 1.35, 9, WP.gold); }
  if (upOf(U, 'callig') >= 2) { wBox(g, x0 + 30, top + 8, bw - 60, 34, WP.doorG, 2); g.fillStyle = WP.gold; g.font = `22px ${AR_FONT}`; g.textAlign = 'center'; g.fillText('بِسْمِ ٱللَّهِ', cx, top + 33); }
  const nw = [4, 4, 6][ms], gap = bw / (nw + 1);
  for (let i = 0; i < nw; i++) { const wx = x0 + gap * (i + 1) - 18; if (Math.abs(wx + 18 - cx) < 70) continue; wWindow(g, T, tod, wx, top + 56, 36, 92, { arch: !!ms, lit: true }); }
  // the door (arched once renovated), steps up to it
  if (ms) { g.fillStyle = WP.door; g.beginPath(); g.moveTo(cx - 40, b - 12); g.lineTo(cx - 40, b - 120); g.quadraticCurveTo(cx, b - 172, cx + 40, b - 120); g.lineTo(cx + 40, b - 12); g.closePath(); g.fill(); g.strokeStyle = WP.gold; g.lineWidth = 3; g.stroke(); g.strokeStyle = wO(); g.lineWidth = 1.5; g.stroke(); wLine(g, cx, b - 150, cx, b - 12, wO(), 1.5); }
  else { wDoor(g, cx - 38, b - 12, 76, 140, '#5a5f66'); }
  for (let i = 0; i < 3; i++) wBox(g, cx - 70 - i * 10, b - 12 + i * 8, 140 + i * 20, 8, WP.walkB, 1);
}
worldDefine({
  id: 'masjidfront', name: 'Masjid Al-Amanah', w: 1500, dSpeed: 1,
  ground: { y0: 392, y1: 480, s0: 1.0, s1: 1.12 },
  walk: [[[130, 0], [1380, 0], [1380, 1], [130, 1]]],
  spots: { start: [750, 0.12, 1], gate: [190, 0.6, 1], door: [750, 0.1, 1] },
  sig: () => { const U = (C && C.up) || {}; return ['musalla', 'dome', 'minaret', 'callig', 'garden'].map(k => upOf(U, k)).join(); },
  layers: {
    far: { par: 0.5, draw(g, T, tod) {
      const x0 = -WORLD_MARGIN, x1 = 1500 * 0.5 + 1500 + WORLD_MARGIN; wSky(g, T, tod, x0, x1, 380);
      const R = seededRng(23), c = tod === 3 ? '#16203a' : tod === 2 ? '#7a6078' : '#97aebf';
      for (let x = x0; x < x1; x += 40 + R() * 50) { g.fillStyle = c; g.beginPath(); g.arc(x, 330 - R() * 30, 30 + R() * 24, 0, Math.PI * 2); g.fill(); }
      g.fillRect(x0, 320, x1 - x0, 60);
    } },
    base: { draw(g, T, tod) {
      const X0 = -WORLD_MARGIN, X1 = 1500 + WORLD_MARGIN, U = (C && C.up) || {}, gd = upOf(U, 'garden');
      g.fillStyle = gd ? '#6fa84e' : '#9aa56a'; g.fillRect(X0, 330, X1 - X0, 60);
      wTree(g, T, 230, 360, 1.1); wTree(g, T, 1290, 360, 1.15, { leaf: '#5aa04d' });
      wMasjidFacade(g, T, tod);
      // the plaza
      g.fillStyle = '#e2dccd'; g.fillRect(X0, 384, X1 - X0, H - 384);
      g.strokeStyle = '#cfc7b6'; g.lineWidth = 1.5; for (let x = X0; x < X1; x += 64) { g.beginPath(); g.moveTo(x, 384); g.lineTo(x + (x - 750) * 0.12, H); g.stroke(); }
      for (let y = 410; y < H; y += 34) wLine(g, X0, y, X1, y, '#cfc7b6', 1.5);
      wLine(g, X0, 384, X1, 384, shade('#cfc7b6', -0.15), 2);
      g.fillStyle = 'rgba(30,90,74,0.18)'; g.beginPath(); g.moveTo(690, 384); g.lineTo(810, 384); g.lineTo(860, H); g.lineTo(640, H); g.closePath(); g.fill();   // the path to the door
      if (gd) { for (const [x0, x1] of [[470, 650], [850, 1030]]) { wBush(g, x0, 384, x1 - x0, 22, WP.hedge); g.fillStyle = '#e46a8a'; for (let x = x0 + 10; x < x1 - 6; x += 16) { g.beginPath(); g.arc(x, 364, 3.5, 0, Math.PI * 2); g.fill(); } } }
      // the street wall and its gateway on the left
      wBox(g, X0, 470, 120 - X0, 70, WP.cream, 2); wBox(g, 96, 330, 20, 210, WP.cream, 2);
    } },
    glow: { draw(g, T, tod) {
      const U = (C && C.up) || {}, ms = Math.min(2, upOf(U, 'musalla')), bw = [460, 540, 620][ms], bh = [214, 236, 256][ms], x0 = 750 - bw / 2, top = 360 - bh, nw = [4, 4, 6][ms], gap = bw / (nw + 1);
      for (let i = 0; i < nw; i++) { const wx = x0 + gap * (i + 1) - 18; if (Math.abs(wx + 18 - 750) < 70) continue; wWindowGlow(g, wx, top + 56, 36, 92, 1.1); }
      for (const lx of [400, 1100]) wLampGlow(g, lx, 470, 200, 0.9);
    } }
  },
  props: [
    { id: 'lampL', x: 400, d: 0.9, box: [110, 230], foot: [-8, 8, -0.025, 0.025], draw(g, T) { wLampPost(g, T, 0, 0, 200); } },
    { id: 'lampR', x: 1100, d: 0.9, box: [110, 230], foot: [-8, 8, -0.025, 0.025], draw(g, T) { wLampPost(g, T, 0, 0, 200); } },
    { id: 'bench', x: 330, d: 0.06, box: [140, 80], foot: [-60, 60, -0.06, 0.05], draw(g, T) { wBench(g, T, 0, 0, 124); } },
    { id: 'sign', x: 1200, d: 0.05, box: [270, 130], foot: [-118, 118, -0.04, 0.04], draw(g, T) {
      wShadow(g, T, 0, 0, 250, 80); for (const lx of [-100, 94]) wBox(g, lx, -40, 6, 40, WP.woodB, 1);
      wBox(g, -128, -112, 256, 74, WP.doorG, 2); wBox(g, -121, -105, 242, 60, WP.doorG, 1);
      g.fillStyle = WP.gold; g.font = `bold 20px ${FONT}`; g.textAlign = 'center'; g.fillText('MASJID AL-AMANAH', 0, -80);
      g.fillStyle = '#f6efe0'; g.font = `20px ${BODY}`; g.fillText('All are welcome', 0, -54); } },
    { id: 'planter', x: 560, d: 0.03, box: [80, 70], foot: [-30, 30, -0.04, 0.04], draw(g, T) { wShadow(g, T, 0, 0, 60, 40); wBox(g, -28, -30, 56, 30, '#b8735a', 2); wBush(g, -32, -26, 64, 34, WP.leaf); } },
    { id: 'planter2', x: 940, d: 0.03, box: [80, 70], foot: [-30, 30, -0.04, 0.04], draw(g, T) { wShadow(g, T, 0, 0, 60, 40); wBox(g, -28, -30, 56, 30, '#b8735a', 2); wBush(g, -32, -26, 64, 34, WP.leaf); } }
  ],
  portals: [
    { id: 'door', x: 750, d: 0.0, rx: 60, label: 'Go into the masjid', ok: () => worldMasjidOk(), act: () => worldEnterMasjid(), beacon: () => worldJumuahBeacon() },
    { id: 'street', x: 150, d: 0.6, rx: 60, rd: 0.5, label: 'Back to the street', act: () => worldGo('street', 'masjidgate') }
  ],
  npcs: [wNpc('idris', 1040, 0.22, { face: -1, path: [[1040, 0.22], [1150, 0.3], [1040, 0.22], [880, 0.26]], wait: 2.4, speed: 40 })]
});

// ================================================================ STORE
worldDefine({
  id: 'store', name: 'Corner Market', w: 1300, interior: true, dSpeed: 1,
  ground: { y0: 404, y1: 506, s0: 1.12, s1: 1.26 },
  walk: [[[90, 0], [1240, 0], [1240, 1], [90, 1]]],
  spots: { start: [180, 0.3, 1], door: [180, 0.2, 1] },
  layers: {
    base: { draw(g, T, tod) {
      wWallBase(g, -WORLD_MARGIN, 1300 + WORLD_MARGIN, 0, 404, '#f2e6cc', '#5a3d24');
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(-WORLD_MARGIN, 0, 1300 + 2 * WORLD_MARGIN, 26);
      // floor tiles
      g.fillStyle = '#e8e2d4'; g.fillRect(-WORLD_MARGIN, 404, 1300 + 2 * WORLD_MARGIN, H - 404);
      for (let r = 0; r < 5; r++) for (let x = -WORLD_MARGIN + (r % 2) * 48; x < 1300 + WORLD_MARGIN; x += 96) { g.fillStyle = '#d4ccbb'; g.fillRect(x, 404 + r * 28, 48, 28); }
      wLine(g, -WORLD_MARGIN, 404, 1300 + WORLD_MARGIN, 404, wO(), 1.5);
      // door with a glass panel to the street, and the shop window
      wDoor(g, 140, 396, 80, 176, '#3b2a1c', { frame: '#e8e2d4' }); g.fillStyle = wGlass(T, tod, false); g.fillRect(150, 236, 60, 96); wLine(g, 150, 284, 210, 284, '#3b2a1c', 2);
      wBox(g, 262, 120, 190, 150, '#3b2a1c', 2); g.fillStyle = wGlass(T, tod, false); g.fillRect(268, 126, 178, 138);
      if (tod < 2) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(290, 264); g.lineTo(350, 126); g.lineTo(380, 126); g.lineTo(320, 264); g.closePath(); g.fill(); }
      g.fillStyle = WP.green; g.font = `bold 20px ${FONT}`; g.textAlign = 'center'; g.save(); g.translate(357, 162); g.scale(-1, 1); g.fillText('CORNER MARKET', 0, 0); g.restore();   // the window lettering, seen from inside
      // shelves of goods
      const goods = ['#e74c3c', '#f1c40f', '#27ae60', '#2e86de', '#e67e22', '#8e44ad', '#f6efe0', '#c0392b'];
      for (const [sx, sw] of [[500, 230], [760, 230]]) {
        wBox(g, sx, 110, sw, 280, WP.wood, 2); g.fillStyle = WP.woodB; g.fillRect(sx + sw - 18, 112, 16, 276);
        for (let r = 0; r < 4; r++) { const sy = 130 + r * 64; wBox(g, sx + 8, sy + 46, sw - 16, 6, WP.woodB, 1); for (let i = 0; i < 9; i++) { const c = goods[(i + r * 3) % goods.length]; if (r % 2) wRound(g, sx + 14 + i * 23, sy + 14, 18, 32, 4, c, 1); else wBox(g, sx + 14 + i * 23, sy + 10, 18, 36, c, 1); } }
      }
      // a fridge with a lit inside
      wBox(g, 1030, 92, 180, 300, '#dfe6ea', 2); g.fillStyle = '#bfe6f5'; g.fillRect(1044, 108, 152, 266);
      for (let r = 0; r < 4; r++) { wLine(g, 1044, 170 + r * 62, 1196, 170 + r * 62, '#9fb3c8', 2); for (let i = 0; i < 6; i++) wRound(g, 1052 + i * 24, 128 + r * 62, 14, 40, 4, ['#2e86de', '#e74c3c', '#27ae60', '#f1c40f'][(i + r) % 4], 1); }
      wLine(g, 1120, 108, 1120, 374, '#dfe6ea', 4);
      wBox(g, 1022, 54, 196, 36, WP.green, 2); g.fillStyle = '#f6efe0'; g.font = `bold 20px ${FONT}`; g.fillText('COLD DRINKS', 1120, 80);
    } },
    glow: { draw(g) { const gr = g.createRadialGradient(1120, 240, 10, 1120, 240, 200); gr.addColorStop(0, 'rgba(190,235,255,0.35)'); gr.addColorStop(1, 'rgba(190,235,255,0)'); g.fillStyle = gr; g.fillRect(920, 40, 400, 400);
      for (const x of [380, 820]) { const r = g.createRadialGradient(x, 30, 4, x, 30, 260); r.addColorStop(0, 'rgba(255,236,190,0.35)'); r.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = r; g.fillRect(x - 260, 0, 520, 360); } } }
  },
  props: [
    { id: 'counter', x: 930, d: 0.3, box: [300, 100], foot: [-136, 136, -0.08, 0.08], draw(g, T) {   // waist height (a figure is ~104 tall)
      wShadow(g, T, 0, 0, 280, 40);
      wBox(g, -140, -50, 280, 50, '#7f552c', 2); g.fillStyle = '#6b4626'; g.fillRect(84, -48, 54, 46);
      wBox(g, -148, -58, 296, 10, '#a0703f', 2);
      for (let i = 0; i < 4; i++) wLine(g, -120 + i * 60, -42, -120 + i * 60, -6, '#6b4626', 1);
      wRound(g, 64, -84, 46, 26, 4, '#3b4048', 2); g.fillStyle = '#9dffb0'; g.fillRect(71, -79, 32, 10);   // the till
      wRound(g, -110, -76, 70, 18, 8, '#c9a24a', 2); g.fillStyle = '#6b4a2b'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-100 + i * 10, -69, 4, 3, 0, 0, Math.PI * 2); g.fill(); } } },   // a tray of dates
    { id: 'display', x: 540, d: 0.56, box: [240, 120], foot: [-104, 104, -0.08, 0.07], draw(g, T) {   // the table with the things for sale
      wShadow(g, T, 0, 0, 220, 40);
      wBox(g, -110, -58, 220, 12, '#a0703f', 2); for (const lx of [-100, 92]) wBox(g, lx, -46, 8, 46, WP.woodB, 1);
      for (const [i, it] of STORE_ITEMS.entries()) { const ix = -92 + i * 28;
        if (it.kind === 'shoe') { wRound(g, ix - 10, -70, 22, 10, 4, it.col, 1); g.fillStyle = '#fff'; g.fillRect(ix - 9, -63, 20, 2); }
        else if (it.kind === 'kufi') { g.fillStyle = it.col; g.beginPath(); g.arc(ix, -60, 11, Math.PI, 0); g.fill(); g.strokeStyle = wO(); g.lineWidth = 1; g.stroke(); }
        else if (it.kind === 'band') { g.strokeStyle = wO(); g.lineWidth = 6; g.beginPath(); g.ellipse(ix, -62, 10, 4, 0, 0, Math.PI * 2); g.stroke(); g.strokeStyle = it.col; g.lineWidth = 4; g.stroke(); }
        else { wRound(g, ix - 5, -84, 10, 24, 3, it.col, 1); g.fillStyle = '#e8ecf0'; g.fillRect(ix - 3.5, -88, 7, 4); } } } },
    { id: 'baskets', x: 300, d: 0.06, box: [140, 60], foot: [-58, 58, -0.05, 0.05], draw(g, T) {
      wShadow(g, T, 0, 0, 120, 30); for (const [bx, c] of [[-34, '#f1c40f'], [34, '#e74c3c']]) { wRound(g, bx - 30, -30, 60, 30, 6, '#c9a24a', 2); for (let i = 0; i < 5; i++) { g.fillStyle = c; g.beginPath(); g.arc(bx - 20 + i * 10, -32, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = wO(); g.lineWidth = 1; g.stroke(); } } } }
  ],
  portals: [{ id: 'out', x: 180, d: 0.0, rx: 70, label: 'Back to the street', act: () => worldLeaveStore() }],
  uses: [{ id: 'shop', x: 930, d: 0.5, rx: 140, rd: 0.16, label: 'Browse the shop', act: () => worldOpenShop() }],
  npcs: [wNpc('karim', 960, 0.08, { ghost: true, face: -1, faceYou: true, act: () => worldOpenShop(true), actLabel: 'Talk to Abu Karim', rd: 0.5 })]
});
