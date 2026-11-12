// v9.19.2 career difficulty, calibrated by results (tools/diff-report.mjs, tests/difficulty.mjs)
// The CPU's level for each difficulty and stage is its own number, measured with the mixed-play bot at equal ratings
// so that each step costs about the same win rate. Before, one shared ladder (LADDER) was shifted a notch per
// difficulty, and the Medium-to-Hard dials made a cliff: Medium went 60 / 48 / 15 / 13% from Local to World.
// The level is the same scale as before (diffAt: -1 Very easy dials, 0 Easy, 1 Medium, 2 Hard).
//               Local  State  National  World
const CAREER_L = {
  veryeasy: [-1, -1, -1, -1],
  easy:     [-0.9, -0.45, -0.45, -0.05],
  medium:   [-0.6, 0.2, 0.2, 0.55],
  hard:     [0.95, 1.2, 0.95, 0.9]
};
const CAREER_FLOOR = -1;                 // a weak team's tier can take the level down to Very easy's dials
// Hard reads plays and doubles the ball at every stage (it keeps the Hard dials' read and double team; its other
// dials sit lower to pay for it)
function careerOppCfg(L, stage, smart) {
  const o = diffAt(L);
  if (smart == null ? SETTINGS.difficulty === 'hard' : smart) { o.read = 1; o.double = true; }
  return o;
}
const careerLevelsBefore = careerLevels;
careerLevels = (function (base) {
  return function (stage) {
    const row = CAREER_L[SETTINGS.difficulty] || CAREER_L.medium;
    return { opp: row[clamp(stage, 0, row.length - 1)], mate: SETTINGS.difficulty === 'hard' ? base(stage).mate : 1 };   // your teammate plays at Medium (on Easy and Very easy he was made worse too, which made those harder)
  };
})(careerLevels);
// The league's other games (CPU against CPU, both teams on the same dials) keep the old levels, so the league's
// stats and its calibrated fallback (LG_CAL) stay as they were.
lgLevel = function (stage, i) { const lv = careerLevelsBefore(stage); return Math.max(SETTINGS.difficulty === 'veryeasy' ? -1 : 0, lv.opp + (teamOf(stage, i).tier || 0) * 0.2); };
// The Local teams' rating (was 4.6). A new player starts at 4 (3 to 6 by the build) with Sh. Saleem, and one rating
// point is worth about 20 points of win rate, so a Local CPU near 4.9 made the first three games a loss at any
// difficulty (Medium 19%). Later stages are unchanged (5.6, 6.6, 7.5): by State the player has bought levels.
STAGES[0].stat = 2.6;
