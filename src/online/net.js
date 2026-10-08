// ================================================================ ONLINE

// =====================================================================================
//  ONLINE CONFIG (Firebase). Paste your project's web config here. See README.md.
//  Leave apiKey empty to disable online play outside claude.ai.
// =====================================================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA7y9yqTdK59ePeZ4N_H4F5euOEuwq-ThA",
  authDomain: "islamdunk-39718.firebaseapp.com",
  databaseURL: "https://islamdunk-39718-default-rtdb.firebaseio.com",
  projectId: "islamdunk-39718",
  storageBucket: "islamdunk-39718.firebasestorage.app",
  messagingSenderId: "832147818552",
  appId: "1:832147818552:web:596b4c820dde8d8540becd",
  measurementId: "G-F3MW75QSH0"
};
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
// =====================================================================================

// ---- transport adapters: everything Net needs from a network is presence(patch), peers(), onPeers(fn, onErr)
function makeRoomTransport(r) {                 // claude.ai "room" capability
  return { kind: 'room', presence: p => r.presence(p), peers: () => r.peers(), onPeers: (f, e) => r.onPeers(f, e) };
}
function firebaseConfigured() { return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL); }
// Firebase Realtime Database: one path per room code (rooms/<CODE>/peers/<peerId>), each client writes
// only its own node, everyone listens to the room. Field values are stored as JSON strings so arrays
// and nulls round-trip exactly. The room is chosen from our own presence (code when hosting, join
// when joining), so nothing above this layer changes. onDisconnect removes a closed tab; on reconnect
// the full presence is written again, which Net already treats as a rejoin.
function makeFirebaseTransport(cfg) {
  const me = 'p' + Math.random().toString(36).slice(2, 12);
  const T = { kind: 'firebase', me, room: null, pres: {}, raw: {}, cache: {}, list: [], subs: [], D: null, db: null, meRef: null, unsub: null };
  const self = () => ({ peer: me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: T.pres, updatedAt: Date.now() });
  const parse = (id, fields) => {
    const c = T.cache[id] || (T.cache[id] = {}), out = {};
    for (const k in fields) { const str = fields[k]; if (c[k] && c[k].str === str) out[k] = c[k].v; else { let v; try { v = JSON.parse(str); } catch (e) { v = str; } c[k] = { str, v }; out[k] = v; } }
    return out;
  };
  const rebuild = () => {
    const L = [self()];
    for (const id in T.raw) if (id !== me) L.push({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: parse(id, T.raw[id] || {}), updatedAt: Date.now() });
    for (const id in T.cache) if (!(id in T.raw)) delete T.cache[id];
    T.list = L; for (const f of T.subs) { try { f(L); } catch (e) {} }
  };
  const full = () => { const o = {}; for (const k in T.pres) o[k] = JSON.stringify(T.pres[k]); return o; };
  const switchRoom = async code => {
    const D = T.D;
    if (T.unsub) { T.unsub(); T.unsub = null; }
    if (T.meRef) { try { await D.onDisconnect(T.meRef).cancel(); await D.remove(T.meRef); } catch (e) {} T.meRef = null; }
    T.room = code; T.raw = {}; T.cache = {};
    if (!code) { rebuild(); return; }
    T.meRef = D.ref(T.db, 'rooms/' + code + '/peers/' + me);
    try { await D.onDisconnect(T.meRef).remove(); } catch (e) {}
    D.set(T.meRef, full()).catch(() => {});
    T.unsub = D.onValue(D.ref(T.db, 'rooms/' + code + '/peers'), snap => { T.raw = snap.val() || {}; rebuild(); }, err => { for (const f of T.errs || []) f({ code: 'upstream_error', message: String(err) }); });
  };
  T.ready = (async () => {
    const [A, D] = await Promise.all([import(FIREBASE_SDK + 'firebase-app.js'), import(FIREBASE_SDK + 'firebase-database.js')]);
    T.D = D; T.db = D.getDatabase(A.initializeApp(cfg, 'islamdunk'));
    D.onValue(D.ref(T.db, '.info/connected'), snap => {                     // reconnected: re-assert presence + cleanup hook
      if (snap.val() && T.meRef) { D.onDisconnect(T.meRef).remove().catch(() => {}); D.set(T.meRef, full()).catch(() => {}); }
    });
  })();
  T.presence = async patch => {
    for (const k in patch) { if (patch[k] === null) delete T.pres[k]; else T.pres[k] = patch[k]; }
    const code = T.pres.code || T.pres.join || null;
    if (code !== T.room) await switchRoom(code);
    else if (T.meRef) { const flat = {}; for (const k in patch) flat[k] = patch[k] === null ? null : JSON.stringify(patch[k]); T.D.update(T.meRef, flat).catch(() => {}); }
    rebuild();
  };
  T.peers = () => (T.list.length ? T.list : [self()]);
  T.onPeers = (f, e) => { T.subs.push(f); if (e) (T.errs = T.errs || []).push(e); return () => { T.subs = T.subs.filter(x => x !== f); }; };
  return T;
}

// Two-player online play over a transport adapter: the claude.ai "room" capability or Firebase.
// Host-authoritative: the host runs the full simulation (physics + AI) and
// publishes a compact snapshot in its presence ~30x/s. The guest publishes
// only its controller state; button presses travel as counters so a press
// can never be lost to coalescing. Games are matched by a 4-letter code, so
// several pairs can play on the same page at once.
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NS = ['free', 'steal', 'shove', 'pass', 'land', 'getup', 'windup', 'shoot', 'post', 'jump', 'down', 'dunk', 'hang', 'sig'];   // appended only
const NB = ['held', 'loose', 'shot', 'pass', 'scored'];
const NP = ['tip', 'live', 'dead', 'break', 'over'];
const ND = ['tomahawk', 'windmill', '360', 'twohand', 'alley'];   // append only: indices travel in snapshots
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
// Online mini games: host is Khalil, the guest is Nasser; Lightning adds 3 CPU masjid members.
const MINI_ONLINE = { lightning: ['khalil', 'nasser', 'saleem', 'mahmoud', 'hamid'], horse: ['khalil', 'nasser'] };
const ballArr = b => [r1(b.x), r1(b.y), r1(b.z), b.owner ? M.players.indexOf(b.owner) : -1, NB.indexOf(b.state), r1(b.rot), b.fire ? 1 : 0];

const Net = {
  room: null, avail: 'checking', role: null, code: '', mode: 'co', sel: null,
  guestPeer: null, lastAc: 0, lastBc: 0, mid: 0, sendT: 0,
  evs: [], evId: 0, depth: 0, orig: {},
  snaps: [], lastS: null, lastEv: 0, curMid: -1, ac: 0, bc: 0, waitT: 0, status: '', lastSnapAt: 0, typed: '',

  reason: '',
  async init() {
    this.wrapAll();
    // Record why online play is unavailable so the screen can show it.
    try {
      let r = null;
      if (typeof window !== 'undefined' && window.claude && window.claude.use) { const room = await window.claude.use('room'); if (room) r = makeRoomTransport(room); }   // inside claude.ai
      if (!r && firebaseConfigured()) { const fb = makeFirebaseTransport(FIREBASE_CONFIG); await fb.ready; r = fb; }                          // standalone site
      if (!r) { this.avail = 'no'; this.reason = (typeof window !== 'undefined' && window.claude) ? 'room-null' : 'not-configured'; return; }
      this.room = r; this.transport = r.kind; this.avail = 'yes';
      r.onPeers(ch => this.onPeers(ch), e => { this.avail = 'no'; this.reason = 'room-' + ((e && e.code) || 'error'); });
      r.presence({ here: 1 }).catch(e => { if (e && e.code && e.code !== 'upstream_error' && e.code !== 'invalid_argument') { this.avail = 'no'; this.reason = 'presence-' + e.code; } });
    } catch (e) { this.avail = 'no'; this.reason = 'exception'; }
  },
  peers() { return this.room ? this.room.peers() : []; },
  myPeer() { const m = this.peers().find(p => p.sameTab); return m ? m.peer : null; },
  setP(patch) { if (this.room) this.room.presence(patch).catch(() => {}); },
  leave() {
    if (this.role) this.setP({ role: null, code: null, join: null, in: null, s: null, ans: null });
    this.role = null; this.guestPeer = null; this.snaps = []; this.lastS = null; this.curMid = -1; this.status = '';
  },

  // ---------------------------------------------------------------- events
  // Host-side sounds/effects are recorded so the guest can replay them.
  wrapAll() {
    if (this.wrapped) return; this.wrapped = true;
    const wrap = (obj, name, tag) => {
      const f = obj[name]; this.orig[tag + name] = f.bind(obj);
      obj[name] = (...a) => {
        if (this.depth === 0 && this.role === 'host' && M.online) this.logEv([tag, name, ...a]);
        this.depth++; try { return f.apply(obj, a); } finally { this.depth--; }
      };
    };
    ['bounce', 'swish', 'clank', 'board', 'slam', 'squeak', 'swipe', 'thud', 'buzzer', 'cheer', 'good', 'bad'].forEach(n => wrap(SFX, n, 's'));
    ['callout', 'pop', 'burst', 'shake', 'hype', 'dust', 'replay', 'highlight', 'cue'].forEach(n => wrap(FX, n, 'f'));
    const kick = Hoop.prototype.kick; this.orig.kick = kick;
    Hoop.prototype.kick = function (kind, s, ax, az, extra) { if (Net.depth === 0 && Net.role === 'host' && M.online) Net.logEv(['k', this.idx, kind, s, ax || 0, az || 0, extra || 0]); Net.depth++; try { return kick.call(this, kind, s, ax, az, extra); } finally { Net.depth--; } };
  },
  logEv(e) {
    this.evs.push([++this.evId, ...e.map(v => typeof v === 'number' ? r1(v) : v)]);
    if (this.evs.length > 40) this.evs.splice(0, 20);
  },
  applyEv(e) {
    const [, tag, name, ...a] = e;
    if (tag === 'k') { const h = hoops[name]; if (h) this.orig.kick.call(h, a[0], a[1], a[2], a[3], a[4]); }
    else { const f = this.orig[tag + name]; if (f) f(...a); }
  },

  // ------------------------------------------------------------------ host
  host(mode, sel) {
    this.role = 'host'; this.mode = mode; this.sel = { ...sel }; this.guestPeer = null;
    const taken = new Set(this.peers().map(p => p.presence && p.presence.code));
    do { this.code = Array.from({ length: 4 }, () => ALPHA[rint(ALPHA.length)]).join(''); } while (taken.has(this.code));
    this.setP({ role: 'host', code: this.code, join: null, in: null, ans: null, s: { sc: 'lobby', g: null, mode } });
    Game.screen = 'hostlobby';
  },
  isMini(m = this.mode) { return m === 'lightning' || m === 'horse'; },
  guestSlot() { return this.mode === 'co' || this.mode === 'brun' || this.isMini() ? { team: 0, slot: 1 } : { team: 1, slot: 0 }; },
  syncCounters() { const g = this.peers().find(p => p.peer === this.guestPeer), i = (g && g.presence.in) || {}; this.lastAc = i.ac | 0; this.lastBc = i.bc | 0; this.lastXc = i.xc | 0; this.lastSc = i.sc | 0; this.lastRp = i.rp ? i.rp[0] : 0; },
  hostStart() {
    if (!this.guestPeer) return;
    const s = this.sel, gs = this.guestSlot();
    this.mid++; this.evs = []; Game.lastMatch = null;
    if (this.mode === 'brun') { Run.team = this.sel.a; Run.duo = 'online'; startBarakah(); this.syncCounters(); return; }   // Barakah Run duos
    if (this.isMini()) setupMini(this.mode, { online: true, roster: MINI_ONLINE[this.mode], word: Lobby.o && Lobby.o.word, timer: Lobby.o && Lobby.o.timer, humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] });
    else newMatch(TEAMS[s.a], TEAMS[s.b], { humans: [{ team: 0, slot: 0, pad: 0 }, { team: gs.team, slot: gs.slot, pad: 1 }], venue: s.venue });
    M.online = true; Game.screen = 'play'; Game.paused = false;
    const g = this.peers().find(p => p.peer === this.guestPeer), i = (g && g.presence.in) || {};
    this.lastAc = i.ac | 0; this.lastBc = i.bc | 0; this.lastXc = i.xc | 0; this.lastSc = i.sc | 0;
  },
  remoteCmd(c) {
    const g = this.guestPeer && this.peers().find(p => p.peer === this.guestPeer);
    const i = (g && g.presence && g.presence.in) || {};
    let mx = clamp(+i.mx || 0, -1, 1), mz = clamp(+i.mz || 0, -1, 1); const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
    const ac = i.ac | 0, bc = i.bc | 0, xc = i.xc | 0, sc = i.sc | 0;
    if (i.q) this.guestQ = +i.q;
    if ((i.rc | 0) > (this.lastRc || 0)) { this.lastRc = i.rc | 0; this.pendRel = { rt: +i.rt || 0 }; }   // guest released Shoot at this shot time (its view)
    this.guestLag = clamp(+i.lg || 0, 0, 300) / 1000;                          // newest guest input the host has applied (for guest prediction)
    c.mx = mx; c.mz = mz; c.turbo = !!i.t; c.bHeld = !!i.bh; c.bRel = false; c.xHeld = !!i.xh; c.aRel = !!this._ah && !i.ah; c.aHeld = !!i.ah; this._ah = !!i.ah;
    c.a = ac > this.lastAc; c.b = bc > this.lastBc; this.lastAc = Math.max(this.lastAc, ac); this.lastBc = Math.max(this.lastBc, bc);
    c.x = xc > (this.lastXc || 0); this.lastXc = Math.max(this.lastXc || 0, xc);
    c.s = sc > (this.lastSc || 0); this.lastSc = Math.max(this.lastSc || 0, sc);
    c.passTo = null; c.alley = null; c.face = 0;
  },
  remoteAnswer() {
    const g = this.guestPeer && this.peers().find(p => p.peer === this.guestPeer);
    return g && g.presence && g.presence.ans;
  },
  hostTick(rdt) {
    const peers = this.peers();
    if (!this.guestPeer) {
      const g = peers.find(p => !p.sameTab && p.presence && p.presence.role === 'guest' && p.presence.join === this.code);
      if (g) {
        this.guestPeer = g.peer; const i = g.presence.in || {}; this.lastAc = i.ac | 0; this.lastBc = i.bc | 0; this.lastXc = i.xc | 0;
        SFX.good();
        if (M.online && Game.screen !== 'hostlobby' && Game.screen !== 'lobby') {       // rejoin mid-game: hand the player back
          const gs = this.guestSlot(), p = M.teams[gs.team].players[gs.slot]; p.human = 1;
          FX.callout('YOUR FRIEND IS BACK', '#9dffb0');
        }
      }
    } else if (!peers.some(p => p.peer === this.guestPeer && p.presence && p.presence.role === 'guest' && p.presence.join === this.code)) {
      this.guestPeer = null;
      if (M.online) { for (const p of M.players) if (p.human === 1) p.human = -1; if (Game.screen === 'play') FX.callout('YOUR FRIEND LEFT', '#ff9a8a', 'CPU TAKES OVER'); }
    }
    if (this.snapDue(rdt)) this.setP({ s: this.snapshot() });   // v7.4: fixed rate (NET_HZ), not every rendered frame
  },
  snapshot() {
    const s = { v: 1, g: this.guestPeer, mode: this.mode };
    if (!M.online || Game.screen === 'hostlobby') { s.sc = 'lobby'; s.ta = this.sel.a; s.tb = this.sel.b; return s; }
    const ti = d => { const i = TEAMS.indexOf(d); return i >= 0 ? i : Math.max(0, TEAMS.findIndex(t => t.name === d.name)); };   // copies (Barakah Run) match by name
    s.mid = this.mid; s.ta = ti(M.teamDefs[0]); s.tb = ti(M.teamDefs[1]);
    s.sc = Game.screen === 'halftime' ? 'half' : Game.screen === 'final' ? 'final' : Game.paused ? 'pause' : 'play';
    s.m = [M.quarter, r1(M.clock), r1(M.shotClock), NP.indexOf(M.phase), M.teams[0].score, M.teams[1].score, M.possTeam, M.double ? 1 : 0, M.winner == null ? -1 : M.winner];
    if (M.phase === 'break') s.bt = M.breakText;
    s.p = M.players.map(p => [r1(p.x), r1(p.y), r1(p.z), r1(p.vx), r1(p.vz), p.face, NS.indexOf(p.state), r2(p.st_t), r2(p.spin), r2(p.rot),
      p.dh === 'n' ? 0 : 1, p.move ? (p.move.type === 'btb' ? 2 : 1) : 0, p.move ? r2(p.move.t) : 0,
      p.act && (p.state === 'dunk' || p.state === 'hang') ? ND.indexOf(p.act.type) : -1, p.act ? r2(p.act.s) : 0,
      (p.fire ? 1 : 0) | (p.boost > 0 ? 2 : 0) | (p.cmd.turbo ? 4 : 0) | (p.celebrate > 0 ? 8 : 0), Math.round(p.turbo), Math.round(p.hifz), r1(Math.max(0, p.boost)), p.human]);
    // optional fields (older guests ignore them): format, green-window difficulty, fun modes, hot spot
    s.fx = { mg: View.magnet, t: M.fmt.target, hc: M.halfCourt ? 1 : 0, f: M.fmt.format, l: M.fmt.len, sc: M.fmt.sc, dm: r2(humanDiffMult()), fun: M.fun || 0, hs: M.hot ? [r1(M.hot.x), r1(M.hot.z), r1(M.hot.t)] : 0 };
    s.b = ballArr(M.balls ? M.balls[0] : ball);
    if (M.balls && M.balls[1]) s.b2 = ballArr(M.balls[1]);                 // optional: second ball (Lightning)
    if (M.mini) { s.mini = M.mini.kind; s.mg = M.mini.snap(); }
    else if (M.venue) s.vn = M.venue;                                     // optional: venue spec (plain data)
    if (M.ft) s.ftx = [M.players.indexOf(M.ft.shooter), M.ft.i, M.ft.n, M.ft.stage];   // optional: free-throw banner
    if (M.teamFouls && (M.teamFouls[0] || M.teamFouls[1])) s.tf = M.teamFouls;            // optional: mini game state for the guest's HUD
    s.h = [r1(hoops[0].dy), r1(hoops[1].dy)];
    s.e = this.evs.slice(-14);
    if (this.guestQ) s.ak = this.guestQ;
    if (Run.duo === 'online' && (Run.active || Game.screen === 'runend')) s.br = runDuoState();   // optional: duo run state for the guest                   // optional: ack of the guest's input stamp (older guests ignore it)
    if (s.sc !== 'play') s.st = M.players.map(p => { const t = p.stats; return [t.pts, t.reb, t.ast, t.stl, t.blk, t.dnk, t.fgm, t.fga, t.pf || 0, t.ftm || 0, t.fta || 0]; });
    const tv = Game.trivia;
    if (tv && tv.remote) s.tv = [tv.qi, tv.order, r1(tv.t), tv.done ? 1 : 0, tv.choice, tv.correct ? 1 : 0, M.players.indexOf(tv.p)];
    let js = JSON.stringify(s);
    while (js.length > 3700 && s.e.length) { s.e.shift(); js = JSON.stringify(s); }
    return s;
  },

  // ----------------------------------------------------------------- guest
  join(code) {
    this.role = 'guest'; this.code = code; this.ac = 0; this.bc = 0; this.xc = 0; this.snaps = []; this.lastS = null; this.curMid = -1;
    this.waitT = 0; this.status = 'searching';
    this.setP({ role: 'guest', join: code, code: null, s: null, ans: null, in: { mx: 0, mz: 0, t: 0, bh: 0, ac: 0, bc: 0 } });
    Game.screen = 'netwait';
  },
  hostPeer() { return this.peers().find(p => !p.sameTab && p.presence && p.presence.role === 'host' && p.presence.code === this.code); },
  onPeers() {
    if (this.role !== 'guest') return;
    const h = this.hostPeer();
    if (h && h.presence.s && h.presence.s !== this.lastS) {
      const t = nowMs();
      if (this.lastSnapAt) {          // track arrival rate and jitter for an adaptive render delay
        const d = t - this.lastSnapAt; this.avgInt = lerp(this.avgInt || 33, d, 0.1); this.jit = lerp(this.jit || 8, Math.abs(d - this.avgInt), 0.1);
      }
      this.lastS = h.presence.s; this.lastSnapAt = t;
      if (h.presence.s.ak) this.rtt = lerp(this.rtt || 120, clamp(t - h.presence.s.ak, 0, 600), 0.2);   // input stamp echoed by the host
      this.snaps.push({ t, s: h.presence.s }); if (this.snaps.length > 10) this.snaps.shift();
    }
  },
  guestTick(rdt) {
    this.onPeers();                                   // also poll, in case a delivery was coalesced
    // publish controller state (presses as counters)
    if (Game.screen === 'netplay' && !Game.paused && !(Game.trivia && !Game.trivia.done)) {
      const c = {}; humanCmd(0, c);
      if (c.a) this.ac++; if (c.b) this.bc++; if (c.x) this.xc = (this.xc || 0) + 1; if (c.s) this.sc = (this.sc || 0) + 1;
      const meS = M.players && M.players.find(p => p.human === 1);
      if (this._bh && !c.bHeld && meS && meS.state === 'shoot') { this.rc = (this.rc || 0) + 1; this.rt = Math.round(meS.st_t * 1000) / 1000; }   // release at the time WE saw
      this._bh = c.bHeld;
      const q = Math.round(nowMs() * 10) / 10; (this.hist = this.hist || []).push({ q, mx: r2(c.mx), mz: r2(c.mz), t: c.turbo ? 1 : 0, dt: Math.min(rdt, 0.05) }); if (this.hist.length > 120) this.hist.shift();
      this.setP({ in: { q, rc: this.rc || 0, rt: this.rt || 0, lg: Math.round((this.rtt || 120) / 2 + (this.rdelay || 70)), ri: this.rh || 0, rp: this.rp ? [this.rp, this.rpI] : null, mx: r2(c.mx), mz: r2(c.mz), t: c.turbo ? 1 : 0, bh: c.bHeld ? 1 : 0, xh: c.xHeld ? 1 : 0, ah: c.aHeld ? 1 : 0, ac: this.ac, bc: this.bc, xc: this.xc || 0 } });
    } else this.setP({ in: { mx: 0, mz: 0, t: 0, bh: 0, ac: this.ac, bc: this.bc } });
    const h = this.hostPeer(), s = this.lastS, me = this.myPeer();
    if (Game.screen === 'netwait') {
      this.waitT += rdt;
      if (!h) this.status = this.waitT > 6 ? 'notfound' : 'searching';
      else if (s && s.g && s.g !== me) this.status = 'full';
      else if (s && s.g === me) { this.status = s.sc === 'lobby' ? 'lobby' : 'play'; if (s.sc !== 'lobby') Game.screen = 'netplay'; else Game.screen = 'lobby'; }
      else this.status = 'knocking';
      attractTick(rdt);
      return;
    }
    if (Game.screen === 'netplay') {
      if (h) this.hostGoneT = 0; else this.hostGoneT = (this.hostGoneT || 0) + rdt;
      const gap = this.lastSnapAt ? nowMs() - this.lastSnapAt : 0;
      if (this.hostGoneT > 45 || gap > 45000) { this.status = 'hostleft'; Game.screen = 'netwait'; this.waitT = 99; this.reconnecting = false; return; }
      this.reconnecting = !h || gap > 2000;                     // "Host reconnecting..." (frozen until snapshots resume)
      if (this.reconnecting) return;
      if (s && s.g !== me) { this.status = 'full'; Game.screen = 'netwait'; return; }
      if (s && s.sc === 'lobby') { this.status = 'lobby'; this.curMid = -1; Lobby.guestBack(); return; }      // game over: back to the lobby
      if (Replay.active || Replay.at > 0) { Replay.tick(rdt); if (Replay.active) { if (menuHit('ok')) Replay.active = null; return; } }
      this.guestFrame(rdt);
    }
  },
  // Client-side prediction for the guest's own player: start from the newest host position, replay
  // the inputs the host hasn't applied yet (same speed and acceleration rules), and ease the shown
  // position toward that. Only on the ground and free; everything else uses host interpolation.
  predictOwn(rdt) {
    const me = M.players.find(p => p.human === 1), N = this.snaps[this.snaps.length - 1];
    if (!me || !N || !N.s.p || N.s.mid !== this.curMid || N.s.ak == null || me.state !== 'free' || NP[N.s.m[3]] !== 'live' || this.noPredict) {
      if (me && me._pd) { me._off = { x: me._pd.x - me.x, z: me._pd.z - me.z }; me._pd = null; }   // hand back to interpolation smoothly
      if (me && me._off) { const k = Math.exp(-rdt / 0.12); me._off.x *= k; me._off.z *= k; me.x += me._off.x; me.z += me._off.z; if (Math.abs(me._off.x) + Math.abs(me._off.z) < 0.5) me._off = null; }
      return;
    }
    if (me._off && !me._pd) { me._pd = { x: me.x + me._off.x, z: me.z + me._off.z }; me._off = null; }   // and from it, starting where we're drawn
    const raw = N.s.p[M.players.indexOf(me)], ak = N.s.ak, hist = this.hist || [];
    let x = raw[0], z = raw[2], vx = raw[3], vz = raw[4];
    const keepT = me.cmd.turbo;
    for (const h of hist) {
      if (h.q <= ak) continue;
      me.cmd.turbo = !!h.t; const sp = me.speed(), mg = magnetCmd(me, h.mx, h.mz, x, z), tvx = mg[0] * sp, tvz = mg[1] * sp;   // v7.4: same assist as the host
      const acc = Math.min(1, h.dt * (Math.hypot(tvx, tvz) < Math.hypot(vx, vz) ? 20 : 14));
      vx += (tvx - vx) * acc; vz += (tvz - vz) * acc; x += vx * h.dt; z += vz * h.dt;
    }
    me.cmd.turbo = keepT;
    while (hist.length > 1 && hist[0].q <= ak - 500) hist.shift();
    x = clamp(x, -20, COURT.L + 20); z = clamp(z, 20, COURT.D - 20);
    const d = me._pd;
    if (!d || Math.hypot(d.x - x, d.z - z) > 90) me._pd = { x, z };              // far off (collision/knockdown on the host): take it
    else { const k = Math.min(1, rdt * 18); d.x += (x - d.x) * k; d.z += (z - d.z) * k; }
    me.x = me._pd.x; me.z = me._pd.z; me.vx = vx; me.vz = vz;
  },
  guestFrame(rdt) {
    const buf = this.snaps; if (!buf.length) return;
    // render slightly in the past (about 1.6 snapshot intervals plus jitter) so
    // there are almost always two snapshots to blend between
    const delay = this.rdelay = clamp((this.avgInt || 33) * 1.25 + (this.jit || 8) * 1.5, 40, 140), now = nowMs() - delay;
    while (buf.length > 2 && buf[1].t <= now) buf.shift();
    const A = buf[0], B = buf[1] || buf[0], SB = B.s;
    const ext = B === buf[buf.length - 1] && now > B.t ? clamp((now - B.t) / 1000, 0, 0.06) : 0;   // brief extrapolation if a snapshot is late
    if (SB.sc === 'lobby' || SB.mid == null) return;
    if (SB.mid !== this.curMid) {
      this.curMid = SB.mid;
      const gs = SB.mode === 'co' || SB.mode === 'brun' ? { team: 0, slot: 1 } : { team: 1, slot: 0 };
      if (SB.mini) setupMini(SB.mini, { online: true, roster: MINI_ONLINE[SB.mini], humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] });
      else newMatch(TEAMS[SB.ta], TEAMS[SB.tb], { humans: [{ team: 0, slot: 0, pad: 0 }, { team: gs.team, slot: gs.slot, pad: 1 }], venue: SB.vn || null });
      FX.reset(); M.online = true;
      this.lastEv = SB.e && SB.e.length ? SB.e[SB.e.length - 1][0] : 0;
    }
    const SA = A.s.mid === SB.mid ? A.s : SB;
    const k = B === A ? 1 : clamp((now - A.t) / Math.max(1, B.t - A.t), 0, 1), L = (a, b) => lerp(a, b, k);
    const m = SB.m;
    M.quarter = m[0]; M.clock = L(SA.m[0] === m[0] ? SA.m[1] : m[1], m[1]); M.shotClock = m[2]; M.phase = NP[m[3]] || 'live';
    M.teams[0].score = m[4]; M.teams[1].score = m[5]; M.possTeam = m[6]; M.double = !!m[7]; M.winner = m[8] < 0 ? null : m[8];
    M.breakText = SB.bt || '';
    if (SB.fx) {
      const x = SB.fx; if (!M.fmt || M.fmt.format !== x.f || M.fmt.len !== x.l || M.fmt.sc !== x.sc || (x.t && M.fmt.target !== x.t)) M.fmt = makeFmt({ fmt: { format: x.f, len: x.l, sc: x.sc, target: x.t } });
      if (x.hc != null) M.halfCourt = !!x.hc;
      M.dmOverride = x.dm; M.fun = x.fun || null; M.magnetLvl = x.mg != null ? x.mg : M.magnetLvl; M.hot = x.hs ? { x: x.hs[0], z: x.hs[1], t: x.hs[2] } : null;
      if (M.fun && M.fun.uncle) for (const p of M.players) p.outfit = 'thobe';
    }
    M.players.forEach((p, i) => {
      const a = SA.p[i], b = SB.p[i];
      p.x = L(a[0], b[0]) + b[3] * ext; p.y = L(a[1], b[1]); p.z = L(a[2], b[2]) + b[4] * ext; p.vx = b[3]; p.vz = b[4]; p.face = b[5];
      p.state = NS[b[6]] || 'free'; p.st_t = b[7]; p.spin = b[8]; p.rot = b[9]; p.dh = b[10] ? 'f' : 'n';
      p.move = b[11] ? { type: b[11] === 2 ? 'btb' : 'cross', t: b[12], dur: b[11] === 2 ? 0.3 : 0.24, from: p.dh, to: p.dh === 'n' ? 'f' : 'n', bounced: true } : null;
      p.act = b[13] >= 0 ? { type: ND[b[13]] || 'tomahawk', s: b[14] } : (p.state === 'dunk' || p.state === 'hang') ? { type: 'tomahawk', s: b[14] || 0 } : null;   // never leave a dunking player without an act (crashed the guest's frame)
      p.fire = !!(b[15] & 1); p.cmd.turbo = !!(b[15] & 4); p.celebrate = b[15] & 8 ? 0.5 : 0;
      p.turbo = b[16]; p.hifz = b[17]; p.boost = b[18]; p.human = b[19];
      if (SB.st) { const t = SB.st[i]; Object.assign(p.stats, { pts: t[0], reb: t[1], ast: t[2], stl: t[3], blk: t[4], dnk: t[5], fgm: t[6], fga: t[7], pf: t[8] || 0, ftm: t[9] || 0, fta: t[10] || 0 }); }
    });
    const setB = (o, bb, ba) => {
      o.owner = bb[3] >= 0 ? M.players[bb[3]] : null; o.state = NB[bb[4]] || 'loose'; o.fire = !!bb[6];
      if (!o.owner) { o.x = L(ba[0], bb[0]); o.y = L(ba[1], bb[1]); o.z = L(ba[2], bb[2]); o.rot = bb[5]; }
    };
    this.predictOwn(rdt);
    if (M.balls) { setB(M.balls[0], SB.b, SA.b); if (M.balls[1] && SB.b2) setB(M.balls[1], SB.b2, SA.b2 || SB.b2); }
    else setB(ball, SB.b, SA.b);
    if (M.mini && SB.mg) M.mini.applySnap(SB.mg);
    M.ft = SB.ftx ? { shooter: M.players[SB.ftx[0]], i: SB.ftx[1], n: SB.ftx[2], stage: SB.ftx[3] } : null; M.teamFouls = SB.tf || [0, 0];
    hoops.forEach((h, i) => { h.dy = L(SA.h[i], SB.h[i]); h.vy = 0; });
    for (const e of SB.e || []) if (e[0] > this.lastEv) { this.lastEv = e[0]; this.applyEv(e); }
    // trivia mirrored from the host
    if (SB.tv) {
      const t = SB.tv, cur = Game.trivia;
      if (!cur || cur.qi !== t[0]) Game.trivia = { remoteView: true, qi: t[0], order: t[1], sel: 0, t: t[2], done: !!t[3], choice: t[4], correct: !!t[5], p: M.players[t[6]], sent: false };
      else { cur.t = t[2]; if (t[3]) { cur.done = true; cur.choice = t[4]; cur.correct = !!t[5]; } }
    } else if (Game.trivia && Game.trivia.remoteView) Game.trivia = null;
    // local-only animation and cosmetics
    M.time += rdt;
    for (const p of M.players) {
      withPlayerBall(p, () => animate(p, rdt));
      if (p.fire && chance(rdt * 30)) FX.fire(p.x + rand(-10, 10), p.y + rand(5, 70), p.z);
      if (p.boost > 0 && chance(rdt * 18)) FX.spark(p.x + rand(-14, 14), p.y + rand(10, 90), p.z, '#ffe38a', 'star');
    }
    for (const h of hoops) h.update(rdt);
    FX.update(rdt); updateCamera(rdt);
    Replay.record();
  },
  guestTrivia() {
    const tv = Game.trivia; if (!tv || tv.done || tv.sent) return;
    if (menuHit('up')) { tv.sel = (tv.sel + 3) % 4; SFX.blip(); }
    if (menuHit('down')) { tv.sel = (tv.sel + 1) % 4; SFX.blip(); }
    let pickI = -1;
    for (let i = 0; i < 4; i++) if (Input.pressed['Digit' + (i + 1)]) pickI = i;
    if (menuHit('ok') || Input.pressed.KeyJ) pickI = tv.sel;
    if (pickI >= 0) this.guestAnswer(pickI);
  },
  guestAnswer(i) { const tv = Game.trivia; if (!tv || tv.sent || tv.done) return; tv.sent = true; tv.sel = i; this.setP({ ans: { qi: tv.qi, i } }); SFX.blip(); },
  update(rdt) {
    if (this.role === 'host') this.hostTick(rdt);
    else if (this.role === 'guest') this.guestTick(rdt);
  }
};
function nowMs() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

// ------------------------------------------------------ ONLINE SCREENS
const ONLINE_ITEMS = ['Host: same team vs CPU', 'Host: head to head', 'Host: 1 on 1 (no CPU)', 'Join with a code', 'Back'];
function onlineSelect(i) {
  if (Net.avail !== 'yes') { if (i === 1 && typeof location !== 'undefined') location.reload(); else goTitle(); return; }
  if (i === 4) { goTitle(); return; }
  if (i === 3) { Net.typed = ''; Game.screen = 'joincode'; return; }
  const a = rint(8);
  Game.sel = { mode: i === 0 ? 'oco' : i === 1 ? 'ovs' : 'o1', step: 0, a, b: (a + 1) % 8, ctrl: 0, ctrlB: 0 };
  Game.screen = 'select';
}
function typeCode(ch) { if (Net.typed.length < 4) { Net.typed += ch; SFX.blip(); } }
function joinTyped() { if (Net.typed.length === 4) Net.join(Net.typed); }
function onlineUpdate(rdt) {
  const s = Game.screen;
  if (s === 'online') { menuNav(ONLINE_ITEMS.length, onlineSelect); if (menuHit('back')) goTitle(); attractTick(rdt); }
  else if (s === 'joincode') {
    for (const ch of ALPHA) if (Input.pressed['Key' + ch]) typeCode(ch);
    if (Input.pressed.Backspace) Net.typed = Net.typed.slice(0, -1);
    else if (Input.pressed.Escape) { Game.screen = 'online'; Game.idx = 3; }
    if (Input.pressed.Enter || Input.pressed.NumpadEnter) joinTyped();
    attractTick(rdt);
  } else if (s === 'hostlobby') {
    if (menuHit('ok') && Net.guestPeer) Net.hostStart();
    else if (menuHit('back')) goTitle();
    attractTick(rdt);
  } else if (s === 'netwait') {
    if (menuHit('back') || ((Net.status === 'notfound' || Net.status === 'full' || Net.status === 'hostleft') && menuHit('ok'))) goTitle();
  } else if (s === 'netplay') {
    if (Game.paused) { menuNav(2, i => i === 0 ? (Game.paused = false) : goTitle()); if (menuHit('back')) Game.paused = false; return; }
    if (Game.trivia && Game.trivia.remoteView) Net.guestTrivia();
    else if (menuHit('back') || Input.pressed.KeyP) { Game.paused = true; Game.idx = 0; }
  }
}
function bigCode(g, code, y) {
  for (let i = 0; i < 4; i++) {
    const x = W / 2 - 150 + i * 78;
    g.fillStyle = 'rgba(8,16,24,0.9)'; roundRect(g, x, y, 66, 80, 12); g.fill();
    g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.textAlign = 'center'; g.fillText(code[i] || '', x + 33, y + 58);
  }
}
function drawOnline(g) {
  dim(g, 0.72);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText('Play online with a friend', W / 2, 96);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`;
  if (Net.avail !== 'yes') {
    const msg = Net.avail === 'checking' ? 'Connecting...' : Net.reason === 'not-configured' ? 'Online play needs a Firebase project. Paste its config into FIREBASE_CONFIG (see README).' : Net.reason === 'exception' ? 'Could not reach the online service. Check your connection and the Firebase config.' : 'Online play works when the game is opened from its claude.ai link while signed in.';
    g.fillText(msg, W / 2, 200);
    if (Net.avail !== 'checking') g.fillText('Both players open the same page, then one hosts and the other enters the code.', W / 2, 226);
    if (Net.reason) { g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Diagnostic: ' + Net.reason, W / 2, 256); }
    drawMenu(g, ['Back', 'Reload and try again'], Game.idx % 2, 310, i => { if (i === 1 && typeof location !== 'undefined') location.reload(); else goTitle(); });
    return;
  }
  g.fillText('Host a game to get a join code, or type your friend\u2019s code to join theirs.', W / 2, 124);
  drawMenu(g, ONLINE_ITEMS, Game.idx, 200, onlineSelect);
}
function drawJoinCode(g) {
  dim(g, 0.75);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Enter the join code', W / 2, 70);
  bigCode(g, Net.typed, 96);
  // on-screen letters for touch
  for (let i = 0; i < ALPHA.length; i++) {
    const cx = W / 2 - 350 + (i % 12) * 60, cy = 212 + Math.floor(i / 12) * 56;
    g.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(g, cx, cy, 52, 46, 8); g.fill();
    g.fillStyle = '#fff'; g.font = `20px ${FONT}`; g.fillText(ALPHA[i], cx + 26, cy + 31);
    addRect(cx, cy, 52, 46, () => typeCode(ALPHA[i]));
  }
  const btn = (x, label, fn, on) => { g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, x, 340, 150, 42, 21); g.fill(); g.fillStyle = on ? NIGHT : '#fff'; g.font = `17px ${FONT}`; g.fillText(label, x + 75, 367); addRect(x, 340, 150, 42, fn); };
  btn(W / 2 - 240, 'Delete', () => { Net.typed = Net.typed.slice(0, -1); }, false);
  btn(W / 2 - 75, 'Join', joinTyped, Net.typed.length === 4);
  btn(W / 2 + 90, 'Back', () => { Game.screen = 'online'; }, false);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Type the letters, Enter to join, Esc to go back', W / 2, 420);
}
function drawHostLobby(g) {
  dim(g, 0.72);
  const s = Net.sel;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Your join code', W / 2, 70);
  bigCode(g, Net.code, 88);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`;
  g.fillText('Your friend opens this same page, picks Online, then Join with a code.', W / 2, 200);
  const modeTxt = Net.mode === 'brun' ? 'Barakah Run duos: one run, one team, you and your friend against the CPU ladder' : Net.mode === 'lightning' ? 'Mini game: Lightning. You, your friend and three masjid members' : Net.mode === 'horse' ? 'Mini game: HORSE, head to head' : Net.mode === 'co' ? `You and your friend play for ${TEAMS[s.a].name} against ${TEAMS[s.b].name}` : `You play for ${TEAMS[s.a].name}, your friend plays for ${TEAMS[s.b].name}`;
  g.fillText(modeTxt, W / 2, 226);
  if (!Net.isMini()) { drawCrest(g, W / 2 - 60, 280, 26, TEAMS[s.a]); drawCrest(g, W / 2 + 60, 280, 26, TEAMS[s.b]); g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText('vs', W / 2, 287); }
  const ready = !!Net.guestPeer;
  g.fillStyle = ready ? '#9dffb0' : '#9fb3c8'; g.font = `18px ${FONT}`;
  g.fillText(ready ? 'Your friend is here!' : 'Waiting for your friend' + '.'.repeat(1 + (Game.t * 2 | 0) % 3), W / 2, 350);
  if (ready) {
    g.fillStyle = GOLD; roundRect(g, W / 2 - 90, 372, 180, 40, 20); g.fill();
    g.fillStyle = NIGHT; g.font = `17px ${FONT}`; g.fillText(M.online ? 'Rematch' : 'Tip off', W / 2, 398);
    addRect(W / 2 - 90, 372, 180, 40, () => Net.hostStart());
  }
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Enter to start, Esc to cancel', W / 2, 440);
}
function drawNetWait(g) {
  dim(g, 0.72);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Joining ' + Net.code, W / 2, 150);
  const msgs = {
    searching: 'Looking for the game' + '.'.repeat(1 + (Game.t * 2 | 0) % 3),
    knocking: 'Found it. Waiting for the host to let you in...',
    lobby: 'Connected! Waiting for your friend to tip off.',
    notfound: 'No game with that code is open right now. Check the code and that your friend is still on the host screen.',
    full: 'That game already has two players.',
    hostleft: 'The host left the game.'
  };
  g.fillStyle = Net.status === 'lobby' ? '#9dffb0' : IVORY; g.font = `17px ${BODY}`;
  wrapText(g, msgs[Net.status] || '', W / 2, 210, 640, 26);
  const end = Net.status === 'notfound' || Net.status === 'full' || Net.status === 'hostleft';
  g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, W / 2 - 80, 300, 160, 40, 20); g.fill();
  g.fillStyle = '#fff'; g.font = `16px ${FONT}`; g.fillText(end ? 'Back to title' : 'Cancel', W / 2, 326);
  addRect(W / 2 - 80, 300, 160, 40, goTitle);
}
function drawNetPlay(g) {
  const s = Net.lastS; if (!s) return;
  if (s.sc === 'half') drawHalftime(g);
  else if (s.sc === 'final') drawFinal(g);
  else if (s.sc === 'pause') banner(g, 'Paused', 'Your friend paused the game');
  if (M.mini) drawMiniResult(g);
  if (Game.trivia) drawTrivia(g);
  if (Game.paused) drawPause(g);
}

