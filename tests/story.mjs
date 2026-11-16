// v9.22: the career story (src/career/story/, docs/career-overhaul/). Page-side helpers: tests/story-setup.js.
//   story-ch0      a new career by bot: the creator, C0.1 to C0.6 (the pickup game lost once, then won), lands in
//                  Chapter 1 at the hub; every scene in the Journal by ID; each screen drawn on the way; no page errors
//   story-ch1      Chapter 1 by bot (C1.1 to C1.9, King of the Court lost once, then won), lands at C2.1; the gym walk's corners
//                  done the real way: the whiteboard opens Upgrade stats and Back returns to the walk, the cooler, the cone
//                  run, chai with Imam Dawud; Ammo Jamil's and Ilyas's scenes (C1.3, C1.4) inside the walk
//   story-reload   a save at every Chapter 0 and Chapter 1 scene, a reload, Continue: the same scene starts again
//   story-hub      the hub has exactly its four entries (Continue, Gym, Masjid, My Player), the chapter's name and the
//                  next event; every entry opens its screen; desktop and phone draw without errors
//   story-cast     the seven teammates: each in the top two of the seven in both of his standout stats, at every stage
//   story-oldsave  a career save from before the story (sv < 10) is not offered: the career menu starts a new career;
//                  the profile and custom teams are untouched
import { STORY_HELPERS } from './story-setup.js';

export function storyTests({ newContext, open }) {
  const T = {};
  const prep = async (p) => p.evaluate(h => { (0, eval)(h); }, STORY_HELPERS);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const draw = p => p.evaluate(() => { try { render(ctx); return true; } catch (e) { return String(e && e.stack || e); } });

  T['story-ch0'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-ch0');
    await prep(p);
    const out = { steps: [], draws: [] };
    out.start = await p.evaluate(() => window.__sNew('Yusuf'));
    let lostOnce = false;
    for (let n = 0; n < 40; n++) {
      const st = await p.evaluate(() => window.__sState());
      if (st.at === 'C1.1' && st.screen === 'hub') break;
      const d = await draw(p); if (d !== true) out.draws.push(st.at + ' ' + st.screen + ': ' + d);
      const r = await p.evaluate(lose => window.__sStep({ lose }), !lostOnce);
      if (r === 'lost') lostOnce = true;
      out.steps.push(st.at + ':' + r);
      await sleep(40);
    }
    out.end = await p.evaluate(() => ({ s: window.__sState(), journal: (C.journal || []).map(e => e.id), hub: HUB_MENU().map(e => e.label), ch: storyChapter(), saved: (readSave(SAVE_AUTO) || {}).story }));
    await ctx.close();
    const ids = ['C0.1', 'C0.2', 'C0.3', 'C0.4', 'C0.5', 'C0.6'], at = out.steps.map(x => x.split(':')[0]);
    const pickups = out.steps.filter(x => x.startsWith('C0.5:') && /won|lost/.test(x)).map(x => x.split(':')[1]);
    const ok = out.start === 'C0.1' && ids.every(id => at.includes(id)) && pickups.join(',') === 'lost,won'
      && out.end.s.at === 'C1.1' && out.end.s.screen === 'hub' && out.end.ch === 1 && ids.every(id => out.end.journal.includes(id))
      && out.end.hub.length === 4 && out.end.saved && out.end.saved.at === 'C1.1' && !out.draws.length && !errs.length;
    return { ok, detail: [out.steps.join(' '), 'pickup: ' + pickups.join(','), 'end: ' + JSON.stringify(out.end), ...out.draws, ...errs] };
  };

  // Chapter 1 by bot, and the walk's corners done the real way: the whiteboard opens Upgrade stats (Back returns to the
  // walk), the cooler, a drill (the cone run, finished), chai with Imam Dawud
  T['story-ch1'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-ch1');
    await prep(p);
    const out = { draws: [] };
    out.toC1 = await p.evaluate(() => { window.__sNew('Bilal'); return window.__sRun('C1.1'); });
    await p.evaluate(() => { window.__sStep(); window.__sStep(); });          // C1.1 (the scene), then the C1.2 walk starts
    out.walk = await p.evaluate(() => {
      const r = { at: C.story.at, walk: !!Gym.story, free: !!(SW && SW.D.free) };
      let k = 0; while (SW.talk && k++ < 20) { SW.talk.t = 1; swAdvance(); }
      const me = M.players[0];
      place(me, 1064, 60); const wb = gymPropNear(); r.wb = wb && wb.id; useGymProp(wb); r.train = Game.screen; BACK.train(); r.back = Game.screen; r.upgrade = !!SW.goals.upgrade;
      place(me, 1150, 60); const co = gymPropNear(); r.co = co && co.id; useGymProp(co); r.cooler = !!SW.goals.cooler;
      for (let n = 0; n < 60 * 3; n++) gymUpdate(1 / 60);
      startDrill('cones'); for (const c of CONES) { place(M.players[0], c.x, c.z); drillUpdate(1 / 60); } r.drill = !!SW.goals.drill; r.result = !!Gym.result;
      Gym.result = null; setupPractice('free');
      window.__sTalk('dawud'); r.chai = !!SW.goals.chai;
      window.__sTalk('jamil'); window.__sTalk('ilyas'); r.parts = [!!C.story.seen['C1.3'], !!C.story.seen['C1.4']];
      r.wp = JSON.stringify(C.story.wp && C.story.wp.goals);
      return r;
    });
    for (let n = 0; n < 60; n++) {
      const st = await p.evaluate(() => window.__sState());
      if (st.at === 'C2.1' && st.screen === 'hub') break;
      const d = await draw(p); if (d !== true) out.draws.push(st.at + ' ' + st.screen + ': ' + d);
      out.steps = (out.steps || []).concat(st.at + ':' + await p.evaluate(() => window.__sStep({ lose: at => at === 'C1.8' && !(C.story.seen['C1.8'] > 0) })));
      await sleep(30);
    }
    out.end = await p.evaluate(() => ({ s: window.__sState(), journal: (C.journal || []).map(e => e.id).filter(Boolean), ch: storyChapter(), hub: HUB_MENU()[0].label }));
    await ctx.close();
    const ids = ['C1.1', 'C1.2', 'C1.3', 'C1.4', 'C1.5', 'C1.6', 'C1.7', 'C1.8', 'C1.9'], W = out.walk;
    const kotc = out.steps.filter(x => x.startsWith('C1.8:') && /won|lost/.test(x)).map(x => x.split(':')[1]);
    const ok = W.free && W.wb === 'wb' && W.train === 'train' && W.back === 'gym' && W.upgrade && W.co === 'cooler' && W.cooler && W.drill && W.chai && W.parts.every(Boolean)
      && ids.every(id => out.end.s.seen.includes(id) && out.end.journal.includes(id)) && kotc.join(',') === 'lost,won'
      && out.end.s.at === 'C2.1' && out.end.s.screen === 'hub' && out.end.ch === 2 && !out.draws.length && !errs.length;
    return { ok, detail: ['walk: ' + JSON.stringify(W), (out.steps || []).join(' '), 'King of the Court: ' + kotc.join(','), 'end: ' + JSON.stringify(out.end), ...out.draws, ...errs] };
  };

  T['story-reload'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-reload');
    const want = { 'C0.1': 'ssalams', 'C0.2': 'story', 'C0.3': 'gym', 'C0.4': 'gym', 'C0.5': 'play', 'C0.6': 'story',
      'C1.1': 'story', 'C1.2': 'gym', 'C1.5': 'musalla', 'C1.6': 'story', 'C1.7': 'story', 'C1.8': 'story', 'C1.9': 'story' }, ids = Object.keys(want), res = [];
    for (const id of ids) {
      await prep(p);
      await p.evaluate(id => { window.__sNew('Reload'); window.__sRun(id); saveCareer(); }, id);
      await p.reload(); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking');
      await prep(p);
      const r = await p.evaluate(() => {
        const items = cmenuItems().map(x => x[1]); if (!items.includes('continue')) return { items };
        cmenuSelect(items.indexOf('continue'));
        const hub = Game.screen; storyRun();
        return { items, hub, at: C.story.at, screen: Game.screen, walk: !!Gym.story, sid: Game.story && Game.story.sid };
      });
      await sleep(150);
      res.push(Object.assign({ id }, r));
    }
    await ctx.close();
    const ok = res.every(r => r.hub === 'hub' && r.at === r.id && r.screen === want[r.id] && (r.screen !== 'gym' || r.walk) && (r.screen !== 'story' || r.sid === r.id)) && !errs.length;   // (C1.6 and C1.8 open on their lead-in scene)
    return { ok, detail: [...res.map(r => JSON.stringify(r)), ...errs] };
  };

  T['story-hub'] = async ({ browser, base }) => {
    const errs = [], detail = []; let ok = true;
    for (const [dn, dev, touch] of [['desktop', { viewport: { width: 1280, height: 720 } }, false], ['phone', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, true]]) {
      const ctx = await newContext(browser, { device: dev }), p = await open(ctx, base + '/', errs, 'story-hub ' + dn);
      await prep(p);
      const r = await p.evaluate(touch => {
        Input.touchMode = touch; try { localStorage.setItem('islamdunk.portraitOK', '1'); } catch (e) {}
        window.__sNew('Hub'); window.__sRun('C1.1'); careerHub();
        const labels = HUB_MENU().map(e => e.label), seen = [];
        const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const g = cv.getContext('2d'), ft = g.fillText.bind(g);
        g.fillText = (t, ...a) => { seen.push(String(t)); return ft(t, ...a); };
        drawHub(g);
        const opened = {};
        const subs = { Masjid: HUB_MENU()[2].sub.map(x => x.label), 'My Player': HUB_MENU()[3].sub.map(x => x.label) };
        for (const [i, k] of [[1, 'Gym']]) { careerHub(); HUB_MENU()[i].act(); opened[k] = Game.screen; }
        for (const [k, j] of [['Musalla', 0], ['Office', 1], ['Outside', 2], ['Projects', 3]]) { careerHub(); HUB_MENU()[2].sub[j].act(); opened[k] = Game.screen; render(ctx); }
        for (const [k, j] of [['Upgrade', 0], ['Look', 1], ['Journal', 2], ['Stats', 3]]) { careerHub(); HUB_MENU()[3].sub[j].act(); opened[k] = Game.screen; render(ctx); }
        careerHub(); render(ctx);
        return { labels, subs, opened, chapter: seen.some(t => /Chapter 1: Making the team/.test(t)), next: seen.some(t => /^NEXT/.test(t)) };
      }, touch);
      await sleep(300);
      const good = r.labels.join('|') === 'Continue|Gym|Masjid|My Player' && r.chapter && r.next
        && r.opened.Gym === 'gym' && r.opened.Musalla === 'musalla' && r.opened.Office === 'office' && r.opened.Outside === 'masjid' && r.opened.Projects === 'shop'
        && r.opened.Upgrade === 'train' && r.opened.Look === 'creator' && r.opened.Journal === 'journal' && r.opened.Stats === 'cstats';
      if (!good) ok = false;
      detail.push(dn + ': ' + JSON.stringify(r));
      await ctx.close();
    }
    return { ok: ok && !errs.length, detail: [...detail, ...errs] };
  };

  T['story-cast'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-cast');
    const r = await p.evaluate(() => {
      const bad = [];
      for (let st = 0; st < 4; st++) for (const id of STORY_MATES) for (const k of MATE_STANDOUT[id]) {
        const mine = storyMateStats(id, st)[k], above = STORY_MATES.filter(o => o !== id && storyMateStats(o, st)[k] > mine).length;
        if (above > 1) bad.push(st + ':' + id + '.' + k + ' has ' + above + ' above');
      }
      const looks = STORY_MATES.concat(['mufti', 'hafiz', 'rayyan']).filter(id => !CAST[id] || !CAST[id].name);
      return { bad, looks, partners: PARTNERS.join(','), nums: STORY_MATES.map(id => CAST[id].num) };
    });
    await ctx.close();
    const ok = !r.bad.length && !r.looks.length && r.partners === STORY_MATES_LIST && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };
  const STORY_MATES_LIST = 'saleem,jamil,ilyas,karim,anas,dawud,musa';

  T['story-oldsave'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-oldsave');
    const r = await p.evaluate(() => {
      const old = { v: 1, sv: 5, seed: 7, name: 'Old', look: freshCareer().look, stage: 2, bp: 500, hb: 900, lv: { sht: 8, spd: 7, dnk: 5, def: 6, sta: 5, pas: 5, hus: 4, clu: 4 }, wins: 20, losses: 3 };
      localStorage.setItem(SAVE_AUTO, JSON.stringify(old)); localStorage.setItem(SAVE_SLOT, JSON.stringify(old));
      const prof = localStorage.getItem('islamdunk.profile');
      C = null; const items = cmenuItems().map(x => x[1]);
      cmenuSelect(items.indexOf('new'));
      const fresh = { screen: Game.screen, bp: C.bp, wins: C.wins, sv: C.sv, at: C.story.at, lv: C.lv.sht };
      return { items, fresh, profKept: localStorage.getItem('islamdunk.profile') === prof, loads: loadCareer(SAVE_AUTO) };
    });
    await ctx.close();
    const ok = !r.items.includes('continue') && !r.items.includes('load') && r.items.includes('new') && r.fresh.screen === 'creator' && r.fresh.bp === 0 && r.fresh.wins === 0 && r.fresh.sv >= 10 && r.fresh.at === 'C0.1' && r.fresh.lv === 4 && r.profKept && r.loads === false && !errs.length;
    return { ok, detail: [JSON.stringify(r), ...errs] };
  };
  return T;
}
