// Desktop-Hülle (Windows / Linux / Steam Deck). Lädt das gebaute Spiel aus dist/index.html.
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Linux-AppImage / Steam (Deck): Die Chromium-Prozess-Sandbox (setuid chrome-sandbox bzw.
// User-Namespaces) lässt sich dort nicht einrichten – das Programm würde sofort beenden.
// Die Sandbox der Webinhalte (webPreferences.sandbox) bleibt aktiv; das Spiel lädt nur die
// lokale Datei und blockiert jede Navigation.
if (process.platform === 'linux' && (process.env.APPIMAGE || process.env.SteamDeck || process.env.SteamGameId || process.env.SteamAppId)) {
  app.commandLine.appendSwitch('no-sandbox');
}

// Im Steam-Deck-Spielmodus setzt Steam die Umgebungsvariable SteamDeck=1.
const startFullscreen = process.argv.includes('--fullscreen') || process.env.SteamDeck === '1';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 270,
    fullscreen: startFullscreen,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: 'Wendehals',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);
  // Standard: Prototyp (P1). WENDEHALS_SPIEL=1 öffnet das alte v0.2-Spiel (für e2e/electron.mjs).
  // WENDEHALS_EDITOR=1 startet den Level-Editor (Paket 13, `npm run editor`).
  const query = process.env.WENDEHALS_EDITOR ? { editor: '1' } : process.env.WENDEHALS_TESTMENUE ? { testmenue: '1' } : process.env.WENDEHALS_SPIEL ? { spiel: '1' } : undefined;
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), query ? { query } : undefined);
  // Externe Links/Navigation verhindern – das Spiel braucht kein Internet.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  // Editor: beforeunload mit ungespeicherten Änderungen würde das Fenster sonst ohne Dialog festhalten.
  win.webContents.on('will-prevent-unload', (e) => {
    const wahl = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['Zurück zum Editor', 'Ohne Speichern schließen'], defaultId: 0, cancelId: 0, message: 'Es gibt ungespeicherte Änderungen.' });
    if (wahl === 1) e.preventDefault(); // preventDefault hebt hier das Festhalten auf
  });
  return win;
}

ipcMain.on('wendehals:quit', () => app.quit());
ipcMain.on('wendehals:fullscreen', (e, on) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFullScreen(!!on);
});

// Level-Editor (WENDEHALS_EDITOR=1): Leveldateien lesen und schreiben – ausschließlich in wendehals/levels/ (welt.json und gebiete/<id>.json).
// Ohne die Umgebungsvariable gibt es diese Kanäle nicht; das Spiel kann nie Dateien schreiben.
if (process.env.WENDEHALS_EDITOR) {
  const levelsDir = path.join(__dirname, '..', 'levels');
  const erlaubt = (rel) => typeof rel === 'string' && /^(welt\.json|gebiete\/[a-z0-9][a-z0-9_-]*\.json)$/.test(rel);
  ipcMain.handle('wendehals:levels-alle', () => {
    const welt = fs.readFileSync(path.join(levelsDir, 'welt.json'), 'utf8');
    const gebiete = {};
    for (const g of JSON.parse(welt).gebiete) {
      if (!erlaubt(g.datei)) continue;
      try {
        gebiete[g.id] = fs.readFileSync(path.join(levelsDir, g.datei), 'utf8');
      } catch {
        // fehlende Datei: Gebiet fehlt, der Rest wird trotzdem geladen
      }
    }
    return { welt, gebiete };
  });
  ipcMain.handle('wendehals:levels-schreibe', (e, rel, text) => {
    if (!erlaubt(rel) || typeof text !== 'string' || text.length > 5e6) throw new Error('Nur welt.json und gebiete/<id>.json im Ordner levels/ dürfen geschrieben werden.');
    const ziel = path.join(levelsDir, rel);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel + '.tmp', text); // erst daneben schreiben, dann ersetzen: eine abgebrochene Speicherung zerstört nie die alte Datei
    fs.renameSync(ziel + '.tmp', ziel);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
