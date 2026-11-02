// v9.14 rollback netcode tests (tests/run.mjs registers them):
//   rb-determinism   the same inputs give the same match, frame for frame (the checksum of everything the match owns):
//                    two pages, one of them disturbed (a wider screen, drawn every frame, other settings on this
//                    device, touch mode, keys held, extra random numbers between frames); and Chrome's engine (V8)
//                    against Safari's (JavaScriptCore, through bun, when bun is installed)
//   rb-rollback      going back is exact: every 30 frames, 8 frames played with player 2's input guessed wrong, then
//                    restored and replayed with the right input, give the same checksums as a straight run; and what a
//                    frame costs (a step, a save, a restore, a checksum) on this machine and on a 4x slower CPU
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SESSION = fs.readFileSync(path.join(ROOT, 'tests/rollback-session.js'), 'utf8');
const firstDiff = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return i; return a.length === b.length ? -1 : Math.min(a.length, b.length); };

export function rollbackTests({ newContext, open }) {
  const T = {};
  T['rb-determinism'] = async ({ browser, base }) => {
    const frames = 3600, errs = [];
    const page = async (w, tag) => {
      const ctx = await newContext(browser, { seed: true, device: { viewport: { width: w, height: 720 } } }), p = await open(ctx, base + '/?nowelcome=1', errs, tag);
      await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
      return { ctx, p };
    };
    const run = (p, noisy, dump) => p.evaluate(([S, P]) => { window.__P = P; return (0, eval)(S); }, [SESSION, { frames, noisy, dump }]);
    const A = await page(1280, 'rb-a'), B = await page(1700, 'rb-b');
    const [a, b] = await Promise.all([run(A.p, false), run(B.p, true)]);
    const out = { frames: a.sums.length, score: a.score, pages: firstDiff(a.sums, b.sums) };
    if (out.pages >= 0) {                                                // what differs, for the report
      const [da, db] = await Promise.all([run(A.p, false, out.pages), run(B.p, true, out.pages)]), sb = new Set(db.dump), sa = new Set(da.dump);
      out.onlyA = da.dump.filter(x => !sb.has(x)).slice(0, 8); out.onlyB = db.dump.filter(x => !sa.has(x)).slice(0, 8);
    }
    // Safari's engine
    let bun = null; try { bun = execFileSync('bun', ['--version']).toString().trim(); } catch (e) {}
    if (bun) {
      const j = JSON.parse(execFileSync('bun', [path.join(ROOT, 'tests/rollback-jsc.mjs'), path.join(ROOT, 'dist/web/index.html'), String(frames)], { maxBuffer: 1 << 28 }).toString().trim().split('\n').pop());
      out.jsc = firstDiff(a.sums, j.sums); out.jscScore = j.score;
    } else out.jsc = 'skipped (bun not installed)';
    await A.ctx.close(); await B.ctx.close();
    const ok = out.frames === frames && out.pages === -1 && (out.jsc === -1 || !bun) && a.score[0] + a.score[1] > 0 && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  T['rb-rollback'] = async ({ browser, base }) => {
    const frames = 3600, errs = [];
    const ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'rb-rb');
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
    const run = (P) => p.evaluate(([S, P]) => { window.__P = P; return (0, eval)(S); }, [SESSION, P]);
    const a = await run({ frames }), b = await run({ frames, rollback: true });
    const out = { frames: a.sums.length, score: a.score, first: firstDiff(a.sums, b.sums) };
    if (out.first >= 0) {
      const da = await run({ frames, dump: out.first }), db = await run({ frames, rollback: true, dump: out.first });
      const sa = new Set(da.dump || []), sb = new Set(db.dump || []); out.straight = (da.dump || []).filter(x => !sb.has(x)).slice(0, 10); out.rolled = (db.dump || []).filter(x => !sa.has(x)).slice(0, 10);
    }
    // what a frame costs: a match step, a save, a restore, a checksum (ms, median of a few hundred), here and 4x slower
    const cost = () => p.evaluate(() => {
      const n = 300, r = v => Math.round(v / n * 1000) / 1000, S0 = []; let t0 = performance.now();
      for (let i = 0; i < n; i++) rbStep([RB_IDLE, RB_IDLE]); const step = performance.now() - t0;
      t0 = performance.now(); for (let i = 0; i < n; i++) S0.push(rbSave()); const save = performance.now() - t0;
      t0 = performance.now(); for (let i = n - 1; i >= 0; i--) rbLoad(S0[i]); const load = performance.now() - t0;
      t0 = performance.now(); for (let i = 0; i < 30; i++) rbHash(); const hash = (performance.now() - t0) * 10;
      return { step: r(step), save: r(save), load: r(load), hash: r(hash), objects: S0[0].list.length / 2 };
    });
    await p.evaluate(() => { window.__P = { frames: 60 }; });
    out.cost = await cost();
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    out.cost4x = await cost(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const c = out.cost4x; out.replay8ms4x = Math.round((c.load + 8 * (c.step + c.save)) * 100) / 100;   // a rollback of 8 frames on the slow CPU
    await ctx.close();
    const ok = out.frames === frames && out.first === -1 && !errs.length;
    return { ok, detail: [JSON.stringify(out), ...errs] };
  };
  return T;
}
