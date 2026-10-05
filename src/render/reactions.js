// ================================================= v4.3: FEEL + FOUNDATIONS
// ------------------------------------------------------------- studio
const STUDIO = { name: 'Masaajid Games', short: 'MASAAJID GAMES' };      // placeholder studio name: change it here

// ============================================================ REACTIONS
// Short body-language beats on court: arms up after a block or a big dunk, a
// fist pump, a nod after a good pass, head down after a turnover. They only
// override the idle/running pose for about a second.
function react(p, type, dur = 1) { if (p) p.react = { type, until: M.time + dur }; }
function reactPose(p, t) {
  const r = p.react; if (!r || M.time > r.until) return;
  const k = clamp((r.until - M.time) * 4, 0, 1);               // ease out at the end
  if (r.type === 'armsUp') Object.assign(t, { ns: lerp(t.ns, 3.0, k), fs: lerp(t.fs, 2.9, k), ne: 0.2, fe: 0.25, lean: t.lean - 0.08 * k });
  else if (r.type === 'fist') { t.ns = lerp(t.ns, 2.4, k); t.ne = lerp(t.ne, 1.9, k); t.lean -= 0.04 * k; }
  else if (r.type === 'nod') t.lean += Math.max(0, Math.sin((r.until - M.time) * 16)) * 0.14 * k;
  else if (r.type === 'headDown') Object.assign(t, { lean: t.lean + 0.3 * k, ns: lerp(t.ns, 0.2, k), fs: lerp(t.fs, 0.15, k), ne: lerp(t.ne, 0.1, k), fe: lerp(t.fe, 0.1, k) });
  else if (r.type === 'handsHead') Object.assign(t, { ns: lerp(t.ns, 2.5, k), fs: lerp(t.fs, 2.4, k), ne: lerp(t.ne, 2.5, k), fe: lerp(t.fe, 2.5, k) });
}
// crowd groan (hands on heads) after a bad miss, scaled by crowd size
FX.groanV = 0;
function crowdGroan(a = 1) { FX.groanV = Math.max(FX.groanV, a); }

// ============================================================ MAKE GLOW
// A brief colored glow on the rim and net: soft gold for a make, warm orange
// when the shooter is on fire, teal-green for a green release; buzzer beaters
// and poster dunks get a slightly bigger one. Under 400 ms, makes only.
const GLOW_COL = { gold: [255, 226, 150], fire: [255, 110, 45], green: [87, 227, 137] };
function hoopGlow(h, kind, big) {
  const col = GLOW_COL[kind] || GLOW_COL.gold;
  h.glow = { start: Game.t, dur: big ? 0.38 : 0.28, col, big, sprite: radialSprite('hoop-' + kind, col.join(','), 0.55) };
}
function drawHoopGlow(g, h) {
  const G = h.glow; if (!G) return;
  const u = (Game.t - G.start) / G.dur; if (u >= 1 || u < 0) { if (u >= 1) h.glow = null; return; }
  const a = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * 0.4) * (G.big ? 0.8 : 0.55), [c0, c1, c2] = G.col;
  const [rx, ry] = P(h.x, RIM_Y + h.dy, h.z), k = depthK(h.z), rw = (RIM_R + 3) * k;
  g.save(); g.globalCompositeOperation = 'lighter';
  const radius = (G.big ? 48 : 32) * k, glow = G.sprite;
  g.globalAlpha = a * (REDUCED_MOTION ? 0.45 : 0.7); g.drawImage(glow, rx - radius, ry + 12 * k - radius, radius * 2, radius * 2); g.globalAlpha = REDUCED_MOTION ? 0.45 : 0.7;
  g.strokeStyle = `rgba(${c0},${c1},${c2},${a})`; g.lineWidth = (G.big ? 4 : 3) * k;
  g.beginPath(); g.ellipse(rx, ry, rw, rw * 0.5, 0, 0, Math.PI * 2); g.stroke();
  g.restore();
}

