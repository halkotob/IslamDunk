// v9.7.0 league fixtures: page-side helpers shared by tests/run.mjs (league-*), tests/phone-audit.mjs and
// scripts/review-league.mjs. Evaluate CAL_HELPERS, then LEAGUE_HELPERS.
//   __lgPlayDay(real)   one game day: our game played to the end by the CPU on both sides (so our lines are real too),
//                       then the normal after-game flow (the rest of the round is played by the league)
//   __lgBuild(days, mode)  a fresh seeded career, `days` game days in LEAGUE.mode `mode` ('real' or 'fallback')
//   __lgDump() / __lgLoad(json)  the career as JSON, and back (so one build can feed many pages)
//   __lgOpen(view, opts)  the stats screen on a view: 'leaders' | 'league' | 'player' | 'box' (opts: cat, filter, pid)
export const LEAGUE_HELPERS = `(() => {
  window.__lgPlayDay = () => {
    const gd = calGameDay(); if (gd == null) return false;
    if (gd > C.cal.d) calSetDay(gd);
    startCareerMatch(); for (let i = 0; i < 8 && Game.screen === 'story'; i++) Game.story.then();
    for (const p of M.players) p.human = -1;
    for (let n = 0; n < 60 * 60 * 30 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; }
    if (M.phase !== 'over') { M.teams[0].score = 30; M.teams[1].score = 20; M.winner = 0; M.phase = 'over'; }
    M.players[1].human = 0; careerAfterMatch(); Game.screen = 'title'; return true;
  };
  window.__lgBuild = (days, mode) => {
    LEAGUE.mode = mode || 'real'; LEAGUE.cache = {}; LEAGUE.cur = null; window.__calFresh();
    for (let d = 0; d < days && !C.bracket.out && !C.done; d++) window.__lgPlayDay();
    return { days, stage: C.stage, games: (C.games || []).length, runs: C.lg.runs.length };
  };
  window.__lgDump = () => JSON.stringify(C);
  window.__lgLoad = j => { C = Object.assign(freshCareer(), JSON.parse(j)); if (Game.menus) Game.menus.hub = null; careerHub(); return true; };
  window.__lgOpen = (view, o = {}) => {
    openStats(); const S = Game.stats; S.view = view; S.cat = o.cat || 'ppg'; S.filter = o.filter || 'stage';
    if (view === 'player') { S.pid = o.pid || 'me'; S.back = 'leaders'; }
    if (view === 'box') { const r = lgRoundsNow(), g = [...r.values()].flat().find(x => !x.mine); S.box = g ? g.box : null; S.boxFrom = 'league'; if (!S.box) S.view = 'league'; }
    _achQ.length = 0; Game.toastT = 0; return true;
  };
})();`;
export const LEAGUE_CASES = [
  ['leaders-ppg', { view: 'leaders', cat: 'ppg' }], ['leaders-fg', { view: 'leaders', cat: 'fg', filter: 'season' }], ['leaders-career', { view: 'leaders', cat: 'dpg', filter: 'career' }],
  ['player-me', { view: 'player', pid: 'me' }], ['player-other', { view: 'player', pid: null }], ['around', { view: 'league' }], ['box', { view: 'box' }]
];
