# Changelog

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
