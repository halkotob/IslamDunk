// Shared by scripts/review-export.mjs (the CSV packet) and the Review Studio build (tools/vite-plugin-review.js):
// every player-facing string literal in the game source, with its file:line, section, review flag, speaker,
// and whether it's new since the Phase 1 packet. The extraction rules are unchanged from review-export.
import fs from 'node:fs';
import path from 'node:path';

// ---- sections by file
export const SECTION = [
  [/sim\/noor-powers/, 'Noor power-ups (v8.6.1: review the wording)'],
  [/career\/calendar/, 'Career calendar (v9.0: review the month, weekday and holiday names)'],
  [/career\/world\//, 'Neighbourhood (v9.2: review the people, their lines, the signs and the store)'],
  [/career\/jumuah/, 'Jumu’ah (v9.4: the scene; the khutbah itself is built from the trivia bank)'],
  [/data\/trivia/, 'Trivia'], [/data\/achievements/, 'Achievements'], [/career\/office/, 'Sheikh'], [/career\/career-story/, 'Sheikh, niyyah and stories'],
  [/career\/(career|career-screens|cinema|seasons|intro-world|musalla|musalla-walk|progression|salah)\.js/, 'Story and dialogue'],
  [/career\/(career-goals|gym-routines|gym-drills|masjid-props|masjid-projects)/, 'Career: goals, gym and masjid'],
  [/career\/barakah/, 'Barakah Run'], [/data\/teams|builds/, 'Characters and teams'], [/venues/, 'Courts'],
  [/screens\/(tutorial)/, 'Tutorial'], [/screens\/(creator-suite)/, 'Teams & Players'], [/online\//, 'Online'],
  [/sim\/(v8-kotc|v8-atw|mini-games)|minis-menu/, 'Mini games'], [/render\/|reactions|game-feel/, 'On-screen reactions (callouts)'],
  [/screens\//, 'Menus and screens'], [/sim\//, 'Callouts and messages in play']
];
// v8.6.1: rows to highlight for the Islamic-wording review (the Noor power-ups and the Noor text that changed with them)
export const FLAG = { file: /sim\/noor-powers/, text: /Noor power-up|Choose your Noor/, note: 'REVIEW 8.6.1: Islamic wording (Noor power-ups)' };
// v9.0: the career calendar's month and holiday names (an in-game calendar, not real dates)
export const FLAG9 = { file: /career\/calendar/, note: 'REVIEW 9.0: Islamic wording (calendar months and holidays)' };
// v9.2: everything new in the neighbourhood (NPC lines, signs, the store, banners)
export const FLAG92 = { file: /career\/world\//, note: 'REVIEW 9.2: neighbourhood text (people, signs, the store)' };
export const FLAG93 = { file: /career\/jumuah/, note: 'REVIEW 9.4: Jumu’ah (religious review)' };
export const sectionOf = f => (SECTION.find(([re]) => re.test(f)) || [, 'Other'])[1];

// ---- string literals with line numbers (skips comments; template literals keep ${...} as …)
export function literals(code) {
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
export const unesc = s => s.replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\n/g, ' ').replace(/\\(['"`\\])/g, '$1');
export function playerFacing(t) {
  if (t.length < 4) return false;
  if (!/[A-Za-z]{2}/.test(t)) return /[؀-ۿ]{2}/.test(t);               // Arabic lines count
  if (/^[#.]?[\w-]+$/.test(t) && !/^[A-Z][a-z]+$/.test(t)) return false;          // identifiers, keys, ids
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /rgba?\(|^(Backquote|Escape|Enter|Space|Tab|Shift\w*|Digit)$/.test(t) || /\bpx\b|\d+px|font-|Key[A-Z]|Arrow|Numpad/.test(t)) return false;
  if (/[{}=;]|=>|\(\)|^\.|\/\//.test(t)) return false;
  if (/^(idle|dribble|shot|pass|loose|held|play|title|hub|gym|story|thobe|kufi|hair|topi|imama|crochet|left|right|center|middle|alphabetic|round|bold|monospace)$/.test(t)) return false;
  if (/^(islamdunk|data:|https?:|\w+\.\w+$)/.test(t)) return false;
  return /\s/.test(t) || /^[A-Z][a-z]{3,}/.test(t) || /[؀-ۿ]/.test(t);
}
export const SPEAKERS = { saleem: 'Sh. Saleem', khalil: 'Khalil', nasser: 'Nasser', mahmoud: 'Uncle Mahmoud', rafiq: 'Uncle Rafiq', tariq: 'Tariq', siddiq: 'Uncle Siddiq', jalal: 'Jalal', you: 'You', hamid: 'Hamid' };

export const csvRows = txt => { const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < txt.length; i++) { const c = txt[i]; if (q) { if (c === '"' && txt[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows; };
export function manifestFiles(root) { const m = JSON.parse(fs.readFileSync(path.join(root, 'src', 'manifest.json'), 'utf8')); return m.files || m.order || m; }
export function phase1Set(root) { const f = path.join(root, 'docs', 'review', 'phase1-text.txt'); return new Set(fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map(s => s.trim()) : []); }
// every row, deduplicated by text (a flagged section keeps its own copies), sorted by section
export function collectText(root, phase1 = phase1Set(root)) {
  const SRC = path.join(root, 'src'), rows = [], seen = new Map();
  for (const f of manifestFiles(root)) {
    const p = path.join(SRC, f); if (!fs.existsSync(p) || /dev-panel|bench|poss-log|adaptive-res/.test(f)) continue;   // developer-only screens
    for (const L of literals(fs.readFileSync(p, 'utf8'))) {
      const text = unesc(L.s).replace(/\s+/g, ' ').trim();
      if (!playerFacing(text)) continue;
      const flagged = FLAG.file.test(f) || FLAG9.file.test(f) || FLAG92.file.test(f) || FLAG93.file.test(f);                                  // the review section lists every one of its lines, even if repeated elsewhere
      if (seen.has(text) && !flagged) { seen.get(text).also++; continue; }
      const sp = /\[\s*'(\w+)'\s*,\s*$/.exec(L.prev); const who = sp && SPEAKERS[sp[1]];
      const r = { section: sectionOf(f), file: f, line: L.line, speaker: sp ? sp[1] : null, where: f + ':' + L.line + (who ? ' — ' + who : ''), text, isNew: phase1.size && !phase1.has(text) ? 'new' : '', flag: FLAG93.file.test(f) ? FLAG93.note : FLAG92.file.test(f) ? FLAG92.note : FLAG9.file.test(f) ? FLAG9.note : flagged || FLAG.text.test(text) ? FLAG.note : '', also: 0 };
      if (!seen.has(text)) seen.set(text, r); rows.push(r);
    }
  }
  const order = [...new Set(SECTION.map(s => s[1]).concat('Other'))];
  rows.sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
  return rows;
}
export const SECTION_ORDER = () => [...new Set(SECTION.map(s => s[1]).concat('Other'))];

// v9.4: every khutbah reminder, composed exactly as the game does (src/career/jumuah.js between the <jumuah-text>
// markers, run against src/data/trivia.js and TRIVIA_WHY in src/career/office.js)
export function jumuahReminders(root) {
  const read = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
  const tv = read('data/trivia.js'), of = read('career/office.js'), ju = read('career/jumuah.js');
  const a = of.indexOf('const TRIVIA_WHY'), b = of.indexOf('];', a) + 2;
  const j0 = ju.indexOf('// <jumuah-text>'), j1 = ju.indexOf('// </jumuah-text>');
  if (a < 0 || j0 < 0 || j1 < 0) return [];
  const lines = ju.slice(0, j1).split('\n').length;
  const src = tv + '\n' + of.slice(a, b) + '\n' + ju.slice(j0, j1) + '\nreturn { TRIVIA, TRIVIA_WHY, JUMUAH_SKIP, jumuahEligible, jumuahCore };';
  const m = new Function(src)();
  const tl = i => { const k = tv.indexOf(JSON.stringify(m.TRIVIA[i][0]).slice(1, -1).slice(0, 30)); return k < 0 ? 0 : tv.slice(0, k).split('\n').length; };
  return m.jumuahEligible().map(i => ({ i, text: m.jumuahCore(i), where: 'data/trivia.js:' + tl(i) + ' (trivia #' + i + ') + career/office.js TRIVIA_WHY', jline: lines }));
}
