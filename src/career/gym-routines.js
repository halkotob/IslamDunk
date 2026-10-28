// ================================================= v8.4: MORE GYM ROUTINES AND A DAILY PLAN
// Four new routines in the gym, each built on the real controls:
//   * Mikan drill: layups at the rim, alternating sides, 40 seconds. Only finishes at the rim count.
//   * Defensive slides: stay in front of a sliding marker for 30 seconds. Holding Defend counts full.
//   * Passing: Khalil cuts to a spot and lights up. Hit him while he's open, 40 seconds.
//   * Conditioning: line sprints. Touch each line and come back, against the clock.
// Around the World and King of the Court can be played in the gym too, against the brothers.
// Today's plan: three routines picked for the day. Finish all three for a bonus.
// The drill menu is grouped so it fits: Today's plan, Shooting, Skills, 1v1, and Pickup games.
const ROUTINES = {
  mikan: { name: 'Mikan drill', desc: 'Layups at the rim, left side then right side, 40 seconds' },
  slides: { name: 'Defensive slides', desc: 'Stay in front of the marker for 30 seconds. Hold Defend' },
  passing: { name: 'Passing', desc: 'Hit Khalil when he lights up. 40 seconds' },
  cond: { name: 'Conditioning', desc: 'Line sprints: touch each line and come back' }
};
Object.assign(DRILLS, ROUTINES);
const COND_LINES = [1054, 1300, 860, 1300, 660, 1300];               // free-throw line, half court... and back each time
const PLAN_POOL = ['ft', 'three', 'cones', 'mikan', 'slides', 'passing', 'cond', 'v1'];
function gymHoop() { return hoops[1]; }
function parkBall() { Object.assign(ball, { owner: null, state: 'loose', x: 1236, z: 22, y: BALL_R, vx: 0, vy: 0, vz: 0, shot: null, pass: null, grabLock: 9 }); }
// ---- today's plan
function dayKey() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function practicePlan() {
  if (!C) return null;
  const k = dayKey();
  if (!C.plan || C.plan.day !== k) {
    const R = seededRng(k * 31 + ((C.seed || 1) % 997)), pool = PLAN_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    C.plan = { day: k, ids: pool.slice(0, 3), done: [], paid: false };
  }
  return C.plan;
}
function planDone(kind) {
  const P_ = practicePlan(); if (!P_ || !P_.ids.includes(kind) || P_.done.includes(kind)) return;
  P_.done.push(kind);
  if (P_.done.length >= P_.ids.length && !P_.paid) { P_.paid = true; setTimeout(() => goalPay(drillBP(60), 15, 'Today’s practice plan'), 900); }
  else gymToast('Today’s plan: ' + P_.done.length + ' of 3 done', 2.5);
  saveCareer();
}
// ---- starting a routine
function setupPassing() {
  const team = amanahTeam();
  const tA = Object.assign({}, team, { players: [playerDef(), Object.assign({}, CAST.khalil)] }), tB = Object.assign({}, team, { players: [] });
  newMatch(tA, tB, { humans: [{ team: 0, slot: 0, pad: 0 }], practice: 'passing', aiCfg: [DIFF.medium, DIFF.medium] });
  M.cmdHook = gymCmd; M.drawExtras = gymExtras; M.phase = 'live';
  const [me, kh] = M.players;
  place(me, 760, 350); me.face = 1; M.possTeam = -1; giveBall(me, 'inbound');
  place(kh, 960, 200); kh.face = -1;
  cam.x = 1380 - W;
}
function passSpots() { const h = gymHoop(), o = -h.dir; return [{ x: h.x - o * 60, z: 110 }, { x: h.x - o * 270, z: 160 }, { x: h.x - o * 330, z: 350 }, { x: h.x - o * 270, z: 540 }, { x: h.x - o * 60, z: 590 }, { x: h.x - o * 170, z: 350 }]; }
{
  const _sd = startDrill;
  startDrill = function (kind) {
    if (!ROUTINES[kind]) return _sd.apply(this, arguments);
    if (kind === 'passing') setupPassing(); else setupPractice(kind);
    const d = Gym.drill = { kind, shots: 0, made: 0, score: 0, phase: 'ready', t: 0, time: 0, idx: 0, started: false, reps: 0 };
    const me = M.players[0], h = gymHoop();
    if (kind === 'mikan') { d.left = 40; d.side = 0; place(me, h.x + h.dir * 80, h.z - 70); giveBall(me, 'inbound'); gymToast('Finish at the rim, then go up on the other side. Only layups and dunks count.', 4); }
    if (kind === 'slides') { d.left = 30; d.in = 0; d.seg = 0; d.segIn = 0; d.mk = { x: 1000, z: 350, tz: 350, sp: 150, t: 0 }; place(me, 1000, 400); me.face = -1; parkBall(); gymToast('Stay in front of the marker. Hold Defend to slide: it counts full.', 4); }
    if (kind === 'passing') { d.left = 40; d.spot = -1; d.open = 0; d.back = 0; d.miss = 0; gymToast('Pass when Khalil lights up. The quicker, the better.', 4); }
    if (kind === 'cond') { d.idx = 0; place(me, 1290, 350); me.face = -1; parkBall(); gymToast('Touch each line and come back. Use turbo, but watch your legs.', 4); }
    SFX.blip();
  };
  // controls in each routine
  const _gc = gymCmd;
  gymCmd = function (p) {
    const d = Gym.drill;
    if (d && d.kind === 'passing' && p.human < 0 && !Gym.walk) { passerCmd(p, d); return true; }
    const r = _gc.apply(this, arguments);
    if (!d || p.human < 0 || !ROUTINES[d.kind] || Gym.overlay || Gym.fade || Gym.result) return r;
    const c = p.cmd;
    d.defHeld = !!c.xHeld;
    if (d.kind === 'mikan') { c.a = false; }
    else if (d.kind === 'slides') { c.a = false; c.b = false; c.bHeld = false; }
    else if (d.kind === 'passing') { c.b = false; c.bHeld = false; c.bRel = false; c.passTo = M.players[1]; }
    else if (d.kind === 'cond') { c.a = false; c.b = false; }
    return r;
  };
  function passerCmd(p, d) {
    const c = p.cmd; zeroCmd(c);
    const me = M.players[0];
    if (ball.owner === p) {                                  // caught it: a beat, then right back to you
      d.back += STEP; c.face = sgn(me.x - p.x) || -1;
      if (d.back > 0.45) { c.a = true; c.passTo = me; c.alley = false; d.back = 0; d.spot = -1; }
      return;
    }
    if (d.spot < 0 || d.cool > 0) { if (d.cool > 0) d.cool -= STEP; if (d.spot < 0) { let k; do k = rint(passSpots().length); while (k === d.last); d.spot = k; d.last = k; d.open = 0; } }
    const s = passSpots()[d.spot], dx = s.x - p.x, dz = s.z - p.z, dist = Math.hypot(dx, dz);
    if (dist > 14) { c.mx = dx / dist; c.mz = dz / dist; c.turbo = dist > 140; d.open = 0; }
    else { d.open += STEP; c.face = sgn(me.x - p.x) || -1; if (d.open > 2.2 && ball.owner === me) { d.miss++; FX.pop(p.x, 150, p.z, 'TOO LATE', '#ff9a8a'); d.spot = -1; } }
  }
  // the routines themselves
  const _du = drillUpdate;
  drillUpdate = function (dt) {
    const d = Gym.drill;
    if (!d || Gym.result || !ROUTINES[d.kind]) return _du.apply(this, arguments);
    const me = M.players[0], h = gymHoop();
    if (d.kind === 'mikan') {
      d.left -= dt;
      if (d.phase === 'ready') {
        if (ball.owner !== me && ball.state !== 'shot' && me.state === 'free') giveBall(me, 'inbound');
        if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me) { d.phase = 'flight'; d.t = 0; d.madeNow = false; d.dist = dxz(me, h); d.fromSide = me.z < h.z ? 0 : 1; }
        if (d.left <= 0) { d.left = 0; finishDrill(); }
      } else if (d.phase === 'flight') {
        d.t += dt;
        if ((d.madeNow && d.t > 0.3) || (ball.state === 'loose' && (ball.y < 40 || d.t > 2)) || d.t > 2.6) {
          d.shots++;
          if (d.madeNow) {
            if (d.dist > 170) FX.pop(h.x, RIM_Y + 60, h.z, 'AT THE RIM', '#ff9a8a');
            else if (d.fromSide !== d.side) FX.pop(h.x, RIM_Y + 60, h.z, 'OTHER SIDE', '#ff9a8a');
            else { d.made++; d.side = 1 - d.side; FX.pop(h.x, RIM_Y + 60, h.z, String(d.made), '#9dffb0'); }
          }
          d.phase = 'ready'; if (ball.state !== 'held' || ball.owner !== me) giveBall(me, 'inbound');
          if (d.left <= 0) { d.left = 0; finishDrill(); }
        }
      }
    } else if (d.kind === 'slides') {
      parkBall();
      const mk = d.mk; mk.t -= dt;
      if (mk.t <= 0) { mk.tz = rand(170, 530); mk.sp = rand(110, 240); mk.t = rand(0.5, 1.3); mk.tx = rand(940, 1080); }
      const dz = mk.tz - mk.z; mk.z += clamp(dz, -mk.sp * dt, mk.sp * dt); mk.x += clamp((mk.tx || mk.x) - mk.x, -60 * dt, 60 * dt);
      if (!d.started && (Math.hypot(me.vx, me.vz) > 10 || (d.wait = (d.wait || 0) + dt) > 3)) d.started = true;   // the clock starts when you move (or after 3s)
      if (!d.started) return;
      d.left -= dt; d.seg += dt;
      const inFront = Math.abs(me.z - mk.z) < 42 && Math.abs(me.x - (mk.x + 50)) < 70;
      const k = inFront ? (d.defHeld ? 1 : 0.5) : 0;
      d.in += k * dt; d.segIn += k * dt;
      if (d.seg >= 5) { if (d.segIn / d.seg >= 0.75) { d.reps++; FX.pop(me.x, 150, me.z, 'LOCKED IN', '#9dffb0'); SFX.blip(); } d.seg = 0; d.segIn = 0; }
      if (d.left <= 0) { d.left = 0; d.score = Math.round(d.in / 30 * 100); finishDrill(); }
    } else if (d.kind === 'passing') {
      d.left -= dt;
      const kh = M.players[1];
      if (ball.state === 'pass' && ball.pass && ball.pass.to === kh && !d.counted) {
        d.counted = true;
        if (d.spot >= 0 && d.open > 0) { const quick = d.open < 0.8; d.made++; d.score += quick ? 2 : 1; FX.pop(kh.x, 150, kh.z, quick ? 'ON TIME +2' : '+1', '#9dffb0'); }
        else FX.pop(kh.x, 150, kh.z, 'WAIT FOR IT', '#ffd76a');
      }
      if (ball.state !== 'pass') d.counted = false;
      if (ball.state === 'loose' && ball.y < 30 && Math.hypot(ball.vx, ball.vz) < 40) { const n = dxz(me, ball) < dxz(kh, ball) ? me : kh; giveBall(n, 'inbound'); }
      if (d.left <= 0 && ball.state !== 'pass') { d.left = 0; finishDrill(); }
    } else if (d.kind === 'cond') {
      parkBall();
      if (!d.started && Math.hypot(me.vx, me.vz) > 20) d.started = true;
      if (d.started) d.time += dt;
      if (Math.abs(me.x - COND_LINES[d.idx]) < 18) { d.idx++; SFX.blip(); FX.pop(me.x, 150, me.z, d.idx + '/' + COND_LINES.length, '#f2cf6b'); if (d.idx >= COND_LINES.length) finishDrill(); }
    }
  };
  // results, rewards and badge progress
  const _fd = finishDrill;
  finishDrill = function () {
    const d = Gym.drill; if (!d) return _fd.apply(this, arguments);
    const kind = d.kind;
    if (!ROUTINES[kind]) { const r = _fd.apply(this, arguments); planDone(kind); if (kind === 'ft') badgeAdd('line', Math.min(5, d.made || 0)); return r; }
    C.best = C.best || {};
    let bp = 0, line = '', best = false;
    if (kind === 'mikan') { bp = d.made * 4; line = d.made + ' finishes at the rim'; if (d.made > (C.best.mikan || 0)) { C.best.mikan = d.made; best = true; } badgeAdd('mikan', Math.min(5, d.made)); }
    else if (kind === 'slides') { bp = Math.round(d.score * 0.6); line = d.score + '% in front  •  ' + d.reps + ' locked-in stretches'; if (d.score > (C.best.slides || 0)) { C.best.slides = d.score; best = true; } badgeAdd('lockdown', Math.min(4, d.reps)); }
    else if (kind === 'passing') { bp = d.score * 4; line = d.made + ' good passes, ' + d.score + ' points'; if (d.score > (C.best.passing || 0)) { C.best.passing = d.score; best = true; } badgeAdd('general', Math.min(4, Math.floor(d.made / 3))); }
    else { bp = clamp(Math.round(90 - d.time * 3), 12, 60); line = d.time.toFixed(1) + ' seconds'; if (!C.best.cond || d.time < C.best.cond) { C.best.cond = +d.time.toFixed(1); best = true; } badgeAdd('lungs'); }
    bp = drillBP(bp); const pb = best ? drillBP(ECON.bpPB) : 0, hb = practiceHB(best);
    bankPractice(bp + pb, hb);
    Gym.result = { title: ROUTINES[kind].name, line, bp: bp + pb, pb, hb, best, kind };
    if (best) { FX.callout('NEW BEST!', '#9dffb0', line.toUpperCase().split('  •  ')[0]); SFX.best(); }
    Gym.drill = null;
    rookieDo('drill'); weekAdd('gym'); planDone(kind);
  };
  // markers drawn on the floor
  const _gx = gymExtras;
  gymExtras = function (E, g) {
    _gx.apply(this, arguments);
    const d = Gym.drill; if (!d) return;
    const ring = (x, z, r, col, a = 1) => E.push({ z, f: () => { const [sx, sy] = P(x, 0, z); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.ellipse(sx, sy, r, r * 0.38, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; } });
    const pulse = 0.6 + 0.4 * Math.sin(Game.t * 8);
    if (d.kind === 'mikan') { const h = gymHoop(); ring(h.x + h.dir * 70, h.z + (d.side ? 70 : -70), 26, `rgba(242,207,107,${pulse})`); }
    if (d.kind === 'slides') {
      const mk = d.mk;
      E.push({ z: mk.z, f: () => {
        const [x, y] = P(mk.x, 0, mk.z);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x, y, 20, 7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8661c'; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x, y - 26); g.lineTo(x + 10, y); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(x - 5.5, y - 14, 11, 3.5);
        const by = y - 30 - Math.abs(Math.sin(Game.t * 7)) * 16; g.fillStyle = '#e07a2c'; g.beginPath(); g.arc(x + 12, by, 5, 0, Math.PI * 2); g.fill();
      } });
      ring(mk.x + 50, mk.z, 40, `rgba(157,255,176,${0.35 + 0.25 * pulse})`);
    }
    if (d.kind === 'passing' && d.spot >= 0) { const s = passSpots()[d.spot], kh = M.players[1], open = dxz(kh, s) < 16; ring(s.x, s.z, 30, open ? `rgba(87,227,137,${pulse})` : 'rgba(255,255,255,0.35)'); }
    if (d.kind === 'cond' && d.idx < COND_LINES.length) {
      const x = COND_LINES[d.idx];
      E.push({ z: 0, f: () => { const [x0, y0] = P(x, 0, 30), [x1, y1] = P(x, 0, 670); g.strokeStyle = `rgba(242,207,107,${pulse})`; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); } });
    }
  };
}
// HUD line for the new routines (salah.js asks DRILL_HUD first)
const DRILL_HUD = {
  mikan: d => 'Mikan drill   ' + Math.ceil(d.left) + 's   Made ' + d.made + '   Next: ' + (d.side ? 'near side' : 'far side'),
  slides: d => 'Defensive slides   ' + Math.ceil(d.left) + 's   ' + (d.started ? Math.round(d.in / Math.max(0.1, 30 - d.left) * 100) + '% in front' : 'move to start') + (d.defHeld ? '   DEFEND' : ''),
  passing: d => 'Passing   ' + Math.ceil(d.left) + 's   Good passes ' + d.made + '   Points ' + d.score,
  cond: d => 'Conditioning   ' + d.time.toFixed(1) + 's   Line ' + Math.min(d.idx + 1, COND_LINES.length) + '/' + COND_LINES.length,
  atw: () => '', kotc: () => ''
};
// ---- Around the World and King of the Court in the gym
// King of the Court is played on the gym floor with the brothers, then you're back in the gym.
function startGymKotc() {
  Gym.overlay = null;
  startKotc({ roster: ['you', ...shuffle(['khalil', 'nasser', 'saleem', 'hamid']).slice(0, 3)], humans: { you: 0 } });
  KOTC.gym = true;
}
{
  const _sm = startMini;
  startMini = function (kind, opp) {
    if (kind !== 'atw') return _sm.apply(this, arguments);
    Gym.overlay = null;
    setupMini('atw', { roster: ['you', opp || 'saleem'], humans: [{ team: 0, slot: 0, pad: 0 }] });
    Gym.drill = { kind, mini: true };
    gymToast('Around the World: make it and move to the next spot. Miss twice on the same spot and you go back one.', 4.5);
    SFX.blip();
  };
  const _fm = finishMini;
  finishMini = function () {
    const mg = M.mini;
    if (!mg || mg.kind !== 'atw') { const k = mg && mg.kind, r = _fm.apply(this, arguments); planDone(k); return r; }
    const r = mg.result(), won = !!r.won;
    const bp = drillBP(won ? 55 : 12 + r.mine * 4), hb = practiceHB(won);
    bankPractice(bp, hb);
    Gym.result = { title: 'Around the World vs ' + M.players[1].def.name, line: won ? 'You went around first' : 'You reached spot ' + (r.mine + 1) + ' of ' + ATW_N, bp, pb: 0, hb, best: false, kind: 'atw' };
    Gym.drill = null;
    rookieDo('drill'); weekAdd('gym');
  };
  const _kl = kotcLeave;
  kotcLeave = function () {
    if (!KOTC.gym) return _kl.apply(this, arguments);
    const K = KOTC, w = K.wins.you || 0, king = K.champ === 'you';
    K.on = false; K.gym = false; M.kotc = false;
    enterGym();
    const bp = drillBP(king ? 70 : 15 + w * 10), hb = practiceHB(king);
    bankPractice(bp, hb);
    Gym.result = { title: 'King of the Court', line: king ? 'You were crowned King' : 'You won ' + w + ' game' + (w === 1 ? '' : 's'), bp, pb: 0, hb, best: king, kind: 'kotc' };
    rookieDo('drill'); weekAdd('gym');
  };
  const _gt = goTitle;
  goTitle = function () {
    if (KOTC.on && KOTC.gym && C) { KOTC.on = false; KOTC.gym = false; M.kotc = false; enterGym(); return; }
    return _gt.apply(this, arguments);
  };
}
// ---- the drill menu, grouped
function gymDrillMenu() {
  const go = k => () => { Gym.overlay = null; startDrill(k); };
  const P_ = practicePlan(), tick = k => (P_ && P_.done.includes(k) ? '✓ ' : '');
  const label = k => tick(k) + DRILLS[k].name;
  const opps = HORSE_OPPS;
  return [
    { label: 'Today’s plan' + (P_ ? '  (' + P_.done.length + '/3)' : ''), sub: (P_ ? P_.ids : []).map(k => ({ label: label(k), act: go(k) })) },
    { label: 'Shooting', sub: ['ft', 'three', 'mikan'].map(k => ({ label: label(k), act: go(k) })) },
    { label: 'Skills', sub: ['cones', 'passing', 'slides', 'cond'].map(k => ({ label: label(k), act: go(k) })) },
    { label: tick('v1') + '1v1 vs Nasser', act: go('v1') },
    { label: 'Pickup games', sub: [
      { label: 'Lightning', act: () => startMini('lightning') },
      { label: 'HORSE', sub: opps.map(([id, name]) => ({ label: 'vs ' + name, act: () => startMini('horse', id) })) },
      { label: 'King of the Court', act: () => startGymKotc() }] },
    { label: 'Back', act: () => { Gym.overlay = null; } }
  ];
}
{
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    if (Gym.overlay === 'drills' && !Gym.result) { menuStackUpdate('gymdrills', gymDrillMenu(), () => { Gym.overlay = null; }); sim(rdt, true); return; }
    return _gu.apply(this, arguments);
  };
  drawDrillsMenu = function (g) {
    dim(g, 0.55);
    const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
    panel(g, W / 2 - 210, 28, 420, 484, true);
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Practice', W / 2, 64);
    const P_ = practicePlan();
    if (P_) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Today: ' + P_.ids.map(k => (P_.done.includes(k) ? '✓ ' : '') + DRILLS[k].name).join('  •  '), W / 2, 86); }
    drawMenuStack(g, 'gymdrills', gymDrillMenu(), 128, 38);
    const m = menuState('gymdrills'), it = gymDrillMenu()[m.sub >= 0 ? m.sub : m.idx], sk = m.sub >= 0 && it && it.sub && it.sub[m.sidx];
    const key = sk ? Object.keys(DRILLS).find(k => sk.label.replace('✓ ', '') === DRILLS[k].name) : null;
    g.fillStyle = '#c9d8d2'; g.font = `12px ${BODY}`;
    if (key) g.fillText(DRILLS[key].desc, W / 2, 474);
    g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('↑ ↓ choose, Enter to start, Esc to close', W / 2, 496);
    W = rw; Game.ox = 0; g.restore();
  };
}
