# Career overhaul: scene list

The scene-by-scene story for the new career, from the "Baallerz" outline. Every scene has an ID; code, saves,
tests and the Journal refer to scenes by ID. **Kinds:** `scene` (story, cinema-style), `walk` (free roam: talk to
people, things to find), `play` (a real match or mini game with a result), `drill` (gym practice),
`choice` (the player picks something that changes what follows). **Stakes** on a game sets its pregame scene's
tone: `opener`, `regular`, `must-win`, `final`.

Names in _italics_ are placeholders the user may rename (see the decision table in PROMPT.md).

## Cast

| Role | Who | Arc |
|---|---|---|
| The Brother | the player | new in town; finds a community |
| Sheikh | Sh. Saleem (existing) | mentor; fundraising for a school wing for the kids |
| Ammo | _Ammo Haytham_ (new) | hates losing; needs this league; learns to be proud of his son for more than wins |
| The son | _Zayd_ (new), Ammo's son | wants to impress his dad; finds his own game |
| Existing brothers | Khalil, Nasser, Tariq, Uncle Mahmoud, Uncle Rafiq, Uncle Siddiq, Jalal (rival) | keep their current personalities |
| New community | Imam, Mufti, Ustath, Hafiz, Qari, Hajji (one new character each) | each gets 1 to 3 beats; some are pickable teammates |

Every pickable teammate has **two standout stats** better than everyone else's in those stats, the player
included, so picking a teammate means picking the two skills you want beside you. The teammate you play with the
most gives the most story (the existing partner + chemistry system).

## Through-lines

- **Brotherhood:** the player goes from stranger to brother. Every chapter ends with him more rooted.
- **Father and son:** Ammo and Zayd argue in Chapter 0, work it out through the hard work of the seasons, and
  make peace by the National title.
- **The fundraiser:** Sh. Saleem tells the team why they play in Chapter 2 (a school wing for the kids). Wins and
  events raise money; the masjid visibly grows (masjid projects) after each title.
- **The masjid grows:** more people in the gym and musalla each chapter, upgrades seen in the world.

---

## Chapter 0: Introduction

| ID | Kind | Beat |
|---|---|---|
| C0.1 | scene | Outside the masjid at night; the Brother arrives for his first Isha. |
| C0.2 | scene | He walks in and joins the prayer (shown as calm arrival and lining up in the musalla; the prayer itself is not shown). |
| C0.3 | walk | After prayer he finds the gym; brothers are shooting around. He asks to join. |
| C0.4 | drill | **Tutorial:** shoot around and learn the controls on the real gym floor. |
| C0.5 | play | **Pickup game:** the Brother with Zayd vs Ammo and Sh. Saleem (or the closest pairing that keeps the father and son on opposite teams). Win or lose, the story continues. |
| C0.6 | scene | Zayd and Ammo compliment his game and invite him back tomorrow; Sh. Saleem agrees and praises his teamwork. First look at the father and son: they bicker, frustrated by the loss. Sh. Saleem shares a short piece of wisdom. |

## Chapter 1: Making the team

| ID | Kind | Beat |
|---|---|---|
| C1.1 | scene | Next day, the gym is full of characters old and new. Sh. Saleem welcomes him: meet everyone, then come to the office. |
| C1.2 | walk | Talk to people around the gym. Short side activities introduce career features (shoot around, a drill station, the stat sheet with Tariq, chai with Uncle Siddiq). |
| C1.3 | walk | Ammo: he hates losing and needs to win the league this year. |
| C1.4 | walk | Zayd: he wants to impress his dad with a win. |
| C1.5 | walk | The musalla: meet the people inside (Qari, Hafiz, uncles). The walk ends once everyone in the gym and musalla has been met. |
| C1.6 | play | Called outside for **Lightning** with everyone (existing mini game). |
| C1.7 | scene | Sh. Saleem's office: he introduces himself and the community properly. |
| C1.8 | play | Outside, he sets up **King of the Court** to earn a spot (existing KOTC mode). Win: C1.9. Lose: retry; on the second loss, **C1.8b**. |
| C1.8b | scene | Everyone saw how good he is; then a player is injured and a spot opens. Continue to C1.9. |
| C1.9 | scene | Everyone agrees: he joins the team to help win the league. **Career begins.** |

## Chapter 2: Masjid league (stage: Local)

Structure: group stage of 3 games, then semifinal and final (the existing Local stage format).

| ID | Kind | Beat |
|---|---|---|
| C2.1 | drill | First normal practice: at least 3 drills. |
| C2.2 | walk | Character stories: more time with Zayd and with Ammo. |
| C2.3 | scene | Salah, then Sh. Saleem's office: **why they play** (the school wing fundraiser starts). |
| C2.4 | scene | Season hype; how the league works (group stage then playoffs). |
| C2.5 | choice | **Pick your teammate** by their two standout stats. A short scene with the one you pick. |
| C2.6 | play | Game 1 (stakes: opener). Separate win and loss scenes. |
| C2.7 | choice | Get ready for the next game; option to change teammate. |
| C2.8 | play | Game 2 (stakes: regular). Win or loss scene; neither changes the story. |
| C2.9 | walk | Mandatory practice day: talk to the main characters. |
| C2.10 | play | **Lights out:** during practice the power goes; Sh. Saleem calls a special drill, a pickup game in the dark (new mini game, or a dark variant of an existing one such as HORSE). The lights come back on at the end. |
| C2.11 | scene | New day: the final push before the last group game. |
| C2.12 | play | Game 3 (stakes: must-win when the group is on the line, otherwise regular). |
| C2.13 | scene | Group result. Through: talk about the playoffs. Out: **season loop** (see PROMPT.md) back to C2.4. |
| C2.14 | play | Semifinal (stakes: must-win). Loss: season loop. |
| C2.15 | play | Final (stakes: final). Loss: season loop. |
| C2.16 | scene | **Champions:** celebration, unlocks, the fundraiser's first total, new intentions. |

## Chapter 3: State league (stage: State)

Structure: 8 regular-season games, then semifinal and final. A unique event every 2 games until the playoffs.

| ID | Kind | Beat |
|---|---|---|
| C3.1 | walk | Back at the gym: what's new (more people, the upgrades the Local title paid for). |
| C3.2 | scene | Catch up with the characters; hype for playing teams from across the state. |
| C3.3 | play | Game 1 (opener). |
| C3.4 | drill | Normal practice is available. |
| C3.5 | play | Game 2. |
| C3.6 | play | **Team bonding:** a special drill at the masjid (a mini game or a wacky drill). |
| C3.7 | play | Game 3. |
| C3.8 | play | Game 4. |
| C3.9 | scene | Sh. Saleem throws a fundraiser and sells tickets to an **all-star game (dunks only)**. |
| C3.10 | play | **All-star game:** dunks only (new mode built on the dunk system). |
| C3.11 | scene | The fundraiser's outcome; halfway through the season. |
| C3.12 | play | Game 5. |
| C3.13 | play | Game 6. |
| C3.14 | choice | **Your teammate is injured:** pick a replacement. |
| C3.15 | play | Game 7. |
| C3.16 | scene | Hype before the last regular-season game. |
| C3.17 | play | Game 8 (stakes: must-win if the playoffs are on the line). |
| C3.18 | scene | Season result. Through: the semifinal draw and the rival; **the injured teammate returns** for the playoffs. Out: season loop to C3.2. |
| C3.19 | play | Semifinal (must-win). Loss: season loop. |
| C3.20 | scene | Prep for the final. |
| C3.21 | play | Final (final). Loss: season loop. |
| C3.22 | scene | **State champions:** celebration, upgrades, donations, a story beat for every main character. |
| C3.23 | scene | Invitation to the National tournament. |

## Chapter 4: National tournament (stage: National)

Structure: single-elimination knockout. A loss is a season loop back to C4.1.

| ID | Kind | Beat |
|---|---|---|
| C4.1 | scene | Renew the intention; focus on representing the state. |
| C4.2 | play | Round of 16. |
| C4.3 | scene | React to the result. |
| C4.4 | play | Quarterfinal. |
| C4.5 | scene | React to making the semifinals. |
| C4.6 | play | Semifinal. |
| C4.7 | scene | Celebrate and prepare for the final. |
| C4.8 | play | Final. |
| C4.9 | scene | **National champions:** the fundraiser is delivered; watch the community and masjid benefit (the school wing opens). Wrap up story threads (Ammo and Zayd make peace here). |
| C4.10 | scene | Invitation to the Ummah Cup. |

## Chapter 5: Ummah Cup (stage: World)

| ID | Kind | Beat |
|---|---|---|
| C5.1 | scene | Set the intention to face the world; the cup's rules and the draw explained. |
| C5.2 | play | **King of the Court for the draw:** your finish decides your quarterfinal opponent (a better finish draws an easier one). |
| C5.3 | scene | Quarterfinals set; prepare. |
| C5.4 | play | Quarterfinal. Loss: season loop to C5.1. |
| C5.5 | scene | Celebrate; prepare for the semifinal. |
| C5.6 | play | Semifinal. Loss: season loop. |
| C5.7 | scene | Rejoice: one of the top two. Prepare for the final. |
| C5.8 | play | Final. Loss: season loop. |
| C5.9 | scene | Lift the Ummah Cup on the grandest stage. |
| C5.10 | scene | Bring the cup home and inspire the next generation. |
| C5.11 | scene | **The End** (credits). |

## After the story: milestones, moments, 100%

| ID | Kind | Beat |
|---|---|---|
| P.1 | walk | Post-story career continues: replay any stage, keep playing seasons. |
| P.2 | reference | **Milestones:** a checklist of feats across the career (stats, titles, every teammate's story finished, every event played, and so on). |
| P.3 | scene | **Moments:** reaching a milestone unlocks a short scene (a "moment") with the character it concerns. |
| P.4 | scene | **100% complete:** every milestone done unlocks the biggest prizes (cosmetic only) and a final scene. |
