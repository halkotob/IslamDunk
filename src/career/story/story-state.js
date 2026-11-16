// ================================================= v9.25: THE CAREER STORY — Chapter 3, the State league
// The table: nine teams, each plays the other eight once (eight games for us; our bye is the last round). The top four
// go to the semifinals (1 vs 4, 2 vs 3), then the final. It is the group stage's bracket with one pool of nine
// (fmt 'pool', table: true), so the semifinal and final logic, standings and the league's box scores carry over.
// Also here: HORSE with the word CHAI (C3.6), the dunks-only all-star game with its crowd meter (C3.10), the injured
// teammate (C3.14, back for the playoffs at C3.18), and a teammate pick after a scene (C3.2).
const TABLE_GAMES = 8;
function makeTableBracket(stage) {
  const R = seededRng(C.seed + stage * 131 + (C.retries || 0) * 17 + (C.season || 1) * 7919);
  const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, -1];                       // -1: the bye
  for (let i = slots.length - 1; i > 1; i--) { const j = 1 + Math.floor(R() * i); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const rounds = [];
  for (let r = 0; r < 9; r++) {                                        // the circle method: slot 0 stays, the rest turn
    const g = []; for (let i = 0; i < 5; i++) { const a = slots[i], b = slots[9 - i]; if (a >= 0 && b >= 0) g.push([a, b]); }
    rounds.push(g); slots.splice(1, 0, slots.pop());
  }
  const bye = rounds.findIndex(g => !g.some(x => x[0] === 0 || x[1] === 0));
  rounds.push(rounds.splice(bye, 1)[0]);                               // our bye is the last round
  const pg = []; rounds.forEach((g, md) => g.forEach(([a, b]) => pg.push({ a, b, md })));
  return { fmt: 'pool', table: true, round: 0, md: 0, out: false, pools: [[0, 1, 2, 3, 4, 5, 6, 7, 8]], pg: [pg], rounds: [] };
}
function storyFormatBracket(stage) { return stage === 1 ? makeTableBracket(stage) : null; }
const isTable = () => !!(C && C.bracket && C.bracket.table);
function storyTablePos() { const b = C.bracket; return b && b.table ? standings(b, 0).findIndex(r => r.id === 0) + 1 : 0; }
// our table game: record it, play the round's other games; after the eighth, the bye round and the semifinal draw
function storyTableResult(won, us, them) {
  const b = C.bracket, m = ourMatch();
  if (m.a === 0) { m.sa = us; m.sb = them; } else { m.sb = us; m.sa = them; }
  m.w = won ? 0 : (m.a === 0 ? m.b : m.a);
  for (const g of b.pg[0]) if (g.md === b.md && g !== m && g.w == null) simCareerMatch(g);
  b.md++;
  if (b.md < TABLE_GAMES) return 'next';
  for (const g of b.pg[0]) if (g.w == null) simCareerMatch(g);
  const s = standings(b, 0);
  b.rounds.push([{ a: s[0].id, b: s[3].id }, { a: s[1].id, b: s[2].id }]);
  if (s.findIndex(r => r.id === 0) > 3) {
    b.out = true; b.outGroup = true;
    for (const x of b.rounds[0]) simCareerMatch(x);
    b.rounds.push([{ a: b.rounds[0][0].w, b: b.rounds[0][1].w }]); simCareerMatch(b.rounds[1][0]);
    return 'out';
  }
  b.round = 1; return 'next';
}
{
  const _om = ourMatch;
  ourMatch = function () { const b = C.bracket; if (b && b.table && b.round === 0) return b.pg[0].find(m => m.md === b.md && (m.a === 0 || m.b === 0)); return _om.apply(this, arguments); };
  const _lrc = LEAGUE._rc;                                             // the league's dry run (lgNeeds) plays the bracket logic too
  LEAGUE._rc = function (won, us, them) { if (isTable() && C.bracket.round === 0) return storyTableResult(won, us, them); return _lrc.apply(this, arguments); };
  const _rc = recordCareerResult;
  recordCareerResult = function (won, us, them) {
    if (!isTable() || C.bracket.round > 0) return _rc.apply(this, arguments);
    if (LEAGUE.mode === 'real') lgResolve(won, us, them, null);
    return storyTableResult(won, us, them);
  };
  const _rj = lgRoundJobs;
  lgRoundJobs = function () {
    const b = C && C.bracket; if (!b || !b.table || b.round > 0 || b.out || C.seasonOver) return _rj.apply(this, arguments);
    return b.pg[0].filter(g => g.md === b.md && g.a !== 0 && g.b !== 0 && g.w == null).map(g => lgJob(b, g));
  };
  const _rl = roundLabel;
  roundLabel = function (b, r) { if (b && b.table && (r == null ? b.round : r) === 0) return 'League game ' + Math.min(TABLE_GAMES, (b.md || 0) + 1); return _rl.apply(this, arguments); };
  const _bs = buildScout;
  buildScout = function () {
    const b = C.bracket; if (!b || !b.table) return _bs.apply(this, arguments);
    const m = ourMatch(), oppId = m.a === 0 ? m.b : m.a, sc = scoutCore(oppId), path = [];
    sc.round = roundLabel(b);
    for (const q of b.pg[0]) { if (q.w == null || (q.a !== oppId && q.b !== oppId) || q.a === 0 || q.b === 0) continue; const o = q.a === oppId ? q.b : q.a, us = q.a === oppId ? q.sa : q.sb, them = q.a === oppId ? q.sb : q.sa; path.push((q.w === oppId ? 'Beat ' : 'Lost to ') + teamOf(C.stage, o).name.replace('Masjid ', '') + ' ' + us + '–' + them); }
    sc.path = path.slice(-3);
    const rows = standings(b, 0), pos = rows.findIndex(r => r.id === 0), opos = rows.findIndex(r => r.id === oppId);
    sc.extra = b.round === 0 ? 'The table: you are ' + ordinal(pos + 1) + ', they are ' + ordinal(opos + 1) + '. The top four reach the semifinals.' : oppId === 1 ? 'Al-Furqan again. Rayyan has been waiting.' : 'Single elimination now.';
    return sc;
  };
  // the bracket screen: the table of nine, then the semifinals and the final
  const _dcb = drawCareerBracket;
  drawCareerBracket = function (g) {
    const b = C.bracket; if (!b || !b.table) return _dcb.apply(this, arguments);
    const S = STAGES[C.stage], TT = Input.touchMode && g === ctx;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(S.title, W / 2, 44);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(TT ? 'Everyone plays everyone. Top four to the semis.' : 'Nine teams, everyone plays everyone once. The top four go to the semifinals.', W / 2, 66);
    const x = 40, rows = standings(b, 0), rh = TT ? 35 : 38;
    panel(g, x, 80, 580, 30 + rows.length * rh, false);
    g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('TABLE', x + 14, 100); g.textAlign = 'right'; g.fillText('W-L      +/-', x + 564, 100);
    rows.forEach((r, k) => {
      const y = 100 + (k + 1) * rh, t = teamOf(C.stage, r.id);
      if (k < 4) { g.fillStyle = 'rgba(87,214,141,0.12)'; g.fillRect(x + 6, y - rh + 12, 568, rh - 4); }
      g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(String(k + 1), x + 14, y);
      drawCrest(g, x + 46, y - 5, 9, t);
      g.fillStyle = r.id === 0 ? '#ffe38a' : '#fff'; g.font = `13px ${r.id === 0 ? FONT : BODY}`; g.fillText(fitText(g, t.name.replace('Masjid ', '') + (t.place ? '  (' + t.place + ')' : ''), 360), x + 62, y);
      g.textAlign = 'right'; g.fillStyle = IVORY; g.fillText(r.w + '-' + r.l + '      ' + ((r.pf - r.pa) >= 0 ? '+' : '') + (r.pf - r.pa), x + 564, y);
    });
    const kx = 660; g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('SEMIFINALS', kx, 100); g.fillText('FINAL', kx, 310);
    const box = (m, y, ph) => {
      panel(g, kx, y, 260, TT ? 64 : 58, m && (m.a === 0 || m.b === 0));
      [[m && m.a, m && m.sa], [m && m.b, m && m.sb]].forEach(([id, sc], k) => {
        const yy = TT ? y + 25 + k * 26 : y + 23 + k * 23; g.textAlign = 'left';
        if (id == null) { g.fillStyle = '#56657a'; g.font = `13px ${BODY}`; g.fillText(ph[k], kx + 14, yy); return; }
        const t = teamOf(C.stage, id), lost = m.w != null && m.w !== id;
        drawCrest(g, kx + 16, yy - 5, 8, t); g.fillStyle = lost ? '#6d7a8c' : id === 0 ? '#ffe38a' : '#fff'; g.font = `12px ${id === 0 ? FONT : BODY}`;
        g.fillText(fitText(g, t.name.replace('Masjid ', ''), 170), kx + 30, yy); g.textAlign = 'right'; if (sc != null) g.fillText(String(sc), kx + 248, yy);
      });
    };
    const R0 = b.rounds[0] || [null, null], R1 = b.rounds[1] || [null];
    box(R0[0], 112, ['1st', '4th']); box(R0[1], 184, ['2nd', '3rd']); box(R1[0], 322, ['Semifinal winner', 'Semifinal winner']);
    if (b.out) { g.textAlign = 'center'; g.fillStyle = '#ffb0b0'; g.font = `14px ${FONT}`; g.fillText(b.outGroup ? 'Out: not in the top four' : 'Eliminated', kx + 130, 420); }
    g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText(Input.touchMode ? 'Tap to go back' : 'Press Enter or tap to go back', W / 2, 516);
    addRect(0, 0, W, H, careerHub);
  };
}
// C3.17's stakes: must-win while the top four is on the line
function storyTableStakes() { const p = storyTablePos(); return p >= 3 && p <= 6 ? 'must-win' : 'regular'; }

// ---------------------------------------------------------------- a teammate pick after a scene (C3.2)
function storyPickThen(S, then) {
  let i = Math.max(0, STORY_MATES.indexOf(C.partner || 'saleem'));
  if (!storyPickable(STORY_MATES[i])) i = STORY_MATES.findIndex(storyPickable);
  Game.spick = { S, sel: i, then }; Game.screen = 'spick'; SFX.blip();
}
{
  const _sp = storyPick;
  storyPick = function (i) {
    const P = Game.spick; if (!P || !P.then) return _sp.apply(this, arguments);
    const id = STORY_MATES[i]; if (!storyPickable(id)) { SFX.bad && SFX.bad(); return; }
    C.partner = id; Game.spick = null; saveCareer(); SFX.good && SFX.good();
    playStory(storyPickLines(id), P.then, storyTitleOf(P.S)); storyTagJournal(P.S);
  };
  const _ps = storyPlayScene;
  storyPlayScene = function (S) {
    if (!S.pickAfter) return _ps.apply(this, arguments);
    if (S.effect && STORY_EFFECTS[S.effect]) STORY_EFFECTS[S.effect](S);
    saveCareer();
    playStory(storyLinesOf(S), () => storyPickThen(S, () => storyDone(S, 'next')), storyTitleOf(S));
    if (Game.story) Game.story.sid = S.id;
    storyTagJournal(S);
  };
  // C3.14: your teammate is hurt; his scene, then the pick without him
  const _cs = storyChoiceStart;
  storyChoiceStart = function (S) {
    if (!S.injure) return _cs.apply(this, arguments);
    if (!C.story.injured) { C.story.injured = C.partner || 'saleem'; saveCareer(); }
    playStory(storyLinesOf(S), () => { storyChoiceStartPick(S); if (!storyPickable(STORY_MATES[Game.spick.sel])) Game.spick.sel = STORY_MATES.findIndex(storyPickable); }, storyTitleOf(S));
    if (Game.story) Game.story.sid = S.id;
    storyTagJournal(S);
  };
}
Object.assign(STORY_EFFECTS, {
  heal() { const id = C.story.injured; if (id) { C.story.injured = null; if (!(C.bracket && C.bracket.out)) C.partner = id; } },
  allstarFund() { const A = C.story.allstar; if (A && !A.paid) { A.paid = true; A.fund = 1500 + A.dunks * 750 + Math.round(A.crowd * 4000); storyFund(A.fund, 'All-star game'); } }
});
{
  const _ns = STORY_EFFECTS.nextSeason;
  STORY_EFFECTS.nextSeason = function () { _ns.apply(this, arguments); C.story.injured = null; C.story.allstar = null; };
}
function storyInjuryLines() { const id = C.story.injured || 'saleem'; return (STORY_INJURY[id] || STORY_INJURY.saleem).map(l => [l[0], l[1]]); }
function storyReturnLine() { const id = C.story.injured; return id ? [[id, (STORY_RETURN[id] || 'I’m back. Put me in.')]] : []; }

// ---------------------------------------------------------------- C3.6: HORSE with the word CHAI
STORY_MODES.chai = function (S) {
  const opp = C.partner && C.partner !== 'saleem' ? C.partner : 'jamil';
  enterGym();
  setupMini('horse', { opp, humans: [{ team: 0, slot: 0, pad: 0 }] });
  M.mini.word = 'CHAI';
  Gym.drill = { kind: 'horse', mini: true, story: S.id };
  C.story.chaiOpp = opp;
  gymToast('CHAI: make a shot, then ' + castDef(opp).name + ' has ' + M.mini.timerLen + ' seconds to match it. Miss a shot you have to match and you get a letter. Spell CHAI and you make the chai.', 5);
};
{
  const _fm = finishMini;
  finishMini = function () {
    const d = Gym.drill; if (!d || !d.story || !storyOn() || M.mini.kind !== 'horse') return _fm.apply(this, arguments);
    const S = SC[d.story], r = M.mini.result(), won = !!r.won, bp = drillBP(won ? 50 : 15);
    bankPractice(bp, practiceHB(won));
    Gym.drill = null; Gym.result = null; setupPractice('free');
    storyPost(S, won, won ? 'won' : 'lost', 'CHAI: ' + (won ? 'you won. ' + castDef(C.story.chaiOpp || 'jamil').name + ' makes the chai.' : 'you spelled CHAI. You make the chai.') + '   +' + bp + ' BP');
  };
}
function storyChaiLines(won) {
  const o = C.story.chaiOpp || 'jamil', n = castDef(o).name;
  return won ? [[o, 'Fine. FINE. Where does Imam Dawud keep the cardamom?'], ['dawud', 'Top shelf. Not that one, that’s cumin.'], ['narr', n + ' makes the chai. It is… mostly chai.'], ['musa', 'It’s crunchy. Why is it crunchy?'], [o, 'Respect the chai.']]
    : [['dawud', 'Loser makes the chai. Come, I will teach you. Water, black tea, crushed cardamom, a little ginger.'], ['dawud', 'Then the milk. Let it rise three times. Patience is half the recipe.'], ['narr', 'You make the chai. The brothers drink it in silence.'], [o, '…This is better than Imam Dawud’s.'], ['dawud', 'Astaghfirullah. Don’t say that out loud.']];
}

// ---------------------------------------------------------------- C3.10: the all-star game, dunks only
// A 2v2 exhibition where only a dunk scores (a jumper or a layup goes in for nothing, and the other team takes it out).
// The crowd meter fills with every dunk, more for ours and for the big ones. C3.11 turns it into money for the school.
STORY_MODES.allstar = function (S) {
  const mate = C.partner || 'saleem', F = teamOf(1, 1);
  const us = Object.assign({}, STORY_HOME, { players: [partnerDef(mate), playerDef()] });
  const them = Object.assign({}, F, { name: 'Al-Furqan All-Stars', players: F.players.slice(0, 2) });
  storyExhibition(S, us, them, { L: careerLevels(1).opp - 0.3, fmt: { format: 'first21', target: 11 } });
  M.story.dunks = { n: 0, crowd: 0.1, t: 0 };
  FX.callout && FX.callout('DUNKS ONLY!', '#ffd76a', 'ALL-STAR GAME');
};
{
  const _os = onScore;
  onScore = function (h) {
    const D = M.story && M.story.dunks;
    if (!D || M.mini || (M.practice && M.practice.kind !== '1v1') || (M.phase === 'ft' && M.ft)) return _os.apply(this, arguments);
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null, dunk = !!(sh && sh.dunk), shooter = sh && sh.shooter;
    const s0 = [M.teams[0].score, M.teams[1].score], p0 = shooter ? shooter.stats.pts : 0, pe = M.pendingEnd;
    const r = _os.apply(this, arguments);
    if (!dunk) {
      const qi = M.quarter - 1;
      for (const t of [0, 1]) { const d = M.teams[t].score - s0[t]; if (d) { M.teams[t].score -= d; M.teams[t].qs[qi] = (M.teams[t].qs[qi] || 0) - d; } }
      if (shooter) shooter.stats.pts = p0;
      M.pendingEnd = pe;
      FX.callout && FX.callout('DUNKS ONLY!', '#ffb36b', 'NO POINTS');
    } else {
      const ours = shooter ? shooter.team === 0 : h === hoops[1];
      if (ours) D.n++;
      D.crowd = Math.min(1, D.crowd + (ours ? 0.1 : 0.04) + (sh.big ? 0.05 : 0)); D.t = 1.2;
    }
    return r;
  };
  const _um = updateMatch;
  updateMatch = function (dt) { const r = _um.apply(this, arguments); const D = M.story && M.story.dunks; if (D && D.t > 0) D.t -= dt; return r; };
  const _ds = drawScene;
  drawScene = function (g) {
    const r = _ds.apply(this, arguments);
    const D = M.story && M.story.dunks;
    if (D && Game.screen === 'play') {                                 // the crowd meter (the ticket sales), top centre
      const w = 240, x = W / 2 - w / 2, y = 108, k = D.crowd, pop = D.t > 0 ? 1 + 0.06 * Math.sin(D.t * 20) : 1;
      g.save(); g.translate(W / 2, y + 14); g.scale(pop, pop); g.translate(-W / 2, -(y + 14));
      g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x - 10, y - 16, w + 20, 44, 12); g.fill();
      g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `11px ${FONT}`; g.fillText('CROWD  •  DUNKS ONLY  •  ' + D.n + ' DUNK' + (D.n === 1 ? '' : 'S'), W / 2, y - 2);
      meter(g, x, y + 6, w, 12, k, k > 0.75 ? '#ffd76a' : '#57e389');
      g.restore();
    }
    return r;
  };
  // the result is kept for C3.11
  const _ae = storyAfterExhib;
  storyAfterExhib = function () { const D = M.story && M.story.dunks; if (D) C.story.allstar = { dunks: D.n, crowd: D.crowd, won: M.winner === 0, paid: false }; return _ae.apply(this, arguments); };
}
function storyAllstarLines() {
  const A = C.story.allstar || { dunks: 0, crowd: 0, fund: 1500 }, f = '$' + (A.fund || 0).toLocaleString('en-US'), total = '$' + (C.story.fund || 0).toLocaleString('en-US');
  const L = [['narr', 'The all-star game is over. ' + A.dunks + ' dunk' + (A.dunks === 1 ? '' : 's') + ' for Al-Amanah, and a crowd that ' + (A.crowd > 0.75 ? 'would not sit down.' : A.crowd > 0.4 ? 'got louder every time.' : 'clapped politely.')]];
  L.push(['saleem', 'The ticket money is counted. ' + f + ' for the school wing.']);
  if (A.dunks >= 5) L.push(['musa', 'Did you SEE the crowd? Uncle Yusuf stood on his chair.'], ['jamil', 'He is seventy-four. He should not stand on chairs.']);
  else if (A.dunks >= 2) L.push(['anas', 'Every dunk, a desk for a child. That is a good trade.']);
  else L.push(['karim', 'Not many dunks. But the kids sold lemonade at the door, so it adds up.']);
  L.push(['karim', 'The fundraiser stands at ' + total + '. Halfway through the season, and halfway to something.'], ['saleem', 'Back to the league. Four games left.']);
  return L;
}
