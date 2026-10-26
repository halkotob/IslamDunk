// v9.0 career calendar: page-side helpers shared by tests/run.mjs, tests/phone-audit.mjs and
// scripts/review-calendar.mjs. Evaluate CAL_HELPERS in the page first (it defines window.__cal*).
//   __calFresh()            a new career at the hub (intro done), on its first day
//   __calPlayTo(st, slot)   wins games (a short match flow: start, the result set to a win, careerAfterMatch)
//                           until our next game is stage st, slot slot
//   (v9.7.0: evaluating these helpers puts the league in its fallback mode: no engine time for the other games)
//   __calState(name)        the review states: 'game', 'jumuah', 'ramadan', 'eid', 'break' (returns a short label)
export const CAL_STATES = ['game', 'jumuah', 'ramadan', 'eid', 'break'];
export const CAL_HELPERS = `(() => {
  if (typeof LEAGUE !== 'undefined') LEAGUE.mode = 'fallback';   // v9.7.0: these fixtures only need a bracket; the league tests turn real games on
  window.__calFresh = () => {
    C = freshCareer(); C.name = 'Abdullah'; C.seed = 4242; C.bracket = makeBracket(0);
    Object.assign(C.seen, { intro: true, meetNew: true, stage0: true, stage1: true, stage2: true, stage3: true });
    if (Game.menus) Game.menus.hub = null; careerHub(); return C;
  };
  window.__calWin = () => {                                  // one game on its day, won 30-20 (results go through the real flow)
    const gd = calGameDay(); if (gd == null) return false;
    if (gd > C.cal.d) calSetDay(gd);
    startCareerMatch(); M.teams[0].score = 30; M.teams[1].score = 20; M.winner = 0; M.phase = 'over';
    careerAfterMatch(); Game.screen = 'title'; return true;
  };
  window.__calPlayTo = (st, slot) => { for (let n = 0; n < 40 && !(C.stage === st && calSlot() === slot); n++) if (!window.__calWin()) break; return C.stage === st && calSlot() === slot; };
  window.__calState = name => {
    window.__calFresh();
    if (name === 'game') { window.__calPlayTo(0, 1); calSetDay(calGameDay()); }
    else if (name === 'jumuah') { window.__calPlayTo(0, 2); let d = calGameDay(); while (calWd(d) !== 5) d--; calSetDay(d); }
    else if (name === 'ramadan') { window.__calPlayTo(2, 1); calSetDay(calGameDay() - 1); }
    else if (name === 'eid') { window.__calPlayTo(2, 2); calSetDay(calDayOf(calDate(C.cal.d).y, 9, 1)); }
    else if (name === 'break') { window.__calPlayTo(1, 0); }
    if (Game.menus) Game.menus.hub = null; careerHub(); _achQ.length = 0; Game.toastT = 0;
    return calText(C.cal.d, true) + ', Year ' + calDate(C.cal.d).y + ' (' + calDay(C.cal.d).type + (calDay(C.cal.d).overlay ? ', ' + calDay(C.cal.d).overlay : '') + ')';
  };
})();`;
