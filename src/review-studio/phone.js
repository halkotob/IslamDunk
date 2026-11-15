// v9.21.1: the Studio on a phone (and the export tools everywhere).
//   - a verdict bar fixed at the bottom on phone-size screens (Keep / Fix / Delete / Merge, the note, next and back),
//     in thumb reach, kept above the on-screen keyboard and the browser bar (visualViewport)
//   - the note sheet: the comment (and suggested wording) in a box that sits above the keyboard
//   - the ⋯ menu: name, role, last review, import and export; Share CSV (the phone's share sheet, else a download),
//     Copy, Email to me (when there's no share sheet), Download
//   - "Saved on this phone only" with the time of the last save and the count of verdicts; Clear… asks first and
//     offers the export
//   - navigator.storage.persist(): asks the browser not to clear the verdicts when it's short of space
// Nothing here changes the verdict format or the CSV columns (store.js, csv.js).
export const PHONE_MQ = '(max-width: 900px), (max-height: 520px)';
export const isPhone = () => matchMedia(PHONE_MQ).matches;
const VL = { keep: 'Keep', fix: 'Fix', merge: 'Merge', delete: 'Delete' };

export function setupPhone(h) {
  const { $, el, store, S } = h;
  const body = document.body, more = $('#more'), mb = $('#morebtn'), vv = window.visualViewport;
  const setMore = on => { body.classList.toggle('moreopen', on); mb.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  mb.addEventListener('click', () => setMore(!body.classList.contains('moreopen')));
  $('#moreclose').addEventListener('click', () => setMore(false));
  more.addEventListener('click', e => { if (e.target === more) setMore(false); });
  const phoneClass = () => { body.classList.toggle('phone', isPhone()); if (!isPhone()) setMore(false); keepAbove(); };
  matchMedia(PHONE_MQ).addEventListener('change', phoneClass); phoneClass();

  // export: share sheet, email, copy, download
  const canShareFile = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.csv', { type: 'text/csv' })] })); } catch (e) { return false; } };
  const share = $('#share'), mail = $('#mail');
  share.hidden = !(canShareFile() || navigator.share);
  mail.hidden = canShareFile();                       // email is the fallback when the phone can't share a file
  share.addEventListener('click', () => shareCsv(h));
  mail.addEventListener('click', () => mailCsv(h));
  $('#clear').addEventListener('click', () => clearAsk(h));

  // saved: time and count
  let last = null;
  for (const m of Object.values(store.state.marks)) for (const r of Object.values(m)) if (r.at && (!last || r.at > last)) last = r.at;
  const draw = () => {
    const n = countVerdicts(store), where = isPhone() ? 'Saved on this phone only' : 'Saved in this browser only';
    $('#savedtxt').textContent = `${where}${last ? ' · ' + new Date(last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''} · ${n} verdict${n === 1 ? '' : 's'}${S.persisted ? '' : ' (the browser may clear it if space runs low: export often)'}`;
  };
  store.on(() => { last = new Date().toISOString(); draw(); });
  h.drawSaved = draw;
  // ask the browser to keep the storage (Safari and Chrome grant it to a page you use; nothing is shown if refused)
  S.persisted = false;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).then(p => { S.persisted = !!p; draw(); }).catch(() => {}); } catch (e) {}
  draw();

  // the bar stays above the keyboard and the browser bar
  function keepAbove() {
    const off = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
    for (const n of [$('#actbar'), $('#notesheet')]) n.style.bottom = off + 'px';
  }
  if (vv) { vv.addEventListener('resize', keepAbove); vv.addEventListener('scroll', keepAbove); }
  h.keepAbove = keepAbove;
}

export const countVerdicts = store => { let n = 0; for (const m of Object.values(store.state.marks)) for (const r of Object.values(m)) if (r.verdict || r.comment || r.suggested || r.pick || r.merge) n++; return n; };

// the verdict bar (phones): same toggles as the side panel
export function drawActbar(h, it) {
  const { $, el, store } = h, bar = $('#actbar');
  bar.hidden = !it || !!it.placeholder; if (bar.hidden) { bar.replaceChildren(); return; }
  const m = store.mark(it.id) || {}, VS = it.meta ? ['keep', 'fix', 'merge', 'delete'] : ['keep', 'fix', 'delete'];
  bar.replaceChildren(
    el('button', { class: 'nav', 'aria-label': 'Previous item', onclick: () => h.step(-1) }, '‹'),
    ...VS.map(v => el('button', { class: 'v ' + v + (m.verdict === v ? ' on' : ''), 'aria-pressed': m.verdict === v ? 'true' : 'false', 'data-v': v,
      onclick: () => { store.set(it.id, { verdict: m.verdict === v ? '' : v }); h.afterMark(it); if (v === 'merge' && m.verdict !== 'merge') noteSheet(h, it, true); } }, VL[v])),
    el('button', { class: 'note' + (m.comment || m.suggested ? ' has' : ''), 'aria-label': 'Comment', onclick: () => noteSheet(h, it) }, '✎'),
    el('button', { class: 'nav', 'aria-label': 'Next item', onclick: () => h.step(1) }, '›'));
  if (h.keepAbove) h.keepAbove();
}

// the comment box above the keyboard (and Merge into, for a screen marked Merge)
export function noteSheet(h, it, mergeFirst) {
  const { $, el, store, S } = h, sh = $('#notesheet');
  const m = store.mark(it.id) || {}, kids = [el('div', { class: 'nshead' }, el('b', {}, it.name.length > 60 ? it.name.slice(0, 60) + '…' : it.name), el('button', { class: 'done', onclick: () => close() }, 'Done'))];
  if (m.verdict === 'merge' || mergeFirst) {
    const names = [...new Set(S.items.filter(x => x.meta && x.screen).map(x => x.screen.name))].sort(), cur = it.screen && it.screen.name;
    const sel = el('select', { id: 'n-merge' }, el('option', { value: '' }, '(pick the screen it goes into)'), ...names.filter(n => n !== cur).map(n => el('option', { value: n }, n)));
    sel.value = m.merge || ''; sel.addEventListener('change', () => { store.set(it.id, { merge: sel.value }); h.afterMark(it); });
    kids.push(el('label', { class: 'blk' }, 'Merge into', sel));
  }
  const ta = (label, key, ph) => {
    const t = el('textarea', { id: 'n-' + key, placeholder: ph, rows: 3 }); t.value = m[key] || '';
    let before = store.mark(it.id);
    t.addEventListener('input', () => { store.set(it.id, { [key]: t.value }, { record: false }); });
    t.addEventListener('change', () => { store.pushUndo(it.id, before); before = store.mark(it.id); });
    return el('label', { class: 'blk' }, label, t);
  };
  kids.push(ta('Comment', 'comment', 'What should change, and why'));
  if (['line', 'trivia', 'text'].includes(it.kind)) kids.push(ta('Suggested replacement', 'suggested', 'Exact new wording (optional)'));
  sh.replaceChildren(...kids); sh.hidden = false; document.body.classList.add('noteopen');
  if (h.keepAbove) h.keepAbove();
  const first = sh.querySelector(mergeFirst ? 'select' : 'textarea'); if (first) first.focus();
  function close() { sh.hidden = true; document.body.classList.remove('noteopen'); sh.replaceChildren(); h.afterMark(it); }
  h.closeNote = close;
}

const csvFile = h => new File([h.csvText()], h.fileName(), { type: 'text/csv' });
export async function shareCsv(h) {
  const f = csvFile(h);
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: f.name }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title: f.name, text: await f.text() }); return 'shared-text'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  h.downloadCsv(); return 'downloaded';                        // no share sheet: a download
}
// a mail draft to yourself with your verdicts as CSV in the body: only the rows with a verdict, which import the same
// (a link can't attach a file to a mail draft); a very large
// export is cut short there, so the dialog says to use Download for it
export function mailCsv(h) {
  const rows = h.exportRows().filter(r => r.reviewer), body = h.toCsv(rows), max = 60000;
  const href = 'mailto:?subject=' + encodeURIComponent('Islam Dunk Studio verdicts ' + new Date().toISOString().slice(0, 10)) + '&body=' + encodeURIComponent(body.length > max ? body.slice(0, max) : body);
  if (body.length > max) h.dialog(h.el('p', {}, `The verdicts are ${Math.round(body.length / 1000)} kB, too long for an email body. Use Download CSV and attach the file.`));
  else location.href = href;
  return { rows: rows.length, size: body.length };
}
export function clearAsk(h) {
  const { el, store } = h, n = countVerdicts(store);
  h.dialog(el('h3', {}, 'Clear the verdicts on this phone?'),
    el('p', {}, `${n} verdict${n === 1 ? '' : 's'} are saved only here. Once cleared they're gone, unless you've exported them.`),
    el('div', { class: 'row2' },
      el('button', { onclick: () => shareCsv(h) }, 'Share CSV first'),
      el('button', { class: 'danger', onclick: () => { store.clearAll(); h.refreshAll(); document.getElementById('dlg').close(); } }, 'Clear them')));
}
