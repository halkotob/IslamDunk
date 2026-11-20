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
| `nav-census` | **Product bug** (9.29.0) | My Player > Milestones (`smiles`) had no `BACK` handler, so no ‹ Back pill: on touch nothing leaves it (Esc and the pad's B did, through `menuHit('back')`). The replay screen next to it has its "Not now" item. | 9.30.1: `BACK.smiles = () => careerHub()`. `nav-census` locally: touch 84 screens, 0 with no way out; passed (686 s). |
| `phone-text-size` | **Product bug** (9.17.7's text fitting), seen by **chance** | The fitter's `fitText` wrapper, once a label had stepped down to Normal, shortened it at the screen's level and returned it untagged: the "…" text was drawn at Larger under a new key for one frame. Frame by frame on the first showing of a won final (667x300, Larger): "Win (Final)" and "Local champi…" both at size 2 for one frame as the 8th reward line came in (845, 880, 926 ms after setup; settled 50 ms later); the audit looks at ~860 ms. The audited post-game was whatever result the earlier screens left the shared career on (a won final with 6 rows in 1 of 4 local runs). Old build with the won final set up: a one-frame overlap at each shortened line; fixed build: none in any frame. | 9.30.2: shorten and draw such a label at Normal in the same frame. The audited post-game is a won final with the most reward lines, on purpose. `phone-text-size` locally: 0 problems at Large and Larger on both phones. |
| `dunk-new-online` | **Chance** | Each forced dunk's type came from the score's parity, `(total >> 1) % 2`. Every passing run (29-38) scored only by dunks (totals 0 and 2: one of each); the failing run had a jumper between them (0 → 2 → 4), so both were between-the-legs. | Turns by a count of dunks kept in `M` (saved, restored and hashed by rollback). |
| `rb-sounds` | **Chance** | The shot clock was set to 3.5 s on frames 240/480/720/960, but it only runs, and ticks, with the ball held live (`match.js:85`, `sfx-moments-hooks.js:8`); run 34's rollback half played 1 match sound in 1,081 frames (no live ball then) and heard 0 ticks. | At the first frame from 240 on (then every 240) with a live ball held; the next frame is kept in `M` so replays agree. |
