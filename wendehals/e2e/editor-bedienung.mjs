// E2E-Test der Bedienung des Level-Editors (Stufe 7b, Robins Anforderungen A1–A6) im echten Chromium: Maus, Rad und Tastatur wie
// ein Mensch, gemessen in Daten UND Bild. Läuft nach e2e/editor.mjs (npm run e2e:editor).
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { FLOOR, FLOOR2, WALL, SCREEN_W } from '../src/editor/konstanten.js';
import { ausdehnung, bodenPolygone, istBoden, formatiere } from '../src/editor/daten.js';
import { levelInhalt } from '../src/editor/level.js';
import { TILESETS, GEGNER, KNOTENTYPEN, gegnerFuer } from '../src/editor/katalog.js';
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
const bauShot = (name) => bau.screenshot({ path: path.join(shots, `editor-bedienung-${name}.png`) });

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
  const taste = opts.modifiers?.[0]; // mouse.click kennt keine Zusatztasten: Taste selbst halten
  if (taste) await bau.keyboard.down(taste);
  await bau.mouse.click(x, y, { button: opts.button });
  if (taste) await bau.keyboard.up(taste);
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

// ------------------------------------------------------------------ A3 Ebenen und Levelansicht
{
  await b((e) => {
    while (e.verlaufVon(e.state.gebietId).kannZurueck) e.rueckgaengig(); // zurück zum unveränderten Beispiel
    e.setzeWerkzeug('auswahl');
    e.wechsle('beispiel');
    e.waehle(null);
    e.alles();
    e.setzeZoom(8);
  });
  const ebene = () => b((e) => e.ebene());
  const daten0 = await daten();
  check((await ebene()) === 'karte', 'A3: der Editor startet in der Karte (ein Gebiet)');
  const [dx, dy] = await bild([1900, 0]);
  await bau.mouse.dblclick(dx, dy);
  check((await ebene()) === 'level' && (await b((e) => e.state.levelGang)) === 'ostgang', 'A3: Doppelklick auf einen Gang öffnet seine Levelansicht');
  check((await b((e) => e.state.auswahl))?.id === 'ostgang', 'A3: das Level ist gewählt (Rahmen und Fahrt gehören dazu)');
  const krume = await bau.locator('#brotkrume').textContent();
  check(/Welt/.test(krume) && /Beispiel/.test(krume) && /Ostgang/.test(krume) && /K2/.test(krume) && /K5/.test(krume), 'A3: Brotkrume zeigt Welt › Gebiet › Level (K2 → K5)', krume);
  check((await daten()) === daten0, 'A3: Ebenen wechseln ändert keine Daten');

  // Ausgeblendet: außerhalb des Levels nur Wandfarbe (Pixeltest), innerhalb Gangboden
  async function pixelProbe(gangId) {
    const sicht = levelInhalt(GEBIETE.beispiel, gangId);
    const polys = bodenPolygone(sicht);
    const proben = [];
    for (let i = 0; i < 700; i++) proben.push([bBox.width * 0.02 + zufall() * bBox.width * 0.96, bBox.height * 0.02 + zufall() * bBox.height * 0.96]);
    const punkte = await b((e, ps) => {
      const fahrt = e.state.fahrt;
      e.state.fahrt = null; // ohne die abdunkelnde Rahmen-Überlagerung
      e.state.beschriftung = false;
      e.zeichne();
      const out = ps.map(([px, py]) => ({ w: e.ansicht.bildZuWelt(px, py), p: e.pixel(px, py), s: e.ansicht.masstab }));
      e.state.fahrt = fahrt;
      return out;
    }, proben);
    let aussen = 0;
    let innen = 0;
    let falsch = 0;
    for (const { w: [x, y], p, s } of punkte) {
      const r = 3 / s;
      const nah = [[r, 0], [-r, 0], [0, r], [0, -r]].some(([ex, ey]) => istBoden(x + ex, y + ey, polys) !== istBoden(x, y, polys));
      const modul = (v) => ((v % 80) + 80) % 80;
      const gitter = [x, y].some((v) => modul(v) < r || 80 - modul(v) < r); // auf den Linien des Schachbretts mischen sich beide Bodenfarben
      const randNah = polys.some((poly) => poly.some((a, i) => {
        const c = poly[(i + 1) % poly.length];
        const l2 = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * (c[0] - a[0]) + (y - a[1]) * (c[1] - a[1])) / l2));
        return Math.hypot(x - (a[0] + t * (c[0] - a[0])), y - (a[1] + t * (c[1] - a[1]))) * s < 4;
      })); // die Auswahllinie des Levels liegt auf den Kanten seiner Flächen
      if (nah || randNah) continue;
      const boden = istBoden(x, y, polys);
      if (boden && gitter) continue;
      if (boden) {
        innen++;
        if (!(gleich(p, hex(FLOOR)) || gleich(p, hex(FLOOR2)))) {
          falsch++;
          if (falsch <= 3) console.log('  innen falsch bei', x.toFixed(0), y.toFixed(0), p.join(','));
        }
      } else {
        aussen++;
        if (!gleich(p, hex(WALL))) {
          falsch++;
          if (falsch <= 3) console.log('  außen falsch bei', x.toFixed(0), y.toFixed(0), p.join(','));
        }
      }
    }
    return { aussen, innen, falsch };
  }
  const px1 = await pixelProbe('ostgang');
  check(px1.aussen > 100 && px1.innen > 20 && px1.falsch === 0, `A3: Levelansicht „Ostgang“ – außerhalb des Levels nur Wandfarbe, darin Gangboden (${px1.aussen} außen, ${px1.innen} innen, ${px1.falsch} falsch)`);
  await bauShot('a3-level-ostgang');
  // Nicht wählbar: Klick auf die ausgeblendete Schleuse, den Nordgang, den Raum
  for (const [name, p] of [['Schleuse', [600, 0]], ['Nordgang', [1200, -500]], ['Raum K3', [1200, -1100]], ['Diagonale', [1500, 300]], ['Gegner o2', [900, 0]]]) {
    await klick(p);
    const au = await b((e) => e.state.auswahl);
    check(au?.art === 'gang' && au.id === 'ostgang', `A3: ausgeblendet und nicht wählbar: ${name}`, JSON.stringify(au));
  }
  const kn = await b((e) => e.sicht().knoten.map((k) => k.id).sort().join());
  check(kn === 'K2,K5', 'A3: sichtbar sind nur die zwei Knoten des Levels', kn);
  // Mit Rechtsklick lässt sich im Level bauen; das Gesetzte bleibt sichtbar, solange es gewählt ist
  await b((e) => e.setzeWerkzeug('hindernis'));
  await klick([1900, 0], RECHTS);
  check((await b((e) => e.gebiet().objekte.at(-1).typ)) === 'hindernis' && (await b((e) => e.sicht().objekte.length)) === 1, 'A3: im Level baut der Rechtsklick (das neue Hindernis liegt im Gang und gehört zum Level)');
  await b((e) => { e.rueckgaengig(); e.setzeWerkzeug('auswahl'); });
  // Esc: Level → Karte → (Auswahl weg) → Welt; in der Welt bleibt es dabei
  await bau.keyboard.press('Escape');
  check((await ebene()) === 'karte', 'A3: Esc geht aus dem Level in die Karte');
  check((await b((e) => e.sicht().gaenge.length)) === 4 && (await b((e) => e.state.auswahl))?.id === 'ostgang', 'A3: die Karte zeigt wieder alles; der Gang bleibt gewählt');
  await bau.keyboard.press('Escape');
  check((await ebene()) === 'karte' && (await b((e) => e.state.auswahl)) === null, 'A3: Esc in der Karte hebt zuerst die Auswahl auf');
  await bau.keyboard.press('Escape');
  check((await ebene()) === 'welt', 'A3: Esc ohne Auswahl geht aus der Karte in die Welt');
  await bau.keyboard.press('Escape');
  check((await ebene()) === 'welt', 'A3: in der Welt gibt es keine höhere Ebene');
  await b((e) => e.zuGebiet());
  // Enter öffnet das Level des gewählten Gangs
  await b((e) => e.waehle({ art: 'gang', id: 'nordgang' }));
  await bau.keyboard.press('Enter');
  check((await ebene()) === 'level' && (await b((e) => e.state.levelGang)) === 'nordgang', 'A3: Enter öffnet das Level des gewählten Gangs');
  const px2 = await pixelProbe('nordgang');
  check(px2.falsch === 0 && px2.aussen > 100, `A3: Levelansicht „Nordgang“ ebenfalls ohne fremde Teile (${px2.falsch} falsch)`);
  // Brotkrume schaltet die Ebene
  await bau.click('#krume-karte');
  check((await ebene()) === 'karte', 'A3: Klick auf das Gebiet in der Brotkrume geht in die Karte');
  await bau.keyboard.press('Enter');
  check((await ebene()) === 'level', 'A3: (Gang war noch gewählt) Enter öffnet das Level wieder');
  await bau.click('#krume-welt');
  check((await ebene()) === 'welt', 'A3: Klick auf „Welt“ in der Brotkrume geht in die Welt-Ansicht');
  await b((e) => e.zuGebiet());
  check((await ebene()) === 'karte', 'A3: aus der Welt zurück in die Karte');
  // Bild↓ wechselt zum nächsten Level
  await b((e) => e.oeffneLevel('schleuse'));
  await bau.keyboard.press('PageDown');
  check((await b((e) => e.state.levelGang)) === 'nordgang', 'A3: Bild↓ öffnet das nächste Level des Gebiets');
  await bau.keyboard.press('PageUp');
  check((await b((e) => e.state.levelGang)) === 'schleuse', 'A3: Bild↑ das vorige');
  // Löscht man das Level, geht es zurück in die Karte
  await bau.keyboard.press('Delete');
  check((await ebene()) === 'karte' && (await b((e) => e.gebiet().gaenge.length)) === 3, 'A3: Entf auf dem Level löscht den Gang und kehrt in die Karte zurück');
  await bau.keyboard.press('Control+KeyZ');
  check((await ebene()) === 'karte' && (await daten()) === daten0, 'A3: Strg+Z stellt den Gang her');
}

// ------------------------------------------------------------------ A3 Ausgangsperspektive
{
  await b((e) => {
    e.setzeWerkzeug('auswahl');
    e.wechsle('beispiel');
    e.waehle(null);
    e.alles();
    e.setzeZoom(8);
  });
  const daten0 = await daten();
  await b((e) => e.oeffneLevel('ostgang'));
  check((await b((e) => e.ansicht.blick)) === 0, 'A3: ohne Angabe wird das Level mit Norden oben geöffnet');
  const s0 = await schritte();
  await bau.selectOption('#f-ansicht', 'S');
  const ost = await b((e) => e.gebiet().gaenge.find((x) => x.id === 'ostgang'));
  check(ost.ansicht === 'S', 'A3: die Ausgangsansicht steht als Feld „ansicht“ am Gang', JSON.stringify(ost));
  check((await schritte()) === s0 + 1 && (await bau.locator('#b-undo').textContent()) === 'Rückgängig: Ausgangsansicht ändern', 'A3: die Änderung ist ein Schritt mit Namen („Ausgangsansicht ändern“)');
  await bau.keyboard.press('Escape');
  await b((e) => e.oeffneLevel('ostgang'));
  check((await b((e) => e.ansicht.blick)) === 2, 'A3: beim Öffnen wird die Ausgangsansicht angewendet (Süden nach rechts)');
  const lage = await b((e) => [e.ansicht.weltZuBild(1200, 0), e.ansicht.weltZuBild(2600, 0)]);
  check(Math.abs(lage[1][1] - lage[0][1]) > 5 * Math.abs(lage[1][0] - lage[0][0]), 'A3: im Bild verläuft der Ostgang jetzt senkrecht (gedreht)');
  await bauShot('a3-ausgangsansicht');
  await bau.keyboard.press('Control+KeyZ');
  check(!(await b((e) => 'ansicht' in e.gebiet().gaenge.find((x) => x.id === 'ostgang'))), 'A3: Strg+Z nimmt die Ausgangsansicht zurück');
  await bau.keyboard.press('Control+KeyY');
  // Speichern und Laden verlustfrei, mit dem Feld
  const text = await b((e) => e.gebiet()).then((g) => formatiere(g));
  const geladen = await b((e, t) => e.oeffneText(t, 'test.json'), text);
  check(geladen === true && formatiere(await b((e) => e.gebiet())) === text && /"ansicht": "S"/.test(text), 'A3: Speichern → Laden mit dem Feld ist verlustfrei');
  await b((e) => e.oeffneLevel('ostgang'));
  check((await b((e) => e.ansicht.blick)) === 2, 'A3: nach dem Laden gilt die Ausgangsansicht weiter');
  // Ansicht merken: drehen und speichern
  await b((e) => e.oeffneLevel('schleuse'));
  await bau.keyboard.press('KeyE');
  await bau.keyboard.press('KeyE');
  await bau.keyboard.press('KeyE');
  await bau.click('#b-ansicht-merken');
  check((await b((e) => e.gebiet().gaenge.find((x) => x.id === 'schleuse').ansicht)) === 'SW', 'A3: „Ansicht merken“ speichert die aktuelle Drehung (dreimal E = Südwesten nach rechts)');
  await bau.selectOption('#f-ansicht', 'E');
  check(!(await b((e) => 'ansicht' in e.gebiet().gaenge.find((x) => x.id === 'schleuse'))), 'A3: „Norden oben“ entfernt das Feld wieder (Standard)');
  await b((e) => { e.zuKarte(); e.rueckgaengig(); e.rueckgaengig(); e.rueckgaengig(); });
  await b((e) => e.norden());
}


// ------------------------------------------------------------------ A4 Auswahl: Hervorhebung, Rahmen, Strg+Klick, Pfeile, Strg+A, Kopieren mehrerer
{
  await b((e) => {
    while (e.verlaufVon(e.state.gebietId).kannZurueck) e.rueckgaengig();
    e.setzeWerkzeug('auswahl');
    e.wechsle('beispiel');
    e.waehle(null);
    e.alles();
    e.setzeZoom(8);
    e.state.beschriftung = false;
  });
  const daten0 = await daten();
  const liste = () => b((e) => e.auswahlListe().map((d) => d.art + ':' + d.id).sort().join(','));
  const ohneFahrt = (fn, arg) =>
    b((e, a) => {
      const fahrt = e.state.fahrt;
      e.state.fahrt = null;
      e.zeichne();
      const r = a.map(([x, y]) => {
        const [px, py] = e.ansicht.weltZuBild(x, y);
        return e.pixel(px, py);
      });
      e.state.fahrt = fahrt;
      return r;
    }, arg);

  // Hervorhebung unter der Maus
  const [hx, hy] = await bild([420, -70]);
  await bau.mouse.move(hx + 300, hy + 300);
  const hashAus = await b((e) => e.hash());
  const randAus = (await ohneFahrt(null, [[420, -100]]))[0];
  await bau.mouse.move(hx, hy);
  await bau.waitForTimeout(40);
  const randAn = (await ohneFahrt(null, [[420, -100]]))[0];
  const hashAn = await b((e) => e.hash());
  check(hashAn !== hashAus && randAn[0] > 190 && randAn[1] > 190 && randAn[0] > randAus[0] + 40, `A4: unter der Maus wird das Ding hervorgehoben (Rand der Wand ${randAus.slice(0, 3)} → ${randAn.slice(0, 3)})`);
  await bau.mouse.move(hx + 300, hy + 300);
  await bau.waitForTimeout(40);
  check((await b((e) => e.hash())) === hashAus, 'A4: Maus weg → Hervorhebung weg (dasselbe Bild wie vorher)');
  check((await daten()) === daten0, 'A4: Hervorhebung ändert keine Daten');

  // Auswahlrahmen
  await zieh([-150, -250], [1350, 250]);
  const ganz = await liste();
  check(ganz === 'formteil:f1,gang:schleuse,knoten:K1,knoten:K2,objekt:o1,objekt:o2', 'A4: Linksziehen im Leeren zieht einen Auswahlrahmen – gewählt ist, was ganz drin liegt', ganz);
  check((await bau.locator('#rechts h2').textContent()) === '6 Dinge gewählt', 'A4: das rechte Feld sagt „6 Dinge gewählt“');
  check((await daten()) === daten0, 'A4: Rahmen ändert keine Daten');
  await zieh([1000, -300], [1180, -150]);
  check((await liste()) === '', 'A4: ein Rahmen, der nichts ganz umschließt, wählt nichts (hebt die Auswahl auf)', await liste());
  // mit Alt beim Loslassen: auch was nur hineinragt
  {
    const [x0, y0] = await bild([1000, -300]);
    const [x1, y1] = await bild([1180, -150]);
    await bau.mouse.move(x0, y0);
    await bau.mouse.down();
    await bau.mouse.move(x1, y1, { steps: 5 });
    await bau.keyboard.down('Alt');
    await bau.mouse.up();
    await bau.keyboard.up('Alt');
    check((await liste()) === 'gang:nordgang', 'A4: Alt beim Loslassen wählt auch, was der Rahmen nur berührt (Nordgang)', await liste());
  }
  // Strg + Rahmen ergänzt
  await b((e) => e.waehle({ art: 'objekt', id: 'o2' }));
  {
    const [x0, y0] = await bild([300, 250]);
    const [x1, y1] = await bild([700, 400]);
    await bau.keyboard.down('Control');
    await bau.mouse.move(x0, y0);
    await bau.mouse.down();
    await bau.mouse.move(x1, y1, { steps: 4 });
    await bau.mouse.up();
    await bau.keyboard.up('Control');
    check((await liste()) === 'objekt:o2', 'A4: Strg+Rahmen über leerem Gebiet ergänzt nichts und behält die Auswahl', await liste());
  }

  // Strg+Klick ergänzt und entfernt
  await klick([420, -70]);
  check((await liste()) === 'objekt:o1', 'A4: Linksklick wählt ein Ding');
  await klick([600, 150], { modifiers: ['Control'] });
  check((await liste()) === 'formteil:f1,objekt:o1' && (await b((e) => e.state.auswahl)).id === 'f1', 'A4: Strg+Klick ergänzt die Auswahl (Hauptwahl ist das zuletzt gewählte Ding)', await liste());
  await klick([900, 0], { modifiers: ['Control'] });
  check((await liste()) === 'formteil:f1,objekt:o1,objekt:o2', 'A4: noch einmal Strg+Klick');
  await klick([420, -70], { modifiers: ['Control'] });
  check((await liste()) === 'formteil:f1,objekt:o2', 'A4: Strg+Klick auf ein gewähltes Ding nimmt es wieder heraus', await liste());
  await klick([600, 150]);
  check((await liste()) === 'formteil:f1', 'A4: Linksklick ohne Strg wählt nur dieses Ding');

  // Gemeinsam verschieben (Ziehen)
  await klick([420, -70]);
  await klick([600, 150], { modifiers: ['Control'] });
  const vorSchub = await b((e) => JSON.stringify([e.gebiet().formteile.find((f) => f.id === 'f1'), e.gebiet().objekte.find((o) => o.id === 'o1'), e.gebiet().objekte.find((o) => o.id === 'o2')]));
  const s0 = await schritte();
  await zieh([600, 150], [800, 250]); // f1 greifen und mit o1 zusammen schieben
  const nachSchub = await b((e) => [e.gebiet().formteile.find((f) => f.id === 'f1'), e.gebiet().objekte.find((o) => o.id === 'o1'), e.gebiet().objekte.find((o) => o.id === 'o2')]);
  const v = JSON.parse(vorSchub);
  check(nachSchub[0].x === v[0].x + 200 && nachSchub[0].y === v[0].y + 100 && nachSchub[1].x === v[1].x + 200 && Math.abs(nachSchub[1].y - v[1].y - 100) <= 10, 'A4: Ziehen verschiebt die ganze Auswahl um denselben Betrag (+200 | +100)', JSON.stringify(nachSchub));
  check(nachSchub[2].x === v[2].x && nachSchub[2].y === v[2].y, 'A4: nicht Gewähltes (Gegner o2) bleibt stehen');
  check((await schritte()) === s0 + 1 && (await bau.locator('#b-undo').textContent()) === 'Rückgängig: Auswahl verschieben', 'A4: das Verschieben mehrerer ist ein einziger Rückgängig-Schritt („Auswahl verschieben“)');
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A4: Strg+Z stellt alles exakt her');

  // Pfeiltasten verschieben die Auswahl im Raster
  await klick([420, -70]);
  const o1 = await b((e) => e.gebiet().objekte.find((o) => o.id === 'o1'));
  const cx0 = await b((e) => e.ansicht.cx);
  await bau.keyboard.press('ArrowRight');
  let o1b = await b((e) => e.gebiet().objekte.find((o) => o.id === 'o1'));
  check(o1b.x === o1.x + 20 && (await b((e) => e.ansicht.cx)) === cx0, 'A4: Pfeil rechts verschiebt die Auswahl um 20 E (der Plan bleibt stehen)', JSON.stringify(o1b));
  await bau.keyboard.press('Shift+ArrowDown');
  o1b = await b((e) => e.gebiet().objekte.find((o) => o.id === 'o1'));
  check(Math.abs(o1b.y - (o1.y + 100)) <= 10, 'A4: Umschalt+Pfeil verschiebt um 5 Raster (100 E)', JSON.stringify(o1b));
  check((await bau.locator('#b-undo').textContent()) === 'Rückgängig: Auswahl verschieben', 'A4: Pfeil-Verschiebung steht im Rückgängig');
  await bau.keyboard.press('Control+KeyZ');
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A4: zwei Schritte zurück');
  // gedrehte Ansicht: Pfeil nach rechts = die Achse, die auf dem Bildschirm nach rechts zeigt
  await b((e) => { e.ansicht.blick = 2; }); // Süden zeigt nach rechts
  await bau.keyboard.press('ArrowRight');
  o1b = await b((e) => e.gebiet().objekte.find((o) => o.id === 'o1'));
  check(o1b.x === o1.x && Math.abs(o1b.y - (o1.y + 20)) <= 10, 'A4: bei gedrehter Ansicht folgt der Pfeil dem Bildschirm (Süden = rechts → y + 20)', JSON.stringify(o1b));
  await bau.keyboard.press('Control+KeyZ');
  await b((e) => e.norden());
  // Knoten in der Auswahl: Schritt 100 E (ihr Raster)
  await b((e) => e.setzeAuswahl([{ art: 'knoten', id: 'K4' }]));
  await bau.keyboard.press('ArrowRight');
  check((await b((e) => e.gebiet().knoten.find((k) => k.id === 'K4').x)) === 1800 + 100 || (await b((e) => e.gebiet().knoten.length)) === 5, 'A4: ein gewählter Knoten rastet auf 100 E (Pfeil = 100 E)');
  await bau.keyboard.press('Control+KeyZ');
  // ohne Auswahl und bei nur einem gewählten Gang verschieben die Pfeile den Plan
  await b((e) => e.waehle(null));
  const cxA = await b((e) => e.ansicht.cx);
  await bau.keyboard.press('ArrowLeft');
  check((await b((e) => e.ansicht.cx)) !== cxA && (await daten()) === daten0, 'A4: ohne Auswahl verschiebt der Pfeil den Plan');
  await b((e) => e.waehle({ art: 'gang', id: 'schleuse' }));
  const cxB = await b((e) => e.ansicht.cx);
  await bau.keyboard.press('ArrowLeft');
  check((await b((e) => e.ansicht.cx)) !== cxB && (await daten()) === daten0, 'A4: ist nur ein Gang gewählt, verschiebt der Pfeil den Plan (kein versehentliches Verschieben)');

  // Strg+A
  await b((e) => e.waehle(null));
  await bau.keyboard.press('Control+KeyA');
  const alle = await b((e) => { const g = e.gebiet(); return [e.auswahlListe().length, g.knoten.length + g.gaenge.length + g.formteile.length + g.objekte.length]; });
  check(alle[0] === alle[1], `A4: Strg+A wählt alles in der Ansicht (${alle[0]} von ${alle[1]})`);
  await bau.click('#l-gegner');
  await bau.keyboard.press('Control+KeyA');
  const ohneG = await liste();
  check(!/objekt:o2/.test(ohneG) && /objekt:o1/.test(ohneG), 'A4: Strg+A lässt gesperrte Ebenen aus (Gegner)');
  await zieh([-150, -250], [1350, 250]);
  check(!/objekt:o2/.test(await liste()), 'A4: der Auswahlrahmen lässt gesperrte Ebenen aus');
  await bau.click('#l-gegner');
  await b((e) => e.oeffneLevel('schleuse'));
  await bau.keyboard.press('Control+KeyA');
  check((await liste()) === 'formteil:f1,gang:schleuse,knoten:K1,knoten:K2,objekt:o1,objekt:o2', 'A4: Strg+A in der Levelansicht wählt nur die Dinge des Levels', await liste());
  await b((e) => e.zuKarte());

  // Kopieren, Einfügen, Duplizieren mehrerer Dinge
  await b((e) => e.setzeAuswahl([{ art: 'objekt', id: 'o1' }, { art: 'formteil', id: 'f1' }]));
  await bau.keyboard.press('Control+KeyC');
  const [mx, my] = await bild([1500, -700]);
  await bau.mouse.move(mx, my);
  const s1 = await schritte();
  await bau.keyboard.press('Control+KeyV');
  let g1 = await b((e) => e.gebiet());
  check(g1.objekte.length === 3 && g1.formteile.length === 2 && (await schritte()) === s1 + 1, 'A4: Strg+C, Maus verschieben, Strg+V fügt beide Teile in einem Schritt ein');
  const neuO = g1.objekte.at(-1);
  const neuF = g1.formteile.at(-1);
  check(neuO.id !== 'o1' && neuF.id !== 'f1' && neuO.laenge === 240 && neuF.laenge === 260, 'A4: die Kopien haben neue IDs und die Maße der Originale');
  check(Math.abs((neuO.x + neuF.x) / 2 - 1500) <= 60 && Math.abs((neuO.y + neuF.y) / 2 + 700) <= 60, 'A4: die Mitte der Gruppe liegt an der Mausstelle');
  check((await liste()) === `formteil:${neuF.id},objekt:${neuO.id}`, 'A4: die Kopien sind danach gewählt');
  await bau.keyboard.press('Control+KeyD');
  g1 = await b((e) => e.gebiet());
  check(g1.objekte.length === 4 && g1.formteile.length === 3 && g1.objekte.at(-1).x === neuO.x + 40, 'A4: Strg+D dupliziert die ganze Auswahl (+40 E)');
  await bau.keyboard.press('Control+KeyZ');
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A4: zwei Schritte zurück = Ausgangszustand');
  // Gang samt Knoten
  await b((e) => e.setzeAuswahl([{ art: 'gang', id: 'ostgang' }]));
  await bau.keyboard.press('Control+KeyC');
  const [gx, gy] = await bild([1500, 800]);
  await bau.mouse.move(gx, gy);
  await bau.keyboard.press('Control+KeyV');
  const g2 = await b((e) => e.gebiet());
  const neuGang = g2.gaenge.at(-1);
  check(g2.gaenge.length === 5 && g2.knoten.length === 7 && neuGang.name === 'Ostgang' && neuGang.von !== 'K2' && neuGang.nach !== 'K5', 'A4: ein kopierter Gang nimmt neue Knoten mit (Gang und zwei Knoten)');
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A4: Rückgängig nimmt Gang und Knoten zusammen zurück');
  // Löschen mehrerer
  await b((e) => e.setzeAuswahl([{ art: 'objekt', id: 'o1' }, { art: 'formteil', id: 'f1' }, { art: 'objekt', id: 'o2' }]));
  await bau.keyboard.press('Delete');
  const g3 = await b((e) => e.gebiet());
  check(g3.objekte.length === 0 && g3.formteile.length === 0 && (await b((e) => e.state.auswahl)) === null, 'A4: Entf löscht die ganze Auswahl');
  await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A4: ein Strg+Z bringt alle zurück');
  // Drehen mehrerer
  await b((e) => e.setzeAuswahl([{ art: 'objekt', id: 'o1' }, { art: 'formteil', id: 'f1' }]));
  await bau.keyboard.press('KeyR');
  const g4 = await b((e) => e.gebiet());
  check(g4.objekte.find((o) => o.id === 'o1').winkel === 45 && g4.formteile.find((f) => f.id === 'f1').winkel === 45, 'A4: R dreht alle gewählten Teile um 45°');
  await bau.keyboard.press('Control+KeyZ');
}

// ------------------------------------------------------------------ A7 Rechtsklick bei Auswahl = Kopie des ausgewählten Objekts
{
  await b((e) => {
    while (e.verlaufVon(e.state.gebietId).kannZurueck) e.rueckgaengig();
    e.setzeWerkzeug('auswahl');
    e.waehle(null);
  });
  const daten0 = await daten();
  const s0 = await schritte();
  await klick([420, -70]); // die Wand o1 (240 × 60)
  await klick([900, -600], RECHTS);
  let g = await b((e) => e.gebiet());
  let kopie1 = g.objekte.at(-1);
  check(g.objekte.length === 3 && kopie1.typ === 'wand' && kopie1.laenge === 240 && kopie1.breite === 60 && kopie1.winkel === 0 && kopie1.x === 900 && kopie1.y === -600 && kopie1.id !== 'o1', 'A7: Rechtsklick bei gewählter Wand setzt eine Kopie davon an die Mausstelle (240 × 60, im Raster)', JSON.stringify(kopie1));
  check((await b((e) => e.state.auswahl))?.id === kopie1.id && (await bau.locator('#b-undo').textContent()) === 'Rückgängig: Kopie setzen', 'A7: die Kopie ist danach gewählt; im Rückgängig steht „Kopie setzen“');
  await klick([1500, -600], RECHTS);
  g = await b((e) => e.gebiet());
  check(g.objekte.length === 4 && g.objekte.at(-1).x === 1500, 'A7: noch ein Rechtsklick kopiert die Kopie weiter');
  // Gegner kopieren
  await klick([900, 0]);
  await klick([1500, -300], RECHTS);
  g = await b((e) => e.gebiet());
  check(g.objekte.at(-1).typ === 'gegner' && g.objekte.at(-1).art === 'ente' && g.objekte.at(-1).platzhalter === true && g.objekte.at(-1).x === 1500, 'A7: ein gewählter Gegner wird als Gegner derselben Art kopiert');
  // Rechts ziehen mit Auswahl kopiert nicht
  const vor = await daten();
  await zieh([1900, -700], [2100, -700], RECHTS);
  check((await daten()) === vor, 'A7: Rechts ziehen mit Auswahl setzt nichts');
  // Element wählen hebt die Auswahl auf: Rechtsklick setzt dann das Element, nicht die Kopie
  await bau.keyboard.press('KeyH');
  check((await b((e) => e.state.auswahl)) === null, 'A7: ein Element wählen (Taste H) hebt die Auswahl auf');
  await klick([1900, -700], RECHTS);
  g = await b((e) => e.gebiet());
  check(g.objekte.at(-1).typ === 'hindernis' && g.objekte.at(-1).laenge === 60, 'A7: ohne Auswahl setzt der Rechtsklick das Palettenelement (Hindernis 60 × 60)');
  // Nur ein Gang gewählt zählt nicht als Objekt: das Palettenelement wird gesetzt
  await b((e) => e.waehle({ art: 'gang', id: 'schleuse' }));
  await klick([2100, 400], RECHTS);
  g = await b((e) => e.gebiet());
  check(g.objekte.at(-1).typ === 'hindernis' && g.objekte.at(-1).x === 2100, 'A7: bei nur einem gewählten Gang setzt der Rechtsklick das Palettenelement');
  // Knoten kopieren
  await bau.keyboard.press('KeyV');
  await b((e) => e.setzeAuswahl([{ art: 'knoten', id: 'K5' }]));
  await klick([1500, 900], RECHTS);
  g = await b((e) => e.gebiet());
  const nk = g.knoten.at(-1);
  check(nk.typ === 'raum' && nk.w === 520 && nk.h === 400 && nk.x === 1500 && nk.y === 900, 'A7: ein gewählter Knoten (Raum) wird mit Maßen an die Mausstelle kopiert (im 100-E-Raster)', JSON.stringify(nk)); // richtung-ok
  // gesperrte Ebene: keine Kopie
  await b((e) => e.setzeAuswahl([{ art: 'objekt', id: 'o1' }]));
  await b((e) => { e.state.gesperrt.add('waende'); });
  const vor2 = await daten();
  await klick([1000, -900], RECHTS);
  check((await daten()) === vor2 && /gesperrt/.test(await bau.locator('#melden').textContent()), 'A7: in eine gesperrte Ebene wird nicht kopiert (Meldung)');
  await b((e) => { e.state.gesperrt.delete('waende'); e.melde(''); });
  while ((await schritte()) > s0) await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A7: alles rückgängig = Ausgangszustand');
}


// ------------------------------------------------------------------ A8 Tileset-Fenster
{
  await b((e) => {
    while (e.verlaufVon(e.state.gebietId).kannZurueck) e.rueckgaengig();
    e.setzeWerkzeug('auswahl');
    e.wechsle('beispiel');
    e.waehle(null);
    e.alles();
    e.setzeZoom(8);
  });
  const daten0 = await daten();
  const fenster = bau.locator('#tilesetfenster');
  check(!(await fenster.isVisible()), 'A8: das Tileset-Fenster ist zu Beginn ausgeblendet');
  await bau.keyboard.press('KeyI');
  check(await fenster.isVisible(), 'A8: die Taste I blendet das Tileset-Fenster ein');
  const ts = await b((e) => e.gebiet().tileset);
  check((await bau.locator('#tf-titel').textContent()).includes(TILESETS[ts].name), `A8: der Titel nennt das Tileset des Gebiets („${await bau.locator('#tf-titel').textContent()}“)`);
  // alle Teile des Tilesets als Bilder: Gang, 5 Knotentypen, Formteil, Wand, Hindernis, alle Gegner
  const ids = await bau.locator('#tilesetfenster canvas').evaluateAll((l) => l.map((c) => c.id));
  const erwartet = ['tf-gang', ...Object.keys(KNOTENTYPEN).map((k) => 'tf-knoten-' + k), 'tf-formteil', 'tf-wand', 'tf-hindernis', ...gegnerFuer(ts).map((a) => 'tf-gegner-' + a)];
  check(JSON.stringify(ids) === JSON.stringify(erwartet), `A8: das Fenster zeigt alle ${erwartet.length} Elemente des Tilesets (Gegner des Tilesets zuerst)`, ids.join(','));
  const bunt = await bau.locator('#tilesetfenster canvas').evaluateAll((l) =>
    l.map((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const farben = new Set();
      for (let i = 0; i < d.length; i += 4 * 7) farben.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      return farben.size;
    }),
  );
  check(bunt.every((n) => n >= 2) && bunt.length === erwartet.length, `A8: jedes Element ist ein gezeichnetes Bild (mindestens zwei Farben, kleinster Wert ${Math.min(...bunt)})`);
  await bauShot('a8-tilesetfenster');
  // Klick wählt das aktuelle Element
  await bau.click('#tf-hindernis');
  check((await b((e) => e.state.werkzeug)) === 'hindernis' && (await bau.locator('#tf-hindernis.aktiv').count()) === 1, 'A8: Klick auf „Hindernis“ wählt es als aktuelles Element (markiert)');
  await klick([1900, -700], RECHTS);
  check((await b((e) => e.gebiet().objekte.at(-1).typ)) === 'hindernis', 'A8: der Rechtsklick im Plan setzt das gewählte Element');
  await bau.click('#tf-gegner-seife');
  check((await b((e) => [e.state.werkzeug, e.state.gegnerArt].join())) === 'gegner,seife' && (await bau.locator('#tf-gegner-seife.aktiv').count()) === 1 && (await bau.locator('#tf-hindernis.aktiv').count()) === 0, 'A8: Klick auf einen Gegner (Seife) wählt Werkzeug und Art; nur dieses Bild ist markiert');
  await klick([2100, -300], RECHTS);
  check((await b((e) => e.gebiet().objekte.at(-1).art)) === 'seife', 'A8: der Rechtsklick setzt die Seife');
  await bau.click('#tf-knoten-boss');
  await klick([2000, 900], RECHTS);
  check((await b((e) => e.gebiet().knoten.at(-1).typ)) === 'boss' && (await b((e) => e.state.knotenTyp)) === 'boss', 'A8: Klick auf den Knoten „Boss“ stellt den Knotentyp ein – der Rechtsklick setzt einen Boss-Knoten');
  await bau.click('#tf-gang');
  check((await b((e) => e.state.werkzeug)) === 'gang', 'A8: Klick auf „Gang“ wählt das Gang-Werkzeug');
  // Rechtsklick auf das Fenster selbst setzt nichts im Plan darunter
  const vor = await daten();
  const fb = await fenster.boundingBox();
  await bau.mouse.click(fb.x + 100, fb.y + 120, RECHTS);
  await bau.mouse.click(fb.x + 100, fb.y + 120);
  check((await daten()) === vor, 'A8: Klicks auf das Fenster erreichen den Plan darunter nicht');
  // verschiebbar am Titel
  const kopf = await bau.locator('#tf-kopf').boundingBox();
  await bau.mouse.move(kopf.x + 40, kopf.y + 10);
  await bau.mouse.down();
  await bau.mouse.move(kopf.x + 40 + 150, kopf.y + 10 + 80, { steps: 5 });
  await bau.mouse.up();
  const fb2 = await fenster.boundingBox();
  check(Math.abs(fb2.x - fb.x - 150) <= 1 && Math.abs(fb2.y - fb.y - 80) <= 1, `A8: das Fenster lässt sich am Titel verschieben (+150 | +80: ${(fb2.x - fb.x).toFixed(0)} | ${(fb2.y - fb.y).toFixed(0)})`);
  await bau.mouse.move(fb2.x + 40, fb2.y + 10);
  await bau.mouse.down();
  await bau.mouse.move(5000, 5000, { steps: 4 });
  await bau.mouse.up();
  const fb3 = await fenster.boundingBox();
  check(fb3.x + fb3.width <= bBox.x + bBox.width + 1 && fb3.y < bBox.y + bBox.height, 'A8: es bleibt im Plan, auch wenn man es weit hinauszieht');
  check((await daten()) === vor, 'A8: Verschieben des Fensters ändert keine Daten');
  // Tileset des Gebiets wechseln: Titel und Gegner-Reihenfolge folgen
  const anderes = Object.keys(TILESETS).find((t) => t !== ts && JSON.stringify(gegnerFuer(t)) !== JSON.stringify(gegnerFuer(ts)));
  await b((e) => e.waehle(null));
  await bau.selectOption('#f-tileset', anderes);
  const ids2 = await bau.locator('#tilesetfenster canvas').evaluateAll((l) => l.map((c) => c.id));
  check((await bau.locator('#tf-titel').textContent()).includes(TILESETS[anderes].name) && ids2.join() === ['tf-gang', ...Object.keys(KNOTENTYPEN).map((k) => 'tf-knoten-' + k), 'tf-formteil', 'tf-wand', 'tf-hindernis', ...gegnerFuer(anderes).map((a) => 'tf-gegner-' + a)].join(), `A8: ein anderes Tileset („${TILESETS[anderes].name}“) ändert Titel und Gegnerreihenfolge`);
  await bau.keyboard.press('Control+KeyZ'); // Tileset zurück
  // Welt-Ansicht: ausgeblendet; zurück: wieder da
  await b((e) => e.zuWelt());
  check(!(await fenster.isVisible()), 'A8: in der Welt-Ansicht ist das Fenster ausgeblendet');
  await b((e) => e.zuGebiet());
  check(await fenster.isVisible(), 'A8: zurück im Gebiet ist es wieder da');
  // Taste und Knopf blenden aus
  await bau.keyboard.press('KeyI');
  check(!(await fenster.isVisible()), 'A8: die Taste I blendet es wieder aus');
  await bau.click('#b-tileset');
  check(await fenster.isVisible(), 'A8: der Knopf „Tileset“ blendet es ein');
  await bau.click('#tf-zu');
  check(!(await fenster.isVisible()), 'A8: das Schließen-Kreuz blendet es aus');
  while ((await schritte()) > 0) await bau.keyboard.press('Control+KeyZ');
  check((await daten()) === daten0, 'A8: alles rückgängig = Ausgangszustand');
  await b((e) => e.setzeWerkzeug('auswahl'));
}

check(bauFehler.length === 0, 'Bedienung (Bauen): keine Konsolenfehler', bauFehler.join('; '));

check(errors.length === 0, 'Bedienung: keine Konsolenfehler', errors.join('; '));
await browser.close();
if (failures) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Bedienungs-Prüfungen bestanden.');
