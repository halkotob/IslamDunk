// ================================================================= SALAH
// The adhan comes at random intervals, never less than 10 real minutes
// apart, and only while practicing. Praying grants a bonus for the next game.
function checkAdhan() {
  if (Gym.drill || Gym.overlay || Gym.walk || Gym.fade || Gym.result) return;
  if (Date.now() >= C.nextAdhan) {
    Gym.overlay = 'adhan';
    C.lastAdhan = Date.now(); C.nextAdhan = C.lastAdhan + rand(10, 16) * 60000; saveCareer();
  }
}
function goPray() {
  Gym.overlay = null;
  if (Game.screen === 'musalla') { Game.mus = null; Game.screen = 'gym'; Gym.fade = { phase: 'out', t: 0 }; return; }
  const me = M.players[0];
  if (ball.owner === me) { ball.owner = null; ball.state = 'loose'; ball.vx = ball.vz = 0; ball.vy = 0; ball.y = BALL_R; }
  Gym.walk = { t: 0 };
}
function skipPray() { Gym.overlay = null; if (C) { C.adhanSkips = (C.adhanSkips || 0) + 1; saveCareer(); } }
function enterGym() {
  Gym.drill = null; Gym.overlay = null; Gym.walk = null; Gym.fade = null; Gym.result = null;
  setupPractice('free'); Game.screen = 'gym';
  if (!C.nextAdhan) C.nextAdhan = Date.now() + rand(2, 4) * 60000;   // first call to prayer comes a little sooner
  saveCareer();
}
function gymUpdate(rdt) {
  if (Gym.result) { if (menuHit('ok')) { Gym.result = null; setupPractice('free'); } sim(rdt, true); return; }
  if (Gym.overlay === 'drills') { menuStackUpdate('gymdrills', DRILL_MENU(), () => { Gym.overlay = null; }); sim(rdt, true); return; }
  if (Gym.overlay === 'adhan') {
    if (menuHit('ok')) goPray(); else if (menuHit('back') || Input.pressed.KeyJ) skipPray();
    sim(rdt, true); return;
  }
  if (Gym.walk) Gym.walk.t += rdt;
  if (Gym.fade) {
    const f = Gym.fade; f.t += rdt;
    if (f.to === 'musalla' || f.to === 'office') { if (f.t > 0.5) { const to = f.to; Gym.fade = null; if (to === 'office') openOffice(); else openMusalla(); } sim(rdt, true); return; }
    if (f.phase === 'out' && f.t > 1.2) { f.phase = 'hold'; f.t = 0; }
    else if (f.phase === 'hold' && f.t > 4.5) {
      f.phase = 'in'; f.t = 0;
      const me = M.players[0]; place(me, 760, 90); me.face = 1;
      C.prayBonus = true; C.adhanSkips = 0; C.salahEp = (C.salahEp || 0) + 1;
      f.bp = drillBP(ECON.bpSalah); bankPractice(f.bp, 0);
    } else if (f.phase === 'in' && f.t > 1.2) { const b = f.bp || 0; Gym.fade = null; gymToast('Salah bonus ready for your next game: +10% shooting, +10% stamina' + (b ? '   +' + b + ' BP' : ''), 4); }
  }
  if (!Gym.walk && !Gym.fade) {
    if (menuHit('back')) {
      if (Gym.drill) { Gym.drill = null; setupPractice('free'); gymToast('Drill stopped'); }
      else { careerHub(); return; }
    }
    if (!Gym.drill) {
      if (Input.pressed.Digit1 || Input.pressed.KeyQ) openDrills();
      else if (Input.pressed.Digit2 || Input.pressed.KeyE) enterMusalla();
      else if (Input.pressed.Digit3 || Input.pressed.KeyO) enterOffice();
      checkAdhan();
    }
  }
  sim(rdt, true);
  drillUpdate(rdt);
  if (Gym.toastT > 0) Gym.toastT -= rdt;
}
function gymExtras(E, g) {
  const d = Gym.drill;
  if (!d || d.kind !== 'cones') return;
  CONES.forEach((c, i) => E.push({ z: c.z, f: () => {
    const [x, y] = P(c.x, 0, c.z), done = i < d.idx, next = i === d.idx;
    if (next) { g.strokeStyle = `rgba(242,207,107,${0.6 + 0.4 * Math.sin(Game.t * 8)})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, 30, 11, 0, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = done ? 0.35 : 1;
    g.fillStyle = '#e8661c'; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x, y - 20); g.lineTo(x + 8, y); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(x - 4.5, y - 11, 9, 3); g.fillStyle = '#b84c12'; g.fillRect(x - 10, y - 2, 20, 3);
    g.globalAlpha = 1;
  } }));
}

// -------------------------------------------------------------- GYM HUD
function drawGymHUD(g) {
  { const iy = Input.touchMode ? H - 40 : H - 88;                 // compact info pill, clear of the wall
    g.fillStyle = 'rgba(8,16,24,0.72)'; roundRect(g, 12, iy, 300, 28, 14); g.fill();
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `11px ${FONT}`; g.fillText('AL-AMANAH GYM', 24, iy + 18);
    g.font = `11px ${BODY}`; g.fillStyle = '#f2cf6b'; g.fillText(C.bp + ' BP', 132, iy + 18); g.fillStyle = '#9dffb0'; g.fillText(C.hb + ' Halal Bucks', 196, iy + 18);
    if (C.prayBonus) { g.fillStyle = 'rgba(30,90,74,0.9)'; roundRect(g, 320, iy, 140, 28, 14); g.fill(); g.fillStyle = '#f2cf6b'; g.font = `10px ${FONT}`; g.fillText('Salah bonus ready', 334, iy + 18); } }
  const d = Gym.drill;
  if (d && d.mini) drawMiniHUD(g);
  else if (d) {
    let txt = '';
    if (d.kind === 'ft') txt = 'Free throws  ' + d.shots + '/10   Made ' + d.made;
    else if (d.kind === 'three') txt = 'Three-point challenge   ' + Math.ceil(d.left) + 's   Score ' + d.score;
    else if (d.kind === 'cones') txt = 'Cone dribble   ' + d.time.toFixed(1) + 's   Cone ' + Math.min(d.idx + 1, CONES.length) + '/' + CONES.length;
    else txt = 'You ' + M.teams[0].score + '  \u2013  ' + M.teams[1].score + ' Nasser   (first to 11)';
    g.fillStyle = 'rgba(8,16,24,0.82)'; roundRect(g, W / 2 - 200, 70, 400, 34, 17); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `15px ${FONT}`; g.fillText(txt, W / 2, 93);
    if (d.kind === 'three') for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++) {
      const i = r * 3 + b, x = W / 2 - 110 + r * 46 + b * 12;
      g.fillStyle = i < d.shots ? 'rgba(255,255,255,0.2)' : b === 2 ? '#f2cf6b' : '#e8661c'; g.beginPath(); g.arc(x, 118, 4.5, 0, Math.PI * 2); g.fill();
    }
    if (d.kind === 'v1' && M.mustClear[0] && ball.owner === M.players[0]) { g.fillStyle = '#ff9a8a'; g.font = `13px ${FONT}`; g.fillText('Take it back past the arc', W / 2, 124); }
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = `11px ${BODY}`; g.fillText('Back or Esc stops the drill', W / 2, 140);
  } else if (!Gym.walk && !Gym.fade) {
    // drills + musalla: bottom bar on desktop, a column at top-right on touch
    // (clear of the joystick and the action buttons)
    const acts = [['Drills', openDrills], ['Enter the musalla (E)', enterMusalla], ['Sheikh\u2019s office (O)', enterOffice]];
    acts.forEach(([name, fn], i) => {
      const touch = Input.touchMode, x = touch ? W - 216 : 12 + i * 224, y = touch ? 56 + i * 44 : H - 50, w = touch ? 206 : 214, h = touch ? 38 : 40;
      g.fillStyle = i === 0 ? 'rgba(44,110,143,0.95)' : 'rgba(30,90,74,0.92)'; roundRect(g, x, y, w, h, 10); g.fill();
      g.strokeStyle = 'rgba(242,207,107,0.6)'; g.lineWidth = 1; g.stroke();
      g.textAlign = 'left'; g.fillStyle = '#f2cf6b'; g.font = `13px ${FONT}`; g.fillText(String(i + 1), x + 12, y + h / 2 + 5);
      g.fillStyle = '#fff'; g.font = `13px ${BODY}`; g.fillText(name, x + 30, y + h / 2 + 5);
      addRect(x, y, w, h, fn);
    });
    const me = M.players[0];
    if (dxz(me, PRAY_SPOT) < 70) {
      const [px, py] = P(me.x, 130, me.z);
      g.fillStyle = 'rgba(30,90,74,0.95)'; roundRect(g, px - 90, py - 26, 180, 26, 13); g.fill();
      g.fillStyle = '#f2cf6b'; g.textAlign = 'center'; g.font = `12px ${FONT}`; g.fillText('Enter the musalla (E)', px, py - 8);
      addRect(px - 90, py - 26, 180, 26, enterMusalla);
    } else if (dxz(me, OFFICE_SPOT) < 60) {
      const [px, py] = P(me.x, 130, me.z);
      g.fillStyle = 'rgba(122,79,42,0.95)'; roundRect(g, px - 90, py - 26, 180, 26, 13); g.fill();
      g.fillStyle = '#f2e6c8'; g.textAlign = 'center'; g.font = `12px ${FONT}`; g.fillText('Sheikh\u2019s office (O)', px, py - 8);
      addRect(px - 90, py - 26, 180, 26, enterOffice);
    }
  }
  if (Gym.toastT > 0) {
    g.globalAlpha = clamp(Gym.toastT, 0, 1); g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, W / 2 - 300, 150, 600, 34, 17); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `14px ${BODY}`; g.fillText(Gym.toast, W / 2, 172); g.globalAlpha = 1;
  }
  if (Input.touchMode && !TouchUI.shown && !Gym.overlay && !Gym.result && !Gym.fade) drawTouch(g);
  if (Gym.overlay === 'adhan') drawAdhan(g);
  if (Gym.overlay === 'drills') drawDrillsMenu(g);
  if (Gym.fade) drawPrayerFade(g);
  if (Gym.result) drawDrillResult(g);
}
function drawArch(g, x, y, w, h) {
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + h * 0.42);
  g.quadraticCurveTo(x + 4, y + 14, x + w / 2, y); g.quadraticCurveTo(x + w - 4, y + 14, x + w, y + h * 0.42);
  g.lineTo(x + w, y + h); g.closePath();
}
function drawAdhan(g) {
  dim(g, 0.62);
  const x = W / 2 - 230, y = 70, w = 460, h = 380;
  drawArch(g, x, y, w, h); g.fillStyle = 'rgba(14,52,48,0.97)'; g.fill(); g.strokeStyle = GOLD; g.lineWidth = 3; g.stroke();
  drawArch(g, x + 12, y + 14, w - 24, h - 26); g.strokeStyle = 'rgba(232,195,90,0.4)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(232,195,90,0.35)'; star8(g, W / 2, y + 62, 12); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#f5d98a'; g.font = `48px ${AR_FONT}`;
  g.fillText('\u062d\u064e\u064a\u0651\u064e \u0639\u064e\u0644\u064e\u0649 \u0671\u0644\u0635\u0651\u064e\u0644\u064e\u0627\u0629\u0650', W / 2, y + 150);
  g.fillStyle = IVORY; g.font = `18px ${BODY}`; g.fillText('The adhan is being called.', W / 2, y + 196);
  g.font = `15px ${BODY}`; g.fillStyle = '#c9d8d2'; g.fillText('Come to prayer. Praying gives a bonus for your next game.', W / 2, y + 222);
  g.fillStyle = GOLD; roundRect(g, W / 2 - 160, y + 256, 150, 42, 21); g.fill();
  g.fillStyle = NIGHT; g.font = `16px ${FONT}`; g.fillText('Go pray', W / 2 - 85, y + 283);
  g.fillStyle = 'rgba(255,255,255,0.14)'; roundRect(g, W / 2 + 10, y + 256, 150, 42, 21); g.fill();
  g.fillStyle = '#fff'; g.font = `15px ${BODY}`; g.fillText('Keep practicing', W / 2 + 85, y + 282);
  addRect(W / 2 - 160, y + 256, 150, 42, goPray); addRect(W / 2 + 10, y + 256, 150, 42, skipPray);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Enter to go pray, Esc to keep practicing', W / 2, y + 330);
}
function drawPrayerFade(g) {
  const f = Gym.fade;
  if (f.to === 'musalla' || f.to === 'office') { g.fillStyle = `rgba(4,10,14,${clamp(f.t / 0.5, 0, 1)})`; g.fillRect(0, 0, W, H); return; }
  const a = f.phase === 'out' ? f.t / 1.2 : f.phase === 'hold' ? 1 : 1 - f.t / 1.2;
  g.fillStyle = `rgba(4,10,14,${clamp(a, 0, 1)})`; g.fillRect(0, 0, W, H);
  if (f.phase === 'hold') {
    const k = clamp(Math.min(f.t, 4.5 - f.t) / 0.8, 0, 1);
    g.globalAlpha = k * 0.85; drawMusalla(g, C.up, 'salah', Game.t);
    g.fillStyle = 'rgba(4,10,14,0.45)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(4,10,14,0.6)'; g.fillRect(0, H / 2 - 70, W, 150);
    g.globalAlpha = k; g.textAlign = 'center';
    g.fillStyle = '#f5d98a'; g.font = `44px ${AR_FONT}`; g.fillText('\u062a\u064e\u0642\u064e\u0628\u0651\u064e\u0644\u064e \u0671\u0644\u0644\u0651\u064e\u0647\u064f', W / 2, H / 2 - 10);
    g.fillStyle = IVORY; g.font = `17px ${BODY}`; g.fillText('May Allah accept it from you.', W / 2, H / 2 + 30);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Next game: +10% shooting, +10% stamina', W / 2, H / 2 + 60);
    g.globalAlpha = 1;
  }
}
function drawDrillResult(g) {
  const r = Gym.result; dim(g, 0.55);
  g.fillStyle = 'rgba(12,40,44,0.96)'; roundRect(g, W / 2 - 220, 130, 440, 250, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText(r.title, W / 2, 176);
  g.fillStyle = '#fff'; g.font = `20px ${BODY}`; g.fillText(r.line, W / 2, 218);
  if (r.best) { g.fillStyle = '#9dffb0'; g.font = `14px ${FONT}`; g.fillText(r.kind === 'v1' ? 'Win recorded' : 'New personal best', W / 2, 244); }
  g.fillStyle = '#f2cf6b'; g.font = `18px ${FONT}`; g.fillText('+' + r.bp + ' Barakah Points' + (r.pb ? '  (incl. +' + r.pb + ' personal best)' : ''), W / 2, 284);
  g.fillStyle = '#9dffb0'; g.font = `14px ${BODY}`; g.fillText('+' + (r.hb != null ? r.hb : 0) + ' Halal Bucks', W / 2, 308);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Press Enter or tap to keep practicing', W / 2, 352);
  addRect(0, 0, W, H, () => { Gym.result = null; setupPractice('free'); });
}

