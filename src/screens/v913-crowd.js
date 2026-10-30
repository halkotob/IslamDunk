// ================================================= v9.13: A CROWD THAT MATCHES THE ROOM
// What you hear follows the people you see. The audience is the number of crowd members the venue actually draws
// (VL.crowd, or the classic arena's stands), and it sets a tier:
//   0  nobody drawn (practice gym, neighbourhood, career screens): no crowd sound at all
//   1  a handful (1-12): no bed; single hand claps (spaced, panned to where that person sits) and a voice or two
//   2  a small crowd (13-45): a quiet, narrow murmur, clusters of claps, a few voices
//   3  a crowd (46-160): the bed and the swells, quieter than before, with clapping
//   4  big gyms and arenas: as before
// Reactions: make, big play (dunk, buzzer beater), groan (a bad miss, a turnover), "ooh" (a block), and an applause
// tail. A clap or a voice is always one of the drawn people: never more clappers or voices than people, and the ones on
// screen are used first (they raise their hands while they clap). Voices are synthesized placeholders (a buzzy
// vowel-shaped tone, not a person); recorded ones can go in CROWD_VOICE_SAMPLES.
// The room: ball, shoes, contact, whistle and buzzer go through a short reverb that fits the venue (tight in small
// gyms, long in arenas, none outdoors). Settings > Room echo turns it off.
const CROWD_TIERS = [[0, 0], [1, 12], [2, 45], [3, 160], [4, Infinity]];   // [tier, up to this many people]
const CROWD_VOICE_SAMPLES = { yeah: [], ooh: [], aww: [] };            // recorded voices, when there are some (URLs)
function crowdTierOf(n) { for (const [t, max] of CROWD_TIERS) if (n <= max) return t; return 4; }
// the people drawn in the current scene: [{ x (screen), m (the member, to light up) }]
function crowdPeople() {
  if (typeof M === 'undefined' || !M.teams || M.gym) return [];
  const live = ['play', 'netplay', 'halftime', 'final'].includes(Game.screen) || M.attract;
  if (!live) return [];
  if (VL && VL.crowd) return VL.crowd.map(m => ({ x: m.x + BG_X0 - cam.x, m }));
  if (!M.venue && typeof crowd !== 'undefined' && crowd.length) return crowd.map(m => ({ x: m.x - cam.x * 0.8, m }));
  return [];
}
// the room a venue (or the practice gym) is: reverb length (s) and wet level
const ROOMS = { none: null, small: [0.45, 0.16], practice: [0.6, 0.18], medium: [0.75, 0.2], large: [1.1, 0.24], arena: [1.5, 0.28], dome: [2.2, 0.32] };
function roomOf(v, gym) {
  if (gym) return 'practice';
  if (!v || v.kind === 'classic') return 'arena';
  if (v.kind === 'outdoor') return 'none';
  if (v.kind === 'gym') return v.size === 'L' ? 'large' : v.size === 'M' ? 'medium' : 'small';
  if (v.kind === 'arena') return v.tier === 'intl' || v.tier === 'grand' ? 'dome' : 'arena';
  return 'none';
}
const CrowdA = { n: 0, tier: 4, room: 'arena', at: 0, stats: { maxClap: 0, maxVoice: 0, lastClap: 0, lastVoice: 0, audience: 0, events: 0 }, irs: {} };
try { SETTINGS.room = localStorage.getItem('islamdunk.room') !== '0'; } catch (e) { SETTINGS.room = true; }
{
  const S = SFX;
  // ---- buses: murmur (tier 2), crowd effects (claps, voices), the room
  const _init = S.init;
  S.init = function () {
    const had = !!this.ctx, r = _init.apply(this, arguments);
    if (!had && this.ctx && this.noise) {
      try {
        const c = this.ctx, dest = this.crowdVol || this.master || c.destination;
        const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 2.2;
        const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1100;
        this.murG = c.createGain(); this.murG.gain.value = 0;
        src.connect(f); f.connect(f2); f2.connect(this.murG); this.murG.connect(dest); src.start(0, 0.7);
        this.crowdFx = c.createGain(); this.crowdFx.gain.value = 1; this.crowdFx.connect(dest);
        this.conv = c.createConvolver(); this.roomWet = c.createGain(); this.roomWet.gain.value = 0;
        this.conv.connect(this.roomWet); this.roomWet.connect(this.out);
        crowdTick(true);
      } catch (e) {}
    }
    return r;
  };
  // ---- the bed follows the tier (the swells start from it)
  const BED = [0, 0, 0, 0.018, 0.03], MUR = [0, 0, 0.012, 0, 0];
  S.bedBase = () => BED[CrowdA.tier] * S.crowdLevel;
  S.swellK = () => (CrowdA.tier >= 3 ? 1 : 0);                             // (tier 3: cheer() lowers the level itself)
  function irFor(key) {
    const R = ROOMS[key]; if (!R || !S.ctx) return null;
    if (CrowdA.irs[key]) return CrowdA.irs[key];
    const c = S.ctx, sec = R[0], len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch), dec = Math.exp(-6.9 / sec / c.sampleRate), dk = 0.6 / len; let lp = 0, env = 1, k = 0.25;
      for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * (1 - k * 0.8); d[i] = lp * env; env *= dec; k += dk; }   // (no exp per sample: cheap on phones)
      for (const [ms, a] of [[7 + ch * 2, 0.5], [13 + ch * 3, 0.35], [21 + ch, 0.28], [33 + ch * 4, 0.18]]) { const i = Math.floor(ms / 1000 * c.sampleRate * (0.6 + sec * 0.4)); if (i < len) d[i] += a; }   // early reflections (closer walls in small rooms)
    }
    return (CrowdA.irs[key] = b);
  }
  function setRoom(key) {
    CrowdA.room = key;
    if (!S.conv) return;
    const on = SETTINGS.room && ROOMS[key];
    if (on) { const ir = irFor(key); if (S.conv.buffer !== ir) S.conv.buffer = ir; S.roomWet.gain.setTargetAtTime(ROOMS[key][1], S.ctx.currentTime, 0.05);
      if (!S.roomSend) { S.roomSend = S.ctx.createGain(); S.roomSend.connect(S.conv); } }
    else { if (S.roomSend) { try { S.roomSend.disconnect(); } catch (e) {} S.roomSend = null; } S.roomWet.gain.setTargetAtTime(0, S.ctx.currentTime, 0.05); }
  }
  // ---- every frame (cheap, 4 times a second): the audience, the tier, the room
  function crowdTick(force) {
    const now = nowMs(); if (!force && now - CrowdA.at < 250) return; CrowdA.at = now;
    const P = crowdPeople(), n = CrowdA.force ? CrowdA.force.n : P.length, tier = CrowdA.force ? crowdTierOf(n) : crowdTierOf(n);
    CrowdA.n = n; CrowdA.stats.audience = n;
    const room = CrowdA.force ? CrowdA.force.room : (typeof M !== 'undefined' && M.teams && (['play', 'netplay', 'halftime', 'final'].includes(Game.screen) || M.attract)) ? roomOf(M.venue, M.gym) : 'none';
    if (!S.ctx) { CrowdA.tier = tier; CrowdA.room = room; return; }
    if (tier !== CrowdA.tier || force) {
      CrowdA.tier = tier; const t = S.ctx.currentTime;
      if (S.crowdG) { S.crowdG.gain.cancelScheduledValues(t); S.crowdG.gain.setTargetAtTime(S.bedBase(), t, 0.3); }
      if (S.murG) S.murG.gain.setTargetAtTime(MUR[tier] * S.crowdLevel, t, 0.3);
    }
    if (room !== CrowdA.room || force || CrowdA.roomOn !== SETTINGS.room) { CrowdA.roomOn = SETTINGS.room; setRoom(room); }
  }
  CrowdA.tick = crowdTick;
  CrowdA.levels = () => ({ bed: S.bedBase(), murmur: MUR[CrowdA.tier] * S.crowdLevel, swell: S.swellK() });
  const _scl = S.setCrowdLevel;
  S.setCrowdLevel = function (l) { _scl.apply(this, arguments); if (this.crowdG) this.crowdG.gain.value = this.bedBase(); if (this.murG) this.murG.gain.value = MUR[CrowdA.tier] * l; };
  const _r = render;
  render = function (g) { const r = _r.apply(this, arguments); try { crowdTick(false); } catch (e) {} return r; };

  // ---- one hand clap from one person, and a few in a row
  const pan = (x) => clamp((x / Math.max(1, W)) * 2 - 1, -0.9, 0.9);
  function viaPan(x, fn) {
    const c = S.ctx, real = S.out, p = c.createStereoPanner ? c.createStereoPanner() : null;
    const g = c.createGain(); g.gain.value = 1;
    if (p) { p.pan.value = pan(x); g.connect(p); p.connect(S.crowdFx || real); } else g.connect(S.crowdFx || real);
    S.out = g; try { fn(); } finally { S.out = real; setTimeout(() => { try { g.disconnect(); p && p.disconnect(); } catch (e) {} }, 5000); }
  }
  function clapper(person, n, d0, loud, gap) {
    const tone = person.tone || (person.tone = rand(0.8, 1.25)); let d = d0;
    viaPan(person.x, () => { for (let i = 0; i < n; i++) { S.clapAt(loud * rand(0.8, 1.1), d, tone); d += gap * rand(0.85, 1.2); } });
    if (person.m) person.m.clapT = nowMs() + d0 * 1000;
    return d;
  }
  // ---- placeholder voices: a buzzy source through three moving formants (sounds like a vowel, not a person)
  const VOW = { i: [270, 2290, 3010], e: [530, 1840, 2480], a: [730, 1090, 2440], aw: [570, 840, 2410], u: [300, 870, 2240], o: [450, 800, 2830] };
  const WORDS = {   // vowel path, length (s), pitch shape (start, peak, end) x base
    yeah: { v: ['i', 'e', 'a'], len: 0.38, p: [1.0, 1.3, 0.95] }, ooh: { v: ['u', 'u', 'o'], len: 0.55, p: [0.9, 1.35, 1.0] },
    aww: { v: ['aw', 'aw', 'o'], len: 0.55, p: [1.25, 1.0, 0.7] }, oh: { v: ['o', 'o', 'u'], len: 0.45, p: [1.1, 1.0, 0.8] }
  };
  function voice(word, person, d = 0, loud = 0.06) {
    const c = S.ctx, W2 = WORDS[word], smp = CROWD_VOICE_SAMPLES[word];
    if (smp && smp.length) { viaPan(person.x, () => S.playSample({ label: 'voice-' + word, samples: smp }, [])); return; }
    const t = c.currentTime + d, f0 = person.f0 || (person.f0 = rand(105, 210)), L = W2.len * rand(0.9, 1.15);
    viaPan(person.x, () => {
      const src = c.createOscillator(); src.type = 'sawtooth';
      src.frequency.setValueAtTime(f0 * W2.p[0], t); src.frequency.linearRampToValueAtTime(f0 * W2.p[1], t + L * 0.35); src.frequency.linearRampToValueAtTime(f0 * W2.p[2], t + L);
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = rand(4.5, 6.5); vg.gain.value = f0 * 0.02; vib.connect(vg); vg.connect(src.frequency);
      const a = c.createGain(); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(loud, t + 0.04); a.gain.setValueAtTime(loud, t + L * 0.6); a.gain.exponentialRampToValueAtTime(0.0001, t + L);
      for (let k = 0; k < 3; k++) {
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [9, 12, 14][k];
        const f = W2.v.map(v => VOW[v][k]);
        bp.frequency.setValueAtTime(f[0], t); bp.frequency.linearRampToValueAtTime(f[1], t + L * 0.35); bp.frequency.linearRampToValueAtTime(f[2], t + L * 0.8);
        const fg = c.createGain(); fg.gain.value = [1, 0.5, 0.25][k] * 3;
        src.connect(bp); bp.connect(fg); fg.connect(a);
      }
      a.connect(S.out); src.start(t); vib.start(t); src.stop(t + L + 0.05); vib.stop(t + L + 0.05);
    });
  }
  // a whole crowd's vowel (tiers 3-4): noise through the vowel's formants, a swell of "ohh" or "ooh"
  function massVowel(word, amt, d) {
    const c = S.ctx, t = c.currentTime + d, W2 = WORDS[word], L = 0.7 + 0.4 * amt, g0 = 0.05 * amt * S.crowdLevel * (CrowdA.tier >= 4 ? 1 : 0.6);
    const s = c.createBufferSource(); s.buffer = S.noise; const a = c.createGain();
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(Math.max(0.0002, g0), t + 0.12); a.gain.exponentialRampToValueAtTime(0.0001, t + L);
    for (let k = 0; k < 3; k++) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6; const f = W2.v.map(v => VOW[v][k]);
      bp.frequency.setValueAtTime(f[0] * (word === 'ooh' ? 0.9 : 1.1), t); bp.frequency.linearRampToValueAtTime(f[2] * (word === 'ooh' ? 1.15 : 0.85), t + L);
      const fg = c.createGain(); fg.gain.value = [1, 0.45, 0.2][k] * 2.5; s.connect(bp); bp.connect(fg); fg.connect(a); }
    a.connect(S.crowdFx || S.out); s.start(t, Math.random()); s.stop(t + L + 0.05);
  }
  // choose people: on screen first, then the rest; never more than are drawn
  function choose(P, k) {
    const on = P.filter(p => p.x > 0 && p.x < W), off = P.filter(p => !(p.x > 0 && p.x < W)), out = [];
    shuffle(on); shuffle(off);
    for (const p of on.concat(off)) { if (out.length >= k) break; out.push(p); }
    return out;
  }
  // ---- reactions. kind: make | big | groan | ooh | applause
  S.crowd = function (kind, amt = 1, delay = 0) {
    if (!this.ctx || !this.out) return { clap: 0, voice: 0 };
    crowdTick(true);
    const P = CrowdA.force ? Array.from({ length: CrowdA.force.n }, (_, i) => ({ x: (i + 0.5) / Math.max(1, CrowdA.force.n) * W })) : crowdPeople();
    const n = P.length, tier = CrowdA.tier, st = CrowdA.stats; st.events++;
    let nClap = 0, nVoice = 0;
    const claps = (k, reps, loud, gap) => { const who = choose(P, Math.min(n, k)); nClap = who.length; for (const p of who) clapper(p, reps + rint(3), delay + Math.random() * 0.3, loud, gap); return who; };
    const voices = (word, k, loud, clappers = []) => { const who = choose(P, Math.min(n, k)); void clappers;   // (a clapper can shout too: each count stays within the people drawn)
      nVoice += who.length; who.forEach((p, i) => voice(i === 0 ? word : (word === 'yeah' && Math.random() < 0.4 ? 'ooh' : word), p, delay + 0.05 + Math.random() * 0.35, 0.05)); };
    if (tier === 0 || !n) { /* nobody there */ }
    else if (kind === 'make' || kind === 'big' || kind === 'applause') {
      const big = kind === 'big';
      if (tier <= 2) {
        const k = tier === 1 ? (big ? n : Math.min(n, 1 + Math.round(amt * 2.5))) : (big ? Math.min(n, 22) : Math.min(n, 4 + Math.round(amt * 6)));
        const who = claps(k, big ? 4 : kind === 'applause' ? 2 : 3, tier === 1 ? 0.18 : 0.12, 0.24);
        if (kind !== 'applause') voices(big ? 'yeah' : 'yeah', tier === 1 ? (big ? 2 : amt > 0.6 ? 1 : 0) : (big ? 4 : 1 + rint(2)), 0.05, who);
        if (tier === 2 && this.murG) { const t = this.ctx.currentTime + delay, g = this.murG.gain, b = MUR[2] * this.crowdLevel; g.cancelScheduledValues(t); g.setValueAtTime(b, t); g.linearRampToValueAtTime(b * (big ? 3 : 1.8), t + 0.2); g.linearRampToValueAtTime(b, t + 1.4); }
      } else {
        if (tier === 3) claps(Math.min(n, 8 + Math.round(amt * 8)), 3, 0.06, 0.22);
      }
    } else if (kind === 'groan') {
      if (tier <= 2) voices('aww', tier === 1 ? 1 : 2 + rint(2), 0.045);
      else { massVowel('oh', amt, delay); voices('aww', 2, 0.04); }
    } else if (kind === 'ooh') {
      if (tier <= 2) voices('ooh', tier === 1 ? Math.min(2, n) : 3, 0.05);
      else massVowel('ooh', amt, delay);
    }
    st.lastClap = nClap; st.lastVoice = nVoice; st.maxClap = Math.max(st.maxClap, nClap); st.maxVoice = Math.max(st.maxVoice, nVoice);
    if (nClap > n || nVoice > n) st.over = (st.over || 0) + 1;
    return { clap: nClap, voice: nVoice, audience: n, tier };
  };
  // the cheer everyone already calls: the variant's swell and burst in tiers 3-4, people in tiers 1-2, nothing in 0
  const _ch = S.cheer;
  S.cheer = function (amt = 1, delay = 0) {
    if (!this.ctx) return;
    crowdTick(true);
    const t = CrowdA.tier, kind = amt >= 1.4 ? 'big' : 'make';
    if (t >= 3) { const lvl = this.crowdLevel; if (t === 3) this.crowdLevel = lvl * 0.6; try { _ch.call(this, amt, delay); } finally { this.crowdLevel = lvl; } }
    const r = this.crowd(kind, amt, delay);
    if (t >= 1 && t <= 3 && kind === 'big') setTimeout(() => this.crowd('applause', 0.5, 0), 1300);   // the applause tail
    return r;
  };
}
// the people who clap raise their hands (small crowds are drawn live)
{
  const _dcm = drawCrowdMember;
  drawCrowdMember = function (g, m, x, y, bounce, ex, groan) {
    if (m && m.clapT) { const dt = nowMs() - m.clapT; if (dt > -50 && dt < 900) { ex = Math.max(ex || 0, 0.75); bounce = Math.max(bounce || 0, Math.abs(Math.sin(dt / 60)) * 2); } }
    return _dcm.call(this, g, m, x, y, bounce, ex, groan);
  };
}
// groan after a bad miss and a turnover (not a steal: that's a cheer), "ooh" on a block
{
  const _cg = crowdGroan;
  crowdGroan = function (a = 1) { _cg.apply(this, arguments); SFX.crowd && SFX.crowd('groan', a); };
  let stealT = -1;
  const _gb = giveBall;
  giveBall = function (p, how) { if (how === 'steal') stealT = M.time; return _gb.apply(this, arguments); };
  const _tov = addTov;
  addTov = function (p) { const r = _tov.apply(this, arguments); if (p && !M.attract && M.time - stealT > 0.1) SFX.crowd && SFX.crowd('groan', 0.6, 0.15); return r; };
  const _bf = blockFeel;
  blockFeel = function () { SFX.crowd && SFX.crowd('ooh', 1, 0.02); return _bf.apply(this, arguments); };
}
// ---- Settings: Sound style, Room echo
{
  const keys = Object.keys(SFX_STYLES);
  const style = { label: 'Sound style', get: () => SFX_STYLES[SFX.style] + (Object.keys(SFX.picks).length ? ' (+' + Object.keys(SFX.picks).length + ' picked)' : ''), step: d => { SFX.style = keys[(keys.indexOf(SFX.style) + (d || 1) + keys.length) % keys.length]; SFX.saveStyle(); SFX.bounce && SFX.bounce(); } };
  const room = { label: 'Room echo', get: () => SETTINGS.room ? 'On' : 'Off', step: () => { SETTINGS.room = !SETTINGS.room; try { localStorage.setItem('islamdunk.room', SETTINGS.room ? '1' : '0'); } catch (e) {} CrowdA.tick && CrowdA.tick(true); } };
  const i = SET_ITEMS.findIndex(s => s.label === 'Crowd volume');
  SET_ITEMS.splice(i >= 0 ? i + 1 : SET_ITEMS.length - 1, 0, style, room);
  const G = SET_GROUPS.find(g => g.name === 'Sound & controller');
  if (G && G.labels) {
    const j = G.labels.indexOf('Crowd volume'); G.labels.splice(j >= 0 ? j + 1 : G.labels.length, 0, 'Sound style', 'Room echo');
    // a group holds at most 7 rows on desktop: Stick deadzone moves to Display (the catch-all)
    G.labels = G.labels.filter(l => l !== 'Stick deadzone');
  }
}
