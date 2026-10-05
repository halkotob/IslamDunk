// ================================================= v4.4: SKILL EXPRESSION
// ------------------------------------------------------------- moves
// Signature moves now come from a player's play style (archetype). Sheikhs keep
// the Sky Hook / Sheikh and Bake. Three new moves: Fadeaway (sharpshooters),
// Euro Step (playmakers) and Floater (glue guys). Each has its own release
// timing, set through its jump (the shot meter fills to the jump apex).
Object.assign(SIG_NAMES, { fade: 'FADEAWAY', euro: 'EURO STEP', floater: 'FLOATER' });
const ARCH_SIG = { sharpshooter: 'fade', playmaker: 'euro', rimrunner: 'spin', lockdown: 'stepback', glue: 'floater' };
const SIG_CD = 4.5;                                              // seconds between signature moves
const SIG_JUMP = { hook: 300, fade: JUMP_VY * 1.12, floater: 250, euro: 270 };   // release timing per move
const SIG_CALLS = {
  hook: [['SKY HOOK!', 'UNBLOCKABLE'], ['OVER THE TOP!', 'SKY HOOK']],
  bake: [['SHEIKH AND BAKE!', 'COOKED HIM'], ['OUT OF THE OVEN!', 'SHEIKH AND BAKE']],
  stepback: [['STEP-BACK THREE!', 'CREATED SPACE'], ['STEP BACK, SPLASH!', 'TOO MUCH ROOM']],
  spin: [['POWER SPIN!', 'RIGHT PAST HIM'], ['SPIN CYCLE!', 'AND FINISHED']],
  fade: [['FADEAWAY!', 'PURE SEPARATION'], ['FADING, AND IT\u2019S GOOD!', 'CAN\u2019T GUARD THAT'], ['TOO SMOOTH!', 'THE FADEAWAY']],
  euro: [['EURO STEP!', 'LEFT HIM GUESSING'], ['OUT OF THE EURO!', 'FOOTWORK'], ['SIDE TO SIDE!', 'EURO STEP FINISH']],
  floater: [['FLOATER!', 'SOFT TOUCH'], ['TEARDROP!', 'OVER THE BIG MAN'], ['JUST FLOATED IT!', 'MASHA\u2019ALLAH']]
};
const _sigLast = {};
function sigCall(k) { const pool = SIG_CALLS[k] || [[SIG_NAMES[k] + '!', '']]; let c, n = 0; do c = pick(pool); while (pool.length > 1 && c === _sigLast[k] && n++ < 6); _sigLast[k] = c; return c; }
function sigKind(def) {
  if (def.sheikh) return def.stats.sht >= 8 ? 'bake' : 'hook';
  const a = def.look ? lookArch(def.look) : def.arch;
  if (a && ARCH_SIG[a]) return ARCH_SIG[a];
  return def.stats.sht > def.stats.dnk ? 'stepback' : 'spin';         // classic: by stats
};
// Where each move works. `forced` (the Skills button) relaxes the need for a defender right on you.
function sigOk(p, k, forced) {
  const h = attackHoop(p.team), d = dxz(p, h), def = nearestOpp(p), od = def ? dxz(def, p) : 999, near = forced ? 140 : 75;
  if (k === 'hook') return d > 70 && d < 230 && od < near;
  if (k === 'bake') return d > 140 && d < 330 && od < near;
  if (k === 'stepback') return d > 230 && d < 370 && od < (forced ? 160 : 95);
  if (k === 'fade') return d > 120 && d < 300 && od < near;
  if (k === 'euro') return d > 110 && d < 250 && od < (forced ? 180 : 90);
  if (k === 'floater') return d > 90 && d < 230 && od < (forced ? 170 : 90);
  return d > 130 && d < 320 && od < near && def && (def.x - p.x) * sgn(h.x - p.x) > -10;   // spin: defender in front
}
function sigReady(p) { return p.state === 'free' && ball.owner === p && !(p.cd.sig > 0); }
function sigAvailable(p) { return M.phase === 'live' && sigReady(p) && sigOk(p, sigKind(p.def), true); }
function trySignature(p, forced = false) {
  if (!sigReady(p)) return false;
  const h = attackHoop(p.team), def = nearestOpp(p), k = sigKind(p.def);
  if (!sigOk(p, k, forced)) return false;
  p.cd.sig = SIG_CD;
  FX.pop(p.x, 132, p.z, SIG_NAMES[k], '#ffd76a'); SFX.squeak();
  logSig(p, k);
  if (k === 'hook' || k === 'fade' || k === 'floater') {
    if (k === 'fade') { const ax = p.x - h.x, az = p.z - h.z, L = Math.hypot(ax, az) || 1; p.fadeVx = ax / L * 125; p.fadeVz = az / L * 45; }
    p.sigShot = k; startShot(p); return true;
  }
  p.sig = { kind: k, t: 0, def }; p.state = 'sig'; p.st_t = 0; p.face = sgn(h.x - p.x);
  if (k === 'bake') startMove(p, 'cross');
  if (k === 'euro') { p.sig.side = def ? (sgn(p.z - def.z) || 1) : 1; startMove(p, 'cross'); }
  return true;
};
// Euro step: a long first step one way, a second step back the other way, then the finish.
{
  const _su = sigUpdate;
  sigUpdate = function (p, dt) {
    const s = p.sig;
    if (!s || s.kind !== 'euro' || ball.owner !== p) return _su(p, dt);
    const h = attackHoop(p.team); s.t += dt;
    const ux = h.x - p.x, uz = h.z - p.z, U = Math.hypot(ux, uz) || 1, fx = ux / U, fz = uz / U, side = s.side;
    if (s.t < 0.2) { p.vx = fx * 190 - fz * side * 210; p.vz = fz * 190 + fx * side * 210; }            // first step (sells it)
    else if (s.t < 0.4) { p.vx = fx * 210 + fz * side * 230; p.vz = fz * 210 - fx * side * 230; }       // back across
    else {
      p.sig = null; p.state = 'free'; p.vx *= 0.35; p.vz *= 0.35;
      if (canDunk(p)) { startDunk(p, {}); p.act.sig = 'euro'; } else { p.sigShot = 'euro'; startShot(p); }
    }
    p.euroPhase = s.t;
  };
}
// shooter-side effects of each move (contest distance, make chance)
function sigContestBonus(p) { return p.sigShot === 'fade' ? 26 : p.sigShot === 'floater' ? 10 : p.sigShot === 'euro' ? 18 : 0; }

// ------------------------------------------------------------- AI: reading the moves
// Adaptive read (Hard): the same move used again and again gets anticipated.
function logSig(p, k) {
  const L = p.sigLog = (p.sigLog || []).filter(e => M.time - e.t < 40); L.push({ t: M.time, k });
  if (p.human >= 0 && L.filter(e => e.k === k).length >= 3 && !(p.readUntil > M.time)) { p.readK = k; p.readUntil = M.time + 30; FX.pop(p.x, 150, p.z, 'DEFENSE IS READING IT', '#8fe3ff'); }
}
function beingRead(p, k) { return aiReads(p) && p.readK === k && p.readUntil > M.time; }
function aiReads(p) { const o = p.opps && p.opps[0]; return !!o && o.human < 0 && (aiCfg(o.team).read || 0) > 0.5; }
{
  const _ns = notifyShot;
  notifyShot = function (sh) {
    _ns(sh);
    const k = sh.sigShot, read = k && beingRead(sh, k);
    for (const o of sh.opps) {
      if (o.human >= 0 || !o.ai.jumpAt) continue;
      const d = dxz(o, sh);
      if (k === 'fade') {                           // fadeaways create space: don't fly at it, contest late from the floor unless right there
        if (d > 60 && !read) o.ai.jumpAt = null; else o.ai.jumpAt += read ? 0 : 0.08;
        o.ai.fadeHold = M.time + 0.5;
      } else if (k === 'floater') {                 // high arc over the big man: jumping early misses it
        if (dxz(o, attackHoop(sh.team)) < 110 && !read) o.ai.jumpAt += 0.14;
      } else if (k === 'euro') { if (!read) o.ai.jumpAt += 0.06; }
      if (read) o.ai.jumpAt = Math.max(M.time, o.ai.jumpAt - 0.12);    // anticipating a repeated move
    }
  };
}
// Euro step: defenders don't commit on the first step. While a handler is mid-euro, a CPU
// defender holds his ground between the ball and the rim instead of jumping or lunging.
function euroHold(o, c) {
  const bo = ball.owner;
  if (!bo || bo.team === o.team || bo.state !== 'sig' || !bo.sig || bo.sig.kind !== 'euro' || dxz(o, bo) > 150) return false;
  if (beingRead(bo, 'euro') && bo.sig.t > 0.18) return false;          // on a read, he slides with the second step
  const h = attackHoop(bo.team), ux = h.x - bo.x, uz = h.z - bo.z, U = Math.hypot(ux, uz) || 1;
  const tx = bo.x + ux / U * 55, tz = bo.z + uz / U * 55, dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
  zeroCmd(c); if (d > 8) { c.mx = dx / d * 0.6; c.mz = dz / d * 0.6; }
  o.ai.jumpAt = null; o.euroHeld = (o.euroHeld || 0) + 1;
  return true;
}
// CPU on Hard calls its own skill when closely guarded and it's available
function cpuSkill(p, c, dt) {
  const cf = aiCfg(p.team);
  if (!(cf.skillUse > 0.05) || p.human >= 0 || !sigAvailable(p)) return;
  if (nearestOppDist(p.x, p.z, p.team) < 80 && chance(dt * cf.skillUse)) c.s = true;
}

// ------------------------------------------------------------- customization
const SKINS_ALL = [...SKINS, '#f7dcc3', '#c78d63', '#8a5234', '#4d3020'];            // creator-only additions (CPU rosters unchanged)
const CAPCOLS_ALL = [...CAPCOLS, '#0f6b6b', '#b86b2a', '#e8e0d0', '#2a2a55'];
const THOBES_ALL = [...THOBES, '#1e5a4a', '#6a2a2a', '#c8b88f', '#3a4a5a'];
LOOK_TXT.beard.push('Goatee', 'Chinstrap');
LOOK_TXT.cap.push('Embroidered kufi', 'Striped kufi');
LOOK_TXT.thobeLen.push('Ankle, trimmed', 'Mid-calf, trimmed');
CAPKEYS.push('kufiEmb', 'kufiStripe');
const PLAY_STYLES = ['classic', 'sharpshooter', 'playmaker', 'rimrunner', 'lockdown', 'glue'];
const PLAY_STYLE_TXT = ['Classic', 'Sharpshooter', 'Playmaker', 'Rim Runner', 'Lockdown', 'Glue Guy'];   // the move is named under the demo
function lookArch(lk) { const a = PLAY_STYLES[lk.style || 0]; return a === 'classic' ? null : a; }
// signature-move demo loop for the creator preview
function drawSigDemo(g, x, y, s) {
  const cr = Game.creator; if (!cr) return;
  let p = cr.demo;
  if (!p || cr.demoKey !== JSON.stringify(C.look)) {
    p = cr.demo = new Player(playerDef(), 9, 0, amanahTeam()); p.x = -9999; p.outfit = 'thobe'; cr.demoKey = JSON.stringify(C.look); cr.demoT = 0;
    for (let i = 0; i < 20; i++) animate(p, 1 / 60);
  }
  const k = sigKind(p.def), dt = Math.min(Game.rdt || 0.016, 0.05); cr.demoT = (cr.demoT + dt) % 2.6;
  const t = cr.demoT; let ox = 0, jy = 0;
  p.fakeHold = t < 1.25; p.sigShot = null; p.sig = null; p.spin = 0; p.state = 'free'; p.vx = p.vz = 0;
  if (t < 0.5) { p.vx = 60; }                                                          // attack
  else if (t < 0.95) {                                                                 // the move itself
    const u = (t - 0.5) / 0.45;
    if (k === 'euro') { p.state = 'sig'; p.sig = { kind: 'euro', t: u * 0.4 }; ox = Math.sin(u * Math.PI * 2) * 22; p.vx = 200; }
    else if (k === 'spin') { p.spin = u * Math.PI * 2; ox = u * 30; p.vx = 250; }
    else if (k === 'stepback') { ox = -u * 30; p.vx = -150; }
    else if (k === 'bake') { p.state = 'sig'; p.sig = { kind: 'bake', t: u * 0.36 }; }
    else p.vx = 20;
  } else if (t < 1.8) {                                                                 // rise and release at the apex
    const u = (t - 0.95) / 0.85, hgt = ({ floater: 38, euro: 44, hook: 40, fade: 62 }[k] || 55) * 0.45;   // a readable hop that stays in the frame
    p.state = u < 0.12 ? 'windup' : 'shoot'; p.st_t = u * 0.6; p.sigShot = k === 'spin' || k === 'euro' ? null : k; jy = Math.sin(Math.PI * u) * hgt;
    if (k === 'fade' || k === 'bake' || k === 'stepback') ox = -u * 22;
    p.fakeHold = u < 0.5;
  }
  animate(p, dt);
  const d = Math.min(1, dt); p.y = jy;
  musFigure(g, p, x + ox * s * 0.6, y - jy * s * 0.35 * 0, s, 'stand');
  g.fillStyle = '#ffd76a'; g.font = `12px ${FONT}`; g.textAlign = 'center'; g.fillText('SIGNATURE: ' + SIG_NAMES[k], x, y + 26);
}
// cap patterns (embroidered / striped kufi) drawn over the plain kufi
function drawCapPattern(g, HX, HY, f, cap, col) {
  if (cap !== 'kufiEmb' && cap !== 'kufiStripe') return;
  g.save(); g.beginPath(); g.arc(HX, HY - 3, 9.6, Math.PI, 0); g.clip();
  const light = shade(col, 0.35), dark = shade(col, -0.3);
  if (cap === 'kufiStripe') { g.fillStyle = dark; for (let yy = -9; yy < 0; yy += 3) g.fillRect(HX - 10, HY - 3 + yy, 20, 1.2); }
  else { g.fillStyle = light; for (let i = -3; i <= 3; i++) { star8(g, HX + i * 2.9, HY - 5 - Math.abs(i) * 0.4, 1.1); g.fill(); } g.fillStyle = dark; g.fillRect(HX - 10, HY - 4.2, 20, 1.2); }
  g.restore();
}

function drawSkillCue(g, p) {
  const [x, y] = P(p.x + p.face * 26, p.y + 132, p.z), a = 0.65 + 0.35 * Math.sin(Game.t * 6);
  g.save(); g.globalAlpha = a; g.fillStyle = '#ffd76a'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.closePath(); g.fill();
  g.globalAlpha = 1; if (!Input.touchMode) drawTextSprite(g, textSprite(p.human === 1 ? 'N' : 'I', 9, '#ffd76a', '#140c06', 2.5), x + 12, y + 3);
  g.restore();
}

// creator rows: wider swatch lists, new rows for play style and team colors
{
  const R = k => CREATOR_ROWS.find(r => r.key === k);
  R('skin').sw = SKINS_ALL; R('capColor').sw = CAPCOLS_ALL; R('thobe').sw = THOBES_ALL;
  const at = CREATOR_ROWS.findIndex(r => r.key === 'num');
  CREATOR_ROWS.splice(at, 0, { label: 'Play style', key: 'style', txt: PLAY_STYLE_TXT }, { label: 'Match team colors', key: 'teamMatch', txt: ['Off', 'On'] });
}

