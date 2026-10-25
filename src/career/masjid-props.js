// ================================================= v8.4: THINGS YOU CAN USE AROUND THE MASJID
// Projects don't change anything in games. They are part of the place, and you can use them:
//   gym: drink at the water cooler (bubbles in the jug), test the scoreboard buzzer, look at the
//        trophy case, flip the lights (old tubes flicker, LED panels snap on), read the whiteboard
//   musalla: pray two rak'ahs at the mihrab, sit on the carpet, read the calligraphy, look up at the
//        chandelier, read from the mushaf on the shelf
//   outside (My Masjid): tap the minaret, dome, garden, fountain and parking lot
// Walk up and press F (or tap the prompt). In the musalla, E / Enter works too.
const GYM_PROPS = [
  { id: 'cooler', x: 1150, z: 40, need: U => U.fountain, label: 'Drink some water' },
  { id: 'board', x: 915, z: 40, need: U => U.scoreboard, label: 'Test the buzzer' },
  { id: 'trophy', x: 1210, z: 40, need: U => U.trophy, label: 'Look at the trophies' },
  { id: 'switch', x: 476, z: 40, need: () => true, label: 'Flip the lights' },
  { id: 'wb', x: 1064, z: 40, need: () => true, label: 'Read the whiteboard' }
];
function gymPropNear() {
  if (Gym.drill || Gym.walk || Gym.fade || Gym.overlay || Gym.result || Gym.prop) return null;
  const me = M.players[0], U = gymUp(); if (!me) return null;
  if (dxz(me, PRAY_SPOT) < 70 || dxz(me, OFFICE_SPOT) < 60) return null;
  let best = null, bd = 58;
  for (const p of GYM_PROPS) { if (!p.need(U)) continue; const d = dxz(me, p); if (d < bd) { bd = d; best = p; } }
  return best;
}
function useGymProp(p) {
  const me = M.players[0];
  Gym.prop = { id: p.id, t: 0 };
  if (p.id === 'cooler') { if (ball.owner === me) { ball.owner = null; ball.state = 'loose'; ball.vx = ball.vz = ball.vy = 0; ball.y = BALL_R; } place(me, 1132, 44); me.face = 1; }
  else if (p.id === 'board') { SFX.buzzer && SFX.buzzer(); }
  else if (p.id === 'trophy') {
    const tr = C.titles && C.titles.length ? C.titles.map(t => 'Season ' + t.s + ' ' + STAGES[t.st].name) : [];
    gymToast(tr.length ? 'Trophy case: ' + tr.slice(-3).join('  •  ') + (tr.length > 3 ? '  and ' + (tr.length - 3) + ' more' : '') : 'An empty trophy case. In sha Allah, not for long.', 4);
  } else if (p.id === 'switch') { SFX.blip(); }
  else if (p.id === 'wb') gymToast('Youth halaqa: Friday after Isha  •  Bake sale: Sunday 1pm  •  Coach says: BOX OUT!!', 4.5);
}
{
  const _gc = gymCmd;
  gymCmd = function (p) {
    if (Gym.prop && Gym.prop.id === 'cooler' && p.human >= 0) { zeroCmd(p.cmd); return true; }
    return _gc.apply(this, arguments);
  };
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    if (Gym.prop) {
      const P_ = Gym.prop; P_.t += rdt;
      const len = { cooler: 2.6, board: 2.2, switch: 1.8 }[P_.id] || 0.1;
      if (P_.id === 'cooler' && P_.t > 0.4 && !P_.gulp) { P_.gulp = true; SFX.blip(); }
      if (P_.t > len) {
        if (P_.id === 'cooler') { const me = M.players[0]; me.turbo = 100; gymToast('Bismillah... cold water. Alhamdulillah.', 2.5); }
        if (P_.id === 'switch') gymToast(gymUp().lights ? 'The LED panels snap right back on.' : 'The old tubes take their time. Bzzzt... bzzt.', 2.5);
        Gym.prop = null;
      }
    } else if (Input.pressed.KeyF) { const p = gymPropNear(); if (p) useGymProp(p); }
    return _gu.apply(this, arguments);
  };
  const _eg = enterGym; enterGym = function () { Gym.prop = null; return _eg.apply(this, arguments); };
  // the cooler's jug, the scoreboard lights and the lights going out are drawn with the wall
  const _db = drawGymBack;
  drawGymBack = function (g, t, U = gymUp()) {
    _db.apply(this, arguments);
    if (Game.screen !== 'gym') return;
    const X = wx => wx - cam.x + FX.sx, Y = y => y + FX.sy, P_ = Gym.prop;
    if (U.fountain) {                                    // a water jug on the cooler
      const x = X(1148) + 13, y0 = Y(96), drinking = P_ && P_.id === 'cooler';
      g.fillStyle = 'rgba(150,205,240,0.55)'; roundRect(g, x - 10, y0, 20, 28, 5); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(90,160,220,0.6)'; g.fillRect(x - 9, y0 + 9, 18, 18);
      g.fillStyle = '#5b8fb9'; g.fillRect(x - 5, y0 - 4, 10, 5);
      if (drinking && P_.t < 0.9) {                              // filling a paper cup at the tap
        g.strokeStyle = 'rgba(140,200,240,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y(126)); g.lineTo(x, Y(134)); g.stroke();
        g.fillStyle = '#f4f7fb'; g.beginPath(); g.moveTo(x - 4, Y(134)); g.lineTo(x + 4, Y(134)); g.lineTo(x + 3, Y(143)); g.lineTo(x - 3, Y(143)); g.closePath(); g.fill();
      }
      if (drinking) for (let i = 0; i < 6; i++) {             // glug: bubbles rise in the jug
        const k = ((P_.t * 1.6 + i / 6) % 1), bx = x - 5 + ((i * 37) % 10), by = y0 + 26 - k * 22;
        g.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.6})`; g.lineWidth = 1; g.beginPath(); g.arc(bx, by, 1.5 + (i % 3), 0, Math.PI * 2); g.stroke();
      }
    }
    if (P_ && P_.id === 'board' && U.scoreboard) {
      const x = X(840), on = ((P_.t * 6) | 0) % 2 === 0;
      g.fillStyle = '#16181c'; g.fillRect(x + 3, Y(39), 144, 38);
      g.fillStyle = on ? '#ff4d3d' : '#ffd24d'; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText(on ? 'BISMILLAH' : 'AL-AMANAH', x + 75, Y(63));
    }
  };
  // prompts, the water, the dark room and "!" markers
  const _dh = drawGymHUD;
  drawGymHUD = function (g) {
    const P_ = Gym.prop, X = wx => wx - cam.x + FX.sx, Y = y => y + FX.sy;
    if (P_ && P_.id === 'cooler' && P_.t > 0.9 && P_.t < 2.4) {   // the cup comes up to drink
      const me = M.players[0], [hx, hy] = P(me.x + 11 * me.face, 116, me.z);
      g.fillStyle = '#f4f7fb'; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - 4, hy - 4); g.lineTo(hx + 4, hy - 4); g.lineTo(hx + 3, hy + 6); g.lineTo(hx - 3, hy + 6); g.closePath(); g.fill(); g.stroke();
    }
    if (P_ && P_.id === 'switch') {
      const t = P_.t, led = gymUp().lights;
      let a = t < 0.35 ? 0.72 : led ? 0 : (((t * 11) | 0) % 3 === 0 && t < 1.5 ? 0.62 : 0.12 * clamp((1.6 - t) / 0.3, 0, 1));
      if (a > 0) { g.fillStyle = `rgba(4,8,14,${a})`; g.fillRect(0, 0, W, H); }
    }
    _dh.apply(this, arguments);
    if (Game.screen !== 'gym' || Gym.drill || Gym.overlay || Gym.result || Gym.fade) return;
    const mark = (x, y) => { const b = Math.sin(Game.t * 4) * 3; g.fillStyle = GOLD; g.beginPath(); g.arc(x, y + b, 10, 0, Math.PI * 2); g.fill(); g.strokeStyle = NIGHT; g.lineWidth = 2; g.stroke(); g.fillStyle = NIGHT; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText('!', x, y + b + 5); };
    if (C && sheikhSituation()) mark(X(800), Y(56));
    if (typeof anyNews === 'function' && anyNews()) mark(X(728), Y(28));
    const p = gymPropNear();
    if (p) {
      const me = M.players[0], [px, py] = P(me.x, 130, me.z), label = p.label + (Input.touchMode ? '' : '  (F)');
      g.font = `12px ${FONT}`; const w = g.measureText(label).width + 28;
      g.fillStyle = 'rgba(44,110,143,0.95)'; roundRect(g, px - w / 2, py - 26, w, 26, 13); g.fill();
      g.fillStyle = '#f2e6c8'; g.textAlign = 'center'; g.fillText(label, px, py - 8);
      addRect(px - w / 2, py - 26, w, 26, () => useGymProp(p));
    }
  };
}
// ---- the musalla
const MUS_AYAT = [
  ['Indeed, with hardship comes ease.', 'Ash-Sharh 94:6'], ['So remember Me; I will remember you.', 'Al-Baqarah 2:152'],
  ['Allah does not burden a soul beyond what it can bear.', 'Al-Baqarah 2:286'], ['And He is with you wherever you are.', 'Al-Hadid 57:4'],
  ['Surely in the remembrance of Allah do hearts find rest.', 'Ar-Ra’d 13:28']
];
function musProps() {
  const U = C.up, R = musRoom(), u = sx => (sx - R.bx0) / (R.bx1 - R.bx0), L = [];
  L.push({ id: 'mihrab', u: 0.5, d: 0.1, label: 'Pray two rak’ahs' });
  L.push({ id: 'carpet', u: 0.42, d: 0.5, label: 'Sit on the carpet' });
  L.push({ id: 'shelf', u: u(R.bx0 + 72), d: 0.1, label: 'Read from the mushaf' });
  if (upOf(U, 'callig')) { L.push({ id: 'callig', u: u(W / 2 - 150), d: 0.1, label: 'Read the calligraphy' }); L.push({ id: 'callig', u: u(W / 2 + 150), d: 0.1, label: 'Read the calligraphy' }); }
  if (upOf(U, 'chandelier')) L.push({ id: 'chand', u: 0.56, d: 0.3, label: 'Look up at the chandelier' });
  return L;
}
function musPropNear(m) {
  let best = null, bd = 0.13;
  for (const p of musProps()) { const d = Math.hypot((m.u - p.u) * 2.2, m.d - p.d); if (d < bd) { bd = d; best = p; } }
  if (!best) return null;
  for (const id of MUS_CAST) { const S = MUS_SPOTS[id]; if (Math.hypot((m.u - S.u) * 2.2, m.d - S.d) < bd) return null; }   // a person closer than the thing: talk to them
  return best;
}
function useMusProp(m, p) {
  const U = C.up;
  m.fx = { id: p.id, t: 0 };
  if (p.id === 'carpet') { m.sit = true; m.fx.card = upOf(U, 'carpet') >= 2 ? 'The new carpet is soft, with a prayer arch for every place in the row.' : upOf(U, 'carpet') ? 'Fresh green carpet, straight saff lines. No more guessing where the row is.' : 'The old carpet is a little thin here. It has seen a lot of sajdahs.'; }
  else if (p.id === 'shelf') { const a = MUS_AYAT[(C.ayahI = ((C.ayahI || 0) + 1) % MUS_AYAT.length)]; m.fx.card = '“' + a[0] + '”'; m.fx.sub = a[1]; }
  else if (p.id === 'callig') { m.fx.card = 'بسم الله: In the name of Allah.   الحمد لله: All praise is for Allah.'; if (upOf(U, 'callig') >= 2) m.fx.sub = 'The frieze: “Indeed, prayer has been decreed upon the believers at fixed times.” (An-Nisa’ 4:103)'; }
  else if (p.id === 'chand') m.fx.card = upOf(U, 'chandelier') >= 2 ? 'The crystals catch the light and throw it across the whole room.' : 'Polished brass. Uncle Rafiq wipes it down every Thursday.';
  else if (p.id === 'mihrab') m.fx.card = null;
  SFX.blip();
}
{
  const _mu = musallaUpdate;
  musallaUpdate = function (rdt) {
    const m = Game.mus;
    if (m && m.fx) {
      m.fx.t += rdt;
      const pray = m.fx.id === 'mihrab', end = pray ? 5 : 99;
      if (m.fx.t > end || (!pray && m.fx.t > 0.3 && (menuHit('ok') || menuHit('back') || Input.pressed.KeyF || Input.pressed.KeyE))) { m.fx = null; if (pray) toast('Two rak’ahs to greet the masjid. May Allah accept it.', 3); }
      m.me.vx = m.me.vz = 0; animate(m.me, Math.min(rdt, 0.05));
      return;
    }
    if (m && !m.talk && Gym.overlay !== 'adhan') {
      const p = musPropNear(m);
      if (p && (menuHit('ok') || Input.pressed.KeyE || Input.pressed.KeyF)) { useMusProp(m, p); return; }
    }
    const u0 = m && m.u, d0 = m && m.d;
    const r = _mu.apply(this, arguments);
    if (Game.mus === m && m) {
      if (m.sit && (Math.abs(m.u - u0) + Math.abs(m.d - d0) > 1e-4)) m.sit = false;    // walking stands you up
      m.prop = !m.talk ? musPropNear(m) : null; if (m.prop) m.near = null;
    }
    return r;
  };
  // sitting: draw yourself cross-legged by swapping in the figure pose
  const _mf = musFigure;
  musFigure = function (g, p, x, y, s, pose) { if (Game.mus && p === Game.mus.me && Game.mus.sit) pose = 'cross'; return _mf.call(this, g, p, x, y, s, pose); };
  const _dm = drawMusallaScreen;
  drawMusallaScreen = function (g) {
    _dm.apply(this, arguments);
    const m = Game.mus; if (!m) return;
    if (m.prop && !m.fx && !m.talk) {
      const at = musToScreen(m.u, m.d), top = at.y - 150 * at.s, label = m.prop.label + (Input.touchMode ? '' : '  (E)');
      g.font = `12px ${FONT}`; const w = g.measureText(label).width + 26;
      g.fillStyle = 'rgba(44,110,143,0.95)'; roundRect(g, at.x - w / 2, top - 26, w, 26, 13); g.fill();
      g.fillStyle = '#f2e6c8'; g.textAlign = 'center'; g.fillText(label, at.x, top - 8);
      const p = m.prop; addRect(at.x - w / 2, top - 26, w, 26, () => useMusProp(m, p));
    }
    const fx = m.fx; if (!fx) return;
    if (fx.id === 'chand') {                         // glints around the chandelier
      const R = musRoom(), cy = 300 - 230;
      for (let i = 0; i < 14; i++) { const a = i * 2.4 + fx.t * 0.7, r = 30 + ((i * 53) % 90), k = (Math.sin(fx.t * 5 + i) + 1) / 2, x = W / 2 + Math.cos(a) * r * 1.6, y = cy + 40 + Math.sin(a) * r * 0.6;
        g.fillStyle = `rgba(255,245,210,${0.3 + 0.7 * k})`; star8(g, x, y, 2 + k * 4); g.fill(); }
    }
    if (fx.id === 'mihrab') {                        // two rak'ahs: the room dims, then comes back
      const t = fx.t, a = t < 0.8 ? t / 0.8 : t > 4.2 ? Math.max(0, (5 - t) / 0.8) : 1;
      g.fillStyle = `rgba(4,10,14,${0.82 * a})`; g.fillRect(0, 0, W, H);
      g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#f5d98a'; g.font = `40px ${AR_FONT}`; g.fillText('ٱللَّهُ أَكْبَرُ', W / 2, H / 2 - 10);
      g.fillStyle = IVORY; g.font = `16px ${BODY}`; g.fillText('Two rak’ahs to greet the masjid (tahiyyat al-masjid)', W / 2, H / 2 + 30); g.globalAlpha = 1;
      return;
    }
    if (fx.card) {
      panel(g, 120, 400, W - 240, fx.sub ? 104 : 80, true);
      g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `16px ${BODY}`; wrapText(g, fx.card, W / 2, 434, W - 300, 20);
      if (fx.sub) { g.fillStyle = '#c9d8d2'; g.font = `13px ${BODY}`; wrapText(g, fx.sub, W / 2, 476, W - 300, 17); }
      g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText('Enter or tap to continue', W / 2, fx.sub ? 498 : 472);
      addRect(0, 60, W, H - 60, () => { m.fx = null; });
    }
  };
}
// ---- outside, in My Masjid: tap what you've built
const ExtFx = { id: null, t: 0 };
function extSpots() {
  const U = C.up, ms = upOf(U, 'musalla'), bw = [240, 330, 420][ms], bh = [130, 150, 175][ms], pk = upOf(U, 'parking'), x0 = pk === 2 ? 320 : 300, top = 392 - bh, L = [];
  if (upOf(U, 'minaret')) L.push({ id: 'minaret', x: x0 + bw + 41, y: 392 - 236, cap: 'Allahu akbar, Allahu akbar... the adhan carries all the way down the main road.' });
  if (upOf(U, 'dome')) L.push({ id: 'dome', x: x0 + bw / 2, y: top - 26 - bw * 0.24 * 0.8, cap: 'The afternoon sun catches the dome.' });
  if (upOf(U, 'garden')) L.push({ id: 'garden', x: x0 - 18, y: 392 - 52, cap: 'Sparrows take off from the trees Uncle Rafiq planted.' });
  if (upOf(U, 'garden') >= 2) L.push({ id: 'fount', x: pk === 2 ? 640 : 820, y: 404, cap: 'Kids splash at the fountain after Asr. Nobody has the heart to stop them.' });
  if (pk) L.push({ id: 'park', x: 120, y: 410, cap: 'An uncle pulls in and parks. Properly. Inside the lines.' });
  return L;
}
{
  const _dv = drawMasjidView;
  drawMasjidView = function (g) {
    _dv.apply(this, arguments);
    if (Game.masjidView === 'int' || !C) return;
    const dt = Math.min(Game.rdt || STEP, 0.05), S = extSpots(), F = ExtFx;
    if (F.id) F.t += dt;
    const s = S.find(x => x.id === F.id);
    if (s) {
      const t = F.t;
      if (s.id === 'minaret') for (let i = 0; i < 3; i++) { const k = ((t * 0.6 + i / 3) % 1); g.strokeStyle = `rgba(255,240,200,${0.8 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y - 30, 20 + k * 160, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); }
      if (s.id === 'dome') { const k = clamp(t / 1.4, 0, 1), bx = s.x - 60 + k * 120; g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.8; g.fillStyle = '#fffbe8'; g.beginPath(); g.moveTo(bx - 6, s.y + 30); g.lineTo(bx + 6, s.y - 30); g.lineTo(bx + 14, s.y - 30); g.lineTo(bx + 2, s.y + 30); g.fill(); g.restore(); g.fillStyle = `rgba(255,250,220,${0.8 * Math.sin(k * Math.PI)})`; star8(g, s.x, s.y - 34, 6); g.fill(); }
      if (s.id === 'garden') for (let i = 0; i < 6; i++) { const bx = s.x + t * (60 + i * 18), by = s.y - t * (40 + i * 9) + Math.sin(t * 9 + i) * 3; g.strokeStyle = '#3a3a3a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx - 4, by - 2); g.lineTo(bx, by + 1); g.lineTo(bx + 4, by - 2); g.stroke(); }
      if (s.id === 'fount') for (let i = 0; i < 16; i++) { const k = ((t * 1.3 + i / 16) % 1), a = i * 2.39; g.fillStyle = `rgba(160,215,240,${0.9 * (1 - k)})`; g.beginPath(); g.arc(s.x + Math.cos(a) * k * 50, s.y + 6 - Math.sin(k * Math.PI) * 26 + Math.sin(a) * 6, 2, 0, Math.PI * 2); g.fill(); }
      if (s.id === 'park') { const k = clamp(t / 2.4, 0, 1), cx = lerp(-60, s.x, Math.min(1, k * 1.4)), cy = k < 0.7 ? 494 : lerp(494, s.y + 34, (k - 0.7) / 0.3); g.fillStyle = '#2e86de'; roundRect(g, cx - 17, cy - 10, 34, 18, 5); g.fill(); g.fillStyle = 'rgba(160,200,230,0.9)'; g.fillRect(cx - 9, cy - 7, 18, 6); g.fillStyle = '#1c1c1c'; g.fillRect(cx - 14, cy + 7, 8, 3); g.fillRect(cx + 6, cy + 7, 8, 3); }
      textPill(g, W / 2, H - 84, 32, s.cap, `13px ${BODY}`, 'rgba(8,16,24,0.82)', '#fff', 580, W - 40);   // v9.6.2: sized to the caption
      if (t > 4) F.id = null;
    }
    for (const sp of S) {                                  // small markers on what you can tap
      const b = Math.sin(Game.t * 3 + sp.x) * 2;
      g.fillStyle = 'rgba(232,195,90,0.9)'; g.beginPath(); g.arc(sp.x, sp.y + b, 8, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = NIGHT; star8(g, sp.x, sp.y + b, 4); g.fill();
      addRect(sp.x - 26, sp.y - 26, 52, 52, () => { ExtFx.id = sp.id; ExtFx.t = 0; SFX.blip(); });
    }
    if (S.length && !s) { g.fillStyle = 'rgba(8,16,24,0.7)'; roundRect(g, W / 2 - 150, H - 80, 300, 26, 13); g.fill(); g.fillStyle = '#c9d8d2'; g.font = `12px ${BODY}`; g.textAlign = 'center'; g.fillText('Tap the gold markers to see what you built', W / 2, H - 62); }
  };
}
