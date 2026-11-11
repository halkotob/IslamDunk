// Phone text audit (v8.6.2). Used by the 'mobile' test in tests/run.mjs, and runnable on its own:
//   node tests/phone-audit.mjs [--page dist/web/index.html] [--shots dir]
// Before the page loads, CanvasRenderingContext2D.prototype.fillText/strokeText are wrapped. For every call on
// the game canvas (not off-screen sprite canvases), with no maxWidth argument and visible alpha:
//   - the text's left/right edges (from measureText, textAlign and x) are mapped through ctx.getTransform();
//     left < -2 or right > canvas.width + 2 (device pixels) is an OVERFLOW
//   - the font size (parsed from ctx.font) is converted to CSS pixels on screen; below MIN_CSS_PX is SMALL
// Each screen is set up, rendered for a few frames, and the findings are recorded under its name.
import { CAL_HELPERS, CAL_STATES } from './calendar-setup.js';
import { WORLD_HELPERS } from './world-setup.js';
import { JUMUAH_HELPERS } from './jumuah-setup.js';
import { LEAGUE_HELPERS } from './league-setup.js';
export const MIN_CSS_PX = 11;
export const PHONES = [
  ['iPhone 13 landscape', { viewport: { width: 750, height: 342 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['667x300 phone', { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]
];
export const AUDIT_INIT = `(() => {
  const MIN = ${MIN_CSS_PX};
  window.__audit = { on: false, screen: '', found: new Map(), texts: [] };
  const P = CanvasRenderingContext2D.prototype;
  const wrap = name => { const f = P[name]; P[name] = function (text, x, y, maxWidth) {
    const A = window.__audit;
    try {
      const cv = this.canvas;
      if (A.on && cv && cv.id === 'game' && maxWidth === undefined && this.globalAlpha > 0.05 && String(text).trim()) {
        const t = String(text), w = this.measureText(t).width, al = this.textAlign;
        const L = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x, R = L + w;
        const m = this.getTransform(), a = m.transformPoint(new DOMPoint(L, y)), b = m.transformPoint(new DOMPoint(R, y));
        const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
        const px = parseFloat((/([\\d.]+)px/.exec(this.font) || [])[1] || '0');
        const css = px * Math.hypot(m.a, m.b) * (cv.getBoundingClientRect().width / cv.width);
        const key = A.screen + '|' + t;
        if (A.texts.length < 400) A.texts.push({ t: t.slice(0, 40), x: (a.x + b.x) / 2, y: a.y, s: String(this.fillStyle) });
        if (lo < -2 || hi > cv.width + 2) A.found.set('O|' + key, { kind: 'overflow', screen: A.screen, text: t.slice(0, 80), left: Math.round(lo), right: Math.round(hi), width: cv.width });
        if (css && css < MIN - 0.05) { const k = 'S|' + key, o = A.found.get(k); if (!o || css < o.css) A.found.set(k, { kind: 'small', screen: A.screen, text: t.slice(0, 80), css: Math.round(css * 10) / 10, px }); }
      }
    } catch (e) {}
    return maxWidth === undefined ? f.call(this, text, x, y) : f.call(this, text, x, y, maxWidth);
  }; };
  wrap('fillText'); wrap('strokeText');
})();`;

// [name, setup] - setups run in the page. CAREER builds a save with one played game first.
const CAREER = `if (!window.__careerReady) { window.__careerReady = 1; C = freshCareer(); C.name = 'Abdullah'; if (!C.bracket) C.bracket = makeBracket(C.stage);
  startCareerMatch(); for (let n = 0; n < 60 * 60 * 20 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'play'; } careerAfterMatch(); saveCareer(); }`;
// v9.7.0: a career with five game days (league games in the fallback mode: the layout is what's audited)
const LEAGUE_FIX = CAL_HELPERS + LEAGUE_HELPERS + ` if (!window.__lgReady) { window.__lgReady = 1; window.__lgBuild(5, 'fallback'); }`;
const SHARE = `if (!window.__shareReady) { window.__shareReady = 1;                       // a CPU game with at least one highlight
  for (let k = 0; k < 4 && !(window.__hl && window.__hl.length); k++) { newMatch(TEAMS[k], TEAMS[k + 1], { humans: [], fmt: { format: 'quarters', len: 30 } });
    for (let n = 0; n < 60 * 60 * 10 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; } window.__hl = M.highlights; } }
  M.highlights = window.__hl; Game.screen = 'final'; FX.pops.length = 0; M.hot = null;   // (v9.19.0: no score pops or hot spot ("+2") left from the game: one at the court's edge read as overflowing text, depending on how the unseeded game ended)
`;
const MATCH = `Input.touchMode = true; Game.trivia = null; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
  for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP); M.players[0].def.huffath = true;`;
export const SCREENS = [
  ['title', `goTitle();`],
  ['settings', `goTitle(); Game.screen = 'settings'; Game.idx = 0;`],
  ['settings: controls & camera', `goTitle(); Game.screen = 'settings'; Game.setGroup = 1; Game.idx = 0;`],
  ['settings: game', `goTitle(); Game.screen = 'settings'; Game.setGroup = 0; Game.idx = 0;`],
  ['howto', `goTitle(); Game.screen = 'howto';`],
  ['about', `goTitle(); Game.screen = 'about';`],
  ['achievements', `goTitle(); Game.screen = 'achievements'; Game.idx = 0;`],
  ['bests', `goTitle(); Game.screen = 'bests';`],
  ['funmodes', `goTitle(); Game.screen = 'funmodes'; Game.idx = 0;`],
  ['select', `goTitle(); startSelect('1p');`],
  ['venue', `goTitle(); startSelect('1p'); openVenueSelect(() => {});`],
  ['online', `goTitle(); onlineEntry();`],
  ['joincode', `goTitle(); Net.typed = 'AB'; Game.screen = 'joincode';`],
  ['lobby', `goTitle(); Lobby.open();`],
  ['minis', `goTitle(); openMinis();`],
  ['profile', `goTitle(); Game.screen = 'profile'; Game.idx = 0;`],
  ['teams & players', `goTitle(); openCS(0);`],
  ['custom teams: import', `goTitle(); openCS(0); openCSImport();`],
  ['career: export', `goTitle(); C = freshCareer(); C.name = 'Yusuf'; C.wins = 5; C.losses = 2; saveCareer(); Game.screen = 'cmenu'; openSaveExport(() => { Game.screen = 'cmenu'; });`],
  ['career: import (a file picked)', `goTitle(); C = freshCareer(); C.name = 'Yusuf'; C.wins = 5; C.losses = 2; saveCareer(); Game.screen = 'cmenu'; openSaveImport(() => { Game.screen = 'cmenu'; }); ssTryImport(ssExportText());`],
  ['custom teams: share', `goTitle(); openCS(0); CSUI.share = csShareCode('team', { name: 'Masjid Al-Noor', short: 'NOOR', c1: TEAMS[0].c1, c2: TEAMS[0].c2, crest: TEAMS[0].crest, roster: [{ k: 'team', t: 0, i: 0 }, { k: 'team', t: 0, i: 1 }] }); Game.screen = 'csshare';`],
  ['custom teams: edit a team', `goTitle(); openCS(0); openCSEdit(csNewTeam());`],
  ['custom teams: edit a player', `goTitle(); openCS(1); openCSEdit(csNewPlayer());`],
  ['custom teams: edit a team (own court)', `goTitle(); openCS(0); const d = csLoad(), t = csNewTeam(); t.name = 'Masjid Al-Noor'; t.short = 'NOOR'; t.venue = 'own'; t.court = { b: 0, w: 0, p: 0, m: 2, n: 1 }; d.teams.push(t); csSave(); openCSEdit(t);`],
  ['3 on 3: third players', `goTitle(); startSelect('1p'); Game.sel.three = true; Game.sel.a = 0; Game.sel.b = 1; selectOK(); selectOK();`],
  ['venue: your own court', `goTitle(); const d = csLoad(), t = csNewTeam(); t.name = 'Masjid Al-Noor'; t.short = 'NOOR'; t.venue = 'own'; t.court = { b: 0, w: 0, p: 0, m: 2, n: 1 }; d.teams.push(t); csSave(); startSelect('1p'); Game.sel.a = teamPool().findIndex(x => x.court); Game.sel.b = 1; openVenueSelect(() => {});`],
  ['tournament setup', `goTitle(); serDrop('tour'); openSeries('tour');`],
  ['tournament bracket', `goTitle(); serDrop('tour'); openSeries('tour'); serStart(); serPlay(); M.teams[0].score = 21; M.teams[1].score = 17; finishMatch(); finalContinue();`],
  ['league standings', `goTitle(); serDrop('league'); openSeries('league'); serStart(); serPlay(); M.teams[0].score = 21; M.teams[1].score = 17; finishMatch(); finalContinue(); SER.tab = 0;`],
  ['league schedule', `goTitle(); serDrop('league'); openSeries('league'); serStart(); serPlay(); M.teams[0].score = 21; M.teams[1].score = 17; finishMatch(); finalContinue(); SER.tab = 1;`],
  ['league leaders', `goTitle(); serDrop('league'); openSeries('league'); serStart(); serPlay(); M.teams[0].score = 21; M.teams[1].score = 17; finishMatch(); finalContinue(); SER.tab = 2;`],
  ['my clips', `goTitle(); openMyClips();`],
  ['settings: accessibility', `goTitle(); Game.screen = 'settings'; Game.setGroup = SET_GROUPS.findIndex(x => x.name === 'Accessibility'); Game.idx = 0;`],
  ['barakah run', `goTitle(); openBarakah();`],
  ['daily scenario', `goTitle(); openScenBrief();`],
  ['dunk lab', `goTitle(); startDunkLab();`],
  ['match HUD', MATCH],
  ['match: hikmah challenge', MATCH + ` openTrivia(M.players[0]);`],
  ['match: hikmah correct', MATCH + ` openTrivia(M.players[0]); answerTrivia(Game.trivia.order.indexOf(0)); Game.trivia.gift = 'sabr'; Game.trivia.res = 0.3;`],
  ['match: pause', MATCH + ` Game.paused = true; Game.idx = 0;`],
  ['halftime', MATCH + ` M.nextStart = 1; Game.screen = 'halftime';`],   // (v9.17.9: who starts the half, as a real halftime sets it)
  ['final', MATCH + ` M.teams[0].score = 21; M.teams[1].score = 18; M.phase = 'over'; M.winner = 0; Game.screen = 'final';`],
  ['career menu', CAREER + ` Game.screen = 'cmenu'; Game.idx = 0;`],
  ['creator', CAREER + ` Game.creator = { idx: 0, isNew: false }; Game.screen = 'creator';`],
  ['namekeys', CAREER + ` Game.creator = { idx: 0, isNew: false }; Game.nameBuf = C.name; Game.screen = 'namekeys';`],   // (v9.17.9: as the creator opens it; Back goes there)
  ['story', CAREER + ` playStory([['saleem', 'Assalamu alaikum. Ready for your first game at the Metro Masjid League? Keep your intention pure and play hard.']], () => careerHub());`],
  ['hub', CAREER + ` careerHub();`],
  ['cbracket', CAREER + ` careerHub(); Game.screen = 'cbracket';`],
  // v9.0: the calendar strip on the hub and the month view, in the five review states (a season-2 hub too: the season moves into the subtitle)
  ...CAL_STATES.flatMap(st => [['hub calendar: ' + st, CAL_HELPERS + ` window.__calState('${st}');`], ['month view: ' + st, CAL_HELPERS + ` window.__calState('${st}'); openCalendar();`]]),
  // v9.2: the neighbourhood: each scene (HUD, buttons, hint), a speech bubble, a prompt, the shop, the menu, a banner, night
  ...[['home', 'home'], ['street', 'street-west'], ['masjid front', 'masjid-front'], ['store', 'store']].map(([n, v]) => ['world: ' + n, WORLD_HELPERS + ` window.__worldPhoto('${v}', 1);`]),
  ['world: speech bubble', WORLD_HELPERS + ` window.__worldPhoto('street-west', 1); worldTalkTo(World.npcs.find(q => q.id === 'daniel'));`],
  ['world: long bubble', WORLD_HELPERS + ` window.__worldPhoto('street-west', 1); worldSay([['yusuf', 'I walk to the corner and back every day. The doctor says it’s good. The bench agrees.']], World.npcs.find(q => q.id === 'yusuf'));`],
  ['world: prompt', WORLD_HELPERS + ` window.__worldPhoto('street-west', 1); worldEnter('street', { x: 386, d: 0.05, face: 1 }, { noFade: true }); World.near = worldNearest();`],
  ['world: closed prompt', WORLD_HELPERS + ` window.__worldPhoto('street-west', 3); worldEnter('street', { x: 1680, d: 0.05, face: 1 }, { noFade: true }); World.near = worldNearest();`],
  ['world: shop', WORLD_HELPERS + ` window.__worldPhoto('store', 1); C.store = { band_white: 1, shoe_gold: 1 }; worldOpenShop(true);`],
  ['world: menu', WORLD_HELPERS + ` window.__worldPhoto('home', 1); World.menu = { idx: 0 };`],
  ['world: jumuah banner', WORLD_HELPERS + ` window.__worldPhoto('home', 0); let d = C.cal.d; while (calWd(d) !== 5) d++; calSetDay(d); worldBanner('Jumu’ah today. The masjid is at the end of the street.');`],
  ['world: night street', WORLD_HELPERS + ` window.__worldPhoto('street-east', 3);`],
  // v9.4: Jumu'ah: the question at the door, the room, a reminder, the longest reminder, the "touched on" card
  ...[['at the door', 'ask'], ['the room', 'open'], ['a reminder', 'talk'], ['the longest reminder', 'long'], ['touched on', 'card']].map(([n, st]) => ['jumuah: ' + n, JUMUAH_HELPERS + ` window.__jumPhoto('${st}');`]),
  ['hub calendar: season 2', CAL_HELPERS + ` window.__calState('game'); C.season = 2; careerHub();`],
  ['hub calendar: schedule menu', CAL_HELPERS + ` window.__calState('game'); const it = HUB_MENU(); menuActivate('hub', it, it.findIndex(e => e.label === 'Schedule'));`],
  ['cstats', CAREER + ` careerHub(); openStats();`],
  ['cgoals', CAREER + ` careerHub(); openGoals();`],
  ['crecords', CAREER + ` careerHub(); openRecords();`],
  ['career league leaders', LEAGUE_FIX + ` window.__lgOpen('leaders');`],
  ['career league player', LEAGUE_FIX + ` window.__lgOpen('player', { pid: 'me' });`],
  ['career league around', LEAGUE_FIX + ` window.__lgOpen('league');`],
  ['career league box score', LEAGUE_FIX + ` window.__lgOpen('box');`],
  ['career around the league (waiting)', CAREER + ` LEAGUE.waitMs = 0; Game.lgWait = { won: true, us: 30, them: 20, t0: performance.now() + 1e9, done: 1, total: 3, go: () => {} }; Game.screen = 'cleague';`],
  ['csummary', CAREER + ` careerHub(); openSummary(C.stage, 'menu');`],
  ['postgame', CAREER + ` careerHub(); Game.screen = 'postgame';`],
  ['scout', CAREER + ` careerHub(); prepCareerVenue(); Game.scout = buildScout(); Game.screen = 'scout';`],
  ['pregame', CAREER + ` careerHub(); prepCareerVenue(); Game.scout = buildScout(); Game.screen = 'pregame';`],
  ['journal', CAREER + ` careerHub(); openJournal();`],
  ['office', CAREER + ` careerHub(); openOffice();`],
  ['musalla', CAREER + ` careerHub(); openMusalla();`],
  ['masjid', CAREER + ` careerHub(); Game.screen = 'masjid'; Game.masjidView = 'ext';`],
  ['shop', CAREER + ` careerHub(); Game.screen = 'shop'; Game.idx = 0; Game.shopTab = 'masjid';`],
  ['train', CAREER + ` careerHub(); Game.screen = 'train'; Game.idx = 0;`],
  ['gym', CAREER + ` careerHub(); enterGym();`],
  ['saves', CAREER + ` careerHub(); Game.screen = 'saves'; Game.idx = 0; Game.saveMsg = '';`],
  ['newseason', CAREER + ` careerHub(); Game.screen = 'newseason'; Game.idx = 0;`],
  ['share clip', SHARE + ` openClipShare(M.highlights);`],
  ['clip video: no video support', SHARE + ` openClipShare(M.highlights); ClipVid.state = 'fallback'; ClipVid.msg = 'Video isn\u2019t supported in this browser, so here is the still image.'; Game.screen = 'clipvideo';`],
  ['clip video: done', SHARE + ` openClipShare(M.highlights); ClipVid.state = 'done'; ClipVid.blob = new Blob(['x'], { type: 'video/webm' }); ClipVid.name = 'islam-dunk-noor-big-dunk.webm'; ClipVid.poster = ShareCard.card; Game.screen = 'clipvideo';`],
  ['select (forced, no setup)', `goTitle(); Game.sel = null; Game.screen = 'select';`],   // last: on 8.6.1 this froze the game loop
  ['title after forced select', `goTitle();`]
];

// v9.17.7 (X1): every tap target on the screen, as a phone sees it. For each control in Game.rects (not full-screen
// "tap anywhere" areas), the area a tap acts on it: along the lines through its centre, how far a tap still lands on it
// (the game's tapWho when it has one; before 9.17.7 the drawn rectangle, last drawn on top). In CSS px.
export const MIN_TAP = 44;
export const TARGETS_JS = `(() => {
  const cr = canvas.getBoundingClientRect(), k = cr.width / W, s = canvas.width / W, A = window.__audit;
  const big = r => r.w * r.h >= W * H * 0.4, R = (Game.rects || []).filter(r => r.w > 2 && r.h > 2 && !big(r));
  const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const who = typeof tapWho === 'function' ? (x, y) => tapWho(x, y) : (x, y) => { for (let i = R.length - 1; i >= 0; i--) if (inR(R[i], x, y)) return R[i]; return null; };
  const out = [];
  R.forEach((r, i) => {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, own = who(cx, cy) === r;
    let a = cx, b = cx, c = cy, d = cy;
    if (own) { while (a > -100 && who(a - 1, cy) === r) a--; while (b < W + 100 && who(b + 1, cy) === r) b++; while (c > -100 && who(cx, c - 1) === r) c--; while (d < H + 100 && who(cx, d + 1) === r) d++; }
    const lab = (A.texts.find(t => inR(r, t.x / s, t.y / s - 4)) || A.texts.find(t => inR({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 }, t.x / s, t.y / s - 4)) || {}).t || ('#' + i);
    const w = own ? (b - a + 1) * k : 0, h = own ? (d - c + 1) * k : 0;
    // what stops it growing on its short side: the controls just past its edges
    const nb = !own ? [who(cx, cy)] : w <= h ? [who(a - 1, cy), who(b + 1, cy)] : [who(cx, c - 1), who(cx, d + 1)];
    out.push({ label: lab, drawn: [Math.round(r.w * k), Math.round(r.h * k)], area: [Math.round(w), Math.round(h)], short: Math.round(Math.min(w, h)), by: nb.filter(Boolean).map(q => R.indexOf(q)) });
  });
  for (const t of out) t.by = t.by.map(j => j >= 0 ? out[j].label : '?');
  // drawn controls that overlap. Fine: one drawn on top inside the other (an arrow on its row), or the same rectangle
  // twice (dup: the one drawn last takes every tap). Not fine (over): any other overlap, where part of one can't be tapped
  const over = [], dup = [], inside = (p, q) => p.x >= q.x - 1 && p.y >= q.y - 1 && p.x + p.w <= q.x + q.w + 1 && p.y + p.h <= q.y + q.h + 1;
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const p = R[i], q = R[j];
    if (!(p.x < q.x + q.w - 1 && q.x < p.x + p.w - 1 && p.y < q.y + q.h - 1 && q.y < p.y + p.h - 1)) continue;
    if (inside(p, q) && inside(q, p)) dup.push([out[i].label, out[j].label]); else if (!inside(q, p)) over.push([out[i].label, out[j].label]); }
  // controls drawn before a full-screen area (which used to take their taps)
  const all = Game.rects || [], lastBig = all.reduce((m, r, i) => big(r) ? i : m, -1);
  const under = lastBig < 0 ? [] : all.slice(0, lastBig).filter(r => R.includes(r)).map(r => out[R.indexOf(r)].label);
  return { k, targets: out, over, dup, under };
})()`;

// Sorts the tap targets of an audit: a control under MIN_TAP on its short side is an exception when what stops it is
// a neighbour (the row or key spacing: the gap is split down the middle), when it's on a screen played with the
// joystick (the in-match controls stay as they are), or when it's drawn twice in the same place (the copy drawn last
// takes the taps). Anything else (a control no tap reaches, or one under MIN_TAP with room around it) is a problem.
export const PLAY_SCREENS = new Set(['match HUD', 'dunk lab', 'gym']);
export function tapReport(out) {
  const problems = [], exceptions = { spacing: [], play: [], twice: [] };
  for (const s of out) {
    if (!s.tg) continue;
    for (const t of s.tg.targets) {
      if (t.short >= MIN_TAP) continue;
      const row = Object.assign({ screen: s.name }, t);
      if (PLAY_SCREENS.has(s.name)) exceptions.play.push(row);
      else if (t.short === 0 && t.by.length === 1 && t.by[0] === t.label) exceptions.twice.push(row);
      else if (t.short > 0 && t.by.length) exceptions.spacing.push(row);
      else problems.push(row);
    }
  }
  return { problems, exceptions };
}

// The touch buttons must never cover the scoreboard: every Button size, both hands.
async function buttonOverlap(p) {
  const bad = [];
  for (const size of [0, 1, 2]) for (const left of [false, true]) {
    const r = await p.evaluate(([size, left]) => {
      const keep = { size: PhonePrefs.size, left: PhonePrefs.left };
      PhonePrefs.size = size; PhonePrefs.left = left; TouchUI.layout(); TouchUI.update();
      const B = PhoneHUD.board, c = canvas.getBoundingClientRect(), k = c.width / W;
      const sb = B && { l: c.left + B.x * k, t: c.top + B.y * k, r: c.left + (B.x + B.w) * k, b: c.top + (B.y + B.h) * k };
      const hits = !sb ? ['no scoreboard drawn'] : ['shoot', 'pass', 'cross'].map(n => [n, TouchUI.btns[n].getBoundingClientRect()])
        .filter(([, q]) => q.width && q.left < sb.r && q.right > sb.l && q.top < sb.b && q.bottom > sb.t).map(([n]) => n);
      Object.assign(PhonePrefs, keep); TouchUI.layout();
      return hits;
    }, [size, left]);
    for (const n of r) bad.push({ kind: 'overlap', screen: 'match HUD', text: `${n} button over the scoreboard (size ${'SML'[size]}, ${left ? 'left' : 'right'}-handed)` });
  }
  return bad;
}

export async function auditPhone(browser, base, device, { query = '?net=loop&lat=0&room=audit', shots = null, targets = false, textSize = 0 } = {}) {
  const ctx = await browser.newContext(device);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs|islamdunk-ice\.[^/]*workers\.dev/, r => r.abort());   // (no live services; the TURN Worker fails at once: STUN only)
  await ctx.addInitScript(AUDIT_INIT);
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(`${p.__screen || 'load'}: ${e.message}`));
  await p.goto(base + '/' + query);
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  await p.evaluate(() => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} Input.touchMode = true; Input.lastDev = 'touch'; });
  if (textSize) await p.evaluate(n => { SETTINGS.textSize = n; }, textSize);
  const out = [];
  const only = (process.env.ONLY || '').split(',').map(x => x.trim()).filter(Boolean);
  for (const [name, setup] of SCREENS) {
    if (only.length && !only.includes(name)) continue;
    p.__screen = name;
    const set = await p.evaluate(([name, js]) => { const A = window.__audit; A.on = false; A.found.clear(); A.texts.length = 0; try { (0, eval)(js); } catch (e) { return String(e && e.message || e); } A.screen = name; return null; }, [name, setup]);
    if (set) { errs.push(`${name}: setup failed: ${set}`); continue; }
    await p.waitForTimeout(450);                                           // let the screen transition finish
    await p.evaluate(() => { window.__audit.on = true; });
    await p.waitForTimeout(350);
    await p.evaluate(() => { window.__audit.texts.length = 0; window.__audit.on = true; });
    await p.waitForTimeout(60);
    const found = await p.evaluate(() => { const A = window.__audit; A.on = false; return [...A.found.values()]; });
    const tg = targets ? await p.evaluate(TARGETS_JS) : null;
    // v9.17.7: at Large and Larger, no line drawn bigger than Normal sticks out of its button or panel, or into
    // another line, further than it does at Normal (the game steps such lines down a size; this checks it settled)
    if (textSize) found.push(...await p.evaluate(name => {
      if (typeof PhoneFit === 'undefined') return [{ kind: 'overflow', screen: name, text: 'no text-size fitting in this build', left: 0, right: 0, width: 0 }];
      const R = PhoneFit.last, s = canvas.width / W, out = [], gap = 4 * s;
      const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) + gap - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
      const off = (a, r) => Math.max(0, r[0] - a[0]) + Math.max(0, a[2] - r[2]) + Math.max(0, r[1] - a[1]) + Math.max(0, a[3] - r[3]);
      const mid = (a, r) => { const x = (a[0] + a[2]) / 2, y = (a[1] + a[3]) / 2; return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; };
      const boxes = (Game.rects || []).filter(r => r.w * r.h < W * H * 0.9).map(r => [r.x * s, r.y * s, (r.x + r.w) * s, (r.y + r.h) * s]).concat(PhoneFit.panels);
      for (const r of R) if (r.L > 0 && boxes.some(q => mid(r.b0, q) && off(r.b, q) > off(r.b0, q) + 2)) out.push({ kind: 'overflow', screen: name, text: 'out of its box: ' + r.t.slice(0, 60), left: Math.round(r.b[0]), right: Math.round(r.b[2]), width: canvas.width });
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j];
        if (a.key !== b.key && (a.L || b.L) && ov(a.b, b.b) > ov(a.b0, b.b0) + 4) out.push({ kind: 'overflow', screen: name, text: 'into another line: ' + a.t.slice(0, 40) + ' / ' + b.t.slice(0, 40), left: Math.round(a.b[0]), right: Math.round(a.b[2]), width: canvas.width }); }
      return out;
    }, name));
    // shots: a folder (match HUD and venue, or every screen with ALL_SHOTS=1), or a function screen name -> file path or null
    const shot = typeof shots === 'function' ? shots(name) : shots && (process.env.ALL_SHOTS || name === 'match HUD' || name === 'venue') ? `${shots}/${name.replace(/\W+/g, '-')}.png` : null;
    if (shot) await p.screenshot({ path: shot });
    if (name === 'match HUD') found.push(...await buttonOverlap(p));
    out.push({ name, found, tg });
  }
  await ctx.close();
  return { out, errs };
}

// standalone: node tests/phone-audit.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  const http = await import('node:http'), fs = await import('node:fs'), path = await import('node:path');
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const PAGE = path.resolve(ROOT, arg('--page', 'dist/web/index.html')), SHOTS = arg('--shots', null);
  const srv = await new Promise(res => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/' || u === '/index.html' ? PAGE : path.join(ROOT, 'assets', u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); }); }).listen(0, '127.0.0.1', () => res(s)); });
  const browser = await chromium.launch();
  for (const [dn, dev] of PHONES) {
    if (process.env.DEV && !dn.includes(process.env.DEV)) continue;
    const shots = SHOTS ? path.join(SHOTS, dn.replace(/\W+/g, '-')) : null; if (shots) fs.mkdirSync(shots, { recursive: true });
    const TG = process.argv.includes('--targets');
    const TS = +(arg('--text', 0));
    const { out, errs } = await auditPhone(browser, `http://127.0.0.1:${srv.address().port}`, dev, { shots, targets: TG, textSize: TS });
    if (TG) {
      const all = out.flatMap(s => (s.tg ? s.tg.targets : []).map(t => Object.assign({ screen: s.name }, t))), sh = all.map(t => t.short).sort((a, b) => a - b);
      const under = all.filter(t => t.short < MIN_TAP), med = sh.length ? sh[sh.length >> 1] : 0;
      console.log(`\n== ${dn} tap targets: ${all.length} controls on ${out.filter(s => s.tg && s.tg.targets.length).length} screens; short side median ${med} px, smallest ${sh[0]} px; under ${MIN_TAP}: ${under.length}`);
      if (process.env.JSON) fs.writeFileSync(process.env.JSON.replace('%', dn.replace(/\W+/g, '-')), JSON.stringify(out.map(s => ({ name: s.name, tg: s.tg })), null, 1));
      const by = {}; for (const t of under) (by[t.screen] = by[t.screen] || []).push(t);
      for (const [sc, L] of Object.entries(by)) console.log(`  ${sc}: ` + L.map(t => `"${t.label}" ${t.area.join('x')} (drawn ${t.drawn.join('x')}; next to ${t.by.map(x => '"' + x + '"').join(', ') || 'nothing'})`).join(', '));
      for (const s of out) if (s.tg && s.tg.over.length) console.log(`  OVERLAP ${s.name}: ` + s.tg.over.map(x => x.join(' / ')).join(', '));
      const rep = tapReport(out);
      console.log(`  exceptions: ${rep.exceptions.spacing.length} limited by row or key spacing, ${rep.exceptions.play.length} on screens played with the joystick, ${rep.exceptions.twice.length} drawn twice; PROBLEMS: ${rep.problems.length}`);
      for (const t of rep.problems) console.log(`  PROBLEM ${t.screen}: "${t.label}" ${t.area.join('x')} (drawn ${t.drawn.join('x')})`);
    }
    let small = 0, over = 0;
    console.log(`\n== ${dn}`);
    for (const s of out) {
      const S = s.found.filter(f => f.kind === 'small'), O = s.found.filter(f => f.kind !== 'small'); small += S.length; over += O.length;
      if (S.length || O.length) console.log(`${s.name}: ${O.length} overflow, ${S.length} small` + (process.argv.includes('-v') ? '\n   ' + [...O, ...S].map(f => f.kind === 'small' ? `small ${f.css}px "${f.text}"` : f.kind === 'overlap' ? f.text : `OVER [${f.left},${f.right}]/${f.width} "${f.text}"`).join('\n   ') : ''));
    }
    console.log(`TOTAL ${dn}: ${over} overflow, ${small} small text, ${errs.length} errors` + (errs.length ? '\n  ' + errs.join('\n  ') : ''));
  }
  await browser.close(); srv.close();
}
