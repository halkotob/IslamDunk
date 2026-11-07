// ================================================= v9.17.5: WHERE THE NEW SOUNDS PLAY (core/sfx-moments.js has them)
// In a match, the sounds come from the match itself (in an online rollback match both phones play them on the same
// frame, and replayed frames are silent, as for every match sound). Between plays and in menus they follow the screen.
{
  const resim = () => typeof RB !== 'undefined' && RB.resim;
  // ---- the shot clock's last 3 seconds: one tick as each second starts (3, 2, 1), a little higher each time
  const scTick = (before, after) => {
    if (!(M.fmt && M.fmt.sc > 0) || M.attract || M.phase !== 'live' || M.ft) return;
    const a = Math.ceil(before - 1e-6), b = Math.ceil(after - 1e-6);
    if (b < a && b >= 1 && b <= 3) SFX.shotTick(b);
  };
  const _um = updateMatch;
  updateMatch = function (dt) {
    const sc = M.shotClock, hot = M.hot, ft = M.ft, stage = ft && ft.stage;
    const r = _um.apply(this, arguments);
    if (typeof sc === 'number' && typeof M.shotClock === 'number') scTick(sc, M.shotClock);
    // a hot spot appearing on the floor (the match's own: m 1; the mini games' spots are their own business)
    if (!hot && M.hot && M.hot.m) SFX.hotSpot();
    // free throws: stepping to the line, then each attempt
    const F = M.ft;
    if (F && F === ft && stage !== F.stage) {
      if (stage === 'pause' && F.stage === 'set' && F.i === 0) SFX.ftStep();
      if (F.stage === 'shoot') SFX.ftAttempt();
    }
    return r;
  };
  // a guest in the older snapshot mode doesn't run the match: its shot clock arrives in the host's snapshots, so the
  // ticks come from that (the hot spot is the host's sound, mirrored like the others: net.js)
  let gsc = null;
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const was = Game.screen, back = menuHit('back'), sc = M && M.shotClock;
    backRan = false;
    const r = _gu.apply(this, arguments);
    if (Net.role === 'guest' && !(typeof RBN !== 'undefined' && RBN.on) && (Game.screen === 'netplay' || Game.screen === 'play') && typeof M.shotClock === 'number') {   // (the guest's match screen is netplay)
      if (gsc != null && M.shotClock < gsc) scTick(gsc, M.shotClock);
      gsc = M.shotClock;
    } else gsc = null;
    // between plays: the halftime screen, the final screen (after the buzzer and the cheer)
    if (Game.screen !== was) {
      if (Game.screen === 'halftime' && !M.attract) SFX.halftimeStinger();
      if (Game.screen === 'final' && !M.attract && M.teams) {
        const mine = typeof myTeam === 'function' ? myTeam() : 0, me = M.players && M.players.some(p => p.human >= 0);
        if (me) setTimeout(() => { if (Game.screen === 'final') (M.winner === mine ? SFX.winStinger() : SFX.lossStinger()); }, 450);
      }
      // Back or Esc out of a screen (once a frame, whichever way it was pressed)
      if ((back || backRan) && was !== 'play' && !uiBackPlayed()) SFX.uiBack();
    }
    return r;
  };
  // Back through the button in the corner (BACK[screen]): the handlers are wrapped as they're used
  let backRan = false, backFrame = -1;
  const uiBackPlayed = () => { const f = Game.t; if (backFrame === f) return true; backFrame = f; return false; };
  const wrapped = new WeakSet();
  const wrapBack = () => { for (const k of Object.keys(BACK)) { const f = BACK[k]; if (typeof f === 'function' && !wrapped.has(f)) { const g = function () { backRan = true; return f.apply(this, arguments); }; wrapped.add(g); BACK[k] = g; } } };
  wrapBack(); const _gu2 = gameUpdate; gameUpdate = function () { wrapBack(); return _gu2.apply(this, arguments); };
  // the practice gym has no crowd: its level is 0 (it was the classic court's 1, silent only because nobody is drawn
  // there), so the reactions below stay silent in it
  const _sp = setupPractice;
  setupPractice = function () { const r = _sp.apply(this, arguments); SFX.setCrowdLevel(0); return r; };
  // the crowd's reaction when nobody in the crowd is drawn (the drawn people groan and "ooh" themselves: never both)
  let pend = null;
  const _crowd = SFX.crowd;
  if (_crowd) SFX.crowd = function (kind, amt = 1, delay = 0) {
    const r = _crowd.apply(this, arguments), id = pend; pend = null;
    // (who is drawn, whether or not the audio has started: crowd() answers 0 people when there's no sound yet)
    const drawn = r && r.audience != null ? r.audience : CrowdA.force ? CrowdA.force.n : typeof crowdPeople === 'function' ? crowdPeople().length : 0;
    if (id && !resim() && !drawn && this.crowdLevel > 0 && !M.attract) id(amt);
    return r;
  };
  const tag = (f, id) => function () { const keep = pend; pend = id; try { return f.apply(this, arguments); } finally { pend = keep; } };
  crowdGroan = tag(crowdGroan, a => SFX.crowdBadMiss(a)); addTov = tag(addTov, a => SFX.crowdTurnover(a)); blockFeel = tag(blockFeel, a => SFX.crowdBlock(a));
  // the trivia timer's last 5 seconds
  const _tu = triviaUpdate;
  triviaUpdate = function (rdt) {
    const tv = Game.trivia, t0 = tv && !tv.done ? tv.t : null;
    const r = _tu.apply(this, arguments);
    if (t0 != null && Game.trivia === tv && !tv.done) { const a = Math.ceil(t0), b = Math.ceil(tv.t); if (b < a && b >= 1 && b <= 5) SFX.triviaLow(); }
    return r;
  };
  // Yes / No in a confirmation; a toast (not in a replayed frame of an online match)
  const _cp = confirmPick;
  confirmPick = function (i) { if (Game.confirm) SFX.uiConfirm(i); return _cp.apply(this, arguments); };
  const _to = toast;
  toast = function () { if (!resim()) SFX.toast(); return _to.apply(this, arguments); };
  // the career calendar: a new month (Ramadan, Shawwal with Eid al-Fitr...) or a holiday starting
  const _sd = calSetDay;
  calSetDay = function (n) {
    const before = C && C.cal ? C.cal.d : null;
    const r = _sd.apply(this, arguments);
    if (before != null && C && C.cal && C.cal.d !== before) {
      const a = calDate(before), b = calDate(C.cal.d);
      if (a.m !== b.m || a.y !== b.y || (calHoliday(C.cal.d) && !calHoliday(before))) SFX.calChime();
    }
    return r;
  };
}
// ---- the career summary: the Barakah Points and Halal Bucks lines come in one at a time, a soft tick each
const EARN = { post: null, t0: 0, shown: 0 };
function earnShown(p, total) {                     // how many lines are in (and a tick for each new one); Enter skips
  if (EARN.post !== p) { EARN.post = p; EARN.t0 = Game.t; EARN.shown = 0; }
  const n = Math.min(total, Math.floor((Game.t - EARN.t0) / 0.12) + 1);
  while (EARN.shown < n) { EARN.shown++; SFX.earnTick(); }
  return n;
}
