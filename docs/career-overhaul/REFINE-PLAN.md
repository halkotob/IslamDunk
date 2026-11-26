# Career refinement plan (after the first playtest)

The owner played the career through the start of Chapter 2 and wrote notes on Chapters 0 to 2 and on the career as
a whole. This plan turns those notes, and the decisions settled in three rounds of questions, into seven releases.
Nothing is built until the owner approves this plan.

## The rules every release follows

These go into `SCENES.md` as a **Rules** section before any building starts.

1. **Speakers on screen.** Every line of dialogue is said by someone standing in the scene, in the game's normal
   view: on the court, in the musalla, or in the office. There is no text over a backdrop and no faceless
   cutscene. A line of narration with no speaker is allowed only to set a scene ("The next night...").
2. **Short dialogue.** An introduction is at most 2 lines from the person and 1 from you. A conversation is at most
   4 lines, and a big scene (the team invite, a title) at most 6. No dialogue choices, for now.
3. **UI on the left only.** In the career, menus, buttons, objective boxes and prompts sit on the left side: the
   objective box goes under the Back button, and the gym's bar is a slim column down the left. The top, the right
   and the bottom stay clear for play. What stays where it is: the scoreboard and team names, the callouts
   ("BISMILLAH"), and the clip button. What goes: "this person vs that person" banners in mini games.
4. **The practice gym is home.** Before and after every game, in every chapter, you're in the practice gym with
   the ball. From there you go on to the next game or scene, practise, or use the menu. The lines after a game
   play as soon as you're back in the gym, with the speakers standing near you.
5. **A ready prompt before every game.** League games use their pregame card, with Start and Back to the gym.
   The tutorial game and mini games use a small panel on the left, in that game's own look, with a 1–2 line
   how-to and Start / Not yet.
6. **Only the people who belong on court.** In a walk there are at most two others on the court, and only people
   playing ball. In a drill, only that drill's people.
7. **Your name everywhere.** It shows wherever the game shows you, and characters use it in a handful of key
   lines. "Brother" is never used as a stand-in.
8. **Nothing built until it's built.** The gym and masjid start bare, and each project appears when it's built.

## What the skills say about this plan

- **Onboarding** (`game-design`, `game-design-theory`: "teach through play", "players want to do, not watch"):
  - Playing the pickup game first, with prompts in the left box, teaches the controls by doing.
  - Explaining points and bucks a day later, once you've earned something, puts each explanation next to its
    use.
  - Dialogue caps and walk-up talks keep "watching" short.
- **Difficulty** (`game-ai`; "your game is too hard"):
  - The tutorial game is first to 11 against the easiest CPU, with a catch-up that makes the CPU easier when
    you're behind: it shoots worse, contests less and reacts later.
  - King of the Court ramps a small step per opponent.
  - Both use the CPU levels the career already has, so no new AI is needed, only new settings.
- **The core loop** (`game-design`): practise, then play, then come back to the gym, then spend (stats,
  projects), then practise again. The gym-as-home rule makes this loop visible every time, and the left bar
  puts every part of it one click away.
- **UI** (`game-ui-ux`):
  - One left-anchored column, laid out from the Back button down. It reflows for the phone's larger font, as the
    hub does today.
  - Every new screen has a default focus and works with keys, gamepad and touch.
  - Screens open as a stack: gym → hub screen → settings and back.
- **Blocks** (`physics-tuning`, `game-feel`):
  - The reach toward the ball is a short, capped sideways move during the jump, at the match's fixed step.
  - The block chance scales with how close the hand gets to the ball and how early you jumped, against the
    current curve.
  - A near miss gets a small "fingertips" reaction, so even a far-off block feels like an attempt.
- **Archetypes** (`character-design`: shape language, readable at a glance):
  - Each archetype gets a stat shape no other shares, one small perk, and an icon and colour on the creator
    card, so the five read as different at a glance.
  - Look (cosmetic) and Game (build and archetype) become separate sections of the creator.
- **Visual polish** (`game-designer`):
  - Fades into and out of the gym.
  - Ready panels in each game's colours.
  - The bare-to-built gym as the visible reward.
  - No faceless frames anywhere.

## The new order of Chapters 0 and 1

Chapters keep the content they have now; only the order changes. Scene IDs are renumbered to the new order.

**Chapter 0: Introduction** (the first night)
1. **C0.1** The closing salams on black. Unchanged.
2. **C0.2** The musalla: Imam Dawud, short.
3. **C0.3** You walk out to the gym, where Sh. Saleem, Ammo Jamil and Ilyas are shooting at one hoop. You ask Sh.
   Saleem if you can play, and he says yes.
4. **C0.4** The ready prompt, then **the tutorial game**: you and Sh. Saleem against Ammo Jamil and Ilyas, first to
   11, very easy, with the controls taught by prompts in the left box. There's no rewards card after it.
5. **C0.5** On the court: the three introduce themselves (one line each; Ammo Jamil's "nineteen years without the
   league" is his line) and invite you to practice tomorrow. Chapter 1 follows.

**Chapter 1: Making the team** (the next day)
1. **C1.1 Meet the gym.**
   - Your objectives: make 3 shots, make a layup, grab a rebound, sprint.
   - Ilyas and Ammo Jamil are on court with a ball. Ilyas has you do the cone dribble and explains Barakah Points
     and upgrading stats. Ammo Jamil has you shoot free throws and explains Halal Bucks and masjid projects
     (cosmetic). During each drill, only you and whoever explained it are on court.
   - Sh. Saleem stands by the office door and explains drills and practising every day.
   - When all of it is done, the box reads "Go to the musalla" with an arrow, and walking through the door moves
     the story on.
2. **C1.2 The musalla.**
   - Introductions, 2 lines each at most:
     - Ustath Karim says Halal Bucks build things here: a new carpet, a chandelier, calligraphy.
     - Imam Dawud suggests praying two rak'ahs at the mihrab, shown as text, which gives the salah bonus.
     - Qari Anas suggests reading from the mushaf.
     - The Mufti and the Hafiz say hello.
   - Your objectives: meet them, pray, read.
   - Then Musa says "Lightning, in the gym, now!" You walk out to the ready prompt.
3. **C1.3 Lightning** in the practice gym: no "who's shooting" list, only a small "players left" count on the
   left. Afterwards Sh. Saleem walks onto the court and asks you to his office.
4. **C1.4 The office.** Four lines at most, with heart. Al-Amanah is small, the gym doubles as the overflow
   musalla, and the weekend school is turning families away: "We need you. Help us win, and help this masjid and
   this community grow." Then: "Come outside with me."
5. **C1.5** On the court, Sh. Saleem tells everyone to play King of the Court for their spots.
6. **C1.6 King of the Court** in the practice gym. The opponents are Musa, then Hafiz Zubair, then Qari Anas, each a
   little harder and all of them easy. Only a streak counter (up to 3) shows, on the left.
7. **C1.7** On the court, everyone congratulates you and Sh. Saleem invites you to the team, 6 lines at most.
   Chapter 2 follows.

**Cut:** the separate Ammo Jamil and Ilyas scenes (the old C1.3 and C1.4), the "A full gym" scene, and every
faceless lead-in.

**Old saves:** a save in Chapter 0 or 1 restarts at the start of its chapter. A save in Chapter 2 or later keeps
its place.

## The releases

All work is on one branch, `claude/career-refine`, off `main`, with one GitHub issue per release and a commit and
push for each. Each release runs only the tests it touches. The full suite runs once at the end, then the owner
plays it, then there's one pull request into `main`.

### 1. Welcome and creator (9.30.0)
- **Welcome screen:** "New career" opens a short welcome. It says what the career is and what the next screen
  does, and asks your name: typed on a computer, on-screen keys on a phone. A name is required.
- **The creator** gets two separate sections:
  - **Look:** face, hair, kit. Cosmetic only.
  - **Game:** the build and the archetype, which change stats. Each archetype card shows its strengths, its perk
    and its icon.
- **Distinct archetypes:** no two share a plus, and each has one small perk, career games only and your player
  only:
  - Sharpshooter: a wider timing window
  - Lockdown: a longer reach on steals and blocks
  - Playmaker: faster passes
  - Rim Runner: dunks from further out
  - Glue Guy: wins more loose balls and rebounds
- **Your name everywhere:** no "Brother" anywhere, and a few key lines use the name.
- **Files:** `career-screens.js` (the creator), a new `story/story-welcome.js`, `splash-stats.js` (`ARCHETYPES`),
  the archetype perks in the career match setup.
- **Checks:** a new test types a name on a computer and taps it on a phone, checks the two sections, the five
  distinct archetypes and their perks (only in the career), and that the name appears in the journal and the
  credits. Plus the existing creator and build tests.

### 2. The gym loop (9.31.0)
- **The gym is home:**
  - After every game: the final score, then from Chapter 2 a short rewards card with Share → Make video → Keep in
    My clips, then a fade to the gym, where the reaction lines play with the speakers standing near you.
  - The text-box-over-a-backdrop screen is removed. The lines before a game are said by your teammate when you
    talk to him.
- **The left bar:** Next (it glows when something is waiting), Drills, Musalla, Office, Upgrade, Menu. The
  objective box sits under the Back button. The old bottom shortcut bar goes.
- **Next:** your teammate, or whoever starts the next scene, has the marker. Talking to him or pressing Next
  starts it.
- **The hub screen is now the full menu**, opened from Menu or with Esc: back to the gym, Masjid projects and
  Outside, My Player (upgrade, look, journal, milestones, league & stats), My clips, Settings, Save and load, Quit
  to title. The chapter name and the fundraiser meter show here and on the left bar.
- **Ready prompts** before every game, as in rule 5.
- **The dialogue caps** applied to every scene in Chapters 2 to 5 and the post-story: every line rewritten to fit.
- **Files:** `story-hub.js` (the hub screen as a menu), `story-walk.js` (the left bar, objective box and arrival
  lines), `story-runner.js` (the faceless screen removed), `story-league.js` (pregame lines, the return),
  `story-play.js` (ready prompts), `story-data.js` (rewritten lines), the career's post-game.
- **Checks:** a new test plays a league game and comes back to the gym, with the reaction lines spoken by people
  on screen. It also checks Next and the teammate both start the next game, that no story line is drawn without
  its speaker on screen (a check over every scene), and that the bar and menu open what they say. Plus
  `story-*`, the Studio and phone-audit tests.

### 3. Chapter 0 rebuilt (9.32.0)
- **The new order:** C0.1 to C0.5 as above, with Imam Dawud cut to a few lines.
- **The tutorial game:** first to 11, the easiest CPU and a catch-up when you're behind, with the control prompts
  in the left box.
- **The gym starts bare:** no water cooler, so it becomes a project. Few people on court. You can't hold the
  ball until a scene says you can.
- **Saves:** old Chapter 0 saves restart at C0.1.
- **Files:** `story-data.js`, `story-play.js` (the tutorial game), `story-runner.js` (the start with nothing built),
  `story-walk.js` (people on court, the ball).
- **Checks:** `story-ch0` rewritten. The bot plays the new order, loses the tutorial game once to check the catch-up
  makes the CPU easier, then wins. It checks that nothing is built and there's no rewards card.

### 4. Chapter 1 rebuilt (9.33.0)
- **The new order:** C1.1 to C1.7 as above, including the two drills in Meet the gym, the musalla objectives,
  the walk-out to Lightning and King of the Court, and the office talk.
- **Mini game screens cleaned up:** Lightning's list and King of the Court's banner go. Only the small counters
  stay, on the left. Drill instructions move to the objective box.
- **Lightning and King of the Court** in the practice gym. King of the Court gets its three new opponents and a
  gentle ramp.
- **Only the drill's people** on court during a drill.
- **Saves:** old Chapter 1 saves restart at C1.1.
- **Files:** `story-data.js`, `story-walk.js`, `story-play.js`, `v8-kotc.js` (the HUD and the career's
  opponents), `mini-games.js` (Lightning's HUD in the career), `gym-drills.js` (who's on court).
- **Checks:** `story-ch1` rewritten. The bot plays C1.1 to C1.7 and loses King of the Court once. It checks the
  drills explain points and bucks, the people on court in each drill, and the cleared HUD. Phone and desktop
  screenshots of each step.

### 5. Chapter 2's opening (9.34.0)
- **The first practice:** Sh. Saleem explains the loop: between every game you come here to practise, earn points
  for your stats and bucks for the masjid, and pray for a boost before the next game. "Let's start the season off
  right."
- **Shorter talk after the drills.** Nobody agrees with everyone; each brother says something different.
- **"Why we play"** happens in Sh. Saleem's office, with only him there, kept short.
- **Picking a teammate:** you go out and talk to any brother, which opens the pick screen. The seven are listed on
  the left; on the right are the selected brother's nine stats next to yours, and your chemistry. Your teammate's
  last line: "Come talk to me when you're ready for the first game."
- **Between games** you're always back in the gym (from release 2).
- **Files:** `story-data.js`, `story-league.js` (the pick screen), `story-walk.js`.
- **Checks:** `story-ch2` updated for the new opening and the new pick screen (with its stats comparison). The bot
  still wins the league and loses a semifinal on the way.

### 6. Blocks reach for the ball (9.35.0), in every mode
- **The reach:** pressing jump to block lunges toward the ball: a short sideways move during the jump, capped,
  from any angle, including from behind or the side.
- **The chance:** it rises with how close the hand gets to the ball and how well-timed the jump was. A far-off
  block can come close but rarely lands; a near miss gets a "fingertips" reaction.
- **Tuning:** against today's block rates, so blocks become more reachable without becoming automatic.
- **Files:** `src/sim/v98-review.js` (the block chance), the jump and the block reach in the player update, the
  CPU's blocks (the same rule).
- **Checks:** a new test for reach and chance from in front, the side, behind and far off. A seeded set of CPU
  games compares block rates before and after (the target is a modest rise). The match and online tests run,
  since this changes the engine.

### 7. Chapters 3 to 5 under the new rules (9.36.0)
- **Owner review first:** after the owner plays Chapters 3 to 5, their notes are applied the same way.
- **Already covered by release 2:** the speakers-on-screen rule, the length caps and the gym-as-home loop.
- **Files:** depend on the notes.
- **Checks:** `story-ch3`, `-ch4`, `-ch5` and `story-post` updated.

### Then
The full `npm test`, the owner's playthrough, and one pull request into `main`.

## Open, for later
- The left-side UI rule beyond the career (Quick Play, online and mini games outside the career) is a later step,
  once the career version is liked.
- Dialogue choices may come back after Chapter 0.
