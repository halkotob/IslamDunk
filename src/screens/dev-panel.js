
// ================================================= v8.0: TEST PANEL (?dev=1)
// For playtesting: open the game with ?dev=1 (it sticks for the tab) and a DEV tab sits at the right
// edge (or press the ` key). Jump a career to any stage, round or season, give points, unlock
// everything for this session, set the score and clock of the game you're in, launch any mode,
// change difficulty and run the sim faster. Nothing here shows up without the flag.
const DEV = (() => {
  let on = false;
  try { const q = new URLSearchParams(location.search).get('dev'); if (q === '1') sessionStorage.setItem('islamdunk.dev', '1'); if (q === '0') sessionStorage.removeItem('islamdunk.dev'); on = sessionStorage.getItem('islamdunk.dev') === '1'; } catch (e) {}
  return { on, open: false, speed: 1, unlockAll: false, el: null, body: null, msg: '' };
})();
function devNote(m) { DEV.msg = m; toast(m); devRefresh(); }
function devCareer() {
  if (!C) { C = freshCareer(); C.name = 'Tester'; C.bracket = makeBracket(0); C.seen = Object.assign(C.seen || {}, { intro: true }); saveCareer(); }
  return C;
}
function devSetCareer(stage, wins, season) {
  devCareer(); C.season = Math.max(1, season | 0); C.stage = clamp(stage | 0, 0, 3); C.retries = 0; C.done = false;
  for (let s = 0; s < C.stage; s++) if (!C.trophies.includes(s)) C.trophies.push(s);
  C.bracket = makeBracket(C.stage); if (typeof slog === 'function') slog(C.stage);
  let n = 0; for (; n < (wins | 0); n++) { const r = recordCareerResult(true, 50, 40); if (r !== 'next') break; }
  saveCareer(); careerHub(); devNote('Career: ' + STAGES[C.stage].name + ', season ' + C.season + ', ' + n + ' win' + (n === 1 ? '' : 's') + ' in');
}
// the real post-game flow, with the result decided: start the next career game and end it at once
function devWinNext(win = true) {
  devCareer(); if (!C.bracket || C.bracket.out || C.bracket.champ) { devNote('No game to play: bracket finished'); return; }
  startCareerMatch(); M.introT = 0; devEnd(win);
}
function devEnd(win = true) {
  if (!M.teams || M.mini) return devNote('Not in a full game');
  const [a, b] = win ? [31, 24] : [24, 31]; M.teams[0].score = a; M.teams[1].score = b; Game.screen = 'play'; Game.paused = false; finishMatch();
}
function devScore(t, n) { if (!M.teams || M.mini) return devNote('Not in a full game'); M.teams[t].score = Math.max(0, M.teams[t].score + n); }
function devClock(s) { if (!M.teams || M.mini) return devNote('Not in a full game'); if (isFinite(M.clock)) M.clock = s; else devNote('Untimed format'); }
const DEV_MODES = [
  ['Quick match', () => startSelect('1p')], ['Lightning', () => { MiniMenu.kind = 'lightning'; startQuickMini(); }], ['HORSE', () => { MiniMenu.kind = 'horse'; startQuickMini(); }],
  ['Daily hot spot', () => startDaily()], ['Daily scenario', () => openScenBrief()], ['Barakah Run', () => openBarakah()],
  ['Career intro walk', () => { devCareer(); startIntroWorld(); }], ['Career hub', () => { devCareer(); careerHub(); }], ['Online lobby', () => onlineEntry()]
];
function devBuild() {
  const d = document.createElement('div'); DEV.el = d;
  d.style.cssText = 'position:fixed;top:60px;right:0;z-index:9999;font:12px/1.3 system-ui,sans-serif;color:#f6ecd2;display:flex;align-items:flex-start';
  const tab = document.createElement('button'); tab.textContent = 'DEV';
  tab.style.cssText = 'writing-mode:vertical-rl;background:#e8c35a;color:#0b1520;border:0;border-radius:8px 0 0 8px;padding:10px 5px;font-weight:700;cursor:pointer';
  tab.onclick = () => { DEV.open = !DEV.open; devRefresh(); };
  const body = document.createElement('div'); DEV.body = body;
  body.style.cssText = 'width:260px;max-height:calc(100vh - 80px);overflow:auto;background:rgba(8,16,28,.95);border:1px solid rgba(232,195,90,.5);border-right:0;padding:8px 10px;display:none';
  d.append(tab, body); document.body.appendChild(d);
  for (const ev of ['keydown', 'keyup', 'pointerdown', 'touchstart']) body.addEventListener(ev, e => e.stopPropagation());
  addEventListener('keydown', e => { if (e.code === 'Backquote') { DEV.open = !DEV.open; devRefresh(); } });
}
function devRefresh() {
  if (!DEV.el) return; const b = DEV.body; b.style.display = DEV.open ? 'block' : 'none'; if (!DEV.open) return;
  const btn = (label, fn) => { const x = document.createElement('button'); x.textContent = label; x.style.cssText = 'margin:2px 3px 2px 0;padding:4px 7px;background:#1d3346;color:#fff;border:1px solid #3d5a73;border-radius:6px;cursor:pointer;font:inherit'; x.onclick = () => { try { fn(); } catch (e) { devNote('Error: ' + e.message); } devRefresh(); }; return x; };
  const h = t => { const x = document.createElement('div'); x.textContent = t; x.style.cssText = 'color:#e8c35a;font-weight:700;margin:8px 0 3px'; return x; };
  const num = (v, w = 38) => { const x = document.createElement('input'); x.type = 'number'; x.value = v; x.style.cssText = `width:${w}px;margin-right:4px;background:#0f2030;color:#fff;border:1px solid #3d5a73;border-radius:4px;padding:2px`; return x; };
  const lab = t => { const x = document.createElement('span'); x.textContent = t + ' '; return x; };
  b.innerHTML = '';
  const where = document.createElement('div'); where.style.color = '#9fb3c8';
  where.textContent = 'v' + VERSION + '  screen: ' + Game.screen + (C ? '  career: ' + STAGES[C.stage].name + ' s' + (C.season || 1) + ' BP ' + C.bp : '  no career');
  b.append(where);
  b.append(h('Career'));
  const st = num(C ? C.stage : 0), wn = num(0), se = num(C ? C.season || 1 : 1);
  b.append(lab('Stage 0-3'), st, lab('Wins'), wn, lab('Season'), se, document.createElement('br'), btn('Jump there', () => devSetCareer(+st.value, +wn.value, +se.value)));
  b.append(btn('Win next game', () => devWinNext(true)), btn('Lose next game', () => devWinNext(false)));
  b.append(btn('+1000 BP', () => { devCareer().bp += 1000; saveCareer(); }), btn('+100 HB', () => { devCareer().hb += 100; saveCareer(); }), btn('Max stats', () => { const c = devCareer(); for (const k in c.lv) c.lv[k] = 10; saveCareer(); }));
  b.append(btn(DEV.unlockAll ? 'Unlock all: ON' : 'Unlock all (this tab)', () => { DEV.unlockAll = !DEV.unlockAll; if (DEV.unlockAll) for (const m of FUN_MODES) Unlocks[m.key] = true; }));
  b.append(h('This game'));
  b.append(btn('Us +2', () => devScore(0, 2)), btn('Them +2', () => devScore(1, 2)), btn('Clock 10s', () => devClock(10)), btn('End period', () => devClock(0.05)));
  b.append(btn('Win now', () => devEnd(true)), btn('Lose now', () => devEnd(false)));
  b.append(h('Launch'));
  for (const [l, fn] of DEV_MODES) b.append(btn(l, () => { Net.role || goTitle(); fn(); }));
  b.append(h('Play log (last ' + PLOG_MAX + ' games)'));
  b.append(btn('Download log', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(PossLog.load(), null, 1)], { type: 'application/json' })); a.download = 'islamdunk-playlog.json'; a.click(); }));
  b.append(btn('Summary', () => { const g = PossLog.load(), s = possSummary(g, (x, t) => x.human[t]); devNote(g.length + ' games, you: ' + s.ptsPerPoss + ' pts/poss, scored on ' + s.scoredOn + ', TO ' + s.turnovers + ', FG ' + s.fg); }));
  b.append(btn('Clear log', () => { try { localStorage.removeItem(PLOG_KEY); } catch (e) {} devNote('Log cleared'); }));
  b.append(h('Difficulty and speed'));
  for (const d of DIFF_ORDER) b.append(btn((SETTINGS.difficulty === d ? '● ' : '') + diffName(d), () => { SETTINGS.difficulty = d; }));
  b.append(document.createElement('br'));
  for (const s of [1, 2, 4]) b.append(btn((DEV.speed === s ? '● ' : '') + s + 'x', () => { DEV.speed = s; }));
  if (DEV.msg) { const m = document.createElement('div'); m.textContent = DEV.msg; m.style.cssText = 'color:#9dffb0;margin-top:6px'; b.append(m); }
}
if (DEV.on) {
  const _vl = venueLocked; venueLocked = function (v) { return DEV.unlockAll ? false : _vl.apply(this, arguments); };
  const _sim = sim; sim = function (rdt, h) { return _sim(rdt * DEV.speed, h); };
  const _gu = gameUpdate; let lastScr = '';
  gameUpdate = function (rdt) { if (!DEV.el && document.body) devBuild(); const r = _gu.apply(this, arguments); if (DEV.open && Game.screen !== lastScr) { lastScr = Game.screen; devRefresh(); } return r; };
}
