// ================================================= v8.4: STORY THREADS
// * Niyyah: before a career game Sh. Saleem asks what your intention is today (three to pick from,
//   or just play). After the game he reflects on it. Keeping it pays Halal Bucks for the masjid,
//   counts toward the Sabr badge and opens the next lesson in his office (a mentorship arc of eight).
// * Rival: after a game against Al-Burhan, Jalal says his piece and you choose whether to answer him
//   on the court. Answer, and beating them three times earns Big Stage and ends the feud well.
// * Partner: as chemistry grows with your partner, each of them opens up (three scenes each).
// * End of season: a small ceremony at the masjid with awards drawn from your season.
// * New lines: people in the musalla have something new to say after things happen ("!").
const NIYYAH = [
  { id: 'clean', label: 'Play clean. No shoves, and help people up.', say: 'play clean', kept: (me, s) => !me.shoves },
  { id: 'pass', label: 'Make the extra pass. Get my brothers involved.', say: 'make the extra pass', kept: (me, s) => (s.ast || 0) >= 3 },
  { id: 'defend', label: 'Defend every possession like it matters.', say: 'defend every possession', kept: (me, s) => CGame.stops >= 3 || (s.stl || 0) >= 2 },
  { id: 'glass', label: 'Fight for every rebound.', say: 'fight for every rebound', kept: (me, s) => (s.reb || 0) >= 5 },
  { id: 'line', label: 'Knock down my free throws when it counts.', say: 'knock down your free throws', kept: (me, s) => (s.ftm || 0) >= 2 && (s.ftm || 0) >= (s.fta || 0) * 0.6 }
];
// Lessons with Sh. Saleem, one opened by each intention you keep. Each is a short talk in his office
// with two questions to ask.
const LESSONS = [
  { open: ['You kept your intention. Let me tell you why I keep asking about it.', 'The first hadith in Sahih al-Bukhari: “Actions are only by intentions, and everyone gets what they intended.”'],
    choices: [['Even a game of basketball?', ['Even this. The same layup can be showing off, or it can be play that keeps you strong and brings brothers together.', 'The intention is what turns an ordinary thing into worship.']],
      ['What if my intention slips during the game?', ['Then renew it. Nobody holds an intention perfectly for forty minutes.', 'Notice it, say astaghfirullah, and get back on defense.']]] },
  { open: ['Lesson two. When Jibril asked the Prophet ﷺ about ihsan, he said: “To worship Allah as if you see Him, and if you don’t see Him, He sees you.” (Sahih Muslim)', 'Think about what that means for an empty gym at 7am.'],
    choices: [['So practice counts when no one is watching?', ['Especially then. Doing your best when nobody claps is the purest kind of effort.', 'Ihsan is excellence for Allah, not for the crowd.']],
      ['That sounds like a lot of pressure.', ['It’s the opposite. You only have one audience to please, and He is the Most Merciful.', 'Do your best and leave the rest to Him.']]] },
  { open: ['Lesson three. The Prophet ﷺ said: “The strong one is not the one who overpowers others. The strong one is the one who controls himself when angry.” (Bukhari, Muslim)'],
    choices: [['What about when someone shoves me first?', ['Then you get to show real strength. Walk away, let the referee do his job.', 'If anger comes, the Prophet ﷺ taught us to seek refuge in Allah, and to sit down if you’re standing.']],
      ['Is it wrong to play with fire?', ['Play hard, yes. Fire in your legs is fine. Fire in your mouth and your hands is where it goes wrong.', 'Compete like a lion, carry yourself like a believer.']]] },
  { open: ['Lesson four. Allah says: “If you are grateful, I will surely give you more.” (Ibrahim 14:7)', 'Gratitude is not just for wins.'],
    choices: [['How can I be grateful after a loss?', ['Your legs carried you up and down the court. Your brothers were next to you. You prayed with them after.', 'Count those. A loss doesn’t take them away.']],
      ['What does gratitude look like on the court?', ['Thanking the brother who set the screen. Saying alhamdulillah after a make, and after a miss.', 'Stacking the chairs when the game is over.']]] },
  { open: ['Lesson five. “None of you truly believes until he loves for his brother what he loves for himself.” (Bukhari, Muslim)'],
    choices: [['Even for the other team?', ['Yes. You want them to play well, stay healthy, and go home happy. And you still want to win.', 'Both can be true at once.']],
      ['How does that change the way I play?', ['You stop hunting your own shot when your brother is open.', 'And you celebrate his bucket like it was yours.']]] },
  { open: ['Lesson six. The Prophet ﷺ said: “Your smile in the face of your brother is charity.” (At-Tirmidhi)'],
    choices: [['Smiling during a close game?', ['A quick smile at a teammate after a mistake can save the next five possessions.', 'Nobody plays well when they’re afraid of being blamed.']],
      ['That’s it? Just smiling?', ['Small deeds, done often, add up. Sadaqah doesn’t have to cost money.', 'You have a few hundred chances a game.']]] },
  { open: ['Lesson seven. Allah says: “Seek help through patience and prayer.” (Al-Baqarah 2:45)', 'Patience and prayer. He put them together.'],
    choices: [['Why patience and prayer together?', ['Patience holds you steady, prayer reconnects you. One without the other runs out.', 'That’s why we stop for salah even in the middle of a good practice.']],
      ['What is patience during a game?', ['Running your offense when you’re down ten, not taking a crazy shot.', 'Sabr isn’t waiting around. It’s doing the right thing again and again without complaining.']]] },
  { open: ['Our last lesson for now. Allah says: “Indeed, Allah loves those who act justly.” (Al-Hujurat 49:9)', 'You’ve kept eight intentions. I’m proud of you.'],
    choices: [['How do I act justly in a pickup game?', ['Call your own fouls. Admit when the ball went off you. Give the other team the benefit of the doubt.', 'Pickup basketball is a test of honesty with no referee.']],
      ['What comes after the lessons?', ['Now you teach them. One day a young brother will walk into this gym, nervous.', 'Be for him what we tried to be for you.']]] }
];
LESSONS.forEach((L, i) => SHEIKH_TALKS.push({ key: 'lesson' + i, when: () => (C.lessons || 0) > i, ep: () => 'done', open: () => L.open, choices: L.choices }));
// ---- niyyah before a game
function pickNiyyah() {
  const R = seededRng((C.seed || 1) + (C.gamesPlayed || 0) * 131), pool = NIYYAH.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
function openNiyyah(go) {
  const opts = pickNiyyah(), first = !(C.niyyahAsked);
  const lines = [['saleem', first ? 'Before you walk out there. Every game, I ask the brothers one thing: what is your intention today?' : pick(['Bismillah. What is your intention today?', 'Before we go out: what’s the intention?', 'Same question as always. What do you intend today?'])],
    ['choice', [['Just let me play today.', [['saleem', 'Alright. Play well, and play with adab.']]], ...opts.map(o => [o.label, [['saleem', pick(['May Allah make it easy. Go.', 'Good. Hold onto that. Bismillah.', 'In sha Allah. I’ll be watching for it.'])]]])]]];
  C.niyyahAsked = true; C.niyyah = null;
  Game.replaying = true;                     // the pre-game question doesn't need a journal entry every game
  playStory(lines, go, 'Before the game');
  Game.replaying = false;
  Game.story.onChoice = k => { C.niyyah = k > 0 ? opts[k - 1].id : null; };
}
{
  const _scm = startCareerMatch;
  startCareerMatch = function () {
    if (Game.screen === 'pregame' && C && !C.inBarakah) { openNiyyah(() => _scm.call(this)); return; }
    return _scm.apply(this, arguments);
  };
}
// ---- after the game: reflection, rival and partner scenes go in front of the usual post-game story
function niyyahReflect(me, s) {
  const n = NIYYAH.find(x => x.id === C.niyyah); C.niyyah = null;
  if (!n) return [];
  const kept = !!n.kept(me, s);
  if (!kept) return [['saleem', 'You meant to ' + n.say + ' today. It didn’t quite happen, and that’s alright.'], ['saleem', 'The Prophet ﷺ taught that whoever intends a good deed and doesn’t do it, Allah still writes it as a good deed. Renew it next game.']];
  const hb = 8 + 4 * stageOf(), before = C.lessons || 0;
  C.hb += hb; C.niyyahKept = (C.niyyahKept || 0) + 1; C.lessons = Math.min(LESSONS.length, before + 1);
  badgeAdd('sabr');
  setTimeout(() => toast('✓ Intention kept: ' + n.say + '   +' + hb + ' HB for the masjid', 3.5), 400);
  const L = [['saleem', 'You said you would ' + n.say + '. And you did. That’s the win nobody writes on the scoreboard.']];
  if (C.lessons > before) L.push(['saleem', before === 0 ? 'Come by my office when you have a minute. There’s something I want to teach you.' : 'Come see me in the office. I have the next lesson ready.']);
  return L;
}
const PARTNER_STORY = {
  saleem: [[['saleem', 'You know, I played point guard at university. Before the beard went grey.'], ['you', 'Wait, really?'], ['saleem', 'Really. I passed, I prayed, I passed again. Not much has changed.']],
    [['saleem', 'I can read where you’re going now, before you cut. That is trust.'], ['saleem', 'On the court and off it, brothers who trust each other carry each other.']],
    [['saleem', 'Full chemistry, masha’Allah. I think Allah put us on the same team for a reason.'], ['you', 'To win?'], ['saleem', 'To grow. The wins are a gift on top.']]],
  nasser: [[['nasser', 'You’re not as slow as I said.'], ['you', 'Thanks?'], ['nasser', 'That’s a compliment. Take it. I don’t give many.']],
    [['nasser', 'I was hard on you in 1v1 because nobody pushed me when I was young.'], ['nasser', 'My dad worked nights. This gym was my second home. Uncle Mahmoud kept the key under the mat.']],
    [['nasser', 'When you go up, I know where the ball is coming out. Every time.'], ['nasser', 'You’re my brother now. Don’t make it weird.']]],
  khalil: [[['khalil', 'Bro, our handshake needs work. I have a draft. It has eleven steps.'], ['you', 'Eleven?'], ['khalil', 'Twelve if we count the du’a.']],
    [['khalil', 'Real talk. I almost stopped coming to the masjid last year.'], ['khalil', 'Then this team started. Now I come for Isha too. Don’t tell anyone. Actually, tell everyone.']],
    [['khalil', 'Full chemistry! The handshake is finished.'], ['khalil', 'Twelve steps, bro. The last one is helping the other team up.']]],
  tariq: [[['tariq', 'Your numbers with me on the floor are up eleven percent.'], ['you', 'Is that good?'], ['tariq', 'It is statistically delightful.']],
    [['tariq', 'I started keeping stats because I wasn’t sure I was good enough to play.'], ['tariq', 'You passed to me anyway. That changed my spreadsheet. And me.']],
    [['tariq', 'Full chemistry. I made a chart.'], ['tariq', 'It’s just a heart. Please don’t show the others.']]]
};
const PARTNER_AT = [34, 67, 100];
function partnerBeat() {
  const id = C.partner || 'saleem', S = PARTNER_STORY[id]; if (!S) return [];
  const seen = C.pStory || (C.pStory = {}), n = seen[id] || 0, chem = chemOf(id);
  if (n >= S.length || chem < PARTNER_AT[n]) return [];
  seen[id] = n + 1; return S[n].map(l => l.slice());
}
function rivalBeat(opp, won) {
  const G = cg();
  if (opp === 1 && !G.rivalArc && (C.rivalAsks || 0) < 3) {
    C.rivalAsks = (C.rivalAsks || 0) + 1;
    return { lines: [won ? ['jalal', 'Lucky. Do that three more times and I’ll believe it.'] : ['jalal', 'Like I said. Al-Amanah is a nice youth group.'],
      ['choice', [['Let it go. It’s not worth it.', [['saleem', 'That’s wise too. They’ll be there next time if you change your mind.']]],
        ['I’ll answer him on the court.', [['saleem', 'Then answer with your game, not your mouth. Beat Al-Burhan three times, with adab, and see what changes.']]]]]], arc: true };
  }
  if (G.rivalArc && hasBadge('bigstage') && !C.rivalDone) {
    C.rivalDone = true;
    return { lines: [['jalal', 'Three times. Alright. I was wrong about you.'], ['jalal', 'My uncle says your sheikh visits the hospital every Thursday. Is that true?'], ['saleem', 'Every Thursday. You’re welcome to come with us.'], ['jalal', '...Maybe I will. Good games, Al-Amanah.']] };
  }
  return null;
}
{
  const _cam = careerAfterMatch;
  careerAfterMatch = function () {
    const me = M.players.find(p => p.human === 0), s = me ? me.stats : {}, won = M.winner === 0, opp = M.careerOpp;
    const ref = me && C ? niyyahReflect(me, s) : [];
    const r = _cam.apply(this, arguments);
    if (!C || !Game.post || !Array.isArray(Game.post.lines)) return r;
    const rv = rivalBeat(opp, won), pb = partnerBeat(), pre = [...ref, ...(rv ? rv.lines : []), ...pb];
    if (pre.length) { Game.post.lines = [...pre, ...Game.post.lines]; if (rv && rv.arc) Game.post.rivalChoice = true; }
    saveCareer();
    return r;
  };
  const _pc = postgameContinue;
  postgameContinue = function () {
    const p = Game.post, r = _pc.apply(this, arguments);
    if (p && p.rivalChoice && Game.story) Game.story.onChoice = k => { if (k === 1) { cg().rivalArc = true; saveCareer(); toast('Storyline: answer Jalal on the court. Beat Al-Burhan 3 times', 4); } };
    return r;
  };
}
// ---- end of season: a small ceremony
function seasonAwards() {
  const sn = C.season || 1, games = (C.games || []).filter(g => g.s === sn), n = games.length; if (!n) return null;
  const myName = playerDef().name, pid = C.partner || 'saleem', pName = castDef(pid).name;
  const tot = { me: { pts: 0, ast: 0, stl: 0, reb: 0, pf: 0 }, p: { pts: 0, ast: 0, stl: 0, reb: 0 } };
  for (const g of games) for (const row of g.a || []) { const k = row.n === myName ? 'me' : 'p'; for (const f in tot[k]) tot[k][f] += row[f] || 0; }
  const w = games.filter(g => g.w).length, A = [];
  const mvp = tot.me.pts >= tot.p.pts ? 'you' : pid;
  A.push(['saleem', 'Team MVP this season: ' + (mvp === 'you' ? myName : pName) + '. ' + Math.round((mvp === 'you' ? tot.me.pts : tot.p.pts) / n * 10) / 10 + ' points a game.']);
  const hust = (tot.me.stl + tot.me.reb) >= (tot.p.stl + tot.p.reb) ? 'you' : pid;
  A.push(['mahmoud', 'The Hustle Award, for the most steals and rebounds, goes to ' + (hust === 'you' ? myName : pName) + '! Made of real plastic!']);
  if (tot.me.pf / n <= 2.5) A.push(['rafiq', 'The Adab Award goes to ' + myName + '. Barely a foul all season. That’s how a believer competes.']);
  if ((C.niyyahKept || 0) >= 3) A.push(['saleem', 'And a special one from me: the Niyyah Award. ' + C.niyyahKept + ' intentions kept. That’s the one I care about most.']);
  A.push(['tariq', 'For the record: ' + w + ' wins, ' + (n - w) + ' losses. I made a spreadsheet of everyone’s favorite moments. It has forty tabs.']);
  const hb = 20 + A.length * 10;
  return { lines: [['saleem', 'Before the new season, the masjid always holds a little ceremony. Uncle Mahmoud insisted on trophies.'], ...A, ['saleem', 'The families also collected a gift for the masjid fund: ' + hb + ' Halal Bucks. Alhamdulillah for this season.']], hb };
}
{
  const _ch = careerHub;
  careerHub = function () {
    const sn = (C && C.season) || 1, seen = C && (C.awardsSeen || (C.awardsSeen = {}));
    if (C && (C.done || C.seasonOver) && !seen[sn]) {
      seen[sn] = true; const aw = seasonAwards();
      if (aw) { C.hb += aw.hb; saveCareer(); playStory(aw.lines, () => careerHub(), 'Season ' + sn + ' awards'); return; }
    }
    return _ch.apply(this, arguments);
  };
}
// ---- new lines in the musalla ("!" over whoever has one)
const NEWS = {
  khalil: [{ key: 'firstWin', topic: 'Our first win!', when: () => C.wins >= 1, lines: () => ['Bro. BRO. Our first win!', 'I asked Uncle Siddiq if we could frame the score sheet. He said no. I’m doing it anyway.'] },
    { key: 'rival', topic: 'About Jalal...', when: () => cg().rivalArc, lines: () => ['So we’re really answering Jalal on the court? Good.', 'I’ve been practicing my after-game handshake. Firm, but humble.'] },
    { key: 'badge', topic: 'That new badge', when: () => BADGES.some(b => hasBadge(b.id)), lines: () => ['I saw the badge on your card. Lowkey jealous.', 'Teach me the footwork later. For the masjid. Obviously.'] }],
  mahmoud: [{ key: 'project', topic: 'The masjid looks different', when: () => masjidLevel() >= 1, lines: () => ['You see what the brothers built? In 1987 we had one fan, and it only blew on the left side.', 'Families stay after Isha now. That is the real trophy, beta.'] },
    { key: 'ten', topic: 'Ten games already!', when: () => (C.gamesPlayed || 0) >= 10, lines: () => ['Ten games! In my day, my knees retired after ten games.', 'Stretch, beta. Stretch like your uncle never did.'] }],
  rafiq: [{ key: 'skips', topic: 'About the adhan', when: () => (C.adhanSkips || 0) >= 1, lines: () => ['I noticed you stayed on the court when the adhan was called. I’m not angry.', 'Next time, put the ball down and walk in with me. The rim will wait. It’s very patient.'] },
    { key: 'kept', topic: 'Sh. Saleem told me something', when: () => (C.niyyahKept || 0) >= 3, lines: () => ['Sh. Saleem says you keep your intentions before games. Masha’Allah.', 'Most people never think about why they play. You do. Keep that.'] }],
  saleem: [{ key: 'mentor', topic: 'The lessons', when: () => (C.lessons || 0) >= 1, lines: () => ['I’m glad you come to the office. Most young brothers only come when they’re in trouble.', 'Keep your intentions, and the lessons will keep coming.'] },
    { key: 'season2', topic: 'A new season', when: () => (C.season || 1) >= 2, lines: () => ['A new season. Same masjid, same intention.', 'Last season is written. This one is a blank page. Fill it well.'] }]
};
function newsFor(id) { const heard = (C && C.heard) || {}; return (NEWS[id] || []).filter(n => !heard[id + ':' + n.key] && n.when()); }
function anyNews() { return C && MUS_CAST.some(id => newsFor(id).length); }
for (const id of MUS_CAST) {
  const T = TALK[id], base = T.options;
  Object.defineProperty(T, 'options', { configurable: true, get() {
    return [...newsFor(id).map(n => ['! ' + n.topic, () => { (C.heard || (C.heard = {}))[id + ':' + n.key] = true; saveCareer(); return n.lines(); }]), ...base];
  } });
}
{
  const _dm = drawMusallaScreen;
  drawMusallaScreen = function (g) {
    _dm.apply(this, arguments);
    const m = Game.mus; if (!m || m.talk) return;
    for (const id of MUS_CAST) {
      if (!newsFor(id).length) continue;
      const S = MUS_SPOTS[id], at = musToScreen(S.u, S.d), top = at.y - (S.pose === 'cross' ? 95 : S.pose === 'chair' ? 120 : 150) * at.s - (m.near === id ? 40 : 12), b = Math.sin(Game.t * 4) * 3;
      g.fillStyle = GOLD; g.beginPath(); g.arc(at.x, top + b, 11, 0, Math.PI * 2); g.fill(); g.strokeStyle = NIGHT; g.lineWidth = 2; g.stroke();
      g.fillStyle = NIGHT; g.font = `15px ${FONT}`; g.textAlign = 'center'; g.fillText('!', at.x, top + b + 5);
    }
  };
}
