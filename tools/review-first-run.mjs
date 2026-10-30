// node tools/review-first-run.mjs [--page dist/web/index.html]
// v9.13: records the path a brand-new player sees, from the first launch to the end of the first match and the end of
// the first career day, on a fresh device (no saves): each view's screenshot (desktop 1280x720 and phone 750x342),
// the taps that get there, the words on screen, and what interrupts (dialogs, toasts, callouts, questions).
// Each step does what the tap does (the same function the button calls); walking and play run the game's own
// update. Writes docs/review/first-run.json and docs/review/img/first-run/*.jpg (the Review Studio shows them).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), IMG = path.join(ROOT, 'docs/review/img/first-run');
// [title, how (what the player does), taps, js (run in the page to get there), frames to let it draw]
const SIM = n => `for (let i = 0; i < ${n}; i++) { updateMatch(STEP); if (Game.screen !== 'play') break; }`;
export const FIRST_RUN = [
  ['First launch: the splash', 'opens by itself', 0, ``, 20],
  ['The title, with the welcome dialog', 'the splash ends by itself (1.7 s)', 0, `Game.screen = 'title'; showWelcome();`, 20],
  ['Tutorial lesson 1: Move', 'Learn the basics', 1, `confirmPick(1);`, 30],
  ...['Sprint', 'Shoot', 'Dunk', 'Pass', 'Dribble moves', 'Defend', 'Steal', 'Block'].map((n, i) => ['Tutorial lesson ' + (i + 2) + ': ' + n, 'do the previous lesson (it moves on by itself)', 0, `tutGo(${i + 1});`, 30]),
  ['Tutorial: the last card', 'do the Block lesson', 0, `tutGo(TUT_STEPS.length - 1);`, 30],
  ['Team select: your masjid', 'Play a match', 1, `tutEnd(); startSelect('1p');`, 20],
  ['Team select: the opponent', 'Confirm', 1, `selectOK();`, 20],
  ['Team select: your player', 'Confirm', 1, `selectOK();`, 20],
  ['Pick the court', 'Confirm', 1, `selectOK();`, 20],
  ['Tip-off', 'Random court (the first one)', 1, `chooseVenue(0); for (let i = 0; i < 40; i++) updateMatch(STEP);`, 10],
  ['Playing: the first possessions', 'play (the CPU plays the others)', 0, SIM(60 * 20), 10],
  ['Halftime', 'play to halftime', 0, `for (let i = 0; i < 60 * 60 * 6 && Game.screen === 'play'; i++) { updateMatch(STEP); if (Game.trivia && !Game.trivia.done) { window.__int.push('Noor question: ' + (TRIVIA[Game.trivia.qi] || {}).q); answerTrivia(Game.trivia.order.indexOf(0)); } }`, 10],
  ['The final score', 'Continue, then play the second half', 1, `resumeFromHalf(); for (let i = 0; i < 60 * 60 * 6 && Game.screen === 'play'; i++) { updateMatch(STEP); if (Game.trivia && !Game.trivia.done) { window.__int.push('Noor question'); answerTrivia(Game.trivia.order.indexOf(0)); } if (Game.trivia && Game.trivia.pick) noorChoose(Game.trivia, 0); } for (let i = 0; i < 600 && Game.screen === 'play'; i++) { updateMatch(STEP); gameUpdate(STEP); }`, 10],
  ['Back to the title', 'Continue', 1, `finalContinue(); if (Game.screen !== 'title') goTitle();`, 20],
  ['Career menu', 'Career', 1, `Game.screen = 'cmenu'; Game.idx = 0; Game.confirmNew = false;`, 20],
  ['Make your player', 'New career', 1, `C = freshCareer(); Game.creator = { idx: 0, isNew: true }; setupPractice('free'); Game.screen = 'creator';`, 30],
  ['Type your name', 'Name', 1, `Game.nameBuf = C.name; Game.screen = 'namekeys';`, 20],
  ['Back in the creator, named', 'type a name (7 letters) and Done', 8, `C.name = 'Abdullah'; Game.screen = 'creator';`, 20],
  ['Outside the masjid', 'Done', 1, `creatorDone();`, 30],
  ['Sh. Saleem says salaam', 'walk up to him', 0, `introSay(INTRO_OUT, () => {});`, 30],
  ['The gym, first time', 'follow him in (3 lines, Next each)', 3, `INTRO.talk = null; startIntroGym();`, 40],
  ['Meeting the brothers', 'walk up to Khalil', 0, `introTalkTo('khalil');`, 30],
  ['The career hub, day 1', 'meet everyone (5 lines) and Sh. Saleem wraps up (2)', 7, `introSkip();`, 30],
  ['The first career day ends: Continue to the next day', 'Continue (no game on day 1: the next day, Friday, starts outside)', 1, `const it = HUB_MENU(); menuActivate('hub', it, 0);`, 40]
];
// what's on screen now: the words drawn, what interrupts
const PROBE_INIT = `(() => { const P = CanvasRenderingContext2D.prototype, f0 = P.fillText; window.__tx = null; window.__int = [];
  P.fillText = function (t) { try { if (window.__tx && this.canvas && this.canvas.id === 'game' && this.globalAlpha > 0.05 && String(t).trim()) window.__tx.add(String(t).trim()); } catch (e) {} return f0.apply(this, arguments); }; })();`;
async function record(browser, base, dev, tag) {
  const ctx = await browser.newContext(dev), p = await ctx.newPage(), errs = [];
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(PROBE_INIT);
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '/?nowelcome=1');
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'splash', null, { timeout: 20000 });
  const out = [];
  for (const [i, [title, how, taps, js, fr]] of FIRST_RUN.entries()) {
    await p.evaluate(js => { window.__int = []; Game.toastT = 0; (0, eval)(js); }, js);
    await p.evaluate(n => new Promise(res => { let k = 0; const f = () => { if (++k >= n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), fr);
    await p.evaluate(() => { window.__tx = new Set(); });
    await p.evaluate(() => new Promise(res => { let k = 0; const f = () => { if (++k >= 4) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
    const info = await p.evaluate(() => {
      const texts = [...(window.__tx || [])]; window.__tx = null;
      const int = window.__int.slice();
      if (Game.confirm) int.push('Dialog: ' + Game.confirm.title);
      if (Game.toastT > 0 && Game.toastMsg) int.push('Toast: ' + Game.toastMsg);
      if (typeof _achQ !== 'undefined') { window.__achSeen = window.__achSeen || new Set(); const nw = _achQ.filter(q => !window.__achSeen.has(q.a.id)); nw.forEach(q => window.__achSeen.add(q.a.id)); if (nw.length) int.push('Achievement: ' + nw.map(q => q.a.name).join(', ')); }
      if (FX.calls && FX.calls.length) { window.__callSeen = window.__callSeen || new Set(); const nw = FX.calls.filter(c => !window.__callSeen.has(c)); nw.forEach(c => window.__callSeen.add(c)); if (nw.length) int.push('Callout: ' + nw.map(c => c.text + (c.sub ? ' (' + c.sub + ')' : '')).join(', ')); }
      if (Game.trivia && !Game.trivia.done) int.push('Noor question');
      return { screen: Game.screen, texts, words: texts.reduce((a, t) => a + (t.match(/[A-Za-z’'][A-Za-z’'-]*/g) || []).length, 0), interrupt: [...new Set(int)].join('; ') };
    });
    const file = String(i + 1).padStart(2, '0') + '-' + tag + '.jpg';
    await p.screenshot({ path: path.join(IMG, file), type: 'jpeg', quality: 62 });
    out.push(Object.assign({ title, how, taps, file }, info));
  }
  await ctx.close();
  return { out, errs };
}
if (process.argv[1] && process.argv[1].endsWith('review-first-run.mjs')) {
  fs.mkdirSync(IMG, { recursive: true }); for (const f of fs.readdirSync(IMG)) fs.unlinkSync(path.join(IMG, f));
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
  const base = `http://127.0.0.1:${srv.address().port}`, b = await chromium.launch();
  const D = await record(b, base, { viewport: { width: 1280, height: 720 } }, 'desktop');
  const P = await record(b, base, { viewport: { width: 750, height: 342 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'phone');
  await b.close(); srv.close();
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const steps = D.out.map((s, i) => ({ title: s.title, how: s.how, taps: s.taps, screen: s.screen, words: s.words, texts: s.texts.slice(0, 80), interrupt: s.interrupt || (P.out[i] && P.out[i].interrupt) || '', img: { desktop: s.file, phone: P.out[i] && P.out[i].file } }));
  fs.writeFileSync(path.join(ROOT, 'docs/review/first-run.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), version, steps }, null, 1) + '\n');
  console.log(steps.map((s, i) => `${i + 1}. ${s.title} [${s.screen}] taps ${s.taps}, ${s.words} words${s.interrupt ? ' | ' + s.interrupt : ''}`).join('\n'));
  if (D.errs.length || P.errs.length) console.log('page errors:', D.errs.concat(P.errs).join('; '));
}
