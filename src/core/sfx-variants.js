// ================================================= v9.13: SOUND VARIANTS (A: Current, B: Real, C: Arcade, D: Soft)
// Every sound effect has four versions made by the same procedural engine (Web Audio, no files):
//   A  Current  the sound as it shipped (the function each SFX.<id> was before this file)
//   B  Real     naturalistic: layered noise bursts and a resonant body (rim, ball, net), shorter and drier
//   C  Arcade   punchy and exaggerated, NBA Jam energy
//   D  Soft     muted and gentle, comfortable in a masjid
// The often-repeated sounds (bounce, squeak, swish, clank, thud, swipe) have 2-3 sub-variants in B, C and D, picked at
// random with no immediate repeat. Every variant is played through its own gain so all four are about as loud as A
// (SFX_LEVELS, measured by tools/sfx-levels.mjs; the sfx-variants test checks it).
// Which one plays: Settings > Sound style (Current / Real / Arcade / Soft, default Current), then a per-sound override
// map (SFX_DEFAULT_PICKS, set from the reviewers' sound picks; a browser's own overrides in localStorage win).
// Recorded samples can be added later as more variants of the same ID: sfxAddSamples('bounce', 'E', 'Recorded', [urls]).
// Nothing else in the game changes: other files' wrappers (rumble on slam, the impact ring) wrap the dispatcher.
const SFX_IDS = ['bad', 'best', 'blip', 'block', 'board', 'bounce', 'buzzer', 'cheer', 'clank', 'dunkNet', 'good', 'green', 'greenMake', 'heart', 'netSwish', 'rimTick', 'slam', 'snatch', 'squeak', 'swipe', 'swish', 'thud', 'whistle'];
const SFX_STYLES = { A: 'Current', B: 'Real', C: 'Arcade', D: 'Soft' };
const SFX_DEFAULT_PICKS = {};        // id -> 'A'..'D': the defaults chosen in the Studio (none yet)
// sounds that happen in the room (ball, shoes, contact, rim and net, whistle, buzzer): they also feed the room's reverb
const SFX_ROOM = new Set(['block', 'board', 'bounce', 'buzzer', 'clank', 'dunkNet', 'netSwish', 'rimTick', 'slam', 'snatch', 'squeak', 'swipe', 'swish', 'thud', 'whistle']);
// where each one is heard (the Studio shows this; docs/audio/sound-list.csv has every call)
const SFX_WHERE = {
  bad: 'A wrong answer, a locked item, a failed action in menus and drills', best: 'A personal best or a goal completed',
  blip: 'Menu moves and taps', block: 'A blocked shot', board: 'The ball off the backboard', bounce: 'Every dribble and loose-ball bounce',
  buzzer: 'End of a period or the game, shot clock violation', cheer: 'The crowd after makes, steals, blocks and big plays (scaled by the venue)',
  clank: 'A shot off the rim', dunkNet: 'The net after a dunk', good: 'A right answer or a confirmed choice', green: 'A perfectly timed release (GREEN)',
  greenMake: 'A green release that goes in', heart: 'Clutch moments (heartbeat)', netSwish: 'A make through the net (speed sets the sound)',
  rimTick: 'A make that touches the rim', slam: 'A dunk', snatch: 'A steal or a picked-off pass', squeak: 'Sneakers on a cut or a stop',
  swipe: 'A steal attempt (the reach)', swish: 'Older callers of the swish (mini games, drills)', thud: 'A player knocked down or a hard foul', whistle: 'A foul or a violation'
};
const SFX_VARIANTS = {};             // id -> { A: { label, fn }, B..D, and any recorded ones }
{
  const S = SFX;
  // ---- building blocks (all connect to S.out, which the dispatcher points at the variant's own gain)
  const at = d => S.ctx.currentTime + (d || 0);
  const env = (a, t, g, att, dur) => { a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t + att); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  // a tone with an optional low-pass and a fast or slow attack
  const tn = (f, dur, type, g, o = {}) => {
    const c = S.ctx; if (!c) return; const t = at(o.d), osc = c.createOscillator(), a = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || dur));
    env(a, t, g, o.att || 0.003, dur);
    let n = osc; if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.lq || 0.7; osc.connect(fl); n = fl; }
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    n.connect(a); a.connect(S.out); osc.start(t); osc.stop(t + dur + 0.05);
  };
  // filtered noise with a chosen attack (2 ms = a hard transient)
  const nz = (dur, type, f, q, g, o = {}) => {
    const c = S.ctx; if (!c) return; const t = at(o.d), s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = S.noise; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    env(a, t, g, o.att || 0.002, dur);
    let n = fl; if (o.lp) { const l2 = c.createBiquadFilter(); l2.type = 'lowpass'; l2.frequency.value = o.lp; fl.connect(l2); n = l2; }
    s.connect(fl); n.connect(a); a.connect(S.out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  };
  const ring = (f, dur, g, q = 12, d = 0) => nz(dur, 'bandpass', f, q, g, { d, att: 0.001 });           // a resonant body: noise into a narrow band
  const thump = (f, f2, dur, g, d = 0, lp = 0) => tn(f, dur, 'sine', g, { f2, d, lp, att: 0.002 });
  const metal = (parts, dur, g, v = 1, d = 0, type = 'sine') => parts.forEach((p, i) => tn(p * rand(0.985, 1.015), dur * (1 - i * 0.14), type, g * v * (1 - i * 0.12), { d, att: 0.001 }));
  // pick a sub-variant: random, never the same one twice in a row
  const last = {};
  const sub = (key, n) => { let i; do i = Math.floor(Math.random() * n); while (n > 1 && i === last[key]); last[key] = i; return i; };
  S.subPick = sub; S.subLast = last;                                      // (the tests check it never repeats)
  const outdoor = () => typeof M !== 'undefined' && M.venue && M.venue.kind === 'outdoor';
  // a short hand clap (used by the crowd too): a sharp noise burst with a little body
  S.clapAt = (g = 0.2, d = 0, tone = 1) => { nz(0.012, 'highpass', 900 * tone, 0.7, g, { d }); nz(0.05 + 0.02 * Math.random(), 'bandpass', 1300 * tone, 1.4, g * 0.9, { d: d + 0.001 }); nz(0.02, 'lowpass', 500, 0.8, g * 0.25, { d }); };

  // ---- B: Real
  const B = {
    bad() { tn(311, 0.09, 'triangle', 0.09, { f2: 290, lp: 1600 }); tn(233, 0.14, 'triangle', 0.09, { d: 0.1, f2: 220, lp: 1400 }); },
    best() { [523, 659, 784].forEach((f, i) => { tn(f, 0.35, 'sine', 0.07, { d: i * 0.09 }); tn(f * 4, 0.06, 'sine', 0.018, { d: i * 0.09 }); }); },
    blip() { nz(0.006, 'bandpass', 3200, 1.2, 0.18); tn(1150, 0.018, 'sine', 0.08); },
    block() { nz(0.045, 'bandpass', 1450, 1.5, 0.5); thump(125, 70, 0.08, 0.45); ring(720, 0.05, 0.12, 9, 0.004); },
    board() { thump(145, 92, 0.09, 0.14); ring(1120, 0.13, 0.05, 8, 0.002); nz(0.05, 'highpass', 2600, 0.7, 0.03, { d: 0.004 }); },
    bounce(v = 1) {
      const k = sub('bounceB', 3), F = [[120, 950], [104, 820], [136, 1080]][k], o = outdoor() ? 1.25 : 1;
      thump(F[0] * o, 55 * o, 0.07, 0.34 * v); ring(F[1] * o, 0.045, 0.1 * v, 7); nz(0.008, 'highpass', 3000, 0.7, 0.05 * v);
    },
    buzzer() { tn(230, 0.9, 'sawtooth', 0.08, { lp: 1800, att: 0.02 }); tn(233, 0.9, 'sawtooth', 0.06, { lp: 1800, att: 0.02 }); tn(345, 0.9, 'square', 0.03, { lp: 1500, att: 0.02 }); },
    cheer(amt = 1, delay = 0) {             // the swell of a real crowd: voices in three bands, staggered, with clapping inside
      swell(amt, delay);
      const L = S.crowdLevel, a = amt * L;
      nz(0.7 + amt * 0.5 * L, 'bandpass', 520, 0.9, 0.05 * a, { d: delay, att: 0.12 }); nz(0.8 + amt * 0.5 * L, 'bandpass', 1150, 1.1, 0.06 * a, { d: delay + 0.03, att: 0.1 }); nz(0.6 + amt * 0.4 * L, 'bandpass', 2300, 1.2, 0.03 * a, { d: delay + 0.06, att: 0.1 });
      for (let i = 0; i < 6 + 10 * Math.min(1, a); i++) S.clapAt(0.03 * a, delay + 0.1 + Math.random() * (0.8 + amt * 0.4), rand(0.85, 1.2));
    },
    clank(v = 1) {
      const k = sub('clankB', 3), P = [[520, 1240, 1980, 2870, 3900], [470, 1130, 1830, 2610, 3720], [560, 1330, 2090, 3010, 4100]][k];
      metal(P, 0.3, 0.07, v); nz(0.012, 'bandpass', 3000, 1, 0.12 * v); thump(160, 110, 0.05, 0.12 * v);
    },
    dunkNet() { nz(0.22, 'bandpass', 2600, 1.3, 0.22, { f2: 1500, lp: 6000 }); metal([700, 1520], 0.09, 0.05); for (let i = 0; i < 3; i++) ring(rand(900, 1400), 0.03, 0.05, 10, 0.05 + i * 0.04); },
    good() { tn(660, 0.22, 'sine', 0.16); tn(1320, 0.05, 'sine', 0.04); tn(990, 0.3, 'sine', 0.16, { d: 0.09 }); tn(1980, 0.06, 'sine', 0.04, { d: 0.09 }); },
    green() { tn(1318, 0.5, 'sine', 0.11); tn(1318 * 2.76, 0.18, 'sine', 0.03); tn(1760, 0.45, 'sine', 0.08, { d: 0.05 }); tn(2349, 0.4, 'sine', 0.05, { d: 0.1 }); nz(0.15, 'highpass', 7000, 0.7, 0.02, { d: 0.08, att: 0.03 }); },
    greenMake(d = 0) { tn(1568, 0.45, 'sine', 0.07, { d: 0.02 + d }); tn(1568 * 2.76, 0.12, 'sine', 0.015, { d: 0.02 + d }); tn(2093, 0.4, 'sine', 0.05, { d: 0.08 + d }); },
    heart() { thump(62, 42, 0.12, 0.5, 0, 180); nz(0.08, 'lowpass', 140, 0.8, 0.2); thump(54, 38, 0.13, 0.4, 0.17, 160); nz(0.08, 'lowpass', 120, 0.8, 0.15, { d: 0.17 }); },
    netSwish(k = 0.7, delay = 0, pitch = 1) {
      const i = sub('netB', 3), f = [3400, 3000, 3700][i] * pitch * (0.85 + 0.2 * clamp(k, 0.15, 1.35)), dur = clamp(0.14 + 0.08 * k, 0.12, 0.24);
      S.netNoise(dur, f, 1.8, 0.09 + 0.2 * clamp(k, 0.15, 1.35), f * 0.7, delay);
    },
    rimTick(k = 0.6) { const v = 0.04 + 0.04 * clamp(k, 0, 1); ring(2620, 0.06, v * 9, 14); ring(4110, 0.04, v * 4, 14); tn(2620, 0.05, 'sine', v * 0.5); },
    slam() { thump(72, 38, 0.3, 0.7); metal([380, 820, 1460, 2210], 0.22, 0.06); thump(150, 95, 0.08, 0.3, 0.005); nz(0.2, 'bandpass', 2400, 1.2, 0.18, { f2: 1400, d: 0.01, lp: 6000 }); },
    snatch(v = 1) { nz(0.03, 'bandpass', 2000, 1.6, 0.4 * v); thump(140, 90, 0.05, 0.3 * v); ring(760, 0.04, 0.08 * v, 9, 0.01); },
    squeak() {
      const k = sub('squeakB', 3), f = [2550, 2850, 2300][k];
      const c = S.ctx; if (!c) return;
      const t = at(0), o = c.createOscillator(), bp = c.createBiquadFilter(), a = c.createGain();   // stick-slip: a buzzy source through a moving band
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f / 3.4, t); o.frequency.linearRampToValueAtTime(f / 3.0, t + 0.07);
      bp.type = 'bandpass'; bp.Q.value = 5; bp.frequency.setValueAtTime(f, t); bp.frequency.linearRampToValueAtTime(f * 1.25, t + 0.07);
      env(a, t, 0.25, 0.006, 0.08); o.connect(bp); bp.connect(a); a.connect(S.out); o.start(t); o.stop(t + 0.12);
      if (k === 2) tn(f * 1.1, 0.04, 'sine', 0.02, { d: 0.05 });
    },
    swipe() { const k = sub('swipeB', 3), F = [[2400, 800], [2000, 620], [2800, 1000]][k]; nz(0.09, 'bandpass', F[0], 1.6, 0.22, { f2: F[1], att: 0.015 }); },
    swish(pitch = 1) { B.netSwish(0.7, 0, pitch); },
    thud() { const k = sub('thudB', 3), f = [85, 76, 95][k]; thump(f, 40, 0.18, 0.4, 0, 400); nz(0.12, 'lowpass', 350, 0.9, 0.22); ring(900, 0.05, 0.05, 6, 0.01); },
    whistle() { tn(2850, 0.34, 'sine', 0.055, { vib: [28, 160], att: 0.01 }); tn(5700, 0.3, 'sine', 0.008, { vib: [28, 300], att: 0.01 }); nz(0.3, 'bandpass', 2850, 3, 0.02, { att: 0.01 }); }
  };
  // ---- C: Arcade
  const C = {
    bad() { tn(392, 0.18, 'square', 0.08, { f2: 196 }); tn(330, 0.24, 'square', 0.07, { d: 0.17, f2: 150 }); },
    best() { [523, 659, 784, 1047, 1319].forEach((f, i) => tn(f, 0.12, 'square', 0.06, { d: i * 0.055 })); nz(0.25, 'highpass', 6000, 0.7, 0.04, { d: 0.25 }); },
    blip() { tn(880, 0.03, 'square', 0.06); tn(1320, 0.02, 'square', 0.03, { d: 0.02 }); },
    block() { tn(180, 0.2, 'square', 0.12, { f2: 60 }); nz(0.12, 'bandpass', 1900, 1, 0.45, { f2: 500 }); tn(1800, 0.08, 'sawtooth', 0.06, { f2: 600 }); },
    board() { tn(220, 0.25, 'sine', 0.1, { f2: 120 }); tn(110, 0.06, 'square', 0.025); nz(0.08, 'lowpass', 900, 1, 0.08); },
    bounce(v = 1) { const k = sub('bounceC', 3), f = [180, 160, 200][k]; tn(f, 0.1, 'sine', 0.38 * v, { f2: 60 }); tn(f / 2, 0.05, 'square', 0.05 * v); },
    buzzer() { tn(120, 1.0, 'square', 0.08, { vib: [7, 4] }); tn(240, 1.0, 'sawtooth', 0.05, { vib: [7, 8] }); tn(180, 1.0, 'square', 0.04); },
    cheer(amt = 1, delay = 0) {             // an arena roar: wide, loud, rising
      swell(amt * 1.15, delay);
      const L = S.crowdLevel, a = amt * L;
      nz(0.9 + amt * 0.7 * L, 'bandpass', 900, 0.4, 0.13 * a, { f2: 1500, d: delay, att: 0.05 }); nz(0.6 + amt * 0.4 * L, 'highpass', 2500, 0.6, 0.04 * a, { d: delay + 0.05, att: 0.05 });
      tn(700, 0.5, 'sine', 0.012 * a, { f2: 1400, d: delay + 0.1 });
    },
    clank(v = 1) { const k = sub('clankC', 3), f = [600, 540, 680][k]; tn(f, 0.4, 'square', 0.05 * v, { vib: [18, 12] }); tn(f * 1.5, 0.35, 'square', 0.04 * v); nz(0.06, 'highpass', 3000, 1, 0.18 * v); tn(f * 2.4, 0.2, 'triangle', 0.05 * v); },
    dunkNet() { nz(0.3, 'bandpass', 1500, 0.8, 0.16, { f2: 5500 }); tn(140, 0.12, 'square', 0.04, { f2: 70 }); },
    good() { tn(988, 0.08, 'square', 0.07); tn(1319, 0.2, 'square', 0.07, { d: 0.08 }); },
    green() { [659, 988, 1319, 1760].forEach((f, i) => tn(f, 0.1, 'square', 0.05, { d: i * 0.04 })); tn(2637, 0.35, 'triangle', 0.06, { d: 0.16 }); nz(0.3, 'highpass', 6500, 0.7, 0.05, { d: 0.12 }); },
    greenMake(d = 0) { tn(1568, 0.12, 'square', 0.05, { d: 0.02 + d }); tn(2093, 0.25, 'square', 0.05, { d: 0.1 + d }); },
    heart() { thump(70, 35, 0.16, 0.32); nz(0.02, 'highpass', 2000, 0.7, 0.025); thump(60, 30, 0.18, 0.28, 0.18); },
    netSwish(k = 0.7, delay = 0, pitch = 1) { const i = sub('netC', 3), f = [1500, 1700, 1300][i] * pitch; nz(0.4, 'bandpass', f, 0.8, 0.16 + 0.12 * clamp(k, 0.15, 1.35), { f2: f * 4.6, d: delay, att: 0.01 }); tn(800 * pitch, 0.3, 'sine', 0.02, { f2: 1600 * pitch, d: delay }); },
    rimTick(k = 0.6) { tn(2400, 0.08, 'square', 0.03 + 0.02 * clamp(k, 0, 1)); },
    slam() { thump(60, 25, 0.6, 0.85); nz(0.35, 'lowpass', 600, 0.8, 0.5); tn(110, 0.15, 'square', 0.12, { f2: 50 }); nz(0.35, 'bandpass', 1500, 0.8, 0.22, { f2: 5500, d: 0.05 }); },
    snatch(v = 1) { tn(400, 0.08, 'square', 0.08 * v, { f2: 1600 }); nz(0.06, 'bandpass', 3000, 2, 0.25 * v, { f2: 1200 }); },
    squeak() { const k = sub('squeakC', 3), f = [2200, 2500, 1900][k]; tn(f, 0.05, 'square', 0.035, { f2: f * 1.55 }); },
    swipe() { const k = sub('swipeC', 3), f = [3500, 3000, 4000][k]; nz(0.1, 'bandpass', f, 2, 0.1, { f2: 500 }); tn(1200, 0.08, 'sine', 0.016, { f2: 400 }); },
    swish(pitch = 1) { C.netSwish(0.7, 0, pitch); },
    thud() { const k = sub('thudC', 3), f = [60, 54, 66][k]; thump(f, 25, 0.35, 0.3); nz(0.15, 'lowpass', 500, 1, 0.14); tn(90, 0.1, 'square', 0.025, { f2: 45 }); },
    whistle() { tn(2000, 0.14, 'square', 0.03, { f2: 2600 }); tn(2000, 0.12, 'square', 0.03, { f2: 2600, d: 0.17 }); }
  };
  // ---- D: Soft
  const D = {
    bad() { tn(220, 0.25, 'sine', 0.14, { f2: 180, att: 0.02 }); },
    best() { tn(784, 0.5, 'sine', 0.09, { att: 0.02 }); tn(1175, 0.6, 'sine', 0.07, { d: 0.15, att: 0.02 }); },
    blip() { tn(600, 0.04, 'sine', 0.06, { att: 0.006 }); },
    block() { nz(0.07, 'lowpass', 800, 0.8, 0.35, { att: 0.006 }); thump(110, 70, 0.1, 0.3, 0, 300); },
    board() { thump(120, 85, 0.1, 0.12, 0, 400); ring(900, 0.08, 0.02, 6); },
    bounce(v = 1) { const k = sub('bounceD', 3), f = [100, 92, 110][k]; thump(f, 55, 0.08, 0.32 * v, 0, 260); nz(0.03, 'lowpass', 600, 0.7, 0.06 * v, { att: 0.004 }); },
    buzzer() { tn(220, 0.7, 'triangle', 0.1, { lp: 900, att: 0.06 }); tn(330, 0.7, 'triangle', 0.06, { lp: 900, att: 0.06 }); },
    cheer(amt = 1, delay = 0) {             // gentle applause, no roar
      swell(amt * 0.7, delay);
      const L = S.crowdLevel, a = amt * L;
      for (let i = 0; i < 6 + 8 * Math.min(1, a); i++) S.clapAt(0.12 * a, delay + Math.random() * (0.9 + amt * 0.3), rand(0.75, 1));
      nz(0.6 + amt * 0.3 * L, 'bandpass', 700, 0.7, 0.06 * a, { d: delay, att: 0.15, lp: 1800 });
    },
    clank(v = 1) { const k = sub('clankD', 3), P = [[440, 1050], [400, 960], [480, 1140]][k]; metal(P, 0.2, 0.11, v); thump(150, 100, 0.05, 0.1 * v, 0, 500); },
    dunkNet() { nz(0.2, 'bandpass', 1800, 1.1, 0.22, { f2: 1100, lp: 3500, att: 0.01 }); },
    good() { tn(523, 0.3, 'sine', 0.1, { att: 0.015 }); tn(659, 0.35, 'sine', 0.1, { d: 0.1, att: 0.015 }); },
    green() { tn(880, 0.45, 'sine', 0.08, { att: 0.02 }); tn(1318, 0.5, 'sine', 0.06, { d: 0.06, att: 0.02 }); },
    greenMake(d = 0) { tn(1318, 0.4, 'sine', 0.09, { d: 0.02 + d, att: 0.02 }); },
    heart() { thump(55, 40, 0.13, 0.35, 0, 140); thump(50, 36, 0.14, 0.25, 0.18, 130); },
    netSwish(k = 0.7, delay = 0, pitch = 1) { const i = sub('netD', 3), f = [2600, 2300, 2900][i] * pitch; S.netNoise(clamp(0.15 + 0.07 * k, 0.12, 0.24), f, 1.4, 0.13 + 0.2 * clamp(k, 0.15, 1.35), f * 0.75, delay, 4000); },
    rimTick(k = 0.6) { tn(1800, 0.05, 'sine', 0.045 + 0.035 * clamp(k, 0, 1), { att: 0.003 }); },
    slam() { thump(80, 50, 0.22, 0.85, 0, 300); nz(0.18, 'bandpass', 1800, 1.1, 0.12, { f2: 1100, lp: 3500, att: 0.01, d: 0.01 }); },
    snatch(v = 1) { nz(0.05, 'lowpass', 1200, 0.8, 0.25 * v, { att: 0.004 }); tn(300, 0.06, 'sine', 0.06 * v); },
    squeak() { const k = sub('squeakD', 2), f = [1900, 1700][k]; tn(f, 0.045, 'sine', 0.045, { f2: f * 1.2, att: 0.008 }); },
    swipe() { const k = sub('swipeD', 3), f = [1200, 1000, 1400][k]; nz(0.1, 'bandpass', f, 1.2, 0.15, { f2: f * 0.42, att: 0.02, lp: 2000 }); },
    swish(pitch = 1) { D.netSwish(0.7, 0, pitch); },
    thud() { const k = sub('thudD', 2), f = [70, 64][k]; thump(f, 40, 0.15, 0.4, 0, 220); nz(0.12, 'lowpass', 250, 0.8, 0.18, { att: 0.006 }); },
    whistle() { tn(1800, 0.2, 'sine', 0.08, { vib: [22, 60], att: 0.02 }); }
  };
  // the crowd bed's swell (as A does it), scaled by the venue's crowd
  function swell(amt, delay) {
    if (!S.ctx || !S.crowdG) return;
    const g = S.crowdG.gain, now = S.ctx.currentTime, t = now + delay, L = S.crowdLevel, base = S.bedBase();
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(base + 0.2 * amt * L * S.swellK(), t + 0.15); g.linearRampToValueAtTime(base, t + 1.8 + amt * L);
  }
  S.swell = swell;
  S.bedBase = () => 0.03 * S.crowdLevel;     // (crowd-audio.js makes these follow the audience)
  S.swellK = () => 1;

  // ---- the variants table, A = the function as it is now
  for (const id of SFX_IDS) {
    const cur = S[id];
    SFX_VARIANTS[id] = { A: { label: 'Current', fn: cur }, B: { label: 'Real', fn: B[id] }, C: { label: 'Arcade', fn: C[id] }, D: { label: 'Soft', fn: D[id] } };
  }
  SFX_VARIANTS.cheer.A.fn = function (amt = 1, delay = 0) {      // A as it was, with its swell going through the shared one
    if (!this.ctx) return;
    swell(amt, delay); const L = this.crowdLevel;
    this.hiss(0.6 + amt * 0.6 * L, 'bandpass', 1300, 0.5, 0.1 * amt * L, 850, delay);
  };
  // which variant plays: a forced one (the Studio), then this browser's override, the default pick, the style
  S.style = 'A'; S.picks = {}; S.force = null;
  try { const st = localStorage.getItem('islamdunk.sfxstyle'); if (SFX_STYLES[st]) S.style = st; S.picks = JSON.parse(localStorage.getItem('islamdunk.sfxpick') || '{}') || {}; } catch (e) {}
  S.variantOf = id => { const V = SFX_VARIANTS[id]; const k = (S.force && (S.force[id] || S.force['*'])) || S.picks[id] || SFX_DEFAULT_PICKS[id] || S.style; return V && V[k] && (V[k].fn || V[k].samples) ? k : 'A'; };
  S.saveStyle = () => { try { localStorage.setItem('islamdunk.sfxstyle', S.style); localStorage.setItem('islamdunk.sfxpick', JSON.stringify(S.picks)); } catch (e) {} };
  // the dispatcher: the chosen variant, through its own gain (level matching) and, for room sounds, the reverb send
  let depth = 0, curK = 'A';
  S.play = function (id, k, args) {
    const V = SFX_VARIANTS[id], vv = V && (V[k] || V.A);
    if (!vv) return;
    if (!this.ctx || !this.out || depth > 0) { if (vv.fn) return vv.fn.apply(this, args); return this.playSample(vv, args); }   // nested (slam -> dunkNet): the outer gain covers it
    const c = this.ctx, real = this.out, g = c.createGain(), db = (typeof SFX_LEVELS !== 'undefined' && SFX_LEVELS[id] && SFX_LEVELS[id][k]) || 0;
    g.gain.value = Math.pow(10, db / 20) * (vv.gain || 1);
    g.connect(real); if (SFX_ROOM.has(id) && this.roomSend) g.connect(this.roomSend);
    this.out = g; depth++; curK = k;
    try { return vv.fn ? vv.fn.apply(this, args) : this.playSample(vv, args); }
    finally { depth--; this.out = real; setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 4000); }
  };
  for (const id of SFX_IDS) S[id] = function () { return S.play.call(this, id, depth > 0 ? (SFX_VARIANTS[id][curK] ? curK : 'A') : S.variantOf(id), arguments); };

  // ---- recorded samples: more variants of the same ID (loaded when first played; one of the files at random, no repeat)
  S.playSample = function (vv) {
    const c = this.ctx; if (!c || !vv.samples || !vv.samples.length) return;
    vv.bufs = vv.bufs || [];
    const i = sub('sample-' + vv.label, vv.samples.length), url = vv.samples[i];
    const go = buf => { const s = c.createBufferSource(), a = c.createGain(); s.buffer = buf; a.gain.value = vv.vol || 1; s.connect(a); a.connect(this.out); s.start(); };
    if (vv.bufs[i]) return go(vv.bufs[i]);
    fetch(url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(buf => { vv.bufs[i] = buf; go(buf); }).catch(() => {});
  };
}
function sfxAddSamples(id, key, label, urls, vol = 1) { if (!SFX_VARIANTS[id]) return false; SFX_VARIANTS[id][key] = { label, samples: [].concat(urls), vol }; return true; }
