# Migration notes: single file → src/ (v7.6 restructure)

Until v7.6 the whole game was one `index.html` (13,549 lines, script on lines 69–13,546).
It now lives in 58 files under `src/`, concatenated in the order of `src/manifest.json`.
The page shell (head, CSS, overlay markup) is `web/index.html`; `%%GAME_SCRIPT%%` marks where the script goes.

## Finding old code

**Rule of thumb:** for old line `N` in the range `A–B` below, the code is in that file at line `N − A + 1`.
In the four files marked †, lines after the removed dead code shift up by the number of removed lines (1, or 5 for `skyGrad`).

Stack traces from the built page are in page lines (the build is one script again). Page line `N` is within
8 lines of old line `N`, since only 8 dead lines were removed; use the table, or `npm run dev` for exact files. In `npm run dev`, stack traces
point straight at the `src/` file through the source map.

| Old lines | File | Lines | What |
|---|---|---:|---|
| 69–107 | `src/core/config.js` | 39 | header, strict mode, version, CONFIG |
| 108–141 | `src/data/teams.js` | 34 | TEAMS |
| 142–328 | `src/data/trivia.js` | 187 | TRIVIA BANK (append-only) |
| 329–417 | `src/core/utils-audio.js` | 89 | UTILS, AUDIO (SFX) |
| 418–505 | `src/core/input.js` | 88 | INPUT |
| 506–819 | `src/sim/hoops-ball.js` | 314 | HOOPS & NET physics, BALL |
| 820–1286 | `src/sim/players.js` | 467 | PLAYERS (actions) |
| 1287–1444 | `src/sim/animation.js` | 158 | ANIMATION |
| 1445–1812 | `src/sim/ai.js` | 368 | AI |
| 1813–2109 | `src/sim/match.js` | 297 | MATCH / RULES |
| 2110–2836 | `src/render/renderer.js` | 727 | FX, RENDERER (court, crowd, players, HUD) |
| 2837–3049 | `src/screens/flow.js` | 213 | SCREENS / FLOW, SCREEN DRAW |
| 3050–3449 | `src/screens/menus.js` | 400 | MENUS UI, MAIN LOOP |
| 3450–3972 | `src/online/net.js` | 523 | ONLINE: Firebase config, transports, Net, online screens |
| 3973–4299 | `src/career/career.js` | 327 | CAREER MODE |
| 4300–4607 | `src/career/gym-drills.js` † | 307 | MASJID GYM, DRILLS |
| 4608–4788 | `src/career/salah.js` | 181 | SALAH |
| 4789–5281 | `src/career/career-screens.js` | 493 | CAREER SCREENS |
| 5282–5619 | `src/career/masjid-projects.js` | 338 | MASJID PROJECTS |
| 5620–5701 | `src/screens/navigation.js` | 82 | NAVIGATION, FULLSCREEN, TOASTS |
| 5702–5788 | `src/career/musalla.js` | 87 | MUSALLA |
| 5789–6083 | `src/sim/match-extras.js` | 295 | REPLAY BUFFER, PLAYER OF THE GAME, HOT SPOTS, CLUTCH, SIGNATURE MOVES, FUN MODES, POST-GAME, MULTI-BALL, CAST |
| 6084–6384 | `src/sim/mini-games.js` | 301 | MINI GAME CORE, LIGHTNING, HORSE, MINI HUD |
| 6385–6905 | `src/career/office.js` | 521 | CAREER: GYM, SHEIKH'S OFFICE |
| 6906–6982 | `src/data/venues.js` † | 76 | VENUES: specs, arenas, venue list (data + small helpers) |
| 6983–7427 | `src/render/venues.js` † | 440 | VENUES: layer painting and drawing |
| 7428–7621 | `src/render/camera-depth.js` | 194 | DEPTH + CAMERA, HOOP STANCHION, FLOOR FINISH, LIGHTING |
| 7622–7996 | `src/render/backdrops-crowds.js` † | 374 | OUTDOOR BACKDROPS, CROWDS |
| 7997–8200 | `src/render/game-feel.js` | 204 | GAME FEEL (v3.6) |
| 8201–8343 | `src/screens/challenges.js` | 143 | DAILY HOT SPOT CHALLENGE, PERSONAL BESTS |
| 8344–8580 | `src/core/skill-touch.js` | 237 | v3.9 SKILL + TOUCH controls |
| 8581–8740 | `src/sim/fouls.js` | 160 | v4.0 NET SOUND, v4.1 FOULS + FREE THROWS |
| 8741–8814 | `src/render/logo.js` | 74 | LOGO, LIGHT FIXTURES |
| 8815–9054 | `src/career/musalla-walk.js` | 240 | MUSALLA DETAIL, v4.2 WALKABLE MUSALLA |
| 9055–9098 | `src/render/reactions.js` | 44 | v4.3 FEEL: REACTIONS, MAKE GLOW |
| 9099–9244 | `src/data/achievements.js` | 146 | ACHIEVEMENTS (table + tracker) |
| 9245–9365 | `src/screens/splash-stats.js` | 121 | SPLASH + ABOUT, STATS: HUSTLE + CLUTCH, ARCHETYPES |
| 9366–9552 | `src/sim/skill-expression.js` | 187 | v4.4 SKILL EXPRESSION |
| 9553–9891 | `src/career/progression.js` | 339 | v5.0 PROGRESSION + ECONOMY |
| 9892–10210 | `src/sim/v6-moves.js` | 319 | v6.0 GAMEPLAY DEPTH: helpers, memory, composure, dribble moves, posts, shots, pump fake, passing, screens |
| 10211–10603 | `src/sim/v6-contact.js` | 393 | v6.0: fouls, steals, shoves, stance, blocks, rebounds, contact, dives, per-player hooks |
| 10604–10808 | `src/sim/v6-controls-ai.js` | 205 | v6.0: input to actions, AI moves, timeouts + set plays |
| 10809–10939 | `src/screens/v6-ui.js` | 131 | v6.0: pause menu, HUD, touch labels, how to play, achievements, poses |
| 10940–11330 | `src/career/seasons.js` | 391 | v6.0 SEASONS |
| 11331–11503 | `src/screens/scenarios.js` | 173 | v6.0 DAILY SCENARIOS, SAVE MIGRATION + SCREEN GLUE |
| 11504–11934 | `src/career/barakah-run.js` | 431 | BARAKAH RUN, LOCAL SHARE CARDS, BARAKAH RUN DUOS |
| 11935–12182 | `src/sim/v7-controls.js` | 248 | v7 CONTROL OVERHAUL |
| 12183–12286 | `src/render/v7-cameras-depth.js` | 104 | v7 CAMERA PRESETS + DEPTH AIDS |
| 12287–12442 | `src/online/one-on-one-loopback.js` | 156 | v7.3 ONLINE 1 ON 1, v7.4 LOOPBACK TRANSPORT (tests only) |
| 12443–12741 | `src/online/lobby.js` | 299 | v7.4 ONLINE LOBBY |
| 12742–12880 | `src/online/lag.js` | 139 | v7.4 LAG AND INPUT LAG |
| 12881–12939 | `src/sim/ball-magnet.js` | 59 | v7.4 BALL MAGNET |
| 12940–13067 | `src/core/mobile-fit.js` | 128 | v7.5 MOBILE + BROWSER FIT |
| 13068–13123 | `src/online/game-settings.js` | 56 | v7.6 ONLINE GAME SETTINGS (points target, half court) |
| 13124–13176 | `src/sim/pump-fake-pickup.js` | 53 | v7.6 PUMP FAKE PICKS UP THE DRIBBLE |
| 13177–13311 | `src/online/p2p.js` | 135 | v7.6 PEER-TO-PEER FAST LANE (WebRTC) |
| 13312–13544 | `src/render/visuals-v76.js` | 233 | v7.6 VISUALS PASS |
| 13545–13546 | `src/boot.js` | 2 | start the game |

## Removed dead code (verified unreferenced)

Each name below appeared only at its own definition. A search over all of `src/` and `web/` found no other
reference, and the code has no dynamic name lookups (`eval`, `new Function`, `window[...]`), so nothing could
reach them. None had side effects.

| Old line | File | Removed | Notes |
|---:|---|---|---|
| 4500 | `src/career/gym-drills.js` | `const DRILL_KEYS = [...]` | never read |
| 6913 | `src/data/venues.js` | `const FAR_W = 1700, FAR_PX = 0.4` | never read |
| 7013–7017 | `src/render/venues.js` | `function skyGrad(g, time, h)` | never called |
| 7632 | `src/render/backdrops-crowds.js` | `const ALL_BACKDROPS = [...]` | never read |

Checked and kept: `gymCmd` and `gymExtras` look unused to a naive search, but they are installed as hooks
(`M.cmdHook = gymCmd`, `M.drawExtras = gymExtras`).

## Non-obvious placements

- **Layers, not features, decide the order.** Later releases patch earlier functions
  (`const _x = fn; fn = function () { ...; _x(); }`). A function's *current* behaviour can be spread over
  several files: the original definition, then each layer that wraps it. Search `src/` for `fnName = function`
  to find every layer that wraps `fnName`.
- `src/data/achievements.js` holds the achievement table *and* its tracker (`Ach`); they were one section.
- `src/data/venues.js` is the venue data (specs, arena table, `VENUE_LIST`) plus the small helpers that sat
  between them; all painting is in `src/render/venues.js`.
- `src/screens/menus.js` also contains the MAIN LOOP (`frame`, `resize`, `boot`), as in the original order.
- `src/sim/fouls.js` starts with the v4.0 net-sound tweaks that preceded the fouls section.
- `src/online/net.js` contains `FIREBASE_CONFIG` (public web config by design; security is in the Realtime
  Database rules).
- `src/core/skill-touch.js` is the v3.9 layer: shot-skill tuning plus the on-screen touch controls.
- `src/boot.js` is the single `boot();` call that starts the game; it must stay last.

