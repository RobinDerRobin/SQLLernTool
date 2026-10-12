// E2E-Test des Level-Editors (Paket 13) im echten Chromium: öffnet dist/index.html?editor, klickt, zieht, tippt und misst
// das Ergebnis in den Daten UND im Bild (Pixel der Zeichenfläche). Screenshots landen in e2e/screenshots/editor-*.png.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { NETZ_MAP } from '../src/proto/netz-map.js';
import { ACHTECK_MAP } from '../src/proto/achteck-map.js';
import { FLOOR, FLOOR2, WALL, FARBEN, SCREEN_W, SCREEN_H, SPEED } from '../src/editor/konstanten.js';
import { schachbrettHell } from '../src/editor/zeichnen.js';
import { formatiere } from '../src/editor/daten.js';

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
const shot = (name) => page.screenshot({ path: path.join(shots, `editor-${name}.png`) });

// ------------------------------------------------------------------ Öffnen
await page.goto(url + '?editor');
await page.waitForFunction(() => window.__editor);
await page.waitForTimeout(300);
await ed((e) => {
  e.state.echtzeit = false; // Zeit und Fahrt nur noch über tick(): Bilder und Zahlen werden vergleichbar
});
check(errors.length === 0, 'Öffnen: ?editor ohne Konsolenfehler', errors.join('; '));
check(await page.evaluate(() => !window.__wendehals && !document.getElementById('game')), 'Öffnen: Editor ersetzt das Spiel (kein Spiel-Canvas)');
await shot('01-beispiel');

// ------------------------------------------------------------------ Spielbild: Pixel gegen Prototyp-Karte
// Für jeden Punkt im Bild: Boden/Wand und Schachbrett-Farbe müssen der Prototyp-Zeichnung entsprechen (gleiche Konstanten,
// gleiche Geometrie wie NETZ_MAP/ACHTECK_MAP). Knoten, Namen und Rahmen sind ausgeblendet; Punkte nahe einer Kante zählen nicht.
async function pixelVergleich(gebietId, map) {
  await ed((e, id) => {
    e.wechsle(id);
    e.state.auswahl = null;
    e.state.fahrt = null;
    e.state.beschriftung = false;
    e.alles();
    e.zeichne();
  }, gebietId);
  const view = await ed((e) => ({ w: e.ansicht.w, h: e.ansicht.h, s: e.ansicht.masstab }));
  const proben = [];
  let seed = 12345;
  const zufall = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 1500; i++) proben.push([zufall() * view.w, zufall() * view.h]);
  const punkte = await ed((e, ps) => ps.map(([px, py]) => ({ px, py, w: e.ansicht.bildZuWelt(px, py), p: e.pixel(px, py) })), proben);
  let geprueft = 0;
  let falsch = 0;
  let boden = 0;
  for (const { w: [x, y], p, px, py } of punkte) {
    const r = 4 / view.s; // 4 Bildschirmpixel Abstand zu jeder Kante
    const nah = [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]].some(([dx, dy]) => map.walkable(x + dx, y + dy, 0) !== map.walkable(x, y, 0));
    const modul = (v) => ((v % 80) + 80) % 80;
    const zelle = [x, y].some((v) => modul(v) < r || 80 - modul(v) < r);
    if (nah || (zelle && map.walkable(x, y, 0))) continue;
    geprueft++;
    const erwartet = map.walkable(x, y, 0) ? (schachbrettHell(x, y) ? FLOOR2 : FLOOR) : WALL;
    if (map.walkable(x, y, 0)) boden++;
    if (!gleich(p, hex(erwartet))) {
      falsch++;
      if (falsch <= 3) console.log('  Abweichung bei', x.toFixed(1), y.toFixed(1), 'Bild', px, py, 'Boden:', map.walkable(x, y, 0), 'erwartet', erwartet, 'Bild', p.join(','));
    }
  }
  return { geprueft, falsch, boden };
}
for (const [id, map] of [['proto-netz', NETZ_MAP], ['proto-achteck', ACHTECK_MAP]]) {
  const r = await pixelVergleich(id, map);
  check(r.geprueft > 500 && r.boden > 60 && r.falsch === 0, `Spielbild ${id}: Boden/Wand/Schachbrett wie im Prototyp (${r.geprueft} Punkte, ${r.boden} Boden, ${r.falsch} falsch)`);
  await shot('02-' + id);
}

// ------------------------------------------------------------------ Ansicht: Drehen, Zoom, Verschieben
await ed((e) => {
  e.wechsle('beispiel');
  e.state.beschriftung = true;
  e.zeichne();
});
const daten0 = await ed((e) => JSON.stringify(e.gebiet()));
const hash0 = await ed((e) => e.hash());
await page.keyboard.press('KeyE');
const gedreht = await ed((e) => ({ blick: e.ansicht.blick, hash: e.hash() }));
check(gedreht.blick === 1 && gedreht.hash !== hash0, 'Ansicht: E dreht um 45° und ändert das Bild');
await page.keyboard.press('KeyQ');
await page.waitForTimeout(60);
check((await ed((e) => e.hash())) === hash0, 'Ansicht: Rechts-, dann Linksdrehung ergibt dasselbe Bild');
for (let i = 0; i < 8; i++) await page.keyboard.press('KeyE');
await page.waitForTimeout(60);
check((await ed((e) => e.hash())) === hash0, 'Ansicht: acht 45°-Schritte (volle Drehung) ergeben dasselbe Bild');
await page.keyboard.press('KeyE');
await page.keyboard.press('Digit0');
check((await ed((e) => e.ansicht.blick)) === 0, 'Ansicht: 0 stellt Norden oben wieder her');

const canvasBox = await page.locator('#plan canvas').boundingBox();
const vorher = await ed((e) => ({ cx: e.ansicht.cx, cy: e.ansicht.cy, stufe: e.ansicht.stufe }));
await page.mouse.move(canvasBox.x + 300, canvasBox.y + 200);
await page.mouse.down();
await page.mouse.move(canvasBox.x + 380, canvasBox.y + 240, { steps: 5 });
await page.mouse.up();
const nachZug = await ed((e) => ({ cx: e.ansicht.cx, cy: e.ansicht.cy, auswahl: e.state.auswahl }));
check(Math.hypot(nachZug.cx - vorher.cx, nachZug.cy - vorher.cy) > 10, 'Ansicht: Ziehen verschiebt den Plan');
await page.mouse.move(canvasBox.x + 400, canvasBox.y + 300);
await page.mouse.wheel(0, 100);
await page.waitForTimeout(50);
const nachZoom = await ed((e) => e.ansicht.stufe);
check(nachZoom === vorher.stufe + 1, 'Ansicht: Mausrad zoomt stufenweise');
check((await ed((e) => JSON.stringify(e.gebiet()))) === daten0, 'Ansicht: Zoomen, Verschieben und Drehen ändern keine Daten');

// ------------------------------------------------------------------ Auswahl per Klick
async function klickWelt(x, y) {
  const [px, py] = await ed((e, p) => e.ansicht.weltZuBild(p[0], p[1]), [x, y]);
  await page.mouse.click(canvasBox.x + px, canvasBox.y + py);
}
await ed((e) => {
  e.alles();
  e.state.auswahl = null;
});
await klickWelt(1200, -500); // Nordgang
check((await ed((e) => e.state.auswahl))?.id === 'nordgang', 'Auswahl: Klick auf den Nordgang wählt ihn');
check((await page.locator('#rechts h2').textContent()).includes('Nordgang'), 'Auswahl: rechtes Feld zeigt den Gang');
await klickWelt(1200, 0);
check((await ed((e) => e.state.auswahl)) ?.id === 'K2', 'Auswahl: Klick auf einen Knoten wählt den Knoten');
await klickWelt(300, -600);
check((await ed((e) => e.state.auswahl)) === null, 'Auswahl: Klick ins Leere hebt die Auswahl auf');
check((await ed((e) => e.state.fahrt)) === null, 'Auswahl: ohne Auswahl gibt es keinen Rahmen und keine Fahrt');
await ed((e) => e.waehle({ art: 'gang', id: 'schleuse' }));
await page.keyboard.press('Space');
await page.keyboard.press('Escape');
check((await ed((e) => ({ a: e.state.auswahl, f: e.state.fahrt }))).f === null, 'Auswahl: Esc beendet Auswahl, Fahrt und Rahmen');

// ------------------------------------------------------------------ Bildschirmrahmen und Fahrt
await ed((e) => {
  e.waehle({ art: 'gang', id: 'diagonale' });
  e.ansicht.stufe = 2;
  e.setzeFahrt(300);
});
await page.keyboard.press('KeyF');
const rahmen = await ed((e) => {
  const c = e.rahmenEcken();
  const mitte = [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2];
  e.ansicht.cx = mitte[0];
  e.ansicht.cy = mitte[1];
  e.state.beschriftung = false;
  e.zeichne();
  return { c, blick: e.ansicht.blick, s: e.ansicht.masstab };
});
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
check(Math.abs(d(rahmen.c[0], rahmen.c[1]) - SCREEN_W) < 1e-6 && Math.abs(d(rahmen.c[1], rahmen.c[2]) - SCREEN_H) < 1e-6, 'Rahmen: exakt 480 × 270 E (Daten)');
check(rahmen.blick === 1, 'Rahmen: „Wie im Spiel“ dreht in die Flugrichtung des Gangs (Südosten)');
// im Bild: gelbe Rahmenlinie, achsenparallel, Breite 480·Maßstab, Höhe 270·Maßstab
const box = await page.evaluate(([r, g, b]) => {
  const c = document.querySelector('#plan canvas');
  const x = c.getContext('2d');
  const dpr = c.width / c.clientWidth;
  const data = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - r) < 6 && Math.abs(data[i + 1] - g) < 6 && Math.abs(data[i + 2] - b) < 6) {
      const px = (i / 4) % c.width;
      const py = Math.floor(i / 4 / c.width);
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
  }
  return { w: (x1 - x0) / dpr, h: (y1 - y0) / dpr };
}, hex(FARBEN.rahmen));
check(Math.abs(box.w - SCREEN_W * rahmen.s) <= 3 && Math.abs(box.h - SCREEN_H * rahmen.s) <= 3, `Rahmen: im Bild ${box.w.toFixed(0)} × ${box.h.toFixed(0)} px = 480 × 270 E bei Maßstab ${rahmen.s.toFixed(3)}`);
// Dackel im Rahmen: braune Körperfarbe links der Rahmenmitte
const dackel = await page.evaluate(() => {
  const c = document.querySelector('#plan canvas');
  const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - 184) < 8 && Math.abs(data[i + 1] - 105) < 8 && Math.abs(data[i + 2] - 43) < 8) n++;
  return n;
});
check(dackel > 30, `Rahmen: Dackel wird mit der Spielgrafik gezeichnet (${dackel} Körperpixel)`);
await shot('03-rahmen');

// Fahrt: 70 E/s, Anzeigen stimmen mit Länge/480 und Länge/70 überein
const fahrt = await ed((e) => {
  e.waehle({ art: 'gang', id: 'schleuse' });
  e.setzeFahrt(0);
  e.fahrtUmschalten();
  e.tick(2);
  return { s: e.state.fahrt.s, laeuft: e.state.fahrt.laeuft };
});
check(Math.abs(fahrt.s - 2 * SPEED) < 1e-9 && fahrt.laeuft, `Fahrt: 2 s Fahrt = ${2 * SPEED} E (70 E/s)`);
const text = await page.locator('#fahrt-text').textContent();
check(text.includes('1200 E = 2,5 Bildschirme = 17,1 s'), 'Anzeige: Gang 1200 E = 2,5 Bildschirme = 17,1 s', text);
check(text.includes('Stelle 140 E = 0,3 Bildschirme = 2,0 s'), 'Anzeige: Stelle 140 E = 0,3 Bildschirme = 2,0 s', text);
await ed((e) => e.tick(100));
check((await ed((e) => ({ s: e.state.fahrt.s, l: e.state.fahrt.laeuft }))).l === false, 'Fahrt: hält am Gangende an');

// ------------------------------------------------------------------ Bauen (Stufe 2a): mit der Maus, auf einer frischen Seite
const bau = await browser.newPage({ viewport: { width: 1280, height: 920 }, acceptDownloads: true }); // höher als das Deck, damit der ganze Plan (bis y = 1500) im Bild liegt
const bauFehler = [];
bau.on('pageerror', (e) => bauFehler.push('pageerror: ' + e.message));
bau.on('console', (m) => {
  if (m.type() === 'error') bauFehler.push('console: ' + m.text());
});
await bau.goto(url + '?editor');
await bau.waitForFunction(() => window.__editor);
const b = (fn, arg) => bau.evaluate(`(${fn.toString()})(window.__editor, ${JSON.stringify(arg ?? null)})`);
await b((e) => {
  e.state.echtzeit = false;
  e.state.beschriftung = false;
  e.wechsle('beispiel');
  e.state.auswahl = null;
  e.state.fahrt = null;
  e.alles();
  e.zeichne();
});
const bBox = await bau.locator('#plan canvas').boundingBox();
const bild = async ([x, y]) => {
  const [px, py] = await b((e, p) => e.ansicht.weltZuBild(p[0], p[1]), [x, y]);
  return [bBox.x + px, bBox.y + py];
};
async function zieh(von, nach, extra = {}) {
  const [x0, y0] = await bild(von);
  const [x1, y1] = await bild(nach);
  await bau.mouse.move(x0, y0);
  await bau.mouse.down(extra);
  await bau.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
  await bau.mouse.move(x1, y1, { steps: 4 });
  await bau.mouse.up(extra);
}
async function klick(punkt) {
  const [x, y] = await bild(punkt);
  await bau.mouse.click(x, y);
}
const gebietNow = () => b((e) => e.gebiet());
// Pixel an einer Weltstelle, ohne die abdunkelnde Rahmen-Überlagerung (der gewählte Gang zeigt sonst den Bildschirmrahmen)
const pixelBei = ([x, y]) =>
  b((e, q) => {
    const fahrt = e.state.fahrt;
    e.state.fahrt = null;
    e.zeichne();
    const [px, py] = e.ansicht.weltZuBild(q[0], q[1]);
    const p = e.pixel(px, py);
    e.state.fahrt = fahrt;
    return p;
  }, [x, y]);
const boden = async (q) => {
  const p = await pixelBei(q);
  return gleich(p, hex(FLOOR)) || gleich(p, hex(FLOOR2));
};
const wand = async (q) => gleich(await pixelBei(q), hex(WALL));

const g0 = await gebietNow();
check((await b((e) => e.state.werkzeug)) === 'auswahl', 'Bauen: Start mit dem Auswahl-Werkzeug');
await bau.click('#t-gang');
check((await b((e) => e.state.werkzeug)) === 'gang', 'Werkzeug: Klick auf „Gang“ schaltet um');

// Gang ziehen im Leeren: rastet auf 8 Richtungen und 20 E
await zieh([203, 805], [813, 790]);
let g1 = await gebietNow();
const gneu = g1.gaenge[g1.gaenge.length - 1];
const kn = (g, id) => g.knoten.find((k) => k.id === id);
check(g1.gaenge.length === g0.gaenge.length + 1 && g1.knoten.length === g0.knoten.length + 2, 'Gang ziehen: im Leeren entstehen ein Gang und zwei Knoten');
check(kn(g1, gneu.von).y === kn(g1, gneu.nach).y && kn(g1, gneu.nach).x > kn(g1, gneu.von).x, 'Gang ziehen: rastet auf Osten (leicht schiefe Maus, waagerechter Gang)');
check((kn(g1, gneu.nach).x - kn(g1, gneu.von).x) % 20 === 0, 'Gang ziehen: Länge ist ein Vielfaches von 20 E');
check(kn(g1, gneu.von).typ === 'ende' && kn(g1, gneu.nach).typ === 'ende', 'Gang ziehen: neue Knoten sind Gangenden');
check((await b((e) => e.state.auswahl))?.id === gneu.id, 'Gang ziehen: der neue Gang ist gewählt');
const mid = [(kn(g1, gneu.von).x + kn(g1, gneu.nach).x) / 2, kn(g1, gneu.von).y];
check((await boden(mid)) && (await boden([mid[0], mid[1] + 60])) && (await wand([mid[0], mid[1] + 140])), 'Gang ziehen: im Bild Boden 200 E breit (Mitte und 60 E daneben Boden, 140 E daneben Wand)');
await bau.screenshot({ path: path.join(shots, 'editor-04-gang-gezogen.png') });

// Rückgängig / Wiederholen mit Strg+Z / Strg+Y und mit den Knöpfen
await bau.keyboard.press('Control+KeyZ');
check(JSON.stringify(await gebietNow()) === JSON.stringify(g0), 'Rückgängig (Strg+Z): exakt der Zustand davor');
check(await bau.locator('#b-undo').isDisabled(), 'Rückgängig: Knopf ist aus, wenn es nichts mehr zurückzunehmen gibt');
check(!(await boden(mid)), 'Rückgängig: der Gang ist auch im Bild weg');
await bau.keyboard.press('Control+KeyY');
check(JSON.stringify(await gebietNow()) === JSON.stringify(g1), 'Wiederholen (Strg+Y): exakt der Zustand danach');
await bau.click('#b-undo');
await bau.click('#b-redo');
check(JSON.stringify(await gebietNow()) === JSON.stringify(g1), 'Rückgängig-/Wiederholen-Knöpfe stellen den Zustand her');

// Diagonale
await zieh([813, 790], [1213, 1210]);
g1 = await gebietNow();
const gd = g1.gaenge[g1.gaenge.length - 1];
check(gd.von === gneu.nach, 'Gang ziehen: Anfang auf einem vorhandenen Knoten verbindet (Gang beginnt am Gangende)');
check(kn(g1, gd.nach).x - kn(g1, gd.von).x === kn(g1, gd.nach).y - kn(g1, gd.von).y, 'Gang ziehen: Diagonale rastet auf Südosten (45°)');
check(kn(g1, gd.von).typ === 'kreuzung', 'Gang ziehen: Knoten mit zwei Gängen wird zur Kreuzung');

// T-Kreuzung: von unten auf die „Schleuse“ ziehen
const vorT = await gebietNow();
await zieh([603, 420], [598, 12]);
const nachT = await gebietNow();
const sch = nachT.gaenge.filter((x) => x.name === 'Schleuse');
check(nachT.gaenge.length === vorT.gaenge.length + 2 && sch.length === 2, 'T-Kreuzung: Gang geteilt (zwei „Schleuse“-Teile) und neuer Gang');
check(sch.every((x) => x.breite === 200) && sch[0].nach === sch[1].von, 'T-Kreuzung: Name und Breite bleiben, die Teile treffen sich im neuen Knoten');
const tk = kn(nachT, sch[0].nach);
check(tk.x === 600 && tk.y === 0 && tk.typ === 'kreuzung', 'T-Kreuzung: neuer Knoten bei (600, 0), Typ Kreuzung');
check((await boden([600, 200])) && (await boden([450, 0])) && (await boden([750, 0])), 'T-Kreuzung: im Bild durchgehender Boden');

// Knoten-Werkzeug
await bau.keyboard.press('KeyK');
check((await b((e) => e.state.werkzeug)) === 'knoten', 'Werkzeug: Taste K schaltet auf Knoten');
await bau.selectOption('#knotentyp', 'raum');
const vorK = await gebietNow();
await klick([2403, -795]);
const nachK = await gebietNow();
const raum = nachK.knoten[nachK.knoten.length - 1];
check(nachK.knoten.length === vorK.knoten.length + 1 && raum.typ === 'raum' && raum.x === 2400 && raum.y === -800 && JSON.stringify([raum.w, raum.h]) === '[520,400]', 'Knoten setzen: Raum im Raster bei (2400, −800), 520 × 400 E');
check(await boden([2400 + 150, -800 + 100]), 'Knoten setzen: der Raum hat im Bild Boden (neben dem Mittelpunkt, ausgewählt: Rand/Mitte sind markiert)', JSON.stringify(await pixelBei([2550, -700])));
await bau.selectOption('#knotentyp', 'speicher');
const vorS = await gebietNow();
await klick([1895, 6]); // mitten auf dem Ostgang
const nachS = await gebietNow();
check(nachS.knoten.length === vorS.knoten.length + 1 && nachS.gaenge.length === vorS.gaenge.length + 1, 'Knoten auf Gang setzen: Gang wird geteilt (T-Kreuzung)');
check(nachS.gaenge.filter((x) => x.name === 'Ostgang').length === 2, 'Knoten auf Gang setzen: beide Teile heißen weiter „Ostgang“');
await bau.keyboard.press('KeyV');

// Eigenschaften: Breite ändern, ungültige Eingabe abweisen
await klick([1210, -500]); // Nordgang (160 breit)
check((await b((e) => e.state.auswahl))?.id === 'nordgang', 'Auswahl: Klick wählt wieder den Nordgang');
await bau.fill('#f-breite', '320');
await bau.keyboard.press('Enter');
let ng = (await gebietNow()).gaenge.find((x) => x.id === 'nordgang');
check(ng.breite === 320, 'Breite ändern: 320 E in den Daten');
check(await boden([1200 + 120, -500]), 'Breite ändern: im Bild 120 E neben der Mitte jetzt Boden (vorher Wand bei Breite 160)');
const vorFalsch = JSON.stringify(await gebietNow());
await bau.fill('#f-breite', '30');
await bau.keyboard.press('Enter');
check(JSON.stringify(await gebietNow()) === vorFalsch, 'Breite 30 E wird abgewiesen: Daten unverändert');
check((await bau.locator('#melden').textContent()).includes('mindestens 60'), 'Breite 30 E: verständliche Meldung');
await klick([1200, -1100]); // Raum K3 (Fläche)
check((await b((e) => e.state.auswahl))?.id === 'K3', 'Auswahl: Klick in die Raumfläche wählt den Raum');
await bau.fill('#f-w', '700');
await bau.keyboard.press('Enter');
check((await gebietNow()).knoten.find((k) => k.id === 'K3').w === 700, 'Raumgröße ändern: Breite 700 E');
check(await boden([1200 + 330, -1100]) , 'Raumgröße ändern: im Bild breiter');

// Knoten verschieben (Auswahl-Werkzeug)
const vorV = (await gebietNow()).knoten.find((k) => k.id === 'K4');
await zieh([vorV.x, vorV.y], [vorV.x + 200, vorV.y + 200]); // K4 hängt an einer Diagonalen: nur entlang ihr (Raster bleibt)
const nachV = (await gebietNow()).knoten.find((k) => k.id === 'K4');
check(nachV.x === vorV.x + 200 && nachV.y === vorV.y + 200, 'Knoten ziehen: K4 wandert entlang seiner Diagonalen (+200, +200)');
await bau.keyboard.press('Control+KeyZ');
check((await gebietNow()).knoten.find((k) => k.id === 'K4').x === vorV.x, 'Knoten ziehen: Rückgängig');

// Löschen
await klick([1210, -500]);
const vorL = await gebietNow();
await bau.keyboard.press('Delete');
const nachL = await gebietNow();
check(nachL.gaenge.length === vorL.gaenge.length - 1 && !nachL.gaenge.some((x) => x.id === 'nordgang'), 'Löschen: Entf entfernt den gewählten Gang');
check((await b((e) => e.state.auswahl)) === null, 'Löschen: danach ist nichts gewählt');
await bau.keyboard.press('Control+KeyZ');
check(JSON.stringify(await gebietNow()) === JSON.stringify(vorL), 'Löschen: Rückgängig bringt den Gang zurück');

// Zoomen, Drehen, Verschieben ändern die Daten nicht (auch nach dem Bauen)
const vorAnsicht = JSON.stringify(await gebietNow());
await bau.keyboard.press('KeyE');
await bau.keyboard.press('Minus');
await bau.keyboard.press('ArrowLeft');
await bau.keyboard.press('Digit0');
check(JSON.stringify(await gebietNow()) === vorAnsicht, 'Ansicht ändert beim Bauen keine Daten und legt keinen Verlauf an');

// Speichern: Download-Fallback, Byte-Vergleich mit der Formatierung
await b((e) => e.state.speicher.setzeArt('download'));
check((await bau.locator('#stand').textContent()).includes('ungespeichert'), 'Speichern: Anzeige „ungespeichert“ nach Änderungen');
const [download] = await Promise.all([bau.waitForEvent('download'), bau.click('#b-speichern')]);
const datei = path.join(shots, 'beispiel-gespeichert.json');
await download.saveAs(datei);
const { readFile } = await import('node:fs/promises');
const gespeichert = await readFile(datei, 'utf8');
const jetzt = await gebietNow();
check(download.suggestedFilename() === 'beispiel.json', 'Speichern: Dateiname beispiel.json');
check(gespeichert === formatiere(jetzt), 'Speichern: Dateiinhalt = formatiertes Gebiet (Byte-Vergleich)');
check(JSON.stringify(JSON.parse(gespeichert)) === JSON.stringify(jetzt), 'Speichern: Datei enthält genau die Daten im Editor');
check((await bau.locator('#stand').textContent()).includes('gespeichert') && !(await bau.locator('#stand').textContent()).includes('ungespeichert'), 'Speichern: Anzeige „gespeichert“');

// Laden: gleiche Datei → unverändert; ungültige Datei → Meldung, nichts geht verloren
async function ladeDatei(inhalt, name = 'x.json') {
  const [fc] = await Promise.all([bau.waitForEvent('filechooser'), bau.click('#b-oeffnen')]);
  await fc.setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(inhalt) });
  await bau.waitForTimeout(150);
}
const vorLaden = JSON.stringify(await gebietNow());
await ladeDatei(gespeichert, 'beispiel.json');
check(JSON.stringify(await gebietNow()) === vorLaden, 'Laden: die gespeicherte Datei laden → gleiche Daten (verlustfrei)');
for (const [inhalt, muster, name] of [
  ['{ kaputt', 'kein gültiges JSON', 'kaputt'],
  [JSON.stringify({ ...JSON.parse(gespeichert), format: 2 }), 'Format 2', 'format2'],
  [JSON.stringify({ ...JSON.parse(gespeichert), gaenge: [{ id: 'x', von: 'K1', nach: 'K99', breite: 100 }] }), 'K99', 'kaputtergang'],
]) {
  await ladeDatei(inhalt, name + '.json');
  const meldung = await bau.locator('#melden').textContent();
  check(meldung.includes(muster) && meldung.includes('bleibt unverändert'), `Laden: ungültige Datei „${name}“ → verständliche Meldung (${muster})`, meldung);
  check(JSON.stringify(await gebietNow()) === vorLaden, `Laden: ungültige Datei „${name}“ verändert nichts`);
}
// Datei eines neuen Gebiets: erscheint in der Auswahl
await ladeDatei(formatiere({ ...JSON.parse(gespeichert), id: 'neu-test', name: 'Neu Test' }), 'neu-test.json');
check((await b((e) => e.state.gebietId)) === 'neu-test' && (await bau.locator('#gebiet option').count()) === 4, 'Laden: Datei mit neuer ID wird als Gebiet hinzugefügt');
await bau.selectOption('#gebiet', 'beispiel');
check(JSON.stringify(await gebietNow()) === vorLaden, 'Laden: Zurückwechseln zeigt den bearbeiteten Stand');
// Mehrfaches Strg+Z geht alles zurück bis zum Anfangszustand
for (let i = 0; i < 40; i++) await bau.keyboard.press('Control+KeyZ');
check(JSON.stringify(await gebietNow()) === JSON.stringify(g0), 'Rückgängig bis zum Anfang: genau der geladene Zustand');
await bau.screenshot({ path: path.join(shots, 'editor-05-nach-rueckgaengig.png') });
check(bauFehler.length === 0, 'Bauen: keine Konsolenfehler', bauFehler.join('; '));
await bau.close();

// ------------------------------------------------------------------ Bauen II (Stufe 2b): Formteil, Wand, Hindernis, Drehen, Kopieren, Löschen
const teil = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const teilFehler = [];
teil.on('pageerror', (e) => teilFehler.push('pageerror: ' + e.message));
teil.on('console', (m) => {
  if (m.type() === 'error') teilFehler.push('console: ' + m.text());
});
await teil.goto(url + '?editor');
await teil.waitForFunction(() => window.__editor);
const t2 = (fn, arg) => teil.evaluate(`(${fn.toString()})(window.__editor, ${JSON.stringify(arg ?? null)})`);
await t2((e) => {
  e.state.echtzeit = false;
  e.state.beschriftung = false;
  e.wechsle('beispiel');
  e.state.auswahl = null;
  e.state.fahrt = null;
  e.alles();
  e.zeichne();
});
const tBox = await teil.locator('#plan canvas').boundingBox();
const tBild = async ([x, y]) => {
  const [px, py] = await t2((e, p) => e.ansicht.weltZuBild(p[0], p[1]), [x, y]);
  return [tBox.x + px, tBox.y + py];
};
async function tZieh(von, nach) {
  const [x0, y0] = await tBild(von);
  const [x1, y1] = await tBild(nach);
  await teil.mouse.move(x0, y0);
  await teil.mouse.down();
  await teil.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
  await teil.mouse.move(x1, y1, { steps: 4 });
  await teil.mouse.up();
}
async function tKlick(punkt) {
  const [x, y] = await tBild(punkt);
  await teil.mouse.click(x, y);
}
const tDaten = () => t2((e) => e.gebiet());
const tPixel = ([x, y]) =>
  t2((e, q) => {
    const fahrt = e.state.fahrt;
    e.state.fahrt = null;
    e.state.auswahl = null; // der blaue Auswahlrand soll das Pixel nicht färben
    e.zeichne();
    const [px, py] = e.ansicht.weltZuBild(q[0], q[1]);
    const p = e.pixel(px, py);
    e.state.fahrt = fahrt;
    return p;
  }, [x, y]);
// Pixel messen, ohne die Auswahl zu verlieren
const tPixelMitAuswahl = async (q) => {
  const au = await t2((e) => e.state.auswahl);
  const p = await tPixel(q);
  await t2((e, a) => {
    e.state.auswahl = a;
    e.zeichne();
  }, au);
  return p;
};
const tBoden = async (q) => {
  const p = await tPixelMitAuswahl(q);
  return gleich(p, hex(FLOOR)) || gleich(p, hex(FLOOR2));
};
const tWand = async (q) => gleich(await tPixelMitAuswahl(q), hex(WALL));
const T0 = JSON.stringify(await tDaten());

// Werkzeugliste: Knöpfe und Kürzel
for (const [id, kuerzel] of [['formteil', 'KeyB'], ['wand', 'KeyW'], ['hindernis', 'KeyH']]) {
  check((await teil.locator('#t-' + id).count()) === 1, `Werkzeug „${id}“ hat einen Knopf`);
  await teil.keyboard.press(kuerzel);
  check((await t2((e) => e.state.werkzeug)) === id, `Werkzeug: Taste ${kuerzel.replace('Key', '')} schaltet auf ${id}`);
}

// Formteil ziehen: Boden 120 E breit im leeren Gebiet
await teil.keyboard.press('KeyB');
check(!(await tBoden([410, 710])), 'Formteil: vorher dort kein Boden'); // Messpunkte abseits der Schachbrettlinien (Vielfache von 80 E)
await tZieh([203, 703], [607, 690]);
let d1 = await tDaten();
const f = d1.formteile[d1.formteile.length - 1];
check(d1.formteile.length === 2 && f.id === 'f2' && f.winkel === 0 && f.laenge === 400 && f.x === 400 && f.y === 700 && f.breite === 120, 'Formteil ziehen: 400 E lang, Mitte (400, 700), Winkel 0, Breite 120', JSON.stringify(f));
check((await tBoden([410, 710])) && (await tBoden([410, 750])) && (await tWand([410, 790])), 'Formteil ziehen: im Bild Boden (Mitte, 40 E daneben), 80 E daneben Wand');
check((await t2((e) => e.state.auswahl))?.id === 'f2', 'Formteil ziehen: das neue Formteil ist gewählt');
check((await teil.locator('#f-laenge').inputValue()) === '400', 'Formteil: Eigenschaftenfeld zeigt Länge 400');

// Wand quer über den Gang Schleuse (Boden → Wand)
await teil.keyboard.press('KeyW');
check(await tBoden([310, 10]), 'Wand: vorher ist dort Gangboden');
await tZieh([300, -80], [300, 80]);
d1 = await tDaten();
const w = d1.objekte[d1.objekte.length - 1];
check(w.typ === 'wand' && w.winkel === 90 && w.laenge === 160 && w.x === 300 && w.y === 0, 'Wand ziehen: nach Süden gezogen = 160 E lang, Winkel 90, Mitte (300, 0)', JSON.stringify(w));
check((await tWand([310, 10])) && (await tWand([310, 70])) && (await tBoden([360, 10])), 'Wand ziehen: im Bild Wand in der Mitte und 70 E südlich, 30 E östlich neben der Wand weiter Boden');
await teil.screenshot({ path: path.join(shots, 'editor-06-teile-gesetzt.png') });

// Hindernis per Klick: Standardgröße, Platzhalterbild
await teil.keyboard.press('KeyH');
await tKlick([700, -300]);
d1 = await tDaten();
const h = d1.objekte[d1.objekte.length - 1];
check(h.typ === 'hindernis' && h.x === 700 && h.y === -300 && h.laenge === 60 && h.breite === 60, 'Hindernis setzen: Klick = 60 × 60 E im Raster', JSON.stringify(h));
const hp = await tPixelMitAuswahl([680, -290]); // abseits der Diagonalen des Platzhalterbildes
check(hp[0] > 150 && hp[2] < 90, 'Hindernis setzen: im Bild die Platzhalterfarbe (orange)', JSON.stringify(hp));

// Auswahl-Werkzeug: Teil wählen, verschieben, Eigenschaften
await teil.keyboard.press('KeyV');
await tKlick([300, 20]);
check(JSON.stringify(await t2((e) => e.state.auswahl)) === JSON.stringify({ art: 'objekt', id: w.id }), 'Auswahl: Klick auf die Wand wählt sie');
check((await teil.locator('#f-winkel').inputValue()) === '90', 'Auswahl: Eigenschaftenfeld zeigt Winkel 90');
await tZieh([300, 20], [500, 20]);
let wn = (await tDaten()).objekte.find((o) => o.id === w.id);
check(wn.x === 500 && wn.y === 0, 'Teil ziehen: die Wand wandert um +200 nach Osten und rastet (Mitte 500, 0)', JSON.stringify(wn));
check((await tBoden([310, 10])) && (await tWand([510, 10])), 'Teil ziehen: im Bild ist der Gang bei x=300 wieder frei, die Wand steht bei x=500');
await teil.keyboard.press('Control+KeyZ');
wn = (await tDaten()).objekte.find((o) => o.id === w.id);
check(wn.x === 300 && (await tWand([310, 10])), 'Teil ziehen: Rückgängig stellt die Lage her (auch im Bild)');

// Drehen mit R: 45°-Schritte; vier Schritte = 180° = gleiches Bild
const vorDrehen = await tDaten();
const hashVor = await t2((e) => e.hash());
await teil.keyboard.press('KeyR');
let wd = (await tDaten()).objekte.find((o) => o.id === w.id);
check(wd.winkel === 135, 'Drehen: R dreht die Wand um 45° rechtsherum (90 → 135)', String(wd.winkel));
check((await t2((e) => e.hash())) !== hashVor, 'Drehen: das Bild ändert sich');
await teil.keyboard.press('Shift+KeyR');
check((await tDaten()).objekte.find((o) => o.id === w.id).winkel === 90, 'Drehen: Umschalt+R dreht zurück');
for (let i = 0; i < 4; i++) await teil.keyboard.press('KeyR');
check(JSON.stringify(await tDaten()) === JSON.stringify(vorDrehen), 'Drehen: vier Schritte (180°) ergeben genau dieselben Daten');
check((await t2((e) => e.hash())) === hashVor, 'Drehen: und dasselbe Bild');
await teil.click('#b-teil-rechts');
check((await tDaten()).objekte.find((o) => o.id === w.id).winkel === 135, 'Drehen: Knopf „⟳ 45°“ dreht ebenfalls');
await teil.click('#b-teil-links');

// Eigenschaften: Winkel nur in 45°-Schritten, Länge ändern
await teil.fill('#f-winkel', '30');
await teil.keyboard.press('Enter');
check((await tDaten()).objekte.find((o) => o.id === w.id).winkel === 90, 'Winkel 30° wird abgewiesen: Daten unverändert');
check((await teil.locator('#melden').textContent()).includes('45'), 'Winkel 30°: verständliche Meldung');
check(await tBoden([310, 90]), 'Länge ändern: vorher ist bei y = 90 E noch Boden (Wand ist 160 lang)');
await teil.fill('#f-laenge', '200');
await teil.keyboard.press('Enter');
check((await tDaten()).objekte.find((o) => o.id === w.id).laenge === 200, 'Länge ändern: 200 E in den Daten');
check(await tWand([310, 90]), 'Länge ändern: im Bild reicht die Wand jetzt weiter nach Süden (bis 100 E)');

// Kopieren und Einfügen an der Mausstelle, Duplizieren
const vorKopie = await tDaten();
await teil.keyboard.press('Control+KeyC');
const [mx, my] = await tBild([700, 300]);
await teil.mouse.move(mx, my);
await teil.keyboard.press('Control+KeyV');
let dk = await tDaten();
const kop = dk.objekte[dk.objekte.length - 1];
check(dk.objekte.length === vorKopie.objekte.length + 1 && kop.id !== w.id && kop.x === 700 && kop.y === 300 && kop.laenge === 200 && kop.winkel === 90 && kop.typ === 'wand', 'Kopieren/Einfügen: Strg+C, Maus auf (700, 300), Strg+V → Kopie mit neuer ID dort, gleiche Maße', JSON.stringify(kop));
check((await t2((e) => e.state.auswahl))?.id === kop.id, 'Einfügen: die Kopie ist gewählt');
await teil.keyboard.press('Control+KeyD');
dk = await tDaten();
const dup = dk.objekte[dk.objekte.length - 1];
check(dk.objekte.length === vorKopie.objekte.length + 2 && dup.x === kop.x + 40 && dup.y === kop.y + 40, 'Duplizieren: Strg+D setzt eine Kopie 40 E versetzt', JSON.stringify(dup));
await teil.keyboard.press('Control+KeyZ');
await teil.keyboard.press('Control+KeyZ');
check(JSON.stringify(await tDaten()) === JSON.stringify(vorKopie), 'Kopieren: zweimal Rückgängig stellt den Zustand davor exakt her');

// Löschen
await tKlick([300, 100]);
check((await t2((e) => e.state.auswahl))?.id === w.id, 'Löschen: Wand gewählt', JSON.stringify(await t2((e) => [e.state.auswahl, e.state.werkzeug])));
const vorLoesch = await tDaten();
await teil.keyboard.press('Delete');
const nachLoesch = await tDaten();
check(nachLoesch.objekte.length === vorLoesch.objekte.length - 1 && !nachLoesch.objekte.some((o) => o.id === w.id), 'Löschen: Entf entfernt nur die Wand');
check(nachLoesch.gaenge.length === vorLoesch.gaenge.length && nachLoesch.knoten.length === vorLoesch.knoten.length, 'Löschen: Gänge und Knoten bleiben');
check(await tBoden([310, 10]), 'Löschen: im Bild ist der Gang wieder frei');
await teil.keyboard.press('Control+KeyZ');
check(JSON.stringify(await tDaten()) === JSON.stringify(vorLoesch), 'Löschen: Rückgängig bringt die Wand zurück');

// Bestehende Teile aus der Datei sind klickbar (Formteil f1, Wand o1, Gegner-Platzhalter o2)
await tKlick([600, 150]);
check((await t2((e) => e.state.auswahl))?.id === 'f1', 'Auswahl: Klick auf das Formteil der Beispieldatei wählt f1');
await tKlick([420, -70]);
check((await t2((e) => e.state.auswahl))?.id === 'o1', 'Auswahl: Klick auf die Wand der Beispieldatei wählt o1');
await tKlick([900, 0]);
check((await t2((e) => e.state.auswahl))?.id === 'o2', 'Auswahl: Klick auf den Gegner-Platzhalter wählt o2');
check((await teil.locator('#rechts').textContent()).includes('Platzhalter'), 'Gegner-Platzhalter: Hinweis im Eigenschaftenfeld');
await teil.keyboard.press('KeyR');
check(JSON.stringify((await tDaten()).objekte.find((o) => o.id === 'o2')) === JSON.stringify(vorLoesch.objekte.find((o) => o.id === 'o2')), 'Drehen: ein Gegner-Platzhalter hat keinen Winkel, nichts ändert sich');

// Alles zurück bis zum Anfang; Speichern/Laden bleibt verlustfrei
for (let i = 0; i < 40; i++) await teil.keyboard.press('Control+KeyZ');
check(JSON.stringify(await tDaten()) === T0, 'Rückgängig bis zum Anfang: genau der geladene Zustand (Teile eingeschlossen)');
await teil.keyboard.press('KeyB');
await tZieh([203, 703], [607, 703]);
await teil.keyboard.press('KeyV');
const teilText = formatiere(await tDaten());
const geladen = await t2((e, t) => e.oeffneText(t, 'test.json'), teilText);
check(geladen === true && formatiere(await tDaten()) === teilText, 'Laden: gespeicherte Datei mit Teilen ergibt gleiche Daten (verlustfrei)');
await teil.screenshot({ path: path.join(shots, 'editor-07-teile-fertig.png') });
check(teilFehler.length === 0, 'Bauen II: keine Konsolenfehler', teilFehler.join('; '));
await teil.close();

// ------------------------------------------------------------------ Stufe 3: Spielen ab hier, Bezeichnung kopieren
const vorSpiel = errors.length;
await ed((e) => {
  e.state.echtzeit = false;
  e.wechsle('proto-netz');
  e.waehle({ art: 'gang', id: 'nord-1' });
  e.setzeFahrt(300);
});
const datenVorSpiel = await ed((e) => JSON.stringify(e.gebiet()));
const stateVorSpiel = await ed((e) => JSON.stringify({ a: e.state.auswahl, f: e.state.fahrt, g: e.state.gebietId, w: e.state.werkzeug, z: e.ansicht.cx + ',' + e.ansicht.cy + ',' + e.ansicht.stufe + ',' + e.ansicht.blick }));
check(await page.locator('#b-spielen').isEnabled(), 'Spielen: Knopf „Spielen ab hier“ ist mit gewähltem Gang bedienbar');
await page.keyboard.press('KeyP');
await page.waitForSelector('#spiel-canvas');
const szene0 = await ed((e) => {
  const sc = e.state.spielen.szene;
  const m = sc.dogMap();
  return { aktiv: e.state.spielen.aktiv, theta: sc.theta, s: sc.s, dog: [sc.dog.x, sc.dog.y], dogMap: [m.x, m.y], cam: [sc.cam.x, sc.cam.y], tot: sc.deaths };
});
// Gang nord-1 liegt von K1 (-900,-500) nach K2 (0,-500): Stelle 300 → Rahmenmitte (-600,-500), Dackel 120 E dahinter (-720,-500)
check(szene0.aktiv && szene0.theta === 0 && szene0.s === 'R', 'Spielen: Start in Flugrichtung des Gangs (Osten)');
check(Math.abs(szene0.dogMap[0] + 720) < 1e-6 && Math.abs(szene0.dogMap[1] + 500) < 1e-6 && Math.abs(szene0.cam[0] + 600) < 1e-6, 'Spielen: Dackel steht an der Stelle des Rahmens (Stelle 300 → Karte −720|−500)', JSON.stringify(szene0));
check(szene0.dog[0] === 120 && szene0.dog[1] === 135, 'Spielen: Dackel auf der Bildschirmstelle (120|135) wie im Rahmen des Editors');
// Bild messen (Regel 3): Gang ist 200 E breit → im Bild Boden von y = 35 bis 235; darüber/darunter Wand
const spielPixel = (bx, by) => page.evaluate(([x, y]) => {
  const c = document.getElementById('spiel-canvas');
  const k = c.width / 480;
  return Array.from(c.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data);
}, [bx, by]);
const istBodenFarbe = (p) => gleich(p, hex(FLOOR), 2) || gleich(p, hex(FLOOR2), 2);
check(istBodenFarbe(await spielPixel(330, 135)) && istBodenFarbe(await spielPixel(330, 60)) && istBodenFarbe(await spielPixel(330, 210)), 'Spielen: Bild zeigt den Gangboden');
check(gleich(await spielPixel(330, 20), hex(WALL), 2) && gleich(await spielPixel(330, 250), hex(WALL), 2), 'Spielen: über und unter dem Gang ist Wand im Bild');
await shot('08-spielen');
const tasteImEditor = await ed((e) => e.state.werkzeug);
await page.keyboard.press('KeyG');
check((await ed((e) => e.state.werkzeug)) === tasteImEditor, 'Spielen: Spieltasten erreichen den Editor darunter nicht');
await ed((e) => e.state.spielen.tick(2));
const szene1 = await ed((e) => {
  const sc = e.state.spielen.szene;
  return { cam: [sc.cam.x, sc.cam.y], tot: sc.deaths };
});
check(Math.abs(szene1.cam[0] - szene0.cam[0] - 140) < 1.5 && szene1.tot === 0, `Spielen: Fenster scrollt mit 70 E/s (2 s → ${(szene1.cam[0] - szene0.cam[0]).toFixed(1)} E)`);
await page.keyboard.down('ArrowDown');
await ed((e) => e.state.spielen.tick(0.3));
await page.keyboard.up('ArrowDown');
check((await ed((e) => e.state.spielen.szene.dog.y)) > 135 + 20, 'Spielen: Pfeiltasten steuern den Dackel');
await ed((e) => e.state.spielen.tick(3)); // weiter nach unten → Wand → Tod und Neustart an der letzten Kreuzung/Startstelle
await page.keyboard.press('Escape');
await page.waitForSelector('#spiel-canvas', { state: 'detached' });
check(!(await ed((e) => e.state.spielen.aktiv)), 'Spielen: Esc führt zurück in den Editor');
check((await ed((e) => JSON.stringify(e.gebiet()))) === datenVorSpiel, 'Spielen: Daten nach der Rückkehr unverändert');
check(
  (await ed((e) => JSON.stringify({ a: e.state.auswahl, f: e.state.fahrt, g: e.state.gebietId, w: e.state.werkzeug, z: e.ansicht.cx + ',' + e.ansicht.cy + ',' + e.ansicht.stufe + ',' + e.ansicht.blick }))) === stateVorSpiel,
  'Spielen: Auswahl, Rahmenstelle und Ansicht nach der Rückkehr unverändert',
  stateVorSpiel + ' ≠ ' + (await ed((e) => JSON.stringify({ a: e.state.auswahl, f: e.state.fahrt, g: e.state.gebietId, w: e.state.werkzeug, z: e.ansicht.cx + ',' + e.ansicht.cy + ',' + e.ansicht.stufe + ',' + e.ansicht.blick }))),
);
await page.keyboard.press('KeyG');
check((await ed((e) => e.state.werkzeug)) === 'gang', 'Spielen: nach der Rückkehr gelten die Editor-Tasten wieder');
await page.keyboard.press('KeyV');

// Was der Prototyp nicht spielen kann, wird vorher gemeldet – nichts startet still falsch
await ed((e) => {
  e.wechsle('beispiel');
  e.waehle({ art: 'gang', id: 'schleuse' });
  e.setzeFahrt(400);
});
await page.click('#b-spielen');
const meldung = await page.locator('#melden').textContent();
check(/Noch nicht spielbar/.test(meldung) && /Diagonale/.test(meldung), 'Spielen: Diagonale im Gebiet → Meldung „Noch nicht spielbar“ mit Grund', meldung);
check((await page.locator('#spiel-canvas').count()) === 0, 'Spielen: bei nicht spielbarem Gebiet startet nichts');
await ed((e) => e.melde(''));

// Bezeichnung kopieren
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
await ed((e) => {
  e.waehle({ art: 'gang', id: 'schleuse' });
  e.setzeFahrt(560);
});
await page.keyboard.press('KeyN');
await page.waitForTimeout(100);
await page.keyboard.press('KeyG');
check((await ed((e) => e.state.werkzeug)) === 'gang', 'Bezeichnung: nach N gelten die Kürzel sofort wieder (Fokus nicht im Feld)');
await page.keyboard.press('KeyV');
await page.focus('#fahrt');
await page.keyboard.press('KeyG');
check((await ed((e) => e.state.werkzeug)) === 'gang', 'Kürzel gelten auch, wenn der Fahrt-Schieber den Fokus hat');
await page.keyboard.press('KeyV');
check((await page.inputValue('#bezeichnung')) === 'Wendehals-Level beispiel/schleuse@560', 'Bezeichnung: Gang mit Stelle im Format Wendehals-Level <gebiet>/<level>@<stelle>', await page.inputValue('#bezeichnung'));
check(await page.locator('#bezeichnung').isVisible(), 'Bezeichnung: Textfeld als Rückfall sichtbar');
const zw = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
check(zw === null || zw === 'Wendehals-Level beispiel/schleuse@560', 'Bezeichnung: Zwischenablage enthält die Bezeichnung (falls erlaubt)', String(zw));
await ed((e) => e.waehle({ art: 'knoten', id: 'K2' }));
await page.click('#b-bezeichnung');
await page.waitForTimeout(100);
check((await page.inputValue('#bezeichnung')) === 'Wendehals-Level beispiel/K2', 'Bezeichnung: Knoten im Format <gebiet>/<knoten>');
await ed((e) => e.waehle(null));
check(await page.locator('#b-bezeichnung').isDisabled() && await page.locator('#b-spielen').isDisabled(), 'Bezeichnung/Spielen: ohne Auswahl ausgegraut');
check(errors.length === vorSpiel, 'Stufe 3: keine Konsolenfehler', errors.slice(vorSpiel).join('; '));

// ------------------------------------------------------------------ Stufe 4: Prüfer
const vorPruefer = errors.length;
await ed((e) => {
  e.state.echtzeit = false;
  e.wechsle('proto-netz');
  e.state.beschriftung = false;
});
const ohneMuss = await ed((e) => e.pruefer().meldungen.filter((m) => m.art === 'MUSS').length);
check(ohneMuss === 0, 'Prüfer: Gebiet „Netz“ hat keine MUSS-Meldung', String(ohneMuss));
check((await page.locator('#b-pruefer').textContent()).startsWith('Prüfer: ') && (await page.locator('#b-pruefer').getAttribute('class')).includes('soll') || (await page.locator('#b-pruefer').getAttribute('class')).includes('gut'), 'Prüfer: Knopf zeigt den Stand ohne MUSS (grün/gelb)');
check(!(await page.locator('#prueferfeld').isVisible()), 'Prüfer: Liste ist zu, bis man sie öffnet');
// Engstelle bauen (zwei Wände lassen 40 E Querweg) – Gang nord-1 geht von (-900,-500) nach (0,-500), 200 E breit
await ed((e) => {
  e.aendere('Engstelle', (g) => {
    g.objekte.push({ id: 'oE1', typ: 'wand', x: -450, y: -560, laenge: 200, breite: 80, winkel: 0 }, { id: 'oE2', typ: 'wand', x: -450, y: -440, laenge: 200, breite: 80, winkel: 0 });
  });
});
const engstelle = await ed((e) => e.pruefer().meldungen.filter((m) => m.regel === 'M2'));
check(engstelle.length === 1 && engstelle[0].ort.id === 'nord-1' && engstelle[0].ort.s > 330 && engstelle[0].ort.s < 570, 'Prüfer: M2 meldet die Engstelle mit Gang und Stelle', JSON.stringify(engstelle));
check((await page.locator('#b-pruefer').getAttribute('class')).includes('muss') && (await page.locator('#b-pruefer').textContent()).includes('1 MUSS'), 'Prüfer: Knopf wird rot und zählt „1 MUSS“');
// Bild ohne Marken merken (Liste zu), dann öffnen: Marken erscheinen im Plan
await ed((e) => {
  e.waehle(null);
  e.ansicht.zentrieren(-450, -500);
  e.ansicht.stufe = 2;
  e.refresh();
});
const hashOhne = await ed((e) => e.hash());
await page.click('#b-pruefer');
check(await page.locator('#prueferfeld').isVisible(), 'Prüfer: Klick auf „Prüfer“ öffnet die Liste');
const hashMit = await ed((e) => e.hash());
check(hashMit !== hashOhne, 'Prüfer: geöffnete Liste zeichnet Marken in den Plan (Bild ändert sich)');
const punkte = await page.locator('#prueferfeld .pm').count();
check(punkte >= 1 && (await page.locator('#prueferfeld .pm.MUSS').first().textContent()).includes('M2 MUSS'), 'Prüfer: Liste zeigt die Meldung mit Regel und Art', String(punkte));
await shot('09-pruefer');
// Klick auf die Meldung springt zur Stelle
await ed((e) => {
  e.ansicht.zentrieren(5000, 5000);
  e.waehle(null);
});
await page.locator('#prueferfeld .pm.MUSS').first().click();
const sprung = await ed((e) => ({ au: e.state.auswahl, s: e.state.fahrt?.s, cx: e.ansicht.cx, cy: e.ansicht.cy }));
check(sprung.au?.id === 'nord-1' && sprung.s > 330 && sprung.s < 570 && Math.abs(sprung.cx + 450) < 120 && Math.abs(sprung.cy + 500) < 5, 'Prüfer: Klick springt zum Gang, zur Stelle und zentriert den Plan', JSON.stringify(sprung));
// Engstelle weg (Rückgängig) → Meldung weg
await ed((e) => e.rueckgaengig());
check((await ed((e) => e.pruefer().muss)) === 0 && (await page.locator('#prueferfeld .pm.MUSS').count()) === 0, 'Prüfer: nach Rückgängig ist die Meldung weg');
// Drehzone: Wand 100 E vor der Kreuzung K2 (0,-500)
await ed((e) => {
  e.aendere('Wand in der Drehzone', (g) => g.objekte.push({ id: 'oE3', typ: 'wand', x: -100, y: -560, laenge: 40, breite: 40, winkel: 0 }));
});
const m3 = await ed((e) => e.pruefer().meldungen.filter((m) => m.regel === 'M3').map((m) => m.ort.id));
check(m3.includes('oE3'), 'Prüfer: M3 meldet die Wand in der Drehzone vor der Kreuzung', JSON.stringify(m3));
await ed((e) => e.rueckgaengig());
// Beispiel: Diagonale → „Noch nicht spielbar“ in der Liste (M7)
await ed((e) => e.wechsle('beispiel'));
check((await page.locator('#prueferfeld .pm', { hasText: 'Noch nicht spielbar' }).count()) >= 1, 'Prüfer: Beispiel zeigt „Noch nicht spielbar“ (M7)');
await page.click('#b-pruefer');
check(!(await page.locator('#prueferfeld').isVisible()), 'Prüfer: zweiter Klick schließt die Liste');
check(errors.length === vorPruefer, 'Prüfer: keine Konsolenfehler', errors.slice(vorPruefer).join('; '));

// ------------------------------------------------------------------ Leistung: 300 Objekte
const ms = await ed((e) => {
  const g = e.gebiet();
  for (let i = 0; i < 300; i++) g.objekte.push({ id: 'p' + i, typ: 'wand', x: (i % 30) * 100, y: -400 + Math.floor(i / 30) * 60, laenge: 60, breite: 30, winkel: 45 });
  e.state.beschriftung = true;
  const zeiten = [];
  for (let i = 0; i < 40; i++) {
    const t = performance.now();
    e.zeichne();
    zeiten.push(performance.now() - t);
  }
  zeiten.sort((a, b) => a - b);
  return zeiten[Math.floor(zeiten.length * 0.9)];
});
check(ms < 16, `Leistung: Zeichnen bei 300 Objekten p90 ${ms.toFixed(1)} ms (< 16 ms)`);

// ------------------------------------------------------------------ Spiel und Prototyp unberührt
const page2 = await browser.newPage({ viewport: { width: 960, height: 540 } });
const fehler2 = [];
page2.on('pageerror', (e) => fehler2.push(e.message));
await page2.goto(url);
await page2.waitForFunction(() => window.__wendehals);
await page2.waitForTimeout(400);
check((await page2.evaluate(() => !window.__editor && !!window.__wendehals.game)) && fehler2.length === 0, 'Unberührt: ohne ?editor startet wie bisher der Prototyp, kein Editor');
await page2.goto(url + '?spiel');
await page2.waitForFunction(() => window.__wendehals);
check((await page2.evaluate(() => window.__wendehals.game.screen)) === 'title', 'Unberührt: ?spiel öffnet das v0.2-Titelbild');

check(errors.length === 0, 'Keine Konsolenfehler im Editor', errors.join('; '));
await browser.close();
if (failures) {
  console.error(`${failures} Prüfungen fehlgeschlagen`);
  process.exit(1);
}
console.log('Editor-E2E bestanden');
