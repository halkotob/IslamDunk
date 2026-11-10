// v9.18.0 the career opens at the hub (tests/run.mjs registers them; fast tier):
//   hub-presses  a saved career, with the keyboard alone, a gamepad alone and touch alone, from the title: Career and
//                Continue open the hub (2), Practice reaches the gym (1 more), and on a free day and on a game day
//                Play, the scout's "Got it" and the pregame's "Tip off" start a live game (3 more). Counted, press by
//                press, the way a player would (keys, pad buttons, taps on the words)
//   hub-arrive   the post-game screen (and its few lines) goes on to the hub; saves made at home, on the street, in the store and at
//                the masjid front open at the hub on the same day; Go outside still goes to the street and is counted
//                in the day's counters; on a Friday the hub asks Attend Jumu'ah / Not today (one press); Skip says
//                where it goes; a new career's intro ends on the hub
// a career one game in, then set to a free day, a game day or a Friday. The first game is simulated once per page and
// kept (window.__hubBase), or handed in from another page (base: that save's text), so each run doesn't replay it
export const HUB_SAVE = (kind, base) => `(() => {
  const B = ${JSON.stringify(base || null)} || window.__hubBase;
  if (B) { localStorage.setItem(SAVE_AUTO, B); loadCareer(SAVE_AUTO); }
  else {
    C = freshCareer(); C.name = 'Abdullah'; if (!C.bracket) C.bracket = makeBracket(C.stage);
    startCareerMatch(); for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; } careerAfterMatch();
    saveCareer(); window.__hubBase = localStorage.getItem(SAVE_AUTO);
  }
  calEnsure(); C.seen['stage' + C.stage] = true; C.seen.intro = true; let d = C.cal.d;
  if (${JSON.stringify(kind)} === 'game') d = calGameDay(); else if (${JSON.stringify(kind)} === 'fri') { while (!calDay(d).fri || calDay(d).type === 'game') d++; } else { while (calDay(d).type !== 'free' || calDay(d).fri) d++; }
  calSetDay(d); C.cal.loc = null; saveCareer(); const day = C.cal.d; C = null; goTitle(); return day; })()`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function hubFirstTests({ newContext, open }) {
  const T = {};
  // one press on a device: keys, pad buttons, or a tap on the drawn words
  async function press(p, dev, what) {
    if (dev === 'kb') { await p.keyboard.press(what.key); }
    else if (dev === 'pad') { await p.evaluate(b => window.__padSet(0, { [b]: true }), what.pad); await sleep(90); await p.evaluate(() => window.__padSet(0, {})); }
    else {
      const at = await p.evaluate(re => { const R = new RegExp(re), L = []; const f = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { if (this === ctx && R.test(String(t))) { const m = this.getTransform().transformPoint(new DOMPoint(x, y - 6)); L.push([m.x, m.y]); } return f.apply(this, arguments); };
        try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx); } finally { CanvasRenderingContext2D.prototype.fillText = f; }
        const r = canvas.getBoundingClientRect(), k = r.width / canvas.width; return L.length ? [r.left + L[0][0] * k, r.top + L[0][1] * k] : null; }, what.tap);
      if (!at) return false;
      await p.touchscreen.tap(at[0], at[1]);
    }
    await sleep(450); return true;
  }
  const screen = p => p.evaluate(() => Game.screen + (Game.screen === 'world' ? ':' + World.scene : '') + (typeof M !== 'undefined' && Game.screen === 'play' ? ':' + M.phase : ''));
  const STEPS = {
    title: { key: 'Enter', pad: 'A', tap: '^Career$' }, cmenu: { key: 'Enter', pad: 'A', tap: '^Continue' },
    practice: { key: 'KeyP', pad: 'X', tap: '^Practice' }, play: { key: 'Enter', pad: 'A', tap: '^Play' },
    scout: { key: 'Enter', pad: 'A', tap: '^Got it$' }, pregame: { key: 'Enter', pad: 'A', tap: '^Tip off$' }
  };
  T['hub-presses'] = async ({ browser, base: base0 }) => {
    const out = {}, errs = [];
    // the first game is simulated once, here, and its save handed to every run
    let base; { const c0 = await newContext(browser, {}), p0 = await open(c0, base0 + '/?nowelcome=1', errs, 'base');
      await p0.evaluate(HUB_SAVE('free')); base = await p0.evaluate(() => window.__hubBase); await c0.close(); }
    for (const dev of ['kb', 'pad', 'touch']) for (const day of ['free', 'game']) {
      const ctx = await newContext(browser, dev === 'pad' ? { pad: true } : dev === 'touch' ? { device: { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } } : {});
      const p = await open(ctx, base0 + '/?nowelcome=1', errs, dev + '-' + day);
      await p.evaluate(() => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} });
      if (dev === 'pad') await p.evaluate(() => { window.__padPlug(0, true); Input.lastDev = 'pad'; });
      if (dev === 'touch') await p.evaluate(() => { Input.touchMode = true; Input.lastDev = 'touch'; });
      const run = async target => {
        await p.evaluate(HUB_SAVE(day, base)); await sleep(400);
        const trail = []; let n = 0;
        const go = async (step, want) => { if (await press(p, dev, STEPS[step])) n++; const s = await screen(p); trail.push(step + '→' + s); return want.test(s); };
        if (!await go('title', /^cmenu/)) return { n, trail };
        if (!await go('cmenu', /^hub/)) return { n, trail };
        const toHub = n;
        if (target === 'gym') { await go('practice', /^gym/); return { toHub, n, trail, ok: /^gym/.test(await screen(p)) }; }
        await go('play', /^scout/); await go('scout', /^pregame/); await go('pregame', /^play/); await sleep(1500);
        return { toHub, n, trail, ok: /^play:(tip|live)/.test(await screen(p)) };
      };
      out[dev + ' ' + day] = { gym: await run('gym'), game: await run('game') };
      await ctx.close();
    }
    const rows = ['kb free', 'kb game', 'pad free', 'pad game', 'touch free', 'touch game'].map(k => [k, out[k]]), ok = rows.every(([, r]) => r.gym.ok && r.gym.toHub === 2 && r.gym.n === 3 && r.game.ok && r.game.toHub === 2 && r.game.n === 5) && !errs.length;
    return { ok, detail: [...rows.map(([k, r]) => `${k}: to the hub ${r.gym.toHub}, to the gym ${r.gym.n} (${r.gym.ok ? 'there' : r.gym.trail.join(' ')}), to a live game ${r.game.n} (${r.game.ok ? 'there' : r.game.trail.join(' ')})`), ...errs] };
  };
  T['hub-arrive'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'arrive');
    const o = {};
    // saves made out in the neighbourhood open at the hub, the same day
    o.saves = {};
    for (const [scene, extra] of [['home', ''], ['street', ''], ['store', 'L.inStore = 1; L.vis.store = 1;'], ['masjidfront', '']]) {
      const day = await p.evaluate(HUB_SAVE('free'));
      const r = await p.evaluate(([scene, extra]) => { loadCareer(SAVE_AUTO); const L = worldLoc(); L.scene = scene; L.x = 300; L.d = 0.5; eval(extra); saveCareer(); C = null; goTitle();
        loadCareer(SAVE_AUTO); careerHub(); return [Game.screen, C.cal.d]; }, [scene, extra]);
      o.saves[scene] = r[0] === 'hub' && r[1] === day;
    }
    // after a game: the post-game goes on to the hub
    await p.evaluate(HUB_SAVE('game'));
    o.postgame = await p.evaluate(() => { loadCareer(SAVE_AUTO); careerHub(); hubSelect(0); if (Game.screen === 'story') Game.story.then(); Game.screen = 'pregame'; startCareerMatch();
      for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; }
      careerAfterMatch(); const s1 = Game.screen; postgameContinue(); const s2 = Game.screen; if (Game.screen === 'story') Game.story.then(); return [s1, s2, Game.screen]; });   // (the post-game's few lines, then on)
    // Go outside: the street, counted; and back in through the door is the hub
    await p.evaluate(HUB_SAVE('free'));
    o.outside = await p.evaluate(() => { loadCareer(SAVE_AUTO); careerHub(); const it = HUB_MENU().find(e => e.label === 'Go outside'); it.act(); const s = Game.screen + ':' + World.scene; return [s, (C.cal.done || {}).go_outside || 0]; });
    await sleep(900);
    o.outsideNow = await p.evaluate(() => Game.screen + ':' + World.scene);
    o.skip = await p.evaluate(() => { careerHub(); const it = HUB_MENU().find(e => /^Skip to /.test(e.label)); return it && it.label; });
    o.rows = await p.evaluate(() => HUB_MENU().map(e => e.label).join(' | '));
    // a Friday: the hub asks, one press; Not today leaves the hub as it is
    await p.evaluate(HUB_SAVE('fri'));
    o.friday = await p.evaluate(() => { loadCareer(SAVE_AUTO); careerHub(); const asked = !!Game.hubJum; hubJumuahAnswer(false); careerHub(); return [asked, !!Game.hubJum, Game.screen]; });
    await p.evaluate(HUB_SAVE('fri'));
    o.attend = await p.evaluate(() => { loadCareer(SAVE_AUTO); careerHub(); hubJumuahAnswer(true); return Game.screen; });
    // a new career: the intro (outside with Sh. Saleem, then the gym) ends on the hub
    o.intro = await p.evaluate(() => { C = freshCareer(); C.name = 'New'; C.bracket = makeBracket(0); saveCareer(); startIntroWorld(); const s0 = Game.screen; introSkip(); return [s0, Game.screen]; });
    await ctx.close();
    const ok = Object.values(o.saves).every(Boolean) && o.postgame[0] === 'postgame' && o.postgame[2] === 'hub' && o.outside[0] === 'world:masjidfront' && o.outside[1] === 1
      && /^Skip to [A-Z][a-z]+day/.test(o.skip || '') && /^Play/.test(o.rows) && o.rows.split(' | ').length === 6 && o.friday.join() === 'true,false,hub' && o.attend === 'jumuah'
      && o.intro[0] === 'introout' && o.intro[1] === 'hub' && !errs.length;
    return { ok, detail: [JSON.stringify(o), ...errs] };
  };
  return T;
}
