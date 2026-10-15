# Defense measurement, v8.6.1

Made with `npm run defense:report` (8 seeded CPU-vs-CPU games, 2v2, 4 x 60 s, seed 5000). Same seeds in
both builds. CPU-only numbers: they decide nothing on their own (see the playtest note in CHANGELOG.md).

## Before: v8.6.0

```
game                         score   FGA   BLK    BLK%   STL   TOV   PF
Al-Noor v As-Salam           39-29    52     9   17.3%     5   n/a    1
At-Taqwa v Al-Huda           28-18    53     8   15.1%     2   n/a    1
Ar-Rahmah v Al-Falah         31-34    52    11   21.2%     3   n/a    4
As-Salam v Al-Ihsan          33-36    53    10   18.9%     4   n/a    5
Al-Huda v Al-Furqan          36-26    48     8   16.7%     3   n/a    3
Al-Falah v Al-Noor           30-44    56    10   17.9%     4   n/a    3
Al-Ihsan v At-Taqwa          38-32    53    12   22.6%     4   n/a    5
Al-Furqan v Ar-Rahmah        41-36    52     8   15.4%     5   n/a    4
TOTAL                                419    76   18.1%    30   n/a   26
PER GAME                            52.4   9.5           3.8   n/a  3.3
```
(v8.6.0 has no turnover stat.)

## After: v8.6.1

Block roll: base and cap lowered on both rolls (jump shots and dunks); every stat-vs-stat slope unchanged.
`BLOCK_TUNE` in `src/sim/v6-contact.js`: jumpBase 0.08 → -0.08, jumpCap 0.58 → 0.30, dunkBase 0.12 → -0.04,
dunkCap 0.55 → 0.30. The floors (0.05 jump, 0.03 dunk) are unchanged.

```
game                         score   FGA   BLK    BLK%   STL   TOV   PF
Al-Noor v As-Salam           41-32    52     3    5.8%     3     3    3
At-Taqwa v Al-Huda           37-30    54     5    9.3%     3     3    4
Ar-Rahmah v Al-Falah         41-40    56     7   12.5%     6     6    2
As-Salam v Al-Ihsan          41-40    62    10   16.1%     0     0    3
Al-Huda v Al-Furqan          37-29    55     3    5.5%     4     4    1
Al-Falah v Al-Noor           36-38    58     3    5.2%     3     3    5
Al-Ihsan v At-Taqwa          33-26    53     5    9.4%     4     4    4
Al-Furqan v Ar-Rahmah        41-37    54     7   13.0%     4     4    5
TOTAL                                444    43    9.7%    27    27   27
PER GAME                            55.5   5.4           3.4   3.4  3.4
```

For reference, a 16-game sweep with the same seeds: 8.6.0 values 17.9% of attempts blocked (9.6 per game);
0.00/0.40/0.04/0.40 14.5%; -0.04/0.35/0.00/0.35 11.3%; the chosen -0.08/0.30/-0.04/0.30 8.8% (4.7 per game).
Before the change, 37% of blocks came from the dunk contest roll (31 of 84 in 8 games), which is why both
rolls were lowered: the jump-shot roll alone could not reach the target without gutting it.

## cpu-parity re-baseline (deliberate)

The seeded cpu-parity games no longer match v8.6.0. Two causes, both intended:
1. CPU players now pick a Noor effect by situation (Quwwah / Sabr / Yaqazah / Noor). With the CPU forced
   back to plain Noor, all 11 seeded games were identical to v8.6.0, so nothing else in Part A moved them.
2. The block change.

New reference outcomes (v8.6.1):
```
2v2 quarters 60s: 33-40 (20175 steps)
2v2 halves 45s: 19-15 (9114 steps)
2v2 first to 21: 23-18 (9041 steps)
1v1 first to 11: 8-12 (4623 steps)
2v2 half court to 11: 14-12 (7561 steps)
2v2 quick 0: 20-15 (9929 steps)
2v2 quick 1: 13-22 (9942 steps)
2v2 quick 2: 20-22 (10950 steps)
2v2 quick 3: 19-23 (11124 steps)
2v2 quick 4: 25-16 (10343 steps)
2v2 quick 5: 17-23 (11049 steps)
```

To compare a later build against this one: `node tests/run.mjs --only cpu-parity --ref <8.6.1 dist/web/index.html>`.
