// ================================================= v8.6.5: TOMAHAWK ANIMATION STYLES (Settings → Game → Tomahawk style)
// Cosmetic only. The dunk's path, timing, slam moment, hitboxes and scoring are untouched; only the pose
// targets the spring rig chases change.
// Float is the default (v8.6.6). Classic is the pose from animation.js + v86-play.js, unchanged: hard targets that switch at
// u = 0.12, 0.56 and 0.8 (u = dunk progress, the slam is at 0.8). Those jumps are what reads as rough:
// at each one every joint target moves at once and, at 0.56, the stiffness jumps from 1500 to 2600.
// The other styles are a continuous function of u: keyframes, eased with smoothstep between them, with
// the spring stiffness (K) and damping (D) eased too so a phase change never kicks the rig. Each keyframe
// is a full pose, so nothing stale can leak through. All angles stay inside ranges used elsewhere.
SETTINGS.tomahawk = 'float';                         // v8.6.6: Float is the default; Classic and the others stay in Settings
const TOMAHAWK_STYLES = ['classic', 'smooth', 'power', 'float'];
const TOMAHAWK_TXT = { classic: 'Classic', smooth: 'Smooth', power: 'Power', float: 'Float' };
(() => { try { const v = localStorage.getItem('islamdunk.tomahawk'); if (TOMAHAWK_STYLES.includes(v)) SETTINGS.tomahawk = v; } catch (e) {} })();
// the classic poses (same numbers as the classic layers)
const TK_GATHER = { nk: 1.1, fk: 1.1, nh: 0.6, fh: 0.6, ns: 1.0, fs: 1.0, ne: 1.4, fe: 1.4, lean: 0.3, K: 1100, D: 34 };
const TK_COCK = { ns: 3.75, ne: 2.35, fs: 1.3, fe: 0.7, lean: -0.2, nh: 1.45, nk: 2.0, fh: -0.1, fk: 0.5, K: 1500, D: 34 };
const TK_SLAM = { ns: 1.9, ne: 0.15, fs: 1.6, fe: 0.5, lean: 0.34, nh: 0.9, nk: 1.2, fh: 0.2, fk: 0.6, K: 2600, D: 40 };
const TK_FOLLOW = { ns: 2.2, fs: 2.0, ne: 0.15, fe: 0.15, nk: 0.8, fk: 0.8, nh: 0.3, fh: 0.2, lean: 0.1, K: 1100, D: 34 };
const tkp = (base, o) => Object.assign({}, base, o);
// [u, pose] keyframes; between two keyframes the pose eases with smoothstep, so two equal poses make a hold
const TOMAHAWK_KEYS = {
  // the same poses as classic, each change blended over about 0.08 of the dunk; damping near critical
  smooth: [
    [0, tkp(TK_GATHER, { D: 52 })], [0.08, tkp(TK_GATHER, { D: 52 })],
    [0.16, tkp(TK_COCK, { D: 60 })], [0.52, tkp(TK_COCK, { D: 60 })],
    [0.6, tkp(TK_SLAM, { K: 2200, D: 74 })], [0.76, tkp(TK_SLAM, { K: 2200, D: 74 })],
    [0.84, tkp(TK_FOLLOW, { D: 52 })], [1, tkp(TK_FOLLOW, { D: 52 })]
  ],
  // a longer hold at the top (cocked further, back arched, knee up), a fast whip and a hard arm snap into
  // the slam, a hang on the rim, then a slow release
  power: [
    [0, tkp(TK_GATHER, { D: 50 })], [0.06, tkp(TK_GATHER, { D: 50 })],
    [0.16, { ns: 3.75, ne: 2.45, fs: 1.15, fe: 0.8, lean: -0.3, nh: 1.55, nk: 2.1, fh: -0.15, fk: 0.45, K: 1700, D: 62 }],
    [0.6, { ns: 3.72, ne: 2.5, fs: 1.1, fe: 0.85, lean: -0.32, nh: 1.6, nk: 2.15, fh: -0.15, fk: 0.45, K: 1700, D: 62 }],
    [0.68, { ns: 1.6, ne: 0.08, fs: 1.7, fe: 0.4, lean: 0.42, nh: 1.0, nk: 1.3, fh: 0.25, fk: 0.7, K: 3000, D: 80 }],
    [0.8, { ns: 1.6, ne: 0.08, fs: 1.7, fe: 0.4, lean: 0.42, nh: 1.0, nk: 1.3, fh: 0.25, fk: 0.7, K: 3000, D: 80 }],
    [0.86, { ns: 3.05, ne: 0.15, fs: 2.4, fe: 0.3, lean: 0.05, nh: 0.3, nk: 0.5, fh: -0.1, fk: 0.35, K: 1400, D: 60 }],   // hanging on the rim
    [0.94, { ns: 3.05, ne: 0.15, fs: 2.4, fe: 0.3, lean: 0.05, nh: 0.3, nk: 0.5, fh: -0.1, fk: 0.35, K: 1400, D: 60 }],
    [1, tkp(TK_FOLLOW, { K: 800, D: 50 })]
  ],
  // a lighter, longer glide: the arm sweeps back slowly, a softer slam, a long follow-through, legs trailing
  float: [
    [0, tkp(TK_GATHER, { K: 900, D: 48 })], [0.1, tkp(TK_GATHER, { K: 900, D: 48 })],
    [0.42, { ns: 3.55, ne: 2.05, fs: 1.45, fe: 0.6, lean: -0.12, nh: 1.15, nk: 1.6, fh: -0.25, fk: 0.9, K: 1000, D: 50 }],
    [0.56, { ns: 3.6, ne: 2.1, fs: 1.45, fe: 0.6, lean: -0.14, nh: 1.1, nk: 1.5, fh: -0.3, fk: 1.0, K: 1000, D: 50 }],
    [0.72, { ns: 2.1, ne: 0.3, fs: 1.7, fe: 0.5, lean: 0.25, nh: 0.7, nk: 1.0, fh: -0.2, fk: 1.0, K: 1600, D: 60 }],
    [0.8, { ns: 2.0, ne: 0.25, fs: 1.75, fe: 0.5, lean: 0.27, nh: 0.65, nk: 0.95, fh: -0.25, fk: 1.05, K: 1600, D: 60 }],
    [1, { ns: 2.3, ne: 0.2, fs: 2.1, fe: 0.2, lean: 0.06, nh: 0.25, nk: 0.9, fh: -0.35, fk: 1.2, K: 900, D: 46 }]   // legs trailing
  ]
};
const TK_JOINTS = ['nh', 'nk', 'fh', 'fk', 'ns', 'ne', 'fs', 'fe', 'lean', 'K', 'D'];
const smoothstep01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function tomahawkPose(style, u) {                       // a full pose (all joints, K and D) for dunk progress u
  const keys = TOMAHAWK_KEYS[style]; if (!keys) return null;
  u = clamp(u, 0, 1);
  let i = 0; while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const [u0, A] = keys[i], [u1, B] = keys[i + 1], f = smoothstep01((u - u0) / Math.max(1e-6, u1 - u0)), out = {};
  for (const k of TK_JOINTS) out[k] = lerp(A[k], B[k], f);
  return out;
}
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments);
    if (SETTINGS.tomahawk !== 'classic' && p.state === 'dunk' && p.act && p.act.type === 'tomahawk') {
      const q = tomahawkPose(SETTINGS.tomahawk, p.act.s);
      if (q) { Object.assign(t, q); delete t.direct; }
    }
    return t;
  };
  const i = SET_ITEMS.findIndex(s => s.label === 'Team control');
  SET_ITEMS.splice(i + 1, 0, { label: 'Tomahawk style', get: () => TOMAHAWK_TXT[SETTINGS.tomahawk], step: d => setTomahawk(d) });
  const G = SET_GROUPS.find(g => g.name === 'Game'); if (G && G.labels && !G.labels.includes('Tomahawk style')) G.labels.push('Tomahawk style');
}
// ---- the styles stay cosmetic: where the ball is during a tomahawk counts for blocks and swipes, so the sim
// keeps it in the hand of the Classic pose (a shadow rig, run alongside) and only the drawing (and replays)
// put it in the hand you see. Seeded games come out the same whatever the style.
function tkHands(p, J) {                                // the forward kinematics from animate(), for a given set of joints
  const legY = (h, k) => 22 * Math.cos(h) + 22 * Math.cos(h - k);
  const hipH = Math.max(legY(J.nh.a, J.nk.a), legY(J.fh.a, J.fk.a), 20);
  const lean = J.lean.a, shX = Math.sin(lean) * 30, shY = hipH + Math.cos(lean) * 30, fs = p.face * (p.spin ? Math.cos(p.spin) : 1), out = {};
  for (const side of ['n', 'f']) {
    const s = J[side + 's'].a, e = J[side + 'e'].a, ex = shX + Math.sin(s) * 16, ey = shY - Math.cos(s) * 16;
    out[side] = { x: p.x + (ex + Math.sin(s + e) * 15) * fs, y: p.y + ey - Math.cos(s + e) * 15, z: p.z + (side === 'n' ? 6 : -6) };
  }
  return out;
}
{
  const _an = animate;
  animate = function (p, dt) {
    const tom = SETTINGS.tomahawk !== 'classic' && p.state === 'dunk' && p.act && p.act.type === 'tomahawk';
    if (tom && p._cjAct !== p.act) { p._cjAct = p.act; p._cj = {}; for (const k of JOINTS) p._cj[k] = { a: p.j[k].a, v: p.j[k].v }; }   // starts where the real rig is
    if (!tom) p._cjAct = p._cj = null;
    const r = _an.apply(this, arguments);
    if (ball.vd && ball.vdP === p && (!tom || ball.owner !== p)) ball.vd = null;
    if (!tom || !p._cj) return r;
    const s0 = SETTINGS.tomahawk; let T; SETTINGS.tomahawk = 'classic';
    try { T = poseTargets(p, Math.hypot(p.vx, p.vz)); } finally { SETTINGS.tomahawk = s0; }
    for (const k of JOINTS) { const j = p._cj[k]; j.v += ((T[k] - j.a) * T.K - j.v * T.D) * dt; j.a += j.v * dt; }
    if (ball.owner !== p) return r;
    const H = tkHands(p, p._cj); let bx, by, bz;                    // where attachBall() would hold it in the Classic pose
    if (p.act.s > 0.12) { bx = H.n.x; by = H.n.y + 4; bz = H.n.z; }
    else { bx = (H.n.x + H.f.x) / 2 + p.face * 3; by = (H.n.y + H.f.y) / 2 + 2; bz = (H.n.z + H.f.z) / 2 + 3; }
    by = Math.max(BALL_R, by);
    ball.vd = [ball.x - bx, ball.y - by, ball.z - bz]; ball.vdP = p;
    ball.x = bx; ball.y = by; ball.z = bz;
    return r;
  };
  const _sp = snapPrev;
  snapPrev = function () { _sp.apply(this, arguments); ball.ivd = ball.vd ? ball.vd.slice() : null; };
  const _rf = Replay.frame;
  Replay.frame = function () { const f = _rf.apply(this, arguments), d = ball.vd; if (d && f && f.b) { f.b[0] += d[0]; f.b[1] += d[1]; f.b[2] += d[2]; } return f; };
  const _r = render;
  render = function (g) {                                // draw the ball in the hand you see
    const d = ball.vd, id = ball.ivd || d;
    if (!d || Replay.active) return _r.apply(this, arguments);
    const ix = ball.ix !== undefined;
    ball.x += d[0]; ball.y += d[1]; ball.z += d[2]; if (ix) { ball.ix += id[0]; ball.iy += id[1]; ball.iz += id[2]; }
    try { return _r.apply(this, arguments); }
    finally { ball.x -= d[0]; ball.y -= d[1]; ball.z -= d[2]; if (ix) { ball.ix -= id[0]; ball.iy -= id[1]; ball.iz -= id[2]; } }
  };
}
function setTomahawk(d) {
  const n = TOMAHAWK_STYLES.length;
  SETTINGS.tomahawk = TOMAHAWK_STYLES[(TOMAHAWK_STYLES.indexOf(SETTINGS.tomahawk) + (d || 1) + n) % n];
  try { localStorage.setItem('islamdunk.tomahawk', SETTINGS.tomahawk); } catch (e) {}
}

// ---------------------------------------------------------------- Dunk lab (Options → Extras → Dunk lab)
// A review tool: the player stands at the free-throw line facing the hoop. SHOOT (K) runs a tomahawk and
// resets; PASS (J) switches the style in place; MOVE (H) toggles slow motion (0.3x). Pause → Quit leaves.
const DL = { on: false, slow: false, n: 0, prev: {}, live: false };
function dlMe() { return M.players && M.players.find(q => q.human === 0); }
function dlReset() {
  const me = dlMe(); if (!me) return;
  const h = attackHoop(me.team);
  M.phase = 'live'; M.inb = null; M.check = null; M.bc = null; M.nextInbound = null; M.sideOut = null; M.ft = null; M.pendingEnd = false;
  for (const q of M.players) { q.pick = null; if (q !== me) place(q, h.x + h.dir * 760, 640); }   // the others wait at the far end
  me.act = null;
  place(me, h.x + h.dir * 170, h.z); me.state = 'free'; me.y = 0; me.vx = me.vz = me.vy = 0; me.face = sgn(h.x - me.x); me.turbo = 100;
  Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0, grabLock: 0 }); giveBall(me, 'inbound');
  M.shotClock = scReset(); M.teams[0].score = M.teams[1].score = 0;          // the game never ends
}
function dlDunk() {
  const me = dlMe(); if (!me || me.state === 'dunk') return;
  dlReset(); startDunk(me, {}); me.act.type = 'tomahawk'; me.act.big = true; DL.n++; DL.live = true;
}
function startDunkLab() {
  goTitle(); Game.paused = false; Game.trivia = null;
  newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }], fmt: { format: 'first21', target: 99, len: 120, sc: 0 } });
  for (const q of M.players) q.hifzUsed = true;
  M.introT = 0; Game.screen = 'play'; DL.on = true; DL.slow = false; DL.n = 0; DL.prev = {}; M.cmdHook = dlCmd; dlReset();
}
function dlCmd(q) {
  if (!DL.on) return false;
  const me = dlMe();
  if (q !== me) { zeroCmd(q.cmd); return true; }
  humanCmd(q.human, q.cmd); const c = q.cmd, edge = k => !!c[k] && !DL.prev[k];
  if (edge('b')) dlDunk();
  if (edge('a')) { setTomahawk(1); SFX.blip && SFX.blip(); }
  if (edge('x')) DL.slow = !DL.slow;
  DL.prev = { a: !!c.a, b: !!c.b, x: !!c.x };
  zeroCmd(c); M.shotClock = scReset();
  return true;
}
{
  for (const k of ['unlock', 'add', 'addUnique']) { const f = Ach[k]; if (f) Ach[k] = function () { if (DL.on) return; return f.apply(this, arguments); }; }   // a review tool earns nothing
  const _um = updateMatch;
  updateMatch = function () {                                        // back on the line once he has landed (whatever the made basket set up)
    const r = _um.apply(this, arguments), me = DL.on && dlMe();
    if (me && DL.live && me.state !== 'dunk' && me.state !== 'hang' && me.state !== 'jump' && me.y <= 0) { DL.live = false; dlReset(); }
    return r;
  };
  const _gt = goTitle; goTitle = function () { if (DL.on) { DL.on = false; M.cmdHook = null; FX.scale = 1; FX.slowT = 0; } return _gt.apply(this, arguments); };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    if (DL.on && Game.screen === 'play' && M.players) { if (M.cmdHook !== dlCmd) M.cmdHook = dlCmd; if (DL.slow) { FX.scale = 0.3; FX.slowT = 0.2; } }
    return _gu.apply(this, arguments);
  };
  const _r = render;
  render = function (g) {
    _r(g);
    if (!DL.on || Game.screen !== 'play' || Game.paused) return;
    const w = Math.min(560, W - 40), x = W / 2 - w / 2, y = 64, T = Input.touchMode;
    g.save(); g.fillStyle = 'rgba(8,16,28,0.9)'; roundRect(g, x, y, w, 92, 14); g.fill(); g.strokeStyle = 'rgba(232,195,90,0.6)'; g.lineWidth = 1.5; g.stroke();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `18px ${FONT}`; g.fillText('Dunk lab: ' + TOMAHAWK_TXT[SETTINGS.tomahawk] + ' tomahawk' + (DL.slow ? '  •  0.3x' : ''), x + 16, y + 28);
    g.fillStyle = IVORY; g.font = `13px ${BODY}`;
    g.fillText(T ? 'SHOOT: dunk   PASS: next style   MOVE: slow motion' : 'K: dunk   J: next style   H: slow motion   Esc: pause / quit', x + 16, y + 54);
    uiButton(g, x + 16, y + 62, 110, 24, 'Dunk', () => dlDunk(), true);
    uiButton(g, x + 136, y + 62, 130, 24, 'Next style', () => setTomahawk(1));
    uiButton(g, x + 276, y + 62, 130, 24, DL.slow ? 'Normal speed' : 'Slow motion', () => { DL.slow = !DL.slow; });
    uiButton(g, x + w - 96, y + 62, 80, 24, 'Quit', () => goTitle());
    g.restore();
  };
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    const menu = _tm(), op = menu.find(e => e.label === 'Options'), ex = op && op.sub && op.sub.find(e => e.label === 'Extras');
    if (ex && ex.sub && !ex.sub.some(e => e.label === 'Dunk lab')) ex.sub.push({ label: 'Dunk lab', act: () => startDunkLab() });
    return menu;
  };
}
