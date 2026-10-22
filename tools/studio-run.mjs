// Open the built Review Studio (dist/review) in headless Chromium. Used by npm run review:ids and the tests.
// The studio must be served over http (the game frame is same-origin with the studio); this is a tiny static
// server on 127.0.0.1 for the run only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
export function serveDir(dir) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/review.html';
      const f = path.join(dir, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
      if (!f.startsWith(dir)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
    }).listen(0, '127.0.0.1', () => res({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}
// open the studio; returns { page, errors, close }
export async function openStudio(browser, dir, { viewport = { width: 1440, height: 900 }, storage = null } = {}) {
  const { srv, base } = await serveDir(path.resolve(dir));
  const ctx = await browser.newContext({ viewport });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (storage) await ctx.addInitScript(s => { try { localStorage.setItem('islamdunk.studio', s); } catch (e) {} }, storage);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('studio: ' + e.message));
  await page.goto(base + '/review.html');
  await page.waitForFunction(() => window.__studio && (window.__studio.ready || window.__studio.bootError), null, { timeout: 60000 });
  const boot = await page.evaluate(() => window.__studio.bootError || null);
  if (boot) errors.push('boot: ' + boot);
  return { page, ctx, base, errors, close: async () => { await ctx.close(); srv.close(); } };
}
