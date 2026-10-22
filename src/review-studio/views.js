// Drawing items. Every sprite is drawn by the game's own code (agent.game.js in the game frame) into an offscreen
// canvas at its natural size (1 canvas pixel = 1 game pixel), then shown at 1x, 2x or zoomed with smoothing off,
// so what you see is exactly what ships.
export const SIZES = {             // natural canvas size, and where the thing is drawn in it
  person: [200, 250], creator: [200, 250], jersey: [200, 250], crest: [140, 140], ball: [90, 90], hoop: [260, 300],
  venue: [960, 540], prop: null, masjid: [960, 540], hud: [960, 540]
};
export const PERSON_SCALE = 1.5;   // drawPortrait's default scale (the size people are shown at on most screens)

export function natural(it) {
  const s = it.spr;
  if (s.t === 'prop') { const [w, h] = s.box || [120, 120]; return [Math.ceil(w + 40), Math.ceil(h + 40)]; }
  if (s.t === 'scene') return [Math.ceil(s.w), 540];
  return SIZES[s.t];
}
// draw a sprite item into a new canvas at natural size. o: { face: 1 | -1, outfit: 'thobe' | 'kit', team, tod }
export function drawSprite(G, it, o = {}) {
  const rs = G.rs, s = it.spr, [w, h] = natural(it);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const outfit = o.outfit || (s.kit ? 'kit' : 'thobe');
  switch (s.t) {
    case 'person': rs.drawPerson(g, s.key, w / 2, h - 18, PERSON_SCALE, { face: o.face, outfit, team: o.team }); break;
    case 'creator': rs.drawCreator(g, s.key, s.i, w / 2, h - 18, PERSON_SCALE, { face: o.face, outfit }); break;
    case 'jersey': rs.drawPerson(g, 'cast/you', w / 2, h - 18, PERSON_SCALE, { face: o.face, outfit: 'kit', team: s.short }); break;
    case 'crest': rs.drawCrest(g, s.short, w / 2, h / 2, 56); break;
    case 'ball': rs.drawBall(g, s.skin, w / 2, h / 2, 36); break;
    case 'hoop': rs.drawHoop(g, w / 2, h * 0.45, 1); break;
    case 'venue': rs.drawVenue(g, s.id, w, h); break;
    case 'prop': g.save(); if (o.face === -1) { g.translate(w, 0); g.scale(-1, 1); } rs.drawWorldProp(g, s.scene, s.id, w / 2, h - 20, 1, o.tod == null ? 1 : o.tod); g.restore(); break;
    case 'scene': rs.drawWorldPano(g, s.id, o.tod == null ? 1 : o.tod); break;
    case 'masjid': rs.drawExteriorAt(g, s.lvl, w, h); break;
    case 'hud': rs.drawHud(g, s.touch); break;
    default: throw new Error('unknown sprite ' + s.t);
  }
  return c;
}
// a small cached thumbnail for the list (sprites and speakers)
const thumbs = new Map();
export function thumb(G, it, size = 40) {
  const k = it.id + '|' + size; if (thumbs.has(k)) return thumbs.get(k);
  let c;
  try {
    const src = drawSprite(G, it);
    c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), b = bbox(src), sc = Math.min(size / b.w, size / b.h, 1.5);
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, b.x, b.y, b.w, b.h, (size - b.w * sc) / 2, (size - b.h * sc) / 2, b.w * sc, b.h * sc);
  } catch (e) { c = null; }
  thumbs.set(k, c); return c;
}
// the drawn part of a canvas (non-transparent pixels), for cropping
export function bbox(c) {
  const { width: w, height: h } = c, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { x: 0, y: 0, w, h, empty: true };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// a speaker's face for conversations (cached)
const faces = new Map();
export function face(G, sp, size = 44) {
  const k = sp + '|' + size; if (faces.has(k)) return faces.get(k);
  const keyOf = { you: 'cast/you', elder: 'cast/mahmoud' };
  const people = G.rs.people(), key = keyOf[sp] || (people.find(p => p.key === 'cast/' + sp) || people.find(p => p.key === 'npc/' + sp) || {}).key;
  let c = null;
  if (key) try {
    const src = document.createElement('canvas'); src.width = 200; src.height = 250;
    G.rs.drawPerson(src.getContext('2d'), key, 100, 232, PERSON_SCALE, { outfit: 'thobe' });
    const b = bbox(src), hh = Math.min(b.h, b.w * 1.1);       // head and shoulders
    c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), sc = size / Math.max(b.w, hh);
    g.drawImage(src, b.x, b.y, b.w, hh, (size - b.w * sc) / 2, 0, b.w * sc, hh * sc);
  } catch (e) { c = null; }
  faces.set(k, c); return c;
}
export function clearCaches() { thumbs.clear(); faces.clear(); }
