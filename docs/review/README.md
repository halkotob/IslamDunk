# Human review packet

Everything a person should look over for the human review pass. It covers story, dialogue, the sheikh, characters, Barakah Run power-ups, achievements, on-screen reactions, trivia, courts and jerseys.

There are two ways to review, and both work. Use whichever suits you, or mix them.

1. **In the game:** open it with `?review=1` (for example `https://halkotob.github.io/IslamDunk/?review=1`). The title gets a **Review** entry:
   - **Scenes:** every story scene, the sheikh's talks and lessons, the niyyah question, partner scenes and the musalla talks. Play any of them exactly as a player sees them, and mark each line with 1 Keep, 2 Change, 3 Cut or N for a note.
   - **Feel checklist:** 15 quick questions about how the game plays, rated 1 to 5.
   - **Export:** downloads `islamdunk-review.csv` with your marks and answers. Send it back.

   Marks stay in your browser between sittings. Reviewing never touches your career save.
2. **In a spreadsheet:** `game-text.csv`, below.

| File | What's in it | How to review |
|---|---|---|
| `game-text.csv` | Every line of player-facing text in the game (about 3,000 rows), with where it lives in the code. Lines added since the first packet are marked **new** in their own column, so you can filter to just those. | Open it in Google Sheets or Excel. Fill in **Keep / Change / Cut**, **Suggested text** and **Notes**. Send it back and the changes go in by matching the text. |
| `feel-checklist.md` | The 15 feel questions, for answering outside the game | Fill in the table. |
| `game-text.md` | The same text grouped by section, for reading on GitHub or a phone | Read only. Row numbers match the CSV. |

The text list is regenerated from the game with `npm run review:export`, so it always matches the current version. Marks already in the CSV are kept when it's regenerated.
| `gallery.html` + `img/` | Every court (20) and every team kit (8) as they look in the game | Open `gallery.html` in a browser and note what to keep, change or drop. |

Sections in the text export:
- story and dialogue, with the speaker for each line;
- the sheikh;
- characters and teams;
- Barakah Run power-ups and badges;
- achievements;
- unlocks and fun modes;
- on-screen reactions (callouts);
- courts;
- trivia questions and explanations;
- the callouts and messages written directly in the code.

Things worth a specific look:
- **Adab and accuracy.** Any line, joke or trivia answer that could be wrong or could land badly.
- **Voice.** Does each character sound like himself (Sh. Saleem, Uncle Mahmoud, Khalil, Nasser, Tariq, the sheikh)?
- **Reactions.** Are the callouts fun, varied and not repetitive?
- **Achievements.** Are the names and descriptions clear, and is each one reachable?
- **Power-ups.** Is it clear what each one does from its name and line?

To try any part of the game quickly while reviewing, open it with `?dev=1`. This adds a DEV tab on the right with the following options:
- jump to any career stage, round or season;
- win or lose the next game;
- give points;
- unlock everything for this tab;
- launch any mode;
- change difficulty;
- run the game at 2x or 4x.
