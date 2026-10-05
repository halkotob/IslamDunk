# Islam Dunk

An Islamic-inspired 2v2 arcade basketball game: masjid-league teams, career mode, online play with a friend,
and mini games. Plays in the browser (GitHub Pages, phones included) and as a desktop app (Electron, headed
for Steam).

**Play:** https://halkotob.github.io/IslamDunk/

## Quick start

```bash
npm install                 # Node 20+ (tested on 22)
npm run dev                 # http://localhost:5173 — live reload on every save
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server for the web build. Edits under `src/` or `web/` reload the page; stack traces point at `src/` files (source map). |
| `npm run build:web` | `dist/web/`: the single-file web build (`index.html` with the script inlined, plus icons and manifest). |
| `npm run publish:web` | Builds the web version and copies it to the repo root, which is what GitHub Pages serves. Commit the result. |
| `npm run check:pages` | Fails if the root `index.html` is out of date with `src/`. |
| `npm run electron` | Builds the desktop renderer and opens the game in Electron. |
| `npm run electron:dev` | Electron pointed at a live-reloading dev server. |
| `npm run build:electron` | Unpacked desktop app for this OS in `release/` (e.g. `release/linux-unpacked/islam-dunk`). |
| `npm run dist:electron` | Desktop installers (Windows NSIS, macOS DMG, Linux AppImage), built on the matching OS. |
| `npm test` | Builds the web version and runs the regression suite (below). |
| `npm run test:electron` | Desktop playthrough test (needs a display; on headless Linux use `xvfb-run -a npm run test:electron`). |

The tests use Playwright's Chromium. If it isn't installed on your machine: `npx playwright install chromium`.

## How the code is organised

```
src/                 the game, split along its original section markers
  core/              config, utils + audio, input, touch controls, mobile/browser fit
  sim/               hoop/net + ball physics, players, animation, AI, match rules, fouls, gameplay layers
  render/            renderer, venues, camera + depth, backdrops + crowds, game feel, logo, visuals
  screens/           screen flow, menus + main loop, navigation, challenges, scenarios, in-game UI
  career/            career mode, gym + drills, salah, career screens, masjid projects, office, seasons, Barakah Run
  online/            Net + transports (claude.ai room, Firebase, loopback), lobby, lag work, P2P, game settings
  data/              teams, trivia bank (append-only!), achievements, venue specs
  boot.js            starts the game (must stay last)
  manifest.json      the order the files are joined in
web/index.html       page shell: head, CSS, overlays; %%GAME_SCRIPT%% marks where the script goes
assets/              icons + web app manifest (copied into every build)
electron/            desktop app: main process, preload, save bridge, electron-builder config
tools/               the Vite plugin that assembles the game
scripts/             Pages publishing, Electron dev launcher
tests/               regression suite (web + desktop) and online transport fakes
```

**One shared scope, on purpose.** The files are *not* ES modules with imports and exports. The build joins
them, in `src/manifest.json` order, into the same single classic `<script>` the game always shipped as. The
game is built in layers: each release patches earlier functions (`const _x = fn; fn = function () { ...; _x(); }`,
141 such sites over 106 functions), and code relies on whole-script function hoisting. With real ES modules,
an imported binding is read-only, so every patch site would have to be rewritten into a registry or setter
pattern. That is a logic refactor, not a move. Keeping one scope means:
- the restructure could be proven safe: the first build was **byte-identical** to the old `index.html`;
- adding a file = create it and list it in `src/manifest.json` at the right spot (order matters: a file can
  only patch functions from files listed before it);
- the files can still become real ES modules later, one at a time, without blocking anything now.

Conventions that still apply:
- New features go in a new layer file (or the matching existing one), wrapping earlier functions rather than
  editing them in place.
- Gameplay reads world coordinates only, never camera or projection state.
- Arrays that travel in online snapshots or saves are append-only (`NS`, `NB`, `NP`, `ND`, the trivia bank).
- Save format changes need a migration (`sv` is 3; see `src/screens/scenarios.js`).

See [MIGRATION.md](MIGRATION.md) for the old-line → new-file map.

## GitHub Pages

Pages serves the repository root of `main`: `index.html`, `manifest.webmanifest` and `icons/` there are
**generated**. Don't edit them by hand (and don't upload a replacement `index.html` through the GitHub web UI).
Edit `src/`, run `npm run publish:web`, and commit both.

## Desktop (Electron)

- Window: 16:9, resizable (minimum 960×540), remembers its size, position and fullscreen. **F11** toggles
  fullscreen (the game's own **F** key works too). Alt shows the menu: Game (fullscreen, open save folder,
  quit) and View (window size presets).
- Saves: progress is written to a JSON file in the user data folder, e.g.
  `%APPDATA%/Islam Dunk/saves/islamdunk-save.json` on Windows or `~/.config/Islam Dunk/saves/` on Linux.
  Writes are atomic, with a backup (`.bak`) kept each session. The game still reads and writes `localStorage`;
  on desktop the file is the source of truth, mirrored into `localStorage` at start-up
  (`electron/renderer-bridge.js`). The web build uses `localStorage` only.
- Security: context isolation, sandboxed renderer, no Node in the page; external links open in the browser.
- Not yet: Steamworks (achievements, cloud saves). The achievement table already carries Steam API names
  (`src/data/achievements.js`).

## Online play

Two players, host + guest. Transports: the claude.ai room (inside claude.ai), Firebase Realtime Database
(standalone web and desktop), and a loopback transport for tests (`?net=loop`). Once both are in a lobby, a
direct WebRTC link carries the game when the network allows, with Firebase as the fallback.
Firebase security depends on the Realtime Database rules: writes only to `rooms/<code>/peers/<id>`, with size
limits (allow about 6 KB per peer node).
