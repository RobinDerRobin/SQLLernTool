// Blitz-Zählung für den Flacker-Test (eigene Datei, damit sie auch in Unit-Tests prüfbar ist).

export const STEP = 0.1; // Helligkeitssprung (0..1), ab dem ein Wechsel zählt

/** Zählt Blitze: Paare gegenläufiger Helligkeitswechsel von mindestens STEP. */
export function countFlashes(series) {
  let flashes = 0;
  let ref = series[0];
  let dir = 0;
  for (const v of series) {
    const d = v - ref;
    if (Math.abs(d) >= STEP) {
      const nd = Math.sign(d);
      if (dir !== 0 && nd !== dir) flashes += 0.5;
      dir = nd;
      ref = v;
    } else if ((dir > 0 && v > ref) || (dir < 0 && v < ref)) {
      ref = v;
    }
  }
  return Math.floor(flashes);
}
