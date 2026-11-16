// ================================================================ MUSALLA
// Walk through the partition from the gym. The people of the masjid are
// here to talk; some lines depend on the career (next opponent).
const MUS_CAST = ['dawud', 'anas', 'mufti', 'hafiz', 'karim', 'musa'];
function nextOpponent() {
  const b = C.bracket; if (!b || b.out || b.champ) return null;
  const m = ourMatch(); return m ? { id: m.a === 0 ? m.b : m.a, team: teamOf(C.stage, m.a === 0 ? m.b : m.a) } : null;
}
function cheapestProject() {
  let best = null;
  for (const p of ALL_PROJECTS) { const l = upOf(C.up, p.key); if (l < p.tiers.length && (!best || p.tiers[l][1] < best[1])) best = [p.tiers[l][0], p.tiers[l][1]]; }
  return best;
}
// v9.22: the musalla's people are the story's: Imam Dawud, Qari Anas, the Mufti, the Hafiz, Ustath Karim and Musa
const TALK = {
  dawud: {
    greet: () => C.prayBonus ? 'I saw you in the first row. May Allah accept it from you.' : 'Wa alaykum as-salam, ' + (C.name || 'akhi') + '. Sit, the chai is still warm.',
    options: [
      ['How long have you been the imam here?', () => ['Thirty-one years. I led Isha the night this was still a print shop. Twelve of us and one folding table.', 'Masjids are not built with bricks first. They are built with people who keep coming back.']],
      ['Any advice for the next game?', () => {
        const o = nextOpponent();
        if (!o) return ['Play the next possession well. Then the one after it. That is the whole secret.', 'And drink water. Old men know this.'];
        return ['Next is ' + o.team.name + '. Respect them, then beat them.', 'Shake hands before and after. Win with adab, lose with adab.'];
      }],
      ['Tell me about the chai.', () => ['Cardamom, a little ginger, and patience. You cannot rush good chai.', 'The young ones gulp it. Sip, beta. Sip.']]
    ]
  },
  anas: {
    greet: () => 'Wa alaykum as-salam. I was just revising my juz’ for tonight.',
    options: [
      ['How did you memorise the whole Quran?', () => ['One page at a time. Then that page again. Then again the next morning.', 'Consistency, brother. The same thing that makes a good free throw.']],
      ['You’re tall. Do you dunk?', () => ['Alhamdulillah, Allah made me tall. The dunking I had to learn.', 'I try not to hang on the rim. Ammo Jamil says it’s showing off.']],
      ['Will you recite something?', () => ['“Indeed, with hardship comes ease. Indeed, with hardship comes ease.” Ash-Sharh, ayat five and six.', 'Allah said it twice. So we don’t forget it.']]
    ]
  },
  mufti: {
    greet: () => 'Ah, the new brother. Wa alaykum as-salam. What is your question?',
    options: [
      ['Is it okay to play right before salah?', () => ['Play, yes. Delay salah past its time, no.', 'When the adhan comes, put the ball down. The court will still be there in fifteen minutes.']],
      ['Can we pray in sports clothes?', () => ['If your clothes are clean and cover what must be covered, yes.', 'But a man who dresses well to meet his Lord, that is beautiful too.']],
      ['Why do we make du’a for the other team?', () => ['Because they are our brothers before they are opponents.', 'The Prophet ﷺ said none of you truly believes until he loves for his brother what he loves for himself.']]
    ]
  },
  hafiz: {
    greet: () => 'As-salamu alaykum! Are you here for the halaqa or the basketball?',
    options: [
      ['Both, in sha Allah.', () => ['Good answer. Halaqa is Thursday after Maghrib. Basketball is every other day after Isha.', 'The brothers who come to both play better. I have no proof. I just believe it.']],
      ['Do you play too?', () => ['I keep score. My job is to count. I count ayat, I count points.', 'Sh. Saleem says I’m the most honest scorekeeper in the city.']],
      ['What should I memorise first?', () => ['Start with the short surahs at the end of the Quran. Al-Ikhlas, Al-Falaq, An-Nas.', 'Recite them in your salah. They stay with you that way.']]
    ]
  },
  karim: {
    greet: () => 'Wa alaykum as-salam. Excuse the papers, I’m marking the kids’ homework.',
    options: [
      ['What do you teach?', () => ['Weekend school. Quran, Arabic, and a little bit of everything. Forty-three kids.', 'We have two classrooms. One of them is the coat room.']],
      ['How’s your jump shot?', () => ['Elbow in, eyes on the rim, follow through. I teach it like grammar.', 'Subject, verb, swish.']],
      ['Say something motivating.', () => ['Every brother in this gym was a kid in somebody’s weekend school once.', 'Play like the kids are watching. They usually are.']]
    ]
  },
  musa: {
    greet: () => 'Hey! You’re the other new guy. As-salamu alaykum. Did I say it right?',
    options: [
      ['You said it perfectly.', () => ['Alhamdulillah. I took my shahadah eight months ago. Everything is still new.', 'Sometimes I still say “bless you” instead of “yarhamukAllah.”']],
      ['How did you find this masjid?', () => ['I played pickup at the park. Ilyas crossed me over so bad I had to ask where he learned it.', 'He said “the masjid.” I thought he was joking.']],
      ['Can you really dunk?', () => ['Two hands, one hand, off one foot, off two. Allah gave me legs.', 'Free throws, on the other hand… Ustath Karim is working on me.']]
    ]
  }
};
function enterMusalla() {
  if (Gym.drill || Gym.walk || Gym.fade) return;
  const me = M.players[0];
  if (ball.owner === me) { ball.owner = null; ball.state = 'loose'; ball.vx = ball.vz = ball.vy = 0; ball.y = BALL_R; }
  Gym.walk = { t: 0, to: 'musalla' };
}
function musallaBack() {
  const m = Game.mus;
  if (m && m.talk) { m.talk = null; return; }
  Game.mus = null; Game.screen = 'gym';
  const me = M.players[0]; place(me, 760, 90); me.face = 1;
}
function talkTo(i) { const id = MUS_CAST[i]; Game.mus.sel = i; Game.mus.talk = { id, mode: 'menu', idx: 0, lines: [TALK[id].greet()], li: 0 }; SFX.blip(); }
function talkChoose(k) {
  const t = Game.mus.talk, opts = TALK[t.id].options;
  if (k >= opts.length) { Game.mus.talk = null; return; }
  t.mode = 'answer'; t.lines = opts[k][1](); t.li = 0; t.idx = k; SFX.blip();
}
function talkAdvance() { const t = Game.mus.talk; if (t.li < t.lines.length - 1) t.li++; else { t.mode = 'menu'; t.lines = [t.lines[t.lines.length - 1]]; t.li = 0; } }
