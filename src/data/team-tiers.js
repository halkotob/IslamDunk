// ================================================= v9.31.0: TEAM STRENGTH TIERS
// Quick play and online: the eight masjid teams were all about the same (players averaging 6.6 to 6.9), so only the
// difficulty setting decided how hard a game was and picking a team didn't matter. Now they come in three tiers:
//   Underdogs   (Ar-Rahmah, Al-Ihsan)                -1 on every core rating (about 5.6 to 5.9)
//   Solid       (Al-Noor, At-Taqwa, Al-Huda, Al-Falah) as they were         (about 6.6 to 6.8)
//   Powerhouse  (As-Salam, Al-Furqan, the rival)     +2 on every core rating (about 8.7 to 8.8, capped at 10)
// (+2, not +1: at +1 a Solid team still beat a Powerhouse 17 times in 40, CPU v CPU on Medium; ratings already at 8-9
// gain less from a point than mid ratings lose. At +2: 21 in 80. An Underdog beats a Solid team 5 in 40.)
// Each player keeps his shape (and so his archetype, which comes from his strongest rating); hustle and clutch are
// worked out again from the new ratings, as the team list does. The story career is unchanged: it scales every masjid
// team to its stage's level anyway (storyTeamAt), by the team's average.
// Team select shows the tier and an overall rating (the players' average core rating x 10, out of 99) on each card.
// (Runs right after src/data/teams.js, before anything copies the teams; the shared helpers aren't defined yet, so no
// clamp.)
const TEAM_TIER = { 'Masjid Ar-Rahmah': -1, 'Masjid Al-Ihsan': -1, 'Masjid As-Salam': 2, 'Masjid Al-Furqan': 2 };
const TIER_NAME = { '-1': 'UNDERDOGS', '0': 'SOLID', '1': 'POWERHOUSE', '2': 'POWERHOUSE' }, TIER_COL = { '-1': '#9fd3ff', '0': '#e8e2cf', '1': '#ffd76a', '2': '#ffd76a' };
const TEAM_CORE = ['spd', 'sht', 'dnk', 'def', 'stl'];
const MASJID_NAMES = new Set(TEAMS.map(T => T.name));                    // (the eight, as they load: a copy can carry another name)
for (const T of TEAMS) {
  const d = TEAM_TIER[T.name] || 0;
  if (!d) continue;
  for (const p of T.players) {
    for (const k of TEAM_CORE) p.stats[k] = Math.max(1, Math.min(10, p.stats[k] + d));
    p.stats.hus = hustleOf(p.stats); p.stats.clu = clutchOf(p.stats, { sheikh: p.sheikh });
  }
}
function teamOverall(T) {
  const ps = (T && T.players) || []; if (!ps.length) return 0;
  const avg = ps.reduce((a, p) => a + TEAM_CORE.reduce((b, k) => b + (p.stats[k] || 5), 0), 0) / (ps.length * TEAM_CORE.length);
  return Math.min(99, Math.round(avg * 10));
}
function teamTierOf(T) {
  if (!T) return 0;
  if (MASJID_NAMES.has(T.name)) return TEAM_TIER[T.name] || 0;          // (by name: the lobby and the 1 on 1 select work on copies)
  const o = teamOverall(T); return o < 63 ? -1 : o > 73 ? 1 : 0;         // (any other team, your career's or a custom one: by its rating; a career
                                                                           // team's own .tier is its place in its stage, not this)
}
// the badge on each team-select card: tier and overall, top right of the card's colour band
{
  const _dtp = drawTeamPanel;
  drawTeamPanel = function (g, x, y, T) {
    const r = _dtp.apply(this, arguments);
    if (!T || !T.players) return r;
    const t = teamTierOf(T), label = TIER_NAME[t] + '  ' + teamOverall(T), col = TIER_COL[t];
    g.save(); g.font = `12px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle';
    const w = g.measureText(label).width + 18, bx = x + 410 - w, by = y - 11;   // (a tab on the card's top edge: clear of the controller dots in the band)
    g.fillStyle = 'rgba(8,14,22,0.78)'; roundRect(g, bx, by, w, 22, 11); g.fill();
    g.strokeStyle = col; g.lineWidth = 1.2; roundRect(g, bx, by, w, 22, 11); g.stroke();
    g.fillStyle = col; g.fillText(label, x + 410 - 9, by + 11.5);
    g.restore();
    return r;
  };
}
// the online lobby's team pick: the tier and overall at the right of the side's heading
{
  const _ts = tsSide;
  tsSide = function (g, X, side) {
    const r = _ts.apply(this, arguments), t = side && side.t;
    if (!t || !t.players || !X) return r;
    const k = teamTierOf(t);
    g.save(); g.font = `12px ${FONT}`; g.textAlign = 'right'; g.fillStyle = TIER_COL[k]; g.fillText(TIER_NAME[k] + '  ' + teamOverall(t), X.x + X.w - 14, 52 + 20); g.restore();
    return r;
  };
}
