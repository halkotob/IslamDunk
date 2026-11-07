// v9.17.4 the first match is friendly (tests/run.mjs registers them; the fast tier runs them):
//   first-easy      a fresh profile's first Quick Play match is Easy with Miss breakdown on (a missed shot gets its line);
//                   a profile with games, or a picked difficulty, is untouched (Medium)
//   first-stepup    after a first win, the result screen's hint row offers Medium once: Up sets it (and the choice is
//                   kept); leaving without it dismisses it for good; Enter still continues; after a loss, nothing
//   first-misswhy   unset: on through game 5, then off, and the next result screen says so once; an explicit '0' stays
//                   off through games 1-5 (and '1' stays on after); career, online, King of the Court and the
//                   mini-games keep it off and keep their difficulty
// and no page errors.
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function firstMatchTests({ newContext, open }) {
  const T = {};
  async function fresh(browser, base, keys = {}) {
    const errs = [], ctx = await newContext(browser);
    await ctx.addInitScript(k => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); localStorage.clear(); localStorage.setItem('islamdunk.persistNote', '1'); for (const [a, b] of Object.entries(k)) localStorage.setItem(a, b); } }, keys);
    const p = await open(ctx, base + '/?nowelcome=1', errs, 'page');
    return { ctx, p, errs };
  }
  const frames = (p, n = 10) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // a Quick Play match through the select screen's own start, then its end (won or lost) and the result screen
  const QUICK = () => { Game.sel = { a: 0, b: 1, ctrl: 0, mode: '1p', step: 1 }; startMatchFromSelect(null); };
  const END = won => { M.teams[0].score = won ? 21 : 10; M.teams[1].score = won ? 10 : 21; finishMatch(); Game.screen = 'final'; };
  // a missed jump shot by the player: does it get the Miss breakdown line?
  const MISS = () => { const me = M.players.find(q => q.human === 0); giveBall(me, 'test'); const h = attackHoop(me.team); me.x = h.x + h.dir * 260; me.z = 350; me.state = 'free'; me.st_t = 0.01; releaseShot(me); return !!(ball.shot && ball.shot.why); };
  T['first-easy'] = async ({ browser, base }) => {
    const out = {}, errs = [];
    for (const [tag, keys] of [['fresh', {}], ['played', { 'islamdunk.profile': JSON.stringify({ xp: 120, stats: { games: 3, wins: 1, minis: {}, crowns: 0 } }) }], ['picked', { 'islamdunk.difficulty.chosen': '1' }]]) {
      const P = await fresh(browser, base, keys);
      out[tag] = await P.p.evaluate(([q, miss]) => { (0, eval)(`(${q})()`); return { diff: SETTINGS.difficulty, cpu: aiCfg(1) === DIFF[SETTINGS.difficulty], first: !!M.firstEasy, missWhy: SETTINGS.missWhy, why: (0, eval)(`(${miss})()`) }; }, [QUICK.toString(), MISS.toString()]);
      await P.ctx.close(); errs.push(...P.errs);
    }
    const ok = out.fresh.diff === 'easy' && out.fresh.cpu && out.fresh.first && out.fresh.why && out.played.diff === 'medium' && !out.played.first && out.picked.diff === 'medium' && !out.picked.first && !out.picked.why === false && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['first-stepup'] = async ({ browser, base }) => {
    const errs = [];
    // a win: the offer is there; Up takes it
    let P = await fresh(browser, base);
    await P.p.evaluate(([q, e]) => { (0, eval)(`(${q})()`); (0, eval)(`(${e})(true)`); }, [QUICK.toString(), END.toString()]); await frames(P.p, 10);
    const offered = await P.p.evaluate(() => FINAL_NOTE.kind);
    await P.p.keyboard.press('ArrowUp'); await frames(P.p, 5);
    const took = await P.p.evaluate(() => ({ diff: SETTINGS.difficulty, chosen: localStorage.getItem('islamdunk.difficulty.chosen'), screen: Game.screen, done: FINAL_NOTE.done }));
    await P.p.keyboard.press('Enter'); await frames(P.p, 5);
    const left = await P.p.evaluate(() => Game.screen);
    // a second win in the same session: no offer
    const again = await P.p.evaluate(([q, e]) => { (0, eval)(`(${q})()`); (0, eval)(`(${e})(true)`); return [SETTINGS.difficulty, finalNoteFor()]; }, [QUICK.toString(), END.toString()]);
    await P.ctx.close(); errs.push(...P.errs);
    // a win, then Enter without taking it: dismissed for good (a new session's win doesn't bring it back)
    P = await fresh(browser, base);
    await P.p.evaluate(([q, e]) => { (0, eval)(`(${q})()`); (0, eval)(`(${e})(true)`); }, [QUICK.toString(), END.toString()]); await frames(P.p, 10);
    const offered2 = await P.p.evaluate(() => FINAL_NOTE.kind);
    await P.p.keyboard.press('Enter'); await frames(P.p, 5);
    const dismissed = await P.p.evaluate(([q, e]) => ({ screen: Game.screen, stepup: localStorage.getItem('islamdunk.stepup'), diff: SETTINGS.difficulty, next: ((0, eval)(`(${q})()`), (0, eval)(`(${e})(true)`), finalNoteFor()) }), [QUICK.toString(), END.toString()]);
    await P.ctx.close(); errs.push(...P.errs);
    // a loss: nothing
    P = await fresh(browser, base);
    const loss = await P.p.evaluate(([q, e]) => { (0, eval)(`(${q})()`); (0, eval)(`(${e})(false)`); return finalNoteFor(); }, [QUICK.toString(), END.toString()]);
    await P.ctx.close(); errs.push(...P.errs);
    const ok = offered === 'stepup' && took.diff === 'medium' && took.chosen === '1' && took.screen === 'final' && took.done && left !== 'final' && again[0] === 'medium' && again[1] === null
      && offered2 === 'stepup' && dismissed.screen !== 'final' && dismissed.stepup === '1' && dismissed.diff === 'easy' && dismissed.next === null && loss === null && !errs.length;
    return { ok, detail: [JSON.stringify({ offered, took, left, again, offered2, dismissed, loss }), ...errs] };
  };
  T['first-misswhy'] = async ({ browser, base }) => {
    const errs = [];
    // unset: games 1-5 explained, then off with one note
    let P = await fresh(browser, base);
    const unset = await P.p.evaluate(([q, e, miss]) => {
      const rows = [];
      for (let g = 1; g <= 7; g++) { (0, eval)(`(${q})()`); const why = (0, eval)(`(${miss})()`); (0, eval)(`(${e})(${g % 2 === 0})`); rows.push({ g, why, note: finalNoteFor() }); Game.screen = 'title'; }
      return rows;
    }, [QUICK.toString(), END.toString(), MISS.toString()]);
    await P.ctx.close(); errs.push(...P.errs);
    // explicit off ('0') through games 1-5; explicit on ('1') after game 5
    const runs = {};
    for (const v of ['0', '1']) {
      P = await fresh(browser, base, { 'islamdunk.misswhy': v });
      runs[v] = await P.p.evaluate(([q, e, miss]) => { const rows = []; for (let g = 1; g <= 7; g++) { (0, eval)(`(${q})()`); rows.push((0, eval)(`(${miss})()`)); (0, eval)(`(${e})(true)`); if (finalNoteFor() === 'missoff') rows.push('note!'); Game.screen = 'title'; } return { rows, stored: localStorage.getItem('islamdunk.misswhy') }; }, [QUICK.toString(), END.toString(), MISS.toString()]);
      await P.ctx.close(); errs.push(...P.errs);
    }
    // a new player elsewhere: career, King of the Court, a mini-game, and a rollback online match keep it off, and the
    // difficulty stays where it was (Medium)
    P = await fresh(browser, base);
    const other = await P.p.evaluate(miss => {
      const r = {}, m = () => (0, eval)(`(${miss})()`);
      C = freshCareer(); C.name = 'Yusuf'; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], career: true }); M.career = true; r.career = [m(), SETTINGS.difficulty];
      MiniMenu.kind = 'kotc'; startQuickMini(); const kp = M.players.find(q => q.human === 0); r.kotcOn = !!M.kotc && !!kp; r.kotc = [kp ? m() : null, SETTINGS.difficulty];
      MiniMenu.kind = 'lightning'; startQuickMini(); r.miniOn = !!M.mini; r.mini = [m(), SETTINGS.difficulty];
      return r;
    }, MISS.toString());
    await P.ctx.close(); errs.push(...P.errs);
    const note = unset.filter(r => r.note === 'missoff');
    const ok = unset.slice(0, 5).every(r => r.why) && unset.slice(5).every(r => !r.why) && note.length === 1 && note[0].g === 5
      && runs['0'].rows.every(x => x === false) && runs['0'].stored === '0' && runs['1'].rows.every(x => x === true) && runs['1'].stored === '1'
      && other.kotcOn && other.miniOn && !other.career[0] && other.kotc[0] === false && !other.mini[0] && [other.career, other.kotc, other.mini].every(x => x[1] === 'medium') && !errs.length;
    return { ok, detail: [`unset: ${JSON.stringify(unset)}`, `explicit: ${JSON.stringify(runs)}`, `career, KOTC, mini (explained?, difficulty): ${JSON.stringify(other)}`, ...errs] };
  };
  return T;
}
