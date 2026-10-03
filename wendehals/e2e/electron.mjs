// Prüft die Desktop-Version: Electron startet, das Spiel läuft, die Brücke (Beenden/Vollbild) funktioniert.
import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
// WENDEHALS_EXE: fertig gepackte App testen (z. B. release/linux-unpacked/wendehals)
const packaged = process.env.WENDEHALS_EXE;
const executablePath = packaged || require('electron');
// Frisches Profil, damit kein alter Spielstand stört
const profile = mkdtempSync(path.join(os.tmpdir(), 'wendehals-'));
const app = await electron.launch({
  executablePath,
  args: [...(packaged ? [] : [root]), '--no-sandbox', '--user-data-dir=' + profile],
  cwd: root,
  env: { ...process.env, XDG_CONFIG_HOME: profile, APPDATA: profile },
});
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.waitForFunction(() => window.__wendehals, null, { timeout: 15000 });
let failed = 0;
const check = (c, msg) => {
  console.log((c ? 'ok - ' : 'FEHLER: ') + msg);
  if (!c) failed++;
};
check(await page.evaluate(() => typeof window.wendehalsNative?.quit === 'function'), 'Desktop-Brücke vorhanden');
const labels = await page.evaluate(() => window.__wendehals.game.overlay.items.map((i) => i.label));
check(labels.includes('Beenden'), 'Titelmenü bietet "Beenden"');
const st = () => page.evaluate(() => [window.__wendehals.game.screen, window.__wendehals.game.overlay?.type, window.__wendehals.game.overlay?.title]);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
console.log('  nach Enter:', await st());
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
console.log('  nach Enter:', await st());
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
console.log('  nach Leertaste:', await st());
check((await page.evaluate(() => window.__wendehals.game.screen)) === 'level', 'Level läuft in Electron');
await page.screenshot({ path: path.join(root, 'e2e/screenshots/50-electron.png') });
await page.evaluate(() => window.wendehalsNative.setFullscreen(true));
await page.waitForTimeout(800);
const fs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
check(fs, 'Vollbild lässt sich einschalten');
check(errors.length === 0, 'keine Fehler (' + errors.join(' | ') + ')');
const proc = app.process();
const closed = new Promise((r) => proc.once('exit', () => r(true)));
await page.evaluate(() => window.wendehalsNative.quit()).catch(() => {});
const exited = await Promise.race([closed, new Promise((r) => setTimeout(() => r(false), 5000))]);
check(exited, 'Beenden schließt die App');
if (failed) process.exit(1);
console.log('Electron-Test erfolgreich.');
