// ================================================= v9.27: THE CAREER STORY — knockouts (Chapter 4, Chapter 5)
// A knockout bracket of any power of two: Nationals is sixteen teams (round of 16, quarterfinal, semifinal, final),
// with Al-Furqan on the other half of the draw. One loss and the run is over. Also here: the school wing, which opens
// with the National title (C4.9) and stands beside the masjid on the Outside view from then on.
const KO_NAMES = ['Round of 16', 'Quarterfinal', 'Semifinal', 'Final'];
function makeKOBracket(stage, n) {
  const R = seededRng(C.seed + stage * 131 + (C.retries || 0) * 17 + (C.season || 1) * 7919);
  const mid = []; for (let i = 2; i < n; i++) mid.push(i);
  for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
  return { fmt: 'ko', ko: true, round: 0, out: false, rounds: [pairs([0, ...mid, 1])] };   // the rival on the other half
}
const isKO = () => !!(C && C.bracket && C.bracket.ko);
function koTotal(b) { return Math.round(Math.log2(b.rounds[0].length * 2)); }
function storyKOResult(won, us, them) {
  const b = C.bracket, m = ourMatch();
  if (m.a === 0) { m.sa = us; m.sb = them; } else { m.sb = us; m.sa = them; }
  m.w = won ? 0 : (m.a === 0 ? m.b : m.a);
  for (const o of b.rounds[b.round]) if (o !== m && o.w == null) simCareerMatch(o);
  if (!won) {                                                          // out: the rest of the bracket plays itself
    b.out = true;
    while (b.rounds[b.rounds.length - 1].length > 1) { const nx = pairs(b.rounds[b.rounds.length - 1].map(x => x.w)); for (const o of nx) simCareerMatch(o); b.rounds.push(nx); }
    return 'out';
  }
  if (b.rounds[b.round].length === 1) {
    const R = seededRng(C.seed + C.stage * 7), T = stageTeams(C.stage).divisions;
    C.divChamps[C.stage] = { Medium: pickR(R, T.Medium), Large: pickR(R, T.Large) };
    return 'champ';
  }
  b.rounds.push(pairs(b.rounds[b.round].map(x => x.w))); b.round++;
  return 'next';
}
{
  const _fb = storyFormatBracket;
  storyFormatBracket = function (stage) { if (stage === 2) return makeKOBracket(2, 16); return _fb.apply(this, arguments); };
  const _lrc = LEAGUE._rc;
  LEAGUE._rc = function (won, us, them) { if (isKO()) return storyKOResult(won, us, them); return _lrc.apply(this, arguments); };
  const _rc = recordCareerResult;
  recordCareerResult = function (won, us, them) {
    if (!isKO()) return _rc.apply(this, arguments);
    if (LEAGUE.mode === 'real') lgResolve(won, us, them, null);
    return storyKOResult(won, us, them);
  };
  const _rl = roundLabel;
  roundLabel = function (b, r) { if (b && b.ko) { r = r == null ? b.round : r; return KO_NAMES[r + 4 - koTotal(b)] || ''; } return _rl.apply(this, arguments); };
  const _cr = careerRewards;                                           // the rewards know three rounds too (a 16-team final was round 4: NaN HB)
  careerRewards = function (won, champ, ctx = {}) { const b = C && C.bracket; if (b && b.ko && ctx.round != null) ctx = Object.assign({}, ctx, { round: clamp(ctx.round - (koTotal(b) - 3), 0, 2) }); return _cr.call(this, won, champ, ctx); };
  const _vr = venueRound;                                              // the venues know three rounds: the last three
  venueRound = function (b) { if (b && b.ko) return Math.max(0, b.round - (koTotal(b) - 3)); return _vr.apply(this, arguments); };
  const _bs = buildScout;
  buildScout = function () { const sc = _bs.apply(this, arguments); if (isKO() && sc) sc.round = roundLabel(C.bracket); return sc; };
  // the bracket screen: one column a round, compact boxes for the first round of sixteen
  const _dcb = drawCareerBracket;
  drawCareerBracket = function (g) {
    const b = C.bracket; if (!b || !b.ko) return _dcb.apply(this, arguments);
    const S = STAGES[C.stage], tot = koTotal(b), TT = Input.touchMode && g === ctx;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(S.title, W / 2, 40);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText((1 << tot) + ' teams, single elimination. One loss and you go home.', W / 2, 62);
    const cw = Math.floor((W - 60) / tot), top = 90, span = 384;
    for (let r = 0; r < tot; r++) {
      const x = 30 + r * cw, n = (1 << tot) >> (r + 1), gap = span / n, bh = Math.min(TT ? 48 : 44, gap - 4), round = b.rounds[r];
      g.textAlign = 'left'; g.fillStyle = r === tot - 1 ? '#ffe38a' : '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(KO_NAMES[r + 4 - tot].toUpperCase(), x, top - 6);
      for (let i = 0; i < n; i++) {
        const y = top + i * gap + (gap - bh) / 2, m = round && round[i];
        panel(g, x, y, cw - 14, bh, !!(m && (m.a === 0 || m.b === 0)));
        [[m && m.a, m && m.sa], [m && m.b, m && m.sb]].forEach(([id, sc], k) => {
          const yy = y + bh / 2 - 4 + k * (bh / 2 - 2); g.textAlign = 'left';
          if (id == null) { g.fillStyle = '#56657a'; g.font = `11px ${BODY}`; g.fillText('TBD', x + 10, yy); return; }
          const t = teamOf(C.stage, id), lost = m.w != null && m.w !== id;
          g.fillStyle = lost ? '#6d7a8c' : id === 0 ? '#ffe38a' : '#fff'; g.font = `11px ${id === 0 ? FONT : BODY}`;
          g.fillText(fitText(g, t.name.replace('Masjid ', ''), cw - 54), x + 10, yy);
          g.textAlign = 'right'; if (sc != null) g.fillText(String(sc), x + cw - 22, yy);
        });
      }
    }
    if (b.out) { g.textAlign = 'center'; g.fillStyle = '#ffb0b0'; g.font = `14px ${FONT}`; g.fillText('Eliminated', W / 2, 506); }
    g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText(Input.touchMode ? 'Tap to go back' : 'Press Enter or tap to go back', W / 2, 528);
    addRect(0, 0, W, H, careerHub);
  };
}
function storyKOOppId(r) { const b = C.bracket, m = b && b.rounds[r] && b.rounds[r].find(q => q.a === 0 || q.b === 0); return m ? (m.a === 0 ? m.b : m.a) : -1; }
function storyKOOpp(r) { const id = storyKOOppId(r); return id >= 0 ? teamOf(C.stage, id) : null; }
function storyRivalAlive() { const b = C.bracket; if (!b) return false; const last = b.rounds[b.rounds.length - 1]; return last.some(q => (q.a === 1 || q.b === 1) && q.w !== (q.a === 1 ? q.b : q.a)); }

// ---------------------------------------------------------------- C4.9: the fundraiser is delivered, the wing opens
{
  const _t = STORY_EFFECTS.title;
  STORY_EFFECTS.title = function (S) {
    _t.apply(this, arguments);
    if (S.stage === 2 && !C.story.wing) {
      const short = STORY_FUND_GOAL - (C.story.fund || 0);
      if (short > 0) storyFund(short, 'The community, the night of the final');
      C.story.wing = true;
    }
  };
}
{
  const _de = drawExterior;
  drawExterior = function (g, U, t) {
    const r = _de.apply(this, arguments);
    if (C && C.story && C.story.wing) drawSchoolWing(g, t);
    return r;
  };
}
// the weekend school's wing: four classrooms, the kids' drawings in the windows, a sign over the door
function drawSchoolWing(g, t) {
  const x0 = 40, w = 230, top = 274, base = 378;
  g.fillStyle = '#efe3c6'; g.fillRect(x0, top, w, base - top);
  g.fillStyle = '#1e7a4c'; g.fillRect(x0 - 5, top - 8, w + 10, 10);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.strokeRect(x0, top, w, base - top);
  const cols = ['#e85d5d', '#f2cf6b', '#5dade2', '#57d68d'];
  for (let i = 0; i < 4; i++) {
    const wx = x0 + 16 + i * 54, wy = top + 22;
    g.fillStyle = '#9ec9e6'; g.fillRect(wx, wy, 36, 30); g.strokeStyle = '#f7f1e3'; g.lineWidth = 2; g.strokeRect(wx, wy, 36, 30);
    g.fillStyle = cols[i]; g.beginPath(); g.arc(wx + 12 + (i % 2) * 10, wy + 14, 5, 0, Math.PI * 2); g.fill();   // a drawing taped to the glass
    g.fillRect(wx + 6, wy + 22, 24, 3);
  }
  g.fillStyle = '#6b4526'; g.fillRect(x0 + w / 2 - 14, base - 40, 28, 40); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(x0 + w / 2 + 8, base - 20, 2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1e5a4a'; roundRect(g, x0 + 22, top + 60, w - 44, 18, 4); g.fill();
  g.fillStyle = '#f2cf6b'; g.font = `9px ${FONT}`; g.textAlign = 'center';   // scenery text, painted on: the phone's larger UI font leaves it alone
  CanvasRenderingContext2D.prototype.fillText.call(g, 'AL-AMANAH WEEKEND SCHOOL', x0 + w / 2, top + 73);
}

// ---------------------------------------------------------------- lines that depend on the knockout
function storyNatIntro() {
  const att = C.story.att || 0, o = storyOpp(), L = att ? [['saleem', 'Nationals again. Sixteen teams, one loss and you’re out. We know the road now.'], ['jamil', 'And this time we walk all of it.']] : [
    ['narr', 'The National Masjid Invitational. A hotel ballroom of team captains, a bracket on a screen, and one uncle from every masjid filming it on his phone.'],
    ['saleem', 'Before anything, renew your intention. We are not here for our names. We’re here for our masjid, for the kids, and for Allah.'],
    ['saleem', 'And we represent our whole state now. Every masjid we beat in the State league is cheering for us tonight.'],
    ['karim', 'Sixteen teams. Single elimination. Four wins and we’re national champions.'],
    ['jamil', 'Four wins. I have waited nineteen years for one. Four is fine.'],
    ['anas', 'One game at a time. Bismillah.']];
  if (!att) L.push(['saleem', 'Al-Furqan is on the other side of the draw. If we meet them, it’s in the final.'], ['rayyan', 'See you in the final, Al-Amanah. Don’t make me wait.']);
  if (o) L.push(['saleem', 'Round of 16: ' + o.team.name + (o.team.place ? ', from ' + o.team.place : '') + '. Pick who plays beside you.']);
  return L;
}
function storyNatReact(r) {
  const nx = storyKOOpp(r + 1), L = [];
  if (r === 0) L.push(['saleem', 'Through to the quarterfinals. Eight teams left in the whole country.'], ['musa', 'My mum watched the stream. She texted me forty times.']);
  if (r === 1) L.push(['saleem', 'Semifinals. Alhamdulillah. The last four.'], ['karim', 'The weekend school is watching on the projector. Two of the kids fell asleep. The rest are screaming.']);
  if (r === 2) L.push(['saleem', 'The National final.'], ['jamil', 'A final. A NATIONAL final.'], ['ilyas', 'Dad, breathe.']);
  if (nx) L.push(['saleem', 'Next: ' + nx.name + (nx.place ? ', from ' + nx.place : '') + '.']);
  if (nx && storyKOOppId(r + 1) === 1) L.push(['rayyan', 'Told you. The final. Two masjids from the same street.'], ['jamil', 'Same street. Different result this time.']);
  else if (r < 2) L.push([storyRivalAlive() ? 'jamil' : 'dawud', storyRivalAlive() ? 'Al-Furqan won again too. Of course they did.' : 'Al-Furqan is out. Rayyan will be in the stands, cheering for us. He told me so.']);
  return L;
}

// ================================================= v9.28: Chapter 5, the Ummah Cup
// Eight masjid teams from around the world. King of the Court decides the draw (C5.2): crowned, you meet the weakest
// side in the quarterfinal; one win, the next weakest; and so on. Losing it doesn't knock you out. Then a knockout:
// quarterfinal, semifinal, final. Any loss after the draw: next season, back to C5.1. The End (C5.11) rolls credits.
// The King of the Court is played against the captains of three other teams (CAST entries made from their players).
const CUP_CAPS = ['cup1', 'cup2', 'cup3'];
function storyCupCaptains() {
  const T = stageTeams(3);
  CUP_CAPS.forEach((id, i) => { const t = T[i + 2], p = t.players[0]; CAST[id] = Object.assign({}, p, { kit: { c1: t.c1, c2: t.c2 }, team: t.name }); });
}
function storyDrawBracket() {
  const T = stageTeams(3), pw = i => T[i].players.reduce((a, p) => a + p.stats.spd + p.stats.sht + p.stats.dnk + p.stats.def + p.stats.stl, 0);
  const others = [1, 2, 3, 4, 5, 6, 7].sort((a, b) => pw(a) - pw(b) || a - b);   // weakest first
  const k = clamp(3 - (C.story.draw || 0), 0, 3), opp = others.splice(k, 1)[0];       // crowned: the weakest; no wins: the fourth weakest
  const R = seededRng(C.seed + 977 + (C.season || 1) * 31);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  return { fmt: 'ko', ko: true, round: 0, out: false, rounds: [pairs([0, opp, ...others])] };
}
{
  const _fb = storyFormatBracket;
  storyFormatBracket = function (stage) { if (stage === 3) return storyDrawBracket(); return _fb.apply(this, arguments); };
}
Object.assign(STORY_EFFECTS, {
  cupStart() { C.stage = 3; C.bracket = null; C.story.draw = null; storyCupCaptains(); }
});
STORY_MODES.kotcDraw = function (S) {
  storyCupCaptains();
  startKotc({ roster: ['you', ...CUP_CAPS], humans: { you: 0 } });
  KOTC.gym = true; KOTC.story = S.id;
};
{
  const _kl = kotcLeave;
  kotcLeave = function () {
    if (KOTC.story && storyOn() && SC[KOTC.story] && SC[KOTC.story].mode === 'kotcDraw') C.story.draw = KOTC.champ === 'you' ? 3 : Math.min(2, KOTC.wins.you || 0);
    return _kl.apply(this, arguments);
  };
}
function storyCupIntro() {
  const att = C.story.att || 0;
  if (att) return [['saleem', 'The Ummah Cup again. We know the way now, brothers.'], ['jamil', 'And the food. I know where the good food is.'], ['saleem', 'King of the Court first, for the draw. Then three wins.']];
  return [
    ['narr', 'Istanbul. A sports hall beside the Bosphorus, the adhan from three masjids at once, and flags from every corner of the world.'],
    ['saleem', 'Brothers. Renew your intention one more time. We came to meet the ummah, and to play well in front of it.'],
    ['saleem', 'The rules: eight masjid teams. Tonight, one player from four of the teams plays King of the Court for the draw.'],
    ['saleem', 'Win it and we play the weakest team in the quarterfinal. Every game you win gets us an easier draw. Losing doesn’t knock us out.'],
    ['karim', 'Then a quarterfinal, a semifinal and a final. Three wins and the Cup is ours.'],
    ['musa', 'Bro. The team from Kuala Lumpur has matching headbands.'], ['ilyas', 'We are still not getting matching headbands.'],
    ['saleem', 'Akhi, you’re our player for the draw. Bismillah.']];
}
function storyCupDrawLines() {
  const d = C.story.draw || 0, o = storyOpp(), L = [];
  L.push(['narr', d === 3 ? 'You were crowned. The draw gives Al-Amanah the kindest quarterfinal.' : d ? 'You won ' + d + ' game' + (d === 1 ? '' : 's') + ' on the court. A fair draw.' : 'No wins on the court, so the draw is a hard one.']);
  if (o) L.push(['saleem', 'Quarterfinal: ' + o.team.name + (o.team.place ? ', from ' + o.team.place : '') + '.']);
  L.push(d >= 2 ? ['jamil', 'Good draw. Don’t waste it.'] : ['jamil', 'Hard draw. Good. Champions beat everyone anyway.'], ['saleem', 'Now, who plays beside you?']);
  return L;
}
function storyCupReact(r) {
  const nx = storyKOOpp(r + 1), L = [];
  if (r === 0) L.push(['saleem', 'The semifinals of the Ummah Cup. Alhamdulillah.'], ['dawud', 'A brother from Sarajevo gave me his tea. I gave him our chai. We are now family.']);
  if (r === 1) L.push(['saleem', 'One of the top two masjid teams in the whole world. Let that sink in.'], ['musa', 'My mum is flying in. She says she’s bringing food. For everyone.'], ['anas', 'May Allah reward her. And her cooking.']);
  if (nx) L.push(['saleem', (r === 1 ? 'The final' : 'Next') + ': ' + nx.name + (nx.place ? ', from ' + nx.place : '') + '.']);
  return L;
}

// ---------------------------------------------------------------- C5.11: The End
// The credits roll on black: the cast, what became of the masjid, and a du'a. Enter or a tap after a moment skips.
const CREDITS_LEN = 26;
function storyCredits(S) { Game.credits = { t: 0, S }; Game.screen = 'scredits'; storyJournal(S, [['narr', 'The End.']]); }
function creditsDone() { const c = Game.credits; if (!c) return; Game.credits = null; C.story.done = true; storyDone(c.S, 'next'); }
function creditsLines() {
  const f = '$' + (C.story.fund || 0).toLocaleString('en-US');
  return [['h', 'ISLAM DUNK'], ['s', 'The story of Masjid Al-Amanah'], ['', ''], ['h', C.name || 'The Brother'], ['s', 'New in town. Now home.'], ['', ''],
    ['h', 'Sh. Saleem'], ['s', 'Floor general, mentor, builder of a school'], ['h', 'Ammo Jamil'], ['s', 'Enforcer, and a proud father'], ['h', 'Ilyas'], ['s', 'Quick guard, his own man'],
    ['h', 'Ustath Karim'], ['s', 'Shooter, teacher, finally in a classroom with a window'], ['h', 'Qari Anas'], ['s', 'Big man, gentle giant'], ['h', 'Imam Dawud'], ['s', 'Old-head playmaker, keeper of the chai'],
    ['h', 'Musa'], ['s', 'High-flyer, newest of the brothers'], ['h', 'Rayyan'], ['s', 'Captain of Al-Furqan, rival, friend'], ['', ''],
    ['h', 'The school wing'], ['s', 'Four classrooms, raised by ' + f + ' and a lot of dunks'], ['h', 'The weekend school'], ['s', 'Every family who asked has a place'], ['', ''],
    ['s', 'Thank you for playing.'], ['ar', 'وَآخِرُ دَعْوَانَا أَنِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'], ['s', 'And the close of our prayer: all praise is for Allah, Lord of the worlds.']];
}
function drawCredits(g) {
  const c = Game.credits; if (!c) return;
  g.fillStyle = '#000'; g.fillRect(-400, -400, W + 800, H + 800);
  const L = creditsLines(), lh = 34, total = L.length * lh, y0 = H + 20 - (c.t / CREDITS_LEN) * (total + H);
  g.textAlign = 'center';
  L.forEach(([k, t], i) => {
    const y = y0 + i * lh; if (y < -40 || y > H + 40 || !t) return;
    g.fillStyle = k === 'h' ? '#f5d98a' : IVORY; g.font = k === 'h' ? `22px ${FONT}` : k === 'ar' ? `26px ${AR_FONT}` : `15px ${BODY}`;
    g.fillText(t, W / 2, y);
  });
  if (c.t > CREDITS_LEN - 3) { const k = clamp((c.t - (CREDITS_LEN - 3)) / 2, 0, 1); g.globalAlpha = k; g.fillStyle = '#f5d98a'; g.font = `40px ${FONT}`; g.fillText('The End', W / 2, H / 2); g.globalAlpha = 1; }
  g.textAlign = 'right'; g.fillStyle = 'rgba(159,179,200,0.45)'; g.font = `11px ${BODY}`; g.fillText(Input.touchMode ? 'Tap to skip' : 'Enter to skip', W - 24, H - 14);
  addRect(0, 0, W, H, () => { if (c.t > 1) creditsDone(); });
}
{
  CAREER_SCREENS.add('scredits');
  const _ps = storyPlayScene;
  storyPlayScene = function (S) { if (S.custom === 'credits') return storyCredits(S); return _ps.apply(this, arguments); };
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'scredits') { const c = Game.credits; if (!c) return careerHub(); c.t += rdt; if (c.t >= CREDITS_LEN + 1 || (c.t > 1 && (menuHit('ok') || menuHit('back')))) creditsDone(); return; }
    return _cu.apply(this, arguments);
  };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'scredits') return drawCredits(g); return _cr.apply(this, arguments); };
  const _dsc = drawScene;
  drawScene = function (g) { if (Game.screen === 'scredits') { g.fillStyle = '#000'; g.fillRect(-400, -400, W + 800, H + 800); return; } return _dsc.apply(this, arguments); };
}
