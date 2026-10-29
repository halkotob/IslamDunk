// Islam Dunk ICE worker (v9.10): hands the game short-lived TURN credentials from Cloudflare's TURN service, so
// players the direct link can't reach (carrier and strict NATs) get a relay instead of the slow server path.
//
//   GET /ice  ->  200 { iceServers: [...], ttl }   (CORS: only the origins in ALLOWED_ORIGINS)
//
// Secrets, set with wrangler and never stored in the repo or sent to the client:
//   TURN_KEY_ID          the TURN key id (Cloudflare dashboard > Realtime > TURN Server > Create)
//   TURN_KEY_API_TOKEN   the API token shown once when that key is created
// Vars (wrangler.toml): ALLOWED_ORIGINS (comma separated), TTL (seconds, default 3600).
// Binding (wrangler.toml): ICE_LIMIT, a per-IP rate limit (20 requests a minute). Without it a small in-memory
// limit is used instead (per Worker instance, so looser).
const API = id => `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`;
const mem = new Map();                                     // fallback limiter: ip -> [windowStart, count]

export function allowedOrigin(origin, env) {
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}
function cors(origin) {
  const h = { 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  if (origin) Object.assign(h, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' });
  return h;
}
const json = (status, body, origin) => new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, cors(origin)) });
async function limited(env, ip) {
  if (env.ICE_LIMIT && env.ICE_LIMIT.limit) { const { success } = await env.ICE_LIMIT.limit({ key: ip }); return !success; }
  const now = Date.now(), e = mem.get(ip);
  if (!e || now - e[0] > 60000) { mem.set(ip, [now, 1]); if (mem.size > 5000) mem.clear(); return false; }
  return ++e[1] > 20;
}
// Browsers time out on port 53, and the game doesn't trickle candidates, so those URLs only slow gathering down.
export function cleanServers(list) {
  return [].concat(list || []).map(s => {
    const urls = [].concat(s.urls || []).filter(u => !/:53(\?|$)/.test(u));
    return urls.length ? Object.assign({}, s, { urls }) : null;
  }).filter(Boolean);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = allowedOrigin(request.headers.get('Origin'), env);
    if (url.pathname !== '/ice') return json(404, { error: 'not found' }, origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
    if (request.method !== 'GET') return json(405, { error: 'method' }, origin);
    if (!origin) return json(403, { error: 'origin' }, null);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (await limited(env, ip)) return json(429, { error: 'rate limited' }, origin);
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json(503, { error: 'not configured' }, origin);
    const ttl = Math.max(600, Math.min(86400, +env.TTL || 3600));
    let r;
    try {
      r = await fetch(API(env.TURN_KEY_ID), { method: 'POST', headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl }) });
    } catch (e) { return json(502, { error: 'upstream' }, origin); }
    if (!r.ok) return json(502, { error: 'upstream ' + r.status }, origin);
    const body = await r.json().catch(() => null);
    const iceServers = cleanServers(body && body.iceServers);
    if (!iceServers.length) return json(502, { error: 'empty' }, origin);
    return json(200, { iceServers, ttl }, origin);
  }
};
