// ================================================= v9.31: CAREER REFINE 2 — the practice gym is home
// (docs/career-overhaul/REFINE-PLAN.md, release 2; SCENES.md, Rules)
// - Home is the practice gym: you, the ball, and whoever has the next game or scene standing on court with a marker.
//   Talk to him, or press Next on the left bar, to go on. Before and after every game you are back here.
// - The left bar (Next, Drills, Musalla, Office, Upgrade, Menu) replaces the gym's bottom bar; the objective box
//   sits under the Back button.
// - Nobody talks off screen: every line the story says outside a place-talk plays here, in the gym, with its
//   speakers standing near you (storySay). Narration alone may still set a scene.
// - Mini games get a ready panel on the left in their own look; league games keep their pregame card.
// - The old hub screen is the full menu now (Menu, or Esc in the gym).

// ---------------------------------------------------------------- who has the next thing
function storyStarterOf(S) {
  if (!S || S.unbuilt || (S.ch > STORY_BUILT && S.ch <= 5)) return null;
  if (S.kind === 'walk' || S.kind === 'drill') return null;              // a walk starts with Next (it's here in the gym)
  if (S.bracket) return C.partner || 'saleem';
  if (S.kind === 'choice') return 'saleem';
  if (S.kind === 'play') { const L = S.pre && !C.story.seen[S.id] ? storyLinesOf(S, 'pre') : []; const f = L.find(l => CAST[l[0]] && l[0] !== 'narr' && l[0] !== 'you'); return f ? f[0] : 'saleem'; }
  if (S.talk && S.talk.who) return S.talk.who;
  if (S.custom) return null;
  const L = typeof S.lines === 'function' ? [] : (S.lines || []), f = L.find(l => CAST[l[0]] && l[0] !== 'narr' && l[0] !== 'you');
  return f ? f[0] : 'saleem';
}
function storyNextName() { const S = storyScene(); return S && !S.unbuilt ? S.name : ''; }
// ---------------------------------------------------------------- home
let _homeBusy = false;
function storyHome() {
  if (!storyOn() || _homeBusy) return;
  _homeBusy = true;
  try {
    const S = storyScene(), who = storyStarterOf(S);
    const npcs = who && CAST[who] ? [{ id: who, x: 1000, z: 420, act: 'host', face: -1, closer: true, onTalk: storyHomeNext }] : [];
    storyWalkStart({ id: 'HOME', ch: storyChapter(), name: 'Practice' }, { title: 'Practice', free: true, home: true, npcs });
    if (SW) SW.fade = 0.4;
  } finally { _homeBusy = false; }
}
function storyAtHome() { return Game.screen === 'gym' && !!(Gym.story && SW && SW.D.home); }
function storyHomeNext() {
  if (Gym.ready) return;
  Game.fromHome = true; try { storyRun(); } finally { Game.fromHome = false; }
}
function careerMenu() { Game.wantMenu = true; careerHub(); }
{
  const _ch = careerHub;
  careerHub = function () {
    const menu = Game.wantMenu; Game.wantMenu = false;
    const r = _ch.apply(this, arguments);
    if (storyOn() && !menu && !_homeBusy) { Gym.ready = null; storyHome(); }
    return r;
  };
  // a talk with someone at home: his own action (go on to the next thing)
  const _tt = swTalkTo;
  swTalkTo = function (id) { const I = SW, d = I && I.defs[id]; if (d && d.onTalk && !I.talk && !I.fadeDir) { d.onTalk(); return; } return _tt.apply(this, arguments); };
  // home never ends by itself, and Esc there opens the menu
  const _ce = swCheckEnd;
  swCheckEnd = function () { if (SW && (SW.D.home || SW.D.say)) return; return _ce.apply(this, arguments); };
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    if (Gym.ready && Game.screen === 'gym') { readyUpdate(); return; }
    if (storyAtHome() && !SW.talk && !Gym.drill && !Gym.overlay && !Gym.result && !Gym.walk && !Gym.fade && !Gym.prop && menuHit('back')) { careerMenu(); return; }
    if (storyAtHome() && !SW.talk && !Gym.drill && !Gym.overlay && Input.pressed.KeyN) { storyHomeNext(); return; }
    return _gu.apply(this, arguments);
  };
  // during a drill only the drill's people are on court
  const _ex = gymExtras;
  gymExtras = function (E, g) { if (Gym.story && Gym.story === SW && Gym.drill) { const keep = Gym.story; Gym.story = null; try { return _ex.apply(this, arguments); } finally { Gym.story = keep; } } return _ex.apply(this, arguments); };
}

// ---------------------------------------------------------------- nobody talks off screen
// The lines play in the gym with their speakers standing near you, in the game's own view and the same text box.
const SAY_SPOTS = [[95, -70], [165, 20], [-115, -50], [-60, 80]];
function storySay(lines, then, title) {
  const speakers = []; for (const [id] of lines) if (CAST[id] && id !== 'narr' && id !== 'you' && !speakers.includes(id) && speakers.length < SAY_SPOTS.length) speakers.push(id);
  const done = () => { Gym.story = null; SW = null; if (then) then(); };
  if (Game.screen === 'gym' && SW && Gym.story === SW) {                 // already in the gym: they walk up, and it plays here
    const me = M.players[0];
    speakers.forEach((id, k) => { if (SW.npcs[id]) return; const p = swPlayer(id), [dx, dz] = SAY_SPOTS[k]; p.x = clamp(me.x + dx, 520, 1300); p.z = clamp(me.z + dz, 60, 640); p.face = sgn(me.x - p.x) || 1; p.swAct = 'host'; SW.npcs[id] = p; SW.defs[id] = { id, x: p.x, z: p.z, act: 'host' }; SW.D.npcs.push(SW.defs[id]); });
    swSay(lines, done); if (SW.talk) SW.talk.t = 0.3;
    return;
  }
  enterGym(); M.lobbyGym = false;
  const me = M.players[0], mx = 820, mz = 520;
  const npcs = speakers.map((id, k) => { const [dx, dz] = SAY_SPOTS[k]; return { id, x: clamp(mx + dx, 520, 1300), z: clamp(mz + dz, 60, 640), act: 'host', face: dx > 0 ? -1 : 1 }; });
  storyWalkStart({ id: 'SAY', ch: storyChapter(), name: title || 'Practice' }, { title: '', say: true, npcs });
  if (me) { place(me, mx, mz); me.face = 1; }
  if (SW) { SW.fade = 0; swSay(lines, done); if (SW.talk) SW.talk.t = 0.3; }
}
{
  // every story line said with people in it goes through storySay; narration alone keeps the plain box
  const _ps = playStory;
  playStory = function (lines, then, title) {
    const L = (lines || []).filter(l => Array.isArray(l));
    if (!storyOn() || !L.some(l => CAST[l[0]] && l[0] !== 'narr') || L.some(l => l[0] === 'choice')) return _ps.apply(this, arguments);
    if (C && !Game.replaying) { const J = C.journal || (C.journal = []); J.push({ s: C.season || 1, st: C.stage, g: C.gamesPlayed || 0, title: title || '', lines: L.filter(l => l[0] !== 'choice').slice(0, 14) }); if (J.length > 120) J.shift(); }   // (as the story screen did: the Journal keeps it)
    storySay(L, then, title);
  };
}

// ---------------------------------------------------------------- before and after every game: the gym
{
  const _sd = storyDone;
  storyDone = function (S, outcome) {
    const st = C.story;
    let next = outcome === 'win' ? S.win : outcome === 'loss' ? S.loss : outcome === 'out' ? S.out : S.next;
    if (typeof next === 'function') next = next(outcome);
    if (!next) next = S.next;
    const N = SC[next];
    if (S.kind === 'play' || (N && N.kind === 'play')) {                  // a game just ended, or one is next: home first
      st.seen[S.id] = (st.seen[S.id] || 0) + 1;
      storyGo(next); careerHub(); return;
    }
    return _sd.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- the ready panel (mini games, the tutorial game)
const READY_LOOK = {
  pickup: { title: 'Pickup game', col: '#2c6e8f', how: 'You and Sh. Saleem against Ammo Jamil and Ilyas. First to 11.' },
  lightning: { title: 'Lightning', col: '#e8c35a', how: 'Two balls, one line. Make your shot before the player behind you makes his, or you’re out.' },
  kotc: { title: 'King of the Court', col: '#c9a24a', how: 'One on one, first to 3. Hold the court three games in a row to be crowned.' },
  kotcDraw: { title: 'King of the Court: the draw', col: '#c9a24a', how: 'One on one against the other teams’ captains. Every game you win makes the draw easier.' },
  chai: { title: 'CHAI', col: '#7a4a2a', how: 'Make a shot; your opponent has to match it from the same spot. Spell CHAI and you make the chai.' },
  allstar: { title: 'All-star game', col: '#ff8a4a', how: 'Dunks only: a jumper or a layup counts nothing. Every dunk fills the crowd meter.' },
  lightsout: { title: 'Lights out', col: '#3b3b3b', how: 'Two on two in the dark. Watch the glow around the players and the ball.' }
};
function storyReady(S, go) {
  if (Game.screen !== 'gym') { enterGym(); M.lobbyGym = false; }
  Gym.story = null; SW = null; Gym.overlay = null; Gym.drill = null; Gym.toastT = 0;
  const L = READY_LOOK[S.mode] || { title: S.name, col: GOLD, how: '' };
  Gym.ready = { S, go, look: L, sel: 0 }; SFX.blip && SFX.blip();
}
function readyStart() { const R = Gym.ready; if (!R) return; Gym.ready = null; R.go(); }
function readyLater() { Gym.ready = null; careerHub(); }
function readyUpdate() {
  const R = Gym.ready;
  if (menuHit('up') || menuHit('down')) { R.sel ^= 1; SFX.blip && SFX.blip(); }
  if (menuHit('ok')) { if (R.sel) readyLater(); else readyStart(); }
  else if (menuHit('back')) readyLater();
}
function drawReady(g) {
  const R = Gym.ready; if (!R) return;
  const L = R.look, x = 12, y = 60, w = 300, TT = Input.touchMode && g === ctx;
  g.font = `13px ${BODY}`; const lines = wrapCount(g, L.how, w - 32), lh = Math.max(18, (typeof phoneEffPx === 'function' ? phoneEffPx(g) : 13) + 6), h = 96 + lines * lh + 104;
  g.fillStyle = 'rgba(8,16,24,0.9)'; roundRect(g, x, y, w, h, 14); g.fill();
  g.fillStyle = L.col; roundRect(g, x, y, w, 8, 4); g.fill();
  g.strokeStyle = L.col; g.lineWidth = 2; roundRect(g, x, y, w, h, 14); g.stroke();
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`; g.fillText('READY?', x + 16, y + 32);
  g.fillStyle = '#fff'; g.font = `20px ${FONT}`; g.fillText(fitText(g, L.title, w - 32), x + 16, y + 58);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; wrapTextLeft(g, L.how, x + 16, y + 84, w - 32, lh);
  const by = y + 96 + lines * lh;
  [['Start', readyStart], ['Not yet', readyLater]].forEach(([t, fn], i) => {
    const bx = x + 16, bw = w - 32, yy = by + i * 46, on = R.sel === i;
    g.fillStyle = i === 0 ? (on ? '#ffe08a' : GOLD) : (on ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)'); roundRect(g, bx, yy, bw, 38, 19); g.fill();
    if (on) { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, bx, yy, bw, 38, 19); g.stroke(); }
    g.textAlign = 'center'; g.fillStyle = i === 0 ? NIGHT : '#fff'; g.font = `15px ${FONT}`; g.fillText(t, bx + bw / 2, yy + 25);
    addRect(bx, yy, bw, 38, () => { R.sel = i; fn(); });
  });
}
function wrapCount(g, text, maxW) { const words = String(text || '').split(' '); let n = text ? 1 : 0, line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { n++; line = w; } else line = t; } return n; }
{
  // every story mini game asks first (league games have their pregame card)
  for (const k of Object.keys(STORY_MODES)) { const go = STORY_MODES[k]; STORY_MODES[k] = function (S) { storyReady(S, () => go(S)); }; }
}

// ---------------------------------------------------------------- the left bar
function gymBarItems() {
  const home = storyAtHome(), nx = home ? storyNextName() : '';
  return [
    home ? { k: 'next', label: nx ? 'Next: ' + nx : 'Next', act: storyHomeNext, glow: true } : null,
    { k: 'drills', label: 'Drills', act: openDrills },
    { k: 'musalla', label: 'Musalla', act: enterMusalla },
    { k: 'office', label: 'Office', act: enterOffice },
    { k: 'upgrade', label: 'Upgrade', act: () => { Game.trainBack = 'gym'; Game.screen = 'train'; Game.idx = 0; } },
    home ? { k: 'menu', label: 'Menu', act: careerMenu } : null
  ].filter(Boolean);
}
function drawBarIcon(g, k, x, y, col) {
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  if (k === 'next') { g.moveTo(x - 5, y - 6); g.lineTo(x + 4, y); g.lineTo(x - 5, y + 6); g.closePath(); g.fill(); }
  else if (k === 'drills') { g.arc(x, y, 6, 0, Math.PI * 2); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.quadraticCurveTo(x + 4, y, x, y + 6); g.stroke(); }
  else if (k === 'musalla') { g.moveTo(x - 6, y + 6); g.lineTo(x - 6, y - 1); g.quadraticCurveTo(x - 5, y - 7, x, y - 8); g.quadraticCurveTo(x + 5, y - 7, x + 6, y - 1); g.lineTo(x + 6, y + 6); g.stroke(); }
  else if (k === 'office') { g.rect(x - 6, y - 7, 12, 14); g.moveTo(x + 3, y); g.arc(x + 3, y, 1, 0, Math.PI * 2); g.stroke(); }
  else if (k === 'upgrade') { g.moveTo(x, y + 7); g.lineTo(x, y - 6); g.moveTo(x - 5, y - 1); g.lineTo(x, y - 6); g.lineTo(x + 5, y - 1); g.stroke(); }
  else { for (const dy of [-5, 0, 5]) { g.moveTo(x - 6, y + dy); g.lineTo(x + 6, y + dy); } g.stroke(); }
  g.restore();
}
// the left column: objective box (if any) under the Back button, then the bar; returns the bar's bottom
function drawGymBar(g, y0) {
  const TT = Input.touchMode && g === ctx, items = gymBarItems(), x = 12, w = TT ? 46 : 168, h = TT ? 44 : 34, gap = 6;
  items.forEach((it, i) => {
    const y = y0 + i * (h + gap), pulse = it.glow ? 0.5 + 0.5 * Math.sin(Game.t * 4) : 0;
    g.fillStyle = it.glow ? `rgba(232,195,90,${0.82 + 0.18 * pulse})` : 'rgba(8,16,24,0.74)'; roundRect(g, x, y, w, h, 10); g.fill();
    if (it.glow) { g.strokeStyle = '#fff8dc'; g.lineWidth = 1.5; roundRect(g, x, y, w, h, 10); g.stroke(); }
    drawBarIcon(g, it.k, x + (TT ? w / 2 : 18), y + h / 2, it.glow ? NIGHT : '#f2cf6b');
    if (!TT) { g.textAlign = 'left'; g.fillStyle = it.glow ? NIGHT : '#fff'; g.font = `12px ${it.glow ? FONT : BODY}`; g.fillText(fitText(g, it.label, w - 40), x + 34, y + h / 2 + 4); }
    addRect(x, y, w, h, it.act);
  });
  const by = y0 + items.length * (h + gap);
  // Barakah Points and Halal Bucks, small, under the bar
  g.textAlign = 'left'; g.font = `11px ${BODY}`; g.fillStyle = '#f2cf6b'; g.fillText(C.bp + ' BP', x + 2, by + 12); g.fillStyle = '#9dffb0'; g.fillText(C.hb + ' HB', x + 2 + (TT ? 0 : 70), by + (TT ? 28 : 12));
  return by + 30;
}
function gymBarShown() { return storyOn() && Game.screen === 'gym' && !Gym.drill && !Gym.overlay && !Gym.result && !Gym.walk && !Gym.fade && !Gym.ready && !(SW && (SW.talk || SW.fadeDir || SW.D.say)) && !(SW && !SW.D.free && !SW.D.home); }

{
  // the HUD: the objective box (story-walk.js) then the bar, the hint, and the ready panel, all on the left
  const _hud = drawGymHUD;
  drawGymHUD = function (g) {
    Gym.hintText = '';
    const r = _hud.apply(this, arguments);
    if (!storyOn() || Game.screen !== 'gym') return r;
    if (Gym.ready) { drawReady(g); return r; }
    if (gymBarShown()) {
      const by = drawGymBar(g, (SW && SW.listBottom) || (Input.touchMode && g === ctx ? 72 : 60));
      if (Gym.hintText && !(Input.touchMode && g === ctx)) { g.font = `11px ${BODY}`; g.fillStyle = 'rgba(8,16,24,0.7)'; const w = Math.min(260, g.measureText(Gym.hintText).width + 22); roundRect(g, 12, by, w, 24, 12); g.fill(); g.fillStyle = '#cfd8e3'; g.textAlign = 'left'; g.fillText(fitText(g, Gym.hintText, w - 20), 23, by + 16); }
    }
    return r;
  };
  // the menu (the old hub screen): everything that isn't quick
  storyHubItems = function () {
    return [
      { label: 'Back to the gym', act: () => careerHub() },
      { label: 'Masjid', sub: [
        { label: 'The musalla', act: () => storyOpenMusalla() },
        { label: 'Sh. Saleem’s office', act: () => storyOpenOffice() },
        { label: 'Outside', act: () => { Game.screen = 'masjid'; Game.masjidView = 'ext'; } },
        { label: 'Projects', act: () => { Game.screen = 'shop'; Game.idx = 0; Game.shopTab = Game.shopTab || 'masjid'; } }] },
      { label: 'My Player', sub: [
        { label: 'Upgrade stats', act: () => { Game.screen = 'train'; Game.idx = 0; } },
        { label: 'Look', act: () => { Game.creator = { idx: creatorFirstRow('look'), isNew: false, tab: 'look', welcomed: true }; Game.screen = 'creator'; } },
        { label: 'Journal', act: () => openJournal() },
        { label: 'League & stats', act: () => openStats() }] },
      { label: 'My plays', act: () => { openMyPlays(); PlayLib.back = { screen: 'hub' }; } },
      { label: 'Settings', act: () => { Game.setRet = 'hub'; Game.screen = 'settings'; Game.idx = 0; Game.setGroup = null; } },
      { label: 'Quit to title', act: () => { saveCareer(); goTitle(); } }
    ];
  };
  const _bs = BACK.settings;
  BACK.settings = function () { if (Game.setRet === 'hub' && Game.setGroup == null && C) { Game.setRet = null; careerMenu(); return; } return _bs.apply(this, arguments); };
  // the menu's back (Esc, the Back pill) goes back to the gym
  const _bh = BACK.hub;
  BACK.hub = function () { if (storyOn() && !(Game.hubMenu && Game.hubMenu.open) && !(Game.menus && Game.menus.hub && Game.menus.hub.sub >= 0)) { careerHub(); return; } return _bh.apply(this, arguments); };
  // the rewards card after a league game: the totals, short (the full list of reasons goes)
  const _dp = drawPostgame;
  drawPostgame = function (g) {
    const p = Game.post; if (!storyOn() || !p || !p.rw) return _dp.apply(this, arguments);
    panel(g, W / 2 - 300, 70, 600, 380, true);
    g.textAlign = 'center'; g.fillStyle = p.won ? GOLD : '#ffb0b0'; g.font = `34px ${FONT}`;
    g.fillText(p.res === 'champ' ? p.stage.name.toUpperCase() + ' CHAMPIONS' : p.won ? 'WIN' : 'LOSS', W / 2, 124);
    g.fillStyle = '#fff'; g.font = `17px ${BODY}`; g.fillText(fitText(g, 'Al-Amanah ' + p.us + ', ' + p.opp.name.replace('Masjid ', '') + ' ' + p.them + '  (' + p.roundName + ')', 540), W / 2, 156);
    if (p.unlocked) { g.fillStyle = '#9dffb0'; g.font = `15px ${FONT}`; g.fillText(fitText(g, p.unlocked, 540), W / 2, 184); }
    [['BARAKAH POINTS', p.rw.bpTotal, '#f2cf6b', 'for your stats'], ['HALAL BUCKS', p.rw.hbTotal, '#9dffb0', 'for the masjid']].forEach(([t, v, col, sub], i) => {
      const x = W / 2 - 250 + i * 260;
      g.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(g, x, 212, 240, 130, 14); g.fill();
      g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(t, x + 120, 240);
      g.fillStyle = col; g.font = `40px ${FONT}`; g.fillText('+' + v, x + 120, 294);
      g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(sub, x + 120, 322);
    });
    g.textAlign = 'center'; g.fillStyle = '#cfd8e3'; g.font = `13px ${BODY}`; wrapText(g, 'Spend them in the gym: Upgrade for your stats, Masjid for projects. Your saved plays are in Menu, My plays.', W / 2, 372, 520, 18);
    g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(Input.touchMode ? 'Tap to go back to the gym' : 'Enter or tap: back to the gym', W / 2, 428);
    addRect(0, 0, W, H, postgameContinue);
  };
}
