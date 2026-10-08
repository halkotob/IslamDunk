// ======================================================== REPLAY BUFFER
// Every sim step (or guest frame) records a compact frame of what's drawn.
// Replays and post-game highlight clips play these frames back.
const EXPRS = ['fierce', 'shock', 'joy'];
const Replay = {
  buf: [], max: 300, active: null, at: 0,
  frame() {
    return {
      ps: M.players.map(p => [p.x, p.y, p.z, p.face, p.spin || 0, p.rot || 0, p.hipH, ...JOINTS.map(k => p.j[k].a),
        p.dh === 'n' ? 0 : 1, p.sq || 0, p.cloth ? p.cloth.x : 0, p.cloth ? p.cloth.y : 0, NS.indexOf(p.state),
        (p.fire ? 1 : 0) | (p.boost > 0 ? 2 : 0), p.expr ? EXPRS.indexOf(p.expr.k) + 1 : 0]),
      b: [ball.x, ball.y, ball.z, ball.rot, ball.owner ? M.players.indexOf(ball.owner) : -1, ball.behind ? 1 : 0, ball.fire ? 1 : 0],
      cam: cam.x, h: [hoops[0].dy, hoops[1].dy]
    };
  },
  record() {
    if (M.attract || M.practice || this.active) return;
    this.buf.push(this.frame()); if (this.buf.length > this.max) this.buf.shift();
    const pend = M.pendingClips || [];
    while (pend.length && pend[0].at <= M.time) {                    // capture highlight clips a moment after the play
      const c = pend.shift(), frames = this.buf.slice(-180);
      if (frames.length > 40) { (M.highlights = M.highlights || []).push({ idx: c.idx, w: c.w, label: c.label, frames, peak: Math.max(0, frames.length - 55), share: c.share }); M.highlights.sort((a, b) => b.w - a.w); M.highlights.length = Math.min(M.highlights.length, 5); }
    }
  },
  reset() { this.buf = []; this.active = null; this.at = 0; },
  schedule(delay) { if (this.buf.length > 40) this.at = delay; },
  mark(idx, w, label) { (M.pendingClips = M.pendingClips || []).push({ idx, w, label, at: M.time + 0.9, share: clipMetadata(idx) }); },
  tick(rdt) {
    if (this.at > 0) { this.at -= rdt; if (this.at <= 0) { const fr = this.buf.slice(-210); this.active = { frames: fr, t: 0, dur: fr.length / 60 / 0.55 }; } }
    else if (this.active) { this.active.t += rdt; if (this.active.t >= this.active.dur) this.active = null; }
  },
  // swap a recorded frame into the live objects; returns a restore function
  apply(f) {
    const saved = M.players.map(p => [p.x, p.y, p.z, p.face, p.spin, p.rot, p.hipH, ...JOINTS.map(k => p.j[k].a), p.dh, p.sq, p.cloth && p.cloth.x, p.cloth && p.cloth.y, p.state, p.fire, p.boost, p.expr]);
    const sb = [ball.x, ball.y, ball.z, ball.rot, ball.owner, ball.behind, ball.fire], sc = cam.x, sh = [hoops[0].dy, hoops[1].dy];
    M.players.forEach((p, i) => {
      const r = f.ps[i]; if (!r) return; let k = 0;
      p.x = r[k++]; p.y = r[k++]; p.z = r[k++]; p.face = r[k++]; p.spin = r[k++]; p.rot = r[k++]; p.hipH = r[k++];
      for (const j of JOINTS) p.j[j].a = r[k++];
      p.dh = r[k++] ? 'f' : 'n'; p.sq = r[k++]; if (p.cloth) { p.cloth.x = r[k]; p.cloth.y = r[k + 1]; } k += 2;
      p.state = NS[r[k++]] || 'free'; const fl = r[k++]; p.fire = !!(fl & 1); p.boost = fl & 2 ? 1 : 0; const e = r[k++]; p.expr = e ? { k: EXPRS[e - 1], t: 1 } : null;
    });
    ball.x = f.b[0]; ball.y = f.b[1]; ball.z = f.b[2]; ball.rot = f.b[3]; ball.owner = f.b[4] >= 0 ? M.players[f.b[4]] : null; ball.behind = !!f.b[5]; ball.fire = !!f.b[6];
    cam.x = f.cam; hoops[0].dy = f.h[0]; hoops[1].dy = f.h[1];
    return () => {
      M.players.forEach((p, i) => {
        const r = saved[i]; let k = 0;
        p.x = r[k++]; p.y = r[k++]; p.z = r[k++]; p.face = r[k++]; p.spin = r[k++]; p.rot = r[k++]; p.hipH = r[k++];
        for (const j of JOINTS) p.j[j].a = r[k++];
        p.dh = r[k++]; p.sq = r[k++]; if (p.cloth) { p.cloth.x = r[k]; p.cloth.y = r[k + 1]; } k += 2;
        p.state = r[k++]; p.fire = r[k++]; p.boost = r[k++]; p.expr = r[k++];
      });
      [ball.x, ball.y, ball.z, ball.rot, ball.owner, ball.behind, ball.fire] = sb; cam.x = sc; hoops[0].dy = sh[0]; hoops[1].dy = sh[1];
    };
  }
};
FX.replay = delay => Replay.schedule(delay);
FX.highlight = (idx, w, label) => Replay.mark(idx, w, label);
function drawReplayOverlay(g) {
  g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(-400, 0, W + 800, 26); g.fillRect(-400, H - 26, W + 800, 26);
  g.fillStyle = '#e03a3a'; g.beginPath(); g.arc(24, 13, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = `13px ${FONT}`; g.textAlign = 'left'; g.fillText('INSTANT REPLAY', 36, 18);
  g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Enter to skip', W - 14, H - 9);
}
// Draw a recorded clip (looping) inside a rectangle
function drawClip(g, clip, x, y, w, h) {
  if (!clip || !clip.frames.length) return;
  const f = clip.frames[Math.floor((Game.t - (clip.t0 || 0)) * 60) % clip.frames.length];
  const restore = Replay.apply(f), parts = FX.parts, pops = FX.pops, flash = FX.flashA;
  FX.parts = []; FX.pops = []; FX.flashA = 0;
  sceneBox(g, x, y, w, h, () => drawScene(g, Game.t));
  FX.parts = parts; FX.pops = pops; FX.flashA = flash; restore();
  g.strokeStyle = 'rgba(232,195,90,0.7)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
}

// ===================================================== PLAYER OF THE GAME
function gameScore(s) { return s.pts + s.reb * 1.2 + s.ast * 1.5 + s.stl * 2 + s.blk * 2 + s.dnk * 0.5; }
function playerOfGame() {
  let best = 0;
  M.players.forEach((p, i) => { if (gameScore(p.stats) > gameScore(M.players[best].stats)) best = i; });
  const p = M.players[best], s = p.stats, parts = [s.pts + ' PTS'];
  if (s.reb) parts.push(s.reb + ' REB'); if (s.ast) parts.push(s.ast + ' AST'); if (s.stl) parts.push(s.stl + ' STL'); if (s.blk) parts.push(s.blk + ' BLK');
  const hl = M.highlights || [], clip = hl.find(c => c.idx === best) || hl[0] || null;
  return { p, idx: best, line: parts.slice(0, 4).join(', ') + (s.fga ? '  (' + s.fgm + '/' + s.fga + ' FG)' : ''), clip };
}

// ============================================================ HOT SPOTS
// Every so often a spot glows in the attacking half; a made jumper from it
// is worth +1. It lasts 10 seconds, then moves.
const HOT_R = 46;
function updateHot(dt) {
  if (M.practice || M.phase !== 'live') return;
  if (M.hot) { M.hot.t -= dt; if (M.hot.t <= 0) { M.hot = null; M.hotCd = rand(3, 7); } return; }
  M.hotCd = (M.hotCd == null ? rand(10, 16) : M.hotCd) - dt;
  if (M.hotCd <= 0) {
    const team = M.possTeam >= 0 ? M.possTeam : rint(2), h = attackHoop(team), a = rand(-1.1, 1.1), r = rand(150, 330);
    M.hot = { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 60, 640), t: 10 };
  }
}
function hotHit(p) { return !!(M.hot && M.hot.t > 0 && Math.hypot(p.x - M.hot.x, p.z - M.hot.z) < HOT_R); }
const hotGlow = () => radialSprite('hot', '255,190,70', 0.7);
function drawHot(g) {
  const s = M.hot; if (!s) return;
  const fade = clamp(Math.min(10 - s.t, s.t) / 0.6, 0, 1), pulse = 0.75 + 0.25 * Math.sin(Game.t * 6), [x, y] = P(s.x, 0, s.z);
  g.globalAlpha = fade * pulse; g.drawImage(hotGlow(), x - HOT_R * 1.6, y - HOT_R * ZS * 1.6, HOT_R * 3.2, HOT_R * ZS * 3.2);
  g.globalAlpha = fade; g.strokeStyle = '#ffcf6a'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, HOT_R, HOT_R * ZS, 0, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,207,106,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, HOT_R * (0.6 + 0.4 * ((Game.t * 0.8) % 1)), HOT_R * ZS * (0.6 + 0.4 * ((Game.t * 0.8) % 1)), 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ffcf6a'; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText('+1', x, y - HOT_R * ZS - 4);
  g.globalAlpha = 1;
}

// ======================================================= CLUTCH MOMENTS
// Final 10 seconds of the last period (or overtime) within 5 points.
function clutchNow() {
  const F = M.fmt; if (!F || F.first21 || M.attract || M.practice || !M.teams || M.phase !== 'live') return false;
  return M.quarter >= F.periods && M.clock <= 10 && M.clock > 0 && Math.abs(M.teams[0].score - M.teams[1].score) <= 5;
}
function clutchTick(rdt) {
  Game.clutch = (Game.screen === 'play' || Game.screen === 'netplay') && !Game.paused && clutchNow();
  if (!Game.clutch) { Game.hbT = 0; return; }
  FX.hypeV = Math.max(FX.hypeV, 0.55);                 // crowd on its feet
  Game.hbT = (Game.hbT || 0) - rdt;
  if (Game.hbT <= 0) { SFX.heart(); Game.hbT = 0.85; }
}

// ===================================================== SIGNATURE MOVES
// Human players only (turbo + shoot in the right spot), so CPU logic is unchanged.
const SIG_NAMES = { hook: 'SKY HOOK', bake: 'SHEIKH AND BAKE', stepback: 'STEP-BACK THREE', spin: 'POWER SPIN' };


function sigUpdate(p, dt) {
  const s = p.sig, h = attackHoop(p.team);
  if (!s || ball.owner !== p) { p.state = 'free'; p.sig = null; p.spin = 0; return; }
  s.t += dt;
  const ax = p.x - h.x, az = p.z - h.z, L = Math.hypot(ax, az) || 1;
  if (s.kind === 'stepback') {                                          // hop back behind the arc
    p.vx = ax / L * 300; p.vz = az / L * 180;
    if (s.t > 0.2) { p.vx *= 0.2; p.vz *= 0.2; p.sig = null; p.state = 'free'; p.sigShot = 'stepback'; startShot(p); }
  } else if (s.kind === 'bake') {                                       // shimmy, then bake the fadeaway
    p.vx = 0; p.vz = Math.sin(s.t * 34) * 90;
    if (s.def && !s.juked && s.t > 0.12 && dxz(s.def, p) < 75) { s.juked = true; if (chance(beingRead(p, 'bake') ? 0.2 : 0.45)) { s.def.stumble = 0.6; FX.pop(s.def.x, 120, s.def.z, 'SHOOK!', '#ffffff'); } }
    if (s.t > 0.36) { p.fadeVx = ax / L * 110; p.fadeVz = az / L * 40; p.sig = null; p.state = 'free'; p.vz = 0; p.sigShot = 'bake'; startShot(p); }
  } else {                                                              // power spin past the defender
    const ux = h.x + h.dir * 20 - p.x, uz = h.z - p.z, U = Math.hypot(ux, uz) || 1, side = s.def ? (sgn(p.z - s.def.z) || 1) : 1;
    p.vx = ux / U * 320; p.vz = uz / U * 320 + side * 90;
    p.spin = clamp(s.t / 0.42, 0, 1) * Math.PI * 2;
    if (s.def && !s.juked && dxz(s.def, p) < 48) { s.juked = true; if (!beingRead(p, 'spin') || chance(0.35)) s.def.stumble = 0.5; }
    if (s.t > 0.42) {
      p.spin = 0; p.sig = null; p.vx *= 0.3; p.vz *= 0.3; p.state = 'free';
      if (canDunk(p)) { startDunk(p, {}); p.act.sig = 'spin'; } else { p.sigShot = 'spin'; startShot(p); }
    }
  }
}

// ============================================================ FUN MODES
const UNLOCK_KEY = 'islamdunk.unlocks';
const FUN_MODES = [
  { key: 'bigHead', name: 'Big Head mode', how: 'Win 3 games in one Barakah Run, or enter J J J L L on team select' },
  { key: 'uncle', name: 'Uncle Mode', how: 'Win any career trophy, or enter L J L J L on team select' },
  { key: 'lowGrav', name: 'Low Gravity', how: 'Win 6 games in one Barakah Run or a National trophy in career, or enter J L L L J on team select' }
];
const CODES = { JJJLL: 'bigHead', LJLJL: 'uncle', JLLLJ: 'lowGrav' };
const Unlocks = (() => { try { return JSON.parse(localStorage.getItem(UNLOCK_KEY)) || {}; } catch (e) { return {}; } })();
function unlockFun(key, announce = true) {
  if (Unlocks[key]) return;
  Unlocks[key] = true; try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(Unlocks)); } catch (e) {}
  if (announce) { toast(FUN_MODES.find(m => m.key === key).name + ' unlocked! Turn it on in Options > Fun Modes'); SFX.good(); }
}
function activeFun() {
  const f = {}; let any = false;
  for (const m of FUN_MODES) if (Unlocks[m.key] && SETTINGS.fun[m.key]) { f[m.key] = true; any = true; }
  return any ? f : null;
}
function codeKey(ch) {
  Game.codeBuf = ((Game.codeBuf || '') + ch).slice(-5);
  const key = CODES[Game.codeBuf];
  if (key) { Ach.unlock('secret_code'); Game.codeBuf = ''; const was = Unlocks[key]; unlockFun(key, !was); SETTINGS.fun[key] = true; if (was) toast(FUN_MODES.find(m => m.key === key).name + ' on'); SFX.good(); }
}
const UNCLE_LINES = ['IN MY DAY WE PLAYED IN SLIDES!', 'PASS THE BALL, BETA!', 'BOX OUT! WHO TAUGHT YOU?', 'THAT WAS A FOUL IN 1987!',
  'MY KNEE SAYS NO. MY HEART SAYS YES!', 'CHAI AFTER THE GAME?', 'SLIDES ON, GAME ON!', 'EAT FIRST, THEN SHOOT!', 'WHO IS YOUR FATHER? I KNOW HIM!'];
function uncleTalk() { FX.callout(pick(UNCLE_LINES), '#ffd6a5', 'UNCLE MODE'); }
function funUpdate() {
  const n = FUN_MODES.length + 1;
  menuNav(n, i => { if (i === n - 1) goTitle(); else toggleFun(i); });
  if (menuHit('back')) goTitle();
}
function toggleFun(i) {
  const m = FUN_MODES[i];
  if (!Unlocks[m.key]) { toast(m.how); SFX.bad(); return; }
  SETTINGS.fun[m.key] = !SETTINGS.fun[m.key]; SFX.blip();
}
function drawFunModes(g) {
  dim(g, 0.72);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText('Fun Modes', W / 2, 100);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('For Quick Play and online games. Career stays standard.', W / 2, 128);
  const vals = FUN_MODES.map(m => Unlocks[m.key] ? (SETTINGS.fun[m.key] ? 'On' : 'Off') : 'Locked');
  drawMenu(g, [...FUN_MODES.map(m => m.name), 'Back'], Game.idx, 196, i => { if (i === FUN_MODES.length) goTitle(); else toggleFun(i); }, [...vals, '']);
  const m = FUN_MODES[Game.idx];
  if (m) { g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(Unlocks[m.key] ? ({ bigHead: 'Everyone gets a very big head.', uncle: 'Everyone plays in thobes and slides, a bit slower, with plenty of uncle commentary.', lowGrav: 'Floaty jumps and slow, high shots.' })[m.key] : 'Locked. ' + m.how + '.', W / 2, 390); }
}

// ======================================================== POST-GAME SCREEN
function finalTabs() { return ['Summary', 'Box score']; }
function canRematch() { return !!Game.lastMatch && !M.career && !Net.role; }
function rematch() {
  const L = Game.lastMatch; if (!L) return;
  newMatch(L.tA, L.tB, { humans: L.humans, venue: L.venue }); Game.screen = 'play'; Game.paused = false; Game.finalTab = 0;
}
function finalUpdate() {
  if (menuHit('left') || menuHit('right') || Input.pressed.Tab) { Game.finalTab = (Game.finalTab || 0) ? 0 : 1; SFX.blip(); }
  if (Input.pressed.KeyR && canRematch()) { rematch(); return; }
  if (menuHit('ok')) finalContinue();
}
function drawFinalScreen(g) {
  dim(g, 0.72);
  const w = M.winner, T = M.teams[w].def, tab = Game.finalTab || 0;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText(T.name.toUpperCase() + ' WIN', W / 2, 58);
  let sub = 'Final ' + M.teams[0].score + ' \u2013 ' + M.teams[1].score;
  g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText(sub, W / 2, 82);
  finalTabs().forEach((t, i) => uiButton(g, W / 2 - 150 + i * 154, 96, 146, 32, t, () => { Game.finalTab = i; }, i === tab));
  if (tab === 1) drawBoxScore(g, 140);
  else {
    const pg = playerOfGame();
    panel(g, 60, 140, 300, 280, true);
    g.textAlign = 'center'; g.fillStyle = '#f2cf6b'; g.font = `12px ${FONT}`; g.fillText('PLAYER OF THE GAME', 210, 164);
    drawPortrait(g, 150, 340, pg.p.def, pg.p.T, 1.5, null, 'idle');
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `17px ${FONT}`; g.fillText(pg.p.def.name, 200, 222);
    g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(pg.p.T.name, 200, 240);
    g.fillStyle = IVORY; g.font = `13px ${FONT}`; wrapTextLeft(g, pg.line, 200, 270, 150, 18);
    { const me = M.players.find(q => q.human === 0);                  // your green release rate this game (skill made visible)
      if (me && me.stats.tmd) { const pct = Math.round(me.stats.grn / me.stats.tmd * 100), hist = Progress.load().green.slice(-5, -1);
        g.textAlign = 'left'; g.fillStyle = '#57e389'; g.font = `12px ${FONT}`; g.fillText('YOUR GREEN RELEASES', 76, 384);
        g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText((me.stats.grn || 0) + '/' + me.stats.tmd + '  (' + pct + '%)', 76, 404);
        if (hist.length) { g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText('before: ' + hist.map(v => Math.round(v * 100) + '%').join(', '), 200, 404); } } }
    panel(g, 380, 140, 520, 280, false);
    recordGreenProgress();
    const best = (M.highlights || [])[0];                        // the single best play of the game
    if (best) {
      if (best.t0 == null) best.t0 = Game.t;
      drawClip(g, best, 392, 152, 496, 256);
      const who = M.players[best.idx], label = 'BEST PLAY: ' + (best.label || 'HIGHLIGHT') + (who ? ' \u2022 ' + who.def.name.toUpperCase() : '');
      g.font = `11px ${FONT}`; const lw = g.measureText(label).width + 22;
      g.fillStyle = 'rgba(0,0,0,0.72)'; roundRect(g, 400, 160, lw, 22, 11); g.fill();
      g.fillStyle = '#ffcf6a'; g.textAlign = 'left'; g.fillText(label, 411, 175);
      uiButton(g, 772, 372, 108, 28, '\u25B6 Replay (P)', () => { best.t0 = Game.t; }, false);
      if (Input.pressed.KeyP) best.t0 = Game.t;
    } else { g.fillStyle = '#9fb3c8'; g.font = `14px ${BODY}`; g.textAlign = 'center'; g.fillText('No highlight this game. Try for a dunk or a three!', 640, 285); }
  }
  if (Net.role === 'guest') { g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.textAlign = 'center'; g.fillText('Waiting for your friend to start a rematch', W / 2, 468); return; }
  if (canRematch()) { uiButton(g, W / 2 - 200, 446, 190, 42, 'Rematch (R)', rematch, false); uiButton(g, W / 2 + 10, 446, 190, 42, 'Continue', finalContinue, true); }
  else uiButton(g, W / 2 - 95, 446, 190, 42, 'Continue', finalContinue, true);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'center'; g.fillText('\u2190 \u2192 switch tabs, Enter to continue', W / 2, 510);
}

// ============================================================ MULTI-BALL
// Mini games can have more than one ball (Lightning uses two). Each ball's
// state lives in M.balls; the engine works on the global `ball`, so a ball's
// state is swapped in while code runs for it, then written back.
const BALL_KEYS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'px', 'py', 'pz', 'state', 'owner', 'rot', 'spin', 'shot', 'pass', 'lastTouch', 'grabLock',
  'behind', 'lastPasser', 'lastPassT', 'fire', 'ix', 'iy', 'iz', 'irot', 'kShooter'];
function newBallState(x = 1000, z = 350) {
  return { x, y: BALL_R, z, vx: 0, vy: 0, vz: 0, px: x, py: BALL_R, pz: z, state: 'loose', owner: null, rot: 0, spin: 0, shot: null, pass: null, lastTouch: null,
    grabLock: 0, behind: false, lastPasser: null, lastPassT: -9, fire: false, ix: x, iy: BALL_R, iz: z, irot: 0, kShooter: null };
}
function withBall(st, fn) { for (const k of BALL_KEYS) ball[k] = st[k]; try { return fn(); } finally { for (const k of BALL_KEYS) st[k] = ball[k]; } }
function ballStateOf(p) { return M.balls ? (M.balls.find(b => b.owner === p) || M.balls.find(b => b.kShooter === p && !b.owner) || null) : null; }
// run fn with this player's ball swapped in (or an empty ball so nothing leaks)
function withPlayerBall(p, fn) { if (!M.balls) return fn(); return withBall(ballStateOf(p) || Object.assign(newBallState(-999, 0), { state: 'scored', grabLock: 9 }), fn); }

// ============================================================ CAST ADDITIONS
Object.assign(CAST.mahmoud, { num: 87, stats: { spd: 3, sht: 9, dnk: 1, def: 3, stl: 3 } });   // old-school set shot
Object.assign(CAST.rafiq, { num: 44, stats: { spd: 4, sht: 8, dnk: 2, def: 5, stl: 4 } });     // methodical
Object.assign(CAST.khalil, { stats: { spd: 8, sht: 5, dnk: 7, def: 5, stl: 6 } });
CAST.hamid = { name: 'Sh. Hamid', num: 61, sheikh: true, mufti: true, elder: true, skin: '#9a6440', hat: 'imama', capColor: '#f7f7f2', hair: '#e8e8e8', thobe: '#4a3b2a',
  beardStyle: 3, stats: { spd: 3, sht: 8, dnk: 1, def: 4, stl: 3 } };                        // masjid elder: slow, precise
// 'you' without a career save (Quick Play mini games): a generic player
function castPlayer(id) { if (id === 'you') return C ? playerDef() : Object.assign({}, TEAMS[0].players[1], { name: 'You', num: 8 }); if (id === 'saleem') return C ? saleemDef() : Object.assign({}, CAST.saleem, { stats: { spd: 5, sht: 7, dnk: 4, def: 7, stl: 6 } }); return Object.assign({}, CAST[id]); }
const MINI_TEAM = { name: 'Masjid Al-Amanah', short: 'AMANAH', c1: '#2c6e8f', c2: '#f2cf6b', crest: 'arch' };
// timing error by character (seconds) before difficulty; elders shoot well but move slowly
const MINI_ERR = { saleem: 0.045, mahmoud: 0.035, rafiq: 0.04, hamid: 0.035, khalil: 0.07, nasser: 0.04, you: 0.05 };
const MINI_TALK = {
  saleem: { ko: ['Sorry, brother. The next round is yours.', 'Keep your elbow in next time.'], out: ['Alhamdulillah, good shot.', 'You got me fair and square.'] },
  mahmoud: { ko: ['Like 1987!', 'Uncle still has it!', 'Sit down, beta, and watch.'], out: ['My knee slipped. The knee!', 'In my day that one rims out.'] },
  rafiq: { ko: ['Patience, beta. Patience.', 'Bend the knees next time.'], out: ['Well played. Come, shake my hand.', 'Good shot. I taught you that.'] },
  hamid: { ko: ['Slow and steady, young man.', 'An old shot, but a good one.'], out: ['Masha\u2019Allah, good shooting.', 'The young ones win today.'] },
  khalil: { ko: ['LET\u2019S GO!', 'Too easy!'], out: ['No way! Rematch!', 'Okay, okay, that was clean.'] },
  nasser: { ko: ['Sorry.', 'Box out.'], out: ['Nice shot.', 'Good game.'] }
};
function miniDiffMul() { return { veryeasy: 2.1, easy: 1.6, medium: 1.0, hard: 0.7 }[SETTINGS.difficulty] || 1; }
function mvTo(p, c, x, z, turbo, slow = 1) {
  zeroCmd(c); const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
  if (d > 6) { const k = Math.min(1, d / 45) * slow; c.mx = dx / d * k; c.mz = dz / d * k; c.turbo = !!turbo && p.turbo > 12; }
  return d;
}
function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10] || 'th'); }

