// Prüfregeln des Editors (Brief Abschnitt 5). Jede Regel: { id, art: 'MUSS'|'SOLL', text, pruefe(g) → Meldungen }.
// Eine Meldung: { text, ort? } mit ort = { art: 'gang'|'knoten'|'objekt'|'formteil', id, x, y, s?, x2?, y2? } (Weltpunkt, bei
// Strecken zusätzlich Ende; `s` = Stelle im Gang in E). Neue Regel = ein Eintrag in REGELN; Zahlen stehen in konstanten.js.
// Reine Rechnung auf den Daten – kein DOM, läuft auch unter Node (Tests).
import { knotenMap, gangMasse, gangPunkt, bodenPolygone, punktInPolygon, rechteck } from './daten.js';
import { spielbarkeit } from './spielen.js';
import { DREHZONE, MIN_QUERWEG, PRUEF_SCHRITT, PRUEF_QUER, PRUEF_RAND, MIN_GANG_SOLL } from './konstanten.js';

const EPS = 1e-6;
const RAD = 180 / Math.PI;
const fmt0 = (n) => String(Math.round(n));
const gangName = (gang) => `Gang „${gang.name || gang.id}“`;

/** Hindernis-Polygone (Wand und Hindernis blockieren den Weg; Gegner nicht). */
const sperren = (g) => g.objekte.filter((o) => o.typ === 'wand' || o.typ === 'hindernis').map((o) => ({ o, poly: rechteck(o.x, o.y, o.laenge, o.breite, o.winkel) }));

/** Überlappen sich zwei konvexe Polygone (Trennachsensatz)? Berührung zählt nicht. */
export function ueberlappen(a, b) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y1 - y2;
      const ny = x2 - x1;
      const bereich = (p) => {
        let lo = Infinity;
        let hi = -Infinity;
        for (const [x, y] of p) {
          const d = x * nx + y * ny;
          lo = Math.min(lo, d);
          hi = Math.max(hi, d);
        }
        return [lo, hi];
      };
      const [a0, a1] = bereich(a);
      const [b0, b1] = bereich(b);
      const len = Math.hypot(nx, ny) || 1;
      if (a1 - b0 <= 0.01 * len || b1 - a0 <= 0.01 * len) return false;
    }
  }
  return true;
}

/** Zum Mittelpunkt hin um `d` E verkleinerte Ecken (für Randtoleranz). */
const einziehen = (poly, mx, my, d) => poly.map(([x, y]) => {
  const l = Math.hypot(x - mx, y - my) || 1;
  const f = Math.max(0, l - d) / l;
  return [mx + (x - mx) * f, my + (y - my) * f];
});

export const REGELN = [
  {
    id: 'M1',
    art: 'MUSS',
    text: 'Jeder Gang liegt im 45°-Raster (8 Richtungen).',
    pruefe(g) {
      const out = [];
      const km = knotenMap(g);
      for (const gang of g.gaenge) {
        const m = gangMasse(g, gang, km);
        if (m && m.laenge > EPS && m.richtung < 0) out.push({ text: `${gangName(gang)} liegt nicht im 45°-Raster.`, ort: { art: 'gang', id: gang.id, s: m.laenge / 2, ...gangPunkt(m, m.laenge / 2) } });
        if (m && m.laenge <= EPS) out.push({ text: `${gangName(gang)} hat die Länge 0.`, ort: { art: 'gang', id: gang.id, s: 0, ...gangPunkt(m, 0) } });
      }
      return out;
    },
  },
  {
    id: 'M2',
    art: 'MUSS',
    text: `Jeder Gang ist passierbar: an jeder Stelle mindestens ${MIN_QUERWEG} E freier Querweg (Formteile zählen als Boden).`,
    pruefe(g) {
      const out = [];
      const km = knotenMap(g);
      const boden = bodenPolygone(g);
      const bl = sperren(g).map((x) => x.poly);
      const frei = (x, y) => boden.some((p) => punktInPolygon(x, y, p)) && !bl.some((p) => punktInPolygon(x, y, p));
      for (const gang of g.gaenge) {
        const m = gangMasse(g, gang, km);
        if (!m || m.laenge <= EPS) continue;
        const nx = -m.uy;
        const ny = m.ux;
        const halb = gang.breite / 2;
        let strecke = null; // laufende Engstelle { s0, s1, min }
        const schliesse = () => {
          if (!strecke) return;
          const p0 = gangPunkt(m, strecke.s0);
          const p1 = gangPunkt(m, strecke.s1);
          out.push({
            text: `${gangName(gang)}: bei ${fmt0(strecke.s0)}–${fmt0(strecke.s1)} E nur ${fmt0(strecke.min)} E freier Querweg (mindestens ${MIN_QUERWEG}).`,
            ort: { art: 'gang', id: gang.id, s: (strecke.s0 + strecke.s1) / 2, x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2, x2: p1.x, y2: p1.y, x1: p0.x, y1: p0.y },
          });
          strecke = null;
        };
        const stellen = Math.max(1, Math.ceil(m.laenge / PRUEF_SCHRITT));
        for (let i = 0; i <= stellen; i++) {
          const s = Math.min(m.laenge - 1, Math.max(1, i * PRUEF_SCHRITT)); // genau auf der Gangkante zählt der Punkt nicht als Boden
          const p = gangPunkt(m, s);
          let best = 0;
          let lauf = 0;
          for (let t = -halb + PRUEF_QUER / 2; t < halb; t += PRUEF_QUER) {
            if (frei(p.x + nx * t, p.y + ny * t)) {
              lauf += PRUEF_QUER;
              best = Math.max(best, lauf);
            } else lauf = 0;
          }
          if (best < MIN_QUERWEG) {
            if (strecke) {
              strecke.s1 = s;
              strecke.min = Math.min(strecke.min, best);
            } else strecke = { s0: s, s1: s, min: best };
          } else schliesse();
        }
        schliesse();
      }
      return out;
    },
  },
  {
    id: 'M3',
    art: 'MUSS',
    text: `Drehzone frei: ${DREHZONE} E vor jeder Kreuzung im Gang kein Wand- oder Hindernisobjekt.`,
    pruefe(g) {
      const out = [];
      const km = knotenMap(g);
      const bl = sperren(g);
      for (const gang of g.gaenge) {
        const m = gangMasse(g, gang, km);
        if (!m || m.laenge <= EPS) continue;
        for (const [knotenId, sign] of [[gang.von, 1], [gang.nach, -1]]) {
          const k = km.get(knotenId);
          if (!k || k.typ !== 'kreuzung') continue;
          const zone = Math.min(DREHZONE, m.laenge);
          const mx = k.x + m.ux * sign * (zone / 2);
          const my = k.y + m.uy * sign * (zone / 2);
          const poly = rechteck(mx, my, zone, gang.breite, Math.atan2(m.uy, m.ux) * RAD);
          for (const { o, poly: op } of bl) {
            if (ueberlappen(poly, op)) out.push({ text: `${o.typ === 'wand' ? 'Wand' : 'Hindernis'} ${o.id} steht in der Drehzone (${DREHZONE} E) vor Kreuzung ${k.id} im ${gangName(gang)}.`, ort: { art: 'objekt', id: o.id, x: o.x, y: o.y } });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'M4',
    art: 'MUSS',
    text: 'Kein Objekt außerhalb des Bodens.',
    pruefe(g) {
      const out = [];
      const boden = bodenPolygone(g);
      const drin = (x, y) => boden.some((p) => punktInPolygon(x, y, p));
      for (const o of g.objekte) {
        const punkte = o.typ === 'gegner' ? [[o.x, o.y]] : [[o.x, o.y], ...einziehen(rechteck(o.x, o.y, o.laenge, o.breite, o.winkel), o.x, o.y, PRUEF_RAND)];
        if (punkte.some(([x, y]) => !drin(x, y))) out.push({ text: `${o.typ === 'gegner' ? `Gegner ${o.id}` : o.typ === 'wand' ? `Wand ${o.id}` : `Hindernis ${o.id}`} liegt (teilweise) außerhalb des Bodens.`, ort: { art: 'objekt', id: o.id, x: o.x, y: o.y } });
      }
      return out;
    },
  },
  {
    id: 'M5',
    art: 'MUSS',
    text: 'Jeder Knoten hat mindestens einen Gang; jedes Gebiet hat mindestens einen Speicherort.',
    pruefe(g) {
      const out = [];
      const benutzt = new Set(g.gaenge.flatMap((x) => [x.von, x.nach]));
      for (const k of g.knoten) if (!benutzt.has(k.id)) out.push({ text: `Knoten ${k.id} hat keinen Gang.`, ort: { art: 'knoten', id: k.id, x: k.x, y: k.y } });
      if (!g.knoten.some((k) => k.typ === 'speicher')) out.push({ text: 'Das Gebiet hat keinen Speicherort.' });
      return out;
    },
  },
  {
    id: 'M6',
    art: 'MUSS',
    text: 'IDs sind eindeutig; jeder Gang verweist auf vorhandene Knoten.',
    pruefe(g) {
      const out = [];
      const gesehen = new Set();
      for (const liste of [g.knoten, g.gaenge, g.formteile, g.objekte, g.notizen]) {
        for (const o of liste) {
          if (gesehen.has(o.id)) out.push({ text: `Die ID „${o.id}“ kommt mehrfach vor.` });
          gesehen.add(o.id);
        }
      }
      const km = knotenMap(g);
      for (const gang of g.gaenge) for (const k of [gang.von, gang.nach]) if (!km.has(k)) out.push({ text: `${gangName(gang)} verweist auf Knoten „${k}“, den es nicht gibt.` });
      return out;
    },
  },
  {
    id: 'M7',
    art: 'MUSS',
    text: 'Was der Fenster-Prototyp nicht spielen kann, wird als „noch nicht spielbar“ gemeldet.',
    pruefe(g) {
      return spielbarkeit(g).probleme.map((p) => ({ text: 'Noch nicht spielbar: ' + p }));
    },
  },
  {
    id: 'S1',
    art: 'SOLL',
    text: 'Gang nicht kürzer als 1 Bildschirm (480 E) – die Drehzonen überlappen sonst.',
    pruefe(g) {
      const out = [];
      const km = knotenMap(g);
      for (const gang of g.gaenge) {
        const m = gangMasse(g, gang, km);
        if (m && m.laenge > EPS && m.laenge < MIN_GANG_SOLL) out.push({ text: `${gangName(gang)} ist nur ${fmt0(m.laenge)} E lang (unter 1 Bildschirm = ${MIN_GANG_SOLL} E).`, ort: { art: 'gang', id: gang.id, s: m.laenge / 2, ...gangPunkt(m, m.laenge / 2) } });
      }
      return out;
    },
  },
  {
    id: 'S2',
    art: 'SOLL',
    text: 'Gegner sind Platzhalter (Hinweis, kein Fehler).',
    pruefe(g) {
      return g.objekte.filter((o) => o.typ === 'gegner').map((o) => ({ text: `Gegner ${o.id} (${o.art}) ist ein Platzhalter; sein Verhalten im Fenster ist ungeprüft.`, ort: { art: 'objekt', id: o.id, x: o.x, y: o.y } }));
    },
  },
];
