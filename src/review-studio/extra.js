// Phase 2: Animations and Screens.
// Each item carries stage(G, bar, view, el, S) which draws it into the studio's stage.
import { SCREEN_OF, NOT_RENDERABLE, STUDIO_SCREENS } from './screens.js';

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const SIZES = [['desktop', 'Desktop 16:9 (1280×720)', 1280, 720, false], ['phone-750x342', 'iPhone landscape (750×342)', 750, 342, true], ['phone-667x300', 'Small phone (667×300)', 667, 300, true]];
const screenGroup = n => /^world/.test(n) ? 'Neighbourhood' : /calendar|month view/.test(n) ? 'Calendar' : /^match|^halftime$|^final$|dunk lab/.test(n) ? 'Match'
  : /barakah|^run /.test(n) ? 'Barakah Run' : /share|clip/.test(n) ? 'Sharing' : /^online$|joincode|lobby|host|netplay|netwait/.test(n) ? 'Online'
  : /career|creator|namekeys|story|^hub|cbracket|cstats|cgoals|csummary|postgame|scout|pregame|journal|office|musalla|masjid|^shop$|^train$|^gym$|saves|newseason|intro/.test(n) ? 'Career' : 'Menus';

export async function extraCategories(G, data, hooks) {
  const out = [];
  // ---- animations
  for (const a of G.rs.anims()) out.push({ id: 'anim/' + a.id, cat: 'Animations', group: a.group, kind: 'anim', name: a.name, anim: a, text: '', src: 'sim/animation.js',
    when: 'Played by the rig in games. Drawn here by the game’s own animate() and drawPlayer(), one simulation step (1/60 s) per frame.', stage: hooks.stageAnim });
  // ---- screens
  const screens = data.screens.map(x => x.concat(['tests/phone-audit.mjs (SCREENS)'])).concat(STUDIO_SCREENS.map(x => x.concat(['src/review-studio/screens.js'])));
  for (const [name, js, src] of screens) for (const [size, label, w, h, touch] of SIZES)
    out.push({ id: 'screen/' + slug(name) + '/' + size, cat: 'Screens', group: screenGroup(name), kind: 'screen', name: name + ' · ' + label, screen: { name, js, size, label, w, h, touch, game: SCREEN_OF[name] }, text: '', src,
      when: 'Game.screen “' + (SCREEN_OF[name] || '?') + '”, set up the way the phone text audit does it.', stage: hooks.stageScreen });
  const reached = new Set(Object.values(SCREEN_OF));
  for (const s of data.screenNames) if (!reached.has(s)) out.push({ id: 'screen/' + s + '/not-renderable', cat: 'Screens', group: 'Not renderable', kind: 'screen-na', name: s + ' (not renderable here)',
    reason: NOT_RENDERABLE[s] || 'No setup for this screen yet.', text: '', when: NOT_RENDERABLE[s] || 'No setup for this screen yet.', stage: hooks.stageNA });
  return out;
}
