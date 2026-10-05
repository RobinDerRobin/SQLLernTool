// Wegwerf: spielt eine volle Knochen-Runde in P1 per Tastatur (dist/index.html OHNE Parameter),
// Screenshots je Schritt nach e2e/screenshots/runde-*.png.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { turnCW, opposite, N, E, S, W } from '../src/core/math.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = path.join(root, 'e2e/screenshots');
await mkdir(shots, { recursive: true });
const executablePath = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href); // KEIN Parameter
await page.waitForFunction(() => window.__wendehals);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: path.join(shots, `runde-${n}.png`) });
const st = () =>
  page.evaluate(() => {
    const g = window.__wendehals.game;
    const p = g.proto;
    return g.screen === 'proto'
      ? { screen: g.screen, theta: p.theta, s: p.s, cam: { ...p.cam }, dog: { ...p.dog }, score: p.score, target: p.target }
      : { screen: g.screen };
  });
const log = async (m) => console.log(m, JSON.stringify(await st()));
let failed = 0;
const check = (c, m) => {
  console.log((c ? 'ok - ' : 'FEHLER: ') + m);
  if (!c) failed++;
};

await wait(400);
await shot('01-start-ohne-parameter');
check((await st()).screen === 'proto', 'Start ohne Parameter im Prototyp');
const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const hold = async (want) => {
  for (const k of keys) await (want.includes(k) ? page.keyboard.down(k) : page.keyboard.up(k));
};
const VEC = { 0: [1, 0], 2: [0, 1], 4: [-1, 0], 6: [0, -1] };
const ARMDIR = [N, E, S, W];

// zur Kreuzung fliegen
for (let i = 0; i < 150 && (await st()).cam.x < -40; i++) await wait(50);
await log('an der Kreuzung');
await shot('02-an-der-kreuzung');
const start = await st();
const want = ARMDIR[start.target];
// Blickachse muss die Armachse sein: gleich/gegenüber = keine Drehung, sonst 90° rechts (O) oder links (U)
const turns = want === start.theta || want === opposite(start.theta) ? 0 : turnCW(start.theta) === want || opposite(turnCW(start.theta)) === want ? 1 : -1;
if (turns) {
  await page.keyboard.press(turns > 0 ? 'KeyO' : 'KeyU');
  await wait(250);
  await shot('03-schwenk');
  await wait(600);
  await shot('04-gedreht');
}
let cur = await st();
const h = cur.s === 'R' ? cur.theta : opposite(cur.theta);
if (h !== want) {
  await page.keyboard.press('KeyL');
  await wait(700);
}
await log('Richtung zum Ziel ' + want);
await shot('05-richtung');

const bone = VEC[want].map((v) => v * 810);
let got = false;
for (let i = 0; i < 400 && !got; i++) {
  const r = await st();
  if (r.score > start.score) {
    got = true;
    break;
  }
  const rv = VEC[r.theta];
  const dv = VEC[turnCW(r.theta)];
  const rx = bone[0] - r.cam.x;
  const ry = bone[1] - r.cam.y;
  const sx = 240 + rx * rv[0] + ry * rv[1];
  const sy = 135 + rx * dv[0] + ry * dv[1];
  const now = [];
  if (sx > r.dog.x + 4) now.push('ArrowRight');
  else if (sx < r.dog.x - 4) now.push('ArrowLeft');
  if (sy > r.dog.y + 4) now.push('ArrowDown');
  else if (sy < r.dog.y - 4) now.push('ArrowUp');
  await hold(now);
  if (i === 30) await shot('06-im-gang');
  if (sx > 0 && sx < 480 && i % 25 === 0) await shot('07-knochen-' + String(i).padStart(3, '0'));
  await wait(100);
}
await hold([]);
await log('nach Knochen');
check(got, 'Knochen geholt');
await shot('08-knochen-geholt');
await page.keyboard.press('KeyL');
await wait(300);
await shot('09-wende');
await wait(1500);
await hold(['ArrowLeft']);
await wait(3000);
await hold([]);
await shot('10-rueckweg');
await log('rückweg');
check(errors.length === 0, 'keine Konsolenfehler ' + errors.join('|'));
await browser.close();
process.exit(failed ? 1 : 0);
