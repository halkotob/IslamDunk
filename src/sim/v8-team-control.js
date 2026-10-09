
// ================================================= v8.1: CONTROL THE WHOLE TEAM (option, off by default)
// Options → Settings → Control: "Your player" (default) or "Whole team". With Whole team, you
// play whoever has the ball on offense (control follows every pass) and, on defense, whoever is
// guarding the ball when it changes hands. Your teammate plays the other spot as usual.
// Single-player games with a CPU partner only (Quick Play, Barakah Run, scenarios); career,
// co-op and online keep one player each.
SETTINGS.teamCtl = false;
(() => { try { SETTINGS.teamCtl = localStorage.getItem('islamdunk.teamctl') === '1'; } catch (e) {} })();
function teamCtlOn() { return SETTINGS.teamCtl && !M.career && !M.online && !Net.role && !M.attract && !M.mini && !M.practice && M.teams; }
function ctlSwitch(from, to) {
  if (!from || !to || from === to || to.human >= 0) return;
  const pad = from.human; from.human = -1; to.human = pad;
  for (const q of [from, to]) { zeroCmd(q.cmd); q.v7 = {}; q.v8 = {}; q.buf = null; q.ai.t = 0; q.ai.plan = { type: 'idle' }; }
  if (!M.attract) FX.pop(to.x, to.y + 140, to.z, 'YOU', '#ffd76a');
}
function teamCtlStep() {
  if (!teamCtlOn()) return;
  const bo = ball.owner, st = M.ctl || (M.ctl = { owner: null });
  for (const T of M.teams) {
    const P = T.players, hs = P.filter(q => q.human >= 0);
    if (hs.length !== 1 || P.length < 2) continue;
    const me = hs[0], mate = P.find(q => q !== me);
    if (bo && bo.team === me.team && bo === mate && bo.state !== 'dunk') ctlSwitch(me, mate);      // offense: you are the ball
    else if (bo && bo.team !== me.team && bo !== st.owner && me.state === 'free' && mate.state === 'free' && dxz(mate, bo) + 60 < dxz(me, bo)) ctlSwitch(me, mate);   // defense: take the man on the ball
  }
  st.owner = bo;
}
{
  const _um = updateMatch;
  updateMatch = function (dt) { if (!M.mini) teamCtlStep(); return _um.apply(this, arguments); };
  const i = SET_ITEMS.findIndex(s => s.label === 'Keep games close (rubber-band)');
  SET_ITEMS.splice(i + 1, 0, { label: 'Control', get: () => SETTINGS.teamCtl ? 'Whole team' : 'Your player', step: () => { SETTINGS.teamCtl = !SETTINGS.teamCtl; try { localStorage.setItem('islamdunk.teamctl', SETTINGS.teamCtl ? '1' : '0'); } catch (e) {} } });
}
// the settings list grew past the bottom of the screen: rows close up to fit
drawSettings = function (g) {
  dim(g, 0.72);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText('Settings', W / 2, 92);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Difficulty changes CPU reaction, decisions and timing. Player stats never change.', W / 2, 118);
  const n = SET_ITEMS.length, gap = Math.min(40, Math.floor((H - 172) / n));
  drawMenu(g, SET_ITEMS.map(s => s.label), Game.idx, 160, i => { if (i === n - 1) goTitle(); else SET_ITEMS[i].step(1); }, SET_ITEMS.map(s => s.get()), gap);
};
