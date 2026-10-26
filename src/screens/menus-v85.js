// ================================================= v8.5: SHORTER, GROUPED MENUS
// Lists had grown past the bottom of the screen (Quick Play had 7 entries, Settings 16). Every list
// is now 6 entries or fewer, grouped by what you're trying to do. Groups can nest.
//   Title:    Career • Quick Play • Online • Teams & Players • Options
//   Quick Play: Play a game ▸ (1 player, 2 players co-op, 3 on 3) • Barakah Run • Mini games •
//               Daily challenges ▸ • Tutorial
//   Options:  Profile • Settings • Extras ▸ (Fun modes, Achievements, Personal bests) • How to play • About
//   Settings: Game • Controls & camera • Sound & display, each opening its own short list
//   Hub → My Player: Upgrade stats • Goals & badges • Customize • Records ▸ (stats, summaries, journal)
{
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    const raw = _tm(), all = {};
    const collect = list => { for (const e of list) { if (e.sub) collect(e.sub); all[e.label.replace(/\s+\(LV.*\)$/, '').trim()] = e; } };
    collect(raw);
    const get = (...names) => names.map(n => all[n]).filter(Boolean);
    const profItem = raw.flatMap(e => e.sub || []).find(e => /^Profile/.test(e.label));
    const menu = [];
    if (all.Career) menu.push(all.Career);
    const qp = [];
    const play = get('1 player', '2 players co-op', '3 on 3 (beta)');
    if (play.length) qp.push({ label: 'Play a game', sub: play });
    qp.push(...get('Barakah Run', 'Mini games'));
    const daily = get('Daily Scenario', 'Daily Hot Spot Challenge');
    if (daily.length) qp.push({ label: 'Daily challenges', sub: daily });
    qp.push(...get('Tutorial: learn to play'));
    menu.push({ label: 'Quick Play', sub: qp });
    const on = raw.find(e => e.label === 'Online'); if (on) menu.push(on);
    const tp = raw.find(e => e.label === 'Teams & Players'); if (tp) menu.push(tp);
    const op = [];
    if (profItem) op.push(profItem);
    op.push(...get('Settings'));
    const ex = get('Fun Modes', 'Achievements', 'Personal bests'); if (ex.length) op.push({ label: 'Extras', sub: ex });
    op.push(...get('How to play', 'About'));
    menu.push({ label: 'Options', sub: op });
    const rv = raw.find(e => e.label === 'Review'); if (rv) menu.push(rv);
    // anything a future file adds that isn't placed above still shows up, under Options
    const placed = new Set(); const mark = l => l.forEach(e => { placed.add(e); if (e.sub) mark(e.sub); }); mark(menu);
    for (const e of raw) if (!placed.has(e) && !(e.sub && e.sub.every(x => placed.has(x)))) op.push(e);
    return menu;
  };
}
// ---- settings in three short groups
const SET_GROUPS = [
  { name: 'Game', labels: ['Difficulty', 'Keep games close (rubber-band)', 'Format', 'Period length', 'Team control'] },
  { name: 'Controls & camera', labels: ['Controls', 'Dribble', 'Ball magnet', 'Camera (C in game)', 'Depth aids'] },
  { name: 'Sound & display', labels: null }                    // everything else
];
function setGroupItems(gi) {
  const used = new Set(SET_GROUPS.flatMap(g => g.labels || [])), G = SET_GROUPS[gi];
  return SET_ITEMS.filter(s => s.label !== 'Back' && (G.labels ? G.labels.includes(s.label) : !used.has(s.label)));
}
{
  settingsUpdate = function () {
    if (Game.setGroup == null) {
      const n = SET_GROUPS.length + 1;
      menuNav(n, i => { if (i === n - 1) goTitle(); else { Game.setGroup = i; Game.idx = 0; } });
      if (menuHit('back')) goTitle();
      return;
    }
    const L = setGroupItems(Game.setGroup), n = L.length + 1, back = () => { Game.idx = Game.setGroup; Game.setGroup = null; };
    Game.idx = Math.min(Game.idx, n - 1);
    menuNav(n, i => { if (i === n - 1) back(); else L[i].step(1); });
    if (Game.idx < n - 1 && menuHit('left')) { L[Game.idx].step(-1); SFX.blip(); }
    if (Game.idx < n - 1 && menuHit('right')) { L[Game.idx].step(1); SFX.blip(); }
    if (menuHit('back')) back();
  };
  drawSettings = function (g) {
    dim(g, 0.72);
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`;
    if (Game.setGroup == null) {
      g.fillText('Settings', W / 2, 110);
      g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Difficulty changes CPU reaction, decisions and timing. Player stats never change.', W / 2, 138);
      const labels = [...SET_GROUPS.map(s => s.name), 'Back'];
      drawMenuList(g, 'setgroups', labels.map((label, i) => ({ label, sub: i < SET_GROUPS.length ? [] : null })), Game.idx, 210, 46,
        i => { Game.idx = i; if (i === labels.length - 1) goTitle(); else { Game.setGroup = i; Game.idx = 0; } }, i => { Game.idx = i; });
      return;
    }
    const G = SET_GROUPS[Game.setGroup], L = setGroupItems(Game.setGroup);
    g.fillText(G.name, W / 2, 104);
    g.fillStyle = '#f2cf6b'; g.font = `13px ${FONT}`; g.fillText('‹  SETTINGS', W / 2, 134);
    addRect(W / 2 - 110, 118, 220, 24, () => { Game.idx = Game.setGroup; Game.setGroup = null; });
    drawMenu(g, [...L.map(s => s.label), 'Back'], Game.idx, 190, i => { if (i === L.length) { Game.idx = Game.setGroup; Game.setGroup = null; } else L[i].step(1); }, [...L.map(s => s.get()), ''], Math.min(44, Math.floor((H - 216) / (L.length + 1))));   // v8.6.2: longer lists close up to fit
  };
  // opening Settings always starts at the group list
  const _st = goTitle; goTitle = function () { Game.setGroup = null; return _st.apply(this, arguments); };
}
// ---- career hub: My Player in four entries
{
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments), mp = R.find(e => e.label === 'My Player');
    if (mp && mp.sub) {
      const by = l => mp.sub.find(s => s.label === l), rec = ['Season summaries', 'Journal'].map(by).filter(Boolean);
      const keep = ['Upgrade stats', 'League & stats', 'Goals & badges', 'Customize'].map(by).filter(Boolean);   // v9.7.0: League & stats sits on My Player itself
      const rest = mp.sub.filter(s => !keep.includes(s) && !rec.includes(s));
      mp.sub = [...keep, ...rest, ...(rec.length ? [{ label: 'Records', sub: rec }] : [])];
    }
    return R;
  };
}
