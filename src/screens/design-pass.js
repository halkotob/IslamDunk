// ================================================= v9.16.4: DESIGN PASS, BATCH A
// Small visual fixes agreed with the owners (docs/IMPROVEMENTS.md D1, D2, D3).
//   D3: starting any match switches the Dunk lab off (it only switched off through goTitle before).
//   D1: the results screen darkens the court fully and clears the court's callouts and score pops, so nothing from
//       the last play shows through behind the winner, the score and Player of the Game.
//   D2: the touch buttons stay readable on the wooden court: a slightly darker fill, brighter hint lines, and the
//       idle fade (no touch for 2 s) stops at half strength instead of 30%.
{
  const _nm = newMatch;
  newMatch = function () {
    if (typeof DL !== 'undefined' && DL.on) { DL.on = false; M.cmdHook = null; FX.scale = 1; FX.slowT = 0; }
    return _nm.apply(this, arguments);
  };
}
// D1: results over a fully dark court (the offline results screen and the online guest's)
function resultsBackdrop(g) {
  if (FX.calls && FX.calls.length) FX.calls.length = 0;
  if (FX.pops && FX.pops.length) FX.pops.length = 0;
  g.fillStyle = 'rgba(6,12,20,0.6)'; g.fillRect(-400, 0, W + 800, H);
}
{
  const _dfs = drawFinalScreen;
  drawFinalScreen = function (g) { resultsBackdrop(g); return _dfs.apply(this, arguments); };
  const _df = drawFinal;
  drawFinal = function (g) { resultsBackdrop(g); return _df.apply(this, arguments); };
}
// D2: touch buttons readable on the court
const TOUCH_IDLE_MIN = 0.5;
{
  if (typeof document !== 'undefined') {
    const css = document.createElement('style');
    // (body + id: wins over the touch layer's own stylesheet, which is added later; the pressed colour is kept)
    css.textContent = 'body #tui .b{background:rgba(10,18,28,.72);border-color:rgba(255,255,255,.8)}body #tui .b.on{background:rgba(232,195,90,.75)}' +
      'body #tui .b.hint{border-color:#8fe3ff}body #tui .b small{opacity:1;font-size:10px;color:#e9f1f7}';
    document.head.appendChild(css);
  }
  if (typeof TouchUI !== 'undefined' && TouchUI.update) {
    const _tu = TouchUI.update;
    TouchUI.update = function () {
      const r = _tu.apply(this, arguments);
      if (this.shown && this.btns) for (const k of ['shoot', 'pass', 'cross']) {
        const b = this.btns[k]; if (!b || b.style.display === 'none') continue;
        const o = parseFloat(b.style.opacity); if (o >= 0 && o < TOUCH_IDLE_MIN) b.style.opacity = String(TOUCH_IDLE_MIN);
      }
      return r;
    };
  }
}
