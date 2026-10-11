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
  werkzeug: { auswahl: 'KeyV', gang: 'KeyG', knoten: 'KeyK' },
  loeschen: ['Delete', 'Backspace'],
  rueckgaengig: 'KeyZ', // mit Strg/Cmd; mit Umschalt = Wiederholen
  wiederholen: 'KeyY', // mit Strg/Cmd
  speichern: 'KeyS', // mit Strg/Cmd
  oeffnen: 'KeyO', // mit Strg/Cmd
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
  massstab: '#ffffff',
};
export const KNOTEN_RADIUS_PX = 7; // Knotenmarke (Bildschirmpixel, unabhängig vom Zoom)
