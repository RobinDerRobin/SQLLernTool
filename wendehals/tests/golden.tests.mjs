import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fingerprint } from './helpers/fingerprint.mjs';

// Golden Master: Logik, Etappen und Zeichnung der v0.2-Welt bleiben bei Umbauten (z. B. 8 Richtungen)
// unverändert. Abweichungen nennen den Abschnitt; Rohdaten vergleichen mit `node tools/golden.mjs --dump`
// vor und nach der Änderung. Neu schreiben nur bei beabsichtigter Änderung: npm run golden:update.
test('Golden Master: v0.2-Spiel unverändert (Logik, Etappen, Zeichnung)', () => {
  const expected = JSON.parse(readFileSync(new URL('./golden/v02-fingerprint.json', import.meta.url), 'utf8'));
  const actual = fingerprint();
  const diff = [];
  for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (expected[k] !== actual[k]) diff.push(`${k}: erwartet ${expected[k] ?? '–'}, ist ${actual[k] ?? '–'}`);
  }
  assert.deepEqual(diff, [], diff.length + ' Abschnitte weichen ab:\n' + diff.slice(0, 30).join('\n'));
});
