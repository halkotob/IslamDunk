// ================================================= v8.6: KING OF THE COURT FIXES, 7 UP, CUSTOM MINI GAMES
// King of the Court
//   * The CPU no longer gets stuck in the corners. After a change of possession the ball has to go
//     back out past the arc; from a corner the old target was still inside the arc, so the CPU kept
//     dribbling into the corner. It now clears out toward the wing.
//   * The winner (the king) starts the next game with the ball.
// 7 Up
//   Pick any spot and shoot. Inside the arc is 1, a three is 2. Keep shooting until you miss. First
//   to exactly 7 wins: go over and you bust back to 4.
// Custom game (Mini games → Custom game, and online)
//   Build your own shooting game: how you score, where you shoot from, how turns work, what it takes
//   to win. Name it, save it, and share it with a code. 7 Up and a few classics are presets.
// ---------------------------------------------------------------- King of the Court
{
  const _th = Brain.prototype.thinkHandler;
  Brain.prototype.thinkHandler = function () {
    _th.apply(this, arguments);
    const p = this.p;
    if (!(M.halfCourt && M.mustClear && M.mustClear[p.team]) || this.plan.type !== 'probe') return;
    const h = attackHoop(p.team), dx = (p.x - h.x) * h.dir, dz = p.z - h.z;
    const a = clamp(Math.atan2(dz, Math.max(1, dx)), -0.85, 0.85), r = THREE_R + 45;   // out toward the wing, never the corner
    this.plan.target = { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 80, COURT.D - 80) };
  };
  kotcNext = function () {
    const K = KOTC, winner = !!K.last; K.chal = K.queue.shift(); K.games++; K.overT = 0; K.last = null;
    const ids = [K.king, K.chal], humans = [];
    ids.forEach((id, t) => { if (K.humans[id] != null) humans.push({ team: t, slot: 0, pad: K.humans[id] }); });
    if (K.online && Net.role === 'host') { Net.mid++; Net.evs = []; }
    kotcBuild(ids, humans);
    const first = winner ? 0 : 1;                                       // the winner (the king) has it first
    formation(first); inbound(first);
    K.spect = humans.length === 0;
    FX.callout(K.games === 1 ? 'KING OF THE COURT' : 'NEXT UP', '#ffd76a', kotcName(K.chal).toUpperCase() + ' CHALLENGES ' + kotcName(K.king).toUpperCase());
  };
}
// ---------------------------------------------------------------- rules for the shooting games
const MR_OPTS = {
  scoring: [['makes', 'Every make is 1'], ['distance', 'Inside 1, three 2'], ['streak', 'Makes in a row'], ['spots', 'Spots cleared']],
  spots: [['pick', 'Pick your spot'], ['fixed', 'Fixed spots in order'], ['random', 'Random spot each shot']],
  turn: [['miss', 'Until you miss'], ['1', '1 shot'], ['3', '3 shots'], ['5', '5 shots'], ['t20', '20 seconds'], ['t30', '30 seconds']],
  target: [3, 5, 7, 10, 11, 15, 21],
  exact: [['off', 'Off'], ['on', 'On, bust to half']],
  shotClock: [0, 5, 8, 12],
  matches: [1, 3, 5],
  players: [2, 3, 4, 5],
  minDist: [0, 120, 200]
};
const MR_PRESETS = [
  { id: 'sevenup', name: '7 Up', r: { scoring: 'distance', spots: 'pick', turn: 'miss', target: 7, exact: 'on', shotClock: 8, matches: 1, players: 3, minDist: 120 } },
  { id: 'twentyone', name: '21', r: { scoring: 'distance', spots: 'pick', turn: '3', target: 21, exact: 'on', shotClock: 8, matches: 1, players: 3, minDist: 120 } },
  { id: 'streak', name: 'Hot Hand', r: { scoring: 'streak', spots: 'random', turn: 'miss', target: 5, exact: 'off', shotClock: 8, matches: 3, players: 2, minDist: 120 } },
  { id: 'clock', name: 'Beat the Clock', r: { scoring: 'makes', spots: 'random', turn: 't30', target: 15, exact: 'off', shotClock: 0, matches: 1, players: 2, minDist: 120 } },
  { id: 'spots', name: 'Spot Up', r: { scoring: 'spots', spots: 'fixed', turn: 'miss', target: 7, exact: 'off', shotClock: 8, matches: 3, players: 2, minDist: 0 } }
];
const MR_KEY = 'islamdunk.minirules';
const MR = { d: null, sel: 'sevenup', edit: null, row: 0 };
function mrLoad() { if (MR.d) return MR.d; try { MR.d = JSON.parse(localStorage.getItem(MR_KEY) || 'null'); } catch (e) {} MR.d = MR.d || { sets: [], last: 'sevenup' }; MR.sel = MR.d.last || 'sevenup'; return MR.d; }
function mrSave() { try { localStorage.setItem(MR_KEY, JSON.stringify(mrLoad())); } catch (e) {} }
function mrAll() { return [...MR_PRESETS, ...mrLoad().sets]; }
function mrGet(id) { return mrAll().find(s => s.id === id) || MR_PRESETS[0]; }
function mrClean(r) {
  const o = Object.assign({}, MR_PRESETS[0].r, r || {});
  for (const k of ['scoring', 'spots', 'turn', 'exact']) if (!MR_OPTS[k].some(x => x[0] === o[k])) o[k] = MR_PRESETS[0].r[k];
  for (const k of ['target', 'shotClock', 'matches', 'players', 'minDist']) if (!MR_OPTS[k].includes(+o[k])) o[k] = MR_PRESETS[0].r[k]; else o[k] = +o[k];
  if (o.scoring === 'spots') o.spots = 'fixed';
  return o;
}
function mrDescribe(r) {
  const t = MR_OPTS.turn.find(x => x[0] === r.turn)[1].toLowerCase(), sc = MR_OPTS.scoring.find(x => x[0] === r.scoring)[1].toLowerCase();
  const sp = MR_OPTS.spots.find(x => x[0] === r.spots)[1].toLowerCase();
  return [sp[0].toUpperCase() + sp.slice(1) + '. ' + sc[0].toUpperCase() + sc.slice(1) + '. Shoot ' + t + '.',
    'First to ' + (r.exact === 'on' ? 'exactly ' : '') + r.target + (r.exact === 'on' ? ' (go over and you bust to ' + Math.floor(r.target / 2) + ')' : '') + (r.matches > 1 ? ', best of ' + r.matches : '') + '.',
    (r.shotClock ? r.shotClock + ' seconds per shot. ' : '') + (r.minDist && r.spots === 'pick' ? 'No layups: shoot from outside the circle.' : '')];
}
function mrCode(set) { const js = JSON.stringify({ k: 'R', n: set.name, r: set.r }); return 'ID1-' + (hash32(js) % 46656).toString(36).padStart(3, '0') + '-' + b64enc(js); }
function mrImport(code) {
  const m = /ID1-([0-9a-z]{3})-([A-Za-z0-9_-]+)/.exec((code || '').replace(/\s+/g, ''));
  if (!m) return { err: 'That doesn’t look like an Islam Dunk code.' };
  let js, o; try { js = b64dec(m[2]); o = JSON.parse(js); } catch (e) { return { err: 'The code is cut off. Copy all of it.' }; }
  if ((hash32(js) % 46656).toString(36).padStart(3, '0') !== m[1] || o.k !== 'R') return { err: o && o.k && o.k !== 'R' ? 'That code is a team or player: import it in Teams & Players.' : 'The code is cut off. Copy all of it.' };
  const set = { id: csId(), name: csClean(String(o.n || '').slice(0, 18), 'Imported game'), r: mrClean(o.r) };
  mrLoad().sets.push(set); MR.sel = set.id; mrLoad().last = set.id; mrSave();
  return { ok: 'Imported game: ' + set.name };
}
// ---------------------------------------------------------------- the game itself
const CG_WAIT = [{ x: 800, z: 640 }, { x: 760, z: 600 }, { x: 840, z: 600 }, { x: 720, z: 640 }];
function cgFixedSpot(k, n) { const h = hoops[1], a = -1.25 + (n > 1 ? k * (2.5 / (n - 1)) : 1.25), r = 230; return { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 70, 630) }; }
function cgRandomSpot(R) { const h = hoops[1], a = rand(-1.15, 1.15), r = chance(0.4) ? THREE_R + 20 : rand(Math.max(R.minDist, 130), 280); return { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 70, 630) }; }
class CustomGame {
  constructor(opts) {
    this.kind = opts.kind || 'custom'; this.online = !!opts.online;
    this.R = mrClean(opts.rules); this.name = opts.name || 'Custom game';
    const n = M.players.length;
    this.score = Array(n).fill(0); this.streak = Array(n).fill(0); this.best = Array(n).fill(0); this.wins = Array(n).fill(0); this.spotK = Array(n).fill(0);
    this.turn = 0; this.shotsLeft = 0; this.turnT = 0; this.clock = 0; this.t = 0; this.gap = 0.6; this.live = null; this.done = false; this.winner = null; this.msg = ''; this.said = null; this.match = 1;
    M.players.forEach((p, i) => { const w = CG_WAIT[i % CG_WAIT.length]; place(p, w.x, w.z); });
    this.beginTurn();
  }
  shotsPerTurn() { return /^\d+$/.test(this.R.turn) ? +this.R.turn : 0; }
  turnTime() { return this.R.turn[0] === 't' ? +this.R.turn.slice(1) : 0; }
  spotFor(i) {
    const R = this.R;
    if (R.spots === 'fixed') return cgFixedSpot(Math.min(this.spotK[i], (R.scoring === 'spots' ? R.target : 7) - 1), R.scoring === 'spots' ? R.target : 7);
    if (R.spots === 'random') return this.rspot || (this.rspot = cgRandomSpot(R));
    return null;
  }
  beginTurn() {
    const i = this.turn, p = M.players[i];
    this.shotsLeft = this.shotsPerTurn(); this.turnT = this.turnTime(); this.rspot = null;
    this.give(i, true);
    this.msg = miniName(i) + (this.R.spots === 'pick' ? ': pick your spot and shoot' : ': shoot from the glowing spot');
  }
  give(i, start) {                                                       // the ball to the shooter, at his spot
    const p = M.players[i], st = M.balls[0], sp = this.spotFor(i);
    if (sp) { place(p, sp.x, sp.z); M.hot = { x: sp.x, z: sp.z, t: 9 }; }
    else { M.hot = null; if (start) place(p, 900, 350); }
    p.face = sgn(hoops[1].x - p.x) || 1; p.mRel = false;
    Object.assign(st, { owner: p, state: 'held', shot: null, pass: null, kShooter: p, vx: 0, vy: 0, vz: 0, grabLock: 0 });
    this.live = null; this.clock = this.R.shotClock; this.wait = rand(0.45, 0.9); this.cpuSpot = null;
  }
  tooClose(p) { return this.R.spots === 'pick' && this.R.minDist && dxz(p, hoops[1]) < this.R.minDist; }
  lock(p, c) {
    const i = M.players.indexOf(p); c.a = false;
    if (i !== this.turn || this.gap > 0 || this.done) { const w = CG_WAIT[i % CG_WAIT.length]; mvTo(p, c, w.x, w.z, false, 0.7); c.b = false; c.bHeld = false; p.buf = null; return; }
    if (this.R.spots !== 'pick') { c.mx = 0; c.mz = 0; c.turbo = false; c.face = sgn(hoops[1].x - p.x) || 1; }
    else if (this.tooClose(p) && c.b) { c.b = false; c.bHeld = false; p.buf = null; this.blocked = 1.2; }
    if (canDunk(p) && c.b) { c.b = false; c.bHeld = false; this.blocked = 1.2; }                     // shooting games: no dunks
  }
  ai(p, c) {
    const i = M.players.indexOf(p), h = hoops[1]; miniRelease(p, M.balls[0]); zeroCmd(c);
    if (i !== this.turn || this.gap > 0 || this.done) { const w = CG_WAIT[i % CG_WAIT.length]; mvTo(p, c, w.x, w.z, false, 0.7); return; }
    if (M.balls[0].owner !== p) return;
    if (this.R.spots === 'pick') {
      if (!this.cpuSpot) {                                              // pick a spot from the score and his shooting
        const need = this.R.exact === 'on' ? this.R.target - this.score[i] : 99, sht = (p.def.stats || {}).sht || 5;
        const three = this.R.scoring === 'distance' && need >= 2 && (sht >= 7 ? chance(0.6) : chance(0.25));
        const a = rand(-1.1, 1.1), r = three ? THREE_R + 22 : rand(Math.max(this.R.minDist + 20, 130), THREE_R - 40);
        this.cpuSpot = { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 70, 630) };
      }
      const d = mvTo(p, c, this.cpuSpot.x, this.cpuSpot.z, false, 0.9);
      if (d > 10) return;
      zeroCmd(c);
    }
    c.face = sgn(h.x - p.x) || 1;
    if (p.state === 'free' && (this.wait -= STEP) <= 0) c.b = true;
  }
  grab() {}
  onScore(h) {
    h.kick(ball.shot && ball.shot.touched ? 'rimin' : 'swish', 1.1, ball.x - h.x, ball.z - h.z, ball.shot && ball.shot.green ? 1 : 0);
    ball.state = 'scored'; ball.shot = null;
    if (this.live) this.live.made = true;
  }
  addPoints(i, pts) {
    const R = this.R;
    if (R.scoring === 'streak') { this.streak[i]++; this.best[i] = Math.max(this.best[i], this.streak[i]); this.score[i] = this.streak[i]; }
    else if (R.scoring === 'spots') { this.spotK[i]++; this.score[i] = this.spotK[i]; }
    else this.score[i] += pts;
    if (R.exact === 'on' && this.score[i] > R.target) { this.score[i] = Math.floor(R.target / 2); if (R.scoring === 'streak') this.streak[i] = this.score[i]; FX.callout('BUST!', '#ff9a8a', miniName(i).toUpperCase() + ' BACK TO ' + this.score[i]); return false; }
    return this.score[i] >= R.target;
  }
  endTurn() { this.turn = (this.turn + 1) % M.players.length; this.gap = 0.9; }
  update(dt) {
    this.t += dt; if (this.said) { this.said.t -= dt; if (this.said.t <= 0) this.said = null; }
    if (this.blocked > 0) { this.blocked -= dt; this.msg = canDunk(M.players[this.turn]) || this.tooClose(M.players[this.turn]) ? 'No layups or dunks: step back outside the circle' : this.msg; }
    if (this.done) { this.doneT += dt; return; }
    if (this.gap > 0) { this.gap -= dt; if (this.gap <= 0) this.beginTurn(); return; }
    const i = this.turn, p = M.players[i], st = M.balls[0], R = this.R;
    if (this.turnT > 0) { this.turnT -= dt; if (this.turnT <= 0 && !this.live) { FX.callout('TIME!', '#ff9a8a', miniName(i).toUpperCase()); this.endTurn(); return; } }
    if (!this.live) {
      if (st.state === 'shot' && st.shot && st.shot.shooter === p) this.live = { t: 0, made: false, pts: isThree(p.x, p.z, hoops[1]) ? 2 : 1 };
      else if (R.shotClock && st.owner === p) { this.clock -= dt; if (this.clock <= 0) { this.live = { t: 9, made: false, pts: 0, timeout: true }; FX.callout('SHOT CLOCK!', '#ff9a8a'); } }
      return;
    }
    const L = this.live; L.t += dt;
    if (!(L.timeout || (L.made && L.t > 0.45) || (!L.made && st.state === 'loose' && (st.y < 30 || L.t > 2.4)) || L.t > 3.4)) return;
    let keep;
    if (L.made) {
      const pts = R.scoring === 'distance' ? L.pts : 1, won = this.addPoints(i, pts);
      FX.pop(p.x, p.y + 130, p.z, R.scoring === 'distance' ? '+' + pts : R.scoring === 'streak' ? this.streak[i] + ' IN A ROW' : R.scoring === 'spots' ? 'NEXT SPOT' : '+1', '#9dffb0');
      if (won) return this.winMatch(i);
      keep = R.turn === 'miss';
    } else {
      if (R.scoring === 'streak') { if (this.streak[i] >= 2) FX.pop(p.x, p.y + 130, p.z, 'STREAK OVER', '#ff9a8a'); this.streak[i] = 0; this.score[i] = 0; }
      keep = false;
    }
    if (this.shotsPerTurn()) { this.shotsLeft--; keep = this.shotsLeft > 0; }
    if (this.turnTime()) keep = this.turnT > 0;
    if (keep) { this.rspot = null; this.gap = 0; this.give(i, false); this.msg = miniName(i) + (this.shotsPerTurn() ? ': ' + this.shotsLeft + ' shot' + (this.shotsLeft === 1 ? '' : 's') + ' left' : ': keep shooting'); }
    else this.endTurn();
  }
  winMatch(i) {
    this.wins[i]++;
    const need = Math.ceil(this.R.matches / 2);
    if (this.wins[i] >= need) {
      this.done = true; this.doneT = 0; this.winner = i; M.hot = null;
      FX.callout(miniDoes(i, 'win').toUpperCase() + '!', '#ffd76a', this.name.toUpperCase(), true); SFX.buzzer(); return;
    }
    FX.callout(miniDoes(i, 'take').toUpperCase() + ' GAME ' + this.match, '#ffd76a', 'FIRST TO ' + need);
    this.match++; this.score.fill(0); this.streak.fill(0); this.spotK.fill(0);
    this.turn = (i + 1) % M.players.length; this.gap = 1.6;
  }
  result() { const me = Math.max(0, M.players.findIndex(q => q.human >= 0)); return { won: this.winner === me, mine: this.score[me], place: this.winner === me ? 1 : 2 }; }
  snap() { return { k: 'C', n: this.name, r: this.R, sc: this.score, st: this.streak, w: this.wins, sk: this.spotK, tu: this.turn, sl: this.shotsLeft, tt: r1(this.turnT), cl: r1(this.clock), m: this.msg, mt: this.match, d: this.done ? 1 : 0, wn: this.winner == null ? -1 : this.winner }; }
  applySnap(s) { this.name = s.n; this.R = mrClean(s.r); this.score = s.sc; this.streak = s.st; this.wins = s.w; this.spotK = s.sk; this.turn = s.tu; this.shotsLeft = s.sl; this.turnT = s.tt; this.clock = s.cl; this.msg = s.m; this.match = s.mt; this.done = !!s.d; this.winner = s.wn < 0 ? null : s.wn; }
}
function setupCustomMini(kind, opts) {
  const set = opts.set || mrGet(kind === 'sevenup' ? 'sevenup' : MR.sel), R = mrClean(opts.rules || set.r);
  const n = clamp(R.players, 2, 5), roster = opts.roster ? opts.roster.slice(0, Math.max(2, opts.roster.length)) : ['you', ...shuffle(MINI_OPPS.map(o => o[0])).slice(0, n - 1)];
  M.miniIds = roster;
  const tA = Object.assign({}, MINI_TEAM, { players: roster.map(castPlayer) }), tB = Object.assign({}, MINI_TEAM, { players: [] });
  newMatch(tA, tB, { humans: opts.humans || [{ team: 0, slot: 0, pad: 0 }], practice: kind, aiCfg: [DIFF.medium, DIFF.medium] });
  M.miniIds = roster; M.drawExtras = null; M.phase = 'live';
  M.balls = [newBallState()];
  M.mini = new CustomGame({ kind, online: opts.online, rules: R, name: set.name });
  cam.x = 1380 - W;
}
{
  const _sm = setupMini;
  setupMini = function (kind, opts) { if (kind === 'sevenup' || kind === 'custom') return setupCustomMini(kind, opts || {}); return _sm.apply(this, arguments); };
  // HUD: everyone's score, whose turn it is, and the clocks
  const _hud = drawMiniHUD;
  drawMiniHUD = function (g) {
    const mg = M.mini; if (!mg || !(mg instanceof CustomGame)) return _hud.apply(this, arguments);
    const oy = Game.screen === 'gym' ? 16 : 0; g.save(); g.translate(0, oy);
    const n = M.players.length, w = 150, x0 = W / 2 - (n * (w + 8) - 8) / 2, R = mg.R;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `12px ${FONT}`; g.fillText(mg.name.toUpperCase() + '  •  ' + (R.exact === 'on' ? 'EXACTLY ' : 'FIRST TO ') + R.target + (R.matches > 1 ? '  •  GAME ' + mg.match : ''), W / 2, 46);
    M.players.forEach((p, i) => {
      const x = x0 + i * (w + 8), y = 52, up = mg.turn === i && !mg.done;
      g.fillStyle = up ? 'rgba(232,195,90,0.92)' : 'rgba(8,14,22,0.86)'; roundRect(g, x, y, w, 40, 10); g.fill();
      if (p.human >= 0) { g.strokeStyle = p.human === 0 ? '#ff7a7a' : '#6ab8ff'; g.lineWidth = 2; g.stroke(); }
      g.textAlign = 'left'; g.fillStyle = up ? NIGHT : '#fff'; g.font = `12px ${FONT}`; g.fillText(miniName(i), x + 10, y + 16);
      g.font = `18px ${FONT}`; g.textAlign = 'right'; g.fillText(String(mg.score[i]), x + w - 10, y + 30);
      g.textAlign = 'left'; g.font = `10px ${FONT}`; g.fillStyle = up ? 'rgba(11,19,48,0.8)' : '#9fb3c8';
      g.fillText(R.matches > 1 ? '●'.repeat(mg.wins[i]) + '○'.repeat(Math.max(0, Math.ceil(R.matches / 2) - mg.wins[i])) : R.scoring === 'streak' ? 'BEST ' + mg.best[i] : '', x + 10, y + 32);
    });
    let bar = null;
    if (mg.turnTime() && !mg.done && mg.gap <= 0) bar = [mg.turnT / mg.turnTime(), '#ffcf6a'];
    else if (R.shotClock && !mg.live && !mg.done && mg.gap <= 0) bar = [mg.clock / R.shotClock, mg.clock < 3 ? '#e05a5a' : '#8fe3ff'];
    if (bar) { g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, W / 2 - 150, 98, 300, 7, 3.5); g.fill(); g.fillStyle = bar[1]; roundRect(g, W / 2 - 150, 98, 300 * clamp(bar[0], 0, 1), 7, 3.5); g.fill(); }
    if (mg.msg && !mg.done) { g.textAlign = 'center'; g.font = `13px ${BODY}`; const tw = g.measureText(mg.msg).width + 30; g.fillStyle = 'rgba(8,14,22,0.78)'; roundRect(g, W / 2 - tw / 2, 112, tw, 24, 12); g.fill(); g.fillStyle = IVORY; g.fillText(mg.msg, W / 2, 129); }
    g.restore();
  };
  const _res = drawMiniResult;
  drawMiniResult = function (g) {
    const mg = M.mini; if (!mg || !(mg instanceof CustomGame)) return _res.apply(this, arguments);
    if (!mg.done || (mg.doneT || 0) < 1.2) return;
    dim(g, 0.6);
    g.fillStyle = 'rgba(12,40,44,0.96)'; roundRect(g, W / 2 - 230, 130, 460, 260, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(mg.name.toUpperCase(), W / 2, 174);
    g.fillStyle = '#fff'; g.font = `15px ${BODY}`;
    const order = M.players.map((p, i) => i).sort((a, b) => (mg.wins[b] - mg.wins[a]) || (mg.score[b] - mg.score[a]));
    order.slice(0, 5).forEach((i, k) => g.fillText((k === 0 ? '♛ ' : ordinal(k + 1) + '  ') + miniName(i) + (mg.R.matches > 1 ? '   ' + mg.wins[i] + ' won' : '   ' + mg.score[i]), W / 2, 212 + k * 26));
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
    g.fillText(Net.role === 'guest' ? 'Waiting for your friend' : 'Press Enter or tap to continue', W / 2, 368);
    if (Net.role !== 'guest') addRect(0, 0, W, H, miniResultContinue);
  };
}
// ---------------------------------------------------------------- Mini games menu: 7 Up and Custom game
MINI_GAMES.push(['sevenup', '7 Up'], ['custom', 'Custom game']);
{
  MiniMenu.others = 2;
  const _rows = minisRows;
  minisRows = function () {
    const m = MiniMenu;
    if (m.kind !== 'sevenup' && m.kind !== 'custom') return _rows.apply(this, arguments);
    const cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length], games = MINI_GAMES.map(x => x[0]), R = [];
    R.push({ label: 'Game', get: () => MINI_GAMES.find(x => x[0] === m.kind)[1], step: d => { m.kind = cyc(games, m.kind, d); } });
    if (m.kind === 'custom') {
      const ids = mrAll().map(s => s.id);
      R.push({ label: 'Rules', get: () => mrGet(MR.sel).name, step: d => { MR.sel = cyc(ids, ids.includes(MR.sel) ? MR.sel : ids[0], d); mrLoad().last = MR.sel; mrSave(); } });
      R.push({ label: 'Make or edit rules', open: true, get: () => '', step: () => openRoom() });
    } else R.push({ label: 'Players', get: () => (m.others + 1) + ' (you and ' + m.others + ')', step: d => { m.others = clamp(m.others + d, 1, 4); } });
    R.push({ label: 'CPU difficulty', get: () => diffName(SETTINGS.difficulty), step: d => { SETTINGS.difficulty = diffStep(SETTINGS.difficulty, d); } });
    R.push({ label: 'Start', start: true, step: () => startQuickMini() });
    R.push({ label: 'Back', back: true, step: () => goTitle() });
    return R;
  };
  const _help = minisHelp;
  minisHelp = function () {
    if (MiniMenu.kind === 'sevenup') return ['Pick any spot and shoot. Inside the arc is 1, a three is 2.', 'Keep shooting until you miss. 8 seconds a shot, no layups.', 'First to exactly 7 wins. Go over and you bust back to 4.'];
    if (MiniMenu.kind === 'custom') return mrDescribe(mrClean(mrGet(MR.sel).r));
    return _help.apply(this, arguments);
  };
  const _sq = startQuickMini;
  startQuickMini = function () {
    const m = MiniMenu;
    if (m.kind !== 'sevenup' && m.kind !== 'custom') return _sq.apply(this, arguments);
    Game.paused = false; Game.trivia = null; Game.fromMinis = true;
    const set = m.kind === 'sevenup' ? MR_PRESETS[0] : mrGet(MR.sel), R = mrClean(set.r), n = m.kind === 'sevenup' ? m.others + 1 : R.players;
    setupMini(m.kind, { set, rules: Object.assign({}, R, { players: n }), roster: ['you', ...shuffle(MINI_OPPS.map(o => o[0])).slice(0, n - 1)], humans: [{ team: 0, slot: 0, pad: 0 }] });
    Game.screen = 'play';
  };
  // the "Make or edit rules" row opens the room instead of stepping
  const _mu = minisUpdate;
  minisUpdate = function () { mrLoad(); return _mu.apply(this, arguments); };
}
// ---------------------------------------------------------------- the custom game room (rule editor)
function openRoom() {
  const cur = mrGet(MR.sel), preset = MR_PRESETS.some(p => p.id === cur.id);
  MR.edit = { id: preset ? null : cur.id, name: preset ? cur.name + ' (mine)' : cur.name, r: mrClean(cur.r) }; MR.row = 0; MR.msg = '';
  Game.screen = 'miniroom';
}
function roomRows() {
  const E = MR.edit, r = E.r, cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
  const pick = (k, label) => ({ label, get: () => (MR_OPTS[k].find(x => x[0] === r[k]) || [0, ''])[1], step: d => { r[k] = cyc(MR_OPTS[k].map(x => x[0]), r[k], d); if (r.scoring === 'spots') r.spots = 'fixed'; } });
  const num = (k, label, fmt) => ({ label, get: () => fmt(r[k]), step: d => { r[k] = cyc(MR_OPTS[k], r[k], d); } });
  return [
    { label: 'Name', get: () => E.name + '  ✎', step: () => csAskName('Game name', E.name, 18, v => { E.name = csClean(v, E.name); }) },
    pick('scoring', 'Scoring'), pick('spots', 'Where you shoot'), pick('turn', 'A turn lasts'),
    num('target', 'To win', v => (r.exact === 'on' ? 'exactly ' : 'first to ') + v), pick('exact', 'Exact finish'),
    num('shotClock', 'Time per shot', v => (v ? v + ' seconds' : 'No limit')), num('matches', 'Games', v => (v === 1 ? 'One game' : 'Best of ' + v)),
    num('players', 'Players', v => v + ' (you and ' + (v - 1) + ' CPU)'), num('minDist', 'No layups circle', v => (v ? (v === 120 ? 'Small' : 'Big') : 'Off'))
  ];
}
function roomSave() {
  const E = MR.edit, d = mrLoad();
  let set = E.id && d.sets.find(s => s.id === E.id);
  if (!set) { set = { id: csId(), name: E.name, r: E.r }; d.sets.push(set); E.id = set.id; } else { set.name = E.name; set.r = Object.assign({}, E.r); }
  MR.sel = set.id; d.last = set.id; mrSave(); toast('Saved: ' + set.name, 2);
}
function roomAct(k) {
  if (k === 'save') roomSave();
  else if (k === 'play') { roomSave(); MiniMenu.kind = 'custom'; Game.screen = 'minis'; startQuickMini(); }
  else if (k === 'share') { roomSave(); CSUI.share = mrCode(mrGet(MR.sel)); Game.csBack = 'miniroom'; Game.screen = 'csshare'; }
  else if (k === 'import') { Game.screen = 'mrimport'; MR.msg = ''; }
  else if (k === 'delete' && MR.edit.id) {
    if (MR.confirm !== MR.edit.id) { MR.confirm = MR.edit.id; toast('Press Delete again to remove ' + MR.edit.name, 2.5); return; }
    const d = mrLoad(); d.sets = d.sets.filter(s => s.id !== MR.edit.id); MR.sel = 'sevenup'; d.last = MR.sel; mrSave(); MR.confirm = null; Game.screen = 'minis'; toast('Removed', 1.5);
  }
}
function roomUpdate() {
  const R = roomRows(), n = R.length;
  if (menuHit('up')) { MR.row = (MR.row + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { MR.row = (MR.row + 1) % n; SFX.blip(); }
  const r = R[MR.row];
  if (menuHit('left')) { r.step(-1); SFX.blip(); } else if (menuHit('right')) { r.step(1); SFX.blip(); }
  else if (menuHit('ok')) { r.step(1); SFX.blip(); }
  if (Input.pressed.KeyP) roomAct('play'); else if (Input.pressed.KeyC) roomAct('share');
  if (menuHit('back')) { Game.screen = 'minis'; }
}
function drawRoom(g) {
  dim(g, 0.84);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Custom game room', W / 2, 46);
  const R = roomRows();
  panel(g, 30, 64, 520, 440, true);
  R.forEach((r, i) => {
    const y = 76 + i * 41, on = i === MR.row, cy = y + 26;
    if (on) { g.fillStyle = 'rgba(232,195,90,0.18)'; roundRect(g, 40, y + 2, 500, 37, 8); g.fill(); }
    g.textAlign = 'left'; g.fillStyle = on ? '#fff' : IVORY; g.font = `14px ${BODY}`; g.fillText(r.label, 56, cy);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `13px ${i === 0 ? FONT : BODY}`; g.fillText(r.get(), 400, cy);
    if (i) { g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.fillText('◂', 268, cy + 1); g.fillText('▸', 532, cy + 1); addRect(250, y, 40, 40, () => { MR.row = i; r.step(-1); }); addRect(510, y, 40, 40, () => { MR.row = i; r.step(1); }); }
    addRect(40, y, 210, 40, () => { MR.row = i; r.step(1); });
  });
  panel(g, 570, 64, 360, 300, false);
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('HOW IT PLAYS', 590, 92);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; let y = 118; for (const t of mrDescribe(MR.edit.r)) if (t) y = wrapLeft(g, t, 590, y, 320, 20) + 30;
  const acts = [['Play', 'play'], ['Save', 'save'], ['Share code', 'share'], ['Import a code', 'import']].concat(MR.edit.id ? [['Delete', 'delete']] : []);
  acts.forEach(([l, k], i) => uiButton(g, 570 + (i % 2) * 184, 376 + Math.floor(i / 2) * 44, 176, 36, l, () => roomAct(k), i === 0));
  g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText('↑ ↓ choose   ← → change   P play   C share   Esc back', 930, 520);
  W = rw; Game.ox = 0; g.restore();
}
function drawRoomImport(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  panel(g, 160, 110, 640, 300, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Import a game', W / 2, 152);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Copy a custom game code from a friend, then paste it here.', W / 2, 182);
  uiButton(g, W / 2 - 110, 210, 220, 44, 'Paste', mrPaste, true);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('or press Ctrl+V (⌘V on a Mac)', W / 2, 280);
  if (MR.msg) { g.fillStyle = MR.err ? '#ff9a8a' : '#9dffb0'; g.font = `15px ${BODY}`; g.fillText(MR.msg, W / 2, 322); }
  uiButton(g, W / 2 - 80, 346, 160, 38, 'Back', () => { Game.screen = 'minis'; }, false);
  W = rw; Game.ox = 0; g.restore();
}
function mrTry(t) { const r = mrImport(t); MR.msg = r.ok || r.err; MR.err = !r.ok; if (r.ok) { toast(r.ok, 2.5); SFX.good && SFX.good(); } }
function mrPaste() { try { if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(mrTry, () => { MR.msg = 'Press Ctrl+V (or ⌘V) to paste the code here.'; MR.err = true; }); return; } } catch (e) {} MR.msg = 'Press Ctrl+V (or ⌘V) to paste the code here.'; MR.err = true; }
addEventListener('paste', e => { if (Game.screen !== 'mrimport') return; const t = e.clipboardData && e.clipboardData.getData('text'); if (t) { e.preventDefault(); mrTry(t); } });
{
  const SCR = { miniroom: [roomUpdate, drawRoom], mrimport: [() => { if (menuHit('back')) Game.screen = 'minis'; else if (menuHit('ok')) mrPaste(); }, drawRoomImport] };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments); if (was && Game.screen === sc) { SCR[sc][0](); attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s[1](g); drawBackButton(g); };
  BACK.miniroom = () => { Game.screen = 'minis'; }; BACK.mrimport = () => { Game.screen = 'minis'; };
  // the share screen comes back to the room when it was opened from there
  const _bs = BACK.csshare; BACK.csshare = () => { if (Game.csBack === 'miniroom') { Game.csBack = null; Game.screen = 'miniroom'; } else _bs(); };
}
// ---------------------------------------------------------------- online: 7 Up and custom games with a friend
{
  LOBBY_GAMES.splice(LOBBY_GAMES.findIndex(g => g.id === 'brun'), 0, { id: 'sevenup', name: '7 Up' }, { id: 'custom', name: 'Custom game' });
  const _isM = Net.isMini;
  Net.isMini = function (m = this.mode) { return m === 'sevenup' || m === 'custom' || _isM.call(this, m); };
  // the roster travels in the snapshot so the guest builds the same players
  Object.defineProperty(MINI_ONLINE, 'custom', { configurable: true, get() { const s = (Net.snaps || []).map(x => x.s).reverse().find(x => x && x.mr); return s ? s.mr : ['khalil', 'nasser']; } });
  Object.defineProperty(MINI_ONLINE, 'sevenup', { configurable: true, get() { return MINI_ONLINE.custom; } });
  const _sn = Net.snapshot;
  Net.snapshot = function () { const s = _sn.apply(this, arguments); if (s && M.mini instanceof CustomGame) s.mr = M.miniIds; return s; };
  const _hs = Net.hostStart;
  Net.hostStart = function () {
    if (this.mode !== 'sevenup' && this.mode !== 'custom') return _hs.call(this);
    if (!this.guestPeer) return;
    const o = Lobby.opts(), set = this.mode === 'sevenup' ? MR_PRESETS[0] : mrGet(o.rules || MR.sel), R = mrClean(set.r), n = this.mode === 'sevenup' ? clamp(o.players || 3, 2, 5) : R.players;
    this.mid++; this.evs = []; Game.lastMatch = null;
    setupMini(this.mode, { online: true, set, rules: Object.assign({}, R, { players: n }), roster: ['khalil', 'nasser', ...shuffle(['saleem', 'mahmoud', 'hamid', 'rafiq']).slice(0, n - 2)], humans: [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] });
    M.online = true; Game.screen = 'play'; Game.paused = false; this.syncCounters();
  };
  const _rows = Lobby.rows;
  Lobby.rows = function () {
    const R = _rows.apply(this, arguments), o = this.opts(), cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
    const at = Math.max(1, R.findIndex(r => /difficulty/i.test(r.label)));
    if (o.game === 'sevenup') R.splice(at, 0, { label: 'Players', get: () => String(o.players || 3), step: d => { o.players = clamp((o.players || 3) + d, 2, 5); } });
    if (o.game === 'custom') { const ids = mrAll().map(s => s.id); R.splice(at, 0, { label: 'Rules', get: () => (Net.role === 'guest' && o.rulesName) || mrGet(o.rules || MR.sel).name, step: d => { o.rules = cyc(ids, ids.includes(o.rules) ? o.rules : ids[0], d); } }); }
    return R;
  };
  const _pub = Lobby.publish;
  Lobby.publish = function () { if (Net.role === 'host' && this.o && this.o.game === 'custom') this.o.rulesName = mrGet(this.o.rules || MR.sel).name; return _pub.apply(this, arguments); };
}
function wrapLeft(g, text, x, y, maxW, lh) {
  g.textAlign = 'left'; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t; }
  g.fillText(line, x, y); return y;
}
