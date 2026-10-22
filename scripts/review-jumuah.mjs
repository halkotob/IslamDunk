// npm run review:jumuah  (builds first; or: node scripts/review-jumuah.mjs [--page dist/web/index.html])
// v9.4 Jumu'ah review material:
//   docs/review/jumuah-reminders.md      every trivia question that can appear in a khutbah: the question, the right
//                                        answer, the explanation, and the exact line Sh. Saleem says; the questions
//                                        left out and why. Read from the built game, so it is exactly what ships.
//   docs/review/img/jumuah-<stage>-<device>.png   the visual regression baselines (tests/run.mjs jumuah-visual)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { JUMUAH_HELPERS, JUMUAH_STAGES } from '../tests/jumuah-setup.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const SEED = `(() => { let s = 1; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = rnd; window.__seed = n => { s = n | 0; }; })();`;
const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
const base = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch();
const devs = [['desktop', { viewport: { width: 1280, height: 720 } }], ['iphone', { viewport: { width: 750, height: 342 }, isMobile: true, hasTouch: true }], ['667x300', { viewport: { width: 667, height: 300 }, isMobile: true, hasTouch: true }]];
let list = null;
for (const [dn, dev] of devs) {
  const ctx = await browser.newContext(dev);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(SEED);
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking');
  await p.evaluate(JUMUAH_HELPERS); await p.evaluate(t => { Input.touchMode = t; try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} }, dn !== 'desktop');
  for (const st of JUMUAH_STAGES.filter(s => s !== 'long')) {
    await p.evaluate(s => window.__jumPhoto(s), st); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(ROOT, 'docs/review/img', `jumuah-${st}-${dn}.png`) });
  }
  if (!list) list = await p.evaluate(() => ({
    eligible: jumuahEligible().map(i => ({ i, q: TRIVIA[i][0], a: String(TRIVIA[i][1][0]), why: TRIVIA_WHY[i], core: jumuahCore(i), withQ: jumuahCore(i) !== TRIVIA_WHY[i] })),
    skipped: Object.entries(JUMUAH_SKIP).map(([i, why]) => ({ i: +i, q: TRIVIA[i][0], a: String(TRIVIA[i][1][0]), expl: TRIVIA_WHY[i], why })),
    leads: JUMUAH_LEAD.slice(), total: TRIVIA.length
  }));
  if (errs.length) { console.error(dn, errs); process.exitCode = 1; }
  await ctx.close();
}
await browser.close(); srv.close();

const md = [
  '# Jumu’ah khutbah: every reminder that can be said (v9.4)',
  '',
  'For the religious review. Generated from the game by `npm run review:jumuah`. Do not edit by hand.',
  '',
  'On a Friday in career mode, Sh. Saleem gives 2 or 3 of these reminders. Each one is an existing trivia question',
  '(`src/data/trivia.js`) and its existing explanation (`TRIVIA_WHY` in `src/career/office.js`). Nothing else is said.',
  'Each reminder starts with one of these lead-ins:',
  '',
  ...list.leads.map(l => '- “' + l.trim() + '”'),
  '',
  'When the explanation already names the answer, the reminder is the explanation alone. Otherwise the question and',
  'its answer come first (marked **Q+A** below). Fixing a reminder means fixing the trivia question or explanation.',
  '',
  `${list.eligible.length} of ${list.total} questions can appear; ${list.skipped.length} are left out (at the end).`,
  '',
  '| # | Question | Answer | Explanation (TRIVIA_WHY) | What Sh. Saleem says (after the lead-in) |',
  '|---|---|---|---|---|',
  ...list.eligible.map(e => `| ${e.i} | ${e.q} | ${e.a} | ${e.why} | ${e.withQ ? '**Q+A** ' : ''}${e.core} |`.replace(/\n/g, ' ')),
  '',
  '## Left out',
  '',
  '| # | Question | Explanation | Why |',
  '|---|---|---|---|',
  ...list.skipped.map(e => `| ${e.i} | ${e.q} | ${e.expl} | ${e.why} |`),
  ''
].join('\n');
fs.writeFileSync(path.join(ROOT, 'docs/review/jumuah-reminders.md'), md);
console.log(`jumuah-reminders.md: ${list.eligible.length} questions (${list.eligible.filter(e => e.withQ).length} with the question and answer first), ${list.skipped.length} left out; baselines written for ${devs.length} sizes`);
