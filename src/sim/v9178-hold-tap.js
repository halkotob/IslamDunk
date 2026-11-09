// v9.17.8 (IN2): Defend and Sprint can be toggles instead of holds. Settings → Accessibility → "Hold or tap": Hold,
// Tap: Defend, Tap: Sprint, or Tap: Defend and Sprint. Hold by default (nothing changes for anyone who leaves it).
//   Tap: a tap turns it on, the next tap turns it off. It also turns off by itself when the ball changes hands, when
//   the ball is dead (timeouts, free throws, breaks, out of bounds) and when the game is paused, so it can't stay on
//   by accident.
//   Defend: the DEFEND button (H / L on keys, Y on a pad, the third touch button) on defense, and BOX OUT on a
//   rebound. Sprint: Shift (RB/RT/B on a pad is Shift too), or on touch pushing the stick past its ring.
//   While it's on: the touch button stays lit and a GUARD / SPRINT chip shows by the turbo bar on touch; with keys
//   or a pad the sprint glow on the turbo bar stays on and the card says GUARD.
// The toggle lives in the controls, not the match: it's turned into the held buttons before the match sees them
// (humanCmd for a game on this device; the frame's input bits in a rollback match), so one player on Tap and the
// other on Hold play the same game on both screens. The settings are local (RB_LOCAL) and never travel.
SETTINGS.defToggle = false; SETTINGS.sprToggle = false;
(() => { try { const o = JSON.parse(localStorage.getItem('islamdunk.holdtap') || '{}'); SETTINGS.defToggle = o.d === 1; SETTINGS.sprToggle = o.s === 1; } catch (e) {} })();
function holdTapSave() { try { localStorage.setItem('islamdunk.holdtap', JSON.stringify({ d: SETTINGS.defToggle ? 1 : 0, s: SETTINGS.sprToggle ? 1 : 0 })); } catch (e) {} }
RB_LOCAL.add('defToggle'); RB_LOCAL.add('sprToggle');
// one per controller slot (pad 0 and 1 on one device; a rollback match uses slot 0 for this device)
const Latch = [0, 1].map(() => ({ def: false, spr: false, dHeld: false, sHeld: false, deep: false, side: null }));
// the player a slot controls
function latchPlayer(i) {
  if (!M.players) return null;
  if (typeof RBN !== 'undefined' && RBN.on) return i === 0 ? M.players.find(p => p.human === RBN.me) : null;
  if (Net.role === 'guest') return i === 0 ? M.players.find(p => p.human === 1) : null;
  return M.players.find(p => p.human === i) || null;
}
// the keys that are this slot's DEFEND / sprint button
function latchKeys(i) {
  const rb = typeof RBN !== 'undefined' && RBN.on, solo = !rb && i === 0 && soloKeys(), b = rb ? null : padBinds(i);
  const def = rb ? [...BINDS[0].x, ...BINDS[1].x, ...DEF_KEYS[0], ...DEF_KEYS[1]] : [...b.x, ...DEF_KEYS[i], ...(solo ? DEF_KEYS[1] : [])];
  const spr = rb ? ['ShiftLeft', 'ShiftRight'] : [...SPRINT_KEYS[i], ...(solo ? ['ShiftRight'] : [])];
  return { def, spr };
}
function latchLive() {
  return (Game.screen === 'play' || Game.screen === 'netplay' || Game.screen === 'gym') && M.players && !M.attract && M.phase === 'live'
    && !Game.paused && !Game.trivia && !(M.mini && M.mini.done);
}
const latchSide = p => { const c = defCtx(p); return c === 'ball' || c === 'off' ? 'off' : c === 'def' ? 'def' : null; };   // (a loose ball or a shot in the air: no side yet)
function latchClear(L) { L.def = false; L.spr = false; L.side = null; }
// once a frame, before the match and the online input read the controls
function latchTick() {
  const live = latchLive();
  for (let i = 0; i < 2; i++) {
    const L = Latch[i], p = live ? latchPlayer(i) : null;
    const K = latchKeys(i), d = Input.down, pr = Input.pressed, held = ks => ks.some(k => d[k]), hit = ks => ks.some(k => pr[k]);
    const dH = held(K.def), sH = held(K.spr), deep = i === 0 && Input.touchMode && !!(Input.stick && Input.stick.deep);
    const dEdge = hit(K.def) || (dH && !L.dHeld), sEdge = hit(K.spr) || (sH && !L.sHeld) || (deep && !L.deep);
    L.dHeld = dH; L.sHeld = sH; L.deep = deep;
    if (!p) { latchClear(L); continue; }
    const side = latchSide(p);
    if (side && L.side && side !== L.side) { L.def = false; L.spr = false; }   // the ball changed hands
    if (side) L.side = side;
    const c = defCtx(p);
    if (SETTINGS.defToggle && dEdge && (c === 'def' || c === 'reb')) L.def = !L.def;
    if (c === 'ball' || c === 'off') L.def = false;
    if (SETTINGS.sprToggle && sEdge) L.spr = !L.spr;
    if (!SETTINGS.defToggle) L.def = false;
    if (!SETTINGS.sprToggle) L.spr = false;
  }
}
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { try { latchTick(); } catch (e) {} return _gu.apply(this, arguments); };
  // a game on this device (and the snapshot online modes): the toggle becomes the held button
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    _hc.apply(this, arguments);
    if ((typeof RB !== 'undefined' && RB.sim) || !latchLive()) return;
    const i = Net.role === 'guest' ? 0 : pad, L = Latch[i], p = latchPlayer(i); if (!L || !p) return;
    if (SETTINGS.defToggle) { const x = defCtx(p); if (x === 'def' || x === 'reb') c.xHeld = L.def; }
    if (SETTINGS.sprToggle) c.turbo = L.spr && Math.hypot(c.mx || 0, c.mz || 0) > 0.2;
  };
  // a rollback match: the frame's input carries the toggle as held bits (x 6, DEFEND 7, sprint 8; see RBN.sample)
  if (typeof RBN !== 'undefined') {
    const _sm = RBN.sample;
    RBN.sample = function () {
      const I = _sm.apply(this, arguments);
      if (!latchLive()) return I;
      const p = latchPlayer(0); return p ? latchBits(I, Latch[0], p) : I;
    };
  }
}
// a frame's input bits with the toggles as held buttons
function latchBits(I, L, p) {
  if (SETTINGS.defToggle) { const x = defCtx(p); if (x === 'def' || x === 'reb') { I.h &= ~((1 << 6) | (1 << 7)); if (L.def) I.h |= 1 << 7; } }
  if (SETTINGS.sprToggle) { I.h &= ~(1 << 8); if (L.spr) I.h |= 1 << 8; }
  return I;
}
// ---- showing it
{
  // the sprint glow on the turbo bar stays on (keys, pad and touch)
  const _sv = sprintVis;
  sprintVis = function (p) { const v = _sv.apply(this, arguments); const i = Latch.findIndex((L, k) => L.spr && latchPlayer(k) === p); return i >= 0 ? Math.max(v, 0.6) : v; };
  // the card (keys, pad) says GUARD where the status goes, when nothing else is there
  const _hud = drawHUD;
  drawHUD = function (g) {
    const r = _hud.apply(this, arguments);
    if (Input.touchMode || M.attract || !M.players) return r;
    const hk = baseZoom() > 1.6 ? 1.25 : 1; let slot = 0;
    g.save(); g.translate(0, H); g.scale(hk, hk); g.translate(0, -H);
    for (const p of M.players) {
      if (p.human < 0) continue;
      const ch = canNoor(p) ? 66 : 54, x = 12 + slot * 236, y = H - ch - 8; slot++;
      const k = Latch.findIndex((L, j) => L.def && latchPlayer(j) === p);
      if (k < 0 || p.fire || noorActive(p) || (p.fat || 0) > 0.7 || (isMine(p) && selectedRunBadge())) continue;
      g.globalAlpha = 0.95; g.fillStyle = '#8fe3ff'; g.textAlign = 'right'; g.font = `10px ${FONT}`; g.fillText('GUARD', x + 214, y + 17);
    }
    g.globalAlpha = 1; g.restore();
    return r;
  };
  // touch: the DEFEND / BOX OUT button stays lit, its line says tap, the stick's sprint ring stays bright, and the strip
  // shows a chip
  const _tu = TouchUI.update.bind(TouchUI);
  TouchUI.update = function () {
    _tu();
    if (!this.shown || !this.btns || !this.btns.cross) return;
    const L = Latch[0], b = this.btns.cross;
    if (L.def) b.classList.add('on'); else if (!Input.down.KeyH) b.classList.remove('on');
    if (SETTINGS.defToggle) { const sm = b.querySelector('small'); if (sm && /^hold/.test(sm.textContent)) sm.textContent = sm.textContent.replace(/^hold/, 'tap'); }
    if (this.ring) this.ring.style.borderColor = L.spr || Input.stick.deep ? 'rgba(143,227,255,.95)' : 'rgba(143,227,255,.4)';
  };
  const _ts = drawTouchStrip;
  drawTouchStrip = function (g) {
    _ts.apply(this, arguments);
    const L = Latch[0], p = latchPlayer(0); if (!p || (!L.def && !L.spr)) return;
    const hk = baseZoom() > 1.6 ? 1.25 : 1, top = 8 + 40 + (M.teamFouls && (teamFouls(0) >= 3 || teamFouls(1) >= 3 || inBonus(0) || inBonus(1)) ? 22 : 6);
    const row = M.players.filter(q => q.human >= 0).indexOf(p); if (row < 0) return;
    g.save(); g.scale(hk, hk); g.globalAlpha = 0.95;
    let cx = 10, y = top + row * 26 + 22;
    if (L.def) cx = hudChip(g, cx, y, (ix, iy) => {}, 'GUARD', '#8fe3ff');
    if (L.spr) hudChip(g, cx, y, 'bolt', 'SPRINT', '#bff0ff');
    g.restore();
  };
}
// ---- the setting: one row, "Hold or tap", in Accessibility after Shot release (the other control assist). Two rows
// didn't fit: Controls & camera already has 8 rows on a phone and Accessibility would have 8 on a computer (7 is the
// most a group shows)
const HOLD_TAP_VALS = ['Hold', 'Tap: Defend', 'Tap: Sprint', 'Tap: Defend and Sprint'];
{
  const i = SET_ITEMS.findIndex(s => s.label === 'Shot release');
  SET_ITEMS.splice(i + 1, 0, { label: 'Hold or tap',
    get: () => HOLD_TAP_VALS[(SETTINGS.defToggle ? 1 : 0) + (SETTINGS.sprToggle ? 2 : 0)],
    step: d => { const n = ((SETTINGS.defToggle ? 1 : 0) + (SETTINGS.sprToggle ? 2 : 0) + (d || 1) + 4) % 4; SETTINGS.defToggle = !!(n & 1); SETTINGS.sprToggle = !!(n & 2); holdTapSave(); } });
  const G = SET_GROUPS.find(g => g.name === 'Accessibility');
  if (G) G.labels.splice(G.labels.indexOf('Shot release') + 1, 0, 'Hold or tap');
  if (typeof SET_DESC !== 'undefined') SET_DESC['Hold or tap'] = 'Tap: one tap of Defend guards your man, or one tap of sprint (Shift, or the stick past its ring) keeps you sprinting, until you tap again. It stops by itself when the ball changes hands, the ball is dead, or you pause.';
}
// ---- How to play says what the chosen setting does
const HOLD_TAP_TEXT = {
  def: { 'Hold Defend (Skill move button or L): guard your man.': 'Tap Defend (Skill move button or L): guard your man; tap again to stop.', 'Hold Defend on a shot: box out': 'Tap Defend on a shot: box out' },
  spr: { 'hold Left Shift while moving': 'tap Left Shift: sprint on / off', 'hold B (or RT / RB)': 'tap B (or RT / RB): on / off',
    'Touch: push the stick past the dashed ring to sprint. Buttons: SHOOT, PASS, MOVE (labels change with the play).': 'Touch: push the stick past the dashed ring to turn sprint on or off. Buttons: SHOOT, PASS, MOVE (labels change with the play).' }
};
{
  const _hw = drawHowTo;
  drawHowTo = function (g) {
    if (!SETTINGS.defToggle && !SETTINGS.sprToggle) return _hw.apply(this, arguments);
    const own = Object.prototype.hasOwnProperty.call(g, 'fillText'), f = g.fillText;
    g.fillText = function (t, ...a) { const s = String(t); const r = (SETTINGS.defToggle && HOLD_TAP_TEXT.def[s]) || (SETTINGS.sprToggle && HOLD_TAP_TEXT.spr[s]); return f.call(this, r || t, ...a); };
    try { return _hw.apply(this, arguments); } finally { if (own) g.fillText = f; else delete g.fillText; }
  };
}
