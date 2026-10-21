// npm run review:export
// Rebuilds the human review packet from the game source, so it always matches the current game:
//   docs/review/game-text.csv   every player-facing line, one row each, ready for a spreadsheet
//   docs/review/game-text.md    the same, grouped by section, for reading on GitHub or a phone
// A line is player-facing when it's a string in the source that reads like a sentence or a label
// (letters and spaces, not code, colors, fonts or keys). Lines that weren't in the Phase 1 packet are
// marked "new" so a reviewer can do only those. If an earlier packet has marks in it
// (Keep / Change / Cut, Suggested text, Notes), they're carried over by matching text.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'docs', 'review');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const files = manifest.files || manifest.order || manifest;

// ---- sections by file
const SECTION = [
  [/sim\/noor-powers/, 'Noor power-ups (v8.6.1: review the wording)'],
  [/career\/calendar/, 'Career calendar (v9.0: review the month, weekday and holiday names)'],
  [/career\/world\//, 'Neighbourhood (v9.2: review the people, their lines, the signs and the store)'],
  [/data\/trivia/, 'Trivia'], [/data\/achievements/, 'Achievements'], [/career\/office/, 'Sheikh'], [/career\/career-story/, 'Sheikh, niyyah and stories'],
  [/career\/(career|career-screens|cinema|seasons|intro-world|musalla|musalla-walk|progression|salah)\.js/, 'Story and dialogue'],
  [/career\/(career-goals|gym-routines|gym-drills|masjid-props|masjid-projects)/, 'Career: goals, gym and masjid'],
  [/career\/barakah/, 'Barakah Run'], [/data\/teams|builds/, 'Characters and teams'], [/venues/, 'Courts'],
  [/screens\/(tutorial)/, 'Tutorial'], [/screens\/(creator-suite)/, 'Teams & Players'], [/online\//, 'Online'],
  [/sim\/(v8-kotc|v8-atw|mini-games)|minis-menu/, 'Mini games'], [/render\/|reactions|game-feel/, 'On-screen reactions (callouts)'],
  [/screens\//, 'Menus and screens'], [/sim\//, 'Callouts and messages in play']
];
// v8.6.1: rows to highlight for the Islamic-wording review (the Noor power-ups and the Noor text that changed with them)
const FLAG = { file: /sim\/noor-powers/, text: /Noor power-up|Choose your Noor/, note: 'REVIEW 8.6.1: Islamic wording (Noor power-ups)' };
// v9.0: the career calendar's month and holiday names (an in-game calendar, not real dates)
const FLAG9 = { file: /career\/calendar/, note: 'REVIEW 9.0: Islamic wording (calendar months and holidays)' };
// v9.2: everything new in the neighbourhood (NPC lines, signs, the store, banners)
const FLAG92 = { file: /career\/world\//, note: 'REVIEW 9.2: neighbourhood text (people, signs, the store)' };
const sectionOf = f => (SECTION.find(([re]) => re.test(f)) || [, 'Other'])[1];

// ---- string literals with line numbers (skips comments; template literals keep ${...} as …)
function literals(code) {
  const out = []; let i = 0, line = 1;
  const n = code.length;
  while (i < n) {
    const c = code[i], d = code[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, start = line; let s = ''; i++;
      while (i < n && code[i] !== q) {
        if (code[i] === '\\') { s += code[i] + code[i + 1]; i += 2; continue; }
        if (q === '`' && code[i] === '$' && code[i + 1] === '{') { let depth = 1; i += 2; while (i < n && depth) { if (code[i] === '{') depth++; else if (code[i] === '}') depth--; i++; } s += '…'; continue; }
        if (code[i] === '\n') line++;
        s += code[i]; i++;
      }
      i++;
      out.push({ s, line: start, prev: code.slice(Math.max(0, i - s.length - 40), i - s.length - 1) });
      continue;
    }
    i++;
  }
  return out;
}
const unesc = s => s.replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\n/g, ' ').replace(/\\(['"`\\])/g, '$1');
function playerFacing(t) {
  if (t.length < 4) return false;
  if (!/[A-Za-z]{2}/.test(t)) return /[؀-ۿ]{2}/.test(t);               // Arabic lines count
  if (/^[#.]?[\w-]+$/.test(t) && !/^[A-Z][a-z]+$/.test(t)) return false;          // identifiers, keys, ids
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /rgba?\(|^(Backquote|Escape|Enter|Space|Tab|Shift\w*|Digit)$/.test(t) || /\bpx\b|\d+px|font-|Key[A-Z]|Arrow|Numpad/.test(t)) return false;
  if (/[{}=;]|=>|\(\)|^\.|\/\//.test(t)) return false;
  if (/^(idle|dribble|shot|pass|loose|held|play|title|hub|gym|story|thobe|kufi|hair|topi|imama|crochet|left|right|center|middle|alphabetic|round|bold|monospace)$/.test(t)) return false;
  if (/^(islamdunk|data:|https?:|\w+\.\w+$)/.test(t)) return false;
  return /\s/.test(t) || /^[A-Z][a-z]{3,}/.test(t) || /[؀-ۿ]/.test(t);
}
const SPEAKERS = { saleem: 'Sh. Saleem', khalil: 'Khalil', nasser: 'Nasser', mahmoud: 'Uncle Mahmoud', rafiq: 'Uncle Rafiq', tariq: 'Tariq', siddiq: 'Uncle Siddiq', jalal: 'Jalal', you: 'You', hamid: 'Hamid' };

// ---- previous packet: the Phase 1 text (for "new") and any marks already made
const csvRows = txt => { const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < txt.length; i++) { const c = txt[i]; if (q) { if (c === '"' && txt[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows; };
const prevFile = path.join(OUT, 'game-text.csv'), baseFile = path.join(OUT, 'phase1-text.txt');
const prev = fs.existsSync(prevFile) ? csvRows(fs.readFileSync(prevFile, 'utf8')) : [];
const head = prev[0] || [], ti = head.indexOf('Text'), mk = head.indexOf('Keep / Change / Cut'), sg = head.indexOf('Suggested text'), nt = head.indexOf('Notes');
if (!fs.existsSync(baseFile) && prev.length) fs.writeFileSync(baseFile, prev.slice(1).map(r => r[ti]).filter(Boolean).join('\n') + '\n');   // freeze the Phase 1 list once
const phase1 = new Set(fs.existsSync(baseFile) ? fs.readFileSync(baseFile, 'utf8').split('\n').map(s => s.trim()) : []);
const marks = new Map(); for (const r of prev.slice(1)) if (r[ti] && (r[mk] || r[sg] || r[nt])) marks.set(r[ti], [r[mk] || '', r[sg] || '', r[nt] || '']);

// ---- collect
const rows = [], seen = new Map();
for (const f of files) {
  const p = path.join(SRC, f); if (!fs.existsSync(p) || /dev-panel|bench|poss-log|adaptive-res/.test(f)) continue;   // developer-only screens
  for (const L of literals(fs.readFileSync(p, 'utf8'))) {
    const text = unesc(L.s).replace(/\s+/g, ' ').trim();
    if (!playerFacing(text)) continue;
    const flagged = FLAG.file.test(f) || FLAG9.file.test(f) || FLAG92.file.test(f);                                  // the review section lists every one of its lines, even if repeated elsewhere
    if (seen.has(text) && !flagged) { seen.get(text).also++; continue; }
    const sp = /\[\s*'(\w+)'\s*,\s*$/.exec(L.prev); const who = sp && SPEAKERS[sp[1]];
    const r = { section: sectionOf(f), where: f + ':' + L.line + (who ? ' — ' + who : ''), text, isNew: phase1.size && !phase1.has(text) ? 'new' : '', flag: FLAG92.file.test(f) ? FLAG92.note : FLAG9.file.test(f) ? FLAG9.note : flagged || FLAG.text.test(text) ? FLAG.note : '', also: 0 };
    if (!seen.has(text)) seen.set(text, r); rows.push(r);
  }
}
const order = [...new Set(SECTION.map(s => s[1]).concat('Other'))];
rows.sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
// ---- write
const esc = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
const csv = ['#,Section,Where,New since Phase 1,Review flag,Text,Keep / Change / Cut,Suggested text,Notes'];
rows.forEach((r, i) => { const m = marks.get(r.text) || ['', '', '']; csv.push([i + 1, r.section, r.where, r.isNew, r.flag, r.text, ...m].map(x => esc(String(x))).join(',')); });
fs.writeFileSync(prevFile, csv.join('\n') + '\n');
const newN = rows.filter(r => r.isNew).length;
let md = '# Islam Dunk: every line of game text\n\nGenerated by `npm run review:export` from the game source. Mark up `game-text.csv` in a spreadsheet (Keep / Change / Cut, suggested text, notes), or use the in-game review mode (`?review=1`). Row numbers match the CSV.\n\n'
  + `${rows.length} lines, ${newN} new since the Phase 1 packet (marked **NEW**).\n`;
for (const sec of order) {
  const R = rows.map((r, i) => [i + 1, r]).filter(([, r]) => r.section === sec); if (!R.length) continue;
  md += `\n## ${sec}\n\n| # | Where | Text |\n|---|---|---|\n`;
  for (const [i, r] of R) md += `| ${i} | \`${r.where.replace(/\|/g, '/')}\` | ${r.flag ? '**' + r.flag.split(':')[0] + '** ' : ''}${r.isNew ? '**NEW** ' : ''}${r.text.replace(/\|/g, '\\|')} |\n`;
}
fs.writeFileSync(path.join(OUT, 'game-text.md'), md);
console.log(`review packet: ${rows.length} lines (${newN} new since Phase 1, ${rows.filter(r => r.flag === FLAG.note).length} flagged for the 8.6.1 wording review, ${rows.filter(r => r.flag === FLAG9.note).length} for the 9.0 calendar review, ${rows.filter(r => r.flag === FLAG92.note).length} for the 9.2 neighbourhood review), ${marks.size} earlier marks carried over`);
