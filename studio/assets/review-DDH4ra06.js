const AGENT = "// Review Studio agent. Evaluated INSIDE the game frame (game.html), in the game's own global scope, so it sees the\n// game's top-level consts (STORY, TRIVIA, CAST, ...) and calls the game's real drawing code. It only reads data\n// and draws into canvases the studio hands it; the only state it touches is the sandboxed frame's own (a\n// throwaway career when a career screen needs one; storage there is in memory).\nwindow.__RS = (() => {\n  const RS = { version: typeof VERSION !== 'undefined' ? VERSION : '?' };\n  const safe = (f, d) => { try { return f(); } catch (e) { return d; } };\n  RS.ensureCareer = () => { if (!C) { C = freshCareer(); C.name = 'Reviewer'; C.seed = 4242; C.bracket = makeBracket(0); C.gamesPlayed = 3; C.wins = 2; } return C; };\n\n  // ---------------------------------------------------------------- dialogue and text\n  // A unit is one conversation (or one list) reviewed together; each line has its own key.\n  // the same lines every time: pools that pick at random (greetings, some answers) use a fixed seed here\n  const seeded = f => { const r = Math.random; let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; try { return f(); } finally { Math.random = r; } };\n  RS.dialogue = () => seeded(dialogue);\n  const dialogue = () => {\n    RS.ensureCareer();\n    const U = [], add = (group, key, title, lines, src) => U.push({ group, key, title, src, lines });\n    const L = (sp, t) => ({ sp, text: t });\n    const flat = lines => { const out = []; for (const l of lines) { if (l[0] === 'choice') { for (const [q, a] of l[1]) { out.push({ sp: 'you', text: q, choice: true }); for (const x of a) out.push(L(x[0], x[1])); } } else out.push(L(l[0], l[1])); } return out; };\n    // story (career.js STORY + later additions)\n    for (const k of Object.keys(STORY)) {\n      const v = STORY[k];\n      if (k === 'tips') { add('Story', 'story/tips', 'Elders’ tips before a game', v.map(t => L('elder', t)), 'career/career.js'); continue; }\n      const isLines = a => Array.isArray(a) && a.length && Array.isArray(a[0]) && typeof a[0][0] === 'string';\n      if (isLines(v)) add('Story', 'story/' + k, k, flat(v), 'career/career.js');\n      else if (Array.isArray(v)) v.forEach((x, i) => isLines(x) && add('Story', 'story/' + k + '-' + i, k + ' ' + (i + 1), flat(x), 'career/career.js'));\n    }\n    // the sheikh: pools, talks and lessons\n    for (const pool of Object.keys(SHEIKH_LINES)) { const v = SHEIKH_LINES[pool]; if (Array.isArray(v)) add('Sheikh', 'sheikh/' + pool, 'Sheikh pool: ' + pool, v.map(t => L('saleem', typeof t === 'string' ? t : String(t))), 'career/office.js'); }\n    for (const t of SHEIKH_TALKS) safe(() => add(t.key.startsWith('lesson') ? 'Sheikh lessons' : 'Sheikh talks', 'sheikh-talk/' + t.key, t.key, flat([...t.open().map(l => ['saleem', l]), ['choice', t.choices.map(([q, a]) => [q, a.map(l => ['saleem', l])])]]), 'career/office.js'));\n    // v9.22: the career story, every scene by chapter and ID (story-data.js), and the walks' talks\n    for (const S of Object.values(SC)) for (const k of ['lines', 'winLines', 'lossLines']) { const v = safe(() => typeof S[k] === 'function' ? S[k]() : S[k], null); if (v && v.length) add(S.ch <= 5 ? 'Chapter ' + S.ch : 'After the story', 'scene/' + S.id + (k === 'lines' ? '' : '/' + k), S.id + ' ' + S.name + (k === 'lines' ? '' : k === 'winLines' ? ' (win)' : ' (loss)'), flat(v), 'career/story/story-data.js'); }\n    for (const [wid, D] of Object.entries(STORY_WALKS)) for (const n of D.npcs) for (const k of ['lines', 'early']) { const v = n[k]; if (Array.isArray(v)) add('Walks', 'walk/' + wid + '/' + n.id + (k === 'early' ? '/early' : ''), wid + ' ' + safe(() => castDef(n.id).name, n.id) + (k === 'early' ? ' (too early)' : ''), flat(v), 'career/story/story-data.js'); }\n    for (const id of MUS_CAST) { const T = TALK[id]; if (!T) continue; safe(() => { const base = T.options.filter(o => !/^! /.test(o[0]));\n      add('Musalla talks', 'talk/' + id, castDef(id).name, flat([[id, T.greet()], ['choice', base.map(([q, f]) => { let r = []; try { r = f(); } catch (e) {} return [q, r.map(l => [id, l])]; })]]), 'career/musalla.js'); }); }\n    for (const b of BEATS) if (b.lines) add('Milestones', 'beat/' + b.id, b.label || b.id, flat(b.lines), 'career/progression.js');\n    return U;\n  };\n  RS.speakerName = sp => sp === 'you' ? 'You' : sp === 'elder' ? 'An elder' : safe(() => castDef(sp).name, null) || (typeof WORLD_NPC_LOOK !== 'undefined' && WORLD_NPC_LOOK[sp] ? WORLD_NPC_LOOK[sp].name : sp);\n  RS.trivia = () => TRIVIA.map((t, i) => ({ i, q: t[0], right: t[1][0], wrong: t[1].slice(1), why: (typeof TRIVIA_WHY !== 'undefined' && TRIVIA_WHY[i]) || '' }));\n  RS.achievements = () => ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, desc: a.desc, icon: a.icon }));\n  RS.noor = () => NOOR_FX.map(f => ({ id: f.id, name: f.name, mean: f.mean, desc: f.desc, short: f.short, col: f.col }));\n  RS.taunts = () => TAUNTS.map(t => ({ id: t.id, name: t.name, pop: t.pop }));\n  RS.tods = () => typeof TOD === 'undefined' ? [] : TOD.map(t => t.label);\n  RS.calendar = () => typeof CAL_MONTHS === 'undefined' ? null : { months: CAL_MONTHS.slice(), weekdays: CAL_WEEKDAYS.slice(), holidays: CAL_HOLIDAYS.map(h => ({ name: h.name, m: h.m, day: h.day })) };\n\n  // ---------------------------------------------------------------- sprites\n  const people = () => {\n    RS.ensureCareer();\n    const out = [];\n    for (const id of Object.keys(CAST)) { if (!CAST[id] || id === 'narr') continue; out.push({ key: 'cast/' + id, name: safe(() => castDef(id).name, id), def: () => castDef(id), team: () => id === 'jalal' ? rivalTeam(0) : amanahTeam() }); }\n    out.push({ key: 'cast/you', name: 'Your player (default look)', def: () => playerDef(), team: () => amanahTeam() });\n    TEAMS.forEach(T => T.players.forEach((p, i) => out.push({ key: 'team/' + T.short + '/' + i, name: p.name + ' (' + T.name + ')', def: () => p, team: () => T })));\n    if (typeof WORLD_NPC_LOOK !== 'undefined') for (const id of Object.keys(WORLD_NPC_LOOK)) out.push({ key: 'npc/' + id, name: WORLD_NPC_LOOK[id].name + ' (neighbourhood)', def: () => Object.assign({ num: 0 }, WORLD_NPC_LOOK[id]), team: () => amanahTeam() });\n    return out;\n  };\n  RS.people = () => people().map(p => ({ key: p.key, name: p.name }));\n  RS.defOf = key => { const p = people().find(q => q.key === key); if (!p) throw new Error('no person ' + key); return p.def(); };\n  RS.teams = () => TEAMS.map(T => ({ short: T.short, name: T.name, c1: T.c1, c2: T.c2, crest: T.crest, players: T.players.map(p => p.name) }));\n  // draw a person: outfit 'thobe' or 'kit' (team colours), facing right or left, at (x, y) feet, scale s\n  RS.drawPerson = (g, key, x, y, s, o = {}) => {\n    const P_ = people().find(p => p.key === key); if (!P_) throw new Error('no person ' + key);\n    let def = P_.def(); if (o.look) def = Object.assign({}, def, { look: Object.assign({}, def.look || {}, o.look) });\n    g.save(); if (o.face === -1) { g.translate(x * 2, 0); g.scale(-1, 1); }\n    drawPortrait(g, x, y, def, o.team ? (TEAMS.find(t => t.short === o.team) || P_.team()) : P_.team(), s, o.outfit === 'kit' ? null : 'thobe');\n    g.restore();\n  };\n  // the creator's options, each shown on your player\n  RS.creatorRows = () => CREATOR_ROWS.filter(r => r.sw || r.txt).map(r => ({ key: r.key, label: r.label, values: (r.sw || r.txt).map((v, i) => ({ i, label: r.txt ? r.txt[i] : null, col: r.sw ? v : null })) }));\n  RS.drawCreator = (g, key, i, x, y, s, o = {}) => {\n    RS.ensureCareer();\n    const def = playerDef(), look = Object.assign({}, def.look, { [key]: i });\n    if (key === 'cap' && !look.cap) look.cap = 0;\n    const d2 = Object.assign({}, def, { look, hat: CAPKEYS[look.cap], skin: SKINS_ALL[look.skin], hair: HAIRS[look.hair] });\n    g.save(); if (o.face === -1) { g.translate(x * 2, 0); g.scale(-1, 1); }\n    drawPortrait(g, x, y, d2, amanahTeam(), s, o.outfit === 'kit' ? null : 'thobe'); g.restore();\n  };\n  RS.drawCrest = (g, short, x, y, r) => { const T = TEAMS.concat([amanahTeam()]).find(t => t.short === short); drawCrest(g, x, y, r, T); };\n  RS.venues = () => VENUE_LIST.map(v => ({ id: v.id, name: v.name, kind: v.kind }));\n  RS.drawVenue = (g, id, w, h) => {                     // venueThumb's drawing, at full size (960x540)\n    let v = VENUE_LIST.find(q => q.id === id);\n    if (v.kind === 'outdoor') v = Object.assign({}, v, { time: v.time || 'sunset', surface: v.surface || 'asphalt' });\n    const rw = W; W = 960; g.save(); g.scale(w / 960, h / 540);\n    try {\n      if (v.kind === 'classic') { const cx = cam.x; cam.x = 180; withPlane(g, K_BACK, FLOOR_TOP, () => drawArena(g, 0)); if (courtCv && !VL) drawFloorWarped(g, courtCv); withPlane(g, K_NEAR, NEAR_Y, () => drawNearSide(g)); cam.x = cx; }\n      else { const L = buildVenueLayers(v, TEAMS[0], TEAMS[1], { rs: 1 }); const z0 = cam.zoom, fy0 = cam.fy; cam.zoom = 1; cam.fy = H / 2; try { composeVenue(g, L, 180, 0); } finally { cam.zoom = z0; cam.fy = fy0; } }\n    } finally { W = rw; g.restore(); }\n  };\n  RS.balls = () => Object.keys(BALL_SKINS);\n  RS.drawBall = (g, skin, x, y, r) => {\n    const keep = Profile.load().equip.ball; Profile.load().equip.ball = skin;\n    const [px, py] = P(640, BALL_R, 300), k = r / (BALL_R * depthK(300));\n    g.save(); g.translate(x, y); g.scale(k, k); g.translate(-px, -py);\n    try { drawBallAt(g, 640, BALL_R, 300, 0.6, false); } finally { Profile.load().equip.ball = keep; g.restore(); }\n  };\n  RS.worldProps = () => typeof WORLD_SCENES === 'undefined' ? [] : Object.values(WORLD_SCENES).flatMap(d => d.props.map(p => ({ scene: d.id, id: p.id, box: p.box })));\n  RS.drawWorldProp = (g, scene, id, x, y, s, tod = 1) => { const d = WORLD_SCENES[scene], p = d.props.find(q => q.id === id); g.save(); g.translate(x, y); g.scale(s, s); p.draw(g, TOD[tod], tod, d, p); g.restore(); };\n  // a whole neighbourhood scene, end to end, with its props (no people), the way worldDraw composes it\n  RS.worldScenes = () => typeof WORLD_SCENES === 'undefined' ? [] : Object.values(WORLD_SCENES).map(d => ({ id: d.id, name: d.name || d.id, w: d.w }));\n  RS.drawWorldPano = (g, scene, tod = 1) => {\n    const def = WORLD_SCENES[scene], T = TOD[tod], keep = World.cache;\n    try {\n      const cache = worldCache(def, tod), vw = def.w;\n      if (cache.layers.far) wDrawLayer(g, cache.layers.far, 0, vw);\n      if (cache.layers.base) wDrawLayer(g, cache.layers.base, 0, vw);\n      for (const v of cache.props.slice().sort((a, b) => a.p.d - b.p.d)) g.drawImage(v.cv, v.p.x - v.ax, wGroundY(def, v.p.d) - v.ay, v.w, v.h);\n      if (cache.layers.fg) wDrawLayer(g, cache.layers.fg, 0, vw);\n      if (T.tintA > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = T.tintA * (def.interior ? 0.55 : 1); g.fillStyle = T.tint; g.fillRect(0, 0, vw, H); g.restore(); }\n      if (T.lights && cache.layers.glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = T.lights; wDrawLayer(g, cache.layers.glow, 0, vw); g.restore(); }\n    } finally { World.cache = keep; }\n  };\n  // the masjid outside and the gym, each at no upgrades and every upgrade, drawn by the game\n  RS.drawExteriorAt = (g, lvl, w, h) => { const U = {}; if (lvl) for (const p of PROJECTS.masjid) U[p.key] = p.tiers.length; g.save(); g.scale(w / 960, h / 540); const rw = W; W = 960; try { drawExterior(g, U, 0); } finally { W = rw; g.restore(); } };\n  RS.drawHoop = (g, x, y, s) => {\n    const h = hoops[1], [px, py] = P(h.x, RIM_Y, h.z);\n    g.save(); g.translate(x, y); g.scale(s, s); g.translate(-px, -py);\n    try { drawHoopBack(g, h); drawHoopFront(g, h, typeof gymUp === 'function' ? {} : undefined); } finally { g.restore(); }\n  };\n  // HUD elements: a seeded match, drawHUD into the given canvas; the studio crops regions\n  RS.drawHud = (g, touch) => {\n    const tm = Input.touchMode; Input.touchMode = !!touch;\n    try {\n      if (RS._hudMatch !== M) { newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP); RS._hudMatch = M; M.teams[0].score = 12; M.teams[1].score = 9; }\n      drawHUD(g);\n    } finally { Input.touchMode = tm; }\n  };\n  return RS;\n})();\n";
const AGENT2 = "// Review Studio agent, Phase 2: animations and screens (and the Phase 3 sound list). Evaluated in the game frame after agent.game.js.\n// Animations run on the game's own simulation: a throwaway match, the move started with the game's own starter\n// (startDunk, startShot, doPass, startJump, trySteal, knockDown, startDribbleMove, taunts, reactions...), then\n// updateMatch(STEP) one step at a time, so animate() poses the rig exactly as in a game. Screens use the same\n// setups as the phone text audit (tests/phone-audit.mjs SCREENS) plus a few of the studio's own.\n(() => {\n  const RS = window.__RS;\n\n  // ---------------------------------------------------------------- the game's frame loop: hold it while recording\n  const raf = window.requestAnimationFrame.bind(window);\n  let hold = false, held = null;\n  window.requestAnimationFrame = cb => { if (hold && cb === frame) { held = cb; return 0; } return raf(cb); };\n  RS.freeze = on => { if (on) { hold = true; return; } if (!hold) return; hold = false; if (held) { const h = held; held = null; lastT = 0; raf(h); } };\n  RS.frozen = () => hold;\n\n  // a fixed random sequence while an animation records, so every playback is the same\n  const realRandom = Math.random;\n  const seed = n => { let s = n >>> 0 || 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };\n  const unseed = () => { Math.random = realRandom; };\n\n  // ---------------------------------------------------------------- animations\n  const toward = (me) => -attackHoop(me.team).dir;                 // stick x that runs at the hoop\n  const run = (k, turbo) => (me, t, c) => { c.mx = toward(me) * k; c.turbo = !!turbo; };\n  const A = [];\n  const add = (group, id, name, o) => A.push(Object.assign({ group, id, name, n: 120, dist: 330, ball: false, needBall: false, follow: false, hoop: false }, o));\n  add('Stand and move', 'idle/default', 'Idle', { n: 150 });\n  add('Stand and move', 'walk/default', 'Walk', { n: 150, dist: 700, follow: true, cmd: run(0.3) });\n  add('Stand and move', 'run/default', 'Run', { n: 120, dist: 800, follow: true, cmd: run(1) });\n  add('Stand and move', 'sprint/default', 'Sprint (turbo)', { n: 120, dist: 900, follow: true, cmd: run(1, true) });\n  add('Dribble', 'dribble/stride', 'Dribble, Stride style (NBA Jam pace)', { n: 150, dist: 800, ball: true, needBall: true, follow: true, cmd: run(0.8), setup: () => { SETTINGS.dribble = 'stride'; } });\n  add('Dribble', 'dribble/standing', 'Dribble in place', { n: 150, ball: true, needBall: true, setup: () => { SETTINGS.dribble = 'stride'; } });\n  // (v9.16.1: the crossover from the far hand, between the legs from the near hand; 'drop' is now the hop step)\n  for (const [k, nm, hand] of [['cross', 'Crossover', 'f'], ['btl', 'Between the legs', 'n'], ['btb', 'Behind the back'], ['spin', 'Spin move'], ['hesi', 'Hesitation'], ['stepback', 'Step-back'], ['drop', 'Hop step (was the drop step)']]) {\n    const still = k === 'stepback' || k === 'drop';   // (standing start, fixed camera: the step back and the hop show how far they go)\n    add('Dribble moves', 'move/' + k, nm, { n: 70, dist: k === 'drop' ? 260 : 520, ball: true, needBall: true, follow: !still, cmd: still ? null : run(0.6), at: 12, start: c => { if (hand) { c.me.dh = hand; c.me.move = null; } startDribbleMove(c.me, k === 'btl' ? 'cross' : k, 1); } }); }\n  add('Dribble moves', 'pickup/default', 'Pump fake: picks up the dribble', { n: 90, ball: true, needBall: true, at: 10, start: c => startFake(c.me) });\n  for (const [k, d, nm] of [['jumper', 330, 'Jump shot'], ['fade', 260, 'Fadeaway'], ['floater', 200, 'Floater'], ['hook', 150, 'Hook shot'], ['layup', 80, 'Layup'], ['reverse', 60, 'Reverse layup'], ['upunder', 80, 'Up and under']])\n    add('Shots', 'shoot/' + k, nm, { n: 110, dist: d, ball: true, needBall: true, hoop: true, at: 8, start: c => { startShot(c.me); applyShotType(c.me, k); if (typeof TYPE_JUMP !== 'undefined' && TYPE_JUMP[k]) c.me.jumpVy = TYPE_JUMP[k]; } });\n  // startDunk picks the dunk type at random; set the one we want and give it that type's length, as startDunk does\n  const DUNK_K = typeof DUNK_LEN !== 'undefined' ? DUNK_LEN : { windmill: 1.08, '360': 1.12, twohand: 0.94 };\n  const dunk = (type, d, style) => c => {\n    if (style) SETTINGS.tomahawk = style;\n    const h = attackHoop(c.me.team), dd = dxz(c.me, h);\n    startDunk(c.me, {});\n    const a = c.me.act, baseD = clamp(0.6 + dd / 450, 0.62, 1.15);\n    a.type = type; a.D = baseD * (DUNK_K[type] || 1); a.peak = 64 + (a.D - 0.7) * 30 + (typeof dunkPeakAdd === 'function' ? dunkPeakAdd(type) : type === '360' ? 8 : 0);\n    if (style) a.big = true;\n  };\n  add('Dunks', 'dunk/twohand', 'Two-hand dunk', { n: 120, dist: 90, ball: true, needBall: true, hoop: true, at: 6, start: dunk('twohand') });\n  add('Dunks', 'dunk/windmill', 'Windmill', { n: 130, dist: 150, ball: true, needBall: true, hoop: true, at: 6, start: dunk('windmill') });\n  add('Dunks', 'dunk/360', '360', { n: 140, dist: 200, ball: true, needBall: true, hoop: true, at: 6, start: dunk('360') });\n  add('Dunks', 'dunk/reverse', 'Reverse dunk (back to the rim, backhand)', { n: 130, dist: 130, ball: true, needBall: true, hoop: true, at: 6, start: dunk('reverse') });   // v9.21.0\n  add('Dunks', 'dunk/betweenlegs', 'Between the legs', { n: 140, dist: 200, ball: true, needBall: true, hoop: true, at: 6, start: dunk('betweenlegs') });   // v9.21.0\n  for (const st of (typeof TOMAHAWK_KEPT !== 'undefined' ? TOMAHAWK_KEPT : typeof TOMAHAWK_STYLES !== 'undefined' ? TOMAHAWK_STYLES : ['classic']))   // (v9.16.1: Float only)\n    add('Dunks', 'dunk/tomahawk-' + st, 'Tomahawk, ' + st[0].toUpperCase() + st.slice(1) + ' style', { n: 130, dist: 170, ball: true, needBall: true, hoop: true, at: 6, start: dunk('tomahawk', 170, st) });\n  add('Dunks', 'dunk/alley', 'Alley-oop (catch and dunk)', { n: 150, dist: 190, ball: false, hoop: true, at: 6,\n    setup: c => { const h = attackHoop(c.me.team); place(c.mate, h.x + h.dir * 420, h.z + 140); giveBall(c.mate, 'inbound'); },\n    start: c => doPass(c.mate, c.me, true) });\n  add('Dunks', 'hang/default', 'Hang on the rim', { n: 90, dist: 90, ball: true, needBall: true, hoop: true, at: 1, start: dunk('twohand'), until: c => c.me.state === 'hang' });\n  for (const k of ['chest', 'bounce', 'lead', 'alley'])\n    add('Passes', 'pass/' + k, { chest: 'Chest pass', bounce: 'Bounce pass', lead: 'Lead pass', alley: 'Alley-oop lob' }[k], { n: 60, ball: true, needBall: true, at: 8,\n      setup: c => { const h = attackHoop(c.me.team); place(c.mate, c.me.x - h.dir * 120, c.me.z + 150); c.mate.state = 'free'; },\n      start: c => { doPass(c.me, c.mate, k === 'alley'); c.me.state = 'pass'; c.me.st_t = 0; c.me.passKind = k; } });\n  add('Defense', 'steal/default', 'Steal (reach in)', { n: 60, at: 10,\n    setup: c => { place(c.o1, c.me.x - attackHoop(c.me.team).dir * 40, c.me.z); c.o1.face = -c.me.face; giveBall(c.o1, 'inbound'); },\n    start: c => trySteal(c.me) });\n  add('Defense', 'block/default', 'Block (jump)', { n: 80, at: 8, start: c => startJump(c.me) });\n  // (v9.17.10: 'shove/default' retired with the shove)\n  add('Defense', 'ankles/default', 'Ankle break (crossed up)', { n: 70, dist: 520, follow: true, cmd: run(0.5), at: 10, start: c => { c.me.stumble = 0.55; c.me.shook = 0.47; c.me.shookDir = { x: attackHoop(c.me.team).dir, z: 0 }; } });\n  add('Falls', 'fall/default', 'Knocked down, and getting up', { n: 160, at: 8, start: c => knockDown(c.me, attackHoop(c.me.team).dir, 0) });\n  add('Celebrate', 'celebrate/default', 'Celebration (arm up)', { n: 120, at: 4, start: c => { c.me.celebrate = 1.6; } });\n  for (const t of (typeof TAUNTS !== 'undefined' ? TAUNTS : []).filter(t => !t.retired))\n    add('Taunts', 'taunt/' + t.id, 'Taunt: ' + t.name, { n: t.id === 'sujood' ? 150 : 110, at: 6, start: c => { c.me.taunt = { k: t.id, t0: M.time, dur: t.id === 'sujood' ? 1.9 : 1.3 }; } });\n  for (const [k, nm] of [['nod', 'Nod'], ['headDown', 'Head down'], ['handsHead', 'Hands on head']])   // (v9.16.1: Arms up and Fist pump retired)\n    add('Reactions', 'react/' + k, 'Reaction: ' + nm, { n: 90, at: 6, start: c => react(c.me, k, 1.2) });\n  RS.anims = () => A.map(a => ({ id: a.id, name: a.name, group: a.group, n: a.n, ball: a.ball, needBall: a.needBall, hoop: a.hoop }));\n\n  // one recording session at a time: { a, c, f, joints }\n  let S = null;\n  RS.animStart = (id, o = {}) => {\n    const a = A.find(x => x.id === id); if (!a) throw new Error('no animation ' + id);\n    RS.freeze(true); seed(4242);\n    const flip = !!o.flip, def = o.who ? RS.defOf(o.who) : null;\n    const T0 = Object.assign({}, TEAMS[0]), T1 = Object.assign({}, TEAMS[1]);\n    if (def) { if (flip) T1.players = [def, T1.players[1]]; else T0.players = [def, T0.players[1]]; }\n    newMatch(T0, T1, { humans: [], fmt: { format: 'first21', target: 99, len: 120, sc: 0 } });\n    const team = M.teams[flip ? 1 : 0], other = M.teams[flip ? 0 : 1];\n    const c = { me: team.players[0], mate: team.players[1], o1: other.players[0], o2: other.players[1] };\n    Object.assign(M, { phase: 'live', inb: null, check: null, bc: null, nextInbound: null, sideOut: null, ft: null, pendingEnd: false, introT: 0 });\n    M.taunt = null;\n    for (const q of M.players) { q.hifzUsed = true; q.pick = null; }\n    const h = attackHoop(c.me.team);\n    for (const q of M.players) if (q !== c.me) place(q, h.x + h.dir * 1000, 620);\n    place(c.me, h.x + h.dir * a.dist, h.z); c.me.face = sgn(h.x - c.me.x); c.me.turbo = 100;\n    Object.assign(ball, { shot: null, pass: null, vx: 0, vy: 0, vz: 0, grabLock: 0 });\n    if (a.needBall || (a.ball && o.ball !== false) || (!a.ball && o.ball)) giveBall(c.me, 'inbound');\n    else { ball.owner = null; ball.state = 'loose'; ball.x = h.x + h.dir * 1000; ball.z = 600; ball.y = BALL_R; ball.grabLock = 99; }\n    if (a.setup) a.setup(c);\n    M.cmdHook = q => { zeroCmd(q.cmd); if (q === c.me && a.cmd) a.cmd(q, S ? S.f * STEP : 0, q.cmd); return true; };\n    c.x0 = c.me.x; c.z0 = c.me.z; c.hx = h.x; c.hz = h.z;\n    S = { a, c, f: 0, started: false };\n    if (a.until) { a.start(c); S.started = true; for (let i = 0; i < 400 && !a.until(c); i++) stepSim(); S.f = 0; c.x0 = c.me.x; }\n    return RS.animInfo();\n  };\n  const stepSim = () => {\n    updateMatch(STEP);\n    if (M.deadT != null && M.phase !== 'live') M.deadT = Math.max(M.deadT, 1);     // no inbound reset in the middle of a move\n    M.shotClock = scReset();\n    for (const t of M.teams) t.score = 0;\n  };\n  RS.animStep = () => {\n    if (!S) return null;\n    if (!S.started && S.f >= (S.a.at || 0) && S.a.start) { S.a.start(S.c); S.started = true; }\n    stepSim(); S.f++;\n    return RS.animInfo();\n  };\n  RS.animInfo = () => {\n    if (!S) return null; const me = S.c.me;\n    return { id: S.a.id, f: S.f, n: S.a.n, state: me.state, st: Math.round(me.st_t * 1000) / 1000, y: Math.round(me.y * 10) / 10, rot: Math.round((me.rot || 0) * 1000) / 1000,\n      spin: Math.round((me.spin || 0) * 1000) / 1000, face: me.face, joints: JOINTS.map(k => [k, Math.round(me.j[k].a * 1000) / 1000]), holding: ball.owner === me };\n  };\n  RS.animStop = () => { S = null; M.cmdHook = null; unseed(); };\n  // draw the current frame: the player (and anyone near him), the ball, the hoop for shots and dunks\n  RS.animDraw = (g, w, h) => {\n    if (!S) return; const c = S.c, a = S.a;\n    const fx = FX.sx, fy = FX.sy; FX.sx = FX.sy = 0;\n    const ax = a.follow ? c.me.x : a.hoop ? (c.x0 + c.hx) / 2 : c.x0;\n    const [sx, sy] = P(ax, 0, c.z0);\n    g.save();\n    try {\n      g.translate(Math.round(w / 2 - sx), Math.round(h - 34 - sy));\n      // a strip of floor so the feet have something to stand on\n      const [l] = P(ax - 600, 0, c.z0), [r] = P(ax + 600, 0, c.z0);\n      g.fillStyle = 'rgba(128,128,128,0.18)'; g.fillRect(l, sy - 2, r - l, 34); g.fillStyle = 'rgba(128,128,128,0.45)'; g.fillRect(l, sy, r - l, 1);\n      const hoop = a.hoop ? hoops.find(x => x === attackHoop(c.me.team)) : null;\n      if (hoop) drawHoopBack(g, hoop);\n      const near = M.players.filter(q => Math.abs(q.x - ax) < 420).sort((p, q) => p.z - q.z);\n      for (const q of near) drawShadow(g, q.x, q.y, q.z, 16);\n      const bz = ball.z;\n      for (const q of near) { if (ball.owner !== q && bz < q.z && Math.abs(ball.x - ax) < 420) { drawBall(g); } drawPlayer(g, q); }\n      if (Math.abs(ball.x - ax) < 420 && !(ball.owner && near.includes(ball.owner) && bz < ball.owner.z)) drawBall(g);\n      if (hoop) drawHoopFront(g, hoop, {});\n    } finally { g.restore(); FX.sx = fx; FX.sy = fy; }\n  };\n\n  // ---------------------------------------------------------------- screens\n  // v9.13: overlays one setup leaves behind (a dialog, a tutorial card, a toast, a menu) don't show on the next one\n  RS.clearOverlays = () => {\n    Game.confirm = null; Game.toastT = 0; Game.hubMenu = null;\n    if (typeof TUT !== 'undefined' && TUT.on) { TUT.on = false; if (typeof M !== 'undefined' && M) M.cmdHook = null; }\n    if (typeof _achQ !== 'undefined') _achQ.length = 0;\n    if (typeof Replay !== 'undefined') Replay.active = null;\n    if (typeof NetReport !== 'undefined' && NetReport.close) try { NetReport.close(); } catch (e) {}\n  };\n  RS.screenSetup = js => {\n    RS.animStop(); RS.freeze(false);\n    const A_ = window.__audit; A_.on = false; A_.found.clear();\n    const e0 = window.__studioErrors.length;\n    try { Game.paused = false; Game.trivia = null; RS.clearOverlays(); (0, eval)(js); } catch (e) { return { error: String(e && e.message || e), screen: Game.screen }; }\n    A_.screen = 'studio';\n    return { screen: Game.screen, e0 };\n  };\n  RS.auditOn = () => { window.__audit.on = true; };\n  RS.auditResult = e0 => {\n    const A_ = window.__audit; A_.on = false;\n    const found = [...A_.found.values()].map(f => ({ kind: f.kind, text: f.text, css: f.css, left: f.left, right: f.right, width: f.width }));\n    // tap targets that overlap each other (Game.rects, in game coordinates)\n    const R = (Game.rects || []).filter(r => r.w > 2 && r.h > 2), over = [];\n    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {\n      const a = R[i], b = R[j], ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);\n      if (ix <= 1 || iy <= 1) continue;\n      const small = Math.min(a.w * a.h, b.w * b.h);\n      if (ix * iy >= small * 0.98) continue;                       // one fully inside the other: a panel and its button\n      over.push({ a: [a.x, a.y, a.w, a.h].map(Math.round), b: [b.x, b.y, b.w, b.h].map(Math.round), area: Math.round(ix * iy) });\n    }\n    return { found, overlaps: over.slice(0, 40), nOverlaps: over.length, rects: R.map(r => [r.x, r.y, r.w, r.h].map(Math.round)), errors: window.__studioErrors.slice(e0 || 0), screen: Game.screen, W };\n  };\n  // the touch controls (DOM buttons over the canvas) must not cover the scoreboard\n  RS.touchOverScoreboard = () => {\n    if (typeof TouchUI === 'undefined' || typeof PhoneHUD === 'undefined' || !PhoneHUD.board || !TouchUI.btns) return [];\n    const B = PhoneHUD.board, cr = canvas.getBoundingClientRect(), k = cr.width / W;\n    const sb = { l: cr.left + B.x * k, t: cr.top + B.y * k, r: cr.left + (B.x + B.w) * k, b: cr.top + (B.y + B.h) * k };\n    return Object.entries(TouchUI.btns).map(([n, el]) => [n, el.getBoundingClientRect()]).filter(([, q]) => q.width && q.left < sb.r && q.right > sb.l && q.top < sb.b && q.bottom > sb.t).map(([n]) => n);\n  };\n\n  // ---------------------------------------------------------------- sounds (Phase 3 scaffold)\n  RS.sounds = () => Object.keys(SFX).filter(k => typeof SFX[k] === 'function' && SFX[k].length === 0 && !['init', 'resume', 'setOn', 'tone', 'hiss', 'setCrowdLevel'].includes(k) && !/^_/.test(k));\n  RS.playSound = k => { const on = SETTINGS.sound; SETTINGS.sound = true; try { SFX.init && SFX.init(); SFX.resume && SFX.resume(); SFX.setOn && SFX.setOn(true); SFX[k](); } finally { setTimeout(() => { SETTINGS.sound = on; }, 1500); } };\n})();\n";
const AGENT3 = "// Review Studio agent, v9.13: sounds, variants and the crowd. Evaluated in the game frame after agent2.game.js.\n// The studio's own AudioContext (made on a click in the studio, so the browser lets it play) is handed to the game, and\n// everything after that is the game's own sound code.\n(() => {\n  const RS = window.__RS;\n  const V = id => VENUE_LIST.find(v => v.id === id);\n  // the crowd presets: each a venue as a match would have it (career numbers where they differ)\n  RS.CROWD_PRESETS = [\n    ['practice', 'Practice gym (drills, the gym on a free day)', () => [null, { practice: 'free' }]],\n    ['home-10', 'Masjid Al-Amanah gym, early career (10 people)', () => [makeVenue(V('home'), { crowd: 10, host: 0, level: 0.3 })]],\n    ['home-22', 'Masjid Al-Amanah gym, built up (22 people)', () => [makeVenue(V('home'), { crowd: 22, host: 0, level: 0.3 })]],\n    ['gymS-12', 'Small masjid room, away (12 people)', () => [makeVenue(V('gymS'), { crowd: 12, level: 0.32 })]],\n    ['gymS-22', 'Small masjid room, Quick Play (22)', () => [makeVenue(V('gymS'))]],\n    ['gymM-25', 'Masjid gym, away early career (25)', () => [makeVenue(V('gymM'), { crowd: 25, level: 0.32 })]],\n    ['gymM-80', 'Masjid gym, Quick Play (80)', () => [makeVenue(V('gymM'))]],\n    ['outdoor-24', 'Outdoor court (24)', () => [makeVenue(V('out_' + BACKDROPS[0]), { crowd: 24, time: 'afternoon' })]],\n    ['classic', 'Masjid League Arena (Quick Play default)', () => [null]],\n    ['regional-early', 'Regional arena, career stage 1 (crowd 150)', () => [makeVenue(V('arena_regional'), { crowd: 150, fill: 0.25 })]],\n    ...Object.keys(ARENAS).map(t => ['arena-' + t, ARENAS[t].name + ' (full)', () => [makeVenue(V('arena_' + t))]])\n  ];\n  RS.crowdPresets = () => RS.CROWD_PRESETS.map(([key, name]) => ({ key, name }));\n  // audio: use the studio's context\n  RS.audioWith = ctx => {\n    SETTINGS.sound = true;\n    if (!SFX.ctx) { const AC = window.AudioContext, WAC = window.webkitAudioContext; window.AudioContext = function () { return ctx; }; window.webkitAudioContext = window.AudioContext; try { SFX.init(); } finally { window.AudioContext = AC; window.webkitAudioContext = WAC; } }\n    SFX.setOn && SFX.setOn(true);\n    if (!RS.crowdOn && !(RS.mix && RS.mix.on)) SFX.setSolo && SFX.setSolo(true);   // only what the studio plays, not the match behind the title\n    return !!SFX.ctx;\n  };\n  RS.sfxIds = () => SFX_IDS.slice();\n  RS.variants = id => Object.entries(SFX_VARIANTS[id] || {}).map(([k, v]) => ({ key: k, label: v.label, sample: !!v.samples, db: (SFX_LEVELS[id] && SFX_LEVELS[id][k]) || 0 }));\n  RS.where = id => SFX_WHERE[id] || '';\n  RS.styles = () => Object.assign({}, SFX_STYLES);\n  // play one variant, as the game would (level matched); the crowd hears as a big arena (tier 4) unless a venue is set up\n  RS.playVariant = (id, k, args) => {\n    SFX.force = { [id]: k }; if (id === 'cheer' && !CrowdA.force && !RS.crowdOn) CrowdA.force = { n: 999, room: 'none' };\n    try { SFX[id].apply(SFX, args || []); } finally { SFX.force = null; if (!RS.crowdOn) CrowdA.force = null; }\n  };\n  // ---- crowd: set up a match at a preset venue (the screen shows it), then trigger what a match there would play\n  RS.crowdSetup = key => {\n    const P = RS.CROWD_PRESETS.find(x => x[0] === key); if (!P) return null;\n    const [venue, opts] = P[2](); RS.clearOverlays && RS.clearOverlays();\n    newMatch(TEAMS[0], TEAMS[1], Object.assign({ humans: [], venue }, opts || {}));\n    Game.screen = 'play'; Game.paused = false; M.introT = 0; M.attract = false; M.cmdHook = q => { zeroCmd(q.cmd); return true; };\n    RS.crowdOn = true; CrowdA.force = null; SFX.setSolo && SFX.setSolo(false); CrowdA.tick(true);\n    return RS.crowdInfo();\n  };\n  RS.crowdInfo = () => ({ audience: CrowdA.n, tier: CrowdA.tier, room: CrowdA.room, roomOn: !!SETTINGS.room, levels: CrowdA.levels(), venue: M.venue ? M.venue.name || M.venue.id : M.gym ? 'Practice gym' : 'Masjid League Arena', stats: Object.assign({}, CrowdA.stats) });\n  RS.crowdTrigger = kind => {\n    const h = hoops[1];\n    if (kind === 'make') { SFX.netSwish(0.8); SFX.cheer(0.9, 0.2); }\n    else if (kind === 'dunk') { SFX.slam(); SFX.cheer(1.6, 0.22); FX.hype && FX.hype(1); }\n    else if (kind === 'buzzer') { SFX.netSwish(1.1); SFX.buzzer(); SFX.cheer(2, 0.22); FX.hype && FX.hype(1); }\n    else if (kind === 'miss') { SFX.clank(1); crowdGroan(0.9); }\n    else if (kind === 'block') { SFX.block(); SFX.crowd('ooh', 1, 0.02); SFX.cheer(1, 0.16); }\n    else if (kind === 'turnover') { SFX.whistle(); SFX.crowd('groan', 0.6, 0.15); }\n    void h; return RS.crowdInfo();\n  };\n  RS.crowdOff = () => { RS.crowdOn = false; CrowdA.force = null; M.cmdHook = null; SFX.setSolo && SFX.setSolo(true); };\n  // ---- the mix test: a CPU match at the venue, at normal speed, for 60 s, with a level per bus\n  RS.mix = { on: false };\n  RS.mixStart = key => {\n    RS.crowdSetup(key); M.cmdHook = null; M.clock = 60; RS.mix = { on: true, t0: performance.now() };\n    return RS.crowdInfo();\n  };\n  RS.mixStop = () => { RS.mix.on = false; RS.crowdOff(); goTitle(); };\n  RS.setBus = (name, v) => {\n    const t = SFX.ctx && SFX.ctx.currentTime;\n    if (!SFX.ctx) return false;\n    if (name === 'master' && SFX.master) SFX.master.gain.setTargetAtTime(v, t, 0.02);\n    if (name === 'fx' && SFX.out) SFX.out.gain.setTargetAtTime(0.55 * v, t, 0.02);\n    if (name === 'crowd' && SFX.crowdVol) SFX.crowdVol.gain.setTargetAtTime(v, t, 0.02);\n    if (name === 'people' && SFX.crowdFx) SFX.crowdFx.gain.setTargetAtTime(v, t, 0.02);\n    if (name === 'room' && SFX.roomWet) SFX.roomWet.gain.setTargetAtTime(v * ((ROOMS[CrowdA.room] || [0, 0])[1]), t, 0.02);\n    return true;\n  };\n  // ---- the words a screen draws (for the screen census: word count, numbers, shared numbers)\n  { const P = CanvasRenderingContext2D.prototype, f0 = P.fillText;\n    P.fillText = function (t) { try { if (window.__rsTexts && this.canvas && this.canvas.id === 'game' && this.globalAlpha > 0.05 && String(t).trim()) window.__rsTexts.add(String(t).trim()); } catch (e) {} return f0.apply(this, arguments); }; }\n  RS.textsOn = () => { window.__rsTexts = new Set(); };\n  RS.textsOff = () => { const t = [...(window.__rsTexts || [])]; window.__rsTexts = null; return { texts: t, taps: (Game.rects || []).filter(r => r.w > 2 && r.h > 2 && r.w < W - 4).length, screen: Game.screen }; };\n  RS.setRoom = on => { SETTINGS.room = !!on; CrowdA.tick(true); return RS.crowdInfo(); };\n})();\n";
async function openGame(host) {
  const f = document.createElement("iframe");
  f.id = "gameframe";
  f.title = "game (render worker)";
  f.src = "game.html";
  f.setAttribute("aria-hidden", "true");
  f.tabIndex = -1;
  host.appendChild(f);
  await new Promise((res) => f.addEventListener("load", res, { once: true }));
  const G = f.contentWindow;
  const ready = () => {
    try {
      return G.eval("typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking'");
    } catch (e) {
      return false;
    }
  };
  for (let i = 0; i < 400 && !ready(); i++) await new Promise((r) => setTimeout(r, 50));
  if (!ready()) throw new Error("the game frame did not start");
  G.eval(AGENT);
  G.eval(AGENT2);
  G.eval(AGENT3);
  G.eval('SETTINGS.sound = false; try { localStorage.setItem("islamdunk.portraitOK", "1"); } catch (e) {}');
  const api = {
    frame: f,
    win: G,
    rs: G.__RS,
    eval: (s) => G.eval(s),
    errors: () => G.__studioErrors.slice(),
    canvas: () => G.document.getElementById("game"),
    // resize the frame (CSS px) and let the game lay itself out again
    async size(w, h, touch) {
      f.style.width = w + "px";
      f.style.height = h + "px";
      host.style.width = w + "px";
      host.style.height = h + "px";
      await frames(G, 3);
      G.eval("Input.touchMode = " + (touch ? "true" : "false"));
      await frames(G, 2);
    },
    frames: (n) => frames(G, n)
  };
  return api;
}
function frames(G, n = 1) {
  return new Promise((res) => {
    let k = 0, done = false;
    const fin = () => {
      if (!done) {
        done = true;
        res();
      }
    };
    const tick = () => {
      if (++k >= n) fin();
      else G.requestAnimationFrame(tick);
    };
    G.requestAnimationFrame(tick);
    setTimeout(fin, 60 * n + 120);
  });
}
const STORE_KEY = "islamdunk.studio";
const ROLES = ["Content/religious", "Art", "Gameplay", "Other"];
const FIELDS = ["verdict", "comment", "suggested", "merge", "pick"];
const isEmpty = (m) => !FIELDS.some((f) => m[f]);
function createStore(storage = window.localStorage) {
  let s;
  try {
    s = JSON.parse(storage.getItem(STORE_KEY) || "null");
  } catch (e) {
    s = null;
  }
  if (!s || s.v !== 1) s = { v: 1, reviewer: { name: "", role: ROLES[0] }, lastReviewed: "phase1", marks: {}, conflicts: [], ui: {} };
  const undo = [], subs = /* @__PURE__ */ new Set();
  const save = () => {
    try {
      storage.setItem(STORE_KEY, JSON.stringify(s));
    } catch (e) {
      console.warn("could not save marks", e);
    }
    for (const f of subs) f();
  };
  const who = () => (s.reviewer.name || "").trim() || "reviewer";
  const st = {
    get state() {
      return s;
    },
    who,
    on(f) {
      subs.add(f);
      return () => subs.delete(f);
    },
    mark(id, reviewer = who()) {
      return s.marks[id] && s.marks[id][reviewer] || null;
    },
    marksFor(id) {
      return s.marks[id] || {};
    },
    // set fields of the current reviewer's mark on an item
    set(id, patch, { record = true } = {}) {
      const r = who(), cur = st.mark(id, r), prev = cur ? Object.assign({}, cur) : null;
      const next = Object.assign({ verdict: "", comment: "", suggested: "", merge: "", pick: "" }, cur || {}, patch, { at: (/* @__PURE__ */ new Date()).toISOString(), role: s.reviewer.role });
      const empty = isEmpty(next);
      s.marks[id] = s.marks[id] || {};
      if (empty) delete s.marks[id][r];
      else s.marks[id][r] = next;
      if (!Object.keys(s.marks[id]).length) delete s.marks[id];
      if (record) undo.push({ id, r, prev });
      save();
    },
    pushUndo(id, prev) {
      undo.push({ id, r: who(), prev: prev ? Object.assign({}, prev) : null });
    },
    undo() {
      const u = undo.pop();
      if (!u) return null;
      s.marks[u.id] = s.marks[u.id] || {};
      if (u.prev) s.marks[u.id][u.r] = u.prev;
      else delete s.marks[u.id][u.r];
      if (!Object.keys(s.marks[u.id]).length) delete s.marks[u.id];
      save();
      return u.id;
    },
    setReviewer(name, role) {
      s.reviewer = { name: name != null ? name : s.reviewer.name, role: role || s.reviewer.role };
      save();
    },
    setLastReviewed(v) {
      s.lastReviewed = v || "phase1";
      save();
    },
    setUi(k, v) {
      s.ui[k] = v;
      try {
        storage.setItem(STORE_KEY, JSON.stringify(s));
      } catch (e) {
      }
    },
    // import: add marks from rows { id, reviewer, role, verdict, comment, suggested, at }; newest at wins; returns a report
    merge(rows, source) {
      const rep = { added: 0, updated: 0, same: 0, kept: 0, conflicts: [] };
      for (const r of rows) {
        if (isEmpty(r)) continue;
        const rv = r.reviewer || who(), cur = st.mark(r.id, rv), inc = { verdict: r.verdict || "", comment: r.comment || "", suggested: r.suggested || "", merge: r.merge || "", pick: r.pick || "", at: r.at || (/* @__PURE__ */ new Date()).toISOString(), role: r.role || "" };
        if (!cur) {
          s.marks[r.id] = s.marks[r.id] || {};
          s.marks[r.id][rv] = inc;
          rep.added++;
          continue;
        }
        if (FIELDS.every((f) => (cur[f] || "") === (inc[f] || ""))) {
          rep.same++;
          continue;
        }
        const c = { id: r.id, reviewer: rv, source, mine: cur, theirs: inc };
        if ((inc.at || "") > (cur.at || "")) {
          s.marks[r.id][rv] = inc;
          rep.updated++;
          c.kept = "theirs";
        } else {
          rep.kept++;
          c.kept = "mine";
        }
        rep.conflicts.push(c);
      }
      s.conflicts = rep.conflicts.concat(s.conflicts).slice(0, 500);
      save();
      return rep;
    },
    clearAll() {
      s.marks = {};
      s.conflicts = [];
      undo.length = 0;
      save();
    }
  };
  return st;
}
const COLUMNS = ["id", "category", "name", "where", "version_added", "verdict", "comment", "suggested", "reviewer", "role", "reviewed_at", "build_version", "merge_into", "pick"];
const esc = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function toCsv(rows, cols = COLUMNS) {
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
function parseCsv(txt) {
  const rows = [];
  let row = [], cell = "", q = false;
  txt = txt.replace(/^﻿/, "");
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"' && txt[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const head = rows.shift() || [];
  return { head, rows: rows.filter((r) => r.some((x) => x !== "")).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] == null ? "" : r[i]]))) };
}
const VERDICT_OF = { keep: "keep", change: "fix", fix: "fix", merge: "merge", cut: "delete", delete: "delete", remove: "delete", "1": "keep", "2": "fix", "3": "delete" };
const PICKS = /* @__PURE__ */ new Set(["A", "B", "C", "D", "E", "F", "none"]);
function importRows(txt, { byText, ids, reviewer, role, now = (/* @__PURE__ */ new Date()).toISOString() }) {
  const { head, rows } = parseCsv(txt), out = [], unmatched = [], skipped = [];
  const v = (s) => VERDICT_OF[String(s || "").trim().toLowerCase()] || "";
  if (head.includes("id") && head.includes("verdict")) {
    for (const r of rows) {
      if (!ids.has(r.id)) {
        if (r.verdict || r.comment || r.suggested || r.pick || r.merge_into) unmatched.push(r.id);
        continue;
      }
      const pk = String(r.pick || "").trim();
      out.push({ id: r.id, reviewer: r.reviewer || reviewer, role: r.role || role, verdict: v(r.verdict), comment: r.comment || "", suggested: r.suggested || "", merge: r.merge_into || "", pick: PICKS.has(pk) ? pk : "", at: r.reviewed_at || now });
    }
    return { format: "studio", rows: out, unmatched, skipped };
  }
  if (head.includes("Keep / Change / Cut")) {
    for (const r of rows) {
      const verdict = v(r["Keep / Change / Cut"]);
      if (!verdict && !r["Suggested text"] && !r.Notes) continue;
      const hit = byText.get(norm(r.Text));
      if (!hit) {
        unmatched.push(r.Text);
        continue;
      }
      for (const id of hit) out.push({ id, reviewer, role, verdict, comment: r.Notes || "", suggested: r["Suggested text"] || "", at: now });
    }
    return { format: "game-text.csv", rows: out, unmatched, skipped };
  }
  if (head.includes("Kind") && head.includes("Mark")) {
    for (const r of rows) {
      if (r.Kind !== "line") {
        skipped.push(r.Kind + ": " + r.Text);
        continue;
      }
      const hit = byText.get(norm(r.Text));
      if (!hit) {
        unmatched.push(r.Text);
        continue;
      }
      for (const id of hit) out.push({ id, reviewer, role, verdict: v(r.Mark), comment: r.Note || "", suggested: "", at: now });
    }
    return { format: "in-game review", rows: out, unmatched, skipped };
  }
  throw new Error("Not a CSV the studio knows: expected the studio export, game-text.csv or islamdunk-review.csv");
}
const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
const CATS = ["Dialogue", "Trivia", "Text", "Sprites", "Animations", "Screens", "Sounds", "Voice"];
const MASJID_SRC = "career/masjid-projects.js:81";
const RELIGIOUS_GROUPS = /* @__PURE__ */ new Set(["Jumu’ah khutbah", "Jumu’ah", "Sheikh", "Sheikh talks", "Sheikh lessons", "Niyyah", "Power-ups", "Calendar"]);
const RELIGIOUS_WORDS = /\b(allah|qur'?an|qur’an|hadith|prophet|ﷺ|salah|salat|du['’]?a|sunnah|ayah|ayat|surah|ramadan|eid|jannah|iman|dhikr|sabr|tawakkul|bismillah|insha|masha|subhan|alhamdu|astaghfir|haram|halal|sadaqah|zakat|wudu|jumu['’]?ah|khutbah|imam|sahab|niyyah|taqwa|ihsan|shukr|barakah|deen|ummah|mus[-' ]?haf|rak['’]?ah|isha|fajr|dhuhr|asr|maghrib|adhan|iqamah|hijri|muharram|sha['’]?ban|rajab|dhul|shawwal)/i;
const fnv = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0").slice(-6);
};
const slug$1 = (t) => (norm(t).toLowerCase().replace(/<[^>]*>|\$\{[^}]*\}/g, " ").match(/[a-z0-9]+/g) || ["x"]).slice(0, 5).join("-").slice(0, 32);
const verKey = (v) => v === "phase1" ? [0, 0, 0] : String(v || "").split(".").map((n) => +n || 0);
const cmpVer = (a, b) => {
  const x = verKey(a), y = verKey(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};
const TRIGGERS = {
  Story: "Career story scenes, shown full screen between games when the story reaches them (career.js STORY).",
  Sheikh: "Sh. Saleem in his office, picked at random from this pool when you visit or after a game.",
  "Sheikh talks": "A talk you choose in Sh. Saleem’s office; your question, then his answer.",
  "Sheikh lessons": "A lesson from Sh. Saleem, unlocked through the career.",
  ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((n) => ["Chapter " + n, "The career story, Chapter " + n + ": a scene by its ID (docs/career-overhaul/SCENES.md)."])),
  "After the story": "The career after The End: milestone moments and the 100% scene.",
  Walks: "A walk scene on the gym floor: what each person says when you talk to him (and before you’re ready).",
  "Musalla talks": "Talk to a brother in the musalla; his greeting, your question, his answer.",
  Milestones: "A milestone moment in the career (progression beats).",
  Trivia: "A trivia question during a game (the Hikmah challenge) or in the trivia mini game. The first answer is the right one.",
  Achievements: "The Achievements screen and the toast when you earn one.",
  "Power-ups": "The power-up a right answer in the Hikmah challenge gives (at random), its callout, and the effect tag in play.",
  Taunts: "A taunt after a big play (the pop line above the player).",
  Cast: "Masjid Al-Amanah’s people: in the career hub, the musalla, the office, the intro and in games.",
  Teams: "An opposing team’s player, in games and on the team select and scouting screens.",
  Creator: "The player creator: one option shown on your player.",
  Balls: "A ball skin from the Profile (equip) screen, used in every game.",
  Hoops: "The hoop, backboard and net in every game.",
  Crests: "A team crest: team select, scoreboards, the bracket.",
  Jerseys: "A team’s kit, worn in games.",
  Courts: "A court or venue a game is played in.",
  "Neighbourhood props": "A prop in a neighbourhood scene (v9.2).",
  "Neighbourhood scenes": "A neighbourhood scene (v9.2), end to end, at each time of day. People are under Neighbourhood people.",
  Masjid: "My Masjid, outside: with no projects built and with every project built.",
  HUD: "The in-game HUD (score, clock, shot clock, turbo), with the touch controls on phones and tablets."
};
function buildItems(rs, data) {
  const items = [], reg = data.registry && data.registry.ids || {};
  const textIdx = /* @__PURE__ */ new Map();
  for (const r of data.text) {
    const k = norm(r.text);
    if (!textIdx.has(k)) textIdx.set(k, []);
    textIdx.get(k).push(r);
  }
  const covered = /* @__PURE__ */ new Set();
  const occ = (t) => textIdx.get(norm(t)) || [];
  const add = (it) => {
    const o = it.parts ? [...new Set(it.parts.flatMap((p) => occ(p[1])))] : occ(it.text || "");
    it.where = it.where || (o[0] ? o[0].file + ":" + o[0].line : it.src || "");
    it.occ = o;
    it.flag = (o.find((x) => x.flag) || {}).flag || it.flag || "";
    it.version = reg[it.id] || (o.length && o.every((x) => x.phase1) ? "phase1" : data.version);
    it.religious = !!(it.religious || RELIGIOUS_GROUPS.has(it.group) || /REVIEW 8\.6\.1|REVIEW 9\.0/.test(it.flag) || RELIGIOUS_WORDS.test(it.text || ""));
    items.push(it);
  };
  const cover = (...ts) => {
    for (const t of ts) if (t) covered.add(norm(t));
  };
  for (const u of rs.dialogue()) {
    u.lines.forEach((l, li) => {
      cover(l.text);
      add({
        id: "dialogue/" + u.key + "/" + li,
        cat: "Dialogue",
        group: u.group,
        kind: "line",
        unit: u,
        li,
        text: l.text,
        speaker: l.sp,
        name: (l.choice ? "You ask: " : rs.speakerName(l.sp) + ": ") + l.text,
        src: u.src
      });
    });
  }
  for (const t of rs.trivia()) {
    cover(t.q, t.right, t.why, ...t.wrong);
    add({ id: "trivia/" + t.i, cat: "Trivia", group: "Trivia", kind: "trivia", trivia: t, text: t.q, name: t.q, religious: true });
  }
  for (const a of rs.achievements()) {
    cover(a.name, a.desc);
    add({ id: "text/achievement/" + a.id, cat: "Text", group: "Achievements", kind: "text", text: a.name + " — " + a.desc, parts: [["Name", a.name], ["Description", a.desc]], name: a.name + ": " + a.desc });
  }
  for (const f of rs.noor()) {
    cover(f.name, f.mean, f.desc, f.short);
    add({ id: "text/noor/" + f.id, cat: "Text", group: "Power-ups", kind: "text", text: f.name + " — " + f.mean + " — " + f.desc + " — " + f.short, parts: [["Name", f.name], ["Meaning", f.mean], ["Effect", f.desc], ["Callout", f.short]], col: f.col, name: f.name + " (" + f.mean + ")" });
  }
  for (const t of rs.taunts()) {
    cover(t.name, t.pop);
    add({ id: "text/taunt/" + t.id, cat: "Text", group: "Taunts", kind: "text", text: t.name + " — " + t.pop, parts: [["Name", t.name], ["Pop line", t.pop]], name: t.name + ": " + t.pop });
  }
  const cal = rs.calendar();
  if (cal) {
    cal.months.forEach((m, i) => {
      cover(m);
      add({ id: "text/calendar/month/" + i, cat: "Text", group: "Calendar", kind: "text", src: "career/calendar.js", text: m, parts: [["Month " + (i + 1), m]], name: "Month " + (i + 1) + ": " + m });
    });
    cal.weekdays.forEach((d, i) => {
      cover(d);
      add({ id: "text/calendar/weekday/" + i, cat: "Text", group: "Calendar", kind: "text", src: "career/calendar.js", text: d, parts: [["Weekday " + (i + 1), d]], name: "Weekday: " + d });
    });
    cal.holidays.forEach((h, i) => {
      cover(h.name);
      add({ id: "text/calendar/holiday/" + i, cat: "Text", group: "Calendar", kind: "text", src: "career/calendar.js", text: h.name, parts: [["Holiday", h.name], ["Date", (cal.months[h.m] || h.m) + " " + h.day]], name: h.name + " (" + (cal.months[h.m] || h.m) + " " + h.day + ")" });
    });
  }
  const seen = /* @__PURE__ */ new Set();
  for (const r of data.text) {
    const k = norm(r.text);
    if (covered.has(k)) continue;
    const base = "text/" + r.file.replace(/\.js$/, "") + "/" + slug$1(r.text) + "-" + fnv(k);
    if (seen.has(base)) continue;
    seen.add(base);
    add({ id: base, cat: "Text", group: r.section.replace(/\s*\(.*\)$/, ""), section: r.section, kind: "text", text: r.text, parts: [["Text", r.text]], name: r.text, speaker: r.speaker, where: r.file + ":" + r.line });
  }
  const S2 = (id, group, name, spr, extra = {}) => add(Object.assign({ id: "sprite/" + id, cat: "Sprites", group, kind: "sprite", name, spr, text: "" }, extra));
  for (const p of rs.people()) {
    const [k, a, b] = p.key.split("/");
    if (k === "cast") S2("cast/" + a, "Cast", p.name, { t: "person", key: p.key }, { srcFile: "career/career.js" });
    else if (k === "team") S2("player/" + a + "/" + b, "Teams", p.name, { t: "person", key: p.key, kit: true });
    else if (k === "npc") S2("npc/" + a, "Neighbourhood people", p.name, { t: "person", key: p.key });
  }
  for (const r of rs.creatorRows()) for (const v of r.values) S2("creator/" + r.key + "/" + v.i, "Creator", r.label + ": " + (v.label || v.col || v.i), { t: "creator", key: r.key, i: v.i, col: v.col });
  for (const T2 of rs.teams()) {
    S2("crest/" + T2.short, "Crests", T2.name + " crest", { t: "crest", short: T2.short });
    S2("jersey/" + T2.short, "Jerseys", T2.name + " kit", { t: "jersey", short: T2.short });
  }
  S2("crest/AMANAH", "Crests", "Masjid Al-Amanah crest", { t: "crest", short: "AMANAH" });
  for (const b of rs.balls()) S2("ball/" + b, "Balls", b + " ball", { t: "ball", skin: b }, { src: "screens/profile.js:26" });
  S2("hoop/default", "Hoops", "Hoop, backboard and net", { t: "hoop" }, { src: "render/renderer.js:519" });
  for (const v of rs.venues()) S2("venue/" + v.id, "Courts", v.name, { t: "venue", id: v.id }, { srcFile: "data/venues.js" });
  for (const d of rs.worldScenes()) S2("scene/" + d.id, "Neighbourhood scenes", d.name + " (whole scene, no people)", { t: "scene", id: d.id, w: d.w }, { srcFile: "career/world/world-scenes.js" });
  for (const p of rs.worldProps()) S2("prop/" + p.scene + "/" + p.id, "Neighbourhood props", p.scene + ": " + p.id, { t: "prop", scene: p.scene, id: p.id, box: p.box });
  S2("masjid/none", "Masjid", "My Masjid outside, no projects", { t: "masjid", lvl: 0 }, { src: MASJID_SRC });
  S2("masjid/all", "Masjid", "My Masjid outside, every project", { t: "masjid", lvl: 1 }, { src: MASJID_SRC });
  S2("hud/desktop", "HUD", "HUD (keyboard / pad)", { t: "hud", touch: false }, { src: "render/renderer.js:645" });
  S2("hud/touch", "HUD", "HUD with touch controls", { t: "hud", touch: true }, { src: "render/renderer.js:645" });
  return items;
}
function locateSprites(items, defs) {
  for (const it of items) {
    if (it.cat !== "Sprites" || it.where) continue;
    const k = it.id.split("/").slice(-1)[0];
    const key = isNaN(+k) ? k : it.id.split("/").slice(-2)[0];
    it.where = defs[key] || it.srcFile || "";
  }
}
const SIZES$1 = {
  // natural canvas size, and where the thing is drawn in it
  person: [200, 250],
  creator: [200, 250],
  jersey: [200, 250],
  crest: [140, 140],
  ball: [90, 90],
  hoop: [260, 300],
  venue: [960, 540],
  prop: null,
  masjid: [960, 540],
  hud: [960, 540]
};
const PERSON_SCALE = 1.5;
function natural(it) {
  const s = it.spr;
  if (s.t === "prop") {
    const [w, h] = s.box || [120, 120];
    return [Math.ceil(w + 40), Math.ceil(h + 40)];
  }
  if (s.t === "scene") return [Math.ceil(s.w), 540];
  return SIZES$1[s.t];
}
function drawSprite(G, it, o = {}) {
  const rs = G.rs, s = it.spr, [w, h] = natural(it);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const outfit = o.outfit || (s.kit ? "kit" : "thobe");
  switch (s.t) {
    case "person":
      rs.drawPerson(g, s.key, w / 2, h - 18, PERSON_SCALE, { face: o.face, outfit, team: o.team });
      break;
    case "creator":
      rs.drawCreator(g, s.key, s.i, w / 2, h - 18, PERSON_SCALE, { face: o.face, outfit });
      break;
    case "jersey":
      rs.drawPerson(g, "cast/you", w / 2, h - 18, PERSON_SCALE, { face: o.face, outfit: "kit", team: s.short });
      break;
    case "crest":
      rs.drawCrest(g, s.short, w / 2, h / 2, 56);
      break;
    case "ball":
      rs.drawBall(g, s.skin, w / 2, h / 2, 36);
      break;
    case "hoop":
      rs.drawHoop(g, w / 2, h * 0.45, 1);
      break;
    case "venue":
      rs.drawVenue(g, s.id, w, h);
      break;
    case "prop":
      g.save();
      if (o.face === -1) {
        g.translate(w, 0);
        g.scale(-1, 1);
      }
      rs.drawWorldProp(g, s.scene, s.id, w / 2, h - 20, 1, o.tod == null ? 1 : o.tod);
      g.restore();
      break;
    case "scene":
      rs.drawWorldPano(g, s.id, o.tod == null ? 1 : o.tod);
      break;
    case "masjid":
      rs.drawExteriorAt(g, s.lvl, w, h);
      break;
    case "hud":
      rs.drawHud(g, s.touch);
      break;
    default:
      throw new Error("unknown sprite " + s.t);
  }
  return c;
}
const thumbs = /* @__PURE__ */ new Map();
function thumb(G, it, size = 40) {
  const k = it.id + "|" + size;
  if (thumbs.has(k)) return thumbs.get(k);
  let c;
  try {
    const src = drawSprite(G, it);
    c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d"), b = bbox(src), sc = Math.min(size / b.w, size / b.h, 1.5);
    g.imageSmoothingQuality = "high";
    g.drawImage(src, b.x, b.y, b.w, b.h, (size - b.w * sc) / 2, (size - b.h * sc) / 2, b.w * sc, b.h * sc);
  } catch (e) {
    c = null;
  }
  thumbs.set(k, c);
  return c;
}
function bbox(c) {
  const { width: w, height: h } = c, d = c.getContext("2d").getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return { x: 0, y: 0, w, h, empty: true };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const faces = /* @__PURE__ */ new Map();
function face(G, sp, size = 44) {
  const k = sp + "|" + size;
  if (faces.has(k)) return faces.get(k);
  const keyOf = { you: "cast/you", elder: "cast/mahmoud" };
  const people = G.rs.people(), key = keyOf[sp] || (people.find((p) => p.key === "cast/" + sp) || people.find((p) => p.key === "npc/" + sp) || {}).key;
  let c = null;
  if (key) try {
    const src = document.createElement("canvas");
    src.width = 200;
    src.height = 250;
    G.rs.drawPerson(src.getContext("2d"), key, 100, 232, PERSON_SCALE, { outfit: "thobe" });
    const b = bbox(src), hh = Math.min(b.h, b.w * 1.1);
    c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d"), sc = size / Math.max(b.w, hh);
    g.drawImage(src, b.x, b.y, b.w, hh, (size - b.w * sc) / 2, 0, b.w * sc, hh * sc);
  } catch (e) {
    c = null;
  }
  faces.set(k, c);
  return c;
}
class VList {
  constructor(host, { rowH = 44, render, onPick }) {
    this.host = host;
    this.rowH = rowH;
    this.render = render;
    this.onPick = onPick;
    this.n = 0;
    this.sel = -1;
    host.classList.add("vlist");
    this.pad = document.createElement("div");
    this.pad.className = "vpad";
    host.appendChild(this.pad);
    this.rows = /* @__PURE__ */ new Map();
    host.addEventListener("scroll", () => this.draw(), { passive: true });
    new ResizeObserver(() => this.draw()).observe(host);
    host.addEventListener("click", (e) => {
      const r = e.target.closest(".vrow");
      if (r) this.onPick(+r.dataset.i);
    });
  }
  set(n) {
    this.n = n;
    this.pad.style.height = n * this.rowH + "px";
    this.refresh();
  }
  refresh() {
    for (const r of this.rows.values()) r.remove();
    this.rows.clear();
    this.draw();
  }
  update(i) {
    const r = this.rows.get(i);
    if (r) {
      r.replaceChildren();
      this.render(r, i);
      r.classList.toggle("sel", i === this.sel);
    }
  }
  select(i, scroll = true) {
    const old = this.rows.get(this.sel);
    if (old) old.classList.remove("sel");
    this.sel = i;
    const r = this.rows.get(i);
    if (r) r.classList.add("sel");
    if (scroll && i >= 0) {
      const top = i * this.rowH, h = this.host.clientHeight;
      if (top < this.host.scrollTop) this.host.scrollTop = top;
      else if (top + this.rowH > this.host.scrollTop + h) this.host.scrollTop = top + this.rowH - h;
      this.draw();
    }
  }
  draw() {
    const h = this.host.clientHeight || 600, top = this.host.scrollTop;
    const a = Math.max(0, Math.floor(top / this.rowH) - 8), b = Math.min(this.n, Math.ceil((top + h) / this.rowH) + 8);
    for (const [i, r] of this.rows) if (i < a || i >= b) {
      r.remove();
      this.rows.delete(i);
    }
    for (let i = a; i < b; i++) {
      if (this.rows.has(i)) continue;
      const r = document.createElement("div");
      r.className = "vrow" + (i === this.sel ? " sel" : "");
      r.dataset.i = i;
      r.style.transform = `translateY(${i * this.rowH}px)`;
      r.style.height = this.rowH + "px";
      this.render(r, i);
      this.pad.appendChild(r);
      this.rows.set(i, r);
    }
  }
}
const RUN = `goTitle(); openBarakah(); runHomeSelect(0);`;
const MATCH = `Input.touchMode = false; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; M.introT = 0;
  for (let i = 0; i < 400 && M.phase !== 'live'; i++) updateMatch(STEP);`;
const STUDIO_SCREENS = [
  ["splash", `goTitle(); Game.screen = 'splash'; Game.splashT = 0;`],
  ["in-game review (?review=1)", `goTitle(); Game.screen = 'review'; RV.tab = 0; RV.idx = 0;`],
  ["run vow", RUN],
  ["run map", RUN + ` runPickVow(0);`],
  ["run choice", RUN + ` runPickVow(0); Run.choicesV2 = ['train', 'masjid']; runChooseNode(0);`],
  ["run end", RUN + ` runPickVow(0); Run.active = false; Run.champion = false; Game.screen = 'runend'; Game.idx = 0;`],
  ["run badges", `goTitle(); openBarakah(); Game.screen = 'runbadges'; Game.idx = 0;`],
  // v9.13: the overlays and in-match states that had no item (tests/studio.mjs studio-coverage lists every view)
  ["welcome dialog (first launch)", `goTitle(); showWelcome();`],
  ["toast message", `goTitle(); toast('Saved to the manual slot', 30);`],
  ["achievement toast", `goTitle(); achToast(ACHIEVEMENTS[0]);`],
  ["tutorial: a step", `startTutorial(); tutGo(2);`],
  ["tutorial: the last card", `startTutorial(); tutGo(TUT_STEPS.length - 1);`],
  ["match: tip-off", `Input.touchMode = false; newMatch(TEAMS[0], TEAMS[1], { humans: [{ team: 0, slot: 0, pad: 0 }] }); Game.screen = 'play'; Game.paused = false; for (let i = 0; i < 30; i++) updateMatch(STEP);`],
  ["match: inbound", MATCH + ` M.possTeam = 1; inbound(1); for (let i = 0; i < 10; i++) updateMatch(STEP);`],
  ["match: free throws", MATCH + ` addFoul(M.players[2]); foulShots(M.players[2], M.players[0], 2, 'FOUL!', 'ON ' + M.players[2].def.name.toUpperCase()); for (let i = 0; i < 40; i++) updateMatch(STEP);`],
  ["match: hot spot", MATCH + ` const h = attackHoop(0); M.hot = { x: h.x + h.dir * 260, z: 350, t: 9, m: 1, v: 2 };`],
  ["match: replay", MATCH + ` for (let i = 0; i < 120; i++) updateMatch(STEP); const fr = Replay.buf.slice(-210); Replay.active = { frames: fr, t: 0.6, dur: fr.length / 60 / 0.55 };`],
  ["match: period break", MATCH + ` M.fmt.periods = 4; M.quarter = 1; endQuarter();`],
  ["match: timeout (call a play)", MATCH + ` giveBall(M.players[0], 'inbound'); M.possTeam = 0; callTimeout(0, true);`],
  ["match: leave? (confirm)", MATCH + ` Game.paused = true; Game.idx = 0; const it = pauseItems(); it[it.length - 1][1]();`],
  ["barakah run: abandon? (confirm)", RUN + ` runPickVow(0); runAskAbandon();`],
  ["online: network report", `lobbyPreview('gym'); NetReport.open('lobby');`],
  ["hub: corner menu", `if (!C) { C = freshCareer(); C.name = 'Reviewer'; C.bracket = makeBracket(0); } careerHub(); Game.hubMenu = { open: true, idx: 0 };`],
  ["hub: My Player menu", `if (!C) { C = freshCareer(); C.name = 'Reviewer'; } if (Game.menus) Game.menus.hub = null; careerHub(); const it = HUB_MENU(); menuActivate('hub', it, it.findIndex(e => e.label === 'My Player'));`]
];
const SCREEN_OF = {
  "title": "title",
  "settings": "settings",
  "settings: controls & camera": "settings",
  "settings: game": "settings",
  "howto": "howto",
  "about": "about",
  "achievements": "achievements",
  "bests": "bests",
  "funmodes": "funmodes",
  "select": "select",
  "venue": "venue",
  "online": "online",
  "joincode": "joincode",
  "lobby": "lobby",
  "lobby: shoot-around": "gym",
  "lobby: post-game": "lobby",
  "minis": "minis",
  "profile": "profile",
  "teams & players": "cslist",
  "barakah run": "runhome",
  "daily scenario": "scenbrief",
  "dunk lab": "play",
  "match HUD": "play",
  "match: hikmah challenge": "play",
  "match: hikmah correct": "play",
  "match: pause": "play",
  "halftime": "halftime",
  "final": "final",
  "career menu": "cmenu",
  "creator": "creator",
  "namekeys": "namekeys",
  "story": "story",
  "hub": "hub",
  "cbracket": "cbracket",
  "cstats": "cstats",
  "crecords": "crecords",
  "career league leaders": "cstats",
  "career league player": "cstats",
  "career league around": "cstats",
  "career league box score": "cstats",
  "career around the league (waiting)": "cleague",
  "csummary": "csummary",
  "postgame": "postgame",
  "scout": "scout",
  "pregame": "pregame",
  "journal": "journal",
  "office": "office",
  "musalla": "musalla",
  "masjid": "masjid",
  "shop": "shop",
  "train": "train",
  "gym": "gym",
  "saves": "saves",
  "share clip": "shareclip",
  "clip video: no video support": "clipvideo",
  "clip video: done": "clipvideo",
  "select (forced, no setup)": "select",
  "title after forced select": "title",
  "splash": "splash",
  "in-game review (?review=1)": "review",
  "run vow": "runvow",
  "run map": "runmap",
  "run choice": "runchoice",
  "run end": "runend",
  "run badges": "runbadges",
  "custom teams: import": "csimport",
  "career: export": "saveexport",
  "career: import (a file picked)": "saveimport",
  "custom teams: share": "csshare",
  "custom teams: edit a team": "csedit",
  "custom teams: edit a player": "csedit",
  "custom teams: edit a team (own court)": "csedit",
  "3 on 3: third players": "pick3",
  "venue: your own court": "venue",
  "tournament setup": "sersetup",
  "tournament bracket": "series",
  "league standings": "series",
  "league schedule": "series",
  "league leaders": "series",
  "my clips": "myclips",
  "settings: accessibility": "settings",
  "welcome dialog (first launch)": "title",
  "toast message": "title",
  "achievement toast": "title",
  "tutorial: a step": "play",
  "tutorial: the last card": "play",
  "match: tip-off": "play",
  "match: inbound": "play",
  "match: free throws": "play",
  "match: hot spot": "play",
  "match: replay": "play",
  "match: period break": "play",
  "match: timeout (call a play)": "play",
  "match: leave? (confirm)": "play",
  "barakah run: abandon? (confirm)": "runmap",
  "online: network report": "gym",
  "hub: corner menu": "hub",
  "hub: My Player menu": "hub",
  "story: salams": "ssalams",
  "story: musalla": "musalla",
  "story: walk": "gym",
  "story: walk bubble": "gym",
  "story: tutorial": "gym",
  "story: hub": "hub",
  "story: credits": "scredits",
  "story: teammate pick": "spick"
};
const NOT_RENDERABLE = {
  lobbyquit: "A blank 0.3 s while Quit to Title tells the other player and leaves the room (v9.20.0).",
  hostlobby: "Needs a live online session with you as host and a guest connected. The online-loop, online-room and online-fb tests play it with a fake network.",
  netplay: "Needs a live online game between two browsers (it is the guest’s view of the host’s match). The online tests cover it.",
  netwait: "Only shown when an online host leaves or a room is full; needs a live online session."
};
const FLOWS = ["first-run", "hub loop", "match", "results", "career calendar", "settings", "rare"];
const T = (...a) => a, NEAR = (id) => "near-duplicate of " + id;
const META = {
  "splash": ["first-run", "The logo and studio credit while the game starts.", "Every launch, for 1.7 s (a tap skips it).", T(), null, "v7.9.1"],
  "title": ["first-run", "The main menu over a CPU match.", "After the splash; Back from most menus.", T(), T("☰", "Main menu"), "early"],
  "welcome dialog (first launch)": ["first-run", "Offers the tutorial or straight play, once per device.", "The first time the title shows on a new device.", T(), null, "v9.12"],
  "toast message": ["rare", "A short message at the bottom (saved, copied).", "After saving, copying a code and similar actions.", null, null, "v9.6.2"],
  "achievement toast": ["rare", "An achievement you just earned.", "Any time an achievement unlocks.", null, null, "v8.6.2"],
  "settings": ["settings", "The settings groups.", "Settings → Game settings.", T("Settings", "Game settings"), null, "early", [], { v: "keep" }],
  "settings: controls & camera": ["settings", "Controls, dribble style, ball magnet, camera, depth aids.", "Settings → Controls & camera.", T("Settings", "Settings", "Controls & camera"), null, "v8.5"],
  "settings: game": ["settings", "Difficulty, rubber-banding, format, period length, team control.", "Settings → Game.", T("Settings", "Settings", "Game"), null, "v8.5"],
  "settings: accessibility": ["settings", "Shot release, text size, team colors, motion, shake, flashes.", "Settings → Accessibility.", T("Settings", "Settings", "Accessibility"), null, "v9.5"],
  "howto": ["settings", "The controls for keyboard, pad and touch.", "Settings → How to play; also from the pause menu.", T("Settings", "How to play"), null, "early"],
  "about": ["rare", "Credits and the version.", "Settings → About.", T("Settings", "About"), null, "early"],
  "achievements": ["rare", "Every achievement, earned and not.", "Settings → Extras → Achievements.", T("Settings", "Extras", "Achievements"), null, "v8.6.2"],
  "bests": ["rare", "Personal bests (single-game records).", "Settings → Extras → Personal bests; career Records.", T("Settings", "Extras", "Personal bests"), T("My Player", "Records", "Personal bests"), "v3.x"],
  "funmodes": ["settings", "Fun modes (big heads, uncle mode, low gravity) once unlocked.", "Settings → Extras → Fun Modes.", T("Settings", "Extras", "Fun Modes"), null, "v6.x"],
  "select": ["first-run", "Pick your masjid, the opponent and your player.", "Quick Play → Play a game → 1 player; Play a match after the tutorial.", T("Quick Play", "Play a game", "1 player"), null, "early"],
  "venue": ["first-run", "Pick the court.", "After the team select.", T("Quick Play", "Play a game", "1 player", "Confirm", "Confirm", "Confirm"), null, "v7.6"],
  "venue: your own court": ["rare", "The court list with a custom team’s own court.", "Team select with a custom team that has a court.", null, null, "v9.3", [NEAR("venue")]],
  "online": ["rare", "Host or join an online game.", "Title → Online.", T("Online"), null, "v7.0"],
  "joincode": ["rare", "Type a friend’s 4-letter code.", "Online → Join with a code.", T("Online", "Join with a code"), null, "v7.0"],
  "lobby": ["rare", "Team select: each side picks a masjid and its players (headshots); the host picks the game in the middle.", "Online → Host a lobby → your friend presses Ready → Continue to teams.", T("Online", "Host a lobby"), null, "v9.20.0"],
  "lobby: shoot-around": ["rare", "The lobby gym: you and your friend shoot around while you wait; Ready, Continue, the code.", "Online → Host a lobby, or join with a code / link.", T("Online", "Host a lobby"), null, "v9.20.0"],
  "lobby: post-game": ["rare", "After an online game: Rematch (both pick it), Back to shoot-around, Pick new teams, Quit to Title.", "An online game → Continue on the final screen.", null, null, "v9.20.0"],
  "online: network report": ["rare", "The network report preview and the network-type pick.", "Online lobby or online pause → Network report.", T("Online", "Host a lobby", "Network report"), null, "v9.11.1"],
  "minis": ["rare", "The mini games menu.", "Quick Play → Mini games.", T("Quick Play", "Mini games"), null, "v8.0"],
  "profile": ["rare", "Your profile level, ball skins and stats.", "Settings → Profile.", T("Settings", "Profile"), null, "v8.3"],
  "teams & players": ["rare", "Custom teams and players.", "Teams & Players → Teams.", T("Teams & Players", "Teams"), null, "v8.5"],
  "career: export": ["rare", "Save the career, the manual slot, the profile and your teams to one file, or copy them as a code.", "Career → Export career (also Save and load, and Profile).", T("Career", "Export career"), T("Save and load", "Export career"), "v9.17.3"],
  "career: import (a file picked)": ["rare", "Check a save file or code and put its career in the manual slot.", "Career → Import career, then a file.", T("Career", "Import career"), T("Save and load", "Import career"), "v9.17.3"],
  "custom teams: import": ["rare", "Paste a share code.", "Teams & Players → Import a code.", T("Teams & Players", "Import a code"), null, "v8.5"],
  "custom teams: share": ["rare", "A code to share a team.", "A custom team → Share.", T("Teams & Players", "Teams", "(a team)", "Share"), null, "v8.5"],
  "custom teams: edit a team": ["rare", "Name, colors, crest, roster of a custom team.", "Teams & Players → Teams → New team.", T("Teams & Players", "Teams", "New team"), null, "v8.5"],
  "custom teams: edit a player": ["rare", "A custom player’s look and ratings.", "Teams & Players → Players → New player.", T("Teams & Players", "Players", "New player"), null, "v8.5"],
  "custom teams: edit a team (own court)": ["rare", "A custom team with its own court settings.", "A custom team → Court.", null, null, "v9.3", [NEAR("custom teams: edit a team")]],
  "3 on 3: third players": ["rare", "Pick the third player of each team.", "Quick Play → Play a game → 3 on 3.", T("Quick Play", "Play a game", "3 on 3 (beta)", "Confirm", "Confirm"), null, "v8.3"],
  "tournament setup": ["rare", "Set up an 8-team tournament.", "Quick Play → Play a game → Tournament.", T("Quick Play", "Play a game", "Tournament"), null, "v9.5"],
  "tournament bracket": ["results", "The tournament bracket between games.", "After each tournament game.", null, null, "v9.5"],
  "league standings": ["results", "Quick Play league table.", "After each league game, tab 1.", null, null, "v9.5"],
  "league schedule": ["results", "Quick Play league schedule.", "League screen, tab 2.", null, null, "v9.5", [NEAR("league standings")]],
  "league leaders": ["results", "Quick Play league leaders.", "League screen, tab 3.", null, null, "v9.5", [NEAR("league standings")]],
  "my clips": ["rare", "Saved highlight videos.", "Settings → Extras → My clips.", T("Settings", "Extras", "My clips"), null, "v9.5"],
  "barakah run": ["rare", "Barakah Run home: start, continue, badges, duos.", "Quick Play → Barakah Run.", T("Quick Play", "Barakah Run"), null, "v8.3"],
  "run vow": ["rare", "Pick the run’s vow (a handicap for more reward).", "Barakah Run → Start a run.", T("Quick Play", "Barakah Run", "Start a run"), null, "v8.3"],
  "run map": ["rare", "The run’s map of games and stops.", "After the vow.", T("Quick Play", "Barakah Run", "Start a run", "(a vow)"), null, "v8.3"],
  "run choice": ["rare", "Pick a stop (training, masjid) on the run.", "A fork on the run map.", null, null, "v8.3"],
  "run end": ["results", "The run’s result.", "A loss or abandoning the run.", null, null, "v8.3"],
  "run badges": ["rare", "Barakah Run badges.", "Barakah Run → Badges.", T("Quick Play", "Barakah Run", "Badges"), null, "v8.3"],
  "barakah run: abandon? (confirm)": ["rare", "Asks before throwing a run away.", "Back on the run map or a choice.", null, null, "v9.12"],
  "daily scenario": ["rare", "The daily scenario’s brief.", "Quick Play → Daily challenges → Daily Scenario.", T("Quick Play", "Daily challenges", "Daily Scenario"), null, "v6.0"],
  "dunk lab": ["rare", "Try every dunk style.", "Settings → Extras → Dunk lab.", T("Settings", "Extras", "Dunk lab"), null, "v8.6.5"],
  "tutorial: a step": ["first-run", "One tutorial lesson: a card with the task over a real court.", "Learn the basics on the welcome dialog; Quick Play → Tutorial.", T("Learn the basics"), null, "v8.2"],
  "tutorial: the last card": ["first-run", "The end of the tutorial: Play a match, Again, Exit.", "After the last lesson.", T("Learn the basics", "(9 lessons)"), null, "v8.2"],
  "match HUD": ["match", "A match in play: score, clock, shot clock, turbo, touch controls.", "Every match.", T("Quick Play", "Play a game", "1 player", "Confirm", "Confirm", "Confirm", "(a court)"), T("Continue"), "early"],
  "match: tip-off": ["match", "The start of a match: the BISMILLAH call and the jump ball.", "The first seconds of every match.", null, null, "early"],
  "match: inbound": ["match", "Inbounding after a score or a violation.", "After every basket.", null, null, "early"],
  "match: free throws": ["match", "Free throws after a shooting foul.", "A foul in the bonus or on a shot.", null, null, "v4.1"],
  "match: hot spot": ["match", "A glowing spot worth extra points.", "Now and then in a match.", null, null, "v8.6.3"],
  "match: replay": ["match", "An instant replay after a big play.", "After dunks, blocks and buzzer beaters.", null, null, "v3.x"],
  "match: period break": ["match", "Between quarters: END OF Q1 and the next inbound.", "The end of each period (but halftime).", null, null, "early"],
  "match: timeout (call a play)": ["match", "Pick a set play after calling a timeout.", "Pause → Call timeout, with the ball.", null, null, "v6.0"],
  "match: hikmah challenge": ["match", "The Hikmah challenge: a question for a power-up.", "When your Hikmah meter fills.", null, null, "v9.19.0"],
  "match: hikmah correct": ["match", "A right answer: the power-up it gives, named, then given at once.", "After a right answer.", null, null, "v9.19.0"],
  "match: pause": ["match", "Resume, timeout, how to play, settings, camera, leave.", "Esc or the pause button.", null, null, "v6.0"],
  "match: leave? (confirm)": ["match", "Asks before leaving a match.", "Pause → Quit to title / Leave game.", null, null, "v9.12"],
  "halftime": ["match", "Halftime: the box score so far and a continue.", "The middle of every two-half match.", null, null, "early"],
  "final": ["results", "The final score and the box score.", "The end of every match.", null, null, "early"],
  "share clip": ["results", "Share a highlight as an image.", "Final → Share a highlight.", null, null, "v8.7.1"],
  "clip video: no video support": ["rare", "The still image when a browser can’t make video.", "Share a clip in a browser without video recording.", null, null, "v8.7.1", [NEAR("clip video: done")]],
  "clip video: done": ["results", "A highlight video, ready to save or share.", "Share a clip → Make a video.", null, null, "v8.7.1"],
  "career menu": ["first-run", "Continue or start a career.", "Title → Career.", T("Career"), null, "v5.0"],
  "creator": ["first-run", "Make your player (look and build).", "Career → New career.", T("Career", "New career"), T("My Player", "Customize"), "v5.0"],
  "namekeys": ["first-run", "Type your player’s name.", "Creator → Name.", T("Career", "New career", "Name"), null, "v5.0"],
  "story": ["first-run", "A story scene between games.", "The career, at its story beats.", null, null, "v8.4"],
  "story: salams": ["first-run", "C0.1: the closing salams of Isha on black, right then left.", "A new career, after the creator.", T("Career", "New career", "Done"), null, "v9.22"],
  "story: musalla": ["first-run", "C0.2: the musalla after Isha: walk up to Imam Dawud (the gold marker) and talk.", "Straight after the salams.", null, null, "v9.22"],
  "story: walk": ["first-run", "C0.3: the gym, Ilyas, Ammo Jamil and Sh. Saleem to meet, with the checklist.", "After the musalla scene.", null, T("Continue"), "v9.22"],
  "story: walk bubble": ["first-run", "A speech bubble in a story walk.", "Talking to someone on the gym floor.", null, null, "v9.22", [NEAR("story: walk")]],
  "story: tutorial": ["first-run", "C0.4: shoot around, the controls checklist.", "After meeting the brothers.", null, T("Continue"), "v9.22"],
  "story: teammate pick": ["hub loop", "C2.5: pick your partner for a league game (seven brothers, chemistry, who is hurt).", "Before a Chapter 2 league game.", null, T("Continue"), "v9.24"],
  "story: credits": ["rare", "C5.11: The End. The credits roll on black: the cast, the school wing, a closing du’a.", "After the Ummah Cup.", null, null, "v9.28"],
  "story: hub": ["hub loop", "The story hub at Chapter 1: Continue, Gym, Masjid, My Player.", "After Chapter 0.", T("Career", "Continue career"), T(), "v9.22", [NEAR("hub")]],
  "hub: My Player menu": ["hub loop", "My Player: stats, look, Journal, league and stats.", "Hub → My Player.", T("Career", "Continue career", "My Player"), T("My Player"), "v9.22"],
  "hub": ["hub loop", "The career hub: Continue, Gym, Masjid, My Player; the chapter, the next event, the fundraiser.", "Career → Continue; after every career game.", T("Career", "Continue career"), T(), "v5.0", [], { v: "keep" }],
  "hub: corner menu": ["hub loop", "Save and load, main menu.", "The ☰ corner button on the hub.", T("Career", "Continue career", "☰"), T("☰"), "v9.6.2"],
  "cbracket": ["hub loop", "The career bracket.", "Hub → Schedule → Bracket.", T("Career", "Continue career", "Schedule", "Bracket"), T("Schedule", "Bracket"), "v5.0"],
  "cstats": ["hub loop", "Your career stats.", "Hub → My Player → League & stats.", T("Career", "Continue career", "My Player", "League & stats"), T("My Player", "League & stats"), "v6.0"],
  "crecords": ["hub loop", "Season summaries, journal, bests.", "Hub → My Player → Records.", T("Career", "Continue career", "My Player", "Records"), T("My Player", "Records"), "v8.4"],
  "career league leaders": ["hub loop", "League leaders.", "Hub → My Player → League & stats → Leaders.", null, T("My Player", "League & stats", "Leaders"), "v9.7.0"],
  "career league player": ["hub loop", "One player’s league page.", "A name in the league.", null, T("My Player", "League & stats", "(a player)"), "v9.7.0"],
  "career league around": ["hub loop", "Around the league: results and standings.", "League & stats → Around the league.", null, T("My Player", "League & stats", "Around the league"), "v9.7.0"],
  "career league box score": ["results", "A league game’s box score.", "A result in the league.", null, T("My Player", "League & stats", "(a game)"), "v9.7.0"],
  "career around the league (waiting)": ["results", "Waiting while the league’s other games are played.", "After a career game day.", null, null, "v9.7.0"],
  "csummary": ["results", "A season’s summary.", "The end of a stage; Records → Season summaries.", null, T("My Player", "Records", "Season summaries"), "v6.0"],
  "postgame": ["results", "After a career game: rewards and what’s next.", "After every career game.", null, null, "v5.0"],
  "scout": ["hub loop", "Scouting the next opponent.", "Hub → Continue (a game day) → Scout.", null, T("Continue", "Scout"), "v6.0"],
  "pregame": ["hub loop", "Before a career game: intention and start.", "Hub → Continue on a game day.", null, T("Continue"), "v5.0"],
  "journal": ["hub loop", "Your journal of the career so far.", "Records → Journal.", null, T("My Player", "Records", "Journal"), "v8.4"],
  "office": ["hub loop", "Sh. Saleem’s office: talks and lessons.", "My Masjid → Visit the masjid → Office.", null, T("My Masjid", "Visit the masjid", "Office"), "v8.6.7"],
  "musalla": ["hub loop", "The musalla: talk to the brothers.", "My Masjid → Visit the masjid → Musalla.", null, T("My Masjid", "Visit the masjid", "Musalla"), "v4.2"],
  "masjid": ["hub loop", "My Masjid, outside, with its projects.", "Hub → My Masjid.", null, T("My Masjid"), "v8.6.2"],
  "shop": ["hub loop", "Projects and upgrades to buy.", "My Masjid → Projects.", null, T("My Masjid", "Projects"), "v5.0"],
  "train": ["hub loop", "Upgrade your stats.", "My Player → Upgrade stats.", null, T("My Player", "Upgrade stats"), "v5.0"],
  "gym": ["hub loop", "The practice gym: drills and pickup.", "Hub → Practice.", null, T("Practice"), "v5.0"],
  "saves": ["rare", "Save and load slots.", "Hub → ☰ → Save and load.", null, T("☰", "Save and load"), "v5.0"],
  "select (forced, no setup)": ["rare", "The team select opened with no setup (a crash it once caused).", "Not by a player: a regression check.", null, null, "v8.6.1", ["unreachable", NEAR("select")], { v: "merge", into: "select", why: "A test setup, not a screen a player can reach." }],
  "title after forced select": ["rare", "The title after that check.", "Not by a player: a regression check.", null, null, "v8.6.1", ["unreachable", NEAR("title")], { v: "merge", into: "title", why: "A test setup, not a screen a player can reach." }],
  "in-game review (?review=1)": ["rare", "The in-game review mode (?review=1).", "Only with ?review=1 in the address: a tool for reviewers.", null, null, "v8.5", ["unreachable"], { v: "keep", why: "A reviewers’ tool, never shown to players." }]
};
const NA_META = {
  hostlobby: ["rare", "The older host screen: a join code and Tip off.", "Only Barakah Run → Duos → Host online (every other mode uses the v7.4 lobby).", null, null, "v7.0", ["legacy"], { v: "merge", into: "lobby", why: "The v7.4 lobby replaced it everywhere but Barakah Run duos." }],
  netplay: ["match", "The guest’s view of an online match.", "Joining an online game.", null, null, "v7.0"],
  netwait: ["rare", "Joining: searching, the room is full, the host left, a version mismatch.", "Joining an online game.", null, null, "v7.0"],
  lobbyquit: ["rare", "Quit to Title from an online screen: a blank moment while the other player is told.", "Any online screen → Quit to Title.", null, null, "v9.20.0"]
};
const CROWDED = 16, TEXT_HEAVY = 130;
function metaOf(name) {
  const m = META[name] || NA_META[name];
  if (!m) return null;
  const [flow, purpose, reach, title, hub, ver, flags = [], suggest = null] = m;
  return { flow, purpose, reach, title, hub, ver, flags: flags.slice(), suggest };
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SIZES = [["desktop", "Desktop 16:9 (1280×720)", 1280, 720, false], ["phone-750x342", "iPhone landscape (750×342)", 750, 342, true], ["phone-667x300", "Small phone (667×300)", 667, 300, true]];
async function extraCategories(G, data, hooks) {
  const out = [];
  for (const a of G.rs.anims()) out.push({
    id: "anim/" + a.id,
    cat: "Animations",
    group: a.group,
    kind: "anim",
    name: a.name,
    anim: a,
    text: "",
    src: "sim/animation.js",
    ...a.ball || a.needBall ? { changed: "9.19.1", changeNote: "the ball is held where the hand is drawn (facing, build, lean); check it sits in the hand" } : {},
    when: "Played by the rig in games. Drawn here by the game’s own animate() and drawPlayer(), one simulation step (1/60 s) per frame.",
    stage: hooks.stageAnim
  });
  const screens = data.screens.map((x) => x.concat(["tests/phone-audit.mjs (SCREENS)"])).concat(STUDIO_SCREENS.map((x) => x.concat(["src/review-studio/screens.js"])));
  const census = data.census && data.census.screens || {};
  const withMeta = (name) => {
    const m = metaOf(name) || { flow: "rare", flags: [] }, c = census[name];
    if (c) {
      if (c.taps >= CROWDED) m.flags.push("crowded");
      if (c.words >= TEXT_HEAVY) m.flags.push("text-heavy");
    }
    if (m.title == null && m.hub == null && !m.flags.includes("unreachable")) m.flags.push("not a menu path (comes up in play)");
    return Object.assign(m, { census: c || null });
  };
  for (const [name, js, src] of screens) {
    const meta = withMeta(name);
    for (const [size, label, w, h, touch] of SIZES)
      out.push({
        id: "screen/" + slug(name) + "/" + size,
        cat: "Screens",
        group: "Flow: " + meta.flow,
        kind: "screen",
        name: name + " · " + label,
        meta,
        screen: { name, js, size, label, w, h, touch, game: SCREEN_OF[name] },
        text: "",
        src,
        when: meta.purpose ? meta.purpose + " " + meta.reach : "Game.screen “" + (SCREEN_OF[name] || "?") + "”, set up the way the phone text audit does it.",
        stage: hooks.stageScreen
      });
  }
  const reached = new Set(Object.values(SCREEN_OF));
  for (const s of data.screenNames) if (!reached.has(s)) out.push({
    id: "screen/" + s + "/not-renderable",
    cat: "Screens",
    group: "Not renderable",
    kind: "screen-na",
    name: s + " (not renderable here)",
    meta: withMeta(s),
    reason: NOT_RENDERABLE[s] || "No setup for this screen yet.",
    text: "",
    when: NOT_RENDERABLE[s] || "No setup for this screen yet.",
    stage: hooks.stageNA
  });
  out.push({ id: "screen/first-run-path", cat: "Screens", group: "Flow: first-run", kind: "firstrun", name: "First-run path: launch to the end of the first match and the first career day", text: "", src: "docs/review/first-run.json", when: "What a brand-new player sees, in order (tools/review-first-run.mjs).", stage: hooks.stageFirstRun, placeholder: false });
  for (const f of FLOWS) out.push({ id: "screen/sheet/" + slug(f), cat: "Screens", group: "Flow: " + f, kind: "sheet", flow: f, name: "Contact sheet: every " + f + " screen", text: "", src: "src/review-studio/screen-meta.js", when: "Every screen in this flow side by side, drawn live.", stage: hooks.stageSheet });
  for (const k of G.rs.sfxIds()) out.push({
    id: "sound/" + k,
    cat: "Sounds",
    group: "Sound effects",
    kind: "sound",
    name: k + " · " + G.rs.where(k),
    sound: k,
    text: "",
    src: "core/sfx-variants.js",
    when: "SFX." + k + "(): " + G.rs.where(k) + ". Four variants made by the game’s Web Audio code (no files): A Current, B Real, C Arcade, D Soft.",
    stage: hooks.stageSound
  });
  for (const p of G.rs.crowdPresets()) out.push({
    id: "sound/crowd/" + p.key,
    cat: "Sounds",
    group: "Crowd",
    kind: "crowd",
    name: "Crowd: " + p.name,
    preset: p.key,
    text: "",
    src: "screens/v913-crowd.js",
    when: "What a match at this venue plays for a make, a dunk, a buzzer beater, a miss, a block and a turnover, with the audience it draws.",
    stage: hooks.stageCrowd
  });
  out.push({ id: "sound/mix", cat: "Sounds", group: "Crowd", kind: "mix", name: "Mix test: a 60 s match at a venue, a level per bus", text: "", src: "screens/v913-crowd.js", when: "A CPU match with sound, with sliders for master, effects, crowd, claps and voices, and room echo.", stage: hooks.stageMix });
  const voice = Array.isArray(data.voice) ? data.voice : data.voice && Array.isArray(data.voice.lines) ? data.voice.lines : null;
  if (voice && voice.length) for (const v of voice) out.push({ id: "voice/" + v.file, cat: "Voice", group: v.speaker || "Voice", kind: "voice", name: (v.speaker ? v.speaker + ": " : "") + (v.transcript || v.file), voice: v, text: v.transcript || "", src: "assets/voice/" + v.file, stage: hooks.stageVoice });
  else out.push({ id: "voice/none", cat: "Voice", group: "Voice", kind: "voice-empty", placeholder: true, name: "No voice lines yet", text: "", src: "assets/voice/manifest.json", stage: hooks.stageVoiceEmpty });
  return out;
}
const PHONE_MQ = "(max-width: 900px), (max-height: 520px)";
const isPhone = () => matchMedia(PHONE_MQ).matches;
const VL = { keep: "Keep", fix: "Fix", merge: "Merge", delete: "Delete" };
function setupPhone(h) {
  const { $: $2, el: el2, store: store2, S: S2 } = h;
  const body = document.body, more = $2("#more"), mb = $2("#morebtn"), vv = window.visualViewport;
  const setMore = (on) => {
    body.classList.toggle("moreopen", on);
    mb.setAttribute("aria-expanded", on ? "true" : "false");
  };
  mb.addEventListener("click", () => setMore(!body.classList.contains("moreopen")));
  $2("#moreclose").addEventListener("click", () => setMore(false));
  more.addEventListener("click", (e) => {
    if (e.target === more) setMore(false);
  });
  const phoneClass = () => {
    body.classList.toggle("phone", isPhone());
    if (!isPhone()) setMore(false);
    keepAbove();
  };
  matchMedia(PHONE_MQ).addEventListener("change", phoneClass);
  phoneClass();
  const canShareFile = () => {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "x.csv", { type: "text/csv" })] }));
    } catch (e) {
      return false;
    }
  };
  const share = $2("#share"), mail = $2("#mail");
  share.hidden = !(canShareFile() || navigator.share);
  mail.hidden = canShareFile();
  share.addEventListener("click", () => shareCsv(h));
  mail.addEventListener("click", () => mailCsv(h));
  $2("#clear").addEventListener("click", () => clearAsk(h));
  let last = null;
  for (const m of Object.values(store2.state.marks)) for (const r of Object.values(m)) if (r.at && (!last || r.at > last)) last = r.at;
  const draw = () => {
    const n = countVerdicts(store2), where = isPhone() ? "Saved on this phone only" : "Saved in this browser only";
    $2("#savedtxt").textContent = `${where}${last ? " · " + new Date(last).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""} · ${n} verdict${n === 1 ? "" : "s"}${S2.persisted ? "" : " (the browser may clear it if space runs low: export often)"}`;
  };
  store2.on(() => {
    last = (/* @__PURE__ */ new Date()).toISOString();
    draw();
  });
  h.drawSaved = draw;
  S2.persisted = false;
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => p || navigator.storage.persist()).then((p) => {
      S2.persisted = !!p;
      draw();
    }).catch(() => {
    });
  } catch (e) {
  }
  draw();
  function keepAbove() {
    const off = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
    for (const n of [$2("#actbar"), $2("#notesheet")]) n.style.bottom = off + "px";
  }
  if (vv) {
    vv.addEventListener("resize", keepAbove);
    vv.addEventListener("scroll", keepAbove);
  }
  h.keepAbove = keepAbove;
}
const countVerdicts = (store2) => {
  let n = 0;
  for (const m of Object.values(store2.state.marks)) for (const r of Object.values(m)) if (r.verdict || r.comment || r.suggested || r.pick || r.merge) n++;
  return n;
};
function drawActbar(h, it) {
  const { $: $2, el: el2, store: store2 } = h, bar = $2("#actbar");
  bar.hidden = !it || !!it.placeholder;
  if (bar.hidden) {
    bar.replaceChildren();
    return;
  }
  const m = store2.mark(it.id) || {}, VS = it.meta ? ["keep", "fix", "merge", "delete"] : ["keep", "fix", "delete"];
  bar.replaceChildren(
    el2("button", { class: "nav", "aria-label": "Previous item", onclick: () => h.step(-1) }, "‹"),
    ...VS.map((v) => el2("button", {
      class: "v " + v + (m.verdict === v ? " on" : ""),
      "aria-pressed": m.verdict === v ? "true" : "false",
      "data-v": v,
      onclick: () => {
        store2.set(it.id, { verdict: m.verdict === v ? "" : v });
        h.afterMark(it);
        if (v === "merge" && m.verdict !== "merge") noteSheet(h, it, true);
      }
    }, VL[v])),
    el2("button", { class: "note" + (m.comment || m.suggested ? " has" : ""), "aria-label": "Comment", onclick: () => noteSheet(h, it) }, "✎"),
    el2("button", { class: "nav", "aria-label": "Next item", onclick: () => h.step(1) }, "›")
  );
  if (h.keepAbove) h.keepAbove();
}
function noteSheet(h, it, mergeFirst) {
  const { $: $2, el: el2, store: store2, S: S2 } = h, sh = $2("#notesheet");
  const m = store2.mark(it.id) || {}, kids = [el2("div", { class: "nshead" }, el2("b", {}, it.name.length > 60 ? it.name.slice(0, 60) + "…" : it.name), el2("button", { class: "done", onclick: () => close() }, "Done"))];
  if (m.verdict === "merge" || mergeFirst) {
    const names = [...new Set(S2.items.filter((x) => x.meta && x.screen).map((x) => x.screen.name))].sort(), cur = it.screen && it.screen.name;
    const sel = el2("select", { id: "n-merge" }, el2("option", { value: "" }, "(pick the screen it goes into)"), ...names.filter((n) => n !== cur).map((n) => el2("option", { value: n }, n)));
    sel.value = m.merge || "";
    sel.addEventListener("change", () => {
      store2.set(it.id, { merge: sel.value });
      h.afterMark(it);
    });
    kids.push(el2("label", { class: "blk" }, "Merge into", sel));
  }
  const ta = (label, key, ph) => {
    const t = el2("textarea", { id: "n-" + key, placeholder: ph, rows: 3 });
    t.value = m[key] || "";
    let before = store2.mark(it.id);
    t.addEventListener("input", () => {
      store2.set(it.id, { [key]: t.value }, { record: false });
    });
    t.addEventListener("change", () => {
      store2.pushUndo(it.id, before);
      before = store2.mark(it.id);
    });
    return el2("label", { class: "blk" }, label, t);
  };
  kids.push(ta("Comment", "comment", "What should change, and why"));
  if (["line", "trivia", "text"].includes(it.kind)) kids.push(ta("Suggested replacement", "suggested", "Exact new wording (optional)"));
  sh.replaceChildren(...kids);
  sh.hidden = false;
  document.body.classList.add("noteopen");
  if (h.keepAbove) h.keepAbove();
  const first = sh.querySelector(mergeFirst ? "select" : "textarea");
  if (first) first.focus();
  function close() {
    sh.hidden = true;
    document.body.classList.remove("noteopen");
    sh.replaceChildren();
    h.afterMark(it);
  }
  h.closeNote = close;
}
const csvFile = (h) => new File([h.csvText()], h.fileName(), { type: "text/csv" });
async function shareCsv(h) {
  const f = csvFile(h);
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: f.name });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ title: f.name, text: await f.text() });
      return "shared-text";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  h.downloadCsv();
  return "downloaded";
}
function mailCsv(h) {
  const rows = h.exportRows().filter((r) => r.reviewer), body = h.toCsv(rows), max = 6e4;
  const href = "mailto:?subject=" + encodeURIComponent("Islam Dunk Studio verdicts " + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) + "&body=" + encodeURIComponent(body.length > max ? body.slice(0, max) : body);
  if (body.length > max) h.dialog(h.el("p", {}, `The verdicts are ${Math.round(body.length / 1e3)} kB, too long for an email body. Use Download CSV and attach the file.`));
  else location.href = href;
  return { rows: rows.length, size: body.length };
}
function clearAsk(h) {
  const { el: el2, store: store2 } = h, n = countVerdicts(store2);
  h.dialog(
    el2("h3", {}, "Clear the verdicts on this phone?"),
    el2("p", {}, `${n} verdict${n === 1 ? "" : "s"} are saved only here. Once cleared they're gone, unless you've exported them.`),
    el2(
      "div",
      { class: "row2" },
      el2("button", { onclick: () => shareCsv(h) }, "Share CSV first"),
      el2("button", { class: "danger", onclick: () => {
        store2.clearAll();
        h.refreshAll();
        document.getElementById("dlg").close();
      } }, "Clear them")
    )
  );
}
const DEMO_ARGS = { bounce: [1], clank: [1], netSwish: [0.8], rimTick: [0.6], cheer: [1], greenMake: [0], snatch: [1], swish: [1] };
const KEYS = ["A", "B", "C", "D"];
let actx = null;
function audio(G) {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = new AC();
  }
  if (actx.state === "suspended") actx.resume();
  G.rs.audioWith(actx);
  return actx;
}
const audioLocked = () => !actx || actx.state !== "running";
function stopAll(T2) {
  if (T2.loop) {
    clearInterval(T2.loop);
    T2.loop = null;
  }
  for (const t of T2.timers) clearTimeout(t);
  T2.timers = [];
}
function stageSound$1(G, bar, view, it, h) {
  const { el: el2, S: S2, store: store2 } = h, id = it.sound, vs = G.rs.variants(id), T2 = h.T;
  stopAll(T2);
  const m = () => store2.mark(it.id) || {};
  const st = el2("div", { class: "note" }, "Press a variant (or 1-4). P plays the preview style. The game’s own Web Audio code makes every sound: there is no file.");
  if (audioLocked()) view.append(el2("div", { class: "note lock" }, "Sound is off until you tap a ▶ button: phones block it before a tap. On an iPhone, also turn the silent switch off."));
  let last = S2.sp.prev || "A";
  const play = (k) => {
    try {
      audio(G);
      G.rs.playVariant(id, k, DEMO_ARGS[id]);
      last = k;
      st.textContent = `Played ${k} (${(vs.find((v) => v.key === k) || {}).label}) at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`;
      drawPick();
    } catch (e) {
      st.textContent = "Could not play: " + (e.message || e);
    }
  };
  const later = (ms, f) => T2.timers.push(setTimeout(f, ms));
  const vrow = el2("div", { class: "svrow" });
  for (const v of vs) vrow.append(el2("button", { class: "vbtn", "data-k": v.key, onclick: () => play(v.key) }, el2("b", {}, "▶ " + v.key), el2("span", {}, v.label), el2("small", {}, v.key === "A" ? "as shipped" : (v.db >= 0 ? "+" : "") + v.db + " dB to match A")));
  const loopBtn = el2("button", { onclick: () => {
    if (T2.loop) {
      stopAll(T2);
      loopBtn.classList.remove("on");
      return;
    }
    T2.loop = setInterval(() => play(last), id === "cheer" || id === "buzzer" ? 2200 : 1200);
    loopBtn.classList.add("on");
    play(last);
  } }, "⟳ Loop");
  const rep = el2("button", { onclick: () => {
    stopAll(T2);
    loopBtn.classList.remove("on");
    for (let i = 0; i < 5; i++) later(i * (id === "cheer" || id === "buzzer" ? 1200 : 380), () => play(last));
  } }, "Repeat ×5");
  const cmp = el2("button", { onclick: () => {
    stopAll(T2);
    KEYS.forEach((k, i) => later(i * (id === "cheer" || id === "buzzer" ? 1800 : 900), () => play(k)));
  } }, "Compare A → D");
  bar.append(loopBtn, rep, cmp, el2("span", { class: "note" }, "Repeats play the last variant you pressed"));
  const pickRow = el2("div", { class: "pick" });
  const drawPick = () => {
    const p = m().pick || "";
    pickRow.replaceChildren(
      el2("b", {}, "Pick: "),
      ...[...vs.map((v) => v.key), "none"].map((k) => el2("button", { class: p === k ? "on" : "", onclick: () => {
        store2.set(it.id, { pick: p === k ? "" : k });
        h.afterMark(it);
        drawPick();
      } }, k === "none" ? "None of these" : k + " " + ((vs.find((v) => v.key === k) || {}).label || ""))),
      el2("small", {}, p ? " → exported in the CSV (column pick)" : " nothing picked")
    );
    for (const b of vrow.children) b.classList.toggle("picked", b.dataset.k === p);
  };
  const calls = (S2.data.soundCalls || {})[id] || [];
  view.append(el2(
    "div",
    { class: "card snd" },
    el2("h3", {}, "SFX." + id + "()"),
    el2("p", {}, G.rs.where(id)),
    vrow,
    pickRow,
    st,
    el2("details", {}, el2("summary", {}, `Where it triggers: ${calls.length} call${calls.length === 1 ? "" : "s"} in the game`), ...calls.map((c) => el2("div", { class: "where" }, c.file + ":" + c.line + (c.fn ? "  (" + c.fn + ")" : "")))),
    el2("p", { class: "note" }, ["bounce", "squeak", "swish", "netSwish", "clank", "thud", "swipe"].includes(id) ? "B, C and D have 2-3 sub-variants, chosen at random with no immediate repeat: use Repeat ×5 to hear them." : "")
  ));
  drawPick();
  h.AN.keys = (k) => {
    if (k === "p" || k === " ") play(S2.sp.prev || "A");
  };
  h.extraKeys = (k) => {
    const i = "1234".indexOf(k);
    if (i >= 0) {
      play(KEYS[i]);
      return true;
    }
    if (k === "l") {
      loopBtn.click();
      return true;
    }
    return false;
  };
  return { done: Promise.resolve() };
}
function soundTabBar(G, bar, h) {
  const { el: el2, S: S2, store: store2 } = h;
  const chips = el2("span", { class: "chips" }, el2("span", { class: "note" }, "Preview style (P): "), ...KEYS.map((k) => el2("button", { class: (S2.sp.prev || "A") === k ? "on" : "", onclick: () => {
    S2.sp.prev = k;
    store2.setUi("sp", S2.sp);
    h.redraw();
  } }, k + " " + G.rs.styles()[k])));
  const medley = (k) => {
    stopAll(h.T);
    audio(G);
    G.rs.sfxIds().filter((id) => id !== "cheer" && id !== "buzzer").forEach((id, i) => h.T.timers.push(setTimeout(() => G.rs.playVariant(id, k, DEMO_ARGS[id]), i * 650)));
  };
  bar.append(chips, el2("span", { class: "note" }, " Hear every sound as: "), ...KEYS.map((k) => el2("button", { onclick: () => medley(k) }, "All " + k)));
}
function stageCrowd$1(G, bar, view, it, h) {
  const { el: el2 } = h;
  stopAll(h.T);
  const info = el2("div", { class: "cinfo" }, "Setting up the venue…");
  const out = el2("div", { class: "note" });
  const show = (r) => {
    info.replaceChildren(
      el2("div", {}, el2("b", {}, r.venue)),
      el2("div", {}, `Audience drawn: ${r.audience} · tier ${r.tier} (${["nobody: no crowd sound", "a handful: claps and a voice or two, no bed", "a small crowd: a quiet murmur, clusters of claps, a few voices", "a crowd: the bed and swells, quieter", "a big crowd: the bed and swells as before"][r.tier]})`),
      el2("div", {}, `Bed ${r.levels.bed.toFixed(3)} · murmur ${r.levels.murmur.toFixed(4)} · room: ${r.room}${r.roomOn ? "" : " (Room echo off)"}`)
    );
  };
  const fire = (kind) => {
    audio(G);
    const r = G.rs.crowdTrigger(kind);
    show(r);
    out.textContent = `${kind}: ${r.stats.lastClap} clapping, ${r.stats.lastVoice} voice${r.stats.lastVoice === 1 ? "" : "s"} (never more than the ${r.audience} people drawn). The people who clap raise their hands.`;
  };
  const btns = el2("div", { class: "svrow" }, ...[["make", "Make"], ["dunk", "Dunk"], ["buzzer", "Buzzer beater"], ["miss", "Miss (groan)"], ["block", "Block (ooh)"], ["turnover", "Turnover (groan)"]].map(([k, l]) => el2("button", { class: "vbtn", onclick: () => fire(k) }, el2("b", {}, "▶"), el2("span", {}, l))));
  const roomBtn = el2("button", { onclick: () => {
    audio(G);
    show(G.rs.setRoom(!G.rs.crowdInfo().roomOn));
    roomBtn.textContent = "Room echo: " + (G.rs.crowdInfo().roomOn ? "on" : "off");
  } }, "Room echo: on");
  bar.append(roomBtn, el2("span", { class: "note" }, "Voices are synthesized placeholders (a buzzy vowel, not a person) until recorded ones are added."));
  const ph = h.gameSlot(view, 960, 540);
  view.append(el2("div", { class: "card snd" }, info, btns, out));
  const done = (async () => {
    await G.size(960, 540, false);
    const r = G.rs.crowdSetup(it.preset);
    await G.frames(4);
    ph.place();
    show(r);
    roomBtn.textContent = "Room echo: " + (r.roomOn ? "on" : "off");
    return r;
  })();
  h.onLeave = () => G.rs.crowdOff();
  return { done };
}
function stageMix$1(G, bar, view, it, h) {
  const { el: el2, S: S2, store: store2 } = h;
  stopAll(h.T);
  const sel = el2("select", {}, ...G.rs.crowdPresets().map((p) => el2("option", { value: p.key }, p.name)));
  sel.value = S2.sp.mixVenue || "gymM-80";
  const clock = el2("span", { class: "note" }, "Stopped");
  const buses = [["master", "Master"], ["fx", "Effects (ball, shoes, rim, whistle)"], ["crowd", "Crowd (bed and murmur)"], ["people", "Claps and voices"], ["room", "Room echo"]];
  const lv = Object.assign({ master: 1, fx: 1, crowd: 1, people: 1, room: 1 }, S2.sp.mix || {});
  const sliders = buses.map(([k, l]) => {
    const v = el2("span", {}, Math.round(lv[k] * 100) + "%"), r = el2("input", { type: "range", min: 0, max: 150, value: Math.round(lv[k] * 100) });
    r.addEventListener("input", () => {
      lv[k] = r.value / 100;
      v.textContent = r.value + "%";
      G.rs.setBus(k, lv[k]);
      S2.sp.mix = lv;
      store2.setUi("sp", S2.sp);
    });
    return el2("label", { class: "slider" }, el2("span", {}, l), r, v);
  });
  let t0 = 0;
  const stop = () => {
    stopAll(h.T);
    G.rs.mixStop();
    clock.textContent = "Stopped";
    startBtn.textContent = "▶ Start 60 s";
    t0 = 0;
  };
  const startBtn = el2("button", { class: "bigplay", onclick: async () => {
    if (t0) {
      stop();
      return;
    }
    audio(G);
    S2.sp.mixVenue = sel.value;
    store2.setUi("sp", S2.sp);
    const r = G.rs.mixStart(sel.value);
    for (const [k] of buses) G.rs.setBus(k, lv[k]);
    ph.place();
    t0 = Date.now();
    startBtn.textContent = "■ Stop";
    h.T.loop = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1e3);
      clock.textContent = `${s} s of 60 · audience ${r.audience}, tier ${r.tier}, room ${r.room}`;
      if (s >= 60) stop();
    }, 250);
  } }, "▶ Start 60 s");
  const ph = h.gameSlot(view, 960, 540);
  view.append(el2(
    "div",
    { class: "card snd" },
    el2("h3", {}, "Mix test"),
    el2("p", {}, "A CPU match at the venue you pick, at normal speed, for 60 seconds, with everything a match plays. Move the sliders while it plays (they only change this test, not the game)."),
    el2("div", { class: "svrow" }, el2("label", {}, "Venue ", sel), startBtn, clock),
    ...sliders
  ));
  h.onLeave = () => {
    if (t0) stop();
  };
  return { done: G.size(960, 540, false) };
}
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
};
const VLABEL = { keep: "Keep", fix: "Fix", merge: "Merge", delete: "Delete" };
const S = {
  data: null,
  G: null,
  items: [],
  byId: /* @__PURE__ */ new Map(),
  byText: /* @__PURE__ */ new Map(),
  view: [],
  cur: -1,
  f: { cat: null, group: null, st: "all", isNew: false, religious: false, q: "" },
  sp: { zoom: 2, zoomBig: 0, bg: "dark", face: 1, outfit: "", team: "", lens: false, tod: 1 },
  renderErrors: {}
};
const store = createStore();
window.__studio = { S, store };
const PH = {
  $,
  el,
  store,
  S,
  step: (d) => step(d),
  afterMark: (it) => afterMark(it),
  refreshAll: () => refreshAll(),
  dialog: (...k) => dialog(...k),
  csvText: () => csvText(),
  fileName: () => fileName(),
  exportRows: () => exportRows(),
  toCsv: (rows) => toCsv(rows, COLUMNS),
  downloadCsv: () => downloadCsv()
};
window.__studio.phone = PH;
async function boot() {
  const T2 = window.__studio.t = { start: performance.now() }, mark = (k) => {
    T2[k] = Math.round(performance.now() - T2.start);
  };
  const gameP = openGame($("#gamehost")).then((g) => {
    mark("game");
    return g;
  });
  const res = await fetch("review-data.json", { cache: "no-store" });
  S.data = await res.json();
  mark("data");
  $("#build").textContent = "game " + S.data.version;
  S.G = await gameP;
  S.items = buildItems(S.G.rs, S.data);
  mark("items");
  const reg = S.data.registry && S.data.registry.ids || {};
  for (const it of await extraCategories(S.G, S.data, { stageAnim, stageScreen, stageNA, stageSound, stageCrowd, stageMix, stageVoice, stageVoiceEmpty, stageFirstRun, stageSheet })) {
    Object.assign(it, { version: reg[it.id] || S.data.version, where: it.where || it.src || "", occ: [], religious: !!it.religious, flag: "" });
    S.items.push(it);
  }
  mark("extra");
  locateSprites(S.items, S.data.defs || {});
  const ids = /* @__PURE__ */ new Set();
  for (const it of S.items) {
    if (ids.has(it.id)) console.warn("duplicate id", it.id);
    ids.add(it.id);
    S.byId.set(it.id, it);
    for (const t of textsOf(it)) {
      const k = norm(t);
      if (!k) continue;
      if (!S.byText.has(k)) S.byText.set(k, []);
      const a = S.byText.get(k);
      if (!a.includes(it.id)) a.push(it.id);
    }
  }
  setupHeader();
  setupList();
  setupKeys();
  setupPhone(PH);
  const ui = store.state.ui || {};
  Object.assign(S.f, ui.f || {});
  Object.assign(S.sp, ui.sp || {});
  applyFilters(ui.cur);
  $("#loading").classList.add("gone");
  mark("ready");
  window.__studio.ready = true;
}
const textsOf = (it) => it.kind === "trivia" ? [it.trivia.q, it.trivia.right, it.trivia.why, ...it.trivia.wrong] : it.parts ? it.parts.map((p) => p[1]) : it.text ? [it.text] : [];
const isNew = (it) => cmpVer(it.version, store.state.lastReviewed) > 0 || !!it.changed && cmpVer(it.changed, store.state.lastReviewed) > 0;
const myMark = (it) => store.mark(it.id);
function setupHeader() {
  const q = $("#q");
  q.value = S.f.q;
  let t = 0;
  q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      S.f.q = q.value;
      applyFilters();
    }, 120);
  });
  for (const b of document.querySelectorAll("#filters .chip")) b.addEventListener("click", () => {
    if (b.dataset.st) S.f.st = b.dataset.st;
    else S.f[b.dataset.tg] = !S.f[b.dataset.tg];
    applyFilters();
  });
  const rn = $("#rname"), rr = $("#rrole");
  rn.value = store.state.reviewer.name;
  for (const r of ROLES) rr.append(el("option", { value: r }, r));
  rr.value = store.state.reviewer.role;
  rn.addEventListener("change", () => {
    store.setReviewer(rn.value, null);
    refreshAll();
  });
  rr.addEventListener("change", () => store.setReviewer(null, rr.value));
  const lr = $("#lastrev"), vers = [...new Set(S.items.map((i) => i.version).concat(["phase1", S.data.version]))].sort(cmpVer);
  for (const v of vers) lr.append(el("option", { value: v }, v === "phase1" ? "Phase 1" : "v" + v));
  lr.value = store.state.lastReviewed;
  lr.addEventListener("change", () => {
    store.setLastReviewed(lr.value);
    applyFilters();
  });
  $("#dl").addEventListener("click", downloadCsv);
  $("#cp").addEventListener("click", copyCsv);
  $("#imp").addEventListener("click", () => $("#impfile").click());
  $("#impfile").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (f) doImport(await f.text(), f.name);
  });
  $("#confl").addEventListener("click", showConflicts);
  $("#navbtn").addEventListener("click", () => document.body.classList.toggle("navopen"));
  updateConflictBtn();
}
function matches(it, f, skipCat) {
  if (!skipCat && f.cat && it.cat !== f.cat) return false;
  if (!skipCat && f.group && it.group !== f.group) return false;
  const m = myMark(it), v = m ? m.verdict : "";
  if (f.st === "todo" && v) return false;
  if (f.st !== "all" && f.st !== "todo" && v !== f.st) return false;
  if (f.isNew && !isNew(it)) return false;
  if (f.religious && !it.religious) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!(it.id.toLowerCase().includes(q) || (it.name || "").toLowerCase().includes(q) || (it.where || "").toLowerCase().includes(q) || textsOf(it).some((t) => t.toLowerCase().includes(q)))) return false;
  }
  return true;
}
function applyFilters(selectId2) {
  const prev = selectId2 || S.view[S.cur] && S.view[S.cur].id;
  S.view = S.items.filter((it) => matches(it, S.f));
  for (const b of document.querySelectorAll("#filters .chip")) b.classList.toggle("on", b.dataset.st ? S.f.st === b.dataset.st : !!S.f[b.dataset.tg]);
  store.setUi("f", S.f);
  drawNav();
  S.list.set(S.view.length);
  let i = prev ? S.view.findIndex((x) => x.id === prev) : -1;
  if (i < 0 && S.view.length) i = 0;
  select(i);
  updateProgress();
}
function drawNav() {
  const nav = $("#nav");
  nav.replaceChildren();
  const stat = (list) => {
    let r = 0, fx = 0;
    for (const it of list) {
      const m = myMark(it);
      if (m && m.verdict) {
        r++;
        if (m.verdict !== "keep") fx++;
      }
    }
    return { n: list.length, r, fx };
  };
  const base = S.items.filter((it) => matches(it, Object.assign({}, S.f, { st: "all" }), true));
  const entry = (label, cat, group, list, cls = "") => {
    const s = stat(list), on = S.f.cat === cat && S.f.group === group;
    const e = el(
      "div",
      { class: "cat " + cls + (on ? " on" : ""), role: "button", tabindex: 0, "data-cat": cat || "", "data-group": group || "" },
      el("div", { class: "row" }, el("span", {}, label), el("span", { class: "n" }, s.r + "/" + s.n)),
      el("div", { class: "bar" }, el("i", { style: `width:${s.n ? 100 * s.r / s.n : 0}%` }))
    );
    const go = () => {
      S.f.cat = cat;
      S.f.group = group;
      document.body.classList.remove("navopen");
      applyFilters();
    };
    e.addEventListener("click", go);
    e.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        go();
      }
    });
    nav.append(e);
  };
  entry("All items", null, null, base);
  for (const c of CATS) {
    const list = base.filter((it) => it.cat === c);
    if (!S.items.some((it) => it.cat === c)) {
      nav.append(el("div", { class: "cat soon" }, el("div", { class: "row" }, el("span", {}, c), el("span", { class: "n" }, "later"))));
      continue;
    }
    entry(c, c, null, list);
    if (S.f.cat === c) {
      const groups = [...new Set(S.items.filter((it) => it.cat === c).map((it) => it.group))];
      for (const g of groups) entry(g, c, g, list.filter((it) => it.group === g), "sub");
    }
  }
}
function setupList() {
  S.list = new VList($("#list"), { rowH: 46, onPick: (i) => select(i), render: (r, i) => {
    const it = S.view[i], m = myMark(it);
    if (it.kind === "sprite") {
      const c = el("canvas", { width: 72, height: 72 });
      const t = thumb(S.G, it, 72);
      if (t) c.getContext("2d").drawImage(t, 0, 0);
      r.append(c);
    } else if (it.kind === "line") {
      const c = el("canvas", { width: 72, height: 72 });
      const t = face(S.G, it.speaker, 72);
      if (t) c.getContext("2d").drawImage(t, 0, 0);
      r.append(c);
    }
    r.append(el("span", { class: "dot " + (m ? m.verdict : ""), title: m && m.verdict ? VLABEL[m.verdict] : "Not reviewed" }));
    r.append(el("div", { class: "t" }, it.name, el("small", {}, (it.kind === "line" ? it.unit.title + " · " : "") + it.group)));
    if (isNew(it)) r.append(el("span", { class: "tag new", title: it.changed && cmpVer(it.version, store.state.lastReviewed) <= 0 ? "Changed in v" + it.changed + ": " + it.changeNote : "Added in " + it.version }, it.changed && cmpVer(it.version, store.state.lastReviewed) <= 0 ? "re-review" : "new"));
    if (it.religious) r.append(el("span", { class: "tag rel", title: "Religious review" }, "rel"));
  } });
}
function updateProgress() {
  const inView = S.view.filter((it) => {
    const m = myMark(it);
    return m && m.verdict;
  }).length;
  const all = S.items.filter((it) => {
    const m = myMark(it);
    return m && m.verdict;
  }).length;
  $("#prog-text").textContent = `${inView} / ${S.view.length} reviewed here · ${all} / ${S.items.length} in all`;
  $("#prog-bar").style.width = (S.view.length ? 100 * inView / S.view.length : 0) + "%";
  $("#listhead").replaceChildren(el("span", {}, (S.f.group || S.f.cat || "All items") + " · " + S.view.length), el("span", {}, S.cur >= 0 ? S.cur + 1 + " of " + S.view.length : ""));
}
function refreshAll() {
  S.list.refresh();
  drawNav();
  updateProgress();
  if (S.cur >= 0) drawSide();
}
function select(i) {
  S.cur = i;
  S.list.select(i);
  const it = S.view[i];
  store.setUi("cur", it ? it.id : null);
  drawStage();
  drawSide();
  updateProgress();
}
function step(d) {
  if (!S.view.length) return;
  select(Math.max(0, Math.min(S.view.length - 1, S.cur + d)));
}
function selectId(id) {
  let i = S.view.findIndex((x) => x.id === id);
  if (i < 0) {
    S.f = Object.assign(S.f, { cat: null, group: null, st: "all", isNew: false, religious: false, q: "" });
    $("#q").value = "";
    applyFilters(id);
    return;
  }
  select(i);
}
function drawStage() {
  const it = S.view[S.cur], bar = $("#stagebar"), view = $("#view");
  bar.replaceChildren();
  view.replaceChildren();
  view.className = "";
  AN.token++;
  AN.keys = null;
  S.stageRes = null;
  S.extraKeys = null;
  stopAll(SND);
  if (S.onLeave) {
    const f = S.onLeave;
    S.onLeave = null;
    try {
      f();
    } catch (e) {
    }
  }
  if (!it || it.kind !== "screen") {
    SC.token++;
    hideGame();
  }
  if (!it) {
    view.append(el("div", { class: "empty" }, "Nothing here with these filters."));
    return;
  }
  try {
    if (it.kind === "line") stageLine(it, view);
    else if (it.kind === "trivia") stageTrivia(it, view);
    else if (it.kind === "text") stageText(it, view);
    else if (it.kind === "sprite") stageSprite(it, bar, view);
    else if (it.stage) {
      if (it.cat === "Sounds" && it.kind !== "voice" && it.kind !== "voice-empty") {
        soundTabBar(S.G, bar, sndHelpers());
        bar.append(el("br"));
      }
      S.stageRes = it.stage(S.G, bar, view, it);
    }
    delete S.renderErrors[it.id];
  } catch (e) {
    S.renderErrors[it.id] = String(e && e.message || e);
    view.append(el("div", { class: "err" }, "This item could not be drawn:\n" + (e && e.stack || e)));
  }
}
function stageLine(it, view) {
  const u = it.unit, box = el("div", { class: "convo" }, el("h3", {}, u.group + " · " + u.title));
  u.lines.forEach((l, li) => {
    const id = "dialogue/" + u.key + "/" + li, m = store.mark(id), c = el("canvas", { width: 88, height: 88 }), f = face(S.G, l.sp, 88);
    if (f) c.getContext("2d").drawImage(f, 0, 0);
    const row = el(
      "div",
      { class: "ln" + (li === it.li ? " cur" : "") + (l.sp === "you" ? " you" : "") + (l.choice ? " choice" : ""), "data-id": id, onclick: () => selectId(id) },
      c,
      el("div", {}, el("div", { class: "who" }, l.choice ? "You ask" : S.G.rs.speakerName(l.sp)), el("div", { class: "tx" }, l.text)),
      el("span", { class: "dot " + (m ? m.verdict : "") })
    );
    box.append(row);
  });
  view.append(box);
  const cur = box.querySelector(".ln.cur");
  if (cur) requestAnimationFrame(() => cur.scrollIntoView({ block: "nearest" }));
}
function stageTrivia(it, view) {
  const t = it.trivia;
  view.append(el(
    "div",
    { class: "card" },
    el("h3", {}, "Trivia question " + (t.i + 1)),
    el("div", { class: "q" }, t.q),
    el("div", { class: "opt right" }, el("b", {}, "Right"), t.right),
    ...t.wrong.map((w) => el("div", { class: "opt wrong" }, el("b", {}, "Wrong"), w)),
    t.why ? el("div", { class: "why" }, el("b", {}, "Why: "), t.why) : el("div", { class: "why" }, "No explanation for this one.")
  ));
}
function stageText(it, view) {
  const card = el("div", { class: "card" }, el("h3", {}, it.section || it.group));
  if (it.col) card.style.borderColor = it.col;
  for (const [k, v] of it.parts) card.append(el("div", { class: "part" }, el("b", {}, k), el("div", { class: "gametext" }, v)));
  if (it.speaker) card.append(el("div", { class: "note" }, "Spoken by " + S.G.rs.speakerName(it.speaker)));
  view.append(card);
}
function stageSprite(it, bar, view) {
  const sp = S.sp, s = it.spr, person = ["person", "creator", "jersey"].includes(s.t);
  const big = natural(it)[0] > 400, zk = big ? "zoomBig" : "zoom";
  const seg = (label, key, opts) => {
    const g2 = el("div", { class: "grp", role: "group", "aria-label": label });
    for (const [v, t] of opts) g2.append(el("button", { class: sp[key] === v ? "on" : "", title: label + ": " + t, onclick: () => {
      sp[key] = v;
      store.setUi("sp", sp);
      drawStage();
    } }, t));
    bar.append(g2);
  };
  seg("Zoom", zk, [[1, "1x"], [2, "2x"], [4, "4x"], [8, "8x"], [0, "Fit"]]);
  seg("Background", "bg", [["light", "Light"], ["dark", "Dark"], ["check", "Check"]]);
  if (person || s.t === "prop") seg("Facing", "face", [[1, "Right →"], [-1, "← Left"]]);
  if (s.t === "person" || s.t === "creator") {
    seg("Outfit", "outfit", [["", "Default"], ["thobe", "Thobe"], ["kit", "Team kit"]]);
    if (s.t === "person") {
      const sel = el("select", { "aria-label": "Team colours", onchange: (e) => {
        sp.team = e.target.value;
        store.setUi("sp", sp);
        drawStage();
      } }, el("option", { value: "" }, "Own team colours"), ...S.G.rs.teams().map((T2) => el("option", { value: T2.short }, T2.name)));
      sel.value = sp.team || "";
      bar.append(el("label", {}, "Colours", sel));
    }
  }
  if (s.t === "prop" || s.t === "scene") seg("Time of day", "tod", S.G.rs.tods().map((t, i) => [i, t]));
  bar.append(el("button", { class: sp.lens ? "on" : "", title: "Pixel lens: hover the sprite", onclick: () => {
    sp.lens = !sp.lens;
    store.setUi("sp", sp);
    drawStage();
  } }, "Lens"));
  let src = drawSprite(S.G, it, { face: sp.face, outfit: sp.outfit || void 0, team: sp.outfit === "kit" || !sp.outfit ? sp.team || void 0 : void 0, tod: sp.tod });
  if (!["venue", "masjid", "hud", "scene"].includes(s.t)) src = cropTo(src, 6);
  const [w, h] = [src.width, src.height];
  view.className = "bg-" + sp.bg;
  const vw = Math.max(100, view.clientWidth - 32), vh = Math.max(100, view.clientHeight - 32);
  let z = sp[zk] || Math.min(vw / w, vh / h);
  if (!sp[zk] && z > 1) z = Math.floor(z);
  const dpr = window.devicePixelRatio || 1, c = el("canvas", { width: Math.round(w * z * dpr), height: Math.round(h * z * dpr), "data-zoom": z });
  c.style.width = w * z + "px";
  c.style.height = h * z + "px";
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  view.append(el("div", { class: "sprite-wrap" }, c));
  bar.append(el("span", { class: "note" }, `${w}×${h} px${person ? " · drawn at the game’s portrait scale 1.5" : ""}`));
  if (sp.lens) lens(c, src, z);
}
function cropTo(c, pad) {
  const b = bbox(c);
  if (b.empty) return c;
  const o = el("canvas", { width: b.w + 2 * pad, height: b.h + 2 * pad });
  o.getContext("2d").drawImage(c, b.x, b.y, b.w, b.h, pad, pad, b.w, b.h);
  return o;
}
function lens(c, src, z) {
  const L = $("#lens"), lc = L.querySelector("canvas"), lg = lc.getContext("2d"), info = L.querySelector("span"), sg = src.getContext("2d");
  const N = 11, P = lc.width / N;
  const move = (e) => {
    const r = c.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / z), y = Math.floor((e.clientY - r.top) / z);
    if (x < 0 || y < 0 || x >= src.width || y >= src.height) {
      L.hidden = true;
      return;
    }
    L.hidden = false;
    L.style.left = Math.min(innerWidth - 150, e.clientX + 18) + "px";
    L.style.top = Math.min(innerHeight - 160, e.clientY + 18) + "px";
    lg.imageSmoothingEnabled = false;
    lg.fillStyle = "#777";
    lg.fillRect(0, 0, lc.width, lc.height);
    lg.drawImage(src, x - 5, y - 5, N, N, 0, 0, lc.width, lc.height);
    lg.strokeStyle = "#fff";
    lg.lineWidth = 2;
    lg.strokeRect(5 * P, 5 * P, P, P);
    const d = sg.getImageData(x, y, 1, 1).data, hex = "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
    info.textContent = `${x},${y} ${hex} a${d[3]}`;
  };
  c.addEventListener("pointermove", move);
  c.addEventListener("pointerleave", () => {
    L.hidden = true;
  });
}
function drawSide() {
  const it = S.view[S.cur], side = $("#side");
  side.replaceChildren();
  if (!it || it.placeholder) drawActbar(PH, null);
  if (!it) return;
  const m = myMark(it) || {}, others = Object.entries(store.marksFor(it.id)).filter(([r]) => r !== store.who());
  const occ = (it.occ || []).slice(0, 8);
  side.append(el("h2", {}, it.name.length > 140 ? it.name.slice(0, 140) + "…" : it.name), el("div", { class: "id", title: "Item ID" }, it.id));
  side.append(el(
    "dl",
    {},
    el("dt", {}, "Category"),
    el("dd", {}, it.cat + " · " + it.group),
    el("dt", {}, "Where"),
    el("dd", { class: "where" }, occ.length > 1 ? occ.map((o) => el("div", {}, o.file + ":" + o.line)) : it.where || "—", (it.occ || []).length > 8 ? el("div", {}, "+" + (it.occ.length - 8) + " more") : null),
    el("dt", {}, "When"),
    el("dd", {}, it.when || TRIGGERS[it.group] || (it.section ? "Shown in: " + it.section : "—")),
    el("dt", {}, "Added"),
    el("dd", {}, (it.version === "phase1" ? "Phase 1" : "v" + it.version) + (isNew(it) ? it.changed && cmpVer(it.version, store.state.lastReviewed) <= 0 ? " · changed in v" + it.changed + ": " + it.changeNote : " · new since last review" : "")),
    it.flag || it.religious ? el("dt", {}, "Flags") : null,
    it.flag || it.religious ? el("dd", {}, [it.religious ? "Religious review" : null, it.flag].filter(Boolean).join(" · ")) : null
  ));
  if (it.meta) side.append(metaBlock(it));
  const fl = it.kind === "screen" && SC.flags[it.id];
  if (fl) {
    const o = fl.found.filter((f) => f.kind === "overflow").length, sm = fl.found.filter((f) => f.kind === "small").length, ov = fl.nOverlaps + fl.touch.length;
    side.append(el("div", { class: "note" }, `Screen checks: ${o} past the edge · ${sm} small text · ${ov} overlapping targets · ${fl.errors.length} errors`));
  }
  if (it.placeholder) {
    side.append(el("div", { class: "note" }, "Nothing to review here yet."));
    return;
  }
  const vb = el("div", { class: "verdicts", role: "group", "aria-label": "Verdict" });
  const VS = it.meta ? [["keep", "K"], ["fix", "F"], ["merge", "M"], ["delete", "D"]] : [["keep", "K"], ["fix", "F"], ["delete", "D"]];
  for (const [v, k] of VS) vb.append(el("button", {
    class: v + (m.verdict === v ? " on" : ""),
    "aria-pressed": m.verdict === v ? "true" : "false",
    "data-v": v,
    onclick: () => {
      store.set(it.id, { verdict: m.verdict === v ? "" : v });
      afterMark(it);
    }
  }, VLABEL[v], el("kbd", {}, k)));
  side.append(vb);
  if (m.verdict === "merge") {
    const names = [...new Set(S.items.filter((x) => x.meta && x.screen).map((x) => x.screen.name))].sort(), cur = it.screen && it.screen.name;
    const sel = el("select", { id: "f-merge" }, el("option", { value: "" }, "(pick the screen it goes into)"), ...names.filter((n) => n !== cur).map((n) => el("option", { value: n }, n)));
    sel.value = m.merge || "";
    sel.addEventListener("change", () => {
      store.set(it.id, { merge: sel.value });
      afterMark(it);
    });
    side.append(el("label", { class: "blk" }, "Merge into", sel));
  }
  if (m.verdict === "delete") side.append(el("div", { class: "note" }, "Delete means “recommend removal”. Nothing is removed from the game."));
  const ta = (label, key, ph) => {
    const t = el("textarea", { placeholder: ph, id: "f-" + key, rows: key === "comment" ? 3 : 3 });
    t.value = m[key] || "";
    let before = null;
    t.addEventListener("focus", () => {
      before = store.mark(it.id);
    });
    t.addEventListener("input", () => {
      store.set(it.id, { [key]: t.value }, { record: false });
      updateRow(it);
    });
    t.addEventListener("change", () => {
      store.pushUndo(it.id, before);
      before = store.mark(it.id);
    });
    return el("label", { class: "blk" }, label, t);
  };
  side.append(ta("Comment", "comment", "What should change, and why (N)"));
  if (["line", "trivia", "text"].includes(it.kind)) side.append(ta("Suggested replacement", "suggested", "Exact new wording (optional)"));
  drawActbar(PH, it);
  if (others.length) side.append(el("div", { class: "others" }, el("b", {}, "Other reviewers"), ...others.map(([r, o]) => el("div", {}, `${r} (${o.role || "—"}): `, el("b", {}, VLABEL[o.verdict] || "—"), o.comment ? " · " + o.comment : "", o.suggested ? " → “" + o.suggested + "”" : ""))));
  side.append(el("div", { class: "keys" }, el("kbd", {}, "K"), " keep ", el("kbd", {}, "F"), " fix ", el("kbd", {}, "D"), " delete (then next) · ", el("kbd", {}, "←"), el("kbd", {}, "→"), " move · ", el("kbd", {}, "N"), " comment · ", el("kbd", {}, "Ctrl/⌘ Z"), " undo · ", el("kbd", {}, "Esc"), " leave a box"));
}
function updateRow(it) {
  const i = S.view.indexOf(it);
  if (i >= 0) S.list.update(i);
}
function afterMark(it) {
  updateRow(it);
  drawSide();
  drawNav();
  updateProgress();
  if (it.kind === "line") {
    const d = document.querySelector(`.ln[data-id="${CSS.escape(it.id)}"] .dot`);
    if (d) d.className = "dot " + ((myMark(it) || {}).verdict || "");
  }
}
function setupKeys() {
  addEventListener("keydown", (e) => {
    const tgt = e.target, typing = tgt && (tgt.tagName === "TEXTAREA" || tgt.tagName === "INPUT" || tgt.tagName === "SELECT");
    if (e.key === "Escape") {
      if (typing) tgt.blur();
      document.body.classList.remove("navopen");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      if (typing) return;
      e.preventDefault();
      const id = store.undo();
      if (id) {
        const it2 = S.byId.get(id);
        selectId(id);
        if (it2) afterMark(it2);
      }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const it = S.view[S.cur];
    const k = e.key.toLowerCase();
    if (S.extraKeys && S.extraKeys(k)) {
      e.preventDefault();
      return;
    }
    if ((k === "k" || k === "f" || k === "d") && it) {
      e.preventDefault();
      store.set(it.id, { verdict: { k: "keep", f: "fix", d: "delete" }[k] });
      afterMark(it);
      step(1);
      return;
    }
    if (k === "m" && it && it.meta) {
      e.preventDefault();
      store.set(it.id, { verdict: "merge" });
      afterMark(it);
      const sel = $("#f-merge");
      if (sel) sel.focus();
      return;
    }
    if (k === "arrowright" || k === "arrowdown" || k === "j") {
      e.preventDefault();
      step(1);
      return;
    }
    if (k === "arrowleft" || k === "arrowup") {
      e.preventDefault();
      step(-1);
      return;
    }
    if (k === "pagedown") {
      e.preventDefault();
      step(10);
      return;
    }
    if (k === "pageup") {
      e.preventDefault();
      step(-10);
      return;
    }
    if (AN.keys && (k === " " || k === "," || k === "." || k === "p")) {
      e.preventDefault();
      AN.keys(k);
      return;
    }
    if (k === "n" && it) {
      e.preventDefault();
      const t = $("#f-comment");
      if (t) t.focus();
      return;
    }
  });
  let sx = null;
  const v = $("#view");
  v.addEventListener("touchstart", (e) => {
    sx = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null;
  }, { passive: true });
  v.addEventListener("touchend", (e) => {
    if (!sx) return;
    const t = e.changedTouches[0], dx = t.clientX - sx[0], dy = t.clientY - sx[1];
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
    sx = null;
  }, { passive: true });
}
function exportRows() {
  const rows = [];
  for (const it of S.items) {
    if (it.placeholder) continue;
    const base = { id: it.id, category: it.cat + " / " + it.group, name: it.name, where: it.where, version_added: it.version, build_version: S.data.version };
    const ms = Object.entries(store.marksFor(it.id));
    if (!ms.length) rows.push(Object.assign({ verdict: "", comment: "", suggested: "", reviewer: "", role: "", reviewed_at: "", merge_into: "", pick: "" }, base));
    for (const [r, m] of ms) rows.push(Object.assign({}, base, { verdict: m.verdict, comment: m.comment, suggested: m.suggested, reviewer: r, role: m.role, reviewed_at: m.at, merge_into: m.merge || "", pick: m.pick || "" }));
  }
  return rows;
}
const csvText = () => toCsv(exportRows(), COLUMNS);
const fileName = () => "islamdunk-studio-" + store.who().replace(/[^\w-]+/g, "_") + "-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".csv";
function downloadCsv() {
  const name = fileName();
  const a = el("a", { href: URL.createObjectURL(new Blob([csvText()], { type: "text/csv" })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
async function copyCsv() {
  const t = csvText(), b = $("#cp");
  try {
    await navigator.clipboard.writeText(t);
  } catch (e) {
    const x = el("textarea");
    x.value = t;
    document.body.append(x);
    x.select();
    document.execCommand("copy");
    x.remove();
  }
  b.textContent = "Copied ✓";
  setTimeout(() => {
    b.textContent = "Copy as CSV";
  }, 1500);
}
function doImport(txt, name = "pasted") {
  let res;
  try {
    res = importRows(txt, { byText: S.byText, ids: new Set(S.byId.keys()), reviewer: store.who(), role: store.state.reviewer.role });
  } catch (e) {
    dialog(el("p", {}, String(e.message || e)));
    return null;
  }
  const rep = store.merge(res.rows, name);
  refreshAll();
  updateConflictBtn();
  dialog(
    el("h3", {}, "Imported " + name),
    el("p", {}, `Format: ${res.format}. ${rep.added} added, ${rep.updated} updated (newer), ${rep.kept} kept (yours were newer), ${rep.same} already the same.`),
    res.unmatched.length ? el("p", {}, `${res.unmatched.length} row(s) matched no item and were left out: `, el("small", {}, res.unmatched.slice(0, 12).map((s) => "“" + String(s).slice(0, 60) + "”").join(", ") + (res.unmatched.length > 12 ? "…" : ""))) : null,
    res.skipped.length ? el("p", { class: "note" }, `${res.skipped.length} feel-checklist row(s) skipped (they are not items).`) : null,
    rep.conflicts.length ? conflictTable(rep.conflicts) : null
  );
  return { res, rep };
}
function conflictTable(cs) {
  return el(
    "table",
    {},
    el("tr", {}, el("th", {}, "Item"), el("th", {}, "Reviewer"), el("th", {}, "Yours"), el("th", {}, "Imported"), el("th", {}, "Kept")),
    ...cs.slice(0, 200).map((c) => el(
      "tr",
      {},
      el("td", {}, el("a", { href: "#", onclick: (e) => {
        e.preventDefault();
        $("#dlg").close();
        selectId(c.id);
      } }, c.id)),
      el("td", {}, c.reviewer),
      el("td", {}, fmt(c.mine)),
      el("td", {}, fmt(c.theirs)),
      el("td", {}, c.kept === "theirs" ? "imported (newer)" : "yours (newer)")
    ))
  );
}
const fmt = (m) => (VLABEL[m.verdict] || "—") + (m.comment ? ": " + m.comment : "") + (m.suggested ? " → " + m.suggested : "") + " (" + (m.at || "").slice(0, 16).replace("T", " ") + ")";
function showConflicts() {
  dialog(el("h3", {}, "Import conflicts"), el("p", { class: "note" }, "The same item and reviewer, marked differently. The newest mark won."), conflictTable(store.state.conflicts));
}
function updateConflictBtn() {
  const b = $("#confl"), n = store.state.conflicts.length;
  b.hidden = !n;
  b.textContent = "Conflicts (" + n + ")";
}
function dialog(...kids) {
  const d = $("#dlg");
  $("#dlgbody").replaceChildren(...kids);
  if (!d.open) d.showModal();
}
const AN = { token: 0, playing: false };
function stageAnim(G, bar, view, it) {
  const a = it.anim, o = S.an || (S.an = { speed: 1, loop: true, flip: false, ball: null, who: "", zoom: 0, playing: true });
  const tok = ++AN.token, rs = G.rs;
  const ballOn = a.needBall ? true : o.ball == null ? a.ball : o.ball;
  const restart = () => rs.animStart(a.id, { who: o.who || null, flip: o.flip, ball: ballOn });
  let info = restart();
  const NW = 520, NH = 380, src = el("canvas", { width: NW, height: NH }), sg = src.getContext("2d");
  const vw = Math.max(100, view.clientWidth - 32), vh = Math.max(100, view.clientHeight - 200);
  let z = o.zoom || Math.min(vw / NW, vh / NH);
  if (!o.zoom) z = z >= 1 ? Math.floor(z * 2) / 2 : z;
  const dpr = window.devicePixelRatio || 1, c = el("canvas", { width: Math.round(NW * z * dpr), height: Math.round(NH * z * dpr) });
  c.style.width = NW * z + "px";
  c.style.height = NH * z + "px";
  const dg = c.getContext("2d");
  dg.imageSmoothingEnabled = false;
  const infoBox = el("div", { class: "animinfo" }), joints = el("table", { class: "joints" });
  const draw = () => {
    sg.clearRect(0, 0, NW, NH);
    rs.animDraw(sg, NW, NH);
    dg.clearRect(0, 0, c.width, c.height);
    dg.drawImage(src, 0, 0, c.width, c.height);
    infoBox.textContent = `Frame ${info.f} / ${info.n} · ${(info.f / 60).toFixed(2)} s · state ${info.state} (${info.st.toFixed(3)} s) · height ${info.y} · ${info.face > 0 ? "facing right" : "facing left"}${info.holding ? " · has the ball" : ""}`;
    joints.replaceChildren(
      el("tr", {}, ...info.joints.map(([k]) => el("th", { title: JOINT_NAMES[k] || k }, k)), el("th", {}, "rot"), el("th", {}, "spin")),
      el("tr", {}, ...info.joints.map(([, v]) => el("td", {}, v.toFixed(3))), el("td", {}, info.rot.toFixed(3)), el("td", {}, info.spin.toFixed(3)))
    );
  };
  const step2 = () => {
    info = rs.animStep();
    if (info.f >= info.n) {
      if (o.loop) info = restart();
      else {
        o.playing = false;
        playBtn.textContent = "▶ Play";
      }
    }
  };
  const goto = (n) => {
    info = restart();
    for (let i = 0; i < n; i++) info = rs.animStep();
    draw();
  };
  const btn = (t, f, on, title) => el("button", { class: on ? "on" : "", title: title || t, onclick: f }, t);
  const playBtn = btn(o.playing ? "❚❚ Pause" : "▶ Play", () => {
    o.playing = !o.playing;
    playBtn.textContent = o.playing ? "❚❚ Pause" : "▶ Play";
    if (o.playing) loop();
  }, false, "Play / pause (space)");
  const redo = () => {
    store.setUi("an", o);
    drawStage();
  };
  const seg = (opts, key) => {
    const g = el("div", { class: "grp" });
    for (const [v, t] of opts) g.append(btn(t, () => {
      o[key] = v;
      redo();
    }, o[key] === v));
    return g;
  };
  bar.append(
    playBtn,
    seg([[1, "1x"], [0.5, "0.5x"], [0.25, "0.25x"]], "speed"),
    btn("◀ Frame", () => {
      o.playing = false;
      playBtn.textContent = "▶ Play";
      goto(Math.max(0, info.f - 1));
    }, false, "One frame back (,)"),
    btn("Frame ▶", () => {
      o.playing = false;
      playBtn.textContent = "▶ Play";
      step2();
      draw();
    }, false, "One frame on (.)"),
    btn("Loop", () => {
      o.loop = !o.loop;
      redo();
    }, o.loop),
    btn(o.flip ? "← Left" : "Right →", () => {
      o.flip = !o.flip;
      redo();
    }, o.flip, "Flip direction (play toward the other hoop)"),
    el("button", { class: ballOn ? "on" : "", disabled: a.needBall || null, title: a.needBall ? "This move needs the ball" : "With / without the ball", onclick: () => {
      o.ball = !ballOn;
      redo();
    } }, ballOn ? "With ball" : "No ball")
  );
  const who = el("select", { "aria-label": "Character", onchange: (e) => {
    o.who = e.target.value;
    redo();
  } }, el("option", { value: "" }, "Default player"), ...rs.people().map((p) => el("option", { value: p.key }, p.name)));
  who.value = o.who || "";
  bar.append(el("label", {}, "Character", who), seg([[0, "Fit"], [1, "1x"], [2, "2x"], [3, "3x"]], "zoom"));
  view.className = "bg-" + (S.sp.bg || "dark");
  view.append(el("div", { class: "animwrap" }, c, infoBox, el("div", { class: "jointwrap" }, joints), el("div", { class: "note" }, "Joint angles in radians (0 = limb straight down, + = forward): n = near side, f = far side; h hip, k knee, s shoulder, e elbow. Space plays / pauses, , and . step a frame.")));
  draw();
  let last = 0, acc = 0;
  const loop = () => {
    last = performance.now();
    acc = 0;
    const tick = (now) => {
      if (tok !== AN.token || !o.playing) return;
      acc += Math.min(0.1, (now - last) / 1e3) * 60 * o.speed;
      last = now;
      let n = 0;
      while (acc >= 1 && n < 4) {
        step2();
        acc -= 1;
        n++;
      }
      if (n) draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  AN.keys = (k) => {
    if (k === " ") playBtn.click();
    else if (k === ",") bar.querySelectorAll("button")[4].click();
    else if (k === ".") bar.querySelectorAll("button")[5].click();
  };
  if (o.playing) loop();
  return { done: Promise.resolve(), check: () => {
    if (!rs.animInfo()) throw new Error("no animation running");
    for (let i = 0; i < a.n; i++) rs.animStep();
    draw();
  } };
}
const JOINT_NAMES = { nh: "near hip", nk: "near knee", fh: "far hip", fk: "far knee", ns: "near shoulder", ne: "near elbow", fs: "far shoulder", fe: "far elbow", lean: "body lean" };
function metaBlock(it) {
  const m = it.meta, c = m.census, path = (p) => p == null ? "not from there" : p.length ? p.length + (p.length === 1 ? " tap: " : " taps: ") + p.join(" → ") : "it’s where you start";
  const audit = c && c.audit ? Object.entries(c.audit).map(([sz, a]) => el("div", {}, sz + ": ", a.error ? el("b", {}, "setup failed") : a.pass ? el("b", { style: "color:var(--keep)" }, "pass") : el("b", { style: "color:var(--fix)" }, "fail"), a.error ? "" : a.pass ? a.small ? ` (${a.small} small for a phone; desktop doesn’t fail on that)` : "" : ` (${a.overflow} past the edge, ${a.small} small, ${a.overlaps} overlapping, ${a.errors} errors)`)) : [el("div", {}, "not in the census yet (npm run review:census)")];
  return el(
    "dl",
    { class: "meta" },
    el("dt", {}, "Flow"),
    el("dd", {}, m.flow),
    el("dt", {}, "Purpose"),
    el("dd", {}, m.purpose || "—"),
    el("dt", {}, "Reached"),
    el("dd", {}, m.reach || "—"),
    el("dt", {}, "From the title"),
    el("dd", {}, path(m.title)),
    el("dt", {}, "From the hub"),
    el("dd", {}, path(m.hub)),
    el("dt", {}, "On it"),
    el("dd", {}, c ? `${c.taps} tap targets · ${c.words} words${c.numbers.length ? " · numbers: " + c.numbers.slice(0, 10).join(", ") + (c.numbers.length > 10 ? "…" : "") : ""}` : "—"),
    el("dt", {}, "Same numbers on"),
    el("dd", {}, c && c.shared && c.shared.length ? c.shared.map((x) => el("div", {}, x.screen + ": " + x.numbers.join(", "))) : "no other screen"),
    el("dt", {}, "Added in"),
    el("dd", {}, m.ver || "—"),
    el("dt", {}, "Phone text audit"),
    el("dd", {}, ...audit),
    el("dt", {}, "Flags"),
    el("dd", {}, m.flags.length ? m.flags.map((f) => el("span", { class: "flag" + (/unreachable|legacy|crowded|text-heavy/.test(f) ? " warn" : "") }, f)) : "none"),
    m.suggest ? el("dt", {}, "Suggested") : null,
    m.suggest ? el("dd", { class: "sugg" }, VLABEL[m.suggest.v] + (m.suggest.into ? " into “" + m.suggest.into + "”" : "") + (m.suggest.why ? ": " + m.suggest.why : "") + " (only a suggestion; nothing is set)") : null
  );
}
function stageFirstRun(G, bar, view, it) {
  hideGame();
  const fr = S.data.firstRun;
  if (!fr) {
    view.append(el("div", { class: "card" }, el("h3", {}, "No first-run path recorded yet"), el("p", {}, "Run node tools/review-first-run.mjs to record it.")));
    return { done: Promise.resolve() };
  }
  const tot = fr.steps.reduce((a, s) => a + (s.taps || 0), 0);
  view.append(
    el("div", { class: "card" }, el("h3", {}, "First-run path"), el("p", {}, `${fr.steps.length} views, ${tot} taps from the first launch to the end of the first career day. Recorded ${fr.built} on game ${fr.version}. Words are what the screen draws.`)),
    el("div", { class: "frun" }, ...fr.steps.map((s, i) => el(
      "div",
      { class: "step" },
      el("div", { class: "n" }, i + 1),
      el(
        "div",
        {},
        el("b", {}, s.title),
        el("div", { class: "note" }, `${s.screen} · ${s.taps ? s.taps + (s.taps === 1 ? " tap" : " taps") + ": " + s.how : s.how || "no tap"} · ${s.words} words`),
        s.interrupt ? el("div", { class: "int" }, "Interruption: " + s.interrupt) : null,
        el("div", { class: "shots" }, ...["desktop", "phone"].filter((k) => s.img && s.img[k]).map((k) => el("img", { src: "first-run/" + s.img[k], alt: s.title + " (" + k + ")", loading: "lazy" }))),
        el("details", {}, el("summary", {}, "Words on screen"), el("div", { class: "say" }, (s.texts || []).join(" · ")))
      )
    )))
  );
  return { done: Promise.resolve() };
}
function stageSheet(G, bar, view, it) {
  hideGame();
  const list = S.items.filter((x) => x.kind === "screen" && x.meta && x.meta.flow === it.flow);
  const sizes = [...new Set(list.map((x) => x.screen.size))];
  let size = S.sp.sheetSize || "desktop";
  const grid = el("div", { class: "sheet" });
  const build = async () => {
    const tok = ++SC.token;
    grid.replaceChildren();
    btn.disabled = true;
    for (const x of list.filter((x2) => x2.screen.size === size)) {
      if (tok !== SC.token) return;
      const s = x.screen;
      await S.G.size(s.w, s.h, s.touch);
      const r = S.G.rs.screenSetup(s.js);
      await S.G.frames(8);
      const c = S.G.canvas(), img = el("img", { alt: s.name });
      try {
        img.src = c.toDataURL("image/jpeg", 0.6);
      } catch (e) {
      }
      const a = x.meta.census && x.meta.census.audit && x.meta.census.audit[s.size];
      grid.append(el("figure", { onclick: () => selectId(x.id), style: "cursor:pointer" }, img, el("figcaption", {}, s.name + (r.error ? " (setup failed)" : "") + (a ? a.pass ? " · audit pass" : " · audit fail" : ""))));
    }
    btn.disabled = false;
  };
  const btn = el("button", { onclick: build }, "▶ Build the contact sheet");
  const sel = el("select", {}, ...sizes.map((z) => el("option", { value: z }, z)));
  sel.value = sizes.includes(size) ? size : sizes[0];
  size = sel.value;
  sel.addEventListener("change", () => {
    size = sel.value;
    S.sp.sheetSize = size;
    store.setUi("sp", S.sp);
  });
  bar.append(btn, sel, el("span", { class: "note" }, `${list.filter((x) => x.screen.size === size).length} screens; each is set up live (about a second each)`));
  view.append(el("div", { class: "card" }, el("h3", {}, "Contact sheet: " + it.flow), el("p", {}, "Click a picture to open that screen.")), grid);
  return { done: Promise.resolve() };
}
const SC = { token: 0, flags: {} };
function hideGame() {
  const h = $("#gamehost");
  h.style.cssText = "";
  h.classList.remove("shown");
}
function stageScreen(G, bar, view, it) {
  const s = it.screen, tok = ++SC.token;
  const vw = Math.max(200, view.clientWidth - 32), sc = Math.min(1, vw / s.w);
  const ph = el("div", { class: "screenph", style: `width:${s.w * sc}px;height:${s.h * sc}px` }), flagsBox = el("div", { class: "flags" }, "Setting up the screen… (the first career screen plays a whole CPU game first, a few seconds)");
  const showTargets = el("button", { class: S.sp.targets ? "on" : "", onclick: () => {
    S.sp.targets = !S.sp.targets;
    store.setUi("sp", S.sp);
    drawStage();
  } }, "Show tap targets");
  bar.append(el("button", { onclick: () => drawStage() }, "Set up again"), showTargets, el("span", { class: "note" }, s.label + " · CSS px; the live game, running"));
  const overlay = el("canvas", { class: "targets", width: s.w, height: s.h });
  view.append(el("div", { class: "screenwrap" }, ph, flagsBox));
  const place = () => {
    if (tok !== SC.token) return;
    const r = ph.getBoundingClientRect(), h = $("#gamehost");
    h.classList.add("shown");
    h.style.cssText = `left:${r.left}px;top:${r.top}px;width:${s.w}px;height:${s.h}px;transform:scale(${sc});transform-origin:0 0;`;
  };
  const done = (async () => {
    await G.size(s.w, s.h, s.touch);
    const r = G.rs.screenSetup(s.js);
    if (r.error) throw new Error("setup failed: " + r.error);
    await G.frames(10);
    G.rs.auditOn();
    await G.frames(6);
    const res = G.rs.auditResult(r.e0);
    res.setScreen = r.screen;
    res.touch = s.touch && res.screen === "play" ? G.rs.touchOverScoreboard() : [];
    if (tok !== SC.token) return res;
    SC.flags[it.id] = res;
    place();
    new ResizeObserver(place).observe(ph);
    view.addEventListener("scroll", place, { passive: true });
    flagsBox.replaceChildren(...screenFlagList(res, s));
    if (S.sp.targets) {
      const g = overlay.getContext("2d"), k = s.w / res.W;
      g.strokeStyle = "#00e5ff";
      g.lineWidth = 2;
      for (const [x, y, w, h] of res.rects) g.strokeRect(x * k, y * k, w * k, h * k);
      g.strokeStyle = "#ff3b6b";
      for (const o of res.overlaps) {
        const [x, y, w, h] = o.a;
        g.strokeRect(x * k, y * k, w * k, h * k);
      }
      ph.append(overlay);
      overlay.style.cssText = `width:100%;height:100%;position:relative;z-index:30`;
    }
    drawSide();
    return res;
  })();
  done.catch((e) => {
    if (tok === SC.token) flagsBox.replaceChildren(el("div", { class: "err" }, String(e.message || e)));
  });
  return { done };
}
function screenFlagList(res, s) {
  const over = res.found.filter((f) => f.kind === "overflow"), small = res.found.filter((f) => f.kind === "small");
  const L = [];
  const row = (cls, t, items) => L.push(el("details", { class: "flag " + cls, open: items.length && items.length < 8 ? true : null }, el("summary", {}, t), ...items.map((x) => el("div", {}, x))));
  row(over.length ? "bad" : "ok", `${over.length} text past the edge`, over.map((f) => `“${f.text}” spans ${f.left}…${f.right} of ${f.width} px`));
  row(small.length ? "bad" : "ok", `${small.length} text under ${11} CSS px`, small.map((f) => `“${f.text}” at ${f.css} px`));
  row(res.nOverlaps || res.touch.length ? "bad" : "ok", `${res.nOverlaps + res.touch.length} overlapping tap targets`, [...res.touch.map((n) => `the ${n} button covers the scoreboard`), ...res.overlaps.map((o) => `[${o.a.join(", ")}] overlaps [${o.b.join(", ")}] by ${o.area} px²`)]);
  row(res.errors.length ? "bad" : "ok", `${res.errors.length} page errors`, res.errors);
  L.push(el("div", { class: "note" }, `Game.screen: ${res.setScreen}${res.screen !== res.setScreen ? " (then " + res.screen + ")" : ""}${s.game && res.setScreen !== s.game ? " (expected " + s.game + ")" : ""}. Text and size checks are the phone text audit’s (tests/phone-audit.mjs).`));
  return L;
}
function stageNA(G, bar, view, it) {
  hideGame();
  view.append(el("div", { class: "card" }, el("h3", {}, "Not renderable here"), el("p", {}, "Game.screen “" + it.id.split("/")[1] + "”"), el("p", {}, it.reason)));
  return { done: Promise.resolve() };
}
const SND = { timers: [], loop: null };
function gameSlot(view, w, h) {
  const vw = Math.max(200, view.clientWidth - 32), sc = Math.min(1, vw / w), ph = el("div", { class: "screenph", style: `width:${w * sc}px;height:${h * sc}px` }), tok = ++SC.token;
  view.append(ph);
  const place = () => {
    if (tok !== SC.token) return;
    const r = ph.getBoundingClientRect(), g = $("#gamehost");
    g.classList.add("shown");
    g.style.cssText = `left:${r.left}px;top:${r.top}px;width:${w}px;height:${h}px;transform:scale(${sc});transform-origin:0 0;`;
  };
  new ResizeObserver(place).observe(ph);
  view.addEventListener("scroll", place, { passive: true });
  return { place };
}
function sndHelpers() {
  return { el, S, store, T: SND, AN, afterMark, redraw: drawStage, gameSlot, set onLeave(f) {
    S.onLeave = f;
  }, set extraKeys(f) {
    S.extraKeys = f;
  } };
}
function stageSound(G, bar, view, it) {
  return stageSound$1(G, bar, view, it, sndHelpers());
}
function stageCrowd(G, bar, view, it) {
  return stageCrowd$1(G, bar, view, it, sndHelpers());
}
function stageMix(G, bar, view, it) {
  return stageMix$1(G, bar, view, it, sndHelpers());
}
function stageVoice(G, bar, view, it) {
  const v = it.voice, a = el("audio", { controls: true, src: "voice/" + v.file, preload: "none" });
  view.append(el(
    "div",
    { class: "card" },
    el("h3", {}, (v.speaker || "Voice") + " · " + v.id),
    el("div", { class: "q" }, v.transcript || "(no transcript)"),
    a,
    el("div", { class: "note" }, "assets/voice/" + v.file)
  ));
  AN.keys = (k) => {
    if (k === "p" || k === " ") {
      if (a.paused) a.play();
      else a.pause();
    }
  };
  return { done: Promise.resolve() };
}
function stageVoiceEmpty(G, bar, view, it) {
  view.append(el(
    "div",
    { class: "card" },
    el("h3", {}, "No voice lines yet"),
    el("p", {}, "The game has no recorded voice yet. When it does, add the files to assets/voice/ and list them in assets/voice/manifest.json. Each line then shows up here with its transcript, a player and a verdict:"),
    el("pre", { class: "code" }, JSON.stringify({ lines: [{ id: "saleem-intro-1", file: "saleem-intro-1.mp3", transcript: "Assalamu alaikum! You must be the brother who just moved to Eastside.", speaker: "saleem" }] }, null, 2)),
    el("p", { class: "note" }, "id: stable name for the line (its review ID is voice/<file>) · file: under assets/voice/ · transcript: what is said · speaker: a cast id (saleem, khalil, …) or a name. See docs/review/README.md.")
  ));
  return { done: Promise.resolve() };
}
Object.assign(window.__studio, {
  exportCsv: csvText,
  importCsv: (t, n) => {
    const r = doImport(t, n);
    $("#dlg").open && $("#dlg").close();
    return r && { format: r.res.format, rows: r.res.rows.length, unmatched: r.res.unmatched.length, ...r.rep, conflicts: r.rep.conflicts.length };
  },
  list: () => S.items.filter((it) => !it.placeholder).map((it) => ({ id: it.id, cat: it.cat, group: it.group, name: it.name, where: it.where, version: it.version, religious: it.religious })),
  select: (id) => selectId(id),
  // render every item of a category (or all) through the stage, collecting failures
  async renderAll(cat) {
    const out = { n: 0, failed: [] }, keep = S.f;
    S.f = { cat: null, group: null, st: "all", isNew: false, religious: false, q: "" };
    applyFilters();
    for (let i = 0; i < S.view.length; i++) {
      const it = S.view[i];
      if (cat && it.cat !== cat) continue;
      S.cur = i;
      drawStage();
      out.n++;
      if (S.stageRes) {
        try {
          if (S.stageRes.check) S.stageRes.check();
          const r = await S.stageRes.done;
          if (r && it.kind === "screen") {
            out.screens = out.screens || [];
            out.screens.push({ id: it.id, screen: r.setScreen, after: r.screen, expect: it.screen.game, overflow: r.found.filter((f) => f.kind === "overflow").length, small: r.found.filter((f) => f.kind === "small").length, overlaps: r.nOverlaps + r.touch.length, errors: r.errors });
          }
        } catch (e) {
          S.renderErrors[it.id] = String(e && e.message || e);
        }
      }
      if (S.renderErrors[it.id]) out.failed.push({ id: it.id, error: S.renderErrors[it.id] });
      if (it.kind === "sprite" && !document.querySelector("#view canvas")) out.failed.push({ id: it.id, error: "no canvas" });
      if (i % 40 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    S.f = keep;
    applyFilters();
    hideGame();
    return out;
  },
  // v9.13: the screen census: every screen setup at each size, what it draws (texts, tap targets) and the phone text audit
  async census(sizes) {
    const out = {}, G = S.G, seen = /* @__PURE__ */ new Set();
    for (const it of S.items) {
      if (it.kind !== "screen") continue;
      const s = it.screen;
      if (sizes && !sizes.includes(s.size)) continue;
      await G.size(s.w, s.h, s.touch);
      const r = G.rs.screenSetup(s.js);
      if (r.error) {
        (out[s.name] = out[s.name] || {})[s.size] = { error: r.error };
        continue;
      }
      await G.frames(8);
      G.rs.auditOn();
      G.rs.textsOn();
      await G.frames(6);
      const a = G.rs.auditResult(r.e0), t = G.rs.textsOff();
      const ov = a.found.filter((f) => f.kind === "overflow").length, sm = a.found.filter((f) => f.kind === "small").length, ol = a.nOverlaps + (s.touch && a.screen === "play" ? G.rs.touchOverScoreboard().length : 0);
      (out[s.name] = out[s.name] || {})[s.size] = { texts: t.texts, taps: t.taps, overflow: ov, small: sm, overlaps: ol, errors: a.errors.length, screen: r.screen };
      seen.add(s.name);
    }
    hideGame();
    return out;
  },
  counts() {
    const c = {};
    for (const it of S.items) {
      c[it.cat] = c[it.cat] || { total: 0, groups: {} };
      c[it.cat].total++;
      c[it.cat].groups[it.group] = (c[it.cat].groups[it.group] || 0) + 1;
    }
    return c;
  },
  gameErrors: () => S.G.errors(),
  setFilter(f) {
    Object.assign(S.f, f);
    applyFilters();
  }
});
boot().catch((e) => {
  $("#loading").textContent = "The studio could not start: " + (e && e.message || e);
  console.error(e);
  window.__studio.bootError = String(e && e.stack || e);
});
