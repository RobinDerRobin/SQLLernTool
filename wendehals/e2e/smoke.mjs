// End-to-End-Test im echten Browser (Chromium über Playwright):
// lädt dist/index.html per file://, spielt per Tastatur, springt über die Test-Schnittstelle
// in alle Gebiete und Bosse und prüft, dass keine Fehler auftreten. Screenshots landen in
// e2e/screenshots/ zur Sichtkontrolle.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = path.join(root, 'e2e/screenshots');
await mkdir(shots, { recursive: true });

const candidates = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

const url = pathToFileURL(path.join(root, 'dist/index.html')).href;
await page.goto(url);
await page.waitForFunction(() => window.__wendehals);
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => page.screenshot({ path: path.join(shots, name + '.png') });
const state = () => page.evaluate(() => ({ screen: window.__wendehals.game.screen, node: window.__wendehals.game.node, overlay: window.__wendehals.game.overlay?.type || null }));
let failures = 0;
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error('FEHLER: ' + msg);
  } else console.log('ok - ' + msg);
};

await wait(600);
await shot('01-titel');
check((await state()).screen === 'title', 'Titelbild erscheint');

// Neues Spiel per Tastatur
await page.keyboard.press('Enter');
await wait(200);
await shot('02-intro-dialog');
check((await state()).overlay === 'dialog', 'Intro-Dialog erscheint');
await page.keyboard.press('Enter');
await wait(300);
await shot('03-karte-start');
check((await state()).screen === 'map', 'Karte nach Neues Spiel');

// Abflug und ein paar Sekunden echtes Spielen mit gehaltener Feuertaste
await page.keyboard.press('Space');
await wait(200);
check((await state()).screen === 'level', 'Level startet mit Leertaste');
await page.keyboard.down('Space');
await page.keyboard.down('ArrowRight');
await wait(1500);
await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowDown');
await wait(1200);
await page.keyboard.up('ArrowDown');
await shot('04-level-tutorial');
await wait(2500);
await page.keyboard.up('Space');
await shot('05-level-tutorial-2');

// Pause-Menü
await page.keyboard.press('Escape');
await wait(200);
await shot('06-pause');
check((await state()).overlay === 'menu', 'Pause-Menü öffnet sich');
await page.keyboard.press('Escape');
await wait(100);
check((await state()).overlay === null, 'Pause schließt sich mit Esc');

// Über die Test-Schnittstelle in bestimmte Situationen springen
async function scenario(name, setup) {
  await page.evaluate(setup);
  await wait(900);
  await shot(name);
}


async function flyTo(node, heading, items, advanceSeconds, name, extra = '') {
  await page.evaluate(
    ({ node, heading, items, advanceSeconds, extra }) => {
      const g = window.__wendehals.game;
      g.overlay = null;
      g.dialogQueue = [];
      g.items = new Set(items);
      g.node = node;
      g.heading = heading;
      g.screen = 'map';
      g.launch();
      const lv = g.level;
      lv.invincible = true;
      const steps = Math.round(advanceSeconds * 60);
      for (let i = 0; i < steps && !lv.result; i++) lv.update(1 / 60, { fire: true, mx: 0.2, my: Math.sin(i / 40) });
      if (extra) new Function('g', 'lv', extra)(g, lv);
    },
    { node, heading, items, advanceSeconds, extra },
  );
  await wait(700);
  await shot(name);
  const s = await state();
  check(s.screen === 'level', name + ': Level läuft');
}

const ALL = ['DREHWURM', 'GUMMIHAUT', 'BOHRER', 'PILZ', 'WENDEHALS'];
// Himmelsrichtungen: 0=O 1=S 2=W 3=N
await flyTo('eier', 3, [], 6, '07-nach-norden');
await flyTo('marmelade', 1, [], 6, '08-nach-sueden');
await flyTo('tasse', 2, ['DREHWURM'], 6, '09-nach-westen');
await flyTo('marmelade', 3, [], 18, '10-stacheln');
// Stachelfelder in weiteren Flugrichtungen (Regression des Renderfehlers)
await flyTo('butter', 1, [], 22, '10b-stacheln-sued');
await flyTo('entenhafen', 1, ['DREHWURM'], 24, '10c-stacheln-sued-disco');
await flyTo('djpult', 3, ['DREHWURM'], 30, '10d-stacheln-nord-lava');
await flyTo('tasse', 1, ['DREHWURM'], 16, '11-dunkel-ohne-lampe');
await flyTo('tasse', 1, ['DREHWURM', 'LAMPE'], 16, '12-dunkel-mit-lampe');
await flyTo('kartoffelkiste', 2, ['BOHRER'], 18, '13-felswand');
await flyTo('einmachregal', 1, ['PILZ', 'DREHWURM'], 18, '14-enge-spalte');
await flyTo('stoepsel', 0, ALL, 14, '15-bad');
await flyTo('discotuer', 1, ALL, 14, '16-disco');
await flyTo('lavalampe', 3, ALL, 14, '17-uhrwerk');
await flyTo('kellertreppe', 1, ALL, 14, '18-keller');
// Bosse: Kamera ans Levelende setzen
const toBoss = 'lv.camA = lv.L - lv.va - 1; lv.player.a = lv.camA + 60; for (let i = 0; i < 60 * 6; i++) lv.update(1/60, { fire: true, my: Math.sin(i/30) });';
await flyTo('marmelade', 0, [], 1, '20-boss-kaffeekanne', toBoss);
await flyTo('seifenschale', 3, ['DREHWURM'], 1, '21-boss-walross', toBoss);
await flyTo('einmachregal', 2, ['DREHWURM'], 1, '22-boss-kartoffel', toBoss);
await flyTo('tanzflaeche', 0, ['DREHWURM'], 1, '23-boss-diva', toBoss);
await flyTo('pendel', 3, ALL, 1, '24-boss-wecker', toBoss);
// Power-Ups sichtbar
await flyTo('stoepsel', 0, ALL, 6, '25-powerups', "Object.assign(g.powers, { speed: 2, laser: true, options: 2, missile: true, shield: 3, cursor: 2 }); for (let i = 0; i < 60; i++) lv.update(1/60, { fire: true, my: Math.sin(i/10) });");
// Wendehals-Animation (Mitte der Drehung)
await flyTo('stoepsel', 0, ALL, 6, '26-wendehals-drehung', 'lv.update(1/60, { wende: true }); for (let i = 0; i < 20; i++) lv.update(1/60, {});');
// Spieler-Figuren
await flyTo('stoepsel', 0, ['OMA'], 4, '27-oma', "g.progress.character='oma'; lv.charId='oma';");
await flyTo('stoepsel', 0, ['TOASTER'], 4, '28-toaster', "g.progress.character='toaster'; lv.charId='toaster';");

// Karte mit Fortschritt und Stationsmenü
await scenario('30-karte-fortschritt', () => {
  const g = window.__wendehals.game;
  g.level = null;
  g.screen = 'map';
  g.overlay = null;
  g.items = new Set(['DREHWURM', 'GUMMIHAUT', 'LAMPE', 'OMA', 'WURST1']);
  g.progress.visited = ['toast', 'eier', 'marmelade', 'tasse', 'butter', 'stoepsel', 'seifenschale', 'duschkopf', 'handtuch', 'brotkorb', 'entenhafen'];
  g.progress.knownEdges = ['kruemelstrasse', 'marmeladenaufzug', 'butterberg', 'kaffeekraenzchen', 'abflussrohr', 'schaumbad', 'duschvorhang', 'handtuchleiste', 'waescheleine', 'kruemelfall', 'entenrennen', 'kruemelmauer'];
  g.node = 'entenhafen';
  g.heading = 1;
});
await page.keyboard.press('KeyX');
await wait(300);
await shot('31-stationsmenue');
check((await state()).overlay === 'menu', 'Stationsmenü öffnet sich');
await page.keyboard.press('Escape');

// Abspann
await scenario('32-abspann', () => {
  const g = window.__wendehals.game;
  g.startEnding();
});
await page.evaluate(() => {
  const g = window.__wendehals.game;
  g.ending.line = 3;
  g.ending.t = 2;
});
await wait(400);
await shot('33-abspann-zimmer');
await page.evaluate(() => {
  const g = window.__wendehals.game;
  g.ending.done = true;
  g.ending.t = 2;
});
await wait(300);
await shot('34-abspann-statistik');

// Gamepad-Simulation: virtuelles Pad, A drücken auf dem Titelbild
await page.evaluate(() => {
  const g = window.__wendehals.game;
  g.toTitle();
});
await page.evaluate(() => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  const pad = { id: 'Testpad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons };
  window.__pad = pad;
  navigator.getGamepads = () => [pad];
});
await page.evaluate(() => {
  window.__pad.buttons[13] = { pressed: true, value: 1 };
});
await wait(100);
await page.evaluate(() => {
  window.__pad.buttons[13] = { pressed: false, value: 0 };
});
await wait(100);
const idx = await page.evaluate(() => window.__wendehals.game.overlay.index);
check(idx === 1, 'Gamepad-Steuerkreuz bewegt die Menüauswahl');

// Lauf ohne Testschnittstelle: 20 Sekunden "Monkey"-Eingaben dürfen nichts kaputt machen
await page.evaluate(() => {
  navigator.getGamepads = () => [];
});
const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'KeyK', 'KeyL', 'KeyX', 'Escape'];
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 400; i++) {
  const k = keys[Math.floor(rnd() * keys.length)];
  if (k === 'Escape' && rnd() < 0.7) continue;
  await page.keyboard.down(k);
  await wait(20 + rnd() * 60);
  await page.keyboard.up(k);
}
await shot('40-monkey');

check(errors.length === 0, 'keine JavaScript-Fehler (' + errors.length + ')');
for (const e of errors.slice(0, 10)) console.error('  ' + e);
await browser.close();
if (failures) {
  console.error(failures + ' Prüfungen fehlgeschlagen');
  process.exit(1);
}
console.log('E2E erfolgreich.');
