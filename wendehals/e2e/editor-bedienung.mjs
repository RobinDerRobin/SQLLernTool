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


// ------------------------------------------------------------------ Frische Seite für das Bauen mit der Maus (A1, A5)
const bau = await browser.newPage({ viewport: { width: 1280, height: 920 } });
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
  e.waehle(null);
  e.alles();
  e.setzeZoom(8);
});
const bBox = await bau.locator('#plan canvas').boundingBox();
const bild = async ([x, y]) => {
  const [px, py] = await b((e, p) => e.ansicht.weltZuBild(p[0], p[1]), [x, y]);
  return [bBox.x + px, bBox.y + py];
};
const RECHTS = { button: 'right' };
async function zieh(von, nach, opts = {}) {
  const [x0, y0] = await bild(von);
  const [x1, y1] = await bild(nach);
  await bau.mouse.move(x0, y0);
  await bau.mouse.down(opts);
  await bau.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
  await bau.mouse.move(x1, y1, { steps: 4 });
  await bau.mouse.up(opts);
}
async function klick(p, opts = {}) {
  const [x, y] = await bild(p);
  await bau.mouse.click(x, y, opts);
}
const daten = () => b((e) => JSON.stringify(e.gebiet()));
const welt = () => b((e) => JSON.stringify(e.state.welt));
const schritte = () => b((e) => e.verlaufVon(e.state.gebietId).zurueck.length);
const werkzeug = (kuerzel) => bau.keyboard.press(kuerzel);
let rng = 20261012;
const zufall = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;

// ------------------------------------------------------------------ A1 Linksklick setzt nie etwas, Rechtsklick setzt
{
  const daten0 = await daten();
  const welt0 = await welt();
  const s0 = await schritte();
  let ok = true;
  for (const id of ['auswahl', 'gang', 'knoten', 'formteil', 'wand', 'hindernis', 'gegner', 'bereich']) {
    await b((e, w) => e.setzeWerkzeug(w), id);
    for (let i = 0; i < 50; i++) {
      // zufällige Stellen im Plan – auch auf Gängen, Knoten, Teilen und im Leeren
      await bau.mouse.click(bBox.x + 20 + zufall() * (bBox.width - 40), bBox.y + 20 + zufall() * (bBox.height - 40));
    }
    if ((await daten()) !== daten0 || (await schritte()) !== s0) {
      ok = false;
      console.error('  Linksklicks haben mit dem Werkzeug ' + id + ' etwas geändert');
    }
  }
  check(ok && (await welt()) === welt0, 'A1: 50 zufällige Linksklicks mit jedem gewählten Element (8 Werkzeuge) lassen die Datei unverändert und erzeugen keinen Verlaufsschritt');
  // Doppelklicks und Klicks mit Strg setzen ebenfalls nichts
  await b((e) => e.setzeWerkzeug('wand'));
  await bau.mouse.dblclick(bBox.x + 300, bBox.y + 300);
  await bau.keyboard.down('Control');
  await bau.mouse.click(bBox.x + 400, bBox.y + 300);
  await bau.keyboard.up('Control');
  check((await daten()) === daten0, 'A1: Doppelklick und Strg+Klick setzen nichts');
  // Kein Browser-Kontextmenü über dem Plan
  const verhindert = await bau.evaluate(() => {
    const c = document.querySelector('#plan canvas');
    return !c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
  });
  check(verhindert, 'A1: das Kontextmenü des Browsers ist über dem Plan unterdrückt');
  await b((e) => e.setzeWerkzeug('auswahl'));
  await bau.mouse.click(bBox.x + 300, bBox.y + 200, RECHTS);
  check((await daten()) === daten0 && /Element/.test(await bau.locator('#melden').textContent()), 'A1: Rechtsklick ohne gewähltes Element setzt nichts und sagt, was zu tun ist');
  await b((e) => e.melde(''));
}

{
  const leer = [[600, -600], [1900, -700], [2100, 400], [300, 450], [800, -400]];
  const zaehl = () => b((e) => { const g = e.gebiet(); return { k: g.knoten.length, g: g.gaenge.length, f: g.formteile.length, o: g.objekte.length }; });
  // Knoten
  await werkzeug('KeyK');
  await bau.selectOption('#knotentyp', 'raum');
  let z0 = await zaehl();
  await klick(leer[0], RECHTS);
  let z1 = await zaehl();
  const rk = await b((e) => e.gebiet().knoten.at(-1));
  check(z1.k === z0.k + 1 && rk.typ === 'raum' && rk.x === 600 && rk.y === -600, 'A1: Rechtsklick setzt einen Knoten (Raum, im Raster)');
  check((await b((e) => e.state.auswahl))?.id === rk.id, 'A1: der gesetzte Knoten ist gewählt');
  // Formteil, Wand, Hindernis (Klick und Ziehen), Gegner
  for (const [taste, art, feld] of [['KeyB', 'Formteil', 'f'], ['KeyW', 'Wand', 'o'], ['KeyH', 'Hindernis', 'o'], ['KeyX', 'Gegner', 'o']]) {
    await werkzeug(taste);
    z0 = await zaehl();
    await klick(leer[1], RECHTS);
    z1 = await zaehl();
    check(z1[feld] === z0[feld] + 1, `A1: Rechtsklick setzt ${art}`);
    await werkzeug(taste);
    z0 = z1;
    if (art !== 'Gegner') {
      await zieh(leer[2], [leer[2][0] + 400, leer[2][1]], RECHTS);
      z1 = await zaehl();
      check(z1[feld] === z0[feld] + 1, `A1: Rechts ziehen setzt ${art} mit Länge`);
    }
  }
  // Gang: Rechts ziehen von einem Knoten
  await werkzeug('KeyG');
  z0 = await zaehl();
  await zieh([2600, 0], [3000, 0], RECHTS);
  z1 = await zaehl();
  const gneu = await b((e) => e.gebiet().gaenge.at(-1));
  check(z1.g === z0.g + 1 && gneu.von === 'K5', 'A1: Rechts ziehen von einem Knoten setzt einen Gang', JSON.stringify(gneu));
  // Linksziehen mit Gang-Werkzeug zieht keinen Gang
  const vorLinks = await daten();
  await zieh([2600, 0], [3000, 200]);
  await zieh(leer[3], [leer[3][0] + 300, leer[3][1]]);
  check((await b((e) => e.gebiet().gaenge.length)) === z1.g, 'A1: Linksziehen mit dem Gang-Werkzeug zieht keinen Gang');
  await b((e) => e.setzeWerkzeug('auswahl'));
  await b((e) => e.rueckgaengig());
}


// ------------------------------------------------------------------ A1 Plan verschieben: mittlere Taste und Shift+Ziehen
{
  await b((e) => {
    e.setzeWerkzeug('wand');
    e.waehle({ art: 'gang', id: 'schleuse' });
    e.alles();
    e.setzeZoom(8);
  });
  const daten0 = await daten();
  const sel0 = await b((e) => JSON.stringify(e.state.auswahl));
  const stelle = [900, 300]; // leere Stelle, wird mitgezogen
  const vorBild = await bild(stelle);
  // mittlere Taste
  await bau.mouse.move(vorBild[0], vorBild[1]);
  await bau.mouse.down({ button: 'middle' });
  await bau.mouse.move(vorBild[0] + 60, vorBild[1] + 20, { steps: 5 });
  await bau.mouse.up({ button: 'middle' });
  let nach = await bild(stelle);
  check(Math.abs(nach[0] - vorBild[0] - 60) <= 1 && Math.abs(nach[1] - vorBild[1] - 20) <= 1, `A1: mittlere Maustaste verschiebt den Plan (Inhalt folgt der Maus: ${(nach[0] - vorBild[0]).toFixed(1)} | ${(nach[1] - vorBild[1]).toFixed(1)} px)`);
  check((await daten()) === daten0 && (await b((e) => JSON.stringify(e.state.auswahl))) === sel0, 'A1: Plan verschieben ändert keine Daten und nicht die Auswahl');
  // Shift + Ziehen (auch über einem Objekt, das sonst verschoben würde)
  const ueberGang = await bild([600, 0]);
  await bau.keyboard.down('Shift');
  await bau.mouse.move(ueberGang[0], ueberGang[1]);
  await bau.mouse.down();
  await bau.mouse.move(ueberGang[0] - 80, ueberGang[1] + 40, { steps: 5 });
  await bau.mouse.up();
  await bau.keyboard.up('Shift');
  const nach2 = await bild([600, 0]);
  check(Math.abs(nach2[0] - ueberGang[0] + 80) <= 1 && Math.abs(nach2[1] - ueberGang[1] - 40) <= 1, 'A1: Shift+Ziehen verschiebt den Plan');
  check((await daten()) === daten0, 'A1: Shift+Ziehen über einem Objekt verschiebt kein Objekt');
  // Rechtsziehen mit dem Wand-Werkzeug verschiebt den Plan nicht, sondern setzt eine Wand
  const cx0 = await b((e) => e.ansicht.cx);
  await zieh([300, 400], [700, 400], RECHTS);
  check((await b((e) => e.ansicht.cx)) === cx0 && (await b((e) => e.gebiet().objekte.at(-1).typ)) === 'wand', 'A1: Rechtsziehen verschiebt den Plan nicht (es setzt)');
  await b((e) => e.rueckgaengig());
  // Mausrad zoomt (nicht Strg nötig)
  const m0 = await b((e) => e.ansicht.masstab);
  await bau.mouse.move(bBox.x + 400, bBox.y + 300);
  await bau.mouse.wheel(0, -100);
  check((await b((e) => e.ansicht.masstab)) > m0, 'A1: Mausrad zoomt');
  await b((e) => e.alles());
  await b((e) => e.setzeZoom(8));
}

// ------------------------------------------------------------------ A5 Schutz
{
  await b((e) => {
    e.setzeWerkzeug('auswahl');
    e.alles();
    e.setzeZoom(8);
  });
  // nur Entf löscht
  await b((e) => e.waehle({ art: 'gang', id: 'ostgang' }));
  const vorLoeschen = await daten();
  await bau.keyboard.press('Backspace');
  check((await daten()) === vorLoeschen, 'A5: Backspace löscht nicht');
  await bau.keyboard.press('Delete');
  check((await b((e) => e.gebiet().gaenge.some((x) => x.id === 'ostgang'))) === false, 'A5: Entf löscht den gewählten Gang');
  check((await bau.locator('#b-undo').textContent()) === 'Rückgängig: Löschen', 'A5: der Rückgängig-Knopf nennt die letzte Aktion („Rückgängig: Löschen“)', await bau.locator('#b-undo').textContent());
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === vorLoeschen, 'A5: Strg+Z bringt den Gang zurück');
  check((await bau.locator('#b-redo').textContent()) === 'Wiederholen: Löschen' && (await bau.locator('#b-undo').isDisabled()) === (await b((e) => !e.verlaufVon(e.state.gebietId).kannZurueck)), 'A5: der Wiederholen-Knopf nennt „Löschen“');
  await bau.keyboard.press('Control+KeyY');
  check((await b((e) => e.gebiet().gaenge.some((x) => x.id === 'ostgang'))) === false, 'A5: Strg+Y wiederholt');
  await bau.keyboard.press('Control+KeyZ');
  await bau.keyboard.press('Control+Shift+KeyZ');
  check((await b((e) => e.gebiet().gaenge.some((x) => x.id === 'ostgang'))) === false, 'A5: Strg+Umschalt+Z wiederholt ebenfalls');
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === vorLoeschen, 'A5: Strg+Z stellt den Ausgangszustand wieder her');
  // Beschriftung nach dem Setzen
  await b((e) => e.setzeWerkzeug('wand'));
  await klick([800, -400], RECHTS);
  check((await bau.locator('#b-undo').textContent()) === 'Rückgängig: Wand setzen', 'A5: nach dem Setzen steht „Rückgängig: Wand setzen“ im Knopf', await bau.locator('#b-undo').textContent());
  await b((e) => e.rueckgaengig());
  // Ziehen beginnt erst ab 8 px
  await b((e) => {
    e.setzeWerkzeug('auswahl');
    e.waehle(null);
  });
  const o1 = await b((e) => e.gebiet().objekte.find((o) => o.id === 'o1'));
  const [ox, oy] = await bild([o1.x, o1.y]);
  async function ziehPx(dx, dy) {
    await bau.mouse.move(ox, oy);
    await bau.mouse.down();
    await bau.mouse.move(ox + dx / 2, oy + dy / 2);
    await bau.mouse.move(ox + dx, oy + dy);
    await bau.mouse.up();
  }
  const d0 = await daten();
  await ziehPx(7, 0); // 7 px = 21 E: früher (Schwelle 5 px) wäre die Wand gewandert
  check((await daten()) === d0, 'A5: Ziehen unter 8 px bewegt nichts (7 px)');
  check((await b((e) => e.state.auswahl))?.id === 'o1', 'A5: … und zählt als Klick (wählt die Wand)');
  await ziehPx(12, 0); // 12 px = 36 E → 40 E im Raster
  const o1b = await b((e) => e.gebiet().objekte.find((o) => o.id === 'o1'));
  check(o1b.x === o1.x + 40 && Math.abs(o1b.y - o1.y) <= 10, `A5: Ziehen ab 8 px verschiebt (12 px → +40 E im Raster, jetzt x=${o1b.x})`);
  check((await bau.locator('#b-undo').textContent()) === 'Rückgängig: Wand verschieben', 'A5: Knopf nennt „Wand verschieben“', await bau.locator('#b-undo').textContent());
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === d0, 'A5: Rückgängig nach dem Verschieben');
  // Esc während eines Zugs bricht ab
  await bau.mouse.move(ox, oy);
  await bau.mouse.down();
  await bau.mouse.move(ox + 40, oy + 10, { steps: 4 });
  await bau.keyboard.press('Escape');
  await bau.mouse.up();
  check((await daten()) === d0, 'A5: Esc mitten im Ziehen bricht ab, nichts ändert sich');
}

// ------------------------------------------------------------------ A5 Ebenen sperren
{
  await b((e) => {
    e.setzeWerkzeug('auswahl');
    e.waehle(null);
  });
  const daten0 = await daten();
  const gegner = await b((e) => e.gebiet().objekte.find((o) => o.typ === 'gegner'));
  check(await bau.locator('#l-gegner').isVisible(), 'A5: es gibt Sperr-Knöpfe für die Ebenen');
  await klick([gegner.x, gegner.y]);
  check((await b((e) => e.state.auswahl))?.id === gegner.id, 'A5: ungesperrt lässt sich der Gegner wählen');
  await b((e) => e.waehle(null));
  await bau.click('#l-gegner');
  check((await bau.locator('#l-gegner.an').count()) === 1, 'A5: Sperre sichtbar (Knopf aktiv)');
  await klick([gegner.x, gegner.y]);
  check((await b((e) => e.state.auswahl))?.id !== gegner.id, 'A5: gesperrter Gegner lässt sich nicht wählen');
  await zieh([gegner.x, gegner.y], [gegner.x + 200, gegner.y + 100]);
  check((await daten()) === daten0, 'A5: gesperrter Gegner lässt sich nicht verschieben');
  await b((e) => e.setzeWerkzeug('gegner'));
  await klick([1900, -700], RECHTS);
  check((await daten()) === daten0 && /gesperrt/.test(await bau.locator('#melden').textContent()), 'A5: in eine gesperrte Ebene setzt der Rechtsklick nichts („gesperrt“-Meldung)');
  await b((e) => { e.melde(''); e.setzeWerkzeug('auswahl'); });
  // Auswahl, die in eine gesperrte Ebene fällt, wird beim Sperren abgewählt
  await b((e) => e.waehle({ art: 'formteil', id: 'f1' }));
  await bau.click('#l-formteile');
  check((await b((e) => e.state.auswahl)) === null, 'A5: Sperren einer Ebene wählt deren gewähltes Ding ab');
  await bau.click('#l-formteile');
  await bau.click('#l-gegner');
  await klick([gegner.x, gegner.y]);
  check((await b((e) => e.state.auswahl))?.id === gegner.id, 'A5: entsperrt lässt sich der Gegner wieder wählen');
  // Knoten sperren: Klick auf den Knoten wählt ihn nicht
  await b((e) => e.waehle(null));
  await bau.click('#l-knoten');
  await klick([1200, 0]);
  check((await b((e) => e.state.auswahl))?.art !== 'knoten', 'A5: gesperrte Knoten lassen sich nicht wählen');
  await bau.click('#l-knoten');
  await b((e) => e.waehle(null));
}

// ------------------------------------------------------------------ A5 Strg+Z / Strg+Y für jede Aktion, in jeder Ansicht, mit jedem Fokus
{
  await b((e) => {
    e.setzeWerkzeug('auswahl');
    e.waehle(null);
    e.alles();
    e.setzeZoom(8);
  });
  const start = await daten();
  const s0 = await schritte();
  const orte = () => [[400 + zufall() * 2200, -1300 + zufall() * 1900], [300 + zufall() * 400, 300 + zufall() * 700]][zufall() < 0.8 ? 0 : 1];
  const aktionen = ['knoten', 'formteil', 'wand', 'hindernis', 'gegner', 'gang', 'verschieben', 'loeschen', 'drehen', 'name', 'tileset', 'kopieren'];
  const tasten = { knoten: 'KeyK', formteil: 'KeyB', wand: 'KeyW', hindernis: 'KeyH', gegner: 'KeyX', gang: 'KeyG' };
  let getan = 0;
  for (let i = 0; i < 60 && getan < 30; i++) {
    const art = aktionen[Math.floor(zufall() * aktionen.length)];
    const vor = await schritte();
    const g = await b((e) => e.gebiet());
    const [px, py] = orte().map((v) => Math.round(v / 20) * 20);
    if (tasten[art] && art !== 'gang') {
      await werkzeug(tasten[art]);
      await klick([px, py], RECHTS);
    } else if (art === 'gang') {
      await werkzeug('KeyG');
      const k = g.knoten[Math.floor(zufall() * g.knoten.length)];
      const r = [[300, 0], [0, 300], [300, 300], [-300, 0]][Math.floor(zufall() * 4)];
      await zieh([k.x, k.y], [k.x + r[0], k.y + r[1]], RECHTS);
    } else if (art === 'verschieben') {
      const t = [...g.formteile, ...g.objekte][Math.floor(zufall() * (g.formteile.length + g.objekte.length))];
      if (!t) continue;
      await werkzeug('KeyV');
      await zieh([t.x, t.y], [t.x + 120, t.y + 80]);
    } else if (art === 'loeschen' || art === 'drehen' || art === 'kopieren') {
      const t = [...g.formteile, ...g.objekte][Math.floor(zufall() * (g.formteile.length + g.objekte.length))];
      if (!t) continue;
      await werkzeug('KeyV');
      await klick([t.x, t.y]);
      await bau.keyboard.press(art === 'loeschen' ? 'Delete' : art === 'drehen' ? 'KeyR' : 'Control+KeyD');
    } else if (art === 'name') {
      const gg = g.gaenge[Math.floor(zufall() * g.gaenge.length)];
      await b((e, x) => e.setzeFeld('gang', x.id, 'name', x.name + '!'), gg);
    } else if (art === 'tileset') {
      await b((e) => e.aendere('Tileset ändern', (gb) => { gb.tileset = gb.tileset === 'bad' ? 'keller' : 'bad'; }));
    }
    if ((await schritte()) > vor) getan++;
  }
  const ende = await daten();
  const n = (await schritte()) - s0;
  check(n >= 25 && ende !== start, `A5: Zufallsfolge von ${n} Aktionen (Setzen, Ziehen, Löschen, Drehen, Kopieren, Eigenschaft) ist im Verlauf`);
  await werkzeug('KeyV');
  await b((e) => e.waehle(null));
  // Fokus auf Auswahlliste (kein Textfeld): Strg+Z gilt trotzdem
  await bau.focus('#gebiet');
  await bau.keyboard.press('Control+KeyZ');
  const nach1 = (await schritte()) - s0;
  check(nach1 === n - 1, 'A5: Strg+Z wirkt auch mit Fokus auf der Gebiets-Auswahlliste');
  await bau.focus('#fahrt');
  await bau.keyboard.press('Control+KeyZ');
  check((await schritte()) - s0 === n - 2, 'A5: Strg+Z wirkt auch mit Fokus auf dem Fahrt-Schieber');
  await bau.focus('#zoomfeld');
  await bau.keyboard.press('Control+KeyZ');
  check((await schritte()) - s0 === n - 2, 'A5: im Zoomfeld (Textfeld) gilt das Rückgängig des Feldes, nicht das des Editors');
  await bau.locator('#plan canvas').focus().catch(() => {});
  await bau.evaluate(() => document.activeElement?.blur());
  for (let i = 0; i < n - 2; i++) await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === start, `A5: ${n} Aktionen, dann ${n}× Strg+Z = genau der Ausgangszustand`);
  check((await schritte()) === s0, 'A5: danach sind alle Schritte dieser Folge zurückgenommen');
  for (let i = 0; i < n; i++) await bau.keyboard.press(i % 2 ? 'Control+Shift+KeyZ' : 'Control+KeyY');
  check((await daten()) === ende, `A5: ${n}× Strg+Y (abwechselnd Strg+Umschalt+Z) = genau der Endzustand`);
  await bau.keyboard.press('Control+KeyZ');
  await bau.keyboard.press('Control+KeyY');
  check((await daten()) === ende, 'A5: Strg+Z, Strg+Y ergibt wieder denselben Zustand');
  // in der Welt-Ansicht
  await b((e) => e.zuWelt());
  const welt0 = await welt();
  const lagen0 = await b((e) => e.lagen());
  await b((e) => e.weltAendere('Lage ändern', (w) => { w.gebiete[0].lage = { x: 4000, y: 0 }; }));
  check((await welt()) !== welt0, 'A5 (Vorbereitung): Lage in der Welt geändert');
  await bau.keyboard.press('Control+KeyZ');
  check((await welt()) === welt0, 'A5: Strg+Z wirkt in der Welt-Ansicht');
  await bau.keyboard.press('Control+KeyY');
  check((await welt()) !== welt0, 'A5: Strg+Y wirkt in der Welt-Ansicht');
  await bau.keyboard.press('Control+KeyZ');
  await b((e) => e.zuGebiet());
}
check(bauFehler.length === 0, 'Bedienung (Bauen): keine Konsolenfehler', bauFehler.join('; '));

check(errors.length === 0, 'Bedienung: keine Konsolenfehler', errors.join('; '));
await browser.close();
if (failures) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Bedienungs-Prüfungen bestanden.');
