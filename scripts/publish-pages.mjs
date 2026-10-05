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
if (check) {
  if (stale.length) { console.error('Pages files are out of date with src/: ' + stale.join(', ') + '\nRun: npm run publish:web'); process.exit(1); }
  console.log('Pages files match the build.');
}
