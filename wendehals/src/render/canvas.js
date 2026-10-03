// Hilfen für vorgerenderte Grafiken (Offscreen-Canvas). In Node (Tests) gibt es keine
// Canvas-Implementierung – dann liefern die Funktionen null und der Renderer zeichnet schlichter.

export function makeCanvas(w, h) {
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return null;
}

const cache = new Map();

/**
 * Liefert ein einmal gerendertes Bild. draw(ctx) zeichnet in internen Einheiten,
 * res ist die Auflösung (Pixel pro Einheit), damit es auch hochskaliert scharf bleibt.
 */
export function cached(key, w, h, res, draw) {
  let entry = cache.get(key);
  if (entry !== undefined) return entry;
  const canvas = makeCanvas(w * res, h * res);
  if (!canvas) {
    cache.set(key, null);
    return null;
  }
  const ctx = canvas.getContext('2d');
  ctx.scale(res, res);
  draw(ctx);
  entry = { canvas, w, h, res };
  cache.set(key, entry);
  return entry;
}

export function clearCache() {
  cache.clear();
}

/**
 * Füllt die Fläche [x0,x1]x[y0,y1] mit einem kachelbaren Bild, verschoben um (ox, oy).
 * Nutzt createPattern; das Muster hängt am aktuellen Koordinatensystem.
 */
export function fillTiled(ctx, entry, ox, oy, x0, y0, x1, y1) {
  if (!entry) return false;
  if (!entry.pattern) entry.pattern = ctx.createPattern(entry.canvas, 'repeat');
  if (!entry.pattern) return false;
  const tw = entry.w;
  const th = entry.h;
  const sx = ((ox % tw) + tw) % tw;
  const sy = ((oy % th) + th) % th;
  ctx.save();
  ctx.translate(x0 - sx, y0 - sy);
  ctx.scale(1 / entry.res, 1 / entry.res);
  ctx.fillStyle = entry.pattern;
  ctx.fillRect(0, 0, (x1 - x0 + tw) * entry.res, (y1 - y0 + th) * entry.res);
  ctx.restore();
  return true;
}

// Zwischenspeicher für den Treffer-Blitz (weiße Silhouette)
let flashCanvas = null;

/**
 * Zeichnet fn() normal und legt danach eine weiße Silhouette darüber.
 * Ersetzt ctx.filter, das in Canvas extrem langsam ist (jeder Zeichenbefehl wird gefiltert).
 */
export function drawWithFlash(ctx, radius, strength, fn) {
  fn(ctx);
  if (strength <= 0) return;
  const res = 2;
  const size = Math.ceil(radius * 2 + 8);
  if (!flashCanvas || flashCanvas.width < size * res || flashCanvas.height < size * res) {
    flashCanvas = makeCanvas(Math.max(size * res, 160), Math.max(size * res, 160));
  }
  if (!flashCanvas) return;
  const fc = flashCanvas.getContext('2d');
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.globalCompositeOperation = 'source-over';
  fc.clearRect(0, 0, size * res, size * res);
  fc.setTransform(res, 0, 0, res, (size * res) / 2, (size * res) / 2);
  fn(fc);
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.globalCompositeOperation = 'source-in';
  fc.fillStyle = '#ffffff';
  fc.fillRect(0, 0, size * res, size * res);
  fc.globalCompositeOperation = 'source-over';
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * Math.min(1, strength);
  ctx.drawImage(flashCanvas, 0, 0, size * res, size * res, -size / 2, -size / 2, size, size);
  ctx.globalAlpha = a;
}

/**
 * Wie fillTiled, aber für eine um Vielfache von 90° gedrehte Welt: Das Muster wird in
 * Bildschirmrichtung (achsenparallel) gefüllt, mit einer vorgedrehten Kachel. Gedrehte
 * Musterfüllungen sind in Software-Rasterizern sehr langsam.
 * quarter = Anzahl Vierteldrehungen (0..3), (ax, ay) = ein Gitterpunkt des Musters in lokalen
 * Koordinaten. Gibt false zurück, wenn es nicht geht (dann normal füllen).
 */
export function fillTiledScreen(ctx, entry, quarter, ax, ay, devW, devH) {
  if (!entry || typeof ctx.getTransform !== 'function') return false;
  const m = ctx.getTransform();
  if (!m || typeof m.a !== 'number') return false;
  const key = 'rot' + quarter;
  if (!entry[key]) {
    const sw = quarter % 2 ? entry.h : entry.w;
    const sh = quarter % 2 ? entry.w : entry.h;
    const c = makeCanvas(sw * entry.res, sh * entry.res);
    if (!c) return false;
    const cx = c.getContext('2d');
    cx.translate((sw * entry.res) / 2, (sh * entry.res) / 2);
    cx.rotate((quarter * Math.PI) / 2);
    cx.drawImage(entry.canvas, (-entry.w * entry.res) / 2, (-entry.h * entry.res) / 2);
    entry[key] = { canvas: c, w: sw, h: sh, pattern: null };
  }
  const rt = entry[key];
  if (!rt.pattern) rt.pattern = ctx.createPattern(rt.canvas, 'repeat');
  if (!rt.pattern) return false;
  const scale = Math.hypot(m.a, m.b);
  // Ecken der lokalen Kachel am Gitterpunkt in Bildschirmeinheiten (Gerät / scale)
  let minX = Infinity;
  let minY = Infinity;
  for (const [dx, dy] of [[0, 0], [entry.w, 0], [0, entry.h], [entry.w, entry.h]]) {
    const x = ax + dx;
    const y = ay + dy;
    minX = Math.min(minX, (m.a * x + m.c * y + m.e) / scale);
    minY = Math.min(minY, (m.b * x + m.d * y + m.f) / scale);
  }
  const ox = ((minX % rt.w) + rt.w) % rt.w;
  const oy = ((minY % rt.h) + rt.h) % rt.h;
  ctx.save();
  ctx.setTransform(scale / entry.res, 0, 0, scale / entry.res, (ox - rt.w) * scale, (oy - rt.h) * scale);
  ctx.fillStyle = rt.pattern;
  ctx.fillRect(0, 0, (devW / scale + rt.w * 2) * entry.res, (devH / scale + rt.h * 2) * entry.res);
  ctx.restore();
  return true;
}
