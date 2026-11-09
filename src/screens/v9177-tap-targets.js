// v9.17.7 (X1): bigger tap areas on phones, with nothing drawn differently.
// On touch, each menu control (Game.rects) is tapped as if it were at least TAP_MIN CSS px on each side, grown around
// its centre. Where grown areas meet, the tap goes to the control whose drawn rectangle is nearest, so the gap between
// two neighbours is split down the middle and a tap never lands on two things. A tap inside a drawn rectangle works as
// before (the one drawn last), except where two overlap: a control drawn inside another wins, and two the same size
// split the overlap by the nearer centre. A full-screen "tap anywhere" area takes the taps that land on no control,
// even when it's drawn after them (How to play's "Play the Tutorial" couldn't be tapped on a phone: the page's
// tap-anywhere-to-go-back area was drawn over it).
// Not during play: the joystick, the action buttons and the in-match taps stay exactly as they were.
const TAP_MIN = 44;
const tapBig = r => r.w * r.h >= W * H * 0.4;
const tapIn = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const tapInside = (p, q) => p.x >= q.x - 1 && p.y >= q.y - 1 && p.x + p.w <= q.x + q.w + 1 && p.y + p.h <= q.y + q.h + 1;   // p inside q
const tapCd = (r, x, y) => Math.hypot(x - r.x - r.w / 2, y - r.y - r.h / 2);
function tapGrowOn() {
  if (Input.lastDev !== 'touch') return false;
  const inPlay = (Game.screen === 'play' || Game.screen === 'netplay' || Game.screen === 'gym') && !Game.paused && !Game.trivia;
  return !inPlay;
}
// the control a tap at (x, y) acts on, in game coordinates (null: none)
function tapWho(x, y, rects) {
  const R = rects || Game.rects || [];
  let big = -1;                                                  // the last full-screen area under the tap
  for (let i = R.length - 1; i >= 0; i--) if (tapBig(R[i]) && tapIn(R[i], x, y)) { big = i; break; }
  const top = tapGrowOn() ? -1 : big;                             // (on touch a control beats a "tap anywhere" area drawn after it)
  const C = []; for (let i = top + 1; i < R.length; i++) { const r = R[i]; if (r.w > 2 && r.h > 2 && !tapBig(r) && tapIn(r, x, y)) C.push(r); }
  if (C.length) {
    let p = C[C.length - 1];                                       // the one drawn last, as before
    if (tapGrowOn()) for (const c of C) {
      if (c === p) continue;
      if (tapInside(c, p) && !tapInside(p, c)) p = c;               // a control inside another one drawn over it
      else if (!tapInside(p, c) && Math.abs(c.w * c.h - p.w * p.h) <= 0.1 * p.w * p.h && tapCd(c, x, y) < tapCd(p, x, y)) p = c;   // two the same size that overlap: the nearer centre
    }
    return p;
  }
  if (!tapGrowOn()) return big >= 0 ? R[big] : null;
  const cr = canvas.getBoundingClientRect(), m = TAP_MIN * W / (cr.width || W);   // TAP_MIN CSS px in game px
  let best = null, bd = Infinity;
  for (let i = R.length - 1; i > top; i--) {
    const r = R[i]; if (r.w <= 2 || r.h <= 2 || tapBig(r)) continue;
    const gw = Math.max(0, (m - r.w) / 2), gh = Math.max(0, (m - r.h) / 2);
    if (x < r.x - gw || x > r.x + r.w + gw || y < r.y - gh || y > r.y + r.h + gh) continue;
    const dx = Math.max(r.x - x, 0, x - r.x - r.w), dy = Math.max(r.y - y, 0, y - r.y - r.h), d = Math.hypot(dx, dy);
    if (d < bd - 1e-6) { bd = d; best = r; }                       // (a tie keeps the one drawn last)
  }
  return best || (big >= 0 ? R[big] : null);
}
// what the screens' own check picks: the last drawn rectangle under the point
function tapTop(x, y) { const R = Game.rects || []; for (let i = R.length - 1; i >= 0; i--) if (tapIn(R[i], x, y)) return R[i]; return null; }
{
  // the tap is moved onto the control it's for, so every screen's own tap check (flow.js, the confirm box, the daily
  // scenario) takes it as before
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const t = Input.taps[0];
    if (t && tapGrowOn()) {
      const r = tapWho(t.x, t.y);
      if (r && tapTop(t.x, t.y) !== r) {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        if (tapTop(cx, cy) === r) { t.x = cx; t.y = cy; }
        else { Input.taps.shift(); if (SFX.blip) SFX.blip(); r.fn(); }   // (one drawn under another: no point reaches it, so it's called here)
      }
    }
    return _gu.apply(this, arguments);
  };
}
