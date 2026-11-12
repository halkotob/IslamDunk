// v9.17.10 the shove is removed (tests/run.mjs registers them):
//   no-shove     (fast tier) tryShove, shoveFoulCheck and callFoul are gone; Turbo + Pass on defense is a steal attempt,
//                the same as Pass alone (one steal try, nobody knocked down, no foul); late and trailing it's still the
//                foul on purpose (2 shots, the clock stops); the bonus still sends a non-shooting foul to the line;
//                an old career save with shoves and hardFouls loads; the "clean" scenario counts fouls; an online
//                peer on the old protocol (3) can't start a game with this one
//   fouls-kept   (full tier) 6 seeded CPU games at each difficulty, 3 of them with a scripted player mashing Turbo +
//                Pass: every game finishes, no page errors, no shove, nobody knocked down by a defender; across them
//                reach-ins, blocking fouls, shooting fouls, and-ones and fouls on purpose all still happen
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function noShoveTests({ newContext, open }) {
  const T = {};
  T['no-shove'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'noshove');
    const out = await p.evaluate(() => {
      const o = {};
      o.gone = ['tryShove', 'shoveFoulCheck', 'callFoul'].filter(n => typeof window[n] === 'function' || (() => { try { return typeof eval(n) === 'function'; } catch (e) { return false; } })());
      const setUp = () => {
        window.__seed(77); newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 60 } }); Game.screen = 'play'; M.introT = 0;
        for (let i = 0; i < 600 && M.phase !== 'live'; i++) updateMatch(STEP);
        const me = M.players.find(q => q.human === 0), h = me.opps[0]; giveBall(h); M.phase = 'live'; place(me, h.x + 30, h.z); me.state = 'free'; me.cd.steal = 0; me.turbo = 100;
        return { me, h };
      };
      let steals = 0; const _ts = trySteal; trySteal = function () { steals++; return _ts.apply(this, arguments); };
      const act = turbo => { const { me, h } = setUp(); steals = 0; const pf0 = me.stats.pf || 0; me.cmd.turbo = turbo; defPass(me);
        return { steals, state: me.state, down: h.state === 'down', foul: (me.stats.pf || 0) - pf0, phase: M.phase }; };
      const a = act(false), b = act(true); o.passAlone = a; o.turboPass = b;
      o.same = a.steals === 1 && b.steals === 1 && a.state === b.state && !b.down && b.foul === 0 && b.phase === 'live';
      // late and trailing: the foul on purpose
      { const { me, h } = setUp(); M.quarter = M.fmt.periods; M.clock = 20; M.teams[0].score = 10; M.teams[1].score = 14; place(me, h.x + 30, h.z); me.cmd.turbo = true; steals = 0; defPass(me);
        o.grab = { phase: M.phase, intF: (M.intF || [])[0], steals, shots: M.ft && M.ft.n }; }
      // the bonus: a non-shooting foul goes to the line
      { const { me, h } = setUp(); M.teamFouls = [5, 0]; nonShootingFoul(me, h, 'REACH-IN!'); o.bonus = { phase: M.phase, shots: M.ft && M.ft.n }; }
      trySteal = _ts;
      // the clean scenario twist counts fouls
      o.cleanText = (SCEN_TWISTS || []).find ? ((SCEN_TWISTS.find(t => t.id === 'clean') || {}).t) : null;
      // an online peer on the old protocol
      const keep = Lobby.guestPres, role = Net.role; Net.role = 'host';
      Lobby.guestPres = () => ({ v: VERSION, pv: NET_PROTO - 1 }); o.oldProto = Lobby.versionOK();
      Lobby.guestPres = () => ({ v: VERSION, pv: NET_PROTO }); o.sameProto = Lobby.versionOK();
      Lobby.guestPres = keep; Net.role = role; o.proto = NET_PROTO;
      return o;
    });
    // an old career save with shoves and hard fouls in its game log
    const save = await p.evaluate(() => {
      C = freshCareer(); C.name = 'Old'; C.games = [{ s: 1, me: { shoves: 3, hardFouls: 1 }, pts: 10 }]; C.shoves = 2; saveCareer();
      const raw = localStorage.getItem(SAVE_AUTO); const j = JSON.parse(raw); return !!j;
    });
    await p.reload(); await p.waitForFunction(() => typeof C !== 'undefined', null, { timeout: 15000 });
    const loaded = await p.evaluate(() => { const ok = loadCareer(SAVE_AUTO); return { ok: !!ok, name: C && C.name, games: C && C.games && C.games.length }; });
    await ctx.close();
    const ok = !out.gone.length && out.same && out.grab.phase === 'ft' && out.grab.intF === 1 && out.grab.steals === 0 && out.grab.shots === 2
      && out.bonus.phase === 'ft' && out.bonus.shots === 2 && out.oldProto === false && out.sameProto === true && out.proto >= 4
      && out.cleanText === 'Win without committing a foul' && save && loaded.ok && loaded.name === 'Old' && !errs.length;
    return { ok, detail: [JSON.stringify(out), 'old save: ' + JSON.stringify(loaded), ...errs] };
  };
  T['fouls-kept'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'fouls');
    const r = await p.evaluate(() => {
      const kinds = {}; let downs = 0;
      const fs0 = foulShots; foulShots = function (by, v, n, title) { kinds[title] = (kinds[title] || 0) + 1; return fs0.apply(this, arguments); };
      const ns0 = nonShootingFoul; nonShootingFoul = function (by, v, title) { kinds['non-shooting ' + title] = (kinds['non-shooting ' + title] || 0) + 1; return ns0.apply(this, arguments); };
      const kd0 = knockDown; knockDown = function (t) { if (t && M.players && M.players.some(q => q.team !== t.team && q.state === 'steal' && dxz(q, t) < 60)) downs++; return kd0.apply(this, arguments); };
      const _hc = humanCmd; let mash = false;
      humanCmd = function (pad, c) { _hc.apply(this, arguments); if (!mash || pad !== 0) return; const me = M.players.find(q => q.human === 0); if (!me) return; c.a = false; c.turbo = false; c.mx = c.mz = 0;
        if (ball.owner && ball.owner.team !== me.team) { const o = ball.owner, d = Math.hypot(o.x - me.x, o.z - me.z); c.mx = (o.x - me.x) / (d || 1); c.mz = (o.z - me.z) / (d || 1); c.turbo = true; if (d < 60 && Math.random() < 0.25) c.a = true; } };
      const games = [];
      for (const d of ['veryeasy', 'easy', 'medium', 'hard']) for (let g = 0; g < 6; g++) {   // (v9.19.2: 4 -> 6 games each; shooting fouls are rare, 2 in 16 games on 9.19.0 and none on 9.19.1)
        SETTINGS.difficulty = d; mash = g >= 3; window.__seed(3000 + g * 7919 + d.length);
        newMatch(TEAMS[g % 8], TEAMS[(g + 3) % 8], { humans: mash ? [{ team: 0, slot: 0, pad: 0 }] : [], fmt: { format: 'quarters', len: 60 } });
        let n = 0; for (; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; }
        games.push({ d, mash, over: M.phase === 'over', shoves: M.players.reduce((t, q) => t + (q.shoves || 0), 0) });
      }
      humanCmd = _hc; foulShots = fs0; nonShootingFoul = ns0; knockDown = kd0; SETTINGS.difficulty = 'medium';
      return { kinds, downs, games };
    });
    await ctx.close();
    const has = k => Object.keys(r.kinds).some(x => x.includes(k));
    const ok = r.games.every(g => g.over && g.shoves === 0) && r.downs === 0 && has('REACH-IN') && has('BLOCKING') && has('SHOOTING FOUL') && has('AND ONE') && has('FOUL ON PURPOSE') && !errs.length;
    return { ok, detail: [`${r.games.length} games, all finished: ${r.games.every(g => g.over)}; shoves ${r.games.reduce((t, g) => t + g.shoves, 0)}; knocked down by a defender ${r.downs}`, 'fouls: ' + JSON.stringify(r.kinds), ...errs] };
  };
  return T;
}
