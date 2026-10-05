// ------------------------------------------------------------- pause menu with timeouts
function pauseItems() {
  const items = [[Net.role === 'guest' ? 'Keep playing' : 'Resume', () => { Game.paused = false; }]];
  const t = timeoutTeam();
  if (canCallTimeout(t)) items.push(['Call timeout (' + M.timeouts[t] + ' left)', () => { Game.paused = false; callTimeout(t, true); }]);
  else if (M.timeouts && t >= 0 && !Net.role && !M.mini && !M.practice) items.push(['Timeout (' + M.timeouts[t] + ' left): only with the ball', () => {}]);
  if (!M.gym && !M.practice) items.push(['Camera: ' + CAM_PRESETS[View.camera].name, () => cycleCamera(1, true)]);
  items.push([Net.role ? 'Leave online game' : M.career ? 'Leave game (no result)' : 'Quit to title', () => { M.career ? careerHub() : goTitle(); }]);
  return items;
}
function pauseNav() {
  const it = pauseItems(); Game.idx = Game.idx % it.length;
  menuNav(it.length, i => it[i][1]());
  if (menuHit('back')) Game.paused = false;
}
drawPause = function (g) {
  dim(g, 0.65);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `40px ${FONT}`; g.fillText('Paused', W / 2, 170);
  const it = pauseItems();
  drawMenu(g, it.map(x => x[0]), Game.idx % it.length, 230, i => it[i][1]());
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.textAlign = 'center'; g.fillText('Press F for fullscreen  •  How to play is in Options', W / 2, 400);
};
function drawTimeoutPanel(g) {
  if (M.phase !== 'timeout') return;
  if (!M.toHuman) { banner(g, 'TIMEOUT', M.teamDefs[M.toTeam].name + ' draws something up'); return; }
  dim(g, 0.6);
  const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); const rw = W; W = 960;
  panel(g, W / 2 - 280, 70, 560, 380, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('TIMEOUT', W / 2, 112);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Call a play. The ball is inbounded in the frontcourt.', W / 2, 136);
  PLAYS.forEach(([k, name, desc], i) => {
    const y = 158 + i * 66, on = M.toSel === i;
    g.fillStyle = on ? 'rgba(232,195,90,0.92)' : 'rgba(255,255,255,0.08)'; roundRect(g, W / 2 - 250, y, 500, 56, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `17px ${FONT}`; g.fillText(name, W / 2 - 230, y + 24);
    g.fillStyle = on ? '#3a2a0a' : '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(desc, W / 2 - 230, y + 44);
    addRect(W / 2 - 250 + o, y, 500, 56, () => { M.toSel = i; endTimeout(k); });
  });
  W = rw; g.restore();
}
{
  const _pu = playUpdate;
  playUpdate = function (rdt) {
    if (M.phase === 'timeout' && M.toHuman && !Game.paused && !Game.trivia) {
      const n = PLAYS.length;
      if (menuHit('up')) { M.toSel = (M.toSel + n - 1) % n; SFX.blip(); }
      if (menuHit('down')) { M.toSel = (M.toSel + 1) % n; SFX.blip(); }
      if (menuHit('ok')) { SFX.blip(); endTimeout(PLAYS[M.toSel][0]); }
      sim(rdt, false); return;
    }
    _pu(rdt);
    if (Game.screen === 'final' && M.scenario) Game.finalTab = 0;
  };
}

// ------------------------------------------------------------- HUD: composure + pressure
function compColor(v) { return v >= 70 ? '#57e389' : v >= 40 ? '#f2cf6b' : '#ff8a7a'; }
function drawCompRow(g, p, x, y, cy) {
  const v = p.comp == null ? 50 : p.comp, P = pressureOf(p);
  g.fillStyle = '#9fb3c8'; g.font = `9px ${FONT}`; g.textAlign = 'left'; g.fillText('POISE', x + 20, y + 7);
  meter(g, x + 64, y + 1, 150, 6, v / 100, compColor(v));
  if (P >= 0.3 && !(p.fire || p.boost > 0 || (p.fat || 0) > 0.7)) { g.fillStyle = `rgba(255,${Math.round(150 + 60 * Math.sin(Game.t * 6))},120,0.95)`; g.font = `10px ${FONT}`; g.textAlign = 'right'; g.fillText('PRESSURE', x + 214, cy + 17); }
}
{
  const _r = render;
  render = function (g) {
    _r(g);
    if ((Game.screen === 'play' || Game.screen === 'netplay') && M.phase === 'timeout') drawTimeoutPanel(g);
    if (Game.screen === 'scenbrief') drawScenBrief(g);
  };
}

// ------------------------------------------------------------- touch labels
{
  const _tu = TouchUI.update.bind(TouchUI);
  TouchUI.update = function () {
    _tu();
    if (!this.shown || !this.btns.cross) return;
    const me = M.players && M.players.find(p => p.human === 0); if (!me || Game.screen === 'musalla') return;
    const bo = ball.owner, mine = bo === me, offense = bo ? bo.team === me.team : false;
    const cross = mine ? (me.postUp ? 'DROP' : 'MOVE') : offense ? 'MOVE' : 'STANCE', skill = mine ? 'SCREEN' : 'SKILL';
    const key = cross + skill;
    if (this.v6last !== key) { this.v6last = key; this.btns.cross.firstChild.textContent = cross; this.btns.skill.firstChild.textContent = skill; }
    this.btns.cross.classList.toggle('cd', mine && (me.cd.mv || 0) > 0);
    this.btns.skill.classList.toggle('hint', mine && !(me.cd.scr > 0) && !!me.mate);
    this.btns.skill.classList.toggle('cd', !mine || (me.cd.scr || 0) > 0);
  };
}

// ------------------------------------------------------------- how to play
drawHowTo = function (g) {
  dim(g, 0.84);
  const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); const rw = W; W = 960;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('How to play', W / 2, 44);
  const rows = [['Move', 'W A S D', 'Arrows'], ['Pass  •  Steal', 'J', 'Num1 / ,'], ['Shoot  •  Block (hold, release at the top)', 'K', 'Num2 / .'],
    ['Turbo', 'L', 'Num3 / /'], ['Move  •  Stance on defense', 'H', 'Num0 / M'], ['Screen (with the ball)', 'I', 'Num4 / N']];
  g.font = `11px ${FONT}`; g.fillStyle = '#9fb3c8'; g.fillText('P1', 640, 72); g.fillText('P2', 780, 72);
  rows.forEach((r, i) => { const y = 92 + i * 22; g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(r[0], 120, y); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `12px ${FONT}`; g.fillText(r[1], 640, y); g.fillText(r[2], 780, y); });
  const col = (x, title, lines) => { g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText(title, x, 236); g.fillStyle = IVORY; g.font = `12px ${BODY}`; lines.forEach((t, i) => g.fillText(t, x, 256 + i * 19)); };
  col(70, 'WITH THE BALL', ['Move + stick sideways: crossover', 'Move + back-diagonal: behind the back', 'Move + toward a defender: spin', 'Move + away from the rim: step-back',
    'Tap Move: hesitation  •  hold near the paint: post up', 'Tap Shoot: pump fake  •  hold: shoot', 'Shot type comes from the play: layup, euro,', 'floater, fadeaway (stick away), hook in the post',
    'Tap Pass: quick pass  •  hold: lob  •  turbo: bounce', 'Hold Pass, tap Shoot: pass fake']);
  col(500, 'DEFENSE, CONTACT, LATE GAME', ['Hold Move: stance (mirror him, hands up, box out)', 'Turbo + Block: swipe; from behind it’s a chase-down', 'Reach across his body and it’s a foul', 'Turbo + Steal: shove (hard foul). Late and', 'trailing, it’s a foul on purpose to stop the clock',
    'Final minute: turbo + Pass dives for loose balls', 'Poise rises with good plays and steadies your', 'shot under pressure', 'Pass, then call for it again: give-and-go', 'Pause to call a timeout and a set play']);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText('Press Enter or tap to go back', W / 2, 520);
  W = rw; g.restore();
  addRect(0, 0, W, H, goTitle);
};

// ------------------------------------------------------------- achievements
{
  const add = (a) => { ACHIEVEMENTS.push(a); ACH_BY_ID[a.id] = a; };
  add({ id: 'pinned', api: 'ACH_PINNED', name: 'Pinned On The Glass', desc: 'Chase-down block that pins it on the backboard', icon: 'hand' });
  add({ id: 'and_one', api: 'ACH_AND_ONE', name: 'And One', desc: 'Score through contact for an and-one', icon: 'ball' });
  add({ id: 'combo_3', api: 'ACH_COMBO_3', name: 'Handle Like Water', desc: 'Chain three dribble moves together', icon: 'ball' });
  add({ id: 'scen_win', api: 'ACH_SCEN_WIN', name: 'Clutch on Demand', desc: 'Complete a Daily Scenario', icon: 'clock' });
  add({ id: 'season_2', api: 'ACH_SEASON_2', name: 'Run It Back', desc: 'Start a second career season', icon: 'trophy' });
  add({ id: 'chem_max', api: 'ACH_CHEM_MAX', name: 'Like Brothers', desc: 'Max out chemistry with a partner', icon: 'masjid' });
}

// ------------------------------------------------------------- poses: pump fake, dive, stance, post-up
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    if (p.state === 'fake') { p.state = 'windup'; const t = _pt(p, sp); p.state = 'fake'; return t; }
    if (p.state === 'dive') { const t = _pt(p, sp); Object.assign(t, { lean: 0.9, ns: 2.4, fs: 2.4, ne: 0.2, fe: 0.2, nh: -0.6, fh: -0.6, nk: 0.3, fk: 0.3 }); return t; }
    const t = _pt(p, sp);
    if (p.stance) { t.nk += 0.25; t.fk += 0.25; t.nh += 0.15; t.fh += 0.15; t.ns = Math.max(t.ns, 1.5); t.fs = Math.max(t.fs, 1.35); t.lean += 0.05; }
    if (p.postUp) { t.lean = -0.08; t.nk += 0.35; t.fk += 0.35; }
    return t;
  };
}
