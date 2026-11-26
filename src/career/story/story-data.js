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
  { n: 5, name: 'Ummah Cup', stage: 3, cp: 'C5.1' },
  { n: 6, name: 'After the story' }                                  // (P.1 to P.4: no chapter number)
];
const STORY_BUILT = 5;              // the last chapter that can be played in this build (later chapters arrive one release at a time)
const SC = {};
function scn(id, o) { SC[id] = Object.assign({ id, ch: id[0] === 'C' ? +id[1] : 6 }, o); return SC[id]; }
const STORY_FIRST = 'C0.1';

// ---------------------------------------------------------------- Chapter 0: Introduction
scn('C0.1', { kind: 'scene', custom: 'salams', name: 'After Isha', next: 'C0.2',
  lines: [['narr', 'As-salamu alaykum wa rahmatullah.'], ['narr', 'As-salamu alaykum wa rahmatullah.']] });
scn('C0.2', { kind: 'scene', talk: { at: 'musalla', who: 'dawud' }, name: 'The musalla', next: 'C0.3', lines: [
  ['narr', 'Masjid Al-Amanah, Eastside. Your first week in town, your first Isha here.'],
  ['dawud', 'As-salamu alaykum, akhi. I don’t know your face yet. Welcome.'],
  ['you', 'Wa alaykum as-salam. I moved here last week.'],
  ['dawud', 'The young ones play ball in the gym after Isha. Through there. Go on.']] });
scn('C0.3', { kind: 'walk', name: 'The gym', next: 'C0.4', walk: 'C0.3', direct: true });
scn('C0.4', { kind: 'play', name: 'Pickup game', mode: 'pickup', stakes: 'opener', tutorial: true, noRewards: true, win: 'C0.5', loss: 'C0.4',
  winLines: [['saleem', 'Game! Alhamdulillah.'], ['jamil', 'Hmph. Beginner’s luck.']],
  lossLines: [['jamil', 'Ha! The old man still has it.'], ['saleem', 'Catch your breath. We run it back.']] });
scn('C0.5', { kind: 'scene', name: 'Come back tomorrow', next: 'C1.1', hub: true, lines: [
  ['saleem', 'Good game! I’m Saleem. This is Ammo Jamil, and his son Ilyas.'],
  ['jamil', 'Nineteen years I play here. Nineteen years we never win the league. You box out, so: come back tomorrow.'],
  ['ilyas', 'Practice is after Isha. Don’t be late, he makes you run.'],
  ['saleem', 'We’ll show you the gym properly. See you tomorrow, {name}.']] });

// ---------------------------------------------------------------- Chapter 1: Making the team
// v9.33 order (SCENES.md, Chapter 1): meet the gym, the musalla, Lightning, the office, King of the Court, the team.
scn('C1.1', { kind: 'walk', name: 'Meet the gym', walk: 'C1.1', next: 'C1.2' });
scn('C1.2', { kind: 'walk', name: 'The musalla', musalla: true, direct: true, next: 'C1.3',
  closer: [['musa', 'Yo, {name}! Lightning, in the gym, now!'], ['musa', 'Loser stacks the chairs!']] });
scn('C1.3', { kind: 'play', name: 'Lightning', mode: 'lightning', win: 'C1.4', loss: 'C1.4',
  winLines: [['musa', 'Bro. You knocked out Ilyas AND his dad in one game.'], ['saleem', 'Masha’Allah, {name}. Come to my office, I want a word.']],
  lossLines: [['ilyas', 'Got you! Welcome to Al-Amanah, we play for keeps.'], ['saleem', 'Good effort, {name}. Come to my office, I want a word.']] });
scn('C1.4', { kind: 'scene', name: 'The office', talk: { at: 'office', who: 'saleem' }, direct: true, next: 'C1.5', lines: [
  ['saleem', 'Al-Amanah is small, {name}. Two hundred families, a weekend school in two rooms, and a roof that leaks when it rains.'],
  ['saleem', 'But the people here look after each other. When the masjid league comes, the whole community comes to watch, and when they watch, they give.'],
  ['saleem', 'Every win helps the masjid and the families in it. We need you to help us win.'],
  ['saleem', 'A spot is earned here, not given. Come outside with me.']] });
scn('C1.5', { kind: 'scene', name: 'Earn your spot', sayNow: true, direct: true, next: 'C1.6', lines: [
  ['saleem', 'Brothers! King of the Court. Everyone plays for his spot.'],
  ['musa', 'Me first! I’m taking that crown.'],
  ['saleem', 'Musa, then Hafiz Zubair, then Qari Anas. Hold the court three straight, {name}, and the spot is yours.']] });
scn('C1.6', { kind: 'play', name: 'King of the Court', mode: 'kotc', win: 'C1.7', loss: 'C1.6',
  winLines: [['saleem', 'Crowned! Masha’Allah.'], ['hafiz', 'Three straight. I counted, and nobody argues with a hafiz.']],
  lossLines: [['saleem', 'Not this time. Catch your breath, drink some water, and go again.'], ['musa', 'The court doesn’t give, it takes. Again!']] });
scn('C1.7', { kind: 'scene', name: 'The team', next: 'C2.1', hub: true, lines: [
  ['saleem', 'Brothers, gather round. I think you all saw what I saw.'],
  ['jamil', 'He boxes out. He passes. He doesn’t complain. I vote yes.'],
  ['anas', 'He said salaam to the uncles before the ball. Yes.'],
  ['musa', 'Two new guys on the team? We should get matching headbands.'],
  ['ilyas', 'We are not getting matching headbands.'],
  ['saleem', 'Then it’s settled. Welcome to the Al-Amanah team, {name}. Let’s win this for the masjid.']] });

// ---------------------------------------------------------------- walks
// npcs: id, where (gym world x, z), what he's doing (act), which way he faces, what he says; need: must be met.
// closer: who ends the walk once everyone needed is met (and every goal is done).
const STORY_WALKS = {
  // C0.3: Sh. Saleem, Ammo Jamil and Ilyas shoot at one hoop. You have no ball; you ask to play.
  'C0.3': {
    title: 'The gym', noBall: true, npcs: [
      { id: 'ilyas', x: 1130, z: 420, act: 'shoot', face: 1 },
      { id: 'jamil', x: 1060, z: 560, act: 'host', face: 1 },
      { id: 'saleem', x: 960, z: 330, act: 'host', face: -1, closer: true,
        lines: [['you', 'As-salamu alaykum. Can I play?'], ['saleem', 'Wa alaykum as-salam! We need a fourth. You’re with me against those two.'], ['jamil', 'Yalla. First to 11.']] }]
  },
  // C1.1: the gym, properly. Shoot around (three baskets, a layup, a rebound, a sprint); Ilyas runs you through the cone
  // dribble and explains Barakah Points; Ammo Jamil has you shoot free throws and explains Halal Bucks; Sh. Saleem, at
  // his office door, explains the drills. Then through the door to the musalla.
  'C1.1': {
    title: 'Meet the gym', free: true, exitTo: 'musalla', npcs: [
      { id: 'ilyas', x: 1120, z: 430, act: 'shoot', face: 1, drill: 'cones',
        lines: [['ilyas', 'Every drill you finish earns Barakah Points. BP go into your stats on the whiteboard: shooting, speed, defense, all of it.'], ['ilyas', 'Cone dribble first. Weave every cone, fast as you can. Go!']],
        again: [['ilyas', 'Spend your BP on the whiteboard. Upgrade on the left bar does the same.']] },
      { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, drill: 'ft',
        lines: [['jamil', 'Games and drills pay Halal Bucks too. Bucks are for looking good: sneakers, headbands, a celebration.'], ['jamil', 'But first you shoot ten free throws for me. Bend your knees!']],
        again: [['jamil', 'Bucks for the look, BP for the game. Now go meet everybody.']] },
      { id: 'saleem', x: 830, z: 110, act: 'host', face: 1, goal: 'saleem',
        lines: [['saleem', 'You came back, {name}! Alhamdulillah.'], ['saleem', 'The drills are on the left bar, any time: shooting, dribbling, passing. Practice between games and it shows in games.']],
        again: [['saleem', 'When you’re done here, the musalla is through this door.']] }],
    goals: [
      { id: 'sprint', label: 'Sprint the length of the floor', touch: 'Push the stick past the dashed ring', key: 'Hold Shift while you move' },
      { id: 'score', label: 'Make 3 baskets', n: 3, touch: 'Hold SHOOT, let go at the top', key: 'Hold K, let go at the top of the jump' },
      { id: 'layup', label: 'Make a layup', touch: 'Drive to the rim and shoot', key: 'Drive to the rim, then K' },
      { id: 'rebound', label: 'Grab a rebound', touch: 'Miss a shot and catch the ball', key: 'Miss a shot, then get to the ball first' },
      { id: 'cones', label: 'Cone dribble with Ilyas', touch: 'Talk to Ilyas', key: 'Talk to Ilyas (E)' },
      { id: 'ft', label: 'Free throws with Ammo Jamil', touch: 'Talk to Ammo Jamil', key: 'Talk to Ammo Jamil (E)' },
      { id: 'saleem', label: 'Sh. Saleem, at his office door', touch: 'Talk to Sh. Saleem', key: 'Talk to Sh. Saleem (E)' },
      { id: 'go', label: 'Go to the musalla', touch: 'Walk to the musalla door', key: 'Walk to the musalla door, or press E' }]
  }
};
// C1.2: the musalla walk. Each of them introduces himself the first time you talk (then his usual talk). Pray and read,
// then Musa calls everyone to the gym.
const STORY_MUS_NEED = ['karim', 'dawud', 'anas', 'mufti', 'hafiz'];
const STORY_MUS_GOALS = [{ id: 'pray', label: 'Pray two rak’ahs' }, { id: 'read', label: 'Read from the Qur’an' }];
const STORY_MUS_INTRO = {
  karim: ['Ustath Karim. I teach the weekend school, and I shoot.', 'Win and you earn Halal Bucks. A green headband, white high-tops, your own celebration. Look good, play good.'],
  dawud: ['You came back, {name}. Before you play, pray.', 'The mihrab is at the front. Two rak’ahs, and the heart is ready for anything.'],
  anas: ['As-salamu alaykum! I’m Anas. They call me Qari because I lead Taraweeh.', 'The mushaf is on the shelf. Read a little every day, even one ayah.'],
  mufti: ['Wa alaykum as-salam. I am Abdullah, the masjid’s mufti.', 'People bring me their questions. Sometimes whether the shot clock is halal. It is.'],
  hafiz: ['Zubair. I memorised the Qur’an at twelve, and I keep score for the brothers.', 'Nobody argues the score with a hafiz.']
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
  ['saleem', 'Forty-three kids come to our weekend school, in two rooms. Last month we turned eleven families away.'],
  ['saleem', 'The board approved a school wing: four classrooms, one hundred thousand dollars. When we win, people come to watch, and people who watch give.'],
  ['you', 'Then we win.'],
  ['narr', 'The school wing fundraiser has begun. Its meter is on the left bar in the gym.']] });
scn('C2.4', { kind: 'scene', name: 'The Masjid League', checkpoint: true, effect: 'bracket', stage: 0, next: 'C2.5', lines: () => storyLeagueIntro(0) });
scn('C2.5', { kind: 'walk', name: 'Pick your teammate', walk: 'C2.5', next: 'C2.6' });
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
    ['saleem', 'The uncles are on the switch. In the meantime, two on two. In the dark. Watch the glow. Bismillah!']],
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
    { id: 'saleem', x: 860, z: 300, act: 'host', face: -1, closer: true, early: [['saleem', 'Three drills, then we talk. Drills are on the left bar.']],
      lines: [['saleem', 'Good work. A little every day, even when nobody’s watching.'], ['saleem', 'Ammo Jamil and Ilyas are by the far hoop. Go say salaam.']] }],
  goals: [{ id: 'drill', label: 'Finish three drills', n: 3, touch: 'Tap Drills, pick one', key: 'Drills on the left bar, or Q' }],
  start: [
    ['saleem', 'Here’s how the season goes, {name}. Between every game, you come back here and practise.'],
    ['saleem', 'Drills earn Barakah Points for your stats. Games earn Halal Bucks, for your look and for the masjid’s projects.'],
    ['saleem', 'And when the adhan calls, pray. It gives you a boost for the next game.'],
    ['saleem', 'Three drills tonight, any three. Let’s start the season off right.']] };
// C2.2: father and son, a gym apart; each sees it his own way
STORY_WALKS['C2.2'] = { title: 'Father and son', npcs: [
    { id: 'jamil', x: 980, z: 600, act: 'host', face: -1, need: true, lines: [
      ['jamil', 'My son scores twenty in pickup and still doesn’t box out. Defense wins leagues.'],
      ['jamil', 'I push him so he never loses a final by one point. Like I did.']] },
    { id: 'ilyas', x: 1120, z: 430, act: 'shoot', face: 1, need: true, lines: [
      ['ilyas', 'He only sees what I don’t do. I want to run, not stand in his zone.'],
      ['you', 'Maybe tell him that.'], ['ilyas', 'After we win something.']] }] };
// C2.5: the seven stand around the gym; talk to any of them and the pick screen opens with him selected
STORY_WALKS['C2.5'] = { title: 'Pick your teammate', pickWalk: true, npcs: STORY_MATES.map((id, i) => {
    const [x, z, face] = [[900, 320, -1], [980, 600, -1], [1120, 430, -1], [1180, 220, -1], [720, 600, 1], [600, 250, 1], [760, 170, 1]][i];
    return { id, x, z, face, act: id === 'ilyas' ? 'shoot' : id === 'dawud' ? 'chai' : 'host', onTalk: () => storyPickWalkOpen(id) }; }),
  goals: [{ id: 'pick', label: 'Pick your teammate', touch: 'Walk up to a brother and tap Talk', key: 'Walk up to a brother, press E' }],
  start: [['saleem', 'Two on two, {name}: you and one of us. Talk to whoever you want to play with.']] };
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
  [['narr', 'Masjid Al-Amanah: champions of the Metro Masjid League.'], ['jamil', 'NINETEEN YEARS! Somebody give me a tissue.'],
    ['ilyas', 'Dad. Are you crying?'], ['jamil', 'It’s the chai. Too much cardamom.'],
    ['saleem', 'Alhamdulillah. The first trophy in the history of this masjid, and the title builds {built}. You too, {name}.'],
    ['rayyan', 'Congratulations, Al-Amanah. You earned it. See you at State.'],
    ['karim', 'The fundraiser stands at {fund}. The kids are already arguing about whose name goes on the classroom door.']],
  [['narr', 'Masjid Al-Amanah: state champions.'], ['saleem', 'From a gym with a bent rim to the best in the state. Masha’Allah, {name}.'],
    ['ilyas', 'Dad, you said “good game” to me after the final. I heard you.'], ['jamil', '…I said it to everybody.'],
    ['musa', 'Eight months ago I didn’t know how to pray. Today I’m a state champion with my brothers.'],
    ['karim', 'The fundraiser stands at {fund}.'], ['saleem', 'The title brings {built}. And the invitation to the National tournament.']],
  [['narr', 'Masjid Al-Amanah: national champions. In the noise, Ammo Jamil walks across the court to his son.'],
    ['jamil', 'Ilyas. Twenty years I wanted a trophy. Tonight I have one, and it is not the thing I am proudest of.'],
    ['jamil', 'I am proud of you. Not for the points: for how you play, and how you kept going when I was yelling. I’m sorry, my son.'],
    ['ilyas', '…Dad. Good game.'], ['jamil', 'Good game, son.'],
    ['karim', 'The fundraiser: {fund}. The rest came in tonight. The school wing is paid for: four classrooms, and every family has a place.'],
    ['saleem', 'And the title builds {built}. When we get home, go outside and look at the masjid, {name}. Look at the new wing.']],
  [['narr', 'The Ummah Cup final is over. Masjid Al-Amanah, from Eastside, are champions of the world.'],
    ['saleem', 'Allahu akbar. A sujood of thanks, right here, then we lift it.'],
    ['narr', 'The team kneels on the court in sujood of thanks. Then Sh. Saleem hands the Cup to you.'],
    ['saleem', 'You lift it first, {name}. You walked into our gym a stranger. Lift it as our brother.'],
    ['jamil', 'Twenty years ago I lost a final by one point. Tonight I have a world cup. Nothing hurts.'],
    ['ilyas', 'Proud of you, Dad.'], ['jamil', 'That is my line! …Proud of you too, son.'],
    ['saleem', 'And at home, the title builds {built}. A dome you can see from the highway.']]
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
  ['saleem', 'The school wing needs money, and people want to see this team. Saturday night: an all-star game in our gym. Al-Furqan sends their best two.'],
  ['saleem', 'One rule: dunks only. A jumper counts nothing. Every dunk brings the crowd up, and the louder the crowd, the more the uncles give.'],
  ['you', 'Dunks only. Musa’s idea?'],
  ['saleem', 'Musa’s idea. Go and practise your dunks.']] });
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
  ['saleem', 'One bad night and we go home. And if we do well, the school wing could open this year.'],
  ['you', 'Then we don’t have a bad night.'],
  ['saleem', 'In sha Allah. Tell the brothers. And tell Imam Dawud to pack the big thermos.']] });
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
  const L = att ? [['saleem', 'A new State season. Same table, same intention.']] : [
    ['saleem', 'As masjid league champions, we’re in the State Masjid Championship. Nine masjids from across the state.'],
    ['saleem', 'We play each of them once: eight games. The top four go to the semifinals, then the final.'],
    ['jamil', 'Al-Furqan is in it too. Rayyan’s uncle called me. To “wish me luck.”']];
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
  return [['narr', 'The night before the State final. Sh. Saleem’s office, the door open, the gym dark behind it.'],
    ['saleem', 'Tomorrow it’s ' + opp.name + '. When I came back from Madinah, this gym had one working light and a rim bent like a banana.'],
    ['saleem', 'Now look. Lights, bleachers full every night, kids who want to be you. Whatever happens tomorrow, the masjid already won.'],
    ['you', 'But we’d still like that trophy.'],
    ['saleem', oid === 1 ? 'We would. And it’s Rayyan: play him straight. He hates that.' : 'We would. In sha Allah.']];
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

// ---------------------------------------------------------------- Chapter 4: National tournament (v9.27)
// Sixteen teams, single elimination: round of 16, quarterfinal, semifinal, final. Any loss: next season, back to C4.1.
scn('C4.1', { kind: 'scene', name: 'Nationals', checkpoint: true, effect: 'bracket', stage: 2, pickAfter: true, next: 'C4.2', lines: () => storyNatIntro() });
scn('C4.2', { kind: 'play', name: 'Round of 16', bracket: true, stakes: 'opener', win: 'C4.3', out: 'C4.NS', loss: 'C4.NS',
  winLines: [['saleem', 'One down, three to go. Alhamdulillah.']], lossLines: [['saleem', 'Out in the first round. It happens to good teams. We learn.'], ['jamil', 'One bad night. That’s the knockout.']] });
scn('C4.3', { kind: 'scene', name: 'Into the quarterfinals', next: 'C4.4', lines: () => storyNatReact(0) });
scn('C4.4', { kind: 'play', name: 'National quarterfinal', bracket: true, stakes: 'must-win', win: 'C4.5', out: 'C4.NS', loss: 'C4.NS',
  winLines: [['saleem', 'The last four in the country. Masha’Allah.']], lossLines: [['saleem', 'The quarterfinals. Further than this masjid has ever been. Heads up.']] });
scn('C4.5', { kind: 'scene', name: 'The last four', next: 'C4.6', lines: () => storyNatReact(1) });
scn('C4.6', { kind: 'play', name: 'National semifinal', bracket: true, stakes: 'must-win', win: 'C4.7', out: 'C4.NS', loss: 'C4.NS',
  winLines: [['saleem', 'THE FINAL! Allahu akbar!'], ['jamil', 'I need to sit down.']], lossLines: [['saleem', 'One game from the final. It hurts because we cared. Good.']] });
scn('C4.7', { kind: 'scene', name: 'The night before the final', next: 'C4.8', lines: () => [
  ['narr', 'The night before the National final. After Isha in the hotel’s small prayer room, the team sits up talking.'],
  ...storyNatReact(2).filter(l => l[0] !== 'narr').slice(-1),
  ['ilyas', 'Dad? Thanks for driving us to every single game. Even the ones with traffic.'], ['jamil', '…Go to sleep. Big game tomorrow.'],
  ['saleem', 'Tomorrow, play for each other. The rest is written already.']] });
scn('C4.8', { kind: 'play', name: 'National final', bracket: true, stakes: 'final', win: 'C4.9', out: 'C4.NS', loss: 'C4.NS',
  winLines: [['narr', 'The final buzzer. Al-Amanah are national champions.']], lossLines: [['narr', 'The final buzzer. Second in the whole country.'], ['saleem', 'Second in the nation, brothers. Hold your heads up. We come back.']] });
scn('C4.9', { kind: 'scene', name: 'National champions', effect: 'title', stage: 2, next: 'C4.10', lines: () => storyTitleLines(2) });
scn('C4.10', { kind: 'scene', name: 'The Ummah Cup', talk: { at: 'office', who: 'saleem' }, next: 'C5.1', hub: true, lines: [
  ['narr', 'Home again. A video call is waiting on Sh. Saleem’s laptop.'],
  ['saleem', 'This came from Istanbul this morning. “Masjid Al-Amanah is invited to the Ummah Cup: the best masjid teams in the world.”'],
  ['you', 'The world?'],
  ['saleem', 'Cairo, Kuala Lumpur, Sarajevo, Lagos. Brothers who pray the same prayer in a hundred languages.'],
  ['saleem', 'The school wing is built. Whatever happens there is a gift. But let’s go and win it anyway.']] });
scn('C4.NS', { kind: 'scene', name: 'Next season', effect: 'nextSeason', next: () => C.story.cp || 'C4.1', hub: true, lines: () => storyNextSeasonLines(4) });

// ---------------------------------------------------------------- Chapter 5: the Ummah Cup (v9.28)
// King of the Court for the draw, then a quarterfinal, a semifinal and the final. Any loss after the draw: next
// season, back to C5.1.
scn('C5.1', { kind: 'scene', name: 'The Ummah Cup', checkpoint: true, effect: 'cupStart', next: 'C5.2', lines: () => storyCupIntro() });
scn('C5.2', { kind: 'play', name: 'King of the Court: the draw', mode: 'kotcDraw', win: 'C5.3', loss: 'C5.3',
  winLines: [['saleem', 'Crowned! The easiest quarterfinal in the draw. Alhamdulillah.']], lossLines: [['saleem', 'Not crowned, but every win counts in the draw. No harm done.']] });
scn('C5.3', { kind: 'scene', name: 'The draw', effect: 'bracket', stage: 3, pickAfter: true, next: 'C5.4', lines: () => storyCupDrawLines() });
scn('C5.4', { kind: 'play', name: 'Ummah Cup quarterfinal', bracket: true, stakes: 'must-win', win: 'C5.5', out: 'C5.NS', loss: 'C5.NS',
  winLines: [['saleem', 'Into the semifinals of the Ummah Cup!']], lossLines: [['saleem', 'Out in the quarterfinal. We played the world, brothers. Heads up.']] });
scn('C5.5', { kind: 'scene', name: 'The last four', next: 'C5.6', lines: () => storyCupReact(0) });
scn('C5.6', { kind: 'play', name: 'Ummah Cup semifinal', bracket: true, stakes: 'must-win', win: 'C5.7', out: 'C5.NS', loss: 'C5.NS',
  winLines: [['saleem', 'THE FINAL OF THE UMMAH CUP!'], ['jamil', 'Somebody hold me up.']], lossLines: [['saleem', 'One game from the final of the world. That’s further than we dreamed.']] });
scn('C5.7', { kind: 'scene', name: 'One of the top two', next: 'C5.8', lines: () => [
  ['narr', 'The night before the final, the brothers walk to the masjid by the water for Isha, then sit on its steps until late.'],
  ...storyCupReact(1).filter(l => l[0] !== 'narr').slice(-2),
  ['saleem', 'Whatever happens tomorrow, look around. A year ago this team was six brothers and a bent rim.'],
  ['dawud', 'And chai. There was always chai.']] });
scn('C5.8', { kind: 'play', name: 'Ummah Cup final', bracket: true, stakes: 'final', win: 'C5.9', out: 'C5.NS', loss: 'C5.NS',
  winLines: [['narr', 'The final buzzer. The hall stands up.']], lossLines: [['narr', 'The final buzzer. Second in the whole world.'], ['saleem', 'Second in the world, brothers. We come back, in sha Allah.']] });
scn('C5.9', { kind: 'scene', name: 'Champions of the ummah', effect: 'title', stage: 3, next: 'C5.10', lines: () => storyTitleLines(3) });
scn('C5.10', { kind: 'scene', name: 'Home', next: 'C5.11', lines: [
  ['narr', 'Home. The gym is packed, and the kids of the weekend school are in the front row in their new classroom T-shirts.'],
  ['karim', 'Kids! Say salaam to the champions of the world!'],
  ['narr', 'Forty children shout “AS-SALAMU ALAYKUM!” at once. Ammo Jamil has to sit down.'],
  ['saleem', 'The Cup goes in the case. The real prize is in the new wing, learning Qur’an on a Saturday morning.'],
  ['ilyas', 'A kid asked me if he can be on the team one day. I told him: bend your knees.'],
  ['musa', 'I’m starting a youth league. Saturdays. Matching headbands.'], ['ilyas', '…Fine. For the kids.'],
  ['saleem', '{name}, you found a community here. Now help us build the next one. That’s how a masjid lasts.']] });
scn('C5.11', { kind: 'scene', name: 'The End', custom: 'credits', next: 'P.1', hub: true });
scn('C5.NS', { kind: 'scene', name: 'Next season', effect: 'nextSeason', next: () => C.story.cp || 'C5.1', hub: true, lines: () => storyNextSeasonLines(5) });
