// The art-slice compare page (docs/review/look-compare.html, made by npm run review:looks). It runs inside the real
// game page (the whole web build is in the file), so every frame is drawn by the shipping code: the Review Studio
// agents (src/review-studio/agent*.game.js) record the animations on the game's own simulation, and LOOK.force
// picks the look for each panel. Item ids match the Review Studio's (anim/<state>/<variant>, sprite/venue/classic).
(() => {
  const LOOKS = ['', 'a', 'b', 'c'];
  const ANIMS = ['idle/default', 'walk/default', 'run/default', 'sprint/default', 'dribble/classic', 'dribble/stride', 'shoot/jumper', 'shoot/layup',
    'dunk/twohand', 'dunk/tomahawk-classic', 'dunk/tomahawk-float', 'pass/chest', 'steal/default', 'block/default', 'ankles/default', 'celebrate/default', 'taunt/sky', 'fall/default'];
  const NW = 520, NH = 380;
  const $ = s => document.querySelector(s);
  const el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (n.startsWith('on')) e.addEventListener(n.slice(2), v); else if (v != null) e.setAttribute(n, v); } for (const c of k.flat()) if (c != null) e.append(c); return e; };
  const S = { anim: ANIMS[4], playing: true, speed: 1, zoom: 4, bg: 'dark', flip: false, info: null };
  let RS = null;

  function boot() {
    if (typeof Game === 'undefined' || Game.screen === undefined || typeof Net === 'undefined' || Net.avail === 'checking' || !window.__RS || !window.__RS.animStart) { setTimeout(boot, 60); return; }
    RS = window.__RS; RS.freeze(true); SETTINGS.sound = false;
    for (const n of [...document.body.children]) if (n.id !== 'lc' && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') n.style.display = 'none';
    build(); window.__lc.ready = true;
  }
  // ------------------------------------------------------------------ drawing helpers
  function start() { S.info = RS.animStart(S.anim, { flip: S.flip, who: 'cast/you' }); const me = RS.animMe(); if (me) me.lookHero = true; }
  function step() { S.info = RS.animStep(); if (S.info.f >= S.info.n) start(); }
  // zoom 0: the whole scene; zoom 2/4/8: a close-up centred on the player at 1x/2x/4x (a panel is 520 game px wide at 1x)
  function drawLook(look, g, w, h, bg, zoom = S.zoom) {
    LOOK.force = look;
    try {
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = bg === 'light' ? '#e9e6df' : '#14171d'; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      const cw = g.canvas.width, ch = g.canvas.height;
      if (!zoom) g.scale(cw / w, ch / h);
      else { const f = RS.animFocus(w, h), z = zoom * (cw / w) / 2; g.translate(cw / 2 - f.x * z, ch * 0.52 - f.mid * z); g.scale(z, z); }
      Game.rdt = STEP; RS.animDraw(g, w, h);
    } finally { LOOK.force = null; }
  }
  // the whole court, in a look, with the hero and three others on it
  function drawCourt(look, g, cw, ch) {
    const rw = W, cx = cam.x, cz = cam.zoom, fx = FX.sx, fy = FX.sy;
    { newMatch(TEAMS[0], TEAMS[1], { humans: [] }); for (let i = 0; i < 300 && M.phase !== 'live'; i++) updateMatch(STEP);
      const [a, b, c, d] = M.players; place(a, 520, 330); place(b, 380, 470); place(c, 720, 260); place(d, 860, 420); a.lookHero = true; giveBall(a, 'inbound'); for (const q of M.players) { q.state = 'free'; for (let i = 0; i < 30; i++) animate(q, STEP); } }
    LOOK.force = look; W = 1440; cam.x = 660 - W / 2; cam.zoom = 1; FX.sx = FX.sy = 0;
    try { g.setTransform(cw / 1440, 0, 0, ch / H, 0, 0); g.clearRect(0, 0, 1440, H); drawScene(g, 0); }
    finally { W = rw; cam.x = cx; cam.zoom = cz; FX.sx = fx; FX.sy = fy; LOOK.force = null; }
  }
  // an in-match frame (scene + HUD) at the phone-audit size, 750x342
  function drawMatch(look, g) {
    const rw = W, tm = Input.touchMode;
    { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); for (let i = 0; i < 300 && M.phase !== 'live'; i++) updateMatch(STEP); M.introT = 0; Game.screen = 'play'; Game.paused = false;
      const me = M.players[0]; place(me, 560, 300); giveBall(me, 'inbound'); M.teams[0].score = 12; M.teams[1].score = 9; for (const q of M.players) { q.state = 'free'; for (let i = 0; i < 30; i++) animate(q, STEP); } }
    LOOK.force = look; W = Math.round(H * 750 / 342); Input.touchMode = true;
    try { g.setTransform(g.canvas.width / W, 0, 0, g.canvas.height / H, 0, 0); g.clearRect(0, 0, W, H); updateCamera && updateCamera(0); render(g); }
    catch (e) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#300'; g.fillRect(0, 0, 750, 342); console.error(e); }
    finally { W = rw; Input.touchMode = tm; LOOK.force = null; }
  }
  // ------------------------------------------------------------------ the page
  function build() {
    const root = $('#lc');
    const sel = el('select', { onchange: e => { S.anim = e.target.value; start(); draw(); } }, ...ANIMS.map(a => el('option', { value: a }, 'anim/' + a)));
    sel.value = S.anim;
    const btn = (t, f, title) => el('button', { onclick: f, title: title || t }, t);
    const play = btn('❚❚ Pause', () => { S.playing = !S.playing; play.textContent = S.playing ? '❚❚ Pause' : '▶ Play'; });
    const seg = (key, opts) => el('span', { class: 'seg' }, ...opts.map(([v, t]) => { const b = btn(t, () => { S[key] = v; refresh(); if (key === 'flip') { start(); } draw(); }); b.dataset.k = key; b.dataset.v = String(v); return b; }));
    const refresh = () => { for (const b of document.querySelectorAll('.seg button')) b.classList.toggle('on', String(S[b.dataset.k]) === b.dataset.v); sizeCanvases(); };
    root.append(
      el('header', {}, el('h1', {}, 'Islam Dunk: art slice'), el('p', {}, 'One character (the default player, in a team kit) and one court (the Masjid League Arena) in the current look and three candidates. Everything is drawn by the game’s own code. Pick one; the current look stays the default until then.')),
      el('div', { class: 'bar' }, el('label', {}, 'Animation ', sel), play, seg('speed', [[1, '1x'], [0.5, '0.5x'], [0.25, '0.25x']]),
        btn('◀ Frame', () => { S.playing = false; play.textContent = '▶ Play'; const n = Math.max(0, S.info.f - 1); start(); for (let i = 0; i < n; i++) S.info = RS.animStep(); draw(); }),
        btn('Frame ▶', () => { S.playing = false; play.textContent = '▶ Play'; step(); draw(); }),
        seg('zoom', [[0, 'Whole scene'], [2, '1x'], [4, '2x'], [8, 'Zoom 4x']]), seg('bg', [['dark', 'Dark'], ['light', 'Light']]), seg('flip', [[false, 'Facing right'], [true, 'Facing left']]),
        el('span', { id: 'frame' })),
      el('div', { class: 'grid', id: 'anims' }, ...LOOKS.map(k => el('figure', {}, el('canvas', { id: 'cv-' + (k || 'cur'), width: NW * 2, height: NH * 2 }), el('figcaption', {}, LOOK.names[k])))),
      el('p', { class: 'note' }, 'The rig is drawn in profile only, so “front and side” is facing right and facing left. Item ids match the Review Studio: the animation is shown above, the court is sprite/venue/classic.'),
      el('h2', {}, 'The court (sprite/venue/classic)'),
      el('div', { class: 'grid one' }, ...LOOKS.map(k => el('figure', {}, el('canvas', { id: 'court-' + (k || 'cur'), width: 1440, height: 540 }), el('figcaption', {}, LOOK.names[k])))),
      el('h2', {}, 'In a match, at the phone-audit size (750×342)'),
      el('div', { class: 'grid' }, ...LOOKS.map(k => el('figure', {}, el('canvas', { id: 'match-' + (k || 'cur'), width: 1500, height: 684 }), el('figcaption', {}, LOOK.names[k])))));
    refresh(); start();
    for (const k of LOOKS) { drawCourt(k, $('#court-' + (k || 'cur')).getContext('2d'), 1440, 540); }
    for (const k of LOOKS) { drawMatch(k, $('#match-' + (k || 'cur')).getContext('2d')); }
    start(); draw(); loop();
  }
  function sizeCanvases() {
    for (const k of LOOKS) { const c = $('#cv-' + (k || 'cur')); if (!c) continue; c.style.width = '100%'; c.style.height = 'auto'; }   // the zoom is applied in the drawing, so the panels always fit
  }
  function draw() {
    for (const k of LOOKS) { const c = $('#cv-' + (k || 'cur')); drawLook(k, c.getContext('2d'), NW, NH, S.bg); }
    const i = S.info; $('#frame').textContent = i ? `frame ${i.f} / ${i.n} · ${i.state}` : '';
  }
  function loop() {
    let last = performance.now(), acc = 0;
    const tick = now => { if (S.playing) { acc += Math.min(0.1, (now - last) / 1000) * 60 * S.speed; let n = 0; while (acc >= 1 && n < 4) { step(); acc -= 1; n++; } if (n) draw(); } last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  // ------------------------------------------------------------------ for the contact sheets, GIFs and tests
  window.__lc = {
    LOOKS, ANIMS,
    // one look: every animation at a key frame (the middle of the move), the court and the match, in one PNG
    sheet(look) {
      const cols = 6, rows = Math.ceil(ANIMS.length / cols), cw = 300, chh = 300, pad = 8, head = 40;
      const c = document.createElement('canvas'); c.width = cols * (cw + pad) + pad; c.height = head + rows * (chh + 26) + 10 + Math.ceil((c.width - pad * 2) * 540 / 1440) + 10 + Math.ceil(342 * 0.55) + pad; const g = c.getContext('2d');
      g.fillStyle = '#101317'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#f2cf6b'; g.font = '22px sans-serif'; g.fillText('Islam Dunk art slice: ' + LOOK.names[look], pad, 28);
      const t = document.createElement('canvas'); t.width = 520; t.height = 520;
      ANIMS.forEach((a, i) => {
        S.anim = a; start(); const n = Math.round(S.info.n * (/dunk|shoot|block|steal|pass/.test(a) ? 0.42 : /fall/.test(a) ? 0.25 : /taunt|celebrate/.test(a) ? 0.5 : 0.35));
        for (let k = 0; k < n; k++) S.info = RS.animStep();
        drawLook(look, t.getContext('2d'), NW, NH, 'dark', 5.5);
        const x = pad + (i % cols) * (cw + pad), y = head + Math.floor(i / cols) * (chh + 26);
        g.drawImage(t, x, y, cw, chh); g.fillStyle = '#cfd8e3'; g.font = '13px sans-serif'; g.fillText('anim/' + a, x, y + chh + 16);
      });
      start(); const y0 = head + rows * (chh + 26) + 10, ct = document.createElement('canvas'); ct.width = 1440; ct.height = 540; drawCourt(look, ct.getContext('2d'), 1440, 540);
      g.drawImage(ct, pad, y0, c.width - pad * 2, (c.width - pad * 2) * 540 / 1440);
      const mt = document.createElement('canvas'); mt.width = 750; mt.height = 342; drawMatch(look, mt.getContext('2d'));
      const yh = y0 + (c.width - pad * 2) * 540 / 1440 + 10; g.drawImage(mt, pad, yh, 750 * 0.55, 342 * 0.55);
      g.fillStyle = '#cfd8e3'; g.fillText('sprite/venue/classic (whole court) and a match frame at 750×342', pad + 750 * 0.55 + 12, yh + 20);
      S.anim = ANIMS[4]; start(); draw();
      return c.toDataURL('image/png');
    },
    // the GIF sequence: run → dribble → shoot → tomahawk → celebrate (every second frame)
    gifFrames(look, every = 2, scale = 0.6) {
      const seq = ['run/default', 'dribble/classic', 'shoot/jumper', 'dunk/tomahawk-classic', 'celebrate/default'], out = [], t = document.createElement('canvas'); t.width = 320; t.height = 320;
      for (const a of seq) { S.anim = a; start(); for (let k = 0; k < S.info.n; k++) { S.info = RS.animStep(); if (k % every) continue; drawLook(look, t.getContext('2d'), NW, NH, 'dark', 5.2); const g = t.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#f2cf6b'; g.font = '13px sans-serif'; g.fillText(LOOK.names[look] + ' · anim/' + a, 8, 18); out.push(t.toDataURL('image/png')); } }
      S.anim = ANIMS[4]; start(); return out;
    }
  };
  boot();
})();
