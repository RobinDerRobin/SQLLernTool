// E2E-Test der Bedienung des Level-Editors (Stufe 7b, Robins Anforderungen A1–A6) im echten Chromium: Maus, Rad und Tastatur wie
// ein Mensch, gemessen in Daten UND Bild. Läuft nach e2e/editor.mjs (npm run e2e:editor).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { FLOOR, FLOOR2, WALL, SCREEN_W } from '../src/editor/konstanten.js';
import { ausdehnung } from '../src/editor/daten.js';
import { GEBIETE } from '../src/editor/startdaten.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = path.join(root, 'e2e/screenshots');
await mkdir(shots, { recursive: true });
const executablePath = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
const url = pathToFileURL(path.join(root, 'dist/index.html')).href;

let failures = 0;
const check = (cond, msg, detail = '') => {
  if (!cond) {
    failures++;
    console.error('FEHLER: ' + msg + (detail ? ' – ' + detail : ''));
  } else console.log('ok - ' + msg);
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const gleich = (p, rgb, tol = 2) => p && Math.abs(p[0] - rgb[0]) <= tol && Math.abs(p[1] - rgb[1]) <= tol && Math.abs(p[2] - rgb[2]) <= tol;
const ed = (fn, arg) => page.evaluate(`(${fn.toString()})(window.__editor, ${JSON.stringify(arg ?? null)})`);
const shot = (name) => page.screenshot({ path: path.join(shots, `editor-bedienung-${name}.png`) });

await page.goto(url + '?editor');
await page.waitForFunction(() => window.__editor);
await page.waitForTimeout(300);
await ed((e) => {
  e.state.echtzeit = false;
  e.wechsle('beispiel');
  e.state.beschriftung = false;
});
check(errors.length === 0, 'Öffnen: ?editor ohne Konsolenfehler', errors.join('; '));
const box = await page.locator('#plan canvas').boundingBox();
const datenText = () => ed((e) => JSON.stringify(e.gebiet()));
const mass = () => ed((e) => e.ansicht.masstab);

// ------------------------------------------------------------------ A2 Zoom
{
  const daten0 = await datenText();
  await ed((e) => e.setzeZoom(2.2));
  const mx = box.x + 700;
  const my = box.y + 250;
  await page.mouse.move(mx, my);
  const m0 = await mass();
  const w0 = await ed((e, p) => e.ansicht.bildZuWelt(p[0], p[1]), [700, 250]);
  await page.mouse.wheel(0, -100);
  const m1 = await mass();
  check(Math.abs(m1 / m0 - 1.15) < 0.003, `A2: eine Mausrad-Raste hinein ändert den Maßstab um 15 % (${(m1 / m0).toFixed(4)})`);
  const w1 = await ed((e, p) => e.ansicht.bildZuWelt(p[0], p[1]), [700, 250]);
  const [bx, by] = await ed((e, p) => e.ansicht.weltZuBild(p[0], p[1]), w0);
  check(Math.hypot(bx - 700, by - 250) <= 1 && Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) * m1 <= 1, `A2: der Punkt unter dem Mauszeiger bleibt auf ±1 px stehen (${Math.hypot(bx - 700, by - 250).toFixed(3)} px)`);
  await page.mouse.wheel(0, 100);
  check(Math.abs((await mass()) / m0 - 1) < 0.003, 'A2: eine Raste zurück ergibt wieder den alten Maßstab');
  await page.mouse.wheel(0, 10);
  const mk = await mass();
  check(mk < m0 && mk > m0 / 1.02, `A2: Touchpad-Kleinstschritt (deltaY 10) zoomt nur anteilig (${(m0 / mk).toFixed(4)})`);
  await ed((e) => e.setzeZoom(2.2));
  // Tasten
  const mt = await mass();
  await page.keyboard.press('Equal');
  check(Math.abs((await mass()) / mt - 1.25) < 0.003, 'A2: Taste + zoomt hinein (×1,25)');
  await page.keyboard.press('Minus');
  check(Math.abs((await mass()) / mt - 1) < 0.003, 'A2: Taste − zoomt heraus');
  await page.keyboard.press('Digit1');
  check(Math.abs((await ed((e) => e.ansicht.bildschirme)) - 1) < 1e-9, 'A2: Taste 1 = ein Bildschirm');
  await page.keyboard.press('Digit2');
  check(Math.abs((await ed((e) => e.ansicht.bildschirme)) - 2.2) < 1e-9, 'A2: Taste 2 = Normalansicht 2,2');
  // „Alles“ passt ohne Stufen ein, in allen Gebieten
  for (const id of ['beispiel', 'proto-netz', 'proto-achteck']) {
    await ed((e, i) => e.wechsle(i), id);
    await page.keyboard.press('Home');
    const r = ausdehnung(GEBIETE[id]);
    const ecken = await ed((e, r2) => [[r2.x0, r2.y0], [r2.x1, r2.y0], [r2.x1, r2.y1], [r2.x0, r2.y1]].map(([x, y]) => e.ansicht.weltZuBild(x, y)), r);
    const bw = Math.max(...ecken.map((p) => p[0])) - Math.min(...ecken.map((p) => p[0]));
    const bh = Math.max(...ecken.map((p) => p[1])) - Math.min(...ecken.map((p) => p[1]));
    const anteil = Math.max(bw / box.width, bh / box.height);
    check(anteil >= 0.9 && bw <= box.width && bh <= box.height, `A2: „Alles“ (Pos1) passt ${id} ohne Stufen ein, ${(anteil * 100).toFixed(0)} % von Breite oder Höhe genutzt`);
  }
  // Zoomanzeige in Bildschirmen mit Eingabefeld
  await ed((e) => e.wechsle('beispiel'));
  await ed((e) => e.setzeZoom(2.2));
  check((await page.inputValue('#zoomfeld')) === '2,2', 'A2: Zoomanzeige zeigt Bildschirme („2,2“)', await page.inputValue('#zoomfeld'));
  await page.fill('#zoomfeld', '4,5');
  await page.keyboard.press('Enter');
  check(Math.abs((await ed((e) => e.ansicht.bildschirme)) - 4.5) < 1e-9, 'A2: Eingabefeld setzt den Zoom (4,5 Bildschirme)');
  check((await page.inputValue('#zoomfeld')) === '4,5', 'A2: Anzeige folgt dem Eingabefeld');
  await page.mouse.move(mx, my);
  await page.mouse.wheel(0, -100);
  check((await page.inputValue('#zoomfeld')) === '3,91', 'A2: Anzeige folgt auch dem Mausrad (4,5 / 1,15 = 3,91)', await page.inputValue('#zoomfeld'));
  await page.fill('#zoomfeld', 'viel');
  await page.keyboard.press('Enter');
  check(/Zahl/.test(await page.locator('#melden').textContent()), 'A2: unsinnige Eingabe im Zoomfeld → verständliche Meldung');
  await ed((e) => e.melde(''));
  await page.keyboard.press('Digit2');
  check((await datenText()) === daten0, 'A2: Zoomen ändert keine Daten');
  await shot('a2-zoom');
}

// ------------------------------------------------------------------ Fehler: „Spielen ab hier“ bei gerader Gang neben Diagonale
{
  await ed((e) => {
    e.wechsle('beispiel');
    e.waehle({ art: 'gang', id: 'schleuse' });
    e.setzeFahrt(400);
  });
  const daten0 = await datenText();
  await page.click('#b-spielen');
  await page.waitForSelector('#spiel-canvas', { timeout: 3000 });
  check(await ed((e) => e.state.spielen.aktiv), 'Spielen ab hier: die gerade „Schleuse“ startet, obwohl ein anderer Gang im Gebiet diagonal ist');
  const px = await page.evaluate(() => {
    const c = document.getElementById('spiel-canvas');
    const k = c.width / 480;
    const p = (x, y) => Array.from(c.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data);
    return { boden: p(330, 135), wand: p(330, 20) };
  });
  check((gleich(px.boden, hex(FLOOR)) || gleich(px.boden, hex(FLOOR2))) && gleich(px.wand, hex(WALL)), 'Spielen ab hier: im Bild Gangboden und darüber Wand');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#spiel-canvas', { state: 'detached' });
  check((await datenText()) === daten0 && (await ed((e) => e.state.auswahl))?.id === 'schleuse', 'Spielen ab hier: Esc führt zurück, Daten und Auswahl unverändert');
  await ed((e) => e.waehle({ art: 'gang', id: 'diagonale' }));
  await page.click('#b-spielen');
  const m = await page.locator('#melden').textContent();
  check(/Noch nicht spielbar/.test(m) && (await page.locator('#spiel-canvas').count()) === 0, 'Spielen ab hier: der diagonale Gang selbst bleibt „Noch nicht spielbar“', m);
  await ed((e) => e.melde(''));
}

check(errors.length === 0, 'Bedienung: keine Konsolenfehler', errors.join('; '));
await browser.close();
if (failures) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Bedienungs-Prüfungen bestanden.');
