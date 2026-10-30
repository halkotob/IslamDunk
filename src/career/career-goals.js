
// ================================================= v8.4: CAREER GOALS, WEEKS AND EARNED BADGES
// * Next goal: one line on the hub that always says what to do next and what it pays.
// * Rookie checklist: five first steps (a drill, the masjid, a win, an upgrade, the sheikh), each
//   paid on the spot, with a bonus for all five.
// * Weekly goals: a week is 3 career games. Each week brings 3 goals from what you actually do
//   (stops holding Defend, green releases, assists, praying before a game, gym work, steals...).
// * Badges are earned, never bought: you get one by doing the thing again and again in real career
//   games or the gym, or by following a storyline to its end. Each has a small, clear effect in
//   career games only. My Player → Goals & badges shows all of it.
const ROOKIE = [
  ['drill', 'Finish a drill in the gym'], ['masjid', 'Step into the musalla'], ['win', 'Win a career game'],
  ['upgrade', 'Upgrade a stat'], ['sheikh', 'Sit with Sheikh Saleem in his office']
];
const WEEK_POOL = [
  { id: 'stops', txt: n => 'Get ' + n + ' stops holding Defend', need: 5 },
  { id: 'green', txt: n => 'Hit ' + n + ' green releases', need: 3 },
  { id: 'ast1', txt: () => 'Get 4 assists in one game', need: 1 },
  { id: 'pray', txt: () => 'Pray before a game', need: 1 },
  { id: 'gym', txt: n => 'Finish ' + n + ' gym routines', need: 2 },
  { id: 'stl', txt: n => 'Get ' + n + ' steals', need: 3 },
  { id: 'dnk', txt: n => 'Throw down ' + n + ' dunks', need: 3 },
  { id: 'chg', txt: () => 'Draw a charge', need: 1 },
  { id: 'clean', txt: n => 'Win ' + n + ' games without a shove', need: 2 }
];
const BADGES = [
  { id: 'mikan', name: 'Mikan Man', need: 30, how: 'Make 30 layups and dunks in career games (the Mikan drill counts too)', eff: 'Contested finishes at the rim go in a little more' },
  { id: 'lockdown', name: 'Lockdown', need: 25, how: 'Get 25 stops holding Defend in career games (defensive slides count too)', eff: '+1 defense' },
  { id: 'line', name: 'Routine at the Line', need: 20, how: 'Make 20 free throws in career games or the free-throw drill', eff: 'Free throws a little steadier' },
  { id: 'general', name: 'Floor General', need: 40, how: 'Hand out 40 assists in career games (the passing drill counts)', eff: '+1 passing' },
  { id: 'lungs', name: 'Second Lungs', need: 6, how: 'Finish 6 conditioning sessions in the gym', eff: '+1 stamina' },
  { id: 'sabr', name: 'Sabr', need: 5, how: 'Storyline: keep 5 intentions you made with Sheikh Saleem', eff: 'A little steadier when you’re behind late' },
  { id: 'bigstage', name: 'Big Stage', need: 3, how: 'Storyline: answer Jalal on the court. Beat Al-Burhan 3 times', eff: '+1 clutch against Al-Burhan' }
];
function cg() {
  const G = C.goals || (C.goals = {});
  G.rookie = G.rookie || {}; G.badgeProg = G.badgeProg || {}; G.badges = G.badges || {};
  if (!G.week || (C.gamesPlayed || 0) >= G.week.start + 3) newWeek(G);
  return G;
}
function newWeek(G) {
  const prev = G.week, n = prev ? prev.n + 1 : 1, R = seededRng((C.seed || 1) + n * 977);
  const pool = WEEK_POOL.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  G.week = { n, start: C.gamesPlayed || 0, goals: pool.slice(0, 3).map(w => ({ id: w.id, need: w.need, prog: 0, done: false })), all: false };
}
function goalPay(bp, hb, why) { C.bp += bp; C.hb += hb; toast('✓ ' + why + '   +' + bp + ' BP' + (hb ? '  +' + hb + ' HB' : ''), 3.2); SFX.good && SFX.good(); saveCareer(); }
function rookieDo(id) {
  if (!C) return; const G = cg(); if (G.rookie[id]) return;
  G.rookie[id] = true; const s = ROOKIE.find(r => r[0] === id);
  goalPay(40, 10, s ? s[1] : id);
  if (ROOKIE.every(r => G.rookie[r[0]])) setTimeout(() => goalPay(100, 25, 'Rookie checklist complete'), 1200);
}
function weekAdd(id, n = 1) {
  if (!C) return; const G = cg(), w = G.week;
  for (const g of w.goals) if (g.id === id && !g.done) {
    g.prog = Math.min(g.need, g.prog + n);
    if (g.prog >= g.need) { g.done = true; goalPay(50, 10, WEEK_POOL.find(x => x.id === id).txt(g.need)); }
  }
  if (!w.all && w.goals.every(g => g.done)) { w.all = true; setTimeout(() => goalPay(60, 15, 'All of this week’s goals'), 1200); }
}
function badgeAdd(id, n = 1) {
  if (!C) return; const G = cg(); if (G.badges[id]) return;
  const b = BADGES.find(x => x.id === id); G.badgeProg[id] = Math.min(b.need, (G.badgeProg[id] || 0) + n);
  if (G.badgeProg[id] >= b.need) {
    G.badges[id] = true; saveCareer();
    setTimeout(() => { FX.callout('BADGE EARNED', '#ffd76a', b.name.toUpperCase(), true); toast(b.name + ': ' + b.eff + ' (career games)', 4.5); SFX.good && SFX.good(); }, 600);
  }
}
function hasBadge(id) { return !!(C && C.goals && C.goals.badges && C.goals.badges[id]); }
// ---- what you did in a career game
const CGame = { stops: 0, green: 0, close: 0, ft: 0, oppStart: 0, guarded: false, poss: -1 };
{
  const _scm = startCareerMatch;
  startCareerMatch = function () {
    Object.assign(CGame, { stops: 0, green: 0, close: 0, ft: 0, oppStart: 0, guarded: false, poss: -1, prayed: !!C.prayBonus });
    const r = _scm.apply(this, arguments);
    const me = M.players.find(p => p.human === 0);
    if (me) {                                                         // badge effects, career games only
      if (hasBadge('lockdown')) me.st.def = Math.min(10, (me.st.def || 5) + 1);
      if (hasBadge('general')) me.st.pas = Math.min(10, (me.st.pas || 5) + 1);
      if (hasBadge('lungs')) me.st.sta = Math.min(10, (me.st.sta || 5) + 1);
      if (hasBadge('bigstage') && M.careerOpp === 1) me.st.clu = Math.min(10, (st7(me, 'clu') || 5) + 1);
    }
    return r;
  };
  // stops: an opponent possession that ends without points while you held Defend in it
  const _um = updateMatch;
  updateMatch = function (dt) {
    const r = _um.apply(this, arguments);
    if (!M.career || M.mini || M.practice) return r;
    const me = M.players.find(p => p.human === 0); if (!me) return r;
    const pt = M.possTeam;
    if (pt >= 0 && pt !== CGame.poss) {
      if (CGame.poss === 1 - me.team && pt === me.team && CGame.guarded && M.teams[1 - me.team].score === CGame.oppStart) CGame.stops++;
      CGame.poss = pt; CGame.guarded = false; CGame.oppStart = M.teams[1 - me.team].score;
    }
    if (pt === 1 - me.team && me.v8 && me.v8.held) CGame.guarded = true;
    return r;
  };
  const _rs = releaseShot;
  releaseShot = function (p) {
    let ck = null;
    if (M.career && p.human === 0 && ball.owner === p) {
      const d = dxz(p, attackHoop(p.team));
      if (hasBadge('mikan') && d < 150) { ck = p.contactK; p.contactK = (ck || 1) * 1.08; }
      if (hasBadge('line') && M.phase === 'ft') { ck = p.contactK; p.contactK = (ck || 1) * 1.06; }
    }
    const r = _rs.apply(this, arguments);
    if (ck !== null) p.contactK = ck;
    if (M.career && p.human === 0 && ball.shot && ball.shot.shooter === p && ball.shot.green) CGame.green++;
    return r;
  };
  const _os = onScore;
  onScore = function (h) {
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null, ft = M.phase === 'ft';
    const r = _os.apply(this, arguments);
    if (M.career && sh && sh.shooter && sh.shooter.human === 0 && !ft && (sh.dunk || Math.hypot(sh.shooter.x - h.x, sh.shooter.z - h.z) < 150)) CGame.close++;
    return r;
  };
  const _fts = ftScore;
  ftScore = function () { const s = M.ft && M.ft.shooter; const r = _fts.apply(this, arguments); if (M.career && s && s.human === 0) CGame.ft++; return r; };
  const _hd = humanDiffMult;
  humanDiffMult = function () {
    const k = _hd.apply(this, arguments);
    if (M.career && hasBadge('sabr') && M.teams && !M.fmt.first21 && M.quarter >= M.fmt.periods && M.teams[0].score < M.teams[1].score) return k * 1.08;
    return k;
  };
  // after the game: weeks, badges, rookie
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    const me = M.players.find(p => p.human === 0), s = me ? me.stats : {}, won = M.winner === 0, opp = M.careerOpp;
    const r = _cam.apply(this, arguments);
    if (won) rookieDo('win');
    const G = cg();
    weekAdd('stops', CGame.stops); weekAdd('green', CGame.green); if ((s.ast || 0) >= 4) weekAdd('ast1');
    if (CGame.prayed) weekAdd('pray'); weekAdd('stl', s.stl || 0); weekAdd('dnk', s.dnk || 0); weekAdd('chg', s.chg || 0);
    if (won && me && !me.shoves) weekAdd('clean');
    badgeAdd('mikan', CGame.close); badgeAdd('lockdown', CGame.stops); badgeAdd('line', CGame.ft); badgeAdd('general', s.ast || 0);
    if (won && opp === 1) { G.rivalBeat = (G.rivalBeat || 0) + 1; if (G.rivalArc) badgeAdd('bigstage'); }
    cg(); saveCareer();
    return r;
  };
  // rookie hooks
  const _fd = finishDrill; finishDrill = function () { const r = _fd.apply(this, arguments); rookieDo('drill'); weekAdd('gym'); return r; };
  const _fm = finishMini; finishMini = function () { const r = _fm.apply(this, arguments); rookieDo('drill'); weekAdd('gym'); return r; };
  const _om = openMusalla; openMusalla = function () { const r = _om.apply(this, arguments); rookieDo('masjid'); return r; };
  const _bs = buyStat; buyStat = function () { const bp = C.bp; const r = _bs.apply(this, arguments); if (C.bp < bp) rookieDo('upgrade'); return r; };
  const _oa = officeAct; officeAct = function (i) { const r = _oa.apply(this, arguments); if (i === 1) rookieDo('sheikh'); return r; };
}
// ---- the next goal (hub banner)
function nextGoal() {
  const G = cg(), rk = ROOKIE.find(r => !G.rookie[r[0]]);
  if (rk) return { txt: 'Rookie: ' + rk[1], pay: '+40 BP' };
  const w = G.week.goals.find(g => !g.done);
  if (w) return { txt: 'This week: ' + WEEK_POOL.find(x => x.id === w.id).txt(w.need) + '  (' + w.prog + '/' + w.need + ')', pay: '+50 BP' };
  const b = C.bracket;
  if (b && !b.out && !b.champ) { const rn = typeof roundLabel === 'function' ? roundLabel(b) : 'next game'; return { txt: 'Win your ' + rn, pay: 'keeps the run going' }; }
  return { txt: 'All goals done this week. Next week starts in ' + (G.week.start + 3 - (C.gamesPlayed || 0)) + ' game(s)', pay: '' };
}
// v9.6.2: earned badges on your hub card. Each pill is sized to its full name (measured, so the raised phone font
// fits too), they flow left to right from HubL.badges and wrap; what doesn't fit becomes a "+N" chip. Any pill
// opens Goals & badges, where each badge's description is.
function hubBadgeLayout(g, got, A) {
  g.font = `11px ${FONT}`; const px = hubPx(g), h = Math.max(20, Math.ceil(px + 9)), gap = 6, padX = 8;
  const wOf = t => Math.max(36, Math.ceil(g.measureText(t).width) + padX * 2);
  const head = Math.ceil(px) + 8, top = A.y + head, rowsMax = Math.max(0, Math.floor((A.bottom - top + gap) / (h + gap)));
  const out = []; let x = A.x, row = 0;
  for (let i = 0; i < got.length; i++) {
    const t = got[i].name, w = Math.min(wOf(t), A.w), more = got.length - i - 1, chipW = more ? wOf('+' + (more + 1)) : 0;
    let nx = x, nr = row; if (nx + w > A.x + A.w + 0.5) { nx = A.x; nr = row + 1; }
    const last = nr === rowsMax - 1, fitsHere = nr < rowsMax && (!more || !last || nx + w + gap + chipW <= A.x + A.w + 0.5);
    if (!fitsHere) {                                                      // the rest is one "+N" chip
      const n = got.length - i, cw = wOf('+' + n);
      let cx = x, cr = row; if (cx + cw > A.x + A.w + 0.5) { cx = A.x; cr = row + 1; }
      if (cr < rowsMax) out.push({ chip: true, t: '+' + n, x: cx, y: top + cr * (h + gap), w: cw, h });
      else if (out.length) { const p = out.pop(); out.push({ chip: true, t: '+' + (n + 1), x: p.x, y: p.y, w: wOf('+' + (n + 1)), h }); }
      break;
    }
    out.push({ t, x: nx, y: top + nr * (h + gap), w, h, b: got[i] }); x = nx + w + gap; row = nr;
  }
  return { pills: out, px, headY: A.y + Math.ceil(px) };
}
function drawHubBadges(g) {
  const A = HubL.badges; if (!A) return;
  const G = cg(), got = BADGES.filter(b => G.badges[b.id]);
  g.textAlign = 'left'; g.font = `11px ${FONT}`; g.fillStyle = HUB_GOLD_DIM;
  if (A.bottom - A.y < hubPx(g) + 8) return;                            // no room at all (never on the stock layout)
  g.fillText('BADGES', A.x, A.y + Math.ceil(hubPx(g)));
  if (!got.length) { g.font = `12px ${BODY}`; const t = fitText(g, 'None yet: see Goals & badges', A.w); g.fillStyle = '#7d8a9c'; g.fillText(t, A.x, A.y + Math.ceil(hubPx(g)) * 2 + 10); addRect(A.x, A.y, A.w, 40, () => openGoals()); return; }
  const Lb = hubBadgeLayout(g, got, A); HubL.badgePills = Lb.pills;
  for (const p of Lb.pills) {
    g.fillStyle = p.chip ? 'rgba(255,255,255,0.16)' : 'rgba(232,195,90,0.9)'; roundRect(g, p.x, p.y, p.w, p.h, p.h / 2); g.fill();
    g.fillStyle = p.chip ? '#fff' : NIGHT; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText(fitText(g, p.t, p.w - 12), p.x + p.w / 2, p.y + p.h / 2 + Lb.px * 0.36);
    addRect(p.x, p.y, p.w, p.h, () => openGoals());
  }
  g.textAlign = 'left';
}
{
  const _dh = drawHub;
  drawHub = function (g) {
    _dh.apply(this, arguments);
    // v9.6.2: the weekly goal is the menu panel's first row (HubL.goal, set by drawHub), labelled WEEK GOAL
    const ng = nextGoal(), R = HubL.goal || { x: 336, y: 210, w: 290, h: 24 }, x = R.x, y = R.y, w = R.w, h = R.h;
    g.fillStyle = 'rgba(232,195,90,0.16)'; roundRect(g, x, y, w, h, h / 2); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.5)'; g.lineWidth = 1; g.stroke();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `11px ${FONT}`; const by = y + h / 2 + hubPx(g) * 0.36;
    // v9.12: at Larger text the goal was cut off ("Rookie: Finish a dr…"). What gives way first: the reward, then the
    // WEEK GOAL label, then the size of the text; the goal itself is the last thing to be shortened.
    const lab = g.measureText('WEEK GOAL').width; g.font = `11px ${BODY}`;
    const full = ng.txt + (ng.pay ? '  •  ' + ng.pay : ''), room = l => x + w - 12 - (l ? x + 20 + lab : x + 12);
    let t = full, showLab = true, px = 11;
    if (g.measureText(full).width > room(true)) { t = ng.txt; if (g.measureText(t).width > room(true)) showLab = false; }
    while (px > 8 && g.measureText(t).width > room(showLab)) { px--; g.font = `${px}px ${BODY}`; }
    if (showLab) { g.save(); g.fillStyle = GOLD; g.font = `11px ${FONT}`; g.fillText('WEEK GOAL', x + 12, by); g.restore(); }
    g.fillStyle = IVORY; g.fillText(fitText(g, t, room(showLab)), showLab ? x + 20 + lab : x + 12, by);
    addRect(x, y, w, h, () => openGoals());
    drawHubBadges(g);
  };
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments), mp = R.find(e => e.label === 'My Player');
    if (mp && mp.sub && !mp.sub.some(s => s.label === 'Goals & badges')) mp.sub.splice(1, 0, { label: 'Goals & badges', act: () => openGoals() });
    return R;
  };
}
// ---- goals & badges screen
function openGoals() { Game.screen = 'cgoals'; }
function drawGoals(g) {
  dim(g, 0.86); const G = cg(), TT = Input.touchMode && g === ctx;   // v8.6.2: TT = phone layout
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Goals & badges', W / 2, 50);
  // rookie
  panel(g, 30, 74, 290, 210, false);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('ROOKIE CHECKLIST', 48, 100);
  ROOKIE.forEach(([id, t], i) => { const ok = G.rookie[id]; g.fillStyle = ok ? '#9dffb0' : IVORY; g.font = `13px ${BODY}`; g.fillText(fitText(g, (ok ? '✓ ' : '• ') + t, 262), 48, 128 + i * 26); });
  g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(TT ? '+40 BP each, +100 for all' : '+40 BP each, +100 BP for all five', 48, 268);
  // week
  panel(g, 30, 296, 290, 220, false);
  g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('WEEK ' + G.week.n, 48, 322);
  g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; const left = G.week.start + 3 - (C.gamesPlayed || 0); g.fillText(TT ? left + ' game(s) left this week' : 'A week is 3 career games. ' + left + ' left this week.', 48, TT ? 344 : 340);
  G.week.goals.forEach((w, i) => {
    const y = TT ? 374 + i * 42 : 366 + i * 44, d = WEEK_POOL.find(x => x.id === w.id);
    g.fillStyle = w.done ? '#9dffb0' : IVORY; g.font = `13px ${BODY}`; g.fillText(fitText(g, (w.done ? '✓ ' : '') + d.txt(w.need), 262), 48, y);
    g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, 48, y + 8, 250, 8, 4); g.fill(); g.fillStyle = w.done ? '#57e389' : GOLD; roundRect(g, 48, y + 8, 250 * w.prog / w.need, 8, 4); g.fill();
  });
  // badges
  panel(g, 336, 74, 594, 442, false);
  g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('BADGES  •  earned on the court and in the gym, never bought', 354, 100);
  BADGES.forEach((b, i) => {
    const y = 128 + i * 54, have = G.badges[b.id], pr = G.badgeProg[b.id] || 0;
    const pw = TT ? 140 : 120, tx = 354 + pw + 12;
    g.fillStyle = have ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, 354, y - 14, pw, 24, 12); g.fill();
    g.fillStyle = have ? NIGHT : IVORY; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText(TT ? fitText(g, b.name, pw - 10) : b.name, 354 + pw / 2, y + 2); g.textAlign = 'left';
    g.fillStyle = IVORY; g.font = `12px ${BODY}`; const how = have ? b.eff + (TT ? '' : ' (career games)') : TT ? b.how.replace(/\s*\(.*\)\s*/, '').replace(' in career games', '') : b.how;
    g.fillText(TT ? fitText(g, how, 912 - tx) : how, tx, TT ? y - 2 : y);
    const by = TT ? y + 12 : y + 8;
    if (!have) { g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, tx, by, 300 - (tx - 486), 7, 3); g.fill(); g.fillStyle = GOLD; roundRect(g, tx, by, (300 - (tx - 486)) * pr / b.need, 7, 3); g.fill(); g.fillStyle = '#9fb3c8'; g.font = `10px ${BODY}`; g.fillText(pr + ' / ' + b.need, 794, TT ? y + 22 : y + 15); }
    else { g.fillStyle = '#9dffb0'; g.font = `10px ${BODY}`; g.fillText('Earned', tx, TT ? y + 22 : y + 16); }
  });
}
{
  CAREER_SCREENS.add('cgoals');
  const _cu = careerUpdate; careerUpdate = function (rdt) { if (Game.screen === 'cgoals') { if (menuHit('back') || menuHit('ok')) careerHub(); return; } return _cu.apply(this, arguments); };
  const _cr = careerRender; careerRender = function (g) { if (Game.screen === 'cgoals') return drawGoals(g); return _cr.apply(this, arguments); };
  BACK.cgoals = () => careerHub();
}
