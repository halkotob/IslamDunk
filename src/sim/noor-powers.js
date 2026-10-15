// ================================================= v8.6.1: NOOR POWER-UPS
// A correct Noor answer now opens a short choice: one of three effects, each named for a virtue. No
// chance is involved: the three shown are always the three this player used least recently, and the
// player sees exactly what each one does before picking. A wrong answer or a timeout still gives
// nothing (unchanged). Only one effect is active per player at a time (as p.boost always was), and the
// Noor meter doesn't fill while one is active.
//   state: p.boost > 0 means Noor (the original glow, unchanged); p.nfx = { id, t, shots } is any other.
//   NOOR_FX order is append-only: its indexes travel in online snapshots and replay frames.
const NOOR_FX = [
  { id: 'noor', name: 'Noor', mean: 'Light', desc: '12 seconds of glow: better shooting and a longer dunk range.', icon: 'light', col: '#ffe38a', t: 12 },
  { id: 'sabr', name: 'Sabr', mean: 'Patience', desc: 'Your next 3 shots get a wider green window. Ends after 3 shots or 30 seconds.', icon: 'hourglass', col: '#8fe3ff', t: 30, shots: 3 },
  { id: 'himmah', name: 'Himmah', mean: 'Determination', desc: 'For 15 seconds you reach further for loose balls and rebounds.', icon: 'reach', col: '#ffb36b', t: 15 },
  { id: 'quwwah', name: 'Quwwah', mean: 'Strength', desc: 'Turbo refills fully now, and refills twice as fast for 10 seconds.', icon: 'bolt', col: '#9dffb0', t: 10 },
  { id: 'yaqazah', name: 'Yaqazah', mean: 'Alertness', desc: 'Your next steal attempt within reach succeeds cleanly, with no foul. Expires after 20 seconds.', icon: 'eye', col: '#c9b8ff', t: 20 },
  { id: 'ukhuwwah', name: 'Ukhuwwah', mean: 'Brotherhood', desc: 'Your teammate gets the Noor glow for 12 seconds.', icon: 'pair', col: '#ffd0e0', t: 12 }
];
const NOOR_BY_ID = Object.fromEntries(NOOR_FX.map(f => [f.id, f]));
const NOOR_PICK_T = 10;                  // seconds to choose; then the highlighted card is taken
const SABR_WIN = 1.25, SABR_CAP = 1.4;   // +25% green window; with Barakah Run 'green' the total is capped at +40%
const HIMMAH_REACH = 12;                 // extra grab reach (game units)

function noorFxOf(p) {
  if (!p) return null;
  if (Replay.active && p._rfx !== undefined) return p._rfx;
  if (p.boost > 0) return 'noor';
  return p.nfx && p.nfx.t > 0 ? p.nfx.id : null;
}
function noorActive(p) { return !!noorFxOf(p); }
// least recently used first, per human slot, for the whole session
function noorLRU(p) {
  const L = Game.noorLRU || (Game.noorLRU = {}), k = p.human >= 0 ? p.human : 'cpu';
  return L[k] || (L[k] = ['noor', 'sabr', 'quwwah', 'himmah', 'yaqazah', 'ukhuwwah']);
}
function noorEligible(p, id) {
  if (id !== 'ukhuwwah') return true;
  const m = p.mate; return !!m && !noorActive(m);                // brotherhood needs a teammate without an effect
}
function noorOptions(p) { return noorLRU(p).filter(id => noorEligible(p, id)).slice(0, 3); }
function noorUsed(p, id) { const L = noorLRU(p), i = L.indexOf(id); if (i >= 0) L.splice(i, 1); L.push(id); }

// ---- applying effects
function applyNoorFx(p, id) {
  const F = NOOR_BY_ID[id]; if (!F || !p) return;
  p.nfx = null;
  if (id === 'noor') { grantBoost.noor(p); return; }              // the original effect, unchanged
  p.boost = 0;
  if (id === 'ukhuwwah') {
    const m = p.mate; if (!m) return;
    m.nfx = null; m.boost = 12;                                    // the teammate glows; the picker keeps no effect
    FX.callout('UKHUWWAH!', F.col, m.def.name.toUpperCase() + ' IS GLOWING'); SFX.good(); AchEvents.noor(p); return;
  }
  p.nfx = { id, t: F.t, shots: F.shots || 0 };
  if (id === 'quwwah') { p.turbo = 100; p.winded = false; p._qt = 100; }
  FX.callout(F.name.toUpperCase() + '!', F.col, F.mean.toUpperCase() + '  •  ' + p.def.name.toUpperCase()); SFX.good(); AchEvents.noor(p);
}
function noorExpire(p) {
  const F = p.nfx && NOOR_BY_ID[p.nfx.id]; p.nfx = null;
  if (F && isMine(p)) FX.pop(p.x, p.y + 150, p.z, F.name.toUpperCase() + ' ' + 'has ended', '#9fb3c8');
}
// CPU players pick by situation (no randomness)
function cpuNoorPick(p) {
  const bo = ball.owner;
  if (p.turbo < 35) return 'quwwah';
  if (bo && bo.team === p.team && dxz(bo, attackHoop(p.team)) < COURT.L / 2 && (p.def.arch === 'sharpshooter' || (p.st.sht || 0) >= 7)) return 'sabr';
  if (bo && bo.team !== p.team && dxz(p, bo) < 120) return 'yaqazah';
  return 'noor';
}
{
  const _gb = grantBoost;                                          // original + achievement wrapper
  grantBoost = function (p) { if (p && p.human < 0) { applyNoorFx(p, cpuNoorPick(p)); return; } return _gb.apply(this, arguments); };
  grantBoost.noor = p => _gb(p);
  // one effect at a time: the meter waits while any effect is active
  const _ah = addHifz;
  addHifz = function (p) { if (p && p.nfx) return; return _ah.apply(this, arguments); };
}

// ---- ticking (host / offline sim only; the guest mirrors the snapshot)
{
  const _um = updateMatch;
  updateMatch = function (dt) {
    _um.apply(this, arguments);
    if (!M.players) return;
    for (const p of M.players) {
      const N = p.nfx; if (!N) { p._qt = undefined; continue; }
      if (N.id === 'quwwah') {                                     // twice as fast: repeat whatever regen this step gave
        if (p._qt != null && p.turbo > p._qt) p.turbo = Math.min(100, p.turbo + (p.turbo - p._qt));
        p._qt = p.turbo;
      }
      N.t -= dt;
      if (N.t <= 0 || (N.id === 'sabr' && N.shots <= 0)) noorExpire(p);
    }
  };
}
// Sabr: a wider green window for the next 3 shots (FTs count; dunks don't use the window)
{
  const _sw = shotWindow;
  shotWindow = function (p) {
    const w = _sw.apply(this, arguments);
    if (!(w > 0) || noorFxOf(p) !== 'sabr') return w;
    const g = p.team === 0 && typeof runRank === 'function' ? 1 + 0.08 * runRank('green') : 1;   // Barakah Run 'green' already in w
    return Math.min(w * SABR_WIN, (w / g) * SABR_CAP);
  };
  const _rs = releaseShot;
  releaseShot = function (p) {
    const n0 = (p.stats.fga || 0) + (p.stats.fta || 0), r = _rs.apply(this, arguments);
    if (p.nfx && p.nfx.id === 'sabr' && (p.stats.fga || 0) + (p.stats.fta || 0) > n0) p.nfx.shots--;
    return r;
  };
}
// Himmah: further reach for loose balls and rebounds
{
  const _cg = checkGrab;
  checkGrab = function () {
    const H = M.players.filter(p => p.nfx && p.nfx.id === 'himmah'), kept = H.map(p => p.st.hus);
    H.forEach(p => { p.st.hus = st7(p, 'hus') + HIMMAH_REACH / 1.2; });   // the grab rule reads hustle: +1 hustle = +1.2 units
    try { return _cg.apply(this, arguments); }
    finally { H.forEach((p, i) => { if (kept[i] === undefined) delete p.st.hus; else p.st.hus = kept[i]; }); }
  };
}
// Yaqazah: the next steal attempt within reach is clean (no reach-in foul, no fumble)
{
  const _ts = trySteal;
  trySteal = function (p) {
    const h = ball.owner;
    if (p.nfx && p.nfx.id === 'yaqazah' && p.cd.steal <= 0 && h && h.team !== p.team && dxz(p, h) < 54 && h.y < 10 && (h.state === 'free' || h.state === 'pass' || h.state === 'land')
      && !(M.bc && typeof retreating === 'function' && retreating(p))) {
      p.nfx = null;
      p.cd.steal = 0.5; p.state = 'steal'; p.st_t = 0; p.face = sgn(h.x - p.x);
      giveBall(p, 'steal'); stealFeel(p, true); react(h, 'headDown', 0.9);
      FX.pop(p.x, p.y + 140, p.z, 'YAQAZAH', NOOR_BY_ID.yaqazah.col);
      return;
    }
    return _ts.apply(this, arguments);
  };
}

// ---- the choice screen (after the correct-answer reveal)
function noorOpenPick(tv) { tv.pick = { opts: noorOptions(tv.p), sel: 0, t: NOOR_PICK_T }; SFX.blip(); }
function noorChoose(tv, i) {
  const P = tv.pick; if (!P || P.done) return;
  const id = P.opts[clamp(i | 0, 0, P.opts.length - 1)]; P.done = true;
  Game.trivia = null; noorUsed(tv.p, id); applyNoorFx(tv.p, id);
}
{
  const _tu = triviaUpdate;
  triviaUpdate = function (rdt) {
    const tv = Game.trivia;
    if (tv && tv.pick) {
      const P = tv.pick, n = P.opts.length; P.t -= rdt;
      if (tv.remote) { const a = Net.remoteAnswer(); if (a && a.qi === tv.qi && a.k != null) return noorChoose(tv, a.k); }
      else {
        if (menuHit('left') || menuHit('up')) { P.sel = (P.sel + n - 1) % n; SFX.blip(); }
        if (menuHit('right') || menuHit('down')) { P.sel = (P.sel + 1) % n; SFX.blip(); }
        for (let i = 0; i < n; i++) if (Input.pressed['Digit' + (i + 1)]) return noorChoose(tv, i);
        if (menuHit('ok') || Input.pressed.KeyJ || Input.pressed.KeyK) return noorChoose(tv, P.sel);
      }
      if (P.t <= 0) noorChoose(tv, P.sel);
      return;
    }
    if (tv && tv.done && tv.correct) {                              // correct: reveal as before, then the choice instead of the boost
      tv.res += rdt;
      if (tv.res > 1.8 || (tv.res > 0.5 && menuHit('ok'))) noorOpenPick(tv);
      return;
    }
    return _tu.apply(this, arguments);
  };
}
function noorIcon(g, icon, x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s / 10, s / 10); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (icon === 'light') { g.arc(0, 0, 3.2, 0, Math.PI * 2); g.fill(); g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5); g.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5); } g.stroke(); }
  else if (icon === 'hourglass') { g.moveTo(-5, -8); g.lineTo(5, -8); g.lineTo(-5, 8); g.lineTo(5, 8); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-2.5, 5.5); g.lineTo(2.5, 5.5); g.lineTo(0, 2.5); g.closePath(); g.fill(); }
  else if (icon === 'reach') { g.moveTo(0, 8); g.lineTo(0, -6); g.moveTo(-5, -1); g.lineTo(0, -7); g.lineTo(5, -1); g.stroke(); g.beginPath(); g.moveTo(-7, 8); g.lineTo(7, 8); g.stroke(); }
  else if (icon === 'bolt') { g.moveTo(2, -9); g.lineTo(-5, 1); g.lineTo(0, 1); g.lineTo(-2, 9); g.lineTo(5, -1); g.lineTo(0, -1); g.closePath(); g.fill(); }
  else if (icon === 'eye') { g.moveTo(-8.5, 0); g.quadraticCurveTo(0, -8, 8.5, 0); g.quadraticCurveTo(0, 8, -8.5, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 2.8, 0, Math.PI * 2); g.fill(); }
  else if (icon === 'pair') { g.arc(-3.2, 0, 5, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(3.2, 0, 5, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}
function drawNoorPick(g, tv) {
  const P = tv.pick || tv.pickView; if (!P) return;
  const mine = !tv.remote;                                          // host waiting on the guest sees a banner
  if (!mine) { dim(g, 0.5); banner(g, 'Noor challenge', 'Your friend answered correctly and is choosing a power-up...'); return; }
  dim(g, 0.72);
  g.fillStyle = 'rgba(12,40,44,0.97)'; roundRect(g, 150, 70, 660, 400, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText('CHOOSE YOUR NOOR', W / 2, 108);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Correct! ' + tv.p.def.name + ' picks one of these three', W / 2, 130);
  const sel = tv.remoteView ? (tv.psel || 0) : P.sel;
  P.opts.forEach((id, i) => {
    const F = NOOR_BY_ID[id]; if (!F) return;
    const x = 168 + i * 212, y = 150, w = 200, h = 252, on = i === sel;
    g.fillStyle = on ? 'rgba(232,195,90,0.18)' : 'rgba(255,255,255,0.06)'; roundRect(g, x, y, w, h, 12); g.fill();
    g.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.18)'; g.lineWidth = on ? 3 : 1; g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + w / 2, y + 46, 26, 0, Math.PI * 2); g.fill();
    noorIcon(g, F.icon, x + w / 2, y + 46, 16, F.col);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `22px ${FONT}`; g.fillText(F.name, x + w / 2, y + 102);
    g.fillStyle = F.col; g.font = `14px ${BODY}`; g.fillText(F.mean, x + w / 2, y + 122);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; wrapText(g, F.desc, x + w / 2, y + 152, w - 24, 19);
    g.fillStyle = on ? GOLD : '#9fb3c8'; g.font = `13px ${FONT}`; g.fillText(String(i + 1), x + w / 2, y + h - 12);
    addRect(x, y, w, h, () => { if (tv.remoteView) Net.guestPick(i); else { P.sel = i; noorChoose(tv, i); } });
  });
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(200, 418, 560, 6); g.fillStyle = GOLD; g.fillRect(200, 418, 560 * clamp(P.t / NOOR_PICK_T, 0, 1), 6);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
  g.fillText(tv.sent2 ? 'Sent. Waiting for the game to continue...' : 'Press 1 to 3, or ← → and Enter. Tap a card on touch.', W / 2, 450);
}
{
  const _dt = drawTrivia;
  drawTrivia = function (g) { const tv = Game.trivia; if (tv && (tv.pick || tv.pickView)) return drawNoorPick(g, tv); return _dt.apply(this, arguments); };
}

// ---- HUD: the active effect next to the player (icon + name + time or shots left), and on the player card
function noorTagText(p) {
  const id = noorFxOf(p); if (!id) return null;
  const F = NOOR_BY_ID[id], N = Replay.active ? null : p.nfx;
  if (id === 'noor') return F.name.toUpperCase() + (p.boost > 0 && !Replay.active ? ' ' + Math.ceil(p.boost) + 's' : '');
  if (!N) return F.name.toUpperCase();
  return F.name.toUpperCase() + ' ' + (id === 'sabr' ? N.shots + ' ' + (N.shots === 1 ? 'shot left' : 'shots left') : Math.ceil(N.t) + 's');
}
function noorCardLabel(p) { const t = noorTagText(p); return t ? t : 'NOOR ACTIVE'; }
function noorCardFrac(p) {
  const id = noorFxOf(p); if (!id) return p.hifz / 100;
  if (id === 'noor') return p.boost / 12;
  const F = NOOR_BY_ID[id], N = p.nfx; if (!N) return 1;
  return id === 'sabr' ? Math.min(N.shots / F.shots, N.t / F.t) : N.t / F.t;
}
function noorCardCol(p) { const id = noorFxOf(p); return id ? NOOR_BY_ID[id].col : '#57d68d'; }
{
  const _dp = drawPlayer;
  drawPlayer = function (g, p) {
    const r = _dp.apply(this, arguments);
    if (p._refl || M.attract || !M.players || !M.players.includes(p)) return r;
    const txt = noorTagText(p); if (!txt) return r;
    const F = NOOR_BY_ID[noorFxOf(p)], [tx, ty] = P(p.x, p.y + 138, p.z);
    g.save(); g.font = `10px ${FONT}`;
    const w = g.measureText(txt).width + 26;
    g.fillStyle = 'rgba(8,14,22,0.82)'; roundRect(g, tx - w / 2, ty - 18, w, 16, 8); g.fill();
    g.strokeStyle = F.col; g.lineWidth = 1; g.stroke();
    noorIcon(g, F.icon, tx - w / 2 + 10, ty - 10, 6, F.col);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(txt, tx - w / 2 + 19, ty - 6);
    g.restore();
    return r;
  };
}

// ---- replays: the effect is packed into the player's flag bits (bit 0 fire, bit 1 boost, bits 2-4 effect + 1)
const REPLAY_FL = 7 + JOINTS.length + 5;
{
  const _fr = Replay.frame.bind(Replay), _ap = Replay.apply.bind(Replay);
  Replay.frame = function () {
    const f = _fr();
    f.ps.forEach((r, i) => { const id = noorFxOf(M.players[i]), k = id ? NOOR_FX.findIndex(x => x.id === id) + 1 : 0; r[REPLAY_FL] |= (k & 7) << 2; });
    return f;
  };
  Replay.apply = function (f) {
    const restore = _ap(f);
    M.players.forEach((p, i) => { const r = f.ps[i]; const k = r ? (r[REPLAY_FL] >> 2) & 7 : 0; p._rfx = k ? NOOR_FX[k - 1].id : null; });
    return () => { restore(); for (const p of M.players) p._rfx = undefined; };
  };
}

// ---- online: host is authoritative. Effects ride in the snapshot (s.nfx, optional); the guest's pick
// travels with its trivia answer (ans.k), and the choice screen is mirrored (s.tvp).
{
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    if (!s || !s.p || !M.players) return s;
    if (M.players.some(p => p.nfx)) s.nfx = M.players.map(p => p.nfx ? [NOOR_FX.findIndex(x => x.id === p.nfx.id), Math.round(p.nfx.t * 10) / 10, p.nfx.shots || 0] : 0);
    const tv = Game.trivia; if (tv && tv.remote && tv.pick) s.tvp = [tv.pick.opts.map(id => NOOR_FX.findIndex(x => x.id === id)), Math.round(tv.pick.t * 10) / 10];
    return s;
  };
  const _ra = Net.remoteAnswer;
  Net.remoteAnswer = function () {                                 // { qi, i, k }: k = the chosen power-up card (when sent)
    const a = _ra.apply(this, arguments); if (!a) return a;
    return { qi: a.qi, i: a.i, k: a.k == null ? null : a.k | 0 };
  };
  Net.guestPick = function (k) {
    const tv = Game.trivia; if (!tv || !tv.pickView || tv.sent2) return;
    tv.sent2 = true; tv.psel = k; this.setP({ ans: { qi: tv.qi, i: tv.choice, k } }); SFX.blip();
  };
  const _gt = Net.guestTrivia;
  Net.guestTrivia = function () {
    const tv = Game.trivia;
    if (tv && tv.pickView) {
      if (tv.sent2) return;
      const n = tv.pickView.opts.length; tv.psel = tv.psel || 0;
      if (menuHit('left') || menuHit('up')) { tv.psel = (tv.psel + n - 1) % n; SFX.blip(); }
      if (menuHit('right') || menuHit('down')) { tv.psel = (tv.psel + 1) % n; SFX.blip(); }
      for (let i = 0; i < n; i++) if (Input.pressed['Digit' + (i + 1)]) return this.guestPick(i);
      if (menuHit('ok') || Input.pressed.KeyJ || Input.pressed.KeyK) this.guestPick(tv.psel);
      return;
    }
    return _gt.apply(this, arguments);
  };
  const _gf = Net.guestFrame;
  Net.guestFrame = function () {
    const r = _gf.apply(this, arguments);
    const s = this.lastS; if (!s || !M.players) return r;
    M.players.forEach((p, i) => { const e = s.nfx && s.nfx[i]; p.nfx = e && NOOR_FX[e[0]] ? { id: NOOR_FX[e[0]].id, t: e[1], shots: e[2] } : null; });
    const tv = Game.trivia;
    if (tv && tv.remoteView) {
      if (s.tvp && s.tv && s.tv[0] === tv.qi) tv.pickView = { opts: s.tvp[0].map(k => (NOOR_FX[k] || NOOR_FX[0]).id), t: s.tvp[1] };
      else tv.pickView = null;
    }
    return r;
  };
}
