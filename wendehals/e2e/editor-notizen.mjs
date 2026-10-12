// E2E-Test Stufe 8 „Notizen und Stempel“ im echten Chromium: Maus und Tastatur wie ein Mensch, gemessen in Daten UND Bild.
// Läuft nach e2e/editor-bedienung.mjs (npm run e2e:editor). Robins Anforderungen A1 (Rechtsklick setzt), A5 (Strg+Z/Y), A7 (Rechtsklick bei Auswahl).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { NOTIZ_STANDARD, FARBEN } from '../src/editor/konstanten.js';
import { formatiereStempel, ladeStempel } from '../src/editor/stempel.js';

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
const RECHTS = { button: 'right' };

await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href + '?editor');
await page.waitForFunction(() => window.__editor);
await page.waitForTimeout(300);
await ed((e) => {
  e.state.echtzeit = false;
  e.wechsle('beispiel');
  e.waehle(null);
  e.alles();
});
const box = await page.locator('#plan canvas').boundingBox();
const bild = async ([x, y]) => {
  const [px, py] = await ed((e, p) => e.ansicht.weltZuBild(p[0], p[1]), [x, y]);
  return [box.x + px, box.y + py];
};
const klick = async (w, opts = {}) => {
  const [x, y] = await bild(w);
  await page.mouse.click(x, y, opts);
};
const notizen = () => ed((e) => JSON.parse(JSON.stringify(e.gebiet().notizen)));
const datenText = () => ed((e) => JSON.stringify(e.gebiet()));
const pixel = (w) => ed((e, p) => {
  const c = document.querySelector('#plan canvas');
  const [bx, by] = e.ansicht.weltZuBild(p[0], p[1]);
  const k = c.width / e.ansicht.w;
  return Array.from(c.getContext('2d').getImageData(Math.round(bx * k), Math.round(by * k), 1, 1).data);
}, w);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const nah = (p, rgb, tol = 6) => p && rgb.every((v, i) => Math.abs(p[i] - v) <= tol);

// ------------------------------------------------------------------ Notiz setzen (A1: Rechtsklick), Text schreiben
const daten0 = await datenText();
const anzahl0 = (await notizen()).length;
await klick([1000, 300]); // Linksklick ins Leere setzt nie etwas
check((await datenText()) === daten0, 'A1: Linksklick mit Notiz-Werkzeug ändert nichts');
await page.click('#n-notiz');
check(await ed((e) => e.state.werkzeug === 'notiz'), 'Palette: Klick auf das Notiz-Bild wählt das Notiz-Werkzeug (Rechtsklick setzt)');
await klick([1000, 300]);
check((await datenText()) === daten0, 'A1: Linksklick setzt auch mit gewähltem Notiz-Werkzeug keine Notiz');
await klick([1000, 300], RECHTS);
let ns = await notizen();
check(ns.length === anzahl0 + 1, 'Rechtsklick setzt eine Notiz', JSON.stringify(ns));
const neu = ns.at(-1);
check(neu.text === NOTIZ_STANDARD && neu.x === 1000 && neu.y === 300, `Notiz liegt im Raster mit Standardtext (${neu.x}|${neu.y})`);
check(await ed((e) => e.state.auswahl?.art === 'notiz'), 'die neue Notiz ist gewählt');
check((await page.evaluate(() => document.activeElement?.id)) === 'f-text', 'der Cursor steht im Textfeld der neuen Notiz');
const p = await pixel([1000, 300]);
check(nah(p, hex(FARBEN.notiz)) || nah(p, hex(FARBEN.auswahl)), `Bild: die Notiz ist gezeichnet (${p.slice(0, 3)})`);
await page.keyboard.type('Hier Rampe zur Schleuse');
await page.keyboard.press('Enter');
ns = await notizen();
check(ns.at(-1).text === 'Hier Rampe zur Schleuse', 'Text getippt und mit Enter übernommen');
await page.keyboard.press('Control+KeyZ');
check((await notizen()).at(-1).text === NOTIZ_STANDARD, 'A5: Strg+Z nimmt die Textänderung zurück');
await page.keyboard.press('Control+KeyY');
check((await notizen()).at(-1).text === 'Hier Rampe zur Schleuse', 'A5: Strg+Y stellt sie wieder her');
await page.fill('#f-text', '   ');
await page.keyboard.press('Enter');
check((await notizen()).at(-1).text === 'Hier Rampe zur Schleuse' && /Text/.test(await page.locator('#melden').textContent()), 'leerer Text wird abgelehnt, alter Text bleibt, verständliche Meldung');
await page.screenshot({ path: path.join(shots, 'editor-notizen-gesetzt.png') });

// ------------------------------------------------------------------ Notiz wählen, verschieben, löschen
await ed((e) => { e.setzeWerkzeug('auswahl'); e.waehle(null); });
await klick([1000, 300]);
check(await ed((e) => e.state.auswahl?.art === 'notiz' && e.state.auswahl.id === e.gebiet().notizen.at(-1).id), 'Linksklick wählt die Notiz');
await page.keyboard.press('ArrowRight');
check((await notizen()).at(-1).x === 1020, 'Pfeil rechts verschiebt die Notiz um 20 E');
await page.keyboard.press('Delete');
check((await notizen()).length === anzahl0, 'Entf löscht die Notiz');
await page.keyboard.press('Control+KeyZ');
check((await notizen()).length === anzahl0 + 1, 'A5: Strg+Z holt sie zurück');
await page.keyboard.press('Control+KeyZ');
await page.keyboard.press('Control+KeyZ');
await page.keyboard.press('Control+KeyZ');
await page.keyboard.press('Control+KeyZ');
check((await datenText()) === daten0, 'alles rückgängig = Ausgangszustand');

// ------------------------------------------------------------------ Notiz auf einem Gang verdeckt ihn nicht beim Doppelklick
{
  await ed((e) => { e.setzeWerkzeug('auswahl'); e.waehle(null); });
  const [dx, dy] = await bild([1900, 0]); // die Notiz n1 des Beispiels liegt mitten im Ostgang
  await page.mouse.dblclick(dx, dy);
  check(await ed((e) => e.ebene() === 'level' && e.state.levelGang === 'ostgang'), 'Doppelklick auf eine Notiz, die auf einem Gang liegt, öffnet das Level dieses Gangs');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await ed((e) => { e.zuKarte?.(); e.waehle(null); e.alles(); });
}

// ------------------------------------------------------------------ gesperrte Ebene „Notizen“
await page.click('#l-notizen');
await page.click('#t-notiz');
await klick([1000, 300], RECHTS);
check((await notizen()).length === anzahl0 && /gesperrt/.test(await page.locator('#melden').textContent()), 'gesperrte Ebene „Notizen“: Rechtsklick setzt nichts und sagt warum');
await ed((e) => { e.setzeWerkzeug('auswahl'); });
await klick([1900, 0]);
check(await ed((e) => !e.state.auswahl || e.state.auswahl.art !== 'notiz'), 'gesperrt: die vorhandene Notiz lässt sich nicht wählen');
await page.click('#l-notizen');

// ------------------------------------------------------------------ Stempel
await ed((e) => {
  e.setzeWerkzeug('auswahl');
  e.setzeAuswahl([{ art: 'gang', id: 'schleuse' }, { art: 'formteil', id: 'f1' }, { art: 'objekt', id: 'o1' }, { art: 'notiz', id: 'n1' }]);
});
await page.fill('#f-stempel-name', 'Enge Schleuse');
await page.click('#b-stempel-neu');
let st = await ed((e) => JSON.parse(JSON.stringify(e.state.stempel)));
check(st.stempel.length === 1 && st.stempel[0].name === 'Enge Schleuse', 'Stempel angelegt und benannt', JSON.stringify(st).slice(0, 200));
check(st.stempel[0].knoten.length === 2 && st.stempel[0].gaenge.length === 1 && st.stempel[0].teile.length === 3, 'Stempel enthält Gang mit Knoten, Formteil, Wand und Notiz');
check(await page.locator('#st-s1').count() === 1, 'der Stempel steht in der Liste');
check(await ed((e) => e.stempelUngespeichert()), 'Anzeige: Stempel noch nicht gespeichert');
const vorStempel = await datenText();
await page.click('#st-s1');
check(await ed((e) => e.state.werkzeug === 'stempel' && e.state.auswahl === null), 'Stempel wählen: Werkzeug „Stempel“, Auswahl aufgehoben (Rechtsklick setzt den Stempel, nicht die Auswahl)');
await klick([600, 700]);
check((await datenText()) === vorStempel, 'A1: Linksklick setzt den Stempel nicht');
await klick([600, 700], RECHTS);
const nach = await ed((e) => { const g = e.gebiet(); return { k: g.knoten.length, g: g.gaenge.length, n: g.notizen.length, f: g.formteile.length, o: g.objekte.length }; });
const vor = JSON.parse(vorStempel);
check(nach.k === vor.knoten.length + 2 && nach.g === vor.gaenge.length + 1 && nach.n === vor.notizen.length + 1 && nach.f === vor.formteile.length + 1 && nach.o === vor.objekte.length + 1, 'Rechtsklick setzt den Stempel: 2 Knoten, 1 Gang, Formteil, Wand, Notiz', JSON.stringify(nach) + ' ' + (await page.locator('#melden').textContent()));
check(await ed((e) => e.auswahlListe().length === 6 || e.auswahlListe().length === 5), 'das Eingesetzte ist gewählt');
await page.screenshot({ path: path.join(shots, 'editor-notizen-stempel.png') });
check(await ed((e) => { const f = JSON.parse(JSON.stringify(e.state.stempel)); return JSON.stringify(f.stempel[0].knoten.map((k) => k.id)) === JSON.stringify(f.stempel[0].knoten.map((k) => k.id)); }), 'Vorlage nach dem Setzen unverändert');
const stNach = await ed((e) => JSON.stringify(e.state.stempel));
check(stNach === JSON.stringify(st), 'Vorlage bleibt nach dem Setzen Byte für Byte gleich');
await page.keyboard.press('Control+KeyZ');
check((await datenText()) === vorStempel, 'A5: Strg+Z nimmt den ganzen Stempel in einem Schritt zurück');
await page.keyboard.press('Control+KeyY');
check((await ed((e) => e.gebiet().knoten.length)) === vor.knoten.length + 2, 'A5: Strg+Y setzt ihn wieder');
await page.keyboard.press('Control+KeyZ');

// speichern: stempel.json wird mit Strg+S mitgeschrieben (Adapter nachgestellt)
await ed((e) => {
  e.state.gespeichertePfade = [];
  e.state.speicher.sichere = async (pfad, text) => {
    e.state.gespeichertePfade.push([pfad, text]);
    return { wo: 'test/' + pfad };
  };
});
await page.keyboard.press('Control+KeyS');
const geschrieben = await ed((e) => e.state.gespeichertePfade);
const stDatei = geschrieben.find(([pfad]) => pfad === 'stempel.json');
check(!!stDatei, 'Strg+S schreibt stempel.json mit', JSON.stringify(geschrieben.map((x) => x[0])));
check(stDatei && formatiereStempel(ladeStempel(stDatei[1])) === stDatei[1] && ladeStempel(stDatei[1]).stempel[0].name === 'Enge Schleuse', 'stempel.json ist gültig, formatiert und enthält den Stempel (verlustfrei)');
check(!(await ed((e) => e.stempelUngespeichert())), 'nach dem Speichern: Stempel nicht mehr ungespeichert');

// löschen
await page.click('#st-weg-s1');
check((await ed((e) => e.state.stempel.stempel.length)) === 0 && (await ed((e) => e.stempelUngespeichert())), 'Stempel löschen: weg aus der Liste, ungespeichert bis Strg+S');

check(errors.length === 0, 'Notizen und Stempel: keine Konsolenfehler', errors.join('; '));
await browser.close();
if (failures) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Notizen-und-Stempel-Prüfungen bestanden.');
