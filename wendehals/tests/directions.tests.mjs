import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  E, SE, S, SW, W, NW, N, NE, HEADINGS, HEADING_CODES, DIR_SHORT, turnBy, rotationSteps, localToScreen, CARDINALS, DIR_VEC, DIR_NAMES, turnCW, turnCCW, opposite, isHorizontal, isVertical, isDiagonal,
  quarterTurns, headingAngle, viewDims, crossPeriod, localToScreenVec, screenToLocalVec,
} from '../src/core/math.js';

// Richtungen haben eine feste Bedeutung (Osten, 90° rechts …), aber ihre Zahlen sind ein Detail von
// src/core/math.js (4 → 8 Richtungen in v0.3). Diese Tests prüfen die Bedeutung und verhindern, dass
// außerhalb von math.js wieder mit Richtungszahlen gerechnet wird.

const close = (a, b) => Math.abs(a - b) < 1e-9;

test('Richtungen: Kreuz-Richtungen im Uhrzeigersinn, Drehungen um 90° und 180°', () => {
  assert.deepEqual(CARDINALS, [E, S, W, N]);
  assert.equal(new Set(CARDINALS).size, 4);
  for (let i = 0; i < 4; i++) {
    const h = CARDINALS[i];
    assert.equal(turnCW(h), CARDINALS[(i + 1) % 4], 'turnCW ist eine Vierteldrehung rechts');
    assert.equal(turnCCW(h), CARDINALS[(i + 3) % 4], 'turnCCW ist eine Vierteldrehung links');
    assert.equal(opposite(h), CARDINALS[(i + 2) % 4]);
    assert.equal(turnCW(turnCW(h)), opposite(h));
    assert.equal(turnCCW(turnCW(h)), h);
    assert.equal(quarterTurns(h), i);
    assert.equal(isDiagonal(h), false);
  }
  assert.deepEqual(CARDINALS.filter(isHorizontal), [E, W]);
  assert.deepEqual(CARDINALS.filter(isVertical), [S, N]);
});

test('Richtungen: Vektoren und Namen passen zur Himmelsrichtung', () => {
  assert.deepEqual([DIR_VEC[E], DIR_VEC[S], DIR_VEC[W], DIR_VEC[N]], [[1, 0], [0, 1], [-1, 0], [0, -1]]);
  assert.deepEqual([DIR_NAMES[E], DIR_NAMES[S], DIR_NAMES[W], DIR_NAMES[N]], ['Osten', 'Süden', 'Westen', 'Norden']);
});

test('Richtungen: Bildwinkel passt zur Bildschirm-Abbildung, Eingabe wird exakt zurückgedreht', () => {
  for (const h of CARDINALS) {
    // Flugrichtung (a = 1) erscheint auf dem Bildschirm unter dem Winkel headingAngle(h)
    const [sx, sy] = localToScreenVec(h, 1, 0);
    const ang = headingAngle(h);
    assert.ok(close(sx, Math.cos(ang)) && close(sy, Math.sin(ang)), `Winkel für ${DIR_NAMES[h]}`);
    assert.ok(close(ang, (quarterTurns(h) * Math.PI) / 2));
    for (const [a, c] of [[1, 0], [0, 1], [0.6, -0.8]]) {
      const [x, y] = localToScreenVec(h, a, c);
      const [a2, c2] = screenToLocalVec(h, x, y);
      assert.ok(close(a, a2) && close(c, c2));
    }
  }
});

test('Richtungen: Sichtfeld und Querachse nur für Etappen-Richtungen', () => {
  for (const h of [E, W]) assert.deepEqual([viewDims(h).zoom, crossPeriod(h), crossPeriod(h, false)], [1, 544, 288]);
  for (const h of [S, N]) assert.deepEqual([viewDims(h).zoom, crossPeriod(h)], [270 / 480, 960]);
  assert.throws(() => viewDims(-1));
  assert.throws(() => crossPeriod(-1));
});

test('8 Richtungen: 45°-Raster, Kürzel wie welt.json, Paritätsregel', () => {
  assert.deepEqual(HEADINGS, [E, SE, S, SW, W, NW, N, NE]);
  assert.deepEqual(HEADING_CODES, ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
  assert.equal(new Set(HEADINGS).size, 8);
  assert.equal(DIR_NAMES.length, 8);
  assert.equal(DIR_SHORT.length, 8);
  HEADINGS.forEach((h, i) => {
    assert.equal(turnBy(h, 1), HEADINGS[(i + 1) % 8], '+1 = 45° rechts');
    assert.equal(turnBy(h, -1), HEADINGS[(i + 7) % 8]);
    assert.equal(turnBy(h, 8), h);
    assert.ok(close(headingAngle(h), (i * Math.PI) / 4), 'Bildwinkel h · 45°');
    // Rasterschritt zeigt in die Bildrichtung (y nach unten)
    const [dx, dy] = DIR_VEC[h];
    const ang = headingAngle(h);
    assert.ok(close(dx / Math.hypot(dx, dy), Math.cos(ang)) && close(dy / Math.hypot(dx, dy), Math.sin(ang)), HEADING_CODES[i]);
    // Paritätsregel: 90° und 180° bleiben in der Klasse, 45° wechselt sie
    assert.equal(isDiagonal(h), i % 2 === 1);
    assert.equal(isDiagonal(turnCW(h)), isDiagonal(h));
    assert.equal(isDiagonal(opposite(h)), isDiagonal(h));
    assert.notEqual(isDiagonal(turnBy(h, 1)), isDiagonal(h));
    for (let k = 0; k < 8; k++) assert.equal(rotationSteps(h, turnBy(h, k)), k);
  });
});

test('Diagonalen sind bis Phase 2 keine Etappen-Richtung (laut statt still falsch)', () => {
  for (const h of [SE, SW, NW, NE]) {
    assert.throws(() => viewDims(h));
    assert.throws(() => crossPeriod(h));
    assert.throws(() => localToScreen(h, 1, 0));
    assert.throws(() => localToScreenVec(h, 1, 0));
    assert.throws(() => screenToLocalVec(h, 1, 0));
  }
});

// ------------------------------------------------------------ Wächter
// Muster, die beim Umbau auf 8 Richtungen still falsch würden. Begründete Ausnahmen tragen in
// derselben Zeile den Kommentar "richtung-ok".
const root = fileURLToPath(new URL('..', import.meta.url));
const PATTERNS = [
  [/&\s*3\b/, 'Umbruch mit "& 3" setzt 4 Richtungen voraus (turnCW/opposite benutzen)'],
  [/\b\w*([hH]eading|side|[dD]ir)\s*%\s*[24]\b/, 'Parität einer Richtung (isHorizontal/isVertical/isDiagonal benutzen)'],
  [/\b\w*([hH]eading|side|[dD]ir|Angle)\w*\s*\*\s*Math\.PI/, 'Richtung × π (headingAngle/quarterTurns benutzen)'],
  [/for\s*\(let\s+(side|h|d|dir|heading)\s*=\s*0;\s*\1\s*<\s*4\b/, 'Schleife über 0..3 (CARDINALS benutzen)'],
  [/\[\[\],\s*\[\],\s*\[\],\s*\[\]\]/, 'Liste mit 4 Einträgen je Richtung'],
  [/\[0,\s*1,\s*2,\s*3\]/, 'Richtungsliste als Zahlen (CARDINALS benutzen)'],
  [/saveHeading\s*[:=]\s*[0-9]/, 'Richtung als Zahl (E/S/W/N benutzen)'],
  [/(placeAt|flyTo)\([^,()]+,\s*[0-9]/, 'Richtung als Zahl (E/S/W/N benutzen)'],
  [/[hH]eading\s*(:|===?|!==?)\s*[0-9]/, 'Richtung als Zahl (E/S/W/N benutzen)'],
  [/\b(side|autoTurn|\.h)\s*(===?|!==?|\?\?)\s*[0-9]/, 'Richtung als Zahl (E/S/W/N benutzen)'],
];

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'golden') continue;
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(m?js)$/.test(name)) out.push(p);
  }
  return out;
}

test('Wächter: außerhalb von math.js wird nicht mit Richtungszahlen gerechnet', () => {
  const skip = new Set(['src/core/math.js', 'tests/directions.tests.mjs']);
  const found = [];
  for (const dir of ['src', 'tests', 'e2e']) {
    for (const f of files(join(root, dir))) {
      const rel = relative(root, f).split('\\').join('/');
      if (skip.has(rel)) continue;
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (line.includes('richtung-ok')) return;
        for (const [re, why] of PATTERNS) if (re.test(line)) found.push(`${rel}:${i + 1}: ${why}\n    ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(found, [], '\n' + found.join('\n'));
});

test('Wächter: erkennt die typischen Fehler (Gegenprobe)', () => {
  const bad = ['x = (h + 1) & 3;', 'if (lv.heading % 2 === 1)', 'rotate((game.heading * Math.PI) / 2)', 'for (let side = 0; side < 4; side++)', 'progress.saveHeading = 3;', "placeAt('pendel', 3)", 'heading: 1,', 'ex.side === 2'];
  for (const line of bad) assert.ok(PATTERNS.some(([re]) => re.test(line)), line);
});
