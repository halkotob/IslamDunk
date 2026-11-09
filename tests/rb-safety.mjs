// v9.17.6 online robustness (tests/run.mjs registers them; full tier, run alone):
//   rb-linkdrop   B3: in a rollback match the direct link drops; it's offered again and comes back while the match
//                 goes on (it stayed down for the rest of the match before), with no desync
//   rb-hostile    S1 (and Q5): a modified game's input packets ("0*999999999", more than 48 inputs, values no input can
//                 be, junk, the wrong types) are dropped at once: the tab doesn't freeze, no input is taken from them,
//                 and the match goes on; a normal packet after them still counts
//   rb-watchdog   Q9 (fast tier): the stuck-ball watchdog's timers are saved, put back and checksummed with the frame
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function rbSafetyTests({ newContext, open }) {
  const T = {};
  async function pair(browser, base, q) {
    const errs = [], ctx = await newContext(browser, { rb: true });
    const H = await open(ctx, base + '/' + q, errs, 'host'), G = await open(ctx, base + '/' + q, errs, 'guest');
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
    await H.evaluate(() => { const o = Lobby.opts(); Object.assign(o, { game: 'vs', court: 'full', format: 'quarters', len: 120 }); Net.mode = 'vs'; Lobby.changed(); });
    await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
    return { ctx, H, G, errs };
  }
  T['rb-linkdrop'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await pair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&room=rblink&nowelcome=1');
    await G.waitForFunction(() => P2P.open, null, { timeout: 15000 }).catch(() => {});
    const before = await G.evaluate(() => P2P.open);
    await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && RBN.f > 120, null, { timeout: 15000 }).catch(() => {});
    // the link drops mid-match
    await H.evaluate(() => P2P.close('test'));
    await G.waitForFunction(() => !P2P.open, null, { timeout: 5000 }).catch(() => {});
    const f0 = await G.evaluate(() => RBN.f);
    const back = await G.waitForFunction(() => P2P.open, null, { timeout: 20000 }).then(() => true, () => false);
    await sleep(2000);
    const r = await Promise.all([H, G].map(p => p.evaluate(() => ({ on: RBN.on, f: RBN.f, open: P2P.open, desyncs: (RBN.stats && RBN.stats.desyncs) || 0, mode: typeof NetDiag !== 'undefined' ? NetDiag.modeNow() : '' }))));
    await ctx.close();
    const ok = before && back && r.every(x => x.on && x.open && x.desyncs === 0) && r[1].f > f0 + 120 && !errs.length;
    return { ok, detail: [`direct link before the match: ${before}; dropped at frame ${f0}, back: ${back}; after: ${JSON.stringify(r)}`, ...errs] };
  };
  T['rb-hostile'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await pair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbhost&nowelcome=1');
    await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && RBN.f > 120, null, { timeout: 15000 }).catch(() => {});
    // packets from a modified game, handed to the guest's receive as if they came from the host
    const r = await G.evaluate(() => {
      const BAD = [{ d: '0*999999999' }, { d: '0*49' }, { d: Array(49).fill('1').join(',') }, { d: 'zzzzzzzzzz' }, { d: '5*-3' }, { d: 'NaN' }, { d: '0*1e9' },
        { d: 12345 }, { d: { length: 1e9 } }, { d: 'a'.repeat(100000) }, { d: '1', s: -5 }, { d: '1', s: 1.5 }, { d: '1', s: 'x' }];
      const keepP = RBN.peerPres, keepLast = RBN.lastPkt, R = 1 - RBN.me, I = RBN.ins[R], n0 = I.size, conf0 = RBN.conf, out = [];
      let t = 1e15;
      for (const b of BAD) {
        const pkt = Object.assign({ i: RBN.id, s: RBN.conf + 1, a: 0, F: RBN.f, v: 0, t: t++ }, b);
        RBN.peerPres = () => ({ rb: pkt });
        const t0 = performance.now(); let err = null; try { RBN.receive(); } catch (e) { err = e.message; }
        out.push({ d: String(b.d).slice(0, 14), s: b.s, ms: Math.round((performance.now() - t0) * 10) / 10, err, added: I.size - n0 });
      }
      // a normal packet (one input for the next frame) still counts
      const good = { i: RBN.id, s: RBN.conf + 1, d: rbRunsOut([rbPackIn(RB_IDLE)]), a: 0, F: RBN.f, v: 0, t: t++ };
      const had = I.has(good.s); RBN.peerPres = () => ({ rb: good }); RBN.receive();
      const goodTaken = had || I.has(good.s);
      RBN.peerPres = keepP; RBN.lastPkt = keepLast;
      return { out, conf0, goodTaken };
    });
    await sleep(2000);
    const after = await Promise.all([H, G].map(p => p.evaluate(() => ({ on: RBN.on, f: RBN.f }))));
    await ctx.close();
    const ok = r.out.every(x => !x.err && x.added === 0 && x.ms < 50) && r.goodTaken && after.every(x => x.on && x.f > 240) && !errs.length;
    return { ok, detail: [...r.out.map(x => `${JSON.stringify(x.d)}${x.s != null ? ' from ' + JSON.stringify(x.s) : ''}: ${x.ms} ms, ${x.added} inputs taken${x.err ? ', threw ' + x.err : ''}`), `a normal packet after them: taken ${r.goodTaken}; both phones still playing: ${JSON.stringify(after)}`, ...errs] };
  };
  // Q9: the stuck-ball watchdog's timers (WD) are part of a saved frame. They weren't: a replayed frame counted a loose
  // ball's seconds again, so the phone that went back more handed the ball out sooner (1 on 1, half court: 3 runs in 10)
  T['rb-watchdog'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { rb: true }), P = await open(ctx, base + '/?nowelcome=1', errs, 'one');
    const r = await P.evaluate(() => {
      const keep = rbSave();   // the title screen's match, put back after (rbClean leaves no match to draw)
      WD.dead = 0; WD.loose = 3; WD.out = 0.25; const S = rbSave(), h0 = rbHashSaved(S), l0 = rbHash();
      WD.loose = 4.9; WD.out = 0.5; const h1 = rbHashSaved(rbSave()), l1 = rbHash();
      rbLoad(S); const back = [WD.dead, WD.loose, WD.out];
      rbClean(); const clean = [WD.dead, WD.loose, WD.out];
      rbLoad(keep);
      return { back, clean, savedHashMoves: h0 !== h1, lineHashMoves: l0 !== l1 };
    });
    await ctx.close();
    const ok = r.back.join() === '0,3,0.25' && r.clean.join() === '0,0,0' && r.savedHashMoves && r.lineHashMoves && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };
  return T;
}
