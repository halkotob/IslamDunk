// v9.6.2 career hub fixtures, v9.22 the story hub: page-side helpers shared by tests/hub-layout.mjs (hub-layout) and the
// league layout test. Evaluate HUB_HELPERS in the page. __hubCase(opts) puts the career hub in one state:
//   at     the story scene the hub's Continue would play (its chapter is the hub's title)
//   fund   a fundraiser total (the meter shows once fundOn)
//   long   true   the longest names: a 12-letter player name
//   money  '3' | '5'   3-digit or 5-digit Barakah Points and Halal Bucks
//   maxed  true   every stat trained to 10 and the Lockdown play style
//   open   'My Player' | 'Masjid' (its list open in place)
//   pray   true   the salah bonus pill on the card
// Every case starts from the same seeded career, and anything a case changed in shared data is put back first.
export const HUB_SIZES = [
  ['1920x1080', { viewport: { width: 1920, height: 1080 } }],
  ['1280x720', { viewport: { width: 1280, height: 720 } }],
  ['1024x768', { viewport: { width: 1024, height: 768 } }],
  ['844x390', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['667x375', { viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]
];
export const HUB_CASES = [
  ['chapter-1', {}], ['chapter-0', { at: 'C0.3' }], ['long-names', { long: true }], ['money-3', { money: '3' }], ['money-5', { money: '5' }],
  ['fundraiser', { at: 'C2.6', fund: 45250 }], ['fund-full', { at: 'C4.9', fund: 100000 }], ['maxed-lockdown', { maxed: true, pray: true }],
  ['my-player-open', { open: 'My Player' }], ['masjid-open', { open: 'Masjid', money: '5' }]
];
export const HUB_HELPERS = `(() => {
  if (typeof LEAGUE !== 'undefined') LEAGUE.mode = 'fallback';
  window.__hubCase = (o = {}) => {
    C = freshCareer(); C.seed = 4242; C.name = o.long ? 'Abdulrahmaan' : 'Abdullah';
    C.story.at = o.at || 'C1.1';
    if (o.fund != null) { C.story.fundOn = true; C.story.fund = o.fund; }
    C.bp = o.money === '5' ? 48210 : o.money === '3' ? 640 : 120; C.hb = o.money === '5' ? 90455 : o.money === '3' ? 375 : 45;
    if (o.maxed) { for (const k in C.lv) C.lv[k] = 10; C.look.style = PLAY_STYLES.indexOf('lockdown'); }
    C.prayBonus = !!o.pray;
    if (Game.menus) Game.menus.hub = null; careerHub(); _achQ.length = 0; Game.toastT = 0;
    if (o.open) { const it = HUB_MENU(), i = it.findIndex(e => e.label === o.open); menuActivate('hub', it, i); }
    return C.story.at;
  };
})();`;
