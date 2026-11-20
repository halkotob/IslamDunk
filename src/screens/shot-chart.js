// ================================================= v9.32.0: THE SHOT CHART
// A third tab on the final screen, Shots: each team's half court with every shot it took, where from, made (filled)
// or missed (ring), threes in gold, dunks as a star at the rim, and the team's shooting line under it.
//   * Recorded in the match (M.shotLog), from the simulation: each shot when it's released (releaseShot) or dunked
//     (slam), and marked made when it scores (onScore). So in a rollback match both phones keep the same chart.
//   * Free throws aren't shots on the chart (M.phase 'ft'), nor are the mini games.
// (Left / right and Tab cycle the three tabs.)
function shotLogAdd(p, kind) {
  if (!M.shotLog || !p || M.mini || M.phase === 'ft' || M.attract) return;
  const h = attackHoop(p.team); if (!h) return;
  const sh = ball.shot; if (!sh || sh.shooter !== p || sh._si != null) return;
  sh._si = M.shotLog.length;
  M.shotLog.push({ t: p.team, x: Math.round(p.x), z: Math.round(p.z), dx: Math.round(Math.abs(p.x - h.x)), dz: Math.round(p.z - h.z),
    three: kind !== 'dunk' && isThree(p.x, p.z, h), dunk: kind === 'dunk', made: false, who: p.slot });
}
{
  const _nm = newMatch;
  newMatch = function () { const r = _nm.apply(this, arguments); M.shotLog = []; return r; };
  const _rs = releaseShot;
  releaseShot = function (p) { const r = _rs.apply(this, arguments); shotLogAdd(p, 'shot'); return r; };
  const _sl = slam;
  slam = function (p) { const r = _sl.apply(this, arguments); shotLogAdd(p, 'dunk'); return r; };
  const _os = onScore;
  onScore = function (h) {
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null;
    if (sh && sh._si != null && M.shotLog && M.shotLog[sh._si]) M.shotLog[sh._si].made = true;
    return _os.apply(this, arguments);
  };
}
// one team's half court: the rim at the top, the arc, the paint; shots placed by their distance from the rim
function drawShotCourt(g, x, y, w, h, T, ti) {
  const S = (M.shotLog || []).filter(s => s.t === ti);
  panel(g, x, y, w, h, false);
  const cx = x + w / 2, top = y + 46, k = Math.min((w - 40) / COURT.D, (h - 96) / (COURT.L / 2)) * 1.12;   // world units to pixels
  const px = s => [cx + s.dz * k, top + 16 + s.dx * k];
  // the floor: baseline, the paint, the free-throw circle, the arc (corners straight down), the rim
  g.save(); g.beginPath(); g.rect(x + 8, top, w - 16, h - (top - y) - 48); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x + 14, top + 2); g.lineTo(x + w - 14, top + 2); g.stroke();
  const lane = 120 * k, ft = 190 * k; g.strokeRect(cx - lane / 2, top + 2, lane, ft);
  g.beginPath(); g.arc(cx, top + 2 + ft, lane / 2, 0, Math.PI); g.stroke();
  const R3 = THREE_R * k, cz = 300 * k, cornerY = Math.sqrt(Math.max(0, THREE_R * THREE_R - 300 * 300)) * k;
  g.beginPath(); g.moveTo(cx - cz, top + 2); g.lineTo(cx - cz, top + 16 + cornerY);
  const t1 = Math.acos(Math.min(1, 300 / THREE_R));                    // (the arc meets the corner lines; drawn left corner to right, through the top of the key)
  g.arc(cx, top + 16, R3, Math.PI - t1, t1, true);
  g.lineTo(cx + cz, top + 2); g.stroke();
  g.strokeStyle = '#ff8a3d'; g.lineWidth = 2; g.beginPath(); g.arc(cx, top + 16, 6, 0, Math.PI * 2); g.stroke();
  // the shots
  for (const s of S) {
    const [sx, sy] = s.dunk ? [cx + (s.who ? 4 : -4), top + 16] : px(s), col = s.dunk ? '#ffffff' : s.three ? '#ffd76a' : '#8fd0ff';   // (twos one colour for every team: a gold team colour read as a three)
    g.lineWidth = 2; g.strokeStyle = col; g.fillStyle = col;
    if (s.dunk) { if (s.made) drawStar(g, sx, sy, 6); continue; }
    g.beginPath(); g.arc(sx, sy, 4.5, 0, Math.PI * 2); if (s.made) g.fill(); else g.stroke();
  }
  const dk = S.filter(s => s.dunk), dm = dk.filter(s => s.made).length;
  if (dk.length) { g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `12px ${FONT}`; g.fillText(dm + (dm === 1 ? ' dunk' : ' dunks') + (dk.length > dm ? ' (' + (dk.length - dm) + ' missed)' : ''), cx + 14, top + 20); }
  g.restore();
  // the name and the shooting line
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(fitText(g, T.name, w - 30), cx, y + 26);
  const two = S.filter(s => !s.three), thr = S.filter(s => s.three), m = a => a.filter(s => s.made).length;
  const pct = a => a.length ? Math.round(m(a) / a.length * 100) + '%' : '-';
  g.fillStyle = IVORY; g.font = `12px ${BODY}`;
  g.fillText(`FG ${m(S)}/${S.length} (${pct(S)})   2PT ${m(two)}/${two.length}   3PT ${m(thr)}/${thr.length} (${pct(thr)})`, cx, y + h - 18);
}
function drawStar(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
function drawShotChart(g, y0) {
  M.teams.forEach((T, ti) => drawShotCourt(g, ti ? W / 2 + 10 : W / 2 - 430, y0, 420, 300, T.def, ti));
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`;
  g.fillText('filled: made   ring: missed   gold: three   star: dunk', W / 2, y0 + 318);
}
{
  // three tabs: Summary, Box score, Shots
  const _ft = finalTabs;
  finalTabs = function () { const t = _ft.apply(this, arguments); return t.includes('Shots') ? t : t.concat('Shots'); };
  const _fu = finalUpdate;
  finalUpdate = function () {
    const n = finalTabs().length, before = Game.finalTab || 0, L = menuHit('left'), R = menuHit('right') || Input.pressed.Tab;
    const r = _fu.apply(this, arguments);
    if ((L || R) && Game.screen === 'final' && n > 2) Game.finalTab = (before + (R ? 1 : -1) + n) % n;
    return r;
  };
  // the Shots tab: the final screen as on Box score, with the chart where the box score goes
  // (the tab buttons are laid out for two: centred again for three, and the one showing lit)
  const _df = drawFinalScreen;
  drawFinalScreen = function (g) {
    const tab = Game.finalTab || 0, tabs = finalTabs(), shift = (tabs.length - 2) * 77, _ub = uiButton, _bs = drawBoxScore;
    uiButton = function (gg, x, y, w, h, label, fn, active) {
      if (y === 96 && tabs.includes(label)) { x -= shift; active = label === tabs[tab]; }
      return _ub.call(this, gg, x, y, w, h, label, fn, active);
    };
    if (tab === 2) { uiButton = _ub; return drawShotsScreen(g, tabs); }   // (its own screen: the final screen's add-ons draw for the other tabs)
    try { return _df.apply(this, arguments); } finally { uiButton = _ub; drawBoxScore = _bs; Game.finalTab = tab; }
  };
  function drawShotsScreen(g, tabs) {
    dim(g, 0.78);
    const w = M.winner != null ? M.winner : (M.teams[0].score >= M.teams[1].score ? 0 : 1), T = M.teams[w].def;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText(T.name.toUpperCase() + ' WIN', W / 2, 58);
    g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText('Final ' + M.teams[0].score + ' \u2013 ' + M.teams[1].score, W / 2, 82);
    const x0 = W / 2 - tabs.length * 154 / 2 + 4;
    tabs.forEach((t, i) => uiButton(g, x0 + i * 154, 96, 146, 32, t, () => { Game.finalTab = i; }, i === 2));
    drawShotChart(g, 140);
    uiButton(g, W / 2 - 95, 478, 190, 40, Net.role === 'guest' ? 'Waiting for your friend' : 'Continue', () => finalContinue(), true);
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('\u2190 \u2192 switch tabs, Enter to continue', W / 2, 532);
  }
}
