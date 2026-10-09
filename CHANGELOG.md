# Changelog

## 8.2.0: Phase 3 — easier to play, better feel, and fixes
- **Fix: mini games start and their settings change again.** On touch, tapping a row in Quick Play →
  Mini games was undone the same frame, so no setting could change and Start could never be reached.
  Now one tap changes a setting and one tap on Start starts the game.
- **Fix: Lightning, on deck.** The second shooter can shoot as soon as the ball ahead of him leaves the
  shooter's hand. He shoots from his spot first in line instead of waiting for the spot to clear.
- **Fix: Lightning, last two.** A made shot could be undone by the two-ball code. The scorer's ball went
  back to "in the air" and was his again, so he could grab his own make and dunk for the knockout without
  going back behind the arc. Fixed at the source. A shoot button held while running back can no longer
  fire the moment the pass lands either. Every knockout now needs a three first.
- **Fix: resets.**
  - Side-outs (fouls, reach-ins) in your own half get the same protected space as other restarts.
  - New watchdog: a dead ball always restarts, a stalled check-up or inbound goes live, a ball that ends
    up out of reach comes back as an out-of-bounds restart, and a ball nobody can pick up is freed.
    Nothing can eat a whole possession.
- **Tutorial** (Quick Play → Tutorial: learn to play). Nine hands-on steps on a real court: move, sprint,
  shoot, dunk, pass, dribble moves, defend, steal and block. Each step waits until you've done it (or
  you skip it); the text matches keyboard or touch.
- **Casual controls** (Settings → Controls, off by default). Tap SHOOT and the release times itself
  near the top (no pump fakes). On defense, leaving the stick alone guards your man. Online stays
  Classic.
- **Stride dribble** (Settings → Dribble, off by default). NBA Jam rhythm: one bounce every other step,
  locked to the feet. About 2 to 2.5 bounces a second jogging and 3 to 4 sprinting (Classic is 5 to 8).
  Sprinting pushes the ball out in front on a lower bounce. Only the look and sound change.
- **Skill moves that read.** Each move has its own body language: a low, wide crossover, a
  pause-then-burst hesitation, a step-back that leans away, arms out on the spin. A dust kick off the
  plant and a short trail behind the ball show what happened.
- **Game reactions:** scoring runs ("8-0 RUN!"), lead changes, a late tie, and "LOCKDOWN!" after three
  stops in a row on your end.
- Settings: "Control" is now "Team control". New `phase3` test; `minis` and `defense` tests cover the
  fixes.

## 8.1.0: Phase 2 — the Defense button, contested dunks, real resets
- **Defense button (replaces stance).** On defense the MOVE button is now DEFEND, and L (Numpad 3 for
  player 2) is a dedicated key for it.
  - Hold it and you lock onto your man: the ball handler, unless your partner already has him.
  - The game moves you between him and the rim at arm's length and keeps pace with him, so he can't
    just run past you. A dribble move, a fake or a screen can still beat you.
  - Staying with a quick man costs stamina, like sprinting. The stick adds a lean.
  - Feet set in his path draws a charge.
  - On a shot or a loose ball, holding DEFEND boxes out.
  - Your CPU partner takes the other man. Hold PASS on defense to have your partner double the ball
    (tap PASS is still a steal).
- **Contested dunks.**
  - A defender in your path or at the rim turns a dunk into a contest that can rattle out
    ("DENIED AT THE RIM!"). He jumps to contest if he's holding DEFEND or is a CPU who reads it.
  - You can't take off from range through a defender standing in your lane.
  - The sprint-dunk runway is shorter: no more dunks taking off from near the three-point line.
- **Resets.**
  - Full court: after a basket or a dead-ball inbound, the offense gets its own half. The defense
    runs back past half court ("GET BACK") and can't steal, shove or pick off a pass there until the
    ball crosses half court.
  - Half court: every restart is a check-up at the top of the key. Everyone walks to his spot, the
    defender checks the ball ("CHECK", "BALL IN"), and the clocks wait. This includes after a score in 1 on 1.
- **Control the whole team (option, off by default).** Options → Settings → Control: Your player /
  Whole team. With Whole team you play whoever has the ball, and on defense the man guarding the ball.
  This applies to single-player games with a CPU partner; career, co-op and online are unchanged.
- **Difficulty changes outcomes.** The CPU misses more of everything it shoots on lower settings.
  Measured against a player holding DEFEND, CPU points per possession go from 0.9 on Very easy to 1.3 on
  Medium and 1.6 on Hard. Details in `docs/reports/gameplay-loop.md`.
- Settings rows close up so the whole list fits on screen. The How to play page and the touch button
  labels show DEFEND / hold: GUARD, STEAL / hold: DOUBLE and BOX OUT.
- New `defense` test. `tests/perf/loop-report.mjs` gains a "guard" style (holds DEFEND).

## 8.0.0: Phase 1 — test tools, mini games, Very easy
- **Lightning, rebuilt to the real rules.** Five players line up single file behind the arc. The front of
  the line shoots first from the spot; the next player can't shoot until he has. Miss and you chase your
  own rebound and keep shooting until it drops. Make it and the ball is passed to the next in line. If the
  player behind you scores first, you're out. Last one standing wins.
- **HORSE options.** Pick the word (HORSE, SABR or HAQ) and the time to match a shot (6, 10 or 15 s) in
  Quick Play, the online lobby, and the career gym (uses your last choice).
- **CPU misses in mini games now scale with difficulty.** CPU HORSE make rate measured at about 38%
  on Very easy, 42% Easy, 62% Medium and 71% Hard (it was 79 to 87% on every setting).
- **Mini games in Quick Play.** Quick Play → Mini games: Lightning or HORSE against the CPU, no career
  save or friend needed. The finish screen comes back to the menu for another round.
- **Very easy difficulty** (Options → Settings, lobby, mini games). Slower, sloppier CPU, a wider green
  window for you, fewer fouls called, and your CPU teammate still plays a normal game. In career it is one
  more step below Easy.
- **Test panel (`?dev=1`).** A DEV tab (or the ` key) to jump to any career stage, round or season, win
  or lose the next game, give BP/HB, max stats, unlock everything for the tab, set the score or clock,
  launch any mode, change difficulty, and run the sim at 2x or 4x.
- **Possession log.** Every full game is logged possession by possession (start, length, shots, how
  it ended). The last 30 games stay in the browser; download them or see a summary from the DEV tab.
  `tests/perf/loop-report.mjs` simulates CPU and scripted-human games; findings in
  `docs/reports/gameplay-loop.md`.
- **Human review packet** in `docs/review/`: every line of game text as an editable spreadsheet (with
  speakers), the same grouped for reading, and a gallery of every court and team kit.
- Fixes: "You leads" / "YOU WINS" now read "You lead" / "YOU WIN"; the career gym's Lightning tip
  describes the new rules.
- New `minis` test (Lightning rules over 6 CPU games, blocked early shot, HORSE word/timer).

## 7.9.3: dribble rollback
- The 7.9.2 dribble rework is rolled back: dribbling looks and plays exactly as in 7.9.1 again.
  (Kept: the `controls` test parks defenders during its rules scenarios, so a random steal can't flake it.)

## 7.9.2: dribble smoothing and realism (rolled back in 7.9.3)
- **Steady tempo.** The ball has its own dribble clock instead of riding the run cycle: about 2.2
  bounces/s standing, 2.7 jogging and 3.4 sprinting (was 2.4 / 5.3 / 7.9). The tempo eases between
  speeds, so it never jumps when you start or stop sprinting.
- **Gravity-shaped bounce.** Quick off the floor, a hang at the top, a short contact. Sprinting changes
  the bounce's shape, not its tempo: the ball goes out ahead on a lower, longer bounce. Standing keeps it
  high and close.
- **Hand and sound.** The hand pump follows the ball; the bounce sound plays on the real floor contact.
- **No pops.** Crossovers, behind-the-backs and pump fakes no longer make the ball jump. A picked-up
  dribble is held instead of still bouncing. The dribble follows tall/short and solid/lean bodies.
- **Gameplay unchanged.** Steals and fumbles read the old hand-based ball position; steal odds and
  CPU-vs-CPU stats measured the same. Details: [halkotob/IslamDunk#1](https://github.com/halkotob/IslamDunk/pull/1).
- New `dribble` test; the `controls` test no longer flakes on a random steal.

## 7.9.1: new logo
- The mark is redrawn from scratch as one simple silhouette (no internal lines): a brother in a kufi
  and a full-length thawb taking off for a dunk. He leans in, the ball arm is fully extended, the free
  arm is out for balance, the front knee drives up, and the thawb streams back off the trailing leg.
  Picked from four rounds of options.
- Stored as a baked alpha mask (`DUNKER_PNG` in `src/render/logo.js`), tinted gold on the title and
  splash, and gold on the green tile for the app icons (regenerated with `scripts/make-icons.mjs`).

## 7.9: feel and fairness, new logo, intro staging
- **New logo.** A dunker in a thawb and kufi, in the split-leg, ball-overhead dunk pose, as one gold
  silhouette. It's on the title screen and splash, and in the app icons (regenerated from the game's own
  drawing code by `scripts/make-icons.mjs`).
- **Sprint.**
  - Everyone jogs 8% faster, and sprinting is a bigger step up (1.5x the jog, was 1.42x).
  - Keyboard: hold **Left Shift** while moving (Right Shift for player 2). Double-tap sprint is gone.
  - Touch: pushing the stick to its ring is full speed. Sprinting needs a deliberate push past the dashed
    outer ring, and the knob glows while you sprint. Quick flicks no longer sprint.
- **Stamina, same rule for you and the CPU.**
  - Turbo used to refill only with sprint released, so holding it pinned you at zero. Meanwhile the CPU,
    which lets go, sprinted about twice as often.
  - Now anyone who runs the bar dry is winded until it's back to 45%. The bar refills even while you
    hold sprint and shows red while winded.
  - Measured result: holding sprint now gives you about 35% sprint time; the CPU gets about 21%.
- **Walls.** Players stop at the baselines instead of walking into the gym end walls. A loose ball
  bounces off the end walls and the near sideline back toward the court (it used to travel 70 units past
  the baseline, behind the walls and off frame). The bottom player card turns see-through while someone
  is behind it.
- **Fair restarts.** On side-outs, check balls, 1-on-1 and half-court inbounds, no defender starts
  within arm's length of the handler. Anyone crowding him steps back between his man and the basket, and
  a teammate on top of the handler spreads out. Before this, the defender who fouled you could still be
  touching you.
- **Career intro.**
  - The brothers are busy when you walk in: Khalil shoots around (and swishes), Nasser stretches, Uncle
    Mahmoud sits on a folding chair, Tariq keeps the stat sheet on a clipboard, and Uncle Siddiq pours
    chai at a little table.
  - Whoever you walk up to stops, turns to you and talks with his hands; you nod along. Cinematic bars
    slide in during conversations.
  - Sh. Saleem walks in with you, then goes to his spot. Names only show for people near you.
- **Mobile intro fixes.** The touch stick now works on the walk outside the masjid; before, you
  couldn't move. TALK advances dialogue; before, only a tap on the right spot of the canvas did, which
  read as a freeze.
- **Tests.** New `feel` test (stamina parity, walls, side-out spacing). The `controls` test no longer
  flakes when a turnover inbound is still in the air. Seeded CPU games differ from v7.6 on purpose
  (speed and stamina changed).

## 7.8: career start, body builds, team tiers, in-world intro
- **In-world intro** (`src/career/intro-world.js`). New careers no longer open on a text cutscene. You walk
  up to Sh. Saleem outside Masjid Al-Amanah, follow him up the path and into the gym, then walk around and
  meet Khalil, Nasser, Uncle Mahmoud, Tariq and Uncle Siddiq where they're standing (a checklist tracks who
  you've met). You can shoot around while you're at it. Dialogue is shorter, it appears in speech bubbles
  over the speaker, and "Skip intro" (or Esc) is always available.
- **Creator** (`src/career/builds.js`). A big gold **Start career** button sits under the preview
  (Tab jumps to it). A live **Starting stats** panel shows what your build is good and bad at.
- **Body builds.** Height, build and play style each trade stats:
  - Short: quicker, better hands. Tall: dunks and defends better.
  - Lean: faster with more stamina. Solid: stronger at the rim and on defense.
  - Each play style leans into its strengths.

  Every combination sums to exactly zero, and no stat moves more than ±3. The changes sit on top of
  trained levels, so existing saves rebalance automatically, and changing your look later moves them
  back. The hub and Train screens show the bonus next to each stat.
- **CPU teams.**
  - **Bodies:** career rosters get heights and builds that suit their archetype (rim runners and stoppers
    run big, shooters and playmakers small). They render at that size and their stats include the same
    trades.
  - **Tiers:** each stage now has two weaker, three even and two stronger teams, with the rival included
    and labels based on actual roster strength. Stronger teams also play slightly smarter.
  - **Display:** the hub shows the next opponent's rating (Beatable / Even / Contender). Pregame shows the
    rating and each player's body.
- Quick play, online and seeded CPU games are unchanged (identical to v7.6). The `career-intro` test covers
  the new flow, the zero-sum builds and the tiers.

## 7.7: adaptive resolution
Benchmarks on real devices (`?bench=1`) showed the drawing code using 2–5 ms per frame, with the only
dips in the busiest venue (Grand Ummah Dome, 2400×1350 on a Retina Mac: 53 fps average, occasional
66 ms frames). So instead of a renderer rewrite (the PixiJS proposal is shelved), v7.7 adds adaptive
resolution (`src/render/adaptive-res.js`):
- During play, if more than 12% of the last ~2 s of frames run late, the canvas draws at a lower pixel
  ratio (100% → 88% → 76% → 66% of normal, never below 1×). After 6 s with under 2% late frames it steps
  back up. A step up that brings drops back is undone and that level skipped for 30 s, so it never flickers.
- Late is measured against the fastest cadence the device has shown, capped at 60 Hz: a phone locked
  to 30 fps (iOS Low Power Mode) isn't mistaken for a slow one, and 120 Hz screens aren't chased.
- Options › Resolution: Auto (default, shows the current level) or Full.
- Only the canvas backing size changes; layout, input and gameplay are untouched (seeded CPU games
  identical to v7.6).
- The benchmark now reports the resolution level per scenario; `tests/run.mjs` has an `adaptive-res` test.

## Project restructure for Steam readiness (shipped with 7.6)

No gameplay, visual or balance changes.

- **Source layout.** The 13,549-line `index.html` is split along its existing section markers into 58 files
  under `src/` (`core`, `sim`, `render`, `screens`, `career`, `online`, `data`), joined in
  `src/manifest.json` order into the same single script. The page shell is `web/index.html`.
  Old-line → new-file map: [MIGRATION.md](MIGRATION.md).
- **Build tooling (Vite).** `npm run dev` (live reload, source-mapped to `src/`), `npm run build:web`
  (single-file web build), `npm run publish:web` (updates the GitHub Pages files at the repo root),
  `npm run build:electron` / `dist:electron` (desktop app).
- **Desktop app (Electron).** Main process with window/menu/fullscreen and window-size presets, a sandboxed
  preload, file-based saves in the user data folder (atomic writes + backup, `localStorage` mirrored),
  icon and app metadata. Steamworks is not wired yet.
- **Tests.** `npm test`: seeded CPU-vs-CPU parity against a reference build, scripted controls, half court,
  career flow, online over all three transports (claude.ai room and Firebase via local fakes, loopback with
  the P2P link and its fallback), and iPhone layouts. `npm run test:electron`: desktop playthrough, save
  file, relaunch, fullscreen, online between two windows.
- **Dead code removed** (verified unreferenced): `DRILL_KEYS`, `FAR_W`/`FAR_PX`, `skyGrad()`,
  `ALL_BACKDROPS`. 8 lines.
- `icons/` and `manifest.webmanifest` moved to `assets/`. The copies at the repo root are now build output.

## 7.6
Online game settings (points to win, half court), peer-to-peer online link, pump fake → double dribble,
visuals pass (Lilita One font, bevelled UI, logo, rim light, impact effects).

## 7.5
Mobile and browser fit (safe areas, no double-tap zoom, scaled touch controls, Add to Home Screen).

## 7.4
Online lobby, lower lag (fixed send rate, guest prediction, lag compensation), ball magnet.

## 7.3
Online 1 on 1 (no CPU).
