// v9.33.0 save any play, My plays, share (docs/plans/replays.md; tests/run.mjs registers them):
//   plays-save   a Quick Play match: Save play from the pause menu, the V key, the touch pill after a basket (a real tap on
//                a phone-sized page) and the final screen's highlight each store a play in IndexedDB with its frames
//                (8 s before + 1 s after a live press), its label and player; the codec gives the frames back; a second
//                press within 3 s replaces the first; the sizes (raw, stored, a link at 60/30/20 fps) and the buffer's memory
//   rb-plays     an online (rollback) match on ?net=loop: the guest saves plays by key, the pause menu and the touch pill
//                while both phones press their own random buttons: every save is stored on the guest only, the match
//                never pauses, and every exchanged checksum matches (no desync)
const sleep = ms => new Promise(r => setTimeout(r, ms));
// fill the replay buffer: a CPU match stepped by hand (no drawing), then handed to the real loop
const PREP = `(() => { window.__seed && window.__seed(7); newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } });
  M.players[0].human = -1; Game.screen = 'play'; Game.paused = false; for (let n = 0; n < 60 * 12; n++) updateMatch(STEP); M.players[0].human = 0; })()`;
const latest = p => p.evaluate(() => playsAll().then(a => a.map(r => ({ id: r.id, src: r.src, label: r.label, idx: r.idx, n: r.n, np: r.np, peak: r.peak, z: r.z, bytes: r.data.length,
  v: r.v, teams: (r.meta.teams || []).map(t => t && t.name), score: r.meta.score, star: r.star }))));
export function replayTests({ newContext, open }) {
  const T = {};
  T['plays-save'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'plays');
    const r = {};
    await p.evaluate(PREP);
    r.bufMax = await p.evaluate(() => [Replay.max, Replay.buf.length]);
    // 1. the pause menu (paused offline: saved at once, 8 s back from the pause)
    r.pause = await p.evaluate(() => { Game.paused = true; Game.idx = 0; const it = pauseItems(), i = it.findIndex(x => /^Save play/.test(x[0])); const at = i; if (i >= 0) it[i][1]();
      return { at, label: (pauseItems()[i] || [])[0] }; });
    await p.waitForFunction(() => Plays.writes >= 1, null, { timeout: 5000 }).catch(() => {});
    await p.evaluate(() => { Game.paused = false; Plays.last = null; });
    // 2. the V key while playing: 1 s after the press, then stored
    await sleep(400);
    await p.keyboard.press('KeyV');
    r.keyPending = await p.evaluate(() => !!Plays.pending);
    await p.waitForFunction(() => Plays.writes >= 2, null, { timeout: 8000 }).catch(() => {});
    // 3. a second V within 3 s replaces it
    await p.keyboard.press('KeyV');
    await p.waitForFunction(() => Plays.writes >= 3, null, { timeout: 8000 }).catch(() => {});
    r.afterKeys = (await latest(p)).length;
    await ctx.close();
    // 4. touch: a phone-sized page, the pill after a basket, tapped for real
    const e2 = [], c2 = await newContext(browser, { seed: true, device: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true } });
    const q = await open(c2, base + '/', e2, 'plays-touch');
    await q.evaluate(PREP);
    await q.touchscreen.tap(5, 5); await q.evaluate(() => { Input.touchMode = true; });
    await q.evaluate(() => { FX.highlight(1, 2.5, 'THREE'); });   // (as onScore calls it after a made three)
    await sleep(300);
    r.pill = await q.evaluate(() => { const r = Game.rects.find(x => Math.abs(x.x + x.w / 2 - W / 2) < 2 && x.y < 20); if (!r) return null;
      const b = canvas.getBoundingClientRect(); return { x: b.left + (r.x + r.w / 2) / W * b.width, y: b.top + (r.y + r.h / 2) / H * b.height }; });
    if (r.pill) await q.touchscreen.tap(r.pill.x, r.pill.y);
    await q.waitForFunction(() => Plays.writes >= 1, null, { timeout: 8000 }).catch(() => {});
    r.touch = (await latest(q))[0] || null;
    r.pillAfter = await q.evaluate(() => Plays.btnSaved);
    // 5. the final screen: the best play's Save play, and V
    await q.evaluate(() => { for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; } Game.screen = 'final'; Game.finalTab = 0; });
    await sleep(300);
    r.finalClips = await q.evaluate(() => (M.highlights || []).length);
    r.finalBtn = await q.evaluate(() => !!playFinalClip());
    await q.evaluate(() => { Input.pressed.KeyV = true; });
    await q.waitForFunction(() => Plays.writes >= 2, null, { timeout: 8000 }).catch(() => {});
    const all = await latest(q);
    r.final = all.find(x => x.src === 'final') || null;
    r.savedLabel = await q.evaluate(() => { const c = playFinalClip(); return c && c.savedId ? 'Saved' : 'not'; });
    // the codec gives the frames back (within the stored step), and a link's sizes
    r.codec = await q.evaluate(async () => {
      const rec = (await playsAll()).find(x => x.src === 'touch'), fr = playUnpack(await playInflate(rec.data, rec.z));
      const src = (M.highlights[0] || {}).frames || Replay.buf.slice(-540), out = { n: fr.length, np: fr[0].ps.length };
      const base = Replay.buf.slice(-540); let e = 0; const back = playUnpack(playPack(base));
      back.forEach((f, i) => { const a = playFlat(f), b = playFlat(base[i]); a.forEach((v, c) => { e = Math.max(e, Math.abs(v - b[c])); }); });
      out.storeErr = Math.round(e * 1000) / 1000;
      out.json = JSON.stringify(base).length; const st = playPack(base); out.raw = st.length; out.stored = (await playDeflate(st)).data.length;
      out.meta = (await playDeflate(new TextEncoder().encode(JSON.stringify(playMeta(M))))).data.length;
      for (const s of [1, 2, 3]) out['link' + s] = (await playDeflate(playPack(base, PLAY_Q_LINK, s))).data.length;
      return out; });
    // the buffer's memory: 10 x 540 fresh frames of this match, measured on the heap after garbage collection, per 540
    const cdp = await c2.newCDPSession(q), heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize; };
    const h0 = await heap(); await q.evaluate(() => { window.__X = []; for (let k = 0; k < 10; k++) { const a = []; for (let i = 0; i < 540; i++) a.push(Replay.frame()); window.__X.push(a); } }); const h1 = await heap();
    await q.evaluate(() => { window.__X = null; });
    r.memKB540 = Math.round((h1 - h0) / 10 / 1024);
    await c2.close(); errs.push(...e2);
        const ok = r.bufMax[0] === 600 && r.bufMax[1] === 600 && r.pause.at === 1 && /saved/i.test(r.pause.label || '')
      && r.keyPending && r.afterKeys === 2 && r.touch && r.touch.src === 'touch' && r.touch.label === 'THREE' && r.touch.idx === 1 && r.touch.n === 540 && r.pillAfter && !!r.pill
      && r.finalClips > 0 && r.finalBtn && r.final && r.final.n >= 40 && r.savedLabel === 'Saved'
      && r.codec.n === 540 && r.codec.storeErr <= 0.07 && r.codec.link2 + r.codec.meta <= 8192 && !errs.length;
    return { ok, detail: [JSON.stringify(r), 'stored: ' + JSON.stringify(all), ...errs] };
  };
  return T;
}
// the online test sits with the rollback tests (it needs their pair and button masher): see rb-plays in tests/rollback.mjs
