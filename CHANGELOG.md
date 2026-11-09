# Changelog

## 9.17.9: one way back on every screen, one name for leaving, and a gamepad hint
- **One way back (U2).** The ‹ Back pill, top left, is the way back on every screen that has one, with Esc on a
  keyboard and B on a pad. 26 screens also had a second control that did the same thing; it's gone: the Back row in
  Game settings (and its "‹ SETTINGS" link), the online menu, Mini games, Profile, tournament and league setup, the
  Career menu, Save and load, Upgrade stats, Fun modes, the month view, the join-code keys, the custom-team code
  screens, the save export and import screens and the clip screen; "Leave (saved)" on a tournament or league;
  "Leave office"; the shop's and a conversation's Leave; the hub corner menu's Close; the online waiting screen's
  Cancel. Nothing else on those screens moved (before and after pictures for the designer: 19 screens).
  The pill now goes up one screen where it went further: inside a Game settings group it goes back to the groups
  (it went to the title), and on the join-code keys to the online menu (it went to the title; their Back button
  went to the online menu).
- **One name for leaving.** Back goes up one screen. Leave leaves an online game. Quit leaves a match in progress,
  and asks first ("Quit this game?"; the pause menu said "Quit to title" or "Leave game (no result)"). Title goes to
  the title (the hub corner menu's "Main menu", the end of a run's "Back to title", the Dunk lab's Quit). Cancel is
  left only where a dialog has a confirm button (importing a save). The pill says Skip on a story or the khutbah,
  which passes the scene rather than going back.
- **Settings (U3).** The title menu says Settings (it said Options) ▸ Profile, Game settings, Extras, How to play,
  About, and the screen is called Game settings.
- **The gamepad hint (UX1).** On screens you play by tapping, with more than 6 targets, "View: pick" shows in the
  bottom-right corner for 5 seconds after a gamepad press, so a controller player knows the View button picks any
  button. Touch and keyboard players never see it. Shown on: Teams & Players, the lobby, the career stats (league
  leaders, around the league). Screens with 6 targets or fewer: the custom-team code import and share screens and
  My clips open the pad's picker by themselves (as the join-code keys do), so the pad has a focus there. The rest
  were left as they are, because the pad's directions or A already do something there that a focus would take over:
  tabs and the main button on a tournament or league, team picking on select, the stick in the neighbourhood, the
  gym, the musalla and a match, A to go on in a story, the khutbah, halftime and the results. The picker (View) still
  reaches every target on all of them.
- **Fixed:** a gamepad couldn't leave the clip screen (B, Start and A were read before the pad pressed them); one
  tap of a Hold-or-tap button (9.17.8) could count twice on a fast screen when a frame ran no match step.
- **Measured** with the new screen census (`node tests/screen-census.mjs`: the 103 screens of the phone audit, each
  on a fresh page, with the keyboard alone, a gamepad alone and touch alone):

  | | 9.17.8 | 9.17.9 |
  |---|---|---|
  | screens with no way out: keyboard / gamepad / touch | 0 / 2 / 0 | 0 / 0 / 0 |
  | screens with two controls that go back | 26 | 0 |
  | words for leaving on controls | 9: Back, Skip, Leave, Leave (saved), Title, Cancel, Quit, Quit to title, Leave office | 6: Back, Skip, Title, Leave, Cancel (the import dialog), Quit |
  | "View: pick" shown | 0 | 4 (the screens above) |
  | page errors | 0 (6 from two audit setups, fixed) | 0 |

  Phone audit: 0 overflows, 0 page errors at 667×300 and 750×342. The screenshot tests (neighbourhood, Jumu'ah)
  didn't change; no baseline was regenerated.
- **New tests:** `nav-hint` (fast tier: the hint after a pad press, not after a key or a touch, gone after 5 s, never
  on a list screen), `nav-names` (fast tier: Settings ▸ Game settings, no Back rows, the pill goes up one, Quit asks
  first, join code goes back to the online menu) and `nav-census` (full tier: the census above must show no screen
  without a way out on any device, no two ways back, only the six words, and no page errors).

## 9.17.8: Defend and Sprint can be taps instead of holds (a setting, off by default)
Nothing changes unless you change it. Settings → Accessibility has a new row, **Hold or tap**, after Shot release:
Hold (the default), Tap: Defend, Tap: Sprint, or Tap: Defend and Sprint. (One row, not the two the brief asked for,
and not in Controls & camera: that group already has 8 rows on a phone, the most that fit, and two rows in
Accessibility would make 8 on a computer, where a group shows at most 7.)
- **Tap:** one tap of DEFEND (H or L, Y on a pad, the third touch button) guards your man, and boxes out on a shot,
  until you tap again. One tap of sprint (Shift, RB/RT/B on a pad, or pushing the touch stick past its ring) keeps
  you sprinting whenever you move, until you tap again. On a phone that means you no longer hold the stick and a
  button for a whole possession.
- **It switches itself off** when the ball changes hands, when the ball is dead (timeouts, free throws, breaks, out
  of bounds) and when you pause, so it can't stay on by accident.
- **You can see it's on:** on a phone the DEFEND button stays lit, its line says "tap: GUARD" instead of "hold: GUARD",
  the stick's sprint ring stays bright, and GUARD / SPRINT chips show under the turbo bar. With keys or a pad, the
  player card says GUARD and the turbo bar keeps its sprint glow. (No new art: the existing chip, glow and lit
  button. For the designer to look at: the chips sit under the turbo bar on a phone.)
- **How to play** says "tap" instead of "hold" for whichever of the two is on Tap.
- **Online:** the setting stays on your device. The toggle is turned into held buttons before the match sees them,
  so one player on Tap and the other on Hold play the same game on both phones.
- **Measured.** At the defaults: `npm run defense:report` (8 seeded games) is identical before and after. The loop
  report isn't seeded and differs between two runs of the same build; before vs after is within that noise
  (points per possession over 36 rows: 0.100 mean difference, against 0.096 between two runs of 9.17.7).
  On Tap: a scripted defender who taps once each possession plays exactly the same seeded game as one who holds
  (same score 0-8, same 5 shots allowed, 3 made, 1 steal, the same match checksum).
- **New tests:** `hold-tap` (fast tier: with real key presses, a tap guards until the next tap; the ball changing
  hands, a dead ball and a pause each turn it off; one Shift tap sprints only while moving; Hold works as before; no
  stored setting loads as Hold and Tap survives a reload), `hold-tap-bot` (fast tier: the tap and hold defenders
  above) and `rb-holdtap` (full tier: host on Tap, guest on Hold, a whole online match, 0 desyncs, same final
  checksum).
- New strings are in `docs/review/game-text.csv` (the export also brings the file up to date since 9.16.1).
- **Fixed: every online match desynced at its last moment.** The "this match's achievements are counted" flag lived
  in the match state, which online play saves and checksums, and the two phones finish a match at different
  moments. The new online test found it: in a whole 1-minute match with both players mashing, 5 matches in 6 ended
  with one desync put right (on Hold and on Tap alike). The flag now lives outside the match: 12 matches out of 12
  with no desync, 6 of them with the host on Tap. (It also stops a match that was played again after a rollback
  from counting its end twice.)

## 9.17.7: phone menus are easier to tap, and text can be made bigger
Nothing looks different at Normal text size: the five screens checked (title, settings, career hub, pause, join code)
are pixel-identical to 9.17.6 on both phone sizes. What changes is where a tap lands, and a new choice in
Settings → Accessibility → Text size.
- **Bigger tap areas on phones (X1).** On touch, every menu control is tapped as if it were at least 44 px on each
  side, grown around its centre. Where two controls are closer than that, the space between them is split down the
  middle, so a tap always lands on exactly one. Mouse, keyboard and gamepad work as before, and so do the joystick and
  buttons during play. Measured over the phone audit's screens (short side of each control's tap area, CSS px):

  | | iPhone 13 landscape | 667×300 |
  |---|---|---|
  | 9.17.6 median | 26 | 23 |
  | 9.17.7 median | 40 | 36 |
  | under 44, 9.17.6 → 9.17.7 | 870 of 925 → 602 of 922 | 865 of 916 → 637 of 917 |

  Every control under 44 is listed by the report, with its reason: 569 / 610 are held in by their neighbours (menu
  rows 21-23 px apart, join-code keys 33×31; each now gets its whole share of the gap, the keys 38×39 / 33×37 from
  33×29 / 29×26), 10 are the in-match buttons (left alone on purpose), 23 / 17 are drawn twice in the same place
  (the copy on top takes the tap). None is under 44 with room to grow. Reaching 44 on rows and keys needs a phone
  layout, which changes how menus look, so it's a separate item (X7) for the designer.
- **Fixed: How to play's "Play the Tutorial" couldn't be tapped on a phone.** The page's "tap anywhere else to go
  back" area was drawn over it, so the tap went back to the title. On touch a control now beats a tap-anywhere area.
  Where two drawn controls overlap (the lobby's ‹ › arrows, 8 px), the tap goes to the nearer centre.
- **Text size on phones (X2, X6).** Normal, Large and Larger now work on a phone (the row said "Phone size" and
  couldn't change; it now says Normal). Normal is today's 11 px minimum; Large raises small text to 13 px and Larger to
  15 px. Menus and text screens only: the court and the match HUD stay at Normal, so nothing on the court gets
  covered (a pause menu or a Noor question over the court does get bigger). Pinch zoom stays off.
  A line that wouldn't fit at the bigger size steps down a size, then to Normal, in the same frame: one that would
  run past the screen's edge, stick out of its button or panel further than it does at Normal, or run into another
  line. A wrapped paragraph steps down as a whole and wraps again. A label fitted to its box tries one size smaller
  before it's shortened with "…". So a screen can mix sizes (at Larger on the pause menu, the long "Settings: sound,
  display, accessibility" row stays at Normal while the others grow). The 13 and 15 px sizes are estimates for the
  designer to confirm on a real phone.
  Phone audit, 103 screens: 0 lines past the edge, out of their box or into another line, and 0 page errors, at
  Normal, Large and Larger on both phone sizes. Saved in `islamdunk.access` as before (old saves load; the setting
  stays local online, `RB_LOCAL`).
- **New tests:** `tap-targets` (fast tier: a tap just outside a control, between two rows, in the join-code gap,
  on the tutorial button, and a mouse click that must not grow), `text-size` (fast tier: the three sizes, saves old
  and new, match text unchanged at Larger, title and settings fit) and `phone-text-size` (full tier: the whole audit
  at Large and Larger). The `mobile` test's audit now also fails on any control under 44 px that isn't held in by
  its neighbours. `node tests/phone-audit.mjs --targets` prints the tap-area report; `--text 1|2` audits a size.

## 9.17.6: CI goes green, and online stops flaking
Nothing changes in how the game plays. Two online bugs are fixed (one desync, one freeze), a dropped direct link now
comes back during the match, and the tests on GitHub match the machine the screenshots were made on.
- **The screenshot tests (`world-visual`, `jumuah-visual`) failed on GitHub because of fonts, not art.** Cause (c), a
  rendering difference. The baselines were made on a machine that prefers Inter for sans-serif and draws text
  unhinted in grayscale (two fontconfig files there). GitHub's runner had neither, so text fell back to DejaVu Sans.
  The runner now installs `fonts-inter` and the same two files (`tests/ci/`). No baseline image changed, and the
  0.2% limit stays. The largest difference on any frame:

  | | world | Jumu'ah |
  |---|---|---|
  | without Inter | 0.550% | 0.60-1.78% |
  | Inter, hinted | 0.394% | 0.699% |
  | Inter, unhinted grayscale (now) | 0.044% | 0.059% |

- **Online desync fixed (Q9): it was the game, not load, and it was there in 9.15.0 too.** The stuck-ball watchdog
  (a ball loose for 5 s goes to the nearest player) keeps its timers outside the match. A rollback match didn't save
  them, so every replayed frame counted the loose ball's time again, and the phone that went back more handed the
  ball out sooner. Found by comparing both phones' saved frames: the same state on frame 658, the same inputs, and
  on 659 the guest's player had the ball and the host's didn't. The timers are saved, put back, checksummed and reset
  with the match now. It showed most in 1 on 1 on a half court (loose balls sit longer). It also explains why a busy
  CPU made it worse: more load, more frames replayed.
- **What's left is by design.** When the other phone's inputs arrive more than 20 frames late (a phone too slow to keep
  up, or a link that stalls for seconds), nobody waits: the frame keeps its guess, and if the guess was wrong the host
  sends its state and both carry on from it. `rb-lag` now reports how many inputs were played as guessed. On the
  direct and relay links it still allows no desync at all. On the Bad mobile link a desync passes only when inputs
  really came late, the host put it right, and both phones end on the same sync code. (GitHub's runner played 378
  and 905 inputs as guessed there, in two tries; this machine 0-13.) A test that fails only on a desync the game put
  right runs once more, and the runner prints `!!! RETRIED` with the first try in full. Any other failure isn't
  retried.
- **`rb-slow` held the host to 50 fps while the other phone runs at a quarter speed.** The host follows the slow phone
  on purpose (both stay level), so it can't be faster than it. Both measured 45-49 fps here and on GitHub's 2-core
  runner, and it failed there 2 runs in 10. Both phones are held to the slow phone's 45 fps now, and the slow phone
  runs at a third of full speed (it was a quarter: GitHub's runner drew 42 fps at that).
- **B3: a dropped direct link comes back during the match.** The match's network step kept the direct link's retry
  from running, so a link that dropped stayed on the relay for the rest of the match. It's offered again now (up to 6
  times). `rb-linkdrop`: dropped at frame 128, back within 20 s, no desync. On 9.15.0 it never came back.
- **S1: a modified game can't freeze the other phone.** An input packet like `0*999999999` built a billion-entry list
  (7.4 s frozen, then a crash). Now a packet carries at most 48 inputs; a run past that, a value no input can be, junk,
  the wrong type or a first frame that isn't a frame drops the whole packet, in under 0.1 ms. Valid packets are
  encoded and read exactly as before. `rb-hostile` sends 13 such packets: 0 inputs taken from them, a normal packet
  after them still counts, both phones play on. On 9.15.0 the guest froze for 15 s and took 106 inputs from them.
- **Online tests press Start only once the host has seen the guest's Ready.** Before, they waited a fixed 0.6-0.9 s,
  and on a lossy link Start sometimes came first and did nothing (`lag-profiles`, 20% loss, timed out once on GitHub).
- **Docs-only pushes skip the suite** (`docs/**` and `.claude/**`, except the baselines, census, game text and sound
  list the tests read). A newer push to the same branch cancels the run in progress.

Measured: each test alone, 10 runs, on the 2-core container (pass count; desyncs put right per run, median / max):

| | 9.15.0 | 9.17.5 | 9.17.6 |
|---|---|---|---|
| `rb-same` | (added in 9.17.1) | 7/10; 0 / 4 | 10/10; 0 / 0 |
| `rb-lag` (Bad mobile row) | 8/10; desyncs in 2 runs (26, 6) | 5/10; desyncs in 5 runs (6-25) | 8/10; desyncs in 2 runs (36, 13), both in multi-second link stalls (2,500 and 500 late inputs) |
| `rb-slow` | 1/10 (fps); 12 / 15 | 1/10 (fps); 10.5 / 19 | 0/10 on the old 50 fps bar; host 45-48, guest 45-49 fps; 10.5 / 21, from about 400 late inputs a run |
| `online-lag` | 10/10; 0 / 0 | 8/10; 0 / 0 | 8/10; 0 / 0 |

`online-lag` never desyncs. Its failures are single timing samples (a layup start, one shot grade's ball step, a
second hop, a 53 ms move), a different one each time, and they aren't retried. 30 runs each at the 40 ms profile:
9.15.0 26/30, 9.17.6 27/30, so it isn't a regression (the 10/10 above was luck). It's out of `test:full`, so CI
skips it; it runs by hand before a release (`npm run test:release`, or `--only online-lag`). Whether the odd double
jump is something a player sees is still open (S6 in `docs/IMPROVEMENTS.md`).
- **New tests:** `rb-watchdog` (fast tier: the watchdog's timers are saved, put back, checksummed and reset; all four
  failed on 9.15.0), `rb-linkdrop` and `rb-hostile` (full tier). `rb-watchdog` puts the title screen's match back when it's done; it
  left it wiped, and the next frame drawn threw a page error (2 runs in 3). `STACK=1` adds page-error stacks to test output.

## 9.17.5: a sound for every moment (no music)
docs/audio/sound-list.csv listed 21 events with no sound of their own. 16 have one now; the 5 ambience rows (the
neighbourhood, inside the masjid, the career hub, menus over the attract match, the practice gym) stay silent on
purpose. No music anywhere: a stinger is two or three notes, under a second. Bug fixed: Lightning called `SFX.catch`,
which didn't exist (a guard kept it silent).
- **17 new sound ids** (`src/core/sfx-moments.js`), each in the four styles (A Current, B Real, C Arcade, D Soft),
  procedural like the rest. They're in the Studio's Sounds tab for review, and Sound style and per-sound picks apply.
- **In a match:**
  - `shotTick`: a quiet tick as each of the shot clock's last 3 seconds starts, a little higher each time.
  - `ftStep`: stepping to the free throw line. `ftAttempt`: a soft "ready" tap for each attempt.
  - `hotSpot`: a short rising shimmer when a hot spot appears.
  - `crowdTurnover`, `crowdBlock`, `crowdBadMiss`: a few voices, scaled by the venue's crowd level. They play only
    when nobody in the crowd is drawn; when people are drawn they still groan and "ooh" themselves, so the two
    never stack.
  - `catch`: Lightning's fed ball.
- **Between plays:**
  - `halftimeStinger`: two neutral notes.
  - `winStinger` and `lossStinger` on the final screen, after the buzzer and cheer. The loss is two calm falling
    notes, never mocking.
  - `earnTick`: the career summary's Barakah Points and Halal Bucks lines now come in one at a time, 0.12 s apart,
    with a soft tick each (no coins, no jackpot). Enter still continues at once.
  - `triviaLow`: a gentle tick for each of the trivia timer's last 5 seconds.
- **Menus and career:**
  - `uiBack`: Back or Esc out of a screen, either way.
  - `uiConfirm`: Yes or No in a confirmation, distinct from the menu blip.
  - `toast`: a message at the bottom of the screen, quieter than the blip.
  - `calChime`: a soft two-note chime for a new month, Ramadan, Eid or a holiday. No adhan, Quran or takbir.
- **The practice gym's crowd level is 0** (it inherited the classic court's 1 and was silent only because nobody is
  drawn there), so the new crowd sounds stay out of it.
- **Online:** in a rollback match the new match sounds come from the match itself, so both phones play them on the
  same frame and replayed frames are silent. A guest in the older snapshot mode derives the shot clock ticks from
  the host's snapshots and hears the host's hot spot (added to the sounds `net.js` mirrors).

Measured (`npm run sfx:levels`, the loudest 200 ms, K-weighted). The swish is −30.5 dB:

| | level (dB) | under the swish |
|---|---|---|
| shotTick, ftStep | −50 | 19.5 |
| ftAttempt, calChime | −43 | 12.5 |
| hotSpot, catch, halftimeStinger | −42 | 11.5 |
| winStinger / lossStinger | −41 / −42.5 | 10.5 / 12 |
| crowd turnover / block / bad miss (at crowd level 1) | −52 / −53 / −53 | 21.5+ |
| earnTick, triviaLow | −54, −53 | 22.5+ |
| uiConfirm, uiBack, toast (the blip is −46.8) | −46, −53, −57 | 15.5, 22.5, 26.5 |

Each new id's B, C and D land within 0.1 dB of its A (each variant has a fixed trim, so its correction in
`SFX_LEVELS` is about 0, inside the existing −6 to +5.1 dB range). The existing 23 sounds' levels are unchanged
(re-measured, identical). The loudest sample peak is 1.09 K-weighted, so nothing clips. The crowd reaction by venue
(a block): the practice gym silent, the home gym −72.9 dB, a small gym −72.5, an arena −63.8. "No sound" rows in
`docs/audio/sound-list.csv`: **21 → 5**.

Tests (`tests/sfx-moments.mjs`):
- `sfx-moments`: each sound fires exactly once per occurrence through the game's own code. The shot clock gives 3,
  2, 1. Free throws give one step and one tap per attempt. The crowd reacts with nobody drawn, and not when people
  are. Also covered: the stingers, the 5 summary lines, the 5 trivia ticks, Esc and the corner Back, Yes/No, a toast,
  a new month and Eid al-Adha.
- `sfx-calls`: every `SFX.<name>` used in src/ exists. `sound-list` no longer excuses a call to a missing sound
  that's listed as missing, which is how `SFX.catch` slipped through.
- `sfx-crowd`: practice gym < home gym < arena.
- `sfx-quiet`: Sound off renders silence; style D plays its own variant of all 17.
- `rb-sounds` (full tier, run alone): rollback matches play the same match sounds on the same frames, and a snapshot
  guest hears the ticks and the hot spot.
- `sfx-variants` now expects 40 ids and 160 variants (was 23 and 92).
- Known limit, as for every match sound since 9.15: a phone plays a sound the first time it plays a frame, so a
  frame it guessed wrong (then replayed silently) can leave one sound on one phone only. That happened once in 11
  runs (one sound), so `rb-sounds` allows at most one difference a run and names it. Holding sounds until a frame
  is confirmed would close it at the cost of delay.

## 9.17.4: the first match is friendly
docs/IMPROVEMENTS.md GT1, GT2. A newcomer's first Quick Play match was Medium (the difficulty starts there every
launch; it isn't stored), and Miss breakdown was off, so a missed shot was never explained to someone who didn't
know why. Now (`src/screens/v9174-first-match.js`):
- **A new player's first Quick Play match is on Easy.** "New" means no games on this device and the Difficulty
  setting never changed (new key `islamdunk.difficulty.chosen`, set by the Difficulty rows in Settings and the
  mini-games menu). Nothing on screen calls it an easy mode.
- **After a first win**, the result screen's hint row shows one line: "You won on Easy." with a "Try Medium? (↑)"
  button. Press the button, Up or M to take it ("Next match: Medium."); Enter continues as always, so leaving takes
  no extra tap. It's offered once: taking it or leaving the screen ends it for good. After a loss, nothing.
- **Miss breakdown is on for a player's first 5 games**, then off. The next result screen says once: "Miss breakdown
  is now off. Turn it on in Settings." It's now three-state (`islamdunk.misswhy`: unset, '1', '0'), and a choice
  made in Settings is never changed. The default applies to Quick Play-style matches. Career, online, King of the
  Court and the mini-games keep Off unless the player turned it on, and keep their own difficulty.
- No new screens, no popups in a match.
- docs/IMPROVEMENTS.md also marks B1, B2, B4 (9.17.1) and GT1, GT2 done.

| | 9.17.3 | 9.17.4 |
|---|---|---|
| Fresh profile, first Quick Play match | Medium | **Easy** (the CPU uses the Easy table) |
| Miss breakdown, games 1-5 of a new player | off | **on** (each missed jump shot gets its line) |
| Miss breakdown after game 5 | off | off, with one note on the next result screen |
| A profile with games, or a picked difficulty | Medium | Medium (unchanged) |
| An explicit Miss breakdown Off / On | kept | kept, through every game |
| `npm run review:first-run` | 31 steps, 31 taps, 1,127 words | 31 steps, 31 taps, 1,125 words, the same screens |

The two words are the match itself: the first-run path's scripted first match is now on Easy and ended 10-25 instead
of 2-29, so the player's stat line is shorter. No text was added.

Tests (`tests/first-match.mjs`, fast tier): `first-easy` (fresh vs played vs picked), `first-stepup` (a win offers it
once and Up sets Medium; a second win and a new session after dismissing don't; a loss shows nothing), `first-misswhy`
(unset on through game 5 then off with exactly one note; explicit '0' off and '1' on through 7 games; career, King
of the Court and a mini-game stay off and on Medium), all with no page errors.

## 9.17.3: a career can't be lost
docs/IMPROVEMENTS.md SV1, SV2, SV3. Each save went to one place, written over in place. A save that didn't parse
looked like no career at all, and the next autosave wrote over what was left. The ~50 autosaves ignored a failed
write, and nothing asked the browser to keep the data (Safari on iPhone can clear a site's storage after 7 days
without a visit unless it's on the Home Screen). Now (`src/career/v9173-save-safe.js`):
- **A backup of the last good save.** Before the career autosave, the profile (XP, unlocks) and the custom teams are
  written, the previous value is kept as a backup if it reads correctly (one each, with its date). A career save is
  1.1 KB at the start and 38.7 KB after a full season (box scores, the calendar). With its backup and the manual slot
  that's about 120 KB, under 3% of the about 5 MB a browser keeps for a site. If a backup would bring storage within
  a tenth of that limit, it's skipped and the player is told; the real save always goes first.
- **A save that can't be read is never lost.** Its text is kept aside (`.broken`). With a good backup, the backup
  loads and the player is told once, after any match: "Your latest save couldn't be read. Loaded the one before it
  (from 7 Nov 2026)." With none, the Career menu says "We couldn't read your career: Export it". The export
  carries the unreadable text too, and starting a new career no longer writes over it.
- **A failed save says so, once:** "Couldn't save: storage is full or this browser is in private mode." It shows
  once a session, and again only if saving fails after a save has worked. It never blocks and never appears during
  a match.
- **The browser is asked to keep the data** (`navigator.storage.persist()`), once, at the first career save. If it
  says no on a phone or tablet not started from the Home Screen: "Add to Home Screen to keep your career safe.",
  shown once ever. Desktop browsers and the desktop app aren't told (the advice doesn't apply there).
- **Export and Import**, on the career's Save and load screen, in the Career menu and on the Profile screen ("Export
  or import career"). Export makes one `.json` file (`islamdunk-save-<date>.json`) with the career, the manual slot,
  the profile and your teams, a version and a checksum. Copy code puts the same text on the clipboard. Import takes
  the file or a pasted code, checks it, shows one line ("Yusuf, Masjid Al-Amanah: season 1, week 9, 5-2, profile,
  your teams"), and on Import writes the career to the manual slot, never over the autosave. The profile and teams
  are written with their old values kept as backups. Every button works by touch, and left/right/Enter (keyboard
  or gamepad) move between them; Choose file opens the device's file picker.
- The save format (`v`, `sv`) and the manual slot are unchanged.
- **CI:** the full tier (9.17.2) never ran: `ubuntu-latest` is now Ubuntu 26.04, which the pinned Playwright has no
  Chromium for. The workflow now runs on `ubuntu-24.04`.

| Case | 9.17.2 | 9.17.3 |
|---|---|---|
| Damaged autosave | read as no career ("New career / Back"), and the new career's first save wrote over it | the backup loads, one message; the damaged text kept |
| Autosave and backup both damaged | the same | "We couldn't read your career: Export it"; both kept (`.broken`, `.bak.broken`) through a new career |
| Storage full / private mode, 6 saves | 6 silent failures | 6 failures, 1 message (one more after a save works and a later one fails); no errors |
| `persist()` | never | once, at the first save |
| Export, wipe, import | none | the same career (in the manual slot), profile and teams, compared field for field; a changed checksum is refused |
| Saves from 8.6.0, 9.0.0, 9.14.3 | load | load, stored text unchanged |

Tests (`tests/save-safe.mjs`, fast tier): `save-backup`, `save-broken`, `save-full`, `save-export`, `save-old`,
all with no page errors. The old saves are real ones, made by the 8.6.0, 9.0.0 and 9.14.3 builds from this repo's
history (`tests/fixtures/old-saves.json`). `career-run` now also reports the size of the season's save.
The Studio has the two new screens ("career: export", "career: import (a file picked)"); both pass the phone text
audit at all three sizes. The regenerated census (it was last made at 9.13.0) also shows two screens with overlapping
text, "hub: corner menu" (5) and "online: network report" (14). They're the same on 9.17.2, so they came in between
9.13 and 9.17 and are left for their own fix.

## 9.17.2: the test suite in two tiers, `npm test` in 2.5 minutes
Play-test of the workflow: "the test suite takes forever, always". It ran all 93 tests one after another: about 43
minutes on the 2-core container.
- **`npm test` is the fast tier:** 48 tests, the check before pushing to `main`. **`npm run test:full`** runs all 93,
  and CI runs it on every push (`.github/workflows/test.yml`, T1). No test was deleted and no assertion changed;
  `--list` shows what a run would do (48 fast + 45 full-only = 93).
- **Parallel:** tests run on workers, each with its own browser (cores - 1, at least 2, at most 4), longest first
  (the times from the last run, `tests/output/test-times.json`).
- **Run alone, after the parallel batch:** the frame-rate and speed checks (`rb-freeze`, `rb-slow`, `league-time`),
  the lag tests, every rollback test, and the real-time online ones. With two tests at once on 2 cores, `rb-settings`,
  `rb-touch` and `rb-one` repaired 1-3 desyncs they never show alone. That's the Q9 problem showing under load, not
  a test fault, so it's added to Q9.
- **The fast tier is sized by measurement, not the brief's list.** The brief's heavy list (mobile, online-lag,
  online-loop, online-server, defense, cpu-variety, tomahawk) was about 425 s of the 2,575. Leaving the rest in
  would have made the fast tier 7.3 minutes on 2 workers. So the full tier also holds everything over 13 s when run
  alone (league calibration 357 s, lag profiles 305 s, the Studio 180 s, CPU league 105 s, the career run, the hub
  layout, world visuals and robustness, the league tests...) and the rollback and online tests that must run alone,
  except `rb-one`, `rb-fun` and `rb-freeze`.
- **Mobile's phone text audit runs in the full tier only.** It takes about 95 s per phone size even alone, and under
  load it caught a moving "+1" popup past the screen edge on the clip screens. The fast tier keeps mobile's layout,
  touch and Noor-card checks; the full tier also audits both phone sizes, as before.
- **`--only`** takes names, prefixes and globs (`rb-*`, `net-`) and area tags: `online`, `phone`, `cpu`, `career`,
  `studio`. It runs what it names, whatever the tier. The end of a run prints the 10 slowest tests and the total, and
  warns if the fast tier passes 3 minutes.
- **Fixed sleeps kept:** almost all are measurement windows ("play 15 s on this connection"). I replaced the
  900 ms wait after the guest's Ready with a wait on `Lobby.guestReady()`, but `rb-online` (2% loss) then started
  its match about 5 s late. The sleep covers more than Ready, so it's back.

Measured on the 2-core cloud container (on a Mac with more cores both should be shorter; not measured here):

| | before | after |
|---|---|---|
| `npm test` | all 93 tests, about 43 min | 48 tests, **2.5 min** (148-153 s, 3 runs in a row, identical results) |
| `npm run test:full` | - | 93 tests, 37.5 min (20 min parallel, 18 min alone) |

A deliberately broken assertion in `formats`, run beside four other tests, still failed the run (exit 1).
Not met: the full tier's 10 minutes. On 2 cores half of it is the tests that have to run alone, and most of those
run on real-time network timing (`lag-profiles` alone is 5 minutes), so a faster CPU won't shorten them much. The
full tier still has its known failures (`rb-slow`, `rb-lag`: Q9), so CI will report them until Q9 is fixed.

## 9.17.1: online, both phones play the same game
docs/IMPROVEMENTS.md B1, B2, B4, and the play-test report "the player models tweaking out on his side". In an online
match with rollback each phone builds the match itself from the host's start message, but some of the match came
from each phone's own device instead. The desync repair then put the guest right a moment later, which showed as
players jumping, not as an error. Now everything the match needs is in the start message
(`src/online/v9171-rb-start.js`):
- **Half court is half court on both phones.** The host played half court and the guest full court from the first
  frame. The host's Court setting now travels in the message.
- **A taunt plays the taunter's own taunt on both phones.** Each phone played its own owner's equipped taunt on
  whoever taunted. The guest now sends its equipped taunt with its lobby presence, and the message carries both. An
  unknown or retired taunt plays as Sky.
- **1 on 1 (no CPU) has no CPU.** It was played 2 on 2 with CPU teammates on both phones. Now it's the two picked
  players, one a team.
- **Fun modes too** (found in the audit): Big heads, Uncle League and Low gravity counted only if this device had
  unlocked them, so a host with Big heads on and a guest who hadn't unlocked it played different games. The host's
  choice now travels in the message.
- The rest of the match setup already came from the message (teams and their looks, venue, the host's settings), and
  the Noor power-ups are off in a rollback match. The snapshot path (`?rb=0`, no direct link) is unchanged.

Measured, a loopback match per mode and court, 600 frames of scripted play on both sides, the match checksum compared
every 60 frames (`rb-same`):

| | co full | co half | vs full | vs half | one full | one half |
|---|---|---|---|---|---|---|
| Desyncs repaired, 9.16.4 | 0 | 1 | 0 | 1 | 0 | 1 |
| Desyncs repaired, 9.17.1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Players on the floor, 9.16.4 / 9.17.1 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / **2** | 4 / **2** |

On 9.16.4 the half-court phones differed from frame 0 (the first player at x 848 on the host, 630 on the guest).
A guest taunt with different equipped taunts was 1 repaired desync each time (the host played its own "flex" for the
guest's "chest"), and 0 now. Big heads on at the host only was 1, and 0 now.

Tests: `rb-same` (the six above; any repair is a failure), `rb-taunt` (the guest's taunt on both phones; an unknown
and a retired id play as Sky), `rb-fun`, `rb-one` (2 players on both phones, `M.one` the same), all in
`tests/rb-same.mjs`.

Still open, not from this release: `rb-slow` (the guest's CPU 4x slower) still fails, with 3 to 5 desyncs repaired in
12 s on 9.17.1 and 4 on 9.16.4 in the same environment (host 48-49 frames a second, needs 50). Q9 in the improvements
list. `rb-lag` passes or fails from run to run here on its Bad mobile line (400 ms, 10% loss: 4 desyncs repaired),
as since 9.15.0; its other four connections have none. Not yet done: the two-phone try (host on Wi-Fi, guest on mobile data: Half court, a taunt from each side, a 1 on 1).

## 9.17.0: the cast comes to life, and motion (design batches B and C)
The second and third batches from the design review (docs/IMPROVEMENTS.md CD1–CD5, CD2, VD3, VD4, UI1). Looks and
motion only: no speed, reach, skill, timing or AI change.
- **A look for each of the 16 main players** (`src/data/cast.js`): their own heights and builds, and one or two
  landmarks each (glasses, headbands, shooting sleeves, wristbands, coloured shoes, cap colours, longer beards).
  Heights and builds are drawn only, so contact strength and the CPU's style are unchanged.
- **Fuller beards** for everyone: the beard joins the hair with sideburns and has a moustache.
- **Faces by the eyes and brows only.** No mouths anywhere (`docs/adr/0002`). New expressions: disappointed after his
  own miss and on a loss, focused at the free-throw line.
- **Idle stances** between plays, matched to each player (upright, bouncy, low, hands on hips, hands on knees,
  hands behind the back…), never while holding the ball or guarding it.
- **Signature celebrations** after his own big play and a win: hand on heart, fist, both arms, salute, finger to the
  sky, takbir (standing only). In an online match everyone uses his cast celebration, so both phones show the same.
- **Sujood removed from the game** (owner decision, `docs/adr/0002`): the taunt and the profile celebration are gone.
  Saved profiles that had it equipped switch to Arms raised and Finger to the sky. The taunt's place in the online
  list is kept, so older and newer versions still agree on the others.
- **Opening logo in motion:** the dunker rises in and lands softly, the emblem pulses once and a gold glint sweeps
  across ISLAM DUNK, all within the same 1.7 s. Reduced motion keeps the plain fade.
- **Results screen:** the score counts up and Player of the Game slides in, in under a second; a tap or a key
  finishes it at once.
- **Menus fade up from dark (0.15 s)** when the screen changes; never in a match, and none with Reduced motion.
- Baselines accepted: `jumuah-visual` (the new beards) and the phone HUD shots.

## 9.16.4: design pass, batch A
The first batch from the design review (docs/IMPROVEMENTS.md D1, D2, D3), in `src/screens/design-pass.js`.
- **Results screen over a dark court.** The court behind the winner, the score and Player of the Game is darkened
  fully, and the last play's callouts and score pops are cleared, so nothing shows through (offline and the online
  guest's results).
- **Touch buttons readable on the court.** A darker fill and brighter outline, the hint lines ("hold: GUARD") fully
  bright and a little larger, and after 2 s without a touch they fade to half strength (was 30%). The pressed colour
  is unchanged. The phone baselines of `world-visual` were accepted for the darker buttons.
- **The Dunk lab switches off whenever a match starts**, not only on the way to the title.
- Owner decisions recorded: the logo's pose stays (`docs/adr/0001`); religious depiction is reviewed and respectful
  religious celebrations are welcome (`docs/adr/0002`).
- Known, not from this release: `rb-slow` (online with one very slow device) reports repaired desyncs on 9.16.2,
  9.16.3 and 9.16.4 alike in this environment; it passed on 9.15.0. Added to the improvements list (Q9).

## 9.16.3: the CPU uses its skill moves
Play-test: "the CPU doesn't do many skill moves". On 9.16.2 a CPU handler only tried a move with a defender within
50 px, and signature moves were Hard only.
- **Dribble moves with a defender in front of him or closing on him within 90 px** (was any defender within 50 px), at
  a new per-difficulty rate. The 0.9 s gap, the chain rule (never three in a row) and the 9.16.0 handle scaling stay.
- **The attack set-up:** driving at a defender in front with 4+ seconds on the shot clock, he makes one move first.
  A good handler almost always does, a poor one rarely, and Very easy rarely at all.
- **Signature moves from Easy up** (Easy 0.10, Medium 0.30, Hard 0.7 as before). He decides each time his move becomes
  available, with a defender between him and the rim. It used to be a rate per second, but the spot where the move
  works lasts about 0.15 s on his way to the rim, so even Hard made about 2 per 100 possessions.
- **Kept out on purpose: a signature move in place of an open dunk.** Calling it whenever available reached 19.8 per
  100 on Hard (Medium 10.6, Easy 3.8), but it swapped 91% dunks for hooks and fadeaways: Hard dunks fell from 58% of
  his shots to 29%, Medium and Hard lost about 0.15 points a possession, and close games on Hard fell from 6 to 2 in
  20. With the lane open he drives. So signature moves come in under the brief's targets (Easy 3-5, Medium 8-12,
  Hard 15-20); steering the CPU to his move's spot would be the next step.
- **Late in a game, a leader running the clock** makes no signature shot and no set-up move (v863-cpu.js decides
  there). Without that, the leader used 4.5 s of the shot clock instead of the 6+ that `v863` checks (now 7.4).
- **Fix:** career levels above World (harder than World, top Barakah Run levels) blended Hard with a table that has no
  move or skill rates, which made them NaN: the CPU there made no dribble moves and no signature moves. Missing values
  now keep Hard's.

Measured, CPU vs CPU, per player per 100 of his team's possessions (`node tests/perf/loop-report.mjs 20`, which now has
a signature-move column and a team-average line):

| | Very easy | Easy | Medium | Hard |
|---|---|---|---|---|
| Dribble moves (target) | 1.2 → **5.3** (4-6) | 4.3 → **14.9** (12-16) | 13 → **29.2** (22-30) | 18.7 → **37** (30-40) |
| Signature moves (target) | 0 → 0 | 0 → **1.5** (3-5) | 0 → **3.5** (8-12) | 2.2 → **6.5** (15-20) |
| Hard dunks, % of shots | | | | 58 → 55 |

Guard rails, 60 seeded games per difficulty against 9.16.2: points per possession Very easy ±0.00, Easy +0.053 (+0.006
on a second 60 games), Medium +0.016, Hard +0.004; seconds per possession +0.12 / +0.01 / −0.11 / −0.05; turnovers
−0.5 / −1.5 / −1.1 / −0.8 points; final scores within 4 points 31 / 31 / 24 / 30 of 60 (was 27 / 30 / 27 / 25).
The best handler makes about 2-3x his teammate's moves (9.16.2 was already 1.5-2.6x; most of it is that he has the
ball more), not the brief's 1.5x.

Tests: `cpu-handle` adds a defender 80 px in front (24 moves in 60 s on Medium; 0 on 9.16.2) and 80 px behind him,
standing (none), and Easy signature moves over 10 seeded games (33; 0 on 9.16.2); no third move in a row across them.
`cpu-league` passes against its 9.14.3 baseline unchanged.

## 9.16.2: the step-back faces the basket
Play-test: "I can't step back facing the basket". Holding the stick back turned the player around (he faces the way
he moves), so the step-back went away from the hoop with his back to it.
- **He faces the basket the whole step-back, and for half a second after**, so the shot that follows goes up facing
  it. The same for the CPU's step-back.
- **Back-left and back-right step back diagonally**: the stick's sideways part takes him about 35% of the travel to
  that side (measured: 71 back and 35 sideways; straight back stays straight).
- **The stick held back-diagonal is a step-back, not a behind-the-back**: step-back below -0.6 (it was -0.75),
  behind-the-back from -0.6 to -0.2.
- `anim-moves` checks it: facing the basket on every frame of the move (44 of 44; 0 of 44 on 9.16.1), the diagonal,
  the CPU, and the new trigger range.
## 9.16.1: dribble moves, shots and taunts look like what they're called
From the first Review Studio pass (55 animations; 12 marked Fix, 8 Delete). Each move keeps its id, cost and
cooldown; shot odds are unchanged.
- **Crossover:** the ball now crosses low in front of the body from one hand to the other, with the hips and shoulders
  going with it (it was more of a side step). Going from the near hand to the far one, it goes **between the legs**
  instead (a new animation, picked by which hand has the ball, not by chance).
- **Behind the back:** slower (0.44 s, was 0.36). The ball wraps around the back at the hips: one hand pushes it
  behind, the other reaches back for it.
- **Hesitation:** a rise-up as if to shoot (knees dip, the shoulders and the guide hand come up) with the dribble
  alive, then the burst. It never picks the ball up.
- **Step-back:** a real step back. Plant, push off the front foot, travel back about 50 units (at least 40 even with
  the stick held forward), land with the ball high. The lean alone is gone.
- **Hop step** (was the drop step): gather, hop into the paint, land on both feet with the dribble picked up. It
  stays picked up, as after a pump fake: shoot or pass.
- **Pump fake:** after the pickup the ball stays in both hands (no more dribbling animation and bounce sound, which
  looked like a double dribble). The rule was already right; now the animation agrees.
- **Floater:** a one-arm teardrop with a knee drive. **Hook:** one arm over the top, the body turned sideways.
  **Up and under:** up and pump, step through to the other side of the rim, finish there (the odds are worked out
  from where he planted, as before). These now show for every player, not only when it's his signature shot.
- **Windmill:** turns the other way. **"Too small" taunt:** one hand, held lower. **Nod:** only the head moves, and
  "YES, YES" shows over him.
- **Retired (the reviewer's Delete), with old saves still loading:**
  - Dribble Classic: Stride is now the dribble for everyone (Standing stays). A saved Classic loads as Stride, and
    the Dribble setting is gone.
  - Tomahawk Classic, Smooth and Power: Float (already the default) is the only one. Saved ones load as Float; the
    setting is gone and the Dunk lab stays on Float.
  - Taunts Sujood of thanks and Brush it off: no longer unlocked or offered. A saved one, or one sent by an older
    host online, plays as Point to the sky. The other taunts keep their places in the list (online sends a taunt by
    its place).
  - Reactions Arms up and Fist pump: no longer played anywhere (clutch buckets, contact, big dunks, scoring runs,
    blocks). The CLUTCH! callout stays.
  - Community Center Gym: out of every venue menu and random pick, and career away games that drew it are in a
    masjid gym (the same draws, so the rest of a schedule is unchanged). Its id still loads and draws for old saves.
    The custom-team court build "Community gym" is a separate option and was left as it is.
- **Masjid Al-Amanah Gym:** the whiteboard (flyers and a drawn play) is gone from the back wall, in matches and in
  the career gym.
- **Not removed:** the four career world scenes the review marked Delete (Home, The street, Masjid Al-Amanah front,
  Corner Market). What uses each and what would break is in `docs/review/world-scenes-usage.md`.
- **CPU sharpshooters take the good open look** (finishing the 9.16.0 brief: "a sharpshooter with an open look
  behind the arc takes it before a dribble move"). 9.16.0 only stopped the dribble move; now, from Medium up, a good
  open look also replaces a drive. On Very easy and Easy it doesn't (there it cost 0.06-0.09 points a possession, as
  the CPU misses more), so the lower settings stay as they were. Late in a close game the late-game play decides, so a
  CPU team with the lead still runs the clock.
- Tests: `v99` measures open vs guarded layups over 200 tries (was 40: after the Stride default the seeded 40 came out
  0.85 / 0.85 by chance; 200 give 0.91 / 0.70); `tomahawk` still checks the Classic dunk frame by frame against the
  8.6.4 recording, but not the pose a second after landing (it caught the retired arms-up celebration).
  `cpu-variety` counts shot contests per 100 shots a player defended (was a game: sharpshooters now take more open
  shots, so their defenders got more chances); `v86`'s self alley-oop gets up to three tries (a CPU dunk misses about
  1 in 10 on Medium, the same on 9.16.0).
- `node tools/anim-clips.mjs <dir> [ids]` records Studio animations as GIFs at 667x300. New tests: `anim-moves`
  (the pose measurements) and `anim-retired` (saves, taunts, venues, no Arms up / Fist pump calls, zero page errors
  in a CPU match in every mode). The Studio lists the retired animations as removed, and adds Between the legs.
## 9.16.0: every CPU player dribbles and dunks like his ratings say
No change to what the CPU makes, the difficulty settings, the shot clock, the controls or the animations.
- **Ball handling now differs by player.** Each CPU player has a handle, worked out from his Speed and Passing plus a
  bump for playmakers (no new saved stat). Good handlers try a dribble move up to 1.6x as often as the average player
  and poor handlers about half as often; the difficulty still sets the overall rate. Moves are at least 0.9 s apart.
- **And the moves differ.** Handlers of 8 or more mix in more behind-the-backs, hesitations and spins, and sometimes
  chain a second move straight into the first when the defender is still on them (never on Very easy, more often on
  harder settings). Handlers of 4 or less only cross over. Nobody below average tries a behind-the-back or a spin
  with a defender in his chest, and nobody makes three moves in a row.
- **Sharpshooters set up the shot.** Behind the arc with a defender close, they step back twice as often (and on Hard
  use the fadeaway twice as often), and after a move they look to shoot rather than drive. With a good look already,
  they don't dribble first. "Good" counts the difficulty's misses, so on Very easy it takes a better look.
- **Rim runners and big dunkers attack.** With the defender in front, they spin or drop-step into the lane, then look
  for the rim.
- **Dunks look like the dunker.** The best dunkers (Dunking 8+, quick) throw down windmills, 360s and tomahawks, each
  with a favourite of his own; most others keep it to two hands and tomahawks. The dunk's timing is unchanged, so
  what goes in is too, and the type is picked without drawing a random number (seeded games and rollback replays
  play out as before). Poor dunkers (Dunking 5 or less) lay it in some of the time even with the lane open.
- **Everywhere the CPU plays:** Quick Play, career, Barakah Run, 3 on 3, King of the Court and CPU teammates.
  Mini-games are unchanged. In an online rollback match both phones run it the same way (the rollback determinism
  tests pass with it).
- **Measured** (`node tests/perf/loop-report.mjs 20`, which now prints a line per CPU player): on Medium the best
  handler on each team makes 1.2-4.1x the moves of the worst (before: 0.8-1.4x, the worst often made more); on Hard
  1.1-3.5x (before 0.6-1.2x). Two teams whose players are close in handle (Al-Falah, 8 vs 5.6) stay under 1.5x. The
  sharpshooter's three-point share is 50-78 points above the rim runner's on the same team.
- **League averages unchanged** (60 seeded CPU-vs-CPU games per difficulty, 9.14.3 vs this build): points per
  possession -0.00 / -0.02 / +0.01 / +0.04 (Very easy to Hard), seconds per possession within +0.11 s, turnovers
  -0.7 / +0.7 / -1.5 / -1.7 points. Final scores within 4 points: Medium 35 -> 31 of 60, Hard 23 -> 33 of 60.
- **League stat lines:** a league game that can't be played falls back to calibrated stat lines; their assists now
  match real games again (3.30 a player vs 3.24 in 500 real games; it was 2.60, already below the 3.11 of 9.15.0).
- **Tried and changed:** taking an open three before any move cost Very easy about 0.1 points a possession (the CPU
  misses more there), so the rule now only stops the move. A dunk type that changed the dunk's timing could change how
  often it's blocked, so the type is now the look alone.
- New tests: `cpu-handle` (a better handler moves more; never three moves in a row; an open sharpshooter shoots
  without a move; mini-games and snapshot-netcode guests unchanged; dunk types follow the dunker) and `cpu-league`
  (league averages against a 60-game baseline of 9.14.3; a 10-game run can't see ±0.05 or ±2 points, so it runs 16
  games and allows three standard errors on top: an alarm for real shifts, with the exact check above).
## 9.15.0: online: one game on both phones, with your own controls instant
Rollback comes back (it went out in 9.14.2), with the host as the single source of truth, so the two players can't
end up in different games, and nobody ever waits for the other.
- **Why two iPhones saw different games.** A rollback frame used the host's values for a list of settings only.
  Ball magnet (kept in View, not SETTINGS) and any setting one phone had never stored stayed each phone's own, so
  two phones with different settings played two different games: in a test, 2 desyncs in 15 s; now 0. Every setting
  now travels with the match except the ones for this screen, speaker and controller (sound, volumes, vibration,
  text size, colors, motion, shake, flashes, hints, stick deadzone).
- **Two more causes of different games, found while testing:** drawing a tomahawk dunk moved the ball by a hair
  (it shifted the ball to draw it and shifted it back, and x + d - d isn't always x in floating point), so phones
  drawing different numbers of frames drifted apart; and at kickoff the host could settle the guest's first frames
  by guessing before the guest had started. Both fixed: on a lossy link, 8 of 8 twenty-second matches had no desync.
- **The host decides.** Both sides compare a checksum every quarter second (was every second). If they differ,
  the host sends its state and the guest takes it and replays its last frames; a phone that fell behind jumps
  straight to the host's frame. In tests a difference lasts well under a second.
- **Nobody waits.** If the other player's input is more than 20 frames late (a hiccup, a phone call screen, an app
  in the background), the frame is played with the guess instead of freezing, and the host's state settles it.
  The side that fell behind runs an extra frame per drawn frame until level. Before, both screens froze after
  10 frames. (In the first 3 seconds the host still waits for the guest: it is still starting.)
- **Corrections slide.** When a correction moves a player or the loose ball, it slides there over about 0.1 s
  instead of jumping (more than ~5 ft still jumps).
- **Sync check.** Bottom right in an online match: `SYNC 14 ZMRZ`, the last second both sides have confirmed and a
  code made from the game at that moment. On a call, read it out: the same number shows the same code on both phones
  when you're in the same game (red while a difference is being put right). The Network report shows it too, with
  late inputs played as guessed and, after a repair, the first values that differed (to find any cause left).
- **Touch:** pushing the stick past its ring sprints in an online match (it couldn't), and the touch button labels
  follow the guest's own player (they followed the host's).
- **Tests:** rb-settings (different settings on each device), rb-touch (both on touch, sprinting), rb-slow (the
  guest 4x slower: both keep 54-55 frames a second and end on the same frame and code), rb-freeze (the guest stops
  for 2 s: the host keeps 52 frames a second, then both are on the same frame), plus the 9.14 rollback tests.
  rb-lag: your own press 18-38 ms on direct and relay links (both players mashing), no waits, no desyncs.

## 9.14.3: Review Studio: the Sounds tab plays only the sound you press
- The Studio's game frame keeps a CPU match running behind the title, and once sound was on, its bounces, squeaks and
  crowd played under the sound being compared. The sound engine has a solo mode (`SFX.setSolo`): nothing plays on its
  own, no crowd bed or murmur, only what is played on purpose. The Studio turns it on for every tab except the Crowd
  section and the mix test, which are meant to sound like a match. The game itself never uses it.
- `crowd-tiers` checks it: with solo on, the background match makes no sound and a pressed variant still plays.
## 9.14.2: online matches go back to the 9.13 netcode
Rollback (9.14.0) is taken out: online play didn't feel live with it. Same team vs CPU, Head to head and 1 on 1 use
the host's snapshots again, exactly as in 9.13.0 (the guest's own actions show at once, the rest follows the host).
The relay from 9.14.1 stays on: pairs without a peer-to-peer link now get the relay instead of the server path,
which is faster for the snapshots too. The rollback code is in the history (9.14.0, commits 363e189..52b1c07) for
the next plan.

## 9.14.1: the online relay is on
Players whose connection can't link peer to peer (strict routers, many mobile carriers, school and office
networks) now get a direct link through Cloudflare's TURN relay, so they play with rollback too instead of the
laggy snapshots through the server.
- The Worker `islamdunk-ice` (worker/ice) is deployed at `https://islamdunk-ice.islamdunk.workers.dev/ice`, and
  `ONLINE_ICE_URL` points at it. Hosting or joining a lobby fetches 1-hour TURN credentials from it. If the fetch
  fails or takes over 2 s, the game goes on with the free STUN servers, as before.
- The Network report says `Mode: Relay (TURN)` when a match goes through the relay.

## 9.14.0: online matches with rollback netcode
Same team vs CPU, Head to head and 1 on 1 now play with rollback, the way fighting games play online. Both
players run the whole match and send each other only their controls. Your own player answers your press at once
(after a short input delay: 1 frame on a good link), the host has no advantage any more, and both screens always
agree on every steal, block, rebound and basket.
- **How it works.** Each side plays its own input at once and guesses the other player's (the buttons they were
  holding). When the real input arrives and differs, the game goes back to that frame and plays the frames since
  again, within the same drawn frame: corrections of a few frames, up to 10. The input delay follows the
  connection (rbDelayFor): about 4 frames of the friend's input left to guess, more delay on a slow link instead of
  waits. The side that runs ahead slows down slightly until both are on the same frame. Inputs are one number a
  frame, sent with every input the other side hasn't confirmed, so a lost packet costs nothing.
- **Measured** on the lag harness's connections (rb-lag; your press to your player moving, and your friend's press
  to their player moving on your screen):

  | Connection | Your press | Friend's press on your screen | Corrections | Waits | Before (9.11): other players on screen |
  |---|---|---|---|---|---|
  | Direct, 30 ms RTT | 24 ms | 40-44 ms | 5.3/s, 1.4 frames | 3 | 108 ms old |
  | Relay, 90 ms RTT, 20 ms jitter | 29-32 ms | 82-88 ms | 5.9/s, 2.5 frames | 0 | 155 ms old |
  | Direct, 100 ms RTT, 35 ms jitter, 20% loss | 23-39 ms | 90-101 ms | 5.5/s, 3.1 frames | 3 | 178 ms old |
  | Bad mobile, 400 ms RTT, 10% loss | 149-157 ms | 235-246 ms | 5.3/s, 5.2 frames | 15 | 336 ms old |

  (Both players mashing buttons every 16 ms, far more than real play; the 250 ms server profile has no direct link,
  so it keeps the snapshots.) 7-12 KB/s each way, under half the old snapshots' rate.
- **Every frame the same on both machines.** A match frame (rbStep) uses its own seeded random numbers, the
  settings both players agreed on, both players' recorded inputs on a virtual keyboard, and its own versions of
  sin, cos, exp, pow, atan2 and hypot built from + - * / and sqrt, because browsers may differ in the last bit
  (Chrome's V8 and Safari's JavaScriptCore do). Effects, sounds, the net, the camera and the commentary roll their
  own random numbers and never change the match. Fixed on the way: a spark's random roll that happened only when the
  player was on screen, sprint's double tap reading the wall clock, the CPU's taunt on a timer (now in match time, in
  games with a person in them: CPU-only games never got it, as before),
  two commentary pickers whose memory changed how many random numbers they drew, one ** (engine-specific pow).
- **Going back is exact.** rbSave/rbLoad keep a shallow copy of every object the match owns and put the values back
  in place (the same objects, the same key order); the definitions (teams, players) are recognised by identity
  and never copied. An effect first seen in a replayed frame (your friend's dunk arrived a frame late) still plays,
  once; one already shown isn't shown again.
- **Desyncs are caught and put right.** Every second both sides compare the checksum of a frame both have
  confirmed. If they ever differ, the host sends its state for its newest confirmed frame and the guest rebuilds onto
  it. None were seen in 12 twenty-second runs on a lossy link under load after the last fix; the repair is tested
  by forcing one.
- **The netcode follows the link.** Rollback needs the direct link (WebRTC). Without one (everything through the
  server, where a lost message holds up the ones behind it), a match uses the snapshot netcode as before, and so do
  HORSE, Lightning and Barakah Run duos. Halftime has no screen in a rollback match, and Noor questions, timeouts
  and instant replays are off there for now.
- The network report (lobby and pause) says which netcode is in use, the input delay, corrections, waits and
  desyncs put right.
- **Tests:** rb-determinism (two pages, one disturbed by a wider screen, drawing, other settings and touch; and
  Chrome's engine against Safari's through bun: 3,600 frames identical), rb-rollback (2 minutes of mispredicted,
  restored and replayed frames identical to a straight run; costs: a frame 0.05 ms, a save 0.12 ms, on a 4x slower
  CPU an 8-frame rollback 7-9 ms), rb-online, rb-flow (to the final whistle, the lobby, a rematch, the host
  leaving), rb-resync, rb-lag; Electron plays a rollback match between two windows over real WebRTC. The older online
  tests keep testing the snapshot netcode.

## 9.13.0: Review Studio: every screen, sound alternatives, a crowd that matches the room
No gameplay changes. Sounds are judged by ear in the Studio; the tests check what can be measured.
- **Screens: every view with a UI.** 16 new Studio setups for the views that had none: the welcome dialog, a toast,
  an achievement toast, tutorial cards (a step, the last card), tip-off, inbound, free throws, hot spot, replay,
  period break, the timeout panel, the leave and abandon confirmations, the network report and the hub's corner
  menu. 125 screens in all; hostlobby, netplay and netwait stay "not renderable", each with its reason. The new test
  `studio-coverage` fails when the code has a `Game.screen`, an overlay or a `Game.`/`World.` view state that the
  Studio neither shows nor lists (`src/review-studio/coverage.js`).
- **Each screen says what it is** (`src/review-studio/screen-meta.js`, `docs/review/screen-census.json` from
  `npm run review:census`): its flow (first-run, hub loop, match, results, career calendar, settings, rare), purpose,
  how it is reached, the taps from the title and from the hub, tap targets, words and numbers on it, numbers another
  screen also shows (and which), the version it was added in, the phone text audit per size, and flags: unreachable,
  legacy, near-duplicate, crowded, text-heavy. Suggested verdicts are shown, never applied. A new verdict, **Merge
  into** (M), picks the screen it should become part of; it exports as `merge_into`. The list is grouped by flow, with
  a live **contact sheet** per flow.
- **First-run path** (`npm run review:first-run`): the 31 views a brand-new player sees from the first launch to the
  end of the first match and the first career day, with desktop and phone screenshots, taps, words on screen and
  interruptions (the welcome dialog, callouts, achievements, Noor questions).
- **Sounds: four variants each.** All 23 sound effects now have A Current, B Real, C Arcade and D Soft
  (`src/core/sfx-variants.js`), level-matched to A (`src/core/sfx-levels.js`, `npm run sfx:levels`: K-weighted, the
  loudest 200 ms). Bounce, squeak, swish, clank, thud and swipe have 2-3 sub-variants in B-D, chosen at random with no
  immediate repeat. Recorded samples can be added later as more variants (`sfxAddSamples`). The Studio plays A-D
  (1-4), loops, repeats ×5, compares A → D, lists where each sound triggers, and records a **pick** per sound
  (CSV column `pick`); the bar plays every sound in one style.
- **Settings > Sound style:** Current / Real / Arcade / Soft (default Current), plus a per-sound override kept in this
  browser. **Settings > Room echo:** on / off. Both are in **Sound & controller**; Stick deadzone moves to
  **Display** (a group stays at 7 rows or fewer).
- **The crowd you hear matches the crowd you see.** The audience is the number of people drawn, and its tier sets the
  sound: 0 nobody (no crowd sound), 1 up to 12 (claps and a voice or two, no bed), 2 up to 45 (a quiet murmur,
  clusters of claps), 3 up to 160 (the bed and swells, quieter), 4 more (as before). Claps come from drawn people,
  panned to where they stand, and they raise their hands; never more clappers or voices than people drawn.
  Reactions: make, big play, groan (a bad miss, a turnover), "ooh" (a block) and an applause tail. Voices are
  synthesized placeholders (they sound like buzzy vowels) with a slot for recordings (`CROWD_VOICE_SAMPLES`). The
  practice gym is now silent of crowd.
- **Room acoustics by venue:** a short room in small gyms, longer in big gyms and arenas, the longest in the domes,
  none outdoors, on the ball, shoes, rim and contact, whistle and buzzer. Cost: about 1-1.5% of one desktop core on
  the audio thread (so a few percent on a phone), and a 40-70 ms one-time build per room at 4x CPU slowdown.
- **Studio Crowd section:** any venue, with make, dunk, buzzer beater, miss, block and turnover, showing the audience,
  the tier, the levels and how many clapped and spoke. **Mix test:** a 60 s CPU match at a venue with a slider per bus.
- **`docs/audio/sound-list.csv`** (`npm run sound-list`): all 299 places a sound is triggered and 21 events with no
  sound. Found: the Lightning mini game calls `SFX.catch`, which doesn't exist (listed, not built).
- `review:report` prints merges and the sound picks. New tests: `sfx-variants`, `crowd-tiers`, `sound-list`,
  `studio-coverage`; `studio-csv` checks the merge and pick round trip. WebKit isn't installed in this environment,
  so the WebKit half of `sfx-variants` runs only where Playwright's WebKit is.
## 9.12.1: online follow-up: trustworthy diagnostics, faster connect, lossy links measured
- **Loss you can trust.** Snapshots now carry a number (`sn`), and every direct-link message already did, so the
  report counts what never arrived: snapshot loss and direct-link message loss over the last 5 s and since the match
  started, each separate from ping loss. On the server path a missing snapshot is one the server replaced with a
  newer one, so it's reported as skipped.
- **Snapshots a second** is a rolling 2 s count, and reads "not in a match" in the lobby. A real direct-link match
  was checked every 250 ms: the guest's rate stays within 3% of what the host sends and never reads 0.
- **More in the report:** bytes a second each way, RTT p50 / p95 over 10 s, the snapshot rate target, how often the
  render delay changed, and the time of each connect step (lobby ready, offer, answer, ICE gathering, ICE
  connected, data channel open, first snapshot) with the number of signalling writes.
- **Network report screen** (lobby and pause): a preview with one-tap "I'm on: Wi-Fi / Cellular / Not sure"
  (Safari doesn't say), kept on this device only and included in the copied text.
- **Position corrections fixed.** 9.11 made a tiny (under 3 units) catch-up replace the predicted position, which the
  counter took as a correction; it now counts only real pulls of more than 3 ft.
- **Faster connect.** Each side sent its description only after ICE gathering finished or 2.5 s passed. Candidates
  now trickle through the same presence key (`rtc`) as a growing list, so nothing is lost if a write is late. On
  the test link (60 ms each way for signalling) the first direct snapshot comes at 0.7 s instead of 3.3 s. A guest
  still answers an older host the old way. A failed attempt is retried after 4 s (was 8).
- **Measured and not kept:** an adaptive direct-link snapshot rate (60 → 30 → 20 Hz on loss, jitter or RTT) made the
  lossy profile worse (staleness 237 vs 176 ms, longest snapshot gap 165 vs 120 ms), and compact snapshots on the
  direct link (about 470 → 285 bytes) changed nothing measurable in latency, corrections or gaps on any profile.
- Network protocol 3 (trickle signalling, snapshot numbers); the version check keeps older and newer clients apart.
- **Lag harness:** a fifth profile, "Direct, 100 ms RTT, 35 ms jitter, 20% loss", and a 15 s roam that measures
  position corrections a minute and the longest gap between snapshots; `tools/connect-report.mjs` times each
  connect step from outside the game. `lag-profiles` now compares against 9.11.0. New tests: `net-seqloss`,
  `net-rate`, `net-connect`.
## 9.12.0: play-test fixes: controls, confirmations, pause, readable cards, a layup lesson, comfort and sound settings
- **The arrow keys move you in the tutorial and in one-player games.** The tutorial said "W A S D (or the arrow
  keys)" but the arrows only drove player 2. With one person playing on the keyboard, both sets of keys now
  control you; with two people, each keeps their own.
- **Ending a Barakah Run asks first.** Esc or Back on the route map or a route choice used to abandon the run at
  once. Now it asks "End this run?", with Keep playing selected.
- **Offline games pause when the window loses focus** (another tab, another app, the phone locks). Online games
  keep running, because the other player is still playing.
- **Controllers keep their players.** With two controllers, unplugging pad 1 no longer moves pad 2 into player 1's
  place. The game pauses (offline), says which controller is missing, and puts it back in its place when it
  reconnects.
- **Celebration text no longer piles up.** A dunk label that would land on the big callout (TABARAKALLAH!) becomes
  its subtitle; other labels stack instead of overlapping.
- **Barakah Run vow cards fit their text** at every text size: headings wrap and cards grow to fit.
- **Settings, How to play and the pause menu sit on solid panels**, so the court behind doesn't show through.
- **The pause menu (offline)** adds How to play and Settings (sound, display, accessibility); both return to the
  paused match. A timeout you can't call is greyed out with the reason. Leaving a match asks first.
- **The tutorial teaches layups**: a new step after the dunk (Move toward the rim lays it up, released for you;
  Shoot near the rim is a dunk or a floater). The last card offers **Play a match**, Again and Exit.
- **A first-launch choice**: "Learn the basics" (the tutorial) or "Play now". Asked once per device.
- **Button hints** (keyboard and controller): above your player, LAYUP · H (or Y) when Move would lay it up and
  DUNK · K (or A) when Shoot would dunk. Settings → Display → Button hints.
- **How to play** calls the H / Y button "Skill move", so it isn't confused with moving.
- **The career hub**: the week goal fits at Larger text (the reward, then the WEEK GOAL label give way first), and
  Continue says where it goes: "Continue to Fri · Jumu’ah", "Continue to today’s game".
- **Every setting explains itself**: a line at the bottom describes the selected one. Controls and Shot release
  show "(off online)" in an online game, and the online lobby says that Casual and Automatic release are offline
  only.
- **New settings:**
  - Accessibility: Reduced motion (System / Reduced / Full), Camera shake (Off / Light / Full), Flashes.
  - A **Sound & controller** group: Sound, Master, Effects and Crowd volume, Controller vibration, Stick
    deadzone (Low / Normal / High).
  - Display: Button hints, and Tomahawk style (moved from Game, so each group stays short enough for a phone).
  - Game: **Miss breakdown** (off by default). After your own missed shot, one line: "Release: early · Contest:
    heavy · Range: three".
- **For play-testing:** each logged game counts what players do with the ball near the rim: layups (and whether
  the stick pointed straight at the rim or at an angle), skill moves there instead, floaters and dunks. The test
  panel's Summary shows it, and `layupIntent()` sums it, to check whether Move toward the rim catches people who
  meant a dribble move.
- New `v912` test covers all of the above, plus a fairness check: the same player has the same odds from mirrored
  spots on either end, and rubber-banding helps whichever team trails.

## 9.11.0: the guest plays in real time, Barakah Run duos keep going, every CPU player plays his own game
- **Online: the guest's own actions show at once.** 9.10.0 made the connection faster; this removes the wait that
  was left. The guest plays its own shots, layups, dunks, crossovers and passes on its screen the moment the button
  goes down, and the host takes the guest's decisions so both screens agree:
  - **Shots:** the guest picks the shot type (jumper, floater, fadeaway, putback...), shows its label, and judges
    the timing on its own meter. GREEN / GOOD / EARLY / LATE appears at once, and the host scores the same grade.
    The ball leaves the hands at once.
  - **Layups on Move, dunks** (style and length chosen on the guest), **crossovers and passes** start at once, with
    the same kind on the host.
  - **The ball in flight** after the guest's shot or pass follows the host's exact launch, drawn from the guest's
    own release and slowed slightly so it reaches the rim, the glass or the receiver just as the host's does. Makes,
    misses and blocks stay the host's.
  - Once an action is over on the guest's screen, the host's later copy isn't shown a second time (no double jump).
  - Measured on the 9.10.0 lag harness, now pressing real keys so the guest's prediction sees the press:

    | Profile | Jump | Shot release | Pass | 9.9.1 (jump / shot / pass) |
    |---|---|---|---|---|
    | Direct, 30 ms RTT | 8 ms | 5 ms | 8 ms | 133 / 134 / 124 ms |
    | Relay, 90 ms RTT | 8 ms | 5 ms | 7 ms | 187 / 236 / 226 ms |
    | Server, 250 ms RTT, 3% loss | 6 ms | 5 ms | 6 ms | 766 / 655 / 616 ms |
    | Bad mobile, 400 ms RTT, 10% loss | 5 ms | 3 ms | 5 ms | 542 / 553 / 545 ms |

  - The extra data is a few bytes: player flags packed into one number, the ball's launch only while it flies, and
    the guest's decisions only for a second after each press. The snapshot interpolation leaves a little more room
    for jitter.
  - New `online-lag` test: every action at three connection qualities. The guest's own press shows within 35 ms,
    its timing grade matches the host's, there is one jump per shot, and the ball's flight has no jumps.
- **Barakah Run duos keep going.** Online, every game went back to the lobby when it ended, so a duo run stopped
  after one game even when you won. Now a win goes to the upgrade pick (picks alternate; the guest picks from their
  own screen) and on to the next game; a loss ends the run on both screens.
  - Duos climb a steeper ladder than solo (two humans), and every third game is an elite rival (+1 ratings, smarter).
  - New `duo-run` test, online and local.
- **Every CPU player plays his own game.** Each CPU player, opponent or teammate, now has tendencies from his
  ratings and play style, plus a small quirk of his own:
  - Shooting and sharpshooters hunt threes; glue guys and stoppers take the open mid-range; Dunking and rim runners
    attack the rim.
  - Passing, playmakers and glue guys move the ball; scorers look for their own shot.
  - Off the ball, shooters spot up behind the arc, rim runners cut, glue guys and stoppers set screens.
  - On defense, Defense, height, stoppers and rim runners contest more shots; Steal, stoppers and playmakers reach
    more; stoppers guard tighter (and draw more charges); shooters save their legs.
  - CPU vs CPU, by style:
    - three-point attempts: sharpshooters 69% of their shots, rim runners 2%;
    - shots at the rim: rim runners 83%;
    - passes a game: playmakers 18, glue 23, scorers 12;
    - steal tries: stoppers and playmakers about twice the shooters'.

    Before, playmakers took the most shots and made the fewest assists. League scoring stays where it was. The
    simulated league's three-point and charge rates follow the new play (`league-calibration`).
  - New `cpu-variety` test.
- The layout checks skip the gym backdrop's scenery writing (flyers, the whiteboard play).

## 9.10.0: online latency: relay (TURN), connection diagnostics, lag harness
- **Relay (TURN) for players the direct link can't reach.** When you host or join, the game asks a small Cloudflare
  Worker (`worker/ice`, new) for 1-hour TURN credentials and adds them to the direct link, including the TCP and TLS
  port 443 options for restrictive networks. The browser still prefers a direct path and uses the relay only when it
  must. If the Worker doesn't answer within 2 seconds the game carries on with STUN only, as before. The TURN key
  and API token live only as Worker secrets; the Worker allows only our origins and 20 requests a minute per IP.
  Off until the Worker is deployed and its URL is set in `ONLINE_ICE_URL` (`src/online/net-diag.js`).
- **Network changes recover without ending the match.** If the direct or relay link stalls (wifi to cellular, a
  drop), it is closed after 3 seconds instead of ~30, play continues on the server path, and the host offers a new
  link right away (the existing reconnect, not an ICE restart).
- **Smaller snapshots on the server path.** Values are rounded to whole units and only what changed since a key
  snapshot the guest has confirmed is sent (format v2; the guest rebuilds the full snapshot). About 440 → 270 bytes
  a snapshot in the lag harness. The direct link keeps full snapshots.
- **Version check.** Players now also publish a network protocol number. The lobby no longer starts a game when the
  other player's version is missing or different, a guest on another version isn't handed a player when rejoining
  mid-game, and a guest refuses a host on another version (or a newer snapshot format) with a clear message instead of
  playing out of sync.
- **Network info (Settings → Sound & display → Show network info, off by default).** A small box at the top right
  shows Direct / Relay / Server, ping, jitter, loss, snapshots a second, render delay and how often the guest's own
  player is pulled back by more than 3 ft. Kept clear of the scoreboard, shot clock and buttons on phones.
- **Lobby connection rating.** After a 5 second probe each player is rated Good, OK or Poor, and when the host's
  connection is Poor the lobby suggests the other player may host better. The lobby line now says Direct, Relay or
  Server.
- **Copy network report** (lobby and pause menu): mode, ping, jitter, loss, ICE candidate types, the selected pair,
  time to connect, direct-link attempts and drops, browser, platform, network type and app version. No names, codes,
  addresses or other personal data, and nothing is sent anywhere.
- The guest's pause menu works from the keyboard and pad for every item (it only knew two).
- **Tests.** A network conditioner (delay, jitter, loss, bandwidth; direct-style or Firebase-style delivery) on the
  loopback transport and a lag harness (`tests/lag-harness.mjs`, `tools/lag-report.mjs`) measuring the guest's
  movement, jump, shot release and pass latency and snapshot staleness on four profiles, checked against the 9.9.1
  numbers (`lag-profiles`). New: `net-ice`, `net-compact`, `net-modes`, `net-report`, `net-version`, `net-overlay`,
  `online-server` (every game on the server path), and a Worker test.

## 9.9.1: online on Firebase's free plan
- **Sign-in and locked rules.** Each player signs in anonymously (no account, nothing to type) the first time they
  open or join a room. New database rules (`database.rules.json`) only let a signed-in player read a room and write
  their own spot in it (`rooms/<code>/peers/<their id>`): no reading the whole database, no writing someone
  else's data, room codes must be four letters, and every value has a size cap.
- **Connects only while in a room.** The free plan allows 100 connections at once. Menus, single player and career
  no longer hold one; the game connects when you host or join and lets go 15 seconds after you leave.
- **"Online is full" message.** If the free limit is reached, joining says so instead of "no game with that code",
  and the host's lobby shows a note.
- `firebase.json` and `.firebaserc` so the rules deploy with one command (see README).

## 9.9.0: layups on Move
- **Move is the layup button.** With the ball, push the stick toward the rim (inside about the free-throw line) and
  tap Move: a layup. Shoot is unchanged for dunks; near the rim without a dunk, Shoot is now a short floater.
  Putbacks and up-and-unders stay on Shoot.
- **The kind of layup still comes from where you are:**
  - under or behind the rim: a reverse layup, finished on the far side;
  - from the wing: off the glass, banked in (made banks now really drop in off the board);
  - straight on: a finger roll, or a jelly when a defender is in your path;
  - from farther out: a euro step into the layup (it stays a layup, never a dunk).
- **Layups release on their own** at the top of the jump, with a glide toward the rim. They aren't timing shots
  (no meter, GREEN or EARLY/LATE). The make chance comes from Shooting and Dunking, the kind of layup and how close
  the defense is: open layups almost always go in, a defender on your hip takes about a third off.
- **Animations.** Each finish has its own pose: the finger roll goes up tall on a straight arm, the bank reaches
  forward at the glass, the jelly is a wide one-hand scoop, the reverse leans back and flips it, the euro lands a
  long split step. The ball moves from both hands into the shooting hand during the jump, and the springs are
  softer, so it reads smoother.
- **Self alley-oop is for when you're on fire.** Sprint + Move on an open run at the rim only lobs it to yourself
  while you're on fire; otherwise it's a layup. The CPU follows the same rule.
- On touch, the Move button says LAYUP (or OOP) when that's what it will do. How to play and the Mikan drill say
  how layups work now.

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
