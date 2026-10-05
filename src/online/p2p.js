// ================================================= v7.6: PEER-TO-PEER FAST LANE (WebRTC)
// Firebase relays every message through Google's servers. Once both players are in a lobby, the
// host opens a direct WebRTC data channel to the guest, signalled through the existing presence
// (key `rtc`, same Firebase node, so no new database paths). The fast keys (s = snapshots,
// in = input, pg = ping) then travel peer to peer on an unordered, no-retransmit channel (a late
// snapshot is useless; inputs are counters, so a lost one is fixed by the next). Everything else
// stays on the base transport. If the direct link can't be made (strict NAT, no WebRTC) or drops,
// play simply continues over the base transport, and the host retries a few times.
const P2P_FAST = new Set(['s', 'in', 'pg']);
const P2P_ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
const P2P = {
  base: null, pc: null, dc: null, open: false, remote: null, id: 0, answeredId: 0, fast: {}, seqIn: {}, seqOut: 0, mine: {},
  tries: 0, nextTry: 0, state: 'off', stats: { tx: 0, rx: 0 },
  ok() { if (this._ok == null) { let off = false; try { off = new URLSearchParams(location.search).get('p2p') === '0'; } catch (e) {} this._ok = typeof RTCPeerConnection !== 'undefined' && !off; } return this._ok; },
  wrap(base) {
    this.base = base;
    const H = { kind: base.kind, p2p: true, ready: base.ready };
    H.presence = patch => {
      if (!this.open) return base.presence(patch);
      const fast = {}, slow = {}; let nf = 0, ns = 0;
      for (const k in patch) { if (P2P_FAST.has(k)) { fast[k] = patch[k]; nf++; } else { slow[k] = patch[k]; ns++; } }
      if (nf) {
        Object.assign(this.mine, fast); this.send(fast);
        if (nowMs() - (this.baseAt || 0) > 500) { this.baseAt = nowMs(); Object.assign(slow, fast); ns++; }   // keep the server copy fresh (2 Hz) for a seamless fallback
      }
      return ns ? base.presence(slow) : Promise.resolve();
    };
    H.peers = () => base.peers().map(p => {
      const f = p.sameTab ? (this.open ? this.mine : null) : (this.open && p.peer === this.remote ? this.fast : null);
      return f ? Object.assign({}, p, { presence: Object.assign({}, p.presence, f) }) : p;
    });
    H.onPeers = (f, e) => base.onPeers(f, e);
    if (base.drop) { H.drop = () => { this.close('drop'); base.drop(); }; H.restore = () => base.restore(); }
    H.stats = base.stats;
    return H;
  },
  send(obj) {
    const dc = this.dc; if (!dc || dc.readyState !== 'open') return;
    try { const m = JSON.stringify({ q: ++this.seqOut, f: obj }); dc.send(m); this.stats.tx += m.length; } catch (e) { this.close('send'); }
  },
  recv(data) {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || !m.f) return;
    this.stats.rx += data.length;
    for (const k in m.f) { if ((this.seqIn[k] || 0) < m.q) { this.seqIn[k] = m.q; this.fast[k] = m.f[k]; } }   // newest wins per key
    Net.onPeers();
  },
  close(why) {
    const was = this.open;
    try { this.dc && this.dc.close(); } catch (e) {} try { this.pc && this.pc.close(); } catch (e) {}
    this.pc = this.dc = null; this.open = false; this.fast = {}; this.seqIn = {}; this.mine = {}; this.remote = null;
    this.state = 'off'; this.nextTry = nowMs() + (was ? 3000 : 8000);
    if (this.base && Net.role) this.base.presence({ rtc: null }).catch(() => {});
  },
  // wait for ICE gathering (complete SDP, no trickle), at most ~2.5 s
  gather(pc) {
    return new Promise(res => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, 2500);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  },
  wireDc(dc) {
    this.dc = dc;
    dc.onopen = () => { this.open = true; this.state = 'open'; this.tries = 0; Net.onPeers(); };
    dc.onmessage = e => this.recv(e.data);
    dc.onclose = () => { if (this.dc === dc) this.close('dc-close'); };
    dc.onerror = () => { if (this.dc === dc) this.close('dc-error'); };
  },
  newPc() {
    const pc = new RTCPeerConnection(P2P_ICE);
    pc.onconnectionstatechange = () => { if (pc === this.pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) this.close('pc-' + pc.connectionState); };
    return pc;
  },
  async offer(guest) {
    this.state = 'offering'; this.tries++; this.remote = guest; this.id = Date.now() % 1e9;
    const pc = this.pc = this.newPc(), id = this.id;
    this.wireDc(pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }));
    await pc.setLocalDescription(await pc.createOffer()); await this.gather(pc);
    if (this.pc !== pc) return;
    this.base.presence({ rtc: { t: 'o', to: guest, id, sdp: pc.localDescription.sdp } }).catch(() => {});
    setTimeout(() => { if (this.pc === pc && !this.open) this.close('timeout'); }, 12000);
  },
  async answer(host, o) {
    this.state = 'answering'; this.remote = host; this.answeredId = o.id;
    if (this.pc) { try { this.pc.close(); } catch (e) {} }
    const pc = this.pc = this.newPc();
    pc.ondatachannel = e => this.wireDc(e.channel);
    await pc.setRemoteDescription({ type: 'offer', sdp: o.sdp });
    await pc.setLocalDescription(await pc.createAnswer()); await this.gather(pc);
    if (this.pc !== pc) return;
    this.base.presence({ rtc: { t: 'a', id: o.id, sdp: pc.localDescription.sdp } }).catch(() => {});
  },
  tick() {
    if (!this.base || !this.ok()) return;
    if (!Net.role) { if (this.pc) this.close('left'); return; }
    if (Net.role === 'host') {
      const gp = Net.guestPeer;
      if (!gp) { if (this.pc) this.close('guest-gone'); return; }
      if (this.remote && this.remote !== gp) this.close('new-guest');
      const g = Net.peers().find(p => p.peer === gp), pres = g && g.presence;
      if (!this.pc && pres && pres.p2p && this.tries < 4 && nowMs() > this.nextTry) this.offer(gp).catch(() => this.close('offer-fail'));
      const a = pres && pres.rtc;
      if (this.pc && a && a.t === 'a' && a.id === this.id && !this.pc.remoteDescription) this.pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }).catch(() => this.close('answer-fail'));
    } else {
      const h = Net.hostPeer(), o = h && h.presence && h.presence.rtc, me = Net.myPeer();
      if (!h) { if (this.pc) this.close('host-gone'); return; }
      if (o && o.t === 'o' && o.to === me && o.id !== this.answeredId) this.answer(h.peer, o).catch(() => this.close('answer-fail'));
    }
  }
};
{
  const _init = Net.init;
  Net.init = async function () {
    await _init.apply(this, arguments);
    if (this.room && P2P.ok()) { this.room = P2P.wrap(this.room); try { this.room.presence({ p2p: 1 }); } catch (e) {} }
  };
  const _nu = Net.update;
  Net.update = function (rdt) { _nu.call(this, rdt); try { P2P.tick(); } catch (e) {} };
  const _lv = Net.leave;
  Net.leave = function () { if (P2P.pc) P2P.close('leave'); P2P.tries = 0; return _lv.apply(this, arguments); };
  // re-advertise the capability whenever a role is set (role changes rewrite presence)
  const _sp = Net.setP;
  Net.setP = function (patch) { if (patch && patch.role && P2P.ok()) patch = Object.assign({ p2p: 1 }, patch); return _sp.call(this, patch); };
  // lobby: show how we're connected
  const _dl = drawLobby;
  drawLobby = function (g) {
    _dl(g);
    const here = Net.role === 'host' ? !!Net.guestPeer : !!Net.hostPeer(); if (!here) return;
    g.textAlign = 'left'; g.font = `12px ${BODY}`;
    g.fillStyle = P2P.open ? '#9dffb0' : '#9fb3c8';
    g.fillText(P2P.open ? 'Direct connection (peer to peer)' : P2P.state === 'off' ? 'Connected through the server' : 'Setting up a direct connection…', 48, 412);
  };
}

