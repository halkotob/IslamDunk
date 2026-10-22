// Review Studio agent. Evaluated INSIDE the game frame (game.html), in the game's own global scope, so it sees the
// game's top-level consts (STORY, TRIVIA, CAST, ...) and calls the game's real drawing code. It only reads data
// and draws into canvases the studio hands it; the only state it touches is the sandboxed frame's own (a
// throwaway career when a career screen needs one; storage there is in memory).
window.__RS = (() => {
  const RS = { version: typeof VERSION !== 'undefined' ? VERSION : '?' };
  const safe = (f, d) => { try { return f(); } catch (e) { return d; } };
  RS.ensureCareer = () => { if (!C) { C = freshCareer(); C.name = 'Reviewer'; C.seed = 4242; C.bracket = makeBracket(0); C.gamesPlayed = 3; C.wins = 2; } return C; };

  // ---------------------------------------------------------------- dialogue and text
  // A unit is one conversation (or one list) reviewed together; each line has its own key.
  // the same lines every time: pools that pick at random (greetings, some answers) use a fixed seed here
  const seeded = f => { const r = Math.random; let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; try { return f(); } finally { Math.random = r; } };
  RS.dialogue = () => seeded(dialogue);
  const dialogue = () => {
    RS.ensureCareer();
    const U = [], add = (group, key, title, lines, src) => U.push({ group, key, title, src, lines });
    const L = (sp, t) => ({ sp, text: t });
    const flat = lines => { const out = []; for (const l of lines) { if (l[0] === 'choice') { for (const [q, a] of l[1]) { out.push({ sp: 'you', text: q, choice: true }); for (const x of a) out.push(L(x[0], x[1])); } } else out.push(L(l[0], l[1])); } return out; };
    // story (career.js STORY + later additions)
    for (const k of Object.keys(STORY)) {
      const v = STORY[k];
      if (k === 'tips') { add('Story', 'story/tips', 'Elders’ tips before a game', v.map(t => L('elder', t)), 'career/career.js'); continue; }
      const isLines = a => Array.isArray(a) && a.length && Array.isArray(a[0]) && typeof a[0][0] === 'string';
      if (isLines(v)) add('Story', 'story/' + k, k, flat(v), 'career/career.js');
      else if (Array.isArray(v)) v.forEach((x, i) => isLines(x) && add('Story', 'story/' + k + '-' + i, k + ' ' + (i + 1), flat(x), 'career/career.js'));
    }
    // the sheikh: pools, talks and lessons
    for (const pool of Object.keys(SHEIKH_LINES)) { const v = SHEIKH_LINES[pool]; if (Array.isArray(v)) add('Sheikh', 'sheikh/' + pool, 'Sheikh pool: ' + pool, v.map(t => L('saleem', typeof t === 'string' ? t : String(t))), 'career/office.js'); }
    for (const t of SHEIKH_TALKS) safe(() => add(t.key.startsWith('lesson') ? 'Sheikh lessons' : 'Sheikh talks', 'sheikh-talk/' + t.key, t.key, flat([...t.open().map(l => ['saleem', l]), ['choice', t.choices.map(([q, a]) => [q, a.map(l => ['saleem', l])])]]), 'career/office.js'));
    // niyyah, partners, the musalla, milestone beats
    const nv = safe(() => rvScenes().find(s => s.group === 'Niyyah'), null);          // the same scene ?review=1 plays
    if (nv) add('Niyyah', 'niyyah', 'Before a game: the intention', flat(nv.lines), 'career/career-story.js');
    for (const id of Object.keys(PARTNER_STORY)) PARTNER_STORY[id].forEach((sc, i) => add('Partners', 'partner/' + id + '/' + i, castDef(id).name + ' ' + (i + 1), flat(sc), 'career/career-story.js'));
    for (const id of Object.keys(NEWS)) NEWS[id].forEach(n => safe(() => add('Musalla news', 'news/' + id + '/' + n.key, castDef(id).name + ': ' + n.topic, n.lines().map(l => L(id, l)), 'career/career-story.js')));
    for (const id of MUS_CAST) { const T = TALK[id]; if (!T) continue; safe(() => { const base = T.options.filter(o => !/^! /.test(o[0]));
      add('Musalla talks', 'talk/' + id, castDef(id).name, flat([[id, T.greet()], ['choice', base.map(([q, f]) => { let r = []; try { r = f(); } catch (e) {} return [q, r.map(l => [id, l])]; })]]), 'career/musalla.js'); }); }
    for (const b of BEATS) if (b.lines) add('Milestones', 'beat/' + b.id, b.label || b.id, flat(b.lines), 'career/progression.js');
    // the career intro
    add('Intro', 'intro/outside', 'Intro: outside the masjid', flat(INTRO_OUT), 'career/intro-world.js');
    for (const id of Object.keys(INTRO_CAST)) add('Intro', 'intro/gym/' + id, 'Intro: ' + castDef(id).name, flat(INTRO_CAST[id].lines), 'career/intro-world.js');
    add('Intro', 'intro/wrap', 'Intro: Saleem wraps up', flat(INTRO_WRAP), 'career/intro-world.js');
    // the neighbourhood (v9.2)
    if (typeof WORLD_LINES !== 'undefined') for (const id of Object.keys(WORLD_LINES)) WORLD_LINES[id].forEach((set, i) => add('Neighbourhood', 'npc/' + id + '/' + i, WORLD_NPC_LOOK[id].name + ' (day ' + (i + 1) + ')', set.map(([sp, t]) => L(sp, t)), 'career/world/world-scenes.js'));
    return U;
  };
  RS.speakerName = sp => sp === 'you' ? 'You' : sp === 'elder' ? 'An elder' : safe(() => castDef(sp).name, null) || (typeof WORLD_NPC_LOOK !== 'undefined' && WORLD_NPC_LOOK[sp] ? WORLD_NPC_LOOK[sp].name : sp);
  RS.trivia = () => TRIVIA.map((t, i) => ({ i, q: t[0], right: t[1][0], wrong: t[1].slice(1), why: (typeof TRIVIA_WHY !== 'undefined' && TRIVIA_WHY[i]) || '' }));
  RS.achievements = () => ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, desc: a.desc, icon: a.icon }));
  RS.noor = () => NOOR_FX.map(f => ({ id: f.id, name: f.name, mean: f.mean, desc: f.desc, col: f.col }));
  RS.taunts = () => TAUNTS.map(t => ({ id: t.id, name: t.name, pop: t.pop }));
  RS.tods = () => typeof TOD === 'undefined' ? [] : TOD.map(t => t.label);
  RS.calendar = () => typeof CAL_MONTHS === 'undefined' ? null : { months: CAL_MONTHS.slice(), weekdays: CAL_WEEKDAYS.slice(), holidays: CAL_HOLIDAYS.map(h => ({ name: h.name, m: h.m, day: h.day })) };

  // ---------------------------------------------------------------- sprites
  const people = () => {
    RS.ensureCareer();
    const out = [];
    for (const id of Object.keys(CAST)) { if (!CAST[id] && id !== 'jalal') continue; out.push({ key: 'cast/' + id, name: safe(() => castDef(id).name, id), def: () => castDef(id), team: () => id === 'jalal' ? rivalTeam(0) : amanahTeam() }); }
    out.push({ key: 'cast/you', name: 'Your player (default look)', def: () => playerDef(), team: () => amanahTeam() });
    TEAMS.forEach(T => T.players.forEach((p, i) => out.push({ key: 'team/' + T.short + '/' + i, name: p.name + ' (' + T.name + ')', def: () => p, team: () => T })));
    rivalTeam(0).players.forEach((p, i) => out.push({ key: 'team/' + rivalTeam(0).short + '/' + i, name: p.name + ' (Al-Burhan, rival)', def: () => p, team: () => rivalTeam(0) }));
    if (typeof WORLD_NPC_LOOK !== 'undefined') for (const id of Object.keys(WORLD_NPC_LOOK)) out.push({ key: 'npc/' + id, name: WORLD_NPC_LOOK[id].name + ' (neighbourhood)', def: () => Object.assign({ num: 0 }, WORLD_NPC_LOOK[id]), team: () => amanahTeam() });
    return out;
  };
  RS.people = () => people().map(p => ({ key: p.key, name: p.name }));
  RS.teams = () => TEAMS.concat([rivalTeam(0)]).map(T => ({ short: T.short, name: T.name, c1: T.c1, c2: T.c2, crest: T.crest, players: T.players.map(p => p.name) }));
  // draw a person: outfit 'thobe' or 'kit' (team colours), facing right or left, at (x, y) feet, scale s
  RS.drawPerson = (g, key, x, y, s, o = {}) => {
    const P_ = people().find(p => p.key === key); if (!P_) throw new Error('no person ' + key);
    let def = P_.def(); if (o.look) def = Object.assign({}, def, { look: Object.assign({}, def.look || {}, o.look) });
    g.save(); if (o.face === -1) { g.translate(x * 2, 0); g.scale(-1, 1); }
    drawPortrait(g, x, y, def, o.team ? (TEAMS.find(t => t.short === o.team) || P_.team()) : P_.team(), s, o.outfit === 'kit' ? null : 'thobe');
    g.restore();
  };
  // the creator's options, each shown on your player
  RS.creatorRows = () => CREATOR_ROWS.filter(r => r.sw || r.txt).map(r => ({ key: r.key, label: r.label, values: (r.sw || r.txt).map((v, i) => ({ i, label: r.txt ? r.txt[i] : null, col: r.sw ? v : null })) }));
  RS.drawCreator = (g, key, i, x, y, s, o = {}) => {
    RS.ensureCareer();
    const def = playerDef(), look = Object.assign({}, def.look, { [key]: i });
    if (key === 'cap' && !look.cap) look.cap = 0;
    const d2 = Object.assign({}, def, { look, hat: CAPKEYS[look.cap], skin: SKINS_ALL[look.skin], hair: HAIRS[look.hair] });
    g.save(); if (o.face === -1) { g.translate(x * 2, 0); g.scale(-1, 1); }
    drawPortrait(g, x, y, d2, amanahTeam(), s, o.outfit === 'kit' ? null : 'thobe'); g.restore();
  };
  RS.drawCrest = (g, short, x, y, r) => { const T = TEAMS.concat([rivalTeam(0), amanahTeam()]).find(t => t.short === short); drawCrest(g, x, y, r, T); };
  RS.venues = () => VENUE_LIST.map(v => ({ id: v.id, name: v.name, kind: v.kind }));
  RS.drawVenue = (g, id, w, h) => {                     // venueThumb's drawing, at full size (960x540)
    let v = VENUE_LIST.find(q => q.id === id);
    if (v.kind === 'outdoor') v = Object.assign({}, v, { time: v.time || 'sunset', surface: v.surface || 'asphalt' });
    const rw = W; W = 960; g.save(); g.scale(w / 960, h / 540);
    try {
      if (v.kind === 'classic') { const cx = cam.x; cam.x = 180; withPlane(g, K_BACK, FLOOR_TOP, () => drawArena(g, 0)); if (courtCv && !VL) drawFloorWarped(g, courtCv); withPlane(g, K_NEAR, NEAR_Y, () => drawNearSide(g)); cam.x = cx; }
      else { const L = buildVenueLayers(v, TEAMS[0], TEAMS[1], { rs: 1 }); const z0 = cam.zoom, fy0 = cam.fy; cam.zoom = 1; cam.fy = H / 2; try { composeVenue(g, L, 180, 0); } finally { cam.zoom = z0; cam.fy = fy0; } }
    } finally { W = rw; g.restore(); }
  };
  RS.balls = () => Object.keys(BALL_SKINS);
  RS.drawBall = (g, skin, x, y, r) => {
    const keep = Profile.load().equip.ball; Profile.load().equip.ball = skin;
    const [px, py] = P(640, BALL_R, 300), k = r / (BALL_R * depthK(300));
    g.save(); g.translate(x, y); g.scale(k, k); g.translate(-px, -py);
    try { drawBallAt(g, 640, BALL_R, 300, 0.6, false); } finally { Profile.load().equip.ball = keep; g.restore(); }
  };
  RS.worldProps = () => typeof WORLD_SCENES === 'undefined' ? [] : Object.values(WORLD_SCENES).flatMap(d => d.props.map(p => ({ scene: d.id, id: p.id, box: p.box })));
  RS.drawWorldProp = (g, scene, id, x, y, s, tod = 1) => { const d = WORLD_SCENES[scene], p = d.props.find(q => q.id === id); g.save(); g.translate(x, y); g.scale(s, s); p.draw(g, TOD[tod], tod, d, p); g.restore(); };
  // a whole neighbourhood scene, end to end, with its props (no people), the way worldDraw composes it
  RS.worldScenes = () => typeof WORLD_SCENES === 'undefined' ? [] : Object.values(WORLD_SCENES).map(d => ({ id: d.id, name: d.name || d.id, w: d.w }));
  RS.drawWorldPano = (g, scene, tod = 1) => {
    const def = WORLD_SCENES[scene], T = TOD[tod], keep = World.cache;
    try {
      const cache = worldCache(def, tod), vw = def.w;
      if (cache.layers.far) wDrawLayer(g, cache.layers.far, 0, vw);
      if (cache.layers.base) wDrawLayer(g, cache.layers.base, 0, vw);
      for (const v of cache.props.slice().sort((a, b) => a.p.d - b.p.d)) g.drawImage(v.cv, v.p.x - v.ax, wGroundY(def, v.p.d) - v.ay, v.w, v.h);
      if (cache.layers.fg) wDrawLayer(g, cache.layers.fg, 0, vw);
      if (T.tintA > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = T.tintA * (def.interior ? 0.55 : 1); g.fillStyle = T.tint; g.fillRect(0, 0, vw, H); g.restore(); }
      if (T.lights && cache.layers.glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = T.lights; wDrawLayer(g, cache.layers.glow, 0, vw); g.restore(); }
    } finally { World.cache = keep; }
  };
  // the masjid outside and the gym, each at no upgrades and every upgrade, drawn by the game
  RS.drawExteriorAt = (g, lvl, w, h) => { const U = {}; if (lvl) for (const p of PROJECTS.masjid) U[p.key] = p.tiers.length; g.save(); g.scale(w / 960, h / 540); const rw = W; W = 960; try { drawExterior(g, U, 0); } finally { W = rw; g.restore(); } };
  RS.drawHoop = (g, x, y, s) => {
    const h = hoops[1], [px, py] = P(h.x, RIM_Y, h.z);
    g.save(); g.translate(x, y); g.scale(s, s); g.translate(-px, -py);
    try { drawHoopBack(g, h); drawHoopFront(g, h, typeof gymUp === 'function' ? {} : undefined); } finally { g.restore(); }
  };
  // HUD elements: a seeded match, drawHUD into the given canvas; the studio crops regions
  RS.drawHud = (g, touch) => {
    const tm = Input.touchMode; Input.touchMode = !!touch;
    try {
      if (!RS._hudMatch) { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP); RS._hudMatch = true; M.teams[0].score = 12; M.teams[1].score = 9; }
      drawHUD(g);
    } finally { Input.touchMode = tm; }
  };
  return RS;
})();
