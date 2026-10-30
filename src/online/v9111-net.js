// ================================================= v9.11.1: ONLINE FOLLOW-UP: TRUSTWORTHY DIAGNOSTICS, FASTER CONNECT, LOSSY LINKS
// A real report (iPhone guest, direct link) showed 20% loss from 20 pings, 0 snapshots a second and a 9.7 s connect.
//   * Loss comes from sequence numbers: every fast-lane message carries one (q, p2p.js) and every snapshot now carries
//     sn, so the guest counts what never arrived, over the last 5 s and since the match started. Snapshot loss, fast
//     lane loss and ping loss are reported separately. On the server path a missing snapshot is one the server
//     replaced with a newer one (it sends only the newest), so it's reported as skipped.
//   * Snapshots a second: a rolling 2 s count, and "not in a match" outside one.
//   * The report adds bytes a second each way, RTT p50 / p95 over 10 s, the snapshot rate target, how often the
//     render delay changed band (10 ms), the network type the player picks on the report screen (Wi-Fi / Cellular /
//     Not sure: Safari doesn't tell; kept on this device only) and the connect steps in ms.
//   * Connecting: candidates trickle through the presence key rtc (p2p.js) instead of each side waiting up to 2.5 s
//     for ICE gathering before sending its description.
// Not kept (measured on the lag harness, no better on latency, corrections or gaps; see CHANGELOG): stepping the direct
// link's snapshot rate down from 60 Hz on lossy or jittery links, and compact snapshots on the direct link.

// ---------------------------------------------------------------- sequence-number loss
// a list of { t, n } (n = an always-increasing sequence number); loss = the share of numbers between the lowest and the
// highest seen that never arrived. Reordering is fine (a late one still counts), duplicates are ignored.
const SeqLoss = {
  make() { return { a: [], seen: new Set(), first: null, max: null, n: 0 }; },
  add(L, n, t) {
    if (L.seen.has(n)) return; L.seen.add(n); if (L.seen.size > 4000) { L.seen.clear(); for (const x of L.a) L.seen.add(x.n); }
    L.a.push({ t, n }); while (L.a.length && t - L.a[0].t > 5000) L.a.shift();
    if (L.first == null || n < L.first) L.first = n; if (L.max == null || n > L.max) L.max = n; L.n++;
  },
  // over the last ms (5 s) or since the list was made (all = true): { pct, got, of }
  loss(L, now, all) {
    if (all) { if (L.first == null) return null; const of = L.max - L.first + 1; return { pct: of ? Math.max(0, Math.round((1 - L.n / of) * 1000) / 10) : 0, got: L.n, of }; }
    const w = L.a.filter(x => now - x.t <= 5000); if (w.length < 2) return null;
    let lo = Infinity, hi = -Infinity; for (const x of w) { if (x.n < lo) lo = x.n; if (x.n > hi) hi = x.n; }
    const of = hi - lo + 1; return { pct: Math.max(0, Math.round((1 - w.length / of) * 1000) / 10), got: w.length, of };
  }
};
// 16-bit wire counter -> an always-increasing number (a step of more than half the range back counts as a wrap)
function seqUnwrap(st, v) { if (st.last == null) { st.last = v; st.ext = v; return v; } let d = (v - st.last) & 0xffff; if (d > 0x8000) d -= 0x10000; st.last = v; st.ext += d; return st.ext; }

// ---------------------------------------------------------------- diagnostics state
Object.assign(NetDiag, {
  snapL: SeqLoss.make(), fastL: SeqLoss.make(), snapAt: [], snapSeq: {}, fastAt: [], sentAt: [], io: [], tx: 0, rx: 0, rdBand: null, rdChanges: 0, firstSnapAt: 0,
  matchKey: null,
  resetMatch() { this.snapL = SeqLoss.make(); this.fastL = SeqLoss.make(); this.snapSeq = {}; this.rdChanges = 0; this.rdBand = null; },
  inMatch() {
    if (Net.role === 'guest') return Game.screen === 'netplay' && !!Net.lastS && Net.lastS.sc != null && Net.lastS.sc !== 'lobby';
    return Net.role === 'host' && !!M.online && Game.screen !== 'lobby' && Game.screen !== 'hostlobby';
  },
  // snapshots a second over the last 2 s (received on the guest, sent on the host); null outside a match
  snapRate2() { if (!this.inMatch()) return null; const now = nowMs(), L = Net.role === 'guest' ? this.snapAt : this.sentAt; while (L.length && now - L[0] > 2000) L.shift(); return Math.round(L.length / 2 * 10) / 10; },
  snapRate() { const r = this.snapRate2(); return r == null ? 0 : Math.round(r); },
  rttPct(p) { const now = nowMs(), w = this.pings.filter(x => now - x.at <= 10000).map(x => x.r).sort((a, b) => a - b); return w.length ? Math.round(w[Math.min(w.length - 1, Math.floor(w.length * p))]) : null; },
  target() { if (Net.role === 'host') return snapTarget(); const s = Net.lastS; return s && s.hz ? s.hz : (typeof P2P !== 'undefined' && P2P.open ? 60 : NET_HZ); },
  bytesPerSec() { const now = nowMs(), h = this.io.filter(x => now - x.t <= 5200); if (h.length < 2) return null; const a = h[0], b = h[h.length - 1], dt = (b.t - a.t) / 1000; return dt > 0.5 ? { tx: Math.round((b.tx - a.tx) / dt), rx: Math.round((b.rx - a.rx) / dt) } : null; },
  myNet() { try { return localStorage.getItem('islamdunk.mynet') || ''; } catch (e) { return ''; } },
  setMyNet(v) { try { localStorage.setItem('islamdunk.mynet', v); } catch (e) {} this._myNet = v; },
  connectSteps() {
    const c = (typeof P2P !== 'undefined' && P2P.cx) || {}, t0 = this.t0; if (!t0) return null;
    const rel = v => v != null ? Math.max(0, Math.round(v - t0)) : null, host = Net.role === 'host';
    const steps = [['lobby ready', 0], [host ? 'offer sent' : 'offer received', rel(host ? c.offerSent : c.offerReceived)], [host ? 'answer received' : 'answer sent', rel(host ? c.answerReceived : c.answerSent)],
      ['ICE gathering finished', rel(c.gathered)], ['ICE connected', rel(c.iceConnected)], ['data channel open', rel(c.dcOpen)], [host ? 'first direct packet received' : 'first snapshot received', rel(this.firstSnapAt || null)]];
    return { steps, sigOut: P2P.sigOut || 0, sigIn: P2P.sigIn || 0 };
  }
});
const NET_TXT = { wifi: 'Wi-Fi', cell: 'Cellular', unsure: 'Not sure' };

// ---------------------------------------------------------------- snapshot numbers, rate target
function snapTarget() { return typeof P2P !== 'undefined' && P2P.open ? 60 : NET_HZ; }
{
  let sn = 0;
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    if (s && Net.role === 'host') { s.sn = sn = (sn + 1) & 0xffff; NetDiag.sentAt.push(nowMs()); if (NetDiag.sentAt.length > 400) NetDiag.sentAt.shift(); }
    return s;
  };
  // guest: every new snapshot (the 9.10 rebuild sets lastS / lastSnapAt) is counted by its number
  const _op = Net.onPeers;
  Net.onPeers = function () {
    const before = this.lastS;
    _op.apply(this, arguments);
    if (this.role !== 'guest' || this.lastS === before || !this.lastS) return;          // (by the snapshot, not its time: two can land in the same ms)
    const s = this.lastS, t = this.lastSnapAt, D = NetDiag;
    const key = s.mid != null && s.sc !== 'lobby' ? 'm' + s.mid : 'lobby';
    if (key !== D.matchKey) { D.matchKey = key; D.resetMatch(); }
    if (s.sn != null) SeqLoss.add(D.snapL, seqUnwrap(D.snapSeq, s.sn), t);
    D.snapAt.push(t); if (D.snapAt.length > 400) D.snapAt.shift();
    if (!this._rxDc) D.rx += (D._sLen = JSON.stringify(this._rawS || s).length);   // the server path (on the direct link the channel counts)
  };
  // host: a new match restarts the counts
  const _hs = Net.hostStart;
  Net.hostStart = function () { const r = _hs.apply(this, arguments); NetDiag.matchKey = 'm' + this.mid; NetDiag.resetMatch(); return r; };
}

// ---------------------------------------------------------------- fast lane: sequence numbers, bytes, first packet
{
  const _rv = P2P.recv;
  P2P.recv = function (data) {
    const D = NetDiag, now = nowMs();
    let q = null; try { const m = /^\{"q":(\d+)/.exec(data); if (m) q = +m[1]; } catch (e) {}
    if (q != null) SeqLoss.add(D.fastL, q, now);
    D.rx += data.length;
    if (!D.firstSnapAt && D.t0 && (Net.role === 'host' || /"s":/.test(data))) D.firstSnapAt = now;
    Net._rxDc = true; try { return _rv.apply(this, arguments); } finally { Net._rxDc = false; }
  };
  const _sp = Net.setP;
  Net.setP = function (patch) {
    if (patch) {
      try { NetDiag.tx += JSON.stringify(patch).length; } catch (e) {}
    }
    return _sp.call(this, patch);
  };
  // host on the server path: what arrives from the guest (its input) counts as received
  const _ht = Net.hostTick;
  Net.hostTick = function () {
    const gp = Lobby.guestPres(), i = gp && gp.in;
    if (i && i !== this._lastIn && !(typeof P2P !== 'undefined' && P2P.open)) { this._lastIn = i; try { NetDiag.rx += JSON.stringify(i).length; } catch (e) {} }
    return _ht.apply(this, arguments);
  };
  const _nu = Net.update;
  Net.update = function (rdt) {
    _nu.apply(this, arguments);
    if (!this.role) return;
    const D = NetDiag, now = nowMs();
    if (!D.io.length || now - D.io[D.io.length - 1].t >= 1000) { D.io.push({ t: now, tx: D.tx, rx: D.rx }); if (D.io.length > 12) D.io.shift(); }
    if (this.role === 'guest' && D.inMatch() && this.rdelay) { const b = Math.round(this.rdelay / 10); if (D.rdBand != null && b !== D.rdBand) D.rdChanges++; D.rdBand = b; }
  };
  const _rs = NetDiag.reset;
  NetDiag.reset = function () { _rs.apply(this, arguments); Object.assign(this, { firstSnapAt: 0, tx: 0, rx: 0, io: [], sentAt: [], snapAt: [], matchKey: null }); this.resetMatch(); if (typeof P2P !== 'undefined') { P2P.cx = {}; P2P.sigOut = 0; P2P.sigIn = 0; } };
}

// ---------------------------------------------------------------- the report
NetDiag.report = function () {
  const D = this, d = D.device(), ct = D.candTypes(), pr = D.pair, other = Net.role === 'host' ? Lobby.guestPres() : (Net.hostPeer() || {}).presence, now = nowMs();
  const rn = r => r ? (NQ_TXT[r] || [r])[0] : 'not rated yet', server = D.modeNow() === 'server';
  const ls = (x, what) => x ? `${x.pct}% (${x.of - x.got} of ${x.of} ${what})` : 'not measured yet';
  const sr = D.snapRate2(), bps = D.bytesPerSec(), cs = D.connectSteps(), mine = D.myNet();
  const L = [
    'Islam Dunk network report',
    `App version: ${VERSION} (network protocol ${NET_PROTO})`,
    `Role: ${Net.role || 'none'}`,
    `Mode: ${D.modeName()}`,
    `Ping: RTT ${D.rtt()} ms (p50 ${D.rttPct(0.5) ?? '-'} / p95 ${D.rttPct(0.95) ?? '-'} over 10 s), jitter ${D.jitter()} ms, ping loss ${D.loss()}% (last 20 pings)`
  ];
  if (Net.role === 'guest') {
    const w = SeqLoss.loss(D.snapL, now), m = SeqLoss.loss(D.snapL, now, true);
    L.push(`Snapshot ${server ? 'skipped (the server sends only the newest)' : 'loss'}: ${ls(w, 'in the last 5 s')}; since the match started ${ls(m, 'snapshots')}`);
    L.push(`Snapshots received: ${sr == null ? 'not in a match' : sr + '/s (last 2 s)'}, target ${D.target()}/s   Render delay: ${Math.round(Net.rdelay || 0)} ms (changed ${D.rdChanges} times this match)   Position corrections over 3 ft: ${D.fixesPerMin()}/min`);
  } else L.push(`Snapshots sent: ${sr == null ? 'not in a match' : sr + '/s (last 2 s)'}, target ${D.target()}/s`);
  if (!server || D.fastL.n) { const w = SeqLoss.loss(D.fastL, now), m = SeqLoss.loss(D.fastL, now, true); L.push(`Direct-link message loss (from the other player): ${ls(w, 'in the last 5 s')}; overall ${ls(m, 'messages')}`); }
  L.push(`Data: ${bps ? `sent ${(bps.tx / 1000).toFixed(1)} KB/s, received ${(bps.rx / 1000).toFixed(1)} KB/s (last 5 s, game data)` : 'not measured yet'}`);
  L.push(`ICE servers: ${IceFetch.label()}`);
  L.push(`ICE candidates offered here: ${ct ? Object.entries(ct).map(([k, v]) => k + ' ' + v).join(', ') || 'none yet' : 'no direct link attempt yet'}`);
  L.push(`Selected candidate pair: ${pr ? pr.l + ' -> ' + pr.r + (pr.proto ? ' (' + pr.proto + ')' : '') : 'none (not on a direct or relay link)'}`);
  L.push(`Time to connect (lobby to first direct or relay packet): ${D.t1 ? ((D.t1 - D.t0) / 1000).toFixed(1) + ' s (' + D.connVia + ')' : 'not connected directly'}`);
  if (cs) L.push(`Connect steps (ms from lobby ready): ${cs.steps.map(([k, v]) => `${k} ${v == null ? '-' : v}`).join(', ')}; signalling writes sent ${cs.sigOut}, received ${cs.sigIn}`);
  L.push(`Direct-link attempts: ${Net.role === 'host' ? D.offers : D.answers}, failed: ${D.fails}, drops to the server path: ${D.drops}, network changes: ${D.netChanges}${D.recov ? ', recovery: ' + D.recov : ''}`);
  L.push(`Mode changes: ${D.switches.length ? D.switches.slice(-6).map(s => s.m).join(' > ') : 'none'}`);
  L.push(`Connection quality: you ${rn(D.rating)}, other player ${rn(other && other.nq && other.nq.r)}`);
  L.push(`Browser: ${d.browser}   Platform: ${d.platform}   Network type: ${d.conn}${mine ? '   Player says: ' + NET_TXT[mine] : ''}`);
  return L.join('\n');
};
// (candidate types in the report: from our description, or with trickle from the candidates we sent)
NetDiag.candTypes = function () {
  const n = {}, add = t => { if (t) n[t] = (n[t] || 0) + 1; };
  if (typeof P2P !== 'undefined' && P2P.lc && P2P.lc.length) { for (const c of P2P.lc) add((/ typ (host|srflx|prflx|relay)\b/.exec(c[0]) || [])[1]); return n; }
  const sdp = typeof P2P !== 'undefined' && P2P.pc && P2P.pc.localDescription && P2P.pc.localDescription.sdp; if (!sdp) return null;
  for (const m of sdp.matchAll(/ typ (host|srflx|prflx|relay)\b/g)) add(m[1]); return n;
};

// ---------------------------------------------------------------- the report screen: network type, copy
const NetReport = {
  on: false, where: '', sel: 0,
  open(where) { this.on = true; this.where = where; const m = NetDiag.myNet(); this.sel = Math.max(0, ['wifi', 'cell', 'unsure'].indexOf(m)); SFX.blip && SFX.blip(); },
  close() { this.on = false; },
  pick(k) { NetDiag.setMyNet(k); this.sel = ['wifi', 'cell', 'unsure'].indexOf(k); },
  copy() { NetDiag.copy(this.where === 'lobby' ? 'lobby' : 'pause'); this.copied = 2; },
  update() {
    if (!this.on) return false;
    if (menuHit('left')) this.sel = (this.sel + 2) % 3;
    if (menuHit('right')) this.sel = (this.sel + 1) % 3;
    if (menuHit('left') || menuHit('right')) this.pick(['wifi', 'cell', 'unsure'][this.sel]);
    if (menuHit('ok')) this.copy();
    if (menuHit('back')) this.close();
    return true;
  },
  draw(g) {
    if (!this.on) return;
    addRect(0, 0, W, H, () => {});                                         // taps behind the panel do nothing
    const pw = Math.min(W - 40, 860), x = W / 2 - pw / 2, y = 30, ph = H - 60;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,18,28,0.97)'; roundRect(g, x, y, pw, ph, 14); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 1.5; g.stroke();
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText('Network report', W / 2, y + 34);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('I’m on:', W / 2 - 230, y + 72);
    const mine = NetDiag.myNet();
    ['wifi', 'cell', 'unsure'].forEach((k, i) => uiButton(g, W / 2 - 180 + i * 140, y + 50, 130, 34, NET_TXT[k] + (mine === k ? ' ✓' : ''), () => this.pick(k), mine === k));
    g.textAlign = 'left'; g.font = `12px ${BODY}`; g.fillStyle = '#cfd8e3';
    const px = typeof phoneEffPx === 'function' ? phoneEffPx(g) : 12, lh = Math.round(px * 1.25), maxW = pw - 48;   // a preview; the copy has every line
    let ly = y + 108;
    out: for (const ln of NetDiag.report().split('\n').slice(1)) {
      let line = '';
      for (const w of ln.split(' ')) {
        const t = line ? line + ' ' + w : w;
        if (g.measureText(t).width > maxW && line) { if (ly > y + ph - 70) break out; g.fillText(line, x + 24, ly); ly += lh; line = w; } else line = t;
      }
      if (ly > y + ph - 70) break; g.fillText(line, x + 24, ly); ly += lh + 2;
    }
    uiButton(g, W / 2 - 210, y + ph - 50, 200, 38, this.copied > 0 ? 'Copied ✓' : 'Copy report', () => this.copy(), true);
    uiButton(g, W / 2 + 10, y + ph - 50, 200, 38, 'Close', () => this.close());
    g.textAlign = 'center'; g.font = `11px ${BODY}`; g.fillStyle = '#9fb3c8'; g.fillText('Stays on this device. Nothing is sent anywhere.', W / 2, y + ph - 58);
  }
};
{
  // the lobby button and the pause item open the screen
  const _dl = drawLobby;
  drawLobby = function (g) {
    const ui = uiButton; uiButton = function (g2, x, y, w, h, label, fn, pri) { if (label === 'Copy network report') { label = 'Network report'; fn = () => NetReport.open('lobby'); } return ui.call(this, g2, x, y, w, h, label, fn, pri); };
    try { _dl(g); } finally { uiButton = ui; }
  };
  const _pi = pauseItems;
  pauseItems = function () { return _pi.apply(this, arguments).map(it => it[0] === 'Copy network report' ? ['Network report', () => NetReport.open('pause')] : it); };
  const _r = render;
  render = function (g) { _r(g); if (NetReport.on) { if (!Net.role) NetReport.close(); else NetReport.draw(g); } if (NetReport.copied > 0) NetReport.copied -= 1 / 60; };
  const _lu = lobbyUpdate;
  lobbyUpdate = function (rdt) { if (NetReport.update()) { attractTick(rdt); return; } return _lu(rdt); };
  const _pn = pauseNav;
  pauseNav = function () { if (NetReport.update()) return; return _pn.apply(this, arguments); };
  const _gt = goTitle;
  goTitle = function () { NetReport.close(); return _gt.apply(this, arguments); };
}
