// Desktop (Electron) smoke + playthrough test.
//   npm run test:electron            (needs a display; on a headless Linux box: xvfb-run -a npm run test:electron)
//   node tests/electron.mjs --packaged   test the unpacked app from `npm run build:electron` instead of `electron .`
//
// Checks: window + menu, save bridge present, a full CPU match, real-time play rendering, a 3-match career,
// the save FILE being written, a relaunch restoring progress from the file alone (Electron's own
// localStorage wiped in between), fullscreen, and online play between two windows (loopback transport).
// Fails on any uncaught page error or console error (network errors for fonts/Firebase are listed
// separately: the game falls back without them).
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PACKAGED = process.argv.includes('--packaged');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'islamdunk-e2e-'));
const saveFile = path.join(userData, 'saves', 'islamdunk-save.json');
const extra = typeof process.getuid === 'function' && process.getuid() === 0 ? ['--no-sandbox'] : [];
const results = []; let failed = 0;
const check = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch(query = '') {
  const env = { ...process.env, ISLAMDUNK_USER_DATA: userData, ISLAMDUNK_QUERY: query };
  delete env.ISLAMDUNK_DEV_URL;
  const opts = PACKAGED
    ? { executablePath: path.join(ROOT, 'release/linux-unpacked/islam-dunk'), args: extra, env }
    : { args: [ROOT, ...extra], env, cwd: ROOT };
  const app = await electron.launch(opts);
  const win = await app.firstWindow();
  const errs = [], net = [];
  const watch = (page, tag) => {
    page.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
    page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); (/ERR_|Failed to load resource|net::/.test(t) ? net : errs).push(`${tag}: ${t}`); });
  };
  watch(win, 'win');
  await win.waitForFunction(() => typeof Game !== 'undefined' && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  return { app, win, errs, net, watch };
}

try {
  // ---------------------------------------------------------------- first launch
  let { app, win, errs, net } = await launch();
  const menu = await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.map(i => i.label));
  check('window + menu', menu.includes('Game') && menu.includes('View'), JSON.stringify(menu));
  const bridge = await win.evaluate(() => !!(window.islamDunkNative && window.islamDunkNative.storage) && typeof require === 'undefined');
  check('save bridge exposed, no Node in the page', bridge);
  check('version', true, await win.evaluate(() => 'v' + VERSION));

  const match = await win.evaluate(() => {
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 30 } });
    let n = 0; for (; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; }
    return { over: M.phase === 'over', score: M.teams[0].score + '-' + M.teams[1].score };
  });
  check('full CPU match to the final buzzer', match.over, match.score);

  await win.evaluate(() => { newMatch(TEAMS[2], TEAMS[3], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; });
  const t0 = await win.evaluate(() => M.time); await sleep(2500); const t1 = await win.evaluate(() => M.time);
  check('real-time play (render loop running)', t1 - t0 > 1.5, `${(t1 - t0).toFixed(2)} s of game time in 2.5 s`);

  const career = await win.evaluate(() => {
    C = freshCareer(); if (!C.bracket) C.bracket = makeBracket(C.stage); saveCareer();
    const out = [];
    for (let g = 0; g < 3; g++) {
      startCareerMatch();
      let n = 0; for (; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; }
      const over = M.phase === 'over'; careerAfterMatch(); out.push(over && Game.screen === 'postgame');
    }
    Game.screen = 'title';
    return { ok: out.every(Boolean), played: C.gamesPlayed };
  });
  check('career: 3 matches -> post-game', career.ok && career.played === 3, 'gamesPlayed ' + career.played);
  await sleep(800);                                        // debounced write
  const onDisk = fs.existsSync(saveFile) ? JSON.parse(fs.readFileSync(saveFile, 'utf8')) : null;
  const keys = onDisk ? Object.keys(onDisk.items) : [];
  check('save file written', !!onDisk && keys.length > 0, `${saveFile.replace(userData, '<userData>')} (${keys.length} keys: ${keys.slice(0, 4).join(', ')}...)`);

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setFullScreen(true));
  await sleep(1200);
  const fsState = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
  const cw = await win.evaluate(() => canvas.getBoundingClientRect().width);
  check('fullscreen', fsState, `canvas ${Math.round(cw)} px wide`);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setFullScreen(false));
  await sleep(600);
  const firstErrs = errs.slice(), firstNet = net.slice();
  await app.close();

  // ---------------------------------------------------------------- relaunch: progress comes back from the file
  fs.rmSync(path.join(userData, 'Local Storage'), { recursive: true, force: true });   // wipe Electron's own localStorage
  ({ app, win, errs, net } = await launch());
  const restored = await win.evaluate(() => { const s = readSave(SAVE_AUTO); return s ? s.gamesPlayed : null; });
  check('relaunch restores the career from the save file', restored === 3, 'gamesPlayed ' + restored);
  const errs2 = errs.slice(); net.forEach(n => firstNet.push(n));
  await app.close();

  // ---------------------------------------------------------------- online: two windows, loopback transport
  ({ app, win, errs, net } = await launch('net=loop&room=e2e'));
  const watchErrs = errs;
  await app.evaluate(({ BrowserWindow }, a) => {
    const src = BrowserWindow.getAllWindows()[0];
    const w = new BrowserWindow({ width: 960, height: 540, show: true, webPreferences: { preload: src.webContents.session.getPreloads()[0] || a.preload, contextIsolation: true, sandbox: true } });
    w.loadURL(src.webContents.getURL());
  }, { preload: path.join(ROOT, 'electron/preload.cjs') });
  let guest = null; for (let i = 0; i < 40 && !guest; i++) { guest = app.windows().find(w => w !== win) || null; if (!guest) await sleep(250); }
  guest.on('pageerror', e => watchErrs.push('guest: ' + e.message));
  await guest.waitForFunction(() => typeof Net !== 'undefined' && Net.avail === 'yes', null, { timeout: 20000 });
  const code = await win.evaluate(() => { Lobby.open(); return Net.code; });
  await guest.evaluate(c => Lobby.join(c), code);
  await guest.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 10000 }).catch(() => {});
  await sleep(2500);
  await win.evaluate(() => { Lobby.opts().game = 'vs'; Net.mode = 'vs'; Lobby.changed(); });
  await guest.evaluate(() => Lobby.setReady(1)); await sleep(700);
  await win.evaluate(() => Lobby.start());
  await guest.waitForFunction(() => Game.screen === 'netplay', null, { timeout: 10000 }).catch(() => {});
  await sleep(2000);
  const on = await guest.evaluate(() => ({ screen: Game.screen, players: M.players.length, p2p: typeof P2P !== 'undefined' && P2P.open }));
  check('online between two desktop windows', on.screen === 'netplay' && on.players === 4, JSON.stringify(on));
  await app.close();

  const allErrs = firstErrs.concat(errs2, watchErrs);
  check('no page or console errors', allErrs.length === 0, allErrs.slice(0, 5).join(' | '));
  if (firstNet.length) results.push(`note  ${firstNet.length} network request(s) failed (fonts/Firebase unreachable here; the game falls back): ${[...new Set(firstNet.map(s => s.replace(/^.*?: /, '')))].slice(0, 2).join(' | ')}`);
} catch (e) {
  check('run', false, String(e && e.stack || e));
} finally {
  fs.rmSync(userData, { recursive: true, force: true });
}
console.log(`Electron ${PACKAGED ? '(packaged app)' : '(electron .)'}\n` + results.join('\n') + `\n\n${failed ? 'FAILED' : 'ALL PASSED'}`);
process.exit(failed ? 1 : 0);
