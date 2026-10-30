// ================================================= v9.0: CAREER CALENDAR (step 1, the foundation)
// Career mode gets an in-game calendar: a Hijri-style year of 12 months (30 and 29 days alternating,
// 354 days) with a continuous 7-day week. It is a game calendar, not the real date.
// Game days are Wednesdays and Saturdays (never a Friday or an Eid); every Friday is Jumu'ah; the two Eids
// are holidays; all of Ramadan carries an overlay. Each stage's rounds get days from buildSchedule(); a
// stage that ends (champion or out) is followed by a break of CAL_CFG.brk free days.
// The hub's Continue jumps to the next day that has something on it (and runs the pregame flow on a game
// day); Schedule › Next day steps one day at a time. Nothing here changes brackets, results, rewards or
// seeds: the calendar only decides on which day the next game is played.
// State: C.cal = { d, sched, done: { d, ...counters for today }, log: [past games] } inside the career save (sv 4).

// ---------------------------------------------------------------- model
const CAL_MONTHS = ['Muharram', 'Safar', 'Rabi’ al-Awwal', 'Rabi’ al-Thani', 'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhul-Qa’dah', 'Dhul-Hijjah'];
const CAL_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CAL_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CAL_LEN = CAL_MONTHS.map((_, i) => i % 2 ? 29 : 30);                 // 30, 29, 30, ... = 354
const CAL_YEAR = CAL_LEN.reduce((a, n) => a + n, 0);
const CAL_MSTART = CAL_LEN.map((_, i) => CAL_LEN.slice(0, i).reduce((a, n) => a + n, 0));
const CAL_WD0 = 0;                                                         // day 0 (1 Muharram, Year 1) is a Sunday
const CAL_FRIDAY = 5, CAL_RAMADAN = 8;
const CAL_HOLIDAYS = [{ m: 9, day: 1, name: 'Eid al-Fitr' }, { m: 11, day: 10, name: 'Eid al-Adha' }];
const DAY_TYPE = { GAME: 'game', JUMUAH: 'jumuah', HOLIDAY: 'holiday', EVENT: 'event', FREE: 'free' };
// Tuning. start: a new career's first day (1 Rabi' al-Awwal, Year 1). brk: free days after a stage ends.
// offs[stage]: day offsets of the five game slots (group games 1-3, semifinal, final) from the stage's first
// day; each slot moves forward to its weekday (wd: Sat, Wed, Sat, Wed, Sat; the final is always a Saturday)
// and past any Eid. A typical run (no retries) gives Local in months 3-5, State 6-8, National 9-11 (with
// Ramadan inside) and the World Ummah Cup in months 12-1.
const CAL_CFG = { start: CAL_MSTART[2], brk: 7, wd: [6, 3, 6, 3, 6],
  offs: [[2, 20, 40, 61, 79], [2, 20, 40, 61, 79], [2, 20, 40, 61, 79], [2, 13, 23, 34, 44]] };

function calDate(d) {
  const y = Math.floor(d / CAL_YEAR); let r = d - y * CAL_YEAR, m = 0;
  while (r >= CAL_LEN[m]) r -= CAL_LEN[m++];
  return { y: y + 1, m, day: r + 1, wd: calWd(d) };
}
function calDayOf(y, m, day) { return (y - 1) * CAL_YEAR + CAL_MSTART[m] + day - 1; }
function calWd(d) { return (((d + CAL_WD0) % 7) + 7) % 7; }
function calHoliday(d) { const t = calDate(d); return CAL_HOLIDAYS.find(h => h.m === t.m && h.day === t.day) || null; }
function calIsRamadan(d) { return calDate(d).m === CAL_RAMADAN; }
function calText(d, long) { const t = calDate(d); return (long ? CAL_WEEKDAYS : CAL_WD)[t.wd] + ' ' + t.day + ' ' + CAL_MONTHS[t.m]; }

// ---------------------------------------------------------------- schedule
const CAL_KEYS = { pool: ['g1', 'g2', 'g3', 'sf', 'f'], ko: ['qf', 'sf', 'f'] };
// the first day on or after t (and after `after`) that is weekday wd and not an Eid
function calSnap(t, wd, after) { let d = Math.max(t, after + 1); while (calWd(d) !== wd || calHoliday(d)) d++; return d; }
// Days for a stage's rounds, starting at day S. fmt 'pool' (group stage: 5 slots) or 'ko' (an old knockout
// bracket from a v5 save: quarterfinal, semifinal, final on the last three slots). entry: the schedule is for
// a bracket that doesn't exist yet (a re-entry after a loss, or the World Ummah Cup again).
function buildSchedule(stage, S, o = {}) {
  const fmt = o.fmt || 'pool', offs = CAL_CFG.offs[clamp(stage | 0, 0, 3)], idx = fmt === 'ko' ? [2, 3, 4] : [0, 1, 2, 3, 4];
  const base = offs[idx[0]] - offs[0]; let prev = S - 1;
  const days = idx.map(i => (prev = calSnap(S + offs[i] - base, CAL_CFG.wd[i], prev)));
  return { st: stage, season: (C && C.season) || 1, fmt, entry: !!o.entry, S, days, keys: CAL_KEYS[fmt].slice() };
}
function calSlotOf(b) { return !b ? -1 : b.fmt === 'pool' ? (b.round === 0 ? Math.min(2, b.md || 0) : b.round + 2) : b.round; }
// the slot of our next game in C.cal.sched, or -1 (no game until something else happens)
function calSlot() {
  const s = C && C.cal && C.cal.sched, b = C && C.bracket;
  if (!s || !b || C.seasonOver) return -1;
  if (b.out || b.champ) return s.entry ? 0 : -1;
  return calSlotOf(b);
}
function calGameDay() { const k = calSlot(); return k >= 0 ? C.cal.sched.days[k] : null; }
function calGameToday() { return calEnsure() && calGameDay() === C.cal.d; }
// the typical run: every stage won at the first try, from a calendar's first day
function calTypicalRun(S0 = CAL_CFG.start) {
  const out = []; let S = S0;
  for (let st = 0; st < 4; st++) { const s = buildSchedule(st, S); out.push(s); S = s.days[s.days.length - 1] + 1 + CAL_CFG.brk; }
  return out;
}

// ---------------------------------------------------------------- state
function calEnsure() {
  if (!C) return null;
  if (!C.cal || typeof C.cal.d !== 'number') calInit();
  calCheck();
  return C.cal;
}
function calInit() {
  const fresh = !(C.gamesPlayed > 0) && !(C.stage > 0) && !((C.season || 1) > 1) && !C.done && !C.seasonOver && !(C.bracket && (C.bracket.out || C.bracket.champ));
  if (fresh) { const S = CAL_CFG.start; C.cal = { d: S, sched: buildSchedule(0, S), done: { d: S }, log: [] }; }
  else calMigrate();
  if (C.sv < 4) C.sv = 4;
}
// A save from before v9.0: the calendar starts at the beginning of the current stage's window (the typical
// run, in the year of the save's season); games already played in this bracket get their days in the past.
function calMigrate() {
  const st = clamp(C.stage | 0, 0, 3), year0 = ((C.season || 1) - 1) * CAL_YEAR, run = calTypicalRun(year0 + CAL_CFG.start), win = run[st];
  const cal = C.cal = { d: win.S, sched: null, done: { d: win.S }, log: [] }, b = C.bracket;
  const lastOf = s => s.days[s.days.length - 1];
  if (C.seasonOver) { cal.d = lastOf(run[clamp(C.seasonOver.st | 0, 0, 3)]) + 1; }
  else if (!b) { cal.sched = win; }
  else if (b.champ || C.done) { cal.d = lastOf(win) + 1; cal.sched = buildSchedule(st, cal.d + CAL_CFG.brk, { entry: true }); }
  else {
    const fmt = b.fmt === 'pool' ? 'pool' : 'ko', s = fmt === 'pool' ? win : buildSchedule(st, win.S, { fmt: 'ko' });
    const played = calPlayedSlots(b);                                       // our finished games in this bracket, by slot
    for (const [k, m] of played) { const opp = teamOf(st, m.a === 0 ? m.b : m.a), us = m.a === 0 ? m.sa : m.sb, th = m.a === 0 ? m.sb : m.sa;
      cal.log.push(calLogEntry(s.days[k], st, calKeyLabel(fmt, k), opp, m.w === 0, us, th)); }
    if (b.out) { const last = played.length ? s.days[played[played.length - 1][0]] : win.S; cal.d = last + 1; cal.sched = buildSchedule(st, cal.d + CAL_CFG.brk, { entry: true }); }
    else { const k = calSlotOf(b); cal.sched = s; cal.d = k > 0 ? s.days[k - 1] + 1 : s.S; }
  }
  cal.done = { d: cal.d };
}
function calPlayedSlots(b) {
  const out = [], ours = m => m && (m.a === 0 || m.b === 0) && m.w != null;
  if (b.fmt === 'pool') {
    for (const m of (b.pg && b.pg[0]) || []) if (ours(m)) out.push([m.md, m]);
    (b.rounds || []).forEach((r, i) => { const m = r && r.find(ours); if (m) out.push([3 + i, m]); });
  } else (b.rounds || []).forEach((r, i) => { const m = r && r.find(ours); if (m) out.push([i, m]); });
  return out.sort((x, y) => x[0] - y[0]);
}
// keep the schedule in step with the bracket (the dev panel, review mode or an odd save can move the stage)
function calCheck() {
  const cal = C.cal, b = C.bracket;
  if (!Array.isArray(cal.log)) cal.log = [];
  if (!cal.done || typeof cal.done !== 'object') cal.done = { d: cal.d };
  if (C.seasonOver || !b) return;
  const s = cal.sched, k = calSlot(), fmt = b.fmt === 'pool' ? 'pool' : 'ko';
  const pending = b.out || b.champ;
  const ok = s && s.st === C.stage && (s.season || 1) === (C.season || 1) && (pending ? s.entry : (s.entry || s.fmt === fmt)) && k >= 0 && k < s.days.length && s.days[k] >= cal.d;
  if (ok) return;
  if (pending) { cal.sched = buildSchedule(C.stage, cal.d + 1, { entry: true }); return; }
  const kk = calSlotOf(b), offs = CAL_CFG.offs[clamp(C.stage, 0, 3)], idx = fmt === 'ko' ? [2, 3, 4] : [0, 1, 2, 3, 4];
  cal.sched = buildSchedule(C.stage, cal.d - (offs[idx[kk]] - (offs[idx[0]] - offs[0])), { fmt });   // anchored: our next game's target is today (moved to its weekday)
}
function calSetDay(n) {
  const cal = calEnsure(); if (!cal || n <= cal.d) return;                // the date only moves forward
  cal.d = n; cal.done = { d: n };
}
function calCount(k, n = 1) { const cal = C && C.cal; if (!cal) return; if (!cal.done || cal.done.d !== cal.d) cal.done = { d: cal.d }; cal.done[k] = (cal.done[k] || 0) + n; }
function calLogEntry(d, st, r, opp, won, us, th) {
  return { d, s: (C && C.season) || 1, st, r, o: { n: opp.name, sh: opp.short, c1: opp.c1, c2: opp.c2, crest: opp.crest }, w: won ? 1 : 0, us, th };
}

// ---------------------------------------------------------------- days
// One day: { d, type, overlay, games[], events[] } (+ holiday name, fri). events[] is empty in this step.
function calDay(d) {
  const cal = C.cal, D = { d, type: DAY_TYPE.FREE, overlay: calIsRamadan(d) ? 'ramadan' : null, games: [], events: [], holiday: null, fri: calWd(d) === CAL_FRIDAY };
  for (const L of cal.log) if (L.d === d) D.games.push(Object.assign({ past: true }, L));
  const s = cal.sched, k = calSlot();
  if (s && k >= 0) s.days.forEach((x, i) => { if (x === d && i >= k) D.games.push({ slot: i, key: s.keys[i], next: i === k }); });
  const h = calHoliday(d); if (h) D.holiday = h.name;
  D.type = D.games.length ? DAY_TYPE.GAME : h ? DAY_TYPE.HOLIDAY : D.fri ? DAY_TYPE.JUMUAH : D.events.length ? DAY_TYPE.EVENT : DAY_TYPE.FREE;
  return D;
}
function calNextStop(from) { for (let d = from + 1; d <= from + 400; d++) if (calDay(d).type !== DAY_TYPE.FREE) return d; return from + 1; }
// the opponent of an upcoming slot, when the bracket already knows it
function calSlotOpp(i) {
  const b = C.bracket, k = calSlot(), s = C.cal.sched; if (!b || k < 0 || !s || s.entry && (b.out || b.champ)) return null;
  let m = null;
  if (i === k) m = ourMatch();
  else if (b.fmt === 'pool' && b.round === 0 && i < 3) m = b.pg[0].find(x => x.md === i && (x.a === 0 || x.b === 0));
  return m ? teamOf(C.stage, m.a === 0 ? m.b : m.a) : null;
}
function calKeyLabel(fmt, i) { return fmt === 'ko' ? ROUND_NAMES[i] || '' : i < 3 ? 'Group game ' + (i + 1) : i === 3 ? 'Semifinal' : 'Final'; }
function calSlotLabel(i) { const s = C.cal.sched; return s ? calKeyLabel(s.fmt, i) : ''; }

// ---------------------------------------------------------------- Continue and Next day
function calShown() { return SETTINGS.calendar !== false; }
function calPlay() { hubSelect(0); }                                     // the existing pregame flow (stage intro, scout, pregame)
function calContinue() {
  if (!calEnsure()) return;
  if (C.seasonOver) { hubSelect(0); return; }
  if (calGameToday()) { calPlay(); return; }
  calSetDay(calNextStop(C.cal.d)); saveCareer();
  if (calGameToday()) calPlay(); else SFX.blip();
}
function calNextDay() {
  if (!calEnsure()) return;
  if (calGameToday()) { calPlay(); return; }                             // games are never skipped or simulated
  calSetDay(C.cal.d + 1); saveCareer();
  if (calGameToday()) calPlay(); else SFX.blip();
}
// v9.12: Continue says where it goes ("Continue to Fri · Jumu’ah")
function calContinueLabel() {
  if (!calEnsure() || C.seasonOver) return 'Continue';
  if (calGameToday()) return 'Continue to today’s game';
  const d = calNextStop(C.cal.d), D = calDay(d), what = D.type === 'game' ? 'game day' : D.type === 'holiday' ? 'Eid' : D.type === 'jumuah' ? 'Jumu’ah' : '';
  return 'Continue to ' + CAL_WD[calDate(d).wd] + (what ? ' · ' + what : '');
}

// ---------------------------------------------------------------- hooks
{
  const _fc = freshCareer;
  freshCareer = function () { const c = _fc.apply(this, arguments); c.sv = 4; c.cal = null; return c; };
  const _lc = loadCareer;
  loadCareer = function (key) {
    const ok = _lc.apply(this, arguments); if (!ok) return ok;
    const o = readSave(key) || {};
    if (!o.cal || typeof o.cal.d !== 'number') C.cal = null;                // pre-9.0 save: built from the bracket below
    calEnsure(); C.sv = Math.max(C.sv || 0, 4);
    return ok;
  };
  // the game flow (Continue on a game day, or "Play next game" with the calendar off): the date moves to the game's day
  const _hs = hubSelect;
  hubSelect = function (i) {
    if (i === 0 && C && !C.seasonOver && calEnsure()) { const gd = calGameDay(); if (gd != null && gd > C.cal.d) calSetDay(gd); }
    const r = _hs.apply(this, arguments);
    const s = C && C.cal && C.cal.sched;
    if (i === 0 && s && s.entry && C.bracket && !C.bracket.out && !C.bracket.champ) s.entry = false;   // the re-entry bracket now exists
    return r;
  };
  // after a game: log it, move to the next day, and give the next stage (or the re-entry) its days after a break
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    calEnsure();
    const gd = C.cal.d, st = M.careerStage, opp = (M.teamDefs && M.teamDefs[1]) || teamOf(st, M.careerOpp), rl = roundLabel(C.bracket);
    _cam.apply(this, arguments);
    const p = Game.post || {}, cal = C.cal;
    cal.log.push(calLogEntry(gd, st, rl, opp, M.winner === 0, M.teams[0].score, M.teams[1].score));
    if (cal.log.length > 400) cal.log.splice(0, cal.log.length - 400);
    if (C.seasonOver) cal.sched = null;
    else if (p.res === 'champ' || p.res === 'out') cal.sched = buildSchedule(C.stage, gd + 1 + CAL_CFG.brk, { entry: p.res === 'out' || !!C.done });
    calSetDay(gd + 1);
    saveCareer();
  };
  const _sns = startNewSeason;
  startNewSeason = function () {
    calEnsure(); const last = C.cal.log.length ? C.cal.log[C.cal.log.length - 1].d : C.cal.d;
    const r = _sns.apply(this, arguments);
    C.cal.sched = buildSchedule(0, Math.max(C.cal.d + 1, last + 1 + CAL_CFG.brk));
    saveCareer();
    return r;
  };
  // the hub: Continue (default focus) and Schedule › Calendar / Bracket / Next day
  const _he = hubExtra;
  hubExtra = function (items) {
    const R = _he.apply(this, arguments);
    if (!C || !calShown() || !calEnsure()) return R;
    const fl = hubFirstLabel(), i = R.findIndex(e => e.label === fl && !e.sub);
    if (i >= 0 && !C.seasonOver) R[i] = { label: calContinueLabel(), act: calContinue, cont: true };   // (the label says where it goes: no badge)
    const bi = R.findIndex(e => e.label === 'Bracket' && !e.sub);
    if (bi >= 0) R[bi] = { label: 'Schedule', sub: [{ label: 'Calendar', act: openCalendar }, { label: 'Bracket', act: R[bi].act },
      { label: calGameToday() ? 'Play today’s game' : 'Next day', act: calNextDay }] };
    return R;
  };
  const _ch = careerHub;
  careerHub = function () { if (C) calEnsure(); return _ch.apply(this, arguments); };
  const _dh = drawHub;
  drawHub = function (g) { _dh.apply(this, arguments); if (calShown() && calEnsure()) drawCalStrip(g); };
  // "activities done today" (unlimited in this step; recorded so a later step can limit them)
  const _bs = buyStat;
  const lvSum = () => C && C.lv ? Object.values(C.lv).reduce((a, n) => a + (+n || 0), 0) : 0;
  buyStat = function (i) { const l0 = lvSum(); const r = _bs.apply(this, arguments); if (C && lvSum() > l0) calCount('levels'); return r; };
  const _bp = buyProject;
  buyProject = function () { const hb = C && C.hb; const r = _bp.apply(this, arguments); if (C && C.hb < hb) calCount('projects'); return r; };
  const _fd = finishDrill;
  finishDrill = function () { const had = !!Gym.drill; const r = _fd.apply(this, arguments); if (had && C) calCount('drills'); return r; };
}
const CAL_ACTS = { gym: 'gym', train: 'train', shop: 'shop', masjid: 'masjid', office: 'office', musalla: 'musalla' };
let calPrevScreen = null;

// ---------------------------------------------------------------- the strip on the hub
const CalUI = { n: 0 };
const CAL_TINT = 'rgba(64,48,128,0.92)', CAL_TINT_LINE = 'rgba(178,160,255,0.55)';
function drawCalIcon(g, D, x, y, r, onGold) {
  if (D.type === 'game') {
    const G = D.games[0], t = G.past ? G.o : calSlotOpp(G.slot);
    if (t) drawCrest(g, x, y, r, t); else calBall(g, x, y, r);
  } else if (D.type === 'holiday') { g.fillStyle = GOLD; star8(g, x, y, r * 1.05); g.fill(); g.strokeStyle = 'rgba(42,26,4,0.5)'; g.lineWidth = 1; g.stroke(); }
  else if (D.type === 'jumuah') calMosque(g, x, y, r, onGold ? '#1f6b45' : '#9dffb0');
}
function calBall(g, x, y, r) {
  g.save(); g.fillStyle = '#e07b2a'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(30,14,4,0.75)'; g.lineWidth = Math.max(1, r * 0.11);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
  g.beginPath(); g.ellipse(x - r * 0.95, y, r * 0.55, r * 0.9, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.beginPath(); g.ellipse(x + r * 0.95, y, r * 0.55, r * 0.9, 0, Math.PI / 2, Math.PI * 1.5); g.stroke(); g.restore();
}
function calMosque(g, x, y, r, col = '#9dffb0') {                                          // a small dome and minaret on a base
  g.save(); g.fillStyle = col;
  const b = y + r * 0.85, k = r / 12;
  g.fillRect(x - 9 * k, b - 7 * k, 18 * k, 7 * k);                        // hall
  g.beginPath(); g.arc(x, b - 7 * k, 7 * k, Math.PI, 0); g.fill();       // dome
  g.fillRect(x - 0.6 * k, b - 17.5 * k, 1.2 * k, 3.5 * k);                // finial
  g.fillRect(x + 10 * k, b - 15 * k, 3 * k, 15 * k);                      // minaret
  g.beginPath(); g.moveTo(x + 9.5 * k, b - 15 * k); g.lineTo(x + 11.5 * k, b - 19 * k); g.lineTo(x + 13.5 * k, b - 15 * k); g.fill();
  g.restore();
}
// today and the next three days, top right of the hub; tap to open the month view
// desktop: clear of the title, its subtitle and the SEASON label; phones (larger minimum text) get wider chips and a
// shorter subtitle (calHubSubtitle)
const CAL_STRIP = { x: 412, y: 12, w: 116, h: 60, gap: 6 }, CAL_STRIP_TT = { x: 382, y: 12, w: 124, h: 60, gap: 6 };
function calStripGeom(g) { return Input.touchMode && (!g || g === ctx) ? CAL_STRIP_TT : CAL_STRIP; }
function calHubSubtitle(S) { return (C.season || 1) > 1 ? S.name + ' stage \u2022 Season ' + C.season : S.title; }
function drawCalStrip(g) {
  const S = calStripGeom(g), d0 = C.cal.d; let n = 0;
  for (let i = 0; i < 4; i++) {
    const D = calDay(d0 + i), t = calDate(D.d), x = S.x + i * (S.w + S.gap), y = S.y, today = i === 0, ram = D.overlay === 'ramadan';
    if (today) goldPill(g, x, y, S.w, S.h, 10, false, true);
    else { g.fillStyle = ram ? CAL_TINT : 'rgba(8,16,24,0.86)'; roundRect(g, x, y, S.w, S.h, 10); g.fill(); g.strokeStyle = D.type === 'holiday' ? GOLD : ram ? CAL_TINT_LINE : 'rgba(255,255,255,0.14)'; g.lineWidth = D.type === 'holiday' ? 1.5 : 1; g.stroke(); }
    if (today && ram) { g.strokeStyle = CAL_TINT; g.lineWidth = 2; roundRect(g, x + 1, y + 1, S.w - 2, S.h - 2, 9); g.stroke(); }
    const ink = today ? NIGHT : '#fff', sub = today ? '#3a2a0a' : ram ? '#d9d0ff' : '#9fb3c8';
    g.textAlign = 'left'; g.fillStyle = ink; g.font = `14px ${FONT}`; g.fillText(CAL_WD[t.wd] + ' ' + t.day, x + 9, y + 23);
    if (ram) {                                                          // Ramadan: the month line is a tag
      g.font = `9px ${FONT}`; const tw = g.measureText('RAMADAN').width + 10;
      g.fillStyle = today ? CAL_TINT : 'rgba(178,160,255,0.28)'; roundRect(g, x + 7, y + 33, Math.min(S.w - 14, tw), 18, 9); g.fill();
      g.fillStyle = today ? '#fff' : '#e8e2ff'; g.textAlign = 'center'; g.fillText('RAMADAN', x + 7 + Math.min(S.w - 14, tw) / 2, y + 46);
    } else { g.fillStyle = sub; g.font = `12px ${BODY}`; g.fillText(fitText(g, calMonthName(t.m, g, S.w - 18), S.w - 18), x + 9, y + 46); }
    drawCalIcon(g, D, x + S.w - 18, y + 19, 10, today);
    n++;
  }
  CalUI.n = n;
  addRect(S.x, S.y, 4 * S.w + 3 * S.gap, S.h, openCalendar);
}
// full month name, or a shorter form where the full one doesn't fit (phones)
const CAL_MONTHS_SHORT = ['Muharram', 'Safar', 'Rabi’ I', 'Rabi’ II', 'Jumada I', 'Jumada II', 'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhul-Qa’da', 'Dhul-Hijja'];
function calMonthName(m, g, w) { return g && g.measureText(CAL_MONTHS[m]).width > w ? CAL_MONTHS_SHORT[m] : CAL_MONTHS[m]; }

// ---------------------------------------------------------------- the month view
function openCalendar() { if (!calEnsure()) return; Game.calView = { sel: C.cal.d }; Game.screen = 'ccal'; SFX.blip(); }
function calViewMove(n) {
  const V = Game.calView, lo = Math.max(0, C.cal.d - 3 * CAL_YEAR), hi = C.cal.d + 2 * CAL_YEAR, to = clamp(V.sel + n, lo, hi);
  if (to !== V.sel) { V.sel = to; SFX.blip(); }
}
function calViewMonth(k) {
  const V = Game.calView, t = calDate(V.sel); let y = t.y, m = t.m + k;
  if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
  if (y < 1) return;
  calViewMove(calDayOf(y, m, Math.min(t.day, CAL_LEN[m])) - V.sel);
}
function calViewUpdate() {
  if (!Game.calView) Game.calView = { sel: C.cal.d };
  if (menuHit('left')) calViewMove(-1);
  if (menuHit('right')) calViewMove(1);
  if (menuHit('up')) calViewMove(-7);
  if (menuHit('down')) calViewMove(7);
  if (Input.pressed.KeyQ || Input.pressed.PageUp) calViewMonth(-1);
  if (Input.pressed.KeyE || Input.pressed.PageDown || Input.pressed.Tab) calViewMonth(1);
  if (menuHit('back') || menuHit('ok')) careerHub();
}
const CALG = { x: 30, y: 104, cw: 88, ch: 64, side: 668 };
function drawCalMonth(g) {
  if (!calEnsure()) return; if (!Game.calView) Game.calView = { sel: C.cal.d };
  const V = Game.calView, t = calDate(V.sel), m0 = calDayOf(t.y, t.m, 1), n = CAL_LEN[t.m], lead = calWd(m0), rows = Math.ceil((lead + n) / 7);
  const TT = Input.touchMode && g === ctx, G = CALG, gw = 7 * G.cw, cx = G.x + gw / 2;
  // header: ‹ month, year › (the arrows sit beside the title, clear of the screen's Back button top left)
  const title = CAL_MONTHS[t.m] + ', Year ' + t.y;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `26px ${FONT}`; g.fillText(title, cx, 50);
  const tw = g.measureText(title).width;
  const arrow = (x, txt, k) => {
    const hov = hovering(x, 20, 48, 40), pr = pressing(x, 20, 48, 40);
    if (hov || pr) goldPill(g, x, 20, 48, 40, 20, pr); else glassPill(g, x, 20, 48, 40, 20, 0.4);
    g.textAlign = 'center'; g.fillStyle = hov || pr ? NIGHT : '#fff'; g.font = `22px ${FONT}`; g.fillText(txt, x + 24, 47); addRect(x, 20, 48, 40, () => calViewMonth(k));
  };
  arrow(Math.round(cx - tw / 2 - 64), '‹', -1); arrow(Math.round(cx + tw / 2 + 16), '›', 1);
  panel(g, G.x - 8, G.y - 36, gw + 16, rows * G.ch + 46, false);
  g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`;
  CAL_WD.forEach((w, i) => g.fillText(w.toUpperCase(), G.x + i * G.cw + G.cw / 2, G.y - 12));
  for (let k = 0; k < n; k++) {
    const d = m0 + k, D = calDay(d), c = (lead + k) % 7, r = Math.floor((lead + k) / 7), x = G.x + c * G.cw + 2, y = G.y + r * G.ch + 2, w = G.cw - 4, h = G.ch - 4;
    const ram = D.overlay === 'ramadan', today = d === C.cal.d, sel = d === V.sel;
    g.fillStyle = ram ? CAL_TINT : D.type === 'holiday' ? 'rgba(232,195,90,0.14)' : 'rgba(255,255,255,0.06)'; roundRect(g, x, y, w, h, 8); g.fill();
    if (today) { g.strokeStyle = GOLD; g.lineWidth = 2.5; roundRect(g, x + 1, y + 1, w - 2, h - 2, 7); g.stroke(); }
    else if (sel) { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5; roundRect(g, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 7.5); g.stroke(); }
    else if (D.type === 'holiday') { g.strokeStyle = 'rgba(232,195,90,0.7)'; g.lineWidth = 1; roundRect(g, x + 0.5, y + 0.5, w - 1, h - 1, 7.5); g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = today ? GOLD : d < C.cal.d ? '#8494a8' : '#fff'; g.font = `14px ${FONT}`; g.fillText(String(k + 1), x + 8, y + 20);
    if (D.type !== 'free') drawCalIcon(g, D, x + w - 20, y + h - 20, 12);
    const G0 = D.games[0];
    if (G0 && G0.past) {                                                  // a result: W / L
      g.font = `11px ${FONT}`; const L = G0.w ? 'W' : 'L', bw = Math.max(22, Math.ceil(g.measureText(L).width) + 12), bh = Math.max(18, phoneEffPx(g) + 4);
      g.fillStyle = G0.w ? '#2f9e5a' : '#b5473d'; roundRect(g, x + 7, y + h - 7 - bh, bw, bh, bh / 2); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L, x + 7 + bw / 2, y + h - 7 - bh / 2 + 1); g.textBaseline = 'alphabetic';
    }
    addRect(x, y, w, h, () => { V.sel = d; SFX.blip(); });
  }
  // right column: the chosen day, the legend, Back
  const sx = G.side, sw = 262;
  const dh = TT ? 210 : 236, ky = 22 + dh + 12, kh = Math.min(444 - ky, 172);
  panel(g, sx, 22, sw, dh, true);
  drawCalDetail(g, calDay(V.sel), sx + 16, sw - 32, TT);
  panel(g, sx, ky, sw, kh, false);
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`; g.fillText('KEY', sx + 16, ky + 24);
  const leg = [['game', 'Game'], ['res', 'Result'], ['jumuah', 'Jumu’ah'], ['holiday', 'Eid'], ['ramadan', 'Ramadan'], ['today', 'Today']];
  leg.forEach(([k, label], i) => {
    const lx = sx + 16 + (i % 2) * (TT ? 130 : 124), ly = ky + 48 + Math.floor(i / 2) * 40, ix = lx + 13, iy = ly + 6;
    if (k === 'game') calBall(g, ix, iy, 10);
    else if (k === 'res') { g.font = `11px ${FONT}`; const bw = Math.max(22, Math.ceil(g.measureText('W').width) + 12), bh = Math.max(18, phoneEffPx(g) + 4);
      g.fillStyle = '#2f9e5a'; roundRect(g, ix - bw / 2, iy - bh / 2, bw, bh, bh / 2); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('W', ix, iy + 1); g.textBaseline = 'alphabetic'; }
    else if (k === 'jumuah') calMosque(g, ix, iy, 11);
    else if (k === 'holiday') { g.fillStyle = GOLD; star8(g, ix, iy, 10); g.fill(); }
    else if (k === 'ramadan') { g.fillStyle = CAL_TINT; roundRect(g, ix - 11, iy - 9, 22, 18, 5); g.fill(); g.strokeStyle = CAL_TINT_LINE; g.lineWidth = 1; g.stroke(); }
    else { g.strokeStyle = GOLD; g.lineWidth = 2.5; roundRect(g, ix - 10, iy - 9, 20, 18, 5); g.stroke(); }
    g.textAlign = 'left'; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(label, lx + (TT ? 36 : 32), ly + 11);
  });
  const by = 456, bw = 184, bx = sx + (sw - bw) / 2, hov = hovering(bx, by, bw, 42), pr = pressing(bx, by, bw, 42);
  goldPill(g, bx, by, bw, 42, 21, pr); g.textAlign = 'center'; g.fillStyle = NIGHT; g.font = `17px ${FONT}`; g.fillText('Back', bx + bw / 2, by + 27);
  addRect(bx, by, bw, 42, careerHub);
  if (!TT) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('Arrows: day   Q E: month   Esc: back', bx + bw / 2, 522); }
}
function drawCalDetail(g, D, x, w, TT) {
  const t = calDate(D.d), lines = [];
  g.textAlign = 'left'; g.fillStyle = '#9fb3c8'; g.font = `12px ${FONT}`;
  g.fillText(D.d === C.cal.d ? 'TODAY' : D.d < C.cal.d ? 'PAST' : 'COMING UP', x, 48);
  g.fillStyle = '#fff'; g.font = `17px ${FONT}`; g.fillText(fitText(g, CAL_WD[t.wd] + ' ' + t.day + ' ' + CAL_MONTHS[t.m], w), x, 76);
  const G0 = D.games[0];
  if (G0 && G0.past) { lines.push([STAGES[G0.st].name + ' • ' + G0.r, '#9fb3c8'], ['vs ' + G0.o.n, '#fff'], [(G0.w ? 'Won ' : 'Lost ') + G0.us + '–' + G0.th, G0.w ? '#9dffb0' : '#ffb0a0']); }
  else if (G0) { const o = calSlotOpp(G0.slot); lines.push([STAGES[C.stage].name + ' • ' + calSlotLabel(G0.slot), '#9fb3c8'], [o ? 'vs ' + o.name : 'Opponent to be decided', o ? '#fff' : '#9fb3c8']); if (D.overlay === 'ramadan') lines.push(['After Taraweeh', '#d9d0ff']); }
  else if (D.type === 'holiday') lines.push([D.holiday, GOLD]);
  else if (D.type === 'jumuah') lines.push(['Jumu’ah', '#9dffb0']);
  else { const s = C.cal.sched, brk = s && C.cal.log.length && !C.seasonOver && D.d < s.days[0] && D.d >= s.S - CAL_CFG.brk;
    lines.push([brk ? 'Break before the ' + STAGES[s.st].name + ' stage' : 'No game', '#9fb3c8']); }
  if (D.overlay === 'ramadan' && !(G0 && !G0.past)) lines.push(['Ramadan', '#d9d0ff']);
  if (D.type === 'holiday' && D.fri) lines.push(['Jumu’ah', '#9dffb0']);
  lines.slice(0, 4).forEach(([s, col], i) => { g.fillStyle = col; g.font = `${i === 1 && G0 ? 15 : 14}px ${i === 1 && G0 ? FONT : BODY}`; g.fillText(fitText(g, s, w), x, 110 + i * (TT ? 34 : 30)); });
  if (D.type !== 'free') { const r = 22, cy = TT ? 182 : 216; drawCalIcon(g, D, x + w - r, cy, r); }
}

// ---------------------------------------------------------------- screen glue, setting, counters
CAREER_SCREENS.add('ccal');
{
  const _cu = careerUpdate;
  careerUpdate = function (rdt) { if (Game.screen === 'ccal') return calViewUpdate(); return _cu.apply(this, arguments); };
  const _cr = careerRender;
  careerRender = function (g) { if (Game.screen === 'ccal') { dim(g, 0.86); drawCalMonth(g); return; } return _cr.apply(this, arguments); };
  BACK.ccal = () => careerHub();
  const _gu = gameUpdate;
  gameUpdate = function (rdt) {
    const r = _gu.apply(this, arguments);
    if (Game.screen !== calPrevScreen) { const k = CAL_ACTS[Game.screen]; if (k && C && C.cal && CAREER_SCREENS.has(Game.screen)) calCount(k); calPrevScreen = Game.screen; }
    return r;
  };
}
SETTINGS.calendar = true;
(() => { try { if (localStorage.getItem('islamdunk.calendar') === '0') SETTINGS.calendar = false; } catch (e) {} })();
{
  // Settings → Game → Career calendar (Off: the hub as before, no dates; the date still moves with each game)
  const gi = SET_ITEMS.findIndex(s => s.label === 'Team control');
  SET_ITEMS.splice(gi >= 0 ? gi + 1 : SET_ITEMS.length - 1, 0, { label: 'Career calendar', get: () => SETTINGS.calendar ? 'On' : 'Off',
    step: () => { SETTINGS.calendar = !SETTINGS.calendar; try { localStorage.setItem('islamdunk.calendar', SETTINGS.calendar ? '1' : '0'); } catch (e) {} if (Game.menus) Game.menus.hub = null; } });
  if (SET_GROUPS[0].labels && !SET_GROUPS[0].labels.includes('Career calendar')) SET_GROUPS[0].labels.push('Career calendar');
}
