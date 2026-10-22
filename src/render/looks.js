// ================================================= v9.6: ART SLICE — three candidate looks (preview only)
// One character (the hero: the human player, or whoever the compare page marks) and one court (the default arena)
// drawn in three new styles, to choose a direction before the full cast is restyled:
//   a  Clean cel       2-3 flat tones per colour lit from the top left, coloured outlines (a darker tint of the fill),
//                      a heavier silhouette line, crisp highlights
//   b  Soft painted    soft shading per part, a rim light on the lit side, grain on cloth and skin, thin outlines
//   c  Bold cartoon    thick black outlines, bigger head / hands / shoes, hard 2-tone shading, saturated colours,
//                      strong squash and stretch
// Off by default: the current look is unchanged. A look shows only with ?look=a|b|c or Settings → Sound & display →
// Look (preview), and is never saved. Render-only: nothing here changes the simulation, hitboxes, timing, replays,
// online snapshots or saves, and nothing here calls Math.random (the sim's random sequence stays the same).
const LOOK = { cur: '', force: null, ids: ['', 'a', 'b', 'c'], names: { '': 'Current', a: 'A: Clean cel', b: 'B: Soft painted', c: 'C: Bold cartoon' } };
LOOK.parse = q => { try { const v = new URLSearchParams(q || '').get('look'); return v && /^[abc]$/.test(v.toLowerCase()) ? v.toLowerCase() : ''; } catch (e) { return ''; } };
LOOK.cur = LOOK.parse(typeof location !== 'undefined' ? location.search : '');
function lookNow() { return LOOK.force != null ? LOOK.force : LOOK.cur; }
function lookHero(p) { return !!p && (p.lookHero || (p.human >= 0 && !M.attract)); }
const LOOK_STYLE = {
  a: { ol: 'tint', olW: 0.9, sil: 1.15, silA: 1, tone: 3, hi: 0.18, sh: -0.2, deep: -0.34, sat: 1.05, head: 1.15, hand: 1.08, shoe: 1.08, sqK: 1.6, face: 1.05, grain: 0, rim: 0 },
  b: { ol: 'soft', olW: 0.45, sil: 0, silA: 0, tone: 0, hi: 0.22, sh: -0.2, deep: -0.3, sat: 1.04, head: 1.15, hand: 1.04, shoe: 1.04, sqK: 1.4, face: 1.05, grain: 0.22, rim: 0.55, soft: true },
  c: { ol: 'black', olW: 1.5, sil: 1.7, silA: 1, tone: 2, hi: 0, sh: -0.26, deep: -0.26, sat: 1.32, head: 1.45, hand: 1.28, shoe: 1.28, sqK: 3.0, face: 1.3, grain: 0, rim: 0 }
};

// ---------------------------------------------------------------- colour helpers (no randomness)
const lkHash = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
function lkRGB(c) {
  if (c[0] === '#') { const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1, 7); const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  const m = /rgba?\(([^)]+)\)/.exec(c); if (m) return m[1].split(',').slice(0, 3).map(Number); return [128, 128, 128];
}
const lkHex = ([r, g, b]) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const LK_C = new Map();
function lkCol(c, amt, sat) {                                     // shade, then saturate (cached)
  const k = c + '|' + amt + '|' + sat; let v = LK_C.get(k); if (v) return v;
  let [r, g, b] = lkRGB(c); const f = 1 + amt; r *= f; g *= f; b *= f;
  if (sat && sat !== 1) { const l = 0.3 * r + 0.59 * g + 0.11 * b; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
  v = lkHex([r, g, b]); if (LK_C.size > 4000) LK_C.clear(); LK_C.set(k, v); return v;
}
// the grain tile for the painted look (fixed, from a hash)
let LK_GRAIN = null;
function lkGrain() {
  if (LK_GRAIN) return LK_GRAIN;
  const c = makeCanvas(64, 64), g = c.getContext('2d'), d = g.createImageData(64, 64);
  for (let i = 0; i < 64 * 64; i++) { const v = lkHash(i * 7 + 3), dark = v < 0.5; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = dark ? 30 : 255; d.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 120); }
  g.putImageData(d, 0, 0); LK_GRAIN = c; return c;
}
// ---------------------------------------------------------------- shapes
function lkPath(g, s, dx = 0, dy = 0) {
  if (s.t === 'l') { g.moveTo(s.p[0] + dx, s.p[1] + dy); for (let i = 2; i < s.p.length; i += 2) g.lineTo(s.p[i] + dx, s.p[i + 1] + dy); }
  else if (s.t === 'c') { g.moveTo(s.x + s.r + dx, s.y + dy); g.arc(s.x + dx, s.y + dy, s.r, 0, Math.PI * 2); }
  else if (s.t === 'e' || s.t === 's') { g.moveTo(s.x + s.rx + dx, s.y + dy); g.ellipse(s.x + dx, s.y + dy, s.rx, s.ry, s.rot || 0, 0, Math.PI * 2); }
  else { g.moveTo(s.p[0] + dx, s.p[1] + dy); for (let i = 2; i < s.p.length; i += 2) g.lineTo(s.p[i] + dx, s.p[i + 1] + dy); g.closePath(); }
}
// a crescent of a filled shape on the side away from (dx, dy): shape minus shape moved by (dx, dy)
function lkCrescent(g, s, dx, dy, col, alpha = 1) {                // a clipped crescent (used for the ball and other one-offs)
  g.save(); g.beginPath(); lkPath(g, s); g.clip();
  g.beginPath(); lkPath(g, s); lkPath(g, s, dx, dy); g.globalAlpha *= alpha; g.fillStyle = col; g.fill('evenodd'); g.restore();
}
// cheap shading for a filled part (no clip): a shrunken copy of the shape, nudged toward (dx, dy), painted over it
function lkInset(g, s, k, dx, dy, col, alpha = 1) {
  let cx, cy;
  if (s.t === 'p') { cx = 0; cy = 0; const n = s.p.length / 2; for (let i = 0; i < s.p.length; i += 2) { cx += s.p[i]; cy += s.p[i + 1]; } cx /= n; cy /= n; } else { cx = s.x; cy = s.y; }
  g.save(); g.translate(cx + dx, cy + dy); g.scale(k, k); g.translate(-cx, -cy);
  g.beginPath(); lkPath(g, s); if (alpha < 1) g.globalAlpha *= alpha; g.fillStyle = col; g.fill(); g.restore();
}
function lkOutlineCol(c, S) { return S.ol === 'black' ? '#101010' : S.ol === 'soft' ? lkCol(c, -0.42, 1) : lkCol(c, -0.48, 1.1); }
// one group of parts: outlines under everything, then fills, then light and shade (light from the top left of the screen)
function lkSilCol(c, S) { if (S.ol === 'black') return '#0c0c0c'; const [r, g, b] = lkRGB(c); return lkCol(c, (r + g + b) / 3 > 200 ? -0.8 : -0.64, 1.1); }
let LK_GRAIN_PAT = null;
function lkGroup(g, segs, S, mode) {
  if (mode === 'sil') {                                             // pass 1: a heavier line around the whole figure
    const r = S.olW + S.sil;
    for (const s of segs) {
      if (s.noOl) continue;
      g.beginPath(); lkPath(g, s); g.strokeStyle = lkSilCol(s.c, S);
      if (s.t === 'l') { g.lineWidth = s.w + r * 2; g.stroke(); } else { g.lineWidth = r * 2; g.stroke(); g.fillStyle = g.strokeStyle; g.fill(); }
    }
    return;
  }
  for (const s of segs) {
    if (s.noOl) continue;
    const oc = lkOutlineCol(s.c, S), ow = S.olW;
    if (s.t === 'l') { g.beginPath(); lkPath(g, s); g.strokeStyle = oc; g.lineWidth = s.w + ow * 2; g.stroke(); }
    else { g.beginPath(); lkPath(g, s); g.strokeStyle = oc; g.lineWidth = ow * 2; g.stroke(); }
  }
  const pat = S.grain ? (LK_GRAIN_PAT || (LK_GRAIN_PAT = g.createPattern(lkGrain(), 'repeat'))) : null;
  for (const s of segs) {
    const c = lkCol(s.c, 0, S.sat), sh = lkCol(s.c, S.sh, S.sat), deep = lkCol(s.c, S.deep, S.sat), hi = lkCol(s.c, S.hi, S.sat);
    if (s.t === 'l') {
      g.beginPath(); lkPath(g, s); g.strokeStyle = c; g.lineWidth = s.w; g.stroke();
      if (s.flat) continue;
      const w = s.w;
      if (s.far) { g.beginPath(); lkPath(g, s, 0.2 * w, 0.2 * w); g.strokeStyle = sh; g.lineWidth = w * 0.58; g.stroke(); continue; }   // far side: one shade
      if (S.soft) {                                                  // soft: stacked, faint offset strokes blend into a gradient
        for (const [o, k, a, col] of [[0.18, 0.62, 0.3, sh], [0.3, 0.34, 0.3, deep], [-0.22, 0.42, 0.22, hi]]) {
          const ga = g.globalAlpha; g.globalAlpha = ga * a; g.beginPath(); lkPath(g, s, o * w, o * w); g.strokeStyle = col; g.lineWidth = w * k; g.stroke(); g.globalAlpha = ga;
        }
      } else {
        g.beginPath(); lkPath(g, s, 0.2 * w, 0.2 * w); g.strokeStyle = sh; g.lineWidth = w * 0.58; g.stroke();
        if (S.tone >= 3 && s.big) { g.beginPath(); lkPath(g, s, 0.33 * w, 0.33 * w); g.strokeStyle = deep; g.lineWidth = w * 0.26; g.stroke(); }
        if (S.hi) { g.beginPath(); lkPath(g, s, -0.27 * w, -0.27 * w); g.strokeStyle = hi; g.lineWidth = Math.max(0.8, w * 0.16); g.stroke(); }
      }
      if (S.rim) { const ga = g.globalAlpha; g.globalAlpha = ga * S.rim; g.beginPath(); lkPath(g, s, -0.38 * w, -0.38 * w); g.strokeStyle = '#fff0d2'; g.lineWidth = Math.max(0.7, w * 0.12); g.stroke(); g.globalAlpha = ga; }
      if (pat && s.big) { g.save(); g.globalAlpha *= S.grain; g.beginPath(); lkPath(g, s); g.strokeStyle = pat; g.lineWidth = w; g.stroke(); g.restore(); }
    } else {
      g.beginPath(); lkPath(g, s); g.fillStyle = c; g.fill();
      if (s.t === 's') { lkShoeDetail(g, s, S); continue; }
      if (s.flat || s.far) continue;
      const R = s.t === 'c' ? s.r : s.t === 'e' ? Math.min(s.rx, s.ry) : (s.lx || 4) * 1.4, o = Math.max(1.2, R * (S.soft ? 0.32 : 0.36));
      // the shape was filled in its base colour; now: the whole shape in shade, the base again smaller toward the light,
      // and a small highlight near the top-left edge
      const kk = Math.max(0.55, 1 - o / Math.max(2, R * 1.6));
      g.beginPath(); lkPath(g, s); g.fillStyle = sh; if (S.soft) { g.save(); g.globalAlpha *= 0.7; g.fill(); g.restore(); } else g.fill();
      lkInset(g, s, kk, -o * 0.32, -o * 0.32, c);
      if (S.hi) lkInset(g, s, S.soft ? 0.5 : 0.3, -o * 0.75, -o * 0.75, S.rim ? '#fff0d2' : hi, S.soft ? 0.35 : 0.9);
      if (pat && s.big) { g.save(); g.globalAlpha *= S.grain; g.beginPath(); lkPath(g, s); g.fillStyle = pat; g.fill(); g.restore(); }
    }
  }
}
// sneakers: a sole, a toe cap and a lace line, shaded like everything else
function lkShoeDetail(g, s, S) {
  const f = s.f || 1;
  g.save(); g.beginPath(); lkPath(g, s); g.clip();
  g.fillStyle = S.ol === 'black' ? '#ffffff' : '#f2efe8'; g.fillRect(s.x - s.rx - 1, s.y + s.ry * 0.3, s.rx * 2 + 2, s.ry);           // sole
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(s.x - s.rx - 1, s.y + s.ry * 0.3, s.rx * 2 + 2, 0.9);
  g.fillStyle = lkCol(s.c, S.sh, S.sat); g.beginPath(); g.ellipse(s.x + s.rx * 0.55 * f, s.y - s.ry * 0.05, s.rx * 0.42, s.ry * 0.62, 0, 0, Math.PI * 2); g.fill();   // toe cap
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(s.x - s.rx * 0.25 * f, s.y - s.ry * 0.55); g.lineTo(s.x + s.rx * 0.25 * f, s.y - s.ry * 0.25); g.stroke();   // laces
  if (S.hi) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(s.x - s.rx * 0.5, s.y - s.ry * 0.78, s.rx * 0.55, 1.1); }
  g.restore();
}

// ---------------------------------------------------------------- the hero, in a look
// The pose comes from exactly the same rig maths as drawPlayer (p.j, p.hipH, p.cloth, p.sq), so animation and timing
// are untouched; only how the parts are painted differs. The body is painted into an offscreen canvas first, so the
// silhouette line, rim light and grain can be added to the figure as a whole.
const LK_BOX = { x: -86, y: -196, w: 172, h: 232 };                // the sprite box in body space (feet at 0, up is negative)
function lkPaintBody(og, p, S, mode) {
  const sil = mode === 'sil';
  const T = p.T, def = p.def, lk = def.look, sc = p.spin ? Math.cos(p.spin) : 1, fs = p.face * (Math.abs(sc) < 0.2 ? 0.2 * sgn(sc) : sc), f = sgn(fs);
  const uncle = !!(M.fun && M.fun.uncle && !M.gym && p.team !== 9);
  const thobe = p.outfit === 'thobe', robe = uncle ? T.c1 : lk ? (lk.teamMatch ? T.c1 : THOBES_ALL[lk.thobe]) : (def.thobe || '#f4f4ef'), hemK = (lk ? lk.thobeLen % 2 : 0) && !uncle ? 0.5 : 0.82;
  const trim = lk && !uncle && (lk.thobeLen >= 2 || lk.teamMatch) ? (lk.teamMatch ? T.c2 : '#c9a24a') : null;
  const shoe = lk ? SNEAKERS[lk.shoes] : '#e8ecf0', hair = lk ? HAIRS[lk.hair] : def.hair;
  const cap = lk ? CAPKEYS[lk.cap] : def.hat, capCol = lk ? (lk.teamMatch && lk.cap ? T.c2 : CAPCOLS_ALL[lk.capColor]) : (def.capColor || '#f7f7f2');
  const beard = lk ? lk.beard : def.beardStyle != null ? def.beardStyle : def.sheikh || def.elder ? 3 : 2;
  const beardLen = lk ? lk.beardLen : def.elder ? 2 : def.sheikh ? 1 : 0;
  const top = thobe ? robe : T.c1, skin = def.skin, dim = c => shade(c, -0.22);
  const J = p.j, hipH = p.hipH, lean = J.lean.a, cl = p.cloth || { x: 0, y: 0 };
  const L = (lx, ly) => [lx * fs, -ly];
  const leg = (h, k) => { const kx = Math.sin(h) * 22, ky = hipH - Math.cos(h) * 22; return [kx, ky, kx + Math.sin(h - k) * 22, ky - Math.cos(h - k) * 22]; };
  const shX = Math.sin(lean) * 30, shY = hipH + Math.cos(lean) * 30;
  const arm = (s, e) => { const ex = shX + Math.sin(s) * 16, ey = shY - Math.cos(s) * 16; return [ex, ey, ex + Math.sin(s + e) * 15, ey - Math.cos(s + e) * 15]; };
  const hx = shX + Math.sin(lean) * 13, hy = shY + Math.cos(lean) * 13 + 2;
  const sway = cl.x, shoeK = S.shoe, handK = S.hand;
  const legSegs = (side, far) => {
    const [kx, ky, fx, fy] = leg(J[side + 'h'].a, J[side + 'k'].a), c = x => far ? dim(x) : x, out = [];
    const at = k => L(lerp(kx, fx, k), lerp(ky, fy, k));
    const [sx, sy] = L(fx + 3.5 * shoeK, fy + 1);
    if (uncle) { out.push({ t: 'e', x: sx, y: sy + 1.5, rx: 7.5, ry: 2, c: c('#5a4632') }); out.push({ t: 'e', x: sx, y: sy - 0.5, rx: 6, ry: 2.6, c: c(skin) }); }
    else out.push({ t: 's', x: sx, y: sy - (shoeK - 1) * 2, rx: 8.6 * shoeK, ry: 4.4 * shoeK, c: c(shoe), f });
    if (thobe) {
      const hem = L(lerp(kx, fx, hemK) + cl.x * 0.6, lerp(ky, fy, hemK) + cl.y * 0.5);
      out.push({ t: 'l', p: [...at(Math.max(hemK, 0.72)), ...L(fx, fy + 1)], w: 7.2, c: c('#f4f4f4') });
      if (hemK < 0.7) out.push({ t: 'l', p: [...at(hemK), ...at(0.74)], w: 7.2, c: c(skin) });
      out.push({ t: 'l', p: [...L(0, hipH), ...L(kx, ky), ...hem], w: 14, c: c(robe), big: true });
      if (trim) out.push({ t: 'l', p: [hem[0] - 6.5, hem[1] - 2.5, hem[0] + 6.5, hem[1] - 2.5], w: 2.6, c: c(trim), flat: true });
    } else {
      out.push({ t: 'l', p: [...at(0.62), ...L(fx, fy + 1)], w: 7.2, c: c('#f4f4f4') });                                             // socks
      out.push({ t: 'l', p: [...at(0.3), ...at(0.64)], w: 7.4, c: c(skin) });
      const hem = at(0.32); hem[0] += sway * 0.5 * f; hem[1] += cl.y * 0.4;                                                     // the shorts' hem trails a little
      out.push({ t: 'l', p: [...L(0, hipH), ...L(kx, ky), ...hem], w: 13.6, c: c(T.c1), big: true });
      out.push({ t: 'l', p: [hem[0] - 5.2, hem[1] - 1.6, hem[0] + 5.2, hem[1] - 1.6], w: 1.8, c: c(T.c2), flat: true, noOl: true });   // shorts trim
    }
    if (far) for (const q of out) q.far = true;
    return out;
  };
  const armSegs = (side, far) => {
    const [ex, ey, hx2, hy2] = arm(J[side + 's'].a, J[side + 'e'].a), c = x => far ? dim(x) : x, out = [];
    if (thobe) {
      const ex2 = lerp(ex, hx2, 0.78), ey2 = lerp(ey, hy2, 0.78);
      out.push({ t: 'l', p: [...L(shX, shY), ...L(ex, ey), ...L(ex2, ey2), ...L(ex2 + cl.x * 0.45 - 1, ey2 - 1.5 + cl.y * 0.3)], w: 9, c: c(top) });
    } else {
      out.push({ t: 'l', p: [...L(ex, ey), ...L(hx2, hy2)], w: 6.8, c: c(skin) });
      out.push({ t: 'l', p: [...L(shX, shY), ...L(ex, ey)], w: 9.8, c: c(top) });
    }
    // the hand: a mitten along the forearm, with a thumb
    const [a, b] = L(hx2, hy2), [ea, eb] = L(ex, ey), ang = Math.atan2(b - eb, a - ea), r = 4.6 * handK;
    out.push({ t: 'e', x: a + Math.cos(ang) * r * 0.25, y: b + Math.sin(ang) * r * 0.25, rx: r * 1.12, ry: r * 0.86, rot: ang, c: c(skin) });
    out.push({ t: 'c', x: a + Math.cos(ang - 1.3 * f) * r * 0.85, y: b + Math.sin(ang - 1.3 * f) * r * 0.85, r: r * 0.36, c: c(skin), flat: true });
    if (far) for (const q of out) q.far = true;
    return out;
  };
  og.lineCap = 'round'; og.lineJoin = 'round';
  // the torso (the jersey hem trails with the cloth spring)
  const hemL = L(-9 + sway * 0.4 * f, hipH + 1 - cl.y * 0.3), hemR = L(9 + sway * 0.4 * f, hipH + 1 - cl.y * 0.3);
  const torso = { t: 'p', c: top, big: true, lx: 5, ly: 1.5, p: [...hemL, ...hemR, ...L(shX + 10.8, shY + 1), ...L(shX + 4.5, shY + 6.2), ...L(shX - 5.5, shY + 6.2), ...L(shX - 11.3, shY)] };
  const body = [...legSegs('f', true), ...armSegs('f', true), torso];
  if (thobe) {
    const [nkx, nky, nfx, nfy] = leg(J.nh.a, J.nk.a), [fkx, fky, ffx, ffy] = leg(J.fh.a, J.fk.a);
    const n2 = L(lerp(nkx, nfx, hemK), lerp(nky, nfy, hemK)), f2 = L(lerp(fkx, ffx, hemK), lerp(fky, ffy, hemK));
    const sw2 = cl.x * f, yb = Math.max(n2[1], f2[1]) - cl.y * 0.6, xa = Math.max(n2[0], f2[0]) + 3 + sw2, xb = Math.min(n2[0], f2[0]) - 3 + sw2;
    body.push({ t: 'p', c: robe, big: true, lx: 4, ly: 1, p: [...L(-8, hipH + 4), ...L(8, hipH + 4), xa, yb, lerp(xa, xb, 0.5), yb + 1.5, xb, yb] });
  }
  lkGroup(og, body, S, mode);
  // fold hints and the jersey: piping, collar, number
  if (!sil) { og.save(); og.lineCap = 'round';
  if (!thobe) {
    og.strokeStyle = lkCol(T.c2, 0, S.sat); og.lineWidth = 2.2;
    og.beginPath(); og.moveTo(...L(-6.5, hipH + 3)); og.lineTo(...L(shX - 8, shY)); og.stroke();
    og.beginPath(); og.moveTo(...L(shX + 3, shY + 3.5)); og.quadraticCurveTo(...L(shX + 6, shY - 1), ...L(shX + 8.5, shY + 0.5)); og.stroke();
    const [nx, ny] = L(shX * 0.5 + 1.5, (hipH + shY) / 2 + 1);
    if (!p._refl) drawTextSprite(og, textSprite(String(def.num), 11, lkCol(T.c2, 0, S.sat), S.ol === 'black' ? '#101010' : shade(T.c1, -0.5), S.ol === 'black' ? 3 : 2.4), nx, ny + 4);
  }
  og.strokeStyle = lkCol(top, -0.3, 1); og.globalAlpha = S.soft ? 0.35 : 0.55; og.lineWidth = S.ol === 'black' ? 1.6 : 1.1;
  og.beginPath(); og.moveTo(...L(shX - 3, shY - 9)); og.quadraticCurveTo(...L(shX * 0.5 - 1, (hipH + shY) / 2 - 6), ...L(-2 + sway * 0.3 * f, hipH + 6)); og.stroke();   // a fold down the side
  og.beginPath(); og.moveTo(...L(2, hipH + 3)); og.quadraticCurveTo(...L(5, hipH + 6), ...L(8, hipH + 3.5)); og.stroke();                                   // a crease above the waist
  og.restore(); }
  lkGroup(og, legSegs('n', false), S, mode);
  // the head
  const [HX, HY] = L(hx, hy), bigHead = M.fun && M.fun.bigHead && !M.gym, hs = S.head * (bigHead ? 1.7 : 1);
  og.save(); og.translate(HX, HY + 8); og.scale(hs, hs); og.translate(-HX, -HY - 8);
  const headSegs = [{ t: 'c', x: HX + 8.6 * f, y: HY + 0.8, r: 2.1, c: skin, flat: true }, { t: 'e', x: HX - 0.4 * f, y: HY, rx: 9.5, ry: 9.9, c: skin }];
  if (sil) {
    if (cap && cap !== 'hair') headSegs.push({ t: 'e', x: HX - 0.6 * f, y: HY - (cap === 'topi' ? 8 : 6.8), rx: cap === 'imama' ? 10.8 : 9.2, ry: cap === 'topi' ? 7 : 5.2, c: capCol });
    if (beard >= 2 && beard !== 5) headSegs.push({ t: 'e', x: HX + 2 * f, y: HY + 5 + beardLen * 1.5, rx: 7.5, ry: 4.5 + beardLen * 2, c: hair || '#161616' });
    lkGroup(og, headSegs, S, 'sil'); og.restore();
  } else {
    lkGroup(og, headSegs, S);
    og.fillStyle = lkCol(skin, -0.18, 1); og.beginPath(); og.ellipse(HX - 3.2 * f, HY + 0.5, 1.9, 2.5, 0, 0, Math.PI * 2); og.fill();          // ear
    lkBeard(og, HX, HY, f, beard, beardLen, hair, S);
    lkFace(og, HX, HY, f, p.expr ? p.expr.k : null, hair, def.glasses, S);
    drawCap(og, HX, HY, f, cap === 'kufiEmb' || cap === 'kufiStripe' ? 'kufi' : cap, capCol, hair); drawCapPattern(og, HX, HY, f, cap, capCol);
    lkCapLight(og, HX, HY, f, cap, S);
    og.restore();
  }
  lkGroup(og, armSegs('n', false), S, mode);
}
// beards get form: a shadow under the jaw and a few lighter strands toward the light
function lkBeard(g, HX, HY, f, style, len, col, S) {
  drawBeard(g, HX, HY, f, style, len, col);
  if (!style || style === 1) return;
  g.save(); g.lineCap = 'round';
  const dark = lkCol(col, -0.35, 1), light = lkCol(col === '#161616' || col === '#1c1c1c' ? '#5a5a5a' : col, 0.45, 1), tip = [11, 14, 18][len] || 13;
  g.strokeStyle = dark; g.globalAlpha = S.soft ? 0.35 : 0.5; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(HX - 4 * f, HY + 6); g.quadraticCurveTo(HX + 1 * f, HY + tip - 1, HX + 6 * f, HY + 7); g.stroke();
  // a sheen along the cheek, then strands
  g.strokeStyle = light; g.globalAlpha = S.soft ? 0.35 : 0.5; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(HX - 5 * f, HY + 1.5); g.quadraticCurveTo(HX - 1 * f, HY + 6.5, HX + 5.5 * f, HY + 5); g.stroke();
  g.lineWidth = 0.85; g.globalAlpha = S.soft ? 0.32 : 0.5;
  for (let i = 0; i < 5; i++) { const x0 = HX + (-4 + i * 2.3) * f; g.beginPath(); g.moveTo(x0, HY + 5 + i * 0.3); g.lineTo(x0 + 0.7 * f, HY + 8 + i * 0.9); g.stroke(); }
  g.restore();
}
function lkCapLight(g, HX, HY, f, cap, S) {
  if (!S.hi || cap === 'hair') { if (cap === 'hair') { g.save(); g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1; g.beginPath(); g.moveTo(HX - 4 * f, HY - 8.2); g.quadraticCurveTo(HX + 0.5 * f, HY - 10.4, HX + 4 * f, HY - 8.6); g.stroke(); g.restore(); } return; }
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(HX - 6.5 * f, HY - 8.6); g.quadraticCurveTo(HX - 3 * f, HY - 11.6, HX + 1.5 * f, HY - 11.2); g.stroke(); g.restore();
}
// eyes with a lid, white and iris; tapered brows; the expressions as before
function lkFace(g, HX, HY, f, expr, hair, glasses, S) {
  const k = S.face, ex = HX + 4.6 * f, ey = HY - 1.2;
  const fierce = expr === 'fierce', shocked = expr === 'shock', joyful = expr === 'joy';
  g.save(); g.translate(ex, ey); g.scale(k, k); g.translate(-ex, -ey);
  if (joyful) { g.strokeStyle = '#1a120c'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.arc(ex, ey + 0.8, 1.9, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else {
    const eh = shocked ? 2.4 : fierce ? 1.45 : 1.95;
    g.fillStyle = '#fbf7ef'; g.beginPath(); g.ellipse(ex - 0.2 * f, ey, 2.3, eh, 0, 0, Math.PI * 2); g.fill();       // the white
    g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(ex + 0.65 * f, ey + 0.1, 1.25, Math.min(eh, 1.5), 0, 0, Math.PI * 2); g.fill();   // iris, looking forward
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex + 0.95 * f, ey - 0.5, 0.42, 0, Math.PI * 2); g.fill();                    // shine
    g.strokeStyle = '#1a120c'; g.lineWidth = 1.05; g.lineCap = 'round';
    g.beginPath(); g.ellipse(ex - 0.2 * f, ey, 2.3, eh, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();                       // upper lid
  }
  // brow: a tapered stroke
  g.fillStyle = shade(hair || '#1a1410', -0.2);
  const by = fierce ? ey - 3.4 : shocked ? ey - 4.5 : ey - 3.7, tilt = fierce ? 1.1 : shocked ? -0.3 : -0.25;
  g.beginPath(); g.moveTo(ex - 2.6 * f, by + tilt * 0.4); g.quadraticCurveTo(ex, by - 1.2, ex + 2.7 * f, by - tilt); g.lineTo(ex + 2.5 * f, by - tilt + 0.9); g.quadraticCurveTo(ex, by - 0.1, ex - 2.6 * f, by + tilt * 0.4 + 1.2); g.closePath(); g.fill();
  g.restore();
  if (joyful || fierce || shocked) {
    g.strokeStyle = '#3b2017'; g.lineWidth = joyful ? 1.1 : 1.4; g.beginPath();
    if (joyful) g.arc(HX + 4 * f, HY + 3.2, 2.3, 0.15, Math.PI - 0.15);
    else if (shocked) g.arc(HX + 4 * f, HY + 5.1, 1.6, 0, Math.PI * 2);
    else { g.moveTo(HX + 2 * f, HY + 4.5); g.lineTo(HX + 6.3 * f, HY + 3.8); }
    g.stroke();
  }
  if (glasses) { g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.1; g.beginPath(); g.arc(ex, ey, 2.9 * k, 0, Math.PI * 2); g.moveTo(ex - 2.8 * f, ey - 0.3); g.lineTo(HX - 4 * f, HY - 2.5); g.stroke(); }
}
// the figure alone in its box, at kp pixels per body unit (the sprite-bounds test uses this)
function lkFigure(g, p, S, kp) {
  const W0 = Math.ceil(LK_BOX.w * kp), H0 = Math.ceil(LK_BOX.h * kp), c = makeCanvas(W0, H0), og = c.getContext('2d');
  og.setTransform(kp, 0, 0, kp, -LK_BOX.x * kp, -LK_BOX.y * kp); og.lineCap = 'round'; og.lineJoin = 'round';
  if (S.sil > 0) lkPaintBody(og, p, S, 'sil'); lkPaintBody(og, p, S, 'paint');
  return c;
}
// render-only effects: a soft contact shadow that shrinks as he leaves the floor, landing dust, sprint lines
function lkFx(g, p, S) {
  const st = p._lk || (p._lk = { last: p.state, dust: [] }), now = M.time || 0;      // ages come from match time, so redrawing a frame changes nothing
  if (p.state === 'land' && st.last !== 'land' && st.last !== 'free') { for (let i = 0; i < 3; i++) st.dust.push({ x: p.x + (i - 1) * 14, z: p.z + (i - 1) * 3, t0: now, s: 0.8 + i * 0.15 }); }
  st.last = p.state;
  st.dust = st.dust.filter(d => now - d.t0 < 0.45 && now >= d.t0);
  for (const d of st.dust) { const [x, y] = P(d.x, 0, d.z), k = (now - d.t0) / 0.45, r = (8 + 18 * k) * d.s * depthK(d.z); g.fillStyle = `rgba(220,205,180,${0.35 * (1 - k)})`; g.beginPath(); g.ellipse(x, y - 2, r, r * 0.38, 0, 0, Math.PI * 2); g.fill(); }
  const [fx, fy] = P(p.x, 0, p.z), k = clamp(1 - p.y / 160, 0.25, 1), dk = depthK(p.z);
  g.fillStyle = `rgba(10,6,4,${(S.soft ? 0.22 : 0.3) * k})`; g.beginPath(); g.ellipse(fx, fy + 1, 15 * k * dk, 3.4 * k * dk, 0, 0, Math.PI * 2); g.fill();
}
function lkSpeedLines(g, p, bx, by, dk, sh) {
  const sp = Math.hypot(p.vx || 0, p.vz || 0); if (!(p.cmd && p.cmd.turbo) || sp < 170 || p.y > 4 || p.state !== 'free') return;
  const dir = -sgn(p.vx || p.face), t = Game.t || 0;
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const yy = by - (34 + i * 26) * sh * dk, ph = (t * 7 + i * 0.37) % 1, x0 = bx + dir * (18 + ph * 16) * dk; g.lineWidth = 2 - i * 0.4; g.globalAlpha = 0.6 * (1 - ph); g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + dir * (16 + i * 4) * dk, yy); g.stroke(); }
  // two sweat drops off the head
  const ph = (t * 2.2) % 1; g.fillStyle = 'rgba(200,235,255,0.85)'; g.globalAlpha = 1 - ph;
  for (let i = 0; i < 2; i++) { const x = bx + dir * (6 + ph * 14 + i * 5) * dk, y = by - (100 - ph * 12 + i * 6) * sh * dk; g.beginPath(); g.ellipse(x, y, 1.3 * dk, 1.9 * dk, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
playerLookHook = function (g, p) {
  const k = lookNow(); if (!k || !lookHero(p)) return false;
  const S = LOOK_STYLE[k], def = p.def, lk = def.look, [bx, by] = P(p.x, p.y, p.z), hipH = p.hipH;
  const sq = (p.sq || 0) * S.sqK, sw = (lk ? BUILD_W[lk.build] : def.bw != null ? BUILD_W[def.bw] : 1) * (1 - sq * 0.06), sh = (lk ? HEIGHT_S[lk.height] : def.bh != null ? HEIGHT_S[def.bh] : 1) * (1 + sq * 0.08);
  const dk = depthK(p.z), br = 1 + 0.02 * Math.sin(Game.t * 11 + p.x * 0.01) * clamp(((p.fat || 0) - 0.45) / 0.55, 0, 1);
  const heldBall = ball.owner === p;
  if (!p._refl && (p.boost > 0 || p.fire)) { const cyy = by - (hipH + 12) * sh, a = 0.75 + 0.25 * Math.sin(M.time * 12); g.globalAlpha = a; g.drawImage(p.boost > 0 ? boostGlow() : fireGlow(), bx - 50, cyy - 72, 100, 144); g.globalAlpha = 1; }
  if (!p._refl) lkFx(g, p, S);
  if (heldBall && ball.behind) drawBall(g);
  g.save(); g.translate(bx, by); if (Math.abs(p.rot) > 0.01) g.rotate(p.rot); g.scale(sw * dk * (2 - br), sh * dk * br); g.lineCap = 'round'; g.lineJoin = 'round';
  if (S.sil > 0) lkPaintBody(g, p, S, 'sil');
  lkPaintBody(g, p, S, 'paint');
  g.restore();
  if (!p._refl) lkSpeedLines(g, p, bx, by, dk, sh);
  if (heldBall && !ball.behind) drawBall(g);
  return true;
};

// ---------------------------------------------------------------- the ball in a look: shading, seams, a highlight
{
  const _ba = drawBallAt;
  drawBallAt = function (g, x, y, z, rot, fire, feel) {
    const k = lookNow(); if (!k) return _ba.apply(this, arguments);
    const S = LOOK_STYLE[k], [sx, sy] = P(x, y, z), r = (BALL_R + 0.5) * depthK(z) * (k === 'c' ? 1.1 : 1);
    const q = feel ? feel.k : 0, sq = Math.abs(q) > 0.02;
    if (sq) { g.save(); g.translate(sx, sy); g.rotate(q > 0 ? feel.ang : 0); g.scale(1 + 0.05 * Math.abs(q) * S.sqK, 1 - 0.045 * Math.abs(q) * S.sqK); g.rotate(q > 0 ? -feel.ang : 0); g.translate(-sx, -sy); }
    if (fire) g.drawImage(ballFireGlow(), sx - 24, sy - 24, 48, 48);
    const base = k === 'c' ? '#ff7a1a' : '#e98a3a', dark = k === 'c' ? '#b2420a' : '#a5501c', lite = k === 'c' ? '#ffb064' : '#f6b077';
    if (S.soft) { const gr = g.createRadialGradient(sx - r * 0.4, sy - r * 0.45, r * 0.1, sx, sy, r * 1.05); gr.addColorStop(0, lite); gr.addColorStop(0.55, base); gr.addColorStop(1, dark); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill(); }
    else {
      g.fillStyle = base; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
      lkCrescent(g, { t: 'c', x: sx, y: sy, r }, -r * 0.42, -r * 0.42, dark);
      if (S.hi) lkCrescent(g, { t: 'c', x: sx, y: sy, r }, r * 0.3, r * 0.3, lite);
    }
    g.save(); g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.clip(); g.translate(sx, sy); g.rotate(rot);
    g.strokeStyle = k === 'c' ? '#1a0a02' : '#40200a'; g.lineWidth = k === 'c' ? 1.4 : 1.05;
    g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
    g.beginPath(); g.arc(-r * 1.1, 0, r * 0.75, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r * 1.1, 0, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    g.restore();
    g.fillStyle = 'rgba(255,250,235,0.85)'; g.beginPath(); g.ellipse(sx - r * 0.34, sy - r * 0.42, r * 0.2, r * 0.11, -0.6, 0, Math.PI * 2); g.fill();   // highlight
    g.strokeStyle = k === 'c' ? '#101010' : S.soft ? 'rgba(60,25,8,0.55)' : '#6a2c0c'; g.lineWidth = k === 'c' ? 2.2 : S.soft ? 0.8 : 1.3; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
    if (sq) g.restore();
  };
}

// ---------------------------------------------------------------- the court (the default arena only) in a look
function lookCourt(part) { const k = lookNow(); return k && !VL && !M.gym && !(LOOK.off && LOOK.off[part]) ? k : ''; }   // LOOK.off: switch parts off when measuring
const LK_FLOORS = new WeakMap();
let LK_NET = null; const LK_NEAR = {};
const LK_CROWDS = new WeakMap();
function lkCrowd(cv, k) {
  let o = LK_CROWDS.get(cv); if (!o) LK_CROWDS.set(cv, o = {});
  if (o[k]) return o[k];
  const c = makeCanvas(cv.width, cv.height), g = c.getContext('2d'), s = cv.height / (cv.lh || 100); c.lw = cv.lw; c.lh = cv.lh;
  if (k === 'c') { try { g.filter = 'saturate(1.3)'; } catch (e) {} }
  g.drawImage(cv, 0, 0); g.filter = 'none';
  const gr = g.createLinearGradient(0, 0, 0, 70 * s);
  gr.addColorStop(0, `rgba(16,24,44,${k === 'b' ? 0.55 : k === 'c' ? 0.2 : 0.4})`); gr.addColorStop(1, 'rgba(16,24,44,0)');
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, c.width, 70 * s);
  return (o[k] = c);
}
function lkNetShade() {
  if (LK_NET) return LK_NET;
  const c = makeCanvas(32, 40), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 40); gr.addColorStop(0, 'rgba(20,30,40,0.24)'); gr.addColorStop(1, 'rgba(20,30,40,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(32, 0); g.lineTo(23, 40); g.lineTo(9, 40); g.closePath(); g.fill(); return (LK_NET = c);
}
function lkFloor(cv, k) {
  let o = LK_FLOORS.get(cv); if (!o) LK_FLOORS.set(cv, o = {});
  if (o[k]) return o[k];
  const rs = cv.rs || 1, c = makeCanvas(cv.width, cv.height); c.rs = rs; const g = c.getContext('2d');
  if (k === 'c') { try { g.filter = 'saturate(1.35) brightness(1.04) contrast(1.06)'; } catch (e) {} }
  g.drawImage(cv, 0, 0); g.filter = 'none';
  g.scale(rs, rs);
  const X = x => x + 120, Z = z => z * ZS, Wf = COURT.L, Hf = Z(COURT.D);
  g.save(); g.beginPath(); g.rect(X(0), 0, Wf, Hf); g.clip();
  // planks: each board a slightly different tone, from a hash (no randomness)
  for (let z = 0, i = 0; z < COURT.D; z += 16, i++) for (let x = (i * 137) % 260 - 260, j = 0; x < COURT.L; x += 260, j++) {
    const v = lkHash(i * 131 + j * 17) - 0.5, a = k === 'b' ? 0.05 : k === 'c' ? 0.09 : 0.07;
    g.fillStyle = v > 0 ? `rgba(255,230,190,${a * v * 2})` : `rgba(90,45,10,${-a * v * 2})`; g.fillRect(X(Math.max(0, x)), Z(z), 260, Z(16));
  }
  // wood grain: long, faint streaks along the boards
  if (k !== 'c') {
    g.lineWidth = 0.6; for (let n = 0; n < 900; n++) { const zz = lkHash(n * 3 + 1) * COURT.D, x0 = lkHash(n * 3 + 2) * COURT.L, len = 30 + lkHash(n * 3 + 3) * 90;
      g.strokeStyle = `rgba(${n % 2 ? '90,45,12' : '255,235,200'},${k === 'b' ? 0.09 : 0.06})`; g.beginPath(); g.moveTo(X(x0), Z(zz)); g.quadraticCurveTo(X(x0 + len / 2), Z(zz) + 0.6, X(x0 + len), Z(zz)); g.stroke(); }
  }
  // paint: a fine speckle over everything (the lines read as paint on wood)
  for (let n = 0; n < 2400; n++) { const x = lkHash(n * 5 + 11) * Wf, y = lkHash(n * 5 + 12) * Hf; g.fillStyle = n % 3 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; g.fillRect(X(x), y, 1.2, 0.8); }
  // sheen: soft light pools under the arena lights
  for (const lx of [280, 660, 1040]) {
    const gr = g.createRadialGradient(X(lx), Z(COURT.D * 0.45), 10, X(lx), Z(COURT.D * 0.45), k === 'b' ? 330 : 260);
    gr.addColorStop(0, `rgba(255,248,225,${k === 'b' ? 0.16 : k === 'c' ? 0.1 : 0.12})`); gr.addColorStop(1, 'rgba(255,248,225,0)'); g.fillStyle = gr; g.fillRect(X(0), 0, Wf, Hf);
  }
  // the vignette on the floor: darker toward the far sideline and the near edge
  const vg = g.createLinearGradient(0, 0, 0, Hf);
  vg.addColorStop(0, `rgba(20,10,4,${k === 'b' ? 0.3 : k === 'c' ? 0.12 : 0.22})`); vg.addColorStop(0.3, 'rgba(20,10,4,0)'); vg.addColorStop(0.8, 'rgba(20,10,4,0)'); vg.addColorStop(1, `rgba(20,10,4,${k === 'b' ? 0.28 : 0.16})`);
  g.fillStyle = vg; g.fillRect(X(0), 0, Wf, Hf);
  g.restore();
  return (o[k] = c);
}
{
  const _fw = drawFloorWarped;
  drawFloorWarped = function (g, cv, rs) { const k = lookCourt('floor'); if (k && cv === courtCv) return _fw.call(this, g, lkFloor(cv, k), rs); return _fw.apply(this, arguments); };
  const _da = drawArena;
  drawArena = function (g, t) {
    const k = lookCourt('arena'); if (!k || !crowdCv) return _da.apply(this, arguments);
    // depth: the back rows of the crowd fall into a soft haze, baked into a copy of the cached crowd (no cost per frame)
    const keep = crowdCv; crowdCv = lkCrowd(keep, k);
    try { return _da.apply(this, arguments); } finally { crowdCv = keep; }
  };
  const _hb = drawHoopBack;
  drawHoopBack = function (g, h) {
    const r = _hb.apply(this, arguments), k = lookCourt('hoop'); if (!k) return r;
    const dy = h.dy * 0.4, corner = (zc, yc) => { const [x, y] = P(h.bbx, yc + dy, h.z + zc); return [x - zc * 0.42 * h.dir, y]; };
    const a = corner(-30, RIM_Y + 54), b = corner(-6, RIM_Y + 54), c = corner(10, RIM_Y - 8), d = corner(-14, RIM_Y - 8);
    g.save(); g.fillStyle = `rgba(255,255,255,${k === 'b' ? 0.2 : 0.28})`; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.closePath(); g.fill(); g.restore();   // glass glint
    return r;
  };
  const _hf = drawHoopFront;
  drawHoopFront = function (g, h, U) {
    const r = _hf.apply(this, arguments), k = lookCourt('hoop'); if (!k) return r;
    const [rx, ry] = P(h.x, RIM_Y + h.dy, h.z);
    g.save();
    // net shading: the back strands darker, a soft shadow inside the net
    g.drawImage(lkNetShade(), rx - RIM_R, ry + 1, RIM_R * 2, 30);
    g.strokeStyle = k === 'c' ? '#101010' : 'rgba(90,20,6,0.7)'; g.lineWidth = k === 'c' ? 1.6 : 0.9; g.beginPath(); g.ellipse(rx, ry, RIM_R + 2.4, (RIM_R + 2.4) * 0.5, 0, 0, Math.PI); g.stroke();
    g.strokeStyle = 'rgba(255,230,190,0.85)'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(rx, ry - 0.8, RIM_R - 0.5, (RIM_R - 0.5) * 0.5, 0, 0.35, 1.0); g.stroke();
    g.restore();
    return r;
  };
  // the vignette is built into the layers (no full-screen overlay, which costs a frame's worth of fill on phones):
  // the near side goes darker toward the bottom, the stands fade into haze, the floor darkens toward its far and near
  // lines (baked into the look's floor canvas)
  const _ns = drawNearSide;
  drawNearSide = function (g) {
    const k = lookCourt('near'); if (!k) return _ns.apply(this, arguments);
    const y0 = FLOOR_TOP + COURT.D * ZS;
    if (!LK_NEAR[k]) { const c = makeCanvas(1, 64), cg = c.getContext('2d'), grd = cg.createLinearGradient(0, 0, 0, 64);   // a cached strip, stretched
      grd.addColorStop(0, k === 'c' ? '#14403c' : '#103030'); grd.addColorStop(1, k === 'b' ? '#03090a' : '#050f0f'); cg.fillStyle = grd; cg.fillRect(0, 0, 1, 64); LK_NEAR[k] = c; }
    g.drawImage(LK_NEAR[k], 0, y0, W, H - y0);
    g.fillStyle = GOLD; g.fillRect(0, y0, W, k === 'c' ? 2.5 : 1.5);
    const ox = -(cam.x) % 40; g.fillStyle = 'rgba(232,195,90,0.18)';
    for (let x = ox - 40; x < W + 40; x += 40) { star8(g, x, y0 + 16, 7, 1, 0.6); g.fill(); }
  };
}

// ---------------------------------------------------------------- Settings → Sound & display → Look (preview)
{
  const back = SET_ITEMS.findIndex(s => s.label === 'Back');
  SET_ITEMS.splice(back < 0 ? SET_ITEMS.length : back, 0, { label: 'Look (preview)', get: () => LOOK.names[LOOK.cur], step: d => { const i = LOOK.ids.indexOf(LOOK.cur); LOOK.cur = LOOK.ids[(i + (d || 1) + LOOK.ids.length) % LOOK.ids.length]; } });
}
