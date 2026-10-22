// Review marks: one per item per reviewer ({ verdict: 'keep' | 'fix' | 'delete' | '', comment, suggested, at }).
// Saved to localStorage on every change (key islamdunk.studio). Undo is in memory for this session.
// The studio only records verdicts: "delete" means "recommend removal" and never touches the game.
export const STORE_KEY = 'islamdunk.studio';
export const ROLES = ['Content/religious', 'Art', 'Gameplay', 'Other'];
export const VERDICTS = ['keep', 'fix', 'delete'];

export function createStore(storage = window.localStorage) {
  let s;
  try { s = JSON.parse(storage.getItem(STORE_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || s.v !== 1) s = { v: 1, reviewer: { name: '', role: ROLES[0] }, lastReviewed: 'phase1', marks: {}, conflicts: [], ui: {} };
  const undo = [], subs = new Set();
  const save = () => { try { storage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { console.warn('could not save marks', e); } for (const f of subs) f(); };
  const who = () => (s.reviewer.name || '').trim() || 'reviewer';
  const st = {
    get state() { return s; },
    who,
    on(f) { subs.add(f); return () => subs.delete(f); },
    mark(id, reviewer = who()) { return (s.marks[id] && s.marks[id][reviewer]) || null; },
    marksFor(id) { return s.marks[id] || {}; },
    // set fields of the current reviewer's mark on an item
    set(id, patch, { record = true } = {}) {
      const r = who(), cur = st.mark(id, r), prev = cur ? Object.assign({}, cur) : null;
      const next = Object.assign({ verdict: '', comment: '', suggested: '' }, cur || {}, patch, { at: new Date().toISOString(), role: s.reviewer.role });
      const empty = !next.verdict && !next.comment && !next.suggested;
      s.marks[id] = s.marks[id] || {};
      if (empty) delete s.marks[id][r]; else s.marks[id][r] = next;
      if (!Object.keys(s.marks[id]).length) delete s.marks[id];
      if (record) undo.push({ id, r, prev });
      save();
    },
    pushUndo(id, prev) { undo.push({ id, r: who(), prev: prev ? Object.assign({}, prev) : null }); },
    undo() {
      const u = undo.pop(); if (!u) return null;
      s.marks[u.id] = s.marks[u.id] || {};
      if (u.prev) s.marks[u.id][u.r] = u.prev; else delete s.marks[u.id][u.r];
      if (!Object.keys(s.marks[u.id]).length) delete s.marks[u.id];
      save(); return u.id;
    },
    setReviewer(name, role) { s.reviewer = { name: name != null ? name : s.reviewer.name, role: role || s.reviewer.role }; save(); },
    setLastReviewed(v) { s.lastReviewed = v || 'phase1'; save(); },
    setUi(k, v) { s.ui[k] = v; try { storage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} },
    // import: add marks from rows { id, reviewer, role, verdict, comment, suggested, at }; newest at wins; returns a report
    merge(rows, source) {
      const rep = { added: 0, updated: 0, same: 0, kept: 0, conflicts: [] };
      for (const r of rows) {
        if (!r.verdict && !r.comment && !r.suggested) continue;
        const rv = r.reviewer || who(), cur = st.mark(r.id, rv), inc = { verdict: r.verdict || '', comment: r.comment || '', suggested: r.suggested || '', at: r.at || new Date().toISOString(), role: r.role || '' };
        if (!cur) { s.marks[r.id] = s.marks[r.id] || {}; s.marks[r.id][rv] = inc; rep.added++; continue; }
        if (cur.verdict === inc.verdict && cur.comment === inc.comment && cur.suggested === inc.suggested) { rep.same++; continue; }
        const c = { id: r.id, reviewer: rv, source, mine: cur, theirs: inc };
        if ((inc.at || '') > (cur.at || '')) { s.marks[r.id][rv] = inc; rep.updated++; c.kept = 'theirs'; } else { rep.kept++; c.kept = 'mine'; }
        rep.conflicts.push(c);
      }
      s.conflicts = rep.conflicts.concat(s.conflicts).slice(0, 500);
      save(); return rep;
    },
    clearAll() { s.marks = {}; s.conflicts = []; undo.length = 0; save(); }
  };
  return st;
}
