// =============================================================== PLAYERS
const JOINTS = ['nh', 'nk', 'fh', 'fk', 'ns', 'ne', 'fs', 'fe', 'lean'];
class Player {
  constructor(def, team, slot, teamDef) {
    this.def = def; this.team = team; this.slot = slot; this.st = def.stats; this.T = teamDef;
    this.x = 0; this.z = 0; this.y = 0; this.vx = 0; this.vz = 0; this.vy = 0;
    this.face = team === 0 ? 1 : -1; this.human = -1;
    this.turbo = 100; this.hifz = 0; this.boost = 0; this.fire = false; this.fireT = 0; this.streak = 0;
    this.state = 'free'; this.st_t = 0; this.act = null;
    this.cd = { steal: 0, shove: 0, jump: 0 }; this.moveCd = 0; this.stumble = 0; this.holdT = 0;
    this.phase = 0; this.dp = 0; this.dh = 'n'; this.move = null; this.spin = 0; this.rot = 0; this.fallDir = 1;
    this.j = {}; for (const k of JOINTS) this.j[k] = { a: 0, v: 0 };
    this.hands = { n: { x: 0, y: 0, z: 0 }, f: { x: 0, y: 0, z: 0 } }; this.hipH = 44;
    this.cmd = { mx: 0, mz: 0, turbo: false, a: false, b: false, bHeld: false, bRel: false, x: false, s: false, passTo: null, alley: null, face: 0 };
    this.lastDir = { x: this.face, z: 0 }; this.celebrate = 0;
    this.stats = { pts: 0, fgm: 0, fga: 0, tpm: 0, reb: 0, ast: 0, stl: 0, blk: 0, dnk: 0, pf: 0, ftm: 0, fta: 0 };
    this.hist = [];
    this.ai = new Brain(this);
  }
  get mate() { return M.players.find(q => q.team === this.team && q !== this); }
  get opps() { return M.players.filter(q => q.team !== this.team); }
  turboOK() { return this.fire || this.turbo > 1; }
  speed() {
    let s = 165 + this.st.spd * 13;
    if (this.cmd.turbo && this.turboOK()) s *= 1.42;
    if (this.boost > 0) s *= 1.15;
    if (this.fire) s *= 1.06;
    if (ball.owner === this) s *= 0.93;
    if (M.fun && M.fun.uncle) s *= 0.92;
    s *= fatigueMul(this);                       // winded: slight dip in top speed
    if (!ball.owner && ball.state === 'loose') s *= 1 + (st7(this, 'hus') - 5) * 0.02;   // hustle: first step to loose balls
    if (this.shook > 0) s *= 0.55;               // wrong-footed by a crossover
    if (this.bon) s *= 1 + this.bon.spd;
    return s;
  }
}
const GROUND_STATES = ['free', 'steal', 'shove', 'pass', 'land', 'getup', 'windup'];
const AIR_STATES = ['shoot', 'post', 'jump'];

function updatePlayer(p, dt) {
  const c = p.cmd;
  p.st_t += dt; p.cd.steal -= dt; p.cd.shove -= dt; p.cd.jump -= dt; p.moveCd -= dt;
  if (p.cd.mv > 0) p.cd.mv -= dt;              // dribble-move cooldown (was never counted down: moves worked once per game)
  if (p.boost > 0) { p.boost -= dt; if (chance(dt * 18)) FX.spark(p.x + rand(-14, 14), p.y + rand(10, 90), p.z, '#ffe38a', 'star'); }
  if (p.celebrate > 0) p.celebrate -= dt;
  if (p.fire) { p.fireT -= dt; if (p.fireT <= 0) { p.fire = false; p.streak = 0; } if (chance(dt * 30)) FX.fire(p.x + rand(-10, 10), p.y + rand(5, 70), p.z); }
  const sp = Math.hypot(p.vx, p.vz);
  const sta = p.st.sta != null ? p.st.sta : 5, pray = (p.prayBonus ? 1.1 : 1) * (p.bon ? 1 + p.bon.sta : 1);
  if (c.turbo && sp > 40 && !p.fire) p.turbo = Math.max(0, p.turbo - 30 * dt * (1.25 - sta * 0.05) / pray);
  else if (!c.turbo) p.turbo = Math.min(100, p.turbo + 14 * dt * (trailing(p.team) ? 1.3 : 1) * (0.75 + sta * 0.05) * pray);

  // Input buffer: a shoot/pass press during windup, landing, getup or another
  // short action is held for ~100ms and fires as soon as the player is free.
  if (p.human >= 0) {
    if ((c.a || c.b) && p.state !== 'free') p.buf = { a: c.a, b: c.b, t: 0.18 };   // ~11 frames: presses during an animation fire when it ends
    else if (p.buf) {
      p.buf.t -= dt;
      if (p.buf.t <= 0) p.buf = null;
      else if (p.state === 'free') { c.a = c.a || p.buf.a; c.b = c.b || p.buf.b; p.buf = null; }
    }
  }
  switch (p.state) {
    case 'free': freeLogic(p, dt); break;
    case 'windup':
      if (p.st_t >= 0.1) {
        p.state = 'shoot'; p.st_t = 0; p.vy = p.jumpVy || JUMP_VY;
        if (p.fadeVx || p.fadeVz) { p.vx = p.fadeVx || 0; p.vz = p.fadeVz || 0; p.fadeVx = p.fadeVz = 0; }   // fadeaway drift
      }
      break;
    case 'sig': sigUpdate(p, dt); break;
    case 'shoot':
      if (ball.owner !== p) { p.state = 'post'; break; }
      if (p.human === 1 && Net.role === 'host') {                          // remote shooter: lag-compensated release
        const R = Net.pendRel;
        if (R) { Net.pendRel = null; if (R.rt > 0 && R.rt <= p.st_t + 0.02 && R.rt >= p.st_t - 0.35) p.st_t = R.rt; releaseShot(p); break; }
        if (p.st_t > 0.72 + Math.min(0.3, Net.guestLag || 0) || (!c.bHeld && p.st_t > 0.72)) releaseShot(p);
        break;
      }
      { const rel = p.human >= 0 ? !c.bHeld : p.st_t >= p.ai.relT; if (rel || p.st_t > 0.72) releaseShot(p); }
      break;
    case 'pass': if (p.st_t > 0.2) p.state = 'free'; break;
    case 'steal': if (p.st_t > 0.28) p.state = 'free'; break;
    case 'shove': if (p.st_t > 0.32) p.state = 'free'; break;
    case 'land': if (p.st_t > 0.14) p.state = 'free'; break;
    case 'down':
      if (p.y > 0) { p.vy -= grav() * dt; p.y = Math.max(0, p.y + p.vy * dt); }
      if (p.st_t > 1.0) { p.state = 'getup'; p.st_t = 0; } break;
    case 'getup': if (p.st_t > 0.35) p.state = 'free'; break;
    case 'dunk': dunkUpdate(p, dt); break;
    case 'hang':
      p.y = lerp(p.y, 42, Math.min(1, dt * 10));
      if (p.st_t > 0.22) { p.state = 'jump'; p.vy = -40; p.st_t = 0; } break;
  }
  if (GROUND_STATES.includes(p.state)) {
    let tvx = c.mx * p.speed(), tvz = c.mz * p.speed();
    if (p.state === 'windup') { tvx = 0; tvz = 0; }
    else if (p.state !== 'free') { tvx *= 0.35; tvz *= 0.35; }
    if (p.stumble > 0) { p.stumble -= dt; tvx *= 0.2; tvz *= 0.2; }
    const slowing = Math.hypot(tvx, tvz) < Math.hypot(p.vx, p.vz);
    const acc = Math.min(1, dt * (p.state === 'free' ? (slowing ? 20 : 14) : 6));
    p.vx += (tvx - p.vx) * acc; p.vz += (tvz - p.vz) * acc;
    crossStep(p, dt); fatigueStep(p, dt);
    // sharp change of direction with the ball = crossover (turbo: behind-the-back)
    if (ball.owner === p && p.state === 'free' && !p.move) {
      const s = Math.hypot(tvx, tvz);
      if (s > 20) {
        const dx = tvx / s, dz = tvz / s;
        if (dx * p.lastDir.x + dz * p.lastDir.z < -0.1 && p.moveCd <= 0) startMove(p, c.turbo && chance(0.6) ? 'btb' : 'cross');
        p.lastDir.x = dx; p.lastDir.z = dz;
      }
    }
    if (c.face && ball.owner !== p && sp < 200) p.face = c.face;
    else if (Math.abs(p.vx) > 45 && Math.abs(p.vx) > Math.abs(p.vz) * 0.3) p.face = sgn(p.vx);
    if (p.state === 'windup') p.face = sgn(attackHoop(p.team).x - p.x);
  } else if (p.state === 'down' || p.state === 'getup') { p.vx *= 0.9; p.vz *= 0.9; }
  if (AIR_STATES.includes(p.state)) {
    p.vy -= grav() * dt; p.vx *= 0.985; p.vz *= 0.985; p.y += p.vy * dt;
    if (p.state === 'jump') checkBlockJump(p);
    if (p.y <= 0) {
      p.y = 0; p.vy = 0;
      if (p.state === 'shoot') releaseShot(p);
      p.state = 'land'; p.st_t = 0;
    }
  }
  if (p.state !== 'dunk' && p.state !== 'hang') { p.x += p.vx * dt; p.z += p.vz * dt; }
  p.x = clamp(p.x, -20, COURT.L + 20); p.z = clamp(p.z, 20, COURT.D - 20);
  p.hist.push({ x: p.x, z: p.z, vx: p.vx, vz: p.vz }); if (p.hist.length > 40) p.hist.shift();
  animate(p, dt);
}

function freeLogic(p) {
  const c = p.cmd;
  if (ball.owner === p) {
    if (c.x && startCross(p)) return;                 // dedicated crossover
    if (c.s && trySignature(p, true)) return;         // Skills: call your signature move
    if (c.b) {
      if (p.human >= 0 && c.turbo && trySignature(p)) return;
      if (canDunk(p)) startDunk(p, {});
      else {
        const h = attackHoop(p.team), d = dxz(p, h);
        if (p.human >= 0 && d > 150 && d < 270) {
          const speed = Math.hypot(p.vx || 0, p.vz || 0), label = !(c.turbo && p.turboOK()) ? 'TURBO TO DUNK' : speed < 115 ? 'BUILD A RUN-UP' : 'DRIVE AT THE RIM';
          FX.pop(p.x, 132, p.z, label, '#ffd76a');
        }
        startShot(p);
      }
      return;
    }
    if (c.a) { const mate = c.passTo || p.mate; doPass(p, mate, c.alley === null ? autoAlley(p, mate) : c.alley); }
    return;
  }
  const h = ball.owner;
  if (h && h.team === p.team) {
    // Human without the ball can call for a pass / alley-oop from a CPU teammate
    if (c.a && p.human >= 0 && h.human < 0) h.ai.request = { type: 'pass', to: p };
    if (c.b) {
      if (p.human >= 0 && h.human < 0 && dxz(p, attackHoop(p.team)) < 300) h.ai.request = { type: 'alley', to: p };
      else startJump(p);
    }
  } else {
    if (c.a) { if (c.turbo && p.turboOK()) tryShove(p); else trySteal(p); }
    if (c.b) startJump(p);
  }
}
function autoAlley(p, mate) {
  if (!mate || mate.state !== 'free') return false;
  const h = attackHoop(p.team); if (dxz(mate, h) > 290) return false;
  return mate.human >= 0 ? mate.cmd.turbo : mate.ai.plan.type === 'cut';
}
function startMove(p, type) {
  p.move = { type, t: 0, dur: type === 'btb' ? 0.3 : 0.24, from: p.dh, to: p.dh === 'n' ? 'f' : 'n' };
  p.moveCd = 0.35; SFX.squeak();
  if (type === 'xover') p.move.dur = 0.3;
  // a quick crossover can leave a defender stumbling ("ankles")
  for (const o of p.opps) {
    if (o.state !== 'free' || dxz(o, p) > 55) continue;
    if (chance(0.08 + (p.st.spd - o.st.def) * 0.03 + (type === 'btb' ? 0.05 : type === 'xover' ? 0.06 : 0))) {
      o.stumble = 0.55; FX.callout('CROSSED UP!', '#ffffff'); SFX.cheer(0.6);
    }
  }
}
function handsMid(p) {
  const a = p.hands.n, b = p.hands.f;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}
// --- shooting
function startShot(p) {
  const h = attackHoop(p.team);
  p.state = 'windup'; p.st_t = 0; p.face = sgn(h.x - p.x); p.vx *= 0.2; p.vz *= 0.2;
  p.jumpVy = SIG_JUMP[p.sigShot] || JUMP_VY;                          // each signature move has its own release timing
  if (p.human < 0) p.ai.relT = apexT(p) + gauss() * aiCfg(p.team).relErr;
  notifyShot(p);
}
function shotProbability(p, x, z, contestDist) {
  const h = attackHoop(p.team), d = Math.hypot(x - h.x, z - h.z);
  let b = d < 70 ? 0.8 : clamp(0.86 - 0.00135 * d, 0.03, 0.9);
  b *= 0.72 + p.st.sht * 0.042;
  const od = (contestDist != null ? contestDist : nearestOppDist(x, z, p.team)) + sigContestBonus(p);   // fadeaway/euro/floater create space
  b *= od < 25 ? 0.5 : od < 60 ? 0.5 + (od - 25) / 35 * 0.3 : od < 110 ? 0.8 + (od - 60) / 50 * 0.2 : 1;
  if (p.fire) b += 0.2;
  if (p.boost > 0) b += 0.15;
  if (trailing(p.team)) b += 0.04;
  if (p.prayBonus) b *= 1.1;
  if (p.bon) b *= 1 + p.bon.sht;
  if (d > 560) b *= 0.3;
  return clamp(b, 0.02, 0.95);
}
// Green window (seconds from the jump apex) = 0.045 x rating x difficulty x distance.
function humanDiffMult() {
  if (M.dmOverride != null) return M.dmOverride;                     // online guest: host's value
  if (M.career && M.careerL != null) { const L = M.careerL; return L <= 1 ? lerp(1.5, 1.0, L) : lerp(1.0, 0.7, Math.min(1, L - 1)); }
  return { easy: 1.5, medium: 1.0, hard: 0.7 }[SETTINGS.difficulty];
}
function shotWindow(p, x = p.x, z = p.z) {
  const h = attackHoop(p.team), d = Math.hypot(x - h.x, z - h.z);
  if (d >= 560) return 0;                                              // half court or farther: no green
  const dist = d > THREE_R + 80 ? 0.6 : isThree(x, z, h) ? 0.85 : 1.0;
  // base window ~17% tighter than before, and it shrinks further under a close contest
  return 0.0375 * (0.7 + p.st.sht * 0.06) * (p.human >= 0 ? humanDiffMult() : 1) * dist * contestK(p, x, z) * (clutchTime() ? 1 + 0.05 * (st7(p, 'clu') - 5) : 1);   // clutch: calmer timing late
}
// Tiers: GREEN ignores the normal formula (open 95%, light contest 85%, heavy 65%);
// GOOD is the normal formula +5%; OFF keeps the old early/late penalty.
function releaseShot(p) {
  if (ball.owner !== p) { p.state = 'post'; return; }
  const h = attackHoop(p.team), apex = apexT(p), e = Math.abs(p.st_t - apex), win = shotWindow(p);
  const od = nearestOppDist(p.x, p.z, p.team), air = p.opps.some(o => o.y > 25 && dxz(o, p) < 60);
  let prob, tier;
  if (win > 0 && e <= win) { tier = 'green'; prob = od < 25 || air ? 0.65 : od < 70 ? 0.85 : 0.95; }
  else {
    prob = shotProbability(p, p.x, p.z);
    if (win > 0 && e <= win * 3) { tier = 'good'; prob += 0.05; }
    else { tier = 'off'; prob *= 1.08 - Math.min(e, 0.35) * 0.95; }
    if (air) prob *= 0.78;                                             // hand in the face
    if (p.sigShot) prob *= 1.1;                                        // signature moves: slightly better odds
  }
  const make = Math.random() < clamp(prob * clutchK(p) * (p.contactK || 1), 0.02, 0.97);   // contact (and-one chances) lowers it
  const ftShot = M.phase === 'ft';
  const pts = ftShot ? 1 : isThree(p.x, p.z, h) ? 3 : 2;
  if (ftShot) p.stats.fta = (p.stats.fta || 0) + 1; else { p.stats.fga++; if (pts === 3) p.stats.tpa = (p.stats.tpa || 0) + 1; }
  if (p.human >= 0) {
    // made-shot streak (personal best): a new release while the last one missed resets it
    if (p.shotOpen) p.mk = 0; p.shotOpen = true;
    if (win > 0) { p.stats.tmd = (p.stats.tmd || 0) + 1; if (tier === 'green') p.stats.grn = (p.stats.grn || 0) + 1; else if (p.st_t < apex) p.stats.early = (p.stats.early || 0) + 1; else p.stats.late = (p.stats.late || 0) + 1; }   // timing log (stat sheet only)
    if (tier === 'green') {                                  // the most rewarding moment in the game
      FX.pop(p.x, p.y + 126, p.z, 'GREEN', '#57e389'); SFX.green(); SFX.cheer(0.3, 0.1);
      const hm = handsMid(p); FX.burst(hm.x, hm.y + 8, hm.z, REDUCED_MOTION ? 1 : 3, 'spark', ['#57e389', '#d9ffe6']);
      p.greenFlash = 0.45; AchEvents.green(p);
      FX.cue('green', hm.x, hm.y + 8, hm.z);
    }
    else if (tier === 'good') { FX.pop(p.x, p.y + 122, p.z, 'GOOD', '#ffd84d'); coachNote(p, p.st_t - apex, win); }
    else { FX.pop(p.x, p.y + 122, p.z, p.st_t < apex ? 'EARLY' : 'LATE', '#ff6b6b'); coachNote(p, p.st_t - apex, win); }
  }
  const relD = dxz(p, h);
  launchShot(p, h, make, pts);
  ball.shot.green = tier === 'green'; ball.shot.sig = p.sigShot || null; ball.shot.hot = hotHit(p); ball.shot.rd = relD;
  p.sigShot = null;
  p.state = 'post'; p.st_t = 0;
}
function launchShot(p, h, make, pts) {
  const hand = handsMid(p);
  ball.owner = null; ball.x = hand.x; ball.y = hand.y + 6; ball.z = hand.z;
  const d = Math.hypot(h.x - ball.x, h.z - ball.z) || 1;
  let tx = h.x, tz = h.z, ty = RIM_Y + 1;
  if (!make) {
    const ux = (h.x - ball.x) / d, uz = (h.z - ball.z) / d;
    if (chance(clamp((d - 200) / 900, 0.03, 0.22))) { const s = rand(26, 44); tx -= ux * s; tz -= uz * s + rand(-8, 8); ty = RIM_Y; }
    else { const s = (chance(0.55) ? 1 : -1) * (RIM_R + rand(0.5, 4)), lat = rand(-5, 5); tx += ux * s - uz * lat; tz += uz * s + ux * lat; ty = RIM_Y + rand(3, 7); }
  }
  const T = d < 90 ? 0.5 + d / 700 : 0.74 + d / 1000;
  ball.vx = (tx - ball.x) / T; ball.vz = (tz - ball.z) / T; ball.vy = (ty - ball.y + 0.5 * grav() * T * T) / T;
  ball.spin = -sgn(ball.vx) * 14;
  ball.state = 'shot'; ball.pass = null; ball.lastTouch = p; ball.fire = p.fire;
  ball.shot = { shooter: p, team: p.team, hoop: h, make, pts, clean: make, t: 0, touched: false, dunk: false, tried: new Set() };
}
// --- dunks
function canDunk(p) {
  const h = attackHoop(p.team);
  if ((p.x - h.x) * h.dir < 5) return false;     // under/behind the backboard
  const turbo = p.cmd.turbo && p.turboOK();
  const R = (turbo ? 250 : 115) + (p.fire ? 40 : 0) + (p.boost > 0 ? 20 : 0) + p.st.dnk * 3;
  const d = dxz(p, h);
  if (d >= R) return false;
  // A long dunk is earned by a drive into the lane. Close finishes stay easy,
  // while a lateral jog or standing launch cannot trigger a runway jam.
  if (d > 150) {
    if (!turbo) return false;
    const vx = p.vx || 0, vz = p.vz || 0, speed = Math.hypot(vx, vz);
    const toX = (h.x - p.x) / d, toZ = (h.z - p.z) / d;
    const approach = speed > 1 ? (vx * toX + vz * toZ) / speed : 0;
    if (speed < 115 || approach < (d > 205 ? 0.58 : 0.34)) return false;
  }
  return true;
}
function dunkPath(a, s) {
  s = Math.min(s, 1);
  const u = Math.min(1, s / 0.8), e = 1 - (1 - u) * (1 - u);
  return { x: lerp(a.sx, a.tx, e), z: lerp(a.sz, a.tz, e), y: Math.max(0, a.peak * (1 - ((s - 0.6) / 0.6) ** 2)) };
}
function startDunk(p, opts) {
  const h = attackHoop(p.team), d = dxz(p, h);
  p.face = sgn(h.x - p.x);
  const types = opts.alley ? ['tomahawk', 'twohand', 'windmill'] : d > 180 ? ['360', 'windmill', 'tomahawk'] : d > 100 ? ['tomahawk', 'windmill', 'twohand'] : ['twohand', 'tomahawk'];
  const type = opts.alley ? 'alley' : pick(types), baseD = opts.D || clamp(0.6 + d / 450, 0.62, 1.15);
  const D = baseD * (type === 'windmill' ? 1.08 : type === '360' ? 1.12 : type === 'twohand' ? 0.94 : 1);
  p.act = { type, D, s: 0, sx: p.x, sz: p.z, tx: h.x + h.dir * 20, tz: h.z + (p.z - h.z) * 0.12, peak: 64 + (D - 0.7) * 30 + (type === '360' ? 8 : 0),
    hoop: h, alley: !!opts.alley, slammed: false, didSlam: false, big: d > 170 || (type !== 'twohand' && chance(0.45)), tried: new Set() };
  p.state = 'dunk'; p.st_t = 0; p.vx = p.vz = 0; p.y = 0; p.move = null;
  if (ball.owner === p) p.stats.fga++;
  notifyDunk(p); SFX.squeak();
}
function dunkUpdate(p, dt) {
  const a = p.act; a.s += dt / a.D;
  const q = dunkPath(a, a.s); p.x = q.x; p.z = q.z; p.y = q.y;
  const spinU = clamp((a.s - 0.14) / 0.52, 0, 1);
  p.spin = a.type === '360' ? spinU * Math.PI * 2 : a.type === 'windmill' ? Math.sin(spinU * Math.PI) * 0.2 : 0;
  if (a.s > 0.74 && !a.impactCue) { a.impactCue = true; p.sq = -0.45; p.expr = { k: 'fierce', t: 0.55 }; }
  if (ball.owner === p && a.s > 0.25 && a.s < 0.8) {
    for (const o of p.opps) {
      if (o.state !== 'jump' || a.tried.has(o)) continue;
      if (Math.hypot(ball.x - o.x, ball.y - (o.y + 104), ball.z - o.z) < (o.swipe ? 40 : 28)) {
        a.tried.add(o);
        if (dunkContest(o, p)) break;                 // v6: swipes, chase-downs (pinned on the glass), contact
      }
    }
  }
  if (!a.slammed && a.s >= 0.8) { a.slammed = true; if (ball.owner === p) slam(p, a); }
  if (a.s >= 1) {
    p.spin = 0;
    if (a.didSlam) { p.state = 'hang'; p.st_t = 0; }
    else { p.state = 'jump'; p.vy = 0; p.st_t = 0; }
  }
}
function slam(p, a) {
  const h = a.hoop;
  ball.owner = null; ball.x = h.x; ball.z = h.z; ball.y = RIM_Y + 7; ball.vx = ball.vz = 0; ball.vy = -460;
  ball.state = 'shot'; ball.fire = p.fire;
  ball.shot = { shooter: p, team: p.team, hoop: h, make: true, pts: 2, clean: true, t: 0, touched: false, dunk: true, dunkType: a.type, big: a.big, sig: a.sig || null, tried: new Set() };
  h.dy = -7; h.vy = -160 * (a.big ? 1.4 : 1); M.lastDunker = p;
  // impact: hit-stop on contact, shake scaled by the dunk (poster = defender right there)
  const hp = attackHoop(p.team), poster = p.opps.some(o => dxz(o, p) < 10 && o.y > 92 && o.state !== 'down' && dxz(o, hp) < dxz(p, hp) + 6);   // dunked right over a defender at the peak of his jump
  if (poster) M.lastPoster = { p, t: M.time };
  h.kick('dunk', a.big ? 1.6 : 1.1, 0, 0, (a.big ? 1 : 0) | (p.fire ? 2 : 0) | (poster ? 4 : 0) | (a.alley ? 8 : 0));
  if (poster || a.big) { FX.hitstop(2); camPunch(); }             // nudge comes from the make itself (big dunks and posters only)
  if (poster) FX.slowmo(0.3, 0.55);
  SFX.slam(); FX.burst(h.x, RIM_Y, h.z, REDUCED_MOTION ? 2 : a.big ? 7 : 4, 'spark', ['#ffd76a', '#ffffff']);
  if (a.big || poster || a.alley) { FX.shake(poster ? 3.6 : 2.6, 0.2); camPunch(); }
  a.didSlam = true; p.stats.dnk++; p.celebrate = 1.2;
}
// --- passing
function doPass(p, to, alley) {
  if (!to || to.state === 'down') return;
  if (alley && to.state === 'free' && to.y <= 0) { throwAlley(p, to); return; }
  const pas = p.st.pas != null ? p.st.pas : 5, hand = handsMid(p), d = Math.hypot(to.x - hand.x, to.z - hand.z), T = 0.14 + d / (1200 * (0.9 + pas * 0.02));
  // Infer a readable pass form from the situation, without changing controls.
  let pressure = 999;
  for (const o of p.opps) if (o.state !== 'down') pressure = Math.min(pressure, dxz(o, p));
  p.passKind = p.forcePass || (pressure < 58 ? 'bounce' : Math.hypot(to.vx || 0, to.vz || 0) > 95 ? 'lead' : 'chest');
  const tx = to.x + to.vx * T, tz = to.z + to.vz * T, ty = to.y + 58;
  releaseForPass(p, hand);
  ball.vx = (tx - ball.x) / T; ball.vz = (tz - ball.z) / T;
  let vy = (ty - ball.y + 0.5 * grav() * T * T) / T;
  if (p.passKind === 'bounce') {
    // Pick the one-bounce arc whose rebound arrives closest to the receiver's
    // hands. The existing floor collision supplies the physical rebound.
    const gy = grav(), y0 = ball.y, target = Math.max(BALL_R + 16, ty), e = 0.62;
    let bestErr = 1e9, bestVy = vy;
    for (let i = 0; i < 12; i++) {
      const tb = T * (0.28 + i * 0.052), launch = 0.5 * gy * tb - (y0 - BALL_R) / tb;
      const remain = T - tb, end = BALL_R + e * (0.5 * gy * tb + (y0 - BALL_R) / tb) * remain - 0.5 * gy * remain * remain;
      const err = Math.abs(end - target);
      if (err < bestErr && launch < 80) { bestErr = err; bestVy = launch; }
    }
    vy = bestVy;
  }
  ball.vy = vy;
  ball.pass = { from: p, to, t: 0, T, alley: false, kind: p.passKind, bounced: false, tried: new Set() };
  p.face = sgn(to.x - p.x) || p.face;
}
function releaseForPass(p, hand) {
  ball.owner = null; ball.x = hand.x + p.face * 6; ball.y = hand.y; ball.z = hand.z;
  ball.state = 'pass'; ball.shot = null; ball.lastTouch = p; ball.spin = p.face * 8;
  p.state = 'pass'; p.st_t = 0; SFX.swipe();
}
function throwAlley(p, to) {
  p.passKind = 'alley';
  M.alleyT[p.team] = M.time;
  const h = attackHoop(to.team);
  const D = clamp(0.78 + dxz(to, h) / 800, 0.8, 1.15);
  startDunk(to, { alley: true, D });
  const sc = 0.66, q = dunkPath(to.act, sc);
  const tx = q.x + to.face * 16, ty = q.y + 100, tz = q.z, T = sc * D;
  const hand = handsMid(p);
  releaseForPass(p, hand);
  ball.vx = (tx - ball.x) / T; ball.vz = (tz - ball.z) / T; ball.vy = (ty - ball.y + 0.5 * grav() * T * T) / T;
  ball.pass = { from: p, to, t: 0, T, alley: true, kind: 'alley', bounced: false, tried: new Set() };
  p.face = sgn(to.x - p.x) || p.face;
}
// --- defense actions
function startJump(p) {
  if (p.cd.jump > 0 || p.y > 0) return;
  p.state = 'jump'; p.st_t = 0; p.vy = 400 + p.st.def * 7; p.cd.jump = 0.3; p.blockTried = false;
}
function checkBlockJump(o) {
  if (ball.state !== 'shot' || ball.shot.dunk || ball.shot.team === o.team || ball.shot.t > 0.4 || ball.shot.tried.has(o)) return;
  if (Math.hypot(ball.x - (o.x + o.face * 6), ball.y - (o.y + 104), ball.z - o.z) < 30) {
    ball.shot.tried.add(o);
    const sh = ball.shot.shooter, h = ball.shot.hoop;
    const lane = sh ? clamp((dxz(sh, h) - dxz(o, h) + 20) / 100, 0, 1) : 0;
    const height = sh ? clamp((o.y - sh.y) / 140, -0.08, 0.12) : 0;
    if (chance(clamp(0.08 + o.st.def * 0.027 + lane * 0.16 + height, 0.05, 0.58))) blockBall(o, sh);
  }
}
function blockBall(o, victim) {
  ball.owner = null; ball.state = 'loose'; ball.shot = null; ball.pass = null;
  ball.vx = -(ball.vx || 0) * 0.3 + rand(-80, 80) + o.face * 150; ball.vy = rand(-60, 220); ball.vz = rand(-160, 160); ball.grabLock = 0.15;
  ball.lastTouch = o;
  o.stats.blk++; addHifz(o, 25);
  o.expr = { k: 'fierce', t: 1.1 }; if (victim) victim.expr = { k: 'shock', t: 1.0 };
  // blockFeel owns the single impact cue, avoiding stacked bursts/shakes.
  blockFeel(o, victim);
  if (victim && victim.state === 'dunk') victim.act.didSlam = false;
}
function trySteal(p) {
  if (p.cd.steal > 0) { if (p.human >= 0 && p.cd.steal < 0.22) p.buf = { a: true, b: false, t: p.cd.steal + 0.05 }; return; }   // buffer, don't drop
  p.cd.steal = 0.5; p.state = 'steal'; p.st_t = 0;
  const h = ball.owner;
  if (!h || h.team === p.team) { SFX.swipe(); return; }
  p.face = sgn(h.x - p.x);
  if (dxz(p, h) < 54 && h.y < 10 && (h.state === 'free' || h.state === 'pass' || h.state === 'land')) {
    let pr = 0.02 + p.st.stl * 0.025 - h.st.spd * 0.012;
    if (h.move) pr += 0.14;                       // ball in transit between hands
    if (ballExposed(p, h)) pr += 0.08;
    if (M.phase === 'live' && trailing(p.team)) pr += 0.02;
    if (chance(pr)) {
      const clean = chance(0.55);
      if (clean) giveBall(p, 'steal');
      else { fumble(h); ball.vx = (p.x - h.x) * 3; ball.vz = (p.z - h.z) * 3; ball.vy = 160; p.stats.stl++; addHifz(p, 20); }
      stealFeel(p, clean); if (clean) react(h, 'headDown', 0.9);
      return;
    }
  }
  SFX.swipe();
}
function ballExposed(p, h) { return Math.hypot(ball.x - p.x, ball.z - p.z) < dxz(h, p) - 4; }
function tryShove(p) {
  if (p.cd.shove > 0) return;
  p.cd.shove = 1.0; p.shoves = (p.shoves || 0) + 1; if (!p.fire) p.turbo = Math.max(0, p.turbo - 25);
  p.state = 'shove'; p.st_t = 0;
  let tgt = null, bd = 48;
  for (const o of p.opps) { if (o.state === 'down' || o.state === 'hang' || o.y > 70) continue; const d = dxz(o, p); if (d < bd) { bd = d; tgt = o; } }
  if (tgt) {
    p.face = sgn(tgt.x - p.x);
    knockDown(tgt, (tgt.x - p.x) / (bd || 1), (tgt.z - p.z) / (bd || 1));
    SFX.thud();
    FX.burst((p.x + tgt.x) / 2, 72, (p.z + tgt.z) / 2, 6, 'star', ['#ffe38a', '#ffffff']);   // cartoon impact stars
    if (shoveFoulCheck(p, tgt)) callFoul(p, tgt);
    else if (chance(0.35)) FX.callout('WATCH THE ADAB!', '#ff9a8a');
  } else SFX.swipe();
}
function knockDown(t, nx, nz) {
  if (ball.owner === t) fumble(t);
  t.state = 'down'; t.st_t = 0; t.vx = nx * 200; t.vz = nz * 200; t.vy = 0;
  t.fallDir = sgn(nx); t.spin = 0; t.move = null; t.act = null;
  t.expr = { k: 'shock', t: 0.9 }; t.sq = -0.65; FX.hitstop(1); FX.dust(t.x, t.z, 2);
}
function addHifz(p, n) { if (M.practice || (M.fmt && M.fmt.shortGame && p.hifzUsed) || !p.def.huffath || p.boost > 0) return; p.hifz = Math.min(100, p.hifz + n); if (p.hifz >= 100) M.hifzQueue.push(p); }

