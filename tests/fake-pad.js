// v8.7.0: a scripted gamepad for tests. navigator.getGamepads() returns window.__pads; __padSet(i, {A: true, axes: [x, y]})
// holds buttons (by standard-mapping name) and the left stick until changed; __padPlug(i, on) connects / disconnects.
export const FAKE_PAD_INIT = `(() => {
  const NAMES = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  window.__rumble = [];
  const make = i => ({ index: i, id: 'Test pad ' + i + ' (STANDARD GAMEPAD)', mapping: 'standard', connected: true, timestamp: 0,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    vibrationActuator: { type: 'dual-rumble', playEffect: (t, o) => { window.__rumble.push(Object.assign({ pad: i }, o)); return Promise.resolve('complete'); } } });
  window.__pads = [null, null, null, null];
  Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads.slice(), configurable: true });
  window.__padPlug = (i, on) => { const g = on ? make(i) : window.__pads[i]; window.__pads[i] = on ? g : null; if (g) { g.connected = !!on; const e = new Event(on ? 'gamepadconnected' : 'gamepaddisconnected'); e.gamepad = g; dispatchEvent(e); } };
  window.__padSet = (i, s) => { const g = window.__pads[i]; if (!g) return; for (const k in NAMES) { const v = !!s[k]; g.buttons[NAMES[k]] = { pressed: v, touched: v, value: v ? 1 : 0 }; } g.axes = (s.axes || [0, 0]).concat([0, 0]); g.timestamp++; };
})();`;
