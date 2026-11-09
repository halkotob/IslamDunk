// v9.17.9: one way back on every screen, one name for leaving, and a gamepad hint on tap-only screens.
//   U2  The ‹ Back pill is the way back (with Esc on keys and B on a pad); the duplicate Back rows and buttons are gone
//       (Settings, the online menu, Mini games, Profile, tournament setup, Career, Save and load, Upgrade stats, Fun
//       modes, the hub's corner menu, the month view, the shop, a talk, the office, join code, the custom-team and
//       save code screens, the clip screen, the online waiting screen). Leaving is Back (up one screen), Leave (an
//       online room), Quit (a match in progress, after asking) and Title (where it goes to the title). Cancel stays
//       only on a dialog with a confirm button.
//   UX1 Screens you play by tapping (no list to move through) show "View: pick" in a corner when a gamepad was used
//       in the last few seconds, so a controller player knows the View button picks any button. Screens with 6
//       targets or fewer get a focus order instead: the pad's picker opens on them by itself (as on the join-code
//       keys), and needs no hint.
//   U3  The title menu's Options is Settings; the screen it calls Settings is Game settings.
{
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    const m = _tm.apply(this, arguments);
    for (const e of m) if (e.label === 'Options') { e.label = 'Settings'; for (const s of e.sub || []) if (s.label === 'Settings') s.label = 'Game settings'; }
    return m;
  };
  if (typeof MENU_HELP !== 'undefined' && MENU_HELP.Options) { MENU_HELP['Game settings'] = MENU_HELP.Settings; MENU_HELP.Settings = MENU_HELP.Options; }   // (the inner row's help moves with its new name)
}
// ---- UX1
// the tap-only screens (no arrow-key list) and which get the hint or a focus order: from the 9.17.9 screen census
// (tests/screen-census.mjs). A screen that uses the pad's directions itself (days, tabs, a court to walk) is left out
// of the focus order, which would take them over.
// hint: Teams & Players, the lobby, a tournament or league, the career stats (where they have more than 6 targets)
const NAV_HINT_SCREENS = new Set(['lobby', 'cslist', 'series', 'cstats']);
// focus order (6 targets or fewer, and the pad's directions and A do nothing else there): the code import and share
// screens, My clips
const NAV_FOCUS_SCREENS = new Set(['csimport', 'csshare', 'myclips']);
const PadSeen = { t: -1e9 };
{
  // when the pad was last used: any pad input sets Input.lastDev to 'pad' and presses keys
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const r = _gu.apply(this, arguments);
    if (Input.lastDev === 'pad' && Object.keys(Input.pressed).length) PadSeen.t = nowMs();   // (after: the pad presses its keys inside the frame)
    return r;
  };
  for (const s of NAV_FOCUS_SCREENS) if (!PAD_PICKER_SCREENS.includes(s)) PAD_PICKER_SCREENS.push(s);
}
function navHintOn() {
  return Input.lastDev === 'pad' && nowMs() - PadSeen.t < 5000 && NAV_HINT_SCREENS.has(Game.screen) && !Pad.cursor.on && !Game.confirm && !Game.paused
    && (Game.rects || []).filter(r => r.w > 4 && r.h > 4 && r.w * r.h < W * H * 0.4).length > 6;
}
{
  const _r = render;
  render = function (g) {
    _r.apply(this, arguments);
    if (!navHintOn()) return;
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.textAlign = 'center'; g.font = `12px ${FONT}`;
    const t = 'View: pick', w = g.measureText(t).width + 24, x = W - w - 12, y = H - 34;
    g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, x, y, w, 24, 12); g.fill();
    g.fillStyle = '#fff'; g.fillText(t, x + w / 2, y + 17); g.restore();
  };
}
