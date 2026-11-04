// v9.16.1 animation fixes and retirements (src/sim/v9161-anim.js). Registered into tests/run.mjs.
//   anim-moves     pose measurements on the game's own sim: the crossover's ball crosses the body's midline in front;
//                  from the near hand it goes between the legs; the behind-the-back lasts at least 0.40 s and both hands
//                  reach the ball; the hesitation never leaves 'free' and keeps the dribble; the step-back travels back at
//                  least 40 units (the stick pushing forward); the hop step lands on both feet and picks up the dribble;
//                  the windmill turns the other way (shoulder angle falls, not rises); the nod moves only the head;
//                  after a pump fake the ball stays in both hands (no dribble frame) and the pick-up holds
//   anim-retired   saved dribble Classic and tomahawk Classic / Smooth / Power load as Stride / Float, and their settings
//                  are gone; a saved or online retired taunt falls back to the default without error, the kept taunts
//                  keep their places, and the retired ones aren't unlockable or pickable; no code calls react 'armsUp' /
//                  'fist'; the Community Center Gym is in no menu or random pick but its id still loads and draws; the
//                  Al-Amanah gym draws without the whiteboard; a CPU match in every mode runs with zero page errors
import fs from 'node:fs';
import path from 'node:path';
import { manifestFiles } from '../tools/review-text.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function animFixTests({ newContext, open }) {
  const T = {};
  T['anim-moves'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'anim'), bad = [], detail = [];
    const r = await p.evaluate(() => {
      const out = {};
      // a handler 520 units out, nobody near; cmd: forward (toward the hoop) at k
      const setup = (dist = 520, fwd = 0) => {
        __seed(4242); SETTINGS.difficulty = 'medium';
        newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'first21', target: 99, len: 120, sc: 0 } });
        Object.assign(M, { phase: 'live', inb: null, check: null, nextInbound: null, sideOut: null, ft: null, introT: 0 }); M.taunt = null;
        const me = M.teams[0].players[0], h = attackHoop(me.team);
        for (const q of M.players) if (q !== me) place(q, h.x + h.dir * 1000, 620);
        place(me, h.x + h.dir * dist, h.z); me.face = sgn(h.x - me.x); me.turbo = 100; giveBall(me, 'inbound');
        M.cmdHook = q => { zeroCmd(q.cmd); if (q === me && fwd) { q.cmd.mx = -h.dir * fwd; } return true; };
        for (let i = 0; i < 10; i++) updateMatch(STEP);
        return { me, h };
      };
      const run = (me, n, f) => { for (let i = 0; i < n; i++) { updateMatch(STEP); if (f && f(i) === false) break; } };
      // crossover from the far hand: the ball crosses the midline in front
      { const { me } = setup(520, 0.6); me.dh = 'f'; me.move = null; startDribbleMove(me, 'cross', 1); out.crossStyle = me.mv && me.mv.style;
        const side = [], front = []; run(me, 24, () => { if (!me.move) return; side.push(Math.sign(ball.z - me.z)); front.push((ball.x - me.x) * me.face); });
        const flips = side.filter((s, i) => i && s && side[i - 1] && s !== side[i - 1]).length, i0 = side.findIndex((s, i) => i && s !== side[i - 1]);
        out.cross = { flips, frontAtCross: i0 > 0 ? Math.round(front[i0]) : null }; }
      { const { me } = setup(520, 0.6); me.dh = 'n'; me.move = null; startDribbleMove(me, 'cross', 1); out.legsStyle = me.mv && me.mv.style; }
      // behind the back: duration, both hands reach the ball
      { const { me } = setup(520, 0.6); me.dh = 'n'; me.move = null; startDribbleMove(me, 'btb', 1); out.btbDur = me.mv ? me.mv.dur : 0;
        const from = me.move.from, to = me.move.to; let dA = 99, dB = 99;
        run(me, 30, () => { if (!me.move) return; const A = me.hands[from], B = me.hands[to]; dA = Math.min(dA, Math.hypot(A.x - ball.x, A.y - ball.y)); dB = Math.min(dB, Math.hypot(B.x - ball.x, B.y - ball.y)); });
        out.btb = { fromHand: +dA.toFixed(1), toHand: +dB.toFixed(1), behindSeen: true }; }
      // hesitation: never leaves 'free', keeps the dribble
      { const { me } = setup(520, 0.6); startDribbleMove(me, 'hesi', 1); const st = new Set(); let lowBall = 99;
        run(me, 34, () => { st.add(me.state + (ball.owner === me ? '' : ' (lost)') + (me.pick ? ' (picked)' : '')); lowBall = Math.min(lowBall, ball.y); });
        out.hesi = { states: [...st].join(','), ballBounced: lowBall < BALL_R + 4 }; }
      // step-back: net travel back, the stick pushing toward the hoop
      { const { me, h } = setup(520, 0.6); const x0 = me.x, z0 = me.z; startDribbleMove(me, 'stepback', 1); let n = 0; run(me, 40, () => { n++; if (!me.mv) return false; });
        out.stepBack = Math.round(((me.x - x0) * (h.dir) + 0 * (me.z - z0))); out.stepFrames = n; }
      // hop step: lands on both feet, picks up the dribble, keeps the ball in the hands after
      { const { me } = setup(240, 0); startDribbleMove(me, 'drop', 1); let land = null;
        run(me, 40, () => { if (me.mv) land = { nh: me.j.nh.a, fh: me.j.fh.a, nk: me.j.nk.a, fk: me.j.fk.a }; else return false; });
        const m0 = handsMid(me); let maxOff = 0; run(me, 30, () => { const m = handsMid(me); maxOff = Math.max(maxOff, Math.abs(ball.y - m.y)); });
        out.hop = { hips: +Math.abs(land.nh - land.fh).toFixed(2), knees: +Math.abs(land.nk - land.fk).toFixed(2), picked: !!me.pick, held: maxOff < 10, label: MOVE_LABEL.drop }; void m0; }
      // pump fake: the ball stays in both hands, the pick-up holds (and no dribble sound)
      { const { me } = setup(330, 0); startFake(me); let maxOff = 0, low = 99, bounces = 0; const b = SFX.bounce; SFX.bounce = function () { bounces++; return b.apply(this, arguments); };
        run(me, 90, () => { if (ball.owner !== me) return false; const m = handsMid(me); maxOff = Math.max(maxOff, Math.abs(ball.y - m.y)); low = Math.min(low, ball.y); });
        SFX.bounce = b; out.fake = { picked: !!me.pick, maxOff: +maxOff.toFixed(1), lowest: Math.round(low), bounces, state: me.state }; }
      // windmill: the shoulder angle falls through the throw (it rose before 9.16.1)
      { const { me, h } = setup(150, 0); startDunk(me, {}); const a = me.act; a.type = 'windmill'; const ns = [];
        run(me, 80, () => { if (me.state !== 'dunk') return false; if (me.act.s > 0.14 && me.act.s < 0.76) ns.push(me.j.ns.a); });
        out.windmill = { first: +(ns[0] || 0).toFixed(2), last: +(ns[ns.length - 1] || 0).toFixed(2), n: ns.length }; void h; }
      // nod: only the head moves (the body's joints match the same frames without a nod)
      { const rec = nod => { const { me } = setup(520, 0); ball.owner = null; ball.state = 'loose'; ball.x = me.x + 900; ball.grabLock = 99; for (let i = 0; i < 20; i++) updateMatch(STEP); if (nod) react(me, 'nod', 1.0); const J = []; let tilt = 0; run(me, 50, () => { J.push(JOINTS.map(k => me.j[k].a)); tilt = Math.max(tilt, me.headTilt || 0); }); return { J, tilt }; };
        const a = rec(false), b = rec(true); let diff = 0; a.J.forEach((row, i) => row.forEach((v, j) => { diff = Math.max(diff, Math.abs(v - b.J[i][j])); }));
        out.nod = { bodyDiff: +diff.toFixed(4), headTilt: +b.tilt.toFixed(2) }; }
      M.cmdHook = null;
      return out;
    });
    await ctx.close();
    const push = (ok, s) => { detail.push((ok ? 'ok   ' : 'BAD  ') + s); if (!ok) bad.push(s); };
    push(r.crossStyle === 'cross' && r.cross.flips >= 1 && r.cross.frontAtCross > 5, `crossover (far hand): the ball switches sides ${r.cross.flips}x, ${r.cross.frontAtCross} units in front of him when it crosses`);
    push(r.legsStyle === 'legs', `from the near hand the crossover goes between the legs (${r.legsStyle})`);
    push(r.btbDur >= 0.4 && r.btb.fromHand < 12 && r.btb.toHand < 12, `behind the back: ${r.btbDur} s; closest hand to ball: first hand ${r.btb.fromHand}, second ${r.btb.toHand}`);
    push(r.hesi.states === 'free' && r.hesi.ballBounced, `hesitation: states ${r.hesi.states}; the dribble keeps bouncing ${r.hesi.ballBounced}`);
    push(r.stepBack >= 40, `step-back: ${r.stepBack} units back from the hoop (stick pushing forward), in ${r.stepFrames} frames`);
    push(r.hop.hips < 0.15 && r.hop.knees < 0.15 && r.hop.picked && r.hop.held && r.hop.label === 'HOP STEP', `hop step: landing hips ${r.hop.hips} / knees ${r.hop.knees} apart; dribble picked up ${r.hop.picked}; ball held after ${r.hop.held}`);
    push(r.fake.picked && r.fake.maxOff < 10 && r.fake.lowest > 40 && r.fake.bounces === 0, `pump fake: picked up ${r.fake.picked}; ball at most ${r.fake.maxOff} from his hands, never lower than ${r.fake.lowest}; ${r.fake.bounces} dribble sounds`);
    push(r.windmill.n > 10 && r.windmill.last < r.windmill.first - 2, `windmill: shoulder ${r.windmill.first} -> ${r.windmill.last} through the throw (turns backward)`);
    push(r.nod.bodyDiff < 0.001 && r.nod.headTilt > 0.2, `nod: body joints change ${r.nod.bodyDiff}, head tilts ${r.nod.headTilt}`);
    return { ok: !bad.length && !errs.length, detail: [...detail, ...errs] };
  };

  T['anim-retired'] = async ({ browser, base }) => {
    const detail = [], bad = [], push = (ok, s) => { detail.push((ok ? 'ok   ' : 'BAD  ') + s); if (!ok) bad.push(s); };
    // (1) old saves: dribble Classic, tomahawk Classic / Smooth / Power, an equipped retired taunt
    for (const tk of ['classic', 'smooth', 'power']) {
      const errs = [], ctx = await newContext(browser);
      await ctx.addInitScript(tk => { try { localStorage.setItem('islamdunk.dribble', 'classic'); localStorage.setItem('islamdunk.tomahawk', tk); } catch (e) {} }, tk);
      const p = await open(ctx, base + '/', errs, 'saves');
      const r = await p.evaluate(() => ({ dribble: SETTINGS.dribble, tomahawk: SETTINGS.tomahawk, rows: SET_ITEMS.map(s => s.label).filter(l => l === 'Dribble' || l === 'Tomahawk style'), stored: [localStorage.getItem('islamdunk.dribble'), localStorage.getItem('islamdunk.tomahawk')] }));
      push(r.dribble === 'stride' && r.tomahawk === 'float' && !r.rows.length && r.stored.join() === 'stride,float' && !errs.length, `saved dribble Classic + tomahawk ${tk}: loads as ${r.dribble} / ${r.tomahawk}; settings rows left: ${r.rows.join(', ') || 'none'}${errs.length ? '; ' + errs.join('; ') : ''}`);
      await ctx.close();
    }
    const errs = [], ctx = await newContext(browser, { seed: true }), p = await open(ctx, base + '/', errs, 'retired');
    const r = await p.evaluate(() => {
      const o = {};
      // taunts: places kept, retired ones not unlockable / pickable, a saved one falls back
      o.order = TAUNTS.map(t => t.id).join(',');
      o.rewards = REWARDS.filter(x => x.kind === 'taunt').map(x => x.id);
      const d = Profile.load(); d.equip = d.equip || {}; d.xp = 1e7; d.equip.taunt = 'sujood'; Profile.save();   // every level reached, a retired taunt equipped
      o.myTaunt = myTaunt();
      const rows = profileRows(), row = rows.find(x => x.label === 'Taunt'), seen = new Set();
      if (row) for (let i = 0; i < 14; i++) { row.step(1); seen.add(Profile.load().equip.taunt); }
      o.picker = [...seen];
      // a match: a retired taunt asked for (an old host / an online pick) becomes the default
      __seed(7); newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); M.phase = 'live'; const me = M.players.find(q => q.human === 0);
      M.taunt = { p: me, until: M.time + 3, why: 'score', used: false, deadOK: true }; ball.owner = M.players.find(q => q.team === 1); doTaunt(me, 'brush'); o.tauntRun = me.taunt && me.taunt.k;
      // venues
      o.menu = venueOptions().map(v => v.id).includes('gymL');
      const gl = VENUE_LIST.find(v => v.id === 'gymL'); o.gymLValid = !!gl;
      let away = 0; for (let i = 0; i < 400; i++) { const v = careerVenue(i % 2, 0, 'x', { name: 'Masjid Test ' + i, place: 'Town ' + i }); if (v.kind === 'gym' && v.size === 'L') away++; } o.awayL = away;
      newMatch(TEAMS[0], TEAMS[1], { humans: [], venue: makeVenue(gl) }); Game.screen = 'play'; render(ctx); o.gymLDraw = true;
      newMatch(TEAMS[0], TEAMS[1], { humans: [], venue: makeVenue(VENUE_LIST.find(v => v.id === 'home'), { host: 0 }) }); Game.screen = 'play';
      const texts = []; const ft = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { texts.push(String(t)); return ft.apply(this, arguments); };
      try { render(ctx); const c = document.createElement('canvas'); c.width = 400; c.height = 300; drawGymBack(c.getContext('2d'), 0, gymUp()); } finally { CanvasRenderingContext2D.prototype.fillText = ft; }
      o.whiteboard = texts.filter(t => /BOX OUT|Youth halaqa|Bake sale/.test(t));
      // every mode, CPU only, a few seconds each
      const modes = [];
      const sim = (name, n) => { for (let i = 0; i < n && M.phase !== 'over'; i++) { if (Game.screen === 'halftime') Game.screen = 'play'; updateMatch(STEP); } modes.push(name); };
      for (const fmt of [{ format: 'halves', len: 120 }, { format: 'quarters', len: 60 }, { format: 'first21', len: 120 }]) { newMatch(TEAMS[3], TEAMS[6], { humans: [], fmt }); Game.screen = 'play'; sim('2 on 2 ' + fmt.format, 60 * 40); }
      newMatch(TEAMS[1], TEAMS[2], { humans: [], fmt: { format: 'first21', len: 120 } }); M.halfCourt = true; M.mustClear = [false, false]; formation(0); inbound(0); sim('half court', 60 * 40);
      Game.threeNext = true; newMatch(TEAMS[2], TEAMS[5], { humans: [], fmt: { format: 'quarters', len: 30 } }); Game.threeNext = false; sim('3 on 3', 60 * 40);
      startKotc({ roster: ['saleem', 'nasser', 'khalil'], humans: {} }); sim('King of the Court', 60 * 40); KOTC.on = false;
      newMatch(TEAMS[4], TEAMS[7], { humans: [], venue: makeVenue(gl) }); sim('at the retired venue', 60 * 20);
      o.modes = modes.join(', ');
      return o;
    });
    await ctx.close();
    const kept = 'sky,dua,flex,wag,sujood,chest,brush,takbir,small,roof';
    push(r.order === kept, `taunt places unchanged (${r.order})`);
    push(!r.rewards.includes('sujood') && !r.rewards.includes('brush'), `retired taunts not unlockable (rewards: ${r.rewards.join(', ')})`);
    push(r.myTaunt === 'sky' && !r.picker.includes('sujood') && !r.picker.includes('brush'), `an equipped Sujood of thanks plays as ${r.myTaunt}; the picker offers ${r.picker.join(', ')}`);
    push(r.tauntRun === 'sky', `a retired taunt asked for in a match plays as ${r.tauntRun}`);
    push(!r.menu && r.gymLValid && r.gymLDraw && r.awayL === 0, `Community Center Gym: in the venue menu ${r.menu}; id still valid ${r.gymLValid} and draws; career away games there ${r.awayL} of 400`);
    push(!r.whiteboard.length, `Al-Amanah gym: whiteboard text drawn: ${r.whiteboard.join(', ') || 'none'}`);
    push(!errs.length, `CPU matches with zero page errors: ${r.modes}${errs.length ? ' | ' + errs.join('; ') : ''}`);
    // no code path calls react 'armsUp' / 'fist'
    const calls = [];
    for (const f of manifestFiles(ROOT)) { const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'); src.split('\n').forEach((l, i) => { if (/react\([^)]*'(armsUp|fist)'/.test(l)) calls.push(f + ':' + (i + 1)); }); }
    push(!calls.length, `react 'armsUp' / 'fist' calls: ${calls.join(', ') || 'none'}`);
    return { ok: !bad.length, detail };
  };
  return T;
}
