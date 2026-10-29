# Islam Dunk ICE worker

A tiny Cloudflare Worker that gives the game short-lived TURN relay credentials (about 1 hour) from Cloudflare's
TURN service. The game asks for them when a player hosts or joins a lobby (`ONLINE_ICE_URL` in
`src/online/net-diag.js`). If the Worker can't be reached in 2 seconds, the game carries on with STUN only, as
before.

The TURN key id and API token live only as Worker secrets. They are never in this repo or sent to players; players
get only the generated, expiring username and credential.

## Deploy (once)

1. Cloudflare dashboard → **Realtime → TURN Server → Create**. Name it `islamdunk`. Copy the **Turn Token ID** and
   the **API Token** (the token is shown once).
2. From this folder:

   ```sh
   cd worker/ice
   npx wrangler@latest login
   npx wrangler@latest secret put TURN_KEY_ID         # paste the Turn Token ID
   npx wrangler@latest secret put TURN_KEY_API_TOKEN  # paste the API Token
   npx wrangler@latest deploy
   ```

   `deploy` prints the Worker URL, e.g. `https://islamdunk-ice.<your-subdomain>.workers.dev`.
3. Put `https://islamdunk-ice.<your-subdomain>.workers.dev/ice` in `ONLINE_ICE_URL` in `src/online/net-diag.js`,
   then build and publish the game (`npm run publish:web`).
4. Check: `curl -H 'Origin: https://halkotob.github.io' https://islamdunk-ice.<your-subdomain>.workers.dev/ice`
   returns `{"iceServers":[...],"ttl":3600}`. Without an allowed Origin it returns 403.

If the game is served from another origin, add it to `ALLOWED_ORIGINS` in `wrangler.toml` and deploy again.

## Limits

* CORS: only the origins in `ALLOWED_ORIGINS`.
* 20 requests a minute per IP (the `ICE_LIMIT` rate-limit binding; needs wrangler 4.36 or later).
* TURN usage is billed by Cloudflare per GB relayed (the first 1,000 GB a month are free at the time of writing).
  A 2v2 match on the relay is roughly 15–30 KB/s each way.
