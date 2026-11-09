// v9.17.9 screen census: every screen of the phone audit (tests/phone-audit.mjs SCREENS), set up the same way, with
// each way to play on its own:
//   keyboard  (desktop 1280x720)  Esc (or else Enter, for a screen you leave by going on): does it leave? ↓: does
//             the focus move (menu navigation)?
//   gamepad   (desktop, a scripted pad)  B (or else Start, or A): does it leave? View: does the on-screen picker open (it reaches every
//             tap target)? Is the "View: pick" hint drawn after a pad press?
//   touch     (667x300 phone)  a tap on the ‹ Back pill, or else on the controls one by one: does one leave?
// "Leave" means the place changes: the screen, the pause state, an open submenu or overlay. Also counted: the words
// on screen that mean leaving, and the controls that do the same as the Back pill (two ways back on one screen).
//   node tests/screen-census.mjs [--page dist/web/index.html] [--json out.json] [ONLY=name,name]
import { SCREENS, AUDIT_INIT, PHONES } from './phone-audit.mjs';
import { FAKE_PAD_INIT } from './fake-pad.js';
export const LEAVE_RE = /^\s*(‹\s*)?(Back to title|Quit to title|Back to lobby|Back to the street|Leave[^.?]*|Back|Cancel|Quit|EXIT|Exit|Close|Title|Skip)\s*›?\s*$/;
// where the player is: the screen and what's open on it
export const PLACE_JS = `(() => { const ms = Game.menus && Game.menus[Game.screen];
  return JSON.stringify([Game.screen, !!Game.paused, Game.setGroup == null ? null : Game.setGroup, !!Game.trivia, !!Game.confirm, ms ? (ms.path || []).join('/') + ':' + ms.sub : null,
    typeof Gym !== 'undefined' ? Gym.overlay || null : null, !!(Game.hubMenu && Game.hubMenu.open), !!(Game.office && Game.office.panel), typeof World !== 'undefined' && World.menu ? 1 : 0,
    typeof CSUI !== 'undefined' ? [CSUI.share ? 1 : 0, CSUI.edit ? 1 : 0, CSUI.imp ? 1 : 0] : null, Game.screen === 'story' && Game.story ? Game.story.i : null,
    Game.trivia ? [!!Game.trivia.done, Game.trivia.choice] : null, Game.stats ? Game.stats.view || null : null,
    typeof World !== 'undefined' ? [World.talk ? 1 : 0, World.shop ? 1 : 0, World.jum ? 1 : 0] : null]); })()`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// did a direction move a focus? Game.idx or a menu's, or the words drawn in a highlight colour changed (screens with a
// focus of their own: the creator, the custom-team editor, the calendar...); the picker opening doesn't count
const FOCUS_SIG = `(async () => { const A = window.__audit; A.texts.length = 0; A.on = true; await new Promise(r => setTimeout(r, 90)); A.on = false;
  const ms = Game.menus && Game.menus[Game.screen]; return JSON.stringify([Game.idx, ms && ms.idx, ms && ms.sel, [...new Set(A.texts.map(t => t.t + '@' + t.s))].sort()]); })()`;
const FOCUS0 = `(async () => { window.__f0 = await ${FOCUS_SIG}; })()`;
const FOCUS1 = `(async () => !(typeof Pad !== 'undefined' && Pad.cursor.on) && (await ${FOCUS_SIG}) !== window.__f0)()`;
async function boot(browser, base, dev, { pad = false, touch = false } = {}) {
  const ctx = await browser.newContext(dev);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs|islamdunk-ice\.[^/]*workers\.dev/, r => r.abort());
  await ctx.addInitScript(AUDIT_INIT); if (pad) await ctx.addInitScript(FAKE_PAD_INIT);
  await ctx.addInitScript(() => { try { localStorage.setItem('islamdunk.portraitOK', '1'); localStorage.setItem('islamdunk.persistNote', '1'); } catch (e) {} });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(`${p.__screen || 'load'}: ${e.message}` + (process.env.STACK ? ' ' + String(e.stack).split('\n').slice(1, 4).join(' ') : '')));
  await p.goto(base + '/?net=loop&lat=0&room=census&nowelcome=1');
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  if (pad) await p.evaluate(() => window.__padPlug(0, true));
  await p.evaluate(t => { Input.touchMode = t; Input.lastDev = t ? 'touch' : 'kb'; }, touch);
  return { ctx, p, errs };
}
async function setup(p, name, js, touch) {
  p.__screen = name;
  const e = await p.evaluate(([js, t]) => { const A = window.__audit; A.on = false; A.found.clear(); A.texts.length = 0; Input.touchMode = t; try { (0, eval)(js); } catch (e) { return String(e && e.message || e); } if (typeof World !== 'undefined' && World.photo) World.photo.freeze = false; if (Game.jum) Game.jum.photo = false; return null; }, [js, touch]);   // (a photo of the neighbourhood is frozen: thawed, so it plays)
  await sleep(420);
  await p.evaluate(() => { window.__audit.texts.length = 0; window.__audit.on = true; }); await sleep(90);
  await p.evaluate(() => { window.__audit.on = false; });
  return e;
}
const place = p => p.evaluate(PLACE_JS);
// one screen with one device
async function oneScreen(p, name, js, kind) {
  const touch = kind === 'touch', r = { name };
  const se = await setup(p, name, js, touch); if (se) return Object.assign(r, { setupError: se });
  const before = await place(p);
  r.texts = await p.evaluate(() => [...new Set(window.__audit.texts.map(t => t.t))]);
  // words on controls (in a tap target) that mean leaving; the gym's EXIT sign is art, not a control
  r.leaveWords = await p.evaluate(re => { const R = new RegExp(re), s = canvas.width / W, rects = (Game.rects || []).filter(q => q.w * q.h < W * H * 0.4);
    return [...new Set(window.__audit.texts.filter(t => t.t !== 'EXIT' && R.test(t.t) && rects.some(q => t.x / s >= q.x - 2 && t.x / s <= q.x + q.w + 2 && t.y / s - 4 >= q.y - 2 && t.y / s - 4 <= q.y + q.h + 2)).map(t => t.t))]; }, LEAVE_RE.source);
  r.controls = await p.evaluate(() => (Game.rects || []).filter(q => q.w > 4 && q.h > 4 && q.w * q.h < W * H * 0.4).length);
  if (kind === 'keyboard') {
    await p.evaluate(FOCUS0);
    await p.keyboard.press('ArrowDown'); await sleep(200);
    r.nav = await p.evaluate(FOCUS1);
    await setup(p, name, js, touch);
    await p.keyboard.press('Escape'); await sleep(350);
    r.leaves = (await place(p)) !== before; r.how = r.leaves ? 'Esc' : null;
    if (!r.leaves) { await setup(p, name, js, touch); await p.keyboard.press('Enter'); await sleep(350); r.leaves = (await place(p)) !== before; r.how = r.leaves ? 'Enter' : null; }   // (a screen you leave by going on: halftime, a result)
  } else if (kind === 'gamepad') {
    const tap = async b => { await p.evaluate(b => window.__padSet(0, { [b]: true }), b); await sleep(120); await p.evaluate(() => window.__padSet(0, {})); await sleep(250); };
    await p.evaluate(() => { Input.lastDev = 'pad'; Pad.cursor = { on: false, i: -1, auto: false }; });
    await p.evaluate(FOCUS0);
    await tap('DOWN');
    r.nav = await p.evaluate(FOCUS1);
    // the hint: drawn after a pad press (here: the DOWN above)
    await p.evaluate(() => { window.__audit.texts.length = 0; window.__audit.on = true; }); await sleep(90); await p.evaluate(() => { window.__audit.on = false; });
    r.hint = await p.evaluate(() => window.__audit.texts.some(t => /View: pick/.test(t.t)));
    await setup(p, name, js, touch); await p.evaluate(() => { Input.lastDev = 'pad'; Pad.cursor = { on: false, i: -1, auto: false }; });
    await tap('VIEW'); r.picker = await p.evaluate(() => !!Pad.cursor.on && Pad.pickRects().length > 0);
    await p.evaluate(() => { Pad.cursor = { on: false, i: -1, auto: false }; });
    await setup(p, name, js, touch); await p.evaluate(() => { Input.lastDev = 'pad'; Pad.cursor = { on: false, i: -1, auto: false }; });
    await tap('B'); await sleep(100);
    r.leaves = (await place(p)) !== before; r.how = r.leaves ? 'B' : null;
    for (const k of ['START', 'A']) if (!r.leaves) { await setup(p, name, js, touch); await p.evaluate(() => { Input.lastDev = 'pad'; Pad.cursor = { on: false, i: -1, auto: false }; }); await tap(k); await sleep(100); r.leaves = (await place(p)) !== before; r.how = r.leaves ? k : null; }   // (Start pauses a match; A goes on)
  } else {
    // the Back pill first, then each control in turn (fresh each time)
    const tapAt = async (x, y) => { const c = await p.evaluate(([x, y]) => { const q = canvas.getBoundingClientRect(); return [q.left + x * q.width / W, q.top + y * q.height / H]; }, [x, y]); await p.touchscreen.tap(c[0], c[1]); await sleep(330); };
    r.pill = await p.evaluate(() => typeof backVisible === 'function' && backVisible());
    let left = false, how = null;
    if (r.pill) { const bw = await p.evaluate(() => BackBtn.w); await tapAt(8 + bw / 2, 24); left = (await place(p)) !== before; how = 'pill'; }
    if (!left) {
      const n = await p.evaluate(() => (Game.rects || []).length);
      for (let i = n - 1; i >= 0 && !left && i >= n - 14; i--) {
        await setup(p, name, js, touch);
        const q = await p.evaluate(i => { const r = Game.rects[i]; return r ? [r.x + r.w / 2, r.y + r.h / 2] : null; }, i); if (!q) continue;
        await tapAt(q[0], q[1]); left = (await place(p)) !== before; if (left) how = 'control ' + i;
      }
    }
    r.leaves = left; r.how = how;
  }
  return r;
}
// "two ways back": a control (not the pill) on the screen that goes where the pill / Esc goes, and is labelled as leaving
async function twoBacks(p, name, js) {
  await setup(p, name, js, true);
  if (!(await p.evaluate(() => typeof backVisible === 'function' && backVisible()))) return [];
  await p.evaluate(() => BACK[Game.screen]()); await sleep(300); const viaPill = await place(p);
  await setup(p, name, js, true);
  const cands = await p.evaluate(re => { const R = new RegExp(re), T = window.__audit.texts, s = canvas.width / W, out = [];
    (Game.rects || []).forEach((r, i) => { if (r.x <= 8 && r.y <= 8) return; const t = T.find(t => t.x / s >= r.x && t.x / s <= r.x + r.w && t.y / s - 4 >= r.y && t.y / s - 4 <= r.y + r.h); if (t && t.t !== 'EXIT' && R.test(t.t)) out.push([i, t.t]); });   // (the gym's EXIT sign is art)
    return out; }, LEAVE_RE.source);
  const dup = [];
  for (const [i, t] of cands) {
    await setup(p, name, js, true);
    await p.evaluate(i => { const r = Game.rects[i]; if (r) r.fn(); }, i); await sleep(300);
    if ((await place(p)) === viaPill) dup.push(t);
  }
  return dup;
}
export async function census(browser, base, { only = [] } = {}) {
  const DESK = { viewport: { width: 1280, height: 720 } }, PHONE = PHONES.find(x => x[0].startsWith('667'))[1];
  const out = { keyboard: [], gamepad: [], touch: [], twoBacks: [], errs: [] };
  // the three devices side by side (each screen on a fresh page)
  await Promise.all([['keyboard', DESK, {}], ['gamepad', DESK, { pad: true }], ['touch', PHONE, { touch: true }]].map(async ([kind, dev, opt]) => {
    for (const [name, js] of SCREENS) {
      if (only.length && !only.includes(name)) continue;
      const { ctx, p, errs } = await boot(browser, base, dev, opt);   // (a fresh page for each screen: no state carried over)
      try { out[kind].push(await oneScreen(p, name, js, kind)); } catch (e) { out[kind].push({ name, error: String(e.message || e).slice(0, 200) }); }
      if (kind === 'touch') { try { const d = await twoBacks(p, name, js); if (d.length) out.twoBacks.push({ name, also: d }); } catch (e) {} }
      out.errs.push(...errs.map(e => kind + ' ' + e));
      await ctx.close();
    }
  }));
  return out;
}
// the home screen: nothing to leave to
export const HOME = new Set(['title', 'title after forced select']);
// a screen that waits a few seconds and then goes on by itself (the test set it to wait for ever)
export const WAITS = new Set(['career around the league (waiting)']);
export function summary(c) {
  const L = [];
  for (const k of ['keyboard', 'gamepad', 'touch']) {
    const rows = c[k], dead = rows.filter(r => !r.leaves && !r.setupError && !r.error && !HOME.has(r.name) && !WAITS.has(r.name)), err = rows.filter(r => r.setupError || r.error);
    L.push(`${k}: ${rows.length} screens, ${dead.length} with no way out${dead.length ? ': ' + dead.map(r => r.name).join(', ') : ''}${err.length ? `; ${err.length} not set up: ` + err.map(r => r.name).join(', ') : ''}`);
    if (k !== 'touch') { const nav = rows.filter(r => r.nav).length; L.push(`  focus moves with ${k === 'keyboard' ? '↓' : 'the pad'}: ${nav}; tap targets only: ${rows.length - nav}`); }
    if (k === 'gamepad') L.push(`  View picker opens: ${rows.filter(r => r.picker).length}; "View: pick" hint shown: ${rows.filter(r => r.hint).length} (${rows.filter(r => r.hint).map(r => r.name).join(', ')})`);
  }
  const words = {}; for (const r of c.keyboard) for (const w of r.leaveWords || []) { const k = w.replace(/^\s*‹\s*/, '').trim(); (words[k] = words[k] || []).push(r.name); }
  L.push(`leave words on controls (desktop): ${Object.keys(words).length} names: ${Object.entries(words).sort((a, b) => b[1].length - a[1].length).map(([w, n]) => `"${w}" ${n.length}`).join(', ')}`);
  for (const [w, n] of Object.entries(words)) if (!/^(Back|Leave|Quit|Title|Cancel|Skip)$/.test(w)) L.push(`   "${w}": ${n.join(', ')}`);
  L.push(`screens with two ways back: ${c.twoBacks.length}${c.twoBacks.length ? ': ' + c.twoBacks.map(x => `${x.name} (${x.also.join(', ')})`).join('; ') : ''}`);
  L.push(`page errors: ${c.errs.length}`);
  return L;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  const http = await import('node:http'), fs = await import('node:fs'), path = await import('node:path');
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
  const browser = await chromium.launch();
  const c = await census(browser, `http://127.0.0.1:${srv.address().port}`, { only: (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean) });
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(c, null, 1));
  console.log(summary(c).join('\n'));
  await browser.close(); srv.close();
}
