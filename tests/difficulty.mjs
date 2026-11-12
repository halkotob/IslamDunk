// v9.19.2 career difficulty (tests/run.mjs registers them):
//   build-stats   (fast) every height x build x play style starts with the same total (36: nine stats of 4, the build's
//                 modifiers sum to zero); the starting levels are 4 and a respec refunds only what was bought above them
//                 (a sharpshooter's shooting starts at 6 from the build and refunds nothing until it's bought past 4);
//                 an old save with no style and no new fields loads and keeps its levels; the creator's summary gives
//                 the numbers
//   first-three   (full tier) the first three games of a new career, the mixed-play bot (tools/diff-bot.mjs) in your slot,
//                 each play style, at Easy, Medium and Hard: win rates inside wide bands (Easy 60-100%, Medium 50-95%,
//                 Hard 25-75%, over all styles; every style at Medium 30% or more), so it isn't flaky
//   ladder        (full tier) the bot at equal ratings on each difficulty's State and World (at Local, rated 2.6, the
//                 ratings decide more than the dials): each difficulty's average margin no better than the one below it
//                 (2.5 points of slack), Very easy at least 2 points better than Hard, Very easy State won 60% or more,
//                 Hard World between 10% and 75%
import { DIFF_JS } from '../tools/diff-bot.mjs';
export function difficultyTests({ newContext, open }) {
  const T = {};
  T['build-stats'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'build-stats');
    const r = await p.evaluate(() => {
      const o = { totals: new Set(), n: 0 }, K = ['sht', 'spd', 'dnk', 'def', 'stl', 'sta', 'pas', 'hus', 'clu'];
      for (let st = 0; st < PLAY_STYLES.length; st++) for (let h = 0; h < 3; h++) for (let b = 0; b < 3; b++) {
        C = freshCareer(); C.name = 'T'; Object.assign(C.look, { style: st, height: h, build: b });
        const d = playerDef(); o.totals.add(K.reduce((a, k) => a + d.stats[k], 0)); o.n++;
      }
      o.totals = [...o.totals];
      // a sharpshooter: shooting 6 from the build, levels 4: a respec refunds nothing; buy shooting to 6: refunds 4->5 and 5->6 only
      C = freshCareer(); C.name = 'T'; Object.assign(C.look, { style: 1, height: 1, build: 1 });
      o.shtStart = playerDef().stats.sht; o.refund0 = respecRefund();
      C.lv.sht = 6; o.refund2 = respecRefund(); o.want2 = statCost(4) + statCost(5); o.shtNow = playerDef().stats.sht;
      // an old save: no style, no new fields; levels kept
      localStorage.setItem(SAVE_AUTO, JSON.stringify({ v: 1, name: 'Old', look: { skin: 1, height: 2, build: 0 }, lv: { sht: 7, spd: 5, dnk: 6, def: 4, sta: 4, pas: 5 }, stage: 1, bp: 12 }));
      C = null; o.oldLoads = loadCareer(SAVE_AUTO); o.oldLv = C && [C.lv.sht, C.lv.spd, C.lv.dnk, C.lv.hus || 4].join(); o.oldDef = C && !!playerDef().stats;
      o.summary = buildSummary(bodyMods(1, 1, 'sharpshooter'));
      return o;
    });
    await ctx.close();
    const ok = r.n === 54 && r.totals.length === 1 && r.totals[0] === 36 && r.shtStart === 6 && r.refund0 === 0 && r.refund2 === r.want2 && r.shtNow === 8
      && r.oldLoads && r.oldLv === '7,5,6,4' && r.oldDef && /shooting \+2/.test(r.summary) && /dunking −2/.test(r.summary) && !errs.length;
    return { ok, detail: [`${r.n} builds, starting totals ${r.totals.join(',')}; a sharpshooter starts at shooting ${r.shtStart}: a respec refunds ${r.refund0}; bought to 6 (shooting ${r.shtNow}) it refunds ${r.refund2} (4->5 and 5->6: ${r.want2})`,
      `old save loads ${!!r.oldLoads}, levels ${r.oldLv}; creator: "${r.summary}"`, ...errs] };
  };
  // the bot in a plain page (no runner hooks), N careers or games, two pages at a time
  const bot = async (browser, base, jobs) => {
    const pages = [];
    for (let i = 0; i < 2; i++) {
      const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
      await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {} })();`);
      const p = await ctx.newPage(); p.__e = []; p.on('pageerror', e => p.__e.push(e.message));
      await p.goto(base + '/?nowelcome=1'); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 });
      await p.evaluate(() => { window.requestAnimationFrame = () => 0; }); await p.evaluate(DIFF_JS); pages.push(p);
    }
    const out = new Array(jobs.length); let next = 0;
    await Promise.all(pages.map(async p => { while (next < jobs.length) { const i = next++; out[i] = await p.evaluate(jobs[i]); } }));
    const errs = [...new Set(pages.flatMap(p => p.__e))]; for (const p of pages) await p.context().close();
    return { out, errs };
  };
  const STYLES = [[1, 'sharpshooter'], [2, 'playmaker'], [3, 'rimrunner'], [4, 'lockdown'], [5, 'glue']];
  T['first-three'] = async ({ browser, base }) => {
    const jobs = [], tag = [];
    for (const d of ['easy', 'medium', 'hard']) for (const [si, sn] of STYLES) for (let r = 0; r < 4; r++) { jobs.push(`window.__dr.first3(${JSON.stringify(d)}, ${si}, ${r})`); tag.push([d, sn]); }
    const { out, errs } = await bot(browser, base, jobs);
    const W = {}, add = (k, rs) => { W[k] = W[k] || [0, 0]; for (const x of rs) { W[k][0] += x.won ? 1 : 0; W[k][1]++; } };
    out.forEach((rs, i) => { add(tag[i][0], rs); add(tag[i].join(' '), rs); });
    const w = k => W[k][0] / W[k][1], band = { easy: [0.6, 1], medium: [0.5, 0.95], hard: [0.25, 0.75] };
    const ok = Object.entries(band).every(([d, [a, b]]) => w(d) >= a && w(d) <= b) && STYLES.every(([, sn]) => w('medium ' + sn) >= 0.3) && !errs.length;
    return { ok, detail: [Object.keys(band).map(d => `${d} ${Math.round(100 * w(d))}%`).join(', ') + ' (20 careers x 3 games each)', 'Medium by style: ' + STYLES.map(([, sn]) => `${sn} ${Math.round(100 * w('medium ' + sn))}%`).join(', '), ...errs] };
  };
  T['ladder'] = async ({ browser, base }) => {
    const D4 = ['veryeasy', 'easy', 'medium', 'hard'], jobs = [], tag = [];
    for (const d of D4) for (const s of [1, 3]) for (let g = 0; g < 16; g++) { jobs.push(`window.__dr.ladder(${JSON.stringify(d)}, ${s}, ${g})`); tag.push(d + ' ' + s); }
    const { out, errs } = await bot(browser, base, jobs);
    const W = {}; out.forEach((x, i) => { const o = W[tag[i]] = W[tag[i]] || { w: 0, n: 0, m: 0 }; o.w += x.won ? 1 : 0; o.n++; o.m += x.us - x.them; });
    const w = k => W[k].w / W[k].n, mg = d => (W[d + ' 1'].m / W[d + ' 1'].n + W[d + ' 3'].m / W[d + ' 3'].n) / 2, M4 = D4.map(mg);
    // the average margin over State and World falls with each difficulty (16 games a rung, so 2.5 points of slack), Very
    // easy clearly above Hard, Very easy State mostly won, Hard World neither hopeless nor easy
    const ok = M4.every((m, i) => i === 0 || m <= M4[i - 1] + 2.5) && M4[0] >= M4[3] + 2 && w('veryeasy 1') >= 0.6 && w('hard 3') >= 0.1 && w('hard 3') <= 0.75 && !errs.length;
    return { ok, detail: [`average margin over State and World: ${D4.map((d, i) => d + ' ' + (M4[i] >= 0 ? '+' : '') + M4[i].toFixed(1)).join(', ')}`,
      `wins State / World: ${D4.map(d => d + ' ' + Math.round(100 * w(d + ' 1')) + '% / ' + Math.round(100 * w(d + ' 3')) + '%').join(', ')} (16 games each)`, ...errs] };
  };
  return T;
}
