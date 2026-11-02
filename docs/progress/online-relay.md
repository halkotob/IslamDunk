# Online: where things stand (pick up here)

Last updated with 9.14.0. Read this first when continuing the online work.

## Done

- **Rollback netcode** (9.14.0, see CHANGELOG): Same team vs CPU, Head to head and 1 on 1 use rollback whenever
  the two players have a direct WebRTC link (peer to peer, or through the TURN relay: both count as "direct").
  Code: `src/online/rollback.js` (the deterministic frame, save/restore, checksums), `rollback-net.js` (inputs,
  prediction, rollback, input delay, time sync, the match flow), `rollback-sync.js` (desync repair, network report
  line). Tests: `tests/rollback.mjs` (`rb-*`).
- **Relay (TURN) support in the game** (9.10.0): when `ONLINE_ICE_URL` is set, hosting or joining a lobby fetches
  1-hour TURN credentials from our Cloudflare Worker and adds them to the WebRTC config. Tested with a fake ICE
  endpoint (`net-ice`). The Worker itself (`worker/ice`) passes its tests (`node --test test/worker.test.mjs`).

## Not done yet: turning the relay on

Without it, pairs that can't connect peer to peer (strict routers, many mobile carriers, school/office networks)
fall back to the old snapshot netcode through Firebase (the laggy path). Needs the owner's Cloudflare account:

1. Cloudflare dashboard → **Realtime → TURN Server → Create**, name `islamdunk`. Copy the **Turn Token ID** and the
   **API Token** (shown once).
2. On your own computer:
   ```sh
   cd worker/ice
   npx wrangler@latest login
   npx wrangler@latest secret put TURN_KEY_ID          # paste the Turn Token ID
   npx wrangler@latest secret put TURN_KEY_API_TOKEN   # paste the API Token
   npx wrangler@latest deploy                          # prints https://islamdunk-ice.<subdomain>.workers.dev
   ```
3. Check: `curl -H 'Origin: https://halkotob.github.io' https://islamdunk-ice.<subdomain>.workers.dev/ice` returns
   `{"iceServers":[...],"ttl":3600}` (403 without the Origin header is correct).
4. **Then (Claude or anyone):** set `ONLINE_ICE_URL` in `src/online/net-diag.js` to that URL + `/ice`, run
   `node tests/run.mjs --only net-ice,rb-online,rb-lag`, bump the version, CHANGELOG, `npm run publish:web`, push.
   Before publishing it can be tried on any build with `?ice=<the URL>` added to the game's address.
5. **Verify for real:** one player on a phone's mobile data (hotspot off), one on home Wi-Fi. In the lobby or pause
   menu, **Network report** should say `Mode: Relay (TURN)` (or Direct) and `Netcode: rollback`. Before the relay it
   would say `Server` and `snapshots (no direct link)`.

Alternative to step 2 (lets Claude deploy): add `CLOUDFLARE_API_TOKEN` (permissions: Workers Scripts Edit, and
Realtime/Calls Edit if Claude should create the TURN key) and `CLOUDFLARE_ACCOUNT_ID` in the cloud environment's
settings, then start a new session (a running session doesn't see new environment values). Never paste tokens
into the chat.

Cost: Cloudflare TURN includes 1,000 GB a month free, then $0.05/GB (billed on what it sends to the players). A
rollback match on the relay is about 7-12 KB/s to each player (rb-lag), so 50-90 MB per match-hour in all: the free
tier covers roughly 11,000+ relayed match-hours a month (only pairs without a peer-to-peer link use the relay).

## Next, after the relay

- **Real-world playtest:** different cities and regions, Wi-Fi and mobile data, iPhone (Safari) and a low-end
  Android. Copy the Network report from each match (it shows delay, corrections a second, waits, desyncs).
- **Show expected quality in the lobby** from the measured ping (e.g. "Great / Good / Far apart: expect a delay").
- **Still on snapshots:** HORSE, Lightning, Barakah Run duos. **Off in rollback matches:** the halftime screen, Noor
  questions, instant replays (each needs to become a synced event).
- If a desync is ever reported (`Desyncs put right` above 0 in the report), reproduce it with two tabs and
  `?rbdebug=2` (per-frame checksums, saved frames and the call stack of every random number; see `confirmHashes`
  and `stepFrame` in `rollback-net.js`).

## Working in a fresh cloud container (notes for Claude)

- `npm ci`, then if Playwright complains about browser versions: replace `node_modules/playwright` and
  `node_modules/playwright-core` with symlinks to the container's global Playwright (`/opt/node22/lib/node_modules`).
- Electron test: `node node_modules/electron/install.js` once, then
  `NODE_PATH=$PWD/node_modules xvfb-run -a npm run test:electron`.
- `rb-determinism` compares against Safari's engine through `bun` when it is installed (it is in these containers).
- Studio tests need `npm run build:review` (`npm test` does it).
