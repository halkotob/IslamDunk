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
