// temporary (v9.17.6 measurement): print CI's rejected frames into the log, base64 in 2000-character lines
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const p = 'tests/output/' + f; if (!fs.existsSync(p)) { console.log(`VIS ${f} missing`); continue; }
  const b = fs.readFileSync(p).toString('base64');
  for (let i = 0; i < b.length; i += 2000) console.log(`VIS ${f} ${i / 2000} ${b.slice(i, i + 2000)}`);
  console.log(`VIS ${f} end ${b.length}`);
}
