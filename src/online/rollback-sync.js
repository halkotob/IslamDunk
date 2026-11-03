// ================================================= v9.14: ROLLBACK NETCODE, PART 3: PUTTING A DESYNC RIGHT
// A desync shouldn't happen (rb-determinism and rb-rollback check that the same inputs give the same match, on every
// engine), but if one does, the match mustn't quietly become two different games. When the checksums of a confirmed
// frame differ, the host sends its whole state for its newest confirmed frame (rbstate, on the reliable link), and
// the guest rebuilds its match onto it and plays its frames since again. Both carry on from the same state.
//   On the wire the state is the host's saved frame (rbSave): every object, array, Set and Map with references as
//   indexes. The guest keeps its own M, ball, sprint gestures, crowd memory, players and their AI (the objects the
//   rest of the game holds), fills them with the host's values, and makes everything else new.
function rbAnchors() {                                                    // the objects both sides have, by role
  const A = { M, ball, Sprint }; if (typeof React8 !== 'undefined') A.React8 = React8;
  M.players.forEach((p, i) => { A['P' + i] = p; if (p.ai) A['A' + i] = p.ai; });
  (M.teams || []).forEach((t, i) => { A['T' + i] = t; });
  return A;
}
// the definitions both sides built the match from (the same start message): by name
function rbStatics() {                                                    // every definition object, named by its path
  const R = new Map();
  const name = (v, n) => { if (!v || typeof v !== 'object' || R.has(v) || v instanceof Hoop) return; R.set(v, n); for (const k of Object.keys(v)) { const d = Object.getOwnPropertyDescriptor(v, k); if (d && 'value' in d) name(d.value, n + '/' + k); } };
  name(M.teamDefs, 'TD');
  M.players.forEach((p, i) => { name(p.def, 'D' + i); name(p.T, 'T' + i); if (p.look && typeof p.look === 'object') name(p.look, 'L' + i); });
  (M.teams || []).forEach((t, i) => name(t.def, 'TT' + i));
  return R;
}
function rbSerialize(S) {
  const L = S.list, id = new Map(), ST = rbStatics(); for (let i = 0; i < L.length; i += 2) id.set(L[i], i >> 1);
  const enc = v => {
    if (v === undefined) return { u: 1 };
    if (typeof v === 'number') return Number.isFinite(v) ? (Object.is(v, -0) ? 0 : v) : { n: String(v) };
    if (v === null || typeof v !== 'object') return v;
    if (id.has(v)) return { r: id.get(v) };
    if (v instanceof Hoop) return { h: hoops.indexOf(v) };
    if (ST.has(v)) return { s: ST.get(v) };
    if (Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(x => x === null || typeof x !== 'object')) return { v: Object.assign({}, v) };   // (a position record: by value)
    return { x: 1 };
  };
  const nodes = [];
  for (let i = 0; i < L.length; i += 2) {
    const o = L[i], c = L[i + 1];
    if (Array.isArray(o)) nodes.push({ t: 'a', v: c.map(enc) });
    else if (o instanceof Set) nodes.push({ t: 's', v: c.map(enc) });
    else if (o instanceof Map) nodes.push({ t: 'm', v: c.map(([k, x]) => [enc(k), enc(x)]) });
    else { const v = {}; for (const k in c) v[k] = enc(c[k]); nodes.push({ t: 'o', c: o.constructor && o.constructor.name, v }); }
  }
  const anchors = {}, A = rbAnchors(); for (const k in A) if (id.has(A[k])) anchors[k] = id.get(A[k]);
  return { nodes, anchors, rims: S.rims };
}
function rbDeserialize(D) {
  const A = rbAnchors(), protos = new Map();
  for (const x of rbSave().list) if (x && typeof x === 'object' && x.constructor && !protos.has(x.constructor.name)) protos.set(x.constructor.name, Object.getPrototypeOf(x));
  const byIdx = new Map(); for (const k in D.anchors) if (A[k]) byIdx.set(D.anchors[k], A[k]);
  const ST = new Map(); for (const [o, name] of rbStatics()) ST.set(name, o);
  const objs = D.nodes.map((n, i) => byIdx.get(i) || (n.t === 'a' ? [] : n.t === 's' ? new Set() : n.t === 'm' ? new Map() : Object.create(protos.get(n.c) || Object.prototype)));
  const dec = (v, old) => {
    if (v === null || typeof v !== 'object') return v;
    if (v.u) return undefined; if (v.n) return Number(v.n);
    if (v.r != null) return objs[v.r];
    if (v.h != null) return hoops[v.h];
    if (v.s != null) return ST.get(v.s);
    if (v.v) return Object.assign({}, v.v);
    return old;                                                           // (something else outside the match: keep ours)
  };
  D.nodes.forEach((n, i) => {
    const o = objs[i];
    if (n.t === 'a') { o.length = 0; n.v.forEach(x => o.push(dec(x))); }
    else if (n.t === 's') { o.clear(); n.v.forEach(x => o.add(dec(x))); }
    else if (n.t === 'm') { o.clear(); n.v.forEach(([k, x]) => o.set(dec(k), dec(x))); }
    else {
      const old = {}; for (const k of Object.keys(o)) { old[k] = o[k]; if (!rbSkipKey(k)) delete o[k]; }
      for (const k in n.v) o[k] = dec(n.v[k], old[k]);
    }
  });
  hoops.forEach((h, i) => { h.dy = D.rims[i][0]; h.vy = D.rims[i][1]; });
}
// the host: its newest confirmed frame, to the guest
function rbSendState() {
  const k = Math.min(RBN.conf, RBN.f - 1);
  const S = k + 1 === RBN.f ? rbSave() : RBN.states.get(k + 1); if (!S) return false;
  Net.setP({ rbstate: { i: RBN.id, k: k + 1, d: rbSerialize(S), n: (RBN.syncs = (RBN.syncs || 0) + 1) } });
  RBN.stats.syncsSent = (RBN.stats.syncsSent || 0) + 1;
  return true;
}
// the guest: the host's state for the start of frame k; our frames since are played again
function rbApplyState(m) {
  const R = RBN;
  if (m.k > R.f) {                                                        // the host is ahead of us (this device fell behind): jump to it
    rbDeserialize(m.d);
    R.states.clear(); R.hashes.clear(); R.rollTo = Infinity; R.endF = null;
    R.f = m.k; R.lastSet = Math.max(R.lastSet, m.k - 1); R.conf = Math.max(R.conf, m.k - 1); while (R.ins[1 - R.me].has(R.conf + 1)) R.conf++;
    R.hashedTo = m.k - 1; R.desync = null; R.theirHash = null; R.stats.syncs = (R.stats.syncs || 0) + 1; R.stats.jumps = (R.stats.jumps || 0) + 1;
    return;
  }
  try {                                                                   // what differed (the network report: to find the cause)
    const mine = m.k === R.f ? rbSave() : R.states.get(m.k);
    if (mine) { const a = rbSerialLines(rbSerialize(mine)), b = new Set(rbSerialLines(m.d)), d = a.filter(x => !b.has(x)).slice(0, 6); if (d.length) R.desyncLog = { f: m.k, mine: d }; }
  } catch (e) {}
  rbDeserialize(m.d);
  R.states.clear(); R.hashes.clear(); R.rollTo = Infinity; R.endF = null;
  for (let k = m.k; k < R.f; k++) R.stepFrame(k, true);
  R.hashedTo = m.k - 1; R.desync = null; R.theirHash = null; R.stats.syncs = (R.stats.syncs || 0) + 1;
}
// a serialized frame as text lines (the same on both sides when they agree): node#, kind, key and value
function rbSerialLines(D) {
  const out = [], v = x => x === null || typeof x !== 'object' ? JSON.stringify(x) : x.r != null ? '#' + x.r : x.s ? 's:' + x.s : x.h != null ? 'hoop' + x.h : x.v ? JSON.stringify(x.v) : x.u ? 'undef' : '?';
  D.nodes.forEach((n, i) => { const p = '#' + i + (n.c ? '<' + n.c + '>' : '');
    if (n.t === 'o') { for (const k in n.v) out.push(p + '.' + k + '=' + v(n.v[k])); } else n.v.forEach((x, j) => out.push(p + '[' + j + ']=' + (Array.isArray(x) ? x.map(v).join(':') : v(x)))); });
  return out;
}
function rbOnDesync(f) {
  RBN.stats.desyncs = (RBN.stats.desyncs || 0) + 1;
  if (Net.role === 'host') RBN.needSync = true;                        // (sent after this update's going back: the saved frames are final then)
}
{
  const _nu = Net.update;
  Net.update = function (rdt) {
    const r = _nu.apply(this, arguments);
    if (RBN.on && this.role === 'guest') {
      const h = this.hostPeer(), m = h && h.presence && h.presence.rbstate;
      if (m && m.i === RBN.id && m.n !== RBN.lastSync) { RBN.lastSync = m.n; rbApplyState(m); }
    }
    return r;
  };
  // the host: a desync seen by the guest only is still put right (the guest's checksum differs from ours)
  const _rp = RBN.report;
  RBN.report = function () { const r = _rp.apply(this, arguments); if (r && this.stats) { r.desyncs = this.stats.desyncs || 0; r.syncs = this.stats.syncs || 0; r.syncsSent = this.stats.syncsSent || 0; } return r; };
}
// the network report (lobby and pause): how the rollback match is going
{
  const _rp = NetDiag.report;
  NetDiag.report = function () {
    const txt = _rp.apply(this, arguments), r = typeof RBN !== 'undefined' && RBN.on ? RBN.report() : null;
    const dl = RBN.on && RBN.desyncLog ? `\nLast desync (frame ${RBN.desyncLog.f}), this side had: ${RBN.desyncLog.mine.join('  ')}` : '';
    const line = r ? `Netcode: rollback   Sync code: ${rbSyncCode() || '-'}   Input delay: ${r.delay} frame(s)   Corrections: ${r.rollbacksPerSec}/s, ${r.avgRoll} frames on average (max ${r.maxRoll})   Waits: ${r.stalls}   Desyncs put right: ${r.syncs || r.syncsSent || 0}`
      : `Netcode: ${Net.mode && RBN.modes.has(Net.mode) ? 'snapshots (no direct link)' : 'snapshots'}`;
    if (r) { const f = r.forced ? `   Late inputs played as guessed: ${r.forced}` : ''; return txt.replace('\nICE servers:', '\n' + line + f + dl + '\nICE servers:'); }
    return txt.replace('\nICE servers:', '\n' + line + '\nICE servers:');
  };
}
// ---------------------------------------------------------------- the sync check
// Top right in a rollback match: the frame of the last second both sides have confirmed and a 4-letter code made from
// that frame's checksum. On a call, read it out: the same frame shows the same code on both phones when the two games
// are the same game. (A different code for more than a moment means a desync; the network report has the details.)
function rbSyncCode() {
  if (!RBN.on) return null;
  let best = null; for (const [f, h] of RBN.hashes) if (f % 60 === 0 && (!best || f > best[0])) best = [f, h];
  if (!best) return null;
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = [0, 5, 10, 15].map(sh => A[(best[1] >>> sh) % A.length]).join('');
  return Math.floor(best[0] / 60) + ' ' + c;
}
{
  const _r = render;
  render = function (g) {
    _r.apply(this, arguments);
    if (!RBN.on || Game.screen !== 'play') return;
    const code = rbSyncCode(); if (!code) return;
    g.save(); g.font = `11px ${BODY}`; g.textAlign = 'right'; g.fillStyle = RBN.desync ? 'rgba(255,140,120,0.85)' : 'rgba(255,255,255,0.55)';
    g.fillText('SYNC ' + code, W - 12, H - 10); g.restore();
  };
}
