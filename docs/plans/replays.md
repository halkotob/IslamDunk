# Plan: save any play and share it in two taps

Today a play can be shared only if the game picked it as a highlight, only from the final screen, and only through
Share → Make video → Keep in My clips; My clips sits under Options → Extras. The goal is **any play, saved the moment
it happens, sent to a friend in two taps, and a small library of recent saves one tap from the main menu.** Watching
whole games again is out of scope.

## What exists to build on

| Need | Where |
|---|---|
| The last 5 s of what's drawn, every frame | `Replay` in `src/sim/match-extras.js`: `buf` (`max: 300` frames), `frame()`, `apply(f)` |
| Clips the game picks on its own | `Replay.mark` / `M.highlights` (frames, player, label, peak, `share` metadata from `clipMetadata`) |
| Drawing a clip off-screen and recording it as a video | `src/screens/clip-video.js` (`clipPlan`, `clipFrame`, MediaRecorder, `navigator.share` with the file) |
| The still share card | `buildShareCard` (`src/career/barakah-run.js`), `openClipShare(clips, from)` |
| A saved-clips library | My clips in `src/screens/v95-highlights.js` (IndexedDB `islamdunk-clips`, up to 12, play, save to file, delete) |
| Sharing a link | `src/online/lobby.js` (`navigator.share({ url })`, copy fallback) |

## Decisions (defaults; ask the user before step 2 only if one of these looks wrong once you're in the code)

| # | Question | Default |
|---|---|---|
| D1 | What is "a play"? | The last 8 seconds before you press Save, plus 1 second after, so a dunk you saved at the rim still lands. Raise `Replay.max` to fit (measure the memory: frames are kept in every match). |
| D2 | How do you save one? | **Save play** at any moment of a match: a button in the pause menu, a key (`V`), and on touch a small button that appears for 4 s after every basket, block or steal. One press, a "Saved" toast, play carries on. Every game-picked highlight on the final screen gets the same button. Online it saves on your phone only and never pauses the match. |
| D3 | What is kept? | The frames and metadata, not a video: small, and the video can be made later. **Recent plays** keeps the last 20 saves; starred ones are kept until deleted and don't count toward the 20. Merge My clips into it (existing kept videos stay). |
| D4 | Where's the library? | **My plays** on the main menu (and the pause menu): a grid of the recent saves with a moving thumbnail, the play label, both teams and the date. Tap one to watch it (with slow motion around the peak, as the instant replay does), star it, share it, or delete it. |
| D5 | How do you share? | **Share** on any saved play. On a phone it makes the video (as clip-video does) and opens the share sheet with the file in one go, so it's two taps to WhatsApp or Instagram. Where a file can't be shared, it downloads the video. A **Copy link** option puts the play itself (deflated with `CompressionStream`, base64url, in the URL hash `#play=...`, never sent to a server) in a link that opens straight into watching it, if the compressed play fits in about 8 KB; measure in step 1 whether quantizing the frames gets it there, and drop the link option if it can't. A link made on another version says "made on 9.x" instead of showing a broken play. |
| D6 | What's in the video and the link? | What the share card shows now: ISLAM DUNK, the teams, the score and the play. Custom team and player names go through the word filter (`csClean`); custom images appear only if the creation is finalized (as online play does). |

## Steps

### 1. Save any play

D1 and D2: the longer buffer, Save play in every place D2 lists, and a saved play stored in IndexedDB (D3). Measure a
saved play's size raw and compressed (D5's 8 KB question) and the memory cost of the longer buffer.

**Done when** a play saved from the pause menu, from the key, from the touch button after a basket, from a final-screen
highlight and from an online match (on `?net=loop`) each appears in storage with its frames, the sizes and memory
cost are written in this file, and an online match with saves on one phone has no desync (`rb-*` tests on CI).

### 2. My plays

D3 and D4: the library screen, watching, starring, the 20 limit, and the old My clips moved in.

**Done when** saving 25 plays keeps the newest 20 plus every starred one, a play watched from My plays looks the same
as it did live (screenshot of the same frame), clips kept in My clips before still play, and the screen works on
touch, keyboard and pad (`nav-census` passes).

### 3. Share

D5 and D6: Share to the share sheet with the video, the download fallback, and Copy link if step 1's size allows.

**Done when** Share on a saved play opens the share sheet with a video file (check `navigator.canShare` is true for
it in Chromium with a phone profile), the fallback downloads it, and (if the link is in) a link copied from one page
and opened in a fresh page plays the same play, and one from another version shows the D5 message.

### 4. Ship

A test in `tests/` covering steps 1 to 3 (save from a match, the 20 limit and stars, watch, share and the link), the
CHANGELOG entry and version bump, the full CI suite.

**Done when** the PR's CI passes, apart from failures shown to be red on `main` too.

## Kickoff prompt

```
Follow docs/plans/replays.md: save any play and share it in two taps, with a small library of recent saves. Take its
decision defaults, work through the steps in order, and don't skip a "Done when". Build on a new branch, push after
each step, and open a PR when step 4 is done.
```
