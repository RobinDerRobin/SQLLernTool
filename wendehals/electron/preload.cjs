// Schmale, sichere Brücke zwischen Spiel und Desktop-Hülle.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wendehalsNative', {
  quit: () => ipcRenderer.send('wendehals:quit'),
  setFullscreen: (on) => ipcRenderer.send('wendehals:fullscreen', !!on),
  // Nur im Editor-Modus gibt es dahinter Handler (electron/main.cjs); sonst schlagen die Aufrufe fehl.
  levels: {
    alle: () => ipcRenderer.invoke('wendehals:levels-alle'),
    schreibe: (rel, text) => ipcRenderer.invoke('wendehals:levels-schreibe', rel, text),
  },
});
