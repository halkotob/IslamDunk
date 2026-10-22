// ================================================= v9.5: ACCESSIBILITY (Settings)
// All three are in Settings → Accessibility.
//   * Team colors: Normal, or Colorblind-safe. Colorblind-safe dresses the two sides of
//     every game in blue and orange (Okabe-Ito colors, told apart with any common color blindness), with
//     light and dark trim. Only how the game looks on this screen changes.
//   * Text size: Normal, Large or Larger, on a computer. Small text is raised to a
//     minimum size as it's drawn (the same way phones already raise it), so layouts that fit on a phone
//     fit here too. Phones keep their own minimum.
//   * Shot release: Timed (classic) or Automatic. Automatic releases the shot near the
//     top of the jump on its own: a good release, not always a perfect one. Defense is unchanged (the
//     Casual controls setting turns on both automatic release and auto guard). Online games keep the
//     timed release, so both players play the same game.
SETTINGS.cbSafe = false; SETTINGS.textSize = 0; SETTINGS.autoShot = false;
(() => { try { const o = JSON.parse(localStorage.getItem('islamdunk.access') || '{}'); SETTINGS.cbSafe = !!o.cb; SETTINGS.textSize = clamp(o.ts | 0, 0, 2); SETTINGS.autoShot = !!o.as; } catch (e) {} })();
function accessSave() { try { localStorage.setItem('islamdunk.access', JSON.stringify({ cb: SETTINGS.cbSafe ? 1 : 0, ts: SETTINGS.textSize, as: SETTINGS.autoShot ? 1 : 0 })); } catch (e) {} }
const CB_KITS = [{ c1: '#0072B2', c2: '#f4f4f4' }, { c1: '#E69F00', c2: '#1d1d1d' }];
const TEXT_SIZES = ['Normal', 'Large', 'Larger'], TEXT_MIN = [0, 13, 15];   // minimum font size in game units (phones get about 14)

// ---- team colors: applied after the match is built, so every other newMatch wrapper (online custom
// teams, 3 on 3, Barakah Run) has already picked its teams
{
  const _nm = newMatch;
  newMatch = function (tA, tB, opts) {
    const r = _nm.apply(this, arguments);
    if (SETTINGS.cbSafe && !M.attract && M.teams && M.teams.length === 2) {
      M.teams.forEach((t, k) => {
        const d = Object.assign({}, t.def, CB_KITS[k]); t.def = d; M.teamDefs[k] = d;
        for (const p of t.players) p.T = d;
      });
    }
    return r;
  };
}

// ---- text size on a computer
function deskFloor(g) {
  if (Input.touchMode || !SETTINGS.textSize) return null;
  const f = g.font, m = /([\d.]+)px/.exec(f); if (!m) return null;
  const t = g.getTransform(), k = Math.hypot(t.a, t.b) / ((canvas && canvas.width ? canvas.width : W) / W); if (!(k > 0)) return null;
  const min = TEXT_MIN[SETTINGS.textSize] / k; if (+m[1] >= min - 0.01) return null;
  g.font = f.replace(m[0], (Math.ceil(min * 10) / 10) + 'px'); return f;
}
function deskTextInstall(g) {
  if (!g || g.__desk) return; g.__desk = true;
  for (const name of ['fillText', 'strokeText', 'measureText']) {
    const prev = g[name];
    g[name] = function (text, ...a) { const old = deskFloor(this); try { return prev.call(this, text, ...a); } finally { if (old !== null) this.font = old; } };
  }
}
{
  const _r = render;
  render = function (g) { const r = _r.apply(this, arguments); deskTextInstall(g); return r; };   // after the phone pass installs its own
  const effPx = g => { const old = deskFloor(g), m = /([\d.]+)px/.exec(g.font), px = m ? +m[1] : 12; if (old !== null) g.font = old; return px; };
  const _wt = wrapText;
  wrapText = function (g, text, x, y, maxW, lh) { return _wt.call(this, g, text, x, y, maxW, SETTINGS.textSize && !Input.touchMode ? Math.max(lh, effPx(g) * 1.18) : lh); };
  const _wl = wrapTextLeft;
  wrapTextLeft = function (g, text, x, y, maxW, lh) { return _wl.call(this, g, text, x, y, maxW, SETTINGS.textSize && !Input.touchMode ? Math.max(lh, effPx(g) * 1.18) : lh); };
}

// ---- automatic shot release (the same release Casual controls use)
{
  const _hc = humanCmd;
  humanCmd = function (pad, c) {
    _hc.apply(this, arguments);
    if (!SETTINGS.autoShot || SETTINGS.casual || Net.role || M.attract || !M.players) return;
    const p = M.players.find(q => q.human === pad); if (!p) return;
    if ((p.state === 'windup' || p.state === 'shoot') && ball.owner === p) {
      if (p.asRel == null) p.asRel = apexT(p) + gauss() * 0.035 * (M.mini ? 1.3 : 1);
      c.bHeld = p.state === 'windup' || p.st_t < p.asRel;
    } else p.asRel = null;
  };
}

// ---- the settings rows
{
  const after = (label, item) => { const i = SET_ITEMS.findIndex(s => s.label === label); SET_ITEMS.splice(i >= 0 ? i + 1 : SET_ITEMS.length - 1, 0, item); };
  after('Controls', { label: 'Shot release', get: () => SETTINGS.casual ? 'Automatic (Casual)' : SETTINGS.autoShot ? 'Automatic' : 'Timed', step: () => { if (SETTINGS.casual) { toast('Casual controls already release shots for you', 2.5); return; } SETTINGS.autoShot = !SETTINGS.autoShot; accessSave(); } });
  after('Resolution', { label: 'Text size', get: () => Input.touchMode ? 'Phone size' : TEXT_SIZES[SETTINGS.textSize], step: d => { if (Input.touchMode) { toast('Phones already use a larger minimum text size', 2.5); return; } SETTINGS.textSize = (SETTINGS.textSize + (d || 1) + 3) % 3; accessSave(); } });
  after('Text size', { label: 'Team colors', get: () => SETTINGS.cbSafe ? 'Colorblind-safe' : 'Normal', step: () => { SETTINGS.cbSafe = !SETTINGS.cbSafe; accessSave(); } });
  // their own group, before Sound & display (which takes everything not listed)
  if (!SET_GROUPS.some(g => g.name === 'Accessibility')) SET_GROUPS.splice(SET_GROUPS.length - 1, 0, { name: 'Accessibility', labels: ['Shot release', 'Text size', 'Team colors'] });
}
