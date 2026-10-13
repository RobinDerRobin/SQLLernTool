// E2E-Test Stufe 10 „Varianten nebeneinander“ im echten Chromium: Knopf und Taste Y, Dateien über den Dateiwähler, gemessen an Kacheln, Pixeln und Daten.
// Läuft nach e2e/editor-bot.mjs (npm run e2e:editor).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
let failures = 0;
const check = (cond, msg, detail = '') => {
  if (!cond) {
    failures++;
    console.error('FEHLER: ' + msg + (detail ? ' – ' + detail : ''));
  } else console.log('ok - ' + msg);
};
const ed = (fn, arg) => page.evaluate(`(${fn.toString()})(window.__editor, ${JSON.stringify(arg ?? null)})`);

const gebietJetzt = () => ed((e) => JSON.stringify(e.gebiet()));
const kacheln = () => page.evaluate(() => [...document.querySelectorAll('#variantenfeld .vkachel')].map((k) => ({ id: k.dataset.variante, name: k.querySelector('.vname').textContent, diff: k.querySelector('.vdiff')?.textContent ?? '', pruefer: k.querySelectorAll('.vzahlen')[1]?.textContent ?? '' })));
const feldSichtbar = () => page.evaluate(() => document.getElementById('variantenfeld').style.display !== 'none');
// Pixel-Summe einer Kachelvorschau: ein Bild, das nicht leer (alles Wandfarbe) ist
const bunt = (n) => page.evaluate((i) => {
  const c = document.querySelectorAll('#variantenfeld .vkachel canvas')[i];
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const farben = new Set();
  for (let p = 0; p < d.length; p += 4 * 97) farben.add(d[p] + ',' + d[p + 1] + ',' + d[p + 2]);
  return farben.size;
}, n);

await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href + '?editor');
await page.waitForFunction(() => window.__editor);
await page.waitForTimeout(300);
await ed((e) => { e.state.echtzeit = false; });
await ed((e) => e.wechsle('proto-netz'));
const original = await gebietJetzt();
check((await feldSichtbar()) === false, 'Fenster ist am Anfang zu');

// ---- Taste Y öffnet, Esc schließt
await page.locator('#plan canvas').hover();
await page.keyboard.press('KeyY');
check(await feldSichtbar(), 'Taste Y öffnet das Varianten-Fenster');
let k = await kacheln();
check(k.length === 1 && k[0].id === 'aktuell', 'ohne Varianten nur die Kachel „Aktuell“', JSON.stringify(k));
check((await bunt(0)) > 3, 'Vorschau des aktuellen Gebiets zeigt Boden und Wand (mehrere Farben)');
await page.keyboard.press('Escape');
check((await feldSichtbar()) === false, 'Esc schließt das Fenster');
await page.click('#b-varianten');
check(await feldSichtbar(), 'Knopf „Varianten“ öffnet es wieder');

// ---- Dateien über den Dateiwähler: zwei gültige, eine kaputte, nebeneinander
const mitWand = JSON.parse(original);
mitWand.objekte.push({ id: 'oVar', typ: 'wand', x: 200, y: 0, laenge: 60, breite: 20, winkel: 0 });
const ohneGang = JSON.parse(original);
ohneGang.gaenge.pop();
await ed((e) => e.state.speicher.setzeArt('download')); // Dateiwähler statt File-System-Access-Dialog (der ist in Chromium ohne Kopf nicht bedienbar)
const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#b-v-laden')]);
check(fc.isMultiple(), 'Dateiwähler erlaubt mehrere Dateien');
await fc.setFiles([
  { name: 'mit-wand.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mitWand)) },
  { name: 'ohne-gang.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(ohneGang)) },
  { name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from('{ kaputt') },
]);
await page.waitForTimeout(300);
k = await kacheln();
check(k.length === 3 && k.map((x) => x.name).join('|').includes('mit-wand') && k.map((x) => x.name).join('|').includes('ohne-gang'), 'zwei gültige Varianten liegen neben dem aktuellen Stand', JSON.stringify(k));
const meldung = await page.locator('#vmeldung').textContent(); // steht im Fenster selbst (die untere Leiste ist zu schmal)
check(meldung.includes('kaputt.json') && meldung.includes('kein gültiges JSON'), 'kaputte Datei: verständliche Meldung, die anderen sind trotzdem da', meldung);
check((await gebietJetzt()) === original, 'Laden und Ansehen ändert keine Daten');
check(k[1].diff.includes('+1 Objekte') && k[2].diff.includes('−1 Gänge'), 'Unterschied zum aktuellen Gebiet steht an der Kachel', k.map((x) => x.diff).join(' / '));
check((await bunt(1)) > 3 && (await bunt(2)) > 3, 'Vorschauen der Varianten sind gezeichnet');

// ---- Übernehmen: Gebiet bekommt den Inhalt, ID/Name bleiben, Strg+Z stellt her
const idVorher = await ed((e) => e.gebiet().id + '|' + e.gebiet().name);
await page.click('[data-variante="v1"] button:has-text("Übernehmen")');
const nachher = JSON.parse(await gebietJetzt());
check(nachher.objekte.some((o) => o.id === 'oVar'), 'Übernehmen: die Wand der Variante ist im Gebiet');
check(nachher.id + '|' + nachher.name === idVorher, 'Übernehmen: ID und Name des Gebiets bleiben');
check((await page.locator('#stand').textContent()).includes('ungespeichert'), 'Übernehmen: Anzeige „ungespeichert“');
check((await page.locator('#b-undo').textContent()).includes('Variante „mit-wand“ übernehmen'), 'Rückgängig-Knopf nennt die Aktion');
await page.keyboard.press('Control+KeyZ');
check((await gebietJetzt()) === original, 'Strg+Z: exakt der Zustand von vorher');
await page.keyboard.press('Control+KeyY');
check(JSON.parse(await gebietJetzt()).objekte.some((o) => o.id === 'oVar'), 'Strg+Y: wieder übernommen');
await page.keyboard.press('Control+KeyZ');

// ---- Entfernen und Gebietswechsel
await page.click('[data-variante="v2"] button:has-text("Entfernen")');
check((await kacheln()).length === 2, 'Entfernen nimmt die Kachel heraus');
check((await gebietJetzt()) === original, 'Entfernen ändert keine Daten');
await ed((e) => e.wechsle('beispiel'));
check((await kacheln()).length === 1, 'Gebietswechsel: Varianten gehören zum Gebiet und sind weg');

// ---- Fenster ist modal: Strg+A und Entf wirken nicht auf das verdeckte Gebiet; die Meldung steht im Fenster
const vorTasten = await gebietJetzt();
await page.keyboard.press('Control+KeyA');
await page.keyboard.press('Delete');
await page.keyboard.press('KeyG');
check((await gebietJetzt()) === vorTasten, 'bei offenem Fenster ändern Strg+A, Entf und G nichts am Gebiet');
check((await page.locator('#vmeldung').textContent()).includes('Varianten-Fenster ist offen'), 'Hinweis steht im Fenster selbst');
// ---- kaputte Datei bei vollen Plätzen: richtige Ursache, Meldung im Fenster
await ed((e) => {
  const t = JSON.stringify(e.gebiet());
  for (let i = 0; i < 6; i++) e.variantenAufnehmen([{ name: `fuell${i}.json`, text: t }]);
  e.variantenAufnehmen([{ name: 'kaputt2.json', text: '{ kaputt' }]);
});
const vm = await page.locator('#vmeldung').textContent();
check(vm.includes('kaputt2.json') && vm.includes('kein gültiges JSON'), 'kaputte Datei bei vollen Plätzen: Ursache ist die Datei, nicht die Grenze', vm);
check((await kacheln()).length === 5, 'höchstens 4 Varianten neben dem aktuellen Stand');
check(await page.evaluate(() => document.querySelector('#variantenfeld .vkachel:nth-child(2) button').disabled), 'Übernehmen ist bei identischer Variante aus');
while ((await kacheln()).length > 1) await page.click('#variantenfeld .vkachel:nth-child(2) button:has-text("Entfernen")');

// ---- Übergangsknoten: Hinweis an der Kachel und Warnung nach dem Übernehmen (beispiel/K5 hat einen Übergang)
await ed((e) => {
  const v = JSON.parse(JSON.stringify(e.gebiet()));
  const k = v.knoten.find((x) => x.id === 'K5');
  k.x += 100;
  e.variantenAufnehmen([{ name: 'k5-verschoben.json', text: JSON.stringify(v) }]);
});
check((await kacheln()).find((x) => x.id === 'v4' || x.id?.startsWith('v'))?.diff.includes('Übergangsknoten K5'), 'Kachel warnt vor dem Ändern des Übergangsknotens K5');
await page.click('[data-variante^="v"] button:has-text("Übernehmen")');
check((await page.locator('#melden').textContent()).includes('Knoten mit Übergang') , 'Übernehmen meldet den betroffenen Übergangsknoten');
await page.keyboard.press('Control+KeyZ');

// ---- Welt-Ansicht: Knopf aus, Fenster zu
await ed((e) => e.zuWelt());
check(await page.evaluate(() => document.getElementById('b-varianten').disabled), 'in der Welt-Ansicht ist der Knopf aus');
check((await feldSichtbar()) === false, 'in der Welt-Ansicht ist das Fenster zu');
await page.screenshot({ path: path.join(shots, 'editor-varianten.png') });

check(errors.length === 0, 'keine Konsolenfehler', errors.join(' | '));
await browser.close();
if (failures) {
  console.error(`${failures} Prüfungen fehlgeschlagen`);
  process.exit(1);
}
console.log('Editor Varianten: alles ok');
