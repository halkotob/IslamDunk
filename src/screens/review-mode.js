// ================================================= v8.5: IN-GAME REVIEW MODE (?review=1)
// For the human review pass. Open the game with ?review=1 and the title gets a Review entry:
//   * Scenes: every story scene, the sheikh's talks and lessons, the niyyah question, partner and
//     rival scenes, and the new lines in the musalla. Play any of them as the player sees them.
//   * While a scene plays, a panel marks the current line: 1 Keep, 2 Change, 3 Cut, N for a note.
//   * Feel checklist: short questions about how the game plays, each rated 1 to 5 with a note.
//   * Export: downloads your marks and answers as a CSV to send back. Marks are kept in this
//     browser until you clear them, so you can review over several sittings.
// Reviewing never touches your career save: without a career, a throwaway one is used and not saved.
const REVIEW_ON = (() => { try { return new URLSearchParams(location.search).get('review') === '1'; } catch (e) { return false; } })();
const RV_KEY = 'islamdunk.review';
const RV = { d: null, tab: 0, idx: 0, scroll: 0, tempC: false, back: null };
function rvLoad() { if (RV.d) return RV.d; try { RV.d = JSON.parse(localStorage.getItem(RV_KEY) || 'null'); } catch (e) {} RV.d = RV.d || { marks: {}, feel: {} }; return RV.d; }
function rvSave() { try { localStorage.setItem(RV_KEY, JSON.stringify(rvLoad())); } catch (e) {} }
const FEEL_Q = [
  'Moving and dribbling feel responsive', 'Shooting: the release timing feels fair', 'Dunks and layups feel good to pull off', 'Holding Defend does what you expect',
  'Steals and blocks feel fair (both ways)', 'Difficulty: Medium is a good challenge', 'Half-court check-ups and restarts feel natural', 'The CPU teammate makes good decisions',
  'Games are a good length', 'Career: goals feel reachable, not grindy', 'The niyyah question before games is welcome, not in the way', 'Cutscenes are the right length',
  'Menus: easy to find what you want', 'Mini games are fun to come back to', 'Online play feels smooth'
];
// ---- every scene, as lines the cinematic player can show
function rvScenes() {
  if (RV.cache) return RV.cache;
  rvEnsureCareer();
  const S = RV.cache = [], isLines = a => Array.isArray(a) && a.length && Array.isArray(a[0]) && typeof a[0][0] === 'string' && (typeof a[0][1] === 'string' || a[0][0] === 'choice');
  const add = (group, title, lines) => { if (isLines(lines)) S.push({ group, title, lines }); };
  const NAMES = { intro: 'Welcome to Al-Amanah', stageIntro: 'Start of the', win: 'After a win', loss: 'After a loss', lossRival: 'After losing to Al-Burhan', stageWin: 'Champions:', tips: 'Tip' };
  const nm = (k, i) => (k === 'stageIntro' || k === 'stageWin') && STAGES[i] ? NAMES[k] + ' ' + STAGES[i].name + (k === 'stageIntro' ? ' stage' : '') : (NAMES[k] || k) + (i == null ? '' : ' ' + (i + 1));
  for (const k of Object.keys(STORY)) { const v = STORY[k]; if (isLines(v)) add('Story', nm(k), v); else if (Array.isArray(v)) v.forEach((x, i) => add('Story', nm(k, i), x)); }
  const talk = t => [...t.open().map(l => ['saleem', l]), ['choice', t.choices.map(([q, a]) => [q, a.map(l => ['saleem', l])])]];
  for (const t of SHEIKH_TALKS) { try { add(t.key.startsWith('lesson') ? 'Sheikh lessons' : 'Sheikh talks', t.key, talk(t)); } catch (e) {} }
  add('Niyyah', 'Before a game', [['saleem', 'Before you walk out there. Every game, I ask the brothers one thing: what is your intention today?'], ['choice', [['Just let me play today.', [['saleem', 'Alright. Play well, and play with adab.']]], ...NIYYAH.map(n => [n.label, [['saleem', 'You said you would ' + n.say + '. And you did. That’s the win nobody writes on the scoreboard.']]])]]]);
  for (const id of Object.keys(PARTNER_STORY)) PARTNER_STORY[id].forEach((sc, i) => add('Partners', castDef(id).name + ' ' + (i + 1), sc));
  for (const id of Object.keys(NEWS)) NEWS[id].forEach(n => { try { add('Musalla: new lines', castDef(id).name + ': ' + n.topic, n.lines().map(l => [id, l])); } catch (e) {} });
  for (const id of MUS_CAST) { const T = TALK[id]; if (!T) continue; const base = Object.getOwnPropertyDescriptor(T, 'options').get ? T.options.filter(o => !/^! /.test(o[0])) : T.options;
    try { add('Musalla talks', castDef(id).name, [[id, T.greet()], ['choice', base.map(([q, f]) => { let r = []; try { r = f(); } catch (e) {} return [q, r.map(l => [id, l])]; })]]); } catch (e) {} }
  return S;
}
function rvGroups() { const S = rvScenes(), G = []; for (const s of S) { let g = G.find(x => x.name === s.group); if (!g) G.push(g = { name: s.group, scenes: [] }); g.scenes.push(s); } return G; }
function rvEnsureCareer() {
  if (C) return;
  RV.tempC = true; C = freshCareer(); C.name = 'Reviewer'; C.bracket = makeBracket(0); C.gamesPlayed = 3; C.wins = 2;
}
function rvPlay(sc) {
  rvEnsureCareer(); setupPractice('free'); Game.review = true; RV.back = 'review';
  Game.replaying = true; playStory(sc.lines.map(l => l.slice()), () => { Game.review = false; Game.screen = 'review'; }, sc.title); Game.replaying = false;
}
function rvExit() { Game.review = false; if (RV.tempC) { C = null; RV.tempC = false; } goTitle(); }
function rvMark(text, m) { const d = rvLoad(), cur = d.marks[text] || {}; cur.m = cur.m === m ? '' : m; d.marks[text] = cur; rvSave(); SFX.blip(); }
function rvNote(text, done) {
  const d = rvLoad(), cur = d.marks[text] || (d.marks[text] = {});
  let v = null;
  try { if (typeof window.prompt === 'function') v = window.prompt('Note for this line:', cur.note || ''); } catch (e) { v = null; }
  if (v !== null && v !== undefined) { cur.note = String(v).slice(0, 400); rvSave(); done && done(); return; }
  csAskName('Note (letters only)', cur.note || '', 60, s => { cur.note = s; rvSave(); done && done(); });
}
function rvExport() {
  const d = rvLoad(), esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const L = ['Kind,Text,Mark,Note'];
  for (const [t, v] of Object.entries(d.marks)) if (v.m || v.note) L.push(['line', t, v.m || '', v.note || ''].map(esc).join(','));
  FEEL_Q.forEach((q, i) => { const f = d.feel[i] || {}; if (f.r || f.note) L.push(['feel', q, f.r || '', f.note || ''].map(esc).join(',')); });
  try {
    const blob = new Blob([L.join('\n') + '\n'], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'islamdunk-review.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Saved islamdunk-review.csv. Send it back and the changes go in.', 3.5);
  } catch (e) { toast('Could not save the file here', 3); }
  RV.lastExport = L.join('\n');
}
// ---- the review screen: Scenes (by group) | Feel checklist | Export
function rvRows() {
  if (RV.tab === 0) { const out = []; for (const g of rvGroups()) { out.push({ head: g.name }); for (const s of g.scenes) out.push({ sc: s }); } return out; }
  if (RV.tab === 1) return FEEL_Q.map((q, i) => ({ q, i }));
  return [{ act: 'export', label: 'Download my marks (CSV)' }, { act: 'clear', label: 'Clear all marks' }];
}
function rvUpdate() {
  const R = rvRows(), n = R.length, sel = () => R[RV.idx];
  const move = d => { do RV.idx = (RV.idx + d + n) % n; while (R[RV.idx] && R[RV.idx].head && n > 1); SFX.blip(); };
  if (R[RV.idx] && R[RV.idx].head) move(1);
  if (menuHit('up')) move(-1);
  if (menuHit('down')) move(1);
  if (Input.pressed.Tab || Input.pressed.KeyQ || Input.pressed.KeyE) { RV.tab = (RV.tab + 1) % 3; RV.idx = 0; RV.scroll = 0; SFX.blip(); return; }
  const r = sel();
  if (RV.tab === 1 && r) {
    const f = rvLoad().feel[r.i] || (rvLoad().feel[r.i] = {});
    if (menuHit('left')) { f.r = clamp((f.r || 3) - 1, 1, 5); rvSave(); SFX.blip(); }
    if (menuHit('right')) { f.r = clamp((f.r || 2) + 1, 1, 5); rvSave(); SFX.blip(); }
    if (Input.pressed.KeyN || menuHit('ok')) rvFeelNote(r.i);
  } else if (menuHit('ok') && r) rvSelect(r);
  if (menuHit('back')) rvExit();
}
function rvFeelNote(i) {
  const f = rvLoad().feel[i] || (rvLoad().feel[i] = {});
  let v = null; try { if (typeof window.prompt === 'function') v = window.prompt(FEEL_Q[i], f.note || ''); } catch (e) {}
  if (v !== null && v !== undefined) { f.note = String(v).slice(0, 400); rvSave(); return; }
  csAskName('Note (letters only)', f.note || '', 60, s => { f.note = s; rvSave(); });
}
function rvSelect(r) {
  if (r.sc) rvPlay(r.sc);
  else if (r.act === 'export') rvExport();
  else if (r.act === 'clear') { if (RV.confirm) { RV.d = { marks: {}, feel: {} }; rvSave(); RV.confirm = false; toast('Cleared', 1.5); } else { RV.confirm = true; toast('Press again to clear every mark', 2.5); } }
}
function rvCount(sc) { const d = rvLoad().marks; return sc.lines.filter(l => l[0] !== 'choice' && d[l[1]] && (d[l[1]].m || d[l[1]].note)).length; }
function drawReview(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Review', W / 2, 46);
  ['Scenes', 'Feel checklist', 'Export'].forEach((t, i) => { const x = W / 2 - 250 + i * 170, on = RV.tab === i; g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, x, 60, 160, 30, 15); g.fill(); g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.fillText(t, x + 80, 80); addRect(x, 60, 160, 30, () => { RV.tab = i; RV.idx = 0; RV.scroll = 0; }); });
  const R = rvRows(), vis = 10, d = rvLoad();
  RV.scroll = clamp(RV.scroll, Math.max(0, RV.idx - vis + 2), RV.idx);
  panel(g, 60, 102, 840, 400, false);
  R.slice(RV.scroll, RV.scroll + vis).forEach((r, k) => {
    const i = RV.scroll + k, y = 112 + k * 38, on = i === RV.idx;
    if (r.head) { g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(r.head.toUpperCase(), 80, y + 24); return; }
    g.fillStyle = on ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.05)'; roundRect(g, 72, y, 816, 32, 8); g.fill();
    g.textAlign = 'left'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${BODY}`;
    if (r.sc) { g.fillText(r.sc.title, 92, y + 21); const c = rvCount(r.sc); g.textAlign = 'right'; g.fillStyle = on ? NIGHT : '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(r.sc.lines.length + ' lines' + (c ? '  •  ' + c + ' marked' : ''), 870, y + 21); }
    else if (r.q) { let t = r.q; g.fillText(t, 92, y + 21); const f = d.feel[r.i] || {}; g.textAlign = 'right'; g.font = `14px ${FONT}`; g.fillText((f.note ? '✎  ' : '') + '◂ ' + (f.r ? '★'.repeat(f.r) + '☆'.repeat(5 - f.r) : 'not rated') + ' ▸', 870, y + 21); }
    else g.fillText(r.label, 92, y + 21);
    addRect(72, y, 816, 32, () => { if (RV.idx === i) { if (r.q) rvFeelNote(r.i); else rvSelect(r); } RV.idx = i; });
  });
  if (RV.tab === 2) {
    const n = Object.values(d.marks).filter(v => v.m || v.note).length, f = Object.values(d.feel).filter(v => v.r || v.note).length;
    g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText(n + ' lines marked, ' + f + ' of ' + FEEL_Q.length + ' checklist answers.', 92, 220);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; wrapTextLeft(g, 'The CSV opens in Google Sheets or Excel. You can also mark the full text list in docs/review/game-text.csv; both are fine.', 92, 250, 760, 18);
  }
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`;
  g.fillText(RV.tab === 0 ? 'Enter plays a scene. While it plays: 1 Keep, 2 Change, 3 Cut, N note.  Tab switches tabs.' : RV.tab === 1 ? '← → rate 1 to 5, Enter or N adds a note.  Tab switches tabs.' : 'Enter to choose.  Tab switches tabs.', W / 2, 524);
  W = rw; Game.ox = 0; g.restore();
}
// ---- the mark panel over a playing scene
function rvLine() { const s = Game.story; if (!s) return null; const l = s.lines[Math.min(s.i, s.lines.length - 1)]; return l && l[0] !== 'choice' ? l : null; }
function drawReviewPanel(g) {
  const l = rvLine(); if (!l) return;
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  const v = rvLoad().marks[l[1]] || {}, x = W - 330, y = 54;
  g.fillStyle = 'rgba(8,16,24,0.88)'; roundRect(g, x, y, 316, 84, 12); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.5)'; g.lineWidth = 1; g.stroke();
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `11px ${FONT}`; g.fillText('REVIEW THIS LINE', x + 12, y + 18);
  [['Keep', 'keep', '1'], ['Change', 'change', '2'], ['Cut', 'cut', '3'], ['Note', 'note', 'N']].forEach(([lab, k, key], i) => {
    const bx = x + 10 + i * 76, on = k === 'note' ? !!v.note : v.m === k;
    g.fillStyle = on ? (k === 'cut' ? '#e07a6a' : k === 'change' ? '#e8c35a' : '#57d68d') : 'rgba(255,255,255,0.1)'; roundRect(g, bx, y + 28, 70, 26, 13); g.fill();
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText(key + '  ' + lab, bx + 35, y + 46);
    addRect(bx, y + 28, 70, 26, () => (k === 'note' ? rvNote(l[1]) : rvMark(l[1], k)));
  });
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; let t = v.note ? 'Note: ' + v.note : 'Marks are saved as you go.'; while (g.measureText(t).width > 292 && t.length > 6) t = t.slice(0, -2); g.fillText(t, x + 12, y + 72);
  W = rw; Game.ox = 0; g.restore();
}
{
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.review && Game.screen === 'story') {
      const l = rvLine();
      if (l) { if (Input.pressed.Digit1) { rvMark(l[1], 'keep'); return; } if (Input.pressed.Digit2) { rvMark(l[1], 'change'); return; } if (Input.pressed.Digit3) { rvMark(l[1], 'cut'); return; } if (Input.pressed.KeyN) { rvNote(l[1], () => { Game.screen = 'story'; }); return; } }
    }
    return _cu.apply(this, arguments);
  };
  const _sc = saveCareer; saveCareer = function () { if (RV.tempC) return false; return _sc.apply(this, arguments); };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const was = Game.screen === 'review'; _gu.apply(this, arguments); if (was && Game.screen === 'review') { rvUpdate(); attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); if (Game.screen === 'review') { drawReview(g); drawBackButton(g); } else if (Game.review && Game.screen === 'story') drawReviewPanel(g); };
  BACK.review = () => rvExit();
  if (REVIEW_ON) { const _tm = TITLE_MENU; TITLE_MENU = function () { return [..._tm(), { label: 'Review', act: () => { Game.screen = 'review'; RV.tab = 0; RV.idx = 0; } }]; }; }
}
