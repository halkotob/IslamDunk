// ============================================================ LOGO
// v7.9: the mark is a dunker in a thawb and kufi, in the classic split-leg, ball-overhead dunk pose,
// as one solid silhouette (gold on the title, on a green tile for the app icon). The wordmark below
// is unchanged. `s` scales everything; opts.tagline adds the subtitle. drawLogoIcon() is the mark
// alone on a rounded tile, for small sizes (app icon, thumbnails).
const DUNKER = {   // generated: body shapes (filled one by one), cut lines (negative space), ball, bounds; 400x400 design space
  body: [
    'M204.7 123.3L205 121.6L204.9 119.8L204.5 118.1L203.7 116.6L202.5 115.2L201.2 114.2L199.6 113.4L197.9 113L196.1 113L194.4 113.4L192.8 114.2L191.5 115.2L190.3 116.6L189.5 118.1L171.7 164.4L171.1 166.6L171 168.9L171.5 171.2L172.5 173.2L173.9 175L175.7 176.5L177.8 177.5L180 178L182.3 177.9L184.5 177.4L186.6 176.3L188.3 174.8L189.7 173L190.6 170.8Z',
    'M216.2 85.9L216.5 84.5L216.4 83.1L216.1 81.7L215.5 80.5L214.6 79.4L213.4 78.5L212.2 77.9L210.8 77.5L209.4 77.5L208 77.8L206.7 78.4L205.5 79.3L204.6 80.4L204 81.6L189.6 118.1L189.1 119.8L189 121.7L189.4 123.5L190.2 125.1L191.3 126.6L192.7 127.7L194.3 128.5L196.1 129L198 128.9L199.8 128.5L201.4 127.7L202.8 126.5L203.9 125L204.6 123.4Z',
    'M120.2 197.5L118.9 198.5L117.8 199.7L117.1 201.1L116.6 202.7L116.5 204.3L116.8 206L117.4 207.5L118.3 208.8L119.5 210L120.9 210.8L122.4 211.3L124 211.5L125.7 211.3L127.2 210.8L170 190.6L171.9 189.4L173.4 187.9L174.6 186L175.3 184L175.5 181.8L175.2 179.6L174.4 177.6L173.2 175.8L171.6 174.3L169.7 173.2L167.6 172.6L165.4 172.5L163.2 172.9L161.2 173.8Z',
    'M88.9 217.1L87.9 217.9L87.1 218.8L86.6 220L86.3 221.2L86.2 222.4L86.4 223.7L86.9 224.8L87.7 225.9L88.6 226.7L89.7 227.3L90.9 227.7L92.2 227.8L93.4 227.6L94.6 227.2L127.4 210.7L128.8 209.8L130 208.5L130.9 207L131.4 205.3L131.5 203.6L131.2 201.9L130.5 200.3L129.5 198.9L128.2 197.8L126.7 197L125 196.6L123.3 196.5L121.6 196.9L120 197.6Z',
    'M69.8 219.6L69.3 219.7L68.8 219.9L68.4 220.2L68.1 220.6L67.8 221L67.7 221.5L67.6 222L67.7 222.5L67.8 223L68.1 223.4L68.4 223.8L68.8 224.1L69.3 224.3L69.8 224.4L91.6 226.4L92.6 226.4L93.6 226.1L94.6 225.6L95.3 224.9L95.9 224L96.3 223L96.4 222L96.3 221L95.9 220L95.3 219.1L94.6 218.4L93.6 217.9L92.6 217.6L91.6 217.6Z',
    'M70.8 228.9L70.4 229.2L70.1 229.6L69.8 230L69.7 230.5L69.6 231L69.7 231.5L69.8 232L70.1 232.4L70.4 232.8L70.8 233.1L71.3 233.3L71.8 233.4L72.3 233.4L72.8 233.3L93.4 226.2L94.4 225.7L95.2 225L95.8 224.2L96.2 223.3L96.4 222.2L96.3 221.2L96 220.2L95.5 219.3L94.7 218.6L93.9 218L92.9 217.7L91.8 217.6L90.8 217.8L89.8 218.2Z',
    'M76 237.6L75.8 238.1L75.6 238.6L75.6 239.1L75.7 239.6L75.8 240.1L76.1 240.5L76.5 240.9L76.9 241.1L77.4 241.3L77.9 241.4L78.4 241.4L78.9 241.2L79.3 241L79.7 240.7L94.9 224.8L95.5 224L95.8 223.2L96 222.2L95.9 221.3L95.7 220.4L95.2 219.6L94.5 218.9L93.8 218.4L92.9 218.1L91.9 218L91 218.1L90.1 218.5L89.4 219L88.7 219.7Z',
    'M87.7 204.4L87.3 204.1L86.9 203.9L86.4 203.7L85.9 203.7L85.4 203.8L85 203.9L84.5 204.2L84.2 204.6L83.9 205L83.8 205.5L83.7 205.9L83.7 206.4L83.9 206.9L84.1 207.3L92.4 218.9L92.9 219.4L93.5 219.8L94.2 220.1L95 220.2L95.7 220.1L96.4 219.9L97 219.5L97.5 218.9L97.9 218.3L98.1 217.6L98.2 216.8L98.1 216.1L97.8 215.4L97.3 214.8Z',
    'M105.4 266.5L103.5 267.7L101.9 269.3L100.6 271.2L99.8 273.4L99.5 275.6L99.7 277.9L100.3 280.1L101.4 282L102.9 283.8L104.8 285.1L106.8 286L109.1 286.5L111.3 286.4L113.6 285.9L176.7 263.2L179.6 261.7L182.1 259.7L184.1 257.1L185.4 254.1L186 250.9L185.8 247.7L184.9 244.6L183.3 241.8L181.1 239.4L178.4 237.6L175.4 236.4L172.2 236L169 236.3L165.9 237.4Z',
    'M60.8 308.6L59.8 309.8L59 311.3L58.6 312.8L58.5 314.5L58.8 316.1L59.4 317.6L60.3 318.9L61.5 320L62.9 320.8L64.5 321.3L66.1 321.5L67.7 321.3L69.2 320.8L70.6 319.9L116.4 284.3L118.2 282.6L119.5 280.5L120.3 278.2L120.5 275.8L120.2 273.4L119.3 271.1L117.9 269.1L116.2 267.5L114 266.3L111.7 265.6L109.3 265.5L106.9 266L104.7 267L102.7 268.4Z',
    'M256.6 291.5L258.8 292.3L261 292.5L263.3 292.2L265.4 291.5L267.4 290.3L269 288.8L270.3 286.9L271.1 284.8L271.5 282.5L271.4 280.2L270.7 278.1L269.7 276L268.2 274.3L266.3 273L207.1 237.9L204.2 236.6L201 236L197.8 236.2L194.6 237.1L191.8 238.6L189.4 240.8L187.6 243.5L186.4 246.5L186 249.7L186.3 252.9L187.4 256L189.1 258.8L191.4 261L194.1 262.7Z',
    'M316.9 318.8L318.5 319.3L320.1 319.5L321.7 319.3L323.2 318.8L324.6 317.9L325.8 316.8L326.7 315.4L327.3 313.9L327.5 312.3L327.4 310.6L326.9 309.1L326.1 307.6L325 306.4L323.7 305.5L266.2 272.9L264 271.9L261.6 271.5L259.2 271.7L256.8 272.4L254.7 273.6L253 275.2L251.6 277.2L250.8 279.5L250.5 281.9L250.8 284.3L251.6 286.6L252.9 288.6L254.6 290.3L256.7 291.6Z',
    'M161.3 180.8L162.4 182.7L163.9 184.3L165.8 185.5L167.9 186.3L170.2 186.5L172.4 186.2L174.4 185.4L176.3 184.1L177.8 182.5L178.8 180.5L179.4 178.3L179.5 176.1L179 173.9L178 171.9L167.8 155.7L166.7 154.4L165.4 153.3L163.9 152.5L162.2 152.1L160.5 152L158.8 152.3L157.3 152.9L155.8 153.9L154.7 155.1L153.8 156.6L153.2 158.2L153 159.9L153.2 161.6L153.7 163.2Z',
    'M141.5 150a15.5 15.5 0 1 0 31 0a15.5 15.5 0 1 0 -31 0Z',
    'M203 79a8 8 0 1 0 16 0a8 8 0 1 0 -16 0Z',
    'M160 166C155.7 170.3 150.7 180.7 150 190C149.3 199.3 156.3 213 156 222C155.7 231 154 237.3 148 244C142 250.7 128 255.8 120 262C112 268.2 98.3 276.2 100 281C101.7 285.8 119.7 289 130 291C140.3 293 152.3 293.7 162 293C171.7 292.3 179.3 287 188 287C196.7 287 204 291.7 214 293C224 294.3 239 295.5 248 295C257 294.5 266.5 294 268 290C269.5 286 266 278.3 257 271C248 263.7 223.8 255.5 214 246C204.2 236.5 201.3 225.7 198 214C194.7 202.3 197.7 184.3 194 176C190.3 167.7 181.7 165.7 176 164C170.3 162.3 164.3 161.7 160 166Z',
    'M60 310C65.7 306.3 71.3 311.3 74 314C76.7 316.7 78.3 321.3 76 326C73.7 330.7 65.7 339 60 342C54.3 345 45.3 345 42 344C38.7 343 37 341.7 40 336C43 330.3 54.3 313.7 60 310Z',
    'M316 306C316.7 303 324.3 305.3 330 308C335.7 310.7 344.7 317.7 350 322C355.3 326.3 362.7 331.3 362 334C361.3 336.7 352 339.3 346 338C340 336.7 331 331.3 326 326C321 320.7 315.3 309 316 306Z',
    'M163 158L173 154L178 170L169 173Z'
  ],
  cuts: [['M141.5 146L149 140.5L158 138.5L167 139.5L173 143', 3.4], ['M188 289L187 267', 3.4], ['M44 338L60 337', 2.4], ['M345 333L360 334', 2.4]],
  ball: [216, 54, 19], bbox: [35, 33, 365, 347]
};
const _dunkCache = new Map();
// the silhouette rendered once per size + style to an offscreen canvas (cuts need destination-out)
function dunkerSprite(h, style) {
  const key = Math.round(h) + style; let c = _dunkCache.get(key); if (c) return c;
  const [x0, y0, x1, y1] = DUNKER.bbox, k = h / (y1 - y0), dpr = Math.min(3, Math.max(1, (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1))) * 1.5;
  c = document.createElement('canvas'); c.width = Math.ceil((x1 - x0) * k * dpr) + 2; c.height = Math.ceil(h * dpr) + 2;
  const x = c.getContext('2d'); x.scale(k * dpr, k * dpr); x.translate(-x0, -y0);
  for (const d of DUNKER.body) x.fill(new Path2D(d));
  x.beginPath(); x.arc(DUNKER.ball[0], DUNKER.ball[1], DUNKER.ball[2], 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-out'; x.lineCap = 'round'; x.lineJoin = 'round';
  for (const [d, w] of DUNKER.cuts) { x.lineWidth = w; x.stroke(new Path2D(d)); }
  x.globalCompositeOperation = 'source-in'; x.setTransform(1, 0, 0, 1, 0, 0);
  if (style === 'gold') { const gr = x.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.45, '#f2cf6b'); gr.addColorStop(1, '#c08a1c'); x.fillStyle = gr; }
  else x.fillStyle = style;
  x.fillRect(0, 0, c.width, c.height);
  c.dw = (x1 - x0) * k; c.dh = h; c.cx = ((x0 + x1) / 2 - x0) * k;
  _dunkCache.set(key, c); return c;
}
// the mark centered at (cx, cy), h tall: dark extrude + outline, then the gold figure
function drawLogoEmblem(g, cx, cy, r, plain) {
  const h = r * 3.0;
  if (typeof document === 'undefined') return;
  const gold = dunkerSprite(h, plain ? '#f2cf6b' : 'gold'), dark = dunkerSprite(h, '#082a22');
  const x = cx - gold.dw / 2, y = cy - h / 2, o = Math.max(1, r * 0.06);
  if (!plain) {
    for (let d = Math.round(r * 0.16); d > 0; d--) g.drawImage(dark, x, y + d, gold.dw, h);                       // extrude, like the wordmark
    for (const [ox, oy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) g.drawImage(dark, x + ox, y + oy, gold.dw, h);     // outline
  }
  g.drawImage(gold, x, y, gold.dw, h);
}
function drawLogoMark(g, cx, top, s = 1, opts = {}) {
  const r = 30 * s, ey = top + r * 1.6;
  g.save();
  // soft glow behind the emblem
  const gl = g.createRadialGradient(cx, ey, r * 0.3, cx, ey, r * 2.4); gl.addColorStop(0, 'rgba(242,207,107,0.28)'); gl.addColorStop(1, 'rgba(242,207,107,0)');
  g.fillStyle = gl; g.fillRect(cx - r * 2.6, ey - r * 2.6, r * 5.2, r * 5.2);
  drawLogoEmblem(g, cx, ey, r);
  // wordmark below with clear space: heavy letters, green extrude, gold face
  const wy = ey + r * 1.62 + 58 * s, fs = Math.round(70 * s), txt = 'ISLAM DUNK';
  g.font = `${fs}px ${FONT}`; g.textAlign = 'center'; g.lineJoin = 'round';
  if (g.letterSpacing !== undefined) g.letterSpacing = `${Math.round(2 * s)}px`;
  for (let d = Math.round(7 * s); d > 0; d--) { g.fillStyle = d > 3 * s ? '#082a22' : '#0f4a3b'; g.fillText(txt, cx, wy + d); }   // extrude
  g.lineWidth = 9 * s; g.strokeStyle = '#082a22'; g.strokeText(txt, cx, wy);
  const tg = g.createLinearGradient(0, wy - fs * 0.8, 0, wy); tg.addColorStop(0, '#fff6cf'); tg.addColorStop(0.45, '#f2cf6b'); tg.addColorStop(1, '#c08a1c');
  g.fillStyle = tg; g.fillText(txt, cx, wy);
  g.lineWidth = Math.max(1, 1.4 * s); g.strokeStyle = 'rgba(255,250,230,0.55)'; g.strokeText(txt, cx, wy - 1.5 * s);           // bevel highlight
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  // underline rule with a star, echoing a ball's arc
  const lw = g.measureText(txt).width * 0.62;
  g.strokeStyle = '#1e7a5e'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(cx - lw / 2, wy + 16 * s); g.quadraticCurveTo(cx, wy + 24 * s, cx + lw / 2, wy + 16 * s); g.stroke();
  g.fillStyle = '#f2cf6b'; star8(g, cx, wy + 20 * s, 6 * s); g.fill();
  let bottom = wy + 26 * s;
  if (opts.tagline) { g.font = `${Math.round(16 * s)}px ${BODY}`; g.fillStyle = IVORY; g.fillText('Two-on-two masjid league basketball', cx, wy + 50 * s); bottom = wy + 56 * s; }
  g.restore();
  return bottom;
}
// full-bleed square (iOS / maskable icons: the OS rounds or masks it), mark inside the safe zone
function drawLogoIconFull(g, size, k = 1) {
  const bg = g.createLinearGradient(0, 0, 0, size); bg.addColorStop(0, '#1e7a5e'); bg.addColorStop(1, '#0b3a2e');
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  drawLogoEmblem(g, size / 2, size / 2, size * 0.21 * k, true);
}
function drawLogoIcon(g, cx, cy, size) {
  const h = size / 2;
  g.save();
  const bg = g.createLinearGradient(0, cy - h, 0, cy + h); bg.addColorStop(0, '#1e7a5e'); bg.addColorStop(1, '#0b3a2e');
  g.fillStyle = bg; roundRect(g, cx - h, cy - h, size, size, size * 0.22); g.fill();
  g.strokeStyle = '#f2cf6b'; g.lineWidth = Math.max(1, size * 0.035); roundRect(g, cx - h + size * 0.05, cy - h + size * 0.05, size * 0.9, size * 0.9, size * 0.18); g.stroke();
  drawLogoEmblem(g, cx, cy + size * 0.01, size * 0.21, true);
  g.restore();
}

// ============================================================ LIGHT FIXTURES
// Ceiling lights read as lit fixtures (housing, glowing lens, halo) mounted
// on a ceiling strip, instead of flat gray bars along the top edge.
function lightFixture(g, x, y, w, on = 1) {
  g.fillStyle = '#2f3237'; roundRect(g, x - w / 2 - 3, y - 2, w + 6, 10, 3); g.fill();                          // housing
  const lens = g.createLinearGradient(0, y, 0, y + 7); lens.addColorStop(0, `rgba(255,255,248,${on})`); lens.addColorStop(1, `rgba(255,240,205,${0.92 * on})`);
  g.fillStyle = lens; roundRect(g, x - w / 2, y, w, 7, 2); g.fill();                                               // lit lens
  if (on > 0.2) {                                                                                                   // bloom around the lens
    const hl = g.createRadialGradient(x, y + 4, 2, x, y + 4, w * 0.75); hl.addColorStop(0, `rgba(255,248,225,${0.45 * on})`); hl.addColorStop(1, 'rgba(255,248,225,0)');
    g.fillStyle = hl; g.fillRect(x - w * 0.75, y - w * 0.3, w * 1.5, w * 1.05);
  }
}

