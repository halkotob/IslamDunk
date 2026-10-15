
// ================================================= v8.4: CINEMATIC STORY SCENES + JOURNAL
// Story scenes used to stand up to four brothers across the whole screen at 2.25x. Now they're
// staged like a film: the cast at a natural size on the gym floor in a loose group, facing whoever
// is talking, letterbox bars, a slow camera drift toward the speaker, a warm light on him, and
// subtitles in the lower bar. Lines still advance on your tap (the first tap finishes the line).
// A line can be a choice: ['choice', [[label, replyLines], ...]] shows the options in the bar and
// plays the reply you pick. Every scene you see is kept in the Journal (My Player → Journal).
const CINE = { cam: 0, zoom: 1, lb: 0 };
const actors = new Map();
function drawActor(g, x, y, def, T, s, face) {
  const key = def.name + '|' + def.skin + '|' + (def.look ? JSON.stringify(def.look) : '');
  let d = actors.get(key);
  if (!d) { d = new Player(def, 9, 0, T); d.x = -9999; for (let i = 0; i < 40; i++) animate(d, 1 / 60); actors.set(key, d); }
  d.T = T; d.face = face; d.outfit = 'thobe'; d.def = def;
  d.x = x + cam.x - FX.sx; d.z = (y - FLOOR_TOP - FX.sy) / ZS; d.y = 0;
  d.fakeIdle = true; d.vx = d.vz = 0; animate(d, Math.min(Game.rdt || STEP, 0.05));
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y); drawPlayer(g, d); g.restore();
}
function storyCast(s) {
  const ids = []; for (const l of s.lines) if (l[0] !== 'choice' && !ids.includes(l[0])) ids.push(l[0]);
  if (!ids.includes('you')) ids.push('you');
  const others = ids.filter(i => i !== 'you').slice(0, 4);
  return ['you', ...others];
}
// a loose group: you on the left, the others in a shallow arc facing you
function castSpots(n) {
  const S = [{ x: 330, y: 404, s: 1.22 }], arc = [[600, 408, 1.24], [700, 380, 1.12], [500, 382, 1.12], [790, 402, 1.2]];
  for (let i = 1; i < n; i++) { const a = arc[i - 1]; S.push({ x: a[0], y: a[1], s: a[2] }); }
  if (n === 2) S[1] = { x: 590, y: 404, s: 1.24 };
  return S;
}
function storyLine(s) { return s.lines[Math.min(s.i, s.lines.length - 1)]; }
function storyNext(s) {
  const line = storyLine(s);
  if (line[0] === 'choice') return;                                        // a choice waits for a pick
  const full = line[1].length;
  if (s.t * 55 < full) { s.t = full / 55; return; }
  s.i++; s.t = 0; s.pick = 0; if (s.i >= s.lines.length) s.then();
}
function storyChoose(s, k) {
  const line = storyLine(s), opt = line[1][k]; if (!opt) return;
  s.lines.splice(s.i, 1, ['you', opt[0]], ...opt[1]); s.t = 0; s.pick = 0;   // you say it, then the reply
  if (s.onChoice) s.onChoice(k, opt);
  SFX.blip && SFX.blip();
}
drawStory = function (g) {
  const s = Game.story, line = storyLine(s), choice = line[0] === 'choice', ids = storyCast(s), spots = castSpots(ids.length);
  const speakerId = choice ? 'you' : line[0], si = Math.max(0, ids.indexOf(speakerId));
  const dt = Math.min(Game.rdt || STEP, 0.05);
  CINE.lb += (1 - CINE.lb) * Math.min(1, dt * 5);
  CINE.cam += (((spots[si] || spots[0]).x - 480) * 0.22 - CINE.cam) * Math.min(1, dt * 1.6);
  CINE.zoom = 1.04 + 0.02 * Math.sin(Game.t * 0.25);
  // soften the room behind, and a vignette
  g.fillStyle = 'rgba(6,10,16,0.32)'; g.fillRect(-400, 0, W + 800, H);
  const vg = g.createRadialGradient(W / 2, H * 0.62, 120, W / 2, H * 0.62, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg; g.fillRect(-400, 0, W + 800, H);
  // the cast
  g.save(); g.translate(W / 2, H * 0.72); g.scale(CINE.zoom, CINE.zoom); g.translate(-W / 2 - CINE.cam, -H * 0.72);
  const T = amanahTeam(), R = rivalTeam(0), order = ids.map((id, i) => ({ id, i, sp: spots[i] })).sort((a, b) => a.sp.y - b.sp.y);
  for (const a of order) {
    const sp = a.sp, talking = a.id === speakerId;
    if (talking) { const gl = g.createRadialGradient(sp.x, sp.y, 4, sp.x, sp.y, 90); gl.addColorStop(0, 'rgba(255,214,140,0.32)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gl; g.beginPath(); g.ellipse(sp.x, sp.y, 90, 26, 0, 0, Math.PI * 2); g.fill(); }
    const tgt = talking ? spots[ids.indexOf('you') === a.i ? 1 : 0] || sp : spots[si] || sp, face = a.id === 'you' ? 1 : sgn(tgt.x - sp.x) || -1;
    g.globalAlpha = talking ? 1 : 0.88;
    drawActor(g, sp.x, sp.y, castDef(a.id), a.id === 'jalal' ? R : T, sp.s, face);
    g.globalAlpha = 1;
  }
  g.restore();
  // letterbox and subtitles
  const top = 46 * CINE.lb, bot = 112 * CINE.lb;
  g.fillStyle = '#05080c'; g.fillRect(-400, 0, W + 800, top); g.fillRect(-400, H - bot, W + 800, bot);
  if (s.title) { g.textAlign = 'center'; g.fillStyle = 'rgba(232,195,90,0.85)'; g.font = `13px ${FONT}`; g.fillText(s.title.toUpperCase(), W / 2, 30); }
  const y0 = H - bot + 30;
  if (choice) {
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `14px ${FONT}`; g.fillText(C.name || 'You', 90, y0);
    const n = line[1].length, w = Math.min(256, (790 - (n - 1) * 12) / n);
    line[1].forEach((opt, k) => {
      const x = 90 + k * (w + 12), sel = (s.pick | 0) === k;
      g.fillStyle = sel ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.08)'; roundRect(g, x, y0 + 12, w, 44, 10); g.fill();
      g.fillStyle = sel ? NIGHT : IVORY; g.font = `${n > 3 ? 13 : 14}px ${BODY}`; wrapTextLeft(g, opt[0], x + 10, y0 + 30, w - 20, 16);
      addRect(x, y0 + 12, w, 44, () => storyChoose(s, k));
    });
  } else {
    const who = speakerId === 'you' ? (C.name || 'You') : castDef(speakerId).name;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `14px ${FONT}`; g.fillText(who, W / 2, y0);
    g.fillStyle = '#fff'; g.font = `17px ${BODY}`;
    const txt = line[1].slice(0, Math.floor(s.t * 55)), words = txt.split(' '); let l = '', yy = y0 + 26;
    for (const w of words) { const t = l ? l + ' ' + w : w; if (g.measureText(t).width > 760 && l) { g.fillText(l, W / 2, yy); l = w; yy += 22; } else l = t; }
    g.fillText(l, W / 2, yy);
    addRect(0, 0, W, H, () => storyNext(s));
  }
  g.textAlign = 'right'; g.fillStyle = 'rgba(159,179,200,0.7)'; g.font = `11px ${BODY}`; g.fillText(choice ? '← → choose, Enter to answer' : 'Tap or Enter to continue  •  Esc to skip', W - 24, H - 10);
};
{
  // keys: choices take left/right + Enter; skipping past a choice picks the first answer
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'story' && Game.story) {
      const s = Game.story, line = storyLine(s);
      if (line[0] === 'choice') {
        s.t += rdt; const n = line[1].length;
        if (menuHit('left') || menuHit('up')) s.pick = ((s.pick | 0) + n - 1) % n;
        if (menuHit('right') || menuHit('down')) s.pick = ((s.pick | 0) + 1) % n;
        if (menuHit('ok') || Input.pressed.KeyJ) storyChoose(s, s.pick | 0);
        else if (menuHit('back')) { storyChoose(s, 0); s.then(); }
        return;
      }
      s.t += rdt;
      if (menuHit('ok') || Input.pressed.KeyJ) storyNext(s);
      else if (menuHit('back')) s.then();
      return;
    }
    return _cu.apply(this, arguments);
  };
  // the journal: every scene, in order (titles from where it was played)
  const _ps = playStory;
  playStory = function (lines, then, title) {
    CINE.lb = 0; CINE.cam = 0;
    const r = _ps.apply(this, arguments);
    if (Game.story) Game.story.title = title || storyTitle();
    if (C && lines && lines.length && !Game.replaying) {
      const J = C.journal || (C.journal = []);
      J.push({ s: C.season || 1, st: C.stage, g: C.gamesPlayed || 0, title: (Game.story && Game.story.title) || '', lines: lines.filter(l => l[0] !== 'choice').slice(0, 14) });
      if (J.length > 80) J.shift();
    }
    return r;
  };
}
function storyTitle() {
  if (!C) return '';
  const st = STAGES[C.stage] ? STAGES[C.stage].name : '';
  return (C.season > 1 ? 'Season ' + C.season + '  •  ' : '') + st + (C.gamesPlayed ? '  •  after game ' + C.gamesPlayed : '');
}
// ---- journal screen
const JournalUI = { idx: 0, scroll: 0 };
function openJournal() { Game.screen = 'journal'; JournalUI.idx = Math.max(0, ((C.journal || []).length) - 1); }
function drawJournal(g) {
  dim(g, 0.86);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Journal', W / 2, 52);
  const J = C.journal || [];
  if (!J.length) { g.fillStyle = IVORY; g.font = `15px ${BODY}`; g.fillText('Your story starts with your first game. Scenes you see are kept here.', W / 2, 200); return; }
  g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('↑ ↓ choose a scene  •  Enter to watch it again  •  Esc back', W / 2, 76);
  const TT = Input.touchMode && g === ctx, rows = TT ? 8 : 9, RH = TT ? 52 : 44, BH = RH - 6;   // v8.6.2: taller rows on phones
  const start = clamp(JournalUI.idx - 4, 0, Math.max(0, J.length - rows));
  for (let k = 0; k < Math.min(rows, J.length); k++) {
    const i = start + k, e = J[i], y = 96 + k * RH, sel = i === JournalUI.idx;
    g.fillStyle = sel ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.06)'; roundRect(g, 120, y, 720, BH, 10); g.fill();
    g.textAlign = 'left'; g.fillStyle = sel ? NIGHT : GOLD; g.font = `12px ${FONT}`; g.fillText(e.title || 'Scene ' + (i + 1), 136, TT ? y + 19 : y + 16);
    g.fillStyle = sel ? NIGHT : IVORY; g.font = `13px ${BODY}`;
    const first = e.lines[0] ? (e.lines[0][0] === 'you' ? (C.name || 'You') : castDef(e.lines[0][0]).name) + ': “' + e.lines[0][1] + '”' : '';
    g.fillText(fitText(g, first.length > 92 ? first.slice(0, 90) + '…' : first, 690), 136, TT ? y + 40 : y + 32);
    addRect(120, y, 720, BH, () => { if (JournalUI.idx === i) journalPlay(i); else JournalUI.idx = i; });
  }
}
function journalPlay(i) { const e = (C.journal || [])[i]; if (!e) return; Game.replaying = true; playStory(e.lines.slice(), () => { Game.replaying = false; openJournal(); }, e.title); Game.replaying = false; }
function journalUpdate() {
  const n = (C.journal || []).length;
  if (n) { if (menuHit('up')) JournalUI.idx = (JournalUI.idx + n - 1) % n; if (menuHit('down')) JournalUI.idx = (JournalUI.idx + 1) % n; if (menuHit('ok')) journalPlay(JournalUI.idx); }
  if (menuHit('back')) careerHub();
}
{
  CAREER_SCREENS.add('journal');
  const _cu = careerUpdate; careerUpdate = function (rdt) { if (Game.screen === 'journal') return journalUpdate(); return _cu.apply(this, arguments); };
  const _cr = careerRender; careerRender = function (g) { if (Game.screen === 'journal') return drawJournal(g); return _cr.apply(this, arguments); };
  BACK.journal = () => careerHub();
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments), mp = R.find(e => e.label === 'My Player');
    if (mp && mp.sub && !mp.sub.some(s => s.label === 'Journal')) mp.sub.push({ label: 'Journal', act: () => openJournal() });
    return R;
  };
}
