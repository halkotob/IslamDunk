// ================================================= v8.5: TEAMS & PLAYERS (create your own)
// Make your own players and masjid teams. It's a sandbox: any look, any stats from 1 to 10.
//   * Players: name, role (player or sheikh), look and outfit (the same options as the career
//     creator), nine skills and a play style.
//   * Teams: name, short name, two colors, a crest, a home court, and two players picked from your
//     players, your career player, the masjid brothers or anyone on the built-in teams.
//   * Where they play: Quick Play and online (your friend sees them as you made them). Your career
//     player is there too, as "Al-Amanah (your career)", with exactly the stats you've earned.
//   * Career: up to six of your teams can join the career league as opponents (My league). They never
//     join your side, so nothing you make in the sandbox can carry your career player.
//   * Share codes: copy a code for any team or player; a friend pastes it to import.
const CS_KEY = 'islamdunk.custom', CARD_KEY = 'islamdunk.careercard';
const CS = { d: null, rev: 0, pool: null, poolRev: -1, card: undefined };
function csLoad() {
  if (CS.d) return CS.d;
  let o = null; try { o = JSON.parse(localStorage.getItem(CS_KEY) || 'null'); } catch (e) {}
  CS.d = Object.assign({ v: 1, players: [], teams: [], league: [] }, o && o.v === 1 ? o : {});
  return CS.d;
}
function csSave() { CS.rev++; try { localStorage.setItem(CS_KEY, JSON.stringify(csLoad())); } catch (e) {} }
function csId() { return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
const CS_STATS = [['spd', 'Speed'], ['sht', 'Shooting'], ['dnk', 'Dunking'], ['def', 'Defense'], ['stl', 'Steals'], ['sta', 'Stamina'], ['pas', 'Passing'], ['hus', 'Hustle'], ['clu', 'Clutch']];
const CS_CAST = ['saleem', 'khalil', 'nasser', 'tariq', 'mahmoud', 'rafiq', 'siddiq', 'hamid'];
const TEAM_COLS = ['#1e7a4c', '#f0c75e', '#1f3b73', '#f4f4f4', '#0f7c80', '#f3e6c4', '#7a1f2b', '#e8c35a', '#5b2a86', '#cfd6de', '#d8661c', '#1d1d1d', '#3a8fd6', '#0f2a4a', '#2a2a2a', '#d64545', '#2c6e8f', '#f2cf6b', '#6b8e23', '#c0c0c0'];
const CS_CRESTS = ['dome', 'crescent', 'star', 'arch', 'minaret'];
// a light word filter for names (whole words, or obvious substrings)
const CS_BAD = /(fuck|shit|bitch|cunt|nigg|fagg|whore|slut|porn|\bdick\b|\bcock\b|\bpussy\b|\bass\b|\bsex\b|\bkill\b|\bhitler\b|\bnazi\b)/i;
function csClean(s, fallback) { s = (s || '').replace(/\s+/g, ' ').trim(); return !s || CS_BAD.test(s) ? fallback : s; }
// ---- players
function csNewPlayer() {
  const lk = Object.assign({}, freshCareer().look, { skin: rint(SKINS.length), hair: rint(HAIRS.length), beard: rint(4), cap: rint(5), capColor: rint(CAPCOLS.length), thobe: rint(THOBES.length), num: 1 + rint(55) });
  const stats = {}; for (const [k] of CS_STATS) stats[k] = 6;
  return { id: csId(), name: 'New player', sheikh: false, look: lk, stats };
}
function csPlayerDef(r) {
  const lk = r.look, st = Object.assign({}, r.stats);
  for (const [k] of CS_STATS) st[k] = clamp(Math.round(st[k] || 5), 1, 10);
  return { name: r.name, num: lk.num, sheikh: !!r.sheikh, huffath: !!r.sheikh, skin: SKINS_ALL[lk.skin] || SKINS[3], hat: CAPKEYS[lk.cap] || 'kufi', hair: HAIRS[lk.hair] || HAIRS[0],
    look: lk, arch: lookArch(lk), stats: st, custom: true };
}
// ---- the career player, saved alongside the career so Quick Play and online can use him
function careerCard() {
  if (CS.card !== undefined) return CS.card;
  try { CS.card = JSON.parse(localStorage.getItem(CARD_KEY) || 'null'); } catch (e) { CS.card = null; }
  return CS.card;
}
{
  const _sc = saveCareer;
  saveCareer = function (key) {
    const r = _sc.apply(this, arguments);
    if (C && C.name && C.look && C.lv) { try { const card = { t: amanahTeam(), name: C.name }; localStorage.setItem(CARD_KEY, JSON.stringify(card)); CS.card = card; CS.rev++; } catch (e) {} }
    return r;
  };
}
// ---- roster picks: a reference that resolves to a player
function csRosterChoices() {
  const L = [], card = careerCard(), d = csLoad();
  if (card) L.push({ k: 'career' });
  for (const p of d.players) L.push({ k: 'p', id: p.id });
  for (const id of CS_CAST) if (id === 'saleem' || CAST[id]) L.push({ k: 'cast', id });
  TEAMS.forEach((T, t) => T.players.forEach((_, s) => L.push({ k: 'team', t, s })));
  return L;
}
function csRefKey(r) { return r ? r.k + ':' + (r.id || '') + ':' + (r.t == null ? '' : r.t) + ':' + (r.s == null ? '' : r.s) : ''; }
function csResolve(r) {
  let d = null;
  if (!r) d = null;
  else if (r.k === 'career') { const c = careerCard(); d = c && c.t.players[1]; }
  else if (r.k === 'p') { const p = csLoad().players.find(x => x.id === r.id); d = p && csPlayerDef(p); }
  else if (r.k === 'cast') d = castPlayer(r.id);
  else if (r.k === 'team') d = TEAMS[r.t] && TEAMS[r.t].players[r.s];
  else if (r.k === 'def') d = r.def;                                   // imported with a team code
  d = d ? Object.assign({}, d) : castPlayer('khalil');
  if (!d.stats) d.stats = { spd: 6, sht: 6, dnk: 5, def: 6, stl: 5 };
  return d;
}
function csRefName(r) { return r && r.k === 'career' ? 'You (career)' : csResolve(r).name; }
// ---- teams
function csNewTeam() {
  const i = rint(TEAM_COLS.length / 2) * 2;
  const ch = csRosterChoices();
  return { id: csId(), name: 'Masjid Al-Jadid', short: 'JADID', c1: TEAM_COLS[i], c2: TEAM_COLS[i + 1], crest: pick(CS_CRESTS), venue: '', roster: [ch[0], ch[Math.min(1, ch.length - 1)]] };
}
function csTeamDef(t) {
  return { name: t.name, short: (t.short || t.name).slice(0, 6).toUpperCase(), place: 'Your league', c1: t.c1, c2: t.c2, crest: t.crest, custom: t.id, home: t.venue || '',
    players: t.roster.slice(0, 2).map(csResolve) };
}
// ---- every team you can pick: the 8 built-in masjids, your career team, then yours
function teamPool() {
  const key = CS.rev;
  if (CS.pool && CS.poolRev === key) return CS.pool;
  const P = TEAMS.slice(), card = careerCard();
  if (card && card.t) P.push(Object.assign({}, card.t, { name: 'Al-Amanah (your career)', short: 'YOU', custom: 'career' }));
  for (const t of csLoad().teams) P.push(csTeamDef(t));
  CS.pool = P; CS.poolRev = key; return P;
}
function teamCount() { return teamPool().length; }
function netTeam(s, k) { const ct = Net.role === 'guest' && Net.remoteCT; return (ct && ct[k]) || teamAt(k ? s.b : s.a); }
function teamAt(i) { const P = teamPool(); return P[((i % P.length) + P.length) % P.length]; }
// ---- share codes: "ID1-" + base64 of the JSON, with a short checksum
function b64enc(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
function csShareCode(kind, rec) {
  let body;
  if (kind === 'player') body = { k: 'P', n: rec.name, r: rec.sheikh ? 1 : 0, l: rec.look, s: rec.stats };
  else body = { k: 'T', n: rec.name, sh: rec.short, c: [rec.c1, rec.c2], cr: rec.crest, v: rec.venue || '', p: rec.roster.slice(0, 2).map(r => r.k === 'team' || r.k === 'cast' ? r : { k: 'def', def: csResolve(r) }) };
  const js = JSON.stringify(body);
  return 'ID1-' + (hash32(js) % 46656).toString(36).padStart(3, '0') + '-' + b64enc(js);
}
function csImport(code) {
  const m = /ID1-([0-9a-z]{3})-([A-Za-z0-9_-]+)/.exec((code || '').replace(/\s+/g, ''));
  if (!m) return { err: 'That doesn’t look like an Islam Dunk code.' };
  let js, o; try { js = b64dec(m[2]); o = JSON.parse(js); } catch (e) { return { err: 'The code is cut off. Copy all of it and try again.' }; }
  if ((hash32(js) % 46656).toString(36).padStart(3, '0') !== m[1]) return { err: 'The code is cut off. Copy all of it and try again.' };
  const d = csLoad();
  if (o.k === 'P') {
    const p = csNewPlayer(); p.name = csClean(String(o.n || '').slice(0, 14), 'Imported player'); p.sheikh = !!o.r;
    Object.assign(p.look, o.l || {}); for (const [k] of CS_STATS) p.stats[k] = clamp(Math.round(+((o.s || {})[k]) || 5), 1, 10);
    d.players.push(p); csSave(); return { ok: 'Imported player: ' + p.name };
  }
  if (o.k === 'T') {
    const t = csNewTeam(); t.name = csClean(String(o.n || '').slice(0, 20), 'Imported masjid'); t.short = csClean(String(o.sh || '').slice(0, 6), 'GUEST').toUpperCase();
    const okCol = c => /^#[0-9a-f]{6}$/i.test(c || '');
    if (o.c && okCol(o.c[0])) t.c1 = o.c[0]; if (o.c && okCol(o.c[1])) t.c2 = o.c[1];
    if (CS_CRESTS.includes(o.cr)) t.crest = o.cr; t.venue = VENUE_LIST.some(v => v.id === o.v) ? o.v : '';
    t.roster = (o.p || []).slice(0, 2).map(r => {
      if (r && r.k === 'def' && r.def) { const df = r.def, st = {}; for (const [k] of CS_STATS) st[k] = clamp(Math.round(+((df.stats || {})[k]) || 5), 1, 10); return { k: 'def', def: Object.assign({}, df, { name: csClean(String(df.name || '').slice(0, 14), 'Guest'), stats: st }) }; }
      if (r && r.k === 'team' && TEAMS[r.t]) return { k: 'team', t: r.t | 0, s: r.s ? 1 : 0 };
      if (r && r.k === 'cast' && CS_CAST.includes(r.id)) return { k: 'cast', id: r.id };
      return { k: 'cast', id: 'khalil' };
    });
    while (t.roster.length < 2) t.roster.push({ k: 'cast', id: 'nasser' });
    d.teams.push(t); csSave(); return { ok: 'Imported team: ' + t.name };
  }
  return { err: 'That code isn’t a team or a player.' };
}
function csCopy(text) {
  const done = () => toast('Code copied. Send it to a friend.', 2.5);
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, () => toast('Select the code and copy it', 2.5)); return; } } catch (e) {}
  toast('Select the code and copy it', 2.5);
}
// ---- career league: your teams as opponents in the career (never on your side)
{
  const _stg = stageTeams;
  stageTeams = function (stage) {
    const base = _stg.apply(this, arguments), L = (csLoad().league || []).map(id => csLoad().teams.find(t => t.id === id)).filter(Boolean).slice(0, 6);
    if (!L.length) return base;
    const key = stage + ':' + CS.rev + ':' + L.map(t => t.id).join(',');
    base._cs = base._cs || {};
    if (base._cs[key]) return base._cs[key];
    const T = base.slice(); T.divisions = base.divisions;
    L.forEach((t, i) => { T[2 + i] = Object.assign(csTeamDef(t), { place: 'Your league' }); });
    const pw = t => t.players.reduce((a, p) => a + p.stats.spd + p.stats.sht + p.stats.dnk + p.stats.def + p.stats.stl, 0);
    T.slice(1).sort((a, b) => pw(b) - pw(a)).forEach((t, i, a) => { t.tier = i < 2 ? 1 : i >= a.length - 2 ? -1 : 0; });
    return (base._cs[key] = T);
  };
}
// ---- home court: your team's venue is picked first on the venue screen
{
  const _ov = openVenueSelect;
  openVenueSelect = function (next) {
    const r = _ov.apply(this, arguments), T = Game.sel && teamAt(Game.sel.a);
    if (T && T.home) { const i = venueOptions().findIndex(v => v.id === T.home); if (i >= 0) Game.idx = i; }
    return r;
  };
}
// ---- online: a custom team travels with the snapshots so your friend sees it as you made it
{
  const isCustom = d => d && !TEAMS.some(t => t.name === d.name);
  const pack = d => ({ name: d.name, short: d.short, c1: d.c1, c2: d.c2, crest: d.crest, place: d.place || '', custom: 1, players: d.players });
  const _sn = Net.snapshot;
  Net.snapshot = function () {
    const s = _sn.apply(this, arguments);
    Net.ctN = (Net.ctMid === this.mid ? Net.ctN : 0) + 1; Net.ctMid = this.mid;
    const send = Net.ctN < 90 || Net.ctN % 30 === 0;
    if (!send || !s) return s;
    if (s.sc === 'lobby' && this.sel) { const a = teamAt(this.sel.a), b = teamAt(this.sel.b); if (isCustom(a) || isCustom(b)) s.ct = [isCustom(a) ? pack(a) : 0, isCustom(b) ? pack(b) : 0]; }
    else if (M.teamDefs && !Net.isMini()) { const [a, b] = M.teamDefs; if (isCustom(a) || isCustom(b)) s.ct = [isCustom(a) ? pack(a) : 0, isCustom(b) ? pack(b) : 0]; }
    return s;
  };
  // guest: remember the latest custom teams and use them when the match is built
  const _gf = Net.guestFrame;
  Net.guestFrame = function () {
    Net.buildCT = null;
    for (const x of this.snaps || []) if (x.s && x.s.ct) { Net.remoteCT = x.s.ct; if (x.s.mid != null && x.s.mid !== this.curMid) Net.buildCT = x.s.ct; }
    return _gf.apply(this, arguments);
  };
  const _nm = newMatch;
  newMatch = function (tA, tB, opts) {
    let ct = Net.role === 'guest' && !(opts && opts.attract) && (Net.buildCT || null);
    if (Net.role === 'guest' && !ct && !(opts && opts.attract)) { let best = -1; for (const x of Net.snaps || []) if (x.s && x.s.ct && x.s.mid != null && x.s.mid >= best) { best = x.s.mid; ct = x.s.ct; } }
    if (ct) {
      const one = ((Net.snaps || []).map(x => x.s).reverse().find(x => x && x.one) || {}).one;   // 1 on 1: the host sent one player a side
      const fit = (c, t, k) => { if (!c || !t) return t; if (c.players.length === t.players.length) return c; if (one && c.players.length === 1) { const P = t.players.slice(); P[one[k] | 0] = c.players[0]; return Object.assign({}, c, { players: P }); } return t; };
      tA = fit(ct[0], tA, 0); tB = fit(ct[1], tB, 1);
    }
    return _nm.call(this, tA, tB, opts);
  };
}
// ---- name entry, shared with the career creator
function csAskName(title, cur, max, done) {
  Game.nameBuf = /^(New player|Masjid Al-Jadid|JADID)$/.test(cur || '') ? '' : cur || ''; Game.nameTitle = title; Game.nameMax = max; Game.nameCb = done; Game.nameBack = Game.screen; Game.screen = 'namekeys';
}
{
  const _nu = nameUpdate;
  nameUpdate = function () {
    if (!Game.nameCb) return _nu.apply(this, arguments);
    for (const ch of NAME_KEYS) if (Input.pressed['Key' + ch]) nameType(ch);
    if (Input.pressed.Space && Game.nameBuf.length && Game.nameBuf.length < (Game.nameMax || 12)) Game.nameBuf += ' ';
    if (Input.pressed.Backspace) Game.nameBuf = Game.nameBuf.slice(0, -1);
    if (Input.pressed.Enter || Input.pressed.NumpadEnter) nameDone();
    if (Input.pressed.Escape) { Game.nameCb = null; Game.screen = Game.nameBack; }
  };
  const _nt = nameType;
  nameType = function (ch) { if (!Game.nameCb) return _nt.apply(this, arguments); if (Game.nameBuf.length < (Game.nameMax || 12)) { Game.nameBuf += Game.nameBuf.length && Game.nameBuf.slice(-1) !== ' ' ? ch.toLowerCase() : ch; SFX.blip(); } };
  const _nd = nameDone;
  nameDone = function () { if (!Game.nameCb) return _nd.apply(this, arguments); const cb = Game.nameCb; Game.nameCb = null; Game.screen = Game.nameBack; cb(Game.nameBuf.trim()); };
  const _dk = drawNameKeys;
  drawNameKeys = function (g) {
    if (!Game.nameCb) return _dk.apply(this, arguments);
    if (!CAREER_SCREENS.has(Game.nameBack)) dim(g, 0.75);
    _dk.apply(this, arguments);
  };
  // the name screen lives with the career screens; outside a career it still needs its own route
  const _bk = BACK.namekeys; BACK.namekeys = () => { if (Game.nameCb) { Game.nameCb = null; Game.screen = Game.nameBack; } else _bk(); };
}
// ---- the list screen: Teams | Players
const CSUI = { tab: 0, idx: 0, scroll: 0, edit: null, ed: 0, sec: 0, share: null, imp: null };
function openCS(tab = 0) { CSUI.tab = tab; CSUI.idx = 0; CSUI.scroll = 0; Game.screen = 'cslist'; csLoad(); }
function csRows() { const d = csLoad(); return CSUI.tab === 0 ? [{ add: true }, ...d.teams] : [{ add: true }, ...d.players]; }
function csAct(k) {
  const d = csLoad(), R = csRows(), r = R[CSUI.idx]; if (!r) return;
  if (r.add) { const n = CSUI.tab === 0 ? csNewTeam() : csNewPlayer(); (CSUI.tab === 0 ? d.teams : d.players).push(n); csSave(); CSUI.idx = R.length; openCSEdit(n); return; }
  const list = CSUI.tab === 0 ? d.teams : d.players;
  if (k === 'edit') openCSEdit(r);
  else if (k === 'share') { CSUI.share = csShareCode(CSUI.tab === 0 ? 'team' : 'player', r); Game.screen = 'csshare'; }
  else if (k === 'dup') { const c = JSON.parse(JSON.stringify(r)); c.id = csId(); c.name = (r.name + ' 2').slice(0, 20); list.push(c); csSave(); toast('Duplicated', 1.5); }
  else if (k === 'del') {
    if (CSUI.confirm !== r.id) { CSUI.confirm = r.id; toast('Press Delete again to remove ' + r.name, 2.5); return; }
    list.splice(list.indexOf(r), 1); d.league = d.league.filter(id => id !== r.id);
    if (CSUI.tab === 1) for (const t of d.teams) t.roster = t.roster.map(x => (x.k === 'p' && x.id === r.id ? { k: 'cast', id: 'khalil' } : x));
    csSave(); CSUI.idx = Math.min(CSUI.idx, csRows().length - 1); toast('Removed', 1.5);
  } else if (k === 'league' && CSUI.tab === 0) {
    const i = d.league.indexOf(r.id);
    if (i >= 0) d.league.splice(i, 1); else if (d.league.length >= 6) { toast('Up to 6 teams can join the career league', 2.5); return; } else d.league.push(r.id);
    csSave(); toast(d.league.includes(r.id) ? r.name + ' joins the career league as an opponent' : r.name + ' left the career league', 2.5);
  }
  CSUI.confirm = k === 'del' ? CSUI.confirm : null;
}
function csListUpdate() {
  const R = csRows(), n = R.length;
  if (menuHit('up')) { CSUI.idx = (CSUI.idx + n - 1) % n; SFX.blip(); CSUI.confirm = null; }
  if (menuHit('down')) { CSUI.idx = (CSUI.idx + 1) % n; SFX.blip(); CSUI.confirm = null; }
  if (menuHit('left') || menuHit('right') || Input.pressed.Tab) { CSUI.tab ^= 1; CSUI.idx = 0; CSUI.scroll = 0; SFX.blip(); }
  if (menuHit('ok')) csAct('edit');
  else if (Input.pressed.KeyC) csAct('share');
  else if (Input.pressed.KeyD) csAct('dup');
  else if (Input.pressed.Delete || Input.pressed.KeyX) csAct('del');
  else if (Input.pressed.KeyG) csAct('league');
  else if (Input.pressed.KeyI) openCSImport();
  else if (menuHit('back')) goTitle();
}
function drawCSList(g) {
  dim(g, 0.82);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `28px ${FONT}`; g.fillText('Teams & Players', W / 2, 48);
  ['Teams', 'Players'].forEach((t, i) => { const x = W / 2 - 160 + i * 170, on = CSUI.tab === i; g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, x, 62, 150, 30, 15); g.fill(); g.fillStyle = on ? NIGHT : '#fff'; g.font = `14px ${FONT}`; g.fillText(t, x + 75, 82); addRect(x, 62, 150, 30, () => { CSUI.tab = i; CSUI.idx = 0; CSUI.scroll = 0; }); });
  const R = csRows(), d = csLoad(), vis = 9;
  CSUI.scroll = clamp(CSUI.scroll, Math.max(0, CSUI.idx - vis + 1), CSUI.idx);
  panel(g, 30, 104, 360, 420, false);
  R.slice(CSUI.scroll, CSUI.scroll + vis).forEach((r, k) => {
    const i = CSUI.scroll + k, y = 116 + k * 44, on = i === CSUI.idx;
    g.fillStyle = on ? 'rgba(232,195,90,0.9)' : 'rgba(255,255,255,0.05)'; roundRect(g, 42, y, 336, 38, 10); g.fill();
    g.textAlign = 'left'; g.fillStyle = on ? NIGHT : '#fff'; g.font = `15px ${r.add ? FONT : BODY}`;
    if (r.add) g.fillText(CSUI.tab === 0 ? '+  New team' : '+  New player', 60, y + 25);
    else {
      if (CSUI.tab === 0) drawCrest(g, 62, y + 19, 12, csTeamDef(r));
      g.fillText(r.name, CSUI.tab === 0 ? 84 : 60, y + 25);
      if (CSUI.tab === 0 && d.league.includes(r.id)) { g.fillStyle = on ? NIGHT : '#9dffb0'; g.font = `10px ${FONT}`; g.textAlign = 'right'; g.fillText('CAREER', 368, y + 24); }
    }
    addRect(42, y, 336, 38, () => { if (CSUI.idx === i) csAct('edit'); CSUI.idx = i; });
  });
  if (R.length === 1) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; wrapText(g, CSUI.tab === 0 ? 'No teams yet. Make one, or import a code from a friend.' : 'No players yet. Make one, or import a code from a friend.', 210, 200, 300, 18); }
  // preview of the selected entry
  panel(g, 406, 104, 524, 340, false);
  const r = R[CSUI.idx];
  if (r && !r.add) {
    if (CSUI.tab === 0) {
      const T = csTeamDef(r);
      drawCrest(g, 450, 140, 22, T); g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `20px ${FONT}`; g.fillText(T.name, 482, 140); g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(T.short + (T.home ? '  •  Home: ' + ((VENUE_LIST.find(v => v.id === T.home) || {}).name || '') : ''), 482, 158);
      T.players.forEach((p, k) => { const px = 540 + k * 230; drawPortrait(g, px, 400, p, T, 1.5, null, 'idle'); g.textAlign = 'center'; g.fillStyle = IVORY; g.font = `13px ${BODY}`; g.fillText(p.name, px, 424); });
    } else {
      const p = csPlayerDef(r);
      drawPortrait(g, 520, 400, p, { c1: '#2c6e8f', c2: '#f2cf6b' }, 1.7, 'thobe', 'idle');
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `20px ${FONT}`; g.fillText(p.name, 640, 140); g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('#' + p.num + (p.sheikh ? '  •  Sheikh' : '') + (p.arch ? '  •  ' + PLAY_STYLE_TXT[r.look.style || 0] : ''), 640, 158);
      CS_STATS.forEach(([k, l], i) => statBar(g, 690, 182 + i * 24, l.slice(0, 3).toUpperCase(), p.stats[k]));
    }
  } else if (r) { g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `15px ${BODY}`; g.fillText(CSUI.tab === 0 ? 'Make a new masjid team' : 'Make a new player', 668, 270); }
  // actions for the selection
  const acts = r && !r.add ? [['Edit', 'edit'], ['Share code', 'share'], ['Duplicate', 'dup'], ['Delete', 'del']].concat(CSUI.tab === 0 ? [[d.league.includes(r.id) ? 'Leave career' : 'Join career', 'league']] : []) : [['Create', 'edit']];
  const bw = Math.min(120, 524 / acts.length - 8);
  acts.forEach(([l, k], i) => uiButton(g, 406 + i * (bw + 8), 452, bw, 34, l, () => csAct(k), i === 0));
  uiButton(g, 406, 494, 200, 32, 'Import a code', openCSImport, false);
  g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText('Enter edit  •  C code  •  D duplicate  •  X delete' + (CSUI.tab === 0 ? '  •  G career' : '') + '  •  I import', 930, 516);
  W = rw; Game.ox = 0; g.restore();
}
// ---- the editor
const CS_SECTIONS = ['Look', 'Outfit', 'Skills'];
function csLookRows(key) { return CREATOR_ROWS.find(r => r.key === key); }
function csEditRows() {
  const e = CSUI.edit; if (!e) return [];
  if (e.kind === 'team') {
    const t = e.rec, ch = csRosterChoices(), vs = ['', ...VENUE_LIST.map(v => v.id)];
    const cyc = (arr, v, d) => arr[(Math.max(0, arr.indexOf(v)) + d + arr.length) % arr.length];
    const slot = s => ({ label: 'Player ' + (s + 1), get: () => csRefName(t.roster[s]), step: d => { const keys = ch.map(csRefKey), i = keys.indexOf(csRefKey(t.roster[s])); t.roster[s] = ch[((i < 0 ? 0 : i) + d + ch.length) % ch.length]; } });
    return [
      { label: 'Name', get: () => t.name, enter: () => csAskName('Team name', t.name, 20, v => { t.name = csClean(v, t.name); csSave(); }) },
      { label: 'Short name', get: () => t.short, enter: () => csAskName('Short name (6 letters)', t.short, 6, v => { t.short = csClean(v, t.short).toUpperCase(); csSave(); }) },
      { label: 'Main color', sw: () => t.c1, step: d => { t.c1 = cyc(TEAM_COLS, t.c1, d); } },
      { label: 'Second color', sw: () => t.c2, step: d => { t.c2 = cyc(TEAM_COLS, t.c2, d); } },
      { label: 'Crest', get: () => t.crest[0].toUpperCase() + t.crest.slice(1), step: d => { t.crest = cyc(CS_CRESTS, t.crest, d); } },
      slot(0), slot(1),
      { label: 'Home court', get: () => t.venue ? (VENUE_LIST.find(v => v.id === t.venue) || {}).name || 'None' : 'None', step: d => { t.venue = cyc(vs, t.venue || '', d); } }
    ];
  }
  const p = e.rec, sec = CSUI.sec, lk = p.look;
  const lookRow = key => { const r = csLookRows(key); if (!r) return null; const n = r.n || (r.sw || r.txt).length; return { label: r.label, sw: r.sw ? () => r.sw[lk[key]] : null, get: r.sw ? null : () => (r.txt ? r.txt[lk[key] || 0] : String(lk[key])), step: d => { lk[key] = ((lk[key] || 0) + d + n) % n; } }; };
  if (sec === 0) return [
    { label: 'Name', get: () => p.name, enter: () => csAskName('Player name', p.name, 14, v => { p.name = csClean(v, p.name); csSave(); }) },
    { label: 'Role', get: () => (p.sheikh ? 'Sheikh (Noor meter)' : 'Player'), step: () => { p.sheikh = !p.sheikh; } },
    ...['skin', 'height', 'build', 'hair', 'beard', 'beardLen', 'num'].map(lookRow)].filter(Boolean);
  if (sec === 1) return ['cap', 'capColor', 'thobe', 'thobeLen', 'shoes', 'teamMatch'].map(lookRow).filter(Boolean);
  return [...CS_STATS.map(([k, l]) => ({ label: l, get: () => String(p.stats[k]), pips: () => p.stats[k], step: d => { p.stats[k] = clamp((p.stats[k] || 5) + d, 1, 10); } })),
    { label: 'Play style', get: () => PLAY_STYLE_TXT[lk.style || 0], step: d => { lk.style = ((lk.style || 0) + d + PLAY_STYLE_TXT.length) % PLAY_STYLE_TXT.length; } }];
}
function openCSEdit(rec) { CSUI.edit = { kind: CSUI.tab === 0 ? 'team' : 'player', rec }; CSUI.ed = 0; CSUI.sec = 0; Game.screen = 'csedit'; }
function csEditDone() { csSave(); CSUI.edit = null; Game.screen = 'cslist'; }
function csEditUpdate() {
  const rows = csEditRows(), n = rows.length + 1;
  if (CSUI.edit.kind === 'player' && (Input.pressed.Tab || Input.pressed.KeyQ || Input.pressed.KeyE)) { CSUI.sec = (CSUI.sec + (Input.pressed.KeyQ ? 2 : 1)) % 3; CSUI.ed = 0; SFX.blip(); return; }
  if (menuHit('up')) { CSUI.ed = (CSUI.ed + n - 1) % n; SFX.blip(); }
  if (menuHit('down')) { CSUI.ed = (CSUI.ed + 1) % n; SFX.blip(); }
  const r = rows[CSUI.ed];
  if (r && r.step && (menuHit('left') || menuHit('right'))) { r.step(menuHit('left') ? -1 : 1); csSave(); SFX.blip(); }
  if (menuHit('ok')) { if (!r) csEditDone(); else if (r.enter) r.enter(); else if (r.step) { r.step(1); csSave(); } }
  else if (menuHit('back')) csEditDone();
}
function drawCSEdit(g) {
  dim(g, 0.84);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  const e = CSUI.edit, rows = csEditRows(), team = e.kind === 'team';
  g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText(team ? 'Edit team' : 'Edit player', 130, 42);
  if (!team) CS_SECTIONS.forEach((s, i) => { const x = 300 + i * 112, on = CSUI.sec === i; g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.1)'; roundRect(g, x, 22, 104, 28, 14); g.fill(); g.fillStyle = on ? NIGHT : '#fff'; g.font = `13px ${FONT}`; g.textAlign = 'center'; g.fillText(s, x + 52, 41); addRect(x, 22, 104, 28, () => { CSUI.sec = i; CSUI.ed = 0; }); });
  panel(g, 30, 62, 470, 462, true);
  const gap = Math.min(44, 440 / (rows.length + 1));
  rows.forEach((r, i) => {
    const y = 72 + i * gap, on = i === CSUI.ed, cy = y + gap / 2 + 5, vx = 330;
    if (on) { g.fillStyle = 'rgba(232,195,90,0.18)'; roundRect(g, 40, y + 1, 450, gap - 2, 8); g.fill(); }
    g.textAlign = 'left'; g.fillStyle = on ? '#fff' : IVORY; g.font = `14px ${BODY}`; g.fillText(r.label, 54, cy);
    addRect(40, y, 270, gap, () => { CSUI.ed = i; if (r.enter) r.enter(); else if (r.step) { r.step(1); csSave(); } });
    if (r.step) { g.fillStyle = GOLD; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText('◂', vx - 20, cy + 1); g.fillText('▸', vx + 140, cy + 1); addRect(vx - 40, y, 40, gap, () => { CSUI.ed = i; r.step(-1); csSave(); }); addRect(vx + 120, y, 40, gap, () => { CSUI.ed = i; r.step(1); csSave(); }); }
    if (r.sw) { g.fillStyle = r.sw(); roundRect(g, vx + 30, cy - 14, 60, 18, 9); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.stroke(); }
    else if (r.pips) { const v = r.pips(); for (let k = 0; k < 10; k++) { g.fillStyle = k < v ? GOLD : 'rgba(255,255,255,0.12)'; roundRect(g, vx + 6 + k * 11, cy - 12, 8, 12, 2); g.fill(); } }
    else { g.fillStyle = '#fff'; g.font = `13px ${r.enter ? FONT : BODY}`; g.textAlign = 'center'; let t = r.get(); while (g.measureText(t).width > 150 && t.length > 4) t = t.slice(0, -2); g.fillText(r.enter ? t + '  ✎' : t, vx + 60, cy); }
  });
  { const y = 72 + rows.length * gap, on = CSUI.ed === rows.length; uiButton(g, 150, y + 6, 230, 34, 'Done', csEditDone, on); }
  // preview
  panel(g, 530, 62, 400, 400, false);
  if (team) {
    const T = csTeamDef(e.rec);
    drawCrest(g, 570, 100, 22, T); g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `18px ${FONT}`; g.fillText(T.name, 602, 100); g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText(T.short, 602, 118);
    T.players.forEach((p, k) => { const px = 630 + k * 200; drawPortrait(g, px, 400, p, T, 1.45, null, 'idle'); g.textAlign = 'center'; g.fillStyle = IVORY; g.font = `12px ${BODY}`; g.fillText(p.name, px, 422); });
  } else {
    const p = csPlayerDef(e.rec), T = { name: 'Preview', c1: '#2c6e8f', c2: '#f2cf6b', crest: 'arch' };
    drawPortrait(g, 640, 390, p, T, 1.6, 'thobe', 'idle'); drawPortrait(g, 830, 390, p, T, 1.6, null, 'idle');
    g.textAlign = 'center'; g.fillStyle = '#9fb3c8'; g.font = `12px ${BODY}`; g.fillText('At the masjid', 640, 412); g.fillText('Game day', 830, 412);
    g.fillText('Sandbox: any stats from 1 to 10. Your career player stays separate.', 730, 440);
  }
  g.textAlign = 'right'; g.fillStyle = '#9fb3c8'; g.font = `11px ${BODY}`; g.fillText((team ? '' : 'Tab: Look / Outfit / Skills   ') + '↑ ↓ choose   ← → change   Enter edit   Esc done', 930, 500);
  W = rw; Game.ox = 0; g.restore();
}
// ---- share and import
function drawCSShare(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  panel(g, 110, 70, 740, 400, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Share code', W / 2, 112);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Send this to a friend. They choose Teams & Players → Import a code and paste it.', W / 2, 138);
  g.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(g, 140, 156, 680, 220, 10); g.fill();
  g.fillStyle = '#cfe6f3'; g.font = `12px monospace`; g.textAlign = 'left';
  const code = CSUI.share || '', per = 92; for (let i = 0, y = 176; i < code.length && y < 370; i += per, y += 16) g.fillText(code.slice(i, i + per), 152, y);
  uiButton(g, W / 2 - 200, 396, 190, 40, 'Copy code', () => csCopy(code), true);
  uiButton(g, W / 2 + 10, 396, 190, 40, 'Back', () => BACK.csshare(), false);
  W = rw; Game.ox = 0; g.restore();
}
function openCSImport() { CSUI.imp = { msg: '', err: false }; Game.screen = 'csimport'; }
function csTryImport(text) { const r = csImport(text); CSUI.imp = { msg: r.ok || r.err, err: !r.ok }; if (r.ok) { SFX.good && SFX.good(); toast(r.ok, 2.5); } else SFX.bad && SFX.bad(); }
function csPasteButton() {
  try { if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(csTryImport, () => { CSUI.imp = { msg: 'Press Ctrl+V (or ⌘V) to paste the code here.', err: true }; }); return; } } catch (e) {}
  CSUI.imp = { msg: 'Press Ctrl+V (or ⌘V) to paste the code here.', err: true };
}
addEventListener('paste', e => { if (Game.screen !== 'csimport') return; const t = e.clipboardData && e.clipboardData.getData('text'); if (t) { e.preventDefault(); csTryImport(t); } });
function drawCSImport(g) {
  dim(g, 0.86);
  const o = Math.round((W - 960) / 2), rw = W; g.save(); g.translate(o, 0); W = 960; Game.ox = o;
  panel(g, 160, 110, 640, 300, true);
  g.textAlign = 'center'; g.fillStyle = GOLD; g.font = `24px ${FONT}`; g.fillText('Import a code', W / 2, 152);
  g.fillStyle = IVORY; g.font = `14px ${BODY}`; g.fillText('Copy a team or player code from a friend, then paste it here.', W / 2, 182);
  uiButton(g, W / 2 - 110, 210, 220, 44, 'Paste', csPasteButton, true);
  g.fillStyle = '#9fb3c8'; g.font = `13px ${BODY}`; g.fillText('or press Ctrl+V (⌘V on a Mac)', W / 2, 280);
  if (CSUI.imp && CSUI.imp.msg) { g.fillStyle = CSUI.imp.err ? '#ff9a8a' : '#9dffb0'; g.font = `15px ${BODY}`; g.fillText(CSUI.imp.msg, W / 2, 322); }
  uiButton(g, W / 2 - 80, 346, 160, 38, 'Back', () => { Game.screen = 'cslist'; }, false);
  W = rw; Game.ox = 0; g.restore();
}
// ---- screens and title entry
{
  const SCR = { cslist: [csListUpdate, drawCSList], csedit: [csEditUpdate, drawCSEdit], csshare: [() => { if (menuHit('back')) BACK.csshare(); else if (menuHit('ok')) csCopy(CSUI.share); }, drawCSShare],
    csimport: [() => { if (menuHit('back')) Game.screen = 'cslist'; else if (menuHit('ok')) csPasteButton(); }, drawCSImport] };
  const _gu = gameUpdate;
  gameUpdate = function (rdt) { const sc = Game.screen, was = SCR[sc]; _gu.apply(this, arguments); if (was && Game.screen === sc) { SCR[sc][0](); attractTick(rdt); } };
  const _r = render;
  render = function (g) { _r(g); const s = SCR[Game.screen]; if (!s) return; s[1](g); drawBackButton(g); };
  BACK.cslist = () => goTitle(); BACK.csedit = () => csEditDone(); BACK.csshare = () => { Game.screen = 'cslist'; }; BACK.csimport = () => { Game.screen = 'cslist'; };
  const _tm = TITLE_MENU;
  TITLE_MENU = function () {
    return [..._tm(), { label: 'Teams & Players', sub: [{ label: 'Teams', act: () => openCS(0) }, { label: 'Players', act: () => openCS(1) }, { label: 'Import a code', act: () => { openCS(0); openCSImport(); } }] }];
  };
}
