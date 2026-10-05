// ================================================= v7.5: MOBILE + BROWSER FIT
// 1. Sizing: fit the canvas to the *visible* area (visualViewport) inside the safe area (notch,
//    rounded corners, home bar), and re-fit as iPhone Safari's toolbars come and go or the phone turns.
// 2. Touch: no browser zoom or page gestures (iOS ignores user-scalable=no): quick second taps,
//    pinches and long-press menus are swallowed, so double-taps reach the game.
// 3. Touch controls scale with the screen and stay clear of the safe area; portrait no longer overlaps.
// 4. Portrait on a phone: full-screen "turn sideways" card (with "play in portrait anyway").
// 5. iPhone has no fullscreen for web pages: the fullscreen button explains Add to Home Screen, which
//    opens the game like an app (manifest.webmanifest). A small tip offers it on the title screen.
// 6. Desktop: the canvas keeps keyboard focus; right-click menus are off.
const IOS = typeof navigator !== 'undefined' && (/iPhone|iPod/.test(navigator.userAgent) || (/iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
function isStandalone() { try { return !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches); } catch (e) { return false; } }
function canFullscreen() { const el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen) && !/iPhone|iPod/.test(navigator.userAgent); }
function safeInsets() {
  const el = document.getElementById('sa'); if (!el) return { t: 0, r: 0, b: 0, l: 0 };
  const cs = getComputedStyle(el), n = v => parseFloat(v) || 0;
  return { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
}
function viewSize() {
  const vv = window.visualViewport, ok = vv && Math.abs((vv.scale || 1) - 1) < 0.01;      // a pinch-zoomed page: fall back
  return ok ? [vv.width, vv.height] : [innerWidth, innerHeight];
}
let fitKey = '';
resize = function () {
  if (!canvas) return;
  const [vw, vh] = viewSize(), I = safeInsets();
  const aw = Math.max(1, vw - I.l - I.r), ah = Math.max(1, vh - I.t - I.b);
  W = clamp(Math.round(H * aw / ah), 960, 1200); layoutTouch();
  const s = Math.min(aw / W, ah / H);
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const cw = Math.floor(W * s), ch = Math.floor(H * s), d = clamp((window.devicePixelRatio || 1) * s, 1, coarse ? 2 : 2.5);
  const key = [cw, ch, W, d].join(',');
  if (key !== fitKey) {
    fitKey = key; dpr = d;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  if (TouchUI.el) TouchUI.layout();
};
function refit() { resize(); for (const t of [80, 250, 600, 1200]) setTimeout(resize, t); }   // iOS reports the new size late
{
  // ---- gestures: nothing zooms, scrolls or pops a menu
  const opt = { passive: false };
  let lastEnd = 0;
  document.addEventListener('touchend', e => { const t = e.timeStamp; if (t - lastEnd < 350 && !(e.target && e.target.closest && e.target.closest('button'))) e.preventDefault(); lastEnd = t; }, opt);
  document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, opt);
  document.addEventListener('touchmove', e => { if (!(e.target && e.target.closest && e.target.closest('#ios-sheet .card'))) e.preventDefault(); }, opt);
  for (const n of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(n, e => e.preventDefault(), opt);
  document.addEventListener('dblclick', e => e.preventDefault(), opt);
  document.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('orientationchange', refit);
  if (window.visualViewport) { visualViewport.addEventListener('resize', resize); visualViewport.addEventListener('scroll', () => { if (scrollY || scrollX) scrollTo(0, 0); }); }
  addEventListener('pageshow', refit);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refit(); });

  // ---- touch controls: size from the screen, keep out of the safe area
  TouchUI.R = function () { return Math.round((this.portrait ? 54 : 56) * (this.k || 1)); };
  const _lay = TouchUI.layout.bind(TouchUI);
  TouchUI.layout = function () {
    if (!this.el) return;
    const vw = innerWidth, vh = innerHeight, P = vh > vw, I = safeInsets();
    this.portrait = P; this.k = P ? clamp(vw / 430, 0.78, 1.05) : clamp(vh / 400, 0.76, 1.15);
    _lay(); if (!this.btns || !this.btns.shoot) return;
    const k = this.k, cv = canvas.getBoundingClientRect(), R = this.R();
    const top = P ? Math.max(cv.bottom + 8, vh * 0.45) : vh * 0.4, zoneH = vh - top;
    Object.assign(this.zone.style, { left: I.l + 'px', top: top + 'px', height: zoneH + 'px', width: (P ? vw * 0.48 : vw * 0.4) + 'px' });
    this.homeX = R + (P ? 22 : 18) * k; this.homeY = zoneH - R - I.b - (P ? 34 : 16) * k;
    const s = (P ? 1.12 : 1) * k, pad = (P ? 20 : 14) + I.r, bot = (P ? 30 : 12) + I.b;
    const place = (b, size, right, bottom) => Object.assign(b.style, { width: size * s + 'px', height: size * s + 'px', right: right * s + pad + 'px', bottom: bottom * s + bot + 'px', fontSize: (size > 80 ? 15 : 12.5) * s + 'px' });
    place(this.btns.shoot, 92, 0, 0); place(this.btns.pass, 76, 104, 4); place(this.btns.cross, 72, 18, 104);
    this.drawStick();
  };

  // ---- portrait card
  const rot = document.getElementById('rotate');
  try { if (sessionStorage.getItem('islamdunk.portraitOK')) document.documentElement.classList.add('port-ok'); } catch (e) {}
  if (rot) rot.querySelector('.go').addEventListener('click', () => { document.documentElement.classList.add('port-ok'); try { sessionStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} refit(); });

  // ---- iPhone: Add to Home Screen instead of fullscreen
  const sheet = document.getElementById('ios-sheet'), tip = document.getElementById('ios-tip');
  const showSheet = () => { if (sheet) sheet.classList.add('on'); if (tip) tip.classList.remove('on'); };
  if (sheet) sheet.querySelector('button').addEventListener('click', () => sheet.classList.remove('on'));
  const TIP_KEY = 'islamdunk.homeTip';
  const tipCount = () => { try { return +localStorage.getItem(TIP_KEY) || 0; } catch (e) { return 9; } };
  if (tip) {
    tip.querySelector('.how').addEventListener('click', () => { try { localStorage.setItem(TIP_KEY, '9'); } catch (e) {} showSheet(); });
    tip.querySelector('.x').addEventListener('click', () => { try { localStorage.setItem(TIP_KEY, '9'); } catch (e) {} tip.classList.remove('on'); });
  }
  let tipShown = false;
  setInterval(() => {                                          // the tip shows on the title screen only, a few visits at most
    if (!tip || !IOS || isStandalone() || canFullscreen()) return;
    const want = Game.screen === 'title' && !(sheet && sheet.classList.contains('on')) && (tipShown || tipCount() < 3);
    if (want && !tipShown) { tipShown = true; try { localStorage.setItem(TIP_KEY, String(tipCount() + 1)); } catch (e) {} }
    tip.classList.toggle('on', want);
  }, 400);
  const _tf = toggleFullscreen;
  toggleFullscreen = function () {
    if (canFullscreen()) return _tf.apply(this, arguments);
    if (isStandalone()) { toast('You’re already playing fullscreen.'); return; }
    if (IOS) { showSheet(); return; }
    return _tf.apply(this, arguments);
  };
  const _fb = drawFsButton;
  drawFsButton = function (g, x, y) { if (isStandalone() && !canFullscreen()) return; return _fb(g, x, y); };   // home-screen app: nothing to toggle

  // ---- fix (v7.4 lobby): back in the lobby, the guest kept simulating the finished online match it had
  //      only mirrored, which could turn the camera into NaN and crash the lobby's backdrop. Start a
  //      fresh CPU demo instead (as the title screen does), and never let a bad camera reach the renderer.
  const _gb = Lobby.guestBack.bind(Lobby);
  Lobby.guestBack = function () { _gb(); try { startAttract(); } catch (e) {} };
  const _uc = updateCamera;
  updateCamera = function (dt) {
    _uc(dt);
    const bad = v => typeof v === 'number' && !Number.isFinite(v);
    if (bad(cam.x) || bad(cam.zoom) || bad(cam.fx) || bad(cam.fy) || (cam.des && (bad(cam.des.fx) || bad(cam.des.fy) || bad(cam.des.z)))) {
      Object.assign(cam, { x: 180, zoom: 1, fx: 660, fy: H / 2, punch: 0 }); cam.des = null; cam.vel = null;
    }
  };
  // ---- desktop: keyboard focus stays on the game (pointerdown's preventDefault would otherwise block it)
  const _b = boot;
  boot = function () {
    _b();
    canvas.addEventListener('pointerdown', () => { try { canvas.focus({ preventScroll: true }); } catch (e) {} });
    try { canvas.focus({ preventScroll: true }); } catch (e) {}
    refit();
  };
}

