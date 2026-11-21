// v9.33.0 save any play, My plays, share (docs/plans/replays.md; tests/run.mjs registers them):
//   plays-save   a Quick Play match: Save play from the pause menu, the V key, the touch pill after a basket (a real tap on
//                a phone-sized page) and the final screen's highlight each store a play in IndexedDB with its frames
//                (8 s before + 1 s after a live press), its label and player; the codec gives the frames back; a second
//                press within 3 s replaces the first; the sizes (raw, stored, a link at 60/30/20 fps) and the buffer's memory
//   rb-plays     an online (rollback) match on ?net=loop: the guest saves plays by key, the pause menu and the touch pill
//                while both phones press their own random buttons: every save is stored on the guest only, the match
//                never pauses, and every exchanged checksum matches (no desync)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
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
  // step 2: My plays. 25 saves keep the newest 20 and every starred one; a watched play looks as it did live (the same
  // frame drawn from the live match and from the stored play, compared pixel by pixel; both written to tests/output);
  // a video kept in My clips before 9.33 is listed and plays; keyboard, pad and touch reach a play and leave
  T['plays-library'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'plays-lib');
    const r = {};
    // a video kept by an older version: the v1 database, before the game opens it
    r.legacyPut = await p.evaluate(async () => {
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; const g = cv.getContext('2d');
      const rec = new MediaRecorder(cv.captureStream(30), { mimeType: 'video/webm' }), parts = []; rec.ondataavailable = e => e.data.size && parts.push(e.data);
      rec.start(100); for (let i = 0; i < 30; i++) { g.fillStyle = `hsl(${i * 12},70%,50%)`; g.fillRect(0, 0, 320, 180); await new Promise(r => setTimeout(r, 33)); } rec.stop();
      await new Promise(r => { rec.onstop = r; }); const blob = new Blob(parts, { type: 'video/webm' });
      return new Promise((res, rej) => { const q = indexedDB.open('islamdunk-clips', 1); q.onupgradeneeded = () => q.result.createObjectStore('clips', { keyPath: 'id' });
        q.onsuccess = () => { const db = q.result, t = db.transaction('clips', 'readwrite'); t.objectStore('clips').put({ id: 'old1', at: 1000, name: 'islam-dunk-noor-dunk.webm', type: 'video/webm', blob, poster: '', label: 'Big dunk', teams: ['Masjid Al-Noor', 'Masjid At-Taqwa'], score: [12, 10] });
          t.oncomplete = () => { db.close(); res(blob.size); }; }; q.onerror = () => rej(q.error); }); });
    // 25 saves (the second to fourth starred): the newest 20 unstarred and the 3 starred are kept
    r.limit = await p.evaluate(async () => {
      newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 120 }, venue: makeVenue(VENUE_LIST[1], { host: 0, crowd: 20, level: 0.3 }) }); Game.screen = 'play';
      for (let n = 0; n < 600; n++) updateMatch(STEP);
      const fr = Replay.buf.slice(-540), ids = [];
      for (let k = 0; k < 25; k++) {
        const rec = await playWrite(fr, { src: 'test', label: 'PLAY ' + k, idx: 0, peak: 300, at: 1e12 + k, meta: playMeta(M) }); ids.push(rec.id);
        if (k === 4) { const all = await playsAll(); for (const i of [1, 2, 3]) { const x = all.find(q => q.id === ids[i]); x.star = true; await playTx('readwrite', st => st.put(x)); } }
      }
      const all = await playsAll(), kept = all.map(x => ids.indexOf(x.id));
      return { count: all.length, starred: all.filter(x => x.star).map(x => ids.indexOf(x.id)).sort((a, b) => a - b), gone: ids.map((_, i) => i).filter(i => !kept.includes(i)) };
    });
    // unstarring the oldest starred play makes it one of the recent ones: the oldest of 21, so it goes
    r.unstar = await p.evaluate(async () => { Game.screen = 'title'; openMyPlays(); await playsRefresh(); const x = PlayLib.list.find(q => q.label === 'PLAY 1'); playStar(x);
      await new Promise(r => setTimeout(r, 400)); const all = await playsAll(); return { count: all.length, has1: all.some(q => q.label === 'PLAY 1') }; });
    // the same frame, live and watched
    r.same = await p.evaluate(async () => {
      newMatch(TEAMS[2], TEAMS[5], { humans: [], fmt: { format: 'quarters', len: 120 }, venue: makeVenue(VENUE_LIST[1], { host: 0, crowd: 20, level: 0.3 }) }); Game.screen = 'play';
      for (let n = 0; n < 600; n++) updateMatch(STEP);
      const fr = Replay.buf.slice(-540), si = 400, clip = { frames: fr, idx: 1, label: 'PLAY' };
      const live = { scene: Object.assign({}, M, PLAY_SCENE), venue: VL,   // (as a saved play is drawn: no hot spot, free throw or inbound state)
        court: courtCv, crowdCanvas: crowdCv, crowdMembers: crowd, shadow: SHADOW, teams: M.teamDefs, score: M.teams.map(t => t.score), time: 0, ballState: 'held' };
      const A = makeCanvas(960, 540); playDraw(A.getContext('2d'), clip, live, si, {}, 0, 960, 540, true);
      const rec = await playWrite(fr, { src: 'test', label: 'PLAY', idx: 1, peak: si, meta: playMeta(M) });
      Game.screen = 'title'; goTitle();                                          // (the demo match takes over M: the play is drawn from storage alone)
      const back = (await playsAll()).find(q => q.id === rec.id), fr2 = playUnpack(await playInflate(back.data, back.z)), meta = playScene(back);
      const B = makeCanvas(960, 540); playDraw(B.getContext('2d'), { frames: fr2, idx: 1, label: 'PLAY' }, meta, si, {}, 0, 960, 540, true);
      const a = A.getContext('2d').getImageData(0, 0, 960, 540).data, b = B.getContext('2d').getImageData(0, 0, 960, 540).data; let diff = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60) diff++;
      return { pct: Math.round(diff / (960 * 540) * 10000) / 100, a: A.toDataURL('image/png'), b: B.toDataURL('image/png'), demo: M.attract };
    });
    try { const out = path.join(ROOT, 'tests/output'); fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, 'plays-live.png'), Buffer.from(r.same.a.split(',')[1], 'base64')); fs.writeFileSync(path.join(out, 'plays-watched.png'), Buffer.from(r.same.b.split(',')[1], 'base64')); } catch (e) {}
    delete r.same.a; delete r.same.b;
    // the old video is in the list and plays
    r.legacy = await p.evaluate(async () => { openMyPlays(); await playsRefresh(); const v = PlayLib.list.find(x => x.kind === 'video'); if (!v) return null;
      PlayLib.idx = PlayLib.list.indexOf(v); playWatch(v); await new Promise(r => setTimeout(r, 1200)); const el = document.querySelector('video');
      const out = { listed: true, overlay: !!MYC.overlay, t: el ? el.currentTime : -1 }; if (MYC.overlay) MYC.overlay.close(); return out; });
    // keyboard: → chooses the next play, Enter watches it, → moves to Delete, Esc back to the grid, Esc to the title
    await p.evaluate(() => { PlayLib.idx = 0; PlayLib.watch = null; Input.touchMode = false; });
    const kb = [];
    await p.keyboard.press('ArrowRight'); await sleep(120); kb.push(await p.evaluate(() => PlayLib.idx));
    await p.keyboard.press('Enter'); await sleep(300); kb.push(await p.evaluate(() => !!PlayLib.watch));
    await p.keyboard.press('ArrowRight'); await sleep(120); kb.push(await p.evaluate(() => PlayLib.watch && PlayLib.watch.focus));
    await sleep(500); await p.screenshot({ path: path.join(ROOT, 'tests/output/plays-watch.png') }).catch(() => {});
    await p.keyboard.press('Escape'); await sleep(200); kb.push(await p.evaluate(() => Game.screen + ':' + !!PlayLib.watch));
    await p.keyboard.press('Escape'); await sleep(200); kb.push(await p.evaluate(() => Game.screen));
    r.keyboard = kb;
    // from the main menu and the pause menu
    r.menus = await p.evaluate(() => { const m = TITLE_MENU(), labels = m.map(e => e.label), ex = JSON.stringify(m).includes('My clips');
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; for (let n = 0; n < 700; n++) updateMatch(STEP); Game.paused = true;
      const it = pauseItems().map(x => x[0]), i = it.indexOf('My plays'); pauseItems()[i][1](); const opened = Game.screen; BACK.myplays();
      return { labels, myClipsGone: !ex, pause: it, opened, back: Game.screen + ':' + Game.paused }; });
    await ctx.close();
    // the pad: A watches, B back to the grid, B leaves
    const e3 = [], c3 = await newContext(browser, { pad: true }), q = await open(c3, base + '/?nowelcome=1', e3, 'plays-pad');
    await q.evaluate(() => window.__padPlug(0, true));
    await q.evaluate(async () => { newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 120 } }); for (let n = 0; n < 600; n++) updateMatch(STEP);
      await playWrite(Replay.buf.slice(-540), { src: 'test', label: 'DUNK', idx: 0, peak: 300, meta: playMeta(M) }); goTitle(); openMyPlays(); await playsRefresh(); });
    const press = async k => { await q.evaluate(k => window.__padSet(0, { [k]: true }), k); await sleep(120); await q.evaluate(() => window.__padSet(0, {})); await sleep(250); };
    const pad = [];
    await press('A'); pad.push(await q.evaluate(() => !!PlayLib.watch));
    await press('B'); pad.push(await q.evaluate(() => Game.screen + ':' + !!PlayLib.watch));
    await press('B'); pad.push(await q.evaluate(() => Game.screen));
    r.pad = pad; await c3.close(); errs.push(...e3);
    // touch: a phone; a tap on a play watches it, the Back pill goes to the grid, then to the title
    const e4 = [], c4 = await newContext(browser, { device: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true } }), t = await open(c4, base + '/?nowelcome=1', e4, 'plays-touch');
    await t.touchscreen.tap(5, 5);
    await t.evaluate(async () => { Input.touchMode = true; newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 120 } }); for (let n = 0; n < 600; n++) updateMatch(STEP);
      await playWrite(Replay.buf.slice(-540), { src: 'test', label: 'DUNK', idx: 0, peak: 300, meta: playMeta(M) }); goTitle(); openMyPlays(); await playsRefresh(); });
    await sleep(400);
    const at = (x, y) => t.evaluate(([x, y]) => { const b = canvas.getBoundingClientRect(); return [b.left + (x + (W - 960) / 2) / W * b.width, b.top + y / H * b.height]; }, [x, y]);
    const tap = async (x, y) => { const [cx, cy] = await at(x, y); await t.touchscreen.tap(cx, cy); await sleep(300); };
    const touch = [];
    await tap(PG_TEST.x, PG_TEST.y); touch.push(await t.evaluate(() => !!PlayLib.watch));
    await t.screenshot({ path: path.join(ROOT, 'tests/output/plays-watch-phone.png') }).catch(() => {});
    const pill = async () => { const [cx, cy] = await t.evaluate(() => { const b = canvas.getBoundingClientRect(); return [b.left + 40 / W * b.width, b.top + 24 / H * b.height]; }); await t.touchscreen.tap(cx, cy); await sleep(300); };
    await pill(); touch.push(await t.evaluate(() => Game.screen + ':' + !!PlayLib.watch));
    await pill(); touch.push(await t.evaluate(() => Game.screen));
    r.touch = touch; await c4.close(); errs.push(...e4);
    const ok = r.limit.count === 23 && r.limit.starred.join() === '1,2,3' && r.limit.gone.join() === '0,4' && r.unstar.count === 22 && !r.unstar.has1
      && r.same.pct <= 1 && r.same.demo && r.legacy && r.legacy.overlay && r.legacy.t > 0.2
      && r.keyboard.join() === '1,true,1,myplays:false,title' && r.menus.labels.indexOf('My plays') >= 0 && r.menus.labels.indexOf('My plays') === r.menus.labels.indexOf('Settings') - 1 && r.menus.myClipsGone
      && r.menus.pause.indexOf('My plays') === r.menus.pause.indexOf('Save play (V)') + 1 && r.menus.opened === 'myplays' && r.menus.back === 'play:true'
      && r.pad.join() === 'true,myplays:false,title' && r.touch.join() === 'true,myplays:false,title' && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };
  return T;
}
const PG_TEST = { x: 24 + 111, y: 92 + 60 };   // the first card of My plays (960-wide layout)
// the online test sits with the rollback tests (it needs their pair and button masher): see rb-plays in tests/rollback.mjs
