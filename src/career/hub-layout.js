// ===================================================== v9.6.2: CAREER HUB, the parts that live outside drawHub
// - The gym behind the hub keeps its look but not its words: while the hub (or Personal bests) is up, the scene is drawn with text
//   off (signs, name tags, speech bubbles), and drawHub darkens it. No blur: a canvas blur every frame costs too
//   much on phones.
// - My Player > Records > Personal bests (the gym bests that used to be on the hub).
{
  const _ds = drawScene;
  drawScene = function (g) {
    if ((Game.screen !== 'hub' && Game.screen !== 'crecords') || !g || typeof g.fillText !== 'function') return _ds.apply(this, arguments);
    const own = Object.prototype.hasOwnProperty.call(g, 'fillText'), f = g.fillText, s = g.strokeText, ownS = Object.prototype.hasOwnProperty.call(g, 'strokeText');
    g.fillText = g.strokeText = function () {};
    try { return _ds.apply(this, arguments); }
    finally { if (own) g.fillText = f; else delete g.fillText; if (ownS) g.strokeText = s; else delete g.strokeText; }
  };
  CAREER_SCREENS.add('crecords');
  const _cu = careerUpdate; careerUpdate = function (rdt) { if (Game.screen === 'crecords') { if (menuHit('back') || menuHit('ok')) careerHub(); return; } return _cu.apply(this, arguments); };
  const _cr = careerRender; careerRender = function (g) { if (Game.screen === 'crecords') return drawRecords(g); return _cr.apply(this, arguments); };
  BACK.crecords = () => careerHub();
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments), mp = R.find(e => e.label === 'My Player'), rec = mp && mp.sub && mp.sub.find(s => s.label === 'Records' && s.sub);
    if (rec && !rec.sub.some(s => s.label === 'Personal bests')) rec.sub.push({ label: 'Personal bests', act: () => openRecords() });
    else if (mp && mp.sub && !rec && !mp.sub.some(s => s.label === 'Personal bests')) mp.sub.push({ label: 'Personal bests', act: () => openRecords() });
    return R;
  };
}
