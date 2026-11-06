// ================================================= v9.17: DESIGN PASS, BATCH C: MOTION (docs/IMPROVEMENTS.md VD3, VD4, UI1)
//   VD3 the opening logo: within the same 1.7 s, the dunker rises in and lands softly, the emblem pulses once as he
//       lands, and a gold glint sweeps across ISLAM DUNK. Reduced motion: the plain fade, as before. A tap still skips.
//   VD4 the results screen: the final score counts up and the Player of the Game panel slides in, under a second in
//       all; a tap or a key finishes it at once, and Continue works from the first frame.
//   UI1 menus: a 0.15 s rise from dark when the screen changes between menus. Never in a match (play, the gym, the
//       neighbourhood, halftime), and none with Reduced motion.
const easeOutBack = u => { const c = 1.6; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const easeOutCubic = u => 1 - Math.pow(1 - u, 3);

// ---- VD3: the opening logo
const SPLASH_SPLIT = 212;                                 // between the emblem (above) and the wordmark (below), at top 120, scale 1
let splashWord = null;                                    // the wordmark, drawn once into its own canvas for the glint
function splashWordCanvas() {
  if (splashWord && splashWord.w === W) return splashWord.c;
  const c = document.createElement('canvas'); c.width = (W + 800) * 2; c.height = H * 2; const g = c.getContext('2d');
  g.scale(2, 2); g.translate(400, 0); g.beginPath(); g.rect(-400, SPLASH_SPLIT, W + 800, H); g.clip(); drawLogoMark(g, W / 2, 120, 1.0, {});
  splashWord = { w: W, c }; return c;
}
{
  const _ds = drawSplash;
  drawSplash = function (g) {
    if (REDUCED_MOTION || typeof document === 'undefined') return _ds.apply(this, arguments);
    const t = Game.splashT || 0, a = clamp(Math.min(t / 0.25, (1.7 - t) / 0.35), 0, 1);
    g.fillStyle = '#060b14'; g.fillRect(-400, 0, W + 800, H);
    g.save(); g.globalAlpha = a;
    // the emblem: rises 46 px with a soft overshoot, lands at 0.55 s, a single pulse as he lands
    const u = clamp(t / 0.55, 0, 1), rise = (1 - easeOutBack(u)) * 46, pu = clamp((t - 0.5) / 0.3, 0, 1), pulse = 1 + Math.sin(pu * Math.PI) * 0.07;
    g.save(); g.beginPath(); g.rect(-400, -50, W + 800, SPLASH_SPLIT + 50); g.clip();
    const ey = 120 + 30 * 1.6; g.translate(W / 2, ey + rise); g.scale(pulse, pulse); g.translate(-W / 2, -ey);
    g.globalAlpha = a * clamp(t / 0.3, 0, 1); drawLogoMark(g, W / 2, 120, 1.0, {}); g.restore();
    // the wordmark, with a glint sweeping across it from 0.6 s to 1.15 s
    g.save(); g.beginPath(); g.rect(-400, SPLASH_SPLIT, W + 800, H); g.clip(); drawLogoMark(g, W / 2, 120, 1.0, {}); g.restore();
    const gu = (t - 0.6) / 0.55;
    if (gu > 0 && gu < 1) {
      const src = splashWordCanvas(), tmp = document.createElement('canvas'); tmp.width = src.width; tmp.height = src.height; const tg = tmp.getContext('2d');
      tg.drawImage(src, 0, 0); tg.globalCompositeOperation = 'source-atop';
      const gx = (W / 2 - 260 + gu * 520 + 400) * 2, band = tg.createLinearGradient(gx - 70, 0, gx + 70, 0);
      band.addColorStop(0, 'rgba(255,250,225,0)'); band.addColorStop(0.5, 'rgba(255,250,225,0.85)'); band.addColorStop(1, 'rgba(255,250,225,0)');
      tg.fillStyle = band; tg.save(); tg.translate(gx, H); tg.transform(1, 0, -0.35, 1, 0, 0); tg.translate(-gx, -H); tg.fillRect(gx - 70, 0, 140, tmp.height); tg.restore();
      g.drawImage(tmp, -400, 0, W + 800, H);
    }
    g.textAlign = 'center'; g.fillStyle = 'rgba(246,236,210,0.7)'; g.font = `11px ${FONT}`;
    if (g.letterSpacing !== undefined) g.letterSpacing = '3px';
    g.globalAlpha = a * clamp((t - 0.7) / 0.3, 0, 1); g.fillText('A ' + STUDIO.short + ' PRODUCTION', W / 2, 420);
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    g.restore();
  };
}

// ---- VD4: the results screen
const RESULTS_ANIM = 0.85;
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    if (Game.screen === 'final') {
      const before = Game.finalT || 0;
      Game.finalT = before + rdt;
      if (before < RESULTS_ANIM && (Input.pressed.Space || Input.pressed.Enter || (Input.taps && Input.taps.length))) Game.finalT = RESULTS_ANIM;   // a tap finishes it
    } else Game.finalT = 0;
    return _gu.apply(this, arguments);
  };
  const _df = drawFinalScreen;
  drawFinalScreen = function (g) {
    const k = clamp((Game.finalT || 0) / RESULTS_ANIM, 0, 1);
    if (REDUCED_MOTION || k >= 1 || !M.teams || M.scenario) return _df.apply(this, arguments);
    const sc = [M.teams[0].score, M.teams[1].score], c = easeOutCubic(clamp(k / 0.8, 0, 1));
    M.teams[0].score = Math.round(sc[0] * c); M.teams[1].score = Math.round(sc[1] * c);        // (drawn only: put back below)
    try {
      const slide = (1 - easeOutCubic(clamp((k - 0.15) / 0.6, 0, 1))) * 120, PG = [-400, 135, 762, 290];   // the Player of the Game panel's band
      g.save(); g.beginPath(); g.rect(-400, 0, W + 800, H); g.rect(PG[0], PG[1], PG[2], PG[3]); g.clip('evenodd'); _df.apply(this, arguments); g.restore();
      g.save(); g.beginPath(); g.rect(PG[0], PG[1], PG[2], PG[3]); g.clip(); g.translate(-slide, 0); g.globalAlpha = clamp((k - 0.1) / 0.4, 0, 1); _df.apply(this, arguments); g.restore();
    } finally { M.teams[0].score = sc[0]; M.teams[1].score = sc[1]; }
  };
}

// ---- UI1: a quick rise from dark between menus
const SCREEN_FADE = 0.15, NO_FADE = new Set(['play', 'netplay', 'gym', 'world', 'halftime', 'splash']);
{
  let last = null, at = -1;
  const _r = render;
  render = function (g) {
    const r = _r.apply(this, arguments);
    const s = Game.screen, now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    if (s !== last) { if (last && !NO_FADE.has(last) && !NO_FADE.has(s) && !REDUCED_MOTION) at = now; last = s; }
    const k = at >= 0 ? (now - at) / SCREEN_FADE : 1;
    if (k < 1) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 - easeOutCubic(clamp(k, 0, 1)); g.fillStyle = '#060b14'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); }
    else at = -1;
    return r;
  };
}
