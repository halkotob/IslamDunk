// v9.21.0 (tests/run.mjs registers them):
//   dunk-new        (fast) each new dunk (the reverse, between the legs), facing each way: it completes, slams and scores,
//                   and every frame he holds it the ball is within 20 units of a hand as drawn (the 9.19.1 probe); the
//                   reverse finishes with his back to the rim (his facing flips); a Dunking 5 player can't do either
//                   (the same dunk becomes a tomahawk or a two-hander), a 6 can do the reverse, an 8 both; the CPU picks
//                   them (a good dunker over 200 dunk starts); the names
//   dunk-new-online (full tier) a rollback game in which every dunk is one of the two: no desync, and both were dunked
//   backcourt-steal (fast) after a basket the CPU inbounds; a human defender crosses half court at once (nothing stops
//                   him at the line) and takes the ball from the handler in the CPU's backcourt (a steal there counts)
//   cpu-press       (fast) the CPU presses (picks up the handler in his backcourt) only in a close game late: tied in the
//                   last third yes; tied early no; 15 apart late no; and it eases in (no flip from one frame to the next)
//   cpu-shell       (fast) the default: with the handler in his backcourt one CPU defender picks him up just inside half
//                   court and the other is back near the rim; in the frontcourt the off-ball defender sags (never both
//                   on the three-point line); a team taking threes draws a closer close-out on its shooter
import { BALL_HANDS_JS } from '../tools/ball-hands-lib.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function v921Tests({ newContext, open }) {
  const T = {};
  const plain = async (browser, base, errs, tag) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
    await ctx.addInitScript(`(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; try { localStorage.setItem('islamdunk.welcomed', '1'); } catch (e) {} })();`);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ': ' + e.message));
    await p.goto(base + '/?nowelcome=1'); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen === 'title', null, { timeout: 30000 }); await p.waitForTimeout(400);
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
    return { ctx, p };
  };
  // a match with you on team `team` and everybody else out of the way (they stand still at the far end)
  const SOLO = `window.__solo = (team) => {
    newMatch(TEAMS[0], TEAMS[1], { humans: [{ team, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0;
    for (let i = 0; i < 600 && M.phase !== 'live'; i++) { snapPrev(); updateMatch(STEP); }
    const me = M.players.find(q => q.human === 0); for (const q of M.players) { q.hifzUsed = true; if (q !== me) q._frozen = true; }
    if (!Brain.prototype.__fz) { const u = Brain.prototype.update; Brain.prototype.__fz = 1; Brain.prototype.update = function () { if (this.p._frozen) { const c = this.p.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = false; return; } return u.apply(this, arguments); }; }
    const h = attackHoop(me.team); for (const q of M.players) if (q !== me) place(q, h.x - h.dir * 900, 100 + q.slot * 400);
    return me;
  };`;
  T['dunk-new'] = async ({ browser, base }) => {
    const errs = [], { ctx, p } = await plain(browser, base, errs, 'dunk-new');
    await p.evaluate(BALL_HANDS_JS); await p.evaluate(SOLO);
    const r = await p.evaluate(() => {
      const out = { runs: [], gate: {}, cpu: {}, names: [dunkName('reverse'), dunkName('betweenlegs')] };
      for (const type of ['reverse', 'betweenlegs']) for (const team of [0, 1]) {
        const me = window.__solo(team), h = attackHoop(me.team), B = window.__bh;
        giveBall(me); place(me, h.x + h.dir * 175, h.z + 40); me.state = 'free'; me.st = Object.assign({}, me.st, { dnk: 9 }); M.phase = 'live'; M.shotClock = 14;
        const face0 = sgn(h.x - me.x), s0 = M.teams[me.team].score;
        startDunk(me, {}); const a = me.act; a.type = type; a.D = clamp(0.6 + 175 / 450, 0.62, 1.15) * dunkLenK(type); a.peak = 64 + (a.D - 0.7) * 30 + dunkPeakAdd(type);
        let held = 0, worst = 0, f = 0, slam = false;
        while (f < 200 && (me.state === 'dunk' || f < 2)) {
          snapPrev(); updateMatch(STEP); updateCamera(STEP); B.frame++; f++;
          if (a.didSlam) slam = true;
          if (ball.owner === me) { const m = B.measure(type); if (m) { held++; worst = Math.max(worst, m.gap); } }
        }
        const faceEnd = me.face;
        for (let i = 0; i < 90; i++) { snapPrev(); updateMatch(STEP); }
        out.runs.push({ type, team, frames: f, slam, scored: M.teams[me.team].score - s0, held, worst: Math.round(worst), turned: faceEnd === -face0 });
      }
      // the rating gate: Dunking 5, 6, 8 (many starts each, from both distances)
      for (const dn of [5, 6, 8]) {
        const me = window.__solo(0), h = attackHoop(me.team), seen = new Set();
        for (let i = 0; i < 160; i++) { giveBall(me); place(me, h.x + h.dir * (i % 2 ? 190 : 140), h.z); me.state = 'free'; me.st = Object.assign({}, me.st, { dnk: dn }); startDunk(me, {}); seen.add(me.act.type); me.state = 'free'; me.act = null; }
        out.gate[dn] = [...seen].sort();
      }
      // the CPU: a good dunker's choices
      const me = window.__solo(0), cpu = M.players.find(q => q.human < 0 && q.team === 0) || M.players.find(q => q.human < 0), hc = attackHoop(cpu.team);
      const seen = {}; for (let i = 0; i < 240; i++) { giveBall(cpu); place(cpu, hc.x + hc.dir * (i % 2 ? 190 : 140), hc.z); cpu.state = 'free'; cpu.st = Object.assign({}, cpu.st, { dnk: 9, spd: 8 }); M.time += 0.37; startDunk(cpu, {}); seen[cpu.act.type] = (seen[cpu.act.type] || 0) + 1; cpu.state = 'free'; cpu.act = null; }
      out.cpu = seen; void me;
      return out;
    });
    await ctx.close();
    const bad = r.runs.filter(x => !x.slam || x.scored !== 2 || x.held < 20 || x.worst > 20 || (x.type === 'reverse' && !x.turned));
    const gateOK = !r.gate[5].includes('reverse') && !r.gate[5].includes('betweenlegs') && r.gate[6].includes('reverse') && !r.gate[6].includes('betweenlegs') && r.gate[8].includes('reverse') && r.gate[8].includes('betweenlegs');
    const ok = !bad.length && gateOK && (r.cpu.reverse || 0) > 0 && (r.cpu.betweenlegs || 0) > 0 && r.names[0] === 'REVERSE JAM' && r.names[1] === 'THROUGH-THE-LEGS' && !errs.length;
    return { ok, detail: [...r.runs.map(x => `${x.type} (team ${x.team}): ${x.frames} frames, slammed ${x.slam}, +${x.scored}, held ${x.held} frames, farthest from a drawn hand ${x.worst}${x.type === 'reverse' ? ', back to the rim at the end ' + x.turned : ''}`),
      `the gate: Dunking 5 ${r.gate[5].join('/')}; 6 ${r.gate[6].join('/')}; 8 ${r.gate[8].join('/')}`, `the CPU (Dunking 9) over 240 starts: ${JSON.stringify(r.cpu)}`, `names: ${r.names.join(', ')}`, ...errs] };
  };
  T['backcourt-steal'] = async ({ browser, base }) => {
    const errs = [], { ctx, p } = await plain(browser, base, errs, 'backcourt-steal');
    const r = await p.evaluate(() => {
      const res = [];
      for (let k = 0; k < 8; k++) {
        window.__seed(300 + k);
        newMatch(TEAMS[2], TEAMS[5], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'quarters', len: 600 } }); Game.screen = 'play'; M.introT = 0;
        for (let i = 0; i < 600 && M.phase !== 'live'; i++) { snapPrev(); updateMatch(STEP); }
        const me = M.players.find(q => q.human === 0); me.st = Object.assign({}, me.st, { stl: 10, spd: 9 }); for (const q of M.players) q.hifzUsed = true;
        // you just scored: they inbound under your... their own basket
        Object.assign(ball, { owner: null, state: 'loose' }); M.phase = 'dead'; M.deadT = 0.05; M.nextInbound = 1; M.inb = null; M.possTeam = -1;
        const mid = COURT.L / 2, theirBack = x => inBackcourt(x, 1);
        let crossedAt = null, stole = null, minX = 1e9, wallT = 0;
        M.cmdHook = q => {
          if (q !== me) return false;
          const c = q.cmd; c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = false;
          const bo = ball.owner, tgt = bo && bo.team === 1 ? bo : ball;
          const dx = tgt.x - q.x, dz = tgt.z - q.z, d = Math.hypot(dx, dz) || 1; c.mx = dx / d; c.mz = dz / d; c.turbo = d > 60;
          if (bo && bo.team === 1 && d < 60 && (Math.floor(M.time * 10) % 3 === 0)) c.a = true;   // reach every 0.3 s
          return true;
        };
        for (let i = 0; i < 60 * 9; i++) {
          snapPrev(); updateMatch(STEP);
          if (crossedAt == null && theirBack(me.x) && M.phase === 'live') crossedAt = M.time;
          if (ball.owner === me && stole == null) { stole = { t: M.time, back: theirBack(me.x) }; break; }
        }
        M.cmdHook = null;
        res.push({ crossed: crossedAt != null, stole: !!stole, inBack: !!(stole && stole.back), bc: !!M.bc });
      }
      return res;
    });
    await ctx.close();
    const crossed = r.filter(x => x.crossed).length, back = r.filter(x => x.inBack).length;
    const ok = crossed === r.length && back >= 1 && !r.some(x => x.bc) && !errs.length;
    return { ok, detail: [`${r.length} CPU inbounds after your basket: you crossed half court every time ${crossed === r.length} (${crossed}); steals ${r.filter(x => x.stole).length}, in their backcourt ${back}; the old protection never started ${!r.some(x => x.bc)}`, ...errs] };
  };
  T['cpu-press'] = async ({ browser, base }) => {
    const errs = [], { ctx, p } = await plain(browser, base, errs, 'cpu-press');
    const r = await p.evaluate(() => {
      const run = (scoreA, scoreB, prog) => {
        window.__seed(77); SETTINGS.difficulty = 'hard';   // (easier CPUs press less hard: Hard shows it plainly)
        newMatch(TEAMS[1], TEAMS[4], { humans: [], fmt: { format: 'halves', len: 120 } }); Game.screen = 'play'; M.introT = 0;
        for (let i = 0; i < 600 && M.phase !== 'live'; i++) { snapPrev(); updateMatch(STEP); }
        M.teams[0].score = scoreA; M.teams[1].score = scoreB;
        const left = (1 - prog) * 240; M.quarter = left > 120 ? 1 : 2; M.clock = left > 120 ? left - 120 : left;
        // team 0 brings it up from its backcourt; team 1 defends
        const bo = M.teams[0].players[0], h0 = defendHoop(0); giveBall(bo, 'inbound'); place(bo, h0.x + h0.dir * 200, 350); bo.state = 'free'; M.phase = 'live';
        M.cmdHook = q => { if (q !== bo) return false; const c = q.cmd; c.mx = c.mz = 0; c.a = c.b = false; return true; };   // he stands there
        const ks = [], pos = [];
        for (let i = 0; i < 60 * 4; i++) { snapPrev(); updateMatch(STEP); if (ball.owner !== bo) { giveBall(bo, 'inbound'); bo.state = 'free'; } ks.push(cpuPressK(1)); }
        M.cmdHook = null;
        const D = M.teams[1].players, near = D.slice().sort((a, b) => dxz(a, bo) - dxz(b, bo))[0];
        let jump = 0; for (let i = 1; i < ks.length; i++) jump = Math.max(jump, Math.abs(ks[i] - ks[i - 1]));
        return { k: +ks[ks.length - 1].toFixed(2), jump: +jump.toFixed(3), onHim: Math.round(dxz(near, bo)), inHisBack: inBackcourt(near.x, 0) };
      };
      return { lateClose: run(30, 28, 0.8), early: run(10, 10, 0.2), lateBlowout: run(40, 25, 0.8) };
    });
    await ctx.close();
    const ok = r.lateClose.k > 0.8 && r.lateClose.inHisBack && r.lateClose.onHim < 90 && r.early.k < 0.05 && !r.early.inHisBack && r.lateBlowout.k < 0.05 && !r.lateBlowout.inHisBack && r.lateClose.jump < 0.05 && !errs.length;
    return { ok, detail: [`tied-ish late (30-28, 80% gone): press ${r.lateClose.k}, nearest defender ${r.lateClose.onHim} from the handler, in his backcourt ${r.lateClose.inHisBack}; largest step in a frame ${r.lateClose.jump}`,
      `tied early (20% gone): press ${r.early.k}, in his backcourt ${r.early.inHisBack}`, `15 apart late: press ${r.lateBlowout.k}, in his backcourt ${r.lateBlowout.inHisBack}`, ...errs] };
  };
  T['cpu-shell'] = async ({ browser, base }) => {
    const errs = [], { ctx, p } = await plain(browser, base, errs, 'cpu-shell');
    const r = await p.evaluate(() => {
      window.__seed(91); SETTINGS.difficulty = 'hard';   // (Hard plays the whole shell: the differences are clearest)
      newMatch(TEAMS[3], TEAMS[6], { humans: [], fmt: { format: 'halves', len: 120 } }); Game.screen = 'play'; M.introT = 0;
      for (let i = 0; i < 600 && M.phase !== 'live'; i++) { snapPrev(); updateMatch(STEP); }
      const O = M.teams[0].players, bo = O[0], mate = O[1], h = defendHoop(1), mid = COURT.L / 2;   // team 1 defends hoop h
      const hold = (bx, bz, mx, mz, secs) => {
        M.cmdHook = q => { if (q.team !== 0) return false; const c = q.cmd; c.mx = c.mz = 0; c.a = c.b = false; return true; };
        giveBall(bo, 'inbound'); place(bo, bx, bz); place(mate, mx, mz); bo.state = 'free'; M.phase = 'live';
        const avg = new Map();   // each defender's average spot over the last second
        for (let i = 0; i < 60 * secs; i++) {
          snapPrev(); updateMatch(STEP); if (ball.owner !== bo) { giveBall(bo, 'inbound'); bo.state = 'free'; } place(mate, mx, mz); M.shotClock = 14;
          if (i >= 60 * secs - 60) for (const d of M.teams[1].players) { const a = avg.get(d) || { x: 0, z: 0, n: 0 }; a.x += d.x; a.z += d.z; a.n++; avg.set(d, a); }
        }
        M.cmdHook = null;
        const D = M.teams[1].players.map(d => { const a = avg.get(d); return { x: a.x / a.n, z: a.z / a.n }; }).sort((a, b) => dxz(a, bo) - dxz(b, bo));
        return { up: D[0], back: D[1] };
      };
      // backcourt: he's 200 past half court on his own side, his mate on the far wing
      const hb = defendHoop(0), back = hold(hb.x + hb.dir * 260, 350, hb.x + hb.dir * 420, 560, 3);
      const sideOf = q => Math.sign(q.x - mid) === Math.sign(h.x - mid);
      const bc = { upOurHalf: sideOf(back.up), upNearLine: Math.round(Math.abs(back.up.x - mid)), backFromRim: Math.round(dxz(back.back, h)) };
      // frontcourt: both at the three-point line
      const f = hold(h.x + h.dir * 330, 380, h.x + h.dir * 300, 560, 3);
      const fc = { onFromRim: Math.round(dxz(f.up, h)), offFromRim: Math.round(dxz(f.back, h)), mateFromRim: Math.round(dxz(mate, h)), bothOnLine: dxz(f.up, h) > 285 && dxz(f.back, h) > 285 };
      // threes: the handler took 6 of the last 8 shots as threes: his defender closes out higher
      M.d921.log[0] = [[1, M.players.indexOf(bo)], [1, M.players.indexOf(bo)], [0, 1], [1, M.players.indexOf(bo)], [1, M.players.indexOf(bo)], [0, 1], [1, M.players.indexOf(bo)], [1, M.players.indexOf(bo)]];
      const g = hold(h.x + h.dir * 330, 380, h.x + h.dir * 300, 560, 6);
      const hot = { k3: +threeHeat(0).toFixed(2), onFromHim: Math.round(dxz(g.up, bo)), before: Math.round(dxz(f.up, bo)), offFromRim: Math.round(dxz(g.back, h)) };
      return { bc, fc, hot };
    });
    await ctx.close();
    const ok = r.bc.upOurHalf && r.bc.upNearLine < 200 && r.bc.backFromRim < 280 && !r.fc.bothOnLine && r.fc.offFromRim < r.fc.mateFromRim - 60 && r.hot.k3 > 0.5 && r.hot.onFromHim < r.hot.before && r.hot.offFromRim < 285 && !errs.length;
    return { ok, detail: [`his backcourt: the pick-up man in our half ${r.bc.upOurHalf}, ${r.bc.upNearLine} from half court; the back man ${r.bc.backFromRim} from the rim`,
      `frontcourt: on the ball ${r.fc.onFromRim} from the rim, off the ball ${r.fc.offFromRim} (his man ${r.fc.mateFromRim}); both on the three-point line ${r.fc.bothOnLine}`,
      `threes (6 of the last 8): read ${r.hot.k3}; the shooter's defender ${r.hot.onFromHim} from him (was ${r.hot.before}); the other ${r.hot.offFromRim} from the rim`, ...errs] };
  };
  T['dunk-new-online'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { rb: true }), q = '/?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=dunknew&nowelcome=1';
    const H = await open(ctx, base + q, errs, 'host'), G = await open(ctx, base + q, errs, 'guest');
    // every dunk is one of the two (by the dunker's own attempt count: the same on both phones, in a replayed frame too)
    const FORCE = () => { const sd = startDunk; window.__nd = {}; startDunk = function (p, opts) { const r = sd.apply(this, arguments), a = p.act; if (a && p.state === 'dunk' && !a.alley && !(opts && opts.alley)) { const t = (p.stats.fga | 0) % 2 ? 'reverse' : 'betweenlegs', d = dxz(p, a.hoop); a.type = t; a.D = clamp(0.6 + d / 450, 0.62, 1.15) * dunkLenK(t); a.peak = 64 + (a.D - 0.7) * 30 + dunkPeakAdd(t); if (!RB.resim) window.__nd[t] = (window.__nd[t] || 0) + 1; } return r; }; };
    await H.evaluate(FORCE); await G.evaluate(FORCE);
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code); await G.waitForFunction(() => Lobby.isIn(), null, { timeout: 15000 }).catch(() => {});
    await H.evaluate(() => { const o = Lobby.opts(); o.game = 'co'; Net.mode = 'co'; Lobby.changed(); }); await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
    await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => RBN.on && Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    // the two humans let the CPU play (Same team vs CPU: their CPU-driven... the humans stand; the CPU team dunks)
    // (until both have been dunked on both phones, 30 s at least and 80 s at most)
    for (let t = 0; t < 80; t += 5) { await sleep(5000); if (t < 25) continue;
      const nd = await Promise.all([H, G].map(x => x.evaluate(() => window.__nd || {})));
      if (nd.every(o => o.reverse && o.betweenlegs)) break; }
    const rep = await Promise.all([H, G].map(x => x.evaluate(() => Object.assign({}, RBN.report() || {}, { nd: window.__nd, score: M.teams.map(t => t.score) }))));
    await ctx.close();
    const nd = rep[0].nd || {};
    const ok = rep.every(x => !x.desync && !(x.desyncs > 0) && x.hashesChecked > 5) && (nd.reverse || 0) + (rep[1].nd.reverse || 0) > 0 && (nd.betweenlegs || 0) + (rep[1].nd.betweenlegs || 0) > 0 && !errs.length;
    return { ok, detail: [`host: ${JSON.stringify({ nd: rep[0].nd, desyncs: rep[0].desyncs || 0, hashes: rep[0].hashesChecked, score: rep[0].score })}`, `guest: ${JSON.stringify({ nd: rep[1].nd, desyncs: rep[1].desyncs || 0, hashes: rep[1].hashesChecked, score: rep[1].score })}`, ...errs] };
  };
  return T;
}
