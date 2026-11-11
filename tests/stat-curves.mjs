// v9.19.0 stats scale properly, and the Hikmah challenge (tests/run.mjs registers them; fast tier):
//   stat-curves   speed at 1, 5 and 10 (jogging and sprinting): a 10 is 1.18-1.22 of a 5, a 1 0.73-0.77; glow and on
//                 fire together add at most 10%. Shooting, measured the way stat-report does (a CPU shooter at Medium,
//                 its own release timing, open mid-range): a 1 makes 38-55% as often as a 5, a 10 125-145%, and no
//                 jumper from range has a make chance above 75% (a 10 glowing and on fire, every green). Dunk range: a 5
//                 is as before, a 10 adds at most 30; the windmill needs Dunking 6, the 360 needs 7
//   move-needs    the crossover needs Ball handling 3, the behind-the-back 5: below it your input makes a hesitation (or a
//                 crossover), and in a seeded CPU game a team whose players are below it never uses those moves
//   hikmah-text   no player-facing text says "Noor" except the team (Masjid Al-Noor) and people's names: every literal the
//                 game draws (tools/review-text.mjs) and the text drawn on the question, the right-answer reveal, the HUD
//                 card and How to play. The economy check passes and the shown BP rewards use the new scale
import path from 'node:path';
import { collectText } from '../tools/review-text.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// "Noor" allowed only as the team and as a person's name
const NOOR_OK = /^(Masjid Al-Noor|Al-Noor|AL-NOOR|NOOR)$/;
export function statCurveTests({ newContext, open }) {
  const T = {};
  T['stat-curves'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'stat-curves');
    const r = await p.evaluate(() => {
      window.__seed(4242); SETTINGS.difficulty = 'medium';
      newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0;
      for (let i = 0; i < 600 && M.phase !== 'live'; i++) updateMatch(STEP);
      const _u = Brain.prototype.update; Brain.prototype.update = function () { if (this.p._frozen) { const c = this.p.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = c.bHeld = false; return; } return _u.apply(this, arguments); };
      const p = M.players[0], h = attackHoop(0);
      for (const q of M.players) { q.hifzUsed = true; if (q !== p) { q._frozen = true; place(q, q.team === p.team ? 200 : COURT.L - 200, 40); } }
      const set = st => { p.st = Object.assign({}, p.def.stats, st); };
      const calm = () => { p.fire = false; p.boost = 0; p.nfx = null; p.fat = 0; p.turbo = 100; p.winded = false; p.comp = 50; M.hot = null; };
      const o = {};
      // speed
      const sp = (v, turbo, glow, fire) => { set({ spd: v }); calm(); giveBall(M.players[2]); p.state = 'free'; p.cmd.turbo = turbo; if (glow) p.boost = 10; if (fire) p.fire = true; const s = p.speed(); p.cmd.turbo = false; calm(); return s; };
      o.jog = [sp(1), sp(5), sp(10)].map(x => +x.toFixed(1)); o.spr = [sp(1, true), sp(5, true), sp(10, true)].map(x => +x.toFixed(1));
      o.boosts = +(sp(10, true, true, true) / sp(10, true)).toFixed(3);
      // shooting: the make chance of real shots
      const shots = (v, glow, fire, n) => {
        set({ sht: v }); window.__seed(9000 + v * 7919 + (glow ? 5 : 0)); let ev = 0, k = 0, max = 0;
        for (let i = 0; i < n; i++) {
          calm(); M.phase = 'live'; M.clock = 500; M.shotClock = 24; giveBall(p); place(p, h.x + h.dir * 300, h.z); p.state = 'free'; p.vx = p.vz = 0; p.y = 0; if (glow) p.boost = 10; if (fire) p.fire = true;
          let got = null; const _sf = shotFinal; shotFinal = function (q, pr) { const x = _sf.apply(this, arguments); if (q === p && got == null) got = x; return x; };
          startShot(p); try { for (let s = 0; s < 200 && got == null; s++) updateMatch(STEP); } finally { shotFinal = _sf; }
          if (got != null) { ev += clamp(got, 0.02, 0.97); k++; max = Math.max(max, got); }
        }
        return { pct: k ? ev / k : 0, k, max };
      };
      const s1 = shots(1, false, false, 150), s5 = shots(5, false, false, 150), s10 = shots(10, false, false, 150), top = shots(10, true, true, 80);
      o.shots = { r1: +(s1.pct / s5.pct).toFixed(3), r10: +(s10.pct / s5.pct).toFixed(3), p5: +s5.pct.toFixed(3), maxTop: +top.max.toFixed(3), n: [s1.k, s5.k, s10.k, top.k] };
      // a green release from range, open: by the rating, never above 75%
      p.human = 0; place(p, h.x + h.dir * 300, h.z);
      o.green = [1, 5, 10].map(v => { set({ sht: v }); return +greenOdds(p, 999, false).toFixed(3); });
      set({ sht: 10 }); o.capped = +shotFinal(p, 0.95).toFixed(3);
      place(p, h.x + h.dir * 60, h.z); o.greenClose = +greenOdds(p, 999, false).toFixed(3);   // close: as before
      p.human = -1;
      // dunks: the range a dunk starts from (sprinting), and the signature dunks
      const far = v => { set({ dnk: v }); let best = 0; for (let d = 60; d <= 420; d += 5) { calm(); giveBall(p); place(p, h.x + h.dir * d, h.z); p.state = 'free'; p.cmd.turbo = true; p.vx = -h.dir * p.speed(); p.vz = 0; if (canDunk(p)) best = d; } p.cmd.turbo = false; return best; };
      o.dunk = [far(1), far(5), far(10)];
      // past 180 the dunk is picked from 360 / windmill / tomahawk: a fixed random number picks the one we want
      const dunkAs = (v, type) => { set({ dnk: v }); calm(); giveBall(p); place(p, h.x + h.dir * 200, h.z); p.state = 'free'; p.vx = -h.dir * 300; p.cmd.turbo = true;
        const keep = Math.random, u = type === '360' ? 0.1 : 0.5; Math.random = () => u; p.human = 0; try { startDunk(p, {}); } finally { Math.random = keep; p.cmd.turbo = false; p.human = -1; } const t = p.act && p.act.type; p.state = 'free'; p.act = null; return t; };
      o.sig = { wm5: dunkAs(5, 'windmill'), wm6: dunkAs(6, 'windmill'), d360_6: dunkAs(6, '360'), d360_7: dunkAs(7, '360') };
      return o;
    });
    await ctx.close();
    const [j1, j5, j10] = r.jog, [s1, s5, s10] = r.spr, S = r.shots;
    const near = (x, a, b) => x >= a && x <= b;
    const ok = near(j10 / j5, 1.18, 1.22) && near(s10 / s5, 1.18, 1.22) && near(j1 / j5, 0.73, 0.77) && near(s1 / s5, 0.73, 0.77) && r.boosts <= 1.101
      && near(S.r1, 0.38, 0.55) && near(S.r10, 1.25, 1.45) && S.maxTop <= 0.75 && S.n.every(n => n > 50)
      && r.green[0] < 0.3 && near(r.green[1], 0.5, 0.6) && r.green[2] <= 0.75 && r.capped === 0.75 && r.greenClose === 0.95
      && r.dunk[1] === 205 && r.dunk[2] - r.dunk[1] <= 30 && r.dunk[0] < r.dunk[1]
      && r.sig.wm5 !== 'windmill' && r.sig.wm6 === 'windmill' && r.sig.d360_6 !== '360' && r.sig.d360_7 === '360' && !errs.length;
    return { ok, detail: [`speed jog ${r.jog.join(' / ')}, sprint ${r.spr.join(' / ')} (1 / 5 / 10): 10 is ${(s10 / s5).toFixed(3)} of a 5, a 1 ${(s1 / s5).toFixed(3)}; glow + fire x${r.boosts}`,
      `open mid-range make chance (CPU at Medium): a 5 ${S.p5}; a 1 is ${S.r1} of a 5, a 10 ${S.r10}; highest chance glowing and on fire ${S.maxTop} (${S.n.join('/')} shots)`,
      `a green release from range, open: ${r.green.join(' / ')}; 0.95 from range is capped to ${r.capped}; close ${r.greenClose}`,
      `dunk range sprinting at 1 / 5 / 10: ${r.dunk.join(' / ')}; signature dunks ${JSON.stringify(r.sig)}`, ...errs] };
  };
  T['move-needs'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'move-needs');
    const r = await p.evaluate(() => {
      const o = {};
      window.__seed(77); newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 60 } }); Game.screen = 'play'; M.introT = 0;
      for (let i = 0; i < 600 && M.phase !== 'live'; i++) updateMatch(STEP);
      const me = M.players.find(q => q.human === 0), cpu = M.players.find(q => q.human < 0 && q.team === 1);
      const tryMove = (q, st, kind) => { q.st = Object.assign({}, q.def.stats, st); giveBall(q); q.state = 'free'; q.mv = null; q.cd.mv = 0; q.turbo = 100; const ok = startDribbleMove(q, kind, 1); const k = q.mv && q.mv.kind; q.mv = null; return ok ? k : false; };
      o.you = { cross2: tryMove(me, { spd: 2, pas: 2 }, 'cross'), cross4: tryMove(me, { spd: 4, pas: 4 }, 'cross'), btb4: tryMove(me, { spd: 4, pas: 4 }, 'btb'), btb2: tryMove(me, { spd: 2, pas: 2 }, 'btb'), btb6: tryMove(me, { spd: 6, pas: 4 }, 'btb'), spin2: tryMove(me, { spd: 2, pas: 2 }, 'spin') };
      o.cpu = { cross2: tryMove(cpu, { spd: 2, pas: 2 }, 'cross'), btb4: tryMove(cpu, { spd: 4, pas: 4 }, 'btb'), btb6: tryMove(cpu, { spd: 6, pas: 4 }, 'btb') };
      // a seeded CPU game: one team's players below both thresholds never cross over or go behind the back
      const moves = {}; const _lm = logMove; logMove = function (q, kind) { const k = q.team + ':' + kind; moves[k] = (moves[k] || 0) + 1; return _lm.apply(this, arguments); };
      const _sm = startMove; let auto = 0; startMove = function (q, type) { const was = q.move; const r = _sm.apply(this, arguments); if (q.team === 1 && q.move && q.move !== was) auto++; return r; };
      window.__seed(4242); SETTINGS.difficulty = 'hard';
      newMatch(TEAMS[2], TEAMS[5], { humans: [], fmt: { format: 'quarters', len: 60 } });
      for (const q of M.players) { if (q.team === 1) { q.st = Object.assign({}, q.st, { spd: 2.5, pas: 2.5 }); q._hnd = null; } q.hifzUsed = true; }
      for (let n = 0; n < 60 * 60 * 15 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; }
      logMove = _lm; startMove = _sm; SETTINGS.difficulty = 'medium';
      o.game = { over: M.phase === 'over', low: (moves['1:cross'] || 0) + (moves['1:btb'] || 0), autoLow: auto, high: (moves['0:cross'] || 0) + (moves['0:btb'] || 0), lowOther: Object.entries(moves).filter(([k]) => k[0] === '1').reduce((t, [, v]) => t + v, 0) };
      return o;
    });
    await ctx.close();
    const Y = r.you, Cp = r.cpu, G = r.game;
    const ok = Y.cross2 === 'hesi' && Y.cross4 === 'cross' && Y.btb4 === 'cross' && Y.btb2 === 'hesi' && Y.btb6 === 'btb' && Y.spin2 === 'spin'
      && Cp.cross2 === false && Cp.btb4 === false && Cp.btb6 === 'btb' && G.over && G.low === 0 && G.autoLow === 0 && G.high > 0 && !errs.length;
    return { ok, detail: [`you: ${JSON.stringify(Y)}`, `CPU: ${JSON.stringify(Cp)}`, `a seeded game: crossovers and behind-the-backs by the team below the needs ${G.low} (automatic ${G.autoLow}), by the other team ${G.high}; the low team's other moves ${G.lowOther}`, ...errs] };
  };
  T['hikmah-text'] = async ({ browser, base }) => {
    const bad = [];
    for (const row of collectText(ROOT)) {
      const t = row.text || row.t || (Array.isArray(row) ? row[2] : '');
      const words = String(t).match(/[A-Za-z’'-]*\bnoor\b[A-Za-z’'-]*/gi) || [];
      for (const w of words) if (!NOOR_OK.test(w.replace(/[’']s$/, ''))) bad.push((row.file || '') + ': ' + String(t).slice(0, 90));
    }
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/?nowelcome=1', errs, 'hikmah-text');
    const r = await p.evaluate(() => {
      const seen = []; const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t) { seen.push(String(t)); return f.apply(this, arguments); };
      const shot = () => { try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx); } catch (e) { seen.push('ERR ' + e.message); } };
      try {
        newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; M.introT = 0;
        for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);
        const me = M.players.find(q => q.human === 0); me.def.huffath = true; me.hifzUsed = false; me.hifz = 60;
        shot();                                                             // the HUD card with the meter
        openTrivia(me); shot(); answerTrivia(Game.trivia.order.indexOf(0)); const gift = Game.trivia.gift; shot();
        for (let i = 0; i < 130 && Game.trivia; i++) triviaUpdate(1 / 60); shot();
        Game.trivia = null; Game.screen = 'howto'; Game.idx = 0; shot();
        return { seen: [...new Set(seen)], gift, econ: (() => { C = freshCareer(); C.name = 'T'; C.bracket = makeBracket(0); return econSelfCheck(); })(), bpK: ECON.bpK };
      } finally { CanvasRenderingContext2D.prototype.fillText = f; }
    }).catch(e => ({ err: e.message }));
    await ctx.close();
    if (r.err) return { ok: false, detail: [r.err, ...errs] };
    const drawn = r.seen.filter(t => /\bnoor\b/i.test(t) && !(t.match(/[A-Za-z’'-]*\bnoor\b[A-Za-z’'-]*/gi) || []).every(w => NOOR_OK.test(w)));
    const hik = r.seen.filter(t => /HIKMAH|Hikmah|LIGHT UPON LIGHT|Light Upon Light/.test(t));
    const ok = !bad.length && !drawn.length && hik.some(t => /HIKMAH CHALLENGE/.test(t)) && hik.some(t => /^HIKMAH/.test(t)) && r.seen.some(t => /^Correct! /.test(t) && t.length > 10)
      && !r.seen.some(t => /CHOOSE YOUR|pick 1 of 3|^ERR /.test(t)) && !!r.gift && r.econ.length === 0 && r.bpK > 0 && r.bpK < 1 && !errs.length;
    return { ok, detail: [`literals with "Noor" that aren't the team or a name: ${bad.length ? bad.slice(0, 6).join(' | ') : 'none'}`,
      `drawn: ${drawn.length ? drawn.join(' | ') : 'no Noor'}; Hikmah text drawn: ${hik.slice(0, 6).join(' | ')}; a right answer gave ${r.gift}`, `econSelfCheck: ${JSON.stringify(r.econ)}, bpK ${r.bpK}`, ...errs] };
  };
  return T;
}
