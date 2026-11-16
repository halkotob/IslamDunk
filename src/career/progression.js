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
  return Object.assign({}, g, { pts: perf.pts, ast: perf.ast, road: !!M.cRoad, buzzer: !!M.cBuzzer, tm, clean: !(g.me.stats && g.me.stats.pf) });   // (v9.17.10: no foul committed; it was no shove)
}

// ------------------------------------------------------------- milestone beats
// Short text moments (1-3 lines) the first time something happens in a career.
// They play before the usual post-game lines; Esc skips the whole story.
const BEATS = [];   // v9.22: the old cast's milestone lines are gone; the story's milestones live in story-post.js
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
// v9.22: Tariq's stat sheet and Uncle Siddiq's chalkboard left with the old cast (the post-game screen shows no line)
function tariqLine() { return null; }
function siddiqLine() { return null; }

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
  let tip = SCOUT_TIPS[top][Math.floor(R() * 2)], note = (ARCH_NOTE[arch] || '') + (star.huffath ? ' He’s a hafiz, so expect a Hikmah challenge at some point.' : '');
  let extra = '';
  if (oppId === 1) {
    tip = 'Rayyan loves his first move. Stay between him and the rim and don’t bite.';
    extra = C.rival.w + C.rival.l ? 'Head to head: you are ' + C.rival.w + '–' + C.rival.l + ' against Al-Furqan.' : 'First meeting with Al-Furqan. They’ve been waiting for this.';
  } else {
    let rv = null; for (let r = b.round - 1; r >= 0 && !rv; r--) rv = b.rounds[r].find(q => q.a === 1 || q.b === 1);
    if (rv) extra = rv.w === 1 ? 'Around the bracket: Al-Furqan won ' + Math.max(rv.sa, rv.sb) + '–' + Math.min(rv.sa, rv.sb) + ' in the ' + ROUND_NAMES[b.rounds.indexOf(b.rounds.find(r => r.includes(rv)))].toLowerCase() + '. They’re on the other side.'
      : 'Around the bracket: Al-Furqan is out. Rayyan will be watching from the stands.';
    else extra = 'Around the bracket: Al-Furqan is on the other side. We’d only meet them in the final.';
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
  panel(g, W / 2 - 440, 22, 880, 490, true); const TT = Input.touchMode && g === ctx;   // v8.6.2: TT = phone spacing
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('SCOUTING REPORT  •  ' + S.title.toUpperCase() + '  •  ' + sc.round.toUpperCase(), W / 2 - 410, 58);
  drawCrest(g, W / 2 - 384, 96, 24, o);
  g.fillStyle = '#fff'; g.font = `24px ${FONT}`; g.fillText(o.name, W / 2 - 350, 94);
  g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText((o.place || '') + (o.rival ? '  •  RIVAL' : '') + (sc.where ? '  •  ' + (sc.home ? 'Home: ' : sc.road ? 'Road game: ' : 'At ') + sc.where : ''), W / 2 - 350, 116);
  // record + path
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('RECORD', W / 2 - 410, 158);
  g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.fillText(sc.record, W / 2 - 410, TT ? 186 : 190);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('this season', W / 2 - 410, TT ? 212 : 208);
  sc.path.forEach((t, i) => { g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('• ' + t, W / 2 - 300, 180 + i * 22); });
  if (!sc.path.length) { g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('• First game of the tournament for both teams', W / 2 - 300, 180); }
  // notable player
  g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText('PLAYER TO WATCH', W / 2 - 410, 250);
  g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(sc.star.name + '  #' + sc.star.num, W / 2 - 410, 276);
  g.fillStyle = '#8fe3ff'; g.font = `12px ${FONT}`; g.fillText(sc.label, W / 2 - 410, TT ? 299 : 296);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapTextLeft(g, sc.note, W / 2 - 410, TT ? 322 : 318, 470, TT ? 22 : 20);
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
      g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(fitText(g, (p.won ? 'W ' : 'L ') + p.us + '–' + p.them + ' vs ' + p.opp + ', ' + p.round.toLowerCase(), x1 - x0 - 16), x0, y + (Input.touchMode && g === ctx ? 22 : 18));   // v8.6.2: phone spacing
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
  g.fillText(Input.touchMode && g === ctx ? (sm.from === 'post' && st < 3 && L.champ ? 'Tap to continue to the ' + STAGES[st + 1].name + ' stage' : 'Tap to close')
    : sm.from === 'post' && st < 3 && L.champ ? 'Enter to continue to the ' + STAGES[st + 1].name + ' stage' : 'Enter to close' + (list.length > 1 ? ', ← → other stages' : ''), W / 2, 500);
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

// the mini games outside career still know Tariq and Uncle Siddiq
MINI_ERR.tariq = 0.06; MINI_ERR.siddiq = 0.04;
MINI_TALK.tariq = { ko: ['According to my notes, that went in.', 'Statistically, that was bound to happen.'], out: ['Recording that as a learning experience.', 'Good shot. I’m writing it down.'] };
MINI_TALK.siddiq = { ko: ['Old man, young legs!', 'That one is going on the chalkboard.'], out: ['Alhamdulillah, good shot. Chai later?', 'My legs are fine. My chai was cold.'] };
if (ACH_BY_ID.good_company) { ACH_BY_ID.good_company.goal = MUS_CAST.length; ACH_BY_ID.good_company.desc = 'Talk with everyone in the musalla'; }

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
