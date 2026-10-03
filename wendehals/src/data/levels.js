// Terrain und Identität der Etappen.
//
// Set-Pieces (PIECES) sind ASCII-Muster: jede Zeile verläuft quer zur Flugrichtung,
// jedes Zeichen ist eine Kachel (16 Einheiten) in Flugrichtung. Zeichen siehe game/terrain.js.
// anchor: 'floor' sitzt auf dem Boden, 'ceil' hängt an der Decke, 'mid' schwebt frei.
//
// Etappen-Profile (LEVELS):
//   wrap     Querachse endlos (oben/unten verbunden) oder mit Boden und Decke
//   floor    [min, max] Bodendicke in Kacheln (nur ohne Wrap)
//   ceil     [min, max] Deckendicke in Kacheln (nur ohne Wrap)
//   pieces   Set-Pieces, die regelmäßig vorkommen (Leit-Gimmick der Etappe)
//   density  Set-Pieces pro 1000 Einheiten
//   dyn      dynamisches Terrain (siehe game/dynamics.js)

export const PIECES = {
  // ---------------------------------------------------------- Frühstückstisch
  tasse: {
    anchor: 'floor',
    rows: ['.#####.##', '#######.#', '#######.#', '########.', '.######..', '#########'],
  },
  toastberg: { anchor: 'floor', rows: ['..DDDD..', '.DDDDDD.', 'DDDDDDDD', 'DDDDDDDD'] },
  marmeladenglas: { anchor: 'floor', rows: ['.~~~~~.', '#######', '#######', '#######', '.#####.'] },
  zuckerturm: { anchor: 'ceil', rows: ['DD', 'DD', 'DD', 'DD', 'DD', 'DD'] },
  eierbecher: { anchor: 'floor', rows: ['.###.', '#####', '.###.', '..#..', '.###.'] },
  butterblock: { anchor: 'mid', rows: ['DDDD', 'DDDD', 'DDDD'] },
  zuckerstreuer: { anchor: 'ceil', rows: ['.###.', '#####', '#####', '.#.#.'] },
  // --------------------------------------------------------- Badewannen-Ozean
  rohr: { anchor: 'mid', rows: ['MMMMMMMMMMMM', 'MMMMMMMMMMMM'] },
  shampoo: { anchor: 'floor', rows: ['.##.', '.##.', '####', '####', '####', '####', '####'] },
  schaum: { anchor: 'mid', rows: ['.DDD.', 'DDDDD', 'DDDDD', '.DDD.'] },
  badewasser: { anchor: 'floor', rows: ['~~~~~~~~~~~~', '~~~~~~~~~~~~'] },
  wasserhahn: { anchor: 'ceil', rows: ['MMMMM', '..M..', '..M..', '.MMM.'] },
  fliesenwand: { anchor: 'floor', rows: ['####', '####', '####', '####', '####', '####', '####'] },
  // -------------------------------------------------------------- Omas Keller
  regal: { anchor: 'floor', rows: ['##########', '#........#', '#........#', '##########', '#........#', '#........#', '##########'] },
  glasstapel: { anchor: 'floor', rows: ['.DD.', 'DDDD', 'DDDD', '.DD.', 'DDDD', 'DDDD'] },
  spinnweben: { anchor: 'ceil', rows: ['~~~~~~', '.~~~~.', '..~~..'] },
  kiste: { anchor: 'floor', rows: ['#####', '#####', '#####'] },
  treppe: { anchor: 'floor', rows: ['......##', '....####', '..######', '########'] },
  kohlehaufen: { anchor: 'floor', rows: ['...##...', '.######.', '########'] },
  // ------------------------------------------------------------ Disco-Vulkan
  lautsprecher: { anchor: 'floor', rows: ['####', '#..#', '####', '#..#', '####', '####'] },
  spiegelkugel: { anchor: 'ceil', rows: ['..#..', '..#..', '.###.', '#####', '.###.'] },
  lavaboden: { anchor: 'floor', rows: ['^^^^^^^^^^', '##########'] },
  podest: { anchor: 'floor', rows: ['DDDDDD', '######'] },
  konfettiwolke: { anchor: 'mid', rows: ['.DD.D', 'DDDDD', 'D.DDD', '.DD..'] },
  // --------------------------------------------------------- Uhrwerk-Himmel
  messingblock: { anchor: 'mid', rows: ['.MM.', 'MMMM', 'MMMM', '.MM.'] },
  uhrplatte: { anchor: 'floor', rows: ['MMMMMMMM', 'MMMMMMMM'] },
  ziffer: { anchor: 'ceil', rows: ['MMM', 'M.M', 'MMM'] },
};

// Wanddicken bezogen auf 34 Zeilen; der Boden ist etwas dicker, weil unten die Power-Leiste liegt.
const level = (o) => ({ wrap: false, floor: [4, 5], ceil: [2, 3], density: 2, pieces: [], dyn: [], ...o });

export const LEVELS = {
  // Frühstückstisch
  kruemelstrasse: level({ floor: [4, 5], ceil: [2, 3], density: 1.4, pieces: ['tasse', 'toastberg', 'eierbecher'] }),
  marmeladenaufzug: level({ floor: [3, 5], ceil: [3, 5], density: 1.6, pieces: ['marmeladenglas', 'zuckerturm', 'eierbecher'] }),
  butterberg: level({ wrap: true, density: 1.4, pieces: ['butterblock'] }),
  kaffeekraenzchen: level({ floor: [2, 3], ceil: [1, 2], density: 1.6, pieces: ['tasse', 'zuckerstreuer', 'toastberg'] }),
  kruemelmauer: level({ floor: [3, 6], ceil: [3, 6], density: 1.8, pieces: ['toastberg', 'zuckerturm'] }),
  kruemelfall: level({ wrap: true, density: 1.6, pieces: ['butterblock'], dyn: [{ type: 'mover', every: 520 }] }),
  // Badewannen-Ozean
  abflussrohr: level({ floor: [4, 7], ceil: [4, 7], density: 1.4, pieces: ['wasserhahn', 'badewasser'], dyn: [{ type: 'current', every: 700 }] }),
  schaumbad: level({ wrap: true, density: 2.2, pieces: ['schaum', 'schaum', 'rohr'] }),
  duschvorhang: level({ floor: [2, 3], ceil: [2, 3], density: 1.2, pieces: ['shampoo', 'wasserhahn'] }),
  handtuchleiste: level({ wrap: true, density: 1.8, pieces: ['rohr', 'schaum'] }),
  waescheleine: level({ wrap: true, density: 1.4, pieces: ['rohr'], dyn: [{ type: 'mover', every: 600 }] }),
  entenrennen: level({ floor: [3, 4], ceil: [1, 2], density: 1.8, pieces: ['badewasser', 'shampoo', 'fliesenwand'] }),
  blubberschacht: level({ floor: [8, 14], ceil: [8, 14], density: 1.2, pieces: ['schaum', 'fliesenwand'] }),
  flusensieb: level({ floor: [3, 5], ceil: [3, 5], density: 1.0, pieces: ['fliesenwand', 'badewasser'] }),
  ueberlauf: level({ floor: [3, 5], ceil: [3, 5], density: 1.4, pieces: ['rohr', 'badewasser'], dyn: [{ type: 'current', every: 520 }] }),
  fallrohr: level({ floor: [8, 12], ceil: [8, 12], density: 1.2, pieces: ['schaum', 'wasserhahn'] }),
  // Omas Keller
  treppe: level({ floor: [6, 12], ceil: [6, 10], density: 1.6, pieces: ['treppe', 'kiste'] }),
  spinnweben: level({ floor: [6, 10], ceil: [8, 12], density: 1.8, pieces: ['spinnweben', 'glasstapel'] }),
  kartoffeldruck: level({ floor: [2, 4], ceil: [2, 4], density: 1.6, pieces: ['regal', 'kiste', 'glasstapel'] }),
  gurkengasse: level({ floor: [3, 5], ceil: [3, 5], density: 2.0, pieces: ['glasstapel', 'regal'] }),
  kartoffelschacht: level({ floor: [10, 16], ceil: [10, 16], density: 1.4, pieces: ['kohlehaufen', 'kiste'] }),
  kohlenrutsche: level({ floor: [8, 14], ceil: [8, 14], density: 1.4, pieces: ['kohlehaufen'] }),
  kellergang: level({ floor: [3, 4], ceil: [3, 4], density: 2.0, pieces: ['regal', 'glasstapel', 'kiste'] }),
  // Disco-Vulkan
  glitzerstachel: level({ wrap: true, density: 1.2, pieces: ['podest'] }),
  tanzflaechenrand: level({ floor: [6, 10], ceil: [6, 10], density: 1.8, pieces: ['lautsprecher', 'spiegelkugel', 'podest'], dyn: [{ type: 'piston', every: 650 }] }),
  plattenteller: level({ floor: [2, 3], ceil: [2, 3], density: 1.4, pieces: ['lautsprecher', 'spiegelkugel'] }),
  lavastrom: level({ floor: [6, 9], ceil: [6, 9], density: 1.0, pieces: ['lavaboden', 'lautsprecher'] }),
  konfettiregen: level({ wrap: true, density: 1.6, pieces: ['konfettiwolke', 'podest'] }),
  spiegelkugel: level({ floor: [2, 4], ceil: [2, 4], density: 1.8, pieces: ['spiegelkugel', 'lautsprecher'], dyn: [{ type: 'piston', every: 520 }] }),
  // Uhrwerk-Himmel
  zahnradgasse: level({ floor: [10, 15], ceil: [10, 15], density: 1.2, pieces: ['messingblock', 'uhrplatte'], dyn: [{ type: 'gear', every: 480 }] }),
  pendelbruecke: level({ floor: [3, 5], ceil: [2, 4], density: 1.2, pieces: ['uhrplatte', 'ziffer'], dyn: [{ type: 'pendulum', every: 560 }] }),
  uhrwerk: level({ floor: [8, 12], ceil: [8, 12], density: 1.0, pieces: ['messingblock', 'ziffer'], dyn: [{ type: 'gear', every: 600 }] }),
};
