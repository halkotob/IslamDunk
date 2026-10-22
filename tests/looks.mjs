// v9.6 art slice tests (registered into tests/run.mjs):
//   looks-parity   seeded CPU games with the hero drawn every 4th step for 50 s of play in the current look and in looks a, b, c: the
//                  final scores, box scores, positions and the online snapshot are byte-identical; ?look= parsing; the
//                  default is the current look (the hook draws nothing, the Settings entry says Current and saves nothing);
//                  a frame with no look is pixel-identical with the hook removed
//   looks-bounds   every animation, every look, every third frame: the hero's figure stays inside its sprite box (no
//                  clipped limbs) and is one connected shape (no gaps between joints)
//   looks-perf     frame time of a match frame at the phone-audit size (750x342 @3x), current vs a, b, c, timed in
//                  interleaved rounds; each look's median time relative to current must stay within +10%
//   looks-compare  the compare page builds from dist/web and opens with no page errors; every panel draws
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AGENTS = () => fs.readFileSync(path.join(ROOT, 'src/review-studio/agent.game.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src/review-studio/agent2.game.js'), 'utf8');

export function lookTests({ newContext, open, sleep }) {
  const T = {};
  T['looks-parity'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'looks-parity');
    // each look runs in a freshly loaded page (two runs in one page are not reproducible even with no look: some state
    // outlives newMatch), with the same seed and no inputs
    const runLook = async look => { const q = await open(ctx, base + '/', errs, 'looks-parity ' + (look || 'current')); const v = await q.evaluate(look => {
      const c = document.createElement('canvas'); c.width = 960; c.height = 540; const g = c.getContext('2d');
      let hooked = 0; const hook = playerLookHook; playerLookHook = function () { const r = hook.apply(this, arguments); if (r) hooked++; return r; };
      LOOK.cur = look; window.__seed(4242);
      newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 30 } }); M.players[0].lookHero = true;
      let n = 0;
      for (; n < 3000 && M.phase !== 'over'; n++) {          // 50 s of play
        updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title';
        if (n % 4 === 0) { Game.rdt = STEP; drawScene(g, M.time); }
      }
      const snap = typeof Net !== 'undefined' && Net.snapshot ? (() => { try { return JSON.stringify(Net.snapshot()); } catch (e) { return 'n/a'; } })() : 'n/a';
      const state = JSON.stringify({ n, score: M.teams.map(t => t.score), players: M.players.map(q => [q.x, q.y, q.z, q.vx, q.vz, q.state, q.stats]), ball: [ball.x, ball.y, ball.z, ball.state] });
      return { look, hooked, n, state, snap };
    }, look); await q.close(); return v; };
    const res = []; for (const look of ['', 'a', 'b', 'c', '']) res.push(await runLook(look));
    const r = await p.evaluate(res => {
      const c = document.createElement('canvas'); c.width = 960; c.height = 540; const g = c.getContext('2d'); const hook = playerLookHook;
      // ?look= parsing and the default
      const parse = { a: LOOK.parse('?look=a'), B: LOOK.parse('?look=B'), c: LOOK.parse('?x=1&look=c'), bad: LOOK.parse('?look=z'), none: LOOK.parse(''), num: LOOK.parse('?look=1') };
      const item = SET_ITEMS.find(s => s.label === 'Look (preview)'), keys0 = Object.keys(localStorage).sort().join();
      const setting = { first: item && item.get(), afterStep: (item.step(1), item.get()), keysSame: Object.keys(localStorage).sort().join() === keys0 };
      LOOK.cur = '';
      // no look: the frame is pixel-identical with the hook removed entirely
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); for (let i = 0; i < 200; i++) updateMatch(STEP);
      const pn = performance.now.bind(performance), dn = Date.now; performance.now = () => 1000; Date.now = () => 1e12;   // a frozen clock
      const px = () => { window.__seed(7); g.setTransform(1, 0, 0, 1, 0, 0);   // seeded: the sprint streaks use Math.random
        g.clearRect(0, 0, 960, 540); FX.sx = FX.sy = 0; Game.rdt = 0; Object.assign(cam, cam0); drawScene(g, 1); return g.getImageData(0, 0, 960, 540).data; };
      window.requestAnimationFrame = () => 0; const cam0 = { ...cam };   // nothing moves between the draws (no game loop, a fixed camera)
      const a = px(), a2 = px(); playerLookHook = null; const b = px(); playerLookHook = hook; performance.now = pn; Date.now = dn;
      let diff = 0, ctl = 0; for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) diff++; if (a[i] !== a2[i]) ctl++; }
      return { res: res.map(x => ({ look: x.look, hooked: x.hooked, n: x.n, same: x.state === res[0].state && x.snap === res[0].snap })), parse, setting, diff, ctl, defaultCur: LOOK.parse(location.search) };
    }, res);
    // ?look=b in the URL
    const p2 = await open(ctx, base + '/?look=b', errs, 'looks-parity url');
    const urlLook = await p2.evaluate(() => LOOK.cur);
    await ctx.close();
    const ok = r.res.every(x => x.same) && r.res[0].hooked === 0 && r.res[4].hooked === 0 && r.res.slice(1, 4).every(x => x.hooked > 100) && r.parse.a === 'a' && r.parse.B === 'b' && r.parse.c === 'c' && r.parse.bad === '' && r.parse.none === '' && r.parse.num === ''
      && r.setting.first === 'Current' && r.setting.afterStep === 'A: Clean cel' && r.setting.keysSame && r.diff === 0 && r.defaultCur === '' && urlLook === 'b' && !errs.length;
    return { ok, detail: [JSON.stringify(r.res), JSON.stringify({ parse: r.parse, setting: r.setting, noLookPixelDiff: r.diff, sameHookTwice: r.ctl, urlLook }), ...errs] };
  };

  T['looks-bounds'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'looks-bounds');
    await p.evaluate(AGENTS());
    const r = await p.evaluate(() => {
      const RS = window.__RS, out = { frames: 0, bad: [] }, kp = 2;
      const check = (F, tag) => {
        const w = F.width, h = F.height, d = F.getContext('2d').getImageData(0, 0, w, h).data, A = (x, y) => d[(y * w + x) * 4 + 3];
        for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) if (A(x, y) > 8) { out.bad.push(tag + ': touches the top/bottom of its box'); return; }
        for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) if (A(x, y) > 8) { out.bad.push(tag + ': touches the side of its box'); return; }
        // connected components of the opaque figure (4-connected, on a 2x2 grid)
        const gw = Math.ceil(w / 2), gh = Math.ceil(h / 2), m = new Uint8Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) m[y * gw + x] = A(Math.min(w - 1, x * 2), Math.min(h - 1, y * 2)) > 60 || A(Math.min(w - 1, x * 2 + 1), Math.min(h - 1, y * 2 + 1)) > 60 ? 1 : 0;
        const seen = new Uint8Array(gw * gh), sizes = [];
        for (let i = 0; i < m.length; i++) if (m[i] && !seen[i]) { let n = 0; const st = [i]; seen[i] = 1; while (st.length) { const j = st.pop(); n++; const x = j % gw, y = (j / gw) | 0; for (const k of [x > 0 ? j - 1 : -1, x < gw - 1 ? j + 1 : -1, y > 0 ? j - gw : -1, y < gh - 1 ? j + gw : -1]) if (k >= 0 && m[k] && !seen[k]) { seen[k] = 1; st.push(k); } } sizes.push(n); }
        const big = sizes.filter(n => n >= 6);
        if (big.length !== 1) out.bad.push(tag + ': ' + big.length + ' separate pieces (' + sizes.sort((a, b) => b - a).slice(0, 4).join(',') + ')');
      };
      for (const a of RS.anims()) for (const k of ['a', 'b', 'c']) {
        RS.animStart(a.id, { who: 'cast/you' }); const me = RS.animMe(); me.lookHero = true;
        for (let f = 0; f < a.n; f++) { RS.animStep(); if (f % 3) continue; out.frames++; const F = lkFigure(null, me, LOOK_STYLE[k], kp); check(F, a.id + ' ' + k + ' frame ' + f); if (out.bad.length > 40) return out; }
      }
      RS.animStop(); return out;
    });
    await ctx.close();
    return { ok: !r.bad.length && r.frames > 1000 && !errs.length, detail: [`${r.frames} figure frames checked (every animation x looks a, b, c, every third frame)`, ...r.bad.slice(0, 30), ...errs] };
  };

  T['looks-perf'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { device: { viewport: { width: 750, height: 342 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, seed: true }), p = await open(ctx, base + '/', errs, 'looks-perf');
    const r = await p.evaluate(() => {
      Input.touchMode = true; window.__seed(99);
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
      for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
      const holdRaf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;            // the page's own loop stops; we time render() alone
      for (let i = 0; i < 90; i++) updateMatch(STEP);                                                    // mid-play, the hero on the move
      const frame = () => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx); ctx.getImageData(0, 0, 1, 1); };   // the read forces the frame to finish
      const time = (look, n) => { LOOK.cur = look; frame(); const t0 = performance.now(); for (let i = 0; i < n; i++) frame(); return (performance.now() - t0) / n; };
      // interleaved rounds (the machine's load changes over time): each round times current, a, b, c in a rotating order;
      // the result per look is the median over rounds of its time / that round's current time
      const L = ['', 'a', 'b', 'c'], ratios = { a: [], b: [], c: [] }, abs = { current: [], a: [], b: [], c: [] };
      for (let r = 0; r < 40; r++) { const t = {}; for (let j = 0; j < 4; j++) { const k = L[(r + j) % 4]; t[k] = time(k, 10); } for (const k of ['a', 'b', 'c']) ratios[k].push(t[k] / t['']); for (const k of L) abs[k || 'current'].push(t[k]); }
      const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
      const res = Object.fromEntries(Object.entries(abs).map(([k, v]) => [k, med(v)])); const rat = Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, med(v)]));
      LOOK.cur = ''; window.requestAnimationFrame = holdRaf;
      return { ms: Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Math.round(v * 1000) / 1000])), ratio: Object.fromEntries(Object.entries(rat).map(([k, v]) => [k, Math.round(v * 1000) / 1000])), canvas: canvas.width + 'x' + canvas.height };
    });
    await ctx.close();
    const ok = ['a', 'b', 'c'].every(k => r.ratio[k] <= 1.10) && !errs.length;
    return { ok, detail: [`median ms per rendered frame at 750x342 @3x (${r.canvas}): ` + ['current', 'a', 'b', 'c'].map(k => `${k} ${r.ms[k]}`).join(', '), 'median time vs current in the same round: ' + ['a', 'b', 'c'].map(k => `${k} ${((r.ratio[k] - 1) * 100).toFixed(1)}%`).join(', ') + ' (limit +10%)', ...errs] };
  };

  T['looks-compare'] = async ({ browser }) => {
    const out = path.join(ROOT, 'node_modules/.cache/look-compare-test.html');
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/review-looks.mjs'), '--no-shots', '--out', out], { cwd: ROOT, stdio: 'pipe' });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.route(/^https?:/, r => r.abort());
    await p.goto('file://' + out);
    await p.waitForFunction(() => window.__lc && window.__lc.ready, null, { timeout: 30000 }).catch(() => errs.push('the page did not start'));
    await sleep(600);
    const r = await p.evaluate(() => {
      const ink = id => { const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 120) n++; return n; };
      const ids = ['cv-', 'court-', 'match-'].flatMap(k => ['cur', 'a', 'b', 'c'].map(l => k + l));
      return { panels: ids.map(id => [id, ink(id)]), anims: window.__lc.ANIMS.length, title: document.title };
    }).catch(e => ({ err: String(e) }));
    await ctx.close();
    const blank = (r.panels || []).filter(([, n]) => n < 20).map(([id]) => id);
    return { ok: !errs.length && r.panels && !blank.length && r.anims >= 18, detail: [`${(r.panels || []).length} panels drawn, ${r.anims} animations listed${blank.length ? '; blank: ' + blank.join(' ') : ''}`, ...errs] };
  };
  return T;
}
