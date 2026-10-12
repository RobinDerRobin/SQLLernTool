// Einstieg des Level-Editors (`?editor`, Electron: WENDEHALS_EDITOR=1). Baut die Oberfläche, verbindet die Module.
// Stufe 1: Ansehen – Plan im Spielbild, Zoom/Verschieben/Drehen, Gang anklicken, Bildschirmrahmen mit Fahrt-Schieber.
// Stufe 2a: Bauen – Werkzeuge (Auswahl, Gang, Knoten), Eigenschaften ändern, Rückgängig/Wiederholen, Speichern/Laden.
// Stufe 2b: Formteile, Wände, Hindernisse – setzen, verschieben, drehen, kopieren, löschen, Eigenschaften.
import { HEADINGS, DIR_NAMES, E } from '../core/math.js';
import { Ansicht } from './ansicht.js';
import { zeichnePlan } from './zeichnen.js';
import { WELT, GEBIETE } from './startdaten.js';
import { kopie, bezeichnung, knotenMap, gangMasse, gangPolygon, knotenPolygon, punktInPolygon, ausdehnung, rahmenEcken, formatiere, formatiereWelt, ladeGebiet, pruefeFormat, Verlauf } from './daten.js';
import { KNOTENTYPEN } from './katalog.js';
import { KUERZEL, WINKEL_SCHRITT, SCREEN_W, SPEED, ZOOM_BILDSCHIRME, PFEIL_SCHRITT_PX, KLICK_TOLERANZ_PX, KNOTEN_RADIUS_PX, FANG_PX } from './konstanten.js';
import { gangTeilen, loesche, setze } from './befehle.js';
import { teilBei, teilFinden, teilDrehen, teilMerken, teilEinfuegen, loescheTeil, setzeTeil, istTeilArt, hatMasse, teilName, liste as teilListe } from './teile.js';
import { erzeugeSpeicher } from './speicher.js';
import { spielbarkeit, erzeugeSzene } from './spielen.js';
import { SpielModus } from './spielmodus.js';
import { WERKZEUGE } from './werkzeuge/index.js';

const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
const hat = (liste, code) => (Array.isArray(liste) ? liste.includes(code) : liste === code);

const CSS = `
html, body { margin: 0; height: 100%; background: #14121a; color: #e8e6ee; font: 13px/1.4 system-ui, sans-serif; overflow: hidden; }
#editor { display: grid; grid-template-columns: 1fr 290px; grid-template-rows: 44px 44px 22px 1fr 78px; height: 100%; }
#editor > * { min-width: 0; min-height: 0; }
.leiste { background: #221f2b; display: flex; flex-wrap: nowrap; overflow: hidden; align-items: center; min-height: 44px; padding-top: 3px; padding-bottom: 3px; box-sizing: border-box; gap: 8px; padding: 0 10px; border: 0 solid #38334a; }
#oben, #werk { grid-column: 1 / 3; border-bottom-width: 1px; }
#hinweiszeile { grid-column: 1 / 3; grid-row: 3; background: #221f2b; padding: 0 10px; line-height: 22px; border-bottom: 1px solid #38334a; overflow: hidden; }
#plan { grid-row: 4; } #rechts { grid-row: 4; grid-column: 2; }
#unten { grid-row: 5; grid-column: 1 / 3; border-top-width: 1px; gap: 12px; flex-wrap: wrap; overflow: auto; }
#plan { position: relative; overflow: hidden; background: #1c1822; }
#plan canvas { display: block; width: 100%; height: 100%; cursor: grab; }
#rechts { background: #221f2b; border-left: 1px solid #38334a; padding: 10px 12px; overflow: auto; }
#rechts h2 { font-size: 14px; margin: 0 0 8px; }
#rechts dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; margin: 0; }
#rechts dt { color: #a49fb8; } #rechts dd { margin: 0; }
button, select { white-space: nowrap; flex: none; background: #38334a; color: #e8e6ee; border: 1px solid #4b4560; border-radius: 4px; padding: 4px 7px; font: inherit; cursor: pointer; }
button:hover, select:hover { background: #4a4462; }
button.an { background: #3b6b8c; }
button:disabled { opacity: .45; cursor: default; }
.titel { white-space: nowrap; font-weight: 600; margin-right: 8px; }
.grau { color: #a49fb8; }
#anzeige { margin-left: auto; white-space: nowrap; flex: none; }
#fahrt { flex: 1; min-width: 120px; }
#melden { color: #b8e8c0; white-space: pre-line; max-height: 70px; overflow: auto; }
#melden.fehler { color: #ff9a8a; }
#werkhinweis { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
#stand.offen { color: #ffd24a; }
input[type=text], input[type=number], #rechts select { width: 100%; box-sizing: border-box; background: #14121a; color: #e8e6ee; border: 1px solid #4b4560; border-radius: 4px; padding: 3px 6px; font: inherit; }
#rechts .knoepfe { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
`;

function el(tag, attrs = {}, kinder = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of kinder) e.append(c);
  return e;
}

export function startEditor() {
  document.title = 'Wendehals – Editor';
  document.head.append(el('style', { text: CSS }));
  const altesCanvas = document.getElementById('game');
  if (altesCanvas) altesCanvas.remove();

  const state = {
    welt: WELT,
    gebiete: Object.fromEntries(Object.entries(GEBIETE).map(([id, g]) => [id, kopie(g)])),
    gebietId: WELT.gebiete[0].id,
    auswahl: null, // { art: 'gang'|'knoten', id }
    fahrt: null, // { gang, s, laeuft }
    zeit: 0,
    meldung: '',
    beschriftung: true,
    echtzeit: true, // false: Zeit und Fahrt laufen nur über tick() – für deterministische Tests
    werkzeug: WERKZEUGE[0].id,
    knotenTyp: 'kreuzung',
    spielen: null, // laufender SpielModus (Stufe 3) oder null
    bezeichnung: '', // zuletzt kopierte Bezeichnung
    zwischen: null, // gemerktes Teil für Einfügen (Strg+C): { art, teil }
    zeiger: null, // letzte Mausstelle im Plan (Welt), Zielstelle für Einfügen
    verlauf: {}, // Gebiets-ID → Verlauf (Rückgängig/Wiederholen)
    gespeichert: Object.fromEntries(Object.entries(GEBIETE).map(([id, g]) => [id, formatiere(g)])), // zuletzt gespeicherter/geladener Text je Gebiet
    weltGeaendert: false, // welt.json muss mitgeschrieben werden (neues Gebiet geöffnet)
    neueGebiete: new Set(), // geöffnete Gebiete, deren Datei noch nicht gespeichert ist (kommen erst danach in welt.json)
    speicher: erzeugeSpeicher(),
  };
  const ansicht = new Ansicht();
  const perf = { zeichnenMs: [] };
  let dirty = true;
  const gebiet = () => state.gebiete[state.gebietId];
  const werkzeug = () => WERKZEUGE.find((w) => w.id === state.werkzeug);

  // ---------------------------------------------------------------- Oberfläche
  const canvas = el('canvas');
  const plan = el('div', { id: 'plan' }, [canvas]);
  const wahl = el('select', { id: 'gebiet', title: 'Gebiet' }, WELT.gebiete.map((g) => el('option', { value: g.id, text: g.name })));
  wahl.addEventListener('change', () => {
    wechsle(wahl.value);
    wahl.blur(); // Kürzel sollen sofort wieder gelten
  });
  const knopf = (text, titel, fn, id) => el('button', { text, title: titel, onclick: fn, ...(id ? { id } : {}) });
  const anzeige = el('span', { class: 'grau', id: 'anzeige' });
  const oben = el('div', { id: 'oben', class: 'leiste' }, [
    el('span', { class: 'titel', text: 'Editor' }),
    wahl,
    knopf('Links drehen', 'Ansicht 45° links drehen (Q)', () => drehen(-1), 'b-links'),
    knopf('Rechts drehen', 'Ansicht 45° rechts drehen (E)', () => drehen(1), 'b-rechts'),
    knopf('Norden oben', 'Norden nach oben (0)', () => norden(), 'b-norden'),
    knopf('Wie im Spiel', 'In Flugrichtung des gewählten Gangs drehen (F)', () => wieImSpiel(), 'b-spiel'),
    knopf('Zoom −', 'Herauszoomen (−)', () => zoom(1), 'b-minus'),
    knopf('Zoom +', 'Hineinzoomen (+)', () => zoom(-1), 'b-plus'),
    knopf('Alles zeigen', 'Ganzes Gebiet einpassen', () => alles(), 'b-alles'),
    knopf('Beschriftung', 'Knoten, Namen und Maßstab ein-/ausblenden (L)', () => beschriften(), 'b-beschriftung'),
    anzeige,
  ]);
  const knopfW = (w) => el('button', { text: `${w.name} (${KUERZEL.werkzeug[w.id].replace('Key', '')})`, title: w.hinweis, id: 't-' + w.id, onclick: () => setzeWerkzeug(w.id) });
  const typWahl = el('select', { id: 'knotentyp', title: 'Typ des Knotens, den das Knoten-Werkzeug setzt' }, Object.entries(KNOTENTYPEN).map(([id, t]) => el('option', { value: id, text: t.name })));
  typWahl.value = state.knotenTyp;
  typWahl.addEventListener('change', () => {
    state.knotenTyp = typWahl.value;
    typWahl.blur();
    dirty = true;
  });
  const undoKnopf = knopf('Rückgängig', 'Letzte Änderung zurücknehmen (Strg+Z)', () => rueckgaengig(), 'b-undo');
  const redoKnopf = knopf('Wiederholen', 'Zurückgenommene Änderung wiederholen (Strg+Y)', () => wiederholen(), 'b-redo');
  const loeschKnopf = knopf('Löschen', 'Gewählten Gang, Knoten oder gewähltes Teil löschen (Entf)', () => loescheAuswahl(), 'b-loeschen');
  const werkHinweis = el('span', { class: 'grau', id: 'werkhinweis' });
  const hinweisZeile = el('div', { id: 'hinweiszeile' }, [werkHinweis]);
  const stand = el('span', { id: 'stand', class: 'grau' });
  const werk = el('div', { id: 'werk', class: 'leiste' }, [
    ...WERKZEUGE.map(knopfW),
    typWahl,
    undoKnopf,
    redoKnopf,
    loeschKnopf,
    knopf('Speichern', 'Gebiet speichern (Strg+S)', () => speichere(), 'b-speichern'),
    knopf('Öffnen …', 'Leveldatei öffnen (Strg+O)', () => oeffne(), 'b-oeffnen'),
    stand,
  ]);
  const rechts = el('div', { id: 'rechts' });
  const play = knopf('Fahrt', 'Rahmen mit Flugtempo durchs Level fahren lassen (Leertaste)', () => fahrtUmschalten(), 'b-fahrt');
  const schieber = el('input', { id: 'fahrt', type: 'range', min: '0', max: '1', step: '1', value: '0', title: 'Fahrt-Schieber: Stelle im Gang' });
  schieber.addEventListener('input', () => setzeFahrt(Number(schieber.value)));
  const fahrtText = el('span', { id: 'fahrt-text' });
  const melden = el('span', { id: 'melden' });
  melden.addEventListener('click', () => melde(''));
  const spielKnopf = knopf('▶ Spielen ab hier', 'Fenster-Prototyp an der Rahmenstelle des gewählten Gangs starten; Esc führt zurück (P)', () => spielenAb(), 'b-spielen');
  const bezKnopf = knopf('Bezeichnung kopieren', 'Bezeichnung des gewählten Gangs (mit Stelle) oder Knotens für Claude Code kopieren (N)', () => kopiereBezeichnung(), 'b-bezeichnung');
  const bezFeld = el('input', { id: 'bezeichnung', type: 'text', readonly: 'readonly', title: 'Bezeichnung zum Markieren und Kopieren', size: '34' });
  bezFeld.style.display = 'none';
  const unten = el('div', { id: 'unten', class: 'leiste' }, [play, schieber, fahrtText, spielKnopf, bezKnopf, bezFeld, melden]);
  const wurzel = el('div', { id: 'editor' }, [oben, werk, hinweisZeile, plan, rechts, unten]);
  document.body.append(wurzel);

  const ctx = canvas.getContext('2d', { alpha: false });
  function groesse() {
    const dpr = window.devicePixelRatio || 1;
    const w = plan.clientWidth;
    const h = plan.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ansicht.w = w;
    ansicht.h = h;
    dirty = true;
  }
  new ResizeObserver(groesse).observe(plan);

  // ---------------------------------------------------------------- Aktionen
  function ganzMasse() {
    const g = gebiet();
    const gang = state.fahrt && g.gaenge.find((x) => x.id === state.fahrt.gang);
    return gang ? gangMasse(g, gang) : null;
  }
  function wechsle(id) {
    if (!state.gebiete[id]) return;
    state.gebietId = id;
    wahl.value = id;
    state.auswahl = null;
    state.fahrt = null;
    state.zeiger = null;
    werkzeug().abbruch?.(kontext);
    const g = gebiet();
    if (g.gaenge.length) waehle({ art: 'gang', id: g.gaenge[0].id });
    alles();
    refresh();
  }
  function waehle(auswahl) {
    state.auswahl = auswahl;
    if (!auswahl) state.fahrt = null; // nichts gewählt: kein Rahmen, keine Fahrt
    if (auswahl && auswahl.art === 'knoten') state.fahrt = null; // der Rahmen gehört zu Gängen
    if (auswahl && auswahl.art === 'gang') {
      if (!state.fahrt || state.fahrt.gang !== auswahl.id) state.fahrt = { gang: auswahl.id, s: 0, laeuft: false };
    }
    refresh();
  }
  function setzeFahrt(s) {
    const m = ganzMasse();
    if (!m) return;
    state.fahrt.s = Math.max(0, Math.min(m.laenge, s));
    refresh();
  }
  function fahrtUmschalten() {
    const m = ganzMasse();
    if (!m) return;
    if (!state.fahrt.laeuft && state.fahrt.s >= m.laenge) state.fahrt.s = 0;
    state.fahrt.laeuft = !state.fahrt.laeuft;
    refresh();
  }
  /** Zeit voranschreiten lassen (Sekunden). Wird von der Schleife und von Tests aufgerufen. */
  function tick(dt) {
    state.zeit += dt;
    const m = ganzMasse();
    if (m && state.fahrt.laeuft) {
      state.fahrt.s = Math.min(m.laenge, state.fahrt.s + SPEED * dt);
      if (state.fahrt.s >= m.laenge) state.fahrt.laeuft = false;
      dirty = true;
      refreshFahrt();
    }
  }
  const drehen = (k) => {
    ansicht.drehen(k);
    refresh();
  };
  const norden = () => {
    ansicht.norden();
    refresh();
  };
  function wieImSpiel() {
    const m = ganzMasse();
    if (m && m.richtung >= 0) ansicht.wieImSpiel(m.richtung);
    refresh();
  }
  const zoom = (k, px, py) => {
    ansicht.zoomen(k, px, py);
    refresh();
  };
  function beschriften() {
    state.beschriftung = !state.beschriftung;
    refresh();
  }
  function alles() {
    ansicht.einpassen(ausdehnung(gebiet()));
    refresh();
  }

  /** Was liegt unter dem Bildschirmpunkt? Knoten vor Gang. */
  function treffer(px, py) {
    const g = gebiet();
    for (const k of g.knoten) {
      const [kx, ky] = ansicht.weltZuBild(k.x, k.y);
      if (Math.hypot(px - kx, py - ky) <= KNOTEN_RADIUS_PX + 3) return { art: 'knoten', id: k.id };
    }
    const [wx, wy] = ansicht.bildZuWelt(px, py);
    const teil = teilBei(g, wx, wy, 3 / ansicht.masstab);
    if (teil) return teil;
    const km = knotenMap(g);
    for (const k of g.knoten) {
      const poly = knotenPolygon(k);
      if (poly && punktInPolygon(wx, wy, poly)) return { art: 'knoten', id: k.id };
    }
    for (const gang of g.gaenge) {
      const p = gangPolygon(g, gang, km);
      if (p && punktInPolygon(wx, wy, p)) return { art: 'gang', id: gang.id };
    }
    return null;
  }


  // ---------------------------------------------------------------- Spielen ab hier, Bezeichnung (Stufe 3)
  /** Fenster-Prototyp an der Rahmenstelle des gewählten Gangs starten. Was er nicht spielen kann, wird vorher gemeldet. */
  function spielenAb() {
    if (state.spielen?.aktiv) return;
    const au = state.auswahl;
    if (!au || au.art !== 'gang' || !state.fahrt) return melde('Zum Spielen erst einen Gang anklicken und den Rahmen an die Stelle fahren.', 'fehler');
    const g = gebiet();
    const { probleme, hinweise } = spielbarkeit(g);
    if (probleme.length) return melde('Noch nicht spielbar: ' + probleme.join(' · '), 'fehler');
    let szene;
    try {
      szene = erzeugeSzene(g, state.fahrt.gang, state.fahrt.s);
    } catch (e) {
      return melde(e.message, 'fehler');
    }
    state.fahrt.laeuft = false;
    werkzeug().abbruch?.(kontext);
    zug = null;
    state.spielen = new SpielModus(szene, document.body, () => {
      melde(hinweise.length ? 'Zurück im Editor. ' + hinweise.join(' ') : 'Zurück im Editor.');
      refresh();
    }, { echtzeit: () => state.echtzeit });
    if (hinweise.length) melde(hinweise.join(' '));
  }
  /** Text für „Bezeichnung kopieren“ (Gang: mit Stelle des Rahmens, Knoten: ohne), sonst null. */
  function bezeichnungText() {
    const au = state.auswahl;
    if (au?.art === 'gang') return bezeichnung(gebiet(), { art: 'gang', id: au.id }, state.fahrt?.s ?? null);
    if (au?.art === 'knoten') return bezeichnung(gebiet(), { art: 'knoten', id: au.id });
    return null;
  }
  async function kopiereBezeichnung() {
    const text = bezeichnungText();
    if (!text) return melde('Zum Kopieren erst einen Gang oder Knoten anklicken.', 'fehler');
    bezFeld.value = text;
    bezFeld.style.display = '';
    bezFeld.select(); // Rückfall: markierter Text, falls die Zwischenablage gesperrt ist
    let kopiert = false;
    try {
      await navigator.clipboard.writeText(text);
      kopiert = true;
    } catch {
      /* Zwischenablage gesperrt (z. B. Dateiseite ohne Berechtigung): der markierte Text im Feld genügt zum Kopieren mit Strg+C */
    }
    state.bezeichnung = text;
    melde(kopiert ? `Kopiert: ${text}` : `Nicht in die Zwischenablage gekommen – Text ist markiert, mit Strg+C kopieren: ${text}`);
  }

  // ---------------------------------------------------------------- Bearbeiten (Stufe 2a)
  function melde(text, art = 'info') {
    state.meldung = text;
    melden.textContent = text;
    melden.className = art === 'fehler' ? 'fehler' : '';
    melden.title = text ? 'Klick blendet die Meldung aus' : '';
  }
  function hinweis(t) {
    werkHinweis.textContent = t || werkzeug().hinweis;
  }
  const verlaufVon = (id) => (state.verlauf[id] ??= new Verlauf());
  const ungespeichert = (id = state.gebietId) => state.gebiete[id] && formatiere(state.gebiete[id]) !== state.gespeichert[id];

  /** Nach Änderung, Rückgängig oder Laden: Auswahl und Fahrt gibt es vielleicht nicht mehr. */
  function bereinige() {
    const g = gebiet();
    const au = state.auswahl;
    const da = au && (au.art === 'gang' ? g.gaenge : au.art === 'knoten' ? g.knoten : istTeilArt(au.art) ? teilListe(g, au.art) : []).some((o) => o.id === au.id);
    if (au && !da) {
      state.auswahl = null;
      state.fahrt = null;
    }
    if (state.fahrt) {
      const m = ganzMasse();
      if (!m) state.fahrt = null;
      else state.fahrt.s = Math.min(state.fahrt.s, m.laenge);
    }
  }

  /**
   * Jede Änderung an den Daten läuft hier durch: Zustand vorher merken (Rückgängig), `fn(gebiet)` ausführen, bei Fehler alles
   * zurücksetzen. Gibt zurück, was `fn` zurückgibt. Ändert `fn` nichts, entsteht kein Verlaufseintrag.
   */
  function aendere(label, fn) {
    const g = gebiet();
    const vorher = JSON.stringify(g);
    let erg = null;
    try {
      erg = fn(g);
    } catch (e) {
      state.gebiete[g.id] = JSON.parse(vorher);
      melde(`„${label}“ ging schief, nichts wurde geändert: ${e.message}`, 'fehler');
      refresh();
      return null;
    }
    if (JSON.stringify(g) === vorher) return erg ?? null;
    verlaufVon(g.id).merke(vorher);
    state.letzteAktion = label;
    melde('');
    bereinige();
    refresh();
    return erg ?? null;
  }
  function nachVerlauf(text) {
    state.gebiete[state.gebietId] = JSON.parse(text);
    bereinige();
    melde('');
    refresh();
  }
  function rueckgaengig() {
    const t = verlaufVon(state.gebietId).rueckgaengig(JSON.stringify(gebiet()));
    if (t != null) nachVerlauf(t);
  }
  function wiederholen() {
    const t = verlaufVon(state.gebietId).wiederholen(JSON.stringify(gebiet()));
    if (t != null) nachVerlauf(t);
  }
  /** Eigenschaft im rechten Feld ändern; Fehlermeldung statt Änderung bei unzulässigen Werten. */
  function setzeFeld(art, id, feld, wert) {
    let fehler = null;
    aendere('Eigenschaft ändern', (g) => {
      fehler = istTeilArt(art) ? setzeTeil(g, art, id, feld, wert) : setze(g, art, id, feld, wert);
    });
    if (fehler) melde(fehler, 'fehler');
    refresh();
  }
  function loescheAuswahl() {
    const au = state.auswahl;
    if (!au || (au.art !== 'gang' && au.art !== 'knoten' && !istTeilArt(au.art))) return;
    aendere('Löschen', (g) => (istTeilArt(au.art) ? loescheTeil(g, au.art, au.id) : loesche(g, au.art, au.id)));
  }
  /** Gewähltes Teil (Formteil, Wand, Hindernis) oder null. */
  const gewaehltesTeil = () => {
    const au = state.auswahl;
    return au && istTeilArt(au.art) ? teilFinden(gebiet(), au.art, au.id) ?? null : null;
  };
  function dreheTeil(k) {
    const au = state.auswahl;
    const o = gewaehltesTeil();
    if (!o) return;
    if (!hatMasse(au.art, o)) return melde(`${teilName(au.art, o)} hat keinen Winkel.`, 'fehler');
    aendere(`${teilName(au.art, o)} drehen`, (g) => teilDrehen(g, au.art, au.id, k));
  }
  function kopiere() {
    const au = state.auswahl;
    if (!gewaehltesTeil()) return melde('Zum Kopieren erst ein Formteil, eine Wand oder ein Hindernis wählen.', 'fehler');
    state.zwischen = teilMerken(gebiet(), au.art, au.id);
    melde(`${teilName(au.art, state.zwischen.teil)} kopiert. Strg+V fügt es an der Mausstelle ein.`);
    refresh();
  }
  function fuegeEin() {
    if (!state.zwischen) return melde('Nichts kopiert – erst ein Teil wählen und Strg+C drücken.', 'fehler');
    const z = state.zeiger ?? { x: ansicht.cx, y: ansicht.cy }; // ohne Mausstelle: Mitte der Ansicht
    const neu = aendere('Einfügen', (g) => teilEinfuegen(g, state.zwischen, z.x, z.y));
    if (neu) waehle(neu);
  }
  function dupliziere() {
    const au = state.auswahl;
    if (!gewaehltesTeil()) return melde('Zum Duplizieren erst ein Formteil, eine Wand oder ein Hindernis wählen.', 'fehler');
    const gemerkt = teilMerken(gebiet(), au.art, au.id);
    const neu = aendere('Duplizieren', (g) => teilEinfuegen(g, gemerkt));
    if (neu) waehle(neu);
  }
  function teileGang() {
    const au = state.auswahl;
    if (au?.art !== 'gang' || !state.fahrt) return;
    const neu = aendere('Gang teilen', (g) => gangTeilen(g, au.id, state.fahrt.s));
    if (neu) waehle({ art: 'knoten', id: neu.id });
  }
  function setzeWerkzeug(id) {
    if (!WERKZEUGE.some((w) => w.id === id)) return;
    werkzeug().abbruch?.(kontext);
    state.werkzeug = id;
    canvas.style.cursor = id === 'auswahl' ? 'grab' : 'crosshair';
    hinweis('');
    refresh();
  }

  async function speichere() {
    const g = gebiet();
    const fehler = pruefeFormat(g);
    if (fehler.length) return melde('Nicht gespeichert – das Gebiet ist nicht gültig:\n- ' + fehler.join('\n- '), 'fehler');
    const text = formatiere(g);
    try {
      const r = await state.speicher.sichere(`gebiete/${g.id}.json`, text);
      if (!r) return melde('Speichern abgebrochen.');
      state.gespeichert[g.id] = text;
      state.neueGebiete.delete(g.id);
      let wo = r.wo;
      if (state.weltGeaendert) {
        // nur Gebiete eintragen, deren Datei es gibt – sonst findet der nächste Start eine Datei nicht
        const weltText = formatiereWelt({ ...state.welt, gebiete: state.welt.gebiete.filter((e) => !state.neueGebiete.has(e.id)) });
        const wr = await state.speicher.sichere('welt.json', weltText);
        if (wr) {
          state.weltGeaendert = state.neueGebiete.size > 0;
          wo += ` und ${wr.wo}`;
        }
      }
      melde(`Gespeichert: ${wo}`);
    } catch (e) {
      melde('Nicht gespeichert: ' + e.message, 'fehler');
    }
    refresh();
  }
  /** Text einer Leveldatei als Gebiet übernehmen. Ungültig → Meldung, der bisherige Stand bleibt (nichts geht verloren). */
  function oeffneText(text, name = 'Datei') {
    let g;
    try {
      g = ladeGebiet(text);
    } catch (e) {
      melde(`„${name}“ wurde nicht geöffnet, der bisherige Stand bleibt unverändert.\n${e.message}`, 'fehler');
      return false;
    }
    if (state.gebiete[g.id]) verlaufVon(g.id).merke(JSON.stringify(state.gebiete[g.id])); // lässt sich mit Rückgängig zurücknehmen
    else {
      state.welt = { ...state.welt, gebiete: [...state.welt.gebiete, { id: g.id, name: g.name, datei: `gebiete/${g.id}.json` }] };
      state.weltGeaendert = true;
      state.neueGebiete.add(g.id);
      wahl.append(el('option', { value: g.id, text: g.name }));
    }
    state.gebiete[g.id] = g;
    wechsle(g.id);
    melde(`„${name}“ geöffnet.`);
    return true;
  }
  async function oeffne() {
    try {
      const r = await state.speicher.lade();
      if (r) oeffneText(r.text, r.name);
    } catch (e) {
      melde(e.message, 'fehler');
    }
  }
  /** Alle Leveldateien frisch von der Platte übernehmen (Electron-Start): { welt: Text, gebiete: { id: Text } }. */
  function uebernehmeAlle(alle) {
    const probleme = [];
    const welt = JSON.parse(alle.welt);
    const neu = {};
    for (const eintrag of welt.gebiete) {
      try {
        neu[eintrag.id] = ladeGebiet(alle.gebiete[eintrag.id]);
      } catch (e) {
        probleme.push(`${eintrag.id}: ${e.message}`);
      }
    }
    if (!Object.keys(neu).length) throw new Error('keine gültige Gebietsdatei gefunden\n' + probleme.join('\n'));
    state.welt = welt; // ungeladene Einträge bleiben in welt.json erhalten
    state.neueGebiete = new Set();
    state.gebiete = neu;
    state.gespeichert = Object.fromEntries(Object.entries(neu).map(([id, g]) => [id, formatiere(g)]));
    state.verlauf = {};
    const geladen = welt.gebiete.filter((e) => neu[e.id]);
    wahl.replaceChildren(...geladen.map((e) => el('option', { value: e.id, text: e.name })));
    wechsle(geladen[0].id);
    if (probleme.length) melde('Einige Dateien wurden übersprungen:\n' + probleme.join('\n'), 'fehler');
  }

  const kontext = {
    state,
    ansicht,
    gebiet,
    treffer,
    waehle: (a) => waehle(a),
    aendere,
    hinweis,
    tolE: () => FANG_PX / ansicht.masstab,
    zeichnen: () => {
      dirty = true;
    },
  };

  // ---------------------------------------------------------------- Anzeigen
  function zeile(dl, name, wert) {
    dl.append(el('dt', { text: name }), el('dd', { text: String(wert) }));
  }
  /** Eingabefeld in der Eigenschaftenliste; `bei(wert)` wird bei Änderung (Enter/Verlassen) aufgerufen. */
  function feld(dl, name, id, wert, bei, art = 'number', extra = {}) {
    const i = el('input', { type: art === 'number' ? 'number' : 'text', id, value: String(wert), ...extra });
    i.addEventListener('change', () => bei(i.value));
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') i.blur();
      if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); // Kürzel (Q, E, F …) gelten nicht beim Tippen; Strg+S/Z gehen durch
    });
    dl.append(el('dt', { text: name }), el('dd', {}, [i]));
  }
  function eigenschaften() {
    rechts.replaceChildren();
    const g = gebiet();
    const au = state.auswahl;
    const dl = el('dl');
    const knoepfe = el('div', { class: 'knoepfe' });
    if (au && au.art === 'gang') {
      const gang = g.gaenge.find((x) => x.id === au.id);
      const m = gang && gangMasse(g, gang);
      if (!m) return rechts.append(el('p', { text: 'Gang ohne gültige Knoten.' }));
      rechts.append(el('h2', { text: `Gang „${gang.name || gang.id}“` }), dl);
      zeile(dl, 'ID', gang.id);
      feld(dl, 'Name', 'f-name', gang.name ?? '', (v) => setzeFeld('gang', gang.id, 'name', v), 'text');
      zeile(dl, 'Von → nach', `${gang.von} → ${gang.nach}`);
      zeile(dl, 'Länge', `${fmt(m.laenge, 0)} E`);
      zeile(dl, 'Bildschirme', fmt(m.bildschirme));
      zeile(dl, 'Flugzeit', `${fmt(m.sekunden)} s`);
      feld(dl, 'Breite (E)', 'f-breite', gang.breite, (v) => setzeFeld('gang', gang.id, 'breite', v), 'number', { step: 20 });
      zeile(dl, 'Richtung', m.richtung >= 0 ? `${m.richtungName} (${m.code})` : 'nicht im 45°-Raster');
      knoepfe.append(knopf('Hier teilen', 'Gang an der Stelle des Bildschirmrahmens teilen (neue Kreuzung)', () => teileGang(), 'b-teilen'));
      knoepfe.append(knopf('Löschen', 'Gang löschen (Entf)', () => loescheAuswahl(), 'b-loeschen2'));
    } else if (au && au.art === 'knoten') {
      const k = knotenMap(g).get(au.id);
      rechts.append(el('h2', { text: `Knoten ${k.id}` }), dl);
      const tw = el('select', { id: 'f-typ' }, Object.entries(KNOTENTYPEN).map(([id, t]) => el('option', { value: id, text: t.name })));
      tw.value = k.typ;
      tw.addEventListener('change', () => setzeFeld('knoten', k.id, 'typ', tw.value));
      dl.append(el('dt', { text: 'Typ' }), el('dd', {}, [tw]));
      feld(dl, 'x (E)', 'f-x', k.x, (v) => setzeFeld('knoten', k.id, 'x', v), 'number', { step: 100 });
      feld(dl, 'y (E)', 'f-y', k.y, (v) => setzeFeld('knoten', k.id, 'y', v), 'number', { step: 100 });
      if (k.w && k.h) {
        feld(dl, 'Breite (E)', 'f-w', k.w, (v) => setzeFeld('knoten', k.id, 'w', v), 'number', { step: 20 });
        feld(dl, 'Höhe (E)', 'f-h', k.h, (v) => setzeFeld('knoten', k.id, 'h', v), 'number', { step: 20 });
      }
      if (k.form) zeile(dl, 'Form', `${k.form}, Seite ${k.seite} E`);
      zeile(dl, 'Gänge', g.gaenge.filter((x) => x.von === k.id || x.nach === k.id).map((x) => x.name || x.id).join(', ') || 'keine');
      knoepfe.append(knopf('Löschen', 'Knoten samt seinen Gängen löschen (Entf)', () => loescheAuswahl(), 'b-loeschen2'));
    } else if (au && istTeilArt(au.art)) {
      const o = teilFinden(g, au.art, au.id);
      if (!o) return;
      const name = teilName(au.art, o);
      rechts.append(el('h2', { text: `${name} ${o.id}` }), dl);
      zeile(dl, 'ID', o.id);
      feld(dl, 'x (E)', 'f-x', o.x, (v) => setzeFeld(au.art, o.id, 'x', v), 'number', { step: 20 });
      feld(dl, 'y (E)', 'f-y', o.y, (v) => setzeFeld(au.art, o.id, 'y', v), 'number', { step: 20 });
      if (hatMasse(au.art, o)) {
        feld(dl, 'Länge (E)', 'f-laenge', o.laenge, (v) => setzeFeld(au.art, o.id, 'laenge', v), 'number', { step: 20 });
        feld(dl, 'Breite (E)', 'f-breite', o.breite, (v) => setzeFeld(au.art, o.id, 'breite', v), 'number', { step: 20 });
        feld(dl, 'Winkel (°)', 'f-winkel', o.winkel, (v) => setzeFeld(au.art, o.id, 'winkel', v), 'number', { step: WINKEL_SCHRITT });
        zeile(dl, 'Länge', `${fmt(o.laenge / SCREEN_W)} Bildschirme = ${fmt(o.laenge / SPEED)} s`);
        knoepfe.append(
          knopf('⟲ 45°', 'Um 45° linksherum drehen (Umschalt+R)', () => dreheTeil(-1), 'b-teil-links'),
          knopf('⟳ 45°', 'Um 45° rechtsherum drehen (R)', () => dreheTeil(1), 'b-teil-rechts'),
        );
      } else if (o.platzhalter) zeile(dl, 'Hinweis', 'Platzhalter: Gegner-Verhalten im Fenster ungeprüft');
      knoepfe.append(
        knopf('Duplizieren', 'Kopie neben das Teil setzen (Strg+D)', () => dupliziere(), 'b-teil-dup'),
        knopf('Kopieren', 'Teil merken, Strg+V fügt es an der Mausstelle ein (Strg+C)', () => kopiere(), 'b-teil-kopieren'),
        knopf('Löschen', `${name} löschen (Entf)`, () => loescheAuswahl(), 'b-loeschen2'),
      );
    } else {
      rechts.append(el('h2', { text: g.name }), dl);
      zeile(dl, 'Tileset', g.tileset);
      zeile(dl, 'Knoten', g.knoten.length);
      zeile(dl, 'Gänge', g.gaenge.length);
      zeile(dl, 'Formteile', g.formteile.length);
      zeile(dl, 'Objekte', g.objekte.length);
      zeile(dl, 'Notizen', g.notizen.length);
    }
    rechts.append(knoepfe);
    rechts.append(el('p', { class: 'grau', text: 'V Auswahl, G Gang, K Knoten, B Formteil, W Wand, H Hindernis · R dreht ein Teil (Umschalt: links), Strg+C/V/D kopieren, einfügen, duplizieren · Strg+Z/Y Rückgängig/Wiederholen · Strg+S Speichern · P Spielen ab hier (Esc zurück), N Bezeichnung kopieren · Q/E drehen, 0 Norden, F wie im Spiel, Leertaste Fahrt, Mausrad zoomt.' }));
  }
  function refreshFahrt() {
    const m = ganzMasse();
    schieber.disabled = play.disabled = !m;
    if (!m) {
      fahrtText.textContent = 'Gang anklicken, dann zeigt der Rahmen, was der Spieler auf einmal sieht (480 × 270 E).';
      return;
    }
    schieber.max = String(Math.round(m.laenge));
    schieber.value = String(Math.round(state.fahrt.s));
    play.classList.toggle('an', !!state.fahrt.laeuft);
    const s = state.fahrt.s;
    fahrtText.textContent =
      `Stelle ${fmt(s, 0)} E = ${fmt(s / SCREEN_W)} Bildschirme = ${fmt(s / SPEED)} s  ·  Gang ${fmt(m.laenge, 0)} E = ${fmt(m.bildschirme)} Bildschirme = ${fmt(m.sekunden)} s`;
  }
  function refresh() {
    anzeige.textContent = `${DIR_NAMES[ansicht.blick]} · ${fmt(ZOOM_BILDSCHIRME[ansicht.stufe], 1)} Bildschirme`;
    eigenschaften();
    refreshFahrt();
    const v = verlaufVon(state.gebietId);
    undoKnopf.disabled = !v.kannZurueck;
    redoKnopf.disabled = !v.kannVor;
    const au = state.auswahl;
    spielKnopf.disabled = !(au?.art === 'gang' && state.fahrt);
    bezKnopf.disabled = !(au?.art === 'gang' || au?.art === 'knoten');
    for (const w of WERKZEUGE) document.getElementById('t-' + w.id)?.classList.toggle('an', w.id === state.werkzeug);
    typWahl.disabled = state.werkzeug !== 'knoten';
    loeschKnopf.disabled = !(au && (au.art === 'gang' || au.art === 'knoten' || istTeilArt(au.art)));
    stand.textContent = ungespeichert() ? '● ungespeichert' : '✓ gespeichert';
    stand.className = ungespeichert() ? 'offen' : 'grau';
    document.title = `${ungespeichert() ? '* ' : ''}Wendehals – Editor`;
    hinweis('');
    dirty = true;
  }

  // ---------------------------------------------------------------- Eingabe
  let zug = null; // laufende Mausbewegung: { modus: 'werkzeug' | 'plan', x, y, bewegt }
  const zeigerPunkt = (e) => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const [x, y] = ansicht.bildZuWelt(px, py);
    return { px, py, x, y };
  };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    // linke Taste: Werkzeug; mittlere/rechte Taste verschiebt immer den Plan
    const erfasst = e.button === 0 && werkzeug().down?.(kontext, zeigerPunkt(e)) === true;
    zug = { modus: erfasst ? 'werkzeug' : 'plan', x: e.clientX, y: e.clientY, bewegt: false, taste: e.button };
    if (!erfasst) canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    state.zeiger = zeigerPunkt(e);
    if (!zug) return werkzeug().schweben?.(kontext, state.zeiger);
    if (zug.modus === 'werkzeug') return werkzeug().move?.(kontext, zeigerPunkt(e));
    const dx = e.clientX - zug.x;
    const dy = e.clientY - zug.y;
    if (!zug.bewegt && Math.hypot(dx, dy) < KLICK_TOLERANZ_PX) return;
    zug.bewegt = true;
    ansicht.verschieben(dx, dy);
    zug.x = e.clientX;
    zug.y = e.clientY;
    dirty = true;
  });
  const loslassen = (e) => {
    if (!zug) return;
    const z = zug;
    zug = null;
    canvas.style.cursor = state.werkzeug === 'auswahl' ? 'grab' : 'crosshair';
    if (e.type === 'pointercancel') return werkzeug().abbruch?.(kontext);
    if (z.modus === 'werkzeug') werkzeug().up?.(kontext, zeigerPunkt(e));
    else if (!z.bewegt && z.taste === 0) werkzeug().klick?.(kontext, zeigerPunkt(e));
  };
  canvas.addEventListener('pointerleave', () => {
    if (zug) return;
    state.zeiger = null;
    werkzeug().abbruch?.(kontext);
  });
  canvas.addEventListener('pointerup', loslassen);
  canvas.addEventListener('pointercancel', loslassen);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      if (!e.deltaY) return;
      zoom(e.deltaY > 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (state.spielen?.aktiv) return; // im Spielmodus gehören die Tasten dem Spiel
    const imFeld = e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const c = e.code;
      const tippt = imFeld && !(c === KUERZEL.speichern);
      if (tippt) return; // in Eingabefeldern gilt das eingebaute Rückgängig des Feldes
      const fn =
        c === KUERZEL.rueckgaengig ? (e.shiftKey ? wiederholen : rueckgaengig)
        : c === KUERZEL.wiederholen ? wiederholen
        : c === KUERZEL.speichern ? speichere
        : c === KUERZEL.oeffnen ? oeffne
        : c === KUERZEL.kopieren ? kopiere
        : c === KUERZEL.einfuegen ? fuegeEin
        : c === KUERZEL.duplizieren ? dupliziere
        : null;
      if (!fn) return;
      e.preventDefault();
      if (imFeld) e.target.blur(); // übernimmt einen halb getippten Wert, bevor gespeichert wird
      fn();
      return;
    }
    if (imFeld || e.repeat || e.altKey) return;
    const c = e.code;
    const schritt = PFEIL_SCHRITT_PX;
    let getan = true;
    if (c === KUERZEL.drehenLinks) drehen(-1);
    else if (c === KUERZEL.drehenRechts) drehen(1);
    else if (c === KUERZEL.norden) norden();
    else if (c === KUERZEL.wieImSpiel) wieImSpiel();
    else if (e.key === '+' || hat(KUERZEL.zoomPlus, c)) zoom(-1);
    else if (e.key === '-' || hat(KUERZEL.zoomMinus, c)) zoom(1);
    else if (c === KUERZEL.spielen) spielenAb();
    else if (c === KUERZEL.bezeichnung) kopiereBezeichnung();
    else if (c === KUERZEL.fahrtStart) fahrtUmschalten();
    else if (c === KUERZEL.fahrtVor) setzeFahrt((state.fahrt?.s || 0) + 20);
    else if (c === KUERZEL.fahrtZurueck) setzeFahrt((state.fahrt?.s || 0) - 20);
    else if (c === KUERZEL.links) ansicht.verschieben(schritt, 0);
    else if (c === KUERZEL.rechts) ansicht.verschieben(-schritt, 0);
    else if (c === KUERZEL.hoch) ansicht.verschieben(0, schritt);
    else if (c === KUERZEL.runter) ansicht.verschieben(0, -schritt);
    else if (c === KUERZEL.teilDrehen) dreheTeil(e.shiftKey ? -1 : 1);
    else if (c === KUERZEL.beschriftung) beschriften();
    else if (c === KUERZEL.alles) alles();
    else if (hat(KUERZEL.loeschen, c)) loescheAuswahl();
    else if (Object.values(KUERZEL.werkzeug).includes(c)) setzeWerkzeug(Object.keys(KUERZEL.werkzeug).find((id) => KUERZEL.werkzeug[id] === c));
    else if (c === 'Escape') {
      werkzeug().abbruch?.(kontext);
      waehle(null);
    }
    else getan = false;
    if (getan) {
      e.preventDefault();
      if (e.target instanceof HTMLButtonElement) e.target.blur();
      refresh();
    }
  });

  // ---------------------------------------------------------------- Schleife
  function zeichne() {
    const t0 = performance.now();
    zeichnePlan(ctx, gebiet(), ansicht, { auswahl: state.auswahl, fahrt: state.fahrt, zeit: state.zeit, beschriftung: state.beschriftung, vorschau: (c) => werkzeug().vorschau?.(c, kontext) }, canvas.width / ansicht.w);
    perf.zeichnenMs.push(performance.now() - t0);
    if (perf.zeichnenMs.length > 600) perf.zeichnenMs.shift();
    dirty = false;
  }
  let letzte = performance.now();
  function frame(jetzt) {
    const dt = Math.min(0.1, (jetzt - letzte) / 1000);
    letzte = jetzt;
    if (state.echtzeit) tick(dt);
    if (state.fahrt || dirty) dirty = true; // Dackel wackelt weiter
    if (dirty) zeichne();
    requestAnimationFrame(frame);
  }

  groesse();
  wechsle(state.gebietId);
  setzeWerkzeug(state.werkzeug);
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', (e) => {
    if (Object.keys(state.gebiete).some((id) => ungespeichert(id))) e.preventDefault(); // Rückfrage statt stillem Verlust
  });
  // Electron: die Leveldateien frisch von der Platte lesen (die eingebauten Stände sind nur der Rückfall)
  state.speicher
    .ladeAlle()
    .then((alle) => alle && uebernehmeAlle(alle))
    .catch((e) => melde('Die Leveldateien konnten nicht von der Platte gelesen werden, es gelten die eingebauten Stände: ' + e.message, 'fehler'));

  // Für automatische Tests und für Claude (Prüfen ohne Mausklicks)
  window.__editor = {
    state,
    ansicht,
    perf,
    gebiet,
    wechsle,
    waehle,
    setzeFahrt,
    spielenAb,
    kopiereBezeichnung,
    bezeichnungText,
    fahrtUmschalten,
    tick,
    zeichne,
    treffer,
    aendere,
    rueckgaengig,
    wiederholen,
    setzeFeld,
    setzeWerkzeug,
    loescheAuswahl,
    dreheTeil,
    kopiere,
    fuegeEin,
    dupliziere,
    speichere,
    oeffne,
    oeffneText,
    uebernehmeAlle,
    ungespeichert,
    verlaufVon,
    melde,
    alles,
    beschriften,
    drehen,
    norden,
    wieImSpiel,
    zoom,
    rahmenEcken: () => {
      const m = ganzMasse();
      return m ? rahmenEcken(m, state.fahrt.s) : null;
    },
    pixel: (x, y) =>
      Array.from(
        ctx.getImageData(Math.min(canvas.width - 1, Math.floor(x * (canvas.width / ansicht.w))), Math.min(canvas.height - 1, Math.floor(y * (canvas.height / ansicht.h))), 1, 1).data,
      ),
    hash: () => {
      zeichne();
      // Prüfsumme des Plan-Bildes (für „Drehen und zurück ergibt dasselbe Bild“)
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4) {
        h = Math.imul(h ^ d[i], 16777619);
        h = Math.imul(h ^ d[i + 1], 16777619);
        h = Math.imul(h ^ d[i + 2], 16777619);
      }
      return h >>> 0;
    },
    HEADINGS,
    E,
  };
}
