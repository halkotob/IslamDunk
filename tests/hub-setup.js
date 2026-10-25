// v9.6.2 career hub fixtures: page-side helpers shared by tests/run.mjs (hub-layout) and scripts/review-hub.mjs.
// Evaluate CAL_HELPERS, then HUB_HELPERS, in the page. __hubCase(opts) puts the career hub in one state:
//   cal    'game' | 'jumuah' | 'ramadan' | 'eid'   (the calendar strip's markers: a normal day, Friday, Ramadan, Eid)
//   badges 0..8   earned badges; 8 is one more than the game has (a fixture-only badge), to force the "+N" chip
//   long   true   the longest names: a 12-letter player name, a long opponent and place, a long stage title
//   money  '3' | '5'   3-digit or 5-digit Barakah Points and Halal Bucks
//   maxed  true   every stat trained to 10 and the Lockdown play style (its body modifiers take some back)
//   open   'My Player' (its list open in place) | 'Records' (My Player > Records, the group's own list)
// Every case starts from the same seeded career, and anything a case changed in shared data is put back first.
export const HUB_SIZES = [
  ['1920x1080', { viewport: { width: 1920, height: 1080 } }],
  ['1280x720', { viewport: { width: 1280, height: 720 } }],
  ['1024x768', { viewport: { width: 1024, height: 768 } }],
  ['844x390', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['667x375', { viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]
];
export const HUB_CASES = [
  ['badges-0', { badges: 0 }], ['badges-2', { badges: 2 }], ['badges-4', { badges: 4 }], ['badges-8', { badges: 8 }],
  ['long-names', { badges: 4, long: true }], ['money-3', { money: '3' }], ['money-5', { money: '5', badges: 8 }],
  ['friday', { cal: 'jumuah', badges: 2 }], ['ramadan', { cal: 'ramadan', badges: 2 }], ['eid', { cal: 'eid', badges: 2 }],
  ['maxed-lockdown', { badges: 4, maxed: true }], ['my-player-open', { badges: 8, open: 'My Player' }], ['records-open', { badges: 2, open: 'Records' }]
];
export const HUB_HELPERS = `(() => {
  const undo = [];
  const set = (o, k, v) => { undo.push([o, k, o[k]]); o[k] = v; };
  window.__hubCase = (o = {}) => {
    while (undo.length) { const [ob, k, v] = undo.pop(); ob[k] = v; }
    const label = window.__calState(o.cal || 'game');
    const G = cg(); G.badges = {};
    const n = o.badges == null ? 4 : o.badges;
    if (n > BADGES.length) { const extra = { id: 'fixture', name: 'Iron Man Marathon', need: 1, how: 'A fixture-only badge', eff: 'None' }; BADGES.push(extra); undo.push([BADGES, 'length', BADGES.length - 1]); }
    BADGES.slice(0, n).forEach(b => { G.badges[b.id] = 1; G.badgeProg[b.id] = b.need; });
    C.bp = o.money === '5' ? 48210 : o.money === '3' ? 640 : 120; C.hb = o.money === '5' ? 90455 : o.money === '3' ? 375 : 45;
    if (o.maxed) { for (const k in C.lv) set(C.lv, k, 10); set(C.look, 'style', PLAY_STYLES.indexOf('lockdown')); }
    if (o.long) {
      C.name = 'Abdulrahmaan';
      const b = C.bracket, m = ourMatch && b && !b.out && !b.champ ? ourMatch() : null, opp = m ? teamOf(C.stage, m.a === 0 ? m.b : m.a) : null;
      if (opp) { set(opp, 'name', 'Masjid Al-Mustaqbal Al-Kabir'); set(opp, 'place', 'Dearborn Heights, Michigan'); }
      const S = STAGES[C.stage]; set(S, 'title', S.title + ' Invitational Championship Series');
    }
    if (Game.menus) Game.menus.hub = null; careerHub(); _achQ.length = 0; Game.toastT = 0;
    if (o.open) { const it = HUB_MENU(), i = it.findIndex(e => e.label === 'My Player'); menuActivate('hub', it, i);
      if (o.open === 'Records') { const mp = HUB_MENU()[i], j = mp.sub.findIndex(e => e.label === 'Records'); menuActivate('hub', HUB_MENU(), j); } }
    return label;
  };
})();`;
