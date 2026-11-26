// ================================================= v9.32: CAREER REFINE 3 — Chapter 0 rebuilt
// (docs/career-overhaul/REFINE-PLAN.md, release 3; SCENES.md, Chapter 0)
// The first night: the salams, Imam Dawud in the musalla (a walk-up talk), the gym where Sh. Saleem, Ammo Jamil and
// Ilyas shoot at one hoop and you ask to play (no ball for you until then), the tutorial game, and on the court the
// three introduce themselves and invite you to practice.
// - The tutorial game: first to 11, the easiest CPU, easier still when you're behind (your green window opens up,
//   theirs closes, and they reach for fewer steals and blocks). The controls are taught by prompts in the left box,
//   each ticked off when you do it. There's no rewards card after it: points and bucks are explained in Chapter 1.
// - The gym starts bare: nothing is built (the water cooler is a project now).
// - A Chapter 0 save from before this layout starts again at C0.1.

// ---------------------------------------------------------------- the tutorial game's prompts (the left box)
const TUT0_STEPS = [
  { id: 'move', title: 'Move', text: () => tk('W A S D or the arrow keys', 'the stick on the left', 'the left stick'), done: s => s.dist > 220 },
  { id: 'pass', title: 'Pass', text: () => tk('tap J to pass to Sh. Saleem', 'tap PASS', 'tap X'), done: s => s.passed },
  { id: 'shoot', title: 'Shoot', text: () => tk('hold K, let go at the top of the jump', 'hold SHOOT, let go at the top', 'hold A, let go at the top'), done: s => s.shotDone },
  { id: 'sprint', title: 'Sprint', text: () => tk('hold Shift while you move', 'push the stick past the dashed ring', 'hold B while you move'), done: s => s.sprint > 0.6 },
  { id: 'defend', title: 'Defend', text: () => tk('hold L on defense to stay with your man', 'hold DEFEND on defense', 'hold Y on defense'), done: s => s.guard > 1.2 },
  { id: 'contest', title: 'Contest a shot', text: () => tk('press K to jump when he shoots', 'press BLOCK when he shoots', 'press A when he shoots'), done: s => s.contested }
];
function tut0() { return M && M.story && M.story.tut; }
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    const r = _um.apply(this, arguments), T = tut0();
    if (!T || !M.players) return r;
    const me = M.players.find(q => q.human === 0), s = T.s; if (!me) return r;
    const sp = Math.hypot(me.vx || 0, me.vz || 0);
    if (s.last) s.dist += Math.hypot(me.x - s.last.x, me.z - s.last.z); s.last = { x: me.x, z: me.z };
    if (me.cmd && me.cmd.turbo && sp > 200) s.sprint += dt;
    if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me && !ball.shot.dunk) s.shot = true;
    if (s.shot && ball.state !== 'shot') s.shotDone = true;
    if (ball.owner === me) s.hadBall = true;
    if (s.hadBall && (ball.owner === me.mate || (ball.pass && ball.pass.from === me))) s.passed = true;
    if (me.v8 && me.v8.held && me.v8.inPos) s.guard += dt;
    if (me.state === 'jump' && me.opps.some(o => o.state === 'windup' || o.state === 'shoot') ) s.contested = true;
    for (const st of TUT0_STEPS) if (!T.done[st.id] && st.done(s)) { T.done[st.id] = true; T.flash = { id: st.id, t: 1 }; SFX.good && SFX.good(); }
    if (T.flash) { T.flash.t -= dt; if (T.flash.t <= 0) T.flash = null; }
    return r;
  };
  // the catch-up: when you're behind, your shots open up and theirs close
  const _sw = shotWindow;
  shotWindow = function (p) {
    const w = _sw.apply(this, arguments), T = tut0(); if (!T || !(w > 0) || !M.teams) return w;
    const behind = M.teams[0].score < M.teams[1].score;
    return p.team === 0 ? w * (behind ? 1.6 : 1.2) : w * (behind ? 0.45 : 0.75);
  };
  const _dk = defK;
  defK = function (p) { const k = _dk.apply(this, arguments), T = tut0(); if (!T || !p || p.team !== 1 || !M.teams) return k; return k * (M.teams[0].score < M.teams[1].score ? 0.3 : 0.6); };
  // the box, on the left
  const _dh = drawHUD;
  drawHUD = function (g) {
    const r = _dh.apply(this, arguments), T = tut0();
    if (!T || Game.screen !== 'play') return r;
    const TT = Input.touchMode && g === ctx, x = 12, y = TT ? 112 : 88, w = TT ? 250 : 300;
    g.font = `12px ${BODY}`; const rh = Math.max(20, (typeof phoneEffPx === 'function' ? phoneEffPx(g) : 12) + 8), cur = TUT0_STEPS.find(st => !T.done[st.id]);
    const h = 30 + TUT0_STEPS.length * rh + (cur ? rh + 6 : 0);
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x, y, w, h, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('The basics', x + 14, y + 20);
    TUT0_STEPS.forEach((st, i) => {
      const ok = !!T.done[st.id], on = st === cur, yy = y + 20 + (i + 1) * rh;
      g.fillStyle = ok ? '#9dffb0' : on ? '#fff' : '#9fb3c8'; g.font = `12px ${on ? FONT : BODY}`;
      g.fillText((ok ? '✓ ' : on ? '› ' : '• ') + st.title, x + 16, yy);
    });
    if (cur) { g.fillStyle = '#f2cf6b'; g.font = `12px ${BODY}`; g.fillText(fitText(g, cur.text(), w - 28), x + 16, y + 26 + (TUT0_STEPS.length + 1) * rh); }
    return r;
  };
}
{
  // the tutorial game is set up as the pickup game, plus its prompts
  const _ex = storyExhibition;
  storyExhibition = function (S) { const r = _ex.apply(this, arguments); if (S && S.tutorial && M.story) M.story.tut = { s: { dist: 0, sprint: 0, guard: 0 }, done: {} }; return r; };
  // no rewards card after it: its lines play in the gym, and on
  const _ae = storyAfterExhib;
  storyAfterExhib = function () {
    const S = M.story && SC[M.story.id];
    if (!S || !S.noRewards) return _ae.apply(this, arguments);
    const won = M.winner === 0;
    C.gamesPlayed = (C.gamesPlayed || 0) + 1; saveCareer();
    setupPractice('free'); Game.post = null;
    const lines = storyLinesOf(S, won ? 'winLines' : 'lossLines');
    if (!lines.length) { storyJournal(S, [['narr', S.name + ': ' + (won ? 'won' : 'lost')]]); return storyDone(S, won ? 'win' : 'loss'); }
    playStory(lines, () => storyDone(S, won ? 'win' : 'loss'), storyTitleOf(S)); storyTagJournal(S);
  };
}

// ---------------------------------------------------------------- walks: no ball until a scene gives you one
{
  const _ws = storyWalkStart;
  storyWalkStart = function (S, D0) {
    const r = _ws.apply(this, arguments), D = SW && SW.D;
    if (D && D.noBall && M.players) { ball.owner = null; ball.state = 'loose'; ball.shot = null; ball.pass = null; ball.x = -3000; ball.z = 300; ball.y = 0; ball.vx = ball.vy = ball.vz = 0; ball.grabLock = 1e9; }
    return r;
  };
  // a scene marked direct goes straight on (asking to play leads straight to the ready prompt, not home)
  const _sd = storyDone;
  storyDone = function (S, outcome) {
    if (!S.direct) return _sd.apply(this, arguments);
    const st = C.story; st.seen[S.id] = (st.seen[S.id] || 0) + 1;
    const next = typeof S.next === 'function' ? S.next(outcome) : S.next;
    storyGo(next); storyRun();
  };
  // in Chapter 0 the bar is only Next and Menu: nothing else has been shown to you yet
  const _bi = gymBarItems;
  gymBarItems = function () { const L = _bi.apply(this, arguments); return storyChapter() === 0 ? L.filter(it => it.k === 'next' || it.k === 'menu') : L; };
}

// ---------------------------------------------------------------- the gym starts bare; old Chapter 0 saves start over
const STORY_LAYOUT = 2;                                                // 2: Chapter 0 in the v9.32 order
{
  const _fc = freshCareer;
  freshCareer = function () { const c = _fc.apply(this, arguments); if (c.story) c.up = {}; return c; };
  const _sf = storyFresh;
  storyFresh = function () { return Object.assign(_sf.apply(this, arguments), { lay: STORY_LAYOUT }); };
  const _lc = loadCareer;
  loadCareer = function (key) {
    const raw = readSave(key), lay = (raw && raw.story && raw.story.lay) || 0;   // (the saved layout, before the fresh defaults fill in)
    const r = _lc.apply(this, arguments);
    if (r && C && C.story && lay < STORY_LAYOUT) {
      if (/^C0\./.test(C.story.at || '')) { C.story.at = 'C0.1'; C.story.wp = null; }
      C.story.lay = STORY_LAYOUT;
    }
    return r;
  };
}
