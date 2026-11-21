# CI health: evidence (steps 1 and 2 of `ci-health.md`)

## Step 1: what failed in the last 10 runs

Runs 30-39 of `.github/workflows/test.yml` (16-20 Nov 2026), plus the first attempt of run 38 (it was re-run), so
11 attempts. Two were cancelled before the tests finished (30, 32: superseded by a newer push) and one never reached
the tests (39), which leaves **8 attempts with test results**: 31, 33, 34, 35, 36, 37, 38 (attempt 1), 38 (attempt 2).

| Run | Commit | Version | Result |
|---|---|---|---|
| 30 | 93d0dff | 9.21.1 + docs | cancelled |
| 31 | 4d6e33c | 9.21.2 | 134/136 |
| 32 | 181a482 | 9.29.2 (merge) | cancelled |
| 33 | 8c0a974 | 9.29.2 | 131/133 |
| 34 | 0a02290 | 9.29.3 | 129/134 |
| 35 | 7176941 | 9.29.3 (merge) | 131/134 |
| 36 | 9c5b818 | 9.30.0 (part) | 135/137 |
| 37 | e5c3890 | 9.30.0 (part) | 133/138 |
| 38 #1 | f71336a | 9.30.0 | 133/138 |
| 38 #2 | f71336a | 9.30.0 | 135/138 |
| 39 | fac3cca | 9.30.0 (merge) | setup failed, no tests |

| Test | Failed | Every or some | Runs (commits) | Failure detail |
|---|---|---|---|---|
| `fouls-kept` | 8 of 8 | **every** | 31, 33, 34, 35, 36, 37, 38#1, 38#2 | The same counts on every run, 9.21.2 included: `{"AND ONE!":34,"FOUL ON PURPOSE":26,"non-shooting REACH-IN!":85,"non-shooting BLOCKING FOUL":36,"REACH-IN!":8,"BLOCKING FOUL":3}`; no shooting foul counted. |
| `nav-census` | 7 of 7 since 9.29.2 (not in 31) | **every** (since 9.29.2) | 33-38#2 | `touch: 84 screens, 1 with no way out: story: milestones` |
| `rb-lag` | 2 of 8 | some | 34 (0a02290), 38#1 (f71336a) | Bad mobile (400 ms, 10% loss): 15 desyncs, 11 put right; `the same game at the end: false (["35 BWHN","30 NHPA"])`, on the retry too |
| `rb-sounds` | 1 of 8 | some | 34 (0a02290) | rollback half: `shot clock ticks 0` |
| `net-version` | 1 of 8 | some | 38#2 (f71336a) | `rejoin mid-game ... a current client: netwait, handed back: true BAD`; `a newer snapshot format (v3): guest netwait/full BAD` |
| `phone-text-size` | 1 of 8 | some | 38#1 (f71336a) | `Larger, 667x300 phone: postgame: [650, 787] of 1200: "into another line: Win (Final) / Local champi…"` |
| `dunk-new-online` | 1 of 8 | some | 38#1 (f71336a) | `{"nd":{"betweenlegs":2}}` on both phones after 80 s: no reverse dunk; desyncs 0 |
| `rb-lightning` | 1 of 8 (1 of 2 before f71336a) | some | 37 (e5c3890) | `"done":[false,false]` at frame 7250: random play didn't end the game |
| `rb-horse` | 1 of 8 | some | 37 (e5c3890) | `"done":[false,false]` at frame 7214 |
| `rb-brun` | 1 of 8 | some | 37 (e5c3890) | second game didn't start cleanly after the first ended |
| `sound-list` | 2 of 8 | every run on those commits | 34, 35 (9.29.3) | `docs/audio/sound-list.csv is out of date` |
| `sfx-quiet` | 1 of 8 | every run on that commit | 31 (9.21.2) | default sound picks changed in 9.21.2, test still expected the old ones |
| (setup) `playwright install --with-deps` | 1 of 1 since | every (new) | 39 (fac3cca) | `E: Unable to locate package fonts-unifont` ... `Failed to install browsers`: the runner image's apt sources no longer carry Playwright's font list |

Notes:
- `rb-lightning`, `rb-horse`, `rb-brun` were added in 9c5b818 (run 36, passed) and failed in 37; f71336a ("deterministic
  test endings") made them end on a chosen frame and cleared a leftover match end; they passed in both attempts of 38.
- `sound-list` and `sfx-quiet` failed on every run of the commit they failed on and were fixed by the next commit
  (9c5b818 regenerated the list; 9.29.2 updated `sfx-quiet`). They are listed for completeness: they are not flaky.

## Step 2: causes

| Test | Cause | Evidence | Fix |
|---|---|---|---|
| `fouls-kept` | **Chance** (a rare event in one fixed seed set), not a rules change | 100 seeded CPU games on 9.21.2 and on 9.30.0 (`dist/web` of each): 7 SHOOTING FOULs each, the same 5,172 shots bit for bit, so 0.07 a game; P(none in 24) ≈ 19%. Jump-shot contact needs a defender within 22 units at the release (92 of 2,370 releases) and most fouled shots are dunks, which score (215 and-ones). The test is seeded, so it gets the same answer every run: 1 on 9.21.1 (run 29), 0 from 9.21.2 on, when a sound-only change moved the random stream (every count changed: AND ONE 30 → 34). | A defender swipes through a jump shooter at the release, retried with new seeds until a fouled shot misses; it must call a 2-shot SHOOTING FOUL. The 24 games keep every other check. |
| `nav-census` | **Product bug** (9.29.0) | My Player > Milestones (`smiles`) had no `BACK` handler, so no ‹ Back pill: on touch nothing leaves it (Esc and the pad's B did, through `menuHit('back')`). The replay screen next to it has its "Not now" item. | 9.32.1: `BACK.smiles = () => careerHub()`. `nav-census` locally: touch 84 screens, 0 with no way out; passed (686 s). |
| `phone-text-size` | **Product bug** (9.17.7's text fitting), seen by **chance** | The fitter's `fitText` wrapper, once a label had stepped down to Normal, shortened it at the screen's level and returned it untagged: the "…" text was drawn at Larger under a new key for one frame. Frame by frame on the first showing of a won final (667x300, Larger): "Win (Final)" and "Local champi…" both at size 2 for one frame as the 8th reward line came in (845, 880, 926 ms after setup; settled 50 ms later); the audit looks at ~860 ms. The audited post-game was whatever result the earlier screens left the shared career on (a won final with 6 rows in 1 of 4 local runs). Old build with the won final set up: a one-frame overlap at each shortened line; fixed build: none in any frame. | 9.32.2: shorten and draw such a label at Normal in the same frame. The audited post-game is a won final with the most reward lines, on purpose. `phone-text-size` locally: 0 problems at Large and Larger on both phones. |
| `dunk-new-online` | **Chance** | Each forced dunk's type came from the score's parity, `(total >> 1) % 2`. Every passing run (29-38) scored only by dunks (totals 0 and 2: one of each); the failing run had a jumper between them (0 → 2 → 4), so both were between-the-legs. | Turns by a count of dunks kept in `M` (saved, restored and hashed by rollback). |
| `rb-sounds` | **Chance** | The shot clock was set to 3.5 s on frames 240/480/720/960, but it only runs, and ticks, with the ball held live (`match.js:85`, `sfx-moments-hooks.js:8`); run 34's rollback half played 1 match sound in 1,081 frames (no live ball then) and heard 0 ticks. | At the first frame from 240 on (then every 240) with a live ball held; the next frame is kept in `M` so replays agree. |
| `net-version` | **Product bug**, seen by **timing** | Failing run: "an old client stays out (netplay/play), host hands it a player: true", then the current client got "full". `Lobby.join` writes `{role, join}` (in `Net.join`), then `{v}`; the mid-game gate (`net-diag.js`) refused only a guest whose version was known and different. With the old client's version write held back 500 ms: the same output as CI in 1 of 2 local runs; without the hold, 0 of 6. | 9.32.3: mid-game, a guest with no version yet waits. The test's old client always sends its version 500 ms late, so the in-between moment is checked every run: 3 of 3 pass. |
| `rb-lag` | **Timing** (the check compared two moments, not two frames) | The end check compared each phone's latest whole-second sync code at one wall-clock moment. On Bad mobile one phone's confirmed frame lags the other's by seconds: CI's failures were 35 against 30 and, on the retry, 36 against 30 (run 34; run 38#1 alike); locally (a slower machine) the two confirmed frames were 1,500 frames apart in 2 of 4 runs while the run still counted "the same game". | The confirmed hashes from both phones are gathered as they arrive and compared on the latest frame both have confirmed since the mashing stopped, waiting up to 20 s for the phone behind. |
| `rb-lightning`, `rb-horse` | **Chance** (random play had to end the game) | Run 37: `"done":[false,false]` at frames 7,250 and 7,214: no winner in 120 s of mashing. | Already fixed in f71336a (9.30.0): both phones end the game on a set frame. Passed in both attempts of run 38. |
| `rb-brun` | **Product bug** | Run 37: the second game desynced at frame 428 with the difference in `_runCounted`, an end-of-match flag left from the first game. | Already fixed in f71336a (9.30.0: "a rollback match now starts with no end-of-match left from the previous one"). Passed in both attempts of run 38. |
| `sound-list` | **Stale generated file** (fails every run of its commits) | Runs 34-35 (9.29.3): `docs/audio/sound-list.csv is out of date`. | Already fixed: 9c5b818 regenerated it; passed in runs 36-38. |
| `sfx-quiet` | **Wrong expectation** (fails every run of its commit) | Run 31 (9.21.2): the test still expected the default sound picks 9.21.2 changed. | Already fixed in 9.29.2 (8c0a974): the test expects 9.21.2's picks; passed in runs 33-38. |
| (setup) Playwright's apt step | **Runner infrastructure** (transient) | Run 39: `apt-get update` reached only packages.microsoft.com, no Ubuntu archive source, so `fonts-unifont` and the rest "Unable to locate"; run 41's same step on the same image passed 90 minutes later. | The workflow retries the system-package step (apt update and install) up to 3 times. |
| `rb-holdtap` (reported from PR #13, run 44810942524, after the 10-run window) | **Timing** (the same flaw as `rb-lag`) | Both phones 10-6, no desync, 0 bad hashes over 91 compared frames, but `code` "92 HSJM" on the host and "91 TZWQ" on the guest: each phone's own latest confirmed second, read 1.5 s after the end. `tests/rb-same.mjs` compared those. | Compare the checksum on the latest frame both phones hold in `RBN.hashes`. |

### Found on the sharded runs (44, 45 on this branch)

| Test | Cause | Evidence | Fix |
|---|---|---|---|
| `rb-holdtap` (again) | **Timing** | Run 44: `over` false on both phones 1.5 s after the end, 10-9, the same code: the mashed shoot and pass keys also press Continue on the final screen, so a phone had moved on. | Each phone stops its own mashing the moment it sees the match over and keeps the score then. |
| `dunk-new-online` (again) | **Chance** (how many dunks) | Run 45: one dunk in 80 s (`{"betweenlegs":1}`, score 0-6): turns by count need two. | Two dunks set up from frame 300, every 300 frames, on the same frame on both phones (state in `M`), inside the match step: set up from `rbStep` before the step, the dunk's own random picks used each phone's native random numbers and desynced (run 51: 2 desyncs a phone). Locally: staged 2, both types, 0 desyncs. |
| `minis` (HORSE) | **Wrong threshold** | Run 45: `horseDone` false. 100 seeded CPU games of HAQ: median 127 s of game time, 90th percentile 255 s, longest 412 s; 2 over the 400 s cap. | Cap 1,200 s. |
| `lobby-flow` | Not yet known | Run 44: the vs game (halves of 8 s) still in play after 240 s, so the final screen never came; it passed in run 45. | Diagnostics added: where the match is if it never reaches the final screen. |
| `rb-lag` (again) | Not yet known | Run 44: Bad mobile, codes 55 against 44 at the end, no same-frame match within 20 s; passed in run 45. | Diagnostics added: each phone's frame, confirmed frame and hashed range at the end. |
| `lag-profiles` (reported from PR #14's runs) | Not established | PR #14: the snapshot path's Bad mobile median staleness 488 ms against its 480 ms limit (baseline × 1.25 + 60) on the first measurement; the test's built-in second measurement passed. Here, 0 of 15 runs (31-52) needed the second measurement. | None yet: not reproduced here. |
| `online-server` | Not yet known | Run 55 (the first after merging 9.31.0 / 9.32.0, which touch no online code): King of the Court stayed in the lobby on both phones ("guest lobby, host lobby"), 65 s against 35-36 s in all 15 runs before: the host's 20 s wait for `Lobby.canStart()` ran out. Can't be judged locally: this container fails the test 4 of 4 on the pre-merge commit too (an earlier step, the guest's power-up). | Diagnostics added: which of `canStart`'s conditions was false. |
| `rb-lag` (the cause) | **Product bug** in the desync repair, amplified by the link's bandwidth | Diagnostics on CI, failing tries (runs 47, 56): the host played 77-80 frames a second and the guest 50-60, so the frames drifted apart (278 → 815 frames in 20 s), both phones guessed 400-600 late inputs, 7-24 desyncs, 5-15 repairs. Passing tries: 80/80 fps, 0-7 guessed inputs, no desync. Each repair is the host's whole state, ~32 KB, sent again for every checksum that still differed (4 a second) while one was on its way; Bad mobile's link carries 32 KB/s each way, and a match with no desync uses 19 KB/s (run 57: host 18,920, guest 16,580 bytes a second), so the repairs hold the link, the host's frames reach the guest late and the time sync (which assumes equal delays) runs the host fast and the guest slow. Locally (a slower machine) the host sent up to 50 states, 1.6 MB, in one run. | 9.32.4: one state on its way at a time: the next only once the guest's packets say it put the last one in, or after 3 s. |
| `rb-lag` (after 9.32.4) | **Open: a real netcode limit** | Run 58: repairs down to 5 (from 8-15), but the host still put 44-45 KB/s on the 32 KB/s link and 862 inputs came past the 20-frame window and were guessed; both tries ended in different games. rb-lag failed in 3 of the last 11 runs (44, 56, 58) and passed only on retry in 47. A match can't be held on this link yet: a repair is the whole state (~32 KB), a second of this link. | Tracked as a GitHub issue (smaller or incremental repairs, the late-input window). |
