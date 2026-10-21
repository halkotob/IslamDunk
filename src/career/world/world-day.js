// ================================================= v9.2: THE NEIGHBOURHOOD — the day, the store, the glue
// A free calendar day (anything but a game day) starts at home in the morning. "Go out" and "Skip the day" are
// always one press away. The store and the masjid can each be visited once a day; each visit moves the time of day
// on (morning, afternoon, dusk, night), and coming home at dusk or later makes it night. At night only home is
// open. "End the day" at the bed moves to the next day (a game day goes straight to the pregame); "Skip the day"
// jumps like the hub's Continue. Nothing is penalised; there are no streaks or timers.
// Walking up to the masjid door and going in lands in the career hub (the gym floor); the hub's "Go outside"
// returns to the masjid front. Settings → Career calendar Off keeps the old hub with no walking.
// Saved in the career: C.cal.loc = { scene, x, d, face, tod, vis, day, inStore, inMasjid }; C.store = owned items.

// ---------------------------------------------------------------- the corner store (cosmetic only, Halal Bucks)
const STORE_ITEMS = [
  { id: 'shoe_gold', name: 'Gold sneakers', kind: 'shoe', col: '#d9a53a', price: 120 },
  { id: 'shoe_teal', name: 'Teal sneakers', kind: 'shoe', col: '#1f9e9a', price: 120 },
  { id: 'kufi_saffron', name: 'Saffron cap color', kind: 'kufi', col: '#d9822b', price: 80 },
  { id: 'kufi_indigo', name: 'Indigo cap color', kind: 'kufi', col: '#3b3f8c', price: 80 },
  { id: 'band_white', name: 'White headband', kind: 'band', col: '#f4f4ef', band: 1, price: 60 },
  { id: 'band_green', name: 'Green headband', kind: 'band', col: '#1e7a4c', band: 2, price: 60 },
  { id: 'bottle', name: 'Water bottle', kind: 'bottle', col: '#4aa3df', price: 40 }
];
for (const it of STORE_ITEMS) {                                   // shoe and cap colors join the creator's swatch lists (locked until bought)
  if (it.kind === 'shoe') { it.idx = SNEAKERS.length; SNEAKERS.push(it.col); }
  if (it.kind === 'kufi') { it.idx = CAPCOLS_ALL.length; CAPCOLS_ALL.push(it.col); }
}
const BAND_COLS = [null, '#f4f4ef', '#1e7a4c'];
function storeOwned(id) { return !!(C && C.store && C.store[id]); }
function storeWearing(it) {
  const lk = C && C.look; if (!lk) return false;
  if (it.kind === 'shoe') return lk.shoes === it.idx;
  if (it.kind === 'kufi') return lk.capColor === it.idx && lk.cap > 0;
  if (it.kind === 'band') return lk.band === it.band;
  return !!lk.bottle;
}
function storeWear(it) {
  const lk = C.look;
  if (it.kind === 'shoe') lk.shoes = it.idx;
  else if (it.kind === 'kufi') { lk.capColor = it.idx; if (!lk.cap) lk.cap = 1; lk.teamMatch = 0; }
  else if (it.kind === 'band') lk.band = lk.band === it.band ? 0 : it.band;
  else lk.bottle = lk.bottle ? 0 : 1;
}
function storeBuy(it) {
  if (storeOwned(it.id)) { storeWear(it); SFX.blip(); World.shop.msg = storeWearing(it) ? 'Wearing the ' + it.name.toLowerCase() + '.' : 'Put away.'; }
  else if (C.hb < it.price) { SFX.bad && SFX.bad(); World.shop.msg = 'You need ' + (it.price - C.hb) + ' more Halal Bucks.'; return; }
  else { C.hb -= it.price; C.store = C.store || {}; C.store[it.id] = 1; storeWear(it); SFX.good && SFX.good(); World.shop.msg = 'Bought. Wearing it now.'; calCount('purchases'); }
  if (World.me) World.me.def = playerDef();
  saveCareer();
}
{
  const _sl = swatchLocked;
  swatchLocked = function (kind, i) { const it = STORE_ITEMS.find(x => x.kind === kind && x.idx === i); return it ? !storeOwned(it.id) : _sl.apply(this, arguments); };
  // creator rows for the accessories (only owned values can be picked)
  const at = CREATOR_ROWS.findIndex(r => r.key === 'shoes') + 1;
  CREATOR_ROWS.splice(at, 0, { label: 'Headband', key: 'band', txt: ['None', 'White', 'Green'] }, { label: 'Water bottle', key: 'bottle', txt: ['No', 'Yes'] });
  const _cs = creatorStep;
  creatorStep = function (i, d) {
    const r = CREATOR_ROWS[i]; if (!r || (r.key !== 'band' && r.key !== 'bottle')) return _cs.apply(this, arguments);
    const lk = C.look, n = r.txt.length, ok = v => v === 0 || (r.key === 'band' ? storeOwned(v === 1 ? 'band_white' : 'band_green') : storeOwned('bottle'));
    let v = lk[r.key] || 0; for (let k = 0; k < n; k++) { v = (v + d + n) % n; if (ok(v)) break; }
    lk[r.key] = v; SFX.blip();
  };
  // the headband on the player's head, in every view (cosmetic)
  let cur = null;
  const _dp = drawPlayer;
  drawPlayer = function (g, p) { cur = p; try { return _dp.apply(this, arguments); } finally { cur = null; } };
  const _dcp = drawCapPattern;
  drawCapPattern = function (g, HX, HY, f, cap, col) {
    const r = _dcp.apply(this, arguments), lk = cur && cur.def && cur.def.look, b = lk && BAND_COLS[lk.band];
    if (b) { const y = cap === 'hair' ? -4.4 : -2.2;
      g.strokeStyle = OUTLINE; g.lineWidth = 3.6; g.beginPath(); g.moveTo(HX - 9.7 * f, HY + y + 0.6); g.quadraticCurveTo(HX, HY + y - 1.6, HX + 9.2 * f, HY + y - 0.4); g.stroke();
      g.strokeStyle = b; g.lineWidth = 2.4; g.stroke(); }
    return r;
  };
  const lookDefaults = c => { if (!c) return c; c.store = c.store || {}; if (c.look) { if (c.look.band == null) c.look.band = 0; if (c.look.bottle == null) c.look.bottle = 0; } return c; };
  const _fc = freshCareer;
  freshCareer = function () { return lookDefaults(_fc.apply(this, arguments)); };
  const _lc = loadCareer;
  loadCareer = function () { const ok = _lc.apply(this, arguments); if (ok) { lookDefaults(C); Game.worldResume = C; } return ok; };
}
// the shop panel
function worldOpenShop(greet) { World.shop = { idx: 0, msg: greet ? 'Abu Karim: Assalamu alaikum! Have a look around.' : '' }; SFX.blip(); }
function worldShopUpdate() {
  const S = World.shop, n = STORE_ITEMS.length + 1;
  if (menuHit('up')) { S.idx = (S.idx + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { S.idx = (S.idx + 1) % n; SFX.blip(); }
  if (menuHit('ok')) { if (S.idx === n - 1) World.shop = null; else storeBuy(STORE_ITEMS[S.idx]); }
  else if (menuHit('back')) World.shop = null;
}
function worldDrawShop(g) {
  const S = World.shop, TT = Input.touchMode && g === ctx, x = W / 2 - 300, y = 56, w = 600, rh = 44;
  dim(g, 0.5); panel(g, x, y, w, 444, true);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText('Corner Market', x + 24, y + 38);
  g.textAlign = 'right'; g.fillStyle = '#9dffb0'; g.font = `15px ${FONT}`; g.fillText(C.hb + ' HB', x + w - 24, y + 36);
  g.textAlign = 'left'; g.fillStyle = '#cfd8e3'; g.font = `13px ${BODY}`; g.fillText(fitText(g, S.msg || (TT ? 'Looks only. Paid with Halal Bucks.' : 'Looks only: nothing here changes how you play. Paid with Halal Bucks.'), w - 48), x + 24, y + 62);
  STORE_ITEMS.forEach((it, i) => {
    const ry = y + 78 + i * rh, on = S.idx === i, own = storeOwned(it.id), wear = own && storeWearing(it);
    if (on) { g.fillStyle = 'rgba(232,195,90,0.18)'; roundRect(g, x + 12, ry, w - 24, rh - 4, 10); g.fill(); }
    // the swatch
    const sx = x + 40, sy = ry + rh / 2 - 2;
    if (it.kind === 'bottle') { wRound(g, sx - 5, sy - 13, 10, 24, 3, it.col, 1.5); g.fillStyle = '#e8ecf0'; g.fillRect(sx - 3.5, sy - 16, 7, 4); }
    else if (it.kind === 'band') { g.strokeStyle = OUTLINE; g.lineWidth = 7; g.beginPath(); g.ellipse(sx, sy, 13, 6, 0, 0, Math.PI * 2); g.stroke(); g.strokeStyle = it.col; g.lineWidth = 4.5; g.stroke(); }
    else { g.fillStyle = it.col; g.beginPath(); g.arc(sx, sy, 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `15px ${on ? FONT : BODY}`; g.fillText(it.name, x + 66, ry + 26);
    // price or state, on the right
    const tag = wear ? 'Wearing' : own ? 'Owned: wear' : it.price + ' HB', can = own || C.hb >= it.price;
    g.font = `13px ${FONT}`; const tw = g.measureText(tag).width + 24, tx = x + w - 28 - tw;
    g.fillStyle = wear ? 'rgba(157,255,176,0.2)' : own ? 'rgba(255,255,255,0.1)' : can ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.08)'; roundRect(g, tx, ry + 7, tw, 26, 13); g.fill();
    g.fillStyle = wear ? '#9dffb0' : own ? '#fff' : can ? NIGHT : '#8494a8'; g.textAlign = 'center'; g.fillText(tag, tx + tw / 2, ry + 25);
    addRect(x + 12, ry, w - 24, rh - 4, () => { S.idx = i; storeBuy(it); });
  });
  const by = y + 78 + STORE_ITEMS.length * rh + 8, on = S.idx === STORE_ITEMS.length;
  if (on) goldPill(g, W / 2 - 80, by, 160, 36, 18, false); else glassPill(g, W / 2 - 80, by, 160, 36, 18, 0.5);
  g.textAlign = 'center'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `15px ${FONT}`; g.fillText('Leave', W / 2, by + 24);
  addRect(W / 2 - 80, by, 160, 36, () => { World.shop = null; SFX.blip(); });
  if (!TT) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('↑ ↓ choose  •  Enter buy or wear  •  Esc leave', W / 2, y + 466); }
}

// ---------------------------------------------------------------- where you are today
function worldOn() { return typeof calShown === 'function' && calShown() && !!C && !!C.cal; }
function worldFreshLoc() { return { scene: 'home', x: null, d: null, face: 1, tod: 0, vis: {}, day: C.cal.d, inStore: 0, inMasjid: 0 }; }
function worldLoc() { const cal = calEnsure(); if (!cal.loc || cal.loc.day !== cal.d) cal.loc = worldFreshLoc(); cal.loc.vis = cal.loc.vis || {}; return cal.loc; }
function worldSaveLoc() {
  if (!C || !C.cal || !World.scene) return;
  const L = worldLoc(); L.scene = Game.screen === 'world' ? World.scene : L.scene; L.x = Math.round(World.x); L.d = Math.round(World.d * 1000) / 1000; L.face = World.face;
  saveCareer();
}
World.onEnter = () => { if (C && C.cal) { const L = worldLoc(); L.scene = World.scene; L.x = Math.round(World.x); L.d = Math.round(World.d * 1000) / 1000; L.face = World.face; saveCareer(); } };
function worldStartDay() {
  const L = worldLoc(); L.scene = 'home';
  worldEnter('home', 'wake');
  const D = calDay(C.cal.d);
  if (D.type === 'holiday') worldBanner(D.holiday + ' today. Eid Mubarak!');
  else if (D.fri) worldBanner('Jumu’ah today. The masjid is at the end of the street.');
}
function worldResumeAt(L) { worldEnter(L.scene, L.x != null ? { x: L.x, d: L.d, face: L.face } : L.scene === 'home' ? 'wake' : 'start'); }
// after a day change or a load, from the hub: on a free day, home (or wherever the save was)
function worldArrive(wake) {
  if (!worldOn() || calGameToday() || C.seasonOver) return false;
  const L = worldLoc();
  if (wake || L.scene === 'home' && L.x == null) { worldStartDay(); return true; }
  if (L.scene === 'hub' || !WORLD_SCENES[L.scene]) return false;
  worldResumeAt(L); return true;
}
// ---- the day's moves
function worldGoOut() { worldGo('street', 'home'); }
function worldGoHome() { worldGo(null, null, () => { const L = worldLoc(); if (L.tod >= 2) L.tod = 3; worldEnter('home', 'door'); }); }
function worldNightOk() { return worldLoc().tod >= 3 ? 'Head home for the night' : true; }
function worldStoreOk() { const L = worldLoc(); return L.tod >= 3 ? 'The store is closed for the night' : L.vis.store ? 'You went to the store today' : true; }
function worldMasjidOk() { const L = worldLoc(); return L.tod >= 3 ? 'Head home for the night' : L.vis.masjid ? 'You’ve been in today' : true; }
function worldJumuahBeacon() { const L = C && C.cal && worldLoc(); return !!L && calDay(C.cal.d).fri && !L.vis.masjid && L.tod < 3; }
function worldEnterStore() { const L = worldLoc(); L.vis.store = 1; L.inStore = 1; calCount('visit_store'); worldGo('store', 'door'); }
function worldLeaveStore() { worldGo(null, null, () => { const L = worldLoc(); if (L.inStore) { L.inStore = 0; L.tod = Math.min(3, L.tod + 1); } worldEnter('street', 'store'); }); }
function worldEnterMasjid() {
  worldGo(null, null, () => { const L = worldLoc(); L.vis.masjid = 1; L.inMasjid = 1; L.scene = 'hub'; calCount('visit_masjid'); Game.worldSuppress = true; careerHub(); Game.hubFade = 1; });
}
function worldLeaveMasjid() {
  const L = worldLoc(); if (L.inMasjid) { L.inMasjid = 0; L.tod = Math.min(3, L.tod + 1); } L.vis.masjid = 1;
  worldEnter('masjidfront', 'door');
}
function worldNextDay(to) {                                       // to: the day to wake up on
  calSetDay(to); saveCareer();
  if (calGameToday()) { Game.worldSuppress = true; careerHub(); calPlay(); }
  else worldStartDay();
}
function worldEndDay() { worldGo(null, null, () => worldNextDay(C.cal.d + 1)); }
function worldSkipDay() { if (calGameToday()) { Game.worldSuppress = true; careerHub(); calPlay(); return; } worldGo(null, null, () => worldNextDay(calNextStop(C.cal.d))); }
function worldOpenLook() { worldSaveLoc(); World.lookReturn = true; Game.creator = { idx: 0, isNew: false }; Game.screen = 'creator'; SFX.blip(); }
function worldButtons() {
  const B = World.btns || (World.btns = { skip: { label: 'Skip the day', fn: () => worldSkipDay() }, out: { label: 'Go out', fn: () => worldGoOut(), gold: true }, list: [] });
  B.list.length = 0; B.list.push(B.skip); if (World.scene === 'home') B.list.push(B.out);
  return B.list;
}
function worldHotkeys() {
  if (Input.pressed.KeyN) { worldSkipDay(); return true; }
  if (World.scene === 'home' && Input.pressed.KeyG) { worldGoOut(); return true; }
  return false;
}

// ---------------------------------------------------------------- screen glue
CAREER_SCREENS.add('world');
BACK.world = () => { if (World.talk) worldLeaveTalk(); else if (World.shop) World.shop = null; else World.menu = World.menu ? null : { idx: 0 }; };
{
  const _cu = careerUpdate;
  careerUpdate = function (rdt) { if (Game.screen === 'world') { try { worldUpdate(rdt); } catch (e) { World.lastErr = e; throw e; } if (Game.screen === 'world' && World.saveT != null && (World.saveT += rdt) > 5) { World.saveT = 0; worldSaveLoc(); } return; } return _cu.apply(this, arguments); };
  World.saveT = 0;
  const _cr = careerRender;
  careerRender = function (g) {
    if (Game.screen === 'world') return worldDraw(g);
    const r = _cr.apply(this, arguments);
    if (Game.screen === 'hub' && Game.hubFade > 0) { g.fillStyle = `rgba(4,8,12,${Game.hubFade})`; g.fillRect(-400, 0, W + 800, H); Game.hubFade = Math.max(0, Game.hubFade - (Game.rdt || STEP) * 3); }
    return r;
  };
  const _ds = drawScene;
  drawScene = function () { if (Game.screen === 'world') return; return _ds.apply(this, arguments); };   // the gym isn't drawn under the neighbourhood
  // the hub: "Go outside" (back to the masjid front) on a free day
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments);
    if (worldOn() && !C.seasonOver && !calGameToday()) { const i = R.findIndex(e => e.label === 'Continue'); R.splice(i >= 0 ? i + 1 : 0, 0, { label: 'Go outside', act: () => worldLeaveMasjid() }); }
    return R;
  };
  // arrivals: after a game's post-game (the next morning), after a load, and from the creator
  const _ch = careerHub;
  careerHub = function () {
    if (Game.worldSuppress) { Game.worldSuppress = false; return _ch.apply(this, arguments); }
    if (World.lookReturn) { World.lookReturn = false; if (World.me) World.me.def = playerDef(); Game.screen = 'world'; saveCareer(); return; }
    const r = _ch.apply(this, arguments);
    if (Game.screen !== 'hub' || !worldOn()) return r;
    const wake = Game.worldWake === C, resume = Game.worldResume === C; Game.worldWake = Game.worldResume = null;
    if (wake || resume) worldArrive(wake);
    return r;
  };
  const _pc = postgameContinue;
  postgameContinue = function () { Game.worldWake = C; return _pc.apply(this, arguments); };
  for (const name of ['calContinue', 'calNextDay']) {
    const f = window[name] || (name === 'calContinue' ? calContinue : calNextDay);
    const w = function () { const d0 = C && C.cal && C.cal.d; const r = f.apply(this, arguments); if (Game.screen === 'hub' && worldOn() && C.cal.d !== d0 && !calGameToday()) worldStartDay(); return r; };
    if (name === 'calContinue') calContinue = w; else calNextDay = w;
  }
  // touch: the stick and TALK while walking
  const _tu = TouchUI.update;
  TouchUI.update = function () {
    if (Game.screen !== 'world') return _tu.apply(this, arguments);
    if (!this.el) { _tu.apply(this, arguments); if (!this.el) return; }
    const want = Input.touchMode && !World.menu && !World.shop && !World.fadeDir;
    if (want !== this.shown) { this.shown = want; this.el.style.display = want ? 'block' : 'none'; if (want) this.layout(); else { Input.stick.ax = Input.stick.az = 0; this.sid = null; } }
    if (!want) return;
    for (const k of ['pass', 'turbo', 'cross', 'skill']) if (this.btns[k]) this.btns[k].style.display = 'none';
    this.btns.shoot.style.display = ''; this.btns.shoot.innerHTML = '<span>' + (World.talk ? 'NEXT' : 'TALK') + '</span>';
    this.btns.shoot.classList.toggle('hint', !!World.talk || !!World.near);
    this.last = ''; this.v7key = null; this.v6last = null;
  };
}
// average frame time per scene (update + draw), for the report and the tests
function worldPerfReport() { const o = {}; for (const k in World.perf) { const s = World.perf[k]; o[k] = { frames: s.dn, update: +(s.ms / Math.max(1, s.n)).toFixed(3), draw: +(s.drawMs / Math.max(1, s.dn)).toFixed(3) }; } return o; }
// gamepad wording for the world's hints and prompts (the pad presses the same keys: A = talk, Start/B = menu)
Object.assign(PAD_TEXT, {
  'W A S D to walk • E to use or talk • Esc for the menu': 'Left stick to walk • A to use or talk • Start for the menu',
  'W A S D to walk • E to use • G go out • N skip the day': 'Left stick to walk • A to use • View: buttons • Start: menu',
  '↑ ↓ choose • Enter buy or wear • Esc leave': '↑ ↓ choose • A buy or wear • B leave'
});
TOUCH_TEXT['↑ ↓ choose • Enter buy or wear • Esc leave'] = '';
