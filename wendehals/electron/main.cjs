// Desktop-Hülle (Windows / Linux / Steam Deck). Lädt das gebaute Spiel aus dist/index.html.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

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
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), process.env.WENDEHALS_SPIEL ? { query: { spiel: '1' } } : undefined);
  // Externe Links/Navigation verhindern – das Spiel braucht kein Internet.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  return win;
}

ipcMain.on('wendehals:quit', () => app.quit());
ipcMain.on('wendehals:fullscreen', (e, on) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFullScreen(!!on);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
