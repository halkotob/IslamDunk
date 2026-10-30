// v9.13: the Sounds tab. Each sound effect with its four variants (A Current, B Real, C Arcade, D Soft, plus any
// recorded ones), played by the game's own sound code at matched loudness; loop, repeat x5 (to hear the repetition and
// the sub-variants), compare A-D, and a pick (which variant should win) that leaves with the CSV. The Crowd section sets
// up a match at a venue and plays what a match there would; the mix test runs a 60 s CPU match with a level per bus.
export const DEMO_ARGS = { bounce: [1], clank: [1], netSwish: [0.8], rimTick: [0.6], cheer: [1], greenMake: [0], snatch: [1], swish: [1] };
export const KEYS = ['A', 'B', 'C', 'D'];

// one shared AudioContext, made on a click in the studio (a click is what lets a page play sound)
let actx = null;
export function audio(G) {
  if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); }
  if (actx.state === 'suspended') actx.resume();
  G.rs.audioWith(actx);
  return actx;
}
export function stopAll(T) { if (T.loop) { clearInterval(T.loop); T.loop = null; } for (const t of T.timers) clearTimeout(t); T.timers = []; }

export function stageSound(G, bar, view, it, h) {
  const { el, S, store } = h, id = it.sound, vs = G.rs.variants(id), T = h.T;
  stopAll(T);
  const m = () => store.mark(it.id) || {};
  const st = el('div', { class: 'note' }, 'Press a variant (or 1-4). P plays the preview style. The game’s own Web Audio code makes every sound: there is no file.');
  let last = S.sp.prev || 'A';
  const play = k => { try { audio(G); G.rs.playVariant(id, k, DEMO_ARGS[id]); last = k; st.textContent = `Played ${k} (${(vs.find(v => v.key === k) || {}).label}) at ${new Date().toLocaleTimeString()}`; drawPick(); } catch (e) { st.textContent = 'Could not play: ' + (e.message || e); } };
  const later = (ms, f) => T.timers.push(setTimeout(f, ms));
  const vrow = el('div', { class: 'svrow' });
  for (const v of vs) vrow.append(el('button', { class: 'vbtn', 'data-k': v.key, onclick: () => play(v.key) }, el('b', {}, '▶ ' + v.key), el('span', {}, v.label), el('small', {}, v.key === 'A' ? 'as shipped' : (v.db >= 0 ? '+' : '') + v.db + ' dB to match A')));
  const loopBtn = el('button', { onclick: () => { if (T.loop) { stopAll(T); loopBtn.classList.remove('on'); return; } T.loop = setInterval(() => play(last), id === 'cheer' || id === 'buzzer' ? 2200 : 1200); loopBtn.classList.add('on'); play(last); } }, '⟳ Loop');
  const rep = el('button', { onclick: () => { stopAll(T); loopBtn.classList.remove('on'); for (let i = 0; i < 5; i++) later(i * (id === 'cheer' || id === 'buzzer' ? 1200 : 380), () => play(last)); } }, 'Repeat ×5');
  const cmp = el('button', { onclick: () => { stopAll(T); KEYS.forEach((k, i) => later(i * (id === 'cheer' || id === 'buzzer' ? 1800 : 900), () => play(k))); } }, 'Compare A → D');
  bar.append(loopBtn, rep, cmp, el('span', { class: 'note' }, 'Repeats play the last variant you pressed'));
  // the pick: which variant should be the game's default for this sound
  const pickRow = el('div', { class: 'pick' });
  const drawPick = () => {
    const p = m().pick || '';
    pickRow.replaceChildren(el('b', {}, 'Pick: '), ...[...vs.map(v => v.key), 'none'].map(k => el('button', { class: p === k ? 'on' : '', onclick: () => { store.set(it.id, { pick: p === k ? '' : k }); h.afterMark(it); drawPick(); } }, k === 'none' ? 'None of these' : k + ' ' + ((vs.find(v => v.key === k) || {}).label || ''))),
      el('small', {}, p ? ' → exported in the CSV (column pick)' : ' nothing picked'));
    for (const b of vrow.children) b.classList.toggle('picked', b.dataset.k === p);
  };
  const calls = (S.data.soundCalls || {})[id] || [];
  view.append(el('div', { class: 'card snd' },
    el('h3', {}, 'SFX.' + id + '()'), el('p', {}, G.rs.where(id)),
    vrow, pickRow, st,
    el('details', {}, el('summary', {}, `Where it triggers: ${calls.length} call${calls.length === 1 ? '' : 's'} in the game`), ...calls.map(c => el('div', { class: 'where' }, c.file + ':' + c.line + (c.fn ? '  (' + c.fn + ')' : '')))),
    el('p', { class: 'note' }, ['bounce', 'squeak', 'swish', 'netSwish', 'clank', 'thud', 'swipe'].includes(id) ? 'B, C and D have 2-3 sub-variants, chosen at random with no immediate repeat: use Repeat ×5 to hear them.' : '')));
  drawPick();
  h.AN.keys = k => { if (k === 'p' || k === ' ') play(S.sp.prev || 'A'); };
  h.extraKeys = k => { const i = '1234'.indexOf(k); if (i >= 0) { play(KEYS[i]); return true; } if (k === 'l') { loopBtn.click(); return true; } return false; };
  return { done: Promise.resolve() };
}

// the preview style for the whole tab, and a medley of every sound in one style
export function soundTabBar(G, bar, h) {
  const { el, S, store } = h;
  const chips = el('span', { class: 'chips' }, el('span', { class: 'note' }, 'Preview style (P): '), ...KEYS.map(k => el('button', { class: (S.sp.prev || 'A') === k ? 'on' : '', onclick: () => { S.sp.prev = k; store.setUi('sp', S.sp); h.redraw(); } }, k + ' ' + G.rs.styles()[k])));
  const medley = k => { stopAll(h.T); audio(G); G.rs.sfxIds().filter(id => id !== 'cheer' && id !== 'buzzer').forEach((id, i) => h.T.timers.push(setTimeout(() => G.rs.playVariant(id, k, DEMO_ARGS[id]), i * 650))); };
  bar.append(chips, el('span', { class: 'note' }, ' Hear every sound as: '), ...KEYS.map(k => el('button', { onclick: () => medley(k) }, 'All ' + k)));
}

// ---- the crowd at a venue
export function stageCrowd(G, bar, view, it, h) {
  const { el } = h; stopAll(h.T);
  const info = el('div', { class: 'cinfo' }, 'Setting up the venue…');
  const out = el('div', { class: 'note' });
  const show = r => { info.replaceChildren(
    el('div', {}, el('b', {}, r.venue)),
    el('div', {}, `Audience drawn: ${r.audience} · tier ${r.tier} (${['nobody: no crowd sound', 'a handful: claps and a voice or two, no bed', 'a small crowd: a quiet murmur, clusters of claps, a few voices', 'a crowd: the bed and swells, quieter', 'a big crowd: the bed and swells as before'][r.tier]})`),
    el('div', {}, `Bed ${r.levels.bed.toFixed(3)} · murmur ${r.levels.murmur.toFixed(4)} · room: ${r.room}${r.roomOn ? '' : ' (Room echo off)'}`)); };
  const fire = kind => { audio(G); const r = G.rs.crowdTrigger(kind); show(r); out.textContent = `${kind}: ${r.stats.lastClap} clapping, ${r.stats.lastVoice} voice${r.stats.lastVoice === 1 ? '' : 's'} (never more than the ${r.audience} people drawn). The people who clap raise their hands.`; };
  const btns = el('div', { class: 'svrow' }, ...[['make', 'Make'], ['dunk', 'Dunk'], ['buzzer', 'Buzzer beater'], ['miss', 'Miss (groan)'], ['block', 'Block (ooh)'], ['turnover', 'Turnover (groan)']].map(([k, l]) => el('button', { class: 'vbtn', onclick: () => fire(k) }, el('b', {}, '▶'), el('span', {}, l))));
  const roomBtn = el('button', { onclick: () => { audio(G); show(G.rs.setRoom(!G.rs.crowdInfo().roomOn)); roomBtn.textContent = 'Room echo: ' + (G.rs.crowdInfo().roomOn ? 'on' : 'off'); } }, 'Room echo: on');
  bar.append(roomBtn, el('span', { class: 'note' }, 'Voices are synthesized placeholders (a buzzy vowel, not a person) until recorded ones are added.'));
  const ph = h.gameSlot(view, 960, 540);
  view.append(el('div', { class: 'card snd' }, info, btns, out));
  const done = (async () => { await G.size(960, 540, false); const r = G.rs.crowdSetup(it.preset); await G.frames(4); ph.place(); show(r); roomBtn.textContent = 'Room echo: ' + (r.roomOn ? 'on' : 'off'); return r; })();
  h.onLeave = () => G.rs.crowdOff();
  return { done };
}

// ---- the mix test: 60 s of a CPU match at a venue, a level for each bus
export function stageMix(G, bar, view, it, h) {
  const { el, S, store } = h; stopAll(h.T);
  const sel = el('select', {}, ...G.rs.crowdPresets().map(p => el('option', { value: p.key }, p.name)));
  sel.value = S.sp.mixVenue || 'gymM-80';
  const clock = el('span', { class: 'note' }, 'Stopped');
  const buses = [['master', 'Master'], ['fx', 'Effects (ball, shoes, rim, whistle)'], ['crowd', 'Crowd (bed and murmur)'], ['people', 'Claps and voices'], ['room', 'Room echo']];
  const lv = Object.assign({ master: 1, fx: 1, crowd: 1, people: 1, room: 1 }, S.sp.mix || {});
  const sliders = buses.map(([k, l]) => { const v = el('span', {}, Math.round(lv[k] * 100) + '%'), r = el('input', { type: 'range', min: 0, max: 150, value: Math.round(lv[k] * 100) });
    r.addEventListener('input', () => { lv[k] = r.value / 100; v.textContent = r.value + '%'; G.rs.setBus(k, lv[k]); S.sp.mix = lv; store.setUi('sp', S.sp); });
    return el('label', { class: 'slider' }, el('span', {}, l), r, v); });
  let t0 = 0;
  const stop = () => { stopAll(h.T); G.rs.mixStop(); clock.textContent = 'Stopped'; startBtn.textContent = '▶ Start 60 s'; t0 = 0; };
  const startBtn = el('button', { class: 'bigplay', onclick: async () => {
    if (t0) { stop(); return; }
    audio(G); S.sp.mixVenue = sel.value; store.setUi('sp', S.sp);
    const r = G.rs.mixStart(sel.value); for (const [k] of buses) G.rs.setBus(k, lv[k]);
    ph.place(); t0 = Date.now(); startBtn.textContent = '■ Stop';
    h.T.loop = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); clock.textContent = `${s} s of 60 · audience ${r.audience}, tier ${r.tier}, room ${r.room}`; if (s >= 60) stop(); }, 250);
  } }, '▶ Start 60 s');
  const ph = h.gameSlot(view, 960, 540);
  view.append(el('div', { class: 'card snd' }, el('h3', {}, 'Mix test'), el('p', {}, 'A CPU match at the venue you pick, at normal speed, for 60 seconds, with everything a match plays. Move the sliders while it plays (they only change this test, not the game).'),
    el('div', { class: 'svrow' }, el('label', {}, 'Venue ', sel), startBtn, clock), ...sliders));
  h.onLeave = () => { if (t0) stop(); };
  return { done: G.size(960, 540, false) };
}
