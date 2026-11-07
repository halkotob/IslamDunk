// ================================================= v9.17.3: A CAREER CAN'T BE LOST
// (docs/IMPROVEMENTS.md SV1-SV3.) Before: saveCareer overwrote one key in place, readSave returned null for a save that
// didn't parse (the career just looked gone, and the next autosave wrote over what was left), the ~50 autosaves
// ignored a failed write, and nothing asked the browser to keep the data (Safari on iPhone can clear a site's storage
// after 7 days without a visit unless it's on the Home Screen). Now:
//   * a backup: before the career autosave, the profile (XP, unlocks) and the custom teams are written, the previous
//     value goes to key + '.bak' if it parses and is valid (one backup each; skipped, and said, if it would put storage
//     near the browser's limit; never at the cost of the real save). key + '.at' is when a value was written.
//   * reading: a value that doesn't parse (or isn't v 1) is kept as key + '.broken'. With a good backup, the backup is
//     put back and the player is told once ("Your latest save couldn't be read..."). Without one, the career menu says
//     "We couldn't read your career" and offers Export (the export carries the unreadable text too).
//   * a failed save shows one message a session ("Couldn't save: ..."), again only after a save has worked since.
//   * navigator.storage.persist() once, at the first career save; denied on a phone or tablet not started from the
//     Home Screen: one note, once ever ("Add to Home Screen to keep your career safe").
//   * Export (one .json file, or Copy code: the same text) and Import (the file or a pasted code: checked, summed up,
//     then written to the manual slot, never over the autosave) on the career's Save and load screen, the Career
//     menu and the Profile screen (one row there, Export or import career: the export screen has Import a save).
// Notices wait while a match is being played. The save format (v, sv) and the manual slot are unchanged.
const SAFE_KEYS = {
  'islamdunk.career.auto': o => !!o && o.v === 1,
  'islamdunk.profile': o => !!o && typeof o === 'object' && !Array.isArray(o),
  'islamdunk.custom': o => !!o && o.v === 1
};
const SafeSave = { failed: false, toldFail: false, persistAsked: false, notes: [], told: {}, broken: {}, quota: 5e6 };
function ssParse(s) { try { return s == null ? undefined : JSON.parse(s); } catch (e) { return undefined; } }
function ssGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function ssUsed() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {} return n; }
function ssNote(m) { if (!SafeSave.notes.includes(m)) SafeSave.notes.push(m); }
function ssWhen(k) { const t = +ssGet(k); return t > 0 ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'an earlier save'; }
// before key is written with text: the value there now becomes the backup, if it's valid (skipped near the limit)
function ssBackup(key, text) {
  const valid = SAFE_KEYS[key], old = ssGet(key);
  if (!valid || old == null || old === text || !valid(ssParse(old))) return;
  // after the write: everything stored, less the old backup, plus the new value (the old one becomes the backup).
  // The browser keeps about 5 million characters a site; a backup that would leave less than a tenth is skipped.
  if (ssUsed() - (ssGet(key + '.bak') || '').length + text.length > SafeSave.quota * 0.9) {
    if (!SafeSave.told.bakSkip) { SafeSave.told.bakSkip = true; ssNote('Storage is almost full: no backup of the last save this time.'); }
    return;
  }
  try { localStorage.setItem(key + '.bak', old); const at = ssGet(key + '.at'); if (at) localStorage.setItem(key + '.bak.at', at); } catch (e) {}
}
// after a write: its time, or the failure
function ssAfter(key, ok) {
  if (!ok) { ssFailed(); return false; }
  try { localStorage.setItem(key + '.at', String(Date.now())); } catch (e) {}
  ssOk(); return true;
}
// write key with the backup first (Import); returns whether the real value was written
function ssWrite(key, text) {
  ssBackup(key, text);
  let ok = true; try { localStorage.setItem(key, text); } catch (e) { ok = false; }
  return ssAfter(key, ok);
}
function ssFailed() { SafeSave.failed = true; if (!SafeSave.toldFail) { SafeSave.toldFail = true; ssNote("Couldn't save: storage is full or this browser is in private mode."); } }
function ssOk() { if (SafeSave.failed) { SafeSave.failed = false; SafeSave.toldFail = false; } ssNoteFlag(); }   // (after a save works, a new failure is told again)
function ssNoteFlag() { if (!SafeSave.noteFlag) return; try { localStorage.setItem('islamdunk.persistNote', '1'); SafeSave.noteFlag = false; } catch (e) {} }
// before a key is read: an unreadable value is kept as .broken; a good backup is put back (and the player told)
function ssRecover(key) {
  const valid = SAFE_KEYS[key], raw = ssGet(key);
  if (raw == null || valid(ssParse(raw))) { delete SafeSave.broken[key]; return; }
  try { if (ssGet(key + '.broken') !== raw) localStorage.setItem(key + '.broken', raw); } catch (e) {}
  const bak = ssGet(key + '.bak');
  if (bak != null && valid(ssParse(bak))) {
    try { localStorage.setItem(key, bak); const at = ssGet(key + '.bak.at'); if (at) localStorage.setItem(key + '.at', at); } catch (e) {}
    delete SafeSave.broken[key];
    if (!SafeSave.told['rec' + key]) { SafeSave.told['rec' + key] = true; ssNote(`Your latest ${key.endsWith('auto') ? 'save' : key.endsWith('profile') ? 'profile' : 'teams and players'} couldn't be read. Loaded the one before it (from ${ssWhen(key + '.bak.at')}).`); }
  } else {
    SafeSave.broken[key] = true;
    // (the backup is unreadable too: keep it as well, before a new save turns it into a copy of something else)
    if (bak != null) try { if (ssGet(key + '.bak.broken') !== bak) localStorage.setItem(key + '.bak.broken', bak); } catch (e) {}
  }
}
// the browser keeps the site's data (asked once, at the first career save; harmless in the desktop app)
function ssPersist() {
  if (SafeSave.persistAsked) return; SafeSave.persistAsked = true;
  try {
    if (!(navigator.storage && navigator.storage.persist)) return;
    const home = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    const phone = (typeof IOS !== 'undefined' && IOS) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    navigator.storage.persist().then(ok => {
      if (ok || home || !phone || ssGet('islamdunk.persistNote')) return;
      SafeSave.noteFlag = true; ssNoteFlag();   // (written now, or after the next save that works)
      ssNote('Add to Home Screen to keep your career safe.');
    }, () => {});
  } catch (e) {}
}
{
  // the career: the autosave key gets the backup; every save asks (once) to keep the data
  // (the wrappers already around these stay in the chain: the career card, the Studio's review mode, the creator's
  // thumbnails; the backup goes first, the result is checked after)
  const _sc = saveCareer;
  saveCareer = function (key = SAVE_AUTO) {
    if (!C) return false;
    ssPersist();
    if (key === SAVE_AUTO) ssBackup(key, JSON.stringify(C));
    const ok = _sc.call(this, key);
    if (key === SAVE_AUTO) return ssAfter(key, ok);
    if (ok) ssOk(); return ok;
  };
  const _rs = readSave;
  readSave = function (key) { if (SAFE_KEYS[key]) ssRecover(key); return _rs.apply(this, arguments); };
  // the profile and the custom teams: the same backup and recovery
  const _pl = Profile.load;
  Profile.load = function () { if (!this.d) ssRecover(PROFILE_KEY); return _pl.apply(this, arguments); };
  const _ps = Profile.save;
  Profile.save = function () { const text = JSON.stringify(this.d); ssBackup(PROFILE_KEY, text); _ps.apply(this, arguments); ssAfter(PROFILE_KEY, ssGet(PROFILE_KEY) === text); };
  const _cl = csLoad;
  csLoad = function () { if (!CS.d) ssRecover(CS_KEY); return _cl.apply(this, arguments); };
  const _css = csSave;
  csSave = function () { const text = JSON.stringify(csLoad()); ssBackup(CS_KEY, text); _css.apply(this, arguments); ssAfter(CS_KEY, ssGet(CS_KEY) === text); };
  // notices: shown one at a time, never while a match is being played
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    _gu.apply(this, arguments);
    if (SafeSave.notes.length && Game.screen !== 'play' && !(Game.toastT > 0)) toast(SafeSave.notes.shift(), 5);
  };
}
// ---------------------------------------------------------------- export and import
// the file: { app, kind, v, at, game, data: { auto, slot1, profile, custom, broken? }, sum }; data holds each key's
// stored text, sum is FNV-1a of JSON.stringify(data)
const SS_EXPORT_KEYS = { auto: 'islamdunk.career.auto', slot1: 'islamdunk.career.slot1', profile: 'islamdunk.profile', custom: 'islamdunk.custom' };
function ssSum(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
function ssExportText() {
  const data = {};
  for (const [k, key] of Object.entries(SS_EXPORT_KEYS)) { const s = ssGet(key); if (s != null) data[k] = s; }
  const broken = {}; for (const key of Object.keys(SAFE_KEYS)) { const b = ssGet(key + '.broken'); if (b != null) broken[key] = b; }
  if (Object.keys(broken).length) data.broken = broken;
  return JSON.stringify({ app: 'islamdunk', kind: 'save-export', v: 1, at: new Date().toISOString(), game: VERSION, data, sum: ssSum(JSON.stringify(data)) });
}
function ssCareerLine(o) {
  if (!o) return 'no career';
  const wk = o.cal && typeof o.cal.d === 'number' ? ', week ' + (Math.floor(o.cal.d / 7) + 1) : '';
  return `${o.name || 'Your player'}, Masjid Al-Amanah: season ${o.season || 1}${wk}, ${o.wins || 0}-${o.losses || 0}`;
}
// check an export; { ok, career, line } or { err }
function ssCheckImport(text) {
  const o = ssParse(String(text || '').trim());
  if (!o || o.app !== 'islamdunk' || o.kind !== 'save-export') return { err: 'That isn’t an Islam Dunk save file.' };
  if (o.v !== 1 || !o.data || typeof o.data !== 'object') return { err: 'That save file is from a version this one can’t read.' };
  if (ssSum(JSON.stringify(o.data)) !== o.sum) return { err: 'That save file is damaged (its check doesn’t match).' };
  const d = o.data, career = ssParse(d.auto) || ssParse(d.slot1);
  if (career !== undefined && !(career && career.v === 1)) return { err: 'The career in that file can’t be read.' };
  if (d.profile != null && !SAFE_KEYS['islamdunk.profile'](ssParse(d.profile))) return { err: 'The profile in that file can’t be read.' };
  if (d.custom != null && !SAFE_KEYS['islamdunk.custom'](ssParse(d.custom))) return { err: 'The teams in that file can’t be read.' };
  return { ok: true, data: d, career: career || null, line: ssCareerLine(career) + (d.profile ? ', profile' : '') + (d.custom ? ', your teams' : '') };
}
// write an import: the career to the manual slot; the profile and teams in place (their old values become the backups)
function ssApplyImport(r) {
  const d = r.data;
  if (r.career) { try { localStorage.setItem(SAVE_SLOT, JSON.stringify(r.career)); } catch (e) { ssFailed(); return false; } }
  if (d.profile != null && !ssWrite(PROFILE_KEY, d.profile)) return false;
  if (d.custom != null && !ssWrite(CS_KEY, d.custom)) return false;
  Profile.d = null; CS.d = null; CS.rev++; CS.card = undefined;
  return true;
}
const SaveIO = { back: null, msg: '', err: false, pending: null, text: '' };
function ssStamp() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function ssDownload() {
  const text = SaveIO.text;
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
    a.href = url; a.download = `islamdunk-save-${ssStamp()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    SaveIO.msg = 'Saved ' + a.download + '.'; SaveIO.err = false;
  } catch (e) { SaveIO.msg = 'This browser couldn’t save the file: use Copy code.'; SaveIO.err = true; }
}
function ssCopy() {
  const done = ok => { SaveIO.msg = ok ? 'Code copied. Paste it into Import on any device.' : 'Couldn’t copy: use Save file.'; SaveIO.err = !ok; };
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(SaveIO.text).then(() => done(true), () => done(false)); return; } } catch (e) {}
  done(false);
}
function openSaveExport(back) { Object.assign(SaveIO, { back, msg: '', err: false, pending: null, text: ssExportText() }); Game.screen = 'saveexport'; Game.idx = 0; }
function openSaveImport(back) { Object.assign(SaveIO, { back, msg: '', err: false, pending: null }); Game.screen = 'saveimport'; Game.idx = 0; }
function ssTryImport(text) { const r = ssCheckImport(text); if (r.err) { SaveIO.pending = null; SaveIO.msg = r.err; SaveIO.err = true; SFX.bad && SFX.bad(); } else { SaveIO.pending = r; SaveIO.msg = ''; SaveIO.err = false; SFX.blip && SFX.blip(); } }
function ssPickFile() {
  try {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => ssTryImport(fr.result); fr.readAsText(f); };
    inp.click();
  } catch (e) { SaveIO.msg = 'This browser can’t open files here: paste the code instead.'; SaveIO.err = true; }
}
function ssPaste() {
  const ask = () => { SaveIO.msg = 'Press Ctrl+V (or ⌘V) to paste the code here.'; SaveIO.err = true; };
  try { if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(ssTryImport, ask); return; } } catch (e) {}
  ask();
}
function ssConfirm() {
  const r = SaveIO.pending; if (!r) return;
  if (ssApplyImport(r)) { SaveIO.pending = null; SaveIO.msg = r.career ? 'Imported. Load it from the manual slot (Save and load, or Load manual save).' : 'Imported.'; SaveIO.err = false; SFX.good && SFX.good(); }
  else { SaveIO.msg = 'Couldn’t write it: storage is full or this browser is in private mode.'; SaveIO.err = true; }
}
addEventListener('paste', e => { if (Game.screen !== 'saveimport') return; const t = e.clipboardData && e.clipboardData.getData('text'); if (t) { e.preventDefault(); ssTryImport(t); } });
function ssToImport() { openSaveImport(SaveIO.back); }
function ssLeave() { const b = SaveIO.back; SaveIO.pending = null; if (b) b(); else goTitle(); }
function drawSaveExport(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  panel(g, 150, 100, 660, 330, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Export your career', W / 2, 142);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`;
  g.fillText(fitText(g, ssCareerLine(ssParse(ssGet(SAVE_AUTO)) || ssParse(ssGet(SAVE_SLOT))), 600), W / 2, 174);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('The career, the manual slot, your profile and your teams, in one file.', W / 2, 198);
  uiButton(g, W / 2 - 300, 226, 190, 44, 'Save file', ssDownload, Game.idx === 0);
  uiButton(g, W / 2 - 95, 226, 190, 44, 'Copy code', ssCopy, Game.idx === 1);
  uiButton(g, W / 2 + 110, 226, 190, 44, 'Import a save', ssToImport, Game.idx === 2);
  if (SaveIO.msg) { g.fillStyle = SaveIO.err ? '#ff9a8a' : '#9dffb0'; g.font = `14px ${BODY}`; g.fillText(fitText(g, SaveIO.msg, 620), W / 2, 312); }
  uiButton(g, W / 2 - 80, 360, 160, 38, 'Back', ssLeave, Game.idx === 3);
  W = rw; Game.ox = 0; g.restore();
}
function drawSaveImport(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  panel(g, 150, 100, 660, 330, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Import a career', W / 2, 142);
  const r = SaveIO.pending;
  if (r) {
    g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText(fitText(g, r.line, 620), W / 2, 182);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(fitText(g, 'The career goes to the manual slot; your autosave stays as it is.', 620), W / 2, 206);
    uiButton(g, W / 2 - 220, 232, 210, 44, 'Import', ssConfirm, Game.idx === 0);
    uiButton(g, W / 2 + 10, 232, 210, 44, 'Cancel', () => { SaveIO.pending = null; SaveIO.msg = ''; }, Game.idx === 1);
  } else {
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Choose a save file, or paste a code you copied.', W / 2, 176);
    uiButton(g, W / 2 - 220, 204, 210, 44, 'Choose file', ssPickFile, Game.idx === 0);
    uiButton(g, W / 2 + 10, 204, 210, 44, 'Paste code', ssPaste, Game.idx === 1);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('or press Ctrl+V (⌘V on a Mac)', W / 2, 276);
  }
  if (SaveIO.msg) { g.fillStyle = SaveIO.err ? '#ff9a8a' : '#9dffb0'; g.font = `14px ${BODY}`; g.fillText(fitText(g, SaveIO.msg, 620), W / 2, 318); }
  uiButton(g, W / 2 - 80, 360, 160, 38, 'Back', ssLeave, Game.idx === 2);
  W = rw; Game.ox = 0; g.restore();
}
{
  // the two screens: left/right or up/down move between the buttons, Enter / A presses one (keyboard, gamepad, touch)
  const acts = () => Game.screen === 'saveexport' ? [ssDownload, ssCopy, ssToImport, ssLeave]
    : SaveIO.pending ? [ssConfirm, () => { SaveIO.pending = null; SaveIO.msg = ''; }, ssLeave] : [ssPickFile, ssPaste, ssLeave];
  const SCR = { saveexport: drawSaveExport, saveimport: drawSaveImport };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments);
    if (!was || Game.screen !== sc) return;
    const n = acts().length; Game.idx = clamp(Game.idx | 0, 0, n - 1);
    if (menuHit('left') || menuHit('up')) { Game.idx = (Game.idx + n - 1) % n; SFX.blip && SFX.blip(); }
    if (menuHit('right') || menuHit('down')) { Game.idx = (Game.idx + 1) % n; SFX.blip && SFX.blip(); }
    if (menuHit('ok')) acts()[Game.idx]();
    else if (menuHit('back')) ssLeave();
  };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s(g); drawBackButton(g); };
  BACK.saveexport = ssLeave; BACK.saveimport = ssLeave;
  // the Career menu: Export and Import (and, when the career can't be read, the reason and Export first)
  const _ci = cmenuItems;
  cmenuItems = function () {
    const items = _ci.apply(this, arguments), back = items.pop();
    if (SafeSave.broken[SAVE_AUTO]) items.unshift(['We couldn’t read your career: Export it', 'export']);
    else items.push(['Export career', 'export']);
    items.push(['Import career', 'import'], back);
    return items;
  };
  const _cs = cmenuSelect;
  cmenuSelect = function (i) {
    const act = cmenuItems()[i][1], home = () => { Game.screen = 'cmenu'; Game.idx = 0; };
    if (act === 'export') return openSaveExport(home);
    if (act === 'import') return openSaveImport(home);
    return _cs.apply(this, arguments);
  };
  // the Profile screen
  const _pr = profileRows;
  profileRows = function () {
    const R = _pr.apply(this, arguments), back = R.pop(), home = () => { Game.screen = 'profile'; Game.idx = 0; };
    R.push({ label: 'Export or import career', start: true, step: () => openSaveExport(home) });   // (one row: the screen has Import a save)
    R.push(back);
    return R;
  };
}
