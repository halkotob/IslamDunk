# Career overhaul: scene list

The scene-by-scene story of the new career. Every scene has an ID; code, saves, tests and the Journal refer to
scenes by ID. **Kinds:** `scene` (story, cinema-style), `walk` (free roam: talk to people, use props),
`play` (a real match or mini game with a result), `drill` (gym practice), `choice` (the player picks something
that changes what follows). **Stakes** on a game sets its pregame scene's tone: `opener`, `regular`,
`must-win`, `final`.

The beats here are fixed. The dialogue is yours to write: short lines (one or two per bubble), warm, funny where it
fits, Islamic terms used accurately and respectfully. The user edits lines after each release.

## Cast

New characters, written for this story. The old career regulars (Khalil, Nasser, Tariq, Uncle Mahmoud, Uncle
Rafiq, Uncle Siddiq, Jalal) are out of the story; they may appear only as unnamed background faces.

| Who | Type | Role on court | Standout stats | Arc |
|---|---|---|---|---|
| The Brother | the player | grows as you build him | (player's choice) | new in town; finds a community |
| Sh. Saleem | Sheikh (existing look and name) | floor general | passing, clutch | mentor; fundraises for a school wing for the kids |
| Ammo Jamil | Ammo | enforcer | defense, hustle | hates losing; learns to be proud of his son for more than wins |
| Ilyas | Brother, Ammo Jamil's son | quick guard | speed, stealing | wants to impress his dad; finds his own game |
| Ustath Karim | Ustath, teaches the weekend school | shooter | shooting, clutch | the kids the school wing is for are his students |
| Qari Anas | Qari | big man | dunking, defense | gentle giant |
| Imam Dawud | Imam, leads Isha in the opener | old-head playmaker | passing, stamina | the elder who has seen it all; runs the chai table |
| Musa | Brother | high-flyer | speed, dunking | a new Muslim, the other new face beside you |

**Extras:** a Mufti and a Hafiz in the musalla; uncles and brothers in the gym and stands.
**Rival:** Masjid Al-Furqan (an existing team), captain **Rayyan**. Met in the masjid league, again in the state
semifinal, again at Nationals.

**Standout stats:** each of the seven teammates is in the **top two of the seven** in both of his standout stats.
The player can grow past any of them. Stats: speed `spd`, shooting `sht`, dunking `dnk`, defense `def`,
stealing `stl`, stamina `sta`, passing `pas`, hustle `hus`, clutch `clu`.

**Teammate pick + chemistry:** before each game (where the scene allows it) the player picks one of the seven as
his 2v2 partner. Chemistry grows with the partner you play with; your highest-chemistry teammate gets extra story
lines in the scenes he is in.

## Through-lines

- **Brotherhood:** the player goes from stranger to brother. Every chapter ends with him more rooted.
- **Father and son:** Ammo Jamil and Ilyas bicker in Chapter 0, work through it over the seasons, and make peace
  by the National title.
- **The fundraiser:** Sh. Saleem tells the team why they play in Chapter 2: a school wing for the kids.
  Wins and events raise money (the fundraiser meter on the hub). The masjid visibly grows (masjid projects) after
  each title; the school wing opens at the National title.

## Rules (v9.30, after the first playtest: see REFINE-PLAN.md)

1. **Speakers on screen.** Every line is said by someone standing in the scene, in the game's normal view (court,
   musalla, office). No text over a backdrop, no faceless cutscene. A narration line with no speaker only sets a
   scene ("The next night...").
2. **Short dialogue.** An introduction: at most 2 lines from the person and 1 from you. A conversation: at most 4
   lines. A big scene (the team invite, a title): at most 6. No dialogue choices for now.
3. **UI on the left only.** In the career, menus, buttons, objective boxes and prompts sit on the left; the
   objective box is under the Back button. The scoreboard and team names, the callouts and the clip button stay
   where they are. No "this person vs that person" banners in mini games.
4. **The practice gym is home.** Before and after every game, in every chapter, you are in the practice gym with
   the ball. The lines after a game play when you are back, with the speakers standing near you.
5. **A ready prompt before every game.** League games: the pregame card, Start and Back to the gym. The tutorial
   game and mini games: a small panel on the left in that game's look, 1-2 lines of how to play, Start and Not yet.
6. **Only the people who belong on court.** In a walk, at most two others on the court, playing ball. In a
   drill, only that drill's people.
7. **Your name everywhere.** Never "Brother" as a stand-in.
8. **Nothing until it is built.** The gym and masjid start bare.

## Checkpoints

Each tournament starts at a **checkpoint**: C2.4, C3.2, C4.1, C5.1. A loss that ends a run (out of the group,
out of the playoffs, out of a knockout) plays a short **next season** scene and returns to that chapter's
checkpoint. Earned stats, cosmetics, Halal Bucks and the fundraiser total carry over. One-time scenes before the
checkpoint (such as C3.1) don't replay. Retry scenes (C0.4, C1.6) replay the game until it is won.

---

## Chapter 0: Introduction (the first night)

| ID | Kind | Beat |
|---|---|---|
| C0.1 | scene | Black screen. Text fades in and out: "As-salamu alaykum wa rahmatullah" (right), then again (left): the closing salams of Isha. |
| C0.2 | walk | The musalla just after Isha. Walk up to Imam Dawud: a short welcome, and the young ones play in the gym. (The prayer itself is never shown.) |
| C0.3 | walk | The gym: Sh. Saleem, Ammo Jamil and Ilyas are shooting at one hoop. You ask Sh. Saleem if you can play; he says yes. |
| C0.4 | play | **The tutorial game:** you and Sh. Saleem vs Ammo Jamil and Ilyas, first to 11, the easiest CPU, easier still when you're behind. The controls are taught by prompts in the left box. Retry until won. No rewards card. |
| C0.5 | scene | On the court: the three introduce themselves (Ammo Jamil: nineteen years without the league) and invite you to practice tomorrow. |

## Chapter 1: Making the team (the next day)

| ID | Kind | Beat |
|---|---|---|
| C1.1 | walk | **Meet the gym.** Your objectives: make 3 shots, a layup, grab a rebound, sprint. Ilyas has you do the cone dribble and explains Barakah Points and stats; Ammo Jamil has you shoot free throws and explains Halal Bucks and masjid projects (cosmetic). Sh. Saleem, by the office door, explains drills and practising every day. Done: "Go to the musalla"; walk through the door. |
| C1.2 | walk | **The musalla.** Short introductions: Ustath Karim (bucks build things here: a carpet, a chandelier, calligraphy), Imam Dawud (pray two rak'ahs at the mihrab), Qari Anas (read from the mushaf), the Mufti, the Hafiz. Objectives: meet them, pray, read. Then Musa: "Lightning, in the gym, now!" |
| C1.3 | play | **Lightning** in the practice gym. After it, Sh. Saleem walks on and asks you to his office. |
| C1.4 | scene | **The office**, four lines with heart: the masjid is small, the gym is the overflow musalla, the weekend school turns families away. "We need you. Help us win, and help this masjid and this community grow." Then: "Come outside with me." |
| C1.5 | scene | On the court, Sh. Saleem tells everyone to play King of the Court for their spots. |
| C1.6 | play | **King of the Court** in the practice gym: Musa, then Hafiz Zubair, then Qari Anas, each a little harder, all easy. Only a streak counter, on the left. Retry until won. |
| C1.7 | scene | On the court, everyone congratulates you and Sh. Saleem invites you to the team. **The career begins.** |

## Chapter 2: Masjid league (stage: Local)

Structure: a group stage of 3 games (the existing two pools of four; top two advance), then a semifinal and a
final. Al-Furqan is in the field.

| ID | Kind | Beat |
|---|---|---|
| C2.1 | drill | First normal practice: at least 3 drills. |
| C2.2 | walk | Character stories: more time with Ilyas and with Ammo Jamil. |
| C2.3 | scene | Prayer, then Sh. Saleem's office: **why they play**. The school wing fundraiser starts; the fundraiser meter appears on the hub. |
| C2.4 | scene | **Checkpoint.** Season hype; how the league works (group stage, then playoffs). |
| C2.5 | choice | **Pick your teammate** by his two standout stats. A short scene with the one you pick. |
| C2.6 | play | Group game 1 (stakes: opener). Separate win and loss scenes. |
| C2.7 | choice | Get ready for the next game; option to change teammate. |
| C2.8 | play | Group game 2 (stakes: regular). Win or loss scene; neither changes the story. |
| C2.9 | walk | Mandatory practice day: talk to the main characters. |
| C2.10 | play | **Lights out:** during practice the power goes (the gym's light switch prop). Sh. Saleem calls a pickup game in the dark: a normal 2v2 where only a glow around each player and the ball is visible. The lights come back on at a set score or time. |
| C2.11 | scene | New day: the final push before the last group game. |
| C2.12 | play | Group game 3 (stakes: must-win when the group is on the line, otherwise regular). |
| C2.13 | scene | Group result. Through: talk about the playoffs. Out: next season, back to C2.4. |
| C2.14 | play | Semifinal (stakes: must-win). Loss: next season, back to C2.4. |
| C2.15 | play | Final (stakes: final). Loss: next season, back to C2.4. |
| C2.16 | scene | **Masjid league champions:** celebration, unlocks, the fundraiser's first total, a masjid project completed. |

## Chapter 3: State league (stage: State)

Structure: 9 teams, each plays the other eight once (8 games). The top four go to the semifinals (1 vs 4,
2 vs 3), then the final. Al-Furqan is always in the field. A unique event every 2 games until the playoffs.

| ID | Kind | Beat |
|---|---|---|
| C3.1 | walk | Back at the gym: what's new (more people, the upgrades the masjid league title paid for). |
| C3.2 | scene | **Checkpoint.** Catch up with the characters; hype for playing teams from across the state. Pick your teammate. |
| C3.3 | play | Game 1 (opener). |
| C3.4 | drill | Normal practice is available. |
| C3.5 | play | Game 2. |
| C3.6 | play | **Team bonding:** HORSE against your teammates with the word **CHAI**. The loser makes the chai (a short scene of him doing it). |
| C3.7 | play | Game 3. |
| C3.8 | play | Game 4. |
| C3.9 | scene | Sh. Saleem throws a fundraiser and sells tickets to an **all-star game, dunks only**. |
| C3.10 | play | **All-star game:** a 2v2 exhibition where only dunks score (jumpers and layups count nothing). A crowd meter (the ticket sales) fills with every big dunk. |
| C3.11 | scene | The fundraiser's outcome (scaled by the dunks landed); halfway through the season. |
| C3.12 | play | Game 5. |
| C3.13 | play | Game 6. |
| C3.14 | choice | **Your teammate leaves for Hajj:** pick a replacement. |
| C3.15 | play | Game 7. |
| C3.16 | scene | Hype before the last regular-season game. |
| C3.17 | play | Game 8 (stakes: must-win if the top four is on the line). |
| C3.18 | scene | Season result. Top four: the semifinal draw (Al-Furqan and Rayyan as the rivals), and **the teammate returns from Hajj** for the playoffs. Out: next season, back to C3.2. |
| C3.19 | play | Semifinal (must-win). Loss: next season, back to C3.2. |
| C3.20 | scene | Prep for the final. |
| C3.21 | play | Final (final). Loss: next season, back to C3.2. |
| C3.22 | scene | **State champions:** celebration, upgrades, donations, a story beat for every main character. |
| C3.23 | scene | Invitation to the National tournament. |

## Chapter 4: National tournament (stage: National)

Structure: a 16-team knockout (the 8 existing masjid teams plus 8 generated ones). Al-Furqan is in the field.
Any loss: next season, back to C4.1.

| ID | Kind | Beat |
|---|---|---|
| C4.1 | scene | **Checkpoint.** Renew the intention; focus on representing the state. Pick your teammate. |
| C4.2 | play | Round of 16 (opener). |
| C4.3 | scene | React to the result. |
| C4.4 | play | Quarterfinal (must-win). |
| C4.5 | scene | React to making the semifinals. |
| C4.6 | play | Semifinal (must-win). |
| C4.7 | scene | Celebrate and prepare for the final. |
| C4.8 | play | Final (final). |
| C4.9 | scene | **National champions:** the fundraiser is delivered; the school wing opens and the community and masjid benefit. Ammo Jamil and Ilyas make peace. Wrap up story threads. |
| C4.10 | scene | Invitation to the Ummah Cup. |

## Chapter 5: Ummah Cup (stage: World)

Structure: King of the Court decides the draw, then quarterfinal, semifinal, final. The field is masjid teams from
other countries (generated, like the National extras). Any loss after the draw: next season, back to C5.1.

| ID | Kind | Beat |
|---|---|---|
| C5.1 | scene | **Checkpoint.** Set the intention to face the world; the cup's rules and the draw explained. |
| C5.2 | play | **King of the Court for the draw:** a better finish draws an easier quarterfinal opponent. Losing it doesn't knock you out. |
| C5.3 | scene | Quarterfinals set; prepare. Pick your teammate. |
| C5.4 | play | Quarterfinal (must-win). |
| C5.5 | scene | Celebrate; prepare for the semifinal. |
| C5.6 | play | Semifinal (must-win). |
| C5.7 | scene | Rejoice: one of the top two. Prepare for the final. |
| C5.8 | play | Final (final). |
| C5.9 | scene | Lift the Ummah Cup on the grandest stage. |
| C5.10 | scene | Bring the cup home and inspire the next generation. |
| C5.11 | scene | **The End** (credits). |

## After the story: milestones, moments, 100%

| ID | Kind | Beat |
|---|---|---|
| P.1 | walk | The career continues after The End: replay any tournament, keep playing seasons. |
| P.2 | reference | **Milestones:** about 20 feats across the career (stats, titles, each teammate's chemistry maxed, every event played, and so on). You write the list. |
| P.3 | scene | **Moments:** each milestone unlocks a short scene with the character it concerns. |
| P.4 | scene | **100% complete:** every milestone done unlocks the biggest prizes and a final scene. |

**Prizes** are cosmetic: they change how the gym, masjid and player look. Each one is **usable in the world** the
way the water cooler is (`src/career/masjid-props.js`): walk up, press, a short animation, a sound and a line.
Props in the **practice gym** may have a small gym-only effect (like the cooler's turbo refill). Props in the
**masjid and musalla** are flavor only. Nothing carries into a match.
