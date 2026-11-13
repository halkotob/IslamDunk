// v9.20.0 headshots: a player's head and shoulders, drawn from the in-game character (drawPortrait -> drawPlayer: skin,
// hair, beard, cap, glasses, jersey or thobe) at a larger size into a small square, cached once per player and look.
// No art files. headshot(def, T, face) returns a canvas (HS_PX square, drawn at 2x for sharp edges); it is made the
// first time it's asked for, so a screen draws the ones it shows, a few a frame, and the lobby gym warms the cache.
const HS_PX = 128, HS_SCALE = 3.4;
const Headshots = { cache: new Map(), budget: 0, ms: 0, made: 0 };
function headshotKey(def, T, face) { return [def.name, def.skin, def.num, T.c1, T.c2, face, def.look ? JSON.stringify(def.look) : ''].join('|'); }
function headshotPaint(def, T, face) {
  const t0 = performance.now();
  // the whole player, big, on a tall scratch canvas; the head is found from the drawn pixels (caps and hair vary)
  const tw = 320, th = 420, tmp = makeCanvas(tw, th), tg = tmp.getContext('2d');
  try { hsPortrait(tg, tw / 2, th - 8, def, T, HS_SCALE, face); } catch (e) { /* the backdrop alone */ }
  const px = tg.getImageData(0, 0, tw, th).data;
  let top = -1; for (let y = 0; y < th && top < 0; y++) for (let x = 0; x < tw; x++) if (px[(y * tw + x) * 4 + 3] > 40) { top = y; break; }
  // the head's middle: the opaque columns over the first 60 rows below the top
  let sx = 0, n = 0; for (let y = Math.max(0, top); y < Math.min(th, top + 60); y++) for (let x = 0; x < tw; x++) if (px[(y * tw + x) * 4 + 3] > 40) { sx += x; n++; }
  const hx = n ? sx / n : tw / 2, crop = 132;                    // head plus shoulders and the top of the chest
  const c = makeCanvas(HS_PX, HS_PX), g = c.getContext('2d'); c.__hs = true;   // (tests/lobby.mjs finds them by this)
  // backdrop: the masjid's colour, a light glow behind the head, a stripe in the second colour
  const gr = g.createLinearGradient(0, 0, 0, HS_PX); gr.addColorStop(0, shade(T.c1, 0.18)); gr.addColorStop(1, shade(T.c1, -0.35));
  g.fillStyle = gr; g.fillRect(0, 0, HS_PX, HS_PX);
  const rg = g.createRadialGradient(HS_PX / 2, HS_PX * 0.42, 4, HS_PX / 2, HS_PX * 0.42, HS_PX * 0.55); rg.addColorStop(0, 'rgba(255,255,255,0.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, HS_PX, HS_PX);
  g.fillStyle = T.c2; g.globalAlpha = 0.5; g.fillRect(0, HS_PX - 10, HS_PX, 4); g.globalAlpha = 1;
  if (top >= 0) {
    g.drawImage(tmp, hx - crop / 2 + face * 4, top - 10, crop, crop, 0, 0, HS_PX, HS_PX);
  }
  Headshots.ms += performance.now() - t0; Headshots.made++;
  return c;
}
// drawPortrait's player (the same cached one), standing still, facing either way (drawPortrait always faces right)
function hsPortrait(g, x, y, def, T, s, face) {
  const key = def.name + '|' + def.skin + '|' + (def.look ? JSON.stringify(def.look) : '');
  let d = portraits.get(key);
  if (!d) { d = new Player(def, 9, 0, T); d.x = -9999; for (let i = 0; i < 40; i++) animate(d, 1 / 60); portraits.set(key, d); }
  d.T = T; d.face = face; d.outfit = null; d.def = def; d.expr = null;
  d.z = (y - FLOOR_TOP - FX.sy) / ZS; d.x = cam.x + W / 2 + (x - FX.sx - W / 2) / depthK(d.z); d.y = 0;   // P(d) lands on (x, y)
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y); drawPlayer(g, d); g.restore();
}
// face 1 looks right, -1 looks left (a left-side card looks in toward the middle)
function headshot(def, T, face = 1) {
  const key = headshotKey(def, T, face); let c = Headshots.cache.get(key);
  if (!c) {
    // made over the next frames (no stall on open): one a frame at least, more while this frame has spent under 4 ms
    if (Headshots.budget <= 0 || (Headshots.made0 !== Headshots.made && performance.now() > Headshots.until)) return null;
    Headshots.budget--; c = headshotPaint(def, T, face); Headshots.cache.set(key, c);
  }
  return c;
}
function headshotFrame() { Headshots.budget = 3; Headshots.made0 = Headshots.made; Headshots.until = performance.now() + 4; }
// warm the cache while nothing else is going on (the lobby gym): one a few frames, both sides' teams, both facings
function headshotWarm(list) { if ((Headshots.warmN = (Headshots.warmN | 0) + 1) % 6) return; for (const [d, T, f] of list) { const k = headshotKey(d, T, f); if (!Headshots.cache.has(k)) { Headshots.cache.set(k, headshotPaint(d, T, f)); return; } } }
