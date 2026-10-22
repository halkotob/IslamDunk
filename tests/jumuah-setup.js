// v9.4 Jumu'ah: page-side helpers shared by tests/run.mjs, tests/phone-audit.mjs and scripts/review-jumuah.mjs.
// Evaluate JUMUAH_HELPERS in the page (it includes CAL_HELPERS and WORLD_HELPERS).
//   __jumFriday(learnedAll)   a new career on its next free Friday, at the masjid front by the door (morning)
//   __jumPhoto(stage)         a frozen frame of the scene: 'ask' (the question at the door), 'open', 'talk' (the
//                             second reminder), 'long' (the longest reminder any talk can have), 'card' (the
//                             "touched on" card)
import { WORLD_HELPERS } from './world-setup.js';
export const JUMUAH_STAGES = ['ask', 'open', 'talk', 'long', 'card'];
export const JUMUAH_HELPERS = WORLD_HELPERS + `
(() => {
  window.__jumFriday = learnedAll => {
    if (window.__seed) window.__seed(777);
    window.__worldDay();
    let d = C.cal.d; while (calWd(d) !== CAL_FRIDAY || d === calGameDay() || calDay(d).type === DAY_TYPE.GAME) d++;
    calSetDay(d);
    if (learnedAll) C.learned = TRIVIA.map((_, i) => i);
    const L = worldLoc(); L.tod = 0;
    worldEnter('masjidfront', { x: 750, d: 0.06, face: 1 }, { noFade: true });
    World.camX = worldCamTarget(); World.near = worldNearest(); World.banner = null; _achQ.length = 0; Game.toastT = 0;
    return { d, fri: calDay(d).fri, type: calDay(d).type };
  };
  window.__jumPhoto = stage => {
    if (typeof RES !== 'undefined') RES.mode = 'full';
    window.__jumFriday();
    if (stage === 'ask') { jumuahAsk(); World.photo = { tod: 0, freeze: true }; Game.trans = 0; return Game.screen; }
    jumuahTalk().answered = 2; openJumuah(); const J = Game.jum; J.fade = 0;
    if (stage === 'talk') { jumShow(0); jumShow(1); }
    if (stage === 'long') { const all = jumuahEligible().map(i => jumuahLine(i, 0, 3)); J.lines[0] = all.reduce((a, b) => b.length > a.length ? b : a); jumShow(0); }
    if (stage === 'card') { for (let k = 0; k < J.lines.length; k++) jumShow(k); J.card = true; }
    J.photo = true; J.t = 0; _achQ.length = 0; Game.toastT = 0; Game.trans = 0;
    return Game.screen;
  };
})();`;
