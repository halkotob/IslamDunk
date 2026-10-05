// ============================================================ NAVIGATION
// Every menu screen gets an on-screen Back button (top-left). The same action
// runs for Esc on keyboards, so taps and keys always agree.
const BACK = {
  title: () => closeSub('title'),
  hub: () => { if (Game.hubMenu && Game.hubMenu.open) Game.hubMenu.open = false; else closeSub('hub'); },
  select: () => selectBack(),
  venue: () => { Game.screen = 'select'; },
  bests: () => { Game.screen = 'title'; },
  achievements: () => { Game.screen = 'title'; },
  about: () => { Game.screen = 'title'; },
  funmodes: () => goTitle(), settings: () => goTitle(), howto: () => goTitle(), online: () => goTitle(),
  joincode: () => goTitle(), hostlobby: () => goTitle(), netwait: () => goTitle(), bracket: () => goTitle(),
  cmenu: () => goTitle(), creator: () => { if (Game.creator.isNew) { Game.screen = 'cmenu'; Game.idx = 0; } else careerHub(); },
  namekeys: () => { Game.screen = 'creator'; }, story: () => Game.story.then(),
  train: () => careerHub(), pregame: () => careerHub(), cbracket: () => careerHub(),
  saves: () => careerHub(), shop: () => careerHub(), masjid: () => careerHub(),
  office: () => { if (Game.office && Game.office.panel) Game.office.panel = null; else leaveOffice(); },
  gym: () => { if (Gym.overlay === 'drills') { if (!closeSub('gymdrills')) Gym.overlay = null; return; } if (Gym.drill) { Gym.drill = null; setupPractice('free'); gymToast('Drill stopped'); } else careerHub(); },
  musalla: () => musallaBack()
};
function backVisible() {
  const s = Game.screen;
  if (!BACK[s]) return false;
  if (s === 'gym') return (!Gym.overlay || Gym.overlay === 'drills') && !Gym.walk && !Gym.fade && !Gym.result;
  if (s === 'musalla') return !Gym.overlay;
  if (s === 'title') return menuState('title').sub >= 0;
  if (s === 'hub') return menuState('hub').sub >= 0 || (Game.hubMenu && Game.hubMenu.open);
  return true;
}
function drawBackButton(g) {
  if (!backVisible()) return;
  const label = Game.screen === 'story' ? 'Skip' : (Game.screen === 'musalla' && Game.mus && Game.mus.talk) || (Game.screen === 'hub' && Game.hubMenu && Game.hubMenu.open) ? 'Close' : 'Back';
  const hov = hovering(8, 8, 80, 32), pr = pressing(8, 8, 80, 32);
  g.fillStyle = pr ? '#c9a24a' : hov ? GOLD : 'rgba(8,16,24,0.85)'; roundRect(g, 8, 8, 80, 32, 16); g.fill();
  g.strokeStyle = 'rgba(232,195,90,0.7)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = hov || pr ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText('\u2039 ' + label, 48, 29);
  addRect(4, 4, 90, 42, () => BACK[Game.screen]());
}
function drawPauseButton(g) {
  g.fillStyle = 'rgba(8,16,24,0.7)'; roundRect(g, W - 48, 8, 38, 32, 8); g.fill();
  g.fillStyle = '#fff'; g.fillRect(W - 36, 15, 5, 18); g.fillRect(W - 27, 15, 5, 18);
  addRect(W - 54, 4, 50, 42, () => { Game.paused = true; Game.idx = 0; });
}

// ============================================================ FULLSCREEN
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (isFullscreen()) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { fsUnavailable(); return; }
    const pr = req.call(el, { navigationUI: 'hide' });
    const lock = () => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); };
    if (pr && pr.then) pr.then(lock).catch(fsUnavailable); else lock();
  } catch (e) { fsUnavailable(); }
}
function fsUnavailable() { toast('Fullscreen isn\u2019t available here. Turn your phone sideways for the biggest view.'); }
function drawFsButton(g, x, y) {
  g.fillStyle = 'rgba(8,16,24,0.7)'; roundRect(g, x, y, 38, 32, 8); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath();
  const a = 8, x0 = x + 9, y0 = y + 7, x1 = x + 29, y1 = y + 25, o = isFullscreen() ? -1 : 1;
  for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    const px = o > 0 ? cx : cx + sx * a, py = o > 0 ? cy : cy + sy * a;
    g.moveTo(px + sx * a * o, py); g.lineTo(px, py); g.lineTo(px, py + sy * a * o);
  }
  g.stroke();
  addRect(x - 4, y - 4, 46, 40, toggleFullscreen);
}

// ================================================================ TOASTS
function toast(msg, t = 3.5) { Game.toastMsg = msg; Game.toastT = t; }
function drawToast(g, rdt) {
  if (!(Game.toastT > 0)) return;
  g.globalAlpha = clamp(Game.toastT, 0, 1);
  g.font = `14px ${BODY}`; const w = Math.min(W - 40, g.measureText(Game.toastMsg).width + 40);
  g.fillStyle = 'rgba(8,16,24,0.9)'; roundRect(g, W / 2 - w / 2, H - 94, w, 34, 17); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(Game.toastMsg, W / 2, H - 72);
  g.globalAlpha = 1;
}

