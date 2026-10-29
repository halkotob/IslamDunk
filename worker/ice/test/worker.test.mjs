// node worker/ice/test/worker.test.mjs: the Worker with a mocked Cloudflare API (no network, no secrets)
import assert from 'node:assert/strict';
import W, { cleanServers, allowedOrigin } from '../src/index.js';
const env = { ALLOWED_ORIGINS: 'https://halkotob.github.io', TURN_KEY_ID: 'kid', TURN_KEY_API_TOKEN: 'tok', TTL: '3600' };
const req = (o, m = 'GET', p = '/ice') => new Request('https://w.example' + p, { method: m, headers: Object.assign({ 'CF-Connecting-IP': '203.0.113.' + (Math.random() * 200 | 0) }, o ? { Origin: o } : {}) });
let seen = null;
globalThis.fetch = async (u, init) => { seen = { u, init }; return new Response(JSON.stringify({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turn:turn.cloudflare.com:3478?transport=tcp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' }] }), { status: 201 }); };
let r = await W.fetch(req('https://halkotob.github.io'), env); assert.equal(r.status, 200);
const b = await r.json();
assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://halkotob.github.io');
assert.ok(seen.u.includes('/turn/keys/kid/credentials/generate-ice-servers') && seen.init.headers.Authorization === 'Bearer tok' && JSON.parse(seen.init.body).ttl === 3600);
assert.ok(!JSON.stringify(b).includes(':53'), 'port 53 filtered');
assert.ok(JSON.stringify(b).includes('turns:turn.cloudflare.com:443'), 'TLS 443 kept');
assert.ok(!JSON.stringify(b).includes('tok') && !JSON.stringify(b).includes('kid'), 'no secrets in the response');
assert.equal((await W.fetch(req('https://evil.example'), env)).status, 403);
assert.equal((await W.fetch(req(null), env)).status, 403);
assert.equal((await W.fetch(req('https://halkotob.github.io', 'OPTIONS'), env)).status, 204);
assert.equal((await W.fetch(req('https://halkotob.github.io', 'POST'), env)).status, 405);
assert.equal((await W.fetch(req('https://halkotob.github.io'), { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status, 503);
// rate limit: the binding when present, else in-memory 20/min per IP
const fixed = () => new Request('https://w.example/ice', { headers: { Origin: 'https://halkotob.github.io', 'CF-Connecting-IP': '198.51.100.7' } });
let codes = []; for (let i = 0; i < 22; i++) codes.push((await W.fetch(fixed(), env)).status);
assert.equal(codes.filter(c => c === 429).length, 2);
assert.equal((await W.fetch(fixed(), Object.assign({ ICE_LIMIT: { limit: async () => ({ success: false }) } }, env))).status, 429);
globalThis.fetch = async () => new Response('no', { status: 401 });
assert.equal((await W.fetch(req('https://halkotob.github.io'), env)).status, 502);
assert.deepEqual(cleanServers([{ urls: 'turn:x:53' }]), []);
assert.equal(allowedOrigin('https://halkotob.github.io', env), 'https://halkotob.github.io');
console.log('worker ok');
