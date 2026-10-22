// npm run review:report -- <studio-export.csv> [more.csv ...]
// Prints a worklist from Review Studio exports, grouped by source file: the items recommended for removal
// (Delete) and the items to fix (Fix, with the comment and the suggested text). It only prints. It never
// changes the game, game-text.csv or anything else.
import fs from 'node:fs';
import { parseCsv } from '../src/review-studio/csv.js';

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!files.length) { console.error('usage: npm run review:report -- <studio-export.csv> [more.csv ...]'); process.exit(2); }
const rows = [];
for (const f of files) {
  const { head, rows: r } = parseCsv(fs.readFileSync(f, 'utf8'));
  if (!head.includes('id') || !head.includes('verdict')) { console.error(`${f}: not a Review Studio export (needs id and verdict columns)`); process.exit(2); }
  rows.push(...r.filter(x => x.verdict === 'fix' || x.verdict === 'delete'));
}
const byFile = new Map();
for (const r of rows) {
  const file = (r.where || '').replace(/:\d+$/, '') || '(no file)';
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(r);
}
const line = r => +((/:(\d+)$/.exec(r.where || '') || [])[1] || 0);
const one = s => String(s || '').replace(/\s+/g, ' ').trim();
const nDel = rows.filter(r => r.verdict === 'delete').length, nFix = rows.length - nDel;
console.log(`Review worklist from ${files.join(', ')}: ${nDel} to remove (recommended), ${nFix} to fix, in ${byFile.size} file(s). Nothing has been changed.\n`);
for (const [file, list] of [...byFile].sort((a, b) => a[0].localeCompare(b[0]))) {
  list.sort((a, b) => line(a) - line(b) || a.id.localeCompare(b.id));
  console.log(`== ${file}`);
  const del = list.filter(r => r.verdict === 'delete'), fix = list.filter(r => r.verdict === 'fix');
  if (del.length) { console.log('  Delete (recommended):'); for (const r of del) console.log(`    ${r.where || '-'}  ${r.id}\n      “${one(r.name).slice(0, 160)}”${r.comment ? '\n      why: ' + one(r.comment) : ''}  [${r.reviewer || '?'}${r.role ? ', ' + r.role : ''}]`); }
  if (fix.length) { console.log('  Fix:'); for (const r of fix) console.log(`    ${r.where || '-'}  ${r.id}\n      now:  “${one(r.name).slice(0, 160)}”${r.comment ? '\n      note: ' + one(r.comment) : ''}${r.suggested ? '\n      new:  “' + one(r.suggested) + '”' : ''}  [${r.reviewer || '?'}${r.role ? ', ' + r.role : ''}]`); }
  console.log('');
}
