# Human review packet

Everything a person should look over for the human review pass. It covers story, dialogue, the sheikh, characters, Barakah Run power-ups, achievements, on-screen reactions, trivia, courts and jerseys.

## Review Studio (recommended)

The Review Studio is a separate web tool for reviewing the game without playing it. It shows every item as it ships,
because the real game draws it, and records a verdict for each one: **Keep**, **Fix** or **Delete**, with a comment and,
for text, suggested replacement wording. It never changes the game. Verdicts stay in the reviewer's browser until
exported as CSV, and **Delete only means "recommend removal"**.

**Run it**

- `npm run review:studio`: dev server at http://localhost:5174/review.html. It reloads when the game's `src/` changes.
- `npm run build:review`: a static build in `dist/review/` (`review.html`, `game.html`, `review-data.json`, `assets/`).
  `npm run review:preview` serves that build at http://localhost:5175/review.html.

**Host it (privately)**

`dist/review/` is plain static files, but it must be served over http(s). Opening `review.html` from disk does not
work, because the studio talks to the game in a same-origin frame. It is not part of the game builds. `dist/web`, the
GitHub Pages root and the Electron app never contain it, and `_config.yml` keeps its files off Pages. Ways to give
reviewers access without publishing it:

- **On one computer:** `npm run review:studio`, or copy `dist/review/` over and run `npx serve dist/review`
  (any static server works, for example `python3 -m http.server -d dist/review`).
- **On a team network:** the same, started with `--host` (`npx vite preview --mode review --host`) or behind your
  usual internal web server.
- **Online for remote reviewers:** upload `dist/review/` to a static host that puts it behind a login, for example
  Cloudflare Pages + Cloudflare Access, Netlify with password protection, or a private S3 bucket behind CloudFront
  signed cookies. The page carries `noindex`.

  It is not published anywhere yet. Ask the project owner before putting it online.

**Use it**

- **Who are you:** type your name and pick a role (Content/religious, Art, Gameplay, Other). Marks are kept per
  reviewer, so two people on one computer don't overwrite each other.
- **Left:** the categories, with counts and a completion bar: Dialogue, Trivia, Text and Sprites now; Animations,
  Screens, Sounds and Voice come in Phases 2 and 3.
- **Top:**
  - search (text, ID or file);
  - filters: Unreviewed, Keep, Fix, Delete, New since last review, and Religious review (Islamic wording);
  - the progress counter;
  - **Last review**, the version you last reviewed. Items added after it count as new.
- **Middle:** the list and the item as it ships:
  - conversations as conversations, with each speaker's face, and a verdict on every line;
  - trivia with the right answer, the wrong answers and the explanation;
  - sprites drawn by the game's code at 1x, 2x, 4x, 8x or Fit, on light, dark or checkered backgrounds, facing
    right or left, in thobe or team kit (any team's colours), with a pixel lens for exact pixels and colours.
    Props and scenes also switch time of day.
- **Right:** where the item lives (file:line, every place the same text is used), when it appears in the game,
  the version it was added in, the flags, the verdict buttons, the comment, the suggested text, and other
  reviewers' marks.
- **Keys:**
  - **K**, **F**, **D** set the verdict and move to the next item.
  - **←/→** move back and forward. **N** goes to the comment box, and **Esc** leaves it.
  - **Ctrl/⌘+Z** undoes.
  - On a touch screen, tap the buttons, or swipe the stage to move.

  Everything saves as you go, in this browser.

**CSV**

- **Download CSV** and **Copy as CSV** export every item, one row per item and reviewer:
  `id, category, name, where, version_added, verdict, comment, suggested, reviewer, role, reviewed_at, build_version`.
  The `id` names exactly one item.
- **Import…** takes:
  - a studio CSV, to restore or merge another reviewer's work;
  - `game-text.csv` with **Keep / Change / Cut** filled in;
  - `islamdunk-review.csv` from the in-game `?review=1` mode.

  Change becomes Fix and Cut becomes Delete. Old rows are matched to items by their text. Marks merge by item ID +
  reviewer, and the newest `reviewed_at` wins. Differences are listed as conflicts (the **Conflicts** button). Rows
  that match no item are reported, never guessed.
- `npm run review:report -- export.csv [more.csv]` prints a worklist grouped by source file. It lists the Delete
  items, and the Fix items with the comment and the suggested text. It applies nothing.

**Item IDs**

Every item has a stable ID derived from where it comes from:

| ID | Item |
|---|---|
| `dialogue/<scene>/<line>` | One line of a conversation, for example `dialogue/story/intro/0`, `dialogue/sheikh/<pool>/<n>`, `dialogue/partner/khalil/0/3`, `dialogue/npc/yusuf/0/1`. |
| `trivia/<index>` | A trivia question. |
| `text/achievement/<id>`, `text/noor/<id>`, `text/taunt/<id>`, `text/calendar/…` | Achievements, Noor effects, taunts and calendar names. |
| `text/<file>/<slug>-<hash>` | Every other player-facing string. |
| `sprite/<kind>/…` | Sprites: `cast/saleem`, `player/<team>/<n>`, `npc/<id>`, `creator/<row>/<n>`, `crest/<team>`, `jersey/<team>`, `ball/<skin>`, `hoop/default`, `venue/<id>`, `scene/<id>`, `prop/<scene>/<id>`, `masjid/none`, `masjid/all`, `hud/desktop`, `hud/touch`. |

`studio-ids.json` records every ID and the version it was added in, which drives "new since last review".
`npm run review:ids` adds new items with the current version. The tests fail if two items share an ID, or if an ID
disappears without being listed. To list a removal:

```
npm run review:ids -- --remove "why" <id> …
```

The first versions came from `git blame` of each item's source line. "phase1" means the text was in the first review
packet, and "8.6.0" means 8.6.0 or earlier, since that is the first commit in this repository.

## The older ways (still work)

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
