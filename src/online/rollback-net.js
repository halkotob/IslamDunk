// ================================================= v9.14: ROLLBACK NETCODE, PART 2: THE ONLINE MATCH
// Same team vs CPU, Head to head and 1 on 1 (the match modes) are played with rollback: both players run the whole
// match (rollback.js makes every frame the same on both machines) and send each other only their controls.
//   * Your own controls play at once (after a short input delay, 1 frame on a good link and more on a slow one: it
//     hides most corrections; rbDelayFor).
//   * Your friend's controls for a frame you've already played are guessed (the buttons they were holding); when the
//     real ones arrive and differ, the game goes back to that frame and plays the frames since again, in the same
//     drawn frame (RBN.W = 10 frames at most; further behind than that, the game waits for them). The delay grows
//     on a slow link (up to 9 frames) so the window covers the rest, instead of waits.
//   * Inputs are tiny (one number a frame, runs of the same input as one) and each packet repeats every input the other
//     side hasn't confirmed (48 at most), so a lost packet costs nothing. They travel on the direct link (unordered, no resends) like the old snapshots.
//   * The side that runs ahead slows down a little until both are on the same frame (time sync).
//   * Every second each side sends the checksum of a frame both have confirmed; a mismatch is a desync (reported in
//     the network report, and the host's state is sent to put the guest right: rollback-sync.js).
// The match starts from the host's start message (rbgo): the match setup, the seed and the agreed settings; both
// sides build the same match from it. HORSE, Lightning and Barakah Run duos still use the host's snapshots, and so do
// matches without a direct link (everything through the server: in-order delivery holds every input up behind a lost
// one, and rollback would wait; there the snapshots keep your own player instant).
const RBN = {
  on: false, id: 0, me: 0, D: 2, W: 10, keep: 40, maxD: 9,
  f: 0, acc: 0, states: new Map(), ins: [new Map(), new Map()], used: new Map(), conf: -1, lastIn: RB_IDLE,
  rollTo: Infinity, peerF: -1, peerAck: -1, peerV: null, gotAt: 0, rtt: 0, lastPkt: null, hashes: new Map(), theirHash: null,
  desync: null, gone: false, stats: null, cfg: null, over: false, hold: 0,
  modes: new Set(['co', 'vs', 'one']),
  direct() { return (typeof P2P !== 'undefined' && P2P.open) || (Net.transport === 'loop' && Net.loop && Net.loop.mode !== 'server'); },   // (the test link stands in for one)
  eligible(mode) { return this.modes.has(mode) && this.direct() && !(typeof window !== 'undefined' && window.ISLAMDUNK_RB === false) && !/[?&]rb=0\b/.test(typeof location !== 'undefined' ? location.search : ''); },   // (?rb=0 / the test switch: the snapshot netcode)
  // ---------------------------------------------------------------- starting
  // host: the start message (what newMatch needs, all of it data), then the match at frame 0
  hostStart() {
    const s = Net.sel, gs = Net.guestSlot(), vb = s.venue ? { id: s.venue.id || null, backdrop: s.venue.backdrop || null } : null;
    const cfg = { id: (this.id = (this.id + 1) % 1e6 || 1), mode: Net.mode, seed: (Math.random() * 2147483647) | 0, set: rbConfig(SETTINGS),
      teams: [JSON.parse(JSON.stringify(teamAt(s.a))), JSON.parse(JSON.stringify(teamAt(s.b)))], venue: s.venue ? JSON.parse(JSON.stringify(s.venue)) : null,
      humans: [{ team: 0, slot: 0, pad: 0 }, { team: gs.team, slot: gs.slot, pad: 1 }] };
    Net.mid++; Net.evs = []; Game.lastMatch = null;
    Net.setP({ rbgo: cfg, rbend: null, rb: null });
    this.start(cfg, 0);
  },
  start(cfg, me) {
    const keepRand = Math.random; let s = cfg.seed | 0;
    const seeded = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const keepSet = {}; for (const k in cfg.set) { keepSet[k] = SETTINGS[k]; SETTINGS[k] = cfg.set[k]; }
    rbClean(); Math.random = seeded; RB.sim = true;                     // (the venue, the crowd and the effects roll their own numbers)
    try { newMatch(cfg.teams[0], cfg.teams[1], { humans: cfg.humans, venue: cfg.venue }); }
    finally { RB.sim = false; Math.random = keepRand; for (const k in keepSet) SETTINGS[k] = keepSet[k]; }
    M.rbSeed = cfg.seed ^ 0x5bd1e995; M.rb = true; M.introT = 0; for (const q of M.players) q.hifzUsed = true;   // (no Noor questions in a rollback match yet)
    RB.cfg = cfg.set;
    Object.assign(this, { on: true, cfg, id: cfg.id, me, f: 0, acc: 0, rollTo: Infinity, conf: -1, peerF: -1, peerAck: -1, peerV: null, gotAt: nowMs(), rtt: 0, lastPkt: null,
      desync: null, gone: false, over: false, hold: 0, theirHash: null, lastIn: RB_IDLE, hashedTo: -1, dbg: null, trace: null, lastSet: 1, dAt: 0, rtts: [], endF: null, hostGoneT: 0, needSync: false, pendingState: null });
    RB_EVENTS.clear(); this.states.clear(); this.ins[0].clear(); this.ins[1].clear(); this.used.clear(); this.hashes.clear();
    this.stats = { frames: 0, rollbacks: 0, rolled: 0, maxRoll: 0, stalls: 0, slowed: 0, mispredicted: 0, sent: 0, got: 0, hashes: 0, t0: nowMs() };
    const ping = (typeof Lobby !== 'undefined' && Lobby.ping) || 0;          // (the lobby's round trip: a good first delay)
    this.D = ping > 0 ? rbDelayFor(ping) : 2;
    for (let f = 0; f < this.D; f++) this.ins[me].set(f, RB_IDLE);    // the input delay: nobody presses anything in the first frames
    this.lastSet = this.D - 1;
    M.online = false; Game.screen = 'play'; Game.paused = false; Game.trivia = null; Replay.reset();
    if (/[?&]rbdebug=2/.test(location.search)) this.trace = new Map();
    if (/[?&]rbdebug=[12]/.test(location.search)) { this.startLines = rbStateLines(); this.dbg = new Map(); this.dbgDump = +(new URLSearchParams(location.search).get('rbdump') || -1); }   // (tests: both sides must start alike)
    FX.scale = 1; FX.stopF = 0;
  },
  stop() { this.on = false; RB.cfg = null; },
  // ---------------------------------------------------------------- inputs
  // this device's controls as a frame input: any keyboard keys of either player (one player per device), the
  // gamepad, the touch stick and buttons (pushing the stick past its ring is sprint)
  sample(edges) {
    const d = Input.down, pr = edges ? Input.pressed : {}, rl = edges ? Input.released : {};
    const B0 = BINDS[0], B1 = BINDS[1], K = [[...B0.up, ...B1.up], [...B0.down, ...B1.down], [...B0.left, ...B1.left], [...B0.right, ...B1.right],
      [...B0.a, ...B1.a], [...B0.b, ...B1.b], [...B0.x, ...B1.x], [...DEF_KEYS[0], ...DEF_KEYS[1]], ['ShiftLeft', 'ShiftRight']];
    let h = 0, p = 0, r = 0;
    for (let i = 0; i < K.length; i++) { const bit = 1 << i, ks = K[i]; for (const k of ks) { if (d[k]) h |= bit; if (pr[k]) p |= bit; if (rl[k]) r |= bit; } }
    let ax = 0, az = 0;
    if (Input.stick && (Input.stick.ax || Input.stick.az)) { ax = Input.stick.ax; az = Input.stick.az; if (Input.touchMode && Input.stick.deep) h |= 1 << 8; }
    else if (Input.padAxis[0] && (Input.padAxis[0].ax || Input.padAxis[0].az)) { ax = Input.padAxis[0].ax; az = Input.padAxis[0].az; }
    const qx = Math.round(clamp(ax || 0, -1, 1) * 127), qz = Math.round(clamp(az || 0, -1, 1) * 127);
    return rbIn(h, p, r, qx, qz);
  },
  // the other player's input for a frame: the real one, or a guess (what they were holding, no new presses)
  remoteFor(f) {
    const R = 1 - this.me, real = this.ins[R].get(f);
    if (real) return real;
    if (this.gone) return RB_IDLE;
    let g = null; for (let k = f - 1; k >= f - 30 && !g; k--) g = this.ins[R].get(k);
    return g ? rbIn(g.h, 0, 0, g.qx, g.qz) : RB_IDLE;
  },
  inputsFor(f) {
    const mine = this.ins[this.me].get(f) || RB_IDLE, theirs = this.remoteFor(f);
    this.used.set(f, theirs);
    return this.me === 0 ? [mine, theirs] : [theirs, mine];
  },
  // ---------------------------------------------------------------- the network
  peerPres() { const p = Net.role === 'host' ? (Net.guestPeer && Net.peers().find(q => q.peer === Net.guestPeer)) : Net.hostPeer(); return p && p.presence; },
  send() {
    const me = this.me, to = this.lastSet, d = [];                        // (the newest input sampled so far)
    const firstMine = Math.max(this.peerAck == null ? 0 : this.peerAck + 1, 0);   // every input they haven't confirmed, oldest first
    for (let k = firstMine; k <= to && d.length < 48; k++) { const I = this.ins[me].get(k); if (!I) break; d.push(rbPackIn(I)); }   // (never a gap: 0 is not "no input"; 48 at most a packet)
    const last = [...this.hashes.entries()].pop();
    const pkt = { i: this.id, s: firstMine, d: rbRunsOut(d), a: this.conf, F: this.f, v: this.peerF >= 0 ? this.f - this.peerF : 0, t: Math.round(nowMs() * 10) / 10 };   // v: how far ahead of them we are, as we see it
    if (this.lastPkt) { pkt.et = this.lastPkt.t; pkt.ed = Math.round((nowMs() - this.gotAt) * 10) / 10; }
    if (last) pkt.h = last;
    Net.setP({ rb: pkt }); this.stats.sent++;
  },
  receive() {
    const pres = this.peerPres(), pkt = pres && pres.rb;
    if (!pkt || pkt.i !== this.id) return;
    if (this.lastPkt && pkt.t <= this.lastPkt.t) return;                // the same packet again, or an older one arriving late
    this.lastPkt = pkt; this.gotAt = nowMs(); this.stats.got++;
    if (pkt.et != null) this.rtt = this.rtt ? lerp(this.rtt, nowMs() - pkt.et - (pkt.ed || 0), 0.2) : nowMs() - pkt.et - (pkt.ed || 0);
    const R = 1 - this.me, I = this.ins[R];
    const D = rbRunsIn(pkt.d);
    for (let j = 0; j < D.length; j++) {
      const f = pkt.s + j; if (I.has(f)) continue;
      const v = rbUnpackIn(D[j]); I.set(f, v);
      if (f < this.f) { const u = this.used.get(f); if (!u || !rbSameIn(u, v)) { this.rollTo = Math.min(this.rollTo, f); this.stats.mispredicted++; } }
    }
    while (I.has(this.conf + 1)) this.conf++;
    this.peerAck = pkt.a; this.peerF = pkt.F; this.peerV = pkt.v;
    if (pkt.h) { this.theirHash = pkt.h; this.checkHash(); }
  },
  checkHash() {
    const H = this.theirHash; if (!H) return;
    const mine = this.hashes.get(H[0]); if (mine == null) return;
    this.stats.hashes++;
    if (mine === H[1]) { if (this.desync && H[0] > this.desync.f) this.desync = null; return; }   // (matching again: put right)
    if (!this.desync || nowMs() - this.desync.at > 2000) {
      this.desync = { f: H[0], at: nowMs() }; try { console.warn('[rollback] desync at frame', H[0]); } catch (e) {}
      if (typeof rbOnDesync === 'function') rbOnDesync(H[0]);
    }
  },
  // ---------------------------------------------------------------- frames
  stepFrame(f, resim) {
    this.states.set(f, rbSave());
    RB.frame = f;
    if (this.trace) { const calls = [], _r = rbRandom; rbRandom = function () { calls.push((new Error().stack || '').split('\n').slice(2, 6).map(l => (l.match(/at ([\w$.<>]+)/) || [])[1] || '?').join('<')); return _r(); }; try { rbStep(this.inputsFor(f), resim); } finally { rbRandom = _r; } this.trace.set(f, calls); }   // (rbdebug=2: what drew each random number)
    else rbStep(this.inputsFor(f), resim);
    RB.frame = null;
    if (this.endF == null && M.phase === 'over') this.endF = f;          // (the frame the match ended on)
  },
  // frames both players have confirmed are final: every 60th gets a checksum (of the saved state just after it), sent
  // to the other side and compared there. (With ?rbdebug=1, every confirmed frame, for tests.)
  confirmHashes() {
    const upTo = Math.min(this.conf, this.f - 1), every = this.dbg ? 1 : 60;
    for (let k = (this.hashedTo == null ? -1 : this.hashedTo) + 1; k <= upTo; k++) {
      this.hashedTo = k; if (k % every !== 0) continue;
      const S = k + 1 === this.f ? rbSave() : this.states.get(k + 1); if (!S) continue;
      const hv = rbHashSaved(S);
      if (this.dbg) { this.dbg.set(k, hv); (this.dbgIn = this.dbgIn || new Map()).set(k, [this.ins[0].get(k), this.ins[1].get(k), this.used.get(k)].map(x => x ? rbPackIn(x) : '-').join(',')); (this.dbgS = this.dbgS || new Map()).set(k, S); (this.dbgIn = this.dbgIn || new Map()).set(k, [this.ins[0].get(k), this.ins[1].get(k), this.used.get(k)].map(x => x ? rbPackIn(x) : '-').join(',')); if (this.dbgS.size > 1500) this.dbgS.delete(this.dbgS.keys().next().value); }
      if (k % 60 === 0) { this.hashes.set(k, hv); if (this.hashes.size > 4) this.hashes.delete(this.hashes.keys().next().value); this.checkHash(); }
    }
  },
  rollback() {
    const t = this.rollTo; this.rollTo = Infinity;
    if (t >= this.f || !this.states.has(t)) return;
    rbLoad(this.states.get(t));
    if (this.endF != null && t <= this.endF) this.endF = null;           // (replayed: it may end on another frame, or not yet)
    const n = this.f - t; this.stats.rollbacks++; this.stats.rolled += n; this.stats.maxRoll = Math.max(this.stats.maxRoll, n);
    for (let k = t; k < this.f; k++) this.stepFrame(k, true);
  },
  tidy() {                                                                 // what can't be needed again
    const keepFrom = Math.min(this.conf + 1, this.f) - 2;
    for (const k of this.states.keys()) if (k < keepFrom) this.states.delete(k); else break;
    for (const m of [this.used, this.ins[0], this.ins[1]]) for (const k of m.keys()) if (k < this.f - this.keep && k < this.conf - this.keep) m.delete(k); else break;
  },
  // one drawn frame: receive, go back if a guess was wrong, then play the frames that are due
  update(rdt) {
    this.receive();
    if (this.rollTo < this.f) this.rollback();
    this.confirmHashes();
    if (this.needSync && typeof rbSendState === 'function' && rbSendState()) this.needSync = false;   // (a desync: the host's state, now that it's final)
    // the input delay follows the connection: the correction window (W frames) covers what the delay doesn't, so a
    // slow link gets a little more delay instead of waits (slow motion). Twice a second, from the worst recent round trip.
    if (this.rtt > 0 && nowMs() - (this.dAt || 0) > 500) {
      this.dAt = nowMs(); this.rtts = (this.rtts || []).concat(this.rtt).slice(-6);
      const hi = Math.max(...this.rtts);                                // (the worst round trip of the last 3 s)
      const want = rbDelayFor(hi);
      if (want > this.D) this.D = want; else if (want < this.D) this.D--;   // (up at once, down a frame every half second)
    }
    // time sync: each side sees the other's frames late by the same delay, so half the difference between how far
    // ahead each of us looks to itself is how far ahead we really are (as in fighting games)
    const ahead = this.peerF >= 0 && this.peerV != null ? ((this.f - this.peerF) - this.peerV) / 2 : 0;
    this.acc += Math.min(rdt, 0.1);
    if (ahead >= 1 && this.acc >= STEP) { this.hold += rdt; if (this.hold > 0.1) { this.hold = 0; this.acc -= STEP; this.stats.slowed++; } } else this.hold = 0;   // (a frame skipped every 0.1 s while ahead)
    let n = 0, edges = true;
    while (this.acc >= STEP && n < 4) {
      if (!this.gone && this.f - this.conf > this.W) { this.stats.stalls++; this.acc = Math.min(this.acc, STEP); break; }   // too far ahead of their inputs: wait
      const t = this.f + this.D;                                         // the frame this input is for
      if (t > this.lastSet) {
        const I = Game.paused ? RB_IDLE : this.sample(edges); edges = false;   // (in the pause menu the keys are the menu's)
        for (let k = this.lastSet + 1; k < t; k++) this.ins[this.me].set(k, rbIn(I.h, 0, 0, I.qx, I.qz));   // (the delay grew: the frames between hold the same buttons)
        this.ins[this.me].set(t, I); this.lastSet = t;
      }
      snapPrev();
      this.stepFrame(this.f, false); this.f++; this.stats.frames++; n++;
      this.acc -= STEP;
    }
    if (n) { Input.pressed = {}; Input.released = {}; } else Game.keepInput = true;
    if (n >= 4) this.acc = 0;
    this.send(); this.tidy(); if ((this.f & 63) === 0) rbEventsTidy(this.f);
    Game.alpha = clamp(this.acc / STEP, 0, 1); Game.interp = true;
    FX.scale = 1; FX.stopF = 0;
    rbNets(rdt);
    // the other player is gone (no input for 10 s, or they left): their player is the CPU's from here
    if (!this.gone && nowMs() - this.gotAt > 10000) this.lose();
  },
  lose() {
    this.gone = true;
    for (const p of M.players) if (p.human === 1 - this.me && this.me === 0) p.human = -1;
    FX.callout(Net.role === 'host' ? 'YOUR FRIEND LEFT' : 'THE HOST LEFT', '#ff9a8a', Net.role === 'host' ? 'CPU TAKES OVER' : '');
    if (Net.role === 'guest') { this.stop(); Net.status = 'hostleft'; Game.screen = 'netwait'; Net.waitT = 99; }
  },
  // the match is over on a frame both players have confirmed: the final screen
  play(rdt) {
    if (Game.paused) pauseNav();                                        // (the menu only: the match keeps running online)
    else if (menuHit('back') || Input.pressed.KeyP) { Game.paused = true; Game.idx = 0; }
    if (M.phase === 'over' && this.endF != null && this.endF <= this.conf) {   // (their input for the last frame is in: the result is final)
      if (!this.over) { this.over = true; this.overT = 2.2; rbFinishOnce(); }
      this.overT -= rdt; if (this.overT <= 0) { Game.screen = 'final'; Game.paused = false; }
    }
    this.update(rdt);
  },
  report() {
    const S = this.stats; if (!S) return null;
    const secs = Math.max(1, (nowMs() - S.t0) / 1000);
    return { frame: this.f, delay: this.D, behind: this.f - 1 - this.conf, rtt: Math.round(this.rtt), rollbacksPerSec: +(S.rollbacks / secs).toFixed(2), avgRoll: S.rollbacks ? +(S.rolled / S.rollbacks).toFixed(1) : 0,
      maxRoll: S.maxRoll, stalls: S.stalls, slowed: S.slowed, mispredicted: S.mispredicted, hashesChecked: S.hashes, desync: this.desync ? this.desync.f : null };
  }
};
// a frame input, and on the wire as one number: 9 bits held, 9 pressed, 9 released, then the stick (x, z: -127..127)
// the input delay for a round trip: about 4 frames of the other player's input left to guess (corrections that small
// are hard to see), never under 1 frame, never so little that the window can't cover the rest (no waits)
function rbDelayFor(rtt) {
  const oneWay = Math.ceil((rtt / 2 + 20) / (STEP * 1000));            // (frames, with a margin for jitter)
  return clamp(Math.max(oneWay - 4, oneWay - RBN.W + 2), 1, RBN.maxD);
}
function rbIn(h, p, r, qx, qz) { return { h, p, r, qx, qz, mx: qx / 127, mz: qz / 127 }; }
function rbPackIn(I) { return I.h + I.p * 512 + I.r * 262144 + (I.qx + 127) * 134217728 + (I.qz + 127) * 34359738368; }
function rbUnpackIn(n) {
  const qz = Math.floor(n / 34359738368); n -= qz * 34359738368;
  const qx = Math.floor(n / 134217728); n -= qx * 134217728;
  const r = Math.floor(n / 262144); n -= r * 262144;
  const p = Math.floor(n / 512); return rbIn(n - p * 512, p, r, qx - 127, qz - 127);
}
// inputs on the wire: base 36, and a run of the same input as value*count ("3k9x1*7,3k9x2")
function rbRunsOut(d) { const o = []; for (let i = 0; i < d.length;) { let n = 1; while (i + n < d.length && d[i + n] === d[i]) n++; o.push(d[i].toString(36) + (n > 1 ? '*' + n : '')); i += n; } return o.join(','); }
function rbRunsIn(s) { const o = []; if (!s) return o; for (const t of String(s).split(',')) { const [v, n] = t.split('*'), x = parseInt(v, 36); for (let k = 0; k < (n ? +n : 1); k++) o.push(x); } return o; }
function rbSameIn(a, b) { return a.h === b.h && a.p === b.p && a.r === b.r && a.qx === b.qx && a.qz === b.qz; }
// the end of the match, once: the real end-of-match flow (records, the final screen) runs on the confirmed frame
function rbFinishOnce() { if (RB.finish) { const f = RB.finish; RB.finish = null; try { f(); } catch (e) {} } }
{
  RB_IDLE.qx = 0; RB_IDLE.qz = 0;
  P2P_FAST.add('rb'); if (typeof LOOP_FAST !== 'undefined') LOOP_FAST.add('rb');   // inputs go on the direct link (and the test link)
  // inside a rollback step the match only marks itself over; the rest of finishMatch waits for a confirmed frame
  const _fm = finishMatch;
  finishMatch = function () {
    if (!RB.sim) return _fm.apply(this, arguments);
    M.phase = 'over'; M.winner = M.teams[0].score > M.teams[1].score ? 0 : 1;
    const self = this, a = arguments; RB.finish = () => _fm.apply(self, a);   // (also when first reached in a replayed frame)
  };
  // the host starts a match mode with rollback
  const _hs = Net.hostStart;
  Net.hostStart = function () {
    if (!this.guestPeer || !RBN.eligible(this.mode)) { RBN.stop(); return _hs.apply(this, arguments); }
    RBN.hostStart();
  };
  // the network: while a rollback match runs, no snapshots (host) and no snapshot following (guest)
  const _nu = Net.update;
  Net.update = function (rdt) {
    if (this.role === 'guest' && !RBN.on) {                              // the host's start message
      const h = this.hostPeer(), g = h && h.presence && h.presence.rbgo;
      if (g && g.id !== RBN.lastGo && !(h.presence.rbend === g.id)) { RBN.lastGo = g.id; Net.mode = g.mode; RBN.start(g, 1); return; }
    }
    if (!RBN.on) return _nu.apply(this, arguments);
    if (Game.screen !== 'play') { RBN.receive(); RBN.send(); }          // (the final screen: the other side may still need our last inputs)
    if (this.role === 'host') {                                          // still notice the guest leaving
      const keep = this.snapDue; this.snapDue = () => false;
      try { this.hostTick(rdt); } finally { this.snapDue = keep; }
      if (!this.guestPeer && !RBN.gone) RBN.lose();
    } else {
      this.onPeers && this.onPeers();
      const h = this.hostPeer();
      if (h && h.presence && h.presence.rbend === RBN.id) { RBN.stop(); Lobby.guestBack(); return; }   // the host went back to the lobby
      RBN.hostGoneT = h && h.presence && h.presence.role === 'host' ? 0 : RBN.hostGoneT + rdt;
      if (RBN.hostGoneT > 2 && !RBN.gone) RBN.lose();                      // the host left the room
    }
  };
  // the play screen
  const _pu = playUpdate;
  playUpdate = function (rdt) { if (RBN.on) return RBN.play(rdt); return _pu.apply(this, arguments); };
  // back to the lobby / the title: the match is over for both
  const _lb = Lobby.back;
  Lobby.back = function () { if (RBN.on && Net.role === 'host') { Net.setP({ rbend: RBN.id }); } RBN.stop(); return _lb.apply(this, arguments); };
  const _gt = goTitle;
  goTitle = function () { if (RBN.on) { if (Net.role === 'host') Net.setP({ rbend: RBN.id }); RBN.stop(); } return _gt.apply(this, arguments); };
  // no instant replays in a rollback match (they would stop one side's match)
  const _rs = Replay.schedule;
  Replay.schedule = function () { if (RBN.on) return; return _rs.apply(this, arguments); };
}
