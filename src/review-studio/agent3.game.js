// Review Studio agent, v9.13: sounds, variants and the crowd. Evaluated in the game frame after agent2.game.js.
// The studio's own AudioContext (made on a click in the studio, so the browser lets it play) is handed to the game, and
// everything after that is the game's own sound code.
(() => {
  const RS = window.__RS;
  const V = id => VENUE_LIST.find(v => v.id === id);
  // the crowd presets: each a venue as a match would have it (career numbers where they differ)
  RS.CROWD_PRESETS = [
    ['practice', 'Practice gym (drills, the gym on a free day)', () => [null, { practice: 'free' }]],
    ['home-10', 'Masjid Al-Amanah gym, early career (10 people)', () => [makeVenue(V('home'), { crowd: 10, host: 0, level: 0.3 })]],
    ['home-22', 'Masjid Al-Amanah gym, built up (22 people)', () => [makeVenue(V('home'), { crowd: 22, host: 0, level: 0.3 })]],
    ['gymS-12', 'Small masjid room, away (12 people)', () => [makeVenue(V('gymS'), { crowd: 12, level: 0.32 })]],
    ['gymS-22', 'Small masjid room, Quick Play (22)', () => [makeVenue(V('gymS'))]],
    ['gymM-25', 'Masjid gym, away early career (25)', () => [makeVenue(V('gymM'), { crowd: 25, level: 0.32 })]],
    ['gymM-80', 'Masjid gym, Quick Play (80)', () => [makeVenue(V('gymM'))]],
    ['gymL-140', 'Community center gym (140)', () => [makeVenue(V('gymL'))]],
    ['outdoor-24', 'Outdoor court (24)', () => [makeVenue(V('out_' + BACKDROPS[0]), { crowd: 24, time: 'afternoon' })]],
    ['classic', 'Masjid League Arena (Quick Play default)', () => [null]],
    ['regional-early', 'Regional arena, career stage 1 (crowd 150)', () => [makeVenue(V('arena_regional'), { crowd: 150, fill: 0.25 })]],
    ...Object.keys(ARENAS).map(t => ['arena-' + t, ARENAS[t].name + ' (full)', () => [makeVenue(V('arena_' + t))]])
  ];
  RS.crowdPresets = () => RS.CROWD_PRESETS.map(([key, name]) => ({ key, name }));
  // audio: use the studio's context
  RS.audioWith = ctx => {
    SETTINGS.sound = true;
    if (!SFX.ctx) { const AC = window.AudioContext, WAC = window.webkitAudioContext; window.AudioContext = function () { return ctx; }; window.webkitAudioContext = window.AudioContext; try { SFX.init(); } finally { window.AudioContext = AC; window.webkitAudioContext = WAC; } }
    SFX.setOn && SFX.setOn(true); return !!SFX.ctx;
  };
  RS.sfxIds = () => SFX_IDS.slice();
  RS.variants = id => Object.entries(SFX_VARIANTS[id] || {}).map(([k, v]) => ({ key: k, label: v.label, sample: !!v.samples, db: (SFX_LEVELS[id] && SFX_LEVELS[id][k]) || 0 }));
  RS.where = id => SFX_WHERE[id] || '';
  RS.styles = () => Object.assign({}, SFX_STYLES);
  // play one variant, as the game would (level matched); the crowd hears as a big arena (tier 4) unless a venue is set up
  RS.playVariant = (id, k, args) => {
    SFX.force = { [id]: k }; if (id === 'cheer' && !CrowdA.force && !RS.crowdOn) CrowdA.force = { n: 999, room: 'none' };
    try { SFX[id].apply(SFX, args || []); } finally { SFX.force = null; if (!RS.crowdOn) CrowdA.force = null; }
  };
  // ---- crowd: set up a match at a preset venue (the screen shows it), then trigger what a match there would play
  RS.crowdSetup = key => {
    const P = RS.CROWD_PRESETS.find(x => x[0] === key); if (!P) return null;
    const [venue, opts] = P[2](); RS.clearOverlays && RS.clearOverlays();
    newMatch(TEAMS[0], TEAMS[1], Object.assign({ humans: [], venue }, opts || {}));
    Game.screen = 'play'; Game.paused = false; M.introT = 0; M.attract = false; M.cmdHook = q => { zeroCmd(q.cmd); return true; };
    RS.crowdOn = true; CrowdA.force = null; CrowdA.tick(true);
    return RS.crowdInfo();
  };
  RS.crowdInfo = () => ({ audience: CrowdA.n, tier: CrowdA.tier, room: CrowdA.room, roomOn: !!SETTINGS.room, levels: CrowdA.levels(), venue: M.venue ? M.venue.name || M.venue.id : M.gym ? 'Practice gym' : 'Masjid League Arena', stats: Object.assign({}, CrowdA.stats) });
  RS.crowdTrigger = kind => {
    const h = hoops[1];
    if (kind === 'make') { SFX.netSwish(0.8); SFX.cheer(0.9, 0.2); }
    else if (kind === 'dunk') { SFX.slam(); SFX.cheer(1.6, 0.22); FX.hype && FX.hype(1); }
    else if (kind === 'buzzer') { SFX.netSwish(1.1); SFX.buzzer(); SFX.cheer(2, 0.22); FX.hype && FX.hype(1); }
    else if (kind === 'miss') { SFX.clank(1); crowdGroan(0.9); }
    else if (kind === 'block') { SFX.block(); SFX.crowd('ooh', 1, 0.02); SFX.cheer(1, 0.16); }
    else if (kind === 'turnover') { SFX.whistle(); SFX.crowd('groan', 0.6, 0.15); }
    void h; return RS.crowdInfo();
  };
  RS.crowdOff = () => { RS.crowdOn = false; CrowdA.force = null; M.cmdHook = null; };
  // ---- the mix test: a CPU match at the venue, at normal speed, for 60 s, with a level per bus
  RS.mix = { on: false };
  RS.mixStart = key => {
    RS.crowdSetup(key); M.cmdHook = null; M.clock = 60; RS.mix = { on: true, t0: performance.now() };
    return RS.crowdInfo();
  };
  RS.mixStop = () => { RS.mix.on = false; RS.crowdOff(); goTitle(); };
  RS.setBus = (name, v) => {
    const t = SFX.ctx && SFX.ctx.currentTime;
    if (!SFX.ctx) return false;
    if (name === 'master' && SFX.master) SFX.master.gain.setTargetAtTime(v, t, 0.02);
    if (name === 'fx' && SFX.out) SFX.out.gain.setTargetAtTime(0.55 * v, t, 0.02);
    if (name === 'crowd' && SFX.crowdVol) SFX.crowdVol.gain.setTargetAtTime(v, t, 0.02);
    if (name === 'people' && SFX.crowdFx) SFX.crowdFx.gain.setTargetAtTime(v, t, 0.02);
    if (name === 'room' && SFX.roomWet) SFX.roomWet.gain.setTargetAtTime(v * ((ROOMS[CrowdA.room] || [0, 0])[1]), t, 0.02);
    return true;
  };
  // ---- the words a screen draws (for the screen census: word count, numbers, shared numbers)
  { const P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
    P.fillText = function (t) { try { if (window.__rsTexts && this.canvas && this.canvas.id === 'game' && this.globalAlpha > 0.05 && String(t).trim()) window.__rsTexts.add(String(t).trim()); } catch (e) {} return f0.apply(this, arguments); }; }
  RS.textsOn = () => { window.__rsTexts = new Set(); };
  RS.textsOff = () => { const t = [...(window.__rsTexts || [])]; window.__rsTexts = null; return { texts: t, taps: (Game.rects || []).filter(r => r.w > 2 && r.h > 2 && r.w < W - 4).length, screen: Game.screen }; };
  RS.setRoom = on => { SETTINGS.room = !!on; CrowdA.tick(true); return RS.crowdInfo(); };
})();
