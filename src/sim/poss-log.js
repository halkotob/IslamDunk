
// ================================================= v8.0: POSSESSION LOG
// Every full game (not the title-screen demo or mini games) is logged one possession at a time:
// who had it, how it started, how long it lasted, every shot (distance, points, dunk, how open,
// made or not) and how it ended (score, miss, turnover). The last 30 games are kept in this
// browser so a play session can be exported from the test panel and read with possSummary().
const PLOG_KEY = 'islamdunk.posslog', PLOG_MAX = 30;
const PossLog = {
  cur: null, game: null, force: false, lastShot: null, scores: [0, 0],
  load() { try { return JSON.parse(localStorage.getItem(PLOG_KEY) || '[]'); } catch (e) { return []; } },
  store(g) { if (this.force) return; const all = this.load(); all.push(g); while (all.length > PLOG_MAX) all.shift(); try { localStorage.setItem(PLOG_KEY, JSON.stringify(all)); } catch (e) {} },
  begin() {
    const hum = [0, 1].map(t => M.players.some(p => p.team === t && p.human >= 0));
    this.game = { at: new Date().toISOString(), v: VERSION, diff: SETTINGS.difficulty, career: !!M.career, careerL: M.careerL, teams: M.teamDefs.map(t => t.name), human: hum, fmt: M.fmt.first21 ? 'first21' : M.fmt.periods + 'x' + M.fmt.len, half: !!M.half, poss: [], final: null };
    this.cur = null; this.lastShot = null; this.scores = [M.teams[0].score, M.teams[1].score];
  },
  open(team, how) { this.cur = { team, how, t0: M.time, t1: M.time, shots: [], pts: 0, oreb: 0, end: null, gainT: M.time, shotT: -1 }; },
  close(why) {
    const c = this.cur; if (!c) return; this.cur = null;
    c.t1 = M.time; c.end = c.pts > 0 ? 'score' : why || (c.shotT > c.gainT ? 'miss' : 'turnover');
    c.secs = +(c.t1 - c.t0).toFixed(1); delete c.gainT; delete c.shotT;
    this.game.poss.push(c);
    return c.end;
  },
  addShot(sh, h, pts, dunk) {
    if (!this.game) return;
    if (!this.cur || this.cur.team !== sh.team) { const e = this.close(); this.open(sh.team, e ? afterWhy(e) : 'loose'); }
    const open = Math.min(...sh.opps.map(q => Math.hypot(q.x - sh.x, q.z - sh.z)));
    this.cur.shots.push({ d: Math.round(Math.hypot(sh.x - h.x, sh.z - h.z)), pts, dunk, human: sh.human >= 0, open: Math.round(open), made: false, t: +(M.time - this.cur.t0).toFixed(1) });
    this.cur.shotT = M.time;
  },
  step() {
    if (!this.game) return;
    if (M.phase === 'over') { this.close(); this.game.final = [M.teams[0].score, M.teams[1].score]; this.store(this.game); this.done = this.game; this.game = null; return; }
    const s = ball.shot;
    if (ball.state === 'shot' && s && s !== this.lastShot) { this.lastShot = s; if (!s.dunk) this.addShot(s.shooter, s.hoop, s.pts, false); }   // dunks are logged at take-off
    for (const t of [0, 1]) {                                             // points (shots and free throws)
      const d = M.teams[t].score - this.scores[t]; if (d <= 0) continue; this.scores[t] = M.teams[t].score;
      if (!this.cur || this.cur.team !== t) { this.close(); this.open(t, 'loose'); }
      this.cur.pts += d; const last = this.cur.shots[this.cur.shots.length - 1]; if (last && !last.made && (d >= 2 || last.pts === 1)) last.made = true;
    }
    const o = ball.owner; if (!o) return;
    if (!this.cur) { this.open(o.team, 'start'); return; }
    if (o.team !== this.cur.team) { const e = this.close(); this.open(o.team, afterWhy(e)); return; }
    if (this.cur.shotT > this.cur.gainT && this.cur.pts === 0) { this.cur.oreb++; this.cur.gainT = M.time; }   // got our own miss back
  }
};
function afterWhy(e) { return e === 'score' ? 'inbound' : e === 'miss' ? 'def rebound' : 'turnover'; }
{
  const _um = updateMatch;
  updateMatch = function () {
    const r = _um.apply(this, arguments);
    if (M.mini || (M.attract && !PossLog.force) || M.practice || !M.teams) { PossLog.game = null; return r; }
    if (!PossLog.game && M.phase !== 'over' && M.time < 1) PossLog.begin();
    PossLog.step(); return r;
  };
}
// the numbers that matter for the play loop, per team (or for the human team only)
function possSummary(games, pick = (g, t) => true) {
  const out = { games: games.length, poss: 0, pts: 0, score: 0, miss: 0, turnover: 0, secs: 0, oreb: 0, shots: 0, made: 0, kinds: {} };
  const kind = s => s.pts === 1 ? 'free throw' : s.dunk ? 'dunk' : s.pts === 3 ? 'three' : s.d < 150 ? 'close' : 'mid';
  for (const g of games) for (const c of g.poss) {
    if (!pick(g, c.team)) continue;
    out.poss++; out.pts += c.pts; if (c.how === 'inbound' && c.end === 'turnover' && c.secs < 2) out.inbLost = (out.inbLost || 0) + 1; out[c.end] = (out[c.end] || 0) + 1; out.secs += c.secs; out.oreb += c.oreb;
    for (const s of c.shots) {
      if (s.pts > 1) { out.shots++; if (s.made) out.made++; }
      const k = out.kinds[kind(s)] || (out.kinds[kind(s)] = { n: 0, made: 0, open: 0, openMade: 0 });
      k.n++; if (s.made) k.made++; if (s.open > 90) { k.open++; if (s.made) k.openMade++; }
    }
  }
  const P = Math.max(1, out.poss), pc = x => Math.round(100 * x) + '%';
  return {
    games: out.games, possessions: out.poss, ptsPerPoss: +(out.pts / P).toFixed(2), scoredOn: pc(out.score / P), endedOnMiss: pc(out.miss / P), turnovers: pc(out.turnover / P),
    avgSecs: +(out.secs / P).toFixed(1), lostOnInbound: pc((out.inbLost || 0) / P), offRebPerPoss: +(out.oreb / P).toFixed(2), fg: pc(out.made / Math.max(1, out.shots)), shotsPerPoss: +(out.shots / P).toFixed(2),
    byType: Object.fromEntries(Object.entries(out.kinds).map(([k, v]) => [k, { share: pc(v.n / Math.max(1, out.shots)), fg: pc(v.made / v.n), openShare: pc(v.open / v.n), openFg: v.open ? pc(v.openMade / v.open) : '-' }]))
  };
}
