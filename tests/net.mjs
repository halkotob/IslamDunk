// v9.10 online latency tests: TURN credentials (ICE fetch), compact snapshots, mode switching, the network report,
// the version check, the network info overlay, and the lag profiles against the v9.9.1 baseline.
import fs from 'node:fs';
import path from 'node:path';
import { devices } from 'playwright';
import { execFileSync } from 'node:child_process';
import { LAG_PROFILES, lagRun, lagTable } from './lag-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ICE_OK = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
  { urls: ['turn:turn.invalid:3478?transport=udp', 'turn:turn.invalid:53?transport=udp', 'turn:turn.invalid:3478?transport=tcp'], username: 'u1', credential: 'c1' }], ttl: 3600 };

export function netTests({ newContext, open }) {
  const T = {};
  // two tabs in one lobby (the guest has joined); extra: { ice: 'ok' | 'slow' | 'err' | 'abort' }
  async function pair(browser, base, query, opts = {}) {
    const errs = [], ctx = await newContext(browser);
    await ctx.route(/^https:\/\/ice\.test\//, async r => {
      const k = r.request().url().split('/').pop();
      const h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
      if (k === 'ok') return r.fulfill({ status: 200, headers: h, body: JSON.stringify(ICE_OK) });
      if (k === 'err') return r.fulfill({ status: 500, headers: h, body: '{}' });
      if (k === 'abort') return r.abort('failed');
      await sleep(5000); return r.fulfill({ status: 200, headers: h, body: JSON.stringify(ICE_OK) }).catch(() => {});   // slow: after the 2 s timeout
    });
    const H = await open(ctx, base + '/' + query, errs, 'host'), G = await open(ctx, base + '/' + query, errs, 'guest');
    if (opts.noJoin) return { ctx, H, G, errs };
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
    return { ctx, H, G, errs, code };
  }
  async function startVs(H, G) {
    await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Net.mode = 'vs'; Lobby.changed(); });
    await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
    await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => Game.screen === 'netplay' && M.players && M.players.length > 2, null, { timeout: 15000 }).catch(() => {});
  }
  // everyone stands still for a moment, then the guest's floor must match the host's (no desync)
  async function same(H, G) {
    await H.evaluate(() => { M.cmdHook = q => { zeroCmd(q.cmd); return true; }; M.clock = 99; M.shotClock = 14; });
    await sleep(1800);
    const h = await H.evaluate(() => ({ s: [M.teams[0].score, M.teams[1].score], q: M.quarter, p: M.players.map(q => [q.x, q.y, q.z, q.state]), b: [ball.x, ball.z, M.players.indexOf(ball.owner)] }));
    const g = await G.evaluate(() => ({ screen: Game.screen, gap: nowMs() - Net.lastSnapAt, s: [M.teams[0].score, M.teams[1].score], q: M.quarter, p: M.players.map(q => [q.x, q.y, q.z, q.state]), b: [ball.x, ball.z, M.players.indexOf(ball.owner)] }));
    await H.evaluate(() => { M.cmdHook = null; });
    const off = Math.max(...h.p.map((a, i) => Math.hypot(a[0] - g.p[i][0], a[2] - g.p[i][2])));
    const ok = g.screen === 'netplay' && g.gap < 1000 && h.s.join() === g.s.join() && h.q === g.q && off < 3 && h.b[2] === g.b[2];
    return { ok, txt: `guest ${g.screen}, last snapshot ${Math.round(g.gap)} ms ago, score ${g.s.join('-')} (host ${h.s.join('-')}), largest position difference ${off.toFixed(1)} units, ball holder ${g.b[2]} (host ${h.b[2]})` };
  }

  T['net-ice'] = async ({ browser, base }) => {
    const detail = []; let ok = true;
    for (const kind of ['ok', 'slow', 'err', 'abort']) {
      const { ctx, H, G, errs } = await pair(browser, base, `?net=loop&lat=10&room=ice${kind}&ice=https://ice.test/${kind}`);
      const r = await H.evaluate(async () => { await IceFetch.get(); return { state: IceFetch.state, why: IceFetch.why, ms: IceFetch.ms, ice: JSON.stringify(P2P_ICE.iceServers), turn: IceFetch.turn }; });
      await H.waitForFunction(() => P2P.open, null, { timeout: 15000 }).catch(() => {});
      const link = await H.evaluate(() => ({ open: P2P.open, mode: NetDiag.modeNow() }));
      const good = kind === 'ok'
        ? r.state === 'ok' && r.turn === 1 && !r.ice.includes(':53') && r.ice.includes('turns:turn.invalid:443?transport=tcp') && r.ice.includes('"credential":"c1"') && r.ice.includes('stun.l.google.com')
        : r.state === 'fail' && r.ice === JSON.stringify([{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }]) && (kind !== 'slow' || (r.why === 'timeout' && r.ms >= 1900 && r.ms < 2600));
      const fine = good && link.open && !errs.length;
      ok = ok && fine;
      detail.push(`${kind}: ${r.state}${r.why ? ' (' + r.why + ')' : ''} in ${r.ms} ms, TURN entries ${r.turn}, direct link ${link.open ? 'open (' + link.mode + ')' : 'NOT open'}${errs.length ? ', errors: ' + errs.join('; ') : ''}`);
      await ctx.close();
    }
    return { ok, detail };
  };

  // the compact (v 2) snapshots rebuild the full one exactly (to the quantization), with deliveries lost
  T['net-compact'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/?net=loop&room=cz', errs, 'cz');
    const r = await p.evaluate(() => {
      window.requestAnimationFrame = () => 0; SETTINGS.sound = false;
      let fake = 0; performance.now = () => fake;
      Net.role = 'host'; Net.mode = 'vs'; Net.sel = { a: 0, b: 1 }; Net.guestPeer = 'uGuestPeer0123456789abcdef'; Net.mid = 1;
      let kk = null; const pend = []; Lobby.guestPres = () => ({ pv: 2, in: { kk } });
      newMatch(TEAMS[0], TEAMS[1], { humans: [] }); M.online = true; Game.screen = 'play';
      const res = { n: 0, got: 0, bad: [], v1: 0, v2: 0, keys: 0, unresolved: 0 };
      let rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
      const Q = [1, 1, 1, 1, 1, 1, 1, 100, 100, 100, 1, 1, 100, 1, 100, 1, 1, 1, 10, 1], BQ = [1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 10, 10, 10];
      const near = (a, b, q) => Math.abs(a - b) <= 0.5 / q + 1e-9;
      for (let n = 0; n < 60 * 120; n++) {
        updateMatch(STEP); fake += 1000 / 60; if (Game.screen !== 'play') Game.screen = 'play';
        if (n === 60 * 50) { M.teams[0].score += 2; M.phase = 'break'; M.breakText = 'TEST'; }
        if (n === 60 * 52) { M.phase = 'live'; M.breakText = ''; }
        if (n % 15) continue;                                              // ~4 a second reach the wire
        const z = JSON.parse(JSON.stringify(Net.snapshot())), full = JSON.parse(JSON.stringify(SnapZ.lastIn));
        res.n++; res.v1 += JSON.stringify(full).length; res.v2 += JSON.stringify(z).length; if (z.k != null) res.keys++;
        if (rand() < 0.2) continue;                                        // lost or overwritten on the way
        const g = z.v === 2 ? SnapZ.unpack(z) : z;
        if (!g) { res.unresolved++; continue; }
        res.got++;
        pend.push(SnapZ.lastKey); if (pend.length > 2) kk = pend.shift();   // the guest's ack reaches the host two snapshots later
        const keys = new Set([...Object.keys(full), ...Object.keys(g)]); keys.delete('v');
        for (const k of keys) {
          if (k === 'p') { full.p.forEach((a, i) => a.forEach((v, j) => { if (!near(v, g.p[i][j], Q[j])) res.bad.push(`p[${i}][${j}] ${v} vs ${g.p[i][j]}`); })); continue; }
          if (k === 'b' || k === 'b2') { full[k].forEach((v, j) => { if (!near(v, g[k][j], BQ[j])) res.bad.push(`${k}[${j}] ${v} vs ${g[k][j]}`); }); continue; }
          if (k === 'fx' && !full.fx) continue;                            // fx is kept between its sends (the guest keeps it anyway)
          if (JSON.stringify(full[k]) !== JSON.stringify(g[k])) res.bad.push(`${k}: ${JSON.stringify(full[k])} vs ${JSON.stringify(g[k])}`);
        }
      }
      res.v1 = Math.round(res.v1 / res.n); res.v2 = Math.round(res.v2 / res.n); res.bad = res.bad.slice(0, 8);
      return res;
    });
    await ctx.close();
    const ok = !r.bad.length && r.got > 300 && r.v2 < r.v1 * 0.8 && !errs.length;
    return { ok, detail: [`${r.n} snapshots, ${r.got} delivered and rebuilt, ${r.unresolved} waiting on a lost key, ${r.keys} keys; ${r.v1} bytes full -> ${r.v2} bytes compact`, ...r.bad, ...errs] };
  };

  // direct -> server (Firebase path) -> relay -> network change (wifi to cellular) -> direct; the match never stops
  T['net-modes'] = async ({ browser, base }) => {
    const { ctx, H, G, errs } = await pair(browser, base, '?net=loop&lat=25&jit=5&room=modes');
    const detail = []; let ok = true;
    await startVs(H, G);
    await G.waitForFunction(() => P2P.open, null, { timeout: 15000 }).catch(() => {});
    await sleep(2500);
    const step = async (label, want) => {
      const m = await G.evaluate(() => ({ mode: NetDiag.modeNow(), v: Net._rawS && Net._rawS.v, unresolved: NetDiag.unresolved }));
      const s = await same(H, G); const good = s.ok && m.mode === want;
      ok = ok && good; detail.push(`${good ? 'ok  ' : 'BAD '}${label}: mode ${m.mode} (want ${want}), snapshot format v${m.v}; ${s.txt}`);
    };
    await step('direct', 'direct');
    await H.evaluate(() => { P2P.tries = 99; P2P.close('test'); }); await sleep(2500);       // the direct link fails: server path
    await step('server', 'server');
    const v2 = await G.evaluate(() => Net._rawS && Net._rawS.v); ok = ok && v2 === 2;
    // relay: the same data channel as direct, through a TURN server. A test machine has no TURN server, so the
    // candidate pair is reported as relay (what getStats says on a relayed link) and the link itself is local.
    await H.evaluate(() => { P2P.tries = 0; P2P.nextTry = 0; });
    await G.waitForFunction(() => P2P.open, null, { timeout: 15000 }).catch(() => {});
    for (const P of [H, G]) await P.evaluate(() => { NetDiag._ps = NetDiag.pollStats; NetDiag.pollStats = async function () { if (P2P.open) this.pair = { l: 'relay', r: 'srflx', proto: 'udp' }; }; NetDiag.pair = { l: 'relay', r: 'srflx', proto: 'udp' }; });
    await sleep(1500);
    await step('relay', 'relay');
    for (const P of [H, G]) await P.evaluate(() => { NetDiag.pollStats = NetDiag._ps; NetDiag.pair = null; });
    const t0 = Date.now();
    await G.evaluate(() => NetDiag.netChange()); await H.evaluate(() => NetDiag.netChange());   // wifi -> cellular on both ends
    await G.waitForFunction(() => !P2P.open, null, { timeout: 3000 }).catch(() => {});
    await G.waitForFunction(() => P2P.open, null, { timeout: 15000 }).catch(() => {});
    const back = Date.now() - t0;
    await sleep(1500);
    await step(`after a network change (direct again in ${(back / 1000).toFixed(1)} s)`, 'direct');
    const rep = await G.evaluate(() => ({ recov: NetDiag.recov, drops: NetDiag.drops, changes: NetDiag.netChanges, sw: NetDiag.switches.map(s => s.m).join(' > ') }));
    detail.push(`guest: recovery ${rep.recov}, drops ${rep.drops}, network changes ${rep.changes}, modes ${rep.sw}`);
    ok = ok && rep.recov.startsWith('reconnect') && back < 10000 && !errs.length;
    detail.push(...errs);
    await ctx.close();
    return { ok, detail };
  };

  // the copied report: everything asked for, and no names, codes, peer ids or addresses
  T['net-report'] = async ({ browser, base }) => {
    const { ctx, H, G, errs, code } = await pair(browser, base, '?net=loop&lat=30&jit=8&room=rep');
    await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Lobby.changed(); }); await G.evaluate(() => Lobby.setReady(1));
    await G.waitForFunction(() => P2P.open, null, { timeout: 15000 }).catch(() => {});
    await sleep(6500);                                                    // the 5 s probe
    const detail = []; let ok = true;
    const priv = await H.evaluate(() => [Net.code, Net.myPeer(), Net.guestPeer, ...TEAMS.flatMap(t => [t.name, t.short, ...t.players.map(p => p.name)])].filter(Boolean));
    for (const [who, P] of [['host', H], ['guest', G]]) {
      const r = await P.evaluate(() => { NetDiag.copy('lobby'); return { txt: window.__lastNetReport, toast: Lobby.toast && Lobby.toast.m, rating: NetDiag.rating, other: (Net.role === 'host' ? Lobby.guestPres() : Net.hostPeer().presence).nq }; });
      await sleep(300);
      const toast = await P.evaluate(() => Lobby.toast && Lobby.toast.m);
      const need = ['App version: ', 'Mode: ', 'Ping (round trip): ', 'Jitter: ', 'Packet loss: ', 'ICE servers: ', 'ICE candidates offered here: host', 'Selected candidate pair: host -> host', 'Time to connect (lobby to first direct or relay packet): ', 'Direct-link attempts: ', 'Browser: ', 'Platform: ', 'Network type: '];
      const miss = need.filter(s => !r.txt.includes(s));
      const ip4 = r.txt.match(/\b\d{1,3}(\.\d{1,3}){3}\b/), ip6 = r.txt.match(/\b[0-9a-f]{1,4}(:[0-9a-f]{0,4}){3,}\b/i), local = /\.local\b|candidate:|ufrag|fingerprint/i.test(r.txt);
      const names = priv.filter(s => s.length > 2 && r.txt.includes(s));
      const good = !miss.length && !ip4 && !ip6 && !local && !names.length && r.rating && r.other && r.other.r && /copied|Could not/.test(toast || '');
      ok = ok && good;
      detail.push(`${who}: ${good ? 'ok' : 'BAD'}; rating ${r.rating}, other side's ${r.other && r.other.r}; ${toast}${miss.length ? '; missing ' + miss.join(', ') : ''}${ip4 || ip6 ? '; an address: ' + (ip4 || ip6)[0] : ''}${names.length ? '; names: ' + names.join(', ') : ''}`);
      if (who === 'guest') { fs.mkdirSync(path.join(ROOT, 'tests/output'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'tests/output/net-report.txt'), r.txt); }
    }
    ok = ok && !errs.length; detail.push(...errs);
    void code; await ctx.close();
    return { ok, detail };
  };

  // old and new clients: the lobby won't start, a mid-game rejoin isn't handed a player, a newer snapshot isn't read
  T['net-version'] = async ({ browser, base }) => {
    const detail = []; let ok = true;
    const asOld = () => { const R = Net.room, pr = R.presence; R.presence = function (patch) { if (patch && ('pv' in patch || 'v' in patch)) { patch = Object.assign({}, patch); delete patch.pv; if (patch.v) patch.v = '9.9.1'; } return pr.call(this, patch); }; };
    // 1) an old guest in the lobby
    {
      const { ctx, H, G, errs } = await pair(browser, base, '?net=loop&lat=10&room=ver1', { noJoin: true });
      await G.evaluate(asOld);
      const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
      await G.evaluate(c => Lobby.join(c), code);
      await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
      await G.evaluate(() => Lobby.setReady(1)); await sleep(1200);
      const h = await H.evaluate(() => { const r = { ok: Lobby.versionOK(), can: Lobby.canStart(), v: Lobby.guestPres().v, pv: Lobby.guestPres().pv }; Lobby.start(); r.screen = Game.screen; return r; });
      const good = !h.ok && !h.can && h.screen === 'lobby' && h.v === '9.9.1' && h.pv == null && !errs.length;
      ok = ok && good; detail.push(`old guest (9.9.1) in the lobby: host sees v${h.v}, versionOK ${h.ok}, can start ${h.can}, after Start: ${h.screen} ${good ? 'ok' : 'BAD'}`);
      await ctx.close();
    }
    // 2) mid-game: the guest drops, an old client tries the code, then a current one
    {
      const { ctx, H, G, errs } = await pair(browser, base, '?net=loop&lat=10&room=ver2');
      await startVs(H, G);
      await G.close(); await sleep(5500);                                   // the loopback drops a quiet peer after 4 s
      const gone = await H.evaluate(() => Net.guestPeer);
      const code = await H.evaluate(() => Net.code);
      const O = await open(ctx, base + '/?net=loop&lat=10&room=ver2', errs, 'old');
      await O.evaluate(asOld); await O.evaluate(c => Lobby.join(c), code); await sleep(3000);
      const o = await O.evaluate(() => ({ screen: Game.screen, status: Net.status }));
      const h1 = await H.evaluate(() => ({ g: Net.guestPeer, humans: M.players.filter(q => q.human === 1).length }));
      const N = await open(ctx, base + '/?net=loop&lat=10&room=ver2', errs, 'new');
      await N.evaluate(c => Lobby.join(c), code);
      await N.waitForFunction(() => Game.screen === 'netplay', null, { timeout: 15000 }).catch(() => {});
      const h2 = await H.evaluate(() => ({ g: !!Net.guestPeer, humans: M.players.filter(q => q.human === 1).length }));
      const n = await N.evaluate(() => Game.screen);
      const good = gone === null && o.screen !== 'netplay' && h1.g === null && h1.humans === 0 && h2.g && h2.humans === 1 && n === 'netplay';
      ok = ok && good;
      detail.push(`rejoin mid-game: an old client stays out (${o.screen}/${o.status}), host hands it a player: ${h1.humans === 1}; a current client: ${n}, handed back: ${h2.humans === 1} ${good ? 'ok' : 'BAD'}`);
      // 3) a snapshot format newer than this client reads
      await H.evaluate(() => { const f = Net.snapshot; Net.snapshot = function () { const s = f.apply(this, arguments); return s && s.mid != null ? Object.assign({}, s, { v: 3 }) : s; }; });
      await N.waitForFunction(() => Net.status === 'version', null, { timeout: 5000 }).catch(() => {});
      const nv = await N.evaluate(() => ({ screen: Game.screen, status: Net.status }));
      const good3 = nv.screen === 'netwait' && nv.status === 'version';
      ok = ok && good3 && !errs.length;
      detail.push(`a newer snapshot format (v3): guest ${nv.screen}/${nv.status} ${good3 ? 'ok' : 'BAD'}`, ...errs);
      await ctx.close();
    }
    // 4) an old host: the current guest won't play its game (the old host's own lobby check can't stop it)
    {
      const { ctx, H, G, errs } = await pair(browser, base, '?net=loop&lat=10&room=ver4', { noJoin: true });
      await H.evaluate(asOld);
      const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
      await G.evaluate(c => Lobby.join(c), code);
      await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
      const warn = await G.evaluate(() => !Lobby.versionOK());
      await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Lobby.changed(); }); await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
      await H.evaluate(() => Lobby.start()); await sleep(2500);
      const g = await G.evaluate(() => ({ screen: Game.screen, status: Net.status, other: Net.verOther }));
      const good = warn && g.screen === 'netwait' && g.status === 'version' && g.other === '9.9.1' && !errs.length;
      ok = ok && good; detail.push(`old host (9.9.1): guest warned in the lobby ${warn}; when the host starts anyway: ${g.screen}/${g.status} (host on ${g.other}) ${good ? 'ok' : 'BAD'}`, ...errs);
      await ctx.close();
    }
    return { ok, detail };
  };

  // Settings > Show network info: off by default, saved; the box stays clear of the phone HUD
  T['net-overlay'] = async ({ browser, base }) => {
    const detail = []; let ok = true;
    const desk = await newContext(browser), errs = [], p = await open(desk, base + '/', errs, 'desk');
    const s = await p.evaluate(() => { const it = SET_ITEMS.find(x => x.label === 'Show network info'); const r = { off: it.get() }; it.step(1); r.on = it.get(); r.saved = localStorage.getItem('islamdunk.netinfo'); it.step(1); r.after = it.get(); r.group = SET_GROUPS.find(g => g.labels === null).name; return r; });
    const good = s.off === 'Off' && s.on === 'On' && s.saved === '1' && s.after === 'Off';
    ok = ok && good; detail.push(`setting: default ${s.off}, toggled ${s.on} (saved ${s.saved}), back ${s.after}, in ${s.group} ${good ? 'ok' : 'BAD'}`);
    await desk.close();
    for (const [name, dev] of [['iPhone 13 landscape', devices['iPhone 13 landscape']], ['667x300', { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
      const ctx = await newContext(browser, { device: dev }), e2 = [], q = await open(ctx, base + '/?net=loop&room=ov', e2, name);
      const r = await q.evaluate(() => {
        Input.touchMode = true; SETTINGS.netInfo = true; Net.role = 'host'; Net.guestPeer = 'x';
        newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); M.online = true; Game.screen = 'play'; Game.paused = false;
        return new Promise(res => setTimeout(() => {
          const B = NetDiag.box, S = PhoneHUD.board, c = canvas.getBoundingClientRect(), k = c.width / W;
          const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
          const btns = Object.values(TouchUI.btns || {}).map(el => el.getBoundingClientRect()).filter(q => q.width).map(q => ({ x: (q.left - c.left) / k, y: (q.top - c.top) / k, w: q.width / k, h: q.height / k }));
          const others = [['scoreboard', S], ['shot clock', S && { x: S.x + S.w, y: S.y, w: 90, h: S.h }], ['ping bars', { x: W - 102, y: 10, w: 28, h: 28 }], ['pause', { x: W - 54, y: 4, w: 50, h: 42 }], ...btns.map((b, i) => ['touch ' + i, b])];
          res({ box: B && { x: Math.round(B.x), w: Math.round(B.w) }, W: Math.round(W), hits: B ? others.filter(([, o]) => o && hit(B, o)).map(([n]) => n) : ['no box'], css: B ? Math.round(B.px * k * 10) / 10 : 0 });
          Net.role = null; Net.guestPeer = null;
        }, 500));
      });
      if (name === '667x300') await q.screenshot({ path: path.join(ROOT, 'tests/output/net-overlay-667x300.png') }).catch(() => {});
      const good = !r.hits.length && !e2.length && r.css >= 11;
      ok = ok && good; detail.push(`${name}: box x ${r.box && r.box.x}..${r.box && r.box.x + r.box.w} of ${r.W}, text ${r.css} CSS px, overlaps: ${r.hits.join(', ') || 'none'} ${good ? 'ok' : 'BAD'}`, ...e2);
      await ctx.close();
    }
    return { ok, detail };
  };

  // the ICE Worker (worker/ice) with a mocked Cloudflare API: CORS, rate limit, port 53 filtered, no secrets out
  T['ice-worker'] = async () => {
    try { const out = execFileSync(process.execPath, [path.join(ROOT, 'worker/ice/test/worker.test.mjs')], { encoding: 'utf8' }); return { ok: /worker ok/.test(out), detail: [out.trim()] }; }
    catch (e) { return { ok: false, detail: [String(e.stdout || ''), String(e.stderr || e.message)] }; }
  };

  // the four network profiles, against the numbers v9.9.1 measured (tests/fixtures/lag-baseline.json). The server
  // path is noisy (one write in flight, resends), so each median may be up to 25% + 60 ms worse before it counts.
  T['lag-profiles'] = async ({ browser, base }) => {
    const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/lag-baseline.json'), 'utf8')).profiles;
    const rows = [], detail = []; let ok = true;
    for (const [name, prof] of LAG_PROFILES) {
      let r = await lagRun(browser, base, name, prof);
      const worse = x => ['move', 'jump', 'shot', 'pass', 'staleMed'].filter(k => !(x[k] <= B[name][k] * 1.25 + 60));
      if (!r.error && worse(r).length) { detail.push(`${name}: ${worse(r).join(', ')} slower than v9.9.1 on the first run; running again`); const r2 = await lagRun(browser, base, name, prof); for (const k of ['move', 'jump', 'shot', 'pass', 'staleMed']) r[k] = Math.min(r[k], r2[k]); }
      rows.push(r);
      const bad = r.error ? ['error ' + r.error] : worse(r);
      ok = ok && !bad.length && !r.errs.length && (prof.mode !== 'server' || r.snapBytes < B[name].snapBytes);
      detail.push(`${name}: ${bad.length ? 'SLOWER ' + bad.join(', ') : 'no regression'}; ${r.snapBytes} bytes a snapshot (v9.9.1: ${B[name].snapBytes})${r.errs.length ? '; ' + r.errs.join('; ') : ''}`);
    }
    const before = Object.entries(B).map(([name, b]) => Object.assign({ name }, b));
    detail.push('', 'before (v9.9.1):', ...lagTable(before).split('\n'), '', 'after:', ...lagTable(rows).split('\n'));
    fs.mkdirSync(path.join(ROOT, 'tests/output'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'tests/output/lag-after.json'), JSON.stringify(rows, null, 1));
    return { ok, detail };
  };
  return T;
}
