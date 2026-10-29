// node tools/lag-report.mjs [--page dist/web/index.html] [--json out.json] [--only 0,2] [--tries 6] [--host-eval 'Net.noCompact = true']
// v9.10: the lag harness (tests/lag-harness.mjs) over its four network profiles, as a table.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { LAG_PROFILES, lagRun, lagTable } from '../tests/lag-harness.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), ONLY = (arg('--only', '') || '').split(',').filter(Boolean).map(Number);
const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
const browser = await chromium.launch(), rows = [];
for (const [i, [name, prof]] of LAG_PROFILES.entries()) { if (ONLY.length && !ONLY.includes(i)) continue; const r = await lagRun(browser, `http://127.0.0.1:${srv.address().port}`, name, prof, { tries: +arg('--tries', 6), hostEval: arg('--host-eval', '') }); rows.push(r); console.error(name, JSON.stringify(r)); }
await browser.close(); srv.close();
console.log(lagTable(rows)); console.log('bytes per snapshot on the wire: ' + rows.map(r => r.name.split(',')[0] + ' ' + r.snapBytes).join(', '));
const J = arg('--json', null); if (J) fs.writeFileSync(J, JSON.stringify(rows, null, 1));
