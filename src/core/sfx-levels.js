// v9.13: level matching for the sound variants (dB added to each variant so it is about as loud as A, the current
// sound). Written by tools/sfx-levels.mjs (short-term loudness, K-weighted, the loudest 200 ms window, the average
// of 16 renders); the sfx-variants test checks it still holds.
const SFX_LEVELS = {
  bad: { B: -0.4, C: -4.5, D: -6 },
  best: { B: -0.4, C: 1, D: -1.6 },
  blip: { B: -2.3, C: -3.6, D: -1.4 },
  block: { B: 1.9, C: 4.7, D: 3.3 },
  board: { B: -2.6, C: -3.9, D: -2.5 },
  bounce: { B: 0.1, C: -1.1, D: -0.9 },
  buzzer: { B: 1.1, C: -2.2, D: 0.6 },
  cheer: { B: 5.1, C: -4.4, D: 3.7 },
  clank: { B: 0.4, C: 0.4, D: 1.6 },
  dunkNet: { B: -2.7, C: -0.6, D: -0.1 },
  good: { B: -5.1, C: 1.6, D: -1.8 },
  green: { B: -2, C: 3.2, D: 2.5 },
  greenMake: { B: -0.7, C: 2.8, D: 0.6 },
  heart: { B: -2.7, C: -0.6, D: 0.6 },
  netSwish: { B: 2, C: -0.2, D: 0.9 },
  rimTick: { B: -2, C: -1.2, D: -0.6 },
  slam: { B: 1.4, C: -3.1, D: 1.2 },
  snatch: { B: -5.3, C: -0.1, D: 4.4 },
  squeak: { B: 1.6, C: 1.1, D: 1.5 },
  swipe: { B: -4.6, C: -0.8, D: 0.4 },
  swish: { B: 2.1, C: -0.2, D: 1 },
  thud: { B: -0.4, C: -1, D: 0.1 },
  whistle: { B: -0.4, C: 5.1, D: 0.1 }
};
