// ================================================= v9.2: THE NEIGHBOURHOOD — scene engine
// Small, data-driven 2.5D scenes (home, the street, the masjid front, the store). A scene is a definition
// (see world-scenes.js) and this file runs any of them:
//   ground      screen y and character scale at the back (d = 0) and front (d = 1) of the walkable floor
//   walk        walkable polygons in (x, d) space; props block their footprint; NPCs block a small ellipse
//   layers      far (parallax < 1), base (moves with the world), fg (parallax > 1), glow (lights, added after the tint)
//   props       drawn once per time of day into their own small canvas, then depth-sorted with the characters
//   portals     exits (label, target scene, spawn point, optional condition)
//   uses        interaction points (label, action, optional condition)
//   npcs        people with a pose, an optional stroll path and short lines (one set per day, never back to back)
// Every static layer and prop is rendered once per scene and time of day into an offscreen canvas at the canvas's
// current backing scale (rebuilt when adaptive resolution or a resize changes it). Per frame: three or four
// drawImage calls for the layers, one per prop and character in depth order, one multiply tint, the glow, the HUD.
// Times of day: morning, afternoon, dusk, night (sky, a tint over the scene, shadow length/direction, window glow).

const TOD = [
  { id: 'morning', label: 'Morning', sky: ['#8cc6ec', '#eef6fb'], tint: '#fff3e2', tintA: 0.10, sh: { dx: -0.9, len: 1.15, a: 0.24 }, lights: 0 },
  { id: 'afternoon', label: 'Afternoon', sky: ['#5fa8de', '#d6ecfb'], tint: '#ffffff', tintA: 0, sh: { dx: 0.35, len: 0.75, a: 0.26 }, lights: 0 },
  { id: 'dusk', label: 'Dusk', sky: ['#33427e', '#f0a062'], tint: '#ffb98a', tintA: 0.26, sh: { dx: 1.25, len: 1.7, a: 0.18 }, lights: 0.75 },
  { id: 'night', label: 'Night', sky: ['#0a1330', '#22305a'], tint: '#4a5c98', tintA: 0.66, sh: { dx: 0, len: 0.6, a: 0.30 }, lights: 1 }
];
const WORLD_SCENES = {};
const WORLD_MARGIN = 220;                                        // drawn past both world ends, so a wide screen never shows an edge
const WORLD_SPEED = { x: 175, d: 0.62 };                         // walking: px/s at scale 1, depth units/s
const WORLD_BODY = { rx: 15, rd: 0.035 };                         // the player's footprint
const WORLD_REACH = { x: 78, d: 0.24 };                           // how close counts as "next to" something
const WORLD_FIG_H = 104;                                          // a standing figure is ~104 px tall at scale 1

const World = {
  scene: null, def: null, x: 0, d: 0.5, face: 1, me: null, npcs: [], talk: null, fade: 0, fadeDir: 0, next: null,
  camX: 0, t: 0, near: null, menu: null, shop: null, cache: null, list: [], photo: null, c2: {}, vw: W,
  perf: {}, lastErr: null, onEnter: null, banner: null, bannerT: 0
};
function worldDefine(def) {
  def.layers = def.layers || {}; def.props = def.props || []; def.portals = def.portals || []; def.uses = def.uses || []; def.npcs = def.npcs || []; def.spots = def.spots || {};
  for (const p of def.props) { p.box = p.box || [p.w || 80, p.h || 80]; p.pad = p.pad == null ? 46 : p.pad; }
  WORLD_SCENES[def.id] = def; return def;
}
function wGroundY(def, d) { return lerp(def.ground.y0, def.ground.y1, d); }
function wScale(def, d) { return lerp(def.ground.s0, def.ground.s1, d); }
function worldTod() { const L = C && C.cal && C.cal.loc; return World.photo ? World.photo.tod : clamp((L && L.tod) | 0, 0, 3); }

// ---------------------------------------------------------------- walkable space
function wInPoly(P, x, d) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], di = P[i][1], xj = P[j][0], dj = P[j][1];
    if ((di > d) !== (dj > d) && x < (xj - xi) * (d - di) / (dj - di) + xi) c = !c;
  }
  return c;
}
function wOnFloor(def, x, d) { for (const P of def.walk) if (wInPoly(P, x, d)) return true; return false; }
function wPropHit(def, x, d, rx = WORLD_BODY.rx, rd = WORLD_BODY.rd) {
  for (const p of def.props) { const f = p.foot; if (!f) continue; if (x > p.x + f[0] - rx && x < p.x + f[1] + rx && d > p.d + f[2] - rd && d < p.d + f[3] + rd) return p; }
  return null;
}
function wNpcHit(x, d, skip) {
  for (const n of World.npcs) { if (n === skip || n.ghost) continue; const ex = (x - n.x) / 30, ed = (d - n.d) / 0.085; if (ex * ex + ed * ed < 1) return n; }
  return null;
}
// a point the player can stand on: on the floor, the body inside it, clear of props and NPCs
function wWalkable(def, x, d, npcs = true) {
  const rx = WORLD_BODY.rx, rd = WORLD_BODY.rd;
  if (!wOnFloor(def, x, d) || !wOnFloor(def, x - rx, d) || !wOnFloor(def, x + rx, d) || !wOnFloor(def, x, d - rd) || !wOnFloor(def, x, d + rd)) return false;
  if (wPropHit(def, x, d)) return false;
  return !(npcs && wNpcHit(x, d));
}

// ---------------------------------------------------------------- caches (per scene and time of day)
function worldCacheScale() { const k = canvas.height / H; return Math.min(2, Math.max(0.5, Math.round(k * 4) / 4)); }
// a layer is cut into tiles at most WORLD_TILE device px wide (GPU texture limits; iOS canvas memory); each tile
// replays the layer's drawing with its own offset, clipped to itself
const WORLD_TILE = 2048;
function wLayerTiles(w, k, fn) {
  const tw = Math.floor(WORLD_TILE / k / 4) * 4, tiles = [];                 // k is a multiple of 0.25, so tw * k is a whole number of pixels (no seams)
  for (let x0 = 0; x0 < w; x0 += tw) {
    const lw = Math.min(tw, w - x0), cv = document.createElement('canvas'); cv.width = Math.ceil(lw * k); cv.height = Math.ceil(H * k);
    const g = cv.getContext('2d'); wTextWatch(g, k); g.scale(k, k); g.translate(-x0, 0); fn(g); tiles.push({ cv, x0, w: lw });
  }
  return tiles;
}
// text baked into the scene (signs) is outside the phone audit's hook on the game canvas, so it's recorded here
// with its size in game pixels (the world-flow test checks it against the phone minimum)
World.signText = new Map();
function wTextWatch(g, k) {
  const f = g.fillText;
  g.fillText = function (t, x, y, mw) { const m = this.getTransform(), px = parseFloat((/([\d.]+)px/.exec(this.font) || [])[1] || 0) * Math.hypot(m.a, m.b) / k, o = World.signText.get(t); if (!o || px < o) World.signText.set(String(t), Math.round(px * 10) / 10); return mw === undefined ? f.call(this, t, x, y) : f.call(this, t, x, y, mw); };
}
function worldCache(def, tod) {
  const k = worldCacheScale(), C0 = World.cache, sig = def.sig ? def.sig() : '';
  if (C0 && C0.id === def.id && C0.tod === tod && C0.k === k && C0.sig === sig) return C0;
  const M_ = WORLD_MARGIN, T = TOD[tod], R = { id: def.id, tod, k, sig, layers: {}, props: [] };
  World.cache = null;                                               // drop the old canvases before building the new ones
  const span = (par) => def.w * par + 1500 + 2 * M_;                 // enough for the widest screen at any camera position
  for (const name of ['far', 'base', 'fg', 'glow']) {
    const L = def.layers[name]; if (!L) continue;
    const par = L.par || 1, w = name === 'base' || name === 'glow' ? def.w + 2 * M_ : span(par);
    R.layers[name] = { par, w, tiles: wLayerTiles(w, k, g => { g.translate(M_, 0); L.draw(g, T, tod, def); }) };
  }
  for (const p of def.props) {
    const [bw, bh] = p.box, pad = p.pad, s = wScale(def, p.d), w = (bw + pad * 2) * s, h = (bh + pad * 2) * s;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
    const g = cv.getContext('2d'); wTextWatch(g, k); g.scale(k, k); g.translate(w / 2, (bh + pad) * s); g.scale(s, s);
    p.draw(g, T, tod, def, p);
    R.props.push({ p, cv, w, h, ax: w / 2, ay: (bh + pad) * s });
  }
  World.cache = R; return R;
}
function wDrawLayer(g, L, vx0, vw) {
  const M_ = WORLD_MARGIN, k = World.cache.k, sx = vx0 * L.par + M_;       // the layer's x at the left of the screen
  for (const t of L.tiles) {
    const a = Math.max(sx, t.x0), b = Math.min(sx + vw, t.x0 + t.w); if (b <= a) continue;
    g.drawImage(t.cv, (a - t.x0) * k, 0, (b - a) * k, H * k, a - sx, 0, b - a, H);
  }
}

// ---------------------------------------------------------------- people
function worldPerson(def) {
  const p = new Player(def, 9, 0, amanahTeam()); p.outfit = 'thobe'; p.state = 'free'; p.face = 1; p.x = -9999; p.noMarker = true;
  for (let i = 0; i < 20; i++) animate(p, 1 / 60);
  return p;
}
function worldNpcDef(n) {
  if (n.cast) return castDef(n.cast);
  return Object.assign({ name: n.name, num: 0, skin: '#c68a5a', hat: 'hair', hair: '#161616', thobe: '#e9e2d0', beardStyle: 0 }, n.look || {});
}
function worldBuildNpcs(def) {
  World.npcs = def.npcs.filter(n => !n.when || n.when()).map(n => {
    const o = { n, id: n.id, x: n.x, d: n.d, face: n.face || 1, p: worldPerson(worldNpcDef(n)), pi: 0, wait: (n.wait || 1.5) * 0.5, moving: false, ghost: !!n.ghost, k: n.kid ? 0.72 : 1, rx: n.rx, rd: n.rd };
    if (n.kit) { o.p.outfit = null; o.p.Tfix = Object.assign({}, amanahTeam(), n.kit); }
    o.p.face = o.face; return o;
  });
}
function worldNpcStep(o, dt) {
  const n = o.n, p = o.p;
  p.vx = p.vz = 0; p.fakeIdle = true;
  if (World.talk && World.talk.npc === o) { o.face = sgn(World.x - o.x) || o.face; o.moving = false; }
  else if (n.path && n.path.length > 1) {
    if (o.wait > 0) { o.wait -= dt; o.moving = false; }
    else {
      const tg = n.path[o.pi], dx = tg[0] - o.x, dd = tg[1] - o.d, dist = Math.hypot(dx, dd * 600);
      if (dist < 3) { o.pi = (o.pi + 1) % n.path.length; o.wait = n.wait || 1.5; o.moving = false; }
      else {
        const sp = (n.speed || 55) * dt, ux = dx / dist, ud = dd * 600 / dist;
        const nx = o.x + ux * sp, nd = o.d + ud * sp / 600;
        const me = Math.hypot((nx - World.x) / 30, (nd - World.d) / 0.085) < 1.15;   // politely wait for the player
        if (!me) { o.x = nx; o.d = nd; o.moving = true; o.face = Math.abs(ux) > 0.1 ? sgn(ux) : o.face; p.vx = 60; p.fakeIdle = false; }
        else o.moving = false;
      }
    }
  } else if (n.faceYou && Math.abs(World.x - o.x) < 260) o.face = sgn(World.x - o.x) || o.face;
  p.face = o.face; animate(p, dt);
}

// ---------------------------------------------------------------- enter, leave, fade
function worldEnter(id, spot, opts = {}) {
  const def = WORLD_SCENES[id]; if (!def) throw new Error('worldEnter:' + id);
  World.scene = id; World.def = def; World.talk = null; World.menu = null; World.shop = null; World.near = null;
  const s = (typeof spot === 'object' && spot) || def.spots[spot] || def.spots.start;
  World.x = s.x != null ? s.x : s[0]; World.d = s.d != null ? s.d : s[1]; World.face = (s.face != null ? s.face : s[2]) || 1;
  if (!World.me) World.me = worldPerson(playerDef());
  World.me.def = playerDef(); World.me.face = World.face;
  worldBuildNpcs(def);
  World.camX = worldCamTarget();
  World.fade = opts.noFade ? 0 : 1; World.fadeDir = opts.noFade ? 0 : -1;
  Game.screen = 'world';
  if (def.onEnter) def.onEnter(def);
  if (World.onEnter) World.onEnter(def);
}
function worldGo(id, spot, after) { if (World.fadeDir) return; World.next = { id, spot, after }; World.fadeDir = 1; SFX.blip(); }
function worldCamTarget() {
  const def = World.def, vw = World.vw, max = Math.max(0, def.w - vw);
  return def.w <= vw ? (def.w - vw) / 2 : clamp(World.x - vw / 2, 0, max);
}

// ---------------------------------------------------------------- interactions
// targets: portals, uses and NPCs, each with an approach point (ax, ad) and a label
function worldTargets() {
  const def = World.def, out = World.tg || (World.tg = []); out.length = 0;
  for (const q of def.portals) out.push(q);
  for (const q of def.uses) out.push(q);
  for (const o of World.npcs) if (o.n.lines || o.n.act) out.push(o);
  return out;
}
function wTargetPos(q) { return q.n ? [q.x, q.d] : [q.x, q.d]; }
function wTargetLabel(q) {
  if (q.n) return q.n.act ? q.n.actLabel || ('Talk to ' + q.n.name) : 'Talk to ' + q.n.name;
  const why = q.ok ? q.ok() : true;
  return why === true ? (typeof q.label === 'function' ? q.label() : q.label) : why;
}
function wTargetOk(q) { return q.n ? true : !q.ok || q.ok() === true; }
function worldNearest() {
  let best = null, bs = 1e9;
  for (const q of worldTargets()) {
    const [tx, td] = wTargetPos(q), dx = Math.abs(tx - World.x), dd = Math.abs(td - World.d);
    const rx = q.rx || WORLD_REACH.x, rd = q.rd || WORLD_REACH.d;
    if (dx < rx && dd < rd) { const sc = dx / rx + dd / rd; if (sc < bs) { bs = sc; best = q; } }
  }
  return best;
}
function worldUse(q) {
  if (!q || World.talk || World.fadeDir || World.menu || World.shop) return;
  if (q.n) { worldTalkTo(q); return; }
  if (!wTargetOk(q)) { SFX.bad && SFX.bad(); return; }
  q.act(q);
}
function worldLinesFor(n) {
  const sets = n.lines || []; if (!sets.length) return [];
  const day = (C && C.cal ? C.cal.d : 0), h = hash32(n.id) % 997;
  return sets[(day + h) % sets.length];                            // consecutive days get different sets
}
function worldTalkTo(o) {
  const n = o.n; o.face = sgn(World.x - o.x) || o.face; World.face = -o.face || World.face;
  if (n.act) { n.act(o); return; }
  const lines = worldLinesFor(n).map(l => typeof l === 'string' ? [n.id, l] : l);
  if (!lines.length) return;
  World.talk = { lines, i: 0, t: 0, npc: o, done: null }; SFX.blip();
  if (C && C.cal) calCount('talks');
}
function worldSay(lines, npc, done) { World.talk = { lines, i: 0, t: 0, npc: npc || null, done: done || null }; }
function worldAdvance() {
  const T = World.talk; if (!T || T.t < 0.22) return;            // ignore the press that opened the line
  T.i++; T.t = 0; SFX.blip();
  if (T.i >= T.lines.length) { World.talk = null; World.talkCool = 0.35; if (T.done) T.done(); }
}
function worldLeaveTalk() { if (!World.talk) return; World.talk = null; World.talkCool = 0.35; SFX.blip(); }   // always leavable: Esc, Back, the Leave button
const worldOk = () => Input.pressed.Enter || Input.pressed.NumpadEnter || Input.pressed.KeyE || Input.pressed.Space || Input.pressed.KeyK;

// ---------------------------------------------------------------- update
function worldUpdate(rdt) {
  const t0 = performance.now(), def = World.def; if (!def) return;
  if (World.photo && World.photo.freeze) return;                  // a frozen frame (gallery and visual regression)
  const dt = Math.min(rdt, 0.05); World.t += dt;
  if (World.bannerT > 0) World.bannerT -= dt;
  const me = World.me;
  // fades
  if (World.fadeDir) {
    World.fade = clamp(World.fade + World.fadeDir * dt / 0.28, 0, 1);
    if (World.fadeDir > 0 && World.fade >= 1) { const nx = World.next; World.next = null; World.fadeDir = 0; if (nx.after) nx.after(); else worldEnter(nx.id, nx.spot); if (Game.screen === 'world' && !World.fadeDir) { World.fade = 1; World.fadeDir = -1; } }
    else if (World.fadeDir < 0 && World.fade <= 0) World.fadeDir = 0;
    me.vx = me.vz = 0; me.fakeIdle = true; animate(me, dt);
    for (const o of World.npcs) worldNpcStep(o, dt);
    World.camX = worldCamTarget(); worldPerf(t0); return;
  }
  if (World.talk) {
    World.talk.t += dt;
    if (menuHit('back')) worldLeaveTalk(); else if (worldOk()) worldAdvance();
    me.vx = me.vz = 0; me.fakeIdle = true; animate(me, dt);
    for (const o of World.npcs) worldNpcStep(o, dt);
    worldPerf(t0); return;
  }
  if (World.shop) { worldShopUpdate(dt); me.fakeIdle = true; animate(me, dt); for (const o of World.npcs) worldNpcStep(o, dt); worldPerf(t0); return; }
  if (World.menu) { worldMenuUpdate(); me.fakeIdle = true; animate(me, dt); worldPerf(t0); return; }
  if (menuHit('back')) { World.menu = { idx: 0 }; SFX.blip(); worldPerf(t0); return; }
  if (worldHotkeys()) { worldPerf(t0); return; }
  // walking
  const c = me.cmd; humanCmd(0, c);
  if (!c.mx && !c.mz) { const c2 = World.c2; humanCmd(1, c2); c.mx = c2.mx || 0; c.mz = c2.mz || 0; }
  const s = wScale(def, World.d), vx = c.mx * WORLD_SPEED.x * s, vd = c.mz * WORLD_SPEED.d * (def.dSpeed || 1);
  worldMove(vx * dt, vd * dt);
  if (Math.abs(c.mx) > 0.05) World.face = c.mx > 0 ? 1 : -1;
  me.face = World.face; me.vx = Math.abs(vx) > 1 || Math.abs(vd) > 0.01 ? 60 : 0; me.vz = 0; me.fakeIdle = !(Math.abs(c.mx) + Math.abs(c.mz) > 0.05); animate(me, dt);
  for (const o of World.npcs) worldNpcStep(o, dt);
  World.camX = lerp(World.camX, worldCamTarget(), Math.min(1, dt * 8));
  World.near = worldNearest();
  if (World.talkCool > 0) World.talkCool -= dt;                    // the press that ended a talk doesn't start it again
  else if (World.near && worldOk()) worldUse(World.near);
  worldPerf(t0);
}
// move with sliding: both axes, then each axis alone
function worldMove(dx, dd) {
  const def = World.def, x = World.x, d = World.d;
  if (!dx && !dd) return;
  if (wWalkable(def, x + dx, d + dd)) { World.x = x + dx; World.d = d + dd; return; }
  if (dx && wWalkable(def, x + dx, d)) { World.x = x + dx; return; }
  if (dd && wWalkable(def, x, d + dd)) World.d = d + dd;
}
function worldPerf(t0) { const s = World.perf[World.scene] || (World.perf[World.scene] = { n: 0, ms: 0, drawMs: 0, dn: 0 }); s.n++; s.ms += performance.now() - t0; }

// ---------------------------------------------------------------- draw
function worldDraw(g) {
  const t0 = performance.now(), def = World.def; if (!def) return;
  const ox = Game.ox || 0, w0 = W, vw = w0 + 2 * ox; World.vw = vw;
  const tod = worldTod(), T = TOD[tod], cache = worldCache(def, tod), camX = Math.round(World.camX * 2) / 2;
  g.save(); g.translate(-ox, 0); W = vw;
  // 1. far, 2. base
  if (cache.layers.far) wDrawLayer(g, cache.layers.far, camX, vw);
  if (cache.layers.base) wDrawLayer(g, cache.layers.base, camX, vw);
  // 3. props and people in depth order
  const L = World.list; L.length = 0;
  for (const pc of cache.props) L.push(pc);
  L.push(World);
  for (const o of World.npcs) L.push(o);
  for (let i = 1; i < L.length; i++) { const v = L[i], dv = wDepthOf(v); let j = i - 1; while (j >= 0 && wDepthOf(L[j]) > dv) { L[j + 1] = L[j]; j--; } L[j + 1] = v; }
  World.drawn = World.drawn || []; World.drawn.length = 0;
  for (const v of L) {
    if (v === World) worldDrawPerson(g, World.me, World.x, World.d, 1, 'stand', T, camX, 'you');
    else if (v.p && v.n) worldDrawPerson(g, v.p, v.x, v.d, v.k, v.n.pose || 'stand', T, camX, v.id, v);
    else { const sx = v.p.x - camX, sy = wGroundY(def, v.p.d); g.drawImage(v.cv, Math.round((sx - v.ax) * 2) / 2, Math.round((sy - v.ay) * 2) / 2, v.w, v.h); World.drawn.push(v.p.d); }
  }
  // 4. foreground
  if (cache.layers.fg) wDrawLayer(g, cache.layers.fg, camX, vw);
  // 5. the time of day over everything in the world
  if (T.tintA > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = T.tintA * (def.interior ? 0.55 : 1); g.fillStyle = T.tint; g.fillRect(0, 0, vw, H); g.restore(); }
  // 6. lights
  if (T.lights && cache.layers.glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = T.lights; wDrawLayer(g, cache.layers.glow, camX, vw); g.restore(); }
  if (def.drawLive) def.drawLive(g, T, tod, camX);
  W = w0; g.restore();
  // 7. prompts and talk, in the 960-wide space where taps are registered (world x - camera - ox)
  worldDrawPrompts(g, camX + ox, ox);
  worldDrawHud(g, T);
  if (World.fade > 0) { g.fillStyle = `rgba(4,8,12,${World.fade})`; g.fillRect(-400, 0, W + 800, H); }
  const s = World.perf[World.scene]; if (s) { s.drawMs += performance.now() - t0; s.dn++; }
}
function wDepthOf(v) { return v === World ? World.d : v.n ? v.d : v.p.d; }
function worldDrawPerson(g, p, x, d, kScale, pose, T, camX, id, o) {
  const def = World.def, s = wScale(def, d) * (kScale || 1), sx = x - camX, sy = wGroundY(def, d);
  // the time-of-day shadow (length and direction), under the figure's own contact shadow
  const sh = T.sh; g.fillStyle = `rgba(20,14,30,${sh.a})`; g.beginPath(); g.ellipse(sx + sh.dx * 13 * s, sy + 1, (14 + sh.len * 9) * s, 4.5 * s, 0, 0, Math.PI * 2); g.fill();
  musFigure(g, p, sx, sy, s, pose);
  if (id === 'you' && p.def.look && p.def.look.bottle) worldBottle(g, sx, sy, s, p.face);
  if (o && o.n.kid && o.n.ball) worldKidBall(g, o, sx, sy, s);
  World.drawn.push(d);
  if (World.feet) World.feet.push({ id, y: sy, d, sy: wGroundY(def, d) });
}
function worldBottle(g, x, y, s, f) {                            // a water bottle clipped at the hip
  const bx = x - 7 * f * s, by = y - 50 * s;
  g.save(); g.translate(bx, by); g.scale(s, s);
  g.fillStyle = OUTLINE; roundRect(g, -3.6, -9.6, 7.2, 15.2, 2.4); g.fill();
  g.fillStyle = '#4aa3df'; roundRect(g, -2.6, -8.6, 5.2, 13.2, 1.8); g.fill();
  g.fillStyle = '#e8ecf0'; g.fillRect(-2, -11.5, 4, 2.6);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-1.6, -7, 1.2, 9);
  g.restore();
}
function worldKidBall(g, o, sx, sy, s) {                          // the kids pass the ball between them
  const ph = (World.photo ? 0.3 : World.t) * 0.55 % 1, other = World.npcs.find(q => q !== o && q.n.kid);
  if (!other || o.id > other.id) return;
  const ex = other.x - World.camX, ey = wGroundY(World.def, other.d), u = ph < 0.5 ? ph * 2 : 2 - ph * 2;
  const bx = lerp(sx + o.face * 10 * s, ex + other.face * 10 * s, u), by = lerp(sy, ey, u) - 18 * s - 52 * s * Math.sin(Math.PI * u);
  g.fillStyle = 'rgba(20,14,30,0.22)'; g.beginPath(); g.ellipse(bx, lerp(sy, ey, u), 6 * s, 2 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = OUTLINE; g.beginPath(); g.arc(bx, by, 6.6 * s, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e07b2a'; g.beginPath(); g.arc(bx, by, 5.6 * s, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(40,20,8,0.7)'; g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(bx - 5.6 * s, by); g.lineTo(bx + 5.6 * s, by); g.moveTo(bx, by - 5.6 * s); g.lineTo(bx, by + 5.6 * s); g.stroke();
}
function wHeadY(d, k = 1) { return wGroundY(World.def, d) - WORLD_FIG_H * wScale(World.def, d) * k; }
function worldDrawPrompts(g, camX, ox) {
  const def = World.def;
  if (World.talk) {
    const T = World.talk, [who, text] = T.lines[Math.min(T.i, T.lines.length - 1)];
    const o = who === 'you' ? null : World.npcs.find(q => q.id === who) || T.npc;
    const x = (o ? o.x : World.x) - camX, y = wHeadY(o ? o.d : World.d, o ? o.k : 1) - 4;
    introBubble(g, x, y, who === 'you' ? (C.name || 'You') : (o ? o.n.name : who), text, true);
    addRect(0, 60, W, H - 60, worldAdvance);
    return;
  }
  if (World.fadeDir || World.menu || World.shop) return;
  // beacons (Jumu'ah: the way to the masjid)
  for (const q of def.portals) if (q.beacon && q.beacon()) {
    const bx = q.x - camX, by = wHeadY(q.d) - 40 - 6 * Math.sin((World.photo ? 1 : World.t) * 4);
    g.fillStyle = 'rgba(242,207,107,0.92)'; g.beginPath(); g.moveTo(bx, by + 16); g.lineTo(bx - 11, by); g.lineTo(bx + 11, by); g.closePath(); g.fill();
  }
  const q = World.near; if (!q) return;
  const [tx, td] = wTargetPos(q), x = clamp(tx - camX, 90 - ox, W + ox - 90), y = Math.max(70, wHeadY(td, q.k || 1) - 8);
  const ok = wTargetOk(q), label = wTargetLabel(q) + (ok && !Input.touchMode ? (Input.lastDev === 'pad' ? '  (A)' : '  (E)') : '');
  q.fn = q.fn || (() => worldUse(q));
  if (ok) introPrompt(g, x, y, label, q.fn);
  else { g.font = `12px ${FONT}`; const w = g.measureText(label).width + 26; g.fillStyle = 'rgba(8,16,24,0.82)'; roundRect(g, x - w / 2, y - 26, w, 26, 13); g.fill(); g.fillStyle = '#cfd8e3'; g.textAlign = 'center'; g.fillText(label, x, y - 8); }
}

// ---------------------------------------------------------------- HUD: date, buttons, menu, the Leave button
function worldPill(g, x, y, w, label, fn, gold) {
  const h = 34, hov = hovering(x, y, w, h), pr = pressing(x, y, w, h);
  if (gold || hov || pr) goldPill(g, x, y, w, h, 17, pr);
  else { g.fillStyle = 'rgba(8,16,24,0.82)'; roundRect(g, x, y, w, h, 17); g.fill(); g.strokeStyle = 'rgba(242,207,107,0.55)'; g.lineWidth = 1.2; g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = gold || hov || pr ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.fillText(label, x + w / 2, y + 22);
  addRect(x, y, w, h, fn);
}
function worldDrawHud(g, T) {
  const TT = Input.touchMode && g === ctx;
  // date and time of day
  if (C && C.cal) {
    const t = calDate(C.cal.d), txt = CAL_WD[t.wd] + ' ' + t.day + ' ' + (TT ? CAL_MONTHS_SHORT : CAL_MONTHS)[t.m] + '  •  ' + T.label;
    g.font = `13px ${FONT}`; const w = g.measureText(txt).width + 28, x = 104;
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x, 12, w, 32, 16); g.fill();
    g.textAlign = 'left'; g.fillStyle = IVORY; g.fillText(txt, x + 14, 33);
    if (calDay(C.cal.d).fri) { g.font = `12px ${FONT}`; const jw = g.measureText('JUMU’AH').width + 20; g.fillStyle = 'rgba(30,90,74,0.95)'; roundRect(g, x + w + 8, 15, jw, 26, 13); g.fill(); g.fillStyle = GOLD; g.textAlign = 'center'; g.fillText('JUMU’AH', x + w + 8 + jw / 2, 33); }
  }
  if (World.talk) {                                               // always leavable
    worldPill(g, W - 124, 12, 112, 'Leave', worldLeaveTalk);
    return;
  }
  if (World.menu) { worldDrawMenu(g); return; }
  if (World.shop) { worldDrawShop(g); return; }
  const btns = worldButtons();
  let x = W - 12;
  for (const b of btns) { g.font = `14px ${FONT}`; const w = Math.max(110, g.measureText(b.label).width + 32); x -= w; worldPill(g, x, 12, w, b.label, b.fn, b.gold); x -= 8; }
  if (World.banner && World.bannerT > 0) {
    g.save(); g.globalAlpha = Math.min(1, World.bannerT / 0.4); g.font = `15px ${FONT}`; const w = g.measureText(World.banner).width + 40;
    g.fillStyle = 'rgba(8,16,24,0.82)'; roundRect(g, W / 2 - w / 2, 64, w, 36, 18); g.fill(); g.strokeStyle = 'rgba(242,207,107,0.6)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = GOLD; g.textAlign = 'center'; g.fillText(World.banner, W / 2, 88); g.restore();
  }
  if (!TT) introHint(g, World.def.hint ? World.def.hint() : 'W A S D to walk  •  E to use or talk  •  Esc for the menu');
}
function worldBanner(text) { World.banner = text; World.bannerT = 3.2; }
// the menu (Esc / Back / Start): Resume, Skip the day, Main menu
function worldMenuItems() { return [['Resume', () => { World.menu = null; }], ['Skip the day', () => { World.menu = null; worldSkipDay(); }], ['Main menu', () => { World.menu = null; worldSaveLoc(); goTitle(); }]]; }
function worldMenuUpdate() {
  const m = World.menu, it = worldMenuItems(), n = it.length;
  if (menuHit('up')) { m.idx = (m.idx + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { m.idx = (m.idx + 1) % n; SFX.blip(); }
  if (menuHit('ok')) { SFX.blip(); it[m.idx][1](); } else if (menuHit('back')) World.menu = null;
}
function worldDrawMenu(g) {
  const it = worldMenuItems(), m = World.menu;
  dim(g, 0.55);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(World.def.name, W / 2, 150);
  drawMenu(g, it.map(x => x[0]), m.idx, 220, i => { m.idx = i; SFX.blip(); it[i][1](); });
}
