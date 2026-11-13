// v9.20.0 the online lobby (tests/run.mjs registers them):
//   lobby-flow    (full tier) two phones over the loopback, rollback on: join, both in the gym and each sees the other
//                 (the shoot-around's bytes per second, and the ping with it on and off); Ready, Continue: both in team
//                 select; every game type gives each side its own pick count (from the mode), and switching from a
//                 2-pick game to a 1-pick game clears the extra pick on both; Head to head with picks: both phones build
//                 the picked teams in the picked order; the game ends, the guest's Continue takes both to the post-game
//                 menu; Rematch from both: a new match, no desync, the same teams; Back to shoot-around: both in the gym;
//                 Pick new teams: both in team select; Quit to Title: the other phone is told (the host stays, back in
//                 the gym, with a note; the guest leaves). How long a start takes from the host's Start to the guest
//                 playing, from the gym and from the post-game menu
//   lobby-layout  (full tier) team select at 667x300 (touch) and 1280x720 for every game type, with the longest masjid and
//                 player names in the data and every pick made: no text box overlaps a headshot (the pick number and
//                 FRIEND are drawn on the headshot on purpose, and are marked), no two text boxes overlap, nothing off
//                 the canvas, the cards fit their side; the shoot-around HUD and the post-game menu at both sizes too.
//                 Screenshots in tests/output/lobby-*.png. And the headshots: every masjid player and a career player,
//                 drawn once each (the time is reported); a frame makes one, more only while it has spent under 4 ms
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PHONE = { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1280, height: 720 } };
// text boxes and headshot images, as drawn on the game canvas (device px)
const REC_INIT = `(() => {
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, di = P.drawImage, mt = P.measureText;
  window.__lr = { on: false, texts: [], hs: [] };
  const box = (g, x, y, w, h) => { const m = g.getTransform(), a = m.transformPoint(new DOMPoint(x, y)), b = m.transformPoint(new DOMPoint(x + w, y + h)); return { l: Math.min(a.x, b.x), t: Math.min(a.y, b.y), r: Math.max(a.x, b.x), b: Math.max(a.y, b.y) }; };
  P.fillText = function (t, x, y, mw) {
    const R = window.__lr;
    try { if (R.on && this.canvas && this.canvas.id === 'game' && !this.__deco && this.globalAlpha > 0.05 && String(t).trim()) {
      const s = String(t), m = mt.call(this, s), al = this.textAlign, L = al === 'center' ? x - m.width / 2 : (al === 'right' || al === 'end') ? x - m.width : x;
      R.texts.push(Object.assign(box(this, L, y - m.actualBoundingBoxAscent, m.width, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent), { s: s.slice(0, 50), onHs: !!this.__onHs })); } } catch (e) {}
    return mw === undefined ? ft.call(this, t, x, y) : ft.call(this, t, x, y, mw);
  };
  P.drawImage = function (img, ...a) {
    const R = window.__lr;
    try { if (R.on && img && img.__hs && this.canvas && this.canvas.id === 'game' && a.length >= 4) { const [x, y, w, h] = a.length === 4 ? a : a.slice(4); R.hs.push(box(this, x, y, w, h)); } } catch (e) {}
    return di.call(this, img, ...a);
  };
})();`;
export function lobbyTests({ newContext, open }) {
  const T = {};
  // ---------------------------------------------------------------- the layout (one page, both roles drawn from data)
  T['lobby-layout'] = async ({ browser, base }) => {
    const errs = [], problems = [], log = [];
    fs.mkdirSync(path.join(ROOT, 'tests/output'), { recursive: true });
    for (const [dn, dev] of [['667x300', PHONE], ['1280x720', DESK]]) {
      const ctx = await newContext(browser, { device: dev });
      await ctx.addInitScript(REC_INIT);
      await ctx.addInitScript(() => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} });
      const p = await open(ctx, base + '/?nowelcome=1', errs, 'layout ' + dn);
      await p.waitForTimeout(600);
      // a masjid with the longest masjid name and the two longest player names in the data, and the career team's name
      const setup = await p.evaluate(touch => {
        if (touch) Input.touchMode = true;
        const all = TEAMS.flatMap(t => t.players), longP = all.slice().sort((a, b) => b.name.length - a.name.length).slice(0, 2);
        // the longest team name a picker shows is the career team's ('Al-Amanah (your career)'), longer than any masjid's
        const longT = TEAMS.slice().sort((a, b) => b.name.length - a.name.length)[0], name = ['Al-Amanah (your career)', longT.name].sort((a, b) => b.length - a.length)[0];
        const L = Object.assign({}, longT, { name, players: longP.map(d => Object.assign({}, d)) });
        TEAMS.push(L); CS.rev++;
        // a host with a guest: the guest's picks come from its presence (stubbed here)
        Net.update = () => {}; Net.role = 'host'; Net.code = 'ABCD'; Net.guestPeer = 'g'; Net.sel = { a: 0, b: 1 };   // (no network: the roles are drawn from data)
        const o = Lobby.opts(); o.a = TEAMS.length - 1; o.b = 0; Lobby.ph = 'teams'; Game.screen = 'lobby'; Game.idx = 0;
        window.__tp = { m: TEAMS.length - 1, d: JSON.parse(JSON.stringify(L)), p: [] };
        Lobby.guestPres = () => ({ tp: window.__tp, v: VERSION, pv: NET_PROTO, rdy: 1 });
        return { longT: L.name, longP: longP.map(d => d.name) };
      }, dn === '667x300');
      log.push(`${dn}: longest names "${setup.longT}", "${setup.longP.join('", "')}"`);
      const frame = async (tag, shot) => {
        await p.evaluate(() => { headshotFrame(); Headshots.budget = 99; Headshots.until = Infinity; window.__lr.texts = []; window.__lr.hs = []; window.__lr.on = true; Game.rects = []; render(ctx); window.__lr.on = false; });
        const r = await p.evaluate(() => ({ texts: window.__lr.texts, hs: window.__lr.hs, cw: canvas.width, ch: canvas.height, rects: Game.rects.length }));
        const ov = (a, b, k = 0) => a.l < b.r - k && b.l < a.r - k && a.t < b.b - k && b.t < a.b - k;
        for (const t of r.texts) {
          if (t.l < -1 || t.t < -1 || t.r > r.cw + 1 || t.b > r.ch + 1) problems.push(`${dn} ${tag}: "${t.s}" off the canvas`);
          if (!t.onHs) for (const h of r.hs) if (ov(t, h, 1)) problems.push(`${dn} ${tag}: "${t.s}" over a headshot`);
        }
        for (let i = 0; i < r.texts.length; i++) for (let j = i + 1; j < r.texts.length; j++) { const a = r.texts[i], b = r.texts[j]; if (ov(a, b, 2) && !(a.onHs && b.onHs)) problems.push(`${dn} ${tag}: "${a.s}" over "${b.s}"`); }
        if (shot) await p.screenshot({ path: path.join(ROOT, 'tests/output/lobby-' + shot + '-' + dn + '.png') });
        return r;
      };
      for (const g of await p.evaluate(() => LOBBY_GAMES.map(x => x.id))) {
        const info = await p.evaluate(g => {
          const o = Lobby.opts(); o.game = g; Net.mode = g; Lobby.trimPicks(); const G = Lobby.game(), [l, r] = Lobby.sides();
          Lobby.hp = r.t.players.map((d, i) => i).slice(0, G.picks);
          window.__tp.p = G.together ? l.t.players.map((d, i) => i).filter(i => !Lobby.hp.includes(i)).slice(0, G.picks) : l.t.players.map((d, i) => i).slice(0, G.picks);
          Lobby.tsRow = 1; return { picks: G.picks, together: !!G.together, done: Lobby.picksDone() };
        }, g);
        await p.waitForTimeout(80);
        const r = await frame('team select ' + g, 'teams-' + g);
        log.push(`${dn} ${g}: ${info.picks} pick(s) a side${info.together ? ', one masjid' : ''}, all picked ${info.done}; ${r.hs.length} headshots, ${r.texts.length} texts`);
        if (!info.done || r.hs.length < 2) problems.push(`${dn} ${g}: picks done ${info.done}, headshots drawn ${r.hs.length}`);
      }
      // the gym HUD and the post-game menu
      await p.evaluate(() => { Lobby.ph = 'gym'; Lobby.enterGym(); for (let i = 0; i < 30; i++) { snapPrev(); updateMatch(STEP); } });
      await frame('shoot-around', 'gym');
      await p.evaluate(() => { Game.screen = 'lobby'; Lobby.ph = 'post'; Lobby.vote = 'rematch'; });
      await frame('post-game', 'post');
      // the headshots: every player, once each
      if (dn === '1280x720') {
        const hs = await p.evaluate(() => {
          Headshots.cache.clear(); Headshots.made = 0; Headshots.ms = 0; headshotFrame();
          let perFrame = 0; for (const T of TEAMS) for (const d of T.players) if (headshot(d, T, 1)) perFrame++;
          Headshots.budget = 999; Headshots.until = Infinity; const t0 = performance.now(); let n = 0, worst = 0;
          for (const T of TEAMS) for (const d of T.players) { const a = performance.now(); headshot(d, T, 1); worst = Math.max(worst, performance.now() - a); n++; }
          const all = performance.now() - t0, again = performance.now(); for (const T of TEAMS) for (const d of T.players) headshot(d, T, 1); const cached = performance.now() - again;
          C = freshCareer(); C.name = 'Career'; const cd = playerDef(); const ch = headshot(cd, amanahTeam(), -1);
          return { perFrame, n, all: Math.round(all), worst: Math.round(worst * 10) / 10, cached: Math.round(cached * 10) / 10, career: !!ch && ch.width === HS_PX };
        });
        log.push(`headshots: ${hs.n} players drawn in ${hs.all} ms (slowest ${hs.worst} ms), again from the cache ${hs.cached} ms; ${hs.perFrame} made in one frame; a career player: ${hs.career}`);
        if (hs.perFrame > 3 || hs.perFrame < 1 || !hs.career || hs.cached > 5) problems.push('headshots: ' + JSON.stringify(hs));
      }
      await ctx.close();
    }
    return { ok: !problems.length && !errs.length, detail: [...log, ...problems.slice(0, 20), ...errs] };
  };
  // ---------------------------------------------------------------- two phones through it all
  T['lobby-flow'] = async ({ browser, base }) => {
    const errs = [], log = [], bad = [];
    const ctx = await newContext(browser, { rb: true });
    const q = '/?net=loop&lat=20&jit=4&room=lobbyflow&nowelcome=1';
    const H = await open(ctx, base + q, errs, 'host'), G = await open(ctx, base + q, errs, 'guest');
    const both = f => Promise.all([H, G].map(x => x.evaluate(f)));
    const where = () => both(() => (Lobby.isIn() ? Lobby.ph : Game.screen) + (Game.screen === 'gym' ? '/gym' : ''));
    const expect = async (what, want, ms = 8000) => { const t0 = Date.now(); let w; do { w = await where(); if (w.every(x => x.startsWith(want))) return true; await sleep(200); } while (Date.now() - t0 < ms); bad.push(`${what}: ${w.join(' / ')}, wanted ${want}`); return false; };
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await expect('after joining', 'gym');
    // shoot around: each sees the other; bytes and ping with it on, then off
    await sleep(3000);
    const sample = async (secs) => { const pings = [], b0 = await both(() => Lobby.saBytes), t0 = Date.now(); for (let i = 0; i < secs * 4; i++) { pings.push(...await both(() => Lobby.ping)); await sleep(250); } const b1 = await both(() => Lobby.saBytes); const s = (Date.now() - t0) / 1000; pings.sort((a, b) => a - b); return { bps: b1.map((b, i) => Math.round((b - b0[i]) / s)), p95: pings[Math.floor(pings.length * 0.95)] || 0 }; };
    await G.evaluate(() => { const me = M.players[0]; me.x = 760; me.z = 420; });
    // (off first, then on: the first seconds after joining run high while the direct link settles)
    await both(() => { window.__sa = Lobby.saStep; Lobby.saStep = () => {}; });
    const off = await sample(6);
    await both(() => { Lobby.saStep = window.__sa; });
    const on = await sample(6);
    const seen = await both(() => !!Lobby.ghost && Math.round(Lobby.ghost.x));
    log.push(`shoot-around: each sees the other ${JSON.stringify(seen)}; sent ${on.bps.join(' / ')} bytes a second (host / guest, ${await H.evaluate(() => (P2P.open ? 'direct link' : 'server'))}); ping p95 ${on.p95} ms with it, ${off.p95} ms without`);
    if (!seen.every(x => x !== false) || seen[0] === false || on.bps.some(b => b <= 0 || b > 2000) || on.p95 > off.p95 + 40) bad.push('shoot-around ' + JSON.stringify({ seen, on, off }));
    // Ready, Continue
    const cont0 = await H.evaluate(() => Lobby.canContinue());
    await G.evaluate(() => Lobby.setReady(1)); await sleep(800);
    await H.evaluate(() => Lobby.toTeams());
    await expect('after Continue', 'teams');
    if (cont0) bad.push('Continue was allowed before the guest was Ready');
    // every game type: the pick count per side comes from the mode, on both phones
    for (const g of await H.evaluate(() => LOBBY_GAMES.map(x => x.id))) {
      await H.evaluate(g => { const o = Lobby.opts(), i = LOBBY_GAMES.findIndex(x => x.id === g), j = LOBBY_GAMES.findIndex(x => x.id === o.game); if (i !== j) tsStepGame(i - j); }, g);
      await sleep(700);
      const n = await both(() => { const G = Lobby.game(), [l, r] = Lobby.sides(), mine = Net.role === 'host' ? r : l; for (let i = 0; i < mine.t.players.length; i++) if (!mine.p.includes(i)) { const k = mine.p.length; Lobby.togglePick(i); if (mine.p.length === k) break; } return [G.id, G.picks]; });
      await sleep(900);
      const got = await both(() => { const [l, r] = Lobby.sides(); return [l.p.length, r.p.length, Lobby.picksDone()]; });
      log.push(`${g}: picks a side ${n[0][1]} (guest sees ${n[1][1]}); picked left / right on the host ${got[0].slice(0, 2).join(' / ')}, on the guest ${got[1].slice(0, 2).join(' / ')}`);
      if (n[0][0] !== n[1][0] || n[0][1] !== n[1][1] || got.some(x => x[0] !== n[0][1] || x[1] !== n[0][1] || !x[2])) bad.push(g + ' picks ' + JSON.stringify({ n, got }));
    }
    // a 2-pick game, then a 1-pick game: the second pick goes on both
    await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Net.mode = 'vs'; Lobby.trimPicks(); Lobby.changed(); }); await sleep(500);
    await both(() => { const [l, r] = Lobby.sides(), mine = Net.role === 'host' ? r : l; mine.p.length = 0; Lobby.togglePick(1); Lobby.togglePick(0); });
    await sleep(800);
    await H.evaluate(() => tsStepGame(1)); await sleep(900);   // vs -> one
    const trimmed = await both(() => { const [l, r] = Lobby.sides(); return [Lobby.game().id, l.p.length, r.p.length]; });
    log.push(`2 picks, then 1 on 1: ${JSON.stringify(trimmed)}`);
    if (trimmed.some(t => t[0] !== 'one' || t[1] !== 1 || t[2] !== 1)) bad.push('trim ' + JSON.stringify(trimmed));
    // Head to head with picks (the second player first on both sides), short halves
    await H.evaluate(() => { const o = Lobby.opts(); o.game = 'vs'; Net.mode = 'vs'; o.format = 'halves'; o.len = 8; Lobby.changed(); }); await sleep(500);
    await both(() => { const [l, r] = Lobby.sides(), mine = Net.role === 'host' ? r : l; mine.p.length = 0; Lobby.togglePick(1); Lobby.togglePick(0); });
    await sleep(900);
    const want = await H.evaluate(() => { const [l, r] = Lobby.sides(); return [r.t.players[1].name, l.t.players[1].name]; });
    const t0 = Date.now(); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    const startMs = Date.now() - t0;
    const teams = await both(() => M.teamDefs.map(t => t.players.map(p => p.name).join('/')));
    log.push(`started from team select in ${startMs} ms: host ${teams[0].join(' v ')}, guest ${teams[1].join(' v ')}`);
    if (teams[0].join() !== teams[1].join() || !teams[0][0].startsWith(want[0]) || !teams[0][1].startsWith(want[1])) bad.push('teams ' + JSON.stringify({ teams, want }));
    await Promise.all([H, G].map(x => x.waitForFunction(() => Game.screen === 'final', null, { timeout: 240000 }).catch(() => {})));
    await G.evaluate(() => finalContinue());
    await expect('the guest\'s Continue', 'post', 10000);
    // Rematch: needs both; then the same teams, and no desync
    await H.evaluate(() => Lobby.choose('rematch')); await sleep(1500);
    const waiting = await where();
    if (!waiting.every(x => x === 'post')) bad.push('a rematch with one vote started: ' + waiting.join());
    const t1 = Date.now(); await G.evaluate(() => Lobby.choose('rematch'));
    await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    const rematchMs = Date.now() - t1;
    await sleep(6000);
    const rm = await both(() => ({ teams: M.teamDefs.map(t => t.players.map(p => p.name).join('/')).join(' v '), desyncs: RBN.desyncs || 0, desync: RBN.desync || null, hashes: (RBN.report() || {}).hashesChecked || 0 }));
    log.push(`rematch (started ${rematchMs} ms after the second vote): ${JSON.stringify(rm)}`);
    if (rm[0].teams !== teams[0].join(' v ') || rm[1].teams !== rm[0].teams || rm.some(r => r.desyncs || r.desync)) bad.push('rematch ' + JSON.stringify(rm));
    // Back to shoot-around (the guest picks it)
    await H.evaluate(() => Lobby.back()); await expect('the host ends the game', 'post', 10000);
    await G.evaluate(() => Lobby.choose('gym')); await expect('Back to shoot-around', 'gym');
    // Pick new teams (the host picks it, from the post-game menu)
    await G.evaluate(() => Lobby.setReady(1)); await sleep(700); await H.evaluate(() => Lobby.toTeams()); await expect('Continue again', 'teams');
    await both(() => { const [l, r] = Lobby.sides(), mine = Net.role === 'host' ? r : l; mine.p.length = 0; Lobby.togglePick(0); Lobby.togglePick(1); }); await sleep(800);
    await H.evaluate(() => Lobby.start()); await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {}); await sleep(1500);
    await H.evaluate(() => Lobby.back()); await expect('ended again', 'post', 10000);
    await H.evaluate(() => Lobby.choose('teams')); await expect('Pick new teams', 'teams');
    // Quit to Title: the guest leaves; the host is told and waits in the gym
    await G.evaluate(() => Lobby.quit());
    await sleep(2500);
    const after = await both(() => ({ screen: Game.screen, gym: !!M.lobbyGym, toast: Lobby.toast && Lobby.toast.m, role: Net.role }));
    log.push(`the guest quit: host ${after[0].screen}${after[0].gym ? ' (lobby gym)' : ''} "${after[0].toast || ''}", guest ${after[1].screen}`);
    if (!(after[0].screen === 'gym' && after[0].gym && /left/.test(after[0].toast || '') && after[1].screen === 'title' && !after[1].role)) bad.push('quit ' + JSON.stringify(after));
    await ctx.close();
    return { ok: !bad.length && !errs.length, detail: [...log, ...bad, ...errs] };
  };
  return T;
}
