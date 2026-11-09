// v9.17.7 phone menus (tests/run.mjs registers them):
//   tap-targets       X1 (fast tier): on a 667x300 phone a tap just outside a small control acts on it, a tap between
//                     two menu rows goes to the nearer one, How to play's "Play the Tutorial" can be tapped (a
//                     tap-anywhere area was drawn over it), a mouse click is unchanged, and the title, settings,
//                     join code and pause screens have no control under 44 CSS px that isn't held in by its neighbours
//   text-size         X2 (fast tier): Settings → Text size has Normal, Large and Larger on a phone; the setting is
//                     saved in islamdunk.access as before (old values load, the new one comes back after a reload);
//                     Larger on a phone leaves the court and the match HUD exactly as at Normal; title and settings
//                     fit at Large and Larger
//   phone-text-size   X2 (full tier): the phone audit's 103 screens at Large and Larger on both phone sizes: nothing
//                     past the edge, out of its box or into another line further than at Normal, no page errors
// The tap-target check over every audited screen runs in 'mobile' (full tier), with the phone text audit.
import { PHONES, TARGETS_JS, MIN_TAP, tapReport, auditPhone, SCREENS } from './phone-audit.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PHONE = PHONES.find(p => p[0].startsWith('667'))[1];
export function phoneTapTextTests({ newContext, open }) {
  const T = {};
  const setup = name => SCREENS.find(s => s[0] === name)[1];
  T['tap-targets'] = async ({ browser, base }) => {
    const errs = [], detail = [], ctx = await newContext(browser, { device: PHONE }), p = await open(ctx, base + '/?nowelcome=1', errs, 'tap');
    await p.evaluate(() => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} });
    // a real touch at a point in game coordinates
    const tapAt = async (x, y) => { const c = await p.evaluate(([x, y]) => { const r = canvas.getBoundingClientRect(); return [r.left + x * r.width / W, r.top + y * r.height / H]; }, [x, y]); await p.touchscreen.tap(c[0], c[1]); await sleep(250); };
    const go = async name => { await p.evaluate(js => { Input.touchMode = true; Input.lastDev = 'touch'; (0, eval)(js); }, setup(name)); await sleep(500); };
    const out = {};
    // 1. the title: just below the last row's drawn edge, and between Quick Play and Online (nearer Online)
    await go('title');
    const rows = await p.evaluate(() => Game.rects.filter(r => r.w > 200 && r.h < 60).map(r => [r.x, r.y, r.w, r.h]));
    const [qp, on] = [rows[1], rows[2]], gapY = (qp[1] + qp[3] + on[1]) / 2;
    out.titleRows = rows.length;
    out.betweenGoesTo = await p.evaluate(([x, y, oy]) => tapWho(x, y) === Game.rects.find(r => r.y === oy) ? 'Online' : 'other', [on[0] + on[2] / 2, gapY + 3, on[1]]);
    // 2. in Settings the Back button's tap area is grown: 5 game px below its drawn edge goes back
    await go('settings');
    const back = await p.evaluate(() => { const r = Game.rects.find(q => q.x <= 8 && q.y <= 8 && q.w < 200); return r && [r.x, r.y, r.w, r.h]; });
    const scr0 = await p.evaluate(() => Game.screen + ':' + Game.setGroup);
    await tapAt(back[0] + back[2] / 2, back[1] + back[3] + 5);
    out.backGrown = await p.evaluate(() => Game.screen) !== 'settings' || (await p.evaluate(() => Game.screen + ':' + Game.setGroup)) !== scr0;
    // 3. the join code: a tap in the gap under "A" types A
    await go('joincode');
    const A = await p.evaluate(() => { const r = Game.rects.filter(q => q.w < 80 && q.h < 80 && q.y > 150)[0]; return [r.x, r.y, r.w, r.h]; });
    await p.evaluate(() => { Net.typed = ''; });
    await tapAt(A[0] + A[2] / 2, A[1] + A[3] + 4);
    out.keyGap = await p.evaluate(() => Net.typed);
    // 4. How to play: "Play the Tutorial" starts the tutorial (it went back to the title before)
    await go('howto');
    const tut = await p.evaluate(() => { const r = Game.rects.find(q => q.w === 320 && q.h === 40); return r && [r.x, r.y, r.w, r.h]; });
    await tapAt(tut[0] + tut[2] / 2, tut[1] + tut[3] / 2); await sleep(400);
    out.tutorial = await p.evaluate(() => Game.screen);
    // 5. a mouse click just outside a control does nothing, as before
    await go('settings');
    const b2 = await p.evaluate(() => { const r = Game.rects.find(q => q.x <= 8 && q.y <= 8 && q.w < 200); return [r.x, r.y, r.w, r.h]; });
    const c = await p.evaluate(([x, y]) => { const r = canvas.getBoundingClientRect(); return [r.left + x * r.width / W, r.top + y * r.height / H]; }, [b2[0] + b2[2] / 2, b2[1] + b2[3] + 5]);
    await p.mouse.click(c[0], c[1]); await sleep(250);
    out.mouseUnchanged = await p.evaluate(() => Game.screen) === 'settings';
    // 6. the four screens' tap targets
    const sc = [];
    for (const name of ['title', 'settings', 'joincode', 'match: pause']) {
      await go(name); await p.evaluate(() => { window.__audit = window.__audit || { texts: [] }; });
      sc.push({ name, tg: await p.evaluate(TARGETS_JS) });
    }
    const rep = tapReport(sc), min = Math.min(...sc.flatMap(s => s.tg.targets.filter(t => !rep.exceptions.spacing.includes(t)).map(t => t.short)));
    await ctx.close();
    out.problems = rep.problems.map(t => `${t.screen}: ${t.label} ${t.short}px`);
    const ok = out.titleRows === 5 && out.betweenGoesTo === 'Online' && out.backGrown && out.keyGap === 'A' && out.tutorial !== 'howto' && out.tutorial !== 'title' && out.mouseUnchanged && !rep.problems.length && !errs.length;
    detail.push(JSON.stringify(out), `${sc.reduce((n, s) => n + s.tg.targets.length, 0)} controls on 4 screens: ${rep.exceptions.spacing.length} held under ${MIN_TAP} px by row or key spacing, the rest ${MIN_TAP} px or more`, ...errs);
    return { ok, detail };
  };
  T['text-size'] = async ({ browser, base }) => {
    const errs = [], detail = [], out = {};
    // saves: an old value (9.5: no change on phones), one with no text size, one out of range
    const ctx = await newContext(browser, { device: PHONE });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('islamdunk.portraitOK', '1'); localStorage.setItem('islamdunk.access', '{"cb":1,"ts":0,"as":1}'); } } catch (e) {} });
    let p = await open(ctx, base + '/?nowelcome=1', errs, 'text');
    out.oldLoads = await p.evaluate(() => [SETTINGS.cbSafe, SETTINGS.textSize, SETTINGS.autoShot].join());
    // the row on a phone: the three sizes, and it steps
    out.row = await p.evaluate(() => { Input.touchMode = true; const it = SET_ITEMS.find(s => s.label === 'Text size'), seen = []; for (let i = 0; i < 3; i++) { seen.push(it.get()); it.step(1); } seen.push(it.get()); it.step(1); return seen.join(','); });
    out.saved = await p.evaluate(() => localStorage.getItem('islamdunk.access'));
    await p.reload(); await p.waitForFunction(() => typeof SETTINGS !== 'undefined', null, { timeout: 15000 });
    out.afterReload = await p.evaluate(() => [SETTINGS.cbSafe, SETTINGS.textSize, SETTINGS.autoShot].join());
    const odd = [];
    for (const v of ['{"cb":0}', '{"ts":7}', '{"ts":-2}', 'junk']) {
      await p.evaluate(v => localStorage.setItem('islamdunk.access', v), v); await p.reload(); await p.waitForFunction(() => typeof SETTINGS !== 'undefined', null, { timeout: 15000 });
      odd.push(await p.evaluate(() => SETTINGS.textSize));
    }
    out.oddValues = odd.join();
    out.local = await p.evaluate(() => RB_LOCAL.has('textSize'));
    // the court and the HUD: at Larger every word in a match is drawn at the same size as at Normal
    out.hudSame = await p.evaluate(() => {
      Input.touchMode = true; Input.lastDev = 'touch'; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
      for (let i = 0; i < 300 && M.phase !== 'live'; i++) updateMatch(STEP);
      const P = CanvasRenderingContext2D.prototype, f = P.fillText, words = lv => {
        const L = []; SETTINGS.textSize = lv; P.fillText = function (t) { if (this === ctx) L.push(String(t) + ' @ ' + this.font); return f.apply(this, arguments); };
        try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx); } finally { P.fillText = f; }
        return L.sort().join('\n');
      };
      const a = words(0), b = words(2); SETTINGS.textSize = 0;
      return a === b && a.length > 0 ? true : [a.split('\n').length, b.split('\n').length, b.split('\n').filter(x => !a.includes(x)).slice(0, 4)];
    });
    // title and settings at Large and Larger: nothing past the edge, out of its box or into another line
    out.fit = {};
    for (const lv of [1, 2]) for (const name of ['title', 'settings', 'settings: accessibility']) {
      await p.evaluate(([lv, js]) => { SETTINGS.textSize = lv; Input.touchMode = true; (0, eval)(js); }, [lv, setup(name)]); await sleep(500);
      out.fit[`${name} ${lv}`] = await p.evaluate(() => {
        const R = PhoneFit.last, s = canvas.width / W, gap = 4 * s; let bad = 0, big = 0;
        const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) + gap - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        const off = (a, r) => Math.max(0, r[0] - a[0]) + Math.max(0, a[2] - r[2]) + Math.max(0, r[1] - a[1]) + Math.max(0, a[3] - r[3]);
        const mid = (a, r) => { const x = (a[0] + a[2]) / 2, y = (a[1] + a[3]) / 2; return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; };
        const boxes = (Game.rects || []).filter(r => r.w * r.h < W * H * 0.9).map(r => [r.x * s, r.y * s, (r.x + r.w) * s, (r.y + r.h) * s]).concat(PhoneFit.panels);
        for (const r of R) { if (r.L) big++; if (r.b[0] < -2 || r.b[2] > canvas.width + 2) bad++; if (r.L > 0 && boxes.some(q => mid(r.b0, q) && off(r.b, q) > off(r.b0, q) + 2)) bad++; }
        for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (R[i].key !== R[j].key && (R[i].L || R[j].L) && ov(R[i].b, R[j].b) > ov(R[i].b0, R[j].b0) + 4) bad++;
        return { lines: R.length, bigger: big, bad };
      });
    }
    await p.evaluate(() => { SETTINGS.textSize = 0; });
    await ctx.close();
    const fits = Object.values(out.fit).every(f => f.bad === 0 && f.bigger > 0);
    const ok = out.oldLoads === 'true,0,true' && out.row === 'Normal,Large,Larger,Normal' && JSON.parse(out.saved).ts === 1 && JSON.parse(out.saved).cb === 1 && JSON.parse(out.saved).as === 1
      && out.afterReload === 'true,1,true' && out.oddValues === '0,2,0,0' && out.local && out.hudSame === true && fits && !errs.length;
    detail.push(JSON.stringify(out), ...errs);
    return { ok, detail };
  };
  T['phone-text-size'] = async ({ browser, base }) => {
    const detail = []; let ok = true;
    for (const lv of [1, 2]) for (const [dn, dev] of PHONES) {
      const { out, errs } = await auditPhone(browser, base, dev, { textSize: lv });
      const bad = out.flatMap(s => s.found);
      ok = ok && !bad.length && !errs.length;
      detail.push(`${['Normal', 'Large', 'Larger'][lv]}, ${dn}: ${out.length} screens, ${bad.length} problems, ${errs.length} page errors`);
      for (const f of bad.slice(0, 30)) detail.push(`   ${f.screen}: ${f.kind === 'small' ? `text ${f.css}px "${f.text}"` : `[${f.left}, ${f.right}] of ${f.width}: "${f.text}"`}`);
      for (const e of errs) detail.push('   pageerror ' + e);
    }
    return { ok, detail };
  };
  return T;
}
