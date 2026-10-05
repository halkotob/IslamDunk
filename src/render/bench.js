
// ================================================= TOOLS: RENDER BENCHMARK (?bench=1, inert otherwise)
// Runs four scenarios in the real game loop on this device and reports frame rate and frame time:
// a normal possession, a dunk with full FX every 0.7 s, the Grand Ummah Dome with a 3000 crowd, and
// an outdoor court. Frame intervals come from requestAnimationFrame, so they include the GPU/raster
// work the browser does after our JS (capped at the display's refresh rate). "JS ms" is the time spent
// in the frame callback itself (simulation + draw calls), which shows headroom above that cap.
// Results stay on screen with a Copy button. Nothing here runs without the URL flag.
const BENCH = (() => { try { return new URLSearchParams(location.search).get('bench') === '1'; } catch (e) { return false; } })();
if (BENCH) {
  const SECS = 6, WARM = 1;
  const scenarios = [
    { label: 'Normal possession (classic arena)', venue: 'classic' },
    { label: 'Dunk + full FX (classic arena)', venue: 'classic', fx: true },
    { label: 'Crowded arena (Grand Ummah Dome, crowd 3000)', venue: 'arena_grand', crowd: 3000 },
    { label: 'Outdoor court (city)', venue: 'out_city' },
  ];
  const results = [];
  let cur = -1, t0 = 0, lastNow = 0, frames = [], js = [], fxT = 0, panel = null;
  const venueOf = s => { const base = VENUE_LIST.find(v => v.id === s.venue); return !base || base.kind === 'classic' ? null : makeVenue(base, s.crowd ? { crowd: s.crowd, time: 'night' } : {}); };
  const start = i => {
    cur = i; frames = []; js = []; fxT = 0; t0 = 0; lastNow = 0;
    const s = scenarios[i];
    Input.touchMode = false; newMatch(TEAMS[0], TEAMS[1], { humans: [], venue: venueOf(s), fmt: { format: 'quarters', len: 600 } });
    Game.screen = 'play'; Game.paused = false;
    note(`Running ${i + 1}/${scenarios.length}: ${s.label}…`);
  };
  const stat = a => { const b = a.slice().sort((x, y) => x - y); const avg = b.reduce((x, y) => x + y, 0) / (b.length || 1); return { avg, p95: b[Math.floor(b.length * 0.95)] || 0, worst: b[b.length - 1] || 0 }; };
  const finish = () => {
    const s = scenarios[cur], f = stat(frames), j = stat(js);
    results.push({ label: s.label, fps: 1000 / f.avg, frameAvg: f.avg, frameP95: f.p95, frameWorst: f.worst, jsAvg: j.avg, jsP95: j.p95, n: frames.length });
    if (cur + 1 < scenarios.length) start(cur + 1); else done();
  };
  const fmt = n => n.toFixed(1);
  function note(msg) {
    if (!panel) {
      panel = document.createElement('div');
      panel.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:50;background:rgba(8,14,22,.94);color:#f6ecd2;font:13px/1.45 "Trebuchet MS",sans-serif;padding:10px 14px;border:1px solid #e8c35a;border-radius:10px;max-width:94vw;box-sizing:border-box';
      document.body.appendChild(panel);
    }
    panel.textContent = msg;
  }
  function done() {
    cur = -1; goTitle();
    const dev = `${navigator.userAgent}\nscreen ${innerWidth}x${innerHeight} @${devicePixelRatio}x, canvas ${canvas.width}x${canvas.height}, Islam Dunk v${VERSION}`;
    const rows = results.map(r => `${r.label}\n  ${fmt(r.fps)} fps | frame avg ${fmt(r.frameAvg)} ms, p95 ${fmt(r.frameP95)} ms, worst ${fmt(r.frameWorst)} ms | JS avg ${fmt(r.jsAvg)} ms, p95 ${fmt(r.jsP95)} ms`);
    const text = 'Islam Dunk render benchmark\n' + dev + '\n\n' + rows.join('\n');
    panel.innerHTML = '';
    const pre = document.createElement('pre'); pre.textContent = text; pre.style.cssText = 'margin:0 0 8px;white-space:pre-wrap;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;max-height:70vh;overflow:auto';
    const btn = document.createElement('button'); btn.textContent = 'Copy results'; btn.style.cssText = 'font:600 13px "Trebuchet MS",sans-serif;border:0;border-radius:16px;padding:7px 16px;background:#e8c35a;color:#1a1206;cursor:pointer';
    btn.onclick = () => { try { navigator.clipboard.writeText(text).then(() => { btn.textContent = 'Copied'; }); } catch (e) {} };
    panel.append(pre, btn);
    window.__benchResults = results;
  }
  // time the frame callback (JS) and the interval between frames
  const _frame = frame;
  frame = function (now) {
    const a = performance.now();
    const r = _frame.apply(this, arguments);
    if (cur >= 0) {
      const b = performance.now();
      if (!t0) t0 = now;
      const el = (now - t0) / 1000;
      if (el > WARM) { if (lastNow) frames.push(now - lastNow); js.push(b - a); }
      lastNow = now;
      if (scenarios[cur].fx) { fxT -= (Game.rdt || 0.016); if (fxT <= 0) { fxT = 0.7; try { SFX.slam(); } catch (e) {} const h = hoops[1]; FX.burst(h.x, RIM_Y, h.z, 26, 'confetti', ['#ffd76a', '#ffffff', '#3a8f6a']); FX.burst(h.x, RIM_Y, h.z, 7, 'spark', ['#ffd76a', '#ffffff']); FX.callout('POSTERIZED!', '#ffd76a', "MASHA'ALLAH", true); FX.shake(4, 0.25); if (FX.hype) FX.hype(1); } }
      if (el > WARM + SECS) finish();
    }
    return r;
  };
  const _boot = boot;
  boot = function () {
    _boot.apply(this, arguments);
    note('Benchmark: starting in 2 s. Leave the window in front and don’t touch anything.');
    setTimeout(() => start(0), 2000);
  };
}
