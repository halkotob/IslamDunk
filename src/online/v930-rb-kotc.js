// ================================================= v9.30.0: KING OF THE COURT ONLINE WITH ROLLBACK
// The last online mode on the host's snapshots. A King of the Court session is a line of four (both of you and two CPU
// challengers) and a run of games: winner stays, the loser goes to the back, three straight is the crown. Now the whole
// session is a rollback match: both phones play every game, the line and the standings included.
//   * The start: the host's start message (cfg.kotc) has the shuffled line (the two lobby picks and the two CPU
//     challengers), each one's player definition, and who is human. Both phones start the session from it.
//   * The session lives outside the match (KOTC: the line, the wins, the streak, the break between games), where the
//     rollback doesn't look. In a rollback session the match holds it (M._kotc = KOTC), so it's saved, restored and
//     checked with the rest: the next game is built inside the frame that ends the break, on both phones.
//   * Skipping a game neither of you is in (decided by ratings and a little luck): a press of Skip (the button, Enter
//     or Shoot) goes into your controls as a Shoot press, and the game is skipped on the frame that press is played,
//     on both phones (a skip straight from the button would have happened on one phone only).
//   * The end: the frame the session is decided on (KOTC.done); once both have confirmed it, the host's Continue goes
//     back to the lobby with the guest.
// Without a direct link (everything through the server) the session stays on snapshots, as the matches do.
RBN.modes.add('kotc');
{
  let startingK = null;                                                // (RBN.start builds the first game before it turns on)
  const kcfg = () => startingK || (RBN.on && RBN.cfg && RBN.cfg.kotc) || null, rbKotc = () => !!kcfg();
  // the host: the start message
  const _hs = RBN.hostStart;
  RBN.hostStart = function () {
    if (Net.mode !== 'kotc') return _hs.apply(this, arguments);
    const L = typeof Lobby !== 'undefined' ? Lobby.lm : null, picks = !!(L && L.mp);
    const roster = shuffle(picks ? ['lp:0', 'lp:1', 'saleem', 'hamid'] : KOTC_ONLINE.slice());
    const humans = picks ? { 'lp:0': 0, 'lp:1': 1 } : { khalil: 0, nasser: 1 };
    const g = Net.guestPeer && Net.peers().find(q => q.peer === Net.guestPeer);
    const cfg = { id: (this.id = (this.id + 1) % 1e6 || 1), mode: 'kotc', seed: (Math.random() * 2147483647) | 0, set: rbConfig(SETTINGS),
      teams: [null, null], venue: null, humans: [{ team: 0, slot: 0, pad: 0 }, { team: 1, slot: 0, pad: 1 }], court: null,
      taunts: [rbTauntId(myTaunt()), rbTauntId(g && g.presence && g.presence.taunt)], fun: null, one: null,
      kotc: { roster, defs: roster.map(id => JSON.parse(JSON.stringify(castPlayer(id)))), humans } };
    Net.mid++; Net.evs = []; Game.lastMatch = null;
    Net.setP({ rbgo: cfg, rbend: null, rb: null });
    this.start(cfg, 0);
  };
  // the lobby's King of the Court start (v920-lobby) goes to rollback when it can
  const _nhs = Net.hostStart;
  Net.hostStart = function () {
    if (this.mode === 'kotc' && this.guestPeer && RBN.eligible('kotc')) { RBN.hostStart(); return; }
    return _nhs.apply(this, arguments);
  };
  // every game of the session: the line's players from the message
  const _cp = castPlayer;
  castPlayer = function (id) {
    if (rbKotc()) { const K = kcfg(), i = K.roster.indexOf(id); if (i >= 0 && K.defs[i]) return JSON.parse(JSON.stringify(K.defs[i])); }
    return _cp.apply(this, arguments);
  };
  // both phones: RBN.start's newMatch is the session's start
  let kstart = null;
  const _st = RBN.start;
  RBN.start = function (cfg, me) {
    kstart = startingK = cfg && cfg.kotc ? cfg.kotc : null;
    try { return _st.apply(this, arguments); } finally { kstart = startingK = null; if (cfg && cfg.kotc && M.kotc) M._kotc = KOTC; }
  };
  const _nm = newMatch;
  newMatch = function () {
    if (!kstart) return _nm.apply(this, arguments);
    const k = kstart; kstart = null;                                   // (startKotc builds its games with newMatch: those go through)
    for (const key of Object.keys(KOTC)) delete KOTC[key];             // (nothing left from an earlier session: the champion, the timers)
    KOTC.on = false;
    startKotc({ online: true, roster: k.roster.slice(), humans: Object.assign({}, k.humans) });
  };
  // each game: a rollback match (not the snapshot path's online match), and the session in the match
  const _kb = kotcBuild;
  kotcBuild = function () {
    const r = _kb.apply(this, arguments);
    if (rbKotc()) { M.online = false; M.introT = 0; M._kotc = KOTC; }
    return r;
  };
  // skip: a Shoot press in the controls (the next frame this phone samples), played on both phones on the same frame
  let skipAsk = false;
  const _ks = kotcSkip;
  kotcSkip = function () {
    if (rbKotc() && !RB.sim) { if (KOTC.spect && KOTC.overT <= 0 && !KOTC.done) skipAsk = true; return; }
    return _ks.apply(this, arguments);
  };
  const _sa = RBN.sample;
  RBN.sample = function (edges) {
    const I = _sa.apply(this, arguments);
    if (skipAsk && edges && rbKotc()) { skipAsk = false; const bit = 1 << 4; return rbIn(I.h | bit, I.p | bit, I.r, I.qx, I.qz); }
    return I;
  };
  const _um = updateMatch;
  updateMatch = function () {
    if (RB.sim && rbKotc() && KOTC.on && M.kotc && KOTC.spect && KOTC.overT <= 0 && !KOTC.done && (Input.pressed[RB_KEYS[0][4]] || Input.pressed[RB_KEYS[1][4]])) _ks();
    return _um.apply(this, arguments);
  };
  // the end: the frame the session is decided on
  const _sf = RBN.stepFrame;
  RBN.stepFrame = function (f) { const r = _sf.apply(this, arguments); if (this.endF == null && rbKotc() && KOTC.done) this.endF = f; return r; };
  const confirmed = () => RBN.endF != null && RBN.endF <= RBN.conf;
  const _kl = kotcLeave;
  kotcLeave = function () { if (rbKotc() && !confirmed()) return; return _kl.apply(this, arguments); };
  const _pl = RBN.play;
  RBN.play = function (rdt) {
    const spectOk = rbKotc() && KOTC.on && KOTC.spect && !KOTC.done && KOTC.overT <= 0 && !Game.paused;
    if (spectOk && menuHit('ok')) kotcSkip();
    const r = _pl.apply(this, arguments);
    if (rbKotc() && KOTC.done && KOTC.doneT > 1.5 && Net.role === 'host' && !Game.paused && (menuHit('ok') || menuHit('back')) && confirmed()) kotcLeave();
    return r;
  };
  // after the session: the session is off on both phones, and out of the match
  const _stop = RBN.stop;
  RBN.stop = function () { const was = rbKotc(); const r = _stop.apply(this, arguments); if (was) { KOTC.on = false; M.kotc = false; delete M._kotc; } return r; };
}
