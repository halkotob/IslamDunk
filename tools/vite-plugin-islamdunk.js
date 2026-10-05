// Vite plugin: assembles the game from src/ fragments.
//
// The game script is split into files under src/ along its original section markers, but it still
// runs as ONE classic script with one shared scope (the code relies on whole-script function hoisting
// and on later layers reassigning earlier functions: `const _x = fn; fn = function () { ... }`).
// So instead of ES-module imports, the build concatenates the files in the order listed in
// src/manifest.json and inlines the result into web/index.html at %%GAME_SCRIPT%%, exactly as the
// single-file game always shipped.
//
//   build (web):       dist/web/index.html, one file, script inlined, plus assets/ (icons, manifest)
//   build (electron):  same page + the Electron save bridge inlined before the game script
//   serve (dev):       the page loads /@islamdunk/game.js, the same concatenation with a source map
//                      back to each src/ file; any change under src/ or web/ reloads the page.
import fs from 'node:fs';
import path from 'node:path';
import MagicString, { Bundle } from 'magic-string';

const PLACEHOLDER = '%%GAME_SCRIPT%%';
const DEV_URL = '/@islamdunk/game.js';
const EMPTY_ENTRY = '\0islamdunk-empty-entry';

export function readManifest(root) {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  return m.files;
}

// The exact game script: fragments joined in manifest order (each fragment ends with '\n').
export function gameScript(root) {
  return readManifest(root).map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('');
}

export function pageHtml(root, { electron = false } = {}) {
  const shell = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  if (!shell.includes(PLACEHOLDER)) throw new Error('web/index.html is missing ' + PLACEHOLDER);
  let html = shell.replace(PLACEHOLDER, () => gameScript(root));
  if (electron) {
    const bridge = fs.readFileSync(path.join(root, 'electron/renderer-bridge.js'), 'utf8');
    html = html.replace('<script>\n', () => '<script>\n' + bridge + '</script>\n<script>\n');   // bridge runs first
  }
  return html;
}

function devScript(root) {
  const bundle = new Bundle();
  for (const f of readManifest(root)) {
    const file = path.join(root, 'src', f);
    bundle.addSource({ filename: '/src/' + f, content: new MagicString(fs.readFileSync(file, 'utf8')) });
  }
  const map = bundle.generateMap({ hires: true, includeContent: true, file: 'game.js' });
  return bundle.toString() + '\n//# sourceMappingURL=' + map.toUrl() + '\n';
}

export default function islamDunk({ target = 'web' } = {}) {
  let root = process.cwd();
  return {
    name: 'islamdunk',
    configResolved(cfg) { root = cfg.root; },
    // build: an empty JS entry keeps Rollup happy; the real output is the page emitted below
    resolveId(id) { return id === EMPTY_ENTRY ? id : null; },
    load(id) { return id === EMPTY_ENTRY ? 'export {};' : null; },
    generateBundle(_, bundle) {
      for (const k of Object.keys(bundle)) if (bundle[k].type === 'chunk') delete bundle[k];
      this.emitFile({ type: 'asset', fileName: 'index.html', source: pageHtml(root, { electron: target === 'electron' }) });
    },
    configureServer(server) {
      const watchDirs = [path.join(root, 'src'), path.join(root, 'web'), path.join(root, 'electron/renderer-bridge.js')];
      server.watcher.add(watchDirs);
      server.watcher.on('change', file => { if (watchDirs.some(d => file.startsWith(d))) server.ws.send({ type: 'full-reload' }); });
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        try {
          if (url === DEV_URL) {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
            res.end(devScript(root)); return;
          }
          if (url === '/' || url === '/index.html') {
            const shell = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
            let html = shell.replace('<script>\n' + PLACEHOLDER + '</script>', `<script src="${DEV_URL}"></script>`);
            if (target === 'electron') html = html.replace(`<script src="${DEV_URL}">`, `<script src="/electron/renderer-bridge.js"></script>\n<script src="${DEV_URL}">`);
            html = await server.transformIndexHtml(req.url, html);   // adds Vite's client (live reload)
            res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return;
          }
        } catch (e) { next(e); return; }
        next();
      });
    },
  };
}

export { EMPTY_ENTRY };
