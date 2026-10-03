// Flacker-Test (angelehnt an WCAG 2.3.1 "drei Blitze"): misst pro Bild die mittlere Helligkeit
// des ganzen Bildes und der vier Bildviertel und zählt starke Hell-Dunkel-Wechsel.
// Mehr als 3 Blitze in irgendeiner Sekunde = Fehler.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { countFlashes } from './flashcount.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAX_FLASHES_PER_SECOND = 3;

const SCENES = [
  { name: 'disco', setup: { node: 'discotuer', heading: 1, items: ['DREHWURM'], advance: 6 } },
  { name: 'disco-boss', setup: { node: 'tanzflaeche', heading: 0, items: ['DREHWURM'], boss: true } },
  { name: 'wecker-boss', setup: { node: 'pendel', heading: 3, items: ['DREHWURM', 'BOHRER', 'PILZ'], boss: true } },
  { name: 'boss-explosion', setup: { node: 'marmelade', heading: 0, items: [], boss: true, kill: true } },
  { name: 'dunkelzone', setup: { node: 'tasse', heading: 1, items: ['DREHWURM'], advance: 14 } },
  { name: 'abspann', ending: true },
];

const exe = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href);
await page.waitForFunction(() => window.__wendehals);

let failed = 0;
for (const scene of SCENES) {
  await page.evaluate((sc) => {
    const g = window.__wendehals.game;
    g.startNewGame();
    g.overlay = null;
    g.dialogQueue = [];
    if (sc.ending) {
      g.startEnding();
      return;
    }
    const s = sc.setup;
    g.items = new Set(s.items);
    g.placeAt(s.node, s.heading);
    g.launch();
    const lv = g.level;
    lv.invincible = true;
    if (s.boss) {
      lv.camA = lv.L - lv.va - 1;
      lv.player.a = lv.camA + 80;
      for (let i = 0; i < 60 * 3; i++) lv.update(1 / 60, { fire: true });
      if (s.kill && lv.boss) lv.damageBoss(lv.boss.hp);
    } else {
      for (let i = 0; i < 60 * s.advance; i++) lv.update(1 / 60, { fire: true, my: Math.sin(i / 30) });
    }
  }, scene);
  // Helligkeit pro Frame im Browser messen (verkleinerte Kopie des Spielbilds)
  const series = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const src = document.getElementById('game');
        const small = document.createElement('canvas');
        small.width = 32;
        small.height = 18;
        const sc = small.getContext('2d', { willReadFrequently: true });
        const out = { all: [], q: [[], [], [], []] };
        const lum = (d, x0, y0, x1, y1) => {
          let sum = 0;
          let n = 0;
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * 32 + x) * 4;
              const lin = (c) => {
                c /= 255;
                return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
              };
              sum += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
              n++;
            }
          }
          return sum / n;
        };
        const t0 = performance.now();
        const tick = () => {
          sc.drawImage(src, 0, 0, 32, 18);
          const d = sc.getImageData(0, 0, 32, 18).data;
          out.all.push(lum(d, 0, 0, 32, 18));
          out.q[0].push(lum(d, 0, 0, 16, 9));
          out.q[1].push(lum(d, 16, 0, 32, 9));
          out.q[2].push(lum(d, 0, 9, 16, 18));
          out.q[3].push(lum(d, 16, 9, 32, 18));
          if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  // Gleitendes 1-Sekunden-Fenster (Anzahl Frames pro Sekunde aus der Messung)
  const fps = Math.round(series.all.length / 3);
  let worst = 0;
  for (const s of [series.all, ...series.q]) {
    for (let i = 0; i + fps <= s.length; i += Math.max(1, Math.floor(fps / 4))) {
      worst = Math.max(worst, countFlashes(s.slice(i, i + fps)));
    }
  }
  const ok = worst <= MAX_FLASHES_PER_SECOND;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FLACKERT'} ${scene.name.padEnd(16)} max. ${worst} Blitze/s (${fps} fps gemessen)`);
}
await browser.close();
if (failed) {
  console.error(failed + ' Szenen flackern zu stark');
  process.exit(1);
}
console.log('Flacker-Test bestanden.');
