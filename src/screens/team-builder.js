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
