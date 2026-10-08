// ============================================================ HOOPS & NET
// The net is a verlet mesh: ring columns x rows, pinned to the (wobbling) rim.
class Hoop {
  constructor(def, idx) {
    this.x = def.x; this.z = def.z; this.dir = def.dir; this.idx = idx;
    this.bbx = this.x - this.dir * 17;          // backboard plane
    this.dy = 0; this.vy = 0;                   // rim wobble spring
    this.buildNet();
  }
  buildNet() {
    const C = 12, R = 6; this.C = C; this.R = R; this.pts = []; this.links = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const a = c / C * Math.PI * 2, rad = RIM_R * (1 - 0.4 * r / (R - 1));
      const ox = Math.cos(a) * rad, oz = Math.sin(a) * rad, oy = -r * 6.2;
      this.pts.push({ x: this.x + ox, y: RIM_Y + oy, z: this.z + oz, px: this.x + ox, py: RIM_Y + oy, pz: this.z + oz, ox, oy, oz, r, c });
    }
    const id = (r, c) => r * C + ((c + C) % C);
    const link = (a, b, draw) => { const A = this.pts[a], B = this.pts[b]; this.links.push({ a, b, L: Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z), draw }); };
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (r < R - 1) { link(id(r, c), id(r + 1, c + 1), true); link(id(r, c), id(r + 1, c - 1), true); link(id(r, c), id(r + 1, c), false); }
      if (r > 0) link(id(r, c), id(r, c + 1), r === R - 1);
    }
    this.react = null; this.inside = false; this.caught = null; this.settleT = 0; this.sfx = null; this.rest = true;
  }
  // Net physics (v3.3): 2 substeps, 7 constraint passes with a 1.4x stretch
  // cap, a very weak rest pull, ball drag so the mesh wraps and gets pulled
  // down, a whip/sway when the ball leaves, and a rest threshold (no jitter).
  update(dt) {
    this.vy += (-this.dy * 380 - this.vy * 8) * dt; this.dy += this.vy * dt;
    const rimY = RIM_Y + this.dy, SUB = 2, sdt = dt / SUB, g = 300 * sdt * sdt;
    const balls = M.balls || [ball], R = this.R, bottom = rimY - (R - 1) * 6.2;
    if (this.settleT > 0) this.settleT -= dt;
    if (this.caught) { this.caught.t -= dt; if (this.caught.t <= 0) { this.caught = null; this.dropT = 1.6; this.settleT = 1.2; for (const p of this.pts) if (p.r >= 3) p.py = p.y + 3 * (p.r - 2); } }   // drops back down
    // give: while the ball is in the net the cords may stretch (it gets dragged down); after the exit the
    // give releases in ~50 ms and the stored stretch snaps the lower rows back up
    if (this.react && this.inside) this.give = Math.max(this.give || 0, this.react.give || 0);
    else if (this.give > 0) { this.give *= Math.exp(-dt / 0.05); if (this.give < 0.004) this.give = 0; }
    const G = this.give || 0;
    const O = this.osc;                                                 // post-exit oscillation (overshoot, 2-3 decaying swings)
    if (O) { O.t += dt; if (O.t > O.dur) this.osc = null; }
    // swings die out cleanly at the end of the oscillation
    const damp = O ? lerp(O.damp, 0.93, clamp((O.t / O.dur - 0.42) / 0.58, 0, 1)) : this.settleT > 0 ? 0.986 : 0.972, drag = this.react ? this.react.drag : 0.45, pull = this.dropT > 0 ? 0.06 : 0.005;
    if (this.dropT > 0) this.dropT -= dt;
    const near = balls.filter(b => Math.hypot(b.x - this.x, b.z - this.z) < RIM_R + 16 && b.y < rimY + 14 && b.y > bottom - 20);
    if (near.length || this.caught || this.settleT > 0 || this.osc || this.give) this.rest = false;
    const rimMoving = Math.abs(this.dy) > 0.02 || Math.abs(this.vy) > 0.2;
    if (this.rest && !rimMoving && !this.sfx) return;          // fully settled: nothing to simulate
    if (this.rest && rimMoving) {                               // settled net riding a wobbling rim: just follow it
      const d = rimY - this.pts[0].y;
      for (const p of this.pts) { p.y += d; p.py += d; }
      return;
    }
    for (let s = 0; s < SUB; s++) {
      for (const p of this.pts) {
        if (p.r === 0) { p.x = p.px = this.x + p.ox; p.y = p.py = rimY; p.z = p.pz = this.z + p.oz; continue; }
        const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp, vz = (p.z - p.pz) * damp;
        p.px = p.x; p.py = p.y; p.pz = p.z;
        p.x += vx; p.y += vy - g; p.z += vz;
        p.x += (this.x + p.ox - p.x) * pull; p.y += (rimY + p.oy - p.y) * pull * 0.8; p.z += (this.z + p.oz - p.z) * pull;
        if (O && p.r >= 2) {                                               // spring the lower rows back toward rest: they overshoot and swing
          const f = (p.r - 1) / (R - 1), fade = Math.max(0, 1 - O.t / O.dur), kv = O.k * f * fade, kl = O.kl * f * fade;
          p.y += (rimY + p.oy - p.y) * kv; p.x += (this.x + p.ox - p.x) * kl; p.z += (this.z + p.oz - p.z) * kl;   // sideways swing ~0.45 s period
        }
      }
      if (this.caught) for (const p of this.pts) if (p.r === R - 1) {     // bottom row hooked over the rim
        const a = p.c / this.C * Math.PI * 2; p.x = p.px = this.x + Math.cos(a) * (RIM_R + 1.5); p.y = p.py = rimY + 2.5; p.z = p.pz = this.z + Math.sin(a) * (RIM_R + 1.5);
      }
      for (let it = 0; it < 7; it++) {
        for (const l of this.links) {
          const A = this.pts[l.a], B = this.pts[l.b];
          const dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, d = Math.hypot(dx, dy, dz) || 1e-4;
          const target = d > l.L * 1.4 ? l.L * 1.4 : G > 0 && d > l.L ? Math.min(d, l.L * (1 + G)) : l.L;
          let k = (d - target) / d * (d > l.L * 1.4 ? 0.5 : 0.45);
          if (d < target) k *= 0.2;                                  // cords are rope: they resist stretching, but buckle easily
          const wa = A.r === 0 ? 0 : B.r === 0 ? 2 : 1, wb = B.r === 0 ? 0 : A.r === 0 ? 2 : 1;
          A.x += dx * k * wa; A.y += dy * k * wa; A.z += dz * k * wa;
          B.x -= dx * k * wb; B.y -= dy * k * wb; B.z -= dz * k * wb;
        }
        if (it === 0 && this.react && this.react.cinch) for (const b of near) {
          if (b.vy > 40 || b.y > rimY - 2 || Math.hypot(b.x - this.x, b.z - this.z) > RIM_R) continue;    // descending through the net
          const cz = this.react.cinch;
          for (const p of this.pts) {
            if (p.r === 0 || Math.abs(p.y - b.y) > BALL_R + 5) continue;
            const hx = p.x - b.x, hz = p.z - b.z, hd = Math.hypot(hx, hz), m = BALL_R + 1.2;
            if (hd > m) { const k = (1 - m / hd) * 0.32 * cz; p.x -= hx * k; p.z -= hz * k; }
          }
        }
        for (const b of near) for (const p of this.pts) {           // ball contact: push out + drag with the ball
          if (p.r === 0) continue;
          const dx = p.x - b.x, dy = p.y - b.y, dz = p.z - b.z, d = Math.hypot(dx, dy, dz), m = BALL_R + 1.5;
          if (d < m && d > 1e-4) {
            const k = (m - d) / d; p.x += dx * k; p.y += dy * k; p.z += dz * k;
            if (it === 0) {
              const bvx = b.vx * sdt, bvy = b.vy * sdt, bvz = b.vz * sdt;
              const vx = p.x - p.px, vy = p.y - p.py, vz = p.z - p.pz;
              p.px = p.x - lerp(vx, bvx, drag); p.py = p.y - lerp(vy, bvy, drag); p.pz = p.z - lerp(vz, bvz, drag);
            }
          }
        }
      }
      for (let pass = 0; pass < 3; pass++) for (const l of this.links) {   // hard stretch cap (1.4x) after all pushes
        const A = this.pts[l.a], B = this.pts[l.b], dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, d = Math.hypot(dx, dy, dz) || 1e-4, mx = l.L * 1.4;
        if (d <= mx) continue;
        const k = (d - mx) / d, wa = A.r === 0 ? 0 : B.r === 0 ? 1 : 0.5, wb = B.r === 0 ? 0 : A.r === 0 ? 1 : 0.5;
        A.x += dx * k * wa; A.y += dy * k * wa; A.z += dz * k * wa; B.x -= dx * k * wb; B.y -= dy * k * wb; B.z -= dz * k * wb;
      }
    }
    // ball leaves the bottom of the net: the lower rows whip back up and sway
    const inNow = balls.some(b => Math.hypot(b.x - this.x, b.z - this.z) < RIM_R + 5 && b.y < rimY + 4 && b.y > bottom - 6);
    if (this.inside && !inNow && this.react) {
      const r = this.react;
      for (const p of this.pts) {
        if (p.r < 2) continue;
        const f = (p.r - 1) / (R - 1);
        p.py -= f * r.whip * 2.2 * rand(0.85, 1.15);                  // upward velocity (verlet: py below y)
        p.px -= r.sx * f * rand(0.7, 1.3); p.pz -= r.sz * f * rand(0.7, 1.3);
        if (r.flick && p.r === R - 1) p.py -= 3.2 * rand(0.8, 1.2);    // bottom flicks up and over for a moment
      }
      this.osc = { t: 0, dur: r.oscDur || 1.1, k: r.oscK || 0.01, kl: r.oscKl || 0.013, damp: r.oscDamp || 0.979 };
      this.react = null; this.settleT = Math.max(this.settleT, 0.2);
    }
    this.inside = inNow;
    // swish sound when the ball passes through the net, not when it crosses the rim
    if (this.sfx) {
      this.sfx.t -= dt;
      if (this.sfx.t <= 0 || balls.some(b => Math.hypot(b.x - this.x, b.z - this.z) < RIM_R + 4 && b.y < rimY - 3 && b.y > bottom - 12)) {
        if (Net.role !== 'guest') {
          const k = this.sfx.k != null ? this.sfx.k : 0.7;
          if (this.sfx.tick) SFX.rimTick(k);                              // rim-in: soft metallic tick, then the net
          SFX.netSwish(k, this.sfx.tick ? 0.035 : 0, this.sfxPitch || 1);
          if (this.sfx.green) SFX.greenMake(0.08);
        }
        this.sfx = null;
      }
    }
    // rest threshold: once everything is nearly still, stop the tiny oscillations
    if (!near.length && !this.caught && this.settleT <= 0 && !this.rest) {
      let mv = 0; for (const p of this.pts) mv = Math.max(mv, Math.abs(p.x - p.px) + Math.abs(p.y - p.py) + Math.abs(p.z - p.pz));
      if (mv < 0.012) { for (const p of this.pts) { p.px = p.x; p.py = p.y; p.pz = p.z; } this.rest = true; }
    }
  }
  // Reactions, each with small random variation. ax/az: direction the ball came from.
  kick(kind, s = 1, ax = 0, az = 0, extra = 0) {
    this.rest = false;
    // Contact feedback comes from the actual net/rim event, never a guessed pose.
    if (Game.t - (this.cueAt == null ? -99 : this.cueAt) > 0.12) {
      const cue = kind === 'rimhit' ? 'rim' : kind === 'swish' ? 'swish' : kind === 'dunk' ? (extra & 4 ? 'poster' : extra & 8 ? 'alley' : 'dunk') : null;
      if (cue) { FX.cue(cue, this.x + ax, RIM_Y + this.dy, this.z + az, kind === 'dunk' && !!(extra & 12)); this.cueAt = Game.t; }   // major: poster (4) or alley-oop (8) only
    }
    if (kind === 'swish' || kind === 'rimin' || kind === 'bank' || kind === 'dunk') hoopGlow(this, extra & 2 ? 'fire' : extra & 1 && kind !== 'dunk' ? 'green' : 'gold', !!(extra & 4));
    const each = fn => { for (const p of this.pts) if (p.r > 0) fn(p, p.r / (this.R - 1)); };
    // entry: speed of the ball as it drops in (scales everything) and how far off-center it came in
    const spd = Math.hypot(ball.vx || 0, ball.vy || 0, ball.vz || 0), sk = clamp((spd - 140) / 420, 0.2, 1.35);
    const ox = ax || (ball.x - this.x), oz = az || (ball.z - this.z), off = Math.hypot(ox, oz), ux = off > 0.5 ? ox / off : 0, uz = off > 0.5 ? oz / off : 0, offK = clamp(off / RIM_R, 0, 1);
    const pullIn = (amt) => each((p, f) => { p.px -= ux * amt * f; p.pz -= uz * amt * f; });      // net pulled toward the entry side
    const v = () => rand(0.85, 1.15);
    if (kind === 'swish') {                       // clean: tight cinch, snappy whip, quick settle
      this.react = { whip: (0.55 + 0.75 * sk) * v(), drag: rand(0.62, 0.72), cinch: 1, sx: -ux * offK * 1.1 * v() + rand(-0.15, 0.15), sz: -uz * offK * 1.1 * v() + rand(-0.15, 0.15),
        flick: sk > 0.9 && chance(0.18), give: (0.14 + 0.1 * sk) * v(), oscK: 0.012 + 0.004 * sk, oscKl: 0.014 + 0.003 * sk, oscDamp: 0.98 - 0.006 * sk, oscDur: 1.0 - 0.12 * Math.min(1, sk) };
      pullIn(0.5 * offK * sk);
      this.sfx = { t: 0.3, green: !!(extra & 1), k: sk };
    } else if (kind === 'rimin') {                // touched the rim: looser, lopsided, longer sway toward the entry side and back
      const k = rand(1.0, 1.6) * (0.6 + 0.4 * sk);
      this.react = { whip: (0.3 + 0.35 * sk) * v(), drag: 0.34, cinch: 0.5, sx: -ux * k, sz: -uz * k, flick: false, give: (0.07 + 0.06 * sk) * v(), oscK: 0.009, oscKl: 0.011, oscDamp: 0.981, oscDur: 1.15 };
      pullIn((0.9 + 0.4 * offK) * (0.5 + 0.5 * sk));
      each((p, f) => { p.px += rand(-0.25, 0.25) * f; p.pz += rand(-0.25, 0.25) * f; });       // a little mess
      this.sfx = { t: 0.3, green: !!(extra & 1), k: sk * 0.8, tick: true };
    } else if (kind === 'bank') {                 // off the glass: sideways swing from the board
      this.react = { whip: (0.5 + 0.4 * sk) * v(), drag: 0.5, cinch: 0.8, sx: this.dir * rand(1.1, 1.8), sz: rand(-0.6, 0.6), flick: false, give: (0.1 + 0.07 * sk) * v(), oscK: 0.011, oscKl: 0.013, oscDamp: 0.979, oscDur: 1.05 };
      each((p, f) => { p.px -= this.dir * 1.1 * f * (0.6 + 0.4 * sk); });
      this.sfx = { t: 0.3, green: !!(extra & 1), k: sk * 0.9 };
    } else if (kind === 'dunk' || kind === 'stretch') {
      this.react = { whip: rand(0.8, 1.2), drag: 0.75, cinch: 1.2, sx: rand(-0.4, 0.4), sz: rand(-0.4, 0.4), flick: false, give: rand(0.22, 0.28), oscK: 0.012, oscKl: 0.013, oscDamp: 0.979, oscDur: 1.15 };
      each((p, f) => { p.py += 9 * s * f * rand(0.85, 1.15); p.px -= p.ox * 0.06 * s; p.pz -= p.oz * 0.06 * s; });
      this.settleT = 1.3;
      if ((extra & 1) && chance(0.05)) { this.caught = { t: rand(1, 2) }; if (isMine(M.lastDunker)) Ach.unlock('net_catch'); }   // rarely the net catches on the rim
    } else if (kind === 'rimhit') {               // rim contact: a ripple through the top rows, starting where the ball hit
      const a0 = Math.atan2(oz, ox);
      each((p, f) => {
        if (p.r > 3) return;
        const a = p.c / this.C * Math.PI * 2, near = Math.max(0, Math.cos(a - a0)), w = (1 - (p.r - 1) / 3) * s;
        p.py += (0.9 * near + 0.25) * w * rand(0.8, 1.2); p.px -= Math.cos(a) * 0.45 * near * w; p.pz -= Math.sin(a) * 0.45 * near * w;
      });
    } else if (kind === 'ripple') each((p, f) => { p.px += rand(-0.5, 0.5) * s; p.pz += rand(-0.5, 0.5) * s; p.py += rand(-0.2, 0.4) * s * f; });
  }
}
const hoops = HOOP_DEFS.map((d, i) => new Hoop(d, i));
// Half-court games (gym drills, 1v1) send both teams at the same basket.
const attackHoop = t => M.halfCourt ? hoops[1] : hoops[1 - t];
const defendHoop = t => M.halfCourt ? hoops[1] : hoops[t];
// Per-team AI config: career stages give each side its own level.
function aiCfg(team) { return (M.aiCfg && M.aiCfg[team]) || DIFF[SETTINGS.difficulty]; }
function isThree(x, z, h) { const dx = Math.abs(x - h.x), dz = Math.abs(z - h.z); return Math.hypot(dx, dz) >= THREE_R || (dz >= 300 && dx < 150); }

// Gravity (Low Gravity fun mode) and jump apex used by shot timing.
function grav() { return M.fun && M.fun.lowGrav ? GRAV * 0.55 : GRAV; }
function apexT(p) { return ((p && p.jumpVy) || JUMP_VY) / grav(); }
// ================================================================== BALL
const ball = { x: 660, y: 100, z: 350, vx: 0, vy: 0, vz: 0, px: 660, py: 100, pz: 350, state: 'loose', owner: null,
  rot: 0, spin: 0, shot: null, pass: null, lastTouch: null, grabLock: 0, behind: false, lastPasser: null, lastPassT: -9, fire: false };

function updateBall(dt) {
  if (ball.owner) return;
  ball.grabLock -= dt;
  ball.px = ball.x; ball.py = ball.y; ball.pz = ball.z;
  ball.vy -= grav() * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
  ball.rot += ball.spin * dt;
  for (const h of hoops) collideHoop(h);
  if (ball.y < BALL_R) {
    ball.y = BALL_R;
    if (ball.vy < -40) {
      const v = -ball.vy; SFX.bounce(clamp(v / 700, 0.15, 1));
      ball.vy = v * 0.62; ball.vx *= 0.86; ball.vz *= 0.86; ball.spin = ball.vx * 0.06;
      if (v > 200) FX.dust(ball.x, ball.z, 3);
    } else { ball.vy = 0; ball.vx *= 0.94; ball.vz *= 0.94; ball.spin = ball.vx * 0.12; }
    if (ball.state === 'scored' && M.practice && M.practice.kind !== '1v1') ball.state = 'loose';
    onBallFloor();
  }
  if (ball.x < -70) { ball.x = -70; ball.vx = Math.abs(ball.vx) * 0.5; }
  if (ball.x > COURT.L + 70) { ball.x = COURT.L + 70; ball.vx = -Math.abs(ball.vx) * 0.5; }
  if (ball.z < 6) { ball.z = 6; ball.vz = Math.abs(ball.vz) * 0.5; }
  if (ball.z > COURT.D - 6) { ball.z = COURT.D - 6; ball.vz = -Math.abs(ball.vz) * 0.5; }
  if (ball.state === 'shot' || ball.state === 'loose') checkScore();
  if (ball.state === 'shot') {
    ball.shot.t += dt;
    if (ball.shot.touched || (ball.vy < 0 && ball.y < RIM_Y - 30)) ball.state = 'loose';
  } else if (ball.state === 'pass') updatePassFlight(dt);
}
function onBallFloor() {
  if (ball.state === 'scored') return;
  if (ball.shot) ball.shot = null;
  if (ball.state === 'shot') ball.state = 'loose';
  if (ball.state === 'pass' && ball.pass.t > 0.05) {
    if (ball.pass.kind === 'bounce' && !ball.pass.bounced) { ball.pass.bounced = true; FX.dust(ball.x, ball.z, 2); }
    else ball.state = 'loose';
  }
}
function rimTouched() {
  if (ball.shot) { ball.shot.touched = true; ball.shot.clean = false; if (M.phase === 'live') M.shotClock = scReset(); }
}
function collideHoop(h) {
  const ry = RIM_Y + h.dy;
  const clean = ball.state === 'shot' && ball.shot && ball.shot.clean && ball.shot.hoop === h;
  if (!clean) {
    const rx = ball.x - h.x, rz = ball.z - h.z, hd = Math.hypot(rx, rz);
    if (hd < RIM_R + BALL_R + 3 && Math.abs(ball.y - ry) < BALL_R + 3) {
      const ux = hd > 1e-3 ? rx / hd : 1, uz = hd > 1e-3 ? rz / hd : 0;
      const cx = h.x + ux * RIM_R, cz = h.z + uz * RIM_R;
      const dx = ball.x - cx, dy = ball.y - ry, dz = ball.z - cz, d = Math.hypot(dx, dy, dz) || 1e-4, m = BALL_R + 1.3;
      if (d < m) {
        const nx = dx / d, ny = dy / d, nz = dz / d;
        ball.x = cx + nx * m; ball.y = ry + ny * m; ball.z = cz + nz * m;
        const vn = ball.vx * nx + ball.vy * ny + ball.vz * nz;
        if (vn < 0) {
          ball.vx -= 1.55 * vn * nx; ball.vy -= 1.55 * vn * ny; ball.vz -= 1.55 * vn * nz;
          ball.vx += rand(-14, 14); ball.vz += rand(-14, 14);
          if (-vn > 50) { SFX.clank(clamp(-vn / 500, 0.3, 1)); h.vy -= -vn * 0.05; h.kick('rimhit', clamp(-vn / 420, 0.2, 1.4), ball.x - h.x, ball.z - h.z); rimTouched(); ball.spin *= -0.5; }
        }
      }
    }
  }
  const side = (ball.x - h.bbx) * h.dir;
  if (side < BALL_R && side > -12 && Math.abs(ball.z - h.z) < 46 && ball.y > RIM_Y - 14 && ball.y < RIM_Y + 56 && ball.vx * h.dir < 0) {
    ball.x = h.bbx + h.dir * BALL_R; ball.vx = -ball.vx * 0.55;
    if (Math.abs(ball.vx) > 40) { SFX.board(); FX.cue('glass', ball.x, ball.y, ball.z); if (ball.shot) ball.shot.bank = true; rimTouched(); h.vy -= 10; }
  }
}
function checkScore() {
  for (const h of hoops) {
    const ry = RIM_Y + h.dy;
    if (ball.py >= ry && ball.y < ry && ball.vy < 0 && Math.hypot(ball.x - h.x, ball.z - h.z) < RIM_R) { onScore(h); return; }
  }
}
function updatePassFlight(dt) {
  const pa = ball.pass; pa.t += dt;
  const to = pa.to;
  if (to && to.state !== 'down') {
    const hy = to.y + (to.state === 'dunk' ? 100 : 55);
    if (Math.hypot(ball.x - to.x, ball.y - hy, ball.z - to.z) < (pa.alley ? 44 : 34)) { catchPass(to, pa); return; }
  }
  pa.lane = pa.lane || new Set();
  if (passLaneCheck(pa)) return;      // defenders near the passing lane can pick it off or tip it
  if (pa.t > pa.T + 0.6) ball.state = 'loose';
}
function catchPass(to, pa) {
  const from = pa.from;
  giveBall(to, 'pass');
  ball.lastPasser = from; ball.lastPassT = M.time;
  if (pa.alley && to.state === 'dunk') to.stats.fga++;
}
// Possession transfer (catch, rebound, steal, inbound)
function giveBall(p, how) {
  const prev = M.possTeam, fromShot = !!ball.shot;
  ball.owner = p; ball.state = 'held'; ball.pass = null; ball.vx = ball.vy = ball.vz = 0;
  if (fromShot && how !== 'inbound') { p.stats.reb++; ball.shot = null; if (M.phase === 'live') M.shotClock = scReset(); }
  ball.shot = null;
  if (p.team !== prev) {
    // half court: a change of possession inside the arc must be taken back out
    if (M.halfCourt && M.mustClear && how !== 'inbound') M.mustClear[p.team] = dxz(p, hoops[1]) < THREE_R + 10;
    M.possTeam = p.team; M.shotClock = scReset(); ball.lastPasser = null;
    for (const q of M.players) q.ai.t = Math.min(q.ai.t, 0.05);
    if (how === 'steal') { p.stats.stl++; addHifz(p, 25); SFX.swipe(); if (M.fun && M.fun.uncle && chance(0.3)) uncleTalk(); }
  }
  if (M.phase === 'tip') { M.phase = 'live'; }
  p.holdT = 0; p.move = null; p.dh = 'n';
  ball.fire = p.fire;
}
function fumble(t) {
  const y0 = ball.owner === t && t.ctlY != null ? t.ctlY : ball.y;   // held: the control point's height (see attachBall)
  ball.owner = null; ball.state = 'loose'; ball.shot = null; ball.pass = null;
  ball.x = t.x; ball.z = t.z; ball.y = Math.max(y0, 40);
  ball.vx = rand(-150, 150); ball.vy = rand(150, 280); ball.vz = rand(-150, 150); ball.grabLock = 0.3; ball.lastTouch = t;
}

