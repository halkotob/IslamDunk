# Improvements backlog

Ideas found by reviewing the codebase, to be pulled into development by priority. Add new findings here, mark the
ones in progress, and move finished ones to **Done** with the version that shipped them.

Score: **Priority = (Impact + Risk) × (6 − Effort)**, each from 1 to 5. Higher is sooner.

| # | Item | Source | Impact | Risk | Effort | Priority | Status |
|---|------|--------|:-:|:-:|:-:|:-:|---|
| T1 | Run the tests automatically on every push to `main` | tech debt | 4 | 5 | 2 | **36** | open |
| T2 | Catch errors on players' devices and add them to the Network report | tech debt | 3 | 4 | 2 | **28** | open |
| T5 | Stop committing the built `index.html`; publish Pages from the build | tech debt | 3 | 3 | 2 | **24** | open |
| T4 | One settings module that owns every saved setting | tech debt | 3 | 3 | 2 | **24** | open |
| T6 | Align the Playwright version with the test browsers | tech debt | 2 | 2 | 1 | **20** | open |
| T8 | A short architecture overview, glossary and decision records | tech debt | 2 | 2 | 1 | **20** | open |
| A4 | Give the renderer its own view state | architecture | 3 | 4 | 3 | **21** | open |
| A1 | Make the match simulation one deep module (first step: one config and seed object) | architecture | 5 | 4 | 4 | **18** | open |
| A2 | Make sound, effects and commentary consume match events | architecture | 4 | 4 | 4 | **16** | open |
| A3 | One state codec for snapshots, rollback saves and checksums | architecture | 4 | 4 | 4 | **16** | open (after A1, A4) |
| A5 | One player intent per frame from every device | architecture | 3 | 3 | 4 | **12** | open (after A1) |
| A6 | A screen registry instead of reassigning `render` / `gameUpdate` | architecture | 3 | 2 | 3 | **15** | open |
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
- Testing strategy (`engineering:testing-strategy`): what the ~95 tests cover and miss.
- Security review (`security-review`): the lobby, P2P messages and the TURN Worker.
- Code review of the hot-spot files (`code-review`).

## Done

(nothing yet)
