// Alle Zahlen, Kürzel und Farben des Editors an einer Stelle (Brief Abschnitt 3). Wer etwas am Editor ändern will, fängt hier an.
import { SCREEN_W, SCREEN_H } from '../core/math.js';
import { FLOOR, FLOOR2, WALL, GRID } from '../proto/fenster-draw.js';

export { SCREEN_W, SCREEN_H, FLOOR, FLOOR2, WALL, GRID };

export const FORMAT = 1; // Version des Dateiformats (levels/gebiete/*.json)
export const SPEED = 70; // Flugtempo des Prototyps in E/s (Fahrt-Schieber, Sekunden-Anzeige)
export const RASTER = 20; // Einrasten beim Ziehen (E)
export const KNOTENRASTER = 100; // Einrasten für Knoten (E)
export const DREHZONE = 160; // Drehzone vor einer Kreuzung (E), Prüfregel M3
export const MIN_QUERWEG = 60; // kleinster freier Querweg im Gang (E), Prüfregel M2
export const WINKEL_SCHRITT = 45; // Winkel nur in 45°-Schritten
export const GANG_BREITE = 200; // Breite eines neu gezogenen Gangs (E)
export const RAUM_W = 520; // Maße eines neuen Raums / Bosskampfs (E)
export const RAUM_H = 400;
export const MIN_RAUM = 100; // kleinste Raumseite (E)
export const TEIL_STANDARD = {
  // Maße eines neu gesetzten Teils (E), wenn nur geklickt statt gezogen wird
  formteil: { laenge: 260, breite: 120 },
  wand: { laenge: 240, breite: 60 },
  hindernis: { laenge: 60, breite: 60 },
};
export const MIN_TEIL = RASTER; // kleinste Länge/Breite eines Teils (E)
export const KOPIE_VERSATZ = 40; // Versatz einer Kopie, wenn keine Zielstelle bekannt ist (E)
export const MIN_GANG_LAENGE = RASTER; // kürzere Gänge entstehen beim Ziehen nicht
export const FANG_PX = 12; // Fangradius für Knoten und Gänge beim Ziehen/Setzen (Bildschirmpixel, wird mit dem Zoom in E umgerechnet)
export const MAX_KOORD = 20000; // größte erlaubte Koordinate/Maßzahl (E)
export const VERLAUF_MAX = 200; // Schritte, die Rückgängig zurückgehen kann

/** Zoomstufen als „Bildschirme in der Breite des Plans“. Normalansicht ≈ 2,2 Bildschirme (Brief Abschnitt 1). */
export const ZOOM_BILDSCHIRME = [0.5, 1, 2.2, 4, 8, 16, 32];
export const ZOOM_START = 2;

/** Tastenkürzel (KeyboardEvent.code). */
export const KUERZEL = {
  drehenLinks: 'KeyQ',
  drehenRechts: 'KeyE',
  norden: 'Digit0',
  wieImSpiel: 'KeyF',
  zoomPlus: ['Equal', 'NumpadAdd'],
  zoomMinus: ['Minus', 'NumpadSubtract'],
  beschriftung: 'KeyL',
  alles: 'Home',
  werkzeug: { auswahl: 'KeyV', gang: 'KeyG', knoten: 'KeyK', formteil: 'KeyB', wand: 'KeyW', hindernis: 'KeyH' },
  teilDrehen: 'KeyR', // ohne Umschalt 45° rechtsherum, mit Umschalt linksherum
  kopieren: 'KeyC', // mit Strg/Cmd
  einfuegen: 'KeyV', // mit Strg/Cmd
  duplizieren: 'KeyD', // mit Strg/Cmd
  loeschen: ['Delete', 'Backspace'],
  rueckgaengig: 'KeyZ', // mit Strg/Cmd; mit Umschalt = Wiederholen
  wiederholen: 'KeyY', // mit Strg/Cmd
  speichern: 'KeyS', // mit Strg/Cmd
  oeffnen: 'KeyO', // mit Strg/Cmd
  spielen: 'KeyP', // Spielen ab hier
  bezeichnung: 'KeyN', // Bezeichnung kopieren
  fahrtStart: 'Space',
  fahrtVor: 'BracketRight',
  fahrtZurueck: 'BracketLeft',
  links: 'ArrowLeft',
  rechts: 'ArrowRight',
  hoch: 'ArrowUp',
  runter: 'ArrowDown',
};
export const PFEIL_SCHRITT_PX = 60; // Verschieben mit Pfeiltasten (Bildschirmpixel)
export const KLICK_TOLERANZ_PX = 5; // Bewegung unter dieser Strecke gilt als Klick, darüber als Verschieben

/** Farben der Bedienelemente im Plan (das Spielbild selbst nutzt FLOOR/FLOOR2/WALL des Prototyps). */
export const FARBEN = {
  rahmen: '#ffd24a',
  rahmenAussen: 'rgba(0,0,0,0.38)',
  auswahl: '#4ad0ff',
  vorschau: '#8dffb0',
  vorschauFalsch: '#ff7a6a',
  knoten: { speicher: '#5be07a', kreuzung: '#e8e8f0', raum: '#c89bff', ende: '#9aa0aa', boss: '#ff6b5e' },
  notiz: '#fff28a',
  platzhalter: '#ff9a3c',
  hindernis: '#d9822b', // Platzhalterfarbe, bis die Spielgrafik der Hindernisse in Stufe 6 kommt
  massstab: '#ffffff',
  pruefMuss: '#ff3b2e', // Marken des Prüfers im Plan
  pruefSoll: '#ffc830',
};
export const KNOTEN_RADIUS_PX = 7; // Knotenmarke (Bildschirmpixel, unabhängig vom Zoom)

// Prüfer (Stufe 4): Abtastung der Regeln in regeln.js
export const PRUEF_SCHRITT = 20; // Abstand der Messstellen entlang eines Gangs (E)
export const PRUEF_QUER = 10; // Abstand der Messpunkte quer zum Gang (E)
export const PRUEF_RAND = 2; // Toleranz am Rand des Bodens (E): Ecken dürfen so weit danebenliegen (Rundung, Raster)
export const MIN_GANG_SOLL = SCREEN_W; // Regel S1: kürzere Gänge lassen die Drehzonen überlappen (E)
