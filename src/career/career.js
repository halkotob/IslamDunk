// =========================================================== CAREER MODE
// One custom player at Masjid Al-Amanah, an underdog Small-division masjid.
// Career games are normal matches (per-team AI configs set the stage level),
// the gym is a half-court practice match, and progress lives in localStorage.

// ------------------------------------------------------------ LOOK DATA
const SKINS = ['#f3d2b3', '#e6b894', '#d4a174', '#b98059', '#9a6440', '#7b4a2e', '#5e3a24', '#3f2718'];
const HAIRS = ['#161616', '#3b2412', '#6b4423', '#8a8a8a', '#d8d8d8'];
const HEIGHT_S = [0.93, 1, 1.08], BUILD_W = [0.9, 1, 1.13];
const CAPKEYS = ['hair', 'kufi', 'crochet', 'topi', 'imama'];
const CAPCOLS = ['#f7f7f2', '#1c1c1c', '#2f4f7f', '#1e7a4c', '#7a1f2b', '#c9a24a', '#6b5a8e'];
const THOBES = ['#f7f7f2', '#ddd4c2', '#9aa7b3', '#2b3a55', '#4a3b2a', '#232323', '#5f7a5a', '#7d5a6b'];
const SNEAKERS = ['#e8ecf0', '#1c1c1c', '#c0392b', '#2e86de', '#f1c40f', '#27ae60', '#e67e22'];
const LOOK_TXT = { height: ['Short', 'Average', 'Tall'], build: ['Lean', 'Average', 'Solid'], beard: ['None', 'Stubble', 'Short', 'Full'],
  beardLen: ['Short', 'Medium', 'Long'], cap: ['None', 'Kufi', 'Crochet kufi', 'Topi', 'Imama'], thobeLen: ['Ankle', 'Mid-calf'] };

// --------------------------------------------------------------- STAGES
function mixDiff(a, b, t) { const A = DIFF[a], B = DIFF[b], o = {}; for (const k in A) o[k] = lerp(A[k], B[k], t); return o; }
const STAGES = [
  { name: 'Local', title: 'Metro Masjid League', mult: 1, champ: 400, stat: 4.6, diff: () => mixDiff('easy', 'medium', 0.35) },
  { name: 'State', title: 'State Masjid Championship', mult: 2, champ: 1200, stat: 5.6, diff: () => DIFF.medium },
  { name: 'National', title: 'National Masjid Invitational', mult: 3.5, champ: 3000, stat: 6.6, diff: () => mixDiff('medium', 'hard', 0.55) },
  { name: 'World', title: 'World Ummah Cup', mult: 6, champ: 6000, stat: 7.5, diff: () => DIFF.hard }
];
const ROUND_NAMES = ['Quarterfinal', 'Semifinal', 'Final'];
// Career difficulty is a level L on a ladder (0 easy, 1 medium, 2 hard, 2.5 beyond hard).
// Stage levels sit on the ladder; the Options difficulty moves one step down or up.
const HARD_PLUS = { react: 0.08, noise: 0.02, relErr: 0.015, contest: 0.02, antic: 1.0, steal: 0.95, shove: 0.4, trivia: 0.95, switchK: 0.86 };
const LADDER = [0, 0.35, 1.0, 1.55, 2.0, 2.5];              // [easier than Local, Local, State, National, World, harder than World]
function diffAt(L) {
  const mix = (A, B, t) => { const o = {}; for (const k in A) o[k] = lerp(A[k], B[k], t); return o; };
  if (L <= 1) return mix(DIFF.easy, DIFF.medium, clamp(L, 0, 1));
  if (L <= 2) return mix(DIFF.medium, DIFF.hard, L - 1);
  return mix(DIFF.hard, HARD_PLUS, clamp((L - 2) / 0.5, 0, 1));
}
function diffShift() { return { easy: -1, medium: 0, hard: 1 }[SETTINGS.difficulty] || 0; }
function careerLevels(stage) {
  const sh = diffShift();
  return { opp: LADDER[clamp(stage + 1 + sh, 0, LADDER.length - 1)], mate: LADDER[clamp(2 + sh, 0, LADDER.length - 1)] };   // teammate's base is medium
}
function diffLabel(L) { return L < 0.2 ? 'Easy' : L < 0.7 ? 'Easy-Medium' : L < 1.3 ? 'Medium' : L < 1.8 ? 'Medium-Hard' : L < 2.2 ? 'Hard' : 'Very Hard'; }
const STAT_ROWS = [['sht', 'Shooting'], ['spd', 'Speed'], ['dnk', 'Dunking'], ['def', 'Defense'], ['sta', 'Stamina'], ['pas', 'Passing'], ['hus', 'Hustle'], ['clu', 'Clutch']];
const statCost = l => Math.round(40 * Math.pow(1.35, l - 4));

// ---------------------------------------------------- ROSTER GENERATION
function seededRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const MASJID_WORDS = ['Al-Ikhlas', 'Ar-Rayyan', 'As-Sakinah', 'Al-Mizan', 'Al-Fath', 'Ar-Ridwan', 'Al-Hikmah', 'Al-Iman', 'Al-Qalam', 'Al-Firdaws',
  'Ar-Rawdah', 'Al-Bayan', 'Al-Hijrah', 'As-Sabr', 'Al-Birr', 'Al-Wafa', 'Al-Muttaqin', 'Al-Istiqamah', 'Al-Amal', 'Al-Ukhuwwah', 'At-Tawbah', 'Al-Ansar', 'Al-Khayr', 'Al-Jannah'];
const PLACES = [
  ['Riverside', 'Westbrook', 'Old Town', 'Parkview', 'Hillcrest', 'Lakeside', 'Midtown', 'Greenwood', 'Fairview', 'Maple Heights', 'Southgate'],
  ['Lakeview', 'Brookfield', 'Cedar Falls', 'Harbor City', 'Pine Ridge', 'Stonebridge', 'Clearwater', 'Oak Valley', 'Silver Lake', 'Red Bluff', 'Millbrook'],
  ['Houston', 'Chicago', 'Dearborn', 'Minneapolis', 'Atlanta', 'Philadelphia', 'Los Angeles', 'Columbus', 'Seattle', 'Dallas', 'Brooklyn', 'Denver', 'Nashville'],
  ['Istanbul, T\u00fcrkiye', 'Kuala Lumpur, Malaysia', 'Jakarta, Indonesia', 'Cairo, Egypt', 'Casablanca, Morocco', 'London, UK', 'Lagos, Nigeria', 'Lahore, Pakistan',
    'Sarajevo, Bosnia', 'Dakar, Senegal', 'Dhaka, Bangladesh', 'Toronto, Canada', 'Paris, France', 'Amman, Jordan', 'Tashkent, Uzbekistan', 'Doha, Qatar', 'Cape Town, South Africa']
];
// Given names by region (no prophets' names are used for characters).
const NAMES = {
  us: ['Omar', 'Zaid', 'Hamza', 'Khalid', 'Jamal', 'Malik', 'Rashad', 'Samir', 'Tariq', 'Anwar', 'Amir', 'Faris', 'Rayyan', 'Ziyad', 'Bashir', 'Karim', 'Nadim', 'Hakim'],
  T\u00fcrkiye: ['Emre', 'Mehmet', 'Kerem', 'Burak', 'Selim', 'Enes'], Malaysia: ['Haziq', 'Aiman', 'Rizal', 'Fikri', 'Danial', 'Irfan'], Indonesia: ['Rizky', 'Fajar', 'Bagus', 'Arif', 'Taufik', 'Hendra'],
  Egypt: ['Karim', 'Tamer', 'Hossam', 'Amr', 'Sherif', 'Mahmoud'], Morocco: ['Anas', 'Hamza', 'Othmane', 'Reda', 'Yassine', 'Amine'], UK: ['Zak', 'Imran', 'Bilal', 'Tariq', 'Kamran', 'Adil'],
  Nigeria: ['Abdullahi', 'Sani', 'Kabir', 'Bashir', 'Aminu', 'Umar'], Pakistan: ['Usman', 'Faizan', 'Saad', 'Ahsan', 'Hamza', 'Bilal'], Bosnia: ['Emir', 'Edin', 'Adnan', 'Kenan', 'Haris', 'Amar'],
  Senegal: ['Mamadou', 'Cheikh', 'Ousmane', 'Babacar', 'Modou', 'Abdou'], Bangladesh: ['Tanvir', 'Arif', 'Sabbir', 'Nabil', 'Rafiq', 'Shakib'], Canada: ['Faisal', 'Omar', 'Ali', 'Zain', 'Hassan', 'Adeel'],
  France: ['Karim', 'Rachid', 'Mehdi', 'Nabil', 'Samir', 'Walid'], Jordan: ['Laith', 'Qais', 'Fadi', 'Rami', 'Zaid', 'Tamer'], Uzbekistan: ['Jasur', 'Bekzod', 'Sardor', 'Otabek', 'Aziz', 'Timur'],
  Qatar: ['Khalifa', 'Nasser', 'Fahad', 'Jassim', 'Hamad', 'Saud'], 'South Africa': ['Ridwaan', 'Zaheer', 'Tauriq', 'Shaheed', 'Faeez', 'Riyaad']
};
const PALETTE = [['#2e7d5b', '#f1d17a'], ['#8e2b3a', '#f4e3c1'], ['#6b3fa0', '#e8d8ff'], ['#c26a1d', '#1f1f1f'], ['#127a7a', '#f3e6c4'],
  ['#3b3b3b', '#e0b04a'], ['#9c2f6e', '#f7e1ee'], ['#46602c', '#e9f0d5'], ['#b8322d', '#ffffff'], ['#5a3e2b', '#f0c987'], ['#a0522d', '#fff3e0'], ['#556b2f', '#f0e68c']];
const CRESTS = ['dome', 'crescent', 'star', 'arch', 'minaret'];
function shortOf(word) { return word.replace(/^[A-Z][a-z]-/, '').toUpperCase().slice(0, 7); }

function genTeam(R, word, place, strength, stage, colors) {
  const pr = a => a[Math.floor(R() * a.length)];
  const region = stage === 3 ? place.split(', ')[1] : 'us', pool = NAMES[region] || NAMES.us;
  const used = new Set();
  const players = [0, 1].map(s => {
    let nm; do nm = pr(pool); while (used.has(nm)); used.add(nm);
    const st = () => clamp(Math.round(strength + R() * 3 - 1.5), 3, 10);
    const p = { name: s === 0 ? 'Sh. ' + nm : nm, num: 1 + Math.floor(R() * 44), sheikh: s === 0, huffath: R() < 0.45, mufti: s === 0 && R() < 0.3, skin: pr(SKINS),
      hat: s === 0 ? pr(['kufi', 'imama', 'topi']) : pr(['hair', 'hair', 'kufi', 'crochet']), capColor: pr(CAPCOLS), hair: pr(HAIRS.slice(0, s === 0 ? 5 : 3)),
      stats: { spd: st(), sht: st(), dnk: st(), def: st(), stl: st() } };
    // archetype from its own generator (keyed to the player) so existing seeded rosters don't change
    { const keys = Object.keys(ARCHETYPES), AR = seededRng(hash32(p.name + '|' + word + '|' + place + '|' + s)); p.arch = keys[Math.floor(AR() * keys.length)]; applyArchetype(p.stats, p.arch, AR); }
    return p;
  });
  return { name: 'Masjid ' + word, short: shortOf(word), place, c1: colors[0], c2: colors[1], crest: pr(CRESTS), players };
}
const _stageCache = {};
// Index 0 is always Al-Amanah (built live from the save), 1 is the rival Al-Burhan.
function stageTeams(stage) {
  const key = C.seed + ':' + stage;
  if (_stageCache[key]) return _stageCache[key];
  const R = seededRng(C.seed * 31 + stage * 977 + 7), S = STAGES[stage];
  const words = MASJID_WORDS.slice(), places = PLACES[stage].slice(), cols = PALETTE.slice(2);
  const take = a => a.splice(Math.floor(R() * a.length), 1)[0];
  const teams = [null, rivalTeam(stage)];
  for (let i = 0; i < 6; i++) teams.push(genTeam(R, take(words), take(places), S.stat + R() * 0.8 - 0.4, stage, take(cols)));
  const div = d => Array.from({ length: 8 }, () => 'Masjid ' + take(words.length ? words : MASJID_WORDS.slice()) + ' (' + pickR(R, PLACES[stage]) + ')');
  teams.divisions = { Medium: div(), Large: div() };
  return (_stageCache[key] = teams);
}
function pickR(R, a) { return a[Math.floor(R() * a.length)]; }
function rivalTeam(stage) {
  const s = STAGES[stage].stat + 0.6, st = (a, b, c, d, e) => ({ spd: clamp(Math.round(s + a), 3, 10), sht: clamp(Math.round(s + b), 3, 10), dnk: clamp(Math.round(s + c), 3, 10), def: clamp(Math.round(s + d), 3, 10), stl: clamp(Math.round(s + e), 3, 10) });
  return { name: 'Masjid Al-Burhan', short: 'BURHAN', place: 'Northgate', c1: '#1d1d1d', c2: '#e0b04a', crest: 'minaret', rival: true, players: [
    { name: 'Sh. Hakim', num: 5, sheikh: true, huffath: true, mufti: true, skin: '#a86b45', hat: 'imama', capColor: '#232323', hair: '#3b3b3b', stats: st(-1, 1, -1, 1, 0) },
    { name: 'Jalal', num: 1, sheikh: false, huffath: false, skin: '#e0b48a', hat: 'hair', hair: '#1c1c1c', beardStyle: 2, stats: st(1, 1, 1, -1, 0) }] };
}
function teamOf(stage, i) {
  const t = i === 0 ? amanahTeam() : stageTeams(stage)[i];
  return stage === 3 && i <= 1 ? Object.assign({}, t, { place: t.place + ', USA' }) : t;
}

// --------------------------------------------------------- OUR MASJID
const CAST = {
  saleem: { name: 'Sh. Saleem', num: 7, sheikh: true, huffath: true, skin: '#c68a5a', hat: 'kufi', capColor: '#f7f7f2', hair: '#9a9a9a', thobe: '#f4f4ef' },
  khalil: { name: 'Khalil', num: 10, skin: '#8d5a3b', hat: 'hair', hair: '#161616', thobe: '#2b3a55', beardStyle: 1 },
  nasser: { name: 'Nasser', num: 24, skin: '#d9a57a', hat: 'crochet', capColor: '#1c1c1c', hair: '#3b2412', thobe: '#ddd4c2', beardStyle: 2, stats: { spd: 6, sht: 7, dnk: 5, def: 6, stl: 5 } },
  mahmoud: { name: 'Uncle Mahmoud', skin: '#b98059', hat: 'topi', capColor: '#f7f7f2', hair: '#e0e0e0', elder: true, glasses: true, thobe: '#9aa7b3' },
  rafiq: { name: 'Uncle Rafiq', skin: '#7b4a2e', hat: 'imama', capColor: '#f7f7f2', hair: '#bdbdbd', elder: true, thobe: '#f7f7f2' },
  // v5.0: youth-group kid who keeps the stat sheet (shot timing, scouting reports)
  tariq: { name: 'Tariq', num: 3, skin: '#d4a174', hat: 'crochet', capColor: '#2f4f7f', hair: '#161616', glasses: true, thobe: '#5f7a5a', beardStyle: 0, stats: { spd: 7, sht: 6, dnk: 3, def: 5, stl: 6 } },
  // v5.0: runs the chai table after Isha and keeps the win/loss streak on the chalkboard
  siddiq: { name: 'Uncle Siddiq', num: 71, skin: '#9a6440', hat: 'kufi', capColor: '#7a1f2b', hair: '#8a8a8a', elder: true, thobe: '#4a3b2a', beardStyle: 3, stats: { spd: 3, sht: 7, dnk: 1, def: 4, stl: 4 } },
  jalal: null   // filled from the rival roster
};
function saleemDef() {
  const b = Math.floor(C.stage * 0.8);
  return Object.assign({}, CAST.saleem, { stats: { spd: 5 + b, sht: Math.min(10, 7 + b), dnk: 4 + b, def: Math.min(10, 7 + b), stl: 6 + b } });
}
function playerDef() {
  const lv = C.lv, lk = C.look;
  return { name: C.name || 'You', num: lk.num, sheikh: false, huffath: true, skin: SKINS_ALL[lk.skin], hat: CAPKEYS[lk.cap], hair: HAIRS[lk.hair], look: lk,
    arch: lookArch(lk), stats: { spd: lv.spd, sht: lv.sht, dnk: lv.dnk, def: lv.def, stl: Math.round((lv.def + lv.spd) / 2), sta: lv.sta, pas: lv.pas, hus: lv.hus || 4, clu: lv.clu || 4 } };
}
function amanahTeam() { return { name: 'Masjid Al-Amanah', short: 'AMANAH', place: 'Eastside', c1: '#2c6e8f', c2: '#f2cf6b', crest: 'arch', players: [saleemDef(), playerDef()] }; }
function castDef(id) {
  if (id === 'you') return playerDef();
  if (id === 'jalal') return Object.assign({ thobe: '#232323' }, rivalTeam(0).players[1]);
  return CAST[id];
}

// ---------------------------------------------------------- SAVE STATE
const SAVE_AUTO = 'islamdunk.career.auto', SAVE_SLOT = 'islamdunk.career.slot1';
let C = null;
function freshCareer() {
  return { v: 1, seed: (Math.random() * 1e9) | 0, name: '', look: { skin: 3, height: 1, build: 1, hair: 0, beard: 2, beardLen: 1, cap: 1, capColor: 0, thobe: 0, thobeLen: 0, shoes: 0, num: 8, style: 0, teamMatch: 0 },
    stage: 0, bracket: null, bp: 0, hb: 0, lv: { sht: 4, spd: 4, dnk: 4, def: 4, sta: 4, pas: 4, hus: 4, clu: 4 }, prayBonus: false, nextAdhan: 0, lastAdhan: 0,
    trophies: [], wins: 0, losses: 0, up: {}, gamesPlayed: 0, shelfAt: 0, learned: [], lastResult: null, streak: 0, best: { ft: 0, three: 0, cones: 0, v1: 0 }, seen: {}, done: false, divChamps: {},
    // v5.0 (progression + economy); `sv` is the schema version inside the v:1 envelope so older builds still load the save
    sv: 3, stageLog: {}, beats: {}, rival: { w: 0, l: 0 }, timing: [], ct: { tmd: 0, grn: 0, early: 0, late: 0 },
    adhanSkips: 0, salahGames: 0, noSalahGames: 0, salahEp: 0, drillsSince: 0, noDrillGames: 0, sheikhSeen: {},
    // v6.0 (seasons): partner + chemistry, season number, titles by season, box scores, past seasons
    partner: 'saleem', chem: { saleem: 25, nasser: 10, khalil: 10, tariq: 5 }, season: 1, titles: [], games: [], history: [] };
}
function saveCareer(key = SAVE_AUTO) { if (!C) return false; try { localStorage.setItem(key, JSON.stringify(C)); return true; } catch (e) { return false; } }
function readSave(key) { try { const s = localStorage.getItem(key); const o = s ? JSON.parse(s) : null; return o && o.v === 1 ? o : null; } catch (e) { return null; } }
function loadCareer(key) { const o = readSave(key); if (!o) return false; C = Object.assign(freshCareer(), o); C.up = C.up || {};
  // v3.3 migration: older saves get the new fields with safe defaults
  if (!Array.isArray(C.learned)) C.learned = [];
  if (C.look) { if (C.look.style == null) C.look.style = 0; if (C.look.teamMatch == null) C.look.teamMatch = 0; }   // v4.4
  if (C.lv && C.lv.hus == null) C.lv.hus = 4; if (C.lv && C.lv.clu == null) C.lv.clu = 4;   // v4.3: new stats
  if (typeof o.gamesPlayed !== 'number') C.gamesPlayed = (C.wins || 0) + (C.losses || 0);   // count games already played
  if (typeof C.shelfAt !== 'number') C.shelfAt = 0;
  if (typeof C.streak !== 'number') C.streak = 0;
  migrateV5(o); migrateV6(o);
  return true; }
// v5.0 migration: saves from before the progression update get a stage log (earlier
// stages marked as legacy, the current one counted from its bracket), plus the new
// habit/timing/rival trackers. Nothing already earned is changed.
function migrateV5(o) {
  if ((o.sv || 1) >= 2) {                                   // already v5: only fill anything missing
    for (const k of ['stageLog', 'beats', 'sheikhSeen']) if (!C[k] || typeof C[k] !== 'object') C[k] = {};
    if (!Array.isArray(C.timing)) C.timing = [];
    if (!C.rival || typeof C.rival !== 'object') C.rival = { w: 0, l: 0 };
    if (!C.ct || typeof C.ct !== 'object') C.ct = { tmd: 0, grn: 0, early: 0, late: 0 };
    return;
  }
  C.sv = 2; C.stageLog = {}; C.beats = {}; C.sheikhSeen = {}; C.timing = []; C.ct = { tmd: 0, grn: 0, early: 0, late: 0 };
  for (let s = 0; s < (C.stage || 0); s++) C.stageLog[s] = { legacy: true, w: 0, l: 0, entries: 0, top: [], ach: [], moments: ['Champions'], bp: 0, hb: 0, rw: 0, rl: 0, champ: true };
  if (C.done && !C.stageLog[3]) C.stageLog[3] = { legacy: true, w: 0, l: 0, entries: 0, top: [], ach: [], moments: ['Champions'], bp: 0, hb: 0, rw: 0, rl: 0, champ: true };
  const b = C.bracket, cur = slog(C.stage);
  if (b && b.rounds && !C.done) {                            // wins already banked in the current bracket
    for (const r of b.rounds) for (const m of r) if ((m.a === 0 || m.b === 0) && m.w != null) { if (m.w === 0) cur.w++; else cur.l++; }
  }
  C.rival = { w: 0, l: 0 };
  // pre-v5 saves have already met the original cast; let the new faces introduce themselves once
  C.seen = C.seen || {}; C.seen.meetNew = false;
}
function slog(st) { return C.stageLog[st] || (C.stageLog[st] = { w: 0, l: 0, entries: 1, top: [], ach: [], moments: [], bp: 0, hb: 0, rw: 0, rl: 0 }); }

// ------------------------------------------------------------- BRACKETS
function makeBracket(stage) {
  const R = seededRng(C.seed + stage * 131 + (C.retries || 0) * 17);
  const mid = [2, 3, 4, 5, 6, 7];
  for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
  return { round: 0, out: false, rounds: [pairs([0, ...mid, 1])] };   // rival seeded on the other half
}
function ourMatch() { const b = C.bracket; return b.rounds[b.round].find(m => m.a === 0 || m.b === 0); }
function teamPower(stage, i) { return teamOf(stage, i).players.reduce((s, p) => s + p.stats.spd + p.stats.sht + p.stats.dnk + p.stats.def + p.stats.stl, 0); }
function simCareerMatch(m) {
  const d = (teamPower(C.stage, m.a) - teamPower(C.stage, m.b)) * 0.6;
  m.sa = Math.round(44 + rand(-10, 12) + d); m.sb = Math.round(44 + rand(-10, 12) - d);
  if (m.sa === m.sb) m.sa += 2;
  m.w = m.sa > m.sb ? m.a : m.b;
}
// Record our result, simulate the rest of the round, advance. Returns 'next' | 'out' | 'champ'.
function recordCareerResult(won, us, them) {
  const b = C.bracket, m = ourMatch();
  if (m.a === 0) { m.sa = us; m.sb = them; } else { m.sb = us; m.sa = them; }
  m.w = won ? 0 : (m.a === 0 ? m.b : m.a);
  for (const o of b.rounds[b.round]) if (o !== m) simCareerMatch(o);
  if (!won) { b.out = true; return 'out'; }
  if (b.round === 2) {
    const R = seededRng(C.seed + C.stage * 7), T = stageTeams(C.stage).divisions;
    C.divChamps[C.stage] = { Medium: pickR(R, T.Medium), Large: pickR(R, T.Large) };
    return 'champ';
  }
  b.rounds.push(pairs(b.rounds[b.round].map(x => x.w))); b.round++;
  return 'next';
}

// -------------------------------------------------------------- REWARDS
// v5.0 economy.
// Halal Bucks (HB) are cosmetic only: they buy masjid and gym projects and never touch
// stats (buyProject is their only spend). Nearly all HB comes from winning: each round
// won pays more (quarterfinal < semifinal < final), titles pay the most, and both scale
// up at State, National and World. Losses and practice pay a small amount so progress
// never fully stalls.
// Barakah Points (BP) buy stat levels. They come from winning and from how you play:
// scoring, assists, defense (steals, blocks, charges), clean play, salah and drill
// personal bests. A stage multiplier keeps late upgrades (which cost more) about as
// reachable per game as early ones.
const ECON = {
  hbWin: 80, hbRoundK: [1, 1.25, 1.5], hbLoss: 10, hbRival: 60,   // x STAGES[].mult (1, 2, 3.5, 6); titles: STAGES[].champ
  hbPractice: 3, hbPracticeBonus: 2,                                // per drill, x (1 + stage / 2)
  bpStageK: [1, 1.25, 1.55, 1.9], bpDrillK: [1, 1.15, 1.3, 1.45],
  bpPB: 15, bpSalah: 10
};
const stageOf = () => (C && C.stage) || 0;
function drillBP(n, st = stageOf()) { return Math.round(n * ECON.bpDrillK[st]); }
function practiceHB(bonus, st = stageOf()) { return Math.round((ECON.hbPractice + (bonus ? ECON.hbPracticeBonus : 0)) * (1 + st / 2)); }
function careerRewards(won, champ, ctx = {}) {
  const me = M.players.find(p => p.human === 0), s = me.stats, st = ctx.stage != null ? ctx.stage : C.stage, S = STAGES[st];
  const bp = [];
  if (won) bp.push(['Win', 40]); else bp.push(['Effort', 10]);
  if (s.pts) bp.push(['Points (' + s.pts + ')', s.pts]);
  if (s.ast) bp.push(['Assists (' + s.ast + ')', s.ast * 6]);
  const stl = s.stl || 0, blk = s.blk || 0, chg = s.chg || 0, stops = stl + blk + chg;
  if (stops) {
    const parts = [stl && stl + ' stl', blk && blk + ' blk', chg && chg + ' chg'].filter(Boolean).join(', ');
    bp.push([stops >= 4 ? 'Defensive anchor (' + stops + ' stops)' : 'Defense (' + parts + ')', stl * 4 + blk * 4 + chg * 8 + (stops >= 4 ? 15 : 0)]);
  }
  if (s.reb) bp.push(['Rebounds (' + s.reb + ')', s.reb * 2]);
  if (!me.shoves) bp.push(won ? ['Sportsmanship: clean win', 25] : ['Clean play, no shoves', 15]);
  if (me.hardFouls) bp.push(['Hard fouls called (' + me.hardFouls + ')', -8 * me.hardFouls]);
  if (ctx.salah) bp.push(['Prayed before the game', ECON.bpSalah]);
  const base = bp.reduce((a, b) => a + b[1], 0), k = ECON.bpStageK[st];
  if (k > 1 && base > 0) bp.push([S.name + ' stage bonus (x' + k + ')', Math.round(base * (k - 1))]);
  const round = ctx.round || 0, hb = [];
  if (won) hb.push(['Win (' + (ctx.roundName || ROUND_NAMES[round]) + ')', Math.round(ECON.hbWin * ECON.hbRoundK[round] * S.mult)]);
  else hb.push(['Game played', Math.round(ECON.hbLoss * S.mult)]);
  if (won && ctx.rival) hb.push(['Beat Al-Burhan', Math.round(ECON.hbRival * S.mult)]);
  if (champ) hb.push([S.name + ' champions', S.champ]);
  return { bp, hb, bpTotal: bp.reduce((a, b) => a + b[1], 0), hbTotal: hb.reduce((a, b) => a + b[1], 0) };
}

// ---------------------------------------------------------------- STORY
// Short dialogue beats between games: [speaker, line]. Speakers are CAST ids.
const STORY = {
  intro: [
    ['saleem', 'Assalamu alaikum! You must be the brother who just moved to Eastside. Welcome to Masjid Al-Amanah.'],
    ['khalil', "Welcome to the gym! It's also the overflow musalla, the Sunday school, and the potluck hall. Watch out for folding chairs."],
    ['nasser', 'The rim on the left is bent. Shoot at the right one.'],
    ['mahmoud', 'Beta, in 1987 I scored forty points in this gym. Nobody was keeping score, but I know.'],
    ['tariq', "I'm Tariq, from the youth group. Somebody keeps score now. Every shot, every release, every assist. It's all on the sheet."],
    ['siddiq', "And I'm Uncle Siddiq. Chai after Isha, and the chalkboard by the door keeps our streak. May it only go up."],
    ['saleem', "We're a small masjid, and we've never won the Metro Masjid League. But we play with adab, and we play for each other."],
    ['saleem', "You'll run the two-man game with me. Practice in the gym, earn Barakah Points, and get stronger. The league starts soon, in sha Allah."],
    ['nasser', "One shooting tip: let it go at the top of your jump. Watch the meter for the green. And don't force it with a hand in your face, pass instead."]
  ],
  stageIntro: [
    [['jalal', "Al-Amanah is entering the league? Didn't your team lose to our youth group last year?"], ['khalil', 'That was a... strategic loss.'],
      ['saleem', 'Salaam, Jalal. May the better team win, and may we all pray Maghrib together after.'],
      ['tariq', "Before every game I'll bring you a scouting report. Their record, their best player, one tip. Short. I promise."]],
    [['saleem', 'The State Masjid Championship. Eight of the best small masjids in the state.'], ['rafiq', "Travel light, pray on time, and don't eat gas station food before a game."],
      ['jalal', 'Al-Burhan made it too. You beat us once. It will not happen twice.'],
      ['siddiq', "I packed two thermoses. One for us, one for Al-Burhan. Rivals still drink chai."]],
    [['saleem', 'Nationals. Brothers from masjids across the country, all in one gym.'], ['nasser', "I looked up the other teams. They're good."],
      ['khalil', "We're good too! ...Right?"], ['tariq', "We are. Our assist numbers went up every stage. I made a chart."],
      ['saleem', "We prepare, we make du'a, and we leave the rest to Allah."]],
    [['saleem', 'The World Ummah Cup. Istanbul, Kuala Lumpur, Lagos, Sarajevo. The whole ummah in one tournament.'],
      ['mahmoud', 'Whatever happens, you are representing all of us back home. Represent us well.'],
      ['jalal', 'Two teams from our country made it. Let us make sure one of us brings it home.'],
      ['siddiq', "Whatever the chalkboard says after this, I'm proud of all of you. Now go. The chai will wait."]]
  ],
  win: [
    [['rafiq', 'Good win. Now go help stack the chairs. Humility is also a muscle.']],
    [['saleem', 'Alhamdulillah. We thank Allah first, then we thank whoever grabbed those rebounds.']],
    [['khalil', 'Did you see that? DID YOU SEE THAT?'], ['nasser', 'Everyone saw it, Khalil.']],
    [['mahmoud', 'Very nice. In my day we also won. Stay hungry, but eat first.']]
  ],
  loss: [
    [['saleem', 'Sabr. A loss is a teacher if you let it be one.'], ['nasser', "Free throws after Isha. I'll rebound for you."]],
    [['mahmoud', 'In 1987 we lost too. Then we had chai and came back. Have some chai.'], ['khalil', 'Next time we get them, bi idhnillah.']],
    [['rafiq', 'Losing is not the shame. Losing your adab is the shame. You kept yours.'], ['saleem', 'We enter the tournament again. Same effort, more practice.']]
  ],
  lossRival: [['jalal', 'Good game. You pushed us all the way. Do not quit now.'], ['saleem', 'He is right. Back to the gym.']],
  stageWin: [
    [['khalil', 'LOCAL CHAMPIONS! Put it on the whiteboard! Put it on every whiteboard!'], ['saleem', 'Alhamdulillah. First trophy in our history. Now, who is helping put the chairs back?'],
      ['jalal', 'Good game. You earned it. Go represent the city at State.'], ['mahmoud', 'The aunties are making biryani for the whole team.']],
    [['saleem', 'State champions, alhamdulillah. Remember how we felt after our first loss? Patience brought us here.'],
      ['jalal', 'We qualified for Nationals too. Save us a seat.'], ['rafiq', 'Be humble in winning. The trophy is heavy, but a big ego is heavier.']],
    [['nasser', "National champions. I don't know what to say."], ['khalil', 'I do! ALHAMDULILLAH!'],
      ['saleem', "We came from a gym with a bent rim. Now we meet masjids from all over the world. Let's be good guests and good ambassadors."]],
    [['saleem', 'World Ummah Cup champions. Subhanallah.'], ['saleem', 'Whatever we won, remember why we played: brotherhood, adab, and representing our community.'],
      ['mahmoud', 'In 1987 I scored forty points. But this... this is better.'], ['khalil', 'Can we fix the left rim now?'], ['nasser', 'We can fix the left rim now.']]
  ],
  tips: ['Bend your knees on free throws. And your ego.', 'Barakah is in sharing. Pass to the open brother.', "Box out. The rebound doesn't come to the one who waits.",
    'Hold shoot and let go at the top of your jump. Green on the meter is money.', 'A contested shot is a gift to the other team. Find the open brother.', "Change direction while dribbling. The defender's ankles will need a break.",
    'Sprint at the rim and shoot: that is a dunk. Use it wisely.', 'Pray before the game, not just after it.', 'Defense is patience. Stay between your man and the rim.',
    'Help the man who falls, even if he wears the other jersey.', 'Talk on defense. A quiet team gets screened.', 'Stay low on defense. Tall legs, short temper, both are trouble.',
    'Shake hands before tip-off. Adab first, then basketball.', 'Drink water. Your legs will thank you in the fourth.', 'A good pass makes two people happy.']
};

