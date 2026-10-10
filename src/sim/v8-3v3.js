
// ================================================= v8.3: 3 ON 3 (BETA)
// Quick Play → 3 on 3 (beta): your masjid plus a guest player against three. Same court and
// rules. Only active in that mode; everything else stays 2 on 2. Beta: the CPU's spacing and
// switching were built for two, so expect the odd crowded possession.
//   * marking: each defender takes one of the three (best matching by distance, switching on screens)
//   * the third players get their own spots on restarts
//   * passing goes to your most open teammate, not always the same one
function threeGuest(ti, k) {
  const donor = TEAMS[(ti + 3 + k) % TEAMS.length];
  return Object.assign({}, donor.players[1], { num: 30 + ((ti * 7 + 3) % 60), guest: true });
}
function threeTeam(T) { const ti = TEAMS.indexOf(T); return Object.assign({}, T, { players: [...T.players, threeGuest(ti < 0 ? 0 : ti, 0)] }); }
const PERM3 = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
{
  const _nm = newMatch;
  newMatch = function (tA, tB, opts = {}) {
    const three = Game.threeNext && !opts.attract && tA.players.length === 2 && tB.players.length === 2;
    Game.threeNext = false;
    if (three) { tA = threeTeam(tA); tB = threeTeam(tB); }
    const r = _nm.call(this, tA, tB, opts);
    M.three = three;
    if (three) { M.assign = [[0, 1, 2], [0, 1, 2]]; FX.callout('3 ON 3', '#ffd76a', 'BETA'); }
    return r;
  };
  const _sm = startMatchFromSelect;
  startMatchFromSelect = function () { Game.threeNext = !!(Game.sel && Game.sel.three); return _sm.apply(this, arguments); };
  // marking: the best one-to-one matching, with the same switch hysteresis as 2 on 2
  const _ua = updateAssign;
  updateAssign = function (team) {
    if (!M.three) return _ua.apply(this, arguments);
    const D = M.teams[team].players, O = M.teams[1 - team].players, a = M.assign[team];
    const cost = pm => pm.reduce((s, oi, di) => s + dxz(D[di], O[oi]), 0);
    let best = a, bc = cost(a);
    for (const pm of PERM3) { const c = cost(pm); if (c < bc * aiCfg(team).switchK) { best = pm; bc = c; } }
    M.assign[team] = best.slice();
  };
  // with a human on the team: he takes the man nearest him (or the one he's guarding), the CPU
  // teammates split the other two
  const _td = Brain.prototype.thinkDefense;
  Brain.prototype.thinkDefense = function () {
    _td.apply(this, arguments);
    if (!M.three) return;
    const p = this.p, T = M.teams[p.team].players, O = p.opps.slice(), taken = new Set();
    const hum = T.filter(q => q.human >= 0);
    for (const h of hum) { const m = (h.v8 && h.v8.man) || O.slice().sort((x, y) => dxz(x, h) - dxz(y, h))[0]; if (m) taken.add(m); }
    if (!hum.length) return;
    let man = null;
    for (const q of T.filter(q => q.human < 0).sort((x, y) => x.slot - y.slot)) {
      const m = O.filter(o => !taken.has(o)).sort((x, y) => dxz(x, q) - dxz(y, q))[0]; if (!m) break; taken.add(m); if (q === p) { man = m; break; }
    }
    if (!man) return;
    const bo = ball.owner || (ball.pass && ball.pass.to);
    this.plan = bo === man ? { type: 'guardBall', man } : { type: 'deny', man };
  };
  // restarts: the third players' spots
  const _fm = formation;
  formation = function (off) {
    const r = _fm.apply(this, arguments);
    if (!M.three) return r;
    const h = defendHoop(off), a = attackHoop(off), O = M.teams[off].players, D = M.teams[1 - off].players;
    if (M.halfCourt) { place(O[2], hoops[1].x + hoops[1].dir * 300, 150); place(D[2], hoops[1].x + hoops[1].dir * 220, 200); }
    else { place(O[2], h.x + h.dir * 220, 150); place(D[2], a.x + a.dir * 270, 560); }
    return r;
  };
  // passing: to the most open teammate (ties go to the closer one)
  const mateDesc = Object.getOwnPropertyDescriptor(Player.prototype, 'mate');
  Object.defineProperty(Player.prototype, 'mate', { configurable: true, get() {
    if (!M.three) return mateDesc.get.call(this);
    const T = M.players.filter(q => q.team === this.team && q !== this && q.state !== 'down');
    if (T.length < 2) return T[0] || mateDesc.get.call(this);
    const open = q => Math.min(...q.opps.map(o => dxz(o, q))) - dxz(q, this) * 0.15;
    return T.reduce((b, q) => (open(q) > open(b) ? q : b));
  } });
  // Quick Play entry
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    return _tm().map(e => e.label !== 'Quick Play' ? e : Object.assign({}, e, { sub: [...e.sub.slice(0, 3), { label: '3 on 3 (beta)', act: () => { startSelect('1p'); Game.sel.three = true; } }, ...e.sub.slice(3)] }));
  };
}
