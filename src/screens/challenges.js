// ================================================= DAILY HOT SPOT CHALLENGE
// One free-play challenge per day: make shots from a hot spot that moves after
// every make, 60 seconds on the clock. Purely additive: nothing is lost by
// skipping a day and there is no streak counter.
const DAILY_GOAL = 6, DAILY_TIME = 60;
function dailyKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function startDaily() {
  Game.paused = false; Game.trivia = null;
  setupMini('daily', { roster: [C ? 'you' : 'khalil'], humans: [{ team: 0, slot: 0, pad: 0 }] });
  Game.screen = 'play';
}
class Daily {
  constructor() {
    this.kind = 'daily'; this.day = dailyKey(); const R = seededRng(hash32('daily' + this.day));
    this.spots = Array.from({ length: 24 }, () => { const r = 110 + R() * 230, a = R() * 2.2 - 1.1, h = hoops[1]; return { x: h.x - Math.cos(a) * r, z: clamp(h.z + Math.sin(a) * r, 70, 630) }; });
    this.i = 0; this.made = 0; this.timer = DAILY_TIME; this.ready = 1.6; this.done = false; this.live = null; this.gap = 0; this.t = 0;
    const pr = Progress.load(); this.todayBest = pr.daily[this.day] || 0; this.allBest = pr.daily.best || 0;
    this.msg = 'Make shots from the glowing spot'; this.setSpot(); this.give();
  }
  setSpot() { const s = this.spots[this.i % this.spots.length]; M.hot = { x: s.x, z: s.z, t: 5 }; }
  give() { const p = M.players[0], st = M.balls[0]; if (!this.t) place(p, 900, 350); Object.assign(st, { owner: p, state: 'held', shot: null, kShooter: p, vx: 0, vy: 0, vz: 0 }); }
  lock(p, c) { c.a = false; if (this.ready > 0 || this.done) { c.mx = 0; c.mz = 0; c.b = false; } }
  ai() {} grab() {}
  onScore(h) {
    h.kick(ball.shot && ball.shot.touched ? 'rimin' : 'swish', 1.1, ball.x - h.x, ball.z - h.z, ball.shot && ball.shot.green ? 1 : 0);
    ball.state = 'scored'; ball.shot = null;
    if (!this.live || this.done) return;
    this.live.made = true;
    if (this.live.inSpot) { this.made++; this.i++; FX.pop(h.x, RIM_Y + 50, h.z, '+1', '#ffcf6a'); SFX.cheer(0.5, 0.2); if (this.made === (this.goal || DAILY_GOAL)) { FX.callout('CHALLENGE COMPLETE!', '#57e389', 'KEEP GOING'); SFX.best(); } }
    else FX.pop(h.x, RIM_Y + 50, h.z, 'NOT FROM THE SPOT', '#ffb0a0');
  }
  update(dt) {
    this.t += dt;
    if (this.done) { this.doneT += dt; return; }
    if (this.ready > 0) { this.ready -= dt; if (this.ready <= 0) SFX.whistle(); return; }
    this.timer -= dt; if (M.hot) M.hot.t = 5;
    if (this.timer <= 0) return this.finish();
    const p = M.players[0], st = M.balls[0];
    if (!this.live && st.state === 'shot' && st.shot && st.shot.shooter === p) this.live = { inSpot: Math.hypot(p.x - M.hot.x, p.z - M.hot.z) <= HOT_R + 6 && !st.shot.dunk, t: 0, made: false };
    if (!this.live && p.state === 'dunk') this.live = { inSpot: false, t: 0, made: false };
    if (this.live) {
      this.live.t += dt;
      const L = this.live, settled = (L.made && L.t > 0.35) || (!L.made && st.state === 'loose' && (st.y < 30 || L.t > 2.2)) || L.t > 3;
      if (settled) { if (L.made && L.inSpot) this.setSpot(); this.live = null; this.gap = 0.25; }
    } else if (this.gap > 0) { this.gap -= dt; if (this.gap <= 0) this.give(); }
  }
  finish() {
    this.done = true; this.doneT = 0; M.hot = null; SFX.buzzer();
    const pr = Progress.update(o => { o.daily[this.day] = Math.max(o.daily[this.day] || 0, this.made); o.daily.best = Math.max(o.daily.best || 0, this.made); });
    this.newToday = this.made > this.todayBest; this.newAll = this.made > this.allBest; this.todayBest = pr.daily[this.day]; this.allBest = pr.daily.best;
    if (this.newAll && this.made > 0) { FX.callout('NEW BEST!', '#9dffb0', this.made + ' FROM THE SPOT', true); SFX.best(); }
  }
  result() { return { made: this.made }; }
  snap() { return null; } applySnap() {}
}
function drawDailyHUD(g, mg) {
  const w = 360, x = W / 2 - w / 2, y = 10;
  g.fillStyle = 'rgba(8,14,22,0.82)'; roundRect(g, x, y, w, 50, 12); g.fill();
  g.textAlign = 'left'; g.fillStyle = '#ffcf6a'; g.font = `11px ${FONT}`; g.fillText('DAILY HOT SPOT', x + 14, y + 18);
  g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(mg.made + (mg.made >= DAILY_GOAL ? '' : ' / ' + DAILY_GOAL), x + 14, y + 41);
  g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText('from the spot', x + 74, y + 40);
  g.textAlign = 'right'; g.fillStyle = mg.timer < 10 ? '#ff9a8a' : '#fff'; g.font = `20px ${FONT}`; g.fillText(Math.ceil(Math.max(0, mg.timer)) + 's', x + w - 14, y + 41);
  g.fillStyle = '#9fb3c8'; g.font = `10px ${BODY}`; g.fillText('Today\u2019s best ' + mg.todayBest, x + w - 14, y + 18);
  if (mg.ready > 0) banner(g, 'DAILY HOT SPOT', 'Make as many as you can from the glowing spot in 60 seconds');
}
function drawDailyResult(g, mg) {
  if (!mg.done || mg.doneT < 1) return;
  dim(g, 0.6);
  const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); const rw = W; W = 960;
  panel(g, W / 2 - 230, 150, 460, 230, true);
  g.textAlign = 'center'; g.fillStyle = '#ffcf6a'; g.font = `24px ${FONT}`; g.fillText('DAILY HOT SPOT', W / 2, 192);
  g.fillStyle = '#fff'; g.font = `44px ${FONT}`; g.fillText(String(mg.made), W / 2, 250);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(mg.made >= DAILY_GOAL ? 'Challenge complete, masha\u2019Allah' : 'made from the spot', W / 2, 276);
  g.fillStyle = mg.newToday ? '#9dffb0' : '#9fb3c8'; g.fillText('Today\u2019s best ' + mg.todayBest + (mg.newAll ? '   \u2022   New personal best!' : '   \u2022   Best ever ' + mg.allBest), W / 2, 306);
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('R to try again   \u2022   Enter to finish   \u2022   A new spot pattern tomorrow', W / 2, 350);
  W = rw; g.restore();
  addRect(0, 0, W, H, goTitle);
}

// ================================================= PERSONAL BESTS SCREEN
function careerBests() { const s = C || readSave(SAVE_AUTO); return s && s.best ? s.best : null; }
function drawBests(g) {
  dim(g, 0.72);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `28px ${FONT}`; g.fillText('Personal bests', W / 2, 64);
  g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Your own progress on this device. Nothing here is compared with anyone else.', W / 2, 88);
  const pr = Progress.load(), b = careerBests(), gr = pr.green;
  const rows = [
    ['Longest made-shot streak', pr.streak ? pr.streak + ' in a row' : '\u2013'],
    ['Green releases, last game', gr.length ? Math.round(gr[gr.length - 1] * 100) + '%' : '\u2013'],
    ['Green releases, best game', gr.length ? Math.round(Math.max(...gr) * 100) + '%' : '\u2013'],
    ['Daily Hot Spot, best ever', pr.daily.best ? pr.daily.best + ' from the spot' : '\u2013'],
    ['Free throws (career drill)', b && b.ft ? b.ft + ' of 10' : '\u2013'],
    ['Three-point challenge', b && b.three ? b.three + ' points' : '\u2013'],
    ['Cone dribble, fastest', b && b.cones ? b.cones.toFixed(1) + ' s' : '\u2013'],
    ['1v1 wins vs Nasser', b && b.v1 ? String(b.v1) : '\u2013']
  ];
  panel(g, W / 2 - 280, 110, 560, 360, true);
  rows.forEach(([k, v], i) => {
    const y = 148 + i * 40; g.textAlign = 'left'; g.fillStyle = '#cfd8e3'; g.font = `15px ${BODY}`; g.fillText(k, W / 2 - 250, y);
    g.textAlign = 'right'; g.fillStyle = v === '\u2013' ? '#6d7a8c' : '#ffcf6a'; g.font = `16px ${FONT}`; g.fillText(v, W / 2 + 250, y);
  });
  if (gr.length > 1) {                                             // green % over recent games
    const x0 = W / 2 - 250, y0 = 490, w = 500, h = 26, n = gr.length;
    g.strokeStyle = 'rgba(87,227,137,0.8)'; g.lineWidth = 2; g.beginPath();
    gr.forEach((v, i) => { const x = x0 + (n === 1 ? w / 2 : i / (n - 1) * w), y = y0 + h - v * h; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.textAlign = 'center'; g.fillText('Green release rate, recent games', W / 2, y0 + h + 16);
  }
  addRect(0, 0, W, H, () => { Game.screen = 'title'; });
}
function recordGreenProgress() {
  if (M._progSaved || M.attract || M.practice) return; M._progSaved = true;
  const p = M.players.find(q => q.human === 0); if (!p || (p.stats.tmd || 0) < 3) return;
  Progress.update(o => { o.green.push(+(p.stats.grn / p.stats.tmd).toFixed(3)); if (o.green.length > 12) o.green.shift(); });
}

// ------------------------------------------------------------- text sprites
// Text drawn under a changing zoom/scale is re-rasterized every frame, which
// periodically flushes the glyph cache (long frames). In-scene labels and
// callouts are rendered once into small cached canvases and blitted instead.
const _txt = new Map();
let _fontsReady = false;
if (typeof document !== 'undefined' && document.fonts) {
  const done = () => { _fontsReady = true; _txt.clear(); };          // anything drawn with a fallback font is rebuilt
  document.fonts.ready.then(done); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => _txt.clear());
} else _fontsReady = true;
function textSprite(text, px, fill, stroke, lw) {
  const key = text + '|' + px + '|' + fill + '|' + stroke + '|' + lw;
  let s = _txt.get(key);
  if (s) return s;
  const cacheable = _fontsReady;
  if (_txt.size > 500) _txt.clear();
  const R = 3, m = makeCanvas(4, 4).getContext('2d'); m.font = `${px}px ${FONT}`;
  const w = Math.ceil(m.measureText(text).width + lw * 2 + 4), h = Math.ceil(px * 1.35 + lw * 2 + 2);
  const c = makeCanvas(w * R, h * R), g = c.getContext('2d'); g.scale(R, R);
  g.font = `${px}px ${FONT}`; g.textAlign = 'center'; g.lineJoin = 'round';
  const by = px * 1.02 + lw + 1;
  if (lw > 0) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, w / 2, by); }
  g.fillStyle = fill; g.fillText(text, w / 2, by);
  s = { c, w, h, by }; if (cacheable) _txt.set(key, s); return s;
}
// draw centered on x with the text baseline at y
function drawTextSprite(g, s, x, y) { g.drawImage(s.c, x - s.w / 2, y - s.by, s.w, s.h); }

