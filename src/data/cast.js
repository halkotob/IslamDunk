// ================================================= v9.17: THE CAST (docs/IMPROVEMENTS.md CD1–CD5, CD2)
// The look of the 16 main players, from the cast sheet the owners approved (5 Nov 2026). Looks only: vh/vw are
// drawn heights and builds (bh/bw would also change contact strength and the CPU's style, so they're not used here),
// and nothing below changes speed, reach or skill.
//   vh, vw      height and build, 0..2 (HEIGHT_S / BUILD_W)
//   beardLen    0..2, beardStyle, glasses, capColor: as in the creator
//   band        headband (BAND_COLS: 1 white, 2 green), only on players without a kufi or imama
//   sleeve      a shooting sleeve on the near ('n') or far ('f') arm; wrist: wristbands (team trim colour)
//   shoes       sneaker colour
//   stance      idle posture between plays (src/sim/cast-life.js)
//   cele        signature celebration after his own big play or a win (src/sim/cast-life.js)
const CAST_LOOKS = {
  'Sh. Kareem':  { vh: 1, vw: 1, glasses: true, stance: 'upright', cele: 'heart' },
  'Tariq':       { vh: 2, vw: 1, band: 1, stance: 'bouncy', cele: 'both' },
  'Sh. Rashid':  { vh: 2, vw: 2, beardLen: 2, wrist: true, stance: 'low', cele: 'sky' },
  'Samir':       { vh: 0, vw: 0, sleeve: 'n', stance: 'relaxed', cele: 'salute' },
  'Sh. Nabil':   { vh: 1, vw: 0, wrist: true, stance: 'upright', cele: 'sky' },
  'Faisal':      { vh: 2, vw: 2, shoes: '#e8c35a', stance: 'forward', cele: 'fist' },
  'Sh. Jamal':   { vh: 2, vw: 1, beardStyle: 3, sleeve: 'f', stance: 'still', cele: 'sujood' },
  'Hakeem':      { vh: 0, vw: 0, wrist: true, stance: 'bouncy', cele: 'fist' },
  'Sh. Mansour': { vh: 1, vw: 1, beardLen: 2, glasses: true, stance: 'behind', cele: 'heart' },
  'Omar':        { vh: 2, vw: 1, shoes: '#18a39a', stance: 'bouncy', cele: 'both' },
  'Sh. Waleed':  { vh: 1, vw: 2, wrist: true, stance: 'knees', cele: 'salute' },
  'Amir':        { vh: 1, vw: 0, band: 2, stance: 'light', cele: 'sky' },
  'Sh. Hassan':  { vh: 1, vw: 2, capColor: '#e8d9a8', wrist: true, stance: 'low', cele: 'takbir' },
  'Bassam':      { vh: 2, vw: 2, sleeve: 'n', shoes: '#ff7a45', stance: 'forward', cele: 'fist' },
  'Sh. Adnan':   { vh: 2, vw: 2, beardLen: 2, wrist: true, stance: 'still', cele: 'sujood' },
  'Rami':        { vh: 0, vw: 0, band: 1, stance: 'bouncy', cele: 'both' }
};
for (const T of TEAMS) for (const d of T.players) if (CAST_LOOKS[d.name]) Object.assign(d, CAST_LOOKS[d.name]);
