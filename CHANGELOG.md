# Changelog

## 9.8.0: the play-test review
From the team's feel checklist and line marks (Review Studio export). Lowest ratings first.

- **Online lag (rated 1).** Players on different networks rarely got the direct link (only STUN was tried) and fell
  back to the Firebase server, which queued every snapshot in order, so delays piled up.
  - On the server path, snapshots and inputs no longer queue. While one write is in flight, only the newest waits.
  - On the direct link, snapshots go at 60 Hz (was 30).
  - The host tries the direct link 6 times (was 4).
  - A guest's shot release that arrived together with the press was lost; it is kept now.
  - A relay (TURN) server can be set in `ONLINE_TURN` (`src/online/v98-net.js`) or `window.ISLAMDUNK_TURN`, so
    players the direct link can't reach still get the fast lane. None is set by default: it needs the team's own
    TURN service (for example Cloudflare Calls).
- **Restarts after fouls and timeouts (rated 2).** A foul side-out or a set play out of a timeout handed the ball over in
  place and went live the same frame.
  - Now everyone walks from where they stood to their spots: the fouled player to the spot of the foul, or the set
    play's formation.
  - The ball is checked (CHECK), then BALL IN. The clocks wait. Half court already worked this way.
- **Steals and blocks (rated 2: "feels more random").**
  - **Blocks:**
    - A jump that meets the ball early, from between the shooter and the rim, is a real block chance, and Defense
      decides how likely: about 25% at Defense 3, 57% at 10. It was a roll capped at 30% for everyone, so Defense
      stopped mattering above 7.
    - From the side or behind, it stays a long shot.
    - Defense also reaches a little farther.
    - A missed block says why: LATE, NO ANGLE, JUST MISSED.
  - **Dunk contests** weigh Defense against Dunking, and a set rim protector stops more.
  - **Steals:**
    - Reaching at an exposed ball (on your side of his body) or a ball between his hands is a real chance that grows
      with Steals. Reaching across his body almost never works.
    - A gold ring under the ball shows when it's exposed and in reach.
  - Measured over CPU games, blocks are 10% of Medium shots (was 9%).
  - The league's stand-in result (used when a background game times out) is recalibrated to the new steal, block
    and turnover rates.
- **Niyyah (rated 2).** Asked before big games only: your first career game, the first game of each stage entry,
  semifinals and finals. The choice buttons size to their text (two per row), so long intentions no longer run off them.
- **Difficulty (rated 3: "scalable across all difficulties").** Difficulty only changed the CPU's offense; its defense
  was the same at every level.
  - Each level now also sets the CPU's defense (`DIFF.dk`: blocks, steals, and how much a close defender lowers
    your shot at release), and Very easy's CPU shoots a little worse. The CPU's shot choices are unchanged.
  - A medium-AI stand-in now wins 87% / 77% / 50% / 13% from Very easy to Hard (was 90 / 67 / 47 / 13). Easier
    levels also widen your own release window, which the stand-in doesn't use.
- **Layups (rated 3: "no layup animations").** Shots were already classified, but only signature moves had a pose.
  Layups now have:
  - a gather step;
  - a **finger roll** (ball up on a straight arm, knee drive), the normal layup;
  - a **jelly** (one-hand finesse scoop, leaning in) when a defender is close;
  - poses for reverses, up-and-unders and putbacks;
  - a held follow-through.
- **Mini games (rated 3).** Around the World, 7 Up and the custom game room are removed (menus, the gym and online).
  Lightning, HORSE and King of the Court stay.
- **Menus (rated 3).** The title menu explains the highlighted entry in one line under the panel.
- **Cutscenes.** The Skip button (top left, since 9.6.2) now answers a choice that is still on screen with its first
  option, the same way Esc does.
- **Lines:**
  - Tariq's and Uncle Siddiq's intro lines are cut, along with them in the intro (you meet them in the musalla).
  - Nasser's shooting tip is replaced with a welcome.
  - "beta" is out of Uncle Mahmoud's line.
  - Khalil's gym welcome is rewritten.
- **Tests:** the new `v98` test covers restarts, blocks, steals, the difficulty settings, niyyah, story Skip, the menu
  help, the mini games list and the layup poses. `career-intro` meets three brothers. The `v86` and `online-loop`
  tests drop the removed games. `feel` measures the side-out spacing after the check. 82 Review Studio IDs are listed
  as removed.

## 9.7.0: the league plays its games, and keeps its stats
- **Every game in the bracket is a real game.**
  - The other games of each round used to be an invented score. They are now CPU-vs-CPU games on the match engine,
    run without drawing anything.
  - They use your Settings format, the 14-second clock, the same teams and CPU levels as your opponents, and the
    same rules and fouls.
  - Every player on every team gets a stat line.
  - This covers the group stage, the semis and the final (including when you're out in the group), the old
    single-elimination bracket, and every stage.
- **They never touch your game.**
  - A league game runs between frames in slices, and only when no match is being played.
  - Each slice saves everything the engine touches, swaps the league game in, steps it and puts yours back.
  - While it runs, these are off: sound, particles, replays and clips, achievements, toasts, storage writes, court
    building and the end-of-match flow.
  - Its random numbers come from its own generator, seeded from your save, season, stage, attempt, round and game.
    The same save always gives the same league, and the game you play next is the same with or without it.
  - A memory in the commentary (it avoids repeating its last line) used to steer the random numbers. It now starts
    fresh for each league game.
- **When they're played:**
  - The round's other games are played in the background on calm screens (the hub, menus, the post-game screen,
    story scenes).
  - Whatever is left after your game, plus anything your result decides, is played on a short **Around the league…**
    screen.
  - That screen has a hard 20-second cap. A game that throws or runs past it gets a calibrated stand-in result,
    which is logged and never blocks you.
  - The hoop nets aren't simulated in these games: no gameplay reads them, and they were 44% of the cost.
- **Stats** (save version 5, an empty record for old saves):
  - For every player on every team, per stage run: games, points, assists, rebounds, steals, blocks, charges drawn,
    turnovers, FG/3P/FT made and attempted, and dunks.
  - Plus compact box scores for the current stage's games. Your own box scores stay as they are (the last 160).
  - A retried stage replaces the attempt's league stats.
  - A full season adds about 10 KB to the save.
- **My Player → League & stats** (the Stats & box scores screen, extended):
  - **Leaders:** PPG, APG, RPG, SPG, BPG, FG%, 3P%, FT% and dunks per game, for this stage, this season or your
    career. Top 10, with you and your teammate highlighted and your ranks shown even outside the top 10.
    Percentages need 2, 4 or 8 games (stage, season, career) and enough attempts a game.
  - **Player pages:** averages, totals, stage splits, archetype and team; for your players also your seasons and
    last 5 games.
  - **Around the league:** every round's scores; tap one for its box score.
  - Rank is bragging rights only: no rewards and no streaks.
- **Box scores add up:** a basket that counted without a credited shooter (a loose ball that drops in) now goes, in
  league lines only, to the last scorer's teammate who touched it. Live games and rewards are unchanged.
- **Also:**
  - The stats screen has a Back button on phones.
  - The Back button's tap area is 44 CSS px tall on phones.
  - Charges drawn are counted.
- **Tests:**
  - `league-round`, `league-determinism`, `league-headless`, `league-formats`, `league-board` (a brute-force check of
    810 boards).
  - `league-time` (ms per game on desktop and a 4×-throttled phone profile, the wait cap, a game that throws).
  - `league-calibration` (500 real league games against the stand-in, and 200 against CPU-vs-CPU games played
    normally).
  - `league-layout` (five sizes).
  - The new screens are in the phone audit and the Review Studio.
  - `npm run review:league` takes the screenshots.

## 9.6.3: a 14-second shot clock, always
- **The shot clock is 14 seconds in every game:** Quick Play, career, Barakah Run, scenarios, the title demo and
  online. In online games the host runs the clock and the guest sees it.
  - Formats that had no clock before (30- and 45-second periods, first to 21) have one now.
  - It is no longer tied to the period length, and the Settings period labels no longer mention it.
  - Mini games keep their own rules, and so do King of the Court (pickup rules), the tutorial and Dunk Lab.
- **Resets:**
  - On a change of possession and on a shot that touches the rim, as before.
  - A side-out (out of bounds, a shove foul) or a set play after a timeout keeps the clock, but never under 8 seconds.
    It was 14 of 24; 8 is the same share of 14.
- **Barakah Run:**
  - **Fast Break** is now a 10-second clock for both teams, with the same reward.
  - **Set the Pace** takes 2 seconds per rank off the CPU's 14: 12, 10, then 8 at most. Before, the CPU always had
    20 seconds, even at rank 0.
- **The CPU:**
  - Its shot timing (when it will settle for a shot, how long it dribbles, when it sets screens) was tuned for
    24 seconds. It now runs on the clock it actually has, so a 14-second possession gets the same rhythm a 24-second
    one did.
  - 200 CPU-vs-CPU games per difficulty, before → after (per team per game):

    | | Shot clock violations | Points | Shot attempts | FG% | Turnovers | Shot quality |
    |---|---|---|---|---|---|---|
    | Very easy | 0 → 0.007 | 35.3 → 36.3 | 26.1 → 27.3 | 63.5 → 62.3 | 0.39 → 0.46 | 0.685 → 0.685 |
    | Easy | 0 → 0.003 | 36.9 → 38.2 | 25.7 → 26.9 | 66.2 → 65.1 | 0.72 → 0.77 | 0.663 → 0.664 |
    | Medium | 0 → 0.005 | 37.7 → 38.5 | 25.0 → 26.0 | 67.1 → 66.3 | 1.45 → 1.48 | 0.699 → 0.689 |
    | Hard | 0 → 0 | 42.0 → 43.1 | 24.4 → 25.4 | 73.7 → 72.9 | 2.17 → 2.19 | 0.782 → 0.757 |

    Shot quality is the shooter's make chance times the points, at release.
  - Without the change, the 14-second clock made the CPU shoot early and badly: medium shot quality 0.619, FG% 57.
  - `tools/cpu-clock-report.mjs` runs these numbers.
- **Tests:**
  - New `shot-clock` test: 14 seconds in every format and period length (first to 21 too), the demo and career; a
    violation turns the ball over; resets on a steal and a rebound; side-outs keep at least 8; Barakah Run's Set the
    Pace and Fast Break; an online guest gets the host's clock.
  - The `formats` test expects 14.
  - `cpu-parity` outcomes change on purpose: every seeded game now has a shot clock, and the CPU reads it differently.

## 9.6.2: career hub declutter, badge pills that fit
Layout and drawing only. Gameplay, tuning, saves, the calendar and online play are unchanged, and nothing was removed:
things moved.

- **Badges** on your hub card:
  - Each pill is sized to the badge's full name ("Floor General", not "FLOOR"), measured so the bigger phone text fits.
  - The pills flow from the row above them and wrap. If more are earned than fit, a "+N" chip shows the rest.
  - Tapping any pill opens Goals & badges.
- **What moved:**
  - **Stats:** the card shows your three best stats, with the body's bonus or cost in the bar and the real number.
    The full list (all nine stats and their modifiers) is in My Player → Upgrade stats; "All stats ›" on the card
    opens it.
  - **Balances:** Barakah Points and Halal Bucks are two chips at the top of the right column. BP opens My Player and
    HB opens My Masjid. The menu rows no longer repeat them.
  - **Trophies:** one compact row of four.
  - **Gym bests** (free throws, threes, cone run, 1v1 wins): a new page, My Player → Records → Personal bests.
  - The card also shows your play style.
- **Fixes on the same screen:**
  - The weekly goal strip says WEEK GOAL instead of a second NEXT.
  - The menu has its own panel. The weekly goal is its first row.
  - Continue fits inside the centre column, with its "Game today" tag inside it.
  - The gym behind the hub is darker, and its signs, name tags and speech bubbles are hidden while the hub is up.
  - The hub's panels are 94% opaque, with 12 px gutters.
  - The calendar strip is unchanged.
- **Stat bars:** they were correct. They show the level you trained (4 to start, 10 at most). They looked full on a
  save with every stat at 10 (the test panel's Max stats), next to a separate modifier tag. The new card's bars
  include the modifier.
- **The same bug elsewhere** (pills sized to their text, or text fitted to its pill):
  - The Back / Close / Skip button.
  - Lobby and mini-game messages, gym and salah toasts, the masjid caption.
  - The Laylatul Qadr HUD tag, the gym's salah bonus tag, the office labels and the musalla's question rows.
- **Tests:**
  - `hub-layout`: the hub at 1920×1080, 1280×720, 1024×768, 844×390 and 667×375, in 13 cases (0, 2, 4 and 8 badges,
    long names, 3- and 5-digit balances, Friday, Ramadan and Eid, maxed stats, the My Player and Records lists open).
    It fails on text over text, panel over panel, text outside its container, a badge pill off the card, a gutter
    under 12 px, or phone text under 11 CSS px.
  - The phone text audit also covers Personal bests.
  - The fixtures are in `tests/hub-setup.js`, and `npm run review:hub` screenshots them.

## 9.6.1: art slice rolled back
9.6.0 (the art slice: three preview looks for one character and one court) is removed. The game is back to 9.5.0's
code and art; only the version number moved forward, so installed copies update.

## 9.5.0: Tournament, League, top plays, My clips, accessibility
Phase 7, part 2. Builds on 9.4.0. There were no review results to apply yet: no marks in `game-text.csv` and no
Review Studio exports.

- **Tournament** (Quick Play → Play a game → Tournament).
  - 4 or 8 teams in a knockout bracket: quarterfinals, semifinals, final.
  - Pick your team, your player, and whether your own teams fill the field first.
  - You play your games. The others are decided by a quick simulation from team strength, plus luck.
  - Knocked out: the rest plays out and the champion is shown.
- **League** (Quick Play → Play a game → League).
  - 4, 6 or 8 teams play everyone once or twice (a bye with an odd count), then the top two meet in the final.
  - Tabs:
    - **Standings:** W, L, points for and against, +/-.
    - **Schedule:** matchday by matchday.
    - **Leaders:** points, rebounds and assists per game, from your games' box scores and the simulated ones.
- **Both:**
  - Any teams from the team list (built-in masjids, your career team, your own teams).
  - Your team's own court (or home court) hosts your games, and the final is at the Masjid League Arena.
  - Games follow Settings (difficulty, format, period length).
  - Saved after every game: one tournament and one league at a time, shown as "(continue)" in the menu.
  - N (or Start over on touch) ends one and starts again.
- **Top plays.** After a game with two or more highlights, **Top plays** (T) on the post-game screen plays the best three
  back to back, each labelled, then returns to the best play.
- **My clips.**
  - After **Make video**, **Keep in My clips** (K) stores the video in this browser, up to 12, oldest out first.
  - **Options → Extras → My clips** lists them with their poster. You can play them, save them to a file again, or
    delete them.
  - Nothing is uploaded.
- **Settings → Accessibility** (a new group):
  - **Shot release:** Timed or Automatic. Automatic is the release Casual controls already use (near the top of the
    jump, good but not always perfect), without Casual's auto guard. Online keeps timed release.
  - **Text size:** Normal, Large or Larger, on a computer. Small text is raised to a minimum as it's drawn, the way
    phones already do. Phones keep their own minimum.
  - **Team colors:** Normal or Colorblind-safe. Colorblind-safe dresses the two sides in blue and orange (Okabe-Ito)
    with light and dark trim, in every game.
- **Checks:** the new screens are in the phone text audit (and so in the Review Studio). New `v95` test.

## 9.4.0: Jumu'ah
On Fridays in career mode, going into the masjid can include Jumu'ah: a short, calm scene where Sh. Saleem gives 2 or 3
reminders. Each reminder is a trivia question from the Noor bank, so listening teaches answers. It is optional and
never a mini-game. Matches, AI, online and every other mode are untouched. (The brief named this 9.2.0; that number went to the neighbourhood and 9.3.0 to the
custom courts, so this is 9.4.0.)

- **The door.** On a free Friday with the Career calendar on, going into the masjid asks first: **Attend Jumu'ah** or
  **Not today**, one press either way (Enter / tap; Esc means Not today). Not today goes in as on any other day.
  There is no penalty, streak or message. The street's existing Jumu'ah marks stay: the date pill and the gold
  marker over the masjid.
- **The scene.** It is set in the musalla, using the existing art. The brothers sit in rows facing a small wooden
  minbar where Sh. Saleem stands. It opens with "The brothers sit for the khutbah.", then his reminders appear in a
  speech panel. Each advances on its own after 12-18 s, or with Enter / a tap; a whole talk takes about 30-60 s.
  - Esc, Back or the Skip button leave at any time.
  - The player only listens. There are no buttons to time, no quiz, no score or reward, and no game sounds. The
    prayer itself is not shown.
  - Afterwards the day goes on inside the masjid (the hub), as after any visit.
- **What is said.** Each reminder is one lead-in ("Today's reminder:", "Let us also remember:", "And a last
  reminder:") plus an existing trivia explanation (`TRIVIA_WHY`). When the explanation doesn't name the answer, the
  question and its answer come first. No other words are added.
  - 178 of the 181 questions can appear. Three are left out because their explanations talk about the game: 90 (our
    masjid's name), 166 ("even a game") and 179 (Noor on the court).
  - `docs/review/jumuah-reminders.md` lists every one for religious review (`npm run review:jumuah`).
- **What it teaches.** Reminders come from questions you haven't studied and that weren't used in the last few
  Fridays (the last 9 questions). The talk is picked from the day and kept in the save, so a reload shows the same
  talk.
  - Each reminder that has been on screen goes into `C.learned`, exactly like studying at the shelf: it shows
    "Studied" in the Noor challenge and counts toward Student of Knowledge (books_10). Skipping keeps what was
    already shown.
  - At the end a card lists "Today's khutbah touched on:" with the questions.
  - When everything is studied, the talk has two general reminders and nothing new is marked.
  - The shelf is unchanged.
- **Saves.**
  - `C.cal.jum = { days, recent, talk }` is created when first needed, so old saves load as they are.
  - Attending also counts in the calendar's day counters (`jumuah`) for later steps. Nothing shows a streak or a
    missed Jumu'ah.
- **Review:**
  - `npm run review:export` lists the new strings, plus a "Jumu'ah khutbah" section with every reminder. A new
    **From trivia bank** column gives each one's question number.
  - The Review Studio has the reminders under Dialogue → Jumu'ah khutbah, and the scene under Screens.
- **Tests:**
  - `jumuah`:
    - only on Fridays; the walk to the door by keys;
    - attending marks 2-3 new questions studied (Noor challenge "Studied", books_10, the counter);
    - every line traces to a question and its explanation;
    - skipping at the door, in the room, after each reminder and on the card;
    - the same talk after a reload; all studied; an old save; Career calendar Off; the shelf unchanged.
  - `jumuah-visual`: baselines at 3 sizes.
  - The phone text audit covers the door question, the room, a reminder, the longest possible reminder and the card.
## 9.3.0: your own court, 3 on 3 picks, your players in mini games
Phase 7, part 1. Builds on 9.2.3.

- **Your own court.** Teams & Players → edit a team → Home court → **Your own court**, then:
  - Building: masjid gym, community gym or outdoor park.
  - Floor: honey wood, light maple, dark walnut, or gray, blue or green sport floor.
  - Paint: the team's main or second color, natural, red, navy or teal.
  - Center: crest, short name, both, or nothing.
  - Name on baselines: on or off.

  The editor shows a live preview. The court is listed first on the venue screen when the team plays in Quick Play.
  It can be picked in the online lobby's Venue list, and your friend sees it as you made it, because the court
  travels in the venue spec. A team in your career league plays its home games against you there. Share codes
  carry the court.
- **3 on 3 (beta): pick the third players.** After both teams are chosen, a new screen picks each side's third
  player. It can be anyone in Teams & Players (your players, your career player, the masjid brothers, any
  built-in player), or Auto for the guest player as before.
- **Your players in mini games.** Your own players and your career player can be the opponent in HORSE and
  Around the World. A new **Opponents** row (Masjid regulars, Mixed, My players) fills Lightning,
  King of the Court, 7 Up and custom games. CPU accuracy follows the player's shooting stat. Online mini games are
  unchanged.
- **Fixes:**
  - On the Teams & Players list, pressing right (D or D-pad right) switched tabs and also duplicated the entry.
    Duplicate is now U. On a gamepad, X copies the share code and Y duplicates.
  - The share code no longer runs past the edge of the screen on phones.
- **Checks:** the team editor (with and without a court), player editor, share, import, mini game room, the new
  3 on 3 screen and the venue screen with your own court are in the phone text audit
  (`tests/phone-audit.mjs`), so the Review Studio shows them too. New `v93` test.

## 9.2.3: Review Studio, Phase 3 scaffold (sounds and voice)
The game itself is unchanged; only the version number moves.

- **Sounds (23).** Every sound effect in `src/core/utils-audio.js` (building blocks that need arguments, like `tone` and `netNoise`, are left out), listed with a play button (or P). Each one plays
  through the game's own `SFX` code with sound switched on just for that play, and gets a verdict like any other item
  (`sound/<name>`).
- **Voice.** The studio reads `assets/voice/manifest.json` (`{ "lines": [{ id, file, transcript, speaker }] }`). Each
  line becomes an item (`voice/<file>`) with its transcript and an audio player. There is no voice yet, so the
  Voice category shows how to add it and the format. `docs/review/README.md` documents the format.
- **Tests:** `studio-anim` also plays every sound without errors. The 23 `sound/…` IDs are added to the registry.
  The empty-voice notice is not an item: it is never exported and has no ID.

## 9.2.2: Review Studio, Phase 2 (animations and screens)
The game itself is unchanged; only the version number moves.

- **Animations (55).** Each one runs on the game's own simulation: a throwaway match, the move started by the game's
  own code (`startDunk`, `startShot` with the shot type, `doPass`, `startJump`, `trySteal`, `tryShove`,
  `knockDown`, `startDribbleMove`, `startFake`, taunts, `react`), then `updateMatch` one 1/60 s step per frame, so
  `animate()` poses the rig exactly as in a game. Random picks use a fixed seed, so every playback is the same.
  - **Stand and move:** idle, walk, run, sprint.
  - **Dribble:** Classic and Stride styles, and in place.
  - **Dribble moves:** crossover, behind the back, spin, hesitation, step-back, drop step, and the pump fake that
    picks up the dribble.
  - **Shots:** jump shot, fadeaway, floater, hook, layup, reverse, up and under.
  - **Dunks:** two-hand, windmill, 360, the four tomahawk styles, the alley-oop catch, hanging on the rim.
  - **Passes:** chest, bounce, lead, the alley-oop lob.
  - **Defense:** steal, block, shove, ankle break.
  - **Falls:** knocked down and getting up.
  - **Celebrate:** the celebration, all 10 taunts, and five reactions.

  Controls: play / pause; speed 1x, 0.5x or 0.25x; a frame back or on; loop; flip direction; with or without the
  ball; and a character picker covering the cast, every team player and the neighbourhood people. The frame number,
  the rig state, the height and all nine joint angles are shown for every frame.
- **Screens (270 views + 3 not renderable).**
  - The phone text audit's 76 setups and 14 of the studio's own are each shown at desktop 16:9 and the two phone
    sizes. The studio's own cover the splash, the `?review=1` screen, the career intro outside, the Barakah Run vow,
    map, choice, end and badges, the custom team editor and player editor, its import and share screens, and the mini-game room and
    its import.
  - The live game page is shown, so the touch buttons are there too. A throwaway career is used, in memory.
  - The checks are the phone audit's: text past the edge, text under 11 CSS px, overlapping tap targets (with an
    overlay), the touch buttons over the scoreboard, and page errors.
  - `hostlobby`, `netplay` and `netwait` need a live online session. They are listed as not renderable, with the
    reason.
- **Tests:**
  - `studio-anim`: every animation reaches its state with finite joints, plays the same twice, flips, and works with
    another character.
  - `studio` now also renders every animation and every screen, and checks that each setup lands on the screen it
    is listed for. The screen flags are reported, not failed.
- **ID registry:** 328 new IDs (`anim/…`, `screen/…`), added in 9.2.2.

## 9.2.1: Review Studio, Phase 1 (dialogue and text, sprites)
A separate web tool for reviewing everything in the game without playing it. Per item it records a verdict
(**Keep**, **Fix** or **Delete**), a comment and suggested text, and exports them as CSV. The game itself is
unchanged: no game file changes in this release except the version number.

- **Its own build.** `review.html` and `src/review-studio/` form a separate Vite entry (`vite --mode review`):
  - `npm run review:studio` starts the dev server on port 5174;
  - `npm run build:review` builds into `dist/review/`;
  - `npm run review:preview` serves that build.

  It is never in `dist/web`, the GitHub Pages root or the Electron app. `_config.yml` excludes its files from Pages,
  and a test checks all of this. It is not published anywhere. `docs/review/README.md` explains how to host it
  privately.
- **The real game draws every item.**
  - The studio loads the shipping game page in a same-origin frame, `game.html`. Its `localStorage` and
    `sessionStorage` are in memory, so a real save can never be touched.
  - An agent script runs in the game's own scope and calls the game's functions: the dialogue tables,
    `drawPortrait`, `drawCrest`, the venue builder, `drawBallAt`, the hoop, `drawExterior`, the neighbourhood scene
    cache and `drawHUD`.
  - Random picks such as greetings use a fixed seed, so the item list is the same every time.
- **Items, each with a stable ID.** 3,208 items:
  - **Dialogue (464 lines):** story scenes, Sheikh pools, talks and lessons, the niyyah, partner scenes, musalla
    news and talks, milestones, the intro and neighbourhood people. Conversations are shown as conversations, with
    the speaker's face, and each line has its own verdict.
  - **Trivia (181):** the question with the right answer, the wrong answers and the explanation.
  - **Text (2,341):** achievements, Noor effects, taunts, calendar names, and every other player-facing string from
    `game-text.csv` that isn't already part of an item above, grouped by its game-text.csv section.
  - **Sprites (222):** cast, team players and the rival, neighbourhood people, every creator option, crests, kits,
    balls, the hoop, all 20 courts (this replaces the gallery), the four neighbourhood scenes and their 30 props,
    My Masjid outside with no projects and with every project, and the HUD.
- **The review screen.**
  - **Left:** categories with counts and completion bars.
  - **Top:** search; filters (Unreviewed, Keep, Fix, Delete, New since last review, Religious review); progress;
    the reviewer's name and role.
  - **Middle:** a virtualised list with cached thumbnails, and the item as it ships. Sprites can be shown at 1x, 2x,
    4x, 8x or Fit, on a light, dark or checkered background, facing right or left, in thobe or any team's kit, at
    any time of day, with a pixel lens.
  - **Right:** where the item lives (file:line), when it appears, the version it was added in, the verdict, the
    comment, the suggested text and other reviewers' marks.
  - **Keys:** K, F and D set the verdict and move on; the arrows move; N goes to the comment; Ctrl/⌘+Z undoes.
    Touch works too.
  - Marks autosave to `localStorage`.
  - Desktop and tablet layouts; it also works on phones.
- **CSV.**
  - **Download / Copy as CSV:** `id, category, name, where, version_added, verdict, comment, suggested, reviewer,
    role, reviewed_at, build_version`.
  - **Import:** a studio CSV (merged by id + reviewer, newest wins, conflicts listed), `game-text.csv` (Keep / Change
    / Cut) and the in-game `?review=1` export. Change becomes Fix and Cut becomes Delete.
  - `npm run review:report -- <csv>` prints a worklist by file and applies nothing.
- **ID registry.** `docs/review/studio-ids.json` records every ID and the version it was added in. The first
  versions come from `git blame` of each item's line; "phase1" means it was in the Phase 1 packet.
  `npm run review:ids` adds new IDs. Removing an ID needs `--remove "why"`.
- **Tests:**
  - `studio`: loads with no errors, every item of every category draws, counts per category, IDs are unique and
    stable.
  - `studio-csv`: keys and undo, CSV round trip, both older imports, merge conflicts, Delete changes no game file, the
    game frame's storage is sandboxed, the report.
  - `studio-excluded`: not in dist/web, the Electron renderer or Pages.

  `npm test` now also builds the studio.
- `scripts/review-export.mjs` now shares its text extraction with the studio (`tools/review-text.mjs`). The packet
  is regenerated and includes the PAD_TEXT lines added since the last export.

## 9.2.0: the neighbourhood
Step 2 of the career calendar. On free days your player walks from home through the neighbourhood to the masjid and
the corner store. Matches, AI, online, Barakah Run, Quick Play and every other mode are untouched.

- **A small scene engine** (`src/career/world/`). Scenes are data:
  - the floor's depth range;
  - walkable polygons;
  - layers: far (parallax), base, foreground, and the lights;
  - props with collision footprints, depth-sorted with the characters;
  - portals, interaction points, and NPCs with idle poses, short strolls and lines;
  - four times of day.

  Every layer and prop is rendered once per scene and time of day into offscreen canvases. These are cut into
  tiles at most 2048 px wide (GPU texture limits, iOS canvas memory) at the canvas's backing scale. Adaptive
  resolution now also runs in the neighbourhood.

  The engine also provides:
  - a camera that never shows the world's edge;
  - fades between scenes;
  - prompts with E, the touch TALK button or pad A.

  Keyboard, touch (stick + TALK) and gamepad all work.
- **Four scenes.**
  - **Home:** living room and bedroom. The door goes out, the bed ends the day, and the wardrobe mirror opens
    the look editor. The prayer corner is decoration only, and the window shows the time of day.
  - **The street,** about three screens wide:
    - your house and two neighbours' houses;
    - the Corner Market, and the masjid at the end behind its wall;
    - trees, parked cars, fences, mailboxes, a hydrant, a bench;
    - streetlights that come on at dusk;
    - closed gates at both ends.
  - **The masjid front:** the building follows your masjid upgrades (renovated walls, dome, minaret,
    calligraphy, garden). The door goes into the career hub; the hub's new "Go outside" comes back out.
  - **The Corner Market:** shelves, a fridge, the counter and Abu Karim.
- **Seven neighbours,** each with one or two short lines, picked by day so they don't repeat back to back.
  Every conversation can be left with Esc, Back, pad B or the Leave button.
  - On the street: Uncle Yusuf on the bench, the kids Bilal and Sami passing a ball, Mr. Daniel next door, and
    Hamza out for a walk.
  - At the masjid: Br. Idris.
  - In the store: Abu Karim.
- **The day.**
  - A free calendar day (anything but a game day) starts at home in the morning, with Go out (G) and Skip the
    day (N) always on screen.
  - The store and the masjid can each be visited once a day. Each visit moves the time of day on (morning,
    afternoon, dusk, night), and coming home at dusk or later makes it night. At night only home is open.
  - End the day at the bed moves to the next day; a game day goes straight to the pregame. Skip the day, or the
    hub's Continue, jumps to the next day with something on it.
  - After a game's post-game you wake up at home the next morning.
  - On Jumu'ah the way to the masjid is marked; the sermon itself is for a later step.
  - Visits are counted in the v9.0 per-day counters.
  - Nothing is penalised: no streaks, no timers.
  - Settings → Career calendar Off keeps the old hub with no walking.
- **The Corner Market** sells 7 cosmetic items for Halal Bucks at fixed prices. Owned and worn are shown, and
  there are no stats, random items or new currency. The items:
  - gold and teal sneakers;
  - saffron and indigo cap colors;
  - white and green headbands;
  - a water bottle.

  They show on your player and in the creator. The two new rows (Headband, Water bottle) only offer what you
  own. The headband shows in every view; the bottle shows in the neighbourhood.
- **Saves.** `C.cal.loc` keeps the scene, position, time of day and today's visits, so loading puts you back in
  the same place. Saves from before 9.2 start at home on a free day.
- **Quality gates.**
  - `docs/art-style.md`: the style guide.
  - `npm run review:world`: 84 frames (7 views × 4 times of day × desktop and both phone sizes) into
    `docs/review/img`, linked from `docs/review/gallery.html`.
  - New tests: `world-flow`, `world-walk` (the walk bot), `world-robust`, `world-save`, `world-visual` (pixel
    diff against those frames: any channel off by more than 10/255 on more than 0.2% of pixels fails) and
    `world-pad`.
  - The phone audit covers every scene, a bubble, prompts, the shop, the menu, a banner and night.
- **Other changes.**
  - The match hot-spot label isn't drawn when it's off the canvas. Nothing visible changes, but the phone audit
    no longer flags it on unlucky seeds.
  - The `calendar` test now expects a non-game day to start at home.

## 9.0.1: career uses the game format
- **Career games follow Settings → Format and Period length**, like Quick Play: by default 2 halves of 2:00 (24 s
  shot clock); pick 4 Quarters (or First to 21) and career uses that. Practice (gym drills, mini games, the hub gym)
  keeps 4 quarters, since it has no real periods; Barakah Run and the daily scenario keep their own fixed formats.
- Everything in a career game already read the format: the scoreboard label (1ST HALF / 2ND HALF), halftime (once,
  after the first half), the box score's period columns (H1 / H2), the final period for clutch, rubber-band,
  late-game CPU, timeouts, the Sabr badge and buzzer-beaters. Rewards, goals and achievements never counted periods,
  so the same result pays the same.
- One line changed: an elder's tip "Your legs will thank you in the fourth" now ends "in the last minute".
- Career saves are unchanged (the format isn't stored in a career).
- **Tests.** New `career-format` test: a career game with the default settings shows 1ST HALF, has one halftime,
  ends, records the game, and its rewards match the same result under 4 quarters; a career game with 4 Quarters
  (QUARTER 1-4, one halftime) and with First to 21 also play out. `formats` now expects career to follow Settings
  (practice still 4 quarters).

## 9.0.0: career calendar
Step 1 of the career calendar: the calendar layer and its UI only. No walking world, no new places or characters;
the hub and every activity work as before. It is an in-game calendar, not the real date.

- **The calendar.** A Hijri-style year: Muharram, Safar, Rabi' al-Awwal, Rabi' al-Thani, Jumada al-Ula, Jumada
  al-Thani, Rajab, Sha'ban, Ramadan, Shawwal, Dhul-Qa'dah, Dhul-Hijjah, 30 and 29 days alternating (354 days),
  with a continuous 7-day week. Every Friday is Jumu'ah; Eid al-Fitr (1 Shawwal) and Eid al-Adha (10 Dhul-Hijjah)
  are holidays; all of Ramadan carries an overlay that can sit on any day. Years show from Year 1. Each day is
  `{ d, type, overlay, games[], events[] }` (types GAME, JUMUAH, HOLIDAY, EVENT, FREE; `events` is empty for now).
- **The schedule.** Our games are on Wednesdays and Saturdays, never on a Friday or an Eid, one a day: group games
  1-3, the semifinal, and the final on a Saturday (an old knockout bracket from a v5 save uses the last three days).
  Opponents still come from the bracket, and every game is still played. A stage that ends (champion or out) is
  followed by 7 free days (with their Jumu'ah); the next stage, or the re-entry after a loss, starts after that.
  The stage windows are constants in `CAL_CFG`. A run with no retries: Local Sat 4 Rabi' al-Awwal - Sat 22
  Jumada al-Ula (months 3-5), State Sat 6 Jumada al-Thani - Sat 24 Sha'ban (6-8), National Sat 9 Ramadan -
  Sat 27 Dhul-Qa'dah (9-11, Ramadan inside), World Ummah Cup Sat 11 Dhul-Hijjah - Sat 24 Muharram of Year 2
  (12-1). A new season starts after the break.
- **Continue.** The hub's first item (default focus) is **Continue**, with a tag for what's next (Game today,
  Game, Jumu'ah, Eid). It skips empty days and stops on the next day with a game, Jumu'ah, an Eid or an event; on a
  game day the usual stage intro, scouting report and pregame run. After a game the date moves to the next day.
  **Schedule** (where Bracket was) holds Calendar, Bracket and **Next day** (one day at a time, for later steps).
  Neither ever passes a game. Nothing is lost by skipping. Training, the gym, the office, the shop and the masjid
  stay unlimited; what you did today is counted in `C.cal.done` so a later step can limit it.
- **The strip.** Top right of the hub: today and the next three days, each with weekday, date and month, the
  opponent's crest on a game day, a mosque for Jumu'ah and a star for an Eid. Today is gold; Ramadan days are
  indigo with a RAMADAN tag; an Eid has a gold edge. Phones get wider chips and short month names where the full
  ones don't fit (Rabi' I, Jumada II...); the phone subtitle drops ", Small division" (and shows the season from
  Season 2). Tap the strip, or Schedule › Calendar, for the month view.
- **The month view.** The month as a grid with the same markers, W/L on past games, upcoming games with their
  crest (or a ball when the opponent isn't decided yet), the chosen day's details (round, opponent, result; "After
  Taraweeh" on a Ramadan game day; the break before the next stage), a key, and Back. Arrows move the day (and
  cross months), Q/E change month, Esc goes back; touch: tap a day, the arrows by the title, Back; pad: D-pad,
  LB for the next month, B back.
- **Settings → Game → Career calendar** On/Off. Off: the old hub (Play next game, Bracket) with no dates shown;
  the date still moves quietly to each game's day. The Game group now has 7 settings on desktop (the `phase6` cap
  for a settings group goes from 6 to 7; on touch it stays within 8).
- **Saves.** `C.cal = { d, sched, done, log }`; schema `sv` 4. A save from before 9.0 starts at the beginning of its
  current stage's window (in its season's year), with the schedule built from the bracket: games already played
  in it get their days (and W/L) in the past, and the next game is still ahead. An eliminated bracket gets its
  re-entry after a break, a finished career (World champions) its "World Ummah Cup again", a season that's over
  waits for the new season. Manual saves, the auto save and the saves screen are unchanged.
- Untouched: matches, AI, online, mini games, Barakah Run, the tutorial, Quick Play, and career results, rewards,
  brackets and seeds (cpu-parity unchanged). Salah still uses the real-time adhan.
- **Review.** The month, weekday and holiday names are a flagged section of `docs/review/game-text.csv`
  (`npm run review:export`). `npm run review:calendar` writes `docs/review/img/calendar-strip-<device>.png` and
  `calendar-month-<state>-<device>.png` (desktop, iPhone landscape, 667x300) for a game day, Jumu'ah, Ramadan,
  Eid and a stage break.
- **Tests.** New `calendar` test (month lengths, weekdays, Jumu'ah, Ramadan, the Eids, year rollover; every
  schedule on Wed/Sat, never a Friday or an Eid, in order, finals on Saturday; breaks; Continue skipping to
  Jumu'ah then the game; neither Continue nor Next day passes a game; a whole stage; out in the group then the
  re-entry after the break; counters; v5 knockout, v6 group-stage, World-champion and season-over saves; the
  current save round trip; re-anchoring; the setting Off). New `career-run` bot: new career -> creator ->
  intro -> hub -> Continue only, every game played (CPU vs CPU, our team forced to win) through all four stages
  and the first game of Season 2: the date never goes back, the strip always shows 4 days. The phone audit
  covers the strip and the month view in all five states, the Season 2 hub and the Schedule menu.

## 8.7.1: clip export
- **Share a clip as a video.** The share screen (post-game Share, Barakah Run "Share a highlight") has
  **Make video (V)** next to Save image. It replays the chosen play onto an offscreen 1280x720 canvas at 30 fps:
  a beat on the first frame, real speed, the instant replay's slow motion around the peak, a short hold at the
  end (about 5 s), with the camera following the play. It records with canvas.captureStream + MediaRecorder, in
  the first type the browser supports of MP4 (H.264), WebM VP9, WebM VP8, WebM. No audio, no account, no network.
- While it records (in real time) there's a progress bar and Cancel; then **Share** (the phone's share sheet,
  where sharing a file is supported), **Save** (a download named like `islam-dunk-noor-tomahawk.webm`) and Back.
- The overlay is small: ISLAM DUNK, both team names (custom names go through the word filter) and the score,
  and the play's label. No player names or usernames.
- It never runs during a live match, and each frame swaps the clip's scene in and back out exactly as the still
  card does, so the game state is untouched. Without MediaRecorder or captureStream it says so and offers the
  still image instead.
- A typical clip in Chromium: WebM VP9, about 5.3 s, about 1.2 MB.
- **Tests.** New `clip` test: a seeded CPU game's best play exported (a video Blob, 4-8 s, the match state
  identical before and after, no page errors), refused during a live match, and with MediaRecorder removed it
  falls back to the still image. The phone audit visits the share screen and both result screens.

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
