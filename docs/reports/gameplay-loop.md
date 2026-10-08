# Gameplay loop report (Phase 1)

How a possession actually plays out today, measured on v8.0. This is the baseline Phase 2 (competitive core) works against.

## How it was measured

- **Possession log** (`src/sim/poss-log.js`). Every full game is logged one possession at a time:
  - who had the ball and how the possession started (inbound, defensive rebound, turnover);
  - how long it lasted;
  - every shot (distance, points, dunk or not, nearest defender, made or missed);
  - how it ended (score, miss, turnover).
- **Your own games.** The last 30 real games played in a browser are kept. Open the game with `?dev=1`. The DEV tab then has **Download log** and **Summary** buttons.
- **Simulated games.** `node tests/perf/loop-report.mjs` plays these at every difficulty:
  - CPU vs CPU;
  - three scripted "human" styles, each with a CPU teammate against a CPU team:
    - **idle**: never touches the controls;
    - **rusher**: sprints at the rim and dunks, chases the ball on defense;
    - **shooter**: catches and shoots from wherever he gets the ball.
  - Each row is 3 to 4 two-minute-quarter games, roughly 250 to 350 possessions per side.

## Results

The "you" rows are the scripted style; the "cpu" rows are the CPU team in the same games.

| Row | Points per possession | Possessions that score | Turnovers | Lost straight off the inbound | FG (no FTs) | Seconds per possession |
|---|---|---|---|---|---|---|
| CPU vs CPU, very easy | 1.61 | 77% | 14% | 4% | 82% | 5.6 |
| CPU vs CPU, easy | 1.57 | 73% | 18% | 2% | 80% | 5.9 |
| CPU vs CPU, medium | 1.32 | 61% | 27% | 7% | 74% | 5.5 |
| CPU vs CPU, hard | 1.48 | 66% | 26% | 9% | 81% | 5.2 |
| Rusher (you), medium | 1.29 | 61% | 36% | 11% | 88% | 4.3 |
| CPU vs rusher, medium | 1.28 | 65% | 27% | 9% | 89% | 4.7 |
| Rusher (you), hard | 1.27 | 60% | 34% | 7% | 85% | 4.5 |
| CPU vs rusher, hard | 1.19 | 59% | 36% | 13% | 90% | 4.8 |
| Shooter (you), medium | 1.40 | 61% | 17% | 8% | 56% | 5.2 |
| CPU vs shooter, medium | 1.42 | 71% | 24% | 8% | 91% | 4.9 |
| Idle (you), medium | 0.29 | 13% | 87% | 20% | 100% | 17.1 |

Shot mix (share of shots / FG):

| Who | Dunks | Threes | Mid-range | Close |
|---|---|---|---|---|
| CPU, any difficulty | 55 to 90% / **100%** | 5 to 30% / 20 to 50% | 2 to 6% / about 50% | 1 to 5% / about 50% |
| Rusher (you) | 91 to 98% / **89 to 98%** | almost none | almost none | 2 to 3% |
| Shooter (you) | 36 to 44% / 99% | 44 to 55% / 23 to 31% | 1 to 8% | 2 to 5% |

## What this says

1. **Scores really are close to automatic, and it's the dunk.**
   - CPU dunks went in 100% of the time in every sample, whether the defender was 6 or 80 units away.
   - Most CPU possessions are a dunk, so 60 to 77% of all CPU possessions end in points.
   - "Contested" barely exists at the rim: in the shot mix, the open/contested split only matters for jump shots.
2. **The simplest human strategy is also the best one.** A bot that only sprints at the rim and dunks:
   - shoots about 90%;
   - scores on 60 to 76% of possessions, on every difficulty including Hard;
   - scores about as well as a bot that plays for jump shots: better on Very easy and Easy (1.55 against 1.46 points per possession), slightly worse on Medium and Hard (1.29 against 1.40).
   - With no skill and no reading of the defense, it is as good as anything else, so there is little reason to pass, run a play or take a three.
3. **Difficulty doesn't change the shape of the game.**
   - CPU vs CPU scoring is about the same from Very easy to Hard (1.3 to 1.6 points per possession).
   - Difficulty moves timing and reactions, but not the thing that decides possessions (the rim).
4. **Inbound steals are real.**
   - 2 to 13% of all possessions are lost within 2 seconds of an inbound, mostly "PICKED OFF!" right after a basket.
   - This is the "opposition can intercept the inbound" problem.
5. **Possessions are very short and there are few misses.**
   - Possessions last 4 to 6 seconds.
   - Only 5 to 18% end on a miss, so rebounding, second chances, boxing out and a defensive stop almost never come up.
6. **Turnovers are high (20 to 35%)**, mostly steals in traffic. With the inbound steals, this is most of the defense the game has.
7. **Your CPU teammate doesn't carry you.** With the human idle, the team scores 0.3 to 0.6 points per possession. Your input matters, which is good.

## Recommendations for Phase 2 (competitive core)

- **Make the rim contestable.** Dunk success should depend on:
  - the nearest defender and whether he is set or jumping;
  - the dunker's rating;
  - the move type.

  A contested dunk can be blocked, stripped or turned into a charge (this ties into the post-up/charge rework). Target: CPU possessions ending in a score of about 45 to 50%, and dunk FG of 75 to 85% overall, with contested dunks far lower.
- **Defense button.** Something that actually stops the sprint-dunk: a set stance that wins charges, plus a contest jump. Re-run the rusher bot after: it should drop below the shooter bot.
- **Resets with a check.**
  - No defender may be inside a protected zone around the inbound pass. Target: inbound losses under 1%.
  - Half-court games need a check before the ball is live.
  - Full-court games need a clear backcourt to bring the ball up.
- **Difficulty should change outcomes.** CPU vs you should range from about 1.0 points per possession on Very easy to about 1.4 on Hard.
- **Re-measure with the same script** (`node tests/perf/loop-report.mjs`) after each Phase 2 change. Also ask testers to send their play log from the DEV tab, so the "human" rows come from real people.
