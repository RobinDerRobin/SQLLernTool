// Einstieg des Level-Editors (`?editor`, Electron: WENDEHALS_EDITOR=1). Baut die Oberfläche, verbindet die Module.
// Stufe 1: Ansehen – Plan im Spielbild, Zoom/Verschieben/Drehen, Gang anklicken, Bildschirmrahmen mit Fahrt-Schieber.
import { HEADINGS, DIR_NAMES, E } from '../core/math.js';
import { Ansicht } from './ansicht.js';
import { zeichnePlan } from './zeichnen.js';
import { WELT, GEBIETE } from './startdaten.js';
import { kopie, knotenMap, gangMasse, gangPolygon, punktInPolygon, ausdehnung, rahmenEcken } from './daten.js';
import { KNOTENTYPEN } from './katalog.js';
import { KUERZEL, SCREEN_W, SPEED, ZOOM_BILDSCHIRME, PFEIL_SCHRITT_PX, KLICK_TOLERANZ_PX, KNOTEN_RADIUS_PX } from './konstanten.js';

const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
const hat = (liste, code) => (Array.isArray(liste) ? liste.includes(code) : liste === code);

const CSS = `
html, body { margin: 0; height: 100%; background: #14121a; color: #e8e6ee; font: 13px/1.4 system-ui, sans-serif; overflow: hidden; }
#editor { display: grid; grid-template-columns: 1fr 290px; grid-template-rows: 44px 1fr 78px; height: 100%; }
#editor > * { min-width: 0; min-height: 0; }
.leiste { background: #221f2b; display: flex; align-items: center; gap: 8px; padding: 0 10px; border: 0 solid #38334a; }
#oben { grid-column: 1 / 3; border-bottom-width: 1px; overflow: hidden; }
#unten { grid-column: 1 / 3; border-top-width: 1px; gap: 12px; }
#plan { position: relative; overflow: hidden; background: #1c1822; }
#plan canvas { display: block; width: 100%; height: 100%; cursor: grab; }
#rechts { background: #221f2b; border-left: 1px solid #38334a; padding: 10px 12px; overflow: auto; }
#rechts h2 { font-size: 14px; margin: 0 0 8px; }
#rechts dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; margin: 0; }
#rechts dt { color: #a49fb8; } #rechts dd { margin: 0; }
button, select { white-space: nowrap; background: #38334a; color: #e8e6ee; border: 1px solid #4b4560; border-radius: 4px; padding: 4px 9px; font: inherit; cursor: pointer; }
button:hover, select:hover { background: #4a4462; }
button.an { background: #3b6b8c; }
button:disabled { opacity: .45; cursor: default; }
.titel { font-weight: 600; margin-right: 8px; }
.grau { color: #a49fb8; }
#anzeige { margin-left: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#fahrt { flex: 1; min-width: 120px; }
#melden { color: #ff9a8a; }
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
  };
  const ansicht = new Ansicht();
  const perf = { zeichnenMs: [] };
  let dirty = true;
  const gebiet = () => state.gebiete[state.gebietId];

  // ---------------------------------------------------------------- Oberfläche
  const canvas = el('canvas');
  const plan = el('div', { id: 'plan' }, [canvas]);
  const wahl = el('select', { id: 'gebiet', title: 'Gebiet' }, WELT.gebiete.map((g) => el('option', { value: g.id, text: g.name })));
  wahl.addEventListener('change', () => wechsle(wahl.value));
  const knopf = (text, titel, fn, id) => el('button', { text, title: titel, onclick: fn, ...(id ? { id } : {}) });
  const anzeige = el('span', { class: 'grau', id: 'anzeige' });
  const oben = el('div', { id: 'oben', class: 'leiste' }, [
    el('span', { class: 'titel', text: 'Wendehals-Editor' }),
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
  const rechts = el('div', { id: 'rechts' });
  const play = knopf('Fahrt', 'Rahmen mit Flugtempo durchs Level fahren lassen (Leertaste)', () => fahrtUmschalten(), 'b-fahrt');
  const schieber = el('input', { id: 'fahrt', type: 'range', min: '0', max: '1', step: '1', value: '0', title: 'Fahrt-Schieber: Stelle im Gang' });
  schieber.addEventListener('input', () => setzeFahrt(Number(schieber.value)));
  const fahrtText = el('span', { id: 'fahrt-text' });
  const melden = el('span', { id: 'melden' });
  const unten = el('div', { id: 'unten', class: 'leiste' }, [play, schieber, fahrtText, melden]);
  const wurzel = el('div', { id: 'editor' }, [oben, plan, rechts, unten]);
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
    const g = gebiet();
    if (g.gaenge.length) waehle({ art: 'gang', id: g.gaenge[0].id });
    alles();
    refresh();
  }
  function waehle(auswahl) {
    state.auswahl = auswahl;
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
    const km = knotenMap(g);
    for (const gang of g.gaenge) {
      const p = gangPolygon(g, gang, km);
      if (p && punktInPolygon(wx, wy, p)) return { art: 'gang', id: gang.id };
    }
    return null;
  }

  // ---------------------------------------------------------------- Anzeigen
  function zeile(dl, name, wert) {
    dl.append(el('dt', { text: name }), el('dd', { text: String(wert) }));
  }
  function eigenschaften() {
    rechts.replaceChildren();
    const g = gebiet();
    const au = state.auswahl;
    const dl = el('dl');
    if (au && au.art === 'gang') {
      const gang = g.gaenge.find((x) => x.id === au.id);
      const m = gang && gangMasse(g, gang);
      rechts.append(el('h2', { text: `Gang „${gang.name || gang.id}“` }), dl);
      zeile(dl, 'ID', gang.id);
      zeile(dl, 'Von → nach', `${gang.von} → ${gang.nach}`);
      zeile(dl, 'Länge', `${fmt(m.laenge, 0)} E`);
      zeile(dl, 'Bildschirme', fmt(m.bildschirme));
      zeile(dl, 'Flugzeit', `${fmt(m.sekunden)} s`);
      zeile(dl, 'Breite', `${gang.breite} E`);
      zeile(dl, 'Richtung', m.richtung >= 0 ? `${m.richtungName} (${m.code})` : 'nicht im 45°-Raster');
    } else if (au && au.art === 'knoten') {
      const k = knotenMap(g).get(au.id);
      rechts.append(el('h2', { text: `Knoten ${k.id}` }), dl);
      zeile(dl, 'Typ', KNOTENTYPEN[k.typ]?.name || k.typ);
      zeile(dl, 'Lage', `x ${k.x}, y ${k.y}`);
      if (k.w && k.h) zeile(dl, 'Maße', `${k.w} × ${k.h} E`);
      if (k.form) zeile(dl, 'Form', `${k.form}, Seite ${k.seite} E`);
    } else {
      rechts.append(el('h2', { text: g.name }), dl);
      zeile(dl, 'Tileset', g.tileset);
      zeile(dl, 'Knoten', g.knoten.length);
      zeile(dl, 'Gänge', g.gaenge.length);
      zeile(dl, 'Formteile', g.formteile.length);
      zeile(dl, 'Objekte', g.objekte.length);
      zeile(dl, 'Notizen', g.notizen.length);
    }
    rechts.append(el('p', { class: 'grau', text: 'Klick wählt, Ziehen verschiebt, Mausrad zoomt. Q/E drehen, 0 Norden, F wie im Spiel, Leertaste Fahrt.' }));
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
    anzeige.textContent = `Blick ${DIR_NAMES[ansicht.blick]} · ${fmt(ZOOM_BILDSCHIRME[ansicht.stufe], 1)} Bildschirme`;
    eigenschaften();
    refreshFahrt();
    dirty = true;
  }

  // ---------------------------------------------------------------- Eingabe
  let zug = null; // laufende Mausbewegung auf dem Plan
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    zug = { x: e.clientX, y: e.clientY, bewegt: false };
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!zug) return;
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
    canvas.style.cursor = 'grab';
    if (!zug.bewegt && e.type === 'pointerup') {
      const r = canvas.getBoundingClientRect();
      waehle(treffer(e.clientX - r.left, e.clientY - r.top));
    }
    zug = null;
  };
  canvas.addEventListener('pointerup', loslassen);
  canvas.addEventListener('pointercancel', loslassen);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoom(e.deltaY > 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLSelectElement || e.ctrlKey || e.metaKey || e.altKey) return;
    const c = e.code;
    const schritt = PFEIL_SCHRITT_PX;
    let getan = true;
    if (c === KUERZEL.drehenLinks) drehen(-1);
    else if (c === KUERZEL.drehenRechts) drehen(1);
    else if (c === KUERZEL.norden) norden();
    else if (c === KUERZEL.wieImSpiel) wieImSpiel();
    else if (hat(KUERZEL.zoomPlus, c)) zoom(-1);
    else if (hat(KUERZEL.zoomMinus, c)) zoom(1);
    else if (c === KUERZEL.fahrtStart) fahrtUmschalten();
    else if (c === KUERZEL.fahrtVor) setzeFahrt((state.fahrt?.s || 0) + 20);
    else if (c === KUERZEL.fahrtZurueck) setzeFahrt((state.fahrt?.s || 0) - 20);
    else if (c === KUERZEL.links) ansicht.verschieben(schritt, 0);
    else if (c === KUERZEL.rechts) ansicht.verschieben(-schritt, 0);
    else if (c === KUERZEL.hoch) ansicht.verschieben(0, schritt);
    else if (c === KUERZEL.runter) ansicht.verschieben(0, -schritt);
    else if (c === KUERZEL.beschriftung) beschriften();
    else if (c === 'Escape') waehle(null);
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
    zeichnePlan(ctx, gebiet(), ansicht, { auswahl: state.auswahl, fahrt: state.fahrt, zeit: state.zeit, beschriftung: state.beschriftung }, canvas.width / ansicht.w);
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
  requestAnimationFrame(frame);

  // Für automatische Tests und für Claude (Prüfen ohne Mausklicks)
  window.__editor = {
    state,
    ansicht,
    perf,
    gebiet,
    wechsle,
    waehle,
    setzeFahrt,
    fahrtUmschalten,
    tick,
    zeichne,
    treffer,
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
