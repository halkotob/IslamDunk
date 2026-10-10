
// ================================================= v8.3: PROFILE, XP AND COSMETIC REWARDS
// Everything you play earns XP: matches, mini games, King of the Court, dailies, Barakah Run, online.
// Each level unlocks one cosmetic on a 30-level track. Nothing changes how the game plays:
//   * thawb, kufi and sneaker colours: new swatches in the career creator
//   * ball skins: the ball you see in every mode (on your screen only)
//   * celebrations: what your player does after he scores
//   * titles: shown on your profile card
// Options → Profile shows your level, stats, what you've unlocked (equip it there) and what's next,
// and saves your profile card as an image.
const PROFILE_KEY = 'islamdunk.profile';
const REWARDS = [
  [2, 'title', 'gymrat', 'Gym Rat'], [3, 'ball', 'night', 'Ramadan Night ball'], [4, 'thobe', 't1', 'Emerald thawb', '#1f6b52'],
  [5, 'cele', 'heart', 'Hand on heart'], [6, 'kufi', 'k1', 'Gold kufi', '#d9b24a'], [7, 'shoe', 's1', 'Teal sneakers', '#18a39a'],
  [8, 'ball', 'sand', 'Desert Sand ball'], [9, 'title', 'sixth', 'Sixth Man'], [10, 'cele', 'fist', 'Fist pump'],
  [11, 'thobe', 't2', 'Midnight thawb', '#141c33'], [12, 'kufi', 'k2', 'Crimson kufi', '#8f1f2e'], [13, 'ball', 'green', 'Green and Gold ball'],
  [14, 'shoe', 's2', 'Sunset sneakers', '#ff7a45'], [15, 'title', 'sharp', 'Sharpshooter'], [16, 'cele', 'both', 'Both arms up'],
  [17, 'thobe', 't3', 'Sand thawb', '#d8c39a'], [18, 'ball', 'crescent', 'Crescent ball'], [19, 'kufi', 'k3', 'Indigo kufi', '#3b3b8f'],
  [20, 'title', 'mvp', 'Masjid MVP'], [21, 'shoe', 's3', 'Gold sneakers', '#e8c35a'], [22, 'cele', 'salute', 'Salute the crowd'],
  [23, 'thobe', 't4', 'Plum thawb', '#5a2d5f'], [24, 'ball', 'pearl', 'Pearl ball'], [25, 'title', 'king', 'King of the Court'],
  [26, 'kufi', 'k4', 'Pearl kufi', '#efe9dc'], [27, 'cele', 'sujood', 'Sujood of thanks'], [28, 'shoe', 's4', 'Crescent white sneakers', '#f6f6f2'],
  [29, 'ball', 'gold', 'Golden ball'], [30, 'title', 'legend', 'Ummah Legend']
].map(([lv, kind, id, name, col]) => ({ lv, kind, id, name, col }));
const PROFILE_MAX = 30;
const KIND_TXT = { title: 'Title', ball: 'Ball skin', thobe: 'Thawb colour (career creator)', kufi: 'Kufi colour (career creator)', shoe: 'Sneakers (career creator)', cele: 'Celebration' };
const BALL_SKINS = { classic: ['#ffc070', '#e7822e', '#b4521a', '#3a1a08'], night: ['#5a6fb0', '#22305e', '#10173a', '#e8c35a'], sand: ['#f3dcae', '#d2ae72', '#9c7a45', '#5a3c18'],
  green: ['#55c08a', '#1e7a4c', '#0f4a2c', '#e8c35a'], crescent: ['#f6f2e6', '#d8cfb8', '#a99e84', '#2f7f86'], pearl: ['#ffffff', '#e8eef2', '#b9c6cf', '#8a6fb0'], gold: ['#fff1b0', '#e8c35a', '#a8812e', '#5a3c10'] };
const CELE_TXT = { raise: 'Arm raised', heart: 'Hand on heart', fist: 'Fist pump', both: 'Both arms up', salute: 'Salute the crowd', sujood: 'Sujood of thanks' };
const Profile = {
  d: null,
  load() {
    if (this.d) return this.d;
    let o = null; try { o = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch (e) {}
    this.d = Object.assign({ xp: 0, equip: { title: 'none', ball: 'classic', cele: 'raise' }, stats: { games: 0, wins: 0, minis: {}, crowns: 0 }, tut: false }, o || {});
    return this.d;
  },
  save() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.d)); } catch (e) {} },
  need(n) { return 120 + 30 * (n - 1); },                         // XP from level n to n+1
  level(xp = this.load().xp) { let n = 1; while (n < PROFILE_MAX && xp >= this.need(n)) { xp -= this.need(n); n++; } return { n, into: xp, need: n < PROFILE_MAX ? this.need(n) : 0 }; },
  has(kind, id) { if (id === 'classic' || id === 'raise' || id === 'none') return true; const r = REWARDS.find(x => x.kind === kind && x.id === id); return !!r && this.level().n >= r.lv; },
  add(xp, why) {
    if (xp <= 0 || M.attract) return;
    const d = this.load(), before = this.level().n; d.xp += Math.round(xp); this.save();
    const after = this.level().n;
    toast('+' + Math.round(xp) + ' XP  •  ' + why, 2.6);
    if (after > before) {
      const got = REWARDS.filter(r => r.lv > before && r.lv <= after);
      setTimeout(() => { FX.callout('LEVEL ' + after, '#ffd76a', got.length ? 'UNLOCKED: ' + got.map(r => r.name.toUpperCase()).join(', ') : '', true); SFX.good && SFX.good(); toast('Level ' + after + (got.length ? ': ' + got.map(r => r.name).join(', ') + '. Equip it in Options → Profile.' : ''), 4.5); }, 900);
    }
  },
  stat(fn) { const d = this.load(); fn(d.stats); this.save(); }
};
// ---- earning XP
function humanPlayed() { return M.players && M.players.some(p => p.human === (Net.role === 'guest' ? 1 : 0)); }
function myTeam() { const me = M.players.find(p => p.human === (Net.role === 'guest' ? 1 : 0)); return me ? me.team : 0; }
{
  const _fm = finishMatch;
  finishMatch = function () {
    const r = _fm.apply(this, arguments);
    if (!M.attract && !M.kotc && !M.practice && humanPlayed() && !(typeof TUT !== 'undefined' && TUT.on)) {
      const t = myTeam(), won = M.winner === t, me = M.players.find(p => p.human === (Net.role === 'guest' ? 1 : 0));
      Profile.stat(s => { s.games++; if (won) s.wins++; });
      Profile.add(60 + (won ? 40 : 0) + Math.min(30, me ? me.stats.pts : 0) + (M.online ? 15 : 0), won ? 'win' : 'game played');
    }
    return r;
  };
  // mini games (Lightning, HORSE, Around the World, Daily): once, when the game ends
  const _um = updateMatch;
  updateMatch = function (dt) {
    const r = _um.apply(this, arguments);
    const mg = M.mini;
    if (mg && mg.done && !mg.xpDone && humanPlayed() && Game.screen !== 'gym') {
      mg.xpDone = true;
      let won = false;
      if (mg.kind === 'daily') { Profile.add(40, 'daily challenge'); return r; }
      try { const res = mg.result(); won = mg.kind === 'lightning' ? res.place === 1 : !!res.won; } catch (e) {}
      Profile.stat(s => { const m = s.minis[mg.kind] || (s.minis[mg.kind] = { p: 0, w: 0 }); m.p++; if (won) m.w++; });
      Profile.add(30 + (won ? 30 : 0), (MINI_GAMES.find(x => x[0] === mg.kind) || [0, 'mini game'])[1] + (won ? ' win' : ''));
    }
    if (typeof KOTC !== 'undefined' && KOTC.on && KOTC.done && !KOTC.xpDone && Net.role !== 'guest') {
      KOTC.xpDone = true;
      const me = KOTC.online ? 'khalil' : 'you', w = KOTC.wins[me] || 0, crowned = KOTC.champ === me;
      Profile.stat(s => { const m = s.minis.kotc || (s.minis.kotc = { p: 0, w: 0 }); m.p++; if (crowned) { m.w++; s.crowns++; } });
      Profile.add(20 + 15 * w + (crowned ? 60 : 0), crowned ? 'crowned King' : 'King of the Court');
    }
    return r;
  };
  const _sk = startKotc; startKotc = function () { KOTC.xpDone = false; return _sk.apply(this, arguments); };
  // the gym in career already pays BP; a small XP bonus there too
  const _fmi = typeof finishMini === 'function' ? finishMini : null;
  if (_fmi) finishMini = function () { const r = _fmi.apply(this, arguments); Profile.add(20, 'gym game'); return r; };
  // the tutorial, once
  const _te = tutEnd;
  tutEnd = function () { const d = Profile.load(); if (TUT.on && TUT_STEPS[TUT.i].final && !d.tut) { d.tut = true; Profile.save(); Profile.add(100, 'tutorial complete'); } return _te.apply(this, arguments); };
}
// ---- creator swatches: earned colours join the career creator's lists
const PROFILE_SW = { thobe: THOBES_ALL, kufi: CAPCOLS_ALL, shoe: SNEAKERS };
const PROFILE_BASE = { thobe: THOBES_ALL.length, kufi: CAPCOLS_ALL.length, shoe: SNEAKERS.length };
for (const r of REWARDS) if (PROFILE_SW[r.kind]) { r.idx = PROFILE_SW[r.kind].length; PROFILE_SW[r.kind].push(r.col); }
function swatchLocked(kind, i) { if (i < PROFILE_BASE[kind]) return false; const r = REWARDS.find(x => x.kind === kind && x.idx === i); return !r || !Profile.has(kind, r.id); }
{
  const KEY = { thobe: 'thobe', capColor: 'kufi', shoes: 'shoe' };
  const _cs = creatorStep;
  creatorStep = function (i, d) {
    const r = CREATOR_ROWS[i], kind = r && KEY[r.key];
    if (!kind) return _cs.apply(this, arguments);
    const lk = C.look, n = PROFILE_SW[kind].length; let v = lk[r.key];
    for (let k = 0; k < n; k++) { v = (v + d + n) % n; if (!swatchLocked(kind, v)) break; }
    lk[r.key] = v; SFX.blip();
  };
  // the creator's swatch rows read their lists through the row (thobe uses THOBES, which we extend too)
  const tr = CREATOR_ROWS.find(r => r.key === 'thobe'); if (tr) tr.sw = THOBES_ALL;
  const sr = CREATOR_ROWS.find(r => r.key === 'shoes'); if (sr) sr.sw = SNEAKERS;
}
// ---- ball skins
{
  const cache = {};
  const skinSprite = id => cache[id] || (cache[id] = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 40; const g = c.getContext('2d'), s = BALL_SKINS[id];
    const gr = g.createRadialGradient(15, 15, 2, 20, 20, 18); gr.addColorStop(0, s[0]); gr.addColorStop(0.6, s[1]); gr.addColorStop(1, s[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(20, 20, 17.5, 0, Math.PI * 2); g.fill(); return c;
  })());
  const _dba = drawBallAt;
  drawBallAt = function (g, x, y, z, rot, fire, feel) {
    const id = Profile.load().equip.ball;
    if (!id || id === 'classic' || !BALL_SKINS[id]) return _dba.apply(this, arguments);
    const [sx, sy] = P(x, y, z), r = (BALL_R + 0.5) * depthK(z), s = BALL_SKINS[id];
    if (fire) g.drawImage(ballFireGlow(), sx - 24, sy - 24, 48, 48);
    g.drawImage(skinSprite(id), sx - r - 0.5, sy - r - 0.5, r * 2 + 1, r * 2 + 1);
    g.save(); g.translate(sx, sy); g.rotate(rot); g.strokeStyle = s[3]; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
    g.beginPath(); g.arc(-r * 1.1, 0, r * 0.75, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r * 1.1, 0, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    if (id === 'crescent') { g.fillStyle = s[3]; g.beginPath(); g.arc(-r * 0.25, -r * 0.2, r * 0.42, 0, Math.PI * 2); g.fill(); g.fillStyle = s[1]; g.beginPath(); g.arc(-r * 0.08, -r * 0.28, r * 0.36, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.strokeStyle = s[3]; g.lineWidth = 1.4; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
  };
}
// ---- celebrations (your player only)
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments);
    if (!(p.celebrate > 0) || p.state !== 'free' || ball.owner === p || p.human !== (Net.role === 'guest' ? 1 : 0) || M.attract) return t;
    const c = Profile.load().equip.cele;
    if (c === 'heart') { t.ns = 1.15; t.ne = 2.1; }
    else if (c === 'fist') { t.ns = 2.3; t.ne = 1.9; t.nk += 0.3; t.fk += 0.3; }
    else if (c === 'both') { t.ns = 3.0; t.fs = 3.0; t.ne = 0.2; t.fe = 0.2; }
    else if (c === 'salute') { t.ns = 2.6; t.ne = 2.4; t.lean -= 0.05; }
    else if (c === 'sujood') { t.nk = 2.2; t.fk = 2.2; t.nh = 1.6; t.fh = 1.6; t.lean = 1.15; t.ns = 1.4; t.fs = 1.4; t.ne = 0.4; t.fe = 0.4; }
    return t;
  };
  const _os = onScore;
  onScore = function (h) {
    const sh = ball.shot && ball.shot.hoop === h ? ball.shot : null;
    const r = _os.apply(this, arguments);
    if (sh && sh.shooter && sh.shooter.human >= 0 && Profile.load().equip.cele === 'sujood' && sh.shooter.celebrate > 0) sh.shooter.celebrate = Math.max(sh.shooter.celebrate, 1.1);
    return r;
  };
}
// ---- the profile screen (Options → Profile)
const ProfileUI = { idx: 0 };
function profileRows() {
  const d = Profile.load(), E = d.equip, R = [];
  const opts = kind => [{ title: 'none', ball: 'classic', cele: 'raise' }[kind], ...REWARDS.filter(r => r.kind === kind && Profile.has(kind, r.id)).map(r => r.id)];
  const name = (kind, id) => kind === 'title' ? (id === 'none' ? 'None' : REWARDS.find(r => r.id === id).name) : kind === 'ball' ? (id === 'classic' ? 'Classic' : REWARDS.find(r => r.id === id).name) : CELE_TXT[id];
  for (const kind of ['title', 'ball', 'cele']) {
    const list = opts(kind);
    R.push({ label: { title: 'Title', ball: 'Ball', cele: 'Celebration' }[kind], get: () => name(kind, E[kind]) + (list.length > 1 ? '' : '  (earn more by levelling up)'), step: dd => { const i = list.indexOf(E[kind]); E[kind] = list[((i < 0 ? 0 : i) + dd + list.length) % list.length]; Profile.save(); } });
  }
  R.push({ label: 'Save profile card', start: true, step: () => saveProfileCard() });
  R.push({ label: 'Back', back: true, step: () => goTitle() });
  return R;
}
function profileTitle() { const t = Profile.load().equip.title; return t && t !== 'none' ? REWARDS.find(r => r.id === t).name : ''; }
function drawProfileCard(g, x, y) {
  const d = Profile.load(), L = Profile.level(), s = d.stats;
  panel(g, x, y, 400, 300, true);
  const def = C ? playerDef() : TEAMS[0].players[0], T = C ? amanahTeam() : TEAMS[0];
  drawPortrait(g, x + 80, y + 200, def, T, 1.5, C ? 'thobe' : null);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText(C && C.name ? C.name : 'Player', x + 160, y + 44);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(profileTitle() || 'No title yet', x + 160, y + 64);
  g.fillStyle = '#fff'; g.font = `30px ${FONT}`; g.fillText('LV ' + L.n, x + 160, y + 104);
  g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, x + 160, y + 114, 220, 10, 5); g.fill();
  if (L.need) { g.fillStyle = GOLD; roundRect(g, x + 160, y + 114, 220 * L.into / L.need, 10, 5); g.fill(); }
  g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(L.need ? L.into + ' / ' + L.need + ' XP to level ' + (L.n + 1) : 'Max level', x + 160, y + 140);
  const mw = k => (s.minis[k] || { w: 0 }).w;
  const lines = ['Games ' + s.games + '   Wins ' + s.wins, 'HORSE wins ' + mw('horse') + '   Lightning wins ' + mw('lightning'), 'Around the World wins ' + mw('atw'), 'King of the Court crowns ' + s.crowns];
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; lines.forEach((t, i) => g.fillText(t, x + 160, y + 172 + i * 20));
  g.fillStyle = '#9fb3c8'; g.font = `10px ${FONT}`; g.fillText('ISLAM DUNK', x + 160, y + 282);
}
function saveProfileCard() {
  try {
    const c = document.createElement('canvas'); c.width = 820; c.height = 620; const g = c.getContext('2d');
    g.scale(2, 2); g.fillStyle = '#0b1520'; g.fillRect(0, 0, 410, 310); drawProfileCard(g, 5, 5);
    const a = document.createElement('a'); a.download = 'islam-dunk-profile.png'; a.href = c.toDataURL('image/png'); a.click(); toast('Profile card saved', 2);
  } catch (e) { toast('Couldn’t save the card here', 2); }
}
function drawProfile(g) {
  dim(g, 0.8);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText('Profile', W / 2, 46);
  drawProfileCard(g, 30, 70);
  const R = profileRows(), list = R.map(r => ({ label: r.label, value: r.start || r.back ? null : r.get() }));
  g.save(); g.translate(240, 0);
  drawMenuList(g, 'profile', list, Game.idx, 100, 42, i => { Game.idx = i; R[i].step(1); }, i => { Game.idx = i; }, true, 380);
  g.restore();
  // what's next on the track
  const L = Profile.level(), next = REWARDS.filter(r => r.lv > L.n).slice(0, 4);
  panel(g, 450, 350, 480, 150, false);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(next.length ? 'COMING UP' : 'TRACK COMPLETE', 468, 374);
  next.forEach((r, i) => { g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Level ' + r.lv + ':  ' + r.name, 468, 398 + i * 22); g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(KIND_TXT[r.kind], 720, 398 + i * 22); if (r.col) { g.fillStyle = r.col; roundRect(g, 690, 387 + i * 22, 22, 12, 6); g.fill(); } });
  g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.textAlign = 'left'; g.fillText('Every mode earns XP. Rewards are cosmetic only.', 30, 392);
}
function profileUpdate() {
  const R = profileRows(); Game.idx = clamp(Game.idx | 0, 0, R.length - 1);
  menuNav(R.length, i => R[i].step(1));
  const r = R[Game.idx]; if (!r.start && !r.back) { if (menuHit('left')) { r.step(-1); SFX.blip(); } if (menuHit('right')) { r.step(1); SFX.blip(); } }
  if (menuHit('back')) goTitle();
}
{
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    return _tm().map(e => e.label !== 'Options' ? e : Object.assign({}, e, { sub: [{ label: 'Profile  (LV ' + Profile.level().n + ')', act: () => { Game.screen = 'profile'; Game.idx = 0; } }, ...e.sub] }));
  };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const was = Game.screen === 'profile'; _gu.apply(this, arguments); if (was && Game.screen === 'profile') { profileUpdate(); attractTick(rdt); } };
  const _r = render;
  render = function (g) {
    _r(g); if (Game.screen !== 'profile') return;
    const rw = W, ox = Math.round((W - 960) / 2); g.save(); g.translate(ox, 0); W = 960; Game.ox = ox; drawProfile(g); W = rw; Game.ox = 0; g.restore(); drawBackButton(g);
  };
  BACK.profile = () => goTitle();
}
