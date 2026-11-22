// node tools/dunk-record.mjs <out dir> [type,type,...]      (after npm run build:review)          v9.34.0
// Records dunks from the Review Studio's Animations tab (dunk/<type>: the game's own sim, a fixed seed), frame by frame:
// every joint angle, the ball, the hands. It reports for each dunk:
//   step   the largest change in a joint's angle from one frame to the next, per joint and overall (radians)
//   jerk   the largest change in that step from one frame to the next: where a joint's speed changes sharply (and the
//          frames where it does, as a share of the dunk)
//   timing take-off to the ball under the leg (between the legs), and to the slam, and the whole dunk (s)
//   gap    the farthest the held ball is from the nearer drawn hand
// and writes a filmstrip PNG per dunk (every 3rd frame from take-off to just after the slam) and <out>/dunks.json.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { openStudio } from './studio-run.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'dunks'), types = (process.argv[3] || 'betweenlegs,windmill').split(',');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(), st = await openStudio(b, path.join(ROOT, 'dist/review')), p = st.page;
const res = {};
for (const type of types) {
  const r = await p.evaluate(type => {
    const G = window.__studio.S.G, rs = G.rs, W = G.win, id = 'dunk/' + type, have = rs.anims().find(a => a.id === id);
    if (!have) return null;
    const c = document.createElement('canvas'), w = 260, h = 220; c.width = w; c.height = h; const g = c.getContext('2d');
    rs.animStart(id, {});
    const rows = [], shots = [];
    for (let i = 0; i < have.n + 40; i++) {
      const info = rs.animStep(); if (!info) break;
      const M = W.eval('M'), me = M.players.find(q => q.human === 0) || M.players[0], ball = W.eval('ball');
      const a = me.state === 'dunk' ? me.act : null, held = ball.owner === me;
      const hn = me.hands.n, hf = me.hands.f, gap = held ? Math.min(Math.hypot(ball.x - hn.x, ball.y - hn.y, ball.z - hn.z), Math.hypot(ball.x - hf.x, ball.y - hf.y, ball.z - hf.z)) : null;
      rows.push({ f: i, state: me.state, s: a ? a.s : null, slam: !!(a && a.didSlam), held, gap, j: Object.fromEntries(info.joints), ball: [ball.x, ball.y, ball.z], behind: !!ball.behind, type: a && a.type });
      if (me.state === 'dunk' || (rows.some(x => x.state === 'dunk') && shots.length < 60 && rows.filter(x => x.state !== 'dunk' && rows.indexOf(x) > rows.findIndex(y => y.state === 'dunk')).length < 8)) {
        if (i % 3 === 0) { g.fillStyle = '#20242c'; g.fillRect(0, 0, w, h); rs.animDraw(g, w, h); g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.fillText((a ? 's ' + a.s.toFixed(2) : me.state) + '  f' + i, 6, 14); shots.push(c.toDataURL('image/png')); }
      }
    }
    rs.animStop();
    return { rows, shots, dt: W.eval('STEP') };
  }, type);
  if (!r) { console.log('no animation dunk/' + type); continue; }
  const D = r.rows.filter(x => x.state === 'dunk'), K = Object.keys(D[0].j), i0 = r.rows.indexOf(D[0]);
  // the dunk itself plus the 6 frames after it (the landing out of the slam pose)
  const seg = r.rows.slice(i0, i0 + D.length + 6), step = {}, jerk = {}, jerkAt = {};
  const da = (x, y) => { const d = x - y; return d - Math.round(d / (2 * Math.PI)) * 2 * Math.PI; };   // (an arm that turns past a full circle wraps: not a step)
  for (const k of K) {
    let mx = 0, mj = 0, at = [];
    for (let i = 1; i < seg.length; i++) { const d = Math.abs(da(seg[i].j[k], seg[i - 1].j[k])); if (d > mx) mx = d; }
    for (let i = 2; i < seg.length; i++) {
      const v1 = da(seg[i].j[k], seg[i - 1].j[k]), v0 = da(seg[i - 1].j[k], seg[i - 2].j[k]), dj = Math.abs(v1 - v0);
      if (dj > mj) mj = dj; if (dj > 0.04) at.push(seg[i].s != null ? +seg[i].s.toFixed(2) : 'after');
    }
    step[k] = +mx.toFixed(3); jerk[k] = +mj.toFixed(3); jerkAt[k] = [...new Set(at)].slice(0, 8);
  }
  const fs0 = D.findIndex(x => x.slam), under = D.findIndex(x => x.behind), gap = Math.max(...seg.filter(x => x.held && x.gap != null).map(x => x.gap));
  const oneJ = K.filter(k => k !== 'K' && k !== 'D');
  res[type] = {
    frames: D.length, seconds: +(D.length * r.dt).toFixed(3), toUnderLeg: under >= 0 ? +(under * r.dt).toFixed(3) : null, toSlam: fs0 >= 0 ? +(fs0 * r.dt).toFixed(3) : null,
    maxStep: Math.max(...oneJ.map(k => step[k])), maxStepJoint: oneJ.reduce((a, k) => step[k] > step[a] ? k : a, oneJ[0]), step, maxJerk: Math.max(...oneJ.map(k => jerk[k])), jerk, jerkAt,
    ballGap: +gap.toFixed(1), heldFrames: seg.filter(x => x.held).length,
  };
  // the filmstrip: 10 to a row
  const n = r.shots.length, cols = 10, rowsN = Math.ceil(n / cols);
  const html = `<html><body style="margin:0;background:#111">${r.shots.map(s => `<img src="${s}" style="width:260px;height:220px;display:inline-block;vertical-align:top">`).join('')}</body></html>`;
  const pg = await b.newPage({ viewport: { width: 260 * cols, height: 220 * rowsN } }); await pg.setContent(html); await pg.waitForTimeout(200);
  await pg.screenshot({ path: path.join(out, `strip-${type}.png`) }); await pg.close();
  fs.writeFileSync(path.join(out, `frames-${type}.json`), JSON.stringify(seg));
}
fs.writeFileSync(path.join(out, 'dunks.json'), JSON.stringify(res, null, 1));
for (const [t, v] of Object.entries(res)) console.log(`${t}: ${v.frames} frames (${v.seconds} s); under the leg at ${v.toUnderLeg} s, slam at ${v.toSlam} s; largest step ${v.maxStep} (${v.maxStepJoint}); largest change of speed ${v.maxJerk}; ball to hand at most ${v.ballGap}\n  steps ${JSON.stringify(v.step)}\n  speed changes over 0.04 at s ${JSON.stringify(v.jerkAt)}`);
await st.close(); await b.close();
