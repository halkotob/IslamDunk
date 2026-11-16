// v9.22: the career story (src/career/story/, docs/career-overhaul/). Page-side helpers: tests/story-setup.js.
//   story-ch0      a new career by bot: the creator, C0.1 to C0.6 (the pickup game lost once, then won), lands in
//                  Chapter 1 at the hub; every scene in the Journal by ID; each screen drawn on the way; no page errors
//   story-ch1      Chapter 1 by bot (C1.1 to C1.9, King of the Court lost once, then won), lands at C2.1; the gym walk's corners
//                  done the real way: the whiteboard opens Upgrade stats and Back returns to the walk, the cooler, the cone
//                  run, chai with Imam Dawud; Ammo Jamil's and Ilyas's scenes (C1.3, C1.4) inside the walk
//   story-ch2      Chapter 2 by bot: the masjid league won, a lost semifinal on the way (next season, back to C2.4), the
//                  field (Al-Furqan and Rayyan, the masjid teams), lights out, the fundraiser and the title's project; and a
//                  run out in the group
//   story-ch3      Chapter 3 by bot: the nine-team table (eight games, our bye last), CHAI, the dunks-only all-star game
//                  (a jumper counts nothing), the fund, the injury and the return; a lost semifinal (back to C3.2), and a
//                  season outside the top four
//   story-ch4      Chapter 4 by bot: the sixteen-team knockout (Al-Furqan on the other half), a lost quarterfinal (back to
//                  C4.1), the title: the fundraiser delivered, the school wing on the Outside view, father and son
//   story-ch5      Chapter 5 by bot: King of the Court for the draw (a better finish, an easier quarterfinal), a lost
//                  semifinal (back to C5.1), the Cup, the credits, the hub after The End, and Continue into P.1
//   story-post     after The End: P.1, the replays (a title won again, a run lost, the all-star game, CHAI), all 21
//                  milestones with their moments, P.4, every prize used in the world, econSelfCheck() empty
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

  // Chapter 2 by bot: the masjid league on the winning path (Al-Furqan in the field, the teams from teams.js, a real pool
  // bracket, the fundraiser, the lights-out game drawn dark until 6), and through a lost semifinal: next season, back
  // to the checkpoint C2.4 with a new draw, then won. Also a run that goes out in the group (C2.13 to next season).
  T['story-ch2'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-ch2');
    await prep(p);
    const out = { draws: [] };
    out.toC2 = await p.evaluate(() => { window.__sNew('Hamza'); window.__sRun('C2.1'); return C.story.at; });
    const steps = [];
    let lostSemi = false, darkSeen = null;
    for (let n = 0; n < 160; n++) {
      const st = await p.evaluate(() => window.__sState());
      if (st.at === 'C3.1' && st.screen === 'hub') break;
      if (st.at === 'C2.10' && st.screen === 'play' && !darkSeen) {
        darkSeen = await p.evaluate(() => { const D = M.story.dark, on0 = D.on; M.teams[0].score = 6; updateMatch(STEP); return { on0, off: !D.on, k: D.k }; });
      }
      if (st.at === 'C2.4' && st.screen === 'gym' && !out.field) out.field = await p.evaluate(() => ({ teams: stageTeams(0).slice(1).map(t => t.name), rival: teamOf(0, 1).name, rayyan: teamOf(0, 1).players.some(q => q.name === 'Rayyan'), fmt: C.bracket && C.bracket.fmt, att: C.story.att, cp: C.story.cp }));
      const d = await draw(p); if (d !== true) out.draws.push(st.at + ' ' + st.screen + ': ' + d);
      const r = await p.evaluate(lose => window.__sStep({ lose: at => at === 'C2.14' && lose, pick: at => at === 'C2.5' ? 'ilyas' : null }), !lostSemi);
      if (st.at === 'C2.14' && r === 'lost') lostSemi = true;
      steps.push(st.at + ':' + r);
    }
    out.afterLoss = steps.filter(x => x.startsWith('C2.NS')).length > 0;
    out.end = await p.evaluate(() => ({ s: window.__sState(), journal: (C.journal || []).map(e => e.id).filter(Boolean), fund: C.story.fund, fundOn: C.story.fundOn, lights: C.up.lights, trophy: C.trophies.includes(0), titles: (C.titles || []).length,
      att: C.story.att, season: C.season, partner: C.partner, chem: chemOf('ilyas'), ch: storyChapter(), games: (C.games || []).length }));
    // out in the group: lose all three group games, C2.13 says so and the next season goes back to C2.4
    out.group = await p.evaluate(() => { window.__sNew('Group'); const L = { lose: at => /^C2\.(6|8|12)$/.test(at) }; window.__sRun('C2.12', L); const r = window.__sRun('C2.4', L); return { path: r, out: C.bracket === null || (C.bracket && C.bracket.out), at: C.story.at, att: C.story.att }; });
    await ctx.close();
    const ids = ['C2.1', 'C2.2', 'C2.3', 'C2.4', 'C2.5', 'C2.6', 'C2.7', 'C2.8', 'C2.9', 'C2.10', 'C2.11', 'C2.12', 'C2.13', 'C2.14', 'C2.15', 'C2.16'], E = out.end, F = out.field || {};
    const ok = F.rival === 'Masjid Al-Furqan' && F.rayyan && F.fmt === 'pool' && F.teams.length === 7 && F.teams.every(n => /^Masjid /.test(n)) && F.cp === 'C2.4'
      && darkSeen && darkSeen.on0 && darkSeen.off && lostSemi && out.afterLoss && ids.every(id => E.s.seen.includes(id) && E.journal.includes(id))
      && E.s.at === 'C3.1' && E.s.screen === 'hub' && E.fundOn && E.fund >= 5000 && E.lights === 1 && E.trophy && E.titles >= 1 && E.att === 1 && E.season === 2 && E.chem > 0 && E.ch === 3
      && out.group.path.includes('C2.13') && out.group.path.includes('C2.NS') && out.group.at === 'C2.4' && out.group.att === 1 && !out.draws.length && !errs.length;
    return { ok, detail: ['field: ' + JSON.stringify(F), 'lights out: ' + JSON.stringify(darkSeen), steps.join(' '), 'end: ' + JSON.stringify(E), 'out in the group: ' + JSON.stringify(out.group), ...out.draws, ...errs] };
  };

  T['story-ch3'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-ch3');
    await prep(p);
    const out = { draws: [] };
    out.toC3 = await p.evaluate(() => { window.__sNew('Yusuf'); window.__sRun('C3.1', { max: 600 }); return C.story.at; });
    const steps = [];
    let lostSemi = false;
    for (let n = 0; n < 260; n++) {
      const st = await p.evaluate(() => window.__sState());
      if (st.at === 'C4.1' && st.screen === 'hub') break;
      if (st.at === 'C3.3' && st.screen === 'story' && !out.table) out.table = await p.evaluate(() => { const b = C.bracket; return { table: b.table, n: b.pg[0].length, ours: b.pg[0].filter(g => g.a === 0 || g.b === 0).map(g => g.md), teams: stageTeams(1).length, cp: C.story.cp, label: roundLabel(b) }; });
      if (st.at === 'C3.6' && st.screen === 'gym' && !out.chai) out.chai = await p.evaluate(() => M.mini && M.mini.word);
      if (st.at === 'C3.10' && st.screen === 'play' && !out.dunks) out.dunks = await p.evaluate(() => {
        const me = M.players.find(q => q.human === 0), h = hoops[1], s0 = M.teams[0].score;
        ball.shot = { hoop: h, pts: 2, dunk: false, shooter: me, team: 0 }; onScore(h); const jumper = M.teams[0].score - s0;
        ball.shot = { hoop: h, pts: 2, dunk: true, shooter: me, team: 0 }; onScore(h); const dunk = M.teams[0].score - s0;
        return { jumper, dunk, n: M.story.dunks.n, crowd: M.story.dunks.crowd };
      });
      if (st.at === 'C3.11' && st.screen === 'gym' && !out.fund) out.fund = await p.evaluate(() => ({ A: C.story.allstar, log: (C.story.fundLog || []).slice(-1)[0] }));
      if (st.at === 'C3.15' && !out.hurt) out.hurt = await p.evaluate(() => ({ injured: C.story.injured, partner: C.partner }));
      if (st.at === 'C3.19' && !out.back) out.back = await p.evaluate(() => ({ injured: C.story.injured, partner: C.partner }));
      if (st.screen !== 'play' || n % 3 === 0) { const d = await draw(p); if (d !== true) out.draws.push(st.at + ' ' + st.screen + ': ' + d); }
      const r = await p.evaluate(lose => window.__sStep({ lose: at => (at === 'C3.19' && lose) || at === 'C3.6', pick: at => at === 'C3.2' ? 'musa' : null }), !lostSemi);
      if (st.at === 'C3.19' && r === 'lost') lostSemi = true;
      steps.push(st.at + ':' + r);
    }
    out.afterLoss = steps.some(x => x.startsWith('C3.NS'));
    out.end = await p.evaluate(() => ({ s: window.__sState(), journal: (C.journal || []).map(e => e.id).filter(Boolean), fund: C.story.fund, bleachers: C.up.bleachers, trophy: C.trophies.includes(1), att: C.story.att, ch: storyChapter() }));
    // out of the top four: lose every league game, C3.18 says so, the next season goes back to C3.2
    out.miss = await p.evaluate(() => { window.__sNew('Miss'); window.__sRun('C3.1', { max: 600 }); const L = { lose: at => /^C3\.(3|5|7|8|12|13|15|17)$/.test(at) }; window.__sRun('C3.17', L); const r = window.__sRun('C3.2', L); return { path: r, at: C.story.at, att: C.story.att, injured: C.story.injured }; });
    await ctx.close();
    const ids = ['C3.1', 'C3.2', 'C3.3', 'C3.4', 'C3.5', 'C3.6', 'C3.7', 'C3.8', 'C3.9', 'C3.10', 'C3.11', 'C3.12', 'C3.13', 'C3.14', 'C3.15', 'C3.16', 'C3.17', 'C3.18', 'C3.19', 'C3.20', 'C3.21', 'C3.22', 'C3.23', 'C3.NS'];
    const E = out.end, T0 = out.table || {}, D = out.dunks || {}, F = out.fund || {}, H = out.hurt || {}, B = out.back || {};
    const ok = out.toC3 === 'C3.1' && T0.table && T0.n === 36 && T0.ours.join() === '0,1,2,3,4,5,6,7' && T0.teams === 9 && T0.cp === 'C3.2' && T0.label === 'League game 1'
      && out.chai === 'CHAI' && D.jumper === 0 && D.dunk === 2 && D.n === 1 && F.A && F.A.paid && F.log && F.log[0] === 'All-star game'
      && H.injured && H.partner !== H.injured && B.injured === null && B.partner === H.injured
      && lostSemi && out.afterLoss && ids.every(id => E.s.seen.includes(id) && E.journal.includes(id))
      && E.s.at === 'C4.1' && E.s.screen === 'hub' && E.bleachers >= 1 && E.trophy && E.att >= 1 && E.ch === 4
      && out.miss.path.includes('C3.18') && out.miss.path.includes('C3.NS') && out.miss.at === 'C3.2' && out.miss.injured === null && !out.draws.length && !errs.length;
    return { ok, detail: ['table: ' + JSON.stringify(T0), 'chai: ' + out.chai, 'dunks: ' + JSON.stringify(D), 'fund: ' + JSON.stringify(F), 'hurt: ' + JSON.stringify(H) + ' back: ' + JSON.stringify(B), steps.join(' '), 'end: ' + JSON.stringify(E), 'missed the top four: ' + JSON.stringify(out.miss), ...out.draws, ...errs] };
  };

  T['story-ch4'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-ch4');
    await prep(p);
    const out = { draws: [] };
    out.toC4 = await p.evaluate(() => { window.__sNew('Bilal'); window.__sRun('C4.1', { max: 900 }); return C.story.at; });
    const steps = [];
    let lostQF = false;
    for (let n = 0; n < 200; n++) {
      const st = await p.evaluate(() => window.__sState());
      if (st.at === 'C5.1' && st.screen === 'hub') break;
      if (st.at === 'C4.2' && st.screen === 'story' && !out.ko) out.ko = await p.evaluate(() => { const b = C.bracket; return { ko: b.ko, first: b.rounds[0].length, teams: stageTeams(2).length, label: roundLabel(b), cp: C.story.cp, rivalOther: b.rounds[0].findIndex(m => m.a === 1 || m.b === 1) >= 4 }; });
      if (st.at === 'C4.4' && st.screen === 'story' && !out.qf) out.qf = await p.evaluate(() => roundLabel(C.bracket));
      if (st.screen !== 'play' || n % 3 === 0) { const d = await draw(p); if (d !== true) out.draws.push(st.at + ' ' + st.screen + ': ' + d); }
      const r = await p.evaluate(lose => window.__sStep({ lose: at => at === 'C4.4' && lose }), !lostQF);
      if (st.at === 'C4.4' && r === 'lost') lostQF = true;
      steps.push(st.at + ':' + r);
    }
    out.afterLoss = steps.some(x => x.startsWith('C4.NS'));
    out.end = await p.evaluate(() => {
      Game.screen = 'masjid'; Game.masjidView = 'ext'; let ext = true; try { drawExterior(ctx, C.up, 1); } catch (e) { ext = String(e); }
      careerHub();
      return { s: window.__sState(), journal: (C.journal || []).map(e => e.id).filter(Boolean), hb: C.hb, fund: C.story.fund, wing: C.story.wing, trophy: C.trophies.includes(2), ch: storyChapter(), ext,
        peace: JSON.stringify((C.journal || []).filter(e => e.id === 'C4.9').map(e => e.lines)).includes('Good game, son') };
    });
    await ctx.close();
    const ids = ['C4.1', 'C4.2', 'C4.3', 'C4.4', 'C4.5', 'C4.6', 'C4.7', 'C4.8', 'C4.9', 'C4.10', 'C4.NS'], E = out.end, K = out.ko || {};
    const ok = out.toC4 === 'C4.1' && K.ko && K.first === 8 && K.teams === 16 && K.label === 'Round of 16' && K.cp === 'C4.1' && K.rivalOther && out.qf === 'Quarterfinal'
      && lostQF && out.afterLoss && ids.every(id => E.s.seen.includes(id) && E.journal.includes(id))
      && E.s.at === 'C5.1' && E.s.screen === 'hub' && Number.isFinite(E.hb) && E.wing && E.fund >= 100000 && E.trophy && E.ch === 5 && E.ext === true && E.peace && !out.draws.length && !errs.length;
    return { ok, detail: ['ko: ' + JSON.stringify(K) + ' qf: ' + out.qf, steps.join(' '), 'end: ' + JSON.stringify(Object.assign({}, E, { journal: E.journal.slice(-14) })), ...out.draws, ...errs] };
  };

  T['story-ch5'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-ch5');
    await prep(p);
    const out = { draws: [], draw: [] };
    out.toC5 = await p.evaluate(() => { window.__sNew('Idris'); window.__sRun('C5.1', { max: 1100 }); return C.story.at; });
    const steps = [];
    let lostSF = false, kotc = 0;
    for (let n = 0; n < 200; n++) {
      const st = await p.evaluate(() => window.__sState());
      if (st.at === 'P.1' && st.screen === 'hub') break;
      if (st.at === 'C5.2' && st.screen === 'play' && !out.caps) out.caps = await p.evaluate(() => KOTC.roster.map(id => castPlayer(id).name));
      if (st.at === 'C5.4' && st.screen === 'story') { const d = await p.evaluate(() => ({ draw: C.story.draw, ko: C.bracket && C.bracket.ko, first: C.bracket.rounds[0].length, opp: storyOpp().id, label: roundLabel(C.bracket) })); if (!out.draw.length || out.draw[out.draw.length - 1].draw !== d.draw) out.draw.push(d); }
      if (st.screen === 'scredits' && !out.credits) out.credits = await p.evaluate(() => { Game.credits.t = 20; return true; });
      if (st.screen !== 'play' || n % 3 === 0) { const d = await draw(p); if (d !== true) out.draws.push(st.at + ' ' + st.screen + ': ' + d); }
      const r = await p.evaluate(([lose, k]) => window.__sStep({ lose: at => (at === 'C5.6' && lose) || (at === 'C5.2' && k === 0) }), [!lostSF, kotc]);
      if (st.at === 'C5.2' && (r === 'won' || r === 'lost')) kotc++;
      if (st.at === 'C5.6' && r === 'lost') lostSF = true;
      if (st.screen === 'scredits' && r.startsWith('stuck')) { await p.evaluate(() => creditsDone()); steps.push('credits'); continue; }
      steps.push(st.at + ':' + r);
    }
    out.afterLoss = steps.some(x => x.startsWith('C5.NS'));
    out.end = await p.evaluate(() => { const r = { s: window.__sState(), journal: (C.journal || []).map(e => e.id).filter(Boolean), done: C.story.done, hb: C.hb, bp: C.bp, trophy: C.trophies.includes(3), dome: C.up.dome, label: storyContinueLabel() }; storyRun(); r.after = { screen: Game.screen, at: C.story.at }; return r; });
    await ctx.close();
    const ids = ['C5.1', 'C5.2', 'C5.3', 'C5.4', 'C5.5', 'C5.6', 'C5.7', 'C5.8', 'C5.9', 'C5.10', 'C5.11', 'C5.NS'], E = out.end, D = out.draw;
    const ok = out.toC5 === 'C5.1' && out.caps && out.caps.length === 4 && D.length >= 2 && D[0].draw === 1 && D[1].draw === 3 && D.every(d => d.ko && d.first === 4 && d.label === 'Quarterfinal') && D[0].opp !== D[1].opp
      && lostSF && out.afterLoss && out.credits && ids.every(id => E.s.seen.includes(id) && E.journal.includes(id))
      && E.s.at === 'P.1' && E.s.screen === 'hub' && Number.isFinite(E.hb) && Number.isFinite(E.bp) && E.done && E.trophy && E.dome >= 1 && E.label === 'Continue' && E.after.screen === 'gym' && !out.draws.length && !errs.length;
    return { ok, detail: ['captains: ' + JSON.stringify(out.caps), 'draws: ' + JSON.stringify(D), steps.join(' '), 'end: ' + JSON.stringify(Object.assign({}, E, { journal: E.journal.slice(-14) })), ...out.draws, ...errs] };
  };

  T['story-post'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-post');
    await prep(p);
    const out = { draws: [] };
    out.toP = await p.evaluate(() => { window.__sNew('Sami'); window.__sRun('P.1', { max: 1400 }); return C.story.at; });
    // P.1, then replays: the masjid league won again, Nationals lost, the all-star game, CHAI
    out.replays = await p.evaluate(() => {
      const r = {};
      r.p1 = window.__sRun('P.R', { max: 20 });
      const one = (choice, lose, until = 'P.R') => { window.__sStep({ replay: choice }); const path = window.__sRun('__never', { max: 120, replay: 6, lose }); return path; };
      storyRun(); r.screen = Game.screen;
      r.local = (() => { replaySelect(0); const path = []; for (let n = 0; n < 200 && !(C.story.at === 'P.R' && Game.screen === 'hub'); n++) { if (!path.length || path[path.length - 1] !== C.story.at) path.push(C.story.at); window.__sStep({}); } return { path, rt: (C.story.rt || [])[0], replays: C.story.replays, season: C.season }; })();
      storyRun(); replaySelect(2);
      r.nat = (() => { const path = []; for (let n = 0; n < 200 && !(C.story.at === 'P.R' && Game.screen === 'hub'); n++) { if (!path.length || path[path.length - 1] !== C.story.at) path.push(C.story.at); window.__sStep({ lose: at => at === 'PR.g' }); } return { path }; })();
      storyRun(); replaySelect(4); for (let n = 0; n < 30 && !(C.story.at === 'P.R' && Game.screen === 'hub'); n++) window.__sStep({}); r.allstar = { at: C.story.at, best: C.story.allstarBest };
      storyRun(); replaySelect(5); for (let n = 0; n < 30 && !(C.story.at === 'P.R' && Game.screen === 'hub'); n++) window.__sStep({}); r.chai = { at: C.story.at, won: !!C.story.chaiWon };
      return r;
    });
    // every milestone (the conditions set directly), each with its moment, then P.4 and every prize used
    out.ms = await p.evaluate(() => {
      for (const id of STORY_MATES) C.chem[id] = 100;
      for (const [k] of STAT_ROWS) C.lv[k] = 10;
      C.gamesPlayed = 60; C.rival.w = 6; C.story.allstarBest = 6; C.story.chaiWon = true; C.story.fund = 160000;
      careerHub();
      const r = { count: msCount(), queued: (C.story.mq || []).length, moments: [] };
      for (let n = 0; n < 40 && (C.story.mq || []).length; n++) { const id = C.story.mq[0]; storyRun(); if (!Gym.story) break; window.__sStep({}); r.moments.push(id); }
      r.full = !!C.story.full; r.mseen = Object.keys(C.story.mseen || {}).length;
      r.journal = (C.journal || []).filter(e => /^M\.|^P\.4/.test(e.id || '')).length;
      // the prizes, used: the urn, the photos and the golden ball in the gym, the mural outside
      enterGym(); const me = M.players[0], used = {};
      for (const id of ['urn', 'photos', 'gold']) { const pr = GYM_PROPS.find(x => x.id === id); place(me, pr.x, 70); const near = gymPropNear(); used[id] = !!near && near.id === id && pr.need(); if (near) { useGymProp(near); me.turbo = 0; for (let i = 0; i < 240 && Gym.prop; i++) gymUpdate(1 / 60); } if (id === 'urn') used.turbo = me.turbo; }
      used.mural = extSpots().some(s => s.id === 'mural');
      r.used = used; r.prizes = STORY_PRIZES.map(x => storyPrize(x.id)); r.econ = econSelfCheck();
      openMilestones(); r.smiles = Game.screen; msWatch(0); r.watch = !!Gym.story; window.__sStep({}); r.back = Game.screen;
      return r;
    });
    const shots = ['hub', 'smiles', 'sreplay'];
    for (const sc of shots) { await p.evaluate(sc => { if (sc === 'hub') careerHub(); else if (sc === 'smiles') openMilestones(); else openReplay(); }, sc); const d = await draw(p); if (d !== true) out.draws.push(sc + ': ' + d); }
    await p.evaluate(() => { careerHub(); Game.screen = 'masjid'; Game.masjidView = 'ext'; }); { const d = await draw(p); if (d !== true) out.draws.push('ext: ' + d); }
    await ctx.close();
    const R = out.replays, MS_ = out.ms;
    const ok = out.toP === 'P.1' && R.screen === 'sreplay' && R.local.rt === 1 && R.local.path.includes('PR.t') && R.local.replays === 1 && R.nat.path.includes('PR.e')
      && R.allstar.at === 'P.R' && R.allstar.best >= 0 && R.chai.at === 'P.R'
      && MS_.count === 21 && MS_.moments.length >= 2 && MS_.moments[MS_.moments.length - 1] === 'P.4' && MS_.full && MS_.mseen === 22 && MS_.journal >= 22
      && MS_.used.urn && MS_.used.photos && MS_.used.gold && MS_.used.mural && MS_.used.turbo >= 50 && MS_.prizes.every(Boolean) && MS_.econ.length === 0
      && MS_.smiles === 'smiles' && MS_.watch && MS_.back === 'smiles' && !out.draws.length && !errs.length;
    return { ok, detail: ['replays: ' + JSON.stringify(R), 'milestones: ' + JSON.stringify(MS_), ...out.draws, ...errs] };
  };

  T['story-reload'] = async ({ browser, base }) => {
    const errs = [], ctx = await newContext(browser), p = await open(ctx, base + '/', errs, 'story-reload');
    const want = { 'C0.1': 'ssalams', 'C0.2': 'musalla', 'C0.3': 'gym', 'C0.4': 'gym', 'C0.5': 'play', 'C0.6': 'gym',
      'C1.1': 'gym', 'C1.2': 'gym', 'C1.5': 'musalla', 'C1.6': 'story', 'C1.7': 'office', 'C1.8': 'story', 'C1.9': 'gym',
      'C2.1': 'gym', 'C2.2': 'gym', 'C2.3': 'story', 'C2.4': 'gym', 'C2.5': 'spick', 'C2.6': 'story', 'C2.9': 'gym', 'C2.10': 'story',
      'C3.1': 'gym', 'C3.2': 'gym', 'C3.4': 'gym', 'C3.6': 'story', 'C3.9': 'office', 'C3.10': 'story', 'C3.14': 'story', 'C3.20': 'office' }, ids = Object.keys(want), res = [];
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
