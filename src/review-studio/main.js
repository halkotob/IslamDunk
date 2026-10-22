// Islam Dunk Review Studio. See docs/review/README.md ("Review Studio").
// Shows every reviewable item as it ships (drawn by the real game in a sandboxed frame), and records a verdict
// (Keep / Fix / Delete), a comment and suggested text per item and reviewer. It never changes the game: the
// verdicts live in this browser (localStorage) and leave as CSV.
import './studio.css';
import { openGame } from './bridge.js';
import { createStore, ROLES } from './store.js';
import { toCsv, importRows, norm, COLUMNS } from './csv.js';
import { buildItems, locateSprites, CATS, TRIGGERS, cmpVer } from './items.js';
import { drawSprite, natural, thumb, face, bbox } from './views.js';
import { VList } from './vlist.js';
import { extraCategories } from './extra.js';

const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
};
const VLABEL = { keep: 'Keep', fix: 'Fix', delete: 'Delete' };

const S = {
  data: null, G: null, items: [], byId: new Map(), byText: new Map(), view: [], cur: -1,
  f: { cat: null, group: null, st: 'all', isNew: false, religious: false, q: '' },
  sp: { zoom: 2, zoomBig: 0, bg: 'dark', face: 1, outfit: '', team: '', lens: false, tod: 1 },
  renderErrors: {}
};
const store = createStore();
window.__studio = { S, store };          // for the tests and for debugging

async function boot() {
  const res = await fetch('review-data.json', { cache: 'no-store' });
  S.data = await res.json();
  $('#build').textContent = 'game ' + S.data.version;
  S.G = await openGame($('#gamehost'));
  S.items = buildItems(S.G.rs, S.data);
  for (const it of await extraCategories(S.G, S.data)) S.items.push(it);
  locateSprites(S.items, S.data.defs || {});
  const ids = new Set();
  for (const it of S.items) {
    if (ids.has(it.id)) console.warn('duplicate id', it.id); ids.add(it.id);
    S.byId.set(it.id, it);
    for (const t of textsOf(it)) { const k = norm(t); if (!k) continue; if (!S.byText.has(k)) S.byText.set(k, []); const a = S.byText.get(k); if (!a.includes(it.id)) a.push(it.id); }
  }
  setupHeader(); setupList(); setupKeys();
  const ui = store.state.ui || {};
  Object.assign(S.f, ui.f || {}); Object.assign(S.sp, ui.sp || {});
  applyFilters(ui.cur);
  $('#loading').classList.add('gone');
  window.__studio.ready = true;
}
const textsOf = it => it.kind === 'trivia' ? [it.trivia.q, it.trivia.right, it.trivia.why, ...it.trivia.wrong] : it.parts ? it.parts.map(p => p[1]) : it.text ? [it.text] : [];
const isNew = it => cmpVer(it.version, store.state.lastReviewed) > 0;
const myMark = it => store.mark(it.id);

// ------------------------------------------------------------------ header: search, filters, reviewer, import / export
function setupHeader() {
  const q = $('#q'); q.value = S.f.q;
  let t = 0; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.f.q = q.value; applyFilters(); }, 120); });
  for (const b of document.querySelectorAll('#filters .chip')) b.addEventListener('click', () => {
    if (b.dataset.st) S.f.st = b.dataset.st; else S.f[b.dataset.tg] = !S.f[b.dataset.tg];
    applyFilters();
  });
  const rn = $('#rname'), rr = $('#rrole');
  rn.value = store.state.reviewer.name; for (const r of ROLES) rr.append(el('option', { value: r }, r)); rr.value = store.state.reviewer.role;
  rn.addEventListener('change', () => { store.setReviewer(rn.value, null); refreshAll(); });
  rr.addEventListener('change', () => store.setReviewer(null, rr.value));
  const lr = $('#lastrev'), vers = [...new Set(S.items.map(i => i.version).concat(['phase1', S.data.version]))].sort(cmpVer);
  for (const v of vers) lr.append(el('option', { value: v }, v === 'phase1' ? 'Phase 1' : 'v' + v));
  lr.value = store.state.lastReviewed; lr.addEventListener('change', () => { store.setLastReviewed(lr.value); applyFilters(); });
  $('#dl').addEventListener('click', downloadCsv);
  $('#cp').addEventListener('click', copyCsv);
  $('#imp').addEventListener('click', () => $('#impfile').click());
  $('#impfile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) doImport(await f.text(), f.name); });
  $('#confl').addEventListener('click', showConflicts);
  $('#navbtn').addEventListener('click', () => document.body.classList.toggle('navopen'));
  updateConflictBtn();
}

// ------------------------------------------------------------------ filtering, the category nav and the list
function matches(it, f, skipCat) {
  if (!skipCat && f.cat && it.cat !== f.cat) return false;
  if (!skipCat && f.group && it.group !== f.group) return false;
  const m = myMark(it), v = m ? m.verdict : '';
  if (f.st === 'todo' && v) return false;
  if (f.st !== 'all' && f.st !== 'todo' && v !== f.st) return false;
  if (f.isNew && !isNew(it)) return false;
  if (f.religious && !it.religious) return false;
  if (f.q) { const q = f.q.toLowerCase(); if (!(it.id.toLowerCase().includes(q) || (it.name || '').toLowerCase().includes(q) || (it.where || '').toLowerCase().includes(q) || textsOf(it).some(t => t.toLowerCase().includes(q)))) return false; }
  return true;
}
function applyFilters(selectId) {
  const prev = selectId || (S.view[S.cur] && S.view[S.cur].id);
  S.view = S.items.filter(it => matches(it, S.f));
  for (const b of document.querySelectorAll('#filters .chip')) b.classList.toggle('on', b.dataset.st ? S.f.st === b.dataset.st : !!S.f[b.dataset.tg]);
  store.setUi('f', S.f);
  drawNav(); S.list.set(S.view.length);
  let i = prev ? S.view.findIndex(x => x.id === prev) : -1;
  if (i < 0 && S.view.length) i = 0;
  select(i);
  updateProgress();
}
function drawNav() {
  const nav = $('#nav'); nav.replaceChildren();
  const stat = list => { let r = 0, fx = 0; for (const it of list) { const m = myMark(it); if (m && m.verdict) { r++; if (m.verdict !== 'keep') fx++; } } return { n: list.length, r, fx }; };
  const base = S.items.filter(it => matches(it, Object.assign({}, S.f, { st: 'all' }), true));
  const entry = (label, cat, group, list, cls = '') => {
    const s = stat(list), on = S.f.cat === cat && S.f.group === group;
    const e = el('div', { class: 'cat ' + cls + (on ? ' on' : ''), role: 'button', tabindex: 0, 'data-cat': cat || '', 'data-group': group || '' },
      el('div', { class: 'row' }, el('span', {}, label), el('span', { class: 'n' }, s.r + '/' + s.n)),
      el('div', { class: 'bar' }, el('i', { style: `width:${s.n ? 100 * s.r / s.n : 0}%` })));
    const go = () => { S.f.cat = cat; S.f.group = group; document.body.classList.remove('navopen'); applyFilters(); };
    e.addEventListener('click', go); e.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    nav.append(e);
  };
  entry('All items', null, null, base);
  for (const c of CATS) {
    const list = base.filter(it => it.cat === c);
    if (!S.items.some(it => it.cat === c)) { nav.append(el('div', { class: 'cat soon' }, el('div', { class: 'row' }, el('span', {}, c), el('span', { class: 'n' }, 'later')))); continue; }
    entry(c, c, null, list);
    if (S.f.cat === c) { const groups = [...new Set(S.items.filter(it => it.cat === c).map(it => it.group))]; for (const g of groups) entry(g, c, g, list.filter(it => it.group === g), 'sub'); }
  }
}
function setupList() {
  S.list = new VList($('#list'), { rowH: 46, onPick: i => select(i), render: (r, i) => {
    const it = S.view[i], m = myMark(it);
    if (it.kind === 'sprite') { const c = el('canvas', { width: 72, height: 72 }); const t = thumb(S.G, it, 72); if (t) c.getContext('2d').drawImage(t, 0, 0); r.append(c); }
    else if (it.kind === 'line') { const c = el('canvas', { width: 72, height: 72 }); const t = face(S.G, it.speaker, 72); if (t) c.getContext('2d').drawImage(t, 0, 0); r.append(c); }
    r.append(el('span', { class: 'dot ' + (m ? m.verdict : ''), title: m && m.verdict ? VLABEL[m.verdict] : 'Not reviewed' }));
    r.append(el('div', { class: 't' }, it.name, el('small', {}, (it.kind === 'line' ? it.unit.title + ' · ' : '') + it.group)));
    if (isNew(it)) r.append(el('span', { class: 'tag new', title: 'Added in ' + it.version }, 'new'));
    if (it.religious) r.append(el('span', { class: 'tag rel', title: 'Religious review' }, 'rel'));
  } });
}
function updateProgress() {
  const inView = S.view.filter(it => { const m = myMark(it); return m && m.verdict; }).length;
  const all = S.items.filter(it => { const m = myMark(it); return m && m.verdict; }).length;
  $('#prog-text').textContent = `${inView} / ${S.view.length} reviewed here · ${all} / ${S.items.length} in all`;
  $('#prog-bar').style.width = (S.view.length ? 100 * inView / S.view.length : 0) + '%';
  $('#listhead').replaceChildren(el('span', {}, (S.f.group || S.f.cat || 'All items') + ' · ' + S.view.length), el('span', {}, S.cur >= 0 ? (S.cur + 1) + ' of ' + S.view.length : ''));
}
function refreshAll() { S.list.refresh(); drawNav(); updateProgress(); if (S.cur >= 0) drawSide(); }

// ------------------------------------------------------------------ selection and the stage
function select(i) {
  S.cur = i; S.list.select(i);
  const it = S.view[i];
  store.setUi('cur', it ? it.id : null);
  drawStage(); drawSide(); updateProgress();
}
function step(d) { if (!S.view.length) return; select(Math.max(0, Math.min(S.view.length - 1, S.cur + d))); }
function selectId(id) {
  let i = S.view.findIndex(x => x.id === id);
  if (i < 0) { S.f = Object.assign(S.f, { cat: null, group: null, st: 'all', isNew: false, religious: false, q: '' }); $('#q').value = ''; applyFilters(id); return; }
  select(i);
}
function drawStage() {
  const it = S.view[S.cur], bar = $('#stagebar'), view = $('#view');
  bar.replaceChildren(); view.replaceChildren(); view.className = '';
  if (!it) { view.append(el('div', { class: 'empty' }, 'Nothing here with these filters.')); return; }
  try {
    if (it.kind === 'line') stageLine(it, view);
    else if (it.kind === 'trivia') stageTrivia(it, view);
    else if (it.kind === 'text') stageText(it, view);
    else if (it.kind === 'sprite') stageSprite(it, bar, view);
    else if (it.stage) it.stage(S.G, bar, view, el, S);
    delete S.renderErrors[it.id];
  } catch (e) {
    S.renderErrors[it.id] = String(e && e.message || e);
    view.append(el('div', { class: 'err' }, 'This item could not be drawn:\n' + (e && e.stack || e)));
  }
}
function stageLine(it, view) {
  const u = it.unit, box = el('div', { class: 'convo' }, el('h3', {}, u.group + ' · ' + u.title));
  u.lines.forEach((l, li) => {
    const id = 'dialogue/' + u.key + '/' + li, m = store.mark(id), c = el('canvas', { width: 88, height: 88 }), f = face(S.G, l.sp, 88);
    if (f) c.getContext('2d').drawImage(f, 0, 0);
    const row = el('div', { class: 'ln' + (li === it.li ? ' cur' : '') + (l.sp === 'you' ? ' you' : '') + (l.choice ? ' choice' : ''), 'data-id': id, onclick: () => selectId(id) },
      c, el('div', {}, el('div', { class: 'who' }, l.choice ? 'You ask' : S.G.rs.speakerName(l.sp)), el('div', { class: 'tx' }, l.text)),
      el('span', { class: 'dot ' + (m ? m.verdict : '') }));
    box.append(row);
  });
  view.append(box);
  const cur = box.querySelector('.ln.cur'); if (cur) requestAnimationFrame(() => cur.scrollIntoView({ block: 'nearest' }));
}
function stageTrivia(it, view) {
  const t = it.trivia;
  view.append(el('div', { class: 'card' }, el('h3', {}, 'Trivia question ' + (t.i + 1)), el('div', { class: 'q' }, t.q),
    el('div', { class: 'opt right' }, el('b', {}, 'Right'), t.right), ...t.wrong.map(w => el('div', { class: 'opt wrong' }, el('b', {}, 'Wrong'), w)),
    t.why ? el('div', { class: 'why' }, el('b', {}, 'Why: '), t.why) : el('div', { class: 'why' }, 'No explanation for this one.')));
}
function stageText(it, view) {
  const card = el('div', { class: 'card' }, el('h3', {}, it.section || it.group));
  if (it.col) card.style.borderColor = it.col;
  for (const [k, v] of it.parts) card.append(el('div', { class: 'part' }, el('b', {}, k), el('div', { class: 'gametext' }, v)));
  if (it.speaker) card.append(el('div', { class: 'note' }, 'Spoken by ' + S.G.rs.speakerName(it.speaker)));
  view.append(card);
}
// sprites: zoom, background, facing, outfit / team, time of day, pixel lens
function stageSprite(it, bar, view) {
  const sp = S.sp, s = it.spr, person = ['person', 'creator', 'jersey'].includes(s.t);
  const big = natural(it)[0] > 400, zk = big ? 'zoomBig' : 'zoom';      // scenes default to Fit, sprites to 2x
  const seg = (label, key, opts) => { const g = el('div', { class: 'grp', role: 'group', 'aria-label': label });
    for (const [v, t] of opts) g.append(el('button', { class: sp[key] === v ? 'on' : '', title: label + ': ' + t, onclick: () => { sp[key] = v; store.setUi('sp', sp); drawStage(); } }, t)); bar.append(g); };
  seg('Zoom', zk, [[1, '1x'], [2, '2x'], [4, '4x'], [8, '8x'], [0, 'Fit']]);
  seg('Background', 'bg', [['light', 'Light'], ['dark', 'Dark'], ['check', 'Check']]);
  if (person || s.t === 'prop') seg('Facing', 'face', [[1, 'Right →'], [-1, '← Left']]);
  if (s.t === 'person' || s.t === 'creator') {
    seg('Outfit', 'outfit', [['', 'Default'], ['thobe', 'Thobe'], ['kit', 'Team kit']]);
    if (s.t === 'person') { const sel = el('select', { 'aria-label': 'Team colours', onchange: e => { sp.team = e.target.value; store.setUi('sp', sp); drawStage(); } }, el('option', { value: '' }, 'Own team colours'), ...S.G.rs.teams().map(T => el('option', { value: T.short }, T.name)));
      sel.value = sp.team || ''; bar.append(el('label', {}, 'Colours', sel)); }
  }
  if (s.t === 'prop' || s.t === 'scene') seg('Time of day', 'tod', S.G.rs.tods().map((t, i) => [i, t]));
  bar.append(el('button', { class: sp.lens ? 'on' : '', title: 'Pixel lens: hover the sprite', onclick: () => { sp.lens = !sp.lens; store.setUi('sp', sp); drawStage(); } }, 'Lens'));
  let src = drawSprite(S.G, it, { face: sp.face, outfit: sp.outfit || undefined, team: sp.outfit === 'kit' || !sp.outfit ? sp.team || undefined : undefined, tod: sp.tod });
  if (!['venue', 'masjid', 'hud', 'scene'].includes(s.t)) src = cropTo(src, 6);     // sprites: just the drawn pixels, 6 px around
  const [w, h] = [src.width, src.height];
  view.className = 'bg-' + sp.bg;
  const vw = Math.max(100, view.clientWidth - 32), vh = Math.max(100, view.clientHeight - 32);
  let z = sp[zk] || Math.min(vw / w, vh / h); if (!sp[zk] && z > 1) z = Math.floor(z);
  const dpr = window.devicePixelRatio || 1, c = el('canvas', { width: Math.round(w * z * dpr), height: Math.round(h * z * dpr), 'data-zoom': z });
  c.style.width = w * z + 'px'; c.style.height = h * z + 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height);
  view.append(el('div', { class: 'sprite-wrap' }, c));
  bar.append(el('span', { class: 'note' }, `${w}×${h} px${person ? ' · drawn at the game’s portrait scale 1.5' : ''}`));
  if (sp.lens) lens(c, src, z);
}
function cropTo(c, pad) {
  const b = bbox(c); if (b.empty) return c;
  const o = el('canvas', { width: b.w + 2 * pad, height: b.h + 2 * pad }); o.getContext('2d').drawImage(c, b.x, b.y, b.w, b.h, pad, pad, b.w, b.h); return o;
}
function lens(c, src, z) {
  const L = $('#lens'), lc = L.querySelector('canvas'), lg = lc.getContext('2d'), info = L.querySelector('span'), sg = src.getContext('2d');
  const N = 11, P = lc.width / N;
  const move = e => {
    const r = c.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / z), y = Math.floor((e.clientY - r.top) / z);
    if (x < 0 || y < 0 || x >= src.width || y >= src.height) { L.hidden = true; return; }
    L.hidden = false; L.style.left = Math.min(innerWidth - 150, e.clientX + 18) + 'px'; L.style.top = Math.min(innerHeight - 160, e.clientY + 18) + 'px';
    lg.imageSmoothingEnabled = false; lg.fillStyle = '#777'; lg.fillRect(0, 0, lc.width, lc.height);
    lg.drawImage(src, x - 5, y - 5, N, N, 0, 0, lc.width, lc.height);
    lg.strokeStyle = '#fff'; lg.lineWidth = 2; lg.strokeRect(5 * P, 5 * P, P, P);
    const d = sg.getImageData(x, y, 1, 1).data, hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    info.textContent = `${x},${y} ${hex} a${d[3]}`;
  };
  c.addEventListener('pointermove', move); c.addEventListener('pointerleave', () => { L.hidden = true; });
}

// ------------------------------------------------------------------ the item panel: where, when, verdict, comment, suggestion
function drawSide() {
  const it = S.view[S.cur], side = $('#side'); side.replaceChildren();
  if (!it) return;
  const m = myMark(it) || {}, others = Object.entries(store.marksFor(it.id)).filter(([r]) => r !== store.who());
  const occ = (it.occ || []).slice(0, 8);
  side.append(el('h2', {}, it.name.length > 140 ? it.name.slice(0, 140) + '…' : it.name), el('div', { class: 'id', title: 'Item ID' }, it.id));
  side.append(el('dl', {},
    el('dt', {}, 'Category'), el('dd', {}, it.cat + ' · ' + it.group),
    el('dt', {}, 'Where'), el('dd', { class: 'where' }, occ.length > 1 ? occ.map(o => el('div', {}, o.file + ':' + o.line)) : it.where || '—', (it.occ || []).length > 8 ? el('div', {}, '+' + (it.occ.length - 8) + ' more') : null),
    el('dt', {}, 'When'), el('dd', {}, it.when || TRIGGERS[it.group] || (it.section ? 'Shown in: ' + it.section : '—')),
    el('dt', {}, 'Added'), el('dd', {}, (it.version === 'phase1' ? 'Phase 1' : 'v' + it.version) + (isNew(it) ? ' · new since last review' : '')),
    it.flag || it.religious ? el('dt', {}, 'Flags') : null, it.flag || it.religious ? el('dd', {}, [it.religious ? 'Religious review' : null, it.flag].filter(Boolean).join(' · ')) : null));
  const vb = el('div', { class: 'verdicts', role: 'group', 'aria-label': 'Verdict' });
  for (const [v, k] of [['keep', 'K'], ['fix', 'F'], ['delete', 'D']]) vb.append(el('button', { class: v + (m.verdict === v ? ' on' : ''), 'aria-pressed': m.verdict === v ? 'true' : 'false', 'data-v': v,
    onclick: () => { store.set(it.id, { verdict: m.verdict === v ? '' : v }); afterMark(it); } }, VLABEL[v], el('kbd', {}, k)));
  side.append(vb);
  if (m.verdict === 'delete') side.append(el('div', { class: 'note' }, 'Delete means “recommend removal”. Nothing is removed from the game.'));
  const ta = (label, key, ph) => { const t = el('textarea', { placeholder: ph, id: 'f-' + key, rows: key === 'comment' ? 3 : 3 }); t.value = m[key] || '';
    let before = null;
    t.addEventListener('focus', () => { before = store.mark(it.id); });
    t.addEventListener('input', () => { store.set(it.id, { [key]: t.value }, { record: false }); updateRow(it); });
    t.addEventListener('change', () => { store.pushUndo(it.id, before); before = store.mark(it.id); });
    return el('label', { class: 'blk' }, label, t); };
  side.append(ta('Comment', 'comment', 'What should change, and why (N)'));
  if (['line', 'trivia', 'text'].includes(it.kind)) side.append(ta('Suggested replacement', 'suggested', 'Exact new wording (optional)'));
  if (others.length) side.append(el('div', { class: 'others' }, el('b', {}, 'Other reviewers'), ...others.map(([r, o]) => el('div', {}, `${r} (${o.role || '—'}): `, el('b', {}, VLABEL[o.verdict] || '—'), o.comment ? ' · ' + o.comment : '', o.suggested ? ' → “' + o.suggested + '”' : ''))));
  side.append(el('div', { class: 'keys' }, el('kbd', {}, 'K'), ' keep ', el('kbd', {}, 'F'), ' fix ', el('kbd', {}, 'D'), ' delete (then next) · ', el('kbd', {}, '←'), el('kbd', {}, '→'), ' move · ', el('kbd', {}, 'N'), ' comment · ', el('kbd', {}, 'Ctrl/⌘ Z'), ' undo · ', el('kbd', {}, 'Esc'), ' leave a box'));
}
function updateRow(it) { const i = S.view.indexOf(it); if (i >= 0) S.list.update(i); }
function afterMark(it) { updateRow(it); drawSide(); drawNav(); updateProgress(); if (it.kind === 'line') { const d = document.querySelector(`.ln[data-id="${CSS.escape(it.id)}"] .dot`); if (d) d.className = 'dot ' + ((myMark(it) || {}).verdict || ''); } }

function setupKeys() {
  addEventListener('keydown', e => {
    const tgt = e.target, typing = tgt && (tgt.tagName === 'TEXTAREA' || tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT');
    if (e.key === 'Escape') { if (typing) tgt.blur(); document.body.classList.remove('navopen'); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { if (typing) return; e.preventDefault(); const id = store.undo(); if (id) { const it = S.byId.get(id); selectId(id); if (it) afterMark(it); } return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const it = S.view[S.cur];
    const k = e.key.toLowerCase();
    if ((k === 'k' || k === 'f' || k === 'd') && it) { e.preventDefault(); store.set(it.id, { verdict: { k: 'keep', f: 'fix', d: 'delete' }[k] }); afterMark(it); step(1); return; }
    if (k === 'arrowright' || k === 'arrowdown' || k === 'j') { e.preventDefault(); step(1); return; }
    if (k === 'arrowleft' || k === 'arrowup') { e.preventDefault(); step(-1); return; }
    if (k === 'pagedown') { e.preventDefault(); step(10); return; } if (k === 'pageup') { e.preventDefault(); step(-10); return; }
    if (k === 'n' && it) { e.preventDefault(); const t = $('#f-comment'); if (t) t.focus(); return; }
  });
  // swipe left / right on the stage moves between items on touch screens
  let sx = null; const v = $('#view');
  v.addEventListener('touchstart', e => { sx = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
  v.addEventListener('touchend', e => { if (!sx) return; const t = e.changedTouches[0], dx = t.clientX - sx[0], dy = t.clientY - sx[1]; if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1); sx = null; }, { passive: true });
}

// ------------------------------------------------------------------ CSV out and in
export function exportRows() {
  const rows = [];
  for (const it of S.items) {
    const base = { id: it.id, category: it.cat + ' / ' + it.group, name: it.name, where: it.where, version_added: it.version, build_version: S.data.version };
    const ms = Object.entries(store.marksFor(it.id));
    if (!ms.length) rows.push(Object.assign({ verdict: '', comment: '', suggested: '', reviewer: '', role: '', reviewed_at: '' }, base));
    for (const [r, m] of ms) rows.push(Object.assign({}, base, { verdict: m.verdict, comment: m.comment, suggested: m.suggested, reviewer: r, role: m.role, reviewed_at: m.at }));
  }
  return rows;
}
const csvText = () => toCsv(exportRows(), COLUMNS);
function downloadCsv() {
  const name = 'islamdunk-studio-' + (store.who().replace(/[^\w-]+/g, '_')) + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  const a = el('a', { href: URL.createObjectURL(new Blob([csvText()], { type: 'text/csv' })), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function copyCsv() {
  const t = csvText(), b = $('#cp');
  try { await navigator.clipboard.writeText(t); } catch (e) { const x = el('textarea'); x.value = t; document.body.append(x); x.select(); document.execCommand('copy'); x.remove(); }
  b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = 'Copy as CSV'; }, 1500);
}
export function doImport(txt, name = 'pasted') {
  let res;
  try { res = importRows(txt, { byText: S.byText, ids: new Set(S.byId.keys()), reviewer: store.who(), role: store.state.reviewer.role }); }
  catch (e) { dialog(el('p', {}, String(e.message || e))); return null; }
  const rep = store.merge(res.rows, name);
  refreshAll(); updateConflictBtn();
  dialog(el('h3', {}, 'Imported ' + name), el('p', {}, `Format: ${res.format}. ${rep.added} added, ${rep.updated} updated (newer), ${rep.kept} kept (yours were newer), ${rep.same} already the same.`),
    res.unmatched.length ? el('p', {}, `${res.unmatched.length} row(s) matched no item and were left out: `, el('small', {}, res.unmatched.slice(0, 12).map(s => '“' + String(s).slice(0, 60) + '”').join(', ') + (res.unmatched.length > 12 ? '…' : ''))) : null,
    res.skipped.length ? el('p', { class: 'note' }, `${res.skipped.length} feel-checklist row(s) skipped (they are not items).`) : null,
    rep.conflicts.length ? conflictTable(rep.conflicts) : null);
  return { res, rep };
}
function conflictTable(cs) {
  return el('table', {}, el('tr', {}, el('th', {}, 'Item'), el('th', {}, 'Reviewer'), el('th', {}, 'Yours'), el('th', {}, 'Imported'), el('th', {}, 'Kept')),
    ...cs.slice(0, 200).map(c => el('tr', {}, el('td', {}, el('a', { href: '#', onclick: e => { e.preventDefault(); $('#dlg').close(); selectId(c.id); } }, c.id)), el('td', {}, c.reviewer),
      el('td', {}, fmt(c.mine)), el('td', {}, fmt(c.theirs)), el('td', {}, c.kept === 'theirs' ? 'imported (newer)' : 'yours (newer)'))));
}
const fmt = m => (VLABEL[m.verdict] || '—') + (m.comment ? ': ' + m.comment : '') + (m.suggested ? ' → ' + m.suggested : '') + ' (' + (m.at || '').slice(0, 16).replace('T', ' ') + ')';
function showConflicts() { dialog(el('h3', {}, 'Import conflicts'), el('p', { class: 'note' }, 'The same item and reviewer, marked differently. The newest mark won.'), conflictTable(store.state.conflicts)); }
function updateConflictBtn() { const b = $('#confl'), n = store.state.conflicts.length; b.hidden = !n; b.textContent = 'Conflicts (' + n + ')'; }
function dialog(...kids) { const d = $('#dlg'); $('#dlgbody').replaceChildren(...kids); if (!d.open) d.showModal(); }

// ------------------------------------------------------------------ test hooks
Object.assign(window.__studio, {
  exportCsv: csvText, importCsv: (t, n) => { const r = doImport(t, n); $('#dlg').open && $('#dlg').close(); return r && { format: r.res.format, rows: r.res.rows.length, unmatched: r.res.unmatched.length, ...r.rep, conflicts: r.rep.conflicts.length }; },
  list: () => S.items.map(it => ({ id: it.id, cat: it.cat, group: it.group, name: it.name, where: it.where, version: it.version, religious: it.religious })),
  select: id => selectId(id),
  // render every item of a category (or all) through the stage, collecting failures
  async renderAll(cat) {
    const out = { n: 0, failed: [] }, keep = S.f;
    S.f = { cat: null, group: null, st: 'all', isNew: false, religious: false, q: '' }; applyFilters();
    for (let i = 0; i < S.view.length; i++) {
      const it = S.view[i]; if (cat && it.cat !== cat) continue;
      S.cur = i; drawStage(); out.n++;
      if (S.renderErrors[it.id]) out.failed.push({ id: it.id, error: S.renderErrors[it.id] });
      if (it.kind === 'sprite' && !document.querySelector('#view canvas')) out.failed.push({ id: it.id, error: 'no canvas' });
      if (i % 40 === 0) await new Promise(r => setTimeout(r, 0));
    }
    S.f = keep; applyFilters(); return out;
  },
  counts() { const c = {}; for (const it of S.items) { c[it.cat] = c[it.cat] || { total: 0, groups: {} }; c[it.cat].total++; c[it.cat].groups[it.group] = (c[it.cat].groups[it.group] || 0) + 1; } return c; },
  gameErrors: () => S.G.errors(),
  setFilter(f) { Object.assign(S.f, f); applyFilters(); }
});

boot().catch(e => { $('#loading').textContent = 'The studio could not start: ' + (e && e.message || e); console.error(e); window.__studio.bootError = String(e && e.stack || e); });
