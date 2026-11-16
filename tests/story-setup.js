// v9.22 career story fixtures: page-side helpers for tests/story.mjs and the review scripts. Evaluate STORY_HELPERS in
// the page first (it defines window.__s*).
//   __sNew(name)        a new career through the creator's Done: Chapter 0 starts (C0.1)
//   __sStep(o)          one step of the story bot, whatever is on screen: the salams, a scene (skipped), a walk (everyone
//                       met, every goal done, the closer talked to), a match or mini game (won, or lost with o.lose),
//                       the post-game screen, the hub (Continue), the musalla walk (everyone met), Lightning and King of
//                       the Court (won, or lost with o.lose), the teammate pick (o.pick, or the one now), a bracket game's
//                       pregame card. o.lose and o.pick can be functions of the scene ID. Returns what it did.
//   __sRun(until, o)    steps until the story is at scene `until` (or a step limit); returns the IDs passed through
//   __sState()          { screen, at, cp, walk, seen }
// The league runs in its fallback mode here (no engine time for the other games).
export const STORY_HELPERS = `(() => {
  if (typeof LEAGUE !== 'undefined') LEAGUE.mode = 'fallback';
  window.__sNew = (name) => {
    C = freshCareer(); Game.creator = { idx: 0, isNew: true }; setupPractice('free'); Game.screen = 'creator';
    C.name = name || 'Bot'; creatorDone(); return C.story.at;
  };
  const flush = () => { let k = 0; while (SW && SW.talk && k++ < 60) { SW.talk.t = 1; swAdvance(); } };
  window.__sTalk = id => { flush(); swTalkTo(id); flush(); };
  window.__sStep = (o = {}) => {
    const s = Game.screen;
    if (s === 'ssalams') { salamsNext(); return 'salams'; }
    if (s === 'story' && Game.story) { const st = Game.story; if (o.choice != null && st.lines[st.i] && st.lines[st.i][0] === 'choice') storyChoose(st, o.choice); storySkip(st); return 'scene'; }
    if (s === 'gym' && Gym.story && SW) {
      flush();
      for (const g of (SW.D.goals || [])) for (let k = 0; k < (g.n || 1) && !SW.goals[g.id]; k++) swGoal(g.id);
      for (const d of SW.D.npcs) if (d.need && !SW.met[d.id]) window.__sTalk(d.id);
      const cl = swCloser(); if (cl && !SW.done) window.__sTalk(cl);
      if (SW && SW.done) swEnd();
      return 'walk';
    }
    const lose = typeof o.lose === 'function' ? o.lose(C.story.at) : !!o.lose;
    if (s === 'musalla' && Game.mus && Game.mus.story) {
      for (const id of STORY_MUS_NEED) if (!Game.mus.story.met[id]) { talkTo(MUS_CAST.indexOf(id)); Game.mus.talk = null; }
      musallaUpdate(1 / 60); return 'musalla';
    }
    if (s === 'gym' && Gym.drill && Gym.drill.story && M.mini) {        // a story mini game (Lightning): 1st, or 3rd with o.lose
      M.mini.places[M.players.findIndex(q => q.human >= 0)] = lose ? 3 : 1; M.mini.done = true; finishMini(); return lose ? 'lost' : 'won';
    }
    if (s === 'play' && typeof KOTC !== 'undefined' && KOTC.on && KOTC.story) {   // King of the Court: crowned, or not with o.lose
      KOTC.done = true; KOTC.champ = lose ? 'jamil' : 'you'; KOTC.wins.you = lose ? 1 : 3; kotcLeave(); return lose ? 'lost' : 'won';
    }
    if (typeof window.__sExtra === 'function') { const r = window.__sExtra(o); if (r) return r; }
    if (s === 'play' && M.story) {
      M.teams[0].score = lose ? 5 : 11; M.teams[1].score = lose ? 11 : 5; M.winner = lose ? 1 : 0; M.phase = 'over';
      finalContinue(); return lose ? 'lost' : 'won';
    }
    if (s === 'postgame') { postgameContinue(); return 'post'; }
    if (s === 'pregame') { startCareerMatch(); return 'tipoff'; }
    if (s === 'spick' && Game.spick) { const i = o.pick ? STORY_MATES.indexOf(typeof o.pick === 'function' ? o.pick(C.story.at) : o.pick) : Game.spick.sel; storyPick(i >= 0 ? i : Game.spick.sel); return 'picked'; }
    if (s === 'ssalams') { salamsNext(); return 'salams'; }
    if (s === 'hub') { storyRun(); return 'continue'; }
    return 'stuck:' + s;
  };
  window.__sRun = (until, o = {}) => {
    const path = [], max = o.max || 400;
    for (let n = 0; n < max && C.story.at !== until; n++) {
      const at = C.story.at; if (!path.length || path[path.length - 1] !== at) path.push(at);
      const r = window.__sStep(o); if (r.startsWith('stuck')) { path.push(r); break; }
    }
    if (path[path.length - 1] !== C.story.at) path.push(C.story.at);
    return path;
  };
  window.__sState = () => ({ screen: Game.screen, at: C && C.story && C.story.at, cp: C && C.story && C.story.cp, walk: !!Gym.story, seen: C && C.story ? Object.keys(C.story.seen) : [] });
})();`;
