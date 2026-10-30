// Phase 2: Animations and Screens. Phase 3 (scaffold): Sounds and Voice.
// Each item carries stage(G, bar, view, el, S) which draws it into the studio's stage.
import { SCREEN_OF, NOT_RENDERABLE, STUDIO_SCREENS } from './screens.js';
import { metaOf, FLOWS, CROWDED, TEXT_HEAVY } from './screen-meta.js';

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const SIZES = [['desktop', 'Desktop 16:9 (1280×720)', 1280, 720, false], ['phone-750x342', 'iPhone landscape (750×342)', 750, 342, true], ['phone-667x300', 'Small phone (667×300)', 667, 300, true]];

export async function extraCategories(G, data, hooks) {
  const out = [];
  // ---- animations
  for (const a of G.rs.anims()) out.push({ id: 'anim/' + a.id, cat: 'Animations', group: a.group, kind: 'anim', name: a.name, anim: a, text: '', src: 'sim/animation.js',
    when: 'Played by the rig in games. Drawn here by the game’s own animate() and drawPlayer(), one simulation step (1/60 s) per frame.', stage: hooks.stageAnim });
  // ---- screens
  const screens = data.screens.map(x => x.concat(['tests/phone-audit.mjs (SCREENS)'])).concat(STUDIO_SCREENS.map(x => x.concat(['src/review-studio/screens.js'])));
  // v9.13: grouped by flow, with what each screen is for (screen-meta.js) and what it draws (docs/review/screen-census.json)
  const census = (data.census && data.census.screens) || {};
  const withMeta = name => { const m = metaOf(name) || { flow: 'rare', flags: [] }, c = census[name];
    if (c) { if (c.taps >= CROWDED) m.flags.push('crowded'); if (c.words >= TEXT_HEAVY) m.flags.push('text-heavy'); }
    if (m.title == null && m.hub == null && !m.flags.includes('unreachable')) m.flags.push('not a menu path (comes up in play)');
    return Object.assign(m, { census: c || null }); };
  for (const [name, js, src] of screens) { const meta = withMeta(name); for (const [size, label, w, h, touch] of SIZES)
    out.push({ id: 'screen/' + slug(name) + '/' + size, cat: 'Screens', group: 'Flow: ' + meta.flow, kind: 'screen', name: name + ' · ' + label, meta, screen: { name, js, size, label, w, h, touch, game: SCREEN_OF[name] }, text: '', src,
      when: meta.purpose ? meta.purpose + ' ' + meta.reach : 'Game.screen “' + (SCREEN_OF[name] || '?') + '”, set up the way the phone text audit does it.', stage: hooks.stageScreen }); }
  const reached = new Set(Object.values(SCREEN_OF));
  for (const s of data.screenNames) if (!reached.has(s)) out.push({ id: 'screen/' + s + '/not-renderable', cat: 'Screens', group: 'Not renderable', kind: 'screen-na', name: s + ' (not renderable here)', meta: withMeta(s),
    reason: NOT_RENDERABLE[s] || 'No setup for this screen yet.', text: '', when: NOT_RENDERABLE[s] || 'No setup for this screen yet.', stage: hooks.stageNA });
  // the first-run path and a contact sheet per flow
  out.push({ id: 'screen/first-run-path', cat: 'Screens', group: 'Flow: first-run', kind: 'firstrun', name: 'First-run path: launch to the end of the first match and the first career day', text: '', src: 'docs/review/first-run.json', when: 'What a brand-new player sees, in order (tools/review-first-run.mjs).', stage: hooks.stageFirstRun, placeholder: false });
  for (const f of FLOWS) out.push({ id: 'screen/sheet/' + slug(f), cat: 'Screens', group: 'Flow: ' + f, kind: 'sheet', flow: f, name: 'Contact sheet: every ' + f + ' screen', text: '', src: 'src/review-studio/screen-meta.js', when: 'Every screen in this flow side by side, drawn live.', stage: hooks.stageSheet });
  // ---- sounds (Phase 3 scaffold)
  // v9.13: each with variants A-D (core/sfx-variants.js), a pick, and where it triggers
  for (const k of G.rs.sfxIds()) out.push({ id: 'sound/' + k, cat: 'Sounds', group: 'Sound effects', kind: 'sound', name: k + ' · ' + G.rs.where(k), sound: k, text: '', src: 'core/sfx-variants.js',
    when: 'SFX.' + k + '(): ' + G.rs.where(k) + '. Four variants made by the game’s Web Audio code (no files): A Current, B Real, C Arcade, D Soft.', stage: hooks.stageSound });
  // v9.13: the crowd at each venue, and the mix test
  for (const p of G.rs.crowdPresets()) out.push({ id: 'sound/crowd/' + p.key, cat: 'Sounds', group: 'Crowd', kind: 'crowd', name: 'Crowd: ' + p.name, preset: p.key, text: '', src: 'screens/v913-crowd.js',
    when: 'What a match at this venue plays for a make, a dunk, a buzzer beater, a miss, a block and a turnover, with the audience it draws.', stage: hooks.stageCrowd });
  out.push({ id: 'sound/mix', cat: 'Sounds', group: 'Crowd', kind: 'mix', name: 'Mix test: a 60 s match at a venue, a level per bus', text: '', src: 'screens/v913-crowd.js', when: 'A CPU match with sound, with sliders for master, effects, crowd, claps and voices, and room echo.', stage: hooks.stageMix });
  // ---- voice (Phase 3 scaffold): assets/voice/manifest.json
  const voice = Array.isArray(data.voice) ? data.voice : data.voice && Array.isArray(data.voice.lines) ? data.voice.lines : null;
  if (voice && voice.length) for (const v of voice) out.push({ id: 'voice/' + v.file, cat: 'Voice', group: v.speaker || 'Voice', kind: 'voice', name: (v.speaker ? v.speaker + ': ' : '') + (v.transcript || v.file), voice: v, text: v.transcript || '', src: 'assets/voice/' + v.file, stage: hooks.stageVoice });
  else out.push({ id: 'voice/none', cat: 'Voice', group: 'Voice', kind: 'voice-empty', placeholder: true, name: 'No voice lines yet', text: '', src: 'assets/voice/manifest.json', stage: hooks.stageVoiceEmpty });
  return out;
}
