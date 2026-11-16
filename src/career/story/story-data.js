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
const STORY_BUILT = 1;              // the last chapter that can be played in this build (later chapters arrive one release at a time)
const SC = {};
function scn(id, o) { SC[id] = Object.assign({ id, ch: id[0] === 'C' ? +id[1] : 6 }, o); return SC[id]; }
const STORY_FIRST = 'C0.1';

// ---------------------------------------------------------------- Chapter 0: Introduction
scn('C0.1', { kind: 'scene', custom: 'salams', name: 'After Isha', next: 'C0.2',
  lines: [['narr', 'As-salamu alaykum wa rahmatullah.'], ['narr', 'As-salamu alaykum wa rahmatullah.']] });
scn('C0.2', { kind: 'scene', bg: 'musalla', name: 'The musalla', next: 'C0.3', lines: [
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
scn('C1.7', { kind: 'scene', name: 'The office', bg: 'office', next: 'C1.8', lines: [
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
