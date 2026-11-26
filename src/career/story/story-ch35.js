// ================================================= v9.33 (refine 7): Chapters 3 to 5 under the new rules
// (docs/career-overhaul/REFINE-PLAN.md, release 7) The owner's notes on Chapters 0 to 2, applied to the rest:
// - Mini game screens: CHAI's centred letters banner, the all-star game's crowd meter and the King of the Court
//   draw's banner move into small boxes on the left. The scoreboard, the callouts and the bubbles stay.
// - Every teammate pick is a walk: the brothers stand around the gym and you talk to the one you want (the State
//   league, Nationals, the Ummah Cup draw, and the re-pick when your teammate leaves for Hajj, without him).

// ---------------------------------------------------------------- the pick is a walk, every time
function storyPickWalk(S, then, o = {}) {
  const spots = [[900, 320, -1], [980, 600, -1], [1120, 430, -1], [1180, 220, -1], [720, 600, 1], [600, 250, 1], [760, 170, 1]];
  const npcs = STORY_MATES.filter(storyPickable).map((id, i) => {
    const [x, z, face] = spots[i];
    return { id, x, z, face, act: id === 'ilyas' ? 'shoot' : id === 'dawud' ? 'chai' : 'host', onTalk: () => storyPickWalkOpen(id) };
  });
  storyWalkStart(S, { title: 'Pick your teammate', pickWalk: true, npcs, after: then, ready: o.ready,
    goals: [{ id: 'pick', label: 'Pick your teammate', touch: 'Walk up to a brother and tap Talk', key: 'Walk up to a brother, press E' }] });
}
const PICK_NEXT = 'Come talk to me when you’re ready for the next game.';
{
  // after a checkpoint's talk (C3.2, C4.1, C5.3)
  storyPickThen = function (S, then) { storyPickWalk(S, then, { ready: PICK_NEXT }); };
  // C3.14: his news, then the pick without him
  const _cs = storyChoiceStart;
  storyChoiceStart = function (S) {
    if (!S.injure) return _cs.apply(this, arguments);
    if (!C.story.injured) { C.story.injured = C.partner || 'saleem'; saveCareer(); }
    playStory(storyLinesOf(S), () => storyPickWalk(S, () => storyDone(S, 'next'), { ready: PICK_NEXT }), storyTitleOf(S));
    storyTagJournal(S);
  };
}

// ---------------------------------------------------------------- CHAI: a small box on the left
{
  const _dm = drawMiniHUD;
  drawMiniHUD = function (g) {
    const mg = M.mini;
    if (!(storyOn() && Gym.drill && Gym.drill.story && mg && mg.kind === 'horse')) return _dm.apply(this, arguments);
    const TT = Input.touchMode && g === ctx, x = 12, y = TT ? 72 : 60, w = 236, rows = [0, 1], tm = mg.phase === 'follow' && !mg.done;
    const h = 40 + rows.length * 28 + (tm ? 14 : 0) + (mg.msg && !mg.done ? 20 : 0);
    g.fillStyle = 'rgba(8,16,24,0.78)'; roundRect(g, x, y, w, h, 12); g.fill();
    g.textAlign = 'left'; g.fillStyle = GOLD; g.font = `13px ${FONT}`; g.fillText(mg.word, x + 14, y + 20);
    rows.forEach(i => {
      const yy = y + 30 + i * 28, lead = mg.leader === i;
      g.fillStyle = lead ? '#f2cf6b' : '#fff'; g.font = `12px ${FONT}`; g.fillText(fitText(g, (lead ? '▶ ' : '') + miniName(i), 96), x + 14, yy + 14);
      mg.word.split('').forEach((ch, k) => {
        const on = k < mg.letters[i], bx = x + 116 + k * 26;
        g.fillStyle = on ? '#e05a5a' : 'rgba(255,255,255,0.1)'; roundRect(g, bx, yy, 22, 18, 5); g.fill();
        g.fillStyle = on ? '#fff' : '#6d7a8c'; g.textAlign = 'center'; g.fillText(ch, bx + 11, yy + 14); g.textAlign = 'left';
      });
    });
    let yy = y + 30 + rows.length * 28 + 4;
    if (tm) { g.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(g, x + 14, yy, w - 28, 6, 3); g.fill(); g.fillStyle = mg.timer < 3 ? '#e05a5a' : '#ffcf6a'; roundRect(g, x + 14, yy, (w - 28) * clamp(mg.timer / (mg.timerLen || 10), 0, 1), 6, 3); g.fill(); yy += 14; }
    if (mg.msg && !mg.done) { g.fillStyle = '#cfd8e3'; g.font = `12px ${BODY}`; g.fillText(fitText(g, mg.msg, w - 28), x + 14, yy + 10); }
    if (mg.said) {                                                     // what he says stays a bubble over his head
      const p = M.players[mg.said.who]; if (p) { const [px, py] = P(p.x, p.y + 132, p.z); g.font = `12px ${BODY}`; const bw = g.measureText(mg.said.text).width + 20;
        g.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(g, px - bw / 2, py - 24, bw, 24, 12); g.fill(); g.fillStyle = NIGHT; g.textAlign = 'center'; g.fillText(mg.said.text, px, py - 8); }
    }
  };
}
