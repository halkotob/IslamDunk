# Online: where things stand (pick up here)

Last updated with 9.14.1. Read this first when continuing the online work.

## Done

- **Rollback netcode** (9.14.0, see CHANGELOG): Same team vs CPU, Head to head and 1 on 1 use rollback whenever
  the two players have a direct WebRTC link (peer to peer, or through the TURN relay: both count as "direct").
  Code: `src/online/rollback.js` (the deterministic frame, save/restore, checksums), `rollback-net.js` (inputs,
  prediction, rollback, input delay, time sync, the match flow), `rollback-sync.js` (desync repair, network report
  line). Tests: `tests/rollback.mjs` (`rb-*`).
- **Relay (TURN) support in the game** (9.10.0): when `ONLINE_ICE_URL` is set, hosting or joining a lobby fetches
  1-hour TURN credentials from our Cloudflare Worker and adds them to the WebRTC config. Tested with a fake ICE
  endpoint (`net-ice`). The Worker itself (`worker/ice`) passes its tests (`node --test test/worker.test.mjs`).

## Relay (TURN): deployed (9.14.1)

- Worker `islamdunk-ice` is live at `https://islamdunk-ice.islamdunk.workers.dev/ice` (workers.dev subdomain
  `islamdunk` on the owner's account). Secrets `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` are set on the Worker (TURN app
  `islamdunk`). `ONLINE_ICE_URL` in `src/online/net-diag.js` points at it.
- Redeploying from a cloud session: the environment has the env variables `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `TURN_KEY_ID` and `TURN_KEY_API_TOKEN`, so `cd worker/ice && npx wrangler@latest deploy`
  works directly. Secrets persist across deploys; to replace one:
  `printf '%s' "$TURN_KEY_ID" | npx wrangler@latest secret put TURN_KEY_ID`.
- The cloud network policy blocks `*.workers.dev` and `rtc.live.cloudflare.com`, so the Worker can't be called from
  the container. Check it from a normal computer:
  `curl -H 'Origin: https://halkotob.github.io' https://islamdunk-ice.islamdunk.workers.dev/ice` should return
  `{"iceServers":[...],"ttl":3600}` (403 without the Origin header is correct).
- **Still to verify for real:** one player on a phone's mobile data (hotspot off), one on home Wi-Fi. In the lobby or
  pause menu, **Network report** should say `Mode: Relay (TURN)` (or Direct) and `Netcode: rollback`. If ICE shows a
  failure, check the Worker logs: `npx wrangler@latest tail` in `worker/ice`.

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

- `npm ci`, then if Playwright complains about browser versions: install the version of the container's global
  Playwright without saving it, e.g. `npm i --no-save playwright@1.63.0 playwright-core@1.63.0` (check
  `/opt/node22/lib/node_modules/playwright/package.json`; symlinking fails when the global playwright-core is missing).
- Electron test: `node node_modules/electron/install.js` once, then
  `NODE_PATH=$PWD/node_modules xvfb-run -a npm run test:electron`.
- `rb-determinism` compares against Safari's engine through `bun` when it is installed (it is in these containers).
- Studio tests need `npm run build:review` (`npm test` does it).
