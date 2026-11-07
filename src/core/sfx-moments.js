// ================================================= v9.17.5: A SOUND FOR EVERY MOMENT (no music)
// 17 more sound ids, each in the four styles (A Current, B Real, C Arcade, D Soft), procedural like the rest. They're
// in SFX_IDS, so the Sound style setting, the per-sound picks, the level matching (SFX_LEVELS), the Studio's Sounds tab
// and the online replay rules (rollback mutes them in replayed frames) all apply. Where each plays: sfx-moments-hooks.js.
//   in a match     shotTick (the last 3 s of the shot clock, higher each second), ftStep, ftAttempt, hotSpot,
//                  crowdTurnover / crowdBlock / crowdBadMiss (a few voices, when nobody is drawn; scaled by the
//                  venue's crowd level, so the practice gym is silent), catch (Lightning's fed ball)
//   between plays  halftimeStinger, winStinger, lossStinger (calm, never mocking), earnTick, triviaLow
//   menus, career  uiBack, uiConfirm, toast (quieter than blip), calChime (two notes: no adhan, Quran or takbir)
// No music anywhere: a stinger is two or three notes, under a second.
const SFX_MOMENTS = ['shotTick', 'ftStep', 'ftAttempt', 'hotSpot', 'crowdTurnover', 'crowdBlock', 'crowdBadMiss', 'catch',
  'halftimeStinger', 'winStinger', 'lossStinger', 'earnTick', 'triviaLow', 'uiBack', 'uiConfirm', 'toast', 'calChime'];
Object.assign(SFX_WHERE, {
  shotTick: 'The last 3 seconds of the shot clock: a quiet tick each second, a little higher each time',
  ftStep: 'A player stepping to the free throw line', ftAttempt: 'Each free throw attempt (a soft "ready")',
  hotSpot: 'A hot spot appearing on the floor', crowdTurnover: 'The crowd after a turnover (when nobody in the crowd is drawn)',
  crowdBlock: 'The crowd after a block (when nobody in the crowd is drawn)', crowdBadMiss: 'The crowd after a bad miss (when nobody in the crowd is drawn)',
  catch: 'Lightning: a fed ball caught', halftimeStinger: 'The halftime screen', winStinger: 'The final screen after a win',
  lossStinger: 'The final screen after a loss (calm)', earnTick: 'Barakah Points and Halal Bucks counting in after a career game',
  triviaLow: 'The last 5 seconds of a trivia question', uiBack: 'Back or Esc out of a screen', uiConfirm: 'Yes or No in a confirmation',
  toast: 'A message at the bottom of the screen (saved, copied)', calChime: 'A new month, Ramadan, Eid or a holiday in the career calendar'
});
for (const id of ['ftStep', 'ftAttempt', 'catch', 'shotTick']) SFX_ROOM.add(id);
// each variant's trim (dB): the four land on one level, the match sounds at least 10 dB under the swish (-30.5 dB),
// menu sounds at least 12 dB under it, the toast under the blip; measured by tools/sfx-levels.mjs before the trim
const SFX_MOMENT_TRIM = {
  shotTick: { A: -0.1, B: 5.5, C: -0.3, D: -3.2 },
  ftStep: { A: -0.8, B: 5.6, C: -0.7, D: 6.3 },
  ftAttempt: { A: -7.5, B: -8.5, C: 3.8, D: -10.2 },
  hotSpot: { A: -2.5, B: -2.7, C: 0.0, D: -4.0 },
  crowdTurnover: { A: -0.5, B: -0.9, C: -4.4, D: 1.6 },
  crowdBlock: { A: 0.2, B: -0.9, C: -3.5, D: 2.6 },
  crowdBadMiss: { A: -0.1, B: 0.1, C: -3.1, D: 2.1 },
  catch: { A: -10.0, B: -8.3, C: 0.6, D: -10.9 },
  halftimeStinger: { A: -3.8, B: -5.6, C: -2.7, D: -5.9 },
  winStinger: { A: -4.7, B: -3.9, C: -4.0, D: -5.8 },
  lossStinger: { A: -5.5, B: -4.7, C: -3.0, D: -6.1 },
  earnTick: { A: -0.2, B: 11.1, C: 2.1, D: -3.9 },
  triviaLow: { A: 0.0, B: 12.2, C: 1.2, D: -4.4 },
  uiBack: { A: -0.3, B: -0.6, C: -4.8, D: -5.3 },
  uiConfirm: { A: -0.6, B: -0.6, C: -2.0, D: -3.9 },
  toast: { A: -0.2, B: -3.0, C: -0.9, D: -5.0 },
  calChime: { A: -7.9, B: -6.6, C: -2.1, D: -7.7 }
};

{
  const S = SFX, K = S.kit, { tn, nz, ring, thump } = K;
  // a few crowd voices: noise through a vowel's two formants, staggered; nothing at a crowd level of 0
  const FORM = { aw: [700, 1100], oh: [500, 880], ooh: [320, 820], ah: [760, 1250] };
  const voices = (word, n, g, len, o = {}) => {
    const L = S.crowdLevel; if (!(L > 0)) return;
    for (let i = 0; i < n; i++) {
      const [f1, f2] = FORM[word], p = 0.85 + Math.random() * 0.35, d = (o.d || 0) + i * (o.gap || 0.07) + Math.random() * 0.05, k = g * L * (1 - i * 0.12);
      nz(len, 'bandpass', f1 * p, o.q || 5, k, { d, att: o.att || 0.05, f2: f1 * p * (o.fall || 0.85) });
      nz(len * 0.9, 'bandpass', f2 * p, (o.q || 5) * 1.2, k * 0.6, { d, att: o.att || 0.05, f2: f2 * p * (o.fall || 0.85) });
    }
  };
  // A: in the style of the shipped sounds (S.tone / S.hiss)
  const A = {
    shotTick(sec = 3) { S.tone(820 + (3 - sec) * 130, 0.05, 'square', 0.022); },
    ftStep() { S.tone(rand(1700, 2000), 0.05, 'sine', 0.022, 2500); S.hiss(0.04, 'lowpass', 380, 0.8, 0.06, null, 0.06); },
    ftAttempt() { S.tone(150, 0.07, 'sine', 0.14, 80); S.tone(520, 0.05, 'triangle', 0.025, null, 0.02); },
    hotSpot() { S.tone(880, 0.32, 'sine', 0.028, 1760); S.tone(1320, 0.3, 'sine', 0.018, 2640, 0.06); S.hiss(0.25, 'highpass', 6000, 0.7, 0.012, null, 0.05); },
    crowdTurnover() { voices('aw', 3, 0.05, 0.45, { gap: 0.08 }); },
    crowdBlock() { voices('ooh', 3, 0.05, 0.5, { gap: 0.05, fall: 1.15 }); },
    crowdBadMiss() { voices('oh', 2, 0.05, 0.55, { gap: 0.1 }); },
    catch() { S.tone(140, 0.08, 'sine', 0.2, 70); S.hiss(0.03, 'lowpass', 700, 0.8, 0.08); },
    halftimeStinger() { S.tone(523, 0.3, 'triangle', 0.05); S.tone(392, 0.45, 'triangle', 0.05, null, 0.24); },
    winStinger() { S.tone(523, 0.18, 'triangle', 0.05); S.tone(659, 0.18, 'triangle', 0.05, null, 0.16); S.tone(784, 0.55, 'triangle', 0.055, null, 0.32); },
    lossStinger() { S.tone(440, 0.35, 'sine', 0.045); S.tone(349, 0.6, 'sine', 0.04, null, 0.3); },
    earnTick() { S.tone(1400, 0.03, 'sine', 0.02); },
    triviaLow() { S.tone(900, 0.04, 'sine', 0.022); },
    uiBack() { S.tone(620, 0.05, 'square', 0.016, 420); },
    uiConfirm() { S.tone(700, 0.04, 'sine', 0.035); S.tone(940, 0.06, 'sine', 0.035, null, 0.04); },
    toast() { S.tone(1050, 0.035, 'sine', 0.014); },
    calChime() { S.tone(784, 0.6, 'sine', 0.04); S.tone(1568, 0.25, 'sine', 0.008); S.tone(1047, 0.8, 'sine', 0.04, null, 0.22); S.tone(2094, 0.3, 'sine', 0.008, null, 0.22); }
  };
  // B: Real
  const B = {
    shotTick(sec = 3) { const f = 1500 + (3 - sec) * 220; ring(f, 0.035, 0.12, 12); tn(f, 0.03, 'sine', 0.012); },
    ftStep() { const k = K.sub('ftStepB', 2); nz(0.05, 'lowpass', [420, 360][k], 0.8, 0.09, { att: 0.004 }); tn([2300, 2600][k], 0.05, 'sawtooth', 0.006, { lp: 3200, f2: [2700, 3000][k], d: 0.05 }); },
    ftAttempt() { const k = K.sub('ftAttB', 2), f = [118, 128][k]; thump(f, 60, 0.07, 0.16); ring(f * 8, 0.04, 0.035, 7); },
    hotSpot() { [1568, 2093, 2637].forEach((f, i) => { tn(f, 0.4, 'sine', 0.014, { d: i * 0.05, att: 0.01 }); tn(f * 2.76, 0.12, 'sine', 0.003, { d: i * 0.05 }); }); },
    crowdTurnover() { voices('aw', 3, 0.05, 0.42, { gap: 0.09, q: 4 }); },
    crowdBlock() { voices('ooh', 3, 0.05, 0.48, { gap: 0.04, fall: 1.2, q: 4 }); },
    crowdBadMiss() { voices('oh', 3, 0.045, 0.5, { gap: 0.11, q: 4 }); },
    catch() { const k = K.sub('catchB', 2); thump([150, 135][k], 75, 0.06, 0.2); nz(0.025, 'bandpass', 1300, 1.2, 0.06); },
    halftimeStinger() { tn(523, 0.5, 'sine', 0.04, { att: 0.005 }); tn(523 * 2.76, 0.15, 'sine', 0.006); tn(392, 0.7, 'sine', 0.04, { d: 0.25, att: 0.005 }); tn(392 * 2.76, 0.15, 'sine', 0.006, { d: 0.25 }); },
    winStinger() { [523, 659, 784].forEach((f, i) => { tn(f, i === 2 ? 0.7 : 0.3, 'sine', 0.035, { d: i * 0.15, att: 0.005 }); tn(f * 2, 0.2, 'sine', 0.008, { d: i * 0.15 }); }); },
    lossStinger() { tn(440, 0.5, 'sine', 0.035, { att: 0.01 }); tn(330, 0.8, 'sine', 0.032, { d: 0.32, att: 0.01 }); },
    earnTick() { ring(2400, 0.025, 0.06, 14); },
    triviaLow() { ring(1600, 0.03, 0.07, 12); },
    uiBack() { nz(0.006, 'bandpass', 2400, 1.2, 0.08); tn(820, 0.02, 'sine', 0.03); },
    uiConfirm() { nz(0.006, 'bandpass', 3200, 1.2, 0.1); tn(1150, 0.02, 'sine', 0.05); tn(1530, 0.025, 'sine', 0.04, { d: 0.035 }); },
    toast() { tn(1300, 0.03, 'sine', 0.02, { att: 0.004 }); },
    calChime() { [784, 1047].forEach((f, i) => { tn(f, 1.0, 'sine', 0.03, { d: i * 0.25, att: 0.004 }); tn(f * 2.76, 0.3, 'sine', 0.006, { d: i * 0.25 }); tn(f * 5.4, 0.1, 'sine', 0.002, { d: i * 0.25 }); }); }
  };
  // C: Arcade
  const C = {
    shotTick(sec = 3) { tn(988 + (3 - sec) * 165, 0.05, 'square', 0.022); },
    ftStep() { tn(1800, 0.04, 'square', 0.012, { f2: 2700 }); tn(150, 0.05, 'square', 0.02, { d: 0.05, f2: 80 }); },
    ftAttempt() { tn(660, 0.06, 'square', 0.03); },
    hotSpot() { [784, 988, 1175, 1568].forEach((f, i) => tn(f, 0.1, 'square', 0.018, { d: i * 0.045 })); },
    crowdTurnover() { voices('aw', 3, 0.06, 0.4, { gap: 0.06, q: 3 }); },
    crowdBlock() { voices('ooh', 3, 0.06, 0.45, { gap: 0.04, fall: 1.3, q: 3 }); },
    crowdBadMiss() { voices('oh', 3, 0.055, 0.45, { gap: 0.08, q: 3 }); },
    catch() { tn(220, 0.07, 'square', 0.05, { f2: 110 }); },
    halftimeStinger() { tn(784, 0.15, 'square', 0.03); tn(523, 0.3, 'square', 0.03, { d: 0.17 }); },
    winStinger() { [523, 659, 784, 1047].forEach((f, i) => tn(f, i === 3 ? 0.45 : 0.12, 'square', 0.03, { d: i * 0.1 })); },
    lossStinger() { tn(392, 0.25, 'triangle', 0.045); tn(330, 0.5, 'triangle', 0.04, { d: 0.25 }); },
    earnTick() { tn(1760, 0.025, 'square', 0.012); },
    triviaLow() { tn(1046, 0.04, 'square', 0.014); },
    uiBack() { tn(660, 0.03, 'square', 0.03); tn(440, 0.03, 'square', 0.02, { d: 0.025 }); },
    uiConfirm() { tn(880, 0.03, 'square', 0.04); tn(1175, 0.04, 'square', 0.035, { d: 0.03 }); },
    toast() { tn(1320, 0.03, 'square', 0.012); },
    calChime() { tn(784, 0.25, 'square', 0.02); tn(1047, 0.45, 'square', 0.02, { d: 0.2 }); }
  };
  // D: Soft
  const D = {
    shotTick(sec = 3) { tn(700 + (3 - sec) * 100, 0.06, 'sine', 0.04, { att: 0.005 }); },
    ftStep() { nz(0.06, 'lowpass', 320, 0.7, 0.1, { att: 0.008 }); },
    ftAttempt() { thump(110, 70, 0.08, 0.16, 0, 260); },
    hotSpot() { tn(660, 0.45, 'sine', 0.04, { f2: 1320, att: 0.03 }); },
    crowdTurnover() { voices('aw', 2, 0.045, 0.5, { gap: 0.12, q: 6, att: 0.08 }); },
    crowdBlock() { voices('ooh', 2, 0.045, 0.55, { gap: 0.08, fall: 1.1, q: 6, att: 0.08 }); },
    crowdBadMiss() { voices('oh', 2, 0.045, 0.55, { gap: 0.14, q: 6, att: 0.08 }); },
    catch() { thump(120, 70, 0.08, 0.2, 0, 280); },
    halftimeStinger() { tn(440, 0.45, 'sine', 0.05, { att: 0.03 }); tn(330, 0.6, 'sine', 0.045, { d: 0.25, att: 0.03 }); },
    winStinger() { tn(440, 0.3, 'sine', 0.05, { att: 0.03 }); tn(554, 0.3, 'sine', 0.05, { d: 0.18, att: 0.03 }); tn(659, 0.6, 'sine', 0.05, { d: 0.36, att: 0.03 }); },
    lossStinger() { tn(392, 0.5, 'sine', 0.045, { att: 0.04 }); tn(294, 0.7, 'sine', 0.04, { d: 0.32, att: 0.04 }); },
    earnTick() { tn(1100, 0.04, 'sine', 0.03, { att: 0.006 }); },
    triviaLow() { tn(740, 0.05, 'sine', 0.035, { att: 0.006 }); },
    uiBack() { tn(480, 0.05, 'sine', 0.04, { f2: 360, att: 0.006 }); },
    uiConfirm() { tn(520, 0.05, 'sine', 0.05, { att: 0.006 }); tn(660, 0.07, 'sine', 0.05, { d: 0.05, att: 0.006 }); },
    toast() { tn(880, 0.04, 'sine', 0.025, { att: 0.006 }); },
    calChime() { tn(587, 0.7, 'sine', 0.04, { att: 0.02 }); tn(784, 0.9, 'sine', 0.04, { d: 0.28, att: 0.02 }); }
  };
  for (const id of SFX_MOMENTS) {
    SFX_IDS.push(id);
    const tr = k => Math.pow(10, (SFX_MOMENT_TRIM[id][k] || 0) / 20);
    SFX_VARIANTS[id] = { A: { label: 'Current', fn: A[id], gain: tr('A') }, B: { label: 'Real', fn: B[id], gain: tr('B') }, C: { label: 'Arcade', fn: C[id], gain: tr('C') }, D: { label: 'Soft', fn: D[id], gain: tr('D') } };
    S[id] = S.dispatcher(id);
  }
}
