// ================================================================ MENUS UI
// Animated menu lists: selection tweens (scale + color), mouse hover, touch
// press, and in-place submenus that slide over their parent list.
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function tween(key, target, speed = 14) {
  const A = Game.anim || (Game.anim = {});
  const v = A[key] == null ? target : A[key];
  return (A[key] = v + (target - v) * Math.min(1, (Game.rdt || STEP) * speed));
}
function ptIn(pt, x, y, w, h) { if (!pt) return false; const X = x + (Game.ox || 0); return pt.x >= X && pt.x <= X + w && pt.y >= y && pt.y <= y + h; }
function hovering(x, y, w, h) { return Input.mouse.on && ptIn(Input.mouse, x, y, w, h); }
function pressing(x, y, w, h) { return ptIn(Input.touch, x, y, w, h); }
// items: [{ label, badge?, sub?, value? }]
function drawMenuList(g, key, items, idx, y, gap, onSel, onHover, active = true, width = 320) {
  items.forEach((it, i) => {
    const yy = y + i * gap, w = width, h = Math.min(36, gap - 4), x = W / 2 - w / 2, top = yy - h / 2 - 7;
    const hov = active && hovering(x, top, w, h), pr = active && pressing(x, top, w, h);
    if (hov && onHover && idx !== i) onHover(i);
    const a = tween(key + ':' + i, i === idx ? 1 : 0), s = 1 + 0.045 * a - (pr ? 0.035 : 0);
    g.save(); g.translate(W / 2, top + h / 2); g.scale(s, s);
    if (a > 0.02) { g.globalAlpha *= a; goldPill(g, -w / 2, -h / 2, w, h, h / 2, pr); g.globalAlpha /= a; }   // v7.6: bevelled gold
    else if (hov) { glassPill(g, -w / 2, -h / 2, w, h, h / 2, 0.6); }
    const col = lerpColor(IVORY, '#2a1a04', a);
    g.fillStyle = col; g.font = `18px ${a > 0.5 ? FONT : BODY}`; g.textBaseline = 'middle';
    if (it.value != null) {
      g.textAlign = 'left'; g.fillText(it.label, -w / 2 + 20, 1);
      g.textAlign = 'right'; g.fillText(it.value ? '\u25C2 ' + it.value + ' \u25B8' : '', w / 2 - 18, 1);
    } else {
      g.textAlign = 'center'; g.fillText(it.label, it.badge ? -28 : 0, 1);
      if (it.badge) {
        g.font = `12px ${FONT}`; const bw = g.measureText(it.badge).width + 16;
        g.fillStyle = a > 0.5 ? 'rgba(11,19,48,0.18)' : 'rgba(232,195,90,0.18)'; roundRect(g, w / 2 - bw - 30, -10, bw, 20, 10); g.fill();
        g.fillStyle = a > 0.5 ? NIGHT : '#f2cf6b'; g.textAlign = 'center'; g.fillText(it.badge, w / 2 - bw / 2 - 30, 1);
      }
      if (it.sub) { g.fillStyle = col; g.font = `18px ${FONT}`; g.textAlign = 'right'; g.fillText('\u203A', w / 2 - 14, 0); }
    }
    g.textBaseline = 'alphabetic';
    g.restore();
    if (active) addRect(x, top, w, h, () => onSel(i));
  });
}
function drawMenu(g, items, idx, y, onSel, values, gap = 40) {
  const list = items.map((label, i) => ({ label, value: values ? values[i] : null }));
  drawMenuList(g, Game.screen + ':' + y, list, idx, y, gap,
    i => { if (Game.idx === i || !values) onSel(i); Game.idx = i; }, i => { Game.idx = i; }, true, values ? 460 : 320);
}
// ---- menus with in-place submenus (title screen, career hub)
function menuState(id) { const M_ = Game.menus || (Game.menus = {}); return M_[id] || (M_[id] = { idx: 0, sub: -1, sidx: 0, t: 0, last: 0 }); }
function menuActivate(id, items, i) {
  const m = menuState(id); SFX.blip();
  if (m.sub >= 0) { m.sidx = i; items[m.sub].sub[i].act(); return; }
  m.idx = i;
  if (items[i].sub) { m.sub = i; m.last = i; m.sidx = 0; } else items[i].act();
}
function closeSub(id) { const m = menuState(id); if (m.sub >= 0) { m.sub = -1; SFX.blip(); return true; } return false; }
function menuStackUpdate(id, items, onRootBack) {
  const m = menuState(id), inSub = m.sub >= 0, n = inSub ? items[m.sub].sub.length : items.length;
  const key = inSub ? 'sidx' : 'idx';
  if (menuHit('up')) { m[key] = (m[key] + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { m[key] = (m[key] + 1) % n; SFX.blip(); }
  if (inSub && menuHit('left')) { closeSub(id); return; }
  if (menuHit('ok') || (!inSub && items[m.idx].sub && menuHit('right'))) menuActivate(id, items, m[key]);
  else if (menuHit('back')) { if (!closeSub(id) && onRootBack) onRootBack(); }
}
function drawMenuStack(g, id, items, y, gap = 40) {
  const m = menuState(id);
  if (m.sub >= 0 && !(items[m.sub] && items[m.sub].sub)) m.sub = -1;
  if (m.sub >= 0) m.last = m.sub;
  m.t += ((m.sub >= 0 ? 1 : 0) - m.t) * Math.min(1, (Game.rdt || STEP) * 12);
  if (m.t < 0.98) {
    g.save(); g.globalAlpha = 1 - m.t; g.translate(-m.t * 90, 0);
    drawMenuList(g, id + ':p', items, m.idx, y, gap, i => menuActivate(id, items, i), i => { m.idx = i; }, m.sub < 0);
    g.restore();
  }
  const par = items[m.sub >= 0 ? m.sub : m.last];
  if (m.t > 0.02 && par && par.sub) {
    g.save(); g.globalAlpha = m.t; g.translate((1 - m.t) * 90, 0);
    g.textAlign = 'center'; g.fillStyle = '#f2cf6b'; g.font = `13px ${FONT}`; g.fillText('\u2039  ' + par.label.toUpperCase(), W / 2, y - 18);
    if (m.sub >= 0) addRect(W / 2 - 110, y - 36, 220, 26, () => closeSub(id));
    drawMenuList(g, id + ':s' + m.last, par.sub, m.sidx, y + 14, gap, i => menuActivate(id, items, i), i => { m.sidx = i; }, m.sub >= 0);
    g.restore();
  }
}
// ---- shared buttons with hover (mouse) and pressed (touch) states
function uiButton(g, x, y, w, h, label, fn, primary) {
  const hov = hovering(x, y, w, h), pr = pressing(x, y, w, h), a = tween('btn:' + Game.screen + x + ':' + y, hov ? 1 : 0, 16);
  g.save(); g.translate(x + w / 2, y + h / 2); const s = pr ? 0.96 : 1 + a * 0.03; g.scale(s, s);
  g.fillStyle = primary ? (pr ? '#c9a24a' : GOLD) : `rgba(255,255,255,${0.12 + a * 0.08})`; roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.fillStyle = primary ? NIGHT : '#fff'; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, 1); g.textBaseline = 'alphabetic';
  g.restore(); addRect(x, y, w, h, fn);
}
function roundButton(g, cx, cy, r, glyph, fn) {
  const hov = hovering(cx - r, cy - r, r * 2, r * 2), pr = pressing(cx - r, cy - r, r * 2, r * 2);
  g.fillStyle = pr ? '#c9a24a' : hov ? GOLD : 'rgba(8,14,22,0.85)'; g.beginPath(); g.arc(cx, cy, r * (pr ? 0.94 : 1), 0, Math.PI * 2); g.fill();
  g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.fillStyle = hov || pr ? NIGHT : GOLD; g.font = `26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, cx, cy + 1); g.textBaseline = 'alphabetic';
  addRect(cx - r - 6, cy - r - 6, r * 2 + 12, r * 2 + 12, fn);
}
// ---- low-contrast animated geometric pattern behind menus
function drawPatternBg(g, a) {
  const tile = sprite('pattern', 96, 96, c => {
    c.strokeStyle = '#e8c35a'; c.lineWidth = 1.3;
    star8(c, 48, 48, 24); c.stroke(); star8(c, 48, 48, 12, 1, 1, Math.PI / 8); c.stroke();
    for (const [x, y] of [[0, 0], [96, 0], [0, 96], [96, 96]]) { star8(c, x, y, 24); c.stroke(); }
    c.beginPath(); c.moveTo(48, 0); c.lineTo(48, 24); c.moveTo(48, 72); c.lineTo(48, 96); c.moveTo(0, 48); c.lineTo(24, 48); c.moveTo(72, 48); c.lineTo(96, 48); c.stroke();
  });
  if (!Sprites.patternFill) Sprites.patternFill = g.createPattern ? g.createPattern(tile, 'repeat') : null;
  if (!Sprites.patternFill) return;
  const off = (Game.t * 7) % 96;
  g.save(); g.globalAlpha = a; g.translate(off - 96, off * 0.5 - 96); g.fillStyle = Sprites.patternFill; g.fillRect(-500, 0, W + 1100, H + 200); g.restore();
}
const portraits = new Map();
function drawPortrait(g, x, y, def, T, s = 1.5, outfit = null, anim = null) {
  const key = def.name + '|' + def.skin + '|' + (def.look ? JSON.stringify(def.look) : '');
  let d = portraits.get(key);
  if (!d) { d = new Player(def, 9, 0, T); d.x = -9999; for (let i = 0; i < 40; i++) animate(d, 1 / 60); portraits.set(key, d); }
  d.T = T; d.face = 1; d.outfit = outfit; d.def = def;
  d.x = x + cam.x - FX.sx; d.z = (y - FLOOR_TOP - FX.sy) / ZS; d.y = 0;
  if (anim) { d.fakeHold = anim === 'dribble'; d.fakeIdle = true; d.vx = d.vz = 0; animate(d, Math.min(Game.rdt || STEP, 0.05)); }
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y); drawPlayer(g, d);
  if (anim === 'dribble') {         // a ball bouncing from the dribble hand, in time with the arm
    const hd = d.hands[d.dh], by = dribBallY(d, hd.y - 4);
    drawBallAt(g, hd.x + d.face * 5, by, hd.z + 3, Game.t * 3, false);
  }
  g.restore();
}
function statBar(g, x, y, label, v) {
  g.fillStyle = '#9fb3c8'; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText(label, x, y + 8);
  for (let i = 0; i < 10; i++) { g.fillStyle = i < v ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, x + 34 + i * 9, y, 7, 8, 2); g.fill(); }
}
// Team card: color header with crest, two player tiles with live previews
// (captain idles, guard dribbles), stat bars and hafiz badges.
function drawTeamPanel(g, x, y, T, active, ctrl) {
  const lift = tween('card:' + x, active ? 1 : 0, 10);
  y -= lift * 4;
  g.save(); g.globalAlpha = 0.55 + 0.45 * lift;
  g.fillStyle = 'rgba(8,14,22,0.9)'; roundRect(g, x, y, 420, 330, 16); g.fill();
  g.save(); roundRect(g, x, y, 420, 330, 16); g.clip();
  g.fillStyle = T.c1; g.fillRect(x, y, 420, 66); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + 50, 420, 16);
  g.fillStyle = T.c2; g.fillRect(x, y + 66, 420, 3);
  g.restore();
  g.strokeStyle = active ? GOLD : 'rgba(255,255,255,0.12)'; g.lineWidth = active ? 2.5 : 1; roundRect(g, x, y, 420, 330, 16); g.stroke();
  drawCrest(g, x + 38, y + 33, 22, T);
  if (active) { addRect(x + 14, y + 9, 48, 48, () => codeKey('J')); addRect(x + 366, y + 21, 44, 24, () => codeKey('L')); }   // touch code entry
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `21px ${FONT}`; g.fillText(T.name, x + 70, y + 40);
  for (const [i, c] of [[0, T.c1], [1, T.c2]]) { g.fillStyle = c; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x + 378 + i * 20, y + 33, 7, 0, Math.PI * 2); g.fill(); g.stroke(); }
  T.players.forEach((d, i) => {
    const px = x + 14 + i * 200, py = y + 80, you = ctrl === i;
    g.fillStyle = you ? 'rgba(232,195,90,0.14)' : 'rgba(255,255,255,0.04)'; roundRect(g, px, py, 192, 238, 12); g.fill();
    if (you) { g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke(); }
    drawPortrait(g, px + 46, py + 132, d, T, 1.25, null, active ? (i === 1 ? 'dribble' : 'idle') : null);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(d.name, px + 86, py + 24);
    g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('#' + d.num + (d.sheikh ? '  Captain' : '  Guard'), px + 86, py + 42);
    const badges = d.sheikh ? [d.huffath && ['HAFIZ', '#57d68d'], d.mufti && ['MUFTI', '#e8c35a']].filter(Boolean) : [];   // titles only for shyookh
    badges.forEach(([t, col], k) => { const bx = px + 86 + k * 52; g.fillStyle = col; roundRect(g, bx, py + 52, 48, 18, 9); g.fill(); g.fillStyle = NIGHT; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText(t, bx + 24, py + 65); });
    const S = d.stats;
    [['SPD', S.spd], ['SHT', S.sht], ['DNK', S.dnk], ['DEF', S.def], ['STL', S.stl], ['HUS', S.hus || hustleOf(S)], ['CLU', S.clu || clutchOf(S, d)]].forEach(([l, v], k) => statBar(g, px + 50, py + 146 + k * 12.6, l, v));
    if (d.arch && ARCHETYPES[d.arch]) { g.font = `9px ${FONT}`; const at = ARCHETYPES[d.arch].label, aw = g.measureText(at).width + 12; g.fillStyle = 'rgba(30,90,74,0.9)'; roundRect(g, px + 96 - aw / 2, py + 128, aw, 13, 6); g.fill(); g.fillStyle = '#f2cf6b'; g.textAlign = 'center'; g.fillText(at, px + 96, py + 138); }
  });
  g.restore();
}
function drawSelect(g) {
  const s = Game.sel; dim(g, 0.55);
  const head = s.step === 0 ? 'Choose your masjid' : s.step === 1 ? (s.mode === 'ovs' ? 'Choose your friend\u2019s masjid' : 'Choose your opponent') : 'Choose your player';
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `28px ${FONT}`; g.fillText(head, W / 2, 50);
  g.font = `14px ${BODY}`; g.fillStyle = IVORY;
  const subs = { '2p': 'Co-op: P1 plays the captain, P2 the guard', '1p': '1 player vs CPU',
    oco: 'Online, same team: you play the captain, your friend the guard', ovs: 'Online, head to head: you both play captains, CPU teammates' };
  g.fillText(subs[s.mode] || '', W / 2, 74);
  const showB = s.step >= 1;
  const ax = showB ? 40 : W / 2 - 210;
  drawTeamPanel(g, ax, 96, TEAMS[s.a], s.step === 0 || s.step === 2, s.step === 2 && s.mode !== '2p' ? s.ctrl : s.mode === '2p' && s.step > 0 ? -1 : -1);
  if (showB) drawTeamPanel(g, 500, 96, TEAMS[s.b], s.step === 1, -1);
  // arrows + confirm (tap targets)
  const ay = 262, lx = s.step === 1 ? 486 : ax - 14, rx = s.step === 1 ? 934 : ax + 434;
  roundButton(g, lx, ay - 12, 20, '\u2039', () => Game.selChange && Game.selChange(-1));
  roundButton(g, rx, ay - 12, 20, '\u203A', () => Game.selChange && Game.selChange(1));
  uiButton(g, W / 2 - 95, 446, 190, 40, s.step === 1 && (s.mode === 'oco' || s.mode === 'ovs') ? 'Get join code' : s.step === 2 || (s.step === 1 && s.mode === '2p') ? 'Tip off' : 'Confirm', selectOK, true);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('\u2190 \u2192 to change, Enter to confirm, Esc to go back', W / 2, 510);
}
function drawBoxScore(g, y0) {
  M.teams.forEach((T, ti) => {
    const y = y0 + ti * 112;
    g.fillStyle = 'rgba(8,16,24,0.85)'; roundRect(g, 150, y, 660, 100, 10); g.fill();
    drawCrest(g, 178, y + 24, 14, T.def);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText(T.def.name + '   ' + T.score, 200, y + 29);
    const cols = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'DNK', 'FG', 'FT', 'PF'];
    g.font = `11px ${FONT}`; g.fillStyle = '#9fb3c8';
    cols.forEach((c, i) => { g.textAlign = 'center'; g.fillText(c, 450 + i * 43, y + 28); });
    if (!M.fmt.first21) {
      const n = Math.max(M.fmt.periods, M.quarter);
      g.textAlign = 'left'; g.font = `12px ${FONT}`;
      for (let i = 0; i < n; i++) {
        const played = i < M.quarter, v = T.qs[i] || 0;
        g.fillStyle = '#9fb3c8'; g.fillText(periodShort(i), 200 + i * 52, y + 47);
        g.fillStyle = played ? '#fff' : '#56657a'; g.fillText(played ? String(v) : '\u2013', 200 + i * 52 + 22, y + 47);
      }
    }
    T.players.forEach((p, k) => {
      const yy = y + 66 + k * 22; const s = p.stats;
      g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText(p.def.name + (p.human >= 0 ? '  (P' + (p.human + 1) + ')' : ''), 178, yy);
      g.textAlign = 'center'; g.fillStyle = '#fff';
      [s.pts, s.reb, s.ast, s.stl, s.blk, s.dnk, s.fgm + '/' + s.fga, (s.ftm || 0) + '/' + (s.fta || 0), s.pf || 0].forEach((v, i) => g.fillText(String(v), 450 + i * 43, yy));
    });
  });
}
function drawHalftime(g) {
  dim(g, 0.7);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `40px ${FONT}`; g.fillText('HALFTIME', W / 2, 80);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText('Stretch, hydrate, and catch your breath', W / 2, 108);
  drawBoxScore(g, 150);
  g.fillStyle = '#fff'; g.font = `16px ${FONT}`;
  if (Net.role === 'guest') g.fillText('Waiting for your friend to start the second half', W / 2, 420);
  else { g.fillText('Press Enter or tap for the second half', W / 2, 420); addRect(0, 0, W, H, resumeFromHalf); }
}
function drawFinal(g) {
  dim(g, 0.7);
  const w = M.winner, T = M.teams[w].def;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `36px ${FONT}`; g.fillText(T.name.toUpperCase() + ' WIN', W / 2, 130);
  let sub = 'Final ' + M.teams[0].score + ' \u2013 ' + M.teams[1].score;
  g.fillStyle = IVORY; g.font = `16px ${BODY}`; g.fillText(sub, W / 2, 150);
  drawBoxScore(g, 175);
  g.fillStyle = '#fff'; g.font = `16px ${FONT}`;
  if (Net.role === 'guest') g.fillText('Waiting for your friend to start a rematch', W / 2, 440);
  else { g.fillText(Net.role === 'host' ? 'Press Enter or tap to go to the rematch screen' : 'Press Enter or tap to continue', W / 2, 440); addRect(0, 0, W, H, finalContinue); }
}
function drawSettings(g) {
  dim(g, 0.72);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `32px ${FONT}`; g.fillText('Settings', W / 2, 110);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Difficulty changes CPU reaction, decisions and timing. Player stats never change.', W / 2, 138);
  drawMenu(g, SET_ITEMS.map(s => s.label), Game.idx, 200, i => { if (i === SET_ITEMS.length - 1) goTitle(); else SET_ITEMS[i].step(1); }, SET_ITEMS.map(s => s.get()));
}
function drawHowTo(g) {
  dim(g, 0.8);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.fillText('How to play', W / 2, 60);
  const rows = [
    ['Move', 'W A S D', 'Arrow keys'], ['Pass  \u2022  STEAL on defense', 'J', 'Numpad 1  (or ,)'], ['Shoot  \u2022  BLOCK on defense', 'K (hold, release at the top)', 'Numpad 2  (or .)'], ['Turbo', 'L', 'Numpad 3  (or /)'], ['Crossover', 'H', 'Numpad 0  (or M)']
  ];
  g.font = `13px ${FONT}`; g.fillStyle = '#9fb3c8'; g.fillText('PLAYER 1', 520, 104); g.fillText('PLAYER 2', 770, 104);
  rows.forEach((r, i) => {
    const y = 134 + i * 30; g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText(r[0], 150, y);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `14px ${FONT}`; g.fillText(r[1], 520, y); g.fillText(r[2], 770, y);
  });
  const tips = [
    'Turbo + shoot near the rim to dunk. Longer dunks get bigger, slower and louder.',
    'Turbo + pass on defense is a shove. It works, but mind your adab.',
    'Without the ball: pass calls for it, shoot near the rim asks your teammate for an alley-oop.',
    'Three baskets in a row and you catch fire. Some players fill a Noor meter; answer the question for a glowing boost.',
    'Change direction while dribbling for a crossover. Hold turbo for a behind-the-back.',
    'Esc or P pauses. On a phone, use the on-screen stick and buttons.'
  ];
  g.textAlign = 'left'; g.font = `14px ${BODY}`; g.fillStyle = IVORY;
  tips.forEach((t, i) => g.fillText(t, 150, 290 + i * 28));
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `15px ${FONT}`; g.fillText('Press Enter or tap to go back', W / 2, 480);
  addRect(0, 0, W, H, goTitle);
}
function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
  g.fillText(line, x, yy); return yy;
}
function drawTrivia(g) {
  const tv = Game.trivia, [q, opts] = TRIVIA[tv.qi];
  if (tv.remote && !tv.done) { dim(g, 0.5); banner(g, 'Noor challenge', 'Your friend is answering a question for a boost...'); return; }
  dim(g, 0.72);
  g.fillStyle = 'rgba(12,40,44,0.97)'; roundRect(g, 150, 70, 660, 400, 16); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText('NOOR CHALLENGE', W / 2, 108);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText(tv.p.def.name + ' can earn a 12-second boost', W / 2, 130);
  g.fillStyle = '#fff'; g.font = `19px ${BODY}`; wrapText(g, q, W / 2, 170, 580, 26);
  if (C && C.learned && C.learned.includes(tv.qi)) { drawBook(g, 176, 88); g.textAlign = 'left'; g.fillStyle = '#9dffb0'; g.font = `12px ${BODY}`; g.fillText('Studied', 206, 104); g.textAlign = 'center'; }
  for (let i = 0; i < 4; i++) {
    const y = 230 + i * 50, correct = tv.order[i] === 0;
    let bg = i === tv.sel && !tv.done ? (tv.sent ? 'rgba(143,227,255,0.9)' : 'rgba(232,195,90,0.9)') : 'rgba(255,255,255,0.08)';
    if (tv.done && correct) bg = 'rgba(87,214,141,0.9)'; else if (tv.done && i === tv.choice) bg = 'rgba(214,80,80,0.9)';
    g.fillStyle = bg; roundRect(g, 200, y, 560, 40, 10); g.fill();
    g.fillStyle = i === tv.sel && !tv.done ? NIGHT : '#fff'; g.textAlign = 'left'; g.font = `17px ${FONT}`; g.fillText(String(i + 1), 218, y + 27);
    g.font = `17px ${BODY}`; g.fillText(opts[tv.order[i]], 250, y + 27);
    addRect(200, y, 560, 40, () => { if (tv.remoteView) Net.guestAnswer(i); else { tv.sel = i; answerTrivia(i); } });
  }
  if (!tv.done) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(200, 440, 560, 6); g.fillStyle = GOLD; g.fillRect(200, 440, 560 * clamp(tv.t / 15, 0, 1), 6); }
  else { g.textAlign = 'center'; g.fillStyle = tv.correct ? '#9dffb0' : '#ffb0b0'; g.font = `17px ${FONT}`; g.fillText(tv.correct ? 'Correct! Noor unlocked' : 'The answer: ' + opts[0], W / 2, 450); }
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('Press 1 to 4, or move and press Enter/K', W / 2, 462 + 0);
}
function drawPause(g) {
  dim(g, 0.65);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `40px ${FONT}`; g.fillText('Paused', W / 2, 190);
  drawMenu(g, [Net.role === 'guest' ? 'Keep playing' : 'Resume', Net.role ? 'Leave online game' : M.career ? 'Leave game (no result)' : 'Quit to title'], Game.idx, 260, i => i === 0 ? (Game.paused = false) : M.career ? careerHub() : goTitle());
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.textAlign = 'center'; g.fillText('Press F for fullscreen', W / 2, 360);
}
function render(g) {
  TouchUI.update();
  Game.rects = [];
  const zoom = tween('clutchzoom', Game.clutch && !Replay.active && !broadcastOn() ? 1.07 : 1, 2.5);   // the broadcast camera already frames clutch time
  // broadcast camera: zoom about the focus point; identity for gym/menus
  // render zoom moves in fine steps: big cached layers are resampled only when the scale really changes
  const bc = broadcastOn(), rp = Replay.active && bc, Z = Math.round((rp ? Math.min(cam.zoom, 1.12) : bc ? cam.zoom : 1) * zoom * 64) / 64, fy = rp ? clamp(cam.fy, H / (2 * Z), CAM_BOTTOM - H / (2 * Z)) : bc ? cam.fy : H / 2; cam.clutchZ = zoom;
  if (bc && Z < 1.02) { g.fillStyle = VL && VL.spec.kind === 'outdoor' ? SKY[VL.spec.time].top : VL && VL.spec.kind === 'gym' ? '#474d56' : '#0a0f1a'; g.fillRect(0, 0, W, H); }   // wide shots: fill beyond the venue art
  g.save(); g.translate(W / 2, H / 2); g.scale(Z, Z); g.translate(-W / 2, -fy);
  if (Replay.active && (Game.screen === 'play' || Game.screen === 'netplay')) {
    const R = Replay.active, f = R.frames[Math.min(R.frames.length - 1, Math.floor(R.t * 60 * 0.55))];
    const restore = Replay.apply(f); drawScene(g, Game.t); restore();
  } else { const ip = interpBegin(); drawScene(g, Game.t); interpEnd(ip); }
  g.restore();
  if (bc && (Game.screen === 'play' || Game.screen === 'netplay' || Game.screen === 'title')) screenVignette(g, VL && VL.spec.kind === 'arena' ? 0.35 : 0.22);
  const s = Game.screen;
  if (s === 'play' || s === 'halftime' || s === 'final' || s === 'netplay') drawHUD(g);
  // menu screens are laid out for 960 wide: center them on wider screens
  const bleed = s === 'play' || s === 'netplay' || s === 'gym' || s === 'masjid' || s === 'musalla' || s === 'office';
  const realW = W, ox = bleed ? 0 : Math.round((W - 960) / 2);
  const narrow = on => { if (on) { g.save(); g.translate(ox, 0); W = 960; Game.ox = ox; } else { W = realW; g.restore(); Game.ox = 0; } };
  if (!bleed) narrow(true);
  if (s === 'title') {
    // push the demo back: dim it, darken the top so the logo has clear space, and set the menu on a panel
    g.fillStyle = 'rgba(6,12,20,0.5)'; g.fillRect(-400, 0, W + 800, H);
    const top = g.createLinearGradient(0, 0, 0, 250); top.addColorStop(0, 'rgba(4,8,16,0.85)'); top.addColorStop(1, 'rgba(4,8,16,0)'); g.fillStyle = top; g.fillRect(-400, 0, W + 800, 250);
    const pw = 400, px = W / 2 - pw / 2, py = 232, ph = 280;
    const pg = g.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, 'rgba(8,16,28,0.88)'); pg.addColorStop(1, 'rgba(8,16,28,0.78)');
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.fillStyle = pg; roundRect(g, px, py, pw, ph, 18); g.fill(); g.restore();
    g.strokeStyle = 'rgba(232,195,90,0.25)'; g.lineWidth = 1; roundRect(g, px, py, pw, ph, 18); g.stroke();
    drawLogo(g, 150);
    drawMenuStack(g, 'title', TITLE_MENU(), 284, 42);
    g.textAlign = 'center'; g.fillStyle = 'rgba(246,236,210,0.7)'; g.font = `13px ${BODY}`;
    g.fillText('CPU demo in progress: ' + M.teamDefs[0].name + ' vs ' + M.teamDefs[1].name, W / 2, 522);
    g.textAlign = 'right'; g.fillStyle = 'rgba(246,236,210,0.55)'; g.font = `12px ${FONT}`; g.fillText('v' + VERSION, W - 14, 530);
  } else if (s === 'select') drawSelect(g);
  else if (s === 'venue') drawVenueSelect(g);
  else if (s === 'bests') drawBests(g);
  else if (s === 'achievements') drawAchievements(g);
  else if (s === 'about') drawAbout(g);
  else if (s === 'splash') { drawSplash(g); addRect(-400, 0, W + 800, H, () => { Game.screen = 'title'; }); }
  else if (s === 'settings') drawSettings(g);
  else if (s === 'howto') drawHowTo(g);
  else if (s === 'halftime') drawHalftime(g);
  else if (s === 'final') drawFinalScreen(g);
  else if (s === 'funmodes') drawFunModes(g);
  else if (CAREER_SCREENS.has(s)) careerRender(g);
  else if (s === 'online') drawOnline(g);
  else if (s === 'joincode') drawJoinCode(g);
  else if (s === 'hostlobby') drawHostLobby(g);
  else if (s === 'netwait') drawNetWait(g);
  else if (s === 'netplay') { if (!Game.paused) drawPauseButton(g); drawNetPlay(g); }
  else if (s === 'play') {
    if (!Game.paused && !Game.trivia && M.phase !== 'over') drawPauseButton(g);
    if (Game.paused) drawPause(g);
    if (M.mini) drawMiniResult(g);
    if (Game.trivia) { const o = Math.round((W - 960) / 2); g.save(); g.translate(o, 0); W = 960; Game.ox = o; drawTrivia(g); W = realW; Game.ox = 0; g.restore(); }
  }
  if (!bleed) narrow(false);
  if (Replay.active && (s === 'play' || s === 'netplay')) drawReplayOverlay(g);
  if (s === 'title' || s === 'settings' || (s === 'play' && Game.paused)) drawFsButton(g, s === 'play' ? W - 48 : W - 48, s === 'play' ? 50 : 8);
  drawBackButton(g);
  drawToast(g);
}

// ============================================================= MAIN LOOP
let canvas, ctx, dpr = 1, lastT = 0;
function resize() {
  W = clamp(Math.round(H * innerWidth / Math.max(1, innerHeight)), 960, 1200); layoutTouch();
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px'; canvas.style.height = Math.floor(H * s) + 'px';
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  dpr = clamp((window.devicePixelRatio || 1) * s, 1, coarse ? 2 : 2.5);   // phones: cap resolution for smooth frame rates
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
}
// Screen transitions: when the screen changes, the last frame is kept and
// slides away while fading out over 250ms on top of the new screen.
let transCv = null;
const TRANS_T = 0.25;
function frame(now) {
  const rdt = Math.min(0.05, lastT ? (now - lastT) / 1000 : STEP); lastT = now; Game.rdt = rdt;
  const before = Game.screen;
  gameUpdate(rdt);
  if (Game.screen !== before && canvas.width) {
    if (!transCv || transCv.width !== canvas.width || transCv.height !== canvas.height) transCv = makeCanvas(canvas.width, canvas.height);
    const tg = transCv.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, transCv.width, transCv.height); tg.drawImage(canvas, 0, 0);
    Game.trans = TRANS_T;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(ctx);
  if (Game.trans > 0) {
    const k = Game.trans / TRANS_T, e = k * k * (3 - 2 * k);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = e; ctx.drawImage(transCv, -(1 - e) * 36 * dpr, 0); ctx.globalAlpha = 1;
    Game.trans -= rdt;
  }
  canvas.style.cursor = Input.mouse.on && Game.rects.some(r => Input.mouse.x >= r.x && Input.mouse.x <= r.x + r.w && Input.mouse.y >= r.y && Input.mouse.y <= r.y + r.h) ? 'pointer' : 'default';
  Input.endFrame(Game.keepInput);
  requestAnimationFrame(frame);
}
function boot() {
  canvas = document.getElementById('game'); ctx = canvas.getContext('2d');
  Input.init(canvas); addEventListener('resize', resize); resize();
  Net.init();
  goTitle(); Game.screen = 'splash'; Game.splashT = 0;             // brief logo + studio credit, then the title
  requestAnimationFrame(frame);
}

