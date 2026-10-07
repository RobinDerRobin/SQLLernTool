// Wegwerf-Skript für P1 „Kreuzung“: lädt ?proto=fenster, macht 4 Screenshots nach e2e/screenshots/fenster-*.png.
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
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href + '?proto=fenster');
await page.waitForFunction(() => window.__wendehals?.game.proto);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: path.join(shots, `fenster-${n}.png`) });
const set = (f) => page.evaluate(f);

await wait(300);
await shot('1-start');
await set(() => { const p = window.__wendehals.game.proto; p.cam = { x: 0, y: 0 }; });
await page.keyboard.press('KeyO'); // rechts drehen
await wait(250);
await shot('2-schwenk');
await wait(500);
await shot('3-gedreht');
// kopfüber: von Süden kommend, theta = Westen (R-Ende nach Westen): Osten→Süden→Westen
await page.keyboard.press('KeyO');
await wait(700);
await set(() => { const p = window.__wendehals.game.proto; p.cam = { x: 0, y: 150 }; p.dog = { x: 240, y: 135 }; });
await wait(300);
await shot('4-kopfueber');
const st = await set(() => { const p = window.__wendehals.game.proto; return { theta: p.theta, s: p.s, score: p.score }; });
console.log(JSON.stringify(st));
await page.keyboard.press('Escape');
await wait(200);
const scr = await set(() => window.__wendehals.game.screen);
await browser.close();
if (scr !== 'title') errors.push('Esc führt nicht zum Titel: ' + scr);
if (errors.length) {
  console.error('FEHLER:', errors);
  process.exit(1);
}
console.log('ok – Screenshots in e2e/screenshots/fenster-*.png');
