// ------------------------------------------------------------------ UTILS
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const rint = n => (Math.random() * n) | 0;
const chance = p => Math.random() < p;
const pick = a => a[rint(a.length)];
const sgn = v => v < 0 ? -1 : 1;
const dxz = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// distance from point to segment in the court plane; t = projection param
function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1;
  const t = ((px - ax) * vx + (pz - az) * vz) / L, tc = clamp(t, 0, 1);
  return { d: Math.hypot(px - (ax + vx * tc), pz - (az + vz * tc)), t };
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ------------------------------------------------------------------ AUDIO
// Procedural effects only (Web Audio): no samples, no music.
const SFX = {
  ctx: null, out: null, noise: null, crowdG: null,
  init() {
    if (this.ctx || typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.out = c.createGain(); this.out.gain.value = SETTINGS.sound ? 0.55 : 0; this.out.connect(c.destination);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    // crowd bed: looping band-limited noise that swells on big plays
    const src = c.createBufferSource(); src.buffer = b; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.5;
    const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2000;
    this.crowdG = c.createGain(); this.crowdG.gain.value = 0.03 * this.crowdLevel;
    src.connect(f); f.connect(f2); f2.connect(this.crowdG); this.crowdG.connect(this.out); src.start();
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setOn(on) { if (this.out) this.out.gain.value = on ? 0.55 : 0; },
  tone(f, dur, type = 'sine', g = 0.2, f2 = null, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), a = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.005);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(this.out); o.start(t); o.stop(t + dur + 0.03);
  },
  hiss(dur, type, f, q, g, f2 = null, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.noise; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.01);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(a); a.connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.03);
  },
  crowdLevel: 1,
  setCrowdLevel(l) { this.crowdLevel = l; if (this.crowdG) this.crowdG.gain.value = 0.03 * l; },
  bounce(v = 1) {
    if (M.venue && M.venue.kind === 'outdoor') { this.tone(165, 0.06, 'sine', 0.26 * v, 70); this.hiss(0.03, 'highpass', 2600, 0.7, 0.12 * v); return; }   // asphalt: drier, higher slap
    this.tone(125, 0.09, 'sine', 0.3 * v, 50); this.hiss(0.025, 'highpass', 1800, 0.7, 0.08 * v);
  },
  swish(pitch = 1) { this.hiss(0.34, 'bandpass', 2400 * pitch, 1.1, 0.26, 6800 * pitch); },
  whistle() { this.tone(2100, 0.18, 'sine', 0.08, 2300); this.tone(2100, 0.12, 'sine', 0.07, 2250, 0.2); },
  clank(v = 1) { [430, 1020, 1490, 2210].forEach((f, i) => this.tone(f * rand(0.97, 1.03), 0.36 - i * 0.06, 'triangle', 0.08 * v)); this.hiss(0.04, 'highpass', 3000, 1, 0.1 * v); },
  board() { this.tone(160, 0.14, 'square', 0.06, 70); this.hiss(0.06, 'lowpass', 900, 1, 0.22); },
  slam() { this.tone(62, 0.45, 'sine', 0.7, 30); this.hiss(0.2, 'lowpass', 500, 0.8, 0.45); this.dunkNet(); },
  squeak() { this.tone(rand(1700, 2200), 0.06, 'sine', 0.045, rand(2600, 3100)); },
  swipe() { this.hiss(0.12, 'bandpass', 1800, 2, 0.14, 500); },
  thud() { this.tone(90, 0.2, 'sine', 0.4, 40); this.hiss(0.1, 'lowpass', 400, 1, 0.28); },
  buzzer() { this.tone(170, 0.9, 'sawtooth', 0.09); this.tone(174, 0.9, 'square', 0.05); },
  blip() { this.tone(720, 0.045, 'square', 0.035); },
  good() { this.tone(660, 0.1, 'sine', 0.12); this.tone(990, 0.18, 'sine', 0.12, null, 0.09); },
  bad() { this.tone(220, 0.28, 'square', 0.05, 140); },
  green() { this.swish(); this.tone(1320, 0.12, 'sine', 0.09); this.tone(1760, 0.18, 'sine', 0.07, null, 0.06); },
  heart() { this.tone(58, 0.12, 'sine', 0.35, 40); this.tone(52, 0.14, 'sine', 0.28, 36, 0.16); },
  cheer(amt = 1, delay = 0) {
    if (!this.ctx) return;
    const g = this.crowdG.gain, now = this.ctx.currentTime, t = now + delay;   // delay: crowd lands after the hit
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setValueAtTime(g.value, t);
    const L = this.crowdLevel, base = 0.03 * L;                   // crowd noise scales with the venue's crowd
    g.linearRampToValueAtTime(base + 0.2 * amt * L, t + 0.15); g.linearRampToValueAtTime(base, t + 1.8 + amt * L);
    this.hiss(0.6 + amt * 0.6 * L, 'bandpass', 1300, 0.5, 0.1 * amt * L, 850, delay);
  }
};

