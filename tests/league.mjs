// v9.7.0 league tests (tests/run.mjs registers them):
//   league-round        one game day with real league games: every player on every team has a game more; box score points
//                       equal the final score; team totals add up; our own game is in the same record; no NaN
//   league-determinism  the same seed gives the same league in two pages; the next game we play is identical with real
//                       league games or with none (the main random stream and global state are untouched); background
//                       slices on the hub leave the hub exactly as it was
//   league-headless     league games fire no achievements, rewards, sounds, replays or storage writes (the real ones,
//                       spied on), and leave Barakah Points, Halal Bucks and localStorage as they were
//   league-formats      the pool format through the semis and final (and out in the group), single elimination, every
//                       stage; a retried stage replaces the attempt's stats; an old save (sv 4) migrates with an empty record
//   league-board        leaders, ranks and the percentage minimums against a brute-force calculation on random records
//   league-time         ms per league game (desktop, and a 4x-throttled phone profile), the progress screen's hard cap
//                       (the fallback fires, is logged, and the flow goes on), and a game that throws
//   league-calibration  500 real league games against 500 fallback lines (means and spread per stat), and the scores of
//                       200 league games against 200 CPU-vs-CPU games played the normal way
//   league-layout       the leaders, a player, around the league and a box score at the five review sizes: no text on
//                       text, nothing off the canvas, no small text and 44 px tap targets on phones
import { CAL_HELPERS } from './calendar-setup.js';
import { LEAGUE_HELPERS, LEAGUE_CASES } from './league-setup.js';
import { HUB_SIZES } from './hub-setup.js';
import { HUB_RECORD_INIT } from './hub-layout.mjs';

const prep = async (p, mode) => p.evaluate(([a, b, m]) => { (0, eval)(a); (0, eval)(b); LEAGUE.mode = m; window.requestAnimationFrame = () => 0; }, [CAL_HELPERS, LEAGUE_HELPERS, mode || 'real']);
const stat = v => { const m = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length)) }; };

export function leagueTests({ newContext, open }) {
  const T = {};

  T['league-round'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'league-round');
    await prep(p);
    const r = await p.evaluate(() => {
      window.__seed(11); window.__calFresh();
      const before = JSON.stringify(C.lg); window.__lgPlayDay(); const run = C.lg.runs[0], G = C.lg.box.games;
      const teams = new Set(); for (const pl of Object.values(run.p)) teams.add(pl.t);
      const nan = /null|NaN/.test(JSON.stringify(C.lg.runs));
      const boxOK = G.every(g => g.ra.reduce((a, x) => a + x[1], 0) === g.sa && g.rb.reduce((a, x) => a + x[1], 0) === g.sb && g.sa !== g.sb);
      const ours = C.games[C.games.length - 1], oursOK = ours.a.reduce((a, x) => a + x.pts, 0) === ours.us && ours.o.reduce((a, x) => a + x.pts, 0) === ours.them;
      const pts = Object.values(run.p).reduce((a, e) => a + e.s[0], 0), scores = G.reduce((a, g) => a + g.sa + g.sb, 0) + ours.us + ours.them;
      const ids = Object.keys(run.p), gp = Object.values(run.p).map(e => e.g);
      return { before, players: ids.length, teams: teams.size, allOne: gp.every(n => n === 1), games: G.length, boxOK, oursOK, pts, scores, nan, me: !!run.p.me, mate: !!run.p['mate:' + (C.partner || 'saleem')], fallbacks: LEAGUE.fallbacks, sims: LEAGUE.sims };
    });
    await ctx.close();
    const ok = r.players === 16 && r.teams === 8 && r.allOne && r.games === 3 && r.boxOK && r.oursOK && r.pts === r.scores && !r.nan && r.me && r.mate && r.fallbacks === 0 && r.sims === 3 && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };

  T['league-determinism'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true });
    const one = async mode => { const p = await open(ctx, base + '/', errs, 'league-det ' + mode); await prep(p, mode);
      const v = await p.evaluate(() => {
        window.__seed(21); window.__calFresh(); window.__lgPlayDay(); window.__lgPlayDay();
        const lg = JSON.stringify(C.lg), bracket = JSON.stringify(C.bracket);
        // the next game we play: from here on, the same inputs must give the same game
        startCareerMatch(); for (let i = 0; i < 8 && Game.screen === 'story'; i++) Game.story.then();
        for (const q of M.players) q.human = -1;
        for (let n = 0; n < 1800; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; }
        const next = JSON.stringify({ s: M.teams.map(t => t.score), p: M.players.map(q => [q.x, q.z, q.state, q.stats]), b: [ball.x, ball.y, ball.z], r: Math.random() });
        return { lg, bracket, next };
      }); await p.close(); return v; };
    const A = await one('real'), A2 = await one('real'), B = await one('fallback');
    // background slices on the hub: the hub's own state is untouched
    const p = await open(ctx, base + '/', errs, 'league-det idle'); await prep(p);
    const idle = await p.evaluate(() => {
      window.__seed(31); window.__calFresh(); careerHub(); Game.screen = 'hub';
      const snap = () => JSON.stringify({ g: [Game.screen, Game.paused, Game.idx], m: [M.phase, M.gym, M.time, M.players.map(q => [q.x, q.z, q.state]), M.teams.map(t => t.score)], b: [ball.x, ball.y, ball.z, ball.state], c: [cam.x, cam.zoom], fx: FX.parts.length });
      const s0 = snap(), r0 = Math.random(); window.__seed(31); window.__calFresh(); careerHub(); Game.screen = 'hub'; const s1 = snap();
      let slices = 0; for (let i = 0; i < 20000 && lgRoundJobs().some(j => !LEAGUE.cache[j.key]); i++) { lgIdle(); slices++; }
      const s2 = snap(), r1 = Math.random();
      return { same: s1 === s2, rng: r0 === r1, slices, cached: Object.keys(LEAGUE.cache).length };
    });
    await ctx.close();
    const ok = A.lg === A2.lg && A.bracket === A2.bracket && A.next === A2.next && A.next === B.next && idle.same && idle.rng && idle.cached === 3 && !errs.length;
    return { ok, detail: [`same seed, same league: ${A.lg === A2.lg && A.bracket === A2.bracket}; next game same with real league games or none: ${A.next === B.next}; idle: ${JSON.stringify(idle)}`, ...errs] };
  };

  T['league-headless'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'league-headless');
    await prep(p);
    const r = await p.evaluate(() => {
      window.__seed(41); window.__calFresh(); careerHub();
      const spy = { sfx: 0, ach: 0, store: 0, replay: 0, toast: 0 }, undo = [];
      const wrap = (o, k, key) => { const f = o[k]; undo.push([o, k, f]); o[k] = function () { spy[key]++; return f.apply(this, arguments); }; };
      for (const k of Object.keys(SFX)) if (typeof SFX[k] === 'function') wrap(SFX, k, 'sfx');
      for (const k of Object.keys(Ach)) if (typeof Ach[k] === 'function') wrap(Ach, k, 'ach');
      for (const k of Object.keys(Replay)) if (typeof Replay[k] === 'function') wrap(Replay, k, 'replay');
      wrap(Storage.prototype, 'setItem', 'store');
      const _t = toast; toast = function () { spy.toast++; return _t.apply(this, arguments); };
      const ls = JSON.stringify(Object.assign({}, localStorage)), bp = C.bp, hb = C.hb, ach = typeof AchState !== 'undefined' ? JSON.stringify(AchState) : '';
      for (const j of lgRoundJobs()) lgPlayNow(j);
      for (const [o, k, f] of undo) o[k] = f; toast = _t;
      return { spy, blocked: LEAGUE.calls, sims: LEAGUE.sims, lsSame: JSON.stringify(Object.assign({}, localStorage)) === ls, bp: C.bp === bp, hb: C.hb === hb, ach: (typeof AchState !== 'undefined' ? JSON.stringify(AchState) : '') === ach };
    });
    await ctx.close();
    const s = r.spy, ok = r.sims === 3 && s.sfx === 0 && s.ach === 0 && s.store === 0 && s.replay === 0 && s.toast === 0 && r.lsSame && r.bp && r.hb && r.ach && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };

  T['league-formats'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'league-formats');
    await prep(p);
    const r = await p.evaluate(() => {
      const out = {};
      const day = won => { const gd = calGameDay(); if (gd > C.cal.d) calSetDay(gd); startCareerMatch(); M.teams[0].score = won ? 30 : 20; M.teams[1].score = won ? 20 : 30; M.winner = won ? 0 : 1; M.phase = 'over'; careerAfterMatch(); Game.screen = 'title'; };
      const check = () => { const run = C.lg.runs.find(x => x.s === (C.season || 1) && x.st === C.lg.box.st), G = C.lg.box.games;
        return { games: G.length, box: G.every(g => g.ra.reduce((a, x) => a + x[1], 0) === g.sa && g.rb.reduce((a, x) => a + x[1], 0) === g.sb), maxG: Math.max(...Object.values(run.p).map(e => e.g)), fb: LEAGUE.fallbacks }; };
      // pool: three group wins, the semifinal and the final (11 league games)
      window.__seed(51); window.__calFresh(); for (let i = 0; i < 5; i++) day(true); out.pool = Object.assign(check(), { stage: C.stage, champ: C.trophies.includes(0) });
      // pool, out in the group: the semis and the final are still played (3 group days: 9 league games, then 3)
      window.__seed(52); window.__calFresh(); for (let i = 0; i < 3; i++) day(false); out.groupOut = Object.assign(check(), { out: C.bracket.out, rounds: C.bracket.rounds.length, finalPlayed: C.bracket.rounds[1] && C.bracket.rounds[1][0].w != null });
      // a retry: the stage again replaces the attempt's stats (no double counting)
      const att0 = C.lg.runs[0].att; hubSelect(0); if (Game.screen === 'scout' || Game.screen === 'story') Game.screen = 'title'; day(true);
      out.retry = { att0, att1: C.lg.runs[0].att, runs: C.lg.runs.length, maxG: Math.max(...Object.values(C.lg.runs[0].p).map(e => e.g)), boxGames: C.lg.box.games.length };
      // single elimination (the pre-6.0 bracket): quarterfinal, semifinal, final
      window.__seed(53); window.__calFresh(); const mid = [2, 3, 4, 5, 6, 7]; C.bracket = { round: 0, out: false, rounds: [pairs([0, ...mid, 1])] };
      for (let i = 0; i < 3; i++) day(true); out.ko = Object.assign(check(), { champ: C.trophies.includes(0) });
      // every stage: one game day at each
      window.__seed(54); window.__calFresh(); out.stages = [];
      for (let st = 0; st < 4; st++) { C.stage = st; C.bracket = makeBracket(st); calEnsure(); day(true); const run = C.lg.runs.find(x => x.st === st); out.stages.push(run ? Object.keys(run.p).length : 0); }
      // an old save: sv 4 and no league record
      const old = Object.assign(freshCareer(), { name: 'Old', sv: 4, bracket: makeBracket(0) }); delete old.lg; localStorage.setItem('islamdunk.career.slot9', JSON.stringify(old));
      loadCareer('islamdunk.career.slot9'); out.migrated = { sv: C.sv, lg: JSON.stringify(C.lg) }; calEnsure(); day(true); out.migrated.after = C.lg.runs.length && Object.keys(C.lg.runs[0].p).length;
      return out;
    });
    await ctx.close();
    const ok = r.pool.games === 10 && r.pool.box && r.pool.maxG === 5 && r.pool.champ && r.groupOut.out && r.groupOut.finalPlayed && r.groupOut.games === 12
      && r.retry.att1 === r.retry.att0 + 1 && r.retry.runs === 1 && r.retry.maxG === 1 && r.retry.boxGames === 3
      && r.ko.games === 4 && r.ko.box && r.ko.champ && r.stages.every(n => n === 16) && r.migrated.sv === 5 && r.migrated.lg === '{"v":1,"runs":[],"box":null}' && r.migrated.after === 16 && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };

  T['league-board'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'league-board');
    await prep(p, 'fallback');
    const r = await p.evaluate(() => {
      window.__seed(61); window.__calFresh(); let bad = [], checks = 0;
      const R = lgRng(99), ri = n => Math.floor(R() * n);
      for (let trial = 0; trial < 30; trial++) {
        // random records: 3 seasons x 2 stages, 20 players, some ties
        C.season = 2; C.stage = 1; C.partner = 'saleem'; C.lg = { v: 1, runs: [], box: null };
        for (let s = 1; s <= 3; s++) for (let st = 0; st < 2; st++) { const run = { s, st, att: 0, p: {} };
          for (let i = 0; i < 20; i++) { if (R() < 0.2) continue; const pid = i === 0 ? 'me' : i === 1 ? 'mate:saleem' : 'P' + i + '@T' + (i % 8), g = 1 + ri(6);
            run.p[pid] = { n: i === 0 ? 'You' : 'Player ' + (i % 11), t: 'T' + (i % 8), ti: i % 8, g, s: LG_KEYS.map(k => k === 'fga' ? ri(12 * g) : k === 'tpa' ? ri(5 * g) : k === 'fta' ? ri(3 * g) : ri(8 * g)) };
            const e = run.p[pid], at = k => LG_KEYS.indexOf(k); e.s[at('fgm')] = Math.min(e.s[at('fgm')], e.s[at('fga')]); e.s[at('tpm')] = Math.min(e.s[at('tpm')], e.s[at('tpa')]); e.s[at('ftm')] = Math.min(e.s[at('ftm')], e.s[at('fta')]); }
          C.lg.runs.push(run); }
        for (const f of ['stage', 'season', 'career']) for (const [cat, , st, att, minPer] of LG_CATS) {
          // brute force: sum every run in the filter by pid; per game or made/attempted; the qualifiers; sort
          const runs = C.lg.runs.filter(x => f === 'career' || (f === 'season' ? x.s === C.season : x.s === C.season && x.st === C.stage));
          const tot = {}; for (const x of runs) for (const [pid, e] of Object.entries(x.p)) { const t = tot[pid] || (tot[pid] = { pid, n: e.n, g: 0, s: LG_KEYS.map(() => 0) }); t.g += e.g; e.s.forEach((v, i) => { t.s[i] += v; }); }
          const idx = k => LG_KEYS.indexOf(k), minG = { stage: 2, season: 4, career: 8 }[f];
          const list = Object.values(tot).filter(t => t.g > 0 && (!att || (t.g >= minG && t.s[idx(att)] >= minPer * t.g && t.s[idx(att)] > 0)))
            .map(t => ({ pid: t.pid, n: t.n, g: t.g, v: att ? t.s[idx(st)] / t.s[idx(att)] : t.s[idx(st)] / t.g }))
            .sort((a, b) => b.v - a.v || b.g - a.g || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0) || (a.pid < b.pid ? -1 : 1));
          const B = lgBoard(f, cat); checks++;
          const same = B.length === list.length && B.every((e, i) => e.p.pid === list[i].pid && Math.abs(e.v - list[i].v) < 1e-9 && e.rank === i + 1);
          if (!same) bad.push(f + '/' + cat + ' trial ' + trial);
          // unqualified players never appear in a percentage board
          if (att) for (const e of B) if (e.p.g < minG) bad.push('below the minimum: ' + f + '/' + cat);
        }
      }
      return { checks, bad: bad.slice(0, 10) };
    });
    await ctx.close();
    return { ok: r.checks === 30 * 27 && !r.bad.length && !errs.length, detail: [`${r.checks} boards compared with a brute-force ranking`, ...r.bad, ...errs] };
  };

  T['league-time'] = async ({ browser, base }) => {
    const errs = [], out = {};
    for (const [label, throttle] of [['desktop', 1], ['phone profile (4x CPU throttle)', 4]]) {
      const ctx = await newContext(browser, { seed: true, device: throttle > 1 ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : undefined });
      const p = await open(ctx, base + '/', errs, 'league-time ' + label); await prep(p);
      if (throttle > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
      out[label] = await p.evaluate(() => { window.__seed(71); window.__calFresh(); const jobs = lgRoundJobs(), t0 = performance.now(); for (const j of jobs) lgPlayNow(j); return { games: jobs.length, msPerGame: Math.round((performance.now() - t0) / jobs.length), fallbacks: LEAGUE.fallbacks }; });
      await ctx.close();
    }
    // the wait cap: a tiny cap makes the rest fall back, logged, and the flow goes on to the post-game screen
    const ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'league-time cap'); await prep(p);
    const cap = await p.evaluate(() => {
      window.__seed(72); window.__calFresh(); LEAGUE.waitCapMs = 1; LEAGUE.waitMs = 1;
      startCareerMatch(); M.teams[0].score = 30; M.teams[1].score = 20; M.winner = 0; M.phase = 'over'; Game.screen = 'final';
      finalContinue(); const s1 = Game.screen; let n = 0; while (Game.screen === 'cleague' && n++ < 2000) careerUpdate(STEP);
      const o = { waitScreen: s1, then: Game.screen, fallbacks: LEAGUE.fallbacks, logged: LEAGUE.log.length, recorded: C.lg.box.games.length, fb: C.lg.box.games.filter(g => g.fb).length };
      // a game that throws: the fallback, logged, and the round still completes
      LEAGUE.waitCapMs = 15000; LEAGUE.waitMs = 28; window.__seed(73); window.__calFresh(); const _u = updateMatch; let k = 0;
      updateMatch = function () { if (M.league && ++k === 50) throw new Error('boom'); return _u.apply(this, arguments); };
      const j = lgRoundJobs()[0], res = lgPlayNow(j); updateMatch = _u; o.threw = res.fb; return o; });
    await ctx.close();
    const D = out.desktop, P = out['phone profile (4x CPU throttle)'];
    const ok = D.games === 3 && D.msPerGame < 4000 && D.fallbacks === 0 && P.games === 3 && cap.waitScreen === 'cleague' && cap.then === 'postgame' && cap.fallbacks >= 1 && cap.logged === cap.fallbacks && cap.recorded === 3 && /threw: boom/.test(cap.threw || '') && !errs.length;
    return { ok, detail: [JSON.stringify(out), 'cap: ' + JSON.stringify(cap), ...errs] };
  };

  T['league-calibration'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true });
    const K = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'dnk', 'chg'];
    const part = async (off, n, cpu) => { const p = await open(ctx, base + '/', errs, 'league-cal ' + off); await prep(p);
      const v = await p.evaluate(([off, n, cpu]) => { window.__calFresh(); const real = [], fb = [], cpuScores = [];
        for (let i = 0; i < n; i++) { const st = (i + off) % 4, a = 1 + ((i * 5 + off) % 7); let b = 1 + ((i * 3 + 2 + off) % 7); if (b === a) b = a === 7 ? 1 : a + 1;
          const job = { key: 'calib|' + (i + off), a, b, stage: st, cseed: C.seed, round: '' };
          const r = lgPlayNow(job); delete LEAGUE.cache[job.key]; real.push({ sa: r.sa, sb: r.sb, rows: [...r.ra, ...r.rb], fb: r.fb || null });
          const f = lgFallback(job, 'x'); fb.push({ sa: f.sa, sb: f.sb, rows: [...f.ra, ...f.rb] });
          if (i < cpu) { window.__seed(9000 + i + off); newMatch(teamOf(st, a), teamOf(st, b), { humans: [], aiCfg: [diffAt(lgLevel(st, a)), diffAt(lgLevel(st, b))] }); Game.screen = 'title';
            for (let s = 0; s < 60 * 60 * 30 && M.phase !== 'over'; s++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; }
            cpuScores.push(M.teams[0].score, M.teams[1].score); } }
        return { real, fb, cpuScores }; }, [off, n, cpu]);
      await p.close(); return v; };
    const parts = await Promise.all([part(0, 250, 100), part(5000, 250, 100)]);
    await ctx.close();
    const real = parts.flatMap(x => x.real), fb = parts.flatMap(x => x.fb), cpu = parts.flatMap(x => x.cpuScores);
    const rows = [], bad = [];
    for (const k of K) {
      const a = stat(real.flatMap(g => g.rows.map(r => r[k] || 0))), b = stat(fb.flatMap(g => g.rows.map(r => r[k] || 0)));
      const meanOK = Math.abs(a.m - b.m) <= Math.max(0.3, a.m * 0.2), sdOK = b.sd >= a.sd * 0.5 && b.sd <= a.sd * 1.5;
      rows.push(`${k}: real ${a.m.toFixed(2)}±${a.sd.toFixed(2)}, fallback ${b.m.toFixed(2)}±${b.sd.toFixed(2)}`); if (!meanOK || !sdOK) bad.push(k);
    }
    const lgScores = stat(real.slice(0, 200).flatMap(g => [g.sa, g.sb])), cpuS = stat(cpu), fbS = stat(fb.flatMap(g => [g.sa, g.sb]));
    const distOK = Math.abs(lgScores.m - cpuS.m) <= Math.max(1.5, cpuS.m * 0.06) && Math.abs(lgScores.sd - cpuS.sd) <= cpuS.sd * 0.25;
    const scoreOK = Math.abs(fbS.m - lgScores.m) <= lgScores.m * 0.08;
    const ok = real.length === 500 && !real.some(g => g.fb) && !bad.length && distOK && scoreOK && !errs.length;
    return { ok, detail: [`team scores: league ${lgScores.m.toFixed(2)}±${lgScores.sd.toFixed(2)} (200), CPU-vs-CPU ${cpuS.m.toFixed(2)}±${cpuS.sd.toFixed(2)} (200), fallback ${fbS.m.toFixed(2)}±${fbS.sd.toFixed(2)} (500)`, ...rows, bad.length ? 'off: ' + bad.join(', ') : '', ...errs].filter(Boolean) };
  };

  T['league-layout'] = async ({ browser, base }) => {
    const errs = [], detail = []; let n = 0, fails = 0;
    const c0 = await newContext(browser, { seed: true }), p0 = await open(c0, base + '/', errs, 'league-layout build'); await prep(p0, 'fallback');
    const json = await p0.evaluate(() => { window.__seed(81); window.__lgBuild(5, 'fallback'); return window.__lgDump(); });
    await c0.close();
    for (const [sz, dev] of HUB_SIZES) {
      const ctx = await newContext(browser, { device: dev }); await ctx.addInitScript(HUB_RECORD_INIT);
      const p = await open(ctx, base + '/', errs, 'league-layout ' + sz);
      await p.evaluate(([a, b, j, touch]) => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} (0, eval)(a); (0, eval)(b); LEAGUE.mode = 'fallback'; Input.touchMode = touch; window.requestAnimationFrame(() => {}); window.__lgLoad(j); }, [CAL_HELPERS, LEAGUE_HELPERS, json, !!dev.hasTouch]);
      for (const [name, o] of LEAGUE_CASES) {
        await p.evaluate(o => { const other = (lgBoard('stage', 'ppg').find(x => !lgMinesFor().includes(x.p.pid)) || { p: {} }).p.pid; return window.__lgOpen(o.view, Object.assign({}, o, { pid: o.pid === null ? other : o.pid })); }, o);
        await p.waitForTimeout(300);
        const rec = await p.evaluate(() => {
          const R = window.__hubRec, g = ctx, rects = []; R.texts = []; R.on = true;
          const _ar = addRect; addRect = function (x, y, w, h) { const a = window.__hubBox(g, x, y, w, h); rects.push(a); return _ar.apply(this, arguments); };
          try { render(g); } finally { addRect = _ar; R.on = false; }
          return { texts: R.texts, rects, cw: g.canvas.width, css: g.canvas.getBoundingClientRect().width / g.canvas.width, view: Game.stats.view };
        });
        n++;
        const bad = [], T2 = rec.texts.filter(t => t.r - t.l > 0.5), ov = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
        for (let i = 0; i < T2.length; i++) for (let j = i + 1; j < T2.length; j++) if (ov(T2[i], T2[j])) bad.push(`text on text: "${T2[i].text}" / "${T2[j].text}"`);
        for (const t of T2) { if (t.l < -2 || t.r > rec.cw + 2) bad.push(`off the canvas: "${t.text}"`); if (dev.hasTouch && t.css && t.css < 10.95) bad.push(`small: "${t.text}" ${t.css.toFixed(1)}`); }
        if (dev.hasTouch && rec.view !== 'box') for (const r of rec.rects) { const w = (r.r - r.l) * rec.css, h = (r.b - r.t) * rec.css; if (w < W2 || h < 43.5) bad.push(`tap target ${w.toFixed(0)}x${h.toFixed(0)} css px`); }
        if (bad.length) { fails++; detail.push(`${sz} ${name}: ` + [...new Set(bad)].slice(0, 5).join('; ')); }
      }
      await ctx.close();
    }
    detail.unshift(`${n} league frames checked (${HUB_SIZES.length} sizes x ${LEAGUE_CASES.length} views), ${fails} with problems`);
    return { ok: !fails && !errs.length, detail: [...detail, ...errs] };
  };
  const W2 = 43.5;
  return T;
}
