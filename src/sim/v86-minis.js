// ================================================= v8.6: KING OF THE COURT FIXES
// King of the Court
//   * The CPU no longer gets stuck in the corners. After a change of possession the ball has to go
//     back out past the arc; from a corner the old target was still inside the arc, so the CPU kept
//     dribbling into the corner. It now clears out toward the wing.
//   * The winner (the king) starts the next game with the ball.
// (v9.8: 7 Up and the custom game room were removed after the play-test review.)
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
