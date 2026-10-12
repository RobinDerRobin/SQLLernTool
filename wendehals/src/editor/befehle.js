// Bearbeiten des Gebiets: Gang ziehen, Knoten setzen, Gang teilen, löschen, Eigenschaften ändern. Reine Datenänderung auf dem
// übergebenen Gebiet (kein DOM, läuft auch unter Node) – Rückgängig macht main.js über den Verlauf aus daten.js.
// Alles rastet: Gänge auf 8 Richtungen und RASTER (20 E), neue Knoten auf KNOTENRASTER (100 E).
import { HEADINGS, DIR_VEC, HEADING_CODES } from '../core/math.js';
import { MAX_KOORD, RASTER, KNOTENRASTER, GANG_BREITE, RAUM_W, RAUM_H, MIN_RAUM, MIN_QUERWEG, MIN_GANG_LAENGE } from './konstanten.js';
import { KNOTENTYPEN } from './katalog.js';
import { knotenMap, gangMasse, richtungVon } from './daten.js';

const EPS = 1e-6;
const rund = (v, r = 1) => Math.round(v / r) * r + 0; // + 0 macht aus -0 eine 0
const sauber = (v) => Math.round(v * 1000) / 1000 + 0; // Rundungsrauschen aus Schnittpunkten entfernen
const abstand = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Kleinste freie Nummer: `K1`, `K2` … (IDs sind im ganzen Gebiet eindeutig, Brief Abschnitt 4). */
/** IDs, die nicht neu vergeben werden (main.js trägt hier die Knoten ein, auf die ein Übergang zeigt – sonst bände er sich still an einen neuen Knoten). */
export const gesperrteIds = new Set();

export function neueId(g, praefix) {
  const belegt = new Set([...g.knoten, ...g.gaenge, ...g.formteile, ...g.objekte, ...g.notizen].map((o) => o.id));
  for (const id of gesperrteIds) belegt.add(id);
  for (let n = 1; ; n++) if (!belegt.has(praefix + n)) return praefix + n;
}

/** Nächster Knoten innerhalb `tol` E um (x, y), sonst null. */
export function knotenBei(g, x, y, tol) {
  let best = null;
  let bd = tol;
  for (const k of g.knoten) {
    const d = abstand(k.x, k.y, x, y);
    if (d <= bd) {
      best = k;
      bd = d;
    }
  }
  return best;
}

/** Nächster Gang, dessen Mittellinie höchstens `tol` E von (x, y) entfernt ist: { gang, s (E ab Anfang), abstand, masse }. */
export function gangBei(g, x, y, tol) {
  const km = knotenMap(g);
  let best = null;
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang, km);
    if (!m || m.laenge < EPS) continue;
    const s = Math.max(0, Math.min(m.laenge, (x - m.a.x) * m.ux + (y - m.a.y) * m.uy));
    const d = abstand(m.a.x + m.ux * s, m.a.y + m.uy * s, x, y);
    if (d <= tol && (!best || d < best.abstand)) best = { gang, s, abstand: d, masse: m };
  }
  return best;
}

/** Rasterschritt entlang eines Gangs: RASTER je Achse, auf Diagonalen also RASTER·√2 – so bleiben die Koordinaten glatt. */
const schrittEntlang = (m) => (m.richtung >= 0 ? RASTER * Math.hypot(...DIR_VEC[m.richtung]) : RASTER);

/**
 * Rastet einen Zielpunkt aus: von `start` aus in die nächste der 8 Richtungen, Länge auf RASTER (Diagonalen: je Achse RASTER).
 * Gibt { x, y, richtung, schritte } zurück; schritte = 0 heißt: zu kurz, kein Gang.
 */
export function rasterEnde(start, x, y) {
  const dx = x - start.x;
  const dy = y - start.y;
  let best = 0;
  let bestWert = -Infinity;
  for (const h of HEADINGS) {
    const [vx, vy] = DIR_VEC[h];
    const wert = (dx * vx + dy * vy) / Math.hypot(vx, vy);
    if (wert > bestWert) {
      bestWert = wert;
      best = h;
    }
  }
  const [vx, vy] = DIR_VEC[best];
  const proj = (dx * vx + dy * vy) / (vx * vx + vy * vy); // in Rasterfeldern entlang der Richtung
  const schritte = Math.max(0, Math.round(proj / RASTER));
  return { x: start.x + vx * RASTER * schritte, y: start.y + vy * RASTER * schritte, richtung: best, schritte };
}

/** Schnitt des Strahls start + t·richtung (t > 0) mit der Mittellinie eines Gangs: { x, y } oder null. */
function schnittMitGang(start, richtung, m) {
  const [rx, ry] = DIR_VEC[richtung];
  // start + t·r = a + s·u  →  t·r − s·u = a − start
  const det = -rx * m.uy + ry * m.ux;
  if (Math.abs(det) < EPS) return null;
  const ex = m.a.x - start.x;
  const ey = m.a.y - start.y;
  const t = (-ex * m.uy + ey * m.ux) / det;
  const s = (rx * ey - ry * ex) / det;
  if (t < EPS || s < -EPS || s > m.laenge + EPS) return null;
  return { x: sauber(start.x + rx * t), y: sauber(start.y + ry * t) };
}

const grad = (g, id) => g.gaenge.filter((x) => x.von === id || x.nach === id).length;

/** Ein Knoten mit mindestens zwei Gängen ist kein Gangende mehr, sondern eine Kreuzung. */
function typAnpassen(g, id) {
  const k = g.knoten.find((x) => x.id === id);
  if (k && k.typ === 'ende' && grad(g, id) >= 2) k.typ = 'kreuzung';
}

function knotenAnlegen(g, typ, x, y) {
  const k = { id: neueId(g, 'K'), typ, x: sauber(x), y: sauber(y) };
  if (KNOTENTYPEN[typ]?.hatMasse) {
    k.w = RAUM_W;
    k.h = RAUM_H;
  }
  g.knoten.push(k);
  return k;
}

/**
 * Teilt einen Gang bei Stelle `s` (E ab Anfang): neuer Knoten (Typ `typ`, Standard Kreuzung). Der erste Teil behält ID und alle Daten,
 * der zweite bekommt eine neue ID und dieselben Daten (Name, Breite …). Liegt `s` näher als MIN_GANG_LAENGE an einem Ende, wird kein
 * Knoten angelegt, sondern der vorhandene Endknoten zurückgegeben.
 */
export function gangTeilen(g, gangId, s, typ = 'kreuzung') {
  const gang = g.gaenge.find((x) => x.id === gangId);
  const m = gang && gangMasse(g, gang);
  if (!m) return null;
  s = rund(s, schrittEntlang(m)); // auch auf Diagonalen im Raster
  if (s < MIN_GANG_LAENGE) return g.knoten.find((k) => k.id === gang.von);
  if (s > m.laenge - MIN_GANG_LAENGE) return g.knoten.find((k) => k.id === gang.nach);
  const knoten = knotenAnlegen(g, typ, m.a.x + m.ux * s, m.a.y + m.uy * s);
  const zweiter = { ...JSON.parse(JSON.stringify(gang)), id: neueId(g, gang.id + '-'), von: knoten.id };
  gang.nach = knoten.id;
  g.gaenge.splice(g.gaenge.indexOf(gang) + 1, 0, zweiter);
  return knoten;
}

/**
 * Setzt einen Knoten: liegt der Punkt auf einem Gang (innerhalb `tol` E), wird dieser Gang geteilt (T-Kreuzung; die Stelle rastet
 * entlang des Gangs); sonst rastet der Knoten auf KNOTENRASTER. Gibt den neuen Knoten zurück, null wenn dort schon einer steht
 * oder der Punkt zu nah an einem Gangende liegt.
 */
export function knotenSetzen(g, typ, x, y, tol = KNOTENRASTER / 2) {
  const treffer = gangBei(g, x, y, tol);
  if (treffer) {
    const s = rund(treffer.s, schrittEntlang(treffer.masse));
    if (s < MIN_GANG_LAENGE || s > treffer.masse.laenge - MIN_GANG_LAENGE) return null;
    if (knotenBei(g, treffer.masse.a.x + treffer.masse.ux * s, treffer.masse.a.y + treffer.masse.uy * s, 1)) return null;
    return gangTeilen(g, treffer.gang.id, s, typ);
  }
  const px = rund(x, KNOTENRASTER);
  const py = rund(y, KNOTENRASTER);
  if (knotenBei(g, px, py, 1)) return null;
  return knotenAnlegen(g, typ, px, py);
}

/** Stellt den Anfang eines Gangs als Knoten bereit: vorhandener Knoten, Teilung eines Gangs oder ein neuer Knoten (Gangende). */
function anfangKnoten(g, x, y, tol) {
  const k = knotenBei(g, x, y, tol);
  if (k) return k;
  const treffer = gangBei(g, x, y, tol);
  if (treffer) {
    const s = rund(treffer.s, schrittEntlang(treffer.masse));
    return gangTeilen(g, treffer.gang.id, s);
  }
  return knotenAnlegen(g, 'ende', rund(x, KNOTENRASTER), rund(y, KNOTENRASTER));
}

/**
 * Wohin würde ein Gang von `start` zum Mauszeiger (x, y) führen? Ändert keine Daten (für die Vorschau).
 * Reihenfolge: Knoten unter dem Zeiger (nur wenn die Richtung im 45°-Raster liegt) → Schnitt der Rasterrichtung mit einem Gang
 * in Zeigernähe (T-Kreuzung) → freies Ende im Raster. Gibt { x, y, richtung, laenge, knoten?, gang? } oder null (zu kurz).
 */
export function gangZiel(g, start, x, y, tol) {
  const k = knotenBei(g, x, y, tol);
  if (k && abstand(k.x, k.y, start.x, start.y) >= MIN_GANG_LAENGE) {
    const r = richtungVon(k.x - start.x, k.y - start.y);
    if (r >= 0) return { x: k.x, y: k.y, richtung: r, laenge: abstand(k.x, k.y, start.x, start.y), knoten: k.id };
  }
  const r = rasterEnde(start, x, y);
  if (r.schritte < 1) return null;
  const km = knotenMap(g);
  let best = null;
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang, km);
    if (!m) continue;
    const p = schnittMitGang(start, r.richtung, m);
    if (!p || abstand(p.x, p.y, start.x, start.y) < MIN_GANG_LAENGE) continue;
    const d = abstand(p.x, p.y, x, y);
    if (d <= tol && (!best || d < best.d)) best = { ...p, d, gang: gang.id };
  }
  if (best) return { x: best.x, y: best.y, richtung: r.richtung, laenge: abstand(best.x, best.y, start.x, start.y), gang: best.gang };
  return { x: r.x, y: r.y, richtung: r.richtung, laenge: abstand(r.x, r.y, start.x, start.y) };
}

/** Läge ein neuer Gang von a nach b deckungsgleich auf einem vorhandenen (parallel, Mitte auf dessen Mittellinie)? */
function ueberlagert(g, a, b) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const km = knotenMap(g);
  return g.gaenge.some((x) => {
    const m = gangMasse(g, x, km);
    if (!m || m.laenge < EPS || Math.abs(dx * m.uy - dy * m.ux) > 1e-6 * Math.hypot(dx, dy)) return false;
    const t = (mx - m.a.x) * m.ux + (my - m.a.y) * m.uy;
    return t >= -EPS && t <= m.laenge + EPS && Math.abs((mx - m.a.x) * m.uy - (my - m.a.y) * m.ux) < 1;
  });
}

/** Stellt den Zustand `vorher` (Text) wieder her, ohne das Objekt zu ersetzen. */
function wiederherstellen(g, vorher) {
  const alt = JSON.parse(vorher);
  for (const k of Object.keys(g)) delete g[k];
  Object.assign(g, alt);
  return null;
}

/**
 * Zieht einen Gang vom Weltpunkt (sx, sy) zum Mauszeiger (ex, ey); `tol` = Fangradius in E. Der Anfang wird ein vorhandener Knoten,
 * die Teilung eines Gangs oder ein neuer Knoten; das Ende wie bei `gangZiel`. Gibt { gang, von, nach } zurück oder null
 * (zu kurz, gleicher Knoten, Gang gibt es schon) – dann bleibt das Gebiet unverändert.
 */
export function gangZiehen(g, sx, sy, ex, ey, tol, breite = GANG_BREITE) {
  const vorher = JSON.stringify(g);
  const von = anfangKnoten(g, sx, sy, tol);
  const ziel = von && gangZiel(g, { x: von.x, y: von.y }, ex, ey, tol);
  if (!ziel) return wiederherstellen(g, vorher);
  let nach;
  if (ziel.knoten) nach = g.knoten.find((k) => k.id === ziel.knoten);
  else if (ziel.gang) {
    const gang = g.gaenge.find((x) => x.id === ziel.gang);
    const m = gangMasse(g, gang);
    nach = gangTeilen(g, ziel.gang, abstand(m.a.x, m.a.y, ziel.x, ziel.y));
  } else nach = knotenAnlegen(g, 'ende', ziel.x, ziel.y);
  const doppelt = nach && g.gaenge.some((x) => (x.von === von.id && x.nach === nach.id) || (x.von === nach.id && x.nach === von.id));
  if (!nach || nach.id === von.id || doppelt || richtungVon(nach.x - von.x, nach.y - von.y) < 0) return wiederherstellen(g, vorher);
  if (ueberlagert(g, von, nach)) return wiederherstellen(g, vorher);
  const id = neueId(g, 'gang');
  const gang = { id, name: `Gang ${id.slice(4)}`, von: von.id, nach: nach.id, breite };
  g.gaenge.push(gang);
  typAnpassen(g, von.id);
  typAnpassen(g, nach.id);
  return { gang, von: von.id, nach: nach.id };
}

/** Verschiebt einen Knoten (Raster KNOTENRASTER). Die Gänge folgen, weil sie auf Knoten verweisen. false: nichts geändert. */
export function knotenVerschieben(g, id, x, y) {
  const k = g.knoten.find((n) => n.id === id);
  if (!k) return false;
  const nx = rund(x, KNOTENRASTER);
  const ny = rund(y, KNOTENRASTER);
  if (nx === k.x && ny === k.y) return false;
  if (g.knoten.some((n) => n !== k && n.x === nx && n.y === ny)) return false;
  const altX = k.x;
  const altY = k.y;
  k.x = nx;
  k.y = ny;
  if (!gaengeImRaster(g, id)) {
    k.x = altX;
    k.y = altY;
    return false;
  }
  return true;
}

/** Liegen alle Gänge an diesem Knoten (noch) im 45°-Raster und haben Länge? */
export function gaengeImRaster(g, knotenId) {
  const km = knotenMap(g);
  return g.gaenge.filter((x) => x.von === knotenId || x.nach === knotenId).every((x) => {
    const m = gangMasse(g, x, km);
    return m && m.richtung >= 0 && m.laenge >= MIN_GANG_LAENGE;
  });
}

/** Löscht einen Knoten (samt seinen Gängen) oder einen Gang; Gangenden, die dadurch frei stehen, verschwinden mit. Gibt die entfernten IDs zurück. */
export function loesche(g, art, id) {
  const weg = [];
  const betroffen = new Set();
  if (art === 'knoten') {
    if (!g.knoten.some((k) => k.id === id)) return weg;
    for (const gang of g.gaenge.filter((x) => x.von === id || x.nach === id)) {
      weg.push(gang.id);
      betroffen.add(gang.von).add(gang.nach);
    }
    g.gaenge = g.gaenge.filter((x) => !weg.includes(x.id));
    g.knoten = g.knoten.filter((k) => k.id !== id);
    weg.push(id);
  } else if (art === 'gang') {
    const gang = g.gaenge.find((x) => x.id === id);
    if (!gang) return weg;
    g.gaenge = g.gaenge.filter((x) => x !== gang);
    betroffen.add(gang.von).add(gang.nach);
    weg.push(id);
  }
  for (const kid of betroffen) {
    const k = g.knoten.find((n) => n.id === kid);
    if (k && k.typ === 'ende' && grad(g, kid) === 0) {
      g.knoten = g.knoten.filter((n) => n !== k);
      weg.push(kid);
    }
  }
  return weg;
}

/**
 * Ändert ein Feld eines Gangs oder Knotens. Gibt null zurück, wenn es geklappt hat, sonst eine verständliche Meldung (nichts geändert).
 * gang: name, breite, ansicht · knoten: typ, x, y, w, h
 */
export function setze(g, art, id, feld, wert) {
  const o = (art === 'gang' ? g.gaenge : g.knoten).find((x) => x.id === id);
  if (!o) return `${art === 'gang' ? 'Gang' : 'Knoten'} „${id}“ gibt es nicht.`;
  const text = String(wert).trim();
  const zahl = typeof wert === 'number' ? wert : text === '' ? NaN : Number(text.replace(',', '.')); // leeres Feld ist keine 0
  if (feld !== 'name' && feld !== 'typ' && Number.isFinite(zahl) && Math.abs(zahl) > MAX_KOORD) return `Zahlen über ${MAX_KOORD} E sind nicht erlaubt.`;
  if (art === 'gang') {
    if (feld === 'name') {
      const t = String(wert).trim();
      if (!t) return 'Der Name darf nicht leer sein.';
      o.name = t;
    } else if (feld === 'breite') {
      if (!Number.isFinite(zahl) || zahl < MIN_QUERWEG) return `Die Breite muss mindestens ${MIN_QUERWEG} E sein (sonst ist der Gang nicht passierbar).`;
      o.breite = rund(zahl);
    } else if (feld === 'ansicht') {
      // Ausgangsperspektive (A3): die Richtung, die beim Öffnen des Levels im Plan nach rechts zeigt; E = Norden oben = Standard = kein Feld
      if (!HEADING_CODES.includes(wert)) return `Die Ansicht muss eine der acht Richtungen sein (${HEADING_CODES.join(', ')}).`;
      if (wert === 'E') delete o.ansicht;
      else o.ansicht = wert;
    } else return `Feld „${feld}“ eines Gangs lässt sich nicht ändern.`;
    return null;
  }
  if (feld === 'typ') {
    if (!Object.hasOwn(KNOTENTYPEN, wert)) return `Unbekannter Knotentyp „${wert}“.`;
    if (KNOTENTYPEN[o.typ]?.hatMasse && !KNOTENTYPEN[wert].hatMasse && o.typ !== 'kreuzung') {
      delete o.w; // Maße gehören nur zu Raum/Boss (und zum Kreuzungsquadrat)
      delete o.h;
    }
    o.typ = wert;
    if (KNOTENTYPEN[wert].hatMasse && !(o.w > 0 && o.h > 0)) {
      o.w = RAUM_W;
      o.h = RAUM_H;
    }
  } else if (feld === 'x' || feld === 'y') {
    if (!Number.isFinite(zahl)) return 'Bitte eine Zahl eingeben.';
    const alt = o[feld];
    o[feld] = rund(zahl);
    if (!gaengeImRaster(g, id)) {
      o[feld] = alt;
      return 'Dann läge ein Gang an diesem Knoten nicht mehr im 45°-Raster (oder wäre zu kurz). Nichts geändert.';
    }
  } else if (feld === 'w' || feld === 'h') {
    if (!(o.w > 0 && o.h > 0)) return 'Dieser Knoten hat keine Maße (nur Räume, Bosskämpfe und Kreuzungsquadrate).';
    if (!Number.isFinite(zahl) || zahl < MIN_RAUM) return `Eine Raumseite muss mindestens ${MIN_RAUM} E lang sein.`;
    o[feld] = rund(zahl);
  } else return `Feld „${feld}“ eines Knotens lässt sich nicht ändern.`;
  return null;
}

/** Wo beginnt ein Gang, der am Mauszeiger (x, y) angesetzt wird? Ändert keine Daten (Gegenstück zu `anfangKnoten`, für die Vorschau). */
export function anfangPunkt(g, x, y, tol) {
  const k = knotenBei(g, x, y, tol);
  if (k) return { x: k.x, y: k.y, knoten: k.id };
  const treffer = gangBei(g, x, y, tol);
  if (treffer) {
    const m = treffer.masse;
    const s = rund(treffer.s, schrittEntlang(m));
    if (s < MIN_GANG_LAENGE) return { x: m.a.x, y: m.a.y, knoten: treffer.gang.von };
    if (s > m.laenge - MIN_GANG_LAENGE) return { x: m.b.x, y: m.b.y, knoten: treffer.gang.nach };
    return { x: sauber(m.a.x + m.ux * s), y: sauber(m.a.y + m.uy * s), gang: treffer.gang.id };
  }
  return { x: rund(x, KNOTENRASTER), y: rund(y, KNOTENRASTER), neu: true };
}

/** Wo würde `knotenSetzen` den Knoten hinsetzen? { x, y, gang? } oder null (dort geht es nicht). Für die Vorschau. */
export function knotenPunkt(g, x, y, tol = KNOTENRASTER / 2) {
  const treffer = gangBei(g, x, y, tol);
  if (treffer) {
    const m = treffer.masse;
    const s = rund(treffer.s, schrittEntlang(m));
    if (s < MIN_GANG_LAENGE || s > m.laenge - MIN_GANG_LAENGE) return null;
    const p = { x: sauber(m.a.x + m.ux * s), y: sauber(m.a.y + m.uy * s), gang: treffer.gang.id };
    return knotenBei(g, p.x, p.y, 1) ? null : p;
  }
  const p = { x: rund(x, KNOTENRASTER), y: rund(y, KNOTENRASTER) };
  return knotenBei(g, p.x, p.y, 1) ? null : p;
}
