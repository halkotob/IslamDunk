# Improvements backlog

Ideas found by reviewing the codebase, to be pulled into development by priority. Add new findings here, mark the
ones in progress, and move finished ones to **Done** with the version that shipped them.

Score: **Priority = (Impact + Risk) × (6 − Effort)**, each from 1 to 5. Higher is sooner.

| # | Item | Source | Impact | Risk | Effort | Priority | Status |
|---|------|--------|:-:|:-:|:-:|:-:|---|
| B1 | Rollback: a half-court game is half court on the host only (two different games) | code review | 5 | 5 | 1 | **50** | done in 9.17.1 |
| B2 | Rollback: each phone uses its own owner's taunt for both players (desync) | code review | 4 | 4 | 1 | **40** | done in 9.17.1 |
| B20 | Rollback: your own equipped celebration (Options → Profile) is read from each phone's own profile; 9.17.0 uses cast celebrations online, but check every profile cosmetic that changes a pose inside a rollback match | code review | 4 | 4 | 1 | **40** | open |
| B3 | Rollback: a dropped direct link is never retried during the match | code review | 4 | 4 | 2 | **32** | open |
| T1 | Run the tests automatically on every push to `main` | tech debt | 4 | 5 | 2 | **36** | done in 9.17.2 (`npm run test:full` in `.github/workflows/test.yml`) |
| S2 | Firebase limits and abuse: 100 players at once on the free plan; no App Check | security | 5 | 4 | 2 | **36** | open |
| G5 | Before any ads: block gambling, alcohol and dating ad categories | launch | 3 | 4 | 1 | **35** | before ads |
| G8 | Online on portals: add itch.io's and CrazyGames' game origins to the relay Worker's `ALLOWED_ORIGINS` (today only GitHub Pages and localhost), and check the Firebase key isn't limited to one site | launch | 4 | 3 | 1 | **35** | open |
| Q2 | Run the phone and online tests in WebKit (Safari's engine) too | testing | 4 | 4 | 2 | **32** | open |
| SV1 | Protect career saves on iPhone: persistent storage, a backup copy, Export/Import save | save systems | 4 | 4 | 2 | **32** | done in 9.17.3 |
| Q9 | `rb-slow` (online, one very slow device) reports repaired desyncs since at least 9.16.2; passed on 9.15.0: find the cause. 9.17.2: a busy CPU (two tests at once on 2 cores) makes `rb-settings`, `rb-touch` and `rb-one` repair 1-3 desyncs too, so the cause is load, not the slow-device setup | testing | 4 | 4 | 2 | **32** | open |
| S1 | Cap the rollback input runs (a modified game can freeze the other player) | security | 3 | 3 | 1 | **30** | open |
| SV2 | An unreadable save silently looks like no career: keep the last good one and say so | save systems | 3 | 3 | 1 | **30** | done in 9.17.3 |
| GT1 | A new player's first match starts on Medium: start on Easy and suggest stepping up after a win | game design | 4 | 2 | 1 | **30** | done in 9.17.4 |
| GT6 | A playtest plan: first-time players, non-gamers (parents, younger kids), watch without coaching | game design | 4 | 2 | 1 | **30** | open |
| SV3 | When an autosave fails (storage full, private browsing), say so once; today only the manual save reports it | save systems | 3 | 3 | 1 | **30** | done in 9.17.3 |
| ST6 | Steam's content survey: decide honestly what AI-made content ships (text, art); have the Noor questions checked by someone knowledgeable | Steam | 3 | 3 | 1 | **30** | open |
| T2 | Catch errors on players' devices and add them to the Network report | tech debt | 3 | 4 | 2 | **28** | open |
| S3 | Only the game can get relay (TURN) credentials; usage alert | security | 3 | 4 | 2 | **28** | open |
| Q3 | A folder of old saves that every release must load | testing | 3 | 4 | 2 | **28** | open |
| B4 | Rollback: "1 on 1 (no CPU)" is played 2 on 2 with CPU teammates | code review | 4 | 3 | 2 | **28** | done in 9.17.1 |
| VD1 | The logo's dunker pose reads close to a famous sportswear silhouette: check it before store submissions | visual design | 3 | 4 | 2 | **28** | decided: pose stays (docs/adr/0001) |
| Q7 | A daily live check of the relay Worker | testing | 2 | 3 | 1 | **25** | open |
| B7 | Rollback: a tap can be lost when the input delay shrinks | code review | 3 | 2 | 1 | **25** | open |
| B11 | A steal pressed during the steal cooldown is dropped (the buffer never fires) | code review | 3 | 2 | 1 | **25** | open |
| B15 | Sprint timestamps carry over between matches: one tap can start a sprint at tip-off | code review | 3 | 2 | 1 | **25** | open |
| U1 | Players see developer words: "Firebase config", "Diagnostic: exception", "the free server" | UX copy | 3 | 2 | 1 | **25** | open |
| U5 | The unlock message lingers across screens and covers menu rows; clearer wording | UX copy | 3 | 2 | 1 | **25** | open |
| D3 | The Dunk lab bar stayed on screen in the next match (check leaving it without Quit) | design | 3 | 2 | 1 | **25** | done in 9.16.4 |
| W1 | Link previews: description, Open Graph image and title for WhatsApp, iMessage and social | SEO and sharing | 4 | 1 | 1 | **25** | open |
| W2 | The Pages site publishes the whole repo (docs, this list, tests); exclude them | SEO and sharing | 2 | 3 | 1 | **25** | open |
| CD8 | Respectful depiction check with someone from the community: imama, kufi, beards, the sheikh and mufti titles | character design | 2 | 3 | 1 | **25** | decided: reviewed by the owners (docs/adr/0002) |
| GT2 | "Why I missed" is off by default: show it during a new player's first games | game design | 3 | 2 | 1 | **25** | done in 9.17.4 |
| P5 | Adaptive resolution ignores menus and the title, where a full match plays behind: let it count there too | performance | 3 | 2 | 1 | **25** | open |
| ST5 | Steam needs unpacked app folders per OS (Windows, macOS, Linux for Steam Deck), not the NSIS/DMG/AppImage installers built today | Steam | 3 | 2 | 1 | **25** | open |
| GDS2 | A one-page game design document (pitch, core loop, modes, progression, art, audio) for the owners and new helpers | game design | 3 | 2 | 1 | **25** | open |
| T5 | Stop committing the built `index.html`; publish Pages from the build | tech debt | 3 | 3 | 2 | **24** | open |
| T4 | One settings module that owns every saved setting | tech debt | 3 | 3 | 2 | **24** | open |
| B5 | Rollback: the host has no "End game: back to lobby" and no "friend dropped" notice | code review | 3 | 3 | 2 | **24** | open |
| B6 | Rollback: the starting state uses the browser's own maths (Safari vs Chrome can differ at frame 0) | code review | 3 | 3 | 2 | **24** | open |
| G1 | Privacy-friendly analytics: players returning next day and week, online matches started and finished | launch | 4 | 2 | 2 | **24** | open |
| CD1 | Silhouette lineup fails: the 16 main players share one body; give heights, builds and 2–3 landmarks each | character design | 4 | 2 | 2 | **24** | done in 9.17.0 |
| A4 | Give the renderer its own view state | architecture | 3 | 4 | 3 | **21** | open |
| Q8 | Fast match tests in Node, without a browser (after A1) | testing | 4 | 3 | 3 | **21** | open (after A1) |
| X1 | Bigger tap targets in menus on phones (rows are about 23 px tall; 44 recommended) | accessibility | 4 | 3 | 3 | **21** | open |
| P1 | Slow phones: about 850 canvas draw calls a frame at up to 3× pixel density; draw the court and crowd once to an offscreen canvas | performance | 4 | 3 | 3 | **21** | open |
| T6 | Align the Playwright version with the test browsers | tech debt | 2 | 2 | 1 | **20** | open |
| T8 | A short architecture overview, glossary and decision records | tech debt | 2 | 2 | 1 | **20** | open |
| S5 | Drop malformed online messages instead of crashing the frame | security | 2 | 3 | 2 | **20** | open |
| Q4 | Tests for the Firebase database rules (local emulator) | testing | 2 | 3 | 2 | **20** | open |
| Q5 | Tests that send hostile online messages (with S1, S5) | testing | 2 | 3 | 2 | **20** | open |
| B8 | P2P: answering a new offer leaves the old channel half open | code review | 2 | 3 | 2 | **20** | open |
| X3 | Raise contrast of grey labels, calendar chips and the red EXIT (about 140 texts below 4.5:1) | accessibility | 3 | 2 | 2 | **20** | open |
| X4 | An option for more time on the Noor question (15 s now) | accessibility | 2 | 2 | 1 | **20** | open |
| B12 | Online Barakah Run duos: the host can tap the guest's power-up card | code review | 2 | 2 | 1 | **20** | open |
| B17 | The CPU difficulty formula is copied in 3 places (match, pre-game label, league sims) | code review | 2 | 2 | 1 | **20** | open |
| B19 | Player portraits: a cache that never shrinks and a JSON copy every frame | code review | 2 | 2 | 1 | **20** | open |
| D2 | The in-match Defend and Steal buttons are faint on the court | design | 3 | 2 | 2 | **20** | done in 9.16.4 |
| W3 | Search engines see only a canvas: a text description, a better title, game structured data | SEO and sharing | 3 | 1 | 1 | **20** | open |
| G2 | Google Play: wrap the PWA (TWA) and start the 12-tester, 14-day closed test now | launch | 4 | 1 | 2 | **20** | open (needs W4) |
| G4 | One-tap invite after a match: the highlight plus a "play me online" link with the code | launch | 4 | 1 | 2 | **20** | open |
| AU2 | A limiter on the master output (stacked sounds clip) and volume sliders squared before use, so they change evenly | audio | 2 | 2 | 1 | **20** | open |
| GD3 | A short "pickup game" option online for phone sessions (one 3-minute half, or first to 11) | game design | 3 | 1 | 1 | **20** | open |
| ST1 | Steam: open the partner account and pay the app fee early (30-day tax check, 21-day wait), Coming Soon page for wishlists | Steam | 4 | 1 | 2 | **20** | open |
| ST4 | Steam store page: capsules, a trailer from highlight clips, screenshots, the AI-content survey | Steam | 3 | 2 | 2 | **20** | open |
| CD3 | Teammates in the same kit look alike at play size: add one large personal mark (headband, sleeve, long shorts, knee pad) | character design | 3 | 2 | 2 | **20** | done in 9.17.0 |
| VD2 | Vertical (9:16) highlight videos for TikTok, Reels and Shorts (today 1280×720 only) | visual design | 4 | 1 | 2 | **20** | open |
| UX1 | Screens without arrow-key menus need the gamepad's View button to pick a target: show that hint, or give them focus order | UI | 3 | 2 | 2 | **20** | open |
| PH1 | A stress test that fires the ball at the rim and glass at top speed and checks it never passes through | physics | 2 | 2 | 1 | **20** | open |
| SV4 | Check a save's values when loading (numbers, known team and item ids) and fall back to the backup if broken | save systems | 2 | 3 | 2 | **20** | open |
| P6 | A performance budget test: draw calls per frame and script ms per frame, checked on every run | performance | 2 | 2 | 1 | **20** | open (with Q6) |
| AI2 | A stuck check for CPU players (same plan, no progress for ~2 s, then rethink) | game AI | 2 | 2 | 1 | **20** | open |
| GDS3 | Between Quick Play matches, offer (never force) one level down after two heavy losses and one up after three big wins | game design | 3 | 2 | 2 | **20** | open |
| A1 | Make the match simulation one deep module (first step: one config and seed object) | architecture | 5 | 4 | 4 | **18** | open |
| Q6 | A frame-time budget test on a slowed-down phone profile | testing | 3 | 3 | 3 | **18** | open |
| X2 | Let phones choose larger text (most phone text is at the 11 px minimum; the setting is computer-only) | accessibility | 4 | 2 | 3 | **18** | open |
| GD1 | Let a newcomer friend use Casual controls and automatic release online (per player) | game design | 4 | 2 | 3 | **18** | open |
| ST3 | Steam Deck: text at least 9 px (12 recommended) at 1280×800, fill 16:10, a playable frame rate at default settings; Deck's A/B/X/Y already match the labels | Steam | 4 | 2 | 3 | **18** | open |
| A2 | Make sound, effects and commentary consume match events | architecture | 4 | 4 | 4 | **16** | open |
| A3 | One state codec for snapshots, rollback saves and checksums | architecture | 4 | 4 | 4 | **16** | open (after A1, A4) |
| S4 | Longer join codes, the guest's name in the lobby, a way to remove a guest | security | 2 | 2 | 2 | **16** | open |
| U2 | One way back per screen, and one name for leaving (Back, Cancel, Leave, Quit, EXIT) | UX copy | 3 | 1 | 2 | **16** | open |
| G3 | Submit to CrazyGames (non-exclusive) and the YouTube Playables interest form | launch | 3 | 1 | 2 | **16** | open |
| GT4 | Quick online reactions ("MashaAllah!", "Pass!", "Good game") for players not on a call | game design | 3 | 1 | 2 | **16** | open |
| GT5 | Bragging rights: share a daily scenario result as a "beat my score" code | game design | 3 | 1 | 2 | **16** | open |
| GF1 | Online rollback matches lose hit-stop and slow motion (reset each frame): play them as a visual-only hold | game feel | 3 | 1 | 2 | **16** | open |
| IN1 | A Controls screen: keys already live in one table (`BINDS`), so remapping is data; save it and add Reset | input | 3 | 1 | 2 | **16** | open |
| IN2 | Toggle instead of hold for Defend (guard stance) and Sprint | input | 3 | 1 | 2 | **16** | open |
| SV5 | Desktop and Steam: save the career as a file in the app's data folder so Steam Cloud can sync it | save systems | 3 | 1 | 2 | **16** | open (with ST2) |
| A6 | A screen registry instead of reassigning `render` / `gameUpdate` | architecture | 3 | 2 | 3 | **15** | open |
| B13 | After a duo Barakah Run the end screen shows the solo best | code review | 2 | 1 | 1 | **15** | open |
| B14 | A pop label can replace the foul callout's subtitle ("ON AHMED • 2 SHOTS") | code review | 2 | 1 | 1 | **15** | open |
| B16 | League sims: a tie fix-up changes the score but not the box score | code review | 2 | 1 | 1 | **15** | open |
| B18 | Dead code that looks live: v6 `preStep`, the old `drawHowTo`, the first `checkBlockJump` | code review | 2 | 1 | 1 | **15** | open |
| U3 | "Options" on the title screen opens a screen called "Settings" | UX copy | 2 | 1 | 1 | **15** | open |
| U4 | Unexplained short forms: BP, HB, Nat., "No upload"; the Arabic-only مصلى label | UX copy | 2 | 1 | 1 | **15** | open |
| D1 | Final screen: the court banner text shows through behind "Final 21 – 18" | design | 2 | 1 | 1 | **15** | done in 9.16.4 |
| D4 | Settings: the Back row is cut off at the bottom of the panel on phones | design | 2 | 1 | 1 | **15** | open |
| W4 | Load once, play offline: a service worker for the 2 MB page (670 KB compressed) | SEO and sharing | 3 | 2 | 3 | **15** | open |
| P2 | Ship a minified script (196 KB smaller before compression, faster start), keep the readable copy | performance | 2 | 1 | 1 | **15** | open |
| P3 | Split the 669 ms startup task: set up career, world and studio code when first opened | performance | 3 | 2 | 3 | **15** | open |
| P4 | The canvas jumps after load on computers (layout shift 0.31); size it before the first paint | performance | 2 | 1 | 1 | **15** | open |
| X6 | Pinch zoom is off (axe: critical); keep it off for play, and make X2 the answer | accessibility | 2 | 1 | 1 | **15** | open |
| GD2 | A reason to come back together: a record with each friend, recent players, co-op challenges | game design | 4 | 1 | 3 | **15** | open |
| AU1 | Music: none today; adaptive layers (percussion and vocal stems that rise with a close game and the final minute), with vocal-only and Off | audio | 4 | 1 | 3 | **15** | open |
| CA1 | On the online guest the camera steps once per drawn frame (`updateCamera(rdt)`), so its easing differs at 30, 60 and 120 fps: time-based easing | camera | 2 | 1 | 1 | **15** | open |
| G7 | itch.io: an HTML page (Kind = HTML, "playable in browser"), `butler push` of the web folder to an `html` channel, desktop folders to `windows`, `osx`, `linux` | launch | 2 | 1 | 1 | **15** | open |
| CD6 | A one-line personality for each Quick Play player, shown on the team card | character design | 2 | 1 | 1 | **15** | open |
| CD7 | A short cast sheet in `docs/` (silhouette, colours, landmarks, pose per player) so new players stay consistent | character design | 2 | 1 | 1 | **15** | open |
| VD3 | The splash is a still logo for 1.7 s: give it motion (a dunk, a glow) for the first 3 seconds | visual design | 2 | 1 | 1 | **15** | done in 9.17.0 |
| GF2 | Phone vibration on big plays for Android (gamepads already rumble; iPhone browsers don't allow it) | game feel | 2 | 1 | 1 | **15** | open |
| AU3 | Measure the whole mix's loudness over a match (phones: about -18 LUFS) and set the master level from it | audio | 2 | 1 | 1 | **15** | open |
| AI1 | A debug view that draws each CPU player's current plan and target on court (for tuning and bug reports) | game AI | 2 | 1 | 1 | **15** | open |
| ST7 | Keep the Steam build scripts (`app_build`, depot `.vdf`, no secrets) in the repo and check them with `check_steam_build.py --strict` in CI | Steam | 2 | 1 | 1 | **15** | open |
| GDS1 | Profile level 27 unlocks nothing since sujood was removed: put Finger to the sky there | game design | 2 | 1 | 1 | **15** | open |
| A5 | One player intent per frame from every device | architecture | 3 | 3 | 4 | **12** | open (after A1) |
| W5 | robots.txt, a sitemap, and a short own domain for sharing | SEO and sharing | 2 | 1 | 2 | **12** | open |
| G6 | A seasonal calendar for posts and updates: Ramadan, Eid, Jumu'ah challenges | launch | 3 | 1 | 3 | **12** | open |
| UI1 | Menus jump-cut between screens: short fades or slides | UI | 2 | 1 | 2 | **12** | done in 9.17.0 |
| CD4 | Stance and idle pose are the same for everyone: posture that matches each personality | character design | 2 | 1 | 2 | **12** | done in 9.17.0 |
| CD5 | Faces have joy, fierce and shock only: add disappointed (a miss, a loss) and focused (free throw) | character design | 2 | 1 | 2 | **12** | done in 9.17.0 |
| GT7 | Check how often the Noor question stops play; an option to ask it at timeouts and halftime | game design | 2 | 1 | 2 | **12** | open |
| VD4 | Results screen: animate the score count and Player of the Game, dim the court fully (with D1) | visual design | 2 | 1 | 2 | **12** | done in 9.17.0 |
| GF3 | Small presses get no feedback: a tiny pop on a made free throw, a pass caught, a steal attempt | game feel | 2 | 1 | 2 | **12** | open |
| UX2 | 16:10 (Steam Deck, many laptops) and ultrawide get black bars: let the height grow on 16:10 | UI | 2 | 1 | 2 | **12** | open |
| UX3 | Buttons are fixed widths sized to English; translations will overflow (with UI2) | UI | 2 | 1 | 2 | **12** | open |
| IN3 | One-button alternatives for two-button moves (Turbo + Block swipe, chase-down) | input | 2 | 1 | 2 | **12** | open |
| GDS4 | A few cosmetics earned by feats (first posterizer, first buzzer-beater), not only by XP | game design | 2 | 1 | 2 | **12** | open |
| GDS5 | After level 30 XP does nothing: keep a count of levels past 30 (a star on the profile card) | game design | 2 | 1 | 2 | **12** | open |
| B10 | Rollback: events in a replayed frame 0 are skipped | code review | 1 | 1 | 1 | **10** | open |
| U6 | Consistent apostrophes and online terms (game, lobby, code) | UX copy | 1 | 1 | 1 | **10** | open |
| U7 | The lobby says "Waiting for your friend" twice; a shorter rules note | UX copy | 1 | 1 | 1 | **10** | open |
| X7 | Put the game canvas in a `<main>` landmark (axe: region) | accessibility | 1 | 1 | 1 | **10** | open |
| ST2 | Steamworks in the desktop app: achievements, cloud saves, invite a Steam friend, Valve's free relay | Steam | 4 | 1 | 4 | **10** | open |
| UI2 | Translations: Arabic (right to left), Urdu, Malay and Indonesian, Turkish, French; first move text into one table | UI | 4 | 1 | 4 | **10** | open |
| PH2 | Restarts and inbounds that move players blend across one frame: refresh the interpolation after a move | physics | 1 | 1 | 1 | **10** | open |
| B9 | Rollback: halftime is skipped (a known gap; the saved screen is never used) | code review | 2 | 1 | 3 | **9** | open |
| D5 | The career hub is dense (5 zones); consider a calmer layout | design | 2 | 1 | 3 | **9** | open |
| CD2 | A signature for each main character: a celebration, posture or accessory | character design | 2 | 1 | 3 | **9** | done in 9.17.0 |
| T3 | Fold the 34 versioned patch files (`v6-…` to `v9161-…`) into their feature files | tech debt | 4 | 3 | 5 | **7** | open (gets easier after A1, A6) |
| X5 | Announce menus to screen readers (the game is one canvas) | accessibility | 2 | 1 | 4 | **6** | open |

## Details

### Tech debt (review of 5 Nov 2026)

- **T1: No automatic tests.** There is no `.github/workflows`; the ~95 browser tests only run when someone runs
  `npm test`, while several people and sessions push straight to `main` (and Pages serves `main`). A GitHub Actions
  workflow running `npm test` (Playwright, Chromium) on each push and pull request catches a break before players see
  it. Free for this repo's size.
- **T2: No error reports from real devices.** Nothing records an uncaught error on a player's phone, so a bug seen
  in an online match is only known if someone describes it. Free option: keep the last few errors
  (`window.onerror`, `unhandledrejection`) and print them in the Network report that players already copy.
- **T5: The 2 MB built `index.html` lives in the repo root.** Every release rewrites it, so two people releasing
  the same day always conflict on it. Publishing Pages from the build (an Actions deploy, with T1) removes it from
  the history of every change.
- **T4: Saved settings are spread out.** About 20 `islamdunk.*` keys are read and written directly from many files.
  One settings module (load, save, defaults, a version for changes) gives one place to add a setting and one place
  for the online code to read the host's settings.
- **T6: Playwright `~1.56` in `package.json`** while the test browsers in the cloud containers are 1.63, so every
  fresh container needs a manual reinstall before tests run.
- **T8: Knowledge lives in the 1,600-line CHANGELOG and progress notes.** A one-page overview (how `src/manifest.json`
  builds the game, how files extend each other, where the sim, render, online and career code live) plus
  `GLOSSARY.md` and `docs/adr/` as decisions are made.
- **T3: 34 files named by version** (`src/sim/v8-defense.js`, `src/online/v9111-net.js` …) each layer behaviour onto
  the same functions. Folding them into the feature they change makes each feature readable in one place. Large and
  risky alone; much easier once A1 and A6 give the code places to move into.

### Security (review of 5 Nov 2026)

Already in good shape: the Electron app isolates the page (context isolation, sandbox, no Node); nothing from the
network is put into the page as HTML; the database rules let a player write only their own entry; no secrets are in
the repo (the Firebase web config is public by design); the host clamps the guest's stick and counters.

- **S2: Firebase is the limit for a launch.** The free Spark plan allows 100 connections at once, so about 50 online
  matches at a time across all players; past that, "Online is full". The web config is public and App Check is not on,
  so anyone can script the database: take connections, or write many large fields (rules allow any number of 64 KB
  fields, in any room). Turn on App Check (free), limit the fields per player in `database.rules.json`, and decide on
  the paid Blaze plan before promoting online play (pay as you go; presence traffic is small).
- **S1: `rbRunsIn` (`src/online/rollback-net.js:252`) trusts the run count**, so one packet such as `0*999999999` from
  a modified game freezes the other player's tab. Cap each run (48 inputs at most per packet) and ignore bad values.
- **S3: The relay Worker checks the `Origin` header, which a script can fake**, so anyone can collect TURN
  credentials (20 a minute per IP) and use the relay for their own traffic past the free 1,000 GB a month
  ($0.05/GB after). Have the Worker require a Firebase anonymous sign-in token (or App Check token) and set a usage
  notification in Cloudflare.
- **S5: Incoming messages are used without checking their shape**: a malformed snapshot or `rbstate` throws inside the
  guest's frame; the P2P link accepts any key, not only the fast ones (`src/online/p2p.js` `recv`); `rbDeserialize`
  copies keys such as `__proto__`. Validate, then drop what doesn't fit.
- **S4: 4-letter join codes (331,776)** can be guessed by a signed-in script, and the first guest to arrive takes the
  spot. The host still has to press Tip off, but can't see who joined. Show the guest's name, add Remove, and consider
  5 letters.

### Testing strategy (review of 5 Nov 2026)

Today: about 95 tests, all end to end in headless Chromium (`tests/run.mjs`, 208 `page.evaluate` calls), plus the
rollback suite (`tests/rollback.mjs`, with Safari's JavaScript engine through bun), the league, studio, Electron
(real WebRTC) and Worker tests, and 179 reference images for visual checks. Strengths: seeded CPU-vs-CPU parity,
determinism across engines, visual regression, phone layout audits, lag simulation. Gaps:

| Area | Type | Covered now | Missing |
|---|---|---|---|
| Match rules and CPU | end to end (seeded) | well | a fast Node tier (Q8, after A1) |
| Online netcode | end to end, two pages | well (loopback, lag, rollback) | hostile and malformed messages (Q5); WebKit (Q2) |
| iPhone | layout audit in Chromium | layout only | the same tests in WebKit (Q2) |
| Saves | a few old career formats | partly | every released format, settings too (Q3) |
| Firebase rules | none | none | emulator tests (Q4) |
| Relay Worker | unit tests with fakes | code | a daily live check (Q7) |
| Performance | profiling scripts | not gated | a frame-time budget (Q6) |

Plan for running them (with T1): a quick set on every push (build, `cpu-parity`, `controls`, `online-loop`,
`rb-determinism`, `rb-online`, `mobile`; a few minutes), the full suite on pull requests and before each release, and
the live Worker check (Q7) once a day.

Example cases:
- Q2: `mobile` and `rb-touch` in Playwright's WebKit at iPhone 15 size: touch buttons fit, a rollback match between
  a Chromium page and a WebKit page ends with the same score and no desync.
- Q3: `tests/fixtures/saves/<version>.json` from 7.x, 8.x and 9.x careers and settings; each loads, reaches the hub
  and keeps the player's name, team and record.
- Q5: send `rb` packets with `0*999999999`, `NaN`, letters and 10,000 entries; snapshots with missing arrays; an
  `rbstate` with `__proto__` keys: the other page keeps running at full frame rate.
- Q4: with the Firebase emulator, a signed-in user can't write another player's entry, a room code must be 4 capital
  letters, a 65 KB field is refused.

### Code review of the online hot spots (5 Nov 2026)

Reviewed: `src/online/rollback.js`, `rollback-net.js`, `rollback-sync.js`, `p2p.js`, `lobby.js`, `src/sim/match.js`,
`src/sim/v86-play.js`. B1 and B2 were checked by hand; the others are the reviewer's findings, to confirm while fixing.

- **B1:** `RBN.start` (`rollback-net.js:44`) runs `newMatch` with `Net.role` still set, and the half-court setup
  (`game-settings.js:38`, `halfCourtOn`) only applies when `Net.role === 'host'`. With Court: Half court, the host
  plays half court and the guest full court: two different games from the first frame, repaired and diverging again.
  A likely cause of "his game didn't match mine" if the court setting was on. Fix: decide the court in the start
  message and build the same match on both sides.
- **B2:** `humanCmd` (`v86-play.js:331`) picks the taunt with `myTaunt()`, from this device's profile, inside the
  rollback step. Each phone applies its owner's taunt to whoever taunts; taunts slow the player for different times.
  Fix: send each player's equipped taunt in the start message.
- **B3:** while a rollback match runs, the `Net.update` wrapper (`rollback-net.js:279`) skips the earlier chain, so
  `P2P.tick` never runs: a dropped direct link stays down and inputs go the slow way for the rest of the match (also
  freezes the lobby ping and diagnostics).
- **B4:** `RBN.hostStart` (`rollback-net.js:32`) builds full teams and ignores the 1-on-1 player picks.
- **B5:** `RBN.start` sets `M.online = false`, which hides every online-only item (`lobby.js:167`, `:307`).
- **B6:** `newMatch` in `RBN.start` runs without the shared maths (`DMath`) that each step uses.
- **B7:** when the delay drops, a frame can go without sampling input while `Input.pressed` is still cleared
  (`rollback-net.js:194`, `:203`).
- **B8:** `P2P.answer` (`p2p.js:117`) closes the old connection directly instead of through `close()`.
- **B9:** `rbStep` (`rollback.js:68`) keeps the requested screen in `M.rbScreen`, which nothing reads.
- **B10:** `!RB.frame` (`rollback.js:100`) treats frame 0 as no frame.

### Code review of the game hot spots (5 Nov 2026)

Reviewed: `src/render/renderer.js`, `src/sim/players.js`, `v7-controls.js`, `v6-contact.js`, `v8-resets.js`,
`src/career/career-screens.js`, `barakah-run.js`, `league.js`, `src/screens/menus.js`. The reviewer's findings, to
confirm while fixing.

- **B11:** `trySteal` (`players.js:425`) buffers a press made during the 0.22 s cooldown in `p.buf.a`, but under the
  v7 controls nothing reads it in time and the next `humanCmd` overwrites it.
- **B15:** `sprintStep` (`v7-controls.js:20`) stores `S.held` / `S.lastT` and compares them with `M.time` in rollback
  and wall time otherwise; a new match (or switching modes) leaves them stale, so sprint can stick on or start
  from a single tap.
- **B12:** `replayabilityScreen` draws tappable cards that call `pickRunPower` (`barakah-run.js:175`), which doesn't
  check `Run.turn`.
- **B17:** `Math.max(veryeasy ? -1 : 0, lv.opp + tier * 0.2)` in `career-screens.js:161`, `:493` and `league.js:44`.
  Use `lgLevel` everywhere.
- **B19:** `drawPortrait` (`menus.js:171`) builds its cache key with `JSON.stringify(def.look)` each frame and keeps
  one Player per look forever (each arrow press in the creator adds one).
- **B13:** duo runs are saved under `barakahDuo` (`barakah-run.js:61`) but the end screen reads the solo best.
- **B14:** `renderer.js:630` overwrites `C.sub` when a pop overlaps the callout; only fill an empty one.
- **B16:** `league.js:200` adds 2 to the team score on a tie but not to any player line.
- **B18:** reassigned and never called: `v6-contact.js:359` `preStep`, `menus.js:294` `drawHowTo` (still lists the
  removed Turbo key), `players.js:404` `checkBlockJump`. Delete them (part of T3).

### Accessibility (WCAG 2.1 AA, 5 Nov 2026)

Measured in a headless iPhone 13 (landscape, 750×342) on the 90 screens of the phone audit: tap areas, text size in
screen pixels, and the contrast of each text against what is drawn behind it.

Already good: reduced motion (follows the phone's setting), flashes off, camera shake off, colourblind-safe team
colours, casual controls and auto shot release, full keyboard and gamepad play, larger text on computers, in-match
touch buttons 66–83 px.

- **X1:** menu rows and buttons are a median of 27 px on their short side (title menu 202×23, settings rows 291×23,
  join-code letters 33×29); Apple and WCAG 2.5.5 recommend 44. Make rows taller on phones or widen each hit area
  beyond the drawn row.
- **X2:** 1,999 of 2,166 texts are drawn at 11 px on the phone, the floor; Settings → Text size says "Phone size"
  and can't be changed (`v95-access.js:78`). Offer Large and Larger on phones too.
- **X3:** about 140 texts on 42 screens are below 4.5:1, mostly secondary greys `#6d7a8c`, `#8494a8`, `#56657a` on
  the dark panels (3.0–3.7:1), white on light calendar chips (2.1–3.0:1), the red EXIT (4.2:1) and gold Arabic labels
  (3.4:1). Lightening the grey colours fixes most of them.
- **X4:** the Noor question has a 15 s timer with no way to extend it (WCAG 2.2.1). Add "More time" in Accessibility.
- **X5:** the game is one canvas with a label, so a screen reader announces nothing in menus. An `aria-live` line
  naming the selected menu item would help; gameplay itself is out of scope.

### UX copy (5 Nov 2026)

All text drawn on 103 screens at iPhone size was collected and read. The voice is warm and specific (Noor cards,
halftime "Stretch, hydrate, and catch your breath", the not-found message says what to check), so this is about
consistency and the few places where the game talks like a developer.

- **U1:** `src/online/net.js` `drawOnline`: "Could not reach the online service. Check your connection and the Firebase
  config.", "Online play needs a Firebase project. Paste its config into FIREBASE_CONFIG (see README).",
  "Diagnostic: exception"; `drawNetWait` busy: "(the free server allows a limited number of players at once)".
  Suggested: "Can't reach online play right now. Check your connection and try again." with a small "Details" line
  for the report, and "Online play is busy right now. Try again in a few minutes."
- **U5:** "Level 3: Ramadan Night ball, Taunt: Du’a, hands raised. Equip it in Options → Profile." stays up on later
  screens and covers rows (the hub's My Masjid, Settings' Back). Suggested: "Level 3 reward: Ramadan Night ball and
  the Du’a taunt. Equip them in Options → Profile.", drawn above the menus and gone after a few seconds.
- **U2:** most screens have a "‹ Back" pill and a "Back" row (Settings also "‹ SETTINGS"); leaving is called Back,
  Cancel, Leave, Quit to title, Back to title and EXIT. Keep the pill on every screen, drop the duplicate row; "Leave"
  for online, "Quit" for a match, "Back" everywhere else.
- **U3:** the title menu says Options; the screen says Settings. Use Settings in both.
- **U4:** the hub shows "25 BP" and "10 HB" with no label (Barakah Points, Halal Bucks); trophies "Nat."; the clip
  screen "No upload" (say "Stays on this device"); the career top bar's مصلى has no English (add "Musalla").
- **U6:** "rak'ahs" (straight) beside "Du’a" (curly); online uses "Host a lobby", "Host a game to get a join code",
  "Join with a code" for one idea.
- **U7:** the lobby shows "Waiting for your friend…" in the players panel and again under Start.

### Design critique (5 Nov 2026)

Screens at iPhone 14 landscape: title, lobby, match, hub, final, settings. What works: the title screen's single gold
primary action and court scene; the lobby's two-panel layout with the code large at the top; the match HUD stays
out of the play area.

- **D3:** in the audit the Dunk lab's bar ("Dunk lab: Float tomahawk … Quit") was still drawn over the next match.
  Check whether leaving the Dunk lab any way other than Quit (Back, a menu) leaves it on.
- **D2:** Defend and Steal (and their "hold: GUARD" / "hold: DOUBLE" hints) are faint grey on the wooden court;
  Block is clearer. Raise their opacity or give them the same fill as Shoot.
- **D1:** on the final screen the court's "BISMILLAH" and "TIP-OFF" banners show through behind the title and the
  score line. Dim the court fully behind results.
- **D4:** the Accessibility settings panel cuts the Back row in half at the bottom (and the unlock message covers it).
- **D5:** the hub holds a calendar, currencies, trophies, the player card, the next game and the menu at once; the
  gold Continue button still stands out, so this is a later polish.

### SEO and sharing (5 Nov 2026)

Technical check of the public page (`index.html` on Pages). For a game shared by link between friends, the link
preview matters more than search ranking.

- **W1:** no `<meta name="description">`, no Open Graph or Twitter tags, no share image: a link sent in WhatsApp or
  iMessage shows only "Islam Dunk". Add a 1200×630 image (the title scene), a title such as "Islam Dunk: 2v2 masjid
  league basketball" and a one-line description.
- **W2:** Pages serves the repository root, so `docs/` (this list, with its security notes), `tests/`, `CHANGELOG.md`
  and `MIGRATION.md` are public pages under halkotob.github.io/IslamDunk/. The game uses none of them: add them to
  `exclude` in `_config.yml` (and fix S1/S3 before promoting, since they're described here).
- **W3:** search engines see an empty canvas. Add a short text description of the game in the page (hidden behind the
  canvas or in `<noscript>`) and a `VideoGame` structured data block.
- **W4:** the page is 2 MB (670 KB compressed) with no service worker, so every visit downloads it again and nothing
  works offline, though the manifest makes it installable. A service worker caches it after the first visit.
- **W5:** no `robots.txt` or sitemap (minor for one page); a short own domain (e.g. islamdunk.com) is easier to share
  and say out loud.

### Performance (Lighthouse 12.8.2, 5 Nov 2026)

The built page served locally, Lighthouse desktop and mobile (mobile = a slowed-down phone and network). Scores:
desktop accessibility 89, best practices 100, SEO 82 (performance not scored: the game draws on a canvas, which has
no "largest paint"); mobile performance 48, accessibility 92, best practices 100, SEO 82.

| Mobile | Value | Target |
|---|---|---|
| First paint | 4.0 s | under 1.8 s |
| Usable (time to interactive) | 12.6 s | under 3.8 s |
| Blocking time | 3,320 ms | under 200 ms |
| Main-thread work | 11.5 s (8.3 s drawing the running title scene, 2.2 s script) | |
| Page size | 675 KB compressed | |

- **P1:** most of the cost is the title scene drawing every frame (court, crowd, players) at about 150 ms a frame on
  the test phone, so a low-end phone runs the menus at a few frames a second and feels stuck at start. Draw the
  static court and crowd once to an offscreen canvas, lower the crowd detail on slow devices (measure frame time for
  the first second), and pause the attract animation while a menu is being used.
- **P2:** `vite.config.js:31` sets `minify: false` ("ship the same readable script"); minifying saves 196 KB (30%) and
  some of the 413 ms parse time. Keep a readable copy (or a source map) for reports.
- **P3:** the first long task is 669 ms: everything is set up at load.
- **P4:** desktop layout shift 0.31 from `canvas#game` resizing after load.
- Lighthouse also flags 393 KB of script unused on the title screen; with one script that's expected (low value).

### Automated accessibility scan (axe-core 4.10, 5 Nov 2026)

The Axe plugin's server didn't connect in this session, so the same engine (axe-core) was run in a browser on the
title screen at desktop, iPhone landscape and portrait. Only two rules fail, since everything is drawn on one canvas
(the canvas has a label; the iOS install sheet and tip have proper roles and names):

- **X6 (critical in axe):** `user-scalable=no, maximum-scale=1` in the viewport meta. Pinch zoom would break touch
  play, so keep it, and let players enlarge text in the game instead (X2).
- **X7 (moderate):** content outside landmarks: wrap the canvas in `<main>`.

### Launch and growth (5 Nov 2026)

From the game-trend `launching-on-zero-budget` skill; the full plan, with the store and portal terms checked today
and their sources, is in [docs/reports/2026-11-05-launch-islam-dunk.md](reports/2026-11-05-launch-islam-dunk.md).

- **G5:** ad networks can show gambling, alcohol or dating ads beside a masjid game; block those categories before
  showing any ad (rewarded ads only, never mid-match).
- **G1:** nothing measures whether players come back. Add simple, privacy-friendly counts (no personal data): first
  visit, next-day and next-week return, online matches started and finished, desyncs.
- **G2:** a new personal Google Play account needs 12 testers opted in for 14 days in a row before release, so start
  that clock early with 20+ testers. Wrap the PWA with `pwa2play` (needs W4's service worker and `assetlinks.json`).
- **G4:** after a match, one button shares the highlight and a link that opens the game straight into the
  friend's lobby.
- **G3:** CrazyGames is non-exclusive per current guides (confirm), free and reviews in days; avoid Poki's default
  web-exclusive deal. YouTube Playables takes Canvas games through an interest form.
- **G6:** Ramadan nights, Eid tournaments and weekly Jumu'ah challenges give fixed dates to post and update.

### Game development skills (5 Nov 2026)

The project skills in `.claude/skills/` run over the game: game design theory, improve-game, game-feel, input,
physics, camera, audio, saves, performance, UI/UX, game AI, character design, Steam and itch.io.

**improve-game scores** (1 = missing, 3 = works but basic, 5 = polished):

| Area | Score | Why |
|---|:-:|---|
| Gameplay feel | 4 | Fixed 60 Hz step with interpolation, input buffering, decaying shake, one hit-stop per impact |
| Visual polish | 4 | Strong court, crowd and callouts; menus jump-cut (UI1) |
| UI and menus | 3 | Small phone targets and text (X1, X2), duplicate Back controls (U2) |
| Audio | 2 | Procedural effects with master, effects and crowd volumes; no music (AU1), no limiter (AU2) |
| Code structure | 2 | See A1–A6 and T3 |
| Restart safety | 4 | Seeded tests replay whole matches and careers |
| Performance | 3 | P1; needs a measurement on a real low-end phone |
| Player experience | 4 | Tutorial, Noor, Barakah Run, daily scenario, career calendar |
| Mobile | 4 | Touch layout audits, safe areas, fullscreen prompt |
| Online | 3 | Rollback is in, with the B1–B10 bugs |
| Tests | 4 | ~95 end-to-end tests; gaps in Q2–Q8 |

**Game design theory.** Online co-op is the feature to promote, so it should work for the friend who has never
played. Online forces Timed release and Standard controls (`src/online/lobby.js` rules note), which leaves a
newcomer missing every shot next to an experienced friend (GD1: make it a per-player choice in the start message,
so both phones still simulate the same game). Online matches default to 2 halves; a 3-minute pickup game suits a
phone call (GD3). Nothing remembers who you played with: a record with each friend, a recent-players list and co-op
challenges give two friends a reason to return together (GD2). Rollback matches also skip the +15 online XP, since
`RBN.start` sets `M.online = false` (`src/screens/profile.js:63`; part of B5).

**Saves.** `saveCareer` (`src/career/career.js:196`) writes one key in place; `readSave` returns nothing for a save
that fails to parse, so the career looks gone (SV2). On iPhone, Safari can delete a site's stored data after 7 days
without a visit unless the game was added to the Home Screen: ask for persistent storage
(`navigator.storage.persist()`), keep the previous save as a backup, and add Export and Import as a short code
(SV1). The schema version (`v`, `sv`) and field-by-field migration are good.

**Audio.** Effects are made in code (no samples) through master, effects and crowd volumes
(`src/core/utils-audio.js`, `src/screens/v912-polish.js` `sfxApplyVol`). Many sounds at once (a dunk, the buzzer,
the crowd) can clip: add a compressor as a limiter before the output, and map the volume sliders to loudness (AU2).
There is no music (AU1). Many Muslim players avoid musical instruments, so offer a vocal and percussion only
(nasheed-style) setting and Off, besides any instrumental track.

**Characters.** The 8 Quick Play teams' 16 players share one body; career teams already use heights and builds
(`bh`, `bw`, `HEIGHT_S` and `BUILD_W` in `src/career/career.js:9`). Using them for the main cast (a tall dunker, a
slim guard, a broad lockdown defender) makes the archetype on each card (SHARPSHOOTER, LOCKDOWN) readable by
silhouette (CD1). A signature celebration, posture or accessory per character makes them memorable (CD2).

**Camera, physics, input, AI.**
- Physics is in good shape: a fixed 60 Hz step with interpolation, at most 5 steps a frame, frame time capped at
  50 ms (`src/screens/flow.js:5`). Slow motion and hit-stop change the simulation clock (`FX.scale`, `FX.stopF`),
  which belongs with A2.
- The gym camera eases by `dt * 4` each frame (`src/sim/match.js:135`), which is floatier at low frame rates; use
  `1 - Math.exp(-4 * dt)` (CA1).
- Input uses physical key codes (fine on AZERTY), a radial stick deadzone with a curve, and a 0.18 s press buffer.
  There's no way to change controls (IN1).
- The CPU `Brain` plans per role with per-difficulty settings and an optional rubber band; CPU style tests exist.
  Nothing new to add.

**UI.** Menus switch with no transition (UI1). All text is English and drawn on the canvas; translation needs the
strings in one table first, and Arabic needs right-to-left drawing (UI2).

**Steam and itch.io** (from `steam-publish` and `itch-publish`). `electron/main.cjs:9` says Steamworks isn't wired
yet; electron-builder already makes Windows, macOS and Linux installers.
- ST1: the partner account asks for identity, bank and tax details (tax checks take up to 30 days); each app costs
  a $100 Steam Direct fee (recouped after $1,000 in sales), and Valve makes first titles wait 21 days after paying.
  Publish the Coming Soon page weeks before release to collect wishlists.
- ST2: a Steamworks module for Electron (for example `steamworks.js`) gives achievements (the game already has
  them), Steam Cloud saves, rich presence and "invite a friend to my lobby". Steam's own networking relays matches
  for free, so Steam players wouldn't use the TURN relay.
- ST3: Steam Deck review checks that every screen works by controller alone, text reads at 1280×800, and the
  button labels match the device; the game shows Xbox letters only (`hintKey` in `src/screens/v912-polish.js:285`).
- ST4: store capsules in Valve's sizes, a trailer (the highlight videos are a start), screenshots, and an honest
  content survey (Valve asks about AI-generated content).
- G7: itch.io takes the HTML5 build as a zip, free and non-exclusive, uploaded with `butler`.

**Performance note.** A frame-time check in the test browser (slowed 4×, iPhone size) measured `render` at
12–17 ms median but only 3 frames a second overall: that browser draws without a graphics chip, so it overstates
the cost. P1 needs a measurement on a real low-end phone before any work.

### Character design skill, in full (5 Nov 2026)

Run with `.claude/skills/character-design` and its three references (patterns, sharp edges, validations). A
lineup of all 16 Quick Play players was drawn with the game's own `drawPortrait`, in colour and as solid black
silhouettes, plus a small version near play size.

| Validation (from the skill) | Result |
|---|---|
| Silhouette test (lineup, distinct, readable at small size) | **Fails.** Every body is the same shape and height; the only outline difference is the headwear (5 kufi, 4 imama with a tail, 7 hair). Two players with the same headwear can't be told apart in silhouette. |
| Cast visual differentiation (body types, shape language) | **Fails** ("samey cast", rated high). One build for all; teammates differ by beard, skin and headwear only, which disappears at play size. |
| Colour palette per character | Team colours work as a faction palette (8 distinct kits), but within a team both players share it exactly. |
| Expression coverage | Partial: `drawFace` (`src/render/renderer.js:457`) has joy, fierce and shock (set in `src/sim/animation.js:84`); no disappointed or focused. |
| Body language and pose | One idle and stance for everyone. |
| Design-backstory alignment | Archetypes (SHARPSHOOTER, LOCKDOWN, MUFTI) appear on cards but not in the body; Quick Play players have no personality line. Career brothers have stories. |
| Cultural sensitivity (error level) | Dress and titles are presented with care (kufi, imama, sheikh, mufti, hafiz). The skill asks for a documented review with someone from the community before launch (CD8). |
| Design document | None for the cast (CD7). |

- **CD1:** career teams already use heights and builds (`bh`, `bw` with `HEIGHT_S` and `BUILD_W`,
  `src/career/career.js:9`) and the renderer applies them (`src/render/renderer.js:325`), so the main cast can use
  them with data only. Following the skill's size rule, the big shapes (height, build, headwear) say who, a medium
  mark says the role, small details add personality.
- **CD3:** one large mark per player that survives at phone size (a headband, a sleeve on one arm, long shorts, a
  knee pad) also breaks the symmetric outline, which the skill asks for.
- **CD4–CD6:** a personal stance (the sheikh upright, the guard low and bouncy), a disappointed and a focused face, a
  one-line personality on the team card.

### Game design theory skill, in full (5 Nov 2026)

Run with `.claude/skills/game-design-theory` and its five references (player psychology, gameplay elements,
storytelling, playtesting, design principles), through its evaluation framework.

| Question (from the skill) | Islam Dunk |
|---|---|
| Player motivation | Challenge (CPU levels, dunk lab), socialization (online and local duos), bragging (achievements, bests, Barakah Run records), fantasy (the masjid league star), emotional peaks (clutch buzzers, posterizers). Socialization, the one to promote, ends when the match ends (GD2, GT4). |
| Expectations: consistent rules | Offline lets you use Automatic release and Casual controls; online takes them away (GD1). |
| Expectations: no hidden failure | Misses aren't explained unless "Why I missed" is turned on (`SETTINGS.missWhy`, off by default, `src/screens/v912-polish.js:315`) (GT2). |
| Emergence | Strong: pump fakes, dribble moves, alley-oops, contact, blocks and steals combine in unplanned ways. |
| Non-linearity | Strong: the career calendar, neighbourhood, Barakah Run paths and vows. |
| Learning curve | The welcome dialog offers an optional 9-lesson tutorial (good), but Quick Play defaults to Medium with 2 halves (`SETTINGS.difficulty: 'medium'`, `src/core/config.js:25`). The skill's mantra is "your game is too hard": the first match should be easy (GT1). |
| Immersion and "do, not watch" | Story scenes can be skipped (good). The Noor question pauses the action; measure how often (GT7). The unlock toast lingering across screens breaks immersion (U5). |
| Storytelling | Career dialogue is short, skippable and in the game's own style; the neighbourhood tells story through places (the masjid, the store, Jumu'ah), which the skill prefers to cut-scenes. |
| AI | Matches the skill's "sloped field": an optional rubber band, reaction and decision differences by level, never stat changes. |

- **GT6:** the skill's playtest checklist asks for first-impression testers, non-gamers and silent observation. The
  repo already records a new player's path (`tools/review-first-run.mjs`); add sessions with real people: a parent,
  a 10-year-old, a friend who doesn't play games, each on their own phone, with you only watching. Same problem
  from several testers = a real problem.
- **GT4, GT5:** socialization and bragging rights outside a phone call: preset reactions in online matches and a
  daily scenario result to share.

### Game designer skill (visual audit), in full (5 Nov 2026)

Run with `.claude/skills/game-designer` and its `visual-catalog.md`; screenshots at iPhone landscape of the load
splash, title, a CPU match at 0.2 s, 1.2 s and 3 s from tip-off, the first score, plus the earlier screen set.
Scores (the skill's areas; the Phaser template, Play.fun safe-zone and EventBus items don't apply):

| Area | Score | Notes |
|---|:-:|---|
| Background and atmosphere | 5 | Masjid arches, hanging lanterns, a full crowd in team colours, the star medallion at centre court |
| Colour palette | 4 | Gold, teal and green throughout, team kits distinct; low-contrast greys in menus (X3) |
| Animations | 4 | Running, dunks and celebrations animate; menus don't (UI1) |
| Particles | 4 | Confetti, sparks, fire and impact rings on key plays |
| Screen transitions | 2 | Hard cuts between screens (UI1) |
| Typography | 3 | Strong callouts; phone body text at the 11 px floor (X2) |
| Game feel / juice | 4 | Shake, hit-stop, camera punch, slow motion on replays |
| Results screen | 3 | Clear winner and Continue, but the court shows through (D1) and nothing animates (VD4) |
| Character prominence | 4 | Players about a third of the screen height on a phone at tip-off |
| First impression (first 3 s) | 4 | "BISMILLAH! TIP-OFF" callout and the crowd at tip-off; the load splash is a still image (VD3) |
| Thematic identity | 5 | A screenshot says "basketball in a masjid league" at once: kufi and imama, the arches, "TABARAKALLAH!" on a dunk |
| Expression usage | 3 | Joy, fierce and shock on some plays (CD5) |

The skill sets 4 as the bar; transitions (UI1), typography (X2), the results screen (VD4, D1) and expressions (CD5)
are under it.

- **VD1:** the logo mark (`src/render/logo.js`, "a dunker in a thawb and kufi taking off", ball arm up, legs split)
  reads close to a well-known sportswear brand's silhouette at small sizes. App stores and Steam reject marks that
  look like another brand's. Have someone compare them side by side, or give the mark a clearly different pose
  (for example a two-hand dunk or the dunker seen from the side with the thawb).
- **VD2:** the skill's target is "a viewer scrolling a feed with sound off". The highlight video is 1280×720
  (`CLIP_W`, `CLIP_H` in `src/screens/clip-video.js:10`); short-video apps show 9:16, so a vertical version
  framed on the dunk, with the callout large, suits the posting plan.

### Improve-game skill, in full (5 Nov 2026)

Run with `.claude/skills/improve-game`: audit, scores, and an improvement plan (the skill's step 3). Building waits
for the owner's choice, as the skill says. The Play.fun safe-zone row and `render_game_to_text()` don't apply, so
the total is out of 60.

| Area | Score | Diagnosis |
|---|:-:|---|
| Gameplay feel | 4 | Responsive (fixed 60 Hz step, 0.18 s press buffer), deep moves; first match too hard for newcomers (GT1) |
| Visual polish | 4 | See the game designer table above |
| Results and UI | 3 | Results screen bleed (D1), duplicate Back controls (U2), hard cuts (UI1), small phone targets (X1) |
| Audio | 2 | Effects for every action with master, effects and crowd volumes and mute; no music (AU1), no limiter (AU2) |
| Code structure | 2 | Global functions reassigned across many files (A1–A6, T3) |
| Restart safety | 4 | No timers left in the simulation (all 28 `setTimeout` calls are in screens and online code); seeded tests replay matches and careers identically; auto-pause on tab switch (`src/screens/v912-polish.js:65`) |
| Performance | 3 | Frame time capped at 50 ms, adaptive resolution exists; title scene cost on slow phones unmeasured on a device (P1) |
| Player experience | 4 | Optional tutorial, Noor, Barakah Run, daily scenario; misses unexplained by default (GT2) |
| Mobile | 4 | Touch layout audits, safe areas, fullscreen prompt; small menu targets (X1) and text (X2) |
| Gameplay invariants | 5 | Scoring, fouls, shot clock, end of match covered by tests |
| Character sizing | 4 | Players about a third of the screen height on phones; cast silhouettes alike (CD1) |
| Tests | 4 | ~95 end-to-end tests plus rollback, league, studio and Electron suites; gaps Q2–Q8 |

**Overall: 43 / 60.**

**Improvement plan** (the skill's top 5–8, by player impact):

1. **Online is the same game on both phones** (B1, B2, B3): the half-court and taunt desyncs, the link retry.
   Files: `src/online/rollback-net.js`, `src/online/game-settings.js`, `src/sim/v86-play.js`.
2. **A gentle first match** (GT1, GT2): Easy for a new player's first games, "why I missed" on for them.
   Files: `src/core/config.js`, `src/screens/v912-polish.js`, `src/screens/profile.js`.
3. **Career saves can't be lost** (SV1, SV2): persistent storage, a backup save, Export and Import.
   Files: `src/career/career.js`, a new save-tools file before `boot.js`.
4. **Phone readability** (X1, X2, U5): taller menu rows, a Large text option on phones, the unlock message out of
   the way. Files: `src/screens/v95-access.js`, `src/screens/phone-pass.js`, `src/screens/menus.js`.
5. **Music with a choice** (AU1, AU2): a limiter, then a menu theme and match layers with vocal-only and Off.
   Files: `src/core/utils-audio.js`, `src/screens/v912-polish.js`, a new music file.
6. **A cast you can tell apart** (CD1, CD3): heights, builds and one large mark per player (data only).
   Files: `src/data/teams.js`.
7. **Screen transitions** (UI1): a short fade between screens. Files: `src/screens/flow.js`, `src/screens/menus.js`.
8. **Automatic tests on every push** (T1): catches breaks before players see them. Files: `.github/workflows/`.

After a pass, running the skill again should find the next batch.

### Game feel skill, in full (5 Nov 2026)

Run with `.claude/skills/game-feel` and `references/feedback-recipes.md` against `src/render/game-feel.js`,
`src/render/visuals-v76.js`, `src/render/renderer.js` and `src/screens/flow.js`.

Already matches the skill: shake drives a camera offset, not the players, with a smooth eased dip and no random
jitter (`shakeTick`); a new shake only replaces a weaker one; hit-stop is up to 4 frames, takes the larger of two
overlapping requests (`FX.hitstop`) and lets input buffer through; feedback is tiered by importance (`MAKE_FEEL`:
layups get no shake, posterizers the most, plus slow motion); juice returns to rest; Camera shake (Off, Reduced,
Full), Flashes and Reduced motion settings exist, which the skill's accessibility section asks for; buttons shrink
when pressed and grow on hover; gamepads rumble on big plays.

- **GF1:** the rollback step sets `FX.scale = 1; FX.stopF = 0` every frame (`src/online/rollback-net.js:59`, `:207`)
  because slow motion and hit-stop change the simulation clock (`sim()` in `src/screens/flow.js:5`), which would
  break the shared timeline. So the promoted mode is the one without them. Make them visual only in online play:
  hold the drawn pose and the camera for the hit-stop frames and slow the replay camera, while the match keeps
  stepping (this is the A2 seam).
- **GF2:** Android browsers support `navigator.vibrate`; a 20–40 ms pulse on dunks and blocks, behind the existing
  Vibration setting. Safari on iPhone has no vibration API.
- **GF3:** the skill's "small tier" (a tick sound, a few particles) is missing on routine successes such as a made
  free throw or a clean catch.

### Game UI/UX skill, in full (5 Nov 2026)

Run with `.claude/skills/game-ui-ux` and `references/layout-and-flow.md` against `src/screens/menus.js`, `flow.js`,
`navigation.js`, `src/core/gamepad.js`, `src/core/mobile-fit.js` and `src/screens/phone-pass.js`.

| Skill check | Islam Dunk |
|---|---|
| Layout and scaling | One logical canvas 540 high, with the width set from the screen's shape between 960 and 1200 (`mobile-fit.js:28`); positions are relative to the centre and edges. Phones (19.5:9) fill the screen; 16:10 and ultrawide get bars (UX2). |
| Safe area | Handled: the page pads by the notch and home-bar insets (`index.html` body padding) and the touch layout avoids them. |
| Focus navigation | Most menus move with arrow keys and the stick (`menuNav`, 19 screens). Others are tap-target screens; there the gamepad's View button opens a picker that walks every target (`Pad.pick`, `gamepad.js:82`), so nothing is unreachable, but nothing tells a gamepad player to press View (UX1). |
| Screen flow | A screen name plus flags (`Game.screen`, `Game.paused`, `Game.trivia`, …) with one Back table (`navigation.js`); the skill's screen stack is A6. |
| HUD updates | The canvas redraws every frame by design; the skill's event-driven HUD advice is for retained-mode UI and doesn't apply. |
| Text size | Larger text on computers up to "Larger"; phones fixed at an 11 px floor (X2). The skill cites a 200% scaling target. |
| Contrast and colour | See X3; team colours have a colourblind-safe option; possession isn't shown by colour alone (the ball marker). |
| Touch targets | See X1. |
| Localization | Text is in the drawing code and buttons have fixed widths (`btn(..., 150, 42, ...)` in `net.js` `drawJoinCode`, and others) (UX3, UI2). |

### Input systems skill, in full (5 Nov 2026)

Run with `.claude/skills/input-systems` and `references/buffering-and-accessibility.md` against
`src/core/input.js`, `src/core/gamepad.js`, `src/core/skill-touch.js` and `src/sim/v7-controls.js`.

Already matches the skill: gameplay reads named actions from a binding table (`BINDS`, `src/core/input.js:3`:
up, down, left, right, a, b, t, x, s), not raw keys; keys are stored as physical codes (`e.code`), so WASD stays
put on AZERTY; edge (`pressed`) and held (`down`) are separate, and `humanCmd` uses each correctly; the stick has a
radial deadzone with a curve and the keyboard diagonal is normalised; a Deadzone setting exists; presses during an
animation are buffered for 0.18 s; prompts switch between keyboard, gamepad and touch by the last device used
(Xbox letters only, see ST3); keyboard focus loss clears held keys (`blur`); shot timing has an Automatic option.

- **IN1:** the skill's "rebinding first-class" step. With `BINDS` in place it needs a capture screen ("press a key
  for Shoot"), conflict detection, a saved copy, and Reset to default. The same for gamepad buttons.
- **IN2:** the skill's accessibility checklist asks for toggle instead of hold; Defend ("hold: GUARD") and sprint
  are hold actions.
- **IN3:** "no required simultaneous inputs": the How to play screen lists "Turbo + Block: swipe"
  (`src/screens/v6-ui.js:102`).
- Shot release is a hold-and-release timing skill by design; the Automatic release option is the accessible
  alternative (offline only, GD1).

### Physics tuning skill, in full (5 Nov 2026)

Run with `.claude/skills/physics-tuning` and `references/timestep-and-ccd.md` against `src/screens/flow.js` (`sim`,
`snapPrev`) and `src/sim/hoops-ball.js` (`updateBall`, `collideHoop`, `checkScore`).

Already matches the skill's stability checklist: a fixed 60 Hz step (`STEP`) through an accumulator; at most 5
steps a frame and the accumulator dropped after that, with frame time capped at 50 ms (no spiral after a hitch);
all movement and collisions in the step; the drawing interpolates between the last two steps (`Game.alpha`,
`snapPrev`); the ball keeps its previous position, so scoring is a crossing test (`ball.py >= ry && ball.y < ry`)
that can't be skipped; floor and wall contacts clamp position and reflect velocity with damping; the net cloth uses
2 substeps with 7 constraint passes.

- **Tunnelling margins:** the rim contact tube is about 19 units across (`BALL_R` 8 + 1.3 each side of the rim
  line) and the backboard catch zone 20 units deep, so the ball would need more than ~1,100 units a second to skip
  through in one step; shots and passes stay below that, but nothing checks it (PH1).
- **PH2:** `snapPrev()` runs before each step, so a player placed somewhere new during a step (inbounds, a restart)
  is drawn partway between old and new spots for one frame; call it again right after such a move.
- Slow motion and hit-stop change the simulation clock (`FX.scale`, `FX.stopF` in `sim()`); see A2 and GF1.

### Camera systems skill, in full (5 Nov 2026)

Run with `.claude/skills/camera-systems` and `references/follow-and-framing.md` against
`src/render/camera-depth.js` (`updateBroadcastCam`), `src/render/v7-cameras-depth.js` and `src/sim/match.js`.

The match camera already does what the skill describes, and more: look-ahead in the direction of play plus the
ball carrier's speed; bounds clamping (`camClamp`); multi-target framing that keeps all players in view, including
where they're heading (`fitPlayers`); zoom out on fast breaks and wide spreads, a measured push-in on big dunks;
a desired frame eased toward the target, then followed by a critically damped spring (no overshoot); intentional
hard cuts that reset the spring (`M.camCut`, `snap`); a safety clamp if someone is about to leave the frame; shake
added on top as an offset; camera presets in the pause menu; Reduced motion scales the push-ins.

- **CA1 (corrected):** offline the camera runs inside the fixed 60 Hz step and is drawn interpolated, so the
  `Math.min(1, dt * k)` easing is consistent there. The online guest calls `updateCamera(rdt)` once per drawn
  frame (`src/online/net.js:405`), so its feel changes with the phone's frame rate; use `1 - Math.exp(-k * dt)`
  for the eases (the spring is already time-based).
- No other findings: no deadzone is needed (it's a broadcast camera, not a twitch follow), pitch and collision
  don't apply in 2D.

### Audio design skill, in full (5 Nov 2026)

Run with `.claude/skills/audio-design` and `references/adaptive-music.md` against `src/core/utils-audio.js`,
`src/core/sfx-variants.js`, `src/core/sfx-levels.js`, `src/screens/v913-crowd.js` and the volume settings
(`sfxApplyVol`, `src/screens/v912-polish.js:152`).

Already matches the skill: sounds go through groups (master, effects, crowd), with player sliders for each; the
often-repeated sounds have 2–3 variants picked with no immediate repeat, each level-matched by a measured
loudness table (`SFX_LEVELS`, K-weighted, checked by a test), which is the skill's "kill the machine-gun repeat";
the crowd is a live bed that swells and settles with big plays (adaptive ambience); recorded samples can be added
as variants later (`sfxAddSamples`).

- **AU2:** the sliders feed gain directly (`SFX.master.gain.value = A.master`), so most of the audible change is in
  the bottom of the slider; square the value first, as the skill shows. There's no limiter on the output: add a
  `DynamicsCompressor` set as a limiter (fast attack, high ratio, threshold near -3 dB) before the destination.
- **AU3:** the skill's target for handheld and mobile is about -18 LUFS integrated (±2), peaks at or below -1 dBTP.
  `tools/sfx-levels.mjs` already measures loudness per sound; run it over a whole match recording.
- **AU1 (expanded):** the reference's vertical layering suits a match: stems of percussion (daf, hand claps),
  crowd chant and vocal (nasheed-style) that fade in with the game's intensity (score margin, the last minute,
  overtime), switching at bar lines; a short stinger on a buzzer beater. Offer Vocal and percussion only and Off,
  and duck the music under the crowd swell on big plays with its own group, so the player's Music slider is never
  overwritten.

### Save systems skill, in full (5 Nov 2026)

Run with `.claude/skills/save-systems` and `references/versioning-and-migration.md` against `src/career/career.js`
(`saveCareer`, `readSave`, `loadCareer`, `migrateV5`, `migrateV6`), the manual slot (`src/career/career-screens.js`),
and the other stored keys (`islamdunk.profile`, `islamdunk.progress`, settings).

Already matches the skill: the career is plain data (`JSON.stringify(C)`), rebuilt on load over `freshCareer()`
defaults; every save carries a version (`v: 1` envelope, `sv` schema inside, so older builds still load it); old
saves are migrated field by field (`migrateV5`, `migrateV6`, the v3.3 and v4.x defaults); the autosave
(`islamdunk.career.auto`) is separate from the manual slot (`islamdunk.career.slot1`), so it can't overwrite it;
growing lists are trimmed (160 box scores, 10 timing samples); the manual save tells the player if it failed.

- **SV1, SV2** (from before): no backup copy and no persistent-storage request; a save that fails to parse makes
  the career look gone.
- **SV3:** `saveCareer` returns `false` on a storage error, but the ~50 autosave calls ignore it, so a full
  storage or private browsing loses progress silently.
- **SV4:** the skill's load checklist: check required fields and number ranges, drop ids that no longer exist
  (a removed team or store item), and use the backup if the save is broken; fail loudly rather than load a broken
  state.
- **SV5:** Steam Cloud syncs files under folders set in Steamworks (Auto-Cloud), not browser storage. In the
  Electron build, write the career JSON to the app's data folder through the preload bridge (temp file, then
  rename, keep a `.bak`), and list that folder in Auto-Cloud.

### Performance optimization skill, in full (5 Nov 2026)

Run with `.claude/skills/performance-optimization` and `references/profiling-and-budgets.md`: measure first, find
the bottleneck (script or drawing), then fix one thing. Measured in Chromium at iPhone landscape size and 3× pixel
density, 3 s per screen, with the sampling profiler, timers around `render` and `gameUpdate`, and a count of
canvas draw calls (`fillText`, `drawImage`, `fill`, `stroke`, `fillRect` on the game canvas).

| Screen | Script: render (median, p95) | Script: update | Draw calls a frame | Frames drawn in 3 s |
|---|---|---|---|---|
| Title (a match plays behind) | 3.2 ms, 5.0 ms | 1.1 ms | 851 | 44 |
| Match | 3.0 ms, 4.3 ms | 1.0 ms | 841 | 61 |
| Career hub | 2.9 ms, 4.4 ms | 0.9 ms | 852 | 46 |

- **Bottleneck: drawing, not script.** Script work is about 4 ms a frame on this computer (roughly 12–16 ms on a
  phone 3–4× slower, inside a 16.7 ms budget only on a fast phone), and no single function stands out in the
  profile (each under 1%) and garbage collection is negligible, but the browser managed 15–20 frames a second:
  the time goes to rasterising about 850 drawing operations onto a 2,532 × 1,170 pixel canvas (software drawing
  in this test, so a real GPU is faster; the ratio still points the same way). The skill's fix for this side is
  fewer draw operations and fewer pixels.
- **P1 (refined):** cache what doesn't move (the court, the arches, the crowd rows, which redraw each frame) to an
  offscreen canvas and draw it with one `drawImage`; animate only the crowd members who react.
- **P5:** adaptive resolution (`src/render/adaptive-res.js`) only measures play frames ("menus, pauses and tab
  switches don't count"), yet the title and hub draw a full animated match or scene. Count those frames too, or
  draw the title's background match at the lowest level.
- **P6:** the skill's "set budgets so it stays fixed": a test that fails when draw calls per frame or script ms per
  frame rise past a set ceiling (with Q6).
- Still needed: the same numbers from a real low-end phone (Safari's Web Inspector timeline on an older iPhone).

### Game AI skill, in full (5 Nov 2026)

Run with `.claude/skills/game-ai` and its references (behavior trees, pathfinding) against `src/sim/ai.js`
(`Brain`), `src/sim/v6-controls-ai.js`, `v863-cpu.js`, `v911-cpu-style.js` and `v916-cpu-handle.js`.

The CPU already follows the skill's structure: the decision layer (`think`) is separate from motion (`exec`), as
the skill asks; the situation is a small state machine (`ctx()`: handler, off-ball, defense, shot in the air, loose
ball, dead ball) and a change of situation triggers a new decision at once; within a situation options are scored
by utility (expected points against a shot-clock curve, `choose()` with difficulty noise), the skill's choice for
"how strongly do I want each option"; decisions run on a reaction timer, not every frame (`cfg().react`, randomised
±30%); the "sloped field" is an optional rubber band and difficulty changes reactions and decisions, never stats;
CPU styles and handles vary by player; there's no pathfinding to get wrong (an open court).

- **AI1:** the skill's verification step is "draw the path and current state on screen while tuning". A dev-panel
  toggle that labels each CPU player's `plan.type` and draws a line to its target would make tuning and bug
  reports faster (nothing draws it today).
- **AI2:** the skill's "no stuck check" pitfall: if a plan makes no progress for about 2 s (a CPU pushing into a
  defender, waiting on a pass that won't come), force a rethink.
- The `Brain` methods are extended by later files (`thinkHandler`, `thinkDefense`, `update` each reassigned twice);
  that belongs with A1 and T3.

### Steam publish skill, in full (5 Nov 2026)

Run with `.claude/skills/steam-publish` and `references/steampipe-build-scripts.md` as a readiness review: there's
no Steamworks account, App ID or SDK yet, so the build checker (`scripts/check_steam_build.py`, read-only) has
nothing to check; it ran (`--help`) and is ready for ST7.

Order of work, from the skill (times are Valve's at the time of writing):
1. Partner account, tax and bank (up to 30 days), the $100 Steam Direct fee (first titles wait 21 days after
   paying before release), a separate build account with only the build permissions (ST1).
2. App Admin: launch options per OS (`Islam Dunk.exe`, the `.app` bundle on macOS), depots per OS, all added to the
   Developer Comp package, then Publish the configuration.
3. The store page and content survey (ST4, ST6), review in about 3–5 business days (submit 7 ahead), then Post as
   Coming Soon for at least 2 weeks.
4. Build scripts, checked, uploaded with steamcmd, tested on a password-protected beta branch, then the build
   review (every feature and OS the page lists must work).
5. Release by hand with Release App.

- **ST5:** `electron/electron-builder.yml` targets NSIS, DMG and AppImage (installers); Steam installs files from
  depots, so build the unpacked folders (`--dir`, as `npm run build:electron` already does) for each OS and map
  each to its own depot. A Linux depot runs natively on Steam Deck instead of through Proton.
- **ST6:** Valve asks about generative AI in content that ships (art, audio, text) and how live AI is guarded;
  tools used only to work faster need no listing, and some answers can't be edited after approval. Decide what to
  declare before submitting. Independently, have the Noor questions (`src/data/trivia.js`) checked for accuracy
  by someone knowledgeable before a wider launch.
- **ST3 (refined):** the Deck checklist asks that the default controller setup reaches everything (the View picker
  covers tap-only screens, UX1), that text entry works by controller (the join code and name screens have the
  on-screen picker), text is at least 9 px tall at 1280×800, and the defaults run at 30 fps or better. Deck's
  buttons are A/B/X/Y like the Xbox letters the game shows; PlayStation pads would need their own symbols.
- **ST7:** commit the `.vdf` scripts without any login; the checker's `--json --strict` mode suits CI. The steamcmd
  login token must never be committed.

### itch.io publish skill, in full (5 Nov 2026)

Run with `.claude/skills/itch-publish` and `references/butler-ci.md` as a readiness review (no itch.io page yet).

The web build fits itch.io's HTML5 rules: `index.html` at the root, every path relative (no `src="/…"` or
`href="/…"` in `dist/web/index.html`), one page plus `assets/` and `icons/`, far under 1,000 files and 500 MB; all
outside requests are HTTPS (Firebase, Google Fonts, the relay Worker).

- **G8 (new, affects every portal):** itch.io and CrazyGames run the game inside an iframe on their own domains.
  The relay Worker only answers the origins in `ALLOWED_ORIGINS` (`worker/ice/wrangler.toml`:
  `https://halkotob.github.io` and localhost), so players there would get no relay and the hardest network pairs
  couldn't connect. Add each portal's game origin (itch.io serves HTML games from its `itch.zone` hosts; find the
  exact origin from the first upload) and redeploy. Also check in the Google Cloud console whether the Firebase
  browser key is restricted to certain websites; if it is, add the portal hosts.
- **G7 (refined):** create the page as Draft with Kind = HTML, push the `dist/web` folder (plus `assets/`, `icons/`)
  to an `html` channel and tick "playable in browser"; desktop builds as unpacked folders (not the NSIS, DMG or
  AppImage installers) to `windows`, `osx`, `linux`; `--userversion` from `package.json`; answer the AI disclosure
  as for Steam (ST6). In CI, `BUTLER_API_KEY` as a secret, never printed.
- HTML5 pages on itch.io take payment only as donations; a paid version would need the downloadable builds.

### Game design skill (antigravity-awesome-skills), in full (7 Nov 2026)

Run with `.claude/skills/game-design` through its six parts. Much of what it asks was already found by the game
design theory and improve-game runs above (GT1, GT6, GD1, GD2); this lists what it adds.

| Part of the skill | Islam Dunk | Verdict |
|---|---|---|
| Core loop, the 30-second test | Get the ball → beat your man (moves, fakes, screens, passes) → shoot or dunk → callout, crowd, score pop → back on defence. Every possession is about 10–20 s with a clear payoff | Passes |
| Design document | `docs/art-style.md` covers art only; the design lives in the CHANGELOG, the code and this list (GDS2) | Missing |
| Motivation: achiever | 30 profile levels, achievements, career badges and goals, Barakah Run records. Everything after level 30 stops counting (GDS5) | Strong |
| Motivation: explorer | The neighbourhood, the musalla, Jumu'ah, masjid projects, story beats | Good |
| Motivation: socializer | Online and local duos; ends when the match ends (GD2, GT4) | Weak spot |
| Motivation: competitor | CPU levels, online, King of the Court, bests | Good |
| Reward schedules | All fixed: one cosmetic per level on a known track, XP for every match (60, plus up to 40 for a win). No random drops, which is right for a family game: no loot boxes. Feats could unlock a few things too (GDS4) | Good, keep fixed |
| Difficulty: selection | Very easy to Hard, chosen in Quick Play | Yes |
| Difficulty: dynamic | An optional rubber band (the leading CPU reacts 12% slower when 6+ ahead), never stat changes | Yes, within a match |
| Difficulty: between matches | Since 9.17.4 a newcomer starts on Easy and is offered Medium after the first win (GT1); after that, nothing suggests a better level from a run of results (GDS3) | Partly |
| Progression: skill, power, content, story | All four: the player learns moves; career stats and badges (career only, Halal Bucks stay cosmetic); the calendar, neighbourhood and modes open up; career story | Strong |
| Pacing: early wins, rest beats | Rest beats (halftime, the hub, the gym between games) and, since 9.17.4, a friendly first match (GT1) | Yes |
| Anti-pattern: punish excessively | A loss still pays 60 XP; a Barakah Run has a shield | Avoided |
| Anti-pattern: design in isolation | Tests replay matches, but no real first-time players have been watched (GT6) | Open |

- **GDS1:** `REWARDS` in `src/screens/profile.js` has no level 27 since 9.17.0 (sujood was removed). Finger to the
  sky (`sky`, already in `CAST_CELES`) fits there and is respectful; it needs a `CELE_TXT` entry. Takbir could be
  offered too if the owners want it (standing only, as in the cast).
- **GDS2:** one page, kept current: the pitch in one line, the core loop, each mode in a sentence, how you progress
  (profile, career, Barakah Run), the art and audio direction, and the hard rules from `docs/adr/`. Helps the
  co-owner, playtesters and any new contributor; pairs with T8 (the code overview).
- **GDS3:** Quick Play only, as a one-line prompt on the results screen ("Try Easy next time?" / "Ready for
  Hard?"), dismissable and remembered. Extends 9.17.4's first-win offer (`src/screens/v9174-first-match.js`, same hint row and keys) to every Quick Play match, in both directions. Online and career are unaffected.
- **GDS4:** feats are fixed, not random (no loot-box feel): e.g. first posterizer → a ball skin, first buzzer-beater
  → a title. Gives achievers a goal that isn't only playing more matches.
- **GDS5:** reaching level 30 takes about 15,700 XP (100+ matches); after that a match earns XP that does nothing.
  A "+3" star count on the profile card keeps it counting without new art.

### Architecture (review of 5 Nov 2026)

Full report with diagrams: https://claude.ai/artifact/2xwUSzQF3FH1K7WPRAkDf4

- **A1:** The match reads settings, controls, `Net.role` and `Game.screen` and uses `Math.random` directly, so
  rollback swaps 11 globals around each frame and the league builds its own different swap. Step the match with
  explicit inputs, config and a seed; it returns events (scored, halftime, foul).
- **A2:** 168 sound and effect calls run inside the match, and commentary results feed back into it. The match emits
  events; presentation consumes them with its own random numbers.
- **A3:** Four separate lists of "what the match state is" (host snapshots in 11 files, rollback save, rollback
  serialize, league snapshot) drift and cause desyncs. One State module with save, load, hash and encode.
- **A4:** The renderer writes fields onto players and the ball (`_hudA`, `coach`, `ix`, `_vOwn` …), which is why
  rollback needs a 34-key deny-list. Keep presentation state in its own map.
- **A5:** Keys, touch and pad are turned into moves across 10 sim files; rollback replays inputs on a fake keyboard.
  Every device produces one intent per player per frame.
- **A6:** `render` is reassigned in 30 files and `gameUpdate` in 18; screens should register instead.

## Still to review

- The Axe plugin's own server (keyboard tests, fix suggestions) once it connects.

## Done

(nothing yet)
