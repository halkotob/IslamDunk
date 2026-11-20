# Plan: a CI run you can trust

The full suite (`npm run test:full`, `.github/workflows/test.yml`) has not been green on `main` since the career
overhaul (9.29.2), and it takes about 50 minutes. Every release since has needed a person to sort real failures from
noise, after a long wait. The goal is a suite where **green means ship, red means a real problem, and the answer comes
in about 15 minutes**.

## What is failing (as of 9.30.0, November 2026)

**Red on every run:**

| Test | File | What it shows |
|---|---|---|
| `fouls-kept` | `tests/no-shove.mjs` | 24 CPU games (6 per difficulty) call no SHOOTING FOUL at all; and-ones, reach-ins, blocking fouls and fouls on purpose all appear. Either the 9.22-9.29 career work stopped shooting fouls being called, or they became too rare for 24 games. |
| `nav-census` | `tests/run.mjs` | On touch, one screen has no way out: `story: milestones` (the story career's milestones screen, 9.29.0). A real bug. |

**Red on some runs, green on others, on the same code** (the "flaky" ones):

| Test | What it shows when it fails |
|---|---|
| `dunk-new-online` | Waits up to 80 s for the CPU to dunk both new dunk types in a rollback game; random play sometimes only produces one. No desync. |
| `rb-lag` | Its harshest profile (Bad mobile: 400 ms round trip, 10% loss) ends with the two phones in different states after repaired desyncs, even on its retry. |
| `phone-text-size` | One career post-game line overflows at the largest text size on a 667x300 screen ("Win (Final) / Local champi..."); it depends on which career result the test happens to produce. |
| `net-version` | Snapshot-path version handling: "rejoin mid-game, a current client" and "a newer snapshot format" report BAD on some runs. |
| `rb-sounds` | The rollback half heard 0 shot-clock ticks: the random play never ran the shot clock down. |

## Gotchas no config file tells you

- **The cloud container can't run the pinned Playwright's browser.** Use a copy of the runner pointed at the installed
  Chromium (keep it out of git; add it to `.git/info/exclude`):
  `sed "s#chromium.launch()#chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })#" tests/run.mjs > tests/run-local.mjs`
- **The container is too slow to judge timing-sensitive online tests.** Two browser pages share a few CPUs, the host
  page falls behind, and `rb-*`, `online-*` and `net-*` tests desync there even on unchanged `main`. Judge those on CI
  (the workflow has `workflow_dispatch`: trigger it on your branch without opening a PR). Everything else can be judged
  locally.
- **Re-run budget:** one CI re-run per failure at most. A failure that passes on the re-run is not "fine": it is a
  flaky test with a cause to find.

## Steps

### 1. Build the evidence table

For every test that failed in any of the last 10 CI runs (the Actions history; the job log lists `FAIL  <name>` lines
with details), record: how many of those runs it failed, on which commits, and the failure detail.

**Done when** every such test has a row, and each row says whether it fails on every run or some.

### 2. Find the root cause of each

For each row, reproduce it (locally where timing doesn't matter, on CI where it does) and name the cause: a product
bug, a test that depends on chance, a test that depends on wall-clock timing, or a test whose threshold is wrong.
`fouls-kept` first: compare shooting-foul rates on 9.21.2 and on `main` (build both, as the test does) to tell a rules
change from rarity.

**Done when** every row has a named cause backed by a reproduction or a measurement, never "flaky".

### 3. Fix each at its cause

- A product bug: fix it in the game (with a version bump and a changelog entry, as every release does).
- Chance: make the situation happen on purpose. Seed it, or set it up (the `rb-kotc` and `rb-brun` tests end their
  game on a chosen frame on both phones; `dunk-new-online` can stage the dunks).
- Timing: wait on a condition, or give the slow case the headroom it really needs and say why in a comment.
- A wrong threshold: change it to what the measurement supports, and record the measurement in the comment.

Every test keeps checking what it checked; a test is fixed by making it reliable, never by skipping, disabling,
loosening it to pass, or quarantining it.

**Done when** each row's fix is pushed and the test passes locally (or on a CI run, for timing-sensitive ones).

### 4. Make it fast

Where the time goes (run 38, 9.30.0): 5,524 s of tests in 2,885 s of wall time, one job, 3 workers. The ten slowest
take about 60% of it: `nav-census` 775 s, `league-calibration` 610 s, `phone-text-size` 542 s, `first-three` 513 s,
`lag-profiles` 302 s, `mobile` 223 s, `rb-lag` 205 s, `ladder` 200 s, `studio` 195 s, `cpu-league` 127 s. The runner
(`tests/run.mjs`) runs the parallel batch first and then the SERIAL tests (`rb-*`, `online-*` and others) one at a time.
Every test keeps running on every PR; the time comes from running them side by side and doing less waste inside them.

- **Shard the suite across parallel jobs.** A matrix in `test.yml` (for example 4 shards), each job running its share
  with `--only`, balanced by the recorded test times (`tests/output/test-times.json`). The serial tests need a job to
  themselves or a shard each (they measure timing and frame rates, and a busy machine desyncs them). Build once and
  share the build between jobs (an artifact, or build in each if that's faster).
- **Look inside the slowest ten.** For each: what it repeats (screens, games, profiles), whether the repeats each
  check something different, and where it waits on wall-clock time a condition could replace. Cut repeats that
  check nothing new; keep every check.
- **The setup steps** (npm ci, installing Chromium, fonts): cache what can be cached.

**Done when** a full CI run takes 20 minutes or less of wall time, every test that ran before still runs, and the
before and after times (whole run and the slowest ten) are recorded in the PR description.

### 5. Prove it

**Done when** three consecutive full CI runs on the branch are green and each takes 20 minutes or less, then the same
on the PR to `main`.

## Kickoff prompt

```
Follow docs/plans/ci-health.md: make the full CI suite reliably green and about 15 minutes long. Work through its
steps in order and don't skip a "Done when". Each product bug is its own release (version bump, CHANGELOG entry).
Push after each fix. When all five steps are done, open a PR to main and tell me the three green run links and the
before and after run times.
```
