// ================================================= v9.22: THE CAREER STORY — walk scenes on the gym floor
// A walk is the real gym floor (walk, dribble, shoot) with people around the room. Walk up to someone and talk (E,
// Enter, or tap the prompt); they answer in speech bubbles. A walk can also have goals (the tutorial: move, sprint,
// shoot, score). When everyone needed is met and every goal is done, the closer (usually Sh. Saleem) wraps it up and
// the story moves on. Esc leaves for the hub; Continue starts the walk again.
// (The bubbles, prompts and what people do while you walk in come from the 7.8 intro, which this replaces.)
let SW = null;
function swPlayer(id) {
  const p = new Player(castDef(id), 9, 0, amanahTeam()); p.outfit = 'thobe'; p.state = 'free'; p.face = 1; p.x = -9999; p.noMarker = true;
  for (let i = 0; i < 20; i++) animate(p, 1 / 60);
  return p;
}
function storyWalkStart(S) {
  const D = STORY_WALKS[S.walk || S.id];
  enterGym(); M.lobbyGym = false;                                              // (the career's gym, never the online lobby's)
  const me = M.players[0]; place(me, 820, 640); me.face = 1; giveBall(me, 'inbound');
  const npcs = {}, defs = {};
  for (const d of D.npcs) { const p = swPlayer(d.id); p.x = d.x; p.z = d.z; p.face = d.face || 1; p.swAct = d.act || 'host'; p.actPh = (d.x * 7) % 6; npcs[d.id] = p; defs[d.id] = d; }
  const wp = C.story.wp && C.story.wp.id === S.id ? C.story.wp : null;         // a walk left half done picks up where it was
  SW = { S, D, npcs, defs, met: Object.assign({}, wp && wp.met), near: null, talk: null, with: null, lb: 0, fade: 1, fadeDir: 0, t: 0, goals: Object.assign({}, wp && wp.goals), gp: { dist: 0, sprintT: 0, made: 0 }, shoot: { ph: 'drib', t: 0, x: 0, y: 0, z: 0, rot: 0 } };
  Gym.story = SW; Gym.toastT = 0;
  if (D.start && !wp) swSay(D.start, null);
}
function swSay(lines, done) { SW.talk = { lines: lines.slice(), i: 0, t: 0, done }; }
function swAdvance() {
  const t = SW && SW.talk; if (!t || t.t < 0.25) return;      // ignore the press that opened the line
  t.i++; t.t = 0; SFX.blip();
  if (t.i >= t.lines.length) { SW.talk = null; if (t.done) t.done(); }
}
const swOk = () => Input.pressed.Enter || Input.pressed.NumpadEnter || Input.pressed.KeyE || Input.pressed.Space;
function swNeedLeft() { return SW.D.npcs.filter(d => d.need && !SW.met[d.id]).map(d => d.id); }
function swGoalsLeft() { return (SW.D.goals || []).filter(g => !SW.goals[g.id]).map(g => g.id); }
function swReady() { return !swNeedLeft().length && !swGoalsLeft().length; }
function swCloser() { const d = SW.D.npcs.find(x => x.closer); return d ? d.id : null; }
function swFinish() { SW.done = true; SW.fadeDir = 1; }
function swSave() { if (SW && C && C.story) { C.story.wp = { id: SW.S.id, met: Object.assign({}, SW.met), goals: Object.assign({}, SW.goals) }; saveCareer(); } }
// everyone needed met, every goal done, no closer: the walk's last line, then on
function swCheckEnd() { if (!SW || SW.done || SW.talk || !swReady() || swCloser()) return; SW.done = true; if (SW.D.end) swSay(SW.D.end, swFinish); else swFinish(); }
// the walk is over: into the Journal, and on to the next scene
function swEnd() { const I = SW; if (!I) return; const S = I.S; storyJournal(S, swJournalLines(I)); Gym.story = null; SW = null; if (C.story.wp && C.story.wp.id === S.id) C.story.wp = null; storyDone(S, 'next'); }
function swTalkTo(id) {
  const I = SW; if (!I || I.talk || I.fadeDir) return;
  const d = I.defs[id], p = I.npcs[id], me = M.players[0];
  p.face = sgn(me.x - p.x) || 1; me.face = -p.face; I.with = id;
  const lines = L => typeof L === 'function' ? L() : L;
  if (d.closer) {
    if (!swReady()) { swSay(lines(d.early) || [[id, 'Come back when you’re done.']], null); return; }
    swSay(lines(d.lines), swFinish); return;
  }
  const own = d.scene ? storyLinesOf(SC[d.scene]) : d.lines;                   // a part scene (C1.3) speaks its own lines
  const L = !I.met[id] && own ? lines(own) : lines(d.again) || STORY_GYM_TALK[id] || lines(own);
  swSay(L, () => {
    const first = !I.met[id]; I.met[id] = true;
    if (first && d.scene) { const P = SC[d.scene]; C.story.seen[P.id] = (C.story.seen[P.id] || 0) + 1; storyJournal(P, L); }
    if (d.goal) swGoal(d.goal);
    if (first) swSave();
    swCheckEnd();
  });
}
function swGoal(id) {
  if (!SW || SW.goals[id]) return;
  const g = (SW.D.goals || []).find(x => x.id === id); if (!g) return;
  SW.goals[id] = true; SFX.good && SFX.good();
  gymToast('✓ ' + g.label, 2);
  swSave(); swCheckEnd();
}
function swTrackGoals(dt) {
  const I = SW, me = M.players[0]; if (!I.D.goals || !me) return;
  const sp = Math.hypot(me.vx || 0, me.vz || 0);
  I.gp.dist += sp * dt;
  if (I.gp.dist > 260) swGoal('walk');
  if (me.cmd && me.cmd.turbo && sp > 40) I.gp.sprintT += dt;
  if (I.gp.sprintT > 0.5) swGoal('sprint');
  if (ball.state === 'shot' && ball.shot && ball.shot.shooter === me) swGoal('shoot');
  const sg = I.D.goals.find(g => g.id === 'score');
  if (sg && I.gp.made >= (sg.n || 1)) swGoal('score');
}
{
  const _gu = gymUpdate;
  gymUpdate = function (rdt) {
    const I = Gym.story;
    if (!I || I !== SW || Game.screen !== 'gym') return _gu.apply(this, arguments);
    if (I.D.free && (Gym.drill || Gym.overlay || Gym.result || Gym.prop || Gym.walk || Gym.fade)) return _gu.apply(this, arguments);
    const dt = Math.min(rdt, 0.05); I.t += dt;
    if (I.talk) I.talk.t += dt;
    if (I.fade > 0 && !I.fadeDir) I.fade = Math.max(0, I.fade - dt * 1.5);
    if (I.fadeDir) { I.fade = Math.min(1, I.fade + dt * 1.4); if (I.fade >= 1) { swEnd(); return; } }
    if (menuHit('back') && !I.fadeDir) { careerHub(); return; }
    const me = M.players[0];
    if (!I.talk) I.with = null;
    I.lb += ((I.talk ? 1 : 0) - I.lb) * Math.min(1, dt * 6);
    for (const id in I.npcs) {
      const p = I.npcs[id], d = I.defs[id]; p.fakeIdle = true; p.vx = p.vz = 0;
      if (I.with === id || (p.swAct === 'host' && dxz(p, me) < 260)) p.face = sgn(me.x - p.x) || p.face;
      else p.face = d.face || p.face;
      swActStep(p, id, dt);
      animate(p, dt);
    }
    if (!I.fadeDir) swTrackGoals(dt);
    if (I.talk) {
      const key = I.talk.i + '|' + I.talk.lines.length;
      if (I.lineKey !== key) { I.lineKey = key; const who = I.talk.lines[I.talk.i][0]; if (who !== 'you') react(me, 'nod', 0.5); else if (I.with && I.npcs[I.with]) react(I.npcs[I.with], 'nod', 0.5); }
      if (swOk()) swAdvance();
    } else if (!I.fadeDir) {
      let best = null, bd = 120;
      for (const id in I.npcs) { const d = dxz(I.npcs[id], me); if (d < bd) { bd = d; best = id; } }
      I.near = best;
      if (best && (Input.pressed.KeyE || Input.pressed.Enter)) swTalkTo(best);
      else if (I.D.free) {                                                       // the gym's own keys: drills, props, the doors
        const pr = gymPropNear();
        if (Input.pressed.Digit1 || Input.pressed.KeyQ) openDrills();
        else if (Input.pressed.KeyF && pr) useGymProp(pr);
        else if (Input.pressed.Digit2 || Input.pressed.KeyE) enterMusalla();
        else if (Input.pressed.Digit3 || Input.pressed.KeyO) enterOffice();
      }
    }
    sim(rdt, true);
    for (const id in I.npcs) { const p = I.npcs[id], d = dxz(p, me), min = 34; if (d < min && d > 1e-3) { me.x = p.x + (me.x - p.x) / d * min; me.z = p.z + (me.z - p.z) / d * min; } }
    if (Gym.toastT > 0) Gym.toastT -= rdt;
  };
  const _cmd = gymCmd;
  gymCmd = function (p) {
    if (Gym.story && Gym.story === SW && p.human >= 0 && (SW.talk || SW.fadeDir)) { zeroCmd(p.cmd); return true; }
    return _cmd.apply(this, arguments);
  };
  const _ps = practiceScore;
  practiceScore = function () { if (Gym.story && Gym.story === SW && !Gym.drill) SW.gp.made++; return _ps.apply(this, arguments); };
  const _ex = gymExtras;
  gymExtras = function (E, g) {
    _ex.apply(this, arguments);
    if (!Gym.story || Gym.story !== SW || Game.screen !== 'gym') return;
    for (const id in SW.npcs) { const p = SW.npcs[id]; E.push({ z: p.z, f: () => { swPropBack(g, p); drawShadow(g, p.x, 0, p.z, 18); drawPlayer(g, p); swPropFront(g, p); } }); }
    const B = SW.shoot; if (B.on) E.push({ z: B.z + 1, f: () => { drawShadow(g, B.x, 0, B.z, 7); drawBallAt(g, B.x, B.y, B.z, B.rot, false); } });
  };
  const _hud = drawGymHUD;
  drawGymHUD = function (g) {
    if (!Gym.story || Gym.story !== SW) return _hud.apply(this, arguments);
    const I = SW, me = M.players[0], head = p => P(p.x, 112, p.z), TT = Input.touchMode && g === ctx;
    if (I.D.free) { if (Gym.drill || Gym.overlay || Gym.result || Gym.walk || Gym.fade) return _hud.apply(this, arguments); if (!I.talk) _hud.apply(this, arguments); }
    if (I.lb > 0.01) { const b = 40 * I.lb; g.fillStyle = 'rgba(4,8,12,0.92)'; g.fillRect(-400, 0, W + 800, b); g.fillRect(-400, H - b, W + 800, b); }
    // the checklist: who to meet, or the tutorial's goals
    const rows = I.D.goals ? I.D.goals.map(q => [I.goals[q.id], q.label + (q.n && !I.goals[q.id] ? '  ' + Math.min(I.gp.made, q.n) + '/' + q.n : '')])
      : I.D.npcs.filter(d => d.need).map(d => [I.met[d.id], castDef(d.id).name]);
    if (rows.length) {
      g.save(); g.globalAlpha = 1 - I.lb; g.font = `12px ${BODY}`;
      const rh = Math.max(20, (typeof phoneEffPx === 'function' ? phoneEffPx(g) : 12) + 8), w = Math.max(196, ...rows.map(r => g.measureText('✓ ' + r[1]).width + 44));
      const x0 = TT ? 12 : 132, y0 = TT ? 72 : 12;                       // (clear of the Back button: beside it on a computer, under it on a phone)
      g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x0, y0, w, 30 + rows.length * rh, 12); g.fill();
      g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(I.D.title || 'Walk around', x0 + 14, y0 + 20);
      rows.forEach(([ok, label], i) => { g.fillStyle = ok ? '#9dffb0' : '#cfd8e3'; g.font = `12px ${BODY}`; g.fillText((ok ? '✓ ' : '• ') + label, x0 + 16, y0 + 20 + (i + 1) * rh); });
      g.restore();
    }
    for (const id in I.npcs) {
      const p = I.npcs[id], [x, y] = head(p), d = I.defs[id];
      if (I.talk || I.fadeDir) continue;
      const nm = castDef(id).name;
      if (id === I.near) swPrompt(g, x, y - 6, 'Talk to ' + nm + (Input.touchMode ? '' : '  (E)'), () => swTalkTo(id));
      else if (d.closer && swReady()) { const b = 0.5 + 0.5 * Math.sin(Game.t * 6); g.fillStyle = `rgba(242,207,107,${0.6 + 0.4 * b})`; g.textAlign = 'center'; g.font = `16px ${FONT}`; g.fillText('!', x, y - 12); }
      else if ((d.need && !I.met[id]) || dxz(p, me) < 300) { g.fillStyle = 'rgba(242,207,107,0.9)'; g.textAlign = 'center'; g.font = `11px ${FONT}`; g.fillText(nm, x, y - 10); }
    }
    if (I.talk) {
      const [who, text] = I.talk.lines[I.talk.i], p = who === 'you' ? me : I.npcs[who] || I.npcs[I.with] || me, [x, y] = head(p);
      swBubble(g, x, y, who === 'you' ? (C.name || 'You') : castDef(who).name, text, true);
      addRect(0, 60, W, H - 60, swAdvance);
    } else if (!I.fadeDir) {
      const gl = I.D.goals && I.D.goals.find(q => !I.goals[q.id]);
      swHint(g, gl ? (Input.touchMode ? gl.touch : gl.key) : swReady() && swCloser() ? 'Go and talk to ' + castDef(swCloser()).name : (Input.touchMode ? 'Walk up to someone and tap Talk' : 'W A S D to walk  •  E to talk'), I.D.free);
    }
    if (Gym.toastT > 0 && Gym.toast && !I.talk && !I.D.free) { g.font = `13px ${FONT}`; textPill(g, W / 2, 64, 30, Gym.toast, `13px ${FONT}`, 'rgba(30,90,74,0.92)', '#f2cf6b'); }
    if (I.fade > 0) { g.fillStyle = `rgba(4,8,12,${I.fade})`; g.fillRect(-400, 0, W + 800, H); }
  };
}
function swJournalLines(I) {
  const out = [];
  for (const d of I.D.npcs) if (I.met[d.id] || d.closer) { const L = typeof d.lines === 'function' ? d.lines() : d.lines; if (L) out.push(...L.slice(0, 2)); }
  return out.length ? out : [['narr', I.D.title || I.S.name]];
}

// ---------------------------------------------------------------- bubbles, prompts and the hint pill
function swBubble(g, x, y, who, text, more) {
  g.save(); g.font = `15px ${BODY}`;
  const maxW = 300, words = text.split(' '), lines = []; let ln = '';
  for (const w of words) { const tt = ln ? ln + ' ' + w : w; if (g.measureText(tt).width > maxW && ln) { lines.push(ln); ln = w; } else ln = tt; }
  lines.push(ln);
  const lh = Math.max(20, (typeof phoneEffPx === 'function' ? phoneEffPx(g) : 15) + 5);
  const tw = Math.max(...lines.map(l => g.measureText(l).width)), bw = Math.max(tw, 120) + 28, bh = 34 + lines.length * lh;
  const bx = clamp(x - bw / 2, 8, W - bw - 8), by = Math.max(8, y - bh - 16), tx = clamp(x, bx + 18, bx + bw - 18);
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = '#fffaf0'; roundRect(g, bx, by, bw, bh, 14); g.fill();
  g.beginPath(); g.moveTo(tx - 9, by + bh - 1); g.lineTo(tx, by + bh + 12); g.lineTo(tx + 9, by + bh - 1); g.fill();
  g.shadowColor = 'transparent';
  g.textAlign = 'left'; g.fillStyle = '#1e7a5e'; g.font = `12px ${FONT}`; g.fillText(who.toUpperCase(), bx + 14, by + 19);
  g.fillStyle = '#1a1210'; g.font = `15px ${BODY}`; lines.forEach((l, i) => g.fillText(l, bx + 14, by + 40 + i * lh));
  if (more) { g.fillStyle = '#c48d1e'; g.font = `11px ${FONT}`; g.textAlign = 'right'; g.fillText('▸', bx + bw - 10, by + bh - 8); }
  g.restore();
}
function swPrompt(g, x, y, label, fn) {
  g.font = `12px ${FONT}`; const w = g.measureText(label).width + 26, h = Input.touchMode ? 34 : 26;
  g.fillStyle = 'rgba(30,90,74,0.95)'; roundRect(g, x - w / 2, y - h, w, h, h / 2); g.fill();
  g.fillStyle = '#f2cf6b'; g.textAlign = 'center'; g.fillText(label, x, y - h / 2 + 4);
  addRect(x - w / 2, y - h, w, h, fn);
}
function swHint(g, text, free) {
  g.font = `12px ${BODY}`; const w = Math.min(W - 40, g.measureText(text).width + 30), y = Input.touchMode ? 12 : free ? H - 128 : H - 40;   // (free walks: above the gym's own bar)
  if (Input.touchMode) return;                                   // phones: the touch controls own the bottom; the checklist says it
  g.fillStyle = 'rgba(8,16,24,0.72)'; roundRect(g, W / 2 - w / 2, y, w, 28, 14); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(fitText(g, text, w - 20), W / 2, y + 19);
}

// ---------------------------------------------------------------- what people are doing while you walk in
// Ilyas's shootaround: dribble, gather, jumper, swish, the ball bounces back out to him. He holds it while you talk.
function swActStep(p, id, dt) {
  const I = SW; p.actT = (p.actT || 0) + dt;
  if (p.swAct !== 'shoot') return;
  const S = I.shoot, h = hoops[1], talking = I.with === id;
  S.on = true; S.t += dt; S.rot += dt * 7;
  if (talking && (S.ph === 'drib' || S.ph === 'set')) { S.ph = 'hold'; S.t = 0; }
  if (S.ph === 'hold') {
    p.fakeHold = false; p.y = 0; const hd = p.hands.n; S.x = hd.x + p.face * 3; S.y = hd.y - 2; S.z = hd.z + 2;
    if (!talking) { S.ph = 'drib'; S.t = 0; }
  } else if (S.ph === 'drib') {
    p.fakeHold = true; const hd = p.hands[p.dh] || p.hands.n;
    S.x = hd.x + p.face * 5; S.y = BALL_R + (hd.y - 4 - BALL_R) * Math.abs(Math.cos(Math.PI * p.dp)); S.z = hd.z + 3;
    if (S.t > 2.2 && p.dp < 0.15) { S.ph = 'set'; S.t = 0; }
  } else if (S.ph === 'set') {
    p.fakeHold = false; const k = Math.min(1, S.t / 0.3);
    S.x = lerp(S.x, p.x + p.face * 6, k); S.y = lerp(S.y, 112, k); S.z = p.z + 2;
    if (S.t > 0.32) { S.ph = 'jump'; S.t = 0; }
  } else if (S.ph === 'jump' || S.ph === 'fly') {
    const air = S.ph === 'jump' ? S.t : S.t + 0.26;
    p.y = Math.max(0, 28 * Math.sin(Math.PI * Math.min(1, air / 0.6)));
    if (S.ph === 'jump') { S.x = p.x + p.face * 8; S.y = p.y + 128; S.z = p.z + 2; if (S.t >= 0.26) { S.fly = { x0: S.x, y0: S.y, z0: S.z }; S.ph = 'fly'; S.t = 0; } }
    else {
      const F = S.fly, u = Math.min(1, S.t / 0.95);
      S.x = lerp(F.x0, h.x, u); S.z = lerp(F.z0, h.z, u); S.y = lerp(F.y0, RIM_Y + 6, u) + 80 * 4 * u * (1 - u);
      if (u >= 1) { S.ph = 'drop'; S.t = 0; if (SFX.netSwish && onScreen(h.x)) try { SFX.netSwish(0.4, 0, 1); } catch (e) {} }
    }
  } else if (S.ph === 'drop') {
    p.y = 0; S.x = h.x; S.z = h.z; S.y = Math.max(BALL_R, RIM_Y + 6 - 450 * S.t * S.t);
    if (S.y <= BALL_R) { S.ph = 'back'; S.t = 0; S.bx = S.x; S.bz = S.z; }
  } else if (S.ph === 'back') {
    const u = Math.min(1, S.t / 1.3), tx = p.x + p.face * 16, tz = p.z + 4;
    S.x = lerp(S.bx, tx, u); S.z = lerp(S.bz, tz, u); S.y = BALL_R + 55 * (1 - u) * Math.abs(Math.sin(u * Math.PI * 2.5));
    if (u >= 1) { S.ph = 'drib'; S.t = 0; }
  }
}
{
  const _pt = poseTargets;
  poseTargets = function (p, sp) {
    const t = _pt.apply(this, arguments);
    if (!p.swAct || !SW || Gym.story !== SW) return t;
    const I = SW, tt = (p.actT || 0) + (p.actPh || 0), talking = !!I.with && I.npcs[I.with] === p;
    const speaking = talking && I.talk && I.talk.lines[I.talk.i][0] !== 'you', beat = Math.max(0, Math.sin(tt * 4.5));
    const gest = (side = 'n') => { t[side + 's'] = 0.85 + 0.35 * beat; t[side + 'e'] = 1.05 - 0.3 * beat; };
    switch (p.swAct) {
      case 'sit': t.nh = t.fh = 1.45; t.nk = t.fk = 1.5; t.lean = 0.1; t.ns = 0.75; t.ne = 1.0; t.fs = 0.8; t.fe = 0.95; t.K = 300; if (speaking) gest(); break;
      case 'stretch':
        if (talking) { if (speaking) gest(); break; }
        { const c = tt % 7;
          if (c < 3) { t.ns = t.fs = 3.0; t.ne = t.fe = 0.15; t.lean = -0.06; }
          else if (c < 5.5) { t.lean = 1.0; t.ns = t.fs = 0.25; t.ne = t.fe = 0.05; t.nk = t.fk = 0.02; t.nh = t.fh = 0; }
          t.K = 200; t.D = 22; }
        break;
      case 'chai': {
        const pour = !talking && tt % 6 < 1.6; p.pouring = pour;
        if (pour) { t.ns = 1.25; t.ne = 0.45; t.fs = 0.7; t.fe = 1.5; t.lean = 0.18; } else { t.ns = 0.65; t.ne = 1.75; t.fs = 0.3; t.fe = 0.5; }
        if (speaking) gest('f'); break;
      }
      case 'host': if (speaking) gest(); else { t.ns = 0.55; t.ne = 2.25; t.fs = 0.5; t.fe = 2.35; } break;
      case 'shoot': {
        const S = I.shoot;
        if (S.ph === 'set') { t.ns = t.fs = 2.3; t.ne = t.fe = 1.9; t.nk = t.fk = 0.7; t.nh = t.fh = 0.45; }
        else if (S.ph === 'jump') { t.ns = t.fs = 2.9; t.ne = t.fe = 0.6; }
        else if (S.ph === 'fly') { t.ns = 2.95; t.ne = 0.15; t.fs = 2.5; t.fe = 0.9; }
        else if (S.ph === 'hold') { t.ns = 0.6; t.ne = 1.6; t.fs = 0.2; t.fe = 0.4; if (speaking) gest('f'); }
        t.K = Math.max(t.K, 900); t.D = Math.max(t.D, 50); break;
      }
    }
    return t;
  };
}
// props: a folding chair, the chai table (thermos, glasses, steam)
function swPropBack(g, p) {
  const k = depthK(p.z), q = (x, y, z) => P(x, y, z);
  if (p.swAct === 'sit') {
    const f = p.face, sx = p.x - f * 2, bx = p.x - f * 16;
    g.strokeStyle = '#5b6470'; g.lineWidth = 3 * k; g.lineCap = 'round';
    const line = (a, b) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
    line(q(sx - 14, 0, p.z - 8), q(sx + 12, 22, p.z - 8)); line(q(sx + 12, 0, p.z - 8), q(sx - 14, 22, p.z - 8));
    line(q(bx, 22, p.z - 8), q(bx, 62, p.z - 8));
    g.fillStyle = '#7c8794'; const a = q(sx - 16, 23, p.z - 8), b = q(sx + 16, 23, p.z - 8); roundRect(g, Math.min(a[0], b[0]), a[1] - 4 * k, Math.abs(b[0] - a[0]), 5 * k, 2); g.fill();
    const c = q(bx, 62, p.z - 8); roundRect(g, c[0] - 4 * k, c[1], 8 * k, 18 * k, 3); g.fill();
  } else if (p.swAct === 'chai') {
    const tx = p.x + p.face * 40, tz = p.z - 4, [x, y] = q(tx, 32, tz), w = 46 * k;
    g.fillStyle = '#6b4a2b'; g.fillRect(x - w / 2 + 3 * k, y, 3 * k, 32 * k); g.fillRect(x + w / 2 - 6 * k, y, 3 * k, 32 * k);
    g.fillStyle = '#e9e2d0'; roundRect(g, x - w / 2, y - 5 * k, w, 7 * k, 2); g.fill();
    g.fillStyle = '#c0392b'; roundRect(g, x - 18 * k, y - 22 * k, 9 * k, 18 * k, 3); g.fill();
    if (!p.pouring) { g.fillStyle = '#2b2b2b'; g.fillRect(x - 17 * k, y - 25 * k, 7 * k, 4 * k); }
    for (let i = 0; i < 3; i++) {
      const cx = x - 2 * k + i * 9 * k; g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(cx, y - 11 * k, 6 * k, 8 * k);
      g.fillStyle = '#b5652b'; g.fillRect(cx + 0.8 * k, y - 8 * k, 4.4 * k, 4.5 * k);
      const st = (Game.t * 0.6 + i * 0.33) % 1; g.strokeStyle = `rgba(255,255,255,${0.35 * (1 - st)})`; g.lineWidth = 1.5 * k;
      g.beginPath(); g.moveTo(cx + 3 * k, y - 12 * k - st * 16 * k); g.quadraticCurveTo(cx + 3 * k + Math.sin(Game.t * 3 + i) * 4 * k, y - 18 * k - st * 16 * k, cx + 3 * k, y - 24 * k - st * 16 * k); g.stroke();
    }
  }
}
function swPropFront(g, p) {
  if (p.swAct !== 'chai') return;
  const k = depthK(p.z), n = p.hands.n, [x, y] = P(n.x, n.y, p.z + 8);
  g.save(); g.translate(x, y); g.scale(k, k);
  if (p.pouring) { g.rotate(p.face * 0.9); g.fillStyle = '#c0392b'; roundRect(g, -4, -9, 9, 18, 3); g.fill(); }
  else { g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-3, -6, 6, 8); g.fillStyle = '#b5652b'; g.fillRect(-2.2, -3, 4.4, 4.5); }
  g.restore();
}

// the gym's corners in a story walk: the whiteboard shows your stats (and Back comes back here), the cooler and a drill count
{
  // the whiteboard's prompt says what it does in this walk
  const _gpn = gymPropNear;
  gymPropNear = function () { const p = _gpn.apply(this, arguments); return p && p.id === 'wb' && Gym.story && Gym.story === SW && SW.D.goals && SW.D.goals.some(q => q.id === 'upgrade') ? Object.assign({}, p, { label: 'Your stats on the whiteboard' }) : p; };
  const _ugp = useGymProp;
  useGymProp = function (p) {
    if (Gym.story && Gym.story === SW && SW.D.goals) {
      if (p.id === 'wb' && SW.D.goals.some(q => q.id === 'upgrade')) { swGoal('upgrade'); Game.trainBack = 'gym'; Game.screen = 'train'; Game.idx = 0; SFX.blip(); return; }
      if (p.id === 'cooler') swGoal('cooler');
    }
    return _ugp.apply(this, arguments);
  };
  const _fd = finishDrill; finishDrill = function () { const r = _fd.apply(this, arguments); if (Gym.story && Gym.story === SW) swGoal('drill'); return r; };
  const _fm = finishMini; finishMini = function () { const story = Gym.drill && Gym.drill.story; const r = _fm.apply(this, arguments); if (!story && Gym.story && Gym.story === SW) swGoal('drill'); return r; };
  // Upgrade stats opened from the whiteboard: Back returns to the gym (the walk goes on)
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'train' && Game.trainBack && menuHit('back')) { Game.trainBack = null; Game.screen = 'gym'; return; }
    return _cu.apply(this, arguments);
  };
  const _bt = BACK.train;
  BACK.train = function () { if (Game.trainBack) { Game.trainBack = null; Game.screen = 'gym'; return; } return _bt ? _bt.apply(this, arguments) : careerHub(); };
}

// ---------------------------------------------------------------- C1.5: the musalla walk
// The musalla's own screen (walk, talk, use things); the five people to meet each introduce themselves first. When
// everyone is met (and the talk is closed), the story moves on. Esc or the doorway leaves; Continue comes back.
function storyMusallaStart(S) {
  enterGym(); M.lobbyGym = false; openMusalla();
  const wp = C.story.wp && C.story.wp.id === S.id ? C.story.wp : null;
  Game.mus.story = { S, met: Object.assign({}, wp && wp.met) };
}
function smusLeft() { const st = Game.mus && Game.mus.story; return st ? STORY_MUS_NEED.filter(id => !st.met[id]) : []; }
{
  const _tt = talkTo;
  talkTo = function (i) {
    const r = _tt.apply(this, arguments), m = Game.mus, st = m && m.story, id = MUS_CAST[i];
    if (st && STORY_MUS_INTRO[id] && !st.met[id]) {
      const t = m.talk; t.mode = 'answer'; t.lines = STORY_MUS_INTRO[id].slice(); t.li = 0;
      st.met[id] = true; C.story.wp = { id: st.S.id, met: Object.assign({}, st.met), goals: {} }; saveCareer();
    }
    return r;
  };
  const _mu = musallaUpdate;
  musallaUpdate = function (rdt) {
    const m = Game.mus, st = m && m.story;
    const r = _mu.apply(this, arguments);
    if (st && Game.mus === m && !m.talk && !smusLeft().length) {
      const S = st.S, lines = STORY_MUS_NEED.map(id => [id, STORY_MUS_INTRO[id][0]]);
      Game.mus = null; Game.screen = 'gym'; C.story.wp = null;
      storyJournal(S, lines); storyDone(S, 'next');
    }
    return r;
  };
  const _dm = drawMusallaScreen;
  drawMusallaScreen = function (g) {
    _dm.apply(this, arguments);
    const m = Game.mus, st = m && m.story; if (!st || m.talk) return;
    g.font = `12px ${BODY}`; const rh = Math.max(20, (typeof phoneEffPx === 'function' ? phoneEffPx(g) : 12) + 8);
    const w = Math.max(196, ...STORY_MUS_NEED.map(id => g.measureText('✓ ' + castDef(id).name).width + 44)), x0 = W - w - 12, y0 = 8;
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x0, y0, w, 30 + STORY_MUS_NEED.length * rh, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText('Meet the musalla', x0 + 14, y0 + 20);
    STORY_MUS_NEED.forEach((id, i) => { const ok = !!st.met[id]; g.fillStyle = ok ? '#9dffb0' : '#cfd8e3'; g.font = `12px ${BODY}`; g.fillText((ok ? '✓ ' : '• ') + castDef(id).name, x0 + 16, y0 + 20 + (i + 1) * rh); });
  };
}
