// Einstieg des Level-Editors (`?editor`, Electron: WENDEHALS_EDITOR=1). Baut die Oberfläche, verbindet die Module.
// Stufe 1: Ansehen – Plan im Spielbild, Zoom/Verschieben/Drehen, Gang anklicken, Bildschirmrahmen mit Fahrt-Schieber.
// Stufe 2a: Bauen – Werkzeuge (Auswahl, Gang, Knoten), Eigenschaften ändern, Rückgängig/Wiederholen, Speichern/Laden.
// Stufe 2b: Formteile, Wände, Hindernisse – setzen, verschieben, drehen, kopieren, löschen, Eigenschaften.
import { HEADINGS, DIR_NAMES, E } from '../core/math.js';
import { Ansicht, radFaktor } from './ansicht.js';
import { zeichnePlan, zeichneGegner } from './zeichnen.js';
import { WELT, GEBIETE } from './startdaten.js';
import { kopie, bezeichnung, knotenMap, gangMasse, gangPolygon, knotenPolygon, punktInPolygon, ausdehnung, rahmenEcken, formatiere, ladeGebiet, pruefeFormat, Verlauf } from './daten.js';
import { formatiereWelt, ladeWelt, pruefeWelt, weltLagen, weltAusdehnung, lageSetzen, bereichFeld, bereichAnpassen, bereichMasse, uebergangAnlegen, uebergangLoeschen, uebergaengeVon, uebergaengeAn, andereSeite, teileEnde, ausserhalb } from './welt.js';
import { KNOTENTYPEN, TILESETS, GEGNER, gegnerFuer, tilesetFarben } from './katalog.js';
import { KUERZEL, WINKEL_SCHRITT, SCREEN_W, SCREEN_H, SPEED, ZOOM_TASTE_FAKTOR, ZOOM_FESTWERTE, PFEIL_SCHRITT_PX, KLICK_TOLERANZ_PX, KNOTEN_RADIUS_PX, FANG_PX, FLOOR, FLOOR2, WALL, FARBEN, PALETTE_PX } from './konstanten.js';
import { gangTeilen, loesche, setze, gesperrteIds } from './befehle.js';
import { teilBei, teilFinden, teilDrehen, teilMerken, teilEinfuegen, loescheTeil, setzeTeil, istTeilArt, hatMasse, teilName, liste as teilListe } from './teile.js';
import { erzeugeSpeicher } from './speicher.js';
import { spielbarkeit, erzeugeSzene } from './spielen.js';
import { pruefeGebiet, zusammenfassung } from './pruefer.js';
import { SpielModus } from './spielmodus.js';
import { WERKZEUGE } from './werkzeuge/index.js';
import weltWerkzeug, { weltTreffer } from './werkzeuge/welt-ansicht.js';
import { zeichneWelt } from './zeichnen-welt.js';

const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
/** Zoom-Anzeige: zwei Stellen bei kleinen, eine bei großen Werten, Komma als Dezimalzeichen. */
const fmtZoom = (b) => String(b >= 20 ? Math.round(b * 10) / 10 : Math.round(b * 100) / 100).replace('.', ',');
const hat = (liste, code) => (Array.isArray(liste) ? liste.includes(code) : liste === code);

const CSS = `
html, body { margin: 0; height: 100%; background: #14121a; color: #e8e6ee; font: 13px/1.4 system-ui, sans-serif; overflow: hidden; }
#editor { display: grid; grid-template-columns: 1fr 290px; grid-template-rows: 44px 44px 22px 1fr 78px; height: 100%; }
#editor > * { min-width: 0; min-height: 0; }
.leiste { background: #221f2b; display: flex; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; align-items: center; min-height: 44px; padding-top: 3px; padding-bottom: 3px; box-sizing: border-box; gap: 8px; padding: 0 10px; border: 0 solid #38334a; }
#oben, #werk { grid-column: 1 / 3; border-bottom-width: 1px; }
#hinweiszeile { grid-column: 1 / 3; grid-row: 3; background: #221f2b; padding: 0 10px; line-height: 22px; border-bottom: 1px solid #38334a; overflow: hidden; }
#plan { grid-row: 4; } #rechts { grid-row: 4; grid-column: 2; }
#unten { grid-row: 5; grid-column: 1 / 3; border-top-width: 1px; gap: 12px; flex-wrap: wrap; overflow: auto; }
#plan { position: relative; overflow: hidden; background: #1c1822; }
#plan canvas { display: block; width: 100%; height: 100%; cursor: grab; }
#prueferfeld { position: absolute; top: 8px; right: 8px; width: 440px; max-width: calc(100% - 16px); max-height: 45%; overflow: auto; background: rgba(34,31,43,.96); border: 1px solid #4b4560; border-radius: 6px; padding: 6px 8px; box-sizing: border-box; }
#prueferfeld h3 { font-size: 13px; margin: 0 0 4px; }
#prueferfeld .pm { display: block; width: 100%; text-align: left; white-space: normal; margin: 2px 0; }
#prueferfeld .pm.MUSS { border-color: #ff6a5a; } #prueferfeld .pm.SOLL { border-color: #d9b43a; }
#b-pruefer.muss { background: #8c3b3b; } #b-pruefer.soll { background: #7a6a2a; } #b-pruefer.gut { background: #2f6b45; }
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
#zoomfeld { width: 54px; flex: none; text-align: right; }
input[type=text], input[type=number], #rechts select { width: 100%; box-sizing: border-box; background: #14121a; color: #e8e6ee; border: 1px solid #4b4560; border-radius: 4px; padding: 3px 6px; font: inherit; }
#rechts .knoepfe { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
#palette { margin-top: 14px; } .palette-titel { font-size: 14px; font-weight: bold; margin-bottom: 6px; } .palette-raster { display: flex; flex-wrap: wrap; gap: 6px; } .palette-raster canvas { border: 2px solid #4b4560; border-radius: 4px; cursor: pointer; } .palette-raster canvas.aktiv { border-color: #4ad0ff; }
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
    welt: kopie(WELT), // eine Arbeitskopie: der eingebaute Stand bleibt unverändert
    ansichtArt: 'gebiet', // 'gebiet' (ein Gebiet bearbeiten) oder 'welt' (Welt-Plan: Bereiche, Lage, Übergänge)
    weltAuswahl: null, // in der Welt-Ansicht: { art: 'gebiet'|'uebergang', id }
    weltVerlauf: new Verlauf(), // Rückgängig/Wiederholen für welt.json (Lage, Übergänge)
    weltGespeichert: formatiereWelt(WELT), // zuletzt gespeicherter/geladener Text von welt.json
    kameras: {}, // gemerkte Kamera je Ansicht-Art
    entwurf: null, // vorbelegter Anfang eines neuen Übergangs: { gebiet, knoten }
    gebiete: Object.fromEntries(Object.entries(GEBIETE).map(([id, g]) => [id, kopie(g)])),
    gebietId: WELT.gebiete[0].id,
    auswahl: null, // { art: 'gang'|'knoten', id }
    fahrt: null, // { gang, s, laeuft }
    zeit: 0,
    meldung: '',
    beschriftung: true,
    look: 'proto', // 'proto' (Farben des Fenster-Prototyps) oder 'tileset' (Farben des Tilesets des Gebiets)
    gegnerArt: null, // Art, die das Gegner-Werkzeug setzt (null = erste der Liste)
    echtzeit: true, // false: Zeit und Fahrt laufen nur über tick() – für deterministische Tests
    werkzeug: WERKZEUGE[0].id,
    knotenTyp: 'kreuzung',
    prueferOffen: false, // Liste der Prüfer-Meldungen sichtbar (und Marken im Plan)
    spielen: null, // laufender SpielModus (Stufe 3) oder null
    bezeichnung: '', // zuletzt kopierte Bezeichnung
    zwischen: null, // gemerktes Teil für Einfügen (Strg+C): { art, teil }
    zeiger: null, // letzte Mausstelle im Plan (Welt), Zielstelle für Einfügen
    verlauf: {}, // Gebiets-ID → Verlauf (Rückgängig/Wiederholen)
    gespeichert: Object.fromEntries(Object.entries(GEBIETE).map(([id, g]) => [id, formatiere(g)])), // zuletzt gespeicherter/geladener Text je Gebiet
    neueGebiete: new Set(), // geöffnete Gebiete, deren Datei noch nicht gespeichert ist (kommen erst danach in welt.json)
    speicher: erzeugeSpeicher(),
  };
  const ansicht = new Ansicht();
  const perf = { zeichnenMs: [] };
  let dirty = true;
  const gebiet = () => state.gebiete[state.gebietId];
  const werkzeug = () => WERKZEUGE.find((w) => w.id === state.werkzeug);
  const aktiv = () => (state.ansichtArt === 'welt' ? weltWerkzeug : werkzeug()); // was die Maus gerade bedient
  const kamera = () => ({ cx: ansicht.cx, cy: ansicht.cy, bildschirme: ansicht.bildschirme, blick: ansicht.blick });

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
  const zoomFeld = el('input', { id: 'zoomfeld', type: 'text', size: '5', title: 'Zoom in Bildschirmen (480 E) Breite – Zahl eintippen und Enter (1 = so groß wie im Spiel, 2,2 = Normalansicht)' });
  zoomFeld.addEventListener('change', () => setzeZoom(zahlVon(zoomFeld.value)));
  zoomFeld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') zoomFeld.blur();
    if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); // Kürzel gelten nicht beim Tippen
  });
  const oben = el('div', { id: 'oben', class: 'leiste' }, [
    el('span', { class: 'titel', text: 'Editor' }),
    wahl,
    knopf('Welt', 'Welt-Plan: alle Gebiete, ihre Bereiche, Lage und Übergänge (T)', () => weltUmschalten(), 'b-welt'),
    knopf('Drehen ⟲', 'Ansicht 45° links drehen (Q)', () => drehen(-1), 'b-links'),
    knopf('Drehen ⟳', 'Ansicht 45° rechts drehen (E)', () => drehen(1), 'b-rechts'),
    knopf('Norden', 'Norden nach oben (0)', () => norden(), 'b-norden'),
    knopf('Wie im Spiel', 'In Flugrichtung des gewählten Gangs drehen (F)', () => wieImSpiel(), 'b-spiel'),
    knopf('Zoom −', 'Herauszoomen (−; Mausrad: 15 % je Raste)', () => zoom(1 / ZOOM_TASTE_FAKTOR), 'b-minus'),
    zoomFeld,
    el('span', { class: 'grau', text: 'Bildschirme' }),
    knopf('Zoom +', 'Hineinzoomen (+)', () => zoom(ZOOM_TASTE_FAKTOR), 'b-plus'),
    knopf('Alles', 'Ganzes Gebiet einpassen (Pos1)', () => alles(), 'b-alles'),
    knopf('Beschriftung', 'Knoten, Namen und Maßstab ein-/ausblenden (L)', () => beschriften(), 'b-beschriftung'),
    knopf('Look', 'Farben umschalten: Prototyp ↔ Tileset des Gebiets (J)', () => lookUmschalten(), 'b-look'),
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
  const prueferKnopf = knopf('Prüfer', 'Regeln prüfen: Liste der Meldungen zeigen/verbergen (Klick auf eine Meldung springt zur Stelle)', () => prueferUmschalten(), 'b-pruefer');
  const prueferFeld = el('div', { id: 'prueferfeld' });
  prueferFeld.style.display = 'none';
  plan.append(prueferFeld);
  const unten = el('div', { id: 'unten', class: 'leiste' }, [play, schieber, fahrtText, prueferKnopf, spielKnopf, bezKnopf, bezFeld, melden]);
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
    if (state.ansichtArt === 'welt') {
      state.kameras.welt = kamera();
      state.ansichtArt = 'gebiet';
    }
    bezFeld.style.display = 'none'; // die kopierte Bezeichnung gehörte zum alten Gebiet
    melde('');
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
    bezFeld.style.display = 'none';
    if (/^(Zum Kopieren|Zum Spielen)/.test(state.meldung)) melde('');
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
  /** Um `faktor` hineinzoomen (> 1) oder heraus (< 1), um den Punkt (px, py) des Plans (sonst die Mitte). */
  const zoom = (faktor, px, py) => {
    ansicht.zoomen(faktor, px, py);
    refresh();
  };
  /** Zoom auf eine Zahl Bildschirme Breite setzen (Eingabefeld, Tasten 1 und 2). */
  function setzeZoom(b) {
    if (!Number.isFinite(b) || b <= 0) {
      melde('Bitte den Zoom als Zahl in Bildschirmen eingeben, z. B. 2,2.', 'fehler');
      return refresh();
    }
    ansicht.setzeBildschirme(b);
    refresh();
  }
  function lookFarben() {
    return state.look === 'tileset' ? tilesetFarben(gebiet().tileset) : null;
  }
  function lookUmschalten() {
    state.look = state.look === 'tileset' ? 'proto' : 'tileset';
    melde(state.look === 'tileset' ? `Look: Tileset „${TILESETS[gebiet().tileset]?.name ?? gebiet().tileset}“` : 'Look: Prototyp-Farben');
    dirty = true;
    refresh();
  }
  function beschriften() {
    state.beschriftung = !state.beschriftung;
    refresh();
  }
  function alles() {
    ansicht.einpassen(state.ansichtArt === 'welt' ? weltAusdehnung(state.welt, state.gebiete) : ausdehnung(gebiet()));
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
    const { probleme, hinweise } = spielbarkeit(g, au.id);
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
    bezFeld.blur(); // der Text bleibt markiert, die Kürzel gelten sofort wieder
    state.bezeichnung = text;
    melde(kopiert ? `Kopiert: ${text}` : `Nicht in die Zwischenablage gekommen – Text ist markiert, mit Strg+C kopieren: ${text}`);
  }

  // ---------------------------------------------------------------- Prüfer (Stufe 4)
  let prueferMerk = { text: null, id: null, ergebnis: null };
  /** Ergebnis des Prüfers für das aktuelle Gebiet (zwischengespeichert, bis sich das Gebiet ändert). */
  function pruefer() {
    const text = formatiere(gebiet());
    if (prueferMerk.text !== text || prueferMerk.id !== state.gebietId) prueferMerk = { text, id: state.gebietId, ergebnis: pruefeGebiet(gebiet()) };
    return prueferMerk.ergebnis;
  }
  function prueferUmschalten() {
    state.prueferOffen = !state.prueferOffen;
    refresh();
  }
  /** Springt zur Stelle einer Meldung: wählt das Objekt, fährt den Rahmen an die Stelle, zentriert den Plan. */
  function springe(m) {
    const o = m.ort;
    if (!o) return;
    if (state.ansichtArt === 'welt') {
      weltWaehle(o);
      const r = o.art === 'gebiet' ? state.gebiete[o.id]?.bereich : null;
      const l = o.art === 'gebiet' ? weltLagen(state.welt, state.gebiete).get(o.id) : null;
      if (r && l) ansicht.zentrieren((r.x0 + r.x1) / 2 + l.x, (r.y0 + r.y1) / 2 + l.y);
      refresh();
      return;
    }
    const g = gebiet();
    const da = o.art === 'gang' ? g.gaenge : o.art === 'knoten' ? g.knoten : o.art === 'formteil' ? g.formteile : g.objekte;
    if (da.some((x) => x.id === o.id)) waehle({ art: o.art, id: o.id });
    if (o.art === 'gang' && o.s != null) setzeFahrt(o.s);
    ansicht.zentrieren(o.x, o.y);
    refresh();
  }
  function prueferZeigen() {
    prueferKnopf.classList.remove('muss', 'soll', 'gut');
    const r = state.ansichtArt === 'welt' ? weltPruefer() : pruefer();
    prueferKnopf.textContent = zusammenfassung(r);
    prueferKnopf.classList.add(r.muss ? 'muss' : r.soll ? 'soll' : 'gut');
    prueferFeld.style.display = state.prueferOffen ? '' : 'none';
    if (!state.prueferOffen) return;
    prueferFeld.replaceChildren(
      el('h3', { text: (state.ansichtArt === 'welt' ? 'Welt-Prüfer' : 'Prüfer') + (r.meldungen.length ? ' – Klick springt zur Stelle' : ' – alles in Ordnung') }),
      ...r.meldungen.map((m) => {
        const b = el('button', { class: 'pm ' + m.art, title: m.ort ? 'Zur Stelle springen' : 'Betrifft das ganze Gebiet', text: `${m.regel} ${m.art}: ${m.text}` });
        b.addEventListener('click', () => springe(m));
        return b;
      }),
    );
  }

  // ---------------------------------------------------------------- Bearbeiten (Stufe 2a)
  function melde(text, art = 'info') {
    state.meldung = text;
    melden.textContent = text;
    melden.className = art === 'fehler' ? 'fehler' : '';
    melden.title = text ? 'Klick blendet die Meldung aus' : '';
  }
  function hinweis(t) {
    werkHinweis.textContent = t || aktiv().hinweis;
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
    if (state.ansichtArt === 'welt') return weltRueck(true);
    const t = verlaufVon(state.gebietId).rueckgaengig(JSON.stringify(gebiet()));
    if (t != null) nachVerlauf(t);
  }
  function wiederholen() {
    if (state.ansichtArt === 'welt') return weltRueck(false);
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
    if (state.ansichtArt === 'welt') return loescheUebergang();
    const au = state.auswahl;
    if (!au || (au.art !== 'gang' && au.art !== 'knoten' && !istTeilArt(au.art))) return;
    const hatKnoten = (g) => new Set(g.knoten.map((k) => k.id));
    const vorher = hatKnoten(gebiet());
    aendere('Löschen', (g) => (istTeilArt(au.art) ? loescheTeil(g, au.art, au.id) : loesche(g, au.art, au.id)));
    const weg = [...vorher].filter((id) => !hatKnoten(gebiet()).has(id));
    const offen = weg.reduce((n, id) => n + uebergaengeAn(state.welt, state.gebietId, id).length, 0);
    if (offen) melde(`${offen === 1 ? 'Ein Übergang zeigt' : offen + ' Übergänge zeigen'} jetzt ins Leere – der Welt-Prüfer (Taste T) meldet es (W1).`, 'fehler');
  }
  /** Gewähltes Teil (Formteil, Wand, Hindernis) oder null. */
  const gewaehltesTeil = () => {
    const au = state.auswahl;
    return au && istTeilArt(au.art) ? teilFinden(gebiet(), au.art, au.id) ?? null : null;
  };
  function dreheTeil(k) {
    if (state.ansichtArt === 'welt') return; // Gebiet-Befehle gelten nur in der Gebiet-Ansicht
    const au = state.auswahl;
    const o = gewaehltesTeil();
    if (!o) return;
    if (!hatMasse(au.art, o)) return melde(`${teilName(au.art, o)} hat keinen Winkel.`, 'fehler');
    aendere(`${teilName(au.art, o)} drehen`, (g) => teilDrehen(g, au.art, au.id, k));
  }
  function kopiere() {
    if (state.ansichtArt === 'welt') return; // Gebiet-Befehle gelten nur in der Gebiet-Ansicht
    const au = state.auswahl;
    if (!gewaehltesTeil()) return melde('Zum Kopieren erst ein Formteil, eine Wand oder ein Hindernis wählen.', 'fehler');
    state.zwischen = teilMerken(gebiet(), au.art, au.id);
    melde(`${teilName(au.art, state.zwischen.teil)} kopiert. Strg+V fügt es an der Mausstelle ein.`);
    refresh();
  }
  function fuegeEin() {
    if (state.ansichtArt === 'welt') return; // Gebiet-Befehle gelten nur in der Gebiet-Ansicht
    if (!state.zwischen) return melde('Nichts kopiert – erst ein Teil wählen und Strg+C drücken.', 'fehler');
    const z = state.zeiger ?? { x: ansicht.cx, y: ansicht.cy }; // ohne Mausstelle: Mitte der Ansicht
    const neu = aendere('Einfügen', (g) => teilEinfuegen(g, state.zwischen, z.x, z.y));
    if (neu) waehle(neu);
  }
  function dupliziere() {
    if (state.ansichtArt === 'welt') return; // Gebiet-Befehle gelten nur in der Gebiet-Ansicht
    const au = state.auswahl;
    if (!gewaehltesTeil()) return melde('Zum Duplizieren erst ein Formteil, eine Wand oder ein Hindernis wählen.', 'fehler');
    const gemerkt = teilMerken(gebiet(), au.art, au.id);
    const neu = aendere('Duplizieren', (g) => teilEinfuegen(g, gemerkt));
    if (neu) waehle(neu);
  }
  function teileGang() {
    if (state.ansichtArt === 'welt') return; // Gebiet-Befehle gelten nur in der Gebiet-Ansicht
    const au = state.auswahl;
    if (au?.art !== 'gang' || !state.fahrt) return;
    const neu = aendere('Gang teilen', (g) => gangTeilen(g, au.id, state.fahrt.s));
    if (neu) waehle({ art: 'knoten', id: neu.id });
  }
  function setzeWerkzeug(id) {
    if (!WERKZEUGE.some((w) => w.id === id)) return;
    if (state.ansichtArt === 'welt') zuGebiet();
    werkzeug().abbruch?.(kontext);
    state.werkzeug = id;
    canvas.style.cursor = id === 'auswahl' ? 'grab' : 'crosshair';
    hinweis('');
    refresh();
  }

  async function speichere() {
    if (state.ansichtArt === 'welt') return speichereWelt();
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
      if (weltUngespeichert()) {
        // nur Gebiete eintragen, deren Datei es gibt – sonst findet der nächste Start eine Datei nicht (weltDateiText lässt neue aus)
        const weltText = weltDateiText();
        const wr = await state.speicher.sichere('welt.json', weltText);
        if (wr) {
          state.weltGespeichert = weltText;
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
    const welt = ladeWelt(alle.welt);
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
    state.weltGespeichert = formatiereWelt(welt);
    state.weltVerlauf = new Verlauf();
    state.weltAuswahl = null;
    state.entwurf = null;
    state.neueGebiete = new Set();
    state.gebiete = neu;
    state.gespeichert = Object.fromEntries(Object.entries(neu).map(([id, g]) => [id, formatiere(g)]));
    state.verlauf = {};
    const geladen = welt.gebiete.filter((e) => neu[e.id]);
    wahl.replaceChildren(...geladen.map((e) => el('option', { value: e.id, text: e.name })));
    wechsle(geladen[0].id);
    if (probleme.length) melde('Einige Dateien wurden übersprungen:\n' + probleme.join('\n'), 'fehler');
  }

  // ---------------------------------------------------------------- Gebiete und Übergänge (Stufe 5)
  /** Text von welt.json, wie er gespeichert würde: Gebiete ohne Datei (und Übergänge dorthin) bleiben draußen. */
  function weltDateiText() {
    const neu = state.neueGebiete;
    const w = { ...state.welt, gebiete: state.welt.gebiete.filter((e) => !neu.has(e.id)) };
    const ue = (state.welt.uebergaenge ?? []).filter((u) => ![u.von, u.nach].some((t) => neu.has(t.split('/')[0])));
    if (ue.length) w.uebergaenge = ue;
    else delete w.uebergaenge;
    return formatiereWelt(w);
  }
  const weltUngespeichert = () => weltDateiText() !== state.weltGespeichert;
  const weltPruefer = () => pruefeWelt(state.welt, state.gebiete);
  /** Übergänge, die an Knoten des offenen Gebiets enden: [{ knoten, text }] (für die Ringe im Plan). */
  function uebergangsMarken() {
    const out = [];
    for (const u of uebergaengeVon(state.welt)) {
      for (const [hier, dort] of [[u.von, u.nach], [u.nach, u.von]]) {
        const e = teileEnde(hier);
        if (e?.gebiet === state.gebietId) out.push({ knoten: e.knoten, text: '→ ' + dort });
      }
    }
    return out;
  }
  function weltBereinige() {
    const au = state.weltAuswahl;
    if (!au) return;
    const da = au.art === 'gebiet' ? state.welt.gebiete.some((e) => e.id === au.id) : uebergaengeVon(state.welt).some((u) => u.id === au.id);
    if (!da) state.weltAuswahl = null;
  }
  /** Jede Änderung an welt.json läuft hier durch (wie `aendere` für Gebiete): Zustand vorher merken, bei Fehler nichts ändern. */
  function weltAendere(label, fn) {
    const vorher = JSON.stringify(state.welt);
    const w = JSON.parse(vorher);
    let erg = null;
    try {
      erg = fn(w);
    } catch (e) {
      melde(`„${label}“ ging schief, nichts wurde geändert: ${e.message}`, 'fehler');
      refresh();
      return null;
    }
    if (JSON.stringify(w) === vorher) return erg ?? null;
    state.weltVerlauf.merke(vorher);
    state.letzteAktion = label;
    state.welt = w;
    melde('');
    weltBereinige();
    refresh();
    return erg ?? null;
  }
  function weltRueck(zurueck) {
    const jetzt = JSON.stringify(state.welt);
    const t = zurueck ? state.weltVerlauf.rueckgaengig(jetzt) : state.weltVerlauf.wiederholen(jetzt);
    if (t == null) return;
    const alt = JSON.parse(t);
    // nur Lage und Übergänge gehen zurück; Gebiete, die seitdem geöffnet wurden, bleiben in der Liste
    alt.gebiete = state.welt.gebiete.map((e) => {
      const n = { ...e };
      const vor = alt.gebiete.find((x) => x.id === e.id);
      if (vor?.lage) n.lage = vor.lage;
      else delete n.lage;
      return n;
    });
    state.welt = alt;
    weltBereinige();
    melde('');
    refresh();
  }
  function weltWaehle(a) {
    state.weltAuswahl = a;
    if (/^(Zum Kopieren|Zum Spielen)/.test(state.meldung)) melde('');
    refresh();
  }
  function zuWelt() {
    if (state.ansichtArt === 'welt') return;
    werkzeug().abbruch?.(kontext);
    state.kameras.gebiet = kamera();
    state.ansichtArt = 'welt';
    state.auswahl = null;
    state.fahrt = null;
    bezFeld.style.display = 'none';
    state.weltAuswahl = { art: 'gebiet', id: state.gebietId };
    if (state.kameras.welt) Object.assign(ansicht, state.kameras.welt);
    else alles();
    refresh();
  }
  /** Zurück in die Gebiet-Ansicht; `id` = Gebiet, das geöffnet wird (sonst das zuletzt offene). */
  function zuGebiet(id = state.gebietId) {
    if (state.ansichtArt !== 'welt') return;
    weltWerkzeug.abbruch?.(kontext);
    state.kameras.welt = kamera();
    state.ansichtArt = 'gebiet';
    if (id !== state.gebietId || !state.kameras.gebiet) wechsle(id);
    else {
      Object.assign(ansicht, state.kameras.gebiet);
      refresh();
    }
  }
  function weltUmschalten() {
    if (state.ansichtArt === 'welt') zuGebiet(state.weltAuswahl?.art === 'gebiet' && state.gebiete[state.weltAuswahl.id] ? state.weltAuswahl.id : state.gebietId);
    else zuWelt();
  }
  function weltOeffneAuswahl() {
    const au = state.weltAuswahl;
    if (au?.art === 'gebiet' && state.gebiete[au.id]) zuGebiet(au.id);
  }
  /** Springt zu einem Knoten „gebiet/K1“ (öffnet das Gebiet, wählt den Knoten, zentriert den Plan). */
  function springeZuKnoten(text) {
    const t = teileEnde(text);
    if (!t || !state.gebiete[t.gebiet]) return melde(`Das Gebiet „${t?.gebiet ?? text}“ ist nicht geladen.`, 'fehler');
    if (state.ansichtArt === 'welt') zuGebiet(t.gebiet);
    else if (t.gebiet !== state.gebietId) wechsle(t.gebiet);
    const k = knotenMap(gebiet()).get(t.knoten);
    if (!k) return melde(`Den Knoten „${t.knoten}“ gibt es nicht mehr.`, 'fehler');
    waehle({ art: 'knoten', id: k.id });
    ansicht.zentrieren(k.x, k.y);
    refresh();
  }
  const zahlVon = (v) => (typeof v === 'number' ? v : String(v).trim() === '' ? NaN : Number(String(v).trim().replace(',', '.')));
  function setzeLage(id, achse, wert) {
    weltAendere('Lage ändern', (w) => {
      const z = zahlVon(wert);
      if (!Number.isFinite(z)) throw new Error('Bitte eine Zahl eingeben.');
      const l = weltLagen(w, state.gebiete).get(id);
      if (!l) throw new Error(`Gebiet „${id}“ ist nicht geladen.`);
      lageSetzen(w, id, achse === 'x' ? z : l.x, achse === 'y' ? z : l.y, state.gebiete);
    });
  }
  function setzeBereich(feldName, wert) {
    let fehler = null;
    aendere('Bereich ändern', (g) => {
      fehler = bereichFeld(g, feldName, wert);
    });
    if (fehler) melde(fehler, 'fehler');
    refresh();
  }
  function bereichAnInhaltAnwenden() {
    let geaendert = false;
    aendere('Bereich anpassen', (g) => {
      geaendert = bereichAnpassen(g);
    });
    if (!geaendert) melde('Der Bereich umschließt den Inhalt schon.');
  }
  function anlegenUebergang(vonGebiet, vonKnoten, nachGebiet, nachKnoten) {
    let fehler = null;
    const neu = weltAendere('Übergang anlegen', (w) => {
      const r = uebergangAnlegen(w, state.gebiete, { gebiet: vonGebiet, knoten: vonKnoten }, { gebiet: nachGebiet, knoten: nachKnoten });
      if (r.fehler) {
        fehler = r.fehler;
        return null;
      }
      return r.uebergang;
    });
    if (fehler) return melde(fehler, 'fehler');
    if (neu) {
      state.entwurf = null;
      weltWaehle({ art: 'uebergang', id: neu.id });
      melde(`Übergang ${neu.id} angelegt: ${neu.von} ↔ ${neu.nach}. Mit Strg+S wird welt.json gespeichert.`);
    }
    return neu;
  }
  function loescheUebergang() {
    const au = state.weltAuswahl;
    if (au?.art !== 'uebergang') return;
    weltAendere('Übergang löschen', (w) => uebergangLoeschen(w, au.id));
  }
  async function speichereWelt() {
    const text = weltDateiText();
    try {
      const r = await state.speicher.sichere('welt.json', text);
      if (!r) return melde('Speichern abgebrochen.');
      state.weltGespeichert = text;
      melde(`Gespeichert: ${r.wo}`);
    } catch (e) {
      melde('Nicht gespeichert: ' + e.message, 'fehler');
    }
    refresh();
  }

  const kontext = {
    state,
    ansicht,
    gebiet,
    treffer,
    waehle: (a) => waehle(a),
    aendere,
    hinweis,
    melde: (t, art) => melde(t, art),
    weltLive: (id, x, y) => {
      lageSetzen(state.welt, id, x, y, state.gebiete);
      dirty = true;
    },
    weltFertig: (vorher, label) => {
      if (JSON.stringify(state.welt) !== vorher) {
        state.weltVerlauf.merke(vorher);
        state.letzteAktion = label;
      }
      refresh();
    },
    weltZurueck: (vorher) => {
      state.welt = JSON.parse(vorher);
      refresh();
    },
    weltWaehle: (a) => weltWaehle(a),
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
  /** Rechtes Feld der Welt-Ansicht: Welt, Gebiet (Lage, Bereich, Übergang anlegen) oder Übergang. */
  function weltEigenschaften() {
    rechts.replaceChildren();
    const w = state.welt;
    const au = state.weltAuswahl;
    const lagen = weltLagen(w, state.gebiete);
    const dl = el('dl');
    const knoepfe = el('div', { class: 'knoepfe' });
    const u = au?.art === 'uebergang' ? uebergaengeVon(w).find((x) => x.id === au.id) : null;
    const e = au?.art === 'gebiet' ? w.gebiete.find((x) => x.id === au.id) : null;
    if (u) {
      rechts.append(el('h2', { text: `Übergang ${u.id}` }), dl);
      zeile(dl, 'Von', u.von);
      zeile(dl, 'Nach', u.nach);
      knoepfe.append(
        knopf(`Zu ${u.von}`, 'Gebiet öffnen und den Knoten wählen', () => springeZuKnoten(u.von), 'b-ue-von'),
        knopf(`Zu ${u.nach}`, 'Gebiet öffnen und den Knoten wählen', () => springeZuKnoten(u.nach), 'b-ue-nach'),
        knopf('Löschen', 'Übergang löschen (Entf)', () => loescheUebergang(), 'b-loeschen2'),
      );
    } else if (e) {
      const g = state.gebiete[e.id];
      rechts.append(el('h2', { text: `Gebiet „${e.name}“` }), dl);
      zeile(dl, 'ID', e.id);
      if (!g) {
        zeile(dl, 'Datei', 'nicht geladen');
      } else {
        const l = lagen.get(e.id);
        const m = bereichMasse(g.bereich);
        zeile(dl, 'Tileset', g.tileset);
        zeile(dl, 'Bereich', `${fmt(m.w, 0)} × ${fmt(m.h, 0)} E = ${fmt(m.w / SCREEN_W)} × ${fmt(m.h / SCREEN_H)} Bildschirme`);
        feld(dl, 'Lage x (E)', 'f-lx', l.x, (v) => setzeLage(e.id, 'x', v), 'number', { step: 100 });
        feld(dl, 'Lage y (E)', 'f-ly', l.y, (v) => setzeLage(e.id, 'y', v), 'number', { step: 100 });
        if (l.auto) zeile(dl, 'Anordnung', 'automatisch (beim ersten Verschieben werden alle Lagen gespeichert)');
        zeile(dl, 'Knoten', g.knoten.length);
        zeile(dl, 'Gänge', g.gaenge.length);
        knoepfe.append(knopf('Gebiet öffnen', 'Dieses Gebiet bearbeiten (Doppelklick oder Enter)', () => zuGebiet(e.id), 'b-welt-oeffnen'));
        rechts.append(dl, knoepfe);
        const eigene = uebergaengeVon(w).filter((x) => x.von.startsWith(e.id + '/') || x.nach.startsWith(e.id + '/'));
        rechts.append(el('h2', { text: 'Übergänge' }));
        if (eigene.length) {
          const liste = el('div', { class: 'knoepfe' });
          for (const x of eigene) liste.append(knopf(`${x.id}: ${x.von} ↔ ${x.nach}`, 'Übergang wählen', () => weltWaehle({ art: 'uebergang', id: x.id }), 'b-uw-' + x.id));
          rechts.append(liste);
        } else rechts.append(el('p', { class: 'grau', text: 'Noch keiner.' }));
        const andere = w.gebiete.filter((x) => x.id !== e.id && state.gebiete[x.id]);
        if (!andere.length) rechts.append(el('p', { class: 'grau', text: 'Für einen Übergang braucht es ein zweites geladenes Gebiet.' }));
        else {
          const opt = (k) => el('option', { value: k.id, text: `${k.id} (${KNOTENTYPEN[k.typ]?.name ?? k.typ})` });
          const meinKnoten = el('select', { id: 'f-u-knoten', title: 'Knoten in diesem Gebiet' }, g.knoten.map(opt));
          if (state.entwurf?.gebiet === e.id && g.knoten.some((k) => k.id === state.entwurf.knoten)) meinKnoten.value = state.entwurf.knoten;
          const zielGebiet = el('select', { id: 'f-u-gebiet', title: 'Zielgebiet' }, andere.map((x) => el('option', { value: x.id, text: x.name })));
          const zielKnoten = el('select', { id: 'f-u-ziel', title: 'Knoten im Zielgebiet' });
          const fuelle = () => zielKnoten.replaceChildren(...state.gebiete[zielGebiet.value].knoten.map(opt));
          zielGebiet.addEventListener('change', fuelle);
          fuelle();
          const f = el('dl');
          f.append(el('dt', { text: 'Von Knoten' }), el('dd', {}, [meinKnoten]), el('dt', { text: 'Nach Gebiet' }), el('dd', {}, [zielGebiet]), el('dt', { text: 'Nach Knoten' }), el('dd', {}, [zielKnoten]));
          const neu = el('div', { class: 'knoepfe' }, [knopf('Übergang anlegen', 'Verbindet die beiden Knoten (nach Strg+S in welt.json)', () => anlegenUebergang(e.id, meinKnoten.value, zielGebiet.value, zielKnoten.value), 'b-u-anlegen')]);
          rechts.append(f, neu);
        }
        rechts.append(el('p', { class: 'grau', text: 'Welt-Ansicht: Klick wählt, Ziehen verschiebt ein Gebiet (100 E), Doppelklick/Enter öffnet es, T geht zurück, Entf löscht einen Übergang, Strg+Z/Y/S wirken auf welt.json.' }));
        return;
      }
    } else {
      rechts.append(el('h2', { text: 'Welt' }), dl);
      zeile(dl, 'Gebiete', w.gebiete.length);
      zeile(dl, 'Übergänge', uebergaengeVon(w).length);
      const liste = el('div', { class: 'knoepfe' });
      for (const x of w.gebiete) liste.append(knopf(x.name, 'Gebiet wählen', () => weltWaehle({ art: 'gebiet', id: x.id }), 'b-wg-' + x.id));
      rechts.append(el('p', { class: 'grau', text: 'Gebiet anklicken oder hier wählen.' }), liste);
    }
    rechts.append(knoepfe);
  }
  /** Palette mit Bildern: Boden/Wand-Farben des Tilesets, Formteil, Wand, Hindernis und die Gegner (zuerst die des Tilesets). Klick wählt das Werkzeug. */
  function paletteFeld() {
    const g = gebiet();
    const farben = { boden: FLOOR, boden2: FLOOR2, wand: WALL, hindernis: FARBEN.hindernis, ...(lookFarben() || {}) };
    const feldDiv = el('div', { id: 'palette' }, [el('div', { class: 'palette-titel', text: 'Palette' })]);
    const raster = el('div', { class: 'palette-raster' });
    const kachel = (id, titel, zeichneFn, aktivIst, bei) => {
      const c = el('canvas', { width: String(PALETTE_PX * 2), height: String(PALETTE_PX * 2), title: titel, id: 'p-' + id, class: aktivIst ? 'aktiv' : '' });
      c.style.width = c.style.height = PALETTE_PX + 'px';
      const x = c.getContext('2d');
      x.scale(2, 2);
      x.fillStyle = farben.wand;
      x.fillRect(0, 0, PALETTE_PX, PALETTE_PX);
      zeichneFn(x);
      c.addEventListener('click', bei);
      raster.append(c);
    };
    const boden = (x, r = [4, 4, PALETTE_PX - 8, PALETTE_PX - 8]) => {
      x.fillStyle = farben.boden;
      x.fillRect(...r);
      x.fillStyle = farben.boden2;
      x.fillRect(r[0], r[1], r[2] / 2, r[3] / 2);
      x.fillRect(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2] / 2, r[3] / 2);
    };
    kachel('formteil', 'Formteil (B): erweitert den Boden', (x) => boden(x), state.werkzeug === 'formteil', () => setzeWerkzeug('formteil'));
    kachel('wand', 'Wand (W): schneidet den Boden aus', (x) => { boden(x, [0, 0, PALETTE_PX, PALETTE_PX]); x.fillStyle = farben.wand; x.fillRect(14, 4, 28, PALETTE_PX - 8); }, state.werkzeug === 'wand', () => setzeWerkzeug('wand'));
    kachel('hindernis', 'Hindernis (H)', (x) => { boden(x, [0, 0, PALETTE_PX, PALETTE_PX]); x.fillStyle = farben.hindernis; x.fillRect(16, 16, 24, 24); x.strokeStyle = '#000'; x.lineWidth = 1.5; x.strokeRect(16, 16, 24, 24); }, state.werkzeug === 'hindernis', () => setzeWerkzeug('hindernis'));
    const art = GEGNER.includes(state.gegnerArt) ? state.gegnerArt : null;
    for (const a of gegnerFuer(g.tileset)) {
      kachel('gegner-' + a, `Gegner „${a}“ (X) – Platzhalter`, (x) => { boden(x, [0, 0, PALETTE_PX, PALETTE_PX]); zeichneGegner(x, a, PALETTE_PX / 2, PALETTE_PX / 2, 0, 1.4); }, state.werkzeug === 'gegner' && (art ?? GEGNER[0]) === a, () => {
        state.gegnerArt = a;
        setzeWerkzeug('gegner');
      });
    }
    feldDiv.append(raster, el('p', { class: 'grau', text: 'Bild anklicken = Werkzeug wählen. Gegner sind Platzhalter (Verhalten im Fenster ungeprüft); zuerst die Gegner des Tilesets.' }));
    return feldDiv;
  }
  function eigenschaften() {
    if (state.ansichtArt === 'welt') return weltEigenschaften();
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
      for (const x of uebergaengeAn(state.welt, g.id, k.id)) {
        const dort = andereSeite(x, g.id, k.id);
        dl.append(el('dt', { text: `Übergang ${x.id}` }), el('dd', {}, [knopf(`→ ${dort.gebiet}/${dort.knoten}`, 'Zum anderen Ende springen', () => springeZuKnoten(`${dort.gebiet}/${dort.knoten}`), 'b-ue-' + x.id)]));
      }
      knoepfe.append(knopf('Übergang anlegen …', 'Welt-Ansicht öffnen und von diesem Knoten aus einen Übergang in ein anderes Gebiet anlegen', () => {
        state.entwurf = { gebiet: g.id, knoten: k.id };
        zuWelt();
      }, 'b-ue-neu'));
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
      const ts = el('select', { id: 'f-tileset', title: 'Aussehen des Gebiets (Look „Tileset“, J)' }, Object.entries(TILESETS).map(([id, t]) => el('option', { value: id, text: t.name })));
      ts.value = g.tileset;
      ts.addEventListener('change', () => {
        const wert = ts.value;
        aendere('Tileset ändern', (gg) => {
          gg.tileset = wert;
        });
      });
      dl.append(el('dt', { text: 'Tileset' }), el('dd', {}, [ts]));
      const bm = bereichMasse(g.bereich);
      zeile(dl, 'Bereich', `${fmt(bm.w, 0)} × ${fmt(bm.h, 0)} E = ${fmt(bm.w / SCREEN_W)} × ${fmt(bm.h / SCREEN_H)} Bildschirme`);
      for (const f of ['x0', 'y0', 'x1', 'y1']) feld(dl, `Bereich ${f} (E)`, 'f-b' + f, g.bereich[f], (v) => setzeBereich(f, v), 'number', { step: 100 });
      const draussen = ausserhalb(g);
      if (draussen.length) zeile(dl, 'Außerhalb', `${draussen.length} Ding${draussen.length === 1 ? '' : 'e'} außerhalb des Bereichs`);
      knoepfe.append(knopf('Bereich an Inhalt anpassen', 'Bereich so setzen, dass er alles umschließt (mit Rand)', () => bereichAnInhaltAnwenden(), 'b-bereich-anpassen'));
      zeile(dl, 'Knoten', g.knoten.length);
      zeile(dl, 'Gänge', g.gaenge.length);
      zeile(dl, 'Formteile', g.formteile.length);
      zeile(dl, 'Objekte', g.objekte.length);
      zeile(dl, 'Notizen', g.notizen.length);
    }
    rechts.append(knoepfe);
    rechts.append(paletteFeld());
    rechts.append(el('p', { class: 'grau', text: 'V Auswahl, G Gang, K Knoten, B Formteil, W Wand, H Hindernis, X Gegner, J Look, A Bereich, T Welt-Ansicht · R dreht ein Teil (Umschalt: links), Strg+C/V/D kopieren, einfügen, duplizieren · Strg+Z/Y Rückgängig/Wiederholen · Strg+S Speichern · P Spielen ab hier (Esc zurück), N Bezeichnung kopieren · Q/E drehen, 0 Norden, F wie im Spiel, Leertaste Fahrt, Mausrad zoomt.' }));
  }
  function refreshFahrt() {
    if (state.ansichtArt === 'welt') {
      schieber.disabled = play.disabled = true;
      fahrtText.textContent = 'Welt-Plan: Gebiete im Plan verschieben, Übergänge anlegen. Der Bildschirmrahmen gehört zu den Gängen (Gebiet öffnen).';
      return;
    }
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
    gesperrteIds.clear();
    for (const m of uebergangsMarken()) gesperrteIds.add(m.knoten);
    const inWelt = state.ansichtArt === 'welt';
    anzeige.textContent = `${inWelt ? 'Welt · ' : ''}${DIR_NAMES[ansicht.blick]}`;
    if (document.activeElement !== zoomFeld) zoomFeld.value = fmtZoom(ansicht.bildschirme);
    eigenschaften();
    refreshFahrt();
    const v = inWelt ? state.weltVerlauf : verlaufVon(state.gebietId);
    undoKnopf.disabled = !v.kannZurueck;
    redoKnopf.disabled = !v.kannVor;
    const au = state.auswahl;
    spielKnopf.disabled = inWelt || !(au?.art === 'gang' && state.fahrt);
    bezKnopf.disabled = inWelt || !(au?.art === 'gang' || au?.art === 'knoten');
    for (const w of WERKZEUGE) document.getElementById('t-' + w.id)?.classList.toggle('an', !inWelt && w.id === state.werkzeug);
    document.getElementById('b-welt')?.classList.toggle('an', inWelt);
    typWahl.disabled = state.werkzeug !== 'knoten';
    prueferZeigen();
    loeschKnopf.disabled = inWelt ? state.weltAuswahl?.art !== 'uebergang' : !(au && (au.art === 'gang' || au.art === 'knoten' || istTeilArt(au.art)));
    const offen = inWelt ? weltUngespeichert() : ungespeichert() || weltUngespeichert();
    stand.textContent = offen ? '● ungespeichert' : '✓ gespeichert';
    stand.className = offen ? 'offen' : 'grau';
    document.title = `${offen ? '* ' : ''}Wendehals – Editor`;
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
    const erfasst = e.button === 0 && aktiv().down?.(kontext, zeigerPunkt(e)) === true;
    zug = { modus: erfasst ? 'werkzeug' : 'plan', x: e.clientX, y: e.clientY, bewegt: false, taste: e.button };
    if (!erfasst) canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    state.zeiger = zeigerPunkt(e);
    if (!zug) return aktiv().schweben?.(kontext, state.zeiger);
    if (zug.modus === 'werkzeug') return aktiv().move?.(kontext, zeigerPunkt(e));
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
    if (e.type === 'pointercancel') return aktiv().abbruch?.(kontext);
    if (z.modus === 'werkzeug') aktiv().up?.(kontext, zeigerPunkt(e));
    else if (!z.bewegt && z.taste === 0) aktiv().klick?.(kontext, zeigerPunkt(e));
  };
  canvas.addEventListener('pointerleave', () => {
    if (zug) return;
    state.zeiger = null;
    aktiv().abbruch?.(kontext);
  });
  canvas.addEventListener('dblclick', (e) => {
    if (state.ansichtArt !== 'welt') return;
    const p = zeigerPunkt(e);
    const t = weltTreffer(kontext, p.px, p.py);
    if (t?.art === 'gebiet') zuGebiet(t.id);
  });
  canvas.addEventListener('pointerup', loslassen);
  canvas.addEventListener('pointercancel', loslassen);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        ansicht.verschieben(-e.deltaX, 0); // waagerechtes Rad / Shift+Rad: Plan seitlich schieben
        return refresh();
      }
      if (!e.deltaY) return;
      zoom(radFaktor(e.deltaY, e.deltaMode, e.ctrlKey), e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (state.spielen?.aktiv) return; // im Spielmodus gehören die Tasten dem Spiel
    const imFeld = e.target instanceof HTMLSelectElement || (e.target instanceof HTMLInputElement && e.target.type !== 'range' && !e.target.readOnly) || e.target instanceof HTMLTextAreaElement; // Schieber und das schreibgeschützte Bezeichnungsfeld nehmen keine Kürzel weg
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
    else if (e.key === '+' || hat(KUERZEL.zoomPlus, c)) zoom(ZOOM_TASTE_FAKTOR);
    else if (e.key === '-' || hat(KUERZEL.zoomMinus, c)) zoom(1 / ZOOM_TASTE_FAKTOR);
    else if (c === KUERZEL.zoomEins) setzeZoom(ZOOM_FESTWERTE.eins);
    else if (c === KUERZEL.zoomNormal) setzeZoom(ZOOM_FESTWERTE.normal);
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
    else if (c === KUERZEL.look) lookUmschalten();
    else if (c === KUERZEL.alles) alles();
    else if (hat(KUERZEL.loeschen, c)) loescheAuswahl();
    else if (Object.values(KUERZEL.werkzeug).includes(c)) setzeWerkzeug(Object.keys(KUERZEL.werkzeug).find((id) => KUERZEL.werkzeug[id] === c));
    else if (c === KUERZEL.welt) weltUmschalten();
    else if (c === 'Enter' && state.ansichtArt === 'welt') weltOeffneAuswahl();
    else if (c === 'Escape') {
      aktiv().abbruch?.(kontext);
      if (state.ansichtArt === 'welt') {
        if (state.weltAuswahl) weltWaehle(null);
        else zuGebiet();
      }
      else waehle(null);
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
    if (state.ansichtArt === 'welt') zeichneWelt(ctx, { welt: state.welt, gebiete: state.gebiete, auswahl: state.weltAuswahl, aktuell: state.gebietId, marken: state.prueferOffen ? weltPruefer().meldungen : null, beschriftung: state.beschriftung }, ansicht, canvas.width / ansicht.w);
    else zeichnePlan(ctx, gebiet(), ansicht, { auswahl: state.auswahl, fahrt: state.fahrt, zeit: state.zeit, beschriftung: state.beschriftung, look: lookFarben(), marken: state.prueferOffen ? pruefer().meldungen : null, uebergaenge: uebergangsMarken(), vorschau: (c) => werkzeug().vorschau?.(c, kontext) }, canvas.width / ansicht.w);
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
    if (Object.keys(state.gebiete).some((id) => ungespeichert(id)) || weltUngespeichert()) e.preventDefault(); // Rückfrage statt stillem Verlust
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
    pruefer,
    prueferUmschalten,
    springe,
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
    speichereWelt,
    weltUngespeichert,
    weltDateiText,
    weltPruefer,
    lagen: () => Object.fromEntries(weltLagen(state.welt, state.gebiete)),
    weltAendere,
    weltWaehle,
    weltUmschalten,
    zuWelt,
    zuGebiet,
    weltOeffneAuswahl,
    springeZuKnoten,
    setzeLage,
    setzeBereich,
    bereichAnInhaltAnwenden,
    anlegenUebergang,
    loescheUebergang,
    oeffne,
    oeffneText,
    uebernehmeAlle,
    ungespeichert,
    verlaufVon,
    melde,
    alles,
    refresh,
    beschriften,
    drehen,
    norden,
    wieImSpiel,
    zoom,
    setzeZoom,
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
