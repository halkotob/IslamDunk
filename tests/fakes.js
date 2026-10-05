// Test doubles for the online transports, so online play can be tested on one machine with no network.
// Both share state between tabs of one browser context through localStorage + 'storage' events.

// Fake Firebase Web SDK (served in place of gstatic firebase-app.js / firebase-database.js).
export const FAKE_FIREBASE_APP = `export function initializeApp(cfg, name) { return { cfg, name }; }`;
export const FAKE_FIREBASE_DB = `
// Each peer node (rooms/<code>/peers/<id>) lives under its own localStorage key, so tabs never
// overwrite each other's writes (real Firebase merges per path too).
const PFX = '__fakefb:';
const parts = p => p.split('/').filter(Boolean);
const nodeKey = p => PFX + parts(p).slice(0, 4).join('/');
const readNode = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
function tree() { const t = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(PFX)) continue; const v = readNode(k); if (v == null) continue; const ks = parts(k.slice(PFX.length)); let o = t; for (let j = 0; j < ks.length - 1; j++) o = o[ks[j]] = o[ks[j]] || {}; o[ks[ks.length - 1]] = v; } return t; }
const getAt = (t, p) => parts(p).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), t);
const subs = [];
function fire() { const t = tree(); for (const s of subs) { if (s.path === '.info/connected') continue; const v = getAt(t, s.path); const js = JSON.stringify(v === undefined ? null : v); if (js !== s.last) { s.last = js; const val = JSON.parse(js); try { s.cb({ val: () => val }); } catch (e) { console.error(e); } } } }
function writeNode(path, fn) { const k = nodeKey(path), rest = parts(path).slice(4); let node = readNode(k); node = fn(node, rest); if (node == null || (typeof node === 'object' && !Object.keys(node).length)) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(node)); fire(); }
addEventListener('storage', e => { if (e.key && e.key.startsWith(PFX)) fire(); });
export function getDatabase() { return {}; }
export function ref(db, path) { return { path }; }
export function onValue(r, cb) { const s = { path: r.path, cb, last: undefined }; subs.push(s); setTimeout(() => (r.path === '.info/connected' ? cb({ val: () => true }) : fire()), 0); return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; }
export async function set(r, v) { writeNode(r.path, (n, rest) => { if (!rest.length) return v; n = n || {}; n[rest[0]] = v; return n; }); }
export async function update(r, flat) { writeNode(r.path, n => { n = n || {}; for (const k in flat) { if (flat[k] === null) delete n[k]; else n[k] = flat[k]; } return n; }); }
export async function remove(r) { writeNode(r.path, () => null); }
const disc = new Set();
export function onDisconnect(r) { return { remove: async () => { disc.add(r.path); }, cancel: async () => { disc.delete(r.path); } }; }
addEventListener('pagehide', () => { try { for (const p of disc) localStorage.removeItem(nodeKey(p)); } catch (e) {} });
`;

// Fake claude.ai "room" capability (window.claude.use('room')), injected before the game loads.
export const FAKE_ROOM_INIT = `(() => {
  // one localStorage key per peer, so tabs never overwrite each other's presence
  const PFX = '__fakeroom:', me = 'r' + Math.random().toString(36).slice(2, 10), subs = [];
  let mine = {}, cache = [];
  const list = () => { const out = [{ peer: me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() }];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(PFX) || k === PFX + me) continue; let pr = {}; try { pr = JSON.parse(localStorage.getItem(k)) || {}; } catch (e) {} out.push({ peer: k.slice(PFX.length), by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: pr, updatedAt: Date.now() }); }
    return out; };
  const fire = () => { cache = list(); for (const f of subs) { try { f(cache); } catch (e) { console.error(e); } } };
  addEventListener('storage', e => { if (e.key && e.key.startsWith(PFX)) fire(); });
  addEventListener('pagehide', () => { try { localStorage.removeItem(PFX + me); } catch (e) {} });
  const room = {
    presence: async patch => { mine = Object.assign({}, mine); for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = JSON.parse(JSON.stringify(patch[k])); } localStorage.setItem(PFX + me, JSON.stringify(mine)); fire(); },
    peers: () => (cache.length ? cache : list()),
    onPeers: (f) => { subs.push(f); return () => {}; },
  };
  window.claude = { use: async name => (name === 'room' ? room : null) };
})();`;
