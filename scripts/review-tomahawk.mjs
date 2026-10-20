// npm run review:tomahawk  (builds first; or: node scripts/review-tomahawk.mjs [--page dist/web/index.html] [--out docs/review/img])
//
// Renders a frame strip of the same seeded tomahawk in each style (Settings → Tomahawk style):
// 24 frames from take-off to landing, the camera locked on the dunker and each frame cropped on him.
// Writes <out>/tomahawk-<style>.png for classic, smooth, power and float.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), OUT = path.resolve(ROOT, arg('--out', 'docs/review/img'));
if (!fs.existsSync(PAGE)) { console.error(`No build at ${PAGE}. Run npm run build:web first.`); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const srv = await new Promise(res => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const file = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u);
    fs.readFile(file, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res(s));
});
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; })();`);
const errs = [];
for (const style of ['classic', 'smooth', 'power', 'float']) {          // a fresh page for each style
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(style + ': ' + e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/?net=loop&lat=0&room=tomahawk`);
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  const url = await page.evaluate(style => {
    SETTINGS.tomahawk = style; window.__seed(4242);
    newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 60 } });
    for (let n = 0; n < 2000 && M.phase !== 'live'; n++) updateMatch(STEP);
    Game.screen = 'play'; Game.paused = false;
    const p = M.players[0], h = attackHoop(p.team);
    for (const q of M.players) if (q !== p) place(q, h.x - h.dir * 500, 640);
    place(p, h.x + h.dir * 140, h.z + 30); p.state = 'free'; p.vx = p.vz = 0; giveBall(p, 'steal'); M.possTeam = p.team; M.inb = null;
    M.cmdHook = q => { zeroCmd(q.cmd); return true; };
    startDunk(p, { D: 0.9 }); p.act.type = 'tomahawk'; p.act.big = true;
    // the camera locked on the dunker: centred on him, a fixed zoom; each frame cropped around him
    const Z = 1.7, CW = 150, CH = 190, sc = canvas.width / W, shots = [];
    const _dp = drawPlayer;
    const snap = () => {
      cam.zoom = Z; cam.fx = p.x; cam.x = p.x - W / 2; FX.sx = FX.sy = 0;   // the camera on him
      let at = null;                                            // where he lands on the canvas, from the transform he is drawn with
      drawPlayer = function (g, q) { if (q === p) { const T = g.getTransform(), [x, y] = P(p.x, p.y + 55, p.z), d = T.transformPoint(new DOMPoint(x, y)); at = [d.x, d.y, Math.hypot(T.a, T.b)]; } return _dp.apply(this, arguments); };
      try { render(ctx); } finally { drawPlayer = _dp; }
      const k = at ? at[2] / Z : sc, cx = at ? at[0] : canvas.width / 2, cy = at ? at[1] : canvas.height / 2;
      const c = document.createElement('canvas'); c.width = CW * sc; c.height = CH * sc;
      c.getContext('2d').drawImage(canvas, cx - CW * k * Z / 2, cy - CH * k * Z / 2, CW * k * Z, CH * k * Z, 0, 0, CW * sc, CH * sc);
      shots.push({ c, st: p.state, u: p.act && p.state === 'dunk' ? p.act.s : null });
    };
    let n = 0; snap();
    while (n < 240 && !(p.state === 'free' && p.y <= 0 && shots.some(s => s.st === 'land' || s.st === 'free' && s.u == null))) { updateMatch(STEP); n++; snap(); if (p.state === 'free' && p.y <= 0) break; }
    M.cmdHook = null;
    // 24 frames from take-off to landing, two rows of 12
    const N = 24, pickIdx = Array.from({ length: N }, (_, i) => Math.round(i / (N - 1) * (shots.length - 1)));
    const cw = CW * sc * 0.6, ch = CH * sc * 0.6, out = document.createElement('canvas');
    out.width = 12 * cw; out.height = 2 * ch + 40;
    const g = out.getContext('2d'); g.fillStyle = '#0b1320'; g.fillRect(0, 0, out.width, out.height);
    g.fillStyle = '#f2cf6b'; g.font = 'bold 22px sans-serif'; g.fillText('Tomahawk: ' + style + '   (' + shots.length + ' frames at 60 fps, every ' + ((shots.length - 1) / (N - 1)).toFixed(1) + ')', 10, 27);
    pickIdx.forEach((k, i) => {
      const s = shots[k], x = (i % 12) * cw, y = 40 + Math.floor(i / 12) * ch;
      g.drawImage(s.c, x, y, cw, ch);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y, cw, 20); g.fillStyle = '#fff'; g.font = '14px sans-serif';
      g.fillText(s.u != null ? 'u ' + s.u.toFixed(2) + (s.u >= 0.8 ? ' slam' : '') : s.st, x + 4, y + 15);
    });
    return out.toDataURL('image/png');
  }, style);
  await page.close();
  const file = path.join(OUT, `tomahawk-${style}.png`);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', path.relative(ROOT, file));
}
if (errs.length) console.log('page errors:', errs);
await browser.close(); srv.close();
process.exit(errs.length ? 1 : 0);
