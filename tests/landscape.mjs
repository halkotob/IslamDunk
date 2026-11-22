// v9.34.0 landscape (fast): the game is landscape only.
//   - a phone held upright (390x844, touch): only the "turn your phone sideways" card shows; it has no button (the old
//     "play in portrait anyway" is gone); a tap lands on the card, not the game
//   - a match behind it holds: the clock doesn't move, presses do nothing, the match comes back to the pause menu
//   - turned sideways (844x390) the card goes by itself and the match goes on from Resume
//   - a tall desktop window (fine pointer) never sees the card; the Review Studio's frame skips it (studio-phone loads
//     the Studio upright too)
export const LANDSCAPE_TESTS = {};
LANDSCAPE_TESTS['landscape'] = async ({ browser, base }) => {
  const errs = [], detail = [];
  const card = p => p.evaluate(() => { const r = document.getElementById('rotate'), cs = getComputedStyle(r); return { shown: cs.display !== 'none', buttons: r.querySelectorAll('button').length, top: document.elementFromPoint(innerWidth / 2, innerHeight * 0.75) === r || r.contains(document.elementFromPoint(innerWidth / 2, innerHeight * 0.75)) }; });
  // (opened sideways, then turned upright: opened upright, it holds on the splash until the phone turns)
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '/?nowelcome=1'); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
  const pre = await card(p);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  const up = await card(p);
  // a match, started upright: it holds behind the card
  await p.evaluate(() => { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 120 } }); Game.screen = 'play'; Game.paused = false; M.introT = 0; M.phase = 'live'; });
  const c0 = await p.evaluate(() => ({ clock: M.clock, t: M.time }));
  await p.keyboard.press('Escape'); await p.mouse.click(195, 600); await p.waitForTimeout(1200);
  const held = await p.evaluate(() => ({ clock: M.clock, t: M.time, screen: Game.screen, paused: !!Game.paused, on: rotateCardOn() }));
  // turned sideways
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400);
  const side = await card(p);
  await p.evaluate(() => { Game.paused = false; Game.blurPaused = false; });
  await p.waitForTimeout(1200);
  const on = await p.evaluate(() => ({ t: M.time, screen: Game.screen, on: rotateCardOn() }));
  await ctx.close();
  // a tall desktop window
  const d = await browser.newContext({ viewport: { width: 700, height: 1000 } }); const dp = await d.newPage(); dp.on('pageerror', e => errs.push(e.message));
  await dp.goto(base + '/?nowelcome=1'); await dp.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
  const desk = await card(dp); await d.close();
  detail.push(`sideways at first: the card shows ${pre.shown}`, `upright phone: the card shows ${up.shown}, buttons on it ${up.buttons}, a tap lands on it ${up.top}`,
    `a match behind it, 1.2 s with Esc and a tap: the game time ${c0.t.toFixed(2)} -> ${held.t.toFixed(2)}, clock ${c0.clock.toFixed(1)} -> ${held.clock.toFixed(1)}, paused ${held.paused}`,
    `turned sideways: the card shows ${side.shown}; after Resume the game time goes on to ${on.t.toFixed(2)} (${on.screen})`,
    `a tall desktop window (700x1000): the card shows ${desk.shown}`, ...errs);
  const ok = !pre.shown && up.shown && up.buttons === 0 && up.top && held.t === c0.t && held.clock === c0.clock && held.paused && held.screen === 'play' && !side.shown && on.t > held.t + 0.5 && !on.on && !desk.shown && !errs.length;
  return { ok, detail };
};
