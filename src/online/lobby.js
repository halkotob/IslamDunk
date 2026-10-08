// ================================================= v7.4: ONLINE LOBBY
// Every online session starts in a lobby. The host opens it (code first), the friend joins with the
// code (or a ?join=ABCD link), the host picks the game and its settings, the friend readies up, and
// after each game both players come back here. Lobby state rides in presence:
//   host:  { role:'host', code, v, lobby:{ g, o, rev }, pg }      guest: { role:'guest', join, v, rdy, pg }
// rdy: 0 = not ready, 1 = ready, 'r' = ready for a rematch of the same settings (set automatically
// when a game ends). Settings are lobby-local: they're applied to SETTINGS only for the length of
// each online match and restored afterwards, so single-player settings and saves are untouched.
const LOBBY_GAMES = [
  { id: 'co', name: 'Same team vs CPU' }, { id: 'vs', name: 'Head to head' }, { id: 'one', name: '1 on 1 (no CPU)' },
  { id: 'lightning', name: 'Lightning' }, { id: 'horse', name: 'HORSE' }, { id: 'brun', name: 'Barakah Run duos' }
];
const LOBBY_KEY = 'islamdunk.lobby';
const Lobby = {
  o: null, rev: 0, row: 0, startedRev: -1, saved: null, joinChecked: false, pingT: 0, myT: 0, ping: 0, otherPing: 0, toast: null,
  defaults() { const a = rint(TEAMS.length); return { game: 'co', a, b: (a + 1) % TEAMS.length, ctrl: 0, ctrlB: 0, venue: 'random', diff: SETTINGS.difficulty, format: SETTINGS.format, len: SETTINGS.periodLen, fun: {} }; },
  opts() {
    if (!this.o) { try { this.o = JSON.parse(sessionStorage.getItem(LOBBY_KEY + '.opts') || 'null'); } catch (e) {} if (!this.o || !LOBBY_GAMES.some(g => g.id === this.o.game)) this.o = this.defaults(); }
    return this.o;
  },
  changed() { this.rev++; try { sessionStorage.setItem(LOBBY_KEY + '.opts', JSON.stringify(this.o)); } catch (e) {} this.publish(); },
  publish() { if (Net.role === 'host') Net.setP({ lobby: { g: this.o.game, o: this.o, rev: this.rev }, v: VERSION }); },
  remember(code, role) { try { localStorage.setItem(LOBBY_KEY, JSON.stringify({ code, role, t: Date.now() })); } catch (e) {} },
  forget() { try { localStorage.removeItem(LOBBY_KEY); } catch (e) {} },
  last() { try { const o = JSON.parse(localStorage.getItem(LOBBY_KEY) || 'null'); return o && Date.now() - o.t < 3 * 3600e3 ? o : null; } catch (e) { return null; } },
  // ---- settings rows for the selected game
  rows() {
    const o = this.opts(), g = o.game, R = [], cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
    const team = (key, label) => R.push({ label, get: () => TEAMS[o[key]].name, step: d => { o[key] = (o[key] + d + TEAMS.length) % TEAMS.length; } });
    if (g === 'brun') team('a', 'Your masjid');
    if (g === 'horse') {
      R.push({ label: 'Word', get: () => o.word || MiniOpts.word, step: d => { o.word = cyc(MINI_WORDS, o.word || MiniOpts.word, d); } });
      R.push({ label: 'Time to match a shot', get: () => (o.timer || MiniOpts.timer) + ' seconds', step: d => { o.timer = cyc(MINI_TIMERS, o.timer || MiniOpts.timer, d); } });
    }
    if (g === 'co' || g === 'vs' || g === 'one') {
      team('a', g === 'co' ? 'Your masjid' : 'Your masjid (host)');
      if (g === 'one') R.push({ label: 'Your player', get: () => TEAMS[o.a].players[o.ctrl | 0].name, step: () => { o.ctrl ^= 1; } });
      team('b', g === 'co' ? 'Opponent' : 'Friend’s masjid');
      if (g === 'one') R.push({ label: 'Friend’s player', get: () => TEAMS[o.b].players[o.ctrlB | 0].name, step: () => { o.ctrlB ^= 1; } });
      const vs = ['random', ...VENUE_LIST.filter(v => !venueLocked(v)).map(v => v.id)];
      R.push({ label: 'Venue', get: () => o.venue === 'random' ? 'Random' : (VENUE_LIST.find(v => v.id === o.venue) || {}).name || 'Random', step: d => { o.venue = cyc(vs, vs.includes(o.venue) ? o.venue : 'random', d); } });
      R.push({ label: g === 'one' ? 'Difficulty (timing)' : 'CPU difficulty', get: () => diffName(o.diff), step: d => { o.diff = cyc(DIFF_ORDER, o.diff, d); } });
      R.push({ label: 'Format', get: () => FORMAT_TXT[o.format], step: d => { o.format = cyc(FORMATS, o.format, d); } });
      if (o.format !== 'first21') R.push({ label: 'Period length', get: () => periodTxt(o.len), step: d => { o.len = cyc(PERIOD_OPTS, PERIOD_OPTS.includes(o.len) ? o.len : PERIOD_OPTS[0], d); } });
      for (const m of FUN_MODES) if (Unlocks[m.key]) R.push({ label: m.name, get: () => (o.fun[m.key] ? 'On' : 'Off'), step: () => { o.fun[m.key] = !o.fun[m.key]; } });
    }
    return R;
  },
  // ---- apply for one match, restore after
  apply() {
    const o = this.opts();
    if (!this.saved) this.saved = JSON.stringify({ difficulty: SETTINGS.difficulty, format: SETTINGS.format, periodLen: SETTINGS.periodLen, fun: SETTINGS.fun });
    SETTINGS.difficulty = o.diff; SETTINGS.format = o.format; SETTINGS.periodLen = o.len;
    SETTINGS.fun = { bigHead: !!o.fun.bigHead, uncle: !!o.fun.uncle, lowGrav: !!o.fun.lowGrav };
  },
  restore() { if (this.saved) { Object.assign(SETTINGS, JSON.parse(this.saved)); this.saved = null; } },
  venue() {
    const o = this.opts(); let base = VENUE_LIST.find(v => v.id === o.venue);
    if (!base || venueLocked(base)) { const ok = VENUE_LIST.filter(v => !venueLocked(v)); base = ok[rint(ok.length)]; }
    return base.kind === 'classic' ? null : makeVenue(base, { backdrop: base.backdrop });
  },
  // ---- host
  open(code) {
    Lobby.restore(); this.opts();
    Net.role = 'host'; Net.mode = this.o.game; Net.sel = { a: this.o.a, b: this.o.b }; Net.guestPeer = null;
    if (!code) { const taken = new Set(Net.peers().map(p => p.presence && p.presence.code)); do code = Array.from({ length: 4 }, () => ALPHA[rint(ALPHA.length)]).join(''); while (taken.has(code)); }
    Net.code = code; M.online = false; this.startedRev = -1; this.row = 0;
    Net.setP({ role: 'host', code, join: null, in: null, ans: null, rdy: null, v: VERSION, s: { sc: 'lobby', g: null, mode: Net.mode }, lobby: { g: this.o.game, o: this.o, rev: this.rev } });
    this.remember(code, 'host'); Game.screen = 'lobby'; Game.idx = 0;
  },
  guestPres() { const g = Net.guestPeer && Net.peers().find(p => p.peer === Net.guestPeer); return g ? g.presence : null; },
  guestReady() { const gp = this.guestPres(); if (!gp) return false; return gp.rdy === 1 || (gp.rdy === 'r' && this.startedRev === this.rev); },
  versionOK() { const other = Net.role === 'host' ? this.guestPres() : (Net.hostPeer() || {}).presence; return !other || !other.v || other.v === VERSION; },
  canStart() { return Net.role === 'host' && !!Net.guestPeer && this.guestReady() && this.versionOK(); },
  start() {
    if (!this.canStart()) { SFX.bad && SFX.bad(); return; }
    const o = this.opts(); this.apply(); this.startedRev = this.rev;
    Net.mode = o.game; Net.sel = { a: o.a, b: o.b, ctrl: o.ctrl | 0, ctrlB: o.ctrlB | 0, venue: (o.game === 'co' || o.game === 'vs' || o.game === 'one') ? this.venue() : null };
    if (Net.isMini()) Net.sel = { a: 0, b: 1 };
    Net.setP({ s: { sc: 'lobby', g: Net.guestPeer, mode: Net.mode } });
    Net.hostStart();
  },
  back() {                                              // host: match over (or ended) -> lobby
    this.restore(); M.online = false; Game.paused = false; Game.trivia = null; Run.active = false;
    if (Net.role === 'host') { Game.screen = 'lobby'; Game.idx = 0; Net.setP({ s: { sc: 'lobby', g: Net.guestPeer, mode: Net.mode } }); this.publish(); }
    else goTitle();
  },
  // ---- guest
  join(code) { Net.join(code); Net.setP({ v: VERSION, rdy: 0 }); this.remember(code, 'guest'); },
  guestBack() { Game.screen = 'lobby'; Game.idx = 0; Net.setP({ rdy: 'r' }); },    // after a game: pre-consent to a rematch
  setReady(v) { Net.setP({ rdy: v }); SFX.blip && SFX.blip(); },
  myReady() { const me = Net.peers().find(p => p.sameTab); return me && me.presence ? me.presence.rdy : 0; },
  leave() { this.forget(); Lobby.restore(); goTitle(); },
  // ---- share
  link() { try { const u = new URL(location.href); u.searchParams.set('join', Net.code); return u.toString(); } catch (e) { return ''; } },
  share() {
    const url = this.link(), text = 'Play Islam Dunk with me. Lobby code ' + Net.code;
    try { if (navigator.share) { navigator.share({ title: 'Islam Dunk', text, url }).catch(() => {}); return; } } catch (e) {}
    try { navigator.clipboard.writeText(url || Net.code).then(() => { this.toast = { t: 2, m: 'Link copied' }; }, () => { this.toast = { t: 2, m: 'Code: ' + Net.code }; }); } catch (e) { this.toast = { t: 2, m: 'Code: ' + Net.code }; }
  },
  copyCode() { try { navigator.clipboard.writeText(Net.code).then(() => { this.toast = { t: 2, m: 'Code copied' }; }, () => {}); } catch (e) {} },
  // ---- ping: each side stamps pg.t every 0.5 s; the other echoes it at once as pg.e, with h = how long it
  //      held it before echoing. Round trip = now - e - h (network time plus at most a frame each side).
  pingStep(rdt) {
    if (!Net.role || !Net.room) return;
    const other = Net.role === 'host' ? this.guestPres() : (Net.hostPeer() || {}).presence, now = nowMs();
    if (other && other.pg) {
      const pg = other.pg;
      if (pg.t && pg.t !== this.seenT) { this.seenT = pg.t; this.seenAt = now; }
      if (pg.e && pg.e === this.myT && !this.gotEcho) { this.gotEcho = true; const r = Math.max(1, now - pg.e - (pg.h || 0)); this.ping = Math.round(this.ping ? lerp(this.ping, r, 0.4) : r); }
      this.otherPing = pg.r || 0;
    }
    this.pingT -= rdt;
    const echo = this.seenT && this.seenT !== this.echoedT;
    if (this.pingT <= 0 || echo) {
      if (this.pingT <= 0) { this.pingT = 0.5; this.myT = Math.round(now); this.gotEcho = false; }
      this.echoedT = this.seenT;
      Net.setP({ pg: { t: this.myT, e: this.seenT || 0, h: this.seenT ? Math.round(now - this.seenAt) : 0, r: this.ping || 0 } });
    }
  }
};
function runEndBackLabel() { return Run.duo === 'online' && Net.role === 'host' ? 'Back to lobby' : 'Back to title'; }
function runEndBack() { if (Run.duo === 'online' && Net.role === 'host') Lobby.back(); else goTitle(); }
// ---- menu: Host a lobby / Join with a code / Rejoin
function onlineItems() {
  const L = Lobby.last(), it = ['Host a lobby', 'Join with a code'];
  if (L) it.push((L.role === 'host' ? 'Reopen lobby ' : 'Rejoin lobby ') + L.code);
  it.push('Back'); return it;
}
function refreshOnlineItems() { ONLINE_ITEMS.splice(0, ONLINE_ITEMS.length, ...onlineItems()); }
onlineSelect = function (i) {
  refreshOnlineItems();
  if (Net.avail !== 'yes') { if (i === 1 && typeof location !== 'undefined') location.reload(); else goTitle(); return; }
  const label = ONLINE_ITEMS[i] || 'Back';
  if (label === 'Host a lobby') Lobby.open();
  else if (label === 'Join with a code') { Net.typed = ''; Game.screen = 'joincode'; }
  else if (label.startsWith('Reopen lobby')) Lobby.open(Lobby.last().code);
  else if (label.startsWith('Rejoin lobby')) Lobby.join(Lobby.last().code);
  else goTitle();
};
onlineEntry = function () { if (Net.avail !== 'yes') { Game.screen = 'online'; Game.idx = 0; return; } refreshOnlineItems(); Game.screen = 'online'; Game.idx = 0; };
joinTyped = function () { if (Net.typed.length === 4) Lobby.join(Net.typed); };
{
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    return _tm().map(e => e.label !== 'Online' ? e : { label: 'Online', sub: onlineItems().filter(x => x !== 'Back').map((label, i) => ({ label, act: () => { if (Net.avail !== 'yes') { Game.screen = 'online'; Game.idx = 0; return; } onlineSelect(i); } })) });
  };
  const _ou = onlineUpdate;
  onlineUpdate = function (rdt) {
    if (Game.screen === 'online') refreshOnlineItems();
    if (Game.screen === 'lobby') return lobbyUpdate(rdt);
    return _ou(rdt);
  };
  const _do = drawOnline; drawOnline = function (g) { refreshOnlineItems(); _do(g); };
  // finished games come back to the lobby
  const _fc = finalContinue;
  finalContinue = function () { if (Net.role === 'host' && !M.career) { Lobby.back(); return; } return _fc.apply(this, arguments); };
  const _mr = miniResultContinue;
  miniResultContinue = function () { if (Net.role === 'host') { Lobby.back(); return; } if (Net.role === 'guest') return; return _mr.apply(this, arguments); };
  // the host's snapshot reports the lobby while we're in it
  const _sn = Net.snapshot;
  Net.snapshot = function () { if (Game.screen === 'lobby') return { v: 1, g: this.guestPeer, mode: this.mode, sc: 'lobby' }; return _sn.call(this); };
  // pause: the host can end the game and go back to the lobby
  const _pi = pauseItems;
  pauseItems = function () {
    const items = _pi.apply(this, arguments);
    if (Net.role === 'host' && M.online) items.splice(items.length - 1, 0, ['End game: back to lobby', () => Lobby.back()]);
    return items;
  };
  // leaving: forget the lobby on an explicit leave from the menus
  const _gt = goTitle;
  goTitle = function () { if (Net.role) Lobby.restore(); return _gt.apply(this, arguments); };
  // per-frame: ping, ?join= links, guest game start detection
  const _nu = Net.update;
  Net.update = function (rdt) {
    _nu.call(this, rdt);
    Lobby.pingStep(rdt);
    if (Lobby.toast) { Lobby.toast.t -= rdt; if (Lobby.toast.t <= 0) Lobby.toast = null; }
    if (!Lobby.joinChecked && this.avail !== 'checking') {
      Lobby.joinChecked = true;
      try { const j = new URLSearchParams(location.search).get('join'); if (j && /^[A-Z]{4}$/.test(j.toUpperCase()) && this.avail === 'yes' && !this.role) Lobby.join(j.toUpperCase()); } catch (e) {}
    }
    if (this.role === 'guest' && Game.screen === 'lobby') {
      const h = this.hostPeer(), s = this.lastS, me = this.myPeer();
      if (h) this.hostGoneT = 0; else this.hostGoneT = (this.hostGoneT || 0) + rdt;
      this.reconnecting = !h;
      if (this.hostGoneT > 45) { this.status = 'hostleft'; Game.screen = 'netwait'; this.waitT = 99; return; }
      if (s && s.g && s.g !== me) { this.status = 'full'; Game.screen = 'netwait'; return; }
      if (s && s.sc && s.sc !== 'lobby' && s.g === me) { Net.setP({ rdy: 0 }); this.curMid = -1; Game.screen = 'netplay'; }   // the host started a game
    }
  };
}
// ---- lobby input
function lobbyUpdate(rdt) {
  attractTick(rdt);
  if (Net.role === 'host') {
    const R = Lobby.rows(), n = LOBBY_GAMES.length, o = Lobby.opts();
    const total = 1 + R.length;                         // row 0 = game picker, then settings
    if (menuHit('up')) { Lobby.row = (Lobby.row + total - 1) % total; SFX.blip(); }
    if (menuHit('down')) { Lobby.row = (Lobby.row + 1) % total; SFX.blip(); }
    const d = menuHit('left') ? -1 : menuHit('right') ? 1 : 0;
    if (d) {
      if (Lobby.row === 0) { const i = LOBBY_GAMES.findIndex(x => x.id === o.game); o.game = LOBBY_GAMES[(i + d + n) % n].id; Net.mode = o.game; Lobby.row = 0; }
      else R[Lobby.row - 1].step(d);
      SFX.blip(); Lobby.changed();
    }
    if (menuHit('ok')) Lobby.start();
    if (menuHit('back')) Lobby.leave();
  } else {
    if (menuHit('ok')) Lobby.setReady(Lobby.myReady() === 1 ? 0 : 1);
    if (menuHit('back')) Lobby.leave();
  }
}
// ---- lobby screen (both players)
function pingBars(g, x, y, ms, on) {
  const bars = !on ? 0 : ms <= 0 ? 0 : ms < 80 ? 4 : ms < 150 ? 3 : ms < 250 ? 2 : 1;
  for (let i = 0; i < 4; i++) { g.fillStyle = i < bars ? (bars >= 3 ? '#57e389' : bars === 2 ? '#ffd76a' : '#ff8a6b') : 'rgba(255,255,255,0.15)'; g.fillRect(x + i * 6, y - 4 - i * 3, 4, 4 + i * 3); }
}
function drawLobby(g) {
  dim(g, 0.82);
  const host = Net.role === 'host', o = host ? Lobby.opts() : (((Net.hostPeer() || {}).presence || {}).lobby || {}).o || Lobby.opts();
  const gp = host ? Lobby.guestPres() : null, here = host ? !!Net.guestPeer : !!Net.hostPeer();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Online lobby', W / 2, 40);
  // code, big, with copy / share
  g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.fillText(Net.code || '----', W / 2, 92);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(host ? 'Your friend opens the game, picks Online → Join with a code, and types this' : 'You joined lobby ' + Net.code, W / 2, 112);
  if (host) { uiButton(g, W / 2 + 96, 58, 96, 32, 'Copy code', () => Lobby.copyCode()); uiButton(g, W / 2 + 200, 58, 96, 32, 'Share link', () => Lobby.share()); }
  // players
  panel(g, 30, 130, 270, 300, false);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('PLAYERS', 48, 156);
  const slot = (y, name, role, ping, on, ready, ver) => {
    g.fillStyle = on ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'; roundRect(g, 44, y, 242, 74, 10); g.fill();
    g.textAlign = 'left'; g.fillStyle = on ? '#fff' : '#6d7a8c'; g.font = `16px ${FONT}`; g.fillText(name, 58, y + 26);
    g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(on ? role + (ping > 0 ? '  •  ' + ping + ' ms' : '') : 'Waiting for your friend…', 58, y + 46);
    if (on) pingBars(g, 258, y + 30, ping, true);
    if (on && ready != null) { g.fillStyle = ready ? '#57e389' : '#ffb08a'; g.font = `12px ${FONT}`; g.fillText(ready ? (ready === 'r' ? 'READY FOR REMATCH' : 'READY') : 'NOT READY', 58, y + 64); }
    if (on && ver && ver !== VERSION) { g.fillStyle = '#ff8a6b'; g.font = `11px ${BODY}`; g.fillText('v' + ver, 230, y + 64); }
  };
  const myPing = Lobby.ping, theirPing = Lobby.otherPing || Lobby.ping;
  if (host) { slot(172, 'You', 'Host', 0, true, null, VERSION); slot(256, 'Friend', 'Guest', myPing, here, gp ? gp.rdy : 0, gp && gp.v); }
  else { const hp = (Net.hostPeer() || {}).presence || {}; slot(172, 'Host', 'Host', myPing, here, null, hp.v); slot(256, 'You', 'Guest', 0, true, Lobby.myReady(), VERSION); }
  if (!Lobby.versionOK()) { g.fillStyle = '#ff8a6b'; g.font = `12px ${BODY}`; g.textAlign = 'left'; wrapTextLeft(g, 'Your friend is on a different version. Both refresh the page.', 48, 352, 236, 16); }
  if (!host && Net.reconnecting) { g.fillStyle = '#ffd76a'; g.font = `13px ${FONT}`; g.textAlign = 'left'; g.fillText('Host reconnecting…', 48, 352); }
  // game + settings
  panel(g, 316, 130, 614, 300, false);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(host ? 'GAME  (← → to change)' : 'GAME  (the host picks)', 334, 156);
  LOBBY_GAMES.forEach((x, i) => {
    const cx = 334 + (i % 3) * 196, cy = 166 + Math.floor(i / 3) * 34, on = o.game === x.id;
    g.fillStyle = on ? 'rgba(232,195,90,0.92)' : 'rgba(255,255,255,0.08)'; roundRect(g, cx, cy, 186, 28, 8); g.fill();
    if (host && Lobby.row === 0 && on) { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, cx, cy, 186, 28, 8); g.stroke(); }
    g.textAlign = 'center'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${on ? FONT : BODY}`; g.fillText(x.name, cx + 93, cy + 19);
    if (host) addRect(cx, cy, 186, 28, () => { o.game = x.id; Net.mode = x.id; Lobby.row = 0; Lobby.changed(); });
  });
  const savedO = Lobby.o; if (!host) Lobby.o = o;                       // render the host's choices read-only
  const R = Lobby.rows(); if (!host) Lobby.o = savedO;
  if (!R.length) { g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(o.game === 'lightning' ? 'Lightning: you, your friend and three masjid members. Last one standing wins.' : o.game === 'horse' ? 'HORSE: head to head. Match the shot or take a letter.' : '', 334, 254); }
  const VIS = 7, top0 = host ? clamp(Lobby.row - 4, 0, Math.max(0, R.length - VIS)) : clamp(Lobby.gScroll | 0, 0, Math.max(0, R.length - VIS));   // v7.6: the list scrolls
  if (!host) Lobby.gScroll = top0;
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`;
  if (top0 > 0) g.fillText('\u25B2', 916, 242);
  if (top0 + VIS < R.length) g.fillText('\u25BC', 916, 244 + (VIS - 1) * 26 + 2);
  R.slice(top0, top0 + VIS).forEach((r, i0) => {
    const i = top0 + i0, y = 244 + i0 * 26, sel = host && Lobby.row === i + 1;
    if (sel) { g.fillStyle = 'rgba(232,195,90,0.16)'; roundRect(g, 330, y - 17, 586, 24, 6); g.fill(); }
    g.textAlign = 'left'; g.fillStyle = '#cfd8e3'; g.font = `13px ${BODY}`; g.fillText(r.label, 344, y);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `13px ${FONT}`; g.fillText(r.get(), host ? 860 : 900, y);
    if (host) { const rr = Input.touchMode ? 13 : 11; roundButton(g, 600, y - 5, rr, '‹', () => { Lobby.row = i + 1; r.step(-1); Lobby.changed(); }); roundButton(g, 890, y - 5, rr, '›', () => { Lobby.row = i + 1; r.step(1); Lobby.changed(); }); addRect(330, y - 17, 260, 24, () => { Lobby.row = i + 1; }); }
  });
  // bottom: Start / Rematch (host) or Ready (guest), Leave
  if (host) {
    const rematch = Lobby.startedRev === Lobby.rev, ok = Lobby.canStart();
    const why = !Net.guestPeer ? 'Waiting for your friend to join' : !Lobby.versionOK() ? 'Different versions' : !Lobby.guestReady() ? (rematch ? 'Waiting for your friend' : 'Waiting for your friend to press Ready') : '';
    uiButton(g, W / 2 - 130, 446, 260, 48, rematch ? 'Rematch' : 'Start', () => Lobby.start(), ok);
    if (why) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(why, W / 2, 512); }
  } else {
    const r = Lobby.myReady();
    uiButton(g, W / 2 - 130, 446, 260, 48, r === 1 ? 'Ready ✓ (tap to cancel)' : 'Ready', () => Lobby.setReady(r === 1 ? 0 : 1), r !== 1);
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(r === 'r' ? 'Ready for a rematch. Press Ready if the host changes the game.' : 'The host starts the game when you’re ready', W / 2, 512);
  }
  uiButton(g, 30, 456, 110, 34, 'Leave', () => Lobby.leave());
  if (Lobby.toast) { g.fillStyle = 'rgba(8,14,22,0.92)'; roundRect(g, W / 2 - 90, 120, 180, 26, 13); g.fill(); g.textAlign = 'center'; g.fillStyle = '#9dffb0'; g.font = `13px ${FONT}`; g.fillText(Lobby.toast.m, W / 2, 138); }
}
{
  const _rend = render;
  render = function (g) {
    if (Game.screen === 'lobby') { _rend(g); drawLobby(g); return; }
    _rend(g);
    // in-game: unobtrusive connection bars, and a clear notice when the host stalls
    if ((Game.screen === 'play' && Net.role === 'host' && M.online) || Game.screen === 'netplay') {
      pingBars(g, W - 100, 36, Lobby.ping || 1, true);
      if (Net.role === 'guest' && Net.reconnecting) {
        g.fillStyle = 'rgba(8,14,22,0.88)'; roundRect(g, W / 2 - 170, H / 2 - 26, 340, 52, 14); g.fill();
        g.textAlign = 'center'; g.fillStyle = '#ffd76a'; g.font = `16px ${FONT}`; g.fillText('Host reconnecting…', W / 2, H / 2 - 2);
        g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Hang tight, the game resumes when they’re back', W / 2, H / 2 + 16);
      }
      if (Net.role === 'host' && !Net.guestPeer && M.online && Game.screen === 'play') {
        g.fillStyle = 'rgba(8,14,22,0.85)'; roundRect(g, W / 2 - 210, 70, 420, 26, 13); g.fill();
        g.textAlign = 'center'; g.fillStyle = '#ffb08a'; g.font = `12px ${FONT}`; g.fillText('Your friend dropped. The CPU plays for them. Lobby ' + Net.code + ' stays open to rejoin.', W / 2, 88);
      }
    }
  };
}

