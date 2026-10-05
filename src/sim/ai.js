// ==================================================================== AI
// Utility-based AI. Each CPU player re-thinks every `react` seconds (plus
// immediately on events), choosing the plan with the highest utility for its
// context: HANDLER, OFF-BALL offense, DEFENSE, SHOT IN AIR, LOOSE BALL, DEAD.
// Difficulty changes reaction time, decision noise and release timing only.

function nearestOppDist(x, z, team) {
  let m = 999;
  for (const o of M.players) if (o.team !== team && o.state !== 'down') m = Math.min(m, Math.hypot(o.x - x, o.z - z));
  return m;
}
function nearestOpp(p) {
  let best = null, m = 1e9;
  for (const o of p.opps) { if (o.state === 'down') continue; const d = dxz(o, p); if (d < m) { m = d; best = o; } }
  return best;
}
// How open is the straight line from p to the hoop? (closest defender to the lane)
function laneOpen(p, h) {
  let m = 200;
  for (const o of p.opps) {
    if (o.state === 'down') continue;
    const s = segDist(o.x, o.z, p.x, p.z, h.x + h.dir * 10, h.z);
    if (s.t > 0.02 && s.t < 1.15) m = Math.min(m, s.d);
  }
  return m;
}
// Interception risk of a pass a -> b (0..1)
function passRisk(a, b) {
  let r = 0;
  for (const o of a.opps) {
    if (o.state === 'down') continue;
    const s = segDist(o.x, o.z, a.x, a.z, b.x, b.z);
    if (s.t > 0 && s.t < 1) r += clamp((45 - s.d) / 45, 0, 1) * (0.45 + o.st.stl * 0.05) * (1.2 - s.t * 0.4);
    if (dxz(o, b) < 30) r += 0.3;
  }
  return clamp(r, 0, 1);
}
function dunkEstimate(p) { return clamp(0.72 + p.st.dnk * 0.03 + (p.fire ? 0.05 : 0), 0, 0.99); }
function manOf(p) { return M.teams[1 - p.team].players[M.assign[p.team][p.slot]]; }
function trailing(team) { return SETTINGS.rubber && M.teams && M.phase !== 'tip' && M.teams[1 - team].score - M.teams[team].score >= 6; }
function offSpots(h) {
  const S = [];
  for (const [r, a] of [[335, 0], [335, 0.55], [335, -0.55], [330, 1.15], [330, -1.15], [200, 0.85], [200, -0.85], [210, 0], [110, 1.2], [110, -1.2]])
    S.push({ x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 45, 655) });
  return S;
}
function predictLanding() {
  let x = ball.x, y = ball.y, z = ball.z, vy = ball.vy;
  for (let t = 0; t < 1.4; t += 0.03) {
    vy -= grav() * 0.03; x += ball.vx * 0.03; y += vy * 0.03; z += ball.vz * 0.03;
    if (y < 75 && vy < 0) break;
  }
  return { x: clamp(x, 0, COURT.L), z: clamp(z, 30, 670) };
}

// Perception lag: CPU defenders react to where a player WAS `react` seconds ago,
// extrapolated by his velocity (better on harder levels). Crossovers beat it.
function perceive(o, cfg) {
  const lag = cfg.react * 0.6, h = o.hist, i = Math.max(0, h.length - 1 - Math.round(lag / STEP)), s = h[i] || o;
  return { x: s.x + s.vx * lag * cfg.antic, z: s.z + s.vz * lag * cfg.antic, vx: s.vx, vz: s.vz, state: o.state };
}

class Brain {
  constructor(p) { this.p = p; this.t = rand(0, 0.2); this.plan = { type: 'idle', ctx: '' }; this.request = null; this.jumpAt = -1; this.relT = APEX_T; this.jukeCd = 0; }
  cfg() { return aiCfg(this.p.team); }
  ctx() {
    const p = this.p;
    if (M.phase === 'dead' || M.phase === 'break' || M.phase === 'over') return 'dead';
    if (ball.owner === p) return 'handler';
    if (ball.owner) return ball.owner.team === p.team ? 'off' : 'def';
    if (ball.state === 'pass') return ball.pass.from.team === p.team ? 'off' : 'def';
    if (ball.state === 'shot') return 'shot';
    return 'loose';
  }
  update(dt) {
    const p = this.p, c = p.cmd;
    c.mx = 0; c.mz = 0; c.turbo = false; c.a = false; c.b = false; c.bRel = false; c.passTo = null; c.alley = null; c.face = 0;
    c.bHeld = p.state === 'windup' || p.state === 'shoot';
    this.t -= dt; this.jukeCd -= dt;
    if (this.t <= 0 || this.request || this.plan.ctx !== this.ctx()) {
      this.think();
      let r = this.cfg().react; if (trailing(1 - p.team)) r *= 1.12;   // rubber band: leader gets a touch lazier
      this.t = r * rand(0.7, 1.3);
    }
    this.p.cmd.x = false; this.p.cmd.s = false;
    if (euroHold(this.p, this.p.cmd)) return;       // don't bite on a euro step's first step
    this.exec(dt);
    cpuSkill(this.p, this.p.cmd, dt);
    // crossover: when closely guarded and looking to create space
    { const p = this.p, cf = this.cfg();
      if (ball.owner === p && p.state === 'free' && !(p.cd.cross > 0) && cf.cross && nearestOppDist(p.x, p.z, p.team) < 50 && chance(dt * cf.cross)) p.cmd.x = true; }
    if (this.jumpAt > 0 && M.time >= this.jumpAt) { this.jumpAt = -1; if (p.state === 'free' && ball.owner !== p) c.b = true; }
  }
  // Add difficulty noise to utilities, then pick the best option.
  choose(opts) {
    const n = this.cfg().noise + (trailing(1 - this.p.team) ? 0.05 : 0);
    let best = null;
    for (const o of opts) { o.u += (Math.random() * 2 - 1) * n * 1.2; if (!best || o.u > best.u) best = o; }
    return best;
  }
  think() {
    const ctx = this.ctx();
    if (ctx === 'handler') this.thinkHandler();
    else if (ctx === 'off') this.thinkOffBall();
    else if (ctx === 'def') this.thinkDefense();
    else if (ctx === 'shot') this.thinkShotInAir();
    else if (ctx === 'loose') this.thinkLoose();
    else this.thinkDead();
    this.plan.ctx = ctx;
  }

  // ---------------- OFFENSE: ball handler
  thinkHandler() {
    const p = this.p, h = attackHoop(p.team), d = dxz(p, h), mate = p.mate, sc = M.shotClock;
    if (M.halfCourt && M.mustClear && M.mustClear[p.team]) {   // take it back beyond the arc first
      const ux = p.x - h.x, uz = p.z - h.z, L = Math.hypot(ux, uz) || 1;
      this.plan = { type: 'probe', u: 1, target: { x: h.x + ux / L * 360, z: clamp(h.z + uz / L * 360, 60, 640) } }; return;
    }
    if (this.request) {                  // a human teammate asked for the ball
      const r = this.request; this.request = null;
      if (r.to.state !== 'down') { this.plan = { type: r.type === 'alley' && autoAlleyOK(r.to) ? 'alley' : 'pass', to: r.to }; return; }
    }
    // Required expected points to take a shot: high early, drops as the shot clock dies.
    const need = Math.max(0, (sc > 16 ? 0.95 : sc > 4 ? 0.35 + (sc - 4) / 12 * 0.6 : 0) - p.holdT * 0.04);
    const opts = [];
    // 1) SHOOT: expected points from distance, defender proximity and shooting stat
    const pts = isThree(p.x, p.z, h) ? 3 : 2;
    if (d < 520) opts.push({ type: 'shoot', u: shotProbability(p, p.x, p.z) * pts - need + 0.15 + (p.st.sht - 6) * 0.03 });
    // 2) DUNK / DRIVE: value of attacking the rim scaled by how open the lane is
    const lane = laneOpen(p, h), laneF = clamp((lane - 18) / 70, 0, 1), pD = dunkEstimate(p) * laneF;
    const range = (p.turbo > 8 || p.fire) ? 245 + p.st.dnk * 3 : 115 + p.st.dnk * 3;
    if (d < range && (p.x - h.x) * h.dir > 5) opts.push({ type: 'dunk', u: 2 * pD - need * 0.5 + 0.25 });
    else opts.push({ type: 'drive', u: 2 * pD * 0.8 * clamp(1 - (d - range) / 700, 0.2, 1) + (p.st.dnk - 5) * 0.03 - 0.25 + (sc < 5 ? 0.2 : 0) });
    // 3) PASS: teammate's shot value minus interception risk; ALLEY-OOP for a cutting teammate
    if (mate && mate.state !== 'down' && mate.state !== 'dunk') {
      const risk = passRisk(p, mate);
      const mEV = shotProbability(mate, mate.x, mate.z) * (isThree(mate.x, mate.z, h) ? 3 : 2);
      opts.push({ type: 'pass', to: mate, u: mEV - need - risk * 1.6 - 0.05 - (p.holdT < 0.4 ? 0.35 : 0) });
      if (autoAlleyOK(mate) && (mate.ai.plan.type === 'cut' || (mate.human >= 0 && mate.cmd.turbo))) {
        const lm = clamp((laneOpen(mate, h) - 15) / 60, 0, 1);
        // variety: a recent alley-oop makes the next one less attractive
        const recent = M.time - (M.alleyT[p.team] || -99) < 25 ? 0.6 : 0;
        opts.push({ type: 'alley', to: mate, u: 2 * lm * dunkEstimate(mate) * 0.72 - 0.15 - risk * 1.5 - need * 0.5 - recent });
      }
    }
    // 4) PROBE: dribble to a better spot and try to shake the defender
    opts.push({ type: 'probe', u: 0.25 * clamp(sc / 24, 0, 1) + 0.05, target: this.bestSpot(true) });
    this.plan = this.choose(opts);
  }
  // Best open spot on the floor for this player (spacing + shot value - travel)
  bestSpot(forHandler) {
    const p = this.p, h = attackHoop(p.team), bo = ball.owner;
    let best = null, bu = -1e9;
    for (const s of offSpots(h)) {
      if (!forHandler && bo && Math.hypot(s.x - bo.x, s.z - bo.z) < 160) continue;
      const open = nearestOppDist(s.x, s.z, p.team);
      const ev = shotProbability(p, s.x, s.z, open) * (isThree(s.x, s.z, h) ? 3 : 2);
      const u = ev - Math.hypot(s.x - p.x, s.z - p.z) / 700 + rand(0, 0.05);
      if (u > bu) { bu = u; best = s; }
    }
    return best;
  }
  // ---------------- OFFENSE: without the ball
  thinkOffBall() {
    const p = this.p, h = attackHoop(p.team), bo = ball.owner;
    if (ball.state === 'pass' && ball.pass.to === p) { this.plan = { type: 'receive' }; return; }
    if (p.human >= 0) { this.plan = { type: 'idle' }; return; }
    const opts = [];
    const spot = this.bestSpot(false);
    if (spot) {
      const ev = shotProbability(p, spot.x, spot.z, nearestOppDist(spot.x, spot.z, p.team)) * (isThree(spot.x, spot.z, h) ? 3 : 2);
      opts.push({ type: 'spot', x: spot.x, z: spot.z, u: ev - 0.2 });
    }
    // CUT: defender is trailing/ball-watching or the lane is open -> alley-oop threat
    const dP = dxz(p, h), myDef = p.opps.find(o => manOf(o) === p) || nearestOpp(p);
    const dD = myDef ? dxz(myDef, h) : 999, laneC = laneOpen(p, h);
    if (dP < 560 && (dD > dP + 10 || laneC > 55)) opts.push({ type: 'cut', u: 0.8 + (p.st.dnk - 5) * 0.07 + clamp((laneC - 30) / 60, 0, 1) * 0.6 - dP / 1400 });
    // SCREEN: body up the handler's defender when he is pressured
    if (bo) {
      const hd = nearestOpp(bo);
      if (hd && dxz(hd, bo) < 50 && dxz(p, bo) < 340 && M.shotClock > 5) opts.push({ type: 'screen', target: hd, u: 0.55 + rand(0, 0.35), t0: M.time });
    }
    this.plan = opts.length ? this.choose(opts) : { type: 'idle' };
  }
  // ---------------- DEFENSE
  thinkDefense() {
    const p = this.p, h = defendHoop(p.team), bo = ball.owner || (ball.pass && ball.pass.to);
    // Human+CPU team: CPU guards whoever the human is not closest to.
    const hum = p.mate && p.mate.human >= 0 ? p.mate : null;
    let man = manOf(p);
    if (hum) { const O = p.opps; man = dxz(hum, O[0]) < dxz(hum, O[1]) ? O[1] : O[0]; }
    if (!bo) { this.plan = { type: 'deny', man }; return; }
    if (man === bo) { this.plan = { type: 'guardBall', man }; return; }
    // Hard: a player on fire draws a double team (the off-ball defender sinks onto the ball)
    if (this.cfg().double && bo.fire && bo.team !== p.team && dxz(bo, h) < 520) {
      if (!bo._dbl || M.time - bo._dbl > 8) { bo._dbl = M.time; FX.pop(bo.x, bo.y + 150, bo.z, 'DOUBLE TEAM', '#8fe3ff'); }
      this.plan = { type: 'help', man }; return;
    }
    // Help: on-ball teammate is beaten (handler closer to rim than his defender)
    const onBall = p.mate;
    if (onBall && dxz(bo, h) < 380 && dxz(onBall, h) > dxz(bo, h) + 15 && laneOpen(bo, h) > 30) { this.plan = { type: 'help', man }; return; }
    this.plan = { type: 'deny', man };
  }
  thinkShotInAir() {
    const p = this.p, sh = ball.shot;
    if (!sh) { this.plan = { type: 'idle' }; return; }
    const h = sh.hoop;
    if (p.team === sh.team) {   // offense crashes the weak side, or gets back
      if (p === sh.shooter && dxz(p, h) > 260) this.plan = { type: 'go', x: defendHoop(p.team).x + defendHoop(p.team).dir * 300, z: 350 };
      else { const side = sh.shooter.z < h.z ? 1 : -1; this.plan = { type: 'go', x: h.x + h.dir * rand(50, 90), z: h.z + side * rand(40, 70), turbo: true }; }
    } else {                    // defense boxes out: between man and rim
      const man = manOf(p);
      if (dxz(man, h) < 330) this.plan = { type: 'box', man };
      else this.plan = { type: 'go', x: h.x + h.dir * 80, z: h.z + rand(-40, 40) };
    }
  }
  thinkLoose() {
    const p = this.p, L = predictLanding(), mate = p.mate;
    const dMe = Math.hypot(L.x - p.x, L.z - p.z), dMate = mate && mate.state !== 'down' ? Math.hypot(L.x - mate.x, L.z - mate.z) : 1e9;
    if (dMe <= dMate || dMe < 140) this.plan = { type: 'chase' };
    else { const h = defendHoop(p.team); this.plan = { type: 'go', x: lerp(L.x, h.x + h.dir * 60, 0.45), z: lerp(L.z, h.z, 0.4) }; }
  }
  thinkDead() {
    const p = this.p, h = defendHoop(p.team);
    if (M.nextInbound === p.team) this.plan = { type: 'go', x: h.x + h.dir * (p.slot ? 280 : 120), z: p.slot ? 470 : 300 };
    else this.plan = { type: 'go', x: h.x + h.dir * (p.slot ? 150 : 260), z: p.slot ? 420 : 290 };
  }

  // ---------------- EXECUTION (every frame)
  moveTo(x, z, turbo = false, slow = 1) {
    const p = this.p, c = p.cmd, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 6) return d;
    const k = Math.min(1, d / 45) * slow; c.mx = dx / d * k; c.mz = dz / d * k;
    c.turbo = turbo && (p.turbo > 12 || p.fire);
    return d;
  }
  exec() {
    const p = this.p, c = p.cmd, pl = this.plan, cfg = this.cfg();
    if (p.state === 'down' || p.state === 'getup' || p.state === 'dunk' || p.state === 'hang') return;
    const bo = ball.owner;
    switch (pl.type) {
      case 'shoot': { const h = attackHoop(p.team); c.face = sgn(h.x - p.x); if (p.state === 'free') c.b = true; break; }
      case 'dunk': {
        const h = attackHoop(p.team); this.moveTo(h.x + h.dir * 20, h.z, true);
        if (p.state === 'free' && canDunk(p)) c.b = true; break;
      }
      case 'drive': {
        const h = attackHoop(p.team); let tx = h.x + h.dir * 25, tz = h.z;
        const def = nearestOpp(p);
        if (def) {
          const s = segDist(def.x, def.z, p.x, p.z, tx, tz);
          if (s.t > 0 && s.t < 0.5 && s.d < 45) {   // defender in the lane: veer away, maybe juke
            const side = sgn(p.z - def.z) || 1; tz = clamp(p.z + side * 120, 60, 640);
            if (this.jukeCd <= 0 && dxz(def, p) < 60 && chance(0.6)) { this.jukeCd = 0.9; c.mz = side; c.mx = 0; }
          }
        }
        this.moveTo(tx, tz, p.turbo > 20 || p.fire);
        if (canDunk(p) && laneOpen(p, h) > 25 && p.state === 'free') { c.turbo = p.turboOK(); c.b = true; }
        break;
      }
      case 'pass': case 'alley':
        if (p.state === 'free') { c.a = true; c.passTo = pl.to; c.alley = pl.type === 'alley'; } break;
      case 'probe': {
        const t = pl.target || { x: p.x, z: p.z };
        const d = this.moveTo(t.x, t.z, false, 0.9);
        if (d < 20) this.t = Math.min(this.t, 0.15);
        const def = nearestOpp(p);
        if (def && dxz(def, p) < 45 && this.jukeCd <= 0 && chance(0.04)) { this.jukeCd = 1; c.mz = -sgn(def.z - p.z); c.mx = -c.mx; }
        break;
      }
      case 'spot': this.moveTo(pl.x, pl.z); if (bo) c.face = sgn(bo.x - p.x); break;
      case 'cut': {
        const h = attackHoop(p.team);
        const d = this.moveTo(h.x + h.dir * 40, h.z + (p.z < h.z ? -30 : 30), p.turbo > 15);
        if (d < 30) this.t = Math.min(this.t, 0.2);
        break;
      }
      case 'screen': {
        const hd = pl.target, bh = ball.owner;
        if (!hd || !bh) break;
        const h = attackHoop(p.team), vx = h.x - bh.x, vz = h.z - bh.z, L = Math.hypot(vx, vz) || 1;
        const px = -vz / L, pz = vx / L, side = sgn((p.x - bh.x) * px + (p.z - bh.z) * pz);
        this.moveTo(hd.x + px * side * 24 - vx / L * 6, hd.z + pz * side * 24 - vz / L * 6);
        if (M.time - pl.t0 > 1.4) this.t = 0;
        break;
      }
      case 'receive': { if (ball.state === 'pass') this.moveTo(ball.x, ball.z, false, 0.5); break; }
      case 'guardBall': {
        const h = defendHoop(p.team), m = bo || pl.man;
        if (m.state === 'dunk') { this.moveTo(h.x + h.dir * 28, h.z + (m.z - h.z) * 0.3, true); break; }
        // stay between man and basket; sag off when he is far from the rim
        const pm = perceive(m, cfg), hd = dxz(pm, h), gap = 34 + Math.max(0, hd - 420) * 0.3;
        const mx = pm.x, mz = pm.z;
        const ux = h.x - mx, uz = h.z - mz, L = Math.hypot(ux, uz) || 1;
        const dist = this.moveTo(mx + ux / L * Math.min(gap, 140), mz + uz / L * Math.min(gap, 140), dxz(p, m) > 150);
        c.face = sgn(m.x - p.x);
        const dd = dxz(p, m);
        // steal timing: go for it when the ball is exposed (crossover / on my side)
        if (bo && dd < 50 && p.cd.steal <= 0 && p.state === 'free') {
          const exposed = bo.move ? 1 : ballExposed(p, bo) ? 0.6 : 0.2;
          if (chance(cfg.steal * exposed * (0.3 + p.st.stl * 0.07) * 0.9 * STEP)) c.a = true;
        }
        // shove only when a score is imminent (driving to dunk / gathering near rim)
        if (bo && dd < 44 && p.turboOK() && p.turbo > 25 && hd < 240 && (bo.cmd.turbo || bo.state === 'windup') && chance(cfg.shove * 1.5 * STEP * shoveRiskK(p))) { c.turbo = true; c.a = true; }
        void dist; break;
      }
      case 'deny': {
        const h = defendHoop(p.team), m = pl.man;
        if (bo && bo.state === 'dunk' && dxz(p, h) < 260) { this.moveTo(h.x + h.dir * 28, h.z + (bo.z - h.z) * 0.3, true); break; }
        const pm = perceive(m, cfg), hd = dxz(pm, h), gap = clamp(hd * 0.3, 25, 130);
        let tx = pm.x + (h.x - pm.x) / (hd || 1) * gap, tz = pm.z + (h.z - pm.z) / (hd || 1) * gap;
        const ref = bo || ball; tx += (ref.x - tx) * 0.12; tz += (ref.z - tz) * 0.12;
        this.moveTo(tx, tz, dxz(p, m) > 200);
        c.face = sgn(ref.x - p.x);
        // lurk in passing lanes: jump a lob pass that comes near
        if (ball.state === 'pass' && Math.hypot(ball.x - p.x, ball.z - p.z) < 60 && ball.y > 75 && ball.y < 170) c.b = true;
        break;
      }
      case 'help': {
        const h = defendHoop(p.team); if (!bo) break;
        const pb = perceive(bo, cfg), ux = h.x - pb.x, uz = h.z - pb.z, L = Math.hypot(ux, uz) || 1;
        this.moveTo(pb.x + ux / L * 45, pb.z + uz / L * 45, true); c.face = sgn(bo.x - p.x); break;
      }
      case 'box': {
        const h = ball.shot ? ball.shot.hoop : defendHoop(p.team), m = pl.man, md = dxz(m, h) || 1;
        const r = clamp(md * 0.55, 55, 110);
        this.moveTo(h.x + (m.x - h.x) / md * r, h.z + (m.z - h.z) / md * r);
        c.face = sgn(m.x - p.x); break;
      }
      case 'go': this.moveTo(pl.x, pl.z, !!pl.turbo); break;
      case 'chase': {
        const L = predictLanding(), bs = Math.hypot(ball.vx, ball.vz);
        const hurry = bs > 120 || nearestOppDist(L.x, L.z, p.team) < Math.hypot(L.x - p.x, L.z - p.z) + 40;
        const lead = ball.y < 60 ? clamp(Math.hypot(ball.x - p.x, ball.z - p.z) / 260, 0.05, 0.35) : 0;   // intercept a rolling ball
        this.moveTo(ball.y < 60 ? ball.x + ball.vx * lead : L.x, ball.y < 60 ? ball.z + ball.vz * lead : L.z, hurry);
        if (Math.hypot(ball.x - p.x, ball.z - p.z) < 40 && ball.y > 78 && ball.y < 200 && ball.vy < 150 && p.state === 'free') c.b = true;
        break;
      }
    }
  }
}
function autoAlleyOK(m) { const h = attackHoop(m.team); return m.state === 'free' && dxz(m, h) < 290 && (m.x - h.x) * h.dir > 5; }

// Event hooks: defenders time their contests off the shooter's gather.
function notifyShot(sh) {
  for (const o of sh.opps) {
    const cfg = aiCfg(o.team);
    if (o.human >= 0 || o.state !== 'free') continue;
    const d = dxz(o, sh);
    if (d < 150 && !chance(cfg.noise * 0.5)) {
      // shooter apex ~0.49s after gather; defender apex ~0.45s after takeoff
      o.ai.jumpAt = M.time + 0.05 + cfg.contest * rand(0.5, 1.5) + (d > 80 ? 0.1 : 0);
      o.ai.t = 0;
    }
  }
}
function notifyDunk(dk) {
  const h = dk.act.hoop, D = dk.act.D;
  for (const o of dk.opps) {
    const cfg = aiCfg(o.team);
    if (o.human >= 0 || o.state !== 'free') continue;
    if (dxz(o, h) < 230 || dxz(o, dk) < 150) {
      const apex = (400 + o.st.def * 7) / grav();
      o.ai.jumpAt = M.time + Math.max(0, 0.6 * D - apex * 0.9) + cfg.contest * rand(0.5, 1.5);
    }
  }
}

