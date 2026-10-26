
// ================================================= v8.3: KING OF THE COURT (mini game)
// Real 1 on 1, half court, check-up at the top, Defend and all. Ones and twos: a basket is 1, a
// three is 2, first to 3, no fouls (pickup rules). Winner stays, loser goes to the back of the
// line, the next challenger steps up. Hold the court for 3 straight games and you're crowned; if
// nobody does in 12 games, the most wins takes it. Offline you play the CPU; online, you and your
// friend are both in the line with two CPU challengers. Games you're not in can be watched or
// skipped (the result is decided by ratings).
const KOTC_TO = 3, KOTC_CROWN = 3, KOTC_MAX = 12;
const KOTC_KIT = [{ name: 'King of the Court', short: 'KING', c1: '#c9a227', c2: '#2a1c06', crest: 'star' }, { name: 'Challenger', short: 'NEXT', c1: '#2f7f86', c2: '#f3e6c4', crest: 'arch' }];
const KOTC_ONLINE = ['khalil', 'nasser', 'saleem', 'hamid'];
const KOTC = { on: false };
function kotcName(id) { return id === 'you' && !KOTC.online ? 'You' : castPlayer(id).name; }
function kotcVenue() { const b = VENUE_LIST.find(v => v.id === 'gymM'); return b ? makeVenue(b, { host: 0 }) : null; }   // "WELCOME TO KING OF THE COURT"
function startKotc(opts) {
  Game.paused = false; Game.trivia = null;
  Object.assign(KOTC, { on: true, online: !!opts.online, roster: opts.roster.slice(), humans: opts.humans || {}, queue: opts.roster.slice(), wins: {}, streak: 0, games: 0, done: false, overT: 0, last: null });
  KOTC.roster.forEach(id => { KOTC.wins[id] = 0; });
  KOTC.king = KOTC.queue.shift();
  kotcNext();
  Game.screen = 'play';
}
function kotcNext() {
  const K = KOTC; K.chal = K.queue.shift(); K.games++; K.overT = 0; K.last = null;
  const ids = [K.king, K.chal], humans = [];
  ids.forEach((id, t) => { if (K.humans[id] != null) humans.push({ team: t, slot: 0, pad: K.humans[id] }); });
  if (K.online && Net.role === 'host') { Net.mid++; Net.evs = []; }
  kotcBuild(ids, humans);
  formation(1); inbound(1);                                            // the challenger has it first
  K.spect = humans.length === 0;
  FX.callout(K.games === 1 ? 'KING OF THE COURT' : 'NEXT UP', '#ffd76a', kotcName(K.chal).toUpperCase() + ' CHALLENGES ' + kotcName(K.king).toUpperCase());
}
function kotcBuild(ids, humans) {
  const tA = Object.assign({}, KOTC_KIT[0], { players: [castPlayer(ids[0])] }), tB = Object.assign({}, KOTC_KIT[1], { players: [castPlayer(ids[1])] });
  KOTC.building = true;
  try { newMatch(tA, tB, { humans, fmt: { format: 'first21', target: KOTC_TO, sc: 0 }, venue: kotcVenue() }); } finally { KOTC.building = false; }   // (resets M.kotc, set again below)
  M.kotc = true; M.halfCourt = true; M.mustClear = [false, false]; M.online = !!KOTC.online; M.kotcIds = ids;
  for (const q of M.players) q.hifzUsed = true;
}
function kotcGameOver(t) {
  const K = KOTC, w = t === 0 ? K.king : K.chal, l = t === 0 ? K.chal : K.king, kept = w === K.king;
  K.wins[w]++; K.streak = kept ? K.streak + 1 : 1; K.king = w; K.queue.push(l);
  K.last = { w, l, kept, score: [M.teams[0].score, M.teams[1].score] };
  M.phase = 'dead'; M.deadT = 99; M.nextInbound = null; M.check = null; M.bc = null; M.inb = null; M.pendingEnd = false;
  if (ball.owner) { ball.owner.move = null; } ball.owner = null; ball.shot = null; ball.pass = null; ball.state = 'scored'; ball.grabLock = 9;   // whistle: nothing in flight counts   // our win rule, not first-to's win-by-2
  const crowned = K.streak >= KOTC_CROWN;
  if (crowned || K.games >= KOTC_MAX) {
    K.done = true; K.doneT = 0;
    const champ = crowned ? w : Object.keys(K.wins).sort((a, b) => K.wins[b] - K.wins[a])[0]; K.champ = champ;
    FX.callout(kotcName(champ).toUpperCase() + ' ' + (champ === 'you' && !K.online ? 'ARE' : 'IS') + ' KING!', '#ffd76a', crowned ? KOTC_CROWN + ' STRAIGHT' : 'MOST WINS', true); SFX.buzzer(); SFX.cheer(1.2);
  } else {
    FX.callout(kept ? (kotcName(w).toUpperCase() + ' HOLDS THE COURT') : 'NEW KING', kept ? '#ffd76a' : '#8fe3ff', kept ? K.streak + ' IN A ROW' : kotcName(w).toUpperCase());
    K.overT = 2.4;
  }
}
// a CPU game you skip: decided by ratings, with plenty of luck
function kotcSkip() {
  if (!KOTC.spect || KOTC.overT > 0 || KOTC.done) return;
  const r = q => (q.st.sht + q.st.dnk + q.st.spd + q.st.def) / 4, [a, b] = M.players;
  const t = chance(clamp(0.5 + (r(a) - r(b)) * 0.06, 0.25, 0.75)) ? 0 : 1;
  M.teams[t].score = KOTC_TO; M.teams[1 - t].score = rint(KOTC_TO);
  kotcGameOver(t);
}
function kotcLeave() {
  const online = KOTC.online; KOTC.on = false; M.kotc = false;
  if (online && Net.role === 'host') { Lobby.back(); return; }
  if (online) return;
  startAttract(); openMinis('kotc');
}
{
  // ones and twos, first to 3, no win-by-2
  const _os = onScore;
  onScore = function (h) {
    if (!M.kotc || M.mini) return _os.apply(this, arguments);
    if (KOTC.on && (KOTC.overT > 0 || KOTC.done)) { ball.state = 'scored'; ball.shot = null; return; }   // the game's already decided
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null;
    if (sh) sh.pts = sh.pts >= 3 ? 2 : 1;
    const r = _os.apply(this, arguments);
    if (KOTC.on && Net.role !== 'guest') for (const t of [0, 1]) if (M.teams[t].score >= KOTC_TO) { kotcGameOver(t); break; }
    return r;
  };
  const _fo = foulsOn; foulsOn = function () { return !M.kotc && _fo.apply(this, arguments); };   // pickup: no whistles
  const _um = updateMatch;
  updateMatch = function (dt) {
    if (KOTC.on && M.kotc && (KOTC.overT > 0 || KOTC.done)) {
      M.cmdHook = q => { zeroCmd(q.cmd); return true; };
      if (KOTC.done) KOTC.doneT += dt;
      else if ((KOTC.overT -= dt) <= 0 && Net.role !== 'guest') { M.cmdHook = null; kotcNext(); }
    } else if (M.kotc && M.cmdHook && KOTC.overT <= 0 && !KOTC.done && !(typeof TUT !== 'undefined' && TUT.on)) M.cmdHook = null;
    return _um.apply(this, arguments);
  };
  const _gt = goTitle; goTitle = function () { if (KOTC.on) { KOTC.on = false; M.kotc = false; } return _gt.apply(this, arguments); };
  // Enter / tap on the final card
  const _pu = playUpdate;
  playUpdate = function (rdt) {
    if (KOTC.on && KOTC.done && KOTC.doneT > 1.5 && Net.role !== 'guest' && (menuHit('ok') || menuHit('back'))) { kotcLeave(); return; }
    if (KOTC.on && KOTC.spect && !KOTC.done && KOTC.overT <= 0 && Net.role !== 'guest' && menuHit('ok')) { kotcSkip(); return _pu.apply(this, arguments); }
    return _pu.apply(this, arguments);
  };
  // HUD: who's king, the streak, the line, and the final standings
  const _r = render;
  render = function (g) {
    _r(g);
    if (!KOTC.on || !M.kotc || (Game.screen !== 'play' && Game.screen !== 'netplay')) return;
    const K = KOTC, o = Math.round((W - 960) / 2);
    g.save(); g.translate(o, 0); const rw = W; W = 960;
    g.fillStyle = 'rgba(8,14,22,0.85)'; roundRect(g, W / 2 - 280, 74, 560, 54, 12); g.fill();
    g.textAlign = 'center'; g.font = `13px ${FONT}`; g.fillStyle = GOLD;
    g.fillText('♛ ' + kotcName(K.king) + (K.streak ? '  (' + K.streak + ' in a row)' : '') + '   vs   ' + kotcName(K.chal) + '   •   first to ' + KOTC_TO, W / 2, 94);
    g.font = `12px ${BODY}`; g.fillStyle = IVORY;
    g.fillText('Next up: ' + (K.queue.map(kotcName).join(', ') || '-') + '   •   hold the court ' + KOTC_CROWN + ' in a row to be crowned', W / 2, 118);
    if (K.spect && !K.done && K.overT <= 0) { uiButton(g, W / 2 - 70, 136, 140, 32, 'Skip game', kotcSkip); g.fillStyle = IVORY; g.font = `12px ${BODY}`; g.fillText('You’re in line. Watch, or skip (Enter).', W / 2, 184); }
    if (K.done && K.doneT > 1.2) {
      dim(g, 0.6);
      g.fillStyle = 'rgba(12,40,44,0.96)'; roundRect(g, W / 2 - 230, 140, 460, 250, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
      g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('♛ ' + kotcName(K.champ).toUpperCase(), W / 2, 184);
      g.fillStyle = '#fff'; g.font = `15px ${BODY}`;
      Object.keys(K.wins).sort((a, b) => K.wins[b] - K.wins[a]).forEach((id, i) => g.fillText(kotcName(id) + ':  ' + K.wins[id] + ' win' + (K.wins[id] === 1 ? '' : 's'), W / 2, 220 + i * 26));
      g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(Net.role === 'guest' ? 'Waiting for your friend' : 'Press Enter or tap to continue', W / 2, 370);
      if (Net.role !== 'guest') addRect(0, 0, W, H, kotcLeave);
    }
    W = rw; g.restore();
  };
}
// ---- online: the host runs the session, the guest rebuilds each game from the snapshot
{
  const _hs = Net.hostStart;
  Net.hostStart = function () {
    if (this.mode !== 'kotc') return _hs.call(this);
    if (!this.guestPeer) return;
    Game.lastMatch = null;
    startKotc({ online: true, roster: shuffle(KOTC_ONLINE.slice()), humans: { khalil: 0, nasser: 1 } });
    Game.screen = 'play'; this.syncCounters();
  };
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const o = _sn.call(this);
    if (KOTC.on && M.kotc && o && o.mid != null) o.kc = { ids: M.kotcIds, q: KOTC.queue, w: KOTC.wins, k: KOTC.king, c: KOTC.chal, s: KOTC.streak, g: KOTC.games, d: KOTC.done ? 1 : 0, ch: KOTC.champ || 0, sp: KOTC.spect ? 1 : 0, ot: KOTC.overT > 0 ? 1 : 0 };
    return o;
  };
  const _nm = newMatch;
  newMatch = function (tA, tB, opts = {}) {
    if (Net.role === 'guest' && !opts.attract && !KOTC.building) {
      const sn = Net.snaps.map(x => x.s).find(x => x && x.mid === Net.curMid && x.kc);
      if (sn) { KOTC.on = true; KOTC.online = true; kotcBuild(sn.kc.ids, [{ team: 0, slot: 0, pad: 0 }, { team: 1, slot: 0, pad: 1 }]); return; }
    }
    M.kotc = false; M.kotcIds = null;                                       // every other match plays normal rules
    return _nm.apply(this, arguments);
  };
  const _lb = Lobby.back; Lobby.back = function () { KOTC.on = false; return _lb.apply(this, arguments); };
  const _nu = Net.update;
  Net.update = function (rdt) {
    _nu.call(this, rdt);
    if (this.role !== 'guest' || !this.snaps.length) return;
    const s = this.snaps[this.snaps.length - 1].s;
    if (s && s.kc) Object.assign(KOTC, { on: true, online: true, queue: s.kc.q, wins: s.kc.w, king: s.kc.k, chal: s.kc.c, streak: s.kc.s, games: s.kc.g, done: !!s.kc.d, champ: s.kc.ch || null, spect: !!s.kc.sp, overT: s.kc.ot ? 1 : 0, doneT: s.kc.d ? 9 : 0 });
    else if (KOTC.online && s && s.sc === 'lobby') KOTC.on = false;
  };
  const _isM = Net.isMini;
  Net.isMini = function (m = this.mode) { return m === 'atw' || _isM.call(this, m); };
  MINI_ONLINE.atw = ['khalil', 'nasser'];
  LOBBY_GAMES.splice(LOBBY_GAMES.findIndex(g => g.id === 'brun'), 0, { id: 'atw', name: 'Around the World' }, { id: 'kotc', name: 'King of the Court' });
}
