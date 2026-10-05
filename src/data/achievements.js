// ============================================================ ACHIEVEMENTS
// Data table + tracker, kept separate so it can later map onto a platform API
// (e.g. Steam: each entry has an `api` name; unlock() is the only write path).
// kind: 'once' (unlocks on its event) or 'count' (progress toward goal).
const ACHIEVEMENTS = [
  { id: 'first_win', api: 'ACH_FIRST_WIN', name: 'Alhamdulillah', desc: 'Win your first game', icon: 'trophy' },
  { id: 'win_10', api: 'ACH_WIN_10', name: 'Regular', desc: 'Win 10 games', icon: 'trophy', goal: 10 },
  { id: 'blowout', api: 'ACH_BLOWOUT', name: 'Statement Game', desc: 'Win by 15 or more', icon: 'trophy' },
  { id: 'comeback', api: 'ACH_COMEBACK', name: 'Sabr Pays Off', desc: 'Win after trailing by 8 or more', icon: 'trophy' },
  { id: 'first_green', api: 'ACH_FIRST_GREEN', name: 'Pure', desc: 'Hit your first green release', icon: 'green' },
  { id: 'green_25', api: 'ACH_GREEN_25', name: 'Green Machine', desc: 'Hit 25 green releases', icon: 'green', goal: 25 },
  { id: 'green_game5', api: 'ACH_GREEN_GAME5', name: 'Wet All Night', desc: 'Hit 5 green releases in one game', icon: 'green' },
  { id: 'first_three', api: 'ACH_FIRST_THREE', name: 'From Downtown', desc: 'Make a three-pointer', icon: 'ball' },
  { id: 'first_dunk', api: 'ACH_FIRST_DUNK', name: 'Slam', desc: 'Dunk it', icon: 'dunk' },
  { id: 'dunk_25', api: 'ACH_DUNK_25', name: 'Rim Protector\u2019s Nightmare', desc: 'Dunk 25 times', icon: 'dunk', goal: 25 },
  { id: 'poster', api: 'ACH_POSTER', name: 'Posterized', desc: 'Dunk right over a defender', icon: 'dunk' },
  { id: 'buzzer', api: 'ACH_BUZZER', name: 'At the Horn', desc: 'Hit a buzzer beater', icon: 'clock' },
  { id: 'streak_5', api: 'ACH_STREAK_5', name: 'Heat Check', desc: 'Make 5 shots in a row', icon: 'fire' },
  { id: 'on_fire', api: 'ACH_ON_FIRE', name: 'He\u2019s On Fire', desc: 'Catch fire', icon: 'fire' },
  { id: 'block_3', api: 'ACH_BLOCK_3', name: 'Not In Here', desc: 'Block 3 shots in one game', icon: 'hand' },
  { id: 'first_steal', api: 'ACH_FIRST_STEAL', name: 'Quick Hands', desc: 'Get a steal', icon: 'hand' },
  { id: 'ankles', api: 'ACH_ANKLES', name: 'Crossed Up', desc: 'Wrong-foot a defender with a crossover', icon: 'ball' },
  { id: 'charge', api: 'ACH_CHARGE', name: 'Take the Charge', desc: 'Draw an offensive foul', icon: 'hand' },
  { id: 'ft_20', api: 'ACH_FT_20', name: 'Money at the Line', desc: 'Make 20 free throws', icon: 'ball', goal: 20 },
  { id: 'noor_1', api: 'ACH_NOOR_1', name: 'Noor', desc: 'Earn a Noor boost', icon: 'moon' },
  { id: 'noor_10', api: 'ACH_NOOR_10', name: 'Light Upon Light', desc: 'Earn 10 Noor boosts', icon: 'moon', goal: 10 },
  { id: 'salah_1', api: 'ACH_SALAH_1', name: 'Answered the Call', desc: 'Play a career game with the salah bonus', icon: 'masjid' },
  { id: 'salah_10', api: 'ACH_SALAH_10', name: 'On Time, Every Time', desc: 'Play 10 career games with the salah bonus', icon: 'masjid', goal: 10 },
  { id: 'stage_state', api: 'ACH_STAGE_STATE', name: 'Going State', desc: 'Reach the State stage in career', icon: 'trophy' },
  { id: 'stage_nat', api: 'ACH_STAGE_NAT', name: 'Nationals', desc: 'Reach the National stage in career', icon: 'trophy' },
  { id: 'stage_world', api: 'ACH_STAGE_WORLD', name: 'The Whole Ummah', desc: 'Reach the World stage in career', icon: 'trophy' },
  { id: 'world_cup', api: 'ACH_WORLD_CUP', name: 'World Ummah Cup', desc: 'Win the World Ummah Cup', icon: 'trophy' },
  { id: 'horse_win', api: 'ACH_HORSE_WIN', name: 'H-O-R-S-E', desc: 'Win a game of HORSE', icon: 'ball' },
  { id: 'horse_clean', api: 'ACH_HORSE_CLEAN', name: 'Not a Letter', desc: 'Win HORSE without taking a letter', icon: 'ball', hidden: true },
  { id: 'lightning_win', api: 'ACH_LIGHTNING_WIN', name: 'Last One Standing', desc: 'Win Lightning', icon: 'ball' },
  { id: 'daily_goal', api: 'ACH_DAILY_GOAL', name: 'Daily Visitor', desc: 'Complete a Daily Hot Spot Challenge', icon: 'clock' },
  { id: 'online_win', api: 'ACH_ONLINE_WIN', name: 'Brotherhood', desc: 'Win an online game', icon: 'masjid' },
  { id: 'venues_8', api: 'ACH_VENUES_8', name: 'Globetrotter', desc: 'Play at 8 different venues', icon: 'ball', goal: 8 },
  { id: 'books_10', api: 'ACH_BOOKS_10', name: 'Student of Knowledge', desc: 'Learn 10 answers from the sheikh\u2019s bookshelf', icon: 'book', goal: 10 },
  { id: 'good_company', api: 'ACH_GOOD_COMPANY', name: 'Good Company', desc: 'Talk with everyone in the musalla', icon: 'masjid', hidden: true, goal: 4 },
  { id: 'uncle_mode', api: 'ACH_UNCLE_MODE', name: 'Just Like 1987', desc: 'Play a game in Uncle Mode', icon: 'moon', hidden: true },
  { id: 'secret_code', api: 'ACH_SECRET_CODE', name: 'Secret Handshake', desc: 'Enter an unlock code', icon: 'moon', hidden: true },
  { id: 'net_catch', api: 'ACH_NET_CATCH', name: 'Hung Up', desc: 'Dunk so hard the net catches on the rim', icon: 'dunk', hidden: true }
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
const Ach = {
  key: 'islamdunk.achievements',
  data: null,
  load() { if (this.data) return this.data; try { this.data = Object.assign({ un: {}, prog: {}, sets: {} }, JSON.parse(localStorage.getItem(this.key) || '{}')); } catch (e) { this.data = { un: {}, prog: {}, sets: {} }; } return this.data; },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
  has(id) { return !!this.load().un[id]; },
  // the single write path (a platform backend would hook in here)
  unlock(id) {
    const d = this.load(), a = ACH_BY_ID[id]; if (!a || d.un[id]) return false;
    d.un[id] = Date.now(); this.save(); achToast(a); return true;
  },
  add(id, n = 1) { const d = this.load(), a = ACH_BY_ID[id]; if (!a || d.un[id]) return; d.prog[id] = Math.min(a.goal, (d.prog[id] || 0) + n); this.save(); if (d.prog[id] >= a.goal) this.unlock(id); },
  set(id, v) { const d = this.load(), a = ACH_BY_ID[id]; if (!a || d.un[id]) return; d.prog[id] = Math.min(a.goal, Math.max(d.prog[id] || 0, v)); this.save(); if (d.prog[id] >= a.goal) this.unlock(id); },
  addUnique(id, key) { const d = this.load(); const s = d.sets[id] = d.sets[id] || []; if (!s.includes(key)) { s.push(key); this.set(id, s.length); } },
  progress(id) { const a = ACH_BY_ID[id]; return a.goal ? (this.load().prog[id] || 0) / a.goal : this.has(id) ? 1 : 0; },
  count() { return Object.keys(this.load().un).filter(id => ACH_BY_ID[id]).length; }   // retired ids (old Ramadan Tournament) stay stored but don't count
};
// Achievement events. Only the local player's own actions count (P1 / P2 on this device).
const isMine = p => !!p && p.human >= 0 && !M.attract && (Net.role === 'host' ? p.human === 0 : Net.role === 'guest' ? p.human === 1 : true);
const AchEvents = {
  green(p) { if (!isMine(p)) return; Ach.unlock('first_green'); Ach.add('green_25'); if ((p.stats.grn || 0) >= 5) Ach.unlock('green_game5'); },
  make(p, kind, buzzer) {
    if (!isMine(p)) return;
    if (kind === 'three' || kind === 'deep') Ach.unlock('first_three');
    if (kind === 'dunk' || kind === 'bigdunk' || kind === 'poster') { Ach.unlock('first_dunk'); Ach.add('dunk_25'); }
    if (kind === 'poster') Ach.unlock('poster');
    if (buzzer) Ach.unlock('buzzer');
    if ((p.mk || 0) >= 5) Ach.unlock('streak_5');
  },
  fire(p) { if (isMine(p)) Ach.unlock('on_fire'); },
  block(p) { if (!isMine(p)) return; if ((p.stats.blk || 0) >= 3) Ach.unlock('block_3'); },
  steal(p) { if (isMine(p)) Ach.unlock('first_steal'); },
  ankles(p) { FX.cue('ankles', p.x, 2, p.z); if (isMine(p)) Ach.unlock('ankles'); },
  charge(p) { if (isMine(p)) Ach.unlock('charge'); },
  ftMade(p) { if (isMine(p)) Ach.add('ft_20'); },
  noor(p) { if (isMine(p)) { Ach.unlock('noor_1'); Ach.add('noor_10'); } },
  gameEnd(won, margin, maxDef) {
    if (M.attract || M.practice || M.mini) return;
    if (M.venue || !M.gym) Ach.addUnique('venues_8', M.venue ? M.venue.id + (M.venue.backdrop || '') : 'classic');
    if (M.fun && M.fun.uncle && M.players.some(isMine)) Ach.unlock('uncle_mode');
    if (!won) return;
    Ach.unlock('first_win'); Ach.add('win_10');
    if (margin >= 15) Ach.unlock('blowout');
    if (maxDef >= 8) Ach.unlock('comeback');
    if (M.online) Ach.unlock('online_win');
  }
};
// toast: small and tasteful, top-right, never blocks the screen
const _achQ = [];
function achToast(a) { _achQ.push({ a, t: 0 }); SFX.best && SFX.best(); }
function drawAchToast(g) {
  const q = _achQ[0]; if (!q) return;
  q.t += Game.rdt || 0.016; const life = 3.2; if (q.t > life) { _achQ.shift(); return; }
  const cards = TouchUI.shown && !TouchUI.portrait && M.players ? M.players.filter(p => p.human >= 0).length : 0;   // touch landscape: player cards sit top-right
  const k = Math.min(1, q.t / 0.25, (life - q.t) / 0.35), w = 280, x = W - w - 14 + (1 - k) * 40, y = 56 + cards * 62;
  g.save(); g.globalAlpha = clamp(k, 0, 1);
  g.fillStyle = 'rgba(8,14,22,0.9)'; roundRect(g, x, y, w, 50, 12); g.fill(); g.strokeStyle = 'rgba(242,207,107,0.6)'; g.lineWidth = 1.5; g.stroke();
  drawAchIcon(g, q.a.icon, x + 26, y + 25, 15, true);
  g.textAlign = 'left'; g.fillStyle = '#f2cf6b'; g.font = `10px ${FONT}`; g.fillText('ACHIEVEMENT UNLOCKED', x + 50, y + 20);
  g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(fitText(g, q.a.name, w - 62), x + 50, y + 38);
  g.restore();
}
function drawAchIcon(g, icon, x, y, r, on) {
  g.save();
  g.fillStyle = on ? '#1e5a4a' : 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = on ? '#f2cf6b' : 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5; g.stroke();
  const c = on ? '#f2cf6b' : '#6d7a8c'; g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 1.6;
  const s = r / 15;
  if (icon === 'trophy') { g.beginPath(); g.moveTo(x - 6 * s, y - 7 * s); g.lineTo(x + 6 * s, y - 7 * s); g.lineTo(x + 4 * s, y + 1 * s); g.lineTo(x - 4 * s, y + 1 * s); g.closePath(); g.fill(); g.fillRect(x - 1 * s, y + 1 * s, 2 * s, 4 * s); g.fillRect(x - 4 * s, y + 5 * s, 8 * s, 2 * s); }
  else if (icon === 'green') { g.fillStyle = on ? '#57e389' : c; g.beginPath(); g.arc(x, y, 6 * s, 0, Math.PI * 2); g.fill(); }
  else if (icon === 'ball') { g.beginPath(); g.arc(x, y, 7 * s, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x - 7 * s, y); g.lineTo(x + 7 * s, y); g.moveTo(x, y - 7 * s); g.lineTo(x, y + 7 * s); g.stroke(); }
  else if (icon === 'dunk') { g.beginPath(); g.ellipse(x, y - 1 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x - 6 * s, y + 1 * s); g.lineTo(x - 3 * s, y + 7 * s); g.lineTo(x + 3 * s, y + 7 * s); g.lineTo(x + 6 * s, y + 1 * s); g.stroke(); }
  else if (icon === 'clock') { g.beginPath(); g.arc(x, y, 7 * s, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 5 * s); g.moveTo(x, y); g.lineTo(x + 4 * s, y); g.stroke(); }
  else if (icon === 'fire') { g.fillStyle = on ? '#ff8a2a' : c; g.beginPath(); g.moveTo(x, y - 8 * s); g.quadraticCurveTo(x + 8 * s, y, x, y + 7 * s); g.quadraticCurveTo(x - 8 * s, y, x, y - 8 * s); g.fill(); }
  else if (icon === 'hand') { g.fillRect(x - 5 * s, y - 2 * s, 10 * s, 8 * s); for (let i = 0; i < 4; i++) g.fillRect(x - 5 * s + i * 2.7 * s, y - 8 * s, 2 * s, 7 * s); }
  else if (icon === 'moon') crescent(g, x, y, 7 * s, c);
  else if (icon === 'masjid') { g.beginPath(); g.arc(x, y + 1 * s, 6 * s, Math.PI, 0); g.fill(); g.fillRect(x - 7 * s, y + 1 * s, 14 * s, 6 * s); g.fillRect(x + 8 * s, y - 6 * s, 2 * s, 13 * s); }
  else if (icon === 'book') { g.fillRect(x - 7 * s, y - 5 * s, 6 * s, 11 * s); g.fillRect(x + 1 * s, y - 5 * s, 6 * s, 11 * s); }
  g.restore();
}
// Achievements screen: two pages, locked/unlocked, progress for multi-step, hidden until earned
function drawAchievements(g) {
  dim(g, 0.78);
  const per = 16, pages = Math.ceil(ACHIEVEMENTS.length / per), pg = clamp(Game.achPage || 0, 0, pages - 1);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.fillText('Achievements', W / 2, 46);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(Ach.count() + ' of ' + ACHIEVEMENTS.length + ' unlocked  \u2022  page ' + (pg + 1) + ' of ' + pages + '  (\u2190 \u2192)', W / 2, 68);
  ACHIEVEMENTS.slice(pg * per, pg * per + per).forEach((a, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = W / 2 - 440 + col * 450, y = 86 + row * 52, on = Ach.has(a.id), secret = a.hidden && !on;
    g.fillStyle = on ? 'rgba(30,90,74,0.55)' : 'rgba(255,255,255,0.05)'; roundRect(g, x, y, 430, 46, 10); g.fill();
    drawAchIcon(g, secret ? 'moon' : a.icon, x + 24, y + 23, 15, on);
    g.textAlign = 'left'; g.fillStyle = on ? '#fff' : '#9fb3c8'; g.font = `14px ${FONT}`; g.fillText(secret ? 'Hidden achievement' : a.name, x + 48, y + 20);
    g.fillStyle = on ? '#cfe8dc' : '#6d7a8c'; g.font = `12px ${BODY}`; g.fillText(secret ? 'Keep exploring\u2026' : a.desc, x + 48, y + 37);
    if (a.goal && !on && !secret) {
      const pr = Ach.load().prog[a.id] || 0; g.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(g, x + 300, y + 28, 110, 6, 3); g.fill();
      g.fillStyle = '#f2cf6b'; roundRect(g, x + 300, y + 28, 110 * pr / a.goal, 6, 3); g.fill();
      g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `10px ${FONT}`; g.fillText(pr + ' / ' + a.goal, x + 410, y + 22);
    } else if (on) { g.textAlign = 'right'; g.fillStyle = '#57e389'; g.font = `11px ${FONT}`; g.fillText('\u2713 UNLOCKED', x + 418, y + 20); }
  });
  addRect(0, 0, W, H, () => { Game.achPage = (pg + 1) % pages; });
}

