// ================================================= v6.0: SEASONS
// Group stage (two pools of four, top two advance to the semifinals), choose your
// partner with chemistry, seasons after the World Ummah Cup (banners and engraved
// trophies in the gym), and a stats / box score book.

// ------------------------------------------------------------- group stage
function makePoolBracket(stage) {
  const R = seededRng(C.seed + stage * 131 + (C.retries || 0) * 17 + (C.season || 1) * 7919);
  const mid = [2, 3, 4, 5, 6, 7];
  for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
  const A = [0, mid[0], mid[1], mid[2]], B = [1, mid[3], mid[4], mid[5]];
  const sched = T => [[T[0], T[1]], [T[2], T[3]], [T[0], T[2]], [T[1], T[3]], [T[0], T[3]], [T[1], T[2]]].map((x, i) => ({ a: x[0], b: x[1], md: i >> 1 }));
  return { fmt: 'pool', round: 0, md: 0, out: false, pools: [A, B], pg: [sched(A), sched(B)], rounds: [] };
}
function standings(b, pi) {
  const rows = b.pools[pi].map(id => ({ id, w: 0, l: 0, pf: 0, pa: 0 })), by = id => rows.find(r => r.id === id);
  for (const g of b.pg[pi]) { if (g.w == null) continue; const A = by(g.a), B = by(g.b); A.pf += g.sa; A.pa += g.sb; B.pf += g.sb; B.pa += g.sa; if (g.w === g.a) { A.w++; B.l++; } else { B.w++; A.l++; } }
  const h2h = (x, y) => { const g = b.pg[pi].find(q => (q.a === x.id && q.b === y.id) || (q.a === y.id && q.b === x.id)); return g && g.w != null ? (g.w === x.id ? -1 : 1) : 0; };
  return rows.sort((x, y) => (y.w - x.w) || h2h(x, y) || ((y.pf - y.pa) - (x.pf - x.pa)) || (y.pf - x.pf));
}
function roundLabel(b, r) {
  if (!b) return '';
  r = r == null ? b.round : r;
  if (b.fmt === 'pool') return r === 0 ? 'Group game ' + Math.min(3, (b.md || 0) + 1) : r === 1 ? 'Semifinal' : 'Final';
  return ROUND_NAMES[r] || '';
}
function venueRound(b) { if (!b || b.fmt !== 'pool') return b ? b.round : 0; if (b.round > 0) return b.round; return C.stage === 0 ? (b.md === 1 ? 1 : 0) : (b.md === 2 ? 1 : 0); }
{
  const _mb = makeBracket;
  makeBracket = function (stage) { return C && (C.sv || 1) >= 3 ? makePoolBracket(stage) : _mb(stage); };
  const _om = ourMatch;
  ourMatch = function () {
    const b = C.bracket; if (!b || b.fmt !== 'pool') return _om();
    if (b.round === 0) return b.pg[0].find(m => m.md === Math.min(2, b.md) && (m.a === 0 || m.b === 0));
    const r = b.rounds[b.round - 1]; return r && r.find(m => m.a === 0 || m.b === 0);
  };
  const _rc = recordCareerResult;
  recordCareerResult = function (won, us, them) {
    const b = C.bracket; if (!b || b.fmt !== 'pool') return _rc(won, us, them);
    const m = ourMatch();
    if (m.a === 0) { m.sa = us; m.sb = them; } else { m.sb = us; m.sa = them; }
    m.w = won ? 0 : (m.a === 0 ? m.b : m.a);
    const simKO = () => { for (let r = b.round; r < 2; r++) { const R = b.rounds[r] || (b.rounds[r] = [{ a: b.rounds[r - 1][0].w, b: b.rounds[r - 1][1].w }]); for (const x of R) if (x.w == null) simCareerMatch(x); } };
    if (b.round === 0) {
      for (const pool of b.pg) for (const g of pool) if (g.md === b.md && g !== m && g.w == null) simCareerMatch(g);
      b.md++;
      if (b.md < 3) return 'next';
      const sa = standings(b, 0), sb = standings(b, 1);
      b.rounds.push([{ a: sa[0].id, b: sb[1].id }, { a: sb[0].id, b: sa[1].id }]);
      if (sa.findIndex(r => r.id === 0) > 1) { b.out = true; b.outGroup = true; for (const x of b.rounds[0]) simCareerMatch(x); b.rounds.push([{ a: b.rounds[0][0].w, b: b.rounds[0][1].w }]); simCareerMatch(b.rounds[1][0]); return 'out'; }
      b.round = 1; return 'next';
    }
    for (const x of b.rounds[b.round - 1]) if (x !== m && x.w == null) simCareerMatch(x);
    if (b.round === 1) {
      const R = b.rounds[0]; b.rounds.push([{ a: R[0].w, b: R[1].w }]);
      if (!won) { b.out = true; simCareerMatch(b.rounds[1][0]); return 'out'; }
      b.round = 2; return 'next';
    }
    if (!won) { b.out = true; return 'out'; }
    const R2 = seededRng(C.seed + C.stage * 7), T = stageTeams(C.stage).divisions;
    C.divChamps[C.stage] = { Medium: pickR(R2, T.Medium), Large: pickR(R2, T.Large) };
    return 'champ';
  };
}
STORY.poolLoss = [
  [['saleem', 'A loss in the group stage is not the end. Win the next one and we’re still alive.'], ['tariq', 'I ran the numbers. We control our own path.']],
  [['siddiq', 'Chalk is forgiving, beta. The group isn’t over.'], ['khalil', 'We just need the next one. Bismillah.']],
  [['rafiq', 'Lose with adab, then come back with focus. The table can still turn.']]
];
STORY.groupOut = [['saleem', 'We didn’t get out of the group this time. Sabr. We learn, we practice, and we enter again.'], ['tariq', 'Third place on point difference. I’m going to be thinking about that for a while.']];

// ------------------------------------------------------------- partners + chemistry
const PARTNERS = ['saleem', 'nasser', 'khalil', 'tariq'];
const PARTNER_ARCH = { nasser: 'sharpshooter', khalil: 'rimrunner', tariq: 'playmaker' };
const CHEM_TIERS = [[0, 'New partnership'], [25, 'In sync: quicker passes'], [50, 'Trusted: passes are harder to pick off'], [75, 'Brothers: his screens hit harder'], [100, 'Like brothers: everything clicks']];
function chemOf(id) { return clamp(((C && C.chem) || {})[id] || 0, 0, 100); }
function chemTier(v) { let t = CHEM_TIERS[0][1]; for (const [n, s] of CHEM_TIERS) if (v >= n) t = s; return t; }
function addChem(id, n) { if (!C) return; C.chem = C.chem || {}; const was = chemOf(id); C.chem[id] = clamp(was + n, 0, 100); if (was < 100 && C.chem[id] >= 100) Ach.unlock('chem_max'); }
function partnerDef(id) {
  id = id || (C && C.partner) || 'saleem';
  if (id === 'saleem') return saleemDef();
  const base = CAST[id], b = Math.floor(C.stage * 0.8), st = Object.assign({}, base.stats || { spd: 6, sht: 6, dnk: 5, def: 5, stl: 5 });
  for (const k of ['spd', 'sht', 'dnk', 'def', 'stl']) st[k] = Math.min(10, st[k] + b);
  if (id === 'tariq') st.pas = Math.min(10, 7 + b);
  return Object.assign({}, base, { stats: st, arch: PARTNER_ARCH[id] });
}
amanahTeam = function () { return { name: 'Masjid Al-Amanah', short: 'AMANAH', place: 'Eastside', c1: '#2c6e8f', c2: '#f2cf6b', crest: 'arch', players: [partnerDef(), playerDef()] }; };

// ------------------------------------------------------------- seasons
function seasonBoost() { return Math.min(0.6, 0.3 * (((C && C.season) || 1) - 1)); }
{
  const _cl = careerLevels;
  careerLevels = function (stage) { const r = _cl(stage); r.opp = Math.min(2.5, r.opp + seasonBoost()); return r; };
}
function respecRefund() { let n = 0; for (const [k] of STAT_ROWS) for (let l = 4; l < (C.lv[k] || 4); l++) n += statCost(l); return n; }
function startNewSeason(respec) {
  C.history = C.history || [];
  const games = (C.games || []).filter(g => g.s === C.season);
  C.history.push({ s: C.season, stageLog: C.stageLog, w: games.filter(g => g.w).length, l: games.filter(g => !g.w).length, titles: (C.titles || []).filter(t => t.s === C.season).map(t => t.st) });
  if (respec) { C.bp += respecRefund(); for (const [k] of STAT_ROWS) C.lv[k] = 4; }
  C.season = (C.season || 1) + 1; C.seed = (Math.random() * 1e9) | 0; C.stage = 0; C.retries = 0; C.done = false; C.divChamps = {}; C.seasonOver = null;
  C.stageLog = {}; C.bracket = makeBracket(0); slog(0); C.streak = 0; C.lastResult = null;
  for (let s = 0; s < 4; s++) C.seen['stage' + s] = true;
  Ach.unlock('season_2'); saveCareer();
  playStory([['saleem', 'Season ' + C.season + '. Same masjid, same intention, a new season. Everybody starts at zero again.'],
    ['tariq', 'New season, new opponents. I already started a new stat sheet. Clean page.'],
    ['siddiq', 'I wiped the chalkboard, but the banners stay up. Those are earned.'],
    ['jalal', 'Al-Burhan is back too. Last season was last season.']], careerHub);
}
function hubExtra(items) {
  if (C && C.done && !C.seasonOver) items.unshift({ label: 'Start Season ' + ((C.season || 1) + 1), act: () => { Game.screen = 'newseason'; Game.idx = 0; } });
  const mp = items.find(x => x.label === 'My Player');
  if (mp && mp.sub && !mp.sub.some(s => s.label === 'Stats & box scores')) mp.sub.splice(1, 0, { label: 'Stats & box scores', act: () => openStats() });
  return items;
}
function newSeasonUpdate() {
  if (menuHit('up') || menuHit('down')) { Game.idx = (Game.idx + (menuHit('up') ? 2 : 1)) % 3; SFX.blip(); }
  if (menuHit('ok')) { SFX.blip(); if (Game.idx === 2) careerHub(); else startNewSeason(Game.idx === 1); }
  else if (menuHit('back')) careerHub();
}
function drawNewSeason(g) {
  panel(g, W / 2 - 330, 60, 660, 420, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Season ' + ((C.season || 1) + 1), W / 2, 108);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`;
  const so = C.seasonOver, titles = (C.titles || []).filter(t => t.s === (C.season || 1)).length;
  const why = so ? 'Season ' + so.s + ' ended: ' + so.round + ' loss to ' + so.opp + ' (' + so.us + '\u2013' + so.them + ') at the ' + STAGES[so.st].name + ' stage.'
    : C.done ? 'Season ' + (C.season || 1) + ' complete: World Ummah Cup champions, alhamdulillah.' : '';
  if (why) { g.fillStyle = so ? '#ffb08a' : '#9dffb0'; g.font = `14px ${FONT}`; wrapText(g, why, W / 2, 136, 600, 20); }
  const now = seasonBoost(), next = Math.min(0.6, 0.3 * (C.season || 1)), chem = chemOf(C.partner || 'saleem');
  g.fillStyle = IVORY; g.font = `13px ${BODY}`;
  wrapText(g, 'Carries over: your stats (unless you renew), masjid and gym upgrades, ' + (titles ? titles + ' title banner' + (titles > 1 ? 's' : '') + ' from this season, ' : 'every title banner, ') + 'and chemistry with ' + castDef(C.partner || 'saleem').name + ' (' + chemTier(chem).split(':')[0].toLowerCase() + ').', W / 2, so || C.done ? 166 : 140, 600, 18);
  g.fillStyle = '#9fb3c8';
  wrapText(g, 'Next year: back to the Metro Masjid League with new opponents' + (next > now ? ', and every CPU opponent steps up a level' : ' (the CPU ladder is already at its toughest)') + '.', W / 2, so || C.done ? 210 : 184, 600, 18);
  const opts = [['Keep my stats', 'Carry every level into the new season.'], ['Renew my intention', 'Reset stats to 4 and refund ' + respecRefund() + ' BP to spend again.'], ['Not yet', 'Back to the hub.']];
  opts.forEach(([t, d], i) => {
    const y = 246 + i * 70, on = Game.idx === i;
    g.fillStyle = on ? 'rgba(232,195,90,0.92)' : 'rgba(255,255,255,0.08)'; roundRect(g, W / 2 - 260, y, 520, 60, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `17px ${FONT}`; g.fillText(t, W / 2 - 240, y + 26);
    g.fillStyle = on ? '#3a2a0a' : '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(d, W / 2 - 240, y + 46);
    addRect(W / 2 - 260, y, 520, 60, () => { Game.idx = i; if (i === 2) careerHub(); else startNewSeason(i === 1); });
  });
}
// banners hang from the gym ceiling for every title, by season
const BANNER_COL = ['#2e7d5b', '#2c6e8f', '#8e2b3a', '#c9a24a'];
function drawBanners(g, X, Y) {
  const T = ((C && C.titles) || []).slice(-10);
  T.forEach((t, i) => {
    const x = X(440 + i * 70), y = Y(18), w = 30, h = 46;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle = BANNER_COL[t.st] || '#555'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w / 2, y + h - 8); g.lineTo(x, y + h); g.closePath(); g.fill();
    g.strokeStyle = '#f2cf6b'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#f2cf6b'; star8(g, x + w / 2, y + 11, 5); g.fill();
    g.fillStyle = '#fff'; g.font = `6px ${FONT}`; g.textAlign = 'center';
    g.fillText(STAGES[t.st].name.toUpperCase(), x + w / 2, y + 26); g.fillText('CHAMPS', x + w / 2, y + 32); g.fillText('S' + t.s, x + w / 2, y + 39);
  });
}
{
  const _gb = drawGymBack;
  drawGymBack = function (g, t, U = gymUp()) {
    _gb(g, t, U);
    const X = wx => wx - cam.x + FX.sx, Y = y => y + FX.sy;
    drawBanners(g, X, Y);
  };
}

// ------------------------------------------------------------- box scores + stats book
function boxRow(p) { const s = p.stats; return { n: p.def.name, pts: s.pts || 0, reb: s.reb || 0, ast: s.ast || 0, stl: s.stl || 0, blk: s.blk || 0, fgm: s.fgm || 0, fga: s.fga || 0, tpm: s.tpm || 0, tpa: s.tpa || 0, ftm: s.ftm || 0, fta: s.fta || 0, pf: s.pf || 0, tov: p.tov || 0 }; }
function captureBox() {
  const b = C.bracket;
  return { s: C.season || 1, st: M.careerStage, r: roundLabel(b), opp: M.teamDefs[1].name, us: M.teams[0].score, them: M.teams[1].score, w: M.winner === 0,
    partner: C.partner || 'saleem', venue: (M.venue && M.venue.name) || '', a: M.teams[0].players.map(boxRow).reverse(), o: M.teams[1].players.map(boxRow) };
}
{
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    const box = captureBox(), won = M.winner === 0, me = M.players.find(p => p.human === 0), mate = me && me.mate, st = M.careerStage;
    _cam();
    C.games = C.games || []; C.games.push(box); if (C.games.length > 160) C.games.splice(0, C.games.length - 160);
    const pid = C.partner || 'saleem';
    addChem(pid, (won ? 8 : 5) + Math.min(5, ((me && me.stats.ast) || 0) + ((mate && mate.stats.ast) || 0)));
    const p = Game.post;
    if (p && p.res === 'champ') { C.titles = C.titles || []; if (!C.titles.some(t => t.s === (C.season || 1) && t.st === st)) C.titles.push({ s: C.season || 1, st, w: (C.stageLog[st] || {}).w || 0, l: (C.stageLog[st] || {}).l || 0 }); }
    if (p && p.res === 'next' && !won) p.lines = careerBeatsOnly(p.lines).concat(pick(STORY.poolLoss));
    if (p && p.res === 'out' && C.bracket.outGroup) p.lines = careerBeatsOnly(p.lines).concat(STORY.groupOut);
    if (p) p.chem = { id: pid, v: chemOf(pid) };
    saveCareer();
  };
}
// keep the milestone beats a story already carries, drop the default win/loss lines after them
function careerBeatsOnly(lines) { const n = Game.lastBeatN || 0; return lines.slice(0, n); }
{
  const _cb = careerBeats;
  careerBeats = function (c) { const r = _cb(c); Game.lastBeatN = r.length; return r; };
  const _tg = trackCareerGame;
  trackCareerGame = function (g) { const r = _tg(g); r.andOne = !!M.cAndOne; r.pin = !!M.cPin; return r; };
  BEATS.push(
    { id: 'first_and_one', label: 'First and-one', when: c => c.andOne, lines: [['khalil', 'AND ONE! I felt that from the bench.'], ['rafiq', 'Strong finish. And you helped him up after. Good.']] },
    { id: 'first_pin', label: 'First chase-down block', when: c => c.pin, lines: [['tariq', 'Pinned on the glass. I need a new column on the sheet for that.'], ['saleem', 'Never give up on a play. That block is what effort looks like.']] }
  );
  const pb = BEATS.find(b => b.id === 'perfect_stage'); if (pb) pb.lines = [['tariq', 'Undefeated tournament. Every game, a win. A perfect sheet, masha’Allah.']];
}
function statLine(rows) {
  const t = { gp: rows.length, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
  for (const r of rows) for (const k in t) if (k !== 'gp') t[k] += r[k] || 0;
  return t;
}
const pct = (m, a) => a ? Math.round(100 * m / a) + '%' : '–';
const avg = (v, n) => n ? (v / n).toFixed(1) : '0.0';
function openStats() { const seasons = statSeasons(); Game.stats = { view: 'season', s: seasons[seasons.length - 1], sel: 0, scroll: 0 }; Game.screen = 'cstats'; SFX.blip(); }
function statSeasons() { const set = new Set((C.games || []).map(g => g.s)); set.add(C.season || 1); return [...set].sort((a, b) => a - b); }
function seasonGames(s) { return (C.games || []).filter(g => g.s === s).slice().reverse(); }
function statsUpdate() {
  const S = Game.stats, list = seasonGames(S.s), seasons = statSeasons();
  if (S.view === 'box') { if (menuHit('ok') || menuHit('back')) S.view = 'season'; return; }
  if (Input.pressed.Tab || Input.pressed.KeyT) { S.view = S.view === 'career' ? 'season' : 'career'; SFX.blip(); }
  if (S.view === 'season') {
    if (menuHit('left') || menuHit('right')) { const i = seasons.indexOf(S.s), j = clamp(i + (menuHit('left') ? -1 : 1), 0, seasons.length - 1); if (j !== i) { S.s = seasons[j]; S.sel = 0; S.scroll = 0; SFX.blip(); } }
    if (menuHit('up')) { S.sel = Math.max(0, S.sel - 1); SFX.blip(); }
    if (menuHit('down')) { S.sel = Math.min(Math.max(0, list.length - 1), S.sel + 1); SFX.blip(); }
    S.scroll = clamp(S.scroll, S.sel - 8, S.sel);
    if (menuHit('ok') && list[S.sel]) { S.view = 'box'; S.box = list[S.sel]; SFX.blip(); }
  }
  if (menuHit('back')) careerHub();
}
function drawStats(g) {
  const S = Game.stats;
  if (S.view === 'box') return drawBoxBook(g, S.box);
  panel(g, 30, 20, 900, 500, true);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Stats & box scores', 56, 58);
  [['season', 'Season'], ['career', 'Career']].forEach(([k, l], i) => {
    const x = 560 + i * 120, on = S.view === k;
    g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, x, 36, 110, 30, 15); g.fill();
    g.textAlign = 'center'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.fillText(l, x + 55, 56); addRect(x, 36, 110, 30, () => { S.view = k; });
  });
  if (S.view === 'career') return drawCareerTable(g);
  const list = seasonGames(S.s), mine = list.map(x => x.a[0]), t = statLine(mine), w = list.filter(x => x.w).length;
  const seasons = statSeasons();
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `16px ${FONT}`; g.fillText((seasons.length > 1 ? '◂ ' : '') + 'Season ' + S.s + (seasons.length > 1 ? ' ▸' : '') + (S.s === (C.season || 1) ? '  (current)' : ''), 56, 92);
  const tiles = [['GP', String(t.gp)], ['W–L', w + '–' + (t.gp - w)], ['PPG', avg(t.pts, t.gp)], ['RPG', avg(t.reb, t.gp)], ['APG', avg(t.ast, t.gp)],
    ['SPG', avg(t.stl, t.gp)], ['BPG', avg(t.blk, t.gp)], ['FG%', pct(t.fgm, t.fga)], ['3P%', pct(t.tpm, t.tpa)], ['FT%', pct(t.ftm, t.fta)]];
  tiles.forEach(([l, v], i) => { const x = 56 + (i % 5) * 76, y = 108 + Math.floor(i / 5) * 62; g.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(g, x, y, 70, 54, 8); g.fill(); g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `10px ${FONT}`; g.fillText(l, x + 35, y + 17); g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(v, x + 35, y + 42); });
  // season highs
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('SEASON HIGHS', 56, 256);
  const hi = k => mine.reduce((m, r, i) => r[k] > m.v ? { v: r[k], g: list[i] } : m, { v: 0, g: null });
  [['Points', 'pts'], ['Rebounds', 'reb'], ['Assists', 'ast'], ['Steals', 'stl'], ['Blocks', 'blk']].forEach(([l, k], i) => {
    const h = hi(k), y = 280 + i * 22; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(l, 56, y);
    g.fillStyle = '#fff'; g.font = `13px ${FONT}`; g.fillText(String(h.v), 150, y); if (h.g) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('vs ' + h.g.opp.replace('Masjid ', '') + ', ' + STAGES[h.g.st].name, 184, y); }
  });
  // partners this season
  const by = {}; for (const x of list) by[x.partner] = (by[x.partner] || 0) + 1;
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('PARTNERS', 56, 410);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; wrapTextLeft(g, Object.keys(by).length ? Object.entries(by).map(([k, n]) => castDef(k).name + ' ' + n + 'g (chem ' + chemOf(k) + ')').join('  •  ') : 'No games yet.', 56, 432, 380, 18);
  // game log
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('GAME LOG  (Enter: box score)', 470, 92);
  if (!list.length) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('No games this season yet.', 470, 120); }
  list.slice(S.scroll, S.scroll + 9).forEach((x, k) => {
    const i = S.scroll + k, y = 104 + k * 40, on = S.sel === i, r = x.a[0];
    g.fillStyle = on ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.05)'; roundRect(g, 466, y, 440, 36, 8); g.fill();
    g.textAlign = 'left'; g.fillStyle = on ? NIGHT : (x.w ? '#9dffb0' : '#ffb0b0'); g.font = `13px ${FONT}`; g.fillText((x.w ? 'W ' : 'L ') + x.us + '–' + x.them, 478, y + 15);
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `12px ${BODY}`; g.fillText(fitText(g, 'vs ' + x.opp.replace('Masjid ', '') + '  •  ' + STAGES[x.st].name + ', ' + x.r, 280), 560, y + 15);
    g.fillStyle = on ? '#3a2a0a' : '#9fb3c8'; g.fillText(r.pts + ' pts, ' + r.reb + ' reb, ' + r.ast + ' ast  •  ' + r.fgm + '/' + r.fga + ' FG', 478, y + 30);
    addRect(466, y, 440, 36, () => { S.sel = i; S.view = 'box'; S.box = x; });
  });
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('← → season  •  ↑ ↓ game  •  Tab: career totals  •  Esc: back', W / 2, 504);
}
function drawCareerTable(g) {
  const seasons = statSeasons(), cols = ['SEASON', 'GP', 'W–L', 'PPG', 'RPG', 'APG', 'SPG', 'BPG', 'FG%', '3P%', 'FT%', 'TITLES'];
  const xs = [56, 150, 200, 270, 330, 390, 450, 510, 570, 640, 710, 780];
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`; cols.forEach((c, i) => g.fillText(c, xs[i], 104));
  const rowOf = (label, games, titles) => { const r = games.map(x => x.a[0]), t = statLine(r), w = games.filter(x => x.w).length;
    return [label, t.gp, w + '–' + (t.gp - w), avg(t.pts, t.gp), avg(t.reb, t.gp), avg(t.ast, t.gp), avg(t.stl, t.gp), avg(t.blk, t.gp), pct(t.fgm, t.fga), pct(t.tpm, t.tpa), pct(t.ftm, t.fta), titles]; };
  const rows = seasons.map(s => rowOf('Season ' + s, (C.games || []).filter(x => x.s === s), ((C.titles || []).filter(t => t.s === s).map(t => STAGES[t.st].name[0]).join(' ')) || '–'));
  rows.push(rowOf('Career', C.games || [], String((C.titles || []).length)));
  rows.forEach((r, k) => {
    const y = 132 + k * 30, tot = k === rows.length - 1;
    if (tot) { g.fillStyle = 'rgba(232,195,90,0.15)'; g.fillRect(48, y - 18, 860, 26); }
    r.forEach((v, i) => { g.textAlign = 'left'; g.fillStyle = tot ? GOLD : i === 0 ? '#fff' : IVORY; g.font = `${i === 0 || tot ? 13 : 13}px ${i === 0 || tot ? FONT : BODY}`; g.fillText(String(v), xs[i], y); });
  });
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Titles: L Local, S State, N National, W World. Box scores are kept for your last 160 games.', 56, 470);
  g.textAlign = 'center'; g.fillText('Tab: season view  •  Esc: back', W / 2, 504);
}
function drawBoxBook(g, x) {
  panel(g, 30, 20, 900, 500, true);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('BOX SCORE  •  SEASON ' + x.s + '  •  ' + STAGES[x.st].title.toUpperCase() + '  •  ' + x.r.toUpperCase(), W / 2, 50);
  g.fillStyle = x.w ? GOLD : '#ffb0b0'; g.font = `26px ${FONT}`; g.fillText('Al-Amanah ' + x.us + '  –  ' + x.them + ' ' + x.opp.replace('Masjid ', ''), W / 2, 86);
  if (x.venue) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(x.venue, W / 2, 106); }
  const cols = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG', '3P', 'FT', 'TO', 'PF'], xs = [330, 390, 450, 510, 570, 630, 700, 770, 830, 880];
  const table = (y, title, rows) => {
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(title, 56, y);
    g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`; cols.forEach((c, i) => { g.textAlign = 'center'; g.fillText(c, xs[i], y); });
    const tot = rows.reduce((t, r) => { for (const k in r) if (typeof r[k] === 'number') t[k] = (t[k] || 0) + r[k]; return t; }, { n: 'Team' });
    [...rows, tot].forEach((r, k) => {
      const yy = y + 26 + k * 26, last = k === rows.length;
      if (last) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(48, yy - 17, 860, 24); }
      g.textAlign = 'left'; g.fillStyle = last ? '#9fb3c8' : '#fff'; g.font = `13px ${last ? FONT : BODY}`; g.fillText(r.n, 60, yy);
      [r.pts, r.reb, r.ast, r.stl, r.blk, r.fgm + '-' + r.fga, r.tpm + '-' + r.tpa, r.ftm + '-' + r.fta, r.tov, r.pf].forEach((v, i) => { g.textAlign = 'center'; g.fillStyle = i === 0 && !last ? '#fff' : IVORY; g.fillText(String(v), xs[i], yy); });
    });
  };
  table(146, 'MASJID AL-AMANAH', x.a); table(296, x.opp.toUpperCase(), x.o);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Enter or Esc to go back', W / 2, 504);
  addRect(0, 0, W, H, () => { Game.stats.view = 'season'; });
}

// ------------------------------------------------------------- pregame: choose your partner
function cyclePartner(d) { const i = PARTNERS.indexOf(C.partner || 'saleem'); C.partner = PARTNERS[(i + d + PARTNERS.length) % PARTNERS.length]; SFX.blip(); saveCareer(); }
function drawPartnerPicker(g) {                                       // top-right of the Al-Amanah card on the pre-game screen
  const id = C.partner || 'saleem', v = chemOf(id), x = 700, y = 358, w = 210;
  g.fillStyle = 'rgba(8,16,24,0.9)'; roundRect(g, x, y, w, 66, 10); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.55)'; g.lineWidth = 1; g.stroke();
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `9px ${FONT}`; g.fillText('PARTNER  \u2190 \u2192', x + 10, y + 14);
  g.fillStyle = '#fff'; g.font = `13px ${FONT}`; g.fillText(fitText(g, '\u25C2 ' + castDef(id).name + ' \u25B8', w - 20), x + 10, y + 32);
  g.fillStyle = '#9fb3c8'; g.font = `9px ${FONT}`; g.fillText('CHEMISTRY ' + v, x + 10, y + 47);
  meter(g, x + 92, y + 41, w - 102, 6, v / 100, v >= 75 ? '#57e389' : v >= 25 ? '#f2cf6b' : '#9fb3c8');
  g.fillStyle = IVORY; g.font = `10px ${BODY}`; g.fillText(fitText(g, chemTier(v), w - 20), x + 10, y + 60);
  addRect(x, y, w / 2, 66, () => cyclePartner(-1)); addRect(x + w / 2, y, w / 2, 66, () => cyclePartner(1));
}

// ------------------------------------------------------------- bracket screen (groups)
{
  const _dcb = drawCareerBracket;
  drawCareerBracket = function (g) {
    const b = C.bracket; if (!b || b.fmt !== 'pool') return _dcb(g);
    const S = STAGES[C.stage];
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(S.title, W / 2, 44);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Two groups of four. The top two in each group go to the semifinals.', W / 2, 66);
    ['GROUP A', 'GROUP B'].forEach((title, pi) => {
      const x = 40 + pi * 300, rows = standings(b, pi);
      panel(g, x, 84, 280, 196, false);
      g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(title, x + 14, 106); g.textAlign = 'right'; g.fillText('W-L    +/-', x + 266, 106);
      rows.forEach((r, k) => {
        const y = 132 + k * 34, t = teamOf(C.stage, r.id), adv = k < 2;
        if (adv) { g.fillStyle = 'rgba(87,214,141,0.12)'; g.fillRect(x + 6, y - 18, 268, 28); }
        drawCrest(g, x + 22, y - 5, 9, t);
        g.textAlign = 'left'; g.fillStyle = r.id === 0 ? '#ffe38a' : '#fff'; g.font = `12px ${r.id === 0 ? FONT : BODY}`; g.fillText(fitText(g, t.name.replace('Masjid ', ''), 150), x + 38, y);
        g.textAlign = 'right'; g.fillStyle = IVORY; g.fillText(r.w + '-' + r.l + '    ' + ((r.pf - r.pa) >= 0 ? '+' : '') + (r.pf - r.pa), x + 266, y);
      });
      if (pi === 0) { const our = b.pg[0].filter(q => q.a === 0 || q.b === 0); g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`;
        our.forEach((q, i) => { const o = q.a === 0 ? q.b : q.a, sc = q.w == null ? 'Game ' + (q.md + 1) : ((q.w === 0 ? 'W ' : 'L ') + (q.a === 0 ? q.sa + '–' + q.sb : q.sb + '–' + q.sa)); g.fillText(sc + ' vs ' + teamOf(C.stage, o).name.replace('Masjid ', ''), x + 6, 300 + i * 18); }); }
    });
    // knockouts
    const kx = 660; g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('SEMIFINALS', kx, 106); g.fillText('FINAL', kx, 316);
    const box = (m, y) => {
      panel(g, kx, y, 260, 58, m && (m.a === 0 || m.b === 0));
      [[m && m.a, m && m.sa], [m && m.b, m && m.sb]].forEach(([id, sc], k) => {
        const yy = y + 23 + k * 23; g.textAlign = 'left';
        if (id == null) { g.fillStyle = '#56657a'; g.font = `13px ${BODY}`; g.fillText(y > 300 ? 'Semifinal winner' : k ? 'Group runner-up' : 'Group winner', kx + 14, yy); return; }
        const t = teamOf(C.stage, id), lost = m.w != null && m.w !== id;
        drawCrest(g, kx + 16, yy - 5, 8, t); g.fillStyle = lost ? '#6d7a8c' : id === 0 ? '#ffe38a' : '#fff'; g.font = `12px ${id === 0 ? FONT : BODY}`;
        g.fillText(fitText(g, t.name.replace('Masjid ', ''), 170), kx + 30, yy); g.textAlign = 'right'; if (sc != null) g.fillText(String(sc), kx + 248, yy);
      });
    };
    const R0 = b.rounds[0] || [null, null], R1 = b.rounds[1] || [null];
    box(R0[0], 118); box(R0[1], 190); box(R1[0], 328);
    if (b.out) { g.textAlign = 'center'; g.fillStyle = '#ffb0b0'; g.font = `14px ${FONT}`; g.fillText(b.outGroup ? 'Out in the group stage' : 'Eliminated', kx + 130, 420); }
    const prev = C.divChamps[C.stage] || C.divChamps[C.stage - 1];
    if (prev) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Division champions: Medium, ' + prev.Medium + '. Large, ' + prev.Large + '.', W / 2, 490); }
    g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText('Press Enter or tap to go back', W / 2, 516);
    addRect(0, 0, W, H, careerHub);
  };
}
// scouting report for group games
function scoutCore(oppId) {
  const opp = teamOf(C.stage, oppId), R = seededRng(hash32(opp.name + '|' + C.seed + '|' + C.stage));
  const sw = 6 + Math.floor(R() * 7) + (oppId === 1 ? 2 : 0), sl = Math.floor(R() * 4);
  const sum = q => q.stats.sht + q.stats.dnk + q.stats.spd + q.stats.def + q.stats.stl;
  const star = opp.players.slice().sort((a, c) => sum(c) - sum(a))[0];
  const arch = star.arch || archetypeOf(star.stats), label = ARCHETYPES[arch] ? ARCHETYPES[arch].label : 'ALL-AROUND';
  const tot = opp.players.reduce((a, q) => { for (const k of ['sht', 'dnk', 'spd', 'def', 'stl']) a[k] = (a[k] || 0) + q.stats[k]; return a; }, {});
  const top = ['sht', 'dnk', 'spd', 'def', 'stl'].sort((a, c) => tot[c] - tot[a])[0];
  let tip = SCOUT_TIPS[top][Math.floor(R() * 2)];
  const note = (ARCH_NOTE[arch] || '') + (star.huffath ? ' He\u2019s a hafiz, so expect a Noor boost at some point.' : '');
  if (oppId === 1) tip = 'Jalal loves his first move. Hold Defend, stay in front, and don\u2019t bite on his fakes.';
  const v = Game.cv, road = !!(v && v.v.host === 1 && v.v.kind !== 'arena');
  return { oppId, opp, record: sw + '\u2013' + sl, path: [], star, label, note, tip, extra: '', where: v ? v.name : '', home: !!(v && v.v.host === 0), road };
}
{
  const _bs = buildScout;
  buildScout = function () {
    const b = C.bracket; if (!b || b.fmt !== 'pool') return _bs();
    const m = ourMatch(), oppId = m.a === 0 ? m.b : m.a, sc = scoutCore(oppId);
    sc.round = roundLabel(b);
    const pi = b.pools[0].includes(oppId) ? 0 : 1, path = [];
    for (const q of b.pg[pi]) { if (q.w == null || (q.a !== oppId && q.b !== oppId) || q.a === 0 || q.b === 0) continue; const o = q.a === oppId ? q.b : q.a, us = q.a === oppId ? q.sa : q.sb, them = q.a === oppId ? q.sb : q.sa; path.push((q.w === oppId ? 'Beat ' : 'Lost to ') + teamOf(C.stage, o).name.replace('Masjid ', '') + ' ' + us + '\u2013' + them); }
    if (b.round === 2) path.push('Won their semifinal');
    sc.path = path.slice(-3);
    const ours = standings(b, 0).findIndex(r => r.id === 0), rb = standings(b, 1).find(r => r.id === 1);
    if (oppId === 1) sc.extra = C.rival.w + C.rival.l ? 'Head to head: you are ' + C.rival.w + '\u2013' + C.rival.l + ' against Al-Burhan.' : 'First meeting with Al-Burhan. They\u2019ve been waiting for this.';
    else if (b.round === 0) sc.extra = 'Group A: you are ' + ['1st', '2nd', '3rd', '4th'][ours] + ' right now.  Al-Burhan is ' + rb.w + '\u2013' + rb.l + ' in Group B.';
    else { const alive = (b.rounds[b.round - 1] || []).some(q => q.a === 1 || q.b === 1); sc.extra = alive ? 'Around the bracket: Al-Burhan is still alive on the other side.' : 'Around the bracket: Al-Burhan is out. Jalal will be watching.'; }
    return sc;
  };
}
