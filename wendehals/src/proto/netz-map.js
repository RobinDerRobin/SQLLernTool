// Karte von P1c „Netz“ (Brief: docs/prototypen/P1c-netz.md, Abschnitt 4). Werte als Konstanten; der Erbauer darf Abstände
// anpassen, solange jede Stelle ihren Grenzfall behält (D: Zonen überlappen wirklich, E: zwei Abzweige dicht hintereinander).
//
// Koordinaten: x nach Osten, y nach Süden (Norden oben). Norden/Süden/Westen/Osten des Rings:
//
//   ┌─────C──────B──────────B─────C┐       C = L-Knick (Ringecke)           A = + Kreuzung (Mitte)
//   │G           │ │H               │       B = T-Kreuzung (Ring trifft Mittelgang)
//   │(schmal)    │ │ stub           │       D = zweite Kreuzung dicht an A (Zonen überlappen), mit Stummel H nach Norden
//   B─E1──E2─────A──D────────────────B       E = versetzte Abzweige (E1 nach Norden, kurz danach E2 nach Süden)
//   │                                │       F = breiter Raum (400 hoch) in der Ring-Südseite
//   └─────C──────B────[ F ]──────────C┘       G = schmaler Gang (West-Ring, Breite 120)    I = der Ring selbst

import { E } from '../core/math.js';
import { compileMap } from './karte.js';

export const GANG = 200; // Standardbreite
export const GANG_SCHMAL = 120; // G
export const RAUM_HOCH = 400; // F

const RX0 = -900; // Mittellinie West-Ring (G)
const RX1 = 700; // Mittellinie Ost-Ring
const RY0 = -500; // Mittellinie Nord-Ring
const RY1 = 500; // Mittellinie Süd-Ring
const AUSSEN_X0 = RX0 - GANG_SCHMAL / 2; // Außenwand West
const AUSSEN_X1 = RX1 + GANG / 2;
const AUSSEN_Y0 = RY0 - GANG / 2;
const AUSSEN_Y1 = RY1 + GANG / 2;

export const NETZ_DEF = {
  name: 'netz',
  corridors: [
    // Ring (I): Ecken = vier L-Knicks (C); Westseite schmal (G)
    { id: 'nord', axis: 'h', c: RY0, a0: AUSSEN_X0, a1: AUSSEN_X1, w: GANG },
    { id: 'sued', axis: 'h', c: RY1, a0: AUSSEN_X0, a1: AUSSEN_X1, w: GANG },
    { id: 'west', axis: 'v', c: RX0, a0: AUSSEN_Y0, a1: AUSSEN_Y1, w: GANG_SCHMAL },
    { id: 'ost', axis: 'v', c: RX1, a0: AUSSEN_Y0, a1: AUSSEN_Y1, w: GANG },
    // Mittelgänge: Kreuzung A in der Mitte, T-Kreuzungen (B) am Ring
    { id: 'mitte-h', axis: 'h', c: 0, a0: AUSSEN_X0, a1: AUSSEN_X1, w: GANG },
    { id: 'mitte-v', axis: 'v', c: 0, a0: AUSSEN_Y0, a1: AUSSEN_Y1, w: GANG },
    // D/H: zweite Kreuzung 260 östlich von A, Stummel nach Norden (kürzer als ein Bildschirm)
    { id: 'stummel-h', axis: 'v', c: 260, a0: -340, a1: GANG / 2, w: GANG },
    // E: versetzte Abzweige – erst nach Norden, 120 Einheiten (Kante zu Kante) später nach Süden
    { id: 'abzweig-n', axis: 'v', c: -650, a0: -330, a1: GANG / 2, w: GANG },
    { id: 'abzweig-s', axis: 'v', c: -330, a0: -GANG / 2, a1: 330, w: GANG },
    // F: breiter Raum in der Ring-Südseite (gleiche Mittellinie, 400 hoch)
    { id: 'raum-f', axis: 'h', c: RY1, a0: 150, a1: 550, w: RAUM_HOCH },
  ],
  // Knochen: Stummel-Ende (H), Raum F, Ringecke, Ringecke, Mitte eines Gangs, Abzweig-Ende. Farben wie in P1 plus zwei neue.
  bones: [
    { x: 260, y: -300, color: '#e0443a', name: 'Stummel' },
    { x: 350, y: 500, color: '#3f7be0', name: 'Raum' },
    { x: RX1, y: RY0, color: '#3fb04a', name: 'Ecke NO' },
    { x: RX0, y: RY1, color: '#e8c63a', name: 'Ecke SW' },
    { x: -450, y: RY0, color: '#b060e0', name: 'Gangmitte' },
    { x: -650, y: -290, color: '#f08a30', name: 'Abzweig' },
  ],
  // Start: Nordwest-Ecke, nach Osten fliegend (der Dackel steht im Bild links der Mitte wie in P1)
  start: { corridor: 'nord', cam: { x: -780, y: RY0 }, dog: { x: 120, y: 135 }, theta: E, s: 'R', notTarget: -1 },
};

export const NETZ_MAP = compileMap(NETZ_DEF);

/** Die Stellen A–I aus dem Brief (Kartenmitte und Richtung, in der man sie typischerweise anfliegt). */
export const STELLEN = {
  A: { x: 0, y: 0, name: '+ Kreuzung (Mitte)' },
  B: { x: 0, y: RY0, name: 'T-Kreuzung (Ring trifft Mittelgang)' },
  C: { x: RX1, y: RY0, name: 'L-Knick (Ringecke Nordost)' },
  D: { x: 130, y: 0, name: 'zwei Kreuzungen dicht (A und D)' },
  E: { x: -490, y: 0, name: 'versetzte Abzweige' },
  F: { x: 350, y: RY1, name: 'breiter Raum' },
  G: { x: RX0, y: -250, name: 'schmaler Gang' },
  H: { x: 260, y: -230, name: 'Stummel' },
  I: { x: RX1, y: RY0, name: 'Ring (mehrere Drehungen hintereinander)' },
};

export const RING = { RX0, RX1, RY0, RY1, AUSSEN_X0, AUSSEN_X1, AUSSEN_Y0, AUSSEN_Y1 };
