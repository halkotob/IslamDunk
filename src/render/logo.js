// ============================================================ LOGO
// The logo as one reusable function. The emblem (a basketball cradled by a
// crescent) sits above the wordmark with clear space. `s` scales everything;
// opts.tagline adds the subtitle. drawLogoIcon() is the emblem alone on a
// rounded tile, for small sizes (app icon, thumbnails).
function drawLogoEmblem(g, cx, cy, r) {
  // crescent: a gold disc with an offset disc cut out, hugging the ball's lower left
  g.save();
  g.beginPath(); g.arc(cx - r * 0.12, cy + r * 0.12, r * 1.38, 0, Math.PI * 2); g.arc(cx + r * 0.3, cy - r * 0.3, r * 1.2, 0, Math.PI * 2, true); g.closePath();
  const cg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); cg.addColorStop(0, '#ffe79a'); cg.addColorStop(1, '#c9921f');
  g.fillStyle = cg; g.fill('evenodd'); g.lineWidth = Math.max(1, r * 0.07); g.strokeStyle = '#0d3b30'; g.stroke();
  g.restore();
  // ball
  const bg = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  bg.addColorStop(0, '#ffb65c'); bg.addColorStop(0.7, '#e3772a'); bg.addColorStop(1, '#b2521a');
  g.fillStyle = bg; g.beginPath(); g.arc(cx + r * 0.18, cy - r * 0.18, r * 0.82, 0, Math.PI * 2); g.fill();
  const bx = cx + r * 0.18, by = cy - r * 0.18, br = r * 0.82;
  g.strokeStyle = '#3a1a08'; g.lineWidth = Math.max(1, r * 0.075); g.lineCap = 'round';
  g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(bx - br, by); g.lineTo(bx + br, by); g.moveTo(bx, by - br); g.lineTo(bx, by + br); g.stroke();
  g.beginPath(); g.ellipse(bx - br * 0.95, by, br * 0.55, br * 0.95, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.beginPath(); g.ellipse(bx + br * 0.95, by, br * 0.55, br * 0.95, 0, Math.PI / 2, Math.PI * 1.5); g.stroke();
  // small star in the crescent's mouth
  g.fillStyle = '#ffe79a'; star8(g, cx + r * 1.05, cy - r * 1.05, r * 0.2); g.fill();
}
function drawLogoMark(g, cx, top, s = 1, opts = {}) {
  const r = 30 * s, ey = top + r * 1.45;
  g.save();
  // soft glow behind the emblem
  const gl = g.createRadialGradient(cx, ey, r * 0.3, cx, ey, r * 2.4); gl.addColorStop(0, 'rgba(242,207,107,0.28)'); gl.addColorStop(1, 'rgba(242,207,107,0)');
  g.fillStyle = gl; g.fillRect(cx - r * 2.6, ey - r * 2.6, r * 5.2, r * 5.2);
  drawLogoEmblem(g, cx, ey, r);
  // wordmark below with clear space: heavy letters, green extrude, gold face
  const wy = ey + r * 1.55 + 58 * s, fs = Math.round(70 * s), txt = 'ISLAM DUNK';
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
function drawLogoIcon(g, cx, cy, size) {
  const h = size / 2;
  g.save();
  const bg = g.createLinearGradient(0, cy - h, 0, cy + h); bg.addColorStop(0, '#1e7a5e'); bg.addColorStop(1, '#0b3a2e');
  g.fillStyle = bg; roundRect(g, cx - h, cy - h, size, size, size * 0.22); g.fill();
  g.strokeStyle = '#f2cf6b'; g.lineWidth = Math.max(1, size * 0.035); roundRect(g, cx - h + size * 0.05, cy - h + size * 0.05, size * 0.9, size * 0.9, size * 0.18); g.stroke();
  drawLogoEmblem(g, cx - size * 0.04, cy + size * 0.04, size * 0.27);
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

