// v9.17.3 a career can't be lost (tests/run.mjs registers them; the fast tier runs them):
//   save-backup   a damaged autosave: the backup loads and the player is told (once, not during a match)
//   save-broken   the autosave and its backup both damaged: the career menu says so and offers Export, the unreadable
//                 text is kept (.broken, .bak.broken) and a new career doesn't write over it
//   save-full     every write throws (storage full / private mode): one message a session, a crash never; after a
//                 save works, a new failure is told again; persist() asked once; the Home Screen note once, on a phone
//   save-export   export, wipe, import (the file through the screens, with the keyboard): the same career, profile and
//                 teams; the career lands in the manual slot, not the autosave; a changed checksum is refused
//   save-old      saves made by the 8.6.0, 9.0.0 and 9.14.3 builds load unchanged (tests/fixtures/old-saves.json)
// and no page errors in any of them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OLD = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/old-saves.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function saveSafeTests({ newContext, open }) {
  const T = {};
  // a page with these keys in storage before the game starts
  async function pageWith(browser, base, keys, ctxOpts) {
    const errs = [], ctx = await newContext(browser, ctxOpts);
    await ctx.addInitScript(k => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); localStorage.clear(); for (const [a, b] of Object.entries(k)) localStorage.setItem(a, b); } }, keys);
    const p = await open(ctx, base + '/?nowelcome=1', errs, 'page');
    // every toast the game shows, and the screen it was on
    await p.evaluate(() => { window.__toasts = []; const _t = toast; toast = function (m) { window.__toasts.push({ m, screen: Game.screen }); return _t.apply(this, arguments); }; });
    return { ctx, p, errs };
  }
  const frames = (p, n = 30) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const fx = OLD['9.14.3'].keys;
  T['save-backup'] = async ({ browser, base }) => {
    const { ctx, p, errs } = await pageWith(browser, base, { 'islamdunk.career.auto': fx['islamdunk.career.auto'] });
    // three autosaves (the old save, then 7 wins, then 9): the one before the last is the backup, with its date
    const a = await p.evaluate(() => { loadCareer(SAVE_AUTO); C.wins = 7; saveCareer(); C.wins = 9; saveCareer(); const bak = JSON.parse(localStorage.getItem(SAVE_AUTO + '.bak')); return { bakWins: bak.wins, bakAt: !!localStorage.getItem(SAVE_AUTO + '.bak.at') }; });
    // a match being played: a damaged save read now is told after the match, not during it
    const bad = '{"v":1,"name":"Yus';
    const b = await p.evaluate(bad => {
      localStorage.setItem(SAVE_AUTO, bad); Game.screen = 'play';
      const o = readSave(SAVE_AUTO); return { wins: o && o.wins, name: o && o.name, broken: localStorage.getItem(SAVE_AUTO + '.broken') === bad, restored: (JSON.parse(localStorage.getItem(SAVE_AUTO)) || {}).wins };
    }, bad);
    await frames(p, 20);
    const during = await p.evaluate(() => window.__toasts.length);
    await p.evaluate(() => { Game.screen = 'cmenu'; Game.idx = 0; readSave(SAVE_AUTO); }); await frames(p, 20);
    const t = await p.evaluate(() => window.__toasts.map(x => x));
    await ctx.close();
    const msg = t.find(x => /latest save couldn.t be read\. Loaded the one before it \(from /.test(x.m));
    const ok = a.bakWins === 7 && a.bakAt && b.wins === 7 && b.name === 'Yusuf' && b.broken && b.restored === 7 && during === 0 && !!msg && !/an earlier save/.test(msg.m) && msg.screen !== 'play'
      && t.filter(x => /couldn.t be read/.test(x.m)).length === 1 && !errs.length;
    return { ok, detail: [`backup after two saves: wins ${a.bakWins}; damaged autosave read: ${JSON.stringify(b)}`, `toasts during the match: ${during}; after: ${JSON.stringify(t)}`, ...errs] };
  };
  T['save-broken'] = async ({ browser, base }) => {
    const bad = '{"v":1,"name":"Yusuf","wins":', badBak = 'not json';
    const { ctx, p, errs } = await pageWith(browser, base, { 'islamdunk.career.auto': bad, 'islamdunk.career.auto.bak': badBak });
    const r = await p.evaluate(([bad, badBak]) => {
      Game.screen = 'cmenu'; Game.idx = 0;
      const items = cmenuItems().map(x => x[0]);
      const first = { items, read: readSave(SAVE_AUTO), broken: localStorage.getItem(SAVE_AUTO + '.broken') === bad, bakBroken: localStorage.getItem(SAVE_AUTO + '.bak.broken') === badBak };
      // the export carries the unreadable text
      const ex = JSON.parse(ssExportText());
      // a new career, saved twice
      C = freshCareer(); C.name = 'New'; saveCareer(); C.wins = 1; saveCareer();
      return { ...first, exportBroken: !!(ex.data.broken && ex.data.broken[SAVE_AUTO] === bad),
        after: { broken: localStorage.getItem(SAVE_AUTO + '.broken') === bad, bakBroken: localStorage.getItem(SAVE_AUTO + '.bak.broken') === badBak, main: JSON.parse(localStorage.getItem(SAVE_AUTO)).name } };
    }, [bad, badBak]);
    await frames(p, 10); await ctx.close();
    const ok = r.read === null && r.items[0].startsWith('We couldn’t read your career') && !r.items.some(x => x === 'Continue career') && r.broken && r.bakBroken && r.exportBroken
      && r.after.broken && r.after.bakBroken && r.after.main === 'New' && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };
  T['save-full'] = async ({ browser, base }) => {
    // a phone, not started from the Home Screen, where the browser says no to keeping the data
    const { ctx, p, errs } = await pageWith(browser, base, { 'islamdunk.career.auto': fx['islamdunk.career.auto'] }, { device: { isMobile: true, hasTouch: true, viewport: { width: 844, height: 390 } } });
    const r = await p.evaluate(async () => {
      window.__persist = 0; try { Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist: () => { window.__persist++; return Promise.resolve(false); }, estimate: () => Promise.resolve({}) } }); } catch (e) {}
      Game.screen = 'cmenu';
      loadCareer(SAVE_AUTO);
      const real = Storage.prototype.setItem, full = function () { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
      Storage.prototype.setItem = full;
      const res = []; for (let i = 0; i < 6; i++) { C.wins++; res.push(saveCareer()); } Profile.load(); Profile.save(); csSave();
      await new Promise(r => setTimeout(r, 400));
      const n1 = window.__toasts.filter(x => /Couldn.t save/.test(x.m)).length;
      Storage.prototype.setItem = real; const okAfter = saveCareer();
      Storage.prototype.setItem = full; for (let i = 0; i < 3; i++) saveCareer();
      await new Promise(r => setTimeout(r, 400));
      Storage.prototype.setItem = real;
      return { res, n1, okAfter, persist: window.__persist };
    });
    await frames(p, 60); await sleep(11500); await frames(p, 60);    // (a toast lasts 5 s and the next waits for it: three of them)
    const t = await p.evaluate(() => ({ toasts: window.__toasts.map(x => x.m), note: localStorage.getItem('islamdunk.persistNote') }));
    await ctx.close();
    const fails = t.toasts.filter(m => /Couldn.t save: storage is full or this browser is in private mode\./.test(m)).length;
    const ok = r.res.every(x => x === false) && r.okAfter === true && r.persist === 1 && fails === 2 && t.toasts.filter(m => /Add to Home Screen/.test(m)).length === 1 && t.note === '1' && !errs.length;
    return { ok, detail: [`saves while full: ${r.res.join(',')}; a save after: ${r.okAfter}; persist() asked ${r.persist} time(s)`, `"Couldn't save" shown ${fails} times (once, then once more after a save worked); toasts: ${JSON.stringify(t.toasts)}`, ...errs] };
  };
  T['save-export'] = async ({ browser, base }) => {
    const { ctx, p, errs } = await pageWith(browser, base, { ...fx, 'islamdunk.career.slot1': fx['islamdunk.career.slot1'] }, { device: { acceptDownloads: true, viewport: { width: 1280, height: 720 } } });
    const before = await p.evaluate(() => ({ auto: localStorage.getItem(SAVE_AUTO), profile: localStorage.getItem(PROFILE_KEY), custom: localStorage.getItem(CS_KEY) }));
    // Export through the screen with the keyboard: Enter on "Save file" downloads it
    await p.evaluate(() => { loadCareer(SAVE_AUTO); Game.screen = 'saves'; Game.idx = 3; }); await frames(p, 5);
    await p.keyboard.press('Enter'); await frames(p, 5);
    const onExport = await p.evaluate(() => Game.screen);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.keyboard.press('Enter')]);
    const file = dl ? fs.readFileSync(await dl.path(), 'utf8') : '';
    // tampered: one value changed, the checksum left as it was
    const tampered = await p.evaluate(f => { const o = JSON.parse(f); o.data.profile = o.data.profile.replace('900', '9000'); return ssCheckImport(JSON.stringify(o)).err || 'accepted'; }, file);
    // wipe, then Import through the screen: the file's text arrives (as a picked file would), Enter imports it
    const r = await p.evaluate(async f => {
      localStorage.clear(); Profile.d = null; CS.d = null; C = null;
      openSaveImport(() => { Game.screen = 'cmenu'; }); ssTryImport(f);
      const line = SaveIO.pending && SaveIO.pending.line;
      Game.idx = 0; await new Promise(r => requestAnimationFrame(r));
      return { line, screen: Game.screen };
    }, file);
    await p.keyboard.press('Enter'); await frames(p, 5);
    const after = await p.evaluate(() => ({ auto: localStorage.getItem(SAVE_AUTO), slot1: localStorage.getItem(SAVE_SLOT), profile: localStorage.getItem(PROFILE_KEY), custom: localStorage.getItem(CS_KEY), msg: SaveIO.msg,
      loaded: loadCareer(SAVE_SLOT) && C.name === 'Yusuf' && C.wins === 5, xp: Profile.load().xp, players: csLoad().players.length }));
    await ctx.close();
    const deep = (a, b) => JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
    const ok = onExport === 'saveexport' && !!dl && /^islamdunk-save-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()) && /check doesn.t match/.test(tampered)
      && /^Yusuf, Masjid Al-Amanah: season 1, (week \d+, )?5-2, profile, your teams$/.test(r.line || '') && after.auto === null && deep(after.slot1, before.auto)
      && deep(after.profile, before.profile) && deep(after.custom, before.custom) && after.loaded && after.xp === 900 && after.players === 1 && !errs.length;
    return { ok, detail: [`export screen: ${onExport}; file: ${dl ? dl.suggestedFilename() + ', ' + file.length + ' characters' : 'none'}`, `tampered: ${tampered}`, `import: "${r.line}"; ${after.msg}`,
      `after: autosave ${after.auto === null ? 'untouched (empty)' : 'written!'}; manual slot = the exported career: ${deep(after.slot1, before.auto)}; profile: ${deep(after.profile, before.profile)}; teams: ${deep(after.custom, before.custom)}`, ...errs] };
  };
  T['save-old'] = async ({ browser, base }) => {
    const rows = [], errs = [];
    for (const [v, o] of Object.entries(OLD)) {
      const P = await pageWith(browser, base, o.keys);
      const r = await P.p.evaluate(keys => {
        const ok = loadCareer(SAVE_AUTO), slot = readSave(SAVE_SLOT), d = Profile.load(), cs = csLoad();
        const same = Object.entries(keys).every(([k, s]) => localStorage.getItem(k) === s);
        return { ok, name: C && C.name, wins: C && C.wins, losses: C && C.losses, sht: C && C.lv.sht, sv: C && C.sv, slotWins: slot && slot.wins, xp: d.xp, players: cs.players.length, same,
          broken: Object.keys(localStorage).filter(k => k.endsWith('.broken')).length };
      }, o.keys);
      await P.ctx.close(); errs.push(...P.errs);
      rows.push({ v, ...r });
    }
    const ok = rows.every(r => r.ok && r.name === 'Yusuf' && r.wins === 5 && r.losses === 2 && r.sht === 6 && r.slotWins === 4 && r.xp === 900 && r.players === 1 && r.same && r.broken === 0) && !errs.length;
    return { ok, detail: [...rows.map(r => JSON.stringify(r)), ...errs] };
  };
  return T;
}
