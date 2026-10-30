// Review Studio tests (dist/review, built by npm test). Registered into tests/run.mjs.
//   studio          loads with no page errors (studio or game frame); every item of every category draws without
//                   throwing (failures listed); counts per category; IDs are unique and every registered ID
//                   (docs/review/studio-ids.json) still exists or is listed as removed
//   studio-csv      K/F/D/arrows/N/undo; CSV export -> clear -> import gives the same marks (v9.13: with merge_into and the
//                   sound picks); game-text.csv
//                   (Keep/Change/Cut) and ?review=1 (islamdunk-review.csv) imports map Change -> fix, Cut -> delete;
//                   merge by id + reviewer with the newest mark winning, conflicts listed; Delete never changes the
//                   game or game-text.csv (file hashes before / after); the game frame's storage is sandboxed;
//                   review:report prints a worklist and changes nothing
//   studio-anim     (Phase 3: every sound in the list plays) every animation plays on the game's sim, reaches its state, finite joints, deterministic, flip
//   studio-excluded the studio is not in dist/web or the Electron renderer build
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openStudio } from '../tools/studio-run.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist/review');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hashTree = dir => { const h = crypto.createHash('sha1'); const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else { h.update(p); h.update(fs.readFileSync(p)); } } }; walk(dir); return h.digest('hex'); };
const hashFile = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');

export const STUDIO_TESTS = {};

STUDIO_TESTS['studio'] = async ({ browser }) => {
  if (!fs.existsSync(path.join(DIST, 'review.html'))) return { ok: false, detail: ['dist/review is missing: run vite build --mode review'] };
  const st = await openStudio(browser, DIST), p = st.page, detail = [];
  const counts = await p.evaluate(() => window.__studio.counts());
  for (const [c, v] of Object.entries(counts)) detail.push(`${c}: ${v.total} (${Object.entries(v.groups).map(([g, n]) => g + ' ' + n).join(', ')})`);
  const failed = [];
  let screens = [];
  for (const c of Object.keys(counts)) { const r = await p.evaluate(c => window.__studio.renderAll(c), c); if (r.n !== counts[c].total) failed.push(`${c}: drew ${r.n} of ${counts[c].total}`); for (const f of r.failed) failed.push(`${f.id}: ${f.error}`); if (r.screens) screens = screens.concat(r.screens); }
  // screens: each setup lands on the screen it is listed for, and none throws a page error
  for (const s of screens) { if (s.screen !== s.expect) failed.push(`${s.id}: set up on "${s.screen}", listed as "${s.expect}"`); for (const e of s.errors) failed.push(`${s.id}: page error: ${e}`); }
  const sum = k => screens.reduce((a, s) => a + s[k], 0), flagged = k => screens.filter(s => s[k]).map(s => s.id.replace(/^screen\//, '') + ' ' + s[k]);
  const na = await p.evaluate(() => window.__studio.S.items.filter(i => i.kind === 'screen-na').map(i => i.id + ': ' + i.reason));
  const list = await p.evaluate(() => window.__studio.list());
  const ids = list.map(i => i.id), dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/review/studio-ids.json'), 'utf8')), have = new Set(ids);
  const gone = Object.keys(reg.ids).filter(id => !have.has(id)), unreg = ids.filter(id => !reg.ids[id] && !reg.removed[id]);
  const back = Object.keys(reg.removed).filter(id => have.has(id));
  const gameErr = await p.evaluate(() => window.__studio.gameErrors());
  await st.close();
  const total = Object.values(counts).reduce((a, v) => a + v.total, 0);
  detail.unshift(`${total} items; render failures ${failed.length}; duplicate IDs ${dup.length}; registered IDs gone ${gone.length}; removed IDs back ${back.length}; not registered yet ${unreg.length} (new in this build)`);
  detail.push(`screens: ${screens.length} rendered; flags (for review, not failures): ${sum('overflow')} text past the edge, ${sum('small')} small text, ${sum('overlaps')} overlapping tap targets`,
    '  past the edge: ' + flagged('overflow').join(', '), '  small text: ' + flagged('small').join(', '), '  overlapping targets: ' + flagged('overlaps').join(', '), ...na.map(n => 'not renderable: ' + n));
  detail.push(...failed.slice(0, 30), ...dup.slice(0, 10).map(d => 'duplicate ' + d), ...gone.slice(0, 20).map(g => 'gone without being listed as removed: ' + g), ...back.map(b => 'a removed ID is back: ' + b), ...st.errors, ...gameErr.map(e => 'game frame: ' + e));
  const ok = !failed.length && !dup.length && !gone.length && !back.length && !st.errors.length && !gameErr.length && total > 3000;
  return { ok, detail };
};

// animations: every one plays through the game's own sim; the expected state shows up; joints stay finite;
// the same id gives the same frames twice; flip plays toward the other hoop; another character works
STUDIO_TESTS['studio-anim'] = async ({ browser }) => {
  const st = await openStudio(browser, DIST), p = st.page;
  const r = await p.evaluate(() => {
    const rs = window.__studio.S.G.rs, out = { n: 0, bad: [], states: {} };
    const EXPECT = { dunk: 'dunk', hang: 'hang', shoot: 'shoot', pass: 'pass', steal: 'steal', block: 'jump', fall: 'down', shove: 'shove', move: null };
    for (const a of rs.anims()) {
      out.n++; const seen = new Set(); let info = rs.animStart(a.id, {}); seen.add(info.state);
      for (let i = 0; i < a.n; i++) { info = rs.animStep(); seen.add(info.state); if (info.joints.some(([, v]) => !isFinite(v)) || !isFinite(info.y)) { out.bad.push(a.id + ': joints not finite at ' + i); break; } }
      const want = EXPECT[a.id.split('/')[0]];
      if (want && !seen.has(want)) out.bad.push(a.id + ': never reached ' + want + ' (' + [...seen].join(',') + ')');
      out.states[a.id] = [...seen].join(',');
    }
    const at = (id, o, f) => { rs.animStart(id, o); let x; for (let i = 0; i < f; i++) x = rs.animStep(); return x; };
    const j1 = JSON.stringify(at('dunk/tomahawk-classic', {}, 40).joints), j2 = JSON.stringify(at('dunk/tomahawk-classic', {}, 40).joints);
    out.deterministic = j1 === j2;
    out.flipFace = at('run/default', { flip: true }, 20).face; out.face = at('run/default', {}, 20).face;
    out.who = at('dunk/twohand', { who: 'cast/saleem' }, 30).state;
    const c = document.createElement('canvas'); c.width = 520; c.height = 380; rs.animDraw(c.getContext('2d'), 520, 380);
    const d = c.getContext('2d').getImageData(0, 0, 520, 380).data; let px = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) px++;
    out.drawn = px; rs.animStop();
    out.sounds = rs.sounds().length; out.soundErr = [];
    for (const k of rs.sounds()) { try { rs.playSound(k); } catch (e) { out.soundErr.push(k + ': ' + e.message); } }
    return out;
  });
  const gameErr = await p.evaluate(() => window.__studio.gameErrors());
  await st.close();
  const ok = r.n >= 50 && !r.bad.length && r.deterministic && r.face !== r.flipFace && r.who === 'dunk' && r.drawn > 2000 && r.sounds >= 15 && !r.soundErr.length && !st.errors.length && !gameErr.length;
  return { ok, detail: [`${r.sounds} sounds play without errors; ${r.n} animations; deterministic ${r.deterministic}; faces ${r.face} / flipped ${r.flipFace}; Sh. Saleem dunk ${r.who}; ${r.drawn} px drawn`, ...r.bad, ...r.soundErr, ...st.errors, ...gameErr] };
};

STUDIO_TESTS['studio-csv'] = async ({ browser }) => {
  const before = { src: hashTree(path.join(ROOT, 'src')), text: hashFile(path.join(ROOT, 'docs/review/game-text.csv')), web: fs.existsSync(path.join(ROOT, 'dist/web/index.html')) ? hashFile(path.join(ROOT, 'dist/web/index.html')) : '' };
  const st = await openStudio(browser, DIST), p = st.page, out = {};
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { window.__studio.store.setReviewer('Amina', 'Content/religious'); window.__studio.setFilter({ cat: 'Trivia', group: null, st: 'all', q: '' }); window.__studio.select('trivia/0'); });
  const key = async k => { await p.keyboard.press(k); await sleep(40); };
  await p.locator('#list').focus();
  await key('k'); await key('f'); await key('d');                 // trivia/0 keep, 1 fix, 2 delete; now on 3
  await key('ArrowLeft'); await key('ArrowLeft');                    // back to 1
  out.cur = await ev(() => window.__studio.S.view[window.__studio.S.cur].id);
  await key('n'); await p.keyboard.type('Say “the Quran” the same way everywhere'); await key('Escape');
  await p.locator('#f-suggested').fill('Which surah is called the Mother of the Book?');
  await p.locator('#f-suggested').blur();
  const mk = id => ev(id => window.__studio.store.mark(id), id);
  out.m0 = (await mk('trivia/0')).verdict; out.m1 = await mk('trivia/1'); out.m2 = (await mk('trivia/2')).verdict;
  // undo: the delete on trivia/2 goes away... after undoing the text edits first
  await p.locator('#list').focus();
  await key('Control+z'); await key('Control+z'); await key('Control+z');
  out.afterUndo = { m1: (await mk('trivia/1') || {}).suggested || '', m2: (await mk('trivia/2') || {}).verdict || '' };
  await ev(() => { window.__studio.select('trivia/2'); }); await p.locator('#list').focus(); await key('d');
  // more marks by a second reviewer, across categories
  await ev(() => { const s = window.__studio.store; s.set('dialogue/niyyah/0', { verdict: 'fix', comment: 'too long, the "intention" line', suggested: 'Before you go out: what is your intention?' });
    s.setReviewer('Yusuf', 'Art'); s.set('sprite/cast/saleem', { verdict: 'keep' }); s.set('sprite/ball/night', { verdict: 'delete', comment: 'hard to see, on dark courts' }); s.set('trivia/0', { verdict: 'fix', comment: 'second opinion' });
    s.set('sound/bounce', { verdict: 'fix', pick: 'B', comment: 'the real one' }); s.set('sound/cheer', { pick: 'none' }); s.set('screen/about/desktop', { verdict: 'merge', merge: 'screen/howto/desktop', comment: 'one help screen' }); });
  const csv1 = await ev(() => window.__studio.exportCsv());
  const rows1 = csv1.trim().split('\n').length - 1, items = await ev(() => window.__studio.list().length);
  out.header = csv1.split('\n')[0];
  // round trip
  const canon = () => ev(() => { const m = window.__studio.store.state.marks, o = []; for (const id of Object.keys(m).sort()) for (const r of Object.keys(m[id]).sort()) { const x = m[id][r]; o.push([id, r, x.verdict, x.comment, x.suggested, x.role, x.at, x.merge || '', x.pick || '']); } return JSON.stringify(o); });
  const marks1 = await canon();
  await ev(() => window.__studio.store.clearAll());
  out.imp = await ev(t => window.__studio.importCsv(t, 'export.csv'), csv1);
  const marks2 = await canon();
  out.roundTrip = marks1 === marks2;
  out.picks = await ev(() => { const s = window.__studio.store; return [(s.mark('sound/bounce') || {}).pick, (s.mark('sound/cheer') || {}).pick, (s.mark('screen/about/desktop') || {}).verdict, (s.mark('screen/about/desktop') || {}).merge].join('|'); });
  out.picksInCsv = /^sound\/bounce,.*,B$/m.test(csv1) && /^screen\/about\/desktop,.*,merge,.*,screen\/howto\/desktop,$/m.test(csv1);
  // conflicts: the same id + reviewer, differently, newer and older than ours
  const m = await mk('trivia/0');           // Yusuf's
  const head = out.header;
  const row = (verdict, at, comment) => [ 'trivia/0', 'Trivia / Trivia', 'q', 'data/trivia.js:1', 'phase1', verdict, comment, '', 'Yusuf', 'Art', at, '9.2.1' ].map(v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(',');
  out.newer = await ev(t => window.__studio.importCsv(t, 'newer.csv'), head + '\n' + row('keep', '2999-01-01T00:00:00.000Z', 'changed my mind') + '\n');
  out.afterNewer = (await mk('trivia/0')).verdict;
  out.older = await ev(t => window.__studio.importCsv(t, 'older.csv'), head + '\n' + row('delete', '2000-01-01T00:00:00.000Z', 'old') + '\n');
  out.afterOlder = (await mk('trivia/0')).verdict;
  out.conflictsListed = await ev(() => window.__studio.store.state.conflicts.length);
  // legacy: the game-text.csv packet with marks filled in
  const gt = fs.readFileSync(path.join(ROOT, 'docs/review/game-text.csv'), 'utf8').split('\n');
  const pick = (re) => gt.findIndex((l, i) => i > 0 && re.test(l));
  const iK = pick(/,What is the shortest surah in the Quran\?,/), iC = pick(/Chalk is forgiving, beta/), iX = pick(/Our first win! I’m framing/);
  const fill = (l, mark, sug, note) => l.replace(/,,,$/, ',' + mark + ',' + sug + ',' + note);
  const legacy = [gt[0], fill(gt[iK], 'Keep', '', ''), fill(gt[iC], 'Change', '"Chalk forgives, beta."', 'shorter'), fill(gt[iX], 'Cut', '', '')].join('\n') + '\n';
  await ev(() => { window.__studio.store.setReviewer('Packet', 'Content/religious'); });
  out.legacy = await ev(t => window.__studio.importCsv(t, 'game-text.csv'), legacy);
  out.legacyMarks = await ev(() => { const s = window.__studio.store; return { kaw: (s.mark('trivia/3') || {}).verdict, chalk: s.mark('dialogue/story/poolLoss-1/0'), win: (s.mark('dialogue/beat/first_win/0') || {}).verdict }; });
  // legacy: the in-game ?review=1 export
  const inGame = 'Kind,Text,Mark,Note\n"line","We just need the next one. Bismillah.","change","say it calmer"\n"line","I ran the numbers. We control our own path.","cut",""\n"feel","Games are a good length","4",""\n"line","A line that is not in the game","keep",""\n';
  await ev(() => { window.__studio.store.setReviewer('Playtest', 'Gameplay'); });
  out.inGame = await ev(t => window.__studio.importCsv(t, 'islamdunk-review.csv'), inGame);
  out.inGameMarks = await ev(() => { const s = window.__studio.store; return { a: s.mark('dialogue/story/poolLoss-1/1'), b: (s.mark('dialogue/story/poolLoss-0/1') || {}).verdict }; });
  // sandbox: the game frame has its own storage, the studio's marks are not in it
  out.sandbox = await ev(() => { const G = document.getElementById('gameframe').contentWindow; return G.localStorage !== window.localStorage && G.localStorage.getItem('islamdunk.studio') === null && !!window.localStorage.getItem('islamdunk.studio'); });
  const csvFinal = await ev(() => window.__studio.exportCsv());
  const gameErr = await ev(() => window.__studio.gameErrors());
  // reload: marks persist (autosave)
  await p.reload(); await p.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 60000 });
  out.persist = await ev(() => { const m = window.__studio.store.marksFor('trivia/2'); return !!(m.Amina && m.Amina.verdict === 'delete'); });
  await st.close();
  // the worklist script
  const tmp = path.join(ROOT, 'node_modules/.cache/studio-test'); fs.mkdirSync(tmp, { recursive: true });
  const f = path.join(tmp, 'export.csv'); fs.writeFileSync(f, csvFinal);
  const rep = execFileSync(process.execPath, [path.join(ROOT, 'scripts/review-report.mjs'), f], { encoding: 'utf8' });
  out.report = /== data\/trivia\.js/.test(rep) && /Delete \(recommended\)/.test(rep) && /new:  “Before you go out/.test(rep) && /Nothing has been changed/.test(rep)
    && /Merge into screen\/howto\/desktop/.test(rep) && /sound\/bounce: B/.test(rep);
  const after = { src: hashTree(path.join(ROOT, 'src')), text: hashFile(path.join(ROOT, 'docs/review/game-text.csv')), web: fs.existsSync(path.join(ROOT, 'dist/web/index.html')) ? hashFile(path.join(ROOT, 'dist/web/index.html')) : '' };
  out.untouched = before.src === after.src && before.text === after.text && before.web === after.web;
  const ok = out.cur === 'trivia/1' && out.m0 === 'keep' && out.m1.verdict === 'fix' && /Quran/.test(out.m1.comment) && /Mother of the Book/.test(out.m1.suggested) && out.m2 === 'delete'
    && out.afterUndo.m1 === '' && out.afterUndo.m2 === '' && out.header === 'id,category,name,where,version_added,verdict,comment,suggested,reviewer,role,reviewed_at,build_version,merge_into,pick'
    && rows1 >= items && out.roundTrip && out.picks === 'B|none|merge|screen/howto/desktop' && out.picksInCsv && out.imp.added > 0 && out.imp.conflicts === 0
    && out.newer.updated === 1 && out.afterNewer === 'keep' && out.older.kept === 1 && out.afterOlder === 'keep' && out.conflictsListed >= 2
    && out.legacy.format === 'game-text.csv' && out.legacyMarks.kaw === 'keep' && out.legacyMarks.chalk && out.legacyMarks.chalk.verdict === 'fix' && out.legacyMarks.chalk.suggested === 'Chalk forgives, beta.' && out.legacyMarks.win === 'delete'
    && out.inGame.format === 'in-game review' && out.inGame.unmatched === 1 && out.inGameMarks.a && out.inGameMarks.a.verdict === 'fix' && out.inGameMarks.a.comment === 'say it calmer' && out.inGameMarks.b === 'delete'
    && out.sandbox && out.persist && out.report && out.untouched && !st.errors.length && !gameErr.length;
  return { ok, detail: [`${rows1} CSV rows for ${items} items`, JSON.stringify(out).slice(0, 1800), ...st.errors, ...gameErr] };
};

STUDIO_TESTS['studio-excluded'] = async () => {
  const detail = [], bad = [];
  const marker = /review-studio|__RS\b|__STUDIO__|Review Studio/;
  const check = (dir, label) => {
    if (!fs.existsSync(dir)) { bad.push(label + ' missing'); return; }
    const files = []; const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else files.push(path.relative(dir, p)); } }; walk(dir);
    const studio = files.filter(f => /review|game\.html|studio/i.test(f));
    const html = files.filter(f => f.endsWith('.html'));
    const leaks = files.filter(f => /\.(html|js|json)$/.test(f) && marker.test(fs.readFileSync(path.join(dir, f), 'utf8')));
    detail.push(`${label}: ${files.length} files, html: ${html.join(' ')}; studio files: ${studio.length}; files mentioning the studio: ${leaks.length}`);
    if (studio.length || leaks.length || html.join() !== 'index.html') bad.push(label + ': ' + [...studio, ...leaks].join(' '));
  };
  check(path.join(ROOT, 'dist/web'), 'dist/web');
  const tmp = path.join(ROOT, 'node_modules/.cache/studio-electron-check');
  execFileSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'electron', '--outDir', tmp, '--emptyOutDir', '--logLevel', 'error'], { cwd: ROOT, stdio: 'pipe' });
  check(tmp, 'electron renderer');
  // GitHub Pages serves the repo root: the root index.html is the game only, and Jekyll excludes the studio's files
  const rootHtml = path.join(ROOT, 'index.html');
  if (fs.existsSync(rootHtml) && marker.test(fs.readFileSync(rootHtml, 'utf8'))) bad.push('the Pages index.html mentions the studio');
  const jc = fs.existsSync(path.join(ROOT, '_config.yml')) ? fs.readFileSync(path.join(ROOT, '_config.yml'), 'utf8') : '';
  for (const x of ['review.html', 'src/review-studio/']) if (!jc.includes('- ' + x)) bad.push('_config.yml does not exclude ' + x + ' from Pages');
  detail.push('Pages: root index.html is the game only; _config.yml excludes review.html and src/review-studio/');
  const eb = fs.readFileSync(path.join(ROOT, 'electron/electron-builder.yml'), 'utf8');
  if (/review/.test(eb)) bad.push('electron-builder.yml mentions review');
  detail.push('electron-builder files: ' + (eb.match(/^files:\n((?:  - .*\n)+)/m) || ['', ''])[1].replace(/\s+-\s+/g, ' ').trim());
  return { ok: !bad.length, detail: [...detail, ...bad] };
};
