// ================================================= v9.22: THE CAREER STORY — the runner and the save
// C.story = { at, cp, seen, fund, fundOn, att, done }:
//   at      the scene the hub's Continue plays next (saved before a scene starts, so a reload resumes there)
//   cp      the current chapter's checkpoint (a run-ending loss plays "next season" and comes back to it)
//   seen    scene ID -> times finished
//   fund    the school wing fundraiser total (dollars); fundOn once Sh. Saleem has told the team why they play (C2.3)
//   att     tournament attempts (seeds the bracket of each new attempt)
// Old career saves (sv < 10) are not migrated: the game is in testing, so they load as no save and a new career starts.
const STORY_SV = 10;
function storyFresh() { return { at: STORY_FIRST, cp: null, seen: {}, fund: 0, fundOn: false, att: 0, done: false }; }
function storyOn() { return !!(C && C.story); }
// the scene at C.story.at; a scene this build doesn't have yet (a save from a later build) reads as its chapter, not built
function storyScene() {
  if (!storyOn()) return null;
  const at = C.story.at, S = SC[at]; if (S) return S;
  const m = /^(?:C(\d)|P)\./.exec(at || ''); if (!m) return null; const ch = m[1] ? +m[1] : 6;
  return { id: at, ch, kind: 'scene', name: CHAPTERS[Math.min(ch, CHAPTERS.length - 1)].name, unbuilt: true };
}
function storyChapter() { const S = storyScene(); return S ? Math.min(S.ch, CHAPTERS.length - 1) : 0; }
function storyTitleOf(S) { const ch = CHAPTERS[Math.min(S.ch, CHAPTERS.length - 1)]; return (S.ch <= 5 ? 'Chapter ' + ch.n + '  •  ' : '') + S.name; }
{
  const _fc = freshCareer;
  freshCareer = function () {
    const c = _fc.apply(this, arguments);
    c.sv = STORY_SV; c.story = storyFresh(); c.bracket = null; c.partner = 'saleem';
    c.chem = {}; for (const id of STORY_MATES) c.chem[id] = id === 'saleem' ? 10 : 0;
    c.up = { fountain: 1 };                     // the gym has a water cooler from the start (it's in the story from Chapter 1)
    return c;
  };
  const _rs = readSave;
  readSave = function (key) { const o = _rs.apply(this, arguments); return o && (o.sv || 0) >= STORY_SV && o.story ? o : null; };
  const _lc = loadCareer;
  loadCareer = function () {
    const r = _lc.apply(this, arguments);
    if (r && C) { C.story = Object.assign(storyFresh(), C.story || {}); if (typeof C.story.at !== 'string') C.story.at = STORY_FIRST; C.sv = Math.max(C.sv || 0, STORY_SV); }
    return r;
  };
  // a new career: the creator, then Chapter 0 straight away
  creatorDone = function () {
    if (!C.name.trim()) C.name = 'Brother';
    if (Game.creator.isNew) { C.story = storyFresh(); saveCareer(); storyRun(); }
    else careerHub();
  };
  const _ch = careerHub;
  careerHub = function () { storyLeave(); return _ch.apply(this, arguments); };
}
// everything the story has on screen goes when the hub opens
function storyLeave() { Gym.story = null; Game.salams = null; if (typeof KOTC !== 'undefined' && KOTC.story) KOTC.story = null; }

// ---------------------------------------------------------------- the runner
function storyRun() {
  if (!storyOn()) return careerHub();
  const S = storyScene();
  if (!S) { C.story.at = STORY_FIRST; return storyRun(); }
  if (S.unbuilt || (S.ch > STORY_BUILT && S.ch <= 5)) { careerHub(); toast((S.ch <= 5 ? 'Chapter ' + S.ch : 'Life after the story') + ' arrives in the next update, in sha Allah.', 3.5); return; }
  if (Game.menus) Game.menus.hub = null;
  saveCareer();
  if (S.part) {                                                                  // a scene played inside another walk (C1.3 in C1.2)
    if (C.story.seen[S.id]) { storyGo(S.next); return storyRun(); }
    storyGo(S.part); return storyRun();
  }
  switch (S.kind) {
    case 'scene': return storyPlayScene(S);
    case 'walk': case 'drill': return S.musalla ? storyMusallaStart(S) : storyWalkStart(S);
    case 'play': return storyPlayStart(S);
    case 'choice': return storyChoiceStart(S);
  }
}
function storyLinesOf(S, key = 'lines') { const L = S[key]; return (typeof L === 'function' ? L() : L || []).slice(); }
function storyPlayScene(S) {
  if (S.custom === 'salams') return storySalams(S);
  if (S.salah && Game.salahFor !== S.id) { Game.salahFor = S.id; return storySalah(S, () => storyPlayScene(S)); }   // the prayer first (C2.3)
  Game.salahFor = null;
  if (S.talk || S.lines) return storyTalkStart(S);              // a scene is a talk: in its place, or on the gym floor (story-walk.js)
  const lines = storyLinesOf(S);
  playStory(lines, () => storyDone(S, 'next'), storyTitleOf(S));
  if (Game.story) { Game.story.bg = S.bg || null; Game.story.sid = S.id; }
  storyTagJournal(S);
}
// move on from a finished scene along its outcome ('next', 'win', 'loss', 'out')
function storyDone(S, outcome = 'next') {
  const st = C.story;
  st.seen[S.id] = (st.seen[S.id] || 0) + 1;
  let next = outcome === 'win' ? S.win : outcome === 'loss' ? S.loss : outcome === 'out' ? S.out : S.next;
  if (typeof next === 'function') next = next(outcome);
  if (!next) next = S.next;
  storyGo(next);
  if (S.hub || !SC[next] || (SC[next].ch > STORY_BUILT && SC[next].ch <= 5)) careerHub(); else storyRun();
}
function storyGo(id) {
  const st = C.story, N = SC[id];
  st.at = id;
  if (N && N.checkpoint) st.cp = id;
  saveCareer();
}

// ---------------------------------------------------------------- the Journal: every scene, by ID
function storyJournal(S, lines) {
  const J = C.journal || (C.journal = []);
  J.push({ id: S.id, s: C.season || 1, st: C.stage, g: C.gamesPlayed || 0, title: storyTitleOf(S), lines: lines.filter(l => l[0] !== 'choice').slice(0, 14) });
  if (J.length > 120) J.shift();
}
function storyTagJournal(S) { const J = C.journal || []; const e = J[J.length - 1]; if (e && !e.id) e.id = S.id; }
{
  const _ps = playStory;                        // the Journal keeps more scenes now (a whole story); a scene with no lines just moves on
  playStory = function (lines, then) { lines = (lines || []).filter(l => Array.isArray(l)); if (!lines.length) { if (then) then(); return; } const a = Array.from(arguments); a[0] = lines; const r = _ps.apply(this, a); const J = C && C.journal; if (J && J.length > 120) J.splice(0, J.length - 120); return r; };
}

// ---------------------------------------------------------------- C0.1: the closing salams on black
// Text only: "As-salamu alaykum wa rahmatullah" to the right, then to the left. The prayer itself is never shown.
const SALAMS_T = { a0: 0.6, a1: 3.0, b0: 3.5, b1: 5.9, end: 6.8 };
function storySalams(S, then) { Game.salams = { t: 0, S, then }; Game.screen = 'ssalams'; if (!then) storyJournal(S, storyLinesOf(S)); }
function salamsNext() { const s = Game.salams; if (!s) return; Game.salams = null; if (s.then) s.then(); else storyDone(s.S, 'next'); }
// a prayer in the story: the rows lining up in the musalla, then the closing salams as text. The prayer itself is not shown.
function storySalah(S, then) {
  playStory([['narr', 'Maghrib. The iqamah is called, and the brothers line up, shoulder to shoulder, feet to feet.']], () => storySalams(S, then), storyTitleOf(S));
  if (Game.story) { Game.story.bg = 'rows'; Game.story.sid = S.id; }
}
function drawSalams(g) {
  const s = Game.salams; if (!s) return;
  g.fillStyle = '#000'; g.fillRect(-400, -400, W + 800, H + 800);
  const T = SALAMS_T, fade = (t, a, b) => clamp(Math.min((t - a) / 0.6, (b - t) / 0.6), 0, 1);
  const one = (x, a, b, align) => {
    const k = fade(s.t, a, b); if (k <= 0) return;
    g.save(); g.globalAlpha = k; g.textAlign = align;
    g.fillStyle = '#f5d98a'; g.font = `34px ${AR_FONT}`; g.fillText('السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ', x, H / 2 - 8);
    g.fillStyle = IVORY; g.font = `18px ${BODY}`; g.fillText('As-salamu alaykum wa rahmatullah', x, H / 2 + 30);
    g.restore();
  };
  one(W - 120, T.a0, T.a1, 'right');
  one(120, T.b0, T.b1, 'left');
  const out = clamp((s.t - T.b1) / 0.9, 0, 1);
  if (out > 0) { g.fillStyle = `rgba(0,0,0,${out})`; g.fillRect(0, 0, W, H); }
  g.textAlign = 'right'; g.fillStyle = 'rgba(159,179,200,0.45)'; g.font = `11px ${BODY}`; g.fillText(Input.touchMode ? 'Tap to continue' : 'Enter to continue', W - 24, H - 14);
  addRect(0, 0, W, H, () => { if (s.t > 0.8) salamsNext(); });
}

// ---------------------------------------------------------------- C0.2: the musalla after Isha, people seated in rows
function drawStoryMusalla(g) {
  drawMusalla(g, C.up, 'visit', Game.t);
  const U = C.up, ms = upOf(U, 'musalla'), bx0 = [280, 200, 110][ms], bx1 = W - bx0, by1 = 300, R = seededRng(41);
  for (let r = 0; r < 3; r++) {
    const y = by1 + 60 + r * 52, k = (y - by1) / (H - by1), s = 0.85 + k * 1.1;
    const xl = lerp(bx0, 0, k) + 60, xr = lerp(bx1, W, k) - 60, n = 7 + r;
    for (let i = 0; i < n; i++) { if (r === 2 && i === 2) continue; drawMusalli(g, lerp(xl, xr, (i + 0.5) / n), y, s, R, true); }   // a gap in the last row: you've just stood up
  }
}
{
  const _ds = drawStory;
  drawStory = function (g) {
    const s = Game.story;
    if (s && s.bg === 'musalla') drawStoryMusalla(g);
    else if (s && s.bg === 'rows') drawMusalla(g, C.up, 'salah', Game.t);
    else if (s && s.bg === 'office') drawOfficeRoom(g, false);
    if (!storyOn() || !s) return _ds.apply(this, arguments);
    // v9.26: the lines between scenes (before and after a game, a pick) are a plain text box: no portraits
    const line = s.lines[Math.min(s.i, s.lines.length - 1)], [sp, text] = line;
    if (typeof text !== 'string' || sp === 'choice') return _ds.apply(this, arguments);   // (a choice line: the old drawer has its buttons)
    const who = stalkSpeaker(sp);
    panel(g, 40, 392, 880, 132, true);
    g.textAlign = 'left'; if (who) { g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.fillText(who, 62, 420); }
    g.fillStyle = sp === 'narr' ? IVORY : '#fff'; g.font = `${sp === 'narr' ? 'italic ' : ''}17px ${BODY}`;
    wrapTextLeft(g, text.slice(0, Math.floor(s.t * 55)), 62, who ? 450 : 432, 830, 24);
    g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'right'; g.fillText(Input.touchMode ? 'Tap to continue' : 'Enter or tap to continue, Esc to skip', 900, 512);
    addRect(0, 0, W, H, () => { if (s.t * 55 < text.length) s.t = text.length / 55; else { s.i++; s.t = 0; if (s.i >= s.lines.length) s.then(); } });
  };
  // narration: nobody stands for 'narr', and its line has no name over it
  const _sc = storyCast;
  storyCast = function (s) { return _sc.apply(this, arguments).filter(id => id !== 'narr'); };
  // characters with a kit of their own (Rayyan wears Al-Furqan's colours)
  const _da = drawActor;
  drawActor = function (g, x, y, def, T) { const a = Array.from(arguments); if (def && def.kit) a[4] = def.kit; return _da.apply(this, a); };
}

// ---------------------------------------------------------------- screens
{
  CAREER_SCREENS.add('ssalams');
  const _cu = careerUpdate;
  careerUpdate = function (rdt) {
    if (Game.screen === 'ssalams') { const s = Game.salams; if (!s) return careerHub(); s.t += rdt; if (s.t >= SALAMS_T.end || (s.t > 0.8 && (menuHit('ok') || menuHit('back')))) salamsNext(); return; }
    return _cu.apply(this, arguments);
  };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'ssalams') return drawSalams(g); return _cr.apply(this, arguments); };
  const _dsc = drawScene;
  drawScene = function (g) { if (Game.screen === 'ssalams') { g.fillStyle = '#000'; g.fillRect(-400, -400, W + 800, H + 800); return; } return _dsc.apply(this, arguments); };
}
