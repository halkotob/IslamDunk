// ================================================= v9.4: JUMU'AH
// On a Friday (career calendar on, a free day), going into the masjid asks "Attend Jumu'ah" or "Not today", one
// press either way. Not today simply goes in as on any other day: no penalty, no streak, no message.
// Attending plays a short, calm scene in the musalla: the brothers seated, Sh. Saleem speaking 2-3 short reminders.
// The player only listens: lines advance on their own (or with Enter / a tap), Esc / Back / Skip leaves at any
// time. There is no quiz, timer, score or reward, and the prayer itself is not shown.
// Every reminder is an existing trivia question (src/data/trivia.js) with its existing explanation (TRIVIA_WHY in
// office.js), with only a neutral lead-in ("Today's reminder:"). Nothing else is said. Reminders come from
// questions the player hasn't studied, not used in the last few Fridays, picked from the day (a reload shows the
// same talk). Each reminder shown is added to C.learned, exactly like studying at the shelf: "Studied" in the Noor
// challenge, and the books_10 achievement. When every question is studied, two general reminders, no marks.
// Saved in the career: C.cal.jum = { days: [days attended], recent: [question indices], talk: { d, qs, general,
// shown, answered } }. Attendance also counts in the calendar's day counters (calCount('jumuah')) for later steps.

// <jumuah-text> (pure: also run by scripts/review-export.mjs and scripts/review-jumuah.mjs for the review list)
// questions left out of the khutbah, and why (their explanations speak about the game itself)
const JUMUAH_SKIP = { 90: 'the explanation mentions our masjid’s name in the game', 166: 'the explanation mentions a game', 179: 'the explanation mentions Noor on the court' };
const JUMUAH_LEAD = ['Today’s reminder: ', 'Let us also remember: ', 'And a last reminder: '];
const JUMUAH_NUM = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 10: 'ten', 12: 'twelve', 25: 'twenty-five', 1000: 'thousand' };
function jumuahEligible() { return TRIVIA.map((_, i) => i).filter(i => !(i in JUMUAH_SKIP) && !!TRIVIA_WHY[i]); }
// the reminder itself: the explanation, with the question and its answer in front when the explanation doesn't name it
function jumuahCore(i) {
  const q = TRIVIA[i][0], a = String(TRIVIA[i][1][0]), why = TRIVIA_WHY[i], low = why.toLowerCase();
  if (low.includes(a.toLowerCase()) || (JUMUAH_NUM[a] && low.includes(JUMUAH_NUM[a]))) return why;
  const ask = /\.\.\.$/.test(q) ? q.replace(/\.\.\.$/, ' ') + a.charAt(0).toLowerCase() + a.slice(1) + '.' : q + ' ' + a + '.';
  return ask + ' ' + why;
}
function jumuahLine(i, k, n) { return JUMUAH_LEAD[k === n - 1 && k > 0 ? 2 : Math.min(k, 1)] + jumuahCore(i); }
// a few words for the "touched on" card: the question itself
function jumuahTopic(i) { return TRIVIA[i][0].replace(/\.\.\.$/, '…'); }
// </jumuah-text>

function jumState() { const cal = calEnsure(); if (!cal.jum) cal.jum = { days: [], recent: [], talk: null }; const J = cal.jum; J.days = J.days || []; J.recent = J.recent || []; return J; }
function jumuahToday() { return worldOn() && !C.seasonOver && calDay(C.cal.d).fri; }
// today's talk: made once per Friday and kept in the save
function jumuahTalk() {
  const J = jumState(), d = C.cal.d;
  if (J.talk && J.talk.d === d) return J.talk;
  const R = seededRng(hash32('jumuah:' + (C.seed || 0) + ':' + d)), elig = jumuahEligible(), recent = new Set(J.recent);
  const fresh = elig.filter(i => !C.learned.includes(i)), general = fresh.length < 2;
  let pool = (general ? elig : fresh).filter(i => !recent.has(i)); if (pool.length < 3) pool = general ? elig : fresh;
  const n = general ? 2 : Math.min(pool.length, R() < 0.5 ? 2 : 3);
  const qs = pool.map(i => [R(), i]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
  J.talk = { d, qs, general, shown: [], answered: 0 };
  saveCareer();
  return J.talk;
}
function jumuahPending() { if (!jumuahToday()) return false; const L = worldLoc(); if (L.vis.masjid || L.tod >= 3) return false; const J = jumState(); return !(J.talk && J.talk.d === C.cal.d && J.talk.answered); }

// ---------------------------------------------------------------- the question at the door
function jumuahAsk() { jumuahTalk(); World.jum = { idx: 0 }; SFX.blip(); }
function jumuahAnswer(attend) {
  const T = jumuahTalk(); T.answered = attend ? 2 : 1; World.jum = null;
  if (!attend) { saveCareer(); jumuahEnterMasjidPlain(); return; }
  const J = jumState(); if (!J.days.includes(C.cal.d)) J.days.push(C.cal.d); calCount('jumuah');
  worldGo(null, null, () => { const L = worldLoc(); L.vis.masjid = 1; L.inMasjid = 1; L.scene = 'hub'; calCount('visit_masjid'); saveCareer(); openJumuah(); });
}
let jumuahEnterMasjidPlain = null;
function jumAskUpdate() {
  const A = World.jum;
  if (menuHit('left') || menuHit('up')) { A.idx = 0; SFX.blip(); }
  if (menuHit('right') || menuHit('down')) { A.idx = 1; SFX.blip(); }
  if (menuHit('ok')) jumuahAnswer(A.idx === 0);
  else if (menuHit('back')) jumuahAnswer(false);
}
function jumDrawAsk(g) {
  const A = World.jum, TT = Input.touchMode && g === ctx, w = 560, h = 196, x = W / 2 - w / 2, y = H / 2 - h / 2 - 20;
  dim(g, 0.45); panel(g, x, y, w, h, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Jumu’ah', W / 2, y + 42);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText(fitText(g, 'Sh. Saleem gives the khutbah today.', w - 40), W / 2, y + 74);
  const bw = 220, bh = 44, by = y + 104, b0 = W / 2 - bw - 10, b1 = W / 2 + 10;
  [['Attend Jumu’ah', b0], ['Not today', b1]].forEach(([t, bx], k) => {
    const on = A.idx === k;
    if (on) goldPill(g, bx, by, bw, bh, 22, false); else glassPill(g, bx, by, bw, bh, 22, 0.5);
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText(t, bx + bw / 2, by + 28);
    addRect(bx, by, bw, bh, () => { A.idx = k; jumuahAnswer(k === 0); });
  });
  if (!TT) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('← → choose  •  Enter  •  Esc: not today', W / 2, y + h - 18); }
}

// ---------------------------------------------------------------- the scene
const JUM_OPEN = 4.5;                                              // seconds of the room before the first reminder
function jumLineDur(text) { return clamp(text.length / 12, 12, 18); }
function openJumuah() {
  const T = jumuahTalk(), mk = def => { const p = new Player(def, 9, 0, amanahTeam()); p.outfit = 'thobe'; p.state = 'free'; p.x = -9999; p.fakeIdle = true; for (let i = 0; i < 20; i++) animate(p, 1 / 60); return p; };
  // the congregation, seated in rows facing the minbar (u across, d depth)
  const seats = [['mahmoud', 0.05, 0.3, 'chair'], ['rafiq', 0.2, 0.3], ['siddiq', 0.34, 0.3], ['tariq', 0.8, 0.3], ['nasser', 0.93, 0.3],
    ['karim', 0.12, 0.44], ['you', 0.3, 0.44], ['khalil', 0.47, 0.44], ['yusuf', 0.72, 0.44, 'chair'], ['idris', 0.87, 0.44],
    ['bilal', 0.22, 0.57], ['sami', 0.42, 0.57], ['daniel', 0.62, 0.57], ['hamza', 0.81, 0.57]];
  const defOf = id => CAST[id] || id === 'you' ? castDef(id) : typeof WORLD_NPC_LOOK !== 'undefined' && WORLD_NPC_LOOK[id] ? Object.assign({ num: 0 }, WORLD_NPC_LOOK[id]) : null;
  const people = seats.filter(s => defOf(s[0])).map(([id, u, d, pose]) => ({ id, u, d, pose: pose || 'cross', p: mk(defOf(id)) }));
  const saleem = mk(castDef('saleem'));
  Game.jum = { li: -1, t: 0, fade: 0.6, card: false, people, saleem, lines: T.qs.map((q, k) => jumuahLine(q, k, T.qs.length)), photo: null, newly: 0 };
  Game.screen = 'jumuah';
}
function jumShow(li) {                                              // a reminder is on screen: it counts as heard
  const J = Game.jum, T = jumuahTalk(), qi = T.qs[li]; if (qi == null) return;
  J.li = li; J.t = 0;
  if (!T.shown.includes(qi)) {
    T.shown.push(qi); const S = jumState(); S.recent = S.recent.filter(x => x !== qi).concat([qi]).slice(-9);
    if (!T.general && !C.learned.includes(qi)) { C.learned.push(qi); J.newly++; Ach.set('books_10', C.learned.length); }
    saveCareer();
  }
}
function jumNext() {
  const J = Game.jum; if (!J) return;
  if (J.card) { jumFinish(); return; }
  if (J.li + 1 < J.lines.length) jumShow(J.li + 1); else { J.card = true; J.t = 0; }
}
function jumFinish() { if (!Game.jum) return; Game.jum = null; saveCareer(); Game.worldSuppress = true; careerHub(); Game.hubFade = 1; }
function jumuahUpdate(rdt) {
  const J = Game.jum; if (!J) { careerHub(); return; }
  if (J.photo) return;
  const dt = Math.min(rdt, 0.05);
  if (J.fade > 0) J.fade -= dt;
  for (const f of J.people) animate(f.p, dt); J.saleem.fakeIdle = true; animate(J.saleem, dt);
  if (menuHit('back')) { jumFinish(); return; }
  if (menuHit('ok')) { if (J.li < 0) jumShow(0); else jumNext(); return; }
  J.t += dt;
  if (J.card) return;
  if (J.li < 0) { if (J.t >= JUM_OPEN) jumShow(0); return; }
  if (J.t >= jumLineDur(J.lines[J.li])) jumNext();
}
function jumWrap(g, text, maxW) {
  const out = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function jumMinbar(g, x, y, s) {                                    // a plain wooden minbar: three steps and a rail
  const st = 15 * s, sw = 22 * s;
  g.fillStyle = '#6b4526';
  for (let k = 0; k < 3; k++) g.fillRect(x - sw * 1.5 + k * sw, y - st * (k + 1), sw * (3 - k), st);
  g.fillStyle = '#4a2e16'; g.fillRect(x - sw * 1.5, y - 2, sw * 3, 3);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - sw * 1.5, y - st); g.lineTo(x + sw * 0.5, y - st * 3 - 26 * s); g.lineTo(x + sw * 1.5, y - st * 3 - 26 * s); g.stroke();
  return st * 3;
}
function drawJumuah(g) {
  const J = Game.jum; if (!J) return;
  const TT = Input.touchMode && g === ctx;
  drawMusalla(g, C.up, 'visit', J.photo ? 0 : Game.t);
  // the khateeb on the minbar, right of the mihrab
  const kh = musToScreen(0.64, 0.14), lift = jumMinbar(g, kh.x, kh.y, kh.s);
  J.saleem.face = -1; musFigure(g, J.saleem, kh.x, kh.y - lift, kh.s, 'stand');
  // the brothers, seated, back rows first, each turned toward the minbar
  const list = J.people.map(f => Object.assign({ f }, musToScreen(f.u, f.d))).sort((a, b) => a.y - b.y);
  for (const o of list) { o.f.p.face = o.x < kh.x ? 1 : -1; musFigure(g, o.f.p, o.x, o.y, o.s, o.f.pose); }
  // header
  g.fillStyle = 'rgba(8,16,24,0.8)'; roundRect(g, 96, 8, 250, 32, 16); g.fill();
  g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'left'; g.fillText('Jumu’ah', 112, 29);
  const hx = 124 + g.measureText('Jumu’ah').width; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(fitText(g, calText(C.cal.d), 336 - hx), hx, 29);
  if (J.card) drawJumuahCard(g, TT);
  else if (J.li < 0) {
    const t = 'The brothers sit for the khutbah.';
    g.font = `16px ${BODY}`; const w = Math.min(W - 80, g.measureText(t).width + 48);
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, W / 2 - w / 2, H - 70, w, 40, 20); g.fill();
    g.fillStyle = IVORY; g.textAlign = 'center'; g.fillText(fitText(g, t, w - 32), W / 2, H - 44);
    addRect(0, 60, W, H - 60, () => jumShow(0));
  } else {
    // the speech panel
    const x = 34, w = W - 68, text = J.lines[J.li];
    g.font = `17px ${BODY}`; const lines = jumWrap(g, text, w - 48), lh = Math.max(24, phoneEffPx(g) * 1.25), h = 58 + lines.length * lh + (TT ? 6 : 22);
    const y = H - h - 12;
    panel(g, x, y, w, h, true);
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `15px ${FONT}`; g.fillText('Sh. Saleem', x + 24, y + 30);
    // where we are in the talk: one dot per reminder
    for (let k = 0; k < J.lines.length; k++) { g.fillStyle = k <= J.li ? GOLD : 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x + w - 30 - (J.lines.length - 1 - k) * 16, y + 25, 4.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fff'; g.font = `17px ${BODY}`; lines.forEach((l, k) => g.fillText(l, x + 24, y + 58 + k * lh));
    if (!TT) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'right'; g.fillText('Enter: next  •  Esc: leave', x + w - 22, y + h - 12); }
    addRect(0, 60, W, H - 60, jumNext);
  }
  if (J.fade > 0) { g.fillStyle = `rgba(4,10,14,${J.fade / 0.6})`; g.fillRect(-400, 0, W + 800, H); }
}
function drawJumuahCard(g, TT) {
  const J = Game.jum, T = jumuahTalk(), qs = T.shown.length ? T.shown : T.qs.slice(0, 0);
  g.fillStyle = 'rgba(6,12,20,0.5)'; g.fillRect(-400, 0, W + 800, H);     // a still dim (no moving pattern)
  const w = Math.min(640, W - 60), rows = Math.max(1, qs.length), h = 132 + rows * 40 + (J.newly ? 28 : 0), x = W / 2 - w / 2, y = H / 2 - h / 2;
  panel(g, x, y, w, h, true);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `20px ${FONT}`; g.fillText('Today’s khutbah touched on:', x + 28, y + 40);
  qs.forEach((qi, k) => {
    const ry = y + 62 + k * 40;
    drawBook(g, x + 30, ry + 2);
    g.fillStyle = '#fff'; g.font = `15px ${BODY}`; g.textAlign = 'left'; g.fillText(fitText(g, jumuahTopic(qi), w - 100), x + 62, ry + 18);
  });
  let fy = y + 62 + rows * 40;
  if (J.newly) { g.fillStyle = '#9dffb0'; g.font = `13px ${BODY}`; g.fillText(fitText(g, 'These now show as Studied in the Noor challenge.', w - 56), x + 28, fy + 12); fy += 28; }
  const bw = 180, bx = W / 2 - bw / 2, by = fy + 14;
  goldPill(g, bx, by, bw, 40, 20, false); g.fillStyle = NIGHT; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText('Continue', W / 2, by + 26);
  addRect(bx, by, bw, 40, jumFinish);
}

// ---------------------------------------------------------------- glue
CAREER_SCREENS.add('jumuah');
BACK.jumuah = () => jumFinish();
{
  const _cu = careerUpdate;
  careerUpdate = function (rdt) { if (Game.screen === 'jumuah') return jumuahUpdate(rdt); return _cu.apply(this, arguments); };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'jumuah') return drawJumuah(g); return _cr.apply(this, arguments); };
  const _ds = drawScene;
  drawScene = function () { if (Game.screen === 'jumuah') return; return _ds.apply(this, arguments); };
  // the masjid door on a Friday asks first
  jumuahEnterMasjidPlain = worldEnterMasjid;
  worldEnterMasjid = function () { if (jumuahPending()) { jumuahAsk(); return; } return jumuahEnterMasjidPlain.apply(this, arguments); };
  const _wu = worldUpdate;
  worldUpdate = function (rdt) { if (World.jum && Game.screen === 'world') { jumAskUpdate(); return; } return _wu.apply(this, arguments); };
  const _wd = worldDraw;
  worldDraw = function (g) { const r = _wd.apply(this, arguments); if (World.jum && Game.screen === 'world') jumDrawAsk(g); return r; };
  const _bw = BACK.world;
  BACK.world = () => { if (World.jum) { jumuahAnswer(false); return; } return _bw(); };
  const _tu = TouchUI.update;
  TouchUI.update = function () {
    const r = _tu.apply(this, arguments);
    if (this.el && (Game.screen === 'jumuah' || (Game.screen === 'world' && World.jum)) && this.el.style.display !== 'none') { this.el.style.display = 'none'; this.shown = false; Input.stick.ax = Input.stick.az = 0; }
    return r;
  };
}
