// v9.14 rollback netcode tests (tests/run.mjs registers them):
//   rb-determinism   the same inputs give the same match, frame for frame (the checksum of everything the match owns):
//                    two pages, one of them disturbed (a wider screen, drawn every frame, other settings on this
//                    device, touch mode, keys held, extra random numbers between frames); and Chrome's engine (V8)
//                    against Safari's (JavaScriptCore, through bun, when bun is installed)
//   rb-rollback      going back is exact: over 2 minutes, every 30 frames, 8 frames played with player 2's input guessed
//                    wrong (and drawn), then restored and replayed with the right input, give the same checksums as a
//                    straight run, and no frame throws; and what a
//                    frame costs (a step, a save, a restore, a checksum) on this machine and on a 4x slower CPU
//   rb-online        a Head to head match through the lobby, host and guest each pressing their own random buttons
//                    for 20 s on a 40 ms (+-10) link losing 2% of messages: both sides play it with rollback, every
//                    exchanged checksum matches (not one desync), corrections stay within the window
//   rb-flow          a short match (2 halves of 8 s) to the final whistle on both sides with the same score, then both
//                    back in the lobby; a rematch starts a new rollback match; the host leaving sends the guest back
//   rb-lag           the lag harness's five connections (tests/lag-harness.mjs), with rollback: how long from a press
//                    to your own player moving (host and guest), and to your friend's player moving on your screen;
//                    corrections a second and how deep, waits, bytes a second, and no desync (rbLagTable: the table)
//   rb-settings      host and guest with different settings on their own devices (ball magnet, dribble, Casual,
//                    difficulty, sound, touch): the match uses the host's, so no desync in 15 s of play
//   rb-touch         both players on touch (the stick, past its ring to sprint, and the SHOOT / PASS / MOVE / DEFEND
//                    buttons) for 15 s: no desync, and a touch player can sprint
//   rb-slow          the guest's CPU 4x slower: the host's match keeps its pace (no freezing, no slow motion), the
//                    guest keeps up, no desync left at the end
//   rb-freeze        the guest's game stops for 2 s (an app in the background): the host's match keeps going
//                    (nobody waits), and when the guest is back both are on the same frame and the same game again
//   rb-resync        a desync made on purpose (the guest's state nudged) is seen at the next checksum, the host sends
//                    its state, the guest rebuilds onto it, and the checksums match again from then on
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LAG_PROFILES } from './lag-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SESSION = fs.readFileSync(path.join(ROOT, 'tests/rollback-session.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const firstDiff = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return i; return a.length === b.length ? -1 : Math.min(a.length, b.length); };

export function rollbackTests({ newContext, open }) {
  const T = {};
  T['rb-determinism'] = async ({ browser, base }) => {
    const frames = 3600, errs = [];
    const page = async (w, tag) => {
      const ctx = await newContext(browser, { seed: true, device: { viewport: { width: w, height: 720 } } }), p = await open(ctx, base + '/?nowelcome=1', errs, tag);
      await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
      return { ctx, p };
    };
    const run = (p, noisy, dump) => p.evaluate(([S, P]) => { window.__P = P; return (0, eval)(S); }, [SESSION, { frames, noisy, dump }]);
    const A = await page(1280, 'rb-a'), B = await page(1700, 'rb-b');
    const [a, b] = await Promise.all([run(A.p, false), run(B.p, true)]);
    const out = { frames: a.sums.length, score: a.score, pages: firstDiff(a.sums, b.sums), stepErrors: (await Promise.all([A.p, B.p].map(p => p.evaluate(() => RB.errors || 0)))).join(',') };
    if (out.pages >= 0) {                                                // what differs, for the report
      const [da, db] = await Promise.all([run(A.p, false, out.pages), run(B.p, true, out.pages)]), sb = new Set(db.dump), sa = new Set(da.dump);
      out.onlyA = da.dump.filter(x => !sb.has(x)).slice(0, 8); out.onlyB = db.dump.filter(x => !sa.has(x)).slice(0, 8);
    }
    // Safari's engine
    let bun = null; try { bun = execFileSync('bun', ['--version']).toString().trim(); } catch (e) {}
    if (bun) {
      const j = JSON.parse(execFileSync('bun', [path.join(ROOT, 'tests/rollback-jsc.mjs'), path.join(ROOT, 'dist/web/index.html'), String(frames)], { maxBuffer: 1 << 28 }).toString().trim().split('\n').pop());
      out.jsc = firstDiff(a.sums, j.sums); out.jscScore = j.score;
    } else out.jsc = 'skipped (bun not installed)';
    await A.ctx.close(); await B.ctx.close();
    const ok = out.frames === frames && out.pages === -1 && (out.jsc === -1 || !bun) && a.score[0] + a.score[1] > 0 && out.stepErrors === '0,0' && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['rb-rollback'] = async ({ browser, base }) => {
    const frames = 7200, errs = [];
    const ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'rb-rb');
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
    const run = (P) => p.evaluate(([S, P]) => { window.__P = P; return (0, eval)(S); }, [SESSION, P]);
    const a = await run({ frames }), b = await run({ frames, rollback: true, noisy: true });   // (drawn between frames, like a real match)
    const out = { frames: a.sums.length, score: a.score, first: firstDiff(a.sums, b.sums), stepErrors: await p.evaluate(() => [RB.errors || 0, RB.lastErr || '']) };
    if (out.first >= 0) {
      const da = await run({ frames, dump: out.first }), db = await run({ frames, rollback: true, noisy: true, dump: out.first });
      const sa = new Set(da.dump || []), sb = new Set(db.dump || []); out.straight = (da.dump || []).filter(x => !sb.has(x)).slice(0, 10); out.rolled = (db.dump || []).filter(x => !sa.has(x)).slice(0, 10);
    }
    // effects in a replayed frame: one already shown when the frame was first played isn't shown again, a new one is
    out.events = await p.evaluate(() => {
      const n = () => FX.pops.length, n0 = n(); RB.sim = true;
      try {
        RB.frame = 100; FX.pop(100, 50, 200, 'SEEN', '#fff');                   // played forward
        RB.resim = true; RB.frame = 101; FX.pop(100, 50, 200, 'SEEN', '#fff');  // the same, replayed a frame later: skipped
        const a = n() - n0; FX.pop(400, 50, 200, 'NEW', '#fff');                // first seen in a replay: shown
        const b = n() - n0; RB.frame = null; FX.pop(500, 50, 200, 'NOFRAME', '#fff');   // a replay outside an online match: skipped
        return [a, b, n() - n0];
      } finally { RB.sim = false; RB.resim = false; RB.frame = null; }
    });
    // what a frame costs: a match step, a save, a restore, a checksum (ms, median of a few hundred), here and 4x slower
    const cost = () => p.evaluate(() => {
      const n = 300, r = v => Math.round(v / n * 1000) / 1000, S0 = []; let t0 = performance.now();
      for (let i = 0; i < n; i++) rbStep([RB_IDLE, RB_IDLE]); const step = performance.now() - t0;
      t0 = performance.now(); for (let i = 0; i < n; i++) S0.push(rbSave()); const save = performance.now() - t0;
      t0 = performance.now(); for (let i = n - 1; i >= 0; i--) rbLoad(S0[i]); const load = performance.now() - t0;
      t0 = performance.now(); for (let i = 0; i < 30; i++) rbHash(); const hash = (performance.now() - t0) * 10;
      return { step: r(step), save: r(save), load: r(load), hash: r(hash), objects: S0[0].list.length / 2 };
    });
    await p.evaluate(() => { window.__P = { frames: 60 }; });
    out.cost = await cost();
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    out.cost4x = await cost(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const c = out.cost4x; out.replay8ms4x = Math.round((c.load + 8 * (c.step + c.save)) * 100) / 100;   // a rollback of 8 frames on the slow CPU
    await ctx.close();
    const ok = out.frames === frames && out.first === -1 && out.stepErrors[0] === 0 && out.events.join() === '1,2,2' && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  // two tabs in one lobby on a conditioned test link, then a Head to head match
  async function rbPair(browser, base, q, setup, guestInit) {
    const errs = [], ctx = await newContext(browser, { rb: true });
    const H = await open(ctx, base + '/' + q, errs, 'host'), G = await open(ctx, base + '/' + q, errs, 'guest');
    if (guestInit) await G.evaluate(guestInit);
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
    await H.evaluate(S => { const o = Lobby.opts(); o.game = 'vs'; Net.mode = 'vs'; Object.assign(o, S || {}); Lobby.changed(); }, setup || null);
    await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
    await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    return { ctx, H, G, errs };
  }
  // each page presses its own buttons at random, like a player would
  const MASH = seed => { let s = seed; const R = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; };
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyH', 'KeyL', 'ShiftLeft'];
    window.__mash = setInterval(() => { for (const k of keys) { const mv = /Key[WASD]/.test(k), on = !!Input.down[k]; if (on ? R() < (mv ? 0.04 : 0.3) : R() < (mv ? 0.03 : 0.02)) { if (on) { Input.down[k] = false; Input.released[k] = true; } else { Input.down[k] = true; Input.pressed[k] = true; } } } }, 16); };
  T['rb-online'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=40&jit=10&loss=2&p2p=0&room=rbon&nowelcome=1');
    const started = await Promise.all([H, G].map(p => p.evaluate(() => ({ on: RBN.on, me: RBN.me, screen: Game.screen }))));
    await H.evaluate(MASH, 11); await G.evaluate(MASH, 23);
    await sleep(20000);
    const rep = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return Object.assign(RBN.report() || {}, { score: M.teams.map(t => t.score), phase: M.phase, stepErrors: RB.errors || 0, log: RBN.desyncLog || null }); })));
    await ctx.close();
    const out = { started, host: rep[0], guest: rep[1] };
    const ok = started.every(s => s.on && s.screen === 'play') && started[0].me === 0 && started[1].me === 1
      && rep.every(r => r.desync == null && (r.desyncs || 0) === 0 && r.hashesChecked >= 5 && r.frame > 900 && r.maxRoll <= 20 && r.stepErrors === 0) && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['rb-flow'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbflow&nowelcome=1', { format: 'halves', len: 8 });
    const out = {};
    await H.evaluate(MASH, 5); await G.evaluate(MASH, 9);
    const fin = p => p.waitForFunction(() => Game.screen === 'final', null, { timeout: 150000 }).then(() => true, () => false);
    const [hf, gf] = await Promise.all([fin(H), fin(G)]);
    const end = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return { screen: Game.screen, score: M.teams.map(t => t.score), winner: M.winner, desync: RBN.desync, err: RB.errors || 0, phase: M.phase, q: M.quarter, clock: M.clock, endF: RBN.endF, conf: RBN.conf, f: RBN.f }; })));
    out.final = { hf, gf, host: end[0], guest: end[1] };
    // the host goes on: both in the lobby
    await H.evaluate(() => finalContinue());
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 10000 }).catch(() => {});
    out.lobby = await Promise.all([H, G].map(p => p.evaluate(() => ({ screen: Game.screen, rb: RBN.on }))));
    // a rematch
    const id0 = await H.evaluate(() => RBN.id);
    await sleep(600); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    out.rematch = await Promise.all([H, G].map(p => p.evaluate(() => ({ on: RBN.on, id: RBN.id, f: RBN.f, screen: Game.screen }))));
    // the host leaves in the middle of it
    await H.evaluate(() => goTitle());
    await G.waitForFunction(() => !RBN.on, null, { timeout: 10000 }).catch(() => {});
    out.left = await G.evaluate(() => ({ on: RBN.on, screen: Game.screen }));
    await ctx.close();
    const ok = hf && gf && end[0].score.join() === end[1].score.join() && end[0].winner === end[1].winner && end.every(e => e.desync == null && e.err === 0)
      && out.lobby.every(l => l.screen === 'lobby' && !l.rb) && out.rematch.every(r => r.on && r.id === id0 + 1 && r.f > 30 && r.screen === 'play')
      && !out.left.on && out.left.screen !== 'play' && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['rb-settings'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbset&nowelcome=1', null, () => {
      View.magnet = 0; Object.assign(SETTINGS, { dribble: 'stride', casual: true, difficulty: 'hard', sound: false, autoShot: true, tomahawk: 'power' }); Input.touchMode = true;   // the guest's own device
    });
    await H.evaluate(MASH, 41); await G.evaluate(MASH, 43);
    await sleep(15000);
    const rep = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return Object.assign(RBN.report() || {}, { err: RB.errors || 0 }); })));
    await ctx.close();
    const ok = rep.every(r => (r.desyncs || 0) === 0 && r.hashesChecked >= 5 && r.err === 0) && !errs.length;
    return { ok, detail: [JSON.stringify({ host: rep[0], guest: rep[1] }), ...errs] };
  };
  // each page plays by touch: the stick (now and then past its ring) and the touch buttons (they press keys)
  const MASH_TOUCH = seed => { let s = seed; const R = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; };
    Input.touchMode = true; let a = 0, deep = false; const keys = ['KeyK', 'KeyJ', 'KeyH', 'KeyL'];
    window.__mash = setInterval(() => {
      if (R() < 0.05) a = R() * Math.PI * 2; if (R() < 0.03) deep = !deep;
      const m = R() < 0.1 ? 0 : deep ? 1 : 0.7; Input.stick.ax = Math.cos(a) * m; Input.stick.az = Math.sin(a) * m; Input.stick.deep = deep && m > 0; TouchUI.sid = m > 0 ? 1 : null;
      for (const k of keys) { const on = !!Input.down[k]; if (on ? R() < 0.3 : R() < 0.02) { if (on) { Input.down[k] = false; Input.released[k] = true; } else { Input.down[k] = true; Input.pressed[k] = true; } } }
    }, 16); };
  T['rb-touch'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbtouch&nowelcome=1');
    await H.evaluate(MASH_TOUCH, 51); await G.evaluate(MASH_TOUCH, 53);
    await sleep(15000);
    const rep = await Promise.all([H, G].map(p => p.evaluate(() => {
      clearInterval(window.__mash); const me = M.players.find(q => q.human === RBN.me);
      return Object.assign(RBN.report() || {}, { err: RB.errors || 0, sprinted: me.stats && me.turbo < 100 || me.winded });
    })));
    await ctx.close();
    const ok = rep.every(r => (r.desyncs || 0) === 0 && r.hashesChecked >= 5 && r.err === 0) && rep.some(r => r.sprinted) && !errs.length;
    return { ok, detail: [JSON.stringify({ host: rep[0], guest: rep[1] }), ...errs] };
  };
  T['rb-slow'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbslow&nowelcome=1');
    const cdp = await ctx.newCDPSession(G); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await H.evaluate(MASH, 61); await G.evaluate(MASH, 63);
    const f0 = await Promise.all([H, G].map(p => p.evaluate(() => [RBN.f, Date.now()])));
    await sleep(12000);
    const rep = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return Object.assign(RBN.report() || {}, { err: RB.errors || 0, t: Date.now() }); })));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await sleep(3000);
    const after = await Promise.all([H, G].map(p => p.evaluate(() => ({ f: RBN.f, desync: RBN.desync, code: rbSyncCode() }))));
    await ctx.close();
    const rate = (r, i) => Math.round((r.frame - f0[i][0]) / ((r.t - f0[i][1]) / 1000));   // frames a second over the 12 s
    const out = { hostFps: rate(rep[0], 0), guestFps: rate(rep[1], 1), host: rep[0], guest: rep[1], after };
    const ok = out.hostFps >= 50 && out.guestFps >= 45 && after.every(a => a.desync == null) && Math.abs(after[0].f - after[1].f) < 30 && rep.every(r => r.err === 0) && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['rb-freeze'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbfrz&nowelcome=1');
    await H.evaluate(MASH, 71); await G.evaluate(MASH, 73);
    await sleep(3000);
    const h0 = await H.evaluate(() => [RBN.f, Date.now()]);
    await G.evaluate(() => { window.__upd = RBN.update; RBN.update = () => {}; clearInterval(window.__mash); });   // the guest's app is in the background
    await sleep(2000);
    const h1 = await H.evaluate(() => [RBN.f, Date.now()]);
    await G.evaluate(() => { RBN.update = window.__upd; });
    await sleep(5000);
    const after = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return Object.assign(RBN.report() || {}, { desyncNow: RBN.desync, err: RB.errors || 0 }); })));
    await ctx.close();
    const hostFpsWhileFrozen = Math.round((h1[0] - h0[0]) / ((h1[1] - h0[1]) / 1000));
    const out = { hostFpsWhileFrozen, host: after[0], guest: after[1] };
    const ok = hostFpsWhileFrozen >= 50 && Math.abs(after[0].frame - after[1].frame) < 20 && after.every(a => a.desyncNow == null && a.err === 0) && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['rb-resync'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await rbPair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbsync&nowelcome=1');
    await H.evaluate(MASH, 3); await G.evaluate(MASH, 4);
    await sleep(3000);
    await G.evaluate(() => { const iv = setInterval(() => { const p = M.players[2]; p.x += 37; p.turbo = 3; }, 16); setTimeout(() => clearInterval(iv), 500); });   // a desync, on the guest only (for half a second: a single nudge is undone by the next rollback)
    await sleep(6000);
    const rep = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return Object.assign(RBN.report() || {}, { err: RB.errors || 0 }); })));
    await sleep(2500);
    const after = await Promise.all([H, G].map(p => p.evaluate(() => ({ desync: RBN.desync, last: [...RBN.hashes.entries()].pop() }))));
    await ctx.close();
    const out = { host: rep[0], guest: rep[1], after };
    const ok = rep[0].syncsSent >= 1 && rep[1].syncs >= 1 && after.every(a => a.desync == null) && rep.every(r => r.err === 0) && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  // one connection: a Head to head with rollback, the presses timed on both screens
  async function rbLagRun(browser, base, name, prof) {
    const q = `?net=loop&mode=${prof.mode}&lat=${prof.lat}&jit=${prof.jit}&loss=${prof.loss}&bw=${prof.bw}&p2p=0&room=rblag${Math.random().toString(36).slice(2, 7)}&nowelcome=1`;
    const { ctx, H, G, errs } = await rbPair(browser, base, q);
    const helper = () => {
      Replay.schedule = () => {};
      const me = (h) => M.players.find(q => q.human === h);
      // press (or release) a direction on this keyboard
      window.__press = (k, on) => { Input.down[k] = on; if (on) Input.pressed[k] = true; else Input.released[k] = true; };
      // from now: the first frame the given human's player moves the given way (ms, wall clock)
      window.__watch = (h, dir) => new Promise(res => { const t0 = Date.now(); const tick = () => { const p = me(h); if (p && p.vx * dir > 40) return res(Date.now()); if (Date.now() - t0 > 3000) return res(null); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      window.__still = h => { const p = me(h); return p && Math.abs(p.vx) < 5 && Math.abs(p.vz) < 5 && p.state === 'free'; };
    };
    await H.evaluate(helper); await G.evaluate(helper);
    await sleep(2500);
    const own = { host: [], guest: [] }, remote = { atGuest: [], atHost: [] };
    for (let i = 0; i < 6; i++) {
      const dir = i % 2 ? -1 : 1, key = dir > 0 ? 'KeyD' : 'KeyA';
      for (const [P, O, h, oh, ownL, remL] of [[H, G, 0, 0, own.host, remote.atGuest], [G, H, 1, 1, own.guest, remote.atHost]]) {
        for (let w = 0; w < 30 && !(await P.evaluate(x => window.__still(x), h)); w++) await sleep(50);
        const seenHere = P.evaluate(([x, d]) => window.__watch(x, d), [h, dir]), seenThere = O.evaluate(([x, d]) => window.__watch(x, d), [oh, dir]);
        const t0 = await P.evaluate(k => { const t = Date.now(); window.__press(k, true); return t; }, key);
        const [a, b] = await Promise.all([seenHere, seenThere]);
        await P.evaluate(k => window.__press(k, false), key);
        if (a) ownL.push(a - t0); if (b) remL.push(b - t0);
        await sleep(450);
      }
    }
    // then both mash for 10 s: corrections, waits, bytes
    const b0 = await Promise.all([H, G].map(p => p.evaluate(() => ({ bytes: (Net.room && Net.room.stats && Net.room.stats.byKey && Net.room.stats.byKey.rb) || 0, t: Date.now() }))));
    await H.evaluate(MASH, 31); await G.evaluate(MASH, 37);
    await sleep(10000);
    const rep = await Promise.all([H, G].map(p => p.evaluate(() => { clearInterval(window.__mash); return Object.assign(RBN.report() || {}, { bytes: (Net.room && Net.room.stats && Net.room.stats.byKey && Net.room.stats.byKey.rb) || 0, t: Date.now(), err: RB.errors || 0, log: RBN.desyncLog || null }); })));
    await ctx.close();
    const med = a => { const x = a.slice().sort((p, q) => p - q); return x.length ? x[x.length >> 1] : null; };
    return { name, ownHost: med(own.host), ownGuest: med(own.guest), friendAtGuest: med(remote.atGuest), friendAtHost: med(remote.atHost),
      rollbacksPerSec: +((rep[0].rollbacksPerSec + rep[1].rollbacksPerSec) / 2).toFixed(1), avgRoll: +((rep[0].avgRoll + rep[1].avgRoll) / 2).toFixed(1), maxRoll: Math.max(rep[0].maxRoll, rep[1].maxRoll),
      stalls: rep[0].stalls + rep[1].stalls, delay: [rep[0].delay, rep[1].delay], bytesPerSec: Math.round((rep[0].bytes - b0[0].bytes) / Math.max(1, (rep[0].t - b0[0].t) / 1000)),
      desync: rep[0].desyncs + rep[1].desyncs, log: rep[1].log || rep[0].log, err: rep[0].err + rep[1].err, samples: [own.host.length, own.guest.length, remote.atGuest.length, remote.atHost.length], errs };
  }
  T['rb-lag'] = async ({ browser, base }) => {
    const rows = [];
    for (const [name, prof] of LAG_PROFILES) rows.push(prof.mode === 'server' ? { name, snapshots: true } : await rbLagRun(browser, base, name, prof));   // (no direct link: the snapshot netcode)
    const ok = rows.every(r => r.snapshots || (r.ownHost != null && r.ownGuest != null && r.desync === 0 && r.err === 0 && !r.errs.length)) && rows.filter(r => !r.snapshots && /^Direct|^Relay/.test(r.name)).every(r => r.ownHost <= 70 && r.ownGuest <= 70 && r.desync === 0);   // (your own press within ~4 frames on direct and relay links, and one game)
    return { ok, detail: [rbLagTable(rows), JSON.stringify(rows)] };
  };
  return T;
}
export function rbLagTable(rows) {
  const h = '| Connection | Your press, host | Your press, guest | Friend\'s press on your screen | Corrections /s (avg frames) | Waits | Bytes/s |\n|---|---|---|---|---|---|---|\n';
  return h + rows.map(r => r.snapshots ? `| ${r.name} | snapshot netcode (no direct link) | | | | | |` : `| ${r.name} | ${r.ownHost} ms | ${r.ownGuest} ms | ${r.friendAtGuest} / ${r.friendAtHost} ms | ${r.rollbacksPerSec} (${r.avgRoll}, max ${r.maxRoll}) | ${r.stalls} | ${r.bytesPerSec} |`).join('\n');
}
