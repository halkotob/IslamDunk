// ============================================================ MUSALLA DETAIL
// Carpet with prayer rows, a mihrab with molding and pattern, a Quran shelf,
// a wall clock, a framed calligraphy piece and warm light.
function musallaCarpet(g, bx0, bx1, by1, cp) {
  const base = cp === 2 ? '#7a1f2b' : cp === 1 ? '#2f6e4f' : '#9e8a64', line = cp === 2 ? 'rgba(242,207,107,0.5)' : cp === 1 ? 'rgba(255,255,255,0.32)' : 'rgba(255,245,220,0.3)';
  const dark = cp === 2 ? 'rgba(60,10,20,0.25)' : cp === 1 ? 'rgba(10,40,25,0.25)' : 'rgba(70,55,30,0.18)';
  g.fillStyle = base; g.beginPath(); g.moveTo(bx0, by1); g.lineTo(bx1, by1); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  const rowY = k => lerp(by1, H, k * k), xAt = (y, side) => side < 0 ? lerp(bx0, 0, (y - by1) / (H - by1)) : lerp(bx1, W, (y - by1) / (H - by1));
  for (let i = 1; i <= 9; i++) {                      // prayer rows (saff), each with a row of rug arches
    const y0 = rowY((i - 1) / 9), y1 = rowY(i / 9), xl = xAt(y1, -1), xr = xAt(y1, 1), ah = (y1 - y0) * 0.75;
    g.fillStyle = dark; g.fillRect(xAt(y0, -1), y0, xAt(y0, 1) - xAt(y0, -1), (y1 - y0) * 0.18);
    g.fillStyle = line; g.fillRect(xl, y1 - 1, xr - xl, 1.2 + i * 0.35);
    const n = 12, rw = (xr - xl) / n;
    g.strokeStyle = line; g.lineWidth = 0.8 + i * 0.12;
    for (let j = 0; j < n; j++) { const ax = xl + j * rw; g.beginPath(); g.moveTo(ax + rw * 0.12, y1 - 1); g.lineTo(ax + rw * 0.12, y1 - ah * 0.45); g.quadraticCurveTo(ax + rw / 2, y1 - ah * 1.05, ax + rw * 0.88, y1 - ah * 0.45); g.lineTo(ax + rw * 0.88, y1 - 1); g.stroke(); }
  }
}
function musallaMihrab(g, cx, mTop, by1, mw, mh) {
  const arch = (w, top) => { g.beginPath(); g.moveTo(cx - w / 2, by1); g.lineTo(cx - w / 2, top + 40); g.quadraticCurveTo(cx - w / 2, top, cx, top - 6); g.quadraticCurveTo(cx + w / 2, top, cx + w / 2, top + 40); g.lineTo(cx + w / 2, by1); g.closePath(); };
  // outer molding frame
  arch(mw + 34, mTop - 16); g.fillStyle = mh ? '#c9a24a' : '#d8ccb0'; g.fill();
  arch(mw + 22, mTop - 10); g.fillStyle = mh ? '#1e5a4a' : '#eadfc6'; g.fill();
  // geometric band around the arch
  g.save(); arch(mw + 22, mTop - 10); g.clip();
  for (let a = 0; a < 16; a++) { const k = a / 15, x = cx + Math.cos(Math.PI + k * Math.PI) * (mw / 2 + 5), y = mTop + 34 - Math.sin(k * Math.PI) * 44; g.fillStyle = mh ? '#f2cf6b' : '#b8a57e'; star8(g, x, y, 3.2); g.fill(); }
  g.restore();
  // the niche: concave shading (darker toward the top)
  arch(mw, mTop); const ng = g.createLinearGradient(0, mTop - 6, 0, by1); ng.addColorStop(0, mh ? '#12394d' : '#b9ad92'); ng.addColorStop(1, mh ? '#1f5d7a' : '#e6dbc2'); g.fillStyle = ng; g.fill();
  if (mh) {
    g.save(); arch(mw, mTop); g.clip();
    for (let yy = mTop - 10; yy < by1; yy += 16) for (let xx = cx - mw / 2; xx < cx + mw / 2; xx += 16) { g.fillStyle = ((xx + yy) / 16 | 0) % 2 ? 'rgba(46,138,158,0.8)' : 'rgba(242,227,179,0.75)'; star8(g, xx + 8, yy + 8, 5); g.fill(); }
    g.restore();
  }
  const sh = g.createLinearGradient(cx - mw / 2, 0, cx + mw / 2, 0); sh.addColorStop(0, 'rgba(0,0,0,0.18)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)');
  arch(mw, mTop); g.fillStyle = sh; g.fill();
  arch(mw, mTop); g.strokeStyle = mh ? '#c9a24a' : '#a8946c'; g.lineWidth = 2.5; g.stroke();
  // hanging lamp in the niche
  g.strokeStyle = '#8a6d2c'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, mTop - 2); g.lineTo(cx, mTop + 30); g.stroke();
  const lg = g.createRadialGradient(cx, mTop + 36, 1, cx, mTop + 36, 22); lg.addColorStop(0, 'rgba(255,225,150,0.7)'); lg.addColorStop(1, 'rgba(255,225,150,0)'); g.fillStyle = lg; g.fillRect(cx - 22, mTop + 14, 44, 44);
  g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(cx - 6, mTop + 30); g.lineTo(cx + 6, mTop + 30); g.lineTo(cx + 4, mTop + 40); g.lineTo(cx - 4, mTop + 40); g.closePath(); g.fill();
}
function musallaDetails(g, bx0, bx1, by0, by1, t) {
  // Quran shelf on the back wall (left): closed books with gold-lettered spines, and a wooden stand
  const sx = bx0 + 26, sy = by1 - 92;
  g.fillStyle = '#6b4526'; g.fillRect(sx, sy, 92, 66); g.fillStyle = '#4a2e16'; g.fillRect(sx + 4, sy + 4, 84, 58);
  g.fillStyle = '#6b4526'; g.fillRect(sx + 4, sy + 31, 84, 3);
  const cols = ['#1e5a4a', '#7a1f2b', '#2b3a55', '#1e5a4a', '#5a2d6b', '#7a1f2b', '#1e5a4a'];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) { const bx = sx + 7 + i * 11.5, by = sy + 7 + row * 28, bh = 22 - (i % 3); g.fillStyle = cols[(i + row * 3) % cols.length]; g.fillRect(bx, by + (24 - bh), 10, bh); g.fillStyle = 'rgba(242,207,107,0.8)'; g.fillRect(bx + 2, by + (24 - bh) + 4, 6, 1.5); }
  // wooden stand (rehal) with a closed book, in front of the shelf
  const rx = sx + 118, ry = by1 - 6;
  g.strokeStyle = '#7a4f2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(rx - 14, ry); g.lineTo(rx + 14, ry - 20); g.moveTo(rx + 14, ry); g.lineTo(rx - 14, ry - 20); g.stroke();
  g.fillStyle = '#1e5a4a'; g.beginPath(); g.moveTo(rx - 15, ry - 21); g.lineTo(rx, ry - 15); g.lineTo(rx + 15, ry - 21); g.lineTo(rx + 15, ry - 25); g.lineTo(rx, ry - 19); g.lineTo(rx - 15, ry - 25); g.closePath(); g.fill();
  // wall clock (back wall, right)
  const kx = bx1 - 60, ky = by0 + 60;
  g.fillStyle = '#f7f1e3'; g.beginPath(); g.arc(kx, ky, 20, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#6b4526'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = '#333'; g.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(kx + Math.cos(a) * 15, ky + Math.sin(a) * 15); g.lineTo(kx + Math.cos(a) * 17, ky + Math.sin(a) * 17); g.stroke(); }
  let hh = 1, mn = 30; try { const d = new Date(); hh = d.getHours(); mn = d.getMinutes(); } catch (e) {}   // real local time
  const hA = ((hh % 12) + mn / 60) / 12 * Math.PI * 2 - Math.PI / 2, mA = mn / 60 * Math.PI * 2 - Math.PI / 2;
  g.lineWidth = 2; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(hA) * 9, ky + Math.sin(hA) * 9); g.stroke();
  g.lineWidth = 1.3; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(mA) * 14, ky + Math.sin(mA) * 14); g.stroke();
  // small framed calligraphy piece (back wall, right of center)
  const fx = bx1 - 150, fy = by0 + 40;
  g.fillStyle = '#6b4526'; g.fillRect(fx - 4, fy - 4, 68, 44); g.fillStyle = '#f7efd8'; g.fillRect(fx, fy, 60, 36);
  g.fillStyle = '#1e5a4a'; g.font = `14px ${AR_FONT}`; g.textAlign = 'center'; g.fillText('\u0671\u0644\u0644\u0651\u064e\u0647\u064f \u0623\u064e\u0643\u0652\u0628\u064e\u0631\u064f', fx + 30, fy + 23);
  // warm light from above
  const wl = g.createRadialGradient(W / 2, by0 - 20, 20, W / 2, by0 + 120, W * 0.7);
  wl.addColorStop(0, 'rgba(255,225,160,0.16)'); wl.addColorStop(1, 'rgba(255,225,160,0)'); g.fillStyle = wl; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.75); vg.addColorStop(0, 'rgba(40,25,10,0)'); vg.addColorStop(1, 'rgba(40,25,10,0.28)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// CPU foul caution: fewer shoves near/in the bonus, after earlier shoves, and on Hard (stricter refs)
function shoveRiskK(p) {
  const tf = teamFouls(p.team), n = p.shoves || 0;
  return (tf >= BONUS_AT ? 0.12 : tf === BONUS_AT - 1 ? 0.45 : 1) * Math.max(0.3, 1 - 0.15 * n) * ({ easy: 1, medium: 0.85, hard: 0.6 }[SETTINGS.difficulty] || 0.85);
}

// ================================================= v4.2: WALKABLE MUSALLA
// The musalla is a room you walk around in: the same perspective as its art,
// your character on foot (walking only; no turbo in the musalla), and the
// people you can talk to placed around the room, some sitting and some
// standing. Walk up to someone to get a "Talk" prompt; the dialogue itself is
// unchanged (TALK / talkTo / talkChoose / talkAdvance).
const MUS_WALK = 150;                                  // walking speed (a calm pace)
// Where people are: u = across the room (0..1), d = depth (0 back wall .. 1 front)
const MUS_SPOTS = {
  saleem: { u: 0.36, d: 0.2, pose: 'cross', face: 1 },            // sitting by the stand near the mihrab
  mahmoud: { u: 0.06, d: 0.46, pose: 'chair', face: 1 },          // on a chair against the left wall
  rafiq: { u: 0.7, d: 0.58, pose: 'cross', face: -1 },            // sitting on the carpet, front right
  khalil: { u: 0.9, d: 0.26, pose: 'stand', face: -1 }            // standing by the right wall
};
function musRoom() {
  const ms = upOf(C.up, 'musalla');
  return { bx0: [280, 200, 110][ms], bx1: W - [280, 200, 110][ms], by1: 300, front: H + 40 };
}
// room (u, d) -> screen (x, y) and figure scale
function musToScreen(u, d) {
  const R = musRoom(), y = R.by1 + (R.front - R.by1) * d, k = (y - R.by1) / (H - R.by1);
  const xl = lerp(R.bx0, 0, k), xr = lerp(R.bx1, W, k);
  return { x: lerp(xl, xr, u), y, s: 1.0 + 1.05 * d };
}
function openMusalla() {
  const me = new Player(playerDef(), 9, 0, amanahTeam()); me.x = -9999; me.outfit = 'thobe'; me.state = 'free'; me.face = 1;
  for (let i = 0; i < 20; i++) animate(me, 1 / 60);
  const npcs = {};
  for (const id of MUS_CAST) { const p = new Player(castDef(id), 9, 0, amanahTeam()); p.outfit = 'thobe'; p.state = 'free'; p.face = MUS_SPOTS[id].face; p.x = -9999; for (let i = 0; i < 20; i++) animate(p, 1 / 60); npcs[id] = p; }
  Game.screen = 'musalla';
  Game.mus = { sel: -1, talk: null, fadeIn: 0.5, me, u: 0.12, d: 0.7, npcs, near: null };   // enter at the doorway, front left
}
// draw one figure at a screen position (stand / cross-legged / chair)
function musFigure(g, p, x, y, s, pose) {
  // place the figure in world space so drawPlayer's projection lands it at (x, y)
  const z = (y - FLOOR_TOP - FX.sy) / ZS, k = depthK(z), dk = k || 1;
  p.z = z; p.x = (x - FX.sx - W / 2) / dk + W / 2 + cam.x; p.T = amanahTeam();
  const sink = pose === 'cross' ? 40 : pose === 'chair' ? 24 : 0;
  g.save(); g.translate(x, y); g.scale(s / dk, s / dk); g.translate(-x, -y);
  // shadow
  g.fillStyle = 'rgba(40,20,10,0.25)'; g.beginPath(); g.ellipse(x, y + 1, pose === 'cross' ? 26 : 18, 5, 0, 0, Math.PI * 2); g.fill();
  if (pose === 'chair') {                               // folding chair against the wall
    g.strokeStyle = '#6d7782'; g.lineWidth = 3; g.beginPath();
    g.moveTo(x - 12, y); g.lineTo(x - 9, y - 26); g.lineTo(x + 11, y - 26); g.lineTo(x + 13, y);
    g.moveTo(x - 10 * p.face, y - 26); g.lineTo(x - 11 * p.face, y - 62); g.stroke();
    g.fillStyle = '#7b8794'; g.fillRect(x - 13, y - 29, 26, 5); g.fillRect(x - 11 * p.face - 7, y - 64, 14, 22);
  }
  if (sink) {
    // the body sits lower; legs below the seat are hidden, then drawn folded
    p.y = -sink;
    g.save(); g.beginPath(); g.rect(x - 200, y - 400, 400, 400 - (pose === 'chair' ? 26 : 8)); g.clip();
    drawPlayer(g, p); g.restore();
    const robe = p.def.thobe || '#f4f4f0', dark = shade(robe, -0.18);
    if (pose === 'cross') {                             // crossed legs under the thobe, feet peeking out
      g.fillStyle = OUTLINE; g.beginPath(); g.ellipse(x, y - 6, 25, 9.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = robe; g.beginPath(); g.ellipse(x, y - 6, 23.5, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = dark; g.beginPath(); g.ellipse(x + 4, y - 3, 17, 4, 0, 0, Math.PI); g.fill();
      g.fillStyle = p.def.skin || '#c68a5a'; for (const fx of [-15, 15]) { g.beginPath(); g.ellipse(x + fx, y - 2, 5, 2.6, 0, 0, Math.PI * 2); g.fill(); }
    } else {                                            // on the chair: thighs forward, shins down
      g.strokeStyle = OUTLINE; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 16 * p.face, y - 30); g.lineTo(x + 18 * p.face, y - 4); g.stroke();
      g.strokeStyle = robe; g.lineWidth = 9.5; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 16 * p.face, y - 30); g.lineTo(x + 18 * p.face, y - 4); g.stroke();
      g.fillStyle = '#2a2a2a'; g.beginPath(); g.ellipse(x + 21 * p.face, y - 2, 7, 3, 0, 0, Math.PI * 2); g.fill();
    }
    p.y = 0;
  } else drawPlayer(g, p);
  g.restore();
}
function musallaUpdate(rdt) {
  const m = Game.mus;
  if (m.fadeIn > 0) m.fadeIn -= rdt;
  if (Gym.overlay === 'adhan') {       // the adhan can come while you're here too
    if (menuHit('ok')) { Gym.overlay = null; Game.mus = null; Game.screen = 'gym'; Gym.fade = { phase: 'out', t: 0 }; }
    else if (menuHit('back')) skipPray();
    return;
  }
  const me = m.me, dt = Math.min(rdt, 0.05);
  // people idle in place
  for (const id of MUS_CAST) { const p = m.npcs[id]; p.fakeIdle = true; p.vx = p.vz = 0; animate(p, dt); }
  if (m.talk) {                        // in a conversation: the existing dialogue controls
    me.vx = me.vz = 0; animate(me, dt);
    const t = m.talk, n = TALK[t.id].options.length + 1;
    if (t.mode === 'answer') { if (menuHit('ok')) talkAdvance(); else if (menuHit('back')) m.talk = null; return; }
    if (menuHit('up')) { t.idx = (t.idx + n - 1) % n; SFX.blip(); }
    if (menuHit('down')) { t.idx = (t.idx + 1) % n; SFX.blip(); }
    if (menuHit('ok')) talkChoose(t.idx);
    else if (menuHit('back')) m.talk = null;
    return;
  }
  checkAdhan();
  // walk (no turbo here)
  const c = me.cmd; humanCmd(0, c);
  const R = musRoom(), here = musToScreen(m.u, m.d), rowW = lerp(R.bx1 - R.bx0, W, (here.y - R.by1) / (H - R.by1));
  const vx = c.mx * MUS_WALK, vz = c.mz * MUS_WALK * 0.62;
  m.u = clamp(m.u + vx * dt / rowW, 0.05, 0.95);
  m.d = clamp(m.d + vz * dt / (R.front - R.by1), 0.1, 0.72);   // front limit keeps the whole figure on screen
  // don't walk through people
  for (const id of MUS_CAST) {
    const S = MUS_SPOTS[id], du = (m.u - S.u) * 2.2, dd = m.d - S.d, dist = Math.hypot(du, dd), min = S.pose === 'stand' ? 0.07 : 0.09;
    if (dist < min && dist > 1e-4) { m.u = S.u + du / dist * min / 2.2; m.d = S.d + dd / dist * min; }
  }
  if (Math.abs(c.mx) > 0.05) me.face = c.mx > 0 ? 1 : -1;
  me.vx = vx; me.vz = vz * 0.8; me.fakeIdle = !(Math.abs(vx) + Math.abs(vz) > 5); animate(me, dt);
  // who's close enough to talk to?
  let best = null, bd = 0.2;
  for (const id of MUS_CAST) { const S = MUS_SPOTS[id], dist = Math.hypot((m.u - S.u) * 2.2, m.d - S.d); if (dist < bd) { bd = dist; best = id; } }
  m.near = best;
  if (best && (menuHit('ok') || Input.pressed.KeyE)) talkTo(MUS_CAST.indexOf(best));
  else if (menuHit('back')) musallaBack();
  else if (m.d > 0.62 && m.u <= 0.051 && c.mx < -0.5) musallaBack();                 // walk out through the doorway
}
function drawMusallaScreen(g) {
  const m = Game.mus;
  drawMusalla(g, C.up, 'visit', Game.t);
  // doorway back to the gym (front left)
  const dp = musToScreen(0.02, 0.76);
  g.fillStyle = 'rgba(40,25,10,0.35)'; g.beginPath(); g.moveTo(0, dp.y - 190); g.lineTo(dp.x + 34, dp.y - 150); g.lineTo(dp.x + 34, H); g.lineTo(0, H); g.fill();
  g.fillStyle = 'rgba(8,16,24,0.7)'; roundRect(g, 10, dp.y - 150, 86, 22, 11); g.fill();
  g.fillStyle = '#fff'; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText('\u2190 GYM', 53, dp.y - 135);
  // everyone, drawn back to front
  const list = MUS_CAST.map(id => ({ id, p: m.npcs[id], ...musToScreen(MUS_SPOTS[id].u, MUS_SPOTS[id].d), pose: MUS_SPOTS[id].pose }));
  list.push({ id: 'me', p: m.me, ...musToScreen(m.u, m.d), pose: 'stand' });
  list.sort((a, b) => a.y - b.y);
  for (const f of list) {
    g.globalAlpha = m.talk && f.id !== 'me' && m.talk.id !== f.id ? 0.7 : 1;
    musFigure(g, f.p, f.x, f.y, f.s, f.pose);
    g.globalAlpha = 1;
  }
  // talk prompt over the person you're next to
  if (m.near && !m.talk) {
    const S = MUS_SPOTS[m.near], at = musToScreen(S.u, S.d), top = at.y - (S.pose === 'cross' ? 95 : S.pose === 'chair' ? 120 : 150) * at.s;
    const label = 'Talk to ' + castDef(m.near).name + (Input.touchMode ? '' : '  (E)');
    g.font = `12px ${FONT}`; const w = g.measureText(label).width + 26;
    g.fillStyle = 'rgba(30,90,74,0.95)'; roundRect(g, at.x - w / 2, top - 26, w, 26, 13); g.fill();
    g.fillStyle = '#f2cf6b'; g.textAlign = 'center'; g.fillText(label, at.x, top - 8);
    addRect(at.x - w / 2, top - 26, w, 26, () => talkTo(MUS_CAST.indexOf(m.near)));
  }
  // header
  g.fillStyle = 'rgba(8,16,24,0.8)'; roundRect(g, 96, 8, 360, 32, 16); g.fill();
  g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'left'; g.fillText('The musalla', 112, 29);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(m.talk ? 'Esc to step away' : 'Walk over to someone to talk', 218, 29);
  if (m.talk) {                                          // the existing dialogue panel
    const t = m.talk, opts = TALK[t.id].options;
    panel(g, 40, 396, 880, 136, true);
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `15px ${FONT}`; g.fillText(castDef(t.id).name, 60, 420);
    g.fillStyle = '#fff'; g.font = `15px ${BODY}`; wrapTextLeft(g, t.lines[t.li], 60, 444, t.mode === 'menu' ? 440 : 840, 20);
    if (t.mode === 'menu') {
      [...opts.map(o => o[0]), 'Goodbye'].forEach((q, k) => {
        const y = 404 + k * 31, on = t.idx === k;
        g.fillStyle = on ? 'rgba(232,195,90,0.92)' : 'rgba(255,255,255,0.1)'; roundRect(g, 520, y, 384, 27, 13); g.fill();
        g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${on ? FONT : BODY}`; g.textAlign = 'left'; g.fillText(q, 534, y + 18);
        addRect(520, y, 384, 27, () => { t.idx = k; talkChoose(k); });
      });
    } else {
      g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.textAlign = 'right'; g.fillText('Enter or tap to continue', 900, 520);
      addRect(0, 60, W, H - 60, talkAdvance);
    }
  } else if (!Input.touchMode) {
    g.fillStyle = 'rgba(8,16,24,0.7)'; roundRect(g, W / 2 - 230, H - 40, 460, 28, 14); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `12px ${BODY}`; g.fillText('W A S D to walk  \u2022  E or Enter to talk  \u2022  Esc back to the gym', W / 2, H - 21);
  }
  if (Gym.overlay === 'adhan') drawAdhan(g);
  if (m.fadeIn > 0) { g.fillStyle = `rgba(4,10,14,${m.fadeIn / 0.5})`; g.fillRect(0, 0, W, H); }
}

