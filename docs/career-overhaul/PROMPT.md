# Prompt: overhaul Islam Dunk's career mode into a story campaign

You are rebuilding the career mode of Islam Dunk (2v2 masjid-league arcade basketball, this repo) into a
chaptered story campaign: a new brother arrives in town, finds a community at the masjid, makes the team, and
plays from the masjid league to the Ummah Cup while the masjid raises money for a school wing for the kids.

The story is fixed; the work is making it **playable, data-driven and finished**. The scene-by-scene story, cast
and through-lines live in [`SCENES.md`](SCENES.md): read the whole file before step 1, then reread each chapter's
table when you build that chapter. Every scene has an ID (`C2.10`); use the IDs in code, saves, tests and commits.

## What already exists (extend it, keep its behaviour)

The career is in `src/career/` (one shared scope, concatenated in the order of `src/manifest.json`; a new file
goes into the manifest). Read these before designing anything; most beats map onto a system already here:

| Need in the story | Existing system |
|---|---|
| Story scenes, choices, Journal | `cinema.js` (letterboxed scenes, `['choice', ...]` lines, every scene kept in the Journal) |
| Walk-and-talk in the masjid | `intro-world.js` (first-visit walk), `musalla.js`, `musalla-walk.js`, `masjid-props.js` |
| Stages and their difficulty | `career.js` (`STAGES`: Local, State, National, World; `CAST`), `league.js` (every bracket game is a real headless sim, seeded), `seasons.js` (group stage, partner + chemistry) |
| Game days, Jumu'ah | `calendar.js` (games on Wednesdays and Saturdays, never a Friday or an Eid), `jumuah.js` |
| Intentions, rival, partner scenes | `career-story.js` (niyyah before a game, Jalal, partner scenes) |
| Drills, prayer | `gym-drills.js`, `gym-routines.js`, `salah.js` |
| Mini games | `src/sim/mini-games.js` (Lightning, HORSE), `src/sim/v8-kotc.js` (King of the Court) |
| Fundraiser and the masjid growing | `masjid-projects.js`, Halal Bucks in `progression.js` |
| Goals, badges, checklists | `career-goals.js`, `src/data/achievements.js` |
| Save | the career save in `career.js` (`sv` is the schema version inside the `v:1` envelope, with a migration for older saves) |

## House rules

These are the conventions the code relies on that no config file states:

- **Halal Bucks and everything the fundraiser buys stay cosmetic.** Rewards change how the masjid and gym look,
  never stats or gameplay. `econSelfCheck()` in `progression.js` enforces this; it stays green.
- **Prayer is shown with respect:** arriving, lining up, the musalla before and after. The prayer itself is
  never animated or played (the same rule as `jumuah.js`).
- **Determinism:** league games, draws and scene branches come from the career's seeded random stream, so a save
  reloads into the same story. Keep the main random stream untouched by background sims (see `league.js`).
- **Online, quick play, mini games and the title demo play exactly as before.** The overhaul only touches career.
- **Lines are short:** one or two lines per bubble, the tone of the existing scenes. Islamic terms are used
  accurately and respectfully.
- **Each release** bumps `package.json`'s version and adds a `CHANGELOG.md` entry in the existing style (a
  `## X.Y.Z: title` line, then what the player now sees and how it was measured).

## Decisions (defaults; the user can override any row)

| # | Question the outline left open | Default |
|---|---|---|
| D1 | Start with the prayer scene or go straight to the gym? | Prayer scene first (C0.1 to C0.2), skippable. |
| D2 | Earn the spot outright or through an injury? | Win King of the Court; two losses play the injury scene (C1.8b). |
| D3 | Names of Ammo and his son | _Ammo Haytham_ and _Zayd_ (placeholders). |
| D4 | One new character for each of Imam, Mufti, Ustath, Hafiz, Qari, Hajji? | Yes; existing cast keep their roles. At least 6 pickable teammates in total, each with two standout stats. |
| D5 | What happens after a lost season? | **Season loop:** a new year starts at the chapter's loop point (named in SCENES.md); progress, unlocks and the fundraiser total carry over; a short "next season" scene plays. |
| D6 | Existing saves | Bump `sv`. An existing career migrates to the start of the chapter matching its current stage, with its unlocks, money and titles kept. |
| D7 | All-star game format | Dunks only, built on the existing dunk system and the dunk contest rules. |
| D8 | Lights-out drill | A dark variant of an existing mini game (vision radius around each player), not a new rule set. |

## Steps

### 1. Map the outline onto the code

For every scene ID in SCENES.md, write one row in `docs/career-overhaul/MAP.md`: the ID, which existing system
runs it, and whether it is **reuse**, **extend** or **new**. Then list the new systems the map calls for (expect
at least: a chapter/scene graph that drives the career, pregame scenes by stakes, the season loop, teammate
standout stats, the injury swap, the all-star dunks game, the lights-out variant, KOTC for the draw, milestones).

**Done when** every ID in SCENES.md has a row and every **new** row names the system that will run it.

### 2. Checkpoint with the user

Show the user MAP.md, the decision table above with any rows you think should change, and the save migration
plan. Wait for their answer before writing code; their answers become edits to this file and SCENES.md.

**Done when** the user has approved the map and every decision row.

### 3. Build the story graph, with Chapter 0 as a tracer bullet

Build the scene graph first: chapters and scenes as **data** (ID, kind, cast, lines, the conditions that unlock
it, and its outcomes such as win, loss or choice), and a runner that moves the career through it and saves the
current scene ID. Then build Chapter 0 end to end through that graph: arrival, prayer, gym, tutorial, pickup game,
invitation. Chapter 0 proves the graph, the save and the test harness on the smallest real slice.

**Done when** a new career plays C0.1 to C0.6 and lands in Chapter 1, a reload at any scene resumes at that scene,
the scenes appear in the Journal, and a test in `tests/run.mjs` drives that path by bot.

### 4. Build the chapters in order, one release each

Build Chapters 1 to 5 and the post-story, in order. For each chapter: reread its table in SCENES.md, build every
scene in it, give every `play` scene both its win and loss outcomes, give every pregame scene a line set for its
stakes, and ship it as its own release (version, changelog, tests).

**Done when**, for that chapter, every scene ID in its table is reachable in play, every loss path reaches its
season loop or retry, the bot test plays the chapter both on the winning path and through at least one loss, and
`npm test` passes.

### 5. Finish

**Done when** all of this holds:

- `career-run` (or its successor) plays a new career from C0.1 to **The End** (C5.11), and through at least one
  season loop in each chapter that has one.
- An existing save from the current release loads, migrates (D6), and continues.
- Every scene ID in SCENES.md appears in at least one test's path.
- Milestones, moments and 100% completion work (P.1 to P.4) and award cosmetic prizes only.
- `econSelfCheck()` is empty, and `npm test` is green.
- A short review pass: screenshots of each chapter's key scenes (the repo's review scripts in `scripts/` show
  how), checked for text overlap at phone and desktop sizes.

## Working with the issue tracker

This repo tracks work in GitHub Issues (see `docs/agents/issue-tracker.md`). After step 2, file one issue per
chapter (and one for the scene graph) so each release maps to an issue, labelled `ready-for-agent` once it is
fully specified.
