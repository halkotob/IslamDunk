// ================================================= v9.22: THE CAREER STORY — the tournaments
// The story's teams, its bracket games and what a tournament does to the story: the checkpoint builds the bracket,
// every game has a pregame scene by its stakes and win and loss scenes after it, a run-ending loss plays "next
// season" and goes back to the checkpoint, a title builds a masjid project and raises the fundraiser.
//
// Teams (stageTeams): index 0 is us, 1 is the rival, the rest by stage:
//   Local (Chapter 2)      8: Al-Furqan and six of the other masjid teams of src/data/teams.js
//   State (Chapter 3)      9: all eight masjid teams
//   National (Chapter 4)  16: the eight masjid teams and seven generated teams from across the country
//   World (Chapter 5)      8: generated teams from other countries
// The masjid teams keep their names, players and looks; their ratings move to the stage's level (each team a notch
// above or below, by its tier), keeping each player's shape.
const STORY_FIELD = [8, 9, 16, 8];
function storyTeamAt(T, target) {
  const core = ['spd', 'sht', 'dnk', 'def', 'stl'], ps = T.players, mean = ps.reduce((a, p) => a + core.reduce((b, k) => b + p.stats[k], 0), 0) / (ps.length * core.length);
  const d = Math.round(target - mean);
  return Object.assign({}, T, { players: ps.map(p => { const st = Object.assign({}, p.stats); for (const k of core) st[k] = clamp(st[k] + d, 2, 10); return Object.assign({}, p, { stats: st }); }) });
}
{
  const _st = stageTeams;
  stageTeams = function (stage) {
    if (!storyOn()) return _st.apply(this, arguments);
    const key = 'story:' + C.seed + ':' + stage;
    if (_stageCache[key]) return _stageCache[key];
    const S = STAGES[stage], R = seededRng(C.seed * 31 + stage * 977 + 11), n = STORY_FIELD[stage];
    const others = TEAMS.filter(t => t.short !== 'FURQAN').slice();
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    const teams = [null];
    if (stage < 3) teams.push(rivalTeam(stage));
    const masjid = stage === 0 ? others.slice(0, 6) : stage < 3 ? others : [];
    const words = MASJID_WORDS.slice(), places = PLACES[stage].slice(), cols = PALETTE.slice(2), take = a => a.splice(Math.floor(R() * a.length), 1)[0];
    const tiers = []; for (let i = 0; i < n - 1 - (stage < 3 ? 1 : 0); i++) tiers.push([-1, 0, 1][i % 3]);
    for (let i = tiers.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [tiers[i], tiers[j]] = [tiers[j], tiers[i]]; }
    let k = 0;
    for (const T of masjid) teams.push(Object.assign(storyTeamAt(T, S.stat + R() * 0.6 - 0.3 + TIER_OFF[tiers[k++]]), { place: T.place || PLACES[Math.min(stage, 2)][(k * 3) % PLACES[Math.min(stage, 2)].length] }));
    while (teams.length < n) teams.push(genTeam(R, take(words.length ? words : MASJID_WORDS.slice()), take(places.length ? places : PLACES[stage].slice()), S.stat + R() * 0.8 - 0.4 + TIER_OFF[tiers[k++] || 0], stage, take(cols.length ? cols : PALETTE.slice(2))));
    { const pw = t => t.players.reduce((a, p) => a + p.stats.spd + p.stats.sht + p.stats.dnk + p.stats.def + p.stats.stl, 0);
      const ranked = teams.slice(1).sort((a, b) => pw(b) - pw(a)), third = Math.max(1, Math.round(ranked.length / 3));
      ranked.forEach((t, i) => { t.tier = i < third ? 1 : i >= ranked.length - third ? -1 : 0; }); }
    const div = () => Array.from({ length: 8 }, () => 'Masjid ' + pickR(R, MASJID_WORDS) + ' (' + pickR(R, PLACES[stage]) + ')');
    teams.divisions = { Medium: div(), Large: div() };
    return (_stageCache[key] = teams);
  };
}
// the bracket for a tournament (each attempt draws again)
function storyMakeBracket(stage) {
  C.retries = C.story.att || 0;
  return typeof storyFormatBracket === 'function' && storyFormatBracket(stage) || makePoolBracket(stage);
}
function storyOpp() { const b = C.bracket, m = b && !b.out && !b.champ ? ourMatch() : null; return m ? { id: m.a === 0 ? m.b : m.a, team: teamOf(C.stage, m.a === 0 ? m.b : m.a) } : null; }
// what the hub says about the next game
function storyNextExtra(S) {
  if (S.bracket) { const o = storyOpp(); return o ? 'vs ' + o.team.name.replace('Masjid ', '') + (o.team.place ? ' (' + o.team.place + ')' : '') + '  •  ' + roundLabel(C.bracket) : ''; }
  if (S.pick) return S.keep ? 'Keep your teammate, or change' : 'Choose your teammate for the league';
  if (S.kind === 'walk' || S.kind === 'drill') return 'In the gym';
  return '';
}

// ---------------------------------------------------------------- scene effects (run when a scene starts)
const STORY_EFFECTS = {
  fundOn() { C.story.fundOn = true; },
  bracket(S) { C.stage = S.stage; C.bracket = storyMakeBracket(S.stage); slog(S.stage).entries++; Game.cv = null; },
  title(S) {
    const st = S.stage, got = [];
    for (const key of STORY_TITLE_PROJECTS[st] || []) { const p = ALL_PROJECTS.find(x => x.key === key); if (!p) continue; const l = upOf(C.up, key); if (l < p.tiers.length) { C.up[key] = l + 1; got.push(p.tiers[l][0]); } }
    C.story.built = got; storyFund(STORY_TITLE_FUND[st], STAGES[st].name + ' title');
    if (!C.trophies.includes(st)) C.trophies.push(st);
    _gymFloors.old = _gymFloors.new = null;
  },
  nextSeason() { C.season = (C.season || 1) + 1; C.story.att = (C.story.att || 0) + 1; C.bracket = null; C.streak = 0; }
};
const STORY_TITLE_PROJECTS = [['lights', 'trophy'], ['bleachers', 'scoreboard', 'carpet'], ['musalla', 'garden'], ['dome', 'minaret']];
const STORY_TITLE_FUND = [5000, 12000, 25000, 30000];
const STORY_WIN_FUND = [400, 900, 1500, 2000];                // a win at each stage (the final pays double)
function storyFund(n, why) { if (!C.story.fundOn || !n) return; C.story.fund = Math.min(STORY_FUND_GOAL * 2, (C.story.fund || 0) + n); (C.story.fundLog = C.story.fundLog || []).push([why, n]); if (C.story.fundLog.length > 40) C.story.fundLog.shift(); }
{
  const _ps = storyPlayScene;
  storyPlayScene = function (S) { if (S.effect && STORY_EFFECTS[S.effect]) STORY_EFFECTS[S.effect](S); saveCareer(); return _ps.apply(this, arguments); };
}

// ---------------------------------------------------------------- bracket games: the pregame scene, the card, the game
function storyStakesOf(S) { return typeof S.stakes === 'function' ? S.stakes() : S.stakes || 'regular'; }
function storyBracketStart(S) {
  const o = storyOpp();
  if (!o) { storyGo(C.story.cp || S.id); return careerHub(); }                  // (no game to play: back to the checkpoint)
  Game.cv = null; prepCareerVenue();
  playStory(storyStakesLines(storyStakesOf(S), o), () => { Game.storyPlay = S.id; Game.screen = 'pregame'; SFX.blip(); }, storyTitleOf(S));
  if (Game.story) Game.story.sid = S.id;
  storyTagJournal(S);
}
{
  const _pst = storyPlayStart;
  storyPlayStart = function (S) { if (S.bracket) return storyBracketStart(S); return _pst.apply(this, arguments); };
  const _scm = startCareerMatch;
  startCareerMatch = function () {
    const id = Game.storyPlay; Game.storyPlay = null;
    const r = _scm.apply(this, arguments);
    if (id && storyOn() && M.career) M.story = { id, bracket: true };
    return r;
  };
  // after a bracket game: the bracket keeps its result (the stage and bracket stay the story's), the outcome picks the scene
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    if (!M.story || !M.story.bracket || !storyOn()) return _cam.apply(this, arguments);
    const S = SC[M.story.id], st = M.careerStage, b = C.bracket, won = M.winner === 0, round = b.round;
    _cam.apply(this, arguments);
    C.stage = st; C.bracket = b; C.done = false;
    const p = Game.post; if (!p) return;
    const res = p.res, outcome = res === 'out' ? 'out' : res === 'champ' || won ? 'win' : 'loss';
    const fund = won ? STORY_WIN_FUND[st] * (res === 'champ' ? 2 : 1) : 0;
    if (fund) storyFund(fund, p.roundName + ' win');
    p.story = S.id; p.outcome = outcome; p.summary = null; p.lines = storyLinesOf(S, won ? 'winLines' : 'lossLines');
    p.unlocked = fund && C.story.fundOn ? '+$' + fund.toLocaleString('en-US') + ' for the school wing' : '';
    if (Game.menus) Game.menus.hub = null;
    saveCareer();
  };
}
// stakes lines: who speaks before a game depends on the stakes, the opponent and your teammate
function storyStakesLines(stakes, o) {
  const opp = o.team.name, short = opp.replace('Masjid ', ''), mate = C.partner || 'saleem', L = [];
  const pool = STORY_STAKES[stakes] || STORY_STAKES.regular, R = seededRng(hash32(opp + '|' + (C.gamesPlayed || 0) + '|' + stakes));
  for (const l of pool[Math.floor(R() * pool.length)]) L.push([l[0], l[1].replace('{opp}', short)]);
  if (o.id === 1 && C.stage < 3) L.push(['rayyan', pick2(R, STORY_RAYYAN[C.stage])]);
  if (mate !== 'saleem' || stakes !== 'opener') L.push([mate, pick2(R, STORY_MATE_PRE[mate])]);
  const top = storyTopChem(); if (top && top !== mate && L.length < 6) L.push([top, pick2(R, STORY_CHEM_LINES[top])]);   // the brother you've played with most has a word too
  return L;
}
function pick2(R, a) { return a[Math.floor(R() * a.length)]; }
function storyTopChem() { let best = null, v = 24; for (const id of STORY_MATES) if (chemOf(id) > v) { v = chemOf(id); best = id; } return best; }

// ---------------------------------------------------------------- the teammate pick (C2.5, C2.7 and every chapter after)
function storyChoiceStartPick(S) {
  const i = Math.max(0, STORY_MATES.indexOf(C.partner || 'saleem'));
  Game.spick = { S, sel: i }; Game.screen = 'spick'; SFX.blip();
}
{
  const _cs = storyChoiceStart;
  storyChoiceStart = function (S) { if (S.pick) return storyChoiceStartPick(S); return _cs.apply(this, arguments); };
}
function storyPickable(id) { return !(C.story.injured && C.story.injured === id); }
function storyPick(i) {
  const P = Game.spick; if (!P) return;
  const id = STORY_MATES[i]; if (!storyPickable(id)) { SFX.bad && SFX.bad(); return; }
  const was = C.partner; C.partner = id; Game.spick = null; saveCareer(); SFX.good && SFX.good();
  const S = P.S, lines = P.S.keep && was === id ? [['saleem', 'Same pair. Good, chemistry takes time.']] : storyPickLines(id);
  playStory(lines, () => storyDone(S, 'next'), storyTitleOf(S)); storyTagJournal(S);
}
function storyPickLines(id) { return STORY_PICK_LINES[id] || [[id, 'Let’s go, akhi.']]; }
function spickRects() {
  const TT = Input.touchMode, cw = 214, ch = TT ? 196 : 186, gx = 12, gy = 12, x0 = (W - (4 * cw + 3 * gx)) / 2, y0 = TT ? 66 : 74;
  return STORY_MATES.map((id, i) => { const r = Math.floor(i / 4), c = i % 4, rowN = r ? 3 : 4, rx = x0 + (r ? (cw + gx) / 2 : 0); return { id, x: rx + c * (cw + gx), y: y0 + r * (ch + gy), w: cw, h: ch }; });
}
function drawStoryPick(g) {
  const P = Game.spick; if (!P) return;
  dim(g, 0.82);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText(P.S.keep ? 'Your teammate for the next game' : 'Pick your teammate', W / 2, 44);
  const T = amanahTeam();
  for (const [i, r] of spickRects().entries()) {
    const id = r.id, on = P.sel === i, ok = storyPickable(id), cur = C.partner === id, st = storyMateStats(id, C.stage), [k1, k2] = MATE_STANDOUT[id];
    g.globalAlpha = ok ? 1 : 0.45;
    g.fillStyle = on ? 'rgba(232,195,90,0.22)' : 'rgba(8,16,24,0.88)'; roundRect(g, r.x, r.y, r.w, r.h, 12); g.fill();
    g.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.14)'; g.lineWidth = on ? 2 : 1; g.stroke();
    g.save(); roundRect(g, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10); g.clip(); drawPortrait(g, r.x + 44, r.y + r.h - 16, castDef(id), T, 0.9, 'thobe'); g.restore();
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(fitText(g, castDef(id).name, r.w - 92), r.x + 84, r.y + 26);
    g.fillStyle = HUB_GOLD_DIM; g.font = `12px ${BODY}`; g.fillText(fitText(g, ok ? MATE_ROLE[id] : 'Injured', r.w - 92), r.x + 84, r.y + 46);
    const lab = k => (STAT_ROWS.find(x => x[0] === k) || [k, k === 'stl' ? 'Stealing' : k])[1];
    [k1, k2].forEach((k, j) => { const y = r.y + 76 + j * 26; g.fillStyle = IVORY; g.font = `12px ${BODY}`; g.fillText(fitText(g, lab(k), 70), r.x + 84, y); g.fillStyle = '#f2cf6b'; g.font = `13px ${FONT}`; g.textAlign = 'right'; g.fillText(String(st[k]), r.x + r.w - 12, y); g.textAlign = 'left'; });
    const v = chemOf(id); g.fillStyle = HUB_GOLD_DIM; g.font = `11px ${FONT}`; g.fillText('CHEM', r.x + 84, r.y + r.h - 24);
    meter(g, r.x + 124, r.y + r.h - 31, r.w - 136, 7, v / 100, v >= 75 ? '#57e389' : v >= 25 ? '#f2cf6b' : '#9fb3c8');
    if (cur) { g.fillStyle = GOLD; g.font = `11px ${FONT}`; g.textAlign = 'right'; g.fillText('NOW', r.x + r.w - 12, r.y + 26); g.textAlign = 'left'; }
    g.globalAlpha = 1;
    addRect(r.x, r.y, r.w, r.h, () => { if (P.sel === i) storyPick(i); else { P.sel = i; SFX.blip(); } });
  }
  const id = STORY_MATES[P.sel], by = spickRects()[6].y + spickRects()[6].h + 14, bw = 220, bh = Input.touchMode ? 44 : 38;
  g.fillStyle = GOLD; roundRect(g, W / 2 - bw / 2, by, bw, bh, bh / 2); g.fill();
  g.textAlign = 'center'; g.fillStyle = NIGHT; g.font = `15px ${FONT}`; g.fillText(fitText(g, 'Play with ' + castDef(id).name, bw - 24), W / 2, by + bh / 2 + 5);
  addRect(W / 2 - bw / 2, by, bw, bh, () => storyPick(P.sel));
}
{
  CAREER_SCREENS.add('spick');
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen !== 'spick') return _cu.apply(this, arguments);
    const P = Game.spick; if (!P) return careerHub();
    const n = STORY_MATES.length;
    if (menuHit('left')) { P.sel = (P.sel + n - 1) % n; SFX.blip(); }
    if (menuHit('right')) { P.sel = (P.sel + 1) % n; SFX.blip(); }
    if (menuHit('up') || menuHit('down')) { P.sel = P.sel < 4 ? Math.min(n - 1, P.sel + 4) : P.sel - 4; SFX.blip(); }
    if (menuHit('ok')) storyPick(P.sel); else if (menuHit('back')) careerHub();
  };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'spick') return drawStoryPick(g); return _cr.apply(this, arguments); };
  BACK.spick = () => careerHub();
}

// ---------------------------------------------------------------- C2.10: lights out
let _darkCv = null;
function storyDarkCv(w, h) { if (!_darkCv || _darkCv.width !== w || _darkCv.height !== h) { _darkCv = makeCanvas(w, h); } return _darkCv; }
// A normal 2v2 in the home gym, in the dark: only a glow around each player and the ball. The lights come back when a
// team reaches 6 or after 90 seconds, and the game goes on to 11.
STORY_MODES.lightsout = function (S) {
  const mate = C.partner || 'saleem', pool = ['jamil', 'ilyas', 'musa', 'anas', 'karim'].filter(x => x !== mate), opp = pool.slice(0, 2);
  const us = Object.assign({}, STORY_HOME, { players: [partnerDef(mate), playerDef()] });
  const them = { name: castDef(opp[0]).name.split(' ').pop() + ' & ' + castDef(opp[1]).name.split(' ').pop(), short: 'DARK', place: 'Eastside', c1: '#3b3b3b', c2: '#e0b04a', crest: 'star', players: opp.map(id => storyMateDef(id, 0)) };
  storyExhibition(S, us, them, { L: careerLevels(0).opp - 0.2, fmt: { format: 'first21', target: 11 } });
  M.story.dark = { on: true, k: 1, t: 0 };
};
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    const r = _um.apply(this, arguments);
    const D = M.story && M.story.dark;
    if (D && M.teams) {
      D.t += dt;
      if (D.on && (Math.max(M.teams[0].score, M.teams[1].score) >= 6 || D.t > 90)) { D.on = false; D.back = D.t; FX.callout && FX.callout('LIGHTS ON!', '#ffd76a', 'THE BREAKER'); }
      D.k = D.on ? 1 : Math.max(0, 1 - (D.t - D.back) / 0.8) * (((D.t * 14) | 0) % 2 ? 0.5 : 1);   // flicker back on
    }
    return r;
  };
  const _ds = drawScene;
  drawScene = function (g) {
    const r = _ds.apply(this, arguments);
    const D = M.story && M.story.dark;
    if (D && D.k > 0.01 && (Game.screen === 'play' || Game.screen === 'final')) {
      // the dark: a mask at half resolution, a soft hole cut for each player and the ball (holes add up where they meet)
      const z = cam.zoom || 1, mw = Math.ceil((W + 800) / 2), mh = Math.ceil((H + 800) / 2);
      const cv = storyDarkCv(mw, mh), m = cv.getContext('2d');
      m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, mw, mh); m.fillStyle = `rgba(2,4,10,${0.95 * D.k})`; m.fillRect(0, 0, mw, mh);
      m.globalCompositeOperation = 'destination-out';
      const hole = (x, y, rr) => { const X = (x + 400) / 2, Y = (y + 400) / 2, R = rr / 2, gr = m.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = gr; m.beginPath(); m.arc(X, Y, R, 0, Math.PI * 2); m.fill(); };
      for (const p of M.players) { const [x, y] = P(p.x, 55, p.z); hole(x, y, 62 * depthK(p.z) * z); }
      { const [x, y] = P(ball.x, ball.y, ball.z); hole(x, y, 30 * depthK(ball.z) * z); }
      g.drawImage(cv, -400, -400, W + 800, H + 800);
    }
    return r;
  };
}

// ---------------------------------------------------------------- lines that depend on the tournament
function storyLeagueIntro(stage) {
  const o = storyOpp(), b = C.bracket, att = C.story.att || 0;
  const pool = b && b.pools ? b.pools[0].filter(i => i !== 0).map(i => teamOf(stage, i).name.replace('Masjid ', '')) : [];
  const L = att ? [['saleem', 'A new season, brothers. Same masjid, same intention. Everything we built is still ours.'], ['jamil', 'And this year we win it.']] :
    [['narr', 'The Metro Masjid League. Eight masjids, one trophy, and a gym full of uncles with opinions.'], ['saleem', 'Here’s how it works. Two groups of four. We play each team in our group once.'],
      ['saleem', 'The top two in each group go through to the semifinals. Then the final.'], ['musa', 'So three games, then two more if we’re good.'], ['karim', 'Five games. Five chances to make the kids proud.']];
  if (pool.length) L.push(['saleem', 'Our group: ' + pool.slice(0, -1).join(', ') + ' and ' + pool[pool.length - 1] + '.']);
  if (b && b.pools && b.pools[1].includes(1)) L.push(['jamil', 'Al-Furqan is in the other group. If we meet them, it’s in the playoffs. Good.']);
  else if (b && b.pools) L.push(['jamil', 'Al-Furqan is in our group. Of course they are.']);
  if (!att) L.push(['rayyan', 'As-salamu alaykum, Al-Amanah. Rayyan, Al-Furqan. My uncle still talks about beating you in that final.'], ['jamil', 'Your uncle hit a lucky shot.'], ['rayyan', 'He says it was skill. May the better team win.']);
  if (o) L.push(['saleem', 'First up: ' + o.team.name + '. Now, pick who plays beside you.']);
  return L;
}
function storyGroupPush() {
  const b = C.bracket, rows = b && b.pg ? standings(b, 0) : [], me = rows.find(r => r.id === 0) || { w: 0, l: 0 }, pos = rows.findIndex(r => r.id === 0) + 1;
  const L = [['narr', 'The day of the last group game. The table: ' + me.w + ' won, ' + me.l + ' lost, ' + ['', 'first', 'second', 'third', 'fourth'][pos] + ' in the group.']];
  if (me.w >= 2) L.push(['saleem', 'Two wins. We’re close. Close is not done.'], ['ilyas', 'Let’s finish it.']);
  else if (me.w === 1) L.push(['saleem', 'One win, one loss. Win tonight and we should be through.'], ['jamil', 'Should? We WILL be through.']);
  else L.push(['saleem', 'No wins yet. We need this one, and help from the other games.'], ['anas', 'Then we do our part. Allah takes care of the rest.']);
  L.push(['dawud', 'I made extra chai. For the celebration. Or for the sadness. It works for both.']);
  return L;
}
function storyGroupStakes() { const b = C.bracket, me = b && b.pg ? standings(b, 0).find(r => r.id === 0) : null; return me && me.w >= 2 ? 'regular' : 'must-win'; }
function storyTitleLines(st) {
  const built = (C.story.built || []).join(' and '), f = '$' + (C.story.fund || 0).toLocaleString('en-US');
  const T = STORY_TITLE_TEXT[st] || [];
  return T.map(l => [l[0], l[1].replace('{built}', built || 'something new').replace('{fund}', f)]);
}
function storyNextSeasonLines(ch) {
  const L = STORY_NEXT_SEASON[ch] || STORY_NEXT_SEASON[2];
  return L.map(l => [l[0], l[1]]);
}
