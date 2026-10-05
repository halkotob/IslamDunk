// ================================================= v6.0: DAILY SCENARIOS
// A new late-game situation every day, generated from the date (everyone gets the
// same one): the score, the clock, who has the ball, the teams, the venue, which
// player you control and a twist. Retry as often as you like; there's no streak,
// so skipping a day costs nothing. Completing it once a day also gives your career
// save a small BP and Halal Bucks bonus.
const SCEN_TWISTS = [
  { id: 'win', t: 'Win the game' }, { id: 'three', t: 'Win, and hit at least one three' }, { id: 'clean', t: 'Win without a shove or a hard foul' },
  { id: 'by3', t: 'Win by 3 or more' }, { id: 'dunk', t: 'Win, and throw one down' }, { id: 'assist', t: 'Win, with at least one assist from you' },
  { id: 'stop', t: 'Get a stop first, then win', poss: 1 }
];
function scenarioOf(day) {
  const R = seededRng(hash32('scen|' + day)), pk = a => a[Math.floor(R() * a.length)];
  const a = Math.floor(R() * TEAMS.length); let b = Math.floor(R() * (TEAMS.length - 1)); if (b >= a) b++;
  const time = pk([12, 16, 20, 24, 30, 36, 45]), diff = pk([-1, -2, -3, -3, -4, -5, -6, 0, 0, 2]);
  const poss = diff >= 1 ? 1 : (R() < 0.75 ? 0 : 1), base = 38 + Math.floor(R() * 18);
  const twists = SCEN_TWISTS.filter(t => (t.poss == null || t.poss === poss) && !(t.id === 'by3' && diff < -3));
  const twist = pk(twists), slot = Math.floor(R() * 2);
  const venues = VENUE_LIST.filter(v => !venueLocked(v)), vb = pk(venues);
  const title = diff < 0 ? 'Down ' + -diff + ', ' + time + ' seconds left' : diff === 0 ? 'Tied, ' + time + ' seconds left' : 'Up ' + diff + ', ' + time + ' seconds left';
  return { day, a, b, time, diff, poss, us: base + diff, them: base, twist, slot, vid: vb.id, title, L: pk([1.0, 1.2, 1.35, 1.5]) };
}
function scenProgress(day) { const pr = Progress.load(); return (pr.scen || {})[day] || { tries: 0, done: false }; }
function openScenBrief() { Game.scen = scenarioOf(dailyKey()); Game.screen = 'scenbrief'; Game.idx = 0; SFX.blip(); }
function startScenario() {
  const S = Game.scen || (Game.scen = scenarioOf(dailyKey()));
  Game.paused = false; Game.trivia = null; Game.finalTab = 0;
  const base = VENUE_LIST.find(v => v.id === S.vid) || VENUE_LIST[0], venue = makeVenue(base, { time: 'night' });
  newMatch(TEAMS[S.a], TEAMS[S.b], { humans: [{ team: 0, slot: S.slot, pad: 0 }], aiCfg: [diffAt(1.0), diffAt(S.L)], venue, fmt: { format: 'quarters', len: 120, sc: 24 }, fun: null });
  M.quarter = 4; M.clock = S.time; M.teams[0].score = S.us; M.teams[1].score = S.them;
  M.teams[0].qs = [Math.floor(S.us / 3), Math.floor(S.us / 3), S.us - 2 * Math.floor(S.us / 3)]; M.teams[1].qs = [Math.floor(S.them / 3), Math.floor(S.them / 3), S.them - 2 * Math.floor(S.them / 3)];
  M.teamFouls = [3, 4]; M.timeouts = [1, 1];
  for (const p of M.players) { p.turbo = 75; p.fat = 0.25; }
  M.scenario = Object.assign({}, S, { threes: 0, dunks: 0, assist: false, stop: S.poss === 1 ? null : true, done: false });
  frontcourtSetup(S.poss, 'run'); M.introT = 0;
  FX.callout(S.title.toUpperCase(), '#ffd76a', S.twist.t.toUpperCase(), true);
  Game.screen = 'play'; Game.lastMatch = null;
}
function scenScore(sh, shooter) {
  const S = M.scenario; if (!S || S.done) return;
  if (shooter.team === 0) {
    if (sh.pts === 3) S.threes++; if (sh.dunk) S.dunks++;
    const lp = ball.lastPasser; if (lp && lp.human >= 0 && lp !== shooter && lp.team === 0 && M.time - ball.lastPassT < 4) S.assist = true;
  } else if (S.stop === null) S.stop = false;
}
function scenPossession(p) { const S = M.scenario; if (S && !S.done && S.stop === null && p.team === 0 && M.phase === 'live') S.stop = true; }
{
  const _fs = ftScore;
  ftScore = function (h) { const S = M.scenario; if (S && M.ft && M.ft.team === 1 && S.stop === null) S.stop = false; _fs(h); };
  const _fm = finishMatch;
  finishMatch = function () {
    _fm.apply(this, arguments);
    const S = M.scenario; if (!S || S.done || M.attract) return;
    S.done = true;
    const me = M.players.find(p => p.human === 0), won = M.winner === 0, margin = M.teams[0].score - M.teams[1].score;
    const tw = { win: true, three: S.threes > 0, clean: !(me && (me.shoves || me.hardFouls)), by3: margin >= 3, dunk: S.dunks > 0, assist: S.assist, stop: S.stop === true }[S.twist.id];
    S.won = won; S.twistOK = !!tw; S.ok = won && !!tw;
    const pr = Progress.update(o => { o.scen = o.scen || {}; const d = o.scen[S.day] = o.scen[S.day] || { tries: 0, done: false }; d.tries++; if (S.ok) d.done = true; });
    const d = pr.scen[S.day];
    if (S.ok) {
      Ach.unlock('scen_win');
      if (!d.rewarded) {
        const save = C || readSave(SAVE_AUTO);
        if (save) { save.bp += 60; save.hb += 60; if (C) saveCareer(); else try { localStorage.setItem(SAVE_AUTO, JSON.stringify(save)); } catch (e) {} S.reward = true; }
        Progress.update(o => { o.scen[S.day].rewarded = true; });
      }
    }
    S.tries = d.tries;
  };
  const _df = drawFinalScreen;
  drawFinalScreen = function (g) { if (M.scenario) return drawScenResult(g); _df(g); };
  const _fu = finalUpdate;
  finalUpdate = function () {
    if (!M.scenario) return _fu();
    if (Input.pressed.KeyR) { startScenario(); return; }
    if (menuHit('ok') || menuHit('back')) goTitle();
  };
}
function drawScenBrief(g) {
  const S = Game.scen; if (!S) return;
  dim(g, 0.7);
  const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); const rw = W; W = 960;
  const A = TEAMS[S.a], B = TEAMS[S.b], pr = scenProgress(S.day), you = A.players[S.slot];
  panel(g, W / 2 - 360, 40, 720, 450, true);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('DAILY SCENARIO  •  ' + S.day, W / 2, 72);
  g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText(S.title, W / 2, 112);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText('Fourth quarter  •  ' + (S.poss === 0 ? 'Your ball, frontcourt' : 'Their ball'), W / 2, 138);
  [[A, W / 2 - 180, S.us], [B, W / 2 + 180, S.them]].forEach(([T, x, sc]) => {
    drawCrest(g, x, 190, 26, T); g.fillStyle = '#fff'; g.font = `17px ${FONT}`; g.fillText(T.name, x, 238); g.fillStyle = GOLD; g.font = `34px ${FONT}`; g.fillText(String(sc), x, 278);
  });
  g.fillStyle = '#fff'; g.font = `22px ${FONT}`; g.fillText('vs', W / 2, 250);
  g.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(g, W / 2 - 320, 300, 640, 92, 12); g.fill();
  g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('TODAY’S TWIST', W / 2, 322);
  g.fillStyle = '#fff'; g.font = `19px ${FONT}`; g.fillText(S.twist.t, W / 2, 350);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('You control ' + you.name + '  •  Poise matters here: pressure is on', W / 2, 376);
  g.fillStyle = pr.done ? '#9dffb0' : '#9fb3c8'; g.font = `13px ${BODY}`;
  g.fillText(pr.done ? 'Completed today, masha’Allah. Play again for fun.' : pr.tries ? 'Attempts today: ' + pr.tries : 'First try today. Complete it for a career bonus (+60 BP, +60 HB).', W / 2, 414);
  g.fillStyle = GOLD; roundRect(g, W / 2 - 90, 434, 180, 40, 20); g.fill();
  g.fillStyle = NIGHT; g.font = `17px ${FONT}`; g.fillText('Play', W / 2, 460);
  addRect(W / 2 - 90 + o, 434, 180, 40, startScenario);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Enter to play  •  Esc to go back  •  A new scenario every day', W / 2, 508);
  W = rw; g.restore();
}
function drawScenResult(g) {
  const S = M.scenario;
  dim(g, 0.72);
  const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); const rw = W; W = 960;
  panel(g, W / 2 - 300, 80, 600, 360, true);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('DAILY SCENARIO  •  ' + S.title.toUpperCase(), W / 2, 112);
  g.fillStyle = S.ok ? '#9dffb0' : '#ffb0b0'; g.font = `40px ${FONT}`; g.fillText(S.ok ? 'COMPLETE' : 'NOT THIS TIME', W / 2, 164);
  g.fillStyle = '#fff'; g.font = `18px ${BODY}`; g.fillText('Final ' + M.teams[0].score + ' – ' + M.teams[1].score, W / 2, 200);
  const line = (y, ok, t) => { g.fillStyle = ok ? '#57e389' : '#ff8a7a'; g.font = `16px ${FONT}`; g.fillText((ok ? '✓  ' : '✗  ') + t, W / 2, y); };
  line(240, S.won, 'Win the game'); if (S.twist.id !== 'win') line(268, S.twistOK, S.twist.t.replace(/^Win, and |^Win, with |^Win /, '').replace(/^./, c => c.toUpperCase()));
  g.fillStyle = IVORY; g.font = `14px ${BODY}`;
  g.fillText(S.reward ? 'Career bonus added: +60 BP, +60 Halal Bucks' : S.ok ? 'Completed today' : 'Attempts today: ' + (S.tries || 1), W / 2, 316);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('R to try again  •  Enter to finish  •  A new scenario tomorrow', W / 2, 400);
  W = rw; g.restore();
  addRect(0, 0, W, H, goTitle);
}
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    if (Game.screen === 'scenbrief') {
      Game.t += rdt; FX.updateReal(rdt); Game.keepInput = false; Game.interp = false; Net.update(rdt);
      const tap = Input.taps[0];
      if (tap) for (const r of Game.rects.slice().reverse()) if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) { SFX.blip(); r.fn(); return; }
      if (menuHit('ok')) startScenario(); else if (menuHit('back')) goTitle(); else attractTick(rdt);
      return;
    }
    _gu(rdt);
  };
}

// ================================================= v6.0: SAVE MIGRATION + SCREEN GLUE
function migrateV6(o) {
  o = o || {};
  if ((o.sv || 1) >= 3) return;                                      // already a v6 save
  C.sv = 3;
  if (!o.partner) C.partner = 'saleem';
  C.chem = Object.assign({ saleem: 25, nasser: 10, khalil: 10, tariq: 5 }, o.chem || {});
  if (!o.season) C.season = 1;
  if (!Array.isArray(o.titles)) C.titles = (C.trophies || []).map(st => ({ s: 1, st, w: 0, l: 0 }));
  if (!Array.isArray(o.games)) C.games = [];
  if (!Array.isArray(o.history)) C.history = [];
  // an untouched knockout bracket becomes a group stage now; one already in progress finishes as a knockout
  const b = C.bracket;
  if (b && !b.fmt && !b.out && !b.champ && b.round === 0 && b.rounds && b.rounds[0] && b.rounds[0].every(m => m.w == null)) C.bracket = makePoolBracket(C.stage);
}
CAREER_SCREENS.add('cstats'); CAREER_SCREENS.add('newseason');
{
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'cstats') return statsUpdate();
    if (Game.screen === 'newseason') return newSeasonUpdate();
    if (Game.screen === 'pregame' && (menuHit('left') || menuHit('right'))) { cyclePartner(menuHit('left') ? -1 : 1); return; }
    _cu(rdt);
  };
  const _cr = careerRender;
  careerRender = function (g) {
    if (Game.screen === 'cstats') { dim(g, 0.6); drawStats(g); return; }
    if (Game.screen === 'newseason') { dim(g, 0.6); drawNewSeason(g); return; }
    _cr(g);
    if (Game.screen === 'pregame') drawPartnerPicker(g);
    if (Game.screen === 'hub' && (C.season || 1) > 1) { g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('SEASON ' + C.season, 360, 32); }
  };
  const _sm = startMini;
  startMini = function (kind, opp) { Gym.miniOpp = opp; _sm(kind, opp); };
  const _fmi = finishMini;
  finishMini = function () { const mg = M.mini, horseVs = mg && mg.kind === 'horse' ? Gym.miniOpp : null; _fmi(); if (horseVs && PARTNERS.includes(horseVs)) { addChem(horseVs, 3); saveCareer(); } };
  const _fd = finishDrill;
  finishDrill = function () { const had = !!Gym.drill; _fd(); if (had && C) { addChem(C.partner || 'saleem', 1); saveCareer(); } };
}

