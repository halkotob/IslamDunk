// ================================================= EXPERIMENT (claude/exp-team-builder): ROSTERS OF FIVE
// Teams & Players: a team you make can have up to five players. Two of them start (the game is 2 on 2); the rest are
// the bench, picked from before a game (no substitutions during it).
//   * The editor: Player 1 to Player 5 (3 to 5 can be empty), and Starters: which two of them play.
//   * A match uses the starters (csTeamDef's players), so Quick Play, online, the career league and share codes keep
//     working as before; the full roster rides along as T.roster5 for the screens that let you change the starters.
// Next on this branch: changing the starters on team select before a game, the bench in share codes, then images.
const CS_ROSTER_MAX = 5;
function csStarters(t) {
  const n = (t.roster || []).filter(Boolean).length, s = Array.isArray(t.start) ? t.start.filter(i => i >= 0 && i < n) : [];
  return s.length === 2 && s[0] !== s[1] ? s : [0, Math.min(1, n - 1)];
}
function csStarterPairs(n) { const out = []; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) out.push([a, b]); return out; }
{
  // the team's match players are its starters; the whole roster travels as roster5
  const _td = csTeamDef;
  csTeamDef = function (t) {
    const T = _td.apply(this, arguments), R = (t.roster || []).filter(Boolean);
    if (R.length > 2) {
      const all = R.map(csResolve), st = csStarters(t);
      T.players = st.map(i => all[i]); T.roster5 = all; T.start = st.slice();
    }
    return T;
  };
  // the editor: five slots and the starters
  const _er = csEditRows;
  csEditRows = function () {
    const rows = _er.apply(this, arguments), e = CSUI.edit;
    if (!e || e.kind !== 'team') return rows;
    const t = e.rec, ch = csRosterChoices(), keys = ch.map(csRefKey);
    const i0 = rows.findIndex(r => r.label === 'Player 1'); if (i0 < 0) return rows;
    const slot = s => ({
      label: 'Player ' + (s + 1) + (s >= 2 ? ' (bench)' : ''),
      get: () => t.roster[s] ? csRefName(t.roster[s]) : 'Empty',
      step: d => {
        const opts = s >= 2 ? [null, ...ch] : ch, cur = t.roster[s] ? keys.indexOf(csRefKey(t.roster[s])) + (s >= 2 ? 1 : 0) : 0;
        const taken = new Set(t.roster.filter((r, k) => r && k !== s).map(csRefKey));   // (nobody twice on one team)
        let j = cur < 0 ? 0 : cur, nx = null;
        for (let tries = 0; tries < opts.length; tries++) { j = (j + d + opts.length) % opts.length; nx = opts[j]; if (!nx || !taken.has(csRefKey(nx))) break; }
        if (nx) t.roster[s] = nx; else t.roster.length = s;                 // (emptying a bench slot empties the ones after it)
        t.start = csStarters(t);
      }
    });
    const n = () => (t.roster || []).filter(Boolean).length;
    const starters = { label: 'Starters', get: () => csStarters(t).map(i => csRefName(t.roster[i])).join(' & '),
      step: d => { const P = csStarterPairs(n()), cur = P.findIndex(p => p[0] === csStarters(t)[0] && p[1] === csStarters(t)[1]); t.start = P[((cur < 0 ? 0 : cur) + d + P.length) % P.length]; } };
    const shown = Math.min(CS_ROSTER_MAX, Math.max(2, n() + 1));
    const slots = []; for (let s = 0; s < shown; s++) slots.push(slot(s));
    rows.splice(i0, 2, ...slots, ...(n() > 2 ? [starters] : []));
    return rows;
  };
}
// ---------------------------------------------------------------- your teams in the story career
// "Join career" (up to six of your teams) puts them in the story's fields, at every stage: alongside (a generated team
// makes room first, then a masjid team) or, with Career spot set, in place of that masjid. Al-Furqan, the rival with
// his own story, keeps his place. Every team of yours is scaled to the stage like the masjid teams are (storyTeamAt:
// your team's shape at the stage's level), so a team of tens can't walk through the career, and a weak one is a game.
const CS_SPOTS = () => ['', ...TEAMS.filter(t => t.short !== 'FURQAN').map(t => t.name)];
{
  const cache = {};
  const _stg = stageTeams;
  stageTeams = function (stage) {
    const base = _stg.apply(this, arguments);
    if (typeof storyOn !== 'function' || !storyOn() || !Array.isArray(base)) return base;
    const d = csLoad(), mine = (d.league || []).map(id => d.teams.find(t => t.id === id)).filter(Boolean).slice(0, 6);
    if (!mine.length) return base;
    const key = 'cs:' + C.seed + ':' + stage + ':' + mine.map(t => t.id + '>' + (t.spot || '') + ':' + JSON.stringify(csTeamDef(t))).join(',');   // (any change to a team builds again)
    if (cache[key]) return cache[key];
    const out = base.slice(); out.divisions = base.divisions;
    const S = STAGES[stage], R = seededRng(C.seed * 13 + stage * 71 + 5), first = stage < 3 ? 2 : 1;
    const taken = new Set();
    const isMasjid = T => TEAMS.some(m => m.name === T.name);
    for (const t of mine) {
      let i = t.spot ? out.findIndex((T, k) => k >= first && T && T.name === t.spot && !taken.has(k)) : -1;
      if (i < 0) i = out.findIndex((T, k) => k >= first && T && !isMasjid(T) && !T.mine && !taken.has(k));    // a generated team first
      if (i < 0) for (let k = out.length - 1; k >= first; k--) if (!taken.has(k) && out[k] && !out[k].mine) { i = k; break; }
      if (i < 0) break;                                                    // (the field is full of your teams)
      taken.add(i);
      out[i] = Object.assign(storyTeamAt(csTeamDef(t), S.stat + R() * 0.6 - 0.3), { place: 'Your league', mine: true });
    }
    const pw = T => T.players.reduce((a, p) => a + p.stats.spd + p.stats.sht + p.stats.dnk + p.stats.def + p.stats.stl, 0);
    const ranked = out.slice(1).sort((a, b) => pw(b) - pw(a)), third = Math.max(1, Math.round(ranked.length / 3));
    ranked.forEach((T, k) => { T.tier = k < third ? 1 : k >= ranked.length - third ? -1 : 0; });
    return (cache[key] = out);
  };
  // the team editor: Career spot
  const _er = csEditRows;
  csEditRows = function () {
    const rows = _er.apply(this, arguments), e = CSUI.edit;
    if (!e || e.kind !== 'team') return rows;
    const t = e.rec, spots = CS_SPOTS(), i = rows.findIndex(r => r.label === 'Home court');
    rows.splice(i < 0 ? rows.length : i + 1, 0, { label: 'Career spot', get: () => t.spot ? 'In place of ' + t.spot.replace('Masjid ', '') : 'Alongside the masjids',
      step: dd => { const j = Math.max(0, spots.indexOf(t.spot || '')); t.spot = spots[(j + dd + spots.length) % spots.length]; t.rev = (t.rev || 0) + 1; } });
    return rows;
  };
}
// ---------------------------------------------------------------- your characters in place of the story's brothers
// A player you make can take a story brother's place (Story role: "Replaces Ilyas"). Everywhere that brother appears
// (the story's scenes, the walks, the team he plays for, the mini games) it's your player: his look and his name, and
// the brother's lines are his, with the brother's name in everyone else's lines changed to his. His ratings keep their
// shape at the brother's level for the stage (scaled like the teams: the brother's average, your player's spread), and
// his play style is his own. One player a role.
const STORY_CAST_ORIG = {};
function csStoryRoles() { const d = csLoad(), out = {}; for (const p of d.players) if (p.story && STORY_MATES.includes(p.story) && !out[p.story]) out[p.story] = p; return out; }
function csStoryCastApply() {
  for (const id of STORY_MATES) { if (!STORY_CAST_ORIG[id] && CAST[id]) STORY_CAST_ORIG[id] = CAST[id]; if (STORY_CAST_ORIG[id]) CAST[id] = STORY_CAST_ORIG[id]; }
  const R = csStoryRoles();
  for (const [id, p] of Object.entries(R)) {
    const d = csPlayerDef(p), o = STORY_CAST_ORIG[id] || {};
    CAST[id] = Object.assign({}, o, { name: d.name, num: d.num, sheikh: d.sheikh, huffath: d.huffath, skin: d.skin, hat: d.hat, hair: d.hair, look: d.look, custom: true, storyOf: id });
  }
  csNameMap = null;
}
// the names in the lines: the brother's whole name first ("Ammo Jamil"), then his name without the title ("Jamil")
let csNameMap = null;
const CS_TITLES = /^(Sh\.|Ammo|Ustath|Qari|Imam|Hafiz|Mufti|Uncle)\s+/;
function csRename(text) {
  if (typeof text !== 'string') return text;
  if (!csNameMap) {
    csNameMap = [];
    for (const [id, p] of Object.entries(csStoryRoles())) {
      const o = STORY_CAST_ORIG[id]; if (!o || !o.name) continue;
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), full = o.name, bare = full.replace(CS_TITLES, '');
      csNameMap.push([new RegExp('\\b' + esc(full) + '\\b', 'g'), p.name]);
      if (bare !== full) csNameMap.push([new RegExp('\\b' + esc(bare) + '\\b', 'g'), p.name]);
    }
  }
  let t = text; for (const [re, n] of csNameMap) t = t.replace(re, n); return t;
}
function csRenameLines(lines) {
  if (!Array.isArray(lines) || !csNameMap && !Object.keys(csStoryRoles()).length) return lines;
  return lines.map(l => {
    if (!Array.isArray(l)) return l;
    if (l[0] === 'choice' && Array.isArray(l[1])) return ['choice', l[1].map(([label, reply]) => [csRename(label), csRenameLines(reply)])];
    return [l[0], csRename(l[1]), ...l.slice(2)];
  });
}
{
  csStoryCastApply();
  const _sv = csSave; csSave = function () { const r = _sv.apply(this, arguments); csStoryCastApply(); return r; };
  // the lines of every scene, and the walks' speech bubbles
  const _ps = playStory; playStory = function (lines) { const a = Array.from(arguments); a[0] = csRenameLines(lines); return _ps.apply(this, a); };
  if (typeof swBubble === 'function') { const _sb = swBubble; swBubble = function (g, x, y, who, text) { const a = Array.from(arguments); a[4] = csRename(text); return _sb.apply(this, a); }; }
  // his ratings: his shape at the brother's level for the stage; his own play style
  const _ms = storyMateStats;
  storyMateStats = function (id, stage) {
    const s = _ms.apply(this, arguments), p = csStoryRoles()[id]; if (!p) return s;
    const keys = Object.keys(s), mean = o => keys.reduce((a, k) => a + (o[k] == null ? 5 : o[k]), 0) / keys.length;
    const mine = csPlayerDef(p).stats, dlt = Math.round(mean(s) - mean(mine)), out = {};
    for (const k of keys) out[k] = Math.max(1, Math.min(10, Math.round((mine[k] == null ? 5 : mine[k]) + dlt)));
    return out;
  };
  const _md = storyMateDef;
  storyMateDef = function (id) { const d = _md.apply(this, arguments), p = csStoryRoles()[id]; if (p) d.arch = csPlayerDef(p).arch || d.arch; return d; };
  // the player editor: Story role, under the name
  const _er = csEditRows;
  csEditRows = function () {
    const rows = _er.apply(this, arguments), e = CSUI.edit;
    if (!e || e.kind === 'team' || CSUI.sec !== 0) return rows;
    const p = e.rec, i = rows.findIndex(r => r.label === 'Name'), opts = ['', ...STORY_MATES];
    const nameOf = id => (STORY_CAST_ORIG[id] || CAST[id] || {}).name || id;
    rows.splice(i + 1, 0, { label: 'Story role', get: () => p.story ? 'Replaces ' + nameOf(p.story) : 'None',
      step: dd => { const taken = new Set(csLoad().players.filter(q => q !== p && q.story).map(q => q.story)); let j = Math.max(0, opts.indexOf(p.story || ''));
        for (let n = 0; n < opts.length; n++) { j = (j + dd + opts.length) % opts.length; if (!opts[j] || !taken.has(opts[j])) break; }
        p.story = opts[j]; } });
    return rows;
  };
}
