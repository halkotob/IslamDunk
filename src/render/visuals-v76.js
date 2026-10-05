// ================================================= v7.6: VISUALS PASS (same palette, higher finish)
// UI: bevelled gold buttons and pills, glassy secondary buttons, framed panels with soft shadows.
// Type: Lilita One display face (loaded before the first frame when possible; system fallback).
// Logo: slowly turning khatam rosette behind the emblem, a light sweep across the wordmark, twinkles.
// Characters: a third, lit tone on limbs, torso and head (front-top rim light).
// Arena: soft vignette that pulls the eye to the play.
// Impact: dunk shockwave rings + flash, block rings, ball trail on shots and long passes, sprint
//   streaks, slightly longer hit-stop on dunks and blocks. Triggered from sounds/effects that online
//   play already replays, so the friend's screen gets them too. Reduced motion: no flashes or trails.
function goldPill(g, x, y, w, h, r, pressed, flat) {
  g.save();
  if (!flat) { g.shadowColor = 'rgba(0,0,0,0.42)'; g.shadowBlur = 8; g.shadowOffsetY = pressed ? 1 : 3; }
  const gr = g.createLinearGradient(0, y, 0, y + h);
  if (pressed) { gr.addColorStop(0, '#e2b44a'); gr.addColorStop(1, '#a8781a'); }
  else { gr.addColorStop(0, '#fff2bf'); gr.addColorStop(0.45, '#f2cf6b'); gr.addColorStop(1, '#c48d1e'); }
  g.fillStyle = gr; roundRect(g, x, y, w, h, r); g.fill();
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.strokeStyle = 'rgba(110,72,8,0.85)'; g.lineWidth = 1.2; g.stroke();
  if (!pressed) { const gh = h * 0.42; roundRect(g, x + 4, y + 2, w - 8, gh, Math.min(r, gh / 2)); g.fillStyle = 'rgba(255,255,255,0.26)'; g.fill(); }
  g.restore();
}
function glassPill(g, x, y, w, h, r, hov = 0) {
  g.save();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, `rgba(255,255,255,${0.15 + hov * 0.08})`); gr.addColorStop(1, `rgba(255,255,255,${0.04 + hov * 0.04})`);
  g.fillStyle = gr; roundRect(g, x, y, w, h, r); g.fill();
  g.strokeStyle = `rgba(242,207,107,${0.3 + hov * 0.35})`; g.lineWidth = 1; g.stroke();
  g.restore();
}
uiButton = function (g, x, y, w, h, label, fn, primary) {
  const hov = hovering(x, y, w, h), pr = pressing(x, y, w, h), a = tween('btn:' + Game.screen + x + ':' + y, hov ? 1 : 0, 16);
  g.save(); g.translate(x + w / 2, y + h / 2); const s = pr ? 0.96 : 1 + a * 0.03; g.scale(s, s);
  if (primary) goldPill(g, -w / 2, -h / 2, w, h, h / 2, pr); else glassPill(g, -w / 2, -h / 2, w, h, h / 2, a);
  g.font = `17px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (primary) { g.fillStyle = 'rgba(255,248,220,0.6)'; g.fillText(label, 0, 2); g.fillStyle = '#2a1a04'; }
  else { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText(label, 0, 2.5); g.fillStyle = '#fff'; }
  g.fillText(label, 0, 1); g.textBaseline = 'alphabetic';
  g.restore(); addRect(x, y, w, h, fn);
};
roundButton = function (g, cx, cy, r, glyph, fn) {
  const hov = hovering(cx - r, cy - r, r * 2, r * 2), pr = pressing(cx - r, cy - r, r * 2, r * 2), rr = r * (pr ? 0.94 : 1);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
  const gr = g.createLinearGradient(0, cy - rr, 0, cy + rr);
  if (hov || pr) { gr.addColorStop(0, '#fff2bf'); gr.addColorStop(0.5, '#f2cf6b'); gr.addColorStop(1, '#c48d1e'); }
  else { gr.addColorStop(0, 'rgba(30,44,62,0.95)'); gr.addColorStop(1, 'rgba(8,14,22,0.95)'); }
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.fillStyle = hov || pr ? '#2a1a04' : GOLD; g.font = `${Math.round(r * 1.3)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, cx, cy + 1); g.textBaseline = 'alphabetic';
  g.restore();
  addRect(cx - r - 6, cy - r - 6, r * 2 + 12, r * 2 + 12, fn);
};
panel = function (g, x, y, w, h, strong) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.38)'; g.shadowBlur = 16; g.shadowOffsetY = 5;
  const gr = g.createLinearGradient(0, y, 0, y + h);
  if (strong) { gr.addColorStop(0, 'rgba(18,58,60,0.96)'); gr.addColorStop(1, 'rgba(8,30,34,0.96)'); }
  else { gr.addColorStop(0, 'rgba(16,28,42,0.86)'); gr.addColorStop(1, 'rgba(6,12,20,0.86)'); }
  g.fillStyle = gr; roundRect(g, x, y, w, h, 12); g.fill();
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.strokeStyle = strong ? GOLD : 'rgba(255,255,255,0.13)'; g.lineWidth = strong ? 2 : 1; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 14, y + 1.5); g.lineTo(x + w - 14, y + 1.5); g.stroke();   // top light
  if (strong) {
    g.strokeStyle = 'rgba(242,207,107,0.22)'; roundRect(g, x + 4.5, y + 4.5, w - 9, h - 9, 9); g.stroke();
    g.fillStyle = GOLD; for (const [cx, cy] of [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]]) { star8(g, cx, cy, 3.6); g.fill(); }
  }
  g.restore();
};
// ---- logo: rosette, light sweep, twinkles
{
  const _lm = drawLogoMark;
  drawLogoMark = function (g, cx, top, s = 1, opts = {}) {
    const r = 30 * s, ey = top + r * 1.45, t = Game.t || 0, rm = REDUCED_MOTION ? 0 : 1;
    g.save(); g.lineJoin = 'round';
    star8(g, cx, ey, r * 1.95, 1, 1, t * 0.1 * rm); g.fillStyle = 'rgba(242,207,107,0.07)'; g.fill();
    g.strokeStyle = 'rgba(242,207,107,0.16)'; g.lineWidth = 1.2 * s; g.stroke();
    g.restore();
    const bottom = _lm(g, cx, top, s, opts);
    // light sweep: a moving gradient painted only where the letters are
    const wy = ey + r * 1.55 + 58 * s, fs = Math.round(70 * s), txt = 'ISLAM DUNK';
    g.save(); g.font = `${fs}px ${FONT}`; g.textAlign = 'center'; if (g.letterSpacing !== undefined) g.letterSpacing = `${Math.round(2 * s)}px`;
    const tw = g.measureText(txt).width, ph = ((t * 0.25) % 1.6) - 0.3, sx = cx - tw / 2 + ph * tw;
    if (rm && ph > -0.2 && ph < 1.2) {
      const sg = g.createLinearGradient(sx - 60 * s, wy - fs, sx + 60 * s, wy);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,240,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg; g.fillText(txt, cx, wy);
    }
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    // twinkles
    for (const [k, ox, oy] of [[0, -0.47, -0.78], [1.7, 0.5, -0.9], [3.1, 0.36, 0.05]]) {
      const a = rm ? Math.max(0, Math.sin(t * 1.6 + k)) : 0.6; if (a < 0.05) continue;
      const x = cx + ox * tw, y = wy + oy * fs, z = (3 + 5 * a) * s;
      g.globalAlpha = a; g.fillStyle = '#fffbe6';
      g.beginPath(); g.moveTo(x, y - z); g.quadraticCurveTo(x, y, x + z, y); g.quadraticCurveTo(x, y, x, y + z); g.quadraticCurveTo(x, y, x - z, y); g.quadraticCurveTo(x, y, x, y - z); g.fill();
    }
    g.restore();
    return bottom;
  };
}
// ---- characters: a lit third tone (front-top rim light)
let _hlOff = false;
const _liteC = new Map();
function lite(c) {
  let v = _liteC.get(c); if (v) return v;
  let r, gg, b;
  if (c[0] === '#') { const n = parseInt(c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1, 7), 16); r = n >> 16; gg = (n >> 8) & 255; b = n & 255; }
  else { const m = c.match(/\d+/g); if (!m) return c; [r, gg, b] = m.map(Number); }
  const k = 0.34; v = `rgb(${Math.round(r + (255 - r) * k)},${Math.round(gg + (255 - gg) * k)},${Math.round(b + (255 - b) * k)})`;
  if (_liteC.size > 400) _liteC.clear(); _liteC.set(c, v); return v;
}
{
  const _dp = drawPlayer;
  drawPlayer = function (g, p) { _hlOff = !!p._refl; try { return _dp(g, p); } finally { _hlOff = false; } };
  drawGroup = function (g, segs, f) {
    for (const s of segs) {               // thin outlines
      if (s.t === 'l') { segPath(g, s); g.strokeStyle = OUTLINE; g.lineWidth = s.w + 3; g.stroke(); }
      else if (s.t === 'c') { g.beginPath(); g.arc(s.x, s.y, s.r + 1.5, 0, Math.PI * 2); g.fillStyle = OUTLINE; g.fill(); }
      else if (s.t === 'e' || s.t === 's') { g.beginPath(); g.ellipse(s.x, s.y, s.rx + 1.5, s.ry + 1.5, 0, 0, Math.PI * 2); g.fillStyle = OUTLINE; g.fill(); }
      else { segPath(g, s); g.strokeStyle = OUTLINE; g.lineWidth = 3; g.stroke(); }
    }
    for (const s of segs) {               // base fills + cel shade + rim light
      if (s.t === 'l') {
        segPath(g, s); g.strokeStyle = s.c; g.lineWidth = s.w; g.stroke();
        if (s.sh) { g.save(); g.translate(-f * s.w * 0.2, s.w * 0.12); segPath(g, s); g.strokeStyle = s.sh; g.lineWidth = s.w * 0.45; g.stroke(); g.restore(); }
        if (!_hlOff && s.w >= 6) { g.save(); g.globalAlpha = 0.5; g.translate(f * s.w * 0.2, -s.w * 0.16); segPath(g, s); g.strokeStyle = lite(s.c); g.lineWidth = s.w * 0.24; g.stroke(); g.restore(); }
      } else if (s.t === 's') {
        segPath(g, s); g.fillStyle = s.c; g.fill();
        g.save(); segPath(g, s); g.clip(); g.fillStyle = '#f7f7f2'; g.fillRect(s.x - s.rx - 1, s.y + s.ry * 0.25, s.rx * 2 + 2, s.ry);
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(s.x + f * s.rx * 0.15 - 2, s.y - s.ry * 0.55, 4, 1.4); g.restore();
      } else {
        segPath(g, s); g.fillStyle = s.c; g.fill();
        if (s.sh) { g.save(); segPath(g, s); g.clip(); g.fillStyle = s.sh; g.fill(); g.translate(f * (s.lx || 4), -(s.ly || 2.5)); segPath(g, s); g.fillStyle = s.c; g.fill(); g.restore(); }
        if (!_hlOff && s.t === 'p') { g.save(); segPath(g, s); g.clip(); g.translate(-f * 1.7, 1.7); segPath(g, s); g.globalAlpha = 0.55; g.strokeStyle = lite(s.c); g.lineWidth = 2.4; g.stroke(); g.restore(); }
      }
    }
  };
}
// ---- impact: rings, flash, trails, streaks
const Impact = { rings: [], flash: 0, flashCol: '#fff6dc', trail: [], last: 0 };
function impactRing(x, z, col, r0, r1, dur, lw = 3, delay = 0) { Impact.rings.push({ x, z, col, r0, r1, dur, lw, t: -delay }); if (Impact.rings.length > 12) Impact.rings.shift(); }
function impactFlash(a, col = '#fff6dc') { if (REDUCED_MOTION) return; Impact.flash = Math.max(Impact.flash, a); Impact.flashCol = col; }
{
  const _slam = SFX.slam;
  SFX.slam = function () {
    const r = _slam.apply(this, arguments);
    try {
      const h = hoops.reduce((a, b) => (Math.abs(b.x - ball.x) < Math.abs(a.x - ball.x) ? b : a)), rx = h.x + h.dir * 40, rz = h.z;   // under the rim
      impactRing(rx, rz, '#ffd76a', 14, 165, 0.45, 5); impactRing(rx, rz, '#ffffff', 10, 115, 0.38, 2.6, 0.06);
      impactFlash(0.2); FX.hitstop(1);
    } catch (e) {}
    return r;
  };
  const _cue = FX.cue;
  FX.cue = function (type, x, y, z, major) {
    const r = _cue.apply(this, arguments);
    if (type === 'block') { impactRing(x, z, '#8fe3ff', 10, major ? 120 : 85, 0.32, 3); impactFlash(major ? 0.14 : 0.07, '#e8f7ff'); FX.hitstop(1); }
    return r;
  };
  const _drf = drawReflections;
  drawReflections = function (g, actors) {
    _drf(g, actors);
    const dt = Math.min(0.05, Game.rdt || STEP);
    // rings on the floor
    for (const R of Impact.rings) {
      R.t += dt; if (R.t < 0) continue;
      const k = clamp(R.t / R.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      floorRing(g, R.x, R.z, lerp(R.r0, R.r1, e), R.col, (1 - k) * 0.9, R.lw * (1 - k * 0.6));
    }
    Impact.rings = Impact.rings.filter(R => R.t < R.dur);
    if (REDUCED_MOTION || !actors.length) return;
    // sprint streaks behind fast runners
    for (const p of actors) {
      const sp = Math.hypot(p.vx || 0, p.vz || 0);
      if (!(p.cmd && p.cmd.turbo) || sp < 175 || p.y > 8 || p.state !== 'free') continue;
      const ux = -(p.vx || 0) / sp, uz = -(p.vz || 0) / sp, a = clamp((sp - 175) / 120, 0.25, 0.6);
      g.save(); g.strokeStyle = 'rgba(255,255,255,1)'; g.lineCap = 'round';
      for (const [hy, off, len] of [[42, 0, 46], [72, 6, 36], [96, -5, 28]]) {
        const [x0, y0] = P(p.x + ux * 22, hy, p.z + uz * 22 + off * 0.3), [x1, y1] = P(p.x + ux * (22 + len), hy, p.z + uz * (22 + len) + off * 0.3);
        g.globalAlpha = a * (0.6 + 0.4 * Math.random()); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
      g.restore();
    }
    // ball trail (shots and fast passes)
    const fast = ball.state === 'shot' || (ball.state === 'pass' && Math.hypot(ball.vx || 0, ball.vz || 0) > 300);
    const now = Game.t || 0;
    if (fast) Impact.trail.push({ x: ball.x, y: ball.y, z: ball.z, t: now }); else if (Impact.trail.length) Impact.trail.length = 0;
    while (Impact.trail.length && now - Impact.trail[0].t > 0.14) Impact.trail.shift();
    const n = Impact.trail.length;
    for (let i = 0; i < n - 1; i++) {
      const q = Impact.trail[i], k = (i + 1) / n, [sx, sy] = P(q.x, q.y, q.z), rr = BALL_R * depthK(q.z) * (0.45 + 0.5 * k);
      g.globalAlpha = 0.28 * k; g.fillStyle = ball.fire ? '#ff8a2a' : '#ffb65c'; g.beginPath(); g.arc(sx, sy, rr, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  };
}
// ---- vignette + flash (screen space, under the HUD)
{
  let vig = null, vigKey = '';
  const vignette = (cw, ch) => {
    const key = cw + 'x' + ch; if (vig && vigKey === key) return vig;
    vigKey = key; vig = makeCanvas(256, 144); const v = vig.getContext('2d');
    const gr = v.createRadialGradient(128, 80, 40, 128, 76, 150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.62, 'rgba(0,0,0,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
    v.fillStyle = gr; v.fillRect(0, 0, 256, 144); return vig;
  };
  const _dsc = drawScene;
  drawScene = function (g, t) {
    _dsc(g, t);
    const cv = g.canvas; if (!cv) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(vignette(cv.width, cv.height), 0, 0, cv.width, cv.height);
    if (Impact.flash > 0.005) { g.globalAlpha = Impact.flash; g.fillStyle = Impact.flashCol; g.fillRect(0, 0, cv.width, cv.height); Impact.flash *= Math.exp(-(Game.rdt || STEP) / 0.06); }
    g.restore();
  };
}
// ---- fonts: fetch the display face in the background (never blocks the page; offline = system font).
//      The first frame waits for it at most 1.2 s; if it lands later, cached text is rebuilt.
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap';
function loadDisplayFont() {
  if (typeof FontFace === 'undefined' || typeof fetch === 'undefined') return Promise.resolve();
  return fetch(FONT_CSS).then(r => r.text()).then(css => {
    const blocks = css.split('/*'), latin = blocks.find(b => /^\s*latin \*\//.test(b)) || blocks[blocks.length - 1] || '';
    const m = latin.match(/url\((https:[^)]+)\)/); if (!m) return;
    return new FontFace('Lilita One', `url(${m[1]})`).load().then(f => { document.fonts.add(f); _txt.clear(); });
  }).catch(() => {});
}
{
  const _b = boot;
  boot = function () {
    let started = false; const go = () => { if (started) return; started = true; _b(); };
    Promise.race([loadDisplayFont(), new Promise(r => setTimeout(r, 1200))]).then(go, go);
  };
}
