// Terrain als Kachelraster (16 Einheiten pro Kachel). Spalten laufen in Flugrichtung (a),
// Zeilen quer dazu (c). Festes Terrain ist tödlich; manche Kacheln lassen sich zerschießen.
//
// Kachelarten:
//   '.' frei          '#' fest (tödlich)        'D' zerbrechlich (jeder Schuss, tödlich)
//   'R' Fels (nur Bohrer, tödlich)              'M' Metall (unzerstörbar, tödlich)
//   '^' Stacheln (tödlich ohne Quietscheentenhaut, sonst harmlos)   '~' zäh (bremst)

export const TILE = 16;
export const T = { FREE: 0, SOLID: 1, BREAK: 2, ROCK: 3, METAL: 4, SPIKE: 5, SLOW: 6 };
export const CHAR_TO_TILE = { '.': 0, ' ': 0, '#': 1, D: 2, R: 3, M: 4, '^': 5, '~': 6 };
export const BREAK_HP = 2;
export const ROCK_HP = 3;

export const isSolid = (t) => t >= T.SOLID && t <= T.METAL;

export class TileMap {
  /**
   * @param {number} cols Spalten (Länge / 16)
   * @param {number} rows Zeilen (Querachse / 16)
   * @param {boolean} wrap Querachse periodisch?
   */
  constructor(cols, rows, wrap) {
    this.cols = cols;
    this.rows = rows;
    this.wrap = wrap;
    this.data = new Uint8Array(cols * rows);
    this.hp = new Uint8Array(cols * rows);
    this.flipA = false;
    this.flipC = false;
    this.version = 0; // steigt bei jeder Änderung (für Render-Caches)
  }

  index(ix, iy) {
    if (this.flipA) ix = this.cols - 1 - ix;
    if (this.flipC) iy = this.rows - 1 - iy;
    return iy * this.cols + ix;
  }

  /** Kachel an Spalte/Zeile; außerhalb der Länge frei, quer außerhalb (ohne Wrap) fest. */
  cell(ix, iy) {
    if (ix < 0 || ix >= this.cols) return T.FREE;
    if (this.wrap) iy = ((iy % this.rows) + this.rows) % this.rows;
    else if (iy < 0 || iy >= this.rows) return T.SOLID;
    return this.data[this.index(ix, iy)];
  }

  set(ix, iy, t) {
    if (ix < 0 || ix >= this.cols) return;
    if (this.wrap) iy = ((iy % this.rows) + this.rows) % this.rows;
    else if (iy < 0 || iy >= this.rows) return;
    const i = this.index(ix, iy);
    this.data[i] = t;
    this.hp[i] = t === T.BREAK ? BREAK_HP : t === T.ROCK ? ROCK_HP : 0;
    this.version++;
  }

  at(a, c) {
    return this.cell(Math.floor(a / TILE), Math.floor(c / TILE));
  }

  /**
   * Was berührt eine Box (Mittelpunkt a/c, halbe Ausdehnung ha/hc)?
   * Liefert eine Bitmaske: 1 = fest, 2 = Stacheln, 4 = zäh.
   */
  touch(a, c, ha, hc) {
    const x0 = Math.floor((a - ha) / TILE);
    const x1 = Math.floor((a + ha - 1e-6) / TILE);
    const y0 = Math.floor((c - hc) / TILE);
    const y1 = Math.floor((c + hc - 1e-6) / TILE);
    let m = 0;
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const t = this.cell(ix, iy);
        if (isSolid(t)) m |= 1;
        else if (t === T.SPIKE) m |= 2;
        else if (t === T.SLOW) m |= 4;
      }
    }
    return m;
  }

  /**
   * Ein Schuss trifft Terrain. Rückgabe: null (frei), 'block' (prallt ab), 'hit' (beschädigt),
   * 'destroy' (zerstört). drill = Bohrer-Schuss.
   */
  shoot(a, c, dmg, drill) {
    const ix = Math.floor(a / TILE);
    const iy = Math.floor(c / TILE);
    const t = this.cell(ix, iy);
    if (!isSolid(t)) return null;
    if (t === T.BREAK || (t === T.ROCK && drill)) {
      if (ix < 0 || ix >= this.cols) return 'block';
      const yy = this.wrap ? ((iy % this.rows) + this.rows) % this.rows : iy;
      const i = this.index(ix, yy);
      this.hp[i] = Math.max(0, this.hp[i] - dmg);
      if (this.hp[i] <= 0) {
        this.data[i] = T.FREE;
        this.version++;
        return 'destroy';
      }
      return 'hit';
    }
    return 'block';
  }

  /** Kehrtwende im Level: Raster in beiden Achsen spiegeln (ohne Daten zu kopieren). */
  mirror() {
    this.flipA = !this.flipA;
    this.flipC = !this.flipC;
    this.version++;
  }

  /** Raster nur in Flugrichtung gespiegelt (für Rückwärtsflüge). */
  mirroredA() {
    const m = new TileMap(this.cols, this.rows, this.wrap);
    for (let ix = 0; ix < this.cols; ix++) {
      for (let iy = 0; iy < this.rows; iy++) {
        const t = this.cell(ix, iy);
        m.data[m.index(this.cols - 1 - ix, iy)] = t;
        m.hp[m.index(this.cols - 1 - ix, iy)] = t === T.BREAK ? BREAK_HP : t === T.ROCK ? ROCK_HP : 0;
      }
    }
    return m;
  }

  /** Stempelt ein ASCII-Muster (Zeilen = quer, Zeichen = längs) an Spalte ix0 / Zeile iy0. */
  stamp(pattern, ix0, iy0) {
    pattern.forEach((line, dy) => {
      for (let dx = 0; dx < line.length; dx++) {
        const ch = line[dx];
        if (ch === ' ') continue; // Leerzeichen = nicht verändern
        const t = CHAR_TO_TILE[ch];
        if (t === undefined) throw new Error('Unbekanntes Terrain-Zeichen ' + ch);
        this.set(ix0 + dx, iy0 + dy, t);
      }
    });
  }
}

/**
 * Prüft, ob man das Raster in Flugrichtung durchqueren kann, ohne je rückwärts zu müssen
 * (die Kamera scrollt mit). Die Spielerbox belegt "size" Kacheln quer und längs.
 * opts: drill (Fels zählt als frei), rubber (Stacheln zählen als frei), from/to (Spalten),
 * rowsAt0 (erlaubte Startzeilen, Standard: alle freien).
 * Gibt den Weg als Zeilennummer pro Spalte zurück oder null.
 */
export function findPath(map, opts = {}) {
  const size = opts.size || 2;
  const from = Math.max(0, opts.from ?? 0);
  const to = Math.min(map.cols - size, opts.to ?? map.cols - size);
  const passable = (t) =>
    t === T.FREE ||
    t === T.SLOW ||
    t === T.BREAK ||
    (t === T.ROCK && opts.drill) ||
    (t === T.SPIKE && opts.rubber);
  const rows = map.rows;
  const maxY = map.wrap ? rows : rows - size + 1;
  const norm = (iy) => (map.wrap ? ((iy % rows) + rows) % rows : iy);
  const free = (ix, iy) => {
    for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) if (!passable(map.cell(ix + x, iy + y))) return false;
    return true;
  };
  // Breitensuche: rechts (vorwärts) oder quer – nie rückwärts
  const W = maxY;
  const parent = new Int32Array((to + 1) * W).fill(-2);
  const queue = [];
  for (let iy = 0; iy < maxY; iy++) {
    if (free(from, iy)) {
      parent[from * W + iy] = -1;
      queue.push(from * W + iy);
    }
  }
  let goal = -1;
  for (let qi = 0; qi < queue.length; qi++) {
    const k = queue[qi];
    const ix = Math.floor(k / W);
    const iy = k % W;
    if (ix === to) {
      goal = k;
      break;
    }
    for (const [nx, ny] of [
      [ix + 1, iy],
      [ix, norm(iy - 1)],
      [ix, norm(iy + 1)],
    ]) {
      if (ny < 0 || ny >= maxY || nx > to) continue;
      const nk = nx * W + ny;
      if (parent[nk] !== -2 || !free(nx, ny)) continue;
      parent[nk] = k;
      queue.push(nk);
    }
  }
  if (goal < 0) return null;
  // Weg zurückverfolgen; pro Spalte die Zeile, in der man die Spalte verlässt
  const path = new Array(map.cols).fill(-1);
  for (let k = goal; k >= 0; k = parent[k]) {
    const ix = Math.floor(k / W);
    if (path[ix] < 0) path[ix] = k % W;
  }
  return path;
}
