// v9.22 career fixtures: page-side helpers shared by tests/run.mjs, tests/league.mjs, tests/phone-audit.mjs and
// scripts/review-league.mjs. Evaluate CAREER_HELPERS in the page first (it defines window.__c*).
//   __cFresh()   a career at the hub with a Local (masjid league) bracket: the bracket fixtures (league, formats)
//   __cWin()     one bracket game won 30-20 (a short match flow: start, the result set to a win, careerAfterMatch)
// (evaluating these helpers puts the league in its fallback mode: no engine time for the other games; the league
// tests turn real games on)
export const CAREER_HELPERS = `(() => {
  if (typeof LEAGUE !== 'undefined') LEAGUE.mode = 'fallback';
  window.__cFresh = () => {
    C = freshCareer(); C.name = 'Abdullah'; C.seed = 4242; C.stage = 0; C.bracket = makeBracket(0);
    C.story.at = 'C2.6'; C.story.cp = 'C2.4';
    if (Game.menus) Game.menus.hub = null; careerHub(); return C;
  };
  window.__cWin = () => {
    if (!C.bracket || C.bracket.out || C.bracket.champ) return false;
    startCareerMatch(); M.teams[0].score = 30; M.teams[1].score = 20; M.winner = 0; M.phase = 'over';
    careerAfterMatch(); Game.screen = 'title'; return true;
  };
})();`;
