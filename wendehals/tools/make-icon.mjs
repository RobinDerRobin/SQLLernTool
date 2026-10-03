// Erzeugt das App-Icon (build/icon.png, 512x512) aus der echten Spielgrafik.
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundle = await build({
  stdin: {
    contents: `import { drawDackel, circle } from './src/render/sprites.js'; window.drawDackel = drawDackel; window.circle = circle;`,
    resolveDir: root,
  },
  bundle: true,
  write: false,
  format: 'iife',
});
const exe = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent('<canvas id="c" width="512" height="512"></canvas>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });
await page.evaluate(() => {
  const ctx = document.getElementById('c').getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  g.addColorStop(0, '#4fd0ff');
  g.addColorStop(1, '#2a1a52');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#ffd34d';
  ctx.stroke();
  ctx.translate(256, 270);
  ctx.rotate(-0.35);
  ctx.scale(11, 11);
  window.drawDackel(ctx, 0.3);
});
await mkdir(path.join(root, 'build'), { recursive: true });
await page.locator('#c').screenshot({ path: path.join(root, 'build/icon.png'), omitBackground: true });
await browser.close();
console.log('build/icon.png erzeugt');
