// Schmale, sichere Brücke zwischen Spiel und Desktop-Hülle.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wendehalsNative', {
  quit: () => ipcRenderer.send('wendehals:quit'),
  setFullscreen: (on) => ipcRenderer.send('wendehals:fullscreen', !!on),
});
