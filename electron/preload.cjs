// Islam Dunk desktop: preload (runs isolated from the page). Exposes a tiny, explicit API.
// The page never gets Node or ipcRenderer itself.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('islamDunkNative', {
  platform: 'electron',
  storage: {
    load: () => ipcRenderer.sendSync('store:load'),          // { key: value } from the save file, or null on first run
    set: (k, v) => ipcRenderer.send('store:set', String(k), String(v)),
    remove: k => ipcRenderer.send('store:remove', String(k)),
    replace: items => ipcRenderer.send('store:replace', items),
    path: () => ipcRenderer.sendSync('store:path'),
  },
});
