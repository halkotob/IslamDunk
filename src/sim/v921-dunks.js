// ================================================= v9.21.0: TWO NEW DUNKS
// The reverse ('reverse': he turns his back to the rim on the way up and finishes backhand over his head) and between
// the legs ('betweenlegs': the ball goes under his near thigh from hand to hand at the top, then the far arm slams it).
// The types, their length and height are in players.js (dunkTypesFor, DUNK_LEN, DUNK_PEAK); the poses and the ball
// in animation.js; the body's turn in dunkSpin; the rating gate in v919-stat-curves.js (the reverse needs Dunking 6,
// between the legs 8: below that the same dunk is a tomahawk or a two-hander, its timing unchanged); the CPU's choice
// in v916-cpu-handle.js; the names in dunkName ('REVERSE JAM', 'THROUGH-THE-LEGS') and the pop over the rim.
// The sound: the slam as every dunk, and the existing swipe (a whoosh) as the ball goes under the legs / as he turns.
{
  const _du = dunkUpdate;
  dunkUpdate = function (p, dt) {
    const a = p.act, s0 = a ? a.s : 0;
    const r = _du.apply(this, arguments);
    if (a && (a.type === 'betweenlegs' || a.type === 'reverse')) {
      const at = a.type === 'betweenlegs' ? btlUnderAt() : 0.26;   // (v9.34.0: the moment the ball is halfway under, animation.js)
      if (s0 < at && a.s >= at && ball.owner === p && onScreen(p.x)) SFX.swipe && SFX.swipe();
    }
    return r;
  };
}
