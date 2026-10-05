// Frame-time profiler. Drives the real game loop's render() for N frames per scenario and reports
// per-frame cost (JS + forced raster) and a breakdown by draw function.
//   node tests/perf/profile.mjs [--page dist/web/index.html] [--throttle 4] [--dpr 1] [--frames 240]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), THR = +arg('--throttle', 1), DPR = +arg('--dpr', 1), FRAMES = +arg('--frames', 240);
const QUERY = arg('--query', '');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = u === '/' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(d); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: DPR });
await ctx.route(/fonts\.(googleapis|gstatic)|firebasejs/, r => r.abort());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const cdp = await ctx.newCDPSession(p); if (THR > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR });
await p.goto(`http://127.0.0.1:${srv.address().port}/${QUERY ? '?' + QUERY : ''}`);
await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
const out = await p.evaluate(async FRAMES => {
  // stop the live loop; we drive frames ourselves
  window.__stopLoop = true; const raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
  await new Promise(r => setTimeout(r, 100));
  const T = {}; const wrap = name => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { T[name] = (T[name] || 0) + performance.now() - t; } }; };
  for (const n of ['drawScene', 'drawVenueBack', 'drawArena', 'drawFloorWarped', 'drawVenueNear', 'drawNearSide', 'drawPlayer', 'drawHoopBack', 'drawHoopFront', 'drawBall', 'drawReflections', 'drawHUD', 'drawShadow']) wrap(n);
  const g = canvas.getContext('2d');
  const run = (label, setup, perFrame) => {
    setup(); for (const k in T) delete T[k];
    const times = [], sim = [], js = [], ras = []; let last = performance.now();
    for (let i = 0; i < FRAMES; i++) {
      perFrame && perFrame(i);
      const t0 = performance.now();
      for (let s = 0; s < 2; s++) updateMatch(STEP);       // 60 fps sim at 2 steps per rendered frame ~ 30 Hz test cadence
      Game.t += 1 / 30; FX.update && FX.update(1 / 30); FX.updateReal && FX.updateReal(1 / 30); updateCamera && updateCamera(1 / 30);
      const t1 = performance.now(); render(g); const t2 = performance.now(); g.getImageData(0, 0, 1, 1);            // force the raster to finish inside the measurement
      const t3 = performance.now(); times.push(t3 - t0); sim.push(t1 - t0); js.push(t2 - t1); ras.push(t3 - t2);
    }
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const br = {}; for (const k in T) br[k] = +(T[k] / FRAMES).toFixed(2);
    const m = a => +(a.slice(20).reduce((x, y) => x + y, 0) / (a.length - 20)).toFixed(2);
    return { label, simMs: m(sim), renderJsMs: m(js), rasterMs: m(ras), avgMs: +avg.toFixed(2), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(2), fpsCap: Math.round(1000 / avg), breakdown: br };
  };
  const venue = id => { const base = VENUE_LIST.find(v => v.id === id); return base.kind === 'classic' ? null : makeVenue(base, base.kind === 'arena' ? { crowd: 3000, time: 'night' } : {}); };
  const res = [];
  const play = (id) => () => { Input.touchMode = false; newMatch(TEAMS[0], TEAMS[1], { humans: [], venue: venue(id), fmt: { format: 'quarters', len: 120 } }); Game.screen = 'play'; Game.paused = false; for (let i = 0; i < 240; i++) updateMatch(STEP); };
  res.push(run('normal possession (classic arena)', play('classic')));
  res.push(run('dunk + full FX (classic arena)', play('classic'), i => { if (i % 20 === 0) { SFX.slam && SFX.slam(); FX.burst(hoops[1].x, RIM_Y, hoops[1].z, 26, 'confetti', ['#ffd76a', '#fff', '#3a8']); FX.burst(hoops[1].x, RIM_Y, hoops[1].z, 7, 'spark', ['#ffd76a', '#fff']); FX.callout('POSTERIZED!', '#ffd76a', 'MASHA\'ALLAH', true); FX.shake(4, 0.25); FX.hype && FX.hype(1); } }));
  res.push(run('crowded arena (Grand Ummah Dome, crowd 3000)', play('arena_grand')));
  res.push(run('outdoor court (city)', play('out_city')));
  return res;
}, FRAMES);
console.log(JSON.stringify({ page: path.relative(ROOT, PAGE), throttle: THR, dpr: DPR, results: out, errors: errs }, null, 1));
await b.close(); srv.close();
