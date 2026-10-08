# Human review packet

Everything a person should look over for the human review pass. It covers story, dialogue, the sheikh, characters, Barakah Run power-ups, achievements, on-screen reactions, trivia, courts and jerseys.

| File | What's in it | How to review |
|---|---|---|
| `game-text.csv` | Every line of text in the game (about 1,200 rows), with where it lives in the code | Open it in Google Sheets or Excel. Fill in **Keep / Change / Cut**, **Suggested text** and **Notes**. Send it back and the changes go in by row number. |
| `game-text.md` | The same text grouped by section, for reading on GitHub or a phone | Read only. Row numbers match the CSV. |
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
