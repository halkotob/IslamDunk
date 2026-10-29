// v9.6.2 hub-layout: the career hub at the five review sizes (tests/hub-setup.js: HUB_SIZES x HUB_CASES). For each, one
// frame is recorded in device pixels: every text drawn on the game canvas (its box from measureText and the transform)
// and every panel, chip, badge pill, the calendar strip and the corner button. Fails on:
//   text-on-text     two texts whose boxes overlap (1 px allowed)
//   panel-on-panel   two containers that overlap (a badge pill may only sit on the card it belongs to)
//   outside          a text that is not inside any container (or the title bar), or runs off the canvas
//   pill             a badge pill outside the card, or two pills that touch
//   gutter           two panels or chips closer than 12 px (in the 960x540 layout)
//   small            on the phone sizes, text under 11 CSS px (the phone text audit's rule)
// Kept as fixtures for the glitch sweep.
import { CAL_HELPERS } from './calendar-setup.js';
import { HUB_HELPERS, HUB_SIZES, HUB_CASES } from './hub-setup.js';

export const HUB_RECORD_INIT = `(() => {
  const P = CanvasRenderingContext2D.prototype, mt = P.measureText;
  window.__hubRec = { on: false, texts: [], boxes: [] };
  const box = (g, x, y, w, h) => { const m = g.getTransform(), a = m.transformPoint(new DOMPoint(x, y)), b = m.transformPoint(new DOMPoint(x + w, y + h)); return { l: Math.min(a.x, b.x), t: Math.min(a.y, b.y), r: Math.max(a.x, b.x), b: Math.max(a.y, b.y) }; };
  window.__hubBox = box;
  for (const name of ['fillText', 'strokeText']) { const f = P[name]; P[name] = function (text, x, y, maxW) {
    const R = window.__hubRec;
    try {
      if (R.on && !this.__deco && this.canvas && this.canvas.id === 'game' && this.globalAlpha > 0.05 && String(text).trim()) {   // (__deco: scenery text, v9.11)
        const t = String(text), mm = mt.call(this, t), w = mm.width, al = this.textAlign;
        const L = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
        const bx = box(this, L, y - mm.actualBoundingBoxAscent, w, mm.actualBoundingBoxAscent + mm.actualBoundingBoxDescent);
        const m = this.getTransform(), px = parseFloat((/([\\d.]+)px/.exec(this.font) || [])[1] || '0');
        R.texts.push(Object.assign(bx, { text: t.slice(0, 60), css: px * Math.hypot(m.a, m.b) * (this.canvas.getBoundingClientRect().width / this.canvas.width) }));
      }
    } catch (e) {}
    return maxW === undefined ? f.call(this, text, x, y) : f.call(this, text, x, y, maxW);
  }; }
})();`;

// in the page, after the hub has settled: one recorded frame
const RECORD = () => {
  const R = window.__hubRec, g = ctx; R.texts = []; R.boxes = []; R.on = true;
  const _pn = panel, add = (kind, g2, x, y, w, h) => R.boxes.push(Object.assign(window.__hubBox(g2, x, y, w, h), { kind }));
  panel = function (g2, x, y, w, h) { if (g2 === g) add('panel', g2, x, y, w, h); return _pn.apply(this, arguments); };
  const _bb = drawBackButton; drawBackButton = function (g2) { const r = _bb.apply(this, arguments); if (g2 === g && backVisible()) add('back', g2, BackBtn.x, BackBtn.y, BackBtn.w, BackBtn.h); return r; };
  const _dc = drawHubCorner; drawHubCorner = function (g2) { if (g2 === g) add('corner', g2, W - 50, 8, 42, 34); return _dc.apply(this, arguments); };
  const _bd = drawHubBadges; drawHubBadges = function (g2) { const r = _bd.apply(this, arguments); if (g2 === g && HubL.badgePills) for (const p of HubL.badgePills) add('pill', g2, p.x, p.y, p.w, p.h); return r; };
  const _cs = typeof drawCalStrip === 'function' ? drawCalStrip : null;
  if (_cs) drawCalStrip = function (g2) { if (g2 === g) { const S = calStripGeom(g2); for (let i = 0; i < 4; i++) add('cal', g2, S.x + i * (S.w + S.gap), S.y, S.w, S.h); } return _cs.apply(this, arguments); };
  const _dh = drawHub; let tb = null, hubT = null;
  drawHub = function (g2) { if (g2 === g) { hubT = g2.getTransform(); tb = window.__hubBox(g2, 30, 0, (typeof calShown === 'function' && calShown() ? calStripGeom(g2).x : 932) - 30, 80); } return _dh.apply(this, arguments); };
  try { render(g); } finally { panel = _pn; drawBackButton = _bb; drawHubCorner = _dc; drawHubBadges = _bd; if (_cs) drawCalStrip = _cs; drawHub = _dh; R.on = false; }
  // the balance chips and the week goal are drawn with roundRect inside drawHub: their boxes come from the layout
  const lay = (kind, x, y, w, h) => { const a = hubT.transformPoint(new DOMPoint(x, y)), b = hubT.transformPoint(new DOMPoint(x + w, y + h)); R.boxes.push({ kind, l: Math.min(a.x, b.x), t: Math.min(a.y, b.y), r: Math.max(a.x, b.x), b: Math.max(a.y, b.y) }); };
  if (hubT) { lay('chip', 642, 84, 139, 34); lay('chip', 793, 84, 139, 34); if (HubL.goal) lay('goal', HubL.goal.x, HubL.goal.y, HubL.goal.w, HubL.goal.h); }
  return { texts: R.texts, boxes: R.boxes, title: tb, cw: g.canvas.width, ch: g.canvas.height, k: hubT ? Math.hypot(hubT.a, hubT.b) : 1 };
};

function check(rec, phone) {
  const bad = [], ov = (a, b, e = 1) => a.l < b.r - e && b.l < a.r - e && a.t < b.b - e && b.t < a.b - e;
  const inside = (a, b, e = 1.5) => a.l >= b.l - e && a.r <= b.r + e && a.t >= b.t - e && a.b <= b.b + e;
  const T = rec.texts.filter(t => t.r - t.l > 0.5), B = rec.boxes;
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) if (ov(T[i], T[j])) bad.push(`text-on-text: "${T[i].text}" / "${T[j].text}"`);
  const big = B.filter(b => b.kind !== 'pill' && b.kind !== 'goal');
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) if (ov(big[i], big[j])) bad.push(`panel-on-panel: ${big[i].kind} [${big[i].l | 0},${big[i].t | 0}] / ${big[j].kind} [${big[j].l | 0},${big[j].t | 0}]`);
  const gut = B.filter(b => b.kind === 'panel' || b.kind === 'chip'), G = 12 * rec.k - 0.5;   // 12 px gutters (960x540 units)
  for (let i = 0; i < gut.length; i++) for (let j = i + 1; j < gut.length; j++) {
    const a = gut[i], b = gut[j], dx = Math.max(b.l - a.r, a.l - b.r), dy = Math.max(b.t - a.b, a.t - b.b);
    if ((dx >= 0 && dx < G && dy < 0) || (dy >= 0 && dy < G && dx < 0)) bad.push(`gutter under 12: ${a.kind} / ${b.kind}`);
  }
  const pills = B.filter(b => b.kind === 'pill'), card = B.filter(b => b.kind === 'panel').sort((a, b) => a.l - b.l)[0];
  for (let i = 0; i < pills.length; i++) { if (card && !inside(pills[i], card)) bad.push('pill outside the card'); for (let j = i + 1; j < pills.length; j++) if (ov(pills[i], pills[j], 0)) bad.push('pills touch'); }
  const goal = B.find(b => b.kind === 'goal'); if (goal && !B.some(b => b.kind === 'panel' && inside(goal, b))) bad.push('the week goal is outside its panel');
  const cont = [...B, ...(rec.title ? [Object.assign({ kind: 'title' }, rec.title)] : [])];
  for (const t of T) {
    if (t.l < -2 || t.r > rec.cw + 2) bad.push(`off the canvas: "${t.text}"`);
    else if (!cont.some(b => inside(t, b))) bad.push(`outside: "${t.text}" [${t.l | 0}-${t.r | 0}, ${t.t | 0}-${t.b | 0}]`);
    if (phone && t.css && t.css < 11 - 0.05) bad.push(`small: "${t.text}" ${t.css.toFixed(1)} css px`);
  }
  return [...new Set(bad)];
}

export function hubTests({ newContext, open }) {
  const T = {};
  T['hub-layout'] = async ({ browser, base }) => {
    const detail = [], errs = []; let n = 0, fails = 0;
    for (const [sz, dev] of HUB_SIZES) {
      const ctx = await newContext(browser, { device: dev });
      await ctx.addInitScript(HUB_RECORD_INIT);
      const p = await open(ctx, base + '/', errs, 'hub-layout ' + sz);
      await p.evaluate(([a, b, touch]) => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} (0, eval)(a); (0, eval)(b); Input.touchMode = touch; window.requestAnimationFrame(() => {}); }, [CAL_HELPERS, HUB_HELPERS, !!dev.hasTouch]);
      for (const [name, o] of HUB_CASES) {
        await p.evaluate(o => window.__hubCase(o), o); await p.waitForTimeout(700);
        const rec = await p.evaluate(`(${RECORD.toString()})()`).catch(e => ({ err: String(e.message || e) }));
        n++;
        if (rec.err) { fails++; detail.push(`${sz} ${name}: ${rec.err}`); continue; }
        const bad = check(rec, !!dev.hasTouch);
        if (bad.length) { fails++; detail.push(`${sz} ${name}: ` + bad.slice(0, 6).join('; ')); }
      }
      await ctx.close();
    }
    detail.unshift(`${n} hub frames checked (${HUB_SIZES.length} sizes x ${HUB_CASES.length} cases), ${fails} with problems`);
    return { ok: !fails && !errs.length, detail: [...detail, ...errs] };
  };
  return T;
}
