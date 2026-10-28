// ===================================================== v9.7.0: THE LEAGUE (every game in the bracket is played)
// The other games of each round used to be a made-up score (44 + random + team power). Now they are real CPU-vs-CPU
// games on the match engine, run headless: the same format and 14 s clock as ours, the same teams (teamOf), the same
// CPU levels, rules and fouls. Every player on every team gets a stat line, kept per stage run in C.lg (save v5).
//
// Isolation. The match engine's state is global (M, ball, cam, ...), so a league game only ever runs between frames
// when no match is being played, in slices: each slice saves everything the engine touches, swaps the league game's
// own state in, steps it, swaps it out and restores ours. During a slice the parts of the game that aren't the
// simulation are switched off: sound, particles, replays and clips, achievements, toasts, storage writes, building
// courts and crowds, and the end-of-match flow (career rewards, profile, series). Its random numbers come from its own
// generator, seeded from C.seed, season, stage, attempt, round and game, so a save always produces the same league,
// and the main random stream is never touched (the game you play next is the same with or without these sims).
//
// Scheduling. The games of the round that don't involve us are played in the background (a few ms per frame on calm
// screens: the hub, menus, post-game), and whatever is left, plus anything that depends on our result, is played on
// an "Around the league" screen after our game, at a larger budget with a hard time cap. A game that throws or runs
// past its cap gets the fallback (lgFallback: a calibrated score and stat lines), is logged, and never blocks.
const LG_KEYS = ['pts', 'ast', 'reb', 'stl', 'blk', 'chg', 'tov', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'dnk'];
const LEAGUE = {
  mode: 'real',                 // 'real' | 'fallback' (test fixtures that only need a bracket: no engine time)
  cache: {},                    // game key -> result (memory only; a reload recomputes the same results)
  cur: null,                    // the league game being played (its saved state between slices)
  log: [], fallbacks: 0, sims: 0, simMs: 0, simSteps: 0,
  idleMs: 8, waitMs: 80,        // per-frame budgets: background (calm screens), and on the Around the league screen (a progress bar)
  capMs: 30000, waitCapMs: 20000, capSteps: 60 * 60 * 30,
  calls: { sfx: 0, ach: 0, store: 0, replay: 0, toast: 0, finish: 0 }   // what headless games tried to do (tests)
};
// ---------------------------------------------------------------- keys, seeds, random numbers
function lgRun() { return { s: C.season || 1, st: C.stage, att: C.retries || 0 }; }
function lgPos(b, m) {
  if (b.pg) for (let p = 0; p < b.pg.length; p++) { const i = b.pg[p].indexOf(m); if (i >= 0) return 'g' + p + '.' + i; }
  for (let r = 0; r < (b.rounds || []).length; r++) { const i = b.rounds[r].indexOf(m); if (i >= 0) return 'r' + r + '.' + i; }
  return 'x';
}
function lgKey(b, m) { const R = lgRun(); return C.seed + '|' + R.s + '|' + R.st + '|' + R.att + '|' + lgPos(b, m) + '|' + m.a + '-' + m.b; }
function lgHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function lgRng(seed) { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function lgRoundName(b, m) {
  if (b.pg) for (let p = 0; p < b.pg.length; p++) if (b.pg[p].includes(m)) return 'Group game ' + (m.md + 1);
  for (let r = 0; r < (b.rounds || []).length; r++) if (b.rounds[r].includes(m)) return b.fmt === 'pool' ? (r === 0 ? 'Semifinal' : 'Final') : (ROUND_NAMES[r] || 'Round ' + (r + 1));
  return '';
}
// the CPU level a team plays at in the career (the same rule as our opponents: the stage's level, a notch per tier)
function lgLevel(stage, i) { const lv = careerLevels(stage); return Math.max(SETTINGS.difficulty === 'veryeasy' ? -1 : 0, lv.opp + (teamOf(stage, i).tier || 0) * 0.2); }

// ---------------------------------------------------------------- isolation: save / swap / restore
// Each global the engine touches is saved one level deep: the object's own properties, and for each property that is
// an array or a plain object, its contents, kept under the same identity (so nothing holding a reference sees a copy).
function lgSnapObj(o) {
  const props = {}, inner = [];
  for (const k of Object.keys(o)) {
    const v = o[k]; props[k] = v;
    if (Array.isArray(v)) inner.push([v, v.slice()]);
    else if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) inner.push([v, Object.assign({}, v)]);
  }
  return { o, props, inner };
}
function lgRestoreObj(S) {
  const { o, props, inner } = S;
  for (const k of Object.keys(o)) if (!(k in props)) delete o[k];
  Object.assign(o, props);
  for (const [ref, c] of inner) { if (Array.isArray(ref)) { ref.length = 0; for (const x of c) ref.push(x); } else { for (const k of Object.keys(ref)) if (!(k in c)) delete ref[k]; Object.assign(ref, c); } }
}
function lgGlobals() {
  const g = [M, ball, cam, FX, Game];
  for (const n of ['PossLog', 'CGame', 'REEL', 'React8', '_lastCall']) { try { const v = (0, eval)('typeof ' + n + ' !== "undefined" ? ' + n + ' : null'); if (v && typeof v === 'object') g.push(v); } catch (e) {} }
  return g;
}
function lgSnapAll() {
  return { objs: lgGlobals().map(lgSnapObj), nets: hoops.map(h => ({ h, own: lgSnapObj(h), pts: (h.pts || []).map(q => Object.assign({}, q)) })) };
}
function lgRestoreAll(S) {
  for (const s of S.objs) lgRestoreObj(s);
  for (const n of S.nets) { lgRestoreObj(n.own); (n.h.pts || []).forEach((q, i) => { if (n.pts[i]) Object.assign(q, n.pts[i]); }); }
}
// the parts of the game that aren't the simulation, switched off for a slice
function lgStubs(rng) {
  const undo = [], C0 = LEAGUE.calls;
  const swapFn = (obj, k, f) => { const own = Object.prototype.hasOwnProperty.call(obj, k); undo.push([obj, k, obj[k], own]); obj[k] = f; };
  for (const k of Object.keys(SFX)) if (typeof SFX[k] === 'function') swapFn(SFX, k, () => { C0.sfx++; });
  for (const k of ['callout', 'pop', 'burst', 'spark', 'dust', 'cue', 'update', 'reset', 'flash', 'slowmo', 'hitstop', 'replay', 'shake', 'hype']) if (typeof FX[k] === 'function') swapFn(FX, k, () => {});
  for (const k of Object.keys(Replay)) if (typeof Replay[k] === 'function') swapFn(Replay, k, () => { C0.replay++; });
  if (typeof Ach !== 'undefined') for (const k of Object.keys(Ach)) if (typeof Ach[k] === 'function') swapFn(Ach, k, () => { C0.ach++; });
  swapFn(Storage.prototype, 'setItem', () => { C0.store++; });
  for (const h of hoops) swapFn(h, 'update', function (dt) { this.vy += (-this.dy * 380 - this.vy * 8) * dt; this.dy += this.vy * dt; });   // the rim spring only (bounces read it); the net is drawing
  swapFn(Math, 'random', rng);
  // global functions (bindings, not properties): swapped by name
  const G = { toast: () => { C0.toast++; }, buildCourt: () => {}, buildCrowd: () => {}, setVenue: () => {}, buildGymFloor: () => {},
    finishMatch: () => { C0.finish++; M.phase = 'over'; M.winner = M.teams[0].score > M.teams[1].score ? 0 : 1; } };
  const keepG = LEAGUE._back = {}; LEAGUE._fn = G;
  for (const n of Object.keys(G)) { try { keepG[n] = (0, eval)(n); (0, eval)(n + ' = LEAGUE._fn.' + n); } catch (e) { delete keepG[n]; } }
  return () => {
    for (const n of Object.keys(keepG)) (0, eval)(n + ' = LEAGUE._back.' + n);
    for (let i = undo.length - 1; i >= 0; i--) { const [obj, k, v, own] = undo[i]; if (own) obj[k] = v; else delete obj[k]; }
  };
}

// state that outlives a match and steers its random numbers (the commentary avoids repeating its last line): a league
// game starts it empty, so its result depends on its seed alone (ours is saved and restored around every slice)
function lgFresh() { if (typeof _lastCall !== 'undefined') for (const k of Object.keys(_lastCall)) delete _lastCall[k]; }
// ---------------------------------------------------------------- one league game: start, slices, finish
function lgJob(b, m) { return { key: lgKey(b, m), a: m.a, b: m.b, stage: C.stage, cseed: C.seed, round: lgRoundName(b, m) }; }
function lgBegin(job) {
  const S = { job, rng: lgRng(lgHash(job.key)), state: null, steps: 0, ms: 0, t0: performance.now(), fail: null };
  lgSlice(S, 0, true);
  return S;
}
// run a slice of at most `ms` milliseconds; returns true when the game is over (S.result set)
function lgSlice(S, ms, first) {
  const main = lgSnapAll(), unstub = lgStubs(S.rng), t0 = performance.now();
  const keepScreen = Game.screen;
  try {
    if (first) {
      const j = S.job, tA = teamOf(j.stage, j.a), tB = teamOf(j.stage, j.b);
      lgFresh();                                                        // memories that outlive a match start empty (same game, same result)
      newMatch(tA, tB, { humans: [], aiCfg: [diffAt(lgLevel(j.stage, j.a)), diffAt(lgLevel(j.stage, j.b))] });
      M.league = true; Game.screen = 'league:sim';
    } else lgRestoreAll(S.state);
    let n = 0;
    while (M.phase !== 'over' && S.steps < LEAGUE.capSteps) {
      updateMatch(STEP); S.steps++; n++;
      if (Game.screen !== 'league:sim') Game.screen = 'league:sim';   // halftime, the final screen: a headless game just carries on
      if ((n & 63) === 0 && performance.now() - t0 >= ms) break;
    }
    if (M.phase === 'over') S.result = lgCollect(S.job);
    else if (S.steps >= LEAGUE.capSteps) S.fail = 'ran past ' + LEAGUE.capSteps + ' steps';
    S.state = S.result || S.fail ? null : lgSnapAll();
  } catch (e) { S.fail = 'threw: ' + (e && e.message || e); S.state = null; }
  finally { unstub(); lgRestoreAll(main); Game.screen = keepScreen; }
  S.ms += performance.now() - t0;
  if (!S.result && !S.fail && S.ms > LEAGUE.capMs) S.fail = 'ran past ' + LEAGUE.capMs + ' ms';
  return !!(S.result || S.fail);
}
function lgLine(p) { const s = p.stats, o = { n: p.def.name }; for (const k of LG_KEYS) o[k] = s[k] || 0; o.pts += s.xpts || 0; o.pf = s.pf || 0; return o; }   // xpts: see onScore below
function lgCollect(job) { return { sa: M.teams[0].score, sb: M.teams[1].score, ra: M.teams[0].players.map(lgLine), rb: M.teams[1].players.map(lgLine), t: M.time }; }

// ---------------------------------------------------------------- the fallback: a calibrated score and stat lines
// Used when a game throws or runs past its cap, and by test fixtures (LEAGUE.mode = 'fallback'). Its own seeded
// generator, never Math.random. Calibrated on real league games (v9.7.0, 300 at 2 halves of 2:00 and 30 at each other
// length; the league-calibration test checks it against 500 more): points per team per minute by period length, the
// score's spread, and for each stat a rate per team point, split between the two players. Shooting follows each
// player's points; rebounds, assists, steals, blocks, turnovers and charges are split on their own.
// v9.8: steals, blocks and turnovers recalibrated (positional steals and blocks; 500 real games: 1.26 / 1.65 / 1.27 a player).
const LG_CAL = {
  ppm: { 30: 10.8, 45: 9.67, 60: 9.33, 120: 9.1 }, rel: { 30: 0.3, 45: 0.29, 60: 0.22, 120: 0.19 }, quartersK: 0.98,
  first21: { lose: 0.77, loseSd: 0.17, over: 0.3 }, share: 0.5, shareSd: 0.14, dunkShare: 0.92,
  rate: { fga: 0.689, tpa: 0.189, fta: 0.064, reb: 0.0994, ast: 0.1456, stl: 0.0691, blk: 0.0892, tov: 0.0682, dnk: 0.347, chg: 0.0142 },
  pct: { fg: 0.644, tp: 0.343, ft: 0.764 }
};
function lgFallback(job, why) {
  const R = lgRng(lgHash(job.key + '|fb')), gauss = () => { let u = 0; for (let i = 0; i < 12; i++) u += R(); return u - 6; };   // unit variance
  const F = makeFmt({}), d = (teamPower(job.stage, job.a) - teamPower(job.stage, job.b)) * 0.012;
  let sa, sb;
  if (F.first21) {
    const tgt = F.target || 21, aWins = R() < clamp(0.5 + d * 2, 0.15, 0.85), win = tgt + (R() < LG_CAL.first21.over ? 1 : 0);
    const lose = clamp(Math.round(tgt * (LG_CAL.first21.lose + gauss() * LG_CAL.first21.loseSd)), 0, tgt - 1);
    sa = aWins ? win : lose; sb = aWins ? lose : win;
  } else {
    const L = LG_CAL.ppm[F.len] ? F.len : 120, mins = F.len * F.periods / 60, mu = LG_CAL.ppm[L] * mins * (F.periods === 4 ? LG_CAL.quartersK : 1);
    const rel = (LG_CAL.rel[L] || 0.25) * Math.sqrt((L * 2 / 60) / mins);   // the spread was measured at 2 periods
    sa = Math.max(2, Math.round(mu * (1 + d + gauss() * rel))); sb = Math.max(2, Math.round(mu * (1 - d + gauss() * rel))); if (sa === sb) sa += 2;
  }
  const pois = lam => { if (!(lam > 0)) return 0; const L = Math.exp(-lam); let k = 0, q = 1; do { k++; q *= R(); } while (q > L && k < 200); return k - 1; };   // counts vary like real ones
  const binom = (n, pr) => { let k = 0; for (let i = 0; i < n; i++) if (R() < pr) k++; return k; };
  const lines = (t, pts) => {
    const P = teamOf(job.stage, t).players, n = P.length, out = P.map(pd => ({ n: pd.name, pf: 0 }));
    const split = () => { if (n < 2) return [1]; const k = clamp(LG_CAL.share + gauss() * LG_CAL.shareSd, 0.05, 0.95); return [k, 1 - k]; };
    for (const k of ['reb', 'ast', 'stl', 'blk', 'tov', 'chg']) { const sp = split(); out.forEach((o, i) => { o[k] = pois(pts * LG_CAL.rate[k] * sp[i]); }); }
    const ps = split(); let left = pts;
    out.forEach((o, i) => {
      const p = i === n - 1 ? left : Math.round(pts * ps[i]); left -= p;
      o.tpa = pois(p * LG_CAL.rate.tpa); o.tpm = Math.min(Math.floor(p / 3), binom(o.tpa, LG_CAL.pct.tp));
      o.fta = pois(p * LG_CAL.rate.fta); o.ftm = Math.min(p - 3 * o.tpm, binom(o.fta, LG_CAL.pct.ft));
      let rem = p - 3 * o.tpm - o.ftm;
      if (rem % 2) { if (o.tpm > 0) { o.tpm--; rem += 3; } else if (rem >= 3) { o.tpm++; o.tpa = Math.max(o.tpa, o.tpm); rem -= 3; } else { o.ftm++; rem--; } }   // odd: a three more or less, rarely a free throw
      const two = rem / 2; o.fta = Math.max(o.fta, o.ftm); o.tpa = Math.max(o.tpa, o.tpm);
      o.fgm = two + o.tpm; o.fga = Math.max(o.tpa, o.fgm + pois(o.fgm * (1 / LG_CAL.pct.fg - 1)));
      o.dnk = clamp(Math.round(two * LG_CAL.dunkShare + gauss() * 0.9), 0, two); o.pts = p;   // made shots add up to the points exactly
    });
    return out;
  };
  return { sa, sb, ra: lines(job.a, sa), rb: lines(job.b, sb), fb: why || 'fallback' };
}

// ---------------------------------------------------------------- scheduling
function lgPlayNow(job, capMs) {        // play a game to the end in one go (no frame in between), within the caps
  if (LEAGUE.cache[job.key]) return LEAGUE.cache[job.key];
  let S = LEAGUE.cur && LEAGUE.cur.job.key === job.key ? LEAGUE.cur : null;
  if (LEAGUE.mode === 'fallback') return lgFinish(job, lgFallback(job, 'fixture'));
  if (!S) { if (LEAGUE.cur) LEAGUE.cur = null; S = lgBegin(job); }
  while (!(S.result || S.fail)) lgSlice(S, 50);
  return lgDone(S);
}
function lgDone(S) {
  if (LEAGUE.cur === S) LEAGUE.cur = null;
  LEAGUE.sims++; LEAGUE.simMs += S.ms; LEAGUE.simSteps += S.steps;
  if (S.result) { let r = S.result; if (r.sa === r.sb) r = Object.assign({}, r, { sa: r.sa + 2 }); return lgFinish(S.job, r); }   // a headless game never ends tied; belt and braces
  return lgFinish(S.job, lgFallback(S.job, S.fail));
}
function lgFinish(job, r) {
  if (r.fb && r.fb !== 'fixture') { LEAGUE.fallbacks++; LEAGUE.log.push({ key: job.key, why: r.fb }); if (LEAGUE.log.length > 50) LEAGUE.log.shift(); try { console.warn('league: fallback for', job.key, r.fb); } catch (e) {} }
  return (LEAGUE.cache[job.key] = Object.assign({ round: job.round }, r));
}
// work for `ms` on the next game in `jobs` (continuing the one in progress); returns the number of games left
function lgWork(jobs, ms) {
  const t0 = performance.now(), left = () => jobs.filter(j => !LEAGUE.cache[j.key]);
  while (performance.now() - t0 < ms) {
    const todo = left(); if (!todo.length) return 0;
    if (LEAGUE.mode === 'fallback') { for (const j of todo) lgFinish(j, lgFallback(j, 'fixture')); return 0; }
    let S = LEAGUE.cur;
    if (S && !todo.some(j => j.key === S.job.key)) { S = LEAGUE.cur = null; }
    if (!S) S = LEAGUE.cur = lgBegin(todo[0]);
    if (!(S.result || S.fail)) lgSlice(S, Math.max(1, ms - (performance.now() - t0)));
    if (S.result || S.fail) lgDone(S);
  }
  return left().length;
}
// the other games of the round being played now (they don't depend on our result)
function lgRoundJobs() {
  const b = C && C.bracket; if (!b || b.out || b.champ || C.seasonOver) return [];
  let games;
  if (b.fmt === 'pool') games = b.round === 0 ? b.pg.flat().filter(g => g.md === Math.min(2, b.md)) : (b.rounds[b.round - 1] || []);
  else games = b.rounds[b.round] || [];
  return games.filter(g => g.a !== 0 && g.b !== 0 && g.w == null).map(g => lgJob(b, g));
}
// everything recordCareerResult will play for this result, in order: a dry run of the bracket logic on a copy, with
// every game that has no result yet reported (and given a provisional fallback result so the logic can go on)
function lgNeeds(won, us, them) {
  const keepB = C.bracket, keepDiv = C.divChamps, keepSim = simCareerMatch, need = [];
  C.bracket = JSON.parse(JSON.stringify(keepB)); C.divChamps = Object.assign({}, keepDiv);
  simCareerMatch = function (m) {
    const b = C.bracket, j = lgJob(b, m), r = LEAGUE.cache[j.key] || (need.push(j), lgFallback(j, 'provisional'));
    m.sa = r.sa; m.sb = r.sb; m.w = r.sa > r.sb ? m.a : m.b;
  };
  try { LEAGUE._rc(won, us, them); } finally { simCareerMatch = keepSim; C.bracket = keepB; C.divChamps = keepDiv; }
  return need;
}
// the next game to play is always the first one the dry run reports (it can't depend on a provisional result)
function lgResolve(won, us, them, budgetMs) {
  const t0 = performance.now();
  for (let k = 0; k < 40; k++) {
    const need = lgNeeds(won, us, them); if (!need.length) return 0;
    if (budgetMs == null) { lgPlayNow(need[0]); continue; }
    const rest = budgetMs - (performance.now() - t0); if (rest <= 0) return need.length;
    lgWork([need[0]], rest);
  }
  return lgNeeds(won, us, them).length;
}

// ---------------------------------------------------------------- the record (save v5): per stage run, per player
// C.lg = { v: 1, runs: [{ s, st, att, p: { pid: { n, t, ti, g, s: [LG_KEYS totals] } } }], box: { s, st, att, games: [...] } }
// pids: 'me' (you), 'mate:<partner id>' (your teammate), '<name>@<team>' for everyone else.
function lgEnsure() { if (!C) return null; if (!C.lg || typeof C.lg !== 'object') C.lg = { v: 1, runs: [], box: null }; C.lg.runs = C.lg.runs || []; return C.lg; }
function lgRunRec(R = lgRun()) {
  const L = lgEnsure(); let r = L.runs.find(x => x.s === R.s && x.st === R.st);
  if (r && r.att !== R.att) { r.att = R.att; r.p = {}; }                    // a retried stage replaces the attempt it retried
  if (!r) { r = { s: R.s, st: R.st, att: R.att, p: {} }; L.runs.push(r); }
  if (!L.box || L.box.s !== R.s || L.box.st !== R.st || L.box.att !== R.att) L.box = { s: R.s, st: R.st, att: R.att, games: [] };
  return r;
}
function lgAddLine(run, pid, line, team, ti) {
  const e = run.p[pid] || (run.p[pid] = { n: line.n, t: team, ti, g: 0, s: LG_KEYS.map(() => 0) });
  e.n = line.n; e.g++; LG_KEYS.forEach((k, i) => { e.s[i] += +line[k] || 0; });
}
function lgPid(ti, line, k, mine) { return ti === 0 && mine ? (k === 'me' ? 'me' : 'mate:' + (C.partner || 'saleem')) : line.n + '@' + teamOf(C.stage, ti).name; }
function lgRecordGame(m, r, key) {
  const run = lgRunRec();
  [[m.a, r.ra], [m.b, r.rb]].forEach(([ti, rows]) => rows.forEach(line => lgAddLine(run, lgPid(ti, line), line, teamOf(C.stage, ti).name, ti)));
  const cut = rows => rows.map(x => [x.n, x.pts, x.reb, x.ast, x.stl, x.blk, x.fgm, x.fga, x.tpm, x.tpa, x.ftm, x.fta, x.tov, x.pf || 0, x.dnk, x.chg]);
  C.lg.box.games.push({ k: key, r: r.round || '', a: m.a, b: m.b, sa: r.sa, sb: r.sb, ra: cut(r.ra), rb: cut(r.rb), fb: r.fb ? 1 : 0 });
}
// our own game: both teams' lines, the same record shape
function lgRecordOurs(ctx) {
  const run = lgRunRec(ctx.run);
  ctx.ours.forEach(line => lgAddLine(run, line.pid, line, 'Masjid Al-Amanah', 0));
  ctx.theirs.forEach(line => lgAddLine(run, line.n + '@' + ctx.oppName, line, ctx.oppName, ctx.oppId));
}

// ---------------------------------------------------------------- wiring
{
  // charges: the engine already fires AchEvents.charge for the defender who draws one; count it as a stat
  const _ch = AchEvents.charge;
  AchEvents.charge = function (o) { if (o && o.stats) o.stats.chg = (o.stats.chg || 0) + 1; return _ch.apply(this, arguments); };
  // a basket can count without a credited shooter (a loose ball that drops in, a tip by a teammate): the team's points
  // and its players' points then differ. The league's lines give those points to the scoring team's player who touched
  // the ball last (or the one nearest the rim), in a separate stat (xpts), so live games, rewards and the stats book
  // are unchanged and a league box score always adds up to the score.
  const _os = onScore;
  onScore = function (h) {
    if (!M.teams || M.mini || (M.practice && M.practice.kind !== '1v1')) return _os.apply(this, arguments);
    const before = M.teams.map(t => t.score), pb = M.players.map(p => (p.stats.pts || 0) + (p.stats.xpts || 0));
    const r = _os.apply(this, arguments);
    for (const t of [0, 1]) {
      const d = M.teams[t].score - before[t]; if (d <= 0) continue;
      const got = M.players.reduce((a, p, i) => a + (p.team === t ? (p.stats.pts || 0) + (p.stats.xpts || 0) - pb[i] : 0), 0);
      if (got >= d) continue;
      const lt = ball.lastTouch, mine = M.teams[t].players, who = lt && lt.team === t ? lt : mine.slice().sort((a, b) => dxz(a, h) - dxz(b, h))[0];
      if (who) who.stats.xpts = (who.stats.xpts || 0) + d - got;
    }
    return r;
  };
  // the other games: real results (played now if nobody played them yet), recorded as they are applied
  simCareerMatch = function (m) {
    const b = C.bracket, j = lgJob(b, m), r = LEAGUE.cache[j.key] || lgPlayNow(j);
    m.sa = r.sa; m.sb = r.sb; m.w = r.sa > r.sb ? m.a : m.b;
    lgRecordGame(m, r, j.key); delete LEAGUE.cache[j.key];
  };
  // our result: everything it needs is played first (usually already done on the Around the league screen)
  const _rc = LEAGUE._rc = recordCareerResult;   // lgNeeds dry-runs this one (the bracket logic), not the wrapper
  recordCareerResult = function (won, us, them) { if (LEAGUE.mode === 'real') lgResolve(won, us, them, null); return _rc.apply(this, arguments); };
  // our game's lines go into the same record
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    let ctx = null;
    try {
      const me = M.players.find(p => p.human === 0), T0 = M.teams[0].players, T1 = M.teams[1].players;
      if (me) ctx = { run: lgRun(), oppId: M.careerOpp, oppName: M.teamDefs[1].name,
        ours: T0.map(p => Object.assign(lgLine(p), { pid: p === me ? 'me' : 'mate:' + (C.partner || 'saleem') })), theirs: T1.map(lgLine) };
    } catch (e) { ctx = null; }
    const r = _cam.apply(this, arguments);
    if (ctx) { lgRecordOurs(ctx); saveCareer(); }
    return r;
  };
  // save v5: the league record starts empty; old saves get leaderboards from their next game
  const _fc = freshCareer;
  freshCareer = function () { const c = _fc.apply(this, arguments); c.lg = { v: 1, runs: [], box: null }; c.sv = Math.max(c.sv || 0, 5); return c; };
  const _lc = loadCareer;
  loadCareer = function () { const r = _lc.apply(this, arguments); if (r && C) { if ((C.sv || 0) < 5 || !C.lg) { C.lg = { v: 1, runs: [], box: null }; } C.sv = Math.max(C.sv || 0, 5); } return r; };
}
// ---------------------------------------------------------------- the background and the Around the league screen
// one step of the wait: work within the budget, the hard cap, and on to the post-game screen when nothing is left
function lgWaitStep(W8) {
  if (Game.screen !== 'cleague') return;
  const left = lgResolve(W8.won, W8.us, W8.them, LEAGUE.waitMs);
  W8.done = Math.max(W8.done, W8.total - left);
  if (left && performance.now() - W8.t0 > LEAGUE.waitCapMs) {          // the hard cap: whatever is left gets the fallback
    for (let k = 0; k < 40; k++) { const need = lgNeeds(W8.won, W8.us, W8.them); if (!need.length) break; LEAGUE.cur = null; lgFinish(need[0], lgFallback(need[0], 'over the ' + LEAGUE.waitCapMs + ' ms wait cap')); }
  }
  if (!lgNeeds(W8.won, W8.us, W8.them).length) { Game.lgWait = null; Game.screen = 'final'; W8.go(); }
}
const LG_CALM = new Set(['hub', 'postgame', 'cstats', 'cgoals', 'crecords', 'csummary', 'journal', 'office', 'musalla', 'masjid', 'shop', 'train', 'saves', 'scout', 'pregame', 'cbracket', 'ccal', 'story', 'final']);
function lgIdle() {
  if (!C || LEAGUE.mode !== 'real' || M.online || Net.role || !LG_CALM.has(Game.screen) || Game.screen === 'final' && !M.career) return;
  if (document.hidden) return;
  const jobs = lgRoundJobs(); if (jobs.length) lgWork(jobs, LEAGUE.idleMs);
}
{
  // the frame: background work on calm screens; on the Around the league screen most of each frame goes to the league
  // games and the screen is drawn five times a second (a progress bar needs no more)
  const _frame = frame;
  frame = function (now) {
    if (Game.screen === 'cleague' && Game.lgWait) {
      const W8 = Game.lgWait; try { lgWaitStep(W8); } catch (e) { LEAGUE.cur = null; }
      if (Game.screen === 'cleague' && now - (W8.drawn || 0) < 200) { requestAnimationFrame(frame); return; }
      W8.drawn = now;
    } else { try { lgIdle(); } catch (e) { LEAGUE.cur = null; } }
    return _frame.apply(this, arguments);
  };
  // the Around the league screen draws no court behind it (its frames go to the league games)
  const _ds = drawScene;
  drawScene = function (g) { if (Game.screen === 'cleague') { g.fillStyle = '#0a0f1a'; g.fillRect(-400, -400, W + 800, H + 800); return; } return _ds.apply(this, arguments); };
  // after our game: the Around the league screen until the round (and anything our result decides) is played
  const _fc = finalContinue;
  finalContinue = function () {
    if (!M.career || LEAGUE.mode !== 'real' || M.league) return _fc.apply(this, arguments);
    const won = M.winner === 0, us = M.teams[0].score, them = M.teams[1].score;
    if (!lgNeeds(won, us, them).length) return _fc.apply(this, arguments);
    Game.lgWait = { won, us, them, t0: performance.now(), done: 0, total: lgNeeds(won, us, them).length, go: _fc };
    Game.screen = 'cleague';
  };
  CAREER_SCREENS.add('cleague');
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen !== 'cleague') return _cu.apply(this, arguments);
    const W8 = Game.lgWait; if (!W8) { Game.screen = 'final'; return; }
    lgWaitStep(W8);
  };
  const _cr = careerRender;
  careerRender = function (g) {
    if (Game.screen !== 'cleague') return _cr.apply(this, arguments);
    const W8 = Game.lgWait || { done: 0, total: 1 }, k = clamp(W8.done / Math.max(1, W8.total), 0, 1);
    dim(g, 0.82); panel(g, W / 2 - 220, 190, 440, 150, true);
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText('Around the league…', W / 2, 236);
    g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, W / 2 - 170, 262, 340, 14, 7); g.fill();
    g.fillStyle = GOLD; roundRect(g, W / 2 - 170, 262, Math.max(14, 340 * (k * 0.9 + 0.1 * ((Game.t * 0.6) % 1))), 14, 7); g.fill();
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(W8.done + ' of ' + W8.total + ' games played', W / 2, 310);
  };
}

// ---------------------------------------------------------------- reading the record
const LG_CATS = [['ppg', 'PPG', 'pts'], ['apg', 'APG', 'ast'], ['rpg', 'RPG', 'reb'], ['spg', 'SPG', 'stl'], ['bpg', 'BPG', 'blk'],
  ['fg', 'FG%', 'fgm', 'fga', 2], ['tp', '3P%', 'tpm', 'tpa', 1], ['ft', 'FT%', 'ftm', 'fta', 0.5], ['dpg', 'DPG', 'dnk']];   // [id, label, stat, attempts, min attempts per game]
const LG_FILTERS = [['stage', 'Stage'], ['season', 'Season'], ['career', 'Career']];
const LG_MIN_GP = { stage: 2, season: 4, career: 8 };                    // games needed to qualify for a percentage
const LG_VIEWS = [['season', 'My stats'], ['career', 'Career'], ['leaders', 'Leaders'], ['league', 'Around the league']];
const lgIdx = k => LG_KEYS.indexOf(k);
function lgRunsFor(filter) {
  const L = lgEnsure(); if (!L) return [];
  const s = C.season || 1, st = C.stage;
  if (filter === 'stage') { const cur = L.runs.filter(r => r.s === s && r.st === st && Object.keys(r.p).length); return cur.length ? cur : L.runs.slice(-1); }   // the run in progress, or the last one
  if (filter === 'season') return L.runs.filter(r => r.s === s);
  return L.runs;
}
// every player in the filter: games and totals summed over the runs (a player is the same pid in every run)
function lgPlayers(filter) {
  const out = {};
  for (const r of lgRunsFor(filter)) for (const [pid, e] of Object.entries(r.p)) {
    const o = out[pid] || (out[pid] = { pid, n: e.n, t: e.t, ti: e.ti, g: 0, s: LG_KEYS.map(() => 0), stages: {} });
    o.n = e.n; o.t = e.t; o.ti = e.ti; o.g += e.g; e.s.forEach((v, i) => { o.s[i] += v; });
    const sp = o.stages[r.st] || (o.stages[r.st] = { g: 0, s: LG_KEYS.map(() => 0) }); sp.g += e.g; e.s.forEach((v, i) => { sp.s[i] += v; });
  }
  return out;
}
function lgVal(p, cat) {
  const c = LG_CATS.find(x => x[0] === cat); if (!p || !p.g) return null;
  if (c[3]) { const a = p.s[lgIdx(c[3])]; return a ? p.s[lgIdx(c[2])] / a : null; }
  return p.s[lgIdx(c[2])] / p.g;
}
function lgQualifies(p, cat, filter) {
  const c = LG_CATS.find(x => x[0] === cat); if (!p.g) return false;
  if (!c[3]) return true;
  return p.g >= LG_MIN_GP[filter] && p.s[lgIdx(c[3])] >= c[4] * p.g;
}
function lgFmt(v, cat) { if (v == null) return '–'; const c = LG_CATS.find(x => x[0] === cat); return c[3] ? Math.round(v * 1000) / 10 + '%' : v.toFixed(1); }
// the board: everyone who qualifies, best first (ties: more games, then name); ranks are positions
function lgBoard(filter, cat) {
  const P = Object.values(lgPlayers(filter)).filter(p => lgQualifies(p, cat, filter)).map(p => ({ p, v: lgVal(p, cat) })).filter(x => x.v != null);
  P.sort((a, b) => b.v - a.v || b.p.g - a.p.g || (a.p.n < b.p.n ? -1 : a.p.n > b.p.n ? 1 : 0) || (a.p.pid < b.p.pid ? -1 : 1));
  P.forEach((x, i) => { x.rank = i + 1; });
  return P;
}
function lgMinesFor() { return ['me', 'mate:' + (C.partner || 'saleem')]; }
function lgShortTeam(t) { return String(t || '').replace('Masjid ', ''); }

// ---------------------------------------------------------------- the stats screen: tabs, leaders, around the league, a player
function lgTT(g) { return Input.touchMode && g === ctx; }
function lgLeftX(g) { return 112; }                                         // the Back button sits top left
BACK.cstats = () => { const S = Game.stats; if (!S) return careerHub(); if (S.view === 'box') S.view = S.boxFrom || 'season'; else if (S.view === 'player') S.view = S.back || 'leaders'; else careerHub(); };
function lgRowH(g) { return lgTT(g) ? 64 : 40; }                         // 64 units is at least 44 CSS px on the phone sizes
function lgTabs(g, S) {
  if (S.view === 'season' || S.view === 'career') S.boxFrom = null;
  const TT = lgTT(g), h = TT ? 44 : 30, y = TT ? 26 : 36; g.font = `13px ${FONT}`;
  const ws = LG_VIEWS.map(([, l]) => Math.ceil(g.measureText(l).width) + 28), tot = ws.reduce((a, b) => a + b, 0) + 6 * (ws.length - 1);
  let x = 912 - tot; const x0 = x;
  LG_VIEWS.forEach(([k, l], i) => {
    const on = S.view === k || (k === 'leaders' && S.view === 'player'), w = ws[i];
    g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, x, y, w, h, h / 2); g.fill();
    g.textAlign = 'center'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.fillText(l, x + w / 2, y + h / 2 + 5);
    addRect(x, TT ? 6 : y, w, TT ? 66 : h, () => { S.view = k; S.sel = 0; S.scroll = 0; SFX.blip(); });
    x += w + 6;
  });
  return x0;
}
function drawLeague(g, S, tabX) {
  if (S.view === 'player') return lgDrawPlayer(g, S, tabX);
  if (S.view === 'league') return lgDrawAround(g, S, tabX);
  return lgDrawLeaders(g, S, tabX);
}
function lgPills(g, items, y, h, onOf, act, split) {                    // a row of equal pills across the panel (a wider gap after `split`)
  const n = items.length, gap = 6, extra = split ? 10 : 0, w = (864 - gap * (n - 1) - extra) / n;
  items.forEach((it, i) => {
    const x = 48 + i * (w + gap) + (split && i >= split ? extra : 0), on = onOf(it, i);
    g.fillStyle = on ? 'rgba(232,195,90,0.92)' : 'rgba(255,255,255,0.08)'; roundRect(g, x, y, w, h, 10); g.fill();
    g.textAlign = 'center'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.fillText(fitText(g, it[1], w - 10), x + w / 2, y + h / 2 + 5);
    addRect(x, y, w, h, () => act(it, i));
  });
}
function lgDrawLeaders(g, S, tabX) {
  const TT = lgTT(g), RH = lgRowH(g), cat = S.cat || 'ppg', filter = S.filter || 'stage', mines = lgMinesFor();
  const y0 = TT ? 78 : 80;
  // one row: the nine categories, then the filter (this stage / this season / my career)
  const pills = [...LG_CATS.map(c => ['c', c[1], c[0]]), ...LG_FILTERS.map(f => ['f', f[1], f[0]])];
  lgPills(g, pills, y0, RH, it => it[0] === 'c' ? it[2] === cat : it[2] === filter, it => { if (it[0] === 'c') S.cat = it[2]; else S.filter = it[2]; S.sel = 0; SFX.blip(); }, LG_CATS.length);
  const B = lgBoard(filter, cat), top = B.slice(0, 10), ty = y0 + RH + 6, cw = (864 - 12) / 2;
  // the title row: you and your teammate, with your ranks in this category (tap for the player page)
  { const fy = TT ? 26 : 36, fh = TT ? 44 : 30; let fx = lgLeftX(g);
    for (const pid of lgMinesFor()) { const e = B.find(x => x.p.pid === pid); if (!e) continue;
      g.font = `13px ${FONT}`; const t = (pid === 'me' ? 'You' : e.p.n) + '  #' + e.rank + '  ' + lgFmt(e.v, cat), w = Math.min(Math.ceil(g.measureText(t).width) + 28, (tabX - 10 - lgLeftX(g)) / 2 - 4);
      if (fx + w > tabX - 10) break;
      g.fillStyle = 'rgba(232,195,90,0.22)'; roundRect(g, fx, fy, w, fh, fh / 2); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.8)'; g.lineWidth = 1.2; g.stroke();
      g.textAlign = 'center'; g.fillStyle = GOLD; g.fillText(fitText(g, t, w - 16), fx + w / 2, fy + fh / 2 + 5);
      addRect(fx, TT ? 6 : fy, w, TT ? 66 : fh, () => { S.pid = pid; S.back = 'leaders'; S.view = 'player'; SFX.blip(); }); fx += w + 8; } }
  if (!B.length) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText(lgPlayersCount(filter) ? 'Nobody qualifies yet (' + LG_MIN_GP[filter] + ' games for a percentage).' : 'No league games yet. Play a game day and the whole bracket plays too.', W / 2, ty + 60); return; }
  const cell = (x, y, e, rh) => {
    const mine = mines.includes(e.p.pid), on = S.sel === e.rank - 1, RH = rh;
    g.fillStyle = mine ? 'rgba(232,195,90,0.22)' : on ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'; roundRect(g, x, y, cw, RH - 2, 10); g.fill();
    if (mine) { g.strokeStyle = 'rgba(232,195,90,0.85)'; g.lineWidth = 1.5; g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = mine ? GOLD : '#9fb3c8'; g.font = `14px ${FONT}`; g.fillText('#' + e.rank, x + 12, y + (TT ? 26 : 25));
    const nx = x + 62, vx = x + cw - 12; g.font = `13px ${FONT}`; const val = lgFmt(e.v, cat), vw = g.measureText(val).width;
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(val, vx, y + (TT ? 26 : 25));
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `14px ${BODY}`;
    const team = lgShortTeam(e.p.t) + '  •  ' + e.p.g + ' g';
    if (TT) { g.fillText(fitText(g, e.p.n, vx - vw - 12 - nx), nx, y + 26); g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(fitText(g, team, cw - 74), nx, y + 50); }
    else { const nw = Math.min(g.measureText(e.p.n).width, 170); g.fillText(fitText(g, e.p.n, 170), nx, y + 25); g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(fitText(g, team, vx - vw - 16 - (nx + nw + 12)), nx + nw + 12, y + 25); }
    addRect(x, y, cw, RH - 2, () => { S.sel = e.rank - 1; S.pid = e.p.pid; S.back = 'leaders'; S.view = 'player'; SFX.blip(); });
  };
  const LH = TT ? 66 : RH;                                                 // rows: 64 units tall on phones (44 CSS px)
  top.forEach((e, i) => cell(48 + (i >= 5 ? cw + 12 : 0), ty + (i % 5) * LH, e, LH));
  if (!TT) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Percentages: at least ' + LG_MIN_GP[filter] + ' games and enough attempts a game  •  ← → category  •  F filter  •  Tab view', W / 2, 508); }
}
function lgPlayersCount(filter) { return Object.keys(lgPlayers(filter)).length; }
function lgRoundsNow() {                                                // this stage run's games, by round: league games and ours
  const L = lgEnsure(), out = new Map(), add = (r, x) => { if (!out.has(r)) out.set(r, []); out.get(r).push(x); };
  const R = L && L.box ? L.box : null; if (!R) return out;
  const tn = i => teamOf(R.st, i).name, row = a => ({ n: a[0], pts: a[1], reb: a[2], ast: a[3], stl: a[4], blk: a[5], fgm: a[6], fga: a[7], tpm: a[8], tpa: a[9], ftm: a[10], fta: a[11], tov: a[12], pf: a[13] });
  const ours = (C.games || []).filter(x => x.s === R.s && x.st === R.st);
  const order = []; for (const gm of R.games) if (!order.includes(gm.r)) order.push(gm.r); for (const x of ours) if (!order.includes(x.r)) order.push(x.r);
  for (const r of order) {
    for (const x of ours.filter(q => q.r === r)) add(r, { an: 'Masjid Al-Amanah', bn: x.opp, sa: x.us, sb: x.them, mine: true, box: x });
    for (const gm of R.games.filter(q => q.r === r)) add(r, { an: tn(gm.a), bn: tn(gm.b), sa: gm.sa, sb: gm.sb, box: { s: R.s, st: R.st, r, an: tn(gm.a), opp: tn(gm.b), us: gm.sa, them: gm.sb, a: gm.ra.map(row), o: gm.rb.map(row) } });
  }
  return out;
}
function lgDrawAround(g, S, tabX) {
  const TT = lgTT(g), RH = lgRowH(g), rounds = lgRoundsNow(), names = [...rounds.keys()];
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `20px ${FONT}`; g.fillText(fitText(g, STAGES[(C.lg.box || { st: C.stage }).st].name + ' • Season ' + (C.season || 1), tabX - 14 - lgLeftX(g)), lgLeftX(g), TT ? 56 : 58);
  if (!names.length) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('No games played in this stage yet.', W / 2, 200); return; }
  if (S.round == null || !rounds.has(S.round)) S.round = names[names.length - 1];
  const y0 = TT ? 78 : 80;
  lgPills(g, names.map(n => [n, n.replace('Group game ', 'Group ')]), y0, RH, it => it[0] === S.round, it => { S.round = it[0]; SFX.blip(); });
  const games = rounds.get(S.round), cw = (864 - 12) / 2, gh = TT ? 72 : 52;
  games.forEach((x, i) => {
    const cx = 48 + (i % 2) * (cw + 12), cy = y0 + RH + 12 + Math.floor(i / 2) * (gh + 8), aw = x.sa > x.sb;
    g.fillStyle = x.mine ? 'rgba(232,195,90,0.18)' : 'rgba(255,255,255,0.06)'; roundRect(g, cx, cy, cw, gh, 12); g.fill();
    const line = (y, name, pts, win) => { g.textAlign = 'left'; g.fillStyle = win ? '#fff' : '#9fb3c8'; g.font = `14px ${win ? FONT : BODY}`; g.fillText(fitText(g, lgShortTeam(name), cw - 90), cx + 14, y);
      g.textAlign = 'right'; g.font = `15px ${FONT}`; g.fillStyle = win ? GOLD : '#9fb3c8'; g.fillText(String(pts), cx + cw - 14, y); };
    line(cy + (TT ? 30 : 22), x.an, x.sa, aw); line(cy + (TT ? 58 : 42), x.bn, x.sb, !aw);
    addRect(cx, cy, cw, gh, () => { S.box = x.box; S.boxFrom = 'league'; S.view = 'box'; SFX.blip(); });
  });
  if (!TT) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Tap a game for its box score  •  ← → round  •  Tab view', W / 2, 508); }
}
function lgArch(p) {
  if (p.pid === 'me') return PLAY_STYLE_TXT[C.look.style || 0];
  try { const T = teamOf(C.stage, p.ti), d = (T.players || []).find(q => q.name === p.n) || (p.pid.startsWith('mate:') ? castDef(p.pid.slice(5)) : null);
    if (d && d.stats && typeof archetypeOf === 'function') { const a = archetypeOf(d.stats); return ARCHETYPES[a] ? ARCHETYPES[a].label.charAt(0) + ARCHETYPES[a].label.slice(1).toLowerCase() : ''; } } catch (e) {}
  return '';
}
function lgDrawPlayer(g, S, tabX) {
  const TT = lgTT(g), filter = S.filter || 'stage', all = lgPlayers('career'), p = all[S.pid] || lgPlayers(filter)[S.pid];
  if (!p) { S.view = 'leaders'; return; }
  const mine = lgMinesFor().includes(S.pid), pg = k => p.g ? (p.s[lgIdx(k)] / p.g).toFixed(1) : '0.0', pc = (m, a) => p.s[lgIdx(a)] ? Math.round(100 * p.s[lgIdx(m)] / p.s[lgIdx(a)]) + '%' : '–';
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText(fitText(g, p.n, tabX - 14 - lgLeftX(g)), lgLeftX(g), TT ? 56 : 58);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; const sub = [lgShortTeam(p.t), lgArch(p), p.g + ' league games (career)'].filter(Boolean).join('  •  ');
  g.fillText(fitText(g, sub, 400), 56, TT ? 96 : 92);
  const tiles = [['PPG', pg('pts')], ['RPG', pg('reb')], ['APG', pg('ast')], ['SPG', pg('stl')], ['BPG', pg('blk')], ['DPG', pg('dnk')], ['FG%', pc('fgm', 'fga')], ['3P%', pc('tpm', 'tpa')], ['FT%', pc('ftm', 'fta')], ['TOV', pg('tov')]];
  const ty = TT ? 112 : 106, th = TT ? 62 : 54;
  tiles.forEach(([l, v], i) => { const x = 56 + (i % 5) * 80, y = ty + Math.floor(i / 5) * (th + 6); g.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(g, x, y, 74, th, 8); g.fill();
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `10px ${FONT}`; g.fillText(l, x + 37, y + (TT ? 20 : 17)); g.fillStyle = '#fff'; g.font = `16px ${FONT}`; g.fillText(v, x + 37, y + (TT ? 48 : 40)); });
  const s = k => p.s[lgIdx(k)], totY = ty + 2 * (th + 6) + (TT ? 26 : 20);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('TOTALS', 56, totY);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`;
  wrapTextLeft(g, s('pts') + ' pts, ' + s('reb') + ' reb, ' + s('ast') + ' ast, ' + s('stl') + ' stl, ' + s('blk') + ' blk, ' + s('dnk') + ' dunks, ' + s('chg') + ' charges drawn, ' + s('tov') + ' tov. FG ' + s('fgm') + '/' + s('fga') + ', 3P ' + s('tpm') + '/' + s('tpa') + ', FT ' + s('ftm') + '/' + s('fta') + '.', 56, totY + (TT ? 26 : 22), 390, TT ? 24 : 19);
  // right: by stage; and for your players, by season and the last 5 games
  const rx = 476, lh = TT ? 26 : 22; let y = TT ? 112 : 104;
  const head = (t, cols) => { g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText(t, rx, y); if (cols) { g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`; cols.forEach(([c, x]) => { g.textAlign = 'right'; g.fillText(c, x, y); }); } y += lh; };
  const COLS = TT ? [['GP', 632], ['PPG', 706], ['RPG', 776], ['APG', 842], ['FG%', 912]] : [['GP', 690], ['PPG', 750], ['RPG', 805], ['APG', 858], ['FG%', 912]];
  const row = (label, gp, t) => { g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `13px ${BODY}`; g.fillText(fitText(g, label, (TT ? 600 : 660) - rx), rx, y);
    const v = [gp, gp ? (t.pts / gp).toFixed(1) : '–', gp ? (t.reb / gp).toFixed(1) : '–', gp ? (t.ast / gp).toFixed(1) : '–', t.fga ? Math.round(100 * t.fgm / t.fga) + '%' : '–'];
    g.fillStyle = IVORY; v.forEach((x, i) => { g.textAlign = 'right'; g.fillText(String(x), COLS[i][1], y); }); y += lh; };
  const tot = (arr) => { const o = {}; LG_KEYS.forEach((k, i) => { o[k] = arr[i]; }); return o; };
  head(TT ? 'BY STAGE' : 'LEAGUE, BY STAGE', COLS.map(c => [c[0], c[1]]));
  Object.keys(p.stages).map(Number).sort().forEach(st => row(STAGES[st].name, p.stages[st].g, tot(p.stages[st].s)));
  if (mine) {
    const name = S.pid === 'me' ? null : (castDef(S.pid.slice(5)) || {}).name, games = (C.games || []).filter(x => S.pid === 'me' || x.partner === S.pid.slice(5));
    const lineOf = x => S.pid === 'me' ? x.a[0] : x.a.find(r => r.n === name) || x.a[1];
    const seasons = [...new Set(games.map(x => x.s))].sort((a, b) => a - b).slice(-3);
    if (seasons.length) { y += 6; head('YOUR GAMES, BY SEASON', null); for (const sn of seasons) { const rows = games.filter(x => x.s === sn).map(lineOf).filter(Boolean); row('Season ' + sn, rows.length, statLine(rows)); } }
    const last = games.slice(-5).reverse();
    if (last.length) { y += 6; head('LAST 5 GAMES', null); for (const x of last) { const r = lineOf(x); if (!r) continue; g.textAlign = 'left'; g.fillStyle = x.w ? '#9dffb0' : '#ffb0b0'; g.font = `13px ${FONT}`; const sc = (x.w ? 'W ' : 'L ') + x.us + '–' + x.them;
      g.fillText(sc, rx, y); g.fillStyle = IVORY; g.font = `12px ${BODY}`; const lx = rx + g.measureText(sc).width + 10; g.fillText(fitText(g, r.pts + ' pts, ' + r.reb + ' reb, ' + r.ast + ' ast  •  vs ' + lgShortTeam(x.opp), 912 - lx), lx, y); y += lh; } }
  }
  if (!TT) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Esc: back to the leaders', W / 2, 508); }
}
function lgStatsUpdate(S) {
  if (S.view === 'player') { if (menuHit('back') || menuHit('ok')) { S.view = S.back || 'leaders'; SFX.blip(); } return; }
  if (S.view === 'leaders') {
    const i = LG_CATS.findIndex(c => c[0] === (S.cat || 'ppg'));
    if (menuHit('left') || menuHit('right')) { S.cat = LG_CATS[(i + (menuHit('left') ? -1 : 1) + LG_CATS.length) % LG_CATS.length][0]; S.sel = 0; SFX.blip(); }
    if (Input.pressed.KeyF) { const f = LG_FILTERS.findIndex(x => x[0] === (S.filter || 'stage')); S.filter = LG_FILTERS[(f + 1) % LG_FILTERS.length][0]; S.sel = 0; SFX.blip(); }
    const B = lgBoard(S.filter || 'stage', S.cat || 'ppg'), n = Math.min(10, B.length);
    if (menuHit('up')) { S.sel = Math.max(0, (S.sel || 0) - 1); SFX.blip(); }
    if (menuHit('down')) { S.sel = Math.min(Math.max(0, n - 1), (S.sel || 0) + 1); SFX.blip(); }
    if (menuHit('ok') && B[S.sel || 0]) { S.pid = B[S.sel || 0].p.pid; S.back = 'leaders'; S.view = 'player'; SFX.blip(); }
  } else if (S.view === 'league') {
    const names = [...lgRoundsNow().keys()], i = names.indexOf(S.round);
    if ((menuHit('left') || menuHit('right')) && names.length) { S.round = names[clamp(i + (menuHit('left') ? -1 : 1), 0, names.length - 1)]; SFX.blip(); }
  }
  if (menuHit('back')) careerHub();
}
