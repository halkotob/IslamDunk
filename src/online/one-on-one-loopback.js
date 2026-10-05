// ================================================= v7.3: ONLINE 1 ON 1
// Head to head with nobody else on the floor: one player per team, both human, no CPU.
// The host picks both masjids and both players; the match is the normal full-court game
// (format, shot clock, fouls, Noor trivia) with instant inbounds after scores. The host
// sends which two players are on the floor (snapshot field `one`), so the guest builds the
// same 1 on 1 match; older guests ignore the field.
function soloTeam(T, i) { const d = T.players[clamp(i | 0, 0, T.players.length - 1)]; return Object.assign({}, T, { players: [d] }); }
function soloMatch() { return !!(M.teams && !M.practice && !M.mini && M.teams.some(t => t.players.length < 2)); }
// ---- team select: your masjid, your friend's masjid, your player, your friend's player
{
  const _so = selectOK, _sb = selectBack, _su = selectUpdate, _ds = drawSelect;
  selectOK = function () {
    const s = Game.sel; if (s.mode !== 'o1') return _so();
    SFX.blip();
    if (s.step === 0) { if (s.b === s.a) s.b = (s.a + 1) % 8; s.step = 1; }
    else if (s.step < 3) s.step++;
    else openVenueSelect(v => { s.venue = v; Net.host('one', s); });
  };
  selectUpdate = function () {
    const s = Game.sel; if (s.mode !== 'o1' || s.step < 2) return _su();
    const change = () => { SFX.blip(); if (s.step === 2) s.ctrl ^= 1; else s.ctrlB ^= 1; };
    Game.selChange = change;
    if (menuHit('left') || menuHit('right')) change();
    if (menuHit('ok')) selectOK();
    if (menuHit('back')) selectBack();
  };
  drawSelect = function (g) {
    const s = Game.sel; if (s.mode !== 'o1') return _ds(g);
    dim(g, 0.55);
    const head = ['Choose your masjid', 'Choose your friend’s masjid', 'Choose your player', 'Choose your friend’s player'][s.step];
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `28px ${FONT}`; g.fillText(head, W / 2, 50);
    g.font = `14px ${BODY}`; g.fillStyle = IVORY; g.fillText('Online 1 on 1: just you and your friend, no CPU on the floor', W / 2, 74);
    const showB = s.step >= 1, ax = showB ? 40 : W / 2 - 210;
    drawTeamPanel(g, ax, 96, TEAMS[s.a], s.step === 0 || s.step === 2, s.step >= 2 ? s.ctrl : -1);
    if (showB) drawTeamPanel(g, 500, 96, TEAMS[s.b], s.step === 1 || s.step === 3, s.step >= 3 ? s.ctrlB : -1);
    const ay = 262, onB = s.step === 1 || s.step === 3, lx = onB ? 486 : ax - 14, rx = onB ? 934 : ax + 434;
    roundButton(g, lx, ay - 12, 20, '‹', () => Game.selChange && Game.selChange(-1));
    roundButton(g, rx, ay - 12, 20, '›', () => Game.selChange && Game.selChange(1));
    uiButton(g, W / 2 - 95, 446, 190, 40, s.step === 3 ? 'Get join code' : 'Confirm', selectOK, true);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('← → to change, Enter to confirm, Esc to go back', W / 2, 510);
  };
  void _sb;
}
// ---- host: build the 1 on 1 match and tell the guest which players are on the floor
{
  const _hs = Net.hostStart;
  Net.hostStart = function () {
    if (this.mode !== 'one') return _hs.call(this);
    if (!this.guestPeer) return;
    const s = this.sel;
    this.mid++; this.evs = []; Game.lastMatch = null;
    newMatch(soloTeam(TEAMS[s.a], s.ctrl), soloTeam(TEAMS[s.b], s.ctrlB), { humans: [{ team: 0, slot: 0, pad: 0 }, { team: 1, slot: 0, pad: 1 }], venue: s.venue });
    M.online = true; M.one = [s.ctrl | 0, s.ctrlB | 0]; Game.screen = 'play'; Game.paused = false;
    this.syncCounters();
  };
  const _sn = Net.snapshot;
  Net.snapshot = function () { const o = _sn.call(this); if (this.mode === 'one' && M.one && o.mid != null) o.one = M.one; return o; };
  const _gs = Net.guestSlot;
  Net.guestSlot = function () { return this.mode === 'one' ? { team: 1, slot: 0 } : _gs.call(this); };
  // guest: when the host's snapshot says 1 on 1, the match it builds is 1 on 1 too
  const _nm = newMatch;
  newMatch = function (tA, tB, opts = {}) {
    if (Net.role === 'guest' && !opts.attract) {
      const sn = Net.snaps.map(x => x.s).find(x => x && x.mid === Net.curMid && x.one);
      if (sn && tA.players.length > 1) { tA = soloTeam(tA, sn.one[0]); tB = soloTeam(tB, sn.one[1]); opts = Object.assign({}, opts, { humans: [{ team: 0, slot: 0, pad: 0 }, { team: 1, slot: 0, pad: 1 }] }); _nm(tA, tB, opts); M.one = sn.one; return; }
    }
    _nm(tA, tB, opts);
    if (!M.online) M.one = null;
  };
  const _dhl = drawHostLobby;
  drawHostLobby = function (g) {
    _dhl(g);
    if (Net.mode !== 'one') return;
    const s = Net.sel, a = TEAMS[s.a].players[s.ctrl | 0], b = TEAMS[s.b].players[s.ctrlB | 0];
    g.fillStyle = 'rgba(8,14,22,0.96)'; g.fillRect(W / 2 - 330, 212, 660, 24);
    g.textAlign = 'center'; g.fillStyle = IVORY; g.font = `15px ${BODY}`;
    g.fillText(`1 on 1, no CPU: you play ${a.name} (${TEAMS[s.a].short}), your friend plays ${b.name} (${TEAMS[s.b].short})`, W / 2, 229);
  };
}
// ---- nobody to pass to: PASS with the ball does nothing in 1 on 1 (no "no screen yet" nag)
{
  const _cs = callScreen;
  callScreen = function (p) { if (!p.mate && soloMatch()) return true; return _cs(p); };
  const _tu = TouchUI.update.bind(TouchUI);
  TouchUI.update = function () {
    _tu();
    if (!this.shown || !soloMatch() || !this.btns || !this.btns.pass) return;
    const me = M.players.find(p => p.human === (Net.role === 'guest' ? 1 : 0));
    if (me && ball.owner === me && this.btns.pass.textContent !== '–') { this.btns.pass.innerHTML = '<span>–</span>'; this.btns.pass.classList.add('cd'); }
  };
}


// ================================================= v7.4: LOOPBACK TRANSPORT (tests only)
// Same interface as the room/Firebase adapters, between tabs of one browser via BroadcastChannel.
// Enabled only by URL flag: ?net=loop&lat=60&jit=20&co=0&room=x
//   lat: one-way latency (ms), jit: +/- jitter (ms), co: coalescing interval (ms, 0 = send every write).
//   bus: optional ws:// relay URL, for tests that need each player in its own (foreground) browser window.
// Delivery stays in order (like Firebase/WebSocket). A peer that goes quiet for 4 s is dropped
// (like onDisconnect). Not reachable from the game's menus.
function loopFlags() {
  try { const q = new URLSearchParams(location.search); if (q.get('net') !== 'loop') return null;
    return { lat: +q.get('lat') || 0, jit: +q.get('jit') || 0, co: +q.get('co') || 0, room: q.get('room') || 'x', bus: q.get('bus') || '' }; } catch (e) { return null; }
}
function makeLoopTransport(o) {
  const me = 'p' + Math.random().toString(36).slice(2, 12);
  let ch;
  if (o.bus) {                                                      // relay between windows
    const ws = new WebSocket(o.bus + '?room=' + encodeURIComponent(o.room)), q = [];
    ws.onopen = () => { while (q.length) ws.send(q.shift()); };
    ch = { postMessage: m => (ws.readyState === 1 ? ws.send(m) : q.push(m)), set onmessage(f) { ws.onmessage = e => f({ data: e.data }); } };
  } else ch = new BroadcastChannel('islamdunk-loop-' + o.room);
  const T = { kind: 'loop', me, pres: {}, others: {}, seen: {}, list: [], subs: [], lastDeliver: 0, dirty: false, stats: { sent: 0, bytes: 0 } };
  const self = () => ({ peer: me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: T.pres, updatedAt: Date.now() });
  const rebuild = () => {
    const L = [self()]; for (const id in T.others) L.push({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: T.others[id], updatedAt: T.seen[id] });
    T.list = L; for (const f of T.subs) { try { f(L); } catch (e) {} }
  };
  const send = () => { if (T.dropped) return; const msg = JSON.stringify({ id: me, p: T.pres }); T.stats.sent++; T.stats.bytes += msg.length; ch.postMessage(msg); T.dirty = false; };
  ch.onmessage = e => {
    if (T.dropped) return;
    const m = JSON.parse(e.data), now = performance.now();
    const at = Math.max(T.lastDeliver, now + o.lat + (o.jit ? (Math.random() * 2 - 1) * o.jit : 0)); T.lastDeliver = at;   // in order
    setTimeout(() => {
      if (m.bye) { delete T.others[m.id]; delete T.seen[m.id]; }
      else { T.others[m.id] = m.p; T.seen[m.id] = performance.now(); }
      rebuild();
    }, at - now);
  };
  if (o.co > 0) setInterval(() => { if (T.dirty) send(); }, o.co);                       // coalesced sends
  setInterval(() => { if (!T.dropped) send(); }, 1000);                                     // heartbeat
  setInterval(() => { const now = performance.now(); let ch2 = false; for (const id in T.seen) if (now - T.seen[id] > 4000) { delete T.others[id]; delete T.seen[id]; ch2 = true; } if (ch2) rebuild(); }, 500);
  addEventListener('pagehide', () => ch.postMessage(JSON.stringify({ id: me, bye: 1 })));
  T.presence = async patch => {
    for (const k in patch) { if (patch[k] === null) delete T.pres[k]; else T.pres[k] = JSON.parse(JSON.stringify(patch[k])); }
    if (o.co > 0) T.dirty = true; else send();
    rebuild();
  };
  T.peers = () => (T.list.length ? T.list : [self()]);
  T.onPeers = (f) => { T.subs.push(f); return () => { T.subs = T.subs.filter(x => x !== f); }; };
  T.drop = () => { T.dropped = true; ch.postMessage(JSON.stringify({ id: me, bye: 1 })); };   // test hook: lose the connection
  T.restore = () => { T.dropped = false; send(); };
  T.ready = Promise.resolve();
  return T;
}
{
  const _init = Net.init;
  Net.init = async function () {
    const lf = loopFlags();
    if (!lf) return _init.apply(this, arguments);
    this.wrapAll();
    const r = makeLoopTransport(lf); this.room = r; this.transport = 'loop'; this.avail = 'yes'; this.loop = lf;
    r.onPeers(ch => this.onPeers(ch)); r.presence({ here: 1 });
  };
}

