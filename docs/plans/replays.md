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

**Measured (step 1, 9.33.0 branch, a 2v2 Quick Play match, 540 frames = 8 s + 1 s; `plays-save` prints these):**

| What | Size |
|---|---|
| The 540 frames as JSON | 730–750 KB |
| Packed (`playPack`: rounded to 1/8 unit and 1/1000 rad, change from the frame before, column by column, varints) | 59 KB |
| Stored (packed, then deflated with `CompressionStream`) | 15–23 KB a play; 20 plays about 0.3–0.5 MB |
| The metadata (teams, score, venue, format), deflated | 0.6 KB |
| A link copy (1/2 unit, 1/160 rad), deflated: every frame / every 2nd (30 fps) / every 3rd (20 fps) | 9.4–10.2 KB / **6.8–7.3 KB** / 5.4–5.9 KB |

So the link fits D5's 8 KB at 30 fps (frames in between blended back when it plays; a jump such as a restart cuts
instead of sliding), about 10 KB of URL text after base64url: **the link option stays in** (step 3).

Memory: a frame in the buffer is about 1.17 KB on the heap (4 players; measured as 10 x 540 fresh frames after garbage
collection). The buffer holds 600 frames (the 540 of a play, plus 1 s of slack: a busy frame can record several steps at
once, and the 1 s after a press then overshoots), about 700 KB against 350 KB for the old 300: **about 350 KB more per
match** (3 on 3 about 500 KB more), freed when the match ends. Recording costs the same per step as before.

Online: `rb-plays` (the guest saves by key, the pause menu and the touch pill while both phones mash buttons on a 40 ms,
2% loss link): 3 saves on the guest, none on the host, the match ran on through the saves, 0 desyncs, ~1,000 checksums.

Decisions taken with the owner before step 1 (beyond the table above): the link copy may drop to 30 or 20 fps to fit;
a save that isn't a game-picked highlight is labelled with the last basket, block or steal in its window (else PLAY)
and features that player (else yours); old My clips videos become permanent entries of My plays; My plays sits on the
main menu above Options and in the pause menu under Save play; the touch pill sits under the scoreboard; a second press
within 3 s replaces the first save; saves aren't offered in mini games, demos or practice; the release is 9.33.0.

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
