// Die Weltkarte: Knoten (Stationen) auf einem Raster und Level (Kanten) dazwischen.
// Ein Level liegt immer auf einer Achse zwischen zwei Knoten. Man startet ein Level,
// indem man an einem Knoten in Richtung des Levels schaut und abfliegt.
//
// Knoten-Eigenschaften:
//   save      Speicherstation (hat immer auch eine Drehscheibe, siehe Tests)
//   turntable Drehscheibe: hier kann man sich ohne Drehwurm drehen
//   autoTurn  Richtung, in die man bei Ankunft automatisch gedreht wird ("Wender")
//   item      Item, das hier liegt
//   start     Startknoten
//   ret       Rückholstation (an Sackgassen): bringt sofort zur Arena "to" mit Blickrichtung "heading"
//
// Jeder Knoten ist eine Arena (Kreuzung), die man frei durchfliegt. Ausgänge liegen an den vier
// Seiten; pro Seite sind mehrere Ausgänge möglich. Ein Ausgang ist nur offen, wenn man in
// seine Richtung schaut.
//
// Kanten-Eigenschaften:
//   oneWay    nur von "from" nach "to" fliegbar
//   gates     Hindernisse, Positionen als Anteil (0..1) in Richtung from->to
//   boss      Boss am Levelende, "reward" ist dessen Belohnung ("GOAL" = Spielende)
//   dir       Seite, an der die Kante "from" verlässt (Standard: aus den Kartenpositionen)
//   fromPos   Lage des Ausgangs entlang der Seite in "from" (0..1, Standard 0,5); toPos analog

import { E, S, W, N } from '../core/math.js';

export const START_NODE = 'toast';
export const START_HEADING = E;

export const AREAS = {
  fruehstueck: { name: 'Frühstückstisch', color: '#e8b04a' },
  bad: { name: 'Badewannen-Ozean', color: '#4ab3e8' },
  keller: { name: 'Omas Keller', color: '#7a6a8c' },
  disco: { name: 'Disco-Vulkan', color: '#e84a9c' },
  uhrwerk: { name: 'Uhrwerk-Himmel', color: '#c9c27a' },
};

export const NODES = {
  // Frühstückstisch
  toast: { name: 'Toastständer', x: 0, y: 2, area: 'fruehstueck', save: true, turntable: true, start: true },
  eier: { name: 'Eierbecher', x: 1, y: 2, area: 'fruehstueck', turntable: true },
  marmelade: { name: 'Marmeladenglas', x: 1, y: 1, area: 'fruehstueck', save: true, turntable: true },
  tasse: { name: 'Untertasse', x: 2, y: 1, area: 'fruehstueck' },
  butter: { name: 'Butterdose', x: 1, y: 0, area: 'fruehstueck', item: 'WURST1', autoTurn: S, ret: { to: 'marmelade', heading: S } },
  // Badewannen-Ozean
  stoepsel: { name: 'Stöpsel', x: 3, y: 1, area: 'bad', save: true, turntable: true },
  seifenschale: { name: 'Seifenschale', x: 4, y: 1, area: 'bad' },
  duschkopf: { name: 'Duschkopf', x: 4, y: 0, area: 'bad', item: 'ESPRESSO' },
  handtuch: { name: 'Handtuchhaken', x: 3, y: 0, area: 'bad', item: 'LAMPE' },
  brotkorb: { name: 'Brotkorb', x: 2, y: 0, area: 'fruehstueck', item: 'OMA' },
  entenhafen: { name: 'Quietscheentenhafen', x: 5, y: 1, area: 'bad', save: true, turntable: true },
  blubber: { name: 'Blubberblase', x: 3, y: 2, area: 'bad', item: 'WURST2', autoTurn: N },
  sockenschublade: { name: 'Sockenschublade', x: 4, y: 2, area: 'bad', item: 'SPARSTRUMPF', autoTurn: W },
  // Omas Keller
  kellertreppe: { name: 'Kellertreppe', x: 2, y: 2, area: 'keller', save: true, turntable: true },
  einmachregal: { name: 'Einmachregal', x: 2, y: 3, area: 'keller', turntable: true },
  kartoffelkiste: { name: 'Kartoffelkiste', x: 1, y: 3, area: 'keller' },
  gurkenfass: { name: 'Gurkenfass', x: 0, y: 3, area: 'keller', item: 'WURST3', autoTurn: E, ret: { to: 'kartoffelkiste', heading: E } },
  kohlenkeller: { name: 'Kohlenkeller', x: 2, y: 4, area: 'keller', item: 'TOASTER', autoTurn: N, ret: { to: 'einmachregal', heading: N } },
  // Disco-Vulkan
  discotuer: { name: 'Discotür', x: 5, y: 2, area: 'disco', save: true, turntable: true },
  tanzflaeche: { name: 'Tanzfläche', x: 5, y: 3, area: 'disco' },
  djpult: { name: 'DJ-Pult', x: 6, y: 3, area: 'disco' },
  lavalampe: { name: 'Lavalampe', x: 6, y: 2, area: 'disco', save: true, turntable: true },
  konfetti: { name: 'Konfettikanone', x: 5, y: 4, area: 'disco', item: 'WENDEHALS', autoTurn: N, ret: { to: 'tanzflaeche', heading: N } },
  // Uhrwerk-Himmel
  pendel: { name: 'Pendel', x: 6, y: 1, area: 'uhrwerk', save: true, turntable: true },
  uhrturm: { name: 'Uhrturm', x: 6, y: 0, area: 'uhrwerk', goal: true },
};

const g = (type, at, len = 0) => ({ type, at, len });

export const EDGES = [
  { id: 'kruemelstrasse', from: 'toast', to: 'eier', name: 'Krümelstraße', theme: 'fruehstueck', length: 2000, difficulty: 1, tutorial: true },
  { id: 'marmeladenaufzug', from: 'eier', to: 'marmelade', name: 'Marmeladenaufzug', theme: 'fruehstueck', length: 2200, difficulty: 1 },
  { id: 'butterberg', from: 'marmelade', to: 'butter', name: 'Butterberg', theme: 'fruehstueck', length: 2000, difficulty: 2, gates: [g('spikes', 0.4, 520)] },
  { id: 'kaffeekraenzchen', from: 'marmelade', to: 'tasse', name: 'Kaffeekränzchen', theme: 'fruehstueck', length: 2200, difficulty: 2, boss: 'kaffeekanne', reward: 'DREHWURM' },
  { id: 'kruemelmauer', from: 'eier', to: 'kellertreppe', name: 'Krümelmauer', theme: 'fruehstueck', length: 2000, difficulty: 2, gates: [g('rock', 0.3), g('rock', 0.65)] },
  { id: 'abflussrohr', from: 'tasse', to: 'stoepsel', name: 'Abflussrohr', theme: 'bad', length: 2600, difficulty: 2 },
  { id: 'schaumbad', from: 'stoepsel', to: 'seifenschale', name: 'Schaumbad', theme: 'bad', length: 2600, difficulty: 2, fromPos: 0.3 },
  { id: 'duschvorhang', from: 'seifenschale', to: 'duschkopf', name: 'Duschvorhang', theme: 'bad', length: 2400, difficulty: 3, boss: 'walross', reward: 'GUMMIHAUT' },
  { id: 'handtuchleiste', from: 'duschkopf', to: 'handtuch', name: 'Handtuchleiste', theme: 'bad', length: 2200, difficulty: 3 },
  { id: 'waescheleine', from: 'handtuch', to: 'brotkorb', name: 'Wäscheleine', theme: 'bad', length: 2200, difficulty: 3 },
  { id: 'kruemelfall', from: 'brotkorb', to: 'tasse', name: 'Krümelfall', theme: 'fruehstueck', length: 1800, difficulty: 2 },
  { id: 'entenrennen', from: 'seifenschale', to: 'entenhafen', name: 'Entenrennen', theme: 'bad', length: 2800, difficulty: 3 },
  { id: 'blubberschacht', from: 'stoepsel', to: 'blubber', name: 'Blubberschacht', theme: 'bad', length: 2000, difficulty: 3, gates: [g('dark', 0.3, 900)] },
  { id: 'flusensieb', from: 'blubber', to: 'sockenschublade', name: 'Flusensieb', theme: 'bad', length: 2600, difficulty: 3, gates: [g('spikes', 0.15, 450), g('clock', 0.5)], toPos: 0.65 },
  // Abkürzungen zurück zum Stöpsel (Einbahn): mehrere Ausgänge an derselben Seite
  { id: 'ueberlauf', from: 'sockenschublade', to: 'stoepsel', dir: W, fromPos: 0.25, toPos: 0.75, name: 'Überlauf', theme: 'bad', length: 1600, difficulty: 2, oneWay: true },
  { id: 'fallrohr', from: 'handtuch', to: 'stoepsel', name: 'Fallrohr', theme: 'bad', length: 1600, difficulty: 2, oneWay: true },
  { id: 'treppe', from: 'tasse', to: 'kellertreppe', name: 'Treppe ins Dunkle', theme: 'keller', length: 2600, difficulty: 3, gates: [g('dark', 0.2, 1500)] },
  { id: 'spinnweben', from: 'kellertreppe', to: 'einmachregal', name: 'Spinnwebengang', theme: 'keller', length: 2600, difficulty: 3, gates: [g('dark', 0.15, 1700)] },
  { id: 'kartoffeldruck', from: 'einmachregal', to: 'kartoffelkiste', name: 'Kartoffeldruck', theme: 'keller', length: 2400, difficulty: 3, boss: 'kartoffel', reward: 'BOHRER' },
  { id: 'gurkengasse', from: 'kartoffelkiste', to: 'gurkenfass', name: 'Gurkenglas-Gasse', theme: 'keller', length: 2000, difficulty: 3, gates: [g('rock', 0.5)] },
  { id: 'kartoffelschacht', from: 'kartoffelkiste', to: 'eier', name: 'Kartoffelschacht', theme: 'keller', length: 2000, difficulty: 3, oneWay: true },
  { id: 'kohlenrutsche', from: 'einmachregal', to: 'kohlenkeller', name: 'Kohlenrutsche', theme: 'keller', length: 2000, difficulty: 4, gates: [g('narrow', 0.45)] },
  { id: 'glitzerstachel', from: 'entenhafen', to: 'discotuer', name: 'Glitzerstachel', theme: 'disco', length: 2600, difficulty: 3, gates: [g('spikes', 0.35, 700)] },
  { id: 'kellergang', from: 'einmachregal', to: 'tanzflaeche', name: 'Kellergang', theme: 'keller', length: 3000, difficulty: 4, gates: [g('narrow', 0.5)] },
  { id: 'tanzflaechenrand', from: 'discotuer', to: 'tanzflaeche', name: 'Tanzflächenrand', theme: 'disco', length: 2400, difficulty: 4 },
  { id: 'plattenteller', from: 'tanzflaeche', to: 'djpult', name: 'Plattenteller', theme: 'disco', length: 2400, difficulty: 4, boss: 'diva', reward: 'PILZ' },
  { id: 'lavastrom', from: 'djpult', to: 'lavalampe', name: 'Lavastrom', theme: 'disco', length: 2600, difficulty: 4, gates: [g('spikes', 0.5, 600)] },
  { id: 'konfettiregen', from: 'tanzflaeche', to: 'konfetti', name: 'Konfettiregen', theme: 'disco', length: 2400, difficulty: 4, gates: [g('spikes', 0.25, 500), g('dark', 0.55, 700)] },
  { id: 'spiegelkugel', from: 'lavalampe', to: 'discotuer', name: 'Spiegelkugel', theme: 'disco', length: 1800, difficulty: 3 },
  { id: 'zahnradgasse', from: 'lavalampe', to: 'pendel', name: 'Zahnradgasse', theme: 'uhrwerk', length: 2800, difficulty: 5, gates: [g('narrow', 0.4)] },
  { id: 'pendelbruecke', from: 'entenhafen', to: 'pendel', name: 'Pendelbrücke', theme: 'uhrwerk', length: 2800, difficulty: 5, gates: [g('dark', 0.15, 800), g('rock', 0.7)] },
  { id: 'uhrwerk', from: 'pendel', to: 'uhrturm', name: 'Das große Uhrwerk', theme: 'uhrwerk', length: 2600, difficulty: 5, boss: 'wecker', reward: 'GOAL', oneWay: true, gates: [g('rock', 0.45)] },
];

export const EDGE_BY_ID = Object.fromEntries(EDGES.map((e) => [e.id, e]));
