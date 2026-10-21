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
export const MIN_CSS_PX = 11;
export const PHONES = [
  ['iPhone 13 landscape', { viewport: { width: 750, height: 342 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['667x300 phone', { viewport: { width: 667, height: 300 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]
];
export const AUDIT_INIT = `(() => {
  const MIN = ${MIN_CSS_PX};
  window.__audit = { on: false, screen: '', found: new Map() };
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
const SHARE = `if (!window.__shareReady) { window.__shareReady = 1;                       // a CPU game with at least one highlight
  for (let k = 0; k < 4 && !(window.__hl && window.__hl.length); k++) { newMatch(TEAMS[k], TEAMS[k + 1], { humans: [], fmt: { format: 'quarters', len: 30 } });
    for (let n = 0; n < 60 * 60 * 10 && M.phase !== 'over'; n++) { updateMatch(STEP); if (Game.screen === 'halftime') Game.screen = 'title'; } window.__hl = M.highlights; } }
  M.highlights = window.__hl; Game.screen = 'final';`;
const MATCH = `Input.touchMode = true; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
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
  ['barakah run', `goTitle(); openBarakah();`],
  ['daily scenario', `goTitle(); openScenBrief();`],
  ['dunk lab', `goTitle(); startDunkLab();`],
  ['match HUD', MATCH],
  ['match: noor question', MATCH + ` openTrivia(M.players[0]);`],
  ['match: noor choice', MATCH + ` openTrivia(M.players[0]); answerTrivia(Game.trivia.order.indexOf(0)); Game.trivia.res = 1.79; triviaUpdate(0.05);`],
  ['match: pause', MATCH + ` Game.paused = true; Game.idx = 0;`],
  ['halftime', MATCH + ` Game.screen = 'halftime';`],
  ['final', MATCH + ` M.teams[0].score = 21; M.teams[1].score = 18; M.phase = 'over'; M.winner = 0; Game.screen = 'final';`],
  ['career menu', CAREER + ` Game.screen = 'cmenu'; Game.idx = 0;`],
  ['creator', CAREER + ` Game.creator = { idx: 0, isNew: false }; Game.screen = 'creator';`],
  ['namekeys', CAREER + ` Game.nameBuf = C.name; Game.screen = 'namekeys';`],
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
  ['hub calendar: season 2', CAL_HELPERS + ` window.__calState('game'); C.season = 2; careerHub();`],
  ['hub calendar: schedule menu', CAL_HELPERS + ` window.__calState('game'); const it = HUB_MENU(); menuActivate('hub', it, it.findIndex(e => e.label === 'Schedule'));`],
  ['cstats', CAREER + ` careerHub(); openStats();`],
  ['cgoals', CAREER + ` careerHub(); openGoals();`],
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

export async function auditPhone(browser, base, device, { query = '?net=loop&lat=0&room=audit', shots = null } = {}) {
  const ctx = await browser.newContext(device);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  await ctx.addInitScript(AUDIT_INIT);
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(`${p.__screen || 'load'}: ${e.message}`));
  await p.goto(base + '/' + query);
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking', null, { timeout: 20000 });
  await p.evaluate(() => { try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {} Input.touchMode = true; });
  const out = [];
  const only = (process.env.ONLY || '').split(',').map(x => x.trim()).filter(Boolean);
  for (const [name, setup] of SCREENS) {
    if (only.length && !only.includes(name)) continue;
    p.__screen = name;
    const set = await p.evaluate(([name, js]) => { const A = window.__audit; A.on = false; A.found.clear(); try { (0, eval)(js); } catch (e) { return String(e && e.message || e); } A.screen = name; return null; }, [name, setup]);
    if (set) { errs.push(`${name}: setup failed: ${set}`); continue; }
    await p.waitForTimeout(450);                                           // let the screen transition finish
    await p.evaluate(() => { window.__audit.on = true; });
    await p.waitForTimeout(350);
    const found = await p.evaluate(() => { const A = window.__audit; A.on = false; return [...A.found.values()]; });
    // shots: a folder (match HUD and venue, or every screen with ALL_SHOTS=1), or a function screen name -> file path or null
    const shot = typeof shots === 'function' ? shots(name) : shots && (process.env.ALL_SHOTS || name === 'match HUD' || name === 'venue') ? `${shots}/${name.replace(/\W+/g, '-')}.png` : null;
    if (shot) await p.screenshot({ path: shot });
    if (name === 'match HUD') found.push(...await buttonOverlap(p));
    out.push({ name, found });
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
    const { out, errs } = await auditPhone(browser, `http://127.0.0.1:${srv.address().port}`, dev, { shots });
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
