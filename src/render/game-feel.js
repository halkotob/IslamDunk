// ======================================================= GAME FEEL (v3.6)
// Impact (hit-stop, scaled shake, layered sound), ball weight, per-shot-type
// feedback, defense feedback, the green-release showcase, a subtle timing
// coach, personal bests, the Daily Hot Spot Challenge and the best-play clip.
// Visual/audio only: gameplay rules, odds and AI are unchanged.

// ------------------------------------------------------------- storage
// Personal, device-local progress (separate from career saves; nothing is
// ever taken away, and nothing is compared with other players).
const Progress = {
  key: 'islamdunk.progress',
  load() { try { return Object.assign({ green: [], streak: 0, coach: 0, daily: {} }, JSON.parse(localStorage.getItem(this.key) || '{}')); } catch (e) { return { green: [], streak: 0, coach: 0, daily: {} }; } },
  save(o) { try { localStorage.setItem(this.key, JSON.stringify(o)); } catch (e) {} },
  update(fn) { const o = this.load(); fn(o); this.save(o); return o; }
};

// ------------------------------------------------------------- impact
FX.stopF = 0; FX.laterQ = [];
FX.later = (t, fn) => FX.laterQ.push({ t, fn });          // small delayed effects on the game clock (no timers)
FX.hitstop = n => { FX.stopF = Math.max(FX.stopF, Math.min(4, n * 2)); };   // v7.6: up to 4 frames (~67 ms) for the biggest plays
// shake: amplitude with a short, eased envelope (always under 300 ms)
FX.shake = function (a, dur = 0.2) {
  a *= REDUCED_MOTION ? 0.35 : 1;
  const cur = this.shakeT > 0 ? this.shakeA * (this.shakeT / this.shakeD) : 0;
  if (a >= cur) { this.shakeA = a; this.shakeD = this.shakeT = Math.min(0.28, dur); }
};
FX.shakeT = 0; FX.shakeD = 0.2;
// A soft camera nudge rather than a jittery shake: one smooth dip that settles.
function shakeTick(rdt) {
  if (FX.groanV > 0) FX.groanV = Math.max(0, FX.groanV - rdt * 1.1);
  if (FX.laterQ.length) for (const e of FX.laterQ.slice()) if ((e.t -= rdt) <= 0) { FX.laterQ.splice(FX.laterQ.indexOf(e), 1); e.fn(); }
  if (FX.shakeT > 0) {
    FX.shakeT -= rdt; const k = 1 - Math.max(0, FX.shakeT / FX.shakeD);            // 0 -> 1 over the nudge
    const d = Math.sin(k * Math.PI) * (1 - k * 0.35);                               // down, then settle; no jitter
    FX.sx = FX.shakeA * 0.25 * Math.sin(k * Math.PI * 2) * (1 - k); FX.sy = FX.shakeA * d;
  } else { FX.sx = 0; FX.sy = 0; FX.shakeA = 0; }
}
// shot type from how it was made
function shotKind(sh, shooter) {
  if (!sh) return 'mid';
  if (sh.dunk) return M.lastPoster && M.lastPoster.p === shooter && M.time - M.lastPoster.t < 1.2 ? 'poster' : sh.big ? 'bigdunk' : 'dunk';
  const d = sh.rd || 200;
  if (sh.pts === 3) return d > 360 ? 'deep' : 'three';
  return d < 118 ? 'layup' : 'mid';
}
const MAKE_FEEL = {
  //        swish pitch, shake, cheer, callout chance
  layup: { p: 1.07, sh: 0, ch: 0.5, co: 0.2 },
  mid: { p: 1.0, sh: 0, ch: 0.6, co: 0.28 },
  three: { p: 0.96, sh: 0, ch: 1.0, co: 1 },
  deep: { p: 0.93, sh: 0, ch: 1.15, co: 1 },
  dunk: { p: 1, sh: 0, ch: 1.2, co: 1 },
  bigdunk: { p: 1, sh: 3, ch: 1.35, co: 1 },
  poster: { p: 1, sh: 4, ch: 1.6, co: 1 }
};
const CALLS = {
  layup: [['SMOOTH!', ''], ['EASY TWO', ''], ['SOFT TOUCH', '']],
  mid: [['MASHA\u2019ALLAH!', ''], ['PULL-UP J', ''], ['NOTHING BUT NET!', ''], ['MONEY MID-RANGE', '']],
  three: [['MASHA\u2019ALLAH!', 'FROM DOWNTOWN!'], ['TABARAKALLAH!', 'SPLASH FROM DEEP'], ['FROM THE CORNER!', ''], ['THREE BALL!', '']],
  deep: [['FROM WAY DOWNTOWN!', 'MASHA\u2019ALLAH'], ['LOGO RANGE!', 'TABARAKALLAH']],
  dunk: [['MASHA\u2019ALLAH!', 'SLAM DUNK'], ['TABARAKALLAH!', 'HAMMERED HOME'], ['THROWN DOWN!', '']],
  green: [['PURE GREEN!', 'PERFECT RELEASE'], ['CASH!', 'GREEN RELEASE'], ['SPLASH!', 'RIGHT ON TIME'], ['WET!', 'GREEN RELEASE'], ['TOO SMOOTH!', 'PERFECT TIMING'], ['MASHA\u2019ALLAH!', 'GREEN RELEASE'], ['NOTHING BUT NET!', 'PURE GREEN']],
  block: [['SUBHANALLAH,', 'WHAT A BLOCK!'], ['GET THAT OUT!', 'REJECTED'], ['DENIED!', 'NOT IN HERE'], ['SWATTED!', 'WHAT A CONTEST']],
  steal: [['STOLEN!', 'PICKED CLEAN'], ['SWIPED!', 'QUICK HANDS'], ['TAKEAWAY!', 'GREAT READ'], ['PICKED!', 'ALL HANDS']]
};
const _lastCall = {};
function pickCall(kind) { const pool = CALLS[kind]; let c, n = 0; do c = pick(pool); while (pool.length > 1 && c === _lastCall[kind] && n++ < 8); _lastCall[kind] = c; return c; }

// ------------------------------------------------------------- ball weight
// squash when caught, stretch when released
function ballFeel() {
  if (M.balls) return null;
  const now = performance.now(), own = ball.owner;
  if (own !== ball._vOwn) { ball._vSq = own ? -1 : 1; ball._vT = now; ball._vOwn = own; }
  const k = ball._vT ? Math.exp(-(now - ball._vT) / 50) : 0;
  return { k: k * (ball._vSq || 0), ang: Math.atan2(-(ball.vy || 0), ball.vx || 1) };
}

// ------------------------------------------------------------- timing coach
// For the first several non-green releases on this device: a small gauge above
// the shooter shows where the release landed relative to the green window.
const COACH_MAX = 14;
function coachNote(p, err, win) {
  if (p.human < 0 || win <= 0) return;
  const pr = Progress.load(); if (pr.coach >= COACH_MAX) return;
  pr.coach++; Progress.save(pr);
  p.coach = { err, win, t: 1.5 };
}
function drawCoach(g, p) {
  const c = p.coach; if (!c || c.t <= 0) return;
  c.t -= Game.rdt || 0.016;
  const a = clamp(c.t / 0.4, 0, 1), [x, y] = P(p.x, p.y + 150, p.z), w = 70, span = c.win * 6;
  const m = clamp(c.err / span, -1, 1) * (w / 2);
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(8,14,22,0.8)'; roundRect(g, x - w / 2 - 6, y - 8, w + 12, 22, 7); g.fill();
  g.fillStyle = 'rgba(255,216,77,0.45)'; g.fillRect(x - w / 12 * 3, y - 2, w / 12 * 6, 6);        // GOOD band
  g.fillStyle = '#57e389'; g.fillRect(x - w / 12, y - 2, w / 6, 6);                               // green window
  g.fillStyle = '#fff'; g.fillRect(x + m - 1, y - 5, 2.5, 12);
  g.font = `8px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#cfd8e3';
  const miss = Math.abs(c.err) - c.win;
  g.fillText(miss < c.win * 0.6 ? 'SO CLOSE' : (c.err < 0 ? 'EARLY' : 'LATE') + ' ' + Math.round(miss * 1000) + 'ms', x, y + 12);
  g.restore();
}

// ------------------------------------------------------------- sound helpers
Object.assign(SFX, {
  green() {                              // the best sound in the game: bright rising chime with a shimmer
    this.tone(1318, 0.14, 'sine', 0.1); this.tone(1760, 0.16, 'sine', 0.09, null, 0.045); this.tone(2349, 0.3, 'sine', 0.08, null, 0.09);
    this.tone(659, 0.34, 'triangle', 0.05); this.hiss(0.28, 'highpass', 6500, 0.7, 0.05, null, 0.08);
  },
  greenMake(d = 0) { this.tone(1568, 0.3, 'sine', 0.07, null, 0.02 + d); this.tone(2093, 0.4, 'sine', 0.05, null, 0.07 + d); this.tone(3136, 0.25, 'sine', 0.025, null, 0.12 + d); },
  snatch(v = 1) { this.hiss(0.08, 'bandpass', 3400, 2, 0.22 * v, 1200); this.tone(520, 0.07, 'square', 0.07 * v, 250); this.tone(880, 0.05, 'sine', 0.06 * v, null, 0.03); },
  block() { this.tone(92, 0.18, 'sine', 0.38, 50); this.hiss(0.08, 'bandpass', 1900, 1.4, 0.32, 600); this.tone(1400, 0.05, 'triangle', 0.07, 700, 0.012); },
  best() { this.tone(784, 0.12, 'sine', 0.09); this.tone(988, 0.12, 'sine', 0.09, null, 0.08); this.tone(1175, 0.24, 'sine', 0.09, null, 0.16); }
});

// ------------------------------------------------------------- defense feedback
function stealFeel(p, clean) {
  FX.cue('steal', ball.x, ball.y, ball.z);
  SFX.snatch(clean ? 1 : 0.6);
  FX.pop(p.x, p.y + 128, p.z, clean ? 'STEAL!' : 'POKED LOOSE', '#8fe3ff');
  if (clean && chance(0.55)) { const c = pickCall('steal'); FX.callout(c[0], '#8fe3ff', c[1]); }
  SFX.cheer(clean ? 0.75 : 0.4, 0.14); FX.hype(clean ? 0.55 : 0.3);
  if (clean) FX.highlight(M.players.indexOf(p), 1.8, 'STEAL');
}
function blockFeel(o, victim) {
  const big = typeof clutchNow === 'function' && clutchNow() || (M.quarter >= M.fmt.periods && Math.abs(M.teams[0].score - M.teams[1].score) <= 4 && M.clock < 30);
  const major = big || !!(victim && victim.state === 'dunk');
  SFX.block(); FX.cue('block', ball.x, ball.y, ball.z, big); if (major) { FX.shake(3, 0.2); FX.hitstop(2); camPunch(); }   // arena spectacle only for game-saving blocks
  const c = pickCall('block'); FX.callout(c[0], '#8fe3ff', big ? 'GAME-SAVING BLOCK' : c[1], big);
  FX.burst(ball.x, ball.y, ball.z, REDUCED_MOTION ? 1 : major ? 5 : 3, 'spark', ['#8fe3ff', '#e8f7ff']);
  SFX.cheer(big ? 1.6 : 1, 0.16); FX.hype(1);
  FX.highlight(M.players.indexOf(o), big ? 6 : 3.5, big ? 'GAME-SAVING BLOCK' : 'BLOCK');
}

// ------------------------------------------------------------- made shots
// Called from onScore instead of one fixed reaction: every make type sounds,
// shakes and reads a little differently.
function makeFeel(h, sh, shooter, pts, hot, buzzer, clutchBuzzer) {
  const kind = shotKind(sh, shooter), F = MAKE_FEEL[kind], green = sh && sh.green && !sh.dunk;
  // camera eases toward the hoop so the net is visible (less, or none, when play is flying the other way)
  const fast = Math.max(0, ...M.players.map(p => Math.hypot(p.vx || 0, p.vz || 0)));
  const major = kind === 'poster' || kind === 'bigdunk' || buzzer || clutchBuzzer || (sh && sh.dunkType === 'alley');
  cam.make = major ? { t: 0, h, amp: clamp(1 - (fast - 240) / 140, 0, 1) * (REDUCED_MOTION ? 0.3 : 1) } : null;
  h.sfxPitch = F.p * rand(0.97, 1.03);
  if (F.sh && major) FX.shake(F.sh, 0.26);
  // callout tier (buzzer beaters, signature moves and hot spots keep their own)
  if (clutchBuzzer) FX.shake(3, 0.28);
  else if (sh && sh.sig) {}
  else if (hot) {}
  else if (kind === 'poster') FX.callout('POSTERIZED!', '#ffd76a', 'MASHA\u2019ALLAH!', true);
  else if (kind === 'bigdunk') FX.callout('TABARAKALLAH!', '#ffd76a', 'WHAT A ' + dunkName(sh.dunkType) + '!');
  else if (green && chance(0.75)) { const c = pickCall('green'); FX.callout(c[0], '#57e389', c[1]); }
  else if (chance(F.co)) { const c = pickCall(kind === 'bigdunk' || kind === 'poster' ? 'dunk' : kind); FX.callout(c[0], kind.includes('dunk') ? '#ffd76a' : '#ffffff', c[1]); }
  if (green) FX.burst(h.x, RIM_Y - 10, h.z, REDUCED_MOTION ? 1 : 3, 'spark', ['#57e389', '#b8ffcf']);
  // crowd reaction lands after the swish so the ear hears the make first
  SFX.cheer(clutchBuzzer ? 2 : F.ch + (green ? 0.2 : 0), 0.22);
  // personal best: longest made-shot streak (humans)
  if (shooter && shooter.human >= 0) {
    shooter.mk = (shooter.mk || 0) + 1; shooter.shotOpen = false;
    const pr = Progress.load();
    if (shooter.mk > pr.streak) { pr.streak = shooter.mk; Progress.save(pr); if (shooter.mk >= 3 && !shooter.pbCalled) { shooter.pbCalled = true; FX.later(0.45, () => { FX.pop(shooter.x, shooter.y + 140, shooter.z, 'NEW BEST STREAK: ' + shooter.mk, '#9dffb0'); SFX.best(); }); } }
  }
  return kind;
}
const HL_LABEL = { layup: 'LAYUP', mid: 'JUMPER', three: 'THREE', deep: 'DEEP THREE', dunk: 'DUNK', bigdunk: 'BIG DUNK', poster: 'POSTER DUNK' };

// ------------------------------------------------------------- camera fit
// Every player stays fully on screen with padding. The fit runs on the eased
// camera too, so a lagging pan can never clip anyone.
function fitPlayers(fx, fy, z, ahead = false, pad = null) {
  const pl = M.players; if (!pl || !pl.length) return [fx, fy, z];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pl) {
    // where the player is and where he'll be in ~0.25s, so the frame opens before a fast player reaches the edge
    const lead = ahead ? 0.25 : 0, xs = [p.x, p.x + (p._cvx || 0) * lead], zs = [p.z, clamp(p.z + (p._cvz || 0) * lead, 0, COURT.D)];   // smoothed velocity
    for (let i = 0; i < 2; i++) {
      const k = depthK(zs[i]), gy = FLOOR_TOP + zs[i] * ZS;
      x0 = Math.min(x0, xs[i] - 40); x1 = Math.max(x1, xs[i] + 40);
      y0 = Math.min(y0, gy - (Math.max(0, p.y) + 160) * k); y1 = Math.max(y1, gy + 14);
    }
  }
  // The ball's apex and the target rim are part of both desired and safety fits.
  // Iterate multi-ball drills as well as the normal single-ball game.
  const count = M.balls ? M.balls.length : 1;
  for (let i = 0; i < count; i++) {
    const b = M.balls ? M.balls[i] : ball; if (!b || b.x < -100 || b.x > COURT.L + 100) continue;
    const by = FLOOR_TOP + b.z * ZS - Math.max(0, b.y) * depthK(b.z);
    x0 = Math.min(x0, b.x - 20); x1 = Math.max(x1, b.x + 20); y0 = Math.min(y0, by - 20); y1 = Math.max(y1, by + 20);
    const owner = b.owner, h = b.shot && b.shot.hoop || (owner && attackHoop(owner.team));
    if (h && (b.state === 'shot' || owner && (owner.state === 'dunk' || dxz(owner, h) < 320))) {
      x0 = Math.min(x0, h.x - 58); x1 = Math.max(x1, h.x + 58); y0 = Math.min(y0, FLOOR_TOP + h.z * ZS - (RIM_Y + 65) * depthK(h.z));
    }
  }
  const padX = pad ? pad[0] : 56, padT = pad ? pad[1] : 64, padB = pad ? pad[2] : 50, kx = K_NEAR;
  z = Math.min(z, (W - 2 * padX) / ((x1 - x0) * kx), (H - padT - padB) / (y1 - y0));
  z = Math.max(z, 0.4);
  const hw = (W / 2 - padX) / (z * kx);
  fx = x1 - x0 > 2 * hw ? (x0 + x1) / 2 : clamp(fx, x1 - hw, x0 + hw);
  const hT = (H / 2 - padT) / z, hB = (H / 2 - padB) / z;
  fy = y1 - y0 > hT + hB ? (y0 + y1) / 2 : clamp(fy, y1 - hB, y0 + hT);
  return [fx, fy, z];
}

