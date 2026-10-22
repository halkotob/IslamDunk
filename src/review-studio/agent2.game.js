// Review Studio agent, Phase 2: animations and screens. Evaluated in the game frame after agent.game.js.
// Animations run on the game's own simulation: a throwaway match, the move started with the game's own starter
// (startDunk, startShot, doPass, startJump, trySteal, knockDown, startDribbleMove, taunts, reactions...), then
// updateMatch(STEP) one step at a time, so animate() poses the rig exactly as in a game. Screens use the same
// setups as the phone text audit (tests/phone-audit.mjs SCREENS) plus a few of the studio's own.
(() => {
  const RS = window.__RS;

  // ---------------------------------------------------------------- the game's frame loop: hold it while recording
  const raf = window.requestAnimationFrame.bind(window);
  let hold = false, held = null;
  window.requestAnimationFrame = cb => { if (hold && cb === frame) { held = cb; return 0; } return raf(cb); };
  RS.freeze = on => { if (on) { hold = true; return; } if (!hold) return; hold = false; if (held) { const h = held; held = null; lastT = 0; raf(h); } };
  RS.frozen = () => hold;

  // a fixed random sequence while an animation records, so every playback is the same
  const realRandom = Math.random;
  const seed = n => { let s = n >>> 0 || 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const unseed = () => { Math.random = realRandom; };

  // ---------------------------------------------------------------- animations
  const toward = (me) => -attackHoop(me.team).dir;                 // stick x that runs at the hoop
  const run = (k, turbo) => (me, t, c) => { c.mx = toward(me) * k; c.turbo = !!turbo; };
  const A = [];
  const add = (group, id, name, o) => A.push(Object.assign({ group, id, name, n: 120, dist: 330, ball: false, needBall: false, follow: false, hoop: false }, o));
  add('Stand and move', 'idle/default', 'Idle', { n: 150 });
  add('Stand and move', 'walk/default', 'Walk', { n: 150, dist: 700, follow: true, cmd: run(0.3) });
  add('Stand and move', 'run/default', 'Run', { n: 120, dist: 800, follow: true, cmd: run(1) });
  add('Stand and move', 'sprint/default', 'Sprint (turbo)', { n: 120, dist: 900, follow: true, cmd: run(1, true) });
  add('Dribble', 'dribble/classic', 'Dribble, Classic style', { n: 150, dist: 800, ball: true, needBall: true, follow: true, cmd: run(0.8), setup: () => { SETTINGS.dribble = 'classic'; } });
  add('Dribble', 'dribble/stride', 'Dribble, Stride style (NBA Jam pace)', { n: 150, dist: 800, ball: true, needBall: true, follow: true, cmd: run(0.8), setup: () => { SETTINGS.dribble = 'stride'; } });
  add('Dribble', 'dribble/standing', 'Dribble in place', { n: 150, ball: true, needBall: true, setup: () => { SETTINGS.dribble = 'classic'; } });
  for (const [k, nm] of [['cross', 'Crossover'], ['btb', 'Behind the back'], ['spin', 'Spin move'], ['hesi', 'Hesitation'], ['stepback', 'Step-back'], ['drop', 'Drop step']])
    add('Dribble moves', 'move/' + k, nm, { n: 70, dist: 520, ball: true, needBall: true, follow: true, cmd: run(0.6), at: 12, start: c => startDribbleMove(c.me, k, 1) });
  add('Dribble moves', 'pickup/default', 'Pump fake: picks up the dribble', { n: 90, ball: true, needBall: true, at: 10, start: c => startFake(c.me) });
  for (const [k, d, nm] of [['jumper', 330, 'Jump shot'], ['fade', 260, 'Fadeaway'], ['floater', 200, 'Floater'], ['hook', 150, 'Hook shot'], ['layup', 80, 'Layup'], ['reverse', 60, 'Reverse layup'], ['upunder', 80, 'Up and under']])
    add('Shots', 'shoot/' + k, nm, { n: 110, dist: d, ball: true, needBall: true, hoop: true, at: 8, start: c => { startShot(c.me); applyShotType(c.me, k); if (typeof TYPE_JUMP !== 'undefined' && TYPE_JUMP[k]) c.me.jumpVy = TYPE_JUMP[k]; } });
  // startDunk picks the dunk type at random; set the one we want and give it that type's length, as startDunk does
  const DUNK_K = { windmill: 1.08, '360': 1.12, twohand: 0.94 };
  const dunk = (type, d, style) => c => {
    if (style) SETTINGS.tomahawk = style;
    const h = attackHoop(c.me.team), dd = dxz(c.me, h);
    startDunk(c.me, {});
    const a = c.me.act, baseD = clamp(0.6 + dd / 450, 0.62, 1.15);
    a.type = type; a.D = baseD * (DUNK_K[type] || 1); a.peak = 64 + (a.D - 0.7) * 30 + (type === '360' ? 8 : 0);
    if (style) a.big = true;
  };
  add('Dunks', 'dunk/twohand', 'Two-hand dunk', { n: 120, dist: 90, ball: true, needBall: true, hoop: true, at: 6, start: dunk('twohand') });
  add('Dunks', 'dunk/windmill', 'Windmill', { n: 130, dist: 150, ball: true, needBall: true, hoop: true, at: 6, start: dunk('windmill') });
  add('Dunks', 'dunk/360', '360', { n: 140, dist: 200, ball: true, needBall: true, hoop: true, at: 6, start: dunk('360') });
  for (const st of (typeof TOMAHAWK_STYLES !== 'undefined' ? TOMAHAWK_STYLES : ['classic']))
    add('Dunks', 'dunk/tomahawk-' + st, 'Tomahawk, ' + st[0].toUpperCase() + st.slice(1) + ' style', { n: 130, dist: 170, ball: true, needBall: true, hoop: true, at: 6, start: dunk('tomahawk', 170, st) });
  add('Dunks', 'dunk/alley', 'Alley-oop (catch and dunk)', { n: 150, dist: 190, ball: false, hoop: true, at: 6,
    setup: c => { const h = attackHoop(c.me.team); place(c.mate, h.x + h.dir * 420, h.z + 140); giveBall(c.mate, 'inbound'); },
    start: c => doPass(c.mate, c.me, true) });
  add('Dunks', 'hang/default', 'Hang on the rim', { n: 90, dist: 90, ball: true, needBall: true, hoop: true, at: 1, start: dunk('twohand'), until: c => c.me.state === 'hang' });
  for (const k of ['chest', 'bounce', 'lead', 'alley'])
    add('Passes', 'pass/' + k, { chest: 'Chest pass', bounce: 'Bounce pass', lead: 'Lead pass', alley: 'Alley-oop lob' }[k], { n: 60, ball: true, needBall: true, at: 8,
      setup: c => { const h = attackHoop(c.me.team); place(c.mate, c.me.x - h.dir * 120, c.me.z + 150); c.mate.state = 'free'; },
      start: c => { doPass(c.me, c.mate, k === 'alley'); c.me.state = 'pass'; c.me.st_t = 0; c.me.passKind = k; } });
  add('Defense', 'steal/default', 'Steal (reach in)', { n: 60, at: 10,
    setup: c => { place(c.o1, c.me.x - attackHoop(c.me.team).dir * 40, c.me.z); c.o1.face = -c.me.face; giveBall(c.o1, 'inbound'); },
    start: c => trySteal(c.me) });
  add('Defense', 'block/default', 'Block (jump)', { n: 80, at: 8, start: c => startJump(c.me) });
  add('Defense', 'shove/default', 'Shove', { n: 70, at: 8, setup: c => { place(c.o1, c.me.x - attackHoop(c.me.team).dir * 36, c.me.z); }, start: c => tryShove(c.me) });
  add('Defense', 'ankles/default', 'Ankle break (crossed up)', { n: 70, dist: 520, follow: true, cmd: run(0.5), at: 10, start: c => { c.me.stumble = 0.55; c.me.shook = 0.47; c.me.shookDir = { x: attackHoop(c.me.team).dir, z: 0 }; } });
  add('Falls', 'fall/default', 'Knocked down, and getting up', { n: 160, at: 8, start: c => knockDown(c.me, attackHoop(c.me.team).dir, 0) });
  add('Celebrate', 'celebrate/default', 'Celebration (arm up)', { n: 120, at: 4, start: c => { c.me.celebrate = 1.6; } });
  for (const t of (typeof TAUNTS !== 'undefined' ? TAUNTS : []))
    add('Taunts', 'taunt/' + t.id, 'Taunt: ' + t.name, { n: t.id === 'sujood' ? 150 : 110, at: 6, start: c => { c.me.taunt = { k: t.id, t0: M.time, dur: t.id === 'sujood' ? 1.9 : 1.3 }; } });
  for (const [k, nm] of [['armsUp', 'Arms up'], ['fist', 'Fist pump'], ['nod', 'Nod'], ['headDown', 'Head down'], ['handsHead', 'Hands on head']])
    add('Reactions', 'react/' + k, 'Reaction: ' + nm, { n: 90, at: 6, start: c => react(c.me, k, 1.2) });
  RS.anims = () => A.map(a => ({ id: a.id, name: a.name, group: a.group, n: a.n, ball: a.ball, needBall: a.needBall, hoop: a.hoop }));

  // one recording session at a time: { a, c, f, joints }
  let S = null;
  RS.animStart = (id, o = {}) => {
    const a = A.find(x => x.id === id); if (!a) throw new Error('no animation ' + id);
    RS.freeze(true); seed(4242);
    const flip = !!o.flip, def = o.who ? RS.defOf(o.who) : null;
    const T0 = Object.assign({}, TEAMS[0]), T1 = Object.assign({}, TEAMS[1]);
    if (def) { if (flip) T1.players = [def, T1.players[1]]; else T0.players = [def, T0.players[1]]; }
    newMatch(T0, T1, { humans: [], fmt: { format: 'first21', target: 99, len: 120 } });
    const team = M.teams[flip ? 1 : 0], other = M.teams[flip ? 0 : 1];
    const c = { me: team.players[0], mate: team.players[1], o1: other.players[0], o2: other.players[1] };
    Object.assign(M, { phase: 'live', inb: null, check: null, bc: null, nextInbound: null, sideOut: null, ft: null, pendingEnd: false, introT: 0 });
    M.taunt = null;
    for (const q of M.players) { q.hifzUsed = true; q.pick = null; }
    const h = attackHoop(c.me.team);
    for (const q of M.players) if (q !== c.me) place(q, h.x + h.dir * 1000, 620);
    place(c.me, h.x + h.dir * a.dist, h.z); c.me.face = sgn(h.x - c.me.x); c.me.turbo = 100;
    Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0, grabLock: 0 });
    if (a.needBall || (a.ball && o.ball !== false) || (!a.ball && o.ball)) giveBall(c.me, 'inbound');
    else { ball.owner = null; ball.state = 'loose'; ball.x = h.x + h.dir * 1000; ball.z = 600; ball.y = BALL_R; ball.grabLock = 99; }
    if (a.setup) a.setup(c);
    M.cmdHook = q => { zeroCmd(q.cmd); if (q === c.me && a.cmd) a.cmd(q, S ? S.f * STEP : 0, q.cmd); return true; };
    c.x0 = c.me.x; c.z0 = c.me.z; c.hx = h.x; c.hz = h.z;
    S = { a, c, f: 0, started: false };
    if (a.until) { a.start(c); S.started = true; for (let i = 0; i < 400 && !a.until(c); i++) stepSim(); S.f = 0; c.x0 = c.me.x; }
    return RS.animInfo();
  };
  const stepSim = () => {
    updateMatch(STEP);
    if (M.deadT != null && M.phase !== 'live') M.deadT = Math.max(M.deadT, 1);     // no inbound reset in the middle of a move
    M.shotClock = scReset();
    for (const t of M.teams) t.score = 0;
  };
  RS.animStep = () => {
    if (!S) return null;
    if (!S.started && S.f >= (S.a.at || 0) && S.a.start) { S.a.start(S.c); S.started = true; }
    stepSim(); S.f++;
    return RS.animInfo();
  };
  RS.animInfo = () => {
    if (!S) return null; const me = S.c.me;
    return { id: S.a.id, f: S.f, n: S.a.n, state: me.state, st: Math.round(me.st_t * 1000) / 1000, y: Math.round(me.y * 10) / 10, rot: Math.round((me.rot || 0) * 1000) / 1000,
      spin: Math.round((me.spin || 0) * 1000) / 1000, face: me.face, joints: JOINTS.map(k => [k, Math.round(me.j[k].a * 1000) / 1000]), holding: ball.owner === me };
  };
  RS.animStop = () => { S = null; M.cmdHook = null; unseed(); };
  // draw the current frame: the player (and anyone near him), the ball, the hoop for shots and dunks
  RS.animDraw = (g, w, h) => {
    if (!S) return; const c = S.c, a = S.a;
    const fx = FX.sx, fy = FX.sy; FX.sx = FX.sy = 0;
    const ax = a.follow ? c.me.x : a.hoop ? (c.x0 + c.hx) / 2 : c.x0;
    const [sx, sy] = P(ax, 0, c.z0);
    g.save();
    try {
      g.translate(Math.round(w / 2 - sx), Math.round(h - 34 - sy));
      // a strip of floor so the feet have something to stand on
      const [l] = P(ax - 600, 0, c.z0), [r] = P(ax + 600, 0, c.z0);
      g.fillStyle = 'rgba(128,128,128,0.18)'; g.fillRect(l, sy - 2, r - l, 34); g.fillStyle = 'rgba(128,128,128,0.45)'; g.fillRect(l, sy, r - l, 1);
      const hoop = a.hoop ? hoops.find(x => x === attackHoop(c.me.team)) : null;
      if (hoop) drawHoopBack(g, hoop);
      const near = M.players.filter(q => Math.abs(q.x - ax) < 420).sort((p, q) => p.z - q.z);
      for (const q of near) drawShadow(g, q.x, q.y, q.z, 16);
      const bz = ball.z;
      for (const q of near) { if (ball.owner !== q && bz < q.z && Math.abs(ball.x - ax) < 420) { drawBall(g); } drawPlayer(g, q); }
      if (Math.abs(ball.x - ax) < 420 && !(ball.owner && near.includes(ball.owner) && bz < ball.owner.z)) drawBall(g);
      if (hoop) drawHoopFront(g, hoop, {});
    } finally { g.restore(); FX.sx = fx; FX.sy = fy; }
  };

  // ---------------------------------------------------------------- screens
  RS.screenSetup = js => {
    RS.animStop(); RS.freeze(false);
    const A_ = window.__audit; A_.on = false; A_.found.clear();
    const e0 = window.__studioErrors.length;
    try { Game.paused = false; Game.trivia = null; (0, eval)(js); } catch (e) { return { error: String(e && e.message || e), screen: Game.screen }; }
    A_.screen = 'studio';
    return { screen: Game.screen, e0 };
  };
  RS.auditOn = () => { window.__audit.on = true; };
  RS.auditResult = e0 => {
    const A_ = window.__audit; A_.on = false;
    const found = [...A_.found.values()].map(f => ({ kind: f.kind, text: f.text, css: f.css, left: f.left, right: f.right, width: f.width }));
    // tap targets that overlap each other (Game.rects, in game coordinates)
    const R = (Game.rects || []).filter(r => r.w > 2 && r.h > 2), over = [];
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      const a = R[i], b = R[j], ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix <= 1 || iy <= 1) continue;
      const small = Math.min(a.w * a.h, b.w * b.h);
      if (ix * iy >= small * 0.98) continue;                       // one fully inside the other: a panel and its button
      over.push({ a: [a.x, a.y, a.w, a.h].map(Math.round), b: [b.x, b.y, b.w, b.h].map(Math.round), area: Math.round(ix * iy) });
    }
    return { found, overlaps: over.slice(0, 40), nOverlaps: over.length, rects: R.map(r => [r.x, r.y, r.w, r.h].map(Math.round)), errors: window.__studioErrors.slice(e0 || 0), screen: Game.screen, W };
  };
  // the touch controls (DOM buttons over the canvas) must not cover the scoreboard
  RS.touchOverScoreboard = () => {
    if (typeof TouchUI === 'undefined' || typeof PhoneHUD === 'undefined' || !PhoneHUD.board || !TouchUI.btns) return [];
    const B = PhoneHUD.board, cr = canvas.getBoundingClientRect(), k = cr.width / W;
    const sb = { l: cr.left + B.x * k, t: cr.top + B.y * k, r: cr.left + (B.x + B.w) * k, b: cr.top + (B.y + B.h) * k };
    return Object.entries(TouchUI.btns).map(([n, el]) => [n, el.getBoundingClientRect()]).filter(([, q]) => q.width && q.left < sb.r && q.right > sb.l && q.top < sb.b && q.bottom > sb.t).map(([n]) => n);
  };

})();
