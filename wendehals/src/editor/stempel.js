// Stempel (Stufe 8): Stücke eines Gebiets (Knoten, Gänge, Teile, Notizen) als benannte Vorlage speichern und per Rechtsklick wieder
// einsetzen. Reine Daten, kein DOM (läuft auch unter Node). Eine Vorlage hat dieselbe Form wie die Zwischenablage aus mehrfach.js
// (`merkeDinge`): { knoten, gaenge, teile: [{ art, teil }], bezug: { x, y } }. Die Datei levels/stempel.json ist zugleich Material für die KI.
import { FORMAT, STEMPEL_MAX, MAX_KOORD, NOTIZ_MAX } from './konstanten.js';
import { OBJEKTTYPEN, GEGNER } from './katalog.js';

export const STEMPEL_ARTEN = ['formteil', 'objekt', 'notiz'];
const kopie = (o) => JSON.parse(JSON.stringify(o));
const zahl = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_KOORD * 4;

export const leereStempel = () => ({ format: FORMAT, stempel: [] });

/** Prüft die Stempeldatei; gibt eine Liste verständlicher Fehler zurück (leer = gültig). */
export function pruefeStempel(d) {
  const f = [];
  if (!d || typeof d !== 'object' || Array.isArray(d)) return ['Die Stempeldatei muss ein Objekt sein.'];
  if (d.format !== FORMAT) f.push(`Stempel: „format“ muss ${FORMAT} sein (ist ${JSON.stringify(d.format)}).`);
  if (!Array.isArray(d.stempel)) return [...f, 'Stempel: „stempel“ muss eine Liste sein.'];
  if (d.stempel.length > STEMPEL_MAX) f.push(`Stempel: höchstens ${STEMPEL_MAX} Stempel.`);
  const ids = new Set();
  for (const s of d.stempel) {
    const wo = `Stempel ${s?.id ?? '?'}`;
    if (!s || typeof s !== 'object') {
      f.push('Stempel: Eintrag ist kein Objekt.');
      continue;
    }
    if (typeof s.id !== 'string' || !s.id) f.push(`${wo}: „id“ fehlt.`);
    else if (ids.has(s.id)) f.push(`${wo}: ID doppelt vergeben.`);
    else ids.add(s.id);
    if (typeof s.name !== 'string' || !s.name.trim()) f.push(`${wo}: „name“ fehlt.`);
    if (!Array.isArray(s.knoten) || !Array.isArray(s.gaenge) || !Array.isArray(s.teile)) {
      f.push(`${wo}: „knoten“, „gaenge“ und „teile“ müssen Listen sein.`);
      continue;
    }
    if (!s.knoten.length && !s.teile.length) f.push(`${wo}: enthält nichts.`);
    if (!s.bezug || !zahl(s.bezug.x) || !zahl(s.bezug.y)) f.push(`${wo}: „bezug“ braucht x und y.`);
    const kids = new Set();
    for (const k of s.knoten) {
      if (!k || typeof k.id !== 'string' || !zahl(k.x) || !zahl(k.y)) f.push(`${wo}: ein Knoten ist unvollständig.`);
      else kids.add(k.id);
    }
    for (const g of s.gaenge) if (!g || !kids.has(g.von) || !kids.has(g.nach)) f.push(`${wo}: ein Gang verweist auf einen Knoten, der nicht im Stempel liegt.`);
    for (const t of s.teile) {
      if (!t || !STEMPEL_ARTEN.includes(t.art) || !t.teil || !zahl(t.teil.x) || !zahl(t.teil.y)) f.push(`${wo}: ein Teil ist unvollständig oder hat eine unbekannte Art.`);
      else if (t.art === 'notiz') {
        if (typeof t.teil.text !== 'string') f.push(`${wo}: eine Notiz hat keinen Text.`);
        else if (t.teil.text.length > NOTIZ_MAX) f.push(`${wo}: eine Notiz ist länger als ${NOTIZ_MAX} Zeichen.`);
      } else if (t.art === 'objekt' && !OBJEKTTYPEN[t.teil.typ]) f.push(`${wo}: unbekannter Objekttyp „${t.teil.typ}“.`);
      else if (t.art === 'objekt' && t.teil.typ === 'gegner' && !GEGNER.includes(t.teil.art)) f.push(`${wo}: unbekannte Gegnerart „${t.teil.art}“.`);
      else if ((t.art === 'formteil' || OBJEKTTYPEN[t.teil.typ]?.hatMasse) && !(zahl(t.teil.laenge) && zahl(t.teil.breite) && zahl(t.teil.winkel) && t.teil.laenge > 0 && t.teil.breite > 0)) f.push(`${wo}: einem Teil fehlen Länge, Breite oder Winkel.`);
    }
  }
  return f;
}

/** Text der Stempeldatei lesen. Ungültig → Error mit verständlicher Meldung (nichts wird übernommen). */
export function ladeStempel(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    throw new Error('Die Stempeldatei ist kein gültiges JSON: ' + e.message);
  }
  const f = pruefeStempel(d);
  if (f.length) throw new Error('Die Stempeldatei ist nicht gültig:\n- ' + f.join('\n- '));
  return d;
}

/** Datei-Text: 2 Leerzeichen, feste Schlüsselreihenfolge (lesbare Diffs). */
export function formatiereStempel(d) {
  const reihe = (s) => ({ id: s.id, name: s.name, bezug: s.bezug, knoten: s.knoten, gaenge: s.gaenge, teile: s.teile });
  return JSON.stringify({ format: d.format, stempel: d.stempel.map(reihe) }, null, 2) + '\n';
}

/** Kleinste freie ID `s1`, `s2` … */
export function neueStempelId(d) {
  const belegt = new Set(d.stempel.map((s) => s.id));
  for (let n = 1; ; n++) if (!belegt.has('s' + n)) return 's' + n;
}

/** Legt aus einer Zwischenablage (`merkeDinge`) einen Stempel an. Gibt { stempel } oder { fehler } zurück; `d` wird bei Erfolg ergänzt. */
export function stempelAnlegen(d, clip, name) {
  if (!clip || (!clip.knoten.length && !clip.teile.length)) return { fehler: 'Der Stempel wäre leer – erst etwas wählen.' };
  if (d.stempel.length >= STEMPEL_MAX) return { fehler: `Es gibt schon ${STEMPEL_MAX} Stempel.` };
  const id = neueStempelId(d);
  const s = { id, name: (name || '').trim() || `Stempel ${id.slice(1)}`, bezug: kopie(clip.bezug), knoten: kopie(clip.knoten), gaenge: kopie(clip.gaenge), teile: kopie(clip.teile) };
  d.stempel.push(s);
  return { stempel: s };
}

/** Löscht einen Stempel. false: gab es nicht. */
export function stempelLoeschen(d, id) {
  const i = d.stempel.findIndex((s) => s.id === id);
  if (i < 0) return false;
  d.stempel.splice(i, 1);
  return true;
}

/** Benennt einen Stempel um. Gibt null zurück oder eine Meldung. */
export function stempelUmbenennen(d, id, name) {
  const s = d.stempel.find((x) => x.id === id);
  if (!s) return `Stempel „${id}“ gibt es nicht.`;
  const t = String(name).trim();
  if (!t) return 'Der Name darf nicht leer sein.';
  s.name = t;
  return null;
}

/** Der Stempel als Zwischenablage für `fuegeDingeAn` (tiefe Kopie, damit das Einsetzen die Vorlage nie verändert). */
export const stempelClip = (s) => ({ knoten: kopie(s.knoten), gaenge: kopie(s.gaenge), teile: kopie(s.teile), bezug: kopie(s.bezug) });

/** Kurzbeschreibung für Listen: „2 Knoten, 1 Gang, 3 Teile“. */
export function stempelInhalt(s) {
  const teile = [];
  if (s.knoten.length) teile.push(`${s.knoten.length} Knoten`);
  if (s.gaenge.length) teile.push(`${s.gaenge.length} ${s.gaenge.length === 1 ? 'Gang' : 'Gänge'}`);
  const n = s.teile.filter((t) => t.art === 'notiz').length;
  if (s.teile.length - n) teile.push(`${s.teile.length - n} Teile`);
  if (n) teile.push(`${n} ${n === 1 ? 'Notiz' : 'Notizen'}`);
  return teile.join(', ');
}
