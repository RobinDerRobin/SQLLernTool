// Erzeugt src/data/welt3.js aus docs/welt.json (Quelle der Wahrheit für die v0.3-Welt).
// Feld für Feld gleich, keine Umbenennungen – Umrechnungen (z. B. "NE" → 7) passieren im Code
// (src/game/worldgraph3.js). Aufruf nach jeder Änderung an welt.json: npm run gen:welt3
// (tests/world3.tests.mjs prüft, dass die erzeugte Datei aktuell ist).
import { readFileSync, writeFileSync } from 'node:fs';

const src = new URL('../docs/welt.json', import.meta.url);
const out = new URL('../src/data/welt3.js', import.meta.url);
const data = JSON.parse(readFileSync(src, 'utf8'));

const body = `// ERZEUGT aus docs/welt.json – nicht von Hand ändern. Neu erzeugen: npm run gen:welt3
// Die v0.3-Welt als Daten (8 Gebiete, Arenen, Etappen, Fähigkeiten, Hindernisse). Schreibgeschützt;
// wer sie verändern will (z. B. Mutationstests), arbeitet auf einer Kopie (structuredClone).

function freeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) freeze(v);
  }
  return o;
}

export const WELT3 = freeze(${JSON.stringify(data, null, 1)});
`;
writeFileSync(out, body);
console.log(`src/data/welt3.js geschrieben (${data.nodes.length} Arenen, ${data.edges.length} Etappen, ${Math.round(body.length / 1024)} KB)`);
