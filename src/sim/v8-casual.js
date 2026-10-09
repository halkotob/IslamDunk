
// ================================================= v8.2: CASUAL CONTROLS (Settings → Controls)
// Classic (default) is unchanged. Casual makes the game easier to pick up:
//   * Shooting: tap SHOOT and the release happens on its own near the top of your jump (a good,
//     not perfect, release; no pump fakes). Holding still works the same as a tap.
//   * Defense: when you leave the stick alone on defense you guard your man automatically, as if
//     you were holding DEFEND. Move the stick and you're free again.
// Single-player and local co-op; online games keep Classic so both sides play the same game.
SETTINGS.casual = false;
(() => { try { SETTINGS.casual = localStorage.getItem('islamdunk.casual') === '1'; } catch (e) {} })();
function casualOn() { return SETTINGS.casual && !Net.role && !M.attract; }
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    _hc.apply(this, arguments);
    if (!casualOn() || !M.players) return;
    const p = M.players.find(q => q.human === pad); if (!p) return;
    if ((p.state === 'windup' || p.state === 'shoot') && ball.owner === p) {
      if (p.caRel == null) p.caRel = apexT(p) + gauss() * 0.035 * (M.mini ? 1.3 : 1);
      c.bHeld = p.state === 'windup' || p.st_t < p.caRel;
    } else p.caRel = null;
    const bo = ball.owner;
    if (!M.mini && bo && bo.team !== p.team && Math.hypot(c.mx, c.mz) < 0.2 && !c.a && !c.aHeld && !c.b) c.xHeld = true;
  };
  const i = SET_ITEMS.findIndex(s => s.label === 'Team control');
  SET_ITEMS.splice(i, 0, { label: 'Controls', get: () => SETTINGS.casual ? 'Casual (auto release, auto guard)' : 'Classic', step: () => { SETTINGS.casual = !SETTINGS.casual; try { localStorage.setItem('islamdunk.casual', SETTINGS.casual ? '1' : '0'); } catch (e) {} } });
}
