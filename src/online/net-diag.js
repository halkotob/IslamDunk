// ================================================= v9.10: ONLINE LATENCY: RELAY (TURN), DIAGNOSTICS, SMALLER SNAPSHOTS
// Online play has three paths, tried in this order: Direct (a peer-to-peer WebRTC data channel, p2p.js), Relay (the
// same data channel through a TURN server, for carrier and strict NATs) and Server (Firebase relays every message).
//   * TURN: when a player hosts or joins a lobby, the game asks our Cloudflare Worker (worker/ice) for short-lived
//     TURN credentials (2 s timeout; on any failure it carries on with STUN only, as before). The browser still
//     prefers direct candidates (host, srflx) and uses the relay only when they fail.
//   * Network changes (wifi to cellular, a dropped link): the direct link is closed and reopened the existing way
//     (a fresh offer through the presence `rtc` key) while play continues on the server path. An ICE restart was not
//     used: the signalling sends complete descriptions once per connection, so a restart would mean a second
//     negotiation path on both sides, more risk for the same result (a new link in about 1-3 s).
//   * Protocol version: presence carries pv (NET_PROTO) next to the app version v. The lobby won't start a game
//     between different versions (as before, but a missing version no longer passes), and a guest on another version
//     is no longer handed a player mid-game. Snapshots are versioned: v 1 = the full format, v 2 = compact.
//   * Server path: snapshots are compact (v 2): numbers quantized to integers, and only what changed since a key
//     snapshot the guest has confirmed is sent. A key (k = its id) is a whole snapshot, sent every 2 s; the guest keeps
//     the last few and puts the newest id in its input (in.kk); the host then sends deltas against it (kf = the key's
//     id). The guest rebuilds the exact v 1 snapshot, so nothing else changes. The direct link keeps full snapshots.
//   * Diagnostics: Settings > Show network info (off by default) shows the mode, ping, jitter, loss, snapshot rate,
//     render delay and prediction corrections in a small box. The lobby rates each player's connection (Good / OK /
//     Poor) from a 5 s probe, and "Copy network report" copies a plain-text report. Nothing is sent anywhere.
const ONLINE_ICE_URL = null;   // after deploying worker/ice: 'https://islamdunk-ice.<your-subdomain>.workers.dev/ice'
const NET_PROTO = 3;           // bump when the wire format changes in a way older clients can't read (3: v9.11.1 trickle ICE, snapshot numbers)
const SNAP_V = 2;              // newest snapshot format this client reads

// ---------------------------------------------------------------- ICE servers (TURN) from the Worker
const P2P_STUN = P2P_ICE.iceServers.slice();
const IceFetch = {
  state: 'idle', ms: 0, why: '', exp: 0, turn: 0, p: null, n: 0,
  url() {
    try { const q = new URLSearchParams(location.search).get('ice'); if (q) return q; } catch (e) {}
    return (typeof window !== 'undefined' && window.ISLAMDUNK_ICE_URL) || ONLINE_ICE_URL;
  },
  // TURN entries from the Worker, without port 53 (browsers time out on it), with the TLS 443 option present
  clean(list) {
    const out = [];
    for (const s of [].concat(list || [])) {
      if (!s || !s.urls) continue;
      let urls = [].concat(s.urls).filter(u => typeof u === 'string' && /^(turns?|stun):/.test(u) && !/:53(\?|$)/.test(u));
      if (!urls.length) continue;
      const turn = urls.filter(u => /^turns?:/.test(u));
      if (turn.length && !urls.some(u => /^turns:.*:443/.test(u))) { const host = (turn[0].match(/^turns?:([^:?]+)/) || [])[1]; if (host) urls.push(`turns:${host}:443?transport=tcp`); }
      if (turn.length && (!s.username || !s.credential)) continue;
      out.push(turn.length ? { urls, username: String(s.username), credential: String(s.credential) } : { urls });
    }
    return out;
  },
  apply(list) {
    const own = (typeof window !== 'undefined' && window.ISLAMDUNK_TURN) || ONLINE_TURN;
    P2P_ICE.iceServers = P2P_STUN.concat(own ? [].concat(own) : [], list);
    this.turn = list.filter(s => [].concat(s.urls).some(u => /^turns?:/.test(u))).length;
  },
  // called on host and join; resolves within ~2 s whatever happens
  get() {
    const url = this.url();
    if (!url) { this.state = 'none'; return Promise.resolve(); }
    if (this.state === 'ok' && Date.now() < this.exp) return Promise.resolve();
    if (this.p) return this.p;
    const t0 = nowMs(); this.state = 'pending'; this.n++;
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const fin = (st, why) => { this.state = st; this.why = why || ''; this.ms = Math.round(nowMs() - t0); this.p = null; if (st !== 'ok') { this.apply([]); try { console.info('[net] TURN credentials unavailable (' + this.why + '); using STUN only'); } catch (e) {} } };
    this.p = new Promise(res => {
      const timer = setTimeout(() => { if (this.state === 'pending') { fin('fail', 'timeout'); try { ctl && ctl.abort(); } catch (e) {} } res(); }, 2000);
      Promise.resolve().then(() => fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined }))
        .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(b => {
          if (this.state !== 'pending') return;
          const list = this.clean(b && b.iceServers);
          if (!list.length) throw new Error('empty');
          this.apply(list); this.exp = Date.now() + Math.max(60, Math.min(+b.ttl || 3600, 86400) - 300) * 1000;   // refresh 5 min early
          fin('ok');
        })
        .catch(e => { if (this.state === 'pending') fin('fail', String((e && e.name === 'AbortError') ? 'timeout' : (e && e.message) || e).slice(0, 60)); })
        .then(() => { clearTimeout(timer); res(); });
    });
    return this.p;
  },
  label() {
    return this.state === 'ok' ? `STUN + TURN relay (credentials in ${this.ms} ms)` : this.state === 'fail' ? `STUN only (TURN credentials failed: ${this.why})` : this.state === 'pending' ? 'STUN, TURN credentials loading' : 'STUN only (no relay configured)';
  }
};

// ---------------------------------------------------------------- diagnostics state
const NetDiag = {
  pings: [], sentP: [], lastT: 0, snapT: [], fixT: [], lastFixAt: 0, t0: 0, t1: 0, connVia: '', offers: 0, answers: 0, drops: 0, fails: 0,
  netChanges: 0, recov: '', pair: null, statsAt: 0, mode: 'server', switches: [], probeAt: 0, rating: null, unresolved: 0, newer: false, ratingSent: '',
  reset() { Object.assign(this, { pings: [], sentP: [], snapT: [], fixT: [], t0: 0, t1: 0, connVia: '', offers: 0, answers: 0, drops: 0, fails: 0, netChanges: 0, recov: '', pair: null, switches: [], probeAt: 0, rating: null, unresolved: 0, newer: false, ratingSent: '' }); },
  rtt() { const p = this.pings.slice(-6); return p.length ? Math.round(p.reduce((a, x) => a + x.r, 0) / p.length) : Lobby.ping || 0; },
  jitter() { const p = this.pings.slice(-20); if (p.length < 2) return 0; let s = 0; for (let i = 1; i < p.length; i++) s += Math.abs(p[i].r - p[i - 1].r); return Math.round(s / (p.length - 1)); },
  loss() { const now = nowMs(), done = this.sentP.filter(x => x.got || now - x.t > 2000).slice(-20); if (!done.length) return 0; return Math.round(done.filter(x => !x.got).length / done.length * 100); },
  snapRate() { const now = nowMs(); this.snapT = this.snapT.filter(t => now - t < 1000); return this.snapT.length; },
  fixesPerMin() { const now = nowMs(); this.fixT = this.fixT.filter(t => now - t < 60000); return this.fixT.length; },
  modeNow() {
    if (typeof P2P !== 'undefined' && P2P.open) { const pr = this.pair; return pr && (pr.l === 'relay' || pr.r === 'relay') ? 'relay' : 'direct'; }
    return 'server';
  },
  modeName(m = this.modeNow()) { return m === 'direct' ? 'Direct (peer to peer)' : m === 'relay' ? 'Relay (TURN)' : 'Server (' + (Net.transport === 'room' ? 'claude.ai' : Net.transport === 'loop' ? 'test loopback' : 'Firebase') + ')'; },
  // rate the connection from the last 5 s of pings
  rate() {
    const now = nowMs(), w = this.pings.filter(p => now - p.at < 5000);
    if (!this.probeAt || now - this.probeAt < 5000) return null;
    if (w.length < 3) return 'poor';                                       // hardly any pings came back in 5 s
    const rtt = w.reduce((a, p) => a + p.r, 0) / w.length, jit = this.jitter(), loss = this.loss();
    return rtt <= 120 && jit <= 25 && loss <= 2 ? 'good' : rtt <= 250 && jit <= 60 && loss <= 8 ? 'ok' : 'poor';
  },
  async pollStats() {
    const pc = typeof P2P !== 'undefined' && P2P.pc;
    if (!pc || !P2P.open || !pc.getStats) { this.pair = null; return; }
    try {
      const st = await pc.getStats(); let sel = null; const byId = {};
      st.forEach(r => { byId[r.id] = r; });
      st.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) sel = byId[r.selectedCandidatePairId]; });
      if (!sel) st.forEach(r => { if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) sel = sel || r; });
      if (!sel) return;
      const l = byId[sel.localCandidateId], r = byId[sel.remoteCandidateId];
      this.pair = { l: (l && l.candidateType) || '?', r: (r && r.candidateType) || '?', proto: (l && (l.relayProtocol || l.protocol)) || '' };
    } catch (e) {}
  },
  // candidate types in our own offer/answer (types only; addresses are never read out)
  candTypes() {
    const sdp = typeof P2P !== 'undefined' && P2P.pc && P2P.pc.localDescription && P2P.pc.localDescription.sdp; if (!sdp) return null;
    const n = {}; for (const m of sdp.matchAll(/ typ (host|srflx|prflx|relay)\b/g)) n[m[1]] = (n[m[1]] || 0) + 1; return n;
  },
  device() {
    let ua = ''; try { ua = navigator.userAgent || ''; } catch (e) {}
    const m = (re) => { const x = ua.match(re); return x ? x[1].split('.')[0] : ''; };
    const browser = /Edg\//.test(ua) ? 'Edge ' + m(/Edg\/([\d.]+)/) : /OPR\//.test(ua) ? 'Opera ' + m(/OPR\/([\d.]+)/) : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox ' + m(/(?:Firefox|FxiOS)\/([\d.]+)/) : /CriOS\//.test(ua) ? 'Chrome (iOS) ' + m(/CriOS\/([\d.]+)/) : /Electron\//.test(ua) ? 'Electron ' + m(/Electron\/([\d.]+)/) : /Chrome\//.test(ua) ? 'Chrome ' + m(/Chrome\/([\d.]+)/) : /Safari\//.test(ua) ? 'Safari ' + m(/Version\/([\d.]+)/) : 'Other';
    const platform = /iPhone|iPod/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'ChromeOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
    let conn = 'unknown'; try { const c = navigator.connection; if (c) conn = [c.type, c.effectiveType].filter(Boolean).join(', ') || 'unknown'; } catch (e) {}
    return { browser, platform, conn };
  },
  report() {
    const d = this.device(), ct = this.candTypes(), pr = this.pair, other = Net.role === 'host' ? Lobby.guestPres() : (Net.hostPeer() || {}).presence;
    const rn = r => r ? (NQ_TXT[r] || [r])[0] : 'not rated yet';
    const L = [
      'Islam Dunk network report',
      `App version: ${VERSION} (network protocol ${NET_PROTO})`,
      `Role: ${Net.role || 'none'}`,
      `Mode: ${this.modeName()}`,
      `Ping (round trip): ${this.rtt()} ms   Jitter: ${this.jitter()} ms   Packet loss: ${this.loss()}% (last 20 pings)`,
      Net.role === 'guest' ? `Snapshots received: ${this.snapRate()}/s   Render delay: ${Math.round(Net.rdelay || 0)} ms   Position corrections over 3 ft: ${this.fixesPerMin()}/min` : `Snapshots sent: ${this.snapRate()}/s`,
      `ICE servers: ${IceFetch.label()}`,
      `ICE candidates offered here: ${ct ? Object.entries(ct).map(([k, v]) => k + ' ' + v).join(', ') || 'none' : 'no direct link attempt yet'}`,
      `Selected candidate pair: ${pr ? pr.l + ' -> ' + pr.r + (pr.proto ? ' (' + pr.proto + ')' : '') : 'none (not on a direct or relay link)'}`,
      `Time to connect (lobby to first direct or relay packet): ${this.t1 ? ((this.t1 - this.t0) / 1000).toFixed(1) + ' s (' + this.connVia + ')' : 'not connected directly'}`,
      `Direct-link attempts: ${Net.role === 'host' ? this.offers : this.answers}, failed: ${this.fails}, drops to the server path: ${this.drops}, network changes: ${this.netChanges}${this.recov ? ', recovery: ' + this.recov : ''}`,
      `Mode changes: ${this.switches.length ? this.switches.slice(-6).map(s => s.m).join(' > ') : 'none'}`,
      `Connection quality: you ${rn(this.rating)}, other player ${rn(other && other.nq && other.nq.r)}`,
      `Browser: ${d.browser}   Platform: ${d.platform}   Network type: ${d.conn}`
    ];
    return L.join('\n');
  },
  copy(where) {
    const txt = this.report(); window.__lastNetReport = txt;
    const done = ok => { const m = ok ? 'Network report copied' : 'Could not copy the report'; if (where === 'lobby') Lobby.toast = { t: 2.5, m }; else toast(m, 2.5); };
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); done(ok); } catch (e) { done(false); } };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(() => done(true), fallback); return; } } catch (e) {}
    fallback();
  }
};
try { SETTINGS.netInfo = localStorage.getItem('islamdunk.netinfo') === '1'; } catch (e) { SETTINGS.netInfo = false; }
SET_ITEMS.splice(SET_ITEMS.length - 1, 0, { label: 'Show network info', get: () => SETTINGS.netInfo ? 'On' : 'Off', step: () => { SETTINGS.netInfo = !SETTINGS.netInfo; try { localStorage.setItem('islamdunk.netinfo', SETTINGS.netInfo ? '1' : '0'); } catch (e) {} } });

// ---------------------------------------------------------------- compact snapshots (server path)
const SNAP_Q = [1, 1, 1, 1, 1, 1, 1, 100, 100, 100, 1, 1, 100, 1, 100, 1, 1, 1, 10, 1];   // per player value: x 1 = whole units
const BALL_Q = [1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 10, 10, 10];   // (v9.11: + the launch in flight, for the guest's time-shifted ball)
const SNAP_HDR = [], SNAP_PASS = ['e', 'vn', 'ak', 'ct'];   // header keys (g, mode, mid, sc) go like the rest: only when changed. PASS: sent as they are, never kept in a key
const SNAP_EV = ['s:bounce', 's:swish', 's:clank', 's:board', 's:slam', 's:squeak', 's:swipe', 's:thud', 's:buzzer', 's:cheer', 's:good', 's:bad',
  'f:callout', 'f:pop', 'f:burst', 'f:shake', 'f:hype', 'f:dust', 'f:replay', 'f:highlight', 'f:cue'];   // append only
const qArr = (a, Q) => a.map((v, i) => typeof v === 'number' ? Math.round(v * (Q[i] || 1)) : v);
const dqArr = (a, Q) => a.map((v, i) => typeof v === 'number' && Q[i] > 1 ? v / Q[i] : v);
const SnapZ = {
  k: (Math.random() * 1e6) | 0, sent: new Map(), propAt: 0, fx: null, mid: null, keys: new Map(), lastKey: null,
  on(s) {
    if (Net.role !== 'host' || Net.noCompact || !s || s.mid == null || s.sc === 'lobby' || !s.p) return false;
    if (typeof P2P !== 'undefined' && P2P.open) return false;                 // the direct link keeps full snapshots (v9.11.1: compact ones measured no better there)
    const gp = Lobby.guestPres(); return !!(gp && gp.pv >= 2);
  },
  // the host's v 1 snapshot -> v 2: a key (everything, with id k) now and then, else only what changed since the
  // newest key the guest has confirmed (its input carries kk), with kf = that key's id
  pack(s) {
    this.lastIn = s;
    if (s.fx) { this.fx = s.fx; this.mid = s.mid; } else if (this.fx && this.mid === s.mid) s = Object.assign({}, s, { fx: this.fx });   // fx goes out every 15th snapshot; keys keep the latest
    const full = {};
    for (const k in s) if (k !== 'v' && !SNAP_HDR.includes(k) && !SNAP_PASS.includes(k) && k !== '__t') full[k] = s[k];
    full.p = s.p.map(a => qArr(a, SNAP_Q)); if (s.b) full.b = qArr(s.b, BALL_Q); if (s.b2) full.b2 = qArr(s.b2, BALL_Q);
    const gp = Lobby.guestPres(), ack = gp && gp.in && gp.in.kk, now = nowMs();
    let base = ack != null && this.sent.get(ack);
    if (base && (base.mid !== s.mid || base.sc !== s.sc || base.full.p.length !== full.p.length)) base = null;
    const out = { v: 2 };
    for (const k of SNAP_HDR) if (k in s) out[k] = s[k];
    for (const k of SNAP_PASS) if (s[k] != null) out[k] = k === 'e' ? s.e.map(packEv) : s[k];
    if (s.__t) out.__t = s.__t;
    // a new key now and then: every 0.3 s until the guest confirms one (full v 1 snapshots in between), then every
    // 2 s (tried again after 0.6 s if it isn't confirmed)
    if (now - this.propAt > (base ? 600 : 300) && (!base || now - base.at > 2000)) {
      this.k = (this.k + 1) % 1e9; this.propAt = now;
      this.sent.set(this.k, { full: JSON.parse(JSON.stringify(full)), at: now, mid: s.mid, sc: s.sc });   // a copy: some values are live arrays (team fouls) if (this.sent.size > 12) this.sent.delete(this.sent.keys().next().value);
      return Object.assign(out, full, { k: this.k });
    }
    if (!base) return s;
    const kf = base.full, gone = [];
    out.kf = ack;
    for (const k in full) if (k !== 'p' && JSON.stringify(full[k]) !== JSON.stringify(kf[k])) out[k] = full[k];
    for (const k in kf) if (k !== 'p' && !(k in full)) gone.push(k);
    if (gone.length) out._x = gone;
    out.q = full.p.map((a, j) => { const b = kf.p[j]; let m = 0; const vals = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { m |= 1 << i; vals.push(a[i]); } return m ? [m, ...vals] : 0; });
    return out;
  },
  // guest: a v 2 snapshot -> the v 1 snapshot (null if its key isn't here)
  unpack(s) {
    let K = null;
    if (s.k != null) { K = s; this.keys.set(s.k, s); if (this.keys.size > 6) this.keys.delete(this.keys.keys().next().value); this.lastKey = s.k; }
    else { K = this.keys.get(s.kf); if (!K) return null; }
    const o = {};
    for (const k in K) if (k !== 'k' && k !== 'v' && k !== '__t' && !SNAP_HDR.includes(k) && !SNAP_PASS.includes(k)) o[k] = K[k];
    for (const k in s) if (k !== 'q' && k !== '_x' && k !== 'kf' && k !== 'k') o[k] = s[k];
    for (const k of s._x || []) delete o[k];
    o.v = 1;
    if (K.p) o.p = K.p.map((b, j) => { const d = K !== s && s.q && s.q[j], a = b.slice(); if (d) { let vi = 1; for (let i = 0; i < a.length; i++) if (d[0] & (1 << i)) a[i] = d[vi++]; } return dqArr(a, SNAP_Q); });
    if (o.b) o.b = dqArr(o.b, BALL_Q); if (o.b2) o.b2 = dqArr(o.b2, BALL_Q);
    if (o.e) o.e = o.e.map(unpackEv);
    return o;
  }
};
function packEv(e) { const i = typeof e[1] === 'string' ? SNAP_EV.indexOf(e[1] + ':' + e[2]) : -1; return i < 0 ? e : [e[0], i, ...e.slice(3)]; }
function unpackEv(e) { if (typeof e[1] !== 'number') return e; const n = SNAP_EV[e[1]]; return n ? [e[0], ...n.split(':'), ...e.slice(2)] : e; }
{
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    NetDiag.snapT.push(nowMs());
    return SnapZ.on(s) ? SnapZ.pack(s) : s;
  };
  // guest: rebuild compact snapshots, then the same bookkeeping as before (arrival rate, jitter, round trip)
  Net.onPeers = function () {
    if (this.role !== 'guest') return;
    const h = this.hostPeer(); if (!h) return;
    const raw = h.presence.s;
    if (!raw || raw === this._rawS) return;
    this._rawS = raw;
    let s = raw;
    if (raw.v > SNAP_V) { NetDiag.newer = true; return; }                      // a newer host: never guess at its format
    if (raw.v === 2) { s = SnapZ.unpack(raw); if (!s) { NetDiag.unresolved++; return; } }
    const t = nowMs();
    if (this.lastSnapAt) { const d = t - this.lastSnapAt; this.avgInt = lerp(this.avgInt || 33, d, 0.1); this.jit = lerp(this.jit || 8, Math.abs(d - this.avgInt), 0.1); }
    this.lastS = s; this.lastSnapAt = t; NetDiag.snapT.push(t);
    if (s.ak) this.rtt = lerp(this.rtt || 120, clamp(t - s.ak, 0, 600), 0.2);
    this.snaps.push({ t, s }); if (this.snaps.length > 10) this.snaps.shift();
  };
  const _jn = Net.join;
  Net.join = function () { SnapZ.keys.clear(); SnapZ.lastKey = null; this._rawS = null; NetDiag.reset(); IceFetch.get(); return _jn.apply(this, arguments); };
  const _lv = Net.leave;
  Net.leave = function () { if (this.role) this.setP({ nq: null }); SnapZ.sent.clear(); return _lv.apply(this, arguments); };
}

// ---------------------------------------------------------------- version check
{
  const same = p => !!p && p.v === VERSION && (p.pv | 0) === NET_PROTO;
  const _sp = Net.setP;
  Net.setP = function (patch) {
    if (patch && 'v' in patch && patch.v) patch = Object.assign({}, patch, { pv: NET_PROTO });
    if (patch && patch.in && this.role === 'guest' && SnapZ.lastKey != null) patch.in.kk = SnapZ.lastKey;   // the newest snapshot key we hold
    return _sp.call(this, patch);
  };
  // a missing version is "not known yet" for the warning, but never enough to start a game
  Lobby.versionOK = function () { const other = Net.role === 'host' ? this.guestPres() : (Net.hostPeer() || {}).presence; return !other || (other.v == null && other.pv == null) || same(other); };
  const _cs = Lobby.canStart;
  Lobby.canStart = function () { return _cs.call(this) && same(this.guestPres()); };
  // mid-game rejoin: a guest on another version isn't handed a player (the lobby check doesn't run then)
  const _ht = Net.hostTick;
  Net.hostTick = function (rdt) {
    const had = this.guestPeer, peers = this.peers;
    if (!had && M.online && Game.screen !== 'lobby' && Game.screen !== 'hostlobby') {
      this.peers = function () { return peers.call(this).filter(p => p.sameTab || !(p.presence && p.presence.role === 'guest' && p.presence.join === this.code && p.presence.v != null && !same(p.presence))); };
    }
    try { _ht.call(this, rdt); } finally { this.peers = peers; }
    if (!had && this.guestPeer && !NetDiag.t0) NetDiag.t0 = nowMs();
  };
  // guest: say so instead of "two players" or waiting forever
  const _gt = Net.guestTick;
  Net.guestTick = function (rdt) {
    _gt.apply(this, arguments);
    const h = this.hostPeer(), hp = h && h.presence;
    const other = hp && hp.v != null && !same(hp);                                   // a host on another version
    if (Game.screen === 'netwait' && other && this.status !== 'version') { this.status = 'version'; this.verOther = hp.v; }
    if (Game.screen === 'netplay' && (other || NetDiag.newer)) { this.status = 'version'; this.verOther = hp && hp.v; Game.screen = 'netwait'; this.waitT = 99; }
  };
  const _dw = drawNetWait;
  drawNetWait = function (g) {
    if (Net.status !== 'version') return _dw(g);
    dim(g, 0.72);
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Joining ' + Net.code, W / 2, 150);
    g.fillStyle = IVORY; g.font = `17px ${BODY}`;
    wrapText(g, `That game is on a different version (theirs ${Net.verOther || '?'}, yours ${VERSION}). Both players refresh the page, then try again.`, W / 2, 210, 640, 26);
    g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, W / 2 - 80, 300, 160, 40, 20); g.fill();
    g.fillStyle = '#fff'; g.font = `16px ${FONT}`; g.fillText('Back to title', W / 2, 326);
    addRect(W / 2 - 80, 300, 160, 40, goTitle);
  };
  const _ou = onlineUpdate;
  onlineUpdate = function (rdt) {
    if (Game.screen === 'netwait' && Net.status === 'version') { if (menuHit('back') || menuHit('ok')) goTitle(); return; }
    if (Game.screen === 'netplay' && Game.paused && !(Game.trivia && Game.trivia.remoteView)) { pauseNav(); return; }   // the guest's pause menu: every item, keyboard too
    return _ou(rdt);
  };
}

// ---------------------------------------------------------------- direct link: TURN, attempts, drops, recovery
{
  const _of = P2P.offer, _an = P2P.answer, _cl = P2P.close, _rv = P2P.recv, _np = P2P.newPc, _wd = P2P.wireDc;
  const waitIce = async function (fn, args) {
    if (IceFetch.state === 'pending') { if (this._iceWait) return; this._iceWait = true; try { await IceFetch.get(); } finally { this._iceWait = false; } }
    return fn.apply(this, args);
  };
  P2P.offer = function () { if (this._iceWait) return Promise.resolve(); NetDiag.offers++; return waitIce.call(this, _of, arguments); };
  P2P.answer = function () { if (this._iceWait) return Promise.resolve(); NetDiag.answers++; return waitIce.call(this, _an, arguments); };
  P2P.close = function (why) {
    if (this.open) { NetDiag.drops++; NetDiag.pair = null; } else if (this.pc && why !== 'leave' && why !== 'left') NetDiag.fails++;
    return _cl.apply(this, arguments);
  };
  P2P.recv = function () { if (!NetDiag.t1 && NetDiag.t0) { NetDiag.t1 = nowMs(); NetDiag.connVia = 'first packet'; NetDiag.pollStats().then(() => { NetDiag.connVia = NetDiag.modeNow() === 'relay' ? 'relay' : 'direct'; }); } return _rv.apply(this, arguments); };
  P2P.newPc = function () {
    const pc = _np.apply(this, arguments);
    // a link that stays "disconnected" (the network changed under it) is closed after 3 s instead of waiting ~30 s
    // for "failed"; play continues on the server path and the host offers a new link
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'disconnected') setTimeout(() => { if (P2P.pc === pc && pc.connectionState === 'disconnected') { NetDiag.recov = 'reconnect (new offer)'; P2P.close('pc-disconnected'); P2P.nextTry = nowMs() + 1000; } }, 3000);
    });
    return pc;
  };
  P2P.wireDc = function (dc) { _wd.apply(this, arguments); const o = dc.onopen; dc.onopen = e => { o && o(e); NetDiag.pollStats(); }; };
  // wifi <-> cellular: drop the old link now (it's on the old network) and offer a new one straight away
  const netChange = () => {
    NetDiag.netChanges++;
    if (!Net.role) return;
    if (IceFetch.state === 'ok' && Date.now() > IceFetch.exp) IceFetch.get();
    if (P2P.pc) { NetDiag.recov = 'reconnect (new offer)'; P2P.close('net-change'); }
    P2P.tries = 0; P2P.nextTry = nowMs() + 800;
  };
  try { const c = navigator.connection; if (c && c.addEventListener) c.addEventListener('change', netChange); } catch (e) {}
  try { addEventListener('online', netChange); } catch (e) {}
  NetDiag.netChange = netChange;
}

// ---------------------------------------------------------------- measuring: ping, jitter, loss, corrections, mode
{
  const _ps = Lobby.pingStep;
  Lobby.pingStep = function (rdt) {
    const myT = this.myT, got = this.gotEcho;
    _ps.apply(this, arguments);
    const now = nowMs(), D = NetDiag;
    // every echo counts, also one that comes back after the next stamp went out (the lobby ping only counts the newest)
    const other = Net.role === 'host' ? this.guestPres() : (Net.hostPeer() || {}).presence, pg = other && other.pg;
    if (pg && pg.e && pg.e !== D.lastE) {
      D.lastE = pg.e;
      const sp = D.sentP.find(x => x.t0 === pg.e && !x.got);
      if (sp) { sp.got = true; D.pings.push({ r: Math.max(1, now - pg.e - (pg.h || 0)), at: now }); if (D.pings.length > 60) D.pings.shift(); }
    }
    if (this.myT !== myT) { D.sentP.push({ t0: this.myT, t: now, got: false }); if (D.sentP.length > 40) D.sentP.shift(); }
    void got;
  };
  // the guest's own player: how often the host's view pulls the predicted position by more than 40 units (~3 ft)
  const _po = Net.predictOwn;
  Net.predictOwn = function (rdt) {
    const me = M.players && M.players.find(p => p.human === 1), d0 = me && me._pd, x0 = d0 && d0.x, z0 = d0 && d0.z;
    _po.apply(this, arguments);
    const d1 = me && me._pd; if (!d0 || !d1) return;
    // eased toward the host's view: the pull is the step / the easing factor; replaced (9.11: also when within 3
    // units, so that is no correction): the jump itself
    const err = d1 !== d0 ? Math.hypot(d1.x - x0, d1.z - z0) : Math.hypot(d1.x - x0, d1.z - z0) / Math.max(1e-3, Math.min(1, rdt * 18));
    const now = nowMs();
    if (err > 40 && now - NetDiag.lastFixAt > 300) { NetDiag.fixT.push(now); NetDiag.lastFixAt = now; }
  };
  const _nu = Net.update;
  Net.update = function (rdt) {
    _nu.apply(this, arguments);
    if (!this.role) return;
    const now = nowMs(), D = NetDiag, here = this.role === 'host' ? !!this.guestPeer : !!this.hostPeer();
    if (this.role === 'guest' && !D.t0 && (Game.screen === 'lobby' || Game.screen === 'netplay')) D.t0 = now;
    if (here && !D.probeAt) D.probeAt = now; else if (!here) D.probeAt = 0;
    if (now - D.statsAt > 2000) { D.statsAt = now; D.pollStats(); }
    const m = D.modeNow(); if (!D.switches.length || D.switches[D.switches.length - 1].m !== m) D.switches.push({ m, at: now });
    const r = D.rate(); D.rating = r;
    const tag = (r || '') + '/' + m;
    if (tag !== D.ratingSent && here) { D.ratingSent = tag; this.setP({ nq: { r: r || null, m } }); }
  };
  const _op = Lobby.open;
  Lobby.open = function () { NetDiag.reset(); IceFetch.get(); return _op.apply(this, arguments); };
}

// ---------------------------------------------------------------- what the players see
function netInfoBox(g) {
  const D = NetDiag, guest = Net.role === 'guest', m = D.modeNow();
  const l1 = `${m === 'direct' ? 'Direct' : m === 'relay' ? 'Relay (TURN)' : 'Server'}  ${D.rtt()} ms  ±${D.jitter()}  loss ${D.loss()}%`;
  const l2 = guest ? `snap ${D.snapRate()}/s  delay ${Math.round(Net.rdelay || 0)} ms  fix ${D.fixesPerMin()}/min` : `sending ${D.snapRate()}/s`;
  g.save(); g.font = `12px ${BODY}`;
  const px = typeof phoneEffPx === 'function' ? phoneEffPx(g) : 12, lh = Math.round(px * 1.3);   // phones raise small text (phone-pass.js)
  const w = Math.max(g.measureText(l1).width, g.measureText(l2).width) + 16, h = lh * 2 + 10, x = W - 112 - w, y = 8;
  NetDiag.box = { x, y, w, h, px };
  g.fillStyle = 'rgba(8,14,22,0.72)'; roundRect(g, x, y, w, h, 8); g.fill();
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = m === 'server' ? '#ffd76a' : '#9dffb0'; g.fillText(l1, x + 8, y + 4 + lh * 0.85);
  g.fillStyle = '#cfd8e3'; g.fillText(l2, x + 8, y + 4 + lh * 1.85);
  g.restore();
}
const NQ_TXT = { good: ['Good', '#57e389'], ok: ['OK', '#ffd76a'], poor: ['Poor', '#ff8a6b'] };
{
  // lobby: how we're connected (replaces the v7.6 line), each player's quality, the host hint, the report button
  drawLobby = (_dl => function (g) {
    const here = Net.role === 'host' ? !!Net.guestPeer : !!Net.hostPeer();
    if (!here) return _dl(g);
    const ft = g.fillText; let hid = false;
    g.fillText = function (t, x, y) { if (!hid && y === 412 && x === 48 && /^(Direct connection|Connected through|Setting up a direct)/.test(t)) { hid = true; return; } return ft.apply(this, arguments); };
    try { _dl(g); } finally { g.fillText = ft; }
    const m = NetDiag.modeNow();
    g.textAlign = 'left'; g.font = `12px ${BODY}`; g.fillStyle = m === 'server' ? '#9fb3c8' : '#9dffb0';
    g.fillText(m === 'direct' ? 'Direct connection (peer to peer)' : m === 'relay' ? 'Relay connection (TURN)' : P2P.state === 'off' || !P2P.ok() ? 'Connected through the server' : 'Setting up a direct connection…', 48, 412);
    const host = Net.role === 'host', other = host ? Lobby.guestPres() : (Net.hostPeer() || {}).presence, oq = other && other.nq && other.nq.r, mine = NetDiag.rating;
    const tag = (y, r) => { const t = NQ_TXT[r]; g.textAlign = 'right'; g.font = `12px ${FONT}`; g.fillStyle = t ? t[1] : '#9fb3c8'; g.fillText(t ? t[0] : 'Testing…', 250, y + 26); };
    tag(172, host ? mine : oq); tag(256, host ? oq : mine);
    const hostQ = host ? mine : oq;
    if (hostQ === 'poor') { g.textAlign = 'left'; g.font = `12px ${BODY}`; g.fillStyle = '#ffb08a'; wrapTextLeft(g, 'The host’s connection is Poor. The other player may host better.', 48, 372, 236, 16); }
    uiButton(g, W - 228, 456, 198, 34, 'Copy network report', () => NetDiag.copy('lobby'));
    if (SETTINGS.netInfo) netInfoBox(g);
  })(drawLobby);
  const _pi = pauseItems;
  pauseItems = function () {
    const it = _pi.apply(this, arguments);
    if (Net.role && M.online) it.splice(it.length - 1, 0, ['Copy network report', () => NetDiag.copy('pause')]);
    return it;
  };
  const _r = render;
  render = function (g) {
    _r(g);
    if (!SETTINGS.netInfo || !Net.role) return;
    if (Game.screen === 'netplay' || (Game.screen === 'play' && Net.role === 'host' && M.online)) netInfoBox(g);
  };
}
