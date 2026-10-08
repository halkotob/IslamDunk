// ============================================================ MINI GAME CORE
// setupMini builds a half-court gym match with the roster and a rule object.
// Both mini games run through miniStep (host/local); the online guest only
// renders snapshots, like the regular online mode.
function setupMini(kind, opts) {
  const roster = kind === 'lightning' ? opts.roster || ['you', 'saleem', 'mahmoud', 'rafiq', 'hamid'] : opts.roster || ['you', opts.opp || 'saleem'];
  M.miniIds = roster;
  const tA = Object.assign({}, MINI_TEAM, { players: roster.map(castPlayer) }), tB = Object.assign({}, MINI_TEAM, { players: [] });
  newMatch(tA, tB, { humans: opts.humans || [{ team: 0, slot: 0, pad: 0 }], practice: kind, aiCfg: [DIFF.medium, DIFF.medium] });
  M.miniIds = roster; M.drawExtras = null; M.phase = 'live';
  M.balls = kind === 'lightning' ? [newBallState(), newBallState()] : [newBallState()];
  M.mini = kind === 'lightning' ? new Lightning(opts) : kind === 'daily' ? new Daily(opts) : new Horse(opts);
  cam.x = 1380 - W;
}
function miniName(i) { const p = M.players[i]; return p.human >= 0 && !M.online ? 'You' : p.def.name; }
function miniDoes(i, v) { const n = miniName(i); return n + ' ' + (n === 'You' ? v : v + 's'); }   // You win / Saleem wins
function miniCmd(p) {
  const c = p.cmd;
  if (p.human >= 0) { if (Net.role === 'host' && p.human === 1) Net.remoteCmd(c); else humanCmd(p.human, c); M.mini.lock(p, c); }
  else M.mini.ai(p, c);
}
function miniStep(dt) {
  M.time += dt;
  if (Game.screen === 'gym' && (Gym.overlay || Gym.fade || Gym.result)) { for (const p of M.players) zeroCmd(p.cmd); }
  else for (const p of M.players) miniCmd(p);
  for (const p of M.players) withPlayerBall(p, () => updatePlayer(p, dt));
  collidePlayers();
  M.balls.forEach((st, i) => withBall(st, () => { M.curBall = i; updateBall(dt); }));
  M.curBall = -1;
  M.mini.grab();
  for (const h of hoops) h.update(dt);
  M.mini.update(dt);
  updateCamera(dt); FX.update(dt);
}
// CPU accuracy in mini games: the timing error alone barely moves it (they mostly take short shots),
// so the make chance itself scales with difficulty too
const MINI_MAKE_K = { veryeasy: 0.28, easy: 0.44, medium: 0.64, hard: 0.78 };
{
  const _rs = releaseShot;
  releaseShot = function (p) {
    if (!M.mini || p.human >= 0 || M.mini.kind === 'daily') return _rs.apply(this, arguments);
    const ck = p.contactK; p.contactK = (ck || 1) * (MINI_MAKE_K[SETTINGS.difficulty] || 0.64);
    try { return _rs.apply(this, arguments); } finally { p.contactK = ck; }
  };
}
function miniRelease(p, st) {                  // CPU release timing: character skill x difficulty
  if (p.state === 'windup' && !p.mRel) { p.mRel = true; p.ai.relT = apexT(p) + gauss() * (MINI_ERR[M.miniIds[M.players.indexOf(p)]] || 0.05) * miniDiffMul(); }
  if (p.state !== 'windup' && p.state !== 'shoot') p.mRel = false;
}

// ================================================================ LIGHTNING
// Knockout (v8 rules): everyone lines up single file behind the three-point line at the top of the
// key. The front player steps onto the spot and shoots a three; the next player waits on deck with the
// second ball and can't shoot until the player ahead has shot. Miss: chase your own rebound and keep
// shooting from anywhere until it goes in. Make: you go to the back of the line and the ball is passed
// out to the next player in line. If the player behind you scores before you do, you're out (both
// balls are passed out to the next two in line). Last one standing wins.
const LK_SPOT = { x: 905, z: 350 };                       // just behind the arc (THREE_R 318 from the rim at 1248)
const LK_GAP = 38;                                        // spacing in the line
function lkLine(k) { return { x: LK_SPOT.x - LK_GAP * (k + 1), z: LK_SPOT.z }; }   // k = 0 is on deck
// walk to a spot in or at the head of the line; going back toward the end, walk around the line, not through it
function lkGo(p, c, sp, slow) {
  const lane = sp.z + 92;
  if (sp.z === LK_SPOT.z && p.x > sp.x + 16) return mvTo(p, c, Math.abs(p.z - lane) > 24 ? p.x - 6 : sp.x, lane, false, slow);
  return mvTo(p, c, sp.x, sp.z, false, slow);
}
class Lightning {
  constructor(opts) {
    this.kind = 'lightning'; this.online = !!opts.online;
    const order = shuffle(M.players.map((_, i) => i));
    this.alive = order.slice(); this.active = [order[0], order[1]]; this.queue = order.slice(2);
    this.places = {}; this.taken = new Set(); this.feeds = []; this.wait = {}; this.t = 0; this.done = false; this.msg = '';
    M.players.forEach((p, i) => { const sp = this.spotFor(i); place(p, sp.x, sp.z); p.face = 1; });   // already lined up
    this.give(0, this.active[0]); this.give(1, this.active[1]);
  }
  give(bi, pi) {                                // ball bi into player pi's hands (start of a turn)
    const p = M.players[pi], st = M.balls[bi];
    Object.assign(st, { owner: p, state: 'held', shot: null, pass: null, kShooter: p, vx: 0, vy: 0, vz: 0, grabLock: 0, dead: false });
    this.taken.delete(pi); this.wait[pi] = rand(0.35, 0.8) + (p.def.elder ? 0.35 : 0);
  }
  // pass a ball out to a player in line: it drops through the net (or settles if it's dead), then flies to him
  feed(bi, pi, delay = 0.35) {
    const st = M.balls[bi];
    this.feeds = this.feeds.filter(f => f.bi !== bi);
    Object.assign(st, { kShooter: null, owner: null }); if (st.state === 'held') st.state = 'loose';
    this.feeds.push({ bi, to: pi, at: this.t + delay, t: -1 });
  }
  aheadShot(i) { return this.active[1] !== i || this.taken.has(this.active[0]); }   // the player ahead has already shot
  spotFor(i) {
    if (this.places[i]) { const k = Object.keys(this.places).indexOf(String(i)); return { x: 760 + k * 44, z: 650 }; }   // out: along the sideline
    if (this.active[0] === i && !this.taken.has(i)) return LK_SPOT;
    if (this.active[1] === i && !this.taken.has(i)) return this.aheadShot(i) ? LK_SPOT : lkLine(0);
    return lkLine(this.queue.indexOf(i) + 1);                              // in line behind the on-deck spot
  }
  // humans: walked into line / onto the spot automatically; you only shoot from the spot, and only once
  // the player ahead has shot. After your first shot you're free to chase your rebound.
  lock(p, c) {
    const i = M.players.indexOf(p); c.a = false;
    if (this.done || this.places[i] || !this.active.includes(i)) { const sp = this.spotFor(i); lkGo(p, c, sp, 0.7); c.b = false; c.bHeld = false; return; }
    if (this.taken.has(i)) return;                                        // chasing your own rebound: free
    const st = ballStateOf(p);
    if (!st || st.owner !== p) { const sp = this.spotFor(i); lkGo(p, c, sp, 0.8); c.b = false; c.bHeld = false; return; }   // ball on its way
    const sp = this.spotFor(i), d = Math.hypot(p.x - sp.x, p.z - sp.z);
    if (sp !== LK_SPOT || d > 8) { const pressed = c.b; lkGo(p, c, sp, 0.75); c.face = 1; if (pressed) this.blocked = { i, t: 1.2 }; c.b = false; c.bHeld = false; return; }   // lkGo resets the command
    c.mx = 0; c.mz = 0; c.turbo = false; c.face = 1;                       // on the spot: shoot when ready
  }
  ai(p, c) {
    const i = M.players.indexOf(p), st = ballStateOf(p), h = hoops[1], id = M.miniIds[i];
    miniRelease(p, st); zeroCmd(c);                                        // no stale presses carried between frames
    if (this.done || this.places[i] || !this.active.includes(i) || !st || st.owner !== p && this.taken.has(i) === false) {
      const sp = this.spotFor(i); lkGo(p, c, sp, 0.8); return;
    }
    zeroCmd(c);
    if (st.owner === p && !this.taken.has(i)) {                           // first shot: from the spot, after the player ahead
      const sp = this.spotFor(i), d = Math.hypot(p.x - sp.x, p.z - sp.z);
      if (sp !== LK_SPOT || d > 8) { lkGo(p, c, sp, 0.75); return; }
      c.face = 1; if ((this.wait[i] -= STEP) <= 0 && p.state === 'free') c.b = true; return;
    }
    if (st.owner === p) {                                                 // after the rebound: each character has a comfort distance
      const want = { mahmoud: 300, saleem: 180, rafiq: 130, hamid: 125, khalil: 150, nasser: 220 }[id] || 170;
      const d = dxz(p, h);
      if (d <= want + 10) { if (p.state === 'free') { c.face = sgn(h.x - p.x); c.b = true; } }
      else mvTo(p, c, h.x + h.dir * want * 0.9, h.z + (p.z - h.z) * 0.5, !p.def.elder);
    } else if (st.state === 'loose') mvTo(p, c, st.x, st.z, !p.def.elder && Math.hypot(st.x - p.x, st.z - p.z) > 120);
  }
  grab() {                                      // you can only pick up your own ball
    for (const st of M.balls) {
      if (st.owner || st.state !== 'loose' || !st.kShooter || st.grabLock > 0 || st.dead) continue;
      const p = st.kShooter;
      if (p.state === 'down' || p.state === 'dunk' || p.state === 'hang') continue;
      if (Math.hypot(st.x - p.x, st.z - p.z) < 28 && st.y < p.y + 80) Object.assign(st, { owner: p, state: 'held', shot: null, vx: 0, vy: 0, vz: 0 });
    }
  }
  onScore(h) {
    const bi = M.curBall, st = M.balls[bi], shooter = st.kShooter || (st.shot && st.shot.shooter);
    h.kick(st.shot && st.shot.touched ? 'rimin' : 'swish', 1.1, st.x - h.x, st.z - h.z, st.shot && st.shot.green ? 1 : 0);
    st.state = 'scored'; st.shot = null; st.kShooter = null;
    const si = M.players.indexOf(shooter);
    if (!shooter || st.dead || !this.active.includes(si) || this.done) return;
    FX.pop(h.x, RIM_Y + 40, h.z, 'MAKE', '#f2cf6b');
    if (this.active[1] === si && this.active[0] !== si) {                 // the player behind scored first: the front is out
      const out = this.active[0], ob = 1 - bi;
      this.knockOut(out, si);
      this.queue.push(si);
      if (this.alive.length <= 1) return this.finish();
      Object.assign(M.balls[ob], { kShooter: null, dead: true });          // the knocked-out player's ball comes back too
      if (M.balls[ob].owner) { M.balls[ob].owner = null; M.balls[ob].state = 'loose'; }
      this.active = [this.queue.shift(), this.queue.shift()];
      this.feed(ob, this.active[0], 0.3); this.feed(bi, this.active[1], 0.55);
    } else {                                                              // the front scored first: safe, back of the line
      this.queue.push(si);
      const next = this.queue.shift();
      this.active = [this.active[1], next];
      this.feed(bi, next, 0.35);
      FX.pop(M.players[si].x, 120, M.players[si].z, 'SAFE', '#9dffb0');
    }
  }
  knockOut(out, by) {
    this.alive = this.alive.filter(x => x !== out); this.places[out] = this.alive.length + 1;
    const o = M.players[out], b = M.players[by], bid = M.miniIds[by], oid = M.miniIds[out];
    FX.callout('KNOCKED OUT!', '#ff9a8a', miniDoes(by, 'get').toUpperCase() + ' ' + miniName(out).toUpperCase());
    SFX.cheer(0.8);
    const talk = b.human < 0 && MINI_TALK[bid] ? pick(MINI_TALK[bid].ko) : o.human < 0 && MINI_TALK[oid] ? pick(MINI_TALK[oid].out) : '';
    if (talk) this.said = { text: talk, who: b.human < 0 ? by : out, t: 2.4 };
    o.expr = { k: 'shock', t: 1.2 };
    const humansLeft = this.alive.filter(i => M.players[i].human >= 0).length;   // a human knocked out ends the game (online: once both are out)
    if (o.human >= 0 && humansLeft === 0) this.finish();
  }
  finish() {
    if (this.alive.length === 1) this.places[this.alive[0]] = 1;
    this.done = true; this.doneT = 0;
    const w = this.alive.length === 1 ? this.alive[0] : null;
    if (w != null) FX.callout(miniDoes(w, 'win').toUpperCase() + '!', '#ffd76a', 'LIGHTNING', true);
    SFX.buzzer();
  }
  update(dt) {
    this.t += dt; if (this.said) { this.said.t -= dt; if (this.said.t <= 0) this.said = null; }
    if (this.blocked) { this.blocked.t -= dt; if (this.blocked.t <= 0) this.blocked = null; }
    if (this.done) { this.doneT += dt; return; }
    for (const st of M.balls) if (st.state === 'shot' && st.shot && st.shot.shooter && !st.dead) { st.kShooter = st.shot.shooter; this.taken.add(M.players.indexOf(st.shot.shooter)); }
    // passes out to the line
    for (const f of this.feeds.slice()) {
      const st = M.balls[f.bi], to = M.players[f.to];
      if (f.t < 0) {
        if (this.t < f.at || st.state === 'shot') continue;              // still dropping through the net / a dead shot still in the air
        { const sp = this.spotFor(f.to); if (Math.hypot(to.x - sp.x, to.z - sp.z) > 60) continue; }   // he's still walking back into line
        f.t = 0; f.x0 = st.x; f.y0 = Math.max(BALL_R, st.y); f.z0 = st.z; st.state = 'scored'; st.grabLock = 9;
        f.T = clamp(Math.hypot(to.x - st.x, to.z - st.z) / 520, 0.45, 0.9);
      }
      f.t += dt; const u = Math.min(1, f.t / f.T), hm = handsMid(to), ty = hm.y + 2;
      st.x = lerp(f.x0, hm.x + to.face * 3, u); st.z = lerp(f.z0, hm.z + 3, u); st.y = lerp(f.y0, ty, u) + 70 * 4 * u * (1 - u);
      st.vx = st.vy = st.vz = 0;
      if (u >= 1) { this.feeds.splice(this.feeds.indexOf(f), 1); if (this.alive.includes(f.to) && this.active.includes(f.to)) { this.give(f.bi, f.to); SFX.catch && SFX.catch(); } }
    }
    const f = this.active[0], b = this.active[1];
    this.msg = this.blocked ? 'Wait for ' + miniName(this.active[0]) + ' to shoot first'
      : f != null && !this.taken.has(f) ? miniName(f) + ': shoot your three from the spot'
      : b != null && !this.taken.has(b) ? miniName(b) + ': step up and shoot your three'
      : 'Miss? Get your own rebound and score before the player behind you';
  }
  result() {
    const hs = M.players.map((p, i) => i).filter(i => M.players[i].human >= 0);
    return { place: hs.length ? (this.places[hs[0]] || 1) : 1, standings: Object.entries(this.places).sort((a, b) => a[1] - b[1]).map(([i, pl]) => ordinal(pl) + ' ' + miniName(+i)) };
  }
  snap() { return { k: 'L', a: this.active, q: this.queue, p: this.places, al: this.alive, m: this.msg, d: this.done ? 1 : 0, s: this.said ? [this.said.text, this.said.who] : 0, tk: [...this.taken] }; }
  applySnap(s) { this.active = s.a; this.queue = s.q; this.places = s.p; this.alive = s.al; this.msg = s.m; this.done = !!s.d; this.said = s.s ? { text: s.s[0], who: s.s[1], t: 1 } : null; this.taken = new Set(s.tk || []); }
}

// ==================================================================== HORSE
// The shooter goes anywhere; a make lights a hot spot at that exact spot and
// the other player has 10 seconds to shoot from it (a dunk must be matched
// with a dunk). Missing the match is a letter; a miss by the leader passes
// the lead. First to spell the word loses. The word and the shot timer are options (MiniOpts):
// HORSE (5 letters), SABR (4) or HAQ (3); 6, 10 or 15 seconds to match.
const MINI_WORDS = ['HORSE', 'SABR', 'HAQ'], MINI_TIMERS = [6, 10, 15];
const MiniOpts = (() => {
  const o = { word: 'HORSE', timer: 10, key: 'islamdunk.minis' };
  try { const v = JSON.parse(localStorage.getItem(o.key) || '{}'); if (MINI_WORDS.includes(v.word)) o.word = v.word; if (MINI_TIMERS.includes(v.timer)) o.timer = v.timer; } catch (e) {}
  o.save = () => { try { localStorage.setItem(o.key, JSON.stringify({ word: o.word, timer: o.timer })); } catch (e) {} };
  return o;
})();
function spelled(word, n) { return word.slice(0, n).split('').join('-'); }
class Horse {
  constructor(opts) {
    this.kind = 'horse'; this.online = !!opts.online;
    this.word = MINI_WORDS.includes(opts.word) ? opts.word : MiniOpts.word; this.timerLen = MINI_TIMERS.includes(opts.timer) ? opts.timer : MiniOpts.timer;
    this.letters = [0, 0]; this.leader = 0; this.phase = 'lead'; this.spot = null; this.timer = 0; this.t = 0; this.done = false;
    this.live = null; this.gap = 0; this.msg = ''; this.startTurn();
  }
  shooterIdx() { return this.phase === 'lead' ? this.leader : 1 - this.leader; }
  startTurn() {
    const si = this.shooterIdx(), p = M.players[si], o = M.players[1 - si], st = M.balls[0];
    place(p, 880, 350); p.face = 1; place(o, 820, 600);
    Object.assign(st, { owner: p, state: 'held', shot: null, kShooter: p, vx: 0, vy: 0, vz: 0 });
    this.live = null; this.cpuPlan = null; p.mRel = false;
    if (this.phase === 'follow') { this.timer = this.timerLen; M.hot = { x: this.spot.x, z: this.spot.z, t: this.timerLen }; this.msg = this.spot.dunk ? 'Match the dunk!' : 'Match it from the glowing spot'; }
    else { M.hot = null; this.msg = miniDoes(si, 'lead') + ': shoot from anywhere'; }
  }
  lock(p, c) { const i = M.players.indexOf(p); c.a = false; if (i !== this.shooterIdx() || this.gap > 0 || this.done) mvTo(p, c, 820, 600, false, 0.7); }
  ai(p, c) {
    const i = M.players.indexOf(p), h = hoops[1];
    miniRelease(p, ball);
    if (this.done || i !== this.shooterIdx() || this.gap > 0) { mvTo(p, c, 820, 600, false, 0.7); return; }
    const st = M.balls[0]; zeroCmd(c);
    if (st.owner !== p) return;
    if (!this.cpuPlan) this.cpuPlan = this.phase === 'follow' ? { x: this.spot.x, z: this.spot.z, dunk: this.spot.dunk } : this.chooseSpot(p);
    const pl = this.cpuPlan;
    if (pl.dunk) { mvTo(p, c, h.x + h.dir * 60, h.z, true); if (canDunk(p) && p.state === 'free') { c.turbo = true; c.b = true; } return; }
    const d = mvTo(p, c, pl.x, pl.z, false, 0.9);
    if (d < (this.phase === 'follow' ? HOT_R * 0.45 : 10) && p.state === 'free') { zeroCmd(c); c.face = 1; c.b = true; }
  }
  // CPU leader picks a spot from its strengths; harder difficulty = bolder, harder-to-match spots
  chooseSpot(p) {
    const h = hoops[1], S = p.def.stats, bold = { veryeasy: 0.1, easy: 0.2, medium: 0.5, hard: 0.85 }[SETTINGS.difficulty] || 0.5;
    if (S.dnk >= 7 && chance(0.25 * bold + 0.1)) return { dunk: true };
    const three = S.sht >= 7 && chance(bold), r = three ? 335 : chance(0.5) ? 190 : 140, a = rand(-1.05, 1.05);
    return { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 60, 640) };
  }
  grab() {}
  onScore(h) {
    h.kick(ball.shot && ball.shot.touched ? 'rimin' : ball.shot && ball.shot.dunk ? 'dunk' : 'swish', 1.1, ball.x - h.x, ball.z - h.z, ball.shot && ball.shot.green ? 1 : 0);
    ball.state = 'scored'; ball.shot = null;
    if (this.live) this.live.made = true;
  }
  update(dt) {
    this.t += dt;
    if (this.done) { this.doneT += dt; return; }
    if (this.gap > 0) { this.gap -= dt; if (this.gap <= 0) this.startTurn(); return; }
    const si = this.shooterIdx(), p = M.players[si], st = M.balls[0];
    if (!this.live) {
      if (p.state === 'dunk' && st.owner === p) this.live = { x: p.act.sx, z: p.act.sz, dunk: true, t: 0, made: false };
      else if (st.state === 'shot' && st.shot && st.shot.shooter === p) this.live = { x: p.x, z: p.z, dunk: false, t: 0, made: false };
      if (this.live && this.phase === 'follow') {
        const ok = this.spot.dunk ? this.live.dunk : !this.live.dunk && Math.hypot(this.live.x - this.spot.x, this.live.z - this.spot.z) <= HOT_R + 6;
        if (!ok) { this.live.invalid = true; FX.callout('NOT FROM THE SPOT', '#ff9a8a'); }
      }
      if (!this.live && this.phase === 'follow' && st.owner === p) { this.timer -= dt; if (M.hot) M.hot.t = Math.max(0.01, this.timer); if (this.timer <= 0) { this.live = { timeout: true, t: 9, made: false }; FX.callout('TIME!', '#ff9a8a'); } }
      return;
    }
    const L = this.live; L.t += dt;
    const settled = L.timeout || (L.made && L.t > 0.5) || (!L.made && st.state === 'loose' && (st.y < 30 || L.t > 2.4)) || L.t > 3.4;
    if (!settled) return;
    const other = 1 - si;
    if (this.phase === 'lead') {
      if (L.made) { this.spot = { x: L.x, z: L.z, dunk: L.dunk }; this.phase = 'follow'; FX.callout(L.dunk ? 'MATCH THE DUNK!' : 'MATCH IT!', '#ffcf6a', miniName(other).toUpperCase() + ', ' + this.timerLen + ' SECONDS'); }
      else { this.leader = other; FX.callout('MISS', '#ffffff', 'THE LEAD PASSES TO ' + miniName(other).toUpperCase()); }
    } else {
      if (L.made && !L.invalid) FX.callout('MATCHED!', '#9dffb0');
      else {
        this.letters[si]++;
        FX.callout(spelled(this.word, this.letters[si]), '#ff9a8a', miniName(si).toUpperCase());
        if (M.players[this.leader].human < 0 && chance(0.6)) this.said = { text: pick(['That\u2019s a letter, beta.', 'Match that next time!', 'Too much pressure?', 'Easy does it.']), who: this.leader, t: 2.2 };
        if (this.letters[si] >= this.word.length) { this.done = true; this.doneT = 0; M.hot = null; FX.callout(miniDoes(other, 'win').toUpperCase() + '!', '#ffd76a', spelled(this.word, this.word.length), true); SFX.buzzer(); return; }
      }
      this.phase = 'lead'; this.spot = null; M.hot = null;
    }
    this.gap = 1.0;
  }
  result() { const me = Math.max(0, M.players.findIndex(p => p.human >= 0)); return { won: this.letters[me] < this.word.length, mine: this.letters[me], theirs: this.letters[1 - me] }; }
  snap() { return { k: 'H', wd: this.word, tl: this.timerLen, l: this.letters, ld: this.leader, ph: this.phase, sp: this.spot ? [r1(this.spot.x), r1(this.spot.z), this.spot.dunk ? 1 : 0] : 0, tm: r1(this.timer), m: this.msg, d: this.done ? 1 : 0, s: this.said ? [this.said.text, this.said.who] : 0 }; }
  applySnap(s) { if (s.wd) this.word = s.wd; if (s.tl) this.timerLen = s.tl; this.letters = s.l; this.leader = s.ld; this.phase = s.ph; this.spot = s.sp ? { x: s.sp[0], z: s.sp[1], dunk: !!s.sp[2] } : null; this.timer = s.tm; this.msg = s.m; this.done = !!s.d; this.said = s.s ? { text: s.s[0], who: s.s[1], t: 1 } : null; }
}

// ================================================================ MINI HUD
function drawMiniHUD(g) {
  const mg = M.mini; if (!mg) return;
  if (mg.kind === 'daily') return drawDailyHUD(g, mg);
  const oy = Game.screen === 'gym' ? 16 : 0; g.save(); g.translate(0, oy);
  if (mg.kind === 'lightning') {
    const n = M.players.length, w = 172, x0 = W / 2 - (n * (w + 8) - 8) / 2;
    M.players.forEach((p, i) => {
      const x = x0 + i * (w + 8), y = 52, act = mg.active.indexOf(i), out = mg.places[i];
      g.fillStyle = act >= 0 && !out ? 'rgba(232,195,90,0.92)' : 'rgba(8,14,22,0.86)'; roundRect(g, x, y, w, 40, 10); g.fill();
      if (p.human >= 0) { g.strokeStyle = p.human === 0 ? '#ff7a7a' : '#6ab8ff'; g.lineWidth = 2; g.stroke(); }
      g.textAlign = 'left'; g.fillStyle = act >= 0 && !out ? NIGHT : out ? '#6d7a8c' : '#fff'; g.font = `13px ${FONT}`;
      g.fillText(miniName(i), x + 10, y + 17);
      g.font = `11px ${FONT}`;
      const tk = mg.taken && mg.taken.has(i), status = out ? (out === 1 ? 'WINNER' : 'OUT, ' + ordinal(out).toUpperCase()) : act === 0 ? (tk ? 'CHASING (FRONT)' : 'ON THE SPOT') : act === 1 ? (tk ? 'CHASING (BEHIND)' : 'ON DECK') : '#' + (mg.queue.indexOf(i) + 1) + ' IN LINE';
      g.fillStyle = out === 1 ? '#2e7d5b' : act >= 0 && !out ? 'rgba(11,19,48,0.8)' : out ? '#6d7a8c' : '#9fb3c8'; g.fillText(status, x + 10, y + 32);
    });
  } else {
    const rows = [[0, 'left'], [1, 'right']];
    g.fillStyle = 'rgba(8,14,22,0.88)'; roundRect(g, W / 2 - 250, 52, 500, 44, 12); g.fill();
    rows.forEach(([i]) => {
      const x = i ? W / 2 + 20 : W / 2 - 240, isLead = mg.leader === i;
      g.textAlign = 'left'; g.fillStyle = isLead ? '#f2cf6b' : '#fff'; g.font = `12px ${FONT}`; g.fillText((isLead ? '\u25B6 ' : '') + miniName(i), x, 68);
      mg.word.split('').forEach((ch, k) => {
        const on = k < mg.letters[i];
        g.fillStyle = on ? '#e05a5a' : 'rgba(255,255,255,0.1)'; roundRect(g, x + k * 26, 74, 22, 18, 5); g.fill();
        g.fillStyle = on ? '#fff' : '#6d7a8c'; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText(ch, x + k * 26 + 11, 88);
      });
    });
    if (mg.phase === 'follow' && !mg.done) {
      g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, W / 2 - 150, 102, 300, 8, 4); g.fill();
      g.fillStyle = mg.timer < 3 ? '#e05a5a' : '#ffcf6a'; roundRect(g, W / 2 - 150, 102, 300 * clamp(mg.timer / (mg.timerLen || 10), 0, 1), 8, 4); g.fill();
    }
  }
  if (mg.msg && !mg.done) { g.textAlign = 'center'; g.fillStyle = 'rgba(8,14,22,0.8)'; roundRect(g, W / 2 - 200, 118, 400, 26, 13); g.fill(); g.fillStyle = '#fff'; g.font = `13px ${BODY}`; g.fillText(mg.msg, W / 2, 136); }
  if (mg.said) {
    const p = M.players[mg.said.who]; if (p) { const [x, y] = P(p.x, p.y + 132, p.z); g.font = `12px ${BODY}`; const w = g.measureText(mg.said.text).width + 20;
      g.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(g, x - w / 2, y - 24, w, 24, 12); g.fill(); g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.fill();
      g.fillStyle = NIGHT; g.textAlign = 'center'; g.fillText(mg.said.text, x, y - 8); }
  }
  g.restore();
}
function drawMiniResult(g) {
  if (M.mini && M.mini.kind === 'daily') return drawDailyResult(g, M.mini);
  const mg = M.mini; if (!mg || !mg.done || (mg.doneT || 0) < 1.2) return;
  dim(g, 0.6);
  g.fillStyle = 'rgba(12,40,44,0.96)'; roundRect(g, W / 2 - 230, 140, 460, 250, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(mg.kind === 'lightning' ? 'LIGHTNING' : spelled(mg.word, mg.word.length), W / 2, 184);
  g.fillStyle = '#fff'; g.font = `15px ${BODY}`;
  if (mg.kind === 'lightning') {
    const order = Object.entries(mg.places).sort((a, b) => a[1] - b[1]).map(([i, pl]) => ordinal(pl) + '  ' + miniName(+i));
    order.slice(0, 5).forEach((t, k) => g.fillText(t, W / 2, 220 + k * 24));
  } else mg.letters.forEach((l, i) => g.fillText(miniName(i) + ':  ' + (mg.word.slice(0, l) || '\u2013'), W / 2, 230 + i * 28));
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
  g.fillText(Net.role === 'guest' ? 'Waiting for your friend' : 'Press Enter or tap to continue', W / 2, 370);
  if (Net.role !== 'guest') addRect(0, 0, W, H, miniResultContinue);
}
function miniResultContinue() { if (Net.role === 'host') Game.screen = 'hostlobby'; else goTitle(); }

