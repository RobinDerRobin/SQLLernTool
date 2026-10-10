// Wegwerf-Skript für P3 „45°-Kreuzung“: Screenshots nach e2e/screenshots/achteck-*.png (Start, in jedem Diagonal-Arm, mitten im
// 45°-Schwenk, nach 45°, kopfüber mit θ = Nordwesten, s = L), Prüfungen im echten Browser (Direktstart, ?proto=netz/fenster, ?spiel,
// J/K und LT/RT, keine Fehler) und die 60-fps-Messung nur für diese Szene (Budget wie e2e/netz.mjs).
//
//   node e2e/achteck.mjs
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { headingAngle } from '../src/core/math.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = path.join(root, 'e2e/screenshots');
await mkdir(shots, { recursive: true });
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
const ready = () => page.waitForFunction(() => window.__wendehals?.game.proto);

// ------------------------------------------------------------ Direktstart und Zugänge
await page.goto(url);
await ready();
check(await proto(() => window.__wendehals.game.screen === 'proto' && window.__wendehals.game.proto.map.def.name === 'achteck'), 'Start ohne Parameter direkt in der 45°-Kreuzung');
await page.goto(url + '?proto=fenster');
await ready();
check(await proto(() => window.__wendehals.game.proto.map.def.name === 'kreuz'), '?proto=fenster startet P1 „Kreuzung“');
await page.goto(url + '?proto=netz');
await ready();
check(await proto(() => window.__wendehals.game.proto.map.def.name === 'netz'), '?proto=netz startet P1c „Netz“ (mit Minimap)');
await page.goto(url + '?spiel');
await page.waitForFunction(() => window.__wendehals?.game);
check(await proto(() => window.__wendehals.game.screen !== 'proto'), '?spiel öffnet das v0.2-Spiel');
await page.goto(url);
await ready();
await page.keyboard.press('Escape');
await wait(200);
check(await proto(() => window.__wendehals.game.screen === 'title'), 'Esc führt zum v0.2-Titel');
// Optionen → Prototyp: 45°-Kreuzung
await proto(() => window.__wendehals.game.openOptions(() => window.__wendehals.game.openTitleMenu(), { fromTitle: true }));
check(await proto(() => window.__wendehals.game.overlay.items.some((i) => i.label === 'Prototyp: 45°-Kreuzung')), 'Optionen enthalten „Prototyp: 45°-Kreuzung“');
await proto(() => window.__wendehals.game.overlay.items.find((i) => i.label === 'Prototyp: 45°-Kreuzung').action());
check(await proto(() => window.__wendehals.game.proto?.map.def.name === 'achteck'), 'Optionen → 45°-Kreuzung startet die Szene');

// ------------------------------------------------------------ Screenshots
await page.goto(url);
await ready();
const T = { E: 0, SE: 1, S: 2, SW: 3, W: 4, NW: 5, N: 6, NE: 7 };
const A = 241.42; // Abstand Mitte–Seite
const at = (dir, along) => {
  const a = headingAngle(dir);
  return { x: Math.cos(a) * along, y: Math.sin(a) * along };
};
const setup = (s) =>
  proto((s) => {
    const p = window.__wendehals.game.proto;
    p.hint = 0;
    p.warp(s.x, s.y, s.theta, s.s);
  }, s);
await wait(300);
await page.screenshot({ path: path.join(shots, 'achteck-0-start.png') });
await proto(() => { window.__wendehals.game.proto.hint = 8; });
await wait(100);
await page.screenshot({ path: path.join(shots, 'achteck-0-hinweis.png') });
// in jedem Diagonal-Arm (Fenster ausgerichtet, Blick nach außen)
for (const [name, dir] of [['nordost', T.NE], ['suedost', T.SE], ['suedwest', T.SW], ['nordwest', T.NW]]) {
  const p = at(dir, A + 200);
  await setup({ x: p.x, y: p.y, theta: dir, s: 'R' });
  await wait(200);
  await page.screenshot({ path: path.join(shots, `achteck-arm-${name}.png`) });
}
// 45°-Drehung im Achteck: vor, mitten im Schwenk, nach 45°
await setup({ x: -60, y: 0, theta: T.E, s: 'R' });
await wait(150);
await page.screenshot({ path: path.join(shots, 'achteck-45-1-vor.png') });
const before = await proto(() => ({ m: window.__wendehals.game.proto.dogMap(), theta: window.__wendehals.game.proto.theta }));
await page.keyboard.press('KeyK'); // RT: +45°
await wait(250);
await page.screenshot({ path: path.join(shots, 'achteck-45-2-schwenk.png') });
await wait(500);
await page.screenshot({ path: path.join(shots, 'achteck-45-3-nach.png') });
const after = await proto(() => ({ theta: window.__wendehals.game.proto.theta, swing: !!window.__wendehals.game.proto.swing }));
check(before.theta === T.E && after.theta === T.SE && !after.swing, 'K (RT) dreht +45°: Osten → Südosten');
await setup({ x: -60, y: 0, theta: T.E, s: 'R' });
await page.keyboard.press('KeyJ');
await wait(800);
check(await proto(() => window.__wendehals.game.proto.theta === 7), 'J (LT) dreht −45°: Osten → Nordosten');
await setup({ x: -60, y: 0, theta: T.E, s: 'R' });
await page.keyboard.press('KeyO');
await wait(800);
check(await proto(() => window.__wendehals.game.proto.theta === 2), 'O (RB) dreht +90°: Osten → Süden');
// kopfüber (θ = Nordwesten) und s = L
await setup({ x: 40, y: 20, theta: T.NW, s: 'L' });
await wait(200);
await page.screenshot({ path: path.join(shots, 'achteck-kopfueber-sL.png') });
await page.keyboard.press('KeyK');
await wait(250);
await page.screenshot({ path: path.join(shots, 'achteck-kopfueber-schwenk.png') });
await wait(700);
await page.screenshot({ path: path.join(shots, 'achteck-kopfueber-nach45.png') });
// abgelehnt im Arm (Symbol rot)
await setup({ x: A + 500, y: 0, theta: T.E, s: 'R' });
await page.keyboard.press('KeyK');
await wait(120);
await page.screenshot({ path: path.join(shots, 'achteck-abgelehnt.png') });
check(await proto(() => !!window.__wendehals.game.proto.denied), 'Drehen im Arm außerhalb der Zone wird abgelehnt');

// ------------------------------------------------------------ 60 fps nur in dieser Szene
await page.goto(url);
await ready();
await proto(() => {
  const p = window.__wendehals.game.proto;
  p.hint = 0;
  p.warp(-140, 0, 0, 'R');
  window.__wendehals.perf.reset();
});
const keysSeq = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
const rot = ['KeyJ', 'KeyK', 'KeyU', 'KeyO'];
for (let i = 0; i < 16; i++) {
  await page.keyboard.down(keysSeq[i % 4]);
  await wait(250);
  await page.keyboard.up(keysSeq[i % 4]);
  if (i % 2 === 0) await page.keyboard.press(rot[(i / 2) % 4]);
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
console.log('ok – Screenshots in e2e/screenshots/achteck-*.png');
