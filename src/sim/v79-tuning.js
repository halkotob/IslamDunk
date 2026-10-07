
// ================================================= v7.9: FEEL + FAIRNESS PASS
// Faster base speed with a bigger sprint, sprint on Shift (keyboard) or a deliberate push past
// the touch stick's edge, CPU stamina that runs out like yours, walls the ball bounces off and
// players can't walk into, and restarts that never hand the ball over with a defender on top of it.

// ---- speed: everyone a bit quicker, sprint a bigger step up from that
const SPEED_BASE = 1.08, SPRINT_K = 1.5 / 1.42;      // jog +8%, sprint x1.5 of the jog (was x1.42)
{
  const _spd = Player.prototype.speed;
  Player.prototype.speed = function () { let s = _spd.call(this) * SPEED_BASE; if (this.cmd.turbo && this.turboOK()) s *= SPRINT_K; return s; };
}

// ---- stamina, same rule for everyone: run the bar dry and you're winded until it's back to 45%.
// While winded you can't sprint, and the bar refills even if you keep holding sprint (it used to
// refill only with the button released, so holding it pinned you at zero while the CPU, which lets
// go, sprinted about twice as often). The CPU check also runs in its brain so its plans see it.
const WIND_LO = 12, WIND_HI = 45;
function windCheck(p) {
  if (p.fire) { p.winded = false; return; }
  if (p.turbo < WIND_LO && p.cmd.turbo) p.winded = true; else if (p.turbo > WIND_HI) p.winded = false;
  if (p.winded) p.cmd.turbo = false;
}
{
  const _bu = Brain.prototype.update;
  Brain.prototype.update = function () { const r = _bu.apply(this, arguments); if (this.p.human < 0) windCheck(this.p); return r; };
}

// ---- sprint input: hold Shift while moving (left Shift for player 1, right Shift for player 2,
// either when you're alone), or on touch push the stick on past its ring
const SPRINT_KEYS = [['ShiftLeft'], ['ShiftRight']];
sprintStep = function (pad, c) {
  const d = Input.down, b = BINDS[pad], solo = !(M.players && M.players.some(p => p.human === 1));
  const shift = SPRINT_KEYS[pad].some(k => d[k]) || (pad === 0 && solo && d.ShiftRight);
  const dir = ['up', 'down', 'left', 'right'].some(k => b[k].some(x => d[x]));
  const stick = pad === 0 && Input.touchMode && TouchUI.sid != null && !!Input.stick.deep;
  c.turbo = !!(shift && dir) || stick;
};
// touch: the base only follows the thumb past 1.5x its radius, so between the ring (full speed)
// and 1.3x the ring there's room to move flat out without sprinting; past 1.3x you sprint
{
  TouchUI.moveStick = function (e) {
    const R = this.R(), RM = R * 1.5; let dx = e.clientX - this.ox, dy = e.clientY - this.oy; const L = Math.hypot(dx, dy);
    if (L > RM) { this.ox += dx * (1 - RM / L); this.oy += dy * (1 - RM / L); dx = e.clientX - this.ox; dy = e.clientY - this.oy; }
    const L2 = Math.hypot(dx, dy), k = L2 < 0.14 * R ? 0 : Math.min(1, L2 / R) / (L2 || 1);
    Input.stick.ax = dx * k; Input.stick.az = dy * k; Input.stick.deep = L2 >= R * 1.3;
    this.raw = [dx, dy]; Input.touchMode = true; this.drawStick();
  };
  const _ds = TouchUI.drawStick;
  TouchUI.drawStick = function () {
    _ds.apply(this, arguments);
    const R = this.R(), active = this.sid != null, deep = active && Input.stick.deep;
    if (!active) Input.stick.deep = false;
    if (!this.ring) { this.ring = document.createElement('div'); this.ring.style.cssText = 'position:absolute;border-radius:50%;border:2px dashed rgba(143,227,255,.5);pointer-events:none'; this.zone.insertBefore(this.ring, this.knob); }
    const r = this.zone.getBoundingClientRect(), cx = active ? this.ox - r.left : this.homeX, cy = active ? this.oy - r.top : this.homeY, RR = R * 1.3;
    Object.assign(this.ring.style, { left: cx - RR + 'px', top: cy - RR + 'px', width: RR * 2 + 'px', height: RR * 2 + 'px', display: active ? 'block' : 'none', borderColor: deep ? 'rgba(143,227,255,.95)' : 'rgba(143,227,255,.4)' });
    if (active && this.raw) {                                         // the knob follows the thumb into the sprint band
      const [dx, dy] = this.raw, L = Math.hypot(dx, dy), m = Math.min(L, R * 1.5) / (L || 1), kr = R * 0.42;
      Object.assign(this.knob.style, { left: cx + dx * m - kr + 'px', top: cy + dy * m - kr + 'px' });
    }
    Object.assign(this.knob.style, { background: deep ? 'rgba(143,227,255,.85)' : '', boxShadow: deep ? '0 0 16px rgba(143,227,255,.9)' : '' });
  };
}
// touch controls on the walk outside the masjid (career intro): stick + TALK
{
  const _tu = TouchUI.update;
  TouchUI.update = function () {
    if (Game.screen !== 'introout') return _tu.apply(this, arguments);
    if (!this.el) { _tu.apply(this, arguments); if (!this.el) return; }
    const want = Input.touchMode && typeof INTRO !== 'undefined' && INTRO && !INTRO.fadeDir;
    if (want !== this.shown) { this.shown = want; this.el.style.display = want ? 'block' : 'none'; if (want) this.layout(); else { Input.stick.ax = Input.stick.az = 0; this.sid = null; } }
    if (!want) return;
    for (const k of ['pass', 'turbo', 'cross', 'skill']) this.btns[k].style.display = 'none';
    this.btns.shoot.style.display = ''; this.btns.shoot.innerHTML = '<span>TALK</span>';
    this.btns.shoot.classList.toggle('hint', !!INTRO.talk);
    this.last = ''; this.v7key = null; this.v6last = null;           // relabel properly once play starts
  };
}

// ---- walls: players stop at the baselines (no walking into the end walls) and a loose ball
// bounces off the walls and the near sideline back toward the court instead of leaving the frame
const WALL_X0 = 2, WALL_X1 = COURT.L - 2, BALL_X0 = -8, BALL_X1 = COURT.L + 8, BALL_Z1 = COURT.D - 12, WALL_E = 0.55;
{
  const _up = updatePlayer;
  updatePlayer = function (p) {
    windCheck(p);
    const r = _up.apply(this, arguments);
    if (p.x < WALL_X0) { p.x = WALL_X0; if (p.vx < 0) p.vx = 0; } else if (p.x > WALL_X1) { p.x = WALL_X1; if (p.vx > 0) p.vx = 0; }
    return r;
  };
  const _cp = collidePlayers;
  collidePlayers = function () {
    const r = _cp.apply(this, arguments);
    for (const p of M.players) { p.x = clamp(p.x, WALL_X0, WALL_X1); p.z = clamp(p.z, 20, COURT.D - 20); }   // a shove can't push anyone through a wall
    return r;
  };
  const _ub = updateBall;
  updateBall = function () {
    const r = _ub.apply(this, arguments);
    if (!ball.owner) {
      let hit = 0;
      if (ball.x < BALL_X0) { ball.x = BALL_X0; hit = Math.abs(ball.vx); ball.vx = Math.abs(ball.vx) * WALL_E; }
      else if (ball.x > BALL_X1) { ball.x = BALL_X1; hit = Math.abs(ball.vx); ball.vx = -Math.abs(ball.vx) * WALL_E; }
      if (ball.z > BALL_Z1) { ball.z = BALL_Z1; hit = Math.max(hit, Math.abs(ball.vz)); ball.vz = -Math.abs(ball.vz) * WALL_E; }
      if (hit > 120) SFX.bounce(clamp(hit / 900, 0.1, 0.6));
    }
    return r;
  };
}

// ---- fair restarts: whenever the ball is handed over in place (side-outs, check balls, 1-on-1,
// half court), no defender starts closer than an arm's length: anyone crowding the handler steps
// back to a spot between his man and the basket, and a teammate on top of the handler spreads out.
const FAIR_GAP = 95, MATE_GAP = 140;
function fairRestart(team) {
  const bo = ball.owner; if (!bo || bo.team !== team || !M.teams) return;
  const a = attackHoop(team), O = M.teams[team].players, D = M.teams[1 - team].players, mate = O.find(q => q !== bo);
  if (mate && dxz(mate, bo) < MATE_GAP) {
    const sx = sgn(a.x - bo.x) || 1;
    place(mate, clamp(bo.x + sx * 150, 60, COURT.L - 60), clamp(bo.z + (bo.z < COURT.D / 2 ? 190 : -190), 60, COURT.D - 60));
  }
  const byDist = D.slice().sort((p, q) => dxz(p, bo) - dxz(q, bo));
  byDist.forEach((d, i) => {
    const man = i === 0 || !mate ? bo : mate;
    if (dxz(d, bo) >= FAIR_GAP && (man === bo || dxz(d, man) >= 50)) return;
    const ux = a.x - man.x, uz = a.z - man.z, L = Math.hypot(ux, uz) || 1, gap = Math.min(FAIR_GAP + 15, L * 0.6);
    place(d, clamp(man.x + ux / L * gap, WALL_X0 + 10, WALL_X1 - 10), clamp(man.z + uz / L * gap, 30, COURT.D - 30));
    d.face = sgn(man.x - d.x) || d.face;
  });
}
{
  const _ib = inbound;
  inbound = function (team) { const r = _ib.apply(this, arguments); fairRestart(team); return r; };
}
