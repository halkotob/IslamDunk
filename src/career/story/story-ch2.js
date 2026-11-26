// ================================================= v9.33 (refine 5): Chapter 2's opening
// (docs/career-overhaul/REFINE-PLAN.md, release 5; SCENES.md, Chapter 2)
// - C2.1 Sh. Saleem explains the loop at the first practice (practise between games, points, bucks, the prayer boost).
// - C2.2 and C2.3 shorter; "Why we play" is Sh. Saleem alone in his office.
// - C2.5 the seven stand around the gym: talk to any of them and the pick screen opens with him selected. The pick
//   screen (here and in every later pick) lists the seven on the left; on the right, his nine stats next to yours,
//   and your chemistry. Your teammate's last line: "Come talk to me when you're ready for the first game."

const PICK_STATS = [['sht', 'Shooting'], ['spd', 'Speed'], ['dnk', 'Dunking'], ['def', 'Defense'], ['stl', 'Stealing'], ['sta', 'Stamina'], ['pas', 'Passing'], ['hus', 'Hustle'], ['clu', 'Clutch']];
const PICK_READY = 'Come talk to me when you’re ready for the first game.';

// ---------------------------------------------------------------- C2.5: talk to a brother, and the pick opens
function storyPickWalkOpen(id) {
  const I = SW; if (!I || I.talk || I.fadeDir) return;
  const p = I.npcs[id], me = M.players[0]; if (p && me) { p.face = sgn(me.x - p.x) || 1; me.face = -p.face; }
  let i = STORY_MATES.indexOf(id); if (i < 0 || !storyPickable(id)) i = Math.max(0, STORY_MATES.findIndex(storyPickable));
  Game.spick = { S: I.S, sel: i, walk: true }; Game.screen = 'spick'; SFX.blip && SFX.blip();
}
{
  const _sp = storyPick;
  storyPick = function (i) {
    const P = Game.spick; if (!P || !P.walk) return _sp.apply(this, arguments);
    const id = STORY_MATES[i]; if (!storyPickable(id)) { SFX.bad && SFX.bad(); return; }
    C.partner = id; Game.spick = null; Game.screen = 'gym'; saveCareer(); SFX.good && SFX.good();
    const I = SW; if (!I) return storyDone(P.S, 'next');   // (swEnd: D.after, or the next scene)
    I.with = id; I.goals.pick = true;
    const L = storyPickLines(id).slice(0, 3).concat([[id, I.D.ready || PICK_READY]]);
    I.D = Object.assign({}, I.D, { journal: L });
    swSay(L, () => swEnd());
  };
  // Back from the pick screen in the walk: back to the walk, not the menu
  const _bs = BACK.spick;
  BACK.spick = function () { const P = Game.spick; if (P && P.walk) { Game.spick = null; Game.screen = 'gym'; return; } return _bs.apply(this, arguments); };
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen !== 'spick') return _cu.apply(this, arguments);
    const P = Game.spick; if (!P) return _cu.apply(this, arguments);
    const n = STORY_MATES.length;
    if (menuHit('up') || menuHit('left')) { P.sel = (P.sel + n - 1) % n; SFX.blip(); }
    else if (menuHit('down') || menuHit('right')) { P.sel = (P.sel + 1) % n; SFX.blip(); }
    else if (menuHit('ok')) storyPick(P.sel);
    else if (menuHit('back')) BACK.spick();
  };
}

// ---------------------------------------------------------------- the pick screen: the list on the left, him and you on the right
function spickLayout() {
  const TT = Input.touchMode, x0 = Math.round((W - 880) / 2), y0 = 66, rh = TT ? 54 : 52;
  return { x0, y0, lw: 300, rh, rx: x0 + 316, rw: 564, rows: STORY_MATES.map((id, i) => ({ id, x: x0, y: y0 + i * rh, w: 300, h: rh - 6 })) };
}
function spickRects() { return spickLayout().rows; }
function drawStoryPick(g) {
  const P = Game.spick; if (!P) return;
  dim(g, 0.84);
  const Lo = spickLayout(), T = amanahTeam(), id = STORY_MATES[P.sel], TT = Input.touchMode;
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText(P.S && P.S.keep ? 'Your teammate for the next game' : 'Pick your teammate', Math.max(Lo.x0, 136), 46);   // (clear of the Back button)
  // the seven
  Lo.rows.forEach((r, i) => {
    const on = P.sel === i, ok = storyPickable(r.id), cur = C.partner === r.id;
    g.globalAlpha = ok ? 1 : 0.45;
    g.fillStyle = on ? 'rgba(232,195,90,0.24)' : 'rgba(8,16,24,0.88)'; roundRect(g, r.x, r.y, r.w, r.h, 10); g.fill();
    if (on) { g.strokeStyle = GOLD; g.lineWidth = 2; roundRect(g, r.x, r.y, r.w, r.h, 10); g.stroke(); }
    g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(fitText(g, castDef(r.id).name, r.w - 80), r.x + 16, r.y + 20);
    g.fillStyle = HUB_GOLD_DIM; g.font = `12px ${BODY}`; g.fillText(fitText(g, ok ? MATE_ROLE[r.id] : 'Away for Hajj', r.w - 80), r.x + 16, r.y + 38);
    if (cur) { g.fillStyle = GOLD; g.font = `11px ${FONT}`; g.textAlign = 'right'; g.fillText('NOW', r.x + r.w - 12, r.y + 20); g.textAlign = 'left'; }
    g.globalAlpha = 1;
    addRect(r.x, r.y, r.w, r.h, () => { if (P.sel === i) storyPick(i); else { P.sel = i; SFX.blip(); } });
  });
  // him and you
  const x = Lo.rx, y = Lo.y0, w = Lo.rw, h = Lo.rows.length * Lo.rh - 6;
  g.fillStyle = 'rgba(8,16,24,0.9)'; roundRect(g, x, y, w, h, 14); g.fill();
  g.save(); roundRect(g, x + 2, y + 2, 150, h - 4, 12); g.clip(); drawPortrait(g, x + 78, y + h - 12, castDef(id), T, 1.5, 'thobe'); g.restore();
  const cx = x + 168, cw = w - 184;
  g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(fitText(g, castDef(id).name, cw), cx, y + 30);
  g.fillStyle = HUB_GOLD_DIM; g.font = `12px ${BODY}`; g.fillText(fitText(g, storyPickable(id) ? MATE_ROLE[id] : 'Away for Hajj', cw), cx, y + 50);
  const his = storyMateStats(id, C.stage), mine = playerDef().stats, top = MATE_STANDOUT[id] || [];
  const colY = y + 76, bw = Math.round((cw - 104) / 2), rh = TT ? 28 : 27, ax = cx + 96, bx = ax + bw + 8;
  g.font = `11px ${FONT}`; g.fillStyle = '#f2cf6b'; g.fillText((C.name || 'You').toUpperCase(), ax, colY); g.fillStyle = '#8fe3ff'; g.fillText(fitText(g, castDef(id).name.toUpperCase(), bw), bx, colY);
  PICK_STATS.forEach(([k, lab], j) => {
    const yy = colY + 12 + j * rh, a = clamp(+mine[k] || 0, 0, 10), b = clamp(+his[k] || 0, 0, 10), hot = top.includes(k);
    g.fillStyle = hot ? '#fff' : IVORY; g.font = `12px ${hot ? FONT : BODY}`; g.fillText(lab, cx, yy + 13);
    [[ax, a, '#f2cf6b'], [bx, b, '#8fe3ff']].forEach(([px, v, col]) => {
      g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, px, yy + 4, bw - 26, 10, 5); g.fill();
      g.fillStyle = col; roundRect(g, px, yy + 4, Math.max(4, (bw - 26) * v / 10), 10, 5); g.fill();
      g.fillStyle = '#fff'; g.font = `12px ${FONT}`; g.textAlign = 'right'; g.fillText(String(v), px + bw - 4, yy + 14); g.textAlign = 'left';
    });
  });
  const v = chemOf(id), my = colY + 12 + PICK_STATS.length * rh + 14;
  g.fillStyle = HUB_GOLD_DIM; g.font = `11px ${FONT}`; g.fillText('CHEMISTRY ' + Math.round(v), cx, my + 8);
  meter(g, ax, my, cw - 96, 9, v / 100, v >= 75 ? '#57e389' : v >= 25 ? '#f2cf6b' : '#9fb3c8');
  // play with him
  const bh = TT ? 44 : 38, bwid = 300, by = y + h + 12;
  g.fillStyle = storyPickable(id) ? GOLD : 'rgba(255,255,255,0.2)'; roundRect(g, x + w - bwid, by, bwid, bh, bh / 2); g.fill();
  g.textAlign = 'center'; g.fillStyle = NIGHT; g.font = `15px ${FONT}`; g.fillText(fitText(g, 'Play with ' + castDef(id).name, bwid - 24), x + w - bwid / 2, by + bh / 2 + 5);
  addRect(x + w - bwid, by, bwid, bh, () => storyPick(P.sel));
  if (!TT) { g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('↑ ↓ to choose  •  Enter to pick  •  Esc to go back', Lo.x0, by + bh / 2 + 5); }
}
