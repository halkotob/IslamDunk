// ------------------------------------------------------------------ INPUT
const BLOCK_KEYS = new Set(['KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Slash']);
const BINDS = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['KeyJ'], b: ['KeyK'], t: ['KeyL'], x: ['KeyH'], s: ['KeyI'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['Numpad1', 'Comma'], b: ['Numpad2', 'Period'], t: ['Numpad3', 'Slash'], x: ['Numpad0', 'KeyM'], s: ['Numpad4', 'KeyN'] }
];
const SIM_KEYS = new Set(BINDS.flatMap(b => Object.values(b).flat()));
const MK = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  ok: ['Enter', 'Space', 'KeyK', 'NumpadEnter', 'Numpad2'], back: ['Escape', 'Backspace'] };
const TOUCH_BTNS = [
  { key: 'KeyK', label: 'SHOOT', dx: 86, y: H - 90, r: 48 },
  { key: 'KeyJ', label: 'PASS', dx: 196, y: H - 62, r: 38 },
  { key: 'KeyL', label: 'TURBO', dx: 104, y: H - 204, r: 36 }
];
function layoutTouch() { for (const b of TOUCH_BTNS) b.x = W - b.dx; }
layoutTouch();
const Input = {
  down: {}, pressed: {}, released: {}, taps: [], touchMode: false, btnPtr: {},
  stick: { id: null, ox: 0, oy: 0, x: 0, y: 0, ax: 0, az: 0 },
  mouse: { x: -1, y: -1, on: false }, touch: null,
  init(cv) {
    addEventListener('keydown', e => {
      SFX.init(); SFX.resume();
      if (!this.down[e.code]) this.pressed[e.code] = true;
      this.down[e.code] = true;
      if (BLOCK_KEYS.has(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.down[e.code] = false; this.released[e.code] = true; });
    addEventListener('blur', () => { this.down = {}; });
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    cv.addEventListener('pointerdown', e => {
      SFX.init(); SFX.resume(); e.preventDefault();
      const [x, y] = pos(e);
      if (e.pointerType === 'touch') { this.touchMode = true; this.touch = { id: e.pointerId, x, y }; }
      if (this.touchMode && !TouchUI.shown && (Game.screen === 'play' || Game.screen === 'netplay' || Game.screen === 'gym') && !Game.paused && !Game.trivia) {
        for (const b of TOUCH_BTNS) if (Math.hypot(x - b.x, y - b.y) < b.r + 12) {
          this.btnPtr[e.pointerId] = b.key; if (!this.down[b.key]) this.pressed[b.key] = true; this.down[b.key] = true; return;
        }
        // tappable UI (drill buttons, back, pause) always beats the joystick
        if (Game.rects.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) { this.taps.push({ x, y }); return; }
        if (x < W * 0.55 && y > H * 0.25) {
          const s = this.stick; s.id = e.pointerId; s.ox = s.x = x; s.oy = s.y = y; s.ax = s.az = 0;
          try { cv.setPointerCapture(e.pointerId); } catch (err) { } return;
        }
      }
      this.taps.push({ x, y });
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse') { const [mx, my] = pos(e); this.mouse.x = mx; this.mouse.y = my; this.mouse.on = true; }
      if (this.touch && e.pointerId === this.touch.id) { const [tx, ty] = pos(e); this.touch.x = tx; this.touch.y = ty; }
      const s = this.stick; if (e.pointerId !== s.id) return;
      const [x, y] = pos(e); s.x = x; s.y = y;
      let dx = x - s.ox, dy = y - s.oy; const d = Math.hypot(dx, dy), R = 50;
      if (d > R) { s.ox = x - dx / d * R; s.oy = y - dy / d * R; dx = x - s.ox; dy = y - s.oy; }
      const dd = Math.hypot(dx, dy), mag = clamp((dd / R - 0.16) / 0.84, 0, 1);
      s.ax = dd > 0 ? dx / dd * mag : 0; s.az = dd > 0 ? dy / dd * mag : 0;
    });
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.mouse.on = false; });
    const up = e => {
      if (this.touch && e.pointerId === this.touch.id) this.touch = null;
      const s = this.stick; if (e.pointerId === s.id) { s.id = null; s.ax = s.az = 0; }
      const k = this.btnPtr[e.pointerId];
      if (k) { this.down[k] = false; this.released[k] = true; delete this.btnPtr[e.pointerId]; }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  },
  hit(list) { return list.some(c => this.pressed[c]); },
  // keepSim: the sim ran zero steps this frame (high refresh displays), so keep
  // gameplay key edges for the next step; menu keys were consumed this frame.
  endFrame(keepSim) {
    this.taps.length = 0;
    if (!keepSim) { this.pressed = {}; this.released = {}; return; }
    for (const k in this.pressed) if (!SIM_KEYS.has(k)) delete this.pressed[k];
    for (const k in this.released) if (!SIM_KEYS.has(k)) delete this.released[k];
  }
};
const menuHit = n => Input.hit(MK[n]);
// Build a command for a human pad (same shape the AI produces)
function humanCmd(pad, c) {
  const b = BINDS[pad], d = Input.down;
  const has = k => b[k].some(x => d[x]), hit = k => b[k].some(x => Input.pressed[x]), rel = k => b[k].some(x => Input.released[x]);
  let mx = (has('right') ? 1 : 0) - (has('left') ? 1 : 0), mz = (has('down') ? 1 : 0) - (has('up') ? 1 : 0);
  if (pad === 0 && (Input.stick.ax || Input.stick.az)) { mx = Input.stick.ax; mz = Input.stick.az; }
  const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
  c.mx = mx; c.mz = mz; c.turbo = has('t'); c.a = hit('a'); c.b = hit('b'); c.bHeld = has('b'); c.bRel = rel('b'); c.x = hit('x'); c.s = hit('s');
  c.passTo = null; c.alley = null; c.face = 0;
}

