// Vite plugin for the Review Studio (vite --mode review / vite build --mode review). Never part of the game builds:
// the web and Electron builds use tools/vite-plugin-islamdunk.js only, whose single output is index.html.
//
// The studio is review.html + src/review-studio/ (ES modules). It renders the game's real items by loading the
// real game page in a same-origin iframe (game.html) and calling the game's own functions there. game.html is the
// shipping page (pageHtml) with one script added in front of the game script (STUDIO_SANDBOX):
//   - localStorage and sessionStorage are in-memory, so the studio can never read or overwrite a real save
//     (even when it's served from the same origin as the game)
//   - the phone text audit hook (tests/phone-audit.mjs AUDIT_INIT) for the Screens flags
//   - page errors are collected in window.__studioErrors
// review-data.json carries what only the build can see: every text literal with file:line (tools/review-text.mjs),
// the ID registry (docs/review/studio-ids.json), the voice manifest if there is one, and the build version.
import fs from 'node:fs';
import path from 'node:path';
import { pageHtml } from './vite-plugin-islamdunk.js';
import { collectText, manifestFiles, FLAG, FLAG9, FLAG92 } from './review-text.mjs';
import { AUDIT_INIT, SCREENS } from '../tests/phone-audit.mjs';
import { soundCalls } from './sound-list.mjs';

export const STUDIO_SANDBOX = `window.__STUDIO__ = true; window.__studioErrors = [];
addEventListener('error', e => { window.__studioErrors.push(String(e.message || e.error || e)); });
addEventListener('unhandledrejection', e => { window.__studioErrors.push('unhandled: ' + String(e.reason && e.reason.message || e.reason)); });
(() => {
  const mk = () => { const m = new Map(); return { getItem: k => (m.has(String(k)) ? m.get(String(k)) : null), setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: k => { m.delete(String(k)); }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
  for (const n of ['localStorage', 'sessionStorage']) try { Object.defineProperty(window, n, { value: mk(), configurable: true }); } catch (e) {}
})();
${AUDIT_INIT}
`;

export function studioGameHtml(root) {
  const html = pageHtml(root);
  return html.replace('<script>\n', () => '<script>\n' + STUDIO_SANDBOX + '</script>\n<script>\n');   // the sandbox runs first
}
// where things are defined: the first `id: 'x'` / `short: 'x'` / `key: 'x'` (then `x: {` / `x: [`) in the game source
export function sourceDefs(root) {
  const defs = {}, weak = {};
  for (const f of manifestFiles(root)) {
    const p = path.join(root, 'src', f); if (!fs.existsSync(p)) continue;
    const rel = f, lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      for (const m of ln.matchAll(/\b(?:id|short|key)\s*:\s*'([^']+)'/g)) if (!defs[m[1]]) defs[m[1]] = rel + ':' + (i + 1);
      const k = ln.match(/^\s*([A-Za-z_]\w*)\s*:\s*[{\[]/); if (k && !weak[k[1]]) weak[k[1]] = rel + ':' + (i + 1);
    });
  }
  return Object.assign(weak, defs);
}
// every Game.screen name the game's source sets or tests
export function screenNames(root) {
  const out = new Set();
  for (const f of manifestFiles(root)) { const p = path.join(root, 'src', f); if (!fs.existsSync(p)) continue;
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/Game\.screen\s*(?:===|!==|=)\s*'([a-z0-9]+)'/g)) out.add(m[1]); }
  return [...out].sort();
}
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const FIRST_RUN_IMG = root => path.join(root, 'docs/review/img/first-run');
export function studioData(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const text = collectText(root).map(r => ({ text: r.text, file: r.file, line: r.line, section: r.section, speaker: r.speaker, phase1: !r.isNew, flag: r.flag ? r.flag.split(':')[0] : '' }));
  const reg = path.join(root, 'docs/review/studio-ids.json'), voice = path.join(root, 'assets/voice/manifest.json');
  return {
    version: pkg.version, built: new Date().toISOString(),
    flags: { [FLAG.note.split(':')[0]]: FLAG.note, [FLAG9.note.split(':')[0]]: FLAG9.note, [FLAG92.note.split(':')[0]]: FLAG92.note },
    text, defs: sourceDefs(root), screens: SCREENS, screenNames: screenNames(root), soundCalls: soundCalls(root),
    census: readJson(path.join(root, 'docs/review/screen-census.json')), firstRun: readJson(path.join(root, 'docs/review/first-run.json')),
    registry: fs.existsSync(reg) ? JSON.parse(fs.readFileSync(reg, 'utf8')) : { ids: {}, removed: {} },
    voice: fs.existsSync(voice) ? JSON.parse(fs.readFileSync(voice, 'utf8')) : null
  };
}

export default function reviewStudio() {
  let root = process.cwd();
  return {
    name: 'islamdunk-review-studio',
    configResolved(cfg) { root = cfg.root; },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'game.html', source: studioGameHtml(root) });
      this.emitFile({ type: 'asset', fileName: 'review-data.json', source: JSON.stringify(studioData(root)) });
      const fr = FIRST_RUN_IMG(root); if (fs.existsSync(fr)) for (const f of fs.readdirSync(fr)) this.emitFile({ type: 'asset', fileName: 'first-run/' + f, source: fs.readFileSync(path.join(fr, f)) });   // v9.13
    },
    configureServer(server) {
      server.watcher.add([path.join(root, 'src'), path.join(root, 'web'), path.join(root, 'docs/review/studio-ids.json')]);
      server.watcher.on('change', file => { if (file.includes(path.sep + 'src' + path.sep) && !file.includes('review-studio')) server.ws.send({ type: 'full-reload' }); });
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        try {
          if (url === '/' ) { res.statusCode = 302; res.setHeader('Location', '/review.html'); res.end(); return; }
          if (url === '/game.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(studioGameHtml(root)); return; }
          if (url.startsWith('/first-run/')) { const f = path.join(FIRST_RUN_IMG(root), path.basename(url)); if (fs.existsSync(f)) { res.setHeader('Content-Type', 'image/jpeg'); res.end(fs.readFileSync(f)); return; } }
          if (url === '/review-data.json') { res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(studioData(root))); return; }
        } catch (e) { next(e); return; }
        next();
      });
    }
  };
}
