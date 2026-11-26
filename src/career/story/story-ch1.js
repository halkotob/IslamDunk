// ================================================= v9.33: CAREER REFINE 4 — Chapter 1 rebuilt
// (docs/career-overhaul/REFINE-PLAN.md, release 4; SCENES.md, Chapter 1)
// - C1.1 Meet the gym: a free walk with goals (sprint, three baskets, a layup, a rebound). Ilyas runs you through the
//   cone dribble and explains Barakah Points; Ammo Jamil has you shoot free throws and explains Halal Bucks; Sh. Saleem
//   at his office door explains the drills. Then "Go to the musalla": walk through the door.
// - C1.2 The musalla: short intros, pray, read; then Musa calls everyone to the gym and Lightning's ready panel opens.
// - C1.3 Lightning, in the practice gym, with only a small count on the left. After it Sh. Saleem asks you to his office.
// - C1.4 the office (four lines), C1.5 on court: everyone plays for his spot.
// - C1.6 King of the Court in the practice gym: Musa, then Hafiz Zubair, then Qari Anas, each a little harder, all easy.
//   Only a streak counter on the left.
// - C1.7 the team. A Chapter 1 save from before this layout starts again at C1.1.

// ---------------------------------------------------------------- C1.1: the gym walk
function swOnlyGo() { return !!(SW && SW.D.exitTo && !swNeedLeft().length && swGoalsLeft().every(id => id === 'go')); }
{
  // talking to someone who has a drill for you: his lines, then the drill
  const _tt = swTalkTo;
  swTalkTo = function (id) {
    const I = SW, d = I && I.defs[id];
    if (!d || !d.drill || d.closer || I.talk || I.fadeDir || I.goals[d.drill]) return _tt.apply(this, arguments);
    const p = I.npcs[id], me = M.players[0]; p.face = sgn(me.x - p.x) || 1; me.face = -p.face; I.with = id;
    swSay(d.lines, () => { if (!I.met[id]) { I.met[id] = true; swSave(); } startDrill(d.drill); });
  };
  // a drill finished in a walk ticks off its own goal (the cone dribble, the free throws)
  const _fd = finishDrill;
  finishDrill = function () { const k = Gym.drill && Gym.drill.kind, r = _fd.apply(this, arguments); if (k && Gym.story && Gym.story === SW) swGoal(k); return r; };
  // a rebound: your own miss, back in your hands
  const _gb = giveBall;
  giveBall = function (p, how) {
    const sh = ball.shot;
    if (how !== 'inbound' && sh && !sh.make && sh.shooter === p && Gym.story && Gym.story === SW && SW.D.free && !Gym.drill && p === M.players[0]) swGoal('rebound');
    return _gb.apply(this, arguments);
  };
  // a layup: a basket from close in (or a layup move)
  const _ps = practiceScore;
  practiceScore = function () {
    if (Gym.story && Gym.story === SW && SW.D.free && !Gym.drill && SW.gp.close) swGoal('layup');
    return _ps.apply(this, arguments);
  };
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    const I = SW, me = M.players[0];
    if (I && Gym.story === I && I.D.free && me && Game.screen === 'gym' && !Gym.drill) {
      if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me) {
        if (!I.gp.shotSeen) { I.gp.shotSeen = true; const h = hoops[1], ty = ball.shot.type; I.gp.close = Math.hypot(me.x - h.x, me.z - h.z) < 170 || /layup|reverse|euro|upunder|gg|floater/.test(ty || ''); }
      } else if (ball.state !== 'shot') I.gp.shotSeen = false;
      // the musalla door: walk up to it once the gym is done
      if (swOnlyGo() && !I.talk && !I.fadeDir && !Gym.walk && !Gym.fade && !Gym.overlay && Math.hypot(me.x - PRAY_SPOT.x, me.z - PRAY_SPOT.z) < 90) { enterMusalla(); }
    }
    return _gu.apply(this, arguments);
  };
  // through the door: the walk is over and the musalla scene starts
  const _om = openMusalla;
  openMusalla = function () {
    const I = SW;
    if (I && Gym.story === I && I.D.exitTo === 'musalla' && swOnlyGo()) { I.goals.go = true; swEnd(); return; }
    return _om.apply(this, arguments);
  };
  // the marker over the door
  const _hud = drawGymHUD;
  drawGymHUD = function (g) {
    const r = _hud.apply(this, arguments);
    if (swOnlyGo() && Game.screen === 'gym' && !SW.talk && !SW.fadeDir && !Gym.drill && !Gym.walk && !Gym.fade) { const [x, y] = P(PRAY_SPOT.x, 150, PRAY_SPOT.z); drawStalkMarker(g, x, y); }
    return r;
  };
}

// ---------------------------------------------------------------- C1.5: lines said right here, on court
{
  const _ts = storyTalkStart;
  storyTalkStart = function (S) {
    if (!S || !S.sayNow) return _ts.apply(this, arguments);
    const L = storyLinesOf(S);
    storySay(L, () => { storyJournal(S, L); storyDone(S, 'next'); }, S.name);
  };
}

// ---------------------------------------------------------------- Lightning: a small count on the left
function storyMiniLean() { return storyOn() && Gym.drill && Gym.drill.story && M.mini && M.mini.kind === 'lightning'; }
{
  const _dm = drawMiniHUD;
  drawMiniHUD = function (g) {
    if (!storyMiniLean()) return _dm.apply(this, arguments);
    const mg = M.mini, n = M.players.length, left = M.players.filter((p, i) => !mg.places[i]).length;
    const me = Math.max(0, M.players.findIndex(p => p.human >= 0)), out = mg.places[me], act = mg.active.indexOf(me), tk = mg.taken && mg.taken.has(me);
    const you = out ? (out === 1 ? 'You won!' : 'You’re out: ' + ordinal(out)) : act === 0 ? (tk ? 'Chase your rebound' : 'You’re on the spot') : act === 1 ? (tk ? 'Chase your rebound' : 'You’re on deck') : 'In line: #' + (mg.queue.indexOf(me) + 1);
    const TT = Input.touchMode && g === ctx, x = 12, y = TT ? 72 : 60, w = 196;
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x, y, w, 70, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('Lightning', x + 14, y + 20);
    g.fillStyle = '#fff'; g.font = `12px ${BODY}`; g.fillText('Players left: ' + left + ' of ' + n, x + 14, y + 40);
    g.fillStyle = out === 1 ? '#9dffb0' : out ? '#9fb3c8' : '#f2cf6b'; g.fillText(you, x + 14, y + 58);
  };
}

// ---------------------------------------------------------------- King of the Court in the practice gym
const KOTC_STORY_L = { musa: -0.85, hafiz: -0.6, anas: -0.35 };     // each a little harder, all of them easy
{
  const _kv = kotcVenue;
  kotcVenue = function () { if (!KOTC.lean) return _kv.apply(this, arguments); const b = VENUE_LIST.find(v => v.id === 'home'); return b ? makeVenue(b, { host: 0, crowd: 0 }) : null; };
  const _kb = kotcBuild;
  kotcBuild = function (ids) {
    const r = _kb.apply(this, arguments);
    if (KOTC.lean) M.aiCfg = ids.map(id => diffAt(KOTC_STORY_L[id] != null ? KOTC_STORY_L[id] : -0.5));
    return r;
  };
  // the crown goes straight back to the story: no standings card
  const _um = updateMatch;
  updateMatch = function (dt) { const r = _um.apply(this, arguments); if (KOTC.on && KOTC.lean && KOTC.done && KOTC.doneT > 2.4) kotcLeave(); return r; };
  const _kl = kotcLeave;
  kotcLeave = function () { const r = _kl.apply(this, arguments); KOTC.lean = false; return r; };
}
// the streak counter (v8-kotc.js draws it instead of the banner when KOTC.lean)
function drawKotcLean(g) {
  const K = KOTC, TT = Input.touchMode && g === ctx, x = 12, y = TT ? 104 : 76, w = 210, mine = K.king === 'you';   // (under the scoreboard)
  g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x, y, w, 76, 12); g.fill();
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('♛ King of the Court', x + 14, y + 20);
  for (let i = 0; i < KOTC_CROWN; i++) {
    const on = mine && i < K.streak; g.fillStyle = on ? '#f2cf6b' : 'rgba(255,255,255,0.16)';
    g.beginPath(); g.arc(x + 22 + i * 24, y + 40, 8, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#cfd8e3'; g.font = `12px ${BODY}`; g.fillText((mine ? K.streak : 0) + ' of ' + KOTC_CROWN, x + 22 + KOTC_CROWN * 24, y + 44);
  g.fillStyle = '#9fb3c8'; g.fillText(fitText(g, (mine ? 'Next: ' : 'King: ') + kotcName(mine ? K.chal : K.king), w - 28), x + 14, y + 64);
}

// ---------------------------------------------------------------- saves: Chapter 1 in the v9.33 order
{
  const _lc = loadCareer;
  loadCareer = function (key) {
    const raw = readSave(key), lay = (raw && raw.story && raw.story.lay) || 0;
    const r = _lc.apply(this, arguments);
    if (r && C && C.story && lay < 3) {
      if (/^C1\./.test(C.story.at || '')) { C.story.at = 'C1.1'; C.story.wp = null; }
      C.story.lay = STORY_LAYOUT;
    }
    return r;
  };
}
