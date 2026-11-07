// ================================================= v9.17.4: THE FIRST MATCH IS FRIENDLY
// (docs/IMPROVEMENTS.md GT1, GT2.) Before: a newcomer's first Quick Play match was Medium (SETTINGS.difficulty starts
// there, and difficulty isn't stored), and Miss breakdown was off, so a missed shot was never explained.
//   * A new player (no games on this device: Profile stats.games 0, and never picked a difficulty: the key
//     islamdunk.difficulty.chosen, set by the Difficulty rows in Settings and the mini-games menu) plays the first
//     Quick Play match (one or two players) on Easy. Nothing calls it an easy mode.
//   * After that match, a win puts one line in the result screen's hint row: "You won on Easy. Try Medium?" with a
//     button (or Up / M). Enter still continues. Shown once: leaving the screen dismisses it for good. After a loss,
//     nothing.
//   * Miss breakdown is three-state (islamdunk.misswhy: missing = default, '1', '0'). Unset, it's on for the player's
//     first 5 games, then off, and the next result screen says so once. An explicit choice is never changed.
//     The default applies to Quick Play-style matches; career, online, King of the Court and the mini-games keep Off
//     unless the player turned it on.
const FIRST = { games: () => { try { return Profile.load().stats.games | 0; } catch (e) { return 0; } } };
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function diffChosen() { lsSet('islamdunk.difficulty.chosen', '1'); }
function isNewPlayer() { return FIRST.games() === 0 && lsGet('islamdunk.difficulty.chosen') == null; }
function missWhyStored() { const v = lsGet('islamdunk.misswhy'); return v === '1' || v === '0' ? v : null; }
// unset: on until 5 games (so Settings shows it as it is); each match sets it again in newMatch below
if (missWhyStored() == null) SETTINGS.missWhy = FIRST.games() < 5;
{
  // the first Quick Play match: Easy for a new player who hasn't touched the difficulty
  const _sm = startMatchFromSelect;
  startMatchFromSelect = function () {
    const first = isNewPlayer() && SETTINGS.difficulty === 'medium';
    if (first) SETTINGS.difficulty = 'easy';
    const r = _sm.apply(this, arguments);
    M.firstEasy = first;
    return r;
  };
  // (M is one object reused by every match: each match gets a number, and the first-match mark is cleared)
  const _nm = newMatch;
  newMatch = function () { const r = _nm.apply(this, arguments); FINAL_NOTE.gen++; M.firstEasy = false; return r; };
  // Miss breakdown, unset: on for the first 5 games, in a Quick Play-style match. Decided as each shot goes up (King of
  // the Court and the mini-games mark the match after newMatch, so it can't be decided there); the shot is unchanged.
  const _rs = releaseShot;
  releaseShot = function (p) {
    if (missWhyStored() == null) {
      const quick = !M.career && !M.kotc && !M.mini && !M.online && !M.attract && !M.practice && !Net.role && !(typeof RBN !== 'undefined' && RBN.on) && !(typeof TUT !== 'undefined' && TUT.on);
      SETTINGS.missWhy = FIRST.games() < 5 && quick;
      try { return _rs.apply(this, arguments); } finally { SETTINGS.missWhy = FIRST.games() < 5; }   // (Settings shows the default)
    }
    return _rs.apply(this, arguments);
  };
  // leaving the result screen: the step-up offer counts as seen
  const _fc = finalContinue;
  finalContinue = function () { if (FINAL_NOTE.kind === 'stepup' && FINAL_NOTE.m === FINAL_NOTE.gen) lsSet('islamdunk.stepup', '1'); return _fc.apply(this, arguments); };
  const _rm = rematch;
  rematch = function () { if (FINAL_NOTE.kind === 'stepup' && FINAL_NOTE.m === FINAL_NOTE.gen) lsSet('islamdunk.stepup', '1'); return _rm.apply(this, arguments); };
  // Up or M on the result screen: Try Medium
  const _fu = finalUpdate;
  finalUpdate = function () {
    if (FINAL_NOTE.kind === 'stepup' && FINAL_NOTE.m === FINAL_NOTE.gen && !FINAL_NOTE.done && (menuHit('up') || Input.pressed.KeyM)) { stepUpToMedium(); return; }
    return _fu.apply(this, arguments);
  };
}
// the one line the result screen can carry (in place of its hint row)
const FINAL_NOTE = { gen: 0, m: -1, kind: null, done: false };
function finalNoteFor() {
  if (FINAL_NOTE.m === FINAL_NOTE.gen) return FINAL_NOTE.kind;
  FINAL_NOTE.m = FINAL_NOTE.gen; FINAL_NOTE.kind = null; FINAL_NOTE.done = false;
  if (M.career || M.online || Net.role || M.attract) return null;
  const me = M.players && M.players.find(p => p.human === 0);
  if (M.firstEasy && me && M.winner === me.team && lsGet('islamdunk.stepup') == null && SETTINGS.difficulty === 'easy') FINAL_NOTE.kind = 'stepup';
  else if (missWhyStored() == null && FIRST.games() >= 5 && lsGet('islamdunk.misswhy.note') == null) { FINAL_NOTE.kind = 'missoff'; lsSet('islamdunk.misswhy.note', '1'); SETTINGS.missWhy = false; }
  return FINAL_NOTE.kind;
}
function stepUpToMedium() { SETTINGS.difficulty = 'medium'; diffChosen(); lsSet('islamdunk.stepup', '1'); FINAL_NOTE.done = true; SFX.good && SFX.good(); }
// drawn by drawFinalScreen at its hint row; returns whether it drew something there
function drawFinalNote(g) {
  const k = finalNoteFor(); if (!k) return false;
  g.save(); g.textAlign = 'center'; g.font = `14px ${BODY}`;
  if (k === 'missoff') { g.fillStyle = IVORY; g.fillText('Miss breakdown is now off. Turn it on in Settings.', W / 2, 510); }
  else if (FINAL_NOTE.done) { g.fillStyle = '#9dffb0'; g.fillText('Next match: Medium.', W / 2, 510); }
  else {
    const txt = 'You won on Easy.', tw = g.measureText(txt).width, bw = 170, x0 = W / 2 - (tw + 12 + bw) / 2;
    g.textAlign = 'left'; g.fillStyle = IVORY; g.fillText(txt, x0, 510);
    uiButton(g, x0 + tw + 12, 492, bw, 28, 'Try Medium? (↑)', stepUpToMedium, false);
  }
  g.restore(); return true;
}
