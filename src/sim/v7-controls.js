// ================================================= v7: CONTROL OVERHAUL
// Three buttons plus movement: SHOOT (K), PASS (J), MOVE (H). Turbo and Skill are gone.
// Sprint is a gesture (double-tap a direction, or the touch stick at its edge) and still sets
// c.turbo, so every mechanic that meant "turbo" now means "while sprinting". CPU players keep
// the v6 freeLogic untouched; this layer only interprets human input.
const SPRINT_DT = 0.25;      // double-tap window (s)
const SPRINT_REL = 0.12;     // sprint ends after all directions are released this long (s)
const STICK_SPRINT = 0.9;    // touch: stick deflection that sprints
const FLICK_DT = 0.3;        // touch: two flicks within this window start a sprint
const PASS_HOLD = 0.3;       // PASS held this long (with the ball) calls a screen instead of passing
const STEAL_TAP = 0.16;      // PASS on defense: release before this = steal, held past it = stance
const MOVE_DT = 0.2;         // MOVE double-tap window (signature move); a single tap's hesitation waits this long
const DOUBLE_HOLD = 0.3;     // MOVE held on defense this long = double team
const PLANT_T = 0.6, PLANT_CD = 1.5;
for (const b of BINDS) { b.t = []; b.s = []; }        // turbo and skill keys removed

// ---- sprint gesture
const Sprint = [{}, {}];
function sprintStep(pad, c) {
  const S = Sprint[pad], b = BINDS[pad], d = Input.down, now = nowMs() / 1000, dirs = ['up', 'down', 'left', 'right'];
  if (S.pobj !== Input.pressed) {                                  // once per frame: look at new presses
    S.pobj = Input.pressed;
    for (const k of dirs) if (b[k].some(x => Input.pressed[x])) {
      if (S.lastDir === k && now - S.lastT < SPRINT_DT) S.on = true;   // same direction twice: sprint (alternating keys never does)
      S.lastDir = k; S.lastT = now;
    }
  }
  const any = dirs.some(k => b[k].some(x => d[x]));
  if (any) S.held = now; else if (now - (S.held || 0) > SPRINT_REL) S.on = false;
  let stick = false;
  if (pad === 0 && Input.touchMode) {
    const ax = Input.stick.ax || 0, az = Input.stick.az || 0, m = Math.hypot(ax, az), a = Math.atan2(az, ax);
    if (m > 0.55 && !S.up) {                                        // a flick out
      S.up = true;
      if (S.flickT && now - S.flickT < FLICK_DT && Math.abs(Math.atan2(Math.sin(a - S.flickA), Math.cos(a - S.flickA))) < 0.7) S.flickOn = true;
      S.flickT = now; S.flickA = a;
    }
    if (m < 0.3) { S.up = false; S.flickOn = false; }
    stick = m >= STICK_SPRINT || (S.flickOn && m >= 0.3);
  }
  c.turbo = !!(S.on && (any || now - (S.held || 0) <= SPRINT_REL)) || stick;
}
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) { _hc(pad, c); sprintStep(pad, c); c.s = false; c.sHeld = false; };
}

// ---- automatic pass type
function laneClogged(p, to) { for (const o of p.opps) { const s = segDist(o.x, o.z, p.x, p.z, to.x, to.z); if (s.d < 34 && s.t > 0.15 && s.t < 0.85 && o.state !== 'down') return true; } return false; }
function passAuto(p) {
  const mate = p.mate; if (!mate || mate.state === 'down' || ball.owner !== p || p.state !== 'free') return false;
  if (autoAlley(p, mate)) { doPass(p, mate, true); return true; }         // he's cutting / sprinting at the rim: alley-oop
  if (laneClogged(p, mate) || dxz(p, mate) > 520) { lobPass(p, mate); return true; }   // over the top
  doPass(p, mate, false); return true;                                   // chest / lead / bounce (bounce under pressure)
}
// ---- off the ball: go set a screen on the handler's defender
function setScreenForPartner(p) {
  const bo = ball.owner; if (!bo || bo.team !== p.team || bo === p || (p.cd.scr2 || 0) > M.time) return;
  const def = nearestOpp(bo); if (!def) return;
  p.cd.scr2 = M.time + 2.5; p.v7.scr = { def, bo, t: 0, still: 0 };
  FX.pop(p.x, p.y + 140, p.z, 'SETTING A SCREEN', '#ffd76a'); SFX.blip();
}
function screenSteer(p, dt) {
  const S = p.v7.scr, c = p.cmd; if (!S) return;
  S.t += dt;
  if (ball.owner !== S.bo || p.state !== 'free' || S.t > 3.2) { p.v7.scr = null; return; }
  if (S.t > 0.25 && Math.hypot(c.mx, c.mz) > 0.6 && !S.arrived) { p.v7.scr = null; return; }        // the player took over
  const h = defendHoop(S.def.team === p.team ? 1 - p.team : S.def.team), H = attackHoop(p.team);
  const ux = H.x - S.def.x, uz = H.z - S.def.z, L = Math.hypot(ux, uz) || 1;
  const tx = S.def.x + ux / L * 24, tz = S.def.z + uz / L * 24, dx = tx - p.x, dz = tz - p.z, D = Math.hypot(dx, dz);
  if (!S.arrived && D > 8) { const k = Math.min(1, D / 30); c.mx = dx / D * k; c.mz = dz / D * k; c.turbo = false; }
  else { S.arrived = true; c.mx = 0; c.mz = 0; S.still += dt; if (S.still > 1.4) p.v7.scr = null; }   // set (still) screen
}
// ---- defense: plant for a charge, call a double team
function startPlant(p) {
  if ((p.cd.plant || 0) > M.time || p.state !== 'free' || p.y > 1) return;
  p.cd.plant = M.time + PLANT_CD; p.v7.plant = PLANT_T; p.vx *= 0.2; p.vz *= 0.2;
  FX.pop(p.x, p.y + 130, p.z, 'PLANTED', '#8fe3ff');
}
function doubleTeam(p, on) {
  const q = p.mate; if (!q) return;
  if (q.human >= 0) { if (on && !p.v7.dblShown) { p.v7.dblShown = true; FX.pop(q.x, q.y + 140, q.z, 'DOUBLE THE BALL!', '#8fe3ff'); } if (!on) p.v7.dblShown = false; return; }
  if (on) {
    const bo = ball.owner; if (!bo || bo.team === p.team) return;
    q.ai.plan = { type: 'help', man: (q.ai.plan && q.ai.plan.man) || nearestOpp(q) }; q.ai.t = 0.4;
    if (!p.v7.dblShown) { p.v7.dblShown = true; FX.pop(bo.x, bo.y + 150, bo.z, 'DOUBLE TEAM', '#8fe3ff'); SFX.blip(); }
  } else if (p.v7.dblShown) { p.v7.dblShown = false; q.ai.t = 0; }               // recover to his man
}

// ---- per-step interpretation of the three buttons for a human player
function v7Input(p, dt) {
  const c = p.cmd, V = p.v7 || (p.v7 = {}), now = M.time, bo = ball.owner, mine = bo === p;
  const onD = bo ? bo.team !== p.team : !!(ball.pass && ball.pass.from.team !== p.team);
  const free = p.state === 'free';
  // final minute: sprint + PASS near a loose ball dives (unchanged rule)
  if (free && c.a && c.turbo && p.turbo > 20 && digDeep() && !bo && ball.state === 'loose' && Math.hypot(ball.x - p.x, ball.z - p.z) < 120 && ball.y < 70) { c.a = false; startDive(p); return; }
  // PASS
  if (c.a) V.a = { t: 0, ctx: mine ? 'ball' : bo && !onD ? 'off' : onD ? 'def' : 'reb', done: false };
  const A = V.a;
  if (A) {
    const held = c.aHeld; if (held) A.t += dt;
    if (A.ctx === 'ball') {
      if (!mine) V.a = null;
      else if (held && c.x && !A.done && free) { A.done = true; c.x = false; V.xSkip = true; startPassFake(p, p.mate); }     // PASS held + tap MOVE: pass fake
      else if (held && A.t >= PASS_HOLD && !A.done) { A.done = true; if (!callScreen(p)) FX.pop(p.x, p.y + 132, p.z, 'NO SCREEN YET', '#9fb3c8'); }
      else if (!held) { if (!A.done) { if (free) passAuto(p); else { A.waitFree = true; } } if (!A.waitFree || free) V.a = null; }
      if (A.waitFree && free && mine) { passAuto(p); V.a = null; }
    } else if (A.ctx === 'def') {
      if (!held) { if (A.t < STEAL_TAP && free && !A.done) { if (c.turbo && p.turboOK()) tryShove(p); else trySteal(p); } V.a = null; }   // tap: steal (or shove while sprinting)
    } else if (A.ctx === 'off') {
      if (!A.done) { A.done = true; setScreenForPartner(p); }
      if (!held) V.a = null;
    } else if (!held) V.a = null;
  }
  c.stanceHeld = !!(V.a && (V.a.ctx === 'def' || V.a.ctx === 'reb') && c.aHeld && V.a.t >= STEAL_TAP);
  // MOVE
  if (V.hesiAt && now >= V.hesiAt) { V.hesiAt = null; if (mine && free && !p.postUp) startDribbleMove(p, 'hesi', 1); }   // single tap: hesitation
  if (c.x && !V.xSkip) {
    const dir = Math.hypot(c.mx, c.mz) >= 0.3;
    if (mine) {
      if (dir) { V.xh = null; if (free) { const m = classifyMove(p, c.mx, c.mz); startDribbleMove(p, m.kind, m.side); } }
      else if (V.hesiAt) { V.hesiAt = null; V.xh = { t: 0, sig: true }; if (free) trySignature(p, true); }   // double-tap: signature move
      else V.xh = { t: 0 };
    } else if (onD) { V.xh = { t: 0, def: true }; startPlant(p); }
    else V.xh = null;
  }
  if (!c.xHeld && !c.x) V.xSkip = false;
  const X = V.xh;
  if (X) {
    if (c.xHeld) {
      X.t += dt;
      if (mine && !X.def && !X.sig && X.t >= 0.2 && !p.postUp && free && postEligible(p)) { V.xh = null; enterPost(p); }
      if (X.def && X.t >= DOUBLE_HOLD) { if (V.plant > 0) V.plant = 0; doubleTeam(p, true); X.dbl = true; }
    } else {
      if (mine && !X.def && !X.sig && X.t < 0.3 && !p.postUp) V.hesiAt = now + MOVE_DT;
      if (X.dbl) doubleTeam(p, false);
      V.xh = null;
    }
  }
  if (V.plant > 0) V.plant -= dt;
  if (V.scr) screenSteer(p, dt);
}
preStep = function (p, dt) {
  if (p.comp == null) p.comp = 50; else p.comp += (50 - p.comp) * 0.004 * dt;
  if (p.human >= 0) v7Input(p, dt);
  stanceStep(p, dt);
  if (p.v7 && p.v7.plant > 0) {                                   // planted for a charge: feet locked, set right away, strong vs bumps
    p.cmd.mx = 0; p.cmd.mz = 0; p.vx *= 0.3; p.vz *= 0.3; p.stance = true; p.setT = Math.max(p.setT || 0, 0.4);
  }
};
{
  const _fl = freeLogic;
  freeLogic = function (p) {
    if (p.human < 0) return _fl(p);                                     // CPU: unchanged
    const c = p.cmd, bo = ball.owner;
    if (bo === p) {                                                      // SHOOT with the ball (pass and move live in v7Input)
      if (!c.b) return;
      p.passHold = null;
      if (canDunk(p) && !p.postUp) { startDunk(p, {}); return; }
      const h = attackHoop(p.team), d = dxz(p, h);
      if (d > 150 && d < 270 && !p.postUp && c.turbo) {
        const speed = Math.hypot(p.vx || 0, p.vz || 0), label = !p.turboOK() ? 'NO LEGS LEFT' : speed < 115 ? 'BUILD A RUN-UP' : 'DRIVE AT THE RIM';
        FX.pop(p.x, 132, p.z, label, '#ffd76a');
      }
      const k = classifyShot(p);
      if (k === 'euro') { startEuro(p); return; }
      applyShotType(p, k); p.postUp = null; p.fakeOK = true; startShot(p); return;
    }
    if (bo && bo.team === p.team) {                                      // off the ball: SHOOT calls for it
      if (!c.b) return;
      if (bo.human >= 0) { FX.pop(p.x, p.y + 140, p.z, 'OPEN!', '#bfffcf'); return; }
      const H = attackHoop(p.team), d = dxz(p, H), L = d || 1, toward = ((H.x - p.x) * (p.vx || 0) + (H.z - p.z) * (p.vz || 0)) / L;
      if (c.turbo && d < 300 && toward > 120) { bo.ai.request = { type: 'alley', to: p }; popOnce(p, 'oop', 'LOB IT!', '#ffd76a'); return; }   // sprinting at the rim: alley-oop
      bo.ai.request = { type: 'pass', to: p };
      if (M.time - (p.ggT == null ? -9 : p.ggT) < 2.6) { bo.ai.request.gg = true; p.ggPending = M.time; }   // give-and-go
      return;
    }
    if (!bo) { if (c.b && !(ball.pass && ball.pass.from.team === p.team)) startJump(p); return; }   // shot / loose ball: rebound or tip
    if (c.b) { if (c.turbo && p.turboOK()) startSwipe(p); else startJump(p); }   // defense: block, or a swipe / chase-down while sprinting
  };
}

// ---- sprint feedback at the feet: short speed streaks behind a sprinting human
{
  const _dtr = drawTeamRing;
  drawTeamRing = function (g, p) {
    _dtr(g, p);
    if (p.human < 0 || !p.cmd.turbo || p.y > 30) return;
    const sp = Math.hypot(p.vx || 0, p.vz || 0); if (sp < 180 || !(p.turboOK && p.turboOK())) return;
    const ux = -(p.vx || 0) / sp, uz = -(p.vz || 0) / sp, k = depthK(p.z);
    g.save(); g.strokeStyle = 'rgba(191,240,255,0.55)'; g.lineWidth = 1.6 * k; g.lineCap = 'round';
    for (const off of [-9, 0, 9]) {
      const [x0, y0] = P(p.x + ux * 22 - uz * off * 0.5, 0, p.z + uz * 22 + ux * off), [x1, y1] = P(p.x + ux * (40 + (off ? 0 : 10)) - uz * off * 0.5, 0, p.z + uz * (40 + (off ? 0 : 10)) + ux * off);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.restore();
  };
}
// ---- touch: three action buttons (SHOOT, PASS, MOVE); sprint comes from the stick
{
  const _lay = TouchUI.layout.bind(TouchUI);
  TouchUI.layout = function () {
    _lay(); if (!this.btns || !this.btns.shoot) return;
    const s = this.portrait ? 1.18 : 1, pad = this.portrait ? 26 : 18, bot = this.portrait ? 38 : 16;
    const place = (b, size, right, bottom) => Object.assign(b.style, { width: size * s + 'px', height: size * s + 'px', right: right * s + pad + 'px', bottom: bottom * s + bot + 'px', fontSize: (size > 70 ? 15 : 12) * s + 'px' });
    place(this.btns.shoot, 92, 0, 0); place(this.btns.pass, 76, 104, 4); place(this.btns.cross, 72, 18, 104);   // one-hand triangle
    this.btns.turbo.style.display = 'none'; this.btns.skill.style.display = 'none';
  };
  const _tu = TouchUI.update.bind(TouchUI);
  TouchUI.update = function () {
    _tu(); if (!this.shown || !this.btns.cross) return;
    this.btns.turbo.style.display = 'none'; this.btns.skill.style.display = 'none';
    if (Game.screen === 'musalla') return;
    const me = M.players && M.players.find(p => p.human === 0); if (!me) return;
    const bo = ball.owner, mine = bo === me, off = bo && bo.team === me.team && !mine, def = bo && bo.team !== me.team;
    const L = mine ? [['SHOOT', ''], ['PASS', 'hold: SCREEN'], [me.postUp ? 'DROP' : 'MOVE', '2\u00d7: SIGNATURE']]
      : off ? [['CALL', ''], ['SCREEN', ''], ['\u2013', '']]
      : def ? [['BLOCK', ''], ['STEAL', 'hold: STANCE'], ['CHARGE', 'hold: DOUBLE']]
      : [['JUMP', ''], ['BOX OUT', ''], ['\u2013', '']];
    const key = JSON.stringify(L);
    if (this.v7key !== key) {
      this.v7key = key;
      [this.btns.shoot, this.btns.pass, this.btns.cross].forEach((b, i) => { b.innerHTML = '<span>' + L[i][0] + '</span>' + (L[i][1] ? '<small>' + L[i][1] + '</small>' : ''); });
      this.btns.cross.classList.toggle('cd', L[2][0] === '\u2013');
    }
  };
}
// ---- How to play (three buttons)
drawHowTo = function (g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); const rw = W; W = 960;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('How to play', W / 2, 44);
  const keys = [['Move', 'W A S D', 'Arrows'], ['Sprint', 'hold Left Shift while moving', 'Right Shift'], ['Shoot', 'K', 'Num2 / .'], ['Pass', 'J', 'Num1 / ,'], ['Move button', 'H', 'Num0 / M']];
  g.font = `11px ${FONT}`; g.fillStyle = '#9fb3c8'; g.fillText('P1', 610, 72); g.fillText('P2', 800, 72);
  keys.forEach((r, i) => { const y = 92 + i * 21; g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(r[0], 150, y); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `12px ${FONT}`; g.fillText(r[1], 610, y); g.fillText(r[2], 800, y); });
  const col = (x, title, lines) => { g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText(title, x, 222); g.font = `12px ${BODY}`; lines.forEach((t, i) => { g.fillStyle = t.startsWith('\u2022') ? '#9fb3c8' : IVORY; g.fillText(t, x, 242 + i * 18); }); };
  col(60, 'OFFENSE', ['Shoot: hold and release at the top  \u2022  tap: pump fake', 'Sprint + Shoot in range: dunk', 'Pass: tap  \u2022  type is automatic (bounce, lob, alley-oop)', 'Hold Pass: call a screen  \u2022  hold Pass + tap Move: pass fake',
    'Move + direction: crossover, behind the back, spin, step-back', 'Tap Move: hesitation  \u2022  double-tap: signature move', 'Hold Move near the paint: post up', '\u2022 Without the ball: Shoot calls for it (give-and-go,',
    '\u2022   or alley-oop while sprinting at the rim)', '\u2022 Without the ball: Pass sets a screen for your partner']);
  col(500, 'DEFENSE', ['Pass: tap to steal  \u2022  hold: stance (box out on a shot)', 'Sprint + Pass: shove (hard foul)', 'Shoot: jump, block, contest', 'Sprint + Shoot: swipe  \u2022  from behind: chase-down',
    'Tap Move: plant your feet to take a charge', 'Hold Move: your partner doubles the ball', '\u2022 Reach across his body and it\u2019s a foul', '\u2022 Sprint while in stance fights over screens',
    '\u2022 Final minute: sprint + Pass dives for loose balls', '\u2022 Pause for timeouts and set plays']);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Touch: push the stick past the dashed ring to sprint. Buttons: SHOOT, PASS, MOVE (labels change with the play).', W / 2, 438);
  g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText('Press Enter or tap to go back', W / 2, 520);
  W = rw; g.restore();
  addRect(0, 0, W, H, goTitle);
};

