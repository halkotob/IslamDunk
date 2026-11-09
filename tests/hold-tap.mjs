// v9.17.8 (IN2) hold or tap (tests/run.mjs registers it; fast tier):
//   hold-tap  a match against the CPU on this device, with real key presses. Tap: one tap of L guards until the second
//             tap; it clears when the ball changes hands, when the ball is dead and on pause; one tap of Shift keeps
//             you sprinting while you move. Hold (the default): the same taps guard and sprint only while held, as
//             before. Saves: no setting stored loads as Hold, and Tap comes back after a reload.
//   hold-tap-bot  the same seeded game twice, a scripted defender holding DEFEND or tapping it once on Tap: the same game
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function holdTapTests({ newContext, open }) {
  const T = {};
  T['hold-tap'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'holdtap');
    const out = {};
    out.defaultLoad = await p.evaluate(() => [SETTINGS.defToggle, SETTINGS.sprToggle, localStorage.getItem('islamdunk.holdtap')].join());
    const start = () => p.evaluate(() => {
      Input.touchMode = false; Input.lastDev = 'kb'; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
      for (let i = 0; i < 600 && M.phase !== 'live'; i++) updateMatch(STEP);
      const me = M.players.find(q => q.human === 0); window.__me = me;
      const opp = me.opps[0]; giveBall(opp); M.phase = 'live'; M.clock = 100; M.shotClock = 24;
      for (const q of M.players) if (q.human < 0) q.cpuFrozen = true;
    });
    // the CPU stands still (its brain is skipped) so the possession only changes when the test changes it
    await p.evaluate(() => { const _u = Brain.prototype.update; Brain.prototype.update = function () { if (this.p.cpuFrozen) { const c = this.p.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = false; c.turbo = false; c.bHeld = false; return; } return _u.apply(this, arguments); }; });
    const held = () => p.evaluate(() => !!(window.__me.v8 && window.__me.v8.held));
    const tapKey = async k => { await p.keyboard.down(k); await sleep(80); await p.keyboard.up(k); await sleep(400); };   // (room for a busy machine)
    // 1. Hold (default): a tap guards only while held
    await start(); await sleep(300);
    await p.keyboard.down('l'); await sleep(200); out.holdWhileDown = await held(); await p.keyboard.up('l'); await sleep(250); out.holdAfterUp = await held();
    // 2. Tap: on, stays on, off
    await p.evaluate(() => { SETTINGS.defToggle = true; SETTINGS.sprToggle = true; holdTapSave(); });
    await start(); await sleep(300);
    await tapKey('l'); out.tapOn = await held(); await sleep(600); out.tapStays = await held();
    await tapKey('l'); out.tapOff = await held();
    // 3. clears: the ball changes hands, a dead ball, a pause
    await tapKey('l'); const onBefore = await held();
    await p.evaluate(() => giveBall(window.__me)); await sleep(450); await p.evaluate(() => giveBall(window.__me.opps[0])); await sleep(450);
    out.clearPossession = onBefore && !(await held()) && !(await p.evaluate(() => Latch[0].def));
    if (!out.clearPossession) out.cpWhy = await p.evaluate(() => ({ held: !!(window.__me.v8 && window.__me.v8.held), L: Object.assign({}, Latch[0]), ctx: defCtx(window.__me), ph: M.phase, owner: ball.owner && ball.owner.team, xHeld: window.__me.cmd.xHeld }));
    await tapKey('l'); const on2 = await held();
    await p.evaluate(() => { M.phase = 'dead'; }); await sleep(200); await p.evaluate(() => { M.phase = 'live'; }); await sleep(200);
    out.clearDead = on2 && !(await p.evaluate(() => Latch[0].def));
    await tapKey('l'); const on3 = await held();
    await p.evaluate(() => { Game.paused = true; }); await sleep(200); await p.evaluate(() => { Game.paused = false; }); await sleep(200);
    out.clearPause = on3 && !(await p.evaluate(() => Latch[0].def));
    // 4. sprint: one tap of Shift, then move: sprinting; let go of the direction: not; tap again: off
    await p.evaluate(() => giveBall(window.__me)); await sleep(200);
    await tapKey('Shift'); await p.keyboard.down('d'); await sleep(400);
    out.sprintMoving = await p.evaluate(() => !!window.__me.cmd.turbo); await p.keyboard.up('d'); await sleep(200);
    out.sprintStill = await p.evaluate(() => !!window.__me.cmd.turbo);
    await tapKey('Shift'); await p.keyboard.down('d'); await sleep(300); out.sprintOff = await p.evaluate(() => !!window.__me.cmd.turbo); await p.keyboard.up('d');
    // 5. the setting rows, and the save after a reload
    out.rows = await p.evaluate(() => { const it = SET_ITEMS.find(s => s.label === 'Hold or tap'), seen = [it.get()]; for (let k = 0; k < 4; k++) { it.step(1); seen.push(it.get()); } return seen.join('; '); });
    out.groups = await p.evaluate(() => setGroupItems(SET_GROUPS.findIndex(g => g.name === 'Accessibility')).map(s => s.label).filter(l => l === 'Hold or tap').length);
    out.local = await p.evaluate(() => RB_LOCAL.has('defToggle') && RB_LOCAL.has('sprToggle'));
    await p.reload(); await p.waitForFunction(() => typeof SETTINGS !== 'undefined', null, { timeout: 15000 });
    out.reload = await p.evaluate(() => [SETTINGS.defToggle, SETTINGS.sprToggle].join());
    await ctx.close();
    const ok = out.defaultLoad === 'false,false,' && out.holdWhileDown && !out.holdAfterUp && out.tapOn && out.tapStays && !out.tapOff
      && out.clearPossession && out.clearDead && out.clearPause && out.sprintMoving && !out.sprintStill && !out.sprintOff
      && out.rows === 'Tap: Defend and Sprint; Hold; Tap: Defend; Tap: Sprint; Tap: Defend and Sprint' && out.groups === 1 && out.local && out.reload === 'true,true' && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  // a scripted player on defense, the same seeded game twice: one holds DEFEND for every defensive possession (through a shot, which boxes out), the
  // other is on Tap and taps once whenever he's on defense and not guarding. Same game: the same score, the same
  // defence numbers, the same state at the end
  T['hold-tap-bot'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'holdtap-bot');
    // played with rbStep (the online match's step: seeded and exact), the scripted player's buttons as frame inputs
    const run = tap => p.evaluate(tap => {
      window.__seed(4242); rbClean(); SETTINGS.defToggle = tap; SETTINGS.sprToggle = false; for (const L of Latch) latchClear(L);
      Input.touchMode = false; Input.lastDev = 'kb'; Input.down = {}; Input.pressed = {}; Input.released = {};
      newMatch(TEAMS[2], TEAMS[5], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'halves', len: 60 } });
      Game.screen = 'play'; Game.paused = false; M.introT = 0; Game.trivia = null; for (const q of M.players) q.hifzUsed = true;
      M.rbSeed = 4242; RB.cfg = rbConfig({ difficulty: 'medium', dribble: 'classic', teamCtl: 'single', fun: false, rubber: true, tomahawk: 0 });
      const me = M.players.find(q => q.human === 0), D = 1 << 7; let taps = 0, heldF = 0, steps = 0, was = 0;
      for (; steps < 60 * 60 * 6 && M.phase !== 'over'; steps++) {
        if (Game.screen !== 'play') Game.screen = 'play';
        const cx = M.phase === 'live' ? defCtx(me) : null, onD = cx === 'def';
        let h = 0;
        if (tap) { Input.pressed = {}; if (onD && !Latch[0].def) { Input.pressed.KeyL = true; h = D; taps++; } latchTick(); }
        else if (onD || (cx === 'reb' && (was & D))) { h = D; heldF++; }   // (held through a shot in the air: a box out, as a held button would)
        let I = { h, p: h & ~was, r: was & ~h, mx: 0, mz: 0 };
        if (tap) I = latchBits(I, Latch[0], me);
        was = I.h; rbStep([I, RB_IDLE]);
      }
      const opp = M.teams[1].players, sum = k => opp.reduce((n, q) => n + ((q.stats && q.stats[k]) || 0), 0);
      const out = { score: M.teams.map(t => t.score).join('-'), oppFga: sum('fga'), oppFgm: sum('fgm'), oppTov: sum('tov'), steals: (me.stats && me.stats.stl) || 0, hash: rbHash(), steps, taps, heldF };
      RB.cfg = null; SETTINGS.defToggle = false; return out;
    }, tap);
    const hold = await run(false), tapR = await run(true);
    await ctx.close();
    const same = ['score', 'oppFga', 'oppFgm', 'oppTov', 'steals', 'hash', 'steps'].every(k => hold[k] === tapR[k]);
    return { ok: same && tapR.taps > 0 && hold.heldF > 100 && !errs.length, detail: [`hold: ${JSON.stringify(hold)}`, `tap:  ${JSON.stringify(tapR)}`, ...errs] };
  };
  return T;
}
