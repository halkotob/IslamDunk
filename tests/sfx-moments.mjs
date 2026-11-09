// v9.17.5 a sound for every moment (tests/run.mjs registers them):
//   sfx-moments   each new sound fires exactly once per occurrence, from the game's own code paths: the shot clock's
//                 last 3 s (3 ticks, rising), a hot spot appearing, free throws (a step, then a tap per attempt), the
//                 crowd on a block / turnover / bad miss when nobody is drawn (and not when people are: never both),
//                 Lightning's catch, the halftime, win and loss stingers, the summary's lines, the trivia timer's
//                 last 5 s, Back (Esc and the corner button), Yes / No, a toast, the calendar's new month and holiday
//   sfx-calls     every SFX.<name> the game's source uses exists (the guard that would have caught SFX.catch)
//   sfx-crowd     the crowd reaction by venue: the practice gym silent, the home gym quiet, an arena loud, in that order
//   sfx-quiet     Settings > Sound off: nothing is heard; Sound style D (Soft) plays every new sound
//   rb-sounds     online: in a rollback match both phones play the same match sounds on the same frames (at most one
//                 differing in a run: a frame one phone guessed wrong and replayed silently); a snapshot
//                 guest hears the shot clock ticks and the hot spot (full tier, run alone)
// and no page errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NEW = ['shotTick', 'ftStep', 'ftAttempt', 'hotSpot', 'crowdTurnover', 'crowdBlock', 'crowdBadMiss', 'catch', 'halftimeStinger', 'winStinger', 'lossStinger', 'earnTick', 'triviaLow', 'uiBack', 'uiConfirm', 'toast', 'calChime'];
// count every play of the new sounds (the dispatcher's own calls), with its argument
const COUNT = ids => { window.__snd = []; for (const id of ids) { const f = SFX[id]; SFX[id] = function () { window.__snd.push([id, arguments[0]]); return f.apply(this, arguments); }; } };
export function sfxMomentsTests({ newContext, open }) {
  const T = {};
  const page = async browser => { const errs = [], ctx = await newContext(browser); const p = await open(ctx, process.env.__base + '/?nowelcome=1', errs, 'page'); return { ctx, p, errs }; };
  T['sfx-moments'] = async ({ browser, base }) => {
    process.env.__base = base;
    const { ctx, p, errs } = await page(browser);
    await p.evaluate(COUNT, NEW);
    const r = await p.evaluate(async () => {
      const out = {}, take = () => { const s = window.__snd; window.__snd = []; return s; };
      const freeze = () => { M.cmdHook = q => { zeroCmd(q.cmd); return true; }; };
      // the shot clock: someone holds the ball, 3.5 s left
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); M.introT = 0; M.phase = 'live'; Game.screen = 'play'; freeze();
      const h = M.teams[0].players[0]; giveBall(h, 'test'); M.possTeam = 0; M.hotCd = 99; take();
      M.shotClock = 3.5; for (let i = 0; i < 60 * 3.3; i++) updateMatch(STEP);
      out.shot = take().filter(x => x[0] === 'shotTick').map(x => x[1]);
      // a hot spot appears once
      M.hot = null; M.hotCd = 0.001; M.shotClock = 14; giveBall(h, 'test'); M.possTeam = 0; for (let i = 0; i < 90; i++) updateMatch(STEP);
      out.hot = take().filter(x => x[0] === 'hotSpot').length;
      // free throws: a foul on a shooter, then the CPU shoots both (the human's shooter is the CPU's here)
      M.hot = null; M.hotCd = 99; M.cmdHook = null;
      const sh = M.teams[1].players[0], df = M.teams[0].players[1]; giveBall(sh, 'test'); M.possTeam = 1; addFoul(df); foulShots(df, sh, 2, 'FOUL!', 'ON ' + df.def.name.toUpperCase());   // (v9.17.10: callFoul went with the shove)
      for (let i = 0; i < 60 * 12 && (M.ft || M.phase === 'ft'); i++) updateMatch(STEP);
      const fts = take(); out.ft = { step: fts.filter(x => x[0] === 'ftStep').length, attempt: fts.filter(x => x[0] === 'ftAttempt').length };
      // the crowd with nobody drawn, then with people drawn (they react themselves)
      CrowdA.force = { n: 0 }; blockFeel(); addTov(h); crowdGroan(0.9);
      out.crowd0 = take().map(x => x[0]).filter(x => /^crowd/.test(x));
      CrowdA.force = { n: 6 }; blockFeel(); addTov(h); crowdGroan(0.9);
      out.crowd6 = take().map(x => x[0]).filter(x => /^crowd/.test(x)); CrowdA.force = null;
      // Lightning: the fed balls
      MiniMenu.kind = 'lightning'; startQuickMini(); M.players.forEach(q => { q.human = -1; }); let lg = [];   // (everyone CPU: a human with no input first in line would stall it)
      for (let i = 0; i < 60 * 20 && !lg.some(x => x[0] === 'catch'); i++) { updateMatch(STEP); lg = lg.concat(take()); }   // (until a fed ball is caught)
      out.catchN = lg.filter(x => x[0] === 'catch').length;
      // the halftime and final screens (opened from inside a frame, as the game does)
      const viaFrame = f => { const _u = updateMatch; updateMatch = function () { updateMatch = _u; const r = _u.apply(this, arguments); f(); return r; }; gameUpdate(STEP); };
      newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); M.introT = 0; M.phase = 'live'; Game.screen = 'play'; Game.paused = false; take();
      viaFrame(() => { Game.screen = 'halftime'; }); out.half = take().filter(x => x[0] === 'halftimeStinger').length;
      Game.screen = 'play'; M.teams[0].score = 20; M.teams[1].score = 10; M.winner = 0; take();
      viaFrame(() => { Game.screen = 'final'; }); await new Promise(r => setTimeout(r, 700)); out.win = take().map(x => x[0]).filter(x => /Stinger/.test(x));
      Game.screen = 'play'; M.winner = 1; viaFrame(() => { Game.screen = 'final'; }); await new Promise(r => setTimeout(r, 700)); out.loss = take().map(x => x[0]).filter(x => /Stinger/.test(x));
      // the career summary: one tick a line
      C = freshCareer(); Game.post = { won: true, res: 'win', us: 21, them: 12, opp: TEAMS[1], roundName: 'Round 1', stage: { name: 'Local' }, rw: { bp: [['Win', 5], ['Points', 3], ['Defense', 2]], hb: [['Win', 10], ['Hustle', 4]], bpTotal: 10, hbTotal: 14 } };
      Game.screen = 'postgame'; take(); const t0 = Game.t; for (let i = 0; i < 90; i++) { Game.t = t0 + i / 60; drawPostgame(ctx); }
      out.earn = take().filter(x => x[0] === 'earnTick').length;
      // trivia: from 7 s to 0
      Game.screen = 'play'; openTrivia(M.teams[0].players[0]); const tv = Game.trivia; tv.t = 7; take();
      for (let i = 0; i < 60 * 7 && !tv.done; i++) triviaUpdate(1 / 60);
      out.trivia = take().filter(x => x[0] === 'triviaLow').length; Game.trivia = null;
      // Yes / No; a toast
      askConfirm({ text: 'Sure?', yes: ['Yes', () => {}], no: ['No', () => {}] }); confirmPick(1); out.confirm = take().filter(x => x[0] === 'uiConfirm').length;
      toast('Saved.'); out.toast = take().filter(x => x[0] === 'toast').length;
      // the calendar: a new day (nothing), a new month (a chime), Eid al-Adha's day (a chime)
      C = freshCareer(); calInit(); take();
      const d0 = C.cal.d, t = calDate(d0), nextMonth = calDayOf(t.y, t.m + 1, 1), adha = calDayOf(t.y, 11, 10);
      calSetDay(d0 + 1); const a = take().length;
      calSetDay(nextMonth); const b = take().filter(x => x[0] === 'calChime').length;
      calSetDay(adha - 1); take(); calSetDay(adha); const c = take().filter(x => x[0] === 'calChime').length;
      out.cal = [a, b, c];
      C = null; return out;
    });
    // Back: Esc out of a menu, and the corner button
    await p.evaluate(() => { goTitle(); Game.screen = 'cmenu'; Game.idx = 0; window.__snd = []; });
    await sleep(200); await p.keyboard.press('Escape'); await sleep(300);
    const esc = await p.evaluate(() => ({ screen: Game.screen, n: window.__snd.filter(x => x[0] === 'uiBack').length }));
    await p.evaluate(() => { Game.screen = 'profile'; Game.idx = 0; window.__snd = []; }); await sleep(300);
    await p.mouse.click(40, 24); await sleep(300);
    const btn = await p.evaluate(() => ({ screen: Game.screen, n: window.__snd.filter(x => x[0] === 'uiBack').length }));
    await ctx.close();
    const ok = JSON.stringify(r.shot) === '[3,2,1]' && r.hot === 1 && r.ft.step === 1 && r.ft.attempt === 2
      && r.crowd0.sort().join() === 'crowdBadMiss,crowdBlock,crowdTurnover' && r.crowd6.length === 0 && r.catchN >= 1
      && r.half === 1 && r.win.join() === 'winStinger' && r.loss.join() === 'lossStinger' && r.earn === 5 && r.trivia === 5
      && r.confirm === 1 && r.toast === 1 && r.cal.join() === '0,1,1' && esc.screen === 'title' && esc.n === 1 && btn.screen !== 'profile' && btn.n === 1 && !errs.length;
    return { ok, detail: [JSON.stringify(r), `Esc from the Career menu: ${JSON.stringify(esc)}; the corner Back on Profile: ${JSON.stringify(btn)}`, ...errs] };
  };
  T['sfx-calls'] = async ({ browser, base }) => {
    process.env.__base = base;
    const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifest.json'), 'utf8')), files = Array.isArray(L) ? L : Object.values(L).find(Array.isArray);
    const used = new Map();
    for (const f of files) { const s = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'); for (const m of s.matchAll(/\bSFX\.([A-Za-z_$][\w$]*)\s*\(/g)) if (!used.has(m[1])) used.set(m[1], f); }
    const { ctx, p, errs } = await page(browser);
    const missing = await p.evaluate(names => names.filter(n => typeof SFX[n] !== 'function'), [...used.keys()]);
    await ctx.close();
    return { ok: !missing.length && used.has('catch') && !errs.length, detail: [`${used.size} SFX functions called in src/, ${missing.length} missing${missing.length ? ': ' + missing.map(n => n + ' (' + used.get(n) + ')').join(', ') : ''}`, ...errs] };
  };
  T['sfx-crowd'] = async ({ browser, base }) => {
    process.env.__base = base;
    const { ctx, p, errs } = await page(browser);
    const r = await p.evaluate(async () => {
      // the crowd level each place sets, then the block reaction rendered offline at that level (A and D)
      const lvl = {};
      C = freshCareer(); setupPractice('free'); lvl.practice = SFX.crowdLevel; C = null;
      for (const [k, v] of [['home', VENUE_LIST.find(x => x.id === 'home')], ['small', VENUE_LIST.find(x => x.id === 'gymS')], ['arena', VENUE_LIST.find(x => x.kind === 'arena' && x.tier === 'intl') || { kind: 'arena', tier: 'intl' }]]) { newMatch(TEAMS[0], TEAMS[1], { humans: [], venue: v }); lvl[k] = SFX.crowdLevel; }
      const keep = {}; for (const k of ['ctx', 'out', 'noise', 'crowdLevel', 'roomSend']) keep[k] = SFX[k];
      const render = async (L, key) => {
        const sr = 32000, c = new OfflineAudioContext(1, sr * 2, sr), nb = c.createBuffer(1, sr * 2, sr), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        Object.assign(SFX, { ctx: c, out: c.destination, noise: nb, crowdLevel: L, roomSend: null });
        SFX.play('crowdBlock', key, []); const buf = await c.startRendering(), x = buf.getChannelData(0); let e = 0; for (let i = 0; i < x.length; i++) e += x[i] * x[i];
        return e > 0 ? Math.round(10 * Math.log10(e / x.length) * 10) / 10 : -Infinity;
      };
      const db = {}; try { for (const k of Object.keys(lvl)) db[k] = [await render(lvl[k], 'A'), await render(lvl[k], 'D')]; } finally { Object.assign(SFX, keep); }
      return { lvl, db };
    });
    await ctx.close();
    const { lvl, db } = r, A = k => db[k][0], D = k => db[k][1];
    const ok = lvl.practice === 0 && A('practice') === null && D('practice') === null || (lvl.practice === 0 && !isFinite(A('practice')) && !isFinite(D('practice')))
      ? lvl.home > 0 && A('home') < A('arena') && D('home') < D('arena') && A('small') <= A('arena') && !errs.length : false;
    return { ok, detail: [`crowd level: ${JSON.stringify(lvl)}`, `block reaction, A / D (dB): ${JSON.stringify(db)}`, ...errs] };
  };
  T['sfx-quiet'] = async ({ browser, base }) => {
    process.env.__base = base;
    const { ctx, p, errs } = await page(browser);
    const r = await p.evaluate(async ids => {
      // render every new sound through the game's own master gain, with Sound on and off
      const keep = {}; for (const k of ['ctx', 'out', 'noise', 'crowdLevel', 'roomSend', 'style']) keep[k] = SFX[k];
      const run = async (on, style) => {
        const sr = 32000, c = new OfflineAudioContext(1, sr * 3, sr), nb = c.createBuffer(1, sr * 2, sr), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const master = c.createGain(); master.connect(c.destination);
        Object.assign(SFX, { ctx: c, out: master, noise: nb, crowdLevel: 1, roomSend: null, style });
        SETTINGS.sound = on; SFX.setOn(on);                              // (what Settings > Sound does)
        const errs = [], peaks = {};
        for (const id of ids) { try { SFX[id](); } catch (e) { errs.push(id + ': ' + e.message); } }
        const buf = await c.startRendering(), x = buf.getChannelData(0); let pk = 0; for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
        return { peak: pk, errs, picked: ids.filter(id => SFX.variantOf(id) !== style) };
      };
      try { return { on: await run(true, 'A'), off: await run(false, 'A'), soft: await run(true, 'D') }; } finally { Object.assign(SFX, keep); SETTINGS.sound = true; }
    }, NEW);
    await ctx.close();
    const ok = r.on.peak > 0.001 && r.off.peak === 0 && r.soft.peak > 0.001 && !r.soft.picked.length && !r.on.errs.length && !r.soft.errs.length && !errs.length;
    return { ok, detail: [`all ${NEW.length} new sounds at once: Sound on peak ${r.on.peak.toFixed(3)}, Sound off peak ${r.off.peak}; style D: peak ${r.soft.peak.toFixed(3)}, every one played its D (${r.soft.picked.length ? 'not: ' + r.soft.picked.join(', ') : 'yes'})`, ...r.on.errs, ...r.soft.errs, ...errs] };
  };
  // ---- online
  const MASH = seed => { let s = seed; const R = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; };
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL'];
    window.__mash = setInterval(() => { for (const k of keys) { const mv = /Key[WASD]/.test(k), on = !!Input.down[k]; if (on ? R() < (mv ? 0.04 : 0.3) : R() < (mv ? 0.03 : 0.02)) { if (on) { Input.down[k] = false; Input.released[k] = true; } else { Input.down[k] = true; Input.pressed[k] = true; } } } }, 16); };
  async function pair(browser, base, q, setup, init) {
    const errs = [], ctx = await newContext(browser, { rb: true });
    const H = await open(ctx, base + '/' + q, errs, 'host'), G = await open(ctx, base + '/' + q, errs, 'guest');
    if (init) { await H.evaluate(init, 'host'); await G.evaluate(init, 'guest'); }
    const code = await H.evaluate(() => { Lobby.open(); return Net.code; });
    await G.evaluate(c => Lobby.join(c), code);
    await G.waitForFunction(() => Game.screen === 'lobby', null, { timeout: 15000 }).catch(() => {});
    await H.evaluate(S => { const o = Lobby.opts(); Object.assign(o, S); Net.mode = S.game; Lobby.changed(); }, setup);
    await G.evaluate(() => Lobby.setReady(1)); await sleep(900);
    await H.waitForFunction(() => Lobby.canStart(), null, { timeout: 20000 }).catch(() => {}); await H.evaluate(() => Lobby.start());
    await G.waitForFunction(() => Game.screen === 'play', null, { timeout: 15000 }).catch(() => {});
    return { ctx, H, G, errs };
  }
  // every match sound (old and new) a phone plays, by match frame, never in a replayed frame
  const LOG = who => {
    window.__ms = []; const MATCH = ['shotTick', 'ftStep', 'ftAttempt', 'hotSpot', 'crowdTurnover', 'crowdBlock', 'crowdBadMiss', 'swish', 'clank', 'slam', 'board', 'whistle', 'buzzer', 'block', 'snatch'];
    for (const id of MATCH) { const f = SFX[id]; SFX[id] = function () { if (typeof RB !== 'undefined' && RB.sim && !RB.resim && RB.frame != null) window.__ms.push(RB.frame + ':' + id); return f.apply(this, arguments); }; }
    // the same moments on both phones: the shot clock run down to 3.5 s and a hot spot called, in the match, on set frames
    if (typeof rbStep === 'function') { const _s = rbStep; rbStep = function () { const f = RB.frame; if (f === 240 || f === 480 || f === 720 || f === 960) { M.shotClock = 3.5; } if (f === 300) M.hotCd = 0.001; return _s.apply(this, arguments); }; }
    void who;
  };
  T['rb-sounds'] = async ({ browser, base }) => {
    // rollback
    const P = await pair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&room=rbsnd&nowelcome=1', { game: 'vs', court: 'full', format: 'quarters', len: 120 }, LOG);
    await P.H.evaluate(MASH, 31); await P.G.evaluate(MASH, 47);
    await Promise.all([P.H, P.G].map(p => p.waitForFunction(() => RBN.conf >= 1000, null, { timeout: 60000 }).catch(() => {})));
    await sleep(1500);
    const [h, g] = await Promise.all([P.H, P.G].map(p => p.evaluate(() => { clearInterval(window.__mash); return { on: RBN.on, conf: RBN.conf, ms: window.__ms, desyncs: (RBN.stats && RBN.stats.desyncs) || 0 }; })));
    await P.ctx.close();
    const upto = Math.min(h.conf, g.conf) - 10, cut = L => L.filter(x => +x.split(':')[0] <= upto);
    const hs = cut(h.ms), gs = cut(g.ms), same = hs.join() === gs.join();
    // (a phone plays a match sound the first time it plays a frame; a frame it guessed wrong, then replayed in silence,
    // can leave one sound on one phone only: as for every match sound since 9.15. At most one such a run.)
    const diff = [...hs.filter(x => !gs.includes(x)).map(x => 'host only ' + x), ...gs.filter(x => !hs.includes(x)).map(x => 'guest only ' + x)];
    const ticks = hs.filter(x => x.endsWith(':shotTick')).length, hot = hs.filter(x => x.endsWith(':hotSpot')).length;
    // snapshot mode: the guest hears the host's hot spot and its own shot clock ticks
    const Q = await pair(browser, base, '?net=loop&mode=udp&lat=30&jit=5&p2p=0&rb=0&room=snpsnd&nowelcome=1', { game: 'vs', court: 'full', format: 'quarters', len: 120 },
      // (logged where every sound goes through, SFX.play: the guest replays the host's sounds through the functions it saved at load)
      () => { window.__gs = []; const f = SFX.play; SFX.play = function (id) { if (id === 'shotTick' || id === 'hotSpot') window.__gs.push(id); return f.apply(this, arguments); }; });
    await sleep(2500);
    const snap = await Q.H.evaluate(() => ({ rb: typeof RBN !== 'undefined' && RBN.on, role: Net.role }));
    await Q.H.evaluate(() => { const o = M.teams[0].players[0]; giveBall(o, 'test'); M.possTeam = 0; M.shotClock = 3.6; M.hot = null; M.hotCd = 0.001; });
    await sleep(4500);
    const gsn = await Q.G.evaluate(() => ({ role: Net.role, heard: window.__gs, screen: Game.screen, phase: M.phase, sc: M.shotClock, fmt: M.fmt && M.fmt.sc, hot: !!M.hot }));
    const hst = await Q.H.evaluate(() => ({ screen: Game.screen, phase: M.phase, sc: M.shotClock, hot: !!M.hot, online: M.online }));
    await Q.ctx.close();
    const gTicks = gsn.heard.filter(x => x === 'shotTick').length, gHot = gsn.heard.filter(x => x === 'hotSpot').length;
    const ok = h.on && g.on && upto > 900 && diff.length <= 1 && ticks >= 1 && hot >= 1 && !snap.rb && gsn.role === 'guest' && gTicks >= 3 && gHot >= 1 && !P.errs.length && !Q.errs.length;
    return { ok, detail: [`rollback: ${hs.length} match sounds on the host and ${gs.length} on the guest up to frame ${upto}, the same frames: ${same ? 'all' : diff.join(', ')}; shot clock ticks ${ticks}, hot spots ${hot}; desyncs ${h.desyncs}/${g.desyncs}`,
      same ? '' : `host: ${hs.slice(0, 30).join(' ')}\nguest: ${gs.slice(0, 30).join(' ')}`,
      `snapshot mode (${snap.rb ? 'rollback!' : 'snapshots'}): the guest heard ${gTicks} shot clock ticks and ${gHot} hot spot(s); host ${JSON.stringify(hst)}, guest ${JSON.stringify(gsn)}`, ...P.errs, ...Q.errs].filter(Boolean) };
  };
  return T;
}
