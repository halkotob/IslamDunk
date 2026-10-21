// v9.2 neighbourhood: page-side helpers shared by tests/run.mjs, tests/phone-audit.mjs and scripts/review-world.mjs.
// Evaluate CAL_HELPERS (calendar-setup.js) and then WORLD_HELPERS in the page.
//   __worldPhoto(view, tod)   a frozen, deterministic frame of a view (scene + camera) at a time of day
//   WORLD_VIEWS               the views the gallery and the visual regression test cover
import { CAL_HELPERS } from './calendar-setup.js';
export const WORLD_TODS = ['morning', 'afternoon', 'dusk', 'night'];
// [name, scene, player x, player d, face]
export const WORLD_VIEWS = [
  ['home', 'home', 980, 0.42, 1],
  ['home-living', 'home', 300, 0.86, -1],
  ['street-west', 'street', 640, 0.4, 1],
  ['street-middle', 'street', 1260, 0.78, 1],
  ['street-east', 'street', 2420, 0.45, 1],
  ['masjid-front', 'masjidfront', 700, 0.35, 1],
  ['store', 'store', 640, 0.82, 1]
];
export const WORLD_HELPERS = CAL_HELPERS + `
(() => {
  const VIEWS = ${JSON.stringify(WORLD_VIEWS)};
  window.__worldDay = () => { window.__calFresh(); calSetDay(C.cal.d + 1); _achQ.length = 0; Game.toastT = 0; return C; };
  window.__worldPhoto = (view, tod) => {
    const v = VIEWS.find(q => q[0] === view); if (!v) throw new Error('no view ' + view);
    if (window.__seed) window.__seed(1234);
    if (typeof RES !== 'undefined') RES.mode = 'full';
    window.__worldDay(); const L = worldLoc(); L.tod = tod;
    World.photo = null; World.me = null;
    worldEnter(v[1], { x: v[2], d: v[3], face: v[4] }, { noFade: true });
    for (const o of World.npcs) { for (let i = 0; i < 30; i++) worldNpcStep(o, 1 / 60); o.x = o.n.x; o.d = o.n.d; o.face = o.n.face || 1; o.p.face = o.face; }
    for (let i = 0; i < 30; i++) animate(World.me, 1 / 60);
    World.camX = worldCamTarget(); World.near = worldNearest(); World.t = 0; World.banner = null;
    World.photo = { tod, freeze: true };
    return { scene: v[1], tod, camX: World.camX };
  };
})();`;
