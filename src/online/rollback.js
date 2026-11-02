// ================================================= v9.14: ROLLBACK NETCODE, PART 1: A DETERMINISTIC MATCH STEP
// The plan (CHANGELOG 9.14): both players run the whole match and send each other only their controls. Each side
// plays its own input at once and guesses the other's; when the real input arrives and differs, it goes back to the
// saved state of that frame and plays the frames since again. That only works if a frame played twice, on two
// machines, gives exactly the same result. rbStep() is that frame:
//   * the match's random numbers come from its own seeded stream (M.rbSeed, saved with the state); effects, sounds,
//     the net and the camera roll their own (FX_RANDOM), so what each screen shows can't change the game;
//   * the match uses the settings both players agreed on at the start (RB.cfg), never this device's;
//   * the controls are both players' recorded inputs for that frame, played on a virtual keyboard (player 1 on the
//     WASD keys, player 2 on the arrows), so the existing control code runs unchanged;
//   * the old host / guest code stays out of the way (Net.role is cleared for the step);
//   * while a frame is played again (RB.resim), effects, sounds, replays and the like are skipped altogether.
// rbHash() is the checksum of everything the match owns, for tests now and for desync detection later.
const RB = { sim: false, resim: false, cfg: null, frame: null };   // frame: set by the online match (events in replayed frames)
// the buttons a frame's input carries, and the keys they press for player 1 and 2 (the bindings the control code reads)
const RB_BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'd', 't'];
const RB_KEYS = [['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyJ', 'KeyK', 'KeyH', 'KeyL', 'ShiftLeft'],
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Numpad1', 'Numpad2', 'Numpad0', 'Numpad3', 'ShiftRight']];
// the settings the match reads; the host's values travel with the match, with the online rules applied
const RB_CFG_KEYS = ['difficulty', 'dribble', 'teamCtl', 'casual', 'fun', 'target', 'periodLen', 'rubber', 'format', 'tomahawk', 'autoShot', 'magnet'];
function rbConfig(from = SETTINGS) {
  const o = {}; for (const k of RB_CFG_KEYS) if (k in from) o[k] = from[k];
  o.casual = false; o.autoShot = false;                                // offline-only assists (as online always was)
  return o;
}
// the match's random numbers (mulberry32 on M.rbSeed)
function rbRandom() {
  let s = M.rbSeed = (M.rbSeed + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// an input frame: { h: held bits, p: pressed bits, r: released bits, mx, mz: the stick (0 for keys alone) }
const RB_IDLE = { h: 0, p: 0, r: 0, mx: 0, mz: 0 };
// one frame of the match
function rbStep(ins, resim) {
  const keep = { rand: Math.random, role: Net.role, down: Input.down, pressed: Input.pressed, released: Input.released, stick: Input.stick,
    axes: Input.padAxis, touch: Input.touchMode, scr: Game.screen, paused: Game.paused, trivia: Game.trivia, set: {} };
  const D = {}, Pr = {}, Rl = {}, axes = [{ ax: 0, az: 0 }, { ax: 0, az: 0 }];
  for (let k = 0; k < 2; k++) {
    const I = ins[k] || RB_IDLE, K = RB_KEYS[k];
    for (let i = 0; i < K.length; i++) { const bit = 1 << i; if (I.h & bit) D[K[i]] = true; if (I.p & bit) Pr[K[i]] = true; if (I.r & bit) Rl[K[i]] = true; }
    axes[k] = { ax: I.mx || 0, az: I.mz || 0 };
  }
  for (const k in RB.cfg) { keep.set[k] = SETTINGS[k]; SETTINGS[k] = RB.cfg[k]; }
  Input.down = D; Input.pressed = Pr; Input.released = Rl; Input.stick = { ax: 0, az: 0, deep: false }; Input.padAxis = axes; Input.touchMode = false;
  const nat = {}; for (const k of RB_MATH) { nat[k] = Math[k]; Math[k] = DMath[k]; }
  Math.random = rbRandom; Net.role = null; Game.screen = 'play'; Game.paused = false; Game.trivia = null;
  RB.sim = true; RB.resim = !!resim;
  try { updateMatch(STEP); }
  catch (e) { RB.errors = (RB.errors || 0) + 1; RB.lastErr = String(e && e.stack || e).slice(0, 300); }   // (counted: a frame that throws is a bug; tests require none)
  finally {
    RB.sim = false; RB.resim = false;
    Math.random = keep.rand; Net.role = keep.role; for (const k of RB_MATH) Math[k] = nat[k];
    for (const k in keep.set) SETTINGS[k] = keep.set[k];
    Input.down = keep.down; Input.pressed = keep.pressed; Input.released = keep.released; Input.stick = keep.stick; Input.padAxis = keep.axes; Input.touchMode = keep.touch;
    if (Game.screen !== 'play') M.rbScreen = Game.screen;               // (the match asked for halftime / the final: the flow decides)
    Game.screen = keep.scr; Game.paused = keep.paused; Game.trivia = keep.trivia;
  }
}
// ---------------------------------------------------------------- what isn't the match
// Effects, sounds, replays, achievements, commentary, the net and the camera. In a rollback step they use their own
// random numbers. (Installed once; outside a rollback step they're as before.) In a replayed frame:
//   * what runs every frame (the particles, the replay recorder, the camera) is skipped;
//   * an event (a sound, a popup, a callout, the net, an achievement) plays only if it didn't already play when that
//     frame was first played (the same call within 3 frames): a dunk you first see in a replayed frame (your friend's
//     input arrived late) still swishes, once, and one that was already shown isn't shown again;
//   * always: the match uses what it returns (the commentary line), so it runs as usual (its own random numbers).
const RB_EVERY_FRAME = new Set(['FX.update', 'FX.updateReal', 'FX.reset', 'Replay.record', 'Replay.frame', 'Replay.tick', 'Replay.reset', 'updateCamera', 'updateBroadcastCam',
  'buildCourt', 'buildCrowd', 'setVenue', 'buildGymFloor']);
const RB_EVENTS = new Map();                                              // name|arguments -> the frames it played on
function rbEventKey(name, args) {
  let k = name;
  for (let i = 0; i < args.length && i < 4; i++) {
    const a = args[i], t = typeof a;
    k += '|' + (t === 'number' ? Math.round(a / 8) : t === 'string' || t === 'boolean' ? a : a && t === 'object' && typeof M !== 'undefined' && M.players && M.players.includes(a) ? 'P' + M.players.indexOf(a) : '-');
  }
  return k;
}
function rbEventSeen(key, f) { const L = RB_EVENTS.get(key); if (L) for (const g of L) if (Math.abs(g - f) <= 3) return true; return false; }
function rbEventMark(key, f) { let L = RB_EVENTS.get(key); if (!L) RB_EVENTS.set(key, L = []); L.push(f); if (L.length > 8) L.shift(); }
function rbEventsTidy(f) { for (const [k, L] of RB_EVENTS) if (L[L.length - 1] < f - 120) RB_EVENTS.delete(k); }
function rbPresent(obj, k, tag, always) {
  const f = obj[k]; if (typeof f !== 'function' || f._rb) return;
  const name = (tag || '') + k, every = RB_EVERY_FRAME.has(name);
  const w = function () {
    if (!RB.sim) return f.apply(this, arguments);
    if (!always) {
      if (RB.resim && (every || !RB.frame)) { if (!(RB.keepInResim && RB.keepInResim(name))) return; }   // (tests can keep some running, to find one that mustn't be skipped)
      else if (!every && RB.frame != null) {
        const key = rbEventKey(name, arguments);
        if (RB.resim && rbEventSeen(key, RB.frame)) return;              // already played when this frame was first played
        rbEventMark(key, RB.frame);
      }
    }
    const r = Math.random; Math.random = FX_RANDOM;
    try { return f.apply(this, arguments); } finally { Math.random = r; }
  };
  w._rb = true; obj[k] = w;
}
function rbPresentGlobal(name, always) {                                  // a global function binding, by name
  try {
    const f = (0, eval)('typeof ' + name + ' === "function" ? ' + name + ' : null'); if (!f || f._rb) return;
    const o = { [name]: f }; rbPresent(o, name, '', always); globalThis.__rbFn = o[name]; (0, eval)(name + ' = globalThis.__rbFn'); delete globalThis.__rbFn;
  } catch (e) {}
}
{
  for (const k of Object.keys(FX)) rbPresent(FX, k, 'FX.');
  for (const k of Object.keys(SFX)) rbPresent(SFX, k, 'SFX.');
  if (typeof Replay !== 'undefined') for (const k of Object.keys(Replay)) rbPresent(Replay, k, 'Replay.');
  if (typeof Ach !== 'undefined') for (const k of Object.keys(Ach)) rbPresent(Ach, k, 'Ach.');
  if (typeof Pad !== 'undefined') rbPresent(Pad, 'rumble');
  rbPresent(Hoop.prototype, 'kick', 'hoop.');
  rbPresentGlobal('pickCall', true);
  for (const n of ['toast', 'coachNote', 'updateCamera', 'buildCourt', 'buildCrowd', 'setVenue', 'buildGymFloor', 'updateBroadcastCam']) rbPresentGlobal(n);
  // the hoops: in a rollback step only the rim spring moves (bounces read it); the net is drawing (rbNets, per frame)
  const _hu = Hoop.prototype.update;
  Hoop.prototype.update = function (dt) {
    if (!RB.sim) return _hu.apply(this, arguments);
    this.vy += (-this.dy * 380 - this.vy * 8) * dt; this.dy += this.vy * dt;
  };
  RB.netUpdate = _hu;
}
function rbNets(dt) {                                                     // the net's cords, once a drawn frame (the spring kept)
  for (const h of hoops) { const dy = h.dy, vy = h.vy, r = Math.random; Math.random = FX_RANDOM; try { RB.netUpdate.call(h, dt); } finally { Math.random = r; h.dy = dy; h.vy = vy; } }
}
// ---------------------------------------------------------------- the match's checksum
// Fields that only the screen writes or reads (the HUD, reflections, trails, the sideline cast) and the hoops' nets
// are left out; everything else under M, the ball, the rim springs and the sprint gestures is in.
const RB_LOOKS = new Set(['_coach', '_refl', '_hudF', '_hudPT', '_hudA', '_sv', '_vSq', '_vT', '_vOwn', 'ivd', 'camCut', '_cvx', '_cvz', 'ix', 'iy', 'iz', 'ihip', 'irot', 'isq', 'ia', 'trail', 'cmdHook',
  'canvas', 'spr', 'sprites', 'img', 'cache', 'rbScreen', 'coach', 'pendingClips', 'highlights']);
// the definitions a match is built from (the teams, the players, their looks): never changed by a match, so saved
// frames keep a reference to them without copying them, and the checksum doesn't walk them. Found by identity, not by
// key name (a player's stats have a 'def' too: his defense). Marked by newMatch.
const RB_STATICS = new Set();
function rbMarkStatics() {
  RB_STATICS.clear();
  const add = v => { if (!v || typeof v !== 'object' || RB_STATICS.has(v) || v instanceof Hoop) return; RB_STATICS.add(v); for (const k of Object.keys(v)) add(v[k]); };
  (M.teamDefs || []).forEach(add); add(M.teamDefs);
  for (const p of M.players || []) { add(p.def); add(p.T); if (p.look && typeof p.look === 'object') add(p.look); }
  for (const t of M.teams || []) add(t.def);
}
function rbWalk(roots, out) {
  const seen = new Set();
  const go = (v, path, d) => {
    if (v == null || v === false || typeof v === 'function') return;   // (false and missing play the same)
    if (typeof v !== 'object') { out.push(path + '=' + (typeof v === 'number' ? (Object.is(v, -0) ? '0' : String(v)) : typeof v === 'string' ? v : String(v))); return; }
    if (v instanceof Hoop) { out.push(path + '=hoop' + hoops.indexOf(v)); return; }       // (its spring is under rims; the net is looks)
    if (RB_STATICS.has(v)) { out.push(path + '=static'); return; }
    if (seen.has(v) || d > 7) return; seen.add(v);
    if (typeof HTMLElement !== 'undefined' && (v instanceof HTMLElement || v instanceof CanvasRenderingContext2D || (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap))) return;
    if (v instanceof Set || v instanceof Map) { out.push(path + '#' + v.size); return; }
    for (const k of Object.keys(v)) { if (RB_LOOKS.has(k)) continue; go(v[k], path + '.' + k, d + 1); }
  };
  for (const [n, r] of roots) go(r, n, 0);
  return out;
}
function rbStateLines() {
  return rbWalk([['M', M], ['ball', ball], ['rims', hoops.map(h => [h.dy, h.vy])], ['sprint', Sprint.map(S => [S.on, S.lastDir, S.lastT, S.held])], ['react', typeof React8 !== 'undefined' ? React8 : null]], []);
}
function rbHash(lines = rbStateLines()) {
  let h = 2166136261;
  for (const s of lines) { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 10; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// ---------------------------------------------------------------- a clean start
// newMatch() resets what a match needs, but whatever an earlier game left on M and the ball (the last dunker, the
// ball's spin, cool-downs) stays. Both players must start from exactly the same state, so a rollback match first
// puts M, the ball, the crowd's memory (React8) and the sprint gestures back to how they were when the game loaded.
const RB_PRISTINE = { M: JSON.parse(JSON.stringify(M)), ball: JSON.parse(JSON.stringify(ball)), react: typeof React8 !== 'undefined' ? JSON.parse(JSON.stringify(React8)) : null };
function rbClean() {
  for (const [o, P] of [[M, RB_PRISTINE.M], [ball, RB_PRISTINE.ball], [typeof React8 !== 'undefined' ? React8 : {}, RB_PRISTINE.react || {}]]) {
    for (const k of Object.keys(o)) if (!(k in P)) delete o[k];
    Object.assign(o, JSON.parse(JSON.stringify(P)));
  }
  for (const S of Sprint) for (const k of Object.keys(S)) delete S[k];
  if (typeof _lastCall !== 'undefined') for (const k of Object.keys(_lastCall)) delete _lastCall[k];
}
// ---------------------------------------------------------------- the same math on every engine
// Math.sin, cos, exp, pow, atan2 and hypot are allowed to differ in the last bit between browsers (Chrome's V8 and
// Safari's JavaScriptCore do), and a last bit is enough for two machines to drift apart. During a rollback step they
// are replaced by these, built only from + - * / and sqrt, which IEEE 754 makes exact everywhere. Accurate to about
// 1e-16 (the native ones are about the same); offline play keeps the native functions.
const DMath = (() => {
  const SQRT = Math.sqrt, ROUND = Math.round, ABS = Math.abs, PI = 3.141592653589793, PIO2 = 1.5707963267948966;
  const P1 = 1.57079632673412561417e+00, P2 = 6.07710050630396597660e-11, P2T = 2.02226624879595063154e-21;   // pi/2 in three parts (fdlibm)
  const LN2H = 6.93147180369123816490e-01, LN2L = 1.90821492927058770002e-10, LN2 = 0.6931471805599453, SQRT2 = 1.4142135623730951;
  const F = new Float64Array(1), U = new Uint32Array(F.buffer), LO = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 0 : 1, HI = 1 - LO;
  const pow2 = k => { U[LO] = 0; U[HI] = (k + 1023) << 20; return F[0]; };   // 2^k, exact (-1022..1023)
  // series coefficients (computed once, the same way everywhere)
  const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
  const S = [], C = [], E = []; for (let i = 0; i < 9; i++) { S.push((i & 1 ? -1 : 1) / fact(2 * i + 1)); C.push((i & 1 ? -1 : 1) / fact(2 * i)); }
  for (let i = 0; i <= 15; i++) E.push(1 / fact(i));
  const ks = r => { const z = r * r; let p = S[8]; for (let i = 7; i >= 0; i--) p = p * z + S[i]; return r * p; };
  const kc = r => { const z = r * r; let p = C[8]; for (let i = 7; i >= 0; i--) p = p * z + C[i]; return p; };
  const red = x => { const n = ROUND(x * 0.6366197723675814); return [((x - n * P1) - n * P2) - n * P2T, ((n % 4) + 4) % 4]; };
  const sin = x => { if (!(x - x === 0)) return NaN; if (ABS(x) < 0.7853981633974483) return ks(x); const [r, q] = red(x); return q === 0 ? ks(r) : q === 1 ? kc(r) : q === 2 ? -ks(r) : -kc(r); };
  const cos = x => { if (!(x - x === 0)) return NaN; if (ABS(x) < 0.7853981633974483) return kc(x); const [r, q] = red(x); return q === 0 ? kc(r) : q === 1 ? -ks(r) : q === 2 ? -kc(r) : ks(r); };
  const tan = x => sin(x) / cos(x);
  // atan on [0, 1]: two half-angle steps (|y| <= tan(pi/16)), then the series
  const at01 = x => { let y = x / (1 + SQRT(1 + x * x)); y = y / (1 + SQRT(1 + y * y)); const z = y * y; let p = 1 / 25; for (let k = 11; k >= 0; k--) p = p * -z + 1 / (2 * k + 1); return 4 * y * p; };
  const atan = x => { if (x !== x) return NaN; const a = ABS(x), r = a <= 1 ? at01(a) : PIO2 - at01(1 / a); return x < 0 ? -r : r; };
  const atan2 = (y, x) => {
    if (x !== x || y !== y) return NaN;
    if (y === 0 && x === 0) return 1 / x < 0 ? (1 / y < 0 ? -PI : PI) : y;
    const ax = ABS(x), ay = ABS(y); let t = ay <= ax ? at01(ay / ax) : PIO2 - at01(ax / ay);
    if (x < 0) t = PI - t; return y < 0 || (y === 0 && 1 / y < 0) ? -t : t;
  };
  const asin = x => atan2(x, SQRT((1 - x) * (1 + x)));
  const exp = x => {
    if (x !== x) return NaN; if (x > 709.78) return Infinity; if (x < -745.2) return 0;
    const k = ROUND(x / LN2), r = (x - k * LN2H) - k * LN2L; let p = E[15]; for (let i = 14; i >= 0; i--) p = p * r + E[i];
    return k < -1020 ? p * pow2(k + 1000) * pow2(-1000) : k > 1023 ? p * pow2(k - 1) * 2 : p * pow2(k);
  };
  const log = x => {
    if (x !== x || x < 0) return NaN; if (x === 0) return -Infinity; if (x === Infinity) return Infinity;
    let e = 0; if (x < 2.2250738585072014e-308) { x *= 18014398509481984; e = -54; }   // subnormals: * 2^54
    F[0] = x; e += ((U[HI] >>> 20) & 2047) - 1023; U[HI] = (U[HI] & 0x000fffff) | 0x3ff00000; let m = F[0];
    if (m > SQRT2) { m /= 2; e++; }
    const f = (m - 1) / (m + 1), z = f * f; let p = 1 / 23; for (let k = 10; k >= 0; k--) p = p * z + 1 / (2 * k + 1);
    return e * LN2H + (2 * f * p + e * LN2L);
  };
  const pow = (a, b) => {
    if (b === 0) return 1; if (a !== a || b !== b) return NaN;
    if (b === (b | 0) && b > -65 && b < 65) { let r = 1, q = a, n = b < 0 ? -b : b; while (n) { if (n & 1) r *= q; q *= q; n >>= 1; } return b < 0 ? 1 / r : r; }
    if (a === 0) return b > 0 ? 0 : Infinity; if (a < 0) return NaN;
    return exp(b * log(a));
  };
  const log2 = x => log(x) / LN2;
  function hypot(a, b, c) {
    const n = arguments.length;
    if (n === 2) { if (a === Infinity || a === -Infinity || b === Infinity || b === -Infinity) return Infinity; return SQRT(a * a + b * b); }
    if (n === 3) { if (ABS(a) === Infinity || ABS(b) === Infinity || ABS(c) === Infinity) return Infinity; return SQRT(a * a + b * b + c * c); }
    let s = 0; for (let i = 0; i < n; i++) { const v = +arguments[i]; if (ABS(v) === Infinity) return Infinity; s += v * v; } return SQRT(s);
  }
  return { sin, cos, tan, atan, atan2, asin, exp, log, pow, log2, hypot };
})();
const RB_MATH = Object.keys(DMath);
// ---------------------------------------------------------------- saving and restoring a frame
// rbSave() keeps a shallow copy of every object, array, Set and Map the match owns (everything reachable from M, the
// ball and the sprint gestures, without the team definitions and the fields only the screen uses); rbLoad() puts
// those values back into the same objects, so every reference anyone holds (a player in the renderer's caches, the
// AI's player) still points at the right thing. Objects made after the save simply stop being referenced.
function rbSkipKey(k) { return RB_LOOKS.has(k); }
function rbSave() {
  const list = [], seen = new Set();
  const go = v => {
    if (v == null || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
    if (RB_STATICS.has(v) || v instanceof Hoop || (typeof HTMLElement !== 'undefined' && v instanceof HTMLElement) || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D)) return;
    if (Array.isArray(v)) { list.push(v, v.slice()); for (let i = 0; i < v.length; i++) go(v[i]); return; }
    if (v instanceof Set) { const a = [...v]; list.push(v, a); for (const x of a) go(x); return; }
    if (v instanceof Map) { const a = [...v]; list.push(v, a); for (const [k, x] of a) { go(k); go(x); } return; }
    const c = {}; for (const k of Object.keys(v)) { if (rbSkipKey(k)) continue; const x = v[k]; c[k] = x; if (x !== null && typeof x === 'object') { if (k === 'hist') { if (!seen.has(x)) { seen.add(x); list.push(x, x.slice()); } } else go(x); } }   // (a player's position history: records are never changed once added)
    list.push(v, c);
  };
  go(M); go(ball); go(Sprint); if (typeof React8 !== 'undefined') go(React8);
  return { list, rims: hoops.map(h => [h.dy, h.vy]) };
}
function rbLoad(S) {
  const L = S.list;
  for (let i = 0; i < L.length; i += 2) {
    const o = L[i], c = L[i + 1];
    if (Array.isArray(o)) { o.length = c.length; for (let j = 0; j < c.length; j++) o[j] = c[j]; }
    else if (o instanceof Set) { o.clear(); for (const x of c) o.add(x); }
    else if (o instanceof Map) { o.clear(); for (const [k, x] of c) o.set(k, x); }
    else {
      const now = Object.keys(o); let same = true, j = 0;                // the same keys in the same order? (usually)
      for (const k of now) { if (rbSkipKey(k)) continue; if (!(k in c)) { same = false; break; } j++; }
      if (same && j !== Object.keys(c).length) same = false;
      if (same) { let i2 = 0; const ck = Object.keys(c); for (const k of now) { if (rbSkipKey(k)) continue; if (k !== ck[i2++]) { same = false; break; } } }
      if (!same) for (const k of now) if (!rbSkipKey(k)) delete o[k];   // (rebuilt in the saved order: code that loops over keys sees the same order)
      Object.assign(o, c);
    }
  }
  hoops.forEach((h, i) => { h.dy = S.rims[i][0]; h.vy = S.rims[i][1]; });
}
// the checksum of a saved frame: every value in save order (numbers by their exact bits), objects by their place in the save
const RB_HF = new Float64Array(1), RB_HU = new Uint32Array(RB_HF.buffer);
function rbHashSaved(S) {
  const L = S.list, id = new Map(); for (let i = 0; i < L.length; i += 2) id.set(L[i], i >> 1);
  let h = 2166136261;
  const mix = n => { h ^= n; h = Math.imul(h, 16777619); };
  const val = v => {
    if (v === undefined) return mix(1); if (v === null) return mix(2); if (v === true) return mix(3); if (v === false) return mix(4);
    const t = typeof v;
    if (t === 'number') { RB_HF[0] = v === 0 ? 0 : v; mix(RB_HU[0]); mix(RB_HU[1]); return; }
    if (t === 'string') { mix(5); for (let i = 0; i < v.length; i++) mix(v.charCodeAt(i)); return; }
    if (t === 'object') { const k = id.get(v); mix(k == null ? 6 : 7 + k); return; }   // (an object outside the save: a hoop, a definition)
    mix(8);
  };
  for (let i = 0; i < L.length; i += 2) {
    const o = L[i], c = L[i + 1]; mix(0xabc);
    if (Array.isArray(o) || o instanceof Set) { mix(c.length); for (const x of c) val(x); }
    else if (o instanceof Map) { mix(c.length); for (const [k, x] of c) { val(k); val(x); } }
    else for (const k in c) { const x = c[k]; if (x === false || x === undefined) continue; val(k); val(x); }   // (false and missing play the same)
  }
  for (const r of S.rims) { val(r[0]); val(r[1]); }
  return h >>> 0;
}
// a saved frame as text lines (tests: what differs between two sides)
function rbSavedLines(S) {
  const L = S.list, id = new Map(), out = []; for (let i = 0; i < L.length; i += 2) id.set(L[i], i >> 1);
  const v = x => x === undefined ? 'undef' : x === null ? 'null' : typeof x === 'object' ? (id.has(x) ? '#' + id.get(x) : '#out:' + (x.constructor && x.constructor.name)) : typeof x + ':' + String(x);
  for (let i = 0; i < L.length; i += 2) {
    const o = L[i], c = L[i + 1], n = '#' + (i >> 1) + (o.constructor ? '<' + o.constructor.name + '>' : '');
    if (Array.isArray(o) || o instanceof Set) c.forEach((x, j) => out.push(n + '[' + j + ']=' + v(x)));
    else if (o instanceof Map) c.forEach(([k, x], j) => out.push(n + '{' + v(k) + '}=' + v(x)));
    else for (const k in c) { if (c[k] === false || c[k] === undefined) continue; out.push(n + '.' + k + '=' + v(c[k])); }
  }
  return out;
}
{
  const _nm = newMatch;
  newMatch = function () { const r = _nm.apply(this, arguments); rbMarkStatics(); return r; };
}
