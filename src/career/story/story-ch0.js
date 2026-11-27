// ================================================= v9.32: CAREER REFINE 3 — Chapter 0 rebuilt
// (docs/career-overhaul/REFINE-PLAN.md, release 3; SCENES.md, Chapter 0)
// The first night: the salams, Imam Dawud in the musalla (a walk-up talk), the gym where Sh. Saleem, Ammo Jamil and
// Ilyas shoot at one hoop and you ask to play (no ball for you until then), the tutorial game, and on the court the
// three introduce themselves and invite you to practice.
// - The tutorial game: guided lessons with a frozen frame for each new thing (v9.35.1, below), then an open game,
//   first to 11, the easiest CPU, easier still when you're behind. There's no rewards card after it: points and
//   bucks are explained in Chapter 1.
// - The gym starts bare: nothing is built (the water cooler is a project now).
// - A Chapter 0 save from before this layout starts again at C0.1.

// ---------------------------------------------------------------- the tutorial game: guided, then open (v9.35.1)
// Each lesson freezes the frame and explains one thing (the first pass, the first shot, the first time he shoots on
// you), then you do it while everyone else holds still or does only what the lesson needs. Offense first (move,
// sprint, pass, shoot), then defense (guard, steal, block). When all of it is taught the score goes back to 0-0 and
// it's an open game, first to 11, the easiest CPU, easier still when you're behind. A replay after a loss is open from
// the start.
const TUT0_LESSONS = [
  { id: 'move', side: 'off', title: 'Move', text: () => tk('Move with W A S D or the arrow keys.', 'Move with the stick on the left.', 'Move with the left stick.'),
    place: { me: [760, 350], ball: true }, done: s => s.dist > 240 },
  { id: 'sprint', side: 'off', title: 'Sprint', text: () => tk('Hold Shift while you move to sprint. It uses stamina.', 'Push the stick past the dashed ring to sprint.', 'Hold B while you move to sprint.'),
    done: s => s.sprint > 0.6 },
  { id: 'pass', side: 'off', title: 'Pass', text: () => tk('Tap J to pass to Sh. Saleem. He will give it back.', 'Tap PASS to throw it to Sh. Saleem. He will give it back.', 'Tap X to pass to Sh. Saleem. He will give it back.'),
    place: { me: [800, 300], mate: [1000, 520], ball: true }, done: s => s.passed && s.back },
  { id: 'shoot', side: 'off', title: 'Shoot', text: () => tk('Hold K to jump, and let go at the top of your jump. A green flash is a perfect release.', 'Hold SHOOT to jump, let go at the top. Green is perfect.', 'Hold A to jump, let go at the top. Green is perfect.'),
    place: { me: [1010, 300], ball: true }, done: s => s.shotDone },
  { id: 'defend', side: 'def', title: 'Defend', text: () => tk('Now they have it. Hold L to guard ' + tut0Opp() + ': you stay between him and the rim.', 'Now they have it. Hold DEFEND to guard ' + tut0Opp() + ', between him and the rim.', 'Now they have it. Hold Y to guard ' + tut0Opp() + ', between him and the rim.'),
    place: { me: [500, 340], opp: [620, 330], oppBall: true }, drive: true, done: s => s.guard > 1.4 },
  { id: 'steal', side: 'def', title: 'Steal', text: () => tk('Get close to the ball and tap J to swipe at it. Reach across his body and it’s a foul.', 'Get close and tap STEAL to swipe at the ball.', 'Get close and tap X to swipe at the ball.'),
    place: { me: [420, 345], opp: [470, 340], oppBall: true }, drive: true, done: s => s.swiped },
  { id: 'block', side: 'def', title: 'Block', text: () => tk('He’s going up! Press K now to jump and block it.', 'He’s going up! Tap BLOCK now to jump at it.', 'He’s going up! Press A now to jump at it.'),
    place: { me: [230, 350], opp: [310, 350], oppBall: true }, shootAt: 0.7, freezeOn: 'windup', done: s => s.contested }
];
function tut0() { return M && M.story && M.story.tut; }
function tut0Opp() { const me = M.players && M.players.find(q => q.human === 0), o = me && me.opps && me.opps[0]; return o ? o.def.name : 'him'; }
function tut0Lesson() { const T = tut0(); return T && !T.open ? TUT0_LESSONS[T.i] : null; }
function tut0Go(i) {
  const T = tut0(); if (!T) return;
  if (i >= TUT0_LESSONS.length) return tut0Open();
  const L = TUT0_LESSONS[i];
  T.i = i; T.t = 0; T.s = { dist: 0, sprint: 0, guard: 0, last: null }; T.armed = !L.freezeOn;
  if (L.place) tutPlace(L.place);
  for (const q of M.players) { q.vx = q.vz = 0; }
  if (!L.freezeOn) tut0Freeze(); else T.freeze = null;                // (the block freezes when he rises)
}
function tut0Freeze(now) { const T = tut0(); T.freeze = { t: 0, wait: now ? 0 : 3 }; SFX.blip && SFX.blip(); }   // (wait: a few frames so the ball is in his hands and everyone is in place)
function tut0Unfreeze() { const T = tut0(); if (!T || !T.freeze || T.freeze.t < 0.35) return; T.freeze = null; T.armed = true; SFX.good && SFX.good(); }
function tut0Open() {
  const T = tut0(); T.open = true; T.freeze = null; M.cmdHook = null;
  M.teams[0].score = M.teams[1].score = 0; for (const t of M.teams) t.qs = [];
  for (const q of M.players) { q.stats.pts = q.stats.fgm = q.stats.fga = 0; }
  formation(0); inbound(0);
  if (C && C.story) { C.story.tutDone = true; saveCareer(); }
  FX.callout && FX.callout('NOW PLAY IT OUT', '#ffd76a', 'FIRST TO 11');
}
// everyone but you holds still during a lesson, except what the lesson needs
function tut0Cmd(q) {
  const T = tut0(), L = tut0Lesson(); if (!T || !L || q.human === 0) return false;
  const c = q.cmd; zeroCmd(c);
  const me = M.players.find(p => p.human === 0); if (!me) return true;
  if (q === me.mate && ball.owner === q && L.id === 'pass' && T.t > 0.6) c.a = true;      // Sh. Saleem gives it back
  if (q === me.opps[0] && ball.owner === q) {
    const h = attackHoop(q.team);
    if (L.drive) { const tt = T.t % 5, tx = tt < 2.5 ? 360 : 560, tz = tt < 2.5 ? 270 : 430, d = Math.hypot(tx - q.x, tz - q.z); if (d > 10) { c.mx = (tx - q.x) / d * 0.45; c.mz = (tz - q.z) / d * 0.45; } }
    if (L.shootAt && T.t > L.shootAt && q.state === 'free' && !T.s.shotGo) { c.b = true; c.bHeld = true; T.s.shotGo = true; T.s.holdT = 0.45; }
    if (T.s.holdT > 0) { T.s.holdT -= STEP; c.bHeld = T.s.holdT > 0; }
    c.face = sgn(h.x - q.x) || q.face;
  }
  return true;
}
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    const T = tut0();
    if (!T || T.open || !M.players) return _um.apply(this, arguments);
    if (T.start) { T.start = false; M.introT = 0; if (FX.calls) FX.calls = []; tut0Go(0); return; }
    if (T.freeze && T.freeze.wait > 0) { T.freeze.wait--; if (M.cmdHook !== tut0Cmd) M.cmdHook = tut0Cmd; return _um.apply(this, arguments); }
    if (T.freeze) { T.freeze.t += dt; return; }                         // the frame holds while the card is up
    if (M.cmdHook !== tut0Cmd) M.cmdHook = tut0Cmd;
    const r = _um.apply(this, arguments), L = tut0Lesson(); if (!L) return r;
    const me = M.players.find(q => q.human === 0), s = T.s; if (!me) return r;
    T.t += dt;
    const sp = Math.hypot(me.vx || 0, me.vz || 0);
    if (s.last) s.dist += Math.hypot(me.x - s.last.x, me.z - s.last.z); s.last = { x: me.x, z: me.z };
    if (me.cmd && me.cmd.turbo && sp > 200) s.sprint += dt;
    if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me && !ball.shot.dunk) s.shot = true;
    if (s.shot && ball.state !== 'shot') s.shotDone = true;
    if (ball.owner === me) { if (s.passed) s.back = true; s.hadBall = true; }
    if (s.hadBall && (ball.owner === me.mate || (ball.pass && ball.pass.from === me))) s.passed = true;
    if (me.v8 && me.v8.held && me.v8.inPos) s.guard += dt;
    if (me.state === 'steal') s.swiped = true;
    if (me.state === 'jump' && (me.opps.some(o => o.state === 'windup' || o.state === 'shoot') || (ball.state === 'shot' && ball.shot && ball.shot.team !== me.team))) s.contested = true;
    // the block: the frame freezes the moment he rises
    if (L.freezeOn && !T.armed && me.opps.some(o => o.state === L.freezeOn || o.state === 'shoot')) { tut0Freeze(true); return r; }
    if (L.done(s)) { s.doneT = (s.doneT || 0) + dt; if (s.doneT > 0.5) { FX.callout && FX.callout('✓ ' + L.title.toUpperCase(), '#9dffb0'); tut0Go(T.i + 1); } }
    else if (L.id === 'block' && s.shotGo && T.t > 3 && ball.state !== 'shot') tut0Go(T.i);   // missed the moment: once more
    else if (T.t > 3 && (M.phase !== 'live' || (!ball.owner && ball.state === 'loose' && L.id !== 'shoot'))) { s.stuckT = (s.stuckT || 0) + dt; if (s.stuckT > 1.2) tut0Go(T.i); }
    for (const t of M.teams) t.score = Math.min(t.score, 9);         // (nothing counts until the open game)
    return r;
  };
  // the card: freeze it, explain, then "try it"
  const _pu = playUpdate;
  playUpdate = function (rdt) {
    const T = tut0();
    if (T && !T.open && T.freeze && !(T.freeze.wait > 0) && !Game.paused && Game.screen === 'play') {
      T.freeze.t += rdt;
      if (menuHit('back')) { Game.paused = true; Game.idx = 0; return; }
      if (menuHit('ok') || Input.pressed.Space) tut0Unfreeze();
      return;
    }
    return _pu.apply(this, arguments);
  };
  // the catch-up, in the open game: when you're behind, your shots open up and theirs close
  const _sw = shotWindow;
  shotWindow = function (p) {
    const w = _sw.apply(this, arguments), T = tut0(); if (!T || !(w > 0) || !M.teams) return w;
    const behind = M.teams[0].score < M.teams[1].score;
    return p.team === 0 ? w * (behind ? 1.6 : 1.2) : w * (behind ? 0.45 : 0.75);
  };
  const _dk = defK;
  defK = function (p) { const k = _dk.apply(this, arguments), T = tut0(); if (!T || !p || p.team !== 1 || !M.teams) return k; return k * (M.teams[0].score < M.teams[1].score ? 0.3 : 0.6); };
  // the lesson: a card on the left (dimmed and frozen while it explains; a small reminder while you do it)
  const _dh = drawHUD;
  drawHUD = function (g) {
    const r = _dh.apply(this, arguments), T = tut0(), L = tut0Lesson();
    if (!T || !L || Game.screen !== 'play' || Game.paused) return r;
    const TT = Input.touchMode && g === ctx, x = 12, y = TT ? 112 : 88, w = TT ? 300 : 340, fr = !!T.freeze, n = TUT0_LESSONS.length;
    if (fr) { g.fillStyle = 'rgba(4,8,14,0.45)'; g.fillRect(-400, 0, W + 800, H); }
    g.font = `14px ${BODY}`; const lh = 19, lines = wrapCount(g, L.text(), w - 32), h = 58 + lines * lh + (fr ? 34 : 8);
    g.fillStyle = fr ? 'rgba(8,16,24,0.95)' : 'rgba(8,16,24,0.8)'; roundRect(g, x, y, w, h, 12); g.fill();
    if (fr) { g.strokeStyle = GOLD; g.lineWidth = 2; roundRect(g, x, y, w, h, 12); g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`; g.fillText((L.side === 'off' ? 'OFFENSE' : 'DEFENSE') + '  •  ' + (T.i + 1) + ' of ' + n, x + 16, y + 20);
    g.fillStyle = GOLD; g.font = `17px ${FONT}`; g.fillText(L.title, x + 16, y + 42);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapTextLeft(g, L.text(), x + 16, y + 64, w - 32, lh);
    if (fr) { g.fillStyle = '#f2cf6b'; g.font = `13px ${FONT}`; g.fillText(Input.touchMode ? 'Tap to try it' : 'Enter to try it', x + 16, y + h - 14); addRect(0, 0, W, H, tut0Unfreeze); }
    for (let k = 0; k < n; k++) { g.fillStyle = k < T.i ? '#9dffb0' : k === T.i ? GOLD : 'rgba(255,255,255,0.2)'; g.beginPath(); g.arc(x + w - 16 - (n - 1 - k) * 12, y + 17, 3.5, 0, Math.PI * 2); g.fill(); }
    return r;
  };
}
{
  // the tutorial game is set up as the pickup game, plus its prompts
  const _ex = storyExhibition;
  storyExhibition = function (S) {
    const r = _ex.apply(this, arguments);
    if (S && S.tutorial && M.story) {
      M.story.tut = { i: 0, t: 0, s: {}, open: !!(C.story && C.story.tutDone) };
      if (!M.story.tut.open) { M.introT = 0; for (const q of M.players) q.hifzUsed = true; M.story.tut.start = true; }   // (no venue sweep, no Noor questions mid-lesson; the first lesson starts on the first frame of play, once the tip-off setup is done)
    }
    return r;
  };
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
const STORY_LAYOUT = 3;                                                // 2: Chapter 0 in the v9.32 order; 3: Chapter 1 in the v9.33 order
{
  const _fc = freshCareer;
  freshCareer = function () { const c = _fc.apply(this, arguments); if (c.story) c.up = {}; return c; };
  const _sf = storyFresh;
  storyFresh = function () { return Object.assign(_sf.apply(this, arguments), { lay: STORY_LAYOUT }); };
  const _lc = loadCareer;
  loadCareer = function (key) {
    const raw = readSave(key), lay = (raw && raw.story && raw.story.lay) || 0;   // (the saved layout, before the fresh defaults fill in)
    const r = _lc.apply(this, arguments);
    if (r && C && C.story && lay < 2) {
      if (/^C0\./.test(C.story.at || '')) { C.story.at = 'C0.1'; C.story.wp = null; }
      C.story.lay = STORY_LAYOUT;
    }
    return r;
  };
}
