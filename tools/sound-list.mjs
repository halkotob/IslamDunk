// node tools/sound-list.mjs            writes docs/audio/sound-list.csv
// v9.13: every place the game triggers a sound (a scan of the game's source for SFX.<id>(...) calls) and the events
// that have no sound yet (a hand-kept list, checked against the source: the test fails if one of them gets a sound
// without the list being updated). The Review Studio shows the calls next to each sound (review-data.json soundCalls).
import fs from 'node:fs';
import path from 'node:path';
import { manifestFiles } from './review-text.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const THIS_OK = new Set(['dunkNet', 'swish', 'netSwish', 'rimTick', 'slam', 'clank', 'bounce']);   // sounds that call each other (slam -> dunkNet, swish -> netSwish)
// the function (or wrapper) a line sits in: the nearest definition above it
const DEF = /(?:function\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$.]*)\s*=\s*function\b|^\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{|([A-Za-z_$][\w$.]*)\s*=\s*\([^)]*\)\s*=>)/;
export function soundCalls(root = ROOT, ids = null) {
  const out = {};
  for (const f of manifestFiles(root)) {
    if (/sfx-variants|sfx-levels|sfx-moments\.js|v913-crowd/.test(f)) continue;            // the sound engine itself
    const p = path.join(root, 'src', f); if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8'), lines = src.split('\n'), sfxFile = /Object\.assign\(SFX|const SFX = \{/.test(src); let fn = '';
    lines.forEach((ln, i) => {
      const d = ln.match(DEF); if (d) fn = d[1] || d[2] || d[3] || d[4] || fn;
      for (const m of ln.matchAll(/\b(?:SFX|this)\.([a-zA-Z]+)\s*\(/g)) {
        if (m[0].startsWith('this') && (!sfxFile || !THIS_OK.has(m[1]))) continue;     // this.<id>() only for the sound ids, in the files that define them
        const id = m[1]; if (ids && !ids.includes(id)) continue;
        if (['init', 'resume', 'setOn', 'tone', 'hiss', 'setCrowdLevel', 'netNoise', 'crowd', 'play'].includes(id)) continue;
        (out[id] = out[id] || []).push({ file: f, line: i + 1, fn });
      }
    });
  }
  return out;
}
// events with no sound of their own (what you'd expect to hear, and what plays now)
export const NO_SOUND = [
  // (v9.17.5: the other 16 have sounds now, core/sfx-moments.js; these stay silent on purpose: no music, no bed)
  ['Ambience', 'Neighbourhood scenes (home, street, masjid front, store)', 'none'],
  ['Ambience', 'Inside the masjid: musalla, office, the Jumu’ah room', 'none'],
  ['Ambience', 'The career hub', 'none'],
  ['Ambience', 'Menus over the attract match', 'that match’s crowd (the classic arena: tier 4)'],
  ['Ambience', 'The practice gym', 'none (v9.13: no crowd bed there any more)']
];
const esc = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function soundListCsv(root = ROOT) {
  const calls = soundCalls(root), rows = [['kind', 'sound', 'file', 'line', 'function', 'event', 'what plays now']];
  for (const id of Object.keys(calls).sort()) for (const c of calls[id]) rows.push(['trigger', id, c.file, c.line, c.fn, '', '']);
  for (const [area, ev, now] of NO_SOUND) rows.push(['no sound', '', '', '', '', area + ': ' + ev, now]);
  return rows.map(r => r.map(esc).join(',')).join('\n') + '\n';
}
if (process.argv[1] && process.argv[1].endsWith('sound-list.mjs')) {
  const f = path.join(ROOT, 'docs/audio/sound-list.csv'); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, soundListCsv());
  const calls = soundCalls(); console.log(`${f}: ${Object.values(calls).reduce((a, x) => a + x.length, 0)} trigger sites for ${Object.keys(calls).length} sounds, ${NO_SOUND.length} events with no sound`);
}
