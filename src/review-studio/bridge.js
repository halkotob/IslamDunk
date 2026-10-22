// The game frame: the real game page (game.html, storage sandboxed in memory) in a same-origin iframe, plus the
// agent (agent.game.js) evaluated in the game's own global scope. Everything the studio shows is drawn by the
// game's code through this frame.
import AGENT from './agent.game.js?raw';

export async function openGame(host) {
  const f = document.createElement('iframe');
  f.id = 'gameframe'; f.title = 'game (render worker)'; f.src = 'game.html';
  f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
  host.appendChild(f);
  await new Promise(res => f.addEventListener('load', res, { once: true }));
  const G = f.contentWindow;
  const ready = () => { try { return G.eval("typeof Game !== 'undefined' && Game.screen !== undefined && typeof Net !== 'undefined' && Net.avail !== 'checking'"); } catch (e) { return false; } };
  for (let i = 0; i < 400 && !ready(); i++) await new Promise(r => setTimeout(r, 50));
  if (!ready()) throw new Error('the game frame did not start');
  G.eval(AGENT);
  G.eval('SETTINGS.sound = false; try { localStorage.setItem("islamdunk.portraitOK", "1"); } catch (e) {}');
  const api = {
    frame: f, win: G, rs: G.__RS,
    eval: s => G.eval(s),
    errors: () => G.__studioErrors.slice(),
    canvas: () => G.document.getElementById('game'),
    // resize the frame (CSS px) and let the game lay itself out again
    async size(w, h, touch) {
      f.style.width = w + 'px'; f.style.height = h + 'px';
      await frames(G, 3);
      G.eval('Input.touchMode = ' + (touch ? 'true' : 'false'));
      await frames(G, 2);
    },
    frames: n => frames(G, n)
  };
  return api;
}
// wait for n animation frames of the game frame (falls back to timers if rAF is throttled)
export function frames(G, n = 1) {
  return new Promise(res => {
    let k = 0, done = false; const fin = () => { if (!done) { done = true; res(); } };
    const tick = () => { if (++k >= n) fin(); else G.requestAnimationFrame(tick); };
    G.requestAnimationFrame(tick); setTimeout(fin, 60 * n + 120);
  });
}
