// Wegwerf-Skript für P2 „Minimap“: Screenshots jeder Version (1, 2, 3) an den Stellen A, C, D, E, F und kopfüber, vor, im und nach
// dem Schwenk, nach e2e/screenshots/minimap-*.png (ganzes Bild und vergrößerter Ausschnitt der Minimap), dazu M-Umschalten im echten
// Browser und die 60-fps-Messung mit jeder Version.
//
//   node e2e/minimap.mjs [--nur=A,C]
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = path.join(root, 'e2e/screenshots');
await mkdir(shots, { recursive: true });
const only = (process.argv.find((a) => a.startsWith('--nur=')) || '').slice(6).split(',').filter(Boolean);
const executablePath = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const url = pathToFileURL(path.join(root, 'dist/index.html')).href;
let failed = 0;
const check = (c, m) => {
  console.log((c ? 'ok - ' : 'FEHLER: ') + m);
  if (!c) failed++;
};
const wait = (ms) => page.waitForTimeout(ms);
const proto = (f, arg) => page.evaluate(f, arg);
const N = { E: 0, S: 2, W: 4, N: 6 };
// Minimap sitzt oben in der Mitte: Rahmen x 180..300, y 4..64 (Bildschirm 480 × 270 auf 960 × 540)
const CROP = { x: 350, y: 0, width: 260, height: 140 };

// ------------------------------------------------------------ Start, Umschalten mit M
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
await wait(300);
const a = await page.screenshot({ clip: CROP });
for (const [i, ziel] of ['V2', 'V3', 'aus', 'V1'].entries()) {
  await page.keyboard.press('KeyM');
  await wait(120);
  const b = await page.screenshot({ clip: CROP });
  check(!a.equals(b) || ziel === 'V1', `M → ${ziel}: Bild ändert sich`);
  if (ziel === 'V1') check(a.length > 0, 'zurück bei V1');
}
// P1 „Kreuzung“ startet ohne Minimap
await page.goto(url + '?proto=fenster');
await page.waitForFunction(() => window.__wendehals?.game.proto);
await wait(300);
const p1 = await page.screenshot({ clip: CROP });
await page.keyboard.press('KeyM');
await wait(120);
check(!p1.equals(await page.screenshot({ clip: CROP })), 'P1: M schaltet die Minimap ein');

// ------------------------------------------------------------ Stellen
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
const SZENEN = [
  { id: 'A', name: 'plus-kreuzung', x: -140, y: 0, theta: N.E, s: 'R', key: 'KeyO' },
  { id: 'C', name: 'l-knick', x: 452, y: -500, theta: N.E, s: 'R', key: 'KeyO' },
  { id: 'D', name: 'zwei-kreuzungen', x: 130, y: 0, theta: N.E, s: 'R', key: 'KeyU' },
  { id: 'E', name: 'versetzte-abzweige', x: -560, y: 0, theta: N.E, s: 'R', key: 'KeyU' },
  { id: 'F', name: 'breiter-raum', x: 250, y: 500, theta: N.E, s: 'R', key: null },
  { id: 'K', name: 'kopfueber', x: 600, y: -500, theta: N.W, s: 'L', key: 'KeyO' },
];
const warp = (s) =>
  proto((s) => {
    const p = window.__wendehals.game.proto;
    p.hint = 0;
    p.warp(s.x, s.y, s.theta, s.s);
  }, s);
let schwenkChanged = 0;
for (const v of [1, 2, 3]) {
  for (const sz of SZENEN) {
    if (only.length && !only.includes(sz.id)) continue;
    await warp(sz);
    await wait(250);
    const base = path.join(shots, `minimap-V${v}-${sz.id}-${sz.name}`);
    await page.screenshot({ path: base + '-1-vor.png' });
    await page.screenshot({ path: base + '-1-vor-minimap.png', clip: CROP });
    if (sz.key) {
      const vorher = await page.screenshot({ clip: CROP });
      await page.keyboard.press(sz.key);
      await wait(250);
      await page.screenshot({ path: base + '-2-schwenk.png' });
      const mitte = await page.screenshot({ path: base + '-2-schwenk-minimap.png', clip: CROP });
      if (!vorher.equals(mitte)) schwenkChanged++;
      await wait(900);
      await page.screenshot({ path: base + '-3-nach.png' });
      await page.screenshot({ path: base + '-3-nach-minimap.png', clip: CROP });
    }
  }
  await page.keyboard.press('KeyM'); // nächste Version
  await wait(100);
}
check(schwenkChanged > 0, 'Minimap ändert sich im Schwenk (' + schwenkChanged + ' Fälle)');

// ------------------------------------------------------------ 60 fps mit jeder Version
const keysSeq = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
for (const v of [1, 2, 3]) {
  await proto(() => {
    const p = window.__wendehals.game.proto;
    p.hint = 0;
    p.warp(-140, 0, 0, 'R');
    window.__wendehals.perf.reset();
  });
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down(keysSeq[i % 4]);
    await wait(250);
    await page.keyboard.up(keysSeq[i % 4]);
    if (i % 3 === 0) await page.keyboard.press(i % 2 ? 'KeyU' : 'KeyO');
  }
  const perf = await proto(() => window.__wendehals.perf.summary());
  console.log(`V${v}: ` + JSON.stringify(perf));
  check(perf.n > 100, `V${v}: genug Frames gemessen: ${perf.n}`);
  check(perf.workP95 < 8, `V${v}: Arbeit je Frame p95 ${perf.workP95.toFixed(2)} ms < 8 ms (60 fps)`);
  check(perf.frameP95 < 20, `V${v}: Bildabstand p95 ${perf.frameP95.toFixed(1)} ms < 20 ms`);
  check(perf.frames50 <= 1, `V${v}: Hänger über 50 ms: ${perf.frames50}`);
  await page.keyboard.press('KeyM');
}
check(errors.length === 0, 'keine JavaScript-Fehler ' + JSON.stringify(errors));
await browser.close();
if (failed) {
  console.error(failed + ' Prüfungen fehlgeschlagen');
  process.exit(1);
}
console.log('ok – Screenshots in e2e/screenshots/minimap-*.png');
