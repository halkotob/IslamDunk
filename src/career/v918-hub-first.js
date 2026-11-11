// v9.18.0: the career opens at the hub. Play and Practice are one press away; the neighbourhood is optional.
//   - Continue (a loaded save), the end of a game's post-game screen and every new day land on the career hub, not at
//     home: worldArrive and worldStartDay (world-day.js) open the hub instead. A save made at home, on the street, in
//     the store or at the masjid front opens at the hub, the same day (the save itself is left as it is).
//   - The hub's first row is Play (the next game: its day and its pregame, in one press, past any free days and
//     Fridays on the way; with no game scheduled it's Continue as before), then Practice (the gym), then "Skip to Saturday: game day" (one day on, saying where it
//     goes; not on a game day: games are never skipped), then Go outside (the masjid front, as before; counted in the
//     day's counters as 'go_outside', local only, for the 9.18.1 decision), My Player, My Masjid. Schedule (Calendar
//     and Bracket) moves into My Player, so six rows fit the panel at every size (v9.19.0: as one Schedule row).
//   - One press each on a keyboard or a pad too: Play is where the focus starts; Practice is P on a keyboard and X on a
//     pad, and its row says so (on touch it's a tap).
//   - On a Friday the hub asks "Attend Jumu'ah" or "Not today" (the door's own question), one press either way.
//   - The new-career intro is unchanged (outside the masjid with Sh. Saleem, then the gym) and ends on the hub.
// Settings → Career calendar Off is unchanged (the hub, game after game).
const HUB_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function hubDayWhat(d) { const D = calDay(d); return D.type === 'game' ? 'game day' : D.type === 'holiday' ? D.holiday || 'Eid' : D.fri ? 'Jumu’ah' : ''; }
function hubSkipLabel() { const d = C.cal.d + 1, w = hubDayWhat(d); return 'Skip to ' + HUB_DAY[calDate(d).wd] + (w ? ': ' + w : ''); }
// Play: straight to the next game (its day, then the pregame), past any free days and Fridays on the way (missing a
// Jumu'ah is "Not today": no penalty). With no game on the schedule (between seasons), it's Continue as before
function hubPlayLabel() {
  if (C.seasonOver || calGameDay() == null) return calContinueLabel();
  if (calGameToday()) return 'Play today’s game';
  const d = calGameDay(), t = calDate(d);
  return 'Play: next game, ' + CAL_WD[t.wd] + ' ' + t.day;
}
function hubPlay() { if (!C.seasonOver && calGameDay() != null) hubSelect(0); else calContinue(); }
function hubPracticeKey() { return Input.touchMode ? '' : Input.lastDev === 'pad' ? '  (X)' : '  (P)'; }
// ---- arrivals: the hub, never home
worldArrive = function () { return false; };
worldStartDay = function () {
  const L = worldLoc(); L.scene = 'hub';
  if (Game.screen !== 'hub') { Game.worldSuppress = true; careerHub(); Game.hubFade = 1; }
  hubJumuahOffer();
};
// ---- the hub's rows
{
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments);
    if (!C || !calShown() || !calEnsure() || !worldOn()) return R;
    const ci = R.findIndex(e => e.cont), gi = R.findIndex(e => e.label === 'Go outside'), pi = R.findIndex(e => e.label === 'Practice');
    if (ci >= 0) R[ci] = Object.assign({}, R[ci], { label: hubPlayLabel(), act: hubPlay });
    let out = null; if (gi >= 0) out = R.splice(gi, 1)[0];
    const pj = R.findIndex(e => e.label === 'Practice');
    if (pj >= 0) R[pj] = Object.assign({}, R[pj], { label: 'Practice' + hubPracticeKey() });
    let at = (pj >= 0 ? pj : Math.max(0, ci)) + 1;
    if (!calGameToday() && !C.seasonOver) R.splice(at++, 0, { label: hubSkipLabel(), act: () => { calNextDay(); } });
    if (out) R.splice(at, 0, { label: 'Go outside', act: () => { calCount('go_outside'); saveCareer(); out.act(); } });
    // Schedule (Calendar, Bracket) moves into My Player: six rows fit the panel. Its Next day / Play today's game is
    // the Skip and Play rows now
    const si = R.findIndex(e => e.label === 'Schedule' && e.sub), mp = R.find(e => e.label === 'My Player' && e.sub);
    // (v9.19.0: as one row, Schedule, with Calendar and Bracket in it: two rows ran My Player's list off the bottom)
    if (si >= 0 && mp) { const sc = R.splice(si, 1)[0], keep = sc.sub.filter(x => x.label !== 'Next day' && x.label !== 'Play today’s game');
      if (keep.length && !mp.sub.some(y => y.label === 'Schedule')) mp.sub.push(Object.assign({}, sc, { sub: keep })); }
    void pi;
    return R;
  };
  // Practice in one press: P on a keyboard, X on a pad (the pad's X is J)
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'hub' && Game.hubJum) { hubJumuahUpdate(); return; }
    if (Game.screen === 'hub' && C && !(Game.hubMenu && Game.hubMenu.open) && !Game.confirm && (Input.pressed.KeyP || (Input.lastDev === 'pad' && Input.pressed.KeyJ))) {
      Input.pressed.KeyP = Input.pressed.KeyJ = false; SFX.blip(); enterGym(); return;
    }
    return _cu.apply(this, arguments);
  };
}
// ---- Jumu'ah on the hub: the door's question, asked when a Friday's hub opens
function hubJumuahOffer() { if (Game.screen === 'hub' && C && C.cal && jumuahPending()) { jumuahTalk(); Game.hubJum = { idx: 0 }; } }
function hubJumuahAnswer(attend) {
  const T = jumuahTalk(); T.answered = attend ? 2 : 1; Game.hubJum = null;
  const L = worldLoc(); L.vis.masjid = 1;
  if (!attend) { saveCareer(); return; }
  const J = jumState(); if (!J.days.includes(C.cal.d)) J.days.push(C.cal.d); calCount('jumuah'); calCount('visit_masjid'); saveCareer(); openJumuah();
}
function hubJumuahUpdate() {
  const A = Game.hubJum;
  if (menuHit('left') || menuHit('up')) { A.idx = 0; SFX.blip(); }
  if (menuHit('right') || menuHit('down')) { A.idx = 1; SFX.blip(); }
  if (menuHit('ok')) hubJumuahAnswer(A.idx === 0);
  else if (menuHit('back')) hubJumuahAnswer(false);
}
{
  const _ch = careerHub;
  careerHub = function () { const r = _ch.apply(this, arguments); if (Game.screen === 'hub' && !Game.hubJum) hubJumuahOffer(); return r; };
  // the question is drawn as at the door (jumDrawAsk reads World.jum) and its two buttons answer it here
  const _cr = careerRender;
  careerRender = function (g) {
    const r = _cr.apply(this, arguments);
    if (Game.screen !== 'hub' || !Game.hubJum) return r;
    const keep = World.jum, n0 = Game.rects.length; World.jum = Game.hubJum;
    try { jumDrawAsk(g); } finally { World.jum = keep; }
    const R = Game.rects.splice(n0), btn = R.slice(-2);   // the dialog's two buttons, drawn last; nothing under it takes a tap
    Game.rects.length = 0; Game.rects.push({ x: 0, y: 0, w: W, h: H, fn: () => {} });
    if (btn.length === 2) { Game.rects.push(Object.assign({}, btn[0], { fn: () => hubJumuahAnswer(true) }), Object.assign({}, btn[1], { fn: () => hubJumuahAnswer(false) })); }
    return r;
  };
}
