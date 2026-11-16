// v9.22 career story fixtures: page-side helpers for tests/story.mjs and the review scripts. Evaluate STORY_HELPERS in
// the page first (it defines window.__s*).
//   __sNew(name)        a new career through the creator's Done: Chapter 0 starts (C0.1)
//   __sStep(o)          one step of the story bot, whatever is on screen: the salams, a scene (skipped), a walk (everyone
//                       met, every goal done, the closer talked to), a match or mini game (won, or lost with o.lose),
//                       the post-game screen, the hub (Continue). Returns what it did.
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
      for (const g of (SW.D.goals || [])) swGoal(g.id);
      for (const d of SW.D.npcs) if (d.need && !SW.met[d.id]) window.__sTalk(d.id);
      const cl = swCloser(); if (cl && !SW.done) window.__sTalk(cl);
      if (SW && SW.done) swEnd();
      return 'walk';
    }
    if (typeof window.__sExtra === 'function') { const r = window.__sExtra(o); if (r) return r; }
    if (s === 'play' && M.story) {
      const lose = typeof o.lose === 'function' ? o.lose(C.story.at) : !!o.lose;
      M.teams[0].score = lose ? 5 : 11; M.teams[1].score = lose ? 11 : 5; M.winner = lose ? 1 : 0; M.phase = 'over';
      finalContinue(); return lose ? 'lost' : 'won';
    }
    if (s === 'postgame') { postgameContinue(); return 'post'; }
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
