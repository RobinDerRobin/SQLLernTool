// Performance-Test im echten Browser: misst Update- und Zeichenzeit pro Frame in typischen
// und besonders teuren Szenen (alle Bosse unter Dauerfeuer, Dunkelzone, Karte).
// Einmal ungedrosselt, einmal mit 4x CPU-Drosselung als grobe Näherung schwächerer Geräte.
// Ergebnis: e2e/perf-report.json; Exit-Code 1, wenn ein Budget gerissen wird.
//
//   node e2e/perf.mjs            alle Szenen
//   node e2e/perf.mjs boss       nur Szenen, deren Name "boss" enthält
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const filter = process.argv[2] || '';

// Budgets in Millisekunden. "work" = JavaScript-Zeit für Update + Zeichenbefehle,
// "frame" = tatsächlicher Abstand zweier Bilder (enthält das Rastern durch den Browser –
// genau das macht sich als Ruckeln bemerkbar).
// Gedrosselt wird nur die JavaScript-Zeit bewertet: Headless-Chromium rastert in Software im
// gedrosselten Prozess mit, die Bildabstände wären dort selbst für ein leeres Bild unrealistisch.
// 16 ms bei 4-facher Drosselung entspricht 4 ms auf dem Testrechner – Luft für langsamere CPUs.
export const BUDGETS = {
  // frames50 = erlaubte Anzahl Hänger über 50 ms in 3 s (ein einzelner Ausreißer der
  // Testumgebung wird toleriert, wiederkehrendes Stocken nicht)
  normal: { workP95: 8, frameP95: 20, frames50: 1 },
  throttled: { workP95: 16, frameP95: Infinity, frames50: Infinity },
};

const SCENES = [
  { name: 'fruehstueck', node: 'toast', heading: 0, items: [] },
  { name: 'bad', node: 'stoepsel', heading: 0, items: ['DREHWURM'] },
  { name: 'keller-dunkel', node: 'tasse', heading: 1, items: ['DREHWURM'] },
  { name: 'disco', node: 'discotuer', heading: 1, items: ['DREHWURM'] },
  { name: 'uhrwerk', node: 'lavalampe', heading: 3, items: ['DREHWURM', 'PILZ'] },
  { name: 'stacheln-nord', node: 'marmelade', heading: 3, items: [] },
  { name: 'boss-kaffeekanne', node: 'marmelade', heading: 0, items: [], boss: true },
  { name: 'boss-walross', node: 'seifenschale', heading: 3, items: ['DREHWURM'], boss: true },
  { name: 'boss-kartoffel', node: 'einmachregal', heading: 2, items: ['DREHWURM'], boss: true },
  { name: 'boss-diva', node: 'tanzflaeche', heading: 0, items: ['DREHWURM'], boss: true },
  { name: 'boss-wecker', node: 'pendel', heading: 3, items: ['DREHWURM', 'BOHRER', 'PILZ'], boss: true },
  { name: 'karte', map: true },
].filter((s) => s.name.includes(filter));

const exe = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href);
await page.waitForFunction(() => window.__wendehals && window.__wendehals.perf);
const cdp = await page.context().newCDPSession(page);

async function runScene(scene) {
  await page.evaluate((sc) => {
    const g = window.__wendehals.game;
    g.startNewGame();
    g.overlay = null;
    g.dialogQueue = [];
    g.invincible = true;
    g.items = new Set(sc.items || []);
    // Dauerfeuer und Zickzack, damit Treffer-Blitze und viele Schüsse entstehen
    if (!window.__autoInput) {
      window.__autoInput = true;
      const input = window.__wendehals.input;
      const orig = input.poll.bind(input);
      input.poll = () => {
        const p = orig();
        if (window.__autoplay) {
          p.fire = true;
          p.my = Math.sin(performance.now() / 300);
          p.mx = 0.3 * Math.cos(performance.now() / 700);
        }
        return p;
      };
    }
    window.__autoplay = !sc.map;
    if (sc.map) {
      g.screen = 'map';
      g.progress.visited = ['toast', 'eier', 'marmelade', 'tasse', 'stoepsel', 'seifenschale', 'entenhafen', 'discotuer'];
      return;
    }
    g.node = sc.node;
    g.heading = sc.heading;
    g.launch();
    const lv = g.level;
    lv.invincible = true;
    if (sc.boss) {
      lv.camA = lv.L - lv.va - 1;
      lv.player.a = lv.camA + 80;
    } else {
      // etwas ins Level hinein, damit Gegner da sind
      for (let i = 0; i < 60 * 8 && !lv.result; i++) lv.update(1 / 60, { fire: true, my: Math.sin(i / 30) });
    }
  }, scene);
  // Aufwärmen (Bosseinflug dauert gut 2 s), dann messen
  await page.waitForTimeout(scene.boss ? 3000 : 800);
  await page.evaluate(() => window.__wendehals.perf.reset());
  await page.waitForTimeout(3000);
  return page.evaluate(() => {
    const s = window.__wendehals.perf.summary();
    const g = window.__wendehals.game;
    s.state = g.screen === 'level' ? g.level.state : g.screen;
    return s;
  });
}

const report = { date: new Date().toISOString(), budgets: BUDGETS, results: [] };
let failed = 0;
for (const mode of ['normal', 'throttled']) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: mode === 'throttled' ? 4 : 1 });
  for (const scene of SCENES) {
    const r = await runScene(scene);
    const b = BUDGETS[mode];
    const ok = r.workP95 <= b.workP95 && r.frameP95 <= b.frameP95 && r.frames50 <= b.frames50;
    if (!ok) failed++;
    report.results.push({ mode, scene: scene.name, ok, ...r });
    const f = (v) => v.toFixed(1).padStart(6);
    console.log(
      `${ok ? 'ok  ' : 'ZU LANGSAM'} ${mode.padEnd(9)} ${scene.name.padEnd(17)} Arbeit p50${f(r.workP50)} p95${f(r.workP95)} max${f(r.workMax)} | Frame p95${f(r.frameP95)} max${f(r.frameMax)} >50ms:${r.frames50} | n=${r.n} ${r.state}`,
    );
  }
}
await writeFile(path.join(root, 'e2e/perf-report.json'), JSON.stringify(report, null, 2));
await browser.close();
if (errors.length) {
  console.error('JavaScript-Fehler: ' + errors.join(' | '));
  failed++;
}
if (failed) {
  console.error(`${failed} Szenen über Budget (Details in e2e/perf-report.json)`);
  process.exit(1);
}
console.log('Performance-Budgets eingehalten.');
