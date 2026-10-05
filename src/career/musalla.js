// ================================================================ MUSALLA
// Walk through the partition from the gym. Four people from the masjid are
// here to talk; lines depend on the career (next opponent, record, projects).
const MUS_CAST = ['saleem', 'mahmoud', 'rafiq', 'khalil'];
function nextOpponent() {
  const b = C.bracket; if (!b || b.out || b.champ) return null;
  const m = ourMatch(); return { id: m.a === 0 ? m.b : m.a, team: teamOf(C.stage, m.a === 0 ? m.b : m.a) };
}
function cheapestProject() {
  let best = null;
  for (const p of ALL_PROJECTS) { const l = upOf(C.up, p.key); if (l < p.tiers.length && (!best || p.tiers[l][1] < best[1])) best = [p.tiers[l][0], p.tiers[l][1]]; }
  return best;
}
const TALK = {
  saleem: {
    greet: () => C.prayBonus ? 'I saw you at salah. May Allah accept it. You\u2019ll feel it in your legs next game, in sha Allah.' : 'Wa alaikum assalam, ' + (C.name || 'brother') + '. Sit with me for a minute.',
    options: [
      ['Any advice for our next game?', () => {
        const o = nextOpponent();
        if (C.bracket.champ) return ['We have nothing left to win, alhamdulillah. So now we play for the joy of it.'];
        if (!o) return ['We\u2019re out of this tournament for now. That\u2019s fine. Enter again when you feel ready.', 'Work on your free throws. Close games are won at the line.'];
        if (o.id === 1) return ['Al-Burhan. Jalal will want to prove himself.', 'Stay between him and the rim, and don\u2019t bite on his first move. Patience wins that matchup.'];
        const s = o.team.players.reduce((a, p) => { for (const k in p.stats) a[k] = (a[k] || 0) + p.stats[k]; return a; }, {});
        const top = ['sht', 'dnk', 'spd', 'def'].sort((a, b) => s[b] - s[a])[0];
        const tip = { sht: 'They shoot well from outside. Close out on shooters and don\u2019t leave anyone open for three.',
          dnk: 'They love attacking the rim. Wall up near the basket and time your jumps.', spd: 'They\u2019re quick. Sprint back on defense after every shot.',
          def: 'Their defense is tough. Move the ball. The open man will be there.' }[top];
        return ['Next is ' + o.team.name + ' from ' + o.team.place + '.', tip];
      }],
      ['How do I stay humble after a win?', () => ['Remember who gave you the win. Say alhamdulillah, and mean it.', 'Then thank the brother who set the screen. Nobody scores alone.']],
      ['Tell me about this masjid.', () => {
        const l = masjidLevel();
        if (l === 0) return ['When we started, this was an old print shop. Twelve brothers, one folding table, and a lot of du\u2019a.', 'Take care of it, and it will take care of the community.'];
        if (l < 9) return ['Every project we finish brings more families through the door.', 'I saw three new faces at Fajr this week. Alhamdulillah.'];
        return ['Subhanallah. I remember the print shop. Now the parking lot is full on a Tuesday.', 'The building is beautiful, but the people are the masjid.'];
      }]
    ]
  },
  mahmoud: {
    greet: () => 'Ah, the star player! Come, come, sit.',
    options: [
      ['Tell me about 1987.', () => ['It was a cold night. The heater was broken. I scored forty points.', 'Or thirty. It was a long time ago. But it was a lot of points, beta.']],
      ['Any shooting tips, uncle?', () => ['Hold the shot until the top of your jump, then let it go. Smooth, like pouring chai.',
        C.best.ft >= 7 ? 'And your free throws are good now. ' + C.best.ft + ' out of 10. I am proud.' : 'And practice your free throws. ' + C.best.ft + ' out of 10 is a start, not a finish.']],
      ['How is your knee?', () => ['My knee says no. My heart says yes. My wife says sit down.', 'So I sit, and I cheer very loudly.']]
    ]
  },
  rafiq: {
    greet: () => 'Assalamu alaikum, beta. Adab first, then basketball.',
    options: [
      ['What does adab look like on the court?', () => ['Shake hands before and after. Help the other team up when they fall.', 'And no shoving. Turbo is for running, not for pushing brothers into the bleachers.']],
      ['I get frustrated when we lose.', () => ['Frustration means you care. Good. Turn it into practice, not anger.', 'Sabr isn\u2019t sitting still. It\u2019s working without complaining.']],
      ['Why stop practice for salah?', () => ['Because salah is the appointment. Practice can wait fifteen minutes.', 'And you come back calmer. That\u2019s good for your free throws too.']]
    ]
  },
  khalil: {
    greet: () => C.wins > C.losses ? 'Brooo, we are rolling! What\u2019s up?' : 'Hey! Don\u2019t worry about the record, we\u2019re just warming up.',
    options: [
      ['How do we beat Al-Burhan?', () => ['Honestly? Box out. Jalal never boxes out.', 'Also, pass it to me. Kidding. Pass it to the open guy. Unless it\u2019s me.']],
      ['What should the masjid build next?', () => {
        const p = cheapestProject();
        if (!p) return ['We built everything! Maybe a second minaret? Kidding. Mostly.'];
        return ['I vote for the ' + p[0].toLowerCase() + '. It costs ' + p[1] + ' Halal Bucks.', C.hb >= p[1] ? 'We have ' + C.hb + ' right now. Just saying.' : 'We have ' + C.hb + '. Win a few more games first.'];
      }],
      ['Say something motivating.', () => [pick(['The rim doesn\u2019t know how big our masjid is. Shoot your shot, bismillah.', 'Small masjid, big barakah. Let\u2019s go!', 'Every uncle in this masjid is praying for us. Literally. I asked them.'])]]
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
