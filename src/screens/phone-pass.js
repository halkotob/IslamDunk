// ================================================= v8.6.2: PHONE PASS
// On a phone the 960x540 canvas is drawn at ~0.55-0.63x, so a 13px label lands at ~8 CSS px. On touch
// devices (Input.touchMode):
//   1. Minimum text size: any text that would land below PHONE_MIN_CSS CSS px is drawn at that size. It
//      is applied per draw (fillText/strokeText) and per measure (measureText), so fitText/wrapText see
//      the real width. The canvas itself is not scaled. Desktop is untouched.
//   2. Keyboard-only hint lines are dropped or reworded for touch (TOUCH_TEXT, below).
//   3. HUD: the player card becomes a compact strip under the scoreboard (turbo bar, plus Noor / pressure
//      / fire / winded only while they apply, each as icon + text).
//   4. Touch buttons: main word only (the second line shows during the first game after install), never
//      "–" (the button hides), size S/M/L, opacity, left-handed layout, and a fade after 2 s untouched.
//   5. How to play on touch: a labelled diagram of the touch controls and a link to the Tutorial.
//   6. Venue select: lock icon + short tag on tiles; the focused tile's full name and lock reason below.
const PHONE_MIN_CSS = 11;
const PhonePrefs = {
  key: 'islamdunk.touch', size: 1, alpha: 0, left: false, hintDone: false,
  load() { try { const o = JSON.parse(localStorage.getItem(this.key) || '{}'); if (o.size >= 0 && o.size <= 2) this.size = o.size; if (o.alpha >= 0 && o.alpha <= 2) this.alpha = o.alpha; this.left = !!o.left; this.hintDone = !!o.hintDone; } catch (e) {} },
  save() { try { localStorage.setItem(this.key, JSON.stringify({ size: this.size, alpha: this.alpha, left: this.left, hintDone: this.hintDone })); } catch (e) {} }
};
PhonePrefs.load();
const BTN_SIZE = [0.85, 1, 1.15], BTN_SIZE_TXT = ['Small', 'Medium', 'Large'], BTN_ALPHA = [1, 0.8, 0.6], BTN_ALPHA_TXT = ['Solid', '80%', '60%'], BTN_FADE = 0.3;

// ---- 1 + 2: minimum text size and touch wording, on the game canvas only
const TOUCH_TEXT = {
  // navigation hints for keys: every item on these screens can be tapped
  '↑ ↓ choose, Enter to start, Esc to close': '', '← → choose, Enter to select': '', 'Enter: ask something else Esc: close': '', 'Enter: another Esc: leave': '', 'Esc: leave': '',
  '↑ ↓ choose, ← → change, Enter to select': '', '← → switch tabs, ↑ ↓ choose, Enter to build, Esc for the hub': '',
  '← → switch view, Enter for projects, Esc for the hub': '', '← → choose · Enter confirm · Esc ends your run': '',
  '← → choose • Enter confirm • Esc back': '', '← → choose • Enter go • Esc ends your run': '', '↑ ↓ choose ← → change Enter select': '',
  '↑ ↓ choose ← → change Enter edit Esc done': '', '↑ ↓ choose ← → change P play C share Esc back': '', '← → to change, Enter to confirm, Esc to go back': '',
  '← → season • ↑ ↓ game • Tab: career totals • Esc: back': '', 'Tab: season view • Esc: back': '',
  '← → switch tabs, Enter to continue': '', 'Enter edit • C code • D duplicate • X delete': '', 'Tab: Look / Outfit / Skills': '',
  'Arrows to choose, Enter to play, Esc to go back': '', 'Esc to go back': '', 'Esc to step away': '',
  'Press F for fullscreen': '', '← → choose, Enter to answer': '',
  'Enter edit • C code • D duplicate • X delete • G career • I import': '', 'Enter edit • C code • D duplicate • X delete • I import': '',
  'Tab: Look / Outfit / Skills ↑ ↓ choose ← → change Enter edit Esc done': '',
  // secondary lines that crowd a phone screen
  'No entry cost, no paid rewards, no penalty for taking a break.': '', 'Pause any time. Runs last for this session; personal bests stay saved.': '',
  // the same message, for a tap
  'Enter to play • Esc to go back • A new scenario every day': 'A new scenario every day',
  'R to try again • Enter to finish • A new spot pattern tomorrow': 'A new spot pattern tomorrow',
  'R to try again • Enter to finish • A new scenario tomorrow': 'A new scenario tomorrow',
  'Press F for fullscreen • How to play is in Options': 'How to play is in Options',
  'Press 1 to 4, or move and press Enter/K': 'Tap your answer', 'Press 1 to 3, or ← → and Enter. Tap a card on touch.': 'Tap a card to choose',
  'Press Enter or tap for the second half': 'Tap for the second half', 'Press Enter or tap to go to the rematch screen': 'Tap for the rematch screen',
  'Press Enter or tap to continue': 'Tap to continue', 'Press Enter or tap to go back': 'Tap to go back', 'Press Enter or Esc to go back': 'Tap to go back',
  'Enter or Esc to go back': 'Tap to go back', 'Enter or tap to continue': 'Tap to continue', 'Enter or tap to continue, Esc to skip': 'Tap to continue',
  'Tap or Enter to continue • Esc to skip': 'Tap to continue', 'Enter to continue, Esc to go back': 'Tap to continue', 'Enter or tap to continue Esc: close': 'Tap to continue',
  'Press Enter or tap to keep practicing': 'Tap to keep practicing', 'Enter to go pray, Esc to keep practicing': '', 'Back or Esc stops the drill': 'Back stops the drill',
  'Type the letters, Enter to join, Esc to go back': 'Tap the letters, then Join', 'Type your name, Enter when done': 'Tap the letters, then Done',
  'Type, then Enter when done': 'Tap the letters, then Done', 'Camera (C in game)': 'Camera',
  '↑ ↓ choose a scene • Enter to watch it again • Esc back': 'Tap a scene twice to watch it again', 'Come to prayer. Praying gives a bonus for your next game.': 'Praying gives a bonus next game.',
  'W A S D to walk • E or Enter to talk • Esc back to the gym': 'Stick to walk • TALK to talk', 'GAME LOG (Enter: box score)': 'GAME LOG (tap a game)',
  'GAME (← → to change)': 'GAME', 'PARTNER ← →': 'PARTNER', 'Esc or P pauses. On a phone, use the on-screen stick and buttons.': 'The pause button is top right.'
};
const PhoneText = { on: false, pad: false, cssPerDev: 1 };
const touchText = t => { if (typeof t !== 'string' || t.length < 6) return t; const k = t.replace(/\s+/g, ' ').trim(); return k in TOUCH_TEXT ? TOUCH_TEXT[k] : t; };
function phoneFloor(g) {                                    // raise the font to the minimum for this transform; returns the old font or null
  const f = g.font, m = /([\d.]+)px/.exec(f); if (!m) return null;
  const t = g.getTransform(), k = Math.hypot(t.a, t.b) * PhoneText.cssPerDev; if (!(k > 0)) return null;
  const min = PHONE_MIN_CSS / k; if (+m[1] >= min - 0.01) return null;
  g.font = f.replace(m[0], (Math.ceil(min * 10) / 10) + 'px'); return f;
}
function phoneTextInstall(g) {
  if (!g || g.__phone) return; g.__phone = true;
  const P = CanvasRenderingContext2D.prototype;
  for (const name of ['fillText', 'strokeText']) g[name] = function (text, ...a) {
    if (!PhoneText.on && !PhoneText.pad) return P[name].call(this, text, ...a);
    const t = PhoneText.on ? touchText(text) : padText(text); if (t === '') return;   // v8.7.0: pad prompts (gamepad.js)
    const old = PhoneText.on ? phoneFloor(this) : null;
    try { return P[name].call(this, t, ...a); } finally { if (old !== null) this.font = old; }
  };
  g.measureText = function (text) {
    if (!PhoneText.on && !PhoneText.pad) return P.measureText.call(this, text);
    const old = PhoneText.on ? phoneFloor(this) : null;
    try { return P.measureText.call(this, PhoneText.on ? touchText(text) : padText(text)); } finally { if (old !== null) this.font = old; }
  };
}
function phoneEffPx(g) { const old = phoneFloor(g), m = /([\d.]+)px/.exec(g.font), px = m ? +m[1] : 12; if (old !== null) g.font = old; return px; }
{
  // wrapped lines get room for the raised font
  const _wt = wrapText;
  wrapText = function (g, text, x, y, maxW, lh) { return _wt.call(this, g, text, x, y, maxW, PhoneText.on ? Math.max(lh, phoneEffPx(g) * 1.18) : lh); };
  const _wl = wrapTextLeft;
  wrapTextLeft = function (g, text, x, y, maxW, lh) { return _wl.call(this, g, text, x, y, maxW, PhoneText.on ? Math.max(lh, phoneEffPx(g) * 1.18) : lh); };
  const _r = render;
  render = function (g) {
    phoneTextInstall(g);
    PhoneText.on = !!Input.touchMode; PhoneText.pad = !Input.touchMode && Input.lastDev === 'pad' && typeof padText === 'function';
    if (PhoneText.on && canvas && canvas.width) PhoneText.cssPerDev = canvas.getBoundingClientRect().width / canvas.width;
    return _r.apply(this, arguments);
  };
}

// ---- 3: compact HUD strip on touch (the full cards stay on desktop)
function hudIcon(g, kind, x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s / 10, s / 10); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  if (kind === 'bolt') { g.moveTo(2, -9); g.lineTo(-5, 1); g.lineTo(0, 1); g.lineTo(-2, 9); g.lineTo(5, -1); g.lineTo(0, -1); g.closePath(); g.fill(); }
  else if (kind === 'flame') { g.moveTo(0, -9); g.quadraticCurveTo(7, -1, 5, 4); g.quadraticCurveTo(3, 9, 0, 9); g.quadraticCurveTo(-3, 9, -5, 4); g.quadraticCurveTo(-6, -2, 0, -9); g.fill(); }
  else if (kind === 'warn') { g.moveTo(0, -8); g.lineTo(8, 7); g.lineTo(-8, 7); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 2.5); g.stroke(); g.beginPath(); g.arc(0, 5, 0.8, 0, Math.PI * 2); g.fill(); }
  else if (kind === 'tired') { g.arc(0, 0, 7, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-3.5, -1); g.lineTo(-1.5, -1); g.moveTo(1.5, -1); g.lineTo(3.5, -1); g.moveTo(-2.5, 3.5); g.lineTo(2.5, 3.5); g.stroke(); }
  g.restore();
}
function hudChip(g, x, y, icon, text, col) {
  g.font = `11px ${FONT}`; const w = g.measureText(text).width + 30, h = 22;
  g.fillStyle = 'rgba(8,14,22,0.82)'; roundRect(g, x, y, w, h, h / 2); g.fill(); g.strokeStyle = col; g.lineWidth = 1; g.stroke();
  if (typeof icon === 'function') icon(x + 13, y + h / 2); else hudIcon(g, icon, x + 13, y + h / 2, 7, col);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(text, x + 24, y + 15);
  return x + w + 6;
}
const PhoneHUD = { board: null };
function drawTouchStrip(g) {
  const hk = baseZoom() > 1.6 ? 1.25 : 1, x0 = 10, top = 8 + 40 + (M.teamFouls && (teamFouls(0) >= 3 || teamFouls(1) >= 3 || inBonus(0) || inBonus(1)) ? 22 : 6);
  PhoneHUD.board = { x: 0, y: 0, w: 380 * hk, h: top * hk };          // the scoreboard's area, for the button-overlap test
  g.save(); g.scale(hk, hk);
  let y = top;
  for (const p of M.players) {
    if (p.human < 0 || M.attract) continue;
    const sv = sprintVis(p);                                               // v8.6.7: from the sim's drain flag, held and faded
    g.globalAlpha = 0.95;
    g.fillStyle = 'rgba(8,14,22,0.82)'; roundRect(g, x0, y, 150, 20, 10); g.fill();
    g.fillStyle = p.human === 0 ? '#ff7a7a' : '#6ab8ff'; roundRect(g, x0 + 6, y + 5, 4, 10, 2); g.fill();
    hudIcon(g, 'bolt', x0 + 20, y + 10, 6, '#bff0ff');
    meter(g, x0 + 30, y + 6, 112, 8, p.fire ? 1 : p.turbo / 100, p.fire ? '#ff8a2a' : p.winded ? '#ff8a7a' : turboCol(sv));
    let cx = x0 + 158;
    if (p.fire) cx = hudChip(g, cx, y - 1, 'flame', 'ON FIRE', '#ff8a2a');
    if (noorActive(p)) { const F = NOOR_BY_ID[noorFxOf(p)]; cx = hudChip(g, cx, y - 1, (ix, iy) => noorIcon(g, F.icon, ix, iy, 7, F.col), noorTagText(p), F.col); }
    else if (canNoor(p) && p.hifz >= 100) cx = hudChip(g, cx, y - 1, (ix, iy) => noorIcon(g, 'light', ix, iy, 7, '#ffe38a'), 'NOOR READY', '#ffe38a');
    if (!p.fire && (p.fat || 0) > 0.7) cx = hudChip(g, cx, y - 1, 'tired', 'WINDED', '#ffb08a');
    if (typeof pressureOf === 'function' && pressureOf(p) >= 0.3 && !p.fire) cx = hudChip(g, cx, y - 1, 'warn', 'PRESSURE', '#ffb07a');
    y += 26;
  }
  g.globalAlpha = 1; g.restore();
}
{
  const _hud = drawHUD;
  drawHUD = function (g) { const r = _hud.apply(this, arguments); if (Input.touchMode && !M.mini) drawTouchStrip(g); return r; };   // the cards themselves skip on touch (renderer.js)
}

// ---- 4: touch buttons
{
  const _lay = TouchUI.layout;
  TouchUI.layout = function () {
    _lay.apply(this, arguments);
    if (!this.el || !this.btns || !this.btns.shoot) return;
    const vw = innerWidth, vh = innerHeight, P = this.portrait, I = safeInsets(), k = this.k || 1, R = this.R();
    const s = (P ? 1.12 : 1) * k * BTN_SIZE[PhonePrefs.size], pad = (P ? 20 : 14) + (PhonePrefs.left ? I.l : I.r), bot = (P ? 30 : 12) + I.b, L = PhonePrefs.left;
    const place = (b, size, side, bottom) => Object.assign(b.style, { width: size * s + 'px', height: size * s + 'px', [L ? 'left' : 'right']: side * s + pad + 'px', [L ? 'right' : 'left']: '', bottom: bottom * s + bot + 'px', fontSize: (size > 80 ? 15 : 12.5) * s + 'px' });
    place(this.btns.shoot, 92, 0, 0); place(this.btns.pass, 76, 104, 4); place(this.btns.cross, 72, 18, 104);
    const zw = parseFloat(this.zone.style.width) || vw * 0.4;
    if (L) { this.zone.style.left = (vw - zw - I.r) + 'px'; this.homeX = zw - (R + (P ? 22 : 18) * k); }
    else { this.zone.style.left = I.l + 'px'; this.homeX = R + (P ? 22 : 18) * k; }
    this.drawStick();
  };
  const _tu = TouchUI.update;
  TouchUI.update = function () {
    _tu.apply(this, arguments);
    if (!this.el) return;
    if (!this.css) {
      this.css = document.createElement('style');
      this.css.textContent = '#tui.nosub .b small{display:none}#tui .b,#tui .base,#tui .knob{transition:opacity .35s}';
      document.head.appendChild(this.css);
      this.el.addEventListener('pointerdown', () => { this.touchedAt = performance.now(); }, true);
      this.touchedAt = performance.now();
    }
    if (!this.shown) return;
    // the second line only during the first game after install
    if (!PhonePrefs.hintDone && Game.screen === 'play' && M.phase === 'over' && !M.attract) { PhonePrefs.hintDone = true; PhonePrefs.save(); }
    this.el.classList.toggle('nosub', PhonePrefs.hintDone);
    // a button with no action hides instead of showing "–"
    for (const k of ['shoot', 'pass', 'cross']) {
      const b = this.btns[k], sp = b.firstChild, empty = !!sp && /^\s*[–—-]\s*$/.test(sp.textContent || '');
      if (empty) b.style.display = 'none'; else if (b.style.display === 'none' && b.dataset.hid === '1') b.style.display = '';
      b.dataset.hid = empty ? '1' : '';
    }
    // opacity setting, and a fade after 2 s without a touch
    const idle = performance.now() - (this.touchedAt || 0) > 2000 && this.sid == null;
    const a = BTN_ALPHA[PhonePrefs.alpha] * (idle ? BTN_FADE : 1);
    for (const k of ['shoot', 'pass', 'cross']) this.btns[k].style.opacity = String(this.btns[k].classList.contains('cd') ? a * 0.6 : a);
    this.stickEl.style.opacity = String(this.sid != null ? 1 : idle ? 0.25 : 0.55);
    this.knob.style.opacity = this.stickEl.style.opacity;
  };
}
// Settings: Controls & camera (shown where touch is possible)
{
  const touchCapable = () => Input.touchMode || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const relay = () => { if (TouchUI.el) TouchUI.layout(); };
  const items = [
    { label: 'Button size', get: () => BTN_SIZE_TXT[PhonePrefs.size], step: d => { PhonePrefs.size = (PhonePrefs.size + d + 3) % 3; PhonePrefs.save(); relay(); }, touch: true },
    { label: 'Button opacity', get: () => BTN_ALPHA_TXT[PhonePrefs.alpha], step: d => { PhonePrefs.alpha = (PhonePrefs.alpha + d + 3) % 3; PhonePrefs.save(); }, touch: true },
    { label: 'Left-handed layout', get: () => PhonePrefs.left ? 'On' : 'Off', step: () => { PhonePrefs.left = !PhonePrefs.left; PhonePrefs.save(); relay(); }, touch: true }
  ];
  SET_ITEMS.splice(SET_ITEMS.length - 1, 0, ...items);
  SET_GROUPS[1].labels.push(...items.map(i => i.label));
  const _sgi = setGroupItems;
  setGroupItems = function (gi) { return _sgi.apply(this, arguments).filter(s => !s.touch || touchCapable()); };
}

// ---- 5: How to play on touch: a diagram of the touch controls
{
  const _ht = drawHowTo;
  drawHowTo = function (g) {
    if (!Input.touchMode) return _ht.apply(this, arguments);
    dim(g, 0.86);
    const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); Game.ox = o; const rw = W; W = 960;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText('How to play', W / 2, 52);
    // the stick
    const sx = 190, sy = 300;
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 70, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(sx + 22, sy - 10, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = `22px ${FONT}`; g.fillText('MOVE', sx, sy + 112);
    g.fillStyle = IVORY; g.font = `18px ${BODY}`; g.fillText('Push to the edge', sx, sy + 140); g.fillText('to sprint', sx, sy + 164);
    // the three buttons, with what each does
    const B = [['SHOOT', 770, 360, 58, ['Hold, let go at the top', 'Defense: block']], ['PASS', 610, 330, 48, ['Tap to pass', 'Defense: steal']], ['MOVE', 700, 190, 46, ['Dribble moves', 'Defense: guard']]];
    for (const [name, x, y, r, lines] of B) {
      g.fillStyle = 'rgba(12,20,30,0.75)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.textAlign = 'center'; g.fillText(name, x, y + 7);
    }
    const note = (x, y, t1, t2, al = 'left') => { g.textAlign = al; g.fillStyle = IVORY; g.font = `17px ${BODY}`; g.fillText(t1, x, y); g.fillStyle = '#9fb3c8'; g.fillText(t2, x, y + 22); };
    note(830, 450, B[0][4][0], B[0][4][1], 'right');
    note(560, 410, B[1][4][0], B[1][4][1], 'right');
    note(756, 170, B[2][4][0], B[2][4][1]);
    // tutorial link + back
    g.textAlign = 'center'; g.fillStyle = GOLD; roundRect(g, W / 2 - 160, 76, 320, 40, 20); g.fill();
    g.fillStyle = NIGHT; g.font = `18px ${FONT}`; g.fillText('Play the Tutorial', W / 2, 103);
    addRect(W / 2 - 160, 76, 320, 40, () => startTutorial());
    g.fillStyle = '#9fb3c8'; g.font = `16px ${BODY}`; g.fillText('Tap anywhere else to go back', W / 2, 520);
    W = rw; Game.ox = 0; g.restore();
    addRect(0, 0, W, H, goTitle);
  };
}

// ---- 6: venue select: short lock tags; the focused tile's full name and reason below the grid
function lockTag(v) { return v.lock === 4 ? 'Win World Cup' : STAGES[v.lock].name + ' stage'; }
{
  const _lt = lockText;
  const _dv = drawVenueSelect;
  drawVenueSelect = function (g) {
    lockText = lockTag;                                             // tiles: the short tag
    const _ft = fitText;                                            // a narrow tile says "World Cup" rather than cutting the tag
    fitText = function (g2, t, w) { return t === 'Win World Cup' && g2.measureText(t).width > w ? 'World Cup' : _ft.apply(this, arguments); };
    try { _dv.apply(this, arguments); } finally { lockText = _lt; fitText = _ft; }
    const opts = venueOptions(), v = opts[Game.idx]; if (!v) return;
    const locked = v.kind !== 'random' && venueLocked(v), name = v.kind === 'random' ? 'Random venue' : v.name;
    g.textAlign = 'center'; g.font = `14px ${FONT}`; g.fillStyle = locked ? '#ffb08a' : GOLD;
    g.fillText(fitText(g, name + (locked ? '  •  ' + _lt(v) : ''), W - 40), W / 2, Input.touchMode ? 528 : 508);
  };
}

// ---- the select screen can't run without a selection (never reached that way in play; fail safely)
{
  const _ds = drawSelect, _su = selectUpdate;
  drawSelect = function (g) { if (!Game.sel) { dim(g, 0.55); return; } return _ds.apply(this, arguments); };
  selectUpdate = function () { if (!Game.sel) { goTitle(); return; } return _su.apply(this, arguments); };
}
