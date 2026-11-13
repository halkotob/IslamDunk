// ================================================= v9.20.0: THE ONLINE LOBBY IS A PLACE
// Flow: the lobby gym (shoot around) -> the host presses Continue once the guest is Ready -> team select (guest on the
// left, host on the right, the game in the middle) -> the game -> the post-game menu (Rematch, Back to shoot-around,
// Pick new teams, Quit to Title). Lobby.ph says which part: 'gym' | 'teams' | 'post'. In the gym Game.screen is 'gym'
// with M.lobbyGym set (so the touch controls, the pad and the gym's camera work as in the career gym; Lobby.isIn()
// says "in the lobby"); team select and the post-game menu are the 'lobby' screen. The host's phase is in its lobby
// presence (ph); the guest follows it.
// Shoot-around: each phone runs its own practice gym (no score, no stats, nothing saved) and sends its player's
// position, facing, state and the ball when it isn't in his hands, 10 times a second, in the presence key `sa`.
// Not the rollback net: rollback needs one shared, deterministic simulation with every input confirmed, and the gym
// has nothing to agree on (two people shooting at the same hoop, no contact, no score). `sa` is a "fast" key like the
// ping: it goes on the direct link when there is one (unordered, a late one is dropped) and on the server copy at
// 4 per second when there isn't. The friend is drawn from it, 0.1 s behind, eased between messages.
// Picks: each game type says how many players each side picks (LOBBY_GAMES[i].picks) and whether both humans play for
// one masjid (together: Same team vs CPU, Barakah Run duos: the host's masjid, each picks the one he controls). The
// team select reads it; nothing per screen.
// New presence: host lobby { ph, hp (host picks), ht (host team), vote }, lm (the start's teams and mini picks);
// guest tp { m, d, p } (masjid, its team, picks), lph (where the guest is), vote, go; both sa, bye. NET_PROTO 7.
LOBBY_GAMES.forEach(g => Object.assign(g, ({ co: { picks: 1, together: true }, vs: { picks: 2 }, one: { picks: 1 }, lightning: { picks: 1 }, horse: { picks: 1 }, kotc: { picks: 1 }, brun: { picks: 1, together: true } })[g.id] || { picks: 1 }));
function lobbyGame(id) { return LOBBY_GAMES.find(g => g.id === id) || LOBBY_GAMES[0]; }
P2P_FAST.add('sa'); if (typeof LOOP_FAST !== 'undefined') LOOP_FAST.add('sa');
const SA_HZ = 10, SA_SLOW_HZ = 4;
Object.assign(Lobby, { ph: 'gym', hp: [], gp: [], gm: 0, tsRow: 0, tsCard: 0, saT: 0, saSent: 0, saBytes: 0, ghost: null, gball: null, vote: null, lastGo: 0, quitT: 0, byeSeen: null, seenPh: null });
// ---- the two sides' teams and picks
// the host picks from its team pool (masjids, its career team, custom teams); the guest from the masjids and its own
// career team (both send the team they picked, so the other phone can draw it)
function lobbyGuestPool() { const P = TEAMS.slice(), card = careerCard(); if (card && card.t) P.push(Object.assign({}, card.t, { name: 'Al-Amanah (your career)', short: 'YOU', custom: 'career' })); return P; }
function lobbyCopy(t) { return JSON.parse(JSON.stringify(t)); }
Lobby.myPool = function () { return Net.role === 'guest' ? lobbyGuestPool() : (lobbyGame(this.opts().game).id === 'brun' ? TEAMS.slice() : teamPool()); };
Lobby.hostPres = function () { return (Net.hostPeer() || {}).presence || {}; };
Lobby.hostLobby = function () { return Net.role === 'host' ? { o: this.opts(), ph: this.ph, hp: this.hp, ht: this.hostTeam() } : (this.hostPres().lobby || {}); };
Lobby.game = function () { const L = this.hostLobby(); return lobbyGame((L.o || this.opts()).game); };
Lobby.hostTeam = function () { const o = this.opts(); return o.a >= 0 && o.a < 1e3 ? teamAt(o.a) : TEAMS[0]; };
Lobby.guestTp = function () { const gp = this.guestPres(); return (gp && gp.tp) || null; };
// the teams as each side shows them: [left = guest, right = host]
Lobby.sides = function () {
  const G = this.game(), L = this.hostLobby(), host = Net.role === 'host';
  const ht = host ? this.hostTeam() : L.ht || TEAMS[0], hp = (host ? this.hp : L.hp) || [];
  let gt, gpk;
  if (host) { const tp = this.guestTp(); gt = tp && tp.d ? tp.d : TEAMS[0]; gpk = tp && tp.p || []; }
  else { gt = this.myPool()[this.gm] || TEAMS[0]; gpk = this.gp; }
  if (G.together) gt = ht;                                             // both play for the host's masjid
  return [{ t: gt, p: gpk, mine: !host, who: host ? 'Friend' : 'You' }, { t: ht, p: hp, mine: host, who: host ? 'You' : 'Host' }];
};
Lobby.publishTp = function () {
  if (Net.role !== 'guest') return;
  const t = this.myPool()[this.gm] || TEAMS[0];
  Net.setP({ tp: { m: this.gm, d: lobbyCopy(t), p: this.gp.slice() } });
};
Lobby.picksDone = function () {
  const n = this.game().picks, [l, r] = this.sides();
  return l.p.length === Math.min(n, l.t.players.length) && r.p.length === Math.min(n, r.t.players.length);
};
// a pick: toggles; a full side replaces its last pick; together, the friend's player can't be picked
Lobby.togglePick = function (i) {
  const G = this.game(), host = Net.role === 'host', arr = host ? this.hp : this.gp, [l, r] = this.sides(), other = host ? l.p : r.p;
  const k = arr.indexOf(i);
  if (k >= 0) arr.splice(k, 1);
  else {
    if (G.together && other.includes(i)) { SFX.bad && SFX.bad(); this.toast = { t: 2, m: 'Your friend picked him' }; return; }
    if (arr.length >= G.picks) arr.splice(arr.length - 1, 1);
    arr.push(i);
  }
  SFX.blip && SFX.blip();
  if (host) this.changed(); else this.publishTp();
};
// the host changed the game: extra picks go (both sides re-lay out from the new count)
Lobby.trimPicks = function () {
  const n = this.game().picks;
  if (this.hp.length > n) this.hp.length = n;
  if (this.gp.length > n) { this.gp.length = n; this.publishTp(); }
};
// ---- presence: the host's lobby carries the phase, its picks and its team
{
  const _pub = Lobby.publish;
  Lobby.publish = function () {
    _pub.apply(this, arguments);
    if (Net.role === 'host' && this.o) Net.setP({ lobby: { g: this.o.game, o: this.o, rev: this.rev, ph: this.ph, pt: this.pt | 0, hp: this.hp.slice(), ht: lobbyCopy(this.hostTeam()), vote: this.vote } });
  };
}
Lobby.isIn = function () { return Game.screen === 'lobby' || (Game.screen === 'gym' && !!M.lobbyGym); };
Lobby.setPh = function (ph) {
  if (this.ph !== ph) { this.ph = ph; this.tsRow = 0; this.tsCard = 0; if (ph !== 'post') this.vote = null; if (Net.role === 'host') this.pt = (this.pt | 0) + 1; }   // (pt: the host's phase count, so a guest can tell a stale phase)
  if (ph === 'gym') { if (!(Game.screen === 'gym' && M.lobbyGym)) this.enterGym(); }
  else if (Game.screen === 'gym' && M.lobbyGym) { Game.screen = 'lobby'; Game.idx = 0; }
  if (Net.role === 'host') this.publish(); else Net.setP({ lph: ph, vote: this.vote });
};
// ---- the gym
function lobbyGymDef() {
  const P = Lobby.myPool(), t = Net.role === 'guest' ? P[Lobby.gm] || TEAMS[0] : Lobby.hostTeam(), mine = Net.role === 'guest' ? Lobby.gp : Lobby.hp;
  return { t, d: t.players[mine[0] || 0] || t.players[0] };
}
Lobby.enterGym = function () {
  const { t, d } = lobbyGymDef();
  newMatch(Object.assign({}, t, { players: [d] }), Object.assign({}, t, { players: [] }), { humans: [{ team: 0, slot: 0, pad: 0 }], practice: 'free', aiCfg: [DIFF.medium, DIFF.medium] });
  M.lobbyGym = true; M.cmdHook = lobbyGymCmd; M.drawExtras = null; M.phase = 'live';
  const me = M.players[0]; place(me, Net.role === 'guest' ? 840 : 920, Net.role === 'guest' ? 420 : 300); me.face = 1; M.possTeam = -1; giveBall(me, 'inbound');
  cam.x = 1380 - W; this.ghost = null; this.gball = null; this.gymT = 0;
  Game.screen = 'gym'; Game.paused = false; Gym.drill = null; Gym.overlay = null; Gym.walk = null; Gym.fade = null; Gym.result = null;
};
function lobbyGymCmd(p) {
  if (p.human < 0) return false;
  const c = p.cmd;
  if (Game.screen !== 'gym' || Lobby.ph !== 'gym' || (typeof NetReport !== 'undefined' && NetReport.on)) { zeroCmd(c); return true; }
  humanCmd(0, c); c.a = false;                                            // no one to pass to
  return true;
}
// what this phone sends: its player and its ball (when it isn't in his hands), with the player's look once
const SA_STATES = ['free', 'windup', 'shoot', 'dunk', 'hang', 'land', 'layup', 'lay'];
Lobby.saStep = function (rdt) {
  if (Game.screen !== 'gym' || this.ph !== 'gym' || !M.lobbyGym || !M.players || !M.players[0]) return;
  const fast = typeof P2P !== 'undefined' && P2P.open, hz = fast ? SA_HZ : SA_SLOW_HZ;
  this.saT -= rdt; if (this.saT > 0) return; this.saT = 1 / hz;
  const p = M.players[0], held = ball.owner === p, r = Math.round;
  const sa = { x: r(p.x), y: r(p.y), z: r(p.z), f: p.face, s: Math.max(0, SA_STATES.indexOf(p.state)), m: r(Math.hypot(p.vx || 0, p.vz || 0)), h: held ? 1 : 0, n: ++this.saSent };
  if (!held) sa.b = [r(ball.x), r(ball.y), r(ball.z)];
  if (this.madeT && nowMs() - this.madeT < 1200) sa.k = this.madeId;   // a make, for the friend's SWISH
  this.saBytes += JSON.stringify(sa).length; Net.setP({ sa });
};
// the friend: a Player drawn from his messages (not in the match: no collisions, nothing to score)
Lobby.friendPres = function () { return Net.role === 'host' ? this.guestPres() : (Net.hostPeer() || {}).presence; };
Lobby.friendDef = function () {
  const [l, r] = this.sides(), side = Net.role === 'host' ? l : r, t = side.t || TEAMS[0];
  return { t, d: t.players[side.p[0] || 0] || t.players[0] };
};
Lobby.ghostStep = function (rdt) {
  const fp = this.friendPres(), sa = fp && fp.sa;
  if (!sa || !M.lobbyGym) { this.ghost = null; this.gball = null; return; }
  const { t, d } = this.friendDef(), key = (t.name || '') + '#' + (d.name || '');
  if (!this.ghost || this.ghost._key !== key) { const q = new Player(d, 0, 1, t); q._key = key; q.human = 1; q.x = sa.x; q.z = sa.z; q.y = sa.y; q.face = sa.f || 1; this.ghost = q; this.gTo = null; }
  const q = this.ghost;
  if (!this.gTo || this.gTo.n !== sa.n) { this.gFrom = { x: q.x, y: q.y, z: q.z, b: this.gball ? this.gball.slice() : null }; this.gTo = sa; this.gK = 0; }
  this.gK = Math.min(1, this.gK + rdt * (typeof P2P !== 'undefined' && P2P.open ? SA_HZ : SA_SLOW_HZ));
  const A = this.gFrom, B = this.gTo, k = this.gK, px = q.x, pz = q.z;
  q.x = lerp(A.x, B.x, k); q.y = lerp(A.y, B.y, k); q.z = lerp(A.z, B.z, k); q.face = B.f || q.face;
  q.vx = (q.x - px) / Math.max(rdt, 1e-3); q.vz = (q.z - pz) / Math.max(rdt, 1e-3);
  const st = SA_STATES[B.s] || 'free'; q.state = st === 'land' || st === 'lay' ? 'free' : st; q.fakeHold = !!B.h; q.fakeIdle = B.m < 5;
  try { animate(q, Math.min(rdt, 0.05)); } catch (e) {}
  this.gball = B.b ? (A.b ? [lerp(A.b[0], B.b[0], k), lerp(A.b[1], B.b[1], k), lerp(A.b[2], B.b[2], k)] : B.b.slice()) : null;
  if (B.k && B.k !== this.gMade) { this.gMade = B.k; try { FX.pop(hoops[1].x, RIM_Y + 40, hoops[1].z, 'SWISH', '#9fd8ff'); } catch (e) {} }
};
// my makes in the gym (for the friend's SWISH)
{
  const _ps = practiceScore;
  practiceScore = function (h) { if (M.lobbyGym) { Lobby.madeT = nowMs(); Lobby.madeId = (Lobby.madeId || 0) + 1; } return _ps.apply(this, arguments); };
}
// the friend is drawn with the gym's players (sorted by depth), and his ball
{
  const _r = render;
  render = function (g) {
    const gq = Game.screen === 'gym' && M.lobbyGym && Lobby.ghost;
    if (gq) M.players.push(Lobby.ghost);
    try { _r.apply(this, arguments); } finally { if (gq) { const i = M.players.indexOf(Lobby.ghost); if (i >= 0) M.players.splice(i, 1); } }
  };
  const _dp = drawPlayer;
  drawPlayer = function (g, p) {
    let r; if (p === Lobby.ghost) { const gy = M.gym; M.gym = false; p.human = Net.role === 'host' ? 1 : 0; try { r = _dp.apply(this, arguments); } finally { M.gym = gy; } } else r = _dp.apply(this, arguments);   // (its marker says FRIEND: the gym's says YOU)
    if (p === Lobby.ghost && Lobby.gball) { const b = Lobby.gball; drawBallAt(g, b[0], b[1], b[2], Game.t * 4, false); }
    else if (p === Lobby.ghost && p.fakeHold && p.hands) { const hd = p.hands[p.dh || 'n'] || p.hands.n; if (hd) drawBallAt(g, hd.x + p.face * 5, Math.max(BALL_R, hd.y - 4), hd.z + 3, Game.t * 3, false); }
    return r;
  };
}
// ---- flow
{
  const _open = Lobby.open;
  Lobby.open = function () { this.hp = []; this.ph = 'gym'; this.vote = null; this.lm = null; Lobby.tdefs = null; const r = _open.apply(this, arguments); Net.setP({ bye: null, sa: null, lm: null }); this.enterGym(); this.publish(); return r; };
  const _join = Lobby.join;
  Lobby.join = function () { this.gp = []; this.gm = 0; this.ph = 'gym'; this.vote = null; this.lm = null; const r = _join.apply(this, arguments); Net.setP({ lph: 'gym', vote: null, go: null, bye: null, sa: null }); this.publishTp(); return r; };
  // Continue: the host takes both to team select once the guest is Ready
  Lobby.canContinue = function () { return Net.role === 'host' && !!Net.guestPeer && this.versionOK() && (this.guestPres() || {}).rdy === 1; };
  Lobby.toTeams = function () { if (!this.canContinue() && this.ph === 'gym') { SFX.bad && SFX.bad(); return; } this.setPh('teams'); };
  // Start from team select: the picks become the teams (Lobby.start keeps its old meaning for scripts and tests: with
  // no picks the lobby's settings start as they did)
  const _start = Lobby.start;
  Lobby.start = function () {
    if (this.ph === 'teams' && !this.picksDone()) { SFX.bad && SFX.bad(); this.toast = { t: 2, m: 'Both sides pick their players first' }; return; }
    if (this.ph === 'teams') this.applyPicks(); else if (this.ph !== 'post') { this.lm = null; Lobby.tdefs = null; }   // (a rematch: the same teams as last time)
    Net.setP({ lm: this.lm || null });
    return _start.apply(this, arguments);
  };
  // the guest's Ready works in the gym; in team select a guest's picks are what's needed, so the host's canStart also
  // counts the guest's picks there (and its Ready, as before, elsewhere)
  const _gr = Lobby.guestReady;
  Lobby.guestReady = function () { if (this.ph === 'teams') return !!Net.guestPeer && this.picksDone(); if (this.ph === 'post') return this.bothRematch() || ((this.guestPres() || {}).rdy === 1); return _gr.apply(this, arguments); };   // (rdy 1: a script's Ready, as before)
  // after a game both land on the post-game menu
  const _back = Lobby.back;
  Lobby.back = function () { if (Net.role === 'host') { this.ph = 'post'; this.pt = (this.pt | 0) + 1; this.vote = null; } return _back.apply(this, arguments); };   // (the phase first: the lobby it publishes says post)
  Lobby.guestBack = function () { Game.screen = 'lobby'; Game.idx = 0; this.ph = 'post'; this.vote = null; this.stalePt = (this.hostPres().lobby || {}).pt; Net.setP({ rdy: 0, lph: 'post', vote: null }); };   // (until the host's phase moves on, its older phase is ignored: the game-over message can come first)   // (was: a pre-agreed rematch; now both choose)
}
// the picks -> the start's teams. Copies with the picked player first (the one you control); the host's in lm, so the
// guest builds the same match on the snapshot path too
Lobby.applyPicks = function () {
  const G = this.game(), o = this.opts(), [l, r] = this.sides();
  const order = (t, first) => { const pl = t.players.map((d, i) => i), head = first.filter(i => i < t.players.length); return Object.assign(lobbyCopy(t), { players: [...head, ...pl.filter(i => !head.includes(i))].map(i => lobbyCopy(t.players[i])) }); };
  let tA, tB;
  if (G.together) { tA = order(r.t, [r.p[0], l.p[0]].filter(x => x != null)); tB = o.b >= 0 && o.b < 1e3 ? lobbyCopy(teamAt(o.b)) : lobbyCopy(TEAMS[1]); }
  else { tA = order(r.t, r.p); tB = order(l.t, l.p); }
  Lobby.tdefs = { 9001: tA, 9002: tB };
  Object.assign(o, { ctrl: 0, ctrlB: 0 });
  this.lm = { id: 1 + Math.floor(Math.random() * 1e9), t: [tA, tB], mp: [tA.players[0], G.together ? tA.players[1] : tB.players[0]].map(lobbyCopy), g: G.id };
  this.lmSel = { a: G.id === 'brun' ? Math.max(0, TEAMS.findIndex(t => t.name === r.t.name)) : 9001, b: G.together && G.id !== 'brun' ? (o.b | 0) : 9002 };
};
{
  // the start uses the picked teams (9001 = the host's side, 9002 = the guest's); teamAt reads them
  const _ta = teamAt;
  teamAt = function (i) { if (Lobby.tdefs && Lobby.tdefs[i]) return Lobby.tdefs[i]; return _ta.apply(this, arguments); };
  const _hs = Net.hostStart;
  Net.hostStart = function () {
    if (Lobby.lm && Lobby.lmSel && this.sel) { this.sel.a = Lobby.lmSel.a; this.sel.b = Lobby.lmSel.b; this.sel.ctrl = 0; this.sel.ctrlB = 0; }
    // King of the Court: the picked players are the two humans in the line ('lp:0', 'lp:1'), with the two CPU challengers
    if (this.mode === 'kotc' && Lobby.lm && this.guestPeer) { Game.lastMatch = null; startKotc({ online: true, roster: shuffle(['lp:0', 'lp:1', 'saleem', 'hamid']), humans: { 'lp:0': 0, 'lp:1': 1 } }); Game.screen = 'play'; this.syncCounters(); return; }
    return _hs.apply(this, arguments);
  };
  // Barakah Run duos: the run's own team, in the picked order
  if (typeof nextBarakahGame === 'function') {
    const _nb = nextBarakahGame;
    nextBarakahGame = function () {
      const L = Net.role === 'host' ? Lobby.lm : Net.role === 'guest' ? Lobby.hostPres().lm : null;
      if (!(Run.duo === 'online' && L && L.g === 'brun')) return _nb.apply(this, arguments);
      const keep = TEAMS[Run.team]; TEAMS[Run.team] = Object.assign({}, keep, { players: L.t[0].players });
      try { return _nb.apply(this, arguments); } finally { TEAMS[Run.team] = keep; }
    };
  }
  // the guest on the snapshot path builds the host's picked teams (matched by name) and the minis' picked players
  const _nm = newMatch;
  newMatch = function (tA, tB, opts) {
    if (Net.role === 'guest' && Game.screen === 'netplay') {
      const L = Lobby.hostPres().lm;
      // a 2-team game: by position (a team only the host or the guest has, a career or custom team, has no masjid here);
      // Barakah Run duos: the run's team; the minis build their own
      if (L && L.t && (L.g === 'co' || L.g === 'vs' || L.g === 'one')) { tA = L.t[0]; tB = L.t[1]; }
      else if (L && L.t && L.g === 'brun') { const f = t => (t && L.t.find(x => x.name === t.name)) || t; tA = f(tA); }
    }
    return _nm.call(this, tA, tB, opts);
  };
  // the snapshot names the picks it was started with (lmid), and the guest waits for them before building the match
  // (the snapshot can come on the direct link before the picks on the server)
  const _sn = Net.snapshot;
  Net.snapshot = function () { const o = _sn.apply(this, arguments); if (o && o.mid != null && Lobby.lm) o.lmid = Lobby.lm.id; return o; };
  const _gf = Net.guestFrame;
  Net.guestFrame = function () {
    const B = this.snaps && (this.snaps[1] || this.snaps[0]), S = B && B.s;
    if (S && S.lmid && S.mid !== this.curMid && ((Lobby.hostPres().lm || {}).id !== S.lmid)) return;
    return _gf.apply(this, arguments);
  };
  // Lightning and HORSE: the two humans are the picked players ('lp:0' the host's, 'lp:1' the guest's)
  const _cp = castPlayer;
  castPlayer = function (id) { if (typeof id === 'string' && id.startsWith('lp:')) { const L = Net.role === 'guest' ? Lobby.hostPres().lm : Lobby.lm, d = L && L.mp && L.mp[+id.slice(3)]; if (d) return lobbyCopy(d); return _cp.call(this, id === 'lp:0' ? 'khalil' : 'nasser'); } return _cp.apply(this, arguments); };
  const _sm = setupMini;
  setupMini = function (kind, opts) {
    const L = Net.role === 'guest' ? Lobby.hostPres().lm : Net.role === 'host' ? Lobby.lm : null;
    if (opts && opts.online && L && L.mp && opts.roster) opts = Object.assign({}, opts, { roster: ['lp:0', 'lp:1', ...opts.roster.slice(2)] });
    return _sm.call(this, kind, opts);
  };
}
// ---- the post-game menu: Rematch needs both; the others take both at once
Lobby.myVote = function () { return this.vote; };
Lobby.friendVote = function () { const p = this.friendPres(); return p ? (Net.role === 'host' ? p.vote : (p.lobby || {}).vote) : null; };
Lobby.bothRematch = function () { return this.vote === 'rematch' && this.friendVote() === 'rematch'; };
Lobby.choose = function (what) {
  if (what === 'rematch') { this.vote = this.vote === 'rematch' ? null : 'rematch'; if (Net.role === 'host') this.publish(); else Net.setP({ vote: this.vote, rdy: this.vote ? 'r' : 0 }); SFX.blip && SFX.blip(); return; }
  if (what === 'quit') return this.quit();
  if (Net.role === 'host') this.setPh(what);
  else Net.setP({ go: { to: what, t: Date.now() } });
};
// Esc / the pad's B or Start: Quit to Title, as the pill (one press, as on every screen: 9.17.9)
Lobby.backPress = function () { this.quit(); };
// ---- Quit to Title: tells the other player, then leaves
Lobby.quit = function () {
  if (Net.role) { Net.setP({ bye: Net.code || 1, sa: null }); this.quitT = 0.3; Game.screen = 'lobbyquit'; return; }
  goTitle();
};
// ---- per frame
{
  const _nu = Net.update;
  Net.update = function (rdt) {
    _nu.apply(this, arguments);
    const L = Lobby;
    if (Game.screen === 'lobbyquit') { L.quitT -= rdt; if (L.quitT <= 0) { L.forget(); L.restore(); goTitle(); } return; }
    if (!this.role) return;
    const fp = L.friendPres();
    // the other player quit
    if (fp && fp.bye && fp.bye === (this.code || 1) && L.byeSeen !== fp.bye + ':' + (fp.updatedAt || 0)) {
      L.byeSeen = fp.bye + ':' + (fp.updatedAt || 0);
      if (this.role === 'host' && (L.isIn() || Game.screen === 'final')) { if (Game.screen === 'final') Lobby.back(); L.toast = { t: 3, m: 'Your friend left the lobby' }; L.setPh('gym'); }
      else if (this.role === 'guest') { this.status = 'hostleft'; Game.screen = 'netwait'; this.waitT = 99; return; }
    }
    if (this.role === 'host') {
      const gp = L.guestPres();
      // the guest's choice on the post-game menu (or its Continue on the final screen) moves both
      if (gp && gp.go && gp.go.t !== L.lastGo) { L.lastGo = gp.go.t; if (Game.screen === 'final' && !M.career) Lobby.back(); if (L.isIn() && gp.go.to !== 'post') L.setPh(gp.go.to); }
      // a rematch both agreed to starts once the guest is back in the lobby
      if (Game.screen === 'lobby' && L.ph === 'post' && L.bothRematch() && gp && gp.lph === 'post' && !L.rematchGo) { L.rematchGo = true; L.start(); }
      if (Game.screen !== 'lobby') L.rematchGo = false;
      // the guest left: the lobby stays open, back in the gym
      L.noGuestT = this.guestPeer ? 0 : (L.noGuestT || 0) + rdt;   // (gone for 3 s: a presence rewrite can drop him for a moment)
      if (Game.screen === 'lobby' && L.ph !== 'gym' && L.noGuestT > 3) L.setPh('gym');
    } else if (L.isIn()) {
      const hl = L.hostPres().lobby, stale = hl && L.stalePt != null && hl.pt === L.stalePt && hl.ph !== 'post', want = stale || !hl || !hl.ph ? L.ph : hl.ph;   // (no host lobby for a moment: stay)
      if (hl && !stale) L.stalePt = null;
      if (want !== L.ph || (want === 'gym') !== (Game.screen === 'gym')) L.setPh(want);
      if (hl && hl.o && L.seenGame !== hl.o.game) { L.seenGame = hl.o.game; L.trimPicks(); }
      // in the gym: what lobby.js does for the 'lobby' screen (the host started a game, left, or the lobby is full)
      if (Game.screen === 'gym') {
        const h = this.hostPeer(), s = this.lastS, me = this.myPeer();
        this.hostGoneT = h ? 0 : (this.hostGoneT || 0) + rdt; this.reconnecting = !h;
        if (this.hostGoneT > 45) { this.status = 'hostleft'; Game.screen = 'netwait'; this.waitT = 99; return; }
        if (s && s.g && s.g !== me) { this.status = 'full'; Game.screen = 'netwait'; return; }
        if (s && s.sc && s.sc !== 'lobby' && s.g === me) { Net.setP({ rdy: 0 }); this.curMid = -1; Game.screen = 'netplay'; }
      }
    }
    if (L.isIn()) { L.saStep(rdt); L.ghostStep(rdt); }
    if (Game.screen === 'gym' && M.lobbyGym) { const [l, r] = L.sides(), W2 = []; for (const [sd, f] of [[l, 1], [r, -1]]) for (const d of sd.t.players) W2.push([d, sd.t, f]); headshotWarm(W2); }   // (team select then opens with them drawn)
  };
}

// ================================================= screens
// One way out: "Quit to Title" in the top-left pill on every online screen (it was Back, or a Leave button).
// (The online menu and the join-code screen keep ‹ Back: you aren't in a lobby yet, and Back goes up one.)
const ONLINE_SCREENS = new Set(['netwait', 'hostlobby', 'lobby']);
BACK.lobby = () => Lobby.quit();
for (const s of ['netwait', 'hostlobby']) BACK[s] = () => { if (Net.role) Lobby.quit(); else goTitle(); };
{
  const _bg = BACK.gym;
  BACK.gym = function () { if (M.lobbyGym) return Lobby.quit(); return _bg.apply(this, arguments); };
  const _dbb = drawBackButton;
  drawBackButton = function (g, mine) {
    if (Game.screen === 'lobby' && !mine) return;                       // (team select and the post menu draw it over their dim)
    const online = ONLINE_SCREENS.has(Game.screen) || (Game.screen === 'gym' && M.lobbyGym);
    if (!online) return _dbb.apply(this, arguments);
    if (!backVisible()) return;
    const label = 'Quit to Title';
    g.font = `14px ${FONT}`; const w = Math.max(80, Math.ceil(g.measureText('‹ ' + label).width) + 28); BackBtn.w = w;
    const hov = hovering(8, 8, w, 32), pr = pressing(8, 8, w, 32);
    g.fillStyle = pr ? '#c9a24a' : hov ? GOLD : 'rgba(8,16,24,0.85)'; roundRect(g, 8, 8, w, 32, 16); g.fill();
    g.strokeStyle = 'rgba(232,195,90,0.7)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = hov || pr ? NIGHT : '#fff'; g.textAlign = 'center'; g.fillText('‹ ' + label, 8 + w / 2, 29);
    addRect(0, 0, w + 20, Input.touchMode ? 66 : 46, () => BACK[Game.screen]());
  };
}
// a small button that keeps its label inside (shrinks the font, then an ellipsis)
function lbBtn(g, x, y, w, h, label, fn, primary, on = true) {
  const hov = on && hovering(x, y, w, h), pr = on && pressing(x, y, w, h);
  g.fillStyle = !on ? 'rgba(8,16,24,0.85)' : primary ? (pr ? '#c9a24a' : GOLD) : `rgba(255,255,255,${hov ? 0.2 : 0.12})`; roundRect(g, x, y, w, h, Math.min(16, h / 2)); g.fill();
  if (!on) { g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5; roundRect(g, x, y, w, h, Math.min(16, h / 2)); g.stroke(); }
  g.fillStyle = !on ? '#8a97a8' : primary ? NIGHT : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 15; g.font = `${fs}px ${FONT}`; while (fs > 11 && g.measureText(label).width > w - 18) { fs--; g.font = `${fs}px ${FONT}`; }
  g.fillText(fitText(g, label, w - 14), x + w / 2, y + h / 2 + 1); g.textBaseline = 'alphabetic';
  if (fn) addRect(x, y, w, h, on ? fn : () => { SFX.bad && SFX.bad(); });
}
function lbText(g, t, x, y, w, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(fitText(g, String(t), w), x, y); }
// ---- the gym: the code, the friend, Ready / Continue (top, clear of the touch controls), the network report
function drawLobbyGym(g) {
  const host = Net.role === 'host', fp = Lobby.friendPres(), here = host ? !!Net.guestPeer : !!Net.hostPeer(), T = Input.touchMode;
  const tw = (t, font, pad) => { g.font = font; return Math.ceil(g.measureText(t).width) + pad; };   // a control as wide as its label
  const bw = BackBtn.w || 150, x0 = 8 + bw + 10, bh = T ? 40 : 32;   // (touch: taller; the gym is played with the joystick, so its HUD stays a strip)
  // row 1: the code, Copy, Share
  const cw = tw('LOBBY', `12px ${FONT}`, 0) + tw(Net.code || '----', `20px ${FONT}`, 0) + 40;
  g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, x0, 8, cw, bh, 16); g.fill();
  lbText(g, 'LOBBY', x0 + 14, 8 + bh / 2 + 5, cw, `12px ${FONT}`, '#9fb3c8'); g.font = `12px ${FONT}`;
  lbText(g, Net.code || '----', x0 + 26 + g.measureText('LOBBY').width, 8 + bh / 2 + 7, cw, `20px ${FONT}`, '#fff');
  let x = x0 + cw + 8;
  if (host) { const w1 = tw('Copy code', `15px ${FONT}`, 28); lbBtn(g, x, 8, w1, bh, 'Copy code', () => Lobby.copyCode(), false); x += w1 + 8; const w2 = tw('Share', `15px ${FONT}`, 28); lbBtn(g, x, 8, w2, bh, 'Share', () => Lobby.share(), false); x += w2 + 8; }
  // the friend, top right
  const rdy = host ? (fp && fp.rdy) : Lobby.myReady(), m = typeof NetDiag !== 'undefined' && NetDiag.modeNow ? NetDiag.modeNow() : (typeof P2P !== 'undefined' && P2P.open ? 'direct' : 'server');
  const l1 = here ? (host ? 'Friend is here' : 'Host is here') : 'Waiting for your friend…';
  const l2 = !here ? (host ? 'Share the code. Shoot around meanwhile.' : 'Connecting…') : (host ? (rdy === 1 ? 'Ready' : 'Not ready yet') : (rdy === 1 ? 'You are ready' : 'Press Ready when you are')) + '  ·  ' + (m === 'direct' ? 'direct link' : m === 'relay' ? 'relay' : 'server');
  const fw = Math.min(W - x - 16, Math.max(tw(l1, `14px ${FONT}`, 70), tw(l2, `12px ${BODY}`, 28), 220)), fx = W - fw - 8;
  g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, fx, 8, fw, 58, 12); g.fill();
  lbText(g, l1, fx + 14, 30, fw - 62, `14px ${FONT}`, here ? '#fff' : '#9fb3c8');
  if (here) pingBars(g, fx + fw - 38, 30, Lobby.ping, true);
  lbText(g, l2, fx + 14, 52, fw - 28, `12px ${BODY}`, here && rdy === 1 ? '#9dffb0' : '#cfd8e3');
  const nr = tw('Network report', `13px ${FONT}`, 26); lbBtn(g, fx + fw - nr, 72, nr, T ? 40 : 28, 'Network report', () => NetReport.open('lobby'), false);
  // row 2: Ready (guest) / Continue (host), and why it's waiting
  const by = 8 + bh + 8, bH = T ? 44 : 36, bw2 = T ? 230 : 210;
  let why;
  if (host) { const ok = Lobby.canContinue(); lbBtn(g, x0, by, bw2, bH, 'Continue to teams', () => Lobby.toTeams(), true, ok); why = !Net.guestPeer ? 'Waiting for your friend to join' : !Lobby.versionOK() ? 'Different versions: both refresh' : !ok ? 'Waiting for your friend to press Ready' : T ? '' : Input.lastDev === 'pad' ? 'or press LB' : 'or press Enter'; }
  else { const r = Lobby.myReady() === 1; lbBtn(g, x0, by, bw2, bH, r ? 'Ready ✓  (tap to cancel)' : 'Ready', () => Lobby.setReady(r ? 0 : 1), !r); why = r ? 'The host goes on to team select' : T ? '' : Input.lastDev === 'pad' ? 'or press LB' : 'or press Enter'; }
  if (why) { const ww = Math.min(fx - x0 - bw2 - 24, tw(why, `12px ${BODY}`, 24)); if (ww > 60) { g.fillStyle = 'rgba(8,16,24,0.75)'; roundRect(g, x0 + bw2 + 8, by + (bH - 26) / 2, ww, 26, 13); g.fill(); lbText(g, why, x0 + bw2 + 20, by + bH / 2 + 4, ww - 24, `12px ${BODY}`, '#e8eef5'); } }
  if (!Lobby.versionOK()) { const op = Lobby.friendPres() || {}; lbText(g, `Different versions (yours ${VERSION}, theirs ${op.v || '?'}). Both refresh the page.`, fx, T ? 128 : 116, fw, `12px ${BODY}`, '#ff8a6b'); }
  if (!T) lbText(g, 'Shoot around: move, shoot and turbo as in a game. Nothing here counts.', W / 2, H - 14, W - 40, `12px ${BODY}`, 'rgba(255,255,255,0.75)', 'center');
  if (Lobby.toast) textPill(g, W / 2, by + bH + 10, 26, Lobby.toast.m, `13px ${FONT}`, 'rgba(8,14,22,0.92)', '#9dffb0', 180, W - 40);
}
function lobbyGymUpdate(rdt) {
  if (typeof NetReport !== 'undefined' && NetReport.update()) { sim(rdt, false); return; }
  // Enter, or the pad's LB (KeyE): Ready / Continue. Esc (the pad's Start): Quit to Title
  if (Input.pressed.Enter || Input.pressed.NumpadEnter || Input.pressed.KeyE) { Input.pressed.Enter = Input.pressed.NumpadEnter = Input.pressed.KeyE = false; if (Net.role === 'host') Lobby.toTeams(); else Lobby.setReady(Lobby.myReady() === 1 ? 0 : 1); }
  if (menuHit('back')) { Lobby.backPress(); return; }
  sim(rdt, true);
}
{
  const _gu = gymUpdate; gymUpdate = function (rdt) { if (M.lobbyGym) return lobbyGymUpdate(rdt); return _gu.apply(this, arguments); };
  const _gh = drawGymHUD; drawGymHUD = function (g) { if (M.lobbyGym) return drawLobbyGym(g); return _gh.apply(this, arguments); };
  // the pad's Start is Escape in the gym (Quit); in the lobby gym its View/Y opens nothing; Enter readies
}

// ---- team select
// columns: the guest's side (left), the game (middle), the host's side (right); each phone moves through its own side
// and (the host) the middle: up/down through the rows, left/right on a row (a masjid, a card, a setting), Enter/A on
// a card to pick it, on Start to start
const TS_DROP = new Set(['Your masjid', 'Your masjid (host)', 'Friend’s masjid', 'Your player', 'Friend’s player']);
function tsRows() { return Lobby.rows().filter(r => !TS_DROP.has(r.label)); }
function tsLayout() {
  const mid = clamp(Math.round(W * 0.3), 280, 340), sw = Math.floor((W - 24 - mid - 16) / 2);
  return { top: 52, bot: H - 10, L: { x: 12, w: sw }, Mid: { x: 12 + sw + 8, w: mid }, R: { x: 12 + sw + 8 + mid + 8, w: sw } };
}
// the rows this phone moves through: 'm' (my masjid), 'c' (my cards), then the host's game rows and Start
function tsNav() {
  const host = Net.role === 'host', G = Lobby.game(), lock = G.together && !host, R = [];
  if (!lock && !(G.together && host && false)) R.push({ k: 'm' });
  R.push({ k: 'c' });
  if (host) { R.push({ k: 'g' }); tsRows().forEach((r, i) => R.push({ k: 's', i })); R.push({ k: 'start' }); }
  return R;
}
function tsStepMasjid(d) {
  const host = Net.role === 'host', P = Lobby.myPool();
  if (host) { const o = Lobby.opts(); o.a = ((o.a | 0) + d + P.length) % P.length; Lobby.hp = []; Lobby.changed(); }
  else { Lobby.gm = (Lobby.gm + d + P.length) % P.length; Lobby.gp = []; Lobby.publishTp(); }
  SFX.blip && SFX.blip();
}
function tsStepGame(d) { const o = Lobby.opts(), n = LOBBY_GAMES.length, i = LOBBY_GAMES.findIndex(x => x.id === o.game); o.game = LOBBY_GAMES[(i + d + n) % n].id; Net.mode = o.game; if (o.game === 'brun' && (o.a | 0) >= TEAMS.length) o.a = 0; Lobby.trimPicks(); Lobby.changed(); SFX.blip && SFX.blip(); }
function lobbyTeamsUpdate(rdt) {
  const nav = tsNav(), L = Lobby; L.tsRow = clamp(L.tsRow, 0, nav.length - 1);
  if (menuHit('up')) { L.tsRow = (L.tsRow + nav.length - 1) % nav.length; SFX.blip(); }
  if (menuHit('down')) { L.tsRow = (L.tsRow + 1) % nav.length; SFX.blip(); }
  const d = menuHit('left') ? -1 : menuHit('right') ? 1 : 0, row = nav[L.tsRow], [l, r] = L.sides(), mine = Net.role === 'host' ? r : l;
  if (d && row.k === 'm') tsStepMasjid(d);
  if (d && row.k === 'c') { const n = mine.t.players.length; L.tsCard = (L.tsCard + d + n) % n; SFX.blip(); }
  if (d && row.k === 'g') tsStepGame(d);
  if (d && row.k === 's') { const R = tsRows()[row.i]; if (R) { R.step(d); L.changed(); SFX.blip(); } }
  if (menuHit('ok')) { if (row.k === 'c') L.togglePick(L.tsCard); else if (row.k === 'start') L.start(); else if (row.k === 'm' || row.k === 'g') { L.tsRow = Math.min(nav.length - 1, L.tsRow + 1); } }
  if (menuHit('back')) L.backPress();
}
// one side: the masjid picker and the player cards. Names have a fixed slot (shrink, then an ellipsis).
function tsSide(g, X, side, nav, focusRow) {
  const host = Net.role === 'host', G = Lobby.game(), T = Input.touchMode, y0 = 52, x = X.x, w = X.w;
  const t = side.t || TEAMS[0], mine = side.mine, lock = G.together && !host, rowK = nav[focusRow] && nav[focusRow].k;
  panel(g, x, y0, w, H - 10 - y0, false);
  lbText(g, (side.who === 'You' ? 'YOU' : side.who.toUpperCase()) + (mine ? '' : '  (their picks)'), x + 14, y0 + 20, w - 28, `12px ${FONT}`, mine ? GOLD : '#9fb3c8');
  // the masjid: ‹ crest name ›
  const my = y0 + 30, mh = T ? 46 : 40, canStep = mine && !lock;
  if (mine && rowK === 'm') { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, x + 8, my - 2, w - 16, mh + 4, 10); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, x + 10, my, w - 20, mh, 10); g.fill();
  const ar = canStep ? 46 : 0;
  drawCrest(g, x + 10 + ar + 22, my + mh / 2, T ? 15 : 13, t);
  let fs = 16; g.font = `${fs}px ${FONT}`; const nw = w - 20 - ar * 2 - 52; while (fs > 12 && g.measureText(t.name).width > nw) { fs--; g.font = `${fs}px ${FONT}`; }
  lbText(g, t.name, x + 10 + ar + 44, my + mh / 2 + 6, nw, `${fs}px ${FONT}`, '#fff');
  if (canStep) { lbBtn(g, x + 12, my + 2, ar - 4, mh - 4, '‹', () => { Lobby.tsRow = 0; tsStepMasjid(-1); }); lbBtn(g, x + w - 10 - ar + 2, my + 2, ar - 4, mh - 4, '›', () => { Lobby.tsRow = 0; tsStepMasjid(1); }); }
  if (lock) lbText(g, 'You play for the host’s masjid', x + 14, my + mh + 16, w - 28, `11px ${BODY}`, '#9fb3c8');
  // the cards: sized to the number of players
  const P = t.players, n = P.length, cy = my + mh + (lock ? 26 : 14), gap = 10, cw = Math.min(T ? 200 : 190, Math.floor((w - 24 - gap * (n - 1)) / n));
  const hs = Math.min(cw - 12, H - 10 - cy - 92), cx0 = x + (w - (cw * n + gap * (n - 1))) / 2, cardH = hs + 12 + 30;
  const friendSide = side === Lobby.sides()[host ? 0 : 1];
  const other = G.together ? Lobby.sides()[host ? 0 : 1].p : [];
  P.forEach((d, i) => {
    const cx = cx0 + i * (cw + gap), k = side.p.indexOf(i), takenByFriend = G.together && mine && other.includes(i);
    const focus = mine && rowK === 'c' && Lobby.tsCard === i;
    g.fillStyle = k >= 0 ? 'rgba(232,195,90,0.22)' : 'rgba(255,255,255,0.06)'; roundRect(g, cx, cy, cw, cardH, 10); g.fill();
    if (k >= 0 || focus) { g.strokeStyle = focus ? '#fff' : GOLD; g.lineWidth = focus ? 2.5 : 2; roundRect(g, cx, cy, cw, cardH, 10); g.stroke(); }
    const face = X.x < W / 2 ? 1 : -1, img = headshot(d, t, face), hx = cx + (cw - hs) / 2, hy = cy + 6;
    g.save(); roundRect(g, hx, hy, hs, hs, 8); g.clip();
    if (img) g.drawImage(img, hx, hy, hs, hs); else { g.fillStyle = shade(t.c1, -0.2); g.fillRect(hx, hy, hs, hs); }
    if (takenByFriend) { g.fillStyle = 'rgba(6,12,20,0.55)'; g.fillRect(hx, hy, hs, hs); }
    g.restore();
    // the name: its own slot under the headshot
    let f2 = 14; g.font = `${f2}px ${FONT}`; while (f2 > 11 && g.measureText(d.name).width > cw - 12) { f2--; g.font = `${f2}px ${FONT}`; }
    lbText(g, d.name, cx + cw / 2, hy + hs + 21, cw - 12, `${f2}px ${FONT}`, '#fff', 'center');
    // the pick number (1 = the one you control), inside the headshot's corner
    g.__onHs = true;                                                   // (drawn on the headshot on purpose: tests/lobby.mjs)
    if (k >= 0) { g.fillStyle = GOLD; g.beginPath(); g.arc(hx + hs - 14, hy + 14, 11, 0, Math.PI * 2); g.fill(); lbText(g, String(k + 1), hx + hs - 14, hy + 19, 18, `13px ${FONT}`, NIGHT, 'center'); }
    if (takenByFriend) lbText(g, 'FRIEND', hx + hs / 2, hy + hs / 2 + 5, hs - 8, `12px ${FONT}`, '#fff', 'center');
    g.__onHs = false;
    if (mine) addRect(cx, cy, cw, cardH, () => { Lobby.tsRow = nav.findIndex(r => r.k === 'c'); Lobby.tsCard = i; Lobby.togglePick(i); });
  });
  void friendSide;
  // what to pick
  const need = Math.min(G.picks, n), got = side.p.length;
  const msg = mine ? (got < need ? (need === 1 ? 'Pick your player' : 'Pick ' + need + ' players: 1 is the one you control') : 'Picked ✓') : (got < need ? 'Picking…' : 'Picked ✓');
  lbText(g, msg, x + w / 2, cy + cardH + 22, w - 24, `12px ${BODY}`, got >= need ? '#9dffb0' : '#cfd8e3', 'center');
}
function drawTeamSelect(g) {
  dim(g, 0.84);
  const Lo = tsLayout(), host = Net.role === 'host', nav = tsNav(), fr = clamp(Lobby.tsRow, 0, nav.length - 1), [l, r] = Lobby.sides(), G = Lobby.game(), T = Input.touchMode;
  lbText(g, 'Pick your teams', W / 2, 32, 360, `22px ${FONT}`, GOLD, 'center');
  tsSide(g, Lo.L, l, nav, fr); tsSide(g, Lo.R, r, nav, fr);
  // the middle: the game and its settings (the host's; the guest sees them as they change)
  const X = Lo.Mid, y0 = 52; panel(g, X.x, y0, X.w, H - 10 - y0, false);
  lbText(g, host ? 'GAME' : 'GAME  (the host picks)', X.x + 14, y0 + 20, X.w - 28, `12px ${FONT}`, GOLD);
  const gy = y0 + 30, gh = T ? 46 : 40, rowK = nav[fr] && nav[fr].k;
  if (host && rowK === 'g') { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, X.x + 8, gy - 2, X.w - 16, gh + 4, 10); g.stroke(); }
  g.fillStyle = 'rgba(232,195,90,0.16)'; roundRect(g, X.x + 10, gy, X.w - 20, gh, 10); g.fill();
  const ga = host ? 46 : 0;
  lbText(g, G.name, X.x + X.w / 2, gy + gh / 2 + 6, X.w - 20 - ga * 2 - 8, `16px ${FONT}`, '#fff', 'center');
  if (host) { lbBtn(g, X.x + 12, gy + 2, ga - 4, gh - 4, '‹', () => { Lobby.tsRow = nav.findIndex(q => q.k === 'g'); tsStepGame(-1); }); lbBtn(g, X.x + X.w - 10 - ga + 2, gy + 2, ga - 4, gh - 4, '›', () => { Lobby.tsRow = nav.findIndex(q => q.k === 'g'); tsStepGame(1); }); }
  lbText(g, G.together ? '1 player each, one masjid' : G.picks === 1 ? 'Each side picks 1 player' : 'Each side picks ' + G.picks + ' players', X.x + X.w / 2, gy + gh + 18, X.w - 24, `11px ${BODY}`, '#9fb3c8', 'center');
  // settings rows (scroll)
  const savedO = Lobby.o, hl = Lobby.hostLobby(); if (!host && hl.o) Lobby.o = hl.o;
  let R; try { R = tsRows(); } finally { if (!host) Lobby.o = savedO; }
  const DY = T ? 40 : 30, Y0 = gy + gh + 30, bottom = H - 10 - (T ? 64 : 56), VIS = Math.max(1, Math.floor((bottom - Y0) / DY));
  const selS = host && rowK === 's' ? nav[fr].i : -1;
  const top0 = host ? clamp(selS - (VIS - 1), 0, Math.max(0, R.length - VIS)) : clamp(Lobby.gScroll | 0, 0, Math.max(0, R.length - VIS)); if (!host) Lobby.gScroll = top0;
  if (!R.length) lbText(g, G.id === 'lightning' ? 'Last one standing wins.' : G.id === 'horse' ? 'Match the shot or take a letter.' : G.id === 'brun' ? 'Win and keep going: one loss ends the run.' : '', X.x + X.w / 2, Y0 + 14, X.w - 24, `13px ${BODY}`, IVORY, 'center');
  R.slice(top0, top0 + VIS).forEach((row, j) => {
    const i = top0 + j, y = Y0 + j * DY, sel = i === selS, aw = host ? (T ? 40 : 30) : 0;
    if (sel) { g.fillStyle = 'rgba(232,195,90,0.16)'; roundRect(g, X.x + 8, y, X.w - 16, DY - 4, 8); g.fill(); }
    const lw = Math.floor((X.w - 24 - aw * 2) * 0.55);
    lbText(g, row.label, X.x + 14, y + DY / 2 + 2, lw, `12px ${BODY}`, '#cfd8e3');
    lbText(g, String(row.get()), X.x + X.w - 14 - (host ? aw * 2 + 6 : 0), y + DY / 2 + 2, X.w - 28 - lw - (host ? aw * 2 + 10 : 0), `12px ${FONT}`, '#fff', 'right');
    if (host) { const ax = X.x + X.w - 10 - aw * 2 - 4; lbBtn(g, ax, y + 1, aw, DY - 6, '‹', () => { Lobby.tsRow = nav.findIndex(q => q.k === 's' && q.i === i); row.step(-1); Lobby.changed(); }); lbBtn(g, ax + aw + 4, y + 1, aw, DY - 6, '›', () => { Lobby.tsRow = nav.findIndex(q => q.k === 's' && q.i === i); row.step(1); Lobby.changed(); }); }
  });
  if (top0 > 0) lbText(g, '▲', X.x + X.w / 2, Y0 - 4, 20, `10px ${BODY}`, '#9fb3c8', 'center');
  if (top0 + VIS < R.length) lbText(g, '▼', X.x + X.w / 2, Y0 + VIS * DY + 6, 20, `10px ${BODY}`, '#9fb3c8', 'center');
  // Start (host) / waiting (guest)
  const sy = H - 10 - (T ? 56 : 48), done = Lobby.picksDone();
  if (host) {
    if (rowK === 'start') { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, X.x + 10, sy - 2, X.w - 20, (T ? 48 : 40) + 4, 14); g.stroke(); }
    lbBtn(g, X.x + 12, sy, X.w - 24, T ? 48 : 40, done ? 'Start' : 'Waiting for picks', () => { Lobby.tsRow = nav.length - 1; Lobby.start(); }, true, done && Lobby.versionOK());
  } else lbText(g, done ? 'The host starts the game' : 'Pick your players', X.x + X.w / 2, sy + 26, X.w - 24, `13px ${FONT}`, done ? '#9dffb0' : '#cfd8e3', 'center');
  if (Lobby.toast) textPill(g, W / 2, 46, 26, Lobby.toast.m, `13px ${FONT}`, 'rgba(8,14,22,0.94)', '#9dffb0', 180, W - 40);
  drawBackButton(g, true);                                               // (over the dim)
}
// ---- the post-game menu (both phones)
const POST_ITEMS = [['rematch', 'Rematch'], ['gym', 'Back to shoot-around'], ['teams', 'Pick new teams'], ['quit', 'Quit to Title']];
function lobbyPostUpdate(rdt) {
  const L = Lobby; L.postRow = clamp(L.postRow | 0, 0, POST_ITEMS.length - 1);
  if (menuHit('up')) { L.postRow = (L.postRow + POST_ITEMS.length - 1) % POST_ITEMS.length; SFX.blip(); }
  if (menuHit('down')) { L.postRow = (L.postRow + 1) % POST_ITEMS.length; SFX.blip(); }
  if (menuHit('ok')) L.choose(POST_ITEMS[L.postRow][0]);
  if (menuHit('back')) { if (L.vote === 'rematch') L.choose('rematch'); else L.backPress(); }
}
function drawPostGame(g) {
  dim(g, 0.84);
  const T = Input.touchMode, pw = Math.min(W - 40, T ? 640 : 520), px = (W - pw) / 2, y0 = 60;
  panel(g, px, y0, pw, H - y0 - 24, false);
  lbText(g, 'What next?', W / 2, y0 + 36, pw - 40, `24px ${FONT}`, GOLD, 'center');
  const res = M && M.teams && M.teamDefs ? `${M.teamDefs[0].short || M.teamDefs[0].name} ${M.teams[0].score}  ·  ${M.teams[1].score} ${M.teamDefs[1].short || M.teamDefs[1].name}` : '';
  if (res && !M.lobbyGym && !M.mini) lbText(g, 'Last game: ' + res, W / 2, y0 + 62, pw - 40, `13px ${BODY}`, '#cfd8e3', 'center');
  const bh = T ? 52 : 44, gap = T ? 14 : 12, by0 = y0 + 84, mine = Lobby.vote === 'rematch', theirs = Lobby.friendVote() === 'rematch';
  POST_ITEMS.forEach(([k, label], i) => {
    const y = by0 + i * (bh + gap), focus = (Lobby.postRow | 0) === i;
    let lab = label;
    if (k === 'rematch') lab = mine ? 'Waiting for your friend… (tap to cancel)' : theirs ? 'Rematch (your friend wants one)' : 'Rematch';
    if (focus) { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, px + 38, y - 3, pw - 76, bh + 6, 18); g.stroke(); }
    lbBtn(g, px + 40, y, pw - 80, bh, lab, () => { Lobby.postRow = i; Lobby.choose(k); }, k === 'rematch' && !mine);
  });
  lbText(g, 'Rematch starts when you both pick it.', W / 2, by0 + 4 * (bh + gap) + 10, pw - 40, `12px ${BODY}`, '#9fb3c8', 'center');
  if (Lobby.toast) textPill(g, W / 2, 24, 26, Lobby.toast.m, `13px ${FONT}`, 'rgba(8,14,22,0.94)', '#9dffb0', 180, W - 40);
  drawBackButton(g, true);                                               // (over the dim)
}
// the 'lobby' screen is team select or the post-game menu now (the gym is the 'gym' screen)
lobbyUpdate = function (rdt) {
  if (typeof NetReport !== 'undefined' && NetReport.update()) return;
  if (M.lobbyGym && Lobby.ph === 'teams') sim(rdt, false);          // the gym carries on behind
  if (Lobby.ph === 'post') return lobbyPostUpdate(rdt);
  if (Lobby.ph === 'gym') { Lobby.setPh('gym'); return; }
  return lobbyTeamsUpdate(rdt);
};
drawLobby = function (g) { if (Lobby.ph === 'post') return drawPostGame(g); return drawTeamSelect(g); };
{
  // the shoot-around's frame: up to three new headshots a frame
  const _r = render;
  render = function (g) { headshotFrame(); return _r.apply(this, arguments); };
}
{
  // the guest's Continue on the final screen takes both to the post-game menu (the host's always did)
  const _fc = finalContinue;
  finalContinue = function () { if (Net.role === 'guest' && !M.career) { Net.setP({ go: { to: 'post', t: Date.now() } }); return; } return _fc.apply(this, arguments); };
}
// ---- a preview with a pretend friend (for the review screens and the phone audit: no network needed)
// lobbyPreview('gym' | 'teams' | 'post', gameId): you host, a friend has joined (with picks, and standing in the gym)
function lobbyPreview(ph, game) {
  goTitle();
  const real = Net.room; Lobby.previewRoom = real || 'none';
  const T0 = TEAMS[3], gpres = { role: 'guest', join: '', v: VERSION, pv: NET_PROTO, rdy: 1, lph: ph, tp: { m: 3, d: JSON.parse(JSON.stringify(T0)), p: [] }, sa: { x: 760, y: 0, z: 420, f: 1, s: 0, m: 0, h: 1, n: 1 } };
  Net.room = { kind: 'preview', presence: () => Promise.resolve(), peers: () => [{ peer: 'me', sameTab: true, presence: {} }, { peer: 'friend', sameTab: false, presence: gpres }], onPeers: () => {} };
  Lobby.open('PLAY'); gpres.join = Net.code;
  const o = Lobby.opts(); o.game = game || 'vs'; Net.mode = o.game; Net.guestPeer = 'friend';
  const G = Lobby.game(); Lobby.hp = [0, 1].slice(0, G.picks); gpres.tp.p = G.together ? [1] : [0, 1].slice(0, G.picks);
  if (ph !== 'gym') Lobby.setPh(ph);
  if (ph === 'post') Lobby.vote = null;
  Lobby.changed();
}
{
  const _gt = goTitle;
  goTitle = function () { if (Lobby.previewRoom) { Net.room = Lobby.previewRoom === 'none' ? null : Lobby.previewRoom; Lobby.previewRoom = null; Net.role = null; Net.guestPeer = null; } return _gt.apply(this, arguments); };
}
