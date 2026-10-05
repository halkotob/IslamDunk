// ================================================= v3.9: SKILL + TOUCH
// Crossover move, fatigue, charges, pass-lane risk, contested green windows,
// and a proper touch-control overlay (landscape and portrait).

// ------------------------------------------------------------- crossover
const CROSS_T = 0.34, CROSS_CD = 1.5;
// Dedicated crossover: the ball crosses hand to hand with a body lean, a short
// burst of separation, and a chance to wrong-foot a close defender. Cooldown
// keeps it from being spammed.
function startCross(p) {
  if (ball.owner !== p || p.state !== 'free' || (p.cd.cross || 0) > 0) return false;
  const h = attackHoop(p.team), dx = h.x - p.x, dz = h.z - p.z, d = Math.hypot(dx, dz) || 1, fx = dx / d, fz = dz / d;
  const side = p.crossSide = -(p.crossSide || 1);
  p.move = null; startMove(p, 'xover');
  p.cd.cross = CROSS_CD; p.crossT = CROSS_T;
  p.crossV = { x: -fz * side * 165 + fx * 70, z: fx * side * 165 + fz * 70 };
  for (const o of p.opps) {                                     // wrong-foot a close defender
    if (o.state !== 'free' || dxz(o, p) > 70) continue;
    const odds = 0.3 + (p.st.spd - o.st.def) * 0.035 + (o.fat || 0) * 0.1;          // tired defenders bite more
    if (chance(clamp(odds, 0.12, 0.55))) { AchEvents.ankles(p); o.shook = 0.4; o.shookDir = { x: -p.crossV.x / 165, z: -p.crossV.z / 165 }; }
  }
  return true;
}
// per-step effects (called from updatePlayer after the velocity step)
function crossStep(p, dt) {
  if (p.crossT > 0) {
    p.crossT -= dt; const k = Math.sin(Math.PI * clamp(p.crossT / CROSS_T, 0, 1));
    p.x += p.crossV.x * k * dt; p.z = clamp(p.z + p.crossV.z * k * dt, 6, COURT.D - 6);
    p.leanX = p.crossSide * k;
  } else p.leanX = (p.leanX || 0) * Math.max(0, 1 - dt * 10);
  if (p.shook > 0) {                                            // defender caught leaning the wrong way
    p.shook -= dt; p.x += p.shookDir.x * 60 * dt; p.z = clamp(p.z + p.shookDir.z * 60 * dt, 6, COURT.D - 6);
  }
  if (p.cd.cross > 0) p.cd.cross -= dt;
  if (p.cd.sig > 0) p.cd.sig -= dt;
}

// ------------------------------------------------------------- fatigue
// Heavy turbo use builds fatigue; above a threshold top speed dips a little
// (at most 9%) until the player recovers. Visible as harder breathing.
function fatigueStep(p, dt) {
  const moving = Math.hypot(p.vx || 0, p.vz || 0) > 40, turbo = p.cmd.turbo && moving && p.turboOK && p.turboOK();
  p.fat = clamp((p.fat || 0) + (turbo ? 0.2 : moving ? -0.035 : -0.09) * dt, 0, 1);   // ~3.5s of straight turbo to get winded
}
function fatigueMul(p) { const f = p.fat || 0; return f > 0.55 ? 1 - 0.09 * (f - 0.55) / 0.45 : 1; }

// ------------------------------------------------------------- charge
// A defender who is set (still, feet on the floor) in the driving lane can
// draw an offensive foul from a hard drive into his chest.
function chargeCheck(dt) {
  if (M.phase !== 'live' || M.practice || (M.chargeCd = (M.chargeCd || 0) - dt) > 0) return;
  for (const p of M.players) {
    const still = p.state === 'free' && p.y < 1 && Math.hypot(p.vx || 0, p.vz || 0) < (p.stance ? 60 : 28);
    p.setT = still ? (p.setT || 0) + dt : 0;
  }
  const h = ball.owner; if (!h || h.state !== 'free' || h.y > 1) return;
  const sp = Math.hypot(h.vx, h.vz); if (sp < 215) return;
  const hp = attackHoop(h.team);
  for (const o of h.opps) {
    if (o.setT < 0.35 || dxz(o, h) > 32) continue;                     // bodies meet (collision keeps them ~28 apart)
    const toO = { x: o.x - h.x, z: o.z - h.z }, d = Math.hypot(toO.x, toO.z) || 1;
    const headOn = (h.vx * toO.x + h.vz * toO.z) / (sp * d);           // driving straight into him
    if (headOn < 0.75 || dxz(o, hp) > dxz(h, hp)) continue;           // he must be between the driver and the rim
    M.chargeCd = 5;
    if (!chance(0.6 * (1 + 0.08 * (st7(o, 'hus') - 5)) * (o.v7 && o.v7.plant > 0 ? 1.3 : 1))) return;   // a planted defender draws it more often            // hustle players draw more charges
    AchEvents.charge(o); react(h, 'headDown', 1.0);
    SFX.whistle(); FX.callout('CHARGE!', '#8fe3ff', 'OFFENSIVE FOUL', true);
    o.stats.chg = (o.stats.chg || 0) + 1;
    knockDownSoft(o, h); h.streak = 0;
    fumble(h); ball.vx = ball.vz = 0; ball.grabLock = 5;
    M.phase = 'dead'; M.deadT = 1.1; M.nextInbound = o.team;
    SFX.cheer(0.8, 0.2);
    return;
  }
}
function knockDownSoft(o, h) { o.state = 'down'; o.st_t = 0; o.fallDir = sgn(o.x - h.x) || 1; o.vx = o.vz = 0; }

// ------------------------------------------------------------- pass lanes
// Passing through traffic is a real risk: a defender near the ball's path
// has a chance to pick it off or tip it loose, based on how close he is to
// the lane, his steal rating and the passer's passing.
function passLaneCheck(pa) {
  pa.near = pa.near || new Map();
  for (const o of M.players) {
    if (o.team === pa.from.team || o.state === 'down' || pa.lane.has(o)) continue;
    const d = Math.hypot(ball.x - o.x, ball.z - o.z), reach = o.y + (o.state === 'jump' ? 108 : 76);
    const inBand = d <= 46 && ball.y <= reach + 10 && ball.y >= o.y + 12;
    const prev = pa.near.get(o);
    if (inBand && (prev == null || d < prev) && d > 10) { pa.near.set(o, d); continue; }      // still closing in
    if (prev == null && !(inBand && d <= 10)) continue;
    // resolve at the closest approach (or right away if the ball is in his hands' reach)
    const dMin = inBand && d <= 10 ? d : prev;
    pa.lane.add(o); pa.tried.add(o);
    const pas = pa.from.st.pas != null ? pa.from.st.pas : 5, close = clamp(1 - (dMin - 8) / 38, 0, 1);
    const pick = (0.1 + o.st.stl * 0.028) * (1.3 - pas * 0.06) * close * close * (pa.lob ? 0.55 : 1) * (1 - 0.35 * (pa.chemK || 0));
    const r = Math.random();
    if (r < pick) { giveBall(o, 'steal'); react(pa.from, 'headDown', 0.9); FX.callout('PICKED OFF!', '#8fe3ff', 'READ THE PASS'); SFX.snatch(1); SFX.cheer(0.8, 0.15); return true; }
    if (r < pick * 1.6) {                                          // tipped: the ball pops loose
      ball.state = 'loose'; ball.pass = null; ball.vx = (ball.vx || 0) * 0.3 + rand(-80, 80); ball.vz = (ball.vz || 0) * 0.3 + rand(-80, 80); ball.vy = 150; ball.grabLock = 0.15;
      FX.pop(o.x, o.y + 120, o.z, 'TIPPED', '#8fe3ff'); SFX.snatch(0.6); return true;
    }
  }
  return false;
}

// ------------------------------------------------------------- contest
// The green window itself shrinks with defensive pressure (on top of the
// lower make-chance for contested greens): under 40% size with a hand in the
// shooter's face, about 60% at arm's length, full size when open.
function contestK(p, x = p.x, z = p.z) {
  let k = 1;
  for (const o of p.opps) {
    if (o.state === 'down') continue;
    const d = Math.hypot(o.x - x, o.z - z) * (o.stance ? 0.8 : 1), air = o.y > 20 ? 0.85 : 1;   // v6: stance = hands up
    const c = d < 25 ? 0.38 : d < 60 ? 0.38 + (d - 25) / 35 * 0.24 : d < 110 ? 0.62 + (d - 60) / 50 * 0.38 : 1;
    k = Math.min(k, c * (d < 90 ? air : 1));
  }
  return k;
}

// ------------------------------------------------------------- touch overlay
// HTML controls over (landscape) or below (portrait) the canvas: a drag stick
// on the left, action buttons on the right. Labels follow the situation
// (PASS/SHOOT on offense, STEAL/BLOCK on defense). Shown automatically on
// touch devices during play; hidden as soon as a keyboard or controller is used.
const TouchUI = {
  el: null, btns: {}, stickEl: null, knob: null, portrait: false, shown: false, sid: null, ox: 0, oy: 0,
  init() {
    if (this.el || typeof document === 'undefined' || !document.body) return;
    const css = document.createElement('style');
    css.textContent = `#tui{position:fixed;inset:0;pointer-events:none;z-index:5;display:none;font-family:${FONT};user-select:none;-webkit-user-select:none;touch-action:none}
#tui .zone{position:absolute;left:0;bottom:0;pointer-events:auto;touch-action:none}
#tui .base{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.45);background:rgba(255,255,255,.07)}
#tui .knob{position:absolute;border-radius:50%;background:rgba(255,255,255,.4)}
#tui .b{position:absolute;border-radius:50%;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;flex-direction:column;
color:#fff;background:rgba(12,20,30,.55);border:2px solid rgba(255,255,255,.55);font-size:13px;letter-spacing:.5px;text-shadow:0 1px 2px #000;transition:background .08s,opacity .15s}
#tui .b.on{background:rgba(232,195,90,.75);color:#1a1206}
#tui .b.hint{border-color:#8fe3ff;box-shadow:0 0 12px rgba(143,227,255,.6)}
#tui .b.cd{opacity:.45}
#tui .b small{font-size:9px;opacity:.8;margin-top:2px}`;
    document.head.appendChild(css);
    const el = this.el = document.createElement('div'); el.id = 'tui';
    const zone = this.zone = document.createElement('div'); zone.className = 'zone'; el.appendChild(zone);
    this.stickEl = document.createElement('div'); this.stickEl.className = 'base'; zone.appendChild(this.stickEl);
    this.knob = document.createElement('div'); this.knob.className = 'knob'; zone.appendChild(this.knob);
    for (const [id, key, label] of [['shoot', 'KeyK', 'SHOOT'], ['pass', 'KeyJ', 'PASS'], ['turbo', 'KeyL', 'TURBO'], ['cross', 'KeyH', 'CROSS'], ['skill', 'KeyI', 'SKILL']]) {
      const b = document.createElement('div'); b.className = 'b'; b.innerHTML = `<span>${label}</span>`; b.dataset.key = key;
      const down = e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); Input.down[key] = true; Input.pressed[key] = true; b.classList.add('on'); Input.touchMode = true; };
      const up = e => { e.preventDefault(); if (Input.down[key]) Input.released[key] = true; Input.down[key] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      el.appendChild(b); this.btns[id] = b;
    }
    const sd = e => { e.preventDefault(); if (this.sid != null) return; this.sid = e.pointerId; zone.setPointerCapture && zone.setPointerCapture(e.pointerId); this.ox = e.clientX; this.oy = e.clientY; this.moveStick(e); };
    const sm = e => { if (e.pointerId === this.sid) { e.preventDefault(); this.moveStick(e); } };
    const su = e => { if (e.pointerId === this.sid) { this.sid = null; Input.stick.ax = 0; Input.stick.az = 0; this.drawStick(); } };
    zone.addEventListener('pointerdown', sd); zone.addEventListener('pointermove', sm); zone.addEventListener('pointerup', su); zone.addEventListener('pointercancel', su);
    document.body.appendChild(el);
    addEventListener('keydown', e => { if (SIM_KEYS.has(e.code)) { Input.touchMode = false; } });     // a keyboard is in use
    addEventListener('gamepadconnected', () => { Input.touchMode = false; });
    this.layout(); addEventListener('resize', () => this.layout());
  },
  R() { return this.portrait ? 64 : 56; },
  moveStick(e) {
    const R = this.R(); let dx = e.clientX - this.ox, dy = e.clientY - this.oy; const L = Math.hypot(dx, dy);
    if (L > R) { this.ox += dx * (1 - R / L); this.oy += dy * (1 - R / L); dx = e.clientX - this.ox; dy = e.clientY - this.oy; }   // base follows the thumb
    const dead = 0.14 * R, k = L < dead ? 0 : 1;
    Input.stick.ax = k * dx / R; Input.stick.az = k * dy / R; Input.touchMode = true; this.drawStick();
  },
  drawStick() {
    const R = this.R(), r = this.zone.getBoundingClientRect(), active = this.sid != null;
    const cx = active ? this.ox - r.left : this.homeX, cy = active ? this.oy - r.top : this.homeY;
    Object.assign(this.stickEl.style, { left: cx - R + 'px', top: cy - R + 'px', width: R * 2 + 'px', height: R * 2 + 'px', opacity: active ? 1 : 0.55 });
    const kr = R * 0.42, kx = cx + (active ? Input.stick.ax * R : 0), ky = cy + (active ? Input.stick.az * R : 0);
    Object.assign(this.knob.style, { left: kx - kr + 'px', top: ky - kr + 'px', width: kr * 2 + 'px', height: kr * 2 + 'px', opacity: active ? 1 : 0.55 });
  },
  layout() {
    if (!this.el) return;
    const vw = innerWidth, vh = innerHeight;
    this.portrait = vh > vw;
    document.body.style.justifyContent = this.portrait && this.shown ? 'flex-start' : 'center';   // portrait: game on top, controls below
    const cv = canvas.getBoundingClientRect();
    // portrait: controls live in the space below the game; landscape: bottom corners, clear of the HUD
    const top = this.portrait ? Math.max(cv.bottom + 8, vh * 0.45) : vh * 0.42, zoneH = vh - top;
    Object.assign(this.zone.style, { top: top + 'px', height: zoneH + 'px', width: (this.portrait ? vw * 0.5 : vw * 0.42) + 'px' });
    const R = this.R(); this.homeX = R + (this.portrait ? 34 : 28); this.homeY = zoneH - R - (this.portrait ? 44 : 26);
    const s = this.portrait ? 1.18 : 1, pad = this.portrait ? 26 : 18, bot = this.portrait ? 38 : 16;
    const place = (b, size, right, bottom) => Object.assign(b.style, { width: size * s + 'px', height: size * s + 'px', right: right * s + pad + 'px', bottom: bottom * s + bot + 'px', fontSize: (size > 70 ? 15 : 12) * s + 'px' });
    place(this.btns.shoot, 88, 0, 0); place(this.btns.pass, 70, 100, 6); place(this.btns.turbo, 62, 12, 100); place(this.btns.cross, 62, 96, 96); place(this.btns.skill, 56, 186, 70);
    this.drawStick();
  },
  last: '',
  update() {
    if (!this.el) { if (typeof document !== 'undefined' && document.body) this.init(); else return; }
    const room = Game.screen === 'musalla' && Game.mus && !Game.mus.talk && !Gym.overlay;
    const want = Input.touchMode && (Game.screen === 'play' || Game.screen === 'netplay' || Game.screen === 'gym' || room) && !Game.paused && !Game.trivia && !(M.mini && M.mini.done) && !M.attract && !(Game.screen === 'gym' && (Gym.overlay || Gym.result || Gym.fade));
    if (want !== this.shown) { this.shown = want; this.el.style.display = want ? 'block' : 'none'; if (want) this.layout(); else { Input.stick.ax = Input.stick.az = 0; this.sid = null; } }
    if (!want) return;
    // musalla: walk + TALK only
    for (const k of ['pass', 'turbo', 'cross', 'skill']) this.btns[k].style.display = room ? 'none' : '';
    if (room) { if (this.last !== 'room') { this.last = 'room'; this.btns.shoot.firstChild.textContent = 'TALK'; this.btns.shoot.classList.toggle('hint', !!Game.mus.near); } else this.btns.shoot.classList.toggle('hint', !!Game.mus.near); return; }
    // contextual labels
    const me = M.players && M.players.find(p => p.human === 0); if (!me) return;
    const bo = ball.owner, offense = bo ? bo.team === me.team : (ball.pass && ball.pass.from.team === me.team);
    let pass = 'PASS', shoot = 'SHOOT', hintP = false, hintS = false;
    if (!offense) {
      pass = 'STEAL'; shoot = 'BLOCK';
      if (bo && dxz(bo, me) < 70) hintP = true;                                        // close to the handler: steal
      if ((bo && (bo.state === 'windup' || bo.state === 'shoot' || bo.state === 'dunk')) || (ball.state === 'shot' && dxz(ball, me) < 120)) hintS = true;   // contest
    } else if (bo && bo !== me) { pass = 'CALL'; shoot = 'JUMP'; }
    const cross = bo === me ? ((me.cd.cross || 0) > 0 ? 'cd' : 'ok') : 'off';
    const key = pass + shoot + hintP + hintS + cross + this.portrait;
    if (key !== this.last) {
      this.last = key;
      this.btns.pass.firstChild.textContent = pass; this.btns.shoot.firstChild.textContent = shoot;
      this.btns.pass.classList.toggle('hint', hintP); this.btns.shoot.classList.toggle('hint', hintS);
      this.btns.cross.classList.toggle('cd', cross !== 'ok');
    }
    const sk = bo === me && sigAvailable(me); this.btns.skill.classList.toggle('hint', sk); this.btns.skill.classList.toggle('cd', !sk);
  }
};

// ------------------------------------------------------------- callout color guard
// Callout text is drawn with a dark outline, so the fill must be light: an
// invalid color falls back to gold, and a dark one is lightened until its
// luminance is high enough to read on every venue.
function readableCallColor(c) {
  const m = typeof c === 'string' && c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return '#ffd76a';
  let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join('');
  let r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = (r, g, b) => { const f = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let n = 0;
  while (lum(r, g, b) < 0.4 && n++ < 12) { r += (1 - r) * 0.2; g += (1 - g) * 0.2; b += (1 - b) * 0.2; }
  const to = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

