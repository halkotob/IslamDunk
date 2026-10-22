// ================================================= v9.3: YOUR OWN COURT, 3 ON 3 PICKS, YOUR PLAYERS IN MINI GAMES
//   * Home court → "Your own court": a team can have a court of its own. Pick the building (masjid gym, big
//     community gym or an outdoor park court), the floor, the paint color, the center logo and whether the
//     team name runs along the baselines. It is the first venue on the venue screen when the team plays
//     (Quick Play and online), and the career plays away games there when the team is in your career league.
//     It rides in team share codes and in the online venue spec, so a friend sees it as you made it.
//   * 3 on 3 (beta): after picking both teams, pick each side's third player (anyone from Teams & Players,
//     or Auto for the guest player as before).
//   * Mini games: your own players (and your career player) can be the opponent in HORSE and Around the
//     World, and an "Opponents" row mixes them into Lightning, King of the Court, 7 Up and custom games.

// ---------------------------------------------------------------- your own court
const CT_BUILD = [['M', 'Masjid gym'], ['L', 'Community gym'], ['out', 'Outdoor park']];
const CT_FLOOR = [['Honey wood', '#c98e52', '#e6b173'], ['Light maple', '#dcb27c', '#efcf9c'], ['Dark walnut', '#7a4f2a', '#9c6a3c'], ['Gray sport', '#6d737a', '#868c93'], ['Blue sport', '#2f5f8f', '#3b72a6'], ['Green sport', '#3c7a55', '#4a8d64']];
const CT_PAINT = [['Main color', 'c1'], ['Second color', 'c2'], ['Natural', 'nat'], ['Red', '#b8322d'], ['Navy', '#1f3b73'], ['Teal', '#0f7c80']];
const CT_MARK = ['Crest', 'Short name', 'Crest and name', 'Nothing'];
function ctDefault() { return { b: 0, w: 0, p: 0, m: 0, n: 1 }; }
function ctClean(c) {
  const o = Object.assign(ctDefault(), c || {}), r = (v, n) => clamp(Math.round(+v || 0), 0, n - 1);
  return { b: r(o.b, CT_BUILD.length), w: r(o.w, CT_FLOOR.length), p: r(o.p, CT_PAINT.length), m: r(o.m, CT_MARK.length), n: o.n ? 1 : 0 };
}
// the court as plain data (venue specs travel to the online guest, so everything it needs is in here)
function ctSpec(t) {
  const c = ctClean(t.court), P = CT_PAINT[c.p][1], F = CT_FLOOR[c.w];
  return { b: c.b, wood: [F[1], F[2]], sport: c.w >= 3, key: P === 'c1' ? t.c1 : P === 'c2' ? t.c2 : P === 'nat' ? 'rgba(90,50,20,0.35)' : P,
    mark: c.m, base: !!c.n, name: t.name, short: (t.short || t.name).slice(0, 6).toUpperCase(), c1: t.c1, c2: t.c2, crest: t.crest };
}
function ctVenue(T, hostSide) {
  const c = T.court, build = CT_BUILD[c.b][0], name = T.name + (build === 'out' ? ' Park Court' : build === 'L' ? ' Community Gym' : ' Gym');
  const base = build === 'out' ? { id: 'own_' + T.custom, kind: 'outdoor', backdrop: 'city', name, court: c } : { id: 'own_' + T.custom, kind: 'gym', size: build, name, court: c };
  return makeVenue(base, build === 'out' ? { backdrop: 'city', time: 'afternoon', surface: 'asphalt', host: hostSide } : { host: hostSide });
}
{
  const _td = csTeamDef;
  csTeamDef = function (t) {
    const T = _td.apply(this, arguments);
    if (t.venue === 'own') { T.court = ctSpec(t); T.home = 'own_' + t.id; }
    return T;
  };
  // editor: "Your own court" in the Home court list, then its five settings
  const _er = csEditRows;
  csEditRows = function () {
    const R = _er.apply(this, arguments), e = CSUI.edit;
    if (!e || e.kind !== 'team') return R;
    const t = e.rec, vs = ['', 'own', ...VENUE_LIST.map(v => v.id)], cyc = (arr, v, d) => arr[(Math.max(0, arr.indexOf(v)) + d + arr.length) % arr.length];
    const hi = R.findIndex(r => r.label === 'Home court');
    if (hi < 0) return R;
    R[hi] = { label: 'Home court', get: () => t.venue === 'own' ? 'Your own court' : t.venue ? (VENUE_LIST.find(v => v.id === t.venue) || {}).name || 'None' : 'None',
      step: d => { t.venue = cyc(vs, t.venue || '', d); if (t.venue === 'own') t.court = ctClean(t.court); } };
    if (t.venue === 'own') {
      const c = t.court = ctClean(t.court), st = (k, n) => d => { c[k] = (c[k] + d + n) % n; };
      R.push({ label: '  Building', get: () => CT_BUILD[c.b][1], step: st('b', CT_BUILD.length) },
        { label: '  Floor', get: () => CT_FLOOR[c.w][0], step: st('w', CT_FLOOR.length) },
        { label: '  Paint', get: () => CT_PAINT[c.p][0], step: st('p', CT_PAINT.length) },
        { label: '  Center', get: () => CT_MARK[c.m], step: st('m', CT_MARK.length) },
        { label: '  Name on baselines', get: () => c.n ? 'On' : 'Off', step: () => { c.n ^= 1; } });
    }
    return R;
  };
  // the editor preview shows the court when the team has one
  const _de = drawCSEdit;
  drawCSEdit = function (g) {
    _de.apply(this, arguments);
    const e = CSUI.edit; if (!e || e.kind !== 'team' || e.rec.venue !== 'own') return;
    const T = csTeamDef(e.rec), o = Math.round((W - 960) / 2);
    g.save(); g.translate(o, 0);
    try { const img = ctThumb(T); g.save(); roundRect(g, 638, 128, 184, 104, 8); g.clip(); g.drawImage(img, 638, 128, 184, 104); g.restore(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; roundRect(g, 638, 128, 184, 104, 8); g.stroke(); } catch (err) {}
    g.restore();
  };
  // share codes carry the court; imports keep it
  const _sc = csShareCode;
  csShareCode = function (kind, rec) {
    const code = _sc.apply(this, arguments);
    if (kind !== 'team' || rec.venue !== 'own') return code;
    const m = /ID1-[0-9a-z]{3}-(.+)$/.exec(code), o = JSON.parse(b64dec(m[1])); o.v = 'own'; o.co = ctClean(rec.court);
    const js = JSON.stringify(o); return 'ID1-' + (hash32(js) % 46656).toString(36).padStart(3, '0') + '-' + b64enc(js);
  };
  const _im = csImport;
  csImport = function (code) {
    const r = _im.apply(this, arguments);
    if (r.ok && /^Imported team/.test(r.ok)) {
      try { const m = /ID1-[0-9a-z]{3}-([A-Za-z0-9_-]+)/.exec((code || '').replace(/\s+/g, '')), o = JSON.parse(b64dec(m[1])), d = csLoad(), t = d.teams[d.teams.length - 1];
        if (o.v === 'own' && o.co) { t.venue = 'own'; t.court = ctClean(o.co); csSave(); } } catch (e) {}
    }
    return r;
  };
  // a fresh thumbnail whenever a team changes
  const _sv = csSave;
  csSave = function () { for (const k of Object.keys(_thumbs)) if (k.startsWith('own_')) delete _thumbs[k]; CT_THUMB.clear(); return _sv.apply(this, arguments); };
}
const CT_THUMB = new Map();
function ctThumb(T) {
  const key = JSON.stringify(T.court);
  if (!CT_THUMB.has(key)) CT_THUMB.set(key, venueThumb(ctVenue(T, 0), T, TEAMS[1]));
  return CT_THUMB.get(key);
}
// the floor
{
  const _bf = buildVenueFloor;
  buildVenueFloor = function (v, host, tA, tB, rs = 1) {
    const c = v && v.court; if (!c) return _bf.apply(this, arguments);
    const cw = COURT.L + 240, ch = Math.ceil(COURT.D * ZS) + 4, cv = makeCanvas(Math.ceil(cw * rs), Math.ceil(ch * rs)), g = cv.getContext('2d');
    g.scale(rs, rs); cv.rs = rs;
    const X = x => x + 120, Z = z => z * ZS, R = seededRng(hash32('floor' + v.id + c.name)), out = v.kind === 'outdoor';
    if (out) {                                            // the park: asphalt around a painted court
      g.fillStyle = '#3d4248'; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 2500; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; g.fillRect(R() * cw, R() * ch, 1.5, 1.5); }
    }
    const x0 = out ? X(0) : 0, w = out ? COURT.L : cw, z0 = out ? Z(26) : 0, h = out ? Z(648) : ch;
    const grd = g.createLinearGradient(0, z0, 0, z0 + h); grd.addColorStop(0, c.wood[0]); grd.addColorStop(1, c.wood[1]); g.fillStyle = grd; g.fillRect(x0, z0, w, h);
    if (!c.sport) for (let z = 0, i = 0; z < COURT.D; z += 16, i++) {   // planks
      if (Z(z) < z0 || Z(z) > z0 + h) continue;
      g.fillStyle = i % 3 ? 'rgba(110,60,20,0.06)' : 'rgba(255,235,200,0.06)'; g.fillRect(x0, Z(z), w, Z(16)); g.fillStyle = 'rgba(80,40,10,0.2)'; g.fillRect(x0, Z(z), w, 0.8);
      for (let x = (i * 137) % 260; x < w; x += 260) g.fillRect(x0 + x, Z(z), 1.5, Z(16));
    }
    if (!out) { floorWear(g, X, Z, R, 0.5); bakeFloorLights(g, X, Z, cw, ch, true); }
    drawCourtLines(g, X, Z, 'rgba(255,255,255,0.9)', c.key, c.key, 0.8);
    // center logo
    const T = { c1: c.c1, c2: c.c2, crest: c.crest };
    if (c.mark === 0) floorCrest(g, X(660), Z(350), out ? 50 : 64, T);
    else if (c.mark === 1 || c.mark === 2) {
      if (c.mark === 2) floorCrest(g, X(660), Z(350) - 10, 40, T);
      g.save(); g.translate(X(660), Z(350) + (c.mark === 2 ? 34 : 8)); g.scale(1, ZS * 1.05);
      g.font = `${c.mark === 2 ? 24 : 40}px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = c.c2; g.strokeText(c.short, 0, 0); g.fillStyle = c.c1; g.fillText(c.short, 0, 0);
      g.restore();
    }
    if (c.base) {                                         // the name along both baselines, facing the sideline
      g.save(); g.font = `${c.name.length > 16 ? 20 : 26}px ${FONT}`; g.textAlign = 'center'; g.globalAlpha = 0.5;
      for (const x of [-62, 1382]) { g.save(); g.translate(X(x), Z(350)); g.scale(1, ZS); g.rotate(x < 660 ? -Math.PI / 2 : Math.PI / 2); g.fillStyle = out ? '#fff' : c.c1; g.fillText(c.name.toUpperCase(), 0, 9); g.restore(); }
      g.restore();
    }
    finishCourtMaterial(g, X, Z, v, tA, tB, R);
    return cv;
  };
}
// venue screen: the court of either team comes first
{
  const _vo = venueOptions;
  venueOptions = function () {
    const L = _vo.apply(this, arguments), s = Game.sel; if (!s || Game.screen !== 'venue') return L;
    const own = [];
    [[s.a, 0], [s.b, 1]].forEach(([i, side]) => { const T = teamAt(i); if (T && T.court && !own.some(v => v.id === 'own_' + T.custom)) own.push(ctVenue(T, side)); });
    return [...own, ...L];
  };
  // "own" venues are already made, so they skip makeVenue's defaults (and keep their host side)
  const _cv = chooseVenue;
  chooseVenue = function (i) {
    const o = venueOptions()[i];
    if (o && o.court) { Game.venueIdx = 0; SFX.blip(); Game.venueNext(Object.assign({}, o)); return; }
    return _cv.apply(this, arguments);
  };
}
// career: your league team plays its home games against you on its own court
{
  const _cvn = careerVenue;
  careerVenue = function (stage, round, oppId, opp) {
    const away = stage === 0 ? round === 1 : stage === 1 && round === 0;
    if (away && opp && opp.court) return ctVenue(opp, 1);
    return _cvn.apply(this, arguments);
  };
}
// online lobby: either team's court in the Venue list
{
  const _rows = Lobby.rows;
  Lobby.rows = function () {
    const R = _rows.apply(this, arguments), o = this.o, i = R.findIndex(r => r.label === 'Venue');
    if (i < 0 || !o) return R;
    const own = [['own:a', teamAt(o.a)], ['own:b', teamAt(o.b)]].filter(([, T]) => T && T.court);
    const vs = ['random', ...own.map(x => x[0]), ...VENUE_LIST.filter(v => !venueLocked(v)).map(v => v.id)];
    const name = id => { const x = own.find(q => q[0] === id); return x ? x[1].name + ' (own court)' : /^own:/.test(id) ? 'Home court' : id === 'random' ? 'Random' : (VENUE_LIST.find(v => v.id === id) || {}).name || 'Random'; };
    R[i] = { label: 'Venue', get: () => name(o.venue), step: d => { o.venue = vs[(Math.max(0, vs.indexOf(o.venue)) + d + vs.length) % vs.length]; } };
    return R;
  };
  const _ven = Lobby.venue;
  Lobby.venue = function () {
    const o = this.opts();
    if (/^own:[ab]$/.test(o.venue || '')) { const side = o.venue === 'own:a' ? 0 : 1, T = teamAt(side ? o.b : o.a); if (T && T.court) return ctVenue(T, side); }
    return _ven.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- 3 on 3: pick the third players
const P3 = { row: 0, pick: [null, null] };
function p3Choices(T) {
  const names = new Set(T.players.map(p => p.name));
  return [null, ...csRosterChoices().filter(r => !names.has(csResolve(r).name))];
}
function p3Name(r) { return r ? csRefName(r) : 'Auto (guest player)'; }
{
  let side = 0;
  const _tt = threeTeam;
  threeTeam = function (T) {
    const k = side++, r = Game.sel && Game.sel.three && P3.pick[k];
    if (!r) return _tt.apply(this, arguments);
    const p = Object.assign(csResolve(r), { guest: true });
    if (T.players.some(q => q.num === p.num)) p.num = 30 + ((k * 17 + 5) % 60);
    return Object.assign({}, T, { players: [...T.players, p] });
  };
  const _nm = newMatch;
  newMatch = function () { side = 0; return _nm.apply(this, arguments); };
  // after the opponent is picked, the picks screen comes before choosing your player
  const _ok = selectOK;
  selectOK = function () {
    const s = Game.sel, at = s && s.step;
    const r = _ok.apply(this, arguments);
    if (s && s.three && at === 1 && s.step === 2) { P3.row = 0; Game.screen = 'pick3'; }
    return r;
  };
  const _ss = startSelect;
  startSelect = function () { P3.pick = [null, null]; return _ss.apply(this, arguments); };
}
function p3Step(k, d) {
  const s = Game.sel, T = teamAt(k ? s.b : s.a), ch = p3Choices(T), keys = ch.map(csRefKey), i = keys.indexOf(csRefKey(P3.pick[k]));
  P3.pick[k] = ch[((i < 0 ? 0 : i) + d + ch.length) % ch.length]; SFX.blip();
}
function p3Done() { Game.screen = 'select'; SFX.blip(); }
function p3Back() { Game.screen = 'select'; Game.sel.step = 1; }
function pick3Update() {
  if (menuHit('up')) { P3.row = (P3.row + 2) % 3; SFX.blip(); }
  if (menuHit('down')) { P3.row = (P3.row + 1) % 3; SFX.blip(); }
  if (P3.row < 2 && (menuHit('left') || menuHit('right'))) p3Step(P3.row, menuHit('left') ? -1 : 1);
  if (menuHit('ok')) { if (P3.row === 2) p3Done(); else P3.row++; }
  else if (menuHit('back')) p3Back();
}
function drawPick3(g) {
  dim(g, 0.8);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  try {
    const s = Game.sel;
    g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('3 on 3: the third players', W / 2, 48);
    g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Anyone from Teams & Players can be the third. Auto brings a guest player.', W / 2, 74);
    [0, 1].forEach(k => {
      const T = teamAt(k ? s.b : s.a), x = 40 + k * 450, on = P3.row === k, r = P3.pick[k];
      panel(g, x, 92, 430, 340, on);
      drawCrest(g, x + 32, 122, 14, T); g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `17px ${FONT}`; g.fillText(fitText(g, T.name, 360), x + 54, 128);
      const third = r ? csResolve(r) : null, ps = [...T.players, third];
      ps.forEach((p, i) => {
        const px = x + 80 + i * 135;
        if (p) drawPortrait(g, px, 330, p, T, 1.2, null, 'idle');
        else { g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, px - 40, 210, 80, 110, 10); g.fill(); g.fillStyle = GOLD; g.font = `30px ${FONT}`; g.textAlign = 'center'; g.fillText('?', px, 278); }
        g.textAlign = 'center'; g.fillStyle = i === 2 ? GOLD : IVORY; g.font = `12px ${BODY}`; g.fillText(fitText(g, p ? p.name : 'Guest', 125), px, 352);
      });
      // the picker row
      const y = 376;
      g.fillStyle = on ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.08)'; roundRect(g, x + 20, y, 390, 40, 10); g.fill();
      g.fillStyle = on ? NIGHT : '#fff'; g.font = `15px ${FONT}`; g.textAlign = 'center';
      g.fillText('◂', x + 44, y + 26); g.fillText('▸', x + 386, y + 26);
      g.font = `14px ${BODY}`; g.fillText(fitText(g, (k ? 'Their third: ' : 'Your third: ') + p3Name(r), 300), x + 215, y + 26);
      addRect(x + 20, y, 60, 40, () => { P3.row = k; p3Step(k, -1); }); addRect(x + 350, y, 60, 40, () => { P3.row = k; p3Step(k, 1); });
      addRect(x + 80, y, 270, 40, () => { P3.row = k; p3Step(k, 1); });
    });
    uiButton(g, W / 2 - 110, 450, 220, 42, 'Continue', p3Done, P3.row === 2);
    if (!Input.touchMode) { g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.textAlign = 'center'; g.fillText('↑ ↓ choose   ← → change   Enter continue   Esc back', W / 2, 520); }
  } finally { W = rw; Game.ox = 0; g.restore(); }
}

// ---------------------------------------------------------------- your players in mini games
// ids: "cs:<player id>" for your players, "cs:career" for your career player
function miniMine() {
  const L = [], card = careerCard();
  if (card && card.t) L.push(['cs:career', card.name || 'Your career player']);
  for (const p of csLoad().players) L.push(['cs:' + p.id, p.name]);
  return L;
}
{
  const _cp = castPlayer;
  castPlayer = function (id) {
    if (typeof id !== 'string' || !id.startsWith('cs:')) return _cp.apply(this, arguments);
    const d = id === 'cs:career' ? csResolve({ k: 'career' }) : csResolve({ k: 'p', id: id.slice(3) });
    if (MINI_ERR[id] == null) MINI_ERR[id] = clamp(0.085 - (d.stats.sht || 5) * 0.005, 0.03, 0.08);   // better shooters miss less
    return d;
  };
}
const MINI_LINEUPS = ['Masjid regulars', 'Mixed', 'My players'];
MiniMenu.lineup = 0;
{
  const _mr = minisRows;
  minisRows = function () {
    const R = _mr.apply(this, arguments), m = MiniMenu, mine = miniMine();
    const oi = R.findIndex(r => r.label === 'Opponent');
    if (oi >= 0 && mine.length) {
      const all = [...MINI_OPPS, ...mine], ids = all.map(o => o[0]);
      if (!ids.includes(m.opp)) m.opp = 'saleem';
      R[oi] = { label: 'Opponent', get: () => (all.find(o => o[0] === m.opp) || MINI_OPPS[0])[1], step: d => { m.opp = ids[(ids.indexOf(m.opp) + d + ids.length) % ids.length]; } };
    } else if (oi < 0 && mine.length) {
      const di = R.findIndex(r => r.label === 'CPU difficulty');
      R.splice(di < 0 ? R.length - 2 : di, 0, { label: 'Opponents', get: () => MINI_LINEUPS[m.lineup], step: d => { m.lineup = (m.lineup + d + 3) % 3; } });
    }
    if (oi >= 0 && !mine.length && !MINI_OPPS.some(o => o[0] === m.opp)) m.opp = 'saleem';
    return R;
  };
  // the multi-opponent games draw from MINI_OPPS: for one start, it holds the chosen line-up
  const _sq = startQuickMini;
  startQuickMini = function () {
    const mine = miniMine(), lu = MiniMenu.lineup | 0;
    if (!mine.length || !lu) return _sq.apply(this, arguments);
    const keep = MINI_OPPS.slice(), sh = shuffle;
    MINI_OPPS.length = 0; MINI_OPPS.push(...(lu === 2 ? [...shuffle(mine.slice()), ...shuffle(keep.slice())] : [...keep, ...mine]));
    if (lu === 2) shuffle = a => a;                        // My players: yours go first, regulars only fill empty spots
    try { return _sq.apply(this, arguments); } finally { MINI_OPPS.length = 0; MINI_OPPS.push(...keep); shuffle = sh; }
  };
}

// ---------------------------------------------------------------- screens
{
  const SCR = { pick3: [pick3Update, drawPick3] };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments); if (was && Game.screen === sc) { SCR[sc][0](); attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s[1](g); drawBackButton(g); };
  BACK.pick3 = () => p3Back();
}
