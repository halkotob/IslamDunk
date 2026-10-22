// Every reviewable item, with a stable ID derived from where it comes from in the game.
//   dialogue/<unit>/<line>        one line of a conversation (story scene, Sheikh pool or talk, partner scene, NPC...)
//   trivia/<index>                a trivia question with its answers and explanation
//   text/<kind>/<id>              achievements, Noor effects, taunts, calendar names
//   text/<file>/<slug>-<hash>     every other player-facing string (the game-text.csv strings no item above covers)
//   sprite/<kind>/<id>            characters, creator options, props, balls, hoops, crests, jerseys, courts, HUD
//   anim/<state>/<variant>        Phase 2: rig animations
//   screen/<name>/<size>          Phase 2: game screens at desktop 16:9 and two phone sizes
//   sound/<name>, voice/<file>    Phase 3 scaffold
// The version an item was added comes from docs/review/studio-ids.json (npm run review:ids); an item the registry
// doesn't know yet is new in this build.
import { norm } from './csv.js';

export const CATS = ['Dialogue', 'Trivia', 'Text', 'Sprites', 'Animations', 'Screens', 'Sounds', 'Voice'];
const MASJID_SRC = 'career/masjid-projects.js:81';
const RELIGIOUS_GROUPS = new Set(['Jumu’ah khutbah', 'Jumu’ah', 'Sheikh', 'Sheikh talks', 'Sheikh lessons', 'Niyyah', 'Noor effects', 'Calendar']);
export const RELIGIOUS_WORDS = /\b(allah|qur'?an|qur’an|hadith|prophet|ﷺ|salah|salat|du['’]?a|sunnah|ayah|ayat|surah|ramadan|eid|jannah|iman|dhikr|sabr|tawakkul|bismillah|insha|masha|subhan|alhamdu|astaghfir|haram|halal|sadaqah|zakat|wudu|jumu['’]?ah|khutbah|imam|sahab|niyyah|taqwa|ihsan|shukr|barakah|deen|ummah|mus[-' ]?haf|rak['’]?ah|isha|fajr|dhuhr|asr|maghrib|adhan|iqamah|hijri|muharram|sha['’]?ban|rajab|dhul|shawwal)/i;

const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36).padStart(7, '0').slice(-6); };
const slug = t => (norm(t).toLowerCase().replace(/<[^>]*>|\$\{[^}]*\}/g, ' ').match(/[a-z0-9]+/g) || ['x']).slice(0, 5).join('-').slice(0, 32);
export const verKey = v => v === 'phase1' ? [0, 0, 0] : String(v || '').split('.').map(n => +n || 0);
export const cmpVer = (a, b) => { const x = verKey(a), y = verKey(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

// what a reviewer needs to know about when each group appears in the game
export const TRIGGERS = {
  Story: 'Career story scenes, shown full screen between games when the story reaches them (career.js STORY).',
  Sheikh: 'Sh. Saleem in his office, picked at random from this pool when you visit or after a game.',
  'Sheikh talks': 'A talk you choose in Sh. Saleem’s office; your question, then his answer.',
  'Sheikh lessons': 'A lesson from Sh. Saleem, unlocked through the career.',
  Niyyah: 'Before a career game: you pick an intention, and Sh. Saleem reminds you of it afterwards.',
  Partners: 'A scene with a teammate, after games once you have played enough with him.',
  'Musalla news': 'Talk in the musalla after a game; the news topic depends on the career.',
  'Musalla talks': 'Talk to a brother in the musalla; his greeting, your question, his answer.',
  Milestones: 'A milestone moment in the career (progression beats).',
  Intro: 'The career intro: outside the masjid, then the gym, the first time you start a career.',
  Neighbourhood: 'A person in the neighbourhood (v9.2) on a free day; one set of lines per day.',
  'Jumu’ah khutbah': 'On a Friday in career mode, if you attend Jumu’ah: Sh. Saleem says 2-3 of these. Each is a trivia question and its explanation; fix the trivia to change it.',
  Trivia: 'A trivia question during a game (Noor) or in the trivia mini game. The first answer is the right one.',
  Achievements: 'The Achievements screen and the toast when you earn one.',
  'Noor effects': 'The Noor power-up choice after a right trivia answer, and the effect banner in play.',
  Taunts: 'A taunt after a big play (the pop line above the player).',
  Calendar: 'The career calendar strip and month view (v9.0).',
  Cast: 'Masjid Al-Amanah’s people: in the career hub, the musalla, the office, the intro and in games.',
  Teams: 'An opposing team’s player, in games and on the team select and scouting screens.',
  'Neighbourhood people': 'A person in the neighbourhood scenes (v9.2).',
  Creator: 'The player creator: one option shown on your player.',
  Balls: 'A ball skin from the Profile (equip) screen, used in every game.',
  Hoops: 'The hoop, backboard and net in every game.',
  Crests: 'A team crest: team select, scoreboards, the bracket.',
  Jerseys: 'A team’s kit, worn in games.',
  Courts: 'A court or venue a game is played in.',
  'Neighbourhood props': 'A prop in a neighbourhood scene (v9.2).',
  'Neighbourhood scenes': 'A neighbourhood scene (v9.2), end to end, at each time of day. People are under Neighbourhood people.',
  Masjid: 'My Masjid, outside: with no projects built and with every project built.',
  HUD: 'The in-game HUD (score, clock, shot clock, turbo), with the touch controls on phones and tablets.'
};

export function buildItems(rs, data) {
  const items = [], reg = (data.registry && data.registry.ids) || {};
  const textIdx = new Map();
  for (const r of data.text) { const k = norm(r.text); if (!textIdx.has(k)) textIdx.set(k, []); textIdx.get(k).push(r); }
  const covered = new Set();
  const occ = t => textIdx.get(norm(t)) || [];
  const add = (it) => {
    const o = it.parts ? [...new Set(it.parts.flatMap(p => occ(p[1])))] : occ(it.text || '');
    it.where = it.where || (o[0] ? o[0].file + ':' + o[0].line : it.src || '');
    it.occ = o;
    it.flag = (o.find(x => x.flag) || {}).flag || it.flag || '';
    it.version = reg[it.id] || (o.length && o.every(x => x.phase1) ? 'phase1' : data.version);
    it.religious = !!(it.religious || RELIGIOUS_GROUPS.has(it.group) || /REVIEW 8\.6\.1|REVIEW 9\.0/.test(it.flag) || RELIGIOUS_WORDS.test(it.text || ''));
    items.push(it);
  };
  const cover = (...ts) => { for (const t of ts) if (t) covered.add(norm(t)); };

  // dialogue: conversations, one item per line
  for (const u of rs.dialogue()) {
    u.lines.forEach((l, li) => {
      cover(l.text);
      add({ id: 'dialogue/' + u.key + '/' + li, cat: 'Dialogue', group: u.group, kind: 'line', unit: u, li, text: l.text, speaker: l.sp,
        name: (l.choice ? 'You ask: ' : rs.speakerName(l.sp) + ': ') + l.text, src: u.src });
    });
  }
  // trivia
  for (const t of rs.trivia()) {
    cover(t.q, t.right, t.why, ...t.wrong);
    add({ id: 'trivia/' + t.i, cat: 'Trivia', group: 'Trivia', kind: 'trivia', trivia: t, text: t.q, name: t.q, religious: true });
  }
  // structured text
  for (const a of rs.achievements()) { cover(a.name, a.desc); add({ id: 'text/achievement/' + a.id, cat: 'Text', group: 'Achievements', kind: 'text', text: a.name + ' — ' + a.desc, parts: [['Name', a.name], ['Description', a.desc]], name: a.name + ': ' + a.desc }); }
  for (const f of rs.noor()) { cover(f.name, f.mean, f.desc); add({ id: 'text/noor/' + f.id, cat: 'Text', group: 'Noor effects', kind: 'text', text: f.name + ' — ' + f.mean + ' — ' + f.desc, parts: [['Name', f.name], ['Meaning', f.mean], ['Effect', f.desc]], col: f.col, name: f.name + ' (' + f.mean + ')' }); }
  for (const t of rs.taunts()) { cover(t.name, t.pop); add({ id: 'text/taunt/' + t.id, cat: 'Text', group: 'Taunts', kind: 'text', text: t.name + ' — ' + t.pop, parts: [['Name', t.name], ['Pop line', t.pop]], name: t.name + ': ' + t.pop }); }
  const cal = rs.calendar();
  if (cal) {
    cal.months.forEach((m, i) => { cover(m); add({ id: 'text/calendar/month/' + i, cat: 'Text', group: 'Calendar', kind: 'text', src: 'career/calendar.js', text: m, parts: [['Month ' + (i + 1), m]], name: 'Month ' + (i + 1) + ': ' + m }); });
    cal.weekdays.forEach((d, i) => { cover(d); add({ id: 'text/calendar/weekday/' + i, cat: 'Text', group: 'Calendar', kind: 'text', src: 'career/calendar.js', text: d, parts: [['Weekday ' + (i + 1), d]], name: 'Weekday: ' + d }); });
    cal.holidays.forEach((h, i) => { cover(h.name); add({ id: 'text/calendar/holiday/' + i, cat: 'Text', group: 'Calendar', kind: 'text', src: 'career/calendar.js', text: h.name, parts: [['Holiday', h.name], ['Date', (cal.months[h.m] || h.m) + ' ' + h.day]], name: h.name + ' (' + (cal.months[h.m] || h.m) + ' ' + h.day + ')' }); });
  }
  // every other player-facing string, grouped by its game-text.csv section
  const seen = new Set();
  for (const r of data.text) {
    const k = norm(r.text); if (covered.has(k)) continue;
    const base = 'text/' + r.file.replace(/\.js$/, '') + '/' + slug(r.text) + '-' + fnv(k);
    if (seen.has(base)) continue; seen.add(base);
    add({ id: base, cat: 'Text', group: r.section.replace(/\s*\(.*\)$/, ''), section: r.section, kind: 'text', text: r.text, parts: [['Text', r.text]], name: r.text, speaker: r.speaker, where: r.file + ':' + r.line });
  }

  // sprites
  const S = (id, group, name, spr, extra = {}) => add(Object.assign({ id: 'sprite/' + id, cat: 'Sprites', group, kind: 'sprite', name, spr, text: '' }, extra));
  for (const p of rs.people()) {
    const [k, a, b] = p.key.split('/');
    if (k === 'cast') S('cast/' + a, 'Cast', p.name, { t: 'person', key: p.key }, { srcFile: 'career/career.js' });
    else if (k === 'team') S('player/' + a + '/' + b, 'Teams', p.name, { t: 'person', key: p.key, kit: true });
    else if (k === 'npc') S('npc/' + a, 'Neighbourhood people', p.name, { t: 'person', key: p.key });
  }
  for (const r of rs.creatorRows()) for (const v of r.values) S('creator/' + r.key + '/' + v.i, 'Creator', r.label + ': ' + (v.label || v.col || v.i), { t: 'creator', key: r.key, i: v.i, col: v.col });
  for (const T of rs.teams()) {
    S('crest/' + T.short, 'Crests', T.name + ' crest', { t: 'crest', short: T.short });
    S('jersey/' + T.short, 'Jerseys', T.name + ' kit', { t: 'jersey', short: T.short });
  }
  S('crest/AMANAH', 'Crests', 'Masjid Al-Amanah crest', { t: 'crest', short: 'AMANAH' });
  for (const b of rs.balls()) S('ball/' + b, 'Balls', b + ' ball', { t: 'ball', skin: b }, { src: 'screens/profile.js:26' });
  S('hoop/default', 'Hoops', 'Hoop, backboard and net', { t: 'hoop' }, { src: 'render/renderer.js:519' });
  for (const v of rs.venues()) S('venue/' + v.id, 'Courts', v.name, { t: 'venue', id: v.id }, { srcFile: 'data/venues.js' });
  for (const d of rs.worldScenes()) S('scene/' + d.id, 'Neighbourhood scenes', d.name + ' (whole scene, no people)', { t: 'scene', id: d.id, w: d.w }, { srcFile: 'career/world/world-scenes.js' });
  for (const p of rs.worldProps()) S('prop/' + p.scene + '/' + p.id, 'Neighbourhood props', p.scene + ': ' + p.id, { t: 'prop', scene: p.scene, id: p.id, box: p.box });
  S('masjid/none', 'Masjid', 'My Masjid outside, no projects', { t: 'masjid', lvl: 0 }, { src: MASJID_SRC });
  S('masjid/all', 'Masjid', 'My Masjid outside, every project', { t: 'masjid', lvl: 1 }, { src: MASJID_SRC });
  S('hud/desktop', 'HUD', 'HUD (keyboard / pad)', { t: 'hud', touch: false }, { src: 'render/renderer.js:645' });
  S('hud/touch', 'HUD', 'HUD with touch controls', { t: 'hud', touch: true }, { src: 'render/renderer.js:645' });
  return items;
}

// where a sprite is defined, from the source index in review-data.json (first `'<id>'` or `<id>:` match)
export function locateSprites(items, defs) {
  for (const it of items) {
    if (it.cat !== 'Sprites' || it.where) continue;
    const k = it.id.split('/').slice(-1)[0];
    const key = isNaN(+k) ? k : it.id.split('/').slice(-2)[0];
    it.where = defs[key] || it.srcFile || '';
  }
}
