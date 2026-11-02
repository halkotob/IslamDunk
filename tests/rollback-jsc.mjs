// v9.14 rollback: the scripted match of tests/rollback-session.js in JavaScriptCore (Safari's engine), through bun:
//   bun tests/rollback-jsc.mjs <dist/web/index.html> <frames>     prints { sums, score } as JSON
// The game's script runs as a classic script (vm.runInThisContext) with the browser stubbed out; only the match runs.
import fs from 'fs'; import vm from 'vm';
const [file, frames] = [process.argv[2], +process.argv[3]];
const html = fs.readFileSync(file, 'utf8'), code = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const stub = () => { let P; const f = function () { return P; }; P = new Proxy(f, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === Symbol.iterator ? function* () {} : k === 'then' ? undefined : P, set: () => true, apply: () => P, construct: () => P, has: () => false }); return P; };
const store = {};
Object.assign(globalThis, {
  window: globalThis, self: globalThis,
  document: { createElement: () => stub(), getElementById: () => stub(), querySelector: () => stub(), querySelectorAll: () => [], body: stub(), documentElement: stub(), head: stub(), addEventListener() {}, removeEventListener() {}, hidden: false, visibilityState: 'visible', fonts: { load: () => Promise.resolve(), ready: Promise.resolve(), add() {} }, title: '', createTextNode: () => stub(), cookie: '' },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear() {}, key: () => null, length: 0 },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  location: { search: '?nowelcome=1', href: 'http://x/', hash: '', origin: 'http://x', pathname: '/', protocol: 'http:', host: 'x' },
  Image: function () { return stub(); }, FontFace: function () { return { load: () => Promise.resolve() }; }, Path2D: function () { return stub(); },
  HTMLElement: function () {}, CanvasRenderingContext2D: function () {}, screen: { width: 1280, height: 720, orientation: stub() },
  history: { replaceState() {}, pushState() {} }, getComputedStyle: () => stub(), ResizeObserver: function () { return { observe() {}, disconnect() {} }; }
});
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'bun', webdriver: true, maxTouchPoints: 0, getGamepads: () => [], language: 'en', languages: ['en'], vibrate() {}, hardwareConcurrency: 4, clipboard: stub(), onLine: true }, configurable: true }); } catch (e) {}
let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
globalThis.__seed = n => { s = n | 0; };
globalThis.__P = { frames, noisy: false };
vm.runInThisContext(code, { filename: 'game.js' });
const out = vm.runInThisContext(fs.readFileSync(new URL('./rollback-session.js', import.meta.url), 'utf8'), { filename: 'rollback-session.js' });
console.log(JSON.stringify(out)); process.exit(0);
