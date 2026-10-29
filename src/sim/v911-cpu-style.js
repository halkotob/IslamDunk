// ================================================= v9.11: EVERY CPU PLAYER PLAYS HIS OWN GAME
// Play-test: "CPU opponents and teammates need more variety ... all based on stats and archetypes so each is unique".
// The CPU already chose between shooting, driving, passing and probing by expected points, so players with the same
// numbers looked alike (and playmakers, who drive well, ended up taking the most shots and making the fewest
// assists). Now each CPU player has tendencies, from his ratings and his play style, plus a small quirk of his own:
//   * passing: Passing and the playmaker / glue styles move the ball (more assists); scorers look for their own shot;
//   * shot diet: Shooting and the sharpshooter style hunt threes; glue guys and lockdowns take the open mid-range;
//     Dunking, Speed and rim runners attack the rim (drives, cuts, dunks, layups);
//   * off the ball: shooters spot up behind the arc, rim runners cut, glue guys and lockdowns set screens;
//   * defense: Defense, height and the lockdown / rim-runner styles go up for blocks more often; Steal and the
//     lockdown / playmaker styles reach for steals more; shooters and scorers save their legs.
// The average over the league stays about where it was (league rates are calibrated), the spread between players grows.
const CPU_ARCH_T = {   // per style: three, mid, rim, pass, probe, screen, block, steal
  sharpshooter: { t3: 0.2, mid: 0.06, rim: -0.14, pass: -0.1, probe: 0.04, scr: -0.15, blk: -0.24, stl: -0.3, press: -6 },
  playmaker: { t3: 0.02, mid: 0.04, rim: -0.14, pass: 0.4, probe: -0.05, scr: -0.05, blk: -0.18, stl: 0.3, press: 2 },
  rimrunner: { t3: -0.2, mid: -0.08, rim: 0.26, pass: -0.12, probe: -0.04, scr: 0.1, blk: 0.12, stl: -0.3, press: -2 },
  lockdown: { t3: -0.08, mid: 0.06, rim: 0, pass: 0.06, probe: -0.08, scr: 0.22, blk: 0.12, stl: 0.5, press: 5 },
  glue: { t3: -0.02, mid: 0.1, rim: 0.02, pass: 0.16, probe: -0.04, scr: 0.25, blk: 0.04, stl: 0.12, press: 2 }
};
function cpuArch(p) {
  const d = p.def || {};
  if (d.look && typeof lookArch === 'function') { const a = lookArch(d.look); if (a) return a; }
  return d.arch || (typeof archetypeOf === 'function' ? archetypeOf(p.st) : 'glue');
}
function cpuTend(p) {
  const s = p.st, key = [s.sht, s.dnk, s.pas, s.spd, s.def, s.stl, p.def && p.def.name].join(',');
  if (p._tnd && p._tndK === key) return p._tnd;
  const A = CPU_ARCH_T[cpuArch(p)] || CPU_ARCH_T.glue, R = seededRng(hash32('style|' + ((p.def && p.def.name) || p.slot)));
  const q = () => (R() * 2 - 1) * 0.07;                                    // his own quirk
  const v = k => (s[k] == null ? 5 : s[k]), tall = ((p.def && p.def.bh) != null ? p.def.bh : 1) - 1;
  const T = {
    t3: A.t3 + (v('sht') - 6) * 0.05 + q(),
    mid: A.mid + (v('sht') - 5) * 0.025 + q(),
    rim: A.rim + (v('dnk') - 5) * 0.045 + q(),
    pass: A.pass + (v('pas') - 5) * 0.06 + q(),
    probe: A.probe + (v('spd') - 5) * 0.02 + q() * 0.5,
    scr: A.scr + q(),
    blk: clamp(0.9 + A.blk + (v('def') - 5) * 0.05 + tall * 0.08 + q(), 0.4, 1),
    press: A.press + (v('def') - 5) * 0.5,
    stl: clamp(0.9 + A.stl + (v('stl') - 5) * 0.1 + q() * 2, 0.45, 1.9)
  };
  p._tnd = T; p._tndK = key; return T;
}
{
  // offense: weigh each choice by his tendencies
  const _ch = Brain.prototype.choose;
  Brain.prototype.choose = function (opts) {
    const p = this.p;
    if (p.human < 0 && opts && opts.length && !M.mini) {
      const T = cpuTend(p), h = attackHoop(p.team), bias = o => {
        if (o.type === 'shoot') { const d = dxz(p, h); return isThree(p.x, p.z, h) ? T.t3 : d < 150 ? T.rim * 0.5 : T.mid; }
        if (o.type === 'dunk' || o.type === 'drive') return T.rim;
        if (o.type === 'pass' || o.type === 'alley') return T.pass * 1.8;   // (a pass competes with the patience of the possession too)
        if (o.type === 'probe') return T.probe;
        if (o.type === 'spot' && o.x != null) return (isThree(o.x, o.z, h) ? T.t3 : T.mid) * 0.8;
        if (o.type === 'cut') return T.rim * 0.8;
        if (o.type === 'screen') return T.scr;
        return 0;
      };
      // relative to his own options (a pass-first player passes instead of shooting, not instead of waiting), so the
      // pace of the game and the league's averages stay where they were
      const B = opts.map(bias), mean = B.reduce((a, b) => a + b, 0) / B.length;
      opts.forEach((o, i) => { o.u += B[i] - mean; });
    }
    return _ch.apply(this, arguments);
  };
  // where he spots up: shooters behind the arc, others where they like to score
  const _bs = Brain.prototype.bestSpot;
  Brain.prototype.bestSpot = function (forHandler) {
    const p = this.p; if (p.human >= 0 || M.mini) return _bs.apply(this, arguments);
    const T = cpuTend(p), h = attackHoop(p.team), bo = ball.owner;
    let best = null, bu = -1e9;
    for (const s of offSpots(h)) {
      if (!forHandler && bo && Math.hypot(s.x - bo.x, s.z - bo.z) < 160) continue;
      const open = nearestOppDist(s.x, s.z, p.team), three = isThree(s.x, s.z, h);
      const ev = shotProbability(p, s.x, s.z, open) * (three ? 3 : 2);
      const u = ev + (three ? T.t3 : T.mid) * 0.6 - Math.hypot(s.x - p.x, s.z - p.z) / 700 + rand(0, 0.05);
      if (u > bu) { bu = u; best = s; }
    }
    return best || _bs.apply(this, arguments);
  };
  // defense: who goes up to contest a shot
  const _ns = notifyShot;
  notifyShot = function (sh) {
    const r = _ns.apply(this, arguments);
    for (const o of sh.opps) if (o.human < 0 && o.ai && o.ai.jumpAt > 0 && !M.mini && !chance(cpuTend(o).blk)) o.ai.jumpAt = -1;
    return r;
  };
}
// steals: the reach rate per player (ai.js reads cpuStealK)
function cpuStealK(p) { return p && p.human < 0 && !M.mini ? cpuTend(p).stl : 1; }
// on the ball: how much tighter (+) or looser (-) than usual he guards, in units
function cpuPress(p) { return p && p.human < 0 && !M.mini ? clamp(cpuTend(p).press, -8, 6) : 0; }   // (tighter than ~28 and the bodies collide)
