// Desktop-Hülle (Windows / Linux / Steam Deck). Lädt das gebaute Spiel aus dist/index.html.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

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
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
