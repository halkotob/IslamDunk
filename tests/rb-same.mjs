// v9.17.1 online rollback: both phones play the same game (tests/run.mjs registers them):
//   rb-same    Same team vs CPU, Head to head and 1 on 1, each on a full and a half court: host and guest start a match
//              through the lobby on a test link, both press their own scripted buttons for 600 frames, and must hold
//              the same match: the same state at frame 0, the same checksum on every confirmed frame (compared every
//              60) and not one desync repaired (a repair would hide the bug). With Half court on, both play half court.
//   rb-taunt   host and guest with different equipped taunts; the guest's player gets a taunt window at frame 120 (and
//              every 2 s after until he uses one) and taunts: both phones show the guest's own taunt and stay the same game; an unknown or retired id sent
//              as the guest's taunt plays as 'sky'
//   rb-fun     a Fun mode (Big heads) unlocked and on at the host only: both phones play it, the same game
//   rb-one     1 on 1 (no CPU): one player a team on both phones, nobody else on the floor, M.one the same on both
//   rb-holdtap the host on Tap for Defend and Sprint, the guest on Hold: a whole match, the same game, no desync (v9.17.8)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MASH = seed => { let s = seed; const R = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; };
  const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyH', 'KeyL', 'ShiftLeft'];
  window.__mash = setInterval(() => { for (const k of keys) { const mv = /Key[WASD]/.test(k), on = !!Input.down[k]; if (on ? R() < (mv ? 0.04 : 0.3) : R() < (mv ? 0.03 : 0.02)) { if (on) { Input.down[k] = false; Input.released[k] = true; } else { Input.down[k] = true; Input.pressed[k] = true; } } } }, 16); };
// what each phone holds: the start state, the checksums of confirmed frames, desyncs repaired, the players on the floor
const READ = () => {
  clearInterval(window.__mash);
  const H = Object.assign({}, window.__H || {}); for (const [f, h] of RBN.hashes) if (f % 60 === 0) H[f] = h;
  return { on: RBN.on, me: RBN.me, f: RBN.f, conf: RBN.conf, desyncs: (RBN.stats && RBN.stats.desyncs) || 0, desync: RBN.desync ? RBN.desync.f : null,
    repairs: window.__repairs || 0, start: RBN.startLines || null, hashes: H, half: !!M.halfCourt, err: RB.errors || 0,
    players: M.players.map(p => (p.def && p.def.name) + ':' + p.team + ':' + p.human), one: M.one || null, cfgOne: RBN.cfg && RBN.cfg.one || null,
    taunts: window.__taunts || [], cfgTaunts: RBN.cfg && RBN.cfg.taunts || null };
};
// the start lines and the checksums both phones have, compared
function compare(h, g) {
  let startDiff = -1;
  if (!h.start || !g.start) startDiff = -2;
  else for (let i = 0; i < Math.max(h.start.length, g.start.length); i++) if (h.start[i] !== g.start[i]) { startDiff = i; break; }
  const common = Object.keys(h.hashes).filter(f => f in g.hashes), bad = common.filter(f => h.hashes[f] !== g.hashes[f]);
  return { startDiff, startLine: startDiff >= 0 ? [h.start[startDiff], g.start[startDiff]] : null, compared: common.length, badHashes: bad.length, firstBad: bad[0] == null ? null : +bad[0] };
}
export function rbSameTests({ newContext, open }) {
  const T = {};
  // two tabs in one lobby on a test link (with ?rbdebug=1: every confirmed frame is checksummed), then the match
  async function pair(browser, base, room, setup, init) {
    const errs = [], ctx = await newContext(browser, { rb: true }), q = `?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=${room}&nowelcome=1&rbdebug=1`;
    const H = await open(ctx, base + '/' + q, errs, 'host'), G = await open(ctx, base + '/' + q, errs, 'guest');
    const count = () => {
      const _a = rbApplyState; rbApplyState = function () { window.__repairs = (window.__repairs || 0) + 1; return _a.apply(this, arguments); };
      window.__H = {}; setInterval(() => { if (RBN.on) for (const [f, h] of RBN.hashes) if (f % 60 === 0 && !(f in window.__H)) window.__H[f] = h; }, 100);   // (RBN keeps only the last few)
    };
    await H.evaluate(count); await G.evaluate(count);
    if (init) { await H.evaluate(init, 'host'); await G.evaluate(init, 'guest'); }
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
    await H.evaluate(S => { const o = Lobby.opts(); Object.assign(o, S); Net.mode = S.game; if (S.game === 'one') { Object.assign(o, { ctrl: 1, ctrlB: 0 }); Object.assign(Net.sel, { ctrl: 1, ctrlB: 0 }); } Lobby.changed(); }, setup);
    await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
    await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    return { ctx, H, G, errs };
  }
  // play until both have confirmed `frames` frames (and the checksums have crossed), then read both
  async function play(H, G, frames, seeds) {
    await H.evaluate(MASH, seeds[0]); await G.evaluate(MASH, seeds[1]);
    await Promise.all([H, G].map(p => p.waitForFunction(n => RBN.conf >= n, frames + 60, { timeout: 60000 }).catch(() => {})));
    await sleep(1500);
    return Promise.all([H, G].map(p => p.evaluate(READ)));
  }
  T['rb-same'] = async ({ browser, base }) => {
    const rows = [], errs = [];
    for (const game of ['co', 'vs', 'one']) for (const court of ['full', 'half']) {
      const P = await pair(browser, base, `same${game}${court}`, { game, court, format: 'quarters', len: 120 });
      const [h, g] = await play(P.H, P.G, 600, [101 + rows.length, 203 + rows.length]);
      await P.ctx.close(); errs.push(...P.errs);
      const c = compare(h, g);
      rows.push({ game, court, started: h.on && g.on && g.me === 1, frames: Math.min(h.conf, g.conf), half: [h.half, g.half], players: [h.players.length, g.players.length],
        desyncs: [h.desyncs, g.desyncs], repairs: g.repairs, ...c, err: h.err + g.err });
    }
    const ok = rows.every(r => r.started && r.frames >= 600 && r.startDiff === -1 && r.badHashes === 0 && r.compared >= 9 && r.desyncs[0] + r.desyncs[1] === 0 && r.repairs === 0
      && r.half[0] === (r.court === 'half') && r.half[1] === (r.court === 'half') && r.err === 0) && !errs.length;
    return { ok, detail: [...rows.map(r => JSON.stringify(r)), ...errs] };
  };
  // the taunt: both phones log every taunt the match plays (the frame, who, which); at frame 120 the guest's player
  // gets a taunt window (in the match, so on both phones on the same frame) and the guest presses MOVE until it's used
  const TAUNT_INIT = (who, ids) => {
    myTaunt = () => (who === 'host' ? ids[0] : ids[1]);                  // this device's equipped taunt
    window.__taunts = [];
    const _d = doTaunt; doTaunt = function (p) { const r = _d.apply(this, arguments); if (p.taunt && RB.frame != null) { const L = window.__taunts, e = { f: RB.frame, pad: p.human, k: p.taunt.k }; const i = L.findIndex(x => x.f === e.f && x.pad === e.pad); if (i >= 0) L[i] = e; else L.push(e); } return r; };
    // (from frame 120, every 2 s until one is used: the window is wasted while he has the ball)
    const _s = rbStep; rbStep = function () { const f = RB.frame; if (f >= 120 && f % 120 === 0 && !(M.taunt && M.taunt.used && M.taunt.p && M.taunt.p.human === 1)) { const p = M.players.find(q => q.human === 1); if (p) { if (ball.owner === p) giveBall(M.players.find(q => q.team !== p.team), 'test'); tauntOpen(p, 'score'); M.taunt.until = M.time + 2; } } return _s.apply(this, arguments); };   // (he can't taunt with the ball: it goes to the other team, in the match on both phones)
  };
  async function tauntRun(browser, base, room, ids) {
    const P = await pair(browser, base, room, { game: 'vs', court: 'full', format: 'quarters', len: 120 }, new Function('who', `(${TAUNT_INIT})(who, ${JSON.stringify(ids)})`));
    await P.G.evaluate(() => { window.__tx = setInterval(() => { if (RBN.f > 125 && !(window.__taunts || []).some(e => e.pad === 1)) { const on = !!Input.down.KeyH; Input.down.KeyH = !on; if (on) Input.released.KeyH = true; else Input.pressed.KeyH = true; } else Input.down.KeyH = false; }, 50); });
    await Promise.all([P.H, P.G].map(p => p.waitForFunction(() => RBN.conf >= 600, null, { timeout: 60000 }).catch(() => {})));
    await sleep(1500);
    const [h, g] = await Promise.all([P.H, P.G].map(p => p.evaluate(() => { clearInterval(window.__tx); return { taunts: window.__taunts, cfg: RBN.cfg.taunts || null, desyncs: (RBN.stats && RBN.stats.desyncs) || 0, repairs: window.__repairs || 0, hashes: Object.assign({}, window.__H || {}, Object.fromEntries([...RBN.hashes].filter(([f]) => f % 60 === 0))) }; })));
    await P.ctx.close();
    const common = Object.keys(h.hashes).filter(f => f in g.hashes);
    return { host: h.taunts, guest: g.taunts, cfg: [h.cfg, g.cfg], desyncs: [h.desyncs, g.desyncs], repairs: g.repairs, badHashes: common.filter(f => h.hashes[f] !== g.hashes[f]).length, compared: common.length, errs: P.errs };
  }
  T['rb-taunt'] = async ({ browser, base }) => {
    const a = await tauntRun(browser, base, 'rbtaunt1', ['flex', 'chest']);
    const b = await tauntRun(browser, base, 'rbtaunt2', ['flex', 'not-a-taunt']);
    const c = await tauntRun(browser, base, 'rbtaunt3', ['flex', 'brush']);       // (retired in 9.16.1)
    const g1 = x => (x.find(e => e.pad === 1) || {}).k;
    const okRun = (r, want) => g1(r.host) === want && g1(r.guest) === want && r.desyncs[0] + r.desyncs[1] === 0 && r.repairs === 0 && r.badHashes === 0 && r.compared >= 9 && !r.errs.length;
    const ok = okRun(a, 'chest') && okRun(b, 'sky') && okRun(c, 'sky');
    return { ok, detail: [`different taunts: ${JSON.stringify(a)}`, `unknown id: ${JSON.stringify(b)}`, `retired id: ${JSON.stringify(c)}`] };
  };
  // Fun modes: Big heads unlocked and on at the host only (the guest hasn't unlocked it): both phones play big heads
  T['rb-fun'] = async ({ browser, base }) => {
    const P = await pair(browser, base, 'rbfun', { game: 'vs', court: 'full', format: 'quarters', len: 120, fun: { bigHead: true, uncle: false, lowGrav: false } },
      who => { if (who === 'host') Unlocks.bigHead = true; else delete Unlocks.bigHead; });
    const [h, g] = await play(P.H, P.G, 300, [13, 17]);
    const fun = await Promise.all([P.H, P.G].map(p => p.evaluate(() => JSON.stringify(M.fun))));
    await P.ctx.close();
    const ok = fun[0] === fun[1] && /bigHead/.test(fun[0]) && h.desyncs + g.desyncs === 0 && g.repairs === 0 && compare(h, g).startDiff === -1 && !P.errs.length;
    return { ok, detail: [JSON.stringify({ fun, desyncs: [h.desyncs, g.desyncs], repairs: g.repairs, start: compare(h, g).startLine }), ...P.errs] };
  };
  T['rb-one'] = async ({ browser, base }) => {
    const P = await pair(browser, base, 'rbone', { game: 'one', court: 'full', format: 'quarters', len: 120 });
    const [h, g] = await play(P.H, P.G, 300, [7, 9]);
    await P.ctx.close();
    const ok = h.players.length === 2 && g.players.length === 2 && h.players.join() === g.players.join() && h.players.every(s => !s.endsWith(':-1'))
      && JSON.stringify(h.one) === JSON.stringify(g.one) && h.one && h.one.join() === '1,0' && h.desyncs + g.desyncs === 0 && g.repairs === 0 && !P.errs.length;
    return { ok, detail: [JSON.stringify({ host: { players: h.players, one: h.one, desyncs: h.desyncs }, guest: { players: g.players, one: g.one, desyncs: g.desyncs, repairs: g.repairs } }), ...P.errs] };
  };
  // v9.17.8 (IN2): the host plays with Defend and Sprint on Tap, the guest on Hold: a whole match (2 halves of 30 s),
  // the same game on both phones, not one desync repaired, and the host's toggles were on for part of it
  T['rb-holdtap'] = async ({ browser, base }) => {
    const init = role => { if (role === 'host') { SETTINGS.defToggle = true; SETTINGS.sprToggle = true; window.__lat = 0; setInterval(() => { if (Latch[0].def || Latch[0].spr) window.__lat++; }, 50); } };
    const P = await pair(browser, base, 'rbhold', { game: 'vs', court: 'full', format: 'halves', len: 30 }, init);
    await P.H.evaluate(MASH, 11); await P.G.evaluate(MASH, 12);
    await Promise.all([P.H, P.G].map(p => p.waitForFunction(() => M.phase === 'over' || (RBN.f > 60 * 200), null, { timeout: 240000 }).catch(() => {})));
    await sleep(1500);
    const [h, g] = await Promise.all([P.H, P.G].map(p => p.evaluate(READ)));
    const ex = await Promise.all([P.H, P.G].map(p => p.evaluate(() => ({ over: M.phase === 'over', score: M.teams.map(t => t.score).join('-'), code: typeof rbSyncCode === 'function' ? rbSyncCode() : '', lat: window.__lat || 0, tog: [SETTINGS.defToggle, SETTINGS.sprToggle].join() }))));
    await P.ctx.close();
    const c = compare(h, g);
    const ok = ex.every(x => x.over) && ex[0].score === ex[1].score && ex[0].code === ex[1].code && ex[0].lat > 20 && ex[0].tog === 'true,true' && ex[1].tog === 'false,false'
      && c.startDiff === -1 && c.badHashes === 0 && c.compared > 10 && h.desyncs + g.desyncs === 0 && g.repairs === 0 && !P.errs.length;
    return { ok, detail: [JSON.stringify({ host: ex[0], guest: ex[1], compare: c, desyncs: [h.desyncs, g.desyncs], repairs: g.repairs }), ...P.errs] };
  };
  return T;
}
