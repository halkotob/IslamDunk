// Islam Dunk desktop (Electron main process).
// - One game window: 16:9, resizable, remembers its size/position/fullscreen; F11 toggles fullscreen.
// - Menu: Game (fullscreen, quit), View (window size presets; reload + devtools in dev builds).
// - Saves: the game's save data is written to a JSON file in the user data folder
//   (<userData>/saves/islamdunk-save.json, atomic writes + one backup), via the preload bridge.
//   localStorage stays as the in-page store and the web build's only store.
// - Security: context isolation, sandboxed renderer, no Node in the page, external links open in the
//   system browser, no in-app navigation away from the game.
// Steamworks (achievements, cloud saves) is intentionally not wired yet.
const { app, BrowserWindow, Menu, ipcMain, shell, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const DEV_URL = process.env.ISLAMDUNK_DEV_URL || '';              // set by `npm run electron:dev`
const RENDERER = path.join(__dirname, '..', 'dist', 'electron', 'index.html');
const ICON = path.join(__dirname, '..', 'assets', 'icons', 'icon-512.png');
const SIZES = [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];

app.setName('Islam Dunk');
if (!app.requestSingleInstanceLock()) { app.quit(); }

// ------------------------------------------------------------------ save file store
const Store = {
  dir: null, file: null, data: null, timer: null, backedUp: false,
  init() {
    this.dir = path.join(app.getPath('userData'), 'saves');
    this.file = path.join(this.dir, 'islamdunk-save.json');
    fs.mkdirSync(this.dir, { recursive: true });
    this.data = this.read(this.file) || this.read(this.file + '.bak');   // fall back to the backup if the main file is damaged
  },
  read(f) { try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); return o && typeof o === 'object' && o.v === 1 && o.items ? o : null; } catch (e) { return null; } },
  items() { return this.data ? this.data.items : null; },
  set(k, v) { if (!this.data) this.data = { v: 1, items: {} }; this.data.items[k] = v; this.later(); },
  remove(k) { if (this.data) { delete this.data.items[k]; this.later(); } },
  replace(items) { this.data = { v: 1, items: Object.assign({}, items) }; this.later(); },
  later() { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 300); },
  flush() {
    clearTimeout(this.timer); this.timer = null;
    if (!this.data) return;
    try {
      if (!this.backedUp && fs.existsSync(this.file)) { fs.copyFileSync(this.file, this.file + '.bak'); this.backedUp = true; }   // one backup per session
      this.data.savedAt = new Date().toISOString();
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);                    // atomic replace
    } catch (e) { console.error('save failed', e); }
  },
};
ipcMain.on('store:load', e => { e.returnValue = Store.items(); });
ipcMain.on('store:set', (e, k, v) => { if (typeof k === 'string' && typeof v === 'string') Store.set(k, v); });
ipcMain.on('store:remove', (e, k) => { if (typeof k === 'string') Store.remove(k); });
ipcMain.on('store:replace', (e, items) => { if (items && typeof items === 'object') Store.replace(items); });
ipcMain.on('store:path', e => { e.returnValue = Store.file; });

// ------------------------------------------------------------------ window state
const statePath = () => path.join(app.getPath('userData'), 'window.json');
function loadState() { try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch (e) { return {}; } }
function saveState(win) {
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(statePath(), JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height, fullscreen: win.isFullScreen(), maximized: win.isMaximized() }));
  } catch (e) {}
}
function visible(st) {
  if (st.x == null) return false;
  return screen.getAllDisplays().some(d => { const a = d.workArea; return st.x < a.x + a.width - 50 && st.y < a.y + a.height - 50 && st.x + st.width > a.x + 50 && st.y > a.y - 20; });
}

// ------------------------------------------------------------------ menu
function buildMenu(win) {
  const dev = !!DEV_URL || !app.isPackaged;
  const sizeItems = SIZES.map(([w, h]) => ({
    label: `${w} × ${h}`, click: () => { if (win.isFullScreen()) win.setFullScreen(false); win.setContentSize(w, h); win.center(); },
  }));
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'Game', submenu: [
      { label: 'Toggle Fullscreen', accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11', click: () => win.setFullScreen(!win.isFullScreen()) },
      { type: 'separator' },
      { label: 'Open Save Folder', click: () => shell.openPath(Store.dir) },
      { type: 'separator' },
      { role: 'quit' },
    ] },
    { label: 'View', submenu: [
      { label: 'Window Size', submenu: sizeItems },
      ...(dev ? [{ type: 'separator' }, { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }] : []),
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------------------------------------------------ window
function createWindow() {
  const st = loadState();
  const work = screen.getPrimaryDisplay().workAreaSize;
  const width = st.width || Math.min(1600, Math.round(work.width * 0.8)), height = st.height || Math.round(width * 9 / 16);
  const win = new BrowserWindow({
    width, height, minWidth: 960, minHeight: 540, ...(visible(st) ? { x: st.x, y: st.y } : {}),
    useContentSize: true, backgroundColor: '#060c14', title: 'Islam Dunk', icon: ICON, show: false,
    autoHideMenuBar: true,            // the game is the UI; Alt shows the menu
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: false },
  });
  buildMenu(win);
  if (st.maximized) win.maximize();
  if (st.fullscreen) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  for (const ev of ['resize', 'move', 'enter-full-screen', 'leave-full-screen']) win.on(ev, () => { clearTimeout(win._st); win._st = setTimeout(() => saveState(win), 400); });
  win.on('close', () => { saveState(win); Store.flush(); });

  // links (share link, about page) open in the system browser; the window never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (url !== win.webContents.getURL() && !(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault(); });

  if (DEV_URL) win.loadURL(DEV_URL); else win.loadFile(RENDERER);
  return win;
}

app.whenReady().then(() => {
  Store.init();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('before-quit', () => Store.flush());
app.on('window-all-closed', () => { Store.flush(); if (process.platform !== 'darwin') app.quit(); });
