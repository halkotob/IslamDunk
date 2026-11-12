// node tools/diff-report.mjs [--page dist/web/index.html] [--only ladder,first3,gap,sweep] [--n 48] [--n3 24] [--diffs easy,medium] [--sweep "0:-1,0;1:0.5"] [--sdiff medium] [--json out.json]
//
// v9.19.2: how hard career games are, measured by results. A mixed-play bot plays your slot (the same input path as
// a person: M.cmdHook into humanCmd). Each possession it leans to a drive (40%), a jumper (40%) or a pass, and plays
// it like a decent player: shoots when open (no defender within 65), drives while the lane is clear, passes to an open
// teammate when it isn't, shoots before the shot clock runs out; releases near the top with a person's timing error
// (about 50 ms). On defense it stays between its man and the rim, holds Defend near the ball, contests his shot
// (a jump) and sometimes reaches; it crashes the boards after a shot. Your teammate and the other team are the CPU, as in a career game.
//   ladder  each difficulty (Very easy .. Hard) x each career stage (Local .. World), the career's own CPU dials for
//           both teams (careerLevels + diffAt), every player's ratings equal to the stage's (4.6, 5.6, 6.6, 7.5):
//           win rate, average margin, your FG%, the CPU's FG%, steals by each side, the CPU's skill moves per 100
//           possessions (dribble moves and signature moves of the other team)
//   first3  the first three games of a new career (Local, the real bracket, Sh. Saleem, all levels 4 plus the
//           build's modifiers) for each play style, at each difficulty asked (--diffs, default medium)
//   gap     ratings unequal: at Medium, State dials, your team rated 5 + d against 5 (d = -2..2): wins per rating point
//   sweep   calibration: the other team's level L set directly at each stage, ratings equal (--sweep "stage:L,L;stage:L")
// The same seeds every run: two builds can be compared like for like (--page any built index.html, back to 9.17.5).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DIFF_JS } from './diff-bot.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const ONLY = arg('--only', 'ladder,first3').split(','), N = +arg('--n', 48) | 0, N3 = +arg('--n3', 24) | 0, JSON_OUT = arg('--json', null);
const DIFFS3 = arg('--diffs', 'medium').split(','), PAR = +arg('--par', 2) | 0;
if (!fs.existsSync(PAGE)) { console.error(`No build at ${PAGE}`); process.exit(1); }
const srv = await new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const file = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u);
    fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res(s));
});
// ---- in the page: the bot, the stats, one game
const browser = await chromium.launch();
const pages = [];
for (let i = 0; i < PAR; i++) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {} })();`);
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', e => p.__errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/?nowelcome=1`);
  await p.waitForFunction(() => typeof Game !== 'undefined' && typeof newMatch === 'function' && Game.screen === 'title', null, { timeout: 30000 });
  await p.waitForTimeout(500); await p.evaluate(() => { window.requestAnimationFrame = () => 0; }); await p.evaluate(DIFF_JS);
  pages.push(p);
}
const version = await pages[0].evaluate(() => VERSION);
// run jobs across the pages
async function runJobs(jobs) { const out = new Array(jobs.length); let next = 0;
  await Promise.all(pages.map(async p => { while (next < jobs.length) { const i = next++; out[i] = await p.evaluate(jobs[i].js); } })); return out; }
const pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : '-';
const summ = rs => { const n = rs.length, w = rs.filter(r => r.won).length, f = k => rs.reduce((a, r) => a + r[k], 0);
  return { n, win: w / n, margin: (f('us') - f('them')) / n, meFg: f('meFgm') / Math.max(1, f('meFga')), cpuFg: f('cpuFgm') / Math.max(1, f('cpuFga')), stlUs: f('stlUs') / n, stlThem: f('stlThem') / n, movesPer100: 100 * f('moves') / Math.max(1, f('cpuPoss')), notOver: rs.filter(r => !r.over).length }; };
const line = (k, s) => `${k.padEnd(22)} ${String(s.n).padStart(3)}  ${(s.win * 100).toFixed(0).padStart(3)}%  ${(s.margin >= 0 ? '+' : '') + s.margin.toFixed(1).padStart(5)}   ${(s.meFg * 100).toFixed(0).padStart(3)}%   ${(s.cpuFg * 100).toFixed(0).padStart(3)}%   ${s.stlUs.toFixed(1).padStart(4)} ${s.stlThem.toFixed(1).padStart(4)}   ${s.movesPer100.toFixed(1).padStart(5)}${s.notOver ? '  (' + s.notOver + ' unfinished)' : ''}`;
const HEAD = `${'row'.padEnd(22)} ${'n'.padStart(3)}  wins  margin  you FG  CPU FG  steals us/them  CPU moves/100p`;
const out = { version };
console.log(`DIFFICULTY REPORT  v${version}  (mixed-play bot in your slot; 2 halves of 2:00)`);
if (ONLY.includes('ladder')) {
  const diffs = ['veryeasy', 'easy', 'medium', 'hard'], jobs = [];
  for (const d of diffs) for (let s = 0; s < 4; s++) for (let g = 0; g < N; g++) jobs.push({ d, s, js: `window.__dr.ladder(${JSON.stringify(d)}, ${s}, ${g})` });
  const res = await runJobs(jobs); out.ladder = {};
  console.log('\nLADDER (ratings equal to the stage\'s; the career\'s CPU dials for you teammate and the other team)\n' + HEAD);
  for (const d of diffs) for (let s = 0; s < 4; s++) { const rs = res.filter((r, i) => jobs[i].d === d && jobs[i].s === s), S = summ(rs); out.ladder[d + ' ' + s] = S; console.log(line(d + ' ' + ['Local', 'State', 'National', 'World'][s], S)); }
}
if (ONLY.includes('sweep')) {   // calibration: the other team's level L set directly, each stage (--sweep "0:-1,0;1:0.5,1"), ratings equal
  const jobs = []; for (const part of arg('--sweep', '').split(';')) { const [s, Ls] = part.split(':'); for (const L of Ls.split(',')) for (let g = 0; g < N; g++) jobs.push({ s: +s, L: +L, js: `window.__dr.ladder(${JSON.stringify(arg('--sdiff', 'medium'))}, ${+s}, ${g}, null, ${+L})` }); }
  const res = await runJobs(jobs); out.sweep = {};
  console.log('\nSWEEP (the other team\'s level set directly)\n' + HEAD);
  for (const k of [...new Set(jobs.map(j => j.s + ' ' + j.L))]) { const S = summ(res.filter((r, i) => jobs[i].s + ' ' + jobs[i].L === k)); out.sweep[k] = S; console.log(line('stage ' + k.split(' ')[0] + ' L ' + k.split(' ')[1], S)); }
}
if (ONLY.includes('gap')) {
  const jobs = []; for (const dlt of [-2, -1, 0, 1, 2]) for (let g = 0; g < N; g++) jobs.push({ dlt, js: `window.__dr.ladder('medium', 1, ${g}, [${5 + dlt}, 5])` });
  const res = await runJobs(jobs); out.gap = {};
  console.log('\nRATING GAP (Medium, State dials; your team rated 5 + d, theirs 5)\n' + HEAD);
  for (const dlt of [-2, -1, 0, 1, 2]) { const S = summ(res.filter((r, i) => jobs[i].dlt === dlt)); out.gap[dlt] = S; console.log(line('d = ' + dlt, S)); }
}
if (ONLY.includes('first3')) {
  const styles = [[1, 'sharpshooter'], [2, 'playmaker'], [3, 'rimrunner'], [4, 'lockdown'], [5, 'glue']], jobs = [];
  for (const d of DIFFS3) for (const [si, sn] of styles) for (let r = 0; r < N3; r++) jobs.push({ d, sn, js: `window.__dr.first3(${JSON.stringify(d)}, ${si}, ${r})` });
  const res = await runJobs(jobs); out.first3 = {};
  console.log(`\nFIRST THREE CAREER GAMES (new career, Local, all levels 4 + the build; ${N3} careers a style)\n` + HEAD);
  for (const d of DIFFS3) {
    const all = []; for (const [, sn] of styles) { const rs = res.filter((r, i) => jobs[i].d === d && jobs[i].sn === sn).flat(); all.push(...rs); const S = summ(rs); out.first3[d + ' ' + sn] = S; console.log(line(d + ' ' + sn, S)); }
    const S = summ(all); out.first3[d + ' all'] = S; console.log(line(d + ' all styles', S));
    for (let g = 0; g < 3; g++) { const S2 = summ(all.filter(r => r.g === g)); console.log(line(`  ${d} game ${g + 1}`, S2) + `   (CPU rated ${(all.filter(r => r.g === g).reduce((a, r) => a + r.oppStat, 0) / Math.max(1, all.filter(r => r.g === g).length)).toFixed(1)})`); }
  }
}
const errs = [...new Set(pages.flatMap(p => p.__errs))]; if (errs.length) console.log('\npage errors: ' + errs.slice(0, 4).join(' | '));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
await browser.close(); srv.close();
