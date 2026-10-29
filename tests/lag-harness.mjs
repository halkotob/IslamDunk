// v9.10 lag harness: an online 2v2 between two tabs over the loopback transport with a network conditioner
// (src/online/one-on-one-loopback.js: mode, lat, jit, loss, bw), the direct link off so every message takes the
// conditioned path. For each profile it measures, on the guest's screen:
//   input to visible: movement start (his player moves), jump (leaves the floor), shot release (the ball leaves his
//   hands after he lets go), pass (the ball is in the air after he presses pass); 6 tries each, the median
//   snapshot staleness: how old the host's state on screen is (network + render delay), median and 95th percentile
//   bytes per snapshot on the wire (the s key)
// Used by tests/run.mjs (lag-profiles) and tools/lag-report.mjs (the table).
export const LAG_PROFILES = [
  ['Direct, 30 ms RTT', { mode: 'udp', lat: 15, jit: 0, loss: 0, bw: 0, direct: 1 }],
  ['Relay, 90 ms RTT, 20 ms jitter', { mode: 'udp', lat: 45, jit: 20, loss: 0, bw: 0, direct: 1 }],
  ['Server, 250 ms RTT, 40 ms jitter, 3% loss', { mode: 'server', lat: 125, jit: 40, loss: 3, bw: 64000, direct: 0 }],
  ['Bad mobile, 400 ms RTT, 10% loss', { mode: 'udp', lat: 200, jit: 30, loss: 10, bw: 32000, direct: 1 }]
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };

// guest side: scripted controller input and a frame-by-frame watch
const GUEST_INIT = () => {
  Replay.schedule = () => {};
  // v9.11: presses go in as keys (the way a player's do), so everything that reads the controller sees them,
  // including the guest's own prediction of its shots and passes
  const L = window.__lag = { stale: [] };
  const K = k => BINDS[0][k][0], down = (k, on) => { Input.down[K(k)] = on; if (on) Input.pressed[K(k)] = true; else Input.released[K(k)] = true; };
  const clear = () => { for (const k of ['right', 'b', 'a']) Input.down[K(k)] = false; };
  const me = () => M.players && M.players.find(q => q.human === 1);
  const watch = () => {
    const n = Net.snaps && Net.snaps[Net.snaps.length - 1];
    if (n && n.s && n.s.__t && Game.screen === 'netplay') L.stale.push(Date.now() - (performance.now() - n.t) - n.s.__t + (Net.rdelay || 0));   // the newest snapshot's trip + the render delay
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  // one try: press, then wait for the effect on screen (ms), or 3000 if it never shows
  L.trial = kind => new Promise(res => {
    const p = me(); if (!p) return res(3000);
    const x0 = p.x, t0 = Date.now();
    if (kind === 'move') down('right', true);
    else if (kind === 'jump') down('b', true);
    else if (kind === 'pass') { Input.pressed[K('a')] = true; Input.down[K('a')] = false; }   // a tap
    else if (kind === 'shot') down('b', false);
    const seen = () => { const q = me(); if (!q) return false;
      if (kind === 'move') return Math.abs(q.x - x0) > 4;
      if (kind === 'jump') return q.y > 3;
      if (kind === 'pass') return ball.state === 'pass';
      if (kind === 'shot') return ball.state === 'shot'; };
    const tick = () => { if (seen()) { clear(); res(Date.now() - t0); return; } if (Date.now() - t0 > 3000) { clear(); res(3000); return; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  L.hold = () => down('b', true);
};
// host side: the CPU stands still; each try starts from a set position
const HOST_INIT = () => {
  Replay.schedule = () => {};   // instant replays pause play
  const _sn = Net.snapshot; Net.snapshot = function () { const s = _sn.apply(this, arguments); s.__t = Date.now(); return s; };
  const T = Net.room; if (T.stats) { T.stats.byKey = {}; T.stats.nByKey = {}; }
  window.__lagSetup = kind => {
    const g = M.players.find(q => q.human === 1), o = g.opps[0];
    M.cmdHook = q => { if (q.human === 1) return false; zeroCmd(q.cmd); return true; };
    M.phase = 'live'; M.clock = 999; M.shotClock = 99; ball.shot = null; ball.pass = null; M.inb = null; M.sideOut = null; M.ft = null;
    M.nextInbound = null; M.deadT = 0; M.check = null; M.frontIn = null; M.pendingEnd = false; Game.trivia = null; Net.pendRel = null; Net.gIntent = null;   // v9.11: no inbound left over from the last try's basket
    for (const q of M.players) { q.state = 'free'; q.vx = q.vz = 0; q.move = null; q.act = null; q.pick = null; q.hifz = 0; q.buf = null; q.y = 0; }
    const h = attackHoop(g.team);
    place(g, h.x + h.dir * 360, 330); place(g.mate, h.x + h.dir * 380, 560);
    place(o, h.x + h.dir * 600, 200); place(o.mate, h.x + h.dir * 620, 600);
    if (kind === 'move' || kind === 'jump') { M.possTeam = o.team; giveBall(o, 'steal'); }
    else { M.possTeam = g.team; giveBall(g, 'steal'); }
    M.shotClock = 99;
  };
};

export async function lagRun(browser, base, name, prof, opts = {}) {
  const q = `?net=loop&p2p=0&room=lag${Math.random().toString(36).slice(2, 7)}&mode=${prof.mode}&lat=${prof.lat}&jit=${prof.jit}&loss=${prof.loss}&bw=${prof.bw}`;
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  const errs = [], open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto(base + '/' + q); await p.waitForFunction(() => typeof Net !== 'undefined' && Net.avail === 'yes', null, { timeout: 20000 }); return p; };
  const H = await open(), G = await open();
  const out = { name, errs };
  try {
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 20000 });
    if (prof.direct) for (const P of [H, G]) await P.evaluate(() => { if (typeof P2P !== 'undefined') P2P.open = true; });   // the direct link's rate (60 Hz), on the conditioned path
    await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Net.mode = 'vs'; Lobby.changed(); });
    await G.evaluate(() => Lobby.setReady(1)); await sleep(prof.lat * 4 + 800);
    await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => Game.screen === 'netplay' && M.players && M.players.length > 2, null, { timeout: 20000 });
    await H.evaluate(HOST_INIT); await G.evaluate(GUEST_INIT);
    if (opts.hostEval) await H.evaluate(opts.hostEval);
    await sleep(2500);
    const res = {};
    for (const kind of ['move', 'jump', 'shot', 'pass']) {
      const t = [];
      for (let i = 0; i < (opts.tries || 6); i++) {
        await H.evaluate(k => window.__lagSetup(k === 'shot' ? 'pass' : k), kind);
        await sleep(prof.lat * 4 + 500);                                       // the guest sees the set position
        if (kind === 'shot') { await G.evaluate(() => window.__lag.hold()); await G.waitForFunction(() => { const q = M.players.find(x => x.human === 1); return q && q.state === 'shoot'; }, null, { timeout: 4000 }).catch(() => {}); await sleep(60); }   // in the shooting motion on his screen
        t.push(await G.evaluate(k => window.__lag.trial(k), kind));
        await sleep(prof.lat * 4 + 400);                                       // v9.11: the guest sees its own action at once now; let the host's copy play out before the next try
      }
      res[kind] = med(t); res[kind + 'All'] = t;
    }
    const st = await G.evaluate(() => window.__lag.stale.filter(x => x > 0 && x < 5000));
    res.staleMed = Math.round(med(st)); res.staleP95 = Math.round(pct(st, 0.95));
    const b = await H.evaluate(() => { const S = Net.room.stats || {}; return { bytes: (S.byKey || {}).s || 0, n: (S.nByKey || {}).s || 0, kb: (S.byKey || {}).sk || 0 }; });
    res.snapBytes = b.n ? Math.round((b.bytes + b.kb) / b.n) : 0; res.snapsSent = b.n; res.keyframeBytes = b.n ? Math.round(b.kb / b.n) : 0;   // v9.10: keyframes (server path) count too
    const gd = await G.evaluate(() => typeof NetDiag === 'undefined' ? {} : { unresolved: NetDiag.unresolved, fixes: NetDiag.fixesPerMin() });
    Object.assign(res, gd);
    Object.assign(out, res);
  } catch (e) { out.error = String(e && e.message || e); }
  await ctx.close();
  return out;
}
export function lagTable(rows) {
  const L = ['| Profile | Move | Jump | Shot release | Pass | Staleness (median / p95) |', '|---|---|---|---|---|---|'];
  for (const r of rows) L.push(`| ${r.name} | ${r.move} ms | ${r.jump} ms | ${r.shot} ms | ${r.pass} ms | ${r.staleMed} / ${r.staleP95} ms |`);
  return L.join('\n');
}
