// ================================================= v9.29: THE CAREER STORY — after The End (P.1 to P.4)
// P.1  a talk in the gym: the story is over, the masjid goes on. Then the hub's Continue is P.R: replay any
//      tournament (a new season of it, with its own bracket), or the all-star game, or CHAI.
// P.2  21 milestones across the career (titles, each teammate's chemistry maxed, stats, every event played...).
// P.3  each milestone, when earned, unlocks a moment: a walk-up talk with the brother it concerns. New moments play
//      on the next Continue after The End; every earned one can be watched again from My Player > Milestones.
// P.4  every milestone: the last scene, and the last prize.
// Prizes are cosmetic and used in the world like the water cooler (walk up, F or tap): the chai urn (5 milestones,
// in the gym: pour a cup, steam, and half your turbo back, in the gym only), the team photos (10, in the gym), the
// kids' mural on the school wing (15, outside) and the golden ball (all of them, in the gym). Nothing reaches a match.

// ---------------------------------------------------------------- the milestones
const MS = (id, who, name, desc, test, prog) => ({ id, who, name, desc, test, prog });
const STORY_MILESTONES = [
  MS('first_win', 'saleem', 'First win', 'Win a league game.', () => (C.wins || 0) >= 1),
  MS('t_local', 'jamil', 'Masjid league champions', 'Win the Metro Masjid League.', () => C.trophies.includes(0)),
  MS('t_state', 'karim', 'State champions', 'Win the State Masjid Championship.', () => C.trophies.includes(1)),
  MS('t_nat', 'ilyas', 'National champions', 'Win the National Masjid Invitational.', () => C.trophies.includes(2)),
  MS('t_world', 'dawud', 'Champions of the ummah', 'Win the Ummah Cup.', () => C.trophies.includes(3)),
  ...['saleem', 'jamil', 'ilyas', 'karim', 'anas', 'dawud', 'musa'].map(id => MS('chem_' + id, id, 'Like brothers: ' + (CAST[id] ? CAST[id].name : id), 'Max your chemistry with ' + (CAST[id] ? CAST[id].name : id) + '.', () => chemOf(id) >= 100, () => [chemOf(id), 100])),
  MS('stat10', 'anas', 'A ten', 'Raise any stat to 10.', () => STAT_ROWS.some(([k]) => (C.lv[k] || 4) >= 10), () => [Math.max(...STAT_ROWS.map(([k]) => C.lv[k] || 4)), 10]),
  MS('all7', 'saleem', 'All-rounder', 'Raise every stat to 7 or more.', () => STAT_ROWS.every(([k]) => (C.lv[k] || 4) >= 7), () => [STAT_ROWS.filter(([k]) => (C.lv[k] || 4) >= 7).length, STAT_ROWS.length]),
  MS('games50', 'musa', 'Fifty games', 'Play 50 career games.', () => (C.gamesPlayed || 0) >= 50, () => [Math.min(50, C.gamesPlayed || 0), 50]),
  MS('rival5', 'rayyan', 'Friendly rivals', 'Beat Al-Furqan five times.', () => ((C.rival && C.rival.w) || 0) >= 5, () => [Math.min(5, (C.rival && C.rival.w) || 0), 5]),
  MS('allstar5', 'musa', 'Showtime', 'Land five dunks in one all-star game.', () => (C.story.allstarBest || 0) >= 5, () => [Math.min(5, C.story.allstarBest || 0), 5]),
  MS('chai', 'dawud', 'Someone else makes the chai', 'Win a game of CHAI.', () => !!C.story.chaiWon),
  MS('events', 'anas', 'Every event', 'Play lights out, CHAI, the all-star game and the Ummah Cup draw.', () => ['C2.10', 'C3.6', 'C3.10', 'C5.2'].every(id => C.story.seen[id]), () => [['C2.10', 'C3.6', 'C3.10', 'C5.2'].filter(id => C.story.seen[id]).length, 4]),
  MS('fund150', 'karim', 'Beyond the wing', 'Raise $150,000 for the school.', () => (C.story.fund || 0) >= 150000, () => [Math.min(150, Math.floor((C.story.fund || 0) / 1000)), 150]),
  MS('replay', 'saleem', 'Champions again', 'Win a tournament again after The End.', () => (C.story.replays || 0) >= 1)
];
const STORY_PRIZES = [
  { id: 'urn', n: 5, name: 'Imam Dawud’s chai urn', where: 'In the gym' },
  { id: 'photos', n: 10, name: 'The team photos', where: 'In the gym' },
  { id: 'mural', n: 15, name: 'The kids’ mural', where: 'Outside, on the school wing' },
  { id: 'gold', n: STORY_MILESTONES.length, name: 'The golden ball', where: 'In the gym' }
];
function msCount() { const m = (C && C.story && C.story.ms) || {}; return STORY_MILESTONES.filter(x => m[x.id]).length; }
function storyPrize(id) { if (!C || !C.story) return false; const p = STORY_PRIZES.find(x => x.id === id); return !!p && (id === 'gold' ? !!C.story.full : msCount() >= p.n); }
function storyMsCheck() {
  if (!storyOn()) return;
  const st = C.story; st.ms = st.ms || {}; st.mq = st.mq || [];
  for (const m of STORY_MILESTONES) {
    if (st.ms[m.id]) continue;
    let ok = false; try { ok = !!m.test(); } catch (e) { ok = false; }
    if (!ok) continue;
    st.ms[m.id] = true; st.mq.push(m.id);
    toast('Milestone: ' + m.name + '  (' + msCount() + ' of ' + STORY_MILESTONES.length + ')', 3);
    const pr = STORY_PRIZES.find(p => p.id !== 'gold' && p.n === msCount()); if (pr) toast('Prize: ' + pr.name + '. ' + pr.where + '.', 4);
  }
  if (msCount() === STORY_MILESTONES.length && !st.full && !st.mq.includes('P.4')) st.mq.push('P.4');
}
{
  const _ch = careerHub;
  careerHub = function () { const r = _ch.apply(this, arguments); if (C && C.story) storyMsCheck(); return r; };
  // CHAI won, and the best all-star game, are remembered for the milestones
  const _fm = finishMini;
  finishMini = function () { const d = Gym.drill; if (d && d.story && M.mini && M.mini.kind === 'horse' && storyOn()) { try { if (M.mini.result().won) C.story.chaiWon = true; } catch (e) {} } return _fm.apply(this, arguments); };
  const _ae = storyAfterExhib;
  storyAfterExhib = function () { const D = M.story && M.story.dunks; if (D) C.story.allstarBest = Math.max(C.story.allstarBest || 0, D.n); return _ae.apply(this, arguments); };
}

// ---------------------------------------------------------------- the moments (P.3) and the last scene (P.4)
function storyMomentScene(id) {
  if (id === 'P.4') return { id: 'P.4', ch: 6, name: 'Everything', lines: STORY_FINAL.slice() };
  const m = STORY_MILESTONES.find(x => x.id === id); if (!m) return null;
  return { id: 'M.' + id, ch: 6, name: m.name, lines: (STORY_MOMENTS[id] || [[m.who, 'Masha’Allah, akhi. ' + m.name + '.']]).slice(), talk: { at: 'gym', who: m.who } };
}
function storyMoment(id, after) {
  const S = storyMomentScene(id); if (!S) return after && after();
  storyGymTalkStart(S, () => {
    const st = C.story; st.mseen = st.mseen || {}; st.mseen[id] = true;
    st.mq = (st.mq || []).filter(x => x !== id);
    if (id === 'P.4') st.full = true;
    saveCareer(); (after || careerHub)();
  });
}
{
  // after The End, a new moment plays on Continue before anything else
  const _sr = storyRun;
  storyRun = function () {
    if (storyOn() && C.story.done && (C.story.mq || []).length && (!Gym.story || (SW && SW.D.home))) { Gym.story = null; SW = null; return storyMoment(C.story.mq[0], careerHub); }
    return _sr.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- P.1 and the replays (P.R)
Object.assign(STORY_EFFECTS, {
  replayStart() { const st = clamp(C.story.replay || 0, 0, 3); C.stage = st; C.season = (C.season || 1) + 1; C.story.draw = C.story.draw == null ? 1 : C.story.draw; if (st === 3) storyCupCaptains(); C.bracket = storyMakeBracket(st); slog(st).entries++; },
  replayTitle() { const st = C.stage; C.story.replays = (C.story.replays || 0) + 1; (C.story.rt = C.story.rt || [0, 0, 0, 0])[st]++; if (!C.trophies.includes(st)) C.trophies.push(st); storyFund(Math.round(STORY_TITLE_FUND[st] / 5), STAGES[st].name + ' title again'); }
});
function storyChampNow() { const b = C.bracket, last = b && b.rounds && b.rounds[b.rounds.length - 1]; return !!(last && last.length === 1 && last[0].w === 0 && (b.ko || b.round > 0)); }
function storyReplayStakes() { const l = roundLabel(C.bracket); return /Final/.test(l) && !/Semi|Quarter/.test(l) ? 'final' : /Semi|Quarter/.test(l) ? 'must-win' : 'regular'; }
const REPLAY_ITEMS = () => [...STAGES.map(s => s.title), 'All-star game (dunks only)', 'CHAI', 'Not now'];
function openReplay() { Game.screen = 'sreplay'; Game.idx = 0; SFX.blip(); }
function replaySelect(i) {
  if (i < 4) { C.story.replay = i; storyGo('PR.c'); return storyRun(); }
  if (i === 4) { storyGo('PR.a'); return storyRun(); }
  if (i === 5) { storyGo('PR.h'); return storyRun(); }
  careerHub();
}
function drawReplay(g) {
  g.fillStyle = 'rgba(4,8,14,0.7)'; g.fillRect(-400, 0, W + 800, H);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Replay a tournament', W / 2, 60);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('A new season of any tournament, with a new draw. Or a game of your choice.', W / 2, 86);
  const rt = C.story.rt || [0, 0, 0, 0];
  drawMenu(g, REPLAY_ITEMS().map((t, i) => i < 4 && rt[i] ? t + '  (won again ' + rt[i] + 'x)' : t), Game.idx, 140, replaySelect);
}
{
  const _cs = storyChoiceStart;
  storyChoiceStart = function (S) { if (S.replay) return openReplay(); return _cs.apply(this, arguments); };
  const _nx = storyNextExtra;
  storyNextExtra = function (S) { if (S.replay) return 'Any tournament, any time. Milestones: ' + msCount() + ' of ' + STORY_MILESTONES.length + '.'; return _nx.apply(this, arguments); };
  CAREER_SCREENS.add('sreplay'); CAREER_SCREENS.add('smiles');
  BACK.smiles = () => careerHub();   // (v9.32.1: the ‹ Back pill: on touch it was the only way out, and there was none)
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'sreplay') { menuNav(REPLAY_ITEMS().length, replaySelect); if (menuHit('back')) careerHub(); return; }
    if (Game.screen === 'smiles') { const n = STORY_MILESTONES.length; menuNav(n, i => msWatch(i)); if (menuHit('back')) careerHub(); return; }
    return _cu.apply(this, arguments);
  };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'sreplay') return drawReplay(g); if (Game.screen === 'smiles') return drawMilestones(g); return _cr.apply(this, arguments); };
}

// ---------------------------------------------------------------- My Player > Milestones
function openMilestones() { storyMsCheck(); Game.screen = 'smiles'; Game.idx = 0; SFX.blip(); }
function msWatch(i) { const m = STORY_MILESTONES[i]; if (!m || !(C.story.ms || {})[m.id]) { SFX.bad && SFX.bad(); return; } storyMoment(m.id, openMilestones); }
function drawMilestones(g) {
  g.fillStyle = 'rgba(4,8,14,0.75)'; g.fillRect(-400, 0, W + 800, H);
  const n = msCount(), N = STORY_MILESTONES.length, TT = Input.touchMode && g === ctx;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Milestones  ' + n + ' / ' + N, W / 2, 40);
  const next = STORY_PRIZES.find(p => !storyPrize(p.id));
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(fitText(g, next ? 'Next prize: ' + next.name + ' at ' + next.n + (next.id === 'gold' ? ' (all of them)' : '') + '.  Tap an earned one to watch its moment.' : 'Every prize is yours. Tap an earned milestone to watch its moment.', W - 80), W / 2, 62);
  const cols = 3, rows = Math.ceil(N / cols), cw = (W - 60) / cols, rh = Math.min(TT ? 60 : 56, (H - 110) / rows);
  STORY_MILESTONES.forEach((m, i) => {
    const c = Math.floor(i / rows), r = i % rows, x = 30 + c * cw, y = 78 + r * rh, ok = !!(C.story.ms || {})[m.id], on = Game.idx === i;
    g.fillStyle = on ? 'rgba(232,195,90,0.22)' : ok ? 'rgba(30,90,74,0.55)' : 'rgba(8,16,24,0.7)'; roundRect(g, x, y, cw - 8, rh - 6, 8); g.fill();
    if (on) { g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = ok ? '#9dffb0' : '#fff'; g.font = `13px ${FONT}`; g.fillText(fitText(g, (ok ? '✓ ' : '') + m.name, cw - 30), x + 10, y + 19);
    g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`;
    const pr = !ok && m.prog ? m.prog() : null;
    g.fillText(fitText(g, pr ? m.desc + '  ' + pr[0] + '/' + pr[1] : m.desc, cw - 30), x + 10, y + rh - 14);
    addRect(x, y, cw - 8, rh - 6, () => { if (Game.idx === i) msWatch(i); Game.idx = i; });
  });
}
{
  const _hi = storyHubItems;
  storyHubItems = function () {
    const L = _hi.apply(this, arguments), mp = L.find(x => x.label === 'My Player');
    if (mp && mp.sub && !mp.sub.some(s => s.label === 'Milestones')) mp.sub.push({ label: 'Milestones', act: () => openMilestones() });
    return L;
  };
  hubExtra = function () { return storyHubItems(); };
}

// ---------------------------------------------------------------- the prizes, used in the world
GYM_PROPS.push(
  { id: 'urn', x: 600, z: 40, need: () => storyPrize('urn'), label: 'Pour a cup of chai' },
  { id: 'photos', x: 380, z: 40, need: () => storyPrize('photos'), label: 'Look at the team photos' },
  { id: 'gold', x: 985, z: 40, need: () => storyPrize('gold'), label: 'Hold the golden ball' });
const PRIZE_LEN = { urn: 2.6, photos: 0.2, gold: 2.4 };
{
  const _ug = useGymProp;
  useGymProp = function (p) {
    if (!PRIZE_LEN[p.id]) return _ug.apply(this, arguments);
    Gym.prop = { id: p.id, t: 0, prize: true }; SFX.blip();
    if (p.id === 'photos') {
      const caps = ['The bent rim, the first night. Somebody wrote “never forget” on the back.', 'Lights out: a photo of nothing, labeled “the best game of Musa’s life”.',
        'The State all-star game: Musa mid-dunk, Rayyan pretending not to watch.', 'National champions: Ammo Jamil and Ilyas, arms around each other.', 'Istanbul: the whole team, the Cup, and Imam Dawud’s thermos.'];
      C.story.photoI = ((C.story.photoI || 0) + 1) % caps.length; gymToast(caps[C.story.photoI], 4.5);
    }
    if (p.id === 'gold') { SFX.cheer && SFX.cheer(0.8, 0.2); }
  };
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    const P_ = Gym.prop;
    if (!P_ || !P_.prize) return _gu.apply(this, arguments);
    P_.t += rdt;
    if (P_.t > PRIZE_LEN[P_.id]) {
      if (P_.id === 'urn') { const me = M.players[0]; if (me) me.turbo = Math.min(100, (me.turbo || 0) + 50); gymToast('Cardamom, ginger, patience. Imam Dawud’s recipe, from his urn. Bismillah.', 3); }
      if (P_.id === 'gold') gymToast('The golden ball: every milestone, every brother. Alhamdulillah for all of it.', 3.5);
      Gym.prop = null;
    }
    Gym.prop = null; try { return _gu.apply(this, arguments); } finally { if (P_.t <= PRIZE_LEN[P_.id] && !Gym.prop) Gym.prop = P_; }
  };
  const _db = drawGymBack;
  drawGymBack = function (g, t, U = gymUp()) {
    _db.apply(this, arguments);
    if (Game.screen !== 'gym' || !C || !C.story) return;
    const X = wx => wx - cam.x + FX.sx, Y = y => y + FX.sy, P_ = Gym.prop;
    if (storyPrize('urn')) {                                      // a small table with the brass urn and glasses
      const x = X(600);
      g.fillStyle = '#6b4526'; g.fillRect(x - 26, Y(112), 52, 6); g.fillRect(x - 22, Y(118), 4, 26); g.fillRect(x + 18, Y(118), 4, 26);
      g.fillStyle = '#c9a24a'; roundRect(g, x - 9, Y(84), 18, 28, 5); g.fill(); g.fillStyle = '#a07e2e'; g.fillRect(x - 3, Y(78), 6, 6); g.fillRect(x + 9, Y(100), 6, 3);
      g.fillStyle = 'rgba(230,240,250,0.8)'; for (const dx of [-20, -14]) g.fillRect(x + dx, Y(104), 4, 8);
      if (P_ && P_.id === 'urn') for (let i = 0; i < 5; i++) { const k = ((P_.t * 0.8 + i / 5) % 1); g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x + Math.sin(k * 6 + i) * 4, Y(78) - k * 30); g.lineTo(x + Math.sin(k * 6 + i + 1) * 4, Y(74) - k * 30); g.stroke(); }
    }
    if (storyPrize('photos')) {                                   // five frames on the wall
      for (let i = 0; i < 5; i++) {
        const x = X(330 + i * 24), y = Y(60 + (i % 2) * 10), lit = P_ && P_.id === 'photos';
        g.fillStyle = '#5e3c1f'; g.fillRect(x - 9, y - 7, 18, 14); g.fillStyle = ['#9ec9e6', '#2b2b2b', '#e8c35a', '#57d68d', '#d98a5a'][i]; g.fillRect(x - 7, y - 5, 14, 10);
        if (lit) { g.strokeStyle = GOLD; g.lineWidth = 1.5; g.strokeRect(x - 10, y - 8, 20, 16); }
      }
    }
    if (storyPrize('gold')) {                                     // the golden ball on a plinth
      const x = X(985), hold = P_ && P_.id === 'gold', lift = hold ? Math.sin(Math.min(1, P_.t / 0.6) * Math.PI / 2) * 14 : 0;
      g.fillStyle = '#efe3c6'; g.fillRect(x - 10, Y(104), 20, 40); g.fillStyle = '#c9a24a'; g.fillRect(x - 12, Y(100), 24, 5);
      const gr = g.createRadialGradient(x - 3, Y(88) - lift - 3, 1, x, Y(88) - lift, 10); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(1, '#c9962a');
      g.fillStyle = gr; g.beginPath(); g.arc(x, Y(88) - lift, 9, 0, Math.PI * 2); g.fill();
      if (hold) for (let i = 0; i < 8; i++) { const a = i * 0.785 + P_.t * 2, r = 14 + (P_.t * 20) % 16; g.fillStyle = `rgba(255,230,140,${0.8 - ((P_.t * 20) % 16) / 20})`; star8(g, x + Math.cos(a) * r, Y(88) - lift + Math.sin(a) * r, 2.5); g.fill(); }
    }
  };
}
// the mural: outside, on the school wing (tap its marker)
{
  const _es = extSpots;
  extSpots = function () { const L = _es.apply(this, arguments); if (C && C.story && C.story.wing && storyPrize('mural')) L.push({ id: 'mural', x: 155, y: 300, cap: 'The weekend-school kids painted the whole team on the wall. Ammo Jamil is twice as tall as everyone, at his request.' }); return L; };
  const _sw = drawSchoolWing;
  drawSchoolWing = function (g, t) {
    _sw.apply(this, arguments);
    if (!storyPrize('mural')) return;
    const x0 = 40, top = 274, cols = ['#2c6e8f', '#7a1f2b', '#2e7d5b', '#c9a24a', '#5a2d6b', '#e85d5d', '#1c1c1c', '#f2cf6b'], tap = ExtFx.id === 'mural' ? ExtFx.t : 0;
    for (let i = 0; i < 8; i++) {                                 // eight painted figures under the windows, one of them very tall
      const fx = x0 + [18, 38, 58, 78, 152, 172, 192, 212][i], h = i === 1 ? 17 : 10, by = top + 102 - (tap ? Math.abs(Math.sin(tap * 6 + i)) * 3 : 0);   // either side of the door, under the sign
      g.fillStyle = cols[i]; g.fillRect(fx - 2.5, by - h, 5, h); g.beginPath(); g.arc(fx, by - h - 3, 3, 0, Math.PI * 2); g.fill();
    }
  };
}

// ---------------------------------------------------------------- the scenes
scn('P.1', { kind: 'walk', name: 'The masjid goes on', walk: 'P.1', next: 'P.R', hub: true });
scn('P.R', { kind: 'choice', name: 'Replay a tournament', replay: true, next: 'P.R' });
scn('PR.c', { kind: 'scene', name: 'Again', effect: 'replayStart', pickAfter: true, next: 'PR.g', lines: () => [
  ['saleem', 'Another season of the ' + STAGES[C.stage].title + '. Same masjid, same intention, a new draw.'], ['jamil', 'And the same result, in sha Allah.'], ['saleem', 'Pick who plays beside you.']] });
scn('PR.g', { kind: 'play', name: 'Replay game', bracket: true, stakes: () => storyReplayStakes(), win: () => storyChampNow() ? 'PR.t' : 'PR.g', loss: () => C.bracket && C.bracket.out ? 'PR.e' : 'PR.g', out: 'PR.e',
  winLines: [['saleem', 'Alhamdulillah. On to the next one.']], lossLines: [['saleem', 'Sabr. We go again.']] });
scn('PR.t', { kind: 'scene', name: 'Champions again', effect: 'replayTitle', next: 'P.R', hub: true, lines: () => [
  ['narr', 'Masjid Al-Amanah: ' + STAGES[C.stage].title + ' champions, again.'], ['saleem', 'Alhamdulillah. It never gets old.'], ['dawud', 'Neither does the chai.']] });
scn('PR.e', { kind: 'scene', name: 'Out this time', next: 'P.R', hub: true, lines: [['saleem', 'Not this time. That’s the game, and the game is good to us.'], ['jamil', 'Next season. I say this a lot, no?']] });
scn('PR.a', { kind: 'play', name: 'All-star game', mode: 'allstar', win: 'P.R', loss: 'P.R', winLines: [['rayyan', 'Dunks only again? Fine. You won. Again.']], lossLines: [['rayyan', 'Al-Furqan takes this one. The crowd loved it anyway.']] });
scn('PR.h', { kind: 'play', name: 'CHAI', mode: 'chai', win: 'P.R', loss: 'P.R', winLines: () => storyChaiLines(true), lossLines: () => storyChaiLines(false) });
SC['PR.a'].hub = SC['PR.h'].hub = true;

STORY_WALKS['P.1'] = { title: 'The masjid goes on', npcs: [
    { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, lines: [['jamil', 'The Cup is in the case. I polish it twice now. Morning and night.']] },
    { id: 'musa', x: 1120, z: 430, act: 'shoot', face: 1, lines: [['musa', 'Youth league starts Saturday. Twenty kids signed up. Twenty-one if you count Ammo Jamil.']] },
    { id: 'karim', x: 1180, z: 200, act: 'host', face: -1, lines: [['karim', 'Every classroom full, every Saturday. Come and visit, the kids want to meet you.']] },
    { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true,
      lines: [['saleem', 'The story is over, akhi. The masjid isn’t. It never is.'], ['saleem', 'Whenever you like, we play any tournament again. A new season, a new draw.'],
        ['saleem', 'And the brothers have things they’d like to see you do. Look at My Player, Milestones. Each one, someone will want to talk to you about it.'],
        ['saleem', 'Do enough of them and Imam Dawud says he has gifts. I am afraid one of them is a chai urn.']] }],
  start: [['narr', 'A week after the Cup. The gym after Isha, the same as always, and not the same at all.']] };

const STORY_MOMENTS = {
  first_win: [['saleem', 'Do you remember your first league win with us?'], ['you', 'I remember Ammo Jamil hugging the referee.'], ['saleem', 'He apologised later. Everything starts somewhere, akhi. Alhamdulillah for the first one.']],
  t_local: [['jamil', 'Nineteen years, and you were there when it ended. Come, sit.'], ['jamil', 'I keep the masjid league trophy where I can see it from the door. Every time I walk in, I remember.'], ['jamil', '…Also, it was your box-outs. I tell everyone.']],
  t_state: [['karim', 'I put the State photo in my classroom. The kids ask about it every week.'], ['karim', 'I tell them: discipline. Elbow in, follow through. Same in recitation, same in life.'], ['you', 'Do they listen?'], ['karim', 'One of them does. Every class needs one.']],
  t_nat: [['ilyas', 'Can I tell you something? Since Nationals, my dad hasn’t said “bend your knees” once.'], ['ilyas', 'He says “good game” now. Every game. Even the ones we lose.'], ['ilyas', 'Thank you for being there for that. Really.']],
  t_world: [['dawud', 'A brother from Sarajevo wrote to me. He wants our chai recipe.'], ['dawud', 'I said: come to Eastside, and I will make it for you myself. Some things you cannot write down.'], ['dawud', 'The ummah is big, akhi. Tonight it feels small. In a good way.']],
  chem_saleem: [['saleem', 'You know where I’ll pass before I do now.'], ['saleem', 'The Prophet ﷺ said the believers are like one body. On the court, I think I finally understand it.']],
  chem_jamil: [['jamil', 'You and me. Defense. Nobody scores.'], ['jamil', 'I don’t say this often: you are like a second son to me. Don’t tell Ilyas, he gets jealous.'], ['ilyas', 'I heard that, Dad.']],
  chem_ilyas: [['ilyas', 'We don’t even talk on the court anymore. We just know.'], ['ilyas', 'When I was a kid, I wanted a big brother. Took a while. Alhamdulillah.']],
  chem_karim: [['karim', 'Your shot is better. I won’t say it’s because of me. It is because of me.'], ['karim', 'Seriously, akhi: you listen. That is the rarest skill there is.']],
  chem_anas: [['anas', 'You run the pick-and-roll like you can read my mind.'], ['anas', 'May Allah keep this brotherhood, on the court and off it. Ameen.']],
  chem_dawud: [['dawud', 'At my age, a good teammate is a gift. You are a gift, akhi.'], ['dawud', 'Come, a glass of chai. The good glass. I keep it for the special ones.']],
  chem_musa: [['musa', 'Bro. Bro. We’re like… the best duo in the masjid.'], ['musa', 'When I took my shahadah, I was scared nobody would know me. Now look. I have you.']],
  stat10: [['anas', 'A ten. Masha’Allah. Do you know how much work that takes?'], ['anas', 'I do. I watched you in the gym when everyone else had gone home.']],
  all7: [['saleem', 'Seven or better in everything. You can do whatever the team needs now.'], ['saleem', 'That’s what a masjid needs too: people who can carry any part of it.']],
  games50: [['musa', 'Fifty games, akhi! I counted. Well, Ustath Karim counted. I helped.'], ['musa', 'Next fifty, I want to win HORSE against you at least once.']],
  rival5: [['rayyan', 'Five times. Five! My uncle is furious. He’s also asked me to ask you to come to dinner.'], ['rayyan', 'Al-Furqan and Al-Amanah. Same street, same Lord. See you on the court, brother.']],
  allstar5: [['musa', 'FIVE DUNKS. In one game! The crowd was SHAKING.'], ['musa', 'Teach me. Please. Fundamentals first, I know, I know. Then dunks.']],
  chai: [['dawud', 'You won CHAI. So someone else made the chai.'], ['dawud', 'It was terrible. Thank you. I have not laughed like that in years.']],
  events: [['anas', 'Lights out, CHAI, the all-star game, the draw in Istanbul. You did all of it.'], ['anas', 'Some people only remember the trophies. I remember the nights in between.']],
  fund150: [['karim', 'One hundred and fifty thousand. The wing is built, so the board has a new idea: scholarships.'], ['karim', 'Every child at the weekend school, whatever their family can pay. Because of the games you played.']],
  replay: [['saleem', 'Champions again. You don’t need the story to have a reason to play.'], ['saleem', 'This is what it was always about: brothers, a ball, a masjid, and Allah’s blessing on all of it.']]
};
const STORY_FINAL = [
  ['narr', 'Every milestone. Late one night after Isha, the brothers are all still in the gym.'],
  ['dawud', 'We have something for you, {name}. A basketball, painted gold. The kids did it at the weekend school.'],
  ['ilyas', 'It goes on a stand in the gym, where everyone can see it.'],
  ['karim', 'One day a new brother will walk in here, nervous, and ask about it. And we will tell him about you.'],
  ['musa', 'And then we will make him play HORSE.'],
  ['saleem', 'The Prophet ﷺ said: the most beloved of people to Allah are those most beneficial to people. You were that for us. JazakAllahu khayran, akhi.'],
  ['narr', 'The golden ball now sits on its stand in the gym. Walk up to it any time.']
];
