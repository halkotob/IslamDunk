# Plan: full-game replays and share links

Since 9.30.0 every online mode runs on rollback (`src/online/rollback*.js`, `src/online/v930-rb-*.js`): a match is
built from the host's start message (`cfg`, the `rbgo` presence) and stepped by `rbStep(inputs)` with deterministic
math and seeded randomness. **The start message plus every frame's two inputs reproduce the whole game exactly.** A
replay is that: a few kilobytes, not a video.

## What you get

- **Watch it again:** any finished game, from the final screen ("Watch replay"), with pause, slow motion (0.5x),
  fast forward (2x, 4x) and jumping back and forward.
- **Share it:** a link (or a small file) a friend opens to watch the same game.
- **Report a bug:** "Send this game" gives a link that reproduces the exact frames, instead of a screen recording.

## What exists to build on

| Need | Where |
|---|---|
| Building a match from a start message | `RBN.start(cfg, me)` and its wrappers (`v9171-rb-start.js`, `v930-rb-*.js` for the minis, Barakah Run and King of the Court) |
| One deterministic frame | `rbStep([in0, in1], resim)` in `rollback.js` |
| Inputs, packed | `rbIn`, `rbPackIn` / `rbUnpackIn`, runs `rbRunsOut` / `rbRunsIn` (`rollback-net.js`): one number a frame, runs of the same input as one |
| Saving and restoring a moment (for jumping around) | `rbSave()` / `rbLoad(S)` |
| A checksum of the state | `rbHash()` |
| The proof that a run reproduces | `tests/rollback-session.js`, the `rb-determinism` and `rb-rollback` tests, and `tests/rollback-jsc.mjs` (Safari's engine) |
| Short highlight clips and video export | `Replay` (`src/sim/match-extras.js`, the last 300 frames), `src/screens/clip-video.js` |

## Decisions (defaults; ask the user before step 2 only if one of these looks wrong once you're in the code)

| # | Question | Default |
|---|---|---|
| D1 | Which games can be replayed? | Every rollback game (online on a direct link), and offline Quick Play: run offline Quick Play through the same `rbStep` path (seeded, inputs recorded) when it starts, so it records the same way. Career, mini games offline and the attract demo are out of scope for v1. |
| D2 | Which builds can play a replay? | Only the build that made it: the replay stores `VERSION`, and another version says "made on 9.x, open it on that version" instead of playing a different game. |
| D3 | The link | The replay, deflated (`CompressionStream`) and base64url, in the URL's hash (`#replay=...`, never sent to a server). Over about 8 KB, a file download instead ("Save replay"). |
| D4 | Where replays are kept | The last 10 finished games on this device (local storage), plus any the user saves. |

## Steps

### 1. Record

Record every replayable game (D1): the start message and each frame's two packed inputs, kept with the match, and the
final frame's `rbHash()`.

**Done when** a recorded Head to head game (two phones on the test link, `?net=loop`), a recorded Lightning game and a
recorded offline Quick Play game each produce a replay, and their sizes are written down (expect a few KB a minute).

### 2. Play back

Build the match from the replay's start message (`RBN.start` without the network) and step it with the recorded
inputs. Playback is a tracer bullet: get one Head to head game to its last frame before adding controls.

**Done when** playing back each replay from step 1 reaches the recorded last frame with the same `rbHash()`, in
Chromium and in JavaScriptCore (`bun`, as `tests/rollback-jsc.mjs` does).

### 3. Controls

Pause, 0.5x / 1x / 2x / 4x, and jumping: keep an `rbSave()` every 5 seconds of game while playing, restore the nearest
one and step forward to the target frame. The camera follows play as in a match; a "follow player" choice is a bonus.

**Done when** a jump to any frame lands within 0.2 s of real time on a phone-sized test, and its `rbHash()` equals
the same frame reached by playing straight through.

### 4. Share and keep

The replay list (D4), "Watch replay" on the final screen, the link (D3) and the file fallback, and opening a link
straight into playback.

**Done when** a link copied from one page and opened in a fresh page plays the same game to the same final hash, a
too-big replay offers the file instead, and a replay from another version shows the D2 message.

### 5. Ship

A test in `tests/` covering steps 2 to 4 (record, play back to the same hash, jump, open from a link), the CHANGELOG
entry and version bump, the full CI suite.

**Done when** the PR's CI passes, apart from failures shown to be red on `main` too.

## Kickoff prompt

```
Follow docs/plans/replays.md: full-game replays from the rollback inputs. Take its decision defaults, work through
the steps in order, and don't skip a "Done when". Build on a new branch, push after each step, and open a PR when
step 5 is done.
```
