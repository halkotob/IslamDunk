# Changelog

## 8.7.0: gamepad support
Play and navigate with a controller (Gamepad API, standard mapping; other pads are read the same way, best
effort). The pad presses the same keys a keyboard player would, so every screen, the sim, online play and replays
see exactly what the keyboard produces; the left stick is analog, like the touch stick.

| Pad | In a game | In menus |
|---|---|---|
| Left stick, D-pad | Move (the stick is analog: tilt = speed) | Move the selection (repeats when held) |
| A (south) | Shoot | Confirm |
| X (west) | Pass | (as J) |
| Y (north) | Move / Defend | (as H) |
| B (east), RT, RB | Turbo: hold to sprint | B: back |
| LB | Talk, use, enter the musalla (E) | Next tab where Q/E switch tabs |
| Start / Menu | Pause | Back |
| View / Select | On-screen picker | On-screen picker |

- **Players.** The first pad is P1 and the second P2, in the order they connect, when a match has two local
  players; otherwise every pad (and the keyboard) controls P1, including the online guest. Pads can be plugged
  in and out at any time.
- **Never trapped.** The View button opens an on-screen picker on any screen: a gold ring moves between the
  buttons you could tap (stick or D-pad), A taps, B closes it. It opens by itself on the text-entry screens
  (your name, a team name, a join code), so you can pick letters with the pad; B there leaves without typing.
  The keyboard path is unchanged.
- **Prompts.** After pad input, the tutorial steps, How to play (a pad column) and hints read as pad buttons
  (A, B, X, Y, LB, Start, View); after keyboard input they read as keys again.
- **Rumble** where the pad supports it (vibrationActuator): dunks, blocks, threes and posters, and the buzzer.
  Settings → Sound & display → Controller vibration (On by default).
- Keyboard and touch behave exactly as before. Casual controls, Stride dribble and the other control settings
  work the same with a pad.
- **Tests.** New `gamepad` test with a scripted `navigator.getGamepads()`: title -> Quick Play -> a game ->
  pause -> quit, stick (walk), B (sprint), A (shoot), X (pass), two pads for two players, hot-plug mid-match,
  trivia and a Noor card, the picker on the join-code screen, rumble on and off, the keyboard alongside. The
  desktop (Electron) test now checks Chromium's Gamepad API is there and a pad moves the player.

## 8.6.7: inbound pass, turbo bar, Sh. Saleem, guest Noor
- **Inbound passes no longer go back to the inbounder.** The inbound pass used to fire while the receiver was still
  running to his spot (250-330 speed in every failure), so it led him, he braked, the ball went loose and the
  inbounder was handed it back. Now the pass waits until the receiver is within 14 units of his spot and under
  60 speed, or at the 2.2 s limit goes to where he stands with no lead; the receiver stops on his spot and waits.
  If a pass still goes loose, the inbounder and the defence can't take it; the receiver goes for it, and after 1 s
  it's given to him. The instant-inbound fallbacks are unchanged (the 3.2 s one no longer cuts in while the pass
  is in the air or loose).
  Same seeded run (60 games: CPU vs CPU, and a human on each side): the inbounder got the ball back after 21 of
  706 passes (3.0%) before, 0 of 702 after.
- **Turbo bar doesn't flicker.** The sprint look came from the drawing code (turbo held and speed over 60) while
  the drain runs at speed over 40, so every turn or bump flipped it. The sim now sets a sprint flag where the drain
  happens (same condition), the HUD holds it 0.25 s and fades the bright colour and glow in and out over about
  120 ms (card and phone strip). The card's see-through fade eases over about 150 ms, needs a wider margin to
  leave the faded state than to enter it, and a change has to last 0.2 s. Drain, refill and the winded rule are
  unchanged. 14 s of scripted sprinting with direction changes every 0.35 s: colour flips 2.29 a second before,
  0.21 after; card fade flips 0.21 before, 0.07 after.
- **Sh. Saleem talks less.** Two free lines a visit (plus the situation conversation when there is one), then
  "Sh. Saleem has nothing more for now." No more tap-anywhere-for-another-line: an Another button (only while he
  has more) and a Leave button on the talk panel, and a Leave office button in the office, all by touch; Esc still
  works. A conversation's reply now closes the panel instead of starting a random line. The count resets each
  visit.
- **The guest earns Noor online.** Only a team's hafiz could earn Noor, and in online co-op the guest always plays
  slot 1, where only 4 of the 8 teams have their hafiz (confirmed: on NOOR the guest's meter stayed at 0). Online,
  every human player (host and guest) can now earn Noor; solo and local play keep the hafiz rule. The guest sees
  the meter, the question, the three cards and the effect (the host decides, as before).
- **Tests.** New `v867` (inbounds, flicker, Sh. Saleem, who can earn Noor). `online-loop` plays co-op twice: on
  NOOR (the guest isn't the hafiz) and on TAQWA (he is); both times the guest's meter fills, he gets the question
  and the 3 cards, and the host and guest show the same effect.
  Inbound passes now wait for the receiver, so seeded games change: `cpu-parity` has a new baseline.

## 8.6.6: Float is the default tomahawk
- The tomahawk now uses the Float style unless you pick another in Settings → Game → Tomahawk style (Classic,
  Smooth and Power are still there). A style already saved on this device is kept.
- Styles are now strictly cosmetic. Where the ball sits during a tomahawk counts for blocks and swipes, and
  Float holds it somewhere else, so making Float the default would have changed seeded games. The sim now keeps
  the ball in the hand of the Classic pose (a second, invisible rig runs alongside), and only the drawing and
  replays put it in the hand you see. Seeded games are identical in every style and identical to 8.6.5.
- `tomahawk` test: the default is Float, and the same seeded game (with tomahawks in it) gives the same score
  and box score in all four styles.

## 8.6.5: tomahawk animation styles, and the default game is 2 halves of 2:00
(The 2-halves change was briefed as 8.6.6; 8.6.5 hadn't landed, so both are in this release.)

- **Default format: 2 halves of 2:00** (was 4 quarters of 2:00). The shot clock is unchanged: it comes from the
  period length (24 s for 2:00). Quick Play, the Settings Format item ("2 Halves") and a new online lobby all
  start from it; the scoreboard says "1ST HALF" / "2ND HALF", the halftime screen comes after the first half,
  the box score shows H1 / H2, and overtime is unchanged (60 s). 4 quarters and every period length are still
  in Settings and the lobby.
  - **Career and practice keep 4 quarters.** Career games and practice (gym drills, mini games) had no format
    of their own and followed the Settings format, so they would have become 2 halves. They now use 4
    quarters, with the period length still from Settings.
  - Barakah Run, the Daily Scenario, attract mode, the tutorial and every test or mode that passes its own
    format are unchanged.
- **Tomahawk style** (Settings → Game): Classic (default), Smooth, Power or Float, saved on this device.
  Cosmetic only: the dunk's path, timing, slam moment, hitboxes, scoring, effects and online data don't change.
  - Why the classic one looks rough: its pose targets switch all at once at u = 0.12, 0.56 and 0.8 (u = dunk
    progress, the slam is at 0.8), and the spring stiffness jumps from 1500 to 2600 at 0.56. Over a seeded
    dunk the biggest one-frame jump in a joint target is 2.75 rad, and joints reach 95 rad/s. (The two layers
    don't actually fight between 0.78 and 0.8: the later one sets every joint there, so the step is at 0.8.)
  - Smooth: the same poses, each change eased over about 0.08 of the dunk, damping near critical. Biggest
    target jump 0.95 rad, top joint speed 46 rad/s.
  - Power: a longer, deeper cock at the top, a fast whip and hard arm snap into the slam, a hang on the rim,
    then a slow release (0.88 rad, 46 rad/s).
  - Float: a slow sweep back, a softer slam, a long follow-through with the legs trailing (0.31 rad, 37 rad/s).
  - All three are keyframes eased with smoothstep (stiffness and damping too), always a full pose, and stay
    inside joint ranges used elsewhere. Replays and highlight clips record the drawn pose, so they match.
- **Dunk lab** (Options → Extras): the player at the free-throw line facing the hoop. SHOOT (K) runs a
  tomahawk and puts him back, PASS (J) switches the style in place, MOVE (H) toggles 0.3x slow motion. Nothing
  is earned there (no achievements, the game never ends).
- **`npm run review:tomahawk`** renders a 24-frame strip of each style, take-off to landing, camera locked
  and cropped on the dunker, to `docs/review/img/tomahawk-<style>.png`.
- **Tests.** New `formats` (default game: "1ST HALF", one halftime, ends, shot clock runs, overtime; career
  and practice 4 quarters; explicit and picked formats unchanged) and `tomahawk` (Classic identical to a
  recording made from 8.6.4 at 20 points, `tests/fixtures/tomahawk-classic.json`; each style finite, same
  length and slam frame, back to the normal pose; replays; the Dunk lab). `online-loop` checks a default hosted
  game is 2 halves on host and guest. The phone audit visits the Dunk lab. No existing test relied on the old
  default format; `cpu-parity` is identical to 8.6.4.

## 8.6.4: a picked-up dribble means standing still
- After a pump fake ("PICKED UP") the player can't move at all. In 8.6.3 he could still walk around inside
  the pivot ring. Now he stays planted on the spot where he picked it up; the stick only turns him to face
  that way. He can still shoot, pass, jump or go up for a layup or dunk from there, and the pick-up still
  ends when the ball leaves his hands. The dashed marker under him is smaller (24 instead of 34) so it no
  longer looks like room to move. How to play now says "tap: pump fake, then shoot or pass".
- `controls` test: walking after a pump fake moves him 0 units (was: held within the ring), and pushing the
  stick turns him.

## 8.6.3: hot spots, late-game CPU, no double dribble, glass pass
- **Hot spots.** A spot now appears only while a team holds the ball live (never on a dead ball, an
  inbound or a free throw; it waits), on that team's attacking half, inside the half-court line and at
  least 60 units off the sidelines. It still survives a change of possession, and its value follows the
  shooter: +1 on his attacking half, **+2** from his own back half. A +2 spot is labelled with dark "+2"
  text on a solid gold tag (larger than the "+1"), and the callout says "+2 BONUS". Dunks still get no
  bonus. Mini-game, Around the World and challenge spots are unchanged (+1). Online guests get the value.

  Measured over 8 seeded CPU games (90 s quarters), counting where each spot appeared:

  | | Spawned, team holding the ball, its attacking half | Spawned in that team's backcourt | Spawned on a dead ball | Possession changes during a spot | Live time the spot sat in the ball-holder's backcourt |
  |---|---|---|---|---|---|
  | 8.6.2 | 164 | 0 | 24 (1 for a random team) | 316 | 48% |
  | 8.6.3 | 189 | 0 | 0 | 358 | 44% (now worth +2 there) |

  So the far-backcourt spots came almost entirely from spots outliving the possession they were made for,
  not from the random-team case (1 spawn in 188).
- **The CPU knows about hot spots.** A CPU shooter on a live spot, not tightly guarded, counts the bonus in
  that shot's expected points; within 1.5x the radius he may step onto it. A better look (open dunk, open
  three, a pass) still wins. A free CPU teammate may drift to a front-half spot when it's worth at least
  as much as his normal spacing spot, never next to the ball and never camping (1.5 s, then on). A CPU
  defender closes out harder on a man standing on a live spot. The CPU uses a spot on at most every other
  possession (never two in a row, 70% otherwise). With no spot live, shot selection is unchanged and no
  extra random numbers are drawn. Seeded test: on a spot, 53 of 60 CPU handlers shoot, against 28 of 60
  with the spot logic off; the defender ends 28 units from a man on a spot, against 86.
- **Late-game CPU** (CPU-only teams, the last period or the last 30 s of any period; nowhere else).
  Trailing or tied in the last 24 s: no set play after a timeout, push the pace, less dribbling around, and
  a three when trailing by 3+ with under 20 s. In the last 2.4 s it takes the best shot now, and in the last
  1.2 s whoever has the ball shoots. The last 30 s of an earlier period: push the pace for the 2-for-1.
  Leading in the last 48 s: use the shot clock, no lobs, no risky passes, keep the ball if the game clock
  will run out first. Intentional fouls and CPU timeouts are unchanged.
  - Not done, on measurement: holding for a last shot at 4-6 s when tied, and lowering the bar for a shot
    late. Both lost games against the 8.6.2 CPU (tied with the ball and 12 s left: 74% wins, 57% holding;
    trailing by 1 with 8 s left: 50% wins, 30% with the lower bar). The 8.6.2 CPU already shoots within
    about 2 s of getting the ball, so the 2-for-1 happened anyway (first shot at 31.4 s from a 34 s start,
    31.6 s before).
  - Head to head against the 8.6.2 CPU, 1,400 seeded games starting -3 to +3 with 8 to 45 s left in the last
    period: 62% wins before, 66% after (trailing or tied: 40% to 46%; leading: 91% to 92.5%).
  - Trailing by 2 with 10 s left, 50 seeded games: a shot went up before the buzzer 50 of 50 times before
    and after; the trailing team scored in 41 before, 48 after. Leading by 4 with 40 s left now uses 9.2 s
    of the 15 s shot clock (2.0 before).
  - Whole games, outside the late window (40 seeded games): 7.21 to 7.23 points per team-minute, FG 69.5% to
    70.2%, turnovers 0.26 to 0.32 per team-minute. The turnover change is seed divergence, not the new
    logic: the same build with the new CPU logic switched off also gives 0.32. Over 8 games: 7.14 to 7.03
    points, FG 68.9% to 68.2%, turnovers 0.19 to 0.42.
  - Seeded outcomes change, so `cpu-parity` has a new baseline (see the test log of this release).
- **No double dribbles** (the NBA Jam way). The DOUBLE DRIBBLE call, whistle, turnover and dead ball are
  gone, and so is its TOV charge. After a pump fake ("PICKED UP") a crossover, signature move or hesitation
  is ignored, silently. The player can still turn, pivot inside the dashed ring, jump, shoot, pass or go up
  for a layup or dunk; walking off the ring holds him at its edge (as the CPU already was). The pick-up ends
  when he shoots, passes or loses the ball. CPU pick-ups are unchanged. Online, the guest gets the pivot.
  How to play now says "tap: pump fake, then pivot, shoot or pass"; Sheikh Saleem's pump-fake tip no longer
  says "take one dribble"; each tutorial step starts with a live dribble.
- **Off-the-glass pass** only to a teammate trailing the play: farther from the hoop than the passer by more
  than 25 units. A teammate ahead of the passer gets the normal alley-oop or pass, even with Turbo held (no
  "OFF THE GLASS"). The CPU's 10% chance follows the same rule. The self-lob is unchanged.
- **Tests.** New `v863` test (spot placement and dead-ball wait, +1/+2 and dunks, CPU spot use and
  closeouts, no change with no spot, late game, glass rule). `controls` now checks that after a pump fake a
  crossover is ignored with no turnover, walking is held to the ring, and shooting and passing work.
  `noor` checks a picked-up crossover costs no turnover. `online-loop` checks the guest sees a +2 spot and
  the pivot. `phase4` gives its unseeded 3-on-3 game 300 s of steps instead of 200 (8.6.2 already ran past
  200 s in about 1 game in 12; late-game fouls and free throws add dead time). `docs/review/game-text.csv`
  regenerated.

## 8.6.2: phone pass
On a phone the 960x540 canvas is drawn at 0.55-0.63x, so most labels landed at 6-9 CSS px and the HUD
and buttons covered the court. Everything below applies on touch devices only; desktop is unchanged
except where noted.

- **Minimum text size: 11 CSS px.** Text that would land below 11 CSS px on screen is drawn at 11 px
  (about 17 game px on an iPhone 13 in landscape, 20 on a 667x300 phone). It is applied per draw and per
  measure, so truncation and wrapping use the real width; the canvas is not scaled. Screens laid out
  for the bigger text: hub, bracket, stats and box scores (phones drop SPG, BPG and 3P% from the career
  table), goals and badges, season summary, scouting report, pre-game (partner box), journal, musalla,
  adhan, masjid, train, gym, new season, player creator (phones show the build summary instead of the
  nine pip rows), profile, team select, Noor choice, halftime box score (PTS REB AST STL BLK FG TOV),
  online lobby, achievements, settings, mini games.
- **In-match HUD.** The player card (name, TURBO, NOOR, POISE) is gone on touch. A compact turbo bar
  sits under the scoreboard, in the crowd. Chips appear next to it only while they apply, each an icon
  plus text: ON FIRE, the active Noor power-up, NOOR READY, WINDED, PRESSURE. The full card stays on
  desktop.
- **Touch buttons.** Main word only; the second line ("2x: SIGNATURE", "hold: SCREEN") shows during
  the first game after install, then never again. A button with no action is hidden instead of
  showing "–". New in Settings > Controls & camera (touch devices only): Button size (Small, Medium,
  Large), Button opacity (Solid, 80%, 60%) and Left-handed layout (mirrors the stick and the buttons),
  all saved. Buttons fade to 30% after 2 s without a touch and come back on the next touch.
- **How to play** on touch is a labelled diagram of the stick and buttons plus a Play the Tutorial
  button. The keyboard text stays on desktop.
- **Venue select.** Locked tiles show a lock and a short tag (State stage, National stage, World
  stage, Win World Cup; "World Cup" where the tile is too narrow). The focused tile's full name and lock
  reason show under the grid.
- **Shorter lines on touch.** Keyboard hints are removed where every item can be tapped, or reworded
  for a tap ("Tap to close", "Tap the letters, then Join", "Tap a scene twice to watch it again",
  "Camera" for "Camera (C in game)"). Shortened:
  - Hub: "Spend on training", "Spend on projects" (were the full sentences); trophy names Nat. for National.
  - Bracket: "Top two in each group reach the semis".
  - Goals: badge text without the parenthesis and "in career games"; "+40 BP each, +100 for all";
    "N game(s) left this week".
  - Pre-game: "No salah bonus. Answer the adhan to earn one."; CPU difficulty without the stage note;
    the players' height and build line is dropped.
  - Musalla header "Walk up to someone"; adhan "Praying gives a bonus next game." (the key hint line is gone).
  - Masjid: "N at Jumu'ah, N families".
  - Train: "You have N BP. Each level costs more."; the stat explanation line is dropped on phones.
  - Gym: "Musalla", "Sheikh's office" (no key letters); "N HB".
  - New season: "Stats, upgrades, banners and chemistry carry over." and "Next: the Metro Masjid
    League, CPU one level up."
  - Profile card: games, wins, mini-game wins and crowns on separate lines.
  - Achievement toast "UNLOCKED"; achievements page 10 per page with "tap for more".
  - Lobby: "Your friend joins with this code"; the game picker is one row with arrows.
  - About: "Masjid league basketball, made with care."
- **Fixes (all devices).** The `select` screen no longer throws "Cannot read properties of null
  (reading 'mode')" when it is reached without a setup (no menu path does this; it now goes back to the
  title). Online lobby: the settings rows no longer overlap the ten game chips on desktop. Train: the
  stat explanation line no longer sits on the Back button. Barakah Run: the team crest no longer
  overlaps Begin run. Canvas-drawn touch buttons only appear if the HTML controls never loaded (they
  showed as ghost buttons behind overlays).
- **Tests.** The `mobile` test now runs a phone text audit (`tests/phone-audit.mjs`, also runnable on
  its own) on iPhone 13 landscape and 667x300: 47 screens, with a career save loaded and a match
  started. It fails on any text past the canvas edge, any text under 11 CSS px, any touch button over
  the scoreboard (every size, both hands) and any page error, naming the screen and the text. HUD
  screenshots: `docs/review/img/phone-hud-iphone.png`, `docs/review/img/phone-hud-667x300.png`.
  The `phase6` settings check now counts the three touch-button settings only on touch devices (where
  Controls & camera has 8 rows; the audit checks that screen fits).

## 8.6.1: Noor power-ups and defense measurement
- **Noor power-ups.** A correct Noor answer now opens a choice of three effects, each named for a
  virtue. Nothing is left to chance: the three shown are always the three you used least recently,
  and each card says exactly what it does. A wrong answer or a timeout still gives nothing.
  - **Noor** (Light): the original glow, unchanged (12 s, +15% shot, +20 dunk range).
  - **Sabr** (Patience): the next 3 shots get a 25% wider green window. Ends after 3 shots or 30 s.
  - **Himmah** (Determination): 15 s of further reach for loose balls and rebounds.
  - **Quwwah** (Strength): turbo refills now, then refills twice as fast for 10 s.
  - **Yaqazah** (Alertness): the next steal attempt within reach succeeds cleanly, with no foul. 20 s.
  - **Ukhuwwah** (Brotherhood): your teammate gets the Noor glow for 12 s. Offered only when you have
    a teammate without an active effect.
  - One effect per player at a time; the Noor meter waits while one is active. Short games keep the
    once-per-game limit.
  - The active effect shows next to the player (icon + name + seconds or shots left) and on the
    player card.
  - CPU players pick by situation: Quwwah when low on turbo, Sabr as a shooter in the half court,
    Yaqazah when the ball handler is close, otherwise Noor.
  - Online: the host decides. The guest's pick travels with its trivia answer, effects ride in the
    snapshot, and replays draw the right effect (packed into the player flag bits).
  - Barakah Run powers are unchanged. With 'green', Sabr's total green window is capped at +40%;
    Quwwah doubles whatever 'recharge' gives; Noor and 'fire' run side by side; 'shield' is untouched.
  - Help text and the two Noor achievements now say "power-up".
  - **Review:** `docs/review/game-text.csv` has a new **Review flag** column and a "Noor power-ups"
    section at the top. The 37 flagged rows are the six names, meanings and descriptions, the HUD
    text and the choice screen: please check the Islamic wording.
- **Turnovers.** New TOV stat: a steal against you (from your hands or your pass picked off), a
  shot-clock violation, a double dribble (the game has no separate travelling call) and an
  out-of-bounds the offense caused. Shown in the in-game box score, the career box scores and the
  career totals table (per game).
- **Blocks: about half as many.** In seeded CPU games 18.1% of shots were blocked (9.5 a game).
  The base and cap of both block rolls (jump shots and dunks) are lower now; every stat-vs-stat slope
  is unchanged. Now 9.7% (5.4 a game). Steals and fouls are untouched.

  | 8 seeded CPU games | FGA/game | Blocks/game | Blocked % | Steals/game | TOV/game | Fouls/game |
  |---|---|---|---|---|---|---|
  | 8.6.0 | 52.4 | 9.5 | 18.1% | 3.8 | – | 3.3 |
  | 8.6.1 | 55.5 | 5.4 | 9.7% | 3.4 | 3.4 | 3.4 |

  These are CPU-vs-CPU numbers only, so they're a starting point for the hand playtest, not a final
  tune. Full tables in `docs/reports/defense-8.6.1.md`.
- **cpu-parity re-baselined on purpose.** Seeded CPU games no longer match 8.6.0, because of the
  situational CPU Noor picks and the block change (with CPU picks forced back to plain Noor, all 11
  seeded games matched 8.6.0 exactly before the block change). New reference outcomes are in
  `docs/reports/defense-8.6.1.md`.
- **Tools:** `npm run defense:report` (`scripts/defense-report.mjs`): N seeded CPU games with FGA,
  blocks, block %, steals, turnovers and fouls, per game and in total; `--page` compares any build.
- **Tests:** new `noor` test (the choice, all six effects applying and expiring, a wrong answer,
  replays, Barakah Run stacking, every turnover cause, the TOV column). `online-loop` now makes a Noor
  pick on the host and on the guest. `mobile` checks the choice screen fits and that a tap picks.
  The `defense` test's guard check now averages 5 seeded games instead of one: the block change
  rerouted its single seeded game (86% → 64% between the handler and the rim), while over 10 seeds the
  average was unchanged (88% before, 87% after).

## 8.6.0: transition, flair, and new mini games
- **Fast breaks.** After a steal or a rebound, the CPU teammate leaks out and runs a lane, and the
  handler can hit him ahead. Passes ahead are quicker ("HIT AHEAD"), and a bucket off one is a
  FAST BREAK. Both teams play this way.
- **Skill moves look like moves.** Crossovers dip and reach across, behind-the-backs swing, spins
  tuck, hesitations rise and burst, with a trail on the ball.
- **Ankles broken.** Once in a while (rare), a defender who bites on a good move goes down. Slow
  motion, a callout, the crowd. Better handles do it more.
- **New stat: Dribbling (1-10).** Faster, sharper moves, more broken ankles, and a safer handle
  against steals. Built-in players get it from their speed, steals and passing. In career it's a new
  stat to train, and the sandbox creator has it too.
- **Tomahawk, LeBron-style.** Cocked back behind the head, knee up, then thrown down. Fast breaks
  favour it.
- **Alley-oops off the glass.** Hold Turbo while you throw a lob to a cutting teammate and it goes
  off the backboard. On an open run at the rim, Turbo + MOVE lobs it off the glass to yourself. The
  CPU does both now and then.
- **Blocked and missed dunks fly.** A blocked shot gets sent away (sometimes to the sideline) and a
  missed dunk caroms long. No more easy put-backs right under the rim.
- **Swats and celebrations.** Blocks get a full arm swing and a finger wag after. Clutch buckets get
  a celebration.
- **Taunts.** After a block, a big dunk or a clutch bucket you have 3 seconds: tap MOVE (H) to
  taunt. Point to the sky, du'a, flex, finger wag, sujood of thanks (after a basket only), chest
  pound, brush it off, takbir, too small and raise the roof. Unlock them by levelling up and choose
  yours in Options → Profile.
- **Defense:** a defender holding DEFEND who gets beaten gets a short recovery burst.
- **King of the Court:**
  - Fixed: the CPU no longer gets stuck in the corners (it was trying to clear the ball to a spot
    that was still inside the arc).
  - The winner starts the next game with the ball.
- **7 Up** (Mini games, and online): pick any spot and shoot. Inside the arc is 1, a three is 2.
  Keep shooting until you miss. First to exactly 7 wins: go over and you bust back to 4.
- **Custom game room** (Mini games → Custom game, and online). Build your own shooting game:
  - scoring (makes, inside 1 / three 2, makes in a row, spots cleared)
  - where you shoot from (pick your spot, fixed spots, random spots)
  - how long a turn lasts (until you miss, 1, 3 or 5 shots, 20 or 30 seconds)
  - the target, an exact finish, time per shot, best of 3 or 5, players, and a no-layups circle
  - Name it, save it and share it with a code. Presets: 7 Up, 21, Hot Hand, Beat the Clock, Spot Up.

## 8.5.0: Phase 6: your teams, shorter menus, and the review tools
- **Teams & Players** (new on the title screen): make your own.
  - **Players** are a sandbox: any look (the same options as the career creator), player or sheikh,
    and all nine skills from 1 to 10, plus a play style.
  - **Teams:** name, short name, two colors, a crest, a home court (picked first on the venue
    screen), and two players from your players, your career player, the masjid brothers, or anyone
    on the built-in teams.
  - **Where they play:** Quick Play and online. Your friend sees your team exactly as you made it.
  - **Your career player** is in Quick Play and online too, as "Al-Amanah (your career)", with exactly
    the stats you've earned. Nothing made in the sandbox ever changes him.
  - **Career league:** up to six of your teams can replace league opponents in your career (Join
    career). They only ever play against you, never on your side.
  - **Share codes:** copy a code for any team or player and send it to a friend, who imports it by
    pasting. Names pass through a word filter.
- **Shorter menus.** Every list is now six entries or fewer, grouped by what you want to do:
  - Title: Career, Quick Play, Online, Teams & Players, Options. Quick Play groups Play a game
    (1 player, co-op, 3 on 3), Barakah Run, Mini games, Daily challenges and the Tutorial. Options
    groups Fun modes, Achievements and Personal bests under Extras.
  - Settings opens three short groups: Game, Controls & camera, Sound & display.
  - Career hub, My Player: Upgrade stats, Goals & badges, Customize, Records (stats, season
    summaries, journal).
  - Gym drills: the pickup games (Lightning, HORSE, Around the World, King of the Court) are one group.
- **Review tools** for the human review pass:
  - In the game: open with `?review=1` for a Review entry. Play any scene and mark each line Keep,
    Change or Cut, with notes. There's also a 15-question feel checklist. Export everything as a CSV.
  - In a spreadsheet: `npm run review:export` rebuilds `docs/review/game-text.csv` from the game,
    with every line that's new since the first packet marked. Earlier marks are kept.

## 8.4.0: Phase 5: career depth
- **Cutscenes look like scenes now.** No more four giant brothers filling the screen. Characters stand
  at a natural size in the room, with letterbox bars, a soft vignette, a slow camera that drifts to
  whoever is speaking, and subtitles in the bottom bar. Some scenes let you answer (← → and Enter).
- **Journal** (My Player → Journal): every scene you've seen, in order, and you can replay them.
- **Always a next goal.** A NEXT line on the hub says what to do next and what it pays (tap it).
  - **Rookie checklist:** finish a drill, visit the musalla, win a game, upgrade a stat, sit with the
    sheikh. +40 BP each, +100 BP for all five.
  - **Weekly goals** (career only): a week is 3 career games, with 3 goals drawn from what you do
    (stops holding Defend, green releases, assists, praying first, gym work, steals, dunks, charges,
    clean wins).
- **Badges are earned, never bought** (My Player → Goals & badges). Do the thing again and again, or
  follow a storyline to its end. Each has a small effect in career games only:
  - Mikan Man (finishes at the rim), Lockdown (stops holding Defend), Routine at the Line (free
    throws), Floor General (assists), Second Lungs (conditioning in the gym)
  - Storyline badges: Sabr (keep 5 intentions with Sh. Saleem), Big Stage (answer Jalal on the court)
- **More in the gym** (the drill menu is now grouped):
  - **Mikan drill:** layups at the rim, alternating sides, 40 seconds.
  - **Defensive slides:** stay in front of a sliding marker. Holding Defend counts full.
  - **Passing:** Khalil cuts to a spot and lights up. Hit him while he's open.
  - **Conditioning:** line sprints against the clock.
  - **Around the World** and **King of the Court** against the brothers, right from the gym.
  - **Today's plan:** three routines picked for the day. Finish all three for a bonus.
- **Niyyah before games.** Sh. Saleem asks your intention (or just play). After the game he reflects
  on it. Keep it and the masjid gets Halal Bucks, it counts toward Sabr, and it opens the next of
  eight lessons in his office (each with two questions to ask him).
- **Stories that happen naturally:**
  - Rival: after a game against Al-Burhan, Jalal says his piece, and you choose whether to answer.
  - Partner: as chemistry grows, your partner opens up (three scenes for each partner).
  - End of season: a small ceremony at the masjid with awards drawn from your season.
  - People in the musalla have new things to say after things happen. Look for the **!**.
- **Projects you can use** (no effect in games, ever). Walk up and press F (E in the musalla), or tap:
  - Gym: drink from the water cooler (bubbles in the jug), test the scoreboard buzzer, look at the
    trophy case, flip the lights (old tubes flicker, LED panels snap on), read the whiteboard.
  - Musalla: pray two rak'ahs at the mihrab, sit on the carpet, read the calligraphy and the mushaf,
    look up at the chandelier.
  - Outside (My Masjid): tap the minaret, dome, garden, fountain and parking lot.

## 8.3.1: two crucial fixes
- **Fix: players no longer twitch at half court.** After a basket, the defense runs back past half
  court. It used to sprint at full speed right into its spot, overshoot, and flip direction every frame
  (worst in Barakah Run). Now it slows into a pick-up spot across from its man and waits there. A
  player holding Defend also waits at the line until the offense crosses.
- **Fix: the ball no longer vanishes for a whole possession.**
  - The cause: restart state from a finished game carried into the next one. When a game ended
    mid-inbound (common in Barakah Run), the next game's first inbound went to a player from the
    previous game. The ball went off screen, nobody could touch it, and the shot clock ran out.
    Every game now starts clean.
  - Also fixed: a ball left "in the air" with no shot (after a foul whistled mid-flight) froze in place.
    A guard now repairs any such ball, and a match step that ever throws recovers instead of stalling.

## 8.3.0: Phase 4: reasons to play
- **Fix: players no longer jump into place at half-court restarts.** Before every check-up, everyone
  was teleported up to 300 units in one frame. Now they walk to their spots from where they are.
- **King of the Court** (Mini games, and online with a friend):
  - Real 1 on 1, half court, with a check-up at the top, DEFEND and contested dunks. Pickup rules:
    ones and twos, first to 3, no fouls.
  - Winner stays, loser goes to the back of the line. Hold the court 3 games in a row to be crowned;
    after 12 games, the most wins takes it.
  - Games you're not in can be watched or skipped.
- **Around the World** (Mini games, and online with a friend):
  - Seven spots around the key. Make it to move on and keep shooting; a miss ends your turn.
  - Miss twice in a row on the same spot and you go back one. First to make the last spot wins.
- **Profile and XP** (Options → Profile):
  - Every mode earns XP: matches, mini games, King of the Court, dailies, Barakah Run, online, and
    the tutorial once.
  - 30 levels, each unlocking a cosmetic:
    - thawb, kufi and sneaker colours, which appear in the career creator;
    - ball skins (Ramadan Night, Desert Sand, Green and Gold, Crescent, Pearl, Golden);
    - celebrations (hand on heart, fist pump, both arms up, salute, sujood of thanks);
    - titles.
  - Your profile card shows your level, title and records, and saves as an image. Cosmetic only.
- **Barakah Run 2.0** (solo runs; duo runs keep the classic ladder):
  - Take a vow first: a trade-off for the whole run (Fast Break, Quiet Focus, Iron Lungs, or none).
  - Then choose your path through 9 stops: a game, an elite rival (two upgrades), training (an upgrade
    without a game) or a masjid stop (a One More Chance shield).
  - The final is against the Champions. Beat them for the run, a Champion badge and bonus XP.
- **3 on 3 (beta)** in Quick Play: each masjid adds a guest player. Marking, restarts and passing were
  taught about the third man; the CPU's spacing is still tuned for 2 on 2.
- Mini games menu: four games. The online lobby lists Around the World and King of the Court.
- New `phase4` test. `online-loop` covers the two new mini games.

## 8.2.0: Phase 3 — easier to play, better feel, and fixes
- **Fix: mini games start and their settings change again.** On touch, tapping a row in Quick Play →
  Mini games was undone the same frame, so no setting could change and Start could never be reached.
  Now one tap changes a setting and one tap on Start starts the game.
- **Fix: Lightning, on deck.** The second shooter can shoot as soon as the ball ahead of him leaves the
  shooter's hand. He shoots from his spot first in line instead of waiting for the spot to clear.
- **Fix: Lightning, last two.** A made shot could be undone by the two-ball code. The scorer's ball went
  back to "in the air" and was his again, so he could grab his own make and dunk for the knockout without
  going back behind the arc. Fixed at the source. A shoot button held while running back can no longer
  fire the moment the pass lands either. Every knockout now needs a three first.
- **Fix: resets.**
  - Side-outs (fouls, reach-ins) in your own half get the same protected space as other restarts.
  - New watchdog: a dead ball always restarts, a stalled check-up or inbound goes live, a ball that ends
    up out of reach comes back as an out-of-bounds restart, and a ball nobody can pick up is freed.
    Nothing can eat a whole possession.
- **Tutorial** (Quick Play → Tutorial: learn to play). Nine hands-on steps on a real court: move, sprint,
  shoot, dunk, pass, dribble moves, defend, steal and block. Each step waits until you've done it (or
  you skip it); the text matches keyboard or touch.
- **Casual controls** (Settings → Controls, off by default). Tap SHOOT and the release times itself
  near the top (no pump fakes). On defense, leaving the stick alone guards your man. Online stays
  Classic.
- **Stride dribble** (Settings → Dribble, off by default). NBA Jam rhythm: one bounce every other step,
  locked to the feet. About 2 to 2.5 bounces a second jogging and 3 to 4 sprinting (Classic is 5 to 8).
  Sprinting pushes the ball out in front on a lower bounce. Only the look and sound change.
- **Skill moves that read.** Each move has its own body language: a low, wide crossover, a
  pause-then-burst hesitation, a step-back that leans away, arms out on the spin. A dust kick off the
  plant and a short trail behind the ball show what happened.
- **Game reactions:** scoring runs ("8-0 RUN!"), lead changes, a late tie, and "LOCKDOWN!" after three
  stops in a row on your end.
- Settings: "Control" is now "Team control". New `phase3` test; `minis` and `defense` tests cover the
  fixes.

## 8.1.0: Phase 2 — the Defense button, contested dunks, real resets
- **Defense button (replaces stance).** On defense the MOVE button is now DEFEND, and L (Numpad 3 for
  player 2) is a dedicated key for it.
  - Hold it and you lock onto your man: the ball handler, unless your partner already has him.
  - The game moves you between him and the rim at arm's length and keeps pace with him, so he can't
    just run past you. A dribble move, a fake or a screen can still beat you.
  - Staying with a quick man costs stamina, like sprinting. The stick adds a lean.
  - Feet set in his path draws a charge.
  - On a shot or a loose ball, holding DEFEND boxes out.
  - Your CPU partner takes the other man. Hold PASS on defense to have your partner double the ball
    (tap PASS is still a steal).
- **Contested dunks.**
  - A defender in your path or at the rim turns a dunk into a contest that can rattle out
    ("DENIED AT THE RIM!"). He jumps to contest if he's holding DEFEND or is a CPU who reads it.
  - You can't take off from range through a defender standing in your lane.
  - The sprint-dunk runway is shorter: no more dunks taking off from near the three-point line.
- **Resets.**
  - Full court: after a basket or a dead-ball inbound, the offense gets its own half. The defense
    runs back past half court ("GET BACK") and can't steal, shove or pick off a pass there until the
    ball crosses half court.
  - Half court: every restart is a check-up at the top of the key. Everyone walks to his spot, the
    defender checks the ball ("CHECK", "BALL IN"), and the clocks wait. This includes after a score in 1 on 1.
- **Control the whole team (option, off by default).** Options → Settings → Control: Your player /
  Whole team. With Whole team you play whoever has the ball, and on defense the man guarding the ball.
  This applies to single-player games with a CPU partner; career, co-op and online are unchanged.
- **Difficulty changes outcomes.** The CPU misses more of everything it shoots on lower settings.
  Measured against a player holding DEFEND, CPU points per possession go from 0.9 on Very easy to 1.3 on
  Medium and 1.6 on Hard. Details in `docs/reports/gameplay-loop.md`.
- Settings rows close up so the whole list fits on screen. The How to play page and the touch button
  labels show DEFEND / hold: GUARD, STEAL / hold: DOUBLE and BOX OUT.
- New `defense` test. `tests/perf/loop-report.mjs` gains a "guard" style (holds DEFEND).

## 8.0.0: Phase 1 — test tools, mini games, Very easy
- **Lightning, rebuilt to the real rules.** Five players line up single file behind the arc. The front of
  the line shoots first from the spot; the next player can't shoot until he has. Miss and you chase your
  own rebound and keep shooting until it drops. Make it and the ball is passed to the next in line. If the
  player behind you scores first, you're out. Last one standing wins.
- **HORSE options.** Pick the word (HORSE, SABR or HAQ) and the time to match a shot (6, 10 or 15 s) in
  Quick Play, the online lobby, and the career gym (uses your last choice).
- **CPU misses in mini games now scale with difficulty.** CPU HORSE make rate measured at about 38%
  on Very easy, 42% Easy, 62% Medium and 71% Hard (it was 79 to 87% on every setting).
- **Mini games in Quick Play.** Quick Play → Mini games: Lightning or HORSE against the CPU, no career
  save or friend needed. The finish screen comes back to the menu for another round.
- **Very easy difficulty** (Options → Settings, lobby, mini games). Slower, sloppier CPU, a wider green
  window for you, fewer fouls called, and your CPU teammate still plays a normal game. In career it is one
  more step below Easy.
- **Test panel (`?dev=1`).** A DEV tab (or the ` key) to jump to any career stage, round or season, win
  or lose the next game, give BP/HB, max stats, unlock everything for the tab, set the score or clock,
  launch any mode, change difficulty, and run the sim at 2x or 4x.
- **Possession log.** Every full game is logged possession by possession (start, length, shots, how
  it ended). The last 30 games stay in the browser; download them or see a summary from the DEV tab.
  `tests/perf/loop-report.mjs` simulates CPU and scripted-human games; findings in
  `docs/reports/gameplay-loop.md`.
- **Human review packet** in `docs/review/`: every line of game text as an editable spreadsheet (with
  speakers), the same grouped for reading, and a gallery of every court and team kit.
- Fixes: "You leads" / "YOU WINS" now read "You lead" / "YOU WIN"; the career gym's Lightning tip
  describes the new rules.
- New `minis` test (Lightning rules over 6 CPU games, blocked early shot, HORSE word/timer).

## 7.9.3: dribble rollback
- The 7.9.2 dribble rework is rolled back: dribbling looks and plays exactly as in 7.9.1 again.
  (Kept: the `controls` test parks defenders during its rules scenarios, so a random steal can't flake it.)

## 7.9.2: dribble smoothing and realism (rolled back in 7.9.3)
- **Steady tempo.** The ball has its own dribble clock instead of riding the run cycle: about 2.2
  bounces/s standing, 2.7 jogging and 3.4 sprinting (was 2.4 / 5.3 / 7.9). The tempo eases between
  speeds, so it never jumps when you start or stop sprinting.
- **Gravity-shaped bounce.** Quick off the floor, a hang at the top, a short contact. Sprinting changes
  the bounce's shape, not its tempo: the ball goes out ahead on a lower, longer bounce. Standing keeps it
  high and close.
- **Hand and sound.** The hand pump follows the ball; the bounce sound plays on the real floor contact.
- **No pops.** Crossovers, behind-the-backs and pump fakes no longer make the ball jump. A picked-up
  dribble is held instead of still bouncing. The dribble follows tall/short and solid/lean bodies.
- **Gameplay unchanged.** Steals and fumbles read the old hand-based ball position; steal odds and
  CPU-vs-CPU stats measured the same. Details: [halkotob/IslamDunk#1](https://github.com/halkotob/IslamDunk/pull/1).
- New `dribble` test; the `controls` test no longer flakes on a random steal.

## 7.9.1: new logo
- The mark is redrawn from scratch as one simple silhouette (no internal lines): a brother in a kufi
  and a full-length thawb taking off for a dunk. He leans in, the ball arm is fully extended, the free
  arm is out for balance, the front knee drives up, and the thawb streams back off the trailing leg.
  Picked from four rounds of options.
- Stored as a baked alpha mask (`DUNKER_PNG` in `src/render/logo.js`), tinted gold on the title and
  splash, and gold on the green tile for the app icons (regenerated with `scripts/make-icons.mjs`).

## 7.9: feel and fairness, new logo, intro staging
- **New logo.** A dunker in a thawb and kufi, in the split-leg, ball-overhead dunk pose, as one gold
  silhouette. It's on the title screen and splash, and in the app icons (regenerated from the game's own
  drawing code by `scripts/make-icons.mjs`).
- **Sprint.**
  - Everyone jogs 8% faster, and sprinting is a bigger step up (1.5x the jog, was 1.42x).
  - Keyboard: hold **Left Shift** while moving (Right Shift for player 2). Double-tap sprint is gone.
  - Touch: pushing the stick to its ring is full speed. Sprinting needs a deliberate push past the dashed
    outer ring, and the knob glows while you sprint. Quick flicks no longer sprint.
- **Stamina, same rule for you and the CPU.**
  - Turbo used to refill only with sprint released, so holding it pinned you at zero. Meanwhile the CPU,
    which lets go, sprinted about twice as often.
  - Now anyone who runs the bar dry is winded until it's back to 45%. The bar refills even while you
    hold sprint and shows red while winded.
  - Measured result: holding sprint now gives you about 35% sprint time; the CPU gets about 21%.
- **Walls.** Players stop at the baselines instead of walking into the gym end walls. A loose ball
  bounces off the end walls and the near sideline back toward the court (it used to travel 70 units past
  the baseline, behind the walls and off frame). The bottom player card turns see-through while someone
  is behind it.
- **Fair restarts.** On side-outs, check balls, 1-on-1 and half-court inbounds, no defender starts
  within arm's length of the handler. Anyone crowding him steps back between his man and the basket, and
  a teammate on top of the handler spreads out. Before this, the defender who fouled you could still be
  touching you.
- **Career intro.**
  - The brothers are busy when you walk in: Khalil shoots around (and swishes), Nasser stretches, Uncle
    Mahmoud sits on a folding chair, Tariq keeps the stat sheet on a clipboard, and Uncle Siddiq pours
    chai at a little table.
  - Whoever you walk up to stops, turns to you and talks with his hands; you nod along. Cinematic bars
    slide in during conversations.
  - Sh. Saleem walks in with you, then goes to his spot. Names only show for people near you.
- **Mobile intro fixes.** The touch stick now works on the walk outside the masjid; before, you
  couldn't move. TALK advances dialogue; before, only a tap on the right spot of the canvas did, which
  read as a freeze.
- **Tests.** New `feel` test (stamina parity, walls, side-out spacing). The `controls` test no longer
  flakes when a turnover inbound is still in the air. Seeded CPU games differ from v7.6 on purpose
  (speed and stamina changed).

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
