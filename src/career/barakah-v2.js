
// ================================================= v8.3: BARAKAH RUN 2.0 (solo runs)
// A run is a path of 9 stops and a final. At each stop you choose where to go next:
//   Game         a regular game; win for an upgrade
//   Elite rival  a tougher team (stats +1, smarter); win for two upgrades
//   Training     no game: pick an upgrade
//   Masjid stop  rest and pray: a One More Chance shield (cancels the next CPU basket)
//   The final    the Champions: the strongest version of the next team, at their best
// Before the first stop you take a vow, a trade-off that lasts the whole run. One loss still ends
// the run. Beat the Champions and the run is complete. Duo runs keep the classic endless ladder.
const RUN_STOPS = 9;
const RUN_VOWS = [
  { id: 'none', name: 'No vow', desc: 'The run as it comes.' },
  { id: 'pace', name: 'Fast Break', desc: 'Both teams play a 10-second shot clock. Every win pays 20 extra XP.' },
  { id: 'focus', name: 'Quiet Focus, Loud Gym', desc: 'Your green window is 20% bigger, but the CPU defends a step tighter.' },
  { id: 'iron', name: 'Iron Lungs', desc: 'Your team’s stamina comes back much faster, but every opponent starts up 4.' }
];
const RUN_NODES = {
  game: { name: 'Game', desc: 'A regular game. Win for an upgrade.', col: '#2f7f86' },
  elite: { name: 'Elite rival', desc: 'A tougher, smarter team. Win for two upgrades.', col: '#8f1f2e' },
  train: { name: 'Training', desc: 'No game. Work on your game: pick an upgrade.', col: '#1e7a4c' },
  masjid: { name: 'Masjid stop', desc: 'Rest and pray. Gain One More Chance: the next CPU basket doesn’t count.', col: '#6b5a8e' },
  boss: { name: 'The Champions', desc: 'The final. The strongest team you’ll face, at their best.', col: '#c9a227' }
};
function runV2() { return !Run.duo; }
function runNodeChoices() {
  if (Run.step >= RUN_STOPS) return ['boss'];
  const games = ['game', 'elite'], rest = ['train', 'masjid'];
  if (Run.lastNode && rest.includes(Run.lastNode)) return ['game', 'elite'];         // no two rest stops in a row
  const a = chance(0.6) ? 'game' : pick(games), others = ['game', 'elite', 'train', 'masjid'].filter(x => x !== a);
  return [a, pick(Run.step < 2 ? others.filter(x => x !== 'elite') : others)];
}
function runToMap() {
  Run.choicesV2 = runNodeChoices(); Game.screen = 'runmap'; Game.idx = 0;
}
function runChooseNode(i) {
  const n = Run.choicesV2 && Run.choicesV2[i]; if (!n) return;
  Run.node = n; Run.lastNode = n; SFX.blip && SFX.blip();
  if (n === 'game' || n === 'elite' || n === 'boss') { Run.launch = true; try { nextBarakahGame(); } finally { Run.launch = false; } runApplyNode(); return; }
  if (n === 'masjid') { Run.upgrades.shield = 1; Run.shieldUsed = false; toast('One More Chance ready: the next CPU basket won’t count', 3); Run.step++; runToMap(); return; }
  // training: an upgrade with no game
  const ref = M.teams && M.teams[0] && M.teams[0].players.length ? M.teams[0].players : TEAMS[Run.team].players.map(p => ({ st: p.stats }));
  const eligible = RUN_POWERS.filter(p => (Run.upgrades[p.id] || 0) < p.max && (!p.stat || ((ref[p.mate ? 1 : 0] || ref[0]).st[p.stat] || 5) < 10));
  Run.choices = shuffle(eligible).slice(0, 3); Run.turn = 0;
  if (!Run.choices.length) { Run.step++; runToMap(); return; }
  Game.screen = 'runchoice'; Game.idx = 0;
}
// the next game, shaped by the stop and the vow
function runApplyNode() {
  const n = Run.node, base = Math.min(2.5, 0.65 + Run.wins * 0.17);
  if (n === 'elite' || n === 'boss') {
    const lv = n === 'boss' ? 2.5 : Math.min(2.5, base + 0.5), up = n === 'boss' ? 2 : 1;
    M.aiCfg[1] = diffAt(lv);
    for (const p of M.teams[1].players) for (const k of Object.keys(p.st)) if (typeof p.st[k] === 'number') p.st[k] = Math.min(10, p.st[k] + up);
    FX.callout(n === 'boss' ? 'THE CHAMPIONS' : 'ELITE RIVAL', n === 'boss' ? '#ffd76a' : '#ff9a8a', n === 'boss' ? 'THE FINAL OF YOUR RUN' : 'WIN FOR TWO UPGRADES', true);
  }
  const v = Run.vow;
  if (v === 'pace') { M.fmt.sc = 10; M.shotClock = 10; }   // v9.6.3: 14 s is everyone's clock now; Fast Break is 10
  if (v === 'focus') M.aiCfg[1] = Object.assign({}, M.aiCfg[1], { contest: Math.max(0, M.aiCfg[1].contest - 0.04), antic: Math.min(1, M.aiCfg[1].antic + 0.2) });
  if (v === 'iron') M.teams[1].score = 4;
}
{
  const _sb = startBarakah;
  startBarakah = function () {
    if (!runV2()) { Run.v2 = false; return _sb.apply(this, arguments); }
    Object.assign(Run, { v2: true, step: 0, vow: null, node: null, lastNode: null, extra: 0, champion: false });
    Run.launch = false;
    return _sb.apply(this, arguments);                                // calls nextBarakahGame, which we turn into the vow screen
  };
  const _ng = nextBarakahGame;
  nextBarakahGame = function () {
    if (!Run.v2 || Run.launch) return _ng.apply(this, arguments);
    if (!Run.vow) { Game.screen = 'runvow'; Game.idx = 0; return; }
    if (Run.extra > 0) {                                               // an elite win: the second upgrade
      Run.extra--;
      const eligible = RUN_POWERS.filter(p => (Run.upgrades[p.id] || 0) < p.max && (!p.stat || (M.teams[0].players[p.mate ? 1 : 0].st[p.stat] || 5) < 10));
      Run.choices = shuffle(eligible).slice(0, 3);
      if (Run.choices.length) { Game.screen = 'runchoice'; Game.idx = 0; return; }
    }
    Run.step++; runToMap();
  };
  const _bc = barakahContinue;
  barakahContinue = function () {
    const v2 = Run.v2, node = Run.node, won = M.winner === 0;
    if (v2 && won) { Run.extra = node === 'elite' ? 1 : 0; if (Run.vow === 'pace') Profile.add(20, 'Fast Break vow'); }
    if (v2 && won && node === 'boss') {
      recordBarakahGame(); collectRunClips();
      Run.active = false; Run.champion = true; Game.screen = 'runend'; Game.idx = 0;
      Progress.update(o => { o.runBadges = o.runBadges || {}; o.runBadges.champ = true; o.barakahChamps = (o.barakahChamps || 0) + 1; }); refreshReplayability();
      Profile.add(150, 'beat the Champions');
      return;
    }
    return _bc.apply(this, arguments);
  };
  // Iron Lungs: your team's stamina comes back faster
  const _um = updateMatch;
  updateMatch = function (dt) { const r = _um.apply(this, arguments); if (M.barakah && Run.v2 && Run.vow === 'iron' && M.teams) for (const p of M.teams[0].players) p.turbo = Math.min(100, p.turbo + 9 * dt); return r; };
  // Quiet Focus: a bigger green window for your team
  const _hd = humanDiffMult;
  humanDiffMult = function () { const k = _hd.apply(this, arguments); return M.barakah && Run.v2 && Run.vow === 'focus' ? k * 1.2 : k; };
  RUN_BADGES.push({ id: 'champ', name: 'Champion', color: '#ffd76a', desc: 'Beat the Champions at the end of a solo Barakah Run.' });
}
// ---- screens: the vow and the map
function textLines(g, text, maxW) {
  const out = []; let line = '';
  for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
// v9.12: headings wrap inside the card (no shrinking), and the cards grow to fit their heading and description, at every
// text size ("Quiet Focus, Loud Gym" ran out of its card)
function drawRunCards(g, items, y, onPick) {
  const n = items.length, w = Math.min(280, (W - 80) / n - 16), x0 = W / 2 - (n * (w + 16) - 16) / 2;
  const lay = items.map(it => {
    g.font = `18px ${FONT}`; const head = textLines(g, it.name, w - 28);
    g.font = `14px ${BODY}`; const desc = textLines(g, it.desc, w - 32);
    return { head, desc, hh: head.length * 22, dh: desc.length * 20 };
  });
  const H2 = Math.max(210, ...lay.map(L => 52 + L.hh + 14 + L.dh + 60));
  items.forEach((it, i) => {
    const x = x0 + i * (w + 16), sel = i === Game.idx, L = lay[i];
    panel(g, x, y, w, H2, sel);
    if (it.col) { g.fillStyle = it.col; roundRect(g, x + 14, y + 14, w - 28, 8, 4); g.fill(); }
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `18px ${FONT}`; L.head.forEach((t, k) => g.fillText(t, x + w / 2, y + 52 + k * 22));
    g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `14px ${BODY}`; L.desc.forEach((t, k) => g.fillText(t, x + 16, y + 52 + L.hh + 14 + k * 20));
    uiButton(g, x + w / 2 - 80, y + H2 - 50, 160, 34, 'Choose', () => { Game.idx = i; onPick(i); }, sel);
    addRect(x, y, w, H2 - 60, () => { Game.idx = i; });
  });
  return H2;
}
function drawRunStatus(g, y) {
  const ups = Object.entries(Run.upgrades).filter(([, r]) => r > 0).map(([id, r]) => { const p = RUN_POWERS.find(q => q.id === id); return p ? p.name + (r > 1 ? ' ' + r : '') : id; });
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
  g.fillText(Run.wins + ' wins  •  vow: ' + (RUN_VOWS.find(v => v.id === Run.vow) || RUN_VOWS[0]).name + (runShieldOn() ? '  •  One More Chance ready' : ''), W / 2, y);
  g.fillText(ups.length ? 'Upgrades: ' + ups.join(', ') : 'No upgrades yet', W / 2, y + 20);
}
function drawRunPath(g, y) {
  const n = RUN_STOPS + 1, gap = Math.min(70, (W - 160) / (n - 1)), x0 = W / 2 - gap * (n - 1) / 2;
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + gap * (n - 1), y); g.stroke();
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap, done = i < Run.step, cur = i === Run.step, boss = i === n - 1;
    g.fillStyle = done ? '#57e389' : cur ? GOLD : 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(x, y, boss ? 14 : 9, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.fillStyle = done || cur ? NIGHT : '#9fb3c8'; g.font = `${boss ? 13 : 10}px ${FONT}`; g.fillText(boss ? '♛' : String(i + 1), x, y + (boss ? 5 : 4));
  }
}
function runV2Screen(g) {
  dim(g, 0.92); g.textAlign = 'center';
  if (Game.screen === 'runvow') {
    g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText('TAKE A VOW', W / 2, 70);
    g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText('A trade-off that lasts your whole run. Then choose your path: ' + RUN_STOPS + ' stops and a final.', W / 2, 104);
    const ch = drawRunCards(g, RUN_VOWS, 150, i => runPickVow(i));
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('← → choose  •  Enter confirm  •  Esc back', W / 2, Math.max(400, 150 + ch + 30));
  } else {
    g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText(Run.step >= RUN_STOPS ? 'THE FINAL' : 'STOP ' + (Run.step + 1) + ' OF ' + RUN_STOPS, W / 2, 62);
    drawRunPath(g, 96);
    const ch = drawRunCards(g, Run.choicesV2.map(id => RUN_NODES[id]), 128, i => runChooseNode(i)), sy = Math.max(368, 128 + ch + 30);
    drawRunStatus(g, sy);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('← → choose  •  Enter go  •  Esc: end your run (asks first)', W / 2, sy + 52);
  }
}
function runPickVow(i) { Run.vow = RUN_VOWS[i].id; SFX.blip && SFX.blip(); runToMap(); }
function runV2Update() {
  const items = Game.screen === 'runvow' ? RUN_VOWS : Run.choicesV2, n = items.length;
  Game.idx = clamp(Game.idx | 0, 0, n - 1);
  if (menuHit('left') || menuHit('up')) Game.idx = (Game.idx + n - 1) % n;
  if (menuHit('right') || menuHit('down')) Game.idx = (Game.idx + 1) % n;
  if (menuHit('ok')) { if (Game.screen === 'runvow') runPickVow(Game.idx); else runChooseNode(Game.idx); return; }
  if (menuHit('back')) { if (Game.screen === 'runvow') { Run.active = false; openBarakah(); } else runAskAbandon(); }   // v9.12: the map asks first
}
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const was = Game.screen === 'runvow' || Game.screen === 'runmap'; _gu.apply(this, arguments); if (was && (Game.screen === 'runvow' || Game.screen === 'runmap')) { runV2Update(); attractTick(rdt); } };
  const _r = render;
  render = function (g) {
    _r(g);
    if (Game.screen === 'runvow' || Game.screen === 'runmap') { const rw = W, ox = Math.round((W - 960) / 2); g.save(); g.translate(ox, 0); W = 960; Game.ox = ox; runV2Screen(g); W = rw; Game.ox = 0; g.restore(); drawBackButton(g); }
    else if (Game.screen === 'runend' && Run.champion) { const rw = W, ox = Math.round((W - 960) / 2); g.save(); g.translate(ox, 0); W = 960; g.textAlign = 'center'; g.fillStyle = '#ffd76a'; g.font = `20px ${FONT}`; g.fillText('♛ You beat the Champions. Run complete, alhamdulillah.', W / 2, 220); W = rw; g.restore(); }
    else if (Game.screen === 'runhome') { const rw = W, ox = Math.round((W - 960) / 2); g.save(); g.translate(ox, 0); W = 960; g.textAlign = 'center'; g.fillStyle = '#9dffb0'; g.font = `12px ${BODY}`; g.fillText('Solo runs: take a vow, choose your path through ' + RUN_STOPS + ' stops, and beat the Champions in the final.', W / 2, Input.touchMode ? 140 : 127); W = rw; g.restore(); }
  };
  BACK.runvow = () => { Run.active = false; openBarakah(); };
  BACK.runmap = () => { Run.active = false; Game.screen = 'runend'; Game.idx = 0; };
}
