// npm run review:ids [-- --remove "reason" id id ...]
// Keeps docs/review/studio-ids.json, the Review Studio's ID registry, up to date:
//   - every item the studio lists today gets an entry { id: version added }. New items get this build's version.
//     On the very first run (no registry yet), each item's version comes from git blame of its source line
//     ("phase1" if the text was in the Phase 1 review packet; v8.6.0 = "8.6.0 or earlier", the first commit here).
//   - an ID that was in the registry and is gone fails (exit 1) unless it is listed as removed:
//       npm run review:ids -- --remove "merged into the new intro" dialogue/intro/wrap/3
//     Removed IDs stay listed with the reason, so their old review rows still make sense.
// The tests fail when an ID disappears without being listed, or when two items share an ID.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { openStudio } from '../tools/studio-run.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REG = path.join(ROOT, 'docs/review/studio-ids.json');
const args = process.argv.slice(2), ri = args.indexOf('--remove');
const removeReason = ri >= 0 ? args[ri + 1] : null, removeIds = ri >= 0 ? args.slice(ri + 2) : [];
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const browser = await chromium.launch();
const st = await openStudio(browser, path.join(ROOT, 'dist/review'));
if (st.errors.length) { console.error(st.errors.join('\n')); process.exit(1); }
const items = await st.page.evaluate(() => window.__studio.list());
await st.close(); await browser.close();

const first = !fs.existsSync(REG);
const reg = first ? { note: 'Review Studio item IDs and the version each was added in. Kept by npm run review:ids. Never reuse a removed ID.', ids: {}, removed: {} } : JSON.parse(fs.readFileSync(REG, 'utf8'));
const dup = items.map(i => i.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dup.length) { console.error('Two items share an ID:', [...new Set(dup)].join(', ')); process.exit(1); }

// git blame: file -> line -> version of the commit that last touched it
const blames = {};
const added = {};
function fileVersion(f) {                 // the version whose commit added the file
  if (!(f in added)) { try { const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%s', '--', f], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').pop(); const v = /^v(\d+\.\d+\.\d+)/.exec(out || ''); added[f] = v ? v[1] : null; } catch (e) { added[f] = null; } }
  return added[f];
}
function blameVersion(where) {
  if (where && !/:\d+$/.test(where)) return fileVersion('src/' + where);
  const m = /^(.+?):(\d+)$/.exec(where || ''); if (!m) return null;
  const f = 'src/' + m[1];
  if (!(f in blames)) {
    blames[f] = null;
    try {
      const out = execFileSync('git', ['blame', '--line-porcelain', f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
      const summ = {}, lines = []; let sha = null;
      for (const ln of out.split('\n')) {
        const h = /^([0-9a-f]{40}) \d+ (\d+)/.exec(ln); if (h) { sha = h[1]; lines[+h[2]] = sha; continue; }
        if (ln.startsWith('summary ')) summ[sha] = ln.slice(8);
      }
      blames[f] = lines.map(s => { const v = /^v(\d+\.\d+\.\d+)/.exec(summ[s] || ''); return v ? v[1] : version; });
    } catch (e) { blames[f] = null; }
  }
  return blames[f] ? blames[f][+m[2]] || null : null;
}

const now = new Set(items.map(i => i.id));
let nAdded = 0;
for (const it of items) {
  if (reg.ids[it.id] || reg.removed[it.id]) continue;
  reg.ids[it.id] = first ? (it.version === 'phase1' ? 'phase1' : blameVersion(it.where) || version) : version;
  nAdded++;
}
for (const id of removeIds) { if (!reg.ids[id]) { console.error('not in the registry:', id); process.exit(1); } reg.removed[id] = { reason: removeReason || 'removed', version, was: reg.ids[id] }; delete reg.ids[id]; }
const gone = Object.keys(reg.ids).filter(id => !now.has(id));
if (gone.length) {
  console.error(`${gone.length} registered ID(s) no longer exist. If they were removed on purpose, list them:\n  npm run review:ids -- --remove "why" ${gone.slice(0, 5).join(' ')}${gone.length > 5 ? ' ...' : ''}`);
  console.error(gone.slice(0, 40).join('\n'));
  process.exit(1);
}
const sorted = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
reg.ids = sorted(reg.ids); reg.removed = sorted(reg.removed);
fs.writeFileSync(REG, JSON.stringify(reg, null, 1) + '\n');
const by = {}; for (const v of Object.values(reg.ids)) by[v] = (by[v] || 0) + 1;
console.log(`studio-ids.json: ${Object.keys(reg.ids).length} IDs (${nAdded} new, ${removeIds.length} removed). By version:`, by);
