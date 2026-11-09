// v9.17.7 (X2, X6): Settings → Accessibility → Text size works on phones too: Normal, Large, Larger.
// Phones raise small text to a minimum as it's drawn (phone-pass.js). Normal keeps today's 11 CSS px; Large raises it
// to 13 and Larger to 15. Pinch zoom stays off (it would move the court mid-play), so this is how a player makes the
// words bigger.
//   - Menus and text screens only. The court and the in-match HUD (drawScene, drawHUD) keep Normal, so nothing on the
//     court gets covered; a pause menu or a Noor question over the court does get the bigger text.
//   - Fitting, so nothing runs off the screen, out of its button or into other words. Each line is checked as it's
//     drawn (past the screen's edge: one size smaller there and then) and after the frame (it now overlaps another
//     line more than it did at Normal, or it sticks out of its button or panel further than at Normal: one size smaller, drawn again
//     in the same frame, then Normal). A wrapped paragraph steps down as a whole and wraps again at its new size. A label
//     fitted to its box (fitText) tries one size smaller before it shortens with "…".
//   - Saved in islamdunk.access ("ts", as before); textSize stays a local setting (RB_LOCAL), so it never changes
//     anything for the other player online.
const PHONE_MINS = [PHONE_MIN_CSS, 13, 15];
PhoneText.lvl = 0; PhoneText.court = 0; PhoneText.use = null; PhoneText.para = null;
const PhoneFit = { down: new Map(), recs: [], last: [], panels: [] };   // key -> the size it steps down to; this frame's lines and panels
const phoneLvl = () => PhoneText.use != null ? PhoneText.use : PhoneText.court ? 0 : PhoneText.lvl;
phoneFloor = function (g) {
  const f = g.font, m = /([\d.]+)px/.exec(f); if (!m) return null;
  const t = g.getTransform(), k = Math.hypot(t.a, t.b) * PhoneText.cssPerDev; if (!(k > 0)) return null;
  const min = PHONE_MINS[phoneLvl()] / k; if (+m[1] >= min - 0.01) return null;
  g.font = f.replace(m[0], (Math.ceil(min * 10) / 10) + 'px'); return f;
};
const phoneKey = text => Game.screen + '|' + (PhoneText.para ? '¶' + PhoneText.para.slice(0, 24) : String(text).slice(0, 16));   // (by its start: a line typed out letter by letter keeps its key)
const phoneAt = (key, L) => { const d = PhoneFit.down.get(key); return d == null ? L : Math.min(L, d); };
// a string fitText kept whole at a smaller size carries that size with it
const phoneTagged = (t, lvl) => { const s = new String(t); s.__lvl = lvl; return s; };
// the line's box in device pixels at size L
function phoneBox(g, text, x, y, L) {
  const keep = PhoneText.use; PhoneText.use = L;
  try {
    const mt = g.measureText(text), w = mt.width, al = g.textAlign, a0 = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
    const up = mt.actualBoundingBoxAscent || 0, dn = mt.actualBoundingBoxDescent || 0, bl = g.textBaseline;
    const yb = bl === 'middle' ? y + (up - dn) / 2 : bl === 'top' || bl === 'hanging' ? y + up : y;
    const m = g.getTransform(), p = m.transformPoint(new DOMPoint(a0, yb - up)), q = m.transformPoint(new DOMPoint(a0 + w, yb + dn));
    return [Math.min(p.x, q.x), Math.min(p.y, q.y), Math.max(p.x, q.x), Math.max(p.y, q.y)];
  } finally { PhoneText.use = keep; }
}
function phoneSizeInstall(g) {
  if (!g || g.__tsize) return; g.__tsize = true;
  phoneTextInstall(g);                                           // (phone-pass's own, first; this goes over it)
  for (const name of ['fillText', 'strokeText']) {
    const prev = g[name];
    g[name] = function (text, x, y, maxW) {
      const tag = text && text.__lvl != null ? text.__lvl : null;
      if (!PhoneText.on || PhoneText.court || PhoneText.lvl === 0 || maxW !== undefined || !String(text).trim()) {
        const k = PhoneText.use; if (tag != null) PhoneText.use = tag;
        try { return maxW === undefined ? prev.call(this, text, x, y) : prev.call(this, text, x, y, maxW); } finally { PhoneText.use = k; }
      }
      const key = phoneKey(text), start = phoneAt(key, tag != null ? tag : phoneLvl()), keep = PhoneText.use, cw = this.canvas ? this.canvas.width : 0;
      try {
        for (let L = start; L >= 0; L--) {
          const b = phoneBox(this, text, x, y, L);
          if (L > 0 && (b[0] < -2 || b[2] > cw + 2)) continue;    // past the edge: one size smaller
          PhoneText.use = L;
          if (this.globalAlpha > 0.3 && PhoneFit.recs.length < 600) PhoneFit.recs.push({ key, L, b, b0: L ? phoneBox(this, text, x, y, 0) : b, t: String(text) });
          return prev.call(this, text, x, y);
        }
      } finally { PhoneText.use = keep; }
    };
  }
  const pm = g.measureText;
  g.measureText = function (text) { const k = PhoneText.use; if (text && text.__lvl != null) PhoneText.use = text.__lvl; try { return pm.call(this, text); } finally { PhoneText.use = k; } };
}
// after the frame: lines that now overlap, or spill out of their button, step down a size for the next frame
const boxOv = (a, b, gap = 0) => Math.max(0, Math.min(a[2], b[2]) + gap - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));   // (gap: room kept between two words on a line)
const boxOut = (a, r) => Math.max(0, r[0] - a[0]) + Math.max(0, a[2] - r[2]) + Math.max(0, r[1] - a[1]) + Math.max(0, a[3] - r[3]);   // how far a sticks out of r
const boxMid = (a, r) => { const x = (a[0] + a[2]) / 2, y = (a[1] + a[3]) / 2; return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; };
function phoneFitCheck() {
  const R = PhoneFit.recs; PhoneFit.last = R; PhoneFit.recs = [];
  if (!R.length) return;
  const s = canvas.width / W, rects = (Game.rects || []).filter(r => r.w * r.h < W * H * 0.9).map(r => [r.x * s, r.y * s, (r.x + r.w) * s, (r.y + r.h) * s]).concat(PhoneFit.panels);
  const gap = 4 * s;
  let n = 0; const step = r => { const d = PhoneFit.down.get(r.key); if (d == null || d > r.L - 1) { PhoneFit.down.set(r.key, r.L - 1); n++; } };
  // out of its button or panel (the one its middle is in) further than at Normal (some lines already stick out there)
  for (const r of R) if (r.L > 0 && rects.some(q => boxMid(r.b0, q) && boxOut(r.b, q) > boxOut(r.b0, q) + 2)) step(r);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const a = R[i], b = R[j]; if (a.key === b.key || (!a.L && !b.L)) continue;
    // more overlap than at Normal (lines that already touch there may not touch more)
    if (boxOv(a.b, b.b, gap) > boxOv(a.b0, b.b0, gap) + 4) { if (a.L >= b.L && a.L) step(a); if (b.L >= a.L && b.L) step(b); }
  }
  if (PhoneFit.down.size > 3000) PhoneFit.down.clear();
  return n;
}
{
  const _r = render;
  render = function (g) {
    phoneSizeInstall(g);
    const lvl = Input.touchMode ? clamp(SETTINGS.textSize | 0, 0, 2) : 0;
    if (lvl !== PhoneText.lvl) PhoneFit.down.clear();
    PhoneText.lvl = lvl; PhoneText.court = 0; PhoneText.use = null; PhoneText.para = null; PhoneFit.recs = []; PhoneFit.panels = [];
    let r = _r.apply(this, arguments);
    // a line that had to step down is drawn again at its new size in the same frame (new text never shows too big
    // for a frame); at most twice more, then the next frame carries on
    for (let k = 0; lvl && k < 2 && phoneFitCheck(); k++) { PhoneText.court = 0; PhoneText.use = null; PhoneText.para = null; PhoneFit.recs = []; PhoneFit.panels = []; r = _r.apply(this, arguments); }
    if (lvl && PhoneFit.recs.length) phoneFitCheck();
    return r;
  };
  // panels and buttons (roundRect) are boxes a line has to stay inside too
  const _rr = roundRect;
  roundRect = function (g, x, y, w, h) {
    if (PhoneText.lvl && !PhoneText.court && g === ctx && w * h < W * H * 0.9 && PhoneFit.panels.length < 300) {
      const m = g.getTransform(), p = m.transformPoint(new DOMPoint(x, y)), q = m.transformPoint(new DOMPoint(x + w, y + h));
      PhoneFit.panels.push([Math.min(p.x, q.x), Math.min(p.y, q.y), Math.max(p.x, q.x), Math.max(p.y, q.y)]);
    }
    return _rr.apply(this, arguments);
  };
  const court = prev => function () { PhoneText.court++; try { return prev.apply(this, arguments); } finally { PhoneText.court--; } };
  drawScene = court(drawScene); drawHUD = court(drawHUD);
  const _ft = fitText;
  fitText = function (g, t, w) {
    const L = PhoneText.on && !PhoneText.court ? phoneAt(phoneKey(t), phoneLvl()) : 0;
    if (!L) return _ft.apply(this, arguments);
    const keep = PhoneText.use;
    try { for (let k = L; k >= 0; k--) { PhoneText.use = k; if (g.measureText(t).width <= w) return k === L ? t : phoneTagged(t, k); } PhoneText.use = 0; return _ft.apply(this, arguments); }
    finally { PhoneText.use = keep; }
  };
  // a paragraph steps down as a whole: its lines share its key and wrap at its size
  for (const name of ['wrapText', 'wrapTextLeft']) {
    const prev = name === 'wrapText' ? wrapText : wrapTextLeft;
    const w = function (g, text) {
      if (!PhoneText.on || PhoneText.court || !PhoneText.lvl || PhoneText.para) return prev.apply(this, arguments);
      const kp = PhoneText.para, ku = PhoneText.use; PhoneText.para = String(text); PhoneText.use = phoneAt(phoneKey(), phoneLvl());
      try { return prev.apply(this, arguments); } finally { PhoneText.para = kp; PhoneText.use = ku; }
    };
    if (name === 'wrapText') wrapText = w; else wrapTextLeft = w;
  }
}
// ---- the setting row: the three sizes on a phone too
{
  const it = SET_ITEMS.find(s => s.label === 'Text size');
  if (it) {
    it.get = () => TEXT_SIZES[SETTINGS.textSize];
    it.step = d => { SETTINGS.textSize = (SETTINGS.textSize + (d || 1) + 3) % 3; accessSave(); };
  }
}
