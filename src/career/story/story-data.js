// ================================================= v9.22: THE CAREER STORY — cast and scene graph
// The career is a chaptered story (docs/career-overhaul/SCENES.md, mapped in MAP.md): a new brother finds a community at
// Masjid Al-Amanah, makes the team and plays from the masjid league to the Ummah Cup while the masjid raises money for
// a school wing. Every scene has an ID (C2.10); saves, tests and the Journal use the IDs.
//
// A scene: { id, ch, kind: 'scene' | 'walk' | 'drill' | 'play' | 'choice', name, lines, next, ... }
//   lines     [speaker, text] (speaker: a CAST id, 'you', or 'narr' for narration with no one speaking)
//   next      the next scene's ID, or a function of the outcome; play scenes have win / loss (and out) instead
//   hub       stop at the hub after this scene (otherwise the next scene starts straight away)
//   checkpoint  a tournament starts here: a run-ending loss comes back to it (story-runner.js)

// ---------------------------------------------------------------- the cast
// Looks for the new characters (drawn like every player: kufi or hair, beard, thobe). The old career regulars stay in
// CAST only because the mini games outside career use them; they are not in the story.
// Stats are the Local-stage values; storyMateStats() adds to them for later stages. Each teammate is in the top two of the
// seven in both of his standout stats (a test checks it).
const STORY_MATES = ['saleem', 'jamil', 'ilyas', 'karim', 'anas', 'dawud', 'musa'];
const MATE_STANDOUT = { saleem: ['pas', 'clu'], jamil: ['def', 'hus'], ilyas: ['spd', 'stl'], karim: ['sht', 'clu'], anas: ['dnk', 'def'], dawud: ['pas', 'sta'], musa: ['spd', 'dnk'] };
const MATE_ROLE = { saleem: 'Floor general', jamil: 'Enforcer', ilyas: 'Quick guard', karim: 'Shooter', anas: 'Big man', dawud: 'Old-head playmaker', musa: 'High-flyer' };
const MATE_ARCH = { saleem: 'playmaker', jamil: 'lockdown', ilyas: 'playmaker', karim: 'sharpshooter', anas: 'rimrunner', dawud: 'playmaker', musa: 'rimrunner' };
const MATE_STATS = {                 // Local-stage values (about the old Sh. Saleem's strength); later stages add 0, 0, 1, 2
  saleem: { spd: 5, sht: 7, dnk: 4, def: 6, stl: 5, sta: 5, pas: 9, hus: 5, clu: 9 },
  jamil: { spd: 5, sht: 5, dnk: 5, def: 9, stl: 6, sta: 6, pas: 5, hus: 9, clu: 5 },
  ilyas: { spd: 9, sht: 5, dnk: 4, def: 4, stl: 9, sta: 6, pas: 6, hus: 6, clu: 4 },
  karim: { spd: 5, sht: 9, dnk: 3, def: 5, stl: 4, sta: 5, pas: 6, hus: 4, clu: 8 },
  anas: { spd: 4, sht: 4, dnk: 9, def: 8, stl: 3, sta: 5, pas: 4, hus: 5, clu: 4 },
  dawud: { spd: 3, sht: 7, dnk: 2, def: 6, stl: 5, sta: 8, pas: 8, hus: 4, clu: 6 },
  musa: { spd: 8, sht: 4, dnk: 8, def: 5, stl: 5, sta: 7, pas: 4, hus: 6, clu: 4 }
};
Object.assign(CAST, {
  jamil: { name: 'Ammo Jamil', num: 4, skin: '#b07850', hat: 'topi', capColor: '#f7f7f2', hair: '#5a5a5a', thobe: '#9aa7b3', beardStyle: 3, beardLen: 1, vw: 2 },
  ilyas: { name: 'Ilyas', num: 11, skin: '#b98059', hat: 'hair', hair: '#161616', thobe: '#2b3a55', beardStyle: 1, vh: 0 },
  karim: { name: 'Ustath Karim', num: 22, skin: '#e6b894', hat: 'kufi', capColor: '#1c1c1c', hair: '#3b2412', glasses: true, thobe: '#ddd4c2', beardStyle: 2 },
  anas: { name: 'Qari Anas', num: 34, huffath: true, skin: '#6f4630', hat: 'crochet', capColor: '#f7f7f2', hair: '#161616', thobe: '#f7f7f2', beardStyle: 3, vh: 2, vw: 2 },
  dawud: { name: 'Imam Dawud', num: 50, sheikh: true, huffath: true, skin: '#9a6440', hat: 'imama', capColor: '#f7f7f2', hair: '#d8d8d8', elder: true, thobe: '#f4f4ef', beardStyle: 3, beardLen: 2 },
  musa: { name: 'Musa', num: 3, skin: '#f3d2b3', hat: 'hair', hair: '#6b4423', thobe: '#5f7a5a', beardStyle: 1 },
  mufti: { name: 'Mufti Abdullah', num: 60, skin: '#c68a5a', hat: 'imama', capColor: '#1c1c1c', hair: '#8a8a8a', elder: true, thobe: '#232323', beardStyle: 3, beardLen: 2, glasses: true },
  hafiz: { name: 'Hafiz Zubair', num: 30, skin: '#8d5a3b', hat: 'kufi', capColor: '#f7f7f2', hair: '#161616', thobe: '#f7f7f2', beardStyle: 2, huffath: true },
  rayyan: { name: 'Rayyan', num: 12, skin: '#e2b894', hat: 'hair', hair: '#4a2c16', thobe: '#2a2a2a', beardStyle: 1, band: 1 },
  uncle: { name: 'An uncle', num: 70, skin: '#9a6440', hat: 'topi', capColor: '#f7f7f2', hair: '#d8d8d8', elder: true, thobe: '#ddd4c2', beardStyle: 3, beardLen: 2 },   // one of the gym's background faces
  narr: { name: '', skin: '#c68a5a', hat: 'hair', hair: '#161616' }
});
// stage 0 Local, 1 State, 2 National, 3 World: the brothers get better as the story goes on, and keep their order
function storyMateStats(id, stage) {
  const k = [0, 0, 1, 2][clamp(stage | 0, 0, 3)], s = {};
  for (const [st, v] of Object.entries(MATE_STATS[id] || MATE_STATS.saleem)) s[st] = clamp(v + k, 1, 10);
  return s;
}
function storyMateDef(id, stage) {
  return Object.assign({}, CAST[id], { stats: storyMateStats(id, stage), arch: MATE_ARCH[id] });
}
// mini games (Lightning, HORSE, Around the World, King of the Court) build their players with castPlayer: the new cast
// plays with its story stats; everyone else is as before
{
  const _cp = castPlayer;
  castPlayer = function (id) { return MATE_STATS[id] && id !== 'saleem' ? storyMateDef(id, (C && C.stage) || 0) : _cp.apply(this, arguments); };
  Object.assign(MINI_ERR, { jamil: 0.05, ilyas: 0.055, karim: 0.035, anas: 0.06, dawud: 0.04, musa: 0.06 });
}

// ---------------------------------------------------------------- chapters
const CHAPTERS = [
  { n: 0, name: 'Introduction' },
  { n: 1, name: 'Making the team' },
  { n: 2, name: 'Masjid league', stage: 0, cp: 'C2.4' },
  { n: 3, name: 'State league', stage: 1, cp: 'C3.2' },
  { n: 4, name: 'National tournament', stage: 2, cp: 'C4.1' },
  { n: 5, name: 'Ummah Cup', stage: 3, cp: 'C5.1' }
];
const STORY_BUILT = 3;              // the last chapter that can be played in this build (later chapters arrive one release at a time)
const SC = {};
function scn(id, o) { SC[id] = Object.assign({ id, ch: id[0] === 'C' ? +id[1] : 6 }, o); return SC[id]; }
const STORY_FIRST = 'C0.1';

// ---------------------------------------------------------------- Chapter 0: Introduction
scn('C0.1', { kind: 'scene', custom: 'salams', name: 'After Isha', next: 'C0.2',
  lines: [['narr', 'As-salamu alaykum wa rahmatullah.'], ['narr', 'As-salamu alaykum wa rahmatullah.']] });
scn('C0.2', { kind: 'scene', talk: { at: 'musalla', who: 'dawud' }, name: 'The musalla', next: 'C0.3', lines: [
  ['narr', 'Masjid Al-Amanah, Eastside. Your first week in town, your first Isha here.'],
  ['dawud', 'Astaghfirullah, astaghfirullah, astaghfirullah.'],
  ['dawud', 'Brother, I don’t know your face yet. Welcome. You’re new in Eastside?'],
  ['you', 'Wa alaykum as-salam. I moved here last week.'],
  ['dawud', 'Then you found the right door. The young ones play ball in the gym after Isha. Through there, past the shoe racks.'],
  ['you', 'JazakAllahu khayran.'],
  ['dawud', 'Wa iyyak. Go on. Tell Saleem the imam sent you.']] });
scn('C0.3', { kind: 'walk', name: 'The gym', next: 'C0.4', walk: 'C0.3' });
scn('C0.4', { kind: 'drill', name: 'Shoot around', next: 'C0.5', walk: 'C0.4' });
scn('C0.5', { kind: 'play', name: 'Pickup game', mode: 'pickup', stakes: 'opener', win: 'C0.6', loss: 'C0.5',
  winLines: [['saleem', 'Game! Alhamdulillah.'], ['jamil', 'Again. Tomorrow. Same teams.']],
  lossLines: [['jamil', 'Ha! The old man still has it.'], ['saleem', 'Good effort. Get a drink, catch your breath, and we run it back.'], ['ilyas', 'Dad, don’t celebrate yet. One more.']] });
scn('C0.6', { kind: 'scene', name: 'Come back tomorrow', next: 'C1.1', hub: true, lines: [
  ['ilyas', 'Okay, okay. You can play. Where did you learn that move?'],
  ['jamil', 'Good hands. Good feet. You box out, too. Nobody here boxes out.'],
  ['jamil', 'Come back tomorrow. Same time. We need a fourth who doesn’t complain.'],
  ['saleem', 'He’s right. And you passed when you were open, and passed when I was more open. That’s rare.'],
  ['ilyas', 'You let them score on you twice, Dad.'],
  ['jamil', 'I let them? You missed four layups. Four!'],
  ['ilyas', 'Three. The fourth one was blocked. That’s not missing.'],
  ['jamil', 'Yalla, it’s still a miss. A miss is a miss.'],
  ['saleem', 'Brothers, brothers. The Prophet ﷺ said the strong one isn’t the one who wins the wrestle; it’s the one who holds himself when he’s angry.'],
  ['saleem', 'We lost a pickup game. We didn’t lose anything else. Come, let’s stack the chairs.'],
  ['you', 'In sha Allah, I’ll be here tomorrow.'],
  ['saleem', 'In sha Allah. Welcome to Al-Amanah, akhi.']] });

// ---------------------------------------------------------------- Chapter 1: Making the team
scn('C1.1', { kind: 'scene', name: 'A full gym', next: 'C1.2', lines: [
  ['narr', 'The next night. After Isha the gym is full: uncles on folding chairs, kids at the far hoop, a dozen brothers you haven’t met.'],
  ['saleem', 'You came back! Alhamdulillah. Ammo Jamil owes me five dollars.'],
  ['jamil', 'I said he’d come back. I bet he’d be late.'],
  ['saleem', 'Tonight, meet everyone. The gym first, then the musalla through the partition.'],
  ['saleem', 'When you’ve said salaam to all of them, come and find me in my office. We have something to talk about.']] });
scn('C1.2', { kind: 'walk', name: 'Meet the gym', walk: 'C1.2', next: 'C1.3' });
scn('C1.3', { kind: 'walk', name: 'Ammo Jamil', part: 'C1.2', next: 'C1.4', lines: [
  ['jamil', 'Sit, sit. Let me tell you something about this gym.'],
  ['jamil', 'Nineteen years I play here. Nineteen years we never win the masjid league. Not once.'],
  ['you', 'Never?'],
  ['jamil', 'Once we reached the final. Al-Furqan beat us by one. ONE point. I still see that shot when I close my eyes.'],
  ['jamil', 'This year we win it. I am not getting any younger, and my knees are getting much older.']] });
scn('C1.4', { kind: 'walk', name: 'Ilyas', part: 'C1.2', next: 'C1.5', lines: [
  ['ilyas', 'Don’t let my dad scare you. He’s been talking about that final since before I was born.'],
  ['ilyas', 'He wants the trophy. I just want him to watch me play one game without yelling “BEND YOUR KNEES.”'],
  ['you', 'And if we win?'],
  ['ilyas', 'If we win, maybe he finally says “good game, son.” Two words. Three. You get it.']] });
scn('C1.5', { kind: 'walk', name: 'The musalla', musalla: true, next: 'C1.6' });
scn('C1.6', { kind: 'play', name: 'Lightning', mode: 'lightning', win: 'C1.7', loss: 'C1.7',
  pre: [['musa', 'EVERYBODY UP! Lightning, five of us, loser stacks the chairs!'], ['saleem', 'Five of us, two balls. You know the rules?'], ['you', 'Make it before the man behind you does.'], ['saleem', 'Then you know everything. Bismillah.']],
  winLines: [['musa', 'Bro. You knocked out Ilyas AND his dad in one game.'], ['jamil', 'I let him. Respect for the guest.'], ['ilyas', 'You did not let him, Dad.']],
  lossLines: [['ilyas', 'Got you! Welcome to Al-Amanah, we play for keeps.'], ['saleem', 'Good effort. Now, chairs. Then my office.']] });
scn('C1.7', { kind: 'scene', name: 'The office', talk: { at: 'office', who: 'saleem' }, next: 'C1.8', lines: [
  ['saleem', 'Come in, close the door. The chai is from Imam Dawud, so it’s strong.'],
  ['saleem', 'I never introduced myself properly. Saleem. I studied in Madinah, came back, and the masjid asked me to stay a year. That was eleven years ago.'],
  ['saleem', 'Al-Amanah is small. Two hundred families, a gym that is also the overflow musalla, a weekend school in two rooms.'],
  ['saleem', 'But the people here look after each other. Ammo Jamil drives the uncles to the doctor. Ustath Karim teaches for free. Musa found us at a park.'],
  ['you', 'Everyone has been kind to me. In two days it already feels like home.'],
  ['saleem', 'Alhamdulillah. That’s what a masjid is for.'],
  ['saleem', 'Now. The league starts soon, and we play two on two. We have seven brothers for two spots on the floor at a time.'],
  ['saleem', 'I saw your game. I want you on the team. But a starting spot is earned here, not given.'],
  ['saleem', 'Tomorrow, outside, King of the Court. Hold the court and the spot is yours.']] });
scn('C1.8', { kind: 'play', name: 'King of the Court', mode: 'kotc', win: 'C1.9', loss: 'C1.8',
  pre: [['saleem', 'One on one, first to three. Hold the court three straight and you’re king.'], ['jamil', 'Nobody holds the court on me. Nobody.'], ['musa', 'Can I dunk on him? Is that allowed?']],
  winLines: [['saleem', 'Crowned! Masha’Allah.'], ['jamil', 'Hmph. My knee. Next time.'], ['ilyas', 'Dad, you said that last time.']],
  lossLines: [['saleem', 'Not this time. Catch your breath, drink some water, and go again.'], ['jamil', 'The court doesn’t give, it takes. Again!']] });
scn('C1.9', { kind: 'scene', name: 'The team', next: 'C2.1', hub: true, lines: [
  ['saleem', 'Brothers, gather round. I think you all saw what I saw.'],
  ['jamil', 'He boxes out. He passes. He doesn’t complain. I vote yes.'],
  ['karim', 'He shoots with his elbow in. I vote yes.'],
  ['anas', 'He said salaam to the uncles before the ball. Yes.'],
  ['musa', 'Two new guys on the team? We should get matching headbands.'],
  ['ilyas', 'We are not getting matching headbands.'],
  ['saleem', 'Then it’s settled. Welcome to the Al-Amanah team, akhi. You’re here to help us win the masjid league.'],
  ['dawud', 'May Allah put barakah in it. And may the chai never run out.'],
  ['narr', 'The career begins.']] });

// ---------------------------------------------------------------- walks
// npcs: id, where (gym world x, z), what he's doing (act), which way he faces, what he says; need: must be met.
// closer: who ends the walk once everyone needed is met (and every goal is done).
const STORY_WALKS = {
  'C0.3': {
    title: 'Say salaam', npcs: [
      { id: 'ilyas', x: 1120, z: 430, act: 'shoot', face: 1, need: true, lines: [['ilyas', 'Salaam! You play? Good. Dad says I shoot too much.'], ['you', 'Wa alaykum as-salam. Is there such a thing?'], ['ilyas', 'That’s what I keep telling him!']] },
      { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, need: true, lines: [['jamil', 'Ilyas! Bend your knees! …Oh. Wa alaykum as-salam. You’re new.'], ['you', 'I just moved here. The imam sent me.'], ['jamil', 'Ammo Jamil. That one shooting is my son. He thinks defense is optional.']] },
      { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true,
        early: [['saleem', 'Say salaam to the brothers first, then come see me.']],
        lines: [['saleem', 'Assalamu alaykum. I saw you at Isha. I’m Saleem.'], ['you', 'Wa alaykum as-salam. The imam said to find you. Can I join in?'], ['saleem', 'Of course. Warm up first. Shoot around, get a feel for the floor.']] }],
    start: [['saleem', 'There he is. Go say salaam, brother.']]
  },
  'C0.4': {
    title: 'Shoot around', tutorial: true, npcs: [
      { id: 'ilyas', x: 1180, z: 600, act: 'host', face: -1 },
      { id: 'jamil', x: 720, z: 140, act: 'sit', face: 1 },
      { id: 'saleem', x: 860, z: 260, act: 'host', face: 1, closer: true,
        early: [['saleem', 'Take your time. Finish your warm-up first.']],
        lines: [['saleem', 'Good. You’ve got a feel for it.'], ['saleem', 'Two on two. You and me against Ammo Jamil and Ilyas. First to 11.'], ['jamil', 'Finally. My knees are getting cold.']] }],
    goals: [
      { id: 'walk', label: 'Move around the floor', touch: 'Move: the left stick', key: 'Move: W A S D or the arrows' },
      { id: 'sprint', label: 'Sprint', touch: 'Sprint: hold TURBO', key: 'Sprint: hold L' },
      { id: 'shoot', label: 'Take a jump shot', touch: 'Shoot: hold SHOOT, let go at the top', key: 'Shoot: hold J, let go at the top of the jump' },
      { id: 'score', label: 'Make two baskets', n: 2, touch: 'Green on the meter is money', key: 'Green on the meter is money' }],
    start: [['saleem', 'Shoot around. Move, sprint, get some shots up. Make a couple, then come find me.']]
  },
  // Chapter 1: the full gym. Ammo Jamil and Ilyas have scenes of their own (C1.3, C1.4); around them, the gym's corners
  // show what the career has: a shot, a drill, the stats on the whiteboard, chai with Imam Dawud, the water cooler
  'C1.2': {
    title: 'Meet the gym', free: true, npcs: [
      { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, need: true, scene: 'C1.3', again: [['jamil', 'Go on, meet everybody. Then we talk trophies.']] },
      { id: 'ilyas', x: 1120, z: 430, act: 'shoot', face: 1, need: true, scene: 'C1.4', again: [['ilyas', 'The cones are by the far hoop. Try the cone run, Q opens the drills.']] },
      { id: 'dawud', x: 600, z: 230, act: 'chai', face: 1, goal: 'chai', lines: [['dawud', 'Ah, the brother from Isha. Come, have some chai.'], ['you', 'JazakAllahu khayran. This is strong.'], ['dawud', 'Cardamom and patience. I make it after every Isha. Players drink first, then the uncles complain.']], again: [['dawud', 'Another glass? Sip, beta. Sip.']] },
      { id: 'uncle', x: 760, z: 540, act: 'sit', face: 1, lines: [['uncle', 'Salaam, beta! Don’t mind me. I’m just here for the chai and the shouting.']] }],
    goals: [
      { id: 'score', label: 'Shoot around: make a basket', n: 1, touch: 'Make a basket at the hoop', key: 'Make a basket at the hoop' },
      { id: 'drill', label: 'Finish a drill', touch: 'Tap Drills, pick one', key: 'Q opens the drills: finish one' },
      { id: 'upgrade', label: 'Your stats, on the whiteboard', touch: 'Walk to the whiteboard and tap it', key: 'Walk to the whiteboard, press F' },
      { id: 'chai', label: 'Chai with Imam Dawud', touch: 'Imam Dawud is at the chai table', key: 'Imam Dawud is at the chai table' },
      { id: 'cooler', label: 'Water at the cooler', touch: 'Walk to the water cooler and tap it', key: 'Walk to the water cooler, press F' }],
    start: [['saleem', 'Meet everyone, try the gym out. When you’re done here, the musalla is through the partition.']],
    end: [['narr', 'Everyone in the gym met. Through the partition to the musalla.']]
  }
};
// C1.5: the musalla walk. Each of them introduces himself the first time you talk (then his usual talk)
const STORY_MUS_NEED = ['anas', 'mufti', 'hafiz', 'karim', 'musa'];
const STORY_MUS_INTRO = {
  anas: ['As-salamu alaykum! You’re the new brother. I’m Anas. They call me Qari because I lead Taraweeh.', 'I also play center. Tall people don’t get a choice here.'],
  mufti: ['Wa alaykum as-salam. I am Abdullah, the masjid’s mufti. People bring me their questions.', 'Mostly about inheritance. Sometimes whether the shot clock is halal. It is.'],
  hafiz: ['Zubair. I memorised the Quran when I was twelve, and I’ve kept score for the brothers ever since.', 'If there’s an argument about the score, they ask me. Nobody argues with a hafiz.'],
  karim: ['Ustath Karim. I teach the weekend school: forty-three kids in two rooms. And I shoot.', 'Sometimes it goes in. Mostly it goes in.'],
  musa: ['Yo! The other new guy! I’m Musa. I took my shahadah in the spring.', 'Everybody here taught me how to pray. Now I teach them how to dunk.']
};

// ---------------------------------------------------------------- what the people around the gym say on a normal visit
const STORY_GYM_TALK = {
  saleem: [['saleem', 'Practice with intention, akhi. Even ten free throws count.']],
  jamil: [['jamil', 'You again! Good. Rebound for me.']],
  ilyas: [['ilyas', 'One more round of shots? I’ll beat you this time.']]
};

// ---------------------------------------------------------------- Chapter 2: Masjid league (stage: Local)
// A group stage of 3 games (two pools of four; the top two go through), then a semifinal and a final. Al-Furqan is in.
scn('C2.1', { kind: 'drill', name: 'First practice', walk: 'C2.1', next: 'C2.2' });
scn('C2.2', { kind: 'walk', name: 'Father and son', walk: 'C2.2', next: 'C2.3' });
scn('C2.3', { kind: 'scene', name: 'Why we play', salah: true, talk: { at: 'office', who: 'saleem' }, next: 'C2.4', effect: 'fundOn', lines: [
  ['saleem', 'Come in, all of you. Squeeze in. Musa, sit on the bookshelf if you have to.'],
  ['saleem', 'Before the league starts, I want you to know why we play. It isn’t for a trophy.'],
  ['saleem', 'Ustath Karim, tell them.'],
  ['karim', 'Forty-three kids come to the weekend school. We teach them in two rooms. One of the rooms is the coat closet.'],
  ['karim', 'Last month we turned eleven families away. No space. Their kids go nowhere on the weekend.'],
  ['saleem', 'The board approved a school wing on the parking lot side. Four classrooms. It costs one hundred thousand dollars.'],
  ['jamil', 'One hundred thousand? We can barely pay for the electricity.'],
  ['saleem', 'Every game we win, people come to watch. People who watch, give. The Masjid League final is the biggest night of our year.'],
  ['dawud', 'The Prophet ﷺ said: when a person dies, his deeds end except three. One of them is knowledge that benefits.'],
  ['dawud', 'Those classrooms will teach long after all of us are gone.'],
  ['ilyas', 'So every win builds a classroom.'],
  ['saleem', 'Every win builds a little of one. And every bit of adab we show on the court brings the community with us.'],
  ['narr', 'The school wing fundraiser has begun. Its meter is on the hub.']] });
scn('C2.4', { kind: 'scene', name: 'The Masjid League', checkpoint: true, effect: 'bracket', stage: 0, next: 'C2.5', lines: () => storyLeagueIntro(0) });
scn('C2.5', { kind: 'choice', name: 'Pick your teammate', pick: true, next: 'C2.6' });
scn('C2.6', { kind: 'play', name: 'Group game 1', bracket: true, stakes: 'opener', win: 'C2.7', loss: 'C2.7', out: 'C2.NS',
  winLines: [['saleem', 'Alhamdulillah. One down. Thank Allah, then thank the brother who set your screens.'], ['jamil', 'Good. Again on Thursday.']],
  lossLines: [['saleem', 'A loss in the group stage is not the end. Win the next one and we’re still alive.'], ['jamil', 'I hate losing. I REALLY hate losing.'], ['ilyas', 'We know, Dad.']] });
scn('C2.7', { kind: 'choice', name: 'Ready for game 2', pick: true, keep: true, next: 'C2.8' });
scn('C2.8', { kind: 'play', name: 'Group game 2', bracket: true, stakes: 'regular', win: 'C2.9', loss: 'C2.9', out: 'C2.NS',
  winLines: [['karim', 'Two wins. My weekend class made a poster. It is mostly glitter.'], ['saleem', 'Keep the intention, keep the effort. One more group game.']],
  lossLines: [['saleem', 'We lost, and we lost with adab. Now we learn from it.'], ['anas', 'Next one. Bismillah.']] });
scn('C2.9', { kind: 'walk', name: 'Practice day', walk: 'C2.9', next: 'C2.10' });
scn('C2.10', { kind: 'play', name: 'Lights out', mode: 'lightsout', win: 'C2.11', loss: 'C2.11',
  pre: [['narr', 'Practice, the next night. Halfway through a drill, the old tubes buzz… and go out. The whole gym goes dark.'], ['musa', 'Bro. BRO. I can’t see my own hands.'], ['jamil', 'The breaker again. Nineteen years, same breaker.'],
    ['saleem', 'Nobody move to the switch, the uncles are on it. In the meantime… two on two. In the dark.'], ['ilyas', 'How do we see the ball?'], ['saleem', 'Listen for it. And watch the glow. Bismillah!']],
  winLines: [['narr', 'The lights flicker back to life.'], ['musa', 'That was the best game of my life and I didn’t see any of it.'], ['saleem', 'You found your teammate without looking. That’s trust.']],
  lossLines: [['narr', 'The lights flicker back to life.'], ['jamil', 'In the dark, the old man is king! Ha!'], ['saleem', 'Win or lose, that was fun. Now: the breaker. Somebody call the electrician.']] });
scn('C2.11', { kind: 'scene', name: 'The final push', next: 'C2.12', lines: () => storyGroupPush() });
scn('C2.12', { kind: 'play', name: 'Group game 3', bracket: true, stakes: () => storyGroupStakes(), win: 'C2.13', loss: 'C2.13', out: 'C2.13',
  winLines: [['saleem', 'Alhamdulillah. Now we see where the table stands.']],
  lossLines: [['saleem', 'Sabr. Let’s see where the table stands.']] });
scn('C2.13', { kind: 'scene', name: 'The group', next: () => C.bracket && C.bracket.out ? 'C2.NS' : 'C2.14', lines: () => C.bracket && C.bracket.out ? [
  ['saleem', 'We didn’t get out of the group. Third on the table.'], ['jamil', '…Nineteen years.'], ['ilyas', 'Dad. Next year. I promise.'],
  ['saleem', 'We learn, we practice, and we come back. The league comes round again.']] : [
  ['saleem', 'Through to the playoffs! Top two in the group, alhamdulillah.'], ['karim', 'A semifinal. One game to the final.'], ['jamil', 'Single elimination now. Lose and go home.'],
  ['saleem', 'Then we don’t think about losing. We think about the next possession.']] });
scn('C2.14', { kind: 'play', name: 'Semifinal', bracket: true, stakes: 'must-win', win: 'C2.15', out: 'C2.NS', loss: 'C2.NS',
  winLines: [['saleem', 'The final! Alhamdulillah!'], ['jamil', 'The final. Twenty years ago I was in a final. Twenty years.'], ['ilyas', 'This time, Dad, we win it.']],
  lossLines: [['saleem', 'One game from the final. That stings.'], ['jamil', 'It stings like nineteen years.']] });
scn('C2.15', { kind: 'play', name: 'Final', bracket: true, stakes: 'final', win: 'C2.16', out: 'C2.NS', loss: 'C2.NS',
  winLines: [['narr', 'The final buzzer. The gym erupts.']],
  lossLines: [['narr', 'The final buzzer. So close.'], ['saleem', 'Hold your heads up. We played with adab, every possession.']] });
scn('C2.16', { kind: 'scene', name: 'Masjid league champions', effect: 'title', stage: 0, next: 'C3.1', hub: true, lines: () => storyTitleLines(0) });
scn('C2.NS', { kind: 'scene', name: 'Next season', effect: 'nextSeason', next: () => C.story.cp || 'C2.4', hub: true, lines: () => storyNextSeasonLines(2) });

// the C2.1, C2.2 and C2.9 walks
STORY_WALKS['C2.1'] = { title: 'First practice', free: true, npcs: [
    { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true, early: [['saleem', 'Three drills, then we talk. Q for the drill menu.']],
      lines: [['saleem', 'Good work. That’s the habit: a little every day, even when nobody’s watching.'], ['saleem', 'Now go and find Ammo Jamil and Ilyas. I think they’re arguing again.']] }],
  goals: [{ id: 'drill', label: 'Finish three drills', n: 3, touch: 'Tap Drills, pick one', key: 'Q opens the drills' }],
  start: [['saleem', 'First real practice. Three drills, any three. Then come and see me.']] };
STORY_WALKS['C2.2'] = { title: 'Father and son', npcs: [
    { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, need: true, lines: [
      ['jamil', 'You see my son? Twenty points last week in pickup. And still he doesn’t box out.'], ['you', 'He’s the quickest guard in the gym, Ammo.'],
      ['jamil', 'Quick, yes. But quick doesn’t win leagues. Defense wins leagues.'], ['jamil', 'I push him because I don’t want him to lose a final by one point. Like me.']] },
    { id: 'ilyas', x: 1120, z: 430, act: 'shoot', face: 1, need: true, lines: [
      ['ilyas', 'Did he tell you about the one-point final? He tells everyone.'], ['ilyas', 'I play defense. I do. He only sees what I don’t do.'],
      ['you', 'Maybe tell him what you just told me.'], ['ilyas', 'Maybe. After we win something.']] }],
  end: [['narr', 'Father and son, a gym apart. Each of them said the same thing about the other.']] };
STORY_WALKS['C2.9'] = { title: 'Practice day', free: true, npcs: [
    { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, need: true, lines: [['jamil', 'Two group games down. Every possession matters now. EVERY possession.'], ['you', 'In sha Allah, we’re ready.']] },
    { id: 'ilyas', x: 1120, z: 430, act: 'shoot', face: 1, need: true, lines: [['ilyas', 'My dad clapped once last game. Once. I counted.'], ['you', 'That’s a start.']] },
    { id: 'karim', x: 1180, z: 200, act: 'host', face: -1, need: true, lines: [['karim', 'My students asked if you are famous now. I said not yet.'], ['karim', 'Elbow in on your jumper. Follow through. Like a swan.']] },
    { id: 'anas', x: 720, z: 600, act: 'stretch', face: 1, need: true, lines: [['anas', 'I stretch before practice. Hamstrings are an amanah too.'], ['anas', 'If you need someone to set a screen, I am large and willing.']] },
    { id: 'musa', x: 860, z: 160, act: 'host', face: 1, need: true, lines: [['musa', 'I tried a 360 in pickup. It didn’t go great.'], ['musa', 'Ustath Karim says fundamentals first. I say both.']] },
    { id: 'dawud', x: 600, z: 230, act: 'chai', face: 1, lines: [['dawud', 'Chai before practice. It makes the knees young.']] },
    { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true, early: [['saleem', 'Talk to the brothers first. A team is people before it’s plays.']],
      lines: [['saleem', 'Good. Everyone ready. Now one more drill and then home… wait, what’s that buzzing?']] }],
  start: [['saleem', 'Mandatory practice! Everybody. Talk to the brothers, see how they’re doing.']] };

// ---------------------------------------------------------------- before a game, by its stakes ({opp}: the other masjid)
const STORY_STAKES = {
  opener: [
    [['saleem', 'First game. Bismillah. Whatever happens tonight, we play with adab.'], ['jamil', 'And we box out!'], ['saleem', '…And we box out.']],
    [['narr', 'The first game of the tournament. {opp} warm up at the other end.'], ['saleem', 'Nerves are normal. Say bismillah, take a breath, play the first possession well.']]],
  regular: [
    [['saleem', '{opp} tonight. Same plan: defend, share the ball, and pray Maghrib together after.']],
    [['karim', 'I watched {opp} last week. They like the corners. Close out hard.'], ['saleem', 'Good. Eyes up, brothers.']],
    [['jamil', '{opp}. I don’t like them. I don’t know them, but I don’t like them.'], ['saleem', 'Ammo… they are our brothers.'], ['jamil', 'I don’t like them like brothers.']]],
  'must-win': [
    [['saleem', 'This is a must-win. Lose and we go home. So we don’t think about home.'], ['ilyas', 'We think about the next possession.'], ['saleem', 'Exactly.']],
    [['narr', 'Win, or the run is over. {opp} stand between you and the next round.'], ['jamil', 'Nineteen years I wait. One more game, I can wait.'], ['saleem', 'Make du’a, then make your free throws.']]],
  final: [
    [['narr', 'The final. The stands are full: uncles, aunties, the weekend school kids with a hand-painted sign.'], ['saleem', 'Whatever happens, we already won something: we came here together.'],
      ['dawud', 'And the chai is ready either way.']],
    [['saleem', 'One more game. {opp} have earned their place, and so have we.'], ['jamil', 'I have waited for this night for a long time.'], ['ilyas', 'Dad. Let’s win it together.']]]
};
const STORY_RAYYAN = [
  ['Salaam, Al-Amanah. My uncle says to say hi to Ammo Jamil. He says he remembers.', 'Good luck tonight. You’ll need it. Kidding! …Mostly.'],
  ['We meet again. The state is big, but it isn’t big enough for both of us.', 'Our coach says you’re the team to watch. So I’m watching.'],
  ['Nationals, and here we are again. Two masjids from the same street.', 'Whatever happens tonight, Maghrib together after. Deal?']
];
// your teammate's word before a game, and the brother you've played with most (chemistry)
const STORY_MATE_PRE = {
  saleem: ['Read my eyes. When I look at the corner, cut to the rim.', 'Pass first, shoot second, pray always.'],
  jamil: ['I take their best player. You take the rest.', 'If anyone gets past me, it is your fault. Kidding. Mostly.'],
  ilyas: ['I’ll pick their pocket, you run. Like we drew it up.', 'Push the pace. Their legs are older than mine.'],
  karim: ['Find me in the corner. I’ll do the rest.', 'Elbow in. Follow through. And pass it to me.'],
  anas: ['I’ll set the screen. You go.', 'Anything near the rim is mine. In sha Allah.'],
  dawud: ['I am slow, so I think fast. Cut when I look at you.', 'Young legs, old head. We are a complete player together.'],
  musa: ['Throw it up anywhere near the rim. I’ll go get it.', 'If I miss a dunk, pretend it was a pass.']
};
const STORY_CHEM_LINES = {
  saleem: ['Whoever you play beside tonight, I’m proud of how you’ve grown.', 'Same as always, akhi. Bismillah.'],
  jamil: ['Listen to me: you play like a son of this masjid now.', 'Don’t make me yell from the bench.'],
  ilyas: ['Go get ’em. I’m cheering loud enough for two.', 'You and me next game, right?'],
  karim: ['My students made a sign with your name on it. Spelled right this time.', 'Shoot with confidence. The kids are watching.'],
  anas: ['I made du’a for you after Asr. Go well.', 'Big games are won by small things. Box out.'],
  dawud: ['Win or lose, the chai is waiting.', 'I have seen many finals. You are ready for this one.'],
  musa: ['Bro, you got this. I believe it more than you do.', 'If you dunk, I’m running on the floor. Fair warning.']
};
// a short scene with the teammate you pick
const STORY_PICK_LINES = {
  saleem: [['saleem', 'The two-man game. Like that first night. I pass, you score, Ammo Jamil complains.'], ['you', 'Like the first night.']],
  jamil: [['jamil', 'Me? Good choice. Finally someone in this masjid with sense.'], ['jamil', 'Listen: we defend first. Points come later. Ilyas never understood this.']],
  ilyas: [['ilyas', 'Yes! Let’s run. Nobody in this league can stay in front of the two of us.'], ['ilyas', 'And if my dad yells from the bench, ignore him. I do.']],
  karim: [['karim', 'An excellent decision. Elbow in, follow through, and look for me in the corner.'], ['karim', 'My students will be in the stands. Let’s give them something to write about.']],
  anas: [['anas', 'Bismillah. I will set screens all night. You only need to run off them.'], ['you', 'And I throw it up, you put it down.'], ['anas', 'In sha Allah.']],
  dawud: [['dawud', 'An old man? You are brave, or you are wise.'], ['dawud', 'I can’t run like Ilyas. But I see the floor like nobody here. Cut when I look at you.']],
  musa: [['musa', 'The two new guys! Let’s GO. Throw it anywhere near the rim, I’ll find it.'], ['you', 'Anywhere?'], ['musa', 'Within reason.']]
};
// the title scenes ({built}: the projects the title paid for, {fund}: the fundraiser's total)
const STORY_TITLE_TEXT = [
  [['narr', 'Masjid Al-Amanah: champions of the Metro Masjid League.'], ['jamil', 'NINETEEN YEARS!'], ['jamil', 'Nineteen years, and now… now… somebody give me a tissue.'],
    ['ilyas', 'Dad. Are you crying?'], ['jamil', 'It’s the chai. Too much cardamom.'], ['saleem', 'Alhamdulillah. First trophy in the history of this masjid. Thank Allah first, then your brothers.'],
    ['rayyan', 'Congratulations, Al-Amanah. You earned it. See you at State.'],
    ['karim', 'The fundraiser stands at {fund}. The kids are already arguing about whose name goes on the classroom door.'],
    ['saleem', 'And the title money builds something right away: {built}. No more flickering tubes. Sorry, lights-out game.'],
    ['dawud', 'Tonight, chai for everyone. Even Al-Furqan.']],
  [['narr', 'Masjid Al-Amanah: state champions.'], ['saleem', 'From a gym with a bent rim to the best in the state. Alhamdulillah.'], ['jamil', 'Two trophies. TWO.'],
    ['ilyas', 'Dad, you said “good game” to me after the final. I heard you.'], ['jamil', '…I said it to everybody.'], ['ilyas', 'You looked at me when you said it.'],
    ['anas', 'I want to thank the uncles who drove us to every away game. All forty minutes of complaining about traffic.'],
    ['karim', 'The fundraiser stands at {fund}. My students drew a picture of the school wing. It has a pool. We are not building a pool.'],
    ['musa', 'Eight months ago I didn’t know how to pray. Today I’m a state champion with my brothers.'],
    ['saleem', 'The title brings {built}. And the invitation to the National tournament.'], ['dawud', 'Masha’Allah. And the chai stays the same.']],
  [], []
];
// after a run-ending loss: a new season, back to the chapter's checkpoint
const STORY_NEXT_SEASON = {
  2: [['narr', 'The season ends. The trophy goes to someone else this year.'], ['jamil', 'Twenty years now. Twenty.'], ['ilyas', 'Dad… next season. I mean it.'],
    ['saleem', 'Everything we built stays: your stats, the upgrades, the fundraiser, the brotherhood. We train, and we enter again.'], ['narr', 'A new season. The masjid league comes around again.']],
  3: [['narr', 'The State season is over for Al-Amanah.'], ['saleem', 'The state is bigger than the city. It takes time.'], ['karim', 'The kids made us a card anyway. It says “next year.” They spelled it right.'],
    ['narr', 'A new season. The State Masjid Championship comes around again.']],
  4: [['narr', 'Out of the National tournament.'], ['saleem', 'One loss and we’re out. That’s the knockout. We come back next year.'], ['jamil', 'Next year. I say this a lot, no?'], ['narr', 'A new season. The National tournament comes around again.']],
  5: [['narr', 'The Ummah Cup goes on without Al-Amanah this year.'], ['saleem', 'We met brothers from every corner of the world. That is already a gift.'], ['narr', 'A new season. The Ummah Cup comes around again.']]
};

// ---------------------------------------------------------------- Chapter 3: State league (v9.25)
// Nine teams, eight games each, the top four to the semifinals. Something different every two games: CHAI after
// game 2, the all-star game after game 4, a teammate leaving for Hajj after game 6.
const C3G = (id, n, next, o = {}) => scn(id, Object.assign({ kind: 'play', name: 'League game ' + n, bracket: true, stakes: 'regular', win: next, loss: next, out: next,
  winLines: o.win || [['saleem', 'Alhamdulillah. One more on the table.']], lossLines: o.loss || [['saleem', 'Sabr. The table is long. We go again.']] }, o.x || {}));
scn('C3.1', { kind: 'walk', name: 'Back at the gym', walk: 'C3.1', next: 'C3.2' });
scn('C3.2', { kind: 'scene', name: 'The State league', checkpoint: true, effect: 'bracket', stage: 1, pickAfter: true, next: 'C3.3', lines: () => storyStateIntro() });
C3G('C3.3', 1, 'C3.4', { x: { stakes: 'opener' },
  win: [['saleem', 'Our first State win. Bismillah, and many more.'], ['musa', 'The State! We’re in the STATE!'], ['ilyas', 'Musa, we’ve been in the state the whole time.']],
  loss: [['saleem', 'One game of eight. Nobody wins the table in the first game.'], ['jamil', 'Or loses it. Remember that.']] });
scn('C3.4', { kind: 'drill', name: 'Practice', walk: 'C3.4', next: 'C3.5' });
C3G('C3.5', 2, 'C3.6', { win: [['karim', 'Two games. The kids are keeping a chart on the classroom wall.'], ['saleem', 'Then let’s give them something to draw.']] });
scn('C3.6', { kind: 'play', name: 'Team bonding: CHAI', mode: 'chai', win: 'C3.7', loss: 'C3.7',
  pre: [['dawud', 'The chai urn is empty. Somebody has to make the next one.'], ['saleem', 'Then we settle it the masjid way. HORSE. Only the word is CHAI.'], ['musa', 'Four letters? That’s barely a game.'], ['jamil', 'Four letters, a long night of chai-making for the loser.']],
  winLines: () => storyChaiLines(true), lossLines: () => storyChaiLines(false) });
C3G('C3.7', 3, 'C3.8');
C3G('C3.8', 4, 'C3.9', { win: [['saleem', 'Halfway. Good. Come to my office tomorrow, all of you. I have an idea.']], loss: [['saleem', 'Halfway, and still in it. Come to my office tomorrow. I have an idea.']] });
scn('C3.9', { kind: 'scene', name: 'Tickets', talk: { at: 'office', who: 'saleem' }, next: 'C3.10', lines: [
  ['narr', 'Sh. Saleem’s office, the next day. A box of printed tickets sits on the desk.'],
  ['saleem', 'The school wing needs money, and people want to see this team. So we give them a show.'],
  ['saleem', 'An all-star game. Saturday night, in our gym. Tickets ten dollars, kids free.'],
  ['you', 'Who do we play?'],
  ['saleem', 'Al-Furqan agreed to send their best two. Rayyan said, and I quote, “we’re going to embarrass you.”'],
  ['saleem', 'One rule: dunks only. A jumper counts nothing. Musa suggested it.'],
  ['musa', 'I suggested it!'],
  ['saleem', 'Every dunk brings the crowd up. The louder the crowd, the more the uncles give. Go and practise your dunks.']] });
scn('C3.10', { kind: 'play', name: 'All-star game', mode: 'allstar', win: 'C3.11', loss: 'C3.11',
  pre: [['narr', 'Saturday night. The bleachers are full. Someone’s auntie has made a banner: DUNK FOR THE KIDS.'], ['rayyan', 'Dunks only. You sure you want this?'], ['musa', 'We were born for this.'], ['jamil', 'Nobody in this gym was born for this. Bend your knees.']],
  winLines: [['narr', 'The final dunk, and the gym explodes.'], ['rayyan', 'Okay. That was a good show. Tell no one I said that.']],
  lossLines: [['narr', 'Al-Furqan take the all-star game, but nobody in the bleachers is complaining.'], ['rayyan', 'Good game. The kids got their money’s worth.']] });
scn('C3.11', { kind: 'scene', name: 'The ticket money', effect: 'allstarFund', next: 'C3.12', lines: () => storyAllstarLines() });
C3G('C3.12', 5, 'C3.13');
C3G('C3.13', 6, 'C3.14', { win: [['saleem', 'Six games. Two to go.'], ['narr', 'After the game, your teammate asks everyone to stay a minute. He has news.']], loss: [['saleem', 'A tough one.'], ['narr', 'After the game, your teammate asks everyone to stay a minute. He has news.']] });
scn('C3.14', { kind: 'choice', name: 'Off to Hajj', pick: true, injure: true, next: 'C3.15', lines: () => storyInjuryLines() });
C3G('C3.15', 7, 'C3.16');
scn('C3.16', { kind: 'scene', name: 'The last league game', next: 'C3.17', lines: () => storyTableHype() });
C3G('C3.17', 8, 'C3.18', { x: { stakes: () => storyTableStakes() }, win: [['saleem', 'Alhamdulillah. Now we wait for the table.']], loss: [['saleem', 'Sabr. Let’s see what the table says.']] });
scn('C3.18', { kind: 'scene', name: 'The table', effect: 'heal', next: () => C.bracket && C.bracket.out ? 'C3.NS' : 'C3.19', lines: () => storyTableResultLines() });
scn('C3.19', { kind: 'play', name: 'State semifinal', bracket: true, stakes: 'must-win', win: 'C3.20', out: 'C3.NS', loss: 'C3.NS',
  winLines: [['saleem', 'The State final! Alhamdulillah!'], ['jamil', 'A final. I have been in one final in my life before this year, and now it is three.']],
  lossLines: [['saleem', 'One step from the final. It hurts, and it should.'], ['anas', 'We gave everything. That is what was asked of us.']] });
scn('C3.20', { kind: 'scene', name: 'Before the final', talk: { at: 'office', who: 'saleem' }, next: 'C3.21', lines: () => storyStateFinalPrep() });
scn('C3.21', { kind: 'play', name: 'State final', bracket: true, stakes: 'final', win: 'C3.22', out: 'C3.NS', loss: 'C3.NS',
  winLines: [['narr', 'The buzzer. State champions.']], lossLines: [['narr', 'The buzzer. So close, again.'], ['saleem', 'Heads up. We were the second-best team in the whole state. Next year, first.']] });
scn('C3.22', { kind: 'scene', name: 'State champions', effect: 'title', stage: 1, next: 'C3.23', lines: () => storyTitleLines(1) });
scn('C3.23', { kind: 'scene', name: 'The invitation', talk: { at: 'office', who: 'saleem' }, next: 'C4.1', hub: true, lines: [
  ['narr', 'A week later. An envelope on Sh. Saleem’s desk, with a gold seal.'],
  ['saleem', '“Masjid Al-Amanah is invited to the National Masjid Tournament. Sixteen teams. Single elimination.”'],
  ['jamil', 'Single elimination. One bad night and we go home.'],
  ['ilyas', 'Then we don’t have a bad night.'],
  ['jamil', '…When did you get so confident?'],
  ['ilyas', 'I learned it from somebody. He yells a lot.'],
  ['karim', 'The fundraiser is closer than ever. If we do well at Nationals, the school wing could open this year.'],
  ['dawud', 'Pack the big thermos. We’re going on a trip.']] });
scn('C3.NS', { kind: 'scene', name: 'Next season', effect: 'nextSeason', next: () => C.story.cp || 'C3.2', hub: true, lines: () => storyNextSeasonLines(3) });

STORY_WALKS['C3.1'] = { title: 'Back at the gym', npcs: [
    { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, need: true, lines: [['jamil', 'You see the new lights? I can see the rim now. Nineteen years I was shooting at a shadow.'], ['jamil', 'And the trophy case. I polish it every morning. Don’t tell anyone.']] },
    { id: 'musa', x: 1120, z: 430, act: 'shoot', face: 1, need: true, lines: [['musa', 'Bro, there are like forty people here. Forty! For practice!'], ['musa', 'Three kids asked for my autograph. I signed “Musa, State league.” Is that too early?']] },
    { id: 'karim', x: 1180, z: 200, act: 'host', face: -1, need: true, lines: [['karim', 'Six new students at the weekend school since the title. Their fathers saw us in the newsletter.'], ['karim', 'Six more children in a coat closet. We need that wing.']] },
    { id: 'dawud', x: 600, z: 230, act: 'chai', face: 1, lines: [['dawud', 'New lights, same chai. Some things a masjid should not upgrade.']] },
    { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true, early: [['saleem', 'Say salaam to everyone first. A lot of new faces tonight.']],
      lines: [['saleem', 'More people, more responsibility. Gather everyone, akhi. I have news about the State league.']] }],
  start: [['narr', 'A new season. The gym is brighter, and fuller.']] };
STORY_WALKS['C3.4'] = { title: 'Practice', free: true, npcs: [
    { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true, early: [['saleem', 'One drill at least. Q for the drill menu.']],
      lines: [['saleem', 'Good. The State teams are faster than the city’s. We match them with habits.']] }],
  goals: [{ id: 'drill', label: 'Finish a drill', touch: 'Tap Drills, pick one', key: 'Q opens the drills' }] };

function storyStateIntro() {
  const b = C.bracket, att = C.story.att || 0, o = storyOpp();
  const L = att ? [['saleem', 'A new State season. Same table, same intention.'], ['jamil', 'This year, the top four. Then the trophy.']] : [
    ['saleem', 'Brothers. As masjid league champions, we’re in the State Masjid Championship.'],
    ['saleem', 'Nine masjids from across the state. We play each of them once. Eight games.'],
    ['saleem', 'The top four go to the semifinals: first plays fourth, second plays third. Then the final.'],
    ['anas', 'Eight games is a long season. We look after our bodies.'],
    ['musa', 'And our hamstrings. Qari Anas told me hamstrings are an amanah.'],
    ['jamil', 'Al-Furqan is in it too. Rayyan’s uncle called me. To “wish me luck.”'],
    ['dawud', 'Then we wish them luck back. And beat them.']];
  if (b && b.pools && !att) L.push(['saleem', 'Every masjid in the table is here: ' + b.pools[0].filter(i => i > 1).map(i => teamOf(1, i).name.replace('Masjid ', '')).join(', ') + ', and Al-Furqan.']);
  if (o) L.push(['saleem', 'First up: ' + o.team.name + '. Pick who plays beside you.']);
  return L;
}
function storyTableHype() {
  const p = storyTablePos(), b = C.bracket, me = b && b.pg ? standings(b, 0).find(r => r.id === 0) : { w: 0, l: 0 };
  const L = [['narr', 'The last league game. Al-Amanah are ' + ordinal(p) + ' in the table, ' + me.w + ' won and ' + me.l + ' lost.']];
  if (p <= 2) L.push(['saleem', 'We’re in a good place. Win tonight and we get the easier semifinal.']);
  else if (p <= 4) L.push(['saleem', 'Top four, but only just. Win tonight and nobody can catch us.']);
  else L.push(['saleem', 'We’re outside the top four. We need this win, and we need the other games to go our way.']);
  L.push(['jamil', 'Every possession. EVERY possession.'], ['ilyas', 'He’s going to say “bend your knees” now.'], ['jamil', '…Bend your knees.']);
  return L;
}
function storyTableResultLines() {
  const b = C.bracket, p = storyTablePos();
  if (b && b.out) return [['narr', 'The table is final. Al-Amanah finish ' + ordinal(p) + '. The top four go on without us.'], ['saleem', 'We were close. Close is a lesson.'], ['jamil', 'Next year we go again.']];
  const sf = b.rounds[0].find(m => m.a === 0 || m.b === 0), oid = sf.a === 0 ? sf.b : sf.a, opp = teamOf(1, oid), L = [['narr', 'The table is final. Al-Amanah finish ' + ordinal(p) + ', and into the semifinals.']];
  L.push(['saleem', 'Our semifinal: ' + opp.name + '.']);
  if (oid === 1) L.push(['rayyan', 'Al-Amanah. Of course it’s you.'], ['jamil', 'Of course it is.']);
  else L.push(['jamil', 'And Al-Furqan is on the other side. If we meet them, it’s the final.']);
  const back = C.story.injured;
  if (back) L.push(['narr', castDef(back).name + ' walks in, back from Hajj.'], ...storyReturnLine(), ['saleem', 'Hajj mabroor! And just in time for the playoffs.']);
  return L;
}
function storyStateFinalPrep() {
  const b = C.bracket, f = b && b.rounds[1] && b.rounds[1][0], oid = f ? (f.a === 0 ? f.b : f.a) : 1, opp = teamOf(1, oid);
  const L = [['narr', 'The night before the State final. Sh. Saleem’s office, the door open, the gym dark behind it.'],
    ['saleem', 'Tomorrow it’s ' + opp.name + '. Sit for a minute.'],
    ['saleem', 'When I came back from Madinah, this gym had one working light and a rim bent like a banana.'],
    ['saleem', 'Now look. Lights. Bleachers full every night. Kids who want to be you.'],
    ['you', 'And a school wing on the way.'],
    ['saleem', 'In sha Allah. Whatever happens tomorrow, the masjid already won. But I would still like that trophy.']];
  if (oid === 1) L.push(['saleem', 'And it’s Rayyan. Play him straight. He hates that.']);
  return L;
}
// C3.14: the teammate who leaves for Hajj (his name came up this year), and his line when he's back for the playoffs.
// Hajj itself is never shown: he talks about it before he goes, and comes back a hajji.
const STORY_HAJJ = {
  saleem: [['saleem', 'Brothers, sit for a minute. Alhamdulillah, my name came up for Hajj this year. I fly out on Thursday.'], ['jamil', 'Masha’Allah! Make du’a for us at Arafah.'], ['saleem', 'For every one of you, by name. I’ll be back for the playoffs, in sha Allah.'], ['saleem', 'Until then, pick someone else to play beside you. I’ll be thinking of this gym from Mina.']],
  jamil: [['jamil', 'I have news. My Hajj visa came through. Twenty years of saving, and I go next week.'], ['ilyas', 'Dad… that’s amazing. Mum is going to cry.'], ['jamil', 'Your mum is already crying. I am also maybe crying.'], ['jamil', 'Pick someone else for now. And Ilyas: box out while I’m gone.']],
  ilyas: [['ilyas', 'So… my grandmother is going for Hajj, and she needs someone to go with her. She picked me.'], ['jamil', 'My son, going for Hajj before his father. Masha’Allah. I’m proud. Very proud. Slightly jealous.'], ['ilyas', 'I’ll make du’a for you at Arafah, Dad.'], ['ilyas', 'Pick someone else, akhi. I’ll be back for the playoffs, in sha Allah.']],
  karim: [['karim', 'I have to tell you all something. My name came up for Hajj this season.'], ['karim', 'The kids made me a card. It has a drawing of the Ka’bah, and also a basketball. I said that’s fine.'], ['saleem', 'Hajj mabroor in advance, ustath.'], ['karim', 'Pick someone else, akhi. Elbow in while I’m away.']],
  anas: [['anas', 'Brothers. Alhamdulillah, I am going for Hajj. My mother and I, together.'], ['dawud', 'May Allah accept it from you both.'], ['anas', 'I will recite the talbiyah for this whole team. Pick someone else until I am back.']],
  dawud: [['dawud', 'Sit, sit. At my age, when the call to Hajj comes, you answer. I fly on Thursday.'], ['musa', 'Who’s going to make the chai?'], ['dawud', 'I have written the recipe on the urn. Do not improvise.'], ['dawud', 'Pick someone else, akhi. I will make du’a for the team.']],
  musa: [['musa', 'Guys. GUYS. A brother at work had a Hajj place free, and he gave it to me. To ME.'], ['saleem', 'Musa… not long ago you took your shahadah. And now Hajj. Allahu akbar.'], ['musa', 'I don’t know what to pack. Do I need sneakers?'], ['anas', 'Comfortable sandals, and a lot of patience. Pick someone else, akhi. He’ll be back.']]
};
const STORY_RETURN = { saleem: 'Hajj mabroor to me, and now: the playoffs.', jamil: 'I’m back, a hajji now. The yelling is the same.', ilyas: 'Back from Hajj. My grandmother says hello, and also “bend your knees.”',
  karim: 'Back from Hajj. My students drew me a welcome banner. Elbow in, follow through.', anas: 'Back from Hajj, alhamdulillah. I made du’a for every one of you.', dawud: 'Back from Hajj. Who touched the chai urn?', musa: 'I’m back. I wore the sandals. Anas was right.' };
