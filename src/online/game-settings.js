// ================================================= v7.6: ONLINE GAME SETTINGS (points target, half court)
// Lobby rows: "Points to win" for First-to games (win by 2) and "Court: Full / Half" for the 5-on-court
// modes. Half court uses the engine's half-court rules (both teams attack the right hoop, take it back
// past the arc after a change of possession, check ball at the top after scores). The host tells the
// guest both settings in the snapshot (fx.t, fx.hc).
const TARGETS = [7, 11, 15, 21, 31];
{
  const cyc = (arr, v, d) => arr[((arr.indexOf(v) < 0 ? 0 : arr.indexOf(v)) + d + arr.length) % arr.length];
  const _rows = Lobby.rows;
  Lobby.rows = function () {
    const R = _rows.call(this), o = this.opts(), g = o.game;
    if (!(g === 'co' || g === 'vs' || g === 'one')) return R;
    if (o.court !== 'half') o.court = 'full';
    if (!TARGETS.includes(o.target)) o.target = 21;
    const fi = R.findIndex(r => r.label === 'Format');
    if (fi >= 0) {
      R[fi].get = () => o.format === 'first21' ? 'First to ' + o.target : FORMAT_TXT[o.format];
      if (o.format === 'first21') R.splice(fi + 1, 0, { label: 'Points to win', get: () => o.target + '  (win by 2)', step: d => { o.target = cyc(TARGETS, o.target, d); } });
    }
    const vi = R.findIndex(r => r.label === 'Venue');
    R.splice(vi >= 0 ? vi : R.length, 0, { label: 'Court', get: () => (o.court === 'half' ? 'Half court' : 'Full court'), step: () => { o.court = o.court === 'half' ? 'full' : 'half'; } });
    return R;
  };
  const _apply = Lobby.apply, _restore = Lobby.restore;
  Lobby.apply = function () {
    if (!this.saved) this._tgt = SETTINGS.target;
    _apply.call(this);
    const o = this.opts(); SETTINGS.target = o.format === 'first21' ? o.target : undefined;
  };
  Lobby.restore = function () { const had = !!this.saved; _restore.call(this); if (had) SETTINGS.target = this._tgt; };
  // guest: scroll the host's settings list
  const _lu = lobbyUpdate;
  lobbyUpdate = function (rdt) {
    if (Net.role === 'guest') { if (menuHit('up')) Lobby.gScroll = (Lobby.gScroll | 0) - 1; if (menuHit('down')) Lobby.gScroll = (Lobby.gScroll | 0) + 1; }
    return _lu(rdt);
  };
  // ---- half court
  function halfCourtOn(opts) { return Net.role === 'host' && !!Lobby.saved && Lobby.opts().court === 'half' && !opts.attract && !opts.practice && !opts.career && !M.mini; }
  const _fm = formation;
  formation = function (off) {
    if (!M.halfCourt || M.gym) return _fm(off);
    const h = hoops[1], d = h.dir, O = M.teams[off].players, D = M.teams[1 - off].players;
    place(O[0], h.x + d * 400, 350); place(O[1], h.x + d * 250, 540);
    place(D[0], h.x + d * 320, 350); place(D[1], h.x + d * 190, 480);
    for (const p of M.players) p.turbo = 100;
  };
  const _nm = newMatch;
  newMatch = function (tA, tB, opts = {}) {
    _nm(tA, tB, opts);
    if (!halfCourtOn(opts)) return;
    M.halfCourt = true; M.mustClear = [false, false];
    const t = rint(2); formation(t); inbound(t); M.nextStart = 1 - t;
    FX.callout('BISMILLAH!', '#ffd76a', 'HALF COURT  •  CHECK BALL');
  };
}

