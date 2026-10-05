// ================================================================ VENUES
// Visual/atmosphere only: court size, hoops, physics and gameplay are
// identical everywhere. Each venue pre-renders its static layers (backdrop,
// walls/stands, floor, near side, resting crowd) once; per frame we only
// blit them and animate the crowd, lights, jumbotron and weather.
const BG_X0 = -160, BGW = COURT.L + 320;           // bg layer covers world x -160..1480 at parallax 1
const NEAR_Y = FLOOR_TOP + Math.ceil(COURT.D * ZS), NEAR_H = H - NEAR_Y + 10;
const TIMES = ['afternoon', 'sunset', 'night'], BACKDROPS = ['mountains', 'city', 'desert', 'coast', 'snow'];
const BACKDROP_NAMES = { mountains: 'Mountain View Court', city: 'City Park Court', desert: 'Oasis Court', coast: 'Seaside Court', snow: 'Winter Court' };
const ARENAS = {
  regional: { name: 'Lakeshore Regional Event Center', lock: 1, rows: 6, fill: 0.7, level: 0.75, c1: '#24507a', c2: '#e8edf2', wood: ['#caa06a', '#e2bd86'], key: '#24507a', banner: 'STATE MASJID CHAMPIONSHIP' },
  college: { name: 'Northfield University Fieldhouse', lock: 2, rows: 9, fill: 0.9, level: 1.0, c1: '#7a1f2b', c2: '#e8c35a', wood: ['#b8844c', '#d9a86a'], key: '#7a1f2b', banner: 'NATIONAL MASJID INVITATIONAL' },
  intl: { name: 'Al-Ittihad International Arena', lock: 3, rows: 10, fill: 0.95, level: 1.15, c1: '#123e4a', c2: '#e8c35a', wood: ['#8f5f34', '#b07a45'], key: '#127a7a', banner: 'WORLD UMMAH CUP' },
  grand: { name: 'Grand Ummah Dome', lock: 4, rows: 11, fill: 1.0, level: 1.3, c1: '#2a1f4a', c2: '#f2cf6b', wood: ['#7a4f2a', '#9c6a3c'], key: '#3a2a6a', banner: 'WORLD UMMAH CUP FINAL' }
};
function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---- venue specs (plain data, also sent to the online guest)
// { id, kind: classic|gym|outdoor|arena, size: home|S|M|L, backdrop, time, surface, tier, crowd, host: 0|1 }
const VENUE_LIST = [
  { id: 'classic', kind: 'classic', name: 'Masjid League Arena' },
  { id: 'home', kind: 'gym', size: 'home', name: 'Masjid Al-Amanah Gym' },
  { id: 'gymS', kind: 'gym', size: 'S', name: 'Masjid Multipurpose Room' },
  { id: 'gymM', kind: 'gym', size: 'M', name: 'Masjid Gym' },
  { id: 'gymL', kind: 'gym', size: 'L', name: 'Community Center Gym' },
  ...BACKDROPS.map(b => ({ id: 'out_' + b, kind: 'outdoor', backdrop: b, name: BACKDROP_NAMES[b] })),
  ...Object.keys(ARENAS).map(k => ({ id: 'arena_' + k, kind: 'arena', tier: k, name: ARENAS[k].name, lock: ARENAS[k].lock }))
];
function venueDisplayName(v, host) {
  if (v.kind === 'gym' && v.size !== 'home') return host.name + ({ S: ' Multipurpose Room', M: ' Gym', L: ' Community Gym' })[v.size];
  if (v.kind === 'outdoor') return host.name + ' ' + (BACKDROP_NAMES[v.backdrop] || 'Court').replace(' Court', '') + ' Court';
  return v.name;
}
// Career progress unlocks arenas for other modes (read from the career autosave).
function careerReach() { const s = C || readSave(SAVE_AUTO); if (!s) return 0; return s.done || (s.trophies || []).includes(3) ? 4 : s.stage || 0; }
function venueLocked(v) { return v.lock != null && careerReach() < v.lock; }
function lockText(v) { return v.lock === 4 ? 'Win the World Ummah Cup in career' : 'Reach the ' + STAGES[v.lock].name + ' stage in career'; }
// Crowd size and loudness for a venue in non-career modes
function defaultCrowd(v) {
  if (v.kind === 'gym') return v.size === 'home' ? 12 + Math.round(masjidLevelSafe() * 1.2) : { S: 22, M: 80, L: 140 }[v.size];
  if (v.kind === 'outdoor') return 24;
  if (v.kind === 'arena') return 3000;
  return 3000;
}
function masjidLevelSafe() { try { return C && C.up ? masjidLevel(C.up) : 0; } catch (e) { return 0; } }
function makeVenue(base, extra = {}) {
  const v = Object.assign({ time: 'afternoon', surface: 'asphalt', host: 1 }, base, extra);
  if (v.kind === 'outdoor' && !extra.time) v.time = pick(TIMES);
  if (v.kind === 'outdoor' && !extra.surface) v.surface = pick(['asphalt', 'green', 'blue']);
  if (v.crowd == null) v.crowd = defaultCrowd(v);
  return v;
}
// ---- career: where each game is played
function careerVenue(stage, round, oppId, opp) {
  if (stage === 0 && round !== 1) return makeVenue(VENUE_LIST[1], { host: 0, crowd: 10 + Math.round(masjidLevelSafe() * 1.25), level: 0.3 });   // home
  if (stage === 0 || (stage === 1 && round === 0)) {                                              // away: the opponent's own masjid
    const R = seededRng(hash32(opp.name + opp.place)), outdoor = R() < 0.3;
    const size = stage === 0 ? (R() < 0.45 ? 'S' : R() < 0.75 ? 'M' : 'L') : (R() < 0.5 ? 'M' : 'L');
    const crowd = stage === 0 ? 10 + Math.floor(R() * 21) : 50 + Math.floor(R() * 101);
    if (outdoor) return makeVenue({ id: 'out_' + BACKDROPS[Math.floor(R() * 5)], kind: 'outdoor' }, { backdrop: BACKDROPS[Math.floor(R() * 5)], time: TIMES[Math.floor(R() * 3)], surface: ['asphalt', 'green', 'blue'][Math.floor(R() * 3)], crowd, host: 1, level: stage ? 0.5 : 0.32 });
    return makeVenue({ id: 'gym' + size, kind: 'gym', size }, { crowd, host: 1, level: stage ? 0.55 : 0.32 });
  }
  if (stage >= 2 && round === 0) {
    const pl = (opp.place || '') + ' ' + opp.name, map = [[/Istanbul|T\u00fcrkiye|Turkey|Bursa|Konya/i, 'bosphorus'], [/Cairo|Egypt|Alexandria|Sudan|Khartoum/i, 'nile'], [/Kuala Lumpur|Malaysia|Jakarta|Indonesia|Singapore|Brunei/i, 'tropics'],
      [/Morocco|Rabat|Casablanca|Marrakesh|Fez|Algeria|Tunis/i, 'atlas'], [/Spain|Granada|Cordoba|Sevilla|Seville|Lisbon|Portugal/i, 'andalus'], [/Iran|Tehran|Isfahan|Lahore|Pakistan|Karachi|Dhaka|Bangladesh|Samarkand|Uzbekistan|Delhi|India/i, 'isfahan']];
    const hit = map.find(([re]) => re.test(pl)), keys = Object.keys(SKYLINES), R = seededRng(hash32(opp.name + (opp.place || '')));
    const bd = hit ? hit[1] : keys[Math.floor(R() * keys.length)];
    return makeVenue({ id: 'out_' + bd, kind: 'outdoor', backdrop: bd, name: SKYLINES[bd] }, { backdrop: bd, time: TIMES[Math.floor(R() * 3)], surface: ['asphalt', 'green', 'blue'][Math.floor(R() * 3)], crowd: stage === 2 ? 30 : 30, host: 1, level: stage === 2 ? 0.55 : 0.6 });
  }
  const tier = stage === 1 ? 'regional' : stage === 2 ? 'college' : round === 2 ? 'grand' : 'intl';
  const A = ARENAS[tier], final = round === 2;
  return makeVenue({ id: 'arena_' + tier, kind: 'arena', tier, name: A.name }, { crowd: stage === 1 ? (final ? 280 : 150) : stage === 2 ? 4000 : 12000, fill: stage === 1 ? (final ? 0.45 : 0.25) : A.fill, level: A.level + (final ? 0.1 : 0), final, host: 1 });
}
function venueHost(v, tA, tB) { return v.host === 0 ? tA : tB; }

// ---------------------------------------------------------- LAYER BUILD
