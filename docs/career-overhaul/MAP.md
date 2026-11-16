# Career overhaul: the map

How every scene in [SCENES.md](SCENES.md) is run by the code, what is new, and what goes. Written against main at
9.21.1. Everything under `src/career/` was read, `src/career/world/` included.

**Reuse:** an existing system runs it unchanged. **Extend:** an existing system with a story layer on top (new data,
a wrapper, a new option). **New:** written for the overhaul.

The story lives in a new folder, `src/career/story/`, listed last in `src/manifest.json` (just before `boot.js`), so
it can wrap anything before it:

| File | What it holds |
|---|---|
| `story/story-data.js` | the new cast (looks, numbers, stats), the scene graph (chapters, scenes, lines, outcomes), pregame lines by stakes |
| `story/story-runner.js` | the story save (`sv` 10, old saves discarded), the runner, checkpoints, the Journal hookup, the career menu |
| `story/story-hub.js` | the hub: Continue, Gym, Masjid, My Player; chapter name, next event, fundraiser meter |
| `story/story-walk.js` | walk scenes: people on the gym floor and in the musalla, talk targets, side activities |
| `story/story-play.js` | story matches (pregame by stakes, win and loss outcomes), the tournament formats, teams for each stage |
| `story/story-modes.js` | lights out, CHAI HORSE, the dunks-only all-star game, King of the Court for the draw |
| `story/story-post.js` | milestones, moments, the 100% scene, the usable prizes (step 4) |

## Scenes

| ID | Kind | Runs on | Status |
|---|---|---|---|
| C0.1 | scene | `story-runner.js`: a black card with the closing salams fading in (right, then left) | new |
| C0.2 | scene | `cinema.js` scene over a musalla backdrop (`drawMusalla(…, 'salah')` from `masjid-projects.js`, rows seated) | extend |
| C0.3 | walk | `story-walk.js` on the gym floor (`setupPractice`, the walk-and-talk of `intro-world.js` generalised) | extend |
| C0.4 | drill | the tutorial on the gym floor: shoot around with prompts (`story-walk.js` goals on `gym-drills.js` practice) | extend |
| C0.5 | play | `story-play.js`: a pickup match (`newMatch`, home gym venue, Very easy dials), loss replays C0.5 | extend |
| C0.6 | scene | `cinema.js` | reuse |
| C1.1 | scene | `cinema.js` | reuse |
| C1.2 | walk | `story-walk.js` in the gym: stations for shoot around, a drill (`gym-drills.js`), the stat upgrades (`career-screens.js` Train), chai with Imam Dawud, the water cooler (`masjid-props.js`) | extend |
| C1.3 | walk | `story-walk.js`: Ammo Jamil's talk (part of the C1.2 walk, a required talk) | extend |
| C1.4 | walk | `story-walk.js`: Ilyas's talk (required talk) | extend |
| C1.5 | walk | `musalla-walk.js` + `musalla.js` with the new musalla cast (Qari Anas, the Mufti, the Hafiz, Ustath Karim, Musa); the walk ends when everyone in the gym and the musalla has been met | extend |
| C1.6 | play | Lightning (`src/sim/mini-games.js`) with the new cast as the roster; any finish advances | extend |
| C1.7 | scene | `cinema.js`, set in Sh. Saleem's office (`office.js` room drawn behind) | extend |
| C1.8 | play | King of the Court (`src/sim/v8-kotc.js`, `KOTC.gym` flow from `gym-routines.js`) with the new cast; not crowned replays C1.8 | extend |
| C1.9 | scene | `cinema.js` | reuse |
| C2.1 | drill | `gym-drills.js` / `gym-routines.js` drills; three finished drills advance | extend |
| C2.2 | walk | `story-walk.js`: Ilyas and Ammo Jamil on the gym floor | extend |
| C2.3 | scene | the prayer fade (`salah.js` `drawPrayerFade` look: musalla, closing salams as text), then `cinema.js` in the office; sets `C.story.fundOn` | extend |
| C2.4 | scene | `cinema.js`; checkpoint (`C.story.cp = 'C2.4'`); builds the Local bracket (`seasons.js` `makePoolBracket`) | extend |
| C2.5 | choice | `story-play.js` teammate pick (cards with the two standout stats; `seasons.js` chemistry), then a short scene with him | extend |
| C2.6 | play | `story-play.js` on the pool bracket (`seasons.js` + `league.js` real sims); stakes opener; win and loss scenes | extend |
| C2.7 | choice | teammate pick again (keep or change) | extend |
| C2.8 | play | group game 2 (regular) | extend |
| C2.9 | walk | `story-walk.js`: talk to the main characters in the gym | extend |
| C2.10 | play | `story-modes.js` lights out: a normal 2v2 in the home gym; the room is drawn dark with a glow around each player and the ball; the lights come back at 11 points or 2:00 | new |
| C2.11 | scene | `cinema.js` | reuse |
| C2.12 | play | group game 3 (must-win when the group is on the line, else regular) | extend |
| C2.13 | scene | `cinema.js`; through: playoffs talk; out: next season scene, back to C2.4 | extend |
| C2.14 | play | semifinal (must-win); loss: next season, C2.4 | extend |
| C2.15 | play | final (final); loss: next season, C2.4 | extend |
| C2.16 | scene | `cinema.js`; trophy, fundraiser's first total, a masjid project built (`masjid-projects.js` `C.up`) | extend |
| C3.1 | walk | `story-walk.js` in the gym: what's new (more people, the project the title paid for) | extend |
| C3.2 | scene | `cinema.js`; checkpoint; builds the 9-team State table; then the teammate pick | extend |
| C3.3 | play | State table game 1 (opener) | new (format) |
| C3.4 | drill | one drill (any), or skip from the hub's Continue after one | extend |
| C3.5 | play | game 2 | new (format) |
| C3.6 | play | `story-modes.js` CHAI HORSE: HORSE (`mini-games.js`, custom word) against your teammates, the loser makes the chai (a short scene of him doing it) | extend |
| C3.7 | play | game 3 | new (format) |
| C3.8 | play | game 4 | new (format) |
| C3.9 | scene | `cinema.js` | reuse |
| C3.10 | play | `story-modes.js` all-star game: a 2v2 exhibition where only dunks score, a crowd meter fills with every dunk | new |
| C3.11 | scene | `cinema.js`; fundraiser raised by the dunks landed | extend |
| C3.12 | play | game 5 | new (format) |
| C3.13 | play | game 6 | new (format) |
| C3.14 | choice | injury: the current teammate is out until the playoffs; pick a replacement (`C.story.injured`) | new |
| C3.15 | play | game 7 | new (format) |
| C3.16 | scene | `cinema.js` | reuse |
| C3.17 | play | game 8 (must-win if the top four is on the line) | new (format) |
| C3.18 | scene | top four: semifinal draw, the injured teammate returns; out: next season, C3.2 | extend |
| C3.19 | play | semifinal 1 v 4 / 2 v 3 (must-win); loss: next season, C3.2 | new (format) |
| C3.20 | scene | `cinema.js` | reuse |
| C3.21 | play | final; loss: next season, C3.2 | new (format) |
| C3.22 | scene | `cinema.js`; a beat for every main character, a project built, donations | extend |
| C3.23 | scene | `cinema.js` | reuse |
| C4.1 | scene | `cinema.js`; checkpoint; 16-team knockout built (8 existing teams, 7 generated, us); teammate pick | extend |
| C4.2 | play | round of 16 (opener); any loss: next season, C4.1 | new (format) |
| C4.3 | scene | `cinema.js` | reuse |
| C4.4 | play | quarterfinal (must-win) | new (format) |
| C4.5 | scene | `cinema.js` | reuse |
| C4.6 | play | semifinal (must-win) | new (format) |
| C4.7 | scene | `cinema.js` | reuse |
| C4.8 | play | final | new (format) |
| C4.9 | scene | `cinema.js`; the school wing opens (drawn on the masjid outside), father and son make peace | extend |
| C4.10 | scene | `cinema.js` | reuse |
| C5.1 | scene | `cinema.js`; checkpoint; the Ummah Cup field (8 generated teams from other countries) | extend |
| C5.2 | play | `story-modes.js` King of the Court for the draw (`v8-kotc.js`): crowned draws the weakest quarterfinal opponent, each win less draws a stronger one; never knocks you out | extend |
| C5.3 | scene | `cinema.js`; then the teammate pick | extend |
| C5.4 | play | quarterfinal; any loss: next season, C5.1 | new (format) |
| C5.5 | scene | `cinema.js` | reuse |
| C5.6 | play | semifinal | new (format) |
| C5.7 | scene | `cinema.js` | reuse |
| C5.8 | play | final | new (format) |
| C5.9 | scene | `cinema.js` | reuse |
| C5.10 | scene | `cinema.js` over the masjid outside | extend |
| C5.11 | scene | `story-runner.js` credits roll | new |
| P.1 | walk | `story-hub.js`: after The End, Continue offers "Replay a tournament" (each chapter's checkpoint, outcomes kept) | new |
| P.2 | reference | `story-post.js` milestone list (My Player → Milestones) | new |
| P.3 | scene | `story-post.js` moments: each earned milestone queues its scene with its character, played from the hub's Continue | new |
| P.4 | scene | `story-post.js` the 100% scene and the final prizes | new |

## New systems

- **The scene graph** (`story-data.js`): every scene as data: `id`, `kind`, `cast`, `lines`, `next` or outcomes
  (`win`, `loss`, `out`, `through`), `stakes`, `checkpoint`, `hub` (stop at the hub after it).
- **The runner** (`story-runner.js`): `C.story = { at, cp, seen, fund, ... }`; Continue plays `at`; a scene's end
  moves `at` along its outcome; one-time scenes before a checkpoint are never replayed.
- **Checkpoints and next season**: a run-ending loss plays the chapter's next season scene and sets `at` back to the
  chapter's checkpoint; the bracket is rebuilt with the next attempt's seed. Stats, cosmetics, Halal Bucks, chemistry
  and the fundraiser total carry over.
- **The new hub**: four entries (Continue, Gym, Masjid, My Player), the chapter name, the next event, the fundraiser
  meter; the corner menu (Save and load, Title) stays.
- **The fundraiser**: `C.story.fund` toward the school wing; wins and events add to it; a masjid project is built at
  each title; the school wing opens at the National title.
- **The new cast** in `CAST` with stats (standout pairs) and the teammate pick across all seven.
- **Story stage teams**: Local and State draw from the 8 masjid teams of `src/data/teams.js` (stats scaled to the
  stage); Al-Furqan is always in, led by Rayyan; National adds 7 generated teams; the Ummah Cup is 8 generated teams
  from other countries.
- **Tournament formats** beside the existing `pool`: `table` (9 teams, round robin, top four to the semifinals) and
  `ko` (a knockout of 16 or 8, with a seeded draw), wired into `league.js` so every game is a real headless sim.
- **Modes**: lights out (C2.10), CHAI HORSE (C3.6), the dunks-only all-star game (C3.10), King of the Court for the
  draw (C5.2).
- **After the story** (`story-post.js`): about 20 milestones, a moment for each, the 100% scene, usable prizes.

## Removed systems

Each line: the files, the save fields, the screens and the tests it touches.

- **The calendar** (`career/calendar.js`, whole file).
  Save: `C.cal` (`d`, `sched`, `done`, `log`). Settings: `SETTINGS.calendar` and its Settings row (with its help text
  in `screens/v912-polish.js`). Screens: `ccal` (the calendar), the hub's calendar strip. Other code: the
  `calShown`/`calStripGeom`/`calHubSubtitle` guards in `career-screens.js` and `screens/scenarios.js`, the month
  chime in `screens/sfx-moments-hooks.js` (`SFX.calChime` stays as a sound but nothing plays it in career), the
  Review Studio's calendar texts (`review-studio/agent.game.js`, `coverage.js`). Tests: `calendar`, `career-run`,
  `tests/calendar-setup.js`; script `scripts/review-calendar.mjs` (`npm run review:calendar`).
- **The neighbourhood** (`career/world/world-engine.js`, `world-art.js`, `world-scenes.js`, `world-day.js`): it runs
  the calendar's free days, so it goes with it. Save: `C.cal.loc`, `C.store` (store items). Screens: `world` (home,
  street, masjid front, store), the store list, the mirror. Kept: `BAND_COLS` (headband colours used by
  `sim/cast-life.js` outside career) moves to `data/cast.js`. Tests: `world-flow`, `world-walk`, `world-robust`,
  `world-save`, `world-visual`, `world-pad`, `tests/world-setup.js`, the `docs/review/img/world-*.png` baselines;
  script `scripts/review-world.mjs`; the Review Studio's scene and prop items (`review-studio/items.js`,
  `agent.game.js`, `coverage.js`).
- **Jumu'ah** (`career/jumuah.js`, whole file). Save: `C.cal.jum`. Screens: `jumuah`, the door question (`World.jum`),
  the hub's Friday question (`Game.hubJum`). Tests: `jumuah`, `jumuah-visual`, `tests/jumuah-setup.js`, the
  `docs/review/img/jumuah-*.png` baselines; script `scripts/review-jumuah.mjs`; Review Studio (`agent.game.js`
  khutbah texts, `screens.js`, `coverage.js`).
- **The hub-first layer** (`career/v918-hub-first.js`, whole file: Play / Practice / Skip to a day / Go outside, the
  Friday question). Save: none of its own. Screens: the hub rows. Tests: `hub-presses`, `hub-arrive`
  (`tests/hub-first.mjs`); Review Studio coverage (`hubJumuahOffer`).
- **The pregame intention picker, the eight office lessons, partner side-scenes, the rival feud with Jalal, the
  end-of-season ceremony, the musalla "news" lines** (`career/career-story.js`, whole file). Save: `C.niyyah`,
  `C.niyyahAsked`, `C.niyyahKept`, `C.lessons`, `C.pStory`, `C.rivalAsks`, `C.rivalDone`, `C.awardsSeen`, `C.heard`,
  `C.inBarakah`. Screens: the niyyah choice before a game, the lessons in the office, the awards scene. Other code:
  `anyNews` marker in `masjid-props.js`; `screens/review-mode.js` and the Review Studio list `NIYYAH`, `NEWS`,
  `PARTNER_STORY`. Tests: `v98` (its niyyah and story-choice checks).
- **Weekly goals, the rookie checklist, badges** (`career/career-goals.js`, whole file). Save: `C.goals` (`rookie`,
  `week`, `badges`, `rivalArc`). Screens: `cgoals` (Goals & badges), the hub's goal row and badge pills. Other code:
  `rookieDo`, `weekAdd`, `badgeAdd`, `goalPay` calls in `gym-routines.js`; `CGame` read by `league.js` (by name,
  guarded); badge effects in career games (`humanDiffMult`). Tests: `hub-layout` (badge pills),
  `tests/hub-layout.mjs`, `tests/hub-setup.js`.
- **The old hub, bracket screen entry and season loop** (parts of `career-screens.js`, `seasons.js`): the five-row
  hub menu, Bracket, the Season N+1 screen (`newseason`) and the World-Cup-again loop are replaced by the story hub
  and the checkpoints. Save: `C.seasonOver`, `C.done` (the story's `C.story.done` replaces it). Screens: `newseason`,
  `cbracket` entry from the hub (the standings stay, opened from the next-event card). Tests: `career`, `career-intro`,
  `first-*` (first career match), `difficulty` (`first-three`, `ladder`), `save-*` fixtures with old saves,
  `league-*` fixtures that build old careers; script `scripts/review-hub.mjs`, `scripts/review-league.mjs`.
- **The in-world intro** (`career/intro-world.js`: outside with Sh. Saleem, meet Khalil, Nasser, Uncle Mahmoud):
  replaced by Chapter 0. Its walk-and-talk engine (bubbles, prompts, NPC acts) is reused by `story-walk.js`.
  Save: `C.seen.intro`, `C.seen.meetNew`. Screens: `introout`. Tests: `career-intro`.
- **The pregame scout report and the post-game stat lines of Tariq and Uncle Siddiq** (`progression.js`:
  `buildScout`, `drawScout`, `tariqLine`, `siddiqLine`, `siddiqChalk`, the milestone `BEATS` lines spoken by the old
  cast). Save: `C.beats`. Screens: `scout`. Kept from `progression.js`: `econSelfCheck`, `trackCareerGame`, the
  stage logs, `drawConvo`.
- **Jalal and Al-Burhan** (`career.js` `rivalTeam`, `castDef('jalal')`, `STORY`; `seasons.js` lines; `musalla.js`
  and `office.js` lines): the rival is Al-Furqan, captain Rayyan. Save: `C.rival` (kept, now the record against
  Al-Furqan).
- **The old cast as named characters in career** (Khalil, Nasser, Tariq, Uncle Mahmoud, Uncle Rafiq, Uncle Siddiq):
  `career.js` `STORY` and `CAST` lines, `seasons.js` `PARTNERS`, `musalla.js` `MUS_CAST`/`TALK`, `musalla-walk.js`
  `MUS_SPOTS`, `office.js` `HORSE_OPPS` and Sheikh lines naming them, `gym-routines.js` (1v1 vs Nasser, the passing
  drill's Khalil, the gym King of the Court roster), `masjid-props.js` captions. Their `CAST` entries stay because the
  mini games outside career use them (`sim/match-extras.js` `castPlayer`, `MINI_TALK`). Save: `C.chem` keys
  (replaced by the new cast's), `C.partner`.
- **The Barakah Run's link from career**: none exists in 9.21.1 (the Run is reached from Quick Play and the dev
  panel only); nothing to remove, and the Run is untouched.
