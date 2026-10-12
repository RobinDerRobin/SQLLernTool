// Welt-Ebene (Stufe 5): Bereiche der Gebiete, Lage der Gebiete im Welt-Plan, Übergänge zwischen Gebieten, Prüfung der Welt.
// Reine Daten und Rechnung – kein DOM, läuft auch unter Node (Tests). Format: siehe docs/EDITOR.md („welt.json“).
//   welt.json: { format, gebiete: [{ id, name, datei, lage?: {x, y} }], uebergaenge?: [{ id, von: "gebiet/K1", nach: "gebiet/K2" }] }
// `lage` verschiebt ein Gebiet nur im Welt-Plan (die Koordinaten in der Gebietsdatei bleiben), fehlt sie, ordnet `weltLagen` die
// Gebiete automatisch von links nach rechts an. Ein Übergang verbindet je einen Knoten zweier verschiedener Gebiete.
import { FORMAT, BEREICH_RASTER, MIN_BEREICH_W, MIN_BEREICH_H, BEREICH_RAND, WELT_LUECKE, LAGE_RASTER, MAX_KOORD } from './konstanten.js';
import { ausdehnung, bodenPolygone, GEBIET_ID } from './daten.js';

const rund = (v, r = 1) => Math.round(v / r) * r + 0; // + 0 macht aus -0 eine 0
const zahl = (v) => typeof v === 'number' && Number.isFinite(v);

// ------------------------------------------------------------------ Bereich eines Gebiets

/** Breite, Höhe und Größe in Bildschirmen des Bereichs (für die Anzeige). */
export const bereichMasse = (b) => ({ w: b.x1 - b.x0, h: b.y1 - b.y0 });

/** Setzt den Bereich auf das Rechteck zwischen zwei Punkten (rastet auf 100 E).
 *  Gibt eine Fehlermeldung zurück (nichts geändert) oder null. */
export function bereichSetzen(g, ax, ay, bx, by) {
  if (![ax, ay, bx, by].every(zahl)) return 'Bitte Zahlen eingeben.';
  const x0 = rund(Math.min(ax, bx), BEREICH_RASTER);
  const x1 = rund(Math.max(ax, bx), BEREICH_RASTER);
  const y0 = rund(Math.min(ay, by), BEREICH_RASTER);
  const y1 = rund(Math.max(ay, by), BEREICH_RASTER);
  if ([x0, y0, x1, y1].some((v) => Math.abs(v) > MAX_KOORD)) return `Zahlen über ${MAX_KOORD} E sind nicht erlaubt.`;
  if (x1 - x0 < MIN_BEREICH_W || y1 - y0 < MIN_BEREICH_H) return `Der Bereich muss mindestens ${MIN_BEREICH_W} × ${MIN_BEREICH_H} E groß sein (ein Bildschirm).`;
  g.bereich = { x0, y0, x1, y1 };
  return null;
}

/** Eine Seite des Bereichs ändern (Eigenschaftenfeld). `feld` = x0 | y0 | x1 | y1. Fehlermeldung oder null. */
export function bereichFeld(g, feld, wert) {
  const text = String(wert).trim();
  const z = typeof wert === 'number' ? wert : text === '' ? NaN : Number(text.replace(',', '.'));
  if (!['x0', 'y0', 'x1', 'y1'].includes(feld)) return `Feld „${feld}“ gibt es beim Bereich nicht.`;
  if (!Number.isFinite(z)) return 'Bitte eine Zahl eingeben.';
  const b = { ...g.bereich, [feld]: z };
  return bereichSetzen(g, b.x0, b.y0, b.x1, b.y1);
}

/** Alle Orte, die zum Gebiet gehören (für „An Inhalt anpassen“ und die Prüfregel S3): Boden, Teile, Gegner, Notizen. */
function inhaltPunkte(g) {
  const pts = bodenPolygone(g).flat();
  for (const o of g.objekte) pts.push([o.x, o.y]);
  for (const n of g.notizen) pts.push([n.x, n.y]);
  return pts;
}

/** Bereich, der den ganzen Inhalt mit Rand umschließt (nach außen auf 100 E gerundet). Leeres Gebiet: bisheriger Bereich. */
export function bereichAnInhalt(g, rand = BEREICH_RAND) {
  const pts = inhaltPunkte(g);
  if (!pts.length) return { ...g.bereich };
  const e = ausdehnung(g);
  const x0 = Math.min(e.x0, ...pts.map((p) => p[0])) - rand;
  const y0 = Math.min(e.y0, ...pts.map((p) => p[1])) - rand;
  const x1 = Math.max(e.x1, ...pts.map((p) => p[0])) + rand;
  const y1 = Math.max(e.y1, ...pts.map((p) => p[1])) + rand;
  const b = { x0: Math.floor(x0 / BEREICH_RASTER) * BEREICH_RASTER + 0, y0: Math.floor(y0 / BEREICH_RASTER) * BEREICH_RASTER + 0, x1: Math.ceil(x1 / BEREICH_RASTER) * BEREICH_RASTER + 0, y1: Math.ceil(y1 / BEREICH_RASTER) * BEREICH_RASTER + 0 };
  if (b.x1 - b.x0 < MIN_BEREICH_W) b.x1 = b.x0 + MIN_BEREICH_W;
  if (b.y1 - b.y0 < MIN_BEREICH_H) b.y1 = b.y0 + MIN_BEREICH_H;
  return b;
}

/** Setzt den Bereich so, dass er den Inhalt umschließt. Gibt true zurück, wenn sich etwas geändert hat. */
export function bereichAnpassen(g) {
  const b = bereichAnInhalt(g);
  const alt = JSON.stringify(g.bereich);
  g.bereich = b;
  return JSON.stringify(b) !== alt;
}

/** Liegt der Punkt im Bereich (mit `toleranz` E Zuschlag)? */
export const imBereich = (b, x, y, toleranz = 0) => x >= b.x0 - toleranz && x <= b.x1 + toleranz && y >= b.y0 - toleranz && y <= b.y1 + toleranz;

/** Was liegt außerhalb des Bereichs? [{ art: 'knoten'|'gang'|'formteil'|'objekt'|'notiz', id, x, y }] */
export function ausserhalb(g) {
  const b = g.bereich;
  const out = [];
  for (const k of g.knoten) {
    const poly = bodenPolygone({ ...g, gaenge: [], formteile: [], knoten: [k] }).flat();
    const punkte = poly.length ? poly : [[k.x, k.y]];
    if (punkte.some(([x, y]) => !imBereich(b, x, y, 0.5))) out.push({ art: 'knoten', id: k.id, x: k.x, y: k.y });
  }
  for (const f of g.formteile) {
    const poly = bodenPolygone({ ...g, gaenge: [], knoten: [], formteile: [f] }).flat();
    if (poly.some(([x, y]) => !imBereich(b, x, y, 0.5))) out.push({ art: 'formteil', id: f.id, x: f.x, y: f.y });
  }
  for (const o of g.objekte) if (!imBereich(b, o.x, o.y, 0.5)) out.push({ art: 'objekt', id: o.id, x: o.x, y: o.y });
  for (const n of g.notizen) if (!imBereich(b, n.x, n.y, 0.5)) out.push({ art: 'notiz', id: n.id, x: n.x, y: n.y });
  return out;
}

// ------------------------------------------------------------------ Lage der Gebiete im Welt-Plan

/**
 * Lage (Versatz in E) jedes Gebiets im Welt-Plan: gespeicherte `lage` oder – ohne – automatisch rechts neben den vorigen
 * Gebieten (Bereichsoberkante bei y = 0). Gibt eine Map id → { x, y, auto } zurück; nur Gebiete, die geladen sind.
 */
export function weltLagen(welt, gebiete) {
  const lagen = new Map();
  let rechts = -Infinity;
  const ohne = [];
  for (const e of welt.gebiete) {
    const g = gebiete[e.id];
    if (!g) continue;
    if (e.lage && zahl(e.lage.x) && zahl(e.lage.y)) {
      lagen.set(e.id, { x: e.lage.x, y: e.lage.y, auto: false });
      rechts = Math.max(rechts, g.bereich.x1 + e.lage.x);
    } else ohne.push(e);
  }
  for (const e of ohne) {
    const g = gebiete[e.id];
    const x = (rechts === -Infinity ? 0 : rechts + WELT_LUECKE) - g.bereich.x0;
    lagen.set(e.id, { x: rund(x, LAGE_RASTER), y: rund(-g.bereich.y0, LAGE_RASTER), auto: true });
    rechts = g.bereich.x1 + rund(x, LAGE_RASTER);
  }
  return lagen;
}

/** Bereich eines Gebiets im Welt-Plan (Welt-Koordinaten). */
export function weltBereich(g, lage) {
  const b = g.bereich;
  return { x0: b.x0 + lage.x, y0: b.y0 + lage.y, x1: b.x1 + lage.x, y1: b.y1 + lage.y };
}

/** Passendes Rechteck um alle Gebiete im Welt-Plan (für „Alles zeigen“). */
export function weltAusdehnung(welt, gebiete) {
  const lagen = weltLagen(welt, gebiete);
  const rs = [...lagen].map(([id, l]) => weltBereich(gebiete[id], l));
  if (!rs.length) return { x0: -480, y0: -270, x1: 480, y1: 270 };
  return { x0: Math.min(...rs.map((r) => r.x0)), y0: Math.min(...rs.map((r) => r.y0)), x1: Math.max(...rs.map((r) => r.x1)), y1: Math.max(...rs.map((r) => r.y1)) };
}

/** Schreibt die automatisch berechneten Lagen fest in die Welt (damit andere Gebiete nicht springen, wenn eines bewegt wird). */
export function lagenFestschreiben(welt, gebiete) {
  const lagen = weltLagen(welt, gebiete);
  for (const e of welt.gebiete) {
    const l = lagen.get(e.id);
    if (l?.auto) e.lage = { x: l.x, y: l.y };
  }
}

/** Lage eines Gebiets setzen (rastet auf 100 E). Mit `gebiete` werden vorher alle automatischen Lagen festgeschrieben.
 *  Gibt true zurück, wenn sich etwas geändert hat. */
export function lageSetzen(welt, id, x, y, gebiete = null) {
  const e = welt.gebiete.find((g) => g.id === id);
  if (!e || !zahl(x) || !zahl(y)) return false;
  const nx = Math.max(-MAX_KOORD * 4, Math.min(MAX_KOORD * 4, rund(x, LAGE_RASTER)));
  const ny = Math.max(-MAX_KOORD * 4, Math.min(MAX_KOORD * 4, rund(y, LAGE_RASTER)));
  const vorher = JSON.stringify(welt);
  if (gebiete) lagenFestschreiben(welt, gebiete);
  if (e.lage && e.lage.x === nx && e.lage.y === ny) return JSON.stringify(welt) !== vorher;
  e.lage = { x: nx, y: ny };
  return true;
}

// ------------------------------------------------------------------ Übergänge

/** „gebiet/K1“ → { gebiet, knoten } (oder null). */
export function teileEnde(text) {
  const m = typeof text === 'string' ? /^([^/]+)\/([^/]+)$/.exec(text) : null;
  return m ? { gebiet: m[1], knoten: m[2] } : null;
}
export const endeText = (gebiet, knoten) => `${gebiet}/${knoten}`;

export const uebergaengeVon = (welt) => welt.uebergaenge ?? [];

/** Kleinste freie Übergangs-ID: `u1`, `u2` … */
export function neueUebergangId(welt) {
  const belegt = new Set(uebergaengeVon(welt).map((u) => u.id));
  for (let n = 1; ; n++) if (!belegt.has('u' + n)) return 'u' + n;
}

/**
 * Legt einen Übergang an. `von`/`nach` = { gebiet, knoten }. Gibt { fehler } oder { uebergang } zurück (ändert `welt` nur bei Erfolg).
 */
export function uebergangAnlegen(welt, gebiete, von, nach) {
  const fehler = (t) => ({ fehler: t });
  if (!von?.gebiet || !von?.knoten || !nach?.gebiet || !nach?.knoten) return fehler('Beide Enden brauchen ein Gebiet und einen Knoten.');
  if (von.gebiet === nach.gebiet) return fehler('Ein Übergang verbindet zwei verschiedene Gebiete (innerhalb eines Gebiets gibt es Gänge).');
  for (const e of [von, nach]) {
    const g = gebiete[e.gebiet];
    if (!g) return fehler(`Das Gebiet „${e.gebiet}“ gibt es nicht.`);
    if (!g.knoten.some((k) => k.id === e.knoten)) return fehler(`Den Knoten „${e.knoten}“ gibt es im Gebiet „${e.gebiet}“ nicht.`);
  }
  const a = endeText(von.gebiet, von.knoten);
  const b = endeText(nach.gebiet, nach.knoten);
  if (uebergaengeVon(welt).some((u) => (u.von === a && u.nach === b) || (u.von === b && u.nach === a))) return fehler('Diese beiden Knoten sind schon verbunden.');
  const u = { id: neueUebergangId(welt), von: a, nach: b };
  welt.uebergaenge = [...uebergaengeVon(welt), u];
  return { uebergang: u };
}

/** Entfernt einen Übergang. Gibt true zurück, wenn es ihn gab. */
export function uebergangLoeschen(welt, id) {
  const liste = uebergaengeVon(welt);
  if (!liste.some((u) => u.id === id)) return false;
  welt.uebergaenge = liste.filter((u) => u.id !== id);
  return true;
}

/** Übergänge, die an diesem Knoten enden. */
export const uebergaengeAn = (welt, gebietId, knotenId) => uebergaengeVon(welt).filter((u) => u.von === endeText(gebietId, knotenId) || u.nach === endeText(gebietId, knotenId));

/** Das andere Ende eines Übergangs, von (gebiet, knoten) aus gesehen: { gebiet, knoten }. */
export function andereSeite(u, gebietId, knotenId) {
  const hier = endeText(gebietId, knotenId);
  return teileEnde(u.von === hier ? u.nach : u.von);
}

/** Beim Löschen eines Knotens: seine Übergänge gehen mit (gibt true zurück, wenn welche entfernt wurden). */
export function uebergaengeEntfernenFuerKnoten(welt, gebietId, knotenId) {
  const hier = endeText(gebietId, knotenId);
  const alt = uebergaengeVon(welt);
  const neu = alt.filter((u) => u.von !== hier && u.nach !== hier);
  if (neu.length === alt.length) return false;
  welt.uebergaenge = neu;
  return true;
}

/** Endpunkte eines Übergangs im Welt-Plan: [{ x, y, gebiet, knoten }, …] (null, wenn ein Ende fehlt). */
export function uebergangPunkte(u, gebiete, lagen) {
  const enden = [teileEnde(u.von), teileEnde(u.nach)];
  const out = [];
  for (const e of enden) {
    const g = e && gebiete[e.gebiet];
    const k = g?.knoten.find((n) => n.id === e.knoten);
    const l = lagen.get(e?.gebiet);
    if (!k || !l) return null;
    out.push({ x: k.x + l.x, y: k.y + l.y, gebiet: e.gebiet, knoten: e.knoten });
  }
  return out;
}

// ------------------------------------------------------------------ Datei: prüfen, laden, formatieren

/** Prüft die Form von welt.json. Gibt verständliche Meldungen zurück (leer = in Ordnung). */
export function pruefeWeltFormat(w) {
  const fehler = [];
  const f = (t) => fehler.push(t);
  if (!w || typeof w !== 'object' || Array.isArray(w)) return ['welt.json enthält keine Welt (Objekt erwartet).'];
  if (w.format !== FORMAT) f(`Format ${JSON.stringify(w.format)} wird nicht unterstützt (erwartet: ${FORMAT}).`);
  if (!Array.isArray(w.gebiete) || !w.gebiete.length) return [...fehler, 'Die Liste „gebiete“ fehlt oder ist leer.'];
  const ids = new Set();
  w.gebiete.forEach((e, i) => {
    const wo = `gebiete[${i}]`;
    if (!e || typeof e !== 'object') return f(`${wo} ist kein Objekt.`);
    if (typeof e.id !== 'string' || !GEBIET_ID.test(e.id)) f(`${wo}: Die ID fehlt oder ist ungültig (nur Kleinbuchstaben, Ziffern, „-“ und „_“).`);
    else if (ids.has(e.id)) f(`${wo}: Gebiet „${e.id}“ kommt doppelt vor.`);
    else ids.add(e.id);
    if (typeof e.name !== 'string' || !e.name) f(`${wo}: „name“ fehlt.`);
    if (typeof e.datei !== 'string' || !e.datei) f(`${wo}: „datei“ fehlt.`);
    if (e.lage !== undefined && !(e.lage && zahl(e.lage.x) && zahl(e.lage.y))) f(`${wo}: „lage“ braucht x und y als Zahlen.`);
  });
  if (w.uebergaenge !== undefined && !Array.isArray(w.uebergaenge)) f('„uebergaenge“ muss eine Liste sein.');
  else {
    const uids = new Set();
    (w.uebergaenge ?? []).forEach((u, i) => {
      const wo = `uebergaenge[${i}]`;
      if (!u || typeof u !== 'object') return f(`${wo} ist kein Objekt.`);
      if (typeof u.id !== 'string' || !u.id) f(`${wo}: „id“ fehlt.`);
      else if (uids.has(u.id)) f(`${wo}: ID „${u.id}“ kommt doppelt vor.`);
      else uids.add(u.id);
      for (const k of ['von', 'nach']) if (!teileEnde(u[k])) f(`${wo} (${u.id}): „${k}“ muss die Form „gebiet/Knoten“ haben.`);
    });
  }
  return fehler;
}

/** Text → Welt. Wirft einen Error mit verständlicher Meldung. */
export function ladeWelt(text) {
  let w;
  try {
    w = JSON.parse(text);
  } catch (e) {
    throw new Error('welt.json ist kein gültiges JSON: ' + e.message);
  }
  const fehler = pruefeWeltFormat(w);
  if (fehler.length) throw new Error('welt.json passt nicht zum Format:\n- ' + fehler.join('\n- '));
  return w;
}

const einzeilig = (obj) => '{ ' + Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${v && typeof v === 'object' && !Array.isArray(v) ? einzeilig(v) : JSON.stringify(v)}`).join(', ') + ' }';
const ordne = (obj, reihenfolge) => {
  const out = {};
  for (const k of reihenfolge) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj).sort()) if (!(k in out)) out[k] = obj[k];
  return out;
};

/** Welt als Text: ein Gebiet und ein Übergang pro Zeile, feste Schlüsselreihenfolge. */
export function formatiereWelt(welt) {
  const gebiete = welt.gebiete.map((g) => '    ' + einzeilig(ordne(g, ['id', 'name', 'datei', 'lage'])));
  const bekannt = new Set(['format', 'gebiete', 'uebergaenge']);
  const andere = Object.keys(welt).filter((k) => !bekannt.has(k)); // weitere Schlüssel gehen nicht verloren
  const zeilen = [`  "format": ${JSON.stringify(welt.format)}`, ...andere.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(welt[k])}`), `  "gebiete": [\n${gebiete.join(',\n')}\n  ]`];
  const ue = welt.uebergaenge ?? [];
  if (ue.length) zeilen.push(`  "uebergaenge": [\n${ue.map((u) => '    ' + einzeilig(ordne(u, ['id', 'von', 'nach']))).join(',\n')}\n  ]`);
  return `{\n${zeilen.join(',\n')}\n}\n`;
}

// ------------------------------------------------------------------ Prüfregeln der Welt

/** Überlappen sich zwei achsenparallele Rechtecke (Berührung zählt nicht)? */
const rechteckeUeberlappen = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Regeln auf Weltebene (gleiche Form wie regeln.js, Meldungen: { regel, art, text, ort: { art: 'gebiet'|'uebergang', id } }).
 *  W1 MUSS  Übergänge verbinden zwei vorhandene Knoten verschiedener Gebiete; IDs eindeutig.
 *  W2 SOLL  Gebiete überlappen sich im Welt-Plan nicht.
 *  W3 SOLL  Alle Gebiete hängen über Übergänge zusammen (eine zusammenhängende Karte).
 *  W4 SOLL  Alles in einem Gebiet liegt innerhalb seines Bereichs.
 */
export function pruefeWelt(welt, gebiete) {
  const out = [];
  const melde = (regel, art, text, ort = null) => out.push({ regel, art, text, ort });
  const ids = new Set();
  for (const u of uebergaengeVon(welt)) {
    const ort = { art: 'uebergang', id: u.id };
    if (ids.has(u.id)) melde('W1', 'MUSS', `Übergang-ID „${u.id}“ kommt doppelt vor.`, ort);
    ids.add(u.id);
    const a = teileEnde(u.von);
    const b = teileEnde(u.nach);
    if (!a || !b) {
      melde('W1', 'MUSS', `Übergang ${u.id}: Die Enden müssen die Form „gebiet/Knoten“ haben.`, ort);
      continue;
    }
    let ok = true;
    for (const e of [a, b]) {
      if (!welt.gebiete.some((g) => g.id === e.gebiet)) {
        melde('W1', 'MUSS', `Übergang ${u.id}: Das Gebiet „${e.gebiet}“ gibt es nicht.`, ort);
        ok = false;
      } else if (!gebiete[e.gebiet]) {
        melde('W1', 'MUSS', `Übergang ${u.id}: Das Gebiet „${e.gebiet}“ ist nicht geladen.`, ort);
        ok = false;
      } else if (!gebiete[e.gebiet].knoten.some((k) => k.id === e.knoten)) {
        melde('W1', 'MUSS', `Übergang ${u.id}: Den Knoten „${e.knoten}“ gibt es im Gebiet „${e.gebiet}“ nicht.`, ort);
        ok = false;
      }
    }
    if (ok && a.gebiet === b.gebiet) melde('W1', 'MUSS', `Übergang ${u.id}: Beide Enden liegen im Gebiet „${a.gebiet}“ – ein Übergang verbindet zwei Gebiete.`, ort);
  }
  const lagen = weltLagen(welt, gebiete);
  const geladen = welt.gebiete.filter((e) => gebiete[e.id]);
  for (let i = 0; i < geladen.length; i++) {
    for (let j = i + 1; j < geladen.length; j++) {
      const a = geladen[i];
      const b = geladen[j];
      if (rechteckeUeberlappen(weltBereich(gebiete[a.id], lagen.get(a.id)), weltBereich(gebiete[b.id], lagen.get(b.id)))) {
        melde('W2', 'SOLL', `Die Bereiche von „${a.name}“ und „${b.name}“ überlappen sich im Welt-Plan.`, { art: 'gebiet', id: a.id });
      }
    }
  }
  for (const e of geladen) {
    const d = ausserhalb(gebiete[e.id]);
    if (d.length) melde('W4', 'SOLL', `Im Gebiet „${e.name}“ ${d.length === 1 ? `liegt ${d[0].art} ${d[0].id}` : `liegen ${d.length} Dinge (z. B. ${d[0].art} ${d[0].id})`} außerhalb des Bereichs („Bereich an Inhalt anpassen“).`, { art: 'gebiet', id: e.id });
  }
  if (geladen.length > 1) {
    const nachbarn = new Map(geladen.map((e) => [e.id, new Set()]));
    for (const u of uebergaengeVon(welt)) {
      const a = teileEnde(u.von);
      const b = teileEnde(u.nach);
      if (a && b && nachbarn.has(a.gebiet) && nachbarn.has(b.gebiet) && a.gebiet !== b.gebiet) {
        nachbarn.get(a.gebiet).add(b.gebiet);
        nachbarn.get(b.gebiet).add(a.gebiet);
      }
    }
    const gesehen = new Set([geladen[0].id]);
    const stapel = [geladen[0].id];
    while (stapel.length) for (const n of nachbarn.get(stapel.pop())) if (!gesehen.has(n)) (gesehen.add(n), stapel.push(n));
    for (const e of geladen) if (!gesehen.has(e.id)) melde('W3', 'SOLL', `Das Gebiet „${e.name}“ ist über keinen Übergang mit „${geladen[0].name}“ verbunden.`, { art: 'gebiet', id: e.id });
  }
  const rang = (m) => (m.art === 'MUSS' ? 0 : 1);
  out.sort((x, y) => rang(x) - rang(y));
  return { meldungen: out, muss: out.filter((m) => m.art === 'MUSS').length, soll: out.filter((m) => m.art === 'SOLL').length };
}
