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
