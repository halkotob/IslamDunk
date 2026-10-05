// Islam Dunk desktop: save bridge, inlined before the game script in the Electron build only.
// The game reads and writes localStorage synchronously. On desktop the save FILE is the source of
// truth: before the game runs, its contents are copied into localStorage, and every later
// localStorage write is mirrored to the file. On first run with an empty file, whatever localStorage
// already holds is written to the file (keeps progress from older desktop builds). The web build
// does not include this script and keeps using localStorage only.
(function () {
  'use strict';
  var N = window.islamDunkNative;
  if (!N || !N.storage) return;
  var ls;
  try { ls = window.localStorage; } catch (e) { return; }
  var P = Storage.prototype, set = P.setItem, rem = P.removeItem, clr = P.clear;
  try {
    var items = N.storage.load();
    if (items) {
      clr.call(ls);
      for (var k in items) if (Object.prototype.hasOwnProperty.call(items, k)) set.call(ls, k, items[k]);
    } else {
      var all = {};
      for (var i = 0; i < ls.length; i++) { var key = ls.key(i); all[key] = ls.getItem(key); }
      N.storage.replace(all);
    }
  } catch (e) { console.warn('[islamdunk] save file unavailable, using localStorage only', e); return; }
  P.setItem = function (k, v) { set.call(this, k, v); if (this === ls) N.storage.set(k, String(v)); };
  P.removeItem = function (k) { rem.call(this, k); if (this === ls) N.storage.remove(k); };
  P.clear = function () { clr.call(this); if (this === ls) N.storage.replace({}); };
})();
