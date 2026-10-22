// CSV: export, parse, and the three import formats.
//   studio      id, category, name, where, version_added, verdict, comment, suggested, reviewer, role, reviewed_at, build_version
//   game-text   the docs/review/game-text.csv packet: Keep / Change / Cut, Suggested text, Notes (matched by Text)
//   in-game     the ?review=1 export islamdunk-review.csv: Kind, Text, Mark, Note (lines matched by Text)
// Change -> fix and Cut -> delete. Rows that match no item are reported, never guessed.
export const COLUMNS = ['id', 'category', 'name', 'where', 'version_added', 'verdict', 'comment', 'suggested', 'reviewer', 'role', 'reviewed_at', 'build_version'];
const esc = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCsv(rows, cols = COLUMNS) { return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n'; }
export function parseCsv(txt) {
  const rows = []; let row = [], cell = '', q = false;
  txt = txt.replace(/^﻿/, '');
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"' && txt[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift() || [];
  return { head, rows: rows.filter(r => r.some(x => x !== '')).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] == null ? '' : r[i]]))) };
}
export const VERDICT_OF = { keep: 'keep', change: 'fix', fix: 'fix', cut: 'delete', delete: 'delete', remove: 'delete', '1': 'keep', '2': 'fix', '3': 'delete' };
// rows for the store's merge(): { id, reviewer, role, verdict, comment, suggested, at }; unmatched lists what had no item
export function importRows(txt, { byText, ids, reviewer, role, now = new Date().toISOString() }) {
  const { head, rows } = parseCsv(txt), out = [], unmatched = [], skipped = [];
  const v = s => VERDICT_OF[String(s || '').trim().toLowerCase()] || '';
  if (head.includes('id') && head.includes('verdict')) {
    for (const r of rows) { if (!ids.has(r.id)) { if (r.verdict || r.comment || r.suggested) unmatched.push(r.id); continue; }
      out.push({ id: r.id, reviewer: r.reviewer || reviewer, role: r.role || role, verdict: v(r.verdict), comment: r.comment || '', suggested: r.suggested || '', at: r.reviewed_at || now }); }
    return { format: 'studio', rows: out, unmatched, skipped };
  }
  if (head.includes('Keep / Change / Cut')) {
    for (const r of rows) { const verdict = v(r['Keep / Change / Cut']); if (!verdict && !r['Suggested text'] && !r.Notes) continue;
      const hit = byText.get(norm(r.Text)); if (!hit) { unmatched.push(r.Text); continue; }
      for (const id of hit) out.push({ id, reviewer, role, verdict, comment: r.Notes || '', suggested: r['Suggested text'] || '', at: now }); }
    return { format: 'game-text.csv', rows: out, unmatched, skipped };
  }
  if (head.includes('Kind') && head.includes('Mark')) {
    for (const r of rows) { if (r.Kind !== 'line') { skipped.push(r.Kind + ': ' + r.Text); continue; }
      const hit = byText.get(norm(r.Text)); if (!hit) { unmatched.push(r.Text); continue; }
      for (const id of hit) out.push({ id, reviewer, role, verdict: v(r.Mark), comment: r.Note || '', suggested: '', at: now }); }
    return { format: 'in-game review', rows: out, unmatched, skipped };
  }
  throw new Error('Not a CSV the studio knows: expected the studio export, game-text.csv or islamdunk-review.csv');
}
export const norm = t => String(t || '').replace(/\s+/g, ' ').trim();
