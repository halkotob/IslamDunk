# Career overhaul: implementation brief

You are rebuilding the career mode of Islam Dunk (2v2 masjid-league arcade basketball, this repo) into a
chaptered story: a new brother finds a community at the masjid, makes the team, and plays from the masjid league
to the Ummah Cup while the masjid raises money for a school wing for the kids.

Every design decision is settled; build straight through. The scene-by-scene story, cast, checkpoints and prizes
live in [`SCENES.md`](SCENES.md): read the whole file before step 1, then reread each chapter's table when you
build that chapter. Every scene has an ID (`C2.10`); use the IDs in code, saves, tests and commits.

## The shape

- **The story replaces the current career.** The main menu entry is still **Career**; the rest of the main menu
  (quick play, online, fun modes and the rest) stays exactly as it is.
- **Old career saves are discarded.** The game is still in testing: bump the career save's `sv`, and load any
  older career save as a new career. No migration.
- **The career hub** is four entries and nothing else: **Continue** (plays the next scene or game),
  **Gym** (practice and drills), **Masjid** (walk around, talk, use props), **My Player** (stat upgrades, look,
  Journal). Beside them: the chapter name, the next event, the fundraiser meter. Simple and in the game's style.
- **Kept from today's career:** stat upgrades, prayer before a game (its bonus), masjid projects (now the
  fundraiser), the Journal, the teammate pick with chemistry, the Sheikh's office (as a story location).
- **Removed from career:** the calendar, Jumu'ah, the pregame intention picker, weekly goals, the rookie
  checklist, badges, the eight office lessons, partner side-scenes, the end-of-season ceremony, Jalal, and the
  old cast (Khalil, Nasser, Tariq, Uncle Mahmoud, Uncle Rafiq, Uncle Siddiq) as named characters.
- **The Barakah Run stays in the game outside career, untouched.** Only its link from career goes.
- **You write all dialogue, the milestone list and the prizes** (SCENES.md says what each scene must do). The
  user edits after each release; ship your best draft.

## What exists (read before designing)

The career is in `src/career/` (one shared scope, concatenated in the order of `src/manifest.json`; a new file
goes into the manifest, a removed one comes out). Systems the story is built on:

| Story need | Existing system |
|---|---|
| Story scenes, choices, Journal | `cinema.js` (letterboxed scenes, `['choice', ...]` lines, Journal) |
| Walk-and-talk, props | `intro-world.js` (first-visit walk), `musalla.js`, `musalla-walk.js`, `masjid-props.js` (the water cooler: the model for usable prizes; the light switch: the lights-out game) |
| Stages, difficulty, cast looks | `career.js` (`STAGES`: Local, State, National, World; `CAST`; `saleemDef`) |
| Bracket games | `league.js` (every bracket game is a real headless sim, seeded), `seasons.js` (group stage, partner + chemistry) |
| Drills, prayer | `gym-drills.js`, `gym-routines.js`, `salah.js` |
| Mini games | `src/sim/mini-games.js` (Lightning, HORSE with custom words), `src/sim/v8-kotc.js` (King of the Court) |
| Fundraiser, money | `masjid-projects.js`, Halal Bucks in `progression.js` |
| Hub, career screens | `career-screens.js`, `office.js`, `hub-layout.js` |
| Teams | `src/data/teams.js` (8 masjid teams) |

The removed systems live mainly in `calendar.js`, `jumuah.js`, `career-story.js`, `career-goals.js`,
`barakah-v2.js` / `barakah-run.js` (career links only) and parts of `progression.js` and `office.js`. Remove
their career use cleanly: no dead screens, no orphaned save fields, no menu entries that lead nowhere.

## House rules

These are conventions the code relies on that no config states:

- **Prizes and Halal Bucks stay cosmetic.** Rewards change how the gym, masjid and player look, never stats or
  match play. `econSelfCheck()` in `progression.js` enforces this; it stays empty. The one gameplay touch allowed
  is a practice-gym prop's small gym-only effect, like the cooler's turbo refill.
- **Prayer is shown with respect:** the closing salams as text, the musalla before and after, lining up. The
  prayer itself is never animated or played.
- **Determinism:** league games, draws, generated teams and scene branches come from the career's seeded random
  stream, so a save reloads into the same story. Background sims keep the main random stream untouched (see
  `league.js`).
- **Everything outside career plays exactly as before:** quick play, online, mini games, fun modes, the title
  demo, the Barakah Run.
- **Each release** bumps `package.json`'s version and adds a `CHANGELOG.md` entry in the existing style (a
  `## X.Y.Z: title` line, then what the player now sees and how it was checked).

## Steps

### 1. Map SCENES.md onto the code

Write `docs/career-overhaul/MAP.md`: one row per scene ID with the system that runs it and whether that is
**reuse**, **extend** or **new**; then the list of new systems; then the list of removed systems with the files,
save fields, screens and tests each one touches.

**Done when** every scene ID in SCENES.md has a row, and every removed system lists everything it touches.

### 2. The foundation, with Chapter 0 as a tracer bullet

Build, in one release:

- **The scene graph:** chapters and scenes as data (ID, kind, cast, lines, unlock conditions, outcomes such as
  win, loss, choice), a runner that moves the career through it, checkpoints, and the save (current scene ID,
  checkpoint, carried-over progress).
- **The new hub and the save reset** described in "The shape".
- **The removals:** every removed system out of career, with its tests replaced by story tests or retired.
- **The new cast** in `CAST` (looks, numbers, stats with the standout pairs from SCENES.md).
- **Chapter 0** end to end through the graph: salams on black, the musalla, the gym, the tutorial, the pickup
  game (retry until won), the invitation.

**Done when** a new career plays C0.1 to C0.6 and lands in Chapter 1; a reload at any Chapter 0 scene resumes
there; the scenes are in the Journal; the hub shows exactly its four entries; a bot test in `tests/run.mjs`
drives the path; and `npm test` passes.

### 3. Chapters 1 to 5, one release each

Build the chapters in order. For each: reread its table in SCENES.md, build every scene, give every `play`
scene its win and loss outcomes, give every pregame scene lines for its stakes, wire its checkpoint and its next
season scene, and build its new modes (lights out, CHAI HORSE, the dunks-only all-star game, the 9-team state
table, the 16-team knockout with generated teams, King of the Court for the draw).

**Done when**, for that chapter: every scene ID in its table is reachable in play; every loss reaches its
checkpoint (or replays, for retry scenes); a bot test plays the chapter on the winning path and through at least
one loss; and `npm test` passes.

### 4. After the story

Milestones, moments, the 100% scene, and the usable prizes (P.1 to P.4).

**Done when** every milestone can be earned, each unlocks its moment, 100% unlocks the final prizes and scene,
every prize is usable in the world, and `econSelfCheck()` is empty.

### 5. Finish

**Done when** all of this holds:

- A bot plays a new career from C0.1 to **The End** (C5.11), and through at least one checkpoint restart in
  every chapter that has one.
- Every scene ID in SCENES.md appears in at least one test's path.
- `npm test` is green, and nothing outside career changed behaviour.
- A review pass: screenshots of each chapter's key scenes and the hub (the repo's review scripts in `scripts/`
  show how), checked for overlapping text at phone and desktop sizes.

## Tracking

This repo tracks work in GitHub Issues (see `docs/agents/issue-tracker.md`). After step 1, file one issue per
release (foundation + Chapter 0, each chapter, the post-story) and close each with its release.
