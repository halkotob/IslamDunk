// v9.13: render a sound variant offline (OfflineAudioContext, no speakers needed) and measure how loud it is.
// Evaluated in the game page; it stops the game's frame loop. SFX_MEASURE(ids, keys, seeds, withLevels) -> { [id]: { [key]: { db, peak, errors } } }
//   loudness: K-weighted (high-pass 38 Hz, +4 dB shelf above 1.5 kHz), the loudest 200 ms window (50 ms steps), in dB;
//   withLevels: through the variant's level from SFX_LEVELS (what the game plays), else raw.
export const SFX_MEASURE_INIT = `window.requestAnimationFrame = () => 0;   // the game stops (its attract match would play into the renders)
window.SFX_MEASURE = async function (ids, keys, seeds, withLevels) {
  const out = {}, sr = 32000, realRandom = Math.random;
  const seed = n => { let s = n >>> 0 || 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const keep = {}; for (const k of ['ctx', 'out', 'noise', 'crowdG', 'roomSend', 'crowdFx', 'murG', 'crowdLevel']) keep[k] = SFX[k];
  const lv = typeof SFX_LEVELS !== 'undefined' ? SFX_LEVELS : {};
  const saveLv = JSON.stringify(lv);
  try {
    for (const id of ids) for (const k of keys) {
      const dbs = [], errors = []; let peak = 0;
      for (const sd of seeds) {
        const c = new OfflineAudioContext(1, Math.round(sr * 2.6), sr);
        const nb = c.createBuffer(1, sr * 2, sr), d = nb.getChannelData(0); seed(777); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; hp.Q.value = 0.5;
        const sh = c.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1500; sh.gain.value = 4;
        const g = c.createGain(); g.connect(hp); hp.connect(sh); sh.connect(c.destination);
        Object.assign(SFX, { ctx: c, out: g, noise: nb, crowdG: c.createGain(), roomSend: null, crowdFx: g, murG: null, crowdLevel: 1 });
        if (!withLevels) { for (const x in lv) delete lv[x]; }
        seed(sd);
        try { SFX.play(id, k, []); } catch (e) { errors.push(String(e && e.message || e)); }
        if (!withLevels) Object.assign(lv, JSON.parse(saveLv));
        Math.random = realRandom;
        const buf = await c.startRendering(), x = buf.getChannelData(0), W = Math.round(sr * 0.2), H = Math.round(sr * 0.05);
        let best = 0; for (let i = 0; i + W <= x.length; i += H) { let s = 0; for (let j = i; j < i + W; j++) s += x[j] * x[j]; best = Math.max(best, s / W); }
        for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
        dbs.push(10 * Math.log10(best + 1e-12));
      }
      (out[id] = out[id] || {})[k] = { db: dbs.reduce((a, b) => a + b, 0) / dbs.length, peak, errors };
    }
  } finally { Math.random = realRandom; Object.assign(SFX, keep); }
  return out;
};`;
