// v9.13 sound tests. Registered into tests/run.mjs. Nobody can hear here: these check what can be measured.
//   sfx-variants    every sound has A Current, B Real, C Arcade, D Soft; each renders offline (OfflineAudioContext) without
//                   errors; through its level (SFX_LEVELS) each variant is within 1.5 dB of A (K-weighted, the loudest 200 ms,
//                   seeds the levels were not made from); nothing clips; bounce, squeak, swish, clank, thud and swipe pick
//                   sub-variants with no immediate repeat; every variant plays on a live AudioContext in Chromium, and in
//                   WebKit when Playwright's WebKit is installed (the detail says when it isn't); Settings > Sound style
//                   and the per-sound picks choose the variant; a recorded sample slots in as another variant
//   crowd-tiers     the tier thresholds; every crowd venue in the Review Studio: audience drawn -> tier (a table, checked
//                   against the expected tiers below); tiers 0 and 1 have no bed (gain 0); tier 0 makes no crowd sound at
//                   all; every reaction (make, dunk, buzzer, miss, block, turnover) never has more clappers or voices than
//                   people drawn; the room follows the venue (none outdoors) and Room echo off removes it
//   sound-list      docs/audio/sound-list.csv is up to date; every sound the game calls exists, except the ones listed
//                   as missing (SFX.catch)
//   studio-coverage every Game.screen, overlay and Game./World. state object in the source has a Studio setup or a reason
//                   it can't (src/review-studio/coverage.js, screens.js), and every screen has its metadata (flow, purpose,
//                   how it's reached, taps, version)
import fs from 'node:fs';
import path from 'node:path';
import { webkit } from 'playwright';
import { SFX_MEASURE_INIT } from './sfx-measure.js';
import { openStudio } from '../tools/studio-run.mjs';
import { soundListCsv, soundCalls, NO_SOUND } from '../tools/sound-list.mjs';
import { manifestFiles } from '../tools/review-text.mjs';
import { OVERLAYS, NOT_VIEWS } from '../src/review-studio/coverage.js';
import { STUDIO_SCREENS, SCREEN_OF, NOT_RENDERABLE } from '../src/review-studio/screens.js';
import { META, NA_META, FLOWS } from '../src/review-studio/screen-meta.js';
import { SCREENS } from './phone-audit.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TOL_DB = 1.5;
// the expected tier at each Review Studio crowd venue (audience drawn -> tier: 0 nobody, 1 up to 12, 2 up to 45, 3 up to 160, 4 more)
export const EXPECT_TIERS = {
  practice: 0, 'home-10': 1, 'home-22': 2, 'gymS-12': 1, 'gymS-22': 2, 'gymM-25': 2, 'gymM-80': 3, 'gymL-140': 3, 'outdoor-24': 2,
  classic: 4, 'regional-early': 4, 'arena-regional': 4, 'arena-college': 4, 'arena-intl': 4, 'arena-grand': 4
};
// play every variant of every sound on a live AudioContext (no speakers needed: the context just runs)
const PLAY_ALL = async () => {
  SETTINGS.sound = true; SFX.init(); SFX.setOn && SFX.setOn(true);
  const errs = [], args = { bounce: [1], clank: [1], netSwish: [0.8], rimTick: [0.6], cheer: [1], snatch: [1], swish: [1] };
  let n = 0;
  for (const id of SFX_IDS) for (const k of Object.keys(SFX_VARIANTS[id])) { SFX.force = { [id]: k }; try { SFX[id].apply(SFX, args[id] || []); n++; } catch (e) { errs.push(id + ' ' + k + ': ' + (e && e.message || e)); } SFX.force = null; }
  await new Promise(r => setTimeout(r, 300));
  return { n, errs, ctx: !!SFX.ctx, state: SFX.ctx && SFX.ctx.state };
};

export function audioTests({ newContext, open }) {
  const T = {};
  T['sfx-variants'] = async ({ browser, base }) => {
    const detail = [], bad = [];
    const pe = [], ctx = await newContext(browser), p = await open(ctx, base + '/', pe, 'sfx');
    const shape = await p.evaluate(() => {
      const o = { ids: SFX_IDS.length, missing: [], noLevel: [], subs: {}, style: {}, pick: '', sample: false, noRepeat: [] };
      for (const id of SFX_IDS) { for (const k of ['A', 'B', 'C', 'D']) { const v = SFX_VARIANTS[id] && SFX_VARIANTS[id][k]; if (!v || typeof v.fn !== 'function' || !v.label) o.missing.push(id + ' ' + k); else if (k !== 'A' && !(SFX_LEVELS[id] && typeof SFX_LEVELS[id][k] === 'number')) o.noLevel.push(id + ' ' + k); } if (typeof SFX[id] !== 'function') o.missing.push('SFX.' + id); }
      // the style setting and per-sound picks choose the variant (default: Current)
      o.style.def = SFX.variantOf('bounce');
      for (const k of ['B', 'C', 'D', 'A']) { SFX.style = k; o.style[k] = SFX.variantOf('bounce'); }
      SFX.picks.clank = 'D'; o.pick = SFX.variantOf('clank') + '/' + SFX.variantOf('bounce'); delete SFX.picks.clank;
      // a recorded sample slots in as one more variant, and can be picked
      o.sample = sfxAddSamples('bounce', 'E', 'Recorded (test)', ['nothing.ogg']) && SFX_VARIANTS.bounce.E.samples.length === 1;
      SFX.picks.bounce = 'E'; o.sample = o.sample && SFX.variantOf('bounce') === 'E'; delete SFX.picks.bounce; delete SFX_VARIANTS.bounce.E;
      return o;
    });
    if (shape.ids !== 23) bad.push(`${shape.ids} sound IDs (want 23)`);
    if (shape.missing.length) bad.push('missing: ' + shape.missing.join(', '));
    if (shape.noLevel.length) bad.push('no level: ' + shape.noLevel.join(', '));
    const styleOk = shape.style.def === 'A' && shape.style.B === 'B' && shape.style.C === 'C' && shape.style.D === 'D' && shape.style.A === 'A';
    if (!styleOk) bad.push('Sound style does not choose the variant: ' + JSON.stringify(shape.style));
    if (shape.pick !== 'D/A') bad.push('a per-sound pick does not override the style: ' + shape.pick);
    if (!shape.sample) bad.push('sfxAddSamples did not add a recorded variant');
    detail.push(`${shape.ids} sounds x A-D; Sound style default ${shape.style.def}, B/C/D/A -> ${shape.style.B}/${shape.style.C}/${shape.style.D}/${shape.style.A}; a pick overrides it (${shape.pick}); recorded samples slot in: ${shape.sample}`);
    // loudness, offline, at seeds the levels were not made from
    await p.evaluate(SFX_MEASURE_INIT);
    const m = await p.evaluate(() => window.SFX_MEASURE(SFX_IDS, ['A', 'B', 'C', 'D'], [301, 302, 303, 304, 305, 306], true));
    let worst = { d: 0 }, peak = 0; const errs = [], off = [];
    for (const id in m) for (const k of ['A', 'B', 'C', 'D']) {
      const v = m[id][k]; peak = Math.max(peak, v.peak); for (const e of v.errors) errs.push(id + ' ' + k + ': ' + e);
      if (!isFinite(v.db) || v.db < -60) off.push(`${id} ${k}: silent (${v.db.toFixed(1)} dB)`);
      if (k === 'A') continue; const d = v.db - m[id].A.db;
      if (Math.abs(d) > Math.abs(worst.d)) worst = { d, id, k };
      if (Math.abs(d) > TOL_DB) off.push(`${id} ${k}: ${d >= 0 ? '+' : ''}${d.toFixed(2)} dB from A`);
    }
    detail.push(`level-matched: worst ${worst.id} ${worst.k} ${worst.d >= 0 ? '+' : ''}${worst.d.toFixed(2)} dB from A (tolerance ±${TOL_DB} dB, 6 seeds); loudest sample peak ${peak.toFixed(2)} (K-weighted)`);
    if (off.length) bad.push(...off);
    if (errs.length) bad.push(...errs.slice(0, 20));
    if (peak > 1.5) bad.push('clips: peak ' + peak.toFixed(2));
    // sub-variants: never the same one twice in a row
    const rep = await p.evaluate(async () => {
      const out = {}, IDS = { bounce: ['B', 'C', 'D'], squeak: ['B', 'C', 'D'], netSwish: ['B', 'C', 'D'], clank: ['B', 'C', 'D'], thud: ['B', 'C', 'D'], swipe: ['B', 'C', 'D'] };
      const keep = { ctx: SFX.ctx, out: SFX.out, noise: SFX.noise, roomSend: SFX.roomSend };
      const c = new OfflineAudioContext(1, 3200, 32000), nb = c.createBuffer(1, 3200, 32000);
      Object.assign(SFX, { ctx: c, out: c.destination, noise: nb, roomSend: null });
      try {
        for (const id in IDS) for (const k of IDS[id]) {
          const seen = []; let repeats = 0;
          for (let i = 0; i < 40; i++) { const before = JSON.stringify(SFX.subLast); SFX.play(id, k, []); const after = SFX.subLast; const changed = Object.keys(after).find(x => JSON.stringify(after[x]) !== JSON.stringify(JSON.parse(before)[x]) || !(x in JSON.parse(before)));
            const key = Object.keys(after).find(x => x.toLowerCase().startsWith(id.replace('netSwish', 'net').toLowerCase()) && x.endsWith(k)); if (!key) continue; seen.push(after[key]); if (i && !changed) repeats++; }
          out[id + ' ' + k] = { kinds: new Set(seen).size, repeats, n: seen.length };
        }
      } finally { Object.assign(SFX, keep); }
      // and the picker itself
      let same = 0, prev = -1; for (let i = 0; i < 500; i++) { const x = SFX.subPick('test', 3); if (x === prev) same++; prev = x; }
      out.picker = { kinds: 3, repeats: same, n: 500 };
      return out;
    });
    const repBad = Object.entries(rep).filter(([, v]) => v.repeats || v.kinds < 2 || !v.n);
    detail.push(`sub-variants: ${Object.keys(rep).length - 1} (sound, variant) pairs, 40 plays each: ${repBad.length ? repBad.map(([k, v]) => `${k} ${v.kinds} kinds, ${v.repeats} repeats`).join(', ') : 'no immediate repeat, 2-3 kinds each'}`);
    if (repBad.length) bad.push('sub-variants: ' + repBad.map(([k]) => k).join(', '));
    // a live AudioContext, Chromium
    const live = await p.evaluate(PLAY_ALL);
    detail.push(`Chromium, live AudioContext (${live.state}): ${live.n} variants played, ${live.errs.length} errors`);
    if (live.errs.length || live.n < 92) bad.push(...live.errs.slice(0, 10), live.n < 92 ? `only ${live.n} played` : '');
    await ctx.close();
    // WebKit, when installed
    let wk = null; try { wk = await webkit.launch(); } catch (e) { detail.push('WebKit: not installed here (Playwright could not launch it: ' + String(e.message || e).split('\n')[0].slice(0, 120) + '); Chromium only'); }
    if (wk) {
      const c2 = await wk.newContext({ viewport: { width: 1280, height: 720 } }), p2 = await c2.newPage(), we = [];
      p2.on('pageerror', e => we.push(e.message));
      await p2.goto(base + '/'); await p2.waitForFunction(() => typeof SFX_VARIANTS !== 'undefined', null, { timeout: 30000 });
      const r2 = await p2.evaluate(PLAY_ALL);
      detail.push(`WebKit, live AudioContext (${r2.state}): ${r2.n} variants played, ${r2.errs.length + we.length} errors`);
      if (r2.errs.length || we.length || r2.n < 92) bad.push(...r2.errs.slice(0, 10).map(e => 'WebKit ' + e), ...we.map(e => 'WebKit pageerror ' + e));
      await wk.close();
    }
    return { ok: !bad.filter(Boolean).length && !pe.length, detail: [...detail, ...bad.filter(Boolean), ...pe] };
  };

  T['crowd-tiers'] = async ({ browser }) => {
    const st = await openStudio(browser, path.join(ROOT, 'dist/review')), p = st.page, bad = [], detail = [];
    const r = await p.evaluate(async EXPECT => {
      const G = window.__studio.S.G, rs = G.rs, W = { get SETTINGS() { return G.win.eval('SETTINGS'); }, get CrowdA() { return G.win.eval('CrowdA'); }, get SFX() { return G.win.eval('SFX'); }, get M() { return G.win.eval('M'); }, crowdTierOf: n => G.win.eval('crowdTierOf')(n) };
      rs.audioWith(new (window.AudioContext || window.webkitAudioContext)());
      const thr = [0, 1, 12, 13, 45, 46, 160, 161, 2000].map(n => n + '->' + W.crowdTierOf(n)).join(' ');
      const rows = [];
      for (const { key, name } of rs.crowdPresets()) {
        W.SETTINGS.room = true;
        const info = rs.crowdSetup(key); W.CrowdA.stats.over = 0;
        const reacts = {};
        for (const k of ['make', 'dunk', 'buzzer', 'miss', 'block', 'turnover']) { const x = rs.crowdTrigger(k); reacts[k] = [x.stats.lastClap, x.stats.lastVoice]; }
        const big = W.SFX.crowd('big', 2), app = W.SFX.crowd('applause', 1.5);
        const roomOn = W.CrowdA.room, sendOn = !!W.SFX.roomSend;
        W.SETTINGS.room = false; W.CrowdA.tick(true); const sendOff = !!W.SFX.roomSend; W.SETTINGS.room = true; W.CrowdA.tick(true);
        rows.push({ key, name, audience: info.audience, tier: info.tier, expect: EXPECT[key], tierOf: W.crowdTierOf(info.audience), bed: info.levels.bed, murmur: info.levels.murmur, room: roomOn, sendOn, sendOff, venueKind: W.M.venue ? W.M.venue.kind : '', over: W.CrowdA.stats.over || 0, maxClap: Math.max(big.clap, app.clap, ...Object.values(reacts).map(v => v[0])), maxVoice: Math.max(big.voice, app.voice, ...Object.values(reacts).map(v => v[1])) });
      }
      rs.crowdOff();
      return { thr, rows };
    }, EXPECT_TIERS);
    const wantThr = '0->0 1->1 12->1 13->2 45->2 46->3 160->3 161->4 2000->4';
    if (r.thr !== wantThr) bad.push('tier thresholds: ' + r.thr);
    detail.push('thresholds (people drawn -> tier): ' + r.thr);
    detail.push('venue | audience drawn | tier | bed | murmur | room | most clapping / voices at once');
    for (const x of r.rows) {
      detail.push(`${x.name} | ${x.audience} | ${x.tier} | ${x.bed.toFixed(3)} | ${x.murmur.toFixed(4)} | ${x.room}${x.sendOn ? '' : ' (no send)'} | ${x.maxClap} / ${x.maxVoice}`);
      if (x.expect === undefined) bad.push(`${x.key}: no expected tier in tests/audio.mjs EXPECT_TIERS`);
      else if (x.tier !== x.expect) bad.push(`${x.key}: tier ${x.tier}, expected ${x.expect} (${x.audience} drawn)`);
      if (x.tier !== x.tierOf) bad.push(`${x.key}: tier ${x.tier} but ${x.audience} people is tier ${x.tierOf}`);
      if (x.tier <= 1 && x.bed !== 0) bad.push(`${x.key}: tier ${x.tier} has a bed (${x.bed})`);
      if (x.tier === 0 && (x.murmur || x.maxClap || x.maxVoice)) bad.push(`${x.key}: nobody drawn but crowd sound (${x.maxClap} claps, ${x.maxVoice} voices, murmur ${x.murmur})`);
      if (x.over || x.maxClap > x.audience || x.maxVoice > x.audience) bad.push(`${x.key}: more clapping/voices than people drawn (${x.maxClap}/${x.maxVoice} of ${x.audience}, ${x.over} times)`);
      if (x.venueKind === 'outdoor' && x.room !== 'none') bad.push(`${x.key}: outdoors with room ${x.room}`);
      if (x.room !== 'none' && !x.sendOn) bad.push(`${x.key}: room ${x.room} but no room send`);
      if (x.sendOff) bad.push(`${x.key}: Room echo off still sends to the room`);
    }
    const gameErr = await p.evaluate(() => window.__studio.gameErrors());
    await st.close();
    return { ok: !bad.length && !st.errors.length && !gameErr.length && r.rows.length >= 14, detail: [...detail, ...bad, ...st.errors, ...gameErr] };
  };

  T['sound-list'] = async () => {
    const bad = [], f = path.join(ROOT, 'docs/audio/sound-list.csv');
    const want = soundListCsv(ROOT), have = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    if (want !== have) bad.push('docs/audio/sound-list.csv is out of date: run node tools/sound-list.mjs');
    const calls = soundCalls(ROOT), src = manifestFiles(ROOT).filter(x => /sfx-variants/.test(x)).map(x => fs.readFileSync(path.join(ROOT, 'src', x), 'utf8')).join('\n');
    const ids = JSON.parse((src.match(/const SFX_IDS = (\[[^\]]+\])/) || [])[1].replace(/'/g, '"'));
    const listedMissing = NO_SOUND.map(r => r[1]).join(' ');
    for (const id of Object.keys(calls)) if (!ids.includes(id) && !listedMissing.includes('SFX.' + id)) bad.push(`SFX.${id} is called (${calls[id].map(c => c.file + ':' + c.line).join(', ')}) but no such sound exists, and it isn't listed as missing`);
    for (const id of ids) if (!calls[id]) bad.push(`${id}: never triggered by the game`);
    const n = Object.values(calls).reduce((a, x) => a + x.length, 0);
    return { ok: !bad.length, detail: [`${n} trigger sites for ${Object.keys(calls).length} sound IDs; ${NO_SOUND.length} events with no sound listed`, ...bad] };
  };

  T['studio-coverage'] = async () => {
    const src = manifestFiles(ROOT).map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n'), bad = [];
    const names = new Set([...SCREENS.map(s => s[0]), ...STUDIO_SCREENS.map(s => s[0])]);
    for (const [id, , re, studio] of OVERLAYS) { if (!re.test(src)) bad.push(`overlay ${id}: its code is gone (${re}); update src/review-studio/coverage.js`); for (const s of studio) if (!names.has(s)) bad.push(`overlay ${id}: no Studio setup "${s}"`); }
    const keys = new Set([...src.matchAll(/\b(Game|World)\.([a-zA-Z]+)\s*=\s*\{/g)].map(m => m[1] + '.' + m[2])), covered = new Set(OVERLAYS.flatMap(o => o[4] || []));
    for (const k of keys) if (!covered.has(k) && !NOT_VIEWS[k]) bad.push(`${k}: a view's state in the code, neither an overlay in the Studio nor listed as not a view (src/review-studio/coverage.js)`);
    const scr = new Set([...src.matchAll(/Game\.screen\s*(?:===|!==|=)\s*'([a-z0-9]+)'/g)].map(m => m[1])), reached = new Set(Object.values(SCREEN_OF));
    for (const s of scr) if (!reached.has(s) && !NOT_RENDERABLE[s]) bad.push(`Game.screen '${s}': not in the Studio and not listed as not renderable (with a reason)`);
    for (const s of Object.keys(NOT_RENDERABLE)) if (!NOT_RENDERABLE[s] || NOT_RENDERABLE[s].length < 10) bad.push(`${s}: not renderable without a reason`);
    for (const n of names) { const m = META[n]; if (!m) { bad.push('no metadata: ' + n); continue; } if (!FLOWS.includes(m[0]) || !m[1] || !m[2] || !m[5]) bad.push('incomplete metadata: ' + n); }
    for (const n of Object.keys(NOT_RENDERABLE)) if (!NA_META[n]) bad.push('no metadata (not renderable): ' + n);
    for (const n of Object.keys(META)) if (!names.has(n)) bad.push('metadata for a screen the Studio no longer has: ' + n);
    const fr = path.join(ROOT, 'docs/review/first-run.json'); const frj = fs.existsSync(fr) ? JSON.parse(fs.readFileSync(fr, 'utf8')) : null;
    if (!frj || !frj.steps || frj.steps.length < 10) bad.push('docs/review/first-run.json is missing (node tools/review-first-run.mjs)');
    else for (const s of frj.steps) for (const k of ['desktop', 'phone']) if (!fs.existsSync(path.join(ROOT, 'docs/review/img/first-run', s.img[k]))) bad.push('first-run image missing: ' + s.img[k]);
    const byFlow = {}; for (const n of names) { const f = META[n] ? META[n][0] : '?'; byFlow[f] = (byFlow[f] || 0) + 1; }
    return { ok: !bad.length, detail: [`${names.size} screens in the Studio (${Object.entries(byFlow).map(([f, n]) => f + ' ' + n).join(', ')}), ${OVERLAYS.length} overlays and in-match states, ${scr.size} Game.screen names, ${Object.keys(NOT_RENDERABLE).length} not renderable with a reason; first-run path ${frj ? frj.steps.length : 0} steps`, ...bad.slice(0, 40)] };
  };
  return T;
}
