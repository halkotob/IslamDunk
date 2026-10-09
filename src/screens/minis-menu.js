
// ================================================= v8.0: MINI GAMES IN QUICK PLAY
// Lightning and HORSE without a career save or a friend online: pick the game, the opponent,
// HORSE's word and shot timer, and the CPU difficulty, then play. The finish screen comes back here.
const MINI_OPPS = [['saleem', 'Sh. Saleem'], ['nasser', 'Nasser'], ['khalil', 'Khalil'], ['mahmoud', 'Uncle Mahmoud'], ['rafiq', 'Uncle Rafiq'], ['hamid', 'Hamid']];
const MiniMenu = { kind: 'lightning', opp: 'saleem', idx: 0 };
function openMinis(kind) { if (kind) MiniMenu.kind = kind; MiniMenu.idx = 0; Game.screen = 'minis'; Game.idx = 0; }
function minisRows() {
  const m = MiniMenu, cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length], R = [];
  R.push({ label: 'Game', get: () => m.kind === 'lightning' ? 'Lightning' : 'HORSE', step: () => { m.kind = m.kind === 'lightning' ? 'horse' : 'lightning'; } });
  if (m.kind === 'horse') {
    const ids = MINI_OPPS.map(o => o[0]);
    R.push({ label: 'Opponent', get: () => MINI_OPPS.find(o => o[0] === m.opp)[1], step: d => { m.opp = cyc(ids, m.opp, d); } });
    R.push({ label: 'Word', get: () => MiniOpts.word, step: d => { MiniOpts.word = cyc(MINI_WORDS, MiniOpts.word, d); MiniOpts.save(); } });
    R.push({ label: 'Time to match a shot', get: () => MiniOpts.timer + ' seconds', step: d => { MiniOpts.timer = cyc(MINI_TIMERS, MiniOpts.timer, d); MiniOpts.save(); } });
  }
  R.push({ label: 'CPU difficulty', get: () => diffName(SETTINGS.difficulty), step: d => { SETTINGS.difficulty = diffStep(SETTINGS.difficulty, d); } });
  R.push({ label: 'Start', start: true, step: () => startQuickMini() });
  R.push({ label: 'Back', back: true, step: () => goTitle() });
  return R;
}
function minisHelp() {
  return MiniMenu.kind === 'lightning'
    ? ['Five players line up behind the arc. Two balls: the front of the line shoots first, then the next.', 'Miss and you chase your own rebound and keep shooting until it drops.', 'If the player behind you scores before you do, you are out. Last one standing wins.']
    : ['Make a shot and your opponent has to match it from the same spot.', 'Miss a match and you earn a letter. Spell the whole word and you lose.', 'You have ' + MiniOpts.timer + ' seconds to match each shot. Change the word and the timer below.'];
}
function startQuickMini() {
  Game.paused = false; Game.trivia = null; Game.fromMinis = true;
  const you = 'you', m = MiniMenu;
  if (m.kind === 'lightning') setupMini('lightning', { roster: [you, ...shuffle(MINI_OPPS.map(o => o[0])).slice(0, 4)], humans: [{ team: 0, slot: 0, pad: 0 }] });
  else setupMini('horse', { roster: [you, m.opp], word: MiniOpts.word, timer: MiniOpts.timer, humans: [{ team: 0, slot: 0, pad: 0 }] });
  Game.screen = 'play';
}
function minisUpdate() {
  const R = minisRows(); Game.idx = clamp(Game.idx | 0, 0, R.length - 1); MiniMenu.idx = Game.idx;   // Game.idx is the truth: taps and hover set it
  menuNav(R.length, i => R[i].step(1)); MiniMenu.idx = Game.idx;
  const r = R[MiniMenu.idx];
  if (!r.start && !r.back) { if (menuHit('left')) { r.step(-1); SFX.blip(); } if (menuHit('right')) { r.step(1); SFX.blip(); } }
  if (menuHit('back')) goTitle();
}
function drawMinis(g) {
  dim(g, 0.75);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText('Mini games', W / 2, 92);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; minisHelp().forEach((t, i) => g.fillText(t, W / 2, 124 + i * 19));
  const R = minisRows();
  // one tap does it: a setting row steps to its next value, Start starts, Back goes back
  const list = R.map(r => ({ label: r.label, value: r.start || r.back ? null : r.get() }));
  drawMenuList(g, 'minis:214', list, Game.idx, 214, 44, i => { MiniMenu.idx = Game.idx = i; R[i].step(1); }, i => { Game.idx = i; }, true, 460);
}
{
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    return _tm().map(e => e.label !== 'Quick Play' ? e : Object.assign({}, e, { sub: [...e.sub.slice(0, 2), { label: 'Mini games: Lightning, HORSE', act: () => openMinis() }, ...e.sub.slice(2)] }));
  };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const was = Game.screen === 'minis';
    _gu.apply(this, arguments);
    if (was && Game.screen === 'minis') { minisUpdate(); attractTick(rdt); }
  };
  const _r = render;
  render = function (g) {
    _r(g);
    if (Game.screen !== 'minis') return;
    const realW = W, ox = Math.round((W - 960) / 2);
    g.save(); g.translate(ox, 0); W = 960; Game.ox = ox;
    drawMinis(g);
    W = realW; Game.ox = 0; g.restore();
    drawBackButton(g);
  };
  BACK.minis = () => goTitle();
  // offline: the finish screen goes back to the mini games menu, ready for another round
  const _mr = miniResultContinue;
  miniResultContinue = function () {
    if (!Net.role && Game.fromMinis && Game.screen === 'play') { Game.fromMinis = false; startAttract(); openMinis(); return; }
    return _mr.apply(this, arguments);
  };
  const _gt = goTitle;
  goTitle = function () { Game.fromMinis = false; return _gt.apply(this, arguments); };
}
