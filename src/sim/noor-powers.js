// ================================================= v8.6.1: POWER-UPS (the Hikmah challenge since v9.19.0)
// v9.19.0: a correct answer gives one power-up at once, chosen at random among those that can apply now (Ukhuwwah
// needs a teammate without an effect), with the match's random numbers (in an online match, the seeded ones both
// phones share). Its callout names it and says what it does. There's no picker any more. A wrong answer or a
// timeout still gives nothing. (v8.6.1-v9.18: a choice of the three used least recently.) The CPU keeps its
// situational pick. Only one effect is active per player at a time (as p.boost always was), and the meter
// doesn't fill while one is active. Player-facing words: the Hikmah challenge, the HIKMAH meter, and the glow is
// Light Upon Light; the ids (noor, NOOR_FX, p.boost, AchEvents.noor) are unchanged.
//   state: p.boost > 0 means Noor (the original glow, unchanged); p.nfx = { id, t, shots } is any other.
//   NOOR_FX order is append-only: its indexes travel in online snapshots and replay frames.
const NOOR_FX = [
  { id: 'noor', name: 'Light Upon Light', mean: 'Light', desc: '12 seconds of glow: better shooting and a longer dunk range.', short: '12 seconds: better shots, longer dunks', icon: 'light', col: '#ffe38a', t: 12 },
  { id: 'sabr', name: 'Sabr', mean: 'Patience', desc: 'Your next 3 shots get a wider green window. Ends after 3 shots or 30 seconds.', short: 'Next 3 shots: wider green window', icon: 'hourglass', col: '#8fe3ff', t: 30, shots: 3 },
  { id: 'himmah', name: 'Himmah', mean: 'Determination', desc: 'For 15 seconds you reach further for loose balls and rebounds.', short: '15 seconds: longer reach for loose balls', icon: 'reach', col: '#ffb36b', t: 15 },
  { id: 'quwwah', name: 'Quwwah', mean: 'Strength', desc: 'Turbo refills fully now, and refills twice as fast for 10 seconds.', short: 'Turbo full, refills twice as fast', icon: 'bolt', col: '#9dffb0', t: 10 },
  { id: 'yaqazah', name: 'Yaqazah', mean: 'Alertness', desc: 'Your next steal attempt within reach succeeds cleanly, with no foul. Expires after 20 seconds.', short: 'Next steal in reach is clean', icon: 'eye', col: '#c9b8ff', t: 20 },
  { id: 'ukhuwwah', name: 'Ukhuwwah', mean: 'Brotherhood', desc: 'Your teammate gets the Light Upon Light glow for 12 seconds.', short: 'Your teammate glows for 12 seconds', icon: 'pair', col: '#ffd0e0', t: 12 }
];
const NOOR_BY_ID = Object.fromEntries(NOOR_FX.map(f => [f.id, f]));
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
// one at random among the effects that can apply now (Math.random is the match's own: seeded in an online match)
function noorGift(p) { const L = NOOR_FX.map(f => f.id).filter(id => noorEligible(p, id)); return L[Math.floor(Math.random() * L.length)] || 'noor'; }
function noorUsed(p, id) { const L = noorLRU(p), i = L.indexOf(id); if (i >= 0) L.splice(i, 1); L.push(id); }

// ---- applying effects
function applyNoorFx(p, id) {
  const F = NOOR_BY_ID[id]; if (!F || !p) return;
  p.nfx = null;
  if (id === 'noor') { grantBoost.noor(p); return; }              // the original effect, unchanged (its callout: match.js)
  p.boost = 0;
  if (id === 'ukhuwwah') {
    const m = p.mate; if (!m) return;
    m.nfx = null; m.boost = 12;                                    // the teammate glows; the picker keeps no effect
    FX.callout('UKHUWWAH!', F.col, F.short.toUpperCase()); SFX.good(); AchEvents.noor(p); return;
  }
  p.nfx = { id, t: F.t, shots: F.shots || 0 };
  if (id === 'quwwah') { p.turbo = 100; p.winded = false; p._qt = 100; }
  FX.callout(F.name.toUpperCase() + '!', F.col, F.short.toUpperCase()); SFX.good(); AchEvents.noor(p);
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

// ---- a correct answer: one power-up at once. It's chosen when the answer is given (so the reveal can name it, and
// a guest sees the same one) and given when the reveal closes
{
  const _aw = answerTrivia;
  answerTrivia = function (i) {
    const r = _aw.apply(this, arguments), tv = Game.trivia;
    if (tv && tv.done && tv.correct && !tv.gift && tv.p) tv.gift = noorGift(tv.p);
    return r;
  };
  const _tu = triviaUpdate;
  triviaUpdate = function (rdt) {
    const tv = Game.trivia;
    if (tv && tv.done && tv.correct) {
      tv.res += rdt;
      if (tv.res > 1.8 || (tv.res > 0.5 && menuHit('ok'))) { Game.trivia = null; const id = tv.gift || noorGift(tv.p); noorUsed(tv.p, id); applyNoorFx(tv.p, id); }
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
// ---- HUD: the active effect next to the player (icon + name + time or shots left), and on the player card
function noorTagText(p) {
  const id = noorFxOf(p); if (!id) return null;
  const F = NOOR_BY_ID[id], N = Replay.active ? null : p.nfx;
  if (id === 'noor') return F.name.toUpperCase() + (p.boost > 0 && !Replay.active ? ' ' + Math.ceil(p.boost) + 's' : '');
  if (!N) return F.name.toUpperCase();
  return F.name.toUpperCase() + ' ' + (id === 'sabr' ? N.shots + ' ' + (N.shots === 1 ? 'shot left' : 'shots left') : Math.ceil(N.t) + 's');
}
function noorCardLabel(p) { const t = noorTagText(p); return t ? t : 'POWER-UP ACTIVE'; }
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

// ---- online (the snapshot path, ?rb=0): host is authoritative. Effects ride in the snapshot (s.nfx, optional), and
// so does the power-up a correct answer gives (s.tvg, its NOOR_FX index), for the guest's reveal. (In a rollback
// match there's no Hikmah challenge yet: hifzUsed.)
{
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    if (!s || !s.p || !M.players) return s;
    if (M.players.some(p => p.nfx)) s.nfx = M.players.map(p => p.nfx ? [NOOR_FX.findIndex(x => x.id === p.nfx.id), Math.round(p.nfx.t * 10) / 10, p.nfx.shots || 0] : 0);
    const tv = Game.trivia; if (tv && tv.gift) s.tvg = NOOR_FX.findIndex(x => x.id === tv.gift);
    return s;
  };
  const _gf = Net.guestFrame;
  Net.guestFrame = function () {
    const r = _gf.apply(this, arguments);
    const s = this.lastS; if (!s || !M.players) return r;
    M.players.forEach((p, i) => { const e = s.nfx && s.nfx[i]; p.nfx = e && NOOR_FX[e[0]] ? { id: NOOR_FX[e[0]].id, t: e[1], shots: e[2] } : null; });
    const tv = Game.trivia;
    if (tv && tv.remoteView) tv.gift = s.tvg != null && NOOR_FX[s.tvg] ? NOOR_FX[s.tvg].id : null;
    return r;
  };
}
