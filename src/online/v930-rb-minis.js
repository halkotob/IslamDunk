// ================================================= v9.30.0: LIGHTNING AND HORSE ONLINE WITH ROLLBACK
// Head to head, Same team vs CPU and 1 on 1 run on rollback (rollback-net.js): both phones play the whole game and
// send each other only their controls, so your own player answers at once and there are no snapshot hiccups. The
// minis were still on the host's snapshots. Now Lightning and HORSE start the same way, on a direct link:
//   * The host's start message (cfg.mini) carries everything setupMini needs: the kind, the roster ids, each roster
//     player's definition (the two humans are the players picked in the lobby, the rest are cast) and HORSE's word
//     and timer from the host's lobby. Both phones build the game from it (RBN.start), no device's own settings.
//   * Both phones step it with rbStep like any rollback match (updateMatch hands a mini to miniStep): its whole state is
//     under M (M.mini, the two balls in M.balls), which the rollback saves, restores and checks.
//   * Drawing: a mini's two balls take turns in the global ball while they're drawn; the global ball is put back after
//     drawing, so the next frame starts where the game left it, not where this phone's drawing did.
//   * Names: a human is named in the game's own text ("Khalil wins"), on both phones (the text is part of the game,
//     and both phones must hold the same), as the snapshot path does online.
//   * The end: the frame the game is decided on (M.mini.done) is the end, as M.phase 'over' is for a match. Once both
//     players have confirmed it, the host's Continue goes back to the lobby (and takes the guest along: rbend).
// Without a direct link (everything through the server) the minis stay on the snapshots, as the matches do.
RBN.modes.add('lightning'); RBN.modes.add('horse');
function rbMiniCfg(kind) {
  const L = typeof Lobby !== 'undefined' ? Lobby.lm : null, lo = typeof Lobby !== 'undefined' && Lobby.saved ? Lobby.opts() : (Lobby && Lobby.o) || {};
  const base = MINI_ONLINE[kind] || MINI_ONLINE.horse, roster = L && L.mp ? ['lp:0', 'lp:1', ...base.slice(2)] : base.slice();
  const defs = roster.map(id => JSON.parse(JSON.stringify(castPlayer(id))));   // (castPlayer reads the lobby picks for 'lp:k')
  return { kind, roster, defs, word: MINI_WORDS.includes(lo.word) ? lo.word : 'HORSE', timer: MINI_TIMERS.includes(lo.timer) ? lo.timer : 10 };
}
{
  // the host: a mini's start message
  const _hs = RBN.hostStart;
  RBN.hostStart = function () {
    if (!Net.isMini(Net.mode)) return _hs.apply(this, arguments);
    const g = Net.guestPeer && Net.peers().find(q => q.peer === Net.guestPeer);
    const cfg = { id: (this.id = (this.id + 1) % 1e6 || 1), mode: Net.mode, seed: (Math.random() * 2147483647) | 0, set: rbConfig(SETTINGS),
      teams: [null, null], venue: null, humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }],
      court: null, taunts: [rbTauntId(myTaunt()), rbTauntId(g && g.presence && g.presence.taunt)], fun: null, one: null,
      mini: rbMiniCfg(Net.mode) };
    Net.mid++; Net.evs = []; Game.lastMatch = null;
    Net.setP({ rbgo: cfg, rbend: null, rb: null });
    this.start(cfg, 0);
  };
  // both phones: RBN.start's newMatch builds the mini from the message instead
  let mini = null, building = false;
  const _st = RBN.start;
  RBN.start = function (cfg, me) {
    RB.finish = null;                                                    // (a match's end left from the last match: never run on this one)
    mini = cfg && cfg.mini ? cfg.mini : null;
    try { return _st.apply(this, arguments); } finally { mini = null; }
  };
  const _nm = newMatch;
  newMatch = function () {
    if (!mini || building) return _nm.apply(this, arguments);
    const m = mini, _cp = castPlayer; building = true;
    castPlayer = function (id) { const i = m.roster.indexOf(id); return i >= 0 && m.defs[i] ? JSON.parse(JSON.stringify(m.defs[i])) : _cp.apply(this, arguments); };
    try { setupMini(m.kind, { online: false, roster: m.roster.slice(), word: m.word, timer: m.timer, humans: RBN.cfg ? RBN.cfg.humans : [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] }); }
    finally { castPlayer = _cp; building = false; }
  };
  // drawing a mini swaps each ball into the global one (withBall) and leaves the last one drawn there; the next frame
  // then started from whatever this phone drew last. In a rollback mini the global ball is put back after drawing,
  // so every frame starts from the state the game left, the same on both phones
  const _rd = render;
  render = function () {
    if (!(RBN.on && M.balls)) return _rd.apply(this, arguments);
    const keep = {}; for (const k of BALL_KEYS) keep[k] = ball[k];
    try { return _rd.apply(this, arguments); } finally { for (const k of BALL_KEYS) ball[k] = keep[k]; }
  };
  // names in the game's text: the same on both phones
  const _mn = miniName;
  miniName = function (i) { if (RBN.on) { const p = M.players[i]; return p ? p.def.name : ''; } return _mn.apply(this, arguments); };
  // the end of a mini is the frame it's decided on
  const _sf = RBN.stepFrame;
  RBN.stepFrame = function (f) { const r = _sf.apply(this, arguments); if (this.endF == null && M.mini && M.mini.done) this.endF = f; return r; };
  // the play screen: the result, and Continue once both have confirmed the end
  const _pl = RBN.play;
  RBN.play = function (rdt) {
    const r = _pl.apply(this, arguments);
    if (M.mini && M.mini.done && (M.mini.doneT || 0) > 1.2 && this.endF != null && this.endF <= this.conf && Net.role === 'host' && !Game.paused && menuHit('ok')) miniResultContinue();
    return r;
  };
  // the result screen's tap: only once the end is confirmed (a late input from the friend could still change it)
  const _mrc = miniResultContinue;
  miniResultContinue = function () { if (RBN.on && M.mini && !(RBN.endF != null && RBN.endF <= RBN.conf)) return; return _mrc.apply(this, arguments); };
}
