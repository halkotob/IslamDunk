// ================================================= v8.7.0: GAMEPADS
// Polls navigator.getGamepads() every frame (standard mapping; other pads are read the same way, best effort).
// A pad drives the game by pressing the same keys a keyboard player would: Input.down / pressed / released get
// the P1 keys (or P2's) and every screen, the sim, online and replays see exactly what the keyboard produces.
// The left stick is analog: Input.padAxis feeds humanCmd like the touch stick does.
//
//   Left stick, D-pad   move (and menu selection)      A (south)        Shoot  (K)    menus: confirm
//   X (west)            Pass   (J)                     Y (north)        Move / Defend (H)
//   B (east), RT, RB    Turbo: hold to sprint (Shift)  menus: B backs out (Esc)
//   LB                  Interact: talk, use, enter the musalla (E)
//   Start / Menu        Pause (Esc)                    View / Select    on-screen picker (any tap target)
//
// First pad = P1, second = P2, in connection order, when a match has two local players; otherwise every pad
// controls P1 (one human, the online guest, menus). The keyboard keeps working at the same time.
SETTINGS.vibration = true;
(() => { try { if (localStorage.getItem('islamdunk.vibration') === '0') SETTINGS.vibration = false; } catch (e) {} })();
const PB = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_DZ = 0.2;                                      // radial deadzone
const PAD_KEYS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', A: 'KeyK', X: 'KeyJ', Y: 'KeyH', turbo: 'ShiftLeft', LB: 'KeyE' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', A: 'Numpad2', X: 'Numpad1', Y: 'Numpad0', turbo: 'ShiftRight', LB: 'KeyE' }
];
const PAD_PICKER_SCREENS = ['namekeys', 'joincode'];     // text entry: the on-screen letters, picked with the pad
const Pad = {
  order: [], prevKeys: {}, prevBtn: {}, rep: {}, seen: false, cursor: { on: false, i: -1, auto: false },
  init() {
    addEventListener('gamepadconnected', e => this.connect(e.gamepad));
    addEventListener('gamepaddisconnected', e => { const g = e.gamepad; if (g) this.order = this.order.filter(i => i !== g.index); });
  },
  connect(g) { if (g && !this.order.includes(g.index)) { this.order.push(g.index); this.seen = true; } },
  pads() {                                               // connected pads, in the order they connected
    let all = [];
    try { all = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; } catch (e) { all = []; }
    const live = all.filter(g => g && g.connected !== false);
    for (const g of live) this.connect(g);              // some browsers only report a pad after a button press
    this.order = this.order.filter(i => live.some(g => g.index === i));
    return this.order.map(i => live.find(g => g.index === i)).filter(Boolean);
  },
  btn(g, i) { const b = g.buttons && g.buttons[i]; return !!b && (b.pressed === true || (typeof b === 'object' ? b.value > 0.5 : b > 0.5)); },
  stick(g) {                                             // left stick: radial deadzone, then a smooth curve; D-pad wins if held
    const ax = +(g.axes && g.axes[0]) || 0, ay = +(g.axes && g.axes[1]) || 0, m = Math.hypot(ax, ay);
    if (!(m > PAD_DZ)) return { x: 0, z: 0, m: 0 };
    const k = Math.min(1, (m - PAD_DZ) / (1 - PAD_DZ)), c = k * k * (3 - 2 * k) * 0.35 + k * 0.65;   // gentle at the edge of the deadzone
    return { x: ax / m * c, z: ay / m * c, m: c };
  },
  playing() { return ['play', 'netplay', 'gym'].includes(Game.screen) && !Game.paused && !Game.trivia; },
  twoLocal() { return !Net.role && !!(M.players && M.players.some(p => p.human === 1) && M.players.some(p => p.human === 0)) && this.playing(); },
  poll(rdt) {
    const pads = this.pads(), want = {}, axes = [{ ax: 0, az: 0, m: 0 }, { ax: 0, az: 0, m: 0 }], two = this.twoLocal(), playing = this.playing();
    const edges = [];                                    // menu-direction presses from sticks (with repeat)
    let active = false, anyEdge = {};
    pads.forEach((g, n) => {
      const slot = two ? Math.min(n, 1) : 0, K = PAD_KEYS[slot], prev = this.prevBtn[g.index] || [];
      const b = i => this.btn(g, i), edge = i => b(i) && !prev[i];
      const st = this.stick(g);
      const nowBtn = []; for (let i = 0; i < 17; i++) nowBtn[i] = b(i);
      if (nowBtn.some(Boolean) || st.m > 0) active = true;
      for (const k of ['A', 'B', 'X', 'Y', 'START', 'VIEW', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'LB']) if (edge(PB[k])) anyEdge[k] = true;
      this.prevBtn[g.index] = nowBtn;
      if (this.cursor.on) return;                        // the picker owns the pad
      if (b(PB.UP)) want[K.up] = true; if (b(PB.DOWN)) want[K.down] = true; if (b(PB.LEFT)) want[K.left] = true; if (b(PB.RIGHT)) want[K.right] = true;
      if (b(PB.A)) want[K.A] = true; if (b(PB.X)) want[K.X] = true; if (b(PB.Y)) want[K.Y] = true; if (b(PB.LB)) want[K.LB] = true;
      if (b(PB.START)) want.Escape = true;
      if (playing) { if (b(PB.B) || b(PB.RB) || b(PB.RT)) want[K.turbo] = true; }
      else if (b(PB.B)) want.Escape = true;
      if (st.m > axes[slot].m) axes[slot] = { ax: st.x, az: st.z, m: st.m };
      if (!playing) edges.push([g.index, st, slot]);
    });
    if (active) { Input.lastDev = 'pad'; this.seen = true; }
    Input.padAxis[0] = { ax: axes[0].ax, az: axes[0].az }; Input.padAxis[1] = { ax: axes[1].ax, az: axes[1].az };
    // the picker (View, or text entry screens): move between tap targets, A taps, B closes
    const auto = PAD_PICKER_SCREENS.includes(Game.screen) && Input.lastDev === 'pad';
    if (!this.cursor.on && (anyEdge.VIEW || (auto && !this.cursor.auto && pads.length))) { this.cursor = { on: true, i: -1, auto }; anyEdge = {}; }
    if (this.cursor.on) {
      if (!pads.length || (this.cursor.auto && !PAD_PICKER_SCREENS.includes(Game.screen))) this.cursor = { on: false, i: -1, auto: false };
      else this.pick(anyEdge, pads);
    } else if (!auto && this.cursor.auto) this.cursor.auto = false;
    // stick as menu directions: a press on the way out, then repeats while held
    for (const [id, st, slot] of edges) {
      const K = PAD_KEYS[slot], R = this.rep[id] || (this.rep[id] = { dir: null, t: 0 });
      const dir = st.m < 0.5 ? null : Math.abs(st.x) > Math.abs(st.z) ? (st.x > 0 ? K.right : K.left) : (st.z > 0 ? K.down : K.up);
      if (dir !== R.dir) { R.dir = dir; R.t = 0.4; if (dir && !this.cursor.on) Input.pressed[dir] = true; }
      else if (dir) { R.t -= rdt; if (R.t <= 0) { R.t = 0.12; if (!this.cursor.on) Input.pressed[dir] = true; } }
    }
    // press and release the emulated keys; never release a key the keyboard itself is holding
    for (const k of new Set([...Object.keys(want), ...Object.keys(this.prevKeys)])) {
      const now = !!want[k], was = !!this.prevKeys[k];
      if (now && !was) { if (!Input.down[k]) Input.pressed[k] = true; Input.down[k] = true; }
      else if (!now && was && !Input.kb[k]) { Input.down[k] = false; Input.released[k] = true; }
    }
    this.prevKeys = want;
  },
  pickRects() { return (Game.rects || []).filter(r => r.w > 4 && r.h > 4 && r.w * r.h < W * H * 0.4); },
  pick(e, pads) {
    const R = this.pickRects(), C = this.cursor;
    if (!R.length) { if (e.B || e.START || e.VIEW) this.close(); return; }
    if (C.i < 0 || C.i >= R.length) C.i = 0;
    const st = pads.map(g => this.stick(g)).sort((a, b) => b.m - a.m)[0] || { x: 0, z: 0, m: 0 };
    const RR = this.rep.cursor || (this.rep.cursor = { dir: null, t: 0 });
    const sd = st.m < 0.5 ? null : Math.abs(st.x) > Math.abs(st.z) ? (st.x > 0 ? 'RIGHT' : 'LEFT') : (st.z > 0 ? 'DOWN' : 'UP');
    let move = ['UP', 'DOWN', 'LEFT', 'RIGHT'].find(k => e[k]) || null;
    if (sd !== RR.dir) { RR.dir = sd; RR.t = 0.4; if (sd) move = sd; } else if (sd) { RR.t -= Game.rdt || STEP; if (RR.t <= 0) { RR.t = 0.12; move = sd; } }
    if (move) {
      const a = R[C.i], ax = a.x + a.w / 2, ay = a.y + a.h / 2, dx = move === 'LEFT' ? -1 : move === 'RIGHT' ? 1 : 0, dy = move === 'UP' ? -1 : move === 'DOWN' ? 1 : 0;
      let best = -1, bs = 1e9;
      R.forEach((r, i) => { if (i === C.i) return; const vx = r.x + r.w / 2 - ax, vy = r.y + r.h / 2 - ay, along = vx * dx + vy * dy; if (along <= 2) return; const s = along + Math.abs(vx * dy - vy * dx) * 2.2; if (s < bs) { bs = s; best = i; } });
      if (best >= 0) { C.i = best; SFX.blip && SFX.blip(); }
    }
    if (e.A) { const r = R[C.i]; Input.taps.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 }); }
    else if (e.B || e.START) { if (C.auto) { Input.pressed.Escape = true; } this.close(); }
    else if (e.VIEW && !C.auto) this.close();
  },
  close() { this.cursor = { on: false, i: -1, auto: this.cursor.auto }; },
  rumble(strong, weak, ms) {
    if (!SETTINGS.vibration || !M.players || M.attract || !M.players.some(p => p.human >= 0)) return;
    for (const g of this.pads()) {
      const a = g.vibrationActuator;
      try { if (a && a.playEffect) { const r = a.playEffect(a.type || 'dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak }); if (r && r.catch) r.catch(() => {}); } } catch (err) {}
    }
  }
};
Pad.init();
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { try { Pad.poll(rdt); } catch (e) {} return _gu.apply(this, arguments); };
  // the left stick sprints with Turbo held, as Shift does with the keys
  const _ss = sprintStep;
  sprintStep = function (pad, c) {
    _ss.apply(this, arguments);
    const A = Input.padAxis[pad], K = PAD_KEYS[pad];
    if (!c.turbo && A && (A.ax || A.az) && K && Input.down[K.turbo] && Math.hypot(A.ax, A.az) > 0.2) c.turbo = true;
  };
  // rumble: dunks, blocks, big makes (threes, posters), the buzzer
  const _sl = SFX.slam; SFX.slam = function () { Pad.rumble(1, 0.6, 260); return _sl.apply(this, arguments); };
  const _bz = SFX.buzzer; SFX.buzzer = function () { Pad.rumble(0.5, 0.8, 420); return _bz.apply(this, arguments); };
  const _bb = blockBall; blockBall = function () { Pad.rumble(0.8, 0.4, 180); return _bb.apply(this, arguments); };
  const _mf = makeFeel; makeFeel = function (h, sh, shooter, pts) { const k = _mf.apply(this, arguments); if (!(sh && sh.dunk) && (pts >= 3 || k === 'poster')) Pad.rumble(0.4, 0.6, 200); return k; };
  // Settings → Sound & display → Controller vibration (with the other feedback settings)
  const i = SET_ITEMS.findIndex(s => s.label === 'Sound');
  SET_ITEMS.splice(i + 1, 0, { label: 'Controller vibration', get: () => SETTINGS.vibration ? 'On' : 'Off',
    step: () => { SETTINGS.vibration = !SETTINGS.vibration; try { localStorage.setItem('islamdunk.vibration', SETTINGS.vibration ? '1' : '0'); } catch (e) {} if (SETTINGS.vibration) Pad.rumble(0.5, 0.5, 150); } });
  // the picker's focus ring
  const _r = render;
  render = function (g) {
    _r.apply(this, arguments);
    const C = Pad.cursor; if (!C.on) return;
    const R = Pad.pickRects(), r = R[C.i]; if (!r) return;
    g.save(); g.strokeStyle = '#ffd24d'; g.lineWidth = 3; g.shadowColor = 'rgba(255,210,77,0.8)'; g.shadowBlur = 10;
    roundRect(g, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10); g.stroke(); g.restore();
    g.save(); g.textAlign = 'center'; g.font = `12px ${FONT}`; const t = 'A: select   B: close';
    const w = g.measureText(t).width + 24; g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, W / 2 - w / 2, H - 34, w, 24, 12); g.fill();
    g.fillStyle = '#fff'; g.fillText(t, W / 2, H - 17); g.restore();
  };
}
// ---- prompts: when the last input came from a pad, keyboard hints read as pad buttons
const PAD_TEXT = {
  'K: dunk J: next style H: slow motion Esc: pause / quit': 'A: dunk X: next style Y: slow motion Start: pause',
  'Enter the musalla (E)': 'Enter the musalla (LB)', 'Talk to': 'Talk to',
  'Sheikh’s office (O)': 'Sheikh’s office (View: menu)', 'Enter to go pray, Esc to keep practicing': 'A: go pray   B: keep practicing',
  'Back or Esc stops the drill': 'B stops the drill', 'Press F for fullscreen': '', 'Press F for fullscreen • How to play is in Options': 'How to play is in Options',
  'Type the letters, Enter to join, Esc to go back': 'Pick the letters with the pad, then Join',
  'Type your name, Enter when done': 'Pick the letters with the pad, then Done', 'Type, then Enter when done': 'Pick the letters with the pad, then Done',
  'Press 1 to 4, or move and press Enter/K': 'Move to pick, A to answer', 'Press 1 to 3, or ← → and Enter. Tap a card on touch.': '← → to choose, A to pick',
  'W A S D to walk • E or Enter to talk • Esc back to the gym': 'Stick to walk • LB to talk • B back to the gym'
};
function padText(t) {
  if (typeof t !== 'string' || t.length < 3) return t;
  const k = t.replace(/\s+/g, ' ').trim();
  if (k in PAD_TEXT) return PAD_TEXT[k];
  if (!/\b(Enter|Esc|Escape)\b/.test(t)) return t;
  return t.replace(/Press Enter or tap/g, 'Press A').replace(/Enter or tap/g, 'A').replace(/Tap or Enter/g, 'A').replace(/\bEnter\b/g, 'A').replace(/\bEscape\b|\bEsc\b/g, 'B');
}
