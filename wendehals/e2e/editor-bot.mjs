// E2E-Test Stufe 9 „Bot-Spieltest“ im echten Chromium: Knopf und Taste Z wie ein Mensch, gemessen an der Liste, am Knopf und am Plan.
// Läuft nach e2e/editor-notizen.mjs (npm run e2e:editor).
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
const liste = () => page.evaluate(() => {
  const f = document.getElementById('botfeld');
  return { sichtbar: f.style.display !== 'none', titel: f.querySelector('h3')?.textContent ?? '', zeilen: [...f.querySelectorAll('.bm')].map((b) => ({ klasse: b.className.replace('bm ', ''), text: b.textContent })) };
});
const knopfKlasse = () => page.evaluate(() => document.getElementById('b-bot').className);

await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href + '?editor');
await page.waitForFunction(() => window.__editor);
await page.waitForTimeout(300);
await ed((e) => {
  e.state.echtzeit = false;
});

// ---- Netz: alle Level werden geflogen
await ed((e) => e.wechsle('proto-netz'));
check((await liste()).sichtbar === false, 'die Liste ist am Anfang zu');
const t0 = Date.now();
await page.click('#b-bot');
let l = await liste();
const dauer = Date.now() - t0;
const anzahl = await ed((e) => e.gebiet().gaenge.length);
check(l.sichtbar && l.zeilen.length === anzahl, `Knopf zeigt die Liste: ${l.zeilen.length} Zeilen für ${anzahl} Gänge`, l.titel);
check(l.zeilen.every((z) => z.klasse === 'ok' && /^✓ angekommen: Wendehals-Level proto-netz\/[\w-]+@0 \(\d+ s\)$/.test(z.text)), 'Netz: jedes Level geflogen, Bezeichnung im Format Wendehals-Level <gebiet>/<level>@<stelle>', l.zeilen.find((z) => z.klasse !== 'ok')?.text);
check((await knopfKlasse()).includes('gut'), 'Knopf wird grün');
check(dauer < 5000, `Lauf dauert unter 5 s (hier ${dauer} ms)`);
await page.click('#b-bot');
check((await liste()).sichtbar === false, 'zweiter Klick schließt die Liste');

// ---- Beispiel per Taste Z: Diagonale wird als „noch nicht spielbar“ gemeldet, alles andere geflogen
await ed((e) => e.wechsle('beispiel'));
await page.locator('#plan canvas').hover();
await page.keyboard.press('KeyZ');
l = await liste();
check(l.sichtbar, 'Taste Z öffnet die Liste');
const nicht = l.zeilen.filter((z) => z.klasse === 'nicht-spielbar');
check(nicht.length === 1 && /diagonale/.test(nicht[0].text) && /noch nicht spielbar/.test(nicht[0].text), 'Diagonale: „noch nicht spielbar“ mit Bezeichnung, nicht still falsch geflogen', nicht.map((z) => z.text).join('|'));
check(l.zeilen.filter((z) => z.klasse === 'ok').length === l.zeilen.length - 1, 'alle übrigen Level sind geflogen');
check((await knopfKlasse()).includes('gut'), 'nicht spielbare Level machen den Knopf nicht rot');

// ---- Wand quer durch den Nordgang: Bot meldet Tod oder Steckenbleiben an der Wand
const wand = await ed((e) => {
  const g = e.gebiet();
  const gang = g.gaenge.find((x) => x.id === 'nordgang');
  const a = g.knoten.find((k) => k.id === gang.von);
  const b = g.knoten.find((k) => k.id === gang.nach);
  const waag = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  e.aendere('Wand quer', (gb) => gb.objekte.push({ id: 'oBot', typ: 'wand', x: mx, y: my, laenge: waag ? 60 : gang.breite, breite: waag ? gang.breite : 60, winkel: 0 }));
  return { s: Math.round(Math.hypot(mx - a.x, my - a.y)), n: e.gebiet().objekte.length };
});
await page.keyboard.press('KeyZ');
l = await liste();
check(/veraltet/.test(l.titel) === false && l.sichtbar, 'nach einer Änderung rechnet Z neu (Liste nicht veraltet)', l.titel);
const sz = l.zeilen.find((z) => /nordgang/.test(z.text));
check(sz && (sz.klasse === 'tod' || sz.klasse === 'stecken'), 'Wand quer: Nordgang gemeldet als gestorben/steckengeblieben', sz?.text);
const stelle = Number(/@(\d+)/.exec(sz?.text ?? '')?.[1]);
check(Math.abs(stelle - wand.s) < 120, `Bezeichnung nennt die Stelle an der Wand (${stelle} E, Wand bei ${wand.s} E)`);
check((await knopfKlasse()).includes('muss'), 'Knopf wird rot');
await page.screenshot({ path: path.join(shots, 'editor-bot.png') });

// ---- Klick auf die Meldung springt zur Stelle (Gang gewählt, Rahmen an der Stelle)
await page.locator('#botfeld .bm', { hasText: 'nordgang' }).click();
const sicht = await ed((e) => ({ auswahl: e.state.auswahl, s: e.state.fahrt?.s }));
check(sicht.auswahl?.art === 'gang' && sicht.auswahl.id === 'nordgang' && Math.abs(sicht.s - stelle) <= 1, 'Klick wählt den Gang und stellt den Rahmen an die gemeldete Stelle', JSON.stringify(sicht));

// ---- Änderung macht die Liste „veraltet“; Strg+Z macht die Wand rückgängig (Z allein nicht)
await ed((e) => e.waehle(null));
await page.keyboard.press('Control+KeyZ');
const n = await ed((e) => e.gebiet().objekte.length);
check(n === wand.n - 1, 'Strg+Z macht die Wand weiter rückgängig (Taste Z ohne Strg ist der Bot)', `Objekte ${n}`);
check(/veraltet/.test((await liste()).titel), 'nach der Änderung zeigt die Liste „veraltet“');
await page.keyboard.press('KeyZ');
l = await liste();
check(l.zeilen.every((z) => z.klasse !== 'tod' && z.klasse !== 'stecken'), 'ohne Wand fliegt der Bot wieder durch');

// ---- Welt-Ansicht: Knopf aus
await ed((e) => e.zuWelt());
check(await page.evaluate(() => document.getElementById('b-bot').disabled), 'in der Welt-Ansicht ist der Knopf aus');

check(errors.length === 0, 'keine Konsolenfehler', errors.join(' | '));
await browser.close();
if (failures) {
  console.error(`${failures} Prüfungen fehlgeschlagen`);
  process.exit(1);
}
console.log('Editor Bot-Spieltest: alles ok');
