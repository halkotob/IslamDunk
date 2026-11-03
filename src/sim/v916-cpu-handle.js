// ================================================= v9.16: CPU DRIBBLE MOVES AND DUNKS FOLLOW HIS RATINGS
// Play-test: "CPU opponents and teammates need more variety, all based on stats and archetypes." 9.11 gave each CPU
// player his own shot diet (v911-cpu-style.js); his dribble moves and his dunks still ignored him: every CPU tried a
// move at one flat rate per difficulty (ai.js, cf.cross) and picked it from fixed weights (aiMove), and dunks were
// picked at random. Now:
//   * handle (cpuHandle): from Speed and Passing, plus a bonus for the playmaker style. No new saved stat.
//   * how often: cf.cross (the difficulty) x his handle: about 1.6x the average for the best handlers, 0.5x for the
//     worst. At most one move per 0.9 s, except a chained second move.
//   * which move: good handlers (8+) mix in more behind-the-back, hesitation and spin, and chain a second move inside
//     0.5 s if the defender is still within 60 px (more often on harder settings, never on Very easy); poor handlers
//     (4 or less) only cross over, and nobody below 5.5 starts a behind-the-back or a spin with a defender within 40 px.
//     Never three moves in a row.
//   * sharpshooters: twice the step-back (and on Hard the fadeaway) with a defender within 70 px behind the arc, and a
//     move is followed by the shot more often than a drive; with an open look behind the arc he makes no move first.
//   * rim runners and big dunkers: spin and drop-step into a drive when the defender is in front, then attack the rim.
//   * dunks: the type follows Dunking, Speed and the style (big dunks and his own favourite for the best dunkers, the
//     two-hander for the rest); a poor dunker (Dunking 5 or less) lays it in some of the time even with the lane open.
// What the CPU makes (dunk and shot success) is untouched, and so are mini-games (M.mini), snapshot-netcode guests (they
// don't run the CPU) and human players. In a rollback match both phones run the CPU: Net.role is cleared for the step and
// this code's per-player state (_mvStart, _after, _chainFor, _layT) is saved with the match, so both play it the same. Measured with tests/perf/loop-report.mjs (per-player lines); see CHANGELOG 9.16.0.
const CPU_HANDLE_AVG = 5.6;                       // the league's average handle (quick-play rosters), so the move rate averages out
function cpuHandle(p) {
  const s = p.st, key = [s.spd, s.pas, p.def && p.def.name, p.def && p.def.arch, p.def && p.def.look && p.def.look.style].join(',');
  if (p._hnd != null && p._hndK === key) return p._hnd;
  const v = k => (s[k] == null ? 5 : s[k]);
  const h = clamp(5 + (v('spd') - 6.5) * 1.2 + (v('pas') - 5) * 0.6 + (cpuArch(p) === 'playmaker' ? 1.2 : 0), 1, 10);
  p._hnd = h; p._hndK = key; return h;
}
const cpuMoveK = p => clamp(1 + (cpuHandle(p) - CPU_HANDLE_AVG) * 0.35, 0.5, 1.6);   // 9.2 (Hakeem, Rami) 1.6x, 5.6 1x, 4.4 0.55x, 3.2 0.5x
// a chained second move: never on Very easy, more on harder settings (from the difficulty's move rate, so career levels blend)
const cpuChainP = cf => clamp(((cf && cf.cross) || 0) - 0.08, 0, 0.4) * 1.3;
const cpuStyleOn = p => p && p.st && p.human < 0 && !M.mini && !(typeof Net !== 'undefined' && Net.role === 'guest');
// an open look behind the arc for a shooter: no dribble move, he keeps the shot (the shot's worth counts the difficulty's
// misses, so on Very easy, where the CPU misses more, it takes a better look to count as good)
function cpuShootFirst(p, dd) {
  if (cpuArch(p) !== 'sharpshooter' || dd < 45) return false;
  const h = attackHoop(p.team);
  return isThree(p.x, p.z, h) && shotProbability(p, p.x, p.z) * 3 * (typeof cpuMakeK === 'function' ? cpuMakeK(p) : 1) >= 0.95;
}
{
  const BP = Brain.prototype, _up = BP.update, _ch = BP.choose;
  BP.update = function (dt) {
    _up.call(this, dt);
    const p = this.p, c = p.cmd;
    if (!cpuStyleOn(p) || ball.owner !== p) return;
    c.x = false;                                          // the move decision is made here (it replaces ai.js's flat rate)
    if (p.state !== 'free' || p.postUp) return;
    const cf = this.cfg(), dd = nearestOppDist(p.x, p.z, p.team);
    if (cpuShootFirst(p, dd)) return;
    // sharpshooters set up the shot: the fadeaway (Hard's skill use) twice as often with a defender close behind the arc
    if (cpuArch(p) === 'sharpshooter' && cf.skillUse > 0.05 && dd < 70 && isThree(p.x, p.z, attackHoop(p.team)) && chance(dt * cf.skillUse)) c.s = true;
    if (p.mv || (p.cd.mv || 0) > 0) return;
    const sinceEnd = M.time - (p.mvEnd == null ? -9 : p.mvEnd);
    if (sinceEnd < 0.75) {                                // inside a run of moves: at most one more (a chain), never a third
      if ((p.combo || 0) >= 1 || p._chainFor === p.mvEnd) return;
      p._chainFor = p.mvEnd;
      if (sinceEnd < 0.5 && dd < 60 && cpuHandle(p) >= 8 && chance(cpuChainP(cf))) c.x = true;
      return;
    }
    if (M.time - (p._mvStart == null ? -9 : p._mvStart) < 0.9) return;
    if (!(p.cd.cross > 0) && cf.cross && dd < 50 && chance(dt * cf.cross * cpuMoveK(p))) c.x = true;
  };
  // after his move: a shooter looks to shoot, a rim runner to attack the rim
  BP.choose = function (opts) {
    const p = this.p, a = p._after;
    if (cpuStyleOn(p) && a && opts && M.time - a.t < 0.9) for (const o of opts) {
      if (a.shoot && o.type === 'shoot') o.u += 0.3;
      if (a.shoot && (o.type === 'drive' || o.type === 'dunk')) o.u -= 0.12;
      if (a.drive && (o.type === 'drive' || o.type === 'dunk')) o.u += 0.3;
    }
    return _ch.apply(this, arguments);
  };
}
// which move
{
  const _aiMove = aiMove;
  aiMove = function (p) {
    if (!cpuStyleOn(p)) return _aiMove.apply(this, arguments);
    if ((p.combo || 0) >= 1 && M.time - (p.mvEnd == null ? -9 : p.mvEnd) < 0.75) return false;   // never three in a row
    const H = hoopDir(p), def = nearestOpp(p); if (!def) return false;
    const pl = p.ai.plan || {}, sig = sigKind(p.def), dd = dxz(def, p), inFront = dxz(def, H.h) < H.d && dd < 80;
    const hd = cpuHandle(p), arch = cpuArch(p), three = isThree(p.x, p.z, H.h), big = arch === 'rimrunner' || (p.st.dnk || 5) >= 8;
    const attacking = pl.type === 'drive' || pl.type === 'dunk' || pl.type === 'probe';
    let w;
    if (hd <= 4) w = { cross: 3 };                         // a poor handler only crosses over
    else {
      w = { cross: 3, btb: 1.4, hesi: 1.2, spin: inFront && attacking ? 2.2 : 0, stepback: H.d > 220 && H.d < 380 ? 1.6 : 0, drop: 0 };
      if (hd >= 8) { w.btb *= 1.7; w.hesi *= 1.6; w.spin = Math.max(w.spin, inFront ? 0.8 : 0) * 1.6; w.cross *= 0.8; }
      if (big && inFront && attacking) { w.spin = Math.max(w.spin, 1.4) * 1.6; if (H.d < 230) w.drop = 1.4; }
      if (arch === 'sharpshooter' && three && dd < 70) w.stepback = Math.max(w.stepback, 1.6) * 2;
      if (w[sig] != null) w[sig] += 2.2;                  // his signature move (as before)
      if (dd < 40 && hd < 5.5) { w.btb = 0; w.spin = 0; } // not with a defender in his chest
    }
    for (const k in w) if (beingRead(p, k)) w[k] *= 0.3;
    let tot = 0; for (const k in w) tot += w[k];
    if (!(tot > 0)) return false;
    let r = Math.random() * tot, kind = 'cross'; for (const k in w) { if (!(w[k] > 0)) continue; r -= w[k]; if (r <= 0) { kind = k; break; } }
    const side = sgn((p.x - def.x) * H.px + (p.z - def.z) * H.pz) || 1;
    if (!startDribbleMove(p, kind, side)) return false;
    p._mvStart = M.time;
    p._after = { t: M.time, kind, shoot: arch === 'sharpshooter', drive: big && (kind === 'spin' || kind === 'drop') };
    return true;
  };
}
// dunks: the type by his ratings; a poor dunker lays it in some of the time
const DUNK_TYPES = new Set(['twohand', 'windmill', '360', 'tomahawk']);
function cpuSigDunk(p) { return (p.st.dnk || 5) >= 8 ? ['windmill', '360', 'tomahawk'][hash32('dunk|' + ((p.def && p.def.name) || p.slot)) % 3] : null; }
// (picked by a hash of the player, his attempt count and the match frame, not Math.random: the same in a replayed or
// rolled-back frame, and seeded games draw the same random numbers as before)
function cpuDunkPick(p, allowed, fast) {
  const dn = p.st.dnk == null ? 5 : p.st.dnk, sp = p.st.spd == null ? 5 : p.st.spd, arch = cpuArch(p), sig = cpuSigDunk(p);
  const hi = clamp((dn - 6) / 3, 0, 1) * clamp((sp - 4) / 4, 0.4, 1);         // 0 (plain) .. 1 (the big dunks)
  const w = { twohand: 2.2 - 1.9 * hi, tomahawk: 0.8 + 0.8 * hi + (arch === 'rimrunner' ? 0.5 : 0) + (fast ? 0.6 : 0), windmill: 0.3 + 1.5 * hi, '360': 0.05 + 1.6 * hi };
  if (dn <= 5) { w.windmill *= 0.3; w['360'] = 0; }
  if (sig && hi > 0.3) w[sig] *= 2;
  const L = allowed.filter(t => w[t] > 0); if (!L.length) return null;
  let tot = 0; for (const t of L) tot += w[t];
  let r = (hash32('dunk|' + ((p.def && p.def.name) || p.slot) + '|' + ((p.stats && p.stats.fga) || 0) + '|' + Math.round(M.time * 60)) % 100000) / 100000 * tot;
  for (const t of L) { r -= w[t]; if (r <= 0) return t; }
  return L[L.length - 1];
}
{
  const _sd = startDunk;
  startDunk = function (p, opts) {
    const r = _sd.apply(this, arguments), a = p.act;
    if (!cpuStyleOn(p) || !p.st || M.practice || !a || p.state !== 'dunk' || a.alley || (opts && opts.alley) || !DUNK_TYPES.has(a.type)) return r;
    const d = dxz(p, a.hoop), fast = Math.hypot(p.vx || 0, p.vz || 0) > 180 || (M.trans && M.trans.team === p.team);
    const allowed = d > 180 ? ['360', 'windmill', 'tomahawk'] : d > 100 ? ['tomahawk', 'windmill', 'twohand'] : ['twohand', 'tomahawk'];   // what fits the distance (as before)
    const t = cpuDunkPick(p, allowed, fast);
    if (t && t !== a.type) { a.type = t; if (t === 'twohand' && d <= 170) a.big = false; }   // the look only: the timing (D, peak) stays the random pick's, so what goes in is unchanged
    return r;
  };
  // a poor dunker near the rim lays it in some of the time, even with the lane open
  const _fl = freeLogic;
  freeLogic = function (p) {
    const c = p.cmd;
    if (c.b && cpuStyleOn(p) && !M.practice && ball.owner === p && p.state === 'free' && !p.postUp && (p.st.dnk == null ? 5 : p.st.dnk) <= 5) {
      const h = attackHoop(p.team);
      if (dxz(p, h) < 150 && canDunk(p) && chance(clamp((6 - (p.st.dnk == null ? 5 : p.st.dnk)) * 0.25, 0, 0.6))) p._layT = M.time;
    }
    return _fl.apply(this, arguments);
  };
  const _cd = canDunk;
  canDunk = function (p) { return p && p._layT != null && M.time - p._layT < 0.25 && ball.owner === p ? false : _cd.apply(this, arguments); };
}
