// ================================================= v9.33.0: SAVE ANY PLAY (docs/plans/replays.md)
// Save play at any moment of a match keeps the last 8 seconds of what's drawn plus 1 second after the press, so a dunk
// saved at the rim still lands. Ways to save: Save play in the pause menu, the V key, on touch a small pill under the
// scoreboard for 4 s after every basket, block or steal, and Save play (V) on the final screen for the game-picked
// highlight shown there. Online it saves on this phone only: nothing is sent, nothing pauses, and the replay buffer is
// not part of the match state the phones compare (rollback skips the recorder when it replays frames).
//   * A saved play is its frames and a little metadata (teams, score, venue, format), not a video: small, and a video
//     can be made from it later. Stored in this browser (IndexedDB islamdunk-clips, store "plays"); the newest 20
//     unstarred saves are kept, starred ones until deleted.
//   * The frames are packed by playEncode: each number rounded to a fixed step, stored as the change from the frame
//     before, column by column, as variable-length integers, then deflated (CompressionStream) where the browser can.
//   * Saving twice within 3 s replaces the first save (the windows overlap).
//   * Not in mini games, demos or practice (their scenes aren't a match).
Replay.max = 600;                                          // a play is 9 s at 60 frames a second, plus 1 s of slack for a busy frame (was 300)
const PLAY_BEFORE = 480, PLAY_AFTER = 60, PLAY_KEEP = 20, PLAY_CODEC = 1;
const Plays = { pending: null, lastEv: null, btnUntil: 0, btnSaved: false, last: null, writes: 0, err: '' };
function playsCanSave() {
  return (Game.screen === 'play' || Game.screen === 'netplay') && !!M.teams && !M.attract && !M.practice && !M.mini && M.phase !== 'over' && !Game.trivia;
}
// ---- the codec: frames <-> bytes
// a frame (Replay.frame): ps = per player [x, y, z, face, spin, rot, hipH, 9 joints, dh, sq, cloth x, cloth y, state,
// flags, expr], b = [x, y, z, rot, owner, behind, fire], cam, h = [dy, dy]. Kinds: p = a distance, a = an angle,
// s = a small value, i = a whole number (kept, never blended).
const PLAY_PCOLS = 'pppiaapaaaaaaaaaisppiii', PLAY_BCOLS = 'pppaiii';
function playColKinds(np) { return PLAY_PCOLS.repeat(np) + PLAY_BCOLS + 'ppp'; }
function playFlat(f) { const out = []; for (const r of f.ps) for (let k = 0; k < 23; k++) out.push(+r[k] || 0); for (const v of f.b) out.push(+v || 0); out.push(+f.cam || 0, +f.h[0] || 0, +f.h[1] || 0); return out; }
function playUnflat(a, np) {
  const ps = []; let k = 0; for (let i = 0; i < np; i++) { ps.push(a.slice(k, k + 23)); k += 23; }
  return { ps, b: a.slice(k, k + 7), cam: a[k + 7], h: [a[k + 8], a[k + 9]] };
}
// q: [distance steps per unit, angle steps per radian, small-value steps per unit]; step: keep every step-th frame
const PLAY_Q_STORE = [8, 1000, 100], PLAY_Q_LINK = [2, 160, 40];
function playPack(frames, q = PLAY_Q_STORE, step = 1) {
  const np = frames[0].ps.length, kinds = playColKinds(np), C = kinds.length, keep = [];
  for (let i = 0; i < frames.length; i += step) keep.push(i);
  if (keep[keep.length - 1] !== frames.length - 1) keep.push(frames.length - 1);   // the last frame always
  const rows = keep.map(i => playFlat(frames[i])), bytes = [];
  const u = v => { while (v > 127) { bytes.push((v & 127) | 128); v = Math.floor(v / 128); } bytes.push(v); };
  const s = v => u(v < 0 ? -v * 2 - 1 : v * 2);
  u(PLAY_CODEC); u(np); u(frames.length); u(step); u(q[0]); u(q[1]); u(q[2]);
  for (let c = 0; c < C; c++) {
    const k = kinds[c], m = k === 'p' ? q[0] : k === 'a' ? q[1] : k === 's' ? q[2] : 1; let prev = 0;
    for (const r of rows) { const v = Math.round(r[c] * m); s(v - prev); prev = v; }
  }
  return new Uint8Array(bytes);
}
function playUnpack(bytes) {
  let o = 0; const u = () => { let v = 0, m = 1, b; do { b = bytes[o++]; v += (b & 127) * m; m *= 128; } while (b & 128); return v; };
  const s = () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; };
  const codec = u(); if (codec !== PLAY_CODEC) throw Error('play codec ' + codec);
  const np = u(), n = u(), step = u(), q = [u(), u(), u()], kinds = playColKinds(np), C = kinds.length;
  const keep = []; for (let i = 0; i < n; i += step) keep.push(i); if (keep[keep.length - 1] !== n - 1) keep.push(n - 1);
  const rows = keep.map(() => new Array(C));
  for (let c = 0; c < C; c++) {
    const k = kinds[c], m = k === 'p' ? q[0] : k === 'a' ? q[1] : k === 's' ? q[2] : 1; let prev = 0;
    for (const r of rows) { prev += s(); r[c] = prev / m; }
  }
  // the frames in between (a link keeps every 2nd or 3rd): blended, except whole numbers, which hold
  const out = new Array(n);
  for (let j = 0; j < keep.length; j++) {
    out[keep[j]] = playUnflat(rows[j], np);
    if (j + 1 < keep.length) for (let i = keep[j] + 1; i < keep[j + 1]; i++) {
      const t = (i - keep[j]) / (keep[j + 1] - keep[j]), A = rows[j], B = rows[j + 1];
      // (a jump, like a restart placing the players, isn't slid across: it holds, then cuts halfway)
      out[i] = playUnflat(A.map((v, c) => { const k = kinds[c], d = B[c] - v; return k === 'i' || (k === 'p' && Math.abs(d) > 60) || (k === 'a' && Math.abs(d) > 1.6) ? (t < 0.5 ? v : B[c]) : v + d * t; }), np);
    }
  }
  return out;
}
async function playDeflate(u8) {
  if (typeof CompressionStream === 'undefined') return { z: 0, data: u8 };
  const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter(); w.write(u8); w.close();
  return { z: 1, data: new Uint8Array(await new Response(cs.readable).arrayBuffer()) };
}
async function playInflate(u8, z) {
  if (!z) return u8;
  const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(u8); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
// ---- what a play needs to be drawn again later: teams, venue, format, fun modes, the score (all plain data)
function playClone(v) { try { return JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'function' || (typeof HTMLCanvasElement !== 'undefined' && x instanceof HTMLCanvasElement) ? undefined : x))); } catch (e) { return null; } }
function playMeta(S, score) {
  const teams = (S.teamDefs || []).map(t => playClone(t));
  return { teams, score: (score || (S.teams || []).map(t => t.score)).slice(), venue: playClone(S.venue || null), fmt: playClone(S.fmt), fun: playClone(S.fun || null),
    half: !!S.halfCourt, career: !!S.career, online: !!(Net.role || S.online), quarter: S.quarter, clock: S.clock };
}
// ---- storage (IndexedDB islamdunk-clips: v1 had "clips", the My clips videos; v2 adds "plays")
mycDB = function () {
  if (MYC.db) return Promise.resolve(MYC.db);
  return new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no IndexedDB')); return; }
    const r = indexedDB.open('islamdunk-clips', 2);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('clips')) db.createObjectStore('clips', { keyPath: 'id' }); if (!db.objectStoreNames.contains('plays')) db.createObjectStore('plays', { keyPath: 'id' }); };
    r.onsuccess = () => { MYC.db = r.result; MYC.db.onversionchange = () => { MYC.db.close(); MYC.db = null; }; res(MYC.db); }; r.onerror = () => rej(r.error);
  });
};
function playTx(mode, fn) { return mycDB().then(db => new Promise((res, rej) => { const t = db.transaction('plays', mode), st = t.objectStore('plays'), out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); })); }
function playsAll() { return playTx('readonly', st => st.getAll()).then(a => (a || []).sort((x, y) => y.at - x.at)); }
// keep every starred play and the newest PLAY_KEEP others
function playsTrim(st, all) { all.filter(r => !r.star).sort((x, y) => y.at - x.at).slice(PLAY_KEEP).forEach(r => st.delete(r.id)); }
async function playStore(rec) {
  const all = await playsAll().catch(() => []);
  const list = all.filter(r => r.id !== rec.id).concat(rec);
  return playTx('readwrite', st => { st.put(rec); playsTrim(st, list); });
}
// ---- saving
function playNewId() { return Date.now().toString(36) + rint(1e6).toString(36); }
async function playWrite(frames, info) {
  const raw = playPack(frames), z = await playDeflate(raw);
  const rec = Object.assign({ id: info.id || playNewId(), at: Date.now(), v: VERSION, kind: 'play', star: false, n: frames.length, np: frames[0].ps.length,
    codec: PLAY_CODEC, z: z.z, data: z.data, raw: raw.length }, info);
  delete rec.frames;
  await playStore(rec);
  Plays.writes++;
  return rec;
}
function playFinish(p, frames) {
  Plays.pending = null;
  if (!frames || frames.length < 30) { toast('Nothing to save yet'); return; }
  const prev = Plays.last, id = prev && p.t - prev.t < 3 ? prev.id : playNewId();   // twice within 3 s: replace the first
  Plays.last = { id, t: p.t };
  const peak = p.ev ? Math.max(0, frames.indexOf(p.ev.f)) : clamp(frames.indexOf(p.ref), 0, frames.length - 1);
  const info = { id, src: p.src, label: p.ev ? p.ev.label : 'PLAY', idx: p.ev ? p.ev.idx : p.idx, peak, meta: p.meta };
  Plays.busy = (Plays.busy || 0) + 1;
  return playWrite(frames, info).then(rec => { Plays.saved = rec.id; toast('Play saved: My plays', 2); SFX.good && SFX.good(); return rec; })
    .catch(e => { Plays.err = String(e && e.message || e); toast('Couldn’t save the play here', 2.5); })
    .finally(() => { Plays.busy--; });
}
function playYou() { const i = M.players.findIndex(q => q.human === 0); return i >= 0 ? i : Math.max(0, M.players.findIndex(q => q.human != null && q.human >= 0)); }
// press Save: the 8 s before now are already in the buffer; the 1 s after is waited for (unless the match is paused)
function savePlay(src) {
  if (!playsCanSave()) return false;
  const buf = Replay.buf; if (buf.length < 30) { toast('Nothing to save yet'); return false; }
  const ev = Plays.lastEv && Game.t - Plays.lastEv.t < 9 && buf.includes(Plays.lastEv.f) ? Plays.lastEv : null;
  const p = { src, buf, ref: buf[buf.length - 1], ev, idx: ev ? ev.idx : playYou(), meta: playMeta(M), t: Game.t };
  Plays.pending = p;                                         // (a press before the last one finished replaces it)
  if (Game.paused && !Net.role) playCapture(true);           // paused offline: nothing more will be drawn
  return true;
}
function playCapture(now) {
  const p = Plays.pending; if (!p) return;
  const i = p.buf.lastIndexOf(p.ref), after = i < 0 ? 0 : p.buf.length - 1 - i;
  if (!now && i >= 0 && after < PLAY_AFTER) return;
  const end = i < 0 ? p.buf.length : Math.min(p.buf.length, i + 1 + PLAY_AFTER), frames = p.buf.slice(Math.max(0, end - PLAY_BEFORE - PLAY_AFTER), end);
  return playFinish(p, frames);
}
// a game-picked highlight (the final screen): its own frames, label and player
function saveHighlight(clip) {
  if (!clip || !clip.frames || clip.frames.length < 30) return false;
  const S = (clip.share && clip.share.scene) || M, meta = playMeta(S, clip.share && clip.share.score);
  const prev = Plays.last, id = prev && prev.clip === clip ? prev.id : playNewId();
  Plays.last = { id, t: -99, clip };
  Plays.busy = (Plays.busy || 0) + 1;
  playWrite(clip.frames, { id, src: 'final', label: clip.label || 'HIGHLIGHT', idx: clip.idx, peak: clip.peak, meta })
    .then(rec => { Plays.saved = rec.id; clip.savedId = rec.id; toast('Play saved: My plays', 2); SFX.good && SFX.good(); })
    .catch(e => { Plays.err = String(e && e.message || e); toast('Couldn’t save the play here', 2.5); }).finally(() => { Plays.busy--; });
  return true;
}
// ---- hooks
{
  // every basket, block and steal calls FX.highlight: remember it (the label and player for a save) and show the touch pill
  const _hl = FX.highlight;
  FX.highlight = function (idx, w, label) {
    if (!M.attract && !M.practice && !M.mini) { Plays.lastEv = { idx, label: label || 'PLAY', t: Game.t, f: Replay.buf[Replay.buf.length - 1] }; Plays.btnUntil = Game.t + 4; Plays.btnSaved = false; }
    return _hl.apply(this, arguments);
  };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const sc = Game.screen;
    if (Input.pressed.KeyV && (sc === 'play' || sc === 'netplay') && playsCanSave()) { if (savePlay('key')) Plays.btnSaved = true; Input.pressed.KeyV = false; }
    if (Input.pressed.KeyV && sc === 'final') { const c = playFinalClip(); if (c) saveHighlight(c); Input.pressed.KeyV = false; }
    const r = _gu.apply(this, arguments);
    // the 1 s after: once 60 more frames are recorded, or at once when the match is left or over
    if (Plays.pending) { const p = Plays.pending; playCapture(Replay.buf !== p.buf || !(Game.screen === 'play' || Game.screen === 'netplay') || M.phase === 'over'); }
    return r;
  };
  // the pause menu: Save play under Resume
  const _pi = pauseItems;
  pauseItems = function () {
    const it = _pi.apply(this, arguments);
    if (playsCanSave()) { const done = Plays.last && Game.t - Plays.last.t < 3; it.splice(1, 0, [done ? 'Play saved ✓' : 'Save play (V)', () => { if (!done) savePlay('pause'); }]); }
    return it;
  };
  // touch: the pill at the top, beside the scoreboard, 4 s after a basket, block or steal
  const _r = render;
  render = function (g) {
    _r.apply(this, arguments);
    if (Input.touchMode && Game.t < Plays.btnUntil && playsCanSave() && !Game.paused && !Replay.active) drawSavePill(g);
  };
}
function drawSavePill(g) {
  const w = 132, h = 30, x = W / 2 - w / 2, y = 10, a = clamp((Plays.btnUntil - Game.t) / 0.4, 0, 1), done = Plays.btnSaved;
  g.save(); g.globalAlpha = a;
  g.fillStyle = done ? 'rgba(46,120,80,0.9)' : 'rgba(8,16,24,0.82)'; roundRect(g, x, y, w, h, 15); g.fill();
  g.strokeStyle = 'rgba(232,195,90,0.8)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#fff'; g.font = `13px ${FONT}`; g.textAlign = 'center'; g.fillText(done ? 'Saved ✓' : '● Save play', W / 2, y + 20);
  g.restore();
  addRect(x - 6, y - 7, w + 12, h + 14, () => { if (!Plays.btnSaved && savePlay('touch')) Plays.btnSaved = true; });   // (a 44 px tap area)
}
// the final screen: the clip shown in the panel (the top plays reel's current one, else the best)
function playFinalClip() {
  const hl = M.highlights || []; if (!hl.length || (Game.finalTab || 0) !== 0) return null;
  return REEL.on ? (hl[REEL.i] || hl[0]) : hl[0];
}
{
  const _df = drawFinalScreen;
  drawFinalScreen = function (g) {
    _df.apply(this, arguments);
    const c = playFinalClip(); if (!c) return;
    const done = !!c.savedId;
    uiButton(g, 392, 372, 112, 28, done ? 'Saved ✓' : 'Save play (V)', () => { if (!done) saveHighlight(c); }, false);
  };
}
