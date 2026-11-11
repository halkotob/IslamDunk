// v9.19.1: the in-page probe for tools/ball-hands.mjs and tests/ball-hands.mjs (see tools/ball-hands.mjs)
export const BALL_HANDS_JS = `(() => {
  if (window.__bh) return;
  const B = window.__bh = { cur: null, grp: null, groups: [], faceAt: new Map(), frame: 0 };
  const arc = CanvasRenderingContext2D.prototype.arc;
  // a hand is a 4.5 circle filled with his skin (or the far arm's dimmed skin): held until the fill says which it was
  const norm = c => { const g = document.createElement('canvas').getContext('2d'); g.fillStyle = c; return g.fillStyle; }, skins = new Map();
  const skinOf = p => { let k = skins.get(p.def); if (!k) { k = new Set([norm(p.def.skin), norm(shade(p.def.skin, -0.22))]); skins.set(p.def, k); } return k; };
  CanvasRenderingContext2D.prototype.arc = function (x, y, r) {
    if (B.grp && this === ctx && Math.abs(r - 4.5) < 0.01) { const m = this.getTransform(), q = m.transformPoint(new DOMPoint(x, y)); B.pend = [q.x, q.y, B.cur.spin || 0]; }
    return arc.apply(this, arguments);
  };
  const fill = CanvasRenderingContext2D.prototype.fill;
  CanvasRenderingContext2D.prototype.fill = function () {
    if (B.pend && B.grp && this === ctx) { if (skinOf(B.cur).has(String(this.fillStyle).toLowerCase())) B.grp.hands.push(B.pend); }
    B.pend = null; return fill.apply(this, arguments);
  };
  const _dp = drawPlayer;
  drawPlayer = function (g, p) { if (g !== ctx || ball.owner !== p || p._refl) { const kg = B.grp, kc = B.cur; B.grp = null; B.cur = null; try { return _dp.apply(this, arguments); } finally { B.grp = kg; B.cur = kc; } }   // (anyone else drawn inside his drawing isn't counted)
  const keep = B.cur, kg = B.grp; B.cur = p; B.grp = { hands: [], ball: null, m: g.getTransform() }; B.groups.push(B.grp); try { return _dp.apply(this, arguments); } finally { B.cur = keep; B.grp = kg; } };   // (each drawing of him on its own: a frame can draw him more than once)
  // the ball as drawn: its sprite's drawImage (the ball sprite is one cached canvas), on his drawing, with the transform he's drawn with
  const di = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, x, y, w, h) {
    if (B.grp && this === ctx && !B.grp.ball && arguments.length === 5 && img === ballSprite()) {
      const m = this.getTransform(), T0 = B.grp.m, q = m.transformPoint(new DOMPoint(x + w / 2, y + h / 2));
      if (Math.abs(m.a - T0.a) < 1e-6 && Math.abs(m.e - T0.e) < 1e-3 && Math.abs(m.f - T0.f) < 1e-3) B.grp.ball = [q.x, q.y, m.a];
    }
    return di.apply(this, arguments);
  };
  // one drawn frame: the gap from the held ball to the nearer drawn hand, in game units
  B.measure = (where) => {
    const p = ball.owner; if (!p || !M.players || !M.players.includes(p)) return null;
    const lf = B.faceAt.get(p); if (!lf || lf.f !== p.face) B.faceAt.set(p, { f: p.face, at: B.frame });
    B.groups = []; const ka = Game.alpha; Game.alpha = 1;   // (drawn at the step just taken: the callers run snapPrev() before each step, as the game loop does)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); try { render(ctx); } finally { Game.alpha = ka; }
    const G = B.groups.filter(q => q.ball && q.hands.length >= 2).pop();
    if (!G) return null;   // the drawing of him on the court (a frame can draw him more than once)
    const BB = G.ball, HH = G.hands;
    const k = depthK(p.z) * BB[2];   // canvas units per game unit at the player's depth (the transform's scale: dpr and any camera zoom)
    // a dribble (free or a fake, not holding it: not picked up, not the drop step's gather, not the step-back's landing hold)
    const mvu = p.mv ? p.mv.t / p.mv.dur : 0, held = (typeof ANIM_PICKED === 'function' && ANIM_PICKED(p)) || (p.mv && p.mv.kind === 'drop' && mvu >= 0.15) || (p.mv && p.mv.kind === 'stepback' && mvu >= 0.75);
    const drib = (p.state === 'free' || p.state === 'fake') && !held && !p.fakeHold;
    // a hand-to-hand move (crossover, between the legs, behind the back) is in the air between the hands mid-move
    const between = drib && p.move && p.move.t / p.move.dur > 0.15 && p.move.t / p.move.dur < 0.85;
    // (a dribble takes the ball to the floor and back: there only the sideways gap counts)
    const H2 = HH.slice(-2);   // (the body's own hands are the last two drawn: a speed trail or after-image draws copies first)
    if (between) return null;   // (not held: on its way from one hand to the other)
    const hs = H2.map(h => (drib ? Math.abs(h[0] - BB[0]) : Math.hypot(h[0] - BB[0], h[1] - BB[1])) / k);
    const hi = hs[0] <= hs[1] ? 0 : 1, dx = (BB[0] - H2[hi][0]) / k, dy = (BB[1] - H2[hi][1]) / k;
    const spin = HH[HH.length - 1][2], sc = spin ? Math.cos(spin) : 1, drawnF = Math.sign(p.face * (Math.abs(sc) < 0.2 ? 0.2 * Math.sign(sc) : sc)) || p.face;
    const st = p.state, a = p.act;
    const pose = st === 'free' ? (p.move ? 'move:' + p.move.type : p.mv ? 'mv:' + p.mv.kind : (Math.hypot(p.vx || 0, p.vz || 0) > 40 ? 'dribble-run' : 'stance')) + (p.dh ? '/' + p.dh : '')
      : st === 'shoot' || st === 'windup' ? st + ':' + (p.layV ? 'lay-' + p.layV : p.sigShot || p.shotType || 'jumper') : st === 'dunk' ? 'dunk:' + (a && a.type) : st;
    return { where, st, pose, gap: +Math.min(...hs).toFixed(1), face: p.face, drawnF, spin: +(spin || 0).toFixed(2), last: p._lastMv || '-', since: B.frame - B.faceAt.get(p).at, human: p.human >= 0, t: +(p.st_t || 0).toFixed(2), name: p.def.name, groups: B.groups.length, nh: HH.length, drib: !!drib, dx: +dx.toFixed(1), dy: +dy.toFixed(1), wb: Math.round(ball.x - p.x), wh: Math.round(p.hands.n.x - p.x), wbz: Math.round(ball.z - p.z), wby: Math.round(ball.y) };
  };
  // the last move a player made (for grouping)
  const _sdm = startDribbleMove; startDribbleMove = function (p, kind) { const r = _sdm.apply(this, arguments); if (r !== false && p) p._lastMv = kind; return r; };
})()`;
