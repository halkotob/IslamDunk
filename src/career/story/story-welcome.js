// ================================================= v9.30: CAREER REFINE 1 — welcome, creator, archetypes, your name
// (docs/career-overhaul/REFINE-PLAN.md, release 1)
// - New career opens a short welcome: what the career is, what the next screen does, and your name (typed on a
//   computer, the on-screen keys on a phone). A name is required; "Brother" is never used for you.
// - The creator has two sections: Look (cosmetic only) and Game (height, build and play style, which change stats).
// - The five play styles (archetypes) each have their own strengths (no two share a plus) and one small perk, in
//   career games and for your player only.

// ---------------------------------------------------------------- the welcome screen
const WELCOME_MAX = 14;
function openWelcome() { Game.welcome = { name: (C && C.name && C.name !== 'Brother' ? C.name : '') || '', t: 0 }; Game.screen = 'swelcome'; Game.idx = 0; SFX.blip && SFX.blip(); }
function welcomeType(ch) {
  const w = Game.welcome; if (!w || w.name.length >= WELCOME_MAX) return;
  const start = !w.name.length || /[ \-']$/.test(w.name);
  w.name += start ? ch.toUpperCase() : ch.toLowerCase(); SFX.blip && SFX.blip();
}
function welcomeNext() {
  const w = Game.welcome; if (!w) return;
  const n = w.name.trim(); if (!n) { SFX.bad && SFX.bad(); w.shake = 0.4; return; }
  C.name = n; Game.welcome = null;
  Game.creator = { idx: creatorFirstRow('look'), isNew: true, tab: 'look', welcomed: true }; Game.screen = 'creator'; SFX.good && SFX.good();
}
function welcomeUpdate(rdt) {
  const w = Game.welcome; if (!w) return;
  w.t += rdt; if (w.shake > 0) w.shake -= rdt;
  for (let c = 65; c <= 90; c++) if (Input.pressed['Key' + String.fromCharCode(c)]) welcomeType(String.fromCharCode(c));
  if ((Input.pressed.Space) && w.name.length && !/ $/.test(w.name) && w.name.length < WELCOME_MAX) w.name += ' ';
  if (Input.pressed.Minus && w.name.length && w.name.length < WELCOME_MAX) w.name += '-';
  if (Input.pressed.Quote && w.name.length && w.name.length < WELCOME_MAX) w.name += '\'';
  if (Input.pressed.Backspace) w.name = w.name.slice(0, -1);
  if (Input.pressed.Enter || Input.pressed.NumpadEnter) welcomeNext();
  else if (Input.pressed.Escape) { Game.welcome = null; Game.screen = 'cmenu'; Game.idx = 0; }
}
function drawWelcome(g) {
  const w = Game.welcome; if (!w) return;
  const TT = Input.touchMode && g === ctx, x0 = W / 2 - 340, y0 = 56, pw = 680, ph = 430;
  g.fillStyle = 'rgba(4,8,14,0.82)'; g.fillRect(-400, -400, W + 800, H + 800);
  panel(g, x0, y0, pw, ph, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Welcome to your career', W / 2, y0 + 50);
  g.fillStyle = IVORY; g.font = `15px ${BODY}`;
  wrapText(g, 'Your first week in Eastside. Down the road is Masjid Al-Amanah: a small masjid with a gym, a weekend school, and a team that has never won the league.', W / 2, y0 + 86, pw - 80, 22);
  g.fillStyle = '#cfd8e3'; g.font = `14px ${BODY}`;
  wrapText(g, 'Next, you make your player: first how he looks, then how he plays. You can change his look any time from the gym.', W / 2, y0 + 156, pw - 80, 20);
  // the name
  g.fillStyle = GOLD; g.font = `14px ${FONT}`; g.fillText('YOUR NAME', W / 2, y0 + 218);
  const bx = W / 2 - 180 + (w.shake > 0 ? Math.sin(w.t * 60) * 6 : 0), by = y0 + 230, bw = 360, bh = 54;
  g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, bx, by, bw, bh, 12); g.fill();
  g.strokeStyle = w.name ? GOLD : 'rgba(255,255,255,0.35)'; g.lineWidth = 2; roundRect(g, bx, by, bw, bh, 12); g.stroke();
  g.fillStyle = w.name ? '#fff' : '#7d8a99'; g.font = `26px ${FONT}`;
  g.fillText((w.name || (TT ? 'Tap to type' : '')) + (!TT && w.t % 1 < 0.5 ? '|' : ''), W / 2, by + 36);
  addRect(bx, by, bw, bh, () => { if (Input.touchMode) csAskName('Your name', w.name, WELCOME_MAX, v => { if (Game.welcome) Game.welcome.name = v.slice(0, WELCOME_MAX); }); });
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(TT ? 'Tap the box to type your name' : 'Type your name, then press Enter', W / 2, by + bh + 22);
  // next
  const ok = !!w.name.trim(), nx = W / 2 - 150, ny = y0 + ph - 78;
  g.fillStyle = ok ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, nx, ny, 300, 50, 25); g.fill();
  g.fillStyle = ok ? NIGHT : '#7d8a99'; g.font = `20px ${FONT}`; g.fillText('Make your player  ›', W / 2, ny + 33);
  addRect(nx, ny, 300, 50, welcomeNext);
}
{
  CAREER_SCREENS.add('swelcome');
  BACK.swelcome = () => { Game.welcome = null; Game.screen = 'cmenu'; Game.idx = 0; };
  // every way into a new career (the career menu, Save and load) lands on the creator: the welcome comes first
  const route = () => { if (Game.screen === 'creator' && Game.creator && Game.creator.isNew && !Game.creator.welcomed && storyOn()) openWelcome(); };
  const _cu = careerUpdate;
  careerUpdate = function (rdt) { route(); if (Game.screen === 'swelcome') return welcomeUpdate(rdt); return _cu.apply(this, arguments); };
  const _cr = careerRender;
  careerRender = function (g) { route(); if (Game.screen === 'swelcome') return drawWelcome(g); return _cr.apply(this, arguments); };
  // the name is never "Brother": the welcome makes it required
  const _cd = creatorDone;
  creatorDone = function () { if (C && !C.name.trim()) { openWelcome(); return; } return _cd.apply(this, arguments); };
}
// "{name}" in a line is your name
function storyNameText(t) { return typeof t === 'string' && C && C.name ? t.replace(/\{name\}/g, C.name) : t; }
{
  const _lo = storyLinesOf;
  storyLinesOf = function () { return _lo.apply(this, arguments).map(l => Array.isArray(l) && typeof l[1] === 'string' ? [l[0], storyNameText(l[1])].concat(l.slice(2)) : l); };
  const _sw = swSay;
  swSay = function (lines, done) { return _sw.call(this, (lines || []).map(l => Array.isArray(l) && typeof l[1] === 'string' ? [l[0], storyNameText(l[1])] : l), done); };
  const _ps = playStory;
  playStory = function (lines) { const a = Array.from(arguments); a[0] = (lines || []).map(l => Array.isArray(l) && typeof l[1] === 'string' ? [l[0], storyNameText(l[1])].concat(l.slice(2)) : l); return _ps.apply(this, a); };
}

// ---------------------------------------------------------------- the creator: Look and Game
const CR_GAME_KEYS = ['height', 'build', 'style'];
const CR_HIDE = ['name'];                                               // (the name is on the welcome screen now)
function creatorRowsOf(tab) { return CREATOR_ROWS.map((r, i) => ({ r, i })).filter(({ r }) => r.key !== 'done' && !CR_HIDE.includes(r.key) && (tab === 'game') === CR_GAME_KEYS.includes(r.key)); }
function creatorFirstRow(tab) { const L = creatorRowsOf(tab); return L.length ? L[0].i : 0; }
function creatorTab() { const cr = Game.creator; if (!cr.tab) cr.tab = CR_GAME_KEYS.includes((CREATOR_ROWS[cr.idx] || {}).key) ? 'game' : 'look'; return cr.tab; }
function creatorSetTab(tab) { const cr = Game.creator; if (cr.tab === tab) return; cr.tab = tab; cr.idx = creatorFirstRow(tab); cr.onTabs = false; SFX.blip && SFX.blip(); }
// the archetypes as the creator shows them
const ARCH_INFO = {
  classic: { name: 'Classic', col: '#9fb3c8', icon: 'dot', perk: 'No perk. No strengths or weaknesses from your play style.' },
  sharpshooter: { name: 'Sharpshooter', col: '#57b8ff', icon: 'target', perk: 'Perk: a wider green window on your jump shots.' },
  playmaker: { name: 'Playmaker', col: '#f2cf6b', icon: 'arrow', perk: 'Perk: your passes travel faster.' },
  rimrunner: { name: 'Rim Runner', col: '#ff8a4a', icon: 'up', perk: 'Perk: you can dunk from a step further out.' },
  lockdown: { name: 'Lockdown', col: '#57e389', icon: 'shield', perk: 'Perk: a longer reach for steals and blocks.' },
  glue: { name: 'Glue Guy', col: '#c58cff', icon: 'knot', perk: 'Perk: you win more loose balls and rebounds.' }
};
function drawArchIcon(g, kind, x, y, r, col) {
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1; g.stroke();
  const s = r * 0.55; g.beginPath();
  if (kind === 'target') { g.arc(x, y, s, 0, Math.PI * 2); g.moveTo(x + s * 0.35, y); g.arc(x, y, s * 0.35, 0, Math.PI * 2); g.stroke(); }
  else if (kind === 'arrow') { g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x + s * 0.3, y - s * 0.6); g.lineTo(x + s, y); g.lineTo(x + s * 0.3, y + s * 0.6); g.stroke(); }
  else if (kind === 'up') { g.moveTo(x, y + s); g.lineTo(x, y - s); g.moveTo(x - s * 0.7, y - s * 0.2); g.lineTo(x, y - s); g.lineTo(x + s * 0.7, y - s * 0.2); g.stroke(); }
  else if (kind === 'shield') { g.moveTo(x, y - s); g.lineTo(x + s, y - s * 0.6); g.lineTo(x + s * 0.8, y + s * 0.4); g.lineTo(x, y + s); g.lineTo(x - s * 0.8, y + s * 0.4); g.lineTo(x - s, y - s * 0.6); g.closePath(); g.stroke(); }
  else if (kind === 'knot') { g.arc(x - s * 0.4, y, s * 0.5, 0, Math.PI * 2); g.moveTo(x + s * 0.9, y); g.arc(x + s * 0.4, y, s * 0.5, 0, Math.PI * 2); g.stroke(); }
  else { g.arc(x, y, s * 0.3, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function styleSummary(st) {
  const m = STYLE_MOD[st] || {};
  const up = BUILD_ROWS.filter(([k]) => m[k] > 0).map(([k, n]) => n + ' +' + m[k]), dn = BUILD_ROWS.filter(([k]) => m[k] < 0).map(([k, n]) => n + ' −' + -m[k]);
  return up.length ? 'Strong: ' + up.join(', ') + '.   Weaker: ' + dn.join(', ') + '.' : 'Even across the board.';
}
{
  const _cu = creatorUpdate;
  creatorUpdate = function () {
    const cr = Game.creator; if (!cr || !storyOn()) return _cu.apply(this, arguments);
    const tab = creatorTab(), L = creatorRowsOf(tab), di = CREATOR_ROWS.findIndex(r => r.key === 'done');
    if (Input.pressed.KeyQ || Input.pressed.BracketLeft) return creatorSetTab('look');
    if (Input.pressed.KeyE || Input.pressed.BracketRight) return creatorSetTab('game');
    if (Input.pressed.Tab) { cr.idx = di; cr.onTabs = false; SFX.blip && SFX.blip(); return; }
    const seq = [-1, ...L.map(x => x.i), di], at = cr.onTabs ? 0 : Math.max(0, seq.indexOf(cr.idx));
    if (Input.hit(['ArrowUp', 'KeyW'])) { const j = (at + seq.length - 1) % seq.length; cr.onTabs = seq[j] === -1; if (!cr.onTabs) cr.idx = seq[j]; SFX.blip && SFX.blip(); return; }
    if (Input.hit(['ArrowDown', 'KeyS'])) { const j = (at + 1) % seq.length; cr.onTabs = seq[j] === -1; if (!cr.onTabs) cr.idx = seq[j]; SFX.blip && SFX.blip(); return; }
    if (cr.onTabs) {
      if (menuHit('left') || menuHit('right') || menuHit('ok')) creatorSetTab(tab === 'look' ? 'game' : 'look');
      else if (menuHit('back')) { if (!cr.isNew) careerHub(); else if (cr.welcomed) openWelcome(); }   // (v9.35: a new career steps back to the name)
      return;
    }
    if (menuHit('left')) creatorStep(cr.idx, -1);
    if (menuHit('right')) creatorStep(cr.idx, 1);
    if (menuHit('ok')) creatorEnter(cr.idx);
    if (menuHit('back')) { if (!cr.isNew) careerHub(); else if (cr.welcomed) openWelcome(); }
  };
  const _dc = drawCreator;
  drawCreator = function (g) {
    const cr = Game.creator; if (!cr || !storyOn()) return _dc.apply(this, arguments);
    const lk = C.look, tab = creatorTab(), L = creatorRowsOf(tab), TT = Input.touchMode && g === ctx;
    panel(g, 30, 46, 470, 488, true);
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `22px ${FONT}`; g.fillText(fitText(g, (cr.isNew ? 'Make your player' : 'Your player') + (C.name ? ':  ' + C.name : ''), 600), 104, 32);
    if (!TT) { g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Q / E switch section   ↑ ↓ choose   ← → change', 930, 32); }
    // the two sections
    [['look', 'Look', 'Cosmetic only'], ['game', 'Game', 'Changes your stats']].forEach(([k, label, sub], j) => {
      const x = 44 + j * 224, on = tab === k, foc = cr.onTabs && on;
      g.fillStyle = on ? (foc ? '#ffe08a' : GOLD) : 'rgba(255,255,255,0.08)'; roundRect(g, x, 56, 214, 48, 12); g.fill();
      if (foc) { g.strokeStyle = '#fff'; g.lineWidth = 2; roundRect(g, x, 56, 214, 48, 12); g.stroke(); }
      g.textAlign = 'center'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `17px ${FONT}`; g.fillText(label, x + 107, 78);
      g.fillStyle = on ? 'rgba(10,20,30,0.75)' : '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(sub, x + 107, 96);
      addRect(x, 56, 214, 48, () => creatorSetTab(k));
    });
    const gap = Math.min(tab === 'game' ? 64 : 38, 412 / Math.max(1, L.length));
    L.forEach(({ r, i }, n) => {
      const y = 116 + n * gap, sel = i === cr.idx && !cr.onTabs, cy = y + gap / 2 + 5;
      if (sel) { g.fillStyle = 'rgba(232,195,90,0.18)'; roundRect(g, 40, y + 1, 450, gap - 2, 8); g.fill(); }
      g.fillStyle = sel ? '#fff' : IVORY; g.font = `${tab === 'game' ? 16 : 14}px ${tab === 'game' ? FONT : BODY}`; g.textAlign = 'left'; g.fillText(r.label, 54, cy);
      addRect(40, y, 250, gap, () => { cr.idx = i; cr.onTabs = false; creatorEnter(i); });
      const vx = 330;
      g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText('◂', vx, cy + 1); g.fillText('▸', vx + 120, cy + 1);
      addRect(vx - 20, y, 40, gap, () => { cr.idx = i; cr.onTabs = false; creatorStep(i, -1); }); addRect(vx + 100, y, 40, gap, () => { cr.idx = i; cr.onTabs = false; creatorStep(i, 1); });
      if (r.sw) { g.fillStyle = r.sw[lk[r.key]]; roundRect(g, vx + 30, cy - 14, 60, 18, 9); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.stroke(); }
      else { g.fillStyle = '#fff'; g.font = `13px ${BODY}`; g.fillText(fitText(g, r.txt ? r.txt[lk[r.key]] : String(lk[r.key]), 96), vx + 60, cy); }
    });
    const T = amanahTeam(), d = playerDef();
    if (tab === 'look') {                                                 // the preview, big: cosmetic only
      panel(g, 530, 46, 400, 420, false);
      drawPortrait(g, 640, 360, d, T, 2.1, 'thobe'); drawPortrait(g, 830, 360, d, T, 2.1, null);
      g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('At the masjid', 640, 384); g.fillText('Game day', 830, 384);
      g.fillStyle = IVORY; g.font = `13px ${BODY}`; wrapText(g, 'Nothing here changes your stats. Your height, build and play style are in Game.', 730, 420, 360, 18);
    } else {                                                              // the archetype card and the stats
      const st = PLAY_STYLES[lk.style || 0], A = ARCH_INFO[st] || ARCH_INFO.classic;
      panel(g, 530, 46, 400, 150, false);
      drawArchIcon(g, A.icon, 576, 96, 26, A.col);
      g.textAlign = 'left'; g.fillStyle = A.col; g.font = `20px ${FONT}`; g.fillText(A.name, 614, 90);
      g.fillStyle = '#cfd8e3'; g.font = `12px ${BODY}`; wrapTextLeft(g, styleSummary(st), 614, 110, 300, 16);
      g.fillStyle = '#fff'; g.font = `13px ${BODY}`; wrapTextLeft(g, A.perk, 552, 160, 360, 17);
      const m = myMods(), base = Object.assign({}, C.lv, { stl: Math.round((C.lv.def + C.lv.spd) / 2), hus: C.lv.hus || 4, clu: C.lv.clu || 4 });
      panel(g, 530, 204, 400, 262, false);
      g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(cr.isNew ? 'STARTING STATS' : 'YOUR STATS', 548, 228);
      g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText(fitText(g, LOOK_TXT.height[lk.height] + ', ' + LOOK_TXT.build[lk.build].toLowerCase() + ', ' + A.name.toLowerCase(), 230), 680, 228);
      BUILD_ROWS.forEach(([k, label], i) => {
        const y = 242 + i * (TT ? 24 : 22);
        g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `12px ${BODY}`; g.fillText(label, 552, y + 9);
        buildPips(g, 650, y, base[k], m[k] || 0); modTag(g, 748, y + 9, m[k] || 0);
      });
    }
    // the big button
    const di = CREATOR_ROWS.findIndex(r => r.key === 'done'), sel = cr.idx === di && !cr.onTabs, pulse = 0.5 + 0.5 * Math.sin(Game.t * 4);
    const bx = 530, by = 474, bw = 400, bh = 56;
    g.save(); g.shadowColor = 'rgba(242,207,107,' + (0.35 + 0.4 * (sel ? 1 : pulse)) + ')'; g.shadowBlur = sel ? 26 : 12 + 10 * pulse;
    const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#d9a83a');
    g.fillStyle = gr; roundRect(g, bx, by, bw, bh, 28); g.fill(); g.restore();
    g.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.55)'; g.lineWidth = sel ? 3 : 1.5; roundRect(g, bx, by, bw, bh, 28); g.stroke();
    g.textAlign = 'center'; g.fillStyle = NIGHT; g.font = `24px ${FONT}`;
    g.fillText(cr.isNew ? (tab === 'look' ? 'Next: how he plays  ›' : 'Start career  ›') : 'Done  ›', bx + bw / 2, by + 37);
    addRect(bx, by, bw, bh, () => { if (cr.isNew && tab === 'look') return creatorSetTab('game'); cr.idx = di; creatorDone(); });
  };
  // Enter on the button in Look moves on to Game first
  const _ce = creatorEnter;
  creatorEnter = function (i) {
    const cr = Game.creator, r = CREATOR_ROWS[i];
    if (cr && storyOn() && r && r.key === 'done' && cr.isNew && creatorTab() === 'look') return creatorSetTab('game');
    return _ce.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- distinct archetypes and their perks
// No two play styles share a strength now (playmaker and rim runner both had speed; lockdown and glue both defense).
Object.assign(STYLE_MOD, {
  sharpshooter: { sht: 2, clu: 1, dnk: -2, def: -1 },
  playmaker: { pas: 2, spd: 1, dnk: -1, sht: -1, def: -1 },
  rimrunner: { dnk: 2, sta: 1, sht: -2, clu: -1 },
  lockdown: { def: 2, stl: 1, sht: -2, pas: -1 },
  glue: { hus: 2, sht: -1, dnk: -1 }
});
const PERK = { greenK: 1.15, passPas: 3, dunkBoost: true, stealReach: 66, glueHus: 2 };
function perkOf(p) { return p && p.perk || null; }
{
  // your player's perk, set for career games only (the gym's practice and every other mode have none)
  const _nm = newMatch;
  newMatch = function () {
    const r = _nm.apply(this, arguments);
    if (M && M.career && C && C.look) {
      const me = M.players.find(p => p.human === 0), a = lookArch(C.look);
      if (me && a) { me.perk = a; if (a === 'glue' && me.st) me.st.hus = clamp((me.st.hus != null ? me.st.hus : hustleOf(me.st)) + PERK.glueHus, 1, 10); }
    }
    return r;
  };
  const _sw = shotWindow;
  shotWindow = function (p) { const w = _sw.apply(this, arguments); return perkOf(p) === 'sharpshooter' && w > 0 ? w * PERK.greenK : w; };
  const _dp = doPass;
  doPass = function (p) {
    if (perkOf(p) !== 'playmaker' || !p.st) return _dp.apply(this, arguments);
    const was = p.st.pas; p.st.pas = (was != null ? was : 5) + PERK.passPas;
    try { return _dp.apply(this, arguments); } finally { p.st.pas = was; }
  };
  const _cd = canDunk;
  canDunk = function (p) {
    if (perkOf(p) !== 'rimrunner') return _cd.apply(this, arguments);
    const was = p.boost; if (!(was > 0)) p.boost = 1e-6;                // the boost's +20 reach, for the rim runner
    try { return _cd.apply(this, arguments); } finally { p.boost = was; }
  };
  const _ts = trySteal;
  trySteal = function (p) {
    const h = ball.owner;
    if (perkOf(p) !== 'lockdown' || !h || h.team === p.team) return _ts.apply(this, arguments);
    const d = dxz(p, h);
    if (d < 54 || d >= PERK.stealReach) return _ts.apply(this, arguments);
    const ox = p.x, oz = p.z, k = (d - 53) / d;                          // the longer reach: as if a step closer, for the attempt only
    p.x += (h.x - p.x) * k; p.z += (h.z - p.z) * k;
    try { return _ts.apply(this, arguments); } finally { p.x = ox; p.z = oz; }
  };
}
