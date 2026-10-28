// ================================================= v9.8: ONLINE LAG (play-test: "so much latency for the guest")
// Players on different networks rarely got the direct (peer-to-peer) link: it only tries STUN, which fails behind
// most mobile, carrier and strict NATs. Everything then went through the Firebase server, which queued every
// 30 Hz snapshot in order, so a slow moment added delay that never went away.
//   * On the server path, snapshots and inputs no longer queue: while one write is in flight only the newest
//     waits, older ones are dropped (a late snapshot is useless anyway).
//   * On the direct link, snapshots go at 60 Hz instead of 30.
//   * A relay (TURN) server can be added for players the direct link can't reach: set ONLINE_TURN below (or
//     window.ISLAMDUNK_TURN) to the team's own TURN server, e.g. from Cloudflare Calls. None is set by default.
//   * A guest's shot release that arrives with the press is no longer lost (v6-contact.js, net.js); the host
//     tries the direct link 6 times instead of 4.
const ONLINE_TURN = null;   // e.g. [{ urls: ['turn:turn.example.com:3478'], username: '…', credential: '…' }]
{
  const own = (typeof window !== 'undefined' && window.ISLAMDUNK_TURN) || ONLINE_TURN;
  if (own) P2P_ICE.iceServers.push(...[].concat(own));
}
{
  const FAST = new Set(['s', 'in', 'pg']);
  const _mk = makeFirebaseTransport;
  makeFirebaseTransport = function (cfg) {
    const T = _mk.apply(this, arguments), _pres = T.presence;
    let flying = false, pend = null;
    const send = flat => {
      flying = true;
      Promise.resolve(T.D.update(T.meRef, flat)).catch(() => {}).then(() => { flying = false; if (pend && T.meRef) { const p = pend; pend = null; send(p); } });
    };
    T.presence = function (patch) {
      const keys = Object.keys(patch || {});
      if (!keys.length || !T.meRef || !T.D || !keys.every(k => FAST.has(k))) return _pres.apply(this, arguments);
      if ((T.pres.code || T.pres.join || null) !== T.room) return _pres.apply(this, arguments);
      for (const k of keys) { if (patch[k] === null) delete T.pres[k]; else T.pres[k] = patch[k]; }
      const flat = {}; for (const k of keys) flat[k] = patch[k] === null ? null : JSON.stringify(patch[k]);
      if (flying) pend = Object.assign(pend || {}, flat); else send(flat);
      return Promise.resolve();
    };
    return T;
  };
  const _sd = Net.snapDue;
  Net.snapDue = function (rdt) {
    if (!(typeof P2P !== 'undefined' && P2P.open)) return _sd.apply(this, arguments);
    this.snapAcc = (this.snapAcc || 0) + rdt;
    if (this.snapAcc < 1 / 60) return false;
    this.snapAcc = Math.min(this.snapAcc - 1 / 60, 1 / 60); return true;
  };
}
