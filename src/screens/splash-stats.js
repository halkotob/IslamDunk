// ============================================================ SPLASH + ABOUT
function drawSplash(g) {
  const t = Game.splashT || 0, a = clamp(Math.min(t / 0.35, (1.7 - t) / 0.35), 0, 1);
  g.fillStyle = '#060b14'; g.fillRect(-400, 0, W + 800, H);
  g.save(); g.globalAlpha = a;
  drawLogoMark(g, W / 2, 120, 1.0, {});
  g.textAlign = 'center'; g.fillStyle = 'rgba(246,236,210,0.7)'; g.font = `11px ${FONT}`;
  if (g.letterSpacing !== undefined) g.letterSpacing = '3px';
  g.fillText('A ' + STUDIO.short + ' PRODUCTION', W / 2, 420);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  g.restore();
}
function drawAbout(g) {
  dim(g, 0.8);
  panel(g, W / 2 - 260, 90, 520, 360, true);
  drawLogoMark(g, W / 2, 98, 0.62, {});
  g.textAlign = 'center'; g.fillStyle = IVORY; g.font = `14px ${BODY}`;
  g.fillText('Version ' + VERSION, W / 2, 300);
  g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText('Developed by ' + STUDIO.name, W / 2, 334);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Two-on-two masjid league basketball, made with care for the community.', W / 2, 364);
  g.fillText('Press Enter or Esc to go back', W / 2, 420);
  addRect(0, 0, W, H, () => { Game.screen = 'title'; });
}

// ============================================================ STATS: HUSTLE + CLUTCH, ARCHETYPES
// Hustle: first to loose balls (a longer reach for them and a quicker first
// step when the ball is loose) and more likely to draw a charge.
// Clutch: better timing and touch in the final minute of a close game.
const st7 = (p, k) => { const v = p.st && p.st[k]; return v == null ? (k === 'hus' ? hustleOf(p.st || {}) : clutchOf(p.st || {}, p.def)) : v; };
function hustleOf(s) { return Math.max(1, Math.min(10, Math.round(((s.def || 5) + (s.stl || 5) + (s.spd || 5)) / 3))); }   // runs while rosters are built (before clamp exists)
function clutchOf(s, def) { return Math.max(1, Math.min(10, Math.round((s.sht || 5) * 0.6 + 2 + (def && def.sheikh ? 1 : 0)))); }
function clutchTime() {
  if (!M.fmt || M.practice || M.attract || M.phase !== 'live' && M.phase !== 'ft') return false;
  const lastPeriod = M.quarter >= M.fmt.periods, margin = Math.abs(M.teams[0].score - M.teams[1].score);
  return M.fmt.first21 ? Math.max(M.teams[0].score, M.teams[1].score) >= (M.fmt.target || 21) - 4 && margin <= 3 : lastPeriod && M.clock <= 60 && margin <= 6;
}
function clutchK(p) { return clutchTime() ? 1 + 0.035 * (st7(p, 'clu') - 5) : 1; }
// Archetypes give CPU rosters distinct shapes to play against.
const ARCHETYPES = {
  lockdown: { label: 'LOCKDOWN', mod: { def: 3, stl: 2, hus: 3, sht: -2, dnk: -1 } },
  sharpshooter: { label: 'SHARPSHOOTER', mod: { sht: 3, clu: 2, dnk: -2, def: -1 } },
  playmaker: { label: 'PLAYMAKER', mod: { spd: 2, pas: 3, stl: 1, hus: 1, dnk: -1 } },
  rimrunner: { label: 'RIM RUNNER', mod: { dnk: 3, spd: 2, sht: -2, clu: -1 } },
  glue: { label: 'GLUE GUY', mod: { hus: 3, def: 1, stl: 1, clu: 1, sht: -1, dnk: -1 } }
};
function archetypeOf(s) {                                           // for fixed rosters: the shape their stats already suggest
  const t = [['sharpshooter', s.sht], ['rimrunner', s.dnk], ['lockdown', (s.def + s.stl) / 2], ['playmaker', s.spd]].sort((a, b) => b[1] - a[1]);
  return t[0][1] - Math.min(s.sht, s.dnk, s.def, s.spd) <= 1 ? 'glue' : t[0][0];
}
function applyArchetype(stats, key, R) {
  const A = ARCHETYPES[key]; if (!A) return stats;
  if (stats.hus == null) stats.hus = hustleOf(stats); if (stats.clu == null) stats.clu = clutchOf(stats);
  for (const [k, v] of Object.entries(A.mod)) if (stats[k] != null) stats[k] = clamp(stats[k] + v, 1, 10);
  return stats;
}

// ---- hook wrappers (reactions + achievements) around existing functions
function trackDeficit() {
  const me = M.players && M.players.find(isMine); if (!me || !M.teams) return;
  M.maxDef = Math.max(M.maxDef || 0, M.teams[1 - me.team].score - M.teams[me.team].score);
}
{
  const _mf = makeFeel;
  makeFeel = function (h, sh, shooter, pts, hot, buzzer, clutchBuzzer) {
    const kind = _mf.apply(this, arguments);
    if (shooter) {
      if (kind === 'dunk' || kind === 'bigdunk' || kind === 'poster') react(shooter, 'armsUp', 1.5);    // hyped after a dunk
      const tough = kind !== 'layup' && kind !== 'mid' || (sh && (sh.green || sh.sig)) || buzzer;
      const run = M.run && M.run.team === shooter.team ? M.run.n + 1 : 1; M.run = { team: shooter.team, n: run };
      for (const q of M.players) if (q !== shooter && q.team === shooter.team && q.human < 0 && (tough || run >= 3)) react(q, run >= 3 ? 'armsUp' : 'fist', 0.9);   // teammates acknowledge it
      if (run === 3 && chance(0.6)) react(shooter, 'fist', 1.1);                                         // scoring run: fist bump
      AchEvents.make(shooter, kind, buzzer || clutchBuzzer);
    }
    trackDeficit();
    return kind;
  };
  const _bf = blockFeel;
  blockFeel = function (o, victim) { _bf.apply(this, arguments); react(o, 'armsUp', 0.9); react(victim, 'headDown', 0.8); AchEvents.block(o); };
  const _sf = stealFeel;
  stealFeel = function (p, clean) { _sf.apply(this, arguments); if (clean) AchEvents.steal(p); };
  const _gb = grantBoost;
  grantBoost = function (p) { const r = _gb.apply(this, arguments); AchEvents.noor(p); return r; };
  const _cp = catchPass;
  catchPass = function (to, pa) {
    _cp.apply(this, arguments);
    if (to.human < 0 && pa.from && pa.from.team === to.team && nearestOppDist(to.x, to.z, to.team) > 70) react(to, 'nod', 0.55);   // good pass: a nod
  };
  const _fm = finishMatch;
  finishMatch = function () {
    const me = M.players && M.players.find(isMine), done = M._achEnd; M._achEnd = true;
    const r = _fm.apply(this, arguments);
    if (me && !done) { const us = M.teams[me.team].score, them = M.teams[1 - me.team].score; AchEvents.gameEnd(us > them, us - them, M.maxDef || 0); }
    return r;
  };
  const _tt = talkTo;
  talkTo = function (i) { _tt.apply(this, arguments); Ach.addUnique('good_company', MUS_CAST[i]); };
  const _hu = Horse.prototype.update;
  Horse.prototype.update = function (dt) {
    _hu.call(this, dt);
    if (this.done && !this._ach) { this._ach = true; const me = M.players.findIndex(isMine); if (me >= 0 && this.letters[me] < 5) { Ach.unlock('horse_win'); if (this.letters[me] === 0) Ach.unlock('horse_clean'); } }
  };
  const _lf = Lightning.prototype.finish;
  Lightning.prototype.finish = function () { _lf.call(this); const me = M.players.findIndex(isMine); if (me >= 0 && this.places[me] === 1) Ach.unlock('lightning_win'); };
  const _df = Daily.prototype.finish;
  Daily.prototype.finish = function () { _df.call(this); if (this.made >= DAILY_GOAL) Ach.unlock('daily_goal'); };
  // missed shots: a bad miss draws a groan from the crowd (and a sigh from the shooter)
  const _ub = updateBall;
  updateBall = function (dt) {
    const before = ball.state, sh = ball.shot;
    _ub.apply(this, arguments);
    if (before === 'shot' && ball.state === 'loose' && sh && !sh.dunk && M.phase !== 'ft' && !M.mini && !M.practice) {
      const bad = sh.green || (sh.rd || 200) < 120;
      if (bad) { crowdGroan(0.9); if (sh.shooter) react(sh.shooter, 'handsHead', 0.9); }
    }
  };
  const _dhf = drawHoopFront;
  drawHoopFront = function (g, h) { _dhf.apply(this, arguments); drawHoopGlow(g, h); };
}

{ const _r = render; render = function (g) { _r(g); drawAchToast(g); }; }   // achievement toast over every screen

