
// ================================================= v7.8: IN-WORLD CAREER INTRO
// The new-career intro happens in the world instead of over a static lineup:
//   1. Outside Masjid Al-Amanah: walk up the street, Sh. Saleem greets you by the path (two short
//      lines), then follow him up the path to the door.
//   2. The gym, first time: you're on the real gym floor (walk, dribble, shoot). The brothers are
//      around the room; walk up to each one to say salaam. They talk in speech bubbles above their
//      heads, one or two lines each.
//   3. When you've met everyone, Saleem wraps up and you land in the career hub.
// Esc skips the intro at any point. Lines are short on purpose.
const INTRO_OUT = [
  ['saleem', 'Assalamu alaikum! You must be the brother who just moved to Eastside.'],
  ['you', 'Wa alaikum assalam. I heard you have a team?'],
  ['saleem', 'We do. Come in, the brothers are in the gym.']
];
const INTRO_CAST = {   // gym spots (world x, z), what they say when you walk up
  khalil: { x: 1150, z: 420, lines: [['khalil', 'Welcome! Gym, overflow musalla, potluck hall. Mind the folding chairs.']] },
  nasser: { x: 1010, z: 590, lines: [['nasser', 'Shooting tip: let it go at the top of your jump. Green on the meter is money.']] },
  mahmoud: { x: 720, z: 150, lines: [['mahmoud', 'In 1987 I scored forty points in this gym, beta.'], ['mahmoud', 'Nobody kept score. But I know.']] },
  tariq: { x: 680, z: 520, lines: [['tariq', 'I’m Tariq. I keep the stat sheet now. Every shot, every assist.']] },
  siddiq: { x: 1240, z: 150, lines: [['siddiq', 'Chai after Isha, brother. The chalkboard by the door keeps our streak.']] }
};
const INTRO_SALEEM = { x: 860, z: 300 };
const INTRO_WRAP = [
  ['saleem', 'We’ve never won the Metro Masjid League. But we play with adab, and for each other.'],
  ['saleem', 'Practice here, earn Barakah Points, and get stronger. The league starts soon, in sha Allah.']
];
let INTRO = null;
function introPlayer(id) {
  const p = new Player(castDef(id), 9, 0, amanahTeam()); p.outfit = 'thobe'; p.state = 'free'; p.face = 1; p.x = -9999; p.noMarker = true;
  for (let i = 0; i < 20; i++) animate(p, 1 / 60);
  return p;
}
function startIntroWorld() {
  INTRO = { scene: 'out', t: 0, me: introPlayer('you'), saleem: introPlayer('saleem'), x: 70, d: 1, sx: 520, sd: 0.86, talk: null, talked: false, fade: 0, fadeDir: 0, saleemGo: 0 };
  INTRO.saleem.face = -1;
  Game.screen = 'introout';
}
function introSay(lines, done) { INTRO.talk = { lines, i: 0, t: 0, done }; }
function introAdvance() {
  const t = INTRO.talk; if (!t) return;
  if (t.t < 0.25) return;                                     // ignore the press that opened the line
  t.i++; t.t = 0; SFX.blip();
  if (t.i >= t.lines.length) { INTRO.talk = null; if (t.done) t.done(); }
}
function introSkip() {
  INTRO = null; Gym.intro = null;
  C.seen.intro = true; C.seen.meetNew = true; slog(0); careerHub();
}
const introOk = () => Input.pressed.Enter || Input.pressed.NumpadEnter || Input.pressed.KeyE || Input.pressed.Space;

// ---- speech bubble above a head at screen (x, y)
function introBubble(g, x, y, who, text, more) {
  g.save(); g.font = `15px ${BODY}`;
  const maxW = 300, words = text.split(' '), lines = []; let ln = '';
  for (const w of words) { const tt = ln ? ln + ' ' + w : w; if (g.measureText(tt).width > maxW && ln) { lines.push(ln); ln = w; } else ln = tt; }
  lines.push(ln);
  const tw = Math.max(...lines.map(l => g.measureText(l).width)), bw = Math.max(tw, 120) + 28, bh = 34 + lines.length * 20;
  const bx = clamp(x - bw / 2, 8, W - bw - 8), by = Math.max(8, y - bh - 16), tx = clamp(x, bx + 18, bx + bw - 18);
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = '#fffaf0'; roundRect(g, bx, by, bw, bh, 14); g.fill();
  g.beginPath(); g.moveTo(tx - 9, by + bh - 1); g.lineTo(tx, by + bh + 12); g.lineTo(tx + 9, by + bh - 1); g.fill();
  g.shadowColor = 'transparent';
  g.textAlign = 'left'; g.fillStyle = '#1e7a5e'; g.font = `12px ${FONT}`; g.fillText(who.toUpperCase(), bx + 14, by + 19);
  g.fillStyle = '#1a1210'; g.font = `15px ${BODY}`; lines.forEach((l, i) => g.fillText(l, bx + 14, by + 40 + i * 20));
  if (more) { g.fillStyle = '#c48d1e'; g.font = `11px ${FONT}`; g.textAlign = 'right'; g.fillText('▸', bx + bw - 10, by + bh - 8); }
  g.restore();
}
function introName(id) { return id === 'you' ? (C.name || 'You') : castDef(id).name; }
function introPrompt(g, x, y, label, fn) {
  g.font = `12px ${FONT}`; const w = g.measureText(label).width + 26;
  g.fillStyle = 'rgba(30,90,74,0.95)'; roundRect(g, x - w / 2, y - 26, w, 26, 13); g.fill();
  g.fillStyle = '#f2cf6b'; g.textAlign = 'center'; g.fillText(label, x, y - 8);
  addRect(x - w / 2, y - 26, w, 26, fn);
}
function introHint(g, text) {
  g.font = `12px ${BODY}`; const w = g.measureText(text).width + 30;
  g.fillStyle = 'rgba(8,16,24,0.72)'; roundRect(g, W / 2 - w / 2, H - 40, w, 28, 14); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, W / 2, H - 21);
}
function introSkipBtn(g) {
  g.fillStyle = 'rgba(8,16,24,0.72)'; roundRect(g, W - 128, 12, 116, 30, 15); g.fill();
  g.strokeStyle = 'rgba(242,207,107,0.5)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `12px ${FONT}`; g.fillText('Skip intro ›', W - 70, 32);
  addRect(W - 128, 12, 116, 30, introSkip);
}

// ================================================================ 1. OUTSIDE
// ground: d = 1 is the sidewalk (front), d = 0 is the masjid door at the end of the path
const OUT_DOOR_X = 420;
const outY = d => lerp(392, 474, d), outS = d => lerp(0.34, 0.74, d);
function outXRange(d) { const k = clamp((1 - d) / 0.82, 0, 1); return [lerp(40, OUT_DOOR_X - 16, k), lerp(W - 40, OUT_DOOR_X + 16, k)]; }   // the lawn: only the path leads in
function introOutUpdate(rdt) {
  const I = INTRO, dt = Math.min(rdt, 0.05); I.t += dt;
  if (I.talk) I.talk.t += dt;
  if (menuHit('back')) { introSkip(); return; }
  const me = I.me, S = I.saleem;
  if (I.fadeDir) {                                           // through the door
    I.fade = clamp(I.fade + dt * 1.6 * I.fadeDir, 0, 1);
    me.vx = me.vz = 0; me.fakeIdle = true; animate(me, dt); animate(S, dt);
    if (I.fade >= 1) startIntroGym();
    return;
  }
  if (I.talk) { if (introOk()) introAdvance(); me.vx = me.vz = 0; me.fakeIdle = true; animate(me, dt); S.fakeIdle = true; animate(S, dt); return; }
  // Saleem heads up the path once you've talked
  if (I.saleemGo) {
    I.saleemGo += dt;
    const tx = OUT_DOOR_X, td = 0.02, ddx = tx - I.sx, ddd = td - I.sd;
    if (Math.abs(ddx) > 2 || Math.abs(ddd) > 0.01) { const sp = 120 * outS(I.sd) / 0.74; I.sx += clamp(ddx, -sp * dt, sp * dt); I.sd += clamp(ddd, -0.35 * dt, 0.35 * dt); S.vx = 60; S.face = ddx > 0 ? 1 : -1; S.fakeIdle = false; }
    else { S.fakeIdle = true; S.vx = 0; I.saleemIn = true; }
  } else S.fakeIdle = true;
  animate(S, dt);
  // walk
  const c = me.cmd; humanCmd(0, c);
  if (!c.mx && !c.mz) { const c2 = {}; humanCmd(1, c2); c.mx = c2.mx || 0; c.mz = c2.mz || 0; }   // arrows work here too
  const k = outS(I.d) / 0.74, vx = c.mx * 150 * k, vd = c.mz * 0.42;
  I.d = clamp(I.d + vd * dt, I.talked ? 0 : 0.7, 1);
  const [x0, x1] = outXRange(I.d); I.x = clamp(I.x + vx * dt, x0, x1);
  if (!I.saleemGo && Math.abs(I.x - I.sx) < 40 * k + 20 && Math.abs(I.d - I.sd) < 0.2) I.x = I.sx - (40 * k + 20) * (I.x < I.sx ? 1 : -1);   // don't walk through him
  if (Math.abs(c.mx) > 0.05) me.face = c.mx > 0 ? 1 : -1;
  me.vx = vx; me.vz = vd * 120; me.fakeIdle = !(Math.abs(vx) + Math.abs(vd) > 0.02); animate(me, dt);
  // meet Saleem as you reach the path
  if (!I.talked && Math.abs(I.x - I.sx) < 120) {
    I.talked = true; me.face = 1; S.face = -1;
    introSay(INTRO_OUT, () => { I.saleemGo = 0.01; });
  }
  if (I.talked && I.d < 0.06) { I.fadeDir = 1; SFX.blip(); }
}
function drawIntroOut(g) {
  const I = INTRO, ox = Game.ox || 0, w0 = W;
  g.save(); g.translate(-ox, 0); W = w0 + 2 * ox;              // full-bleed street on wide screens
  drawExterior.signX = OUT_DOOR_X + 190; drawExterior(g, C.up, Game.t); drawExterior.signX = 0;
  const sx = I.x, dx = x => x;                                // same coordinates as drawExterior (its building doesn't move with width)
  // the path to the door
  g.fillStyle = 'rgba(214,204,186,0.9)'; g.beginPath();
  g.moveTo(dx(OUT_DOOR_X - 18), outY(0)); g.lineTo(dx(OUT_DOOR_X + 18), outY(0)); g.lineTo(dx(OUT_DOOR_X + 70), outY(0.86)); g.lineTo(dx(OUT_DOOR_X - 70), outY(0.86)); g.closePath(); g.fill();
  const figs = [{ p: I.me, x: sx, d: I.d }];
  if (!(I.saleemIn && I.fadeDir === 0 && I.saleemGo > 0 && I.sd < 0.04)) figs.push({ p: I.saleem, x: dx(I.sx), d: I.sd });
  figs.sort((a, b) => a.d - b.d);
  for (const f of figs) musFigure(g, f.p, f.x, outY(f.d), outS(f.d), 'stand');
  // speech
  if (I.talk) {
    const [who, text] = I.talk.lines[I.talk.i], at = who === 'you' ? { x: sx, d: I.d } : { x: dx(I.sx), d: I.sd };
    introBubble(g, at.x, outY(at.d) - 150 * outS(at.d), introName(who), text, true);
    addRect(0, 60, W, H - 60, introAdvance);
  }
  if (I.talked && !I.talk && !I.fadeDir) {                    // a soft arrow up the path
    const p = 0.5 + 0.5 * Math.sin(Game.t * 5); g.fillStyle = `rgba(242,207,107,${0.5 + 0.4 * p})`;
    const ax = OUT_DOOR_X, ay = outY(0.5) - 6 * p; g.beginPath(); g.moveTo(ax, ay - 14); g.lineTo(ax + 11, ay); g.lineTo(ax - 11, ay); g.closePath(); g.fill();
  }
  W = w0; g.restore();
  // establishing title
  const a = clamp(1 - Math.abs(I.t - 1.8) / 1.8, 0, 1) * (I.talked ? 0 : 1);
  if (a > 0) {
    g.save(); g.globalAlpha = a; g.textAlign = 'center';
    g.fillStyle = 'rgba(8,16,24,0.6)'; roundRect(g, W / 2 - 200, 60, 400, 64, 16); g.fill();
    g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Masjid Al-Amanah', W / 2, 92);
    g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText('Eastside • a small masjid with a big gym', W / 2, 112);
    g.restore();
  }
  introSkipBtn(g);
  if (!I.talk) introHint(g, !I.talked ? (Input.touchMode ? 'Walk over to the brother by the path' : 'A D or ← → to walk over to the brother by the path') : (Input.touchMode ? 'Follow him up the path to the door' : 'W or ↑ to follow him up the path to the door'));
  if (I.fade > 0) { g.fillStyle = `rgba(4,8,12,${I.fade})`; g.fillRect(-400, 0, W + 800, H); }
}

// ================================================================== 2. THE GYM
function startIntroGym() {
  setupPractice('free');
  const me = M.players[0]; place(me, 820, 640); me.face = 1; giveBall(me, 'inbound');
  const npcs = {};
  for (const id of Object.keys(INTRO_CAST)) { const p = introPlayer(id), s = INTRO_CAST[id]; p.x = s.x; p.z = s.z; p.face = s.x > 900 ? -1 : 1; npcs[id] = p; }
  const sal = introPlayer('saleem'); sal.x = INTRO_SALEEM.x; sal.z = INTRO_SALEEM.z; sal.face = -1; npcs.saleem = sal;
  INTRO = { scene: 'gym', t: 0, npcs, met: {}, near: null, talk: null, fade: 1, done: false };
  Gym.intro = INTRO;
  Game.screen = 'gym';
  introSay([['saleem', 'This is our gym. Go say salaam to the brothers, then come find me.']], null);
}
function introCastLeft() { return Object.keys(INTRO_CAST).filter(id => !INTRO.met[id]); }
function introTalkTo(id) {
  const I = INTRO; if (I.talk) return;
  const p = I.npcs[id], me = M.players[0]; p.face = sgn(me.x - p.x) || 1; me.face = -p.face;
  if (id === 'saleem') {
    if (introCastLeft().length) introSay([['saleem', 'Say salaam to everyone first: ' + introCastLeft().map(k => castDef(k).name).join(', ') + '.']], null);
    else introSay(INTRO_WRAP, () => { I.done = true; I.fade = 0; I.fadeDir = 1; });
    return;
  }
  introSay(INTRO_CAST[id].lines, () => { I.met[id] = true; if (!introCastLeft().length) introSay([['saleem', 'That’s everyone. Come here a second, brother.']], null); });
}
{
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    if (!Gym.intro || Gym.intro !== INTRO) return _gu.apply(this, arguments);
    const I = INTRO, dt = Math.min(rdt, 0.05); I.t += dt;
    if (I.talk) I.talk.t += dt;
    if (I.fade > 0 && !I.fadeDir) I.fade = Math.max(0, I.fade - dt * 1.5);
    if (I.fadeDir) { I.fade = Math.min(1, I.fade + dt * 1.4); if (I.fade >= 1) { introSkip(); return; } }
    if (menuHit('back')) { introSkip(); return; }
    const me = M.players[0];
    for (const id in I.npcs) { const p = I.npcs[id]; p.fakeIdle = true; p.vx = p.vz = 0; if (!I.talk && dxz(p, me) < 220) p.face = sgn(me.x - p.x) || p.face; animate(p, dt); }
    if (I.talk) { if (introOk()) introAdvance(); }
    else {
      let best = null, bd = 120;
      for (const id in I.npcs) { const d = dxz(I.npcs[id], me); if (d < bd) { bd = d; best = id; } }
      I.near = best;
      if (best && (Input.pressed.KeyE || Input.pressed.Enter)) introTalkTo(best);
    }
    sim(rdt, true);
    // nobody walks through anybody
    for (const id in I.npcs) { const p = I.npcs[id], d = dxz(p, me), min = 34; if (d < min && d > 1e-3) { me.x = p.x + (me.x - p.x) / d * min; me.z = p.z + (me.z - p.z) / d * min; } }
  };
  const _cmd = gymCmd;
  gymCmd = function (p) {
    if (Gym.intro && Gym.intro === INTRO && p.human >= 0 && (INTRO.talk || INTRO.fadeDir)) { zeroCmd(p.cmd); return true; }
    return _cmd.apply(this, arguments);
  };
  const _setup = setupPractice;
  setupPractice = function () { _setup.apply(this, arguments); M.cmdHook = gymCmd; M.drawExtras = gymExtras; };
  const _ex = gymExtras;
  gymExtras = function (E, g) {
    _ex.apply(this, arguments);
    if (!Gym.intro || Gym.intro !== INTRO || Game.screen !== 'gym') return;
    for (const id in INTRO.npcs) { const p = INTRO.npcs[id]; E.push({ z: p.z, f: () => { drawShadow(g, p.x, 0, p.z, 18); drawPlayer(g, p); } }); }
  };
  // the intro has its own Skip button (top-right); the gym's Back button would sit under the checklist
  const _bv = backVisible;
  backVisible = function () { if (Game.screen === 'gym' && Gym.intro && Gym.intro === INTRO) return false; return _bv.apply(this, arguments); };
  const _hud = drawGymHUD;
  drawGymHUD = function (g) {
    if (!Gym.intro || Gym.intro !== INTRO) return _hud.apply(this, arguments);
    const I = INTRO, me = M.players[0], head = p => P(p.x, 112, p.z);
    // checklist
    const ids = Object.keys(INTRO_CAST), n = ids.filter(id => I.met[id]).length;
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, 12, 12, 196, 36 + ids.length * 20, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('Meet the brothers  ' + n + '/' + ids.length, 26, 34);
    ids.forEach((id, i) => { g.fillStyle = I.met[id] ? '#9dffb0' : '#cfd8e3'; g.font = `12px ${BODY}`; g.fillText((I.met[id] ? '✓ ' : '• ') + castDef(id).name, 30, 56 + i * 20); });
    // names over heads, talk prompt for the nearest
    for (const id in I.npcs) {
      const p = I.npcs[id], [x, y] = head(p);
      if (I.talk) continue;
      if (id === I.near) introPrompt(g, x, y - 6, 'Talk to ' + castDef(id).name + (Input.touchMode ? '' : '  (E)'), () => introTalkTo(id));
      else if (!I.met[id] && id !== 'saleem') { g.fillStyle = 'rgba(242,207,107,0.9)'; g.textAlign = 'center'; g.font = `11px ${FONT}`; g.fillText(castDef(id).name, x, y - 10); }
      else if (id === 'saleem' && !introCastLeft().length) { const b = 0.5 + 0.5 * Math.sin(Game.t * 6); g.fillStyle = `rgba(242,207,107,${0.6 + 0.4 * b})`; g.textAlign = 'center'; g.font = `16px ${FONT}`; g.fillText('!', x, y - 12); }
    }
    if (I.talk) {
      const [who, text] = I.talk.lines[I.talk.i], p = who === 'you' ? me : I.npcs[who] || me, [x, y] = head(p);
      introBubble(g, x, y, introName(who), text, true);
      addRect(0, 60, W, H - 60, introAdvance);
    } else introHint(g, Input.touchMode ? 'Walk up to someone and tap Talk' : 'W A S D to walk  •  E to talk  •  shoot around while you’re at it');
    introSkipBtn(g);
    if (I.fade > 0) { g.fillStyle = `rgba(4,8,12,${I.fade})`; g.fillRect(-400, 0, W + 800, H); }
  };
  // new careers start with the in-world intro instead of the old story lineup
  creatorDone = function () {
    if (!C.name.trim()) C.name = 'Brother';
    if (Game.creator.isNew) { C.bracket = makeBracket(0); saveCareer(); startIntroWorld(); }
    else careerHub();
  };
  CAREER_SCREENS.add('introout');
  const _cu = careerUpdate;
  careerUpdate = function (rdt) { if (Game.screen === 'introout') return introOutUpdate(rdt); return _cu.apply(this, arguments); };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'introout') return drawIntroOut(g); return _cr.apply(this, arguments); };
  const _ch = careerHub;
  careerHub = function () { Gym.intro = null; return _ch.apply(this, arguments); };
}
