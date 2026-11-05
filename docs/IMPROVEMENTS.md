# Improvements backlog

Ideas found by reviewing the codebase, to be pulled into development by priority. Add new findings here, mark the
ones in progress, and move finished ones to **Done** with the version that shipped them.

Score: **Priority = (Impact + Risk) × (6 − Effort)**, each from 1 to 5. Higher is sooner.

| # | Item | Source | Impact | Risk | Effort | Priority | Status |
|---|------|--------|:-:|:-:|:-:|:-:|---|
| T1 | Run the tests automatically on every push to `main` | tech debt | 4 | 5 | 2 | **36** | open |
| S2 | Firebase limits and abuse: 100 players at once on the free plan; no App Check | security | 5 | 4 | 2 | **36** | open |
| Q2 | Run the phone and online tests in WebKit (Safari's engine) too | testing | 4 | 4 | 2 | **32** | open |
| S1 | Cap the rollback input runs (a modified game can freeze the other player) | security | 3 | 3 | 1 | **30** | open |
| T2 | Catch errors on players' devices and add them to the Network report | tech debt | 3 | 4 | 2 | **28** | open |
| S3 | Only the game can get relay (TURN) credentials; usage alert | security | 3 | 4 | 2 | **28** | open |
| Q3 | A folder of old saves that every release must load | testing | 3 | 4 | 2 | **28** | open |
| Q7 | A daily live check of the relay Worker | testing | 2 | 3 | 1 | **25** | open |
| T5 | Stop committing the built `index.html`; publish Pages from the build | tech debt | 3 | 3 | 2 | **24** | open |
| T4 | One settings module that owns every saved setting | tech debt | 3 | 3 | 2 | **24** | open |
| A4 | Give the renderer its own view state | architecture | 3 | 4 | 3 | **21** | open |
| Q8 | Fast match tests in Node, without a browser (after A1) | testing | 4 | 3 | 3 | **21** | open (after A1) |
| T6 | Align the Playwright version with the test browsers | tech debt | 2 | 2 | 1 | **20** | open |
| T8 | A short architecture overview, glossary and decision records | tech debt | 2 | 2 | 1 | **20** | open |
| S5 | Drop malformed online messages instead of crashing the frame | security | 2 | 3 | 2 | **20** | open |
| Q4 | Tests for the Firebase database rules (local emulator) | testing | 2 | 3 | 2 | **20** | open |
| Q5 | Tests that send hostile online messages (with S1, S5) | testing | 2 | 3 | 2 | **20** | open |
| A1 | Make the match simulation one deep module (first step: one config and seed object) | architecture | 5 | 4 | 4 | **18** | open |
| Q6 | A frame-time budget test on a slowed-down phone profile | testing | 3 | 3 | 3 | **18** | open |
| A2 | Make sound, effects and commentary consume match events | architecture | 4 | 4 | 4 | **16** | open |
| A3 | One state codec for snapshots, rollback saves and checksums | architecture | 4 | 4 | 4 | **16** | open (after A1, A4) |
| S4 | Longer join codes, the guest's name in the lobby, a way to remove a guest | security | 2 | 2 | 2 | **16** | open |
| A6 | A screen registry instead of reassigning `render` / `gameUpdate` | architecture | 3 | 2 | 3 | **15** | open |
| A5 | One player intent per frame from every device | architecture | 3 | 3 | 4 | **12** | open (after A1) |
| T3 | Fold the 34 versioned patch files (`v6-…` to `v9161-…`) into their feature files | tech debt | 4 | 3 | 5 | **7** | open (gets easier after A1, A6) |

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

- Accessibility audit (`design:accessibility-review`): touch target sizes, contrast, text size, motion.
- Code review of the hot-spot files (`code-review`).

## Done

(nothing yet)
