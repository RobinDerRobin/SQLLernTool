// Baut das Spiel in eine einzige, offline lauffähige Datei: dist/index.html
// (per Doppelklick im Browser spielbar, auch von file://).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
  minify: true,
  write: false,
  legalComments: 'none',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = await readFile(path.join(root, 'src/index.html'), 'utf8');
await mkdir(path.join(root, 'dist'), { recursive: true });
const out = html.replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
await writeFile(path.join(root, 'dist/index.html'), out);
console.log(`dist/index.html geschrieben (${(out.length / 1024).toFixed(0)} KB)`);
