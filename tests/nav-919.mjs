// v9.17.9 one way back and the gamepad hint (tests/run.mjs registers them):
//   nav-hint     (fast tier) "View: pick" shows on a tap-only screen (Teams & Players) after a gamepad press, and not
//                after a touch or a key; it goes away a few seconds after the pad was last used; a list screen
//                (Game settings) never shows it
//   nav-names    (fast tier) the title says Settings ▸ Game settings; Game settings has no Back rows and no
//                "‹ SETTINGS" link, and its ‹ Back pill goes up one (a group → the groups → the title); the pause menu
//                says Quit (Leave online), and asks first
//   nav-census   (full tier) the screen census (tests/screen-census.mjs): every screen can be left with the keyboard
//                alone, the gamepad alone and touch alone; no screen has two controls that both go back; the words for
//                leaving are Back, Leave, Quit, Title, Skip, and Cancel only on a dialog with a confirm button; no
//                page errors
import { SCREENS } from './phone-audit.mjs';
import { census, summary, HOME, WAITS } from './screen-census.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function navTests({ newContext, open }) {
  const T = {};
  const setup = n => SCREENS.find(s => s[0] === n)[1];
  T['nav-hint'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { pad: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'hint');
    const drawn = async () => { await p.evaluate(() => { window.__hint = false; const f = CanvasRenderingContext2D.prototype.fillText; window.__ft = f; CanvasRenderingContext2D.prototype.fillText = function (t) { if (t === 'View: pick') window.__hint = true; return f.apply(this, arguments); }; });
      await sleep(150); return p.evaluate(() => { CanvasRenderingContext2D.prototype.fillText = window.__ft; return window.__hint; }); };
    const go = async n => { await p.evaluate(js => { Input.touchMode = false; Input.lastDev = 'kb'; (0, eval)(js); }, setup(n)); await sleep(400); };
    const out = {};
    await p.evaluate(() => window.__padPlug(0, true));
    await go('teams & players');
    out.before = await drawn();
    await p.evaluate(() => window.__padSet(0, { RIGHT: true })); await sleep(100); await p.evaluate(() => window.__padSet(0, {})); await sleep(200);
    out.afterPad = await drawn();
    out.targets = await p.evaluate(() => (Game.rects || []).filter(r => r.w > 4 && r.h > 4 && r.w * r.h < W * H * 0.4).length);
    await p.keyboard.press('ArrowRight'); await sleep(200); out.afterKey = await drawn();
    await p.evaluate(() => window.__padSet(0, { RIGHT: true })); await sleep(100); await p.evaluate(() => window.__padSet(0, {})); await sleep(200);
    await p.evaluate(() => { PadSeen.t = nowMs() - 6000; }); await sleep(150); out.afterWait = await drawn();
    await p.evaluate(() => window.__padSet(0, { RIGHT: true })); await sleep(100); await p.evaluate(() => window.__padSet(0, {})); await sleep(200);
    const c = await p.evaluate(() => { const r = canvas.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height - 4]; });
    await p.mouse.click(c[0], c[1]); await p.evaluate(() => { Input.lastDev = 'touch'; }); await sleep(150); out.afterTouch = await drawn();
    await go('settings: game');
    await p.evaluate(() => window.__padSet(0, { DOWN: true })); await sleep(100); await p.evaluate(() => window.__padSet(0, {})); await sleep(200);
    out.listScreen = await drawn();
    await ctx.close();
    const ok = !out.before && out.afterPad && out.targets > 6 && !out.afterKey && !out.afterWait && !out.afterTouch && !out.listScreen && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['nav-names'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, {}), p = await open(ctx, base + '/?nowelcome=1', errs, 'names');
    const out = await p.evaluate(() => {
      const o = {}, TM = TITLE_MENU(), st = TM.find(e => e.label === 'Settings');
      o.title = TM.map(e => e.label).join(','); o.sub = st && st.sub.map(e => e.label).join(',');
      o.noOptions = !TM.some(e => e.label === 'Options');
      // Game settings: the groups, a group, the pill
      goTitle(); Game.screen = 'settings'; Game.setGroup = null; Game.idx = 0;
      const words = () => { const L = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { if (this === ctx) L.push(String(t)); return f.apply(this, arguments); }; try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx); } finally { CanvasRenderingContext2D.prototype.fillText = f; } return L; };
      const g0 = words(); o.groupsTitle = g0.includes('Game settings'); o.groupsBackRow = g0.filter(t => t === 'Back').length; o.pill = g0.filter(t => t === '\u2039 Back').length;
      Game.setGroup = 0; Game.idx = 0; const g1 = words(); o.groupBackRow = g1.filter(t => t === 'Back').length; o.settingsLink = g1.some(t => /SETTINGS/.test(t));
      BACK.settings(); o.pillUp = Game.screen === 'settings' && Game.setGroup == null;
      BACK.settings(); o.pillTitle = Game.screen === 'title';
      // the pause menu
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play';
      o.pause = pauseItems().map(x => x[0]).filter(t => /^(Quit|Leave)/.test(t)).join(',');
      pauseItems().find(x => x[0] === 'Quit')[1](); o.asks = !!Game.confirm && Game.confirm.title; Game.confirm = null;
      o.joincodeUp = (() => { Game.screen = 'joincode'; BACK.joincode(); return Game.screen + ':' + Game.idx; })();
      return o;
    });
    await ctx.close();
    const ok = out.title.split(',').includes('Settings') && out.noOptions && /^Profile.*,Game settings,Extras,How to play,About/.test(out.sub) && out.groupsTitle && out.groupsBackRow === 0 && out.pill === 1
      && out.groupBackRow === 0 && !out.settingsLink && out.pillUp && out.pillTitle && out.pause === 'Quit' && out.asks === 'Quit this game?' && out.joincodeUp === 'online:1' && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['nav-census'] = async ({ browser, base }) => {
    const c = await census(browser, base), detail = summary(c);
    const dead = k => c[k].filter(r => !r.leaves && !r.setupError && !r.error && !HOME.has(r.name) && !WAITS.has(r.name));
    const unset = ['keyboard', 'gamepad', 'touch'].flatMap(k => c[k].filter(r => r.setupError || r.error));
    const names = new Set(c.keyboard.flatMap(r => (r.leaveWords || []).map(w => w.replace(/^\s*‹\s*/, '').trim())));
    const badNames = [...names].filter(w => !/^(Back|Leave|Quit|Title|Skip|Cancel)$/.test(w));
    const cancel = c.keyboard.filter(r => (r.leaveWords || []).includes('Cancel')).map(r => r.name).filter(n => n !== 'career: import (a file picked)');
    const ok = !dead('keyboard').length && !dead('gamepad').length && !dead('touch').length && !c.twoBacks.length && !badNames.length && !cancel.length && !unset.length && !c.errs.length;
    if (badNames.length) detail.push('other words for leaving: ' + badNames.join(', '));
    if (cancel.length) detail.push('Cancel without a confirm: ' + cancel.join(', '));
    if (unset.length) detail.push('not set up: ' + unset.map(r => r.name + ' ' + (r.setupError || r.error)).join('; '));
    for (const e of c.errs.slice(0, 10)) detail.push('pageerror ' + e);
    return { ok, detail };
  };
  return T;
}
