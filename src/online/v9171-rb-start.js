// ================================================= v9.17.1: ONLINE: BOTH PHONES PLAY THE SAME GAME
// In a rollback match each phone builds the match itself from the host's start message (RBN.hostStart / RBN.start),
// so everything the match needs has to be in that message. Three things weren't, and each phone filled them in from
// its own device (the desync repair then "put them right", which showed as stutter, not as an error):
//   * Court: Half court came from the lobby on the host only (halfCourtOn read Net.role): the guest played full court.
//     Now cfg.court ('half' / 'full', the host's lobby) goes to newMatch as opts.court on both phones.
//   * Taunts: a taunt press played this device's own equipped taunt (myTaunt) on whoever taunted, so each phone played
//     a different one. The guest now sends its equipped taunt with its lobby presence (taunt), the host puts both in
//     cfg.taunts = [host's, guest's] (checked against TAUNTS: unknown or retired is 'sky'), and in a rollback match a
//     press by pad k plays cfg.taunts[k] (tauntFor).
//   * 1 on 1 (no CPU) was built 2 on 2 with CPU teammates: hostStart took both whole teams. Now Net.mode 'one' builds
//     soloTeam(s.a, s.ctrl) and soloTeam(s.b, s.ctrlB), the humans on team 0 slot 0 and team 1 slot 0, and both phones
//     set M.one = cfg.one. (The guest's 1 on 1 newMatch wrapper only solos teams of 2, so it doesn't do it twice.)
//   * The audit found one more: Fun modes (Big heads, Uncle League, Low gravity) came from newMatch's activeFun(), which
//     needs the mode unlocked on this device: the host's choice, now in cfg.fun, goes to newMatch as opts.fun.
//     The rest of the match setup already comes from the message (the teams with their looks, the venue, the host's
//     settings in cfg.set); the Noor power-ups are off in a rollback match (hifzUsed).
// The snapshot path (?rb=0, no direct link) is unchanged.
function rbTauntId(id) { const t = typeof id === 'string' && TAUNTS.find(x => x.id === id); return t && !t.retired ? id : 'sky'; }
{
  // the guest's equipped taunt, with its lobby presence (on joining, on Ready, and back in the lobby after a game)
  const tag = () => { if (Net.role === 'guest') Net.setP({ taunt: rbTauntId(myTaunt()) }); };
  for (const k of ['join', 'setReady', 'guestBack']) { const _f = Lobby[k]; Lobby[k] = function () { const r = _f.apply(this, arguments); tag(); return r; }; }
  // the host: the start message with the court, both taunts, the Fun modes, and the 1 on 1 teams
  RBN.hostStart = function () {
    const s = Net.sel, one = Net.mode === 'one', gs = one ? { team: 1, slot: 0 } : Net.guestSlot();
    const copy = o => JSON.parse(JSON.stringify(o));
    const teams = one ? [soloTeam(teamAt(s.a), s.ctrl), soloTeam(teamAt(s.b), s.ctrlB)] : [teamAt(s.a), teamAt(s.b)];
    const g = Net.guestPeer && Net.peers().find(q => q.peer === Net.guestPeer), lo = typeof Lobby !== 'undefined' && Lobby.saved ? Lobby.opts() : null;
    const cfg = { id: (this.id = (this.id + 1) % 1e6 || 1), mode: Net.mode, seed: (Math.random() * 2147483647) | 0, set: rbConfig(SETTINGS),
      teams: teams.map(copy), venue: s.venue ? copy(s.venue) : null,
      humans: [{ team: 0, slot: 0, pad: 0 }, { team: gs.team, slot: gs.slot, pad: 1 }],
      court: lo && lo.court === 'half' ? 'half' : 'full',
      taunts: [rbTauntId(myTaunt()), rbTauntId(g && g.presence && g.presence.taunt)],
      fun: typeof activeFun === 'function' ? activeFun() : null,
      one: one ? [s.ctrl | 0, s.ctrlB | 0] : null };
    Net.mid++; Net.evs = []; Game.lastMatch = null;
    Net.setP({ rbgo: cfg, rbend: null, rb: null });
    this.start(cfg, 0);
  };
  // both phones: newMatch inside RBN.start gets the court and the Fun modes from the message
  let starting = null;
  const _st = RBN.start;
  RBN.start = function (cfg, me) {
    if (cfg.taunts) cfg.taunts = [rbTauntId(cfg.taunts[0]), rbTauntId(cfg.taunts[1])];
    starting = cfg;
    try { _st.apply(this, arguments); } finally { starting = null; }
    M.one = cfg.one ? cfg.one.slice() : null;
  };
  const _nm = newMatch;
  newMatch = function (tA, tB, opts = {}) {
    if (starting && starting.court) opts = Object.assign({}, opts, { court: starting.court, fun: starting.fun || null });
    return _nm.call(this, tA, tB, opts);
  };
  // a taunt press in a rollback match plays the presser's own taunt, from the message (never this device's)
  const _tf = tauntFor;
  tauntFor = function (pad) { const C = RBN.on && RBN.cfg; return C && C.taunts ? C.taunts[pad === 1 ? 1 : 0] : _tf.apply(this, arguments); };
}
