// node tools/sfx-levels.mjs [--page dist/web/index.html]
// v9.13: measures every sound variant (tests/sfx-measure.js) and writes src/core/sfx-levels.js: the dB that makes
// B, C and D (and any recorded variant) about as loud as A, the current sound. Rebuild after running it.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SFX_MEASURE_INIT } from '../tests/sfx-measure.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html'));
const b = await chromium.launch(), p = await b.newPage();
await p.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
await p.goto('file://' + PAGE);
await p.waitForFunction(() => typeof SFX_VARIANTS !== 'undefined' && typeof Game !== 'undefined');
await p.evaluate(SFX_MEASURE_INIT);
const ids = await p.evaluate(() => SFX_IDS), keys = ['A', 'B', 'C', 'D'];
const m = await p.evaluate(([ids, keys]) => window.SFX_MEASURE(ids, keys, Array.from({ length: 16 }, (_, i) => i + 1), false), [ids, keys]);
await b.close();
const T = {};
for (const id of ids) { T[id] = {}; for (const k of keys.slice(1)) T[id][k] = Math.round((m[id].A.db - m[id][k].db) * 10) / 10; }
const lines = ids.map(id => `  ${/^[a-z]\w*$/.test(id) ? id : JSON.stringify(id)}: { ${keys.slice(1).map(k => k + ': ' + T[id][k]).join(', ')} }`);
const head = fs.readFileSync(path.join(ROOT, 'src/core/sfx-levels.js'), 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n');
fs.writeFileSync(path.join(ROOT, 'src/core/sfx-levels.js'), head + '\nconst SFX_LEVELS = {\n' + lines.join(',\n') + '\n};\n');
for (const id of ids) console.log(id.padEnd(10), keys.map(k => k + ' ' + m[id][k].db.toFixed(1)).join('  '), ' -> ', JSON.stringify(T[id]), m[id].A.errors.concat(m[id].B.errors, m[id].C.errors, m[id].D.errors).join('; '));
