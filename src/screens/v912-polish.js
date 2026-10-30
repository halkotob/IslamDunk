// ================================================= v9.12: CLARITY, CONTROLS, INTERRUPTIONS (play-test review)
//   * A confirmation dialog (Game.confirm) for anything that would throw away progress: abandoning a Barakah run,
//     leaving a match from the pause menu. "Keep playing" is selected by default; Esc means keep playing.
//   * Offline matches pause when the window loses focus (another app, another tab); you resume from the menu.
//     Online matches keep running (the other player is still playing; the host's "stepped away" notice shows).
//   * The pause menu: How to play and Settings (sound, display, accessibility) open over the paused match and come
//     back to it; a timeout you can't call is shown greyed out with the reason; Leave asks first; a disconnected
//     controller is named.

// ---------------------------------------------------------------- the confirmation dialog
function askConfirm(o) { Game.confirm = Object.assign({ sel: 0 }, o); SFX.blip && SFX.blip(); }
function confirmPick(i) {
  const C = Game.confirm; if (!C) return; Game.confirm = null;
  if (i === 1 && C.yes) C.yes[1](); else if (C.no && C.no[1]) C.no[1]();
}
function drawConfirm(g) {
  const C = Game.confirm; if (!C) return;
  const rw = W, ox = Math.round((W - 960) / 2); g.save(); g.translate(ox, 0); W = 960;
  g.fillStyle = 'rgba(4,8,14,0.72)'; g.fillRect(-ox - 10, -10, rw + 20, H + 20);
  const w = 560; g.font = `15px ${BODY}`; const lines = textLines(g, C.text || '', w - 64), h = 150 + lines.length * 22;
  const x = W / 2 - w / 2, y = H / 2 - h / 2;
  panel(g, x, y, w, h, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText(C.title, W / 2, y + 46);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`; lines.forEach((t, k) => g.fillText(t, W / 2, y + 80 + k * 22));
  const by = y + h - 56, labels = [(C.no && C.no[0]) || 'Keep playing', C.yes[0]];
  labels.forEach((t, i) => { const bx = W / 2 - 230 + i * 240; uiButton(g, bx, by, 220, 40, t, () => confirmPick(i), C.sel === i); });
  W = rw; g.restore();
}
{
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const C = Game.confirm;
    if (!C) return _gu.apply(this, arguments);
    Game.t += rdt; try { Pad.poll(rdt); } catch (e) {}                     // (the pad is read inside the update this skips)
    if (menuHit('left') || menuHit('up') || menuHit('right') || menuHit('down')) { C.sel = 1 - C.sel; SFX.blip && SFX.blip(); }
    if (menuHit('ok')) confirmPick(C.sel);
    else if (menuHit('back')) confirmPick(0);
    const tap = Input.taps[0];
    if (tap && Game.confirm === C) for (const r of Game.rects.slice().reverse()) if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) { r.fn(); break; }
    Input.taps.length = 0;
  };
  const _r = render;
  render = function (g) {
    if (Game.confirm) Game.rects = [];
    _r.apply(this, arguments);
    if (Game.confirm) { Game.rects = []; drawConfirm(g); }
  };
}

// ---------------------------------------------------------------- Barakah run: ask before abandoning
function runAskAbandon() {
  askConfirm({ title: 'Abandon this run?', text: Run.wins + (Run.wins === 1 ? ' win' : ' wins') + ' so far. If you leave now, the run ends here.',
    yes: ['Abandon run', () => { Run.active = false; Game.screen = 'runend'; Game.idx = 0; }], no: ['Keep playing'] });
}
BACK.runmap = runAskAbandon;
BACK.runchoice = runAskAbandon;

// ---------------------------------------------------------------- pause offline matches when the window loses focus
function blurPause() {
  if (Game.screen !== 'play' || Net.role || M.attract || Game.paused || Game.confirm || !M.players) return;
  Game.paused = true; Game.idx = 0; Game.blurPaused = true;
}
try {
  addEventListener('blur', blurPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) blurPause(); });
} catch (e) {}

// ---------------------------------------------------------------- the pause menu
function pauseTimeoutInfo() {
  const t = typeof timeoutTeam === 'function' ? timeoutTeam() : -1;
  if (!M.timeouts || t < 0 || Net.role || M.mini || M.practice) return null;
  return canCallTimeout(t) ? null : { left: M.timeouts[t], why: M.timeouts[t] > 0 ? 'Your team calls a timeout when it has the ball.' : 'No timeouts left.' };
}
{
  const _pi = pauseItems;
  pauseItems = function () {
    let it = _pi.apply(this, arguments);
    // the timeout you can't call: greyed out, with the reason
    it = it.map(x => (/^Timeout \(/.test(x[0]) ? Object.assign([x[0].replace(/:.*$/, ''), () => { SFX.bad && SFX.bad(); }], { off: true, why: (pauseTimeoutInfo() || {}).why || 'Only with the ball.' }) : x));
    // leaving throws the match away: ask first
    it = it.map(x => (/^(Quit to title|Leave game|Leave online game|End game)/.test(x[0]) ? [x[0], () => askConfirm({
      title: /online/i.test(x[0]) ? 'Leave the online game?' : 'Leave this game?',
      text: M.career ? 'The game won’t count: no result, no stats, no reward.' : /online/i.test(x[0]) ? 'Your friend will be left on their own.' : 'The score won’t be saved.',
      yes: ['Leave', x[1]], no: ['Keep playing'] })] : x));
    // help and settings without leaving the match
    const at = Math.max(1, it.findIndex(x => /^Camera|^(Quit|Leave|End game)/.test(x[0])));
    const extra = [['How to play', () => { Game.retPlay = { screen: Game.screen }; Game.screen = 'howto'; }],
      ['Settings: sound, display, accessibility', () => { Game.retPlay = { screen: Game.screen }; Game.screen = 'settings'; Game.idx = 0; }]];
    if (Game.screen === 'play' && !Net.role) it.splice(at, 0, ...extra);   // (online the match must keep running on this screen)
    return it;
  };
  drawPause = function (g) {
    dim(g, 0.72);
    const it = pauseItems(), n = it.length, gap = n > 6 ? 34 : 38, y0 = Math.max(150, 232 - n * 9);
    Game.idx = Game.idx % n;
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `40px ${FONT}`; g.fillText('Paused', W / 2, y0 - 60);
    let note = Game.blurPaused ? 'Paused because the game lost focus. Resume when you’re ready.' : '';
    if (typeof Pad !== 'undefined' && Pad.lost && Pad.lost.length) note = 'Player ' + (Pad.lost[0] + 1) + '’s controller disconnected. Reconnect it (in any order) or use the keyboard.';
    if (note) { g.fillStyle = '#ffd76a'; g.font = `14px ${BODY}`; g.fillText(note, W / 2, y0 - 30); }
    if (it[Game.idx] && it[Game.idx].off) Game.idx = it.findIndex(x => !x.off);
    drawMenu(g, it.map(x => (x.off ? '' : x[0])), Game.idx, y0, i => { if (!it[i].off) it[i][1](); }, null, gap);
    it.forEach((x, i) => { if (!x.off) return;                                   // unavailable: grey text, with the reason, not a button
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(159,179,200,0.75)'; g.font = `17px ${BODY}`; g.fillText(x[0], W / 2, y0 + i * gap - 9);
      g.fillStyle = 'rgba(159,179,200,0.6)'; g.font = `12px ${BODY}`; g.fillText(x.why, W / 2, y0 + i * gap + 8); g.textBaseline = 'alphabetic'; });
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.textAlign = 'center';
    g.fillText('Press F for fullscreen', W / 2, y0 + n * gap + 4);
  };
  const _pn = pauseNav;
  pauseNav = function () {
    const it = pauseItems(), before = Game.idx;
    const r = _pn.apply(this, arguments);
    if (Game.paused && it[Game.idx % it.length] && it[Game.idx % it.length].off) {   // step over an unavailable item
      const dir = Game.idx >= before ? 1 : -1; let i = Game.idx; for (let k = 0; k < it.length && it[i].off; k++) i = (i + dir + it.length) % it.length; Game.idx = i;
    }
    if (!Game.paused) Game.blurPaused = false; return r;
  };
  // callouts (BISMILLAH!, MASHA'ALLAH!) wait while the game is paused or a question is open
  const _dc = drawCalloutsOnly;
  drawCalloutsOnly = function () { if (Game.paused || Game.confirm) return; return _dc.apply(this, arguments); };
  // How to play / Settings opened from the pause menu: no title-screen demo underneath, and back goes to the match
  const _at = attractTick;
  attractTick = function () { if (Game.retPlay && (Game.screen === 'settings' || Game.screen === 'howto')) return; return _at.apply(this, arguments); };
  const _gt = goTitle;
  goTitle = function () {
    const R = Game.retPlay;
    if (R && (Game.screen === 'settings' || Game.screen === 'howto')) { Game.retPlay = null; Game.screen = R.screen; Game.paused = true; Game.idx = 0; return; }
    Game.retPlay = null; return _gt.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- reading areas get a solid panel
// Settings, How to play and the pause menu put text over moving players, court lines and the crowd. The reading area
// now sits on a near-opaque panel; the animated scene still shows around it.
function readingPanel(g, x, y, w, h) { g.save(); g.fillStyle = 'rgba(7,12,20,0.93)'; roundRect(g, x, y, w, h, 18); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.35)'; g.lineWidth = 1.5; g.stroke(); g.restore(); }
{
  const _ds = drawSettings;
  drawSettings = function (g) { readingPanel(g, W / 2 - 330, 70, 660, H - 90); return _ds.apply(this, arguments); };
  const _dh = drawHowTo;
  drawHowTo = function (g) { readingPanel(g, W / 2 - 475, 12, 950, Math.min(H - 24, 500)); return _dh.apply(this, arguments); };
  const _dp = drawPause;
  drawPause = function (g) { const n = pauseItems().length; readingPanel(g, W / 2 - 250, 70, 500, Math.min(H - 100, 150 + n * 40)); return _dp.apply(this, arguments); };
}

// ---------------------------------------------------------------- comfort and sound settings
// Reduced motion (System / Reduced / Full), camera shake, flashes; master, effects and crowd volume; button hints;
// stick deadzone. Saved on this device.
Object.assign(SETTINGS, { motion: 0, shake: 2, flashes: true, hints: true, deadzone: 1, aud: { master: 1, fx: 1, crowd: 1 } });
const SYS_REDUCED = REDUCED_MOTION;
function comfortSave() { try { localStorage.setItem('islamdunk.comfort', JSON.stringify({ m: SETTINGS.motion, s: SETTINGS.shake, f: SETTINGS.flashes ? 1 : 0, h: SETTINGS.hints ? 1 : 0, d: SETTINGS.deadzone, a: SETTINGS.aud })); } catch (e) {} }
function comfortApply() { REDUCED_MOTION = SETTINGS.motion === 0 ? SYS_REDUCED : SETTINGS.motion === 1; sfxApplyVol(); }
(() => { try { const o = JSON.parse(localStorage.getItem('islamdunk.comfort') || 'null'); if (o) Object.assign(SETTINGS, { motion: clamp(o.m | 0, 0, 2), shake: clamp(o.s == null ? 2 : o.s | 0, 0, 2), flashes: o.f !== 0, hints: o.h !== 0, deadzone: clamp(o.d == null ? 1 : o.d | 0, 0, 2), aud: Object.assign({ master: 1, fx: 1, crowd: 1 }, o.a || {}) }); } catch (e) {} })();
function sfxApplyVol() {
  if (!SFX.ctx || !SFX.out) return;
  const A = SETTINGS.aud;
  if (SFX.master) { SFX.master.gain.value = SETTINGS.sound ? A.master : 0; SFX.out.gain.value = 0.55 * A.fx; if (SFX.crowdVol) SFX.crowdVol.gain.value = A.crowd; }
  else SFX.out.gain.value = SETTINGS.sound ? 0.55 * A.master * A.fx : 0;
}
{
  const _si = SFX.init;
  SFX.init = function () {
    const had = !!this.ctx; const r = _si.apply(this, arguments);
    if (!had && this.ctx && this.out && !this.master) {
      try {   // effects and the crowd get their own volume, both under a master volume
        const c = this.ctx; this.master = c.createGain(); this.master.connect(c.destination);
        this.out.disconnect(); this.out.connect(this.master);
        if (this.crowdG) { this.crowdVol = c.createGain(); this.crowdG.disconnect(); this.crowdG.connect(this.crowdVol); this.crowdVol.connect(this.master); }
      } catch (e) {}
      sfxApplyVol();
    }
    return r;
  };
  SFX.setOn = function () { sfxApplyVol(); };
  const _sh = FX.shake;
  FX.shake = function (a) { return _sh.call(this, a * [0, 0.5, 1][SETTINGS.shake]); };
  const _r = render;
  render = function (g) { if (!SETTINGS.flashes) { FX.flashA = 0; FX.flashes = []; if (M.players) for (const p of M.players) p.greenFlash = 0; } return _r.apply(this, arguments); };
  // the stick's deadzone: Low / Normal / High
  Pad.stick = function (g) {
    const DZ = [0.12, 0.2, 0.3][SETTINGS.deadzone], ax = +(g.axes && g.axes[0]) || 0, ay = +(g.axes && g.axes[1]) || 0, m = Math.hypot(ax, ay);
    if (!(m > DZ)) return { x: 0, z: 0, m: 0 };
    const k = Math.min(1, (m - DZ) / (1 - DZ)), c = k * k * (3 - 2 * k) * 0.35 + k * 0.65;
    return { x: ax / m * c, z: ay / m * c, m: c };
  };
  const pct = v => Math.round(v * 100) + '%', vol = k => ({ label: { master: 'Master volume', fx: 'Effects volume', crowd: 'Crowd volume' }[k], get: () => pct(SETTINGS.aud[k]),
    step: d => { SETTINGS.aud[k] = clamp(Math.round((SETTINGS.aud[k] + (d || 1) * 0.1) * 10) / 10, 0, 1); if ((d || 1) > 0 && SETTINGS.aud[k] === 0) SETTINGS.aud[k] = 0; comfortSave(); sfxApplyVol(); SFX.blip && SFX.blip(); } });
  const after = (label, item) => { const i = SET_ITEMS.findIndex(s => s.label === label); SET_ITEMS.splice(i >= 0 ? i + 1 : SET_ITEMS.length - 1, 0, item); };
  after('Sound', vol('master')); after('Master volume', vol('fx')); after('Effects volume', vol('crowd'));
  after('Team colors', { label: 'Reduced motion', get: () => ['System (' + (SYS_REDUCED ? 'reduced' : 'full') + ')', 'Reduced', 'Full'][SETTINGS.motion], step: d => { SETTINGS.motion = (SETTINGS.motion + (d || 1) + 3) % 3; comfortSave(); comfortApply(); } });
  after('Reduced motion', { label: 'Camera shake', get: () => ['Off', 'Light', 'Full'][SETTINGS.shake], step: d => { SETTINGS.shake = (SETTINGS.shake + (d || 1) + 3) % 3; comfortSave(); } });
  after('Camera shake', { label: 'Flashes', get: () => SETTINGS.flashes ? 'On' : 'Off', step: () => { SETTINGS.flashes = !SETTINGS.flashes; comfortSave(); } });
  after('Depth aids', { label: 'Button hints', get: () => SETTINGS.hints ? 'On' : 'Off', step: () => { SETTINGS.hints = !SETTINGS.hints; comfortSave(); } });
  after('Button hints', { label: 'Stick deadzone', get: () => ['Low', 'Normal', 'High'][SETTINGS.deadzone], step: d => { SETTINGS.deadzone = (SETTINGS.deadzone + (d || 1) + 3) % 3; comfortSave(); } });
  const G = n => SET_GROUPS.find(g => g.name === n);
  if (G('Accessibility')) G('Accessibility').labels.push('Reduced motion', 'Camera shake', 'Flashes');
  // (Controls & camera is already full on touch: Button hints goes to Display, the deadzone sits with vibration)
  const disp = G('Sound & display'); if (disp) disp.name = 'Display';
  SET_GROUPS.splice(SET_GROUPS.indexOf(disp), 0, { name: 'Sound & controller', labels: ['Sound', 'Master volume', 'Effects volume', 'Crowd volume', 'Controller vibration', 'Stick deadzone'] });
  comfortApply();
}

// ---------------------------------------------------------------- what each setting does
const SET_DESC = {
  'Difficulty': 'How sharp the CPU is: reactions, decisions, defense and shooting. Player ratings never change.',
  'Keep games close (rubber-band)': 'When a team is down by 6 or more, it recovers stamina a little faster and shoots slightly better, and the leading CPU relaxes a touch. Off: no catch-up help for anyone.',
  'Team control': 'Your player: you control one player and the CPU plays your teammate. Whole team: you switch to whoever has the ball.',
  'Career calendar': 'Career days, Jumu’ah and events between games. Off: game after game.',
  'Tomahawk style': 'How a tomahawk dunk looks in the air.',
  'Format': 'Halves, quarters or first to 21 (win by 2).',
  'Period length': 'Minutes on the clock in each half or quarter.',
  'Controls': 'Casual: shots release at the top for you and Defense guards automatically. Offline only: online games use Classic for both players.',
  'Dribble': 'Classic: steady pace. Stride: faster, bigger steps with the ball (NBA Jam pace).',
  'Ball magnet': 'Gently steers you toward loose balls and passes so you catch them. Off: no steering.',
  'Camera (C in game)': 'Broadcast follows the play from the side; other cameras sit higher or closer. C changes it in a game.',
  'Depth aids': 'Floor rings under players and a shadow under the ball, so you can tell who is in front. Full adds depth shading.',
  'Button hints': 'Shows what Move or Shoot will do right now (LAYUP, DUNK) above your player, for keyboard and controller. Touch buttons always say it.',
  'Stick deadzone': 'How far a controller stick must move before your player does. High helps a worn stick that drifts.',
  'Shot release': 'Automatic: your jump shots release at the top for you. Offline only: online games always use timed release.',
  'Text size': 'Larger text in menus and the game. Phones already use a larger minimum size.',
  'Team colors': 'Colorblind-safe swaps team colors for a pair that is easy to tell apart.',
  'Reduced motion': 'Less screen shake, slow motion and particles. System follows your device setting.',
  'Camera shake': 'How much the screen shakes on dunks and big hits.',
  'Flashes': 'Bright flashes on big moments and perfect releases. Off removes them.',
  'Sound': 'All sound on or off.', 'Master volume': 'Everything together.', 'Effects volume': 'The ball, shoes, rim, whistles and calls.', 'Crowd volume': 'The crowd bed and its cheers.',
  'Controller vibration': 'Rumble on dunks, blocks and big hits (controllers that support it).',
  'Fullscreen (F)': 'Fill the screen. F toggles it any time.', 'Resolution': 'Auto picks a sharp resolution your device can run smoothly.',
  'Show network info': 'Online: a small box with the connection type, ping and how smooth it is.'
};
{
  const _ds = drawSettings;
  drawSettings = function (g) {
    const r = _ds.apply(this, arguments);
    if (Game.setGroup == null) return r;
    const L = setGroupItems(Game.setGroup), it = L[Game.idx], d = it && SET_DESC[it.label];
    if (!d) return r;
    g.save(); g.textAlign = 'center'; g.fillStyle = '#c9d6e3'; g.font = `13px ${BODY}`;
    const lines = textLines(g, d, 600); lines.slice(0, 3).forEach((t, k) => g.fillText(t, W / 2, H - 30 - (Math.min(3, lines.length) - 1 - k) * 17));
    g.restore(); return r;
  };
  // a saved preference that the mode overrides says so (online uses Classic controls and timed release)
  for (const lab of ['Controls', 'Shot release']) { const s = SET_ITEMS.find(x => x.label === lab); if (!s) continue; const _g = s.get; s.get = function () { const v = _g.apply(this, arguments); return Net.role && /Casual|Automatic/.test(v) ? v + ' (off online)' : v; }; }
}

// ---------------------------------------------------------------- the tutorial: a layup lesson, and a way into a match
// Layups moved to MOVE (toward the rim) in 9.9 and the tutorial never taught them. A lesson after the dunk: drive and
// press Move toward the basket; it goes up by itself. The last card offers Play a match (team select), Again, Exit.
{
  const i = TUT_STEPS.findIndex(s => s.title === 'Dunk');
  TUT_STEPS.splice(i + 1, 0, {
    title: 'Layup',
    text: () => tk('Drive in and press H toward the rim: a layup, released for you. K near the rim: a dunk or a floater.',
      'Drive in and tap MOVE (it says LAYUP): released for you. SHOOT near the rim: a dunk or a floater.',
      'Drive in and press Y toward the rim: a layup, released for you. A near the rim: a dunk or a floater.'),
    setup() { const h = attackHoop(0); tutPlace({ me: [h.x + h.dir * 220, h.z + 60], ball: true }); },
    done: s => s.layup
  });
  const _ts = tutStep;
  tutStep = function () { const me = TUT.on && M.players && tutMe(); if (me && me.layKind && (me.layPend || me.state === 'windup' || me.state === 'shoot' || me.state === 'sig')) TUT.s.layup = true; return _ts.apply(this, arguments); };
  const last = TUT_STEPS[TUT_STEPS.length - 1];
  last.text = () => 'That’s the whole game. Play a match now, or run the lesson again. Want it simpler? Settings → Controls: Casual.';
}
// a first-launch choice (once per device): learn the basics, or play now. Never for automated test browsers.
function showWelcome() {
  try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {}
  askConfirm({ title: 'Assalamu alaikum! New here?', text: 'A two-minute tutorial teaches moving, shooting, layups, dunks, passing and defense. You can always find it in Quick Play.',
    yes: ['Learn the basics', () => startTutorial()], no: ['Play now'] });
  Game.confirm.sel = 1;
}
{
  let asked = false;
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const r = _gu.apply(this, arguments);
    if (!asked && Game.screen === 'title' && !Game.confirm) {
      asked = true;
      let seen = true; try { seen = localStorage.getItem('islamdunk.welcomed') === '1' || !!localStorage.getItem('islamdunk.profile') || !!(typeof C !== 'undefined' && C); } catch (e) {}
      if (!seen && !(typeof navigator !== 'undefined' && navigator.webdriver) && !/[?&](nowelcome|review|net)=/.test(location.search)) showWelcome();
    }
    return r;
  };
}

// ---------------------------------------------------------------- button hints (keyboard / controller)
// Touch buttons already change their labels. With a keyboard or controller, a small hint above your player says what
// a button will do right now: LAYUP · H when Move would lay it up, DUNK · K when Shoot would dunk. (Settings → Display.)
function hintKey(k) { const pad = Input.lastDev === 'pad'; return pad ? { x: 'Y', b: 'A' }[k] : { x: 'H', b: 'K' }[k]; }
{
  const _dh = drawHot;
  drawHot = function (g) {
    _dh.apply(this, arguments);
    if (!SETTINGS.hints || Input.touchMode || !M.players || M.phase !== 'live' || M.mini || Game.paused || M.attract) return;
    const me = M.players.find(q => q.human === (Net.role === 'guest' ? 1 : 0)); if (!me || ball.owner !== me || me.state !== 'free' || me.y > 1) return;
    const c = me.cmd || {}; let txt = null;
    if (typeof layupOK === 'function' && Math.hypot(c.mx || 0, c.mz || 0) > 0.3 && layupOK(me, c) && !(me.fire && c.turbo)) txt = 'LAYUP · ' + hintKey('x');
    else if (canDunk(me)) txt = 'DUNK · ' + hintKey('b');
    if (!txt) return;
    const [x, y] = P(me.x, me.y + 150, me.z), sp = textSprite(txt, 12, '#ffe7a3', '#1a1210', 3);
    g.save(); g.globalAlpha = 0.9; drawTextSprite(g, sp, x, y); g.restore();
  };
}

// ---------------------------------------------------------------- the lobby says which assists are offline only
{
  const _dl = drawLobby;
  drawLobby = function (g) {
    _dl.apply(this, arguments);
    g.save(); g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`;
    wrapText(g, 'Online, both players use the same rules: timed shot release and Standard controls. Automatic release and Casual controls are offline only.', 48, 352, 234, 15);
    g.restore();
  };
}

// ---------------------------------------------------------------- why a shot missed (optional)
// Settings → Game → Miss breakdown. After your own missed jump shot or layup, one short line says what went into it:
// "Release: early · Contest: heavy · Range: three". Off by default; the shot itself is unchanged.
SETTINGS.missWhy = false;
try { SETTINGS.missWhy = localStorage.getItem('islamdunk.misswhy') === '1'; } catch (e) {}
const MissWhy = { show: null };
function missWhyRead(p) {                       // the release, the contest and the range, read as the shot goes up
  const h = attackHoop(p.team), apex = apexT(p), e = Math.abs(p.st_t - apex), win = shotWindow(p), d = dxz(p, h);
  const od = nearestOppDist(p.x, p.z, p.team), air = p.opps.some(o => o.y > 25 && dxz(o, p) < 60);
  const rel = p.layAuto ? 'auto' : win > 0 && e <= win ? 'perfect' : win > 0 && e <= win * 3 ? 'good' : p.st_t < apex ? 'early' : 'late';
  const cont = od < 25 || air ? 'heavy' : od < 70 ? 'light' : 'open';
  const rng = d < 150 ? 'close' : isThree(p.x, p.z, h) ? (d > THREE_R + 80 ? 'deep' : 'three') : 'mid';
  return 'Release: ' + rel + '  ·  Contest: ' + cont + '  ·  Range: ' + rng;
}
{
  const _rs = releaseShot;
  releaseShot = function (p) {
    const mine = SETTINGS.missWhy && p.human >= 0 && ball.owner === p && Net.role !== 'guest' && !M.attract && !M.mini;
    const why = mine ? missWhyRead(p) : null;
    const r = _rs.apply(this, arguments);
    if (why && ball.shot && ball.shot.shooter === p && !ball.shot.dunk) ball.shot.why = why;
    return r;
  };
  let watch = null;
  const _um = updateMatch;
  updateMatch = function () {
    const r = _um.apply(this, arguments);
    const s = ball.shot;
    if (ball.state === 'shot' && s && s.why && s !== watch) watch = s;
    if (watch && (ball.state !== 'shot' || ball.shot !== watch)) {        // the shot is over: a miss gets its line
      if (!watch.make) MissWhy.show = { t: 0, txt: watch.why };
      watch = null;
    }
    if (MissWhy.show && (MissWhy.show.t += STEP) > 3) MissWhy.show = null;
    return r;
  };
  const _r = render;
  render = function (g) {
    _r(g);
    const S = MissWhy.show; if (!S || Game.screen !== 'play' || Game.paused || !M.players) return;
    const a = Math.min(1, S.t * 5, (3 - S.t) * 2);
    g.save(); g.globalAlpha = a; g.font = `13px ${BODY}`; const w = g.measureText(S.txt).width + 28, y = H - 118;
    g.fillStyle = 'rgba(8,16,28,0.86)'; roundRect(g, W / 2 - w / 2, y, w, 26, 13); g.fill();
    g.fillStyle = IVORY; g.textAlign = 'center'; g.fillText(S.txt, W / 2, y + 18); g.restore();
  };
  const i = SET_ITEMS.findIndex(s => s.label === 'Team control');
  SET_ITEMS.splice(i >= 0 ? i + 1 : SET_ITEMS.length - 1, 0, { label: 'Miss breakdown', get: () => SETTINGS.missWhy ? 'On' : 'Off',
    step: () => { SETTINGS.missWhy = !SETTINGS.missWhy; try { localStorage.setItem('islamdunk.misswhy', SETTINGS.missWhy ? '1' : '0'); } catch (e) {} } });
  const G = SET_GROUPS.find(g => g.name === 'Game'); if (G) { G.labels.push('Miss breakdown'); G.labels.splice(G.labels.indexOf('Tomahawk style') >>> 0, 1); }   // (Tomahawk style moves to Display: Game stays at 7)
  SET_DESC['Miss breakdown'] = 'After your own missed shot, one line: how your release was, how hard it was contested, and the range. Off: no line.';
}

// ---------------------------------------------------------------- playtest: what players mean near the rim
// Each logged game (PossLog, exported from the test panel) counts, for human players with the ball within layup range:
// layups (and how squarely the stick pointed at the rim), skill moves made there instead, and floaters / dunks from
// SHOOT. layupIntent(games) sums them, to see whether MOVE toward the rim catches people who meant a dribble move.
{
  const near = p => { const h = attackHoop(p.team); return dxz(p, h) <= 240; };
  const I = () => PossLog.game && (PossLog.game.intent || (PossLog.game.intent = { lay: 0, layStraight: 0, layAngled: 0, skillNear: 0, skillAtRim: 0, floater: 0, dunk: 0 }));
  const _sl = startLayup;
  startLayup = function (p) {
    const o = p.human >= 0 && !M.mini && I();
    if (o) { const c = p.cmd || {}, H = hoopDir(p), m = Math.hypot(c.mx || 0, c.mz || 0) || 1, cos = ((c.mx || 0) * H.fx + (c.mz || 0) * H.fz) / m; o.lay++; if (cos > 0.85) o.layStraight++; else o.layAngled++; }
    return _sl.apply(this, arguments);
  };
  const _dm = startDribbleMove;
  startDribbleMove = function (p) {
    const o = p.human >= 0 && !M.mini && ball.owner === p && near(p) && I();
    if (o) { o.skillNear++; if (dxz(p, attackHoop(p.team)) < 150) o.skillAtRim++; }
    return _dm.apply(this, arguments);
  };
  const _ss = startShot;
  startShot = function (p) {
    const r = _ss.apply(this, arguments), o = p.human >= 0 && !M.mini && p.state === 'windup' && !p._layGo && near(p) && I();
    if (o && p.shotType === 'floater') o.floater++;
    return r;
  };
  const _sd = typeof startDunk === 'function' ? startDunk : null;
  if (_sd) startDunk = function (p) { const o = p.human >= 0 && !M.mini && I(); if (o) o.dunk++; return _sd.apply(this, arguments); };
}
function layupIntent(games) {
  const t = { games: 0, lay: 0, layStraight: 0, layAngled: 0, skillNear: 0, skillAtRim: 0, floater: 0, dunk: 0 };
  for (const g of games || PossLog.load()) if (g.intent) { t.games++; for (const k in g.intent) t[k] += g.intent[k]; }
  const near = t.lay + t.skillNear + t.floater + t.dunk;
  t.share = near ? { layup: +(t.lay / near).toFixed(2), skill: +(t.skillNear / near).toFixed(2), floater: +(t.floater / near).toFixed(2), dunk: +(t.dunk / near).toFixed(2) } : null;
  return t;
}
