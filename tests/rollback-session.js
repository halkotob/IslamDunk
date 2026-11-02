// v9.14 rollback: one scripted 2-player match played with rbStep(), returning the match checksum after every frame.
// Run in a page (rb-determinism, rb-rollback) or in JavaScriptCore (tests/rollback-jsc.mjs). globalThis.__P:
//   frames   how many frames to play
//   noisy    disturb everything that must NOT change the match: this device's settings, touch mode, keys held on this
//            keyboard, the screen drawn every frame, the net's cords, and extra random numbers drawn between frames
//   rollback every 30 frames: save, play 8 frames with player 2's input guessed wrong (as a prediction would), go back
//            and play the same 8 frames again with the right input (as a replayed frame); the checksums must match a
//            straight run
(() => {
  const { frames, noisy, dump, rollback } = globalThis.__P;
  window.__seed(12345); rbClean();
  newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }, { team: 1, slot: 0, pad: 1 }], fmt: { format: 'quarters', len: 120 } });
  Game.screen = 'play'; Game.paused = false; M.introT = 0; Game.trivia = null; for (const q of M.players) q.hifzUsed = true;
  M.rbSeed = 4242; RB.cfg = rbConfig({ difficulty: 'medium', dribble: 'classic', teamCtl: 'single', fun: false, rubber: true, tomahawk: 0 });
  if (noisy) { Object.assign(SETTINGS, { casual: true, dribble: 'stride', difficulty: 'hard', autoShot: true }); Input.touchMode = true; Input.down.KeyW = true; Input.down.ArrowLeft = true; Input.pressed.KeyK = true; }
  // the players' hands, worked out in advance (so a replayed frame gets the same input)
  const hands = seed => {
    let s = seed; const R = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; };
    const held = [0, 0], out = [];
    for (let f = 0; f < frames; f++) out.push([0, 1].map(k => {
      let h = held[k];
      for (let i = 0; i < RB_BTN.length; i++) { const bit = 1 << i, mv = i < 4, on = h & bit; if (on ? R() < (mv ? 0.03 : 0.25) : R() < (mv ? 0.02 : 0.012)) h ^= bit; }
      const I = { h, p: h & ~held[k], r: held[k] & ~h, mx: 0, mz: 0 }; held[k] = h;
      if (k === 1 && (f >> 7) & 1) { const a = f * 0.05; I.mx = Math.round(Math.cos(a) * 100) / 127; I.mz = Math.round(Math.sin(a) * 100) / 127; }   // player 2 on a stick half the time
      return I;
    }));
    return out;
  };
  const IN = hands(777), WRONG = rollback ? hands(31337) : null;
  const sums = [], after = () => { if (noisy) { for (let i = 0; i < 7; i++) Math.random(); try { render(ctx); rbNets(STEP); } catch (e) {} } };
  for (let f = 0; f < frames; f++) {
    if (rollback && f % 30 === 0 && f + 8 <= frames && M.phase !== 'over') {
      const S = rbSave();
      for (let j = 0; j < 8; j++) { rbStep([IN[f + j][0], WRONG[f + j][1]]); after(); }   // predicted: player 2 guessed wrong
      rbLoad(S);
      for (let j = 0; j < 8; j++) { rbStep(IN[f + j], true); sums.push(rbHash()); if (dump === f + j) return { dump: rbStateLines() }; }   // replayed with the real input
      after(); f += 7; continue;
    }
    rbStep(IN[f]); after();
    sums.push(rbHash());
    if (dump != null && f === dump) return { dump: rbStateLines() };
    if (M.phase === 'over') break;
  }
  return { sums, score: M.teams.map(t => t.score) };
})()
