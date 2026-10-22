// npm run review:looks  (builds first; or: node scripts/review-looks.mjs [--page dist/web/index.html] [--no-shots])
// v9.6 art slice:
//   docs/review/look-compare.html       the compare page: the whole web build plus the Review Studio's animation
//                                       agents and tools/look-compare.ui.js, in one file (open it directly, no build)
//   docs/review/img/look-sheet-<look>.png   a contact sheet per look (current, a, b, c)
//   docs/review/img/look-<look>.gif          run → dribble → shoot → tomahawk → celebrate, per look (needs python3 + Pillow)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const OUT = path.resolve(ROOT, arg('--out', 'docs/review/look-compare.html'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const CSS = `
#lc { font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #e8e6e1; background: #101317; min-height: 100vh; padding: 14px 16px 40px; box-sizing: border-box; }
#lc h1 { font-size: 20px; margin: 0 0 4px; color: #f2cf6b; } #lc h2 { font-size: 16px; margin: 22px 0 8px; color: #f2cf6b; } #lc header p, #lc .note { color: #9aa0aa; margin: 0 0 10px; max-width: 900px; }
#lc .bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0 12px; position: sticky; top: 0; background: #101317; padding: 6px 0; z-index: 2; }
#lc button, #lc select { font: inherit; color: inherit; background: #22262e; border: 1px solid #2e333d; border-radius: 6px; padding: 5px 10px; min-height: 32px; cursor: pointer; }
#lc .seg { display: inline-flex; } #lc .seg button { border-radius: 0; } #lc .seg button:first-child { border-radius: 6px 0 0 6px; } #lc .seg button:last-child { border-radius: 0 6px 6px 0; }
#lc button.on { background: #3a3f4a; border-color: #e3b448; } #lc #frame { font: 12px ui-monospace, monospace; color: #9aa0aa; margin-left: 8px; }
#lc .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 10px; } #lc .grid.one { grid-template-columns: 1fr; }
#lc figure { margin: 0; background: #181b21; border: 1px solid #2e333d; border-radius: 10px; padding: 8px; overflow: auto; } #lc figcaption { color: #cfd8e3; font-weight: 600; padding-top: 6px; }
#lc canvas { display: block; max-width: none; image-rendering: pixelated; } #lc .grid canvas { width: 100%; height: auto; }
html, body { margin: 0; background: #101317; overflow: auto !important; }
`;
let html = fs.readFileSync(PAGE, 'utf8');
const inject = `<div id="lc"></div>\n<style>${CSS}</style>\n<script>\n// Review Studio agents (src/review-studio/agent.game.js, agent2.game.js)\n${read('src/review-studio/agent.game.js')}\n${read('src/review-studio/agent2.game.js')}\n</script>\n<script>\n${read('tools/look-compare.ui.js')}\n</script>\n`;
if (!html.includes('</body>')) throw new Error('no </body> in ' + PAGE);
html = html.replace(/<title>[^<]*<\/title>/, '<title>Islam Dunk art slice: compare looks</title>').replace('</body>', () => inject + '</body>');
fs.writeFileSync(OUT, html);
console.log('wrote', path.relative(ROOT, OUT), (html.length / 1e6).toFixed(2) + ' MB');

if (!process.argv.includes('--no-shots')) {
  const { chromium } = await import('playwright');
  const IMG = path.join(ROOT, 'docs/review/img'), TMP = path.join(ROOT, 'node_modules/.cache/look-gif');
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route(/^https?:/, r => r.abort());
  await page.goto('file://' + OUT);
  await page.waitForFunction(() => window.__lc && window.__lc.ready, null, { timeout: 30000 });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(IMG, 'look-compare-page.png') });
  for (const look of ['', 'a', 'b', 'c']) {
    const name = look || 'current';
    const png = await page.evaluate(l => window.__lc.sheet(l), look);
    fs.writeFileSync(path.join(IMG, `look-sheet-${name}.png`), Buffer.from(png.split(',')[1], 'base64'));
    const frames = await page.evaluate(l => window.__lc.gifFrames(l), look), dir = path.join(TMP, name);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    frames.forEach((f, i) => fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.png'), Buffer.from(f.split(',')[1], 'base64')));
    try {
      execFileSync('python3', ['-c', `import sys,glob
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/*.png')); im=[Image.open(f).convert('RGB').quantize(colors=128, method=2) for f in fs]
im[0].save(sys.argv[2], save_all=True, append_images=im[1:], duration=33, loop=0, optimize=True)`, dir, path.join(IMG, `look-${name}.gif`)]);
    } catch (e) { console.error('GIF for', name, 'not made (python3 + Pillow needed):', String(e.message).split('\n')[0]); }
    console.log(name, ': sheet +', frames.length, 'GIF frames');
  }
  await browser.close();
  const real = errs.filter(e => !/Failed to load resource/.test(e)); if (real.length) { console.error('page errors:', real.slice(0, 10)); process.exitCode = 1; }
}
