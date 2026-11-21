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
const PLAY_Q_STORE = [8, 1000, 100], PLAY_Q_LINK = [1, 50, 20];   // (a link: whole units and 1/50 rad, at most half a unit and 0.6° off)
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

// ================================================= v9.33.0: MY PLAYS (docs/plans/replays.md, step 2)
// The library: My plays on the main menu (and in the pause menu offline). A grid of the saved plays, newest first: the
// chosen one moves, the others show their peak; each card has the play's label, both teams and the date. Enter (a tap,
// A) watches it: the play with the instant replay's slow motion around its peak, looping, under the same bar a video
// has (ISLAM DUNK, the teams, the score, the play). Star keeps a play until it's deleted (the newest 20 others are kept).
// The videos kept in My clips before 9.33 are in the grid too, marked VIDEO: kept until deleted, they play as a video.
// A saved play is drawn with its own players, court and crowd (playScene), swapped in for the frame and back out, so
// the match or demo underneath is never touched. The moment's state beyond the frames
// (a hot spot, a free throw) isn't kept: a play is drawn as live play. (A classic court's crowd is random each time it's built, so the crowd
// behind a play isn't the same people as on the night; the players, the ball and the court are.)
const PlayLib = { mem: [], list: null, idx: 0, err: '', back: null, watch: null, confirm: null, row0: 0, frames: new Map(), loading: new Set(), scene: null, posters: new Map(), postQ: [] };
// (PlayLib.mem: plays shown without being stored, with their frames in memory: the Studio and the screen census set one up)
// the frames of a stored play, decoded once (the last 6 kept)
function playFramesOf(rec) {
  if (rec.frames) return rec.frames;
  const f = PlayLib.frames.get(rec.id); if (f) return f;
  if (!PlayLib.loading.has(rec.id) && rec.codec === PLAY_CODEC) {
    PlayLib.loading.add(rec.id);
    playInflate(rec.data, rec.z).then(u => { const fr = playUnpack(u); PlayLib.frames.set(rec.id, fr); if (PlayLib.frames.size > 6) PlayLib.frames.delete(PlayLib.frames.keys().next().value); })
      .catch(e => { rec.bad = String(e && e.message || e); }).finally(() => PlayLib.loading.delete(rec.id));
  }
  return null;
}
// what a saved play doesn't keep: the moment's state beyond the frames (a hot spot, a free throw, an inbound, a taunt...).
// A play is drawn as live play, whatever was going on.
const PLAY_SCENE = { attract: false, practice: null, gym: false, mini: null, balls: null, hot: null, ft: null, inb: null, check: null, taunt: null, highlights: [], phase: 'live',
  run: null, double: false, online: false, time: 0, introT: 0, pendingEnd: false };
// a saved play's own players, court and crowd (the live match and venue are left as they were)
function playScene(rec) {
  const m = rec.meta || {}, teams = m.teams || [], tA = teams[0], tB = teams[1];
  if (!tA || !tB) return null;
  const keep = { courtCv, crowdCv, crowd, VL, SHADOW, venue: M.venue, career: M.career }, scl = SFX.setCrowdLevel, rnd = Math.random;
  try {
    SFX.setCrowdLevel = () => {}; Math.random = seededRng(hash32(rec.id));       // (the crowd's random numbers aren't the match's)
    M.career = !!m.career;
    const T = [tA, tB].map((d, ti) => ({ def: d, score: (m.score || [])[ti] || 0, qs: [], players: (d.players || []).map((pd, s) => new Player(pd, ti, s, d)) }));
    const players = [...T[0].players, ...T[1].players];
    if (players.length < rec.np) return null;
    if (m.fun && m.fun.uncle) for (const p of players) p.outfit = 'thobe';
    if (m.venue && m.venue.kind !== 'classic') setVenue(m.venue, tA, tB); else { buildCourt(tA, tB); buildCrowd(tA, tB); setVenue(m.venue || null); }
    const scene = Object.assign({}, M, PLAY_SCENE, { teams: T, players, teamDefs: [tA, tB], fun: m.fun || null, fmt: m.fmt || M.fmt, halfCourt: !!m.half, venue: m.venue || null,
      quarter: m.quarter || 1, clock: m.clock != null ? m.clock : 0, career: !!m.career });
    return { scene, venue: VL, court: courtCv, crowdCanvas: crowdCv, crowdMembers: crowd, shadow: SHADOW, teams: [tA, tB], score: (m.score || [0, 0]).slice(), time: 0, ballState: 'held' };
  } catch (e) { rec.bad = String(e && e.message || e); return null; }
  finally {
    Math.random = rnd; SFX.setCrowdLevel = scl;
    courtCv = keep.courtCv; crowdCv = keep.crowdCv; crowd = keep.crowd; VL = keep.VL; SHADOW = keep.SHADOW; M.venue = keep.venue; M.career = keep.career;
  }
}
// one frame of a play, drawn into a cw x ch box (the clip video's camera: it follows the player, the ball and the rim);
// with `bar`, the video's bar on top and the play's label at the bottom
function playDraw(g, clip, meta, si, camS, k, cw, ch, bar) {
  const savedM = Object.assign({}, M), savedCam = Object.assign({}, cam), savedVL = VL, savedSh = SHADOW, parts = FX.parts, pops = FX.pops, sx = FX.sx, sy = FX.sy, flash = FX.flashA;
  const oldCourt = courtCv, oldCrowdCv = crowdCv, oldCrowd = crowd, oldBallState = ball.state, oldShot = ball.shot, oldTime = Game.t, oldEvent = FX.event, oldHype = FX.hypeV, oldScreen = Game.screen, imp = typeof Impact !== 'undefined' ? [Impact.rings, Impact.flash, Impact.trail] : null;
  let restore = null, vel = null;
  g.fillStyle = '#0b1722'; g.fillRect(0, 0, cw, ch);
  try {
    Game.screen = 'playview';                                // (drawn the same from any screen: some floor marks depend on it)
    Object.assign(M, meta.scene); VL = meta.venue; if (meta.shadow) SHADOW = meta.shadow; FX.parts = []; FX.pops = []; FX.sx = FX.sy = FX.flashA = 0;
    courtCv = meta.court || courtCv; crowdCv = meta.crowdCanvas || crowdCv; crowd = meta.crowdMembers || crowd;
    ball.state = meta.ballState || ball.state; ball.shot = meta.shot || null; Game.t = (meta.time || 0) + k / CLIP_FPS; FX.event = meta.event || null; FX.hypeV = meta.hype || 0;
    if (imp) { Impact.rings = []; Impact.flash = 0; Impact.trail = []; }      // (the live match's slam rings and flash aren't the play's)
    restore = Replay.apply(clip.frames[si]);
    // speed from the frame before (frames don't keep it): the sprint streaks behind fast runners
    const f0 = clip.frames[Math.max(0, si - 1)].ps; vel = M.players.map(q => [q.vx, q.vz]);
    M.players.forEach((q, i) => { const a = f0[i], b = clip.frames[si].ps[i]; if (a && b) { q.vx = (b[0] - a[0]) * 60; q.vz = (b[2] - a[2]) * 60; } });
    const p = M.players[clip.idx] || M.players[0], h = hoops[ball.x > COURT.L / 2 ? 1 : 0];
    const left = Math.min(p.x, ball.x, h.x) - 120, right = Math.max(p.x, ball.x, h.x) + 120;
    const top = Math.min(FLOOR_TOP + p.z * ZS - (p.y + 150) * depthK(p.z), FLOOR_TOP + ball.z * ZS - ball.y * depthK(ball.z), FLOOR_TOP + h.z * ZS - (RIM_Y + 75) * depthK(h.z)) - 40;
    const bottom = Math.max(FLOOR_TOP + p.z * ZS, FLOOR_TOP + h.z * ZS) + 60;
    const tx = (left + right) / 2 - W / 2, ty = (top + bottom) / 2, tz = clamp(Math.min(W / ((right - left) * K_NEAR), H / (bottom - top)), 1, 1.7);
    if (!camS.on) Object.assign(camS, { on: true, x: tx, fy: ty, z: tz });
    else { camS.x += (tx - camS.x) * 0.18; camS.fy += (ty - camS.fy) * 0.18; camS.z += (tz - camS.z) * 0.12; }
    cam.x = camS.x; cam.fy = camS.fy; cam.zoom = camS.z;
    const sc = Math.min(cw / W, ch / H);
    g.save(); g.beginPath(); g.rect(0, 0, cw, ch); g.clip(); g.translate(cw / 2 - W * sc / 2, ch / 2 - H * sc / 2); g.scale(sc, sc);
    g.translate(W / 2, H / 2); g.scale(cam.zoom, cam.zoom); g.translate(-W / 2, -cam.fy); drawScene(g, Game.t); g.restore();
  } finally {
    if (vel) M.players.forEach((q, i) => { if (vel[i]) { q.vx = vel[i][0]; q.vz = vel[i][1]; } });
    if (imp) { Impact.rings = imp[0]; Impact.flash = imp[1]; Impact.trail = imp[2]; }
    if (restore) restore(); Object.assign(M, savedM); Object.assign(cam, savedCam); VL = savedVL; SHADOW = savedSh; FX.parts = parts; FX.pops = pops; FX.sx = sx; FX.sy = sy; FX.flashA = flash;
    courtCv = oldCourt; crowdCv = oldCrowdCv; crowd = oldCrowd; ball.state = oldBallState; ball.shot = oldShot; Game.t = oldTime; FX.event = oldEvent; FX.hypeV = oldHype; Game.screen = oldScreen;
  }
  if (!bar) return;
  const u = cw / CLIP_W;                                   // (the bar is laid out for 1280 x 720)
  g.save(); g.scale(u, u); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(8,16,24,0.78)'; g.fillRect(0, 0, CLIP_W, 54);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('ISLAM DUNK', 24, 37);
  const A = clipName(meta.teams[0], 'Home'), B = clipName(meta.teams[1], 'Away');
  g.textAlign = 'right'; g.fillStyle = IVORY; g.font = `22px ${FONT}`; g.fillText(A + '  ' + meta.score[0] + ' – ' + meta.score[1] + '  ' + B, CLIP_W - 24, 36, CLIP_W - 330);
  const label = String(clip.label || 'HIGHLIGHT').toUpperCase();
  g.font = `30px ${FONT}`; const lw = Math.min(CLIP_W - 80, g.measureText(label).width + 48);
  g.fillStyle = 'rgba(8,16,24,0.8)'; roundRect(g, CLIP_W / 2 - lw / 2, CLIP_H - 72, lw, 50, 25); g.fill();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.fillText(label, CLIP_W / 2, CLIP_H - 36, CLIP_W - 120);
  g.restore();
}
// the clip video draws through the same function (one camera, one bar)
clipFrame = function (g, clip, meta, si, camS, k) { return playDraw(g, clip, meta, si, camS, k, CLIP_W, CLIP_H, true); };
// ---- the list: saved plays and the old My clips videos, newest first
function playsRefresh() {
  const plays = playsAll().catch(() => null), vids = mycTx('readonly', s => s.getAll()).catch(() => null);
  return Promise.all([plays, vids]).then(([P, V]) => {
    if (!P && !V) { PlayLib.list = []; PlayLib.err = 'My plays needs browser storage, which isn’t available here.'; return []; }
    const list = [...PlayLib.mem, ...(P || []), ...(V || []).map(v => Object.assign(v, { kind: 'video' }))].sort((a, b) => b.at - a.at);
    PlayLib.list = list; PlayLib.idx = clamp(PlayLib.idx, 0, Math.max(0, list.length - 1)); return list;
  });
}
function openMyPlays(from) {
  PlayLib.err = ''; PlayLib.list = null; PlayLib.idx = 0; PlayLib.row0 = 0; PlayLib.watch = null; PlayLib.confirm = null;
  PlayLib.back = from === 'pause' ? { screen: Game.screen } : null;
  Game.screen = 'myplays'; Game.idx = 0; playsRefresh();
}
function playsLeave() {
  if (MYC.overlay) MYC.overlay.close();
  if (PlayLib.watch) { PlayLib.watch = null; PlayLib.scene = null; playVideoReset(); return; }
  const b = PlayLib.back; PlayLib.back = null; PlayLib.scene = null; PlayLib.posters.clear(); playVideoReset();
  if (b) { Game.screen = b.screen; Game.paused = true; Game.idx = 0; } else goTitle();
}
function playLabel(r) { return String(r.label || (r.kind === 'video' ? 'Highlight' : 'Play')).toUpperCase(); }
function playTeamsLine(r) {
  const t = r.kind === 'video' ? (r.teams || []) : ((r.meta && r.meta.teams) || []).map(x => x && (x.short ? csClean(x.short, '') : clipName(x, '')));   // (short names: a card is narrow)
  const d = new Date(r.at), date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (t.filter(Boolean).length ? t.join(' vs ') + '  •  ' : '') + date;
}
// the scene of the play being watched or animated (one at a time: the canvases are big)
function playSceneFor(rec) {
  if (PlayLib.scene && PlayLib.scene.id === rec.id) return PlayLib.scene.meta;
  const meta = playScene(rec); PlayLib.scene = { id: rec.id, meta }; return meta;
}
// a still of a play's peak for its card (made one card a frame, so opening the screen doesn't stall)
function playPoster(rec) {
  if (rec.kind === 'video') return mycThumb(rec);
  const c = PlayLib.posters.get(rec.id); if (c) return c;
  if (!PlayLib.postQ.includes(rec.id)) PlayLib.postQ.push(rec.id);
  return null;
}
function playPosterStep() {
  const id = PlayLib.postQ.shift(); if (!id) return;
  const rec = (PlayLib.list || []).find(r => r.id === id); if (!rec) return;
  const fr = playFramesOf(rec); if (!fr) { PlayLib.postQ.push(id); return; }
  const meta = playScene(rec); if (!meta) { PlayLib.posters.set(id, false); return; }
  const cv = makeCanvas(444, 250), clip = { frames: fr, idx: rec.idx, label: rec.label }, camS = {}, pk = clamp(rec.peak | 0, 0, fr.length - 1);
  for (let i = Math.max(0, pk - 40); i < pk; i += 8) playDraw(cv.getContext('2d'), clip, meta, i, camS, 0, 444, 250, false);   // (eases the camera in)
  playDraw(cv.getContext('2d'), clip, meta, pk, camS, 0, 444, 250, false);
  PlayLib.posters.set(id, cv);
}
// ---- starring and deleting
function playStar(rec) {
  if (!rec || rec.kind === 'video') return;
  rec.star = !rec.star; SFX.blip();
  return playTx('readwrite', st => { st.put(Object.assign({}, rec, { frames: undefined })); }).then(() => { if (!rec.star) return playsAll().then(all => playTx('readwrite', st => playsTrim(st, all))); })
    .then(() => toast(rec.star ? 'Starred: kept until you delete it' : 'Unstarred: one of your 20 recent plays', 2)).catch(() => toast('Couldn’t change this play here', 2));
}
function playDelete(rec) {
  if (!rec) return;
  if (rec.link) { PlayLib.mem = PlayLib.mem.filter(x => x !== rec); PlayLib.watch = null; playsRefresh(); return; }   // (a play from a link isn't stored)
  if (PlayLib.confirm !== rec.id) { PlayLib.confirm = rec.id; toast('Press Delete again to remove this ' + (rec.kind === 'video' ? 'clip' : 'play'), 2.5); return; }
  PlayLib.confirm = null; PlayLib.watch = null; PlayLib.posters.delete(rec.id);
  (rec.kind === 'video' ? mycTx('readwrite', s => s.delete(rec.id)) : playTx('readwrite', st => st.delete(rec.id))).then(playsRefresh);
  toast('Removed', 1.5);
}
// ---- watching
function playWatch(rec) {
  if (!rec) return;
  if (rec.kind === 'video') { mycPlay(rec); return; }
  PlayLib.watch = { id: rec.id, t0: Game.t, camS: {}, k: -1, focus: 0 }; PlayLib.confirm = null; SFX.blip();
  if (!rec.bad) { playLinkPrep(rec); if (playCanShareFiles()) playVideoStart(rec); }   // (a phone: the video is ready by the time Share is tapped)
}
function playWatchRec() { const w = PlayLib.watch; return w && ((PlayLib.list || []).find(r => r.id === w.id) || PlayLib.mem.find(r => r.id === w.id)); }
// the watch view's buttons: Star, Share (step 3), Delete; left / right choose, Enter presses
function playWatchActs(rec) {
  if (rec.bad) return [];
  const share = ['Share', () => playShare(rec), playShareLabel(rec)], link = PlayShare.linkId === rec.id && PlayShare.link ? [['Copy link', () => playCopyLink(rec)]] : [];
  if (rec.kind === 'video') return [share, ['Delete', () => playDelete(rec)]];
  if (rec.link) return [[rec.kept ? 'Kept ✓' : 'Keep in My plays', () => playKeep(rec)], share, ...link];
  return [[rec.star ? '★ Starred' : '☆ Star', () => playStar(rec)], share, ...link, ['Delete', () => playDelete(rec)]];
}
const PLAY_VIEW = { x: 120, y: 58, w: 720, h: 405 };
let playCv = null;
function drawPlayWatch(g, rec) {
  const w = PlayLib.watch, V = PLAY_VIEW;
  g.fillStyle = '#0b1722'; g.fillRect(V.x, V.y, V.w, V.h);
  const fr = playFramesOf(rec), meta = fr && playSceneFor(rec);
  if (!fr || !meta) {
    g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.textAlign = 'center';
    const msg = rec.bad === 'version' ? 'This play was made on Islam Dunk ' + rec.v + '. Open the link on that version to watch it (this is ' + VERSION + ').'
      : rec.bad === 'broken' ? 'This link is broken: part of it may be missing. Ask your friend to copy it again.'
      : rec.bad || rec.codec !== PLAY_CODEC ? 'This play can’t be shown here (made on ' + (rec.v || 'another version') + ').' : 'Loading…';
    wrapText(g, msg, W / 2, V.y + V.h / 2, V.w - 80, 22);
  } else {
    const clip = { frames: fr, idx: rec.idx, peak: rec.peak, label: rec.label }, plan = w.plan || (w.plan = clipPlan(clip));
    const k = Math.floor((Game.t - w.t0) * CLIP_FPS) % (plan.length + 20);
    if (k < w.k) w.camS = {};                                              // (looped: the camera starts again)
    w.k = k;
    if (!playCv || playCv.width !== 960) playCv = makeCanvas(960, 540);
    playDraw(playCv.getContext('2d'), clip, meta, plan[Math.min(k, plan.length - 1)], w.camS, k, 960, 540, true);
    g.drawImage(playCv, V.x, V.y, V.w, V.h);
  }
  g.strokeStyle = 'rgba(232,195,90,0.7)'; g.lineWidth = 2; g.strokeRect(V.x, V.y, V.w, V.h);
  const acts = playWatchActs(rec), bw = acts.length > 3 ? 176 : 190, x0 = W / 2 - (acts.length * bw + (acts.length - 1) * 12) / 2;
  w.focus = clamp(w.focus, 0, acts.length - 1);
  acts.forEach((a, i) => uiButton(g, x0 + i * (bw + 12), 474, bw, 40, a[0] === 'Delete' && PlayLib.confirm === rec.id ? 'Tap again to delete' : a[2] || a[0], a[1], i === w.focus));
  if (!Input.touchMode && acts.length) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('← → choose   Enter press' + (rec.kind === 'play' && !rec.link ? '   S star   X delete' : '') + '   Esc back to My plays', W / 2, 532); }
}
function playWatchUpdate(rec) {
  const w = PlayLib.watch, acts = playWatchActs(rec);
  if (PlayShare.id === rec.id && PlayShare.state === 'wait') playVideoStart(rec);
  if (!acts.length) return;
  if (menuHit('left')) { w.focus = (w.focus + acts.length - 1) % acts.length; SFX.blip(); }
  if (menuHit('right')) { w.focus = (w.focus + 1) % acts.length; SFX.blip(); }
  if (menuHit('ok')) (acts[w.focus] || acts[0])[1]();
  else if (rec.kind === 'play' && !rec.link && Input.pressed.KeyS) playStar(rec);
  else if (rec.kind !== 'link' && !rec.link && (Input.pressed.Delete || Input.pressed.KeyX)) playDelete(rec);
}
// ---- the grid
const PG = { cols: 4, rows: 2, x0: 24, y0: 92, w: 222, gap: 12, th: 125, h: 176 };
function myPlaysUpdate() {
  if (MYC.overlay) return;
  playPosterStep();
  const L = PlayLib.list || [], n = L.length;
  if (PlayLib.watch) { const rec = playWatchRec(); if (!rec) { if (PlayLib.list) PlayLib.watch = null; } else { playWatchUpdate(rec); if (menuHit('back')) playsLeave(); return; } }
  if (n) {
    const c = PG.cols, i = PlayLib.idx, mv = d => { const j = clamp(i + d, 0, n - 1); if (j !== i) { PlayLib.idx = j; PlayLib.confirm = null; SFX.blip(); } };
    if (menuHit('left')) mv(-1); if (menuHit('right')) mv(1); if (menuHit('up')) mv(-c); if (menuHit('down')) mv(c);
    const rec = L[PlayLib.idx];
    if (menuHit('ok')) playWatch(rec);
    else if (Input.pressed.KeyS) playStar(rec);
    else if (Input.pressed.Delete || Input.pressed.KeyX) playDelete(rec);
  }
  if (menuHit('back')) playsLeave();
}
let playThumbCv = null;
function drawMyPlays(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  try {
    const L = PlayLib.list, rec = PlayLib.watch ? playWatchRec() : L && L[PlayLib.idx];
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('My plays', W / 2, PlayLib.watch ? 42 : 44);
    if (PlayLib.watch && rec) { drawPlayWatch(g, rec); return; }
    g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Your last 20 saved plays, and every one you star. Saved on this device only.', W / 2, 70);
    if (!L) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('Loading…', W / 2, 260); return; }
    if (!L.length) { g.fillStyle = '#9fb3c8'; g.font = `15px ${BODY}`; wrapText(g, PlayLib.err || 'No saved plays yet. In a game, press V, choose Save play in the pause menu, or tap Save play after a basket.', W / 2, 240, 640, 22); return; }
    const c = PG.cols, rowOf = Math.floor(PlayLib.idx / c);
    PlayLib.row0 = clamp(PlayLib.row0, rowOf - PG.rows + 1, rowOf);
    for (let k = 0; k < c * PG.rows; k++) {
      const i = PlayLib.row0 * c + k, r = L[i]; if (!r) break;
      const x = PG.x0 + (k % c) * (PG.w + PG.gap), y = PG.y0 + Math.floor(k / c) * (PG.h + PG.gap), on = i === PlayLib.idx;
      g.fillStyle = on ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.06)'; roundRect(g, x - 4, y - 4, PG.w + 8, PG.h + 8, 10); g.fill();
      g.fillStyle = '#0b1722'; g.fillRect(x, y, PG.w, PG.th);
      let drew = false;
      if (on && r.kind !== 'video') {                     // the chosen play moves (real speed, looping)
        const fr = playFramesOf(r), meta = fr && playSceneFor(r);
        if (fr && meta) {
          if (!playThumbCv) playThumbCv = makeCanvas(444, 250);
          const ps = PlayLib.thumb && PlayLib.thumb.id === r.id ? PlayLib.thumb : (PlayLib.thumb = { id: r.id, t0: Game.t, camS: {}, last: -1 });
          const si = Math.floor((Game.t - ps.t0) * 60) % fr.length; if (si < ps.last) ps.camS = {}; ps.last = si;
          playDraw(playThumbCv.getContext('2d'), { frames: fr, idx: r.idx, label: r.label }, meta, si, ps.camS, si / 2, 444, 250, false);
          g.drawImage(playThumbCv, x, y, PG.w, PG.th); drew = true;
        }
      }
      if (!drew) { const im = playPoster(r); if (im) { g.drawImage(im, x, y, PG.w, PG.th); drew = true; } }
      if (!drew) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'center'; g.fillText(r.bad ? 'Can’t show this play' : '…', x + PG.w / 2, y + PG.th / 2 + 4); }
      if (r.kind === 'video') { g.fillStyle = 'rgba(0,0,0,0.7)'; roundRect(g, x + 6, y + 6, 54, 20, 10); g.fill(); g.fillStyle = '#fff'; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText('VIDEO', x + 33, y + 20); }
      if (r.star) { g.fillStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.arc(x + PG.w - 16, y + 16, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = GOLD; drawStar(g, x + PG.w - 16, y + 16, 8); }
      g.textAlign = 'left'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.fillText(fitText(g, playLabel(r), PG.w - 8), x + 4, y + PG.th + 20);
      g.fillStyle = on ? NIGHT : '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(fitText(g, playTeamsLine(r), PG.w - 8), x + 4, y + PG.th + 40);
      addRect(x - 4, y - 4, PG.w + 8, PG.h + 8, () => { if (PlayLib.idx === i || Input.touchMode) { PlayLib.idx = i; playWatch(r); } else { PlayLib.idx = i; PlayLib.confirm = null; } });
    }
    const pages = Math.ceil(L.length / c);
    if (pages > PG.rows) {                                     // more rows: arrows that scroll
      if (PlayLib.row0 > 0) uiButton(g, W / 2 - 150, 466, 140, 32, '▲ Newer', () => { PlayLib.idx = Math.max(0, PlayLib.idx - c); }, false);
      if (PlayLib.row0 + PG.rows < pages) uiButton(g, W / 2 + 10, 466, 140, 32, '▼ Older', () => { PlayLib.idx = Math.min(L.length - 1, PlayLib.idx + c); }, false);
    }
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`;
    g.fillText(Input.touchMode ? 'Tap a play to watch it, star it, or delete it.' : '← → ↑ ↓ choose   Enter watch   S star   X delete   Esc back', W / 2, 522);
  } finally { W = rw; Game.ox = 0; g.restore(); }
}
{
  const SCR = { myplays: [myPlaysUpdate, drawMyPlays] };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments); if (was && Game.screen === sc) { SCR[sc][0](); if (!PlayLib.back) attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s[1](g); drawBackButton(g); };
  BACK.myplays = () => playsLeave();
  // the main menu: My plays above Settings; My clips (Settings > Extras) is now part of it
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    const m = _tm.apply(this, arguments).map(e => !e.sub ? e : Object.assign({}, e, { sub: e.sub.map(s => !s.sub ? s : Object.assign({}, s, { sub: s.sub.filter(x => x.label !== 'My clips') })).filter(s => s.label !== 'My clips') }));
    const at = m.findIndex(e => e.label === 'Settings' || e.label === 'Options');
    m.splice(at < 0 ? m.length : at, 0, { label: 'My plays', act: () => openMyPlays() });
    return m;
  };
  // the pause menu (offline: online the match has to keep running on its own screen): My plays under Save play
  const _pi = pauseItems;
  pauseItems = function () {
    const it = _pi.apply(this, arguments);
    if (!Net.role && Game.screen === 'play' && !M.practice && !M.attract) { const i = it.findIndex(x => /^(Save play|Play saved)/.test(x[0])); it.splice(i >= 0 ? i + 1 : 1, 0, ['My plays', () => openMyPlays('pause')]); }
    return it;
  };
  // the old My clips screen goes to My plays
  openMyClips = function () { openMyPlays(); };
}

// ================================================= v9.33.0: SHARE A PLAY (docs/plans/replays.md, step 3)
// Share on a saved play makes its video (as Share → Make video does: the play at 30 fps, slow motion at its peak, the
// bar on top, about 5 s, no sound) and opens the share sheet with the file, so it's two taps to WhatsApp or Instagram.
//   * Where a file can be shared (phones), the video is made while you watch the play, so Share opens the sheet at
//     once: the sheet needs the tap itself (a browser lets a page open it only within a moment of a tap). If Share is
//     tapped before the video is ready, it opens the sheet when it is, or, if the browser says that's too late, the
//     button becomes Send video for one more tap.
//   * Where a file can't be shared, Share downloads the video; where video can't be recorded, the still image.
//   * A video kept in My clips before 9.33 is shared as it is.
// Copy link puts the play itself in a link: the frames at 30 fps (every 2nd, blended back when it plays) rounded for a
// link, and the teams, score, venue and format, deflated and base64url'd into the address's #play= part, which is never
// sent to a server. Only if it fits in 8 KB: 30 fps when it does, else 20 fps (6-8 KB a play), else no link. Opening the link
// goes straight to watching the play, with Keep in My plays. A link starts with the version it was made on: one made
// on another minor version (9.32, 9.34) says so instead of drawing a play its frames may not fit.
// Names in a link and a video (the teams, the players) go through the word filter (csClean), as online play does.
const PlayShare = { id: null, job: null, blob: null, name: '', state: null, prog: 0, want: false, send: false, link: null, linkId: null };
const PLAY_LINK_MAX = 8192;
function playVideoReset() {
  const j = PlayShare.job; if (j) { j.cancelled = true; try { if (j.mr.state !== 'inactive') j.mr.stop(); } catch (e) {} }
  Object.assign(PlayShare, { id: null, job: null, blob: null, name: '', state: null, prog: 0, want: false, send: false });
}
function playCanShareFiles() { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(8)], 'x.mp4', { type: 'video/mp4' })] })); } catch (e) { return false; } }
// make the video in the background, in real time (MediaRecorder records what's drawn as it's drawn)
function playVideoStart(rec) {
  if (PlayShare.id === rec.id && PlayShare.state && PlayShare.state !== 'wait') return;
  if (PlayShare.id !== rec.id) playVideoReset();
  PlayShare.id = rec.id;
  if (rec.kind === 'video') { Object.assign(PlayShare, { blob: rec.blob, name: rec.name || 'islam-dunk-clip.webm', state: 'done', prog: 1 }); return; }
  const type = clipVideoType(); if (!type) { PlayShare.state = 'none'; return; }
  const fr = playFramesOf(rec), meta = fr && playSceneFor(rec); if (!fr || !meta) { PlayShare.state = 'wait'; return; }
  const clip = { frames: fr, idx: rec.idx, peak: rec.peak, label: rec.label }, plan = clipPlan(clip), cv = makeCanvas(CLIP_W, CLIP_H), g = cv.getContext('2d'), camS = {};
  let mr, stream; const chunks = [];
  try { playDraw(g, clip, meta, plan[0], camS, 0, CLIP_W, CLIP_H, true); stream = cv.captureStream(CLIP_FPS); mr = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5000000 }); }
  catch (e) { PlayShare.state = 'none'; return; }
  const job = PlayShare.job = { cancelled: false, mr, i: 0, t0: 0 };
  Object.assign(PlayShare, { state: 'rec', prog: 0, name: clipFileName(clip, meta, type) });
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    if (job.cancelled || PlayShare.job !== job) return;
    PlayShare.job = null; PlayShare.blob = new Blob(chunks, { type: type.split(';')[0] }); PlayShare.state = PlayShare.blob.size ? 'done' : 'none'; PlayShare.prog = 1;
    if (PlayShare.want) playShareNow();
  };
  mr.start(250); job.t0 = performance.now();
  const tick = () => {
    if (job.cancelled) return;
    const due = Math.min(plan.length - 1, Math.floor((performance.now() - job.t0) / (1000 / CLIP_FPS)));
    while (job.i < due) { job.i++; playDraw(g, clip, meta, plan[job.i], camS, job.i, CLIP_W, CLIP_H, true); }
    PlayShare.prog = job.i / (plan.length - 1);
    if (job.i >= plan.length - 1) { setTimeout(() => { if (!job.cancelled && mr.state !== 'inactive') mr.stop(); }, 150); return; }
    setTimeout(tick, 1000 / CLIP_FPS / 2);
  };
  setTimeout(tick, 1000 / CLIP_FPS);
}
function playFile() { return new File([PlayShare.blob], PlayShare.name, { type: PlayShare.blob.type || 'video/webm' }); }
function playCanShareThis() { try { return !!(PlayShare.blob && navigator.share && navigator.canShare && navigator.canShare({ files: [playFile()] })); } catch (e) { return false; } }
function playDownload() {
  if (!PlayShare.blob) return;
  try { const url = URL.createObjectURL(PlayShare.blob), a = document.createElement('a'); a.download = PlayShare.name; a.href = url; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); PlayShare.downloaded = PlayShare.name; toast('Video ready: check your downloads.', 2.5); }
  catch (e) { toast('Saving isn’t available here.', 2.5); }
}
// Share: the sheet with the video where it can, else a download
function playShare(rec) {
  playVideoStart(rec);
  if (PlayShare.state === 'none') { toast(clipVideoType() ? 'The video couldn’t be made here.' : 'This browser can’t make videos. Try Copy link.', 3); return; }
  if (PlayShare.state !== 'done') { PlayShare.want = true; SFX.blip(); return; }
  playShareNow();
}
function playShareNow() {
  PlayShare.want = false; PlayShare.send = false;
  if (!playCanShareThis()) { playDownload(); return; }
  try {
    navigator.share({ files: [playFile()], title: 'Islam Dunk' }).then(() => { PlayShare.shared = PlayShare.name; })
      .catch(e => { if (e && e.name === 'NotAllowedError') PlayShare.send = true; });   // (too long after the tap: one more tap sends it)
  } catch (e) { PlayShare.send = true; }
}
function playShareLabel(rec) {
  if (rec && PlayShare.id === rec.id) {
    if (PlayShare.want) return 'Making video ' + Math.round(PlayShare.prog * 100) + '%';
    if (PlayShare.send) return 'Send video';
  }
  return playCanShareFiles() || !clipVideoType() ? 'Share' : 'Save video';
}
// ---- the link
const b64url = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64url = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
// what a link carries besides the frames: the play's label and player, and its metadata with every name filtered
function playLinkMeta(rec) {
  const m = playClone(rec.meta) || {};
  for (const t of m.teams || []) { if (!t) continue; t.name = csClean(t.name, 'Home'); if (t.short) t.short = csClean(t.short, 'TEAM'); for (const p of t.players || []) if (p) p.name = csClean(p.name, 'Player'); }
  return { label: csClean(rec.label, 'PLAY'), idx: rec.idx, peak: rec.peak, np: rec.np, meta: m };
}
async function playLinkMake(rec) {
  if (typeof CompressionStream === 'undefined') return null;
  const fr = rec.frames || PlayLib.frames.get(rec.id) || playUnpack(await playInflate(rec.data, rec.z));
  const head = new TextEncoder().encode(JSON.stringify(playLinkMeta(rec)));
  for (const step of [2, 3]) {
    const body = playPack(fr, PLAY_Q_LINK, step), all = new Uint8Array(3 + head.length + body.length);
    all[0] = 1; all[1] = head.length >> 8; all[2] = head.length & 255; all.set(head, 3); all.set(body, 3 + head.length);
    const z = await playDeflate(all);
    if (z.data.length <= PLAY_LINK_MAX) return { url: location.origin + location.pathname + location.search + '#play=' + VERSION + '.' + b64url(z.data), bytes: z.data.length, step };
  }
  return null;
}
function playLinkPrep(rec) {
  if (rec.kind === 'video' || PlayShare.linkId === rec.id) return;
  PlayShare.linkId = rec.id; PlayShare.link = 'making';
  playLinkMake(rec).then(l => { if (PlayShare.linkId === rec.id) PlayShare.link = l; }).catch(() => { if (PlayShare.linkId === rec.id) PlayShare.link = null; });
}
function playCopyLink(rec) {
  const L = PlayShare.linkId === rec.id ? PlayShare.link : null;
  if (!L || L === 'making') { playLinkPrep(rec); toast(L === 'making' ? 'One moment…' : 'This play is too long for a link. Use Share.', 2); return; }
  const done = () => { PlayShare.copied = L.url; toast('Link copied: send it to a friend', 2.5); SFX.good && SFX.good(); };
  const other = () => { try { if (navigator.share) { navigator.share({ title: 'Islam Dunk', url: L.url }).catch(() => {}); return; } } catch (e) {} toast('Copying isn’t available here.', 2.5); };
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(L.url).then(done, other); return; } } catch (e) {}
  other();
}
const minorOf = v => String(v || '').split('.').slice(0, 2).join('.');
// open a #play= link: straight to watching it (a play from another version: a note saying which)
async function playLinkOpen(hash) {
  const m = /^#play=(\d+\.\d+\.\d+)\.([A-Za-z0-9_-]+)$/.exec(hash || ''); if (!m) return false;
  const v = m[1], id = 'link-' + hash32(m[2]).toString(36);
  let rec = PlayLib.mem.find(r => r.id === id);
  if (!rec) {
    rec = { id, kind: 'play', link: true, at: Date.now(), v, label: 'A SHARED PLAY', meta: {}, star: false };
    if (minorOf(v) !== minorOf(VERSION)) rec.bad = 'version';
    else try {
      const u = await playInflate(unb64url(m[2]), 1), n = (u[1] << 8) | u[2], head = JSON.parse(new TextDecoder().decode(u.subarray(3, 3 + n)));
      const frames = playUnpack(u.subarray(3 + n));
      Object.assign(rec, { codec: PLAY_CODEC, label: head.label, idx: head.idx, peak: head.peak, np: head.np, n: frames.length, frames, meta: head.meta });
    } catch (e) { rec.bad = 'broken'; }
    PlayLib.mem.push(rec);
  }
  openMyPlays(); playWatch(rec);
  return true;
}
// keep a play from a link: stored as if saved here
function playKeep(rec) {
  if (!rec.frames || rec.kept) return;
  rec.kept = true;
  playWrite(rec.frames, { src: 'link', label: rec.label, idx: rec.idx, peak: rec.peak, meta: rec.meta }).then(r => {
    PlayLib.mem = PlayLib.mem.filter(x => x !== rec); toast('Kept in My plays', 2); SFX.good && SFX.good(); return playsRefresh().then(() => { PlayLib.watch = { id: r.id, t0: Game.t, camS: {}, k: -1, focus: 0 }; });
  }).catch(() => { rec.kept = false; toast('Couldn’t keep the play here', 2.5); });
}
{
  // a link opens once the game is on its title screen (after the splash and any first-launch dialog)
  const _gu = gameUpdate;
  let checked = false;
  gameUpdate = function (rdt) {
    const r = _gu.apply(this, arguments);
    if (!checked && Game.screen === 'title' && !Game.confirm) {
      checked = true;
      if (/^#play=/.test(location.hash)) { const h = location.hash; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} playLinkOpen(h); }
    }
    return r;
  };
  addEventListener('hashchange', () => { if (/^#play=/.test(location.hash) && (Game.screen === 'title' || Game.screen === 'myplays')) { const h = location.hash; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} playLinkOpen(h); } });
}
