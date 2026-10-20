// v8.6.5: records a seeded tomahawk (joint targets from poseTargets, and the sprung joint angles) at 20
// points through the dunk. Used by the 'tomahawk' test in tests/run.mjs; the fixture
// tests/fixtures/tomahawk-classic.json was recorded from the 8.6.4 build, before the styles existed.
//   node tests/tomahawk-rec.mjs [page.html] > tests/fixtures/tomahawk-classic.json
export const TOMAHAWK_REC = `((style) => {
  if (style && typeof SETTINGS !== 'undefined') SETTINGS.tomahawk = style;
  window.__seed && window.__seed(4242);
  newMatch(TEAMS[0], TEAMS[1], { humans: [], fmt: { format: 'quarters', len: 60 } });
  for (let n = 0; n < 2000 && M.phase !== 'live'; n++) updateMatch(STEP);
  const p = M.players[0], h = attackHoop(p.team);
  for (const q of M.players) if (q !== p) place(q, h.x - h.dir * 500, 640);
  place(p, h.x + h.dir * 140, h.z + 30); p.state = 'free'; p.vx = p.vz = 0; giveBall(p, 'steal'); M.possTeam = p.team; M.inb = null;
  M.cmdHook = q => { zeroCmd(q.cmd); return true; };
  startDunk(p, { D: 0.9 }); p.act.type = 'tomahawk'; p.act.big = true;
  const K = ['nh', 'nk', 'fh', 'fk', 'ns', 'ne', 'fs', 'fe', 'lean'], r4 = v => Math.round(v * 1e4) / 1e4;
  // targets at 20 fixed points of dunk progress (a pure function of the pose state)
  const targets = [];
  for (let i = 0; i < 20; i++) { const s0 = p.act.s; p.act.s = i / 19 * 0.999; const t = poseTargets(p, 0); targets.push([...K, 'K', 'D'].map(k => r4(t[k]))); p.act.s = s0; }
  // the real dunk, frame by frame: joint angles at 20 evenly spaced frames, plus timing
  const frames = []; let slamAt = null, n = 0;
  while (p.state === 'dunk' && n < 600) { updateMatch(STEP); n++; if (p.act && p.act.slammed && slamAt == null) slamAt = n; frames.push(K.map(k => r4(p.j[k].a))); }
  const pick = Array.from({ length: 20 }, (_, i) => frames[Math.min(frames.length - 1, Math.round(i / 19 * (frames.length - 1)))]);
  let after = 0; while (after < 240 && p.state !== 'free') { updateMatch(STEP); after++; }
  for (let k = 0; k < 60; k++) updateMatch(STEP);
  const rest = K.map(k => r4(p.j[k].a)), finite = frames.every(f => f.every(Number.isFinite));
  M.cmdHook = null;
  return { targets, frames: pick, dunkFrames: frames.length, slamAt, backToFree: p.state === 'free', rest, finite };
})`;
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  const path = await import('node:path');
  const page = path.resolve(process.argv[2] || 'dist/web/index.html');
  const SEED = `(() => { let s = 1; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__seed = n => { s = n | 0; }; })();`;
  const b = await chromium.launch(), ctx = await b.newContext(); await ctx.addInitScript(SEED);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/, r => r.abort());
  const p = await ctx.newPage(); await p.goto('file://' + page + '?net=loop&lat=0&room=rec');
  await p.waitForFunction(() => typeof Game !== 'undefined' && typeof Net !== 'undefined' && Net.avail !== 'checking');
  const r = await p.evaluate(`${TOMAHAWK_REC}(${JSON.stringify(process.argv[3] || '')})`);
  console.log(JSON.stringify(r)); await b.close();
}
