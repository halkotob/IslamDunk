
// ================================================= v7.7: ADAPTIVE RESOLUTION
// When frames run late during play, draw at a slightly lower resolution; when there is steady
// headroom again, go back up. Levels are fractions of the normal pixel ratio (never below 1x), e.g.
// on a 2x Retina screen: 2.0 -> 1.76 -> 1.52 -> 1.32. Only the canvas backing size changes; layout,
// input and gameplay are untouched.
//   - The target cadence is the fastest the device has shown this session (any screen), capped at
//     60 Hz. So a phone locked to 30 fps (iOS Low Power Mode) is judged against 30, and a 120 Hz
//     display isn't pushed down chasing 120.
//   - Step down: more than 12% of the last ~2 s of play frames late (over 1.4x the target).
//   - Step up: under 2% late for 6 s. If a step up brings the drops back within 3 s, that level is
//     skipped for 30 s, so it never flickers between levels.
//   - Menus, pauses and tab switches don't count. Options > Resolution: Auto (default) / Full.
const RES_LEVELS = [1, 0.88, 0.76, 0.66];
const RES = {
  mode: 'auto', lvl: 0, scale: 1, lastNow: 0, play: [], cad: [], best: Infinity, lastChange: -1e9, probe: null, block: {}, evalAt: 0,
  key: 'islamdunk.res',
  load() { try { const m = localStorage.getItem(this.key); if (m === 'full' || m === 'auto') this.mode = m; } catch (e) {} },
  save() { try { localStorage.setItem(this.key, this.mode); } catch (e) {} },
  target() { return Math.max(16.4, Math.min(this.best, 34)); },
  setLevel(l, now) {
    l = clamp(l, 0, RES_LEVELS.length - 1); if (l === this.lvl) return;
    this.lvl = l; this.scale = RES_LEVELS[l]; this.lastChange = now; this.play.length = 0;
    if (typeof resize === 'function' && canvas) resize();
  },
  // one frame interval (ms) at time `now` (ms). Exposed for tests.
  sample(dt, now, playing) {
    if (!(dt > 0) || dt > 250) { this.play.length = 0; return; }     // tab switch, breakpoint, first frame
    this.cad.push(dt); if (this.cad.length > 120) this.cad.shift();
    if (playing) { this.play.push(dt); if (this.play.length > 150) this.play.shift(); } else this.play.length = 0;
    if (now < this.evalAt) return;
    this.evalAt = now + 500;
    if (this.cad.length >= 60) { const s = this.cad.slice().sort((a, b) => a - b); this.best = Math.min(this.best, s[Math.floor(s.length * 0.1)]); }
    if (this.mode !== 'auto' || this.play.length < 90) return;
    const thr = this.target() * 1.4, late = this.play.filter(x => x > thr).length / this.play.length;
    if (this.probe && now - this.probe.at < 3000 && late > 0.12) {      // the step up didn't hold: go back, and leave that level alone for a while
      this.block[this.lvl] = now + 30000; this.probe = null; this.setLevel(this.lvl + 1, now); return;
    }
    if (this.probe && now - this.probe.at >= 3000) this.probe = null;
    if (late > 0.12 && now - this.lastChange > 2000 && this.lvl < RES_LEVELS.length - 1) this.setLevel(this.lvl + 1, now);
    else if (late < 0.02 && now - this.lastChange > 6000 && this.lvl > 0 && !((this.block[this.lvl - 1] || 0) > now)) { this.probe = { at: now }; this.setLevel(this.lvl - 1, now); }
  },
};
function resScaled(base) { return typeof RES === 'undefined' ? base : Math.max(Math.min(base, 1), base * RES.scale); }
function resLabel() { return RES.mode === 'full' ? 'Full' : 'Auto' + (RES.lvl ? ` (${Math.round(RES.scale * 100)}%)` : ''); }
function resToggle() { RES.mode = RES.mode === 'auto' ? 'full' : 'auto'; RES.save(); if (RES.mode === 'full') RES.setLevel(0, performance.now()); }
RES.load();
{
  const _frame = frame;
  frame = function (now) {
    if (RES.lastNow) {
      const playing = (Game.screen === 'play' || Game.screen === 'netplay' || Game.screen === 'gym') && !Game.paused && !(typeof document !== 'undefined' && document.hidden);
      RES.sample(now - RES.lastNow, now, playing);
    }
    RES.lastNow = now;
    return _frame.apply(this, arguments);
  };
}
