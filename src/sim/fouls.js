// ======================================================= v4.0: NET SOUND
// Procedural net sounds (filtered noise only, no samples). The swish is a short
// airy "fwip": band-passed noise in the 2-6 kHz range with a fast attack and a
// quick decay, sweeping downward as the cords close on the ball. Duration,
// brightness and volume follow the ball's entry speed. Five variants rotate so
// back-to-back makes never sound identical.
const SWISH_VARIANTS = [
  { f: 3300, q: 1.6, dec: 0.25, air: 6200 },
  { f: 2900, q: 1.9, dec: 0.28, air: 5800 },
  { f: 3700, q: 1.5, dec: 0.23, air: 6500 },
  { f: 3100, q: 2.1, dec: 0.3, air: 6000 },
  { f: 3500, q: 1.7, dec: 0.26, air: 6300 }
];
let _swLast = -1;
Object.assign(SFX, {
  // band-limited noise burst for net sounds: high-pass 1.8 kHz -> band-pass -> low-pass (keeps it in the 2-6 kHz body)
  netNoise(dur, f, q, g, f2 = null, delay = 0, lp = 6400) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, s = c.createBufferSource(), hp = c.createBiquadFilter(), bp = c.createBiquadFilter(), lo = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 1800; hp.Q.value = 0.7;
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); bp.Q.value = q; if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    lo.type = 'lowpass'; lo.frequency.value = lp; lo.Q.value = 0.6;
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.005);    // fast attack
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);                                    // quick decay
    s.connect(hp); hp.connect(bp); bp.connect(lo); lo.connect(a); a.connect(this.out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03);
  },
  netSwish(k = 0.7, delay = 0, pitch = 1) {
    let i; do i = Math.floor(Math.random() * SWISH_VARIANTS.length); while (i === _swLast); _swLast = i;
    const V = SWISH_VARIANTS[i], kk = clamp(k, 0.15, 1.35);
    const dur = clamp(V.dec * (0.62 + 0.42 * kk), 0.15, 0.32);          // soft roll-ins short, hard drops fuller (heard as ~120-250 ms)
    const f = V.f * (0.84 + 0.22 * kk) * pitch, vol = 0.08 + 0.22 * kk;  // brighter and louder with speed
    this.netNoise(dur, f * 1.12, V.q, vol, f * 0.72, delay);                    // the fwip, sweeping down as the net closes
    this.netNoise(dur * 0.8, f * 0.8, V.q * 1.2, vol * 0.55, f * 0.62, delay + 0.012); // second cord layer, slightly lower
    this.netNoise(dur * 0.3, V.air, 1.4, vol * 0.1 * kk, null, delay + 0.003, 7800);  // a touch of air at the start
  },
  rimTick(k = 0.6) {                          // rim-in: a light metallic touch, quieter than a clank
    const v = 0.03 + 0.03 * clamp(k, 0, 1);
    this.tone(2380 * rand(0.97, 1.03), 0.06, 'triangle', v); this.tone(3710, 0.04, 'sine', v * 0.6); this.tone(1190, 0.07, 'sine', v * 0.4);
  },
  dunkNet() {                                 // dunk: heavier, lower net snap and a short rim rattle
    this.hiss(0.13, 'bandpass', 1500, 0.9, 0.24, 700);
    this.hiss(0.06, 'highpass', 4200, 0.7, 0.07, null, 0.01);
    for (let i = 0; i < 4; i++) this.tone(rand(380, 560), 0.045, 'square', 0.035 * (1 - i / 4.5), rand(300, 380), 0.03 + i * rand(0.035, 0.05));
  },
  swish(pitch = 1) { this.netSwish(0.7, 0, pitch); }       // legacy callers
});

// ================================================= v4.1: FOULS + FREE THROWS
// v9.17.10: the shove and its hard-foul call (shoveFoulCheck, callFoul, FOUL_BASE) are gone. Fouls are the contact
// ones in v6-contact.js (reach-in, blocking, shooting, and-one, on purpose): they count toward the bonus below.
const BONUS_AT = 5;
function teamFouls(t) { return (M.teamFouls || [0, 0])[t]; }
function inBonus(t) { return teamFouls(1 - t) >= BONUS_AT; }            // team t shoots free throws on every foul
// Lane positions for everyone except the shooter (shooter at the line)
function ftTargets() {               // where everyone stands for free throws (shooter at the line, lane spots for the rest)
  const F = M.ft, h = attackHoop(F.team), s = F.shooter, out = new Map([[s, { x: h.x + h.dir * 214, z: h.z }]]);
  const others = M.players.filter(q => q !== s), spots = [[118, -96], [118, 96], [178, -96], [330, 40]];
  others.sort((a, b) => (a.team === F.team) - (b.team === F.team));
  others.forEach((q, i) => { const [dx, dz] = spots[i] || [360, 0]; out.set(q, { x: h.x + h.dir * dx, z: h.z + dz }); });
  return out;
}
function ftPlace() {
  const F = M.ft, h = attackHoop(F.team), s = F.shooter;
  place(s, h.x + h.dir * 214, h.z); s.face = -h.dir; s.state = 'free'; s.vx = s.vz = 0; s.y = 0;
  const others = M.players.filter(q => q !== s), spots = [[118, -96], [118, 96], [178, -96], [330, 40]];
  others.sort((a, b) => (a.team === F.team) - (b.team === F.team));        // defenders take the first lane spots
  others.forEach((q, i) => { const [dx, dz] = spots[i] || [360, 0]; place(q, h.x + h.dir * dx, h.z + dz); q.face = sgn(h.x - q.x) || 1; q.state = 'free'; q.vx = q.vz = 0; q.y = 0; });
  giveBall(s, 'ft'); ball.lastPasser = null;
}
// commands during free throws: the shooter can only shoot; everyone else holds position
function ftCmd(p) {
  const F = M.ft, c = p.cmd;
  if (F.stage === 'pause' && F.tg && F.tg.get(p) && p.state !== 'down') {            // walk to the line / lane spot
    zeroCmd(c); const t = F.tg.get(p), dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
    if (d > 4) { const k = Math.min(1, d / 30); c.mx = dx / d * k; c.mz = dz / d * k; } return;
  }
  if (p !== F.shooter || F.stage !== 'shoot') { zeroCmd(c); return; }
  if (p.human >= 0) {
    if (Net.role === 'host' && p.human === 1) Net.remoteCmd(c); else humanCmd(p.human, c);
    c.mx = 0; c.mz = 0; c.turbo = false; c.a = false; c.x = false; c.s = false;   // at the line: shoot only
  } else {
    zeroCmd(c); F.cpu = (F.cpu == null ? 0.9 + Math.random() * 0.4 : F.cpu) - STEP;
    if (F.cpu <= 0 && p.state === 'free' && ball.owner === p) { c.b = true; F.cpu = 9; }
  }
}
function ftUpdate(dt) {
  const F = M.ft; F.t += dt;
  if (F.stage === 'pause') {
    F.tg = F.tg || ftTargets();
    const there = [...F.tg].every(([q, t]) => Math.hypot(q.x - t.x, q.z - t.z) < 14 || q.state === 'down');
    if (F.t > 0.6 && there || F.t > 2.1) { ftPlace(); F.stage = 'set'; F.t = 0; }        // only a few units left to settle
    return;
  }
  if (F.stage === 'set') { if (F.t > 0.6) { F.stage = 'shoot'; F.t = 0; F.cpu = null; } return; }
  if (F.stage === 'shoot') {
    if (ball.state === 'shot' && ball.shot && ball.shot.shooter === F.shooter) { F.stage = 'flight'; F.t = 0; F.res = null; }
    else if (F.shooter.state === 'free' && ball.owner !== F.shooter && F.t > 0.4) giveBall(F.shooter, 'ft');   // keep the ball in his hands
    return;
  }
  if (F.stage === 'flight') {
    if (F.i === F.n - 1 && !F.res && ball.state === 'loose') {          // last free throw missed: live ball, either team can rebound
      FX.pop(F.shooter.x, F.shooter.y + 130, F.shooter.z, 'MISS', '#ff9a8a');
      M.ft = null; M.phase = 'live'; M.shotClock = scReset(); M.possTeam = -1; ball.grabLock = 0; return;
    }
    const miss = !F.res && ball.state === 'loose' && (ball.y < 40 || F.t > 2.4);
    if (F.res === 'make' && F.t > 0.5 || miss || F.t > 3) {
      if (miss || !F.res) { FX.pop(F.shooter.x, F.shooter.y + 130, F.shooter.z, 'MISS', '#ff9a8a'); }
      F.i++; F.last = F.res === 'make';
      if (F.i < F.n) { F.stage = 'set'; F.t = 0; ftPlace(); }
      else {
        // after the last free throw: a make -> the other team inbounds (a miss became a live rebound above)
        M.phase = 'dead'; M.deadT = 0.7; M.nextInbound = 1 - F.team; M.ft = null;
      }
    }
  }
}
// scoring a free throw: one point, no inbound (handled by ftUpdate)
function ftScore(h) {
  const F = M.ft, s = F.shooter, pts = M.double ? 2 : 1;
  M.teams[F.team].score += pts; M.teams[F.team].qs[M.quarter - 1] = (M.teams[F.team].qs[M.quarter - 1] || 0) + pts;
  s.stats.pts += pts; s.stats.ftm = (s.stats.ftm || 0) + 1;
  h.kick(ball.shot && ball.shot.touched ? 'rimin' : 'swish', 1, 0, 0, ball.shot && ball.shot.green ? 1 : 0);
  ball.state = 'scored'; ball.shot = null;
  FX.pop(h.x, RIM_Y + 50, h.z, '+' + pts, '#ffd76a'); SFX.cheer(0.45, 0.2);
  F.res = 'make'; F.made++; AchEvents.ftMade(s); trackDeficit();
}
function drawFtBanner(g) {
  const F = M.ft; if (!F || F.stage === 'pause') return;
  const txt = 'FREE THROW ' + Math.min(F.i + 1, F.n) + ' OF ' + F.n + '  \u2022  ' + F.shooter.def.name.toUpperCase();
  g.font = `12px ${FONT}`; const w = g.measureText(txt).width + 28, x = W / 2 - w / 2, y = H - 66;   // bottom center: clear of ribbons, callouts and the stick/buttons
  g.fillStyle = 'rgba(8,14,22,0.8)'; roundRect(g, x, y, w, 26, 13); g.fill();
  g.fillStyle = '#ffd76a'; g.textAlign = 'center'; g.fillText(txt, W / 2, y + 17);
}

