// GitHub Pages serves the repository root of `main`. This copies the web build (dist/web) to the root:
// index.html, manifest.webmanifest and icons/. Run via `npm run publish:web` after changing src/.
// `--check` only verifies the root is up to date with src/ (exit code 1 if not).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist/web');
const check = process.argv.includes('--check');
const files = ['index.html', 'manifest.webmanifest', ...fs.readdirSync(path.join(dist, 'icons')).map(f => 'icons/' + f)];
let stale = [];
for (const f of files) {
  const src = path.join(dist, f), dst = path.join(root, f);
  const same = fs.existsSync(dst) && Buffer.compare(fs.readFileSync(src), fs.readFileSync(dst)) === 0;
  if (same) continue;
  if (check) { stale.push(f); continue; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('published', f);
}
// v9.21.1: the Review Studio (dist/review) goes to studio/ at the same site: <pages>/studio/review.html. It's public but
// unlisted (noindex on both pages, no link from the game). The folder is replaced whole so nothing stale stays.
const rdist = path.join(root, 'dist/review'), rdst = path.join(root, 'studio');
if (fs.existsSync(path.join(rdist, 'review.html'))) {
  const list = d => fs.readdirSync(d, { recursive: true }).filter(f => fs.statSync(path.join(d, f)).isFile()).sort();
  // (review-data.json carries its build time: that alone isn't a change)
  const noTime = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); delete j.built; return JSON.stringify(j); };
  const sameFile = f => f === 'review-data.json' ? noTime(path.join(rdist, f)) === noTime(path.join(rdst, f)) : Buffer.compare(fs.readFileSync(path.join(rdist, f)), fs.readFileSync(path.join(rdst, f))) === 0;
  const a = list(rdist), b = fs.existsSync(rdst) ? list(rdst) : [];
  const bb = b.filter(f => f !== 'index.html'), same = a.length === bb.length && a.every((f, i) => f === bb[i] && sameFile(f));
  if (!same) {
    if (check) stale.push('studio/');
    else { fs.rmSync(rdst, { recursive: true, force: true }); fs.cpSync(rdist, rdst, { recursive: true }); fs.writeFileSync(path.join(rdst, 'index.html'), '<!doctype html><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=review.html"><a href="review.html">Review Studio</a>\n'); console.log('published studio/ (' + a.length + ' files)'); }
  }
} else if (!check) console.log('no dist/review: run vite build --mode review to publish the studio');
if (check) {
  if (stale.length) { console.error('Pages files are out of date with src/: ' + stale.join(', ') + '\nRun: npm run publish:web'); process.exit(1); }
  console.log('Pages files match the build.');
}
