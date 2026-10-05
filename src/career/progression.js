// ================================================= v5.0: PROGRESSION + ECONOMY
// Builds on the career systems above: C.bp / C.hb, statCost, STAGES, the bracket,
// the musalla cast and the sheikh's office. Adds per-stage logs, milestone beats,
// scouting reports, season summaries, two new recurring characters (Tariq and
// Uncle Siddiq) and habit tracking (drills, salah, shot timing, rival record).

// ------------------------------------------------------------- economy check
// Halal Bucks must stay cosmetic. This checks the rules the economy depends on and
// returns a list of problems (empty = fine). Used by the test harness; cheap enough
// to run at boot in development.
function econSelfCheck() {
  const out = [];
  for (const p of ALL_PROJECTS) for (const t of p.tiers) if (t[3] != null) out.push('project ' + p.key + ' carries a gameplay value');
  const a = amanahTeam(), b = JSON.stringify(a.players.map(x => x.stats));
  const save = C.up; C.up = Object.fromEntries(ALL_PROJECTS.map(p => [p.key, p.tiers.length]));
  const c = JSON.stringify(amanahTeam().players.map(x => x.stats)); C.up = save;
  if (b !== c) out.push('masjid projects change player stats');
  return out;
}

// ------------------------------------------------------------- after each game
function trackCareerGame(g) {
  const s = g.me.stats, L = slog(g.st);
  if (g.won) L.w++; else L.l++;
  L.bp += g.rw.bpTotal; L.hb += g.rw.hbTotal;
  if (g.oppId === 1) { if (g.won) { C.rival.w++; L.rw++; } else { C.rival.l++; L.rl++; } }
  // top performances this stage (game score: points plus the little things)
  const perf = { pts: s.pts || 0, ast: s.ast || 0, reb: s.reb || 0, stl: s.stl || 0, blk: s.blk || 0, opp: g.opp.name.replace('Masjid ', ''), round: g.roundName, us: g.us, them: g.them, won: g.won };
  perf.gs = perf.pts + 1.5 * perf.ast + 1.2 * perf.reb + 2 * (perf.stl + perf.blk) + (g.won ? 3 : 0);
  L.top.push(perf); L.top.sort((a, b) => b.gs - a.gs); L.top.length = Math.min(L.top.length, 3);
  // habits: time in the gym, salah before games
  C.noDrillGames = (C.drillsSince || 0) > 0 ? 0 : (C.noDrillGames || 0) + 1; C.drillsSince = 0;
  if (g.salah) { C.salahGames = (C.salahGames || 0) + 1; C.noSalahGames = 0; } else { C.noSalahGames = (C.noSalahGames || 0) + 1; C.salahGames = 0; }
  // shot timing log (Tariq's stat sheet)
  const tm = { t: s.tmd || 0, g: s.grn || 0, e: s.early || 0, l: s.late || 0 };
  C.timing.push(tm); if (C.timing.length > 10) C.timing.shift();
  C.ct.tmd += tm.t; C.ct.grn += tm.g; C.ct.early += tm.e; C.ct.late += tm.l;
  return Object.assign({}, g, { pts: perf.pts, ast: perf.ast, road: !!M.cRoad, buzzer: !!M.cBuzzer, tm, clean: !g.me.shoves });
}

// ------------------------------------------------------------- milestone beats
// Short text moments (1-3 lines) the first time something happens in a career.
// They play before the usual post-game lines; Esc skips the whole story.
const BEATS = [
  { id: 'first_win', label: 'First career win', when: c => c.won && C.wins === 1,
    lines: [['khalil', 'Our first win! I’m framing the score sheet.'], ['tariq', 'I already made a copy. And a backup of the copy.'], ['saleem', 'Alhamdulillah. One game at a time.']] },
  { id: 'first_loss', label: 'First loss, and back to work', when: c => !c.won && C.losses === 1,
    lines: [['siddiq', 'First loss. Come, the chai is still hot. Losses go down easier with cardamom.'], ['saleem', 'Every team that ever won anything lost first. Back to the gym tomorrow.']] },
  { id: 'first_road_win', label: 'First road win', when: c => c.won && c.road,
    lines: [['tariq', 'First road win. Their gym, their crowd, our W. I’m adding a new column to the sheet.'], ['rafiq', 'And we thanked our hosts before we left. That matters too.']] },
  { id: 'first_buzzer', label: 'First buzzer beater', when: c => c.buzzer,
    lines: [['khalil', 'AT THE HORN! Tariq, did you get that?'], ['tariq', 'I wrote “BUZZER” in capital letters. I never use capital letters.'], ['saleem', 'Masha’Allah. Now let’s go shake hands. Win with manners.']] },
  { id: 'first_rival_win', label: 'First win over Al-Burhan', when: c => c.won && c.oppId === 1,
    lines: [['jalal', 'Good game. You earned that one. Next time will be different, in sha Allah.'], ['saleem', 'Salaam, Jalal. Maghrib together?'], ['jalal', 'Of course. We are rivals on the court only.']] },
  { id: 'first_final', label: 'First final', when: c => c.res === 'next' && C.bracket.round === 2,
    lines: [['siddiq', 'A final! I’m bringing the big thermos.'], ['nasser', 'We’ve never played in a final.'], ['saleem', 'Then we play it like any other game: focus and good intention.']] },
  { id: 'first_20', label: 'First 20-point game', when: c => c.pts >= 20,
    lines: [['tariq', 'Twenty points. That’s a career high. I checked twice.'], ['mahmoud', 'Twenty! In 1987 I also... okay, okay. This one is yours, beta.']] },
  { id: 'first_dimes', label: 'Five assists in a game', when: c => c.ast >= 5,
    lines: [['khalil', 'Five assists! You gave away more buckets than the bake sale gave away brownies.'], ['saleem', 'Barakah is in sharing. That’s how we play.']] },
  { id: 'streak_5', label: 'Five straight wins', when: () => C.streak === 5,
    lines: [['siddiq', 'Five in a row. I ran out of room on the chalkboard and had to write smaller.'], ['saleem', 'Stay humble. Thank Allah. Keep the intention clean.']] },
  { id: 'perfect_stage', label: 'Undefeated tournament', when: c => c.res === 'champ' && slog(c.st).l === 0, perStage: true,
    lines: [['tariq', 'Undefeated tournament. Three games, three wins, zero losses. A perfect sheet.']] }
];
function careerBeats(c) {
  const out = [], L = slog(c.st);
  for (const b of BEATS) {
    const id = b.perStage ? b.id + '_' + c.st : b.id;
    if (C.beats[id] || !b.when(c)) continue;
    C.beats[id] = C.gamesPlayed; L.moments.push(b.label);
    if (out.length < 2) out.push(...b.lines);            // at most two beats of dialogue per game
  }
  return out;
}

// ------------------------------------------------------------- recurring roles
// Tariq keeps the stat sheet: after every game he reads out your shot timing.
function tariqLine(c) {
  const t = c.tm, pc = (g, n) => Math.round(100 * g / Math.max(1, n));
  if (!t.t) return 'Tariq: No timed jumpers tonight, all rim attacks. Noted on the sheet.';
  const hist = C.timing.slice(0, -1), ht = hist.reduce((a, x) => a + x.t, 0), hg = hist.reduce((a, x) => a + x.g, 0);
  let trend = '';
  if (ht >= 6) { const now = pc(t.g, t.t), before = pc(hg, ht); if (now >= before + 10) trend = ' Up from ' + before + '% avg.'; else if (now <= before - 10) trend = ' Off night (avg ' + before + '%).'; }
  const head = 'Tariq: ' + t.g + '/' + t.t + ' green releases (' + pc(t.g, t.t) + '%).';
  if (t.g / t.t >= 0.5) return head + ' Elite timing, masha’Allah.' + trend;
  if (t.e >= 2 && t.e > t.l * 1.5) return head + ' Releasing early, wait for the top.' + trend;
  if (t.l >= 2 && t.l > t.e * 1.5) return head + ' Releasing late, let it go at the peak.' + trend;
  return head + ' Early and late misses even: just reps.' + trend;
}
// Uncle Siddiq keeps the streak on the chalkboard by the door and reacts to it.
function siddiqLine(prev) {
  const s = C.streak;
  if (s === 1 && prev <= -2) return 'Uncle Siddiq: The losing streak is over! I’m erasing the chalkboard with joy.';
  if (s === -1 && prev >= 3) return 'Uncle Siddiq: ' + prev + ' straight, then one loss. That’s still a beautiful chalkboard.';
  if (s === 2) return 'Uncle Siddiq: Two in a row. It’s on the chalkboard now. In chalk, so it stays humble.';
  if (s === 3) return 'Uncle Siddiq: Three straight! The chai is on me tonight.';
  if (s === 4) return 'Uncle Siddiq: Four. People ask if I have a lucky kufi. No luck, only qadr. But this kufi is very comfortable.';
  if (s >= 5) return 'Uncle Siddiq: ' + s + ' in a row, masha’Allah. The chalkboard needs a second column.';
  if (s === -2) return 'Uncle Siddiq: Two losses. Chalk is forgiving. It wipes clean.';
  if (s <= -3) return 'Uncle Siddiq: A hard stretch. Come have chai after Isha. We talk first, then we practice.';
  return null;
}
function siddiqChalk() {
  const s = C.streak || 0;
  if (s >= 2) return ['The chalkboard says: ' + s + ' STRAIGHT WINS. I underlined it twice.', s >= 4 ? 'Don’t tell Sh. Saleem I drew a little star next to it.' : 'Let’s see if I need the big chalk.'];
  if (s <= -2) return ['The chalkboard says: ' + -s + ' losses. I wrote it small.', 'Remember, a chalkboard is made to be erased. One win and it’s gone.'];
  if (!C.gamesPlayed) return ['It’s empty! Play a game and I’ll start writing.'];
  return ['Record: ' + C.wins + ' wins, ' + C.losses + ' losses. And ' + (C.rival.w + C.rival.l ? C.rival.w + '–' + C.rival.l + ' against Al-Burhan.' : 'we haven’t played Al-Burhan yet.'), 'Every line on that board, I made du’a for.'];
}

// ------------------------------------------------------------- scouting report
// Tariq's one-card preview before every game: record, notable player, one tip.
const SCOUT_TIPS = {
  sht: ['They shoot it well. Close out hard and make them put it on the floor.', 'Their shooters heat up fast. Nobody gets an open three.'],
  dnk: ['They live at the rim. Wall up, time your jumps, don’t swipe.', 'Keep them out of the paint and make them settle for jumpers.'],
  spd: ['They’re quick in transition. Sprint back after every shot.', 'Fast team. Take care of the ball, they turn steals into layups.'],
  def: ['Their defense is tough. Move the ball and make the extra pass.', 'They contest everything. Use a pump fake or the crossover to get space.'],
  stl: ['Active hands. Protect your dribble and skip the lazy passes.', 'They jump passing lanes. Pass away from the defender, and pass early.']
};
const ARCH_NOTE = {
  sharpshooter: 'A pure shooter. Run him off the line.', rimrunner: 'Attacks the rim every chance he gets. Keep a body on him.',
  lockdown: 'A lockdown defender. Don’t force it at him, move the ball.', playmaker: 'The playmaker. Pressure the ball and watch the passing lanes.',
  glue: 'Does a little of everything. Box him out, he lives on hustle plays.'
};
function buildScout() {
  const b = C.bracket, m = ourMatch(), oppId = m.a === 0 ? m.b : m.a, opp = teamOf(C.stage, oppId), R = seededRng(hash32(opp.name + '|' + C.seed + '|' + C.stage));
  const sw = 6 + Math.floor(R() * 7) + (oppId === 1 ? 2 : 0), sl = Math.floor(R() * 4);
  const path = [];
  for (let r = 0; r < b.round; r++) { const x = b.rounds[r].find(q => q.w === oppId); if (x) { const other = x.a === oppId ? x.b : x.a, us = x.a === oppId ? x.sa : x.sb, them = x.a === oppId ? x.sb : x.sa; path.push('Beat ' + teamOf(C.stage, other).name.replace('Masjid ', '') + ' ' + us + '–' + them + ' in the ' + ROUND_NAMES[r].toLowerCase()); } }
  const star = opp.players.slice().sort((a, c) => (c.stats.sht + c.stats.dnk + c.stats.spd + c.stats.def + c.stats.stl) - (a.stats.sht + a.stats.dnk + a.stats.spd + a.stats.def + a.stats.stl))[0];
  const arch = star.arch || archetypeOf(star.stats), label = ARCHETYPES[arch] ? ARCHETYPES[arch].label : 'ALL-AROUND';
  const tot = opp.players.reduce((a, p) => { for (const k of ['sht', 'dnk', 'spd', 'def', 'stl']) a[k] = (a[k] || 0) + p.stats[k]; return a; }, {});
  const top = ['sht', 'dnk', 'spd', 'def', 'stl'].sort((a, c) => tot[c] - tot[a])[0];
  let tip = SCOUT_TIPS[top][Math.floor(R() * 2)], note = (ARCH_NOTE[arch] || '') + (star.huffath ? ' He’s a hafiz, so expect a Noor boost at some point.' : '');
  let extra = '';
  if (oppId === 1) {
    tip = 'Jalal loves his first move. Stay between him and the rim and don’t bite.';
    extra = C.rival.w + C.rival.l ? 'Head to head: you are ' + C.rival.w + '–' + C.rival.l + ' against Al-Burhan.' : 'First meeting with Al-Burhan. They’ve been waiting for this.';
  } else {
    let rv = null; for (let r = b.round - 1; r >= 0 && !rv; r--) rv = b.rounds[r].find(q => q.a === 1 || q.b === 1);
    if (rv) extra = rv.w === 1 ? 'Around the bracket: Al-Burhan won ' + Math.max(rv.sa, rv.sb) + '–' + Math.min(rv.sa, rv.sb) + ' in the ' + ROUND_NAMES[b.rounds.indexOf(b.rounds.find(r => r.includes(rv)))].toLowerCase() + '. They’re on the other side.'
      : 'Around the bracket: Al-Burhan is out. Jalal will be watching from the stands.';
    else extra = 'Around the bracket: Al-Burhan is on the other side. We’d only meet them in the final.';
  }
  const venue = Game.cv ? Game.cv : null, road = venue && venue.v.host === 1 && venue.v.kind !== 'arena';
  return { oppId, opp, record: sw + '–' + sl, path, star, label, note, tip, extra, round: ROUND_NAMES[b.round], where: venue ? venue.name : '', home: venue && venue.v.host === 0, road };
}
function drawScout(g) {
  const sc = Game.scout || (Game.scout = buildScout()), o = sc.opp, S = STAGES[C.stage];
  if (Game.cv) {          // tonight's venue slowly panning behind the card
    const ox = Game.ox || 0, rw = W, k = (Math.sin(Game.t * 0.25) + 1) / 2;
    g.save(); g.translate(-ox, 0); W = rw + 2 * ox; composeVenue(g, Game.cv.L, lerp(-100, COURT.L + 100 - W, k), Game.t); W = rw; g.restore(); dim(g, 0.7);
  }
  panel(g, W / 2 - 440, 22, 880, 490, true);
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('SCOUTING REPORT  •  ' + S.title.toUpperCase() + '  •  ' + sc.round.toUpperCase(), W / 2 - 410, 58);
  drawCrest(g, W / 2 - 384, 96, 24, o);
  g.fillStyle = '#fff'; g.font = `24px ${FONT}`; g.fillText(o.name, W / 2 - 350, 94);
  g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText((o.place || '') + (o.rival ? '  •  RIVAL' : '') + (sc.where ? '  •  ' + (sc.home ? 'Home: ' : sc.road ? 'Road game: ' : 'At ') + sc.where : ''), W / 2 - 350, 116);
  // record + path
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('RECORD', W / 2 - 410, 158);
  g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.fillText(sc.record, W / 2 - 410, 190);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('this season', W / 2 - 410, 208);
  sc.path.forEach((t, i) => { g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('• ' + t, W / 2 - 300, 180 + i * 22); });
  if (!sc.path.length) { g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('• First game of the tournament for both teams', W / 2 - 300, 180); }
  // notable player
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('PLAYER TO WATCH', W / 2 - 410, 250);
  g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(sc.star.name + '  #' + sc.star.num, W / 2 - 410, 276);
  g.fillStyle = '#8fe3ff'; g.font = `12px ${FONT}`; g.fillText(sc.label, W / 2 - 410, 296);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapTextLeft(g, sc.note, W / 2 - 410, 318, 470, 20);
  drawPortrait(g, W / 2 + 250, 356, sc.star, o, 1.55, null);
  // tip from Tariq
  g.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(g, W / 2 - 420, 368, 840, 88, 10); g.fill();
  g.fillStyle = '#bfe3ff'; g.font = `13px ${FONT}`; g.fillText('TARIQ’S TIP', W / 2 - 404, 390);
  g.fillStyle = '#fff'; g.font = `15px ${BODY}`; wrapTextLeft(g, sc.tip, W / 2 - 404, 412, 800, 20);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(fitText(g, sc.extra, 800), W / 2 - 404, 442);
  g.textAlign = 'center'; g.fillStyle = GOLD; roundRect(g, W / 2 - 90, 464, 180, 34, 17); g.fill();
  g.fillStyle = NIGHT; g.font = `15px ${FONT}`; g.fillText('Got it', W / 2, 486);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Enter to continue, Esc to go back', W / 2, 530);
  addRect(0, 0, W, H, () => { Game.screen = 'pregame'; SFX.blip(); });
}

// ------------------------------------------------------------- season summary
function summaryStages() { const out = []; for (let s = 0; s <= 3; s++) if (C.stageLog[s]) out.push(s); return out.length ? out : [C.stage]; }
function openSummary(st, from) { const list = summaryStages(); Game.summary = { st: list.includes(st) ? st : list[list.length - 1], from }; Game.screen = 'csummary'; SFX.blip(); }
function summaryClose() { const f = Game.summary && Game.summary.from; Game.summary = null; careerHub(); if (f === 'menu') { const m = menuState('hub'); if (m) m.sub = -1; } }
function summaryStep(d) { const sm = Game.summary, l = summaryStages(), i = l.indexOf(sm.st); const j = clamp(i + d, 0, l.length - 1); if (j !== i) { sm.st = l[j]; SFX.blip(); } }
function summaryUpdate() {
  if (menuHit('left')) summaryStep(-1); else if (menuHit('right')) summaryStep(1);
  if (menuHit('ok') || menuHit('back')) summaryClose();
}
function drawSummary(g) {
  const sm = Game.summary, st = sm.st, S = STAGES[st], L = C.stageLog[st] || slog(st), list = summaryStages(), T = amanahTeam();
  panel(g, W / 2 - 440, 24, 880, 492, true);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('SEASON SUMMARY', W / 2, 52);
  g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(S.title, W / 2, 84);
  const status = L.champ ? 'Champions' : C.seasonOver && C.seasonOver.st === st ? 'Season ended in the ' + C.seasonOver.round.toLowerCase() : st === C.stage && !C.done ? (C.bracket.out ? 'Out of the group, can re-enter' : 'In progress') : 'Completed';
  g.fillStyle = L.champ ? '#9dffb0' : IVORY; g.font = `15px ${FONT}`; g.fillText(status, W / 2, 108);
  if (list.length > 1) {       // stage arrows
    const i = list.indexOf(st);
    [[-1, W / 2 - 400, '◂'], [1, W / 2 + 400, '▸']].forEach(([d, x, ch]) => { const on = d < 0 ? i > 0 : i < list.length - 1; g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.15)'; g.font = `26px ${FONT}`; g.fillText(ch, x, 84); if (on) addRect(x - 24, 56, 48, 44, () => summaryStep(d)); });
  }
  if (L.legacy) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('This stage was completed before season records were kept. Its trophy is on the shelf.', W / 2, 160); }
  const x0 = W / 2 - 410, x1 = W / 2 + 20;
  // left column: record, earnings, rival
  g.textAlign = 'left';
  const stat = (x, y, label, val, col) => { g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(label, x, y); g.fillStyle = col || '#fff'; g.font = `24px ${FONT}`; g.fillText(val, x, y + 28); };
  if (!L.legacy) {
    stat(x0, 146, 'RECORD', L.w + '–' + L.l, '#fff');
    stat(x0 + 130, 146, 'ENTRIES', String(L.entries || 1));
    stat(x0 + 240, 146, 'VS AL-BURHAN', L.rw + L.rl ? L.rw + '–' + L.rl : '–');
    stat(x0, 214, 'BARAKAH POINTS', '+' + L.bp, '#f2cf6b');
    stat(x0 + 200, 214, 'HALAL BUCKS', '+' + L.hb, '#9dffb0');
    g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('TOP PERFORMANCES', x0, 290);
    if (!L.top.length) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('No games played yet this stage.', x0, 316); }
    L.top.forEach((p, i) => {
      const y = 316 + i * 46, box = [p.pts + ' pts', p.ast && p.ast + ' ast', p.reb && p.reb + ' reb', p.stl && p.stl + ' stl', p.blk && p.blk + ' blk'].filter(Boolean).join(', ');
      g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(box, x0, y);
      g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText((p.won ? 'W ' : 'L ') + p.us + '–' + p.them + ' vs ' + p.opp + ', ' + p.round.toLowerCase(), x0, y + 18);
    });
  }
  // right column: achievements + moments
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('ACHIEVEMENTS EARNED', x1, 146);
  const ach = (L.ach || []).map(id => ACH_BY_ID[id]).filter(Boolean);
  if (!ach.length) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText(L.legacy ? '–' : 'None new this stage.', x1, 172); }
  ach.slice(0, 6).forEach((a, i) => { const y = 170 + i * 30; drawAchIcon(g, a.icon, x1 + 12, y - 5, 11, true); g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `14px ${BODY}`; g.fillText(fitText(g, a.name + ' – ' + a.desc, 370), x1 + 32, y); });
  if (ach.length > 6) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('+' + (ach.length - 6) + ' more', x1 + 32, 170 + 6 * 30); }
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('MOMENTS', x1, 370);
  const mo = (L.moments || []).slice(-4);
  if (!mo.length) { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('Still to come.', x1, 396); }
  mo.forEach((m, i) => { g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('• ' + m, x1, 396 + i * 22); });
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`;
  g.fillText(sm.from === 'post' && st < 3 && L.champ ? 'Enter to continue to the ' + STAGES[st + 1].name + ' stage' : 'Enter to close' + (list.length > 1 ? ', ← → other stages' : ''), W / 2, 500);
  addRect(W / 2 - 300, 470, 600, 46, summaryClose);
}

// ------------------------------------------------------------- office convo panel
function drawConvo(g, cv) {
  panel(g, 40, 400, W - 80, 128, true);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `15px ${FONT}`; g.fillText('Sh. Saleem', 62, 426);
  const choose = cv.mode === 'choose', tw = choose ? W - 560 : W - 140;
  g.fillStyle = '#fff'; g.font = `16px ${BODY}`; wrapTextLeft(g, cv.lines[cv.li], 62, 452, tw, 21);
  if (choose) {
    cv.choices.forEach(([label], k) => {
      const x = W - 480, y = 412 + k * 50, on = cv.sel === k;
      g.fillStyle = on ? 'rgba(232,195,90,0.92)' : 'rgba(255,255,255,0.1)'; roundRect(g, x, y, 420, 42, 12); g.fill();
      g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${on ? FONT : BODY}`; if (g.measureText(label).width <= 392) g.fillText(label, x + 14, y + 26); else wrapTextLeft(g, label, x + 14, y + 17, 392, 17);
      addRect(x, y, 420, 42, () => { cv.sel = k; convoChoose(k); });
    });
  } else {
    g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'right'; g.fillText('Enter or tap to continue   Esc: close', W - 60, 516);
    addRect(0, 60, W, H - 60, convoAdvance);
  }
}

// ------------------------------------------------------------- new cast in the musalla
TALK.tariq = {
  greet: () => C.gamesPlayed ? 'Oh! Hi. I was just updating the sheet. Want your numbers?' : 'Assalamu alaikum! Play a game and I’ll have numbers for you. I love numbers.',
  options: [
    ['How’s my shot timing?', () => {
      const c = C.ct; if (!c.tmd) return ['No timed jumpers on the sheet yet. Take some open shots in a game and I’ll track every release.'];
      const pc = Math.round(100 * c.grn / c.tmd), miss = c.early + c.late;
      const lean = miss < 4 ? 'Not enough misses to see a pattern yet.' : c.early > c.late * 1.4 ? 'When you miss the window, it’s usually early. Let the jump reach the top.' : c.late > c.early * 1.4 ? 'When you miss the window, it’s usually late. Let it go right at the peak.' : 'Your early and late misses are balanced. That’s consistency.';
      const last = C.timing.slice(-3), lt = last.reduce((a, x) => a + x.t, 0), lg = last.reduce((a, x) => a + x.g, 0);
      return ['Career: ' + c.grn + ' greens on ' + c.tmd + ' timed jumpers. That’s ' + pc + '%.', lean, lt ? 'Last three games: ' + Math.round(100 * lg / lt) + '%. ' + (lg / lt >= c.grn / c.tmd ? 'Trending up.' : 'A little below your average, you’ll bounce back.') : 'No timed jumpers in your last three games.'];
    }],
    ['Who should I watch out for next?', () => {
      const o = nextOpponent(); if (!o) return ['No game on the schedule right now. Enter the tournament from the hub and I’ll write you a report.'];
      const sc = buildScout(); return ['Next is ' + o.team.name + '. ' + sc.record + ' this season.', sc.star.name + ' is the one. ' + sc.note, sc.tip];
    }],
    ['Why do you track everything?', () => ['I can’t dunk. Yet. But I can count, and Sh. Saleem says every team needs someone who pays attention.', 'Also, Uncle Mahmoud says he scored forty in 1987. I’m making sure the next legend has proof.']]
  ]
};
TALK.siddiq = {
  greet: () => (C.streak || 0) >= 3 ? 'The champion walks in! Sit, sit, I have fresh chai.' : (C.streak || 0) <= -2 ? 'Come, beta. Chai first, worries after.' : 'Assalamu alaikum! Chai? There’s always chai.',
  options: [
    ['What’s on the chalkboard?', siddiqChalk],
    ['Why do you make chai every night?', () => ['After Isha, people want to stay a little. Chai gives them a reason.', 'The Prophet ﷺ told us to feed people and spread salam. I can’t cook, so: chai.']],
    ['Any advice for a hard game?', () => [pick(['Breathe out slowly before a free throw. Like cooling your chai.', 'Don’t argue with the referee. He also has an uncle somewhere telling him he was wrong.', 'Win or lose, shake every hand. People remember that longer than the score.']), 'And say bismillah. Always bismillah.']]
  ]
};
MUS_CAST.push('tariq', 'siddiq');
MUS_SPOTS.tariq = { u: 0.52, d: 0.42, pose: 'cross', face: -1 };      // sitting with his clipboard, mid-room
MUS_SPOTS.siddiq = { u: 0.22, d: 0.3, pose: 'stand', face: 1 };      // standing near the back, by the chalkboard
HORSE_OPPS.push(['tariq', 'Tariq'], ['siddiq', 'Uncle Siddiq']);
MINI_ERR.tariq = 0.06; MINI_ERR.siddiq = 0.04;
MINI_TALK.tariq = { ko: ['According to my notes, that went in.', 'Statistically, that was bound to happen.'], out: ['Recording that as a learning experience.', 'Good shot. I’m writing it down.'] };
MINI_TALK.siddiq = { ko: ['Old man, young legs!', 'That one is going on the chalkboard.'], out: ['Alhamdulillah, good shot. Chai later?', 'My legs are fine. My chai was cold.'] };
if (ACH_BY_ID.good_company) { ACH_BY_ID.good_company.goal = MUS_CAST.length; ACH_BY_ID.good_company.desc = 'Talk with everyone in the musalla'; }

// small props so the new faces read at a glance: Tariq's clipboard, Siddiq's thermos
{
  const _dms = drawMusallaScreen;
  drawMusallaScreen = function (g) {
    _dms(g);
    const m = Game.mus; if (!m || m.fadeIn > 0.4) return;
    const t = musToScreen(MUS_SPOTS.tariq.u, MUS_SPOTS.tariq.d), sd = musToScreen(MUS_SPOTS.siddiq.u, MUS_SPOTS.siddiq.d);
    g.save(); g.translate(t.x + 22 * t.s, t.y - 8 * t.s); g.scale(t.s, t.s);
    g.fillStyle = '#8b6a45'; g.fillRect(-7, -10, 14, 18); g.fillStyle = '#fbfbf8'; g.fillRect(-5.5, -7, 11, 13); g.fillStyle = '#9aa7b3'; g.fillRect(-3, -12, 6, 3);
    g.fillStyle = 'rgba(40,60,90,0.6)'; for (let i = 0; i < 4; i++) g.fillRect(-4, -4 + i * 3, 8 - (i % 2) * 3, 1);
    g.restore();
    g.save(); g.translate(sd.x - 24 * sd.s, sd.y - 2); g.scale(sd.s, sd.s);
    g.fillStyle = '#b03a2e'; roundRect(g, -5, -22, 10, 22, 3); g.fill(); g.fillStyle = '#d9dde2'; g.fillRect(-4, -26, 8, 5);
    g.fillStyle = '#f2e6c8'; g.fillRect(3, -8, 7, 7); g.restore();
  };
}

// ------------------------------------------------------------- hooks
// achievements earned during a career game or on career screens go in that stage's log
{
  const _un = Ach.unlock.bind(Ach);
  Ach.unlock = function (id) {
    const r = _un(id);
    try {
      if (r && C && C.stageLog && ((M && M.career) || CAREER_SCREENS.has(Game.screen))) {
        const st = M && M.career && M.careerStage != null ? M.careerStage : C.stage, L = slog(st);
        if (!L.ach.includes(id)) L.ach.push(id);
      }
    } catch (e) {}
    return r;
  };
  const _mk = AchEvents.make;
  AchEvents.make = function (p, kind, buzzer) { if (buzzer && M.career && p && p.human === 0) M.cBuzzer = true; return _mk.apply(this, arguments); };
}
// pre-v5 saves: the new faces introduce themselves once, the next time you reach the hub
{
  const _ch = careerHub;
  careerHub = function () {
    _ch.apply(this, arguments);
    if (C && C.seen && C.seen.meetNew === false) {
      C.seen.meetNew = true; saveCareer();
      playStory([['saleem', 'Before you go: two more people you should know.'],
        ['tariq', 'Assalamu alaikum. I’m Tariq. I keep the stat sheet now. Shot timing, assists, everything. I’ll also scout every opponent for you.'],
        ['siddiq', 'And I’m Uncle Siddiq. I make the chai after Isha and keep our streak on the chalkboard by the door.'],
        ['siddiq', 'You’ll find us both in the musalla. Come say salam.']], _ch);
    }
  };
}

