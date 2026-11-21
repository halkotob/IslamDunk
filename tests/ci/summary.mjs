// CI (ci-health): after the test jobs, check that every full-tier test ran exactly once across them and passed, and
// print where the time went: each job's wall time, the slowest ten tests, the total. Writes the merged times to
// tests/output/test-times.json (copy it to tests/ci/test-times.json to re-balance the groups).
//   node tests/ci/summary.mjs <folder holding each job's tests/output/ran.json, any depth>
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = path.resolve(process.argv[2] || 'shards');
const files = fs.readdirSync(dir, { recursive: true }).filter(f => path.basename(f) === 'ran.json').map(f => path.join(dir, f));
const jobs = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const want = execFileSync(process.execPath, [path.join(ROOT, 'tests/run.mjs'), '--full', '--list'], { encoding: 'utf8' })
  .split('\n').slice(0, -2).map(l => l.split(/\s+/)[0]).filter(Boolean);
const count = {}, took = {}, res = {};
for (const j of jobs) for (const [n, t] of Object.entries(j.took)) { count[n] = (count[n] || 0) + 1; took[n] = t; res[n] = j.results[n]; }
const missing = want.filter(n => !count[n]), twice = Object.keys(count).filter(n => count[n] > 1), extra = Object.keys(count).filter(n => !want.includes(n));
const failed = Object.keys(res).filter(n => !res[n]);
const L = [];
L.push(`${jobs.length} jobs: ${jobs.map(j => `${j.shard ? 'shard ' + j.shard : 'serial ' + j.serial} ${Math.round(j.wall)} s`).join(', ')}`);
L.push(`longest job: ${Math.round(Math.max(...jobs.map(j => j.wall)))} s of tests; ${Object.keys(count).length}/${want.length} full-tier tests ran, ${Object.values(took).reduce((a, b) => a + b, 0).toFixed(0)} s of tests`);
L.push('slowest ten: ' + Object.entries(took).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, t]) => `${n} ${t.toFixed(0)} s`).join(', '));
if (missing.length) L.push('NOT RUN: ' + missing.join(', '));
if (twice.length) L.push('RAN TWICE: ' + twice.join(', '));
if (extra.length) L.push('not in the full tier: ' + extra.join(', '));
L.push(failed.length ? 'FAILED: ' + failed.join(', ') : 'every test passed');
console.log(L.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Tests\n\n' + L.map(l => '- ' + l).join('\n') + '\n');
fs.mkdirSync(path.join(ROOT, 'tests/output'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tests/output/test-times.json'), JSON.stringify(Object.fromEntries(Object.keys(took).sort().map(n => [n, Math.round(took[n] * 10) / 10])), null, 1) + '\n');
process.exit(missing.length || twice.length || failed.length || !jobs.length ? 1 : 0);
