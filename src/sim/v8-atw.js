
// ================================================= v8.3: AROUND THE WORLD (mini game)
// Seven spots around the key, baseline to baseline. Shoot from your spot: make it and you move on
// to the next one and keep shooting; miss and your turn is over. Miss twice in a row on the same
// spot and you go back one. First to make the last spot wins. You vs one rival (CPU, or a friend
// online), in the gym like HORSE.
const ATW_N = 7;
function atwSpot(k) { const h = hoops[1], a = -1.3 + k * (2.6 / (ATW_N - 1)), r = 215; return { x: h.x + h.dir * Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 70, 630) }; }
const ATW_WAIT = { x: 800, z: 640 };
class ATW {
  constructor(opts) {
    this.kind = 'atw'; this.online = !!opts.online;
    this.pos = [0, 0]; this.missed = [false, false]; this.turn = 0; this.done = false; this.winner = null;
    this.t = 0; this.gap = 0; this.live = null; this.msg = ''; this.said = null;
    this.startShot();
  }
  startShot() {
    const i = this.turn, p = M.players[i], o = M.players[1 - i], st = M.balls[0], sp = atwSpot(this.pos[i]);
    place(p, sp.x, sp.z); p.face = sgn(hoops[1].x - sp.x) || 1; p.mRel = false;
    if (dxz(o, ATW_WAIT) > 40 && dxz(o, sp) < 80) place(o, ATW_WAIT.x, ATW_WAIT.z);
    Object.assign(st, { owner: p, state: 'held', shot: null, pass: null, kShooter: p, vx: 0, vy: 0, vz: 0, grabLock: 0 });
    this.live = null; this.wait = rand(0.5, 0.95);
    M.hot = { x: sp.x, z: sp.z, t: 9 };
    this.msg = miniName(i) + ': spot ' + (this.pos[i] + 1) + ' of ' + ATW_N + (this.missed[i] ? '  (miss again and you go back one)' : '');
  }
  lock(p, c) {
    const i = M.players.indexOf(p); c.a = false;
    if (i !== this.turn || this.gap > 0 || this.done) { mvTo(p, c, ATW_WAIT.x, ATW_WAIT.z, false, 0.7); c.b = false; c.bHeld = false; p.buf = null; return; }
    c.mx = 0; c.mz = 0; c.turbo = false; c.face = sgn(hoops[1].x - p.x) || 1;               // feet on the spot
  }
  ai(p, c) {
    const i = M.players.indexOf(p); miniRelease(p, M.balls[0]); zeroCmd(c);
    if (i !== this.turn || this.gap > 0 || this.done) { mvTo(p, c, ATW_WAIT.x, ATW_WAIT.z, false, 0.7); return; }
    c.face = sgn(hoops[1].x - p.x) || 1;
    if (M.balls[0].owner === p && p.state === 'free' && (this.wait -= STEP) <= 0) c.b = true;
  }
  grab() {}
  onScore(h) {
    h.kick(ball.shot && ball.shot.touched ? 'rimin' : 'swish', 1.1, ball.x - h.x, ball.z - h.z, ball.shot && ball.shot.green ? 1 : 0);
    ball.state = 'scored'; ball.shot = null;
    if (this.live) this.live.made = true;
  }
  update(dt) {
    this.t += dt; if (this.said) { this.said.t -= dt; if (this.said.t <= 0) this.said = null; }
    if (this.done) { this.doneT += dt; return; }
    if (this.gap > 0) { this.gap -= dt; if (this.gap <= 0) this.startShot(); return; }
    const i = this.turn, p = M.players[i], st = M.balls[0];
    if (!this.live) { if (st.state === 'shot' && st.shot && st.shot.shooter === p) this.live = { t: 0, made: false }; return; }
    const L = this.live; L.t += dt;
    if (!((L.made && L.t > 0.45) || (!L.made && st.state === 'loose' && (st.y < 30 || L.t > 2.4)) || L.t > 3.4)) return;
    if (L.made) {
      this.pos[i]++; this.missed[i] = false;
      if (this.pos[i] >= ATW_N) {
        this.done = true; this.doneT = 0; this.winner = i; M.hot = null;
        FX.callout(miniDoes(i, 'win').toUpperCase() + '!', '#ffd76a', 'AROUND THE WORLD', true); SFX.buzzer(); return;
      }
      FX.pop(p.x, p.y + 130, p.z, this.pos[i] === ATW_N - 1 ? 'LAST SPOT!' : 'NEXT SPOT', '#9dffb0');
      this.gap = 0.6;                                                    // same shooter, next spot
    } else {
      if (this.missed[i]) { this.pos[i] = Math.max(0, this.pos[i] - 1); this.missed[i] = false; FX.callout('BACK A SPOT', '#ff9a8a', miniName(i).toUpperCase()); }
      else { this.missed[i] = true; FX.pop(p.x, p.y + 130, p.z, 'MISS', '#ffffff'); }
      if (M.players[1 - i].human < 0 && p.human >= 0 && chance(0.4)) this.said = { text: pick(['My turn, beta.', 'Watch and learn.', 'Around the world we go.']), who: 1 - i, t: 2 };
      this.turn = 1 - i; this.gap = 1.0;
    }
  }
  result() { const me = Math.max(0, M.players.findIndex(q => q.human >= 0)); return { won: this.winner === me, mine: this.pos[me], theirs: this.pos[1 - me] }; }
  snap() { return { k: 'A', ps: this.pos, ms: this.missed.map(Number), tu: this.turn, m: this.msg, d: this.done ? 1 : 0, w: this.winner == null ? -1 : this.winner, s: this.said ? [this.said.text, this.said.who] : 0 }; }
  applySnap(s) { this.pos = s.ps; this.missed = s.ms.map(Boolean); this.turn = s.tu; this.msg = s.m; this.done = !!s.d; this.winner = s.w < 0 ? null : s.w; this.said = s.s ? { text: s.s[0], who: s.s[1], t: 1 } : null; }
}
function setupATW(opts) {
  const roster = opts.roster || ['you', opts.opp || 'saleem'];
  M.miniIds = roster;
  const tA = Object.assign({}, MINI_TEAM, { players: roster.map(castPlayer) }), tB = Object.assign({}, MINI_TEAM, { players: [] });
  newMatch(tA, tB, { humans: opts.humans || [{ team: 0, slot: 0, pad: 0 }], practice: 'atw', aiCfg: [DIFF.medium, DIFF.medium] });
  M.miniIds = roster; M.drawExtras = null; M.phase = 'live';
  M.balls = [newBallState()];
  M.mini = new ATW(opts);
  cam.x = 1380 - W;
}
{
  const _sm = setupMini;
  setupMini = function (kind, opts) { if (kind === 'atw') return setupATW(opts || {}); return _sm.apply(this, arguments); };
  // HUD: one row of spots per player
  const _hud = drawMiniHUD;
  drawMiniHUD = function (g) {
    const mg = M.mini; if (!mg || mg.kind !== 'atw') return _hud.apply(this, arguments);
    const oy = Game.screen === 'gym' ? 16 : 0; g.save(); g.translate(0, oy);
    g.fillStyle = 'rgba(8,14,22,0.88)'; roundRect(g, W / 2 - 250, 52, 500, 46, 12); g.fill();
    [0, 1].forEach(i => {
      const x = i ? W / 2 + 14 : W / 2 - 236, up = mg.turn === i && !mg.done;
      g.textAlign = 'left'; g.fillStyle = up ? '#f2cf6b' : '#fff'; g.font = `12px ${FONT}`; g.fillText((up ? '▶ ' : '') + miniName(i), x, 68);
      for (let k = 0; k < ATW_N; k++) {
        const done = k < mg.pos[i], cur = k === mg.pos[i];
        g.fillStyle = done ? '#57e389' : cur ? (mg.missed[i] ? '#e05a5a' : GOLD) : 'rgba(255,255,255,0.12)';
        g.beginPath(); g.arc(x + 8 + k * 30, 84, 8, 0, Math.PI * 2); g.fill();
        g.fillStyle = done || cur ? NIGHT : '#6d7a8c'; g.font = `10px ${FONT}`; g.textAlign = 'center'; g.fillText(String(k + 1), x + 8 + k * 30, 88);
      }
    });
    if (mg.msg && !mg.done) { g.textAlign = 'center'; g.font = `13px ${BODY}`; const w = g.measureText(mg.msg).width + 30; g.fillStyle = 'rgba(8,14,22,0.75)'; roundRect(g, W / 2 - w / 2, 104, w, 24, 12); g.fill(); g.fillStyle = IVORY; g.fillText(mg.msg, W / 2, 121); }
    g.restore();
  };
  const _res = drawMiniResult;
  drawMiniResult = function (g) {
    const mg = M.mini; if (!mg || mg.kind !== 'atw') return _res.apply(this, arguments);
    if (!mg.done || (mg.doneT || 0) < 1.2) return;
    dim(g, 0.6);
    g.fillStyle = 'rgba(12,40,44,0.96)'; roundRect(g, W / 2 - 230, 140, 460, 230, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText('AROUND THE WORLD', W / 2, 184);
    g.fillStyle = '#fff'; g.font = `15px ${BODY}`;
    [0, 1].forEach(i => g.fillText(miniName(i) + ':  ' + (mg.winner === i ? 'all ' + ATW_N + ' spots, winner' : mg.pos[i] + ' of ' + ATW_N + ' spots'), W / 2, 230 + i * 28));
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`;
    g.fillText(Net.role === 'guest' ? 'Waiting for your friend' : 'Press Enter or tap to continue', W / 2, 345);
    if (Net.role !== 'guest') addRect(0, 0, W, H, miniResultContinue);
  };
}
