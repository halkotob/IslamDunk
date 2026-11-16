// ================================================= v9.22: THE CAREER STORY — play scenes
// A play scene is a real match or mini game with a result. Its outcome (win, loss; out for a run-ending loss) picks the
// next scene. Story exhibitions (the pickup game, lights out, the all-star game) are career matches with no bracket:
// they skip the bracket's after-game chain and come back here (M.story.exhib).
const STORY_HOME = { name: 'Masjid Al-Amanah', short: 'AMANAH', place: 'Eastside', c1: '#2c6e8f', c2: '#f2cf6b', crest: 'arch' };
function storyPlayStart(S) {
  const mode = STORY_MODES[S.mode];
  if (!mode) { toast('This game arrives in the next update.', 3); return careerHub(); }
  mode(S);
}
const STORY_MODES = {
  // C0.5: you and Sh. Saleem against Ammo Jamil and Ilyas, first to 11, the easiest CPU there is
  pickup(S) {
    const us = Object.assign({}, STORY_HOME, { players: [storyMateDef('saleem', 0), playerDef()] });
    const them = { name: 'Ammo Jamil & Ilyas', short: 'JAMIL', place: 'Eastside', c1: '#7a1f2b', c2: '#e8c35a', crest: 'dome', players: [storyMateDef('jamil', 0), storyMateDef('ilyas', 0)] };
    storyExhibition(S, us, them, { L: -1, fmt: { format: 'first21', target: 11 } });
  }
};
// a story match with no bracket. o: L (the CPU level of the other team), fmt, venue
function storyExhibition(S, us, them, o = {}) {
  const lv = careerLevels(0), L = o.L != null ? o.L : lv.opp;
  const venue = o.venue || careerVenue(0, 0, 2, them);
  Game.lastMatch = null;
  newMatch(us, them, { humans: [{ team: 0, slot: 1, pad: 0 }], career: true, aiCfg: [diffAt(lv.mate), careerOppCfg(L, 0)], venue, fmt: o.fmt });
  startVenueIntro(venue);
  M.careerL = L; M.careerStage = 0; M.careerOpp = -1; M.careerRound = 0; M.cRoad = false;
  M.story = { id: S.id, exhib: true };
  const me = M.players.find(p => p.human === 0); if (me) me.prayBonus = C.prayBonus;
  Game.screen = 'play'; Game.paused = false;
}
function storyAfterExhib() {
  const S = SC[M.story.id], won = M.winner === 0, us = M.teams[0].score, them = M.teams[1].score, opp = M.teamDefs[1];
  const rw = careerRewards(won, false, { stage: 0, roundName: S.name, salah: !!C.prayBonus });
  C.bp += rw.bpTotal; C.hb += rw.hbTotal; C.prayBonus = false;
  C.gamesPlayed = (C.gamesPlayed || 0) + 1;
  saveCareer();
  Game.post = { won, us, them, opp, rw, res: won ? 'win' : 'loss', lines: storyLinesOf(S, won ? 'winLines' : 'lossLines'), unlocked: '', stage: STAGES[0], roundName: S.name, story: S.id, outcome: won ? 'win' : 'loss' };
  if (Game.menus) Game.menus.hub = null;
  setupPractice('free'); Game.screen = 'postgame';
}
{
  const _fc = finalContinue;
  finalContinue = function () {
    if (M.career && M.story && M.story.exhib && storyOn()) { storyAfterExhib(); return; }
    return _fc.apply(this, arguments);
  };
  const _pc = postgameContinue;
  postgameContinue = function () {
    const p = Game.post;
    if (!p || !p.story || !storyOn()) return _pc.apply(this, arguments);
    const S = SC[p.story], lines = (p.lines || []).slice();
    Game.post = null;
    if (!lines.length) { storyJournal(S, [['narr', S.name + ': ' + (p.won ? 'won ' : 'lost ') + p.us + '–' + p.them]]); return storyDone(S, p.outcome); }
    playStory(lines, () => storyDone(S, p.outcome), storyTitleOf(S));
    storyTagJournal(S);
  };
}

// ---------------------------------------------------------------- choice scenes (the teammate pick arrives with Chapter 2)
function storyChoiceStart(S) { toast('This choice arrives in the next update.', 3); careerHub(); }
