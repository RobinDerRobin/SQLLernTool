// Wegwerf-Skript für P1c „Netz“: Screenshots an jeder Stelle A–I (vor, im und nach dem Schwenk) nach
// e2e/screenshots/netz-*.png, dazu Prüfungen im echten Browser (Direktstart, ?proto=fenster, ?spiel, keine Fehler)
// und die 60-fps-Messung nur für diese Szene (Budget wie e2e/perf.mjs; nicht in `npm run e2e:perf`).
//
//   node e2e/netz.mjs [--nur=A,C]
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
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
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

// ------------------------------------------------------------ Direktstart und Zugänge
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
check(await proto(() => window.__wendehals.game.screen === 'proto' && window.__wendehals.game.proto.map.def.name === 'netz'), 'Start ohne Parameter direkt im Netz');
await page.goto(url + '?proto=fenster');
await page.waitForFunction(() => window.__wendehals?.game.proto);
check(await proto(() => window.__wendehals.game.proto.map.def.name === 'kreuz'), '?proto=fenster startet P1 „Kreuzung“');
await page.goto(url + '?spiel');
await page.waitForFunction(() => window.__wendehals?.game);
check(await proto(() => window.__wendehals.game.screen !== 'proto'), '?spiel öffnet das v0.2-Spiel');
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
await page.keyboard.press('Escape');
await wait(200);
check(await proto(() => window.__wendehals.game.screen === 'title'), 'Esc führt zum v0.2-Titel');

// ------------------------------------------------------------ Stellen A–I
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
const N = { E: 0, S: 2, W: 4, N: 6 };
// theta/s: Ausrichtung (Kartenrichtung des rechten Fensterendes), Seite; key: Taste für die Drehung
const SZENEN = [
  { id: 'A', name: 'plus-kreuzung', x: -140, y: 0, theta: N.E, s: 'R', key: 'KeyO', text: 'rechts drehen auf der + Kreuzung' },
  { id: 'B', name: 't-kreuzung', x: -60, y: -500, theta: N.E, s: 'R', key: 'KeyO', text: 'T-Kreuzung am Nord-Ring, rechts (Süden) geht' },
  { id: 'C', name: 'l-knick', x: 452, y: -500, theta: N.E, s: 'R', key: 'KeyO', text: 'L-Knick Nordost, zu früh rechts gedreht', abgelehnt: 'KeyU' },
  { id: 'D', name: 'zwei-kreuzungen', x: 130, y: 0, theta: N.E, s: 'R', key: 'KeyU', text: 'zwischen A und D, links (Stummel) geht' },
  { id: 'E', name: 'versetzte-abzweige', x: -560, y: 0, theta: N.E, s: 'R', key: 'KeyU', text: 'versetzte Abzweige, links ab' },
  { id: 'F', name: 'breiter-raum', x: 250, y: 500, theta: N.E, s: 'R', fly: { my: 1, ms: 800 }, text: 'breiter Raum, der Dackel fliegt an die Südwand' },
  { id: 'F2', name: 'breiter-raum-kopfueber', x: 450, y: 500, theta: N.W, s: 'R', fly: { my: -1, ms: 800 }, text: 'breiter Raum kopfüber (Plan steht auf dem Kopf)' },
  { id: 'G', name: 'schmaler-gang', x: -900, y: -250, theta: N.S, s: 'R', fly: { my: 0.5, ms: 800 }, text: 'schmaler Gang (West-Ring)' },
  { id: 'H', name: 'stummel', x: 260, y: -200, theta: N.N, s: 'R', key: 'KeyO', text: 'Stummel nördlich von D, rechts (Osten)' },
  { id: 'I', name: 'ring-ecke', x: 700, y: 500, theta: N.S, s: 'R', key: 'KeyO', text: 'Ring, Südost-Ecke, rechts herum (Westen)' },
  { id: 'I2', name: 'ring-kopfueber', x: 600, y: -500, theta: N.W, s: 'L', key: 'KeyO', text: 'Ring kopfüber (Plan steht auf dem Kopf), rechts drehen an der Nordost-Ecke' },
];
for (const sz of SZENEN) {
  if (only.length && !only.includes(sz.id)) continue;
  await proto((s) => {
    const p = window.__wendehals.game.proto;
    p.hint = 0;
    p.warp(s.x, s.y, s.theta, s.s);
  }, sz);
  await wait(250);
  const base = path.join(shots, `netz-${sz.id}-${sz.name}`);
  await page.screenshot({ path: base + '-1-vor.png' });
  const before = await proto(() => {
    const p = window.__wendehals.game.proto;
    return { m: p.dogMap(), theta: p.theta, deaths: p.deaths };
  });
  if (sz.abgelehnt) {
    await page.keyboard.press(sz.abgelehnt);
    await wait(100);
    await page.screenshot({ path: base + '-0-abgelehnt.png' });
  }
  if (sz.key) {
    await page.keyboard.press(sz.key);
    await wait(250);
    await page.screenshot({ path: base + '-2-schwenk.png' });
    await wait(700);
    await page.screenshot({ path: base + '-3-nach.png' });
    const after = await proto(() => {
      const p = window.__wendehals.game.proto;
      return { m: p.dogMap(), theta: p.theta, swing: !!p.swing, deaths: p.deaths };
    });
    check(after.theta !== before.theta && !after.swing, `${sz.id}: Drehung angenommen (${sz.text})`);
    // Die Drehung ändert die Kartenposition des Dackels nur durch das Scrollen in der kurzen Zeit davor/danach, nie quer.
    // Der Dackel wird nur in Flugrichtung getragen (70/s); wer zu früh dreht und nicht lenkt, stirbt und beginnt an der letzten Kreuzung neu
    check(after.deaths > before.deaths || Math.hypot(after.m.x - before.m.x, after.m.y - before.m.y) < 140, `${sz.id}: Dackel nur ein Stück getragen (oder gestorben und neu gestartet)`);
    await wait(1500);
    await page.screenshot({ path: base + '-4-spaeter.png' });
  }
  if (sz.fly) {
    const keys = { 1: 'ArrowDown', '-1': 'ArrowUp', '0.5': 'ArrowDown' }[String(sz.fly.my)];
    await page.keyboard.down(keys);
    await wait(sz.fly.ms);
    await page.keyboard.up(keys);
    await page.screenshot({ path: base + '-2-geflogen.png' });
  }
}

// ------------------------------------------------------------ 60 fps nur in dieser Szene
await page.goto(url);
await page.waitForFunction(() => window.__wendehals?.game.proto);
await proto(() => {
  const p = window.__wendehals.game.proto;
  p.hint = 0;
  p.warp(-140, 0, 0, 'R');
  window.__wendehals.perf.reset();
});
const keysSeq = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
for (let i = 0; i < 12; i++) {
  await page.keyboard.down(keysSeq[i % 4]);
  await wait(250);
  await page.keyboard.up(keysSeq[i % 4]);
  if (i % 3 === 0) await page.keyboard.press(i % 2 ? 'KeyU' : 'KeyO');
}
const perf = await proto(() => window.__wendehals.perf.summary());
console.log(JSON.stringify(perf));
check(perf.n > 100, 'genug Frames gemessen: ' + perf.n);
check(perf.workP95 < 8, `Arbeit je Frame p95 ${perf.workP95.toFixed(2)} ms < 8 ms (60 fps)`);
check(perf.frameP95 < 20, `Bildabstand p95 ${perf.frameP95.toFixed(1)} ms < 20 ms`);
check(perf.frames50 <= 1, `Hänger über 50 ms: ${perf.frames50}`);
check(errors.length === 0, 'keine JavaScript-Fehler ' + JSON.stringify(errors));

await browser.close();
if (failed) {
  console.error(failed + ' Prüfungen fehlgeschlagen');
  process.exit(1);
}
console.log('ok – Screenshots in e2e/screenshots/netz-*.png');
