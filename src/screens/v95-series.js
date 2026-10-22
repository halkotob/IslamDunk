// ================================================= v9.5: TOURNAMENT AND LEAGUE (Quick Play → Play a game)
//   * Tournament: 4 or 8 teams in a knockout bracket. You play your games; the others are decided by
//     a quick simulation (team strength plus luck). Lose and you can watch the rest play out.
//   * League: 4, 6 or 8 teams play everyone once or twice, then the top two meet in the final.
//     Standings (wins, losses, points for and against) and stat leaders (points, rebounds, assists per
//     game, from your games' box scores and the simulated ones).
//   * Any teams from the team list: the built-in masjids, your career team and your own teams
//     ("My teams first" puts yours in before the built-in ones). Your team's own court (or home court)
//     is the venue for your games; the final is at the Masjid League Arena.
//   * Both are saved after every game (one tournament and one league at a time) and can be left and picked
//     up from the same menu entry. Games use your Settings (difficulty, format, period length).
const SER_KEYS = { tour: 'islamdunk.tournament', league: 'islamdunk.league' };
const SER = { kind: 'tour', d: null, setup: null, tab: 0, idx: 0, scroll: 0 };
function serKey(T) { return T.custom === 'career' ? 'career' : T.custom ? 'c:' + T.custom : 'b:' + T.name; }
function serTeam(k) { return teamPool().find(t => serKey(t) === k) || TEAMS[0]; }
function serLoad(kind) { try { const o = JSON.parse(localStorage.getItem(SER_KEYS[kind]) || 'null'); return o && o.v === 1 && o.kind === kind ? o : null; } catch (e) { return null; } }
function serSave() { const d = SER.d; if (!d) return; try { localStorage.setItem(SER_KEYS[d.kind], JSON.stringify(d)); } catch (e) {} }
function serDrop(kind) { try { localStorage.removeItem(SER_KEYS[kind]); } catch (e) {} if (SER.d && SER.d.kind === kind) SER.d = null; }
const serName = (d, i) => serTeam(d.keys[i]).name;

// ---- quick simulation for games you don't play
function serPower(T) {
  const ps = T.players || []; if (!ps.length) return 25;
  return ps.reduce((a, p) => { const s = p.stats || {}; return a + (s.spd || 5) + (s.sht || 5) + (s.dnk || 5) + (s.def || 5) + (s.stl || 5); }, 0) / ps.length;
}
function serBoxSim(T, pts) {                                   // split a team's points (and rebounds, assists) between its players
  const ps = T.players, w = ps.map(p => Math.max(1, (p.stats.sht || 5) + (p.stats.dnk || 5) * 0.6)), sw = w.reduce((a, b) => a + b, 0);
  let left = pts; const rows = ps.map((p, i) => { const v = i === ps.length - 1 ? left : Math.round(pts * w[i] / sw); left -= v; return { n: p.name, pts: Math.max(0, v), reb: 0, ast: 0 }; });
  for (let i = 0; i < 8 + rint(8); i++) { const r = rows[rint(rows.length)]; r.reb++; }
  for (let i = 0; i < 2 + rint(6); i++) { const r = rows[rint(rows.length)]; r.ast++; }
  return rows;
}
function serSim(d, g) {
  const A = serTeam(d.keys[g.a]), B = serTeam(d.keys[g.b]);
  const pa = 1 / (1 + Math.exp(-(serPower(A) - serPower(B)) / 4)), aWins = Math.random() < pa;
  const win = 21, lose = clamp(21 - 2 - rint(11), 6, 19);
  g.sa = aWins ? win : lose; g.sb = aWins ? lose : win; g.w = aWins ? g.a : g.b; g.sim = true;
  serAddBox(d, g.a, serBoxSim(A, g.sa)); serAddBox(d, g.b, serBoxSim(B, g.sb));
}
function serAddBox(d, ti, rows) {
  for (const r of rows) {
    const k = d.keys[ti] + '|' + r.n, s = d.stats[k] || (d.stats[k] = { n: r.n, t: ti, gp: 0, pts: 0, reb: 0, ast: 0 });
    s.gp++; s.pts += r.pts || 0; s.reb += r.reb || 0; s.ast += r.ast || 0;
  }
}

// ---- building a tournament or league
function serField(you, size, mine) {
  const P = teamPool(), keys = [serKey(teamAt(you))], own = P.filter(t => t.custom && serKey(t) !== keys[0]).map(serKey), base = P.filter(t => !t.custom).map(serKey).filter(k => k !== keys[0]);
  const pool = mine ? [...shuffle(own), ...shuffle(base)] : shuffle([...own, ...base]);
  for (const k of pool) if (keys.length < size && !keys.includes(k)) keys.push(k);
  return keys;
}
function serNew(o) {
  const keys = serField(o.you, o.size, o.mine);
  const d = { v: 1, kind: o.kind, keys, ctrl: o.ctrl | 0, stats: {}, done: false, champ: -1, made: Date.now() };
  if (o.kind === 'tour') {
    const order = [0, ...shuffle(keys.slice(1).map((_, i) => i + 1))];
    d.rounds = [[]]; for (let i = 0; i < order.length; i += 2) d.rounds[0].push({ a: order[i], b: order[i + 1], sa: null, sb: null, w: -1 });
  } else {
    // round robin (circle method), once or twice; an odd count gets a bye
    const n = keys.length, ids = keys.map((_, i) => i); if (n % 2) ids.push(-1);
    const m = ids.length, days = [];
    for (let r = 0; r < m - 1; r++) { const day = []; for (let i = 0; i < m / 2; i++) { const a = ids[i], b = ids[m - 1 - i]; if (a >= 0 && b >= 0) day.push(r % 2 ? { a: b, b: a } : { a, b }); } days.push(day); ids.splice(1, 0, ids.pop()); }
    const all = o.twice ? [...days, ...days.map(day => day.map(g => ({ a: g.b, b: g.a })))] : days;
    d.days = all.map(day => day.map(g => Object.assign(g, { sa: null, sb: null, w: -1 }))); d.day = 0; d.final = null;
  }
  SER.d = d; serSave(); return d;
}
// your next game, or null
function serNext(d) {
  if (!d || d.done) return null;
  if (d.kind === 'tour') { const R = d.rounds[d.rounds.length - 1]; return R.find(g => g.w < 0 && (g.a === 0 || g.b === 0)) || null; }
  if (d.final) return d.final.w < 0 && (d.final.a === 0 || d.final.b === 0) ? d.final : null;
  const day = d.days[d.day]; return day ? day.find(g => g.w < 0 && (g.a === 0 || g.b === 0)) || null : null;
}
function serStandings(d) {
  const T = d.keys.map((k, i) => ({ i, w: 0, l: 0, pf: 0, pa: 0 }));
  for (const day of d.days || []) for (const g of day) if (g.w >= 0) { const A = T[g.a], B = T[g.b]; A.pf += g.sa; A.pa += g.sb; B.pf += g.sb; B.pa += g.sa; if (g.w === g.a) { A.w++; B.l++; } else { B.w++; A.l++; } }
  return T.sort((x, y) => y.w - x.w || (y.pf - y.pa) - (x.pf - x.pa) || y.pf - x.pf || x.i - y.i);
}
// play every game that isn't yours up to the point where you play next (or to the end)
function serAdvance(d, toEnd) {
  for (let guard = 0; guard < 200 && !d.done; guard++) {
    if (d.kind === 'tour') {
      const R = d.rounds[d.rounds.length - 1];
      for (const g of R) if (g.w < 0 && ((g.a !== 0 && g.b !== 0) || toEnd)) serSim(d, g);
      if (R.some(g => g.w < 0)) break;
      if (R.length === 1) { d.done = true; d.champ = R[0].w; break; }
      const N = []; for (let i = 0; i < R.length; i += 2) N.push({ a: R[i].w, b: R[i + 1].w, sa: null, sb: null, w: -1 }); d.rounds.push(N);
    } else {
      if (d.final) { if (d.final.w < 0 && ((d.final.a !== 0 && d.final.b !== 0) || toEnd)) serSim(d, d.final); if (d.final.w >= 0) { d.done = true; d.champ = d.final.w; } break; }
      const day = d.days[d.day];
      if (!day) { const S = serStandings(d); d.final = { a: S[0].i, b: S[1].i, sa: null, sb: null, w: -1, final: true }; continue; }
      for (const g of day) if (g.w < 0 && ((g.a !== 0 && g.b !== 0) || toEnd)) serSim(d, g);
      if (day.some(g => g.w < 0)) break;
      d.day++;
    }
  }
  serSave();
}
const serOut = d => d.kind === 'tour' ? d.rounds.some(R => R.some(g => g.w >= 0 && (g.a === 0 || g.b === 0) && g.w !== 0)) : !!(d.final && d.final.a !== 0 && d.final.b !== 0);
function serRoundName(d) {
  if (d.kind === 'league') return d.final ? 'Final' : 'Matchday ' + (d.day + 1) + ' of ' + d.days.length;
  const left = d.rounds[d.rounds.length - 1].length; return left === 1 ? 'Final' : left === 2 ? 'Semifinals' : 'Quarterfinals';
}

// ---- playing your game
function serVenue(T, final) {
  if (final) return null;                                         // the final: Masjid League Arena
  if (T.court && typeof ctVenue === 'function') return ctVenue(T, 0);
  const base = T.home && VENUE_LIST.find(v => v.id === T.home);
  return base && base.kind !== 'classic' && !venueLocked(base) ? makeVenue(base, base.kind === 'outdoor' ? { backdrop: base.backdrop } : {}) : null;
}
function serPlay() {
  const d = SER.d, g = serNext(d); if (!g) return;
  const opp = g.a === 0 ? g.b : g.a, you = serTeam(d.keys[0]), them = serTeam(d.keys[opp]);
  const final = d.kind === 'tour' ? d.rounds[d.rounds.length - 1].length === 1 : !!g.final;
  const venue = serVenue(you, final), humans = [{ team: 0, slot: Math.min(d.ctrl, you.players.length - 1), pad: 0 }];
  Game.lastMatch = null; Game.paused = false; Game.trivia = null;
  newMatch(you, them, { humans, venue }); M.series = { kind: d.kind, opp, final };
  Game.screen = 'play'; startVenueIntro(venue);
  if (!venue) FX.callout(serRoundName(d).toUpperCase(), '#ffd76a', d.kind === 'tour' ? 'TOURNAMENT' : 'LEAGUE');
}
{
  const _fm = finishMatch;
  finishMatch = function () {
    const r = _fm.apply(this, arguments), S = M.series, d = SER.d;
    if (S && d && !S.saved) {
      S.saved = true; const g = serNext(d);
      if (g) {
        const youA = g.a === 0, ys = M.teams[0].score, os = M.teams[1].score;
        g.sa = youA ? ys : os; g.sb = youA ? os : ys; g.w = M.winner === 0 ? 0 : S.opp;
        serAddBox(d, 0, M.teams[0].players.map(p => ({ n: p.def.name, pts: p.stats.pts || 0, reb: p.stats.reb || 0, ast: p.stats.ast || 0 })));
        serAddBox(d, S.opp, M.teams[1].players.map(p => ({ n: p.def.name, pts: p.stats.pts || 0, reb: p.stats.reb || 0, ast: p.stats.ast || 0 })));
        serAdvance(d, false);
        if (serOut(d) && !d.done) d.out = true;
        serSave();
      }
    }
    return r;
  };
  const _fc = finalContinue;
  finalContinue = function () { if (M.series) { M.series = null; openSeries(SER.d.kind); return; } return _fc.apply(this, arguments); };
  const _cr = canRematch;
  canRematch = function () { return !M.series && _cr.apply(this, arguments); };
  const _nm = newMatch;
  newMatch = function () { if (M) M.series = null; return _nm.apply(this, arguments); };
}

// ---- setup screen
function openSeries(kind) {
  SER.kind = kind; SER.d = serLoad(kind); SER.tab = 0; SER.idx = 0; SER.scroll = null;
  if (SER.d) { Game.screen = 'series'; return; }
  const P = teamPool(), mineAt = P.findIndex(t => t.custom && t.custom !== 'career');
  SER.setup = { kind, you: mineAt >= 0 ? mineAt : 0, size: kind === 'tour' ? 8 : 6, mine: true, twice: false, ctrl: 0 };
  Game.screen = 'sersetup'; Game.idx = 0;
}
function serSetupRows() {
  const o = SER.setup, n = teamCount(), sizes = o.kind === 'tour' ? [4, 8] : [4, 6, 8], cyc = (a, v, d) => a[(a.indexOf(v) + d + a.length) % a.length];
  const T = teamAt(o.you);
  const R = [
    { label: 'Your team', get: () => T.name, step: d => { o.you = (o.you + d + n) % n; o.ctrl = 0; } },
    { label: 'Your player', get: () => (T.players[o.ctrl] || T.players[0]).name, step: () => { o.ctrl = (o.ctrl + 1) % T.players.length; } },
    { label: 'Teams', get: () => String(Math.min(o.size, n)), step: d => { o.size = cyc(sizes, o.size, d); } },
    { label: 'Opponents', get: () => o.mine ? 'My teams first' : 'Any teams', step: () => { o.mine = !o.mine; } }
  ];
  if (o.kind === 'league') R.push({ label: 'Play each team', get: () => o.twice ? 'Twice' : 'Once', step: () => { o.twice = !o.twice; } });
  R.push({ label: o.kind === 'tour' ? 'Start the tournament' : 'Start the league', start: true, step: () => serStart() });
  R.push({ label: 'Back', back: true, step: () => goTitle() });
  return R;
}
function serStart() {
  const o = SER.setup; if (teamCount() < 4) { toast('You need at least 4 teams', 2); return; }
  serNew({ kind: o.kind, you: o.you, size: o.kind === 'tour' ? (teamCount() >= o.size ? o.size : 4) : Math.min(o.size, teamCount()), mine: o.mine, twice: o.twice, ctrl: o.ctrl });
  serAdvance(SER.d, false); SER.tab = 0; Game.screen = 'series'; SFX.good && SFX.good();
}
function serSetupUpdate() {
  const R = serSetupRows(); Game.idx = clamp(Game.idx | 0, 0, R.length - 1);
  menuNav(R.length, i => R[i].step(1));
  const r = R[Game.idx];
  if (r && !r.start && !r.back) { if (menuHit('left')) { r.step(-1); SFX.blip(); } if (menuHit('right')) { r.step(1); SFX.blip(); } }
  if (menuHit('back')) goTitle();
}
function drawSerSetup(g) {
  dim(g, 0.78);
  const o = SER.setup, T = teamAt(o.you);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText(o.kind === 'tour' ? 'Tournament' : 'League', W / 2, 70);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`;
  g.fillText(o.kind === 'tour' ? 'A knockout bracket. Win every game to lift the trophy.' : 'Play everyone, then the top two meet in the final.', W / 2, 98);
  drawCrest(g, W / 2, 140, 22, T);
  const R = serSetupRows();
  drawMenuList(g, 'sersetup', R.map(r => ({ label: r.label, value: r.start || r.back ? null : r.get() })), Game.idx, 190, 42, i => { Game.idx = i; R[i].step(1); }, i => { Game.idx = i; }, true, 500);
}

// ---- the hub: bracket or standings, schedule, leaders
function serUpdate() {
  const d = SER.d; if (!d) { goTitle(); return; }
  const tabs = d.kind === 'tour' ? 2 : 3;
  if (menuHit('left') || Input.pressed.Tab) { SER.tab = (SER.tab + (menuHit('left') ? tabs - 1 : 1)) % tabs; SFX.blip(); }
  else if (menuHit('right')) { SER.tab = (SER.tab + 1) % tabs; SFX.blip(); }
  if (menuHit('ok')) serMain();
  else if (Input.pressed.KeyN) serAbandon();
  else if (menuHit('back')) goTitle();
}
function serMain() {
  const d = SER.d;
  if (d.done) { serDrop(d.kind); openSeries(d.kind); return; }
  if (serNext(d)) serPlay();
  else { serAdvance(d, true); SER.scroll = null; SFX.blip(); }
}
function serAbandon() {
  const d = SER.d;
  if (SER.confirm !== d.made) { SER.confirm = d.made; toast('Press N again to end this ' + (d.kind === 'tour' ? 'tournament' : 'league') + ' and start over', 2.5); return; }
  SER.confirm = null; serDrop(d.kind); openSeries(d.kind);
}
function serTitle(d) {
  if (d.done) return serName(d, d.champ) + (d.champ === 0 ? ': you are the champions!' : ' are the champions');
  if (serNext(d)) { const g = serNext(d), opp = g.a === 0 ? g.b : g.a; return serRoundName(d) + ': you play ' + serName(d, opp); }
  return serOut(d) || d.out ? 'You’re out. Watch the rest play out.' : serRoundName(d);
}
function drawSeries(g) {
  dim(g, 0.84);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  try {
    const d = SER.d, tabs = d.kind === 'tour' ? ['Bracket', 'Leaders'] : ['Standings', 'Schedule', 'Leaders'];
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(d.kind === 'tour' ? 'Tournament' : 'League', W / 2, 40);
    g.fillStyle = d.done && d.champ === 0 ? '#9dffb0' : IVORY; g.font = `15px ${BODY}`; g.fillText(fitText(g, serTitle(d), 900), W / 2, 64);
    tabs.forEach((t, i) => { const x = W / 2 - tabs.length * 70 + i * 140, on = SER.tab === i; g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, x + 5, 76, 130, 28, 14); g.fill(); g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.textAlign = 'center'; g.fillText(t, x + 70, 95); addRect(x + 5, 76, 130, 28, () => { SER.tab = i; }); });
    panel(g, 30, 114, 900, 336, false);
    const tab = tabs[SER.tab];
    if (tab === 'Bracket') drawSerBracket(g, d); else if (tab === 'Standings') drawSerStandings(g, d); else if (tab === 'Schedule') drawSerSchedule(g, d); else drawSerLeaders(g, d);
    const main = d.done ? 'Start a new one' : serNext(d) ? 'Play your game' : 'Play out the rest';
    uiButton(g, W / 2 - 230, 466, 220, 42, main, serMain, true);
    uiButton(g, W / 2 + 10, 466, 220, 42, 'Leave (saved)', goTitle, false);
    if (!Input.touchMode) { g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.textAlign = 'center'; g.fillText('Enter: ' + main.toLowerCase() + '   ← →: tabs   N: end and start over   Esc: leave (saved)', W / 2, 528); }
    else uiButton(g, W - 150, 470, 120, 34, 'Start over', serAbandon, false);
  } finally { W = rw; Game.ox = 0; g.restore(); }
}
function serTeamCell(g, d, i, x, y, w, score, won, live) {
  const T = serTeam(d.keys[i]);
  g.fillStyle = live ? 'rgba(232,195,90,0.22)' : 'rgba(255,255,255,0.06)'; roundRect(g, x, y, w, 26, 6); g.fill();
  drawCrest(g, x + 14, y + 13, 9, T);
  g.textAlign = 'left'; g.font = `12px ${won ? FONT : BODY}`; g.fillStyle = i === 0 ? GOLD : won === false ? '#8a9aab' : '#fff';
  g.fillText(fitText(g, T.short || T.name, w - 62), x + 28, y + 17);
  if (score != null) { g.textAlign = 'right'; g.fillText(String(score), x + w - 8, y + 17); }
}
function drawSerBracket(g, d) {
  const size = d.keys.length, rounds = Math.log2(size), cw = 860 / (rounds + 1), x0 = 50;
  for (let r = 0; r <= rounds; r++) {
    const R = d.rounds[r], n = size / Math.pow(2, r + 1), x = x0 + r * cw, w = cw - 30;
    g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`;
    g.fillText(r === rounds ? 'CHAMPION' : n === 1 ? 'FINAL' : n === 2 ? 'SEMIFINALS' : 'QUARTERFINALS', x, 136);
    if (r === rounds) { if (d.done) { serTeamCell(g, d, d.champ, x, 280, w, null, true, d.champ === 0); g.fillStyle = GOLD; star8(g, x + w / 2, 250, 18); g.fill(); } continue; }
    for (let k = 0; k < n; k++) {
      const gap = 300 / n, y = 150 + gap * k + gap / 2 - 28, gm = R && R[k];
      if (!gm) { g.fillStyle = 'rgba(255,255,255,0.04)'; roundRect(g, x, y, w, 26, 6); g.fill(); roundRect(g, x, y + 30, w, 26, 6); g.fill(); continue; }
      const live = gm.w < 0 && (gm.a === 0 || gm.b === 0);
      serTeamCell(g, d, gm.a, x, y, w, gm.sa, gm.w < 0 ? null : gm.w === gm.a, live);
      serTeamCell(g, d, gm.b, x, y + 30, w, gm.sb, gm.w < 0 ? null : gm.w === gm.b, live);
    }
  }
}
function drawSerStandings(g, d) {
  const S = serStandings(d), cols = [['TEAM', 60, 'left'], ['W', 520, 'right'], ['L', 580, 'right'], ['PF', 660, 'right'], ['PA', 740, 'right'], ['+/-', 830, 'right']];
  g.font = `11px ${FONT}`; g.fillStyle = '#9fb3c8'; for (const [t, x, a] of cols) { g.textAlign = a; g.fillText(t, x, 138); }
  const lh = Math.min(34, 290 / S.length);
  S.forEach((s, r) => {
    const y = 146 + r * lh, T = serTeam(d.keys[s.i]);
    if (r < 2) { g.fillStyle = 'rgba(232,195,90,0.12)'; g.fillRect(44, y, 872, lh - 3); }
    g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(String(r + 1), 50, y + lh / 2 + 5);
    drawCrest(g, 80, y + lh / 2 - 1, Math.min(11, lh / 2 - 3), T);
    g.fillStyle = s.i === 0 ? GOLD : '#fff'; g.font = `14px ${BODY}`; g.fillText(fitText(g, T.name, 400), 98, y + lh / 2 + 5);
    g.textAlign = 'right'; g.font = `14px ${FONT}`;
    [[s.w, 520], [s.l, 580], [s.pf, 660], [s.pa, 740], [(s.pf - s.pa > 0 ? '+' : '') + (s.pf - s.pa), 830]].forEach(([v, x]) => g.fillText(String(v), x, y + lh / 2 + 5));
  });
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(d.final ? 'Final: ' + serName(d, d.final.a) + ' vs ' + serName(d, d.final.b) + (d.final.w >= 0 ? '  (' + d.final.sa + '–' + d.final.sb + ')' : '') : 'The top two (highlighted) play the final.', 50, 440);
}
function drawSerSchedule(g, d) {
  const days = [...d.days.map((day, i) => ({ name: 'Matchday ' + (i + 1), games: day })), ...(d.final ? [{ name: 'Final', games: [d.final] }] : [])];
  const cur = d.final ? days.length - 1 : Math.min(d.day, days.length - 1);
  SER.scroll = clamp(SER.scroll == null ? cur : SER.scroll, 0, days.length - 1);
  if (menuHit('up')) SER.scroll = Math.max(0, SER.scroll - 1); if (menuHit('down')) SER.scroll = Math.min(days.length - 1, SER.scroll + 1);
  const show = days.slice(SER.scroll, SER.scroll + 2);
  show.forEach((day, c) => {
    const x = 60 + c * 440;
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `14px ${FONT}`; g.fillText(day.name, x, 140);
    day.games.forEach((gm, k) => {
      const y = 152 + k * 64;
      serTeamCell(g, d, gm.a, x, y, 380, gm.sa, gm.w < 0 ? null : gm.w === gm.a, gm.w < 0 && (gm.a === 0 || gm.b === 0));
      serTeamCell(g, d, gm.b, x, y + 28, 380, gm.sb, gm.w < 0 ? null : gm.w === gm.b, gm.w < 0 && (gm.a === 0 || gm.b === 0));
    });
  });
  g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText((Input.touchMode ? '' : '↑ ↓ ') + (SER.scroll + 1) + '–' + Math.min(days.length, SER.scroll + 2) + ' of ' + days.length, 910, 440);
  if (Input.touchMode) { uiButton(g, 700, 418, 40, 28, '‹', () => { SER.scroll = Math.max(0, SER.scroll - 1); }, false); uiButton(g, 750, 418, 40, 28, '›', () => { SER.scroll = Math.min(days.length - 1, SER.scroll + 1); }, false); }
}
function drawSerLeaders(g, d) {
  const all = Object.values(d.stats).filter(s => s.gp > 0);
  [['POINTS', 'pts'], ['REBOUNDS', 'reb'], ['ASSISTS', 'ast']].forEach(([t, k], c) => {
    const x = 60 + c * 290, L = all.slice().sort((a, b) => b[k] / b.gp - a[k] / a.gp).slice(0, 6);
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(t + ' PER GAME', x, 140);
    if (!L.length) { g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('After the first games', x, 170); }
    L.forEach((s, r) => {
      const y = 166 + r * 44, T = serTeam(d.keys[s.t]);
      drawCrest(g, x + 10, y, 9, T);
      g.textAlign = 'left'; g.fillStyle = s.t === 0 ? GOLD : '#fff'; g.font = `13px ${BODY}`; g.fillText(fitText(g, s.n, 180), x + 26, y + 5);
      g.fillStyle = '#9fb3c8'; g.font = `10px ${BODY}`; g.fillText(fitText(g, T.short || T.name, 120) + '  •  ' + s.gp + ' GP', x + 26, y + 20);
      g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `16px ${FONT}`; g.fillText((s[k] / s.gp).toFixed(1), x + 260, y + 7);
    });
  });
}

// ---- screens, and the Quick Play entries
{
  const SCR = { sersetup: [serSetupUpdate, drawSerSetup], series: [serUpdate, drawSeries] };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments); if (was && Game.screen === sc) { SCR[sc][0](); attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s[1](g); drawBackButton(g); };
  BACK.sersetup = () => goTitle(); BACK.series = () => goTitle();
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    const M0 = _tm.apply(this, arguments), qp = M0.find(e => e.label === 'Quick Play'), pg = qp && qp.sub && qp.sub.find(e => e.label === 'Play a game');
    const lab = (k, n) => n + (serLoad(k) ? ' (continue)' : '');
    const items = [{ label: lab('tour', 'Tournament'), act: () => openSeries('tour') }, { label: lab('league', 'League'), act: () => openSeries('league') }];
    if (pg) pg.sub.push(...items); else if (qp) qp.sub.push(...items);
    return M0;
  };
}
