// Schreibt den Golden Master der v0.2-Welt neu (tests/golden/v02-fingerprint.json).
// Nur aufrufen, wenn eine Änderung am v0.2-Spiel beabsichtigt ist – und den Grund in die
// Commit-Nachricht schreiben. Mit --dump landen alle Rohdaten in tests/golden/out/ (nicht im Repo),
// z. B. um vor und nach einem Umbau per diff zu vergleichen.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fingerprint } from '../tests/helpers/fingerprint.mjs';

const root = new URL('../tests/golden/', import.meta.url);
const dump = process.argv.includes('--dump') ? {} : null;
const fp = fingerprint(dump);
if (dump) {
  const dir = fileURLToPath(new URL('out/', root));
  mkdirSync(dir, { recursive: true });
  for (const [k, lines] of Object.entries(dump)) writeFileSync(dir + k.replace(/[^\w.-]+/g, '_') + '.txt', lines.join('\n') + '\n');
  console.log('Rohdaten in ' + dir);
} else {
  writeFileSync(new URL('v02-fingerprint.json', root), JSON.stringify(fp, null, 1) + '\n');
  console.log(Object.keys(fp).length + ' Abschnitte geschrieben.');
}
