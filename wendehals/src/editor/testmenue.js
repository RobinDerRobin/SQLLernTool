// Testmenü (Stufe 7): im Build (`?testmenue`, Electron: WENDEHALS_TESTMENUE=1) jedes Gebiet, jeden Gang und jeden Knoten aus den
// Leveldateien direkt im Fenster-Prototyp starten. Bedienung nur mit Pfeilen/Stick, Enter/A und Esc/B – auch am Deck.
// `eintraege` ist reine Logik (läuft unter Node); `startTestmenue` baut die Oberfläche.
import { GEBIETE, WELT } from './startdaten.js';
import { gangMasse, bezeichnung, knotenMap } from './daten.js';
import { spielbarkeit, erzeugeSzene, DACKEL_BILD } from './spielen.js';
import { SpielModus } from './spielmodus.js';
import { Input } from '../core/input.js';
import { SCREEN_W } from './konstanten.js';

/**
 * Alle startbaren Einträge der Gebiete: je Gang ein Level (Start am Anfang), je Knoten ein Eintrag (Start am anliegenden Gang).
 * Nicht spielbare Einträge bleiben sichtbar, mit `grund` („noch nicht spielbar: …“) statt Start.
 */
export function eintraege(gebiete = GEBIETE, welt = WELT) {
  const out = [];
  for (const wg of welt.gebiete) {
    const g = gebiete[wg.id];
    if (!g) continue;
    const grundFuer = (gangId) => {
      const { probleme } = spielbarkeit(g, gangId); // wie „Spielen ab hier“: ein gerader Gang geht auch neben einer Diagonale
      return probleme.length ? 'noch nicht spielbar: ' + probleme.join(' · ') : null;
    };
    const km = knotenMap(g);
    const vorn = SCREEN_W / 2 - DACKEL_BILD.x; // Rahmenmitte, wenn der Dackel genau am Gang-Anfang steht
    for (const gang of g.gaenge) {
      const m = gangMasse(g, gang, km);
      out.push({ gebiet: g.id, art: 'gang', id: gang.id, titel: `${g.name || g.id} › Level ${gang.name || gang.id}`, gang: gang.id, s: vorn, bezeichnung: bezeichnung(g, { art: 'gang', id: gang.id }, 0), laenge: m?.laenge ?? 0, grund: grundFuer(gang.id) });
    }
    for (const k of g.knoten) {
      const gang = g.gaenge.find((x) => x.von === k.id || x.nach === k.id);
      if (!gang) continue;
      const m = gangMasse(g, gang, km);
      const s = gang.von === k.id ? vorn : (m?.laenge ?? 0);
      out.push({ gebiet: g.id, art: 'knoten', id: k.id, titel: `${g.name || g.id} › Knoten ${k.id} (${k.typ})`, gang: gang.id, s, bezeichnung: bezeichnung(g, { art: 'knoten', id: k.id }), laenge: null, grund: grundFuer(gang.id) });
    }
  }
  return out;
}

/** Szene für einen Eintrag (wirft „noch nicht spielbar: …“, wenn das Gebiet es nicht erlaubt). */
export function szeneFuer(eintrag, gebiete = GEBIETE) {
  return erzeugeSzene(gebiete[eintrag.gebiet], eintrag.gang, eintrag.s);
}

export function startTestmenue({ gebiete = GEBIETE, welt = WELT } = {}) {
  document.title = 'Wendehals – Testmenü';
  document.getElementById('game')?.remove();
  const liste = eintraege(gebiete, welt);
  const wurzel = document.createElement('div');
  wurzel.id = 'testmenue';
  wurzel.style.cssText = 'position:fixed;inset:0;background:#15131c;color:#e8e6f0;font:18px system-ui,sans-serif;overflow:auto;padding:16px 24px;box-sizing:border-box';
  const kopf = document.createElement('div');
  kopf.textContent = 'Testmenü – Pfeile/Stick wählen · Enter/A startet · Esc/Start im Spiel zurück';
  kopf.style.cssText = 'color:#a9a5bd;margin-bottom:12px;font-size:15px';
  const ul = document.createElement('ul');
  ul.style.cssText = 'list-style:none;margin:0;padding:0';
  const meldung = document.createElement('div');
  meldung.id = 'testmenue-meldung';
  meldung.style.cssText = 'position:fixed;left:24px;right:24px;bottom:12px;color:#ffb48a;font-size:15px';
  wurzel.append(kopf, ul, meldung);
  document.body.append(wurzel);
  const zeilen = liste.map((e) => {
    const li = document.createElement('li');
    li.textContent = e.titel + (e.grund ? '  – nicht spielbar' : '');
    li.style.cssText = 'padding:8px 12px;border-radius:6px;cursor:pointer;' + (e.grund ? 'color:#7d7a8e' : '');
    li.addEventListener('click', () => { st.wahl = liste.indexOf(e); zeigeWahl(); starte(); });
    ul.append(li);
    return li;
  });
  const st = { wahl: 0, spielen: null, raf: 0 };
  const input = new Input(window);
  function zeigeWahl() {
    zeilen.forEach((li, i) => (li.style.background = i === st.wahl ? '#3b3560' : 'transparent'));
    zeilen[st.wahl]?.scrollIntoView({ block: 'nearest' });
    meldung.textContent = liste[st.wahl]?.grund ?? liste[st.wahl]?.bezeichnung ?? '';
  }
  function starte() {
    const e = liste[st.wahl];
    if (!e || st.spielen?.aktiv) return;
    let szene;
    try {
      szene = szeneFuer(e, gebiete);
    } catch (err) {
      meldung.textContent = err.message;
      return;
    }
    st.spielen = new SpielModus(szene, document.body, () => zeigeWahl());
  }
  function schleife() {
    st.raf = requestAnimationFrame(schleife);
    if (st.spielen?.aktiv) return; // der Spielmodus hat seine eigene Eingabe (Input am Bus)
    const i = input.poll();
    if (i.down) st.wahl = Math.min(liste.length - 1, st.wahl + 1);
    if (i.up) st.wahl = Math.max(0, st.wahl - 1);
    if (i.down || i.up) zeigeWahl();
    if (i.confirm) starte();
  }
  zeigeWahl();
  st.raf = requestAnimationFrame(schleife);
  window.__testmenue = { liste, st, starte, zeigeWahl };
  return st;
}
