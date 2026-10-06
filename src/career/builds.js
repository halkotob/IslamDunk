
// ===================================================== CAREER: BODY BUILDS (v7.8)
// Height, build and play style each trade some stats for others (tables in career.js, every row sums
// to zero), applied on top of the levels you buy, so changing your look later moves them back.
// The creator shows the result live, with a big Start career button under the preview.
function myMods() { const lk = C.look; return bodyMods(lk.height, lk.build, lookArch(lk)); }
{
  const _pd = playerDef;
  playerDef = function () { const d = _pd.apply(this, arguments); applyBodyMods(d.stats, myMods()); return d; };
}
const BUILD_ROWS = [['sht', 'Shooting'], ['spd', 'Speed'], ['dnk', 'Dunking'], ['def', 'Defense'], ['stl', 'Steals'], ['sta', 'Stamina'], ['pas', 'Passing'], ['hus', 'Hustle'], ['clu', 'Clutch']];
function modTag(g, x, y, v) {
  if (!v) return;
  g.textAlign = 'left'; g.font = `11px ${FONT}`; g.fillStyle = v > 0 ? '#9dffb0' : '#ff9a8a'; g.fillText((v > 0 ? '+' : '−') + Math.abs(v), x, y);
}
// one stat line: trained level in gold, the body's bonus in green, what it costs you as red outlines
function buildPips(g, x, y, base, mod) {
  const eff = clamp(base + mod, 1, 10);
  for (let i = 0; i < 10; i++) {
    const on = i < eff, bonus = on && i >= base, lost = !on && i < base;
    g.fillStyle = bonus ? '#57e389' : on ? GOLD : 'rgba(255,255,255,0.10)'; roundRect(g, x + i * 9, y, 7, 9, 2); g.fill();
    if (lost) { g.strokeStyle = '#ff7a6a'; g.lineWidth = 1.2; roundRect(g, x + i * 9 + 0.5, y + 0.5, 6, 8, 2); g.stroke(); }
  }
}
function buildSummary(m) {
  const up = BUILD_ROWS.filter(([k]) => m[k] > 0).map(r => r[1]), dn = BUILD_ROWS.filter(([k]) => m[k] < 0).map(r => r[1]);
  return up.length ? 'Better at ' + up.join(', ').toLowerCase() + '. Weaker at ' + dn.join(', ').toLowerCase() + '.' : 'Even across the board. Change height, build or play style to specialise.';
}

drawCreator = function (g) {
  const cr = Game.creator, lk = C.look, rows = CREATOR_ROWS.filter(r => r.key !== 'done');
  panel(g, 30, 46, 470, 488, true);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText(cr.isNew ? 'Create your player' : 'Customize your player', 104, 32);
  g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('↑ ↓ choose   ← → change   Enter select', 930, 32);
  const gap = 476 / rows.length;
  rows.forEach(r => {
    const i = CREATOR_ROWS.indexOf(r), y = 54 + rows.indexOf(r) * gap, sel = i === cr.idx, cy = y + gap / 2 + 5;
    if (sel) { g.fillStyle = 'rgba(232,195,90,0.18)'; roundRect(g, 40, y + 1, 450, gap - 2, 8); g.fill(); }
    g.fillStyle = sel ? '#fff' : IVORY; g.font = `14px ${BODY}`; g.textAlign = 'left'; g.fillText(r.label, 54, cy);
    addRect(40, y, 250, gap, () => { cr.idx = i; creatorEnter(i); });
    const vx = 330;
    if (r.key === 'name') { g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(C.name || 'Tap to type', vx + 60, cy); return; }
    g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText('◂', vx, cy + 1); g.fillText('▸', vx + 120, cy + 1);
    addRect(vx - 20, y, 40, gap, () => { cr.idx = i; creatorStep(i, -1); }); addRect(vx + 100, y, 40, gap, () => { cr.idx = i; creatorStep(i, 1); });
    if (r.sw) { g.fillStyle = r.sw[lk[r.key]]; roundRect(g, vx + 30, cy - 14, 60, 18, 9); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.stroke(); }
    else { g.fillStyle = '#fff'; g.font = `13px ${BODY}`; g.fillText(r.txt ? r.txt[lk[r.key]] : String(lk[r.key]), vx + 60, cy); }
  });
  // preview
  const T = amanahTeam(), d = playerDef(), cur = CREATOR_ROWS[cr.idx];
  panel(g, 530, 46, 400, 262, false);
  if (cur && cur.key === 'style') drawSigDemo(g, 640, 282, 1.55); else drawPortrait(g, 640, 282, d, T, 1.55, 'thobe');
  drawPortrait(g, 830, 282, d, T, 1.55, null);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('At the masjid', 640, 300); g.fillText('Game day', 830, 300);
  // starting stats: what this body is good and bad at
  const m = myMods(), base = Object.assign({}, C.lv, { stl: Math.round((C.lv.def + C.lv.spd) / 2), hus: C.lv.hus || 4, clu: C.lv.clu || 4 });
  panel(g, 530, 316, 400, 150, false);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(cr.isNew ? 'STARTING STATS' : 'YOUR STATS', 548, 338);
  g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(LOOK_TXT.height[lk.height] + ', ' + LOOK_TXT.build[lk.build].toLowerCase() + ', ' + PLAY_STYLE_TXT[lk.style || 0].toLowerCase(), 668, 338);
  BUILD_ROWS.forEach(([k, label], i) => {
    const x = 548 + Math.floor(i / 5) * 196, y = 348 + (i % 5) * 16;
    g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `12px ${BODY}`; g.fillText(label, x, y + 9);
    buildPips(g, x + 66, y, base[k], m[k] || 0); modTag(g, x + 160, y + 9, m[k] || 0);
  });
  g.textAlign = 'left'; g.fillStyle = '#cfd8e3'; g.font = `11px ${BODY}`;
  wrapText(g, buildSummary(m), 548, 440, 366, 13);
  // the big button
  const di = CREATOR_ROWS.findIndex(r => r.key === 'done'), sel = cr.idx === di, pulse = 0.5 + 0.5 * Math.sin(Game.t * 4);
  const bx = 530, by = 474, bw = 400, bh = 56, hov = hovering(bx, by, bw, bh), pr = pressing(bx, by, bw, bh);
  g.save(); g.shadowColor = 'rgba(242,207,107,' + (0.35 + 0.4 * (sel ? 1 : pulse)) + ')'; g.shadowBlur = sel || hov ? 26 : 12 + 10 * pulse;
  const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, pr ? '#d9b14e' : '#ffe08a'); gr.addColorStop(1, pr ? '#a8812e' : '#d9a83a');
  g.fillStyle = gr; roundRect(g, bx, by + (pr ? 2 : 0), bw, bh, 28); g.fill(); g.restore();
  g.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.55)'; g.lineWidth = sel ? 3 : 1.5; roundRect(g, bx, by + (pr ? 2 : 0), bw, bh, 28); g.stroke();
  g.textAlign = 'center'; g.fillStyle = NIGHT; g.font = `24px ${FONT}`; g.fillText(cr.isNew ? 'Start career  ›' : 'Done  ›', bx + bw / 2, by + 37 + (pr ? 2 : 0));
  addRect(bx, by, bw, bh, () => { cr.idx = di; creatorDone(); });
};
{ // keyboard: Tab or Enter on the last row jumps straight to the button; it's also one Up press from the top
  const _cu = creatorUpdate;
  creatorUpdate = function () {
    const cr = Game.creator;
    if (Input.pressed.Tab) { cr.idx = CREATOR_ROWS.findIndex(r => r.key === 'done'); SFX.blip(); return; }
    return _cu.apply(this, arguments);
  };
}
{ // hub card and Train: show the body's bonus next to each trained level, and the next opponent's rating
  const tagRows = (g, x, y0, dy, oy) => { const m = myMods(); STAT_ROWS.forEach(([k], i) => modTag(g, x, y0 + i * dy + oy, m[k] || 0)); };
  const _hub = drawHub;
  drawHub = function (g) {
    _hub.apply(this, arguments);
    tagRows(g, 234, 292, 22, 9);
    const b = C.bracket; if (!b || b.champ || b.out) return;
    const m = ourMatch(), opp = teamOf(C.stage, m.a === 0 ? m.b : m.a);
    if (opp.tier == null) return;
    const t = opp.tier; g.textAlign = 'left'; g.font = `11px ${FONT}`; g.fillStyle = t > 0 ? '#ff9a8a' : t < 0 ? '#9dffb0' : '#f2cf6b';
    g.fillText('★'.repeat(t + 2) + '☆'.repeat(1 - t) + '  ' + TIER_TXT[t].toUpperCase(), 408, 186);
  };
  const _tr = drawTrain;
  drawTrain = function (g) { _tr.apply(this, arguments); tagRows(g, W / 2 - 110 + 94, 132, 38, 22); };
}
