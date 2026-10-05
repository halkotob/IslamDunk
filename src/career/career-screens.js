// ======================================================== CAREER SCREENS
const CAREER_SCREENS = new Set(['office', 'musalla', 'shop', 'masjid', 'cmenu', 'creator', 'namekeys', 'story', 'hub', 'train', 'pregame', 'postgame', 'cbracket', 'saves', 'gym', 'scout', 'csummary']);

function careerHub() { Gym.drill = null; Gym.overlay = null; Gym.walk = null; Gym.fade = null; Gym.result = null; setupPractice('free'); Game.screen = 'hub'; Game.idx = 0; if (Game.hubMenu) Game.hubMenu.open = false; saveCareer(); }
function playStory(lines, then) { Game.story = { lines, i: 0, t: 0, then }; Game.screen = 'story'; }

// ------------------------------------------------------------ CAREER MENU
function cmenuItems() {
  const items = [];
  if (readSave(SAVE_AUTO)) items.push(['Continue career', 'continue']);
  items.push([Game.confirmNew ? 'Press again to start over' : 'New career', 'new']);
  if (readSave(SAVE_SLOT)) items.push(['Load manual save', 'load']);
  items.push(['Back', 'back']);
  return items;
}
function cmenuSelect(i) {
  const act = cmenuItems()[i][1];
  if (act === 'continue') { loadCareer(SAVE_AUTO); careerHub(); }
  else if (act === 'load') { loadCareer(SAVE_SLOT); saveCareer(); careerHub(); }
  else if (act === 'new') {
    if (readSave(SAVE_AUTO) && !Game.confirmNew) { Game.confirmNew = true; return; }
    Game.confirmNew = false; C = freshCareer(); Game.creator = { idx: 0, isNew: true }; setupPractice('free'); Game.screen = 'creator';
  } else goTitle();
}

// ------------------------------------------------------------- CREATOR
const CREATOR_ROWS = [
  { label: 'Name', key: 'name' }, { label: 'Skin tone', key: 'skin', sw: SKINS }, { label: 'Height', key: 'height', txt: LOOK_TXT.height },
  { label: 'Build', key: 'build', txt: LOOK_TXT.build }, { label: 'Hair and beard color', key: 'hair', sw: HAIRS }, { label: 'Beard style', key: 'beard', txt: LOOK_TXT.beard },
  { label: 'Beard length', key: 'beardLen', txt: LOOK_TXT.beardLen }, { label: 'Cap', key: 'cap', txt: LOOK_TXT.cap }, { label: 'Cap color', key: 'capColor', sw: CAPCOLS },
  { label: 'Thobe color', key: 'thobe', sw: THOBES }, { label: 'Thobe length', key: 'thobeLen', txt: LOOK_TXT.thobeLen }, { label: 'Sneakers', key: 'shoes', sw: SNEAKERS },
  { label: 'Jersey number', key: 'num', n: 100 }, { label: 'Done', key: 'done' }
];
function creatorStep(i, d) {
  const r = CREATOR_ROWS[i], lk = C.look;
  if (r.key === 'name' || r.key === 'done') return;
  const n = r.n || (r.sw || r.txt).length;
  lk[r.key] = (lk[r.key] + d + n) % n; SFX.blip();
}
function creatorEnter(i) {
  const r = CREATOR_ROWS[i];
  if (r.key === 'name') { Game.nameBuf = C.name; Game.screen = 'namekeys'; }
  else if (r.key === 'done') creatorDone();
  else creatorStep(i, 1);
}
function creatorDone() {
  if (!C.name.trim()) C.name = 'Brother';
  if (Game.creator.isNew) {
    C.bracket = makeBracket(0); saveCareer(); setupPractice('free');
    playStory(STORY.intro, () => { C.seen.intro = true; C.seen.meetNew = true; slog(0); careerHub(); });
  } else careerHub();
}
function creatorUpdate() {
  const cr = Game.creator, n = CREATOR_ROWS.length;
  if (Input.hit(['ArrowUp', 'KeyW'])) { cr.idx = (cr.idx + n - 1) % n; SFX.blip(); }
  if (Input.hit(['ArrowDown', 'KeyS'])) { cr.idx = (cr.idx + 1) % n; SFX.blip(); }
  if (menuHit('left')) creatorStep(cr.idx, -1);
  if (menuHit('right')) creatorStep(cr.idx, 1);
  if (menuHit('ok')) creatorEnter(cr.idx);
  if (menuHit('back') && !cr.isNew) careerHub();
}
const NAME_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function nameType(ch) { if (Game.nameBuf.length < 12) { Game.nameBuf += Game.nameBuf.length ? ch.toLowerCase() : ch; SFX.blip(); } }
function nameDone() { C.name = Game.nameBuf.trim(); Game.screen = 'creator'; }
function nameUpdate() {
  for (const ch of NAME_KEYS) if (Input.pressed['Key' + ch]) nameType(ch);
  if (Input.pressed.Space && Game.nameBuf.length && Game.nameBuf.length < 12) Game.nameBuf += ' ';
  if (Input.pressed.Backspace) Game.nameBuf = Game.nameBuf.slice(0, -1);
  if (Input.pressed.Enter || Input.pressed.NumpadEnter) nameDone();
  if (Input.pressed.Escape) Game.screen = 'creator';
}

// ----------------------------------------------------------------- HUB
function hubFirstLabel() {
  const b = C.bracket, S = STAGES[C.stage];
  if (C.seasonOver) return 'Start Season ' + ((C.season || 1) + 1);   // a knockout loss ended this season
  if (b.champ) return 'Play the World Ummah Cup again';
  if (b.out) return 'Enter the ' + S.name + ' tournament again';
  return 'Play next game';
}
// Hub: five items; My Player and My Masjid open in place and show balances.
const HUB_MENU = () => hubExtra([
  { label: hubFirstLabel(), act: () => hubSelect(0) },
  { label: 'Practice', act: () => enterGym() },
  { label: 'My Player', badge: C.bp + ' BP', sub: [
    { label: 'Upgrade stats', badge: C.bp + ' BP', act: () => { Game.screen = 'train'; Game.idx = 0; } },
    { label: 'Customize', act: () => { Game.creator = { idx: 0, isNew: false }; Game.screen = 'creator'; } },
    { label: 'Season summaries', act: () => openSummary(C.stage, 'menu') }] },
  { label: 'My Masjid', badge: C.hb + ' HB', sub: [
    { label: 'Visit the masjid', act: () => { Game.screen = 'masjid'; Game.masjidView = Game.masjidView || 'ext'; } },
    { label: 'Projects', badge: C.hb + ' HB', act: () => { Game.screen = 'shop'; Game.idx = 0; Game.shopTab = Game.shopTab || 'masjid'; } }] },
  { label: 'Bracket', act: () => { Game.screen = 'cbracket'; } }
]);
const HUB_CORNER = [['Save and load', () => { Game.hubMenu.open = false; Game.screen = 'saves'; Game.idx = 0; Game.saveMsg = ''; Game.confirmNew = false; }],
  ['Main menu', () => { saveCareer(); goTitle(); }], ['Close', () => { Game.hubMenu.open = false; }]];
function hubUpdate() {
  const hm = Game.hubMenu || (Game.hubMenu = { open: false, idx: 0 });
  if (hm.open) {
    if (menuHit('up')) { hm.idx = (hm.idx + 2) % 3; SFX.blip(); }
    if (menuHit('down')) { hm.idx = (hm.idx + 1) % 3; SFX.blip(); }
    if (menuHit('ok')) { SFX.blip(); HUB_CORNER[hm.idx][1](); }
    else if (menuHit('back')) hm.open = false;
    return;
  }
  menuStackUpdate('hub', HUB_MENU(), () => { hm.open = true; hm.idx = 0; SFX.blip(); });
}
function drawHubCorner(g) {
  const hm = Game.hubMenu || (Game.hubMenu = { open: false, idx: 0 }), x = W - 50, y = 8;
  const hov = hovering(x, y, 42, 34);
  g.fillStyle = hm.open || hov ? GOLD : 'rgba(8,14,22,0.85)'; roundRect(g, x, y, 42, 34, 10); g.fill();
  g.fillStyle = hm.open || hov ? NIGHT : '#fff'; for (let i = 0; i < 3; i++) roundRect(g, x + 11, y + 10 + i * 6, 20, 2.6, 1.3), g.fill();
  addRect(x - 4, y - 4, 50, 42, () => { hm.open = !hm.open; hm.idx = 0; });
  if (!hm.open) return;
  const px = W - 214, py = 48, a = tween('hubcorner', 1, 18);
  g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * -8);
  g.fillStyle = 'rgba(8,14,22,0.96)'; roundRect(g, px, py, 206, 132, 12); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.6)'; g.lineWidth = 1.5; g.stroke();
  HUB_CORNER.forEach(([label, fn], i) => {
    const iy = py + 8 + i * 40, on = hm.idx === i || hovering(px + 6, iy, 194, 36);
    if (hovering(px + 6, iy, 194, 36)) hm.idx = i;
    if (on) { g.fillStyle = pressing(px + 6, iy, 194, 36) ? '#c9a24a' : GOLD; roundRect(g, px + 6, iy, 194, 36, 10); g.fill(); }
    g.fillStyle = on ? NIGHT : '#fff'; g.font = `15px ${on ? FONT : BODY}`; g.textAlign = 'left'; g.fillText(label, px + 20, iy + 23);
    addRect(px + 6, iy, 194, 36, fn);
  });
  g.restore();
}
function hubSelect(i) {
  if (i === 0) {
    const b = C.bracket;
    if (C.seasonOver) { Game.screen = 'newseason'; Game.idx = 0; return; }
    if (b.out || b.champ) { C.retries = (C.retries || 0) + 1; C.bracket = makeBracket(C.stage); slog(C.stage).entries++; saveCareer(); }
    const go = () => { Game.tip = pick(STORY.tips); Game.tipBy = pick(['mahmoud', 'rafiq', 'siddiq']); prepCareerVenue(); Game.scout = buildScout(); Game.screen = 'scout'; };
    if (!C.seen['stage' + C.stage]) { C.seen['stage' + C.stage] = true; saveCareer(); playStory(STORY.stageIntro[C.stage], go); } else go();
  } else if (i === 1) enterGym();
  else if (i === 2) { Game.screen = 'train'; Game.idx = 0; }
  else if (i === 3) { Game.screen = 'shop'; Game.idx = 0; Game.shopTab = Game.shopTab || 'masjid'; }
  else if (i === 4) { Game.screen = 'masjid'; Game.masjidView = Game.masjidView || 'ext'; }
  else if (i === 5) Game.screen = 'cbracket';
  else if (i === 6) { Game.creator = { idx: 0, isNew: false }; Game.screen = 'creator'; }
  else if (i === 7) { Game.screen = 'saves'; Game.idx = 0; Game.saveMsg = ''; Game.confirmNew = false; }
  else { saveCareer(); goTitle(); }
}
function buyStat(i) {
  const k = STAT_ROWS[i][0], l = C.lv[k] || 4;
  if (l >= 10) return;
  const cost = statCost(l);
  if (C.bp < cost) { SFX.bad(); return; }
  C.bp -= cost; C.lv[k]++; SFX.good(); saveCareer();
}
const SAVE_ITEMS = () => ['Save to manual slot', 'Load manual slot', Game.confirmNew ? 'Press again to start over' : 'Start a new career', 'Back'];
function savesSelect(i) {
  if (i === 0) Game.saveMsg = saveCareer(SAVE_SLOT) ? 'Saved to the manual slot.' : 'Could not save on this device.';
  else if (i === 1) { if (loadCareer(SAVE_SLOT)) { saveCareer(); Game.saveMsg = 'Manual save loaded.'; setupPractice('free'); } else Game.saveMsg = 'No manual save found.'; }
  else if (i === 2) { if (!Game.confirmNew) { Game.confirmNew = true; return; } Game.confirmNew = false; C = freshCareer(); Game.creator = { idx: 0, isNew: true }; setupPractice('free'); Game.screen = 'creator'; }
  else careerHub();
}

// ------------------------------------------------------------- MATCHES
function startCareerMatch() {
  const m = ourMatch(), oppId = m.a === 0 ? m.b : m.a;
  const lv = careerLevels(C.stage);
  Game.lastMatch = null;
  if (!Game.cv) prepCareerVenue();
  const venue = Game.cv.v;
  newMatch(amanahTeam(), teamOf(C.stage, oppId), { humans: [{ team: 0, slot: 1, pad: 0 }], career: true, aiCfg: [diffAt(lv.mate), diffAt(lv.opp)], venue, venueLayers: Game.cv.L });
  Game.cv = null; startVenueIntro(venue);
  M.careerL = lv.opp;
  M.careerOpp = oppId; M.careerStage = C.stage; M.careerRound = C.bracket.round;
  M.cRoad = venue.host === 1 && venue.kind !== 'arena';   // at the other masjid's own gym or court
  M.players.find(p => p.human === 0).prayBonus = C.prayBonus;
  Game.screen = 'play'; Game.paused = false;
}
function careerAfterMatch() {
  const won = M.winner === 0, st = M.careerStage, oppId = M.careerOpp, opp = teamOf(st, oppId), round = C.bracket.round, roundName = roundLabel(C.bracket);
  const me = M.players.find(p => p.human === 0), salah = !!C.prayBonus, prevStreak = C.streak || 0;
  const res = recordCareerResult(won, M.teams[0].score, M.teams[1].score);
  const rw = careerRewards(won, res === 'champ', { round, rival: oppId === 1, salah, stage: st, roundName });
  if (C.prayBonus) { Ach.unlock('salah_1'); Ach.add('salah_10'); }
  C.bp += rw.bpTotal; C.hb += rw.hbTotal; C.prayBonus = false; if (won) C.wins++; else C.losses++;
  C.gamesPlayed = (C.gamesPlayed || 0) + 1; C.lastResult = res === 'champ' ? 'champ' : won ? 'win' : 'loss';
  C.streak = won ? Math.max(0, C.streak || 0) + 1 : Math.min(0, C.streak || 0) - 1;
  const ctx = trackCareerGame({ won, st, oppId, opp, round, roundName, res, rw, me, salah, us: M.teams[0].score, them: M.teams[1].score });
  let lines, unlocked = '';
  if (res === 'champ') {
    if (!C.trophies.includes(st)) C.trophies.push(st);
    slog(st).champ = true; if (!slog(st).moments.includes('Champions')) slog(st).moments.push('Champions');
    unlockFun('uncle'); if (st >= 2) unlockFun('lowGrav');
    lines = STORY.stageWin[st];
    if (st < 3) { C.stage = st + 1; C.bracket = makeBracket(C.stage); slog(C.stage); unlocked = STAGES[C.stage].title + ' unlocked'; Ach.unlock(['', 'stage_state', 'stage_nat', 'stage_world'][C.stage]); }
    else { C.done = true; C.bracket.champ = true; Ach.unlock('world_cup'); }
  } else if (res === 'out') lines = M.careerOpp === 1 ? STORY.lossRival : pick(STORY.loss);
  else lines = pick(STORY.win);
  lines = careerBeats(ctx).concat(lines);                 // milestone moments first (short, skippable with Esc)
  saveCareer();
  Game.post = { won, us: M.teams[0].score, them: M.teams[1].score, opp, rw, res, lines, unlocked, stage: STAGES[st], roundName,
    tariq: tariqLine(ctx), siddiq: siddiqLine(prevStreak), summary: res === 'champ' ? st : null };
  if (Game.menus) Game.menus.hub = null;
  setupPractice('free'); Game.screen = 'postgame';
}
function postgameContinue() {
  const p = Game.post;
  playStory(p.lines, p.summary != null ? () => openSummary(p.summary, 'post') : careerHub);
}

// --------------------------------------------------------------- UPDATE
function careerUpdate(rdt) {
  switch (Game.screen) {
    case 'cmenu': menuNav(cmenuItems().length, cmenuSelect); if (menuHit('back')) goTitle(); attractTick(rdt); break;
    case 'creator': creatorUpdate(); break;
    case 'namekeys': nameUpdate(); break;
    case 'story': {
      const s = Game.story; s.t += rdt;
      if (menuHit('ok') || Input.pressed.KeyJ) {
        const full = s.lines[s.i][1].length;
        if (s.t * 55 < full) s.t = full / 55;          // first press finishes the line
        else { s.i++; s.t = 0; if (s.i >= s.lines.length) s.then(); }
      } else if (menuHit('back')) s.then();
      break;
    }
    case 'hub': hubUpdate(); break;
    case 'train':
      menuNav(STAT_ROWS.length + 1, i => i === STAT_ROWS.length ? careerHub() : buyStat(i));
      if (menuHit('back')) careerHub(); break;
    case 'pregame': if (menuHit('ok')) startCareerMatch(); else if (menuHit('back')) careerHub(); break;
    case 'postgame': if (menuHit('ok')) postgameContinue(); break;
    case 'scout': if (menuHit('ok')) { Game.screen = 'pregame'; SFX.blip(); } else if (menuHit('back')) careerHub(); break;
    case 'csummary': summaryUpdate(); break;
    case 'cbracket': if (menuHit('ok') || menuHit('back')) careerHub(); break;
    case 'saves': menuNav(4, savesSelect); if (menuHit('back')) careerHub(); break;
    case 'gym': gymUpdate(rdt); break;
    case 'shop': shopUpdate(); break;
    case 'musalla': musallaUpdate(rdt); break;
    case 'office': officeUpdate(rdt); break;
    case 'masjid': masjidUpdate(); break;
  }
}

// --------------------------------------------------------------- RENDER
function panel(g, x, y, w, h, strong) {
  g.fillStyle = strong ? 'rgba(12,40,44,0.94)' : 'rgba(8,16,24,0.8)'; roundRect(g, x, y, w, h, 12); g.fill();
  g.strokeStyle = strong ? GOLD : 'rgba(255,255,255,0.12)'; g.lineWidth = strong ? 2 : 1; g.stroke();
}
function pips(g, x, y, v, max = 10) { for (let i = 0; i < max; i++) { g.fillStyle = i < v ? GOLD : 'rgba(255,255,255,0.12)'; g.fillRect(x + i * 9, y, 7, 8); } }
function careerRender(g) {
  const s = Game.screen;
  if (s === 'gym') { drawGymHUD(g); return; }
  if (s === 'masjid') { drawMasjidView(g); return; }
  if (s === 'musalla') { drawMusallaScreen(g); return; }
  if (s === 'office') { drawOffice(g); return; }
  if (s === 'cmenu') {
    dim(g, 0.7); g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText('Career mode', W / 2, 110);
    g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText('Join Masjid Al-Amanah and take a small masjid from the Local league to the World Ummah Cup.', W / 2, 140);
    drawMenu(g, cmenuItems().map(x => x[0]), Game.idx, 220, cmenuSelect); return;
  }
  dim(g, s === 'story' ? 0.35 : 0.6);
  if (s === 'creator') drawCreator(g);
  else if (s === 'namekeys') drawNameKeys(g);
  else if (s === 'story') drawStory(g);
  else if (s === 'hub') drawHub(g);
  else if (s === 'train') drawTrain(g);
  else if (s === 'pregame') drawPregame(g);
  else if (s === 'postgame') drawPostgame(g);
  else if (s === 'cbracket') drawCareerBracket(g);
  else if (s === 'saves') drawSaves(g);
  else if (s === 'shop') drawShop(g);
  else if (s === 'scout') drawScout(g);
  else if (s === 'csummary') drawSummary(g);
}
function drawCreator(g) {
  const cr = Game.creator, lk = C.look;
  panel(g, 30, 46, 470, 488, true);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText(cr.isNew ? 'Create your player' : 'Customize your player', 104, 32);
  CREATOR_ROWS.forEach((r, i) => {
    const y = 56 + i * 29.5, sel = i === cr.idx;
    if (sel) { g.fillStyle = 'rgba(232,195,90,0.18)'; roundRect(g, 40, y, 450, 30, 8); g.fill(); }
    g.fillStyle = sel ? '#fff' : IVORY; g.font = `14px ${r.key === 'done' ? FONT : BODY}`; g.textAlign = 'left';
    g.fillText(r.key === 'done' ? (cr.isNew ? 'Start career' : 'Done') : r.label, 54, y + 19);
    addRect(40, y, 250, 28, () => { cr.idx = i; creatorEnter(i); });
    if (r.key === 'done') return;
    const vx = 330;
    if (r.key === 'name') { g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(C.name || 'Tap to type', vx + 60, y + 19); return; }
    g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText('\u25C2', vx, y + 20); g.fillText('\u25B8', vx + 120, y + 20);
    addRect(vx - 20, y, 40, 28, () => { cr.idx = i; creatorStep(i, -1); }); addRect(vx + 100, y, 40, 28, () => { cr.idx = i; creatorStep(i, 1); });
    if (r.sw) { g.fillStyle = r.sw[lk[r.key]]; roundRect(g, vx + 30, y + 5, 60, 18, 9); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.stroke(); }
    else { g.fillStyle = '#fff'; g.font = `13px ${BODY}`; g.fillText(r.txt ? r.txt[lk[r.key]] : String(lk[r.key]), vx + 60, y + 19); }
  });
  const T = amanahTeam(), d = playerDef();
  panel(g, 530, 60, 400, 400, false);
  if (CREATOR_ROWS[cr.idx] && CREATOR_ROWS[cr.idx].key === 'style') drawSigDemo(g, 640, 380, 2.2); else drawPortrait(g, 640, 380, d, T, 2.2, 'thobe');   // play style: show the move
  drawPortrait(g, 830, 380, d, T, 2.2, null);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('At the masjid', 640, 420); g.fillText('Game day', 830, 420);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('\u2191 \u2193 choose, \u2190 \u2192 change, Enter to select', 730, 490);
}
function drawNameKeys(g) {
  panel(g, W / 2 - 360, 40, 720, 440, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Your name', W / 2, 84);
  g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, W / 2 - 180, 102, 360, 50, 10); g.fill();
  g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.fillText(Game.nameBuf + (Game.t % 1 < 0.5 ? '|' : ''), W / 2, 137);
  NAME_KEYS.forEach((ch, i) => {
    const x = W / 2 - 330 + (i % 13) * 51, y = 176 + Math.floor(i / 13) * 56;
    g.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(g, x, y, 45, 46, 8); g.fill();
    g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(ch, x + 22, y + 30); addRect(x, y, 45, 46, () => nameType(ch));
  });
  const btn = (x, label, fn, on) => { g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, x, 310, 150, 42, 21); g.fill(); g.fillStyle = on ? NIGHT : '#fff'; g.font = `16px ${FONT}`; g.fillText(label, x + 75, 337); addRect(x, 310, 150, 42, fn); };
  btn(W / 2 - 240, 'Space', () => { if (Game.nameBuf && Game.nameBuf.length < 12) Game.nameBuf += ' '; }, false);
  btn(W / 2 - 75, 'Delete', () => { Game.nameBuf = Game.nameBuf.slice(0, -1); }, false);
  btn(W / 2 + 90, 'Done', nameDone, true);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Type your name, Enter when done', W / 2, 400);
}
function drawStory(g) {
  const s = Game.story, line = s.lines[Math.min(s.i, s.lines.length - 1)], speaker = line[0];
  const ids = ['you']; for (const [sp] of s.lines) if (!ids.includes(sp) && ids.length < 4) ids.push(sp);
  const T = amanahTeam(), R = rivalTeam(0);
  ids.forEach((id, i) => {
    const x = ids.length === 1 ? W / 2 : 170 + i * 620 / (ids.length - 1);
    g.globalAlpha = id === speaker ? 1 : 0.5;
    drawPortrait(g, x, 380, castDef(id), id === 'jalal' ? R : T, id === speaker ? 2.25 : 2.05, 'thobe');
    g.globalAlpha = 1;
  });
  panel(g, 40, 392, 880, 132, true);
  const who = speaker === 'you' ? (C.name || 'You') : castDef(speaker).name;
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.fillText(who, 62, 420);
  g.fillStyle = '#fff'; g.font = `17px ${BODY}`;
  const txt = line[1].slice(0, Math.floor(s.t * 55));
  wrapTextLeft(g, txt, 62, 450, 830, 24);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'right'; g.fillText('Enter or tap to continue, Esc to skip', 900, 512);
  addRect(0, 0, W, H, () => { const full = line[1].length; if (s.t * 55 < full) s.t = full / 55; else { s.i++; s.t = 0; if (s.i >= s.lines.length) s.then(); } });
}
function wrapTextLeft(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
  g.fillText(line, x, yy);
}
function drawHub(g) {
  const S = STAGES[C.stage], b = C.bracket, T = amanahTeam();
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Masjid Al-Amanah', 104, 36);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(S.title + ', Small division', 104, 58);
  // player card
  panel(g, 30, 84, 290, 440, false);
  drawPortrait(g, 110, 262, playerDef(), T, 1.7, 'thobe');
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(C.name || 'You', 170, 130);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('#' + C.look.num + '  Guard', 170, 150);
  g.fillText('Record ' + C.wins + '\u2013' + C.losses, 170, 170);
  STAT_ROWS.forEach(([k, label], i) => { const y = 292 + i * 22; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(label, 46, y + 8); pips(g, 140, y, C.lv[k]); });
  if (C.prayBonus) { g.fillStyle = 'rgba(30,90,74,0.9)'; roundRect(g, 46, 432, 256, 26, 13); g.fill(); g.fillStyle = '#f2cf6b'; g.font = `12px ${FONT}`; g.fillText('Salah bonus ready for next game', 60, 450); }
  // next game
  panel(g, 336, 84, 290, 120, true);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`;
  if (b.champ) { g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.fillText('World champions', 481, 130); g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Keep practicing, or play the Cup again.', 481, 156); }
  else if (b.out) { g.fillText('ELIMINATED', 481, 112); g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Sabr. Train up and enter again.', 481, 140); }
  else {
    const m = ourMatch(), opp = teamOf(C.stage, m.a === 0 ? m.b : m.a);
    g.fillText('NEXT: ' + roundLabel(b).toUpperCase(), 481, 108);
    drawCrest(g, 380, 150, 18, opp);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(opp.name, 408, 148);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(opp.place + (opp.rival ? '  (rival)' : ''), 408, 166);
  }
  drawMenuStack(g, 'hub', HUB_MENU(), 262, 42);
  // currencies and trophies
  panel(g, 642, 84, 290, 440, false);
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('BARAKAH POINTS', 662, 116);
  g.fillStyle = '#f2cf6b'; g.font = `28px ${FONT}`; g.fillText(String(C.bp), 662, 148);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Spend on training. Earned in practice and games.', 662, 166);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('HALAL BUCKS', 662, 204);
  g.fillStyle = '#9dffb0'; g.font = `28px ${FONT}`; g.fillText(String(C.hb), 662, 236);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Spend on masjid and gym projects.', 662, 254);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('TROPHIES', 662, 296);
  STAGES.forEach((st, i) => {
    const x = 690 + i * 66, won = C.trophies.includes(i);
    g.fillStyle = won ? GOLD : 'rgba(255,255,255,0.12)'; star8(g, x, 330, 18); g.fill();
    g.textAlign = 'center'; g.fillStyle = won ? '#fff' : '#6d7a8c'; g.font = `12px ${BODY}`; g.fillText(st.name, x, 368);
  });
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
  g.fillText('Best free throws: ' + C.best.ft + '/10', 662, 410); g.fillText('Best three-point: ' + C.best.three + '/20', 662, 430);
  g.fillText('Best cone run: ' + (C.best.cones ? C.best.cones + 's' : '\u2013'), 662, 450); g.fillText('1v1 wins vs Nasser: ' + C.best.v1, 662, 470);
  drawHubCorner(g);
}
function drawTrain(g) {
  panel(g, W / 2 - 300, 50, 600, 440, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('Train', W / 2, 92);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('You have ' + C.bp + ' Barakah Points. Each level costs more than the last.', W / 2, 118);
  STAT_ROWS.forEach(([k, label], i) => {
    const y = 132 + i * 38, sel = Game.idx === i, l = C.lv[k] || 4, cost = statCost(l), can = l < 10 && C.bp >= cost;
    if (sel) { g.fillStyle = 'rgba(232,195,90,0.16)'; roundRect(g, W / 2 - 280, y, 560, 34, 10); g.fill(); }
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(label, W / 2 - 260, y + 23);
    if (k === 'hus' || k === 'clu') { g.fillStyle = '#57e389'; g.font = `9px ${FONT}`; g.fillText('NEW', W / 2 - 170, y + 22); }
    pips(g, W / 2 - 110, y + 13, l);
    g.textAlign = 'right'; g.fillStyle = l >= 10 ? '#9fb3c8' : can ? '#f2cf6b' : '#6d7a8c'; g.font = `14px ${FONT}`;
    g.fillText(l >= 10 ? 'Max' : 'Level up: ' + cost, W / 2 + 262, y + 23);
    addRect(W / 2 - 280, y, 560, 34, () => { Game.idx = i; buyStat(i); });
  });
  const by = 132 + STAT_ROWS.length * 38 + 2, sel = Game.idx === STAT_ROWS.length;
  g.fillStyle = sel ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, W / 2 - 80, by, 160, 36, 18); g.fill();
  g.textAlign = 'center'; g.fillStyle = sel ? NIGHT : '#fff'; g.font = `15px ${FONT}`; g.fillText('Back', W / 2, by + 24); addRect(W / 2 - 80, by, 160, 36, careerHub);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Stamina: slower turbo drain. Passing: faster, safer passes. Hustle: first to loose balls, draws charges. Clutch: steadier in the last minute of close games.', W / 2, 482);
}
function prepCareerVenue() {
  const m = ourMatch(), oppId = m.a === 0 ? m.b : m.a, opp = teamOf(C.stage, oppId), T = amanahTeam();
  const v = careerVenue(C.stage, venueRound(C.bracket), oppId, opp);
  Game.cv = { v, L: buildVenueLayers(v, T, opp), name: venueDisplayName(v, venueHost(v, T, opp)) };
}
function drawPregame(g) {
  const m = ourMatch(), S = STAGES[C.stage], opp = teamOf(C.stage, m.a === 0 ? m.b : m.a), T = amanahTeam();
  if (!Game.cv) prepCareerVenue();
  { // intro shot: a slow camera pan across tonight's venue behind the pre-game card
    const o = Game.ox || 0, rw = W, k = (Math.sin(Game.t * 0.25) + 1) / 2;
    g.save(); g.translate(-o, 0); W = rw + 2 * o; composeVenue(g, Game.cv.L, lerp(-100, COURT.L + 100 - W, k), Game.t); W = rw; g.restore();
    dim(g, 0.55);
  }
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(S.title, W / 2, 48);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText(roundLabel(C.bracket) + ', Small division  \u2022  ' + Game.cv.name, W / 2, 72);
  const side = (x, team, label) => {
    panel(g, x, 90, 380, 250, false);
    drawCrest(g, x + 36, 124, 20, team);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `17px ${FONT}`; g.fillText(team.name, x + 66, 122);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(label, x + 66, 140);
    team.players.forEach((d, i) => { drawPortrait(g, x + 110 + i * 160, 318, d, team, 1.45, null); g.textAlign = 'center'; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(d.name, x + 110 + i * 160, 334); });
  };
  side(40, T, 'Eastside');
  side(540, opp, (opp.place || '') + (opp.rival ? '  (rival)' : ''));
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `28px ${FONT}`; g.fillText('vs', W / 2, 220);
  panel(g, 40, 352, 880, 104, false);
  g.textAlign = 'left'; g.font = `14px ${FONT}`;
  if (C.prayBonus) { g.fillStyle = '#9dffb0'; g.fillText('Salah bonus: +10% shooting, +10% stamina this game', 62, 380); }
  else { g.fillStyle = '#9fb3c8'; g.fillText('No salah bonus. Answer the adhan during practice to earn one.', 62, 380); }
  const lv = careerLevels(C.stage), shift = diffShift();
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
  g.fillText('CPU difficulty: ' + diffLabel(lv.opp) + (shift ? ' (' + S.name + ' stage, one step ' + (shift < 0 ? 'easier' : 'harder') + ' because Difficulty is set to ' + (shift < 0 ? 'Easy' : 'Hard') + ')' : ' (' + S.name + ' stage)'), 62, 404);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(castDef(Game.tipBy || 'rafiq').name + ': \u201C' + (Game.tip || STORY.tips[0]) + '\u201D', 62, 434);
  g.fillStyle = GOLD; roundRect(g, W / 2 - 90, 470, 180, 40, 20); g.fill();
  g.textAlign = 'center'; g.fillStyle = NIGHT; g.font = `17px ${FONT}`; g.fillText('Tip off', W / 2, 496);
  addRect(W / 2 - 90, 470, 180, 40, startCareerMatch);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Esc to go back', W / 2, 526);
}
function drawPostgame(g) {
  const p = Game.post;
  panel(g, W / 2 - 330, 40, 660, 460, true);
  g.textAlign = 'center'; g.fillStyle = p.won ? GOLD : '#ffb0b0'; g.font = `34px ${FONT}`;
  g.fillText(p.res === 'champ' ? p.stage.name.toUpperCase() + ' CHAMPIONS' : p.won ? 'WIN' : 'LOSS', W / 2, 88);
  g.fillStyle = '#fff'; g.font = `17px ${BODY}`; g.fillText('Al-Amanah ' + p.us + ', ' + p.opp.name.replace('Masjid ', '') + ' ' + p.them + '  (' + p.roundName + ')', W / 2, 118);
  if (p.res === 'out') { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.fillText('Eliminated. You can enter the ' + p.stage.name + ' tournament again from the hub.', W / 2, 142); }
  if (p.unlocked) { g.fillStyle = '#9dffb0'; g.font = `15px ${FONT}`; g.fillText(p.unlocked, W / 2, 142); }
  const col = (x, title, rows, total, color) => {
    g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(title, x, 180);
    const rh = Math.min(24, 176 / Math.max(1, rows.length));
    rows.forEach(([l, v], i) => { g.fillStyle = IVORY; g.font = `${rh < 22 ? 13 : 14}px ${BODY}`; g.textAlign = 'left'; g.fillText(fitText(g, l, 200), x, 206 + i * rh); g.textAlign = 'right'; g.fillStyle = v < 0 ? '#ff8a7a' : color; g.fillText((v < 0 ? '' : '+') + v, x + 250, 206 + i * rh); });
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.moveTo(x, 390); g.lineTo(x + 250, 390); g.stroke();
    g.textAlign = 'right'; g.fillStyle = color; g.font = `18px ${FONT}`; g.fillText('+' + total, x + 250, 418);
  };
  col(W / 2 - 300, 'BARAKAH POINTS', p.rw.bp, p.rw.bpTotal, '#f2cf6b');
  col(W / 2 + 50, 'HALAL BUCKS', p.rw.hb, p.rw.hbTotal, '#9dffb0');
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText('Press Enter or tap to continue', W / 2, 488);
  if (p.tariq || p.siddiq) {
    g.textAlign = 'left'; g.font = `13px ${BODY}`;
    if (p.tariq) { g.fillStyle = '#bfe3ff'; g.fillText(fitText(g, p.tariq, 600), W / 2 - 300, 444); }
    if (p.siddiq) { g.fillStyle = '#ffe3b0'; g.fillText(fitText(g, p.siddiq, 600), W / 2 - 300, p.tariq ? 462 : 444); }
  }
  addRect(0, 0, W, H, postgameContinue);
}
function drawCareerBracket(g) {
  const b = C.bracket, S = STAGES[C.stage];
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(S.title, W / 2, 44);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Small division. Medium and Large masjids play their own brackets.', W / 2, 66);
  const colX = [40, 340, 640];
  for (let r = 0; r < 3; r++) {
    g.textAlign = 'left'; g.fillStyle = r === 2 ? '#ffe38a' : '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText(ROUND_NAMES[r].toUpperCase(), colX[r], 96);
    const n = 4 >> r, round = b.rounds[r];
    for (let i = 0; i < n; i++) {
      const gap = 360 / n, y = 108 + i * gap + gap / 2 - 30, m = round && round[i];
      panel(g, colX[r], y, 280, 58, m && (m.a === 0 || m.b === 0));
      [[m && m.a, m && m.sa], [m && m.b, m && m.sb]].forEach(([id, sc], k) => {
        const yy = y + 23 + k * 23;
        g.textAlign = 'left';
        if (id == null) { g.fillStyle = '#56657a'; g.font = `13px ${BODY}`; g.fillText('TBD', colX[r] + 14, yy); return; }
        const t = teamOf(C.stage, id), lost = m.w != null && m.w !== id;
        drawCrest(g, colX[r] + 16, yy - 5, 8, t);
        g.fillStyle = lost ? '#6d7a8c' : id === 0 ? '#ffe38a' : '#fff'; g.font = `12px ${id === 0 ? FONT : BODY}`;
        g.fillText(t.name.replace('Masjid ', '') + ' \u2013 ' + (t.place || ''), colX[r] + 30, yy);
        g.textAlign = 'right'; if (sc != null) g.fillText(String(sc), colX[r] + 268, yy);
      });
    }
  }
  const prev = C.divChamps[C.stage] || C.divChamps[C.stage - 1];
  if (prev) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Division champions: Medium, ' + prev.Medium + '. Large, ' + prev.Large + '.', W / 2, 490); }
  g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText('Press Enter or tap to go back', W / 2, 516);
  addRect(0, 0, W, H, careerHub);
}
function drawSaves(g) {
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Save and load', W / 2, 110);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Your career also saves automatically after every game, drill, and purchase.', W / 2, 138);
  drawMenu(g, SAVE_ITEMS(), Game.idx, 210, savesSelect);
  if (Game.saveMsg) { g.fillStyle = '#9dffb0'; g.font = `14px ${BODY}`; g.fillText(Game.saveMsg, W / 2, 400); }
}

