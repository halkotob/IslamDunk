// ================================================= v9.30.0: BARAKAH RUN DUOS ONLINE WITH ROLLBACK
// A duo run is a ladder of games with a power-up pick between them. Each game is now a rollback match (both phones play
// it and send each other only their controls, as Head to head does); the picks between games stay on the host's
// snapshots (a menu, nothing there needs to be instant).
//   * The start: the host's start message (cfg.brun) carries the run as it stands: the team, wins, points, power-ups and
//     the shield. Both phones set their run from it and build the game with the run's own nextBarakahGame (the same
//     ladder, opponent, AI level and power-up stats on both), so nothing comes from the guest's device.
//   * The shield (One More Chance) is used up during a game, and the run lives outside the match, where the rollback
//     doesn't look: in a rollback game Run.shieldUsed reads and writes M._runShield, which the rollback saves, restores
//     and checks like the rest of the match. (After the game it's the run's again.)
//   * Between games: the host's Continue on the final screen ends the rollback game for both (rbend, with brunNext so
//     the guest follows the host's pick screen instead of going back to the lobby). The host's pick starts the next
//     game the same way; the guest picks on its turn as before.
// Without a direct link (everything through the server) the run stays on snapshots, as the matches do.
RBN.modes.add('brun');
{
  // the shield: the match's while a rollback game runs, the run's otherwise
  let su = !!Run.shieldUsed;
  const rbGame = () => RBN.on && M.barakah && !!M.rb;
  delete Run.shieldUsed;
  Object.defineProperty(Run, 'shieldUsed', {
    configurable: true, enumerable: true,
    get() { return rbGame() ? !!M._runShield : su; },
    set(v) { if (rbGame()) M._runShield = !!v; else su = !!v; }
  });
  const copyRun = () => ({ team: Run.team, wins: Run.wins, points: Run.points, upgrades: Object.assign({}, Run.upgrades), shieldUsed: !!Run.shieldUsed });
  // the host: a duo run's game starts as a rollback match
  const _hs = RBN.hostStart;
  RBN.hostStart = function () {
    if (Net.mode !== 'brun') return _hs.apply(this, arguments);
    Net.mid++; Net.evs = []; Game.lastMatch = null;
    Run.team = Net.sel.a; Run.duo = 'online'; startBarakah();         // (startBarakah -> nextBarakahGame -> below)
  };
  let brun = null, building = false;
  const _nb = nextBarakahGame;
  nextBarakahGame = function () {
    if (building) return _nb.apply(this, arguments);
    if (!(Run.duo === 'online' && Net.role === 'host' && Net.guestPeer && RBN.eligible('brun'))) return _nb.apply(this, arguments);
    const g = Net.peers().find(q => q.peer === Net.guestPeer);
    const cfg = { id: (RBN.id = (RBN.id + 1) % 1e6 || 1), mode: 'brun', seed: (Math.random() * 2147483647) | 0, set: rbConfig(SETTINGS),
      teams: [null, null], venue: null, humans: runHumans(), court: null,
      taunts: [rbTauntId(myTaunt()), rbTauntId(g && g.presence && g.presence.taunt)], fun: null, one: null, brun: copyRun() };
    Net.setP({ rbgo: cfg, rbend: null, rb: null, brunNext: null });
    RBN.start(cfg, 0);
  };
  // both phones: RBN.start's newMatch is the run's next game, from the message's run
  const _st = RBN.start;
  RBN.start = function (cfg, me) {
    brun = cfg && cfg.brun ? cfg.brun : null;
    if (brun) Object.assign(Run, { active: true, duo: 'online', team: brun.team, wins: brun.wins, points: brun.points, upgrades: Object.assign({}, brun.upgrades) });
    try { return _st.apply(this, arguments); }
    finally { if (brun && M.barakah) M._runShield = !!brun.shieldUsed; brun = null; }
  };
  const _nm = newMatch;
  newMatch = function () {
    if (!brun || building) return _nm.apply(this, arguments);
    building = true;                                                    // (the lobby's picks for the run's team: v920-lobby's wrapper of it)
    try { _nb(); } finally { building = false; }
  };
  // the end of a rollback game: the shield goes back to the run
  const _stop = RBN.stop;
  RBN.stop = function () { if (rbGame()) su = !!M._runShield; return _stop.apply(this, arguments); };
  // the host's Continue on the final screen: the rollback game is over for both, and the guest follows the pick screen
  const _bc = barakahContinue;
  barakahContinue = function () {
    if (RBN.on && Run.duo === 'online' && Net.role === 'host') { Net.setP({ rbend: RBN.id, brunNext: RBN.id }); RBN.stop(); M.online = true; }   // (M.online: the host's snapshots carry the pick screen again; a rollback match has it off)
    return _bc.apply(this, arguments);
  };
  // the guest waits on the final screen for the host's Continue (it doesn't send the lobby's "go to the post-game menu")
  const _fc = finalContinue;
  finalContinue = function () { if (Net.role === 'guest' && RBN.on && Net.mode === 'brun') return; return _fc.apply(this, arguments); };
  const _gb = Lobby.guestBack;
  Lobby.guestBack = function () {
    const h = Net.hostPeer && Net.hostPeer(), nx = h && h.presence && h.presence.brunNext;
    if (Net.role === 'guest' && Net.mode === 'brun' && nx != null && nx === RBN.lastGo) { Game.screen = 'netplay'; Game.paused = false; return; }
    return _gb.apply(this, arguments);
  };
}
