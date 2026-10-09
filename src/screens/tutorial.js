
// ================================================= v8.2: TUTORIAL (Quick Play → Tutorial)
// A short, hands-on walk through the controls on a real court: move, sprint, shoot, dunk, pass,
// dribble moves, defend (the Defense button), steal and block. Each step waits until you've done
// it once (or you skip it), then sets up the next. Nobody else moves unless the step needs them.
const TUT = { on: false, i: 0, t: 0, s: {} };
const tk = (kb, touch) => Input.touchMode ? touch : kb;
const TUT_STEPS = [
  { title: 'Move', text: () => tk('Move with W A S D (or the arrow keys).', 'Move with the stick on the left.'),
    setup() { tutPlace({ me: [380, 350] }); }, done: s => s.dist > 260 },
  { title: 'Sprint', text: () => tk('Hold Shift while you move to sprint. It uses stamina.', 'Push the stick past the dashed ring to sprint. It uses stamina.'),
    setup() { tutPlace({ me: [300, 350] }); }, done: s => s.sprint > 0.7 },
  { title: 'Shoot', text: () => tk('Hold K to jump, let go at the top of your jump. A green flash means a perfect release.', 'Hold SHOOT to jump, let go at the top. A green flash means a perfect release.'),
    setup() { tutPlace({ me: [1000, 300], ball: true }); }, done: s => s.shotDone },
  { title: 'Dunk', text: () => tk('Sprint at the rim with the ball and press K.', 'Sprint at the rim with the ball and press SHOOT.'),
    setup() { tutPlace({ me: [830, 420], ball: true }); }, done: s => s.dunk },
  { title: 'Pass', text: () => tk('Tap J to pass to your partner. The pass type picks itself.', 'Tap PASS to throw it to your partner.'),
    setup() { tutPlace({ me: [760, 300], mate: [1000, 520], ball: true }); }, done: s => s.passed },
  { title: 'Dribble moves', text: () => tk('Press H while pushing a direction: crossover, spin or step-back. Double-tap H for your signature move.', 'Tap MOVE while pushing the stick: crossover, spin or step-back.'),
    setup() { tutPlace({ me: [700, 350], opp: [790, 350], ball: true }); }, done: s => s.moved },
  { title: 'Defend', text: () => tk('Hold H (or L) on defense: you guard your man, staying between him and the rim. Stay with him.', 'Hold DEFEND on defense: you guard your man, between him and the rim. Stay with him.'),
    setup() { tutPlace({ me: [980, 350], opp: [760, 330], oppBall: true }); }, done: s => s.guard > 2, drive: true },
  { title: 'Steal', text: () => tk('Get close to the ball and tap J to swipe at it. Reach across his body and it’s a foul.', 'Get close and tap STEAL to swipe at the ball.'),
    setup() { tutPlace({ me: [900, 350], opp: [860, 350], oppBall: true }); }, done: s => s.swiped },
  { title: 'Block', text: () => tk('He’s going to shoot. Press K to jump and contest when he goes up.', 'He’s going to shoot. Press BLOCK to jump when he goes up.'),
    setup() { tutPlace({ me: [1010, 350], opp: [960, 350], oppBall: true }); TUT.s.shootAt = 1.4; }, done: s => s.contested },
  { title: 'You’re ready', text: () => 'That’s the whole game. Try a Quick Play match, and if you want it simpler, set Controls to Casual in Settings.', final: true }
];
function tutMe() { return M.players.find(q => q.human === 0); }
function tutPlace(o) {
  const me = tutMe(), mate = me.mate, opp = me.opps[0], opp2 = me.opps[1];
  M.phase = 'live'; M.inb = null; M.check = null; M.bc = null; M.nextInbound = null; M.sideOut = null; M.ft = null; M.pendingEnd = false;
  for (const q of M.players) { q.v7 = {}; q.v8 = {}; q.buf = null; q.turbo = 100; q.winded = false; }
  place(me, o.me[0], o.me[1]); place(mate, ...(o.mate || [260, 620])); place(opp, ...(o.opp || [240, 120])); if (opp2) place(opp2, 200, 640);
  Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0, grabLock: 0 });
  if (o.ball) giveBall(me, 'inbound'); else if (o.oppBall) giveBall(opp, 'inbound'); else giveBall(mate, 'inbound');   // your partner holds it out of the way
  me.face = 1; opp.face = -1;
}
function startTutorial() {
  goTitle(); Game.paused = false; Game.trivia = null;
  newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'first21', target: 99, len: 120 } });
  for (const q of M.players) q.hifzUsed = true;                        // no Noor questions in the middle of a lesson
  M.introT = 0; Game.screen = 'play'; TUT.on = true; tutGo(0);
}
function tutGo(i) {
  TUT.i = i; TUT.t = 0; TUT.s = { dist: 0, sprint: 0, guard: 0, last: null };
  const st = TUT_STEPS[i]; if (st.setup) st.setup();
  SFX.blip && SFX.blip();
}
function tutEnd() { TUT.on = false; M.cmdHook = null; goTitle(); }
function tutStep(dt) {
  if (!TUT.on || !M.teams) return;
  const st = TUT_STEPS[TUT.i], s = TUT.s, me = tutMe(); if (!me) return;
  TUT.t += dt;
  if (st.final) return;
  // what you've done this step
  const sp = Math.hypot(me.vx, me.vz);
  if (s.last) s.dist += Math.hypot(me.x - s.last.x, me.z - s.last.z); s.last = { x: me.x, z: me.z };
  if (me.cmd.turbo && sp > 200) s.sprint += dt;
  if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me && !ball.shot.dunk) s.shot = true;
  if (s.shot && ball.state !== 'shot') s.shotDone = true;
  if (me.state === 'dunk') s.dunk = true;
  if (ball.owner === me) s.hadBall = true;
  if (s.hadBall && (ball.owner === me.mate || (ball.pass && ball.pass.from === me))) s.passed = true;
  if (me.move) s.moved = true;
  if (me.v8 && me.v8.held && me.v8.inPos) s.guard += dt;
  if (me.state === 'steal') s.swiped = true;
  if (me.state === 'jump' && me.opps.some(o => o.state === 'windup' || o.state === 'shoot' || ball.state === 'shot')) s.contested = true;
  if (st.done(s)) { s.doneT = (s.doneT || 0) + dt; if (s.doneT > (TUT.i === 2 ? 0.2 : 0.6)) { TUT.nice = { t: 1.1, title: st.title }; SFX.good && SFX.good(); tutGo(TUT.i + 1); } }
  // keep the lesson tidy: if the ball ends up somewhere useless, set the step up again
  if (TUT.t > 2 && (M.phase !== 'live' || (!ball.owner && ball.state === 'loose' && !st.done(s) && TUT.i !== 2))) { if (!s.resetT) s.resetT = TUT.t; if (TUT.t - s.resetT > 1.5) { st.setup && st.setup(); s.resetT = 0; TUT.t = 0.5; } } else s.resetT = 0;
}
// everyone but you holds still, except what the step needs
function tutCmd(q) {
  if (!TUT.on || q.human === 0) return false;
  const c = q.cmd, st = TUT_STEPS[TUT.i]; zeroCmd(c);
  const me = tutMe();
  if (q === me.opps[0] && ball.owner === q) {
    const h = attackHoop(q.team);
    if (st.drive) { const t = TUT.t % 6, tx = t < 3 ? 700 : 1000, tz = t < 3 ? 250 : 450, d = Math.hypot(tx - q.x, tz - q.z); if (d > 10) { c.mx = (tx - q.x) / d * 0.55; c.mz = (tz - q.z) / d * 0.55; } }
    if (TUT.s.shootAt && TUT.t > TUT.s.shootAt && q.state === 'free') { c.b = true; c.bHeld = true; TUT.s.shootAt = null; TUT.s.holdT = 0.45; }
    if (TUT.s.holdT > 0) { TUT.s.holdT -= STEP; c.bHeld = TUT.s.holdT > 0; }
    c.face = sgn(h.x - q.x) || q.face;
  }
  if (q === me.mate && ball.owner === q && st.title === 'Pass' && TUT.t > 0.8) { c.a = true; }   // your partner gives it back
  return true;
}
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    if (TUT.on && !M.mini) { const hook = M.cmdHook; if (hook !== tutCmd) M.cmdHook = tutCmd; }
    const r = _um.apply(this, arguments);
    if (TUT.on) { tutStep(dt); if (M.teams) for (const t of M.teams) t.score = Math.min(t.score, 90); M.clock = Infinity; }
    return r;
  };
  const _ach = Ach.unlock; Ach.unlock = function () { if (TUT.on) return; return _ach.apply(this, arguments); };   // no achievements for a lesson
  const _fo = foulsOn; foulsOn = function () { return !TUT.on && _fo.apply(this, arguments); };
  const _gt = goTitle; goTitle = function () { if (TUT.on) { TUT.on = false; M.cmdHook = null; } return _gt.apply(this, arguments); };
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    return _tm().map(e => e.label !== 'Quick Play' ? e : Object.assign({}, e, { sub: [{ label: 'Tutorial: learn to play', act: () => startTutorial() }, ...e.sub] }));
  };
  // the lesson card
  const _r = render;
  render = function (g) {
    _r(g);
    if (!TUT.on || Game.screen !== 'play' || Game.paused) return;
    const st = TUT_STEPS[TUT.i], w = Math.min(560, W - 40), x = W / 2 - w / 2, y = 64, h = 96;
    g.save();
    g.fillStyle = 'rgba(8,16,28,0.9)'; roundRect(g, x, y, w, h, 14); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.6)'; g.lineWidth = 1.5; g.stroke();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `18px ${FONT}`; g.fillText((st.final ? '' : (TUT.i + 1) + '/' + (TUT_STEPS.length - 1) + '  ') + st.title, x + 16, y + 28);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapText(g, st.text(), x + 16, y + 52, w - 150, 18);
    if (st.final) { uiButton(g, x + w - 124, y + 18, 108, 34, 'Finish', () => tutEnd(), true); uiButton(g, x + w - 124, y + 56, 108, 30, 'Again', () => tutGo(0)); }
    else uiButton(g, x + w - 112, y + 30, 96, 34, 'Skip', () => tutGo(TUT.i + 1));
    if (TUT.nice && (TUT.nice.t -= 1 / 60) > 0) { g.textAlign = 'right'; g.fillStyle = '#9dffb0'; g.font = `14px ${FONT}`; g.fillText('\u2713 ' + TUT.nice.title + ' done', x + w - 16, y + h - 6); } else TUT.nice = null;
    for (let k = 0; k < TUT_STEPS.length - 1; k++) { g.fillStyle = k < TUT.i ? '#9dffb0' : k === TUT.i ? GOLD : 'rgba(255,255,255,0.2)'; g.beginPath(); g.arc(x + 20 + k * 14, y + h - 10, 4, 0, Math.PI * 2); g.fill(); }
    g.restore();
  };
}
{
  const _hw = drawHowTo;
  drawHowTo = function (g) {
    _hw.apply(this, arguments);
    const o = Math.round((W - 960) / 2);
    g.save(); g.translate(o, 0); g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `13px ${FONT}`;
    g.fillText('New to the game? Quick Play → Tutorial.   Want it simpler? Settings → Controls: Casual.', 480, 466);
    g.restore();
  };
}
