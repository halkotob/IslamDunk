// ================================================= v9.5: TOP PLAYS REEL AND MY CLIPS
//   * Top plays: after a game with two or more highlights, "Top plays" (T) plays the best three back to
//     back in the post-game panel, each with its label and player, then returns to the best play.
//   * My clips: when a clip video is made (Share → Make video), "Keep in My clips" stores it in this
//     browser (IndexedDB, up to 12; the oldest goes first). Options → Extras → My clips lists them with
//     their poster, plays them, saves them to a file again, or deletes them. Nothing leaves the device.
//     Browsers that can't record video keep the still image instead, as before.

// ---- top plays
const REEL = { on: false, i: 0, t0: 0, n: 0 };
function reelStart() { const hl = M.highlights || []; if (hl.length < 2) return; Object.assign(REEL, { on: true, i: 0, t0: Game.t, n: Math.min(3, hl.length) }); SFX.blip(); }
{
  const _df = drawFinalScreen;
  drawFinalScreen = function (g) {
    const hl = M.highlights || [], tab = Game.finalTab || 0;
    if (!REEL.on || tab !== 0 || hl.length < 2) { REEL.on = false; _df.apply(this, arguments); }
    else {
      let clip = hl[REEL.i];
      if ((Game.t - REEL.t0) * 60 >= clip.frames.length) { REEL.i++; REEL.t0 = Game.t; if (REEL.i >= REEL.n) { REEL.on = false; hl[0].t0 = Game.t; } clip = hl[REEL.i] || hl[0]; }
      if (REEL.on) {
        const order = [clip, ...hl.filter(c => c !== clip)], keep = M.highlights; clip.t0 = REEL.t0;
        M.highlights = order; try { _df.apply(this, arguments); } finally { M.highlights = keep; }
        const who = M.players[clip.idx], label = 'TOP PLAYS ' + (REEL.i + 1) + '/' + REEL.n + ': ' + (clip.label || 'HIGHLIGHT') + (who ? ' • ' + who.def.name.toUpperCase() : '');
        g.font = `11px ${FONT}`; const lw = Math.max(g.measureText(label).width + 22, 300);
        g.fillStyle = 'rgba(0,0,0,0.9)'; roundRect(g, 400, 160, lw, 22, 11); g.fill();
        g.fillStyle = '#ffcf6a'; g.textAlign = 'left'; g.fillText(label, 411, 175);
      } else _df.apply(this, arguments);
    }
    if (tab === 0 && hl.length >= 2 && !Net.role) uiButton(g, 512, 372, 122, 28, REEL.on ? '■ Stop' : '▶ Top plays (T)', () => { if (REEL.on) REEL.on = false; else reelStart(); }, false);
  };
  const _fu = finalUpdate;
  finalUpdate = function () { if (Input.pressed.KeyT && (M.highlights || []).length >= 2 && !Net.role) { if (REEL.on) REEL.on = false; else reelStart(); } return _fu.apply(this, arguments); };
  const _nm = newMatch;
  newMatch = function () { REEL.on = false; return _nm.apply(this, arguments); };
}

// ---- My clips (IndexedDB)
const MYC = { db: null, list: null, idx: 0, busy: false, thumbs: new Map(), overlay: null, MAX: 12 };
function mycDB() {
  if (MYC.db) return Promise.resolve(MYC.db);
  return new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no IndexedDB')); return; }
    const r = indexedDB.open('islamdunk-clips', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('clips', { keyPath: 'id' }); };
    r.onsuccess = () => { MYC.db = r.result; res(MYC.db); }; r.onerror = () => rej(r.error);
  });
}
function mycTx(mode, fn) { return mycDB().then(db => new Promise((res, rej) => { const t = db.transaction('clips', mode), s = t.objectStore('clips'), out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); })); }
function mycRefresh() {
  return mycTx('readonly', s => s.getAll()).then(all => { MYC.list = (all || []).sort((a, b) => b.at - a.at); MYC.idx = clamp(MYC.idx, 0, Math.max(0, MYC.list.length - 1)); return MYC.list; })
    .catch(() => { MYC.list = []; MYC.err = 'My clips needs browser storage, which isn’t available here.'; return []; });
}
function mycKeep() {
  if (!ClipVid.blob || MYC.busy) return;
  MYC.busy = true;
  let poster = ''; try { const c = makeCanvas(320, 180); c.getContext('2d').drawImage(ClipVid.poster, 0, 0, 320, 180); poster = c.toDataURL('image/jpeg', 0.8); } catch (e) {}
  const clip = ShareCard.clips && ShareCard.clips[ShareCard.index], meta = clip && (clip.share || {}), teams = (meta.teams || []).map(t => t && t.name || '');
  const rec = { id: Date.now().toString(36) + rint(1e6).toString(36), at: Date.now(), name: ClipVid.name, type: ClipVid.blob.type, blob: ClipVid.blob, poster,
    label: (clip && clip.label) || 'Highlight', teams, score: meta.score || [] };
  mycRefresh().then(list => mycTx('readwrite', s => { s.put(rec); list.slice(MYC.MAX - 1).forEach(o => s.delete(o.id)); }))
    .then(() => { MYC.saved = ClipVid.name; toast('Kept in My clips (Options → Extras)', 2.5); SFX.good && SFX.good(); })
    .catch(() => toast('This browser can’t keep clips', 2.5)).finally(() => { MYC.busy = false; mycRefresh(); });
}
{
  const _dv = drawClipVideo;
  drawClipVideo = function (g) {
    _dv.apply(this, arguments);
    if (ClipVid.state === 'done' && ClipVid.blob) {
      const kept = MYC.saved === ClipVid.name;
      uiButton(g, W / 2 - 110, 488, 220, 34, kept ? 'Kept in My clips ✓' : MYC.busy ? 'Keeping…' : 'Keep in My clips (K)', () => { if (!kept) mycKeep(); }, false);
    }
  };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    if (Game.screen === 'clipvideo' && ClipVid.state === 'done' && Input.pressed.KeyK && MYC.saved !== ClipVid.name) { mycKeep(); Input.pressed.KeyK = false; }
    return _gu.apply(this, arguments);
  };
}
// the list screen
function openMyClips() { MYC.err = ''; MYC.list = null; MYC.idx = 0; Game.screen = 'myclips'; mycRefresh(); }
function mycThumb(rec) {
  if (!rec.poster) return null;
  let im = MYC.thumbs.get(rec.id); if (!im) { im = new Image(); im.src = rec.poster; MYC.thumbs.set(rec.id, im); }
  return im.complete && im.naturalWidth ? im : null;
}
function mycPlay(rec) {
  if (!rec || MYC.overlay) return;
  const url = URL.createObjectURL(rec.blob), wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(4,10,16,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px';
  const v = document.createElement('video'); v.src = url; v.controls = true; v.autoplay = true; v.playsInline = true; v.loop = true;
  v.style.cssText = 'max-width:92vw;max-height:78vh;border:2px solid #e8c35a;border-radius:8px;background:#000';
  const b = document.createElement('button'); b.textContent = 'Close'; b.style.cssText = 'font:16px sans-serif;padding:10px 28px;border-radius:20px;border:1px solid #e8c35a;background:#1d2b38;color:#fff;cursor:pointer';
  const close = () => { try { v.pause(); } catch (e) {} wrap.remove(); URL.revokeObjectURL(url); MYC.overlay = null; removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); close(); } };
  b.onclick = close; wrap.onclick = e => { if (e.target === wrap) close(); };
  addEventListener('keydown', key, true);
  wrap.append(v, b); document.body.appendChild(wrap); MYC.overlay = { close };
}
function mycSave(rec) {
  if (!rec) return;
  try { const url = URL.createObjectURL(rec.blob), a = document.createElement('a'); a.download = rec.name || 'islam-dunk-clip.webm'; a.href = url; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Video ready: check your downloads.'); }
  catch (e) { toast('Saving isn’t available here.'); }
}
function mycDelete(rec) {
  if (!rec) return;
  if (MYC.confirm !== rec.id) { MYC.confirm = rec.id; toast('Press Delete again to remove this clip', 2.5); return; }
  MYC.confirm = null; mycTx('readwrite', s => s.delete(rec.id)).then(mycRefresh); toast('Removed', 1.5);
}
function myClipsUpdate() {
  if (MYC.overlay) return;
  const L = MYC.list || [], n = L.length, rec = L[MYC.idx];
  if (n) {
    if (menuHit('up')) { MYC.idx = (MYC.idx + n - 1) % n; SFX.blip(); MYC.confirm = null; }
    if (menuHit('down')) { MYC.idx = (MYC.idx + 1) % n; SFX.blip(); MYC.confirm = null; }
    if (menuHit('ok')) mycPlay(rec);
    else if (Input.pressed.KeyS) mycSave(rec);
    else if (Input.pressed.Delete || Input.pressed.KeyX) mycDelete(rec);
  }
  if (menuHit('back')) goTitle();
}
function drawMyClips(g) {
  dim(g, 0.84);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  try {
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('My clips', W / 2, 48);
    g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Clips you keep after making a video. They stay in this browser, on this device.', W / 2, 74);
    const L = MYC.list;
    if (!L) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('Loading…', W / 2, 260); return; }
    if (!L.length) { g.fillStyle = '#9fb3c8'; g.font = `15px ${BODY}`; wrapText(g, MYC.err || 'No clips yet. After a game, choose Share, then Make video, then Keep in My clips.', W / 2, 250, 620, 22); return; }
    panel(g, 30, 92, 330, 430, false);
    const vis = 8, s0 = clamp(MYC.idx - vis + 1, 0, Math.max(0, L.length - vis));
    L.slice(s0, s0 + vis).forEach((r, k) => {
      const i = s0 + k, y = 104 + k * 51, on = i === MYC.idx;
      g.fillStyle = on ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.05)'; roundRect(g, 42, y, 306, 45, 9); g.fill();
      g.textAlign = 'left'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.fillText(fitText(g, r.label.toUpperCase(), 280), 56, y + 19);
      g.fillStyle = on ? NIGHT : '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(fitText(g, (r.teams && r.teams.length ? r.teams.join(' vs ') + '  •  ' : '') + new Date(r.at).toLocaleDateString(), 280), 56, y + 36);
      addRect(42, y, 306, 45, () => { if (MYC.idx === i) mycPlay(r); MYC.idx = i; });
    });
    const rec = L[MYC.idx];
    panel(g, 380, 92, 550, 360, false);
    const im = rec && mycThumb(rec);
    if (im) { g.drawImage(im, 400, 110, 510, 287); addRect(400, 110, 510, 287, () => mycPlay(rec)); g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(655, 253, 34, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(644, 234); g.lineTo(644, 272); g.lineTo(676, 253); g.closePath(); g.fill(); }
    else { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(400, 110, 510, 287); }
    if (rec) {
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(fitText(g, (rec.teams || []).join('  ' + (rec.score || []).join(' – ') + '  ') || rec.label, 500), 400, 422);
      g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(fitText(g, rec.name + '  •  ' + (rec.blob.size / 1048576).toFixed(1) + ' MB', 500), 400, 442);
      uiButton(g, 380, 466, 170, 40, 'Play', () => mycPlay(rec), true);
      uiButton(g, 560, 466, 170, 40, 'Save to a file', () => mycSave(rec), false);
      uiButton(g, 740, 466, 190, 40, MYC.confirm === rec.id ? 'Tap again to delete' : 'Delete', () => mycDelete(rec), false);
    }
    if (!Input.touchMode) { g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText('↑ ↓ choose   Enter play   S save   X delete   Esc back', 930, 528); }
  } finally { W = rw; Game.ox = 0; g.restore(); }
}
{
  const SCR = { myclips: [myClipsUpdate, drawMyClips] };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments); if (was && Game.screen === sc) { SCR[sc][0](); attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s[1](g); drawBackButton(g); };
  BACK.myclips = () => { if (MYC.overlay) MYC.overlay.close(); goTitle(); };
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    const M0 = _tm.apply(this, arguments), op = M0.find(e => e.label === 'Options'), ex = op && op.sub && op.sub.find(e => e.label === 'Extras');
    const item = { label: 'My clips', act: openMyClips };
    if (ex) ex.sub.push(item); else if (op) op.sub.push(item);
    return M0;
  };
}
