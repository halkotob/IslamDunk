// ======================================================= SCREENS / FLOW
const Game = { screen: 'title', idx: 0, t: 0, sel: null, trivia: null, paused: false, pidx: 0, rects: [], tour: null, overT: 0, usedQ: new Set(), keepInput: false };
let acc = 0;

function sim(rdt, humanInput) {
  acc += rdt * FX.scale; let n = 0;
  while (acc >= STEP && n < 5) {
    if (FX.stopF > 0) { FX.stopF--; acc -= STEP; n++; continue; }   // hit-stop: freeze 2-4 frames, inputs stay buffered
    snapPrev(); updateMatch(STEP); acc -= STEP; n++;
    if (humanInput) { Input.pressed = {}; Input.released = {}; }
  }
  if (n >= 5) acc = 0;
  if (humanInput && n === 0) Game.keepInput = true;   // no step consumed this frame's gameplay keys yet
  Game.alpha = clamp(acc / STEP, 0, 1); Game.interp = true;
  return n;
}
// Render interpolation: the sim runs at a fixed 60 Hz; each frame draws the
// state between the last two steps so motion stays smooth at any refresh rate.
function snapPrev() {
  for (const p of M.players) {
    p.ix = p.x; p.iy = p.y; p.iz = p.z; p.ihip = p.hipH; p.irot = p.rot; p.isq = p.sq || 0;
    for (const k of JOINTS) p.j[k].ia = p.j[k].a;
    if (p.cloth) { p.cloth.ix = p.cloth.x; p.cloth.iy = p.cloth.y; }
  }
  ball.ix = ball.x; ball.iy = ball.y; ball.iz = ball.z; ball.irot = ball.rot; cam.ix = cam.x; cam.iz = cam.zoom; cam.ify = cam.fy;
  for (const h of hoops) for (const q of h.pts) { q.ix = q.x; q.iy = q.y; q.iz = q.z; }
  for (const q of FX.parts) { q.ix = q.x; q.iy = q.y; q.iz = q.z; }
  if (M.balls) for (const st of M.balls) { st.ix = st.x; st.iy = st.y; st.iz = st.z; st.irot = st.rot; }
}
// Everything drawn from sim state is shown between the last two steps:
// positions, joint angles, hip height, cloth, net nodes and particles.
function interpBegin() {
  if (!Game.interp) return null;
  const a = Game.alpha, saved = [];
  const mix = o => { if (o.ix === undefined) return; saved.push([o, o.x, o.y, o.z]); o.x = lerp(o.ix, o.x, a); o.y = lerp(o.iy, o.y, a); o.z = lerp(o.iz, o.z, a); };
  const scal = (o, k, ik) => { if (o[ik] === undefined) return; saved.push([o, k, o[k]]); o[k] = lerp(o[ik], o[k], a); };
  for (const p of M.players) {
    mix(p); scal(p, 'hipH', 'ihip'); scal(p, 'rot', 'irot'); scal(p, 'sq', 'isq');
    for (const k of JOINTS) scal(p.j[k], 'a', 'ia');
    if (p.cloth) { scal(p.cloth, 'x', 'ix'); scal(p.cloth, 'y', 'iy'); }
  }
  mix(ball); scal(ball, 'rot', 'irot');
  if (M.balls) for (const st of M.balls) { mix(st); scal(st, 'rot', 'irot'); }
  for (const h of hoops) for (const q of h.pts) mix(q);
  for (const q of FX.parts) mix(q);
  const cx = cam.x, cz = cam.zoom, cfy = cam.fy;
  if (cam.ix !== undefined) { cam.x = lerp(cam.ix, cam.x, a); cam.zoom = lerp(cam.iz, cam.zoom, a); cam.fy = lerp(cam.ify, cam.fy, a); }
  return { saved, cx, cz, cfy };
}
function interpEnd(s) {
  if (!s) return;
  for (let i = s.saved.length - 1; i >= 0; i--) { const e = s.saved[i]; if (e.length === 4) { e[0].x = e[1]; e[0].y = e[2]; e[0].z = e[3]; } else e[0][e[1]] = e[2]; }
  cam.x = s.cx; cam.zoom = s.cz; cam.fy = s.cfy;
}
function goTitle() { Net.leave(); Game.screen = 'title'; Game.idx = 0; if (Game.hubMenu) Game.hubMenu.open = false; Game.paused = false; Game.trivia = null; startAttract(); }
function startAttract() { const a = rint(8); newMatch(TEAMS[a], TEAMS[(a + 1 + rint(7)) % 8], { attract: true }); }
function menuNav(n, onSelect) {
  if (menuHit('up')) { Game.idx = (Game.idx + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { Game.idx = (Game.idx + 1) % n; SFX.blip(); }
  if (menuHit('ok')) { SFX.blip(); onSelect(Game.idx); }
}
let TITLE_MENU = () => [                                  // let: v7.4 replaces the Online submenu
  { label: 'Career', act: () => { Game.screen = 'cmenu'; Game.idx = 0; Game.confirmNew = false; } },
  { label: 'Barakah Run', act: () => openBarakah() },
  { label: 'Quick Play', sub: [{ label: '1 player', act: () => startSelect('1p') }, { label: '2 players co-op', act: () => startSelect('2p') }, { label: 'Daily Scenario', act: () => openScenBrief() }, { label: 'Daily Hot Spot Challenge', act: startDaily }] },
  { label: 'Online', sub: [{ label: 'Host: same team vs CPU', act: () => onlineEntry(0) }, { label: 'Host: head to head', act: () => onlineEntry(1) }, { label: 'Host: 1 on 1 (no CPU)', act: () => onlineEntry(2) }, { label: 'Mini games: Lightning', act: () => onlineMini('lightning') }, { label: 'Mini games: HORSE', act: () => onlineMini('horse') }, { label: 'Join with a code', act: () => onlineEntry(3) }] },
  { label: 'Options', sub: [{ label: 'Settings', act: () => { Game.screen = 'settings'; Game.idx = 0; } }, { label: 'Fun Modes', act: () => { Game.screen = 'funmodes'; Game.idx = 0; } }, { label: 'Achievements', act: () => { Game.screen = 'achievements'; Game.achPage = 0; } }, { label: 'Personal bests', act: () => { Game.screen = 'bests'; } }, { label: 'How to play', act: () => { Game.screen = 'howto'; } }, { label: 'About', act: () => { Game.screen = 'about'; } }] }
];
function startSelect(mode) { const a = rint(8); Game.sel = { mode, step: 0, a, b: (a + 1) % 8, ctrl: 0 }; Game.screen = 'select'; }
function onlineMini(kind) { if (Net.avail !== 'yes') { Game.screen = 'online'; Game.idx = 0; return; } Net.host(kind, { a: 0, b: 1 }); }
function onlineEntry(i) { if (Net.avail !== 'yes') { Game.screen = 'online'; Game.idx = 0; return; } onlineSelect(i); }
function attractTick(rdt) {
  sim(rdt, false);
  if (M.phase === 'over') { M.breakT -= rdt; if (M.breakT <= 0) startAttract(); }
}
function gameUpdate(rdt) {
  Game.t += rdt; FX.updateReal(rdt); Game.keepInput = false; Game.interp = false;
  if (Game.toastT > 0) Game.toastT -= rdt;
  clutchTick(rdt);
  if (Input.pressed.KeyF && !['namekeys', 'joincode'].includes(Game.screen)) toggleFullscreen();
  Net.update(rdt);
  const tap = Input.taps[0];
  if (tap) for (const r of Game.rects.slice().reverse()) if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) { SFX.blip(); r.fn(); break; }
  switch (Game.screen) {
    case 'title': menuStackUpdate('title', TITLE_MENU()); attractTick(rdt); break;
    case 'select': selectUpdate(); if (Game.screen === 'select') attractTick(rdt); break;
    case 'venue': venueUpdate(); if (Game.screen === 'venue') attractTick(rdt); break;
    case 'bests': if (menuHit('ok') || menuHit('back')) Game.screen = 'title'; attractTick(rdt); break;
    case 'achievements': { const n = Math.ceil(ACHIEVEMENTS.length / 16); if (menuHit('right') || menuHit('down')) Game.achPage = ((Game.achPage || 0) + 1) % n; else if (menuHit('left') || menuHit('up')) Game.achPage = ((Game.achPage || 0) + n - 1) % n; else if (menuHit('ok') || menuHit('back')) Game.screen = 'title'; attractTick(rdt); break; }
    case 'about': if (menuHit('ok') || menuHit('back')) Game.screen = 'title'; attractTick(rdt); break;
    case 'splash': Game.splashT = (Game.splashT || 0) + rdt; attractTick(rdt); if (Game.splashT > 1.7 || menuHit('ok') || menuHit('back') || Game.rects.tapped) Game.screen = 'title'; break;
    case 'settings': settingsUpdate(); attractTick(rdt); break;
    case 'howto': if (menuHit('ok') || menuHit('back')) goTitle(); else attractTick(rdt); break;
    case 'play': playUpdate(rdt); break;
    case 'halftime': if (menuHit('ok')) resumeFromHalf(); break;
    case 'final': finalUpdate(); if (Game.screen === 'final') sim(rdt, false); break;
    case 'funmodes': funUpdate(); attractTick(rdt); break;
    default: if (CAREER_SCREENS.has(Game.screen)) careerUpdate(rdt); break;
    case 'online': case 'joincode': case 'hostlobby': case 'netwait': case 'netplay': case 'lobby': onlineUpdate(rdt); break;
  }
}
function resumeFromHalf() { if (Net.role === 'guest') return; Game.screen = 'play'; startQuarter(); }
function playUpdate(rdt) {
  if (Game.trivia) { triviaUpdate(rdt); return; }
  if (M.introT > 0) { introTick(rdt); return; }       // venue intro sweep before tip-off
  if (M.mini && M.mini.kind === 'daily' && M.mini.done && (M.mini.doneT || 0) > 1) { if (Input.pressed.KeyR) startDaily(); else if (menuHit('ok') || menuHit('back')) goTitle(); sim(rdt, true); return; }
  if (M.mini && M.mini.done && (M.mini.doneT || 0) > 1.2) { if (menuHit('ok')) miniResultContinue(); sim(rdt, true); return; }
  if (Replay.active || Replay.at > 0) {                // instant replay pauses play (slow-mo runs during the lead-in)
    Replay.tick(rdt);
    if (Replay.active) { if (menuHit('ok') || menuHit('back')) Replay.active = null; return; }
  }
  if (Game.paused) { pauseNav(); return; }        // v6: resume / call timeout / leave
  if (menuHit('back') || Input.pressed.KeyP) { Game.paused = true; Game.idx = 0; return; }
  if (M.phase === 'over') { Game.overT -= rdt; if (Game.overT <= 0) { Game.screen = 'final'; return; } }
  const n = sim(rdt, true);
}
// ---------------------------------------------------------- TEAM SELECT
function selectUpdate() {
  const s = Game.sel;
  const change = d => {
    SFX.blip();
    if (s.step === 0) s.a = (s.a + d + 8) % 8;
    else if (s.step === 1) { do { s.b = (s.b + d + 8) % 8; } while (s.b === s.a); }
    else s.ctrl ^= 1;
  };
  Game.selChange = change;
  if (menuHit('left')) change(-1);
  if (menuHit('right')) change(1);
  if (Input.pressed.KeyJ) codeKey('J');
  if (Input.pressed.KeyL) codeKey('L');
  if (menuHit('ok')) selectOK();
  if (menuHit('back')) selectBack();
}
function selectOK() {
  const s = Game.sel; SFX.blip();
  if (s.step === 0) { if (s.b === s.a) s.b = (s.a + 1) % 8; s.step = 1; }
  else if (s.step === 1) { if (s.mode === 'oco' || s.mode === 'ovs') openVenueSelect(v => { s.venue = v; Net.host(s.mode === 'oco' ? 'co' : 'vs', s); }); else if (s.mode === '2p') openVenueSelect(startMatchFromSelect); else s.step = 2; }
  else openVenueSelect(startMatchFromSelect);
}
function selectBack() {
  const s = Game.sel;
  if (s.step === 0) goTitle();
  else s.step--;
}
function startMatchFromSelect(venue) {
  const s = Game.sel;
  const humans = s.mode === '2p' ? [{ team: 0, slot: 0, pad: 0 }, { team: 0, slot: 1, pad: 1 }] : [{ team: 0, slot: s.ctrl, pad: 0 }];
  Game.lastMatch = { tA: TEAMS[s.a], tB: TEAMS[s.b], humans, venue };
  newMatch(TEAMS[s.a], TEAMS[s.b], { humans, venue });
  Game.screen = 'play'; Game.paused = false; startVenueIntro(venue);
}
// ------------------------------------------------------------- SETTINGS
const SET_ITEMS = [
  { label: 'Difficulty', get: () => SETTINGS.difficulty[0].toUpperCase() + SETTINGS.difficulty.slice(1), step: d => { const o = ['easy', 'medium', 'hard']; SETTINGS.difficulty = o[(o.indexOf(SETTINGS.difficulty) + d + 3) % 3]; } },
  { label: 'Keep games close (rubber-band)', get: () => SETTINGS.rubber ? 'On' : 'Off', step: () => { SETTINGS.rubber = !SETTINGS.rubber; } },
  { label: 'Format', get: () => FORMAT_TXT[SETTINGS.format], step: d => { SETTINGS.format = FORMATS[(FORMATS.indexOf(SETTINGS.format) + d + FORMATS.length) % FORMATS.length]; } },
  { label: 'Period length', get: () => SETTINGS.format === 'first21' ? 'Untimed, win by 2' : periodTxt(SETTINGS.periodLen), step: d => { if (SETTINGS.format !== 'first21') SETTINGS.periodLen = PERIOD_OPTS[(PERIOD_OPTS.indexOf(SETTINGS.periodLen) + d + PERIOD_OPTS.length) % PERIOD_OPTS.length]; } },
  { label: 'Sound', get: () => SETTINGS.sound ? 'On' : 'Off', step: () => { SETTINGS.sound = !SETTINGS.sound; SFX.setOn(SETTINGS.sound); } },
  { label: 'Fullscreen (F)', get: () => isFullscreen() ? 'On' : 'Off', step: () => toggleFullscreen() },
  { label: 'Camera (C in game)', get: () => CAM_PRESETS[View.camera].name, step: d => cycleCamera(d, false) },
  { label: 'Depth aids', get: () => ['Off', 'Subtle', 'Full'][View.depth], step: d => { View.depth = (View.depth + d + 3) % 3; View.save(); } },
  { label: 'Ball magnet', get: () => ['Off', 'Light', 'Strong'][View.magnet], step: d => { View.magnet = (View.magnet + d + 3) % 3; View.save(); } },
  { label: 'Resolution', get: () => resLabel(), step: () => resToggle() },
  { label: 'Back', get: () => '', step: () => {} }
];
function settingsUpdate() {
  menuNav(SET_ITEMS.length, i => { if (i === SET_ITEMS.length - 1) goTitle(); else SET_ITEMS[i].step(1); });
  if (menuHit('left')) { SET_ITEMS[Game.idx].step(-1); SFX.blip(); }
  if (menuHit('right')) { SET_ITEMS[Game.idx].step(1); SFX.blip(); }
  if (menuHit('back')) goTitle();
}
// ----------------------------------------------------------- TOURNAMENT
function pairs(list) { const r = []; for (let i = 0; i < list.length; i += 2) r.push({ a: list[i], b: list[i + 1], sa: null, sb: null, w: null }); return r; }
function finalContinue() { if (M.career) { careerAfterMatch(); return; } if (Net.role === 'guest') return; if (Net.role === 'host') { Game.screen = 'hostlobby'; return; } else goTitle(); }
// --------------------------------------------------------------- TRIVIA
function openTrivia(p) {
  let pool = TRIVIA.map((_, i) => i).filter(i => !Game.usedQ.has(i));
  if (!pool.length) { Game.usedQ.clear(); pool = TRIVIA.map((_, i) => i); }
  const qi = pick(pool); Game.usedQ.add(qi);
  Game.trivia = { p, qi, order: shuffle([0, 1, 2, 3]), sel: 0, t: 15, done: false, correct: false, res: 0, choice: -1, remote: Net.role === 'host' && p.human === 1 };
  SFX.blip();
}
function answerTrivia(i) {
  const tv = Game.trivia; if (!tv || tv.done) return;
  tv.done = true; tv.choice = i; tv.correct = i >= 0 && tv.order[i] === 0;
  tv.correct ? SFX.good() : SFX.bad();
}
function triviaUpdate(rdt) {
  const tv = Game.trivia;
  if (!tv.done && tv.remote) {           // the guest answers on their screen
    tv.t -= rdt;
    const a = Net.remoteAnswer();
    if (a && a.qi === tv.qi) answerTrivia(clamp(a.i | 0, 0, 3));
    else if (tv.t <= 0) answerTrivia(-1);
  } else if (!tv.done) {
    tv.t -= rdt;
    if (menuHit('up')) { tv.sel = (tv.sel + 3) % 4; SFX.blip(); }
    if (menuHit('down')) { tv.sel = (tv.sel + 1) % 4; SFX.blip(); }
    for (let i = 0; i < 4; i++) if (Input.pressed['Digit' + (i + 1)]) answerTrivia(i);
    if (menuHit('ok') || Input.pressed.KeyJ) answerTrivia(tv.sel);
    if (tv.t <= 0) answerTrivia(-1);
  } else {
    tv.res += rdt;
    if (tv.res > 1.8 || (tv.res > 0.5 && menuHit('ok'))) {
      Game.trivia = null;
      if (tv.correct) grantBoost(tv.p); else FX.callout('KEEP REVIEWING!', '#bcd8ff', 'NO BOOST THIS TIME');
    }
  }
}

// ============================================================ SCREEN DRAW
function addRect(x, y, w, h, fn) { Game.rects.push({ x: x + (Game.ox || 0), y, w, h, fn }); }
function dim(g, a = 0.6) { g.fillStyle = `rgba(6,12,20,${a})`; g.fillRect(-400, 0, W + 800, H); if (a >= 0.5) drawPatternBg(g, 0.05); }
function drawLogo(g, y) { drawLogoMark(g, W / 2, y - 142, 0.95, { tagline: true }); }   // wordmark baseline near y
