// node tools/connect-report.mjs [--page dist/web/index.html] [--runs 5] [--lat 60] [--jit 10] [--json out.json]
// v9.11.1: how long the direct link takes to connect, step by step, measured from outside the game (the WebRTC
// calls and the signalling writes are timed by an init script), so any build can be compared. Two tabs, a lobby over
// the loopback transport with Firebase-like delivery for the signalling (mode=server: in order, lat ms one way), real
// WebRTC between the tabs. Times are ms from "lobby ready" (the host sees the guest).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), RUNS = +arg('--runs', 5), LAT = +arg('--lat', 60), JIT = +arg('--jit', 10);
export const CONNECT_INIT = () => {
  const E = window.__cx = { ev: {}, rtc: 0, rtcIn: 0 }, at = k => { if (E.ev[k] == null) E.ev[k] = Date.now(); };
  const P = RTCPeerConnection.prototype;
  const _sl = P.setLocalDescription, _sr = P.setRemoteDescription, _ad = P.addIceCandidate;
  P.setLocalDescription = function (d) { at((d && d.type) === 'answer' || this.remoteDescription ? 'answerMade' : 'offerMade'); return _sl.apply(this, arguments); };
  P.setRemoteDescription = function (d) { at(d && d.type === 'answer' ? 'answerReceived' : 'offerReceived'); return _sr.apply(this, arguments); };
  P.addIceCandidate = function () { E.cands = (E.cands || 0) + 1; return _ad.apply(this, arguments); };
  const _ae = P.addEventListener;
  const hook = pc => {
    if (pc.__cx) return; pc.__cx = 1;
    _ae.call(pc, 'icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') at('gathered'); });
    _ae.call(pc, 'icecandidate', e => { if (e.candidate && / typ srflx/.test(e.candidate.candidate)) at('firstSrflx'); if (e.candidate) at('firstCandidate'); });
    _ae.call(pc, 'iceconnectionstatechange', () => { if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') at('iceConnected'); });
    _ae.call(pc, 'datachannel', e => { _ae.call(e.channel, 'open', () => at('dcOpen')); });
  };
  const _cd = P.createDataChannel; P.createDataChannel = function () { hook(this); const dc = _cd.apply(this, arguments); _ae.call(dc, 'open', () => at('dcOpen')); return dc; };
  const _co = P.createOffer; P.createOffer = function () { hook(this); return _co.apply(this, arguments); };
  const _ca = P.createAnswer; P.createAnswer = function () { hook(this); return _ca.apply(this, arguments); };
  // signalling writes (the presence key rtc) and the first snapshot over the direct link
  const iv = setInterval(() => {
    if (typeof P2P === 'undefined' || !P2P.base || P2P.base.__cx) return;
    const B = P2P.base, _p = B.presence;
    B.presence = function (patch) { if (patch && patch.rtc) { E.rtc++; at(patch.rtc.t === 'o' ? 'offerSent' : 'answerSent'); } return _p.apply(this, arguments); };
    B.__cx = 1;
    const _rv = P2P.recv; P2P.recv = function (data) { try { if (/"s":/.test(data)) at('firstSnapshot'); } catch (e) {} return _rv.apply(this, arguments); };
    clearInterval(iv);
  }, 20);
};

if (process.argv[1] && process.argv[1].endsWith('connect-report.mjs')) {
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
  const browser = await chromium.launch(), out = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
    await ctx.addInitScript(CONNECT_INIT);
    const q = `?net=loop&mode=server&lat=${LAT}&jit=${JIT}&room=cx${i}${Math.random().toString(36).slice(2, 6)}`, base = `http://127.0.0.1:${srv.address().port}/`;
    const H = await ctx.newPage(), G = await ctx.newPage();
    for (const p of [H, G]) { await p.goto(base + q); await p.waitForFunction(() => typeof Net !== 'undefined' && Net.avail === 'yes', null, { timeout: 20000 }); }
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await H.waitForFunction(() => !!Net.guestPeer, null, { timeout: 20000 });
    const t0 = await H.evaluate(() => Date.now());
    await G.waitForFunction(() => window.__cx.ev.firstSnapshot, null, { timeout: 30000 }).catch(() => {});
    const [h, g] = await Promise.all([H, G].map(p => p.evaluate(() => window.__cx)));
    const rel = (o, k) => o.ev[k] != null ? o.ev[k] - t0 : null;
    const r = { offerMade: rel(h, 'offerMade'), hostFirstSrflx: rel(h, 'firstSrflx'), hostGathered: rel(h, 'gathered'), offerSent: rel(h, 'offerSent'), offerReceived: rel(g, 'offerReceived'), guestGathered: rel(g, 'gathered'),
      answerSent: rel(g, 'answerSent'), answerReceived: rel(h, 'answerReceived'), iceConnected: Math.max(rel(h, 'iceConnected') || 0, rel(g, 'iceConnected') || 0) || null, dcOpen: Math.max(rel(h, 'dcOpen') || 0, rel(g, 'dcOpen') || 0) || null,
      firstSnapshot: rel(g, 'firstSnapshot'), signallingWrites: h.rtc + g.rtc };
    out.push(r); console.error(JSON.stringify(r));
    await ctx.close();
  }
  await browser.close(); srv.close();
  const keys = Object.keys(out[0]), med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  console.log(`| Step (ms from lobby ready, median of ${RUNS}) | ms |\n|---|---|`);
  for (const k of keys) console.log(`| ${k} | ${med(out.map(r => r[k]))} |`);
  const J = arg('--json', null); if (J) fs.writeFileSync(J, JSON.stringify(out, null, 1));
}
