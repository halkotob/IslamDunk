// ========================================================= MATCH / RULES
const M = { players: [], teams: null, hifzQueue: [], phase: 'tip', time: 0, possTeam: -1, shotClock: 24, clock: 120, quarter: 1, fmt: { format: 'quarters', len: 120, sc: 24, periods: 4, ot: 60 } };
const cam = { x: 180 };

function newMatch(tA, tB, opts = {}) {
  M.teamDefs = [tA, tB];
  M.teams = [tA, tB].map((T, ti) => ({ def: T, score: 0, qs: [], players: T.players.map((d, s) => new Player(d, ti, s, T)) }));
  M.aiCfg = opts.aiCfg || null; M.career = !!opts.career; M.practice = opts.practice ? { kind: opts.practice } : null;
  M.gym = !!opts.practice; M.halfCourt = !!opts.practice; M.mustClear = [false, false]; M.cmdHook = null;
  M.fun = opts.attract || opts.career || opts.practice ? null : (opts.fun !== undefined ? opts.fun : activeFun());
  M.balls = null; M.mini = null; M.miniIds = null; M.teamFouls = [0, 0]; M.ft = null; M.maxDef = 0; M._achEnd = false; M.run = null;
  M.hot = null; M.hotCd = null; M.highlights = []; M.pendingClips = []; M.dmOverride = null; M.careerL = null; Replay.reset();
  M.players = [...M.teams[0].players, ...M.teams[1].players];
  M.assign = [[0, 1], [0, 1]];
  M.attract = !!opts.attract; M.online = false; M.double = !!opts.double;
  M.fmt = makeFmt(opts);
  M.quarter = 1; M.clock = M.fmt.first21 ? Infinity : M.fmt.len; M.shotClock = scReset(); M.time = 0;
  M.possTeam = -1; M.pendingEnd = false; M.alleyT = [-99, -99]; M.hifzQueue = []; M.nextInbound = 0; M.assignT = 0;
  for (const hm of opts.humans || []) M.teams[hm.team].players[hm.slot].human = hm.pad;
  for (const h of hoops) { h.dy = 0; h.vy = 0; h.buildNet(); }
  FX.reset();
  if (M.gym) { setVenue(null); buildGymFloor(); for (const p of M.players) p.outfit = 'thobe'; M.clock = Infinity; }
  else {
    if (opts.venue && opts.venue.kind !== 'classic') setVenue(opts.venue, tA, tB, opts.venueLayers);
    else { buildCourt(tA, tB); buildCrowd(tA, tB); setVenue(opts.venue || null); }
    tipOff();
    if (M.fun && M.fun.uncle) for (const p of M.players) p.outfit = 'thobe';      // Uncle Mode: thobes and slides
  }
  if (!M.gym) { cam.punch = 0; cam.zoom = baseZoom(); updateBroadcastCam(0, true); }
}
// Format for this match: the host's (or local) settings; attract/practice use fixed ones.
function makeFmt(opts) {
  const f = opts.fmt || (opts.attract ? { format: 'quarters', len: 60, sc: 24 } : { format: SETTINGS.format, len: SETTINGS.periodLen, target: SETTINGS.target });
  const first21 = f.format === 'first21', len = f.len || 120;
  const sc = f.sc != null ? f.sc : first21 ? 0 : (SHOT_CLOCK_FOR[len] != null ? SHOT_CLOCK_FOR[len] : 24);
  return { format: f.format, len, first21, target: clamp(f.target | 0 || 21, 3, 99), sc, periods: first21 ? 1 : f.format === 'halves' ? 2 : 4, ot: Math.max(30, len / 2), shortGame: !first21 && len <= 45 };
}
function scReset() { return M.fmt && M.fmt.sc > 0 ? M.fmt.sc : 99; }
function periodLabel(q) {
  const F = M.fmt || { periods: 4 };
  if (F.first21) return 'FIRST TO ' + (F.target || 21);
  if (q > F.periods) return q - F.periods > 1 ? 'OVERTIME ' + (q - F.periods) : 'OVERTIME';
  return F.format === 'halves' ? (q === 1 ? '1ST HALF' : '2ND HALF') : 'QUARTER ' + q;
}
function periodShort(i) { const F = M.fmt || { periods: 4 }; return i >= F.periods ? 'OT' : (F.format === 'halves' ? 'H' : 'Q') + (i + 1); }
function tipOff() {
  const [a, b] = M.teams;
  place(a.players[0], 630, 350); place(b.players[0], 690, 350);
  place(a.players[1], 520, 250); place(b.players[1], 800, 450);
  Object.assign(ball, { owner: null, state: 'loose', x: 660, y: 95, z: 350, vx: 0, vy: 560, vz: 0, shot: null, pass: null, grabLock: 0.35 });
  M.phase = 'tip'; M.possTeam = -1;
  cam.x = 660 - W / 2;
  if (!M.attract) FX.callout('BISMILLAH!', '#ffd76a', 'TIP-OFF');
}
function place(p, x, z) { if (!p) return; Object.assign(p, { x, z, y: 0, vx: 0, vy: 0, vz: 0, state: 'free', st_t: 0, act: null, move: null, spin: 0 }); p.face = sgn(attackHoop(p.team).x - x); }
function inbound(team) {
  M.camCut = true;                               // restart: clean broadcast cut instead of a lurch
  const h = defendHoop(team), T = M.teams[team].players;
  const p = T.slice().sort((a, b) => dxz(a, h) - dxz(b, h))[0];
  place(p, h.x + h.dir * 45, h.z + (chance(0.5) ? 70 : -70));
  if (M.halfCourt) place(p, h.x + h.dir * 380, 350);
  else if (p.mate && dxz(p.mate, h) < 90) place(p.mate, h.x + h.dir * 260, p.mate.z);
  if (M.mustClear) M.mustClear = [false, false];
  Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0 });
  M.possTeam = -1; giveBall(p, 'inbound');
  M.phase = 'live'; M.shotClock = scReset();
}
function formation(offTeam) {
  const h = defendHoop(offTeam), a = attackHoop(offTeam);
  const O = M.teams[offTeam].players, D = M.teams[1 - offTeam].players;
  place(O[0], h.x + h.dir * 60, 300); place(O[1], h.x + h.dir * 300, 470);
  place(D[0], a.x + a.dir * 330, 300); place(D[1], a.x + a.dir * 300, 440);
  for (const p of M.players) { p.turbo = 100; }
}
function updateMatch(dt) {
  if (M.mini) { miniStep(dt); return; }                // mini games have their own step (multi-ball, custom rules)
  M.time += dt;
  if (M.phase === 'break') { M.breakT -= dt; if (M.breakT <= 0 && Game.screen !== 'halftime') startQuarter(); }
  if (M.phase === 'live') {
    M.clock -= dt;
    const scOn = M.fmt.sc > 0 && !M.practice;
    if (ball.owner && scOn) M.shotClock -= dt;
    if (M.shotClock <= 0 && ball.owner && scOn) shotClockViolation();
    if (M.halfCourt && ball.owner && M.mustClear[ball.owner.team] && dxz(ball.owner, hoops[1]) >= THREE_R + 10) { M.mustClear[ball.owner.team] = false; FX.pop(ball.owner.x, 120, ball.owner.z, 'CLEARED', '#9dffb0'); }
    if (M.clock <= 0 && !M.pendingEnd) {
      M.clock = 0; SFX.buzzer();
      const inFlight = ball.state === 'shot' || ball.state === 'pass' && ball.pass.alley || M.players.some(p => p.state === 'dunk');
      if (inFlight) M.pendingEnd = true; else endQuarter();
    }
    if (M.pendingEnd && M.phase === 'live' && (ball.state === 'held' || ball.state === 'loose') && !M.players.some(p => p.state === 'dunk')) endQuarter();
  } else if (M.phase === 'ft') { ftUpdate(dt); }
  else if (M.phase === 'dead') {
    M.deadT -= dt;
    if (!M.pendingEnd && M.nextInbound != null && smoothInboundOK()) inbStep(dt);      // walk it up: fetch, pass in, go live
    else if (M.deadT <= 0) { if (M.pendingEnd) endQuarter(); else inbound(M.nextInbound); }
  }
  // assignments: switch on screens when men cross (CPU teams)
  M.assignT -= dt;
  if (M.assignT <= 0) { M.assignT = 0.25; updateAssign(0); updateAssign(1); }
  for (const p of M.players) {
    if (M.inb && inbCmd(p)) continue;                 // smooth inbound: everyone jogs into place
    if (M.cmdHook && M.cmdHook(p)) continue;
    if (M.phase === 'ft' && M.ft) { ftCmd(p); continue; }
    if (p.human >= 0 && !M.attract) { if (Net.role === 'host' && p.human === 1) Net.remoteCmd(p.cmd); else humanCmd(p.human, p.cmd); }
    else p.ai.update(dt);
  }
  for (const p of M.players) updatePlayer(p, dt);
  collidePlayers();
  chargeCheck(dt);
  updateBall(dt);
  if (M.phase === 'live' && ball.grabLock > 0.4) ball.grabLock = 0.4;   // live loose balls can't stay locked
  if (ball.state === 'loose') checkGrab();
  for (const h of hoops) h.update(dt);
  if (ball.owner) ball.owner.holdT += dt;
  // hifz power-ups
  while (M.hifzQueue.length && !Game.trivia) {
    const p = M.hifzQueue.shift(); if (p.hifz < 100) continue;
    p.hifz = 0; p.hifzUsed = true;          // short periods: once per player per game (see addHifz)
    if (p.human >= 0 && !M.attract) openTrivia(p);
    else if (chance(aiCfg(p.team).trivia)) grantBoost(p);
  }
  updateHot(dt);
  updateCamera(dt);
  FX.update(dt);
  Replay.record();
}
function updateCamera(dt) {
  if (!M.gym) { updateBroadcastCam(dt); return; }
  cam.zoom = 1; cam.fy = H / 2;
  const f = ball.owner || ball;
  const tx = M.gym ? clamp(f.x - W / 2, 1340 - W, 1380 - W) : clamp(f.x - W / 2 + (M.possTeam >= 0 ? attackHoop(M.possTeam).dir * -60 : 0), -100, COURT.L + 100 - W);
  cam.x += (tx - cam.x) * Math.min(1, dt * 4);
}
function updateAssign(team) {
  const hasHuman = M.teams[team].players.some(p => p.human >= 0);
  if (hasHuman || M.teams[team].players.length < 2 || M.teams[1 - team].players.length < 2) return;
  const D = M.teams[team].players, O = M.teams[1 - team].players, a = M.assign[team];
  const cur = dxz(D[0], O[a[0]]) + dxz(D[1], O[a[1]]), sw = dxz(D[0], O[a[1]]) + dxz(D[1], O[a[0]]);
  if (sw < cur * aiCfg(team).switchK) M.assign[team] = [a[1], a[0]];
}
function collidePlayers() {
  const P = M.players;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    if (a.state === 'dunk' || b.state === 'dunk' || a.state === 'hang' || b.state === 'hang') continue;
    if (Math.abs(a.y - b.y) > 50) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = 28;
    if (d < m && d > 0.01) { const k = (m - d) / d * 0.5; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
  }
}
function checkGrab() {
  if (ball.grabLock > 0) return;
  let best = null, bd = 1e9;
  for (const p of M.players) {
    if (p.state === 'down' || p.state === 'dunk' || p.state === 'hang' || p.state === 'getup') continue;
    const top = p.y + (p.state === 'jump' ? 112 : 74), d = Math.hypot(ball.x - p.x, ball.z - p.z);
    const reach = (ball.y < 40 && p.y < 5 ? 34 : 26) + (st7(p, 'hus') - 5) * 1.2;   // scoop a rolling ball; hustle reaches further
    if (d < reach && ball.y - BALL_R < top && ball.y > p.y - 4 && d < bd) { bd = d; best = p; }
  }
  if (best) giveBall(best, 'loose');
}
function onScore(h) {
  if (M.mini) { M.mini.onScore(h); return; }
  if (M.practice && M.practice.kind !== '1v1') { practiceScore(h); return; }
  if (M.phase === 'ft' && M.ft) { ftScore(h); return; }          // free throw: one point, no inbound
  const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null;
  const team = M.halfCourt ? (sh ? sh.team : M.possTeam) : h === hoops[1] ? 0 : 1;
  if (M.halfCourt && M.mustClear[team]) {      // illegal basket: ball goes the other way
    FX.callout('TAKE IT BACK FIRST!', '#ff9a8a'); SFX.bad();
    ball.state = 'scored'; ball.shot = null; M.phase = 'dead'; M.deadT = 0.9; M.nextInbound = 1 - team; return;
  }
  let pts = sh ? sh.pts : 2; if (M.double) pts *= 2;
  const hot = sh && sh.hot && !sh.dunk;
  if (hot) pts += 1;                              // hot spot bonus
  M.teams[team].score += pts; const qi = M.quarter - 1; M.teams[team].qs[qi] = (M.teams[team].qs[qi] || 0) + pts;
  const shooter = sh && sh.shooter.team === team ? sh.shooter : null;
  const x = h.x, z = h.z;
  if (shooter) {
    shooter.stats.pts += pts; shooter.stats.fgm++; if (sh.pts === 3) shooter.stats.tpm++;
    const lp = ball.lastPasser;
    if (lp && lp.team === team && lp !== shooter && M.time - ball.lastPassT < 4) { lp.stats.ast++; addHifz(lp, 10); if (chance(0.3)) FX.callout('BARAKALLAHU FEEK!', '#bfffcf', 'WHAT A DISH'); }
    shooter.streak++;
    for (const o of shooter.opps) { o.streak = 0; o.fire = false; }
    if (shooter.streak >= 3 && !shooter.fire) { shooter.fire = true; shooter.fireT = 40; AchEvents.fire(shooter); FX.cue('fire', shooter.x, 4, shooter.z, true); FX.callout("HE'S ON FIRE!", '#ff8a2a'); SFX.cheer(1.2, 0.2); }
    if (shooter.fire) shooter.fireT = Math.max(shooter.fireT, 25);
    addHifz(shooter, 34);
    if (shooter.celebrate <= 0) shooter.celebrate = 0.8;
  } else for (const o of M.teams[1 - team].players) { o.streak = 0; o.fire = false; }
  // misses by the shooter reset streak (handled in onBallFloor/no score)
  const big = sh && sh.dunk;
  // net reaction by make type; the swish sound fires when the ball passes through the net
  if (!big) {
    const g = (sh && sh.green ? 1 : 0) | (shooter && shooter.fire ? 2 : 0) | (M.pendingEnd && !M.fmt.first21 ? 4 : 0);
    if (sh && sh.bank) h.kick('bank', 1, 0, 0, g);
    else if (sh && sh.touched) h.kick('rimin', 1, ball.x - h.x, ball.z - h.z, g);
    else h.kick('swish', 1.1, 0, 0, g);
  }
  const base = pts - (hot ? 1 : 0), three = base / (M.double ? 2 : 1) === 3;
  const lead = M.teams[team].score - M.teams[1 - team].score;
  const buzzer = M.pendingEnd && !M.fmt.first21, clutchBuzzer = buzzer && M.quarter >= M.fmt.periods && lead >= 0;
  const kind = makeFeel(h, sh, shooter, pts, hot, buzzer, clutchBuzzer);         // shake, pitch, callout tier, crowd timing by make type
  if (clutchBuzzer) {                            // game-winner or game-tying at the horn
    FX.cue('buzzer', h.x, RIM_Y, h.z, true);          // arena: spotlights sweep, crowd wave, jumbotron
    FX.slowmo(1.1, 0.3); FX.callout('BUZZER BEATER!', '#ffd76a', lead === 0 ? 'WE\'RE GOING TO OVERTIME' : 'MASHA\'ALLAH! GAME WINNER', true);
    FX.hype(1); FX.replay(1.4);
  } else if (buzzer) { FX.cue('buzzer', h.x, RIM_Y, h.z, true); FX.callout('BUZZER BEATER!', '#ffd76a', 'MASHA\'ALLAH!'); }
  else if (sh && sh.sig) { const c = sigCall(sh.sig); FX.callout(c[0], '#ffd76a', c[1] || (shooter ? shooter.def.name.toUpperCase() : ''), true); }
  else if (hot) FX.callout('HOT SPOT!', '#ffb347', '+1 BONUS');
  if (M.fun && M.fun.uncle && chance(0.35)) uncleTalk();
  // highlight clip for the post-game screen
  if (shooter) FX.highlight(M.players.indexOf(shooter), (big ? (kind === 'poster' ? 4.5 : 3) : three ? 2.5 : 1) + (sh.sig ? 3 : 0) + (clutchBuzzer ? 6 : buzzer ? 3 : 0) + (hot ? 1 : 0),
    clutchBuzzer ? 'BUZZER BEATER' : buzzer ? 'BUZZER BEATER' : sh.sig ? SIG_NAMES[sh.sig] : HL_LABEL[kind]);
  if (M.fmt.first21) { const s = M.teams[team].score, o = M.teams[1 - team].score; if (s >= (M.fmt.target || 21) && s - o >= 2) M.pendingEnd = true; }
  FX.hype(big ? 1 : 0.6);
  if (big || clutchBuzzer) FX.burst(x, RIM_Y - 20, z, clutchBuzzer ? 26 : 10, 'confetti', [M.teamDefs[team].c1, M.teamDefs[team].c2, '#ffffff']);
  FX.pop(x, RIM_Y + 40, z, '+' + pts, M.teamDefs[team].c2);
  ball.state = 'scored'; ball.shot = null;
  M.phase = 'dead'; M.deadT = 1.1; M.nextInbound = 1 - team;
  if (M.practice && M.teams[team].score >= 11) { M.phase = 'over'; M.winner = team; practiceGameOver(team); }
  for (const p of M.players) p.ai.t = 0;
}
function dunkName(t) { return { tomahawk: 'TOMAHAWK', windmill: 'WINDMILL', '360': '360', twohand: 'POWER JAM', alley: 'ALLEY-OOP' }[t] || 'JAM'; }
function shotClockViolation() {
  SFX.buzzer(); FX.callout('SHOT CLOCK!', '#ff7070', 'TURNOVER');
  const o = ball.owner; if (o) { o.streak = 0; fumble(o); ball.vx = ball.vz = 0; }
  ball.grabLock = 5;
  M.phase = 'dead'; M.deadT = 0.9; M.nextInbound = 1 - M.possTeam;
}
function endQuarter() {
  const q = M.quarter, N = M.fmt.periods; M.pendingEnd = false;
  if (q >= N && M.teams[0].score !== M.teams[1].score) { finishMatch(); return; }
  M.quarter = q + 1;
  M.clock = M.quarter > N ? M.fmt.ot : M.fmt.len;        // overtime: half a period, at least 30s
  M.nextStart = q % 2 === 1 ? 1 : 0;
  M.phase = 'break'; M.breakT = M.attract ? 0.8 : 2.2;
  M.breakText = q >= N ? 'OVERTIME!' : q === N / 2 ? 'HALFTIME' : 'END OF Q' + q;
  ball.owner = null; ball.state = 'scored'; ball.shot = null; ball.grabLock = 9;
  if (q === N / 2 && !M.attract) { Game.screen = 'halftime'; Game.idx = 0; }
}
function startQuarter() {
  M.camCut = true; M.teamFouls = [0, 0];            // team fouls reset every period
  formation(M.nextStart); inbound(M.nextStart);
  if (!M.attract) FX.callout(periodLabel(M.quarter), '#ffffff', M.double ? 'LAYLATUL QADR: DOUBLE POINTS' : '');
}
function finishMatch() {
  M.phase = 'over'; SFX.buzzer(); SFX.cheer(1.5);
  const w = M.teams[0].score > M.teams[1].score ? 0 : 1;
  M.winner = w;
  if (M.attract) { M.breakT = 2; return; }
  FX.callout('ALHAMDULILLAH!', '#ffd76a', M.teamDefs[w].name.toUpperCase() + ' WIN');
  Game.overT = 2.2;
}
function grantBoost(p) {
  p.boost = 12; FX.callout('NOOR!', '#ffe38a', p.def.name.toUpperCase() + ' IS GLOWING'); SFX.good();
  FX.burst(p.x, 60, p.z, 10, 'star', ['#ffe38a', '#ffffff']);
}
function onScreen(x) { return x - cam.x > -80 && x - cam.x < W + 80; }

// v4.6: event shapes stay outside the ball's silhouette. Colors reinforce,
// rather than replace, distinct geometry. Allocations occur only on an event.
const PLAY_CUES = {
  green: { color: '#68efb0', label: 'PERFECT RELEASE' }, swish: { color: '#f7e9c5', label: 'NOTHING BUT NET' },
  rim: { color: '#eab875', label: 'RIM' }, glass: { color: '#bceaff', label: 'OFF THE GLASS' },
  steal: { color: '#83d9e7', label: 'CHANGE OF POSSESSION' }, block: { color: '#a7e8ff', label: 'DENIED' },
  ankles: { color: '#d9c6ff', label: 'CROSSED UP' }, alley: { color: '#ffd883', label: 'ALLEY-OOP' },
  dunk: { color: '#ffd883', label: 'SLAM' }, poster: { color: '#ffbd6c', label: 'POSTER DUNK' },
  fire: { color: '#ffb366', label: 'ON FIRE' }, buzzer: { color: '#ffd76a', label: 'BUZZER BEATER' }
};
function drawPlayCue(g, q) {
  const u = clamp(q.t / q.life, 0, 1), k = depthK(q.z), xy = P(q.x, q.y, q.z);
  const motion = REDUCED_MOTION ? 0.22 : 1, r = (13 + u * (q.major ? 30 : 16) * motion) * k;
  g.save(); g.translate(xy[0], xy[1]); g.globalAlpha = (1 - u) * (REDUCED_MOTION ? 0.55 : 0.8);
  g.strokeStyle = PLAY_CUES[q.type].color; g.lineWidth = (q.major ? 2 : 1.5) * k; g.lineCap = 'round'; g.beginPath();
  if (q.type === 'swish') {
    for (let i = -1; i <= 1; i++) { g.moveTo(i * 8 * k, 12 * k + u * 9 * motion); g.quadraticCurveTo(i * 4 * k, 24 * k, i * 6 * k, 34 * k + u * 12 * motion); }
  } else if (q.type === 'glass' || q.type === 'green') {
    for (let i = -1; i <= 1; i += 2) { g.moveTo(i * r, -5 * k); g.lineTo(i * r, -r); g.lineTo(i * (r - 5 * k), -r); }
    if (q.type === 'green') { g.moveTo(-4 * k, -r - 5 * k); g.lineTo(-k, -r - 2 * k); g.lineTo(5 * k, -r - 9 * k); }
    else for (let i = -1; i <= 1; i += 2) { g.moveTo(i * r, 5 * k); g.lineTo(i * r, r); g.lineTo(i * (r - 5 * k), r); }
  } else if (q.type === 'rim' || q.type === 'alley') {
    g.ellipse(0, 0, r, r * 0.5, 0, 0.12, Math.PI - 0.12);
    g.moveTo(-r, 0); g.ellipse(0, 0, r, r * 0.5, 0, Math.PI + 0.12, Math.PI * 2 - 0.12);
    if (q.type === 'alley') { g.moveTo(-r - 5, 0); g.ellipse(0, 0, r + 5, (r + 5) * 0.5, 0, Math.PI + 0.2, Math.PI * 2 - 0.2); }
  } else if (q.type === 'ankles' || q.type === 'fire') {
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; g.moveTo(Math.cos(a) * r, Math.sin(a) * r * ZS); g.ellipse(0, 0, r, r * ZS, 0, a, a + 1.3); }
    if (q.type === 'fire') for (let i = -1; i <= 1; i += 2) { g.moveTo(i * r, -4); g.quadraticCurveTo(i * (r + 6), -14 * k, i * r, -24 * k); }
  } else if (q.type === 'steal') {
    for (let i = -1; i <= 1; i += 2) { g.moveTo(i * (r + 6), -6); g.lineTo(i * r, 0); g.lineTo(i * (r + 6), 6); }
  } else if (q.type === 'dunk') {
    g.ellipse(0, 4 * k, r, r * 0.4, 0, 0.1, Math.PI - 0.1);
    for (let i = -1; i <= 1; i += 2) { g.moveTo(i * r * 0.65, 14 * k); g.lineTo(i * r * 0.65, 26 * k + u * 8 * motion); }
  } else {
    const rays = q.type === 'poster' || q.type === 'buzzer' ? 8 : 4;
    for (let i = 0; i < rays; i++) { const a = (i + 0.5) * Math.PI * 2 / rays, outer = r + (q.major ? 10 : 5) * k; g.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.75); g.lineTo(Math.cos(a) * outer, Math.sin(a) * outer * 0.75); }
  }
  g.stroke(); g.restore();
}
