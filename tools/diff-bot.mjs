// v9.19.2 the mixed-play bot and the in-page runners (window.__dr) for tools/diff-report.mjs and tests/difficulty.mjs.
// See tools/diff-report.mjs for what the bot does.
export const DIFF_JS = `(() => {
  if (window.__dr) return; const D = window.__dr = {};
  const zero = c => { c.mx = c.mz = 0; c.a = c.b = c.x = c.turbo = c.bHeld = c.xHeld = false; };
  // a decent player: shoots when open, drives when the lane is clear, passes when it isn't; contests shots
  const near = (q, list) => list.reduce((a, o) => Math.min(a, Math.hypot(o.x - q.x, o.z - q.z)), 9999);
  D.bot = (me, c, st) => {
    zero(c); const h = attackHoop(me.team), mine = ball.owner === me, rnd = Math.random;
    if (st.held) { st.held += STEP; c.bHeld = st.held < st.rel; if (st.held > st.rel + 0.4 || (!mine && ball.state !== 'shot')) st.held = 0; if (mine || st.held) return true; }
    if (mine) {
      if (!st.plan) { const r = rnd(); st.plan = r < 0.4 ? 'drive' : r < 0.8 ? 'shoot' : 'pass'; st.t = 0; st.spot = { x: h.x + h.dir * (180 + rnd() * 110), z: h.z + (rnd() - 0.5) * 220 }; }
      st.t += STEP;
      const d = Math.hypot(h.x - me.x, h.z - me.z), def = near(me, me.opps), clock = M.shotClock == null ? 24 : M.shotClock;
      const shoot = () => { c.b = true; c.bHeld = true; st.held = 0.01; st.rel = Math.max(0.15, (apexT(me) || 0.4) + (rnd() + rnd() + rnd() - 1.5) * 0.1); };
      // in the lane: who's between me and the rim, within 70
      const blocked = me.opps.some(o => { const ax = h.x - me.x, az = h.z - me.z, L = Math.hypot(ax, az) || 1, ox = o.x - me.x, oz = o.z - me.z, along = (ox * ax + oz * az) / L; return along > 0 && along < 90 && Math.abs(ox * az - oz * ax) / L < 40; });
      const mateOpen = me.mate && near(me.mate, me.opps) > 80;
      if (clock < 3 || st.t > 4) { shoot(); return true; }
      if (st.plan === 'drive') {
        if (d < 130) { shoot(); return true; }
        if (blocked && st.t > 0.5) { st.plan = def > 70 && d < 300 ? 'shoot' : mateOpen ? 'pass' : 'shoot'; st.t = Math.min(st.t, 0.6); }
        c.mx = (h.x - me.x) / d; c.mz = (h.z - me.z) / d; c.turbo = me.turbo > 20;
      } else if (st.plan === 'shoot') {
        const dx = st.spot.x - me.x, dz = st.spot.z - me.z, L = Math.hypot(dx, dz);
        if (L > 25 && st.t < 1.6) { c.mx = dx / L; c.mz = dz / L; }
        else if (def > 65) shoot();                                   // open: shoot
        else if (!blocked) st.plan = 'drive'; else if (mateOpen) st.plan = 'pass'; else if (st.t > 2.4) shoot();
      } else { if (mateOpen || st.t > 0.4) c.a = true; if (st.t > 0.7) st.plan = 'drive'; }
      return true;
    }
    st.plan = null;
    if (ball.owner && ball.owner.team !== me.team) {                  // defense: my man, between him and the rim; contest his shot
      const o = st.man && me.opps.includes(st.man) ? st.man : (st.man = me.opps.slice().sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0]);
      const dh = attackHoop(o.team), tx = o.x + (dh.x - o.x) * 0.22, tz = o.z + (dh.z - o.z) * 0.22, dd = Math.hypot(tx - me.x, tz - me.z), dm = Math.hypot(o.x - me.x, o.z - me.z);
      if (dd > 12) { c.mx = (tx - me.x) / dd; c.mz = (tz - me.z) / dd; c.turbo = dd > 100 && me.turbo > 30; }
      if (ball.owner === o) { c.xHeld = dm < 90; if (o.state === 'windup' && dm < 80 && !st.jumped) { c.b = true; st.jumped = true; } else if (dm < 50 && o.state === 'free' && rnd() < 0.01) c.a = true; }
      if (o.state !== 'windup') st.jumped = false;
      return true;
    }
    st.man = null;
    if (!ball.owner && ball.state !== 'shot') { const d = Math.hypot(ball.x - me.x, ball.z - me.z); c.mx = (ball.x - me.x) / (d || 1); c.mz = (ball.z - me.z) / (d || 1); c.turbo = d > 80; return true; }
    if (!ball.owner && ball.state === 'shot') { const hh = ball.shot && ball.shot.h || attackHoop(me.team), d = Math.hypot(hh.x - me.x, hh.z - me.z); if (d > 70) { c.mx = (hh.x - me.x) / d; c.mz = (hh.z - me.z) / d; } return true; }   // crash the boards
    if (ball.owner && ball.owner.team === me.team) { const tx = h.x + h.dir * 240, tz = h.z + (me.z > h.z ? 130 : -130), d = Math.hypot(tx - me.x, tz - me.z); if (d > 30) { c.mx = (tx - me.x) / d; c.mz = (tz - me.z) / d; } }
    return true;
  };
  // one game: the bot in your slot; returns the line
  D.play = (me) => {
    const st = {}, cnt = { moves: 0, sig: 0, poss: [0, 0], last: -1, stl: [0, 0] };
    const _sdm = startDribbleMove; startDribbleMove = function (q, kind) { const ok = _sdm.apply(this, arguments); if (ok !== false && q && q.team === 1) cnt.moves++; return ok; };
    const _ls = typeof logSig === 'function' ? logSig : null; if (_ls) logSig = function (q) { if (q && q.team === 1) cnt.sig++; return _ls.apply(this, arguments); };
    M.cmdHook = q => { if (q !== me) return false; return D.bot(me, q.cmd, st); };
    try {
      for (let i = 0; i < 60 * 60 * 12 && M.phase !== 'over'; i++) {
        if (Game.screen === 'halftime') Game.screen = 'play'; if (Game.trivia) Game.trivia = null; if (Game.screen !== 'play') Game.screen = 'play';
        updateMatch(STEP);
        const o = ball.owner; if (o && o.team !== cnt.last) { cnt.poss[o.team]++; cnt.last = o.team; }
      }
    } finally { M.cmdHook = null; startDribbleMove = _sdm; if (_ls) logSig = _ls; }
    const T = t => M.teams[t].players || M.players.filter(q => q.team === t), sum = (t, k) => M.players.filter(q => q.team === t).reduce((a, q) => a + ((q.stats && q.stats[k]) || 0), 0);
    return { over: M.phase === 'over', won: M.teams[0].score > M.teams[1].score, us: M.teams[0].score, them: M.teams[1].score,
      meFgm: me.stats.fgm || 0, meFga: me.stats.fga || 0, cpuFgm: sum(1, 'fgm'), cpuFga: sum(1, 'fga'), stlUs: sum(0, 'stl'), stlThem: sum(1, 'stl'),
      moves: cnt.moves + cnt.sig, cpuPoss: cnt.poss[1] };
  };
  // the career's own dials for a stage and difficulty
  const opp = (L, stage, smart) => typeof careerOppCfg === 'function' ? careerOppCfg(L, stage, smart) : diffAt(L);   // (careerOppCfg from 9.19.2)
  D.levels = (stage) => { const lv = careerLevels(stage); return [diffAt(lv.mate), opp(lv.opp, stage)]; };
  // a ladder game: the career match shape (you + a CPU teammate against a CPU team), ratings all equal
  D.ladder = (diff, stage, g, rating, L) => {
    window.__seed(1000 + stage * 7919 + g * 104729 + diff.length * 31); SETTINGS.difficulty = diff;
    const a = g % 8, b = (g * 3 + 1) % 8 === a ? (a + 1) % 8 : (g * 3 + 1) % 8;
    const keys = ['spd', 'sht', 'dnk', 'def', 'pas', 'stl', 'hus', 'clu', 'sta'];
    const r = rating == null ? STAGES[stage].stat : rating;
    newMatch(TEAMS[a], TEAMS[b], { humans: [{ team: 0, slot: 1, pad: 0 }], career: true, aiCfg: L == null ? D.levels(stage) : [diffAt(careerLevels(stage).mate), opp(L, stage)] });
    Game.screen = 'play'; M.introT = 0;
    for (const q of M.players) { q.hifzUsed = true; const v = typeof r === 'object' ? r[q.team] : r; q.st = Object.fromEntries(keys.map(k => [k, v])); q._hnd = null; }
    return D.play(M.players.find(q => q.human === 0));
  };
  // the first three games of a new career, one play style
  D.first3 = (diff, style, run) => {
    window.__seed(5000 + run * 7919 + style * 131 + diff.length * 17); SETTINGS.difficulty = diff;
    C = freshCareer(); C.name = 'New'; C.look.style = style; C.bracket = makeBracket(0); C.seen.intro = true; C.seen.stage0 = true;
    const out = [];
    for (let g = 0; g < 3; g++) {
      if (C.seasonOver && typeof startNewSeason === 'function') startNewSeason(false);
      if (C.bracket.out || C.bracket.champ) C.bracket = makeBracket(C.stage);
      if (typeof calEnsure === 'function' && C.cal) { try { if (calGameDay() != null && !calGameToday()) calSetDay(calGameDay()); } catch (e) {} }
      if (!Game.cv && typeof prepCareerVenue === 'function') prepCareerVenue();
      Game.screen = 'pregame'; startCareerMatch();
      for (let k = 0; k < 12 && Game.screen !== 'play'; k++) { if (Game.screen === 'story' && Game.story) Game.story.then(); else { if (!Game.cv && typeof prepCareerVenue === 'function') prepCareerVenue(); Game.screen = 'pregame'; startCareerMatch(); } }
      if (typeof M.introT === 'number') M.introT = 0;
      for (const q of M.players) q.hifzUsed = true;
      const me = M.players.find(q => q.human === 0), r = D.play(me);
      r.g = g; r.opp = M.teamDefs ? M.teamDefs[1].name : ''; r.oppStat = +(M.players.filter(q => q.team === 1).reduce((a, q) => a + ['spd', 'sht', 'dnk', 'def'].reduce((s, k) => s + q.st[k], 0) / 4, 0) / 2).toFixed(1);
      r.meStats = Object.assign({}, me.st); out.push(r);
      M.winner = r.won ? 0 : 1; try { careerAfterMatch(); } catch (e) {}
      for (let k = 0; k < 6 && Game.screen === 'postgame'; k++) try { postgameContinue(); } catch (e) { break; }
      for (let k = 0; k < 30 && Game.screen === 'story' && Game.story; k++) Game.story.then();
    }
    return out;
  };
})()`;
