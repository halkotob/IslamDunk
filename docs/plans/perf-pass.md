# Plan: a performance pass for slower phones

9.29.3 fixed players scrambling when a phone dropped below 45 fps (the joint springs blew up on long frames). The
fix made the game safe at a low frame rate, but a low frame rate is still a worse game: choppy movement and, online,
the slower phone holding both players back (rollback's time sync waits for it). Screen recording alone pushed a recent
iPhone under 45 fps. The goal is **60 fps in the heaviest normal scenes on a mid-range phone**, and a Battery saver
setting for the rest.

## Measuring

- **`tests/perf/profile.mjs`** drives the real `render()` for N frames per scenario and breaks frame cost down by draw
  function. Start here.
- **`?bench=1`** (`src/render/bench.js`) runs four scenarios in the real game loop on the device itself (a normal
  possession, a dunk with full effects, the Grand Ummah Dome with a 3,000 crowd, an outdoor court) and shows frame
  rate and JS time with a Copy button. This is the one a person runs on a real phone.
- **A stand-in for a phone:** Chromium with CPU throttling (`Emulation.setCPUThrottlingRate`, as the `rb-slow` test
  does at 3x), a phone viewport and `deviceScaleFactor: 3`. Not a phone, but it ranks costs the same way.
- **Already adaptive:** `src/render/adaptive-res.js` lowers the canvas resolution in steps when frames run late.

## Steps

### 1. A baseline

Measure every heavy scene with `profile.mjs` and the throttled phone stand-in: the four `?bench=1` scenarios, plus
Lightning (five players, two balls), King of the Court, a rollback match at 40 ms latency, and the story career's
walk-around and cutscene screens. Record frame time and the top five draw functions for each, in `docs/plans/perf-results.md`.

**Done when** every scene listed has a row with its frame time at 1x and 3x throttle and its top five costs.

### 2. Fix the biggest costs

Take the top costs across all scenes, biggest first. Typical candidates to check (don't assume, measure): the crowd
(thousands of figures redrawn every frame; cache it to an offscreen canvas and redraw only when the camera moves),
floor reflections (every player drawn twice), particles, text drawn every frame that could be cached, and the
rollback replay cost per frame. Each fix keeps the picture the same: compare screenshots before and after (the repo's
screenshot baselines under `docs/review` and the `studio` tests catch changes).

**Done when** each fix is measured (frame time before and after in perf-results.md), the screenshots match, and
`cpu-parity` against `main` shows the same games (a draw-only change must not change play).

### 3. Battery saver

A setting (Options, and offered automatically once adaptive resolution has reached its lowest step for 10 s): fewer
crowd figures, no floor reflections, fewer particles, 30 fps cap with the simulation unchanged (the game steps at 1/60
s regardless). Online it changes only this phone's drawing, never the match: add its key to `RB_LOCAL` in
`rollback.js`, so the host's settings don't override it and it doesn't affect the other phone.

**Done when** Battery saver measurably cuts frame time in every step-1 scene, a rollback match with it on for one phone
has no desync (`rb-*` tests on CI), and the setting is remembered.

### 4. Ship

The results table, the CHANGELOG entry and version bump, the full CI suite, and a note for the user: run `?bench=1` on
a real phone before and after and paste the numbers.

**Done when** the PR's CI passes, apart from failures shown to be red on `main` too.

## Kickoff prompt

```
Follow docs/plans/perf-pass.md: a performance pass for slower phones. Work through the steps in order, measure before
and after every change, and don't skip a "Done when". Build on a new branch, push after each step, and open a PR when
step 4 is done.
```
